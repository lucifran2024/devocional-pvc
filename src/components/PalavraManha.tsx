'use client';

import { useState, useEffect } from 'react';
import { Copy, Sun, Check, Loader2, Sparkles, BookOpen, Heart, PlayCircle, PauseCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getDataHoje, getPalavraManha, gerarPalavraManha, darAmen, type PalavraManhaCache } from '@/lib/supabase';

interface PalavraManhaProps {
    passagemDia?: string;
}

export function PalavraManha({ passagemDia }: PalavraManhaProps) {
    const [data, setData] = useState<PalavraManhaCache | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [amei, setAmei] = useState(false); // Estado local do feedback
    const [isPlaying, setIsPlaying] = useState(false); // Áudio TTS

    async function loadData() {
        setLoading(true);
        const hoje = getDataHoje();

        try {
            // 1. Tenta cache local
            const cache = await getPalavraManha(hoje);

            if (cache) {
                setData(cache);
                setLoading(false);
            } else {
                // 2. Se não tem cache, gera
                console.log('🌅 [PALAVRA] Gerando nova mensagem...');
                await handleGenerate();
            }
        } catch (err) {
            console.error(err);
            setError('Falha ao carregar Palavra da Manhã.');
            setLoading(false);
        }
    }

    async function handleGenerate() {
        setGenerating(true);
        const hoje = getDataHoje();

        const { data: novo, error: err } = await gerarPalavraManha(hoje);

        if (err || !novo) {
            setError('Erro ao gerar mensagem. Tente recarregar.');
        } else {
            setData(novo);
        }

        setLoading(false);
        setGenerating(false);
    }

    useEffect(() => {
        loadData();
        return () => {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    const handleCopy = () => {
        if (!data) return;

        // Formata para compartilhar
        const textoShare = `🌅 *PALAVRA DA MANHÃ*\n${data.dia_semana} • ${new Date().toLocaleDateString('pt-BR')}\n\n${data.mensagem}\n\n📲 _Devocional PVC_`;

        navigator.clipboard.writeText(textoShare);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleAmen = async () => {
        if (!data || amei) return;
        setAmei(true); // Feedback instantâneo na UI

        // Envia para o banco
        const sucesso = await darAmen(data.id);
        if (!sucesso) {
            // Se falhar (raro), deveríamos reverter? 
            // Para UX, melhor manter como "feito" visualmente para não frustrar
        }
    };

    const handlePlayAudio = () => {
        if (!data) return;
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

        if (isPlaying) {
            window.speechSynthesis.cancel();
            setIsPlaying(false);
            return;
        }

        // Limpa o markdown básico para leitura
        const textToRead = data.mensagem.replace(/[*#_]/g, '');

        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.lang = 'pt-BR';
        utterance.rate = 1.0;

        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);

        window.speechSynthesis.speak(utterance);
        setIsPlaying(true);
    };

    if (loading && !data) {
        return (
            <div className="w-full max-w-2xl mx-auto mt-8 p-6 rounded-2xl glass-panel animate-pulse flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                <p className="text-sm text-slate-400 font-medium">Buscando inspiração matinal...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full max-w-2xl mx-auto mt-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                <p className="text-red-400 text-sm">{error}</p>
                <button onClick={loadData} className="mt-2 text-xs text-red-300 underline">Tentar novamente</button>
            </div>
        );
    }

    if (!data) return null;

    // Cores baseadas no formato/dia
    const getBadgeColor = (cat: string) => {
        const map: Record<string, string> = {
            'ORACAO': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
            'VERSICULO': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
            'REFLEXAO': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
            'DEVOCIONAL': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
            'EXORTACAO': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
            'MEDITACAO': 'bg-teal-500/20 text-teal-300 border-teal-500/30',
            'LOUVOR': 'bg-pink-500/20 text-pink-300 border-pink-500/30',
        };
        return map[data.categoria] || 'bg-slate-500/20 text-slate-300';
    };

    return (
        <div className="w-full max-w-3xl mx-auto mt-8 relative group animate-enter">
            {/* Efeito de brilho fundo */}
            <div className="absolute inset-0 bg-gradient-to-r from-accent-primary/5 to-indigo-500/5 rounded-3xl blur-2xl -z-10 opacity-50"></div>

            <div className="glass-panel bg-white/60 dark:bg-surface-1/40 p-6 md:p-8 border border-white/50 dark:border-border-subtle relative overflow-hidden shadow-sm dark:shadow-none">
                {/* Header do Card */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getBadgeColor(data.categoria)}`}>
                            <Sun className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-text-muted">
                                {data.dia_semana} • {data.categoria}
                            </span>
                            {/* Se for dia de Passagem do Dia, mostra referência extra */}
                            {data.passagem_ref && (
                                <span className="text-xs text-amber-600 dark:text-accent-primary font-bold flex items-center gap-1">
                                    <BookOpen className="w-3 h-3" />
                                    Ref: {data.passagem_ref}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleAmen}
                            disabled={amei}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm dark:shadow-none ${amei
                                ? 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-500 border border-rose-500/30 cursor-default'
                                : 'bg-white dark:bg-surface-2 text-slate-600 dark:text-text-secondary hover:bg-rose-50 hover:dark:bg-rose-500/10 hover:text-rose-600 hover:dark:text-rose-500 hover:border-rose-300 hover:dark:border-rose-500/30 border border-slate-200 dark:border-transparent'
                                }`}
                        >
                            <Heart className={`w-3 h-3 ${amei ? 'fill-current' : ''}`} />
                            {amei ? 'Amém!' : 'Amém'}
                        </button>

                        <button
                            onClick={handlePlayAudio}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border border-border-subtle ${isPlaying
                                ? 'bg-amber-500/20 text-amber-500 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)] animate-pulse'
                                : 'bg-surface-2 text-text-secondary hover:bg-amber-500/10 hover:text-amber-500 hover:border-amber-500/30'
                                }`}
                        >
                            {isPlaying ? <PauseCircle className="w-3 h-3" /> : <PlayCircle className="w-3 h-3" />}
                            {isPlaying ? 'Parar' : 'Ouvir'}
                        </button>

                        <button
                            onClick={handleCopy}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm dark:shadow-none ${copied
                                ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-600 border border-green-300 dark:border-green-500/30'
                                : 'bg-white dark:bg-surface-2 text-slate-600 dark:text-text-secondary hover:bg-slate-50 dark:hover:bg-surface-3 hover:text-slate-900 dark:hover:text-text-primary border border-slate-200 dark:border-border-subtle'
                                }`}
                        >
                            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {copied ? 'Copiado' : 'Copiar'}
                        </button>
                    </div>
                </div>

                {/* Conteúdo */}
                <div className="prose prose-sm md:prose-base max-w-none text-slate-700 dark:text-text-secondary prose-headings:text-slate-900 dark:prose-headings:text-text-primary prose-blockquote:border-amber-500/50 dark:prose-blockquote:border-accent-primary/50 prose-blockquote:bg-amber-50 dark:prose-blockquote:bg-accent-primary/5 prose-blockquote:px-4 prose-blockquote:py-1 prose-strong:text-slate-900 dark:prose-strong:text-text-primary">
                    <ReactMarkdown>{data.mensagem}</ReactMarkdown>
                </div>

                {/* Footer Decorativo */}
                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-border-subtle flex justify-between items-center text-[10px] text-slate-500 dark:text-text-muted uppercase tracking-widest font-bold">
                    <span>Inspirado em seu DNA</span>
                    <Sparkles className="w-3 h-3 text-accent-primary/30" />
                </div>
            </div>
        </div>
    );
}
