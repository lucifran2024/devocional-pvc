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

        // Usando modelo gemini-2.0-flash (confirmado funcionamento)
        const MODEL_NAME = "gemini-2.0-flash";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_KEY}`;

        const body = {
            contents: [{
                parts: [
                    { text: "Extraia TODO o texto desta imagem. Retorne APENAS o texto extraído. Mantenha a formatação original de quebras de linha." },
                    {
                        inline_data: {
                            mime_type: imgResp.headers.get("content-type") || "image/jpeg",
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

    } catch (e) {
        return "";
    }
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
            const postUrl = post.url || `https://instagram.com/${username}`;
            const publishedAt = post.timestamp || new Date().toISOString();
            const externalId = post.id || post.shortCode || `inst_${Date.now()}_${Math.random()}`;

            let ocrText = "";
            if (imageUrl) {
                // Delay aleatório pequeno
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
