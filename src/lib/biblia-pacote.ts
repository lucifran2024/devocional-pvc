// Pacote da Bíblia inteira (15/11/2026).
//
// O download para ler sem internet fazia 1.189 pedidos, um por capítulo, com o
// celular aberto; bastava alguns falharem para o pacote ficar incompleto. A
// mesma fonte oferece a tradução inteira num arquivo só (uns 6 a 8 MB): este
// módulo separa esse arquivo em capítulos, prontos para guardar no aparelho.

export interface CapituloDoPacote {
    livroId: number;
    capitulo: number;
    versiculos: { verse: number; text: string }[];
}

/** Endereço do arquivo com a tradução inteira. */
export function enderecoDoPacote(versao: string): string {
    return `https://bolls.life/static/translations/${encodeURIComponent(versao)}.json`;
}

function limpar(texto: string): string {
    return texto.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/** Separa as linhas do arquivo (livro, capítulo, versículo, texto) por capítulo. */
export function agruparPorCapitulo(linhas: unknown): CapituloDoPacote[] {
    if (!Array.isArray(linhas)) return [];
    const mapa = new Map<string, CapituloDoPacote>();
    for (const bruta of linhas) {
        const l = bruta as { book?: unknown; chapter?: unknown; verse?: unknown; text?: unknown } | null;
        if (!l || typeof l.book !== 'number' || typeof l.chapter !== 'number' || typeof l.verse !== 'number' || typeof l.text !== 'string') continue;
        const chave = `${l.book}:${l.chapter}`;
        let cap = mapa.get(chave);
        if (!cap) { cap = { livroId: l.book, capitulo: l.chapter, versiculos: [] }; mapa.set(chave, cap); }
        // Versículo repetido no arquivo: fica o primeiro.
        if (cap.versiculos.some((v) => v.verse === l.verse)) continue;
        cap.versiculos.push({ verse: l.verse as number, text: limpar(l.text) });
    }
    const caps = [...mapa.values()];
    for (const c of caps) c.versiculos.sort((a, b) => a.verse - b.verse);
    return caps.sort((a, b) => a.livroId - b.livroId || a.capitulo - b.capitulo);
}

/**
 * Confere se o pacote veio inteiro antes de guardar no aparelho: todo capítulo
 * esperado presente e com texto. (Não exige começar no versículo 1: A Mensagem
 * junta versículos e há capítulo que começa em outro número.) Devolve o
 * motivo da recusa, ou null quando está completo. Pacote recusado não é gravado
 * (não troca capítulo bom por pedaço) e o download cai na rota por capítulo.
 */
export function defeitoDoPacote(capitulos: CapituloDoPacote[], capitulosPorLivro: Record<number, number>): string | null {
    const porChave = new Map(capitulos.map((c) => [`${c.livroId}:${c.capitulo}`, c]));
    for (const [livroTexto, total] of Object.entries(capitulosPorLivro)) {
        const livroId = Number(livroTexto);
        for (let cap = 1; cap <= total; cap++) {
            const c = porChave.get(`${livroId}:${cap}`);
            if (!c || c.versiculos.length === 0) return `falta o capítulo ${livroId}:${cap}`;
            if (c.versiculos.every((v) => !v.text)) return `capítulo ${livroId}:${cap} veio sem texto`;
        }
    }
    return null;
}
