import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Abertura rápida (25/09/2026): o app esperava em fila a renovação da sessão,
// um splash fixo de 700 ms e o download do payload do dia antes de mostrar
// qualquer coisa. Estes testes travam a abertura sem essas esperas.

const replace = vi.fn();
vi.mock('next/navigation', () => ({
    usePathname: () => '/',
    useRouter: () => ({ replace }),
    useSearchParams: () => new URLSearchParams(),
}));

const getSession = vi.fn();
const getPalavraManha = vi.fn();
const getPayloadDoDia = vi.fn();
vi.mock('@/lib/supabase', () => ({
    supabase: {
        auth: {
            getSession: () => getSession(),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
            signOut: vi.fn(),
        },
    },
    getDataHoje: () => '2026-09-26',
    getPayloadDoDia: (...a: unknown[]) => getPayloadDoDia(...a),
    getPalavraManha: (...a: unknown[]) => getPalavraManha(...a),
    gerarPalavraManha: vi.fn(() => new Promise(() => {})),
    darAmen: vi.fn(),
}));

vi.mock('next/image', () => ({
    // eslint-disable-next-line @next/next/no-img-element
    default: (p: { alt: string }) => <img alt={p.alt} />,
}));
vi.mock('@/components/ui/ThemeToggle', () => ({ ThemeToggle: () => null }));

import { AuthProvider } from '@/components/AuthProvider';
import { PalavraManha } from '@/components/PalavraManha';

const pendurada = () => new Promise(() => {});

beforeEach(() => {
    localStorage.clear();
    replace.mockReset();
    getSession.mockReset();
    getPalavraManha.mockReset();
    getPayloadDoDia.mockReset();
});
afterEach(cleanup);

describe('sessão guardada abre o app sem esperar a rede', () => {
    it('mostra o conteúdo na hora quando há sessão no aparelho', async () => {
        localStorage.setItem('sb-teste-auth-token', JSON.stringify({ user: { id: 'u1', email: 'a@b.c' }, expires_at: 1 }));
        getSession.mockReturnValue(pendurada());
        render(<AuthProvider><p>conteudo protegido</p></AuthProvider>);
        expect(await screen.findByText('conteudo protegido')).toBeInTheDocument();
    });

    it('volta para o login se a validação derrubar a sessão guardada', async () => {
        localStorage.setItem('sb-teste-auth-token', JSON.stringify({ user: { id: 'u1', email: 'a@b.c' }, expires_at: 1 }));
        let responder: (v: unknown) => void = () => {};
        getSession.mockReturnValue(new Promise((r) => { responder = r; }));
        render(<AuthProvider><p>conteudo protegido</p></AuthProvider>);
        await screen.findByText('conteudo protegido');
        await act(async () => { responder({ data: { session: null } }); });
        await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
    });

    it('sem sessão guardada mostra a abertura da marca até validar', async () => {
        getSession.mockResolvedValue({ data: { session: null } });
        render(<AuthProvider><p>conteudo protegido</p></AuthProvider>);
        expect(screen.getByRole('status', { name: 'Abrindo a Bíblia' })).toBeInTheDocument();
        await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
        expect(screen.queryByText('conteudo protegido')).toBeNull();
    });
});

