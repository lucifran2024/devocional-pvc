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

export async function consultarInstagram(username: string): Promise<any[]> {
    console.log(`📸 [APIFY] Consultando Instagram: @${username}`);

    const APIFY_TOKEN = Deno.env.get("APIFY_API_TOKEN");
    if (!APIFY_TOKEN) {
        console.error("❌ [APIFY] Token não configurado (APIFY_API_TOKEN).");
        return [];
    }

    // Actor: apify/instagram-scraper (tenta ser leve e rápido)
    // Se falhar ou for muito caro, podemos tentar apify/instagram-profile-scraper
    const ACTOR_ID = "apify/instagram-scraper";

    // URL para rodar o actor e esperar o resultado (síncrono para simplicidade, mas com timeout)
    const url = `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;

    const input = {
        "usernames": [username],
        "resultsLimit": 6, // Aumentei para 6 para ter mais opções
        "resultsType": "posts"
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

        // Mapear para o formato esperado pelo frontend/banco
        return data.map((post: any) => {
            const caption = post.caption || post.description || "Sem legenda.";
            const imageUrl = post.displayUrl || post.url || "";
            const postUrl = post.url || `https://instagram.com/${username}`;
            // Apify retorna timestamp em ISO ou time unix? O scraper costuma retornar ISO string ou timestamp
            // Vamos garantir que seja string ISO ou algo parsável
            const publishedAt = post.timestamp || new Date().toISOString();
            const externalId = post.id || post.shortCode || `inst_${Date.now()}_${Math.random()}`;

            return {
                external_id: externalId,
                source: 'instagram',
                content: caption,
                image_url: imageUrl,
                post_url: postUrl,
                author_name: username,
                published_at: publishedAt
            };
        });

    } catch (e: any) {
        console.error("❌ [APIFY] Exception:", e);
        return [];
    }
}
