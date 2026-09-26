// ===========================================
// TRANSCRIÇÕES — apresentação na tela.
// Nada aqui muda a transcrição nem a chamada a /api/transcrever-youtube:
// só organiza parágrafos para leitura, descreve origem, data e tamanho,
// e monta os textos de copiar, compartilhar e do arquivo .txt.
// As palavras são sempre as mesmas que a transcrição devolveu.
// ===========================================

// Mesmo padrão aceito pela rota /api/transcrever-youtube (normalizarUrl).
export const PADRAO_LINK_YOUTUBE = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/;

export function extrairIdYoutube(url: string | null | undefined): string | null {
    const bruto = String(url || '').trim();
    if (!bruto) return null;
    const m = bruto.match(PADRAO_LINK_YOUTUBE);
    if (m) return m[1];
    if (/^[\w-]{11}$/.test(bruto)) return bruto;
    return null;
}

export function miniaturaYoutube(id: string): string {
    return `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
}

// Link limpo do vídeo (sem tempo nem parâmetros), ou o endereço salvo se não for do YouTube.
export function linkDoVideo(fonteUrl: string | null | undefined): string | null {
    const id = extrairIdYoutube(fonteUrl);
    if (id) return `https://www.youtube.com/watch?v=${id}`;
    const bruto = String(fonteUrl || '').trim();
    return /^https?:\/\//i.test(bruto) ? bruto : null;
}

export function contarPalavras(texto: string | null | undefined): number {
    const limpo = String(texto || '').trim();
    return limpo ? limpo.split(/\s+/).length : 0;
}

export function descreverPalavras(n: number): string {
    return `${n.toLocaleString('pt-BR')} ${n === 1 ? 'palavra' : 'palavras'}`;
}

const PALAVRAS_POR_MINUTO = 180;

export function tempoLeitura(palavras: number): string {
    const minutos = Math.max(1, Math.round(palavras / PALAVRAS_POR_MINUTO));
    if (minutos < 60) return `${minutos} min de leitura`;
    const horas = Math.floor(minutos / 60);
    return `${horas}h${String(minutos % 60).padStart(2, '0')} de leitura`;
}

export function formatarDataTranscricao(iso: string | null | undefined, agora: Date = new Date()): string {
    if (!iso) return '';
    const data = new Date(iso);
    if (Number.isNaN(data.getTime())) return '';
    const inicioDoDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dias = Math.round((inicioDoDia(agora) - inicioDoDia(data)) / 86_400_000);
    if (dias === 0) return 'hoje';
    if (dias === 1) return 'ontem';
    const opcoes: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    if (data.getFullYear() !== agora.getFullYear()) opcoes.year = 'numeric';
    return data.toLocaleDateString('pt-BR', opcoes);
}

const NOMES_IDIOMA: Record<string, string> = {
    pt: 'português',
    en: 'inglês',
    es: 'espanhol',
    fr: 'francês',
    it: 'italiano',
    de: 'alemão',
};

// "legenda do YouTube (en-US (auto-generated))" → "Legenda do YouTube · inglês, automática"
export function descreverOrigem(idioma: string | null | undefined): string | null {
    const bruto = String(idioma || '').trim();
    if (!bruto) return null;
    const legenda = bruto.match(/^legenda do youtube \((.*)\)$/i);
    if (legenda) {
        const detalhe = legenda[1].trim();
        const automatica = /auto-generated|autom[aá]tic/i.test(detalhe);
        const codigo = detalhe.replace(/\(.*?\)/g, '').trim();
        const base = codigo.toLowerCase().split(/[-_]/)[0];
        const nome = NOMES_IDIOMA[base] ?? (codigo && base !== 'auto' ? codigo : null);
        const partes = [nome, automatica ? 'automática' : null].filter(Boolean);
        return partes.length ? `Legenda do YouTube · ${partes.join(', ')}` : 'Legenda do YouTube';
    }
    if (/gemini/i.test(bruto)) return 'Transcrição por IA';
    return bruto;
}

