'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Headphones, Loader2, Pause, Play, Square } from 'lucide-react';
import { lerVozSalva } from '@/lib/vozes-narracao';

type EstadoAudio = 'parado' | 'preparando' | 'pronto' | 'tocando' | 'pausado' | 'erro';

// Áudio de duas explicações não toca simultaneamente no mesmo plano de leitura.
let audioAtivo: { id: symbol; parar: () => void } | null = null;

export function ExplicacaoAudioPlayer({ texto }: { texto: string }) {
    const [estado, setEstado] = useState<EstadoAudio>('parado');
    const [url, setUrl] = useState<string | null>(null);
    const [fonte, setFonte] = useState('Voz neural da Bíblia');
    const [erro, setErro] = useState('');
    const audioRef = useRef<HTMLAudioElement>(null);
    const pedidoRef = useRef<AbortController | null>(null);
    const geracaoRef = useRef(0);
    const textoProntoRef = useRef('');
    const id = useRef(Symbol('audio-explicacao'));

    const parar = useCallback(() => {
        geracaoRef.current++;
        pedidoRef.current?.abort();
        pedidoRef.current = null;
        const audio = audioRef.current;
        if (audio) {
            audio.pause();
            if (audio.readyState >= 1) audio.currentTime = 0;
        }
        if (audioAtivo?.id === id.current) audioAtivo = null;
        setEstado('parado');
    }, []);

    // Evita continuar a tocar quando o painel fecha ou a parte muda.
    useEffect(() => () => {
        geracaoRef.current++;
        pedidoRef.current?.abort();
        audioRef.current?.pause();
        if (audioAtivo?.id === id.current) audioAtivo = null;
        textoProntoRef.current = '';
    }, [texto]);

    if (!texto.trim()) return null;

    const ouvir = async () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (audioAtivo && audioAtivo.id !== id.current) audioAtivo.parar();
        audioAtivo = { id: id.current, parar };
        if (textoProntoRef.current === texto && url) {
            try {
                await audio.play();
                setEstado('tocando');
            } catch {
                setEstado('pronto');
                setErro('Toque em Reproduzir no controle de áudio abaixo.');
            }
            return;
        }

        const controller = new AbortController();
        pedidoRef.current?.abort();
        pedidoRef.current = controller;
        const geracao = ++geracaoRef.current;
        setEstado('preparando');
        setErro('');
        setUrl(null);
        textoProntoRef.current = '';
        audio.pause();
        audio.removeAttribute('src');
        try {
            const resposta = await fetch('/api/explicacao-audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texto, voz: lerVozSalva() }),
                signal: controller.signal,
            });
            const dados = await resposta.json();
            if (!resposta.ok || !dados?.ok || typeof dados.fullUrl !== 'string' || !dados.fullUrl) {
                throw new Error('Não foi possível preparar o áudio. Tente novamente.');
            }
            if (geracao !== geracaoRef.current) return;
            textoProntoRef.current = texto;
            setFonte(dados.fonte || 'Voz neural da Bíblia');
            audio.src = dados.fullUrl;
            audio.load();
            setUrl(dados.fullUrl);
            try {
                // iPhone pode exigir novo gesto após o MP3 ser preparado. Nesse
                // caso mantemos o reprodutor nativo com Play, em vez de silêncio.
                await audio.play();
                if (geracao === geracaoRef.current) setEstado('tocando');
            } catch {
                if (geracao === geracaoRef.current) {
                    setEstado('pronto');
                    setErro('Áudio pronto. Toque em Reproduzir para ouvir.');
                }
            }
        } catch (falha) {
            if (controller.signal.aborted || geracao !== geracaoRef.current) return;
            console.error('[EXPLICACAO-AUDIO] Falha ao preparar áudio:', falha);
            setEstado('erro');
            setErro('Não foi possível preparar o áudio. Tente novamente.');
        } finally {
            if (pedidoRef.current === controller) pedidoRef.current = null;
        }
    };

    const rotulo = estado === 'preparando' ? 'Preparando áudio…'
        : estado === 'tocando' ? 'Pausar'
            : estado === 'pausado' || estado === 'pronto' ? 'Reproduzir'
                : 'Ouvir explicação';

    return (
        <div className="my-4 space-y-2" data-audio-explicacao>
            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    aria-label={estado === 'tocando' ? 'Pausar áudio da explicação'
                        : estado === 'pausado' || estado === 'pronto' ? 'Reproduzir áudio da explicação'
                            : 'Ouvir explicação'}
                    disabled={estado === 'preparando'}
                    onClick={estado === 'tocando' ? () => { audioRef.current?.pause(); setEstado('pausado'); } : ouvir}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-500/25 disabled:opacity-60 dark:text-amber-300"
                >
                    {estado === 'preparando' ? <Loader2 className="h-4 w-4 animate-spin" /> : estado === 'tocando' ? <Pause className="h-4 w-4" /> : estado === 'pausado' || estado === 'pronto' ? <Play className="h-4 w-4" /> : <Headphones className="h-4 w-4" />}
                    {rotulo}
                </button>
                {estado !== 'parado' && estado !== 'erro' && (
                    <button
                        type="button"
                        aria-label="Parar áudio da explicação"
                        onClick={parar}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-border-subtle px-3 text-sm text-text-secondary hover:bg-surface-2"
                    >
                        <Square className="h-3.5 w-3.5" /> Parar
                    </button>
                )}
                <span className="text-xs text-text-muted">{fonte}</span>
            </div>
            <audio
                ref={audioRef}
                controls={Boolean(url) && textoProntoRef.current === texto}
                preload="none"
                className={url && textoProntoRef.current === texto ? 'w-full max-w-md' : 'hidden'}
                aria-label="Reprodutor do áudio da explicação"
                onPlay={() => setEstado('tocando')}
                onPause={() => setEstado(atual => atual === 'tocando' ? 'pausado' : atual)}
                onEnded={() => setEstado('pronto')}
                onError={() => {
                    if (textoProntoRef.current === texto) {
                        setEstado('erro');
                        setErro('Não foi possível reproduzir o MP3. Toque em Ouvir explicação para tentar novamente.');
                    }
                }}
            />
            {(erro || estado === 'preparando') && (
                <p role="status" aria-live="polite" className="text-xs text-text-muted">
                    {erro || 'Preparando a narração com a voz da Bíblia…'}
                </p>
            )}
        </div>
    );
}
