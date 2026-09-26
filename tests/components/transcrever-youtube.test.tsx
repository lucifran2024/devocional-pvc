import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
    usePathname: () => '/transcrever-youtube',
    useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
}));

const getTranscricoes = vi.fn();
const salvarTranscricao = vi.fn();
const removerTranscricao = vi.fn();
const atualizarTextoTranscricao = vi.fn();
vi.mock('@/lib/transcricoes', () => ({
    getTranscricoes: (...a: unknown[]) => getTranscricoes(...a),
    salvarTranscricao: (...a: unknown[]) => salvarTranscricao(...a),
    removerTranscricao: (...a: unknown[]) => removerTranscricao(...a),
    atualizarTextoTranscricao: (...a: unknown[]) => atualizarTextoTranscricao(...a),
}));

import TranscreverYoutubePage from '@/app/transcrever-youtube/page';

const LINK = 'https://youtu.be/abcdefghijk';
const TEXTO = 'Primeiro parágrafo da pregação.\n\nSegundo parágrafo da pregação.';
const writeText = vi.fn();

function salva(id: string, titulo: string, texto = 'Texto salvo.') {
    return { id, tipo: 'youtube', titulo, fonte_url: `https://www.youtube.com/watch?v=${id.padEnd(11, 'x')}`, texto, notas: '', created_at: new Date().toISOString() };
}

beforeEach(() => {
    getTranscricoes.mockResolvedValue([]);
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    vi.mocked(global.fetch).mockResolvedValue({
        json: async () => ({ ok: true, titulo: 'Pregação teste', texto: TEXTO, idioma: 'legenda do YouTube (pt)' }),
    } as Response);
});

afterEach(() => {
    cleanup();
    delete (navigator as unknown as Record<string, unknown>).share;
    document.body.style.overflow = '';
});

async function transcrever() {
    render(<TranscreverYoutubePage />);
    await screen.findByText('Nenhuma transcrição salva ainda');
    fireEvent.change(screen.getByLabelText('Link do vídeo'), { target: { value: LINK } });
    fireEvent.click(screen.getByRole('button', { name: 'Transcrever' }));
    await screen.findByRole('heading', { name: 'Pregação teste' });
}

