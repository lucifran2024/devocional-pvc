/** Retira apenas a formatação de tela: a voz lê a explicação, não símbolos Markdown. */
export function textoFaladoDaExplicacao(markdown: string): string {
    return String(markdown || '')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/<[^>]*>/g, ' ')
        .replace(/^\s*#{1,6}\s+(.+)$/gm, '$1.')
        .replace(/\*\*|__|[`*_]/g, '')
        .replace(/^\s*[-•]\s+/gm, '')
        .replace(/\s+/g, ' ')
        .replace(/\.{2,}/g, '.')
        .trim();
}

/** Falas curtas evitam que o sintetizador do Safari iOS interrompa textos longos. */
export function dividirExplicacaoEmFalas(texto: string, maxCaracteres = 180): string[] {
    const palavras = texto.trim().split(/\s+/).filter(Boolean);
    const falas: string[] = [];
    let atual = '';
    for (const palavra of palavras) {
        if (atual && atual.length + palavra.length + 1 > maxCaracteres) {
            falas.push(atual);
            atual = '';
        }
        atual = atual ? `${atual} ${palavra}` : palavra;
    }
    if (atual) falas.push(atual);
    return falas;
}
