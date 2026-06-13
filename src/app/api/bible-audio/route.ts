import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

// ============================================
// ÁUDIO BÍBLICO — voz neural (Azure Speech) com cache permanente
//
// O texto da Bíblia nunca muda, então cada versículo é sintetizado
// UMA vez com voz neural natural e guardado no Supabase Storage
// (bucket público "bible-audio"). Nas próximas vezes serve o MP3
// pronto — custo praticamente zero e voz profissional para todos.
//
// Requer no servidor:
//   AZURE_SPEECH_KEY     (KEY 1 do recurso Speech)
//   AZURE_SPEECH_REGION  (ex.: brazilsouth)
//   AZURE_SPEECH_VOICE   (opcional; padrão pt-BR-FranciscaNeural)
// + SUPABASE_SERVICE_ROLE_KEY (já existente) para gravar no Storage.
//
// Sem AZURE_SPEECH_KEY → responde 503 e o player cai na voz do
// navegador (nada quebra).
// ============================================

const AZURE_KEY = process.env.AZURE_SPEECH_KEY;
const AZURE_REGION = process.env.AZURE_SPEECH_REGION;
const VOZ = process.env.AZURE_SPEECH_VOICE || 'pt-BR-FranciscaNeural';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = 'bible-audio';

const MAX_VERSES = 250;
const MAX_TEXT = 1200;

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

async function sintetizarAzure(texto: string): Promise<ArrayBuffer | null> {
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
        // Sem chave → o player usa a voz do navegador
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

    // Lista o que já está em cache para este capítulo (1 chamada só)
    const existentes = new Set<string>();
    const { data: arquivos } = await supabase.storage.from(BUCKET).list(pastaCap, { limit: 1000 });
    if (arquivos) for (const a of arquivos) existentes.add(a.name);

    const resultado: { verse: number; url: string }[] = [];

    for (const v of verses) {
        const verseNum = Number(v.verse);
        if (!verseNum) continue;
        const nomeArq = `${verseNum}.mp3`;
        const caminho = `${pastaCap}/${nomeArq}`;

        if (!existentes.has(nomeArq)) {
            const texto = limparTexto(String(v.text || ''));
            if (!texto) continue;
            const audio = await sintetizarAzure(texto);
            if (!audio) continue; // pula este versículo; player completa com voz do navegador
            const { error: upErr } = await supabase.storage
                .from(BUCKET)
                .upload(caminho, audio, { contentType: 'audio/mpeg', upsert: true });
            if (upErr) {
                console.error('🔊 [BIBLE-AUDIO] upload falhou:', upErr.message);
                continue;
            }
        }

        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(caminho);
        resultado.push({ verse: verseNum, url: pub.publicUrl });
    }

    if (resultado.length === 0) {
        return NextResponse.json({ ok: false, error: 'sem_audio' }, { status: 502 });
    }

    return NextResponse.json({
        ok: true,
        voz: VOZ,
        fonte: `Voz neural · ${VOZ.replace('pt-BR-', '').replace('Neural', '')}`,
        verses: resultado,
    });
}

// GET apenas para diagnóstico rápido do estado da configuração
export async function GET() {
    return NextResponse.json({
        ok: false,
        configurado: Boolean(AZURE_KEY && AZURE_REGION),
        voz: VOZ,
        info: 'Use POST com { livroId, capitulo, verses } para gerar/obter o áudio.',
    });
}
