'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Headphones, Play, Pause, Loader2, X } from 'lucide-react';

// ============================================
// PLAYER DE ÁUDIO BÍBLICO (opcional)
// Botão "Ouvir" discreto — quem não quiser, segue lendo normal.
// Usa /api/bible-audio (Bible Brain: narração humana profissional).
// Destaca o versículo atual via timestamps (quando disponíveis).
// ============================================

interface Timestamp {
    verse: number;
    start: number;
}

interface AudioData {
    audioUrl: string;
    timestamps: Timestamp[];
    fonte: string;
}

const VELOCIDADES = [1, 1.25, 1.5, 0.85];

export function BibleAudioPlayer({
    livroId,
    capitulo,
    onVerseChange,
    className = '',
}: {
    livroId: number;
    capitulo: number;
    onVerseChange?: (verse: number | null) => void;
    className?: string;
}) {
    const [estado, setEstado] = useState<'fechado' | 'carregando' | 'tocando' | 'pausado' | 'erro' | 'oculto'>('fechado');
    const [progresso, setProgresso] = useState(0);
    const [duracao, setDuracao] = useState(0);
    const [velocidadeIdx, setVelocidadeIdx] = useState(0);
    const [fonte, setFonte] = useState('');

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const timestampsRef = useRef<Timestamp[]>([]);
    const verseAtualRef = useRef<number | null>(null);
    const onVerseChangeRef = useRef(onVerseChange);
    onVerseChangeRef.current = onVerseChange;

    const limpar = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
            audioRef.current = null;
        }
        timestampsRef.current = [];
        if (verseAtualRef.current !== null) {
            verseAtualRef.current = null;
            onVerseChangeRef.current?.(null);
        }
        setProgresso(0);
        setDuracao(0);
    }, []);

    // Ao trocar de livro/capítulo, encerra o player
    useEffect(() => {
        return () => limpar();
    }, [livroId, capitulo, limpar]);

    useEffect(() => {
        setEstado('fechado');
    }, [livroId, capitulo]);

    const atualizarVersiculo = useCallback((tempo: number) => {
        const ts = timestampsRef.current;
        if (ts.length === 0) return;
        let atual: number | null = null;
        for (const t of ts) {
            if (tempo >= t.start) atual = t.verse;
            else break;
        }
        if (atual !== verseAtualRef.current) {
            verseAtualRef.current = atual;
            onVerseChangeRef.current?.(atual);
        }
    }, []);

    const iniciar = async () => {
        setEstado('carregando');
        try {
            const resp = await fetch(`/api/bible-audio?livroId=${livroId}&capitulo=${capitulo}`);
            const data = await resp.json();
            if (!resp.ok || !data.ok || !data.audioUrl) {
                // 503 = chave da API não configurada — esconde o recurso por completo
                setEstado(resp.status === 503 ? 'oculto' : 'erro');
                return;
            }

            const dados = data as AudioData;
            timestampsRef.current = dados.timestamps || [];
            setFonte(dados.fonte || '');

            const audio = new Audio(dados.audioUrl);
            audioRef.current = audio;
            audio.playbackRate = VELOCIDADES[velocidadeIdx];

            audio.addEventListener('loadedmetadata', () => setDuracao(audio.duration || 0));
            audio.addEventListener('timeupdate', () => {
                setProgresso(audio.currentTime);
                atualizarVersiculo(audio.currentTime);
            });
            audio.addEventListener('ended', () => {
                setEstado('pausado');
                if (verseAtualRef.current !== null) {
                    verseAtualRef.current = null;
                    onVerseChangeRef.current?.(null);
                }
            });
            audio.addEventListener('error', () => setEstado('erro'));

            await audio.play();
            setEstado('tocando');
        } catch {
            setEstado('erro');
        }
    };

    const alternarPlay = () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (estado === 'tocando') {
            audio.pause();
            setEstado('pausado');
        } else {
            audio.play();
            setEstado('tocando');
        }
    };

    const fechar = () => {
        limpar();
        setEstado('fechado');
    };

    const mudarVelocidade = () => {
        const novoIdx = (velocidadeIdx + 1) % VELOCIDADES.length;
        setVelocidadeIdx(novoIdx);
        if (audioRef.current) audioRef.current.playbackRate = VELOCIDADES[novoIdx];
    };

    const seek = (valor: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = valor;
            setProgresso(valor);
            atualizarVersiculo(valor);
        }
    };

    const fmt = (s: number) => {
        if (!Number.isFinite(s)) return '0:00';
        const m = Math.floor(s / 60);
        const seg = Math.floor(s % 60);
        return `${m}:${String(seg).padStart(2, '0')}`;
    };

    if (estado === 'oculto') return null;

    // Botão discreto (estado inicial / erro)
    if (estado === 'fechado' || estado === 'erro') {
        return (
            <div className={className}>
                <button
                    type="button"
                    onClick={iniciar}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-400/50 text-amber-700 dark:text-amber-300 text-sm font-semibold transition-all active:scale-[0.97]"
                    title="Ouvir este capítulo (narração profissional)"
                >
                    <Headphones className="w-4 h-4" />
                    Ouvir
                </button>
                {estado === 'erro' && (
                    <p className="mt-1.5 text-[11px] text-text-muted">
                        Áudio indisponível para este capítulo no momento.
                    </p>
                )}
            </div>
        );
    }

    // Barra do player (ativa)
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

                <span className="text-[11px] text-text-muted tabular-nums shrink-0">
                    {fmt(progresso)}
                </span>

                <input
                    type="range"
                    min={0}
                    max={duracao || 0}
                    step={1}
                    value={progresso}
                    onChange={(e) => seek(Number(e.target.value))}
                    className="flex-1 min-w-0 h-1.5 accent-amber-500 cursor-pointer"
                    aria-label="Posição do áudio"
                />

                <span className="text-[11px] text-text-muted tabular-nums shrink-0">
                    {fmt(duracao)}
                </span>

                <button
                    type="button"
                    onClick={mudarVelocidade}
                    className="shrink-0 px-2 py-1 rounded-lg text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/15 transition-colors tabular-nums"
                    title="Velocidade"
                >
                    {VELOCIDADES[velocidadeIdx]}x
                </button>

                <button
                    type="button"
                    onClick={fechar}
                    className="shrink-0 p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-1 transition-colors"
                    title="Fechar player"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
            {fonte && (
                <p className="mt-1 text-[10px] text-text-muted text-center truncate">
                    🎧 {fonte}
                </p>
            )}
        </div>
    );
}
