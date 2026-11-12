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
import { nomeCategoria, saudacao, separarTitulo } from '@/lib/palavra-apresentacao';

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

    // 12/11/2026 (2º ajuste): o título em maiúsculas da mensagem vira a
    // manchete do cartão (mesma regra das notificações) e o texto abre com
    // letra capitular. Só apresentação: o texto copiado continua o mesmo.
    it('o título em maiúsculas vira manchete e o texto abre com capitular', async () => {
        guardarHoje();
        render(<PalavraManha />);
        expect(await screen.findByRole('heading', { level: 3, name: 'O pastor que não se atrasa' })).toBeInTheDocument();
        expect(screen.queryByText('O PASTOR QUE NÃO SE ATRASA')).toBeNull();
        expect(screen.getByText('Primeiro parágrafo.').closest('.com-capitular')).not.toBeNull();
    });

    // 3º ajuste (12/11/2026): "ficou sem quebra de linha, tudo misturado; não
    // tem início, meio e fim". Mensagem real de hoje, com o versículo colado no
    // corpo: versículo destacado com a referência embaixo, reflexão no meio,
    // fechamento no fim. Sem capitular quando o texto abre com o versículo.
    it('mensagem real de hoje: versículo, reflexão e fechamento separados', async () => {
        const real = 'A LUZ PARA O PRÓXIMO PASSO\n\n"Lâmpada para os meus pés é a tua palavra e luz, para o meu caminho." (Salmos 119:105). Deus não nos promete clareza sobre cada detalhe do futuro distante, mas garante direção segura para o próximo passo.\n\nDê o passo de hoje com fé.';
        localStorage.setItem('palavra-manha-local', JSON.stringify({ id: 9, data: '2026-11-12', dia_semana: 'Quinta', categoria: 'DEVOCIONAL', formato: 'Médio', mensagem: real }));
        const { container } = render(<PalavraManha />);
        expect(await screen.findByRole('heading', { level: 3, name: 'A luz para o próximo passo' })).toBeInTheDocument();
        const citacao = container.querySelector('figure.versiculo-palavra')!;
        expect(citacao).not.toBeNull();
        expect(citacao.querySelector('blockquote')).toHaveTextContent('Lâmpada para os meus pés é a tua palavra e luz, para o meu caminho.');
        expect(citacao.querySelector('figcaption')).toHaveTextContent('Salmos 119:105');
        const meio = screen.getByText(/^Deus não nos promete clareza/);
        expect(meio.tagName).toBe('P');
        expect(meio.closest('figure')).toBeNull();
        expect(screen.getByText('Dê o passo de hoje com fé.').closest('.fechamento-palavra')).not.toBeNull();
        expect(container.querySelector('.com-capitular')).toBeNull();
    });

    // 2º ajuste: os três quadradões de 58 px pesavam demais ("muito grande").
    // Agora: Amém em pílula e Copiar/Compartilhar só com ícone, 44 px de toque.
    it('Amém, Copiar e Compartilhar compactos, com nome e 44 px de toque', async () => {
        guardarHoje();
        render(<PalavraManha />);
        for (const nome of ['Amém', 'Copiar', 'Compartilhar']) {
            const botao = await screen.findByRole('button', { name: nome });
            expect(botao.className).toMatch(/\bh-11\b/);
            expect(botao.className).not.toMatch(/min-h-\[58px\]/);
        }
        expect(screen.getByRole('button', { name: 'Amém' })).toHaveTextContent('Amém');
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

describe('título da mensagem', () => {
    it('separa a primeira linha em maiúsculas e mantém o resto igual', () => {
        expect(separarTitulo('O ERRO DO OUTRO NÃO JUSTIFICA O SEU\n\nTexto.\n\nMais.')).toEqual({ titulo: 'O erro do outro não justifica o seu', corpo: 'Texto.\n\nMais.' });
    });

    it('nomes de Deus continuam com maiúscula', () => {
        expect(separarTitulo('QUANDO DEUS FICA EM SILÊNCIO\n\nTexto.').titulo).toBe('Quando Deus fica em silêncio');
    });

    it('aceita o título em negrito ou como cabeçalho', () => {
        expect(separarTitulo('**A PAZ QUE NÃO SE EXPLICA**\nTexto.').titulo).toBe('A paz que não se explica');
        expect(separarTitulo('# A PAZ QUE NÃO SE EXPLICA\nTexto.').titulo).toBe('A paz que não se explica');
    });

    it('sem título em maiúsculas, nada muda', () => {
        const texto = 'Há manhãs em que a gente acorda.\n\nOutro parágrafo.';
        expect(separarTitulo(texto)).toEqual({ titulo: null, corpo: texto });
        expect(separarTitulo('SÓ UMA LINHA EM MAIÚSCULAS')).toEqual({ titulo: null, corpo: 'SÓ UMA LINHA EM MAIÚSCULAS' });
    });
});

describe('saudação do horário', () => {
    it('manhã, tarde e noite', () => {
        expect(saudacao(5)).toBe('Bom dia');
        expect(saudacao(11)).toBe('Bom dia');
        expect(saudacao(12)).toBe('Boa tarde');
        expect(saudacao(17)).toBe('Boa tarde');
        expect(saudacao(18)).toBe('Boa noite');
        expect(saudacao(0)).toBe('Boa noite');
        expect(saudacao(4)).toBe('Boa noite');
    });
});
