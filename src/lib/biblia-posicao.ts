// Posição de leitura da Bíblia guardada no aparelho (25/09/2026).
// Serve para abrir a Bíblia na hora onde a leitura parou — sem esperar a
// consulta ao banco — e para a tela inicial oferecer "Continuar em ...".
// O histórico no Supabase (biblia_historico_leitura) continua sendo gravado
// e é usado como reserva quando o aparelho ainda não tem posição salva.

export const BIBLIA_POSICAO_KEY = 'biblia-posicao-leitura';
export const BIBLIA_RECENTES_KEY = 'biblia-recentes';
export const MAX_BIBLIA_RECENTES = 8;

export interface BibliaPosicao {
    livro: string;
    livroNome: string;
    capitulo: number;
    versiculo: number | null;
    atualizadoEm: number;
}

export interface BibliaRecente {
    livro: string;
    livroNome: string;
    capitulo: number;
}

const inteiroPositivo = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 1;
const textoValido = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

function lerJson(chave: string): unknown {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(chave);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function gravarJson(chave: string, valor: unknown): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(chave, JSON.stringify(valor));
    } catch {
        /* quota / modo privado */
    }
}

export function parseBibliaPosicao(raw: string | null | undefined): BibliaPosicao | null {
    if (!raw) return null;
    try {
        return validarPosicao(JSON.parse(raw));
    } catch {
        return null;
    }
}

function validarPosicao(obj: unknown): BibliaPosicao | null {
    if (!obj || typeof obj !== 'object') return null;
    const p = obj as Record<string, unknown>;
    if (!textoValido(p.livro) || !textoValido(p.livroNome) || !inteiroPositivo(p.capitulo)) return null;
    return {
        livro: p.livro,
        livroNome: p.livroNome,
        capitulo: p.capitulo,
        versiculo: inteiroPositivo(p.versiculo) ? p.versiculo : null,
        atualizadoEm: typeof p.atualizadoEm === 'number' ? p.atualizadoEm : 0,
    };
}

export function loadBibliaPosicao(): BibliaPosicao | null {
    return validarPosicao(lerJson(BIBLIA_POSICAO_KEY));
}

export function persistBibliaPosicao(pos: Omit<BibliaPosicao, 'atualizadoEm'>): void {
    const valida = validarPosicao({ ...pos, atualizadoEm: Date.now() });
    if (valida) gravarJson(BIBLIA_POSICAO_KEY, valida);
}

export function loadBibliaRecentes(): BibliaRecente[] {
    const lista = lerJson(BIBLIA_RECENTES_KEY);
    if (!Array.isArray(lista)) return [];
    return lista
        .filter((r): r is BibliaRecente => !!r && typeof r === 'object'
            && textoValido((r as BibliaRecente).livro)
            && textoValido((r as BibliaRecente).livroNome)
            && inteiroPositivo((r as BibliaRecente).capitulo))
        .map(r => ({ livro: r.livro, livroNome: r.livroNome, capitulo: r.capitulo }))
        .slice(0, MAX_BIBLIA_RECENTES);
}

export function registrarBibliaRecente(item: BibliaRecente): void {
    if (!textoValido(item.livro) || !textoValido(item.livroNome) || !inteiroPositivo(item.capitulo)) return;
    const resto = loadBibliaRecentes().filter(r => !(r.livro === item.livro && r.capitulo === item.capitulo));
    gravarJson(BIBLIA_RECENTES_KEY, [
        { livro: item.livro, livroNome: item.livroNome, capitulo: item.capitulo },
        ...resto,
    ].slice(0, MAX_BIBLIA_RECENTES));
}
