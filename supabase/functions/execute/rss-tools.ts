// =====================================================
// RSS TOOLS - Ferramentas para Consulta Externa
// Permite que a IA veja "o que outros estão falando"
// =====================================================

export const RSS_TOOLS_DEFINITION = [{
    function_declarations: [{
        name: "consultar_devocional_externo",
        description: "Consulta o devocional do dia de sites cristãos renomados. Use para comparar temas ou buscar inspiração sobre o assunto do dia.",
        parameters: {
            type: "object",
            properties: {
                fonte: {
                    type: "string",
                    description: "Fonte do devocional. Opções: 'voltemos', 'bible_gateway', 'desiring_god', 'grace_to_you'",
                    enum: ["voltemos", "bible_gateway", "desiring_god", "grace_to_you"]
                }
            },
            required: ["fonte"]
        }
    }]
}];

// FEEDS ATUALIZADOS - Fontes que realmente contêm devocionais
const FEEDS = {
    // Voltemos ao Evangelho - Conteúdo reformado (FUNCIONANDO)
    'voltemos': 'https://voltemosaoevangelho.com/blog/feed/',
    // Bible Gateway - Versículo do Dia (ATOM format)
    'bible_gateway': 'https://www.biblegateway.com/votd/get/?format=atom&version=ARC',
    // Desiring God - Solid Joys Daily Devotional (John Piper)
    'desiring_god': 'https://feed.desiringgod.org/solidjoys',
    // Grace to You - Daily Devotional (John MacArthur)
    'grace_to_you': 'https://www.gty.org/blog/rss'
};

export async function consultarRSS(fonte: string): Promise<string> {
    console.log(`📡 [RSS] Consultando: ${fonte}`);

    const url = FEEDS[fonte as keyof typeof FEEDS];
    if (!url) return "Fonte desconhecida.";

    try {
        const response = await fetch(url);
        if (!response.ok) return `Erro ao acessar feed (${response.status})`;

        const xml = await response.text();

        // Detecta se é ATOM ou RSS
        const isAtom = xml.includes('<feed') || xml.includes('<entry');

        let title = "Sem título";
        let content = "Sem conteúdo";

        if (isAtom) {
            // Parser ATOM (usado pelo Bible Gateway)
            const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/i);
            if (entryMatch) {
                const entryContent = entryMatch[1];
                const titleMatch = entryContent.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
                title = titleMatch ? cleanText(titleMatch[1]) : "Sem título";

                // ATOM usa <content> ou <summary>
                let contentMatch = entryContent.match(/<content[^>]*>([\s\S]*?)<\/content>/i);
                if (!contentMatch) {
                    contentMatch = entryContent.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i);
                }
                content = contentMatch ? cleanText(contentMatch[1]) : "Sem conteúdo";
            }
        } else {
            // Parser RSS tradicional
            const itemMatch = xml.match(/<item>([\s\S]*?)<\/item>/i);
            if (itemMatch) {
                const itemContent = itemMatch[1];

                const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/i);
                title = titleMatch ? cleanText(titleMatch[1]) : "Sem título";

                // Tenta pegar content:encoded ou description
                let contentMatch = itemContent.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/i);
                if (!contentMatch) {
                    contentMatch = itemContent.match(/<description>([\s\S]*?)<\/description>/i);
                }
                content = contentMatch ? cleanText(contentMatch[1]) : "Sem conteúdo";
            }
        }

        if (content === "Sem conteúdo") {
            return `FONTE: ${fonte.toUpperCase()}\nTÍTULO: ${title}\nNenhum devocional encontrado no feed.`;
        }

        // Limita tamanho (max 2000 chars para devocionais externos)
        const contentResumo = content.substring(0, 2000) + (content.length > 2000 ? "..." : "");

        return `FONTE: ${fonte.toUpperCase()}\nTÍTULO: ${title}\n\n${contentResumo}`;

    } catch (e: any) {
        console.error("Erro RSS:", e);
        return `Erro ao processar RSS: ${e.message}`;
    }
}

function cleanText(text: string): string {
    return decodeHtmlEntities(
        text
            .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') // Remove CDATA
            .replace(/<[^>]+>/g, ' ') // Remove HTML tags
            .replace(/\s+/g, ' ') // Normaliza espaços
            .trim()
    );
}

// Decodifica entidades HTML comuns
function decodeHtmlEntities(text: string): string {
    const entities: { [key: string]: string } = {
        '&quot;': '"',
        '&apos;': "'",
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&nbsp;': ' ',
        '&ldquo;': '"',
        '&rdquo;': '"',
        '&lsquo;': "'",
        '&rsquo;': "'",
        '&mdash;': '—',
        '&ndash;': '–',
        '&hellip;': '…',
        '&#39;': "'",
        '&#34;': '"',
    };

    // Substitui entidades nomeadas
    let result = text;
    for (const [entity, char] of Object.entries(entities)) {
        result = result.replace(new RegExp(entity, 'g'), char);
    }

    // Substitui entidades numéricas (&#123; ou &#x7B;)
    result = result.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
    result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

    return result;
}
