import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LeituraPorTestamento, PainelExplicacaoTestamento, type PainelExplicacaoTestamentoProps } from '@/components/leitura/ExplicacaoTestamento';

afterEach(cleanup);

function painel(extra: Partial<PainelExplicacaoTestamentoProps> = {}) {
    const props: PainelExplicacaoTestamentoProps = {
        testamento: 'AT',
        referencia: 'Salmos 92-95',
        conteudo: null,
        carregando: false,
        erro: false,
        onFechar: vi.fn(),
        onTentarDeNovo: vi.fn(),
        ...extra,
    };
    render(<PainelExplicacaoTestamento {...props} />);
    return props;
}

describe('quadro dos testamentos (Ler / Explicar), 4 botões no mesmo estilo', () => {
    const opcoes = [{ testamento: 'AT' as const, referencia: 'Salmos 92-95' }, { testamento: 'NT' as const, referencia: 'Efésios 3' }];

    it('uma linha por testamento, com a referência, Ler e Explicar', () => {
        const onLer = vi.fn(); const onExplicar = vi.fn();
        render(<LeituraPorTestamento opcoes={opcoes} atual="AT" onLer={onLer} onExplicar={onExplicar} />);
        expect(screen.getByText('Antigo Testamento')).toBeTruthy();
        expect(screen.getByText('Salmos 92-95')).toBeTruthy();
        expect(screen.getAllByRole('button')).toHaveLength(4);
        fireEvent.click(screen.getByRole('button', { name: 'Ler o Novo Testamento: Efésios 3' }));
        fireEvent.click(screen.getByRole('button', { name: 'Explicar o Antigo Testamento inteiro: Salmos 92-95' }));
        expect(onLer).toHaveBeenCalledWith('NT');
        expect(onExplicar).toHaveBeenCalledWith('AT');
    });

    it('os botões Ler têm o mesmo estilo entre si, e os Explicar também', () => {
        render(<LeituraPorTestamento opcoes={opcoes} onLer={vi.fn()} onExplicar={vi.fn()} />);
        const ler = screen.getAllByRole('button', { name: /^Ler o/ }).map(b => b.className);
        const explicar = screen.getAllByRole('button', { name: /^Explicar o/ }).map(b => b.className);
        expect(new Set(ler).size).toBe(1);
        expect(new Set(explicar).size).toBe(1);
    });

    it('marca o testamento que está sendo lido; sem testamento, não mostra nada', () => {
        render(<LeituraPorTestamento opcoes={opcoes} atual="NT" onLer={vi.fn()} onExplicar={vi.fn()} />);
        expect(screen.getAllByText('· lendo')).toHaveLength(1);
        cleanup();
        const { container } = render(<LeituraPorTestamento opcoes={[]} onLer={vi.fn()} onExplicar={vi.fn()} />);
        expect(container.innerHTML).toBe('');
    });
});

describe('painel da explicação do testamento', () => {
    it('enquanto prepara, avisa a espera e que fica guardada', () => {
        painel({ carregando: true });
        expect(screen.getByRole('status').textContent).toContain('Preparando a explicação de Salmos 92-95');
        expect(screen.getByRole('status').textContent).toContain('depois fica guardada para todos');
        expect(screen.getByRole('dialog', { name: /Antigo Testamento: Salmos 92-95/ })).toBeTruthy();
        expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Antigo Testamento · Salmos 92-95');
    });

    it('mostra a explicação e volta à leitura', () => {
        const props = painel({ conteudo: '### Explicação de Salmos 92-95\n\n#### Salmos 92 · O justo floresce\n\nO salmo do sábado.' });
        expect(screen.getByText('Salmos 92 · O justo floresce').tagName).toBe('H4');
        fireEvent.click(screen.getByRole('button', { name: 'Voltar à leitura' }));
        expect(props.onFechar).toHaveBeenCalled();
    });

    it('erro oferece tentar de novo', () => {
        const props = painel({ erro: true });
        fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
        expect(props.onTentarDeNovo).toHaveBeenCalled();
    });

    it('fecha pelo X e pelo Esc sem mexer na rolagem da leitura', () => {
        const rolar = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
        const props = painel({ conteudo: 'Texto' });
        expect(document.body.style.overflow).toBe('');
        fireEvent.click(screen.getByRole('button', { name: 'Fechar a explicação' }));
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(props.onFechar).toHaveBeenCalledTimes(2);
        cleanup();
        expect(rolar).not.toHaveBeenCalled();
        rolar.mockRestore();
    });
});
