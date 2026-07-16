// Edge Function: resolve um Reel/TikTok público, envia o vídeo temporariamente
// ao Gemini Files API e devolve somente a transcrição integral da fala.

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODEL = 'gemini-2.5-flash';
const MAX_VIDEO_BYTES = 90 * 1024 * 1024;
const APIFY_BASE = 'https://api.apify.com/v2';
const APIFY_ACTOR = 'apify~instagram-scraper';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/137 Safari/537.36';

type Plataforma = 'instagram' | 'tiktok';

interface MidiaResolvida {
    plataforma: Plataforma;
    urlOriginal: string;
    urlMidia: string;
    titulo: string;
}

interface GeminiFile {
    name: string;
    uri: string;
    mimeType?: string;
    state?: string;
}

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function hostPertenceA(host: string, dominio: string): boolean {
    return host === dominio || host.endsWith(`.${dominio}`);
}

function normalizarLink(urlBruta: string): { url: string; plataforma: Plataforma } | null {
    try {
        const url = new URL(urlBruta.trim());
        const host = url.hostname.toLowerCase();

        if (hostPertenceA(host, 'instagram.com') && /^\/(reel|reels)\//i.test(url.pathname)) {
            return { url: url.toString(), plataforma: 'instagram' };
        }
        if (hostPertenceA(host, 'tiktok.com')) {
            return { url: url.toString(), plataforma: 'tiktok' };
        }
    } catch { /* link inválido */ }
    return null;
}

function urlAbsoluta(url: string, base: string): string {
    try { return new URL(url, base).toString(); } catch { return url; }
}

async function resolverTikTok(urlOriginal: string): Promise<MidiaResolvida> {
    let urlCompleta = urlOriginal;
    const host = new URL(urlOriginal).hostname.toLowerCase();
    if (host === 'vt.tiktok.com' || host === 'vm.tiktok.com') {
        const resolvida = await fetch(urlOriginal, {
            headers: { 'User-Agent': USER_AGENT },
            redirect: 'follow',
            signal: AbortSignal.timeout(20_000),
        });
        urlCompleta = resolvida.url || urlOriginal;
    }

    const apiUrl = new URL('https://www.tikwm.com/api/');
    apiUrl.searchParams.set('url', urlCompleta);
    apiUrl.searchParams.set('hd', '1');
    const resp = await fetch(apiUrl, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(25_000),
    });
    if (!resp.ok) throw new Error(`tiktok_api_${resp.status}`);

    const payload = await resp.json();
    if (payload?.code !== 0 || !payload?.data) throw new Error('tiktok_indisponivel');

    const info = payload.data;
    const video = info.hdplay || info.play || info.wmplay;
    if (!video) throw new Error('tiktok_sem_video');
    const autor = info.author?.unique_id ? `@${info.author.unique_id}` : 'TikTok';
    const descricao = String(info.title || '').trim();

    return {
        plataforma: 'tiktok',
        urlOriginal: urlCompleta,
        urlMidia: urlAbsoluta(String(video), 'https://www.tikwm.com'),
        titulo: descricao ? `${autor} — ${descricao.slice(0, 100)}` : `Vídeo do ${autor}`,
    };
}

async function itensDataset(datasetId: string, token: string): Promise<Record<string, unknown>[]> {
    const resp = await fetch(`${APIFY_BASE}/datasets/${datasetId}/items?token=${encodeURIComponent(token)}&clean=true`, {
        signal: AbortSignal.timeout(20_000),
    });
    if (!resp.ok) throw new Error(`apify_dataset_${resp.status}`);
    const itens = await resp.json();
    return Array.isArray(itens) ? itens : [];
}

