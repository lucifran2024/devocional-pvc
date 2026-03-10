import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface InsertCall {
    table: string;
    records: Record<string, unknown>[];
}

function jsonResponse(payload: unknown, init?: ResponseInit): Response {
    return new Response(JSON.stringify(payload), {
        headers: { 'Content-Type': 'application/json' },
        ...init,
    });
}

describe('daily-dna cron route', () => {
    const originalEnv = { ...process.env };
    let insertCalls: InsertCall[] = [];
    let telegramMessages: string[] = [];
    let executeAttempts: Record<string, number> = {};

    const loadRoute = async () => {
        insertCalls = [];
        vi.resetModules();
        vi.doMock('@supabase/supabase-js', () => ({
            createClient: vi.fn(() => ({
                from: (table: string) => ({
                    insert: async (records: Record<string, unknown>[]) => {
                        insertCalls.push({ table, records });
                        return { error: null };
                    },
                }),
            })),
        }));

        return import('@/app/api/cron/daily-dna/route');
    };

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-10T12:00:00-03:00'));

        process.env.CRON_SECRET = 'cron-secret';
        process.env.TELEGRAM_BOT_TOKEN = 'telegram-token';
        process.env.TELEGRAM_CHAT_ID = 'telegram-chat';
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

        telegramMessages = [];
        executeAttempts = {};

        global.fetch = vi.fn(async (input, init) => {
            const url = String(input);

            if (url === 'https://example.supabase.co/functions/v1/execute') {
                const body = JSON.parse(String(init?.body || '{}')) as {
                    modo_id: 'modo_favoritas' | 'modo_estilo';
                };

                executeAttempts[body.modo_id] = (executeAttempts[body.modo_id] || 0) + 1;
                const attempt = executeAttempts[body.modo_id];

                if (body.modo_id === 'modo_favoritas') {
                    const resultado =
                        attempt === 1
                            ? [
                                '**Mensagem vazada favoritas**\n\nOkay, vamos gerar as 5 novas mensagens seguindo rigorosamente as instruções.',
                                '**[ORACAO]** Terça da coragem tranquila\n\nPai, nesta Terça eu descanso em Ti. Amém.',
                                '**Terça da esperança firme**\n\nHoje é Terça e Deus sustenta o seu coração com paz.',
                                '**Terça da fidelidade**\n\nNesta Terça, o Senhor continua presente no caminho.',
                            ].join('\n\n---\n\n')
                            : [
                                '**Terça do recomeço**\n\nNesta Terça, Cristo reacende a coragem e firma o caminho.',
                                '**Terça da constância**\n\nHoje é Terça e a graça do Senhor não falha no seu caminho.',
                            ].join('\n\n---\n\n');

                    return jsonResponse({
                        ok: true,
                        resultado,
                    });
                }

                const mensagemLonga = [
                    '**[VERSICULO]** Terça da paz guardada',
                    '',
                    'João 14:27',
                    '',
                    `Nesta Terça, a Palavra firma o seu caminho e guarda seu coração. ${'A paz de Cristo sustenta cada passo no caminho. '.repeat(140)}`,
                ].join('\n');

                const resultado =
                    attempt === 1
                        ? [
                            '**Mensagem vazada estilo**\n\nOkay, vamos gerar as mensagens.',
                            mensagemLonga,
                            '**Terça sem referência**\n\nNesta Terça reflita com calma e siga em frente no caminho.',
                        ].join('\n\n---\n\n')
                        : [
                            '**Terça da Palavra viva**\n\nSalmo 119:105\n\nNesta Terça a Palavra ilumina o caminho, abre a porta certa e fortalece sua decisão.',
                            '**Mensagem vazada estilo 2**\n\nOkay, vamos gerar outra mensagem.',
                        ].join('\n\n---\n\n');

                return jsonResponse({
                    ok: true,
                    resultado,
                });
            }

            if (url === 'https://api.telegram.org/bottelegram-token/sendMessage') {
                const body = JSON.parse(String(init?.body || '{}')) as { text: string };
                telegramMessages.push(body.text);
                return jsonResponse({ ok: true, result: { message_id: telegramMessages.length } });
            }

            throw new Error(`Unexpected fetch URL: ${url}`);
        }) as typeof fetch;
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.resetModules();
        vi.doUnmock('@supabase/supabase-js');
        process.env = { ...originalEnv };
    });

    it('sanitizes, validates, persists metadata, and chunks Telegram sends', async () => {
        const { GET } = await loadRoute();
        const request = new Request('http://localhost/api/cron/daily-dna', {
            headers: { authorization: 'Bearer cron-secret' },
        });

        const responsePromise = GET(request);
        await vi.runAllTimersAsync();
        const response = await responsePromise;
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.ok).toBe(true);
        expect(payload.data).toBe('2026-03-10');
        expect(payload.favoritas_validas).toBe(5);
        expect(payload.favoritas_rejeitadas).toBe(1);
        expect(payload.favoritas_faltantes).toBe(0);
        expect(payload.estilo_validas).toBe(2);
        expect(payload.estilo_rejeitadas).toBe(3);
        expect(payload.estilo_faltantes).toBe(3);

        expect(insertCalls).toHaveLength(2);

        const favoritasInsert = insertCalls[0];
        const estiloInsert = insertCalls[1];

        expect(favoritasInsert.table).toBe('dna_geracoes');
        expect(favoritasInsert.records).toHaveLength(5);
        expect(favoritasInsert.records.every((record) => record.categoria === null)).toBe(true);
        expect(favoritasInsert.records.every((record) => record.build_style === 'favoritas')).toBe(true);
        expect(favoritasInsert.records.every((record) => typeof record.tema_principal === 'string')).toBe(true);
        expect(favoritasInsert.records.every((record) => !String(record.texto_msg).includes('[ORACAO]'))).toBe(true);

        expect(estiloInsert.table).toBe('dna_geracoes');
        expect(estiloInsert.records).toHaveLength(2);
        expect(estiloInsert.records.every((record) => record.categoria === 'versiculo')).toBe(true);
        expect(estiloInsert.records.every((record) => record.build_style === 'estilo')).toBe(true);
        expect(estiloInsert.records.every((record) => typeof record.titulo === 'string')).toBe(true);
        expect(estiloInsert.records.every((record) => typeof record.tema_principal === 'string')).toBe(true);
        expect(estiloInsert.records.every((record) => typeof record.abertura_tipo === 'string')).toBe(true);
        expect(estiloInsert.records.every((record) => typeof record.fechamento_tipo === 'string')).toBe(true);
        expect(estiloInsert.records.every((record) => typeof record.punchline === 'string')).toBe(true);
        expect(estiloInsert.records.every((record) => typeof record.imagem_central === 'string')).toBe(true);
        expect(estiloInsert.records[0].versiculos_usados).toEqual(expect.arrayContaining(['João 14:27']));

        expect(telegramMessages.length).toBeGreaterThan(1 + payload.total);
        expect(telegramMessages.every((text) => text.length <= 4096)).toBe(true);
        expect(telegramMessages.join('\n')).not.toContain('Okay, vamos gerar');
        expect(telegramMessages.join('\n')).not.toContain('[ORACAO]');
        expect(telegramMessages.join('\n')).not.toContain('[VERSICULO]');
        expect(telegramMessages.join('\n')).not.toContain('**');
    }, 10000);
});
