// =====================================================
// APIFY TOOLS - Ferramentas para Scraping via Apify
// =====================================================

import { extrairTextoDeImagem, extrairTextoDeVideo } from './openrouter-client.ts';

export const APIFY_TOOLS_DEFINITION = [{
    function_declarations: [{
        name: "consultar_instagram",
        description: "Consulta os últimos posts de um perfil do Instagram.",
        parameters: {
            type: "object",
            properties: {
                username: {
                    type: "string",
                    description: "Nome do usuário do Instagram (sem @)",
                }
            },
            required: ["username"]
        }
    }]
}];

// Prompts de OCR contextualizados
const OCR_PROMPT_PRIMARY = `Você é especialista em OCR de posts cristãos/devocionais do Instagram.
Esta imagem contém uma mensagem devocional com texto sobre fundo decorativo.

INSTRUÇÕES:
1. Extraia ABSOLUTAMENTE TODO o texto visível na imagem (topo, meio, rodapé, cantos)
2. Inclua títulos, corpo do texto, versículos bíblicos e referências (ex: João 3:16)
3. Se houver fontes artísticas, cursivas ou decorativas, leia completamente sem pular nada
4. NÃO omita palavras, frases ou linhas — extraia TUDO
5. Retorne APENAS o texto extraído, sem comentários seus
6. Mantenha parágrafos e quebras de linha do layout original`;

const OCR_PROMPT_RETRY = `ATENÇÃO: A extração anterior falhou ou ficou incompleta.
Olhe com MUITO CUIDADO para TODAS as áreas desta imagem.
O texto pode estar em fontes decorativas, cursivas, com sombra ou sobre fundo colorido.
Extraia CADA PALAVRA visível, mesmo que difícil de ler. Inclua TUDO.
Retorne APENAS o texto, mantendo a formatação de parágrafos.`;

// OCR de imagem: OpenRouter (modelos de visão free com fallback) primeiro;
// Gemini direto só como último recurso (se houver chave com créditos).
async function extractTextFromImage(imageUrl: string): Promise<string> {
    if (!imageUrl) return "";

    try {
        // Baixar a imagem e converter para base64
        const imgResp = await fetch(imageUrl, { signal: AbortSignal.timeout(DOWNLOAD_IMAGE_TIMEOUT_MS) });
        if (!imgResp.ok) return "";

        const imgBlob = await imgResp.blob();
        const arrayBuffer = await imgBlob.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const CHUNK_SIZE = 8192;
        let binaryString = '';
        for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
            const chunk = bytes.subarray(i, i + CHUNK_SIZE);
            binaryString += String.fromCharCode(...chunk);
        }
        const base64Image = btoa(binaryString);
        const mimeType = imgResp.headers.get("content-type") || "image/jpeg";

        // 1) OpenRouter: cadeia de modelos de visão free
        let text = await extrairTextoDeImagem(base64Image, mimeType, OCR_PROMPT_PRIMARY);

        // Retry com prompt mais agressivo se texto muito curto
        if (text.length < 30) {
            console.log(`🔄 [OCR] Texto curto (${text.length} chars), tentando retry...`);
            await new Promise(r => setTimeout(r, 300));
            const retryText = await extrairTextoDeImagem(base64Image, mimeType, OCR_PROMPT_RETRY);
            if (retryText.length > text.length) {
                text = retryText;
            }
        }

        // 2) Último recurso: Gemini direto (se configurado e com créditos)
        if (text.length < 30) {
            const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GEMINI_KEY");
            if (GEMINI_KEY) {
                console.log(`🔄 [OCR] Fallback final: Gemini direto...`);
                const geminiText = await callGeminiVision(GEMINI_KEY, base64Image, mimeType, OCR_PROMPT_PRIMARY);
                if (geminiText.length > text.length) text = geminiText;
            }
        }

        return text;

    } catch (e) {
        console.error("❌ [OCR] Exception:", e);
        return "";
    }
}

