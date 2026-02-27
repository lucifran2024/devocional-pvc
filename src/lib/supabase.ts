import { createClient } from '@supabase/supabase-js';
import { withRetry, CircuitBreaker } from './retry';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Logs de inicialização removidos por segurança
if (typeof window === 'undefined') {
    console.log('🔧 [SUPABASE] Cliente inicializado (server)');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Circuit breaker para chamadas Edge Function
const edgeFunctionBreaker = new CircuitBreaker(5, 60000);

// ===========================================
// TIPOS
// ===========================================

export interface PayloadDoDia {
    data: string;
    passagem_do_dia: string;
    arquetipo: string;
    voice_nome: string;
    voice_descricao: string;
}

export interface Modo {
    id: string;
    titulo: string;
    descricao: string;
    ativo: boolean;
}

export interface ExecuteResponse {
    ok: boolean;
    modo: string;
    resultado: string;
    id?: number; // Adicionado para identificar no feedback
    error?: string;
    // Tracking para anti-repetição
    tema_usado?: string;
    categoria_usada?: string;
    estilo_usado?: string;
    titulo?: string; // Para transcrição
    resumo?: string; // Para transcrição
    transcricao?: string; // Para transcrição
    fonte?: string;
    dados_estruturados?: any[];
}

export interface PalavraManhaCache {
    id: number;
    data: string;
    dia_semana: string;
    categoria: string;
    formato: string;
    mensagem: string;
    passagem_ref?: string;
}

// Interface para gerações do DNA Categorizado
export interface DnaGeracao {
    id: number;
    batch_id: string;
    texto_msg: string;
    categoria?: string;
    filtros?: Record<string, unknown>;
    tema_principal?: string;
    angulo_usado?: string;
    versiculos_usados?: string[];
    created_at: string;
    // Feedback
    feedback?: number; // 1 = like, -1 = dislike, 0 = neutro
    review_reason?: string;
}

// ===========================================
// FUNÇÕES
// ===========================================

// =================================================================

/**
 * Busca o payload do dia
 */
/**
 * Busca o payload do dia
 * AGORA UNIFICADO: Busca do Storage (SECAO6.TXT) para ser a Single Source of Truth
 */
export async function getPayloadDoDia(dataPreferida: string): Promise<{
    data: PayloadDoDia | null;
    error: string | null;
    usouDataAlternativa: boolean;
}> {
    console.log('📅 [PAYLOAD] Buscando da FONTE UNIFICADA (Storage) para:', dataPreferida);

    try {
        // 1. Tenta buscar do Storage (SSOT)
        const passagemStorage = await getPassagemFromStorage(dataPreferida);

        if (passagemStorage) {
            console.log('✅ [PAYLOAD] Encontrado no Storage!');

            // Mapeia do formato do Storage (PassagemSecao6) para o formato da UI (PayloadDoDia)
            const payloadUnificado: PayloadDoDia = {
                data: passagemStorage.data,
                passagem_do_dia: passagemStorage.referencia,
                arquetipo: passagemStorage.arquetipo_maestro,
                // Mapeia voz baseada no arquétipo ou usa padrão
                voice_nome: passagemStorage.arquetipo_maestro,
                voice_descricao: `Voz do ${passagemStorage.arquetipo_maestro} guiando a leitura de hoje.`
            };

            return { data: payloadUnificado, error: null, usouDataAlternativa: false };
        }

        console.log('⚠️ [PAYLOAD] Não encontrado no Storage para hoje. Tentando banco de dados (Legacy)...');

        // FALLBACK: Mantém a lógica antiga de buscar no banco se o Storage falhar ou não tiver o dia
        if (!supabaseUrl || !supabaseAnonKey) {
            return { data: null, error: 'Configuração do Supabase incompleta.', usouDataAlternativa: false };
        }

        const { data: payload, error } = await supabase
            .from('payload_do_dia')
            .select('data, passagem_do_dia, arquetipo, voice_nome, voice_descricao')
            .eq('data', dataPreferida)
            .maybeSingle();

        if (payload) {
            return { data: payload, error: null, usouDataAlternativa: false };
        }

        // Último recurso: pegar o mais recente do banco
        const { data: payloadRecente, error: errorRecente } = await supabase
            .from('payload_do_dia')
            .select('data, passagem_do_dia, arquetipo, voice_nome, voice_descricao')
            .order('data', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (payloadRecente) {
            return { data: payloadRecente, error: null, usouDataAlternativa: true };
        }

        return { data: null, error: 'Nenhum payload encontrado (Storage ou DB).', usouDataAlternativa: false };

    } catch (err) {
        console.error('💥 [PAYLOAD] Exceção:', err);
        return { data: null, error: err instanceof Error ? err.message : 'Erro desconhecido', usouDataAlternativa: false };
    }
}

/**
 * Busca TODOS os modos da tabela public.modos
 * FUNÇÃO INDEPENDENTE - NÃO DEPENDE DE NENHUMA OUTRA BUSCA
 */
export async function getModos(): Promise<{ data: Modo[]; error: string | null }> {
    console.log('🎯 [MODOS] Iniciando busca na tabela: modos');

    try {
        // Buscando todos os campos para evitar erros se colunas mudaram
        const { data, error, status, statusText } = await supabase
            .from('modos')
            .select('*')
            .order('id');

        console.log('🎯 [MODOS] Status:', status, statusText);

        if (error) {
            console.error('❌ [MODOS] ERRO:', error);
            return { data: [], error: `${error.message} (${error.code})` };
        }

        if (!data || data.length === 0) {
            console.warn('⚠️ [MODOS] Busca retornou 0 registros! Tabela vazia ou bloqueio de RLS.');
            return { data: [], error: null };
        }

        console.log('✅ [MODOS] SUCESSO! Encontrados:', data.length);
        console.log('✅ [MODOS] Dados:', data);

        return { data: data as Modo[], error: null };
    } catch (err) {
        console.error('💥 [MODOS] EXCEÇÃO:', err);
        const msg = err instanceof Error ? err.message : 'Erro desconhecido';
        return { data: [], error: msg };
    }
}

/**
 * Executa um modo chamando a Edge Function
 * @param pergunta - Opcional, usado para chat interativo
 */
export async function executarModo(modo_id: string, data: string, pergunta?: string): Promise<ExecuteResponse> {
    console.log('🚀 [EXECUTE] Chamando Edge Function VIA CLIENTE (invoke)');
    console.log('🚀 [EXECUTE] modo_id:', modo_id);
    console.log('🚀 [EXECUTE] data:', data);
    if (pergunta) console.log('🚀 [EXECUTE] pergunta:', pergunta.substring(0, 50) + '...');

    try {
        const { data: resultData, error } = await supabase.functions.invoke('execute', {
            body: { modo_id, data, pergunta }
        });

        if (error) {
            console.error('❌ [EXECUTE] Erro retornado pelo invoke:', error);
            // Tenta extrair mensagem de erro mais detalhada se possível
            const msg = error.context?.message || error.message || 'Erro ao invocar função';
            throw new Error(msg);
        }

        console.log('✅ [EXECUTE] Sucesso:', resultData);
        return resultData as ExecuteResponse;

    } catch (error) {
        console.error('💥 [EXECUTE] Exceção:', error);
        return {
            ok: false,
            modo: modo_id,
            resultado: '',
            error: error instanceof Error ? error.message : 'Erro de conexão ou CORS',
        };
    }
}

/**
 * Retorna a data de hoje no formato YYYY-MM-DD
 */
/**
 * Retorna a data de hoje no formato YYYY-MM-DD (Corrigido para evitar UTC)
 */
export function getDataHoje(): string {
    const hoje = new Date();
    // Ajusta para o fuso horário local (Brasil/UTC-3 ou o do usuário)
    const offset = hoje.getTimezoneOffset() * 60000;
    const dataLocal = new Date(hoje.getTime() - offset);
    return dataLocal.toISOString().split('T')[0];
}

// Interface para filtros de geração
export interface FiltrosGeracao {
    tema?: string;
    tipo?: string;
    categoria?: string;
    formato?: string;
    tamanho?: string;
    // tipo já definido abaixo com união
    url?: string; // Para transcrição

    quantidade?: number;
    dnaBase?: string;
    periodo?: string;
    diaSemana?: string;
    diasSemana?: string;
    momento?: string;
    estilosApresentacao?: string[]; // Categorias para definir o formato de apresentação
    estilo?: string; // NOVO: Estilo único forçado (modo_estilo)
    neutro?: boolean; // NOVO: Filtro para remover saudações
    usarDnaBase?: boolean;
    usarPassagemDia?: boolean;
    contextoEstrategia?: 'recent_5' | 'recent_10' | 'recent_20' | 'all' | 'mixed'; // Estratégia de contexto
    contextoManual?: string[]; // NOVO: Inspiração curada manualmente
}

// ==================== HELPERS DE INSPIRAÇÃO (MANUAL CURATION) ====================
export const fetchInspirationCandidates = async (
    source: 'dna' | 'favoritos',
    contextoEstrategia: 'recent_5' | 'recent_10' | 'recent_20' | 'all' | 'mixed',
    categoria?: string
): Promise<{ id: number; texto: string; selected: boolean }[]> => {
    let query = supabase.from('dna_categorizado').select('id, texto_msg, created_at');

    if (categoria && categoria !== 'todas') {
        query = query.eq('categoria', categoria);
    }

    // Limites baseados na estratégia
    const limitMap: Record<string, number> = {
        'recent_5': 5,
        'recent_10': 10,
        'recent_20': 20,
        'all': 200,
        'mixed': 50,
    };
    const limit = limitMap[contextoEstrategia] || 5;

    const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error || !data) {
        console.error('Erro ao buscar candidatos:', error);
        return [];
    }

    let result = data;

    // Aplicar lógica MIXED no cliente
    if (contextoEstrategia === 'mixed') {
        result = data.sort(() => 0.5 - Math.random()).slice(0, 15);
    }

    return result.map(item => ({
        id: item.id,
        texto: item.texto_msg,
        selected: true // Por padrão todos vêm selecionados
    }));
};

/**
 * Executa modo COM filtros opcionais para geração personalizada
 */
export async function executarModoComFiltros(
    modo_id: string,
    data: string,
    filtros?: FiltrosGeracao
): Promise<ExecuteResponse> {
    console.log('🚀 [EXECUTE] Chamando com filtros:', filtros);

    try {
        const { data: resultData, error } = await supabase.functions.invoke('execute', {
            body: { modo_id, data, filtros }
        });

        if (error) {
            console.error('❌ [EXECUTE] Erro:', error);
            const msg = error.context?.message || error.message || 'Erro ao invocar função';
            throw new Error(msg);
        }

        console.log('✅ [EXECUTE] Sucesso com filtros');
        return resultData as ExecuteResponse;

    } catch (error) {
        console.error('💥 [EXECUTE] Exceção:', error);
        return {
            ok: false,
            modo: modo_id,
            resultado: '',
            error: error instanceof Error ? error.message : 'Erro de conexão',
        };
    }
}

/**
 * Atualiza o status de aprovação de uma geração
 */
export async function atualizarFeedback(id: number, aprovado: boolean): Promise<boolean> {
    console.log(`👍 [FEEDBACK] Atualizando ID ${id} para aprovado=${aprovado}`);

    try {
        // 1. Atualiza status no histórico
        const { error } = await supabase
            .from('historico_geracoes')
            .update({ aprovado })
            .eq('id', id);

        if (error) {
            console.error('❌ [FEEDBACK] Erro ao atualizar:', error);
            return false;
        }

        // 2. SE APROVADO: Eternizar no DNA Categorizado (Se ainda não existir)
        if (aprovado) {
            console.log('💎 [ETERNIZAR] Tentando salvar no DNA Categorizado...');

            // Buscar texto da geração
            const { data: geracao, error: fetchError } = await supabase
                .from('historico_geracoes')
                .select('resultado_texto')
                .eq('id', id)
                .single();

            if (geracao && geracao.resultado_texto) {
                // Verificar se já existe (evitar duplicatas exatas)
                const { data: existente } = await supabase
                    .from('dna_categorizado')
                    .select('id')
                    .eq('texto_msg', geracao.resultado_texto)
                    .maybeSingle();

                if (!existente) {
                    await addDnaCategorizado(geracao.resultado_texto, 'devocional', ['gerado_via_app']);
                    console.log('💎 [ETERNIZAR] Salvo com sucesso no DNA!');
                } else {
                    console.log('⚠️ [ETERNIZAR] Já existe no DNA, ignorando duplicata.');
                }
            }
        }

        console.log('✅ [FEEDBACK] Sucesso!');
        return true;
    } catch (err) {
        console.error('💥 [FEEDBACK] Exceção:', err);
        return false;
    }
}

/**
 * Busca o histórico de gerações
 */
export async function getHistorico(showOnlyFavorites: boolean = false) {
    console.log(`📜 [HISTORICO] Buscando gerações (Apenas Favoritos: ${showOnlyFavorites})...`);

    try {
        let query = supabase
            .from('historico_geracoes')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (showOnlyFavorites) {
            query = query.eq('aprovado', true);
        }

        const { data, error } = await query;

        if (error) {
            console.error('❌ [HISTORICO] Erro:', error);
            return [];
        }

        return data;
    } catch (err) {
        console.error('💥 [HISTORICO] Exceção:', err);
        return [];
    }
}

// ===========================================
// FUNÇÕES PARA DNA_GERACOES (Nova Tabela)
// ===========================================

/**
 * Busca gerações do DNA Categorizado dos últimos N dias
 */
export async function getDnaGeracoes(limitDays: number = 3): Promise<DnaGeracao[]> {
    console.log(`🧬 [DNA_GERACOES] Buscando gerações dos últimos ${limitDays} dias...`);

    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - limitDays);

        const { data, error } = await supabase
            .from('dna_geracoes')
            .select('*')
            .gte('created_at', cutoffDate.toISOString())
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ [DNA_GERACOES] Erro ao buscar:', error);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error('💥 [DNA_GERACOES] Exceção:', err);
        return [];
    }
}

