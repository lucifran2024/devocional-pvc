import { describe, expect, it } from 'vitest';
import {
    buildDnaGeracaoRecords,
    processGeneratedContent,
    sanitizeGeneratedText,
    splitGeneratedMessages,
    splitTelegramText,
    stripMarkdownForTelegram,
    validateGeneratedMessage,
} from '@/lib/dna-processing';

describe('dna-processing', () => {
    it('sanitizes leaked instructions, thinking blocks, and category tags', () => {
        const raw = `
Okay, vamos gerar as 5 novas mensagens seguindo rigorosamente as instruções.
<thinking>
planejamento interno
</thinking>

**[ORACAO]** Segunda nas mãos de Deus

Pai, entrego esta Segunda a Ti. Amém.
        `;

        const sanitized = sanitizeGeneratedText(raw);
        expect(sanitized).not.toContain('Okay, vamos gerar');
        expect(sanitized).not.toContain('<thinking>');
        expect(sanitized).not.toContain('[ORACAO]');
        expect(sanitized).toContain('Segunda nas mãos de Deus');
    });

    it('splits generated messages and ignores instructional fragments', () => {
        const raw = `
Okay, vamos gerar as mensagens.

**Terça da confiança**

Hoje é Terça. Deus continua firme com você.

---

**Quarta da paz**

Hoje é Quarta. Respire. Deus sustenta.
        `;

        const messages = splitGeneratedMessages(raw);
        expect(messages).toHaveLength(2);
        expect(messages[0]).toContain('Terça da confiança');
        expect(messages[1]).toContain('Quarta da paz');
    });

    it('validates category voice, day filter, and rejects invalid fragments', () => {
        const validPrayer = `Segunda nas mãos de Deus\n\nPai, entrego esta Segunda a Ti. Amém.`;
        const invalidPrayer = `Reflexão solta\n\nTalvez tudo melhore com o tempo.`;

        expect(
            validateGeneratedMessage(validPrayer, {
                modoId: 'modo_estilo',
                filtros: { estilo: 'oracao', diasSemana: 'Segunda' },
            })
        ).toEqual([]);

        const reasons = validateGeneratedMessage(invalidPrayer, {
            modoId: 'modo_estilo',
            filtros: { estilo: 'oracao', diasSemana: 'Segunda' },
        });

        expect(reasons).toContain('category_oracao_voice');
        expect(reasons).toContain('missing_allowed_day');
    });

    it('processes a batch and keeps only validated messages', () => {
        const raw = `
**Segunda da esperança**

Pai, entrego esta Segunda a Ti. Guarda meu coração. Amém.

---

**Mensagem vazada**

Okay, vamos gerar as novas mensagens seguindo rigorosamente as instruções.
        `;

        const processed = processGeneratedContent(raw, {
            modoId: 'modo_estilo',
            filtros: { estilo: 'oracao', diasSemana: 'Segunda', quantidade: 2 },
            quantidadeEsperada: 2,
        });

        expect(processed.messages).toHaveLength(1);
        expect(processed.messages[0]).toContain('Segunda da esperança');
        expect(processed.rejected).toHaveLength(1);
        expect(processed.rejected[0].reasons).toContain('missing_allowed_day');
    });

    it('builds dna_geracoes records with extracted metadata', () => {
        const { batchId, records } = buildDnaGeracaoRecords(
            [
                `**A força da graça**\n\nJoão 14:27\n\nA paz de Cristo sustenta hoje.\n\nDescanse.`,
            ],
            {
                categoria: 'versiculo',
                filtros: { estilo: 'versiculo', diasSemana: 'Quinta' },
                buildStyle: 'estilo',
            }
        );

        expect(batchId).toBeTruthy();
        expect(records).toHaveLength(1);
        expect(records[0].categoria).toBe('versiculo');
        expect(records[0].titulo).toContain('A força da graça');
        expect(records[0].versiculos_usados).toContain('João 14:27');
        expect(records[0].abertura_tipo).toBeTruthy();
        expect(records[0].fechamento_tipo).toBeTruthy();
        expect(records[0].build_style).toBe('estilo');
    });

    it('formats and splits long telegram text without markdown bleed', () => {
        const longParagraph = '**Título**\n\n' + 'Palavra '.repeat(900);
        const chunks = splitTelegramText(longParagraph, 400);

        expect(chunks.length).toBeGreaterThan(1);
        expect(chunks.every((chunk) => chunk.length <= 400)).toBe(true);
        expect(stripMarkdownForTelegram(longParagraph)).not.toContain('**');
    });
    it('extracts fallback metadata from text when no structured history is provided', () => {
        const { records } = buildDnaGeracaoRecords(
            [
                '**Porta aberta na terca**\n\nJoao 14:27\n\nNesta terca a Palavra abre a porta certa e firma o caminho.\n\nSiga em paz.',
            ],
            {
                categoria: 'versiculo',
                buildStyle: 'estilo',
            }
        );

        expect(records[0].tema_principal).toContain('Porta aberta na terca');
        expect(records[0].titulo).toContain('Porta aberta na terca');
        expect(records[0].imagem_central).toBe('caminho');
        expect(records[0].versiculos_usados).toContain('Joao 14:27');
    });

    it('validates neutral mode and verse requirement together', () => {
        const reasons = validateGeneratedMessage(
            'Bom dia\n\nTerca sem base\n\nNesta terca siga em frente com coragem.',
            {
                modoId: 'modo_estilo',
                filtros: { estilo: 'versiculo', neutro: true, diasSemana: 'Terca' },
            }
        );

        expect(reasons).toContain('neutral_mode_greeting');
        expect(reasons).toContain('category_versiculo_reference');
    });
});
