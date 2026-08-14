import { describe, expect, it } from 'vitest';
import { formatarSegmentosLegenda, parsearDocumentoLegenda } from '../../src/lib/youtube-captions';

describe('legendas do YouTube', () => {
    it('remove espaços extras, ignora segmentos vazios e preserva a ordem', () => {
        const texto = formatarSegmentosLegenda([
            { text: '  Primeira   frase. ', duration: 1, offset: 0, lang: 'pt' },
            { text: '', duration: 1, offset: 1, lang: 'pt' },
            { text: 'Segunda frase.', duration: 1, offset: 2, lang: 'pt' },
        ]);

        expect(texto).toBe('Primeira frase. Segunda frase.');
    });

    it('remove metadados e timestamps do documento público', () => {
        const resultado = parsearDocumentoLegenda(`# Transcript: Pregação teste

Source video: https://youtube.com/watch?v=12345678901
Language: pt-BR · Duration: 1:00 · Words: 10

[0:00] Primeira parte.

[0:15] Segunda parte.`);

        expect(resultado).toEqual({
            titulo: 'Pregação teste',
            idioma: 'pt-BR',
            texto: 'Primeira parte.\n\nSegunda parte.',
        });
    });
});
