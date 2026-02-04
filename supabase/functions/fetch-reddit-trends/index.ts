
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

        // Extrair título 
        const titleMatch = html.match(/<meta property="og:title" content="Devocional • ([^"]+)"/i);
        const title = titleMatch ? titleMatch[1].trim() : 'Devocional do Dia';

        // Extrair descrição do meta og:description 
        const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/i) ||
            html.match(/<meta name="description" content="([^"]+)"/i);
        let content = descMatch ? descMatch[1] : '';

        // Limitar e formatar
        if (content.length > 1000) {
            const cortado = content.substring(0, 1000);
            const ultimoPonto = cortado.lastIndexOf('.');
            content = ultimoPonto > 600 ? cortado.substring(0, ultimoPonto + 1) : cortado + '...';
        }

        if (!title || content.length < 50) {
            console.error('❌ Pão Diário: Conteúdo insuficiente');
            return null;
        }

        console.log(`✅ Pão Diário: "${title}" (${content.length} chars)`);

        return {
            title,
            content,
            link: url,
            author: 'Pão Diário',
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
// FUNÇÃO: Buscar Tabletalk Daily Study
// =====================================================
async function buscarTabletalk(): Promise<DevocionalItem | null> {
    try {
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');

        // Primeiro, buscar a lista de daily studies do mês
        const indexUrl = `https://tabletalkmagazine.com/daily-study/${ano}/${mes}/`;
        console.log(`📖 Buscando Tabletalk index: ${indexUrl}`);

        const indexResp = await fetch(indexUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DevocionalBot/1.0)' }
        });

        if (!indexResp.ok) {
            console.error(`❌ Tabletalk index falhou: ${indexResp.status}`);
            return null;
        }

        const indexHtml = await indexResp.text();

        // Procura links de daily-study 
        const linkMatches = indexHtml.match(/href="(https:\/\/tabletalkmagazine\.com\/daily-study\/\d{4}\/\d{2}\/[^"]+)"/gi);

        if (!linkMatches || linkMatches.length === 0) {
            console.error('❌ Tabletalk: Nenhum link encontrado');
            return null;
        }

        // Extrair URLs (pegar o primeiro/mais recente)
        const firstLink = linkMatches[0].replace(/href="|"/g, '');
        console.log(`📖 Tabletalk devocional: ${firstLink}`);

        const resp = await fetch(firstLink, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DevocionalBot/1.0)' }
        });

        if (!resp.ok) return null;

        const html = await resp.text();

        // Extrair título
        const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i);
        const title = titleMatch ? titleMatch[1].replace(' | Tabletalk', '').trim() : 'Daily Study';

        // Extrair conteúdo do og:description
        const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/i);
        let content = descMatch ? descMatch[1] : '';

        // Limitar
        if (content.length > 800) {
            const cortado = content.substring(0, 800);
            const ultimoPonto = cortado.lastIndexOf('.');
            content = ultimoPonto > 400 ? cortado.substring(0, ultimoPonto + 1) : cortado + '...';
        }

        if (!content) {
            console.error('❌ Tabletalk: Sem conteúdo');
            return null;
        }

        console.log(`✅ Tabletalk: "${title}" (${content.length} chars)`);

        return {
            title,
            content,
            link: firstLink,
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

// =====================================================
// FUNÇÃO: Buscar Ministério Fiel (artigo completo)
// =====================================================
async function buscarMinisterioFiel(): Promise<DevocionalItem | null> {
    try {
        // Primeiro, buscar a página de artigos para pegar o mais recente
        const listUrl = 'https://ministeriofiel.com.br/artigos/';
        console.log(`📚 Buscando Ministério Fiel: ${listUrl}`);

        const listResp = await fetch(listUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DevocionalBot/1.0)' }
        });

        if (!listResp.ok) {
            console.error(`❌ Ministério Fiel lista falhou: ${listResp.status}`);
            return null;
        }

        const listHtml = await listResp.text();

        // Procurar o primeiro link de artigo
        const linkMatch = listHtml.match(/href="(https:\/\/ministeriofiel\.com\.br\/artigos\/[^"]+)"/i);

        if (!linkMatch) {
            console.error('❌ Ministério Fiel: Nenhum artigo encontrado');
            return null;
        }

        const artigoUrl = linkMatch[1];
        console.log(`📚 Ministério Fiel artigo: ${artigoUrl}`);

        // Buscar o artigo completo
        const resp = await fetch(artigoUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DevocionalBot/1.0)' }
        });

        if (!resp.ok) return null;

        const html = await resp.text();

        // Extrair título
        const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i) ||
            html.match(/<title>([^<-]+)/i);
        const title = titleMatch ? titleMatch[1].replace(' - Ministério Fiel', '').trim() : 'Artigo Ministério Fiel';

        // Extrair autor
        const authorMatch = html.match(/class="[^"]*author[^"]*"[^>]*>([^<]+)</i) ||
            html.match(/<a[^>]*href="[^"]*autor[^"]*"[^>]*>([^<]+)</i);
        const author = authorMatch ? authorMatch[1].trim() : 'Ministério Fiel';

        // Extrair conteúdo do og:description ou do resumo
        const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/i) ||
            html.match(/<meta name="description" content="([^"]+)"/i);
        let content = descMatch ? descMatch[1] : '';

        // Tentar pegar mais conteúdo da página
        const contentMatch = html.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
            html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);

        if (contentMatch && contentMatch[1]) {
            const extracted = contentMatch[1]
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/p>/gi, '\n\n')
                .replace(/<[^>]+>/g, '')
                .replace(/&nbsp;/g, ' ')
                .replace(/\n{3,}/g, '\n\n')
                .trim();

            if (extracted.length > content.length) {
                content = extracted;
            }
        }

        // Limitar
        if (content.length > 1200) {
            const cortado = content.substring(0, 1200);
            const ultimoPonto = cortado.lastIndexOf('.');
            content = ultimoPonto > 800 ? cortado.substring(0, ultimoPonto + 1) : cortado + '...';
        }

        if (!content || content.length < 100) {
            console.error('❌ Ministério Fiel: Conteúdo insuficiente');
            return null;
        }

        console.log(`✅ Ministério Fiel: "${title}" por ${author} (${content.length} chars)`);

        return {
            title,
            content,
            link: artigoUrl,
            author,
            pubDate: new Date().toISOString(),
            source: 'Ministério Fiel',
            lang: 'pt'
        };
    } catch (e) {
        console.error('Erro Ministério Fiel:', e);
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

        let allPosts: DevocionalItem[] = [];

        // 1. Buscar em paralelo todas as fontes via scraping
        const [paoDiario, tabletalk, ministerioFiel] = await Promise.all([
            buscarPaoDiario(),
            buscarTabletalk(),
            buscarMinisterioFiel()
        ]);

        if (paoDiario) allPosts.push(paoDiario);
        if (tabletalk) allPosts.push(tabletalk);
        if (ministerioFiel) allPosts.push(ministerioFiel);

        console.log(`📚 Total de devocionais: ${allPosts.length}`);

        // 2. Tradução apenas para itens em inglês (Gemini)
        let translations: any[] = [];
        const postsEmIngles = allPosts.filter(p => p.lang === 'en');

        if (GEMINI_KEY && postsEmIngles.length > 0) {
            try {
                const postsToTranslate = JSON.stringify(postsEmIngles.map((p, i) => ({
                    id: allPosts.indexOf(p),
                    title: p.title,
                    text: p.content
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

        // 3. Mapear para Formato do Frontend
        const finalPosts = allPosts.map((post, index) => {
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
