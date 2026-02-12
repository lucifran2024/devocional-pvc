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

export async function consultarInstagram(username: string): Promise<string> {
    console.log(`📸 [APIFY] Consultando Instagram: @${username}`);

    const APIFY_TOKEN = Deno.env.get("APIFY_API_TOKEN");
    if (!APIFY_TOKEN) {
        console.error("❌ [APIFY] Token não configurado (APIFY_API_TOKEN).");
        return "Erro: Token do Apify não configurado no backend.";
    }

    // Actor: apify/instagram-scraper (tenta ser leve e rápido)
    // Se falhar ou for muito caro, podemos tentar apify/instagram-profile-scraper
    const ACTOR_ID = "apify/instagram-scraper";

    // URL para rodar o actor e esperar o resultado (síncrono para simplicidade, mas com timeout)
    const url = `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;

    const input = {
        "usernames": [username],
        "resultsLimit": 3,
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
            return `Erro ao consultar Instagram: ${response.status}`;
        }

        const data = await response.json();

        if (!data || data.length === 0) {
            return `Nenhum post encontrado para o usuário @${username}.`;
        }

        // Processar o primeiro post (o mais recente)
        const post = data[0];

        // Formatar para o padrão do Devocional Externo
        // Campos comuns do apify/instagram-scraper: caption, timestamp, displayUrl, url
        const caption = post.caption || post.description || "Sem legenda.";
        const imageUrl = post.displayUrl || post.url || "";
        const postUrl = post.url || `https://instagram.com/${username}`;
        const date = post.timestamp ? new Date(post.timestamp).toLocaleDateString('pt-BR') : "Data desconhecida";

        // Limita tamanho da legenda
        const captionResumo = caption.substring(0, 1500) + (caption.length > 1500 ? "..." : "");

        const resultado = `FONTE: INSTAGRAM (@${username})
DATA: ${date}

${captionResumo}

Imagem: ${imageUrl}
Link original: ${postUrl}`;

        return resultado;

    } catch (e: any) {
        console.error("❌ [APIFY] Exception:", e);
        return `Erro de conexão com Apify: ${e.message}`;
    }
}
