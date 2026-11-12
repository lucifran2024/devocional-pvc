import { describe, expect, it } from 'vitest';
import { estruturarPalavra, separarTitulo } from '@/lib/palavra-apresentacao';

// Início, meio e fim da Palavra da Manhã (12/11/2026, 3º ajuste: "ficou sem
// quebra de linha, tudo misturado"). O gerador pede título / corpo /
// «versículo» com a referência embaixo / fechamento, mas às vezes devolve o
// versículo colado no corpo. Só a TELA separa; o texto gravado e o copiado não
// mudam. Casos tirados das mensagens reais de palavra_manha_diaria.

const corpo = (mensagem: string) => separarTitulo(mensagem).corpo;

describe('estruturarPalavra', () => {
    it('12/11: versículo entre aspas colado no começo do corpo vira bloco próprio', () => {
        const msg = 'A LUZ PARA O PRÓXIMO PASSO\n\n"Lâmpada para os meus pés é a tua palavra e luz, para o meu caminho." (Salmos 119:105). Deus não nos promete clareza sobre cada detalhe do futuro distante, mas garante direção segura para o próximo passo. Quando a ansiedade tentar fazer você antecipar o amanhã, volte seus olhos para a Palavra. O caminho se abre à medida que você confia e obedece.\n\nDê o passo de hoje com fé.';
        expect(estruturarPalavra(corpo(msg))).toEqual([
            { tipo: 'versiculo', texto: 'Lâmpada para os meus pés é a tua palavra e luz, para o meu caminho.', referencia: 'Salmos 119:105' },
            { tipo: 'paragrafo', texto: 'Deus não nos promete clareza sobre cada detalhe do futuro distante, mas garante direção segura para o próximo passo. Quando a ansiedade tentar fazer você antecipar o amanhã, volte seus olhos para a Palavra. O caminho se abre à medida que você confia e obedece.' },
            { tipo: 'fechamento', texto: 'Dê o passo de hoje com fé.' },
        ]);
    });

    it('11/11: «versículo» com a referência na linha de baixo, no meio do texto', () => {
        const msg = 'MENOS BARULHO, MAIS ESSÊNCIA\n\nÀs vezes complicamos a fé buscando grandes palcos, quando Deus procura apenas fidelidade nas pequenas coisas. Ele não se impressiona com aparências, mas valoriza o coração sincero que perdoa em silêncio, pratica o bem e escolhe a verdade no secreto.\n\n«Ele te declarou, ó homem, o que é bom e o que o Senhor pede de ti: que pratiques a justiça, ames a misericórdia e andes humildemente com o teu Deus.»\nMiqueias 6:8\n\nCaminhe com simplicidade e retidão.';
        expect(estruturarPalavra(corpo(msg))).toEqual([
            { tipo: 'paragrafo', texto: 'Às vezes complicamos a fé buscando grandes palcos, quando Deus procura apenas fidelidade nas pequenas coisas. Ele não se impressiona com aparências, mas valoriza o coração sincero que perdoa em silêncio, pratica o bem e escolhe a verdade no secreto.' },
            { tipo: 'versiculo', texto: 'Ele te declarou, ó homem, o que é bom e o que o Senhor pede de ti: que pratiques a justiça, ames a misericórdia e andes humildemente com o teu Deus.', referencia: 'Miqueias 6:8' },
            { tipo: 'fechamento', texto: 'Caminhe com simplicidade e retidão.' },
        ]);
    });

    it('10/11: versículo com travessão e referência no mesmo parágrafo', () => {
        const msg = 'A FORÇA QUE VEM DO ALTO\n\n"Ele fortalece o cansado e multiplica as forças ao que não tem nenhum vigor." — Isaías 40:29\n\nExistem momentos em que o cansaço não é apenas do corpo, mas da alma.\n\nDescanse na fidelidade do Senhor.';
        expect(estruturarPalavra(corpo(msg))).toEqual([
            { tipo: 'versiculo', texto: 'Ele fortalece o cansado e multiplica as forças ao que não tem nenhum vigor.', referencia: 'Isaías 40:29' },
            { tipo: 'paragrafo', texto: 'Existem momentos em que o cansaço não é apenas do corpo, mas da alma.' },
            { tipo: 'fechamento', texto: 'Descanse na fidelidade do Senhor.' },
        ]);
    });

    it('09/11 (oração): referência com número de livro e fechamento com Amém', () => {
        const msg = 'FORTALECE MINHAS MÃOS\n\nPai, coloco diante de Ti cada plano e desafio dos próximos dias.\n\n«Confirma sobre nós as obras das nossas mãos.»\nSalmos 90:17\n\nAmém. Tenha um dia abençoado!';
        const blocos = estruturarPalavra(corpo(msg));
        expect(blocos[1]).toEqual({ tipo: 'versiculo', texto: 'Confirma sobre nós as obras das nossas mãos.', referencia: 'Salmos 90:17' });
        expect(blocos[2]).toEqual({ tipo: 'fechamento', texto: 'Amém. Tenha um dia abençoado!' });
        expect(estruturarPalavra('«Filhinhos, não amemos de palavra.»\n1 João 3:18\n\nFim.')[0])
            .toEqual({ tipo: 'versiculo', texto: 'Filhinhos, não amemos de palavra.', referencia: '1 João 3:18' });
    });

    it('citação em markdown (>) com versão na referência', () => {
        expect(estruturarPalavra('Texto.\n\n> "O SENHOR é o meu pastor: nada me faltará." (Salmo 23:1, NTLH)\n\nFim.')[1])
            .toEqual({ tipo: 'versiculo', texto: 'O SENHOR é o meu pastor: nada me faltará.', referencia: 'Salmo 23:1, NTLH' });
    });

    // Outros formatos reais (agosto a outubro de 2026)
    it('referência só com espaço, com emoji antes, ou antes da citação', () => {
        expect(estruturarPalavra('Texto.\n\n"Sobre tudo o que se deve guardar, guarda o teu coração, porque dele procedem as fontes da vida." Provérbios 4:23\n\nFim.')[1])
            .toEqual({ tipo: 'versiculo', texto: 'Sobre tudo o que se deve guardar, guarda o teu coração, porque dele procedem as fontes da vida.', referencia: 'Provérbios 4:23' });
        expect(estruturarPalavra('Texto.\n\n📖 "Ora, àquele que é poderoso para fazer tudo muito mais abundantemente..." — Efésios 3:20\n\nFim.')[1])
            .toEqual({ tipo: 'versiculo', texto: 'Ora, àquele que é poderoso para fazer tudo muito mais abundantemente...', referencia: 'Efésios 3:20' });
        expect(estruturarPalavra('Texto.\n\nHebreus 6:19 - "a qual temos como âncora da alma, segura e firme."\n\nFim.')[1])
            .toEqual({ tipo: 'versiculo', texto: 'a qual temos como âncora da alma, segura e firme.', referencia: 'Hebreus 6:19' });
        expect(estruturarPalavra('Texto.\n\n«Tu és santo, tu que habitas entre os louvores de Israel.» Salmos 22:3\n\nFim.')[1])
            .toEqual({ tipo: 'versiculo', texto: 'Tu és santo, tu que habitas entre os louvores de Israel.', referencia: 'Salmos 22:3' });
        expect(estruturarPalavra('Texto.\n\n« Servi ao Senhor com alegria. »\nSalmos 100:2\n\nFim.')[1])
            .toEqual({ tipo: 'versiculo', texto: 'Servi ao Senhor com alegria.', referencia: 'Salmos 100:2' });
    });

    it('mensagem cortada no meio do versículo não some nem vira versículo', () => {
        expect(estruturarPalavra('Siga, mesmo sem enxergar.\n\n«A tua palavra é lâmpada que il')).toEqual([
            { tipo: 'paragrafo', texto: 'Siga, mesmo sem enxergar.' },
            { tipo: 'fechamento', texto: '«A tua palavra é lâmpada que il' },
        ]);
    });

    it('aspas no meio da frase ou sem referência não viram versículo', () => {
        expect(estruturarPalavra('Jesus disse "vinde a mim" e nós fomos.\n\nFim.')[0]).toEqual({ tipo: 'paragrafo', texto: 'Jesus disse "vinde a mim" e nós fomos.' });
        expect(estruturarPalavra('"Calma", ele disse. E seguiu em frente.\n\nFim.')[0]).toEqual({ tipo: 'paragrafo', texto: '"Calma", ele disse. E seguiu em frente.' });
    });

    it('não perde nenhuma palavra do texto', () => {
        const textos = [
            '"Lâmpada para os meus pés é a tua palavra." (Salmos 119:105). Deus guia.\n\nVá com fé.',
            'Um.\n\n«Dois.»\nSalmos 1:1\n\nTrês.',
        ];
        const palavras = (s: string) => s.replace(/[«»"“”().,:\-—\d\n]/g, ' ').split(/\s+/).filter(Boolean);
        for (const t of textos) {
            const juntado = estruturarPalavra(t).map((b) => (b.tipo === 'versiculo' ? `${b.texto} ${b.referencia ?? ''}` : b.texto)).join(' ');
            expect(palavras(juntado)).toEqual(palavras(t));
        }
    });

    it('fechamento só quando há mais de um bloco e a última frase é curta', () => {
        expect(estruturarPalavra('Texto único.')).toEqual([{ tipo: 'paragrafo', texto: 'Texto único.' }]);
        const longo = 'Esta última parte é longa demais para ser só uma frase de fechamento, porque continua explicando a ideia.';
        expect(estruturarPalavra(`Começo.\n\n${longo}`)[1]).toEqual({ tipo: 'paragrafo', texto: longo });
    });

    it('quebra de linha simples dentro do parágrafo é mantida', () => {
        expect(estruturarPalavra('Linha um\nLinha dois\n\nFim.')[0]).toEqual({ tipo: 'paragrafo', texto: 'Linha um\nLinha dois' });
    });
});

describe('dividirPassagens (cartão Hoje)', () => {
    it('uma passagem por linha, só antes de um livro novo', async () => {
        const { dividirPassagens } = await import('@/lib/palavra-apresentacao');
        expect(dividirPassagens('Isaías 51-54, Hebreus 7')).toEqual(['Isaías 51-54', 'Hebreus 7']);
        expect(dividirPassagens('2 Crônicas 33-36, 1 Coríntios 15')).toEqual(['2 Crônicas 33-36', '1 Coríntios 15']);
        expect(dividirPassagens('Salmos 84, 86')).toEqual(['Salmos 84, 86']);
        expect(dividirPassagens('Salmos 84-88')).toEqual(['Salmos 84-88']);
        expect(dividirPassagens(undefined)).toEqual([]);
    });
});
