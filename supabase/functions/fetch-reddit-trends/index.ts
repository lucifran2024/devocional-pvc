
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Parser from "https://esm.sh/rss-parser@3.13.0";

// Configuração CORS
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DevocionalItem {
    title: string;
    content: string;
    link: string;
    author: string;
    pubDate: string;
    source: string;
    lang: string;
}

// =====================================================
// FUNÇÃO: Buscar Pão Diário via Scraping
// =====================================================
async function buscarPaoDiario(): Promise<DevocionalItem | null> {
    try {
        const hoje = new Date();
        const dataFormatada = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;
        const url = `https://ministeriospaodiario.com.br/devocional?date=${dataFormatada}`;

        console.log(`🍞 Buscando Pão Diário: ${url}`);

        const resp = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DevocionalBot/1.0)' }
        });

        if (!resp.ok) {
            console.error(`❌ Pão Diário falhou: ${resp.status}`);
            return null;
        }

        const html = await resp.text();

        // Extrair título (procura no HTML)
        const titleMatch = html.match(/<h1[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/h1>/i) ||
            html.match(/<meta property="og:title" content="([^"]+)"/i);
        const title = titleMatch ? titleMatch[1].replace('Devocional • ', '').trim() : 'Devocional Pão Diário';

        // Extrair descrição do meta og:description
        const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/i) ||
            html.match(/<meta name="description" content="([^"]+)"/i);
        const description = descMatch ? descMatch[1] : '';

        // Extrair conteúdo principal (texto do devocional)
        let content = '';

        // Tenta extrair texto mais completo
        const contentMatch = html.match(/<div[^>]*class="[^"]*devotional-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
            html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
        if (contentMatch) {
            // Remove tags HTML mantendo quebras de linha
            content = contentMatch[1]
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<button[^>]*>[\s\S]*?<\/button>/gi, '')
                .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/p>/gi, '\n\n')
                .replace(/<\/h[1-6]>/gi, '\n\n')
                .replace(/<[^>]+>/g, '')
                .replace(/&nbsp;/g, ' ')
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, '&')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
        }

        // Se não conseguiu extrair, usa a descrição
        if (!content || content.length < 50) {
            content = description;
        }

        // Limitar e cortar no último ponto
        if (content.length > 1200) {
            const cortado = content.substring(0, 1200);
            const ultimoPonto = cortado.lastIndexOf('.');
            content = ultimoPonto > 800 ? cortado.substring(0, ultimoPonto + 1) : cortado + '...';
        }

        if (!title && !content) {
            console.error('❌ Pão Diário: Não conseguiu extrair conteúdo');
            return null;
        }

        console.log(`✅ Pão Diário: "${title}"`);

        return {
            title,
            content: content || 'Leia o devocional completo no site.',
            link: url,
            author: 'Ministérios Pão Diário',
            pubDate: new Date().toISOString(),
            source: 'Pão Diário',
            lang: 'pt'
        };
    } catch (e) {
        console.error('Erro Pão Diário:', e);
        return null;
    }
}

