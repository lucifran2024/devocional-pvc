// =====================================================
// APIFY TOOLS - Ferramentas para Scraping via Apify
// =====================================================

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

// Função auxiliar para OCR com Gemini Vision
async function extractTextFromImage(imageUrl: string): Promise<string> {
    const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GEMINI_KEY");
    if (!GEMINI_KEY || !imageUrl) return "";

    try {
        // Baixar a imagem e converter para base64
        const imgResp = await fetch(imageUrl);
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

        // Primeira tentativa com prompt contextualizado
        let text = await callGeminiVision(GEMINI_KEY, base64Image, mimeType, OCR_PROMPT_PRIMARY);

        // Retry se texto muito curto (provavelmente OCR falhou)
        if (text.length < 30) {
            console.log(`🔄 [OCR] Texto curto (${text.length} chars), tentando retry...`);
            await new Promise(r => setTimeout(r, 300));
            const retryText = await callGeminiVision(GEMINI_KEY, base64Image, mimeType, OCR_PROMPT_RETRY);
            if (retryText.length > text.length) {
                text = retryText;
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
const MAX_VIDEO_BYTES = 19 * 1024 * 1024;

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
 * Usa o Gemini com o vídeo inline (suportado até ~20MB). Se o vídeo for
 * grande demais ou falhar, retorna "" e o chamador cai no OCR da thumbnail.
 */
async function extractTextFromVideo(videoUrl: string): Promise<string> {
    const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GEMINI_KEY");
    if (!GEMINI_KEY || !videoUrl) return "";

    try {
        const vidResp = await fetch(videoUrl);
        if (!vidResp.ok) return "";

        const buffer = await vidResp.arrayBuffer();
        if (buffer.byteLength > MAX_VIDEO_BYTES) {
            console.log(`⚠️ [VIDEO] Reel muito grande (${(buffer.byteLength / 1048576).toFixed(1)}MB), usando thumbnail`);
            return "";
        }

        const base64Video = bytesToBase64(new Uint8Array(buffer));
        const mimeType = vidResp.headers.get("content-type") || "video/mp4";

        console.log(`🎬 [VIDEO] Extraindo reel (${(buffer.byteLength / 1048576).toFixed(1)}MB)...`);
        const text = await callGeminiVision(GEMINI_KEY, base64Video, mimeType, VIDEO_PROMPT);
        return text;
    } catch (e) {
        console.error("❌ [VIDEO] Exception:", e);
        return "";
    }
}

// Chamada individual ao Gemini Vision
async function callGeminiVision(apiKey: string, base64Image: string, mimeType: string, prompt: string): Promise<string> {
    const MODEL_NAME = "gemini-2.0-flash";
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

export async function consultarInstagram(username: string): Promise<any[]> {
    console.log(`📸 [APIFY] Consultando Instagram: @${username}`);

    const APIFY_TOKEN = Deno.env.get("APIFY_API_TOKEN");
    if (!APIFY_TOKEN) {
        console.error("❌ [APIFY] Token não configurado (APIFY_API_TOKEN).");
        return [];
    }

    // Actor: apify/instagram-scraper
    const ACTOR_ID = "apify~instagram-scraper";
    const url = `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;

    const input = {
        "directUrls": [`https://www.instagram.com/${username}/`],
        "resultsLimit": 6,
        "resultsType": "posts",
        "searchType": "hashtag",
        "search": username
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(input)
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`❌ [APIFY] Erro na API (${response.status}):`, errText);
            return [];
        }

        const data = await response.json();

        if (!data || data.length === 0) {
            console.warn(`[APIFY] Nenhum post encontrado para @${username}`);
            return [];
        }

        const postsPromises = data.map(async (post: any) => {
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
            if (isVideo && videoUrl) {
                await new Promise(r => setTimeout(r, Math.random() * 500));
                console.log(`🎬 [VIDEO] Processando reel de ${externalId}...`);
                ocrText = await extractTextFromVideo(videoUrl);
            }

            // Fallback (ou post de imagem): OCR da imagem/thumbnail
            if (!ocrText && imageUrl) {
                await new Promise(r => setTimeout(r, Math.random() * 500));
                console.log(`🔍 [OCR] Processando imagem de ${externalId}...`);
                ocrText = await extractTextFromImage(imageUrl);
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
