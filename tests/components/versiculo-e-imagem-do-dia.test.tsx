import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('next/image', () => ({
    // eslint-disable-next-line @next/next/no-img-element
    default: (p: { alt: string; src: string }) => <img alt={p.alt} src={p.src} />,
}));
vi.mock('@/lib/bible-db', () => ({
    getCachedChapter: vi.fn().mockResolvedValue(null),
    cacheChapter: vi.fn().mockResolvedValue(undefined),
}));

import { RandomVerse } from '@/components/RandomVerse';
import { ImagemDoDia } from '@/components/ImagemDoDia';
import { VERSICULO_LOCAL_KEY } from '@/hooks/useVersiculoDoDia';
import { dataLocal, getDailyVerseRef, posicaoNaBiblia } from '@/lib/daily-verse';
import { IMAGENS_DO_DIA, IMAGEM_RESERVA, getImagemDoDia } from '@/lib/imagem-do-dia';

const writeText = vi.fn();
const capituloFalso = Array.from({ length: 200 }, (_, i) => ({ verse: i + 1, text: `Texto do verso ${i + 1}.` }));

beforeEach(() => {
    localStorage.clear();
    push.mockReset();
    writeText.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    vi.mocked(global.fetch).mockResolvedValue({ ok: true, json: async () => capituloFalso } as Response);
});
afterEach(cleanup);

describe('cartão do Versículo do Dia', () => {
    it('mostra o versículo de hoje com a versão e botões com nome', async () => {
        render(<RandomVerse />);
        const ref = getDailyVerseRef(dataLocal());
        expect(screen.getByRole('heading', { name: 'Versículo do dia' })).toBeInTheDocument();
        expect(screen.getByText(ref)).toBeInTheDocument();
        expect(screen.getByText('NTLH')).toBeInTheDocument();
        expect(await screen.findByText(/Texto do verso/)).toBeInTheDocument();
        for (const nome of ['Copiar', 'Compartilhar', 'Ler na Bíblia', 'Outro versículo']) {
            expect(screen.getByRole('button', { name: nome })).toBeInTheDocument();
        }
        const guardado = JSON.parse(localStorage.getItem(VERSICULO_LOCAL_KEY)!);
        expect(guardado).toMatchObject({ data: dataLocal(), ref });
    });

    it('abre na hora com o versículo de hoje guardado no aparelho', () => {
        const ref = getDailyVerseRef(dataLocal());
        localStorage.setItem(VERSICULO_LOCAL_KEY, JSON.stringify({ data: dataLocal(), ref, texto: 'Guardado de hoje.' }));
        vi.mocked(global.fetch).mockClear();
        render(<RandomVerse />);
        expect(screen.getByText('Guardado de hoje.')).toBeInTheDocument();
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('Copiar leva texto, referência e versão; Ler na Bíblia abre no versículo', async () => {
        const ref = getDailyVerseRef(dataLocal());
        localStorage.setItem(VERSICULO_LOCAL_KEY, JSON.stringify({ data: dataLocal(), ref, texto: 'Guardado de hoje.' }));
        render(<RandomVerse />);
        fireEvent.click(screen.getByRole('button', { name: 'Copiar' }));
        await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining(`— ${ref} (NTLH)`)));
        expect(await screen.findByRole('button', { name: 'Copiado' })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Ler na Bíblia' }));
        const pos = JSON.parse(localStorage.getItem('biblia-posicao-leitura')!);
        const esperado = posicaoNaBiblia(ref)!;
        expect(pos).toMatchObject({ livro: esperado.livro, capitulo: esperado.capitulo });
        expect(push).toHaveBeenCalledWith('/biblioteca');
    });

    it('Outro versículo troca o cartão e dá para voltar ao de hoje', async () => {
        const ref = getDailyVerseRef(dataLocal());
        localStorage.setItem(VERSICULO_LOCAL_KEY, JSON.stringify({ data: dataLocal(), ref, texto: 'Guardado de hoje.' }));
        render(<RandomVerse />);
        fireEvent.click(screen.getByRole('button', { name: 'Outro versículo' }));
        expect(await screen.findByRole('heading', { name: 'Outro versículo' })).toBeInTheDocument();
        await screen.findByText(/Texto do verso/);
        expect(screen.queryByText(ref)).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Voltar ao versículo de hoje' }));
        expect(screen.getByRole('heading', { name: 'Versículo do dia' })).toBeInTheDocument();
        expect(screen.getByText('Guardado de hoje.')).toBeInTheDocument();
    });

    it('sem internet avisa e oferece tentar de novo', async () => {
        vi.mocked(global.fetch).mockRejectedValue(new Error('offline'));
        render(<RandomVerse />);
        expect(await screen.findByText(/Não deu para carregar o texto agora/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Copiar' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Ler na Bíblia' })).toBeEnabled();
    });
});

describe('imagem do dia', () => {
    it('tem 31 fotos diferentes e troca todo dia', () => {
        expect(IMAGENS_DO_DIA).toHaveLength(31);
        expect(new Set(IMAGENS_DO_DIA.map((f) => f.id)).size).toBe(31);
        expect(IMAGENS_DO_DIA.every((f) => f.alt.trim().length > 5)).toBe(true);
        const dias = new Set(Array.from({ length: 31 }, (_, d) => getImagemDoDia(`2026-10-${String(d + 1).padStart(2, '0')}`).id));
        expect(dias.size).toBe(31);
    });

    it('mostra a foto do dia e, se ela não carregar, a foto do app', () => {
        vi.useFakeTimers();
        const dia = IMAGENS_DO_DIA.findIndex((f) => !f.local);
        vi.setSystemTime(new Date(2026, 9, 1 + ((dia - IMAGENS_DO_DIA.indexOf(getImagemDoDia('2026-10-01')) + 31) % 31), 12));
        const foto = getImagemDoDia();
        render(<ImagemDoDia />);
        const img = screen.getByRole('img', { name: foto.alt });
        expect(img.getAttribute('src')).toContain(`images.unsplash.com/${foto.id}`);
        act(() => { fireEvent.error(img); });
        expect(screen.getByRole('img', { name: IMAGEM_RESERVA.alt })).toHaveAttribute('src', IMAGEM_RESERVA.src);
        vi.useRealTimers();
    });
});
