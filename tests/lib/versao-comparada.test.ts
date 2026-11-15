import { describe, expect, it } from 'vitest';
import { encaixarComparacao } from '@/lib/versao-comparada';

// 15/11/2026 (Lucifran, Hebreus 13 com A Mensagem): o bloco "1-4 …" aparecia
// logo depois do versículo 1; tem de aparecer depois do 4, o último da faixa.
describe('onde entra o texto da versão comparada', () => {
    it('versículo comum entra depois do próprio versículo', () => {
        const mapa = encaixarComparacao([{ verse: 1, text: 'Um.' }, { verse: 2, text: 'Dois.' }], 10);
        expect(mapa.get(1)).toBe('Um.');
        expect(mapa.get(2)).toBe('Dois.');
    });

    it('bloco "1-4 …" entra depois do versículo 4', () => {
        const mapa = encaixarComparacao([{ verse: 1, text: '1-4 Estejam bem uns com os outros.' }, { verse: 5, text: '5-6 Não vivam obcecados.' }], 25);
        expect(mapa.has(1)).toBe(false);
        expect(mapa.get(4)).toBe('1-4 Estejam bem uns com os outros.');
        expect(mapa.get(6)).toBe('5-6 Não vivam obcecados.');
    });

    it('aceita traço longo e espaços na faixa', () => {
        const mapa = encaixarComparacao([{ verse: 7, text: '7 – 9 Lembrem dos seus líderes.' }], 25);
        expect(mapa.get(9)).toBe('7 – 9 Lembrem dos seus líderes.');
    });

    it('faixa que passa do fim do capítulo fica no último versículo que existe', () => {
        const mapa = encaixarComparacao([{ verse: 22, text: '22-30 Amigos, levem a sério.' }], 25);
        expect(mapa.get(25)).toBe('22-30 Amigos, levem a sério.');
    });

    it('número no começo que não é faixa deste versículo não muda nada', () => {
        const mapa = encaixarComparacao([{ verse: 3, text: '1-2 Coríntios é citada aqui.' }, { verse: 8, text: '40 anos se passaram.' }], 25);
        expect(mapa.get(3)).toBe('1-2 Coríntios é citada aqui.');
        expect(mapa.get(8)).toBe('40 anos se passaram.');
    });
});
