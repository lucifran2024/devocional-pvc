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

// ===========================================
// FUNÇÕES
// ===========================================

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
    formato?: string;
    quantidade?: number;
    dnaBase?: string;
    periodo?: string;
    diaSemana?: string;
    momento?: string;
}

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
        const { error } = await supabase
            .from('historico_geracoes')
            .update({ aprovado })
            .eq('id', id);

        if (error) {
            console.error('❌ [FEEDBACK] Erro ao atualizar:', error);
            return false;
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

export interface FavoritoMensagem {
    id: number;
    historico_id: number;
    indice_msg: number;
    texto_msg: string;
    created_at: string;
}

/**
 * Adiciona uma mensagem individual aos favoritos
 */
export async function addFavoritoMensagem(
    historicoId: number,
    indiceMensagem: number,
    textoMensagem: string
): Promise<FavoritoMensagem | null> {
    console.log(`⭐ [FAVORITO] Adicionando mensagem ${indiceMensagem} do histórico ${historicoId}`);

    try {
        const { data, error } = await supabase
            .from('favoritos_mensagens')
            .insert({
                historico_id: historicoId,
                indice_msg: indiceMensagem,
                texto_msg: textoMensagem
            })
            .select()
            .single();

        if (error) {
            console.error('❌ [FAVORITO] Erro ao adicionar:', error);
            return null;
        }

        console.log('✅ [FAVORITO] Adicionado com sucesso:', data.id);
        return data as FavoritoMensagem;
    } catch (err) {
        console.error('💥 [FAVORITO] Exceção:', err);
        return null;
    }
}

/**
 * Remove uma mensagem individual dos favoritos
 */
export async function removeFavoritoMensagem(
    historicoId: number,
    indiceMensagem: number
): Promise<boolean> {
    console.log(`💔 [FAVORITO] Removendo mensagem ${indiceMensagem} do histórico ${historicoId}`);

    try {
        const { error } = await supabase
            .from('favoritos_mensagens')
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
 * Busca todos os favoritos de um histórico específico
 */
export async function getFavoritosByHistorico(historicoId: number): Promise<number[]> {
    try {
        const { data, error } = await supabase
            .from('favoritos_mensagens')
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
 * Busca todos os favoritos individuais (para usar no prompt)
 */
export async function getAllFavoritosMensagens(limit: number = 10): Promise<FavoritoMensagem[]> {
    console.log(`📜 [FAVORITOS] Buscando últimos ${limit} favoritos individuais...`);

    try {
        const { data, error } = await supabase
            .from('favoritos_mensagens')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('❌ [FAVORITOS] Erro ao buscar:', error);
            return [];
        }

        console.log(`✅ [FAVORITOS] Encontrados: ${data?.length || 0}`);
        return data as FavoritoMensagem[];
    } catch (err) {
        console.error('💥 [FAVORITOS] Exceção:', err);
        return [];
    }
}

/**
 * Busca APENAS os favoritos manuais (Mensagens Externas/Banco de Ouro Manual)
 * Onde historico_id IS NULL
 */
export async function getFavoritosManuais(limit: number = 50): Promise<FavoritoMensagem[]> {
    console.log(`🏆 [BANCO DE OURO] Buscando mensagens manuais (limit: ${limit})...`);

    try {
        const { data, error } = await supabase
            .from('favoritos_mensagens')
            .select('*')
            .is('historico_id', null) // Filtro crucial: apenas manuais
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('❌ [BANCO DE OURO] Erro ao buscar:', error);
            return [];
        }

        console.log(`✅ [BANCO DE OURO] Encontrados: ${data?.length || 0}`);
        return data as FavoritoMensagem[];
    } catch (err) {
        console.error('💥 [BANCO DE OURO] Exceção:', err);
        return [];
    }
}

/**
 * Adiciona uma mensagem MANUAL aos favoritos (sem vínculo com histórico)
 * Para quando o usuário quer adicionar texto externo
 */
export async function addFavoritoManual(textoMensagem: string): Promise<FavoritoMensagem | null> {
    console.log(`📝 [FAVORITO MANUAL] Adicionando mensagem de ${textoMensagem.length} caracteres`);

    try {
        const { data, error } = await supabase
            .from('favoritos_mensagens')
            .insert({
                historico_id: null, // Mensagem manual, sem vínculo
                indice_msg: 0,      // Índice padrão para manuais
                texto_msg: textoMensagem
            })
            .select()
            .single();

        if (error) {
            console.error('❌ [FAVORITO MANUAL] Erro ao adicionar:', error);
            return null;
        }

        console.log('✅ [FAVORITO MANUAL] Adicionado com sucesso:', data.id);
        return data as FavoritoMensagem;
    } catch (err) {
        console.error('💥 [FAVORITO MANUAL] Exceção:', err);
        return null;
    }
}

/**
 * Remove um favorito pelo ID primário (útil para manuais e gerais)
 */
export async function removeFavoritoById(id: number): Promise<boolean> {
    console.log(`🗑️ [FAVORITO] Removendo favorito ID ${id}`);

    try {
        const { error } = await supabase
            .from('favoritos_mensagens')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('❌ [FAVORITO] Erro ao remover por ID:', error);
            return false;
        }

        console.log('✅ [FAVORITO] Removido com sucesso');
        return true;
    } catch (err) {
        console.error('💥 [FAVORITO] Exceção:', err);
        return false;
    }
}

// ===========================================
// DNA CATEGORIZADO - Novo Sistema de Categorização
// ===========================================

export type CategoriaDna = 'devocional' | 'oração' | 'versículo' | 'reflexão' | 'exortação' | 'declaração' | 'outro';

export interface DnaCategorizado {
    id: number;
    texto_msg: string;
    categoria: CategoriaDna;
    tags: string[];
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
    limit: number = 50
): Promise<DnaCategorizado[]> {
    console.log(`🧬 [DNA] Buscando (categoria: ${categoria || 'todas'}, limit: ${limit})...`);

    try {
        let query = supabase
            .from('dna_categorizado')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (categoria && categoria !== 'outro') {
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
 * Adiciona nova mensagem ao DNA Categorizado
 */
export async function addDnaCategorizado(
    textoMensagem: string,
    categoria: CategoriaDna,
    tags: string[] = []
): Promise<DnaCategorizado | null> {
    console.log(`🧬 [DNA] Adicionando mensagem (${categoria}): ${textoMensagem.substring(0, 50)}...`);

    try {
        const { data, error } = await supabase
            .from('dna_categorizado')
            .insert({
                texto_msg: textoMensagem,
                categoria,
                tags
            })
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
 * FUNÇÃO UNIFICADA: Adiciona mensagem em AMBAS tabelas
 * - favoritos_mensagens (sem categoria)
 * - dna_categorizado (com categoria)
 */
export async function addFavoritoUnificado(
    textoMensagem: string,
    categoria: CategoriaDna = 'outro',
    tags: string[] = []
): Promise<{ favorito: FavoritoMensagem | null; dna: DnaCategorizado | null }> {
    console.log(`🔗 [UNIFICADO] Adicionando em ambas tabelas (${categoria})`);

    // Insere em paralelo nas duas tabelas
    const [favorito, dna] = await Promise.all([
        addFavoritoManual(textoMensagem),
        addDnaCategorizado(textoMensagem, categoria, tags)
    ]);

    console.log(`✅ [UNIFICADO] Favorito: ${favorito?.id || 'erro'}, DNA: ${dna?.id || 'erro'}`);
    return { favorito, dna };
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

/**
 * Busca Palavra da Manhã do cache
 */
export async function getPalavraManha(data: string): Promise<PalavraManhaCache | null> {
    const { data: result } = await supabase
        .from('palavra_manha_cache')
        .select('*')
        .eq('data', data)
        .maybeSingle();

    return result;
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

        // Fallback legado (caso backend antigo responda)
        const config = json.config;
        const novoCache: any = {
            data: data,
            dia_semana: config?.dia || 'Hoje',
            categoria: config?.categoria || 'DEVOCIONAL',
            formato: config?.formato || 'Auto',
            mensagem: json.resultado,
            passagem_ref: json.passagem_usada || null
        };

        return { data: { ...novoCache, id: 0 } as PalavraManhaCache, error: null };

    } catch (e) {
        console.error('Erro gerarPalavraManha:', e);
        return { data: null, error: e instanceof Error ? e.message : 'Erro desconhecido' };
    }
}

/**
 * Envia o "Amém" (Feedback positivo)
 */
export async function darAmen(id: number): Promise<boolean> {
    console.log(`🙏 [AMÉM] Enviando feedback para ID ${id}`);

    try {
        const { error } = await supabase.rpc('increment_amei', { row_id: id });

        if (error) {
            console.error('❌ [AMÉM] Erro RPC:', error);
            // Fallback manual se RPC falhar ou não existir
            const { error: updateError } = await supabase
                .from('palavra_manha_cache')
                .update({ amei_count: 1 }) // Incremento básico
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
