'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Wand2, Loader2, BookOpen, Heart, Book, Lightbulb, Megaphone, MessageCircle, HelpCircle, Layers, Sparkles, Copy, Trash2, Calendar } from 'lucide-react';
import { CosmicBackground } from '@/components/ui/CosmicBackground';
import { CosmicHeader } from '@/components/ui/CosmicHeader';
import { executarModoComFiltros, getDataHoje, CategoriaDna, saveDnaGeracoes, getDnaGeracoes, DnaGeracao, deleteDnaGeracao, deleteDnaGeracaoBatch } from '@/lib/supabase';
import ReactMarkdown from 'react-markdown';

// Categorias disponíveis (Fonte de Estilo)
const CATEGORIAS: { id: CategoriaDna; nome: string; icon: any; cor: string }[] = [
    { id: 'devocional', nome: 'Devocional', icon: BookOpen, cor: 'text-blue-400 bg-blue-500/20 border-blue-500/30' },
    { id: 'oração', nome: 'Oração', icon: Heart, cor: 'text-pink-400 bg-pink-500/20 border-pink-500/30' },
    { id: 'versículo', nome: 'Versículo', icon: Book, cor: 'text-amber-400 bg-amber-500/20 border-amber-500/30' },
    { id: 'reflexão', nome: 'Reflexão', icon: Lightbulb, cor: 'text-purple-400 bg-purple-500/20 border-purple-500/30' },
    { id: 'exortação', nome: 'Exortação', icon: Megaphone, cor: 'text-green-400 bg-green-500/20 border-green-500/30' },
    { id: 'declaração', nome: 'Declaração', icon: MessageCircle, cor: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30' },
];

export default function GeradorEstiloPage() {
    const [selectedCategory, setSelectedCategory] = useState<CategoriaDna | null>(null);
    const [generating, setGenerating] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [quantidade, setQuantidade] = useState(5);

    // Últimas Gerações
    const [recentGenerations, setRecentGenerations] = useState<DnaGeracao[]>([]);
    const [deletingBatch, setDeletingBatch] = useState<string | null>(null);
    const [deletingGenId, setDeletingGenId] = useState<number | null>(null);
    const [copiedId, setCopiedId] = useState<number | null>(null);

    // Carregar histórico inicial
    useEffect(() => {
        loadRecentGenerations();
    }, []);

    const loadRecentGenerations = async () => {
        const data = await getDnaGeracoes(3); // Últimos 3 dias
        setRecentGenerations(data);
    };

    const handleGerar = async () => {
        if (!selectedCategory) return;
        setGenerating(true);
        setResult(null);

        try {
            // Chamada para o novo modo_estilo backend
            const response = await executarModoComFiltros('modo_estilo', getDataHoje(), {
                estilo: selectedCategory, // Categoria selecionada atua como "Estilo"
                quantidade
            });

            if (response.ok && response.resultado) {
                setResult(response.resultado);

                // Salvar gerações
                const mensagens = response.resultado.split(/\n\s*---\s*\n/).filter(p => p.trim().length > 0);
                if (mensagens.length > 0) {
                    await saveDnaGeracoes(mensagens, selectedCategory, { modo: 'estilo', estilo: selectedCategory });
                    await loadRecentGenerations(); // Recarregar lista
                }
            } else {
                alert(response.error || 'Erro ao gerar mensagens.');
            }
        } catch (e) {
            console.error(e);
            alert('Erro de conexão ao gerar.');
        } finally {
            setGenerating(false);
        }
    };

    const handleCopy = (text: string, id: number) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleDeleteGeneration = async (id: number) => {
        if (!confirm('Tem certeza que deseja apagar esta mensagem?')) return;
        setDeletingGenId(id);
        try {
            await deleteDnaGeracao(id);
            setRecentGenerations(prev => prev.filter(g => g.id !== id));
        } catch (error) {
            console.error('Erro ao deletar:', error);
            alert('Erro ao deletar mensagem.');
        } finally {
            setDeletingGenId(null);
        }
    };

    const handleDeleteBatch = async (batchId: string) => {
        if (!confirm('Tem certeza que deseja apagar TODO este lote de mensagens?')) return;
        setDeletingBatch(batchId);
        try {
            await deleteDnaGeracaoBatch(batchId);
            setRecentGenerations(prev => prev.filter(g => g.batch_id !== batchId));
        } catch (error) {
            console.error('Erro ao deletar lote:', error);
            alert('Erro ao deletar lote.');
        } finally {
            setDeletingBatch(null);
        }
    };

    return (
        <CosmicBackground className="font-sans text-slate-100 min-h-screen">
            <div className="w-full max-w-4xl mx-auto px-6 py-12 relative z-10">

                {/* Header */}
                <div className="flex items-center gap-4 mb-12">
                    <Link href="/" className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all">
                        <ArrowLeft className="w-5 h-5 text-slate-400" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Novo</span>
                            <h1 className="text-2xl font-bold text-white">Gerador por Estilo</h1>
                        </div>
                        <p className="text-sm text-slate-400">Gere mensagens que copiam a estrutura exata de uma categoria.</p>
                    </div>
                </div>

                {/* Passo 1: Selecionar Estilo */}
                <section className="mb-10 animate-enter">
                    <h2 className="text-sm uppercase tracking-widest text-slate-500 font-bold mb-4">1. Escolha o Estilo (Formato)</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {CATEGORIAS.map(cat => {
                            const isSelected = selectedCategory === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`relative p-4 rounded-xl border text-left transition-all group ${isSelected
                                        ? `${cat.cor} ring-2 ring-offset-2 ring-offset-black ring-indigo-500`
                                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                                        }`}
                                >
                                    <cat.icon className={`w-6 h-6 mb-3 ${isSelected ? 'text-current' : 'text-slate-400 group-hover:text-white'}`} />
                                    <h3 className={`font-bold ${isSelected ? 'text-current' : 'text-slate-200'}`}>{cat.nome}</h3>
                                    {isSelected && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-current animate-pulse"></div>}
                                </button>
                            )
                        })}
                    </div>
                </section>

                {/* Passo 2: Gerar */}
                <section className="mb-12 animate-enter" style={{ animationDelay: '100ms' }}>
                    <button
                        onClick={handleGerar}
                        disabled={!selectedCategory || generating}
                        className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${!selectedCategory || generating
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/25'
                            }`}
                    >
                        {generating ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Analisando DNA e Gerando...
                            </>
                        ) : (
                            <>
                                <Wand2 className="w-5 h-5" />
                                Gerar 5 Mensagens no Estilo {selectedCategory ? CATEGORIAS.find(c => c.id === selectedCategory)?.nome : ''}
                            </>
                        )}
                    </button>
                    <p className="text-center text-xs text-slate-500 mt-3">
                        O sistema analisa suas favoritas dessa categoria e cria novas mensagens com a mesma "pegada".
                    </p>
                </section>

                {/* Resultado */}
                {result && (
                    <section className="animate-in slide-in-from-bottom-4 mb-12">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-2">
                                <Sparkles className="w-4 h-4" /> Resultado Gerado
                            </h2>
                        </div>
                        <div className="p-6 md:p-8 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md">
                            <div className="prose prose-invert max-w-none prose-p:text-slate-300 whitespace-pre-line">
                                <ReactMarkdown>{result}</ReactMarkdown>
                            </div>
                        </div>
                    </section>
                )}

                {/* CARD ÚLTIMAS GERAÇÕES */}
                {recentGenerations.length > 0 && (
                    <section className="animate-in slide-in-from-bottom-4">
                        <div className="bg-gradient-to-br from-amber-900/10 to-orange-900/5 border border-amber-500/20 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-amber-400 font-bold text-lg flex items-center gap-2">
                                    <Calendar className="w-5 h-5" />
                                    Últimas Gerações ({recentGenerations.length})
                                </h3>
                            </div>

                            {/* Agrupar por batch_id */}
                            {Object.entries(
                                recentGenerations.reduce((acc, gen) => {
                                    if (!acc[gen.batch_id]) acc[gen.batch_id] = [];
                                    acc[gen.batch_id].push(gen);
                                    return acc;
                                }, {} as Record<string, DnaGeracao[]>)
                            ).map(([batchId, batchItems]) => (
                                <div key={batchId} className="mb-6 last:mb-0">
                                    {/* Header do Lote */}
                                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                                        <div className="flex items-center gap-2">
                                            <span className="text-amber-500 text-xs font-bold uppercase tracking-wider">
                                                Lote ({batchItems.length} msgs)
                                            </span>
                                            <span className="text-slate-500 text-xs">
                                                {new Date(batchItems[0].created_at).toLocaleString('pt-BR', {
                                                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteBatch(batchId)}
                                            disabled={deletingBatch === batchId}
                                            className="flex items-center gap-1.5 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded border border-red-500/20 transition-all"
                                        >
                                            {deletingBatch === batchId ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                            Apagar Lote
                                        </button>
                                    </div>

                                    {/* Mensagens do Lote */}
                                    <div className="space-y-3">
                                        {batchItems.map((gen) => (
                                            <div key={gen.id} className="bg-black/30 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-amber-500 text-xs font-bold">#{gen.id}</span>
                                                        <span className="text-[10px] text-slate-500 uppercase border border-white/10 px-1.5 rounded">
                                                            {gen.categoria}
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleCopy(gen.texto_msg, gen.id)}
                                                            className="text-xs px-2 py-1 bg-white/10 rounded text-slate-300 hover:text-white transition-all flex items-center gap-1"
                                                            title="Copiar mensagem"
                                                        >
                                                            {copiedId === gen.id ? '✓' : <Copy className="w-3 h-3" />}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteGeneration(gen.id)}
                                                            disabled={deletingGenId === gen.id}
                                                            className="text-xs px-2 py-1 bg-red-500/10 rounded text-red-400 hover:bg-red-500/20 transition-all flex items-center gap-1"
                                                            title="Apagar mensagem"
                                                        >
                                                            {deletingGenId === gen.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="prose prose-invert prose-sm max-w-none whitespace-pre-line [&>p]:mb-3 [&>*:last-child]:mb-0 text-slate-300">
                                                    <ReactMarkdown>{gen.texto_msg}</ReactMarkdown>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

            </div>
        </CosmicBackground>
    );
}
