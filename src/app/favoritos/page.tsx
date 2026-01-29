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
    const [copiedId, setCopiedId] = useState<number | null>(null);

    // Estado para geração
    const [generating, setGenerating] = useState(false);
    const [generatedResult, setGeneratedResult] = useState<string | null>(null);
    const [showResult, setShowResult] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getFavoritosManuais();
            setFavoritos(data);
        } catch (e) {
            console.error('Erro ao carregar:', e);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    // Handler SIMPLES de copiar (sem manipulação DOM)
    const handleCopy = async (texto: string, id: number) => {
        try {
            await navigator.clipboard.writeText(texto);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (e) {
            alert('Erro ao copiar');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Tem certeza que deseja remover esta mensagem?')) return;
        setDeletingId(id);
        const success = await removeFavoritoById(id);
        if (success) {
            setFavoritos(prev => prev.filter(item => item.id !== id));
        } else {
            alert('Erro ao remover.');
        }
        setDeletingId(null);
    };

    // Handler de geração
    const handleGerar = async () => {
        if (favoritos.length === 0) {
            alert('Adicione favoritas primeiro!');
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
                alert(result.error || 'Erro ao gerar.');
            }
        } catch (e) {
            alert('Erro de conexão.');
        }
        setGenerating(false);
    };

    // Parser simples de mensagens
    const parseMessages = (text: string): string[] => {
        if (!text) return [];
        const parts = text.split(/\n\s*---\s*\n/);
        return parts.filter(p => p.trim().length > 0);
    };

    return (
        <CosmicBackground className="font-sans text-slate-100">
            <div className="w-full flex flex-col items-center relative z-10">
                <div className="w-full max-w-6xl">
                    <CosmicHeader className="pb-32 md:pb-48">
                        <div className="w-full px-4 sm:px-6 lg:px-8 pt-12 text-center md:text-left">
                            <div className="flex flex-col md:flex-row items-center md:items-start gap-5 mb-8">
                                <Link href="/" className="group p-3 bg-white/[0.03] hover:bg-white/[0.08] rounded-2xl transition-all border border-white/5">
                                    <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-white" />
                                </Link>
                                <div className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-yellow-500/10 border border-yellow-400/20 rounded-full text-yellow-300 text-[10px] font-black uppercase tracking-[0.2em]">
                                    <Book className="w-3.5 h-3.5" />
                                    Banco de Ouro
                                </div>
                            </div>

                            <h1 className="text-4xl md:text-7xl font-black tracking-tight text-white mb-6 text-center md:text-left">
                                Minhas <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-amber-500">Favoritas</span>
                            </h1>

                            {/* Botão Gerar */}
                            <button
                                onClick={handleGerar}
                                disabled={generating || favoritos.length === 0}
                                className="mt-4 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
                            >
                                {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                                {generating ? 'Gerando...' : '✨ Gerar 10 Inspirados'}
                            </button>
                        </div>
                    </CosmicHeader>
                </div>

                <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-20 flex flex-col space-y-8 py-20">

                    {/* Resultado da Geração */}
                    {showResult && generatedResult && (
                        <div className="bg-gradient-to-br from-amber-900/20 to-yellow-900/10 border border-amber-500/30 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-amber-400 font-bold text-lg">✨ Mensagens Geradas</h3>
                                <button onClick={() => setShowResult(false)} className="p-2 hover:bg-white/10 rounded-lg">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                            <div className="space-y-6">
                                {parseMessages(generatedResult).map((msg, i) => (
                                    <div key={i} className="bg-black/30 border border-white/10 rounded-xl p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-amber-500 text-xs font-bold">Msg {i + 1}</span>
                                            <button
                                                onClick={() => handleCopy(msg, -i)}
                                                className="text-xs px-2 py-1 bg-white/10 rounded text-slate-300 hover:text-white"
                                            >
                                                {copiedId === -i ? '✓ Copiado' : 'Copiar'}
                                            </button>
                                        </div>
                                        <div className="prose prose-invert prose-sm max-w-none">
                                            <ReactMarkdown>{msg}</ReactMarkdown>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Lista de Favoritos */}
                    {loading ? (
                        [1, 2, 3].map(i => (
                            <div key={i} className="h-40 bg-white/[0.02] rounded-2xl animate-pulse border border-white/5" />
                        ))
                    ) : favoritos.length === 0 ? (
                        <div className="text-center py-20 bg-white/[0.02] rounded-3xl border border-white/5">
                            <Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-400 mb-2">Banco vazio</h3>
                            <p className="text-slate-500 text-sm">Adicione mensagens primeiro.</p>
                        </div>
                    ) : (
                        favoritos.map((fav) => (
                            <div key={fav.id} className="group relative bg-[#020617]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-indigo-500/30 transition-all">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/[0.03] border border-white/5 rounded-full text-slate-400 text-[10px] font-bold uppercase">
                                        <Calendar className="w-3 h-3 text-indigo-500" />
                                        {new Date(fav.created_at).toLocaleDateString('pt-BR')}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleCopy(fav.texto_msg, fav.id)}
                                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/20 text-xs font-bold"
                                        >
                                            <Copy className="w-3 h-3" />
                                            {copiedId === fav.id ? 'Copiado!' : 'Copiar'}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(fav.id)}
                                            disabled={deletingId === fav.id}
                                            className="p-2 rounded-lg bg-white/5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-white/5"
                                        >
                                            {deletingId === fav.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="prose prose-invert max-w-none prose-p:text-slate-300">
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

