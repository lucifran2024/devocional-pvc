import { NextResponse } from 'next/server';

// ============================================
// TRANSCRIÇÃO DE VÍDEO DO YOUTUBE via Gemini.
// O YouTube bloqueou o acesso direto às legendas (timedtext dá 404), então
// usamos o Gemini, que processa a URL do vídeo público diretamente e
// transcreve o áudio. Vídeos muito longos podem estourar o tempo/limite.
// ============================================

export const maxDuration = 300;

const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY;
const MODEL = 'gemini-2.5-flash';

function normalizarUrl(url: string): string | null {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/);
    if (m) return `https://www.youtube.com/watch?v=${m[1]}`;
    if (/^[\w-]{11}$/.test(url.trim())) return `https://www.youtube.com/watch?v=${url.trim()}`;
    return null;
}

export async function POST(request: Request) {
    if (!GEMINI_KEY) {
        return NextResponse.json({
            ok: false,
            error: 'sem_chave_gemini',
            message: 'A transcrição do YouTube precisa da chave do Gemini configurada na Vercel (GEMINI_API_KEY). As outras funções já operam normalmente.',
        }, { status: 503 });
    }

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

    const prompt = `Transcreva integralmente, em português, tudo o que é falado neste vídeo (pregação/mensagem).
Regras:
- Retorne APENAS o texto falado, na ordem em que ocorre.
- Organize em parágrafos naturais para facilitar a leitura.
- Não resuma, não comente, não descreva a cena — apenas transcreva a fala.
- Se houver versículos citados, mantenha-os no texto.`;

    try {
        const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            { file_data: { file_uri: url } },
                        ],
                    }],
                    generationConfig: { temperature: 0.2 },
                }),
                signal: AbortSignal.timeout(290000),
            }
        );

        if (!resp.ok) {
            const errText = await resp.text().catch(() => '');
            console.error(`Gemini YouTube ${resp.status}:`, errText.slice(0, 400));
            const amigavel = resp.status === 400
                ? 'Não consegui acessar este vídeo (pode ser privado, restrito ou muito longo).'
                : 'Falha ao transcrever. Tente novamente em instantes.';
            return NextResponse.json({ ok: false, error: 'falha_gemini', status: resp.status, message: amigavel }, { status: 502 });
        }

        const data = await resp.json();
        const texto: string = (data.candidates?.[0]?.content?.parts || [])
            .map((p: { text?: string }) => p.text || '')
            .join('')
            .trim();

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