/**
 * Deleta uma geração individual do DNA
 */
export async function deleteDnaGeracao(id: number): Promise<boolean> {
    console.log(`🗑️ [DNA_GERACOES] Deletando item ID ${id}`);

    try {
        const { error } = await supabase
            .from('dna_geracoes')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('❌ [DNA_GERACOES] Erro ao deletar:', error);
            return false;
        }

        return true;
    } catch (err) {
        console.error('💥 [DNA_GERACOES] Exceção:', err);
        return false;
    }
}


/**
 * Salva o feedback (like/dislike) de uma geração DNA
 */
export async function saveFeedbackDna(id: number, feedback: number, reason?: string): Promise<boolean> {
    console.log(`👍 [FEEDBACK_DNA] ID ${id} -> Score: ${feedback}`);
    try {
        const { error } = await supabase
            .from('dna_geracoes')
            .update({ feedback, review_reason: reason })
            .eq('id', id);

        if (error) {
            console.error('❌ [FEEDBACK_DNA] Erro:', error);
            return false;
        }
        return true;
    } catch (e) {
        console.error('💥 [FEEDBACK_DNA] Exceção:', e);
        return false;
    }
}

/**
 * Deleta um lote inteiro de gerações pelo batch_id
 */
export async function deleteDnaGeracaoBatch(batchId: string): Promise<boolean> {
    console.log(`🗑️ [DNA_GERACOES] Deletando lote: ${batchId}`);

    try {
        const { error } = await supabase
            .from('dna_geracoes')
            .delete()
            .eq('batch_id', batchId);

        if (error) {
            console.error('❌ [DNA_GERACOES] Erro ao deletar lote:', error);
            return false;
        }

        return true;
    } catch (err) {
        console.error('💥 [DNA_GERACOES] Exceção:', err);
        return false;
    }
}

