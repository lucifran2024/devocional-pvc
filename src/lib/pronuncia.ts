// ============================================
// PRONÚNCIA — correções pontuais da voz do Azure.
//
// Quando a voz lê uma palavra errada (tônica no lugar errado, vogal aberta
// no lugar da fechada), a palavra entra na lista abaixo com o jeito certo
// de falar. Vale para a Bíblia e para as explicações, em qualquer voz.
//
//   { palavra: 'exemplo', fala: 'ezêmplo' }   → reescrita como se fala
//   { palavra: 'exemplo', ipa: 'eˈzẽplu' }    → fonética (IPA), mais exata
//
// A palavra casa inteira, sem diferenciar maiúsculas. A lista começa vazia:
// só entra palavra ouvida errada e conferida (ver tests/lib/pronuncia.test.ts).
// O áudio já guardado de um texto só é refeito se uma correção tocar nele.
// ============================================

export interface Correcao {
    palavra: string;
    fala?: string;
    ipa?: string;
}

export const CORRECOES: Correcao[] = [];

export function escaparXml(t: string): string {
    return t
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

const minuscula = (t: string) => t.toLocaleLowerCase('pt-BR');
const escaparRegex = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function validas(correcoes: Correcao[]): Correcao[] {
    return correcoes.filter(c => c.palavra.trim() && (c.fala?.trim() || c.ipa?.trim()));
}

function regexDe(correcoes: Correcao[]): RegExp | null {
    const palavras = validas(correcoes)
        .map(c => c.palavra.trim())
        .sort((a, b) => b.length - a.length)
        .map(escaparRegex);
    if (palavras.length === 0) return null;
    return new RegExp(`(?<![\\p{L}\\p{N}])(?:${palavras.join('|')})(?![\\p{L}\\p{N}])`, 'giu');
}

function marcar(original: string, c: Correcao): string {
    if (c.ipa?.trim()) return `<phoneme alphabet='ipa' ph='${escaparXml(c.ipa.trim())}'>${escaparXml(original)}</phoneme>`;
    return `<sub alias='${escaparXml(c.fala!.trim())}'>${escaparXml(original)}</sub>`;
}

/** Texto pronto para o SSML: escapado e com as correções de pronúncia marcadas. */
export function ssmlComPronuncia(texto: string, correcoes: Correcao[] = CORRECOES): string {
    const regex = regexDe(correcoes);
    if (!regex) return escaparXml(texto);
    const porPalavra = new Map(validas(correcoes).map(c => [minuscula(c.palavra.trim()), c]));
    let saida = '';
    let pos = 0;
    for (const m of texto.matchAll(regex)) {
        const c = porPalavra.get(minuscula(m[0]));
        if (!c) continue;
        saida += escaparXml(texto.slice(pos, m.index)) + marcar(m[0], c);
        pos = m.index! + m[0].length;
    }
    return saida + escaparXml(texto.slice(pos));
}

/**
 * Identifica as correções que tocam estes textos ('' quando nenhuma).
 * Entra no endereço do áudio guardado: corrigir uma palavra refaz só os
 * áudios em que ela aparece; o resto do que já foi narrado continua valendo.
 */
export function assinaturaDePronuncia(textos: string[], correcoes: Correcao[] = CORRECOES): string {
    const regex = regexDe(correcoes);
    if (!regex) return '';
    const porPalavra = new Map(validas(correcoes).map(c => [minuscula(c.palavra.trim()), c]));
    const usadas = new Set<string>();
    for (const texto of textos) {
        for (const m of texto.matchAll(regex)) {
            const c = porPalavra.get(minuscula(m[0]));
            if (c) usadas.add(`${minuscula(c.palavra.trim())}=${c.ipa?.trim() ? `ipa:${c.ipa.trim()}` : c.fala!.trim()}`);
        }
    }
    if (usadas.size === 0) return '';
    const chave = [...usadas].sort().join('|');
    let h = 5381;
    for (let i = 0; i < chave.length; i++) h = ((h << 5) + h + chave.charCodeAt(i)) >>> 0;
    return h.toString(36);
}
