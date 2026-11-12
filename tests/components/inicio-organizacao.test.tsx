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

    // 3º ajuste (12/11/2026): "o ler na Bíblia e o plano de leitura, os dois de
    // cima, dá uma melhorada". Viraram dois quadros lado a lado (o topo continua
    // baixo no celular): a Bíblia diz onde abre; a leitura mostra as passagens
    // uma por linha. Continua um atalho só para a leitura do dia.
    it('Bíblia e leitura de hoje lado a lado, cada quadro diz onde leva', async () => {
        localStorage.setItem('biblia-posicao-leitura', JSON.stringify({ livro: 'jo', livroNome: 'João', capitulo: 3, versiculo: 16, atualizadoEm: 1 }));
        localStorage.setItem('payload-dia-local', JSON.stringify({ data: '2026-11-12', passagem_do_dia: 'Isaías 51-54, Hebreus 7' }));
        render(<DashboardPage />);
        const hoje = screen.getByRole('region', { name: 'Hoje' });
        const links = within(hoje).getAllByRole('link');
        expect(links).toHaveLength(2);
        const biblia = await within(hoje).findByRole('link', { name: /Continuar em João 3, versículo 16/ });
        expect(biblia).toHaveAttribute('href', '/biblioteca');
        expect(within(biblia).getByText('João 3')).toBeInTheDocument();
        const leitura = within(hoje).getByRole('link', { name: /Leitura de hoje/ });
        expect(leitura).toHaveAttribute('href', '/plano-de-leitura?ler=1');
        const linhas = [...leitura.querySelectorAll('[data-passagem]')].map((el) => el.textContent);
        expect(linhas).toEqual(['Isaías 51-54', 'Hebreus 7']);
        // quadros compactos: sem altura mínima fixa, passagem em 16 px
        for (const quadro of links) expect(quadro.className).not.toMatch(/min-h-/);
        expect(leitura.querySelector('[data-passagem]')?.className).toContain('text-[1rem]');
        // os números não se separam ("33-" / "36")
        expect(leitura.querySelector('[data-passagem] .whitespace-nowrap')).toHaveTextContent('51-54');
        expect(links[0].parentElement?.className ?? hoje.className).toMatch(/grid-cols-2/);
    });

    // Revisão do 3º ajuste (12/11/2026): uma palavra só não quebra. Com o
    // espaço que não quebra entre nome e capítulo, "Deuteronômio 34" e
    // "1 Tessalonicenses 5" vazavam do quadro num celular de 360 px. A letra
    // agora segue a palavra mais longa e o capítulo pode descer de linha.
    it('nome de livro comprido diminui a letra e o capítulo pode descer de linha', async () => {
        localStorage.setItem('biblia-posicao-leitura', JSON.stringify({ livro: '1ts', livroNome: '1 Tessalonicenses', capitulo: 5, versiculo: 17, atualizadoEm: 1 }));
        localStorage.setItem('payload-dia-local', JSON.stringify({ data: '2026-11-12', passagem_do_dia: '1 Tessalonicenses 1-3, Deuteronômio 34' }));
        render(<DashboardPage />);
        const hoje = screen.getByRole('region', { name: 'Hoje' });
        const biblia = await within(hoje).findByRole('link', { name: /Continuar em 1 Tessalonicenses 5/ });
        const nome = biblia.querySelector('[data-nome-livro]');
        expect(nome?.textContent).toBe('1 Tessalonicenses 5');
        expect(nome?.className).toContain('text-[0.9375rem]');
        expect(nome?.className).toContain('hyphens-auto');
        const leitura = within(hoje).getByRole('link', { name: /Leitura de hoje/ });
        const passagens = [...leitura.querySelectorAll('[data-passagem]')];
        expect(passagens).toHaveLength(2);
        for (const p of passagens) expect(p.className).toContain('text-[0.9375rem]');
    });

    // 12/11/2026, depois do 3º ajuste: "não tá muito grande os dois?" — os
    // quadros do topo ficaram mais baixos e com a letra menor (26 → 20 px).
    it('a letra do quadro da Bíblia segue a palavra mais longa do nome', async () => {
        const casos: Array<[string, string]> = [
            ['João', '1.25rem'],
            ['Provérbios', '1.125rem'],
            ['Cântico dos Cânticos', '1.125rem'],
            ['Deuteronômio', '1rem'],
            ['2 Tessalonicenses', '0.9375rem'],
        ];
        for (const [livroNome, tamanho] of casos) {
            localStorage.setItem('biblia-posicao-leitura', JSON.stringify({ livro: 'x', livroNome, capitulo: 3, versiculo: 1, atualizadoEm: 1 }));
            const { container, unmount } = render(<DashboardPage />);
            await screen.findByRole('link', { name: new RegExp(`Continuar em ${livroNome} 3`) });
            expect(container.querySelector('[data-nome-livro]')?.className, livroNome).toContain(`text-[${tamanho}]`);
            unmount();
        }
    });

    it('sem leitura guardada, a Bíblia oferece abrir', () => {
        render(<DashboardPage />);
        const biblia = screen.getByRole('link', { name: /Abrir minha Bíblia/ });
        expect(biblia).toHaveAttribute('href', '/biblioteca');
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