// =====================================================
// FUNÇÃO: Buscar Tabletalk Daily Study via Scraping
// =====================================================
async function buscarTabletalk(): Promise<DevocionalItem | null> {
    try {
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const dia = String(hoje.getDate()).padStart(2, '0');

        // URL do índice mensal para pegar o devocional do dia
        const indexUrl = `https://tabletalkmagazine.com/daily-study/${ano}/${mes}/`;

        console.log(`📖 Buscando Tabletalk: ${indexUrl}`);

        const indexResp = await fetch(indexUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DevocionalBot/1.0)' }
        });

        if (!indexResp.ok) {
            console.error(`❌ Tabletalk index falhou: ${indexResp.status}`);
            return null;
        }

        const indexHtml = await indexResp.text();

        // Procura links de daily-study do dia atual ou mais recente
        const linkPattern = new RegExp(`href="(https://tabletalkmagazine\\.com/daily-study/${ano}/${mes}/[^"]+)"`, 'gi');
        const links: string[] = [];
        let match;
        while ((match = linkPattern.exec(indexHtml)) !== null) {
            if (!links.includes(match[1])) links.push(match[1]);
        }

        if (links.length === 0) {
            console.error('❌ Tabletalk: Nenhum link encontrado');
            return null;
        }

        // Pega o primeiro link (mais recente)
        const devocionalUrl = links[0];
        console.log(`📖 Tabletalk URL: ${devocionalUrl}`);

        const resp = await fetch(devocionalUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DevocionalBot/1.0)' }
        });

        if (!resp.ok) return null;

        const html = await resp.text();

        // Extrair título
        const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i) ||
            html.match(/<title>([^<|]+)/i);
        const title = titleMatch ? titleMatch[1].replace(' | Tabletalk', '').trim() : 'Daily Study';

        // Extrair conteúdo do og:description
        const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/i) ||
            html.match(/<meta name="description" content="([^"]+)"/i);
        let content = descMatch ? descMatch[1] : '';

        // Limitar tamanho
        if (content.length > 1000) {
            const cortado = content.substring(0, 1000);
            const ultimoPonto = cortado.lastIndexOf('.');
            content = ultimoPonto > 600 ? cortado.substring(0, ultimoPonto + 1) : cortado + '...';
        }

        console.log(`✅ Tabletalk: "${title}" (${content.length} chars)`);

        return {
            title,
            content,
            link: devocionalUrl,
            author: 'Tabletalk Magazine',
            pubDate: new Date().toISOString(),
            source: 'Tabletalk (Ligonier)',
            lang: 'en'
        };
    } catch (e) {
        console.error('Erro Tabletalk:', e);
        return null;
    }
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { mode } = await req.json();
        const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY');

        console.log(`🔍 [DEVOCIONAIS DO MUNDO] Buscando fontes seguras...`);

        // =====================================================
        // FONTES RSS (Apenas Ministério Fiel)
        // =====================================================
        const RSS_SOURCES = [
            {
                name: 'Ministério Fiel',
                url: 'https://ministeriofiel.com.br/artigos/feed/',
                lang: 'pt'
            }
        ];

        const parser = new Parser();
        let allPosts: DevocionalItem[] = [];

        // 1. Buscar Pão Diário via Scraping (Prioritário!)
        const paoDiario = await buscarPaoDiario();
        if (paoDiario) {
            allPosts.push(paoDiario);
        }

        // 2. Buscar Tabletalk Daily Study via Scraping
        const tabletalk = await buscarTabletalk();
        if (tabletalk) {
            allPosts.push(tabletalk);
        }

        // 2. Fetch RSS em Paralelo
        await Promise.all(RSS_SOURCES.map(async (source) => {
            try {
                console.log(`📡 Fetching RSS: ${source.name}...`);
                const resp = await fetch(source.url, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DevocionalBot/1.0)' }
                });

                if (resp.ok) {
                    const xml = await resp.text();
                    const feed = await parser.parseString(xml);

                    const items = feed.items?.slice(0, 2).map((item: any) => ({
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

        // 3. Ordenar (Pão Diário primeiro, depois por data)
        allPosts.sort((a, b) => {
            // Pão Diário sempre primeiro
            if (a.source === 'Pão Diário') return -1;
            if (b.source === 'Pão Diário') return 1;
            return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
        });

        // 4. Pegar Top 5 
        const topPosts = allPosts.slice(0, 5);
        console.log(`📚 Total de posts selecionados: ${topPosts.length}`);

        // 5. Tradução apenas para itens em inglês (Gemini)
        let translations: any[] = [];
        const postsEmIngles = topPosts.filter(p => p.lang === 'en');

        if (GEMINI_KEY && postsEmIngles.length > 0) {
            try {
                const postsToTranslate = JSON.stringify(postsEmIngles.map((p, i) => ({
                    id: topPosts.indexOf(p),
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

        // 6. Mapear para Formato do Frontend
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
                fonte: post.source,
                created_utc: new Date(post.pubDate).getTime() / 1000
            };
        });

        return new Response(JSON.stringify({ posts: finalPosts, source: 'DevocionaisBR' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (e: any) {
        console.error('Fatal Error:', e);
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