const FIM_DE_FRASE = /[.!?…]["”'’)\]]*$/;
// Frase = até a pontuação final seguida de espaço (ou fim). "3.16" não quebra.
const FRASES = /[\s\S]*?[.!?…]+["”'’)\]]*(?:\s+|$)|[\s\S]+$/g;

// Trecho sem pontuação nenhuma (legenda automática): divide entre palavras.
function quebrarPorPalavras(trecho: string, alvo: number): string[] {
    const partes: string[] = [];
    let atual = '';
    for (const palavra of trecho.split(/\s+/)) {
        if (!palavra) continue;
        if (atual && atual.length + 1 + palavra.length > alvo) {
            partes.push(atual);
            atual = '';
        }
        atual = atual ? `${atual} ${palavra}` : palavra;
    }
    if (atual) partes.push(atual);
    return partes;
}

// Parágrafos para LER. A legenda pública chega em blocos de ~30 s que cortam
// frases no meio (ou, às vezes, em linhas soltas de poucas palavras). Aqui os
// blocos são reagrupados em fins de frase; nenhuma palavra muda.
export function paragrafosParaLeitura(texto: string | null | undefined, alvo = 500): string[] {
    const blocos = String(texto || '')
        .replace(/\r\n?/g, '\n')
        .split(/\n[ \t]*\n+/)
        .map((b) => b.trim())
        .filter(Boolean);
    if (blocos.length === 0) return [];

    // 1) Legenda linha a linha (muitos pedacinhos): vira texto corrido.
    const curtos = blocos.filter((b) => b.length < 120).length;
    const base = blocos.length >= 20 && curtos / blocos.length >= 0.8 ? [blocos.join(' ')] : blocos;

    // 2) Bloco longo que termina no meio da frase continua no seguinte.
    const unidos: string[] = [];
    for (const bloco of base) {
        const ultimo = unidos.length - 1;
        if (ultimo >= 0 && unidos[ultimo].length >= 200 && !FIM_DE_FRASE.test(unidos[ultimo])) {
            unidos[ultimo] = `${unidos[ultimo]} ${bloco}`;
        } else {
            unidos.push(bloco);
        }
    }

    // 3) Bloco comprido demais é dividido no fim de frase mais perto do tamanho alvo.
    const saida: string[] = [];
    for (const bloco of unidos) {
        if (bloco.length <= alvo * 1.5) {
            saida.push(bloco);
            continue;
        }
        let atual = '';
        const fecharAtual = () => {
            if (atual.trim()) saida.push(atual.trim());
            atual = '';
        };
        for (const frase of bloco.match(FRASES) ?? [bloco]) {
            if (frase.length > alvo * 1.5) {
                fecharAtual();
                saida.push(...quebrarPorPalavras(frase, alvo));
                continue;
            }
            if (atual && atual.length + frase.length > alvo) fecharAtual();
            atual += frase;
        }
        fecharAtual();
    }
    return saida;
}

// O que vai para a área de transferência: exatamente o que aparece na leitura.
export function textoParaCopiar(texto: string | null | undefined): string {
    return paragrafosParaLeitura(texto).join('\n\n');
}

export function montarTextoCompartilhado({ titulo, texto, fonteUrl }: {
    titulo?: string | null;
    texto: string;
    fonteUrl?: string | null;
}): string {
    const partes: string[] = [];
    const nome = String(titulo || '').trim();
    if (nome) partes.push(nome);
    partes.push(textoParaCopiar(texto));
    const link = linkDoVideo(fonteUrl);
    if (link) partes.push(`Vídeo: ${link}`);
    return partes.join('\n\n');
}

export function nomeArquivoTxt(titulo: string | null | undefined): string {
    const base = String(titulo || '')
        .replace(/[\\/:*?"<>|#%{}^~[\]`]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80)
        .trim();
    return `${base || 'Transcrição'}.txt`;
}

export function resumoTranscricao(texto: string | null | undefined, max = 140): string {
    const corrido = String(texto || '').replace(/\s+/g, ' ').trim();
    if (corrido.length <= max) return corrido;
    const corte = corrido.slice(0, max);
    const espaco = corte.lastIndexOf(' ');
    return `${(espaco > max * 0.6 ? corte.slice(0, espaco) : corte).trim()}…`;
}

export function normalizarBusca(texto: string): string {
    return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function chaveBusca(t: { titulo: string | null; texto: string }): string {
    return normalizarBusca(`${t.titulo || ''}\n${t.texto}`);
}

// Busca por título ou palavra do texto, sem diferenciar acento nem maiúscula.
// `chaves` (mesma ordem da lista) evita normalizar tudo a cada letra digitada.
export function filtrarTranscricoes<T extends { titulo: string | null; texto: string }>(lista: T[], termo: string, chaves?: string[]): T[] {
    const alvo = normalizarBusca(termo.trim());
    if (!alvo) return lista;
    return lista.filter((t, i) => (chaves?.[i] ?? chaveBusca(t)).includes(alvo));
}

const MENSAGENS_ERRO: Record<string, string> = {
    link_invalido: 'Esse link não é de um vídeo do YouTube. No YouTube, toque em Compartilhar → Copiar link e cole aqui.',
    tempo_esgotado: 'O vídeo é longo demais e passou do tempo. Tente um mais curto.',
};

// Mantém a mensagem que a rota mandar; só traduz os códigos que chegam sem mensagem.
export function mensagemErroTranscricao(data: { message?: unknown; error?: unknown } | null | undefined): string {
    const mensagem = typeof data?.message === 'string' ? data.message.trim() : '';
    if (mensagem) return mensagem;
    const codigo = typeof data?.error === 'string' ? data.error : '';
    return MENSAGENS_ERRO[codigo] ?? 'Não consegui transcrever este vídeo. Verifique o link ou tente outro.';
}

export function etapaTranscricao(segundos: number): string {
    if (segundos < 6) return 'Buscando a legenda do vídeo…';
    if (segundos < 25) return 'Organizando o texto…';
    return 'Ainda trabalhando… vídeos longos ou sem legenda pronta podem levar alguns minutos.';
}

export function formatarDuracao(segundos: number): string {
    const total = Math.max(0, Math.floor(segundos));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
