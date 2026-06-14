import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

// ============================================
// ÁUDIO BÍBLICO — síntese por versículo + concatenação gapless
//
// Cada versículo é sintetizado individualmente pelo Azure (melhor
// qualidade e entonação natural) e depois concatenado em um único
// full.mp3 no servidor. O player toca um único arquivo sem gaps.
//
// A posição de cada versículo é calculada pelo tamanho real do MP3
// de cada verso (preciso, sem estimativa por caracteres).
// ============================================

const AZURE_KEY = process.env.AZURE_SPEECH_KEY;
const AZURE_REGION = process.env.AZURE_SPEECH_REGION;
const VOZ = process.env.AZURE_SPEECH_VOICE || 'pt-BR-FranciscaNeural';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = 'bible-audio';

const MAX_VERSES = 250;
const MAX_TEXT = 1200;
const MP3_BITRATE = 48000; // audio-24khz-48kbitrate-mono-mp3
const BATCH_SIZE = 5;

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

async function sintetizarVerso(texto: string): Promise<ArrayBuffer | null> {
    const ssml =
        `<speak version='1.0' xml:lang='pt-BR'>` +
        `<voice name='${VOZ}'>` +
        `<prosody rate='-4%'>${escaparXml(texto)}</prosody>` +
        `</voice></speak>`;
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

    // Verifica cache do capítulo completo
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

    // Prepara textos limpos
    const versosLimpos = verses
        .map(v => ({ verse: Number(v.verse), texto: limparTexto(String(v.text || '')) }))
        .filter(v => v.verse && v.texto);

    if (versosLimpos.length === 0) {
        return NextResponse.json({ ok: false, error: 'sem_texto' }, { status: 400 });
    }

    // Sintetiza cada versículo individualmente em lotes paralelos
    const audioMap = new Map<number, ArrayBuffer>();

    for (let i = 0; i < versosLimpos.length; i += BATCH_SIZE) {
        const batch = versosLimpos.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
            batch.map(async (v) => {
                const audio = await sintetizarVerso(v.texto);
                return { verse: v.verse, audio };
            })
        );
        for (const r of results) {
            if (r.audio) audioMap.set(r.verse, r.audio);
        }
    }

    // Filtra versículos que foram sintetizados com sucesso, na ordem original
    const ordenados = versosLimpos
        .filter(v => audioMap.has(v.verse))
        .map(v => ({ verse: v.verse, audio: audioMap.get(v.verse)! }));

    if (ordenados.length === 0) {
        return NextResponse.json({ ok: false, error: 'sem_audio' }, { status: 502 });
    }

    // Concatena os MP3s em um único buffer e calcula timing preciso
    const totalSize = ordenados.reduce((sum, r) => sum + r.audio.byteLength, 0);
    const fullBuffer = new Uint8Array(totalSize);
    const segments: { verse: number; start: number; end: number }[] = [];
    let byteOffset = 0;
    let timeOffset = 0;

    for (const r of ordenados) {
        fullBuffer.set(new Uint8Array(r.audio), byteOffset);
        const duration = (r.audio.byteLength * 8) / MP3_BITRATE;
        segments.push({ verse: r.verse, start: timeOffset, end: timeOffset + duration });
        timeOffset += duration;
        byteOffset += r.audio.byteLength;
    }

    // Upload full.mp3
    const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(fullPath, fullBuffer.buffer, { contentType: 'audio/mpeg', upsert: true });

    if (upErr) {
        console.error('🔊 [BIBLE-AUDIO] upload full.mp3 falhou:', upErr.message);
        return NextResponse.json({ ok: false, error: 'upload_falhou' }, { status: 502 });
    }

    // Upload metadados de timing
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
