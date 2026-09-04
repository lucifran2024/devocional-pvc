import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    BIBLIA_READING_ALIGN_KEY,
    DEFAULT_BIBLIA_READING_ALIGN,
    bibliaReadingBodyStyle,
    loadBibliaReadingAlign,
    parseBibliaReadingAlign,
    persistBibliaReadingAlign,
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
        expect(bibliaReadingBodyStyle('right')).toEqual({ textAlign: 'right' });
        expect(bibliaReadingBodyStyle('center')).toEqual({ textAlign: 'center' });
        expect(bibliaReadingBodyStyle('left')).toEqual({ textAlign: 'left' });
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
        expect(page).toMatch(/style=\{bibliaReadingBodyStyle\(readingAlign\)\}/);
        expect(page).not.toContain('plano-reading-align');
        expect(page).toContain('text-center tracking-tight');
    });
});
