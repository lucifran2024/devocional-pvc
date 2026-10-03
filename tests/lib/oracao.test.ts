import { describe, expect, it, vi } from 'vitest';

// as ajudas da tela não usam a rede; o cliente do Supabase só precisa existir
vi.mock('@/lib/supabase', () => ({ supabase: {} }));

import { diasOrando, ordemParaOrar, quandoFoi, rotuloCategoria, textoListaOracao, textoTestemunho, type PedidoOracao } from '@/lib/oracao';

// 03/10/2026: Diário de Oração reformulado — "Orar agora", categorias, quantas
// vezes orou, lista para a célula e testemunho.

const pedido = (id: number, extra: Partial<PedidoOracao> = {}): PedidoOracao => ({
    id, titulo: `Pedido ${id}`, detalhes: null, status: 'orando', resposta: null, respondido_em: null,
    created_at: '2026-09-01T10:00:00Z', updated_at: '2026-09-01T10:00:00Z', categoria: null, vezes_orado: 0, ultima_oracao_em: null,
    ...extra,
});

describe('Orar agora', () => {
    it('começa pelo pedido nunca orado, depois o que está há mais tempo sem oração; respondidos ficam fora', () => {
        const ordem = ordemParaOrar([
            pedido(1, { ultima_oracao_em: '2026-10-02T10:00:00Z' }),
            pedido(2, { ultima_oracao_em: '2026-09-20T10:00:00Z' }),
            pedido(3),
            pedido(4, { status: 'respondido' }),
        ]);
        expect(ordem.map(p => p.id)).toEqual([3, 2, 1]);
    });
});

describe('lista para compartilhar', () => {
    it('separa por categoria na ordem do app; sem categoria vai em Outros; só os que estão em oração', () => {
        const texto = textoListaOracao([
            pedido(1, { titulo: 'Saúde da tia Ana', categoria: 'saude' }),
            pedido(2, { titulo: 'Casa nova do João', categoria: 'celula' }),
            pedido(3, { titulo: 'Emprego do Pedro' }),
            pedido(4, { titulo: 'Já respondido', status: 'respondido', categoria: 'celula' }),
        ], new Date(2026, 9, 3));
        expect(texto).toBe('Pedidos de oração — 03/10/2026\n\nCélula\n• Casa nova do João\n\nSaúde\n• Saúde da tia Ana\n\nOutros\n• Emprego do Pedro');
    });
});

describe('testemunho e tempos', () => {
    it('testemunho com o tempo de oração e como Deus respondeu', () => {
        const p = pedido(1, { titulo: 'Emprego do Pedro', status: 'respondido', respondido_em: '2026-09-11T10:00:00Z', resposta: 'Ele foi contratado.' });
        expect(textoTestemunho(p)).toBe('Deus respondeu: Emprego do Pedro\nDepois de 10 dias de oração.\n\nEle foi contratado.');
        expect(textoTestemunho(pedido(2, { status: 'respondido', respondido_em: '2026-09-01T18:00:00Z' }))).toBe('Deus respondeu: Pedido 2\nNo mesmo dia.');
    });

    it('dias orando, quando foi a última oração e o nome da categoria', () => {
        const agora = new Date(2026, 9, 3, 12);
        expect(diasOrando(pedido(1, { created_at: new Date(2026, 9, 1, 12).toISOString() }), agora)).toBe(2);
        expect(quandoFoi(new Date(2026, 9, 3, 7).toISOString(), agora)).toBe('hoje');
        expect(quandoFoi(new Date(2026, 9, 2, 23).toISOString(), agora)).toBe('ontem');
        expect(quandoFoi(new Date(2026, 8, 29, 9).toISOString(), agora)).toBe('há 4 dias');
        expect(rotuloCategoria('celula')).toBe('Célula');
        expect(rotuloCategoria(null)).toBe('Outros');
    });
});
