import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log('🔧 [SUPABASE] Inicializando cliente');
console.log('🔧 [SUPABASE] URL:', supabaseUrl);
console.log('🔧 [SUPABASE] Key existe:', !!supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
 */
export async function executarModo(modo_id: string, data: string): Promise<ExecuteResponse> {
    console.log('🚀 [EXECUTE] Chamando Edge Function VIA CLIENTE (invoke)');
    console.log('🚀 [EXECUTE] modo_id:', modo_id);
    console.log('🚀 [EXECUTE] data:', data);

    try {
        const { data: resultData, error } = await supabase.functions.invoke('execute', {
            body: { modo_id, data }
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
export function getDataHoje(): string {
    const hoje = new Date();
    // ... (função getDataHoje existente) ...
    return hoje.toISOString().split('T')[0];
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
            console.warn('⚠️ [STORAGE] Nenhuma passagem encontrada para hoje. Usando fallback aleatório?');
            // Opcional: retornar a mais recente se não tiver a de hoje
            // return passagens[passagens.length - 1]; 
            return null;
        }

    } catch (err) {
        console.error('💥 [STORAGE] Erro crítico ao processar plano de leitura:', err);
        return null;
    }
}
