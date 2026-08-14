import type { TranscriptSegment } from 'youtube-transcript-plus';

export function formatarSegmentosLegenda(segmentos: TranscriptSegment[]): string {
    const paragrafos: string[] = [];
    let atual = '';

    for (const segmento of segmentos) {
        const trecho = String(segmento.text || '').replace(/\s+/g, ' ').trim();
        if (!trecho) continue;
        atual = atual ? `${atual} ${trecho}` : trecho;
        if (atual.length >= 700 && /[.!?…]["”']?$/.test(trecho)) {
            paragrafos.push(atual);
            atual = '';
        }
    }

    if (atual) paragrafos.push(atual);
    return paragrafos.join('\n\n').trim();
}

export function parsearDocumentoLegenda(markdown: string): { titulo: string; texto: string; idioma: string } | null {
    const linhas = markdown.replace(/\r\n/g, '\n').split('\n');
    const titulo = linhas.find(linha => linha.startsWith('# Transcript: '))?.slice('# Transcript: '.length).trim() || 'Vídeo do YouTube';
    const linhaIdioma = linhas.find(linha => linha.startsWith('Language:')) || '';
    const idioma = linhaIdioma.match(/^Language:\s*([^·\n]+)/)?.[1]?.trim() || 'auto';
    const primeiraLegenda = linhas.findIndex(linha => /^\[\d+:\d{2}(?::\d{2})?\]\s*/.test(linha.trim()));
    if (primeiraLegenda < 0) return null;

    const texto = linhas
        .slice(primeiraLegenda)
        .map(linha => linha.replace(/^\[\d+:\d{2}(?::\d{2})?\]\s*/, '').trim())
        .filter(Boolean)
        .join('\n\n')
        .trim();

    return texto ? { titulo, texto, idioma } : null;
}
