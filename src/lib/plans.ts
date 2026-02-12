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
        throw new Error('USER_NOT_AUTHENTICATED');
    }

    // Tenta inserir
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
        // Se já existe (Unique Violation), busca e retorna a existente
        if (error.code === '23505') {
            console.log('Usuário já inscrito, recuperando inscrição...');
            const { data: existente, error: fetchError } = await supabase
                .from('usuario_inscricoes')
                .select('*')
                .eq('user_id', user.id)
                .eq('plano_id', plano_id)
                .single();

            if (fetchError) {
                console.error('Erro ao recuperar inscrição existente:', fetchError);
                return null;
            }
            return existente;
        }

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
        .maybeSingle();

    if (error) {
        console.error('Erro ao buscar dia do plano:', error);
        return null;
    }
    return data || null;
}

export async function getPrimeiroDiaDoPlano(plano_id: string): Promise<PlanoDia | null> {
    const { data, error } = await supabase
        .from('plano_dias')
        .select('*')
        .eq('plano_id', plano_id)
        .order('dia_numero', { ascending: true })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('Erro ao buscar primeiro dia do plano:', error);
        return null;
    }
    return data || null;
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
