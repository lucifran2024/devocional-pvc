import { NextResponse } from 'next/server';

// TEMPORÁRIO: valida o Azure Fast Transcription na região da Vercel.
// Gera um áudio pela voz do Azure e transcreve de volta. Remover depois.
export const maxDuration = 60;

const KEY = process.env.AZURE_SPEECH_KEY;
const REGION = process.env.AZURE_SPEECH_REGION;

export async function GET() {
    if (!KEY || !REGION) {
        return NextResponse.json({ ok: false, error: 'sem_chave_azure', temRegiao: !!REGION }, { status: 503 });
    }

    const frase = 'Deus é bom o tempo todo, e o tempo todo Deus é bom.';

    // 1) TTS -> MP3
    const ssml = `<speak version='1.0' xml:lang='pt-BR'><voice name='pt-BR-FranciscaNeural'>${frase}</voice></speak>`;
    const tts = await fetch(`https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method: 'POST',
        headers: {
            'Ocp-Apim-Subscription-Key': KEY,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
            'User-Agent': 'test-stt',
        },
        body: ssml,
    });
    if (!tts.ok) {
        return NextResponse.json({ ok: false, etapa: 'tts', status: tts.status, detalhe: (await tts.text()).slice(0, 200) }, { status: 502 });
    }
    const audio = await tts.arrayBuffer();

    // 2) Fast Transcription
    const form = new FormData();
    form.append('audio', new Blob([audio], { type: 'audio/mpeg' }), 'teste.mp3');
    form.append('definition', JSON.stringify({ locales: ['pt-BR'] }));
    const stt = await fetch(`https://${REGION}.api.cognitive.microsoft.com/speechtotext/transcriptions:transcribe?api-version=2024-11-15`, {
        method: 'POST',
        headers: { 'Ocp-Apim-Subscription-Key': KEY },
        body: form,
    });
    const sttText = await stt.text();
    if (!stt.ok) {
        return NextResponse.json({ ok: false, etapa: 'stt', status: stt.status, region: REGION, detalhe: sttText.slice(0, 400) }, { status: 502 });
    }
    let parsed: { combinedPhrases?: { text: string }[] } | null = null;
    try { parsed = JSON.parse(sttText); } catch { /* ignore */ }
    const texto = (parsed?.combinedPhrases || []).map((p) => p.text).join(' ');
    return NextResponse.json({ ok: true, region: REGION, original: frase, transcrito: texto, audioBytes: audio.byteLength });
}
