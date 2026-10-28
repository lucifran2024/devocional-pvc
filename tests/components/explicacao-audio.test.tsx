import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ExplicacaoAudioPlayer } from '@/components/leitura/ExplicacaoAudioPlayer';

const responder = vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<{ ok: boolean; status: number; json: () => Promise<{ ok: boolean; fullUrl?: string; fonte?: string; error?: string }> }> => {
    void input;
    void init;
    return { ok: true, status: 200, json: async () => ({
        ok: true, fullUrl: 'https://cdn.exemplo.com/explicacoes/full.mp3', fonte: 'Narração · Macerio (reserva)',
    }) };
});
const tocar = vi.fn(async () => {});
const pausar = vi.fn();
const carregar = vi.fn();

beforeEach(() => {
    vi.stubGlobal('fetch', responder);
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(tocar);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(pausar);
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(carregar);
    vi.clearAllMocks();
    localStorage.clear();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Ouvir explicação com a mesma voz da Bíblia', () => {
    it('pede MP3 Azure com a voz selecionada na Bíblia, toca, pausa, continua e para', async () => {
        localStorage.setItem('biblia-narracao-voz-v2', 'pt-BR-ThalitaMultilingualNeural');
        render(<ExplicacaoAudioPlayer texto="**Em uma frase:** Sirva com alegria." />);
        fireEvent.click(screen.getByRole('button', { name: 'Ouvir explicação' }));
        await waitFor(() => expect(tocar).toHaveBeenCalledTimes(1));
        const args = JSON.parse(String(responder.mock.calls[0][1]?.body || '{}'));
        expect(args.voz).toBe('pt-BR-ThalitaMultilingualNeural');
        expect(args.texto).toBe('**Em uma frase:** Sirva com alegria.');
        expect(screen.getByLabelText('Reprodutor do áudio da explicação').getAttribute('src')).toContain('full.mp3');
        fireEvent.click(screen.getByRole('button', { name: 'Pausar áudio da explicação' }));
        expect(pausar).toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Reproduzir áudio da explicação' }));
        await waitFor(() => expect(tocar).toHaveBeenCalledTimes(2));
        expect(responder).toHaveBeenCalledTimes(1);
        fireEvent.click(screen.getByRole('button', { name: 'Parar áudio da explicação' }));
        expect(screen.getByRole('button', { name: 'Ouvir explicação' })).toBeTruthy();
    });

    it('se iOS bloquear autoplay após gerar, mostra controle nativo e permite novo toque', async () => {
        tocar.mockRejectedValueOnce(new DOMException('NotAllowedError', 'NotAllowedError'));
        render(<ExplicacaoAudioPlayer texto="Agora escute a mensagem." />);
        fireEvent.click(screen.getByRole('button', { name: 'Ouvir explicação' }));
        await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Áudio pronto'));
        expect(screen.getByLabelText('Reprodutor do áudio da explicação').hasAttribute('controls')).toBe(true);
        fireEvent.click(screen.getByRole('button', { name: 'Reproduzir áudio da explicação' }));
        await waitFor(() => expect(tocar).toHaveBeenCalledTimes(2));
        expect(responder).toHaveBeenCalledTimes(1);
    });

    it('exibe erro do servidor e permite tentar novamente', async () => {
        responder.mockResolvedValueOnce({ ok: false, status: 502, json: async () => ({ ok: false, error: 'sem_audio' }) });
        render(<ExplicacaoAudioPlayer texto="Texto da explicação." />);
        fireEvent.click(screen.getByRole('button', { name: 'Ouvir explicação' }));
        await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Não foi possível preparar'));
        fireEvent.click(screen.getByRole('button', { name: 'Ouvir explicação' }));
        await waitFor(() => expect(responder).toHaveBeenCalledTimes(2));
    });

    it('aborta a solicitação e para o MP3 ao fechar o painel', async () => {
        const { unmount } = render(<ExplicacaoAudioPlayer texto="Mensagem para ouvir." />);
        fireEvent.click(screen.getByRole('button', { name: 'Ouvir explicação' }));
        await waitFor(() => expect(tocar).toHaveBeenCalledTimes(1));
        unmount();
        expect(pausar).toHaveBeenCalled();
        render(<ExplicacaoAudioPlayer texto="" />);
        expect(screen.queryByRole('button', { name: 'Ouvir explicação' })).toBeNull();
    });

    it('não depende da voz speechSynthesis do iPhone', async () => {
        delete (window as { speechSynthesis?: SpeechSynthesis }).speechSynthesis;
        render(<ExplicacaoAudioPlayer texto="A palavra será narrada." />);
        fireEvent.click(screen.getByRole('button', { name: 'Ouvir explicação' }));
        await waitFor(() => expect(tocar).toHaveBeenCalledTimes(1));
    });
});
