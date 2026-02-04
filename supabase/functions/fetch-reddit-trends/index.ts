
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

        console.log(`🔍 [GOOGLE NEWS MODE] Buscando: ${mode}, query: ${query || 'N/A'}`);

        // 1. Definir URL Google News RSS
        // Google News é muito mais aberto e estável para RSS
        let rssUrl = '';

        if (mode === 'trending') {
            // "Christianity devotional" nos últimos 7 dias
            const q = 'Christianity devotional OR "verse of the day" OR "daily reflection"';
            rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}+when:7d&hl=en-US&gl=US&ceid=US:en`;
        } else if (mode === 'passage') {
            if (!query) throw new Error('Query obrigatória para modo passage');
            // Busca pela passagem
            rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query + ' bible commentary OR devotional')}&hl=en-US&gl=US&ceid=US:en`;
        } else {
            throw new Error('Modo inválido');
        }

        // 2. Fetch via RSS Parser
        let rawPosts: any[] = [];
        try {
            console.log(`Fetching RSS: ${rssUrl}`);
            const feed = await parser.parseURL(rssUrl);

            rawPosts = feed.items.map((item: any) => {
                // Google News Items: title, link, pubDate, source (sometimes)
                // O title geralmente é "Manchete - Fonte"
                let titleClean = item.title || "";
                let source = "News";

                if (titleClean.includes(' - ')) {
                    const parts = titleClean.split(' - ');
                    source = parts.pop() || "News";
                    titleClean = parts.join(' - ');
                }

                return {
                    title: titleClean,
                    selftext: item.contentSnippet || item.content || "", // Google News geralmente tem snippet curto
                    url: item.link,
                    author: source, // Usamos a Fonte (ex: Christianity Today) como Autor
                    score: 0,
                    num_comments: 0,
                    subreddit: "ChristianNews", // Tag fixa para indicar fonte
                    created_utc: new Date(item.pubDate || Date.now()).getTime() / 1000
                };
            });
            console.log(`✅ RSS Fetch sucesso: ${rawPosts.length} itens encontrados.`);

        } catch (e) {
            console.error('❌ Google RSS Error:', e);
        }

        // --- FALLBACK MOCK (MODO DE SEGURANÇA) ---
        if (rawPosts.length === 0) {
            console.log('⚠️ RSS vazio/falhou. Usando Mock Data de Segurança.');
            rawPosts = [
                {
                    title: "Trusting God in the Waiting",
                    selftext: "Sometimes the hardest part of faith is waiting. But remember that God's timing is perfect. Isaiah 40:31 says that those who wait upon the Lord shall renew their strength.",
                    url: "https://www.bible.com",
                    author: "Daily Devotional",
                    score: 99,
                    num_comments: 0,
                    subreddit: "Devotional",
                    created_utc: Date.now() / 1000
                },
                {
                    title: "Verse of the Day: Philippians 4:13",
                    selftext: "I can do all things through Christ who strengthens me.",
                    url: "https://www.biblegateway.com",
                    author: "Bible Gateway",
                    score: 99,
                    num_comments: 0,
                    subreddit: "Scripture",
                    created_utc: Date.now() / 1000
                }
            ];
        }

        // Google News já vem ordenado por relevância/data. Pegamos Top 5.
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
