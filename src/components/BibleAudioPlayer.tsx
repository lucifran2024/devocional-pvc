'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Headphones, Play, Pause, Square, Loader2 } from 'lucide-react';

// ============================================
// PLAYER DE ÁUDIO BÍBLICO (opcional) — dois motores:
//
//  1) NEURAL (preferido): MP3 de voz neural natural (Azure), gerado uma
//     vez por versículo e cacheado no servidor (/api/bible-audio).
//  2) NAVEGADOR (fallback): síntese de voz do dispositivo (speechSynthesis),
//     usada quando a voz neural não está configurada/disponível.
//
// Em ambos os modos lê versículo por versículo e avisa qual está sendo
// lido (onVerseChange) para o destaque tipo "legenda" + auto-scroll.
// Se nada estiver disponível, o botão fica oculto.
// ============================================

interface VersiculoFala {
    verse: number;
    text: string;
    chapter?: number;
}

const VELOCIDADES = [1, 0.85, 1.25, 1.5];

function limparTexto(t: string): string {
    return t
        .replace(/<[^>]*>/g, '')
        .replace(/\*\*/g, '')
        .replace(/[*_#`>]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

export function BibleAudioPlayer({
    versiculos,
    capitulo,
    livroId,
    onVerseChange,
    className = '',
}: {
    versiculos: VersiculoFala[];
    capitulo: number;
    livroId: number;
    onVerseChange?: (verse: number | null, chapter?: number) => void;
    className?: string;
}) {
    const [estado, setEstado] = useState<'fechado' | 'carregando' | 'tocando' | 'pausado' | 'indisponivel'>('fechado');
    const [posicao, setPosicao] = useState(0);
    const [velocidadeIdx, setVelocidadeIdx] = useState(0);
    const [vozNavegadorPronta, setVozNavegadorPronta] = useState(false);
    const [fonte, setFonte] = useState('');

    const idxRef = useRef(0);
    const pararRef = useRef(false);
    const modoRef = useRef<'neural' | 'navegador'>('navegador');
    const rateRef = useRef(VELOCIDADES[0]);
    const vozRef = useRef<SpeechSynthesisVoice | null>(null);
    const urlMapRef = useRef<Map<number, string>>(new Map());
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const nextAudioRef = useRef<{ audio: HTMLAudioElement; idx: number } | null>(null);

    const versiculosRef = useRef<VersiculoFala[]>(versiculos);
    versiculosRef.current = versiculos;
    const onVerseChangeRef = useRef(onVerseChange);
    onVerseChangeRef.current = onVerseChange;
    const capituloRef = useRef(capitulo);
    capituloRef.current = capitulo;

    const temSpeech = typeof window !== 'undefined' && 'speechSynthesis' in window;

    // Escolhe a melhor voz pt do dispositivo (prefere pt-BR e vozes naturais)
    const escolherVoz = useCallback(() => {
        if (!temSpeech) return null;
        const vozes = window.speechSynthesis.getVoices();
        const pt = vozes.filter((v) => v.lang && v.lang.toLowerCase().startsWith('pt'));
        if (pt.length === 0) return null;
        const ptBR = pt.filter((v) => v.lang.toLowerCase().replace('_', '-') === 'pt-br');
        const pool = ptBR.length ? ptBR : pt;
        return (
            pool.find((v) => /google/i.test(v.name)) ||
            pool.find((v) => /natural|premium|online/i.test(v.name)) ||
            pool[0]
        );
    }, [temSpeech]);

    // Carrega vozes do navegador (assíncrono) — base do fallback
    useEffect(() => {
        if (!temSpeech) return;
        const carregar = () => {
            vozRef.current = escolherVoz();
            setVozNavegadorPronta(true);
        };
        carregar();
        window.speechSynthesis.addEventListener('voiceschanged', carregar);
        return () => window.speechSynthesis.removeEventListener('voiceschanged', carregar);
    }, [temSpeech, escolherVoz]);

    const precarregarProximo = (idx: number) => {
        const lista = versiculosRef.current;
        if (idx >= lista.length) { nextAudioRef.current = null; return; }
        const v = lista[idx];
        const url = urlMapRef.current.get(v.verse);
        if (!url) { nextAudioRef.current = null; return; }
        const a = new Audio(url);
        a.preload = 'auto';
        a.playbackRate = rateRef.current;
        nextAudioRef.current = { audio: a, idx };
    };

    const pararTudo = useCallback(() => {
        pararRef.current = true;
        if (temSpeech) window.speechSynthesis.cancel();
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.onended = null;
            audioRef.current.onerror = null;
        }
        if (nextAudioRef.current) {
            nextAudioRef.current.audio.onended = null;
            nextAudioRef.current.audio.onerror = null;
            nextAudioRef.current = null;
        }
        if (onVerseChangeRef.current) onVerseChangeRef.current(null);
    }, [temSpeech]);

    // Encerra ao trocar de capítulo/parte (remontagem via key) ou sair
    useEffect(() => {
        return () => pararTudo();
    }, [pararTudo]);

    // --- Reprodução versículo a versículo (compartilhada pelos 2 modos) ---
    const falarTTS = (texto: string, idx: number) => {
        if (!temSpeech) { proximo(idx + 1); return; }
        const u = new SpeechSynthesisUtterance(limparTexto(texto));
        u.lang = 'pt-BR';
        if (vozRef.current) u.voice = vozRef.current;
        u.rate = rateRef.current;
        u.onend = () => { if (!pararRef.current) proximo(idx + 1); };
        u.onerror = () => { if (!pararRef.current) proximo(idx + 1); };
        window.speechSynthesis.speak(u);
    };

    const tocarUrl = (url: string, idx: number) => {
        let audio: HTMLAudioElement;
        if (nextAudioRef.current?.idx === idx) {
            audio = nextAudioRef.current.audio;
            nextAudioRef.current = null;
        } else {
            audio = new Audio(url);
            audio.preload = 'auto';
            audio.playbackRate = rateRef.current;
        }
        audioRef.current = audio;
        audio.onended = () => { if (!pararRef.current) proximo(idx + 1); };
        audio.onerror = () => { if (!pararRef.current) falarTTS(versiculosRef.current[idx]?.text || '', idx); };
        audio.play().catch(() => { if (!pararRef.current) falarTTS(versiculosRef.current[idx]?.text || '', idx); });
        precarregarProximo(idx + 1);
    };

    const proximo = (idx: number) => {
        if (pararRef.current) return;
        const lista = versiculosRef.current;
        if (idx >= lista.length) {
            setEstado('fechado');
            setPosicao(0);
            idxRef.current = 0;
            if (onVerseChangeRef.current) onVerseChangeRef.current(null);
            return;
        }
        idxRef.current = idx;
        setPosicao(idx);
        const v = lista[idx];
        if (onVerseChangeRef.current) onVerseChangeRef.current(v.verse, v.chapter ?? capituloRef.current);

        if (modoRef.current === 'neural') {
            const url = urlMapRef.current.get(v.verse);
            if (url) { tocarUrl(url, idx); return; }
        }
        falarTTS(v.text, idx);
    };

    const iniciar = async () => {
        const lista = versiculosRef.current;
        if (lista.length === 0) return;
        pararRef.current = false;
        rateRef.current = VELOCIDADES[velocidadeIdx];
        // cria o elemento de áudio já durante o clique (ajuda no autoplay)
        if (!audioRef.current) audioRef.current = new Audio();

        setEstado('carregando');

        // Tenta a voz neural cacheada no servidor
        let usouNeural = false;
        try {
            const resp = await fetch('/api/bible-audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    livroId,
                    capitulo,
                    verses: lista.map((v) => ({ verse: v.verse, text: v.text })),
                }),
            });
            if (resp.ok) {
                const data = await resp.json();
                if (data.ok && Array.isArray(data.verses) && data.verses.length > 0) {
                    const m = new Map<number, string>();
                    for (const x of data.verses) m.set(Number(x.verse), String(x.url));
                    urlMapRef.current = m;
                    modoRef.current = 'neural';
                    setFonte(data.fonte || 'Voz neural');
                    usouNeural = true;
                    // pré-carrega o primeiro versículo enquanto ainda estamos no estado 'carregando'
                    const v0 = lista[0];
                    const url0 = m.get(v0.verse);
                    if (url0) {
                        const a = new Audio(url0);
                        a.preload = 'auto';
                        a.playbackRate = rateRef.current;
                        nextAudioRef.current = { audio: a, idx: 0 };
                    }
                }
            }
        } catch {
            /* ignora — cai no fallback */
        }

        if (!usouNeural) {
            if (!temSpeech) { setEstado('fechado'); return; }
            modoRef.current = 'navegador';
            setFonte('Voz do dispositivo');
        }

        if (pararRef.current) return;
        setEstado('tocando');
        proximo(0);
    };

    const alternarPlay = () => {
        if (estado === 'tocando') {
            if (modoRef.current === 'neural' && audioRef.current) audioRef.current.pause();
            else if (temSpeech) window.speechSynthesis.pause();
            setEstado('pausado');
        } else if (estado === 'pausado') {
            if (modoRef.current === 'neural' && audioRef.current) audioRef.current.play().catch(() => {});
            else if (temSpeech) window.speechSynthesis.resume();
            setEstado('tocando');
        }
    };

    const parar = () => {
        pararTudo();
        setEstado('fechado');
        setPosicao(0);
        idxRef.current = 0;
        setTimeout(() => { pararRef.current = false; }, 50);
    };

    const mudarVelocidade = () => {
        const novoIdx = (velocidadeIdx + 1) % VELOCIDADES.length;
        setVelocidadeIdx(novoIdx);
        rateRef.current = VELOCIDADES[novoIdx];
        if (estado !== 'tocando') return;
        if (modoRef.current === 'neural' && audioRef.current) {
            audioRef.current.playbackRate = rateRef.current;
            if (nextAudioRef.current) nextAudioRef.current.audio.playbackRate = rateRef.current;
        } else if (temSpeech) {
            window.speechSynthesis.cancel();
            falarTTS(versiculosRef.current[idxRef.current]?.text || '', idxRef.current);
        }
    };

    if (estado === 'indisponivel') return null;

    const total = versiculos.length;
    const progresso = total > 0 ? ((posicao + 1) / total) * 100 : 0;

    // Botão discreto (estado inicial)
    if (estado === 'fechado') {
        return (
            <div className={className}>
                <button
                    type="button"
                    onClick={iniciar}
                    disabled={total === 0}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-400/50 text-amber-700 dark:text-amber-300 text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-50"
                    title="Ouvir este capítulo"
                >
                    <Headphones className="w-4 h-4" />
                    Ouvir
                </button>
            </div>
        );
    }

    // Barra do player (carregando/tocando/pausado)
    return (
        <div className={className}>
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/90 dark:bg-surface-2/90 border border-slate-200 dark:border-border-subtle shadow-md backdrop-blur-md">
                <button
                    type="button"
                    onClick={alternarPlay}
                    disabled={estado === 'carregando'}
                    className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-amber-500 hover:bg-amber-400 text-black transition-colors disabled:opacity-60"
                    title={estado === 'tocando' ? 'Pausar' : 'Continuar'}
                >
                    {estado === 'carregando'
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : estado === 'tocando'
                            ? <Pause className="w-4 h-4" />
                            : <Play className="w-4 h-4 ml-0.5" />}
                </button>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 tabular-nums">
                            {estado === 'carregando' ? 'Preparando áudio…' : `Versículo ${posicao + 1} de ${total}`}
                        </span>
                        {estado === 'pausado' && <span className="text-[10px] text-text-muted">pausado</span>}
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                        <div
                            className="h-full bg-amber-500 rounded-full transition-all duration-300"
                            style={{ width: `${estado === 'carregando' ? 6 : progresso}%` }}
                        />
                    </div>
                </div>

                <button
                    type="button"
                    onClick={mudarVelocidade}
                    disabled={estado === 'carregando'}
                    className="shrink-0 px-2 py-1 rounded-lg text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/15 transition-colors tabular-nums disabled:opacity-60"
                    title="Velocidade"
                >
                    {VELOCIDADES[velocidadeIdx]}x
                </button>

                <button
                    type="button"
                    onClick={parar}
                    className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-1 transition-colors"
                    title="Parar"
                >
                    <Square className="w-3.5 h-3.5" />
                </button>
            </div>
            {fonte && (
                <p className="mt-1 text-[10px] text-text-muted text-center truncate">
                    🔊 {fonte}
                </p>
            )}
        </div>
    );
}
