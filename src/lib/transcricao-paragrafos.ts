// ============================================
// TRANSCRIÇÃO DE ÁUDIO — parágrafos pela fala.
// O Azure devolve o culto inteiro num bloco só (combinedPhrases) e, à parte,
// as frases com o tempo de cada uma (phrases). Aqui as frases viram
// parágrafos: quebra onde o pregador faz uma pausa maior ou quando o
// parágrafo já ficou longo e a frase terminou.
// ============================================

export interface FraseFalada {
    offsetMilliseconds?: number;
    durationMilliseconds?: number;
    text?: string;
    channel?: number;
}

export interface OpcoesParagrafos {
    pausaMs?: number;
    minChars?: number;
    maxChars?: number;
}

export function montarParagrafos(
    frases: FraseFalada[] | null | undefined,
    { pausaMs = 1500, minChars = 220, maxChars = 700 }: OpcoesParagrafos = {},
): string {
    const lista = (frases || [])
        .filter(f => (f.channel ?? 0) === 0 && typeof f.text === 'string' && f.text.trim())
        .sort((a, b) => (a.offsetMilliseconds ?? 0) - (b.offsetMilliseconds ?? 0));
    const paragrafos: string[] = [];
    let atual = '';
    let fimAnterior = 0;
    for (const f of lista) {
        const texto = f.text!.trim();
        const inicio = f.offsetMilliseconds ?? fimAnterior;
        const pausa = inicio - fimAnterior;
        const terminouFrase = /[.!?…]["'”’)]*$/.test(atual);
        const quebra = atual && (
            (pausa >= pausaMs && atual.length >= minChars) ||
            (atual.length >= maxChars && terminouFrase)
        );
        if (quebra) {
            paragrafos.push(atual);
            atual = texto;
        } else {
            atual = atual ? `${atual} ${texto}` : texto;
        }
        fimAnterior = inicio + (f.durationMilliseconds ?? 0);
    }
    if (atual) paragrafos.push(atual);
    return paragrafos.join('\n\n');
}
