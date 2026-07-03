import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

// ============================================
// ÁUDIO BÍBLICO — síntese em BLOCOS contínuos + concatenação gapless
//
// Versículos consecutivos são agrupados em blocos de texto corrido e
// sintetizados juntos pelo Azure. Assim a voz mantém a prosódia natural
// entre os versículos (sem a entonação de "fim de frase" que a síntese
// verso-a-verso causava) — leitura muito mais fluida.
//
// O highlight de cada versículo é derivado distribuindo a duração de
// cada bloco proporcionalmente ao tamanho do texto de cada versículo
// dentro dele (a taxa de fala é ~constante).
// ============================================

const AZURE_KEY = process.env.AZURE_SPEECH_KEY;
const AZURE_REGION = process.env.AZURE_SPEECH_REGION;
const VOZ = process.env.AZURE_SPEECH_VOICE || 'pt-BR-FranciscaNeural';
// Estilo opcional (algumas vozes suportam, ex: Francisca 'calm'/'gentle').
// Se a voz não suportar o estilo, o Azure ignora e usa o neutro.
const ESTILO = process.env.AZURE_SPEECH_STYLE || '';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = 'bible-audio';

// v2 = síntese em blocos (invalidação limpa do cache verso-a-verso antigo)
const CACHE_VERSION = 'v2';

const MAX_VERSES = 250;
const MAX_VERSE_CHARS = 1500;
const MAX_BLOCK_CHARS = 700; // versículos agrupados até ~700 chars por bloco
const MP3_BITRATE = 48000; // audio-24khz-48kbitrate-mono-mp3
const BATCH_SIZE = 4; // blocos sintetizados em paralelo por lote

interface VersiculoEntrada {
    verse: number;
    text: string;
}

interface VersoLimpo {
    verse: number;
    texto: string;
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
        .slice(0, MAX_VERSE_CHARS);
}

// Agrupa versículos consecutivos em blocos de texto corrido (~MAX_BLOCK_CHARS).
function montarBlocos(versos: VersoLimpo[]): VersoLimpo[][] {
    const blocos: VersoLimpo[][] = [];
    let atual: VersoLimpo[] = [];
    let atualLen = 0;
    for (const v of versos) {
        if (atualLen > 0 && atualLen + v.texto.length > MAX_BLOCK_CHARS) {
            blocos.push(atual);
            atual = [];
            atualLen = 0;
        }
        atual.push(v);
        atualLen += v.texto.length + 1;
    }
    if (atual.length) blocos.push(atual);
    return blocos;
}

async function sintetizarBloco(versos: VersoLimpo[]): Promise<ArrayBuffer | null> {
    // Texto corrido: a voz encadeia os versículos com prosódia natural.
    const texto = versos.map((v) => v.texto).join(' ');
    const conteudo = ESTILO
        ? `<mstts:express-as style='${ESTILO}'><prosody rate='-4%'>${escaparXml(texto)}</prosody></mstts:express-as>`
        : `<prosody rate='-4%'>${escaparXml(texto)}</prosody>`;
    const ssml =
        `<speak version='1.0' xml:lang='pt-BR' xmlns:mstts='https://www.w3.org/2001/mstts'>` +
        `<voice name='${VOZ}'>${conteudo}</voice></speak>`;
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
    const pastaCap = `${VOZ}/${CACHE_VERSION}/${livroId}/${capitulo}`;
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

    // Agrupa em blocos e sintetiza cada bloco (texto corrido) em lotes paralelos
    const blocos = montarBlocos(versosLimpos);
    const blocosAudio = new Map<number, ArrayBuffer>(); // índice do bloco -> mp3

    for (let i = 0; i < blocos.length; i += BATCH_SIZE) {
        const lote = blocos.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
            lote.map(async (bloco, j) => ({ idx: i + j, audio: await sintetizarBloco(bloco) }))
        );
        for (const r of results) {
            if (r.audio) blocosAudio.set(r.idx, r.audio);
        }
    }

    // Mantém apenas os blocos sintetizados com sucesso, na ordem original
    const blocosOk = blocos
        .map((versos, idx) => ({ versos, audio: blocosAudio.get(idx) }))
        .filter((b): b is { versos: VersoLimpo[]; audio: ArrayBuffer } => Boolean(b.audio));

    if (blocosOk.length === 0) {
        return NextResponse.json({ ok: false, error: 'sem_audio' }, { status: 502 });
    }

    // Concatena os MP3s e deriva o timing de cada versículo dentro do bloco
    const totalSize = blocosOk.reduce((sum, b) => sum + b.audio.byteLength, 0);
    const fullBuffer = new Uint8Array(totalSize);
    const segments: { verse: number; start: number; end: number }[] = [];
    let byteOffset = 0;
    let timeOffset = 0;

    for (const bloco of blocosOk) {
        fullBuffer.set(new Uint8Array(bloco.audio), byteOffset);
        byteOffset += bloco.audio.byteLength;

        const duracaoBloco = (bloco.audio.byteLength * 8) / MP3_BITRATE;
        const totalChars = bloco.versos.reduce((s, v) => s + Math.max(1, v.texto.length), 0);
        let acc = 0;
        for (const v of bloco.versos) {
            const fatia = (Math.max(1, v.texto.length) / totalChars) * duracaoBloco;
            segments.push({ verse: v.verse, start: timeOffset + acc, end: timeOffset + acc + fatia });
            acc += fatia;
        }
        timeOffset += duracaoBloco;
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
