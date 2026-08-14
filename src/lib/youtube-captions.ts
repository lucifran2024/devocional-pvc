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
