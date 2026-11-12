// ============================================
// NARRAÇÃO BÍBLICA — prepara o capítulo para a voz do Azure.
//
// O texto da NTLH chega com marcações: o título dos salmos vem em <b>
// colado no versículo 1 e cada linha poética termina em <br>. Antes, o
// áudio apagava tudo e lia emendado (título junto do versículo, poema sem
// respiro). Aqui o capítulo vira uma leitura com:
//   - anúncio do capítulo ("Salmo 23.", "Gênesis capítulo 1.");
//   - título da seção (o mesmo da tela) e título do salmo lidos à parte;
//   - pausa só onde há pontuação: a frase que continua na linha ou no
//     versículo seguinte é lida corrida, sem fechar a entonação no meio.
// Ritmo de 12/11/2026, medido contra a leitura que Lucifran escolheu como
// referência (Isaías 51): cerca de 12 pausas por minuto, meio segundo no
// fim da frase, vírgula quase sem parada.
// Também estima em que segundo do áudio cada versículo começa, para a
// marcação na tela acompanhar a voz.
// ============================================

import { escaparXml, ssmlComPronuncia } from './pronuncia';

export interface VersoEntrada {
    verse: number;
    text: string;
    chapter?: number;
}

// Como o versículo termina: decide onde o bloco pode ser cortado.
export type FimDoVerso = 'frase' | 'doisPontos' | 'virgula' | 'aberto';

export interface VersoFalado {
    verse: number;
    chapter: number;
    /** Título da seção que começa neste versículo (bible-pericopes.ts). */
    secao: string;
    /** Título que vem no próprio texto (o cabeçalho dos salmos). */
    titulo: string;
    linhas: string[];
    fim: FimDoVerso;
}

export type Fala =
    | { tipo: 'anuncio'; texto: string; pausaMs: number }
    | { tipo: 'verso'; verso: VersoFalado };

export interface Segmento {
    verse: number;
    chapter: number;
    start: number;
    end: number;
}

// Silêncio acrescentado pelo SSML, além do respiro que a voz já faz na
// pontuação. Totais ouvidos (Macerio, medidos em 12/11/2026):
//   anúncio ≈ 0,75 s · título ≈ 0,65 s · dois-pontos ≈ 0,5 s ·
//   título no meio do capítulo ≈ 0,8 a 1,2 s antes.
// Até 12/11/2026 eram 900/700 ms e mais 550 ms em todo fim de versículo
// (≈ 1 s, sempre igual) e 120 ms em toda linha de poema.
export const PAUSA = {
    anuncio: 250,
    titulo: 150,
    antesDoTitulo: 300,
    doisPontos: 350,
} as const;

// Ajustes de silêncio da própria voz (mstts:silence).
export const SILENCIO = {
    entreFrases: 250, // fim de frase ≈ 0,5 s
    virgula: 20,      // vírgula ≈ 0,2 s (o natural da voz era ≈ 0,4 s)
} as const;

const MAX_VERSO_CHARS = 1500;

// Nomes como se falam (1 Samuel → "Primeiro Samuel").
const NOME_FALADO: Record<number, string> = {
    1: 'Gênesis', 2: 'Êxodo', 3: 'Levítico', 4: 'Números', 5: 'Deuteronômio',
    6: 'Josué', 7: 'Juízes', 8: 'Rute', 9: 'Primeiro Samuel', 10: 'Segundo Samuel',
    11: 'Primeiro Reis', 12: 'Segundo Reis', 13: 'Primeiro Crônicas', 14: 'Segundo Crônicas',
    15: 'Esdras', 16: 'Neemias', 17: 'Ester', 18: 'Jó', 19: 'Salmos',
    20: 'Provérbios', 21: 'Eclesiastes', 22: 'Cantares', 23: 'Isaías',
    24: 'Jeremias', 25: 'Lamentações', 26: 'Ezequiel', 27: 'Daniel',
    28: 'Oseias', 29: 'Joel', 30: 'Amós', 31: 'Obadias', 32: 'Jonas',
    33: 'Miqueias', 34: 'Naum', 35: 'Habacuque', 36: 'Sofonias',
    37: 'Ageu', 38: 'Zacarias', 39: 'Malaquias', 40: 'Mateus',
    41: 'Marcos', 42: 'Lucas', 43: 'João', 44: 'Atos', 45: 'Romanos',
    46: 'Primeira Coríntios', 47: 'Segunda Coríntios', 48: 'Gálatas', 49: 'Efésios',
    50: 'Filipenses', 51: 'Colossenses', 52: 'Primeira Tessalonicenses', 53: 'Segunda Tessalonicenses',
    54: 'Primeira Timóteo', 55: 'Segunda Timóteo', 56: 'Tito', 57: 'Filemom',
    58: 'Hebreus', 59: 'Tiago', 60: 'Primeira Pedro', 61: 'Segunda Pedro',
    62: 'Primeira João', 63: 'Segunda João', 64: 'Terceira João', 65: 'Judas', 66: 'Apocalipse',
};

