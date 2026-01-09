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
export async function getPayloadDoDia(dataPreferida: string): Promise<{
    data: PayloadDoDia | null;
    error: string | null;
    usouDataAlternativa: boolean;
}> {
    console.log('📅 [PAYLOAD] Buscando para data:', dataPreferida);

    try {
        if (!supabaseUrl || !supabaseAnonKey) {
            console.error('❌ [PAYLOAD] Variáveis de ambiente faltando!');
            return { data: null, error: 'Configuração do Supabase incompleta (URL ou KEY faltando).', usouDataAlternativa: false };
        }

        const { data: payload, error } = await supabase
            .from('payload_do_dia')
            .select('data, passagem_do_dia, arquetipo, voice_nome, voice_descricao')
            .eq('data', dataPreferida)
            .maybeSingle();

        if (error) {
            console.error('❌ [PAYLOAD] Erro:', error);
            return { data: null, error: `${error.message} (${error.code})`, usouDataAlternativa: false };
        }

        if (payload) {
            console.log('✅ [PAYLOAD] Encontrado para data solicitada:', payload);
            return { data: payload, error: null, usouDataAlternativa: false };
        }

        console.log('⚠️ [PAYLOAD] Não encontrado para hoje, buscando mais recente...');

        const { data: payloadRecente, error: errorRecente } = await supabase
            .from('payload_do_dia')
            .select('data, passagem_do_dia, arquetipo, voice_nome, voice_descricao')
            .order('data', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (errorRecente) {
            console.error('❌ [PAYLOAD] Erro ao buscar recente:', errorRecente);
            return { data: null, error: `${errorRecente.message}`, usouDataAlternativa: false };
        }

        console.log('✅ [PAYLOAD] Encontrado mais recente:', payloadRecente);
        return { data: payloadRecente, error: null, usouDataAlternativa: true };
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
