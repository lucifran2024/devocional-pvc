import { beforeEach, describe, expect, it } from 'vitest';
import { guardarCalendario, referenciaGuardada, CALENDARIO_LOCAL_KEY } from '@/lib/calendario-leitura-local';

// 15/11/2026: sem internet a "Leitura de hoje" ficava vazia mesmo com a Bíblia
// baixada, porque o app perguntava à internet QUAL era a leitura do dia.
describe('calendário de leitura guardado no aparelho', () => {
    beforeEach(() => localStorage.clear());

    it('guarda as linhas "data | referência" e devolve a do dia pedido', () => {
        const n = guardarCalendario('2026-11-14 | Ezequiel 1-3, Hebreus 6\r\n2026-11-15 | Isaías 63-66, Hebreus 10\nlinha solta\n');
        expect(n).toBe(2);
        expect(referenciaGuardada('2026-11-15')).toBe('Isaías 63-66, Hebreus 10');
        expect(referenciaGuardada('2026-11-14')).toBe('Ezequiel 1-3, Hebreus 6');
    });

    it('dia que não está no calendário devolve null', () => {
        guardarCalendario('2026-11-15 | Isaías 63-66, Hebreus 10');
        expect(referenciaGuardada('2027-01-01')).toBeNull();
    });

    it('arquivo sem nenhuma linha válida não apaga o que já estava guardado', () => {
        guardarCalendario('2026-11-15 | Isaías 63-66, Hebreus 10');
        expect(guardarCalendario('<html>erro</html>')).toBe(0);
        expect(referenciaGuardada('2026-11-15')).toBe('Isaías 63-66, Hebreus 10');
    });

    it('conteúdo estragado no aparelho não quebra a leitura', () => {
        localStorage.setItem(CALENDARIO_LOCAL_KEY, '{quebrado');
        expect(referenciaGuardada('2026-11-15')).toBeNull();
    });
});
