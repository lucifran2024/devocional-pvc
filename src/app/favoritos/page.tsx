'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Book, Sparkles, Copy, Trash2, Calendar, Loader2, Wand2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getFavoritosManuais, FavoritoMensagem, removeFavoritoById, executarModo, getDataHoje } from '@/lib/supabase';
import { CosmicHeader } from '@/components/ui/CosmicHeader';
import { CosmicBackground } from '@/components/ui/CosmicBackground';

export default function FavoritosPage() {
    const [favoritos, setFavoritos] = useState<FavoritoMensagem[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    // Estado para MODO FAVORITAS
    const [generating, setGenerating] = useState(false);
    const [generatedResult, setGeneratedResult] = useState<string | null>(null);
    const [showResult, setShowResult] = useState(false);

    const loadData = async () => {
        setLoading(true);
        const data = await getFavoritosManuais();
        setFavoritos(data);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCopy = async (texto: string, idx: number) => {
        await navigator.clipboard.writeText(texto);
        const btn = document.getElementById(`copy-btn-${idx}`);
        if (btn) {
            const originalContent = btn.innerHTML;
            btn.innerHTML = '<span class="text-green-400 font-bold text-xs uppercase tracking-wider">Copiado!</span>';
            setTimeout(() => {
                btn.innerHTML = originalContent;
            }, 2000);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Tem certeza que deseja remover esta mensagem do Banco de Ouro?')) return;

        setDeletingId(id);
        const success = await removeFavoritoById(id);

        if (success) {
            setFavoritos(prev => prev.filter(item => item.id !== id));
        } else {
            alert('Erro ao remover. Tente novamente.');
        }
        setDeletingId(null);
    };

    // 🆕 Handler para gerar mensagens inspiradas nas favoritas
    const handleGerarInspirados = async () => {
        if (favoritos.length === 0) {
            alert('Adicione mensagens favoritas primeiro!');
            return;
        }

        setGenerating(true);
        setGeneratedResult(null);

        try {
            const result = await executarModo('modo_favoritas', getDataHoje());

            if (result.ok && result.resultado) {
                setGeneratedResult(result.resultado);
                setShowResult(true);
            } else {
                alert(result.error || 'Erro ao gerar mensagens.');
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao conectar com o servidor.');
        } finally {
            setGenerating(false);
        }
    };

    // Parsear mensagens geradas em array
    const parsedMessages = generatedResult
        ? generatedResult
            .split(/---|\*\*MENSAGEM \d{1,2}/)
            .map(m => m.trim())
            .filter(m => m.length > 50) // Remove fragmentos pequenos
        : [];

    const handleCopyResult = async () => {
        if (generatedResult) {
            await navigator.clipboard.writeText(generatedResult);
            alert('Todas as mensagens copiadas!');
        }
    };

    const handleCopySingleMsg = async (msg: string, idx: number) => {
        await navigator.clipboard.writeText(msg);
        const btn = document.getElementById(`copy-gen-${idx}`);
        if (btn) {
            const originalContent = btn.innerHTML;
            btn.innerHTML = '<span class="text-green-400 font-bold text-xs">✓</span>';
            setTimeout(() => {
                btn.innerHTML = originalContent;
            }, 1500);
        }
    };

    return (
        <CosmicBackground className="font-sans text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200">
            <div className="w-full flex flex-col items-center relative z-10">
                <div className="w-full max-w-6xl">
                    <CosmicHeader className="pb-32 md:pb-48">
                        <div className="w-full px-4 sm:px-6 lg:px-8 pt-12 text-center md:text-left">
                            <div className="flex flex-col md:flex-row items-center md:items-start gap-5 mb-8 animate-divine">
                                <Link href="/" className="group p-3 bg-white/[0.03] hover:bg-white/[0.08] rounded-2xl transition-all border border-white/5 hover:border-white/10 active:scale-95">
                                    <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-white" />
                                </Link>
                                <div className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-yellow-500/10 border border-yellow-400/20 rounded-full text-yellow-300 text-[10px] font-black uppercase tracking-[0.2em] shadow-inner">
                                    <Book className="w-3.5 h-3.5" />
                                    Banco de Ouro
                                </div>
                            </div>

                            <h1 className="text-4xl md:text-7xl font-black tracking-divine text-white mb-6 divine-halo animate-divine text-center md:text-left">
                                Minhas Mensagens <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-amber-500">Externas</span>
                            </h1>
                            <p className="text-slate-400 max-w-2xl text-lg md:text-xl leading-relaxed animate-divine [animation-delay:200ms] text-center md:text-left mx-auto md:mx-0 mb-8">
                                Coleção exclusiva de mensagens adicionadas manualmente para uso futuro.
                            </p>

                            {/* 🆕 BOTÃO GERAR INSPIRADOS */}
                            <button
                                onClick={handleGerarInspirados}
                                disabled={generating || favoritos.length === 0}
                                className="group inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-bold rounded-2xl transition-all shadow-lg hover:shadow-amber-500/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {generating ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Gerando 10 Mensagens...
                                    </>
                                ) : (
                                    <>
                                        <Wand2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                                        ✨ Gerar 10 Inspirados
                                    </>
                                )}
                            </button>
                        </div>
                    </CosmicHeader>
                </div>

                <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-20 flex flex-col space-y-8 py-20">

                    {/* 🆕 RESULTADO DAS MENSAGENS GERADAS - CARDS INDIVIDUAIS */}
                    {showResult && parsedMessages.length > 0 && (
                        <>
                            {/* Header com botões */}
                            <div className="flex items-center justify-between mb-4 animate-divine">
                                <div className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-amber-500/20 border border-amber-400/30 rounded-full text-amber-300 text-[10px] font-black uppercase tracking-[0.2em]">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    {parsedMessages.length} Mensagens Geradas
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleCopyResult}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 transition-all text-xs font-bold uppercase tracking-widest active:scale-95"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                        Copiar Tudo
                                    </button>
                                    <button
                                        onClick={() => setShowResult(false)}
                                        className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Cards individuais */}
                            {parsedMessages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className="group relative bg-gradient-to-br from-amber-900/20 to-yellow-900/10 backdrop-blur-xl border border-amber-500/20 rounded-[2rem] p-6 hover:border-amber-400/40 transition-all duration-500 hover:shadow-[0_0_30px_-10px_rgba(251,191,36,0.2)] animate-divine"
                                    style={{ animationDelay: `${idx * 50}ms` }}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 text-[10px] font-black uppercase tracking-[0.2em]">
                                            <Wand2 className="w-3 h-3" />
                                            Mensagem {idx + 1}
                                        </div>
                                        <button
                                            id={`copy-gen-${idx}`}
                                            onClick={() => handleCopySingleMsg(msg, idx)}
                                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/20 transition-all text-xs font-bold uppercase tracking-widest active:scale-95"
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                            Copiar
                                        </button>
                                    </div>
                                    <div className="prose prose-invert max-w-none prose-p:text-slate-200 prose-p:leading-relaxed prose-headings:text-amber-200 prose-strong:text-amber-300">
                                        <ReactMarkdown>{msg}</ReactMarkdown>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}

                    {loading ? (
                        [1, 2, 3].map(i => (
                            <div key={i} className="h-40 bg-white/[0.02] rounded-[2rem] animate-pulse border border-white/5" />
                        ))
                    ) : favoritos.length === 0 ? (
                        <div className="text-center py-20 bg-white/[0.02] rounded-[3rem] border border-white/5 animate-divine">
                            <Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-400 mb-2">Seu Banco de Ouro está vazio</h3>
                            <p className="text-slate-500 text-sm">Adicione mensagens manualmente para vê-las aqui.</p>
                        </div>
                    ) : (
                        favoritos.map((fav, idx) => (
                            <div key={fav.id} className="group relative bg-[#020617]/60 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 hover:border-indigo-500/30 transition-all duration-500 hover:shadow-[0_0_40px_-10px_rgba(99,102,241,0.1)]">

                                <div className="flex items-center justify-between mb-6">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/[0.03] border border-white/5 rounded-full text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                                        <Calendar className="w-3 h-3 text-indigo-500" />
                                        {new Date(fav.created_at).toLocaleDateString('pt-BR')}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            id={`copy-btn-${idx}`}
                                            onClick={() => handleCopy(fav.texto_msg, idx)}
                                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all text-xs font-bold uppercase tracking-widest active:scale-95"
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                            Copiar
                                        </button>

                                        <button
                                            onClick={() => handleDelete(fav.id)}
                                            disabled={deletingId === fav.id}
                                            className="p-2 rounded-xl bg-white/5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-white/5 transition-all"
                                            title="Excluir"
                                        >
                                            {deletingId === fav.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="prose prose-invert max-w-none prose-p:text-slate-300 prose-p:leading-relaxed prose-headings:text-indigo-200">
                                    <ReactMarkdown>{fav.texto_msg}</ReactMarkdown>
                                </div>

                            </div>
                        ))
                    )}

                </main>
            </div>
        </CosmicBackground>
    );
}