/**
 * Extrai referências bíblicas de um texto
 */
function extrairVersiculos(texto: string): string[] {
    // Regex para encontrar referências bíblicas (ex: João 3:16, Salmos 23:1-4, 1 Coríntios 13:4)
    const regex = /(?:\d\s)?[A-ZÀ-Ú][a-zà-ú]+\s+\d+[:\s]*\d+(?:\s*[-–]\s*\d+)?/g;
    const matches = texto.match(regex) || [];
    return [...new Set(matches.map(m => m.trim()))]; // Remove duplicatas
}

/**
 * Extrai tema/título principal de uma mensagem
 */
function extrairTema(texto: string): string | null {
    const SAUDACOES = /^(bom dia|boa tarde|boa noite|boa madrugada|paz nesta|paz na)/i;
    const linhas = texto.split('\n')
        .map(l => l.replace(/\*+/g, '').replace(/[📖🌟✨💫🙏❤️💪🔥⭐️🌅🌙🚨⚡]/g, '').trim())
        .filter(l => l.length > 3);

    // Pular saudações para encontrar o tema real
    let linhasTema = linhas;
    if (linhasTema.length > 1 && SAUDACOES.test(linhasTema[0])) {
        linhasTema = linhasTema.slice(1);
    }
    // Pular separadores e linhas muito curtas
    const linhaTema = linhasTema.find(l => {
        const limpa = l.replace(/MENSAGEM\s*\d+\s*[-—]/gi, '').replace(/[-—=]+/g, '').trim();
        return limpa.length > 5 && !/^---+$/.test(limpa);
    });
    if (!linhaTema) return null;
    const limpo = linhaTema.replace(/MENSAGEM\s*\d+\s*[-—]/gi, '').trim();
    return limpo.length > 3 ? limpo.substring(0, 100) : null;
}

/**
 * Extrai o título limpo da mensagem (primeira linha formatada)
 */
function extrairTitulo(texto: string): string | null {
    const linhas = texto.split('\n').filter(l => l.trim());
    const primeiraLinha = linhas[0] || '';
    const limpo = primeiraLinha
        .replace(/\*+/g, '')
        .replace(/MENSAGEM\s*\d+\s*[-—]/gi, '')
        .trim();
    return limpo.length > 3 ? limpo.substring(0, 200) : null;
}

/**
 * Detecta o tipo de abertura da mensagem
 * Tipos: cena, afirmacao, biblica, imperativo, pergunta, narrativa
 */
function detectarAbertura(texto: string): string {
    const SAUDACOES = /^(bom dia|boa tarde|boa noite|boa madrugada|paz nesta|paz na)/i;
    const linhas = texto.split('\n').filter(l => l.trim());
    // Pula título (primeira linha), saudações, e linhas curtas para encontrar o corpo real
    let corpoLinhas = linhas.slice(1).map(l => l.replace(/\*+/g, '').trim()).filter(l => l.length > 10);
    // Pular saudação se for a primeira linha do corpo
    if (corpoLinhas.length > 1 && SAUDACOES.test(corpoLinhas[0])) {
        corpoLinhas = corpoLinhas.slice(1);
    }
    const corpoLimpo = corpoLinhas[0] || '';

    if (!corpoLimpo) return 'outro';

    // Pergunta
    if (corpoLimpo.includes('?')) return 'pergunta';
    // Imperativo (começa com verbo no imperativo — lista expandida)
    if (/^(Pare|Olhe|Pense|Imagine|Lembre|Abra|Feche|Levante|Creia|Confie|Descanse|Entregue|Solte|Vá|Ouça|Decida|Ande|Declare|Profetize|Receba|Desperte|Celebre|Guarde|Cuide|Treine|Desvie)/i.test(corpoLimpo)) return 'imperativo';
    // Cena (começa descrevendo situação — lista expandida)
    if (/^(Quando|Era |Naquele|Havia|No meio|Na hora|Às vezes|Tem dias|Sabe aquele|Naquele momento|O dia|A noite|Nesta|Neste|Ontem|Hoje )/i.test(corpoLimpo)) return 'cena';
    // Bíblica (começa com citação ou referência bíblica)
    if (/^[""“”>]|^(?:\d\s)?[A-ZÀ-Ú][a-zà-ú]+\s+\d+|^(A Bíblia|A Palavra|Está escrito|Diz o Senhor|Jesus disse|Paulo disse)/i.test(corpoLimpo)) return 'biblica';
    // Narrativa real (conta história com sujeito + ação)
    if (/^(Ele |Ela |Eles |Um homem|Uma mulher|Certo |Aquele |Pedro |Moisés |Davi |José |Abraão )/i.test(corpoLimpo)) return 'narrativa';
    // Afirmação — padrão ampliado (frases declarativas)
    if (/^(A |O |Deus |Jesus |Fé |Graça |Amor |Sua |Seu |Não |Nenhum|Todo |Cada |Quem |Somente |Ninguém)/i.test(corpoLimpo)) return 'afirmacao';

    // Default: afirmacao (maioria dos textos devocionais são afirmações, não narrativas)
    return 'afirmacao';
}

