import { NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript-plus';
import { formatarSegmentosLegenda, parsearDocumentoLegenda } from '@/lib/youtube-captions';
import {
    criarInteracaoYoutube,
    extrairTextoInteracao,
    GEMINI_INTERACTIONS_URL,
} from '@/lib/gemini-youtube-interactions';

// ============================================
// TRANSCRIÇÃO DE VÍDEO DO YOUTUBE.
// Usa primeiro as legendas do próprio YouTube (rápido e sem LLM).
// Gemini/Edge ficam como reserva para vídeos sem legenda acessível.
// ============================================

export const maxDuration = 300;

const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY;

function normalizarUrl(url: string): string | null {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/);
    if (m) return `https://www.youtube.com/watch?v=${m[1]}`;
    if (/^[\w-]{11}$/.test(url.trim())) return `https://www.youtube.com/watch?v=${url.trim()}`;
    return null;
}

// Fallback: a chave do Gemini vive nos secrets do Supabase (edge functions).
// Se ela não estiver na Vercel, delegamos para a edge function transcrever-youtube.
async function viaEdgeFunction(url: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
        return NextResponse.json({ ok: false, error: 'supabase_nao_configurado' }, { status: 503 });
    }
    try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/transcrever-youtube`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
            signal: AbortSignal.timeout(230000),
        });
        const data = await resp.json().catch(() => ({ ok: false, error: 'resposta_invalida' }));
        return NextResponse.json(data, { status: resp.status });
    } catch (e) {
        const abortou = e instanceof Error && e.name === 'TimeoutError';
        return NextResponse.json(
            { ok: false, error: abortou ? 'tempo_esgotado' : 'falha', message: abortou ? 'O vídeo é longo demais e passou do tempo. Tente um mais curto.' : String(e) },
            { status: abortou ? 504 : 500 }
        );
    }
}

export async function POST(request: Request) {
    let urlBruta = '';
    try {
        const body = await request.json();
        urlBruta = String(body?.url || '').trim();
    } catch {
        return NextResponse.json({ ok: false, error: 'json_invalido' }, { status: 400 });
    }

    const url = normalizarUrl(urlBruta);
    if (!url) {
        return NextResponse.json({ ok: false, error: 'link_invalido' }, { status: 400 });
    }

    const videoId = new URL(url).searchParams.get('v');
    if (videoId) {
        try {
            const respostaPublica = await fetch(`https://youtube-transcript.ai/transcript/${videoId}.txt`, {
                headers: { 'User-Agent': 'devocional-pvc/0.1' },
                signal: AbortSignal.timeout(20000),
            });
            if (respostaPublica.ok) {
                const legendaPublica = parsearDocumentoLegenda(await respostaPublica.text());
                if (legendaPublica) {
                    return NextResponse.json({
                        ok: true,
                        titulo: legendaPublica.titulo,
                        texto: legendaPublica.texto,
                        idioma: `legenda do YouTube (${legendaPublica.idioma})`,
                    });
                }
            }
        } catch (erroPublico) {
            console.warn('Serviço público de legenda indisponível; tentando YouTube direto:', erroPublico instanceof Error ? erroPublico.name : 'erro');
        }
    }

    try {
        const resultadoLegenda = await YoutubeTranscript.fetchTranscript(url, {
            videoDetails: true,
            retries: 1,
            signal: AbortSignal.timeout(20000),
        });
        const textoLegenda = formatarSegmentosLegenda(resultadoLegenda.segments);
        if (textoLegenda) {
            return NextResponse.json({
                ok: true,
                titulo: resultadoLegenda.videoDetails.title || 'Vídeo do YouTube',
                texto: textoLegenda,
                idioma: `legenda do YouTube (${resultadoLegenda.segments[0]?.lang || 'auto'})`,
            });
        }
    } catch (erroLegenda) {
        console.warn('Legenda do YouTube indisponível; tentando reserva:', erroLegenda instanceof Error ? erroLegenda.name : 'erro');
    }

    // Sem a chave na Vercel → usa a edge function do Supabase (que tem a chave)
    if (!GEMINI_KEY) {
        return viaEdgeFunction(url);
    }

    const prompt = `Transcreva integralmente, em português, tudo o que é falado neste vídeo (pregação/mensagem).
Regras:
- Retorne APENAS o texto falado, na ordem em que ocorre.
- Organize em parágrafos naturais para facilitar a leitura.
- Não resuma, não comente, não descreva a cena — apenas transcreva a fala.
- Se houver versículos citados, mantenha-os no texto.`;

    try {
        const resp = await fetch(
            GEMINI_INTERACTIONS_URL,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': GEMINI_KEY,
                },
                body: JSON.stringify(criarInteracaoYoutube(url, prompt)),
                signal: AbortSignal.timeout(290000),
            }
        );

        if (!resp.ok) {
            const errText = await resp.text().catch(() => '');
            console.error(`Gemini YouTube ${resp.status}:`, errText.slice(0, 400));
            const amigavel = resp.status === 400
                ? 'Não consegui acessar este vídeo (pode ser privado, restrito ou muito longo).'
                : resp.status === 403
                    ? 'Este vídeo não oferece legenda acessível e o serviço de áudio do Google não está liberado neste plano.'
                    : 'Falha ao transcrever. Tente novamente em instantes.';
            return NextResponse.json({ ok: false, error: 'falha_gemini', status: resp.status, message: amigavel }, { status: 502 });
        }

        const data = await resp.json();
        const texto = extrairTextoInteracao(data);

        if (!texto) {
            return NextResponse.json(
                { ok: false, error: 'sem_texto', message: 'Não consegui extrair a fala deste vídeo.' },
                { status: 422 }
            );
        }

        // Título: usa o oEmbed público do YouTube (leve, não bloqueado)
        let titulo = 'Vídeo do YouTube';
        try {
            const oe = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, {
                signal: AbortSignal.timeout(8000),
            });
            if (oe.ok) {
                const oeData = await oe.json();
                if (oeData.title) titulo = String(oeData.title);
            }
        } catch { /* título é opcional */ }

        return NextResponse.json({ ok: true, titulo, texto, idioma: 'transcrição (Gemini)' });
    } catch (e) {
        const abortou = e instanceof Error && e.name === 'TimeoutError';
        console.error('Erro ao transcrever YouTube:', e);
        return NextResponse.json(
            {
                ok: false,
                error: abortou ? 'tempo_esgotado' : 'falha',
                message: abortou
                    ? 'O vídeo é longo demais e passou do tempo. Tente um vídeo mais curto.'
                    : (e instanceof Error ? e.message : String(e)),
            },
            { status: abortou ? 504 : 500 }
        );
    }
}
