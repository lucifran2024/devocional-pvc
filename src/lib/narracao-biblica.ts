// ============================================
// NARRAÇÃO BÍBLICA — prepara o capítulo para a voz do Azure.
//
// O texto da NTLH chega com marcações: o título dos salmos vem em <b>
// colado no versículo 1 e cada linha poética termina em <br>. Antes, o
// áudio apagava tudo e lia emendado (título junto do versículo, poema sem
// respiro). Aqui o capítulo vira uma leitura com:
//   - anúncio do capítulo ("Salmo 23.", "Gênesis, capítulo 1.");
//   - título do salmo lido à parte, com pausa depois;
//   - pausa no fim de cada versículo conforme a pontuação;
//   - respiro curto nas linhas poéticas sem pontuação.
// Também estima em que segundo do áudio cada versículo começa, para a
// marcação na tela acompanhar a voz.
// ============================================

export interface VersoEntrada {
    verse: number;
    text: string;
    chapter?: number;
}

export interface VersoFalado {
    verse: number;
    chapter: number;
    titulo: string;
    linhas: string[];
    pausaMs: number;
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

export const PAUSA = {
    anuncio: 900,
    titulo: 700,
    linhaPoetica: 120,
    fimDeFrase: 550,
    doisPontos: 350,
    virgula: 200,
    semPontuacao: 120,
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
    return `${nome}, capítulo ${capitulo}.`;
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

export function pausaDepois(texto: string): number {
    const ultimo = terminaEm(texto);
    if (/[.!?…]/.test(ultimo)) return PAUSA.fimDeFrase;
    if (/[:;]/.test(ultimo)) return PAUSA.doisPontos;
    if (/[,—–-]/.test(ultimo)) return PAUSA.virgula;
    return PAUSA.semPontuacao;
}

function temPontuacaoFinal(texto: string): boolean {
    return /[.!?…:;,—–-]/.test(terminaEm(texto));
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
            titulo,
            linhas,
            pausaMs: pausaDepois(ultimaLinha),
        });
    }
    return preparados;
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

export function letrasDaFala(f: Fala): number {
    if (f.tipo === 'anuncio') return f.texto.length;
    return f.verso.titulo.length + f.verso.linhas.reduce((s, l) => s + l.length + 1, 0);
}

function textosDaFala(f: Fala): string[] {
    if (f.tipo === 'anuncio') return [f.texto];
    return f.verso.titulo ? [f.verso.titulo, ...f.verso.linhas] : f.verso.linhas;
}

// Sílabas aproximadas: grupos de vogais. Número vira fala longa
// ("23" = "vinte e três"), então cada algarismo conta como duas.
export function silabas(texto: string): number {
    const vogais = texto.toLowerCase().match(/[aeiouyáéíóúâêôãõàü]+/g)?.length ?? 0;
    const algarismos = texto.match(/\d/g)?.length ?? 0;
    return vogais + algarismos * 2;
}

// Pausas que a própria voz faz dentro do versículo (a do fim já é do SSML).
function pausasNaturais(f: Fala): number {
    const textos = textosDaFala(f);
    let s = 0;
    textos.forEach((t, i) => {
        const interno = i < textos.length - 1 ? t : t.replace(/[\s"'”’»)\].!?…:;,—–-]+$/u, '');
        s += (interno.match(/,/g)?.length ?? 0) * TEMPO_NATURAL.virgula;
        s += (interno.match(/[:;—–]/g)?.length ?? 0) * TEMPO_NATURAL.doisPontos;
        s += (interno.match(/[.!?…](?=\s|["'”’»)]|$)/g)?.length ?? 0) * TEMPO_NATURAL.fimDeFrase;
    });
    return s;
}

// Medido com o Azure em 03/10/2026: 3 vozes × salmo, narrativa e carta,
// transcrevendo o áudio de volta. Erro médio 0,44 s por versículo.
export const TEMPO_NATURAL = {
    inicioDoBloco: 0.5,
    virgula: 0.22,
    doisPontos: 0.36,
    fimDeFrase: 0.5,
} as const;

// Silêncio que o próprio SSML acrescenta (fora as pausas naturais da voz).
export function silencioDaFala(f: Fala): number {
    if (f.tipo === 'anuncio') return f.pausaMs;
    const v = f.verso;
    let ms = v.pausaMs + (v.titulo ? PAUSA.titulo : 0);
    for (let i = 0; i < v.linhas.length - 1; i++) {
        if (!temPontuacaoFinal(v.linhas[i])) ms += PAUSA.linhaPoetica;
    }
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
            const fimDeFrase = ultima.tipo === 'anuncio' ? false : ultima.verso.pausaMs >= PAUSA.fimDeFrase;
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

export function escaparXml(t: string): string {
    return t
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function ssmlDaFala(f: Fala): string {
    if (f.tipo === 'anuncio') return `${escaparXml(f.texto)}<break time='${f.pausaMs}ms'/>`;
    const v = f.verso;
    let s = '';
    if (v.titulo) s += `${escaparXml(v.titulo)}<break time='${PAUSA.titulo}ms'/>`;
    v.linhas.forEach((linha, i) => {
        s += escaparXml(linha);
        if (i < v.linhas.length - 1) {
            s += temPontuacaoFinal(linha) ? ' ' : `<break time='${PAUSA.linhaPoetica}ms'/>`;
        }
    });
    s += `<break time='${v.pausaMs}ms'/>`;
    return s;
}

export interface OpcoesVoz {
    voz: string;
    estilo?: string;
    velocidade?: string;
    pausaEntreFrasesMs?: number;
}

export function ssmlDoBloco(bloco: Fala[], { voz, estilo = '', velocidade = '-5%', pausaEntreFrasesMs = 150 }: OpcoesVoz): string {
    let corpo = bloco.map(ssmlDaFala).join(' ');
    corpo = `<prosody rate='${velocidade}'>${corpo}</prosody>`;
    if (estilo) corpo = `<mstts:express-as style='${estilo}'>${corpo}</mstts:express-as>`;
    if (/Multilingual/i.test(voz)) corpo = `<lang xml:lang='pt-BR'>${corpo}</lang>`;
    const silencio = pausaEntreFrasesMs > 0
        ? `<mstts:silence type='Sentenceboundary' value='${pausaEntreFrasesMs}ms'/>`
        : '';
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
