import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    BIBLIA_POSICAO_KEY,
    BIBLIA_RECENTES_KEY,
    MAX_BIBLIA_RECENTES,
    loadBibliaPosicao,
    loadBibliaRecentes,
    parseBibliaPosicao,
    persistBibliaPosicao,
    registrarBibliaRecente,
} from '@/lib/biblia-posicao';

describe('posição de leitura da Bíblia guardada no aparelho', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    it('usa chaves próprias da Bíblia', () => {
        expect(BIBLIA_POSICAO_KEY).toBe('biblia-posicao-leitura');
        expect(BIBLIA_RECENTES_KEY).toBe('biblia-recentes');
    });

    it('aceita só posição válida', () => {
        const ok = { livro: 'jo', livroNome: 'João', capitulo: 3, versiculo: 16, atualizadoEm: 1 };
        expect(parseBibliaPosicao(JSON.stringify(ok))).toEqual(ok);
        expect(parseBibliaPosicao(JSON.stringify({ ...ok, versiculo: null }))).toEqual({ ...ok, versiculo: null });
        expect(parseBibliaPosicao(JSON.stringify({ ...ok, versiculo: 0 }))).toEqual({ ...ok, versiculo: null });
        expect(parseBibliaPosicao(JSON.stringify({ ...ok, capitulo: 0 }))).toBeNull();
        expect(parseBibliaPosicao(JSON.stringify({ ...ok, capitulo: 2.5 }))).toBeNull();
        expect(parseBibliaPosicao(JSON.stringify({ ...ok, livro: '' }))).toBeNull();
        expect(parseBibliaPosicao('{quebrado')).toBeNull();
        expect(parseBibliaPosicao(null)).toBeNull();
    });

    it('guarda e devolve a última posição, com data de atualização', () => {
        expect(loadBibliaPosicao()).toBeNull();
        persistBibliaPosicao({ livro: 'sl', livroNome: 'Salmos', capitulo: 119, versiculo: 105 });
        const pos = loadBibliaPosicao();
        expect(pos).toMatchObject({ livro: 'sl', livroNome: 'Salmos', capitulo: 119, versiculo: 105 });
        expect(typeof pos!.atualizadoEm).toBe('number');
    });

    it('não quebra quando o armazenamento está indisponível', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado'); });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado'); });
        expect(loadBibliaPosicao()).toBeNull();
        expect(() => persistBibliaPosicao({ livro: 'jo', livroNome: 'João', capitulo: 1, versiculo: null })).not.toThrow();
        expect(loadBibliaRecentes()).toEqual([]);
    });

    it('lista capítulos recentes sem repetir, do mais novo ao mais antigo, com limite', () => {
        registrarBibliaRecente({ livro: 'jo', livroNome: 'João', capitulo: 3 });
        registrarBibliaRecente({ livro: 'rm', livroNome: 'Romanos', capitulo: 8 });
        registrarBibliaRecente({ livro: 'jo', livroNome: 'João', capitulo: 3 });
        expect(loadBibliaRecentes().map(r => `${r.livro} ${r.capitulo}`)).toEqual(['jo 3', 'rm 8']);

        for (let c = 1; c <= MAX_BIBLIA_RECENTES + 3; c++) {
            registrarBibliaRecente({ livro: 'sl', livroNome: 'Salmos', capitulo: c });
        }
        const recentes = loadBibliaRecentes();
        expect(recentes).toHaveLength(MAX_BIBLIA_RECENTES);
        expect(recentes[0]).toMatchObject({ livro: 'sl', capitulo: MAX_BIBLIA_RECENTES + 3 });
    });

    it('ignora itens inválidos gravados por versões antigas', () => {
        localStorage.setItem(BIBLIA_RECENTES_KEY, JSON.stringify([{ livro: 'jo', livroNome: 'João', capitulo: 3 }, { lixo: true }, 'x']));
        expect(loadBibliaRecentes()).toEqual([{ livro: 'jo', livroNome: 'João', capitulo: 3 }]);
    });
});
