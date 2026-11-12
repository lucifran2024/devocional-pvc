import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Movimento do início (12/11/2026, 2º ajuste). A regra global de "reduzir
// movimento" encurta a duração das animações, mas não o atraso: com a cascata
// da chegada (.entrada, até 300 ms de atraso e preenchimento "both"), os
// últimos blocos ficariam invisíveis nesse intervalo. Quem pediu menos
// movimento vê tudo no lugar final, na hora.
const css = readFileSync(resolve(__dirname, '../../src/app/globals.css'), 'utf8');

describe('chegada do início com "reduzir movimento"', () => {
    it('desliga a animação de chegada, sem atraso nem transparência', () => {
        const blocos = [...css.matchAll(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/g)].map((m) => m[1]);
        expect(blocos.some((b) => /\.entrada\s*\{[^}]*animation:\s*none/.test(b))).toBe(true);
    });

    it('a chegada termina sem transform sobrando (não prende elementos fixos dentro dos cartões)', () => {
        // "both" manteria o último quadro (matrix) depois da animação, medido
        // no navegador mesmo com o quadro final em "none"; "backwards" solta.
        const regra = css.match(/\n\.entrada\s*\{([^}]*)\}/);
        expect(regra).not.toBeNull();
        expect(regra![1]).toMatch(/animation:\s*subir[^;]*\bbackwards\b/);
        expect(regra![1]).not.toMatch(/\bboth\b|\bforwards\b/);
    });
});
