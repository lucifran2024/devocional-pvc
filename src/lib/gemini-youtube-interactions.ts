export const GEMINI_YOUTUBE_MODEL = 'gemini-3.6-flash';
export const GEMINI_INTERACTIONS_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';

export type GeminiInteraction = {
    steps?: Array<{
        type?: string;
        content?: Array<{ type?: string; text?: string }>;
    }>;
};

export function criarInteracaoYoutube(url: string, prompt: string) {
    return {
        model: GEMINI_YOUTUBE_MODEL,
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

export function extrairTextoInteracao(data: GeminiInteraction): string {
    return (data.steps || [])
        .filter((step) => step.type === 'model_output')
        .flatMap((step) => step.content || [])
        .filter((content) => content.type === 'text')
        .map((content) => content.text || '')
        .join('')
        .trim();
}
