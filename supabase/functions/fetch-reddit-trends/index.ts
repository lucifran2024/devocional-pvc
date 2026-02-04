import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

        console.log(`🔍 Buscando Reddit no modo: ${mode}, query: ${query || 'N/A'}`);

        // 1. Definir Query do Reddit
        let redditUrl = '';
        const subreddits = 'Christianity+Bible+TrueChristian';

        // Filtro de tempo: Trending = últimos 2 dias. Passage = semana/mês
        const timeFilter = mode === 'trending' ? 'week' : 'month';
        const sort = mode === 'trending' ? 'top' : 'relevance';

        if (mode === 'trending') {
            // Busca ampla
            const q = 'devotional OR verse OR scripture OR reflection';
            redditUrl = `https://www.reddit.com/r/${subreddits}/search.json?q=${encodeURIComponent(q)}&restrict_sr=1&sort=${sort}&t=${timeFilter}&limit=15`;
        } else if (mode === 'passage') {
            // Busca pela passagem
            if (!query) throw new Error('Query obrigatória para modo passage');
            redditUrl = `https://www.reddit.com/r/${subreddits}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=${sort}&t=${timeFilter}&limit=10`;
        } else {
            throw new Error('Modo inválido');
        }

        // 2. Fetch Reddit
        const redditResp = await fetch(redditUrl, {
            headers: { 'User-Agent': 'DevocionalPVC/1.0' } // Reddit exige User-Agent customizado
        });

        if (!redditResp.ok) {
            const errText = await redditResp.text();
            console.error('Erro Reddit:', errText);
            throw new Error(`Erro ao acessar Reddit: ${redditResp.status}`);
        }

        const redditData = await redditResp.json();
        const rawPosts = redditData.data.children.map((child: any) => child.data);

        // 3. Filtragem Manual (Data para Trending)
        let filteredPosts = rawPosts;
        if (mode === 'trending') {
            const twoDaysAgo = Math.floor(Date.now() / 1000) - (48 * 60 * 60);
            filteredPosts = rawPosts.filter((p: any) => p.created_utc > twoDaysAgo);
        }

        // Ordenar por score e pegar Top 5
        const topPosts = filteredPosts
            .sort((a: any, b: any) => b.score - a.score)
            .slice(0, 5)
            .map((p: any) => ({
                title: p.title,
                selftext: p.selftext ? p.selftext.substring(0, 1000) : '', // Limitar tamanho para o prompt
                url: p.url,
                author: p.author,
                score: p.score,
                num_comments: p.num_comments,
                subreddit: p.subreddit,
                created_utc: p.created_utc
            }));

        if (topPosts.length === 0) {
            return new Response(JSON.stringify({ posts: [] }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 4. Tradução em Lote com Gemini
        const postsToTranslate = JSON.stringify(topPosts.map((p: any, i: number) => ({
            id: i,
            title: p.title,
            text: p.selftext
        })));

        const prompt = `
      Você é um tradutor devocional experiente. Traduza os seguintes posts do Reddit (Inglês) para Português (Brasil).
      
      REQUSITOS:
      1. Mantenha o tom respeitoso, inspirador e 'devocional'.
      2. Mantenha referências bíblicas claras (ex: John 3:16 -> João 3:16).
      3. Se o texto for muito longo, RESUMA mantendo a essência espiritual.
      4. Retorne APENAS um JSON array válido com os objetos traduzidos: [{ "id": 0, "titulo_pt": "...", "texto_pt": "..." }, ...]
      
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

        const geminiData = await geminiResp.json();
        const translatedContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

        let translations: any[] = [];
        try {
            translations = JSON.parse(translatedContent);
        } catch (e) {
            console.error('Erro ao parsear JSON do Gemini:', translatedContent);
            // Fallback: retornar original se falhar tradução
            translations = topPosts.map((p: any, i: number) => ({ id: i, titulo_pt: p.title, texto_pt: p.selftext }));
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
