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