// Prompt para extração de reels (vídeo): texto na tela + narração
const VIDEO_PROMPT = `Você é especialista em extrair conteúdo de reels devocionais cristãos do Instagram.
Este vídeo contém uma mensagem devocional.

INSTRUÇÕES:
1. Extraia TODO o texto exibido na tela ao longo do vídeo (títulos, legendas embutidas, versículos, referências bíblicas)
2. Se houver narração/fala, transcreva a mensagem falada na íntegra
3. Combine texto da tela e fala em um texto único, coerente e na ordem do vídeo
4. NÃO descreva o vídeo, NÃO comente — retorne APENAS o conteúdo extraído
5. Mantenha parágrafos naturais`;

// Limite de tamanho para envio inline ao Gemini (base64 aumenta ~33%)
// 12MB: reels maiores estouram o orçamento de CPU/tempo da Edge Function —
// caem no OCR da thumbnail, que nesses posts costuma ter o texto completo.
const MAX_VIDEO_BYTES = 12 * 1024 * 1024;

// =====================================================
// ORÇAMENTOS DE TEMPO
// A Edge Function morre em ~150s (WORKER_RESOURCE_LIMIT). Cada etapa tem
// um teto para a invocação NUNCA passar de ~120s no pior caso.
// =====================================================
const APIFY_START_TIMEOUT_MS = 15_000;
const APIFY_POLL_BUDGET_MS = 65_000;
const APIFY_POLL_INTERVAL_MS = 5_000;
const DOWNLOAD_IMAGE_TIMEOUT_MS = 15_000;
const DOWNLOAD_VIDEO_TIMEOUT_MS = 30_000;
const OCR_IMAGE_BUDGET_MS = 35_000;
const OCR_VIDEO_BUDGET_MS = 40_000;

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T, label: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<T>((resolve) => {
        timer = setTimeout(() => {
            console.warn(`⏱️ [BUDGET] ${label} passou de ${Math.round(ms / 1000)}s — seguindo com fallback`);
            resolve(fallback);
        }, ms);
    });
    try {
        return await Promise.race([promise, timeout]);
    } finally {
        if (timer !== undefined) clearTimeout(timer);
    }
}

function bytesToBase64(bytes: Uint8Array): string {
    const CHUNK_SIZE = 8192;
    let binaryString = '';
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
        const chunk = bytes.subarray(i, i + CHUNK_SIZE);
        binaryString += String.fromCharCode(...chunk);
    }
    return btoa(binaryString);
}

/**
 * Extrai o conteúdo exato de um reel (vídeo): texto na tela + narração.
 * 1) OpenRouter: modelos free com suporte a vídeo (nemotron-omni aceita
 *    áudio+vídeo — extrai inclusive a narração; gemma-4 aceita vídeo)
 * 2) Fallback final: Gemini direto (se houver chave com créditos)
 * Se tudo falhar, retorna "" e o chamador cai no OCR da thumbnail.
 */
async function extractTextFromVideo(videoUrl: string): Promise<string> {
    if (!videoUrl) return "";

    try {
        const vidResp = await fetch(videoUrl, { signal: AbortSignal.timeout(DOWNLOAD_VIDEO_TIMEOUT_MS) });
        if (!vidResp.ok) return "";

        const buffer = await vidResp.arrayBuffer();
        if (buffer.byteLength > MAX_VIDEO_BYTES) {
            console.log(`⚠️ [VIDEO] Reel muito grande (${(buffer.byteLength / 1048576).toFixed(1)}MB), usando thumbnail`);
            return "";
        }

        const base64Video = bytesToBase64(new Uint8Array(buffer));
        const mimeType = vidResp.headers.get("content-type") || "video/mp4";

        console.log(`🎬 [VIDEO] Extraindo reel (${(buffer.byteLength / 1048576).toFixed(1)}MB) via OpenRouter...`);
        let text = await extrairTextoDeVideo(base64Video, mimeType, VIDEO_PROMPT);

        if (text.length < 30) {
            const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GEMINI_KEY");
            if (GEMINI_KEY) {
                console.log(`🔄 [VIDEO] Fallback final: Gemini direto...`);
                const geminiText = await callGeminiVision(GEMINI_KEY, base64Video, mimeType, VIDEO_PROMPT);
                if (geminiText.length > text.length) text = geminiText;
            }
        }

        return text;
    } catch (e) {
        console.error("❌ [VIDEO] Exception:", e);
        return "";
    }
}

