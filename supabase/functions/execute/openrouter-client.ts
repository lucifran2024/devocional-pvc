/**
 * OpenRouter Client — modelos FREE com cadeia de fallbacks
 *
 * Substitui as chamadas diretas ao Gemini. Cada chamada tenta os modelos
 * da cadeia em ordem; se um estiver em rate-limit/indisponível (comum em
 * modelos :free), passa para o próximo — nada falha por causa de um modelo.
 *
 * Compatibilidade: expõe adaptadores que convertem requisição/resposta
 * de/para o formato Gemini (contents/parts/functionCall), para que o
 * código existente do index.ts continue funcionando sem reescrita.
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// ============================================================
// CADEIAS DE FALLBACK (modelos free verificados em 10/06/2026)
// ============================================================

// Texto/geração: ordem por qualidade em PT-BR + disponibilidade.
// deepseek-v4-flash fecha a cadeia: ultra-barato (não :free), contexto 1M —
// só é acionado se TODOS os modelos free estiverem indisponíveis.
export const FREE_TEXT_MODELS = [
    'openai/gpt-oss-120b:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'nvidia/nemotron-3-super-120b-a12b:free',
    'qwen/qwen3-next-80b-a3b-instruct:free',
    'google/gemma-4-31b-it:free',
    'nvidia/nemotron-3-nano-30b-a3b:free',
    'deepseek/deepseek-v4-flash',
];

// Function calling (todos suportam tools)
export const FREE_TOOL_MODELS = [
    'openai/gpt-oss-120b:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'nvidia/nemotron-3-super-120b-a12b:free',
    'qwen/qwen3-next-80b-a3b-instruct:free',
    'google/gemma-4-31b-it:free',
    'deepseek/deepseek-v4-flash',
];

// ===== OCR / VISÃO =====
// PRINCIPAL: 9Router (túnel do usuário) com modelo de visão FIXO. NÃO usamos o
// combo "openclaw": combo sorteia um modelo diferente a cada chamada e pode cair
// num sem visão -> OCR intermitente. Para o OCR que precisa funcionar TODO dia,
// um modelo de visão FIXO é o certo (testado: lê PT-BR de imagem perfeitamente).
// Ativado pelos secrets LLM_VISION_BASE_URL / LLM_VISION_API_KEY (getVisionEndpoint).
export const VISION_MODELS_9ROUTER = [
    'gemini/gemini-3.1-flash-lite-preview',
    'gemini/gemini-3-flash-preview',
];
export const VIDEO_MODELS_9ROUTER = [
    'gemini/gemini-3-flash-preview',
    'gemini/gemini-3.1-flash-lite-preview',
];

// Reserva: usado SÓ se os secrets do 9Router não estiverem setados (modelos
// :free do OpenRouter — grátis, porém instáveis; é só a rede de segurança).
export const FREE_VISION_MODELS = [
    'google/gemma-4-31b-it:free',
    'nvidia/nemotron-nano-12b-v2-vl:free',
    'google/gemma-4-26b-a4b-it:free',
];
export const FREE_VIDEO_MODELS = [
    'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
    'google/gemma-4-31b-it:free',
];

function getApiKey(): string {
    return Deno.env.get('OPENROUTER_API_KEY') || Deno.env.get('OPENROUTER_KEY') || '';
}

/**
 * Endpoint para OCR/visão. Se os secrets do 9Router estiverem setados, o OCR vai
 * pelo túnel do usuário (grátis e confiável enquanto o PC/túnel estiver no ar).
 * Senão, cai no OpenRouter padrão (modelos :free) como rede de segurança.
 *   LLM_VISION_BASE_URL = https://<seu-tunel>/v1/chat/completions
 *   LLM_VISION_API_KEY  = chave do 9Router
 */
function getVisionEndpoint(): { url: string; apiKey: string; useTunnel: boolean } {
    const url = Deno.env.get('LLM_VISION_BASE_URL');
    const key = Deno.env.get('LLM_VISION_API_KEY');
    if (url && key) return { url, apiKey: key, useTunnel: true };
    return { url: OPENROUTER_URL, apiKey: getApiKey(), useTunnel: false };
}

// Remove blocos de raciocínio que alguns modelos free vazam no texto
function limparRaciocinio(texto: string): string {
    return texto
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
        .trim();
}

