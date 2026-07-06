'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Headphones, Play, Pause, Square, Loader2 } from 'lucide-react';

interface VersiculoFala {
    verse: number;
    text: string;
    chapter?: number;
}

interface Segmento {
    verse: number;
    start: number;
    end: number;
    listIdx: number;
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
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const segmentsRef = useRef<Segmento[]>([]);
    const lastSegIdxRef = useRef(-1);

    const versiculosRef = useRef<VersiculoFala[]>(versiculos);
    const onVerseChangeRef = useRef(onVerseChange);
    const capituloRef = useRef(capitulo);
    useEffect(() => { versiculosRef.current = versiculos; }, [versiculos]);
    useEffect(() => { onVerseChangeRef.current = onVerseChange; }, [onVerseChange]);
    useEffect(() => { capituloRef.current = capitulo; }, [capitulo]);

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

    const pararTudo = useCallback(() => {
        pararRef.current = true;
        if (temSpeech) window.speechSynthesis.cancel();
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.ontimeupdate = null;
            audioRef.current.onended = null;
            audioRef.current.onerror = null;
        }
        segmentsRef.current = [];
        lastSegIdxRef.current = -1;
        if (onVerseChangeRef.current) onVerseChangeRef.current(null);
    }, [temSpeech]);

    useEffect(() => {
        return () => pararTudo();
    }, [pararTudo]);

    // --- TTS fallback (versículo a versículo) ---
    const falarTTS = (texto: string, idx: number) => {
        if (!temSpeech) { proximoTTS(idx + 1); return; }
        const u = new SpeechSynthesisUtterance(limparTexto(texto));
        u.lang = 'pt-BR';
        if (vozRef.current) u.voice = vozRef.current;
        u.rate = rateRef.current;
        u.onend = () => { if (!pararRef.current) proximoTTS(idx + 1); };
        u.onerror = () => { if (!pararRef.current) proximoTTS(idx + 1); };
        window.speechSynthesis.speak(u);
    };

    const proximoTTS = (idx: number) => {
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
        falarTTS(v.text, idx);
    };

    // --- Tracking do versículo pelo tempo de reprodução ---
    const onTimeUpdate = () => {
        if (pararRef.current || !audioRef.current) return;
        const ct = audioRef.current.currentTime;
        const segs = segmentsRef.current;
        const lista = versiculosRef.current;

        const last = lastSegIdxRef.current;
        // Ainda no mesmo segmento?
        if (last >= 0 && last < segs.length && ct >= segs[last].start && ct < segs[last].end) return;
        // Próximo segmento? (transição mais comum)
        if (last + 1 < segs.length && ct >= segs[last + 1].start && ct < segs[last + 1].end) {
            atualizarVerse(last + 1, lista);
            return;
        }
        // Busca geral
        const idx = segs.findIndex(s => ct >= s.start && ct < s.end);
        if (idx >= 0 && idx !== last) atualizarVerse(idx, lista);
        else if (idx < 0 && segs.length > 0 && ct >= segs[segs.length - 1].start) {
            atualizarVerse(segs.length - 1, lista);
        }
    };

    const atualizarVerse = (segIdx: number, lista: VersiculoFala[]) => {
        lastSegIdxRef.current = segIdx;
        const seg = segmentsRef.current[segIdx];
        if (seg.listIdx < 0) return; // segmento sem versículo correspondente na lista
        idxRef.current = seg.listIdx;
        setPosicao(seg.listIdx);
        const v = lista[seg.listIdx];
        if (onVerseChangeRef.current && v) {
            onVerseChangeRef.current(v.verse, v.chapter ?? capituloRef.current);
        }
    };

    const iniciar = async () => {
        const lista = versiculosRef.current;
        if (lista.length === 0) return;
        pararRef.current = false;
        rateRef.current = VELOCIDADES[velocidadeIdx];
        lastSegIdxRef.current = -1;

        if (!audioRef.current) audioRef.current = new Audio();
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
                if (data.ok && data.fullUrl && Array.isArray(data.segments)) {
                    // Casamento SEQUENCIAL segmento → lista: os segmentos chegam na
                    // mesma ordem dos versículos enviados. Buscar só por número
                    // (findIndex) errava quando a parte cruza capítulos e o mesmo
                    // número aparece duas vezes (ex: Gn 4:26 e Gn 5:26).
                    let ponteiro = 0;
                    segmentsRef.current = data.segments.map((s: { verse: number; start: number; end: number }) => {
                        const vNum = Number(s.verse);
                        let idx = -1;
                        for (let i = ponteiro; i < lista.length; i++) {
                            if (lista[i].verse === vNum) { idx = i; break; }
                        }
                        if (idx === -1) idx = lista.findIndex(v => v.verse === vNum);
                        if (idx >= 0) ponteiro = idx + 1;
                        return { verse: vNum, start: Number(s.start), end: Number(s.end), listIdx: idx };
                    });

                    const audio = audioRef.current!;
                    audio.src = data.fullUrl;
                    audio.playbackRate = rateRef.current;
                    modoRef.current = 'neural';
                    setFonte(data.fonte || 'Voz neural');
                    usouNeural = true;
                }
            }
        } catch {
            /* fallback TTS */
        }

        if (pararRef.current) return;

        if (usouNeural) {
            const audio = audioRef.current!;
            audio.ontimeupdate = onTimeUpdate;
            audio.onended = () => {
                if (pararRef.current) return;
                setEstado('fechado');
                setPosicao(0);
                idxRef.current = 0;
                lastSegIdxRef.current = -1;
                if (onVerseChangeRef.current) onVerseChangeRef.current(null);
            };
            audio.onerror = () => {
                if (!pararRef.current && temSpeech) {
                    modoRef.current = 'navegador';
                    setFonte('Voz do dispositivo');
                    setEstado('tocando');
                    proximoTTS(0);
                }
            };

            idxRef.current = 0;
            setPosicao(0);
            const v0 = lista[0];
            if (onVerseChangeRef.current) onVerseChangeRef.current(v0.verse, v0.chapter ?? capituloRef.current);

            setEstado('tocando');
            audio.play().catch(() => {
                if (!pararRef.current && temSpeech) {
                    modoRef.current = 'navegador';
                    setFonte('Voz do dispositivo');
                    proximoTTS(0);
                }
            });
        } else {
            if (!temSpeech) { setEstado('fechado'); return; }
            modoRef.current = 'navegador';
            setFonte('Voz do dispositivo');
            setEstado('tocando');
            proximoTTS(0);
        }
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
