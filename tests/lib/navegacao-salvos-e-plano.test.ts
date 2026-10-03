import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// 03/10/2026 (Lucifran: "tem hora que ele não muda para salvo"): Bíblia e Salvos
// são a mesma página (/biblioteca e /biblioteca?salvos=1). Com a Bíblia aberta,
// tocar em Salvos só trocava o endereço e o painel, que só olhava o endereço ao
// montar, não abria. O mesmo valia para a leitura (?ler=1) e o menu do plano.

const ler = (arq: string) => readFileSync(resolve(__dirname, '../../', arq), 'utf8');

describe('Salvos acompanha o endereço', () => {
    const pagina = ler('src/app/biblioteca/page.tsx');

    it('o painel abre e fecha quando o ?salvos muda, não só ao montar', () => {
        expect(pagina).toMatch(/useEffect\(\(\) => \{\s*if \(abrirSalvos\) abrirPainel\(painelAba\);\s*else setPainelAberto\(false\);/);
        expect(pagina).toMatch(/\}, \[abrirSalvos\]\);/);
    });

    it('fechar no X e abrir pelo botão da tela passam pelo endereço', () => {
        expect(pagina).toContain("router.replace('/biblioteca?salvos=1', { scroll: false })");
        expect(pagina).toContain("if (abrirSalvos) router.replace('/biblioteca', { scroll: false });");
        expect(pagina).toContain('<button onClick={fecharPainel} aria-label="Fechar salvos"');
    });
});

describe('Leitura direta e menu do plano na mesma página', () => {
    const pagina = ler('src/app/plano-de-leitura/page.tsx');
    const nav = ler('src/components/ui/Navigation.tsx');

    it('trocar ?ler=1 abre a leitura; tirar volta ao menu', () => {
        expect(pagina).toMatch(/if \(lerDirectAnteriorRef\.current === lerDirect\) return;/);
        expect(pagina).toMatch(/if \(lerDirect\) iniciarOpcao\('1'\);\s*else setActiveOption\(null\);/);
    });

    it('o "Mais" tem o atalho para a página do plano, sem mexer no botão Leitura', () => {
        expect(nav).toContain("{ name: 'Estudar a leitura do dia', desc: 'Entender, meditar e fixar', href: '/plano-de-leitura', icon: GraduationCap }");
        expect(nav).toContain("{ name: 'Leitura', href: '/plano-de-leitura?ler=1', icon: Calendar }");
        expect(nav).toMatch(/MAIS_ITENS\.some\(item => item\.href !== '\/plano-de-leitura' && itemMaisAtivo\(item\.href\)\)/);
    });
});
