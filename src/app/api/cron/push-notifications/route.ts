import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { enviarPushParaTodos } from '@/lib/push-server';
import { getDailyVerse } from '@/lib/daily-verse';

// ============================================
// PUSH NOTIFICATIONS (Web Push para o celular)
// Uma rota, três horários no vercel.json (BRT = UTC-3):
//   10:00 UTC (07h) → Palavra da Manhã + Versículo do Dia
//   17:00 UTC (14h) → lembrete de leitura (se pendente)
//   23:00 UTC (20h) → lembrete de leitura (se pendente)
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

        // ===== MANHÃ (< 12h): Palavra da Manhã + Versículo do Dia =====
        if (hora < 12) {
            const enviados: Record<string, unknown> = {};

            // 1) Palavra da Manhã — usa um trecho da mensagem do dia, se existir
            const { data: palavra } = await supabase
                .from('palavra_manha_diaria')
                .select('mensagem')
                .eq('data', dataHoje)
                .maybeSingle();

            let corpoPalavra = 'Sua palavra de hoje está pronta. Toque para ler.';
            if (palavra?.mensagem) {
                const trecho = String(palavra.mensagem)
                    .replace(/[*#_>]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .slice(0, 110);
                if (trecho.length > 30) corpoPalavra = `${trecho}…`;
            }
            enviados.palavra = await enviarPushParaTodos({
                title: '🌅 Palavra da Manhã',
                body: corpoPalavra,
                url: '/',
            });

            // 2) Versículo do Dia — o mesmo que aparece no widget do app
            const verse = getDailyVerse(dataHoje);
            enviados.versiculo = await enviarPushParaTodos({
                title: `📖 Versículo do Dia · ${verse.ref}`,
                body: `“${verse.text}”`,
                url: '/',
            });

            return NextResponse.json({ ok: true, modo: 'manha', data: dataHoje, ...enviados });
        }

        // ===== TARDE/NOITE (>= 12h): lembrete de leitura pendente =====

        // Só faz sentido lembrar quem tem plano ativo
        const { count: inscricoesAtivas } = await supabase
            .from('usuario_inscricoes')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'ativo');

        if (!inscricoesAtivas || inscricoesAtivas === 0) {
            console.log('[PUSH] Sem plano ativo — sem lembrete.');
            return NextResponse.json({ ok: true, modo: 'lembrete', data: dataHoje, lembrete: 'sem_plano' });
        }

        // Já concluiu algum dia de plano hoje? Então não incomoda.
        const { data: lidoHoje } = await supabase
            .from('plano_dias_concluidos')
            .select('id')
            .eq('data_conclusao', dataHoje)
            .limit(1);

        if (lidoHoje && lidoHoje.length > 0) {
            console.log('[PUSH] Leitura de hoje já concluída — sem lembrete.');
            return NextResponse.json({ ok: true, modo: 'lembrete', data: dataHoje, lembrete: 'ja_leu' });
        }

        // Texto varia pelo horário para não repetir a mesma frase 2x/dia
        const noite = hora >= 18;
        const resultado = await enviarPushParaTodos({
            title: noite ? '📖 Leitura de hoje pendente' : '📖 Momento com a Palavra',
            body: noite
                ? 'Ainda dá tempo de manter sua sequência. Alguns minutos antes de dormir?'
                : 'Que tal uma pausa para a leitura do seu plano de hoje?',
            url: '/planos',
        });

        return NextResponse.json({
            ok: true,
            modo: 'lembrete',
            periodo: noite ? 'noite' : 'tarde',
            data: dataHoje,
            lembrete: 'enviado',
            ...resultado,
        });
    } catch (e) {
        console.error('Erro no cron push-notifications:', e);
        return NextResponse.json(
            { error: e instanceof Error ? e.message : String(e) },
            { status: 500 }
        );
    }
}
