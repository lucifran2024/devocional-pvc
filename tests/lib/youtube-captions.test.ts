import { describe, expect, it } from 'vitest';
import { formatarSegmentosLegenda } from '../../src/lib/youtube-captions';

describe('legendas do YouTube', () => {
    it('remove espaços extras, ignora segmentos vazios e preserva a ordem', () => {
        const texto = formatarSegmentosLegenda([
            { text: '  Primeira   frase. ', duration: 1, offset: 0, lang: 'pt' },
            { text: '', duration: 1, offset: 1, lang: 'pt' },
            { text: 'Segunda frase.', duration: 1, offset: 2, lang: 'pt' },
        ]);

        expect(texto).toBe('Primeira frase. Segunda frase.');
    });
});