// Chamada individual ao Gemini Vision
async function callGeminiVision(apiKey: string, base64Image: string, mimeType: string, prompt: string): Promise<string> {
    // gemini-2.0-flash foi descontinuado; 2.5-flash-lite é o atual barato/rápido.
    const MODEL_NAME = "gemini-2.5-flash-lite";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

    const body = {
        contents: [{
            parts: [
                { text: prompt },
                {
                    inline_data: {
                        mime_type: mimeType,
                        data: base64Image
                    }
                }
            ]
        }]
    };

    const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    if (!resp.ok) return "";

    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return text ? text.trim() : "";
}

// Actor: apify/instagram-scraper
const APIFY_ACTOR_ID = "apify~instagram-scraper";
const APIFY_BASE = "https://api.apify.com/v2";

/**
 * Busca os posts na Apify SEM segurar a conexão até o actor terminar.
 * O run-sync antigo esperava o actor inteiro (2-4 min em dias ruins) e a
 * Edge Function morria no limite de ~150s (erro 546) — dias sem Telegram.
 *
 * Fluxo:
 * 1. Dispara um run novo (assíncrono — roda nos servidores da Apify).
 * 2. Aguarda até APIFY_POLL_BUDGET_MS pelo término.
 * 3. Se não terminar a tempo, colhe o dataset do ÚLTIMO run bem-sucedido.
 *    O run disparado continua rodando lá — a próxima execução do cron
 *    (são 3 por dia) colhe o resultado dele por este mesmo fallback.
 */
