// Edge Function: transcrever-youtube
// Recebe { url } de um vídeo do YouTube e devolve a transcrição da fala,
// usando o Gemini (que processa a URL do vídeo público diretamente).
// Roda no Supabase porque a GEMINI_API_KEY já está nos secrets daqui.

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODEL = 'gemini-3.6-flash';
const INTERACTIONS_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';

function criarInteracaoYoutube(url: string, prompt: string) {
    return {
        model: MODEL,
        input: [
            { type: 'video', uri: url },
            { type: 'text', text: prompt },
        ],
        store: false,
        generation_config: {
            temperature: 0.2,
            max_output_tokens: 65536,
        },
    };
}

function extrairTextoInteracao(data: {
    steps?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
}): string {
    return (data.steps || [])
        .filter((step) => step.type === 'model_output')
        .flatMap((step) => step.content || [])
        .filter((content) => content.type === 'text')
        .map((content) => content.text || '')
        .join('')
        .trim();
}

function normalizarUrl(url: string): string | null {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/);
    if (m) return `https://www.youtube.com/watch?v=${m[1]}`;
    if (/^[\w-]{11}$/.test(url.trim())) return `https://www.youtube.com/watch?v=${url.trim()}`;
    return null;
}

const PROMPT = `Transcreva integralmente, em português, tudo o que é falado neste vídeo (pregação/mensagem).
Regras:
- Retorne APENAS o texto falado, na ordem em que ocorre.
- Organize em parágrafos naturais para facilitar a leitura.
- Não resuma, não comente, não descreva a cena — apenas transcreva a fala.
- Se houver versículos citados, mantenha-os no texto.`;

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    const json = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status,
        });

    const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GEMINI_KEY');
    if (!GEMINI_KEY) return json({ ok: false, error: 'sem_chave_gemini' }, 503);

    let urlBruta = '';
    try {
        const body = await req.json();
        urlBruta = String(body?.url || '').trim();
    } catch {
        return json({ ok: false, error: 'json_invalido' }, 400);
    }

    const url = normalizarUrl(urlBruta);
    if (!url) return json({ ok: false, error: 'link_invalido', message: 'Link do YouTube inválido.' }, 400);

    try {
        const resp = await fetch(
            INTERACTIONS_URL,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': GEMINI_KEY,
                },
                body: JSON.stringify(criarInteracaoYoutube(url, PROMPT)),
            }
        );

        if (!resp.ok) {
            const errText = await resp.text().catch(() => '');
            console.error(`Gemini ${resp.status}: ${errText.slice(0, 300)}`);
            return json({
                ok: false,
                error: 'falha_gemini',
                status: resp.status,
                message: resp.status === 400
                    ? 'Não consegui acessar este vídeo (pode ser privado, restrito ou muito longo).'
                    : 'Falha ao transcrever. Tente novamente.',
            }, 502);
        }

        const data = await resp.json();
        const texto = extrairTextoInteracao(data);

        if (!texto) return json({ ok: false, error: 'sem_texto', message: 'Não consegui extrair a fala deste vídeo.' }, 422);

        let titulo = 'Vídeo do YouTube';
        try {
            const oe = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
            if (oe.ok) {
                const oeData = await oe.json();
                if (oeData.title) titulo = String(oeData.title);
            }
        } catch { /* título opcional */ }

        return json({ ok: true, titulo, texto, idioma: 'transcrição (Gemini)' });
    } catch (e) {
        console.error('Erro transcrever-youtube:', e);
        return json({ ok: false, error: 'falha', message: e instanceof Error ? e.message : String(e) }, 500);
    }
});
