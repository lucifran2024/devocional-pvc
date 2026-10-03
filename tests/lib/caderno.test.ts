import { describe, expect, it } from 'vitest';

import type { BibliaInteracao } from '@/lib/supabase';
import type { AnotacaoLivre } from '@/lib/anotacoes';
import { contarPorFiltro, filtrarCaderno, montarItensCaderno, normalizarBusca, referenciaDaNota, textoLongo } from '@/lib/caderno';

// 03/10/2026: o Caderno (a 2ª aba de Anotações, quase só links de vídeo) vem
// para frente: uma lista só com as notas dos versículos, filtros e busca.

const livre = (id: string, texto: string, data: string, titulo: string | null = null): AnotacaoLivre =>
    ({ id, titulo, texto, created_at: data, updated_at: data });
const nota = (id: number, nota: string, data: string, livro = 'João', capitulo = 3, versiculo = 16): BibliaInteracao =>
    ({ id, tipo: 'nota', livro_abrev: 'jo', livro_nome: livro, capitulo, versiculo, texto_versiculo: 'Porque Deus amou o mundo tanto…', nota, created_at: data });

const ITENS = montarItensCaderno(
    [
        livre('a', 'Pregação sobre fé https://www.instagram.com/reel/ABC123/', '2026-07-26T10:00:00Z', 'Reel da fé'),
        livre('b', 'Ideias para a célula de sexta: oração e coração grato', '2026-09-01T10:00:00Z'),
    ],
    [nota(7, 'O amor de Deus é para todos', '2026-03-29T10:00:00Z'), nota(8, '', '2026-03-30T10:00:00Z')],
);

describe('Caderno: lista única', () => {
    it('junta anotações e notas dos versículos, do mais novo ao mais antigo, sem nota vazia', () => {
        expect(ITENS.map(i => i.chave)).toEqual(['l-b', 'l-a', 'b-7']);
    });

    it('conta por filtro: vídeos, versículos e textos', () => {
        expect(contarPorFiltro(ITENS)).toEqual({ tudo: 3, videos: 1, versiculos: 1, textos: 1 });
    });

    it('filtra pelo tipo escolhido', () => {
        expect(filtrarCaderno(ITENS, 'videos', '').map(i => i.chave)).toEqual(['l-a']);
        expect(filtrarCaderno(ITENS, 'versiculos', '').map(i => i.chave)).toEqual(['b-7']);
        expect(filtrarCaderno(ITENS, 'textos', '').map(i => i.chave)).toEqual(['l-b']);
    });

    it('busca sem acento, em título, texto, versículo e referência, com todas as palavras', () => {
        expect(filtrarCaderno(ITENS, 'tudo', 'coracao').map(i => i.chave)).toEqual(['l-b']);
        expect(filtrarCaderno(ITENS, 'tudo', 'REEL fé').map(i => i.chave)).toEqual(['l-a']);
        expect(filtrarCaderno(ITENS, 'tudo', 'joão 3:16').map(i => i.chave)).toEqual(['b-7']);
        expect(filtrarCaderno(ITENS, 'tudo', 'mundo amou').map(i => i.chave)).toEqual(['b-7']);
        expect(filtrarCaderno(ITENS, 'versiculos', 'célula')).toEqual([]);
    });

    it('ajudas: referência, busca normalizada e texto longo', () => {
        expect(referenciaDaNota({ livro_nome: 'Salmos', capitulo: 23, versiculo: 1 })).toBe('Salmos 23:1');
        expect(normalizarBusca('  Coração   GRATO ')).toBe('coracao grato');
        expect(textoLongo('curto')).toBe(false);
        expect(textoLongo('x'.repeat(421))).toBe(true);
        expect(textoLongo('a\nb\nc\nd\ne\nf\ng\nh')).toBe(true);
    });
});
