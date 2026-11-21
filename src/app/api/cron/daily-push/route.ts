import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { capturarPalavra } from '@/lib/palavra-captura';
import { caminhoPrintPalavra, pngValido } from '@/lib/palavra-artefato';
import type { PalavraManhaCache } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 300;

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function enviarTelegram(png: Uint8Array<ArrayBuffer>, palavra: PalavraManhaCache): Promise<number | null> {
    const metodo = 'sendPhoto';
    const body = new FormData();
    body.set('chat_id', TELEGRAM_CHAT_ID!);
    body.set('photo', new Blob([png], { type: 'image/png' }), 'palavra-da-manha.png');
    try {
        const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${metodo}`, {
            method: 'POST', body, signal: AbortSignal.timeout(15_000),
        });
        const dados = await resp.json();
        const id = dados.result?.message_id;
        if (resp.ok && dados.ok === true && Number.isSafeInteger(id) && id > 0) {
            console.log(`Telegram ${metodo} enviado: data=${palavra.data}, message_id=${id}`);
            return id;
        }
        console.error(`Telegram ${metodo} sem confirmação: HTTP ${resp.status}`);
    } catch {
        console.error(`Telegram ${metodo} sem confirmação de transporte`);
    }
    return null;
}

export async function GET(request: Request) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const previa = new URL(request.url).searchParams.get('verificar') === 'imagem';
    if (!previa && (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID)) {
        return NextResponse.json({ error: 'Telegram não configurado' }, { status: 500 });
    }
    const data = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const buscar = async (): Promise<PalavraManhaCache | null> => {
            const resultado = await supabase.from('palavra_manha_diaria').select('*').eq('data', data).maybeSingle();
            if (resultado.error) throw new Error('Falha ao consultar a Palavra do dia');
            return resultado.data;
        };
        let palavra = await buscar();
        if (!palavra && !previa) {
            const gerarResp = await fetch(`${supabaseUrl}/functions/v1/execute`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${supabaseAnonKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ modo_id: 'modo_palavra_manha', data }),
                signal: AbortSignal.timeout(170_000),
            });
            if (gerarResp.ok && (await gerarResp.json()).ok) palavra = await buscar();
            else console.error(`Geração da Palavra não confirmada: HTTP ${gerarResp.status}`);
        }
        if (palavra?.data !== data || !palavra.mensagem?.trim()) {
            return NextResponse.json({ ok: false, data, mensagens_enviadas: [], total: 0 }, { status: previa ? 404 : 502 });
        }

        const formato = 'foto';
        const falha = (error: string, status: number) => NextResponse.json(
            { ok: false, data, formato, error, mensagens_enviadas: [], total: 0 }, { status },
        );
        const capturar = async () => {
            try { return await capturarPalavra(palavra); }
            catch { return null; }
        };
        if (previa) {
            const png = await capturar();
            return png && pngValido(png) ? new Response(png, { headers: { 'content-type': 'image/png', 'cache-control': 'private, no-store' } })
                : falha('Captura indisponível', 503);
        }

        const caminho = caminhoPrintPalavra(palavra);
        const bucket = supabase.storage.from('pvc');
        const salvo = await bucket.download(caminho);
        let png = salvo.data ? new Uint8Array(await salvo.data.arrayBuffer()) : null;
        if (!png) {
            const erro = salvo.error;
            let ausente = !!erro && (['404', 'NoSuchKey', 'not_found'].includes(String(erro.statusCode ?? '')) ||
                /^object not found$/i.test(erro.message));
            // storage-js pode encapsular um HTTP 400/NoSuchKey em StorageUnknownError
            // sem statusCode nem mensagem útil. Conferir o corpo, não liberar qualquer HTTP 400.
            const original = erro && 'originalError' in erro ? erro.originalError : null;
            if (!ausente && original instanceof Response && original.status === 400) {
                try {
                    const detalhe: unknown = await original.clone().json();
                    ausente = !!detalhe && typeof detalhe === 'object' && 'code' in detalhe &&
                        detalhe.code === 'NoSuchKey' && 'statusCode' in detalhe &&
                        String(detalhe.statusCode) === '404';
                } catch { /* Resposta ilegível continua falha fechada. */ }
            }
            if (!ausente) return falha('Falha ao consultar o print', 502);
            png = await capturar();
            if (!png || !pngValido(png)) return falha('Captura indisponível', 503);
            const gravacao = await bucket.upload(caminho, png, { contentType: 'image/png', cacheControl: '3600', upsert: false });
            if (gravacao.error) {
                // Outra execução pode ter gravado primeiro, ou a resposta do upload pode ter falhado.
                const vencedor = await bucket.download(caminho);
                if (!vencedor.data) return falha('Print não gravado', 502);
                png = new Uint8Array(await vencedor.data.arrayBuffer());
            }
        }
        if (!png || !pngValido(png)) return falha('Print inválido', 502);
        // A imagem é compartilhada; a tentativa de envio é uma trava separada, por dia.
        // Timeout não prova que o Telegram não recebeu: não repetir automaticamente.
        const trava = `palavra-da-manha/${data}/telegram.json`;
        const lock = await bucket.upload(trava, '{}', {
            contentType: 'application/json', cacheControl: '0', upsert: false,
        });
        if (lock.error) {
            const code = 'statusCode' in lock.error ? String(lock.error.statusCode) : '';
            const existente = code === '409' || /^the resource already exists$/i.test(lock.error.message);
            return falha(existente ? 'Tentativa Telegram já registrada; conferir recibo antes de repetir' : 'Falha ao reservar o envio Telegram', existente ? 409 : 502);
        }
        const message_id = await enviarTelegram(png, palavra);
        if (message_id === null) {
            return NextResponse.json({ ok: false, data, formato, mensagens_enviadas: [], total: 0 }, { status: 502 });
        }
        const gravacao = await bucket.upload(trava, JSON.stringify({ data, formato, message_id }), {
            contentType: 'application/json', cacheControl: '0', upsert: true,
        });
        if (gravacao.error) {
            console.error(`Telegram enviado (message_id=${message_id}), mas falha ao gravar trava: ${trava}`);
        }
        return NextResponse.json({ ok: true, data, formato, message_id, mensagens_enviadas: ['Palavra da Manha'], total: 1 });
    } catch {
        console.error('daily-push: erro ao consultar ou gerar a Palavra');
        return NextResponse.json({ ok: false, data, mensagens_enviadas: [], total: 0 }, { status: 502 });
    }
}