interface ChamadaOpts {
    models?: string[];
    temperature?: number;
    maxTokens?: number;
    tools?: unknown[];          // formato OpenAI
    timeoutMs?: number;
    baseUrl?: string;           // endpoint alternativo (ex.: 9Router) — default OpenRouter
    apiKey?: string;            // chave do endpoint alternativo
}

interface RespostaLLM {
    ok: boolean;
    text?: string;
    message?: Record<string, unknown>;  // mensagem OpenAI completa (p/ tool_calls)
    error?: string;
    modelUsed?: string;
}

/**
 * Núcleo: chama o OpenRouter tentando cada modelo da cadeia.
 * Erros recuperáveis (429, 5xx, timeout, resposta vazia) passam ao próximo.
 */
export async function chamarOpenRouter(
    messages: unknown[],
    opts: ChamadaOpts = {}
): Promise<RespostaLLM> {
    const apiKey = opts.apiKey || getApiKey();
    if (!apiKey) {
        return { ok: false, error: 'API key (OpenRouter/9Router) não configurada' };
    }
    const endpointUrl = opts.baseUrl || OPENROUTER_URL;

    const cadeia = opts.models && opts.models.length > 0 ? opts.models : FREE_TEXT_MODELS;
    let ultimoErro = 'sem modelos na cadeia';

    for (const model of cadeia) {
        try {
            const controller = new AbortController();
            // 40s por modelo: se travar, o fallback assume rápido em vez de
            // deixar o usuário esperando um modelo pendurado.
            const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 40_000);

            const body: Record<string, unknown> = {
                model,
                messages,
                // 9Router (e outros gateways) streamam por padrão; sem isto a
                // resposta vem em pedaços SSE e o resp.json() quebra. OpenRouter
                // já é não-stream por padrão, então é inofensivo lá.
                stream: false,
            };
            if (opts.temperature !== undefined) body.temperature = opts.temperature;
            if (opts.maxTokens !== undefined) body.max_tokens = opts.maxTokens;
            if (opts.tools && opts.tools.length > 0) body.tools = opts.tools;

            const resp = await fetch(endpointUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://devocional-pvc.vercel.app',
                    'X-Title': 'Devocional PVC',
                },
                body: JSON.stringify(body),
                signal: controller.signal,
            });
            clearTimeout(timer);

            if (!resp.ok) {
                const errText = (await resp.text()).slice(0, 300);
                ultimoErro = `${model}: HTTP ${resp.status} ${errText}`;
                console.warn(`⚠️ [OPENROUTER] ${ultimoErro} — tentando próximo modelo...`);
                continue;
            }

            const data = await resp.json();

            // OpenRouter pode devolver 200 com erro embutido (provider error)
            if (data.error) {
                ultimoErro = `${model}: ${JSON.stringify(data.error).slice(0, 200)}`;
                console.warn(`⚠️ [OPENROUTER] ${ultimoErro} — tentando próximo modelo...`);
                continue;
            }

            const message = data.choices?.[0]?.message;
            const temToolCall = Array.isArray(message?.tool_calls) && message.tool_calls.length > 0;
            const texto = typeof message?.content === 'string' ? limparRaciocinio(message.content) : '';

            if (!temToolCall && !texto) {
                ultimoErro = `${model}: resposta vazia`;
                console.warn(`⚠️ [OPENROUTER] ${ultimoErro} — tentando próximo modelo...`);
                continue;
            }

            console.log(`✅ [OPENROUTER] Resposta via ${model}`);
            return { ok: true, text: texto, message, modelUsed: model };

        } catch (err) {
            ultimoErro = `${model}: ${err instanceof Error ? err.message : String(err)}`;
            console.warn(`⚠️ [OPENROUTER] ${ultimoErro} — tentando próximo modelo...`);
        }
    }

    console.error(`❌ [OPENROUTER] Todos os modelos da cadeia falharam. Último erro: ${ultimoErro}`);
    return { ok: false, error: `Todos os modelos falharam. Último: ${ultimoErro}` };
}

/**
 * Geração simples de texto a partir de um prompt (uso mais comum).
 */
export async function gerarTexto(
    prompt: string,
    opts: { temperature?: number; maxTokens?: number; models?: string[] } = {}
): Promise<RespostaLLM> {
    return chamarOpenRouter(
        [{ role: 'user', content: prompt }],
        { ...opts, models: opts.models || FREE_TEXT_MODELS }
    );
}

