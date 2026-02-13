'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Loader2, RefreshCw, Globe, BookOpen,
    Church, Cross, Newspaper, AlertCircle, Trash, Copy, Save, CheckSquare
} from 'lucide-react';
import { CosmicBackground } from '@/components/ui/CosmicBackground';
import { supabase, getDataHoje } from '@/lib/supabase';
import ReactMarkdown from 'react-markdown';

// ============================================
// FONTES DISPONÍVEIS
// ============================================
const FONTES = [
    {
        id: 'voltemos',
        nome: 'Voltemos ao Evangelho',
        desc: 'Conteúdo reformado e centrado em Cristo.',
        icon: Cross,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/20'
    },
    {
        id: 'bible_gateway',
        nome: 'Bible Gateway',
        desc: 'Versículo do dia com tradução ARC.',
        icon: BookOpen,
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/20'
    },
    {
        id: 'instagram',
        nome: 'Instagram (Evangelho)',
        desc: 'Posts recentes do @evangelhoparatodos__',
        icon: Newspaper,
        color: 'text-pink-400',
        bgColor: 'bg-pink-500/10',
        borderColor: 'border-pink-500/20'
    },
    {
        id: 'tribo_juda',
        nome: 'Tribo de Judá',
        desc: 'Inspiração via @tribodejuda20',
        icon: Globe,
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/20'
    }
];

// ============================================
// PÁGINA DEVOCIONAL EXTERNO
// ============================================
// ============================================
// COMPONENTES AUXILIARES
// ============================================

// ============================================
// COMPONENTES AUXILIARES
// ============================================

interface DevocionalPost {
    title: string;
    selftext: string;
    titulo_pt: string;
    texto_pt: string;
    url: string;
    author: string;
    score: number;
    num_comments: number;
    fonte: string;
    created_utc: number;
}

interface InstagramPost {
    external_id: string;
    source: string;
    content: string;
    image_url: string;
    post_url: string;
    author_name: string;
    published_at: string;
}

