'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Square, Loader2, Save, Trash2, AlertTriangle, Check, FileAudio } from 'lucide-react';
import { CosmicBackground } from '@/components/ui/CosmicBackground';
import { BackButton } from '@/components/ui/BackButton';
import {
    getTranscricoes, salvarTranscricao, removerTranscricao, atualizarNotasTranscricao,
    uploadAudioCulto, type Transcricao,
} from '@/lib/transcricoes';

type Etapa = 'idle' | 'gravando' | 'processando' | 'pronto';

function escolherMime(): { mime: string; ext: string } {
    const candidatos = [
        { mime: 'audio/mp4', ext: 'mp4' },
        { mime: 'audio/webm;codecs=opus', ext: 'webm' },
        { mime: 'audio/webm', ext: 'webm' },
        { mime: 'audio/ogg', ext: 'ogg' },
    ];
    for (const c of candidatos) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c.mime)) return c;
    }
    return { mime: '', ext: 'webm' };
}

export default function TranscreverCultoPage() {
    const [etapa, setEtapa] = useState<Etapa>('idle');
    const [tempo, setTempo] = useState(0);
    const [erro, setErro] = useState<string | null>(null);
    const [texto, setTexto] = useState('');
    const [titulo, setTitulo] = useState('');
    const [notas, setNotas] = useState('');
    const [salvo, setSalvo] = useState(false);
    const [historico, setHistorico] = useState<Transcricao[]>([]);

    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const extRef = useRef('webm');

    const carregar = useCallback(async () => {
        setHistorico(await getTranscricoes('culto'));
    }, []);
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- carga assíncrona (setState após await)
        carregar();
    }, [carregar]);

    useEffect(() => () => {
        if (timerRef.current) clearInterval(timerRef.current);
        streamRef.current?.getTracks().forEach((t) => t.stop());
    }, []);

    const formatarTempo = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    const iniciar = async () => {
        setErro(null);
        setTexto('');
        setSalvo(false);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const { mime, ext } = escolherMime();
            extRef.current = ext;
            const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
            chunksRef.current = [];
            rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            rec.onstop = processar;
            rec.start();
            recorderRef.current = rec;
            setTempo(0);
            setEtapa('gravando');
            timerRef.current = setInterval(() => setTempo((t) => t + 1), 1000);
        } catch {
            setErro('Não consegui acessar o microfone. Permita o acesso e tente de novo.');
        }
    };

    const parar = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        recorderRef.current?.stop();
        streamRef.current?.getTracks().forEach((t) => t.stop());
    };

    const processar = async () => {
        setEtapa('processando');
        try {
            const blob = new Blob(chunksRef.current, { type: recorderRef.current?.mimeType || `audio/${extRef.current}` });
            const path = await uploadAudioCulto(blob, extRef.current);
            if (!path) { setErro('Falha ao enviar o áudio. Tente novamente.'); setEtapa('idle'); return; }

            const resp = await fetch('/api/transcrever-audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path }),
            });
            const data = await resp.json();
            if (data.ok) {
                setTexto(data.texto);
                setEtapa('pronto');
            } else {
                setErro(data.message || 'Não consegui transcrever o áudio. Tente novamente.');
                setEtapa('idle');
            }
        } catch {
            setErro('Erro ao processar o áudio. Tente novamente.');
            setEtapa('idle');
        }
    };

    const salvar = async () => {
        if (!texto.trim()) return;
        await salvarTranscricao({ tipo: 'culto', titulo: titulo.trim() || 'Culto', texto, notas });
        setSalvo(true);
        setTitulo('');
        setNotas('');
        carregar();
    };

    const excluir = async (id: string) => {
        setHistorico((prev) => prev.filter((t) => t.id !== id));
        await removerTranscricao(id);
    };

    const salvarNota = async (id: string, nova: string) => {
        setHistorico((prev) => prev.map((t) => (t.id === id ? { ...t, notas: nova } : t)));
        await atualizarNotasTranscricao(id, nova);
    };

    return (
        <CosmicBackground className="flex flex-col min-h-screen px-4 sm:px-6 py-8 selection:bg-amber-500/30">
            <div className="max-w-3xl mx-auto w-full space-y-6">
                <BackButton href="/" label="Início" />

                <div className="text-center space-y-2">
                    <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                        <Mic className="w-6 h-6" />
                    </div>
                    <h1 className="reading-serif text-3xl md:text-4xl font-semibold text-text-primary">Gravar e Transcrever</h1>
                    <p className="text-text-muted text-sm">Grave a pregação ao vivo e receba o texto para organizar com suas notas.</p>
                </div>

                {/* Gravador */}
                <div className="rounded-2xl border border-amber-500/25 bg-surface-1 p-6 flex flex-col items-center gap-4">
                    {etapa === 'gravando' ? (
                        <>
                            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                                <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-2xl font-bold tabular-nums">{formatarTempo(tempo)}</span>
                            </div>
                            <button onClick={parar} className="px-8 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-400 flex items-center gap-2">
                                <Square className="w-5 h-5 fill-current" /> Parar e transcrever
                            </button>
                        </>
                    ) : etapa === 'processando' ? (
                        <div className="flex flex-col items-center gap-3 py-4">
                            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                            <p className="text-sm text-text-muted">Enviando e transcrevendo... isso pode levar alguns minutos.</p>
                        </div>
                    ) : (
                        <button onClick={iniciar} className="px-8 py-4 rounded-2xl bg-amber-500 text-amber-950 font-bold hover:bg-amber-400 flex items-center gap-2 shadow-lg shadow-amber-500/15">
                            <Mic className="w-6 h-6" /> Começar a gravar
                        </button>
                    )}
                </div>

                {erro && (
                    <div className="flex items-start gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> <span>{erro}</span>
                    </div>
                )}

                {/* Resultado */}
                {etapa === 'pronto' && (
                    <div className="rounded-2xl border border-amber-500/25 bg-surface-1 p-5 space-y-3">
                        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título (ex: Culto de domingo)"
                            className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border-subtle text-text-primary text-sm font-semibold focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20" />
                        <div>
                            <label className="text-[11px] uppercase tracking-wider text-amber-700/70 dark:text-amber-400/60 font-semibold">Transcrição</label>
                            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={10}
                                className="w-full mt-1 px-3 py-2 rounded-lg bg-surface-2 border border-border-subtle text-text-primary text-sm leading-relaxed resize-y focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20" />
                        </div>
                        <div>
                            <label className="text-[11px] uppercase tracking-wider text-amber-700/70 dark:text-amber-400/60 font-semibold">Suas notas</label>
                            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={4} placeholder="Anotações, pontos principais, aplicações..."
                                className="w-full mt-1 px-3 py-2 rounded-lg bg-surface-2 border border-border-subtle text-text-primary text-sm leading-relaxed resize-y focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20" />
                        </div>
                        <button onClick={salvar} disabled={salvo || !texto.trim()}
                            className="w-full py-3 rounded-xl bg-amber-500 text-amber-950 font-bold hover:bg-amber-400 disabled:opacity-50 flex items-center justify-center gap-2">
                            {salvo ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />} {salvo ? 'Salvo!' : 'Salvar'}
                        </button>
                    </div>
                )}

                {/* Histórico */}
                {historico.length > 0 && (
                    <section className="space-y-3 pt-2">
                        <h2 className="text-sm font-bold text-text-primary">Cultos salvos</h2>
                        {historico.map((t) => (
                            <details key={t.id} className="rounded-2xl border border-border-subtle bg-surface-1 p-4">
                                <summary className="flex items-center justify-between gap-2 cursor-pointer list-none">
                                    <span className="flex items-center gap-2 reading-serif font-semibold text-text-primary text-sm truncate">
                                        <FileAudio className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" /> {t.titulo || 'Culto'}
                                    </span>
                                    <button onClick={(e) => { e.preventDefault(); excluir(t.id); }} className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-500/10 shrink-0">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </summary>
                                <div className="mt-3 space-y-3">
                                    <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap max-h-[40vh] overflow-y-auto">{t.texto}</p>
                                    <div>
                                        <label className="text-[11px] uppercase tracking-wider text-amber-700/70 dark:text-amber-400/60 font-semibold">Notas</label>
                                        <textarea defaultValue={t.notas} onBlur={(e) => salvarNota(t.id, e.target.value)} rows={3} placeholder="Adicione notas..."
                                            className="w-full mt-1 px-3 py-2 rounded-lg bg-surface-2 border border-border-subtle text-text-primary text-sm resize-y focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20" />
                                    </div>
                                </div>
                            </details>
                        ))}
                    </section>
                )}
            </div>
        </CosmicBackground>
    );
}