async function resolverInstagram(urlOriginal: string): Promise<MidiaResolvida> {
    const token = Deno.env.get('APIFY_API_TOKEN');
    if (!token) throw new Error('instagram_nao_configurado');

    const iniciar = await fetch(`${APIFY_BASE}/acts/${APIFY_ACTOR}/runs?token=${encodeURIComponent(token)}&timeout=180`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            directUrls: [urlOriginal],
            resultsLimit: 1,
            resultsType: 'posts',
            addParentData: false,
        }),
        signal: AbortSignal.timeout(20_000),
    });
    if (!iniciar.ok) throw new Error(`apify_inicio_${iniciar.status}`);

    const run = (await iniciar.json())?.data;
    const runId = String(run?.id || '');
    let datasetId = String(run?.defaultDatasetId || '');
    if (!runId) throw new Error('apify_sem_run');

    const deadline = Date.now() + 135_000;
    while (Date.now() < deadline) {
        await esperar(4_000);
        const statusResp = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${encodeURIComponent(token)}`, {
            signal: AbortSignal.timeout(15_000),
        });
        if (!statusResp.ok) continue;
        const statusData = (await statusResp.json())?.data;
        const status = String(statusData?.status || '');
        datasetId = String(statusData?.defaultDatasetId || datasetId);
        if (status === 'SUCCEEDED') break;
        if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) throw new Error(`apify_${status.toLowerCase()}`);
    }

    if (!datasetId) throw new Error('apify_sem_dataset');
    const itens = await itensDataset(datasetId, token);
    const post = itens.find((item) => typeof item.videoUrl === 'string') || itens[0];
    const videoUrl = String(post?.videoUrl || '');
    if (!videoUrl) throw new Error('instagram_sem_video');

    const autor = String(post?.ownerUsername || post?.ownerFullName || 'Instagram');
    const legenda = String(post?.caption || '').trim();
    return {
        plataforma: 'instagram',
        urlOriginal,
        urlMidia: videoUrl,
        titulo: legenda ? `@${autor} — ${legenda.slice(0, 100)}` : `Reel de @${autor}`,
    };
}

async function baixarVideo(midia: MidiaResolvida): Promise<{ bytes: ArrayBuffer; mimeType: string }> {
    const resp = await fetch(midia.urlMidia, {
        headers: {
            'User-Agent': USER_AGENT,
            Referer: midia.plataforma === 'instagram' ? 'https://www.instagram.com/' : 'https://www.tiktok.com/',
        },
        signal: AbortSignal.timeout(90_000),
    });
    if (!resp.ok) throw new Error(`download_video_${resp.status}`);

    const tamanhoDeclarado = Number(resp.headers.get('content-length') || 0);
    if (tamanhoDeclarado > MAX_VIDEO_BYTES) throw new Error('video_muito_grande');

    const bytes = await resp.arrayBuffer();
    if (!bytes.byteLength) throw new Error('video_vazio');
    if (bytes.byteLength > MAX_VIDEO_BYTES) throw new Error('video_muito_grande');

    const recebido = (resp.headers.get('content-type') || '').split(';')[0].trim();
    const mimeType = recebido.startsWith('video/') ? recebido : 'video/mp4';
    return { bytes, mimeType };
}

async function subirGemini(bytes: ArrayBuffer, mimeType: string, key: string): Promise<GeminiFile> {
    const inicio = await fetch('https://generativelanguage.googleapis.com/upload/v1beta/files', {
        method: 'POST',
        headers: {
            'x-goog-api-key': key,
            'X-Goog-Upload-Protocol': 'resumable',
            'X-Goog-Upload-Command': 'start',
            'X-Goog-Upload-Header-Content-Length': String(bytes.byteLength),
            'X-Goog-Upload-Header-Content-Type': mimeType,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file: { display_name: 'video-social-para-transcricao' } }),
        signal: AbortSignal.timeout(25_000),
    });
    if (!inicio.ok) throw new Error(`gemini_upload_inicio_${inicio.status}`);
    const uploadUrl = inicio.headers.get('x-goog-upload-url');
    if (!uploadUrl) throw new Error('gemini_sem_upload_url');

    const upload = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
            'Content-Length': String(bytes.byteLength),
            'X-Goog-Upload-Offset': '0',
            'X-Goog-Upload-Command': 'upload, finalize',
        },
        body: bytes,
        signal: AbortSignal.timeout(120_000),
    });
    if (!upload.ok) throw new Error(`gemini_upload_${upload.status}`);
    const file = (await upload.json())?.file as GeminiFile | undefined;
    if (!file?.name || !file?.uri) throw new Error('gemini_arquivo_invalido');
    return file;
}

async function aguardarArquivo(file: GeminiFile, key: string): Promise<GeminiFile> {
    const deadline = Date.now() + 90_000;
    let atual = file;
    while (Date.now() < deadline) {
        if (atual.state === 'ACTIVE') return atual;
        if (atual.state === 'FAILED') throw new Error('gemini_processamento_falhou');
        await esperar(3_000);
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/${atual.name}`, {
            headers: { 'x-goog-api-key': key },
            signal: AbortSignal.timeout(15_000),
        });
        if (!resp.ok) throw new Error(`gemini_status_${resp.status}`);
        atual = await resp.json();
    }
    throw new Error('gemini_processamento_timeout');
}

