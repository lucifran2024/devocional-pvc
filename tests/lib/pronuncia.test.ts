import { afterEach, describe, expect, it } from 'vitest';
import { CORRECOES, assinaturaDePronuncia, escaparXml, ssmlComPronuncia, type Correcao } from '@/lib/pronuncia';
import { montarFalas, prepararVersos, ssmlDoBloco } from '@/lib/narracao-biblica';
import { blocosDaExplicacao, ssmlDoBlocoDaExplicacao } from '@/lib/explicacao-audio';

const lista: Correcao[] = [
    { palavra: 'sede', fala: 'sêde' },
    { palavra: 'Seol', ipa: 'seˈɔw' },
    { palavra: 'vazia', fala: '' },
];

afterEach(() => { CORRECOES.length = 0; });

describe('correções de pronúncia', () => {
    it('sem correção cadastrada o texto sai só escapado, igual a antes', () => {
        const texto = 'O povo tinha sede & disse: "água".';
        expect(ssmlComPronuncia(texto, [])).toBe(escaparXml(texto));
        expect(assinaturaDePronuncia([texto], [])).toBe('');
    });

    it('marca a palavra inteira, sem diferenciar maiúsculas, e preserva o que está escrito', () => {
        const ssml = ssmlComPronuncia('Sede fortes. Ele tinha sede; descerá ao Seol.', lista);
        expect(ssml).toBe(
            "<sub alias='sêde'>Sede</sub> fortes. Ele tinha <sub alias='sêde'>sede</sub>; " +
            "descerá ao <phoneme alphabet='ipa' ph='seˈɔw'>Seol</phoneme>.",
        );
    });

    it('não mexe em palavra que só contém a corrigida nem em correção sem fala', () => {
        expect(ssmlComPronuncia('A sedenta sedes vazia.', lista)).toBe('A sedenta sedes vazia.');
        expect(ssmlComPronuncia('precede, sede.', lista)).toBe("precede, <sub alias='sêde'>sede</sub>.");
    });

    it('escapa o texto em volta da palavra corrigida', () => {
        expect(ssmlComPronuncia('<b>sede</b> & fome', lista)).toBe("&lt;b&gt;<sub alias='sêde'>sede</sub>&lt;/b&gt; &amp; fome");
    });

    it('a assinatura só existe quando a correção toca o texto e muda com a fala', () => {
        expect(assinaturaDePronuncia(['Ele tinha fome.'], lista)).toBe('');
        const a = assinaturaDePronuncia(['Ele tinha sede.'], lista);
        expect(a).toMatch(/^[a-z0-9]+$/);
        expect(assinaturaDePronuncia(['SEDE', 'outra linha'], lista)).toBe(a);
        expect(assinaturaDePronuncia(['Ele tinha sede.'], [{ palavra: 'sede', fala: 'séde' }])).not.toBe(a);
    });

    it('vale na narração da Bíblia e na explicação', () => {
        CORRECOES.push({ palavra: 'sede', fala: 'sêde' });
        const falas = montarFalas(prepararVersos([{ verse: 2, text: 'A minha alma tem sede de Deus.' }], 42), 19);
        expect(ssmlDoBloco(falas, { voz: 'pt-BR-AntonioNeural' })).toContain("tem <sub alias='sêde'>sede</sub> de Deus.");
        const [bloco] = blocosDaExplicacao(['Quem tem sede venha.']);
        expect(ssmlDoBlocoDaExplicacao(bloco, { voz: 'pt-BR-AntonioNeural', ultimo: true }))
            .toContain("Quem tem <sub alias='sêde'>sede</sub> venha.");
    });
});
