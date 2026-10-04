import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
    prepararVersos, montarFalas, montarBlocos, ssmlDoBloco, segmentosDoBloco,
    type Fala, type Segmento,
} from '@/lib/narracao-biblica';
import { escolherVozNarracao, nomeDaVoz, estiloDaVoz } from '@/lib/vozes-narracao';

export const maxDuration = 120;

// ============================================
// ÁUDIO BÍBLICO — narração do capítulo (ou da parte do plano) pelo Azure.
//
// O texto vira SSML de leitor (anúncio do capítulo, título do salmo,
// pausas por pontuação) em blocos que terminam no fim de uma frase.
// Os blocos são sintetizados em paralelo, juntados num MP3 só e guardados
// no Storage por voz + conjunto de versículos. A marcação de cada
// versículo é estimada pela duração de cada bloco (narracao-biblica.ts).
// ============================================

const AZURE_KEY = process.env.AZURE_SPEECH_KEY;
const AZURE_REGION = process.env.AZURE_SPEECH_REGION;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = 'bible-audio';

// v3 = leitura com pausas e anúncio (v2 era texto corrido)
const CACHE_VERSION = 'v3';

const MAX_VERSES = 250;
const MP3_BITRATE = 48000; // audio-24khz-48kbitrate-mono-mp3
const BATCH_SIZE = 4; // blocos sintetizados em paralelo
const TENTATIVAS = 3;

interface VersiculoEntrada {
    verse: number;
    text: string;
    chapter?: number;
}

// Hash curto do conjunto pedido (capítulo:versículo). O Ler Passagem manda
// só a parte do dia, às vezes de 2 capítulos.
function hashVersos(verses: VersiculoEntrada[]): string {
    const key = verses.map(v => (v.chapter ? `${v.chapter}:${v.verse}` : String(v.verse))).join(',');
    let h = 5381;
    for (let i = 0; i < key.length; i++) {
        h = ((h << 5) + h + key.charCodeAt(i)) >>> 0;
    }
    return h.toString(36);
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function sintetizarBloco(bloco: Fala[], voz: string): Promise<ArrayBuffer | null> {
    const ssml = ssmlDoBloco(bloco, { voz, estilo: estiloDaVoz(voz) });
    for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
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
            if (resp.ok) return await resp.arrayBuffer();
            const detalhe = await resp.text().catch(() => '');
            console.error(`🔊 [BIBLE-AUDIO] Azure ${resp.status} (tentativa ${tentativa}): ${detalhe.slice(0, 200)}`);
            // 4xx que não seja limite de uso não melhora tentando de novo
            if (resp.status < 500 && resp.status !== 429) return null;
        } catch (e) {
            console.error(`🔊 [BIBLE-AUDIO] Erro Azure (tentativa ${tentativa}):`, e);
        }
        if (tentativa < TENTATIVAS) await esperar(600 * tentativa);
    }
    return null;
}

export async function POST(request: Request) {
    if (!AZURE_KEY || !AZURE_REGION) {
        return NextResponse.json({ ok: false, error: 'sem_chave' }, { status: 503 });
    }

    let body: { livroId?: number; capitulo?: number; verses?: VersiculoEntrada[]; voz?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ ok: false, error: 'json_invalido' }, { status: 400 });
    }

    const livroId = Number(body.livroId);
    const capitulo = Number(body.capitulo);
    const verses = Array.isArray(body.verses) ? body.verses.slice(0, MAX_VERSES) : [];
    const voz = escolherVozNarracao(body.voz);

    if (!livroId || !capitulo || verses.length === 0) {
        return NextResponse.json({ ok: false, error: 'parametros_invalidos' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const pastaCap = `${voz}/${CACHE_VERSION}/${livroId}/${capitulo}/${hashVersos(verses)}`;
    const fullPath = `${pastaCap}/full.mp3`;
    const metaPath = `${pastaCap}/full.json`;
    const fonte = `Narração · ${nomeDaVoz(voz)}`;

    // Cache: áudio já narrado para esta voz e este conjunto de versículos
    const { data: arquivos } = await supabase.storage.from(BUCKET).list(pastaCap, { limit: 10 });
    if (arquivos?.some(a => a.name === 'full.mp3') && arquivos.some(a => a.name === 'full.json')) {
        try {
            const { data: metaBlob } = await supabase.storage.from(BUCKET).download(metaPath);
            if (metaBlob) {
                const meta = JSON.parse(await metaBlob.text());
                const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(fullPath);
                return NextResponse.json({ ok: true, fullUrl: pub.publicUrl, segments: meta.segments, voz, fonte });
            }
        } catch {
            // cache corrompido: narra de novo
        }
    }

    const versos = prepararVersos(
        verses.map(v => ({ verse: Number(v.verse), text: String(v.text || ''), chapter: v.chapter ? Number(v.chapter) : undefined })),
        capitulo,
    );
    if (versos.length === 0) {
        return NextResponse.json({ ok: false, error: 'sem_texto' }, { status: 400 });
    }

    const blocos = montarBlocos(montarFalas(versos, livroId));
    const audios: (ArrayBuffer | null)[] = new Array(blocos.length).fill(null);
    for (let i = 0; i < blocos.length; i += BATCH_SIZE) {
        const lote = blocos.slice(i, i + BATCH_SIZE);
        const resultados = await Promise.all(lote.map((bloco) => sintetizarBloco(bloco, voz)));
        resultados.forEach((audio, j) => { audios[i + j] = audio; });
    }

    // Bíblia não pode pular versículo: se um bloco falhou, não guarda nada.
    if (audios.some(a => !a)) {
        return NextResponse.json({ ok: false, error: 'sem_audio' }, { status: 502 });
    }

    const totalSize = audios.reduce((s, a) => s + a!.byteLength, 0);
    const fullBuffer = new Uint8Array(totalSize);
    const segments: Segmento[] = [];
    let byteOffset = 0;
    let timeOffset = 0;
    blocos.forEach((bloco, i) => {
        const audio = audios[i]!;
        fullBuffer.set(new Uint8Array(audio), byteOffset);
        byteOffset += audio.byteLength;
        const duracao = (audio.byteLength * 8) / MP3_BITRATE;
        segments.push(...segmentosDoBloco(bloco, duracao, timeOffset));
        timeOffset += duracao;
    });

    const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(fullPath, fullBuffer.buffer, { contentType: 'audio/mpeg', upsert: true });
    if (upErr) {
        console.error('🔊 [BIBLE-AUDIO] upload full.mp3 falhou:', upErr.message);
        return NextResponse.json({ ok: false, error: 'upload_falhou' }, { status: 502 });
    }
    await supabase.storage
        .from(BUCKET)
        .upload(metaPath, JSON.stringify({ segments }), { contentType: 'application/json', upsert: true });

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(fullPath);
    return NextResponse.json({ ok: true, fullUrl: pub.publicUrl, segments, voz, fonte });
}

export async function GET() {
    return NextResponse.json({
        ok: false,
        configurado: Boolean(AZURE_KEY && AZURE_REGION),
        info: 'Use POST com { livroId, capitulo, verses, voz? } para gerar/obter o áudio.',
    });
}