/**
 * Detecta o tipo de fechamento da mensagem
 * Tipos: oracao, imperativo, declaracao, presenca, punchline, promessa
 */
function detectarFechamento(texto: string): string {
    const linhas = texto.split('\n').filter(l => l.trim());
    const ultimaLinha = linhas[linhas.length - 1]?.replace(/\*+/g, '').trim() || '';

    if (!ultimaLinha) return 'outro';

    // Oração (fala com Deus)
    if (/^(Senhor|Pai|Deus,|Em nome|Amém)/i.test(ultimaLinha) || ultimaLinha.toLowerCase().includes('amém')) return 'oracao';
    // Imperativo (ordem/chamado)
    if (/^(Creia|Confie|Descanse|Levante|Ande|Siga|Pare|Avance|Entregue|Abrace)/i.test(ultimaLinha)) return 'imperativo';
    // Declaração de fé (1ª pessoa)
    if (/^(Eu creio|Eu declaro|Eu confio|Nós cremos|Nós declaramos)/i.test(ultimaLinha)) return 'declaracao';
    // Presença de Deus (Deus + verbo)
    if (/^(Deus |Ele |O Senhor |Jesus |Cristo )\w+/i.test(ultimaLinha)) return 'presenca';
    // Promessa
    if (/^(Porque |Pois |A promessa|Está escrito)/i.test(ultimaLinha)) return 'promessa';

    return 'punchline';
}

/**
 * Extrai a última frase significativa (punchline)
 */
function extrairPunchline(texto: string): string | null {
    const linhas = texto.split('\n').filter(l => {
        const limpa = l.replace(/\*+/g, '').replace(/[-—]+/g, '').trim();
        return limpa.length > 5;
    });
    if (linhas.length === 0) return null;
    const ultima = linhas[linhas.length - 1].replace(/\*+/g, '').trim();
    // Extrair apenas a última FRASE significativa (split por pontuação final)
    const frases = ultima.split(/(?<=[.!?])\s+/).filter(f => f.trim().length > 3);
    const ultimaFrase = frases.length > 0 ? frases[frases.length - 1].trim() : ultima;
    return ultimaFrase.substring(0, 100);
}

/**
 * Detecta a imagem/metáfora central da mensagem
 */
function detectarImagemCentral(texto: string): string | null {
    const textoLower = texto.toLowerCase();

    const IMAGENS_CONHECIDAS: [string, string[]][] = [
        ['mesa', ['mesa', 'banquete', 'pão', 'alimenta', 'ceiar']],
        ['silêncio', ['silêncio', 'silencio', 'quieto', 'calado', 'espera silenciosa']],
        ['deserto', ['deserto', 'seco', 'aridez', 'árido']],
        ['construção', ['construção', 'construir', 'alicerce', 'fundamento', 'obra', 'edifica']],
        ['quarto escuro', ['escuro', 'escuridão', 'trevas', 'noite escura', 'madrugada']],
        ['tempestade', ['tempestade', 'temporal', 'ventania', 'ondas', 'mar revolto']],
        ['jardim', ['jardim', 'plantio', 'semente', 'florescer', 'brotar', 'colheita']],
        ['fogo', ['fogo', 'fornalha', 'brasa', 'chama', 'queima', 'refinar']],
        ['caminho', ['caminho', 'trilha', 'estrada', 'jornada', 'passo', 'pegadas']],
        ['rio', ['rio', 'água', 'fonte', 'nascente', 'correnteza', 'sede']],
        ['montanha', ['montanha', 'monte', 'topo', 'vale', 'subida', 'cume']],
        ['porta', ['porta', 'abrir', 'fechar', 'chave', 'entrada', 'saída']],
        ['batalha', ['batalha', 'guerra', 'luta', 'arma', 'escudo', 'espada']],
        ['pastor', ['pastor', 'ovelha', 'rebanho', 'aprisco', 'cajado']],
        ['refúgio', ['refúgio', 'abrigo', 'esconderijo', 'fortaleza', 'rocha']],
        ['cura', ['cura', 'ferida', 'cicatriz', 'restaura', 'sarar']],
        ['coroa', ['coroa', 'trono', 'reinado', 'reino', 'cetro']],
        ['âncora', ['âncora', 'ancora', 'firme', 'porto', 'seguro']],
    ];

    let melhorMatch: string | null = null;
    let maxHits = 0;

    for (const [imagem, keywords] of IMAGENS_CONHECIDAS) {
        const hits = keywords.filter(k => textoLower.includes(k)).length;
        if (hits > maxHits) {
            maxHits = hits;
            melhorMatch = imagem;
        }
    }

    return maxHits >= 1 ? melhorMatch : null;
}

/**
 * Salva um lote de gerações do DNA Categorizado
 * Extrai automaticamente versículos e temas de cada mensagem
 * @returns O batch_id gerado ou null em caso de erro
 */
export async function saveDnaGeracoes(
    mensagens: string[],
    categoria?: string,
    filtros?: Record<string, unknown>,
    temaPrincipal?: string,
    anguloUsado?: string,
    buildStyle?: string
): Promise<string | null> {
    const batchId = crypto.randomUUID();
    console.log(`💾 [DNA_GERACOES] Salvando ${mensagens.length} mensagens com batch_id: ${batchId}`);

    try {
        const records = mensagens.map(texto => {
            const textoLimpo = texto.trim();
            // Extrai versículos automaticamente de cada mensagem
            const versiculosExtraidos = extrairVersiculos(textoLimpo);
            // Extrai tema do título se não foi fornecido
            const temaExtraido = temaPrincipal || extrairTema(textoLimpo);
            // Novos campos anti-repetição profunda
            const tituloExtraido = extrairTitulo(textoLimpo);
            const imagemCentral = detectarImagemCentral(textoLimpo);
            const aberturaTipo = detectarAbertura(textoLimpo);
            const fechamentoTipo = detectarFechamento(textoLimpo);
            const punchline = extrairPunchline(textoLimpo);

            return {
                batch_id: batchId,
                texto_msg: textoLimpo,
                categoria: categoria || null,
                filtros: filtros || null,
                tema_principal: temaExtraido,
                angulo_usado: anguloUsado || null,
                versiculos_usados: versiculosExtraidos.length > 0 ? versiculosExtraidos : null,
                titulo: tituloExtraido,
                imagem_central: imagemCentral,
                abertura_tipo: aberturaTipo,
                fechamento_tipo: fechamentoTipo,
                punchline: punchline,
                build_style: buildStyle || 'favoritas'
            };
        });

        const { error } = await supabase
            .from('dna_geracoes')
            .insert(records);

        if (error) {
            console.error('❌ [DNA_GERACOES] Erro ao salvar:', error);
            return null;
        }

        // Log de debug
        const totalVersiculos = records.reduce((acc, r) => acc + (r.versiculos_usados?.length || 0), 0);
        console.log(`✅ [DNA_GERACOES] Lote salvo! Versículos extraídos: ${totalVersiculos}`);
        return batchId;
    } catch (err) {
        console.error('💥 [DNA_GERACOES] Exceção:', err);
        return null;
    }
}


