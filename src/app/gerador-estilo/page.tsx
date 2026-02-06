
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Wand2, Loader2, BookOpen, Heart, Book, Lightbulb, Megaphone, MessageCircle, HelpCircle, Layers, Sparkles } from 'lucide-react';
import { CosmicBackground } from '@/components/ui/CosmicBackground';
import { CosmicHeader } from '@/components/ui/CosmicHeader';
import { executarModoComFiltros, getDataHoje, CategoriaDna, saveDnaGeracoes, getDnaGeracoes, DnaGeracao } from '@/lib/supabase';
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

                {/* Passo 2: Ação */}
                <section className={`mb-12 transition-all duration-500 ${selectedCategory ? 'opacity-100 translate-y-0' : 'opacity-50 translate-y-4 pointer-events-none'}`}>
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-900/40 to-violet-900/40 border border-indigo-500/30 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <h3 className="text-lg font-bold text-indigo-100 mb-1">Pronto para criar?</h3>
                            <p className="text-sm text-indigo-200/70">
                                A IA vai ler suas <b>Favoritas</b> (para pegar a essência e teologia) mas vai forçar a <b>Estrutura de {CATEGORIAS.find(c => c.id === selectedCategory)?.nome}</b>.
                            </p>
                        </div>

                        <div className="flex items-center gap-4">
                            <select
                                value={quantidade}
                                onChange={(e) => setQuantidade(Number(e.target.value))}
                                className="bg-black/40 border border-white/10 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-indigo-500"
                            >
                                <option value={3}>3 msg</option>
                                <option value={5}>5 msg</option>
                                <option value={10}>10 msg</option>
                            </select>

                            <button
                                onClick={handleGerar}
                                disabled={generating}
                                className="flex items-center gap-2 px-8 py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                                {generating ? 'Criando...' : 'Gerar Agora'}
                            </button>
                        </div>
                    </div>
                </section>

                {/* Resultado */}
                {result && (
                    <section className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-2">
                                <Sparkles className="w-4 h-4" /> Resultado Gerado
                            </h2>
                        </div>
                        <div className="p-6 md:p-8 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md">
                            <article className="prose prose-invert prose-p:text-slate-300 prose-headings:text-white max-w-none">
                                <ReactMarkdown>{result}</ReactMarkdown>
                            </article>
                        </div>
                    </section>
                )}

            </div>
        </CosmicBackground>
    );
}
