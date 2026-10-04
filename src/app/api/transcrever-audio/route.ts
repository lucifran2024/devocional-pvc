import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { montarParagrafos } from '@/lib/transcricao-paragrafos';

// ============================================
// TRANSCRIÇÃO DE ÁUDIO (culto gravado ou áudio enviado) via Azure Fast
// Transcription. O app sobe o áudio para o bucket 'cultos-audio', na pasta
// da própria conta, e chama esta rota com o caminho e o token da sessão.
// A rota confere o dono, baixa o áudio (service role) e transcreve.
// ============================================

export const maxDuration = 300;

const AZURE_KEY = process.env.AZURE_SPEECH_KEY;
const AZURE_REGION = process.env.AZURE_SPEECH_REGION;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = 'cultos-audio';

function erro(status: number, error: string, message: string, extra: Record<string, unknown> = {}) {
    return NextResponse.json({ ok: false, error, message, ...extra }, { status });
}

function mensagemDoAzure(status: number): string {
    if (status === 401 || status === 403) return 'O serviço de transcrição recusou a chave de acesso. Avise o responsável pelo app.';
    if (status === 429) return 'O serviço de transcrição está no limite agora. Tente de novo daqui a alguns minutos.';
    if (status === 400 || status === 413 || status === 415) return 'Não consegui ler esse áudio. Ele pode estar vazio, corrompido ou num formato diferente.';
    return 'O serviço de transcrição não respondeu. Tente de novo em instantes.';
}

export async function POST(request: Request) {
    if (!AZURE_KEY || !AZURE_REGION) {
        return erro(503, 'sem_chave_azure', 'A transcrição de áudio não está configurada.');
    }

    let path = '';
    try {
        const body = await request.json();
        path = String(body?.path || '').trim();
    } catch {
        return erro(400, 'json_invalido', 'Pedido inválido.');
    }
    if (!path) return erro(400, 'path_ausente', 'Nenhum áudio foi indicado.');

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Só o dono transcreve: o token da sessão precisa ser da conta da pasta.
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return erro(401, 'sem_login', 'Entre na sua conta para transcrever.');
    const { data: sessao, error: erroLogin } = await supabase.auth.getUser(token);
    if (erroLogin || !sessao?.user) return erro(401, 'sem_login', 'Sua sessão expirou. Entre de novo e tente outra vez.');
    if (!path.startsWith(`${sessao.user.id}/`) || path.includes('..')) {
        return erro(403, 'audio_de_outra_conta', 'Esse áudio não pertence à sua conta.');
    }

    const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(path);
    if (dlErr || !blob) {
        console.error('Erro ao baixar áudio:', dlErr?.message);
        return erro(404, 'audio_nao_encontrado', 'Não encontrei o áudio enviado. Envie de novo.');
    }

    const arrayBuffer = await blob.arrayBuffer();
    const contentType = blob.type || 'audio/webm';
    const ext = path.split('.').pop() || 'webm';

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
            console.error(`Azure STT ${resp.status}:`, errText.slice(0, 500));
            return erro(502, 'falha_transcricao', mensagemDoAzure(resp.status), { status: resp.status });
        }

        const data = await resp.json();
        const texto = montarParagrafos(data.phrases)
            || (data.combinedPhrases || []).map((p: { text: string }) => p.text).join('\n\n').trim();

        if (!texto) {
            return erro(422, 'sem_fala', 'Não encontrei fala nesse áudio. Confira se o microfone captou a voz.');
        }

        return NextResponse.json({
            ok: true,
            texto,
            duracaoSeg: Math.round(Number(data.durationMilliseconds || 0) / 1000),
        });
    } catch (e) {
        console.error('Erro na transcrição de áudio:', e);
        return erro(500, 'erro', 'Erro ao transcrever. Tente de novo.');
    }
}
