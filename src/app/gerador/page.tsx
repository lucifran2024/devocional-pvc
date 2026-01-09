
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

// ============================================
// COMPONENTES (PREMIUM STELLAR STYLE)
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
                    ? 'bg-indigo-600/20 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.2)]'
                    : 'bg-white/[0.03] border-white/[0.05] hover:border-indigo-500/30 hover:bg-white/[0.08] hover:shadow-lg'
                }
        ${!modo.ativo ? 'opacity-30 cursor-not-allowed bg-transparent border-dashed' : 'stellar-card'}
      `}
        >
            {isActive && (
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent animate-pulse"></div>
            )}

            <div className="flex items-center justify-between mb-3 relative z-10">
                <span className={`text-[10px] font-bold tracking-[0.2em] uppercase px-2 py-0.5 rounded-md ${isActive ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-500 group-hover:text-indigo-400'}`}>
                    {modo.id}
                </span>
                {isLoading && isActive && <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />}
            </div>

            <h3 className={`font-black text-sm mb-1.5 relative z-10 tracking-tight ${isActive ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>
                {modo.titulo}
            </h3>

            <p className={`text-[11px] line-clamp-2 leading-relaxed relative z-10 ${isActive ? 'text-indigo-200' : 'text-slate-500 group-hover:text-slate-300'}`}>
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
                setErro(res.error || 'Falha ao processar o devocional.');
            }
        } catch (err) {
            setErro('Erro de conexão ao executar modo.');
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

    const formatarData = (dataStr: string) => {
        return new Date(dataStr + 'T12:00:00').toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
    };

    return (
        <CosmicBackground className="font-sans selection:bg-indigo-500/30 selection:text-indigo-200">

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
                    w-[340px] border-r border-white/5 bg-[#020617]/95 backdrop-blur-3xl shadow-2xl lg:shadow-none
                    flex flex-col transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:opacity-0 lg:overflow-hidden'}
                    ${!sidebarOpen ? 'lg:w-0 lg:border-none' : 'lg:w-[340px]'}
                `}>
                    {/* Sidebar Header */}
                    <div className="h-20 flex items-center justify-between px-8 border-b border-white/[0.05] shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/10 rounded-xl">
                                <LayoutTemplate className="w-5 h-5 text-indigo-400" />
                            </div>
                            <span className="font-black tracking-[0.15em] text-[10px] uppercase text-slate-400">Diretório de Modos</span>
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
                            <Link href="/" className="group p-3 bg-white/[0.03] hover:bg-indigo-500/10 border border-white/[0.05] rounded-2xl transition-all active:scale-95">
                                <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-indigo-400" />
                            </Link>

                            <h1 className="font-black text-xl tracking-tighter flex items-center gap-2 text-white">
                                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                    <Book className="w-5 h-5 text-white" />
                                </div>
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">PVC AI</span>
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
                <main className="flex-1 overflow-y-auto relative w-full bg-gradient-to-b from-[#020617] to-transparent">
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
                        <section className="animate-divine">
                            {carregandoPayload ? (
                                <div className="space-y-6 py-12">
                                    <div className="h-10 w-1/4 bg-white/[0.02] rounded-xl animate-pulse" />
                                    <div className="h-24 w-full bg-white/[0.02] rounded-3xl animate-pulse" />
                                </div>
                            ) : payloadDoDia ? (
                                <div className="stellar-card rounded-[2.5rem] p-10 md:p-14 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/[0.03] rounded-full blur-[100px] -mr-40 -mt-40 transition-all group-hover:bg-indigo-500/[0.07]"></div>

                                    <div className="flex items-center gap-3 text-indigo-400 font-black text-[10px] md:text-xs uppercase tracking-[0.3em] mb-6">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                                        Revelação do Dia
                                    </div>

                                    <h2 className="text-4xl md:text-6xl font-black tracking-divine text-white leading-[1.05] mb-10 divine-halo">
                                        {payloadDoDia.passagem_do_dia}
                                    </h2>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] shadow-inner group/chip transition-all hover:bg-white/[0.05]">
                                            <span className="text-[9px] text-slate-500 uppercase font-black tracking-[0.2em] mb-2 block">Arquétipo Divino</span>
                                            <p className="text-xl font-bold text-indigo-300 group-hover/chip:text-white transition-colors">{payloadDoDia.arquetipo}</p>
                                        </div>
                                        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] shadow-inner group/chip transition-all hover:bg-white/[0.05]">
                                            <span className="text-[9px] text-slate-500 uppercase font-black tracking-[0.2em] mb-2 block">Voz da Profecia</span>
                                            <p className="text-xl font-bold text-amber-300 group-hover/chip:text-white transition-colors">{payloadDoDia.voice_nome}</p>
                                        </div>
                                    </div>

                                    <div className="mt-8 p-6 bg-indigo-500/[0.03] rounded-2xl border border-indigo-500/10 backdrop-blur-sm">
                                        <p className="text-slate-400 text-sm md:text-base leading-relaxed italic">
                                            "{payloadDoDia.voice_descricao}"
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-16 stellar-card rounded-[2.5rem] text-center border-dashed border-white/10">
                                    <AlertCircle className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                    <p className="text-slate-500 font-medium tracking-tight">Estamos preparando a sua revelação diária. Por favor, aguarde.</p>
                                </div>
                            )}
                        </section>

                        <div className="flex items-center gap-6">
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                            <Sparkles className="w-5 h-5 text-indigo-500/30" />
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                        </div>

                        {/* 2. RESULTADO APRESENTAÇÃO */}
                        <section className="min-h-[500px] relative">
                            {erro && (
                                <div className="p-5 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-center gap-4 text-red-400 shadow-2xl mb-8 animate-divine">
                                    <div className="p-2 bg-red-500/10 rounded-lg">
                                        <AlertCircle className="w-5 h-5" />
                                    </div>
                                    <span className="font-medium text-sm">{erro}</span>
                                </div>
                            )}

                            {modoEmExecucao && !resultado && (
                                <div className="flex flex-col items-center justify-center py-32 space-y-8 animate-divine">
                                    <div className="relative">
                                        <div className="w-24 h-24 bg-indigo-600/10 rounded-full flex items-center justify-center relative z-10">
                                            <Zap className="w-10 h-10 text-indigo-500 animate-pulse" />
                                        </div>
                                        <div className="absolute inset-0 rounded-full border-[3px] border-indigo-500/10 border-t-indigo-500 animate-spin transition-all"></div>
                                        <div className="absolute -inset-4 bg-indigo-500/10 blur-2xl rounded-full -z-10 animate-pulse"></div>
                                    </div>
                                    <div className="text-center space-y-2">
                                        <p className="text-2xl font-black tracking-tight text-white uppercase">Sintonizando...</p>
                                        <p className="text-slate-500 text-sm font-medium tracking-wide">A sabedoria divina está sendo processada.</p>
                                    </div>
                                </div>
                            )}

                            {resultado && (
                                <div className="animate-divine space-y-8">

                                    <div className="flex flex-wrap items-center justify-between gap-6">
                                        <div className="flex items-center gap-3 px-5 py-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-300 text-[10px] md:text-xs font-black uppercase tracking-[0.2em]">
                                            <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.5)]"></div>
                                            Gerado com {resultado.modo}
                                        </div>

                                        <button
                                            onClick={handleCopiar}
                                            className="group flex items-center gap-3 px-6 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.08] text-xs font-bold text-slate-400 hover:text-white transition-all hover:shadow-xl active:scale-95"
                                        >
                                            {copiado ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:rotate-12 transition-all" />}
                                            {copiado ? 'Copiado para o Altar' : 'Copiar Revelação'}
                                        </button>
                                    </div>

                                    <div className="stellar-card rounded-[3rem] p-10 md:p-16 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)] relative group">
                                        {/* Decorative Icon */}
                                        <div className="absolute top-10 left-10 text-indigo-500/[0.05] pointer-events-none group-hover:text-indigo-500/[0.08] transition-colors">
                                            <Quote className="w-20 h-20 rotate-180" />
                                        </div>

                                        <article className="prose prose-lg prose-invert max-w-none 
                                            prose-headings:text-indigo-200 prose-headings:font-black prose-headings:tracking-tighter
                                            prose-p:text-slate-300 prose-p:leading-[1.8] prose-p:text-lg
                                            prose-strong:text-white prose-strong:font-black
                                            prose-blockquote:border-l-[6px] prose-blockquote:border-indigo-600 prose-blockquote:bg-indigo-950/20 prose-blockquote:py-6 prose-blockquote:px-10 prose-blockquote:not-italic prose-blockquote:rounded-[1.5rem] prose-blockquote:shadow-inner">
                                            <div className="whitespace-pre-wrap relative z-10 tracking-tight font-medium">
                                                {resultado.texto}
                                            </div>
                                        </article>

                                        {/* Subtle beam effect */}
                                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-indigo-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none rounded-[3rem]"></div>
                                    </div>

                                    {/* Like Button Area */}
                                    <div className="flex items-center justify-center md:justify-end">
                                        <button
                                            onClick={handleToggleLike}
                                            className={`
                                                group relative flex items-center gap-4 px-10 py-5 rounded-[2rem] text-sm font-black tracking-[0.1em] uppercase shadow-2xl transition-all duration-500 transform active:scale-95
                                                ${isLiked
                                                    ? 'bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 text-white shadow-rose-900/40 ring-2 ring-white/20'
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
                                <div className="flex flex-col items-center justify-center py-24 space-y-8 animate-divine opacity-40 grayscale group hover:grayscale-0 hover:opacity-100 transition-all duration-700">
                                    <div className="p-10 bg-white/[0.02] border border-white/[0.05] rounded-[3rem] relative">
                                        <Zap className="w-16 h-16 text-indigo-500/50 group-hover:text-indigo-500 transition-colors" />
                                        <div className="absolute -inset-2 border-2 border-dashed border-indigo-500/10 rounded-[3.5rem] animate-[spin_20s_linear_infinite]"></div>
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

