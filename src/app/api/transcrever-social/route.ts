import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { identificarLinkVideoSocial } from '@/lib/social-video';

export const maxDuration = 300;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function bearerToken(request: Request): string | null {
    const authorization = request.headers.get('authorization') || '';
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    return match?.[1]?.trim() || null;
}

export async function POST(request: Request) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        return NextResponse.json({ ok: false, error: 'supabase_nao_configurado' }, { status: 503 });
    }

    const token = bearerToken(request);
    if (!token) {
        return NextResponse.json({ ok: false, error: 'nao_autenticado', message: 'Entre novamente no app.' }, { status: 401 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
        return NextResponse.json({ ok: false, error: 'sessao_invalida', message: 'Sua sessão expirou. Entre novamente.' }, { status: 401 });
    }

    let urlBruta = '';
    try {
        const body = await request.json();
        urlBruta = String(body?.url || '').trim();
    } catch {
        return NextResponse.json({ ok: false, error: 'json_invalido' }, { status: 400 });
    }

    const link = identificarLinkVideoSocial(urlBruta);
    if (!link) {
        return NextResponse.json({
            ok: false,
            error: 'link_invalido',
            message: 'Cole um link de Reel do Instagram ou de vídeo do TikTok.',
        }, { status: 400 });
    }

    try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/transcrever-social`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                apikey: SUPABASE_ANON_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: link.url }),
            signal: AbortSignal.timeout(290000),
        });

        const data = await resp.json().catch(() => ({
            ok: false,
            error: 'resposta_invalida',
            message: 'O serviço de transcrição respondeu de forma inesperada.',
        }));
        return NextResponse.json(data, { status: resp.status });
    } catch (error) {
        const timeout = error instanceof Error && error.name === 'TimeoutError';
        return NextResponse.json({
            ok: false,
            error: timeout ? 'tempo_esgotado' : 'falha_conexao',
            message: timeout
                ? 'O vídeo demorou mais que o esperado. Tente novamente em alguns instantes.'
                : 'Não consegui acessar o serviço de transcrição.',
        }, { status: timeout ? 504 : 502 });
    }
}
