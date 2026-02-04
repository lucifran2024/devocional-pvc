
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Parser from "https://esm.sh/rss-parser@3.13.0";

// Configuração CORS
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { mode, query } = await req.json();

        // --- CONFIGURAÇÃO DE AMBIENTE ---
        const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY');
        const REDDIT_CLIENT_ID = Deno.env.get('REDDIT_CLIENT_ID');
        const REDDIT_SECRET = Deno.env.get('REDDIT_SECRET');

        if (!GEMINI_KEY) throw new Error('GEMINI_API_KEY ausente');

        // Se tiver ID e SECRET, usamos modo OAuth (Qualidade Máxima)
        const hasRedditAuth = REDDIT_CLIENT_ID && REDDIT_SECRET;

        console.log(`🔍 [HYBRID MODE] Buscando: ${mode}, Auth: ${hasRedditAuth ? 'Active' : 'Missing'}`);

        let rawPosts: any[] = [];
        let sourceUsed = 'Unknown';

        // --- ESTRATÉGIA 1: REDDIT OAUTH (SE CONFIGURADO) ---
        if (hasRedditAuth) {
            try {
                // 1. Obter Token
                const authString = btoa(`${REDDIT_CLIENT_ID}:${REDDIT_SECRET}`);
                const tokenResp = await fetch('https://www.reddit.com/api/v1/access_token', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${authString}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': 'DevocionalPVC/1.0'
                    },
                    body: 'grant_type=client_credentials'
                });

                if (tokenResp.ok) {
                    const tokenData = await tokenResp.json();
                    const accessToken = tokenData.access_token;

                    // 2. Buscar Dados
                    const subreddits = 'Christianity+Bible+TrueChristian';
                    const timeFilter = mode === 'trending' ? 'week' : 'month';
                    const sort = mode === 'trending' ? 'top' : 'relevance';
                    const baseUrl = 'https://oauth.reddit.com';

                    let targetUrl = '';
                    if (mode === 'trending') {
                        const q = 'devotional OR verse OR scripture';
                        targetUrl = `${baseUrl}/r/${subreddits}/search.json?q=${encodeURIComponent(q)}&restrict_sr=1&sort=${sort}&t=${timeFilter}&limit=10`;
                    } else {
                        targetUrl = `${baseUrl}/r/${subreddits}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=${sort}&t=${timeFilter}&limit=10`;
                    }

                    console.log(`Fetching Reddit OAuth: ${targetUrl}`);
                    const resp = await fetch(targetUrl, {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'User-Agent': 'DevocionalPVC/1.0'
                        }
                    });

                    if (resp.ok) {
                        const data = await resp.json();
                        rawPosts = data.data.children.map((child: any) => ({
                            title: child.data.title,
                            selftext: child.data.selftext,
                            url: `https://reddit.com${child.data.permalink}`,
                            author: `u/${child.data.author}`,
                            score: child.data.score,
                            num_comments: child.data.num_comments,
                            subreddit: child.data.subreddit,
                            created_utc: child.data.created_utc
                        }));
                        sourceUsed = 'Reddit';
                        console.log(`✅ Sucesso Reddit OAuth: ${rawPosts.length} posts.`);
                    }
                }
            } catch (e) {
                console.error('❌ Erro Reddit OAuth:', e);
            }
        }

        // --- ESTRATÉGIA 2: RSS SOURCES (SE REDDIT FALHAR OU NÃO TIVER AUTH) ---
        if (rawPosts.length === 0) {
            console.log('⚠️ Reddit falhou/indisponível. Tentando Fallback RSS.');

            const sources = [
                {
                    name: 'Desiring God',
                    url: 'https://www.desiringgod.org/rss/feed/all',
                    type: 'direct'
                },
                {
                    name: 'Crosswalk',
                    url: 'https://www.crosswalk.com/devotionals/rss.xml',
                    type: 'direct'
                },
                {
                    name: 'Christianity Today',
                    url: 'https://www.christianitytoday.com/feed',
                    type: 'direct'
                }
            ];

            const parser = new Parser();

            for (const source of sources) {
                if (rawPosts.length > 0) break;
                try {
                    const resp = await fetch(source.url, {
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
                    });
                    if (!resp.ok) continue;

                    const xml = await resp.text();
                    const feed = await parser.parseString(xml);

                    if (feed.items && feed.items.length > 0) {
                        rawPosts = feed.items.map((item: any) => ({
                            title: item.title,
                            selftext: item.contentSnippet || item.content || "",
                            url: item.link || item.guid,
                            author: source.name,
                            score: 0,
                            num_comments: 0,
                            subreddit: "Devocional",
                            created_utc: new Date(item.pubDate || Date.now()).getTime() / 1000
                        }));
                        sourceUsed = 'RSS';
                        console.log(`✅ Sucesso RSS (${source.name}): ${rawPosts.length} posts.`);
                    }
                } catch (e) { console.error(`RSS Error ${source.name}`, e); }
            }
        }

        // --- FALLBACK MOCK (SE TUDO FALHAR) ---
        if (rawPosts.length === 0) {
            rawPosts = getMockData();
            sourceUsed = 'Mock';
        }

        // Preparar Top 5
        const topPosts = rawPosts.slice(0, 5).map((p: any) => ({
            title: p.title,
            selftext: p.selftext ? p.selftext.substring(0, 800) : '',
            url: p.url,
            author: p.author,
            score: p.score || 0,
            num_comments: p.num_comments || 0,
            subreddit: p.subreddit,
            created_utc: p.created_utc
        }));

        // --- TRADUÇÃO (GEMINI) ---
        // Voltamos para "Tradução" e não "Geração" para manter a voz original
        let translations: any[] = [];
        try {
            const postsToTranslate = JSON.stringify(topPosts.map((p: any, i: number) => ({
                id: i,
                title: p.title,
                text: p.selftext
            })));

            const prompt = `
            Você é um tradutor devocional. 
            Traduza estes conteúdos do ${sourceUsed} para Português.
            
            DIRETRIZES:
            1. Mantenha o sentido ORIGINAL do autor (seja um post do Reddit ou texto de blog).
            2. Se for texto curto/título, traduza fielmente.
            3. Se for longo, resuma mantendo a lição espiritual.
            4. Retorne JSON: [{ "id": 0, "titulo_pt": "...", "texto_pt": "..." }]
            
            INPUT: ${postsToTranslate}
            `;

            const geminiResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: "application/json" }
                })
            });

            if (geminiResp.ok) {
                const js = await geminiResp.json();
                const txt = js.candidates?.[0]?.content?.parts?.[0]?.text;
                if (txt) translations = JSON.parse(txt);
            }
        } catch (e) {
            console.error('Translation Error:', e);
        }

        // Merge
        const finalPosts = topPosts.map((post: any, index: number) => {
            const t = translations.find((x: any) => x.id === index);
            return {
                ...post,
                titulo_pt: t?.titulo_pt || post.title,
                texto_pt: t?.texto_pt || post.selftext
            };
        });

        return new Response(JSON.stringify({ posts: finalPosts, source: sourceUsed }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

function getMockData() {
    return [
        {
            title: "Wait on the Lord",
            selftext: "Isaiah 40:31 - But they who wait for the Lord shall renew their strength.",
            url: "https://www.bible.com",
            author: "System",
            score: 0, num_comments: 0, subreddit: "System", created_utc: Date.now() / 1000
        }
    ];
}
