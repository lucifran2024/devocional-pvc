import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const edgeSource = readFileSync(
  resolve(process.cwd(), 'supabase/functions/execute/index.ts'),
  'utf8',
);

const promptInicio = edgeSource.indexOf('# EXPLICAÇÃO DA PARTE LIDA');
const promptFim = edgeSource.indexOf('Gere a explicação agora:', promptInicio);
const prompt = edgeSource.slice(promptInicio, promptFim);

describe('prompt da explicação da parte lida', () => {
  it('explica o bloco completo sem invadir outras partes', () => {
    expect(promptInicio).toBeGreaterThan(-1);
    expect(prompt).toContain('TODOS os versículos fornecidos pertencem à parte que o usuário acabou de ler');
    expect(prompt).toContain('começo, desenvolvimento e encerramento da parte');
    expect(prompt).toContain('NÃO explique somente um versículo isolado');
    expect(prompt).toContain('NÃO use versículos, acontecimentos ou contexto de partes que não foram fornecidas');
    expect(prompt).toContain('Toda afirmação explicativa deve apontar para palavras ou ações visíveis no texto integral');
    expect(prompt).toContain('não acrescente possibilidades, motivos, causas, cenários ou categorias que o trecho não declara');
  });

  it('dimensiona a profundidade pela quantidade real de versículos', () => {
    expect(edgeSource).toContain('quantidade_versiculos');
    expect(edgeSource).toContain('maxPalavrasExplicacao');
    expect(prompt).toContain('${maxPalavrasExplicacao} palavras');
    expect(prompt).not.toContain('Máximo 150 palavras');
  });

  it('revisa a fidelidade antes de devolver a explicação', () => {
    expect(edgeSource).toContain('# REVISÃO DE FIDELIDADE AO TEXTO VISÍVEL');
    expect(edgeSource).toContain('Não defina expressões bíblicas usando teologia ou contexto externo');
    expect(edgeSource).toContain('simboliza, representa, implica, provavelmente, talvez');
    expect(edgeSource).toContain('const llmRevisao = await gerarTexto(promptRevisaoExplicar');
    expect(edgeSource).toContain('llmRevisao.ok && llmRevisao.text');
  });
});