// ============================================================
// ADAPTADORES DE COMPATIBILIDADE COM O FORMATO GEMINI
// O index.ts conversa em formato Gemini (contents/parts) — estes
// adaptadores traduzem nas duas direções para não reescrever o fluxo.
// ============================================================

interface GeminiPart {
    text?: string;
    functionCall?: { name: string; args: Record<string, unknown> };
    functionResponse?: { name: string; response: { content: string } };
}
interface GeminiMessage {
    role: string;
    parts: GeminiPart[];
}

/** Converte declarações de função do formato Gemini para o formato OpenAI */
export function converterToolsGeminiParaOpenAI(declaracoes: Array<Record<string, unknown>>): unknown[] {
    return declaracoes.map(d => ({
        type: 'function',
        function: {
            name: d.name,
            description: d.description,
            parameters: d.parameters || { type: 'object', properties: {} },
        },
    }));
}

/** Converte histórico Gemini (contents) para mensagens OpenAI */
function converterMensagensGeminiParaOpenAI(msgs: GeminiMessage[]): unknown[] {
    const saida: Array<Record<string, unknown>> = [];
    let contadorCall = 0;
    let ultimoCallId = '';

    for (const m of msgs) {
        const part = m.parts?.[0];
        if (!part) continue;

        if (m.role === 'user' && part.text !== undefined) {
            saida.push({ role: 'user', content: part.text });
        } else if (m.role === 'model' && part.functionCall) {
            contadorCall++;
            ultimoCallId = `call_${contadorCall}`;
            saida.push({
                role: 'assistant',
                content: null,
                tool_calls: [{
                    id: ultimoCallId,
                    type: 'function',
                    function: {
                        name: part.functionCall.name,
                        arguments: JSON.stringify(part.functionCall.args || {}),
                    },
                }],
            });
        } else if (m.role === 'model' && part.text !== undefined) {
            saida.push({ role: 'assistant', content: part.text });
        } else if (m.role === 'function' && part.functionResponse) {
            saida.push({
                role: 'tool',
                tool_call_id: ultimoCallId,
                content: part.functionResponse.response?.content ?? '',
            });
        }
    }
    return saida;
}

/**
 * Substituto direto do callGeminiAPI do index.ts: recebe mensagens em
 * formato Gemini e devolve resposta em formato Gemini (candidates/parts),
 * mas por baixo chama o OpenRouter com fallbacks.
 */
export async function chamarCompatGemini(
    msgs: GeminiMessage[],
    toolsGemini?: Array<Record<string, unknown>>,
    opts: { temperature?: number; maxTokens?: number; models?: string[] } = {}
): Promise<Record<string, unknown>> {
    const messages = converterMensagensGeminiParaOpenAI(msgs);
    const tools = toolsGemini && toolsGemini.length > 0
        ? converterToolsGeminiParaOpenAI(toolsGemini)
        : undefined;

    const resp = await chamarOpenRouter(messages, {
        models: opts.models || (tools ? FREE_TOOL_MODELS : FREE_TEXT_MODELS),
        temperature: opts.temperature,
        maxTokens: opts.maxTokens,
        tools,
    });

    if (!resp.ok) {
        return { error: { message: resp.error || 'Erro desconhecido no OpenRouter' } };
    }

    // Adaptar resposta OpenAI → shape Gemini que o index.ts espera
    const message = resp.message as { content?: string; tool_calls?: Array<{ function: { name: string; arguments: string } }> } | undefined;
    const toolCall = message?.tool_calls?.[0];

    let part: GeminiPart;
    if (toolCall) {
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(toolCall.function.arguments || '{}'); } catch { /* args vazios */ }
        part = { functionCall: { name: toolCall.function.name, args } };
    } else {
        part = { text: resp.text || '' };
    }

    return {
        candidates: [{ content: { parts: [part] } }],
        _modelUsed: resp.modelUsed,
    };
}

// ============================================================
// VISÃO E VÍDEO (extração de posts/reels)
// ============================================================

/**
 * OCR de imagem via modelos de visão free (cadeia com fallback).
 */
