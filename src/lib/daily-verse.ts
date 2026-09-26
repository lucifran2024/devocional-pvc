// ===========================================
// VERSÍCULO DO DIA — um por dia, sem repetir no ano.
// Antes eram 39 versículos fixos (texto misturado de várias traduções,
// sem versão) que voltavam a cada 39 dias. Agora são 366 referências;
// o texto vem da NTLH — a mesma Bíblia do app — e sempre aparece com a
// versão. Compartilhado entre o cartão do início e o push da manhã, para
// os dois mostrarem o mesmo versículo em cada data.
// ===========================================

import { getAbrevFromId, parseReferencia } from '@/lib/bible-api';
import { cacheChapter, getCachedChapter } from '@/lib/bible-db';

export const VERSAO_VERSICULO_DO_DIA = 'NTLH';

// Ordem fixa (embaralhada uma vez, sem dois seguidos do mesmo livro);
// todas conferidas na NTLH. Para trocar uma, mantenha 366 e sem repetir.
export const REFERENCIAS_DO_DIA: readonly string[] = [
    '1 Pedro 4:8', 'Salmos 34:18', 'Mateus 7:7', '2 Tessalonicenses 3:3', 'Hebreus 13:5',
    'Habacuque 3:19', 'João 13:34', 'Marcos 16:15', 'Jeremias 29:11', 'Mateus 17:20',
    'Isaías 30:21', 'Salmos 30:5', 'Habacuque 3:18', '2 Coríntios 1:3', 'Isaías 9:6',
    'João 8:32', 'Provérbios 3:5-6', 'Isaías 55:9', 'Mateus 5:44', 'João 13:35',
    'Romanos 8:28', 'Lamentações 3:25', 'Romanos 12:12', 'Isaías 26:4', 'Hebreus 4:12',
    'Salmos 9:1', '2 Pedro 3:18', 'Salmos 31:24', 'Marcos 12:31', 'Hebreus 10:24',
    'Salmos 51:10', 'Mateus 5:14', 'Isaías 46:4', 'Mateus 5:6', 'Salmos 147:3',
    '1 Pedro 2:9', 'Mateus 6:6', 'Salmos 19:14', 'João 1:12', '1 Samuel 16:7',
    'Salmos 34:8', 'Filipenses 4:11', 'Gálatas 6:9', 'Jeremias 32:17', 'Oseias 6:3',
    '1 Coríntios 13:13', 'Salmos 136:1', '1 João 4:4', 'Mateus 7:12', 'Salmos 121:2',
    '2 Crônicas 20:15', 'Salmos 16:8', 'Tiago 5:16', '1 Coríntios 10:13', 'Efésios 6:10',
    'Atos 1:8', 'Salmos 8:1', 'Isaías 54:10', 'Salmos 100:5', '1 Coríntios 2:9',
    'Salmos 18:1', 'Marcos 10:27', 'Provérbios 27:17', 'Josué 1:8', 'João 16:33',
    'Salmos 23:1', 'Gênesis 18:14', '1 Coríntios 13:4', 'Cantares 8:7', 'Efésios 3:20',
    'Salmos 18:2', 'Hebreus 11:6', 'Isaías 53:5', 'Provérbios 18:10', 'João 11:25',
    'Atos 4:12', '1 Coríntios 15:58', 'Lucas 11:9', 'Romanos 12:21', 'Salmos 55:22',
    'Jeremias 31:3', '1 Crônicas 16:34', 'Isaías 40:8', 'João 14:6', 'Joel 2:13',
    'Gênesis 1:1', '1 João 3:1', 'Salmos 27:14', 'Deuteronômio 6:5', 'Lamentações 3:22-23',
    'Salmos 5:3', 'Romanos 15:4', 'Salmos 31:14', 'Isaías 12:2', 'Salmos 57:10',
    'Efésios 2:10', 'Êxodo 14:14', 'Isaías 43:1', 'Filipenses 1:6', 'Hebreus 10:23',
    'Apocalipse 21:5', 'Tiago 4:10', 'Isaías 60:1', 'João 4:24', 'Filipenses 3:14',
    'Provérbios 29:25', 'Isaías 40:31', 'Salmos 25:4', '2 Coríntios 4:16', 'Salmos 116:1',
    'João 6:37', 'Isaías 65:24', '1 Pedro 3:15', 'João 1:14', 'Mateus 6:21',
    '1 Timóteo 4:12', 'Eclesiastes 3:11', 'Neemias 8:10', 'Gênesis 1:27', 'Colossenses 3:23',
    'Gálatas 5:22-23', 'Tiago 4:8', 'Salmos 27:4', 'João 8:12', 'Salmos 107:1',
    '1 João 4:7', 'Salmos 112:7', '1 João 4:8', 'João 3:16', 'Lucas 12:32',
    'Marcos 11:24', '2 Tessalonicenses 3:16', 'Salmos 29:11', 'João 15:12', 'Salmos 3:3',
    '1 Tessalonicenses 5:11', 'Romanos 8:26', 'Salmos 9:10', 'Romanos 1:16', '2 Timóteo 3:16',
    'Salmos 42:5', 'Romanos 5:5', '2 Coríntios 5:17', 'Hebreus 12:2', '1 Timóteo 6:6',
    'Salmos 103:2', 'Josué 1:9', 'Jeremias 33:3', 'João 1:5', 'Isaías 55:6',
    'João 10:11', 'Salmos 27:1', 'Ezequiel 36:26', 'Gênesis 50:20', 'Deuteronômio 31:6',
    'Isaías 41:10', 'João 6:35', 'Salmos 34:1', '1 Pedro 1:3', 'Gálatas 2:20',
    'Lucas 19:10', 'Salmos 94:19', 'Provérbios 22:6', '1 Coríntios 16:14', 'Deuteronômio 31:8',
    'Lucas 1:37', 'Isaías 64:8', 'Tiago 1:22', 'Efésios 4:29', 'Mateus 11:28',
    'Salmos 33:20', 'Isaías 41:13', 'Romanos 12:2', 'Mateus 6:33', 'Romanos 10:17',
    'Salmos 118:24', 'Lucas 9:23', 'Salmos 33:12', 'Provérbios 19:21', 'Jeremias 17:7',
    'Filipenses 4:6', 'Salmos 4:8', 'Filipenses 4:7', 'Salmos 90:12', 'Romanos 8:1',
    'Salmos 63:1', 'João 10:10', '2 Coríntios 12:9', 'Zacarias 4:6', 'João 14:27',
    'Filipenses 4:13', 'João 10:27', 'Mateus 24:35', 'Salmos 37:5', 'Mateus 5:8',
    'João 14:18', 'Salmos 119:11', 'Mateus 28:20', 'Efésios 4:2', 'Salmos 37:4',
    'Mateus 16:24', 'Gálatas 6:2', 'Romanos 8:31', 'Hebreus 11:1', 'Números 6:24-26',
    'Gênesis 28:15', 'Números 23:19', 'Êxodo 15:2', 'Salmos 145:18', '1 Tessalonicenses 5:16-18',
    'Salmos 92:1', 'Provérbios 11:25', 'Tiago 1:5', 'Isaías 43:2', 'Colossenses 3:2',
    'Atos 20:24', '2 Crônicas 16:9', 'Romanos 6:23', 'Tiago 4:7', 'Provérbios 4:18',
    'Salmos 84:11', 'Mateus 5:16', 'Salmos 119:114', 'João 7:38', 'Provérbios 16:3',
    '1 João 4:18', 'Jó 19:25', 'Salmos 103:8', 'Mateus 11:29', 'Salmos 63:3',
    '2 Coríntios 9:7', 'Salmos 73:26', 'Miqueias 7:7', 'Eclesiastes 3:1', 'Isaías 55:11',
    'Salmos 96:1', 'Filipenses 1:21', 'Salmos 139:14', 'Tiago 1:2', 'Efésios 2:8',
    'Salmos 95:6', 'Jó 42:2', 'Salmos 51:12', 'Romanos 8:38-39', 'Salmos 138:8',
    'Filipenses 2:13', 'Apocalipse 3:20', 'Salmos 150:6', '1 João 5:14', 'Salmos 119:105',
    'Lucas 6:31', '1 João 3:18', 'Salmos 19:1', 'Romanos 8:37', 'Provérbios 15:1',
    'Salmos 68:19', '1 Crônicas 16:11', 'Salmos 143:8', '2 Crônicas 7:14', 'Colossenses 3:13',
    'Salmos 130:5', '1 João 4:19', 'Salmos 40:1', 'Marcos 9:23', 'Salmos 100:4',
    '2 Timóteo 1:7', 'Salmos 91:1', '1 Pedro 5:7', 'Salmos 91:11', 'Hebreus 4:16',
    'João 15:13', 'Jeremias 29:13', '2 Timóteo 4:7', 'João 3:17', 'Mateus 19:26',
    '1 Pedro 5:10', 'Mateus 18:20', 'Isaías 40:29', 'Lucas 18:27', 'Isaías 58:11',
    'Judas 1:24', 'Colossenses 3:15', 'João 1:1', 'Provérbios 17:22', 'Mateus 5:9',
    '1 Coríntios 10:31', 'Filipenses 4:8', 'João 14:1', 'Tiago 1:12', 'João 8:36',
    '1 João 4:16', 'Salmos 23:6', 'Tiago 1:17', 'Salmos 1:1', 'Marcos 10:45',
    'Salmos 103:12', 'Josué 24:15', 'Salmos 62:8', 'Gálatas 5:1', '1 João 1:9',
    'Mateus 4:4', 'Romanos 10:9', '1 Coríntios 13:7', 'Êxodo 34:6', 'Romanos 5:8',
    'Salmos 16:11', 'Rute 1:16', 'Salmos 56:3', 'Mateus 22:37', 'Provérbios 17:17',
    'Salmos 121:8', 'Provérbios 12:25', '2 Pedro 3:9', '2 Coríntios 5:7', 'Atos 17:28',
    'Salmos 34:4', 'Naum 1:7', 'Salmos 46:10', 'João 16:24', 'Efésios 4:32',
    'Deuteronômio 33:27', 'Mateus 6:34', '2 Coríntios 4:18', 'Salmos 71:5', 'Deuteronômio 7:9',
    'Salmos 32:8', 'Colossenses 2:6-7', 'Salmos 118:6', 'Filipenses 4:4', 'Isaías 49:15',
    'Salmos 46:1', 'Êxodo 33:14', 'Salmos 37:23', 'Colossenses 3:17', 'Isaías 43:19',
    'Salmos 91:2', 'Isaías 26:3', 'Hebreus 13:8', 'Atos 16:31', 'Provérbios 4:23',
    'João 5:24', 'Salmos 28:7', 'Isaías 30:18', 'Apocalipse 1:8', 'Salmos 127:1',
    'Apocalipse 21:4', 'Salmos 62:1', '1 Coríntios 15:57', 'Miqueias 6:8', 'Romanos 8:18',
    'Salmos 126:5', 'Romanos 15:13', 'Filipenses 4:19', 'Salmos 23:4', 'Sofonias 3:17',
    'João 20:29', 'Hebreus 6:19', 'Salmos 37:7', 'Romanos 5:1', 'Provérbios 16:9',
    'Salmos 27:13', 'Lucas 6:38', 'Salmos 25:5', 'João 15:5', '2 Samuel 22:31',
    'Salmos 86:5',
];

