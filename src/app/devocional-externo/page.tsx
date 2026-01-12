'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Loader2, RefreshCw, Globe, BookOpen,
    Church, Cross, Newspaper, AlertCircle
} from 'lucide-react';
import { CosmicBackground } from '@/components/ui/CosmicBackground';
import { supabase, getDataHoje } from '@/lib/supabase';
import ReactMarkdown from 'react-markdown';

// ============================================
// FONTES DISPONÍVEIS
// ============================================
const FONTES = [
    {
        id: 'voltemos',
        nome: 'Voltemos ao Evangelho',
        desc: 'Conteúdo reformado e centrado em Cristo.',
        icon: Cross,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/20'
    },
    {
        id: 'bible_gateway',
        nome: 'Bible Gateway',
        desc: 'Versículo do dia com tradução ARC.',
        icon: BookOpen,
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/20'
    },
    {
        id: 'desiring_god',
        nome: 'Solid Joys (John Piper)',
        desc: 'Devocional diário do Desiring God.',
        icon: Church,
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/20'
    },
    {
        id: 'grace_to_you',
        nome: 'Grace to You',
        desc: 'Blog do ministério de John MacArthur.',
        icon: Newspaper,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20'
    }
];

// ============================================
// PÁGINA DEVOCIONAL EXTERNO
// ============================================
export default function DevocionalExternoPage() {
    const [fonteAtiva, setFonteAtiva] = useState<string | null>(null);
    const [carregando, setCarregando] = useState(false);
    const [resultado, setResultado] = useState<string | null>(null);
    const [erro, setErro] = useState<string | null>(null);
    const dataHoje = getDataHoje();

    const buscarDevocional = async (fonteId: string) => {
        setCarregando(true);
        setErro(null);
        setFonteAtiva(fonteId);

        try {
            const { data, error } = await supabase.functions.invoke('execute', {
                body: {
                    modo_id: 'devocional_externo',
                    data: dataHoje,
                    fonte_rss: fonteId
                }
            });

            if (error) throw error;
            if (!data.ok) throw new Error(data.error || 'Erro ao buscar devocional.');

            setResultado(data.resultado);
        } catch (e: any) {
            console.error('Erro:', e);
            setErro(e.message || 'Erro de conexão.');
        } finally {
            setCarregando(false);
        }
    };

    const fonteInfo = FONTES.find(f => f.id === fonteAtiva);

    return (
        <CosmicBackground className="min-h-screen font-sans">

            {/* Header */}
            <header className="sticky top-0 z-50 w-full px-6 py-4 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <Link href="/" className="group p-3 bg-white/5 hover:bg-amber-500/10 border border-white/10 rounded-2xl transition-all">
                        <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-amber-500" />
                    </Link>

                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-500/10 rounded-xl">
                            <Globe className="w-5 h-5 text-rose-400" />
                        </div>
                        <span className="font-bold text-sm text-white tracking-tight">Devocional Externo</span>
                    </div>

                    <div className="w-12"></div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-12 space-y-12">

                {/* Título */}
                <section className="text-center space-y-4 animate-enter">
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                        Devocionais do Mundo
                    </h1>
                    <p className="text-slate-400 text-lg max-w-xl mx-auto">
                        Escolha uma fonte e leia o devocional original, direto do site.
                    </p>
                </section>

                {/* Grid de Fontes */}
                <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-enter" style={{ animationDelay: '0.1s' }}>
                    {FONTES.map((fonte) => {
                        const Icon = fonte.icon;
                        const isActive = fonteAtiva === fonte.id;

                        return (
                            <button
                                key={fonte.id}
                                onClick={() => buscarDevocional(fonte.id)}
                                disabled={carregando}
                                className={`
                  relative p-6 rounded-3xl border text-left transition-all duration-500 group
                  ${isActive
                                        ? `${fonte.bgColor} ${fonte.borderColor} shadow-xl`
                                        : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.05]'}
                  ${carregando && !isActive ? 'opacity-50' : ''}
                `}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-2xl ${fonte.bgColor} ${fonte.color}`}>
                                        {carregando && isActive ? (
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                        ) : (
                                            <Icon className="w-6 h-6" />
                                        )}
                                    </div>

                                    <div className="flex-1">
                                        <h3 className={`font-bold text-lg mb-1 ${isActive ? fonte.color : 'text-white group-hover:text-amber-300'}`}>
                                            {fonte.nome}
                                        </h3>
                                        <p className="text-slate-400 text-sm leading-relaxed">
                                            {fonte.desc}
                                        </p>
                                    </div>
                                </div>

                                {isActive && (
                                    <div className={`absolute inset-0 rounded-3xl ${fonte.bgColor} opacity-50 -z-10 blur-xl`}></div>
                                )}
                            </button>
                        );
                    })}
                </section>

                {/* Erro */}
                {erro && (
                    <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 animate-enter">
                        <AlertCircle className="w-6 h-6 text-red-400 shrink-0" />
                        <p className="text-red-300">{erro}</p>
                    </div>
                )}

                {/* Resultado */}
                {resultado && !carregando && (
                    <section className="animate-enter space-y-6" style={{ animationDelay: '0.2s' }}>

                        {/* Header do Resultado */}
                        <div className="flex items-center justify-between">
                            <div className={`flex items-center gap-3 px-4 py-2 rounded-full ${fonteInfo?.bgColor} border ${fonteInfo?.borderColor}`}>
                                <div className={`w-2 h-2 rounded-full ${fonteInfo?.color?.replace('text-', 'bg-')}`}></div>
                                <span className={`text-xs font-bold uppercase tracking-widest ${fonteInfo?.color}`}>
                                    {fonteInfo?.nome}
                                </span>
                            </div>

                            <button
                                onClick={() => fonteAtiva && buscarDevocional(fonteAtiva)}
                                className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all"
                            >
                                <RefreshCw className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        {/* Conteúdo */}
                        <div className="glass-panel rounded-[2.5rem] p-10 md:p-14">
                            <article className="prose prose-lg prose-invert max-w-none
                prose-headings:text-amber-200 prose-headings:font-black
                prose-p:text-slate-300 prose-p:leading-[1.9]
                prose-strong:text-white
              ">
                                <div className="whitespace-pre-wrap font-medium">
                                    {resultado}
                                </div>
                            </article>
                        </div>

                    </section>
                )}

                {/* Estado Vazio */}
                {!resultado && !carregando && !erro && (
                    <div className="text-center py-20 animate-enter opacity-50">
                        <Globe className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-500">Selecione uma fonte para começar</p>
                    </div>
                )}

            </main>
        </CosmicBackground>
    );
}