/**
 * Alterna o like (aprovado) de um item
 */
export async function toggleLike(id: number, currentStatus: boolean | null): Promise<boolean> {
    const novoStatus = !currentStatus;
    console.log(`❤️ [LIKE] Alterando ID ${id} para ${novoStatus}`);

    // Reutiliza a função existente atualizarFeedback para manter consistência
    return await atualizarFeedback(id, novoStatus);
}

/**
 * Deleta um item do histórico de gerações
 */
export async function deleteHistoricoItem(id: number): Promise<boolean> {
    console.log(`🗑️ [DELETE] Deletando item ID ${id}`);

    try {
        // Primeiro, verifica se o item existe
        const { data: existingItem, error: checkError } = await supabase
            .from('historico_geracoes')
            .select('id')
            .eq('id', id)
            .maybeSingle();

        if (checkError) {
            console.error('❌ [DELETE] Erro ao verificar item:', checkError);
            return false;
        }

        if (!existingItem) {
            console.warn('⚠️ [DELETE] Item não encontrado (já deletado?):', id);
            return true; // Considera sucesso se já não existe
        }

        // Executa o delete
        const { error, count } = await supabase
            .from('historico_geracoes')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('❌ [DELETE] Erro ao deletar:', error);
            return false;
        }

        // Verifica se realmente deletou (para garantir que RLS não bloqueou silenciosamente)
        const { data: stillExists, error: verifyError } = await supabase
            .from('historico_geracoes')
            .select('id')
            .eq('id', id)
            .maybeSingle();

        if (verifyError) {
            console.error('❌ [DELETE] Erro ao verificar exclusão:', verifyError);
            return false;
        }

        if (stillExists) {
            console.error('❌ [DELETE] Item ainda existe! Possível bloqueio de RLS:', id);
            return false;
        }

        console.log('✅ [DELETE] Sucesso! Item removido permanentemente.');
        return true;
    } catch (err) {
        console.error('💥 [DELETE] Exceção:', err);
        return false;
    }
}

import { PassagemSecao6 } from './secao6';

/**
 * Busca a passagem do dia diretamente do arquivo SECAO6.TXT no Storage
 */
export async function getPassagemFromStorage(dataPreferida: string): Promise<PassagemSecao6 | null> {
    console.log(`📦 [STORAGE] Buscando SECAO6.TXT para data: ${dataPreferida}`);

    try {
        // 1. Download do arquivo
        const { data, error } = await supabase.storage
            .from('pvc')
            .download('secao6/SECAO6.TXT');

        if (error) {
            console.error('❌ [STORAGE] Erro ao baixar arquivo:', error);
            return null;
        }

        // 2. Extrair texto
        const text = await data.text();

        // 3. Encontrar o início do JSON
        const jsonMarker = '### JSON_BEGIN';
        const jsonStartIndex = text.indexOf(jsonMarker);

        if (jsonStartIndex === -1) {
            console.error('❌ [STORAGE] Marcador JSON não encontrado no arquivo.');
            return null;
        }

        // 4. Parsear JSON (Com tratamento de erro robusto)
        let jsonString = text.substring(jsonStartIndex + jsonMarker.length).trim();

        // Remove footer se existir
        const jsonEndMarker = '### JSON_END';
        const jsonEndIndex = jsonString.indexOf(jsonEndMarker);
        if (jsonEndIndex !== -1) {
            jsonString = jsonString.substring(0, jsonEndIndex).trim();
        }

        // HOTFIX: Corrigir chaves sem aspas (comum neste arquivo)
        const keysToFix = [
            'data', 'referencia', 'arquetipo_maestro', 'lexico_do_dia',
            'estrutura_dinamica', 'insights_pre_minerados',
            'tese', 'familia', 'verso_suporte', 'voz_performance'
        ];
        keysToFix.forEach(key => {
            // Caso 1: chave sem aspas NO MEIO de linha (ex: `  { tese": `)
            // Procura por: não-aspa + chave + aspa + dois-pontos
            const regexMid = new RegExp(`([^"\\w])(${key})":`, 'g');
            jsonString = jsonString.replace(regexMid, '$1"$2":');

            // Caso 2: chave sem aspas NO INÍCIO de linha (ex: `\ntese": ` ou apenas `tese": `)
            const regexStart = new RegExp(`(^|\\r?\\n)(${key})":`, 'gm');
            jsonString = jsonString.replace(regexStart, '$1"$2":');
        });

        let passagens: PassagemSecao6[] = [];

        try {
            passagens = JSON.parse(jsonString);
        } catch (parseError) {
            console.warn('⚠️ [STORAGE] Erro de JSON completo. Tentando extrair passagem específica...', parseError);

            // FALLBACK ROBUSTO: Extrair apenas a passagem do dia específica
            // O arquivo tem problemas estruturais (objetos não fechados entre passagens)
            // Então vamos procurar pelo padrão da data e extrair os campos manualmente

            const dataPattern = `"data": "${dataPreferida}"`;
            const dataIndex = jsonString.indexOf(dataPattern);

            if (dataIndex === -1) {
                console.error('❌ [STORAGE] Data não encontrada:', dataPreferida);
                return null;
            }

            console.log('📍 [STORAGE] Data encontrada na posição:', dataIndex);

            // Encontrar o início do objeto (o { anterior)
            let objStart = dataIndex;
            for (let i = dataIndex; i >= 0; i--) {
                if (jsonString[i] === '{') {
                    objStart = i;
                    break;
                }
            }

            // Extrair campos um por um usando regex
            const extractField = (fieldName: string, startPos: number): string | null => {
                const pattern = new RegExp(`"${fieldName}":\\s*"([^"]+)"`, 'g');
                pattern.lastIndex = startPos;
                const match = pattern.exec(jsonString);
                return match ? match[1] : null;
            };

            const extractArray = (fieldName: string, startPos: number): string[] => {
                const pattern = new RegExp(`"${fieldName}":\\s*\\[([^\\]]+)\\]`, 'g');
                pattern.lastIndex = startPos;
                const match = pattern.exec(jsonString);
                if (!match) return [];
                // Parse array items
                const items = match[1].match(/"([^"]+)"/g);
                return items ? items.map(s => s.replace(/"/g, '')) : [];
            };

            // Encontrar onde a próxima passagem começa (para limitar a busca)
            const nextDataPattern = /"data":\s*"\d{4}-\d{2}-\d{2}"/g;
            nextDataPattern.lastIndex = dataIndex + dataPattern.length;
            const nextMatch = nextDataPattern.exec(jsonString);
            const searchEnd = nextMatch ? nextMatch.index : jsonString.length;

            // Extrair campos
            const referencia = extractField('referencia', objStart);
            const arquetipo = extractField('arquetipo_maestro', objStart);
            const lexico = extractArray('lexico_do_dia', objStart);

            // Extrair insights (mais complexo)
            const insightsStart = jsonString.indexOf('"insights_pre_minerados"', objStart);
            const insights: any[] = [];

            if (insightsStart !== -1 && insightsStart < searchEnd) {
                // Procurar por cada insight dentro deste bloco
                const insightPattern = /"tese":\s*"([^"]+)"/g;
                insightPattern.lastIndex = insightsStart;
                let insightMatch;

                while ((insightMatch = insightPattern.exec(jsonString)) !== null) {
                    if (insightMatch.index > searchEnd) break;

                    const tese = insightMatch[1];
                    const familia = extractField('familia', insightMatch.index) || 'Teologia';
                    const verso = extractField('verso_suporte', insightMatch.index) || '';
                    const voz = extractField('voz_performance', insightMatch.index) || 'Profeta';

                    insights.push({ tese, familia, verso_suporte: verso, voz_performance: voz });
                }
            }

            if (referencia) {
                console.log('✅ [STORAGE] Passagem extraída via fallback:', referencia);
                return {
                    data: dataPreferida,
                    referencia,
                    arquetipo_maestro: arquetipo || 'Profeta',
                    lexico_do_dia: lexico,
                    insights_pre_minerados: insights.length > 0 ? insights : [{
                        tese: 'Estudo bíblico guiado.',
                        familia: 'Teologia',
                        verso_suporte: referencia,
                        voz_performance: 'Profeta'
                    }]
                };
            }

            console.error('❌ [STORAGE] Falha ao extrair passagem via fallback.');
            return null;
        }

        // 5. Encontrar a data
        const passagemDia = passagens.find(p => p.data === dataPreferida);

        if (passagemDia) {
            console.log('✅ [STORAGE] Passagem encontrada:', passagemDia.referencia);
            return passagemDia;
        } else {
            console.warn('⚠️ [STORAGE] Nenhuma passagem encontrada para hoje no arquivo.');
            return null;
        }

    } catch (err) {
        console.error('💥 [STORAGE] Erro crítico ao processar plano de leitura:', err);
        return null;
    }
}

