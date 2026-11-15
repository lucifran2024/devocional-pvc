import { describe, expect, it } from 'vitest';
import { agruparPorCapitulo } from '@/lib/biblia-pacote';

// 15/11/2026: a Bíblia era baixada em 1.189 pedidos (um por capítulo) e o pacote
// ficava incompleto. Agora vem num arquivo só, separado aqui por capítulo.
describe('pacote da Bíblia inteira', () => {
    const linhas = [
        { book: 1, chapter: 1, verse: 2, text: 'A terra era um vazio.' },
        { book: 1, chapter: 1, verse: 1, text: 'No começo <i>Deus</i> criou<br/>os céus.' },
        { book: 1, chapter: 2, verse: 1, text: 'Assim terminou.' },
        { book: 43, chapter: 3, verse: 16, text: 'Porque Deus amou o mundo.' },
    ];

    it('separa por livro e capítulo, em ordem de versículo', () => {
        const caps = agruparPorCapitulo(linhas);
        expect(caps).toHaveLength(3);
        expect(caps[0]).toMatchObject({ livroId: 1, capitulo: 1 });
        expect(caps[0].versiculos.map((v) => v.verse)).toEqual([1, 2]);
        expect(caps[2]).toMatchObject({ livroId: 43, capitulo: 3 });
    });

    it('tira as marcas de formatação do texto', () => {
        expect(agruparPorCapitulo(linhas)[0].versiculos[0].text).toBe('No começo Deus criou os céus.');
    });

    it('ignora linha estragada e arquivo que não é lista', () => {
        expect(agruparPorCapitulo([{ book: 1, chapter: 1, verse: 1 }, null, { book: 'x', chapter: 1, verse: 1, text: 'a' }] as unknown[])).toHaveLength(0);
        expect(agruparPorCapitulo({ erro: true } as unknown)).toHaveLength(0);
    });
});
