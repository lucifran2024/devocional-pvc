// ===========================================
// PEDIDO DA EXPLICAÇÃO DA PARTE — monta o texto exato da parte visível para a IA.
// (03/10/2026: o gerador local de explicação genérica que morava aqui saiu; se a
// IA falhar, a tela pede para tentar de novo. Lucifran recusou aquela versão.)
// ===========================================

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