/**
 * Busca a passagem do dia do BANCO DE DADOS (Tabela leitura_do_dia)
 * Fallback robusto quando o Storage falha
 */
export async function getPassagemFromDB(dataPreferida: string): Promise<PassagemSecao6 | null> {
    console.log(`🗄️ [DB] Buscando na tabela leitura_do_dia para data: ${dataPreferida}`);

    try {
        const { data, error } = await supabase
            .from('leitura_do_dia')
            .select('*')
            .eq('data', dataPreferida)
            .maybeSingle();

        if (error) {
            console.error('❌ [DB] Erro ao buscar no banco:', error);
            return null;
        }

        if (!data) {
            console.warn('⚠️ [DB] Nenhuma passagem encontrada no banco.');
            return null;
        }

        console.log('✅ [DB] Sucesso! Passagem encontrada:', data.passagem_do_dia);

        // Mapear do formato DB para PassagemSecao6
        return {
            data: data.data,
            referencia: data.passagem_do_dia,
            arquetipo_maestro: data.arquetipo || 'Profeta',
            lexico_do_dia: data.lexico_do_dia || [],
            estrutura_dinamica: [], // Geralmente não persiste no banco salvo se tiver coluna
            insights_pre_minerados: data.insights_pre_minerados || []
        };

    } catch (err) {
        console.error('💥 [DB] Exceção ao buscar no banco:', err);
        return null;
    }
}

/**
 * Busca a passagem do dia de forma UNIFICADA e ROBUSTA
 * Ordem: Storage -> DB -> Local (Fallback)
 */
import { getPassagemDoDia } from './secao6';

export async function getPassagemUnificada(dataPreferida: string): Promise<PassagemSecao6 | null> {
    // 1. Storage (SSOT)
    const fromStorage = await getPassagemFromStorage(dataPreferida);
    if (fromStorage) return fromStorage;

    // 2. Banco de Dados (Fallback robusto)
    const fromDB = await getPassagemFromDB(dataPreferida);
    if (fromDB) return fromDB;

    // 3. Local (Último recurso, dados offline)
    console.log('⚠️ [UNIFICADO] Fallback para dados locais');
    return getPassagemDoDia(dataPreferida);
}

// ===========================================
// FAVORITOS DE MENSAGENS INDIVIDUAIS
// ===========================================

// CONSOLIDADO: FavoritoMensagem agora é alias de DnaCategorizado
// Mantido para compatibilidade com imports existentes
export type FavoritoMensagem = DnaCategorizado;

/**
 * Adiciona uma mensagem individual aos favoritos (agora em dna_categorizado)
 */
export async function addFavoritoMensagem(
    historicoId: number,
    indiceMensagem: number,
    textoMensagem: string,
    categoria: CategoriaDna = 'outro'
): Promise<DnaCategorizado | null> {
    console.log(`⭐ [FAVORITO] Adicionando mensagem ${indiceMensagem} do histórico ${historicoId} (${categoria})`);

    try {
        const { data, error } = await supabase
            .from('dna_categorizado')
            .insert({
                historico_id: historicoId,
                indice_msg: indiceMensagem,
                texto_msg: textoMensagem,
                categoria,
                tags: ['favorito_gerador']
            })
            .select()
            .single();

        if (error) {
            console.error('❌ [FAVORITO] Erro ao adicionar:', error);
            return null;
        }

        console.log('✅ [FAVORITO] Adicionado com sucesso:', data.id);
        return data as DnaCategorizado;
    } catch (err) {
        console.error('💥 [FAVORITO] Exceção:', err);
        return null;
    }
}

/**
 * Remove uma mensagem individual dos favoritos (agora de dna_categorizado)
 */
export async function removeFavoritoMensagem(
    historicoId: number,
    indiceMensagem: number
): Promise<boolean> {
    console.log(`💔 [FAVORITO] Removendo mensagem ${indiceMensagem} do histórico ${historicoId}`);

    try {
        const { error } = await supabase
            .from('dna_categorizado')
            .delete()
            .eq('historico_id', historicoId)
            .eq('indice_msg', indiceMensagem);

        if (error) {
            console.error('❌ [FAVORITO] Erro ao remover:', error);
            return false;
        }

        console.log('✅ [FAVORITO] Removido com sucesso');
        return true;
    } catch (err) {
        console.error('💥 [FAVORITO] Exceção:', err);
        return false;
    }
}

/**
 * Busca todos os favoritos de um histórico específico (agora de dna_categorizado)
 */
export async function getFavoritosByHistorico(historicoId: number): Promise<number[]> {
    try {
        const { data, error } = await supabase
            .from('dna_categorizado')
            .select('indice_msg')
            .eq('historico_id', historicoId);

        if (error) {
            console.error('❌ [FAVORITO] Erro ao buscar:', error);
            return [];
        }

        return data?.map(f => f.indice_msg) || [];
    } catch (err) {
        console.error('💥 [FAVORITO] Exceção:', err);
        return [];
    }
}