export async function extrairTextoDeImagem(
    base64Image: string,
    mimeType: string,
    prompt: string
): Promise<string> {
    const ep = getVisionEndpoint();
    const models = ep.useTunnel ? VISION_MODELS_9ROUTER : FREE_VISION_MODELS;
    console.log(`🔍 [OCR] Endpoint: ${ep.useTunnel ? '9Router (túnel)' : 'OpenRouter :free (reserva)'} | modelo: ${models[0]}`);
    const resp = await chamarOpenRouter(
        [{
            role: 'user',
            content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } },
            ],
        }],
        // 20s por modelo: o primário (gemini) responde em ~3-8s; se algum
        // modelo travar, falha rápido em vez de comer o limite de ~150s da
        // Edge Function (causa dos 504).
        { models, maxTokens: 2048, timeoutMs: 20_000, baseUrl: ep.url, apiKey: ep.apiKey }
    );
    return resp.ok ? (resp.text || '') : '';
}

/**
 * Extração de vídeo (reels): tenta os formatos de conteúdo de vídeo
 * aceitos pelo OpenRouter em cada modelo com suporte a vídeo.
 */
export async function extrairTextoDeVideo(
    base64Video: string,
    mimeType: string,
    prompt: string
): Promise<string> {
    const dataUrl = `data:${mimeType};base64,${base64Video}`;
    const ep = getVisionEndpoint();
    const models = ep.useTunnel ? VIDEO_MODELS_9ROUTER : FREE_VIDEO_MODELS;

    // Formatos de content-part a tentar (a API unificada varia por provider)
    const formatosConteudo = [
        [{ type: 'text', text: prompt }, { type: 'video_url', video_url: { url: dataUrl } }],
        [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: dataUrl } }],
    ];

    for (const content of formatosConteudo) {
        const resp = await chamarOpenRouter(
            [{ role: 'user', content }],
            // 45s por modelo (era 120s): 2 formatos x N modelos x 120s podia
            // passar de 900s e estourar o limite da Edge Function, matando o
            // lote inteiro de posts. 45s mantém a soma sob controle.
            { models, maxTokens: 2048, timeoutMs: 45_000, baseUrl: ep.url, apiKey: ep.apiKey }
        );
        if (resp.ok && resp.text && resp.text.length > 20) {
            return resp.text;
        }
    }
    return '';
}

/**
 * Streaming: gera texto em chunks via OpenRouter SSE, com fallback de
 * modelo se o stream falhar antes de produzir conteúdo.
 */
export async function gerarTextoStreaming(
    prompt: string,
    onChunk: (text: string) => void,
    onComplete: (fullText: string) => void,
    onError: (error: Error) => void,
    models: string[] = FREE_TEXT_MODELS
): Promise<void> {
    const apiKey = getApiKey();
    if (!apiKey) {
        onError(new Error('OPENROUTER_API_KEY não configurada'));
        return;
    }

    let ultimoErro: Error = new Error('sem modelos');

    for (const model of models) {
        let produziuAlgo = false;
        let fullText = '';
        try {
            const resp = await fetch(OPENROUTER_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model,
                    messages: [{ role: 'user', content: prompt }],
                    stream: true,
                }),
            });

            if (!resp.ok) {
                ultimoErro = new Error(`${model}: HTTP ${resp.status}`);
                console.warn(`⚠️ [OPENROUTER STREAM] ${ultimoErro.message} — próximo modelo...`);
                continue;
            }

            const reader = resp.body?.getReader();
            if (!reader) {
                ultimoErro = new Error(`${model}: sem corpo de resposta`);
                continue;
            }

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });

                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;
                    try {
                        const parsed = JSON.parse(data);
                        const delta = parsed.choices?.[0]?.delta?.content;
                        if (delta) {
                            produziuAlgo = true;
                            fullText += delta;
                            onChunk(delta);
                        }
                    } catch { /* chunk incompleto */ }
                }
            }

            if (produziuAlgo) {
                console.log(`✅ [OPENROUTER STREAM] Concluído via ${model}`);
                onComplete(limparRaciocinio(fullText));
                return;
            }
            ultimoErro = new Error(`${model}: stream vazio`);
        } catch (err) {
            ultimoErro = err instanceof Error ? err : new Error(String(err));
            // Se já entregou chunks ao cliente, não dá para trocar de modelo no meio
            if (produziuAlgo) {
                onComplete(limparRaciocinio(fullText));
                return;
            }
            console.warn(`⚠️ [OPENROUTER STREAM] ${model}: ${ultimoErro.message} — próximo modelo...`);
        }
    }

    onError(ultimoErro);
}
