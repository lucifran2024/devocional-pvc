
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Parser from "https://esm.sh/rss-parser@3.13.0";

// Configuração CORS
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

        console.log(`🔍 [RSS MODE] Buscando Reddit: ${mode}, query: ${query || 'N/A'}`);

        // 1. Definir URL RSS do Reddit (Mais resiliente a bloqueios que JSON)
        let rssUrl = '';
        // Combinar subs no formato RSS
        const subreddits = 'Bible+Christianity+TrueChristian';

        if (mode === 'trending') {
            // Top da semana via RSS
            rssUrl = `https://www.reddit.com/r/${subreddits}/top/.rss?t=week&limit=10`;
        } else if (mode === 'passage') {
            if (!query) throw new Error('Query obrigatória para modo passage');
            // Busca via RSS
            rssUrl = `https://www.reddit.com/r/${subreddits}/search/.rss?q=${encodeURIComponent(query)}&restrict_sr=1&sort=relevance&limit=10`;
        } else {
            throw new Error('Modo inválido');
        }

        // 2. Fetch via RSS Parser
        let rawPosts: any[] = [];
        try {
            console.log(`Fetching RSS: ${rssUrl}`);
            const feed = await parser.parseURL(rssUrl);

            rawPosts = feed.items.map((item: any) => {
                return {
                    title: item.title,
                    selftext: item.contentSnippet || item.content || "",
                    url: item.link,
                    author: item.author || "reddit_user",
                    score: 0,
                    num_comments: 0,
                    subreddit: "Christianity",
                    created_utc: new Date(item.pubDate || Date.now()).getTime() / 1000
                };
            });
            console.log(`✅ RSS Fetch sucesso: ${rawPosts.length} itens encontrados.`);

        } catch (e) {
            console.error('❌ Reddit RSS Error:', e);
        }

        // --- FALLBACK MOCK (MODO DE SEGURANÇA) ---
        if (rawPosts.length === 0) {
            console.log('⚠️ RSS vazio/falhou. Usando Mock Data de Segurança.');
            rawPosts = [
                {
                    title: "Trusting God in the Waiting",
                    selftext: "Sometimes the hardest part of faith is waiting. But remember that God's timing is perfect. Isaiah 40:31 says that those who wait upon the Lord shall renew their strength.",
                    url: "https://www.reddit.com/r/Christianity",
                    author: "faithful_servant",
                    score: 99,
                    num_comments: 0,
                    subreddit: "Christianity",
                    created_utc: Date.now() / 1000
                },
                {
                    title: "Verse of the Day: Philippians 4:13",
                    selftext: "I can do all things through Christ who strengthens me.",
                    url: "https://www.reddit.com/r/Bible",
                    author: "verse_bot",
                    score: 99,
                    num_comments: 0,
                    subreddit: "Bible",
                    created_utc: Date.now() / 1000
                },
                {
                    title: "Prayer Request for Peace",
                    selftext: "Let us pray for peace in our hearts and in the world.",
                    url: "https://www.reddit.com/r/TrueChristian",
                    author: "prayer_warrior",
                    score: 99,
                    num_comments: 0,
                    subreddit: "TrueChristian",
                    created_utc: Date.now() / 1000
                }
            ];
        }

        // RSS já vem ordenado pela fonte (Top ou Relevance).
        // Pegamos os 5 primeiros e limpamos HTML
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
            Você é um tradutor devocional experiente. Traduza os seguintes posts do Reddit (feed RSS) para Português (Brasil).
            
            REQUSITOS:
            1. Mantenha o tom respeitoso, inspirador e 'devocional'.
            2. Mantenha referências bíblicas claras (ex: John 3:16 -> João 3:16).
            3. Se o texto for muito longo, RESUMA mantendo a essência espiritual.
            4. O input pode ter HTML. LIMPE tags. Entregue apenas texto puro.
            5. Retorne APENAS um JSON array válido: [{ "id": 0, "titulo_pt": "...", "texto_pt": "..." }, ...]
            
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
                // Fallback silencioso para original se der erro 429 ou 500 no Gemini
            } else {
                const geminiData = await geminiResp.json();
                const translatedContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
                if (translatedContent) {
                    translations = JSON.parse(translatedContent);
                }
            }
        } catch (e) {
            console.error('⚠️ Falha na tradução (usando original):', e);
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

        console.log(`✅ Retornando ${finalPosts.length} posts.`);
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
