import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { barraDeveAparecer, progressoLeitura } from '@/lib/leitura-rolagem';

const page = readFileSync(resolve(__dirname, '../../src/app/biblioteca/page.tsx'), 'utf8');
const fundo = readFileSync(resolve(__dirname, '../../src/components/ui/CosmicBackground.tsx'), 'utf8');

describe('barra da Bíblia some ao ler e volta ao rolar para cima', () => {
    it('fica visível perto do topo', () => {
        expect(barraDeveAparecer({ anterior: 300, atual: 40, visivel: false })).toBe(true);
    });
    it('esconde ao descer lendo e reaparece ao subir', () => {
        expect(barraDeveAparecer({ anterior: 400, atual: 460, visivel: true })).toBe(false);
        expect(barraDeveAparecer({ anterior: 900, atual: 860, visivel: false })).toBe(true);
    });
    it('ignora tremidas pequenas da rolagem', () => {
        expect(barraDeveAparecer({ anterior: 500, atual: 503, visivel: true })).toBe(true);
        expect(barraDeveAparecer({ anterior: 500, atual: 497, visivel: false })).toBe(false);
    });
});

describe('progresso de leitura do capítulo', () => {
    it('vai de 0 a 1 sem sair da faixa', () => {
        expect(progressoLeitura(0, 100, 1100)).toBe(0);
        expect(progressoLeitura(600, 100, 1100)).toBe(0.5);
        expect(progressoLeitura(5000, 100, 1100)).toBe(1);
        expect(progressoLeitura(50, 100, 100)).toBe(0);
    });
});

describe('contratos da tela da Bíblia', () => {
    it('abre pela posição guardada no aparelho antes de consultar a internet', () => {
        const init = page.slice(page.indexOf('async function init()'), page.indexOf('init();'));
        expect(init).toContain('loadBibliaPosicao()');
        expect(init.indexOf('loadBibliaPosicao()')).toBeLessThan(init.indexOf('getUltimaLeitura()'));
        expect(page).toContain('persistBibliaPosicao(');
        expect(page).toContain('registrarBibliaRecente(');
    });

    it('conta os versículos pelo capítulo salvo antes de ir à internet', () => {
        const trecho = page.slice(page.indexOf('const selecionarCapituloTemp'), page.indexOf('const confirmarSelecao'));
        expect(trecho).toContain('getCachedChapter(');
        expect(trecho.indexOf('getCachedChapter(')).toBeLessThan(trecho.indexOf('fetchBibliaComFallback('));
    });

    it('usa fundo que recorta a largura sem quebrar o cabeçalho fixo', () => {
        expect(fundo).toContain('overflow-x-clip');
        expect(page).toMatch(/<CosmicBackground[^>]*\bclipX\b/);
    });

    it('janelas ficam acima da barra inferior e o painel Salvos termina acima dela', () => {
        // Com "z-10" no conteúdo, a barra inferior cobria a parte de baixo dos painéis
        expect(fundo).not.toMatch(/relative z-10 w-full/);
        const inicio = page.indexOf('PAINEL DE SALVOS --- */');
        const salvos = page.slice(inicio, inicio + 700);
        expect(salvos).toContain('bottom-[var(--altura-nav-inferior,0px)]');
        expect(salvos).not.toContain('h-[100dvh]');
    });
});
