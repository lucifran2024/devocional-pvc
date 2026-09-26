import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
    useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock('@/components/AuthProvider', () => ({
    useAuth: () => ({ user: { email: 'a@b.c' }, isAdmin: false, loading: false, signOut: vi.fn() }),
}));

import { ThemeProvider } from '@/components/ThemeProvider';
import { Navigation } from '@/components/ui/Navigation';

beforeEach(() => {
    localStorage.clear();
    window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() });
});
afterEach(cleanup);

function renderizar() {
    return render(
        <ThemeProvider defaultTheme="dark" storageKey="devocional-theme">
            <Navigation />
        </ThemeProvider>,
    );
}

describe('menu Mais da navegação', () => {
    it('mantém os quatro atalhos principais', () => {
        renderizar();
        const barra = screen.getByRole('navigation', { name: 'Navegação principal' });
        for (const nome of ['Hoje', 'Bíblia', 'Salvos', 'Leitura']) {
            expect(within(barra).getByRole('link', { name: new RegExp(nome) })).toBeInTheDocument();
        }
    });

    it('abre as outras áreas do app num toque', () => {
        renderizar();
        fireEvent.click(screen.getAllByRole('button', { name: 'Mais opções' })[0]);
        const menu = screen.getByRole('dialog', { name: 'Mais opções' });
        const esperado: Record<string, string> = {
            'Planos de leitura': '/planos',
            'Anotações': '/anotacoes',
            'Diário de Oração': '/oracao',
            'Transcrever do YouTube': '/transcrever-youtube',
            'Gravar e Transcrever': '/transcrever-culto',
        };
        for (const [nome, href] of Object.entries(esperado)) {
            expect(within(menu).getByRole('link', { name: new RegExp(nome) })).toHaveAttribute('href', href);
        }
        // Memorização saiu da tela inicial a pedido do dono (16/07/2026): não volta pelo menu.
        expect(within(menu).queryByRole('link', { name: /Memoriza/ })).toBeNull();
        expect(within(menu).getByRole('button', { name: /Sair da conta/ })).toBeInTheDocument();
    });

    it('informa a altura da barra inferior para os painéis de tela cheia', () => {
        renderizar();
        expect(document.documentElement.style.getPropertyValue('--altura-nav-inferior')).toMatch(/^\d+px$/);
    });

    it('fecha o menu pelo botão Fechar', () => {
        renderizar();
        fireEvent.click(screen.getAllByRole('button', { name: 'Mais opções' })[0]);
        fireEvent.click(screen.getByRole('button', { name: 'Fechar menu' }));
        expect(screen.queryByRole('dialog', { name: 'Mais opções' })).toBeNull();
    });
});
