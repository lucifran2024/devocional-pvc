import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Contrato contra o "app abre com zoom" no iPhone (25/09/2026).
// Causas comprovadas: campos com fonte < 16px (o iOS amplia ao focar e o zoom
// continua quando o app volta do segundo plano) e toque duplo nos versículos,
// que não tinham touch-action. A pinça continua permitida (acessibilidade).
const css = readFileSync(resolve(__dirname, '../../src/app/globals.css'), 'utf8');
const layout = readFileSync(resolve(__dirname, '../../src/app/layout.tsx'), 'utf8');

describe('proteção contra zoom acidental no celular', () => {
    it('desliga o zoom de toque duplo em todos os elementos, não só em botões', () => {
        expect(css).toMatch(/(^|\n)\*\s*\{\s*touch-action:\s*manipulation;\s*\}/);
    });

    it('garante 16px nos campos de digitação em telas de toque', () => {
        const bloco = css.match(/@media\s*\(pointer:\s*coarse\)\s*\{([\s\S]*?)\n\}/);
        expect(bloco).not.toBeNull();
        expect(bloco![1]).toMatch(/input/);
        expect(bloco![1]).toMatch(/select/);
        expect(bloco![1]).toMatch(/textarea/);
        expect(bloco![1]).toMatch(/font-size:\s*16px/);
    });

    it('declara o viewport do celular sem bloquear a pinça', () => {
        expect(layout).toMatch(/width:\s*["']device-width["']/);
        expect(layout).toMatch(/initialScale:\s*1\b/);
        expect(layout).not.toMatch(/userScalable\s*:/);
        expect(layout).not.toMatch(/maximumScale\s*:/);
    });

    it('não carrega fonte sem uso na abertura', () => {
        expect(layout).not.toMatch(/Geist_Mono/);
    });
});
