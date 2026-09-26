import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const getCachedChapter = vi.fn();
const cacheChapter = vi.fn();
vi.mock('@/lib/bible-db', () => ({
    getCachedChapter: (...a: unknown[]) => getCachedChapter(...a),
    cacheChapter: (...a: unknown[]) => cacheChapter(...a),
}));

import { parseReferencia } from '@/lib/bible-api';
import {
    REFERENCIAS_DO_DIA,
    buscarTextoVersiculo,
    buscarVersiculoDoDia,
    getDailyVerseIndex,
    getDailyVerseRef,
    montarTextoVersiculo,
    posicaoNaBiblia,
} from '@/lib/daily-verse';

const livro = (r: string) => r.replace(/\s+\d+:[\d-]+$/, '');

function dataMais(base: string, dias: number) {
    const [y, m, d] = base.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + dias));
    return dt.toISOString().slice(0, 10);
}

function respostaBolls(versos: { verse: number; text: string }[]) {
    return { ok: true, json: async () => versos } as Response;
}

afterEach(() => {
    getCachedChapter.mockReset();
    cacheChapter.mockReset();
});

describe('lista do Versículo do Dia', () => {
    it('tem 366 referências diferentes, todas reconhecidas, sem dois seguidos do mesmo livro', () => {
        expect(REFERENCIAS_DO_DIA).toHaveLength(366);
        expect(new Set(REFERENCIAS_DO_DIA).size).toBe(366);
        for (const ref of REFERENCIAS_DO_DIA) {
            const p = parseReferencia(ref);
            expect(p, ref).not.toBeNull();
            expect(p!.versiculoInicio, ref).toBeGreaterThan(0);
        }
        REFERENCIAS_DO_DIA.forEach((ref, i) => {
            const anterior = REFERENCIAS_DO_DIA[(i + REFERENCIAS_DO_DIA.length - 1) % REFERENCIAS_DO_DIA.length];
            expect(livro(ref), `${anterior} → ${ref}`).not.toBe(livro(anterior));
        });
    });

    it('mantém os versículos que já existiam', () => {
        for (const ref of ['Salmos 23:1', 'Filipenses 4:13', 'Jeremias 29:11', 'Isaías 40:31', 'João 3:16', 'Josué 1:9', 'Lamentações 3:22-23', 'Provérbios 3:5-6', 'Romanos 8:28', 'Mateus 11:28']) {
            expect(REFERENCIAS_DO_DIA).toContain(ref);
        }
    });

    it('não repete nenhum versículo durante um ano inteiro', () => {
        const vistos = new Set<number>();
        for (let d = 0; d < 366; d++) vistos.add(getDailyVerseIndex(dataMais('2026-09-26', d)));
        expect(vistos.size).toBe(366);
        expect(getDailyVerseRef('2026-09-26')).toBe(getDailyVerseRef('2026-09-26'));
        expect(getDailyVerseRef('2026-09-27')).not.toBe(getDailyVerseRef('2026-09-26'));
    });

    it('todas abrem na Bíblia do app no livro certo', () => {
        const pagina = readFileSync(resolve(__dirname, '../../src/app/biblioteca/page.tsx'), 'utf8');
        const abrevs = new Set([...pagina.matchAll(/abrev: '([^']+)'/g)].map((m) => m[1]));
        for (const ref of REFERENCIAS_DO_DIA) {
            const pos = posicaoNaBiblia(ref);
            expect(pos, ref).not.toBeNull();
            expect(abrevs.has(pos!.livro), `${ref} → ${pos!.livro}`).toBe(true);
        }
        expect(posicaoNaBiblia('João 3:16')).toEqual({ livro: 'jo', livroNome: 'João', capitulo: 3, versiculo: 16 });
        expect(posicaoNaBiblia('1 Coríntios 13:4')).toEqual({ livro: '1co', livroNome: '1 Coríntios', capitulo: 13, versiculo: 4 });
        expect(posicaoNaBiblia('Lamentações 3:22-23')).toEqual({ livro: 'lm', livroNome: 'Lamentações', capitulo: 3, versiculo: 22 });
    });
});

describe('texto do versículo (NTLH)', () => {
    it('usa o capítulo guardado no aparelho sem ir à rede', async () => {
        getCachedChapter.mockResolvedValue([{ verse: 1, text: 'Primeiro.' }, { verse: 16, text: 'Deus amou o mundo.' }]);
        vi.mocked(global.fetch).mockClear();
        expect(await buscarTextoVersiculo('João 3:16')).toBe('Deus amou o mundo.');
        expect(getCachedChapter).toHaveBeenCalledWith('NTLH', 43, 3);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('sem cópia no aparelho busca só na NTLH, junta faixas e guarda o capítulo', async () => {
        getCachedChapter.mockResolvedValue(null);
        cacheChapter.mockResolvedValue(undefined);
        vi.mocked(global.fetch).mockResolvedValue(respostaBolls([{ verse: 22, text: 'Parte um,' }, { verse: 23, text: '<i>parte</i> dois.' }]));
        expect(await buscarTextoVersiculo('Lamentações 3:22-23')).toBe('Parte um, parte dois.');
        const urls = vi.mocked(global.fetch).mock.calls.map((c) => String(c[0]));
        expect(urls.every((u) => u.startsWith('https://bolls.life/get-chapter/NTLH/'))).toBe(true);
        await vi.waitFor(() => expect(cacheChapter).toHaveBeenCalled());
    });

    it('não troca por outra tradução quando a NTLH não responde', async () => {
        getCachedChapter.mockResolvedValue(null);
        vi.mocked(global.fetch).mockResolvedValue({ ok: false, status: 503, json: async () => [] } as Response);
        expect(await buscarTextoVersiculo('Salmos 23:1')).toBeNull();
        const urls = vi.mocked(global.fetch).mock.calls.map((c) => String(c[0]));
        expect(urls.some((u) => u.includes('bible-api.com'))).toBe(false);
    });

    it('no versículo 1 dos Salmos tira o título ("Salmo de Davi.") e guarda a cópia do leitor intacta', async () => {
        getCachedChapter.mockResolvedValue([{ verse: 1, text: 'Salmo de Davi. O SENHOR é o meu pastor.' }]);
        cacheChapter.mockResolvedValue(undefined);
        vi.mocked(global.fetch).mockClear();
        vi.mocked(global.fetch).mockResolvedValue(respostaBolls([{ verse: 1, text: '<b>Salmo de Davi.</b><br>O SENHOR é o meu pastor.' }]));
        expect(await buscarTextoVersiculo('Salmos 23:1')).toBe('O SENHOR é o meu pastor.');
        expect(global.fetch).toHaveBeenCalled();
        await vi.waitFor(() => expect(cacheChapter).toHaveBeenCalledWith('NTLH', 19, 23, [{ verse: 1, text: 'Salmo de Davi. O SENHOR é o meu pastor.' }]));
    });

    it('sem internet no salmo usa a cópia do aparelho (melhor com título do que vazio)', async () => {
        getCachedChapter.mockResolvedValue([{ verse: 1, text: 'Salmo de Davi. O SENHOR é o meu pastor.' }]);
        vi.mocked(global.fetch).mockRejectedValue(new Error('offline'));
        expect(await buscarTextoVersiculo('Salmos 23:1')).toBe('Salmo de Davi. O SENHOR é o meu pastor.');
    });

    it('entrega referência, texto e versão para a notificação', async () => {
        getCachedChapter.mockResolvedValue(null);
        vi.mocked(global.fetch).mockResolvedValue(respostaBolls(Array.from({ length: 200 }, (_, i) => ({ verse: i + 1, text: `Verso ${i + 1}.` }))));
        const v = await buscarVersiculoDoDia('2026-09-26');
        expect(v.ref).toBe(getDailyVerseRef('2026-09-26'));
        expect(v.versao).toBe('NTLH');
        expect(v.texto).toBeTruthy();
    });

    it('texto para copiar e compartilhar traz a versão', () => {
        const t = montarTextoVersiculo({ ref: 'Salmos 23:1', texto: 'O SENHOR é o meu pastor.' });
        expect(t).toContain('📖 *VERSÍCULO DO DIA*');
        expect(t).toContain('— Salmos 23:1 (NTLH)');
        expect(montarTextoVersiculo({ ref: 'Salmos 23:1', texto: 'x', doDia: false })).toContain('📖 *VERSÍCULO*');
    });

    it('a notificação da manhã usa o mesmo versículo do cartão', () => {
        const rota = readFileSync(resolve(__dirname, '../../src/app/api/cron/push-notifications/route.ts'), 'utf8');
        expect(rota).toContain('buscarVersiculoDoDia(dataHoje)');
        expect(rota).not.toMatch(/getDailyVerse\(/);
    });
});
