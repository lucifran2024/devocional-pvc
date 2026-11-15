// Texto do capítulo para fora da tela (14/11/2026): copiar o capítulo inteiro
// e dizer, na abertura, quantos versículos tem e quanto tempo leva para ler.
export interface VersoSimples {
    verse: number;
    text: string;
}

// Leitura em voz baixa, com atenção: mais devagar que a leitura corrida (~200)
const PALAVRAS_POR_MINUTO = 170;

function contarPalavras(versiculos: VersoSimples[]): number {
    return versiculos.reduce((n, v) => n + v.text.trim().split(/\s+/).filter(Boolean).length, 0);
}

/** Minutos para ler o capítulo, arredondado para cima; nunca menos de 1. */
export function minutosDeLeitura(versiculos: VersoSimples[]): number {
    return Math.max(1, Math.ceil(contarPalavras(versiculos) / PALAVRAS_POR_MINUTO));
}

/** "36 versículos · 5 min de leitura" (vazio enquanto o texto não chegou). */
export function resumoDoCapitulo(versiculos: VersoSimples[]): string {
    if (versiculos.length === 0) return '';
    const n = versiculos.length;
    return `${n} ${n === 1 ? 'versículo' : 'versículos'} · ${minutosDeLeitura(versiculos)} min de leitura`;
}

/** O capítulo inteiro em texto simples, com a referência e a versão no topo. */
export function textoDoCapitulo(livro: string, capitulo: number, versao: string, versiculos: VersoSimples[]): string {
    const linhas = versiculos.map((v) => `${v.verse} ${v.text.trim()}`);
    return `${livro} ${capitulo} (${versao})\n\n${linhas.join('\n')}`;
}
