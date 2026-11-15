// Tela deslocada no iPhone depois que o teclado fecha (15/11/2026).
//
// No app instalado, quando o teclado abre o iPhone empurra a parte visível
// da tela para baixo dentro da página. Às vezes, ao fechar o teclado, ela não
// volta: tudo que é fixo (a barra de baixo, a faixa do capítulo) fica
// deslocado para cima — a barra aparece no meio da tela e a faixa some.
// Rolar a página exatamente o tamanho do deslocamento põe tudo no lugar sem
// mudar o que a pessoa está lendo.

export interface EstadoDaTela {
    /** visualViewport.offsetTop: quanto a parte visível está abaixo do topo da página fixa */
    deslocamento: number;
    /** visualViewport.scale: 1 = sem zoom de pinça */
    zoom: number;
    /** há um campo de texto em foco (teclado aberto ou abrindo) */
    digitando: boolean;
}

/** Quantos px rolar para a tela voltar ao lugar (0 = não mexer). */
export function correcaoDaTela({ deslocamento, zoom, digitando }: EstadoDaTela): number {
    if (digitando) return 0;
    if (Math.abs(zoom - 1) > 0.01) return 0;
    if (!(deslocamento >= 2)) return 0;
    return Math.round(deslocamento);
}