const InstagramFeedCard = ({ post }: { post: InstagramPost }) => {
    const [copiado, setCopiado] = useState(false);
    const [salvando, setSalvando] = useState(false);

    const handleCopy = () => {
        const textoFormatado = `${post.content}`; // Copia exatamente o que veio do backend
        navigator.clipboard.writeText(textoFormatado);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
    };

    const handleSaveToDNA = async () => {
        setSalvando(true);
        try {
            const { error } = await supabase.from('dna_categorizado').insert({
                texto_msg: post.content,
                categoria: 'DEVOCIONAL',
                origem: 'instagram',
                tags: [post.author_name]
            });

            if (error) alert('Erro ao salvar no DNA: ' + error.message);
            else alert('Salvo no DNA com sucesso!');
        } catch (e) {
            alert('Erro ao salvar.');
        } finally {
            setSalvando(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Tem certeza que deseja apagar este post do cache?')) return;
        try {
            const { error } = await supabase
                .from('devocional_externo_posts')
                .delete()
                .eq('external_id', post.external_id);

            if (error) alert('Erro ao apagar: ' + error.message);
            else {
                window.location.reload();
            }
        } catch (e) {
            alert('Erro ao apagar.');
        }
    };

    return (
        <div className="glass-panel p-6 rounded-2xl border-white/10 hover:border-pink-500/30 transition-all flex flex-col gap-4">
            {/* Header */}
            <div className="flex justify-between items-start gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-pink-400 bg-pink-500/10 px-2 py-1 rounded-md">
                        INSTAGRAM
                    </span>
                    <span className="text-xs text-slate-500">
                        {new Date(post.published_at).toLocaleDateString()}
                    </span>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleDelete} className="p-1 hover:bg-white/10 rounded text-slate-500 hover:text-red-400 transition-colors" title="Apagar">
                        <Trash className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Content - Usando ReactMarkdown para renderizar negrito/italico se houver */}
            <div className="text-slate-300 text-sm leading-relaxed max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                <ReactMarkdown
                    components={{
                        p: ({ node, ...props }) => <p className="mb-4 whitespace-pre-wrap" {...props} />
                    }}
                >
                    {post.content}
                </ReactMarkdown>
            </div>

            {/* Footer Actions - Padronizados com DevocionalCard */}
            <div className="pt-4 border-t border-white/5 flex flex-wrap gap-2 mt-auto">
                <button
                    onClick={handleCopy}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${copiado ? 'bg-green-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                >
                    {copiado ? <CheckSquare className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiado ? 'Copiado!' : 'Copiar Texto'}
                </button>

                <button
                    onClick={handleSaveToDNA}
                    disabled={salvando}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold bg-pink-500/10 text-pink-400 hover:bg-pink-500 hover:text-white transition-all disabled:opacity-50"
                >
                    {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {salvando ? 'Salvando...' : 'Salvar DNA'}
                </button>

                <Link href={post.post_url} target="_blank" className="flex items-center justify-center px-3 py-2 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                    Link
                </Link>
            </div>
        </div>
    );
};

const DevocionalCard = ({ post }: { post: DevocionalPost }) => {
    const [copiado, setCopiado] = useState(false);

    const handleCopy = () => {
        const textoFormatado = `📖 *${post.titulo_pt.toUpperCase()}*\n\n${post.texto_pt}\n\n✍️ *${post.author}* | via ${post.fonte}\n#Devocional #Edificação`;
        navigator.clipboard.writeText(textoFormatado);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
    };

    return (
        <div className="glass-panel p-6 rounded-2xl border-white/10 hover:border-amber-500/30 transition-all flex flex-col gap-4">
            {/* Header */}
            <div className="flex justify-between items-start gap-4">
                <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md mb-2 inline-block">
                        {post.fonte}
                    </span>
                    <h3 className="text-lg font-bold text-white leading-tight">
                        <Link href={post.url} target="_blank" className="hover:text-amber-400 transition-colors">
                            {post.titulo_pt}
                        </Link>
                    </h3>
                </div>
            </div>

            {/* Content Preview */}
            <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                {post.texto_pt}
            </div>

            {/* Footer / Action */}
            <div className="pt-4 border-t border-white/5 flex justify-between items-center mt-auto">
                <span className="text-xs text-slate-500 font-medium">Por: {post.author}</span>

                <button
                    onClick={handleCopy}
                    className={`
                        flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                        ${copiado ? 'bg-green-500 text-white' : 'bg-white/10 text-white hover:bg-amber-500 hover:text-black'}
                    `}
                >
                    {copiado ? 'Copiado!' : 'Copiar para Postar'}
                </button>
            </div>
        </div>
    );
};

// ============================================
// PÁGINA DEVOCIONAL EXTERNO
// ============================================
export default function DevocionalExternoPage() {
    const [tab, setTab] = useState<'fontes' | 'mundo'>('fontes');
    const [searchMode, setSearchMode] = useState<'trending' | 'passage'>('trending');

    // Estados dos Devocionais Externos
    const [devocionais, setDevocionais] = useState<DevocionalPost[]>([]);
    const [buscandoMundo, setBuscandoMundo] = useState(false);

    // Estados das Fontes
    const [fonteAtiva, setFonteAtiva] = useState<string | null>(null);
    const [carregando, setCarregando] = useState(false);
    const [resultado, setResultado] = useState<string | null>(null);
    const [postsInstagram, setPostsInstagram] = useState<InstagramPost[]>([]); // Novo estado
    const [erro, setErro] = useState<string | null>(null);

    const dataHoje = getDataHoje();

    // Buscar Devocional RSS (Original)
    const buscarDevocional = async (fonteId: string) => {
        setCarregando(true);
        setErro(null);
        setFonteAtiva(fonteId);
        setResultado(null);
        setPostsInstagram([]);

        try {
            const { data, error } = await supabase.functions.invoke('execute', {
                body: {
                    modo_id: 'devocional_externo',
                    data: dataHoje,
                    fonte_rss: fonteId
                }
            });

            if (error) throw error;
            if (!data.ok) throw new Error(data.error || 'Erro ao buscar devocional.');

            if (fonteId === 'instagram' || fonteId === 'tribo_juda') {
                if (data.dados_estruturados && Array.isArray(data.dados_estruturados)) {
                    setPostsInstagram(data.dados_estruturados);
                } else if (Array.isArray(data.resultado)) { // Compatibilidade caso venha direto no resultado
                    setPostsInstagram(data.resultado);
                }
            } else {
                setResultado(data.resultado);
            }

        } catch (e: any) {
            console.error('Erro:', e);
            setErro(e.message || 'Erro de conexão.');
        } finally {
            setCarregando(false);
        }
    };

    // Buscar Devocionais do Mundo
    const buscarDevocionaisMundo = async (mode: 'trending' | 'passage') => {
        setBuscandoMundo(true);
        setSearchMode(mode);
        setDevocionais([]); // Limpar anterior

        try {
            // Se for modo passage, precisamos saber qual é a passagem de hoje
            let query = '';
            if (mode === 'passage') {
                const { getPassagemUnificada } = await import('@/lib/supabase');
                const p = await getPassagemUnificada(dataHoje);
                if (p) query = p.referencia; // ex: "Jeremias 29"
                else query = 'Bible'; // Fallback
            }

            const { data, error } = await supabase.functions.invoke('fetch-reddit-trends', {
                body: { mode, query }
            });

            if (error) throw error;
            setDevocionais(data.posts || []);

        } catch (e) {
            console.error('Erro ao buscar devocionais:', e);
        } finally {
            setBuscandoMundo(false);
        }
    };

    const fonteInfo = FONTES.find(f => f.id === fonteAtiva);

    return (
        <CosmicBackground className="min-h-screen font-sans">

            {/* Header */}
            <header className="sticky top-0 z-50 w-full px-6 py-4 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <Link href="/" className="group p-3 bg-white/5 hover:bg-amber-500/10 border border-white/10 rounded-2xl transition-all">
                        <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-amber-500" />
                    </Link>

                    <div className="flex bg-white/5 p-1 rounded-xl">
                        <button
                            onClick={() => setTab('fontes')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'fontes' ? 'bg-amber-500 text-black shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Fontes
                        </button>
                        <button
                            onClick={() => { setTab('mundo'); if (devocionais.length === 0) buscarDevocionaisMundo('trending'); }}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'mundo' ? 'bg-amber-500 text-black shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Mundo (RSS)
                        </button>
                    </div>

                    <div className="w-12"></div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-12 space-y-12">

                {/* VISÃO: FONTES RSS */}
                {tab === 'fontes' && (
                    <>
                        <section className="text-center space-y-4 animate-enter">
                            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                                Devocionais do Mundo
                            </h1>
                            <p className="text-slate-400 text-lg max-w-xl mx-auto">
                                Escolha uma fonte e leia o devocional original, direto do site.
                            </p>
                        </section>

                        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-enter">
                            {FONTES.map((fonte) => {
                                const Icon = fonte.icon;
                                const isActive = fonteAtiva === fonte.id;

                                return (
                                    <button
                                        key={fonte.id}
                                        onClick={() => buscarDevocional(fonte.id)}
                                        disabled={carregando}
                                        className={`
                                            relative p-6 rounded-3xl border text-left transition-all duration-500 group
                                            ${isActive
                                                ? `${fonte.bgColor} ${fonte.borderColor} shadow-xl`
                                                : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.05]'}
                                            ${carregando && !isActive ? 'opacity-50' : ''}
                                        `}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={`p-3 rounded-2xl ${fonte.bgColor} ${fonte.color}`}>
                                                {carregando && isActive ? <Loader2 className="w-6 h-6 animate-spin" /> : <Icon className="w-6 h-6" />}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className={`font-bold text-lg mb-1 ${isActive ? fonte.color : 'text-white group-hover:text-amber-300'}`}>
                                                    {fonte.nome}
                                                </h3>
                                                <p className="text-slate-400 text-sm leading-relaxed">{fonte.desc}</p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </section>

                        {/* Resultado RSS / Instagram */}
                        {!carregando && (
                            <section className="animate-enter space-y-6">
                                {(fonteAtiva === 'instagram' || fonteAtiva === 'tribo_juda') && postsInstagram.length > 0 && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {postsInstagram.map((post) => (
                                            <InstagramFeedCard key={post.external_id} post={post} />
                                        ))}
                                    </div>
                                )}

                                {resultado && fonteAtiva !== 'instagram' && fonteAtiva !== 'tribo_juda' && (
                                    <div className="glass-panel rounded-[2.5rem] p-10 md:p-14">
                                        <div className="whitespace-pre-wrap font-medium text-slate-300 leading-relaxed">
                                            {resultado}
                                        </div>
                                    </div>
                                )}

                                {((fonteAtiva === 'instagram' || fonteAtiva === 'tribo_juda') && postsInstagram.length === 0 && !erro) && (
                                    <div className="text-center text-slate-500 py-10">Buscando posts...</div>
                                )}
                            </section>
                        )}
                    </>
                )}

                {/* VISÃO: DEVOCIONAIS DO MUNDO */}
                {tab === 'mundo' && (
                    <>
                        {/* Feed Único de Fontes Seguras */}
                        <div className="flex justify-center mb-8">
                            <span className="px-4 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-widest border border-emerald-500/20">
                                Feed Oficial Seguro
                            </span>
                        </div>

                        {buscandoMundo ? (
                            <div className="text-center py-20">
                                <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-4" />
                                <p className="text-slate-400 animate-pulse">Buscando devocionais do mundo...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6 animate-enter">
                                {devocionais.map((post: DevocionalPost, idx: number) => (
                                    <DevocionalCard key={idx} post={post} />
                                ))}
                                {devocionais.length === 0 && (
                                    <div className="text-center py-10 text-slate-500">
                                        Nenhum devocional encontrado. Tente novamente.
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

            </main>
        </CosmicBackground>
    );
}
