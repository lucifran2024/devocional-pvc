import { describe, expect, it } from 'vitest';
import { correcaoDaTela } from '@/lib/tela-no-lugar';

// 15/11/2026: no iPhone, depois que o teclado fecha, a tela às vezes fica
// deslocada: a barra de baixo aparece no meio e a faixa do topo some.
describe('tela deslocada depois do teclado', () => {
    it('tela no lugar: nada a corrigir', () => {
        expect(correcaoDaTela({ deslocamento: 0, zoom: 1, digitando: false })).toBe(0);
    });
    it('tela deslocada, sem teclado e sem zoom: devolve quanto rolar para voltar', () => {
        expect(correcaoDaTela({ deslocamento: 248, zoom: 1, digitando: false })).toBe(248);
    });
    it('com o teclado aberto (digitando) não mexe', () => {
        expect(correcaoDaTela({ deslocamento: 248, zoom: 1, digitando: true })).toBe(0);
    });
    it('com zoom de pinça não mexe (o deslocamento é do zoom)', () => {
        expect(correcaoDaTela({ deslocamento: 120, zoom: 1.6, digitando: false })).toBe(0);
    });
    it('diferença de menos de 2 px é ruído', () => {
        expect(correcaoDaTela({ deslocamento: 1.2, zoom: 1, digitando: false })).toBe(0);
    });
});
