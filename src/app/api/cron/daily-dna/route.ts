import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
    buildDnaGeracaoRecords,
    getMessageDedupKey,
    inferCategoriaParaGeracao,
    processGeneratedContent,
    splitTelegramText,
} from '@/lib/dna-processing';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const ESTILOS_ROTACAO = ['devocional', 'oracao', 'versiculo', 'reflexao', 'exortacao', 'declaracao'];
const MAX_GENERATION_ATTEMPTS = 2;

interface ExecuteGenerationResult {
    ok: boolean;
    resultado?: string;
    error?: string;
    tema_usado?: string;
    categoria_usada?: string;
    estilo_usado?: string;
}

function ensureEnv() {
    const missing: string[] = [];
    if (!TELEGRAM_BOT_TOKEN) missing.push('TELEGRAM_BOT_TOKEN');
    if (!TELEGRAM_CHAT_ID) missing.push('TELEGRAM_CHAT_ID');
    if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');

    if (missing.length > 0) {
        throw new Error(`Variáveis obrigatórias ausentes: ${missing.join(', ')}`);
    }
}

function getFiltrosDoDia(dataStr: string, modo: 'favoritas' | 'estilo'): Record<string, unknown> {
    const data = new Date(`${dataStr}T12:00:00`);
    const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const diaSemana = dias[data.getDay()];

    const filtros: Record<string, unknown> = {
        quantidade: 5,
        diasSemana: diaSemana,
        contextoEstrategia: 'all',
        usarDnaBase: true,
        usarPassagemDia: false,
        neutro: false,
    };

    if (modo === 'estilo') {
        const seed = parseInt(dataStr.replace(/-/g, ''), 10);
        filtros.estilo = ESTILOS_ROTACAO[seed % ESTILOS_ROTACAO.length];
    }

    return filtros;
}

function getDataHoje(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function enviarTelegram(texto: string): Promise<boolean> {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.error('Telegram não configurado.');
        return false;
    }

    const partes = splitTelegramText(texto);
    let envioCompleto = true;

    for (const parte of partes) {
        try {
            const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: parte,
                }),
            });

            const data = await resp.json();
            if (!data.ok) {
                console.error('Telegram error:', data.description);
                envioCompleto = false;
            }
        } catch (error) {
            console.error('Erro ao enviar Telegram:', error);
            envioCompleto = false;
        }

        await delay(180);
    }

    return envioCompleto;
}

