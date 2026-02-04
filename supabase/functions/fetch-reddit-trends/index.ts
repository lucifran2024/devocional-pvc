
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Parser from "https://esm.sh/rss-parser@3.13.0";

// Configuração CORS
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RSSItem {
    title: string;
    content: string;
    link: string;
    author: string;
    pubDate: string;
    source: string;
    lang: string;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { mode } = await req.json();
        const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY');

        console.log(`🔍 [SAFE SOURCES MODE] Buscando devocionais seguros...`);

        // =====================================================
        // FONTES DEVOCIONAIS BRASILEIRAS DE QUALIDADE
        // =====================================================
        const SAFE_SOURCES = [
            {
                name: 'Ministério Fiel',
                url: 'https://ministeriofiel.com.br/feed',
                lang: 'pt'
            },
            {
                name: 'Pão Diário',
                url: 'https://ministeriospaodiario.org/feed',
                lang: 'pt'
            },
            {
                name: 'Tabletalk (Ligonier)',
                url: 'https://tabletalkmagazine.com/feed/',
                lang: 'en'
            }
        ];

        const parser = new Parser();
        let allPosts: RSSItem[] = [];

        // 1. Fetch em Paralelo das Fontes Seguras
        await Promise.all(SAFE_SOURCES.map(async (source) => {
            try {
                console.log(`Fetching: ${source.name}...`);
                const resp = await fetch(source.url, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DevocionalBot/1.0)' }
                });

                if (resp.ok) {
                    const xml = await resp.text();
                    const feed = await parser.parseString(xml);

                    const items = feed.items?.slice(0, 3).map((item: any) => ({
                        title: item.title || "Sem título",
                        content: item.contentSnippet || item.content || item.summary || "",
                        link: item.link || item.guid || "#",
                        author: item.creator || item.author || source.name,
                        pubDate: item.pubDate || new Date().toISOString(),
                        source: source.name,
                        lang: source.lang || 'pt'
                    })) || [];

                    allPosts.push(...items);
                    console.log(`✅ ${source.name}: ${items.length} items`);
                } else {
                    console.error(`❌ ${source.name} falhou: ${resp.status}`);
                }
            } catch (e) {
                console.error(`Erro ao buscar ${source.name}:`, e);
            }
        }));

        // 2. Ordenar por data (mais recentes primeiro)
        allPosts.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

        // 3. Pegar Top 5 mais recentes
        const topPosts = allPosts.slice(0, 5);
        console.log(`📚 Total de posts selecionados: ${topPosts.length}`);

        // 4. Tradução (Gemini)
        let translations: any[] = [];
        if (GEMINI_KEY && topPosts.length > 0) {
            try {
                const postsToTranslate = JSON.stringify(topPosts.map((p, i) => ({
                    id: i,
                    title: p.title,
                    text: p.content ? p.content.substring(0, 5000) : "Leia o artigo original."
                })));

                const prompt = `
                ATUE COMO UM PASTOR TRADUTOR.
                
                OBJETIVO: Traduzir estes devocionais profundos para Português do Brasil.
                
                DIRETRIZES:
                1. **TRADUÇÃO INTEGRAL:** Não resuma. Mantenha cada parágrafo.
                2. **TOM:** Solene, poético e teológico (Estilo John Piper/Sproul).
                3. **BÍBLIA:** Use linguagem bíblica padrão (Almeida/NVI).
                4. **OUTPUT:** JSON estrito: [{ "id": 0, "titulo_pt": "...", "texto_pt": "..." }]
                
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
                    console.log(`🌐 Tradução OK: ${translations.length} items`);
                } else {
                    console.error('Gemini Error:', geminiResp.status);
                }
            } catch (e) {
                console.error('Translation Error:', e);
            }
        }

        // 5. Mapear para Formato do Frontend
        const finalPosts = topPosts.map((post, index) => {
            const t = translations.find((x: any) => x.id === index);
            return {
                title: post.title,
                selftext: post.content,
                titulo_pt: t?.titulo_pt || post.title,
                texto_pt: t?.texto_pt || post.content,
                url: post.link,
                author: post.author,
                score: 100,
                num_comments: 0,
                fonte: post.source, // Mostra "Ministério Fiel", "Pão Diário", etc.
                created_utc: new Date(post.pubDate).getTime() / 1000
            };
        });

        return new Response(JSON.stringify({ posts: finalPosts, source: 'SafeRSS' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (e: any) {
        console.error('Fatal Error:', e);
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
