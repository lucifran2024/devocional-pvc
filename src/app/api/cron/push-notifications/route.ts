import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { enviarPushParaTodos } from '@/lib/push-server';

// ============================================
// PUSH NOTIFICATIONS (Web Push para o celular)
// Mesma rota, dois horários no vercel.json:
//  - 10:00 UTC (07:00 BRT) → "Palavra da Manhã pronta"
//  - 23:00 UTC (20:00 BRT) → lembrete se a leitura do dia está pendente
// A rota decide o modo pela hora em São Paulo.
// ============================================

export const maxDuration = 60;

function getDataHoje(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

function getHoraSaoPaulo(): number {
    return parseInt(
        new Date().toLocaleString('en-US', {
            timeZone: 'America/Sao_Paulo',
            hour: '2-digit',
            hour12: false,
        }),
        10
    );
}

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const dataHoje = getDataHoje();
        const hora = getHoraSaoPaulo();

        // ===== MANHÃ: Palavra da Manhã pronta =====
        if (hora < 12) {
            // Usa um trecho da palavra do dia como corpo, se já existir
            const { data: palavra } = await supabase
                .from('palavra_manha_diaria')
                .select('mensagem')
                .eq('data', dataHoje)
                .maybeSingle();

            let corpo = 'Sua palavra de hoje está pronta. Toque para ler.';
            if (palavra?.mensagem) {
                const trecho = palavra.mensagem
                    .replace(/[*#_>]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .slice(0, 110);
                if (trecho.length > 30) corpo = `${trecho}…`;
            }

            const resultado = await enviarPushParaTodos({
                title: '🌅 Palavra da Manhã',
                body: corpo,
                url: '/',
            });

            return NextResponse.json({ ok: true, modo: 'manha', data: dataHoje, ...resultado });
        }

        // ===== NOITE: lembrete de leitura pendente =====
        const { data: lidoHoje } = await supabase
            .from('plano_dias_concluidos')
            .select('id')
            .eq('data_conclusao', dataHoje)
            .limit(1);

        if (lidoHoje && lidoHoje.length > 0) {
            console.log('[PUSH] Leitura de hoje já concluída — sem lembrete.');
            return NextResponse.json({ ok: true, modo: 'noite', data: dataHoje, lembrete: 'ja_leu' });
        }

        const resultado = await enviarPushParaTodos({
            title: '📖 Leitura de hoje pendente',
            body: 'Ainda dá tempo de manter sua sequência. Alguns minutos com a Palavra antes de dormir?',
            url: '/planos',
        });

        return NextResponse.json({ ok: true, modo: 'noite', data: dataHoje, lembrete: 'enviado', ...resultado });
    } catch (e) {
        console.error('Erro no cron push-notifications:', e);
        return NextResponse.json(
            { error: e instanceof Error ? e.message : String(e) },
            { status: 500 }
        );
    }
}
