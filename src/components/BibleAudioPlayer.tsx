'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Headphones, Play, Pause, X, Loader2, SkipBack, SkipForward, Check, ChevronUp } from 'lucide-react';
import { VOZES_NARRACAO, lerVozSalva, salvarVozNarracao, nomeDaVoz, VOZ_PADRAO } from '@/lib/vozes-narracao';

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

type Estado = 'fechado' | 'carregando' | 'tocando' | 'pausado';

const VELOCIDADES = [1, 0.85, 1.25, 1.5];

function limparTexto(t: string): string {
    return t
        .replace(/<br\s*\/?>/gi, ' ')
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
    livroNome,
    onVerseChange,
    className = '',
}: {
    versiculos: VersiculoFala[];
    capitulo: number;
    livroId: number;
    livroNome?: string;
    onVerseChange?: (verse: number | null, chapter?: number) => void;
    className?: string;
}) {
    const [estado, setEstado] = useState<Estado>('fechado');
    const [posicao, setPosicao] = useState(0);
    const [velocidadeIdx, setVelocidadeIdx] = useState(0);
    const [voz, setVoz] = useState(() => (typeof window === 'undefined' ? VOZ_PADRAO : lerVozSalva()));
    const [menuVoz, setMenuVoz] = useState(false);
    const [modo, setModo] = useState<'neural' | 'navegador'>('neural');
    const [demorando, setDemorando] = useState(false);

    const idxRef = useRef(0);
    const pararRef = useRef(false);
    const geracaoRef = useRef(0); // invalida falas antigas da voz do aparelho
    const modoRef = useRef<'neural' | 'navegador'>('neural');
    const rateRef = useRef(VELOCIDADES[0]);
    const vozNavegadorRef = useRef<SpeechSynthesisVoice | null>(null);
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

    const escolherVozNavegador = useCallback(() => {
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
        const carregar = () => { vozNavegadorRef.current = escolherVozNavegador(); };
        carregar();
        window.speechSynthesis.addEventListener('voiceschanged', carregar);
        return () => window.speechSynthesis.removeEventListener('voiceschanged', carregar);
    }, [temSpeech, escolherVozNavegador]);

    const avisarVerso = (listIdx: number) => {
        const v = versiculosRef.current[listIdx];
        if (onVerseChangeRef.current && v) onVerseChangeRef.current(v.verse, v.chapter ?? capituloRef.current);
    };

    const pararTudo = useCallback(() => {
        pararRef.current = true;
        geracaoRef.current += 1;
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

    useEffect(() => () => pararTudo(), [pararTudo]);

    const fechar = useCallback(() => {
        pararTudo();
        setEstado('fechado');
        setMenuVoz(false);
        setPosicao(0);
        idxRef.current = 0;
        if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) navigator.mediaSession.playbackState = 'none';
    }, [pararTudo]);

    // --- Voz do aparelho (sem internet ou se a narração falhar) ---
    const falarDoAparelho = (idx: number) => {
        if (pararRef.current) return;
        const lista = versiculosRef.current;
        if (idx >= lista.length) { fechar(); return; }
        idxRef.current = idx;
        setPosicao(idx);
        avisarVerso(idx);
        const geracao = geracaoRef.current;
        const u = new SpeechSynthesisUtterance(limparTexto(lista[idx].text));
        u.lang = 'pt-BR';
        if (vozNavegadorRef.current) u.voice = vozNavegadorRef.current;
        u.rate = rateRef.current;
        const seguir = () => { if (!pararRef.current && geracao === geracaoRef.current) falarDoAparelho(idx + 1); };
        u.onend = seguir;
        u.onerror = seguir;
        window.speechSynthesis.speak(u);
    };

    const usarVozDoAparelho = (desde: number) => {
        if (!temSpeech) { fechar(); return; }
        modoRef.current = 'navegador';
        setModo('navegador');
        setEstado('tocando');
        geracaoRef.current += 1;
        window.speechSynthesis.cancel();
        falarDoAparelho(desde);
    };

    // --- Marcação do versículo pelo tempo do áudio ---
    const atualizarVerso = (segIdx: number) => {
        lastSegIdxRef.current = segIdx;
        const seg = segmentsRef.current[segIdx];
        if (!seg || seg.listIdx < 0) return;
        idxRef.current = seg.listIdx;
        setPosicao(seg.listIdx);
        avisarVerso(seg.listIdx);
    };

    const onTimeUpdate = () => {
        if (pararRef.current || !audioRef.current) return;
        const ct = audioRef.current.currentTime;
        const segs = segmentsRef.current;
        const last = lastSegIdxRef.current;
        if (last >= 0 && last < segs.length && ct >= segs[last].start && ct < segs[last].end) return;
        if (last + 1 < segs.length && ct >= segs[last + 1].start && ct < segs[last + 1].end) {
            atualizarVerso(last + 1);
            return;
        }
        const idx = segs.findIndex(s => ct >= s.start && ct < s.end);
        if (idx >= 0 && idx !== last) atualizarVerso(idx);
        else if (idx < 0 && segs.length > 0 && ct >= segs[segs.length - 1].start) atualizarVerso(segs.length - 1);
    };

    const iniciar = async (desde = 0, vozEscolhida = voz) => {
        const lista = versiculosRef.current;
        if (lista.length === 0) return;
        pararTudo();
        pararRef.current = false;
        rateRef.current = VELOCIDADES[velocidadeIdx];
        modoRef.current = 'neural';
        setModo('neural');
        setMenuVoz(false);
        if (!audioRef.current) audioRef.current = new Audio();
        setEstado('carregando');

        let neural = false;
        try {
            const resp = await fetch('/api/bible-audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    livroId,
                    capitulo,
                    voz: vozEscolhida,
                    verses: lista.map((v) => ({ verse: v.verse, text: v.text, chapter: v.chapter })),
                }),
            });
            if (resp.ok) {
                const data = await resp.json();
                if (data.ok && data.fullUrl && Array.isArray(data.segments)) {
                    // Casamento SEQUENCIAL segmento → lista: a parte do plano pode
                    // cruzar capítulos e repetir o número (Gn 4:26 e Gn 5:26).
                    let ponteiro = 0;
                    segmentsRef.current = data.segments.map((s: { verse: number; chapter?: number; start: number; end: number }) => {
                        const vNum = Number(s.verse);
                        const cap = s.chapter ? Number(s.chapter) : undefined;
                        const bate = (v: VersiculoFala) => v.verse === vNum && (!cap || !v.chapter || v.chapter === cap);
                        let idx = -1;
                        for (let i = ponteiro; i < lista.length; i++) {
                            if (bate(lista[i])) { idx = i; break; }
                        }
                        if (idx === -1) idx = lista.findIndex(bate);
                        if (idx >= 0) ponteiro = idx + 1;
                        return { verse: vNum, start: Number(s.start), end: Number(s.end), listIdx: idx };
                    });
                    audioRef.current.src = data.fullUrl;
                    audioRef.current.playbackRate = rateRef.current;
                    neural = true;
                }
            }
        } catch {
            /* sem internet: voz do aparelho */
        }

        if (pararRef.current) return;
        if (!neural) { usarVozDoAparelho(desde); return; }

        const audio = audioRef.current;
        audio.ontimeupdate = onTimeUpdate;
        audio.onended = () => { if (!pararRef.current) fechar(); };
        audio.onerror = () => { if (!pararRef.current) usarVozDoAparelho(idxRef.current); };

        const segInicial = segmentsRef.current.findIndex(s => s.listIdx === desde);
        if (segInicial > 0) {
            const pular = () => { audio.currentTime = segmentsRef.current[segInicial].start; };
            if (audio.readyState >= 1) pular();
            else audio.addEventListener('loadedmetadata', pular, { once: true });
        }
        idxRef.current = desde;
        setPosicao(desde);
        avisarVerso(desde);
        setEstado('tocando');
        audio.play().catch(() => { if (!pararRef.current) usarVozDoAparelho(desde); });
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

    const irPara = (listIdx: number) => {
        const lista = versiculosRef.current;
        const alvo = Math.max(0, Math.min(lista.length - 1, listIdx));
        if (modoRef.current === 'neural' && audioRef.current) {
            const segIdx = segmentsRef.current.findIndex(s => s.listIdx === alvo);
            if (segIdx < 0) return;
            audioRef.current.currentTime = segmentsRef.current[segIdx].start;
            atualizarVerso(segIdx);
            if (estado === 'pausado') { audioRef.current.play().catch(() => {}); setEstado('tocando'); }
        } else if (temSpeech) {
            geracaoRef.current += 1;
            window.speechSynthesis.cancel();
            setEstado('tocando');
            falarDoAparelho(alvo);
        }
    };

    const mudarVelocidade = () => {
        const novoIdx = (velocidadeIdx + 1) % VELOCIDADES.length;
        setVelocidadeIdx(novoIdx);
        rateRef.current = VELOCIDADES[novoIdx];
        if (modoRef.current === 'neural' && audioRef.current) {
            audioRef.current.playbackRate = rateRef.current;
        } else if (temSpeech && estado === 'tocando') {
            geracaoRef.current += 1;
            window.speechSynthesis.cancel();
            falarDoAparelho(idxRef.current);
        }
    };

    const trocarVoz = (id: string) => {
        salvarVozNarracao(id);
        setVoz(id);
        setMenuVoz(false);
        if (estado !== 'fechado' && id !== voz) iniciar(idxRef.current, id);
    };

    const alternarPlayRef = useRef(alternarPlay);
    const irParaRef = useRef(irPara);
    const fecharRef = useRef(fechar);
    useEffect(() => {
        alternarPlayRef.current = alternarPlay;
        irParaRef.current = irPara;
        fecharRef.current = fechar;
    });

    // Primeira vez num capítulo longo: a narração leva alguns segundos.
    useEffect(() => {
        if (estado !== 'carregando') return;
        const timer = setTimeout(() => setDemorando(true), 6000);
        return () => { clearTimeout(timer); setDemorando(false); };
    }, [estado]);

    const total = versiculos.length;
    const ativo = estado !== 'fechado';
    const progresso = total > 0 ? ((posicao + 1) / total) * 100 : 0;
    const versoAtual = versiculos[posicao];
    const capAtual = versoAtual?.chapter ?? capitulo;
    const referencia = livroNome ? `${livroNome} ${capAtual}` : `Capítulo ${capAtual}`;

    // Controles na tela bloqueada e nos fones (Media Session)
    useEffect(() => {
        if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || estado === 'fechado') return;
        const ms = navigator.mediaSession;
        try {
            ms.metadata = new MediaMetadata({
                title: referencia,
                artist: `Bíblia NTLH · ${nomeDaVoz(voz)}`,
                album: 'PVC Bíblia',
                artwork: [{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' }],
            });
            ms.playbackState = estado === 'pausado' ? 'paused' : 'playing';
            ms.setActionHandler('play', () => alternarPlayRef.current());
            ms.setActionHandler('pause', () => alternarPlayRef.current());
            ms.setActionHandler('previoustrack', () => irParaRef.current(idxRef.current - 1));
            ms.setActionHandler('nexttrack', () => irParaRef.current(idxRef.current + 1));
            ms.setActionHandler('stop', () => fecharRef.current());
        } catch {
            // navegador sem suporte completo
        }
    }, [estado, referencia, voz]);

    const barra = ativo && typeof document !== 'undefined' ? createPortal(
        <div
            role="region"
            aria-label="Narração da Bíblia"
            className="fixed z-40 left-1/2 -translate-x-1/2 md:left-[calc(50%+44px)] w-[min(28rem,calc(100%-1.5rem))] bottom-[calc(var(--altura-nav-inferior,0px)+0.75rem)] animate-in slide-in-from-bottom-2 duration-200"
            data-player-biblia
        >
            {menuVoz && (
                <div className="mb-2 rounded-2xl border border-border-subtle bg-surface-1 shadow-xl p-1.5" role="listbox" aria-label="Voz da narração">
                    <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">Voz da narração</p>
                    {VOZES_NARRACAO.map((v) => (
                        <button
                            key={v.id}
                            type="button"
                            role="option"
                            aria-selected={v.id === voz}
                            onClick={() => trocarVoz(v.id)}
                            className="w-full flex items-center justify-between gap-3 px-2.5 py-2 rounded-xl text-left hover:bg-surface-2 transition-colors"
                        >
                            <span>
                                <span className="block text-sm font-semibold text-text-primary">{v.nome}</span>
                                <span className="block text-xs text-text-muted">{v.descricao}</span>
                            </span>
                            {v.id === voz && <Check className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />}
                        </button>
                    ))}
                </div>
            )}
            <div className="rounded-2xl border border-border-subtle bg-surface-1 shadow-xl overflow-hidden">
                <div className="flex items-center gap-1 px-2 pt-2 pb-1.5">
                    <button
                        type="button"
                        onClick={() => irPara(posicao - 1)}
                        disabled={estado === 'carregando' || posicao === 0}
                        className="w-10 h-10 flex items-center justify-center rounded-full text-text-secondary hover:bg-surface-2 disabled:opacity-40"
                        aria-label="Versículo anterior"
                    >
                        <SkipBack className="w-[18px] h-[18px]" />
                    </button>
                    <button
                        type="button"
                        onClick={alternarPlay}
                        disabled={estado === 'carregando'}
                        className="w-11 h-11 flex items-center justify-center rounded-full bg-amber-500 hover:bg-amber-400 text-amber-950 transition-colors disabled:opacity-70"
                        aria-label={estado === 'tocando' ? 'Pausar' : 'Continuar'}
                    >
                        {estado === 'carregando'
                            ? <Loader2 className="w-5 h-5 animate-spin" />
                            : estado === 'tocando'
                                ? <Pause className="w-5 h-5" />
                                : <Play className="w-5 h-5 ml-0.5" />}
                    </button>
                    <button
                        type="button"
                        onClick={() => irPara(posicao + 1)}
                        disabled={estado === 'carregando' || posicao >= total - 1}
                        className="w-10 h-10 flex items-center justify-center rounded-full text-text-secondary hover:bg-surface-2 disabled:opacity-40"
                        aria-label="Próximo versículo"
                    >
                        <SkipForward className="w-[18px] h-[18px]" />
                    </button>

                    <div className="flex-1 min-w-0 pl-1.5">
                        <p className="text-[13px] font-semibold text-text-primary truncate tabular-nums" aria-live="polite">
                            {estado === 'carregando'
                                ? 'Preparando a narração…'
                                : `${referencia}:${versoAtual?.verse ?? posicao + 1}`}
                        </p>
                        <button
                            type="button"
                            onClick={() => setMenuVoz((m) => !m)}
                            className="inline-flex items-center gap-0.5 text-xs text-text-muted hover:text-text-primary"
                            aria-expanded={menuVoz}
                            aria-label="Escolher a voz da narração"
                        >
                            {estado === 'carregando' && demorando
                                ? 'Na primeira vez demora; depois fica guardado'
                                : modo === 'navegador' ? 'Voz do aparelho' : `Voz: ${nomeDaVoz(voz)}`}
                            <ChevronUp className={`w-3.5 h-3.5 transition-transform ${menuVoz ? '' : 'rotate-180'}`} />
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={mudarVelocidade}
                        disabled={estado === 'carregando'}
                        className="shrink-0 min-w-[2.75rem] h-9 px-2 rounded-lg text-xs font-bold text-text-secondary hover:bg-surface-2 tabular-nums disabled:opacity-50"
                        aria-label="Velocidade da narração"
                    >
                        {VELOCIDADES[velocidadeIdx]}x
                    </button>
                    <button
                        type="button"
                        onClick={fechar}
                        className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-2"
                        aria-label="Fechar a narração"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="h-1 bg-surface-2" aria-hidden="true">
                    <div
                        className="h-full bg-amber-500 transition-all duration-300"
                        style={{ width: `${estado === 'carregando' ? 4 : progresso}%` }}
                    />
                </div>
            </div>
        </div>,
        document.body,
    ) : null;

    return (
        <div className={className}>
            <button
                type="button"
                onClick={() => (ativo ? undefined : iniciar(0))}
                disabled={total === 0 || ativo}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-400/50 text-amber-700 dark:text-amber-300 text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-60"
                aria-label={ativo ? 'Narração em andamento' : 'Ouvir este capítulo'}
            >
                <Headphones className="w-4 h-4" />
                {ativo ? 'Ouvindo…' : 'Ouvir'}
            </button>
            {barra}
        </div>
    );
}
