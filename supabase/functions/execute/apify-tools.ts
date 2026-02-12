// =====================================================
// APIFY TOOLS - Ferramentas para Scraping via Apify
// Revisão: Robustez, fallback para cache, timeout,
// mapeamento correto dos campos do scraper
// =====================================================

export const APIFY_TOOLS_DEFINITION = [{
    function_declarations: [{
        name: "consultar_instagram",
        description: "Consulta os últimos posts de um perfil do Instagram via Apify.",
        parameters: {
            type: "object",
            properties: {
                username: {
                    type: "string",
                    description: "Nome do usuário do Instagram (sem @)",
                }
            },
            required: ["username"]
        }
    }]
}];

// Formato padronizado de post para frontend/banco
export interface InstagramPostData {
    external_id: string;
    source: 'instagram';
    content: string;
    image_url: string;
    post_url: string;
    author_name: string;
    published_at: string;
}

// =====================================================
// NORMALIZAÇÃO DE TIMESTAMP
// O Apify retorna timestamps em diversos formatos
// dependendo do actor e versão. Normalizar para ISO.
// =====================================================
function normalizeTimestamp(raw: any): string {
    if (!raw) return new Date().toISOString();

    // Já é ISO string válida
    if (typeof raw === 'string') {
        const parsed = new Date(raw);
        if (!isNaN(parsed.getTime())) return parsed.toISOString();
    }

    // Unix timestamp em segundos (10 dígitos)
    if (typeof raw === 'number' && raw < 1e12) {
        return new Date(raw * 1000).toISOString();
    }

    // Unix timestamp em milissegundos (13 dígitos)
    if (typeof raw === 'number') {
        return new Date(raw).toISOString();
    }

    return new Date().toISOString();
}

// =====================================================
// MAPEAMENTO DE POST (MULTI-ACTOR COMPATÍVEL)
// Suporta campos de diferentes actors do Apify:
// - apify/instagram-scraper
// - apify/instagram-post-scraper
// - apify/instagram-profile-scraper
// - shu8hvrXbJbY3Eb9W (community scraper)
// =====================================================
function mapPostToStandard(post: any, username: string): InstagramPostData | null {
    // Extrair caption - tenta múltiplos campos possíveis
    const caption = post.caption
        || post.text
        || post.description
        || post.alt
        || post.accessibility_caption
        || "";

    // Pular posts sem conteúdo textual (carrosséis sem legenda, reels sem texto)
    if (!caption || caption.trim().length < 10) {
        console.log(`⏭️ [APIFY] Post ignorado (sem legenda suficiente): ${post.shortCode || post.id || 'unknown'}`);
        return null;
    }

    // Extrair imagem - tenta múltiplos campos
    const imageUrl = post.displayUrl
        || post.imageUrl
        || post.thumbnailUrl
        || post.previewUrl
        || post.display_url
        || post.thumbnail_src
        || (post.images && post.images[0]?.url)
        || (post.carousel_media && post.carousel_media[0]?.image_versions2?.candidates?.[0]?.url)
        || "";

    // Extrair URL do post
    const shortCode = post.shortCode || post.shortcode || post.code || "";
    const postUrl = post.url
        || post.postUrl
        || post.permalink
        || (shortCode ? `https://www.instagram.com/p/${shortCode}/` : `https://www.instagram.com/${username}/`);

    // ID externo único
    const externalId = post.id
        || post.pk
        || shortCode
        || post.postId
        || `inst_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Timestamp
    const publishedAt = normalizeTimestamp(
        post.timestamp || post.taken_at || post.takenAtTimestamp || post.date || post.created_time
    );

    // Nome do autor (pode vir no post se for de outro perfil)
    const authorName = post.ownerUsername
        || post.owner?.username
        || post.user?.username
        || username;

    return {
        external_id: String(externalId),
        source: 'instagram',
        content: caption.trim(),
        image_url: imageUrl,
        post_url: postUrl,
        author_name: authorName,
        published_at: publishedAt
    };
}

// =====================================================
// CONSULTA PRINCIPAL - Com timeout, retry e logs
// =====================================================
export async function consultarInstagram(username: string): Promise<InstagramPostData[]> {
    console.log(`📸 [APIFY] Consultando Instagram: @${username}`);

    const APIFY_TOKEN = Deno.env.get("APIFY_API_TOKEN");
    if (!APIFY_TOKEN) {
        console.error("❌ [APIFY] Token não configurado (APIFY_API_TOKEN).");
        return [];
    }

    // Actor principal - o mais estável e atualizado
    // Fallback: tentar actor community se o principal falhar
    const ACTORS = [
        {
            id: "apify/instagram-scraper",
            input: {
                usernames: [username],
                resultsLimit: 9,
                resultsType: "posts",
                addParentData: false
            }
        },
        {
            id: "apify/instagram-post-scraper",
            input: {
                directUrls: [`https://www.instagram.com/${username}/`],
                resultsLimit: 9,
                resultsType: "posts"
            }
        }
    ];

    for (const actor of ACTORS) {
        console.log(`🔄 [APIFY] Tentando actor: ${actor.id}`);

        const url = `https://api.apify.com/v2/acts/${actor.id}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=60`;

        try {
            // Timeout de 90s no fetch (o Apify tem timeout próprio de 60s)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 90_000);

            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(actor.input),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errText = await response.text().catch(() => 'Erro desconhecido');
                console.error(`❌ [APIFY] Actor ${actor.id} falhou (${response.status}): ${errText.substring(0, 200)}`);

                // Se for 402 (sem créditos) ou 429 (rate limit), nem tenta o próximo
                if (response.status === 402 || response.status === 429) {
                    console.error(`🚫 [APIFY] Erro ${response.status} - Abortando (sem créditos ou rate limit).`);
                    return [];
                }

                continue; // Tenta próximo actor
            }

            const data = await response.json();

            if (!Array.isArray(data) || data.length === 0) {
                console.warn(`⚠️ [APIFY] Actor ${actor.id} retornou vazio para @${username}`);
                continue;
            }

            console.log(`📦 [APIFY] Actor ${actor.id} retornou ${data.length} itens brutos`);

            // Mapear e filtrar posts válidos
            const posts: InstagramPostData[] = data
                .map((post: any) => mapPostToStandard(post, username))
                .filter((p: InstagramPostData | null): p is InstagramPostData => p !== null);

            if (posts.length === 0) {
                console.warn(`⚠️ [APIFY] Nenhum post válido após mapeamento (actor: ${actor.id})`);
                continue;
            }

            // Ordenar por data (mais recentes primeiro)
            posts.sort((a, b) =>
                new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
            );

            console.log(`✅ [APIFY] ${posts.length} posts válidos de @${username} via ${actor.id}`);

            // Log resumo dos posts
            posts.slice(0, 3).forEach((p, i) => {
                console.log(`   📝 Post ${i + 1}: ${p.content.substring(0, 60)}... | img: ${p.image_url ? 'sim' : 'NÃO'} | ${p.published_at.split('T')[0]}`);
            });

            return posts;

        } catch (e: any) {
            if (e.name === 'AbortError') {
                console.error(`⏱️ [APIFY] Timeout ao consultar actor ${actor.id}`);
            } else {
                console.error(`❌ [APIFY] Exception no actor ${actor.id}:`, e.message || e);
            }
            continue; // Tenta próximo actor
        }
    }

    // Se todos os actors falharam
    console.error(`🚫 [APIFY] Todos os actors falharam para @${username}`);
    return [];
}

