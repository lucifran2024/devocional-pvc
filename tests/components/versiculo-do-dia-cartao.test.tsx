import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/bible-db', () => ({
    getCachedChapter: vi.fn().mockResolvedValue(null),
    cacheChapter: vi.fn().mockResolvedValue(undefined),
}));

import { RandomVerse, partesDaReferencia } from '@/components/RandomVerse';
import { VERSICULO_LOCAL_KEY } from '@/hooks/useVersiculoDoDia';
import { dataLocal, getDailyVerseRef, posicaoNaBiblia } from '@/lib/daily-verse';

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
        // 3º ajuste (12/11/2026): a Bíblia abre no versículo e o destaca
        expect(push).toHaveBeenCalledWith('/biblioteca?destacar=1');
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

// 14/11/2026 ("preto, papel e ouro"): o Versículo do dia é um pedaço de página
// impressa — bloco invertido, número do capítulo grande e o do versículo
// pequeno, como na Bíblia de papel. A referência por extenso continua lá.
describe('Versículo do dia como página impressa', () => {
    it('bloco invertido, com capítulo e versículo impressos e a referência por extenso', () => {
        const ref = getDailyVerseRef(dataLocal());
        const partes = partesDaReferencia(ref)!;
        expect(partes).not.toBeNull();
        localStorage.setItem(VERSICULO_LOCAL_KEY, JSON.stringify({ data: dataLocal(), ref, texto: 'Guardado de hoje.' }));
        const { container } = render(<RandomVerse />);
        const bloco = container.querySelector('section[aria-labelledby="titulo-versiculo-do-dia"]')!;
        expect(bloco.className).toMatch(/\bcampo\b/);
        expect(bloco.className).not.toMatch(/\bcartao\b/);
        const capitulo = bloco.querySelector('.capitulo-impresso')!;
        const versiculo = bloco.querySelector('.versiculo-impresso')!;
        expect(capitulo).toHaveTextContent(partes.capitulo);
        expect(versiculo).toHaveTextContent(partes.versiculo);
        // enfeite: quem usa leitor de tela ouve o texto e a referência, não os números soltos
        expect(capitulo).toHaveAttribute('aria-hidden', 'true');
        expect(versiculo).toHaveAttribute('aria-hidden', 'true');
        expect(screen.getByText(ref)).toBeInTheDocument();
        expect(screen.getByText('Guardado de hoje.')).toBeInTheDocument();
    });

    it('separa capítulo e versículo da referência', () => {
        expect(partesDaReferencia('João 3:17')).toEqual({ capitulo: '3', versiculo: '17' });
        expect(partesDaReferencia('Salmos 119:105')).toEqual({ capitulo: '119', versiculo: '105' });
        expect(partesDaReferencia('1 Coríntios 13:4-7')).toEqual({ capitulo: '13', versiculo: '4-7' });
        expect(partesDaReferencia('1 Pedro 5:10')).toEqual({ capitulo: '5', versiculo: '10' });
    });

    it('referência fora do formato não ganha os números (e nada quebra)', () => {
        expect(partesDaReferencia('Judas 25')).toBeNull();
        expect(partesDaReferencia('')).toBeNull();
    });
});
