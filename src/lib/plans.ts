import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Plano, InscricaoPlano, PlanoDia } from './types/plans';

const supabase = createClientComponentClient();

/**
 * Retorna todos os planos ativos disponíveis
 */
export async function getPlanosDisponiveis(): Promise<Plano[]> {
    const { data, error } = await supabase
        .from('planos')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true });

    if (error) {
        console.error('Erro ao buscar planos:', error);
        return [];
    }

    return data as Plano[];
}

/**
 * Retorna as inscrições do usuário atual
 */
export async function getMinhasInscricoes(): Promise<InscricaoPlano[]> {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) return [];

    // Busca inscrições com join no plano
    const { data, error } = await supabase
        .from('usuario_inscricoes')
        .select(`
      *,
      plano:planos(*)
    `)
        .eq('user_id', session.session.user.id)
        .order('ultimo_acesso', { ascending: false });

    if (error) {
        console.error('Erro ao buscar inscrições:', error);
        return [];
    }

    // Calcula progresso
    return data.map((inscricao: any) => ({
        ...inscricao,
        progresso_percent: Math.round((inscricao.dia_atual / (inscricao.plano.duracao_dias || 1)) * 100)
    })) as InscricaoPlano[];
}

/**
 * Inscreve o usuário em um plano
 */
export async function inscreverEmPlano(planoId: string): Promise<{ success: boolean; error?: string }> {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) return { success: false, error: 'Usuário não autenticado' };

    const { error } = await supabase
        .from('usuario_inscricoes')
        .insert({
            user_id: session.session.user.id,
            plano_id: planoId,
            dia_atual: 1,
            status: 'ativo'
        });

    if (error) {
        // Se erro for unique violation (já inscrito), retorna sucesso mas avisa
        if (error.code === '23505') {
            return { success: true };
        }
        console.error('Erro ao inscrever:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

/**
 * Busca o dia atual de um plano específico
 */
export async function getDiaDoPlano(planoId: string, diaNumero: number): Promise<PlanoDia | null> {
    const { data, error } = await supabase
        .from('plano_dias')
        .select('*')
        .eq('plano_id', planoId)
        .eq('dia_numero', diaNumero)
        .single();

    if (error) {
        console.error(`Erro ao buscar dia ${diaNumero} do plano ${planoId}:`, error);
        return null;
    }

    return data as PlanoDia;
}

/**
 * Avança o progresso do usuário no plano
 */
export async function concluirDiaLeitura(inscricaoId: string, user_id: string, novoDia: number): Promise<void> {

    // Atualiza dia_atual e ultimo_acesso
    const { error } = await supabase
        .from('usuario_inscricoes')
        .update({
            dia_atual: novoDia,
            ultimo_acesso: new Date().toISOString()
        })
        .eq('id', inscricaoId)
        .eq('user_id', user_id);

    if (error) {
        console.error('Erro ao atualizar progresso:', error);
    }
}
