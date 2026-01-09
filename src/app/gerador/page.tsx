'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Book, Sparkles, Copy, Check, Loader2, Calendar, User, Zap,
    AlertCircle, RefreshCw, ChevronRight, Menu, X, LayoutTemplate,
    Heart, ArrowLeft, Send, Quote
} from 'lucide-react';
import {
    getPayloadDoDia,
    getModos,
    executarModo,
    getDataHoje,
    atualizarFeedback,
    type PayloadDoDia,
    type Modo
} from '@/lib/supabase';
import { CosmicHeader } from '@/components/ui/CosmicHeader';
import { CosmicBackground } from '@/components/ui/CosmicBackground';
import ReactMarkdown from 'react-markdown';

// ============================================
// COMPONENTES (PREMIUM COSMIC STYLE)
// ============================================

function ModeCard({
    modo,
    isActive,
    isLoading,
    onClick
}: {
    modo: Modo;
    isActive: boolean;
    isLoading: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            disabled={isLoading || !modo.ativo}
            className={`
        w-full text-left p-5 rounded-2xl border transition-all duration-500 group relative overflow-hidden
        ${isActive
                    ? 'glass-card border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.1)]'
                    : 'bg-white/[0.02] border-white/[0.05] hover:border-amber-500/30 hover:bg-white/[0.05]'
                }
        ${!modo.ativo ? 'opacity-30 cursor-not-allowed border-dashed' : ''}
      `}
        >
            {isActive && (
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent animate-pulse"></div>
            )}

            <div className="flex items-center justify-between mb-3 relative z-10">
                <span className={`text-[10px] font-bold tracking-[0.2em] uppercase px-2 py-0.5 rounded-md ${isActive ? 'bg-amber-500 text-black' : 'bg-white/5 text-slate-500 group-hover:text-amber-400'}`}>
                    {modo.id}
                </span>
                {isLoading && isActive && <Loader2 className="w-4 h-4 animate-spin text-amber-400" />}
            </div>

            <h3 className={`font-bold text-sm mb-1.5 relative z-10 tracking-tight ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                {modo.titulo}
            </h3>

            <p className={`text-[11px] line-clamp-2 leading-relaxed relative z-10 ${isActive ? 'text-amber-100/70' : 'text-slate-500 group-hover:text-slate-400'}`}>
                {modo.descricao}
            </p>
        </button>
    );
}

// ============================================
// APP PRINCIPAL
// ============================================

export default function GeradorPage() {
    // Estados de Dados
    const [payloadDoDia, setPayloadDoDia] = useState<PayloadDoDia | null>(null);
    const [modos, setModos] = useState<Modo[]>([]);

    // Estados de UI
    const [sidebarOpen, setSidebarOpen] = useState(true); // Desktop default
    const [carregandoPayload, setCarregandoPayload] = useState(true);
    const [carregandoModos, setCarregandoModos] = useState(true);

    // Estados de Execução
    const [modoEmExecucao, setModoEmExecucao] = useState<string | null>(null);
    const [resultado, setResultado] = useState<{ texto: string; modo: string; id?: number } | null>(null);
    const [erro, setErro] = useState<string | null>(null);
    const [copiado, setCopiado] = useState(false);
    const [isLiked, setIsLiked] = useState(false);

    const dataHoje = getDataHoje();

    // Load Initial Data
    useEffect(() => {
        async function init() {
            setCarregandoPayload(true);
            setCarregandoModos(true);

            try {
                const [payloadRes, modosRes] = await Promise.all([
                    getPayloadDoDia(dataHoje),
                    getModos()
                ]);

                setPayloadDoDia(payloadRes.data);
                setModos(modosRes.data || []);
            } catch (err) {
                console.error('Erro na inicialização:', err);
            } finally {
                setCarregandoPayload(false);
                setCarregandoModos(false);
            }
        }
        init();
    }, [dataHoje]);

    // Handlers
    const handleAtivarModo = async (modo: Modo) => {
        setModoEmExecucao(modo.id);
        setErro(null);

        // UI Feedback imediato
        if (window.innerWidth < 1024) setSidebarOpen(false);

        try {
            const res = await executarModo(modo.id, payloadDoDia?.data || dataHoje);

            if (res.ok) {
                setResultado({ texto: res.resultado, modo: res.modo || modo.titulo, id: res.id });
                setIsLiked(true); // Novo resultado = auto-aprovado pelo backend
            } else {
                console.error('Erro no execute:', res.error);
                if (res.error?.includes('non-2xx')) {
                    setErro('Erro no servidor (500). Provavelmente falta configurar as chaves de API (GEMINI_KEY) no Supabase ou implantar a função.');
                } else {
                    setErro(res.error || 'Falha ao processar o devocional.');
                }
            }
        } catch (err) {
            setErro('Erro de conexão ao executar modo. Verifique a internet.');
        } finally {
            setModoEmExecucao(null);
        }
    };

    const handleCopiar = async () => {
        if (!resultado) return;
        await navigator.clipboard.writeText(resultado.texto);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
    };

    const handleToggleLike = async () => {
        if (!resultado?.id) return;

        const novoStatus = !isLiked;
        // UI otimista
        setIsLiked(novoStatus);

        await atualizarFeedback(resultado.id, novoStatus);
    };

    return (
        <CosmicBackground className="font-sans selection:bg-amber-500/30 selection:text-amber-200">

            {/* OVERLAY MOBILE */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/80 z-40 lg:hidden backdrop-blur-md"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* MAIN LAYOUT (Sidebar + Content) */}
            <div className="flex h-screen pt-16 lg:pt-0 w-full relative">

                {/* SIDEBAR (MODOS) */}
                <aside className={`
                    fixed lg:static inset-y-0 left-0 z-50
                    w-[340px] border-r border-white/5 bg-[#020617] shadow-2xl lg:shadow-none
                    flex flex-col transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:opacity-0 lg:overflow-hidden'}
                    ${!sidebarOpen ? 'lg:w-0 lg:border-none' : 'lg:w-[340px]'}
                `}>
                    {/* Sidebar Header */}
                    <div className="h-20 flex items-center justify-between px-8 border-b border-white/[0.05] shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/10 rounded-xl">
                                <LayoutTemplate className="w-5 h-5 text-amber-500" />
                            </div>
                            <span className="font-bold tracking-[0.15em] text-[10px] uppercase text-slate-400">Diretório de Modos</span>
                        </div>
                        <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 hover:bg-white/5 rounded-full transition-colors">
                            <X className="w-5 h-5 text-slate-500" />
                        </button>
                    </div>

                    {/* Lista de Modos */}
                    <div className="flex-1 overflow-y-auto px-6 py-8 space-y-4 custom-scrollbar">
                        {carregandoModos ? (
                            <div className="space-y-4">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="h-28 bg-white/[0.02] rounded-2xl animate-pulse" />
                                ))}
                            </div>
                        ) : modos.length === 0 ? (
                            <div className="p-10 text-center border border-dashed border-white/10 rounded-3xl">
                                <p className="text-slate-600 text-sm">Sintonizando frequências...</p>
                            </div>
                        ) : (
                            modos.map(modo => (
                                <ModeCard
                                    key={modo.id}
                                    modo={modo}
                                    isActive={modoEmExecucao === modo.id}
                                    isLoading={modoEmExecucao === modo.id}
                                    onClick={() => handleAtivarModo(modo)}
                                />
                            ))
                        )}
                    </div>

                    {/* Sidebar Footer */}
                    <div className="p-6 border-t border-white/[0.05] bg-white/[0.02] space-y-4">
                        <div className="flex items-center justify-between">
                            <Link href="/" className="group p-3 bg-white/[0.03] hover:bg-amber-500/10 border border-white/[0.05] rounded-2xl transition-all active:scale-95">
                                <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-amber-500" />
                            </Link>

                            <h1 className="font-black text-xl tracking-tighter flex items-center gap-2 text-white">
                                <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/20">
                                    <Book className="w-5 h-5 text-white" />
                                </div>
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-amber-200">PVC AI</span>
                            </h1>

                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className={`p-3 hover:bg-white/5 rounded-2xl text-slate-400 transition-all ${sidebarOpen ? 'bg-white/5 text-white' : ''}`}
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </aside>

                {/* CONTENT AREA */}
                <main className="flex-1 overflow-y-auto relative w-full bg-[#020617]">

                    {/* Header bar overlay (for desktop if sidebar closed or for mobile) */}
                    <div className="sticky top-0 z-40 w-full px-6 py-4 flex items-center justify-between lg:hidden bg-[#020617]/80 backdrop-blur-md border-b border-white/5">
                        <button onClick={() => setSidebarOpen(true)} className="p-2 bg-white/5 rounded-xl">
                            <Menu className="w-6 h-6 text-white" />
                        </button>
                        <h2 className="text-white font-bold text-sm uppercase tracking-widest">Painel Devocional</h2>
                        <div className="w-10"></div>
                    </div>

                    <div className="max-w-6xl mx-auto px-6 py-10 md:px-12 md:py-20 space-y-12">

                        {/* 1. HERO: Leitura do Dia */}
                        <section className="animate-enter">
                            {carregandoPayload ? (
                                <div className="space-y-6 py-12">
                                    <div className="h-10 w-1/4 bg-white/[0.02] rounded-xl animate-pulse" />
                                    <div className="h-24 w-full bg-white/[0.02] rounded-3xl animate-pulse" />
                                </div>
                            ) : payloadDoDia ? (
                                <div className="glass-panel rounded-[2.5rem] p-10 md:p-14 relative overflow-hidden group border-amber-500/10">
                                    {/* Subtle Ambient Light */}
                                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-amber-500/[0.03] rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none"></div>

                                    <div className="flex items-center gap-3 text-amber-500 font-bold text-[10px] md:text-xs uppercase tracking-[0.3em] mb-6">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                                        Revelação do Dia
                                    </div>

                                    <h2 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-[1.05] mb-10">
                                        {payloadDoDia.passagem_do_dia}
                                    </h2>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] shadow-inner group/chip transition-all hover:bg-white/[0.05]">
                                            <span className="text-[9px] text-slate-500 uppercase font-black tracking-[0.2em] mb-2 block">Arquétipo Divino</span>
                                            <p className="text-xl font-bold text-white group-hover/chip:text-amber-400 transition-colors">{payloadDoDia.arquetipo}</p>
                                        </div>
                                        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] shadow-inner group/chip transition-all hover:bg-white/[0.05]">
                                            <span className="text-[9px] text-slate-500 uppercase font-black tracking-[0.2em] mb-2 block">Voz da Profecia</span>
                                            <p className="text-xl font-bold text-white group-hover/chip:text-amber-400 transition-colors">{payloadDoDia.voice_nome}</p>
                                        </div>
                                    </div>

                                    <div className="mt-8 p-6 bg-amber-500/[0.03] rounded-2xl border border-amber-500/10 backdrop-blur-sm">
                                        <p className="text-slate-400 text-sm md:text-base leading-relaxed italic">
                                            "{payloadDoDia.voice_descricao}"
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-16 glass-panel rounded-[2.5rem] text-center border-dashed border-white/10">
                                    <AlertCircle className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                    <p className="text-slate-500 font-medium tracking-tight">Estamos preparando a sua revelação diária. Por favor, aguarde.</p>
                                </div>
                            )}
                        </section>

                        <div className="flex items-center gap-6">
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                            <Sparkles className="w-5 h-5 text-amber-500/30" />
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                        </div>

                        {/* 2. RESULTADO APRESENTAÇÃO */}
                        <section className="min-h-[500px] relative">
                            {erro && (
                                <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-2xl flex flex-col md:flex-row items-center gap-4 text-red-400 shadow-2xl mb-8 animate-enter">
                                    <div className="p-3 bg-red-500/10 rounded-xl shrink-0">
                                        <AlertCircle className="w-6 h-6" />
                                    </div>
                                    <div className="text-sm font-medium leading-relaxed text-center md:text-left">
                                        {erro}
                                    </div>
                                </div>
                            )}

                            {modoEmExecucao && !resultado && (
                                <div className="flex flex-col items-center justify-center py-32 space-y-8 animate-enter">
                                    <div className="relative">
                                        <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center relative z-10">
                                            <Zap className="w-10 h-10 text-amber-500 animate-pulse" />
                                        </div>
                                        <div className="absolute inset-0 rounded-full border-[3px] border-amber-500/10 border-t-amber-500 animate-spin transition-all"></div>
                                        <div className="absolute -inset-4 bg-amber-500/10 blur-2xl rounded-full -z-10 animate-pulse"></div>
                                    </div>
                                    <div className="text-center space-y-2">
                                        <p className="text-2xl font-black tracking-tight text-white uppercase">Sintonizando...</p>
                                        <p className="text-slate-500 text-sm font-medium tracking-wide">A sabedoria divina está sendo processada.</p>
                                    </div>
                                </div>
                            )}

                            {resultado && (
                                <div className="animate-enter space-y-8" style={{ animationDelay: '0.1s' }}>

                                    <div className="flex flex-wrap items-center justify-between gap-6">
                                        <div className="flex items-center gap-3 px-5 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400 text-[10px] md:text-xs font-black uppercase tracking-[0.2em]">
                                            <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
                                            Gerado com {resultado.modo}
                                        </div>

                                        <button
                                            onClick={handleCopiar}
                                            className="group flex items-center gap-3 px-6 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.08] text-xs font-bold text-slate-400 hover:text-white transition-all hover:shadow-xl active:scale-95"
                                        >
                                            {copiado ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:rotate-12 transition-all" />}
                                            {copiado ? 'Copiado para o Altar' : 'Copiar Revelação'}
                                        </button>
                                    </div>

                                    <div className="glass-panel rounded-[3rem] p-10 md:p-16 shadow-2xl relative group">
                                        {/* Decorative Icon */}
                                        <div className="absolute top-10 left-10 text-amber-500/[0.03] pointer-events-none group-hover:text-amber-500/[0.08] transition-colors">
                                            <Quote className="w-20 h-20 rotate-180" />
                                        </div>

                                        <article className="prose prose-lg prose-invert max-w-none 
                                            prose-headings:text-amber-200 prose-headings:font-black prose-headings:tracking-tight
                                            prose-p:text-slate-300 prose-p:leading-[1.9] prose-p:text-lg
                                            prose-strong:text-white prose-strong:font-black
                                            prose-blockquote:border-l-[6px] prose-blockquote:border-amber-600 prose-blockquote:bg-amber-950/20 prose-blockquote:py-6 prose-blockquote:px-10 prose-blockquote:not-italic prose-blockquote:rounded-[1.5rem] prose-blockquote:shadow-inner">
                                            <div className="whitespace-pre-wrap relative z-10 tracking-tight font-medium">
                                                <ReactMarkdown>{resultado.texto}</ReactMarkdown>
                                            </div>
                                        </article>
                                    </div>

                                    {/* Like Button Area */}
                                    <div className="flex items-center justify-center md:justify-end">
                                        <button
                                            onClick={handleToggleLike}
                                            className={`
                                                group relative flex items-center gap-4 px-10 py-5 rounded-[2rem] text-sm font-black tracking-[0.1em] uppercase shadow-2xl transition-all duration-500 transform active:scale-95
                                                ${isLiked
                                                    ? 'bg-gradient-to-r from-red-700 via-rose-600 to-red-700 text-white shadow-rose-900/40 ring-2 ring-white/10'
                                                    : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/10 hover:border-rose-500/30'}
                                            `}
                                        >
                                            <Heart className={`w-6 h-6 transition-all duration-500 ${isLiked ? 'fill-white scale-125' : 'group-hover:text-rose-500 group-hover:scale-110'}`} />
                                            <span>{isLiked ? 'Eternizado no Diário' : 'Eternizar Mensagem'}</span>

                                            {isLiked && (
                                                <div className="absolute -inset-1 bg-rose-500/20 blur-xl rounded-[2rem] -z-10 animate-pulse"></div>
                                            )}
                                        </button>
                                    </div>
                                    {/* End Like */}

                                </div>
                            )}

                            {/* Placeholder state */}
                            {!modoEmExecucao && !resultado && !carregandoPayload && (
                                <div className="flex flex-col items-center justify-center py-24 space-y-8 animate-enter opacity-40 grayscale group hover:grayscale-0 hover:opacity-100 transition-all duration-700">
                                    <div className="p-10 bg-white/[0.02] border border-white/[0.05] rounded-[3rem] relative">
                                        <Zap className="w-16 h-16 text-amber-500/50 group-hover:text-amber-500 transition-colors" />
                                        <div className="absolute -inset-2 border-2 border-dashed border-amber-500/10 rounded-[3.5rem] animate-[spin_20s_linear_infinite]"></div>
                                    </div>
                                    <div className="text-center space-y-1">
                                        <p className="text-lg font-bold text-slate-300">Inicie sua Jornada</p>
                                        <p className="text-xs text-slate-500 max-w-[240px] leading-relaxed">Selecione um dos modos na lateral para traduzir a sabedoria divina para o seu momento.</p>
                                    </div>
                                </div>
                            )}
                        </section>
                    </div>
                </main>
            </div>
        </CosmicBackground >
    );
}

