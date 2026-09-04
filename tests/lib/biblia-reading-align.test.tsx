import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    BIBLIA_READING_ALIGN_KEY,
    BIBLIA_READING_LINE_HEIGHT_KEY,
    BIBLIA_READING_LINE_HEIGHT_STEP,
    DEFAULT_BIBLIA_READING_ALIGN,
    DEFAULT_BIBLIA_READING_LINE_HEIGHT,
    MAX_BIBLIA_READING_LINE_HEIGHT,
    MIN_BIBLIA_READING_LINE_HEIGHT,
    bibliaReadingBodyStyle,
    loadBibliaReadingAlign,
    loadBibliaReadingLineHeight,
    parseBibliaReadingAlign,
    parseBibliaReadingLineHeight,
    persistBibliaReadingAlign,
    persistBibliaReadingLineHeight,
    stepBibliaReadingLineHeight,
} from '@/lib/biblia-reading-align';
import { BibliaReadingAlignControls } from '@/app/biblioteca/components/BibliaReadingAlignControls';

describe('alinhamento de leitura da Bíblia', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('valida com segurança só left, center e right', () => {
        expect(parseBibliaReadingAlign('left')).toBe('left');
        expect(parseBibliaReadingAlign('center')).toBe('center');
        expect(parseBibliaReadingAlign('right')).toBe('right');
        expect(parseBibliaReadingAlign('justify')).toBeNull();
        expect(parseBibliaReadingAlign('LEFT')).toBeNull();
        expect(parseBibliaReadingAlign('')).toBeNull();
        expect(parseBibliaReadingAlign(null)).toBeNull();
        expect(parseBibliaReadingAlign(undefined)).toBeNull();
        expect(parseBibliaReadingAlign('{"align":"center"}')).toBeNull();
    });

    it('persiste e restaura na chave específica da Bíblia, ignorando valor inválido', () => {
        expect(BIBLIA_READING_ALIGN_KEY).toBe('biblia-reading-align');
        expect(BIBLIA_READING_ALIGN_KEY).not.toBe('plano-reading-align');
        expect(loadBibliaReadingAlign()).toBe(DEFAULT_BIBLIA_READING_ALIGN);

        persistBibliaReadingAlign('center');
        expect(localStorage.getItem(BIBLIA_READING_ALIGN_KEY)).toBe('center');
        expect(localStorage.getItem('plano-reading-align')).toBeNull();
        expect(loadBibliaReadingAlign()).toBe('center');

        localStorage.setItem(BIBLIA_READING_ALIGN_KEY, 'justify');
        expect(loadBibliaReadingAlign()).toBe('left');

        persistBibliaReadingAlign('right');
        persistBibliaReadingAlign('justify' as 'left');
        expect(localStorage.getItem(BIBLIA_READING_ALIGN_KEY)).toBe('right');
        expect(loadBibliaReadingAlign()).toBe('right');
    });

    it('aplica o alinhamento só no estilo do corpo de leitura', () => {
        expect(bibliaReadingBodyStyle('right')).toEqual({
            textAlign: 'right',
            lineHeight: DEFAULT_BIBLIA_READING_LINE_HEIGHT,
        });
        expect(bibliaReadingBodyStyle('center')).toEqual({
            textAlign: 'center',
            lineHeight: DEFAULT_BIBLIA_READING_LINE_HEIGHT,
        });
        expect(bibliaReadingBodyStyle('left')).toEqual({
            textAlign: 'left',
            lineHeight: DEFAULT_BIBLIA_READING_LINE_HEIGHT,
        });
    });

    it('renderiza o painel com rótulo e botões acessíveis de esquerda, centro e direita', () => {
        const onChange = vi.fn();
        render(<BibliaReadingAlignControls value="left" onChange={onChange} />);

        expect(screen.getByText('Alinhamento')).toBeInTheDocument();
        expect(screen.getByRole('group', { name: 'Alinhamento da leitura' })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Alinhar ao centro' }));
        expect(onChange).toHaveBeenCalledWith('center');

        fireEvent.click(screen.getByRole('button', { name: 'Alinhar à direita' }));
        expect(onChange).toHaveBeenCalledWith('right');

        fireEvent.click(screen.getByRole('button', { name: 'Alinhar à esquerda' }));
        expect(onChange).toHaveBeenCalledWith('left');

        const grupo = screen.getByRole('group', { name: 'Alinhamento da leitura' });
        expect(grupo).not.toHaveStyle({ textAlign: 'center' });
        expect(grupo.closest('[style*="text-align"]')).toBeNull();
    });

    it('a tela da Bíblia usa a chave própria e aplica o alinhamento só no corpo de leitura', () => {
        const page = readFileSync(resolve(__dirname, '../../src/app/biblioteca/page.tsx'), 'utf8');

        expect(page).toContain('BIBLIA_READING_ALIGN_KEY');
        expect(page).toContain('parseBibliaReadingAlign');
        expect(page).toContain('persistBibliaReadingAlign');
        expect(page).toContain('BibliaReadingAlignControls');
        expect(page).toMatch(/style=\{bibliaReadingBodyStyle\(readingAlign,\s*readingLineHeight\)\}/);
        expect(page).not.toContain('plano-reading-align');
        expect(page).toContain('text-center tracking-tight');
    });

    it('o wrapper dos versículos não usa mais card, padding, arredondamento nem o glow interno', () => {
        const page = readFileSync(resolve(__dirname, '../../src/app/biblioteca/page.tsx'), 'utf8');

        const wrapperMatch = page.match(/<div\b([^>]*\bref=\{versiculosRef\}[^>]*)>/);
        expect(wrapperMatch).not.toBeNull();

        const className = wrapperMatch![1].match(/className="([^"]*)"/)?.[1] ?? '';
        expect(className).toMatch(/\brelative\b/);
        expect(className).toMatch(/\boverflow-visible\b/);
        expect(className).not.toMatch(/\bglass-panel\b/);
        expect(className).not.toMatch(/\brounded-2xl\b/);
        expect(className).not.toMatch(/\bp-5\b/);
        expect(className).not.toMatch(/\bmd:p-8\b/);
        expect(className).not.toMatch(/\bcard\b/);

        const snippet = page.slice(
            page.indexOf(wrapperMatch![0]),
            page.indexOf(wrapperMatch![0]) + 450,
        );
        expect(snippet).not.toMatch(/bg-amber-500\/5/);
        expect(snippet).not.toMatch(/absolute top-0 right-0 w-64 h-64/);
    });
});