// =====================================================
// CONSULTA COM FALLBACK PARA CACHE (BANCO DE DADOS)
// Tenta Apify primeiro, se falhar busca posts salvos
// =====================================================
export async function consultarInstagramComCache(
    username: string,
    supabaseClient: any
): Promise<{ posts: InstagramPostData[]; fromCache: boolean }> {

    // 1. Tentar buscar via Apify (dados frescos)
    const postsApify = await consultarInstagram(username);

    if (postsApify.length > 0) {
        return { posts: postsApify, fromCache: false };
    }

    // 2. Fallback: Buscar do cache (banco de dados)
    console.log(`💾 [CACHE] Apify falhou. Buscando posts salvos do banco para @${username}...`);

    try {
        const { data: cachedPosts, error } = await supabaseClient
            .from('devocional_externo_posts')
            .select('*')
            .eq('source', 'instagram')
            .eq('author_name', username)
            .order('published_at', { ascending: false })
            .limit(9);

        if (error) {
            console.error('❌ [CACHE] Erro ao buscar cache:', error.message);
            return { posts: [], fromCache: false };
        }

        if (cachedPosts && cachedPosts.length > 0) {
            console.log(`✅ [CACHE] ${cachedPosts.length} posts encontrados no cache para @${username}`);

            // Mapear do formato do banco para o formato do frontend
            const posts: InstagramPostData[] = cachedPosts.map((row: any) => ({
                external_id: row.external_id,
                source: 'instagram' as const,
                content: row.content || '',
                image_url: row.image_url || '',
                post_url: row.post_url || '',
                author_name: row.author_name || username,
                published_at: row.published_at || row.created_at
            }));

            return { posts, fromCache: true };
        }

        console.warn(`⚠️ [CACHE] Nenhum post em cache para @${username}`);
        return { posts: [], fromCache: false };

    } catch (e: any) {
        console.error('❌ [CACHE] Exception:', e.message || e);
        return { posts: [], fromCache: false };
    }
}
