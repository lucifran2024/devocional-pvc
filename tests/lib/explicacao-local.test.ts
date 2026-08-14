import { describe, expect, it } from 'vitest';
import { gerarExplicacaoLocal } from '../../src/lib/explicacao-local';

describe('explicação local da parte', () => {
    it('usa somente contexto conhecido, seção e texto recebido', () => {
        const inicio = performance.now();
        const texto = gerarExplicacaoLocal({
            referencia: 'Mateus 5',
            parte: 1,
            introducao: {
                categoria: 'Evangelho',
                autor: 'Mateus',
                epoca: '60–70 d.C.',
                tema: 'Jesus, o Rei Messias',
                resumo: 'Apresenta Jesus como o Messias prometido.',
            },
            pericopes: [{ verse: 1, title: 'As Bem-Aventuranças' }],
            versiculos: [
                { verse: 1, text: 'Vendo as multidões, Jesus subiu ao monte.' },
                { verse: 3, text: 'Bem-aventurados os pobres em espírito.' },
            ],
        });
        const duracao = performance.now() - inicio;

        expect(texto).toContain('Mateus 5');
        expect(texto).toContain('As Bem-Aventuranças');
        expect(texto).toContain('Jesus, o Rei Messias');
        expect(texto).toContain('Vendo as multidões');
        expect(texto).not.toContain('oração');
        expect(duracao).toBeLessThan(50);
    });
});