/**
 * Busca todos os favoritos individuais (agora delega para dna_categorizado)
 */
export async function getAllFavoritosMensagens(limit: number = 10): Promise<DnaCategorizado[]> {
    console.log(`📜 [FAVORITOS] Buscando últimos ${limit} favoritos individuais...`);
    return getDnaCategorizado(undefined, limit);
}

/**
 * Busca TODAS as mensagens do Banco de Ouro (agora = tudo de dna_categorizado)
 * Consolidado: não filtra mais por historico_id IS NULL
 */
export async function getFavoritosManuais(limit: number = 100): Promise<DnaCategorizado[]> {
    console.log(`🏆 [BANCO DE OURO] Buscando todas as mensagens (limit: ${limit})...`);
    return getDnaCategorizado(undefined, limit);
}

/**
 * Adiciona uma mensagem MANUAL aos favoritos (agora em dna_categorizado)
 * Para quando o usuário quer adicionar texto externo
 */
export async function addFavoritoManual(
    textoMensagem: string,
    categoria: CategoriaDna = 'outro'
): Promise<DnaCategorizado | null> {
    console.log(`📝 [FAVORITO MANUAL] Adicionando mensagem de ${textoMensagem.length} caracteres (${categoria})`);
    return addDnaCategorizado(textoMensagem, categoria, []);
}

/**
 * Remove um favorito pelo ID primário (agora delega para removeDnaById)
 */
export async function removeFavoritoById(id: number): Promise<boolean> {
    return removeDnaById(id);
}

// ===========================================
// DNA CATEGORIZADO - Novo Sistema de Categorização
// ===========================================

export type CategoriaDna = 'devocional' | 'oracao' | 'versiculo' | 'reflexao' | 'exortacao' | 'declaracao' | 'outro';

export interface DnaCategorizado {
    id: number;
    texto_msg: string;
    categoria: CategoriaDna;
    tags: string[];
    historico_id?: number | null;
    indice_msg?: number;
    created_at: string;
}

export interface CategoriaStats {
    categoria: CategoriaDna;
    total: number;
}

/**
 * Busca DNA categorizado com filtros opcionais
 */
export async function getDnaCategorizado(
    categoria?: CategoriaDna,
    limit: number = 1000
): Promise<DnaCategorizado[]> {
    console.log(`🧬 [DNA] Buscando (categoria: ${categoria || 'todas'}, limit: ${limit})...`);

    try {
        let query = supabase
            .from('dna_categorizado')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        // Filtra por categoria específica (incluindo 'outro')
        if (categoria) {
            query = query.eq('categoria', categoria);
        }

        const { data, error } = await query;

        if (error) {
            console.error('❌ [DNA] Erro ao buscar:', error);
            return [];
        }

        console.log(`✅ [DNA] Encontrados: ${data?.length || 0}`);
        return data as DnaCategorizado[];
    } catch (err) {
        console.error('💥 [DNA] Exceção:', err);
        return [];
    }
}

/**
 * Adiciona nova mensagem ao DNA Categorizado (tabela unificada)
 */
export async function addDnaCategorizado(
    textoMensagem: string,
    categoria: CategoriaDna,
    tags: string[] = [],
    historicoId?: number | null,
    indiceMensagem?: number
): Promise<DnaCategorizado | null> {
    console.log(`🧬 [DNA] Adicionando mensagem (${categoria}): ${textoMensagem.substring(0, 50)}...`);

    try {
        const insertData: Record<string, unknown> = {
            texto_msg: textoMensagem,
            categoria,
            tags
        };
        if (historicoId !== undefined) insertData.historico_id = historicoId;
        if (indiceMensagem !== undefined) insertData.indice_msg = indiceMensagem;

        const { data, error } = await supabase
            .from('dna_categorizado')
            .insert(insertData)
            .select()
            .single();

        if (error) {
            console.error('❌ [DNA] Erro ao adicionar:', error);
            return null;
        }

        console.log('✅ [DNA] Adicionado com sucesso:', data.id);
        return data as DnaCategorizado;
    } catch (err) {
        console.error('💥 [DNA] Exceção:', err);
        return null;
    }
}

/**
 * FUNÇÃO UNIFICADA: Agora insere apenas em dna_categorizado (tabela única)
 */
export async function addFavoritoUnificado(
    textoMensagem: string,
    categoria: CategoriaDna = 'outro',
    tags: string[] = []
): Promise<{ dna: DnaCategorizado | null }> {
    console.log(`🔗 [UNIFICADO] Adicionando em dna_categorizado (${categoria})`);

    const dna = await addDnaCategorizado(textoMensagem, categoria, tags);

    console.log(`✅ [UNIFICADO] DNA: ${dna?.id || 'erro'}`);
    return { dna };
}

/**
 * Remove um DNA pelo ID
 */
export async function removeDnaById(id: number): Promise<boolean> {
    console.log(`🗑️ [DNA] Removendo ID ${id}`);

    try {
        const { error } = await supabase
            .from('dna_categorizado')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('❌ [DNA] Erro ao remover:', error);
            return false;
        }

        console.log('✅ [DNA] Removido com sucesso');
        return true;
    } catch (err) {
        console.error('💥 [DNA] Exceção:', err);
        return false;
    }
}

/**
 * Atualiza texto e/ou categoria de um DNA
 */
export async function updateDnaCategorizado(
    id: number,
    textoMsg: string,
    categoria: CategoriaDna
): Promise<boolean> {
    console.log(`✏️ [DNA] Atualizando ID ${id} → categoria: ${categoria}`);

    try {
        const { error } = await supabase
            .from('dna_categorizado')
            .update({ texto_msg: textoMsg, categoria })
            .eq('id', id);

        if (error) {
            console.error('❌ [DNA] Erro ao atualizar:', error);
            return false;
        }

        console.log('✅ [DNA] Atualizado com sucesso');
        return true;
    } catch (err) {
        console.error('💥 [DNA] Exceção:', err);
        return false;
    }
}

/**
 * Retorna estatísticas por categoria
 */
export async function getCategoriaStats(): Promise<CategoriaStats[]> {
    console.log('📊 [DNA] Buscando estatísticas por categoria...');

    try {
        const { data, error } = await supabase
            .from('dna_categorizado')
            .select('categoria');

        if (error) {
            console.error('❌ [DNA] Erro ao buscar stats:', error);
            return [];
        }

        // Agrupa manualmente (Supabase não suporta GROUP BY direto)
        const counts: Record<string, number> = {};
        data?.forEach(item => {
            counts[item.categoria] = (counts[item.categoria] || 0) + 1;
        });

        const stats: CategoriaStats[] = Object.entries(counts).map(([cat, total]) => ({
            categoria: cat as CategoriaDna,
            total
        }));

        console.log('✅ [DNA] Stats:', stats);
        return stats.sort((a, b) => b.total - a.total);
    } catch (err) {
        console.error('💥 [DNA] Exceção:', err);
        return [];
    }
}

