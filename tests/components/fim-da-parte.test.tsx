import React from 'react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FimDaParte, type FimDaParteProps } from '@/components/leitura/FimDaParte';

afterEach(cleanup);

const FRASES_ANTIGAS = [
    'Respire um instante',
    'Quando estiver pronto',
    'Seu progresso fica salvo',
    'concluída',
    'Que essa Palavra permaneça',
    'Toque em',
];

function montar(extra: Partial<FimDaParteProps> = {}) {
    const props: FimDaParteProps = {
        parte: 1,
        totalPartes: 5,
        partesLidas: [],
        capituloAtual: 'Salmos 84',
        proxima: { capitulo: 'Salmos 85', secao: 'Oração pelo bem da nação' },
        passagem: 'Salmos 84-88',
        concluida: false,
        onContinuar: vi.fn(),
        onExplicar: vi.fn(),
        ...extra,
    };
    render(<FimDaParte {...props} />);
    return props;
}

function textoVisivel() {
    return screen.getByRole('region', { name: /fim da parte/i }).textContent || '';
}

describe('fim da parte da Leitura do Dia', () => {
    it('mostra onde o leitor está e o que vem a seguir, sem frases de instrução', () => {
        montar();
        const bloco = screen.getByRole('region', { name: /fim da parte 1 de 5/i });
        expect(within(bloco).getByText('Parte 1 de 5')).toBeTruthy();
        expect(within(bloco).getByText('Salmos 84')).toBeTruthy();
        expect(within(bloco).getByText('A seguir')).toBeTruthy();
        expect(within(bloco).getByText('Salmos 85')).toBeTruthy();
        expect(within(bloco).getByText('Oração pelo bem da nação')).toBeTruthy();
        const texto = textoVisivel();
        for (const frase of FRASES_ANTIGAS) expect(texto).not.toContain(frase);
        expect(texto).not.toMatch(/[—–]/);
    });

    it('uma barra por parte, com as lidas e a atual marcadas', () => {
        montar({ parte: 3, partesLidas: [1, 2] });
        const segmentos = screen.getAllByTestId('segmento-parte');
        expect(segmentos).toHaveLength(5);
        expect(segmentos.map((s) => s.getAttribute('data-estado'))).toEqual(['lida', 'lida', 'atual', 'pendente', 'pendente']);
    });

    it('Continuar e Explicar ficam no próprio bloco', () => {
        const props = montar();
        fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
        fireEvent.click(screen.getByRole('button', { name: 'Explicar' }));
        expect(props.onContinuar).toHaveBeenCalledTimes(1);
        expect(props.onExplicar).toHaveBeenCalledTimes(1);
    });

    it('sem onExplicar não mostra o botão; ocupado desativa as ações', () => {
        montar({ onExplicar: undefined, ocupado: true });
        expect(screen.queryByRole('button', { name: 'Explicar' })).toBeNull();
        expect((screen.getByRole('button', { name: 'Continuar' }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('marcar como lida é discreto e alterna', () => {
        const onAlternar = vi.fn();
        montar({ marcacao: { lida: false, carregando: false, onAlternar } });
        fireEvent.click(screen.getByRole('button', { name: 'Marcar parte 1 como lida' }));
        expect(onAlternar).toHaveBeenCalledTimes(1);
        cleanup();
        montar({ marcacao: { lida: true, carregando: false, onAlternar } });
        const lida = screen.getByRole('button', { name: /parte 1 lida\. toque para desmarcar/i });
        expect(lida.textContent).toContain('Lida');
    });

    it('última parte: botão Concluir leitura e aviso curto', () => {
        montar({ parte: 5, partesLidas: [1, 2, 3, 4], proxima: null });
        expect(screen.getByRole('button', { name: 'Concluir leitura' })).toBeTruthy();
        expect(screen.queryByText('A seguir')).toBeNull();
        expect(screen.getByText('Última parte da leitura de hoje.')).toBeTruthy();
    });

    it('dia concluído na última parte mostra a confirmação', () => {
        montar({ parte: 5, partesLidas: [1, 2, 3, 4, 5], proxima: null, concluida: true });
        expect(screen.getByText('Leitura de hoje concluída')).toBeTruthy();
        expect(screen.getByText('Salmos 84-88')).toBeTruthy();
        // Já concluída: o botão não repete a conclusão; Explicar continua
        expect(screen.queryByRole('button', { name: 'Concluir leitura' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Explicar' })).toBeTruthy();
    });

    it('dia já lido antes, relendo do começo: Continuar segue disponível', () => {
        montar({ parte: 1, partesLidas: [1, 2, 3, 4, 5], concluida: true });
        expect(screen.getByRole('button', { name: 'Continuar' })).toBeTruthy();
        expect(screen.getByText('A seguir')).toBeTruthy();
    });

    it('progresso do ano em dias, sem emoji', () => {
        montar({ anual: { lidos: 47, total: 307, pct: 15 } });
        expect(screen.getByText('Sua leitura no ano')).toBeTruthy();
        expect(screen.getByText('47 de 307 dias')).toBeTruthy();
        expect(textoVisivel()).not.toMatch(/\p{Extended_Pictographic}/u);
        cleanup();
        montar({ anual: { lidos: 0, total: 1, pct: 0 } });
        expect(screen.getByText('0 de 1 dia')).toBeTruthy();
    });

    it('leitura de uma parte só não mostra "Parte 1 de 1"', () => {
        montar({ totalPartes: 1, proxima: null, capituloAtual: 'Rute 1' });
        expect(screen.queryByText(/Parte 1 de 1/)).toBeNull();
        expect(screen.getByText('Rute 1')).toBeTruthy();
        expect(screen.queryAllByTestId('segmento-parte')).toHaveLength(0);
    });
});

describe('ligação com a página da leitura', () => {
    const pagina = readFileSync(resolve(__dirname, '../../src/app/plano-de-leitura/page.tsx'), 'utf8');

    it('a mensagem da parte termina no texto (sem as frases antigas)', () => {
        expect(pagina).not.toContain('FRASES_ENTRE_PARTES');
        expect(pagina).not.toContain('Seu progresso fica salvo até');
        expect(pagina).not.toContain('concluída** ·');
        expect(pagina).not.toContain('Respire um instante');
    });

    it('o bloco novo substitui o cartão antigo e a barra que nunca ficou fixa', () => {
        expect(pagina).toContain('<FimDaParte');
        expect(pagina).not.toContain('Dia completo 🎉');
        expect(pagina).not.toContain("`Marcar parte ${parteUI} como lida`");
    });
});
