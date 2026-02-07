'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Wand2, Loader2, BookOpen, Heart, Book, Lightbulb, Megaphone, MessageCircle, HelpCircle, Layers, Sparkles, Copy, Trash2, Calendar, Filter, ChevronDown, CheckSquare, Square, RefreshCw, Eye, Check } from 'lucide-react';
import { CosmicBackground } from '@/components/ui/CosmicBackground';
import { executarModoComFiltros, getDataHoje, CategoriaDna, saveDnaGeracoes, getDnaGeracoes, DnaGeracao, deleteDnaGeracao, deleteDnaGeracaoBatch, fetchInspirationCandidates } from '@/lib/supabase';
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

const QUANTIDADES = [5, 10, 15, 20, 30];
const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function GeradorEstiloPage() {
    const [selectedCategory, setSelectedCategory] = useState<CategoriaDna | null>(null);
    const [generating, setGenerating] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [quantidade, setQuantidade] = useState(5);

    // Filtros Avançados
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [filtroTema, setFiltroTema] = useState('');
    const [filtroFormato, setFiltroFormato] = useState('');
    const [filtroPeriodo, setFiltroPeriodo] = useState('');
    const [filtroMomento, setFiltroMomento] = useState('');
    const [diasSelecionados, setDiasSelecionados] = useState<string[]>([]);
    const [usarDnaBase, setUsarDnaBase] = useState(true);
    const [usarPassagemDia, setUsarPassagemDia] = useState(false);
    const [filtroNeutro, setFiltroNeutro] = useState(false);
    const [contextoEstrategia, setContextoEstrategia] = useState<'recent_5' | 'recent_10' | 'mixed'>('recent_5');

    // MANUAL CURATION STATE
    const [candidates, setCandidates] = useState<{ id: number; texto: string; selected: boolean }[]>([]);
    const [showCandidates, setShowCandidates] = useState(false);
    const [loadingCandidates, setLoadingCandidates] = useState(false);

    // Carregar candidatos quando estratégia ou categoria muda
    useEffect(() => {
        if (selectedCategory && usarDnaBase) {
            loadCandidates();
        }
    }, [selectedCategory, contextoEstrategia, usarDnaBase]);

    const loadCandidates = async () => {
        if (!selectedCategory) return;
        setLoadingCandidates(true);
        try {
            const data = await fetchInspirationCandidates('dna', contextoEstrategia, selectedCategory);
            setCandidates(data);
        } catch (err) {
            console.error("Erro carregando inspiração:", err);
        } finally {
            setLoadingCandidates(false);
        }
    };

    const toggleCandidate = (id: number) => {
        setCandidates(prev => prev.map(c => c.id === id ? { ...c, selected: !c.selected } : c));
    };



    // Últimas Gerações
    const [recentGenerations, setRecentGenerations] = useState<DnaGeracao[]>([]);
    const [deletingBatch, setDeletingBatch] = useState<string | null>(null);
    const [deletingGenId, setDeletingGenId] = useState<number | null>(null);
    const [copiedId, setCopiedId] = useState<number | null>(null);

    // Opções de filtros
    const FORMATOS = ['Curto', 'Médio', 'Longo'];
    const PERIODOS = ['Manhã', 'Tarde', 'Noite', 'Madrugada'];
    const MOMENTOS = ['Começo de Semana', 'Fim de Semana', 'Início do Mês', 'Fim do Mês'];

    // Carregar histórico inicial
    useEffect(() => {
        loadRecentGenerations();
    }, []);

    const loadRecentGenerations = async () => {
        const data = await getDnaGeracoes(3); // Últimos 3 dias
        setRecentGenerations(data);
    };

    const toggleDia = (dia: string) => {
        setDiasSelecionados(prev =>
            prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
        );
    };

    const handleGerar = async () => {
        if (!selectedCategory) return;
        setGenerating(true);
        setResult(null);

        const filtros = {
            estilo: selectedCategory,
            quantidade,
            tema: filtroTema || undefined,
            formato: filtroFormato || undefined,
            periodo: filtroPeriodo || undefined,
            momento: filtroMomento || undefined,
            diasSemana: diasSelecionados.length > 0 ? diasSelecionados.join(', ') : undefined,
            usarDnaBase,
            usarPassagemDia,
            neutro: filtroNeutro,
            contextoEstrategia,
            // Injetar contexto manual selecionado
            contextoManual: (usarDnaBase && candidates.length > 0)
                ? candidates.filter(c => c.selected).map(c => c.texto)
                : undefined
        };

        try {
            // Chamada para o modo_estilo backend
            const response = await executarModoComFiltros('modo_estilo', getDataHoje(), filtros);

            if (response.ok && response.resultado) {
                setResult(response.resultado);

                // Salvar gerações com tracking de tema
                const mensagens = response.resultado.split(/\n\s*---\s*\n/).filter((p: string) => p.trim().length > 0);
                if (mensagens.length > 0) {
                    const temaUsado = response.tema_usado || filtroTema || undefined;
                    await saveDnaGeracoes(mensagens, selectedCategory, filtros, temaUsado);
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
            <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-12 relative z-10">

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
                <section className="mb-8 animate-enter">
                    <h2 className="text-sm uppercase tracking-widest text-slate-500 font-bold mb-4">1. Escolha o Estilo (Formato)</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {CATEGORIAS.map(cat => {
                            const isSelected = selectedCategory === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`relative p-3 rounded-xl border text-left transition-all group ${isSelected
                                        ? `${cat.cor} ring-2 ring-offset-2 ring-offset-black ring-indigo-500`
                                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                                        }`}
                                >
                                    <cat.icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-current' : 'text-slate-400 group-hover:text-white'}`} />
                                    <h3 className={`font-bold text-sm ${isSelected ? 'text-current' : 'text-slate-200'}`}>{cat.nome}</h3>
                                </button>
                            )
                        })}
                    </div>
                </section>

                {/* Passo 2: Configuração e Filtros */}
                <section className="mb-8 animate-enter" style={{ animationDelay: '100ms' }}>
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <select
                            value={quantidade}
                            onChange={(e) => setQuantidade(Number(e.target.value))}
                            className="px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-violet-500 focus:outline-none"
                        >
                            {QUANTIDADES.map(q => <option key={q} value={q} className="bg-slate-900">{q} mensagens</option>)}
                        </select>

                        <button
                            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold border transition-all ${showAdvancedFilters ? 'bg-violet-500/20 border-violet-500/30 text-violet-300' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`}
                        >
                            <Filter className="w-4 h-4" />
                            Filtros Avançados
                            <ChevronDown className={`w-4 h-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
                        </button>

                        <button
                            onClick={handleGerar}
                            disabled={!selectedCategory || generating}
                            className={`flex-1 px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${!selectedCategory || generating
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/25'
                                }`}
                        >
                            {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                            {generating ? 'Gerando...' : `Gerar ${quantidade} Mensagens`}
                        </button>
                    </div>

                    {/* Painel de Filtros */}
                    {showAdvancedFilters && (
                        <div className="p-5 bg-black/40 border border-white/10 rounded-2xl animate-in slide-in-from-top-2 mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                                {/* Tema */}
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1.5 uppercase font-semibold">Tema (livre)</label>
                                    <input
                                        type="text"
                                        value={filtroTema}
                                        onChange={(e) => setFiltroTema(e.target.value)}
                                        placeholder="Ex: Esperança, Fé..."
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
                                    />
                                </div>

                                {/* Formato */}
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1.5 uppercase font-semibold">Tamanho</label>
                                    <select
                                        value={filtroFormato}
                                        onChange={(e) => setFiltroFormato(e.target.value)}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-violet-500 focus:outline-none"
                                    >
                                        <option value="" className="bg-slate-900">Padrão do Estilo</option>
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

                                {/* Momento */}
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1.5 uppercase font-semibold">Momento</label>
                                    <select
                                        value={filtroMomento}
                                        onChange={(e) => setFiltroMomento(e.target.value)}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-violet-500 focus:outline-none"
                                    >
                                        <option value="" className="bg-slate-900">Qualquer momento</option>
                                        {MOMENTOS.map(m => <option key={m} value={m} className="bg-slate-900">{m}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="mt-5 pt-5 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Dias da Semana */}
                                <div>
                                    <label className="block text-xs text-slate-400 mb-2 uppercase font-semibold">Dias da Semana (Mencionar no texto)</label>
                                    <div className="flex flex-wrap gap-2">
                                        {DIAS_SEMANA.map(dia => {
                                            const active = diasSelecionados.includes(dia);
                                            return (
                                                <button
                                                    key={dia}
                                                    onClick={() => toggleDia(dia)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${active ? 'bg-violet-500/20 border-violet-500/30 text-violet-300' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                                                >
                                                    {active ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                                                    {dia}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Toggles */}
                                <div className="space-y-3">
                                    <button
                                        onClick={() => setUsarDnaBase(!usarDnaBase)}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm border transition-all ${usarDnaBase ? 'bg-green-500/10 border-green-500/20 text-green-300' : 'bg-white/5 border-white/10 text-slate-400'}`}
                                    >
                                        <span className="font-medium">Usar DNA Base (Teologia)</span>
                                        <div className={`w-8 h-4 rounded-full relative transition-colors ${usarDnaBase ? 'bg-green-500' : 'bg-slate-700'}`}>
                                            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${usarDnaBase ? 'left-4.5 translate-x-0.5' : 'left-0.5'}`} />
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setUsarPassagemDia(!usarPassagemDia)}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm border transition-all ${usarPassagemDia ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-white/5 border-white/10 text-slate-400'}`}
                                    >
                                        <span className="font-medium">Usar Passagem do Dia</span>
                                        <div className={`w-8 h-4 rounded-full relative transition-colors ${usarPassagemDia ? 'bg-amber-500' : 'bg-slate-700'}`}>
                                            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${usarPassagemDia ? 'left-4.5 translate-x-0.5' : 'left-0.5'}`} />
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div className="mt-5 pt-5 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Estratégia de Contexto */}
                                <div>
                                    <label className="block text-xs text-slate-400 mb-2 uppercase font-semibold">Fonte de Inspiração (Contexto)</label>
                                    <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                                        <button
                                            onClick={() => setContextoEstrategia('recent_5')}
                                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${contextoEstrategia === 'recent_5' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                        >
                                            5 Últimas
                                        </button>
                                        <button
                                            onClick={() => setContextoEstrategia('recent_10')}
                                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${contextoEstrategia === 'recent_10' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                        >
                                            10 Últimas
                                        </button>
                                        <button
                                            onClick={() => setContextoEstrategia('mixed')}
                                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${contextoEstrategia === 'mixed' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                        >
                                            Misturado
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-1.5">
                                        {contextoEstrategia === 'recent_5' && 'Usa as 5 mensagens mais recentes.'}
                                        {contextoEstrategia === 'recent_10' && 'Usa as 10 mensagens mais recentes.'}
                                        {contextoEstrategia === 'mixed' && 'Pega 10 mensagens variadas do histórico.'}
                                    </p>
                                </div>

                                {/* Toggle Neutro */}
                                <div>
                                    <label className="block text-xs text-slate-400 mb-2 uppercase font-semibold">Configurações Extras</label>
                                    <button
                                        onClick={() => setFiltroNeutro(!filtroNeutro)}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm border transition-all ${filtroNeutro ? 'bg-slate-500/20 border-slate-500/30 text-slate-300' : 'bg-white/5 border-white/10 text-slate-400'}`}
                                    >
                                        <div className="flex flex-col items-start text-left">
                                            <span className="font-medium">Filtro Neutro (Sem Saudações)</span>
                                            <span className="text-[10px] opacity-70">Remove "Bom dia", "Boa tarde", etc.</span>
                                        </div>
                                        <div className={`w-8 h-4 rounded-full relative transition-colors ${filtroNeutro ? 'bg-slate-500' : 'bg-slate-700'}`}>
                                            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${filtroNeutro ? 'left-4.5 translate-x-0.5' : 'left-0.5'}`} />
                                        </div>
                                    </button>
                                </div>
                            </div>
                            {/* MANUAL CURATION PREVIEW */}
                            {usarDnaBase && selectedCategory && (
                                <div className="mt-5 pt-5 border-t border-white/10">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-amber-400" />
                                            <h4 className="text-sm font-bold text-white">Inspiração Selecionada</h4>
                                        </div>
                                        <button
                                            onClick={() => setShowCandidates(!showCandidates)}
                                            className="text-xs flex items-center gap-1.5 text-violet-300 hover:text-white transition-colors"
                                        >
                                            {loadingCandidates ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                                            {showCandidates ? 'Ocultar' : 'Ver/Editar'}
                                            <span className="bg-violet-500/20 text-violet-200 px-1.5 rounded text-[10px]">
                                                {candidates.filter(c => c.selected).length}/{candidates.length}
                                            </span>
                                        </button>
                                    </div>

                                    {showCandidates && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar bg-black/20 p-2 rounded-xl border border-white/5">
                                            {loadingCandidates ? (
                                                <div className="col-span-full py-8 text-center text-slate-500 text-xs">
                                                    <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2 opacity-50" />
                                                    Carregando inspiração...
                                                </div>
                                            ) : candidates.length === 0 ? (
                                                <div className="col-span-full py-8 text-center text-slate-500 text-xs">
                                                    Nenhuma mensagem encontrada para esta estratégia.
                                                </div>
                                            ) : (
                                                candidates.map(c => (
                                                    <div
                                                        key={c.id}
                                                        onClick={() => toggleCandidate(c.id)}
                                                        className={`
                                                            p-2.5 rounded-lg border cursor-pointer text-left transition-all relative group
                                                            ${c.selected
                                                                ? 'bg-violet-500/10 border-violet-500/30 text-slate-200'
                                                                : 'bg-transparent border-white/5 text-slate-600 opacity-60 hover:opacity-100'}
                                                        `}
                                                    >
                                                        <div className="flex justify-between items-start gap-2 mb-1">
                                                            <span className="text-[10px] uppercase font-bold text-slate-500">#{c.id}</span>
                                                            {c.selected && <Check className="w-3 h-3 text-violet-400" />}
                                                        </div>
                                                        <p className="text-[11px] line-clamp-2 leading-relaxed opacity-90">{c.texto}</p>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
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
                            <div className="space-y-8">
                                {result.split(/\n\s*---\s*\n/).filter(msg => msg.trim().length > 0).map((msg, i) => (
                                    <div key={i} className="relative group">
                                        <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                            <button
                                                onClick={() => handleCopy(msg, -i)}
                                                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-slate-300"
                                                title="Copiar"
                                            >
                                                {copiedId === -i ? '✓' : <Copy className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        <div className="prose prose-invert max-w-none prose-p:text-slate-300 whitespace-pre-line">
                                            <ReactMarkdown>{msg}</ReactMarkdown>
                                        </div>
                                        {i < result.split(/\n\s*---\s*\n/).length - 1 && (
                                            <div className="h-px bg-white/10 my-8 w-full" />
                                        )}
                                    </div>
                                ))}
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