async function gerarConteudo(
    modoId: string,
    data: string,
    filtros: Record<string, unknown>
): Promise<ExecuteGenerationResult | null> {
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase não configurado para daily-dna.');
    }

    try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/execute`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${supabaseAnonKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ modo_id: modoId, data, filtros }),
        });

        if (!resp.ok) {
            const errorText = await resp.text();
            console.error(`Edge Function erro ${resp.status}:`, errorText);
            return null;
        }

        return (await resp.json()) as ExecuteGenerationResult;
    } catch (error) {
        console.error('Erro ao chamar Edge Function:', error);
        return null;
    }
}

async function gerarMensagensValidadas(
    modoId: 'modo_favoritas' | 'modo_estilo',
    data: string,
    filtros: Record<string, unknown>
): Promise<{
    messages: string[];
    rejectedCount: number;
    response: ExecuteGenerationResult | null;
    shortfall: number;
}> {
    const quantidadeEsperada =
        typeof filtros.quantidade === 'number' && Number.isFinite(filtros.quantidade)
            ? filtros.quantidade
            : 5;
    const expectedCategory = inferCategoriaParaGeracao(modoId, filtros);
    const approved: string[] = [];
    const seen = new Set<string>();
    let rejectedCount = 0;
    let lastResponse: ExecuteGenerationResult | null = null;

    for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS && approved.length < quantidadeEsperada; attempt++) {
        const response = await gerarConteudo(modoId, data, filtros);
        lastResponse = response;

        if (!response?.ok || !response.resultado) {
            console.warn(`[${modoId}] tentativa ${attempt} sem conteúdo válido.`, response?.error);
            continue;
        }

        const processed = processGeneratedContent(response.resultado, {
            modoId,
            filtros,
            expectedCategory,
            quantidadeEsperada,
        });

        rejectedCount += processed.rejected.length;
        console.log(
            `[${modoId}] tentativa ${attempt}: ${processed.messages.length} aprovadas, ${processed.rejected.length} rejeitadas`
        );

        processed.rejected.forEach((rejected, index) => {
            console.warn(`[${modoId}] rejeitada (${attempt}.${index + 1}): ${rejected.reasons.join(', ')}`);
        });

        for (const message of processed.messages) {
            const key = getMessageDedupKey(message);
            if (!key || seen.has(key)) continue;
            seen.add(key);
            approved.push(message);
            if (approved.length >= quantidadeEsperada) {
                break;
            }
        }
    }

    const shortfall = Math.max(0, quantidadeEsperada - approved.length);
    if (shortfall > 0) {
        console.warn(`[${modoId}] lote incompleto: faltaram ${shortfall} mensagem(ns) após ${MAX_GENERATION_ATTEMPTS} tentativa(s).`);
    }

    return {
        messages: approved,
        rejectedCount,
        response: lastResponse,
        shortfall,
    };
}

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        ensureEnv();
        const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
        const dataHoje = getDataHoje();
        const mensagensEnviadas: string[] = [];

        const filtrosFavoritas = getFiltrosDoDia(dataHoje, 'favoritas');
        console.log('Filtros Favoritas:', JSON.stringify(filtrosFavoritas));
        const favoritas = await gerarMensagensValidadas('modo_favoritas', dataHoje, filtrosFavoritas);

        const filtrosEstilo = getFiltrosDoDia(dataHoje, 'estilo');
        console.log('Filtros Estilo:', JSON.stringify(filtrosEstilo));
        const estilo = await gerarMensagensValidadas('modo_estilo', dataHoje, filtrosEstilo);

        if (favoritas.messages.length > 0) {
            const { batchId, records } = buildDnaGeracaoRecords(favoritas.messages, {
                categoria: inferCategoriaParaGeracao('modo_favoritas', filtrosFavoritas),
                filtros: filtrosFavoritas,
                temaPrincipal: favoritas.response?.tema_usado,
                buildStyle: 'favoritas',
            });

            const { error } = await supabase.from('dna_geracoes').insert(records);
            if (error) {
                throw new Error(`Erro ao salvar favoritas (${batchId}): ${error.message}`);
            }

            console.log(`Favoritas: ${records.length} msgs salvas (batch: ${batchId})`);
        }

        if (estilo.messages.length > 0) {
            const { batchId, records } = buildDnaGeracaoRecords(estilo.messages, {
                categoria: inferCategoriaParaGeracao('modo_estilo', filtrosEstilo),
                filtros: filtrosEstilo,
                temaPrincipal: estilo.response?.tema_usado,
                buildStyle: 'estilo',
            });

            const { error } = await supabase.from('dna_geracoes').insert(records);
            if (error) {
                throw new Error(`Erro ao salvar estilo (${batchId}): ${error.message}`);
            }

            console.log(`Estilo: ${records.length} msgs salvas (batch: ${batchId})`);
        }

        const todasMsgs = [...favoritas.messages, ...estilo.messages];
        if (todasMsgs.length > 0) {
            const header = `DNA Gerado - ${new Date().toLocaleDateString('pt-BR', {
                timeZone: 'America/Sao_Paulo',
            })}\n\nDia: ${String(filtrosFavoritas.diasSemana)} | Fonte: Todas\nEstilo do dia: ${String(
                filtrosEstilo.estilo || '-'
            )}\n\nTotal: ${todasMsgs.length} mensagens`;

            await enviarTelegram(header);
            await delay(300);
        }

        let num = 1;
        for (const msg of todasMsgs) {
            const label = num <= favoritas.messages.length ? 'DNA' : 'Estilo';
            const msgFinal = `[${num}/${todasMsgs.length}] ${label}\n\n${msg}`;
            const enviou = await enviarTelegram(msgFinal);
            if (enviou) {
                mensagensEnviadas.push(`Msg ${num} (${label})`);
            }
            await delay(450);
            num++;
        }

        return NextResponse.json({
            ok: true,
            data: dataHoje,
            filtros_favoritas: filtrosFavoritas,
            filtros_estilo: filtrosEstilo,
            mensagens_enviadas: mensagensEnviadas,
            total: mensagensEnviadas.length,
            favoritas_validas: favoritas.messages.length,
            favoritas_rejeitadas: favoritas.rejectedCount,
            favoritas_faltantes: favoritas.shortfall,
            estilo_validas: estilo.messages.length,
            estilo_rejeitadas: estilo.rejectedCount,
            estilo_faltantes: estilo.shortfall,
        });
    } catch (error: any) {
        console.error('Erro no cron daily-dna:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
