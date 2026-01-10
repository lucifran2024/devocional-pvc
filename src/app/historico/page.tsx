'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, Book, Heart, Loader2, Sparkles, X, Share2, Quote, Filter, ArrowRight, LayoutTemplate, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getHistorico, toggleLike, deleteHistoricoItem } from '@/lib/supabase';
import { CosmicHeader } from '@/components/ui/CosmicHeader';
import { CosmicBackground } from '@/components/ui/CosmicBackground';

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

    return (
        <CosmicBackground className="font-sans text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200">

            {/* THE GIANT WRAPPER */}
            <div className="w-full flex flex-col items-center relative z-10">

                {/* HEADER PREMIUM */}
                <div className="w-full max-w-6xl">
                    <CosmicHeader className="pb-32 md:pb-48">
                        <div className="w-full px-4 sm:px-6 lg:px-8 pt-12 text-center md:text-left">
                            <div className="flex flex-col md:flex-row items-center md:items-start gap-5 mb-8 animate-divine">
                                <Link href="/" className="group p-3 bg-white/[0.03] hover:bg-white/[0.08] rounded-2xl transition-all border border-white/5 hover:border-white/10 active:scale-95">
                                    <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-white" />
                                </Link>
                                <div className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-indigo-500/10 border border-indigo-400/20 rounded-full text-indigo-300 text-[10px] font-black uppercase tracking-[0.2em] shadow-inner">
                                    <Book className="w-3.5 h-3.5" />
                                    Crônicas do Coração
                                </div>
                            </div>

                            <h1 className="text-4xl md:text-7xl font-black tracking-divine text-white mb-6 divine-halo animate-divine text-center md:text-left">
                                Minhas Memórias
                            </h1>
                            <p className="text-slate-400 max-w-2xl text-lg md:text-xl leading-relaxed animate-divine [animation-delay:200ms] text-center md:text-left mx-auto md:mx-0">
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
                        <div className="bg-[#020617]/40 p-1.5 rounded-[1.5rem] shadow-2xl backdrop-blur-3xl border border-white/5 flex gap-1.5">
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-500 flex items-center gap-2.5 ${filter === 'all'
                                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/40'
                                    : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'
                                    }`}
                            >
                                <LayoutTemplate className="w-4 h-4" />
                                Todas
                            </button>
                            <button
                                onClick={() => setFilter('favorites')}
                                className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-500 flex items-center gap-2.5 ${filter === 'favorites'
                                    ? 'bg-rose-600 text-white shadow-xl shadow-rose-900/40'
                                    : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'
                                    }`}
                            >
                                <Heart className={`w-4 h-4 ${filter === 'favorites' ? 'fill-current' : ''}`} />
                                Favoritos
                            </button>
                        </div>

                        <div className="flex items-center gap-3 px-5 py-2.5 bg-white/[0.02] rounded-2xl text-[11px] font-bold text-slate-500 border border-white/5 uppercase tracking-widest">
                            <Filter className="w-4 h-4 text-indigo-500/50" />
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
                                <div className="w-24 h-24 bg-white/[0.02] rounded-[2rem] flex items-center justify-center mx-auto mb-4 border border-white/5">
                                    <Sparkles className="w-10 h-10 text-slate-700" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-400 tracking-tight">O silêncio precede a revelação.</h3>
                                <p className="text-slate-600 text-sm max-w-xs mx-auto leading-relaxed">Sua jornada de memórias começa assim que você gerar seu primeiro devocional.</p>
                            </div>
                        ) : (
                            items.map((item, idx) => (
                                <div
                                    key={item.id}
                                    style={{ animationDelay: `${idx * 50}ms` }}
                                    className="group relative stellar-card rounded-[2.5rem] p-10 border border-white/5 overflow-hidden hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] transition-all duration-700 hover:-translate-y-2 cursor-pointer animate-divine"
                                    onClick={() => setExpandedItem(item)}
                                >
                                    <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/[0.03] rounded-bl-[100px] transition-all duration-700 group-hover:bg-indigo-500/[0.07] group-hover:scale-125"></div>

                                    <div className="relative z-10">
                                        <div className="flex items-start justify-between mb-8">
                                            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-white/[0.03] border border-white/5 rounded-full text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] group-hover:text-white transition-colors">
                                                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                                                {formatData(item.created_at)}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => handleDelete(item, e)}
                                                    disabled={deletingId === item.id}
                                                    className="p-3 rounded-2xl transition-all duration-500 bg-white/[0.03] border border-white/5 text-slate-600 hover:text-red-400 hover:border-red-500/50 hover:bg-red-500/10 disabled:opacity-50"
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
                                                    className={`p-3 rounded-2xl transition-all duration-500 ${item.aprovado ? 'bg-rose-500 border border-rose-400 shadow-lg shadow-rose-900/40 text-white' : 'bg-white/[0.03] border border-white/5 text-slate-600 hover:text-white hover:border-rose-500/50'}`}
                                                >
                                                    <Heart className={`w-5 h-5 ${item.aprovado ? 'fill-current' : ''}`} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mb-6">
                                            <h3 className="font-black text-xl text-white mb-2 line-clamp-1 tracking-tight group-hover:text-indigo-300 transition-colors uppercase italic">{item.modo_id}</h3>
                                            <p className="text-slate-500 text-xs font-bold flex items-center gap-2.5 uppercase tracking-widest pl-1">
                                                <Quote className="w-3.5 h-3.5 text-indigo-500/50" /> {item.passagem}
                                            </p>
                                        </div>

                                        <div className="relative">
                                            <div className="text-slate-400 leading-[1.8] line-clamp-4 text-sm font-medium">
                                                {item.resultado_texto}
                                            </div>
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent h-full"></div>
                                        </div>

                                        <div className="mt-8 flex items-center gap-3 text-indigo-400 font-black text-[10px] uppercase tracking-[0.2em] group-hover:gap-5 transition-all">
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
                            <div className="absolute inset-0 bg-[#020617]/90 backdrop-blur-xl animate-in fade-in duration-500"></div>

                            <div className="bg-[#020617] w-full max-w-4xl max-h-[90vh] rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col pt-0 animate-in fade-in zoom-in-95 duration-500 border border-white/10 relative z-10" onClick={e => e.stopPropagation()}>

                                {/* Modal Header */}
                                <div className="p-6 md:p-10 bg-gradient-to-br from-[#0f172a] to-[#020617] text-white shrink-0 relative overflow-hidden border-b border-white/5">
                                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] -mr-32 -mt-32"></div>

                                    <div className="relative z-10 flex items-start justify-between">
                                        <div className="flex-1 pr-4">
                                            {/* Adjusted: Smaller Title & Tighter Spacing */}
                                            <h2 className="text-2xl md:text-4xl font-black mb-3 tracking-divine divine-halo italic uppercase leading-tight">{expandedItem.modo_id}</h2>

                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-2">
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                                                    <Calendar className="w-3 h-3 text-indigo-500" />
                                                    {formatData(expandedItem.created_at)}
                                                </div>

                                                <p className="text-indigo-300 font-bold flex items-center gap-2 text-xs md:text-sm uppercase tracking-widest leading-relaxed">
                                                    <Quote className="w-4 h-4 opacity-40 shrink-0" /> {expandedItem.passagem}
                                                </p>
                                            </div>
                                        </div>
                                        <button onClick={() => setExpandedItem(null)} className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl transition-all active:scale-90 shrink-0">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Modal Content - Pulled Up & Tighter Text */}
                                <div className="flex-1 overflow-y-auto p-6 md:p-10 pt-4 md:pt-6 custom-scrollbar bg-[#020617]">
                                    <div className="prose prose-lg prose-invert max-w-none 
                                    prose-headings:text-indigo-200 prose-headings:font-black
                                    prose-blockquote:border-l-[4px] prose-blockquote:border-indigo-600 prose-blockquote:bg-indigo-950/20 prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:rounded-xl prose-blockquote:not-italic prose-blockquote:my-4">
                                        <ReactMarkdown
                                            components={{
                                                p: ({ node, ...props }) => <p className="mb-6 leading-relaxed text-slate-300 text-lg" {...props} />,
                                                hr: ({ node, ...props }) => <hr className="my-12 border-white/10 border-t-2" {...props} />,
                                                strong: ({ node, ...props }) => <strong className="text-indigo-200 font-bold" {...props} />,
                                                li: ({ node, ...props }) => <li className="text-slate-300 my-2" {...props} />
                                            }}
                                        >
                                            {expandedItem.resultado_texto}
                                        </ReactMarkdown>
                                    </div>
                                </div>

                                {/* Modal Footer */}
                                <div className="p-8 md:p-10 bg-[#020617] border-t border-white/5 flex flex-wrap items-center justify-center gap-4 shrink-0">
                                    {/* Delete Button */}
                                    <button
                                        onClick={(e) => {
                                            if (expandedItem) handleDelete(expandedItem, e);
                                        }}
                                        disabled={deletingId === expandedItem.id}
                                        className="flex items-center gap-3 px-8 py-5 rounded-[2.5rem] transition-all font-black text-sm uppercase tracking-[0.15em] bg-white/5 text-slate-400 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50 border border-white/10 disabled:opacity-50"
                                    >
                                        {deletingId === expandedItem.id ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-5 h-5" />
                                        )}
                                        Excluir
                                    </button>

                                    {/* Like Button */}
                                    <button
                                        onClick={(e) => {
                                            if (expandedItem) handleToggleLike(expandedItem, e);
                                        }}
                                        className={`flex items-center gap-4 px-12 py-5 rounded-[2.5rem] transition-all font-black text-sm uppercase tracking-[0.15em] shadow-2xl ${expandedItem.aprovado
                                            ? 'bg-rose-600 text-white shadow-rose-900/40 ring-2 ring-white/20'
                                            : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                                            }`}
                                    >
                                        <Heart className={`w-5 h-5 ${expandedItem.aprovado ? 'fill-white' : ''}`} />
                                        {expandedItem.aprovado ? 'Memória Salva' : 'Salvar Memória'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </main>
            </div>
        </CosmicBackground>
    );
}
