
// =====================================================
// AUDIO TOOLS - Ferramentas para Transcrição e YouTube
// =====================================================

// Função auxiliar para transcrever áudio com Gemini 1.5 Flash
export async function transcreverAudioGemini(audioUrl: string): Promise<{ texto: string; resumo: string }> {
    const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GEMINI_KEY");
    if (!GEMINI_KEY) throw new Error("GEMINI_API_KEY não configurada.");

    console.log(`🎙️ [AUDIO] Baixando áudio: ${audioUrl}`);

    try {
        // 1. Baixar o áudio
        const audioResp = await fetch(audioUrl);
        if (!audioResp.ok) throw new Error(`Falha ao baixar áudio: ${audioResp.statusText}`);

        const audioBlob = await audioResp.blob();
        const arrayBuffer = await audioBlob.arrayBuffer();
        // Converter para Base64 (Gemini REST API requer inline data ou upload prévio via File API)
        // Para arquivos pequenos (< 20MB) inline funciona. Para maiores, precisaria da File API.
        // Assumindo gravações curtas/médias por enquanto.
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

        console.log(`🎙️ [AUDIO] Áudio baixado. Tamanho: ${arrayBuffer.byteLength} bytes. Enviando para Gemini...`);

        // 2. Enviar para Gemini 1.5 Flash
        const MODEL_NAME = "gemini-1.5-flash";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_KEY}`;

        const body = {
            contents: [{
                parts: [
                    { text: "Você é um transcritor expert de sermões e pregações. \n1. Transcreva o áudio a seguir fielmente, ignorando gaguejos ou repetições irrelevantes.\n2. No final, crie um RESUMO estruturado com os principais pontos (bullet points) e a ideia central.\n\nFormato de saída:\nTRANSCRICAO:\n[Texto completo aqui]\n\nRESUMO:\n[Resumo aqui]" },
                    {
                        inline_data: {
                            mime_type: audioResp.headers.get("content-type") || "audio/mp3",
                            data: base64Audio
                        }
                    }
                ]
            }]
        };

        const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (!resp.ok) {
            const errText = await resp.text();
            throw new Error(`Erro Gemini API: ${resp.status} - ${errText}`);
        }

        const data = await resp.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

        // 3. Processar saída (separar transcrição e resumo)
        const parts = rawText.split("RESUMO:");
        let texto = parts[0].replace("TRANSCRICAO:", "").trim();
        let resumo = parts.length > 1 ? parts[1].trim() : "Resumo não gerado automaticamente.";

        return { texto, resumo };

    } catch (e) {
        console.error("❌ [AUDIO] Erro na transcrição:", e);
        throw e;
    }
}

// Função para obter transcrição do YouTube via Apify (streamers/youtube-scraper)
export async function transcreverYoutubeApify(youtubeUrl: string): Promise<{ texto: string; resumo: string; titulo: string }> {
    console.log(`📺 [YOUTUBE] Processando URL: ${youtubeUrl}`);

    const APIFY_TOKEN = Deno.env.get("APIFY_API_TOKEN");
    if (!APIFY_TOKEN) throw new Error("APIFY_API_TOKEN não configurada.");

    // Actor: streamers/youtube-scraper
    const ACTOR_ID = "streamers~youtube-scraper";
    const url = `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;

    const input = {
        "startUrls": [{ "url": youtubeUrl }],
        "maxResults": 1,
        "downloadSubtitles": true,
        "saveSubsToKvs": false
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input)
        });

        if (!response.ok) throw new Error(`Erro Apify: ${response.status}`);

        const data = await response.json();
        if (!data || data.length === 0) throw new Error("Nenhum dado encontrado para este vídeo.");

        const videoData = data[0];
        const titulo = videoData.title || "Sem título";

        // Verificar legendas
        let textoCompleto = "";

        if (videoData.subtitles && videoData.subtitles.length > 0) {
            // Preferir pt-BR ou pt, depois auto-generated
            const subtitle = videoData.subtitles.find((s: any) => s.languageCode === 'pt-BR' || s.languageCode === 'pt')
                || videoData.subtitles[0]; // Fallback

            if (subtitle && subtitle.url) {
                console.log(`📜 [YOUTUBE] Baixando legendas de: ${subtitle.url}`);
                const subResp = await fetch(subtitle.url);
                if (subResp.ok) {
                    const srtText = await subResp.text();
                    // Limpar SRT/VTT (remover timestamps)
                    textoCompleto = srtText.replace(/^\d+$/gm, '') // Remove índices
                        .replace(/\d{2}:\d{2}:\d{2}[,.]\d{3} --> \d{2}:\d{2}:\d{2}[,.]\d{3}/g, '') // Remove times
                        .replace(/<[^>]*>/g, '') // Remove tags HTML
                        .split('\n')
                        .map(l => l.trim())
                        .filter(l => l)
                        .join(' ');
                }
            }
        }

        if (!textoCompleto) {
            // Fallback: description
            textoCompleto = `(Legendas não disponíveis). Descrição do vídeo: ${videoData.description || ""}`;
            console.warn("⚠️ [YOUTUBE] Sem legendas disponíveis. Usando descrição.");
        }

        // 2. Gerar Resumo com Gemini
        const resumo = await gerarResumoTexto(textoCompleto);

        return {
            texto: textoCompleto.substring(0, 50000), // Limite de chars para segurança
            resumo,
            titulo
        };

    } catch (e) {
        console.error("❌ [YOUTUBE] Erro:", e);
        throw e;
    }
}

async function gerarResumoTexto(texto: string): Promise<string> {
    const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GEMINI_KEY");
    if (!GEMINI_KEY) return "Sem resumo (chave ausente).";

    const MODEL_NAME = "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_KEY}`;

    const body = {
        contents: [{
            parts: [{ text: `Resuma o seguinte conteúdo de um vídeo/sermão em tópicos principais e uma conclusão:\n\n${texto.substring(0, 30000)}` }]
        }]
    };

    try {
        const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        const data = await resp.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "Resumo indisponível.";
    } catch (e) {
        return "Erro ao gerar resumo.";
    }
}
