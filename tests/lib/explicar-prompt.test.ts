import { describe, expect, it } from 'vitest';

import {
    CACHE_EXPLICAR,
    CACHE_EXPLICAR_TESTAMENTO,
    GUIA_TIPOS_DE_TEXTO,
    MODELOS_EXPLICAR_TUNEL,
    MODELOS_REVISAO_TUNEL,
    TEMPO_ESCRITA_TESTAMENTO_MS,
    TEMPO_REVISAO_TESTAMENTO_MS,
    conferirCitacoes,
    descreverContexto,
    descreverContextoTestamento,
    limitesExplicacao,
    limitesTestamento,
    montarPromptExplicar,
    montarPromptExplicarTestamento,
    montarPromptRevisaoExplicar,
    montarPromptRevisaoTestamento,
} from '../../supabase/functions/execute/explicar';

// 03/10/2026: Lucifran achou a explicação "muito engessada" (os mesmos títulos
// todo dia: Contexto / Versículos / Para entender melhor / Para hoje) e pediu
// para não reaproveitar nada do que tinha antes. O método novo segue o tipo de
// texto, com títulos que dizem o conteúdo, "Em uma frase" e "Para guardar".

const VERSOS = '1 Como é bom dar graças a ti, ó SENHOR!\n2 É bom anunciar de manhã o teu amor.';
const parte = montarPromptExplicar({
    referencia: 'Salmos 92:1-2', parte: 1, versiculos: VERSOS, quantidade: 2, maxPalavras: 280,
    contexto: { livro: 'Salmos', categoria: 'Poético', autor: 'Davi e outros', secoes: [{ verso: 1, titulo: 'Um hino de louvor' }], posicao: 'parte 1 de 5 da leitura de hoje (Salmos 92-95, Efésios 3)' },
});
const TEXTO = '### Salmos 92\n1 Como é bom dar graças a ti, ó SENHOR!\n\n### Salmos 93\n1 O SENHOR Deus é Rei.';
const testamento = montarPromptExplicarTestamento({
    testamento: 'Antigo', referencia: 'Salmos 92-93', versiculos: TEXTO, capitulos: 2, quantidade: 2, maxPalavras: 420,
    contexto: { testamento: 'Antigo Testamento', leituraDoDia: 'Salmos 92-93, Efésios 3', livros: [{ livro: 'Salmos', categoria: 'Poético' }], capitulos: [{ referencia: 'Salmos 92', secoes: ['Um hino de louvor'] }] },
});
const revisaoParte = montarPromptRevisaoExplicar({ referencia: 'Salmos 92:1-2', versiculos: VERSOS, rascunho: 'RASCUNHO' });
const revisaoTestamento = montarPromptRevisaoTestamento({ referencia: 'Salmos 92-93', versiculos: TEXTO, rascunho: 'RASCUNHO' });

describe('método novo de explicar', () => {
    it('não volta ao formato fixo antigo', () => {
        for (const prompt of [parte, testamento]) {
            for (const antigo of ['**Contexto:**', '**Para entender melhor:**', '**Para hoje:**', 'Versículos X-Y', '70%', 'mentor bíblico']) {
                expect(prompt).not.toContain(antigo);
            }
        }
    });

    it('abre com "Em uma frase" e fecha com "Para guardar" (frase e, quando ajudar, pergunta)', () => {
        for (const prompt of [parte, testamento]) {
            expect(prompt).toContain('**Em uma frase:**');
            expect(prompt).toContain('**Para guardar:** uma frase que resume o que aprender e, quando ajudar, uma pergunta curta para pensar hoje');
        }
    });

    it('explica conforme o tipo de texto, com títulos que dizem o conteúdo', () => {
        for (const tipo of ['- História:', '- Salmo ou poema:', '- Lei e instruções:', '- Lista, genealogia, censo ou divisão de terras:', '- Profecia:', '- Evangelho:', '- Carta:', '- Sabedoria']) {
            expect(GUIA_TIPOS_DE_TEXTO).toContain(tipo);
        }
        expect(parte).toContain(GUIA_TIPOS_DE_TEXTO);
        expect(testamento).toContain(GUIA_TIPOS_DE_TEXTO);
        expect(parte).toMatch(/títulos curtos em negrito que digam o conteúdo/);
        expect(parte).toMatch(/Nada de títulos genéricos/);
        expect(GUIA_TIPOS_DE_TEXTO).toMatch(/não reconte nome por nome/);
    });

    it('fiel ao texto, sem citar de memória, sem falar do método', () => {
        for (const prompt of [parte, testamento]) {
            expect(prompt).toMatch(/não invente fatos/);
            expect(prompt).toMatch(/Entre aspas, só palavras do texto bíblico acima/);
            expect(prompt).toMatch(/não use palavras como "gema", "seção" ou "bloco"/);
            expect(prompt).toMatch(/de 1 a 3 versículos/);
            expect(prompt).toMatch(/Não vire sermão nem oração/);
        }
    });

    it('a parte cobre do primeiro ao último versículo e usa o que o app sabe', () => {
        expect(parte).toContain('## O TRECHO: Salmos 92:1-2 (2 versículos)');
        expect(parte).toContain(VERSOS);
        expect(parte).toContain('do primeiro ao último versículo');
        expect(parte).toContain('- Livro: Salmos — tipo de livro: Poético; autor: Davi e outros.');
        expect(parte).toContain('- Na leitura do dia: parte 1 de 5 da leitura de hoje (Salmos 92-95, Efésios 3).');
        expect(parte).toContain('Até 280 palavras; trecho curto pede explicação curta');
        expect(descreverContexto(null)).toBe('- (sem dados extras do app)');
    });

    it('o testamento é a leitura do dia: um título por capítulo, sem pular nenhum', () => {
        expect(testamento).toContain('ANTIGO TESTAMENTO');
        expect(testamento).toContain('## A LEITURA: Salmos 92-93 (2 capítulos, 2 versículos)');
        expect(testamento).toMatch(/esta explicação vai ser a leitura dela/);
        expect(testamento).toMatch(/um título por capítulo, em ordem, sem pular nenhum/);
        expect(testamento).toContain('Seções de Salmos 92: "Um hino de louvor".');
        expect(descreverContextoTestamento(null)).toBe('- (sem dados extras do app)');
    });

    it('a revisão confere cobertura, fatos, citações e forma, e devolve o envelope', () => {
        expect(revisaoParte).toContain('o trecho Salmos 92:1-2 inteiro, do primeiro ao último versículo');
        expect(revisaoTestamento).toContain('todos os capítulos de Salmos 92-93, em ordem, cada um com o seu título');
        for (const revisao of [revisaoParte, revisaoTestamento]) {
            expect(revisao).toContain('mantenha **Em uma frase:** no começo e **Para guardar:** no fim');
            expect(revisao).toContain('Não reduza a explicação a uma paráfrase');
            expect(revisao).toContain('<FINAL>');
            expect(revisao).toContain('RASCUNHO');
        }
    });

    it('tamanhos: parte curta pede explicação curta; testamento cresce com os capítulos', () => {
        expect(limitesExplicacao(2).maxPalavras).toBe(260);
        expect(limitesExplicacao(20).maxPalavras).toBe(420);
        expect(limitesExplicacao(60).maxPalavras).toBe(520);
        expect(limitesTestamento(1).maxPalavras).toBe(400);
        expect(limitesTestamento(4).maxPalavras).toBe(640);
        expect(limitesTestamento(20).maxPalavras).toBe(1100);
    });

    it('caches novos (nada da versão antiga é servido) e mesmas rotas de modelo', () => {
        expect(CACHE_EXPLICAR).toBe('explicar_parte_v3');
        expect(CACHE_EXPLICAR_TESTAMENTO).toBe('explicar_testamento_v3');
        expect(MODELOS_EXPLICAR_TUNEL).toEqual(['ag/gemini-3.8-flash-high', 'app-pvc']);
        expect(MODELOS_REVISAO_TUNEL).toEqual(['app-pvc']);
        expect(TEMPO_ESCRITA_TESTAMENTO_MS).toBeGreaterThan(40_000);
        expect(TEMPO_REVISAO_TESTAMENTO_MS).toBeGreaterThan(40_000);
    });
});

