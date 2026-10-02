import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  CACHE_EXPLICAR,
  MODELOS_EXPLICAR_TUNEL,
  MODELOS_REVISAO_TUNEL,
  descreverContexto,
  limitesExplicacao,
  montarPromptExplicar,
  montarPromptRevisaoExplicar,
} from '../../supabase/functions/execute/explicar-parte';

// 02/10/2026: Lucifran aprovou explicar com contexto ("para eu adquirir
// conhecimento da passagem"), no método da task explicacao_passagem:
// contexto certo, todos os versículos, uma gema, ligação e aplicação curta.
// A versão de 14/08 proibia contexto e a revisão apagava tudo que não
// estivesse escrito no bloco — a explicação virava paráfrase.

const VERSOS = '**1.** Como eu amo o teu Templo, ó SENHOR Todo-Poderoso!\n**2.** Como eu gostaria de estar ali!';
const CONTEXTO = {
  livro: 'Salmos', categoria: 'Poético', autor: 'Davi e outros', epoca: 'vários séculos', tema: 'Adoração e oração',
  resumo: 'O hinário de Israel.', secoes: [{ verso: 1, titulo: 'O Desejo pela Casa de Deus' }], posicao: 'parte 1 de 5 da leitura de hoje (Salmos 84-88)',
};
const prompt = montarPromptExplicar({ referencia: 'Salmos 84:1-2', parte: 1, versiculos: VERSOS, quantidade: 2, contexto: CONTEXTO, maxPalavras: 320 });
const revisao = montarPromptRevisaoExplicar({ referencia: 'Salmos 84:1-2', versiculos: VERSOS, rascunho: 'RASCUNHO' });

describe('instrução da explicação da parte lida', () => {
  it('explica a parte exata, todos os versículos, com o texto e a faixa', () => {
    expect(prompt).toContain('## A PARTE LIDA: Salmos 84:1-2 (parte 1, 2 versículos)');
    expect(prompt).toContain(VERSOS);
    expect(prompt).toContain('cobrindo TODOS os versículos');
    expect(prompt).toContain('Não traga acontecimentos de outras partes como se estivessem nesta');
  });

  it('segue o método aprovado: contexto, movimentos, gema, ligação e para hoje (70/30)', () => {
    for (const secao of ['**Contexto:**', '**Versículos X-Y · título curto:**', '**Para entender melhor:**', '**Ligação na Bíblia:**', '**Para hoje:**']) {
      expect(prompt).toContain(secao);
    }
    expect(prompt).toContain('Escolha uma "gema"');
    expect(prompt).toContain('cerca de 70% explicação e contexto, 30% aplicação');
  });

  it('permite contexto certo e proíbe inventar', () => {
    expect(prompt).toContain('Não invente dado exegético, histórico, nomes, datas ou costumes. Se não tiver certeza, omita');
    expect(prompt).not.toContain('Não invente dados históricos, culturais, autoria');
    expect(prompt).not.toContain('Não faça resumo geral do livro');
    expect(prompt).not.toContain('Toda afirmação explicativa deve apontar para palavras');
  });

  it('a IA não cita versículo de memória: só a referência na ligação', () => {
    expect(prompt).toContain('NÃO copie nem cite entre aspas o texto de nenhum versículo; o app mostra o texto da NTLH');
  });

  it('usa o contexto que o app já tem', () => {
    expect(prompt).toContain('- Livro: Salmos — categoria: Poético; autor: Davi e outros; época: vários séculos; tema: Adoração e oração.');
    expect(prompt).toContain('- Seções do capítulo: v.1 "O Desejo pela Casa de Deus".');
    expect(prompt).toContain('- Posição: parte 1 de 5 da leitura de hoje (Salmos 84-88).');
  });

  it('contexto ausente ou malformado não quebra a instrução', () => {
    expect(descreverContexto(null)).toBe('- (sem dados extras do app)');
    expect(descreverContexto({ secoes: [{ verso: Number.NaN, titulo: 'x' }] })).toBe('- (sem dados extras do app)');
    const longo = descreverContexto({ resumo: 'a'.repeat(5000), secoes: Array.from({ length: 30 }, (_, i) => ({ verso: i + 1, titulo: `S${i}` })) });
    expect(longo.length).toBeLessThan(1200);
    expect((longo.match(/v\.\d+/g) || []).length).toBe(12);
  });

  it('dimensiona a profundidade pela quantidade de versículos', () => {
    expect(limitesExplicacao(12)).toEqual({ maxPalavras: 390, maxTokens: 2000 });
    expect(limitesExplicacao(1).maxPalavras).toBe(320);
    expect(limitesExplicacao(60).maxPalavras).toBe(650);
    expect(prompt).toContain('Até 320 palavras.');
  });
});

describe('revisão de precisão', () => {
  it('corta o incerto e o errado, sem apagar o contexto certo', () => {
    expect(revisao).toContain('# REVISÃO DE PRECISÃO');
    expect(revisao).toContain('NÃO reduza a explicação a uma paráfrase dos versículos');
    expect(revisao).toContain('Remova qualquer texto de versículo copiado ou citado entre aspas que não seja da parte lida');
    expect(revisao).not.toContain('Não defina expressões bíblicas usando teologia ou contexto externo');
    expect(revisao).not.toContain('Não acrescente outra passagem bíblica');
    expect(revisao).toContain('<FINAL>');
    expect(revisao).toContain('RASCUNHO');
  });
});

describe('ligação com a Edge Function', () => {
  const edge = readFileSync(resolve(process.cwd(), 'supabase/functions/execute/index.ts'), 'utf8');
  const bloco = edge.slice(edge.indexOf("if (modo_id === 'explicar_passagem')"), edge.indexOf('FIM DO MODO EXPLICAR PASSAGEM'));

  it('lê o contexto do pedido e usa a instrução e a revisão novas', () => {
    expect(edge).toMatch(/const \{[^}]*\bcontexto\b[^}]*\} = await req\.json\(\)/);
    expect(bloco).toContain('montarPromptExplicar(');
    expect(bloco).toContain('montarPromptRevisaoExplicar(');
    expect(bloco).not.toContain('# REVISÃO DE FIDELIDADE AO TEXTO VISÍVEL');
  });

  it('escreve no modelo caprichado e revisa no rápido, com a reserva atrás', () => {
    expect(MODELOS_EXPLICAR_TUNEL).toEqual(['ag/gemini-3.8-flash-high', 'app-pvc']);
    expect(MODELOS_REVISAO_TUNEL).toEqual(['app-pvc']);
    expect(bloco).toContain('MODELOS_EXPLICAR_TUNEL');
    expect(bloco).toContain('MODELOS_REVISAO_TUNEL');
    expect(bloco).toContain("modelosExplicacaoDireta = [\n        'google/gemma-4-31b-it:free',\n        'deepseek/deepseek-v4-flash',");
  });

  it('guarda a explicação de cada parte e devolve guardada na próxima vez', () => {
    expect(CACHE_EXPLICAR).toBe('explicar_parte_v2');
    const leitura = bloco.indexOf(".from('estudo_cache')");
    expect(leitura).toBeGreaterThan(-1);
    expect(leitura).toBeLessThan(bloco.indexOf('await gerarExplicacao('));
    expect(bloco).toContain('.upsert(');
    expect(bloco.lastIndexOf('.upsert(')).toBeGreaterThan(bloco.indexOf('if (!explicacaoRevisada)'));
  });

  it('só aceita a resposta dentro do envelope final', () => {
    expect(bloco).toContain('extrairRespostaFinal');
    expect(bloco).toContain('if (!explicacaoRevisada)');
  });
});
