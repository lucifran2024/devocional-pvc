import type { IntroducaoLivro } from './bible-introducoes';
import type { Pericope } from './bible-pericopes';

export type VersiculoExplicacao = { verse: number; text: string };

function limpar(texto: string) {
    return texto.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function titulosDaParte(versiculos: VersiculoExplicacao[], pericopes: Pericope[]): string[] {
    if (!versiculos.length) return [];
    const inicio = Math.min(...versiculos.map(v => v.verse));
    const fim = Math.max(...versiculos.map(v => v.verse));
    return pericopes.filter(p => p.verse >= inicio && p.verse <= fim).map(p => p.title);
}

export function gerarExplicacaoLocal({
    referencia,
    parte,
    introducao,
    pericopes,
    versiculos,
}: {
    referencia: string;
    parte: number;
    introducao: IntroducaoLivro | null;
    pericopes: Pericope[];
    versiculos: VersiculoExplicacao[];
}): string {
    const validos = versiculos.map(v => ({ ...v, text: limpar(v.text) })).filter(v => v.text);
    if (!validos.length) return 'Não há texto suficiente nesta parte para montar a explicação.';

    const titulos = titulosDaParte(validos, pericopes);
    const faixa = validos.length === 1 ? `v.${validos[0].verse}` : `v.${validos[0].verse}–${validos[validos.length - 1].verse}`;
    const contextoLivro = introducao
        ? `${introducao.categoria}; tema do livro: **${introducao.tema}**. ${introducao.resumo}`
        : 'Leia esta parte dentro da sequência do capítulo e observe quem fala, o que acontece e qual resposta o texto pede.';
    const secao = titulos.length
        ? `Esta parte atravessa ${titulos.length === 1 ? 'a seção' : 'as seções'} **${titulos.join('** e **')}**.`
        : 'Esta parte continua o argumento ou acontecimento do capítulo.';

    const primeiro = validos[0];
    const ultimo = validos[validos.length - 1];
    const movimento = validos.length === 1
        ? `O ${faixa} concentra a ideia nesta afirmação: “${primeiro.text}”`
        : `O trecho começa em “${primeiro.text}” e chega a “${ultimo.text}”. Esse movimento mostra como a ideia ou ação se desenvolve dentro da própria parte.`;

    const palavras = Array.from(new Set(validos.flatMap(v => limpar(v.text).toLocaleLowerCase('pt-BR').match(/[a-záàâãéêíóôõúç]{5,}/g) || [])))
        .filter(p => !['porque', 'quando', 'então', 'assim', 'sobre', 'diante', 'todos', 'todas', 'aquele', 'aquela', 'disse', 'senhor'].includes(p))
        .slice(0, 4);
    const observacao = palavras.length
        ? `Ao reler, observe como aparecem as palavras **${palavras.join('**, **')}**; elas ajudam a enxergar as ênfases do próprio texto.`
        : 'Ao reler, marque as palavras repetidas, as ordens, as promessas e as mudanças de ação.';

    return `🔍 **CONTEXTO & EXPLICAÇÃO**\n\n• **Onde esta parte está:** ${referencia}, parte ${parte} (${faixa}). ${contextoLivro}\n\n• **O que está acontecendo:** ${secao} ${movimento}\n\n• **Como entender:** ${observacao} A explicação parte do que está escrito aqui; por isso, compare cada ideia com os versículos antes e depois no capítulo.`;
}
