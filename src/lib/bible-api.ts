// ===========================================
// BIBLE API HELPER - Busca texto bíblico da API bolls.life
// ===========================================

export interface Versiculo {
    verse: number;
    text: string;
}

// Mapeamento de livros para IDs da API
const LIVRO_PARA_ID: { [key: string]: number } = {
    'gênesis': 1, 'genesis': 1, 'gn': 1,
    'êxodo': 2, 'exodo': 2, 'ex': 2,
    'levítico': 3, 'levitico': 3, 'lv': 3,
    'números': 4, 'numeros': 4, 'nm': 4,
    'deuteronômio': 5, 'deuteronomio': 5, 'dt': 5,
    'josué': 6, 'josue': 6, 'js': 6,
    'juízes': 7, 'juizes': 7, 'jz': 7,
    'rute': 8, 'rt': 8,
    '1 samuel': 9, '1samuel': 9, '1sm': 9,
    '2 samuel': 10, '2samuel': 10, '2sm': 10,
    '1 reis': 11, '1reis': 11, '1rs': 11,
    '2 reis': 12, '2reis': 12, '2rs': 12,
    '1 crônicas': 13, '1cronicas': 13, '1cr': 13,
    '2 crônicas': 14, '2cronicas': 14, '2cr': 14,
    'esdras': 15, 'ed': 15,
    'neemias': 16, 'ne': 16,
    'ester': 17, 'et': 17,
    'jó': 18, 'jo': 18,
    'salmos': 19, 'sl': 19,
    'provérbios': 20, 'proverbios': 20, 'pv': 20,
    'eclesiastes': 21, 'ec': 21,
    'cantares': 22, 'ct': 22,
    'isaías': 23, 'isaias': 23, 'is': 23,
    'jeremias': 24, 'jr': 24,
    'lamentações': 25, 'lamentacoes': 25, 'lm': 25,
    'ezequiel': 26, 'ez': 26,
    'daniel': 27, 'dn': 27,
    'oséias': 28, 'oseias': 28, 'os': 28,
    'joel': 29, 'jl': 29,
    'amós': 30, 'amos': 30, 'am': 30,
    'obadias': 31, 'ob': 31,
    'jonas': 32, 'jn': 32,
    'miquéias': 33, 'miqueias': 33, 'mq': 33,
    'naum': 34, 'na': 34,
    'habacuque': 35, 'hc': 35,
    'sofonias': 36, 'sf': 36,
    'ageu': 37, 'ag': 37,
    'zacarias': 38, 'zc': 38,
    'malaquias': 39, 'ml': 39,
    'mateus': 40, 'mt': 40,
    'marcos': 41, 'mc': 41,
    'lucas': 42, 'lc': 42,
    'joão': 43, 'joao': 43,
    'atos': 44, 'at': 44,
    'romanos': 45, 'rm': 45,
    '1 coríntios': 46, '1corintios': 46, '1co': 46,
    '2 coríntios': 47, '2corintios': 47, '2co': 47,
    'gálatas': 48, 'galatas': 48, 'gl': 48,
    'efésios': 49, 'efesios': 49, 'ef': 49,
    'filipenses': 50, 'fp': 50,
    'colossenses': 51, 'cl': 51,
    '1 tessalonicenses': 52, '1tessalonicenses': 52, '1ts': 52,
    '2 tessalonicenses': 53, '2tessalonicenses': 53, '2ts': 53,
    '1 timóteo': 54, '1timoteo': 54, '1tm': 54,
    '2 timóteo': 55, '2timoteo': 55, '2tm': 55,
    'tito': 56, 'tt': 56,
    'filemom': 57, 'fm': 57,
    'hebreus': 58, 'hb': 58,
    'tiago': 59, 'tg': 59,
    '1 pedro': 60, '1pedro': 60, '1pe': 60,
    '2 pedro': 61, '2pedro': 61, '2pe': 61,
    '1 joão': 62, '1joao': 62, '1jo': 62,
    '2 joão': 63, '2joao': 63, '2jo': 63,
    '3 joão': 64, '3joao': 64, '3jo': 64,
    'judas': 65, 'jd': 65,
    'apocalipse': 66, 'ap': 66
};

