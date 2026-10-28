import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { ExplicacaoAudioPlayer } from '@/components/leitura/ExplicacaoAudioPlayer';

const synth = { speak: vi.fn(), cancel: vi.fn(), pause: vi.fn(), resume: vi.fn(), getVoices: vi.fn(() => []) };

class FakeUtterance {
    text: string;
    lang = '';
    rate = 1;
    voice: SpeechSynthesisVoice | null = null;
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(text: string) { this.text = text; }
}

beforeEach(() => {
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synth });
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
    vi.clearAllMocks();
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); delete (window as { speechSynthesis?: SpeechSynthesis }).speechSynthesis; });

describe('Ouvir explicação', () => {
    it('inicia a leitura em português, pausa, continua e para', () => {
        render(<ExplicacaoAudioPlayer texto="**Em uma frase:** Sirva com alegria." />);
        fireEvent.click(screen.getByRole('button', { name: 'Ouvir explicação' }));
        expect(synth.speak).toHaveBeenCalledTimes(1);
        expect(synth.speak.mock.calls[0][0].lang).toBe('pt-BR');
        fireEvent.click(screen.getByRole('button', { name: 'Pausar áudio da explicação' }));
        expect(synth.pause).toHaveBeenCalledTimes(1);
        fireEvent.click(screen.getByRole('button', { name: 'Continuar áudio da explicação' }));
        expect(synth.resume).toHaveBeenCalledTimes(1);
        fireEvent.click(screen.getByRole('button', { name: 'Parar áudio da explicação' }));
        expect(synth.cancel).toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Ouvir explicação' })).toBeTruthy();
    });

    it('para o áudio ao fechar o painel e não narra conteúdo vazio', () => {
        const view = render(<ExplicacaoAudioPlayer texto="Mensagem para ouvir." />);
        fireEvent.click(screen.getByRole('button', { name: 'Ouvir explicação' }));
        view.unmount();
        expect(synth.cancel).toHaveBeenCalled();
        render(<ExplicacaoAudioPlayer texto="" />);
        expect(screen.queryByRole('button', { name: 'Ouvir explicação' })).toBeNull();
    });

    it('avisa quando não há sintetizador no aparelho', () => {
        delete (window as { speechSynthesis?: SpeechSynthesis }).speechSynthesis;
        render(<ExplicacaoAudioPlayer texto="Texto disponível." />);
        expect(screen.getByRole('button', { name: 'Ouvir explicação' }).hasAttribute('disabled')).toBe(true);
    });

    it('continua a narração em partes curtas e encerra ao terminar', () => {
        const longo = Array.from({ length: 90 }, (_, n) => `Palavra${n}`).join(' ');
        render(<ExplicacaoAudioPlayer texto={longo} />);
        fireEvent.click(screen.getByRole('button', { name: 'Ouvir explicação' }));
        const primeiraFala = synth.speak.mock.calls[0][0] as FakeUtterance;
        primeiraFala.onend?.();
        expect(synth.speak).toHaveBeenCalledTimes(2);
    });

    it('trocar a explicação encerra a voz anterior', () => {
        const { rerender } = render(<ExplicacaoAudioPlayer texto="Primeira explicação" />);
        fireEvent.click(screen.getByRole('button', { name: 'Ouvir explicação' }));
        rerender(<ExplicacaoAudioPlayer texto="Segunda explicação" />);
        expect(synth.cancel).toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Ouvir explicação' })).toBeTruthy();
    });
});