export function numeroDoDia(dataStr?: string): number {
    if (dataStr) {
        const [y, m, d] = dataStr.split('-').map(Number);
        return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
    }
    const hoje = new Date();
    return Math.floor(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()) / 86400000);
}

/**
 * Índice do versículo do dia — rotação sequencial que percorre as 366
 * referências antes de repetir. Aceita uma data 'YYYY-MM-DD' (no servidor,
 * com o fuso de São Paulo); sem argumento usa hoje no aparelho.
 */
export function getDailyVerseIndex(dataStr?: string): number {
    const n = REFERENCIAS_DO_DIA.length;
    return ((numeroDoDia(dataStr) % n) + n) % n;
}

export function getDailyVerseRef(dataStr?: string): string {
    return REFERENCIAS_DO_DIA[getDailyVerseIndex(dataStr)];
}

/** 'YYYY-MM-DD' de hoje (ou daqui a `dias`) no fuso do aparelho. */
export function dataLocal(dias = 0): string {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type Verso = { verse: number; text: string };

// Mesma limpeza do leitor da Bíblia (bible-api.ts) — é o que fica guardado no aparelho
function limparParaLeitura(texto: string): string {
    return texto.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

// No versículo 1 dos Salmos a NTLH traz o título do salmo em <b>…</b>
// ("Salmo de Davi."); no Versículo do Dia ele sai, fica só o versículo.
function limparSemTitulo(texto: string): string {
    return limparParaLeitura(texto.replace(/^\s*<b>[\s\S]*?<\/b>/i, ''));
}

async function buscarCapituloNtlh(livroId: number, capitulo: number): Promise<Verso[]> {
    const controle = new AbortController();
    const prazo = setTimeout(() => controle.abort(), 5000);
    try {
        const resp = await fetch(`https://bolls.life/get-chapter/NTLH/${livroId}/${capitulo}/`, {
            headers: { Accept: 'application/json' },
            signal: controle.signal,
        });
        if (!resp.ok) return [];
        const dados = await resp.json();
        return Array.isArray(dados) ? dados.map((v: Verso) => ({ verse: v.verse, text: String(v.text || '') })) : [];
    } catch {
        return [];
    } finally {
        clearTimeout(prazo);
    }
}

function juntar(versos: Verso[], inicio: number, fim: number, limpar: (t: string) => string): string | null {
    const escolhidos = versos.filter((v) => v.verse >= inicio && v.verse <= fim);
    if (escolhidos.length !== fim - inicio + 1) return null;
    return escolhidos.map((v) => limpar(v.text)).join(' ').replace(/\s+/g, ' ').trim() || null;
}

/**
 * Texto do versículo na NTLH. No aparelho usa primeiro o capítulo guardado
 * (Bíblia baixada ou já lida); sem ele, busca no bolls.life e guarda.
 * Não usa a reserva em Almeida: o rótulo "NTLH" precisa ser verdadeiro.
 */
export async function buscarTextoVersiculo(ref: string, tentativas = 2): Promise<string | null> {
    const p = parseReferencia(ref);
    if (!p || !p.versiculoInicio) return null;
    const inicio = p.versiculoInicio;
    const fim = p.versiculoFim ?? inicio;
    const noAparelho = typeof window !== 'undefined';
    // Na cópia do aparelho o título do salmo vem grudado no versículo 1
    const tituloGrudado = p.livroId === 19 && inicio === 1;

    const lerCopia = async (): Promise<Verso[]> => {
        if (!noAparelho) return [];
        try {
            return (await getCachedChapter('NTLH', p.livroId, p.capituloInicio)) || [];
        } catch {
            return []; // sem IndexedDB: segue para a rede
        }
    };

    if (!tituloGrudado) {
        const texto = juntar(await lerCopia(), inicio, fim, (t) => t);
        if (texto) return texto;
    }

    let bruto: Verso[] = [];
    for (let i = 0; i < tentativas && bruto.length === 0; i++) {
        bruto = await buscarCapituloNtlh(p.livroId, p.capituloInicio);
    }
    if (bruto.length > 0) {
        if (noAparelho) {
            // Guardar a cópia é bônus: se falhar, o versículo aparece do mesmo jeito
            const paraLeitura = bruto.map((v) => ({ verse: v.verse, text: limparParaLeitura(v.text) }));
            Promise.resolve()
                .then(() => cacheChapter('NTLH', p.livroId, p.capituloInicio, paraLeitura))
                .catch(() => { });
        }
        return juntar(bruto, inicio, fim, limparSemTitulo);
    }

    // Sem internet no versículo 1 de um salmo: melhor com o título do que sem nada
    return tituloGrudado ? juntar(await lerCopia(), inicio, fim, (t) => t) : null;
}

export interface VersiculoDoDia {
    ref: string;
    texto: string | null;
    versao: string;
}

export async function buscarVersiculoDoDia(dataStr?: string, tentativas = 2): Promise<VersiculoDoDia> {
    const ref = getDailyVerseRef(dataStr);
    return { ref, texto: await buscarTextoVersiculo(ref, tentativas), versao: VERSAO_VERSICULO_DO_DIA };
}

/** Texto para copiar/compartilhar (formato de WhatsApp que o app já usava). */
export function montarTextoVersiculo({ ref, texto, doDia = true }: { ref: string; texto: string; doDia?: boolean }): string {
    const cabecalho = doDia ? '📖 *VERSÍCULO DO DIA*' : '📖 *VERSÍCULO*';
    return `${cabecalho}\n\n"${texto}"\n— ${ref} (${VERSAO_VERSICULO_DO_DIA})\n\n📲 _Bíblia_`;
}

/** Onde a Bíblia do app deve abrir para ler o versículo no contexto. */
export function posicaoNaBiblia(ref: string): { livro: string; livroNome: string; capitulo: number; versiculo: number | null } | null {
    const p = parseReferencia(ref);
    const livro = p ? getAbrevFromId(p.livroId) : '';
    if (!p || !livro) return null;
    const livroNome = ref.replace(/\s+\d+(?::[\d–-]+)?$/, '').trim();
    return { livro, livroNome, capitulo: p.capituloInicio, versiculo: p.versiculoInicio ?? null };
}
