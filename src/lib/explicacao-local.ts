import type { IntroducaoLivro } from './bible-introducoes';
import type { Pericope } from './bible-pericopes';

export type VersiculoExplicacao = {
    verse: number;
    text: string;
    chapter?: number;
    livro?: string;
};

export type PedidoExplicacaoParte = {
    referencia: string;
    parte: number;
    versiculos: string;
    quantidadeVersiculos: number;
};

function limpar(texto: string) {
    return texto.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function faixaVersiculos(inicio: number, fim: number): string {
    return inicio === fim ? String(inicio) : `${inicio}–${fim}`;
}

export function montarPedidoExplicacaoParte({
    referenciaPassagem,
    parte,
    versiculos,
}: {
    referenciaPassagem: string;
    parte: number;
    versiculos: VersiculoExplicacao[];
}): PedidoExplicacaoParte {
    const validos = versiculos
        .map(v => ({ ...v, text: limpar(v.text) }))
        .filter(v => v.text);

    if (!validos.length) {
        return {
            referencia: referenciaPassagem,
            parte,
            versiculos: '',
            quantidadeVersiculos: 0,
        };
    }

    const grupos: VersiculoExplicacao[][] = [];
    for (const versiculo of validos) {
        const grupoAtual = grupos[grupos.length - 1];
        const anterior = grupoAtual?.[grupoAtual.length - 1];
        const mesmoBloco = anterior
            && anterior.chapter === versiculo.chapter
            && anterior.livro === versiculo.livro;

        if (!grupoAtual || !mesmoBloco) grupos.push([versiculo]);
        else grupoAtual.push(versiculo);
    }

    const possuiMaisDeUmBloco = grupos.length > 1;
    const referencias = grupos.map((grupo, index) => {
        const primeiro = grupo[0];
        const ultimo = grupo[grupo.length - 1];
        const livro = primeiro.livro || referenciaPassagem.replace(/\s+\d.*$/, '').trim();
        const livroAnterior = grupos[index - 1]?.[0]?.livro;
        const capitulo = primeiro.chapter;
        const faixa = faixaVersiculos(primeiro.verse, ultimo.verse);
        const omitirLivroRepetido = index > 0 && livroAnterior === primeiro.livro;
        if (!capitulo) return `${referenciaPassagem}:${faixa}`;
        return omitirLivroRepetido ? `${capitulo}:${faixa}` : `${livro} ${capitulo}:${faixa}`;
    });

    const texto = validos.map(v => {
        const rotuloCompleto = possuiMaisDeUmBloco && v.chapter
            ? `${v.livro || referenciaPassagem.replace(/\s+\d.*$/, '').trim()} ${v.chapter}:${v.verse}`
            : String(v.verse);
        return `**${rotuloCompleto}.** ${v.text}`;
    }).join('\n');

    return {
        referencia: referencias.join('; '),
        parte,
        versiculos: texto,
        quantidadeVersiculos: validos.length,
    };
}

function dividirEmMovimentos(versiculos: VersiculoExplicacao[]): VersiculoExplicacao[][] {
    const tamanho = versiculos.length <= 6 ? 2 : versiculos.length <= 12 ? 3 : 5;
    const grupos: VersiculoExplicacao[][] = [];
    for (let inicio = 0; inicio < versiculos.length; inicio += tamanho) {
        grupos.push(versiculos.slice(inicio, inicio + tamanho));
    }
    return grupos;
}

export function gerarExplicacaoLocal({
    referencia,
    parte,
    introducao: _introducao,
    pericopes: _pericopes,
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

    const topicos = dividirEmMovimentos(validos).map((grupo) => {
        const primeiro = grupo[0];
        const ultimo = grupo[grupo.length - 1];
        const faixa = faixaVersiculos(primeiro.verse, ultimo.verse);
        const falas = grupo.map(v => `no v.${v.verse}, “${v.text}”`).join('; ');
        return `• **Versículos ${faixa}:** A sequência desta parte diz ${falas}. Leia essas afirmações juntas: a ação ou ideia avança nessa ordem, sem precisar buscar conteúdo fora do bloco.`;
    });

    const primeiro = validos[0];
    const ultimo = validos[validos.length - 1];
    const sentido = validos.length === 1
        ? `A parte concentra sua mensagem no que o v.${primeiro.verse} afirma: “${primeiro.text}”`
        : `A parte começa no v.${primeiro.verse} com “${primeiro.text}” e termina no v.${ultimo.verse} com “${ultimo.text}”. O sentido deve ser entendido pelo caminho entre esses dois pontos, cobrindo todos os versículos acima.`;

    return `🔍 **EXPLICAÇÃO DA PARTE LIDA**\n\n${topicos.join('\n\n')}\n\n• **Sentido central da parte (${referencia}, parte ${parte}):** ${sentido}`;
}
