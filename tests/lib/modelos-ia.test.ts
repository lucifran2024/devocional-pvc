import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    APP_TUNNEL_MODELS,
    FREE_TEXT_MODELS,
    FREE_TOOL_MODELS,
    chamarOpenRouter,
} from '../../supabase/functions/execute/openrouter-client';
import { gerarPalavraComReserva } from '../../supabase/functions/execute/palavra-manha-provider';

// 01/10/2026: a Palavra da Manhã faltou em 26, 27, 28/09 e 01/10 e o botão
// Explicar caía. Logs da Edge: os :free abaixo davam HTTP 404 ("unavailable
// for free"), o Gemma grátis 429 e o DeepSeek V4 Flash voltava vazio — o
// raciocínio dele vem ligado ("high") e consumia o max_tokens (500 na Palavra).
const REMOVIDOS = [
    'openai/gpt-oss-120b:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'qwen/qwen3-next-80b-a3b-instruct:free',
    'nvidia/nemotron-3-nano-30b-a3b:free',
];

const respostaOk = (texto = 'texto gerado') => ({ ok: true, json: async () => ({ choices: [{ message: { content: texto } }] }) }) as Response;
const corpoEnviado = (i = 0) => JSON.parse(String((vi.mocked(global.fetch).mock.calls[i][1] as RequestInit).body));

afterEach(() => vi.mocked(global.fetch).mockReset());

describe('cadeias de reserva do OpenRouter', () => {
    it('não tentam mais os modelos que saíram do OpenRouter', () => {
        for (const m of REMOVIDOS) {
            expect(FREE_TEXT_MODELS).not.toContain(m);
            expect(FREE_TOOL_MODELS).not.toContain(m);
        }
        expect(FREE_TEXT_MODELS.at(-1)).toBe('deepseek/deepseek-v4-flash');
        expect(FREE_TOOL_MODELS.at(-1)).toBe('deepseek/deepseek-v4-flash');
    });

    it('DeepSeek no OpenRouter responde direto, sem raciocínio', async () => {
        vi.mocked(global.fetch).mockResolvedValue(respostaOk());
        const r = await chamarOpenRouter([{ role: 'user', content: 'oi' }], { models: ['deepseek/deepseek-v4-flash'], apiKey: 'chave-de-teste', maxTokens: 500 });
        expect(r.ok).toBe(true);
        expect(corpoEnviado().reasoning).toEqual({ enabled: false });
    });

    it('outros modelos e o túnel não recebem o parâmetro', async () => {
        vi.mocked(global.fetch).mockResolvedValue(respostaOk());
        await chamarOpenRouter([{ role: 'user', content: 'oi' }], { models: ['google/gemma-4-31b-it:free'], apiKey: 'chave-de-teste' });
        expect(corpoEnviado(0).reasoning).toBeUndefined();
        await chamarOpenRouter([{ role: 'user', content: 'oi' }], { models: ['deepseek/deepseek-v4-flash'], apiKey: 'k', baseUrl: 'https://tunel.example/v1/chat/completions' });
        expect(corpoEnviado(1).reasoning).toBeUndefined();
        expect(corpoEnviado(1).stream).toBe(false);
    });

    it('resposta vazia passa para o próximo modelo', async () => {
        vi.mocked(global.fetch)
            .mockResolvedValueOnce(respostaOk(''))
            .mockResolvedValueOnce(respostaOk('do segundo'));
        const r = await chamarOpenRouter([{ role: 'user', content: 'oi' }], { models: ['google/gemma-4-31b-it:free', 'deepseek/deepseek-v4-flash'], apiKey: 'k' });
        expect(r).toMatchObject({ ok: true, text: 'do segundo', modelUsed: 'deepseek/deepseek-v4-flash' });
    });
});

describe('combo do app no 9Router (túnel)', () => {
    const index = readFileSync(resolve(__dirname, '../../supabase/functions/execute/index.ts'), 'utf8');

    it('o app usa o combo dedicado "app-pvc", não o combo principal do Hermes', () => {
        expect(APP_TUNNEL_MODELS).toEqual(['app-pvc']);
        expect(index).toContain('modelosTunel: APP_TUNNEL_MODELS');
        expect(index).not.toMatch(/MODELOS_PALAVRA_TUNEL\s*=\s*\[[^\]]*openclaw/);
        expect(index).not.toContain("'ds/deepseek-v4-flash'");
        for (const m of REMOVIDOS) expect(index).not.toContain(`'${m}'`);
    });

    it('Explicar tenta o túnel e cai na reserva com o mesmo prompt (geração e revisão)', () => {
        const bloco = index.slice(index.indexOf("if (modo_id === 'explicar_passagem')"), index.indexOf('FIM DO MODO EXPLICAR PASSAGEM'));
        expect(bloco).toContain('get9RouterEndpoint()');
        expect(bloco.match(/gerarExplicacao\(/g)?.length).toBeGreaterThanOrEqual(2);
        expect(bloco).not.toMatch(/await gerarTexto\(prompt(Explicar|RevisaoExplicar)/);
    });

    it('rótulo do aviso de queda identifica a função', async () => {
        const avisos = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const gerarTexto = vi.fn()
            .mockResolvedValueOnce({ ok: false, error: 'túnel fora' })
            .mockResolvedValueOnce({ ok: true, text: 'reserva' });
        const r = await gerarPalavraComReserva({
            prompt: 'P', temperature: 0.2, maxTokens: 1200, useTunnel: true, tunnelUrl: 'u', tunnelApiKey: 'k',
            modelosTunel: ['app-pvc'], modelosReserva: ['deepseek/deepseek-v4-flash'], gerarTexto, rotulo: 'EXPLICAR PASSAGEM',
        });
        expect(r).toEqual({ ok: true, text: 'reserva' });
        expect(gerarTexto.mock.calls[1][1]).toMatchObject({ temperature: 0.2, maxTokens: 1200, models: ['deepseek/deepseek-v4-flash'] });
        expect(String(avisos.mock.calls[0][0])).toContain('[EXPLICAR PASSAGEM]');
        avisos.mockRestore();
    });
});
