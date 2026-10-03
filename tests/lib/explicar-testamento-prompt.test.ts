import { describe, expect, it } from 'vitest';

import {
    CACHE_EXPLICAR_TESTAMENTO,
    TEMPO_ESCRITA_TESTAMENTO_MS,
    TEMPO_REVISAO_TESTAMENTO_MS,
    descreverContextoTestamento,
    limitesTestamento,
    montarPromptExplicarTestamento,
    montarPromptRevisaoTestamento,
} from '../../supabase/functions/execute/explicar-testamento';

// 03/10/2026: explicar o Antigo ou o Novo Testamento inteiro da leitura de hoje,
// no mesmo método aprovado do Explicar a parte (contexto, gema, para hoje).

const TEXTO = '### Salmos 92\n1 Como é bom dar graças a ti, ó SENHOR!\n\n### Salmos 93\n1 O SENHOR Deus é Rei.';
const CONTEXTO = {
    testamento: 'Antigo Testamento',
    leituraDoDia: 'Salmos 92-93, Efésios 3',
    livros: [{ livro: 'Salmos', categoria: 'Poético', autor: 'Davi e outros', resumo: 'O hinário de Israel.' }],
    capitulos: [{ referencia: 'Salmos 92', secoes: ['Um hino de louvor'] }],
};
const prompt = montarPromptExplicarTestamento({
    testamento: 'Antigo', referencia: 'Salmos 92-93', versiculos: TEXTO, capitulos: 2, quantidade: 2, contexto: CONTEXTO, maxPalavras: 420,
});
const revisao = montarPromptRevisaoTestamento({ referencia: 'Salmos 92-93', versiculos: TEXTO, rascunho: 'RASCUNHO' });

describe('instrução da explicação do testamento inteiro', () => {
    it('leva o texto, a referência e diz que a explicação substitui a leitura de hoje', () => {
        expect(prompt).toContain('ANTIGO TESTAMENTO');
        expect(prompt).toContain('Salmos 92-93 (2 capítulos, 2 versículos)');
        expect(prompt).toContain(TEXTO);
        expect(prompt).toMatch(/não tem tempo de ler/);
    });

    it('um bloco por capítulo, sem pular nenhum, e as seções do método aprovado', () => {
        expect(prompt).toMatch(/um bloco por capítulo/);
        expect(prompt).toMatch(/sem pular nenhum/);
        for (const secao of ['**Contexto:**', '**Para entender melhor:**', '**Ligação na Bíblia:**', '**Para hoje:**']) {
            expect(prompt).toContain(secao);
        }
        expect(prompt).toMatch(/gema/);
        expect(prompt).toMatch(/70% explicação/);
    });

    it('não inventa e não cita texto de fora', () => {
        expect(prompt).toMatch(/Não invente/);
        expect(prompt).toMatch(/Entre aspas, só palavras do texto acima/);
        expect(prompt).toMatch(/NÃO copie nem cite entre aspas/);
        expect(prompt).toContain('Até 420 palavras');
    });

    it('não deixa o método escapar para o leitor e mantém ligações curtas (teste real de 03/10)', () => {
        // Na primeira explicação real de Salmos 92-95 saiu "A \"gema\" está no Salmo 95"
        // e uma ligação de Hebreus 3:7-19 (13 versículos de texto abaixo dela).
        expect(prompt).toMatch(/não escreva a palavra "gema"/);
        expect(prompt).toMatch(/de 1 a 3 versículos/);
        expect(revisao).toMatch(/Remova menções ao próprio método ou ao pedido, como a palavra "gema"/);
        expect(revisao).toMatch(/referência \(de 1 a 3 versículos\)/);
    });

    it('usa o contexto do app', () => {
        expect(prompt).toContain('Livro: Salmos — categoria: Poético; autor: Davi e outros.');
        expect(prompt).toContain('Seções de Salmos 92: "Um hino de louvor".');
        expect(prompt).toContain('Leitura de hoje completa: Salmos 92-93, Efésios 3.');
        expect(descreverContextoTestamento(null)).toBe('- (sem dados extras do app)');
    });

    it('a revisão confere todos os capítulos e devolve o envelope final', () => {
        expect(revisao).toContain('todos os capítulos de Salmos 92-93');
        expect(revisao).toContain('NÃO reduza a explicação a uma paráfrase');
        expect(revisao).toContain('<FINAL>');
        expect(revisao).toContain(TEXTO);
        expect(revisao).toContain('RASCUNHO');
    });

    it('tamanho cresce com os capítulos, dentro de limites', () => {
        expect(limitesTestamento(1).maxPalavras).toBe(400);
        expect(limitesTestamento(4).maxPalavras).toBe(640);
        expect(limitesTestamento(20).maxPalavras).toBe(1100);
        expect(limitesTestamento(4).maxTokens).toBe(3200);
        expect(limitesTestamento(20).maxTokens).toBe(5500);
    });

    it('guarda num cache próprio e dá mais tempo que uma parte', () => {
        expect(CACHE_EXPLICAR_TESTAMENTO).toBe('explicar_testamento_v2');
        expect(TEMPO_ESCRITA_TESTAMENTO_MS).toBeGreaterThan(40_000);
        expect(TEMPO_REVISAO_TESTAMENTO_MS).toBeGreaterThan(40_000);
    });
});