describe('página inicial não espera o payload do dia', () => {
    beforeAll(() => {
        vi.doMock('@/components/AuthProvider', () => ({ useAuth: () => ({ signOut: vi.fn(), user: { email: 'a@b.c' }, isAdmin: false, loading: false }) }));
        vi.doMock('@/components/PalavraManha', () => ({ PalavraManha: () => <div>palavra</div> }));
    });

    it('mostra a chamada principal enquanto o payload ainda carrega', async () => {
        getPayloadDoDia.mockReturnValue(pendurada());
        const { default: DashboardPage } = await import('@/app/page');
        render(<DashboardPage />);
        expect(screen.getByRole('heading', { name: /Um momento para a Palavra/ })).toBeInTheDocument();
    });

    it('oferece continuar a leitura de onde parou', async () => {
        localStorage.setItem('biblia-posicao-leitura', JSON.stringify({ livro: 'jo', livroNome: 'João', capitulo: 3, versiculo: 16, atualizadoEm: 1 }));
        getPayloadDoDia.mockReturnValue(pendurada());
        const { default: DashboardPage } = await import('@/app/page');
        render(<DashboardPage />);
        const link = await screen.findByRole('link', { name: /Continuar em João 3/ });
        expect(link).toHaveAttribute('href', '/biblioteca');
    });

    // Topo no celular (01/10/2026): o botão grande "Leitura do dia" virou o
    // rodapé do cartão, junto da passagem de hoje (um atalho só, mais baixo).
    it('leitura do dia é um atalho só, junto da passagem de hoje', async () => {
        getPayloadDoDia.mockResolvedValue({ data: { data: '2026-09-26', passagem_do_dia: 'Salmos 84-88' }, error: null });
        const { default: DashboardPage } = await import('@/app/page');
        render(<DashboardPage />);
        const atalho = await screen.findByRole('link', { name: /Leitura de hoje.*Salmos 84-88/ });
        expect(atalho).toHaveAttribute('href', '/plano-de-leitura?ler=1');
        const paraLeitura = screen.getAllByRole('link').filter((l) => l.getAttribute('href') === '/plano-de-leitura?ler=1');
        expect(paraLeitura).toHaveLength(1);
    });

    it('sem a passagem carregada o atalho continua lá', async () => {
        getPayloadDoDia.mockReturnValue(pendurada());
        const { default: DashboardPage } = await import('@/app/page');
        render(<DashboardPage />);
        expect(screen.getByRole('link', { name: /Leitura do dia/ })).toHaveAttribute('href', '/plano-de-leitura?ler=1');
    });

    it('botão principal compacto para o celular', async () => {
        getPayloadDoDia.mockReturnValue(pendurada());
        const { default: DashboardPage } = await import('@/app/page');
        render(<DashboardPage />);
        const principal = screen.getByRole('link', { name: /Abrir minha Bíblia/ });
        expect(principal.className).toContain('min-h-11');
        expect(principal.className).not.toContain('min-h-12');
    });
});

describe('Palavra da Manhã usa a cópia de hoje guardada no aparelho', () => {
    const registro = (data: string, mensagem: string) => JSON.stringify({ id: 1, data, dia_semana: 'Sábado', categoria: 'MEDITACAO', mensagem });

    it('mostra na hora a mensagem de hoje, sem tela de espera', async () => {
        localStorage.setItem('palavra-manha-local', registro('2026-09-26', 'Mensagem guardada de hoje'));
        getPalavraManha.mockReturnValue(pendurada());
        render(<PalavraManha />);
        expect(await screen.findByText('Mensagem guardada de hoje')).toBeInTheDocument();
        expect(screen.queryByText(/Buscando inspiração/)).toBeNull();
    });

    it('troca pela versão do banco quando ela chega diferente', async () => {
        localStorage.setItem('palavra-manha-local', registro('2026-09-26', 'Versão antiga'));
        getPalavraManha.mockResolvedValue({ id: 2, data: '2026-09-26', dia_semana: 'Sábado', categoria: 'MEDITACAO', mensagem: 'Versão do banco' });
        render(<PalavraManha />);
        expect(await screen.findByText('Versão do banco')).toBeInTheDocument();
    });

    it('não mostra a mensagem de ontem como se fosse de hoje', () => {
        localStorage.setItem('palavra-manha-local', registro('2026-09-25', 'Mensagem de ontem'));
        getPalavraManha.mockReturnValue(pendurada());
        render(<PalavraManha />);
        expect(screen.getByText(/Buscando inspiração/)).toBeInTheDocument();
        expect(screen.queryByText('Mensagem de ontem')).toBeNull();
    });
});
