import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { enviarPushParaTodos } from '@/lib/push-server';

// POST = envia uma notificação de teste para todos os dispositivos inscritos.
// Útil para validar o push logo depois de tocar "Ativar" no app.
export async function POST() {
    const resultado = await enviarPushParaTodos({
        title: '🔔 Teste do Devocional PVC',
        body: 'Se você está vendo isso, as notificações estão funcionando!',
        url: '/',
    });
    return NextResponse.json({ ok: true, ...resultado });
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
