export type DnaCategoria =
    | 'devocional'
    | 'oracao'
    | 'versiculo'
    | 'reflexao'
    | 'exortacao'
    | 'declaracao'
    | 'outro';

export interface DnaProcessOptions {
    modoId?: string;
    filtros?: Record<string, unknown>;
    expectedCategory?: DnaCategoria | null;
    quantidadeEsperada?: number;
}

export interface DnaRejectedMessage {
    original: string;
    sanitized: string;
    reasons: string[];
}

export interface DnaProcessedResult {
    sanitizedText: string;
    messages: string[];
    rejected: DnaRejectedMessage[];
    expectedCategory: DnaCategoria | null;
    requestedCount: number | null;
    displayText: string;
}

export interface DnaGeracaoInsertRecord {
    batch_id: string;
    texto_msg: string;
    categoria: string | null;
    filtros: Record<string, unknown> | null;
    tema_principal: string | null;
    angulo_usado: string | null;
    versiculos_usados: string[] | null;
    titulo: string | null;
    imagem_central: string | null;
    abertura_tipo: string | null;
    fechamento_tipo: string | null;
    punchline: string | null;
    build_style: string;
}

interface BuildDnaGeracoesOptions {
    batchId?: string;
    categoria?: string | null;
    filtros?: Record<string, unknown>;
    temaPrincipal?: string;
    anguloUsado?: string;
    buildStyle?: string;
}

const CATEGORY_ALIASES: Record<string, DnaCategoria> = {
    devocional: 'devocional',
    oracao: 'oracao',
    oracaoes: 'oracao',
    oração: 'oracao',
    oracoes: 'oracao',
    versiculo: 'versiculo',
    versiculos: 'versiculo',
    versículo: 'versiculo',
    versículos: 'versiculo',
    reflexao: 'reflexao',
    reflexoes: 'reflexao',
    reflexão: 'reflexao',
    reflexões: 'reflexao',
    exortacao: 'exortacao',
    exortacoes: 'exortacao',
    exortação: 'exortacao',
    exortações: 'exortacao',
    declaracao: 'declaracao',
    declaracoes: 'declaracao',
    declaração: 'declaracao',
    declarações: 'declaracao',
    outro: 'outro',
};

const DAY_NAMES = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

const GREETING_BY_PERIOD: Record<string, string> = {
    manha: 'bom dia',
    tarde: 'boa tarde',
    noite: 'boa noite',
    madrugada: 'paz na madrugada',
};

const CATEGORY_TAG_PATTERN = /\*{0,2}\s*\[(?:ORA[ÇC][AÃ]O|ORACAO|REFLEX[AÃ]O|REFLEXAO|DEVOCIONAL|VERS[ÍI]CULO|VERSICULO|DECLARA[ÇC][AÃ]O|DECLARACAO|EXORTA[ÇC][AÃ]O|EXORTACAO)\]\s*\*{0,2}\s*/gi;
const INSTRUCTION_LINE_PATTERNS = [
    /^\s*(?:Okay|Ok|Certo|Claro|Perfeito),?\s+vamos gerar[^\n]*$/gim,
    /^\s*(?:Gere agora|Gerar agora|Sua tarefa|Para cada mensagem|Repita para todas)[^\n]*$/gim,
    /^\s*\[Seu planejamento breve aqui\]\s*$/gim,
    /^\s*\(Repita para todas as .*?\)\s*$/gim,
    /^\s*<\/?(?:thinking|task|output_format|filters|process_instructions)>.*$/gim,
];
const INSTRUCTION_FRAGMENT_PATTERN = /(vamos gerar|seguindo rigorosamente|para cada mensagem|repita para todas|seu planejamento breve|planejamento mental|process_instructions|output_format|gere agora)/i;
const BIBLE_REFERENCE_PATTERN = /(?:\d\s*)?[A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)*\s+\d+\s*[:.]\s*\d+(?:\s*[-–]\s*\d+)?/i;

