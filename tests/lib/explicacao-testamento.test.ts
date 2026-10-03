import { describe, expect, it } from 'vitest';

import type { Versiculo } from '@/lib/bible-api';
import {
    contextoDoTestamento,
    montarPedidoTestamento,
    opcoesDeTestamento,
    referenciaDosCapitulos,
    testamentoDoCapitulo,
    textoDosCapitulos,
} from '@/lib/explicacao-testamento';

// 03/10/2026: Lucifran quer explicar o Antigo e o Novo Testamento inteiros da
// leitura de hoje, separados, para ler no dia em que não der para ler tudo.

const cap = (livro: string, livroId: number, chapter: number, versos: number[], texto = 'texto') =>
    versos.map(verse => ({ livro, livroId, chapter, verse, text: `${texto} ${verse}` }) as Versiculo);

// Salmos 92-95, Efésios 3 (leitura de 03/10/2026), como o app agrupa: um grupo por capítulo
const LEITURA: Versiculo[][] = [
    cap('salmos', 19, 92, [1, 2, 3]),
    cap('salmos', 19, 93, [1, 2]),
    cap('salmos', 19, 94, [1, 2]),
    cap('salmos', 19, 95, [1, 2]),
    cap('efésios', 49, 3, [1, 2, 3, 4]),
];

describe('separar a leitura de hoje por testamento', () => {
    it('Mateus em diante é Novo Testamento; o resto é Antigo', () => {
        expect(testamentoDoCapitulo(LEITURA[0])).toBe('AT');
        expect(testamentoDoCapitulo(LEITURA[4])).toBe('NT');
        expect(testamentoDoCapitulo(cap('mateus', 40, 1, [1]))).toBe('NT');
        expect(testamentoDoCapitulo(cap('malaquias', 39, 4, [1]))).toBe('AT');
    });

    it('junta capítulos seguidos do mesmo livro e separa livros diferentes', () => {
        expect(referenciaDosCapitulos(LEITURA.slice(0, 4))).toBe('Salmos 92-95');
        expect(referenciaDosCapitulos([
            cap('levítico', 3, 26, [1]), cap('levítico', 3, 27, [1]),
            cap('números', 4, 1, [1]), cap('números', 4, 2, [1]), cap('números', 4, 3, [1]),
        ])).toBe('Levítico 26-27, Números 1-3');
        expect(referenciaDosCapitulos([cap('efésios', 49, 3, [1, 2])])).toBe('Efésios 3');
        // capítulo pulado não vira faixa contínua
        expect(referenciaDosCapitulos([cap('salmos', 19, 1, [1]), cap('salmos', 19, 3, [1])])).toBe('Salmos 1, Salmos 3');
    });

    it('capítulo que começa no meio mostra os versículos', () => {
        expect(referenciaDosCapitulos([cap('joão', 43, 14, [5, 6, 7])])).toBe('João 14:5-7');
    });

    it('um botão por testamento presente, Antigo primeiro', () => {
        expect(opcoesDeTestamento(LEITURA)).toEqual([
            { testamento: 'AT', referencia: 'Salmos 92-95' },
            { testamento: 'NT', referencia: 'Efésios 3' },
        ]);
        expect(opcoesDeTestamento(LEITURA.slice(4))).toEqual([{ testamento: 'NT', referencia: 'Efésios 3' }]);
        expect(opcoesDeTestamento([])).toEqual([]);
    });
});

describe('pedido do testamento para a IA', () => {
    it('leva só os capítulos do testamento, com cabeçalho e um versículo por linha', () => {
        const at = montarPedidoTestamento(LEITURA, 'AT')!;
        expect(at).toMatchObject({ testamento: 'AT', referencia: 'Salmos 92-95', capitulos: 4, quantidadeVersiculos: 9 });
        expect(at.versiculos).toContain('### Salmos 92\n1 texto 1\n2 texto 2\n3 texto 3');
        expect(at.versiculos).toContain('### Salmos 95');
        expect(at.versiculos).not.toContain('Efésios');

        const nt = montarPedidoTestamento(LEITURA, 'NT')!;
        expect(nt).toMatchObject({ referencia: 'Efésios 3', capitulos: 1, quantidadeVersiculos: 4 });
        expect(nt.versiculos).not.toContain('Salmos');
    });

    it('sem o testamento na leitura, não há pedido', () => {
        expect(montarPedidoTestamento(LEITURA.slice(0, 4), 'NT')).toBeNull();
    });

    it('tira marcações HTML do texto', () => {
        expect(textoDosCapitulos([[{ livro: 'salmos', livroId: 19, chapter: 92, verse: 1, text: '<b>Um salmo</b>  É bom   dar graças' }]]))
            .toBe('### Salmos 92\n1 Um salmo É bom dar graças');
    });

    it('contexto do app: introdução do livro e seções dos capítulos, sem repetir o livro', () => {
        const ctx = contextoDoTestamento(LEITURA, 'AT', 'Salmos 92-95, Efésios 3');
        expect(ctx.testamento).toBe('Antigo Testamento');
        expect(ctx.leituraDoDia).toBe('Salmos 92-95, Efésios 3');
        expect(ctx.livros).toHaveLength(1);
        expect(ctx.livros[0].livro).toBe('Salmos');
        expect(ctx.livros[0].autor).toBeTruthy();
        expect(ctx.capitulos.every(c => c.referencia.startsWith('Salmos 9'))).toBe(true);
    });
});
