import { NextResponse } from 'next/server';

// ============================================
// TRANSCRIÇÃO DE VÍDEO DO YOUTUBE (via legendas)
// Busca as legendas do vídeo (manuais ou automáticas) e devolve o texto
// corrido. Não baixa áudio — usa as legendas que o próprio YouTube gera.
// ============================================

export const maxDuration = 60;

function extrairVideoId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/,
        /^([\w-]{11})$/,
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
    }
    return null;
}

interface CaptionTrack {
    baseUrl: string;
    languageCode: string;
    kind?: string;
    name?: { simpleText?: string };
}

function decodeEntities(s: string): string {
    return s
        .replace(/&amp;#39;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&amp;quot;/g, '"')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#160;/g, ' ')
        .replace(/\n/g, ' ');
}

export async function POST(request: Request) {
    let url = '';
    try {
        const body = await request.json();
        url = String(body?.url || '').trim();
    } catch {
        return NextResponse.json({ ok: false, error: 'json_invalido' }, { status: 400 });
    }

    const videoId = extrairVideoId(url);
    if (!videoId) {
        return NextResponse.json({ ok: false, error: 'link_invalido' }, { status: 400 });
    }

    const headersBrowser = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    };

    try {
        // 1. Baixa a página do vídeo e extrai a lista de legendas
        const pageResp = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=pt`, {
            headers: headersBrowser,
            signal: AbortSignal.timeout(20000),
        });
        const html = await pageResp.text();

        const titleMatch = html.match(/<title>([^<]*)<\/title>/);
        const titulo = titleMatch ? decodeEntities(titleMatch[1]).replace(/ - YouTube$/, '').trim() : 'Vídeo do YouTube';

        const tracksMatch = html.match(/"captionTracks":(\[[\s\S]*?\])/);
        if (!tracksMatch) {
            return NextResponse.json(
                { ok: false, error: 'sem_legenda', message: 'Este vídeo não tem legendas disponíveis.' },
                { status: 422 }
            );
        }

        let tracks: CaptionTrack[];
        try {
            tracks = JSON.parse(tracksMatch[1].replace(/\\u0026/g, '&'));
        } catch {
            return NextResponse.json({ ok: false, error: 'parse_legenda' }, { status: 502 });
        }

        if (!tracks.length) {
            return NextResponse.json(
                { ok: false, error: 'sem_legenda', message: 'Este vídeo não tem legendas disponíveis.' },
                { status: 422 }
            );
        }

        // 2. Prefere pt; senão a primeira disponível
        const track =
            tracks.find((t) => t.languageCode === 'pt' && t.kind !== 'asr') ||
            tracks.find((t) => t.languageCode === 'pt') ||
            tracks.find((t) => t.languageCode?.startsWith('pt')) ||
            tracks[0];

        // 3. Baixa a legenda (XML timedtext)
        const capResp = await fetch(track.baseUrl, { headers: headersBrowser, signal: AbortSignal.timeout(20000) });
        const xml = await capResp.text();

        const linhas = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((m) => decodeEntities(m[1]).trim()).filter(Boolean);

        if (linhas.length === 0) {
            return NextResponse.json({ ok: false, error: 'legenda_vazia' }, { status: 422 });
        }

        // Junta em parágrafos legíveis (agrupa ~25 trechos por bloco)
        const texto = linhas.join(' ').replace(/\s+/g, ' ').trim();
        const idioma = track.languageCode + (track.kind === 'asr' ? ' (automática)' : '');

        return NextResponse.json({ ok: true, titulo, texto, idioma, videoId });
    } catch (e) {
        console.error('Erro ao transcrever YouTube:', e);
        return NextResponse.json(
            { ok: false, error: 'falha', message: e instanceof Error ? e.message : String(e) },
            { status: 500 }
        );
    }
}
