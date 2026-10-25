// Gravações do VoiceStudio, geradas no Mac e distribuídas como mídia
// estática. Não expor a API local do VoiceStudio na internet.
import { createHash } from 'node:crypto';
import { limparLinha, type Segmento } from './narracao-biblica';

interface VersoPedido {
    verse: number;
    chapter?: number;
    text: string;
}

export interface GravacaoVoiceStudio {
    fullUrl: string;
    segments: Segmento[];
}

const SALMO_23: GravacaoVoiceStudio = {
    fullUrl: '/audio/voicestudio/masculina-v1/salmo-23.mp3',
    // Tempos conferidos com Whisper após a geração no VoiceStudio.
    segments: [
        { chapter: 23, verse: 1, start: 2.58, end: 5.48 },
        { chapter: 23, verse: 2, start: 5.48, end: 9.72 },
        { chapter: 23, verse: 3, start: 9.72, end: 15.24 },
        { chapter: 23, verse: 4, start: 15.24, end: 25.28 },
        { chapter: 23, verse: 5, start: 25.28, end: 33.98 },
        { chapter: 23, verse: 6, start: 33.98, end: 43.28 },
    ],
};

const SALMO_23_SHA256 = 'bcb90f1aebc30378ed182877871e47304d14fde4bdd1a1fcb5a798dcb5f47fb0';

export function gravacaoVoiceStudio(livroId: number, capitulo: number, versos: VersoPedido[]): GravacaoVoiceStudio | null {
    if (livroId !== 19 || capitulo !== 23 || versos.length !== 6) return null;
    if (versos.some((v, i) => v.verse !== i + 1 || (v.chapter != null && v.chapter !== 23))) return null;
    const identidade = JSON.stringify(versos.map(v => [v.verse, limparLinha(String(v.text ?? ''))]));
    if (createHash('sha256').update(identidade).digest('hex') !== SALMO_23_SHA256) return null;
    return SALMO_23;
}
