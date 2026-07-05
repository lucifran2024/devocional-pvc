import { supabase } from '@/lib/supabase';

// ===========================================
// DIÁRIO DE ORAÇÃO — pedidos com status orando/respondido.
// Mesmo padrão de anotacoes.ts (CRUD client-side + RLS por usuário).
// ===========================================

export type StatusOracao = 'orando' | 'respondido';

export interface PedidoOracao {
    id: number;
    titulo: string;
    detalhes: string | null;
    status: StatusOracao;
    resposta: string | null;
    respondido_em: string | null;
    created_at: string;
    updated_at: string;
}

export async function getPedidosOracao(): Promise<PedidoOracao[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('pedidos_oracao')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erro ao buscar pedidos de oração:', error.message);
        return [];
    }
    return (data as PedidoOracao[]) || [];
}

export async function criarPedidoOracao(titulo: string, detalhes: string): Promise<PedidoOracao | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('pedidos_oracao')
        .insert({ user_id: user.id, titulo, detalhes: detalhes || null })
        .select()
        .single();

    if (error) {
        console.error('Erro ao criar pedido:', error.message);
        return null;
    }
    return data as PedidoOracao;
}

export async function atualizarPedidoOracao(id: number, titulo: string, detalhes: string): Promise<boolean> {
    const { error } = await supabase
        .from('pedidos_oracao')
        .update({ titulo, detalhes: detalhes || null, updated_at: new Date().toISOString() })
        .eq('id', id);

    if (error) {
        console.error('Erro ao atualizar pedido:', error.message);
        return false;
    }
    return true;
}

/** Marca como respondido, com testemunho opcional de como Deus respondeu. */
export async function marcarRespondido(id: number, resposta: string): Promise<boolean> {
    const { error } = await supabase
        .from('pedidos_oracao')
        .update({
            status: 'respondido',
            resposta: resposta || null,
            respondido_em: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('id', id);

    if (error) {
        console.error('Erro ao marcar respondido:', error.message);
        return false;
    }
    return true;
}

/** Volta um pedido respondido para "orando" (desfazer). */
export async function voltarParaOrando(id: number): Promise<boolean> {
    const { error } = await supabase
        .from('pedidos_oracao')
        .update({
            status: 'orando',
            resposta: null,
            respondido_em: null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id);

    if (error) {
        console.error('Erro ao voltar para orando:', error.message);
        return false;
    }
    return true;
}

export async function removerPedidoOracao(id: number): Promise<boolean> {
    const { error } = await supabase
        .from('pedidos_oracao')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Erro ao remover pedido:', error.message);
        return false;
    }
    return true;
}
