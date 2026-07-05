import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

// ============================================
// ÁUDIO DA PALAVRA DA MANHÃ — voz neural Azure (a mesma da Bíblia),
// com cache por data no bucket bible-audio (pasta palavra/).
// O hash do texto entra no nome do arquivo: se a mensagem do dia
// mudar, o áudio regenera em vez de servir o antigo.
// ============================================

const AZURE_KEY = process.env.AZURE_SPEECH_KEY;
const AZURE_REGION = process.env.AZURE_SPEECH_REGION;
const VOZ = process.env.AZURE_SPEECH_VOICE || 'pt-BR-FranciscaNeural';
const ESTILO = process.env.AZURE_SPEECH_STYLE || '';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = 'bible-audio';

const MAX_CHARS = 4000;

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
        .slice(0, MAX_CHARS);
}

// Hash curto e estável (djb2) para versionar o áudio pelo conteúdo
function hashTexto(t: string): string {
    let h = 5381;
    for (let i = 0; i < t.length; i++) {
        h = ((h << 5) + h + t.charCodeAt(i)) >>> 0;
    }
    return h.toString(36);
}

export async function POST(request: Request) {
    if (!AZURE_KEY || !AZURE_REGION) {
        return NextResponse.json({ ok: false, error: 'sem_chave' }, { status: 503 });
    }

    let body: { data?: string; texto?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ ok: false, error: 'json_invalido' }, { status: 400 });
    }

    const data = String(body.data || '').slice(0, 10);
    const texto = limparTexto(String(body.texto || ''));

    if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !texto) {
        return NextResponse.json({ ok: false, error: 'parametros_invalidos' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const pasta = `palavra/${VOZ}`;
    const arquivo = `${data}-${hashTexto(texto)}.mp3`;
    const path = `${pasta}/${arquivo}`;
    const fonte = `Voz neural · ${VOZ.replace('pt-BR-', '').replace('Neural', '')}`;

    // Cache: já existe áudio para esta data + este texto?
    const { data: arquivos } = await supabase.storage.from(BUCKET).list(pasta, { search: arquivo });
    if (arquivos?.some(a => a.name === arquivo)) {
        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
        return NextResponse.json({ ok: true, url: pub.publicUrl, fonte });
    }

    // Sintetiza com Azure (mesma voz e formato do áudio bíblico)
    const conteudo = ESTILO
        ? `<mstts:express-as style='${ESTILO}'><prosody rate='-4%'>${escaparXml(texto)}</prosody></mstts:express-as>`
        : `<prosody rate='-4%'>${escaparXml(texto)}</prosody>`;
    const ssml =
        `<speak version='1.0' xml:lang='pt-BR' xmlns:mstts='https://www.w3.org/2001/mstts'>` +
        `<voice name='${VOZ}'>${conteudo}</voice></speak>`;

    let audio: ArrayBuffer;
    try {
        const resp = await fetch(
            `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
            {
                method: 'POST',
                headers: {
                    'Ocp-Apim-Subscription-Key': AZURE_KEY,
                    'Content-Type': 'application/ssml+xml',
                    'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
                    'User-Agent': 'devocional-pvc',
                },
                body: ssml,
            }
        );
        if (!resp.ok) {
            console.error(`🔊 [PALAVRA-AUDIO] Azure ${resp.status}: ${await resp.text().catch(() => '')}`);
            return NextResponse.json({ ok: false, error: 'azure_falhou' }, { status: 502 });
        }
        audio = await resp.arrayBuffer();
    } catch (e) {
        console.error('🔊 [PALAVRA-AUDIO] Erro Azure:', e);
        return NextResponse.json({ ok: false, error: 'azure_falhou' }, { status: 502 });
    }

    const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, audio, { contentType: 'audio/mpeg', upsert: true });

    if (upErr) {
        console.error('🔊 [PALAVRA-AUDIO] upload falhou:', upErr.message);
        return NextResponse.json({ ok: false, error: 'upload_falhou' }, { status: 502 });
    }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ ok: true, url: pub.publicUrl, fonte });
}

export async function GET() {
    return NextResponse.json({
        ok: false,
        configurado: Boolean(AZURE_KEY && AZURE_REGION),
        voz: VOZ,
        info: 'Use POST com { data, texto } para gerar/obter o áudio da Palavra da Manhã.',
    });
}
