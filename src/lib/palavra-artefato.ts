import { createHash } from 'node:crypto';
import type { PalavraManhaCache } from './supabase';

/** Nome determinístico do mesmo print, nunca uma segunda renderização. */
export function caminhoPrintPalavra(palavra: Pick<PalavraManhaCache, 'id' | 'data' | 'mensagem'>): string {
    const digest = createHash('sha256').update(palavra.mensagem).digest('hex');
    return `palavra-da-manha/${palavra.data}/${palavra.id}-${digest}.png`;
}

/** Barrar arquivo vazio, truncado, trocado ou fora do limite aceito pelo Telegram. */
export function pngValido(bytes: Uint8Array): boolean {
    if (bytes.length < 33 || bytes.length > 10_000_000) return false;
    const assinatura = [137, 80, 78, 71, 13, 10, 26, 10];
    if (!assinatura.every((valor, indice) => bytes[indice] === valor)) return false;
    if (bytes[8] !== 0 || bytes[9] !== 0 || bytes[10] !== 0 || bytes[11] !== 13 ||
        String.fromCharCode(...bytes.slice(12, 16)) !== 'IHDR') return false;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const largura = view.getUint32(16);
    const altura = view.getUint32(20);
    return largura > 0 && altura > 0 && largura + altura <= 10_000;
}
