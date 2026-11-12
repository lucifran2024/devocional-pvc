import { ssmlComPronuncia } from './pronuncia';

/**
 * Parágrafos da explicação como a voz lê: sem símbolos de Markdown, um item
 * por parágrafo (linha em branco) e o título como parágrafo próprio.
 */
export function paragrafosFaladosDaExplicacao(markdown: string): string[] {
    return String(markdown || '')
        .replace(/\r\n?/g, '\n')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/<[^>]*>/g, ' ')
        .replace(/^[ \t]*#{1,6}[ \t]+(.+)$/gm, '\n\n$1.\n\n')
        .replace(/\*\*|__|[`*_]/g, '')
        .replace(/^[ \t]*[-•][ \t]+/gm, '')
        .split(/\n[ \t]*\n/)
        .map(p => p.replace(/\s+/g, ' ').replace(/\.{2,}/g, '.').trim())
        .filter(Boolean);
}

/** Retira apenas a formatação de tela: a voz lê a explicação, não símbolos Markdown. */
export function textoFaladoDaExplicacao(markdown: string): string {
    return paragrafosFaladosDaExplicacao(markdown).join(' ');
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

// ============================================
// NARRAÇÃO DA EXPLICAÇÃO — blocos para a voz do Azure.
//
// Antes o texto ia cortado a cada 1.200 letras, onde caísse: a voz fechava
// a entonação no meio da frase e recomeçava no bloco seguinte, e a troca de
// parágrafo soava como uma troca de frase qualquer. Agora cada bloco termina
// no fim de um parágrafo (ou, em parágrafo enorme, no fim de uma frase) e a
// troca de parágrafo ganha uma pausa própria.
// ============================================

export interface TrechoDaExplicacao {
    texto: string;
    fimDeParagrafo: boolean;
}

// Pausa acrescentada na troca de parágrafo. Somada ao respiro que a voz já
// faz no fim da frase, dá cerca de 1 s (medido com o Azure em 11/11/2026).
export const PAUSA_DE_PARAGRAFO_MS = 600;

const FIM_DE_FRASE = /(?<=[.!?…]["'”’»)\]]*)\s+/u;

function cortarEmFrases(paragrafo: string, maxCaracteres: number): string[] {
    const frases: string[] = [];
    for (let frase of paragrafo.split(FIM_DE_FRASE).map(f => f.trim()).filter(Boolean)) {
        // Frase maior que um bloco inteiro: corta na última pontuação ou espaço.
        while (frase.length > maxCaracteres) {
            const janela = frase.slice(0, maxCaracteres);
            const pontuacao = Math.max(janela.lastIndexOf(';'), janela.lastIndexOf(':'), janela.lastIndexOf(','));
            const corte = pontuacao > maxCaracteres * 0.5 ? pontuacao + 1 : janela.lastIndexOf(' ');
            const fim = corte > 0 ? corte : maxCaracteres;
            frases.push(frase.slice(0, fim).trim());
            frase = frase.slice(fim).trim();
        }
        if (frase) frases.push(frase);
    }
    return frases;
}

/** Junta os parágrafos em blocos (um pedido ao Azure cada) sem cortar frase. */
export function blocosDaExplicacao(paragrafos: string[], maxCaracteres = 1200): TrechoDaExplicacao[][] {
    const blocos: TrechoDaExplicacao[][] = [];
    let atual: TrechoDaExplicacao[] = [];
    let tamanho = 0;
    const acrescentar = (texto: string, fimDeParagrafo: boolean) => {
        if (atual.length > 0 && tamanho + texto.length + 1 > maxCaracteres) {
            blocos.push(atual);
            atual = [];
            tamanho = 0;
        }
        atual.push({ texto, fimDeParagrafo });
        tamanho += texto.length + 1;
    };
    for (const paragrafo of paragrafos.map(p => p.trim()).filter(Boolean)) {
        if (paragrafo.length <= maxCaracteres) {
            acrescentar(paragrafo, true);
            continue;
        }
        const frases = cortarEmFrases(paragrafo, maxCaracteres);
        frases.forEach((frase, i) => acrescentar(frase, i === frases.length - 1));
    }
    if (atual.length) blocos.push(atual);
    return blocos;
}

export interface OpcoesDaExplicacao {
    voz: string;
    estilo?: string;
    /** Último bloco do áudio: não acrescenta pausa depois do parágrafo final. */
    ultimo?: boolean;
}

export function ssmlDoBlocoDaExplicacao(
    bloco: TrechoDaExplicacao[],
    { voz, estilo = '', ultimo = false }: OpcoesDaExplicacao,
): string {
    let corpo = '';
    bloco.forEach((trecho, i) => {
        const fimDoBloco = i === bloco.length - 1;
        corpo += ssmlComPronuncia(trecho.texto);
        if (trecho.fimDeParagrafo && !(fimDoBloco && ultimo)) corpo += `<break time='${PAUSA_DE_PARAGRAFO_MS}ms'/>`;
        else if (!fimDoBloco) corpo += ' ';
    });
    corpo = `<prosody rate='-5%'>${corpo}</prosody>`;
    if (estilo) corpo = `<mstts:express-as style='${estilo}'>${corpo}</mstts:express-as>`;
    if (/Multilingual/i.test(voz)) corpo = `<lang xml:lang='pt-BR'>${corpo}</lang>`;
    return (
        `<speak version='1.0' xml:lang='pt-BR' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='https://www.w3.org/2001/mstts'>` +
        `<voice name='${voz}'><mstts:silence type='Sentenceboundary' value='150ms'/>${corpo}</voice></speak>`
    );
}
