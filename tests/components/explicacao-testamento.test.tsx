import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BotoesExplicarTestamento, PainelExplicacaoTestamento, type PainelExplicacaoTestamentoProps } from '@/components/leitura/ExplicacaoTestamento';

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

describe('botões Explicar o Antigo / o Novo', () => {
    it('um botão por testamento, com a referência, e o toque avisa qual', () => {
        const onExplicar = vi.fn();
        render(<BotoesExplicarTestamento opcoes={[{ testamento: 'AT', referencia: 'Salmos 92-95' }, { testamento: 'NT', referencia: 'Efésios 3' }]} onExplicar={onExplicar} />);
        expect(screen.getByText('Explicar o Antigo')).toBeTruthy();
        expect(screen.getByText('Salmos 92-95')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /Novo Testamento inteiro: Efésios 3/ }));
        expect(onExplicar).toHaveBeenCalledWith('NT');
    });

    it('sem testamento, não mostra nada', () => {
        const { container } = render(<BotoesExplicarTestamento opcoes={[]} onExplicar={vi.fn()} />);
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
