import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/bible-db', () => ({ getCachedChapter: vi.fn().mockResolvedValue(null), cacheChapter: vi.fn().mockResolvedValue(undefined) }));

import { completarLigacoes, completarVersoParaGuardar } from '@/lib/explicacao-ligacoes';
import { parseReferencia } from '@/lib/bible-api';

// 02/10/2026: no protótipo a IA "citou" Salmos 27:4 como NTLH de memória, com
// texto diferente do real. A IA agora só dá a referência; o app busca a NTLH.
const EXPLICACAO = `**Contexto:**
Salmo dos filhos de Corá.

**Ligação na Bíblia:**
Salmos 27:4 — o mesmo desejo de morar na casa do Senhor.
1 Crônicas 9:19 — os coraítas eram porteiros.
João 4:24 — a terceira não entra.

**Para hoje:**
Confie em Salmos 23:1 também.`;

const NTLH: Record<string, string> = {
    'Salmos 27:4': 'A Deus, o SENHOR, pedi uma coisa.',
    '1 Crônicas 9:19': 'Salum era o chefe dos porteiros.',
    'Salmos 23:1': 'O SENHOR é o meu pastor.',
};

describe('ligações da explicação com o texto real da NTLH', () => {
    it('as referências que a IA usa são reconhecidas pela Bíblia do app', () => {
        expect(parseReferencia('Salmos 27:4')).not.toBeNull();
        expect(parseReferencia('1 Crônicas 9:19')).not.toBeNull();
    });

    it('acrescenta o texto da NTLH depois de cada referência (até 2)', async () => {
        const buscar = vi.fn(async (ref: string) => NTLH[ref] ?? null);
        const md = await completarLigacoes(EXPLICACAO, buscar);
        expect(md).toContain('Salmos 27:4 — o mesmo desejo de morar na casa do Senhor.\n\n*“A Deus, o SENHOR, pedi uma coisa.” (Salmos 27:4, NTLH)*');
        expect(md).toContain('*“Salum era o chefe dos porteiros.” (1 Crônicas 9:19, NTLH)*');
        expect(buscar).toHaveBeenCalledTimes(2);
        expect(md).not.toContain('João 4:24, NTLH');
    });

    it('não mexe fora da seção de ligação', async () => {
        const buscar = vi.fn(async (ref: string) => NTLH[ref] ?? null);
        const md = await completarLigacoes(EXPLICACAO, buscar);
        expect(md).not.toContain('O SENHOR é o meu pastor.');
        expect(md).toContain('**Para hoje:**\nConfie em Salmos 23:1 também.');
    });

    it('sem texto encontrado não inventa citação', async () => {
        const md = await completarLigacoes(EXPLICACAO, async () => null);
        expect(md).toBe(EXPLICACAO);
        const falha = await completarLigacoes(EXPLICACAO, async () => { throw new Error('offline'); });
        expect(falha).toBe(EXPLICACAO);
    });

    it('referência na mesma linha do título e explicação sem seção de ligação', async () => {
        const md = await completarLigacoes('**Ligação na Bíblia:** Salmos 27:4 — mesmo desejo.', async (r) => NTLH[r] ?? null);
        expect(md).toContain('(Salmos 27:4, NTLH)');
        expect(await completarLigacoes('**Contexto:** só isso.', async () => 'x')).toBe('**Contexto:** só isso.');
    });
});

describe('verso para guardar com o texto real da NTLH (Meditar e Viver, 03/10/2026)', () => {
    const buscar = vi.fn(async (ref: string) => (ref === 'Salmos 96:1' ? 'Cantem uma nova canção a Deus, o SENHOR.' : null));

    it('põe o texto exato logo abaixo da referência, só no verso para guardar', async () => {
        const texto = '**Em uma frase:** Deus reina.\n\n**Verso para guardar:** Salmos 96:1 — é o convite que abre a leitura.\n\n**Para pensar:** Salmos 97:10 fala de odiar o mal.';
        const r = await completarVersoParaGuardar(texto, buscar);
        expect(r).toBe('**Em uma frase:** Deus reina.\n\n**Verso para guardar:** Salmos 96:1 — é o convite que abre a leitura.\n\n*“Cantem uma nova canção a Deus, o SENHOR.” (Salmos 96:1, NTLH)*\n\n\n**Para pensar:** Salmos 97:10 fala de odiar o mal.');
        expect(buscar).toHaveBeenCalledTimes(1);
    });

    it('referência na linha de baixo também vale; sem texto encontrado, nada muda', async () => {
        const r = await completarVersoParaGuardar('**Verso para guardar:**\nSalmos 96:1 — o convite.', buscar);
        expect(r).toContain('Salmos 96:1 — o convite.\n\n*“Cantem uma nova canção a Deus, o SENHOR.” (Salmos 96:1, NTLH)*');
        const sem = '**Verso para guardar:** Efésios 4:3 — a unidade.';
        expect(await completarVersoParaGuardar(sem, buscar)).toBe(sem);
        expect(await completarVersoParaGuardar('Sem a seção.', buscar)).toBe('Sem a seção.');
    });
});
