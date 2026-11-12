import { describe, expect, it } from 'vitest';
import {
    PAUSA_DE_PARAGRAFO_MS, blocosDaExplicacao, dividirExplicacaoEmFalas, paragrafosFaladosDaExplicacao,
    ssmlDoBlocoDaExplicacao, textoFaladoDaExplicacao,
} from '@/lib/explicacao-audio';

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

    it('separa os parágrafos e trata o título como parágrafo próprio', () => {
        const texto = '### A âncora\nUm barco enfrenta vento.\nA âncora dá firmeza.\n\n- Primeiro ponto.\n- Segundo ponto.\r\n\r\nFim.';
        expect(paragrafosFaladosDaExplicacao(texto)).toEqual([
            'A âncora.', 'Um barco enfrenta vento. A âncora dá firmeza.', 'Primeiro ponto. Segundo ponto.', 'Fim.',
        ]);
    });

    it('nenhum bloco corta frase: cada um termina no fim de um parágrafo ou de uma frase', () => {
        const frase = (n: number) => `Esta é a frase número ${n}, escrita para ocupar espaço no parágrafo de teste.`;
        const paragrafos = [
            Array.from({ length: 9 }, (_, i) => frase(i)).join(' '),      // ~650 letras
            Array.from({ length: 9 }, (_, i) => frase(i + 10)).join(' '), // não cabe com o anterior
            Array.from({ length: 30 }, (_, i) => frase(i + 20)).join(' '), // maior que um bloco inteiro
            'Fecho curto.',
        ];
        const blocos = blocosDaExplicacao(paragrafos, 1200);
        expect(blocos.length).toBeGreaterThan(3);
        for (const bloco of blocos) {
            expect(bloco.reduce((s, t) => s + t.texto.length + 1, 0)).toBeLessThanOrEqual(1201);
            expect(bloco.every(t => /[.!?…]$/.test(t.texto))).toBe(true);
        }
        // nada se perde nem muda de ordem
        expect(blocos.flat().map(t => t.texto).join(' ')).toBe(paragrafos.join(' '));
        // o fim de parágrafo fica marcado exatamente uma vez por parágrafo
        expect(blocos.flat().filter(t => t.fimDeParagrafo)).toHaveLength(paragrafos.length);
        expect(blocos[0]).toEqual([{ texto: paragrafos[0], fimDeParagrafo: true }]);
    });

    it('frase sem pontuação maior que o bloco é cortada entre palavras, sem perder texto', () => {
        const longa = Array.from({ length: 400 }, (_, i) => `palavra${i}`).join(' ');
        const blocos = blocosDaExplicacao([longa], 1200);
        expect(blocos.length).toBeGreaterThan(2);
        expect(blocos.flat().map(t => t.texto).join(' ')).toBe(longa);
        expect(blocos.flat().filter(t => t.fimDeParagrafo)).toHaveLength(1);
    });

    it('a troca de parágrafo ganha pausa; o fim do áudio não', () => {
        const pausa = `<break time='${PAUSA_DE_PARAGRAFO_MS}ms'/>`;
        const [bloco] = blocosDaExplicacao(['Primeiro parágrafo.', 'Segundo & último.']);
        const meio = ssmlDoBlocoDaExplicacao(bloco, { voz: 'pt-BR-MacerioMultilingualNeural' });
        expect(meio).toContain(`Primeiro parágrafo.${pausa}Segundo &amp; último.${pausa}</prosody>`);
        expect(meio).toContain("<lang xml:lang='pt-BR'><prosody rate='-5%'>");
        const fim = ssmlDoBlocoDaExplicacao(bloco, { voz: 'pt-BR-FranciscaNeural', estilo: 'calm', ultimo: true });
        expect(fim).toContain(`Primeiro parágrafo.${pausa}Segundo &amp; último.</prosody></mstts:express-as>`);
        expect(fim).not.toContain('<lang');
    });

    it('frases do mesmo parágrafo em blocos vizinhos não recebem pausa de parágrafo', () => {
        const ssml = ssmlDoBlocoDaExplicacao(
            [{ texto: 'Uma frase.', fimDeParagrafo: false }, { texto: 'Outra frase.', fimDeParagrafo: false }],
            { voz: 'pt-BR-AntonioNeural' },
        );
        expect(ssml).toContain('Uma frase. Outra frase.</prosody>');
        expect(ssml).not.toContain('<break');
    });
});
