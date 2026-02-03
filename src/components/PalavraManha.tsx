'use client';

import { useState, useEffect } from 'react';
import { Copy, RefreshCw, Sun, Check, Loader2, Share2, Sparkles, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getDataHoje, getPalavraManha, gerarPalavraManha, type PalavraManhaCache } from '@/lib/supabase';

interface PalavraManhaProps {
    passagemDia?: string;
}

export function PalavraManha({ passagemDia }: PalavraManhaProps) {
    const [data, setData] = useState<PalavraManhaCache | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

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

    const handleCopy = () => {
        if (!data) return;

        // Formata para compartilhar
        const textoShare = `🌅 *PALAVRA DA MANHÃ*\n${data.dia_semana} • ${new Date().toLocaleDateString('pt-BR')}\n\n${data.mensagem}\n\n📲 _Devocional PVC_`;

        navigator.clipboard.writeText(textoShare);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-purple-500/5 rounded-3xl blur-2xl -z-10 opacity-50"></div>

            <div className="glass-panel rounded-3xl p-6 md:p-8 border border-white/10 relative overflow-hidden">
                {/* Header do Card */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getBadgeColor(data.categoria)}`}>
                            <Sun className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                                {data.dia_semana} • {data.categoria}
                            </span>
                            {/* Se for dia de Passagem do Dia, mostra referência extra */}
                            {data.passagem_ref && (
                                <span className="text-xs text-amber-400 font-medium flex items-center gap-1">
                                    <BookOpen className="w-3 h-3" />
                                    Ref: {data.passagem_ref}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCopy}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${copied
                                    ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5'
                                }`}
                        >
                            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {copied ? 'Copiado' : 'Copiar'}
                        </button>
                    </div>
                </div>

                {/* Conteúdo */}
                <div className="prose prose-invert max-w-none prose-p:text-slate-300 prose-headings:text-amber-100 prose-blockquote:border-amber-500/50 prose-blockquote:bg-amber-500/5 prose-blockquote:px-4 prose-blockquote:py-1">
                    <ReactMarkdown>{data.mensagem}</ReactMarkdown>
                </div>

                {/* Footer Decorativo */}
                <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center text-[10px] text-slate-500 uppercase tracking-widest">
                    <span>Inspirado em seu DNA</span>
                    <Sparkles className="w-3 h-3 text-amber-500/30" />
                </div>
            </div>
        </div>
    );
}