// Livros de um capítulo só: o anúncio é só o nome.
const CAPITULO_UNICO = new Set([31, 57, 63, 64, 65]);

export function anuncioDoCapitulo(livroId: number, capitulo: number): string {
    if (livroId === 19) return `Salmo ${capitulo}.`;
    const nome = NOME_FALADO[livroId];
    if (!nome) return '';
    if (CAPITULO_UNICO.has(livroId)) return `${nome}.`;
    // Sem vírgula: com ela a voz parava depois do nome do livro.
    return `${nome} capítulo ${capitulo}.`;
}

const ENTIDADES: Record<string, string> = {
    '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&lt;': '<', '&gt;': '>',
};

export function limparLinha(t: string): string {
    return t
        .replace(/<[^>]*>/g, ' ')
        .replace(/&(nbsp|amp|quot|#39|apos|lt|gt);/g, (m) => ENTIDADES[m] ?? ' ')
        .replace(/\*\*/g, '')
        .replace(/[*_#`]/g, '')
        // A NTLH escreve o nome de Deus em maiúsculas; a voz lê melhor normal.
        .replace(/\bSENHOR\b/g, 'Senhor')
        .replace(/\s+/g, ' ')
        .trim();
}

// Separa o título (<b> no começo), as linhas poéticas (<br>) e o resto.
export function separarVerso(texto: string): { titulo: string; linhas: string[] } {
    let resto = String(texto || '').slice(0, MAX_VERSO_CHARS * 2);
    let titulo = '';
    const negrito = resto.match(/^\s*<b>([\s\S]*?)<\/b>/i);
    if (negrito) {
        titulo = limparLinha(negrito[1]);
        resto = resto.slice(negrito[0].length);
    }
    const linhas = resto
        .split(/<br\s*\/?>/i)
        .map(limparLinha)
        .filter(Boolean);
    return { titulo, linhas };
}

function terminaEm(texto: string): string {
    const limpo = texto.replace(/["'”’»)\]\s]+$/u, '');
    return limpo.slice(-1);
}

export function fimDoTexto(texto: string): FimDoVerso {
    const ultimo = terminaEm(texto);
    if (/[.!?…]/.test(ultimo)) return 'frase';
    if (/[:;]/.test(ultimo)) return 'doisPontos';
    if (/[,—–-]/.test(ultimo)) return 'virgula';
    return 'aberto';
}

/** Silêncio que o SSML acrescenta depois de uma linha: só nos dois-pontos, que anunciam uma fala. */
export function pausaDepois(texto: string): number {
    return terminaEm(texto) === ':' ? PAUSA.doisPontos : 0;
}

/** Título lido como frase própria: ganha ponto final se vier sem pontuação. */
export function tituloFalado(titulo: string): string {
    const t = titulo.trim();
    return t && !/[.!?…:]$/.test(t) ? `${t}.` : t;
}

export function prepararVersos(versos: VersoEntrada[], capituloPadrao: number): VersoFalado[] {
    const preparados: VersoFalado[] = [];
    for (const v of versos) {
        const verse = Number(v.verse);
        if (!verse) continue;
        const { titulo, linhas } = separarVerso(v.text);
        if (!titulo && linhas.length === 0) continue;
        const ultimaLinha = linhas[linhas.length - 1] || titulo;
        preparados.push({
            verse,
            chapter: Number(v.chapter) || capituloPadrao,
            secao: '',
            titulo,
            linhas,
            fim: fimDoTexto(ultimaLinha),
        });
    }
    return preparados;
}

/**
 * Põe em cada versículo o título da seção que começa nele (o mesmo que a
 * tela mostra). `tituloDe` devolve '' quando não há título naquele ponto.
 */
export function comTitulosDeSecao(
    versos: VersoFalado[],
    tituloDe: (capitulo: number, versiculo: number) => string | null | undefined,
): VersoFalado[] {
    return versos.map(v => ({ ...v, secao: tituloFalado(limparLinha(tituloDe(v.chapter, v.verse) || '')) }));
}

// Põe o anúncio antes do versículo 1 de cada capítulo da lista.
export function montarFalas(versos: VersoFalado[], livroId: number): Fala[] {
    const falas: Fala[] = [];
    for (const verso of versos) {
        if (verso.verse === 1) {
            const texto = anuncioDoCapitulo(livroId, verso.chapter);
            if (texto) falas.push({ tipo: 'anuncio', texto, pausaMs: PAUSA.anuncio });
        }
        falas.push({ tipo: 'verso', verso });
    }
    return falas;
}

// Tudo o que a voz fala num versículo, na ordem: seção, título, linhas.
function textosDoVerso(v: VersoFalado): string[] {
    return [v.secao, tituloFalado(v.titulo), ...v.linhas].filter(Boolean);
}

export function letrasDaFala(f: Fala): number {
    if (f.tipo === 'anuncio') return f.texto.length;
    return textosDoVerso(f.verso).reduce((s, l) => s + l.length + 1, 0);
}

function textosDaFala(f: Fala): string[] {
    return f.tipo === 'anuncio' ? [f.texto] : textosDoVerso(f.verso);
}

// Sílabas aproximadas: grupos de vogais. Número vira fala longa
// ("23" = "vinte e três"), então cada algarismo conta como duas.
export function silabas(texto: string): number {
    const vogais = texto.toLowerCase().match(/[aeiouyáéíóúâêôãõàü]+/g)?.length ?? 0;
    const algarismos = texto.match(/\d/g)?.length ?? 0;
    return vogais + algarismos * 2;
}

// Pausas que a própria voz faz na pontuação (as do SSML são somadas à parte).
function pausasNaturais(f: Fala): number {
    let s = 0;
    for (const t of textosDaFala(f)) {
        s += (t.match(/,/g)?.length ?? 0) * TEMPO_NATURAL.virgula;
        s += (t.match(/[:;—–]/g)?.length ?? 0) * TEMPO_NATURAL.doisPontos;
        s += (t.match(/[.!?…](?=\s|["'”’»)\]]|$)/g)?.length ?? 0) * TEMPO_NATURAL.fimDeFrase;
    }
    return s;
}

// Pesos de tempo da pontuação na estimativa (não são a pausa ouvida: somam
// também o alongamento da voz antes dela). Ajustados em 12/11/2026 com o
// Azure (Macerio) em Isaías 51, João 3 e Hebreus 6, comparando com o começo
// real de cada versículo: erro médio 0,43 s (era 0,44 s no ritmo anterior).
export const TEMPO_NATURAL = {
    inicioDoBloco: 0.1,
    virgula: 0.5,
    doisPontos: 0.1,
    fimDeFrase: 1.2,
} as const;

// Silêncio que o próprio SSML acrescenta (fora as pausas naturais da voz).
export function silencioDaFala(f: Fala): number {
    if (f.tipo === 'anuncio') return f.pausaMs;
    const v = f.verso;
    let ms = 0;
    if (v.secao) ms += (v.verse === 1 ? 0 : PAUSA.antesDoTitulo) + PAUSA.titulo;
    if (v.titulo) ms += PAUSA.titulo;
    for (const linha of v.linhas) ms += pausaDepois(linha);
    return ms;
}

// Divide em blocos (um pedido ao Azure cada). Corta de preferência no fim
// de uma frase, para a voz não recomeçar no meio dela.
export function montarBlocos(falas: Fala[], maxChars = 1400, limiteDuro = 2200): Fala[][] {
    const blocos: Fala[][] = [];
    let atual: Fala[] = [];
    let tamanho = 0;
    for (const f of falas) {
        const letras = letrasDaFala(f);
        if (atual.length > 0) {
            const ultima = atual[atual.length - 1];
            const fimDeFrase = ultima.tipo === 'anuncio' ? false : ultima.verso.fim === 'frase';
            const passou = tamanho + letras > maxChars;
            const estourou = tamanho + letras > limiteDuro;
            const anuncioNovo = f.tipo === 'anuncio';
            if ((passou && (fimDeFrase || anuncioNovo)) || estourou) {
                blocos.push(atual);
                atual = [];
                tamanho = 0;
            }
        }
        atual.push(f);
        tamanho += letras;
    }
    if (atual.length) blocos.push(atual);
    return blocos;
}

// Texto que vai à voz: escapado e com as correções de pronúncia (pronuncia.ts).
export { escaparXml };

/** Linhas faladas dos versículos, para saber se alguma correção de pronúncia toca o capítulo. */
export function textosFalados(versos: VersoFalado[]): string[] {
    return versos.flatMap(textosDoVerso);
}

/** Títulos de seção que entram neste áudio: mudou um título, muda o endereço do áudio guardado. */
export function assinaturaDosTitulos(versos: VersoFalado[]): string {
    const chave = versos.filter(v => v.secao).map(v => `${v.chapter}:${v.verse}=${v.secao}`).join('|');
    if (!chave) return '';
    let h = 5381;
    for (let i = 0; i < chave.length; i++) h = ((h << 5) + h + chave.charCodeAt(i)) >>> 0;
    return h.toString(36);
}

const pausa = (ms: number) => (ms > 0 ? `<break time='${ms}ms'/>` : ' ');

function ssmlDaFala(f: Fala): string {
    if (f.tipo === 'anuncio') return `${escaparXml(f.texto)}${pausa(f.pausaMs)}`;
    const v = f.verso;
    let s = '';
    if (v.secao) {
        // No versículo 1 o título vem logo depois do anúncio, que já pausou.
        if (v.verse !== 1) s += pausa(PAUSA.antesDoTitulo);
        s += `${ssmlComPronuncia(v.secao)}${pausa(PAUSA.titulo)}`;
    }
    if (v.titulo) s += `${ssmlComPronuncia(tituloFalado(v.titulo))}${pausa(PAUSA.titulo)}`;
    // Só a pontuação pausa; depois dos dois-pontos, um respiro a mais.
    v.linhas.forEach((linha, i) => {
        s += ssmlComPronuncia(linha);
        const ms = pausaDepois(linha);
        if (ms > 0) s += pausa(ms);
        else if (i < v.linhas.length - 1) s += ' ';
    });
    return s;
}

export interface OpcoesVoz {
    voz: string;
    estilo?: string;
    velocidade?: string;
    pausaEntreFrasesMs?: number;
    pausaDeVirgulaMs?: number;
}

export function ssmlDoBloco(
    bloco: Fala[],
    {
        voz, estilo = '', velocidade = '-5%',
        pausaEntreFrasesMs = SILENCIO.entreFrases, pausaDeVirgulaMs = SILENCIO.virgula,
    }: OpcoesVoz,
): string {
    let corpo = bloco.map(ssmlDaFala).join(' ').replace(/\s+/g, ' ').trim();
    corpo = `<prosody rate='${velocidade}'>${corpo}</prosody>`;
    if (estilo) corpo = `<mstts:express-as style='${estilo}'>${corpo}</mstts:express-as>`;
    if (/Multilingual/i.test(voz)) corpo = `<lang xml:lang='pt-BR'>${corpo}</lang>`;
    const silencio =
        (pausaEntreFrasesMs > 0 ? `<mstts:silence type='Sentenceboundary' value='${pausaEntreFrasesMs}ms'/>` : '') +
        (pausaDeVirgulaMs > 0 ? `<mstts:silence type='Comma-exact' value='${pausaDeVirgulaMs}ms'/>` : '');
    return (
        `<speak version='1.0' xml:lang='pt-BR' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='https://www.w3.org/2001/mstts'>` +
        `<voice name='${voz}'>${silencio}${corpo}</voice></speak>`
    );
}

// Estima onde cada versículo começa e termina dentro do áudio de um bloco.
// Pausas do SSML e da pontuação são conhecidas; o resto da duração é
// dividido pelas sílabas.
export function segmentosDoBloco(bloco: Fala[], duracaoSeg: number, inicioSeg = 0): Segmento[] {
    const pausaDe = (f: Fala) => silencioDaFala(f) / 1000 + pausasNaturais(f);
    const inicio = Math.min(TEMPO_NATURAL.inicioDoBloco, duracaoSeg * 0.1);
    const pausaTotal = bloco.reduce((s, f) => s + pausaDe(f), 0);
    const silabasTotal = bloco.reduce((s, f) => s + Math.max(1, silabas(textosDaFala(f).join(' '))), 0);
    const disponivel = duracaoSeg - inicio;
    let fala = disponivel - pausaTotal;
    let fatorPausa = 1;
    if (fala < disponivel * 0.5) {
        // Áudio mais curto que o previsto: encolhe as pausas na mesma proporção.
        fala = disponivel * 0.5;
        fatorPausa = pausaTotal > 0 ? (disponivel * 0.5) / pausaTotal : 0;
    }
    const porSilaba = fala / silabasTotal;
    const segmentos: Segmento[] = [];
    let t = inicioSeg + inicio;
    for (const f of bloco) {
        const dur = Math.max(1, silabas(textosDaFala(f).join(' '))) * porSilaba + pausaDe(f) * fatorPausa;
        if (f.tipo === 'verso') {
            segmentos.push({ verse: f.verso.verse, chapter: f.verso.chapter, start: t, end: t + dur });
        }
        t += dur;
    }
    return segmentos;
}
