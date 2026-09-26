import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { enviarPushParaTodos } from '@/lib/push-server';
import { buscarVersiculoDoDia } from '@/lib/daily-verse';
import { notificacaoPalavra, notificacaoVersiculo } from '@/lib/notificacoes';

function getDataHoje(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

// POST = envia uma notificação de teste para todos os dispositivos inscritos.
// Body opcional { tipo }: 'versiculo' | 'palavra' mostram o formato real;
// qualquer outro valor manda a mensagem genérica de teste.
export async function POST(request: Request) {
    let tipo = 'teste';
    try {
        const body = await request.json();
        if (body?.tipo) tipo = String(body.tipo);
    } catch {
        /* sem body = teste genérico */
    }

    let payload;
    if (tipo === 'versiculo') {
        payload = notificacaoVersiculo(await buscarVersiculoDoDia(getDataHoje()));
    } else if (tipo === 'palavra') {
        // Mesmo formato da notificação real, com a Palavra de hoje (se já existir)
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const { data: palavra } = await supabase
            .from('palavra_manha_diaria')
            .select('mensagem')
            .eq('data', getDataHoje())
            .maybeSingle();
        payload = notificacaoPalavra(palavra?.mensagem);
    } else {
        payload = { title: '🔔 Teste de notificação', body: 'Se você está vendo isso, as notificações estão funcionando!', url: '/', tag: 'pvc-teste' };
    }

    const resultado = await enviarPushParaTodos(payload);
    return NextResponse.json({ ok: true, tipo, ...resultado });
}

// Endpoint de diagnostico - mostra status das subscriptions
export async function GET() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: subs, error } = await supabase
        .from('push_subscriptions')
        .select('*');

    return NextResponse.json({
        total_subscriptions: subs?.length || 0,
        subscriptions: subs || [],
        error: error?.message || null,
        env_check: {
            has_vapid_public: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
            has_vapid_private: !!process.env.VAPID_PRIVATE_KEY,
            has_supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        }
    });
}
