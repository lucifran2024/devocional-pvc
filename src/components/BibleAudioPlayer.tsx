'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Headphones, Play, Pause, Square, Loader2 } from 'lucide-react';

// ============================================
// PLAYER DE ÁUDIO BÍBLICO (opcional) — voz do navegador
// Botão "Ouvir" discreto. Usa a Web Speech API (speechSynthesis),
// gratuita e nativa do dispositivo, em português (pt-BR).
// Lê versículo por versículo: a cada versículo avisa qual está sendo
// lido (onVerseChange) para o destaque tipo "legenda" na página.
// Se o aparelho não tiver síntese de voz, o botão fica oculto.
// ============================================

interface VersiculoFala {
    verse: number;
    text: string;
    chapter?: number;
}

const VELOCIDADES = [1, 0.85, 1.25, 1.5];

// Limpa marcações para a leitura soar natural (negrito, números soltos, etc.)
function limparTexto(t: string): string {
    return t
        .replace(/\*\*/g, '')
        .replace(/[*_#`>]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

export function BibleAudioPlayer({
    versiculos,
    capitulo,
    onVerseChange,
    className = '',
}: {
    versiculos: VersiculoFala[];
    capitulo: number;
    onVerseChange?: (verse: number | null, chapter?: number) => void;
    className?: string;
}) {
    const [estado, setEstado] = useState<'fechado' | 'tocando' | 'pausado' | 'indisponivel'>('fechado');
    const [posicao, setPosicao] = useState(0); // índice do versículo atual
    const [velocidadeIdx, setVelocidadeIdx] = useState(0);
    const [vozPronta, setVozPronta] = useState(false);

    const idxRef = useRef(0);
    const pararRef = useRef(false);
    const estadoRef = useRef(estado);
    estadoRef.current = estado;
    const rateRef = useRef(VELOCIDADES[0]);
    const vozRef = useRef<SpeechSynthesisVoice | null>(null);
    const versiculosRef = useRef<VersiculoFala[]>(versiculos);
    versiculosRef.current = versiculos;
    const onVerseChangeRef = useRef(onVerseChange);
    onVerseChangeRef.current = onVerseChange;
    const capituloRef = useRef(capitulo);
    capituloRef.current = capitulo;

    // Escolhe a melhor voz pt disponível (prefere pt-BR e vozes "Google"/naturais)
    const escolherVoz = useCallback(() => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return null;
        const vozes = window.speechSynthesis.getVoices();
        const pt = vozes.filter((v) => v.lang && v.lang.toLowerCase().startsWith('pt'));
        if (pt.length === 0) return null;
        const ptBR = pt.filter((v) => v.lang.toLowerCase().replace('_', '-') === 'pt-br');
        const pool = ptBR.length ? ptBR : pt;
        const natural =
            pool.find((v) => /google/i.test(v.name)) ||
            pool.find((v) => /natural|premium|online/i.test(v.name));
        return natural || pool[0];
    }, []);

    // Detecta suporte e carrega as vozes (que chegam de forma assíncrona)
    useEffect(() => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
            setEstado('indisponivel');
            return;
        }
        const carregar = () => {
            vozRef.current = escolherVoz();
            setVozPronta(true);
        };
        carregar();
        window.speechSynthesis.addEventListener('voiceschanged', carregar);
        return () => {
            window.speechSynthesis.removeEventListener('voiceschanged', carregar);
        };
    }, [escolherVoz]);

    const pararTudo = useCallback(() => {
        pararRef.current = true;
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        if (onVerseChangeRef.current) onVerseChangeRef.current(null);
    }, []);

    // Encerra a leitura ao trocar de capítulo/parte (remontagem) ou sair
    useEffect(() => {
        return () => pararTudo();
    }, [pararTudo]);

    const falar = (idx: number) => {
        const lista = versiculosRef.current;
        if (!window.speechSynthesis || idx >= lista.length) {
            // chegou ao fim
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

        const u = new SpeechSynthesisUtterance(limparTexto(v.text));
        u.lang = 'pt-BR';
        if (vozRef.current) u.voice = vozRef.current;
        u.rate = rateRef.current;
        u.onend = () => {
            if (pararRef.current) return;
            // pequena folga para o motor de voz respirar entre versículos
            falar(idx + 1);
        };
        u.onerror = () => {
            if (pararRef.current) return;
            falar(idx + 1);
        };
        window.speechSynthesis.speak(u);
    };

    const iniciar = () => {
        if (!window.speechSynthesis || versiculosRef.current.length === 0) return;
        window.speechSynthesis.cancel(); // limpa qualquer fila pendente
        pararRef.current = false;
        rateRef.current = VELOCIDADES[velocidadeIdx];
        setEstado('tocando');
        // alguns navegadores precisam de um tique antes de aceitar speak()
        falar(0);
    };

    const alternarPlay = () => {
        if (!window.speechSynthesis) return;
        if (estado === 'tocando') {
            window.speechSynthesis.pause();
            setEstado('pausado');
        } else if (estado === 'pausado') {
            window.speechSynthesis.resume();
            setEstado('tocando');
        }
    };

    const parar = () => {
        pararTudo();
        setEstado('fechado');
        setPosicao(0);
        idxRef.current = 0;
        // libera para um novo play
        setTimeout(() => { pararRef.current = false; }, 50);
    };

    const mudarVelocidade = () => {
        const novoIdx = (velocidadeIdx + 1) % VELOCIDADES.length;
        setVelocidadeIdx(novoIdx);
        rateRef.current = VELOCIDADES[novoIdx];
        // aplica já no versículo atual: recomeça a fala dele com a nova velocidade
        if (estado === 'tocando' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            falar(idxRef.current);
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
                    disabled={!vozPronta || total === 0}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-400/50 text-amber-700 dark:text-amber-300 text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-50"
                    title="Ouvir este capítulo (voz do dispositivo)"
                >
                    <Headphones className="w-4 h-4" />
                    Ouvir
                </button>
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
                    className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-amber-500 hover:bg-amber-400 text-black transition-colors"
                    title={estado === 'tocando' ? 'Pausar' : 'Continuar'}
                >
                    {estado === 'tocando'
                        ? <Pause className="w-4 h-4" />
                        : <Play className="w-4 h-4 ml-0.5" />}
                </button>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 tabular-nums">
                            Versículo {posicao + 1} de {total}
                        </span>
                        {estado === 'pausado' && (
                            <span className="text-[10px] text-text-muted">pausado</span>
                        )}
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                        <div
                            className="h-full bg-amber-500 rounded-full transition-all duration-300"
                            style={{ width: `${progresso}%` }}
                        />
                    </div>
                </div>

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
                    onClick={parar}
                    className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-1 transition-colors"
                    title="Parar"
                >
                    <Square className="w-3.5 h-3.5" />
                </button>
            </div>
            <p className="mt-1 text-[10px] text-text-muted text-center">
                🔊 Voz do dispositivo · toque em ▶ para ouvir
            </p>
        </div>
    );
}
