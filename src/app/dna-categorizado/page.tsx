'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Book, Sparkles, Copy, Trash2, Calendar, Loader2, Wand2, X, Filter, ChevronDown, Plus, Layers, BookOpen, Heart, MessageCircle, Megaphone, Lightbulb, HelpCircle, RefreshCw, Eye, Check, CheckSquare, Square, Pencil, Save, ThumbsUp, ThumbsDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
    getDnaCategorizado,
    addDnaCategorizado,
    removeDnaById,
    updateDnaCategorizado,
    getCategoriaStats,
    executarModoComFiltros,
    getDataHoje,
    DnaCategorizado,
    CategoriaDna,
    CategoriaStats,
    // NEW: DNA Gerações
    getDnaGeracoes,
    deleteDnaGeracao,
    deleteDnaGeracaoBatch,
    saveDnaGeracoes,
    saveFeedbackDna, // NEW Function
    DnaGeracao,
    fetchInspirationCandidates
} from '@/lib/supabase';
import { CosmicHeader } from '@/components/ui/CosmicHeader';
import { CosmicBackground } from '@/components/ui/CosmicBackground';

// ==================== CATEGORIAS ====================
const CATEGORIAS: { id: CategoriaDna; nome: string; icon: typeof Book; cor: string }[] = [
    { id: 'devocional', nome: 'Devocional', icon: BookOpen, cor: 'text-blue-400 bg-blue-500/20 border-blue-500/30' },
    { id: 'oracao', nome: 'Oração', icon: Heart, cor: 'text-pink-400 bg-pink-500/20 border-pink-500/30' },
    { id: 'versiculo', nome: 'Versículo', icon: Book, cor: 'text-amber-400 bg-amber-500/20 border-amber-500/30' },
    { id: 'reflexao', nome: 'Reflexão', icon: Lightbulb, cor: 'text-purple-400 bg-purple-500/20 border-purple-500/30' },
    { id: 'exortacao', nome: 'Exortação', icon: Megaphone, cor: 'text-green-400 bg-green-500/20 border-green-500/30' },
    { id: 'declaracao', nome: 'Declaração', icon: MessageCircle, cor: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30' },
    { id: 'outro', nome: 'Outro', icon: HelpCircle, cor: 'text-slate-400 bg-slate-500/20 border-slate-500/30' },
];

const QUANTIDADES = [1, 5, 10, 15, 20, 30];
const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// Tipos de abas disponíveis
type TabType = 'gerenciar' | 'gerar-dna' | 'gerar-estilo';

export default function DnaCategorizadoPage() {
    // === ESTADO DA ABA ATIVA ===
    const [activeTab, setActiveTab] = useState<TabType>('gerenciar');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab === 'gerenciar' || tab === 'gerar-dna' || tab === 'gerar-estilo') {
            setActiveTab(tab);
        }
    }, []);

    const [items, setItems] = useState<DnaCategorizado[]>([]);
    const [stats, setStats] = useState<CategoriaStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [copiedId, setCopiedId] = useState<number | null>(null);

    // Edição inline
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editTexto, setEditTexto] = useState('');
    const [editCategoria, setEditCategoria] = useState<CategoriaDna>('reflexao');
    const [saving, setSaving] = useState(false);

    // Filtro de categoria
    const [filtroCategoria, setFiltroCategoria] = useState<CategoriaDna | 'todas'>('todas');

    // === ESTADO DO GERADOR POR ESTILO ===
    const [selectedStyleCategory, setSelectedStyleCategory] = useState<CategoriaDna | null>(null);
    const [styleCandidates, setStyleCandidates] = useState<{ id: number; texto: string; selected: boolean }[]>([]);
    const [showStyleCandidates, setShowStyleCandidates] = useState(false);
    const [loadingStyleCandidates, setLoadingStyleCandidates] = useState(false);

    // Form de adição
    const [showAddForm, setShowAddForm] = useState(false);
    const [novoTexto, setNovoTexto] = useState('');
    const [novaCategoria, setNovaCategoria] = useState<CategoriaDna>('reflexao');
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
    const [filtroTamanho, setFiltroTamanho] = useState('');

    const [filtroPeriodo, setFiltroPeriodo] = useState('');
    const [filtroMomento, setFiltroMomento] = useState('');
    const [usarDnaBase, setUsarDnaBase] = useState(true);
    const [usarPassagemDia, setUsarPassagemDia] = useState(false);
    const [filtroNeutro, setFiltroNeutro] = useState(false);
    const [contextoEstrategia, setContextoEstrategia] = useState<'recent_5' | 'recent_10' | 'recent_20' | 'all' | 'mixed'>('mixed');
    const [diasSelecionados, setDiasSelecionados] = useState<string[]>([]);

    useEffect(() => {
        if (activeTab === 'gerar-dna' && !usarDnaBase) {
            setUsarDnaBase(true);
        }
    }, [activeTab, usarDnaBase]);

    const temFiltroAvancadoAtivo = Boolean(
        filtroTema ||
        filtroFormato ||
        filtroTamanho ||

        filtroPeriodo ||
        filtroMomento ||
        diasSelecionados.length > 0 ||
        filtroNeutro ||
        usarPassagemDia ||
        !usarDnaBase ||
        contextoEstrategia !== 'recent_5'
    );

    const resetAdvancedFilters = () => {
        setFiltroTema('');
        setFiltroFormato('');
        setFiltroTamanho('');

        setFiltroPeriodo('');
        setFiltroMomento('');
        setDiasSelecionados([]);
        setFiltroNeutro(false);
        setUsarPassagemDia(false);
        setUsarDnaBase(true);
        setContextoEstrategia('recent_5');
    };

    // MANUAL CURATION STATE
    const [candidates, setCandidates] = useState<{ id: number; texto: string; selected: boolean }[]>([]);
    const [showCandidates, setShowCandidates] = useState(false);
    const [loadingCandidates, setLoadingCandidates] = useState(false);

    // Carregar candidatos quando estratégia ou categoria muda
    useEffect(() => {
        if (filtroCategoriaGerar !== 'todas' && usarDnaBase) {
            loadCandidates();
        }
    }, [filtroCategoriaGerar, contextoEstrategia, usarDnaBase]);

    const loadCandidates = async () => {
        if (filtroCategoriaGerar === 'todas') return;
        setLoadingCandidates(true);
        try {
            const data = await fetchInspirationCandidates('dna', contextoEstrategia, filtroCategoriaGerar);
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

    const toggleDia = (dia: string) => {
        setDiasSelecionados(prev =>
            prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
        );
    };

    // Estilos de Apresentação (NOVO)


    // Últimas Gerações (Nova Tabela)
    const [recentGenerations, setRecentGenerations] = useState<DnaGeracao[]>([]);
    const [deletingBatch, setDeletingBatch] = useState<string | null>(null);
    const [deletingGenId, setDeletingGenId] = useState<number | null>(null);

    // Opções de filtros
    const TAMANHOS = ['Curto', 'Médio', 'Longo'];
    const FORMATOS_TEXTO = ['Staccato', 'Narrativo', 'Lista'];

    const PERIODOS = ['Manhã', 'Tarde', 'Noite', 'Madrugada'];
    const MOMENTOS = ['Começo de Semana', 'Fim de Semana', 'Início do Mês', 'Fim do Mês'];

    const loadData = async () => {
        setLoading(true);
        try {
            const categoria = filtroCategoria === 'todas' ? undefined : filtroCategoria;
            const [dataItems, dataStats, dataRecent] = await Promise.all([
                getDnaCategorizado(categoria),
                getCategoriaStats(),
                getDnaGeracoes(3) // Últimos 3 dias
            ]);
            setItems(dataItems);
            setStats(dataStats);
            setRecentGenerations(dataRecent);
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

    const handleStartEdit = (item: DnaCategorizado) => {
        setEditingId(item.id);
        setEditTexto(item.texto_msg);
        setEditCategoria(item.categoria);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditTexto('');
    };

    const handleSaveEdit = async () => {
        if (!editingId || !editTexto.trim()) return;
        setSaving(true);
        const success = await updateDnaCategorizado(editingId, editTexto.trim(), editCategoria);
        if (success) {
            setItems(prev => prev.map(item =>
                item.id === editingId
                    ? { ...item, texto_msg: editTexto.trim(), categoria: editCategoria }
                    : item
            ));
            const newStats = await getCategoriaStats();
            setStats(newStats);
            setEditingId(null);
            setEditTexto('');
        } else {
            alert('Erro ao salvar edição.');
        }
        setSaving(false);
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
            tamanho: filtroTamanho || undefined,

            periodo: filtroPeriodo || undefined,
            momento: filtroMomento || undefined,
            diasSemana: diasSelecionados.length > 0 ? diasSelecionados.join(', ') : undefined,
            // modo_favoritas depende de DNA por definição; evitar ambiguidade de filtro
            usarDnaBase: true,
            usarPassagemDia,
            neutro: filtroNeutro,
            contextoEstrategia,
            // Injetar contexto manual selecionado
            contextoManual: (candidates.length > 0)
                ? candidates.filter(c => c.selected).map(c => c.texto)
                : undefined
        };

        try {
            const result = await executarModoComFiltros('modo_favoritas', getDataHoje(), filtros);
            if (result.ok && result.resultado) {
                setGeneratedResult(result.resultado);
                setShowResult(true);

                // NOVO: Salvar mensagens na tabela dna_geracoes com tracking de tema
                const mensagens = parseMessages(result.resultado);
                if (mensagens.length > 0) {
                    const categoriaStr = filtroCategoriaGerar !== 'todas' ? filtroCategoriaGerar : undefined;
                    const temaUsado = result.tema_usado || filtroTema || undefined;
                    await saveDnaGeracoes(mensagens, categoriaStr, filtros, temaUsado, undefined, 'favoritas');
                    // Recarregar lista de gerações recentes
                    const novasGeracoes = await getDnaGeracoes(3);
                    setRecentGenerations(novasGeracoes);
                }
            } else {
                alert(result.error || 'Erro ao gerar.');
            }
        } catch (e) {
            alert('Erro de conexão.');
        }
        setGenerating(false);
    };

    // Handlers para Últimas Gerações
    const handleDeleteGeneration = async (id: number) => {
        if (!confirm('Apagar esta mensagem?')) return;
        setDeletingGenId(id);
        const success = await deleteDnaGeracao(id);
        if (success) {
            setRecentGenerations(prev => prev.filter(g => g.id !== id));
        }
        setDeletingGenId(null);
    };

    // Handler de Feedback
    const handleFeedback = async (id: number, feedback: number) => {
        // Optimistic update
        setRecentGenerations(prev => prev.map(g =>
            g.id === id ? { ...g, feedback } : g
        ));

        // Save to backend
        const success = await saveFeedbackDna(id, feedback);
        if (!success) {
            console.error('Erro ao salvar feedback');
        }
    };

    const handleDeleteBatch = async (batchId: string) => {
        if (!confirm('Apagar todo este lote de mensagens?')) return;
        setDeletingBatch(batchId);
        const success = await deleteDnaGeracaoBatch(batchId);
        if (success) {
            setRecentGenerations(prev => prev.filter(g => g.batch_id !== batchId));
        }
        setDeletingBatch(null);
    };

    // === FUNÇÕES DO GERADOR POR ESTILO ===

    // Carregar candidatos quando categoria de estilo muda
    useEffect(() => {
        if (selectedStyleCategory && usarDnaBase) {
            loadStyleCandidates();
        }
    }, [selectedStyleCategory, contextoEstrategia, usarDnaBase]);

    const loadStyleCandidates = async () => {
        if (!selectedStyleCategory) return;
        setLoadingStyleCandidates(true);
        try {
            const data = await fetchInspirationCandidates('dna', contextoEstrategia, selectedStyleCategory);
            setStyleCandidates(data);
        } catch (err) {
            console.error("Erro carregando inspiração de estilo:", err);
        } finally {
            setLoadingStyleCandidates(false);
        }
    };

    const toggleStyleCandidate = (id: number) => {
        setStyleCandidates(prev => prev.map(c => c.id === id ? { ...c, selected: !c.selected } : c));
    };

    const handleGerarEstilo = async () => {
        if (!selectedStyleCategory) {
            alert('Selecione um estilo primeiro!');
            return;
        }
        setGenerating(true);
        setGeneratedResult(null);

        const filtros = {
            estilo: selectedStyleCategory,
            quantidade: filtroQuantidade,
            tema: filtroTema || undefined,
            formato: filtroFormato || undefined,
            tamanho: filtroTamanho || undefined,

            periodo: filtroPeriodo || undefined,
            momento: filtroMomento || undefined,
            diasSemana: diasSelecionados.length > 0 ? diasSelecionados.join(', ') : undefined,
            usarDnaBase,
            usarPassagemDia,
            neutro: filtroNeutro,
            contextoEstrategia,
            contextoManual: (usarDnaBase && styleCandidates.length > 0)
                ? styleCandidates.filter(c => c.selected).map(c => c.texto)
                : undefined
        };

        try {
            const result = await executarModoComFiltros('modo_estilo', getDataHoje(), filtros);
            if (result.ok && result.resultado) {
                setGeneratedResult(result.resultado);
                setShowResult(true);

                const mensagens = parseMessages(result.resultado);
                if (mensagens.length > 0) {
                    const temaUsado = result.tema_usado || filtroTema || undefined;
                    await saveDnaGeracoes(mensagens, selectedStyleCategory, filtros, temaUsado, undefined, 'estilo');
                    const novasGeracoes = await getDnaGeracoes(3);
                    setRecentGenerations(novasGeracoes);
                }
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

                            {/* === SISTEMA DE ABAS === */}
                            <div className="flex flex-wrap gap-2 mb-6 p-1 bg-black/30 rounded-xl border border-white/10 w-fit">
                                <button
                                    onClick={() => setActiveTab('gerenciar')}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'gerenciar'
                                        ? 'bg-violet-500/30 text-violet-200 border border-violet-500/30'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <Layers className="w-4 h-4" />
                                    Gerenciar DNA
                                </button>
                                <button
                                    onClick={() => setActiveTab('gerar-dna')}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'gerar-dna'
                                        ? 'bg-fuchsia-500/30 text-fuchsia-200 border border-fuchsia-500/30'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <Wand2 className="w-4 h-4" />
                                    Gerar DNA
                                </button>
                                <button
                                    onClick={() => setActiveTab('gerar-estilo')}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'gerar-estilo'
                                        ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-500/30'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Gerar por Estilo
                                </button>
                            </div>

                            {/* ESTATÍSTICAS POR CATEGORIA - Só mostra na aba Gerenciar */}
                            {activeTab === 'gerenciar' && (
                                <>
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

                                    {/* AÇÕES DA ABA GERENCIAR */}
                                    <div className="flex flex-wrap items-center gap-3 mt-4">
                                        <button
                                            onClick={() => setShowAddForm(!showAddForm)}
                                            className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl border border-white/20 transition-all"
                                        >
                                            <Plus className="w-5 h-5" />
                                            Adicionar Mensagem
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* === ABA GERAR DNA === */}
                            {activeTab === 'gerar-dna' && (
                                <>
                                    <p className="text-slate-400 mb-4">Gera mensagens inspiradas no seu DNA usando <code className="text-fuchsia-300">modo_favoritas</code></p>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <button
                                            onClick={handleGerar}
                                            disabled={generating || items.length === 0}
                                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
                                        >
                                            {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                                            {generating ? 'Gerando...' : `✨ Gerar ${filtroQuantidade} Inspirados`}
                                        </button>

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
                                </>
                            )}

                            {/* === ABA GERAR POR ESTILO === */}
                            {activeTab === 'gerar-estilo' && (
                                <>
                                    <p className="text-slate-400 mb-4">Força a saída em um estilo específico usando <code className="text-indigo-300">modo_estilo</code></p>

                                    {/* Seleção de Estilo */}
                                    <div className="mb-4">
                                        <label className="block text-xs text-slate-400 mb-2 uppercase font-semibold">1. Escolha o Estilo de Saída</label>
                                        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                                            {CATEGORIAS.filter(c => c.id !== 'outro').map(cat => {
                                                const isSelected = selectedStyleCategory === cat.id;
                                                return (
                                                    <button
                                                        key={cat.id}
                                                        onClick={() => setSelectedStyleCategory(cat.id)}
                                                        className={`p-3 rounded-xl border text-center transition-all ${isSelected
                                                            ? `${cat.cor} ring-2 ring-offset-2 ring-offset-black ring-indigo-500`
                                                            : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                                                            }`}
                                                    >
                                                        <cat.icon className={`w-5 h-5 mx-auto mb-1 ${isSelected ? 'text-current' : 'text-slate-400'}`} />
                                                        <span className={`text-xs font-bold ${isSelected ? 'text-current' : 'text-slate-300'}`}>{cat.nome}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Ações do Gerador por Estilo */}
                                    <div className="flex flex-wrap items-center gap-3">
                                        <button
                                            onClick={handleGerarEstilo}
                                            disabled={generating || !selectedStyleCategory}
                                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
                                        >
                                            {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                            {generating ? 'Gerando...' : `✨ Gerar ${filtroQuantidade} em ${selectedStyleCategory || '...'}`}
                                        </button>

                                        <select
                                            value={filtroQuantidade}
                                            onChange={(e) => setFiltroQuantidade(Number(e.target.value))}
                                            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-violet-500 focus:outline-none"
                                        >
                                            {QUANTIDADES.map(q => <option key={q} value={q} className="bg-slate-900">{q}</option>)}
                                        </select>

                                        <button
                                            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all ${showAdvancedFilters ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                                        >
                                            <Filter className="w-4 h-4" />
                                            Filtros Avançados
                                            <ChevronDown className={`w-4 h-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* FILTROS AVANÇADOS - Visível em ambas abas de geração */}
                            {(activeTab === 'gerar-dna' || activeTab === 'gerar-estilo') && showAdvancedFilters && (
                                <div className="mt-4 p-4 bg-black/30 border border-white/10 rounded-xl animate-in slide-in-from-top-2">
                                    <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                                        <Filter className="w-4 h-4 text-violet-400" />
                                        Filtros Avançados de Geração
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {/* Tema - Input livre */}
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1.5 uppercase font-semibold">Tema (livre)</label>
                                            <input
                                                type="text"
                                                value={filtroTema}
                                                onChange={(e) => setFiltroTema(e.target.value)}
                                                placeholder="Ex: Esperança, Fé, Gratidão..."
                                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
                                            />
                                        </div>

                                        {/* Tamanho */}
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1.5 uppercase font-semibold">Tamanho</label>
                                            <select
                                                value={filtroTamanho}
                                                onChange={(e) => setFiltroTamanho(e.target.value)}
                                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-violet-500 focus:outline-none"
                                            >
                                                <option value="" className="bg-slate-900">Qualquer tamanho</option>
                                                {TAMANHOS.map(t => <option key={t} value={t} className="bg-slate-900">{t}</option>)}
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
                                                {FORMATOS_TEXTO.map(f => <option key={f} value={f} className="bg-slate-900">{f}</option>)}
                                            </select>
                                        </div>



                                        {/* Período do Dia */}
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

                                        {/* Momento da Semana/Mês */}
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

                                        {/* DNA Base Toggle */}
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1.5 uppercase font-semibold">DNA Base</label>
                                            <button
                                                disabled={activeTab === 'gerar-dna'}
                                                onClick={() => activeTab !== 'gerar-dna' && setUsarDnaBase(!usarDnaBase)}
                                                className={`w-full px-3 py-2 rounded-lg text-sm font-medium border transition-all ${activeTab === 'gerar-dna'
                                                    ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300 cursor-not-allowed'
                                                    : usarDnaBase
                                                        ? 'bg-green-500/20 border-green-500/30 text-green-300'
                                                        : 'bg-white/5 border-white/10 text-slate-400'}`}
                                            >
                                                {activeTab === 'gerar-dna'
                                                    ? '[ON] Sempre ativo no Gerar DNA'
                                                    : (usarDnaBase ? '[ON] Usar DNA Salvo' : '[OFF] Sem DNA Base')}
                                            </button>
                                        </div>

                                        {/* Passagem do Dia Toggle */}
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1.5 uppercase font-semibold">📖 Passagem do Dia</label>
                                            <button
                                                onClick={() => setUsarPassagemDia(!usarPassagemDia)}
                                                className={`w-full px-3 py-2 rounded-lg text-sm font-medium border transition-all ${usarPassagemDia ? 'bg-amber-500/20 border-amber-500/30 text-amber-300' : 'bg-white/5 border-white/10 text-slate-400'}`}
                                            >
                                                {usarPassagemDia ? '✓ Usar Passagem do Dia' : '✗ Sem Passagem'}
                                            </button>
                                            {usarPassagemDia && (
                                                <p className="text-[10px] text-amber-400/70 mt-1">Formato: Cabeçalho + Título + Corpo c/ Versículo + Fechamento</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Dias da Semana */}
                                    <div className="mt-5 pt-5 border-t border-white/10">
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

                                    <div className="mt-5 pt-5 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {/* Estratégia de Contexto */}
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-2 uppercase font-semibold">Fonte de Inspiração (Contexto)</label>
                                            <div className="flex flex-wrap gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
                                                {([
                                                    { key: 'recent_5' as const, label: '5 Últimas' },
                                                    { key: 'recent_10' as const, label: '10 Últimas' },
                                                    { key: 'recent_20' as const, label: '20 Últimas' },
                                                    { key: 'all' as const, label: 'Todas' },
                                                    { key: 'mixed' as const, label: 'Misturado' },
                                                ]).map(opt => (
                                                    <button
                                                        key={opt.key}
                                                        onClick={() => setContextoEstrategia(opt.key)}
                                                        className={`flex-1 min-w-[60px] py-1.5 text-xs font-medium rounded-md transition-all ${contextoEstrategia === opt.key ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                            <p className="text-[10px] text-slate-500 mt-1.5">
                                                {contextoEstrategia === 'recent_5' && 'Usa as 5 mensagens mais recentes como sementes.'}
                                                {contextoEstrategia === 'recent_10' && 'Usa as 10 mais recentes como sementes.'}
                                                {contextoEstrategia === 'recent_20' && 'Usa as 20 mais recentes — mais variedade de DNA.'}
                                                {contextoEstrategia === 'all' && 'Usa TODAS as suas favoritas/DNA — máxima variedade.'}
                                                {contextoEstrategia === 'mixed' && 'Pega 15 aleatórias do histórico para variedade.'}
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


                                    {/* Limpar Filtros */}
                                    {temFiltroAvancadoAtivo && (
                                        <button
                                            onClick={resetAdvancedFilters}
                                            className="mt-3 text-xs text-violet-400 hover:text-violet-300"
                                        >
                                            Limpar filtros avancados
                                        </button>
                                    )}

                                    {/* MANUAL CURATION PREVIEW - Gerar DNA */}
                                    {activeTab === 'gerar-dna' && usarDnaBase && filtroCategoriaGerar !== 'todas' && (
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
                                                    <span className="bg-violet-500/20 text-violet-200 px-1.5 py-0.5 rounded text-[10px] border border-violet-500/30">
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

                                    {/* MANUAL CURATION PREVIEW - Gerar por Estilo */}
                                    {activeTab === 'gerar-estilo' && usarDnaBase && selectedStyleCategory && (
                                        <div className="mt-5 pt-5 border-t border-white/10">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <Sparkles className="w-4 h-4 text-indigo-400" />
                                                    <h4 className="text-sm font-bold text-white">Exemplos de {selectedStyleCategory}</h4>
                                                </div>
                                                <button
                                                    onClick={() => setShowStyleCandidates(!showStyleCandidates)}
                                                    className="text-xs flex items-center gap-1.5 text-indigo-300 hover:text-white transition-colors"
                                                >
                                                    {loadingStyleCandidates ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                                                    {showStyleCandidates ? 'Ocultar' : 'Ver/Editar'}
                                                    <span className="bg-indigo-500/20 text-indigo-200 px-1.5 py-0.5 rounded text-[10px] border border-indigo-500/30">
                                                        {styleCandidates.filter(c => c.selected).length}/{styleCandidates.length}
                                                    </span>
                                                </button>
                                            </div>

                                            {showStyleCandidates && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar bg-black/20 p-2 rounded-xl border border-white/5">
                                                    {loadingStyleCandidates ? (
                                                        <div className="col-span-full py-8 text-center text-slate-500 text-xs">
                                                            <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2 opacity-50" />
                                                            Carregando exemplos...
                                                        </div>
                                                    ) : styleCandidates.length === 0 ? (
                                                        <div className="col-span-full py-8 text-center text-slate-500 text-xs">
                                                            Nenhum exemplo encontrado para este estilo.
                                                        </div>
                                                    ) : (
                                                        styleCandidates.map(c => (
                                                            <div
                                                                key={c.id}
                                                                onClick={() => toggleStyleCandidate(c.id)}
                                                                className={`
                                                                    p-2.5 rounded-lg border cursor-pointer text-left transition-all relative group
                                                                    ${c.selected
                                                                        ? 'bg-indigo-500/10 border-indigo-500/30 text-slate-200'
                                                                        : 'bg-transparent border-white/5 text-slate-600 opacity-60 hover:opacity-100'}
                                                                `}
                                                            >
                                                                <div className="flex justify-between items-start gap-2 mb-1">
                                                                    <span className="text-[10px] uppercase font-bold text-slate-500">#{c.id}</span>
                                                                    {c.selected && <Check className="w-3 h-3 text-indigo-400" />}
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

                            {/* FORM DE ADIÇÃO - Só na aba Gerenciar */}
                            {activeTab === 'gerenciar' && showAddForm && (
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
                                        <div className="prose prose-invert prose-sm max-w-none whitespace-pre-line [&>p]:mb-3 [&>*:last-child]:mb-0">
                                            <ReactMarkdown>{msg}</ReactMarkdown>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* NOVO: CARD ÚLTIMAS GERAÇÕES */}
                    {recentGenerations.length > 0 && (
                        <div className="bg-gradient-to-br from-amber-900/20 to-orange-900/10 border border-amber-500/30 rounded-2xl p-6">
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
                                            className="flex items-center gap-1.5 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded border border-red-500/20"
                                        >
                                            {deletingBatch === batchId ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                            Apagar Lote
                                        </button>
                                    </div>

                                    {/* Mensagens do Lote */}
                                    <div className="space-y-3">
                                        {batchItems.map((gen) => (
                                            <div key={gen.id} className="bg-black/30 border border-white/10 rounded-xl p-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-amber-500 text-xs font-bold">#{gen.id}</span>
                                                    <div className="flex gap-2">
                                                        {/* Feedback Buttons */}
                                                        <button
                                                            onClick={() => handleFeedback(gen.id, 1)}
                                                            className={`text-xs p-1.5 rounded transition-colors ${gen.feedback === 1 ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-slate-500 hover:bg-white/10 hover:text-green-200'}`}
                                                            title="Gostei"
                                                        >
                                                            <ThumbsUp className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleFeedback(gen.id, -1)}
                                                            className={`text-xs p-1.5 rounded transition-colors ${gen.feedback === -1 ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-slate-500 hover:bg-white/10 hover:text-red-200'}`}
                                                            title="Não gostei"
                                                        >
                                                            <ThumbsDown className="w-3 h-3" />
                                                        </button>

                                                        <button
                                                            onClick={() => handleCopy(gen.texto_msg, gen.id)}
                                                            className="text-xs px-2 py-1 bg-white/10 rounded text-slate-300 hover:text-white"
                                                        >
                                                            {copiedId === gen.id ? '✓ Copiado' : <Copy className="w-3 h-3" />}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteGeneration(gen.id)}
                                                            disabled={deletingGenId === gen.id}
                                                            className="text-xs px-2 py-1 bg-red-500/10 rounded text-red-400 hover:bg-red-500/20"
                                                        >
                                                            {deletingGenId === gen.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="prose prose-invert prose-sm max-w-none whitespace-pre-line [&>p]:mb-3 [&>*:last-child]:mb-0">
                                                    <ReactMarkdown>{gen.texto_msg}</ReactMarkdown>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Lista de DNA - Só na aba Gerenciar */}
                    {activeTab === 'gerenciar' && (loading ? (
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
                            const isEditing = editingId === item.id;
                            return (
                                <div key={item.id} className={`group relative bg-[#020617]/60 backdrop-blur-xl border rounded-2xl p-6 transition-all ${isEditing ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-white/10 hover:border-violet-500/30'}`}>
                                    {isEditing ? (
                                        /* === MODO EDIÇÃO === */
                                        <div className="space-y-4">
                                            {/* Seletor de categoria */}
                                            <div>
                                                <label className="block text-xs text-slate-400 mb-2 uppercase font-semibold">Categoria</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {CATEGORIAS.map(c => (
                                                        <button
                                                            key={c.id}
                                                            onClick={() => setEditCategoria(c.id)}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${editCategoria === c.id ? c.cor : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                                                        >
                                                            <c.icon className="w-3 h-3" />
                                                            {c.nome}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            {/* Textarea do texto */}
                                            <div>
                                                <label className="block text-xs text-slate-400 mb-2 uppercase font-semibold">Texto</label>
                                                <textarea
                                                    value={editTexto}
                                                    onChange={(e) => setEditTexto(e.target.value)}
                                                    rows={8}
                                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:border-amber-500 focus:outline-none resize-y leading-relaxed"
                                                />
                                            </div>
                                            {/* Botões salvar / cancelar */}
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={handleSaveEdit}
                                                    disabled={saving || !editTexto.trim()}
                                                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-black font-bold rounded-lg hover:bg-amber-400 disabled:opacity-50 text-sm"
                                                >
                                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                    {saving ? 'Salvando...' : 'Salvar'}
                                                </button>
                                                <button
                                                    onClick={handleCancelEdit}
                                                    className="px-4 py-2 text-slate-400 hover:text-white text-sm"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        /* === MODO VISUALIZAÇÃO === */
                                        <>
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
                                                        onClick={() => handleStartEdit(item)}
                                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/20 text-xs font-bold"
                                                    >
                                                        <Pencil className="w-3 h-3" />
                                                        Editar
                                                    </button>
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
                                            <div className="prose prose-invert max-w-none prose-p:text-slate-300 whitespace-pre-line [&>p]:mb-3 [&>*:last-child]:mb-0">
                                                <ReactMarkdown>{item.texto_msg}</ReactMarkdown>
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })
                    ))}
                </main>
            </div>
        </CosmicBackground>
    );
}