// Mapa reverso: ID → abreviação curta (para uso no sistema de interações)
const ID_PARA_ABREV: Record<number, string> = {
    1: 'gn', 2: 'ex', 3: 'lv', 4: 'nm', 5: 'dt', 6: 'js', 7: 'jz', 8: 'rt',
    9: '1sm', 10: '2sm', 11: '1rs', 12: '2rs', 13: '1cr', 14: '2cr',
    15: 'ed', 16: 'ne', 17: 'et', 18: 'jó', 19: 'sl', 20: 'pv', 21: 'ec',
    22: 'ct', 23: 'is', 24: 'jr', 25: 'lm', 26: 'ez', 27: 'dn', 28: 'os',
    29: 'jl', 30: 'am', 31: 'ob', 32: 'jn', 33: 'mq', 34: 'na', 35: 'hc',
    36: 'sf', 37: 'ag', 38: 'zc', 39: 'ml', 40: 'mt', 41: 'mc', 42: 'lc',
    43: 'jo', 44: 'at', 45: 'rm', 46: '1co', 47: '2co', 48: 'gl', 49: 'ef',
    50: 'fp', 51: 'cl', 52: '1ts', 53: '2ts', 54: '1tm', 55: '2tm', 56: 'tt',
    57: 'fm', 58: 'hb', 59: 'tg', 60: '1pe', 61: '2pe', 62: '1jo', 63: '2jo',
    64: '3jo', 65: 'jd', 66: 'ap'
};

/**
 * Retorna a abreviação curta de um livro pelo ID
 */
export function getAbrevFromId(livroId: number): string {
    return ID_PARA_ABREV[livroId] || '';
}

/**
 * Extrai informações de uma referência bíblica como "Isaías 16-18" ou "João 3:16"
 * Retorna: { livro, capituloInicio, capituloFim, versiculoInicio?, versiculoFim? }
 */
export function parseReferencia(referencia: string): {
    livro: string;
    livroId: number;
    capituloInicio: number;
    capituloFim: number;
    versiculoInicio?: number;
    versiculoFim?: number;
} | null {
    // Normaliza: remove acentos e lowercase
    const refLower = referencia.toLowerCase().trim();

    // Regex para capturar: "Livro Capítulo-Capítulo" ou "Livro Capítulo:Versículo-Versículo"
    // Ex: "Isaías 16-18", "João 3:16", "Gênesis 1", "Salmos 119:1-8"
    const regexMultiCap = /^(.+?)\s+(\d+)[-–](\d+)$/;  // Isaías 16-18
    const regexSingleCap = /^(.+?)\s+(\d+)$/;          // Isaías 16
    const regexWithVerses = /^(.+?)\s+(\d+):(\d+)[-–]?(\d+)?$/; // João 3:16 ou João 3:1-8

    let livro: string;
    let capituloInicio: number;
    let capituloFim: number;
    let versiculoInicio: number | undefined;
    let versiculoFim: number | undefined;

    let match = refLower.match(regexMultiCap);
    if (match) {
        livro = match[1].trim();
        capituloInicio = parseInt(match[2]);
        capituloFim = parseInt(match[3]);
    } else {
        match = refLower.match(regexWithVerses);
        if (match) {
            livro = match[1].trim();
            capituloInicio = parseInt(match[2]);
            capituloFim = capituloInicio;
            versiculoInicio = parseInt(match[3]);
            versiculoFim = match[4] ? parseInt(match[4]) : versiculoInicio;
        } else {
            match = refLower.match(regexSingleCap);
            if (match) {
                livro = match[1].trim();
                capituloInicio = parseInt(match[2]);
                capituloFim = capituloInicio;
            } else {
                console.error('❌ [BIBLE-API] Não consegui parsear referência:', referencia);
                return null;
            }
        }
    }

    // Encontra o ID do livro
    const livroId = LIVRO_PARA_ID[livro];
    if (!livroId) {
        console.error('❌ [BIBLE-API] Livro não encontrado:', livro);
        return null;
    }

    return { livro, livroId, capituloInicio, capituloFim, versiculoInicio, versiculoFim };
}

