import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// 28/10/2026 — Lucifran salvou no Caderno links no formato novo do Instagram
// (instagram.com/<perfil>/reel/<código>/) e o botão de transcrever não aparecia.

const LINK_COM_PERFIL = 'https://www.instagram.com/youversionpt/reel/DQabc123XYZ/';

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock('@/components/ui/CosmicBackground', () => ({
    CosmicBackground: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/ui/BackButton', () => ({ BackButton: () => null }));
vi.mock('@/lib/biblia-posicao', () => ({ persistBibliaPosicao: vi.fn() }));
vi.mock('@/lib/supabase', () => ({
    supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'sessao-teste' } } }) } },
    getAllInteracoesPorTipo: async () => [],
    atualizarNotaBiblia: vi.fn(),
    removerInteracaoBiblia: vi.fn(),
}));
vi.mock('@/lib/anotacoes', () => ({
    getAnotacoesLivres: async () => [{
        id: 'nota-1',
        titulo: 'YouVersion',
        texto: `Ver depois ${LINK_COM_PERFIL}`,
        created_at: '2026-10-27T16:18:26Z',
        updated_at: '2026-10-27T16:19:32Z',
    }],
    criarAnotacaoLivre: vi.fn(),
    atualizarAnotacaoLivre: vi.fn(),
    removerAnotacaoLivre: vi.fn(),
}));

import CadernoPage from '@/app/anotacoes/page';

beforeEach(() => {
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ ok: false, message: 'teste' }), { status: 502 })) as typeof fetch;
});
afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('Caderno — vídeo de rede social', () => {
    it('mostra o botão de transcrever para o reel com o perfil antes e pede o endereço que o backend resolve', async () => {
        render(<CadernoPage />);
        const botao = await screen.findByRole('button', { name: 'Transcrever Instagram vídeo 1' });
        fireEvent.click(botao);
        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
        const [url, opcoes] = vi.mocked(global.fetch).mock.calls[0];
        expect(url).toBe('/api/transcrever-social');
        expect(JSON.parse(String((opcoes as RequestInit).body))).toEqual({
            url: 'https://www.instagram.com/reel/DQabc123XYZ/',
        });
    });
});
