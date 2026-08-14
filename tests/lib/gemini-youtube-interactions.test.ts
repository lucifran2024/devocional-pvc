import { describe, expect, it } from 'vitest';
import {
    criarInteracaoYoutube,
    extrairTextoInteracao,
    GEMINI_INTERACTIONS_URL,
    GEMINI_YOUTUBE_MODEL,
} from '../../src/lib/gemini-youtube-interactions';

describe('Gemini Interactions para YouTube', () => {
    it('usa a API atual e envia vídeo antes do prompt sem armazenar a interação', () => {
        const body = criarInteracaoYoutube('https://www.youtube.com/watch?v=12345678901', 'Transcreva');

        expect(GEMINI_INTERACTIONS_URL).toBe('https://generativelanguage.googleapis.com/v1beta/interactions');
        expect(GEMINI_YOUTUBE_MODEL).toBe('gemini-3.6-flash');
        expect(body.input).toEqual([
            { type: 'video', uri: 'https://www.youtube.com/watch?v=12345678901' },
            { type: 'text', text: 'Transcreva' },
        ]);
        expect(body.store).toBe(false);
        expect(body.generation_config.max_output_tokens).toBe(65536);
    });

    it('extrai apenas o texto final dos passos model_output', () => {
        const texto = extrairTextoInteracao({
            steps: [
                { type: 'thought', content: [{ type: 'text', text: 'raciocínio interno' }] },
                { type: 'model_output', content: [{ type: 'text', text: 'Primeira parte. ' }] },
                { type: 'model_output', content: [{ type: 'text', text: 'Segunda parte.' }] },
            ],
        });

        expect(texto).toBe('Primeira parte. Segunda parte.');
    });
});
