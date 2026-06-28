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
        // Não citar o dia NÃO é mais motivo de rejeição (variedade: a maioria é neutra).
        expect(reasons).not.toContain('missing_allowed_day');
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
        expect(processed.rejected[0].reasons).toContain('category_oracao_voice');
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

    it('descarta raciocínio em inglês (chain-of-thought) e mantém só o devocional em português', () => {
        const raw = `We need to produce 5 messages: 4 DEVOCIONAL with 73% DNA and 1 VERSICULO. Also need variety of opening: not repeat same opening type more than twice. We'll vary.

**A coragem de recomeçar**

Hoje Deus te chama a recomeçar. Não importa o ontem; a misericórdia é nova a cada manhã. Filipenses 4:13`;

        const processed = processGeneratedContent(raw, {
            modoId: 'modo_favoritas',
            filtros: { quantidade: 5 },
            quantidadeEsperada: 5,
        });

        expect(processed.messages).toHaveLength(1);
        expect(processed.messages[0]).toContain('A coragem de recomeçar');
        expect(processed.messages[0]).toContain('Filipenses 4:13');
        expect(processed.messages.join('\n')).not.toMatch(/we need|also need|we'll|ensure|variety of opening/i);
    });

    it('rejeita um fragmento que é puro planejamento em inglês', () => {
        const leak =
            'O plano: we must ensure each message includes at least 4 distinct DNA terms and the verse must be present in every output.';

        expect(splitGeneratedMessages(leak)).toHaveLength(0);
        expect(validateGeneratedMessage(leak, { modoId: 'modo_favoritas', filtros: {} })).toContain(
            'instruction_leak'
        );
    });

    it('remove o preâmbulo de raciocínio em português, preservando o devocional', () => {
        const raw = `Okay, entendido! Preparando 5 novas mensagens, focando nos subtemas extraídos do DNA, léxico obrigatório e estrutura diversificada.

**Descanse no Senhor**

Mesmo no cansaço, Ele te sustenta. Confie e descanse. Salmos 23:1`;

        const sanitized = sanitizeGeneratedText(raw);
        expect(sanitized).not.toMatch(/Preparando 5 novas|entendido/i);
        expect(sanitized).toContain('Descanse no Senhor');
        expect(sanitized).toContain('Salmos 23:1');
    });

    it('remove o rótulo vazado "Message N:" e mantém o corpo da mensagem', () => {
        const messages = splitGeneratedMessages(
            'Message 2: **Pedro e a fé que caminha**\n\nPedro saiu do barco e caminhou sobre as águas, fixando os olhos em Jesus. Mateus 14:29'
        );

        expect(messages).toHaveLength(1);
        expect(messages[0]).toContain('Pedro e a fé que caminha');
        expect(messages[0]).not.toMatch(/Message\s*2/i);
    });

    it('descarta bloco <thinking> sem fechamento', () => {
        const raw = `<thinking>
Use seed 3, theme about hope, verse Filipenses 4:13, then write the message.`;

        const sanitized = sanitizeGeneratedText(raw);
        expect(sanitized).not.toMatch(/thinking|seed 3|verse/i);
        expect(sanitized.trim()).toBe('');
    });

    it('não marca um devocional legítimo em português como vazamento', () => {
        const devocional =
            '**Confie no Senhor**\n\nQuando o medo bate, lembre-se: Deus vai à frente e nunca te abandona. Entregue a Ele cada passo e descanse na promessa de que Ele cuida de você. Isaías 41:10';

        expect(splitGeneratedMessages(devocional)).toHaveLength(1);
        expect(
            validateGeneratedMessage(devocional, { modoId: 'modo_favoritas', filtros: {} })
        ).toEqual([]);
    });
});
