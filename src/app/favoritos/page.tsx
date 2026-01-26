import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Book, Sparkles, Copy, Trash2, Calendar, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getFavoritosManuais, FavoritoMensagem, removeFavoritoMensagem, removeFavoritoById } from '@/lib/supabase';
import { CosmicHeader } from '@/components/ui/CosmicHeader';
import { CosmicBackground } from '@/components/ui/CosmicBackground';

export default function FavoritosPage() {
    const [favoritos, setFavoritos] = useState<FavoritoMensagem[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const loadData = async () => {
        setLoading(true);
        const data = await getFavoritosManuais();
        setFavoritos(data);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCopy = async (texto: string, idx: number) => {
        await navigator.clipboard.writeText(texto);
        const btn = document.getElementById(`copy-btn-${idx}`);
        if (btn) {
            const originalContent = btn.innerHTML;
            btn.innerHTML = '<span class="text-green-400 font-bold text-xs uppercase tracking-wider">Copiado!</span>';
            setTimeout(() => {
                btn.innerHTML = originalContent;
            }, 2000);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Tem certeza que deseja remover esta mensagem do Banco de Ouro?')) return;

        setDeletingId(id);
        const success = await removeFavoritoById(id);

        if (success) {
            setFavoritos(prev => prev.filter(item => item.id !== id));
        } else {
            alert('Erro ao remover. Tente novamente.');
        }
        setDeletingId(null);
    };

    // CORREÇÃO EM TEMPO REAL: 
    // Percebi que a função de delete atual (removeFavoritoMensagem) depende de historico_id e indice.
    // As manuais não tem historico_id. Precisamos de um delete por ID primário da tabela favoritos_mensagens.
    // Vou criar a página assumindo que vou consertar o backend logo em seguida.

    return (
        <CosmicBackground className="font-sans text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200">
            <div className="w-full flex flex-col items-center relative z-10">
                <div className="w-full max-w-6xl">
                    <CosmicHeader className="pb-32 md:pb-48">
                        <div className="w-full px-4 sm:px-6 lg:px-8 pt-12 text-center md:text-left">
                            <div className="flex flex-col md:flex-row items-center md:items-start gap-5 mb-8 animate-divine">
                                <Link href="/" className="group p-3 bg-white/[0.03] hover:bg-white/[0.08] rounded-2xl transition-all border border-white/5 hover:border-white/10 active:scale-95">
                                    <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-white" />
                                </Link>
                                <div className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-yellow-500/10 border border-yellow-400/20 rounded-full text-yellow-300 text-[10px] font-black uppercase tracking-[0.2em] shadow-inner">
                                    <Book className="w-3.5 h-3.5" />
                                    Banco de Ouro
                                </div>
                            </div>

                            <h1 className="text-4xl md:text-7xl font-black tracking-divine text-white mb-6 divine-halo animate-divine text-center md:text-left">
                                Minhas Mensagens <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-amber-500">Externas</span>
                            </h1>
                            <p className="text-slate-400 max-w-2xl text-lg md:text-xl leading-relaxed animate-divine [animation-delay:200ms] text-center md:text-left mx-auto md:mx-0">
                                Coleção exclusiva de mensagens adicionadas manualmente para uso futuro.
                            </p>
                        </div>
                    </CosmicHeader>
                </div>

                <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-20 flex flex-col space-y-8 py-20">

                    {loading ? (
                        [1, 2, 3].map(i => (
                            <div key={i} className="h-40 bg-white/[0.02] rounded-[2rem] animate-pulse border border-white/5" />
                        ))
                    ) : favoritos.length === 0 ? (
                        <div className="text-center py-20 bg-white/[0.02] rounded-[3rem] border border-white/5 animate-divine">
                            <Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-400 mb-2">Seu Banco de Ouro está vazio</h3>
                            <p className="text-slate-500 text-sm">Adicione mensagens manualmente para vê-las aqui.</p>
                        </div>
                    ) : (
                        favoritos.map((fav, idx) => (
                            <div key={fav.id} className="group relative bg-[#020617]/60 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 hover:border-indigo-500/30 transition-all duration-500 hover:shadow-[0_0_40px_-10px_rgba(99,102,241,0.1)]">

                                <div className="flex items-center justify-between mb-6">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/[0.03] border border-white/5 rounded-full text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                                        <Calendar className="w-3 h-3 text-indigo-500" />
                                        {new Date(fav.created_at).toLocaleDateString('pt-BR')}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            id={`copy-btn-${idx}`}
                                            onClick={() => handleCopy(fav.texto_msg, idx)}
                                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all text-xs font-bold uppercase tracking-widest active:scale-95"
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                            Copiar
                                        </button>

                                        <button
                                            onClick={() => handleDelete(fav.id)}
                                            disabled={deletingId === fav.id}
                                            className="p-2 rounded-xl bg-white/5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-white/5 transition-all"
                                            title="Excluir"
                                        >
                                            {deletingId === fav.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="prose prose-invert max-w-none prose-p:text-slate-300 prose-p:leading-relaxed prose-headings:text-indigo-200">
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
