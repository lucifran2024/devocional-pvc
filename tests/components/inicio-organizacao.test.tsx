import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Início premium (12/11/2026): pedido "organização da página inicial, dos
// cards e dos botões". Os seis cartões grandes, um embaixo do outro, com
// etiqueta repetida e "ACESSAR" em todos, viraram dois grupos compactos;
// a data aparece uma vez, no topo; os botões flutuantes saíram do início.

vi.mock('next/navigation', () => ({
    usePathname: () => '/',
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/supabase', () => ({
    getDataHoje: () => '2026-11-12',
    getPayloadDoDia: vi.fn(() => new Promise(() => {})),
}));
vi.mock('@/components/AuthProvider', () => ({ useAuth: () => ({ signOut: vi.fn(), user: { email: 'a@b.c' }, isAdmin: false, loading: false }) }));
vi.mock('@/components/PalavraManha', () => ({ PalavraManha: () => <div>palavra</div> }));
vi.mock('@/components/RandomVerse', () => ({ RandomVerse: () => <div>versiculo</div> }));
vi.mock('@/components/ui/ThemeToggle', () => ({ ThemeToggle: () => <button type="button">Tema</button> }));

import DashboardPage from '@/app/page';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('organização do início', () => {
    it('a data aparece uma vez, por extenso e sem o ano, junto do título', () => {
        render(<DashboardPage />);
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
        expect(screen.getAllByText(/12 de novembro/)).toHaveLength(1);
        expect(screen.getByText('Quinta-feira, 12 de novembro')).toBeInTheDocument();
        expect(screen.queryByText(/2026/)).toBeNull();
    });

    // 12/11/2026 (2º ajuste): "Um momento para a Palavra" não ficou legal; o
    // título virou a saudação do horário, no aparelho de quem abre.
    it('o título é a saudação do horário', () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        try {
            vi.setSystemTime(new Date(2026, 10, 12, 8, 30));
            render(<DashboardPage />);
            expect(screen.getByRole('heading', { level: 1, name: 'Bom dia.' })).toBeInTheDocument();
            expect(screen.queryByText(/Um momento para a Palavra/)).toBeNull();
            cleanup();
            vi.setSystemTime(new Date(2026, 10, 12, 20, 0));
            render(<DashboardPage />);
            expect(screen.getByRole('heading', { level: 1, name: 'Boa noite.' })).toBeInTheDocument();
        } finally {
            vi.useRealTimers();
        }
    });

    it('ferramentas em lista, sem ícone dentro de quadradinho colorido', () => {
        const { container } = render(<DashboardPage />);
        expect(container.querySelectorAll('[class*="bg-amber-500/10"]')).toHaveLength(0);
    });

    it('ferramentas de estudo num grupo próprio, cada cartão é o botão', () => {
        render(<DashboardPage />);
        const estudar = screen.getByRole('region', { name: 'Estudar' });
        const esperado: Array<[RegExp, string]> = [
            [/Plano de Leitura/, '/planos'],
            [/Bíblia Sagrada/, '/biblioteca'],
            [/Caderno/, '/anotacoes'],
            [/Diário de Oração/, '/oracao'],
        ];
        for (const [nome, href] of esperado) {
            expect(within(estudar).getByRole('link', { name: nome })).toHaveAttribute('href', href);
        }
        expect(within(estudar).getAllByRole('link')).toHaveLength(4);
    });

    it('transcrição num grupo próprio', () => {
        render(<DashboardPage />);
        const transcrever = screen.getByRole('region', { name: 'Transcrever' });
        expect(within(transcrever).getByRole('link', { name: /YouTube/ })).toHaveAttribute('href', '/transcrever-youtube');
        expect(within(transcrever).getByRole('link', { name: /Áudio/ })).toHaveAttribute('href', '/transcrever-culto');
        expect(within(transcrever).getAllByRole('link')).toHaveLength(2);
    });

    it('cartões sem "Acessar" e sem etiqueta que repete o título', () => {
        render(<DashboardPage />);
        expect(screen.queryByText(/Acessar/i)).toBeNull();
        for (const etiqueta of ['Diário', '66 livros', 'Vídeo']) {
            expect(screen.queryByText(etiqueta)).toBeNull();
        }
        expect(screen.getAllByText('Caderno')).toHaveLength(1);
    });

    it('sem botão de sair no início (fica no Mais e na barra lateral) e sem rodapé', () => {
        render(<DashboardPage />);
        expect(screen.queryByTitle('Sair da conta')).toBeNull();
        expect(screen.queryByRole('button', { name: /Sair/ })).toBeNull();
        expect(screen.queryByRole('contentinfo')).toBeNull();
        expect(screen.getByRole('button', { name: 'Tema' })).toBeInTheDocument();
    });

    it('Memorização, DNA e Devocional Externo continuam fora do início', () => {
        render(<DashboardPage />);
        expect(screen.queryByRole('link', { name: /Memoriza/ })).toBeNull();
        expect(screen.queryByRole('link', { name: /DNA/ })).toBeNull();
        expect(screen.queryByRole('link', { name: /Devocional Externo/ })).toBeNull();
    });
});
