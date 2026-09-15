import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ============================================
// CONFIG
// ============================================
// A geracao da Palavra pode passar de 60s; sem isso a Vercel mata a funcao no meio.
export const maxDuration = 300;

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ============================================
// HELPERS
// ============================================

function getDataHoje(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

async function enviarTelegram(texto: string): Promise<{ ok: boolean; message_id?: number }> {
    try {
        const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: texto,
            }),
        });
        const data = await resp.json();
        if (!data.ok) {
            console.error('Telegram error:', data.description);
            return { ok: false };
        }
        console.log(`Telegram enviado: message_id=${data.result?.message_id}`);
        return { ok: true, message_id: data.result?.message_id };
    } catch (e) {
        console.error('Erro ao enviar Telegram:', e);
        return { ok: false };
    }
}

// ============================================
// CRON HANDLER
// ============================================
export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID não configurados' }, { status: 500 });
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const dataHoje = getDataHoje();
        const mensagensEnviadas: string[] = [];

        // =============================================
        // 1. PALAVRA DA MANHA (mesma do app; versao curta — max 400-600 chars)
        // =============================================
        let palavraManha = (await supabase
            .from('palavra_manha_diaria')
            .select('*')
            .eq('data', dataHoje)
            .maybeSingle()).data;

        // Se ainda nao existe (cron roda antes do app), gera via Edge Function
        if (!palavraManha) {
            console.log('Palavra da Manha nao existe ainda, gerando via Edge Function...');
            try {
                const gerarResp = await fetch(`${supabaseUrl}/functions/v1/execute`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${supabaseAnonKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        modo_id: 'modo_palavra_manha',
                        data: dataHoje
                    })
                });
                if (gerarResp.ok) {
                    const gerarJson = await gerarResp.json();
                    // Busca de novo do banco (a Edge Function salva automaticamente)
                    if (gerarJson.ok) {
                        const { data: novaPalavra } = await supabase
                            .from('palavra_manha_diaria')
                            .select('*')
                            .eq('data', dataHoje)
                            .maybeSingle();
                        palavraManha = novaPalavra;
                        console.log('Palavra da Manha gerada com sucesso!');
                    }
                }
            } catch (e) {
                console.error('Erro ao gerar Palavra da Manha:', e);
            }
        }

        if (palavraManha && palavraManha.mensagem) {
            // Limpa markdown para texto puro
            const textoLimpo = palavraManha.mensagem
                .replace(/\*\*/g, '')
                .replace(/\*/g, '')
                .replace(/#{1,6}\s/g, '')
                .replace(/>\s?/g, '')
                .trim();

            const dataFormatada = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
            const msgPalavra = `Palavra da Manha\n${dataFormatada}\n\n${textoLimpo}`;
            const enviou = await enviarTelegram(msgPalavra);
            if (enviou.ok) mensagensEnviadas.push('Palavra da Manha');
        } else {
            console.log('Palavra da Manha nao encontrada para hoje:', dataHoje);
        }

        return NextResponse.json({
            ok: true,
            data: dataHoje,
            mensagens_enviadas: mensagensEnviadas,
            total: mensagensEnviadas.length,
        });

    } catch (e) {
        console.error('Erro no cron daily-push:', e);
        return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
    }
}
