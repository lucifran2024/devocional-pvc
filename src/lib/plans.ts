import { supabase } from '@/lib/supabase';
import { Plano, PlanoDia, InscricaoPlano } from './types/plans';

export async function getPlanosDisponiveis(): Promise<Plano[]> {
    const { data, error } = await supabase
        .from('planos')
        .select('*')
        .order('id');

    if (error) {
        console.error('Erro ao buscar planos:', error);
        return [];
    }
    return data || [];
}

export async function getMinhasInscricoes(): Promise<(InscricaoPlano & { plano: Plano })[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('usuario_inscricoes')
        .select('*, plano:planos(*)')
        .eq('user_id', user.id);

    if (error) {
        console.error('Erro ao buscar inscrições:', error);
        return [];
    }
    return data as (InscricaoPlano & { plano: Plano })[] || [];
}

export async function inscreverEmPlano(plano_id: string): Promise<InscricaoPlano | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error('Usuário não autenticado');
    }

    // Verificar se já existe (opcional, o banco pode travar ou upsert)
    // Vamos fazer insert direto
    const { data, error } = await supabase
        .from('usuario_inscricoes')
        .insert({
            user_id: user.id,
            plano_id: plano_id,
            data_inicio: new Date().toISOString(),
            dia_atual: 1,
            status: 'ativo'
        })
        .select()
        .single();

    if (error) {
        console.error('Erro ao inscrever:', error);
        return null;
    }
    return data;
}

export async function getDiaDoPlano(plano_id: string, dia_numero: number): Promise<PlanoDia | null> {
    const { data, error } = await supabase
        .from('plano_dias')
        .select('*')
        .eq('plano_id', plano_id)
        .eq('dia_numero', dia_numero)
        .single();

    if (error) {
        console.error('Erro ao buscar dia do plano:', error);
        return null;
    }
    return data;
}

export async function concluirDiaLeitura(inscricao_id: string, user_id: string, proximo_dia: number): Promise<boolean> {
    // Atualiza o dia_atual da inscrição
    const { error } = await supabase
        .from('usuario_inscricoes')
        .update({
            dia_atual: proximo_dia,
            updated_at: new Date().toISOString()
        })
        .eq('id', inscricao_id);

    if (error) {
        console.error('Erro ao concluir leitura:', error);
        return false;
    }
    return true;
}
