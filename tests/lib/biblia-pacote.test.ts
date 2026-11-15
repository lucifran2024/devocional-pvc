import { describe, expect, it } from 'vitest';
import { agruparPorCapitulo, defeitoDoPacote } from '@/lib/biblia-pacote';

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

    it('versículo repetido não duplica', () => {
        const caps = agruparPorCapitulo([...linhas, { book: 1, chapter: 2, verse: 1, text: 'Outra vez.' }]);
        expect(caps[1].versiculos).toEqual([{ verse: 1, text: 'Assim terminou.' }]);
    });

    // Revisão de 15/11/2026: pacote pela metade não pode ser gravado.
    describe('conferência antes de guardar', () => {
        const esperado = { 1: 2, 43: 3 };
        const cheio = [
            { book: 1, chapter: 1, verse: 1, text: 'a' }, { book: 1, chapter: 2, verse: 1, text: 'b' },
            { book: 43, chapter: 1, verse: 1, text: 'c' }, { book: 43, chapter: 2, verse: 1, text: 'd' }, { book: 43, chapter: 3, verse: 1, text: 'e' },
        ];
        it('aceita o pacote completo', () => {
            expect(defeitoDoPacote(agruparPorCapitulo(cheio), esperado)).toBeNull();
        });
        it('recusa quando falta capítulo', () => {
            expect(defeitoDoPacote(agruparPorCapitulo(cheio.slice(0, 4)), esperado)).toContain('43:3');
        });
        it('recusa capítulo sem texto', () => {
            const vazio = cheio.map((l) => (l.book === 1 && l.chapter === 2 ? { ...l, text: ' <br/> ' } : l));
            expect(defeitoDoPacote(agruparPorCapitulo(vazio), esperado)).toContain('1:2');
        });
        it('aceita capítulo que começa em outro número (A Mensagem junta versículos)', () => {
            const junto = cheio.map((l) => (l.book === 43 && l.chapter === 1 ? { ...l, verse: 7 } : l));
            expect(defeitoDoPacote(agruparPorCapitulo(junto), esperado)).toBeNull();
        });
    });
});
