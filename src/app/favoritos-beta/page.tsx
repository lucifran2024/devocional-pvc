'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Book, Sparkles, Copy, Trash2, Calendar, Loader2, Wand2, X, Filter, ChevronDown, Zap, Clock, Sun, Moon, Sunset } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getFavoritosManuais, FavoritoMensagem, removeFavoritoById, executarModoComFiltros, getDataHoje } from '@/lib/supabase';
import { CosmicHeader } from '@/components/ui/CosmicHeader';
import { CosmicBackground } from '@/components/ui/CosmicBackground';

// ==================== FILTROS ====================
const TEMAS = ['Todos', 'Esperança', 'Fé', 'Amor', 'Gratidão', 'Força', 'Paz', 'Perseverança'];
const TIPOS = ['Todos', 'Versículo', 'Devocional', 'Oração', 'Reflexão'];
const FORMATOS = ['Todos', 'Staccato', 'Narrativo', 'Lista', 'Pergunta'];
const QUANTIDADES = [5, 10, 15, 20, 30];
const DNA_BASE = [
    'Todas',
    '10 primeiras', '20 primeiras', '30 primeiras',
    '10 do meio', '20 do meio',
    '10 últimas', '20 últimas', '30 últimas',
    '10 aleatórias', '20 aleatórias'
];
const PERIODOS = ['Automático', 'Bom Dia', 'Boa Tarde', 'Boa Noite'];
const DIAS_SEMANA = ['Automático', 'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MOMENTOS = ['Automático', 'Fim de Semana', 'Começo de Semana', 'Início do Mês', 'Fim do Mês'];

// ==================== NOVOS FILTROS ====================
const TAMANHOS = ['Todos', 'Curto', 'Médio', 'Longo'];
const TONS = ['Todos', 'Alegre', 'Sereno', 'Reflexivo', 'Motivacional', 'Contemplativo'];

// ==================== TEMPLATES ====================
const TEMPLATES = [
    { nome: '🌅 Bom Dia Dominical', periodo: 'Bom Dia', dia: 'Domingo', tema: 'Esperança', momento: 'Automático' },
    { nome: '🌙 Reflexão Noturna', periodo: 'Boa Noite', dia: 'Automático', tema: 'Paz', formato: 'Narrativo', momento: 'Automático' },
    { nome: '💪 Força para Segunda', periodo: 'Bom Dia', dia: 'Segunda', tema: 'Força', momento: 'Começo de Semana' },
    { nome: '🙏 Oração Matinal', periodo: 'Bom Dia', dia: 'Automático', tipo: 'Oração', tema: 'Gratidão', momento: 'Automático' },
    { nome: '📖 Versículos do Dia', periodo: 'Automático', dia: 'Automático', tipo: 'Versículo', momento: 'Automático' },
    { nome: '🎉 Fim de Semana', periodo: 'Automático', dia: 'Automático', tema: 'Alegria', momento: 'Fim de Semana' },
    { nome: '🌟 Novo Mês', periodo: 'Bom Dia', dia: 'Automático', tema: 'Esperança', momento: 'Início do Mês' },
    { nome: '📝 Fechamento Mensal', periodo: 'Boa Noite', dia: 'Automático', tema: 'Gratidão', tipo: 'Reflexão', momento: 'Fim do Mês' },
];

// ==================== HELPERS AUTO-DETECTAR ====================
function getAutoPeríodo(): string {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) return 'Bom Dia';
    if (hora >= 12 && hora < 18) return 'Boa Tarde';
    return 'Boa Noite';
}

function getAutoDia(): string {
    const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return dias[new Date().getDay()];
}

function getAutoMomento(): string | null {
    const hoje = new Date();
    const dia = hoje.getDate();
    const diaSemana = hoje.getDay();
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();

    // Fim de semana (sábado/domingo)
    if (diaSemana === 0 || diaSemana === 6) return 'Fim de Semana';
    // Segunda-feira = começo de semana
    if (diaSemana === 1) return 'Começo de Semana';
    // Primeiros 3 dias do mês
    if (dia <= 3) return 'Início do Mês';
    // Últimos 3 dias do mês
    if (dia >= ultimoDia - 2) return 'Fim do Mês';

    return null;
}