// ===========================================
// PALAVRA DA MANHÃ (AUTO)
// ===========================================

// Função para BUSCAR do cache (nova tabela)
export async function getPalavraManha(data: string): Promise<PalavraManhaCache | null> {
    try {
        const { data: result, error } = await supabase
            .from('palavra_manha_diaria')
            .select('*')
            .eq('data', data)
            .maybeSingle();

        if (error) {
            console.error('Erro ao buscar palavra_manha_diaria:', error);
            return null;
        }

        return result as PalavraManhaCache | null;
    } catch (e) {
        console.error('Exceção getPalavraManha:', e);
        return null;
    }
}

/**
 * Gera Palavra da Manhã via Edge Function
 */
export async function gerarPalavraManha(data: string): Promise<{ data: PalavraManhaCache | null; error: string | null }> {
    try {
        // 0. DOUBLE-CHECK: Verificar novamente se já existe no cache (race condition fix)
        const existente = await getPalavraManha(data);
        if (existente) {
            console.log('🌅 [PALAVRA] Cache encontrado no double-check, usando existente');
            return { data: existente, error: null };
        }

        // 1. Chama Edge Function
        const resp = await fetch(`${supabaseUrl}/functions/v1/execute`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                modo_id: 'modo_palavra_manha',
                data: data
            })
        });

        if (!resp.ok) throw new Error(`Erro na API: ${resp.status}`);

        const json = await resp.json();

        if (!json.ok || !json.resultado) throw new Error(json.error || 'Erro ao gerar mensagem');

        // 2. O Backend agora retorna o registro salvo!
        if (json.registro) {
            console.log('✅ [PALAVRA] Recebido registro salvo do backend:', json.registro.id);
            if (json.debug_save_error) console.error('⚠️ [DEBUG] Erro ao salvar (mas retornou ID?):', json.debug_save_error);
            return { data: json.registro as PalavraManhaCache, error: null };
        } else if (json.debug_save_error) {
            console.error('❌ [PALAVRA] ERRO CRÍTICO AO SALVAR NO BACKEND:', json.debug_save_error);
        }

        // Fallback legado (caso backend antigo responda ou erro de save)
        const config = json.config;
        const novoCache: any = {
            data: data,
            dia_semana: config?.dia || 'Hoje',
            categoria: config?.categoria || 'devocional',
            formato: config?.formato || 'Auto',
            mensagem: json.resultado,
            passagem_ref: json.passagem_usada || null
        };

        // Tenta salvar no cliente APENAS se o backend falhou (redundância)
        if (!json.registro) {
            console.log('⚠️ [PALAVRA] Backend não retornou registro, tentando salvar cliente...');
            await supabase.from('palavra_manha_diaria').upsert(novoCache);
        }

        return { data: { ...novoCache, id: 0 } as PalavraManhaCache, error: null };

    } catch (e) {
        console.error('Erro gerarPalavraManha:', e);
        return { data: null, error: e instanceof Error ? e.message : 'Erro desconhecido' };
    }
}

/**
 * Envia o "Amém" (Feedback positivo) - Nova Tabela
 */
export async function darAmen(id: number): Promise<boolean> {
    console.log(`🙏 [AMÉM] Enviando feedback para ID ${id}`);

    try {
        // Tenta RPC novo
        const { error } = await supabase.rpc('increment_amei_diaria', { row_id: id });

        if (error) {
            console.error('❌ [AMÉM] Erro RPC:', error);
            // Fallback: update direto na tabela nova
            const { error: updateError } = await supabase
                .from('palavra_manha_diaria')
                .update({ amei_count: 1 }) // Não é atômico mas serve

                .eq('id', id);

            return !updateError;
        }

        console.log('✅ [AMÉM] Recebido!');
        return true;
    } catch (e) {
        console.error('💥 [AMÉM] Exceção:', e);
        return false;
    }
}

// ===========================================
// BÍBLIA — Interações (Destaques, Favoritos, Notas)
// ===========================================

export interface BibliaInteracao {
    id?: number;
    tipo: 'destaque' | 'favorito' | 'nota';
    livro_abrev: string;
    livro_nome: string;
    capitulo: number;
    versiculo: number;
    texto_versiculo: string;
    cor?: string;
    nota?: string;
    created_at?: string;
}

export async function salvarInteracaoBiblia(interacao: Omit<BibliaInteracao, 'id' | 'created_at'>) {
    const { data, error } = await supabase
        .from('biblia_interacoes')
        .insert(interacao)
        .select()
        .single();
    if (error) console.error('❌ [BIBLIA] Erro ao salvar:', error);
    return { data, error };
}

export async function removerInteracaoBiblia(id: number) {
    const { error } = await supabase
        .from('biblia_interacoes')
        .delete()
        .eq('id', id);
    if (error) console.error('❌ [BIBLIA] Erro ao remover:', error);
    return { error };
}

export async function removerInteracaoPorVersiculoETipo(
    tipo: string, livroAbrev: string, capitulo: number, versiculo: number
) {
    const { error } = await supabase
        .from('biblia_interacoes')
        .delete()
        .eq('tipo', tipo)
        .eq('livro_abrev', livroAbrev)
        .eq('capitulo', capitulo)
        .eq('versiculo', versiculo);
    if (error) console.error('❌ [BIBLIA] Erro ao remover por versículo:', error);
    return { error };
}

export async function getInteracoesPorCapitulo(livroAbrev: string, capitulo: number) {
    const { data, error } = await supabase
        .from('biblia_interacoes')
        .select('*')
        .eq('livro_abrev', livroAbrev)
        .eq('capitulo', capitulo)
        .order('versiculo', { ascending: true });
    if (error) console.error('❌ [BIBLIA] Erro ao buscar interações:', error);
    return data || [];
}

export async function getAllInteracoesPorTipo(tipo: string, limit: number = 100) {
    const { data, error } = await supabase
        .from('biblia_interacoes')
        .select('*')
        .eq('tipo', tipo)
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error) console.error('❌ [BIBLIA] Erro ao buscar por tipo:', error);
    return data || [];
}

export async function atualizarNotaBiblia(id: number, nota: string) {
    const { error } = await supabase
        .from('biblia_interacoes')
        .update({ nota })
        .eq('id', id);
    if (error) console.error('❌ [BIBLIA] Erro ao atualizar nota:', error);
    return { error };
}

// ===========================================
// BÍBLIA — Histórico de Leitura
// ===========================================

export async function salvarHistoricoLeitura(livroAbrev: string, livroNome: string, capitulo: number) {
    const { error } = await supabase
        .from('biblia_historico_leitura')
        .insert({ livro_abrev: livroAbrev, livro_nome: livroNome, capitulo });
    if (error) console.error('❌ [BIBLIA] Erro ao salvar histórico:', error);
    return { error };
}

export async function getUltimaLeitura() {
    const { data, error } = await supabase
        .from('biblia_historico_leitura')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error) console.error('❌ [BIBLIA] Erro ao buscar última leitura:', error);
    return data;
}

