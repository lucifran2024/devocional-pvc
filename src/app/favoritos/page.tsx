'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Book, Sparkles, Copy, Trash2, Calendar, Loader2, Wand2, X, Filter, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getFavoritosManuais, FavoritoMensagem, removeFavoritoById, executarModoComFiltros, getDataHoje } from '@/lib/supabase';
import { CosmicHeader } from '@/components/ui/CosmicHeader';
import { CosmicBackground } from '@/components/ui/CosmicBackground';

// Opções de filtros
const TEMAS = ['Todos', 'Esperança', 'Fé', 'Amor', 'Gratidão', 'Força', 'Paz', 'Perseverança'];
const TIPOS = ['Todos', 'Versículo', 'Devocional', 'Oração', 'Reflexão'];
const FORMATOS = ['Todos', 'Staccato', 'Narrativo', 'Lista', 'Pergunta'];
const QUANTIDADES = [5, 10, 15, 20];
const DNA_BASE = ['Todas', '5 mais recentes', '10 mais recentes', '15 mais recentes', '5 aleatórias', '10 aleatórias'];
const PERIODOS = ['Todos', 'Bom Dia', 'Boa Tarde', 'Boa Noite'];
const DIAS_SEMANA = ['Todos', 'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MOMENTOS = ['Todos', 'Fim de Semana', 'Começo de Semana', 'Fim do Mês'];

export default function FavoritosPage() {
    const [favoritos, setFavoritos] = useState<FavoritoMensagem[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [copiedId, setCopiedId] = useState<number | null>(null);

    // Estado para geração
    const [generating, setGenerating] = useState(false);
    const [generatedResult, setGeneratedResult] = useState<string | null>(null);
    const [showResult, setShowResult] = useState(false);

    // Estados dos filtros
    const [showFilters, setShowFilters] = useState(false);
    const [filtroTema, setFiltroTema] = useState('Todos');
    const [filtroTipo, setFiltroTipo] = useState('Todos');
    const [filtroFormato, setFiltroFormato] = useState('Todos');
    const [filtroQuantidade, setFiltroQuantidade] = useState(10);
    const [filtroDnaBase, setFiltroDnaBase] = useState('Todas');
    const [filtroPeriodo, setFiltroPeriodo] = useState('Todos');
    const [filtroDia, setFiltroDia] = useState('Todos');
    const [filtroMomento, setFiltroMomento] = useState('Todos');

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

    // Handler de geração COM filtros
    const handleGerar = async () => {
        if (favoritos.length === 0) {
            alert('Adicione favoritas primeiro!');
            return;
        }
        setGenerating(true);
        setGeneratedResult(null);

        // Monta objeto de filtros (só envia se não for "Todos")
        const filtros = {
            tema: filtroTema !== 'Todos' ? filtroTema : undefined,
            tipo: filtroTipo !== 'Todos' ? filtroTipo : undefined,
            formato: filtroFormato !== 'Todos' ? filtroFormato : undefined,
            quantidade: filtroQuantidade,
            dnaBase: filtroDnaBase !== 'Todas' ? filtroDnaBase : undefined,
            periodo: filtroPeriodo !== 'Todos' ? filtroPeriodo : undefined,
            diaSemana: filtroDia !== 'Todos' ? filtroDia : undefined,
            momento: filtroMomento !== 'Todos' ? filtroMomento : undefined
        };

        try {
            const result = await executarModoComFiltros('modo_favoritas', getDataHoje(), filtros);
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

    const parseMessages = (text: string): string[] => {
        if (!text) return [];
        const parts = text.split(/\n\s*---\s*\n/);
        return parts.filter(p => p.trim().length > 0);
    };

    // Verifica se algum filtro está ativo
    const temFiltroAtivo = filtroTema !== 'Todos' || filtroTipo !== 'Todos' || filtroFormato !== 'Todos' || filtroQuantidade !== 10 || filtroDnaBase !== 'Todas' || filtroPeriodo !== 'Todos' || filtroDia !== 'Todos' || filtroMomento !== 'Todos';

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

                            {/* Botões de ação */}
                            <div className="flex flex-wrap items-center gap-3 mt-4">
                                <button
                                    onClick={handleGerar}
                                    disabled={generating || favoritos.length === 0}
                                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
                                >
                                    {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                                    {generating ? 'Gerando...' : `✨ Gerar ${filtroQuantidade} Inspirados`}
                                </button>

                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${temFiltroAtivo
                                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                                        }`}
                                >
                                    <Filter className="w-4 h-4" />
                                    Filtros
                                    {temFiltroAtivo && <span className="w-2 h-2 bg-amber-400 rounded-full"></span>}
                                    <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                                </button>
                            </div>

                            {/* Painel de Filtros */}
                            {showFilters && (
                                <div className="mt-4 p-4 bg-black/40 border border-white/10 rounded-xl animate-in slide-in-from-top-2">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {/* Tema */}
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase">Tema</label>
                                            <select
                                                value={filtroTema}
                                                onChange={(e) => setFiltroTema(e.target.value)}
                                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-amber-500 focus:outline-none"
                                            >
                                                {TEMAS.map(t => <option key={t} value={t} className="bg-slate-900">{t}</option>)}
                                            </select>
                                        </div>

                                        {/* Tipo */}
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase">Tipo</label>
                                            <select
                                                value={filtroTipo}
                                                onChange={(e) => setFiltroTipo(e.target.value)}
                                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-amber-500 focus:outline-none"
                                            >
                                                {TIPOS.map(t => <option key={t} value={t} className="bg-slate-900">{t}</option>)}
                                            </select>
                                        </div>

                                        {/* Formato */}
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase">Formato</label>
                                            <select
                                                value={filtroFormato}
                                                onChange={(e) => setFiltroFormato(e.target.value)}
                                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-amber-500 focus:outline-none"
                                            >
                                                {FORMATOS.map(f => <option key={f} value={f} className="bg-slate-900">{f}</option>)}
                                            </select>
                                        </div>

                                        {/* Quantidade */}
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase">Gerar</label>
                                            <select
                                                value={filtroQuantidade}
                                                onChange={(e) => setFiltroQuantidade(Number(e.target.value))}
                                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-amber-500 focus:outline-none"
                                            >
                                                {QUANTIDADES.map(q => <option key={q} value={q} className="bg-slate-900">{q} mensagens</option>)}
                                            </select>
                                        </div>

                                        {/* DNA Base */}
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase">Base DNA</label>
                                            <select
                                                value={filtroDnaBase}
                                                onChange={(e) => setFiltroDnaBase(e.target.value)}
                                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-amber-500 focus:outline-none"
                                            >
                                                {DNA_BASE.map(d => <option key={d} value={d} className="bg-slate-900">{d}</option>)}
                                            </select>
                                        </div>

                                        {/* Período */}
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase">Período</label>
                                            <select
                                                value={filtroPeriodo}
                                                onChange={(e) => setFiltroPeriodo(e.target.value)}
                                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-amber-500 focus:outline-none"
                                            >
                                                {PERIODOS.map(p => <option key={p} value={p} className="bg-slate-900">{p}</option>)}
                                            </select>
                                        </div>

                                        {/* Dia da Semana */}
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase">Dia</label>
                                            <select
                                                value={filtroDia}
                                                onChange={(e) => setFiltroDia(e.target.value)}
                                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-amber-500 focus:outline-none"
                                            >
                                                {DIAS_SEMANA.map(d => <option key={d} value={d} className="bg-slate-900">{d}</option>)}
                                            </select>
                                        </div>

                                        {/* Momento */}
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase">Momento</label>
                                            <select
                                                value={filtroMomento}
                                                onChange={(e) => setFiltroMomento(e.target.value)}
                                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-amber-500 focus:outline-none"
                                            >
                                                {MOMENTOS.map(m => <option key={m} value={m} className="bg-slate-900">{m}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Limpar filtros */}
                                    {temFiltroAtivo && (
                                        <button
                                            onClick={() => {
                                                setFiltroTema('Todos');
                                                setFiltroTipo('Todos');
                                                setFiltroFormato('Todos');
                                                setFiltroQuantidade(10);
                                                setFiltroDnaBase('Todas');
                                                setFiltroPeriodo('Todos');
                                                setFiltroDia('Todos');
                                                setFiltroMomento('Todos');
                                            }}
                                            className="mt-3 text-xs text-amber-400 hover:text-amber-300"
                                        >
                                            ✕ Limpar filtros
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </CosmicHeader>
                </div>

                <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-20 flex flex-col space-y-8 py-20">

                    {/* Resultado da Geração */}
                    {showResult && generatedResult && (
                        <div className="bg-gradient-to-br from-amber-900/20 to-yellow-900/10 border border-amber-500/30 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-amber-400 font-bold text-lg">✨ Mensagens Geradas ({parseMessages(generatedResult).length})</h3>
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