/**
 * Busca um capítulo completo da API
 */
export async function buscarCapitulo(livroId: number, capitulo: number): Promise<Versiculo[]> {
    try {
        const response = await fetch(
            `https://bolls.life/get-chapter/NTLH/${livroId}/${capitulo}/`,
            { headers: { 'Accept': 'application/json' } }
        );

        if (!response.ok) {
            console.error('❌ [BIBLE-API] Erro HTTP:', response.status);
            return [];
        }

        const data = await response.json();
        if (Array.isArray(data)) {
            return data.map((v: { verse: number; text: string }) => ({
                verse: v.verse,
                // Remove tags HTML como <br> que a API retorna
                text: v.text
                    .replace(/<br\s*\/?>/gi, ' ')  // Substitui <br> por espaço
                    .replace(/<[^>]+>/g, '')       // Remove outras tags HTML
                    .replace(/\s+/g, ' ')          // Normaliza espaços múltiplos
                    .trim()
            }));
        }
        return [];
    } catch (error) {
        console.error('❌ [BIBLE-API] Erro ao buscar capítulo:', error);
        return [];
    }
}

/**
 * Busca múltiplos capítulos para uma referência como "Isaías 16-18"
 * Suporta referências multi-livro separadas por ";" como "Jeremias 51-52; Lamentações 1"
 * Retorna o texto formatado com números de versículos
 */
export async function buscarPassagem(referencia: string): Promise<{
    textoFormatado: string;
    versiculos: Versiculo[];
    capitulosCarregados: number[];
} | null> {
    // Suporte a referências multi-livro (ex: "Jeremias 51-52; Lamentações 1")
    const partes = referencia.split(';').map(p => p.trim()).filter(Boolean);

    let todosVersiculos: Versiculo[] = [];
    const capitulosCarregados: number[] = [];

    for (const parte of partes) {
        const parsed = parseReferencia(parte);
        if (!parsed) {
            console.warn('⚠️ [BIBLE-API] Não foi possível parsear parte:', parte);
            continue;
        }

        const { livroId, capituloInicio, capituloFim, versiculoInicio, versiculoFim } = parsed;

        // Busca todos os capítulos em paralelo (máximo 5 por parte)
        const capitulos: number[] = [];
        for (let c = capituloInicio; c <= Math.min(capituloFim, capituloInicio + 4); c++) {
            capitulos.push(c);
        }

        const resultados = await Promise.all(
            capitulos.map(cap => buscarCapitulo(livroId, cap))
        );

        resultados.forEach((versiculos, idx) => {
            if (versiculos.length > 0) {
                capitulosCarregados.push(capitulos[idx]);
                todosVersiculos = todosVersiculos.concat(versiculos);
            }
        });

        // Filtra por versículos se especificado
        if (versiculoInicio !== undefined && capituloInicio === capituloFim) {
            // Filtra apenas os versículos do último lote adicionado
            const lastBatchStart = todosVersiculos.length - resultados.flat().length;
            const lastBatch = todosVersiculos.slice(lastBatchStart);
            const filteredBatch = lastBatch.filter(
                v => v.verse >= versiculoInicio && v.verse <= (versiculoFim || versiculoInicio)
            );
            todosVersiculos = [...todosVersiculos.slice(0, lastBatchStart), ...filteredBatch];
        }
    }

    if (todosVersiculos.length === 0) {
        console.error('❌ [BIBLE-API] Nenhum versículo carregado para:', referencia);
        return null;
    }

    // Formata como texto legível
    const textoFormatado = todosVersiculos
        .map(v => `**${v.verse}.** ${v.text}`)
        .join('\n');

    return { textoFormatado, versiculos: todosVersiculos, capitulosCarregados };
}

/**
 * Formata versículos para exibição (limitando quantidade)
 */
export function formatarVersiculosParte(
    versiculos: Versiculo[],
    inicio: number,
    quantidade: number
): string {
    const slice = versiculos.slice(inicio, inicio + quantidade);
    return slice.map(v => `**${v.verse}.** ${v.text}`).join('\n');
}
