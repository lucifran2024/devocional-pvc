import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import {
    blocosDaExplicacao, paragrafosFaladosDaExplicacao, ssmlDoBlocoDaExplicacao, type TrechoDaExplicacao,
} from '@/lib/explicacao-audio';
import { assinaturaDePronuncia } from '@/lib/pronuncia';
import { escolherVozNarracao, estiloDaVoz, nomeDaVoz, vozAzureDeReserva } from '@/lib/vozes-narracao';

export const maxDuration = 120;

// A mesma conta, as vozes e o cache Azure da Bíblia, mas sob outra pasta:
// explicação da IA não é um capítulo nem pode contaminar o áudio bíblico.
const BUCKET = 'bible-audio';
// v2 = blocos que não cortam frase + pausa na troca de parágrafo (v1 cortava a cada 1.200 letras)
const VERSAO = 'v2';
const MAX_TEXTO = 14_000;
const TAMANHO_BLOCO = 1200;
const LOTE = 5;

const aguardar = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function sintetizar(ssml: string, chave: string, regiao: string): Promise<ArrayBuffer | null> {
    for (let tentativa = 0; tentativa < 3; tentativa++) {
        try {
            const resposta = await fetch(`https://${regiao}.tts.speech.microsoft.com/cognitiveservices/v1`, {
                method: 'POST',
                headers: {
                    'Ocp-Apim-Subscription-Key': chave,
                    'Content-Type': 'application/ssml+xml',
                    'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
                    'User-Agent': 'devocional-pvc',
                },
                body: ssml,
                signal: AbortSignal.timeout(35_000),
            });
            if (resposta.ok) {
                const audio = await resposta.arrayBuffer();
                if (audio.byteLength > 0) return audio;
            }
            if (resposta.status < 500 && resposta.status !== 429) return null;
        } catch (erro) {
            console.error('[EXPLICACAO-AUDIO] Falha na síntese Azure:', erro instanceof Error ? erro.message : String(erro));
        }
        if (tentativa < 2) await aguardar(600 * (tentativa + 1));
    }
    return null;
}

export async function POST(request: Request) {
    let entrada: { texto?: unknown; voz?: unknown };
    try {
        entrada = await request.json();
    } catch {
        return NextResponse.json({ ok: false, error: 'json_invalido' }, { status: 400 });
    }
    if (typeof entrada.texto !== 'string' || !entrada.texto.trim()) {
        return NextResponse.json({ ok: false, error: 'texto_vazio' }, { status: 400 });
    }
    if (entrada.texto.length > MAX_TEXTO) {
        return NextResponse.json({ ok: false, error: 'texto_longo' }, { status: 413 });
    }
    const paragrafos = paragrafosFaladosDaExplicacao(entrada.texto);
    if (paragrafos.length === 0) return NextResponse.json({ ok: false, error: 'texto_vazio' }, { status: 400 });
    const vozEscolhida = escolherVozNarracao(typeof entrada.voz === 'string' ? entrada.voz : undefined);
    // O VoiceStudio só tem gravações exatas de capítulos selecionados (como Salmo 23).
    // Para explicação inédita, vale a MESMA reserva masculina do player bíblico.
    const voz = vozAzureDeReserva(vozEscolhida);
    const chave = process.env.AZURE_SPEECH_KEY;
    const regiao = process.env.AZURE_SPEECH_REGION;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!chave || !regiao || !supabaseUrl || !serviceKey) {
        return NextResponse.json({ ok: false, error: 'audio_indisponivel' }, { status: 503 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    // O áudio depende do texto, da divisão em parágrafos e das correções de pronúncia que o tocam.
    const hash = createHash('sha256')
        .update(paragrafos.join('\n\n'))
        .update(assinaturaDePronuncia(paragrafos))
        .digest('hex');
    const pasta = `explicacoes/${VERSAO}/${voz}/${hash}`;
    const caminho = `${pasta}/full.mp3`;
    const bucket = supabase.storage.from(BUCKET);
    const { data: arquivos } = await bucket.list(pasta, { limit: 5 });
    const url = () => bucket.getPublicUrl(caminho).data.publicUrl;
    const fonte = `Narração · ${nomeDaVoz(voz)}${vozEscolhida !== voz ? ' (reserva)' : ''}`;
    if (arquivos?.some(arquivo => arquivo.name === 'full.mp3')) {
        return NextResponse.json({ ok: true, fullUrl: url(), voz, fonte, cached: true });
    }

    const estilo = estiloDaVoz(voz);
    const blocos = blocosDaExplicacao(paragrafos, TAMANHO_BLOCO);
    const ssmlDe = (bloco: TrechoDaExplicacao[], indice: number) =>
        ssmlDoBlocoDaExplicacao(bloco, { voz, estilo, ultimo: indice === blocos.length - 1 });
    const audios: (ArrayBuffer | null)[] = [];
    for (let inicio = 0; inicio < blocos.length; inicio += LOTE) {
        const resultados = await Promise.all(blocos.slice(inicio, inicio + LOTE)
            .map((bloco, i) => sintetizar(ssmlDe(bloco, inicio + i), chave, regiao)));
        audios.push(...resultados);
        if (resultados.some(audio => !audio)) {
            return NextResponse.json({ ok: false, error: 'sem_audio' }, { status: 502 });
        }
    }

    const tamanho = audios.reduce((acumulado, audio) => acumulado + audio!.byteLength, 0);
    const completo = new Uint8Array(tamanho);
    let posicao = 0;
    for (const audio of audios) {
        completo.set(new Uint8Array(audio!), posicao);
        posicao += audio!.byteLength;
    }
    const { error: erroUpload } = await bucket.upload(caminho, completo.buffer, {
        contentType: 'audio/mpeg', upsert: true,
    });
    if (erroUpload) {
        console.error('[EXPLICACAO-AUDIO] Falha ao guardar áudio:', erroUpload.message);
        return NextResponse.json({ ok: false, error: 'audio_nao_salvo' }, { status: 502 });
    }
    return NextResponse.json({ ok: true, fullUrl: url(), voz, fonte, cached: false });
}
