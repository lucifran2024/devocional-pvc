// ===========================================
// NOTIFICAÇÕES NO CELULAR — textos das notificações do app.
// Só formata o que já existe (Palavra da Manhã, Versículo do Dia, lembretes);
// não gera nem altera conteúdo. O iPhone mostra ~4 linhas no bloqueio, então
// o corpo termina em frase inteira (ou em palavra inteira com "…").
// ===========================================

export interface TextoNotificacao {
    title: string;
    body: string;
    tag: string;
    url: string;
}

// Cada tipo tem a sua etiqueta: a do dia substitui a do dia anterior do mesmo
// tipo, mas o Versículo não apaga mais a Palavra (antes todas usavam 'devotional').
export const TAG_PALAVRA = 'pvc-palavra-manha';
export const TAG_VERSICULO = 'pvc-versiculo-do-dia';
export const TAG_LEMBRETE = 'pvc-lembrete-leitura';

const NOMES_PROPRIOS: Record<string, string> = {
    deus: 'Deus',
    jesus: 'Jesus',
    cristo: 'Cristo',
    senhor: 'Senhor',
    'espírito': 'Espírito',
    'bíblia': 'Bíblia',
    'nele': 'nEle',
};

function ehTituloEmMaiusculas(linha: string): boolean {
    const letras = linha.replace(/[^A-Za-zÀ-ÿ]/g, '');
    return letras.length >= 6 && letras === letras.toUpperCase() && linha.length <= 90;
}

/** "O ERRO DO OUTRO NÃO JUSTIFICA O SEU" → "O erro do outro não justifica o seu" */
export function caixaDeFrase(titulo: string): string {
    const palavras = titulo.trim().toLowerCase().split(/\s+/);
    const saida = palavras.map((p, i) => {
        const nua = p.replace(/[^\p{L}]/gu, '');
        // "Santo" só em "Espírito Santo" ("um povo santo" continua minúsculo)
        const nome = nua === 'santo' && palavras[i - 1]?.replace(/[^\p{L}]/gu, '') === 'espírito' ? 'Santo' : NOMES_PROPRIOS[nua];
        if (nome && !(nome === 'nEle' && i === 0)) return p.replace(/^[\p{L}]+/u, nome);
        return p;
    }).join(' ');
    return saida.charAt(0).toUpperCase() + saida.slice(1);
}

function limparMarkdown(texto: string): string {
    return texto
        .replace(/\*\*|__/g, '')
        .replace(/[*_#>]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Corta em frase inteira até `max`; se a primeira frase já passar, corta em palavra com "…". */
export function cortarEmFrase(texto: string, max: number): string {
    const limpo = texto.trim();
    if (limpo.length <= max) return limpo;
    const frases = limpo.match(/[^.!?…]+[.!?…]+["”»')\]]*\s*/g) || [];
    let saida = '';
    for (const frase of frases) {
        if ((saida + frase).trim().length > max) break;
        saida += frase;
    }
    if (saida.trim()) return saida.trim();
    const corte = limpo.slice(0, max - 1);
    const espaco = corte.lastIndexOf(' ');
    return `${(espaco > max * 0.5 ? corte.slice(0, espaco) : corte).replace(/[\s,;:—–-]+$/, '')}…`;
}

/** Notificação da Palavra da Manhã a partir da mensagem salva (título em maiúsculas + texto). */
export function notificacaoPalavra(mensagem: string | null | undefined, max = 170): TextoNotificacao {
    const base: TextoNotificacao = { title: '🌅 Palavra da Manhã', body: 'Sua palavra de hoje está pronta. Toque para ler.', tag: TAG_PALAVRA, url: '/' };
    const linhas = String(mensagem || '').replace(/\r\n?/g, '\n').split('\n').map((l) => limparMarkdown(l)).filter(Boolean);
    if (linhas.length === 0) return base;

    let titulo = '';
    if (ehTituloEmMaiusculas(linhas[0])) titulo = caixaDeFrase(linhas.shift()!);
    // O corpo usa o primeiro parágrafo de reflexão; a citação bíblica («…») fica para o app
    const reflexao = linhas.filter((l) => !/^[«“"]/.test(l)).join(' ');
    const abertura = !titulo ? '' : /[?!]$/.test(titulo) ? `${titulo} ` : `${titulo.replace(/[.…:;,—–-]+$/, '')}. `;
    const resto = cortarEmFrase(reflexao, Math.max(40, max - abertura.length));
    const body = `${abertura}${resto}`.trim();
    return body.length > 10 ? { ...base, body } : base;
}

/** Notificação do Versículo do Dia (mesmo versículo do cartão do app). */
export function notificacaoVersiculo({ ref, texto, versao }: { ref: string; texto: string | null; versao: string }): TextoNotificacao {
    return {
        title: `📖 Versículo do dia · ${ref}`,
        body: texto ? `“${cortarEmFrase(texto, 240)}” (${versao})` : `Toque para ler o versículo de hoje (${versao}).`,
        tag: TAG_VERSICULO,
        url: '/',
    };
}

/** Lembrete de leitura do plano (tarde ou noite). */
export function notificacaoLembrete(noite: boolean): TextoNotificacao {
    return noite
        ? { title: '🌙 Sua leitura de hoje', body: 'Ainda dá tempo: alguns minutos com a Palavra antes de descansar.', tag: TAG_LEMBRETE, url: '/planos' }
        : { title: '📖 Um momento com a Palavra', body: 'Que tal uma pausa para a leitura do seu plano de hoje?', tag: TAG_LEMBRETE, url: '/planos' };
}