describe('Transcrever do YouTube — apresentação', () => {
    it('chama a transcrição igual a antes e não salva sozinho', async () => {
        await transcrever();
        expect(global.fetch).toHaveBeenCalledWith('/api/transcrever-youtube', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: LINK }),
        });
        expect(salvarTranscricao).not.toHaveBeenCalled();
        for (const nome of ['Salvar em Minhas transcrições', 'Copiar', 'Compartilhar', 'Arquivo de texto (.txt)', 'Ler transcrição completa']) {
            expect(screen.getByRole('button', { name: nome })).toBeInTheDocument();
        }
        expect(screen.getByText(/Legenda do YouTube · português/)).toBeInTheDocument();
        expect(screen.getByText(/Ainda não está salva/)).toBeInTheDocument();
    });

    it('Salvar grava uma vez e mostra onde a transcrição ficou', async () => {
        salvarTranscricao.mockResolvedValue(salva('nova', 'Pregação teste', TEXTO));
        await transcrever();
        fireEvent.click(screen.getByRole('button', { name: 'Salvar em Minhas transcrições' }));
        await screen.findByText('Salva em Minhas transcrições');
        expect(salvarTranscricao).toHaveBeenCalledTimes(1);
        expect(salvarTranscricao).toHaveBeenCalledWith({ tipo: 'youtube', titulo: 'Pregação teste', fonte_url: LINK, texto: TEXTO });
        const lista = screen.getByRole('region', { name: /Minhas transcrições/ });
        expect(within(lista).getByRole('button', { name: 'Abrir Pregação teste' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Salvar em Minhas transcrições' })).not.toBeInTheDocument();
    });

    it('se salvar falhar, avisa e não finge que salvou', async () => {
        salvarTranscricao.mockResolvedValue(null);
        await transcrever();
        fireEvent.click(screen.getByRole('button', { name: 'Salvar em Minhas transcrições' }));
        await screen.findByText(/Não foi possível salvar/);
        expect(screen.queryByText('Salva em Minhas transcrições')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Salvar em Minhas transcrições' })).toBeInTheDocument();
    });

    it('Copiar leva o texto e Compartilhar leva título, texto e link do vídeo', async () => {
        const share = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'share', { value: share, configurable: true });
        await transcrever();
        fireEvent.click(screen.getByRole('button', { name: 'Copiar' }));
        await waitFor(() => expect(writeText).toHaveBeenCalledWith(TEXTO));
        await screen.findByRole('button', { name: 'Copiado' });
        fireEvent.click(screen.getByRole('button', { name: 'Compartilhar' }));
        await waitFor(() => expect(share).toHaveBeenCalledWith({
            title: 'Pregação teste',
            text: `Pregação teste\n\n${TEXTO}\n\nVídeo: https://www.youtube.com/watch?v=abcdefghijk`,
        }));
    });

    it('leitura completa do resultado oferece Salvar e depois Editar', async () => {
        salvarTranscricao.mockResolvedValue(salva('nova', 'Pregação teste', TEXTO));
        await transcrever();
        fireEvent.click(screen.getByRole('button', { name: 'Ler transcrição completa' }));
        const leitura = screen.getByRole('dialog', { name: 'Pregação teste' });
        expect(within(leitura).getByText('Ainda não salva')).toBeInTheDocument();
        expect(within(leitura).getByText('Segundo parágrafo da pregação.')).toBeInTheDocument();
        fireEvent.click(within(leitura).getByRole('button', { name: 'Salvar' }));
        await within(leitura).findByRole('button', { name: 'Editar' });
        expect(salvarTranscricao).toHaveBeenCalledTimes(1);
        fireEvent.click(within(leitura).getByRole('button', { name: 'Voltar' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('link que não é do YouTube recebe orientação clara', async () => {
        vi.mocked(global.fetch).mockResolvedValue({ json: async () => ({ ok: false, error: 'link_invalido' }) } as Response);
        render(<TranscreverYoutubePage />);
        fireEvent.change(screen.getByLabelText('Link do vídeo'), { target: { value: 'https://vimeo.com/1' } });
        expect(screen.getByText(/não parece de um vídeo do YouTube/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Transcrever' }));
        const alerta = await screen.findByRole('alert');
        expect(alerta).toHaveTextContent('não é de um vídeo do YouTube');
        expect(within(alerta).getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
    });
});

describe('Minhas transcrições', () => {
    it('abre a salva para ler, copiar e editar; a edição é gravada e reaparece', async () => {
        getTranscricoes.mockResolvedValue([salva('t1', 'Culto de domingo', 'Texto original.')]);
        atualizarTextoTranscricao.mockResolvedValue(true);
        render(<TranscreverYoutubePage />);
        fireEvent.click(await screen.findByRole('button', { name: 'Abrir Culto de domingo' }));
        const leitura = screen.getByRole('dialog', { name: 'Culto de domingo' });
        expect(within(leitura).getByText('Em Minhas transcrições')).toBeInTheDocument();

        fireEvent.click(within(leitura).getByRole('button', { name: 'Copiar' }));
        await waitFor(() => expect(writeText).toHaveBeenCalledWith('Texto original.'));

        fireEvent.click(within(leitura).getByRole('button', { name: 'Editar' }));
        fireEvent.change(within(leitura).getByRole('textbox'), { target: { value: 'Texto corrigido.' } });
        fireEvent.click(within(leitura).getByRole('button', { name: 'Salvar alterações' }));
        await waitFor(() => expect(atualizarTextoTranscricao).toHaveBeenCalledWith('t1', 'Texto corrigido.'));
        expect(await within(leitura).findByText('Texto corrigido.')).toBeInTheDocument();
        expect(within(leitura).getByRole('button', { name: 'Editar' })).toBeInTheDocument();
    });

    it('Excluir pede confirmação antes de apagar', async () => {
        getTranscricoes.mockResolvedValue([salva('t1', 'Culto de domingo')]);
        removerTranscricao.mockResolvedValue(true);
        render(<TranscreverYoutubePage />);
        fireEvent.click(await screen.findByRole('button', { name: 'Abrir Culto de domingo' }));
        const leitura = screen.getByRole('dialog');
        fireEvent.click(within(leitura).getByRole('button', { name: 'Excluir' }));
        expect(removerTranscricao).not.toHaveBeenCalled();
        fireEvent.click(within(leitura).getByRole('button', { name: 'Sim, excluir' }));
        await waitFor(() => expect(removerTranscricao).toHaveBeenCalledWith('t1'));
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(screen.queryByRole('button', { name: 'Abrir Culto de domingo' })).not.toBeInTheDocument();
        expect(screen.getByText('Transcrição excluída.')).toBeInTheDocument();
    });

    it('busca aparece com várias salvas e filtra sem acento', async () => {
        getTranscricoes.mockResolvedValue([
            salva('a', 'Fé que move montanhas'),
            salva('b', 'Culto de domingo'),
            salva('c', 'Santa ceia'),
            salva('d', 'Oração da manhã'),
        ]);
        render(<TranscreverYoutubePage />);
        await screen.findByRole('button', { name: 'Abrir Culto de domingo' });
        expect(screen.getByRole('button', { name: 'Minhas transcrições · 4' })).toBeInTheDocument();
        fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar nas transcrições' }), { target: { value: 'oracao' } });
        expect(screen.getByRole('button', { name: 'Abrir Oração da manhã' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Abrir Culto de domingo' })).not.toBeInTheDocument();
    });
});
