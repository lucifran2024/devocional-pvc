'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Book, Sparkles, Copy, Trash2, Calendar, Loader2, Wand2, X, Filter, ChevronDown, Plus, Layers, BookOpen, Heart, MessageCircle, Megaphone, Lightbulb, HelpCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
    getDnaCategorizado,
    addDnaCategorizado,
    removeDnaById,
    getCategoriaStats,
    executarModoComFiltros,
    getDataHoje,
    DnaCategorizado,
    CategoriaDna,
    CategoriaStats
} from '@/lib/supabase';
import { CosmicHeader } from '@/components/ui/CosmicHeader';
import { CosmicBackground } from '@/components/ui/CosmicBackground';

// ==================== CATEGORIAS ====================
const CATEGORIAS: { id: CategoriaDna; nome: string; icon: typeof Book; cor: string }[] = [
    { id: 'devocional', nome: 'Devocional', icon: BookOpen, cor: 'text-blue-400 bg-blue-500/20 border-blue-500/30' },
    { id: 'oração', nome: 'Oração', icon: Heart, cor: 'text-pink-400 bg-pink-500/20 border-pink-500/30' },
    { id: 'versículo', nome: 'Versículo', icon: Book, cor: 'text-amber-400 bg-amber-500/20 border-amber-500/30' },
    { id: 'reflexão', nome: 'Reflexão', icon: Lightbulb, cor: 'text-purple-400 bg-purple-500/20 border-purple-500/30' },
    { id: 'exortação', nome: 'Exortação', icon: Megaphone, cor: 'text-green-400 bg-green-500/20 border-green-500/30' },
    { id: 'declaração', nome: 'Declaração', icon: MessageCircle, cor: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30' },
    { id: 'outro', nome: 'Outro', icon: HelpCircle, cor: 'text-slate-400 bg-slate-500/20 border-slate-500/30' },
];

const QUANTIDADES = [5, 10, 15, 20, 30];

export default function DnaCategorizadoPage() {
    const [items, setItems] = useState<DnaCategorizado[]>([]);
    const [stats, setStats] = useState<CategoriaStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [copiedId, setCopiedId] = useState<number | null>(null);

    // Filtro de categoria
    const [filtroCategoria, setFiltroCategoria] = useState<CategoriaDna | 'todas'>('todas');

    // Form de adição
    const [showAddForm, setShowAddForm] = useState(false);
    const [novoTexto, setNovoTexto] = useState('');
    const [novaCategoria, setNovaCategoria] = useState<CategoriaDna>('reflexão');
    const [adding, setAdding] = useState(false);

    // Geração
    const [generating, setGenerating] = useState(false);
    const [generatedResult, setGeneratedResult] = useState<string | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [filtroQuantidade, setFiltroQuantidade] = useState(10);
    const [filtroCategoriaGerar, setFiltroCategoriaGerar] = useState<CategoriaDna | 'todas'>('todas');

    // Filtros Avançados de Geração
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [filtroTema, setFiltroTema] = useState('');
    const [filtroFormato, setFiltroFormato] = useState('');
    const [filtroPeriodo, setFiltroPeriodo] = useState('');
    const [usarDnaBase, setUsarDnaBase] = useState(true);

    // Opções de filtros
    const TEMAS = ['Esperança', 'Fé', 'Amor', 'Perseverança', 'Gratidão', 'Renovação', 'Força', 'Paz', 'Sabedoria', 'Propósito'];
    const FORMATOS = ['Reflexão curta', 'Devocional completo', 'Oração', 'Versículo comentado', 'Exortação', 'Declaração de fé'];
    const PERIODOS = ['Manhã', 'Tarde', 'Noite', 'Madrugada'];

    const loadData = async () => {
        setLoading(true);
        try {
            const categoria = filtroCategoria === 'todas' ? undefined : filtroCategoria;
            const [dataItems, dataStats] = await Promise.all([
                getDnaCategorizado(categoria),
                getCategoriaStats()
            ]);
            setItems(dataItems);
            setStats(dataStats);
        } catch (e) {
            console.error('Erro ao carregar:', e);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [filtroCategoria]);

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
        const success = await removeDnaById(id);
        if (success) {
            setItems(prev => prev.filter(item => item.id !== id));
            // Atualiza stats
            const newStats = await getCategoriaStats();
            setStats(newStats);
        } else {
            alert('Erro ao remover.');
        }
        setDeletingId(null);
    };

    const handleAdd = async () => {
        if (!novoTexto.trim()) {
            alert('Digite o texto da mensagem');
            return;
        }
        setAdding(true);
        const result = await addDnaCategorizado(novoTexto, novaCategoria);
        if (result) {
            setNovoTexto('');
            setShowAddForm(false);
            await loadData();
        } else {
            alert('Erro ao adicionar');
        }
        setAdding(false);
    };

    const handleGerar = async () => {
        if (items.length === 0) {
            alert('Adicione mensagens primeiro!');
            return;
        }
        setGenerating(true);
        setGeneratedResult(null);

        const filtros = {
            quantidade: filtroQuantidade,
            categoria: filtroCategoriaGerar !== 'todas' ? filtroCategoriaGerar : undefined,
            tema: filtroTema || undefined,
            formato: filtroFormato || undefined,
            periodo: filtroPeriodo || undefined,
            usarDnaBase,
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

    const getCategoriaInfo = (cat: CategoriaDna) => CATEGORIAS.find(c => c.id === cat) || CATEGORIAS[6];

    const totalItems = useMemo(() => stats.reduce((acc, s) => acc + s.total, 0), [stats]);

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
                                <div className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-violet-500/10 border border-violet-400/20 rounded-full text-violet-300 text-[10px] font-black uppercase tracking-[0.2em]">
                                    <Layers className="w-3.5 h-3.5" />
                                    DNA Categorizado
                                </div>
                            </div>

                            <h1 className="text-4xl md:text-7xl font-black tracking-tight text-white mb-4 text-center md:text-left">
                                DNA <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-200 to-fuchsia-500">Categorizado</span>
                            </h1>

                            {/* ESTATÍSTICAS POR CATEGORIA */}
                            <div className="flex flex-wrap items-center gap-2 mb-6">
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm">
                                    <Layers className="w-4 h-4 text-violet-400" />
                                    <span className="text-slate-300">{totalItems} mensagens</span>
                                </div>
                                {stats.map(s => {
                                    const cat = getCategoriaInfo(s.categoria);
                                    return (
                                        <button
                                            key={s.categoria}
                                            onClick={() => setFiltroCategoria(s.categoria)}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filtroCategoria === s.categoria ? cat.cor : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                                                }`}
                                        >
                                            <cat.icon className="w-3 h-3" />
                                            {cat.nome} ({s.total})
                                        </button>
                                    );
                                })}
                                {filtroCategoria !== 'todas' && (
                                    <button
                                        onClick={() => setFiltroCategoria('todas')}
                                        className="text-xs text-violet-400 hover:text-violet-300"
                                    >
                                        ✕ Ver todas
                                    </button>
                                )}
                            </div>

                            {/* AÇÕES */}
                            <div className="flex flex-wrap items-center gap-3 mt-4">
                                <button
                                    onClick={() => setShowAddForm(!showAddForm)}
                                    className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl border border-white/20 transition-all"
                                >
                                    <Plus className="w-5 h-5" />
                                    Adicionar Mensagem
                                </button>

                                <button
                                    onClick={handleGerar}
                                    disabled={generating || items.length === 0}
                                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
                                >
                                    {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                                    {generating ? 'Gerando...' : `✨ Gerar ${filtroQuantidade} Inspirados`}
                                </button>

                                {/* Filtros de geração */}
                                <select
                                    value={filtroQuantidade}
                                    onChange={(e) => setFiltroQuantidade(Number(e.target.value))}
                                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-violet-500 focus:outline-none"
                                >
                                    {QUANTIDADES.map(q => <option key={q} value={q} className="bg-slate-900">{q}</option>)}
                                </select>

                                <select
                                    value={filtroCategoriaGerar}
                                    onChange={(e) => setFiltroCategoriaGerar(e.target.value as CategoriaDna | 'todas')}
                                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-violet-500 focus:outline-none"
                                >
                                    <option value="todas" className="bg-slate-900">Todas categorias</option>
                                    {CATEGORIAS.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.nome}</option>)}
                                </select>

                                <button
                                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all ${showAdvancedFilters ? 'bg-violet-500/20 border-violet-500/30 text-violet-300' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                                >
                                    <Filter className="w-4 h-4" />
                                    Filtros Avançados
                                    <ChevronDown className={`w-4 h-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
                                </button>
                            </div>

                            {/* FILTROS AVANÇADOS */}
                            {showAdvancedFilters && (
                                <div className="mt-4 p-4 bg-black/30 border border-white/10 rounded-xl animate-in slide-in-from-top-2">
                                    <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                                        <Filter className="w-4 h-4 text-violet-400" />
                                        Filtros Avançados de Geração
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {/* Tema */}
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1.5 uppercase font-semibold">Tema</label>
                                            <select
                                                value={filtroTema}
                                                onChange={(e) => setFiltroTema(e.target.value)}
                                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-violet-500 focus:outline-none"
                                            >
                                                <option value="" className="bg-slate-900">Qualquer tema</option>
                                                {TEMAS.map(t => <option key={t} value={t} className="bg-slate-900">{t}</option>)}
                                            </select>
                                        </div>

                                        {/* Formato */}
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1.5 uppercase font-semibold">Formato</label>
                                            <select
                                                value={filtroFormato}
                                                onChange={(e) => setFiltroFormato(e.target.value)}
                                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-violet-500 focus:outline-none"
                                            >
                                                <option value="" className="bg-slate-900">Qualquer formato</option>
                                                {FORMATOS.map(f => <option key={f} value={f} className="bg-slate-900">{f}</option>)}
                                            </select>
                                        </div>

                                        {/* Período */}
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1.5 uppercase font-semibold">Período do Dia</label>
                                            <select
                                                value={filtroPeriodo}
                                                onChange={(e) => setFiltroPeriodo(e.target.value)}
                                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-violet-500 focus:outline-none"
                                            >
                                                <option value="" className="bg-slate-900">Qualquer período</option>
                                                {PERIODOS.map(p => <option key={p} value={p} className="bg-slate-900">{p}</option>)}
                                            </select>
                                        </div>

                                        {/* DNA Base Toggle */}
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1.5 uppercase font-semibold">DNA Base</label>
                                            <button
                                                onClick={() => setUsarDnaBase(!usarDnaBase)}
                                                className={`w-full px-3 py-2 rounded-lg text-sm font-medium border transition-all ${usarDnaBase ? 'bg-green-500/20 border-green-500/30 text-green-300' : 'bg-white/5 border-white/10 text-slate-400'}`}
                                            >
                                                {usarDnaBase ? '✓ Usar DNA Salvo' : '✗ Sem DNA Base'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Limpar Filtros */}
                                    {(filtroTema || filtroFormato || filtroPeriodo) && (
                                        <button
                                            onClick={() => { setFiltroTema(''); setFiltroFormato(''); setFiltroPeriodo(''); }}
                                            className="mt-3 text-xs text-violet-400 hover:text-violet-300"
                                        >
                                            ✕ Limpar filtros avançados
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* FORM DE ADIÇÃO */}
                            {showAddForm && (
                                <div className="mt-4 p-4 bg-black/40 border border-white/10 rounded-xl animate-in slide-in-from-top-2">
                                    <h3 className="text-white font-bold mb-3">Adicionar Nova Mensagem</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1 uppercase font-semibold">Categoria</label>
                                            <div className="flex flex-wrap gap-2">
                                                {CATEGORIAS.map(cat => (
                                                    <button
                                                        key={cat.id}
                                                        onClick={() => setNovaCategoria(cat.id)}
                                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${novaCategoria === cat.id ? cat.cor : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                                                            }`}
                                                    >
                                                        <cat.icon className="w-3 h-3" />
                                                        {cat.nome}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1 uppercase font-semibold">Texto</label>
                                            <textarea
                                                value={novoTexto}
                                                onChange={(e) => setNovoTexto(e.target.value)}
                                                placeholder="Cole ou digite a mensagem aqui..."
                                                rows={5}
                                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none resize-none"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleAdd}
                                                disabled={adding || !novoTexto.trim()}
                                                className="flex items-center gap-2 px-4 py-2 bg-violet-500 text-white font-bold rounded-lg hover:bg-violet-600 disabled:opacity-50"
                                            >
                                                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                                {adding ? 'Adicionando...' : 'Adicionar'}
                                            </button>
                                            <button
                                                onClick={() => setShowAddForm(false)}
                                                className="px-4 py-2 text-slate-400 hover:text-white"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CosmicHeader>
                </div>

                <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-20 flex flex-col space-y-8 py-20">

                    {/* Resultado da Geração */}
                    {showResult && generatedResult && (
                        <div className="bg-gradient-to-br from-violet-900/20 to-fuchsia-900/10 border border-violet-500/30 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-violet-400 font-bold text-lg">✨ Mensagens Geradas ({parseMessages(generatedResult).length})</h3>
                                <button onClick={() => setShowResult(false)} className="p-2 hover:bg-white/10 rounded-lg">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                            <div className="space-y-6">
                                {parseMessages(generatedResult).map((msg, i) => (
                                    <div key={i} className="bg-black/30 border border-white/10 rounded-xl p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-violet-500 text-xs font-bold">Msg {i + 1}</span>
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

                    {/* Lista de DNA */}
                    {loading ? (
                        [1, 2, 3].map(i => (
                            <div key={i} className="h-40 bg-white/[0.02] rounded-2xl animate-pulse border border-white/5" />
                        ))
                    ) : items.length === 0 ? (
                        <div className="text-center py-20 bg-white/[0.02] rounded-3xl border border-white/5">
                            <Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-400 mb-2">
                                {filtroCategoria === 'todas' ? 'Nenhuma mensagem ainda' : `Nenhuma mensagem em "${getCategoriaInfo(filtroCategoria).nome}"`}
                            </h3>
                            <p className="text-slate-500 text-sm">Adicione mensagens para o DNA aprender.</p>
                        </div>
                    ) : (
                        items.map((item) => {
                            const cat = getCategoriaInfo(item.categoria);
                            return (
                                <div key={item.id} className="group relative bg-[#020617]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-violet-500/30 transition-all">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cat.cor}`}>
                                                <cat.icon className="w-3 h-3" />
                                                {cat.nome}
                                            </div>
                                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/[0.03] border border-white/5 rounded-full text-slate-400 text-[10px] font-bold uppercase">
                                                <Calendar className="w-3 h-3 text-violet-500" />
                                                {new Date(item.created_at).toLocaleDateString('pt-BR')}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleCopy(item.texto_msg, item.id)}
                                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 border border-violet-500/20 text-xs font-bold"
                                            >
                                                <Copy className="w-3 h-3" />
                                                {copiedId === item.id ? 'Copiado!' : 'Copiar'}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                disabled={deletingId === item.id}
                                                className="p-2 rounded-lg bg-white/5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-white/5"
                                            >
                                                {deletingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="prose prose-invert max-w-none prose-p:text-slate-300">
                                        <ReactMarkdown>{item.texto_msg}</ReactMarkdown>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </main>
            </div>
        </CosmicBackground>
    );
}
