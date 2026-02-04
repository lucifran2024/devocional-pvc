
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Parser from "https://esm.sh/rss-parser@3.13.0";

// Configuração CORS
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mantemos a interface "RedditPost" para não quebrar o frontend, mas os dados virão do Google News
interface RedditPost {
    title: string;
    selftext: string;
    url: string;
    author: string;
    score: number;
    num_comments: number;
    subreddit: string;
    created_utc: number;
}

const parser = new Parser();

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { mode, query } = await req.json();
        const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY');

        if (!GEMINI_KEY) {
            throw new Error('GEMINI_API_KEY não configurada');
        }

        console.log(`🔍 [MULTI-SOURCE MODE] Buscando: ${mode}, query: ${query || 'N/A'}`);

        // Lista de Fontes RSS (Prioridade: Google News -> Christianity Today -> Desiring God)
        const sources = [
            {
                name: 'Google News',
                url: mode === 'trending'
                    ? 'https://news.google.com/rss/search?q=Christianity%20devotional+when:7d&hl=en-US&gl=US&ceid=US:en'
                    : `https://news.google.com/rss/search?q=${encodeURIComponent(query + ' bible devotional')}&hl=en-US&gl=US&ceid=US:en`,
                type: 'google'
            },
            {
                name: 'Desiring God',
                url: 'https://www.desiringgod.org/rss',
                type: 'direct'
            },
            {
                name: 'Christianity Today',
                url: 'https://www.christianitytoday.com/feed', // Feed principal
                type: 'direct'
            }
        ];

        let rawPosts: any[] = [];

        // Loop de Tentativas (Failover)
        for (const source of sources) {
            if (rawPosts.length > 0) break; // Já temos dados

            try {
                console.log(`Trying Fetch: ${source.name} (${source.url})`);

                // Fetch manual para controlar headers
                const resp = await fetch(source.url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                        'Accept': 'application/rss+xml, application/xml, text/xml; q=0.1',
                    }
                });

                if (!resp.ok) {
                    console.error(`❌ ${source.name} Blocked/Error: ${resp.status}`);
                    continue; // Tenta o próximo
                }

                const xmlText = await resp.text();
                // Limpeza básica de XML malformado se necessário
                const parser = new Parser();
                const feed = await parser.parseString(xmlText);

                if (!feed.items || feed.items.length === 0) {
                    console.error(`⚠️ ${source.name} retornou 0 itens.`);
                    continue;
                }

                // Normalizar dados
                rawPosts = feed.items.map((item: any) => {
                    let title = item.title || "";
                    let author = source.name;

                    // Limpeza específica do Google News
                    if (source.type === 'google' && title.includes(' - ')) {
                        const parts = title.split(' - ');
                        author = parts.pop() || source.name;
                        title = parts.join(' - ');
                    }

                    return {
                        title: title,
                        selftext: item.contentSnippet || item.content || item.summary || "",
                        url: item.link || item.guid,
                        author: author,
                        score: 0,
                        num_comments: 0,
                        subreddit: "NoticiasCristas", // Tag interna
                        created_utc: new Date(item.pubDate || Date.now()).getTime() / 1000
                    };
                });

                console.log(`✅ Sucesso via ${source.name}: ${rawPosts.length} itens.`);

            } catch (e) {
                console.error(`❌ Erro ao processar ${source.name}:`, e);
            }
        }

        // --- FALLBACK MOCK (MODO DE SEGURANÇA) ---
        if (rawPosts.length === 0) {
            console.log('⚠️ TODAS as fontes falharam. Usando Mock Data de Segurança.');
            rawPosts = [
                {
                    title: "Trusting God in the Waiting (Fallback)",
                    selftext: "Sometimes the hardest part of faith is waiting. But remember that God's timing is perfect. Isaiah 40:31 says that those who wait upon the Lord shall renew their strength.",
                    url: "https://www.bible.com",
                    author: "System",
                    score: 99,
                    num_comments: 0,
                    subreddit: "System",
                    created_utc: Date.now() / 1000
                },
                {
                    title: "Verse of the Day: Philippians 4:13",
                    selftext: "I can do all things through Christ who strengthens me.",
                    url: "https://www.biblegateway.com",
                    author: "System",
                    score: 99,
                    num_comments: 0,
                    subreddit: "System",
                    created_utc: Date.now() / 1000
                }
            ];
        }

        // Limit to 5
        const topPosts = rawPosts.slice(0, 5).map((p: any) => ({
            title: p.title,
            selftext: p.selftext ? p.selftext.substring(0, 1000).replace(/<[^>]*>/g, '') : '',
            url: p.url,
            author: p.author,
            score: p.score,
            num_comments: p.num_comments,
            subreddit: p.subreddit,
            created_utc: p.created_utc
        }));

        // 4. Tradução em Lote com Gemini
        let translations: any[] = [];
        try {
            const postsToTranslate = JSON.stringify(topPosts.map((p: any, i: number) => ({
                id: i,
                title: p.title,
                text: p.selftext
            })));

            const prompt = `
            Você é um curador de conteúdo cristão. Traduza e adapte as seguintes notícias/artigos (Inglês) para um formato de "Destaque Devocional" em Português (Brasil).
            
            REQUSITOS:
            1. Título: Traduza de forma atraente e inspiradora.
            2. Texto: Faça um mini-resumo devocional do que se trata (max 200 chars).
            3. Fonte: Mantenha o nome original da fonte (ex: Christianity Today).
            4. Retorne APENAS um JSON array válido: [{ "id": 0, "titulo_pt": "...", "texto_pt": "..." }, ...]
            
            INPUT:
            ${postsToTranslate}
            `;

            const geminiResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: "application/json" }
                })
            });

            if (!geminiResp.ok) {
                const errText = await geminiResp.text();
                console.error(`❌ Gemini Error: ${geminiResp.status} - ${errText}`);
            } else {
                const geminiData = await geminiResp.json();
                const translatedContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
                if (translatedContent) {
                    translations = JSON.parse(translatedContent);
                }
            }
        } catch (e) {
            console.error('⚠️ Falha na tradução:', e);
        }

        // 5. Merge e Retorno
        const finalPosts = topPosts.map((post: any, index: number) => {
            const translation = translations.find((t: any) => t.id === index);
            return {
                ...post,
                titulo_pt: translation?.titulo_pt || post.title,
                texto_pt: translation?.texto_pt || post.selftext
            };
        });

        console.log(`✅ Retornando ${finalPosts.length} posts (Google News).`);
        return new Response(JSON.stringify({ posts: finalPosts }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error('Erro Geral:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
