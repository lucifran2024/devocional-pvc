// ===========================================
// APRESENTAÇÃO DA EXPLICAÇÃO DA PARTE — só arruma o texto que chegou (IA ou
// reserva local) para a tela; não muda nenhuma palavra explicativa.
// - tira o cabeçalho "🔍 EXPLICAÇÃO DA PARTE LIDA" (a tela já tem título);
// - cada tópico vira subtítulo ("Versículos 1-4 · A saudade") + parágrafo;
// - tira marcadores "•" e linhas em branco sobrando.
// ===========================================

const CABECALHO = /^(?:🔍\s*)?\**\s*explica[çc][ãa]o da parte lida\s*\**\s*:?$/iu;
const MARCADOR = /^(?:[•·*-]|\d+[.)])\s+/u;
const ABERTURA = /^\*\*(.+?)\*\*\s*:?\s*(.*)$/u;
const TITULO_MARKDOWN = /^#{1,6}\s+(.+?)\s*#*$/u;

/** "Versículos 1–4 — A decisão:" → "Versículos 1-4 · A decisão" (só o rótulo). */
function limparRotulo(rotulo: string): string {
    return rotulo
        .replace(/(\d)\s*[–—-]\s*(\d)/gu, '$1-$2')
        .replace(/\s+[—–-]\s+/gu, ' · ')
        .replace(/[:.]\s*$/u, '')
        .trim();
}

/** Markdown pronto para a tela: "### título", "#### tópico" e parágrafos. */
export function formatarExplicacao(texto: string, titulo: string): string {
    const blocos: string[] = [];
    let paragrafo: string[] = [];
    const fecharParagrafo = () => {
        if (paragrafo.length) blocos.push(paragrafo.join(' '));
        paragrafo = [];
    };

    for (const bruta of String(texto || '').replace(/\r\n?/g, '\n').split('\n')) {
        const linha = bruta.trim();
        if (!linha || CABECALHO.test(linha)) {
            fecharParagrafo();
            continue;
        }
        // Título em markdown ("## Salmo 96 · …") vira subtítulo, como os em negrito
        const tituloMarkdown = linha.match(TITULO_MARKDOWN);
        if (tituloMarkdown) {
            fecharParagrafo();
            blocos.push(`#### ${limparRotulo(tituloMarkdown[1].replace(/\*\*/g, ''))}`);
            continue;
        }
        const semMarcador = linha.replace(MARCADOR, '');
        const abertura = semMarcador.match(ABERTURA);
        // Cada linha com marcador ou abertura em negrito começa um tópico novo
        if (abertura || semMarcador !== linha) fecharParagrafo();
        if (abertura) {
            blocos.push(`#### ${limparRotulo(abertura[1])}`);
            if (abertura[2].trim()) paragrafo.push(abertura[2].trim());
            continue;
        }
        paragrafo.push(semMarcador);
    }
    fecharParagrafo();

    return blocos.length ? `### ${titulo}\n\n${blocos.join('\n\n')}` : '';
}
