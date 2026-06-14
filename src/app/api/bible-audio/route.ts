import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

// ============================================
// ÁUDIO BÍBLICO — capítulo inteiro sintetizado como texto contínuo
//
// Ao invés de sintetizar cada versículo separadamente (o que causava
// pausas/cortes entre versículos), agora o capítulo inteiro é enviado
// ao Azure como um único SSML. Resultado: leitura fluida e natural,
// como se fosse uma pessoa lendo o capítulo de uma vez.
//
// O áudio é cacheado como full.mp3 no Supabase Storage.
// A posição de cada versículo é estimada por proporção de caracteres
// e salva em full.json para o destaque tipo legenda no player.
// ============================================

const AZURE_KEY = process.env.AZURE_SPEECH_KEY;
const AZURE_REGION = process.env.AZURE_SPEECH_REGION;
const VOZ = process.env.AZURE_SPEECH_VOICE || 'pt-BR-FranciscaNeural';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = 'bible-audio';

const MAX_VERSES = 250;
const MAX_TEXT = 1200;
const MAX_CHUNK_CHARS = 2500;
const MP3_BITRATE = 48000; // audio-24khz-48kbitrate-mono-mp3

interface VersiculoEntrada {
    verse: number;
    text: string;
}

function escaparXml(t: string): string {
    return t
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function limparTexto(t: string): string {
    return t
        .replace(/<[^>]*>/g, '')
        .replace(/\*\*/g, '')
        .replace(/[*_#`>]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, MAX_TEXT);
}

function construirSSML(textos: string[]): string {
    const sentences = textos.map(t => `<s>${escaparXml(t)}</s>`).join('');
    return (
        `<speak version='1.0' xml:lang='pt-BR'>` +
        `<voice name='${VOZ}'>` +
        `<prosody rate='-4%'>${sentences}</prosody>` +
        `</voice></speak>`
    );
}

async function sintetizarSSML(ssml: string): Promise<ArrayBuffer | null> {
    try {
        const resp = await fetch(
            `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
            {
                method: 'POST',
                headers: {
                    'Ocp-Apim-Subscription-Key': AZURE_KEY!,
                    'Content-Type': 'application/ssml+xml',
                    'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
                    'User-Agent': 'devocional-pvc',
                },
                body: ssml,
            }
        );
        if (!resp.ok) {
            console.error(`🔊 [BIBLE-AUDIO] Azure ${resp.status}: ${await resp.text().catch(() => '')}`);
            return null;
        }
        return await resp.arrayBuffer();
    } catch (e) {
        console.error('🔊 [BIBLE-AUDIO] Erro Azure:', e);
        return null;
    }
}

interface VersoLimpo {
    verse: number;
    texto: string;
}

function agruparVersos(versos: VersoLimpo[]): VersoLimpo[][] {
    const chunks: VersoLimpo[][] = [];
    let current: VersoLimpo[] = [];
    let chars = 0;
    for (const v of versos) {
        if (chars + v.texto.length > MAX_CHUNK_CHARS && current.length > 0) {
            chunks.push(current);
            current = [];
            chars = 0;
        }
        current.push(v);
        chars += v.texto.length;
    }
    if (current.length > 0) chunks.push(current);
    return chunks;
}

export async function POST(request: Request) {
    if (!AZURE_KEY || !AZURE_REGION) {
        return NextResponse.json({ ok: false, error: 'sem_chave' }, { status: 503 });
    }

    let body: { livroId?: number; capitulo?: number; verses?: VersiculoEntrada[] };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ ok: false, error: 'json_invalido' }, { status: 400 });
    }

    const livroId = Number(body.livroId);
    const capitulo = Number(body.capitulo);
    const verses = Array.isArray(body.verses) ? body.verses.slice(0, MAX_VERSES) : [];

    if (!livroId || !capitulo || verses.length === 0) {
        return NextResponse.json({ ok: false, error: 'parametros_invalidos' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const pastaCap = `${VOZ}/${livroId}/${capitulo}`;
    const fullPath = `${pastaCap}/full.mp3`;
    const metaPath = `${pastaCap}/full.json`;

    // Verifica cache
    const { data: arquivos } = await supabase.storage.from(BUCKET).list(pastaCap, { limit: 1000 });
    const temFull = arquivos?.some(a => a.name === 'full.mp3');
    const temMeta = arquivos?.some(a => a.name === 'full.json');

    if (temFull && temMeta) {
        try {
            const { data: metaBlob } = await supabase.storage.from(BUCKET).download(metaPath);
            if (metaBlob) {
                const meta = JSON.parse(await metaBlob.text());
                const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(fullPath);
                return NextResponse.json({
                    ok: true,
                    fullUrl: pub.publicUrl,
                    segments: meta.segments,
                    voz: VOZ,
                    fonte: `Voz neural · ${VOZ.replace('pt-BR-', '').replace('Neural', '')}`,
                });
            }
        } catch {
            // Cache corrompido, regenera
        }
    }

    // Prepara textos
    const versosLimpos = verses
        .map(v => ({ verse: Number(v.verse), texto: limparTexto(String(v.text || '')) }))
        .filter(v => v.verse && v.texto);

    if (versosLimpos.length === 0) {
        return NextResponse.json({ ok: false, error: 'sem_texto' }, { status: 400 });
    }

    // Agrupa e sintetiza (capítulo inteiro como texto contínuo)
    const chunks = agruparVersos(versosLimpos);
    const audioBuffers: ArrayBuffer[] = [];

    for (const chunk of chunks) {
        const ssml = construirSSML(chunk.map(v => v.texto));
        const audio = await sintetizarSSML(ssml);
        if (!audio) {
            return NextResponse.json({ ok: false, error: 'erro_sintese' }, { status: 502 });
        }
        audioBuffers.push(audio);
    }

    // Concatena buffers e calcula segmentos de tempo
    const totalSize = audioBuffers.reduce((sum, buf) => sum + buf.byteLength, 0);
    const fullBuffer = new Uint8Array(totalSize);
    const segments: { verse: number; start: number; end: number }[] = [];
    let byteOffset = 0;
    let timeOffset = 0;

    for (let ci = 0; ci < chunks.length; ci++) {
        const buf = audioBuffers[ci];
        fullBuffer.set(new Uint8Array(buf), byteOffset);
        byteOffset += buf.byteLength;

        const chunkDuration = (buf.byteLength * 8) / MP3_BITRATE;
        const chunk = chunks[ci];
        const totalChunkChars = chunk.reduce((sum, v) => sum + v.texto.length, 0);

        let charsSoFar = 0;
        for (const v of chunk) {
            const start = timeOffset + (totalChunkChars > 0 ? (charsSoFar / totalChunkChars) * chunkDuration : 0);
            charsSoFar += v.texto.length;
            const end = timeOffset + (totalChunkChars > 0 ? (charsSoFar / totalChunkChars) * chunkDuration : chunkDuration);
            segments.push({ verse: v.verse, start, end });
        }
        timeOffset += chunkDuration;
    }

    // Upload full.mp3
    const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(fullPath, fullBuffer.buffer, { contentType: 'audio/mpeg', upsert: true });

    if (upErr) {
        console.error('🔊 [BIBLE-AUDIO] upload full.mp3 falhou:', upErr.message);
        return NextResponse.json({ ok: false, error: 'upload_falhou' }, { status: 502 });
    }

    // Upload full.json (metadados de timing)
    await supabase.storage
        .from(BUCKET)
        .upload(metaPath, JSON.stringify({ segments }), { contentType: 'application/json', upsert: true });

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(fullPath);
    return NextResponse.json({
        ok: true,
        fullUrl: pub.publicUrl,
        segments,
        voz: VOZ,
        fonte: `Voz neural · ${VOZ.replace('pt-BR-', '').replace('Neural', '')}`,
    });
}

export async function GET() {
    return NextResponse.json({
        ok: false,
        configurado: Boolean(AZURE_KEY && AZURE_REGION),
        voz: VOZ,
        info: 'Use POST com { livroId, capitulo, verses } para gerar/obter o áudio.',
    });
}