describe('espaçamento de leitura da Bíblia', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('usa chave exclusiva, padrão 1.85, mínimo 1.4, máximo 2.6 e passo 0.15', () => {
        expect(BIBLIA_READING_LINE_HEIGHT_KEY).toBe('biblia-reading-line-height');
        expect(BIBLIA_READING_LINE_HEIGHT_KEY).not.toBe('plano-reading-line-height');
        expect(DEFAULT_BIBLIA_READING_LINE_HEIGHT).toBe(1.85);
        expect(MIN_BIBLIA_READING_LINE_HEIGHT).toBe(1.4);
        expect(MAX_BIBLIA_READING_LINE_HEIGHT).toBe(2.6);
        expect(BIBLIA_READING_LINE_HEIGHT_STEP).toBe(0.15);
    });

    it('normaliza e faz clamp robusto, rejeitando valores inválidos', () => {
        expect(parseBibliaReadingLineHeight(1.85)).toBe(1.85);
        expect(parseBibliaReadingLineHeight('1.85')).toBe(1.85);
        expect(parseBibliaReadingLineHeight('  2.05  ')).toBe(2.05);
        expect(parseBibliaReadingLineHeight(1.4)).toBe(1.4);
        expect(parseBibliaReadingLineHeight(2.6)).toBe(2.6);
        expect(parseBibliaReadingLineHeight(1.2)).toBe(1.4);
        expect(parseBibliaReadingLineHeight(3)).toBe(2.6);
        expect(parseBibliaReadingLineHeight('9')).toBe(2.6);
        expect(parseBibliaReadingLineHeight(1.856)).toBe(1.86);
        expect(parseBibliaReadingLineHeight(1.844)).toBe(1.84);

        expect(parseBibliaReadingLineHeight('')).toBeNull();
        expect(parseBibliaReadingLineHeight('   ')).toBeNull();
        expect(parseBibliaReadingLineHeight('abc')).toBeNull();
        expect(parseBibliaReadingLineHeight('1.85px')).toBeNull();
        expect(parseBibliaReadingLineHeight(null)).toBeNull();
        expect(parseBibliaReadingLineHeight(undefined)).toBeNull();
        expect(parseBibliaReadingLineHeight(Number.NaN)).toBeNull();
        expect(parseBibliaReadingLineHeight(Number.POSITIVE_INFINITY)).toBeNull();
        expect(parseBibliaReadingLineHeight(Number.NEGATIVE_INFINITY)).toBeNull();
        expect(parseBibliaReadingLineHeight(0)).toBeNull();
        expect(parseBibliaReadingLineHeight(-1)).toBeNull();
        expect(parseBibliaReadingLineHeight(true)).toBeNull();
        expect(parseBibliaReadingLineHeight({ lineHeight: 1.85 })).toBeNull();
    });

    it('persiste e restaura com segurança, sem reutilizar a chave do Plano', () => {
        expect(loadBibliaReadingLineHeight()).toBe(DEFAULT_BIBLIA_READING_LINE_HEIGHT);

        persistBibliaReadingLineHeight(2.2);
        expect(localStorage.getItem(BIBLIA_READING_LINE_HEIGHT_KEY)).toBe('2.2');
        expect(localStorage.getItem('plano-reading-line-height')).toBeNull();
        expect(loadBibliaReadingLineHeight()).toBe(2.2);

        localStorage.setItem(BIBLIA_READING_LINE_HEIGHT_KEY, 'justify');
        expect(loadBibliaReadingLineHeight()).toBe(1.85);

        localStorage.setItem(BIBLIA_READING_LINE_HEIGHT_KEY, '3.9');
        expect(loadBibliaReadingLineHeight()).toBe(2.6);

        persistBibliaReadingLineHeight(1.7);
        persistBibliaReadingLineHeight(Number.NaN);
        persistBibliaReadingLineHeight(-4);
        expect(localStorage.getItem(BIBLIA_READING_LINE_HEIGHT_KEY)).toBe('1.7');
        expect(loadBibliaReadingLineHeight()).toBe(1.7);

        persistBibliaReadingLineHeight(9);
        expect(localStorage.getItem(BIBLIA_READING_LINE_HEIGHT_KEY)).toBe('2.6');

        const originalSetItem = Storage.prototype.setItem;
        Storage.prototype.setItem = () => {
            throw new Error('quota');
        };
        expect(() => persistBibliaReadingLineHeight(1.55)).not.toThrow();
        Storage.prototype.setItem = originalSetItem;

        const originalGetItem = Storage.prototype.getItem;
        Storage.prototype.getItem = () => {
            throw new Error('blocked');
        };
        expect(loadBibliaReadingLineHeight()).toBe(DEFAULT_BIBLIA_READING_LINE_HEIGHT);
        Storage.prototype.getItem = originalGetItem;
    });

    it('avança em passos de 0.15, arredonda a 2 casas e para nos limites', () => {
        expect(stepBibliaReadingLineHeight(1.85, BIBLIA_READING_LINE_HEIGHT_STEP)).toBe(2);
        expect(stepBibliaReadingLineHeight(1.85, -BIBLIA_READING_LINE_HEIGHT_STEP)).toBe(1.7);
        expect(stepBibliaReadingLineHeight(1.4, -BIBLIA_READING_LINE_HEIGHT_STEP)).toBe(1.4);
        expect(stepBibliaReadingLineHeight(2.6, BIBLIA_READING_LINE_HEIGHT_STEP)).toBe(2.6);
        expect(stepBibliaReadingLineHeight(1.4, BIBLIA_READING_LINE_HEIGHT_STEP)).toBe(1.55);
        expect(stepBibliaReadingLineHeight(2.45, BIBLIA_READING_LINE_HEIGHT_STEP)).toBe(2.6);
    });

    it('inclui lineHeight normalizado só no estilo do corpo de leitura', () => {
        expect(bibliaReadingBodyStyle('left', 2.2)).toEqual({ textAlign: 'left', lineHeight: 2.2 });
        expect(bibliaReadingBodyStyle('center', 1.4)).toEqual({ textAlign: 'center', lineHeight: 1.4 });
        expect(bibliaReadingBodyStyle('right', 9)).toEqual({ textAlign: 'right', lineHeight: 2.6 });
        expect(bibliaReadingBodyStyle('left', Number.NaN)).toEqual({
            textAlign: 'left',
            lineHeight: DEFAULT_BIBLIA_READING_LINE_HEIGHT,
        });
    });

    it('a tela da Bíblia restaura o espaçamento, mostra o valor e aplica lineHeight só no texto bíblico', () => {
        const page = readFileSync(resolve(__dirname, '../../src/app/biblioteca/page.tsx'), 'utf8');

        expect(page).toContain('BIBLIA_READING_LINE_HEIGHT_KEY');
        expect(page).toContain('loadBibliaReadingLineHeight');
        expect(page).toContain('persistBibliaReadingLineHeight');
        expect(page).toContain('stepBibliaReadingLineHeight');
        expect(page).not.toContain('plano-reading-line-height');

        const menuStart = page.indexOf('{mostrarFontes &&');
        expect(menuStart).toBeGreaterThan(-1);
        const controlsIdx = page.indexOf('<BibliaReadingAlignControls', menuStart);
        expect(controlsIdx).toBeGreaterThan(menuStart);
        const menuSnippet = page.slice(menuStart, controlsIdx + 80);
        expect(menuSnippet).toContain('aria-label="Diminuir espaçamento"');
        expect(menuSnippet).toContain('aria-label="Aumentar espaçamento"');
        expect(menuSnippet).toContain('Espaçamento');
        expect(menuSnippet).toMatch(/readingLineHeight\.toFixed\(2\)/);
        expect(menuSnippet).toMatch(/disabled=\{readingLineHeight <= MIN_BIBLIA_READING_LINE_HEIGHT\}/);
        expect(menuSnippet).toMatch(/disabled=\{readingLineHeight >= MAX_BIBLIA_READING_LINE_HEIGHT\}/);
        expect(menuSnippet).toContain('BibliaReadingAlignControls');

        const wrapperMatch = page.match(/<div\b([^>]*\bref=\{versiculosRef\}[^>]*)>/);
        expect(wrapperMatch).not.toBeNull();
        const bodySnippet = page.slice(
            page.indexOf(wrapperMatch![0]),
            page.indexOf(wrapperMatch![0]) + 500,
        );
        expect(bodySnippet).toMatch(/style=\{bibliaReadingBodyStyle\(readingAlign,\s*readingLineHeight\)\}/);
        expect(bodySnippet).not.toMatch(/leading-\[1\.85\]/);

        expect(page).toMatch(/setReadingLineHeight\(loadBibliaReadingLineHeight\(\)\)/);
    });
});
