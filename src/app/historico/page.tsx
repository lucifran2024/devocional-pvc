'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, Book, Heart, Loader2, Sparkles, X, Share2, Quote, Filter, ArrowRight, LayoutTemplate, Trash2, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getHistorico, toggleLike, deleteHistoricoItem, addFavoritoMensagem, removeFavoritoMensagem, getFavoritosByHistorico, CategoriaDna } from '@/lib/supabase';
import { CosmicHeader } from '@/components/ui/CosmicHeader';
import { CosmicBackground } from '@/components/ui/CosmicBackground';
import { ShareButton } from '@/components/ui/ShareButton';

// Tipo inferido da tabela
interface HistoricoItem {
    id: number;
    created_at: string;
    modo_id: string;
    passagem: string;
    resultado_texto: string;
    aprovado: boolean | null;
}

export default function HistoricoPage() {
    const [items, setItems] = useState<HistoricoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'favorites'>('all');
    const [expandedItem, setExpandedItem] = useState<HistoricoItem | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [favoritosIndividuais, setFavoritosIndividuais] = useState<number[]>([]);

    // Category Picker para favoritar mensagens individuais
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [pendingFavorite, setPendingFavorite] = useState<{ historicoId: number; indice: number; texto: string } | null>(null);

    const CATEGORIAS_DNA: { value: CategoriaDna; label: string; icon: string }[] = [
        { value: 'devocional', label: 'Devocional', icon: '📖' },
        { value: 'oracao', label: 'Oração', icon: '🙏' },
        { value: 'versiculo', label: 'Versículo', icon: '📜' },
        { value: 'reflexao', label: 'Reflexão', icon: '💭' },
        { value: 'exortacao', label: 'Exortação', icon: '💪' },
        { value: 'declaracao', label: 'Declaração', icon: '🔥' },
        { value: 'outro', label: 'Outro', icon: '✨' },
    ];

    // Parsear mensagens individuais do texto
    const parseMensagens = (texto: string): string[] => {
        if (!texto) return [];

        // Tenta diferentes separadores em ordem de prioridade

        // 1. Separador explícito ---
        if (texto.includes('\n---\n') || texto.includes('\n---') || texto.includes('---\n')) {
            const partes = texto.split(/\n\s*---\s*\n/);
            if (partes.length > 1) return partes.filter(p => p.trim().length > 0);
        }

        // 2. Separador ### (títulos markdown)
        if (texto.includes('\n###') || texto.includes('\n## ')) {
            const partes = texto.split(/\n(?=###?\s)/);
            if (partes.length > 1) return partes.filter(p => p.trim().length > 0);
        }

        // 3. Separador por P01, P02, P03... (padrão das gerações PVC)
        // Detecta padrões como "P01 —", "P02 —", etc
        const pNumberPattern = /\n(?=P\d{2}\s*[—–-]\s*)/;
        if (pNumberPattern.test(texto)) {
            const partes = texto.split(pNumberPattern);
            if (partes.length > 1) return partes.filter(p => p.trim().length > 0);
        }

        // 4. Separador por título em MAIÚSCULAS (padrão comum das gerações)
        // Detecta padrões como "TITULO EM MAIUSCULAS" seguido de quebra de linha
        const upperTitlePattern = /\n\n(?=[A-ZÀ-Ú][A-ZÀ-Ú\s,.!?]{10,})/;
        if (upperTitlePattern.test(texto)) {
            const partes = texto.split(upperTitlePattern);
            if (partes.length > 1) return partes.filter(p => p.trim().length > 0);
        }

        // 5. Fallback: retorna o texto inteiro como uma única mensagem
        return [texto];
    };

    // Carregar dados
    const fetchData = async () => {
        setLoading(true);
        const showOnlyFavorites = filter === 'favorites';
        const data = await getHistorico(showOnlyFavorites);
        setItems(data as HistoricoItem[]);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [filter]);

    // Formatador de Data
    const formatData = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Handler de Like
    const handleToggleLike = async (item: HistoricoItem, e: React.MouseEvent) => {
        e.stopPropagation(); // Evita abrir o modal ao clicar no like

        // Optimistic UI Update
        const newStatus = !item.aprovado;
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, aprovado: newStatus } : i));

        // Se estiver na tab favoritos e descurtir, remove da lista visualmente
        if (filter === 'favorites' && !newStatus) {
            setItems(prev => prev.filter(i => i.id !== item.id));
        }

        const success = await toggleLike(item.id, item.aprovado);
        if (!success) {
            // Reverte se falhar
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, aprovado: !newStatus } : i));
        }
    };

    // Handler de Delete
    const handleDelete = async (item: HistoricoItem, e: React.MouseEvent) => {
        e.stopPropagation();

        // Confirmação
        if (!confirm(`Excluir esta memória?\n\n"${item.passagem}"\n\nEsta ação não pode ser desfeita.`)) {
            return;
        }

        setDeletingId(item.id);

        const success = await deleteHistoricoItem(item.id);

        if (success) {
            // Remove da lista local
            setItems(prev => prev.filter(i => i.id !== item.id));
            // Fecha modal se estiver aberto neste item
            if (expandedItem?.id === item.id) {
                setExpandedItem(null);
            }
        } else {
            alert('Erro ao excluir. Tente novamente.');
        }

        setDeletingId(null);
    };

    // Handler para like de mensagem individual
    const handleToggleMensagemLike = async (historicoId: number, indice: number, texto: string) => {
        const isFavorito = favoritosIndividuais.includes(indice);

        if (isFavorito) {
            // Remover direto
            setFavoritosIndividuais(prev => prev.filter(i => i !== indice));
            await removeFavoritoMensagem(historicoId, indice);
        } else {
            // Abrir picker de categoria antes de salvar
            setPendingFavorite({ historicoId, indice, texto });
            setShowCategoryPicker(true);
        }
    };

    // Handler quando o usuário escolhe a categoria
    const handleCategorySelected = async (categoria: CategoriaDna) => {
        if (!pendingFavorite) return;
        setFavoritosIndividuais(prev => [...prev, pendingFavorite.indice]);
        await addFavoritoMensagem(
            pendingFavorite.historicoId,
            pendingFavorite.indice,
            pendingFavorite.texto,
            categoria
        );
        setShowCategoryPicker(false);
        setPendingFavorite(null);
    };

    // Carregar favoritos quando abre o modal
    const handleOpenModal = async (item: HistoricoItem) => {
        setExpandedItem(item);
        const favoritos = await getFavoritosByHistorico(item.id);
        setFavoritosIndividuais(favoritos);
    };

    return (
        <CosmicBackground className="font-sans text-text-primary selection:bg-amber-500/30 selection:text-amber-900 dark:selection:text-indigo-200 dark:selection:bg-indigo-500/30">

            {/* THE GIANT WRAPPER */}
            <div className="w-full flex flex-col items-center relative z-10">

                {/* HEADER PREMIUM */}
                <div className="w-full max-w-6xl">
                    <CosmicHeader className="pb-32 md:pb-48">
                        <div className="w-full px-4 sm:px-6 lg:px-8 pt-12 text-center md:text-left">
                            <div className="flex flex-col md:flex-row items-center md:items-start gap-5 mb-8 animate-divine">
                                <Link href="/" className="group p-3 bg-white dark:bg-surface-2 hover:bg-slate-100 dark:hover:bg-surface-2/80 rounded-2xl transition-all border border-slate-200 dark:border-border-subtle hover:border-slate-300 dark:hover:border-border-subtle active:scale-95 shadow-sm dark:shadow-none">
                                    <ArrowLeft className="w-5 h-5 text-slate-500 dark:text-text-muted group-hover:text-slate-900 dark:group-hover:text-text-primary" />
                                </Link>
                                <div className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-amber-500/10 dark:bg-indigo-500/10 border border-amber-400/20 dark:border-indigo-400/20 rounded-full text-amber-700 dark:text-indigo-300 text-[10px] font-black uppercase tracking-[0.2em] shadow-inner">
                                    <Book className="w-3.5 h-3.5" />
                                    Crônicas do Coração
                                </div>
                            </div>

                            <h1 className="text-4xl md:text-7xl font-black tracking-divine text-slate-900 dark:text-text-primary mb-6 divine-halo animate-divine text-center md:text-left">
                                Minhas Memórias
                            </h1>
                            <p className="text-slate-600 dark:text-text-muted max-w-2xl text-lg md:text-xl leading-relaxed animate-divine [animation-delay:200ms] text-center md:text-left mx-auto md:mx-0">
                                Cada palavra gerada é um marco na sua caminhada.
                                <br className="hidden md:block" />Reviva os insights que transformaram o seu dia.
                            </p>
                        </div>
                    </CosmicHeader>
                </div>

                {/* MAIN CONTENT */}
                <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-20 flex flex-col space-y-12 py-20">

                    {/* TABS & FILTERS */}
                    <div className="flex flex-wrap items-center justify-between gap-6 mb-12 animate-divine [animation-delay:400ms]">
                        <div className="bg-white/60 dark:bg-surface-0/40 p-1.5 rounded-[1.5rem] shadow-lg dark:shadow-2xl backdrop-blur-3xl border border-slate-200 dark:border-border-subtle flex gap-1.5">
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-500 flex items-center gap-2.5 ${filter === 'all'
                                    ? 'bg-amber-600 dark:bg-indigo-600 text-white shadow-xl shadow-amber-900/30 dark:shadow-indigo-900/40'
                                    : 'text-slate-500 dark:text-text-muted hover:bg-slate-100 dark:hover:bg-surface-2 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                            >
                                <LayoutTemplate className="w-4 h-4" />
                                Todas
                            </button>
                            <button
                                onClick={() => setFilter('favorites')}
                                className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-500 flex items-center gap-2.5 ${filter === 'favorites'
                                    ? 'bg-rose-600 text-white shadow-xl shadow-rose-900/40'
                                    : 'text-slate-500 dark:text-text-muted hover:bg-slate-100 dark:hover:bg-surface-2 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                            >
                                <Heart className={`w-4 h-4 ${filter === 'favorites' ? 'fill-current' : ''}`} />
                                Favoritos
                            </button>
                        </div>

                        <div className="flex items-center gap-3 px-5 py-2.5 bg-white dark:bg-surface-2 rounded-2xl text-[11px] font-bold text-slate-500 dark:text-text-muted border border-slate-200 dark:border-border-subtle uppercase tracking-widest shadow-sm dark:shadow-none">
                            <Filter className="w-4 h-4 text-amber-500/50 dark:text-indigo-500/50" />
                            <span>{items.length} Registros</span>
                        </div>
                    </div>

                    {/* GRID CONTENT */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {loading ? (
                            [1, 2, 3, 4].map(i => (
                                <div key={i} className="h-72 stellar-card rounded-[2.5rem] animate-pulse" />
                            ))
                        ) : items.length === 0 ? (
                            <div className="col-span-full py-32 text-center space-y-6 animate-divine">
                                <div className="w-24 h-24 bg-slate-100 dark:bg-surface-2 rounded-[2rem] flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-border-subtle">
                                    <Sparkles className="w-10 h-10 text-slate-400 dark:text-slate-700" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-500 dark:text-text-muted tracking-tight">O silêncio precede a revelação.</h3>
                                <p className="text-slate-400 dark:text-text-muted text-sm max-w-xs mx-auto leading-relaxed">Sua jornada de memórias começa assim que você gerar seu primeiro devocional.</p>
                            </div>
                        ) : (
                            items.map((item, idx) => (
                                <div
                                    key={item.id}
                                    style={{ animationDelay: `${idx * 50}ms` }}
                                    className="group relative stellar-card bg-white dark:bg-transparent rounded-[2.5rem] p-10 border border-slate-200 dark:border-border-subtle overflow-hidden hover:shadow-xl dark:hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] transition-all duration-700 hover:-translate-y-2 cursor-pointer animate-divine shadow-sm dark:shadow-none"
                                    onClick={() => handleOpenModal(item)}
                                >
                                    <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/[0.05] dark:bg-indigo-500/[0.03] rounded-bl-[100px] transition-all duration-700 group-hover:bg-amber-500/[0.1] dark:group-hover:bg-indigo-500/[0.07] group-hover:scale-125"></div>

                                    <div className="relative z-10">
                                        <div className="flex items-start justify-between mb-8">
                                            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-slate-100 dark:bg-surface-2 border border-slate-200 dark:border-border-subtle rounded-full text-slate-500 dark:text-text-muted text-[9px] font-black uppercase tracking-[0.2em] group-hover:text-slate-800 dark:group-hover:text-text-primary transition-colors">
                                                <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-indigo-500" />
                                                {formatData(item.created_at)}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => handleDelete(item, e)}
                                                    disabled={deletingId === item.id}
                                                    className="p-3 rounded-2xl transition-all duration-500 bg-slate-100 dark:bg-surface-2 border border-slate-200 dark:border-border-subtle text-slate-400 dark:text-text-muted hover:text-red-500 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-500/50 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50"
                                                    title="Excluir memória"
                                                >
                                                    {deletingId === item.id ? (
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-5 h-5" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={(e) => handleToggleLike(item, e)}
                                                    className={`p-3 rounded-2xl transition-all duration-500 ${item.aprovado ? 'bg-rose-500 border border-rose-400 dark:border-border-strong shadow-lg shadow-rose-500/20 dark:shadow-rose-900/40 text-white' : 'bg-slate-100 dark:bg-surface-2 border border-slate-200 dark:border-border-subtle text-slate-400 dark:text-text-muted hover:text-rose-500 dark:hover:text-text-primary hover:border-rose-300 dark:hover:border-rose-500/50'}`}
                                                >
                                                    <Heart className={`w-5 h-5 ${item.aprovado ? 'fill-current' : ''}`} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mb-6">
                                            <h3 className="font-black text-xl text-slate-900 dark:text-text-primary mb-2 line-clamp-1 tracking-tight group-hover:text-amber-700 dark:group-hover:text-indigo-300 transition-colors uppercase italic">{item.modo_id}</h3>
                                            <p className="text-slate-500 dark:text-text-muted text-xs font-bold flex items-center gap-2.5 uppercase tracking-widest pl-1">
                                                <Quote className="w-3.5 h-3.5 text-amber-500/50 dark:text-indigo-500/50" /> {item.passagem}
                                            </p>
                                        </div>

                                        <div className="relative">
                                            <div className="text-slate-600 dark:text-text-muted leading-[1.8] line-clamp-4 text-sm font-medium">
                                                {item.resultado_texto}
                                            </div>
                                            <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#020617] via-transparent to-transparent h-full"></div>
                                        </div>

                                        <div className="mt-8 flex items-center gap-3 text-amber-600 dark:text-indigo-400 font-black text-[10px] uppercase tracking-[0.2em] group-hover:gap-5 transition-all">
                                            Explorar Memória <ArrowRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* MODAL (Premium Remake) */}
                    {expandedItem && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8" onClick={() => setExpandedItem(null)}>
                            <div className="absolute inset-0 bg-white/90 dark:bg-surface-0/90 backdrop-blur-xl animate-in fade-in duration-500"></div>

                            <div className="bg-white dark:bg-surface-0 w-full max-w-4xl max-h-[90vh] rounded-[3rem] overflow-hidden shadow-2xl dark:shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col pt-0 animate-in fade-in zoom-in-95 duration-500 border border-slate-200 dark:border-border-subtle relative z-10" onClick={e => e.stopPropagation()}>

                                {/* Modal Header */}
                                <div className="p-6 md:p-10 bg-gradient-to-br from-slate-50 to-white dark:from-[#0f172a] dark:to-[#020617] text-slate-900 dark:text-text-primary shrink-0 relative overflow-hidden border-b border-slate-200 dark:border-border-subtle">
                                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/5 dark:bg-indigo-500/10 rounded-full blur-[120px] -mr-32 -mt-32"></div>

                                    <div className="relative z-10 flex items-start justify-between">
                                        <div className="flex-1 pr-4">
                                            {/* Adjusted: Smaller Title & Tighter Spacing */}
                                            <h2 className="text-2xl md:text-4xl font-black mb-3 tracking-divine divine-halo italic uppercase leading-tight text-slate-900 dark:text-text-primary">{expandedItem.modo_id}</h2>

                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-2">
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-surface-2 border border-slate-200 dark:border-border-subtle rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-text-muted">
                                                    <Calendar className="w-3 h-3 text-amber-600 dark:text-indigo-500" />
                                                    {formatData(expandedItem.created_at)}
                                                </div>

                                                <p className="text-amber-700 dark:text-indigo-300 font-bold flex items-center gap-2 text-xs md:text-sm uppercase tracking-widest leading-relaxed">
                                                    <Quote className="w-4 h-4 opacity-40 shrink-0" /> {expandedItem.passagem}
                                                </p>
                                            </div>
                                        </div>
                                        <button onClick={() => setExpandedItem(null)} className="p-3 bg-slate-100 dark:bg-surface-2 hover:bg-slate-200 dark:hover:bg-surface-2 border border-slate-200 dark:border-border-subtle text-slate-700 dark:text-text-primary rounded-2xl transition-all active:scale-90 shrink-0">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Modal Content - Mensagens Individuais */}
                                <div className="flex-1 overflow-y-auto p-6 md:p-10 pt-4 md:pt-6 custom-scrollbar bg-white dark:bg-surface-0">
                                    <div className="space-y-6">
                                        {parseMensagens(expandedItem.resultado_texto).map((mensagem, idx) => (
                                            <div key={idx} className="relative group/msg bg-slate-50 dark:bg-surface-2 rounded-2xl p-6 border border-slate-200 dark:border-border-subtle hover:border-amber-400/40 dark:hover:border-indigo-500/30 transition-all">
                                                {/* Botões: Copiar e Like */}
                                                <div className="absolute top-4 right-4 flex items-center gap-1.5">
                                                    {/* Botão de copiar */}
                                                    <button
                                                        onClick={async () => {
                                                            await navigator.clipboard.writeText(mensagem);
                                                            const btn = document.getElementById(`copy-btn-${idx}`);
                                                            if (btn) {
                                                                btn.classList.add('bg-green-500', 'text-text-primary');
                                                                setTimeout(() => btn.classList.remove('bg-green-500', 'text-text-primary'), 1500);
                                                            }
                                                        }}
                                                        id={`copy-btn-${idx}`}
                                                        className="p-2 rounded-xl transition-all bg-white dark:bg-white/10 text-slate-400 dark:text-text-muted hover:text-amber-600 dark:hover:text-indigo-400 hover:bg-amber-50 dark:hover:bg-indigo-500/20 border border-slate-200 dark:border-border-subtle"
                                                        title="Copiar mensagem"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </button>
                                                    {/* Botão de like */}
                                                    <button
                                                        onClick={() => handleToggleMensagemLike(expandedItem.id, idx, mensagem)}
                                                        className={`p-2 rounded-xl transition-all ${favoritosIndividuais.includes(idx)
                                                            ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20 dark:shadow-rose-900/40'
                                                            : 'bg-white dark:bg-white/10 text-slate-400 dark:text-text-muted hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/20 border border-slate-200 dark:border-border-subtle'
                                                            }`}
                                                        title={favoritosIndividuais.includes(idx) ? 'Remover dos favoritos' : 'Favoritar esta mensagem'}
                                                    >
                                                        <Heart className={`w-4 h-4 ${favoritosIndividuais.includes(idx) ? 'fill-current' : ''}`} />
                                                    </button>
                                                </div>

                                                {/* Número da mensagem */}
                                                <div className="absolute top-4 left-4 text-[10px] font-bold text-amber-600/50 dark:text-indigo-500/50 uppercase tracking-widest">
                                                    Msg {idx + 1}
                                                </div>

                                                {/* Conteúdo */}
                                                <div className="pt-6 prose prose-lg dark:prose-invert max-w-none">
                                                    <ReactMarkdown
                                                        components={{
                                                            p: ({ node, ...props }) => <p className="mb-4 leading-relaxed text-slate-700 dark:text-text-secondary text-base" {...props} />,
                                                            strong: ({ node, ...props }) => <strong className="text-slate-900 dark:text-indigo-200 font-bold" {...props} />,
                                                        }}
                                                    >
                                                        {mensagem}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Modal Footer - Compact Icons Only */}
                                <div className="p-4 md:p-6 bg-white dark:bg-surface-0 border-t border-slate-200 dark:border-border-subtle flex items-center justify-center gap-3 shrink-0">
                                    {/* Share Button */}
                                    <ShareButton
                                        text={expandedItem.resultado_texto.substring(0, 300) + '...'}
                                        title={`Devocional: ${expandedItem.passagem}`}
                                    />

                                    {/* Delete Button - Icon Only */}
                                    <button
                                        onClick={(e) => {
                                            if (expandedItem) handleDelete(expandedItem, e);
                                        }}
                                        disabled={deletingId === expandedItem.id}
                                        className="p-3 rounded-xl transition-all bg-slate-100 dark:bg-surface-2 text-slate-400 dark:text-text-muted hover:bg-red-50 dark:hover:bg-red-500/20 hover:text-red-500 dark:hover:text-red-400 border border-slate-200 dark:border-border-subtle disabled:opacity-50"
                                        title="Excluir memória"
                                    >
                                        {deletingId === expandedItem.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4" />
                                        )}
                                    </button>

                                    {/* Like Button - Icon Only */}
                                    <button
                                        onClick={(e) => {
                                            if (expandedItem) handleToggleLike(expandedItem, e);
                                        }}
                                        className={`p-3 rounded-xl transition-all ${expandedItem.aprovado
                                            ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20 dark:shadow-rose-900/40'
                                            : 'bg-slate-100 dark:bg-surface-2 text-slate-400 dark:text-text-muted hover:bg-rose-50 dark:hover:bg-rose-500/20 hover:text-rose-500 dark:hover:text-rose-400 border border-slate-200 dark:border-border-subtle'
                                            }`}
                                        title={expandedItem.aprovado ? 'Remover dos favoritos' : 'Salvar como favorito'}
                                    >
                                        <Heart className={`w-4 h-4 ${expandedItem.aprovado ? 'fill-white' : ''}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Category Picker Modal */}
                    {showCategoryPicker && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => { setShowCategoryPicker(false); setPendingFavorite(null); }}>
                            <div className="absolute inset-0 bg-black/40 dark:bg-black/70 backdrop-blur-sm"></div>
                            <div className="relative bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-subtle rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                                <h3 className="text-lg font-black text-slate-900 dark:text-text-primary mb-1 tracking-tight">Escolha a categoria</h3>
                                <p className="text-xs text-slate-500 dark:text-text-muted mb-4">Em qual categoria esta mensagem se encaixa?</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {CATEGORIAS_DNA.map(cat => (
                                        <button
                                            key={cat.value}
                                            onClick={() => handleCategorySelected(cat.value)}
                                            className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-surface-2 border border-slate-200 dark:border-border-subtle rounded-xl text-sm text-slate-700 dark:text-text-secondary hover:bg-amber-50 dark:hover:bg-indigo-500/20 hover:border-amber-400/40 dark:hover:border-indigo-500/30 hover:text-amber-800 dark:hover:text-text-primary transition-all font-semibold"
                                        >
                                            <span>{cat.icon}</span>
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => { setShowCategoryPicker(false); setPendingFavorite(null); }}
                                    className="mt-4 w-full py-2 text-xs text-slate-400 dark:text-text-muted hover:text-slate-600 dark:hover:text-text-secondary transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}

                </main>
            </div>
        </CosmicBackground>
    );
}
