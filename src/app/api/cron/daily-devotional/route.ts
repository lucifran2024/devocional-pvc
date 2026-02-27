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

function limparTexto(texto: string): string {
    // Remove @menções (ex: @juciqueiroz, @evangelhoparatodos__, @Maria etc)
    let limpo = texto.replace(/@[\w._]+/g, '').trim();
    // Remove linhas vazias consecutivas (mais de 2)
    limpo = limpo.replace(/\n{3,}/g, '\n\n');
    // Remove espaços extras
    limpo = limpo.replace(/  +/g, ' ');
    // Remove pontos/espaços soltos no inicio de linhas (restos de @removidos)
    limpo = limpo.replace(/^\s*[.,]\s*/gm, '');
    return limpo.trim();
}

function ehDevocionalDoDia(textoOCR: string): boolean {
    const lower = textoOCR.toLowerCase();
    return (
        lower.includes('devocional') ||
        lower.includes('devocional do dia') ||
        lower.includes('reflexão do dia') ||
        lower.includes('reflexao do dia') ||
        lower.includes('palavra do dia') ||
        lower.includes('mensagem do dia')
    );
}

async function enviarTelegram(texto: string): Promise<boolean> {
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
            return false;
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

        // 3. Verificar quais ja foram enviados (todos, nao so hoje)
        const { data: enviados } = await supabase
            .from('telegram_enviados')
            .select('external_id');

        const idsEnviados = new Set((enviados || []).map(e => e.external_id));

        // 4. Filtrar posts nao enviados
        const postsNovos = posts.filter(p => !idsEnviados.has(p.external_id));

        if (postsNovos.length === 0) {
            console.log('Todos os posts ja foram enviados');
            return NextResponse.json({ ok: true, message: 'Todos os posts ja foram enviados' });
        }

        // 5. Priorizar o "Devocional do Dia" — post que tem "Devocional" no OCR
        let postEscolhido = null;

        // Primeiro tenta achar o devocional do dia
        for (const p of postsNovos) {
            const ocr = extrairOCR(p.content);
            if (ocr && ehDevocionalDoDia(ocr)) {
                postEscolhido = p;
                break;
            }
        }

        // Se nao achou devocional do dia, pega o primeiro disponivel
        if (!postEscolhido) {
            // Pega o primeiro que tem OCR
            for (const p of postsNovos) {
                const ocr = extrairOCR(p.content);
                if (ocr) {
                    postEscolhido = p;
                    break;
                }
            }
        }

        if (!postEscolhido) {
            console.log('Nenhum post com conteudo OCR disponivel');
            return NextResponse.json({ ok: true, message: 'Nenhum post com OCR disponivel' });
        }

        const textoOCR = extrairOCR(postEscolhido.content);
        const textoLimpo = limparTexto(textoOCR);

        // 6. Formatar e enviar
        const dataFormatada = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

        const mensagem = `Devocional do Dia\n${dataFormatada}\n\n${textoLimpo}`;

        const enviou = await enviarTelegram(mensagem);

        if (enviou) {
            // 7. Registrar envio
            await supabase.from('telegram_enviados').insert({
                external_id: postEscolhido.external_id,
                data_envio: dataHoje,
                enviado_em: new Date().toISOString()
            });

            // 8. Salvar no DNA Categorizado (alimenta o app automaticamente)
            await supabase.from('dna_categorizado').insert({
                texto_msg: textoLimpo,
                categoria: 'devocional',
                tags: ['evangelhoparatodos', 'devocional_diario']
            }).then(({ error }) => {
                if (error) console.error('Erro ao salvar no DNA:', error.message);
                else console.log('DNA alimentado automaticamente');
            });

            return NextResponse.json({ ok: true, message: 'Devocional enviado e salvo no DNA!' });
        } else {
            return NextResponse.json({ ok: false, message: 'Falha ao enviar para Telegram' }, { status: 500 });
        }

    } catch (e: any) {
        console.error('Erro no cron:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