async function buscarPostsApify(token: string, input: unknown, username: string): Promise<any[]> {
    // Filtra posts do perfil certo — o fallback "último run" é por actor e
    // pode conter posts do outro perfil consultado.
    const doPerfil = (items: any[]): any[] => {
        if (!Array.isArray(items)) return [];
        const filtrados = items.filter((it: any) =>
            !it?.ownerUsername || String(it.ownerUsername).toLowerCase() === username.toLowerCase()
        );
        return filtrados;
    };

    // 1. Disparar run novo
    let runId: string | null = null;
    try {
        const startResp = await fetch(`${APIFY_BASE}/acts/${APIFY_ACTOR_ID}/runs?token=${token}&timeout=240`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
            signal: AbortSignal.timeout(APIFY_START_TIMEOUT_MS),
        });
        if (startResp.ok) {
            const startData = await startResp.json();
            runId = startData?.data?.id || null;
            console.log(`🚀 [APIFY] Run iniciado para @${username}: ${runId}`);
        } else {
            console.error(`❌ [APIFY] Falha ao iniciar run (${startResp.status}):`, await startResp.text());
        }
    } catch (e) {
        console.error("❌ [APIFY] Erro ao iniciar run:", e);
    }

    // 2. Esperar o run terminar dentro do orçamento
    if (runId) {
        const deadline = Date.now() + APIFY_POLL_BUDGET_MS;
        while (Date.now() < deadline) {
            await new Promise((r) => setTimeout(r, APIFY_POLL_INTERVAL_MS));
            try {
                const st = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${token}`, {
                    signal: AbortSignal.timeout(10_000),
                });
                if (!st.ok) continue;
                const stData = await st.json();
                const status = stData?.data?.status;
                if (status === "SUCCEEDED") {
                    const dsId = stData?.data?.defaultDatasetId;
                    const itemsResp = await fetch(`${APIFY_BASE}/datasets/${dsId}/items?token=${token}`, {
                        signal: AbortSignal.timeout(20_000),
                    });
                    if (itemsResp.ok) {
                        const items = doPerfil(await itemsResp.json());
                        console.log(`✅ [APIFY] Run ${runId} concluído: ${items.length} posts de @${username}`);
                        return items;
                    }
                    break;
                }
                if (["FAILED", "ABORTED", "TIMED-OUT"].includes(status)) {
                    console.warn(`⚠️ [APIFY] Run ${runId} terminou como ${status}`);
                    break;
                }
            } catch { /* transitório — tenta de novo até o deadline */ }
        }
        console.warn(`⏱️ [APIFY] Run ${runId} não terminou no orçamento — colhendo último run bem-sucedido`);
    }

    // 3. Fallback: último run bem-sucedido do actor
    try {
        const lastResp = await fetch(
            `${APIFY_BASE}/acts/${APIFY_ACTOR_ID}/runs/last/dataset/items?token=${token}&status=SUCCEEDED`,
            { signal: AbortSignal.timeout(20_000) }
        );
        if (lastResp.ok) {
            const items = doPerfil(await lastResp.json());
            console.log(`♻️ [APIFY] Último run bem-sucedido: ${items.length} posts de @${username}`);
            return items;
        }
        console.error(`❌ [APIFY] Falha ao buscar último run (${lastResp.status})`);
    } catch (e) {
        console.error("❌ [APIFY] Erro no fallback do último run:", e);
    }
    return [];
}

export async function consultarInstagram(username: string): Promise<any[]> {
    console.log(`📸 [APIFY] Consultando Instagram: @${username}`);

    const APIFY_TOKEN = Deno.env.get("APIFY_API_TOKEN");
    if (!APIFY_TOKEN) {
        console.error("❌ [APIFY] Token não configurado (APIFY_API_TOKEN).");
        return [];
    }

    const input = {
        "directUrls": [`https://www.instagram.com/${username}/`],
        "resultsLimit": 4,
        "resultsType": "posts",
        "searchType": "hashtag",
        "search": username
    };

    try {
        const data = await buscarPostsApify(APIFY_TOKEN, input, username);

        if (!data || data.length === 0) {
            console.warn(`[APIFY] Nenhum post encontrado para @${username}`);
            return [];
        }

        const postsPromises = data.slice(0, 4).map(async (post: any) => {
            const caption = post.caption || post.description || "";
            const imageUrl = post.displayUrl || post.url || "";
            const videoUrl = post.videoUrl || "";
            const isVideo = Boolean(videoUrl) || post.type === 'Video' || post.productType === 'clips';
            const postUrl = post.url || `https://instagram.com/${username}`;
            const publishedAt = post.timestamp || new Date().toISOString();
            const externalId = post.id || post.shortCode || `inst_${Date.now()}_${Math.random()}`;

            let ocrText = "";

            // Reels: extrai o conteúdo exato do vídeo (texto na tela + narração).
            // A legenda NÃO substitui a extração — é só metadado.
            // Cada etapa tem orçamento de tempo: um reel lento não pode matar
            // a invocação inteira (era uma das causas do erro 546).
            if (isVideo && videoUrl) {
                await new Promise(r => setTimeout(r, Math.random() * 500));
                console.log(`🎬 [VIDEO] Processando reel de ${externalId}...`);
                ocrText = await withTimeout(extractTextFromVideo(videoUrl), OCR_VIDEO_BUDGET_MS, "", `vídeo ${externalId}`);
            }

            // Fallback (ou post de imagem): OCR da imagem/thumbnail
            if (!ocrText && imageUrl) {
                await new Promise(r => setTimeout(r, Math.random() * 500));
                console.log(`🔍 [OCR] Processando imagem de ${externalId}...`);
                ocrText = await withTimeout(extractTextFromImage(imageUrl), OCR_IMAGE_BUDGET_MS, "", `imagem ${externalId}`);
            }

            let fullContent = "";
            if (ocrText) {
                fullContent += `[OCR]:\n${ocrText}\n\n`;
                if (caption) fullContent += `[LEGENDA]:\n${caption}`;
            } else {
                if (caption) fullContent += `${caption}`;
            }

            if (!fullContent) fullContent = "Conteúdo não disponível em texto.";

            return {
                external_id: externalId,
                source: 'instagram',
                content: fullContent,
                image_url: imageUrl,
                post_url: postUrl,
                author_name: username,
                published_at: publishedAt
            };
        });

        return await Promise.all(postsPromises);

    } catch (e: any) {
        console.error("❌ [APIFY] Exception:", e);
        return [];
    }
}
