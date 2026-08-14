import { describe, expect, it } from 'vitest';
import { gerarExplicacaoLocal, montarPedidoExplicacaoParte } from '../../src/lib/explicacao-local';

describe('explicação local da parte', () => {
    it('usa somente os versículos recebidos, sem introdução ou perícope externas', () => {
        const inicio = performance.now();
        const texto = gerarExplicacaoLocal({
            referencia: 'Mateus 5',
            parte: 1,
            introducao: {
                categoria: 'Evangelho',
                autor: 'Mateus',
                epoca: '60–70 d.C.',
                tema: 'Jesus, o Rei Messias',
                resumo: 'Apresenta Jesus como o Messias prometido.',
            },
            pericopes: [{ verse: 1, title: 'As Bem-Aventuranças' }],
            versiculos: [
                { verse: 1, text: 'Vendo as multidões, Jesus subiu ao monte.' },
                { verse: 3, text: 'Bem-aventurados os pobres em espírito.' },
            ],
        });
        const duracao = performance.now() - inicio;

        expect(texto).toContain('Mateus 5');
        expect(texto).toContain('Vendo as multidões');
        expect(texto).toContain('Bem-aventurados os pobres em espírito');
        expect(texto).not.toContain('As Bem-Aventuranças');
        expect(texto).not.toContain('Jesus, o Rei Messias');
        expect(texto).not.toContain('Apresenta Jesus como o Messias prometido');
        expect(texto).not.toContain('oração');
        expect(duracao).toBeLessThan(50);
    });

    it('monta o pedido com todos e somente os versículos da parte visível', () => {
        const parte1 = [
            { verse: 1, text: 'Paulo chegou também a Derbe e Listra.', chapter: 16, livro: 'Atos' },
            { verse: 2, text: 'Os irmãos davam bom testemunho de Timóteo.', chapter: 16, livro: 'Atos' },
            { verse: 3, text: 'Paulo quis que ele o acompanhasse.', chapter: 16, livro: 'Atos' },
        ];
        const parte2 = [
            { verse: 1, text: 'Passaram por Anfípolis e Apolônia.', chapter: 17, livro: 'Atos' },
        ];

        const pedido = montarPedidoExplicacaoParte({
            referenciaPassagem: 'Atos 16-17',
            parte: 1,
            versiculos: parte1,
        });

        expect(pedido.referencia).toBe('Atos 16:1–3');
        expect(pedido.versiculos).toContain('**1.** Paulo chegou também a Derbe e Listra.');
        expect(pedido.versiculos).toContain('**2.** Os irmãos davam bom testemunho de Timóteo.');
        expect(pedido.versiculos).toContain('**3.** Paulo quis que ele o acompanhasse.');
        expect(pedido.versiculos).not.toContain(parte2[0].text);
        expect(pedido.quantidadeVersiculos).toBe(3);
    });

    it('preserva todos os blocos quando a parte visível atravessa capítulos', () => {
        const pedido = montarPedidoExplicacaoParte({
            referenciaPassagem: 'Salmos 1-2',
            parte: 1,
            versiculos: [
                { verse: 6, text: 'O Senhor aprova o caminho dos justos.', chapter: 1, livro: 'Salmos' },
                { verse: 1, text: 'Por que se amotinam as nações?', chapter: 2, livro: 'Salmos' },
                { verse: 2, text: 'Os reis da terra tomam posição.', chapter: 2, livro: 'Salmos' },
            ],
        });

        expect(pedido.referencia).toBe('Salmos 1:6; 2:1–2');
        expect(pedido.versiculos).toContain('**Salmos 1:6.**');
        expect(pedido.versiculos).toContain('**Salmos 2:1.**');
        expect(pedido.versiculos).toContain('**Salmos 2:2.**');
        expect(pedido.quantidadeVersiculos).toBe(3);
    });
});
