// =====================================================
// RSS TOOLS - Ferramentas para Consulta Externa
// Permite que a IA veja "o que outros estão falando"
// =====================================================

export const RSS_TOOLS_DEFINITION = [{
    function_declarations: [{
        name: "consultar_devocional_externo",
        description: "Consulta o devocional do dia de sites cristãos renomados (Ultimato, Pão Diário, Voltemos ao Evangelho, Spurgeon). Use para comparar temas ou buscar inspiração sobre o assunto do dia.",
        parameters: {
            type: "object",
            properties: {
                fonte: {
                    type: "string",
                    description: "Fonte do devocional. Opções: 'ultimato', 'pao_diario', 'voltemos', 'spurgeon'",
                    enum: ["ultimato", "pao_diario", "voltemos", "spurgeon"]
                }
            },
            required: ["fonte"]
        }
    }]
}];

const FEEDS = {
    'ultimato': 'https://www.ultimato.com.br/feed',
    'pao_diario': 'https://paodiario.org/feed/',
    'voltemos': 'https://voltemosaoevangelho.com/blog/feed/',
    'spurgeon': 'https://spurgeon.org/feed/'
};

export async function consultarRSS(fonte: string): Promise<string> {
    console.log(`📡 [RSS] Consultando: ${fonte}`);

    const url = FEEDS[fonte as keyof typeof FEEDS];
    if (!url) return "Fonte desconhecida.";

    try {
        const response = await fetch(url);
        if (!response.ok) return `Erro ao acessar feed (${response.status})`;

        const xml = await response.text();

        // Parser XML "Rustico" (Regex) para evitar dependências pesadas
        // Busca o primeiro <item>
        const itemMatch = xml.match(/<item>([\s\S]*?)<\/item>/i);
        if (!itemMatch) return "Nenhum item encontrado no feed.";

        const itemContent = itemMatch[1];

        const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/i);
        // Remove CDATA se existir
        const title = titleMatch ? cleanText(titleMatch[1]) : "Sem título";

        // Tenta pegar content:encoded ou description
        let contentMatch = itemContent.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/i);
        if (!contentMatch) {
            contentMatch = itemContent.match(/<description>([\s\S]*?)<\/description>/i);
        }

        const content = contentMatch ? cleanText(contentMatch[1]) : "Sem conteúdo";

        // Limita tamanho para economizar tokens (max 1000 chars)
        const contentResumo = content.substring(0, 1000) + (content.length > 1000 ? "..." : "");

        return `FONTE: ${fonte.toUpperCase()}\nTÍTULO: ${title}\nRESUMO: ${contentResumo}`;

    } catch (e: any) {
        console.error("Erro RSS:", e);
        return `Erro ao processar RSS: ${e.message}`;
    }
}

function cleanText(text: string): string {
    return text
        .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') // Remove CDATA
        .replace(/<[^>]+>/g, ' ') // Remove HTML tags
        .replace(/\s+/g, ' ') // Normaliza espaços
        .trim();
}