function stripAccents(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeToken(value: string): string {
    return stripAccents(value).toLowerCase().trim();
}

function stripDecorators(value: string): string {
    return value
        .replace(/\*+/g, '')
        .replace(/#{1,6}\s/g, '')
        .replace(/>\s?/g, '')
        .replace(/[📖🌟✨💫🙏❤️💪🔥⭐️🌅🌙🚨⚡]/g, '')
        .trim();
}

function looksLikeTitle(line: string): boolean {
    const plain = stripDecorators(line);
    if (!plain) return false;
    if (plain.length > 140) return false;
    if (/^(bom dia|boa tarde|boa noite|boa madrugada|paz na|paz nesta)/i.test(plain)) return false;
    return !/[.!?]$/.test(plain);
}

function getMeaningfulLines(text: string): string[] {
    return text
        .split('\n')
        .map(stripDecorators)
        .filter((line) => line.length > 0);
}

function getBodyStart(text: string): string {
    const lines = getMeaningfulLines(text);
    if (lines.length === 0) return '';
    if (lines.length > 1 && looksLikeTitle(lines[0])) {
        return lines[1] || '';
    }
    return lines[0] || '';
}

function getWordCount(text: string): number {
    return text
        .split(/\s+/)
        .map((word) => word.trim())
        .filter(Boolean).length;
}

function extractMentionedDays(text: string): string[] {
    const normalized = normalizeToken(text);
    return DAY_NAMES.filter((day) => normalized.includes(day));
}

function isPrayerLike(text: string): boolean {
    return /\b(senhor|pai|deus,|te peço|te entrego|te agradeço|em nome de jesus|am[eé]m)\b/i.test(text);
}

function isDeclarativeLike(text: string): boolean {
    return /\b(eu declaro|hoje declaro|declaro hoje|eu creio|eu recebo|eu sou)\b/i.test(text);
}

function isExhortationLike(text: string): boolean {
    return /\b(n[aã]o desista|levante|levanta-te|creia|avance|decida hoje|persevere|pare de|entregue|confie)\b/i.test(text);
}

function isInstructionalFragment(text: string): boolean {
    return INSTRUCTION_FRAGMENT_PATTERN.test(text) || /<(?:thinking|task|output_format|filters|process_instructions)>/i.test(text);
}

function sanitizeMessageFragment(text: string): string {
    let sanitized = text
        .replace(/\r\n/g, '\n')
        .replace(/\uFEFF/g, '')
        .replace(CATEGORY_TAG_PATTERN, '')
        .replace(/^\s*MENSAGEM\s*\d+\s*[-—:]*\s*/gim, '')
        .replace(/^\s*\[\d+\/\d+\]\s*(?:DNA|Estilo)\s*$/gim, '')
        .replace(/^\s*[-—]+\s*$/gim, '')
        .trim();

    INSTRUCTION_LINE_PATTERNS.forEach((pattern) => {
        sanitized = sanitized.replace(pattern, '');
    });

    return sanitized.replace(/\n{3,}/g, '\n\n').trim();
}

export function normalizeCategoria(value: unknown): DnaCategoria | null {
    if (typeof value !== 'string') return null;
    const normalized = normalizeToken(value);
    return CATEGORY_ALIASES[normalized] || null;
}

export function inferCategoriaParaGeracao(
    modoId?: string,
    filtros?: Record<string, unknown>
): DnaCategoria | null {
    if (!filtros) return null;

    if (modoId === 'modo_estilo') {
        return normalizeCategoria(filtros.estilo ?? filtros.categoria ?? filtros.tipo ?? null);
    }

    if (modoId === 'modo_favoritas') {
        return normalizeCategoria(filtros.categoria ?? filtros.tipo ?? null);
    }

    return normalizeCategoria(filtros.categoria ?? filtros.estilo ?? filtros.tipo ?? null);
}

export function getMessageDedupKey(text: string): string {
    return normalizeToken(text).replace(/[^a-z0-9]/g, '');
}

export function sanitizeGeneratedText(text: string): string {
    let sanitized = text
        .replace(/\r\n/g, '\n')
        .replace(/\uFEFF/g, '')
        .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '\n')
        .replace(/```(?:xml|json|markdown|text)?/gi, '')
        .replace(CATEGORY_TAG_PATTERN, '');

    INSTRUCTION_LINE_PATTERNS.forEach((pattern) => {
        sanitized = sanitized.replace(pattern, '');
    });

    sanitized = sanitized
        .replace(/^\s*(?:\d+\.\s*)?<thinking>\s*$/gim, '')
        .replace(/^\s*(?:\d+\.\s*)?<\/thinking>\s*$/gim, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    return sanitized;
}

export function splitGeneratedMessages(text: string): string[] {
    const sanitized = sanitizeGeneratedText(text);
    if (!sanitized) return [];

    const splitters = [
        /\n\s*---+\s*\n/,
        /\n(?=###?\s)/,
        /\n(?=P\d{2}\s*[—–-]\s*)/,
        /\n{2,}(?=(?:\*\*)?[A-ZÀ-Ú0-9][^\n]{3,120}(?:\*\*)?\n)/,
    ];

    let fragments = [sanitized];
    for (const splitter of splitters) {
        const parts = sanitized.split(splitter).map(sanitizeMessageFragment).filter(Boolean);
        if (parts.length > 1) {
            fragments = parts;
            break;
        }
    }

    return fragments.filter((fragment) => {
        if (!fragment || fragment.length < 16) return false;
        return !isInstructionalFragment(fragment);
    });
}

export function stripMarkdownForTelegram(text: string): string {
    return sanitizeMessageFragment(text)
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/#{1,6}\s/g, '')
        .replace(/>\s?/g, '')
        .replace(/^P\d{2}\s*[—–-]\s*/gm, '')
        .trim();
}

export function splitTelegramText(text: string, limit: number = 4096): string[] {
    const plainText = stripMarkdownForTelegram(text);
    if (!plainText) return [];
    if (plainText.length <= limit) return [plainText];

    const paragraphs = plainText.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
    const chunks: string[] = [];
    let current = '';

    const pushChunk = (chunk: string) => {
        if (chunk.trim()) {
            chunks.push(chunk.trim());
        }
    };

    for (const paragraph of paragraphs) {
        const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
        if (candidate.length <= limit) {
            current = candidate;
            continue;
        }

        if (current) {
            pushChunk(current);
            current = '';
        }

        if (paragraph.length <= limit) {
            current = paragraph;
            continue;
        }

        const lines = paragraph.split('\n').map((line) => line.trim()).filter(Boolean);
        let lineChunk = '';
        for (const line of lines) {
            const nextLineChunk = lineChunk ? `${lineChunk}\n${line}` : line;
            if (nextLineChunk.length <= limit) {
                lineChunk = nextLineChunk;
                continue;
            }

            if (lineChunk) {
                pushChunk(lineChunk);
                lineChunk = '';
            }

            if (line.length <= limit) {
                lineChunk = line;
                continue;
            }

            const sentences = line.match(/[^.!?]+[.!?]?/g) || [line];
            let sentenceChunk = '';
            for (const sentence of sentences) {
                const trimmedSentence = sentence.trim();
                if (!trimmedSentence) continue;
                const nextSentenceChunk = sentenceChunk ? `${sentenceChunk} ${trimmedSentence}` : trimmedSentence;
                if (nextSentenceChunk.length <= limit) {
                    sentenceChunk = nextSentenceChunk;
                    continue;
                }

                if (sentenceChunk) {
                    pushChunk(sentenceChunk);
                    sentenceChunk = '';
                }

                if (trimmedSentence.length <= limit) {
                    sentenceChunk = trimmedSentence;
                    continue;
                }

                for (let index = 0; index < trimmedSentence.length; index += limit) {
                    pushChunk(trimmedSentence.slice(index, index + limit));
                }
            }

            if (sentenceChunk) {
                pushChunk(sentenceChunk);
            }
        }

        if (lineChunk) {
            pushChunk(lineChunk);
        }
    }

    if (current) {
        pushChunk(current);
    }

    return chunks;
}

export function validateGeneratedMessage(
    text: string,
    options: DnaProcessOptions = {}
): string[] {
    const reasons: string[] = [];
    const sanitized = sanitizeMessageFragment(text);
    const filtros = options.filtros || {};
    const expectedCategory = options.expectedCategory ?? inferCategoriaParaGeracao(options.modoId, filtros);
    const bodyStart = getBodyStart(sanitized);
    const normalizedText = normalizeToken(sanitized);

    if (!sanitized || sanitized.length < 16) {
        reasons.push('empty_fragment');
    }

    if (isInstructionalFragment(sanitized)) {
        reasons.push('instruction_leak');
    }

    const diasSemana = typeof filtros.diasSemana === 'string' ? filtros.diasSemana : '';
    if (diasSemana) {
        const allowedDays = diasSemana
            .split(',')
            .map((day) => normalizeToken(day))
            .filter(Boolean);
        const mentionedDays = extractMentionedDays(sanitized);
        const disallowedDays = mentionedDays.filter((day) => !allowedDays.includes(day));

        if (mentionedDays.length === 0) {
            reasons.push('missing_allowed_day');
        }
        if (disallowedDays.length > 0) {
            reasons.push(`disallowed_day:${disallowedDays.join(',')}`);
        }
    }

    const neutro = filtros.neutro === true;
    if (neutro && /^(bom dia|boa tarde|boa noite|boa madrugada|paz na|paz nesta)/i.test(bodyStart)) {
        reasons.push('neutral_mode_greeting');
    }

    if (!neutro && typeof filtros.periodo === 'string' && filtros.periodo.trim()) {
        const expectedGreeting = GREETING_BY_PERIOD[normalizeToken(filtros.periodo)] || normalizeToken(filtros.periodo);
        const firstLines = getMeaningfulLines(sanitized).slice(0, 2).map((line) => normalizeToken(line));
        if (!firstLines.some((line) => line.includes(expectedGreeting))) {
            reasons.push('missing_period_greeting');
        }
    }

    const tamanho = typeof filtros.tamanho === 'string' ? normalizeToken(filtros.tamanho) : '';
    const totalWords = getWordCount(sanitized);
    if (tamanho === 'curto' && totalWords > 45) {
        reasons.push('size_short_overflow');
    }
    if (tamanho === 'medio' && (totalWords < 45 || totalWords > 100)) {
        reasons.push('size_medium_out_of_range');
    }
    if (tamanho === 'longo' && totalWords < 100) {
        reasons.push('size_long_underflow');
    }

    const formato = typeof filtros.formato === 'string' ? normalizeToken(filtros.formato) : '';
    if (formato === 'lista' && !/(^\s*[-*•]\s+|^\s*\d+\.\s+)/m.test(sanitized)) {
        reasons.push('format_list_missing_markers');
    }

    switch (expectedCategory) {
        case 'oracao':
            if (!isPrayerLike(sanitized)) {
                reasons.push('category_oracao_voice');
            }
            break;
        case 'versiculo':
            if (!BIBLE_REFERENCE_PATTERN.test(sanitized)) {
                reasons.push('category_versiculo_reference');
            }
            break;
        case 'declaracao':
            if (!isDeclarativeLike(sanitized)) {
                reasons.push('category_declaracao_voice');
            }
            break;
        case 'exortacao':
            if (!isExhortationLike(sanitized)) {
                reasons.push('category_exortacao_voice');
            }
            break;
        default:
            break;
    }

    if (
        expectedCategory === 'versiculo' &&
        !normalizedText.includes('salmo') &&
        !normalizedText.includes('joao') &&
        !normalizedText.includes('mateus') &&
        !BIBLE_REFERENCE_PATTERN.test(sanitized)
    ) {
        reasons.push('category_versiculo_missing_scripture');
    }

    return [...new Set(reasons)];
}

export function processGeneratedContent(
    rawText: string,
    options: DnaProcessOptions = {}
): DnaProcessedResult {
    const sanitizedText = sanitizeGeneratedText(rawText);
    const expectedCategory = options.expectedCategory ?? inferCategoriaParaGeracao(options.modoId, options.filtros);
    const requestedCount = typeof options.quantidadeEsperada === 'number' ? options.quantidadeEsperada : null;
    const fragments = splitGeneratedMessages(sanitizedText);
    const accepted: string[] = [];
    const rejected: DnaRejectedMessage[] = [];
    const seen = new Set<string>();

    for (const fragment of fragments) {
        const sanitizedFragment = sanitizeMessageFragment(fragment);
        const reasons = validateGeneratedMessage(sanitizedFragment, {
            ...options,
            expectedCategory,
        });

        if (reasons.length > 0) {
            rejected.push({
                original: fragment,
                sanitized: sanitizedFragment,
                reasons,
            });
            continue;
        }

        const key = getMessageDedupKey(sanitizedFragment);
        if (key && seen.has(key)) {
            rejected.push({
                original: fragment,
                sanitized: sanitizedFragment,
                reasons: ['duplicate_message'],
            });
            continue;
        }

        seen.add(key);
        accepted.push(sanitizedFragment);
    }

    const messages = requestedCount ? accepted.slice(0, requestedCount) : accepted;

    return {
        sanitizedText,
        messages,
        rejected,
        expectedCategory,
        requestedCount,
        displayText: messages.join('\n\n---\n\n'),
    };
}

export function extrairVersiculos(texto: string): string[] {
    const regex = /(?:\d\s)?[A-ZÀ-Ú][a-zà-ú]+\s+\d+[:\s]*\d+(?:\s*[-–]\s*\d+)?/g;
    const matches = texto.match(regex) || [];
    return [...new Set(matches.map((match) => match.trim()))];
}

export function extrairTema(texto: string): string | null {
    const saudacoes = /^(bom dia|boa tarde|boa noite|boa madrugada|paz nesta|paz na)/i;
    const linhas = texto
        .split('\n')
        .map((linha) => stripDecorators(linha))
        .filter((linha) => linha.length > 3);

    let linhasTema = linhas;
    if (linhasTema.length > 1 && saudacoes.test(linhasTema[0])) {
        linhasTema = linhasTema.slice(1);
    }

    const linhaTema = linhasTema.find((linha) => {
        const limpa = linha.replace(/MENSAGEM\s*\d+\s*[-—]/gi, '').replace(/[-—=]+/g, '').trim();
        return limpa.length > 5 && !/^---+$/.test(limpa);
    });

    if (!linhaTema) return null;

    const limpo = linhaTema.replace(/MENSAGEM\s*\d+\s*[-—]/gi, '').trim();
    return limpo.length > 3 ? limpo.substring(0, 100) : null;
}

export function extrairTitulo(texto: string): string | null {
    const linhas = texto.split('\n').filter((linha) => linha.trim());
    const primeiraLinha = linhas[0] || '';
    const limpo = stripDecorators(primeiraLinha)
        .replace(/MENSAGEM\s*\d+\s*[-—]/gi, '')
        .trim();
    return limpo.length > 3 ? limpo.substring(0, 200) : null;
}

export function detectarAbertura(texto: string): string {
    const saudacoes = /^(bom dia|boa tarde|boa noite|boa madrugada|paz nesta|paz na)/i;
    const linhas = texto.split('\n').filter((linha) => linha.trim());
    let corpoLinhas = linhas
        .slice(1)
        .map((linha) => stripDecorators(linha))
        .filter((linha) => linha.length > 10);

    if (corpoLinhas.length > 1 && saudacoes.test(corpoLinhas[0])) {
        corpoLinhas = corpoLinhas.slice(1);
    }

    const corpoLimpo = corpoLinhas[0] || '';
    if (!corpoLimpo) return 'outro';
    if (corpoLimpo.includes('?')) return 'pergunta';
    if (/^(Pare|Olhe|Pense|Imagine|Lembre|Abra|Feche|Levante|Creia|Confie|Descanse|Entregue|Solte|Vá|Ouça|Decida|Ande|Declare|Profetize|Receba|Desperte|Celebre|Guarde|Cuide|Treine|Desvie)/i.test(corpoLimpo)) return 'imperativo';
    if (/^(Quando|Era |Naquele|Havia|No meio|Na hora|Às vezes|Tem dias|Sabe aquele|Naquele momento|O dia|A noite|Nesta|Neste|Ontem|Hoje )/i.test(corpoLimpo)) return 'cena';
    if (/^["“”>]|^(?:\d\s)?[A-ZÀ-Ú][a-zà-ú]+\s+\d+|^(A Bíblia|A Palavra|Está escrito|Diz o Senhor|Jesus disse|Paulo disse)/i.test(corpoLimpo)) return 'biblica';
    if (/^(Ele |Ela |Eles |Um homem|Uma mulher|Certo |Aquele |Pedro |Moisés |Davi |José |Abraão )/i.test(corpoLimpo)) return 'narrativa';
    if (/^(A |O |Deus |Jesus |Fé |Graça |Amor |Sua |Seu |Não |Nenhum|Todo |Cada |Quem |Somente |Ninguém)/i.test(corpoLimpo)) return 'afirmacao';
    return 'afirmacao';
}

export function detectarFechamento(texto: string): string {
    const linhas = texto.split('\n').filter((linha) => linha.trim());
    const ultimaLinha = stripDecorators(linhas[linhas.length - 1] || '');
    if (!ultimaLinha) return 'outro';
    if (/^(Senhor|Pai|Deus,|Em nome|Amém)/i.test(ultimaLinha) || ultimaLinha.toLowerCase().includes('amém')) return 'oracao';
    if (/^(Creia|Confie|Descanse|Levante|Ande|Siga|Pare|Avance|Entregue|Abrace)/i.test(ultimaLinha)) return 'imperativo';
    if (/^(Eu creio|Eu declaro|Eu confio|Nós cremos|Nós declaramos)/i.test(ultimaLinha)) return 'declaracao';
    if (/^(Deus |Ele |O Senhor |Jesus |Cristo )\w+/i.test(ultimaLinha)) return 'presenca';
    if (/^(Porque |Pois |A promessa|Está escrito)/i.test(ultimaLinha)) return 'promessa';
    return 'punchline';
}

export function extrairPunchline(texto: string): string | null {
    const linhas = texto.split('\n').filter((linha) => {
        const limpa = stripDecorators(linha).replace(/[-—]+/g, '').trim();
        return limpa.length > 5;
    });

    if (linhas.length === 0) return null;

    const ultima = stripDecorators(linhas[linhas.length - 1]);
    const frases = ultima.split(/(?<=[.!?])\s+/).filter((frase) => frase.trim().length > 3);
    const ultimaFrase = frases.length > 0 ? frases[frases.length - 1].trim() : ultima;
    return ultimaFrase.substring(0, 100);
}

export function detectarImagemCentral(texto: string): string | null {
    const textoLower = texto.toLowerCase();
    const imagensConhecidas: [string, string[]][] = [
        ['mesa', ['mesa', 'banquete', 'pão', 'alimenta', 'ceiar']],
        ['silêncio', ['silêncio', 'silencio', 'quieto', 'calado', 'espera silenciosa']],
        ['deserto', ['deserto', 'seco', 'aridez', 'árido']],
        ['construção', ['construção', 'construir', 'alicerce', 'fundamento', 'obra', 'edifica']],
        ['quarto escuro', ['escuro', 'escuridão', 'trevas', 'noite escura', 'madrugada']],
        ['tempestade', ['tempestade', 'temporal', 'ventania', 'ondas', 'mar revolto']],
        ['jardim', ['jardim', 'plantio', 'semente', 'florescer', 'brotar', 'colheita']],
        ['fogo', ['fogo', 'fornalha', 'brasa', 'chama', 'queima', 'refinar']],
        ['caminho', ['caminho', 'trilha', 'estrada', 'jornada', 'passo', 'pegadas']],
        ['rio', ['rio', 'água', 'fonte', 'nascente', 'correnteza', 'sede']],
        ['montanha', ['montanha', 'monte', 'topo', 'vale', 'subida', 'cume']],
        ['porta', ['porta', 'abrir', 'fechar', 'chave', 'entrada', 'saída']],
        ['batalha', ['batalha', 'guerra', 'luta', 'arma', 'escudo', 'espada']],
        ['pastor', ['pastor', 'ovelha', 'rebanho', 'aprisco', 'cajado']],
        ['refúgio', ['refúgio', 'abrigo', 'esconderijo', 'fortaleza', 'rocha']],
        ['cura', ['cura', 'ferida', 'cicatriz', 'restaura', 'sarar']],
        ['coroa', ['coroa', 'trono', 'reinado', 'reino', 'cetro']],
        ['âncora', ['âncora', 'ancora', 'firme', 'porto', 'seguro']],
    ];

    let melhorMatch: string | null = null;
    let maxHits = 0;

    for (const [imagem, keywords] of imagensConhecidas) {
        const hits = keywords.filter((keyword) => textoLower.includes(keyword)).length;
        if (hits > maxHits) {
            maxHits = hits;
            melhorMatch = imagem;
        }
    }

    return maxHits >= 1 ? melhorMatch : null;
}

export function buildDnaGeracaoRecords(
    mensagens: string[],
    options: BuildDnaGeracoesOptions = {}
): { batchId: string; records: DnaGeracaoInsertRecord[] } {
    const batchId = options.batchId || crypto.randomUUID();
    const categoria = options.categoria ? normalizeCategoria(options.categoria) || options.categoria : null;

    const records = mensagens.map((texto) => {
        const textoLimpo = sanitizeMessageFragment(texto);
        const versiculosExtraidos = extrairVersiculos(textoLimpo);
        const temaExtraido = options.temaPrincipal || extrairTema(textoLimpo);
        const tituloExtraido = extrairTitulo(textoLimpo);
        const imagemCentral = detectarImagemCentral(textoLimpo);
        const aberturaTipo = detectarAbertura(textoLimpo);
        const fechamentoTipo = detectarFechamento(textoLimpo);
        const punchline = extrairPunchline(textoLimpo);

        return {
            batch_id: batchId,
            texto_msg: textoLimpo,
            categoria: categoria || null,
            filtros: options.filtros || null,
            tema_principal: temaExtraido || null,
            angulo_usado: options.anguloUsado || null,
            versiculos_usados: versiculosExtraidos.length > 0 ? versiculosExtraidos : null,
            titulo: tituloExtraido,
            imagem_central: imagemCentral,
            abertura_tipo: aberturaTipo,
            fechamento_tipo: fechamentoTipo,
            punchline,
            build_style: options.buildStyle || 'favoritas',
        };
    });

    return { batchId, records };
}
