
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
        const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY');

        // --- CHAVE MESTRA DO USUÁRIO (PRIVATE FEED) ---
        // Isso permite acesso direto sem login, pois contém o token do usuário.
        const PRIVATE_FEED_URL = 'https://www.reddit.com/.json?feed=e82293b1f1af109cdf74c39e877829537e8236ab&user=Practical-Mall-5821';

        console.log(`🔍 [PRIVATE FEED MODE] Buscando: ${mode}`);

        let rawPosts: any[] = [];
        let sourceUsed = 'Reddit (Private)';

        // --- ESTRATÉGIA 1: PRIVATE FEED (INFALÍVEL) ---
        try {
            console.log(`Fetching Private Feed...`);
            const resp = await fetch(PRIVATE_FEED_URL, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            if (resp.ok) {
                const data = await resp.json();

                // O feed privado retorna um JSON Listing padrão do Reddit
                if (data.data && data.data.children) {
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
                    console.log(`✅ Sucesso Private Feed: ${rawPosts.length} posts retornados.`);
                }
            } else {
                console.error(`❌ Private Feed Error Status: ${resp.status}`);
            }
        } catch (e) {
            console.error('❌ Erro Fatal Private Feed:', e);
        }

        // --- FILTRA APENAS CONTEÚDO RELEVANTE ---
        // Filtramos posts vazios ou muito curtos para garantir qualidade.
        rawPosts = rawPosts.filter(p => p.selftext && p.selftext.length > 50);

        // --- ESTRATÉGIA 2: RSS SOURCES (FALLBACK DE SEGURANÇA) ---
        if (rawPosts.length === 0) {
            console.log('⚠️ Private Feed vazio/falhou. Ativando Fallback RSS.');
            sourceUsed = 'RSS Fallback';

            const sources = [
                { name: 'Desiring God', url: 'https://www.desiringgod.org/rss/feed/all' },
                { name: 'Christianity Today', url: 'https://www.christianitytoday.com/feed' }
            ];

            const parser = new Parser();

            for (const source of sources) {
                if (rawPosts.length > 0) break;
                try {
                    const resp = await fetch(source.url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                    if (!resp.ok) continue;
                    const xml = await resp.text();
                    const feed = await parser.parseString(xml);
                    if (feed.items) {
                        rawPosts = feed.items.map((item: any) => ({
                            title: item.title,
                            selftext: item.contentSnippet || item.content || "",
                            url: item.link || item.guid,
                            author: source.name,
                            score: 0, num_comments: 0, subreddit: "Devocional",
                            created_utc: Date.now() / 1000
                        }));
                    }
                } catch (e) { }
            }
        }

        // Slice Top 5
        const topPosts = rawPosts.slice(0, 5);

        // --- TRADUÇÃO (GEMINI) ---
        let translations: any[] = [];
        if (GEMINI_KEY && topPosts.length > 0) {
            try {
                const postsToTranslate = JSON.stringify(topPosts.map((p: any, i: number) => ({
                    id: i,
                    title: p.title,
                    text: p.selftext ? p.selftext.substring(0, 1000) : ""
                })));

                const prompt = `
                Você é um tradutor teológico experiente.
                Traduza estes posts do Reddit/RSS para Português do Brasil.
                
                DIRETRIZES:
                1. Mantenha o tom pessoal e testemunhal do autor original.
                2. Traduza gírias ou contextos culturais para equivalentes brasileiros cristãos.
                3. Se o texto for muito longo, faça um resumo rico, mantendo a essência espiritual.
                4. Retorne APENAS JSON: [{ "id": 0, "titulo_pt": "...", "texto_pt": "..." }]
                
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
        }

        // Merge Final
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
