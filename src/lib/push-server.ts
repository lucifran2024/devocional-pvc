// Envio de Web Push (server-only) — usado pelos crons e pelo teste manual.
// As inscrições vêm da tabela push_subscriptions (registradas pelo
// NotificationManager quando o usuário toca em "Ativar" no app).

import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

export interface PushPayload {
    title: string;
    body: string;
    url?: string;
}

export interface PushResultado {
    enviados: number;
    removidos: number;
    erros: number;
    total: number;
}

export async function enviarPushParaTodos(payload: PushPayload): Promise<PushResultado> {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
        console.error('[PUSH] Chaves VAPID não configuradas (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY).');
        return { enviados: 0, removidos: 0, erros: 0, total: 0 };
    }

    webpush.setVapidDetails('mailto:dj_lucifran@hotmail.com', publicKey, privateKey);

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: subs, error } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, subscription_json');

    if (error) {
        console.error('[PUSH] Erro ao buscar inscrições:', error.message);
        return { enviados: 0, removidos: 0, erros: 1, total: 0 };
    }

    if (!subs || subs.length === 0) {
        console.log('[PUSH] Nenhum dispositivo inscrito ainda.');
        return { enviados: 0, removidos: 0, erros: 0, total: 0 };
    }

    const corpo = JSON.stringify(payload);
    let enviados = 0;
    let removidos = 0;
    let erros = 0;

    for (const sub of subs) {
        try {
            await webpush.sendNotification(sub.subscription_json as webpush.PushSubscription, corpo);
            enviados++;
        } catch (e) {
            const statusCode = (e as { statusCode?: number })?.statusCode;
            // 404/410 = inscrição morta (app desinstalado, permissão revogada) — limpa
            if (statusCode === 404 || statusCode === 410) {
                await supabase.from('push_subscriptions').delete().eq('id', sub.id);
                removidos++;
                console.log(`[PUSH] Inscrição expirada removida (${sub.id}).`);
            } else {
                erros++;
                console.error(`[PUSH] Falha ao enviar para ${sub.id}:`, e instanceof Error ? e.message : e);
            }
        }
    }

    console.log(`[PUSH] "${payload.title}": ${enviados} enviados, ${removidos} removidos, ${erros} erros.`);
    return { enviados, removidos, erros, total: subs.length };
}