// Icon do período
function PeriodoIcon({ periodo }: { periodo: string }) {
    if (periodo === 'Bom Dia') return <Sun className="w-3 h-3" />;
    if (periodo === 'Boa Tarde') return <Sunset className="w-3 h-3" />;
    return <Moon className="w-3 h-3" />;
}

export default function FavoritosBetaPage() {
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
    const [modoSimples, setModoSimples] = useState(true);
    const [filtroTema, setFiltroTema] = useState('Todos');
    const [filtroTipo, setFiltroTipo] = useState('Todos');
    const [filtroFormato, setFiltroFormato] = useState('Todos');
    const [filtroQuantidade, setFiltroQuantidade] = useState(10);
    const [filtroDnaBase, setFiltroDnaBase] = useState('Todas');
    const [filtroPeriodo, setFiltroPeriodo] = useState('Automático');
    const [filtroDia, setFiltroDia] = useState('Automático');
    const [filtroMomento, setFiltroMomento] = useState('Automático');
    // Novos filtros
    const [filtroTamanho, setFiltroTamanho] = useState('Todos');
    const [filtroTom, setFiltroTom] = useState('Todos');

    // Auto-detectados
    const autoPeríodo = useMemo(() => getAutoPeríodo(), []);
    const autoDia = useMemo(() => getAutoDia(), []);
    const autoMomento = useMemo(() => getAutoMomento(), []);

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

    // Aplicar template
    const aplicarTemplate = (template: typeof TEMPLATES[0]) => {
        if (template.periodo) setFiltroPeriodo(template.periodo);
        if (template.dia) setFiltroDia(template.dia);
        if (template.tema) setFiltroTema(template.tema);
        if (template.tipo) setFiltroTipo(template.tipo);
        if (template.formato) setFiltroFormato(template.formato);
        if (template.momento) setFiltroMomento(template.momento);
    };

    // Handler de geração COM filtros
    const handleGerar = async () => {
        if (favoritos.length === 0) {
            alert('Adicione favoritas primeiro!');
            return;
        }
        setGenerating(true);
        setGeneratedResult(null);

        // Resolver valores automáticos
        const periodoFinal = filtroPeriodo === 'Automático' ? autoPeríodo : filtroPeriodo;
        const diaFinal = filtroDia === 'Automático' ? autoDia : filtroDia;
        const momentoFinal = filtroMomento === 'Automático' ? autoMomento : filtroMomento;

        // Monta objeto de filtros
        const filtros = {
            tema: filtroTema !== 'Todos' ? filtroTema : undefined,
            tipo: filtroTipo !== 'Todos' ? filtroTipo : undefined,
            formato: filtroFormato !== 'Todos' ? filtroFormato : undefined,
            quantidade: filtroQuantidade,
            dnaBase: filtroDnaBase !== 'Todas' ? filtroDnaBase : undefined,
            periodo: periodoFinal,
            diaSemana: diaFinal,
            momento: momentoFinal || undefined,
            tamanho: filtroTamanho !== 'Todos' ? filtroTamanho : undefined,
            tom: filtroTom !== 'Todos' ? filtroTom : undefined,
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

    // Conta filtros ativos
    const filtrosAtivos = useMemo(() => {
        const ativos: string[] = [];
        if (filtroTema !== 'Todos') ativos.push(filtroTema);
        if (filtroTipo !== 'Todos') ativos.push(filtroTipo);
        if (filtroFormato !== 'Todos') ativos.push(filtroFormato);
        if (filtroDnaBase !== 'Todas') ativos.push(filtroDnaBase);
        if (filtroPeriodo !== 'Automático') ativos.push(filtroPeriodo);
        if (filtroDia !== 'Automático') ativos.push(filtroDia);
        if (filtroMomento !== 'Automático') ativos.push(filtroMomento);
        if (filtroTamanho !== 'Todos') ativos.push(filtroTamanho);
        if (filtroTom !== 'Todos') ativos.push(filtroTom);
        return ativos;
    }, [filtroTema, filtroTipo, filtroFormato, filtroDnaBase, filtroPeriodo, filtroDia, filtroMomento, filtroTamanho, filtroTom]);

    const temFiltroAtivo = filtrosAtivos.length > 0 || filtroQuantidade !== 10;

    const limparFiltros = () => {
        setFiltroTema('Todos');
        setFiltroTipo('Todos');
        setFiltroFormato('Todos');
        setFiltroQuantidade(10);
        setFiltroDnaBase('Todas');
        setFiltroPeriodo('Automático');
        setFiltroDia('Automático');
        setFiltroMomento('Automático');
        setFiltroTamanho('Todos');
        setFiltroTom('Todos');
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
                                <div className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-purple-500/10 border border-purple-400/20 rounded-full text-purple-300 text-[10px] font-black uppercase tracking-[0.2em]">
                                    <Zap className="w-3.5 h-3.5" />
                                    BETA — Testando Melhorias
                                </div>
                            </div>

                            <h1 className="text-4xl md:text-7xl font-black tracking-tight text-white mb-4 text-center md:text-left">
                                Favoritas <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-fuchsia-500">Beta</span>
                            </h1>

                            {/* CONTADOR DE FAVORITAS */}
                            <div className="flex flex-wrap items-center gap-3 mb-6">
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm">
                                    <Book className="w-4 h-4 text-amber-400" />
                                    <span className="text-slate-300">{favoritos.length} favoritas</span>
                                    <span className="text-slate-500">•</span>
                                    <span className="text-slate-400">Usando {filtroDnaBase === 'Todas' ? 'todas' : filtroDnaBase}</span>
                                </div>

                                {/* CONTEXTO AUTO-DETECTADO */}
                                <div className="inline-flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-xl text-xs text-green-300">
                                    <Clock className="w-3 h-3" />
                                    <PeriodoIcon periodo={autoPeríodo} />
                                    {autoPeríodo} • {autoDia}
                                    {autoMomento && <span className="text-green-400 font-bold">• {autoMomento}</span>}
                                </div>
                            </div>

                            {/* BADGES DE FILTROS ATIVOS */}
                            {filtrosAtivos.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {filtrosAtivos.map((f, i) => (
                                        <span key={i} className="px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-300 text-xs font-medium">
                                            {f}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* TEMPLATES RÁPIDOS */}
                            <div className="flex flex-wrap gap-2 mb-6">
                                {TEMPLATES.slice(0, 4).map((t, i) => (
                                    <button
                                        key={i}
                                        onClick={() => aplicarTemplate(t)}
                                        className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-slate-300 transition-all"
                                    >
                                        {t.nome}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-slate-400"
                                >
                                    + mais templates
                                </button>
                            </div>

                            {/* Botões de ação */}
                            <div className="flex flex-wrap items-center gap-3 mt-4">
                                <button
                                    onClick={handleGerar}
                                    disabled={generating || favoritos.length === 0}
                                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
                                >
                                    {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                                    {generating ? 'Gerando...' : `✨ Gerar ${filtroQuantidade} Inspirados`}
                                </button>

                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${temFiltroAtivo
                                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                                        }`}
                                >
                                    <Filter className="w-4 h-4" />
                                    Filtros {temFiltroAtivo && `(${filtrosAtivos.length + (filtroQuantidade !== 10 ? 1 : 0)})`}
                                    <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Toggle Modo Simples/Avançado */}
                                <button
                                    onClick={() => setModoSimples(!modoSimples)}
                                    className="px-3 py-2 text-xs text-slate-500 hover:text-slate-300"
                                >
                                    {modoSimples ? '⚙️ Modo Avançado' : '🎯 Modo Simples'}
                                </button>
                            </div>

                            {/* Painel de Filtros */}
                            {showFilters && (
                                <div className="mt-4 p-4 bg-black/40 border border-white/10 rounded-xl animate-in slide-in-from-top-2">
                                    {/* Templates expandidos */}
                                    <div className="mb-4">
                                        <label className="block text-xs text-slate-400 mb-2 font-semibold uppercase">⚡ Templates Rápidos</label>
                                        <div className="flex flex-wrap gap-2">
                                            {TEMPLATES.map((t, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => aplicarTemplate(t)}
                                                    className="px-3 py-2 bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/30 rounded-lg text-xs text-slate-300 transition-all"
                                                >
                                                    {t.nome}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {/* Tema */}
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase">Tema</label>
                                            <select
                                                value={filtroTema}
                                                onChange={(e) => setFiltroTema(e.target.value)}
                                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
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
                                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
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
                                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
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
                                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
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
                                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                                            >
                                                {DNA_BASE.map(d => <option key={d} value={d} className="bg-slate-900">{d}</option>)}
                                            </select>
                                        </div>

                                        {/* Período com AUTO */}
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase">
                                                Período {filtroPeriodo === 'Automático' && <span className="text-green-400">({autoPeríodo})</span>}
                                            </label>
                                            <select
                                                value={filtroPeriodo}
                                                onChange={(e) => setFiltroPeriodo(e.target.value)}
                                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                                            >
                                                {PERIODOS.map(p => <option key={p} value={p} className="bg-slate-900">{p}</option>)}
                                            </select>
                                        </div>

                                        {/* Dia com AUTO */}
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase">
                                                Dia {filtroDia === 'Automático' && <span className="text-green-400">({autoDia})</span>}
                                            </label>
                                            <select
                                                value={filtroDia}
                                                onChange={(e) => setFiltroDia(e.target.value)}
                                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                                            >
                                                {DIAS_SEMANA.map(d => <option key={d} value={d} className="bg-slate-900">{d}</option>)}
                                            </select>
                                        </div>

                                        {/* Momento com AUTO */}
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase">
                                                Momento {filtroMomento === 'Automático' && autoMomento && <span className="text-green-400">({autoMomento})</span>}
                                            </label>
                                            <select
                                                value={filtroMomento}
                                                onChange={(e) => setFiltroMomento(e.target.value)}
                                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                                            >
                                                {MOMENTOS.map(m => <option key={m} value={m} className="bg-slate-900">{m}</option>)}
                                            </select>
                                        </div>

                                        {/* NOVOS FILTROS - só no modo avançado */}
                                        {!modoSimples && (
                                            <>
                                                {/* Tamanho */}
                                                <div>
                                                    <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase">Tamanho</label>
                                                    <select
                                                        value={filtroTamanho}
                                                        onChange={(e) => setFiltroTamanho(e.target.value)}
                                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                                                    >
                                                        {TAMANHOS.map(t => <option key={t} value={t} className="bg-slate-900">{t}</option>)}
                                                    </select>
                                                </div>

                                                {/* Tom */}
                                                <div>
                                                    <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase">Tom</label>
                                                    <select
                                                        value={filtroTom}
                                                        onChange={(e) => setFiltroTom(e.target.value)}
                                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                                                    >
                                                        {TONS.map(t => <option key={t} value={t} className="bg-slate-900">{t}</option>)}
                                                    </select>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Limpar filtros */}
                                    {temFiltroAtivo && (
                                        <button
                                            onClick={limparFiltros}
                                            className="mt-3 text-xs text-purple-400 hover:text-purple-300"
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
                        <div className="bg-gradient-to-br from-purple-900/20 to-fuchsia-900/10 border border-purple-500/30 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-purple-400 font-bold text-lg">✨ Mensagens Geradas ({parseMessages(generatedResult).length})</h3>
                                <button onClick={() => setShowResult(false)} className="p-2 hover:bg-white/10 rounded-lg">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                            <div className="space-y-6">
                                {parseMessages(generatedResult).map((msg, i) => (
                                    <div key={i} className="bg-black/30 border border-white/10 rounded-xl p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-purple-500 text-xs font-bold">Msg {i + 1}</span>
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
                            <div key={fav.id} className="group relative bg-[#020617]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-purple-500/30 transition-all">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/[0.03] border border-white/5 rounded-full text-slate-400 text-[10px] font-bold uppercase">
                                        <Calendar className="w-3 h-3 text-purple-500" />
                                        {new Date(fav.created_at).toLocaleDateString('pt-BR')}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleCopy(fav.texto_msg, fav.id)}
                                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 border border-purple-500/20 text-xs font-bold"
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

                    {/* Link para versão estável */}
                    <div className="text-center py-8">
                        <Link href="/favoritos" className="text-sm text-slate-500 hover:text-slate-300">
                            ← Voltar para versão estável
                        </Link>
                    </div>
                </main>
            </div>
        </CosmicBackground>
    );
}
