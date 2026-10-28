'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Headphones, Pause, Play, Square } from 'lucide-react';
import { dividirExplicacaoEmFalas, textoFaladoDaExplicacao } from '@/lib/explicacao-audio';

type EstadoAudio = 'parado' | 'tocando' | 'pausado' | 'erro';

// Somente uma explicação pode falar de cada vez, mesmo quando há várias partes na tela.
let audioAtivo: { id: symbol; parar: () => void } | null = null;

export function ExplicacaoAudioPlayer({ texto }: { texto: string }) {
    const [estado, setEstado] = useState<EstadoAudio>('parado');
    const geracao = useRef(0);
    const id = useRef(Symbol('explicacao-audio'));
    const falas = useMemo(() => dividirExplicacaoEmFalas(textoFaladoDaExplicacao(texto)), [texto]);
    const disponivel = typeof window !== 'undefined'
        && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

    const parar = useCallback(() => {
        geracao.current++;
        if (audioAtivo?.id === id.current) {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
            audioAtivo = null;
        }
        setEstado('parado');
    }, []);

    // Fecha o som ao trocar de parte, sair da tela ou fechar a explicação.
    useEffect(() => () => { parar(); }, [parar, texto]);

    if (!falas.length) return null;

    const ouvir = () => {
        if (!disponivel) return;
        const synth = window.speechSynthesis;
        if (estado === 'pausado') {
            synth.resume();
            setEstado('tocando');
            return;
        }
        if (audioAtivo && audioAtivo.id !== id.current) audioAtivo.parar();
        audioAtivo = { id: id.current, parar };
        const ciclo = ++geracao.current;
        synth.cancel();
        setEstado('tocando');
        const vozes = synth.getVoices();
        const ptBR = vozes.find(v => v.lang?.toLowerCase().replace('_', '-') === 'pt-br');
        const pt = ptBR || vozes.find(v => v.lang?.toLowerCase().startsWith('pt'));
        const falarParte = (indice: number) => {
            if (ciclo !== geracao.current) return;
            if (indice >= falas.length) {
                if (audioAtivo?.id === id.current) audioAtivo = null;
                setEstado('parado');
                return;
            }
            const frase = new SpeechSynthesisUtterance(falas[indice]);
            frase.lang = 'pt-BR';
            if (pt) frase.voice = pt;
            frase.rate = 1;
            frase.onend = () => falarParte(indice + 1);
            frase.onerror = () => {
                if (ciclo !== geracao.current) return;
                if (audioAtivo?.id === id.current) audioAtivo = null;
                setEstado('erro');
            };
            synth.speak(frase);
        };
        falarParte(0);
    };

    return (
        <div className="my-4 flex flex-wrap items-center gap-2" data-audio-explicacao>
            <button
                type="button"
                aria-label={estado === 'tocando' ? 'Pausar áudio da explicação' : estado === 'pausado' ? 'Continuar áudio da explicação' : 'Ouvir explicação'}
                onClick={estado === 'tocando' ? () => { window.speechSynthesis.pause(); setEstado('pausado'); } : ouvir}
                disabled={!disponivel}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-500/25 disabled:opacity-50 dark:text-amber-300"
            >
                {estado === 'tocando' ? <Pause className="h-4 w-4" /> : estado === 'pausado' ? <Play className="h-4 w-4" /> : <Headphones className="h-4 w-4" />}
                {estado === 'tocando' ? 'Pausar' : estado === 'pausado' ? 'Continuar' : 'Ouvir explicação'}
            </button>
            {(estado === 'tocando' || estado === 'pausado') && (
                <button
                    type="button"
                    aria-label="Parar áudio da explicação"
                    onClick={parar}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-border-subtle px-3 text-sm text-text-secondary hover:bg-surface-2"
                >
                    <Square className="h-3.5 w-3.5" /> Parar
                </button>
            )}
            <span role="status" aria-live="polite" className="text-xs text-text-muted">
                {!disponivel ? 'Áudio indisponível neste navegador' : estado === 'erro' ? 'A voz do aparelho falhou. Toque para tentar novamente.' : 'Voz do aparelho · português'}
            </span>
        </div>
    );
}
