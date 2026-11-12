// Apresentação da Palavra da Manhã (12/11/2026). O gerador grava a categoria
// em maiúsculas e sem acento ("MEDITACAO"); a tela mostra o nome legível.
// Só apresentação: o registro no banco e o texto copiado não mudam.

import { caixaDeFrase, ehTituloEmMaiusculas } from './notificacoes';

// Saudação do início pela hora do aparelho (12/11/2026, 2º ajuste: o título
// "Um momento para a Palavra" não ficou legal).
export function saudacao(hora: number): string {
    if (hora >= 5 && hora < 12) return 'Bom dia';
    if (hora >= 12 && hora < 18) return 'Boa tarde';
    return 'Boa noite';
}

// Passagens da leitura de hoje, uma por linha no cartão "Hoje" (3º ajuste):
// "Isaías 51-54, Hebreus 7" → ["Isaías 51-54", "Hebreus 7"]. Só quebra antes
// de um livro novo, para "Salmos 84, 86" não virar "86" sozinho.
export function dividirPassagens(passagem: string | null | undefined): string[] {
    return String(passagem ?? '')
        .split(/\s*[,;]\s*(?=(?:[1-3]\s)?\p{Lu})/u)
        .map((p) => p.trim())
        .filter(Boolean);
}

// A mensagem começa com um título em MAIÚSCULAS ("O PASTOR QUE NÃO SE
// ATRASA"). No cartão ele vira a manchete, em frase normal, com a mesma regra
// das notificações (Deus, Jesus, Senhor, Espírito Santo com maiúscula).
// Sem título reconhecido, nada muda.
export function separarTitulo(mensagem: string): { titulo: string | null; corpo: string } {
    const texto = String(mensagem ?? '').replace(/\r\n?/g, '\n').trim();
    const quebra = texto.indexOf('\n');
    if (quebra === -1) return { titulo: null, corpo: texto };
    const primeira = texto.slice(0, quebra).trim()
        .replace(/^#{1,6}\s+/, '')
        .replace(/^\*\*(.+)\*\*$/, '$1')
        .replace(/^__(.+)__$/, '$1')
        .trim();
    const corpo = texto.slice(quebra + 1).trim();
    if (!corpo || !ehTituloEmMaiusculas(primeira)) return { titulo: null, corpo: texto };
    return { titulo: caixaDeFrase(primeira), corpo };
}

// Início, meio e fim da mensagem (12/11/2026, 3º ajuste: "ficou sem quebra de
// linha, tudo misturado"). O gerador pede corpo / «versículo» com a referência
// embaixo / frase de fechamento, mas às vezes cola o versículo no corpo
// ("…caminho." (Salmos 119:105). Deus não…). A tela separa: versículo em bloco
// próprio com a referência, parágrafos, e a frase curta final como fechamento.
// Nada é reescrito: o texto gravado e o copiado continuam os mesmos.
export type BlocoPalavra =
    | { tipo: 'paragrafo'; texto: string }
    | { tipo: 'versiculo'; texto: string; referencia: string | null }
    | { tipo: 'fechamento'; texto: string };

// Livro (com número opcional: "1 João"; com várias palavras: "Cântico dos
// Cânticos") + capítulo:versículo[-versículo] + versão opcional (", NTLH").
// O ":" é obrigatório para uma frase comum ("Ele disse 3 vezes") não virar
// referência; todas as mensagens reais trazem capítulo e versículo.
const REFERENCIA = String.raw`(?:[1-3]\s?)?\p{Lu}[\p{L}]+(?:\s+[\p{L}]+)*\s+\d+:\d+(?:\s*[-–]\s*\d+)?(?:\s*,\s*[A-Z]{2,5})?`;
// Depois da citação: "(Salmos 119:105)." · "— Isaías 40:29" · quebra de linha
// + referência · ou só um espaço ("…" Provérbios 4:23)
const REF_DEPOIS_DA_CITACAO = new RegExp(
    String.raw`^\s*(?:\(\s*(${REFERENCIA})\s*\)|[—–-]\s*(${REFERENCIA})|\n\s*(${REFERENCIA})|[ \t]+(${REFERENCIA}))\s*\.?`,
    'u',
);
// Referência antes da citação: Hebreus 6:19 - "…"
const REF_ANTES_DA_CITACAO = new RegExp(String.raw`^(${REFERENCIA})\s*[—–:-]?\s*(?=[«"“])`, 'u');
// Emoji solto antes do versículo ("📖 "…"")
const ENFEITE_INICIAL = /^(?:\p{Extended_Pictographic}️?\s*)+/u;
const FECHA: Record<string, string> = { '«': '»', '"': '"', '“': '”' };
const MAX_FECHAMENTO = 90;

function lerCitacao(trecho: string): { texto: string; depois: string } | null {
    const fecha = FECHA[trecho.charAt(0)];
    if (!fecha) return null;
    const fim = trecho.indexOf(fecha, 1);
    if (fim <= 1) return null;
    return { texto: trecho.slice(1, fim).trim(), depois: trecho.slice(fim + 1) };
}

function separarVersiculo(paragrafo: string): BlocoPalavra[] | null {
    const semEnfeite = paragrafo.replace(ENFEITE_INICIAL, '');
    let referencia: string | null = null;
    let citacao: { texto: string; depois: string } | null;
    let resto: string;

    const antes = semEnfeite.match(REF_ANTES_DA_CITACAO);
    if (antes) {
        citacao = lerCitacao(semEnfeite.slice(antes[0].length));
        if (!citacao) return null;
        referencia = antes[1];
        resto = citacao.depois.replace(/^\s*\.?/, '');
    } else {
        citacao = lerCitacao(semEnfeite);
        if (!citacao) return null;
        const ref = citacao.depois.match(REF_DEPOIS_DA_CITACAO);
        if (ref) {
            referencia = ref[1] ?? ref[2] ?? ref[3] ?? ref[4];
            resto = citacao.depois.slice(ref[0].length);
        } else {
            // Citação sozinha no parágrafo, sem referência: ainda é um destaque
            if (citacao.depois.trim() !== '') return null;
            resto = '';
        }
    }

    const blocos: BlocoPalavra[] = [{ tipo: 'versiculo', texto: citacao.texto, referencia: referencia ? referencia.replace(/\s+/g, ' ').trim() : null }];
    if (resto.trim()) blocos.push({ tipo: 'paragrafo', texto: resto.trim() });
    return blocos;
}

export function estruturarPalavra(corpo: string): BlocoPalavra[] {
    const paragrafos = String(corpo ?? '')
        .replace(/\r\n?/g, '\n')
        .split(/\n\s*\n/)
        .map((p) => p.split('\n').map((linha) => linha.replace(/^\s*>\s?/, '').trimEnd()).join('\n').trim())
        .filter(Boolean);

    const blocos: BlocoPalavra[] = [];
    for (const p of paragrafos) {
        blocos.push(...(separarVersiculo(p) ?? [{ tipo: 'paragrafo', texto: p }]));
    }

    const ultimo = blocos[blocos.length - 1];
    if (blocos.length > 1 && ultimo.tipo === 'paragrafo' && !ultimo.texto.includes('\n') && ultimo.texto.length <= MAX_FECHAMENTO) {
        blocos[blocos.length - 1] = { tipo: 'fechamento', texto: ultimo.texto };
    }
    return blocos;
}

const NOMES_CATEGORIA: Record<string, string> = {
    DEVOCIONAL: 'Devocional',
    EXORTACAO: 'Exortação',
    LOUVOR: 'Louvor',
    MEDITACAO: 'Meditação',
    ORACAO: 'Oração',
    REFLEXAO: 'Reflexão',
    VERSICULO: 'Versículo',
};

export function nomeCategoria(categoria?: string | null): string {
    const chave = (categoria ?? '').trim().toUpperCase();
    if (!chave) return '';
    if (NOMES_CATEGORIA[chave]) return NOMES_CATEGORIA[chave];
    const legivel = chave.replace(/_+/g, ' ').toLowerCase();
    return legivel.charAt(0).toUpperCase() + legivel.slice(1);
}
