'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Headphones, Play, Pause, Square, Loader2 } from 'lucide-react';

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

    // Double-buffer: dois HTMLAudioElement que se alternam
    const audioARef = useRef<HTMLAudioElement | null>(null);
    const audioBRef = useRef<HTMLAudioElement | null>(null);
    const activeRef = useRef<'A' | 'B'>('A');
    const nextReadyRef = useRef(false);

    const versiculosRef = useRef<VersiculoFala[]>(versiculos);
    versiculosRef.current = versiculos;
    const onVerseChangeRef = useRef(onVerseChange);
    onVerseChangeRef.current = onVerseChange;
    const capituloRef = useRef(capitulo);
    capituloRef.current = capitulo;

    const temSpeech = typeof window !== 'undefined' && 'speechSynthesis' in window;

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

    const getActive = () => activeRef.current === 'A' ? audioARef.current : audioBRef.current;
    const getNext = () => activeRef.current === 'A' ? audioBRef.current : audioARef.current;

    const prepararProximo = (idx: number) => {
        const lista = versiculosRef.current;
        if (idx >= lista.length) { nextReadyRef.current = false; return; }
        const v = lista[idx];
        const url = urlMapRef.current.get(v.verse);
        if (!url) { nextReadyRef.current = false; return; }

        const next = getNext();
        if (!next) { nextReadyRef.current = false; return; }

        nextReadyRef.current = false;
        next.onended = null;
        next.onerror = null;
        next.src = url;
        next.playbackRate = rateRef.current;
        next.load();
        next.oncanplaythrough = () => { nextReadyRef.current = true; };
    };

    const pararTudo = useCallback(() => {
        pararRef.current = true;
        if (temSpeech) window.speechSynthesis.cancel();
        if (audioARef.current) {
            audioARef.current.pause();
            audioARef.current.onended = null;
            audioARef.current.onerror = null;
            audioARef.current.oncanplaythrough = null;
        }
        if (audioBRef.current) {
            audioBRef.current.pause();
            audioBRef.current.onended = null;
            audioBRef.current.onerror = null;
            audioBRef.current.oncanplaythrough = null;
        }
        nextReadyRef.current = false;
        if (onVerseChangeRef.current) onVerseChangeRef.current(null);
    }, [temSpeech]);

    useEffect(() => {
        return () => pararTudo();
    }, [pararTudo]);

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
        const active = getActive();
        if (!active) return;

        // Se o próximo já está pré-carregado neste elemento, usa ele direto
        if (nextReadyRef.current && active.src && active.readyState >= 3) {
            // Já está pronto — toca direto
        } else {
            active.src = url;
            active.playbackRate = rateRef.current;
            active.load();
        }

        active.onended = () => {
            if (pararRef.current) return;
            // Troca o buffer ativo
            activeRef.current = activeRef.current === 'A' ? 'B' : 'A';
            proximo(idx + 1);
        };
        active.onerror = () => {
            if (!pararRef.current) falarTTS(versiculosRef.current[idx]?.text || '', idx);
        };
        active.play().catch(() => {
            if (!pararRef.current) falarTTS(versiculosRef.current[idx]?.text || '', idx);
        });

        // Pré-carrega o próximo no elemento inativo
        prepararProximo(idx + 1);
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
            if (url) {
                // Se o próximo elemento já tem este URL pré-carregado, usa ele
                const next = getActive();
                if (nextReadyRef.current && next && next.readyState >= 3) {
                    next.playbackRate = rateRef.current;
                    next.onended = () => {
                        if (pararRef.current) return;
                        activeRef.current = activeRef.current === 'A' ? 'B' : 'A';
                        proximo(idx + 1);
                    };
                    next.onerror = () => {
                        if (!pararRef.current) falarTTS(versiculosRef.current[idx]?.text || '', idx);
                    };
                    next.play().catch(() => {
                        if (!pararRef.current) falarTTS(versiculosRef.current[idx]?.text || '', idx);
                    });
                    nextReadyRef.current = false;
                    prepararProximo(idx + 1);
                    return;
                }
                tocarUrl(url, idx);
                return;
            }
        }
        falarTTS(v.text, idx);
    };

    const iniciar = async () => {
        const lista = versiculosRef.current;
        if (lista.length === 0) return;
        pararRef.current = false;
        rateRef.current = VELOCIDADES[velocidadeIdx];

        // Cria os dois elementos de áudio no handler de clique (autoplay)
        if (!audioARef.current) audioARef.current = new Audio();
        if (!audioBRef.current) audioBRef.current = new Audio();
        activeRef.current = 'A';
        nextReadyRef.current = false;

        setEstado('carregando');

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

                    // Pré-carrega o versículo 0 no elemento A
                    const v0 = lista[0];
                    const url0 = m.get(v0.verse);
                    if (url0 && audioARef.current) {
                        audioARef.current.src = url0;
                        audioARef.current.playbackRate = rateRef.current;
                        audioARef.current.load();
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
            if (modoRef.current === 'neural') {
                getActive()?.pause();
            } else if (temSpeech) window.speechSynthesis.pause();
            setEstado('pausado');
        } else if (estado === 'pausado') {
            if (modoRef.current === 'neural') {
                getActive()?.play().catch(() => {});
            } else if (temSpeech) window.speechSynthesis.resume();
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
        if (modoRef.current === 'neural') {
            const active = getActive();
            if (active) active.playbackRate = rateRef.current;
            const next = getNext();
            if (next) next.playbackRate = rateRef.current;
        } else if (temSpeech) {
            window.speechSynthesis.cancel();
            falarTTS(versiculosRef.current[idxRef.current]?.text || '', idxRef.current);
        }
    };

    if (estado === 'indisponivel') return null;

    const total = versiculos.length;
    const progresso = total > 0 ? ((posicao + 1) / total) * 100 : 0;

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
