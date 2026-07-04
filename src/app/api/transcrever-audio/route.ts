import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ============================================
// TRANSCRIÇÃO DE ÁUDIO (culto gravado) via Azure Fast Transcription.
// O client grava, sobe o áudio para o bucket 'cultos-audio' e chama esta
// rota com o path. A rota baixa o áudio (service role) e transcreve.
// ============================================

export const maxDuration = 300;

const AZURE_KEY = process.env.AZURE_SPEECH_KEY;
const AZURE_REGION = process.env.AZURE_SPEECH_REGION;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = 'cultos-audio';

export async function POST(request: Request) {
    if (!AZURE_KEY || !AZURE_REGION) {
        return NextResponse.json({ ok: false, error: 'sem_chave_azure' }, { status: 503 });
    }

    let path = '';
    try {
        const body = await request.json();
        path = String(body?.path || '').trim();
    } catch {
        return NextResponse.json({ ok: false, error: 'json_invalido' }, { status: 400 });
    }
    if (!path) {
        return NextResponse.json({ ok: false, error: 'path_ausente' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1. Baixa o áudio do storage
    const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(path);
    if (dlErr || !blob) {
        console.error('Erro ao baixar áudio:', dlErr?.message);
        return NextResponse.json({ ok: false, error: 'audio_nao_encontrado' }, { status: 404 });
    }

    const arrayBuffer = await blob.arrayBuffer();
    const contentType = blob.type || 'audio/webm';
    const ext = path.split('.').pop() || 'webm';

    // 2. Envia para o Azure Fast Transcription (multipart)
    try {
        const form = new FormData();
        form.append('audio', new Blob([arrayBuffer], { type: contentType }), `culto.${ext}`);
        form.append('definition', JSON.stringify({ locales: ['pt-BR'], profanityFilterMode: 'None' }));

        const resp = await fetch(
            `https://${AZURE_REGION}.api.cognitive.microsoft.com/speechtotext/transcriptions:transcribe?api-version=2024-11-15`,
            {
                method: 'POST',
                headers: { 'Ocp-Apim-Subscription-Key': AZURE_KEY },
                body: form,
            }
        );

        if (!resp.ok) {
            const errText = await resp.text().catch(() => '');
            console.error(`Azure STT ${resp.status}:`, errText);
            return NextResponse.json(
                { ok: false, error: 'falha_transcricao', status: resp.status, detalhe: errText.slice(0, 300) },
                { status: 502 }
            );
        }

        const data = await resp.json();
        // Fast Transcription: combinedPhrases[].text
        const texto: string = (data.combinedPhrases || []).map((p: { text: string }) => p.text).join('\n\n').trim();

        if (!texto) {
            return NextResponse.json({ ok: false, error: 'sem_fala', message: 'Não foi possível identificar fala no áudio.' }, { status: 422 });
        }

        return NextResponse.json({ ok: true, texto });
    } catch (e) {
        console.error('Erro na transcrição de áudio:', e);
        return NextResponse.json(
            { ok: false, error: 'erro', message: e instanceof Error ? e.message : String(e) },
            { status: 500 }
        );
    }
}
