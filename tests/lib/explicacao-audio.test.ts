import { describe, expect, it } from 'vitest';
import { dividirExplicacaoEmFalas, textoFaladoDaExplicacao } from '@/lib/explicacao-audio';

describe('áudio da explicação', () => {
    it('lê os títulos e parágrafos, sem anunciar os caracteres de Markdown', () => {
        const texto = '### Explicação de 1 Timóteo 6\n\n**Em uma frase:** Deus nos ensina.\n\n[Leia a passagem](https://exemplo.com).';
        expect(textoFaladoDaExplicacao(texto)).toBe('Explicação de 1 Timóteo 6. Em uma frase: Deus nos ensina. Leia a passagem.');
    });

    it('quebra textos longos sem perder palavras nem mudar a ordem', () => {
        const texto = Array.from({ length: 150 }, (_, i) => `Palavra${i}`).join(' ');
        const partes = dividirExplicacaoEmFalas(texto);
        expect(partes.length).toBeGreaterThan(4);
        expect(partes.every(p => p.length <= 190)).toBe(true);
        expect(partes.join(' ')).toBe(texto);
    });

    it('texto vazio não gera fala', () => {
        expect(dividirExplicacaoEmFalas(' \n ')).toEqual([]);
    });
});
