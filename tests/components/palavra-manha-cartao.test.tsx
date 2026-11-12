import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Cartão da Palavra da Manhã (12/11/2026): título dentro do cartão, categoria
// legível ("Meditação", não "MEDITACAO"), texto à esquerda e a mesma fileira
// de botões do Versículo do dia (Amém, Copiar, Compartilhar). O texto e o
// formato do Copiar não mudam.

const getPalavraManha = vi.fn();
vi.mock('@/lib/supabase', () => ({
    getDataHoje: () => '2026-11-12',
    getPalavraManha: (...a: unknown[]) => getPalavraManha(...a),
    gerarPalavraManha: vi.fn(() => new Promise(() => {})),
    darAmen: vi.fn().mockResolvedValue(true),
}));

import { PalavraManha } from '@/components/PalavraManha';
import { nomeCategoria } from '@/lib/palavra-apresentacao';

const MENSAGEM = 'O PASTOR QUE NÃO SE ATRASA\n\nPrimeiro parágrafo.\n\nSegundo parágrafo.';
const writeText = vi.fn();

function guardarHoje(categoria = 'MEDITACAO') {
    localStorage.setItem('palavra-manha-local', JSON.stringify({ id: 7, data: '2026-11-12', dia_semana: 'Quinta-feira', categoria, formato: 'texto', mensagem: MENSAGEM }));
}

beforeEach(() => {
    localStorage.clear();
    getPalavraManha.mockReset().mockReturnValue(new Promise(() => {}));
    writeText.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});
afterEach(cleanup);

describe('cartão da Palavra da Manhã', () => {
    it('título dentro do cartão, dia e categoria legíveis', async () => {
        guardarHoje();
        render(<PalavraManha />);
        expect(await screen.findByRole('heading', { level: 2, name: 'Palavra da Manhã' })).toBeInTheDocument();
        expect(screen.getByText('Quinta-feira · Meditação')).toBeInTheDocument();
        expect(screen.queryByText(/MEDITACAO/)).toBeNull();
        expect(screen.queryByText(/Inspirado em seu DNA/)).toBeNull();
    });

    it('cada parágrafo da mensagem fica num bloco próprio, no estilo de leitura', async () => {
        guardarHoje();
        render(<PalavraManha />);
        const segundo = await screen.findByText('Segundo parágrafo.');
        expect(segundo.tagName).toBe('P');
        expect(segundo.closest('.texto-palavra')).not.toBeNull();
    });

    it('Amém, Copiar e Compartilhar com nome e tamanho de toque', async () => {
        guardarHoje();
        render(<PalavraManha />);
        for (const nome of ['Amém', 'Copiar', 'Compartilhar']) {
            const botao = await screen.findByRole('button', { name: nome });
            expect(botao.className).toMatch(/min-h-\[58px\]/);
        }
    });

    it('Copiar mantém o formato de antes', async () => {
        guardarHoje();
        render(<PalavraManha />);
        fireEvent.click(await screen.findByRole('button', { name: 'Copiar' }));
        await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
        const texto = writeText.mock.calls[0][0] as string;
        expect(texto.startsWith('🌅 *PALAVRA DA MANHÃ*\nQuinta-feira • ')).toBe(true);
        expect(texto).toContain(MENSAGEM);
        expect(texto.endsWith('\n\n📲 _Bíblia_')).toBe(true);
        expect(await screen.findByRole('button', { name: 'Copiado' })).toBeInTheDocument();
    });

    it('Amém marca uma vez só', async () => {
        guardarHoje();
        const { darAmen } = await import('@/lib/supabase');
        render(<PalavraManha />);
        fireEvent.click(await screen.findByRole('button', { name: 'Amém' }));
        expect(await screen.findByRole('button', { name: 'Amém!' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Amém!' }));
        expect(darAmen).toHaveBeenCalledTimes(1);
        expect(darAmen).toHaveBeenCalledWith(7);
    });

    it('enquanto carrega, o título já aparece (a tela não pula)', () => {
        render(<PalavraManha />);
        expect(screen.getByRole('heading', { level: 2, name: 'Palavra da Manhã' })).toBeInTheDocument();
        expect(screen.getByText(/Buscando inspiração/)).toBeInTheDocument();
    });
});

describe('nome da categoria', () => {
    it('as sete categorias do gerador ganham acento', () => {
        expect(nomeCategoria('MEDITACAO')).toBe('Meditação');
        expect(nomeCategoria('ORACAO')).toBe('Oração');
        expect(nomeCategoria('EXORTACAO')).toBe('Exortação');
        expect(nomeCategoria('REFLEXAO')).toBe('Reflexão');
        expect(nomeCategoria('VERSICULO')).toBe('Versículo');
        expect(nomeCategoria('LOUVOR')).toBe('Louvor');
        expect(nomeCategoria('DEVOCIONAL')).toBe('Devocional');
    });

    it('categoria nova ou vazia não quebra', () => {
        expect(nomeCategoria('NOVA_CATEGORIA')).toBe('Nova categoria');
        expect(nomeCategoria('')).toBe('');
        expect(nomeCategoria(undefined)).toBe('');
    });
});
