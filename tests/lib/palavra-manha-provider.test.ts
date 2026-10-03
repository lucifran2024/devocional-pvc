import { describe, expect, it, vi } from 'vitest';
import { gerarPalavraComReserva } from '../../supabase/functions/execute/palavra-manha-provider';

describe('Palavra da Manhã — seleção de infraestrutura', () => {
    const prompt = 'PROMPT EDITORIAL INALTERADO';
    const modelosTunel = ['modelo-tunel'];
    const modelosReserva = ['modelo-reserva'];

    it('mantém o túnel como primeira opção quando ele funciona', async () => {
        const gerarTexto = vi.fn().mockResolvedValue({ ok: true, text: 'PALAVRA PRONTA' });

        const resultado = await gerarPalavraComReserva({
            prompt,
            temperature: 0.85,
            maxTokens: 500,
            useTunnel: true,
            tunnelUrl: 'https://tunel.example/v1/chat/completions',
            tunnelApiKey: 'tunnel-key',
            modelosTunel,
            modelosReserva,
            gerarTexto,
        });

        expect(resultado).toEqual({ ok: true, text: 'PALAVRA PRONTA' });
        expect(gerarTexto).toHaveBeenCalledTimes(1);
        expect(gerarTexto).toHaveBeenCalledWith(prompt, expect.objectContaining({
            models: modelosTunel,
            baseUrl: 'https://tunel.example/v1/chat/completions',
            apiKey: 'tunnel-key',
        }));
    });

    it('sem timeoutMs, não muda o tempo padrão; com ele, vale para túnel e reserva', async () => {
        const base = { prompt, temperature: 0.3, maxTokens: 500, useTunnel: true, tunnelUrl: 'https://tunel.example/v1/chat/completions', tunnelApiKey: 'k', modelosTunel, modelosReserva };
        const semTempo = vi.fn().mockResolvedValue({ ok: true, text: 'OK' });
        await gerarPalavraComReserva({ ...base, gerarTexto: semTempo });
        expect(semTempo.mock.calls[0][1]).not.toHaveProperty('timeoutMs');

        const comTempo = vi.fn()
            .mockResolvedValueOnce({ ok: false, error: 'túnel caiu' })
            .mockResolvedValueOnce({ ok: true, text: 'OK' });
        await gerarPalavraComReserva({ ...base, gerarTexto: comTempo, timeoutMs: 60_000 });
        expect(comTempo.mock.calls[0][1]).toEqual(expect.objectContaining({ timeoutMs: 60_000, models: modelosTunel }));
        expect(comTempo.mock.calls[1][1]).toEqual(expect.objectContaining({ timeoutMs: 60_000, models: modelosReserva }));
    });

    it('repete o mesmo prompt na reserva quando todos os modelos do túnel falham', async () => {
        const gerarTexto = vi.fn()
            .mockResolvedValueOnce({ ok: false, error: 'Todos os modelos falharam: resposta vazia' })
            .mockResolvedValueOnce({ ok: true, text: 'PALAVRA PRONTA PELA RESERVA' });

        const resultado = await gerarPalavraComReserva({
            prompt,
            temperature: 0.85,
            maxTokens: 500,
            useTunnel: true,
            tunnelUrl: 'https://tunel.example/v1/chat/completions',
            tunnelApiKey: 'tunnel-key',
            modelosTunel,
            modelosReserva,
            gerarTexto,
        });

        expect(resultado).toEqual({ ok: true, text: 'PALAVRA PRONTA PELA RESERVA' });
        expect(gerarTexto).toHaveBeenCalledTimes(2);
        expect(gerarTexto.mock.calls[0][0]).toBe(prompt);
        expect(gerarTexto.mock.calls[1][0]).toBe(prompt);
        expect(gerarTexto.mock.calls[1][1]).toEqual(expect.objectContaining({
            models: modelosReserva,
            baseUrl: undefined,
            apiKey: undefined,
        }));
    });

    it('não repete a mesma infraestrutura quando o túnel não está configurado', async () => {
        const falha = { ok: false, error: 'OpenRouter indisponível' };
        const gerarTexto = vi.fn().mockResolvedValue(falha);

        const resultado = await gerarPalavraComReserva({
            prompt,
            temperature: 0.85,
            maxTokens: 500,
            useTunnel: false,
            tunnelUrl: 'https://openrouter.ai/api/v1/chat/completions',
            tunnelApiKey: 'openrouter-key',
            modelosTunel,
            modelosReserva,
            gerarTexto,
        });

        expect(resultado).toBe(falha);
        expect(gerarTexto).toHaveBeenCalledTimes(1);
        expect(gerarTexto).toHaveBeenCalledWith(prompt, expect.objectContaining({
            models: modelosReserva,
            baseUrl: undefined,
            apiKey: undefined,
        }));
    });
});
