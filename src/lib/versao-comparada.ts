// Onde entra o texto da versão comparada (15/11/2026).
//
// Versões de paráfrase, como A Mensagem, juntam vários versículos num bloco só
// e entregam esse bloco no número do PRIMEIRO versículo, com a faixa escrita no
// começo do texto ("1-4 Estejam bem uns com os outros…"). Mostrado no número
// recebido, o bloco aparecia logo depois do versículo 1, no meio da faixa.
// O certo é depois do último versículo que ele cobre.

export interface VersoComparado { verse: number; text: string }

const FAIXA = /^(\d{1,3})\s*[-–—]\s*(\d{1,3})(?=\s)/;

/**
 * Devolve "depois de qual versículo" → texto.
 * `ultimoVersiculo` é o último número do capítulo na versão principal.
 */
export function encaixarComparacao(versiculos: VersoComparado[], ultimoVersiculo: number): Map<number, string> {
    const mapa = new Map<number, string>();
    for (const v of versiculos) {
        if (!v.text) continue;
        let onde = v.verse;
        const m = v.text.match(FAIXA);
        // Só é faixa deste bloco se começar no próprio versículo e terminar depois
        if (m && Number(m[1]) === v.verse && Number(m[2]) > v.verse) {
            onde = Number(m[2]);
            if (ultimoVersiculo > 0) onde = Math.min(onde, ultimoVersiculo);
        }
        const jaTem = mapa.get(onde);
        mapa.set(onde, jaTem ? `${jaTem} ${v.text}` : v.text);
    }
    return mapa;
}
