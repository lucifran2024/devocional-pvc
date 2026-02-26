import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ============================================
// CONFIG
// ============================================
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8785996157:AAHaRBPg7wKFZ6aTgesRAR9CaCwDU1C3_00';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '8239043013';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ============================================
// HELPERS
// ============================================

function getDataHoje(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

function extrairOCR(content: string): string {
    if (!content) return '';
    if (content.includes('[OCR]:')) {
        const parts = content.split('[LEGENDA]:');
        return parts[0].replace('[OCR]:', '').trim();
    }
    return content.trim();
}

async function enviarTelegram(texto: string): Promise<boolean> {
    try {
        const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: texto,
                parse_mode: 'HTML',
            }),
        });
        const data = await resp.json();
        if (!data.ok) {
            console.error('Telegram error:', data.description);
            // Tentar sem parse_mode se HTML falhar
            const resp2 = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: texto.replace(/<[^>]*>/g, ''),
                }),
            });
            const data2 = await resp2.json();
            return data2.ok;
        }
        return true;
    } catch (e) {
        console.error('Erro ao enviar Telegram:', e);
        return false;
    }
}

// ============================================
// CRON HANDLER
// ============================================
export async function GET(request: Request) {
    // Verificar cron secret (seguranca Vercel)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const dataHoje = getDataHoje();

        // 1. Buscar posts do Instagram via Supabase Edge Function
        const { data: funcData, error: funcError } = await supabase.functions.invoke('execute', {
            body: {
                modo_id: 'devocional_externo',
                data: dataHoje,
                fonte_rss: 'instagram'
            }
        });

        if (funcError) {
            console.error('Erro ao buscar devocionais:', funcError);
            return NextResponse.json({ error: 'Erro ao buscar devocionais', details: funcError.message }, { status: 500 });
        }

        // 2. Extrair posts
        let posts: { external_id: string; content: string; published_at: string; author_name: string }[] = [];
        if (funcData?.dados_estruturados && Array.isArray(funcData.dados_estruturados)) {
            posts = funcData.dados_estruturados;
        } else if (Array.isArray(funcData?.resultado)) {
            posts = funcData.resultado;
        }

        // Filtrar apenas do evangelhoparatodos
        posts = posts.filter(p =>
            p.author_name?.toLowerCase().includes('evangelho') ||
            p.author_name?.toLowerCase().includes('evangelhoparatodos')
        );

        if (posts.length === 0) {
            console.log('Nenhum post encontrado do evangelhoparatodos');
            return NextResponse.json({ ok: true, message: 'Nenhum post novo encontrado' });
        }

        // 3. Verificar quais ja foram enviados hoje
        //    Usa tabela telegram_enviados para controle
        const { data: enviados } = await supabase
            .from('telegram_enviados')
            .select('external_id')
            .eq('data_envio', dataHoje);

        const idsEnviados = new Set((enviados || []).map(e => e.external_id));

        // 4. Filtrar posts nao enviados
        const postsNovos = posts.filter(p => !idsEnviados.has(p.external_id));

        if (postsNovos.length === 0) {
            console.log('Todos os posts de hoje ja foram enviados');
            return NextResponse.json({ ok: true, message: 'Todos os posts ja foram enviados hoje' });
        }

        // 5. Pegar o proximo post (o mais antigo nao enviado)
        const post = postsNovos[0];
        const textoOCR = extrairOCR(post.content);

        if (!textoOCR) {
            console.log('Post sem conteudo OCR:', post.external_id);
            return NextResponse.json({ ok: true, message: 'Post sem conteudo OCR' });
        }

        // 6. Formatar e enviar
        const dataFormatada = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const horaFormatada = new Date().toLocaleTimeString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            hour: '2-digit',
            minute: '2-digit'
        });

        const mensagem = `Devocional do Dia - ${dataFormatada}\n${horaFormatada}\n\n${textoOCR}\n\nvia @evangelhoparatodos__`;

        const enviou = await enviarTelegram(mensagem);

        if (enviou) {
            // 7. Registrar envio
            await supabase.from('telegram_enviados').insert({
                external_id: post.external_id,
                data_envio: dataHoje,
                enviado_em: new Date().toISOString()
            });

            return NextResponse.json({ ok: true, message: 'Devocional enviado com sucesso!' });
        } else {
            return NextResponse.json({ ok: false, message: 'Falha ao enviar para Telegram' }, { status: 500 });
        }

    } catch (e: any) {
        console.error('Erro no cron:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
