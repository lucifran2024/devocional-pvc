import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import {
    PADRAO_LINK_YOUTUBE,
    contarPalavras,
    descreverOrigem,
    descreverPalavras,
    etapaTranscricao,
    extrairIdYoutube,
    filtrarTranscricoes,
    formatarDataTranscricao,
    formatarDuracao,
    linkDoVideo,
    mensagemErroTranscricao,
    montarTextoCompartilhado,
    nomeArquivoTxt,
    paragrafosParaLeitura,
    resumoTranscricao,
    tempoLeitura,
    textoParaCopiar,
} from '../../src/lib/transcricao-apresentacao';

const semEspacos = (s: string) => s.replace(/\s+/g, ' ').trim();

describe('link do vídeo', () => {
    it('reconhece os mesmos links que a rota de transcrição aceita', () => {
        const id = 'dQw4w9WgXcQ';
        for (const link of [
            `https://www.youtube.com/watch?v=${id}&t=30`,
            `https://youtu.be/${id}?si=abc`,
            `https://m.youtube.com/watch?v=${id}`,
            `https://youtube.com/shorts/${id}`,
            `https://www.youtube.com/embed/${id}`,
            id,
        ]) {
            expect(extrairIdYoutube(link)).toBe(id);
        }
        expect(extrairIdYoutube('https://vimeo.com/123')).toBeNull();
        expect(extrairIdYoutube('')).toBeNull();
    });

    it('usa exatamente o padrão da rota /api/transcrever-youtube', () => {
        const rota = readFileSync(resolve(__dirname, '../../src/app/api/transcrever-youtube/route.ts'), 'utf8');
        expect(rota).toContain(`/${PADRAO_LINK_YOUTUBE.source}/`);
    });

    it('gera link limpo para abrir e compartilhar', () => {
        expect(linkDoVideo('https://youtu.be/dQw4w9WgXcQ?si=abc')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
        expect(linkDoVideo('https://exemplo.com/video')).toBe('https://exemplo.com/video');
        expect(linkDoVideo(null)).toBeNull();
    });
});

describe('origem, tamanho e data', () => {
    it('descreve a origem sem repetir "legenda" e em português', () => {
        expect(descreverOrigem('legenda do YouTube (pt)')).toBe('Legenda do YouTube · português');
        expect(descreverOrigem('legenda do YouTube (pt-BR)')).toBe('Legenda do YouTube · português');
        expect(descreverOrigem('legenda do YouTube (en-US (auto-generated))')).toBe('Legenda do YouTube · inglês, automática');
        expect(descreverOrigem('legenda do YouTube (auto)')).toBe('Legenda do YouTube');
        expect(descreverOrigem('transcrição (Gemini)')).toBe('Transcrição por IA');
        expect(descreverOrigem('')).toBeNull();
    });

    it('conta palavras e estima o tempo de leitura', () => {
        expect(contarPalavras('  Deus é   amor.\n\nAmém ')).toBe(4);
        expect(descreverPalavras(17346)).toBe('17.346 palavras');
        expect(descreverPalavras(1)).toBe('1 palavra');
        expect(tempoLeitura(0)).toBe('1 min de leitura');
        expect(tempoLeitura(1800)).toBe('10 min de leitura');
        expect(tempoLeitura(17346)).toBe('1h36 de leitura');
    });

    it('mostra hoje, ontem ou a data curta', () => {
        const agora = new Date(2026, 8, 26, 12, 0);
        expect(formatarDataTranscricao(new Date(2026, 8, 26, 7, 5).toISOString(), agora)).toBe('hoje');
        expect(formatarDataTranscricao(new Date(2026, 8, 25, 23, 50).toISOString(), agora)).toBe('ontem');
        expect(formatarDataTranscricao(new Date(2026, 8, 12, 10).toISOString(), agora)).toBe('12 de set.');
        expect(formatarDataTranscricao(new Date(2025, 11, 1, 10).toISOString(), agora)).toContain('2025');
        expect(formatarDataTranscricao('data ruim', agora)).toBe('');
    });
});

describe('parágrafos para leitura', () => {
    it('mantém parágrafos que já estão bons', () => {
        const texto = 'Primeiro parágrafo. Termina aqui.\n\nSegundo parágrafo!';
        expect(paragrafosParaLeitura(texto)).toEqual(['Primeiro parágrafo. Termina aqui.', 'Segundo parágrafo!']);
        expect(textoParaCopiar(texto)).toBe(texto);
    });

    it('junta os blocos de 30 s da legenda que cortam a frase no meio', () => {
        const frase = 'e o Senhor falou ao seu povo com amor e paciência durante toda a caminhada no deserto ';
        const bloco1 = frase.repeat(3).trim();
        const bloco2 = `${frase.repeat(2)}até chegar à terra prometida. Glória a Deus`.trim();
        const bloco3 = 'por tudo o que ele fez.';
        const texto = [bloco1, bloco2, bloco3].join('\n\n');
        const paragrafos = paragrafosParaLeitura(texto);
        expect(paragrafos).toHaveLength(1);
        expect(paragrafos[0].endsWith('por tudo o que ele fez.')).toBe(true);
        expect(semEspacos(textoParaCopiar(texto))).toBe(semEspacos(texto));
    });

    it('divide bloco comprido no fim de frase, sem quebrar "João 3.16"', () => {
        const frases = Array.from({ length: 40 }, (_, i) => `Esta é a frase número ${i + 1} e ela lembra João 3.16 com carinho.`);
        const texto = frases.join(' ');
        const paragrafos = paragrafosParaLeitura(texto);
        expect(paragrafos.length).toBeGreaterThan(1);
        for (const p of paragrafos) {
            expect(p.endsWith('.')).toBe(true);
            expect(p.startsWith('16')).toBe(false);
            expect(p.length).toBeLessThanOrEqual(500 + 80);
        }
        expect(semEspacos(paragrafos.join(' '))).toBe(semEspacos(texto));
    });

    it('legenda automática sem pontuação vira parágrafos de tamanho de leitura', () => {
        const texto = Array.from({ length: 12 }, () => 'palavra '.repeat(130).trim()).join('\n\n');
        const paragrafos = paragrafosParaLeitura(texto);
        expect(paragrafos.length).toBeGreaterThan(5);
        for (const p of paragrafos) expect(p.length).toBeLessThanOrEqual(900);
        expect(contarPalavras(textoParaCopiar(texto))).toBe(contarPalavras(texto));
    });

    it('linhas soltas de legenda viram texto corrido', () => {
        const linhas = Array.from({ length: 30 }, (_, i) => `linha curta ${i + 1}`);
        const paragrafos = paragrafosParaLeitura(linhas.join('\n\n'));
        expect(paragrafos.length).toBeLessThan(5);
        expect(semEspacos(paragrafos.join(' '))).toBe(linhas.join(' '));
    });
});

describe('copiar, compartilhar e arquivo', () => {
    it('compartilha título, texto e link limpo do vídeo', () => {
        expect(montarTextoCompartilhado({
            titulo: 'Culto de domingo',
            texto: 'Deus é fiel.',
            fonteUrl: 'https://youtu.be/dQw4w9WgXcQ?si=x',
        })).toBe('Culto de domingo\n\nDeus é fiel.\n\nVídeo: https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });

    it('nome do arquivo sem caracteres proibidos', () => {
        expect(nomeArquivoTxt('Culto: "Fé" / 2026?')).toBe('Culto Fé 2026.txt');
        expect(nomeArquivoTxt('')).toBe('Transcrição.txt');
    });

    it('resumo corta em palavra inteira', () => {
        const resumo = resumoTranscricao('um dois três quatro cinco seis sete oito', 20);
        expect(resumo).toBe('um dois três quatro…');
        expect(resumoTranscricao('curto', 20)).toBe('curto');
    });
});

describe('busca e mensagens', () => {
    const lista = [
        { titulo: 'Fé que move montanhas', texto: 'texto um' },
        { titulo: 'Culto de domingo', texto: 'falamos da graça de Deus' },
        { titulo: null, texto: 'sem título' },
    ];

    it('busca por título ou palavra, sem acento nem maiúscula', () => {
        expect(filtrarTranscricoes(lista, 'fe')).toEqual([lista[0]]);
        expect(filtrarTranscricoes(lista, 'GRACA')).toEqual([lista[1]]);
        expect(filtrarTranscricoes(lista, '  ')).toBe(lista);
    });

    it('mantém a mensagem da rota e traduz só códigos sem mensagem', () => {
        expect(mensagemErroTranscricao({ ok: false, message: 'Vídeo privado.' } as never)).toBe('Vídeo privado.');
        expect(mensagemErroTranscricao({ error: 'link_invalido' })).toContain('não é de um vídeo do YouTube');
        expect(mensagemErroTranscricao({})).toBe('Não consegui transcrever este vídeo. Verifique o link ou tente outro.');
    });

    it('mostra o andamento enquanto transcreve', () => {
        expect(etapaTranscricao(2)).toBe('Buscando a legenda do vídeo…');
        expect(etapaTranscricao(10)).toBe('Organizando o texto…');
        expect(etapaTranscricao(60)).toContain('alguns minutos');
        expect(formatarDuracao(75)).toBe('1:15');
    });
});
