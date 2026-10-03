// ===========================================
// CADERNO (03/10/2026) — Lucifran: "veja se compensa trazer essa função do
// caderno para frente, ela tá dentro de outra função". O Caderno (anotações
// livres, quase todas com vídeo do Instagram/TikTok para transcrever) era a
// 2ª aba de Anotações. Agora é uma lista só, com as notas feitas nos
// versículos, do mais novo para o mais antigo, com filtros e busca.
// ===========================================

import type { BibliaInteracao } from '@/lib/supabase';
import type { AnotacaoLivre } from '@/lib/anotacoes';
import { extrairLinksVideoSocial } from '@/lib/social-video';

export type FiltroCaderno = 'tudo' | 'videos' | 'versiculos' | 'textos';

export const FILTROS_CADERNO: { id: FiltroCaderno; rotulo: string }[] = [
    { id: 'tudo', rotulo: 'Tudo' },
    { id: 'videos', rotulo: 'Vídeos' },
    { id: 'versiculos', rotulo: 'Versículos' },
    { id: 'textos', rotulo: 'Textos' },
];

export type ItemCaderno =
    | { tipo: 'livre'; chave: string; data: string; anotacao: AnotacaoLivre; temVideo: boolean }
    | { tipo: 'biblia'; chave: string; data: string; nota: BibliaInteracao };

/** "João 3:16" */
export function referenciaDaNota(n: Pick<BibliaInteracao, 'livro_nome' | 'capitulo' | 'versiculo'>): string {
    return `${n.livro_nome} ${n.capitulo}:${n.versiculo}`;
}

/** Junta anotações e notas dos versículos, do mais novo para o mais antigo. */
export function montarItensCaderno(livres: AnotacaoLivre[], notas: BibliaInteracao[]): ItemCaderno[] {
    const itens: ItemCaderno[] = [
        ...livres.map((a): ItemCaderno => ({
            tipo: 'livre',
            chave: `l-${a.id}`,
            data: a.updated_at || a.created_at,
            anotacao: a,
            temVideo: extrairLinksVideoSocial(a.texto).length > 0,
        })),
        ...notas
            .filter(n => n.nota && n.nota.trim())
            .map((n): ItemCaderno => ({ tipo: 'biblia', chave: `b-${n.id}`, data: n.created_at || '', nota: n })),
    ];
    return itens.sort((a, b) => (Date.parse(b.data) || 0) - (Date.parse(a.data) || 0));
}

function doFiltro(item: ItemCaderno, filtro: FiltroCaderno): boolean {
    if (filtro === 'tudo') return true;
    if (filtro === 'versiculos') return item.tipo === 'biblia';
    if (item.tipo !== 'livre') return false;
    return filtro === 'videos' ? item.temVideo : !item.temVideo;
}

export function contarPorFiltro(itens: ItemCaderno[]): Record<FiltroCaderno, number> {
    return {
        tudo: itens.length,
        videos: itens.filter(i => doFiltro(i, 'videos')).length,
        versiculos: itens.filter(i => doFiltro(i, 'versiculos')).length,
        textos: itens.filter(i => doFiltro(i, 'textos')).length,
    };
}

/** Sem acento e sem diferença de maiúsculas: "coracao" acha "Coração". */
export function normalizarBusca(texto: string): string {
    return String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function textoDoItem(item: ItemCaderno): string {
    if (item.tipo === 'livre') return `${item.anotacao.titulo || ''} ${item.anotacao.texto}`;
    const n = item.nota;
    return `${referenciaDaNota(n)} ${n.texto_versiculo || ''} ${n.nota || ''}`;
}

/** Itens do filtro escolhido cujo texto tem todas as palavras buscadas. */
export function filtrarCaderno(itens: ItemCaderno[], filtro: FiltroCaderno, busca: string): ItemCaderno[] {
    const termos = normalizarBusca(busca).split(' ').filter(Boolean);
    return itens.filter(item => {
        if (!doFiltro(item, filtro)) return false;
        if (!termos.length) return true;
        const texto = normalizarBusca(textoDoItem(item));
        return termos.every(t => texto.includes(t));
    });
}

/** Texto comprido no cartão começa recolhido, com "Ver tudo". */
export function textoLongo(texto: string): boolean {
    const t = String(texto || '');
    return t.length > 420 || t.split('\n').length > 7;
}