async function apagarArquivoGemini(nome: string, key: string): Promise<void> {
    await fetch(`https://generativelanguage.googleapis.com/v1beta/${nome}`, {
        method: 'DELETE',
        headers: { 'x-goog-api-key': key },
        signal: AbortSignal.timeout(10_000),
    }).catch(() => undefined);
}

async function transcreverGemini(file: GeminiFile, mimeType: string, key: string): Promise<{ texto: string; completa: boolean }> {
    const prompt = `Transcreva integralmente, em português, tudo o que é falado neste vídeo.
Regras obrigatórias:
- Retorne somente a fala, na ordem em que ocorre.
- Não resuma, não explique e não descreva as imagens.
- Organize em parágrafos naturais e preserve versículos ou citações faladas.
- Se uma palavra estiver realmente inaudível, marque [inaudível] sem inventar.`;

    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                parts: [
                    { file_data: { mime_type: file.mimeType || mimeType, file_uri: file.uri } },
                    { text: prompt },
                ],
            }],
            generationConfig: {
                temperature: 0.1,
                mediaResolution: 'MEDIA_RESOLUTION_LOW',
                maxOutputTokens: 65536,
            },
        }),
        signal: AbortSignal.timeout(120_000),
    });
    if (!resp.ok) {
        const detalhe = (await resp.text().catch(() => '')).slice(0, 300);
        console.error(`Gemini transcrição ${resp.status}: ${detalhe}`);
        throw new Error(`gemini_transcricao_${resp.status}`);
    }

    const data = await resp.json();
    const candidate = data?.candidates?.[0];
    const texto = (candidate?.content?.parts || [])
        .map((part: { text?: string }) => part.text || '')
        .join('')
        .trim();
    if (!texto) throw new Error('sem_fala');
    return { texto, completa: candidate?.finishReason !== 'MAX_TOKENS' };
}

function mensagemAmigavel(codigo: string): { status: number; message: string } {
    if (codigo.includes('video_muito_grande')) return { status: 413, message: 'Este vídeo é grande demais. Tente um vídeo de até alguns minutos.' };
    if (codigo.includes('sem_fala')) return { status: 422, message: 'Não consegui identificar fala neste vídeo.' };
    if (codigo.includes('instagram_nao_configurado')) return { status: 503, message: 'A leitura do Instagram ainda não está configurada.' };
    if (codigo.includes('instagram_sem_video') || codigo.includes('tiktok_sem_video') || codigo.includes('tiktok_indisponivel')) {
        return { status: 422, message: 'Não consegui acessar o vídeo. Ele pode ser privado, removido ou exigir login.' };
    }
    return { status: 502, message: 'Não consegui transcrever este vídeo agora. Tente novamente em instantes.' };
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

    if (req.method !== 'POST') return json({ ok: false, error: 'metodo_invalido' }, 405);

    const geminiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GEMINI_KEY');
    if (!geminiKey) return json({ ok: false, error: 'sem_chave_gemini' }, 503);

    let urlBruta = '';
    try {
        const body = await req.json();
        urlBruta = String(body?.url || '').trim();
    } catch {
        return json({ ok: false, error: 'json_invalido' }, 400);
    }

    const link = normalizarLink(urlBruta);
    if (!link) return json({ ok: false, error: 'link_invalido', message: 'Link de Instagram ou TikTok inválido.' }, 400);

    let arquivo: GeminiFile | null = null;
    try {
        const midia = link.plataforma === 'instagram'
            ? await resolverInstagram(link.url)
            : await resolverTikTok(link.url);
        const video = await baixarVideo(midia);
        arquivo = await subirGemini(video.bytes, video.mimeType, geminiKey);
        arquivo = await aguardarArquivo(arquivo, geminiKey);
        const resultado = await transcreverGemini(arquivo, video.mimeType, geminiKey);

        return json({
            ok: true,
            plataforma: midia.plataforma,
            titulo: midia.titulo,
            url: midia.urlOriginal,
            texto: resultado.texto,
            completa: resultado.completa,
        });
    } catch (error) {
        const codigo = error instanceof Error ? error.message : String(error);
        console.error('Erro transcrever-social:', codigo);
        const amigavel = mensagemAmigavel(codigo);
        return json({ ok: false, error: codigo, message: amigavel.message }, amigavel.status);
    } finally {
        if (arquivo?.name) await apagarArquivoGemini(arquivo.name, geminiKey);
    }
});