describe('conferência das citações (teste real de 03/10/2026)', () => {
    // Trechos reais: no Salmo 92 a IA pôs "plantados na casa do SENHOR" entre
    // aspas (não é o texto da NTLH) e em Números 1 citou 1 Pedro 2:9 de memória.
    const SALMO = '**12.** Os justos florescerão como as palmeiras;\n**13.** estão plantados no Templo do SENHOR e na velhice ainda produzem frutos.';

    it('citação que está no texto lido continua entre aspas', () => {
        const r = conferirCitacoes('Eles "na velhice ainda produzem frutos" (v. 13).', SALMO);
        expect(r).toBe('Eles "na velhice ainda produzem frutos" (v. 13).');
    });

    it('trecho entre aspas que não é o texto lido perde as aspas', () => {
        const r = conferirCitacoes('Os justos são “plantados na casa do SENHOR” (v. 13).', SALMO);
        expect(r).toBe('Os justos são plantados na casa do SENHOR (v. 13).');
    });

    it('palavra solta entre aspas é destaque e fica', () => {
        expect(conferirCitacoes('O "tolo" não entende.', SALMO)).toBe('O "tolo" não entende.');
    });

    it('na Ligação na Bíblia sai o texto citado e o negrito da referência', () => {
        const r = conferirCitacoes(
            '**Ligação na Bíblia:**\n**1 Pedro 2:9** — "Mas vocês são a raça escolhida, o povo santo." Assim como os levitas, todos servem.\n\n**Para guardar:** Deus organiza o seu povo "como as palmeiras" e ninguém fica de fora.',
            SALMO,
        );
        expect(r).toContain('1 Pedro 2:9 — Assim como os levitas, todos servem.');
        expect(r).not.toContain('raça escolhida');
        expect(r).not.toContain('**1 Pedro');
        // depois da Ligação, a regra normal volta a valer
        expect(r).toContain('**Para guardar:** Deus organiza o seu povo "como as palmeiras"');
    });

    it('na Ligação, frase sobre o texto lido fica inteira (só perde as aspas se não for a NTLH)', () => {
        const r = conferirCitacoes(
            '**Ligação na Bíblia:** João 15:4-5. Jesus ensina a permanecer nele, assim como os justos são "plantados na casa do SENHOR".\n**Hebreus 3:7-8** — O autor usa este salmo.',
            SALMO,
        );
        expect(r).toContain('assim como os justos são plantados na casa do SENHOR.');
        expect(r).toContain('Hebreus 3:7-8 — O autor usa este salmo.');
    });

    it('a instrução pede a referência sem negrito e sem o texto da passagem', () => {
        expect(parte).toMatch(/em texto normal, sem negrito/);
        expect(parte).toMatch(/Não escreva o texto dessa passagem/);
        expect(parte).toMatch(/e, quando ajudar, uma pergunta curta/);
    });
});
