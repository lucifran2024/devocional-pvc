// Versículo em imagem (14/11/2026): desenha o versículo como uma página do
// app (papel ou preto, a fita vermelha do ícone, a referência em ouro) para
// compartilhar no WhatsApp, no Status ou guardar. Tudo no aparelho, sem IA e
// sem servidor: o texto é exatamente o da tela.
export type EstiloImagem = 'papel' | 'preto';

export const LARGURA_IMAGEM = 1080;
export const ALTURA_IMAGEM = 1350;

const MARGEM = 104;
const CORES: Record<EstiloImagem, { fundo: string; texto: string; suave: string; ouro: string; fita: string }> = {
    papel: { fundo: '#efeae0', texto: '#171612', suave: '#5c584f', ouro: '#86672f', fita: '#c1272d' },
    preto: { fundo: '#0e0e0d', texto: '#f4f1ea', suave: '#a9a59c', ouro: '#c6a15b', fita: '#c1272d' },
};

/** Quebra o texto em linhas que cabem na largura, sem cortar palavra. */
export function quebrarEmLinhas(medir: (trecho: string) => number, texto: string, largura: number): string[] {
    const palavras = texto.trim().split(/\s+/).filter(Boolean);
    const linhas: string[] = [];
    let atual = '';
    for (const palavra of palavras) {
        const tentativa = atual ? `${atual} ${palavra}` : palavra;
        if (atual && medir(tentativa) > largura) {
            linhas.push(atual);
            atual = palavra;
        } else {
            atual = tentativa;
        }
    }
    if (atual) linhas.push(atual);
    return linhas;
}

/** A maior letra (entre o mínimo e o máximo) em que o texto cabe na caixa. */
export function encaixarTexto(opcoes: {
    medirCom: (tamanho: number) => (trecho: string) => number;
    texto: string;
    largura: number;
    altura: number;
    maximo: number;
    minimo: number;
    entrelinha: number;
}): { tamanho: number; linhas: string[] } {
    const { medirCom, texto, largura, altura, maximo, minimo, entrelinha } = opcoes;
    for (let tamanho = maximo; tamanho > minimo; tamanho -= 2) {
        const linhas = quebrarEmLinhas(medirCom(tamanho), texto, largura);
        if (linhas.length * tamanho * entrelinha <= altura) return { tamanho, linhas };
    }
    return { tamanho: minimo, linhas: quebrarEmLinhas(medirCom(minimo), texto, largura) };
}

/** "João 3:16" → "joao-3-16.png" */
export function nomeDoArquivo(referencia: string): string {
    const base = referencia
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return `${base || 'versiculo'}.png`;
}

/** Tira aspas das pontas: a imagem já mostra o texto como citação. */
export function limparCitacao(texto: string): string {
    return texto.trim().replace(/^["“”«»']+|["“”«»']+$/g, '').trim();
}

export async function gerarImagemDoVersiculo(opcoes: {
    texto: string;
    referencia: string;
    versao: string;
    estilo: EstiloImagem;
    familiaSerif: string;
    familiaSans: string;
}): Promise<Blob> {
    const { referencia, versao, estilo, familiaSerif, familiaSans } = opcoes;
    const texto = limparCitacao(opcoes.texto);
    const cor = CORES[estilo];
    const tela = document.createElement('canvas');
    tela.width = LARGURA_IMAGEM;
    tela.height = ALTURA_IMAGEM;
    const ctx = tela.getContext('2d');
    if (!ctx) throw new Error('Este aparelho não desenha imagens.');

    const serif = (tamanho: number, peso = 500) => `${peso} ${tamanho}px ${familiaSerif}`;
    const sans = (tamanho: number, peso = 600) => `${peso} ${tamanho}px ${familiaSans}`;
    // As letras do app precisam estar carregadas antes de medir e desenhar
    try {
        await Promise.all([document.fonts.load(serif(64)), document.fonts.load(sans(34))]);
    } catch { /* sem a letra do app, o aparelho usa a serifa que tiver */ }

    ctx.fillStyle = cor.fundo;
    ctx.fillRect(0, 0, LARGURA_IMAGEM, ALTURA_IMAGEM);

    // A fita marcadora do ícone, no alto à direita
    const fitaX = LARGURA_IMAGEM - MARGEM - 44;
    ctx.fillStyle = cor.fita;
    ctx.beginPath();
    ctx.moveTo(fitaX, 0);
    ctx.lineTo(fitaX + 44, 0);
    ctx.lineTo(fitaX + 44, 132);
    ctx.lineTo(fitaX + 22, 104);
    ctx.lineTo(fitaX, 132);
    ctx.closePath();
    ctx.fill();

    // O texto, na maior letra que couber
    const larguraTexto = LARGURA_IMAGEM - MARGEM * 2;
    const topo = 236;
    const alturaTexto = ALTURA_IMAGEM - topo - 330;
    const entrelinha = 1.38;
    const { tamanho, linhas } = encaixarTexto({
        medirCom: (t) => { ctx.font = serif(t); return (trecho) => ctx.measureText(trecho).width; },
        texto, largura: larguraTexto, altura: alturaTexto, maximo: 76, minimo: 34, entrelinha,
    });
    ctx.font = serif(tamanho);
    ctx.fillStyle = cor.texto;
    ctx.textBaseline = 'alphabetic';
    const alturaLinha = tamanho * entrelinha;
    // Centraliza o bloco na vertical dentro da caixa do texto
    const sobra = Math.max(0, alturaTexto - linhas.length * alturaLinha);
    let y = topo + sobra / 2 + tamanho;
    for (const linha of linhas) {
        ctx.fillText(linha, MARGEM, y);
        y += alturaLinha;
    }

    // Referência (ouro) e versão
    const base = ALTURA_IMAGEM - 196;
    ctx.fillStyle = cor.ouro;
    ctx.fillRect(MARGEM, base - 64, 72, 4);
    ctx.font = sans(40, 600);
    ctx.fillText(referencia, MARGEM, base);
    const larguraRef = ctx.measureText(referencia).width;
    ctx.font = sans(28, 500);
    ctx.fillStyle = cor.suave;
    ctx.fillText(versao, MARGEM + larguraRef + 20, base);

    // Assinatura discreta do app
    ctx.font = sans(26, 500);
    ctx.fillStyle = cor.suave;
    ctx.fillText('PVC Bíblia', MARGEM, ALTURA_IMAGEM - 104);

    return new Promise<Blob>((resolver, rejeitar) => {
        tela.toBlob((blob) => (blob ? resolver(blob) : rejeitar(new Error('Não foi possível gerar a imagem.'))), 'image/png');
    });
}
