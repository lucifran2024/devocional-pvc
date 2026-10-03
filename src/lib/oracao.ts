import { supabase } from '@/lib/supabase';

// ===========================================
// DIÁRIO DE ORAÇÃO — pedidos com status orando/respondido.
// Mesmo padrão de anotacoes.ts (CRUD client-side + RLS por usuário).
// 03/10/2026: categoria, quantas vezes orou e a última oração (modo "Orar
// agora"), lista para compartilhar com a célula e testemunho.
// ===========================================

export type StatusOracao = 'orando' | 'respondido';

export const CATEGORIAS_ORACAO = [
    { id: 'familia', rotulo: 'Família' },
    { id: 'igreja', rotulo: 'Igreja' },
    { id: 'celula', rotulo: 'Célula' },
    { id: 'saude', rotulo: 'Saúde' },
    { id: 'trabalho', rotulo: 'Trabalho' },
    { id: 'outros', rotulo: 'Outros' },
] as const;

export type CategoriaOracao = typeof CATEGORIAS_ORACAO[number]['id'];

export function rotuloCategoria(categoria: string | null | undefined): string {
    return CATEGORIAS_ORACAO.find(c => c.id === categoria)?.rotulo || 'Outros';
}

export interface PedidoOracao {
    id: number;
    titulo: string;
    detalhes: string | null;
    status: StatusOracao;
    resposta: string | null;
    respondido_em: string | null;
    created_at: string;
    updated_at: string;
    categoria: string | null;
    vezes_orado: number;
    ultima_oracao_em: string | null;
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

export async function criarPedidoOracao(titulo: string, detalhes: string, categoria: CategoriaOracao | null = null): Promise<PedidoOracao | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('pedidos_oracao')
        .insert({ user_id: user.id, titulo, detalhes: detalhes || null, categoria })
        .select()
        .single();

    if (error) {
        console.error('Erro ao criar pedido:', error.message);
        return null;
    }
    return data as PedidoOracao;
}

export async function atualizarPedidoOracao(id: number, titulo: string, detalhes: string, categoria: CategoriaOracao | null = null): Promise<boolean> {
    const { error } = await supabase
        .from('pedidos_oracao')
        .update({ titulo, detalhes: detalhes || null, categoria, updated_at: new Date().toISOString() })
        .eq('id', id);

    if (error) {
        console.error('Erro ao atualizar pedido:', error.message);
        return false;
    }
    return true;
}

/** Registra que a pessoa orou por este pedido agora (soma 1 e guarda a hora). */
export async function registrarOracao(pedido: Pick<PedidoOracao, 'id' | 'vezes_orado'>): Promise<{ vezes_orado: number; ultima_oracao_em: string } | null> {
    const agora = new Date().toISOString();
    const vezes = (pedido.vezes_orado || 0) + 1;
    const { error } = await supabase
        .from('pedidos_oracao')
        .update({ vezes_orado: vezes, ultima_oracao_em: agora })
        .eq('id', pedido.id);

    if (error) {
        console.error('Erro ao registrar oração:', error.message);
        return null;
    }
    return { vezes_orado: vezes, ultima_oracao_em: agora };
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

// ===== ajudas da tela (sem rede; testadas no Vitest) =====

/** Dias desde o pedido até hoje (ou até a resposta). */
export function diasOrando(p: Pick<PedidoOracao, 'created_at' | 'respondido_em'>, agora = new Date()): number {
    const fim = p.respondido_em ? new Date(p.respondido_em) : agora;
    return Math.max(0, Math.floor((fim.getTime() - new Date(p.created_at).getTime()) / 86400000));
}

/** "hoje", "ontem", "há 3 dias" ou a data. */
export function quandoFoi(iso: string, agora = new Date()): string {
    const d = new Date(iso);
    const inicio = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const dias = Math.round((inicio(agora) - inicio(d)) / 86400000);
    if (dias <= 0) return 'hoje';
    if (dias === 1) return 'ontem';
    if (dias < 7) return `há ${dias} dias`;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

/** Ordem do "Orar agora": primeiro quem está há mais tempo sem oração (nunca orado vem antes). */
export function ordemParaOrar(pedidos: PedidoOracao[]): PedidoOracao[] {
    return pedidos
        .filter(p => p.status === 'orando')
        .sort((a, b) => {
            const ua = a.ultima_oracao_em ? Date.parse(a.ultima_oracao_em) : 0;
            const ub = b.ultima_oracao_em ? Date.parse(b.ultima_oracao_em) : 0;
            return ua - ub || Date.parse(a.created_at) - Date.parse(b.created_at);
        });
}

/** Lista para mandar no grupo (ex.: da célula), separada por categoria. */
export function textoListaOracao(pedidos: PedidoOracao[], data = new Date()): string {
    const ativos = pedidos.filter(p => p.status === 'orando');
    const blocos = CATEGORIAS_ORACAO
        .map(c => ({ rotulo: c.rotulo, itens: ativos.filter(p => (p.categoria || 'outros') === c.id) }))
        .filter(b => b.itens.length)
        .map(b => `${b.rotulo}\n${b.itens.map(p => `• ${p.titulo}`).join('\n')}`);
    return `Pedidos de oração — ${data.toLocaleDateString('pt-BR')}\n\n${blocos.join('\n\n')}`;
}

/** Testemunho para compartilhar quando Deus responde. */
export function textoTestemunho(p: PedidoOracao): string {
    const dias = diasOrando(p);
    const tempo = dias === 0 ? 'no mesmo dia' : `depois de ${dias} ${dias === 1 ? 'dia' : 'dias'} de oração`;
    return `Deus respondeu: ${p.titulo}\n${tempo.charAt(0).toUpperCase() + tempo.slice(1)}.${p.resposta ? `\n\n${p.resposta}` : ''}`;
}
