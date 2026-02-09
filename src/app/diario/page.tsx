'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Feather, Send, Check, Loader2 } from 'lucide-react';
import { CosmicHeader } from '@/components/ui/CosmicHeader';
import { CosmicBackground } from '@/components/ui/CosmicBackground';
import { addFavoritoUnificado, CategoriaDna } from '@/lib/supabase';

export default function DiarioPage() {
    const [mensagem, setMensagem] = useState('');
    const [categoria, setCategoria] = useState<CategoriaDna>('outro');
    const [loading, setLoading] = useState(false);
    const [sucesso, setSucesso] = useState(false);

    const CATEGORIAS: { value: CategoriaDna; label: string }[] = [
        { value: 'devocional', label: '📖 Devocional' },
        { value: 'oração', label: '🙏 Oração' },
        { value: 'versículo', label: '📜 Versículo' },
        { value: 'reflexão', label: '💭 Reflexão' },
        { value: 'exortação', label: '🔥 Exortação' },
        { value: 'declaração', label: '✨ Declaração' },
        { value: 'outro', label: '📝 Outro' }
    ];

    const handleSubmit = async () => {
        if (!mensagem.trim() || loading) return;

        setLoading(true);
        setSucesso(false);

        const result = await addFavoritoUnificado(mensagem.trim(), categoria);

        if (result.dna) {
            setSucesso(true);
            setMensagem('');
            setCategoria('outro');
            // Reset sucesso após 3s
            setTimeout(() => setSucesso(false), 3000);
        }

        setLoading(false);
    };

    return (
        <CosmicBackground className="font-sans text-slate-100 selection:bg-amber-500/30 selection:text-amber-200">
            <div className="w-full flex flex-col items-center relative z-10">

                {/* HEADER */}
                <div className="w-full max-w-4xl">
                    <CosmicHeader className="pb-32 md:pb-40">
                        <div className="w-full px-4 sm:px-6 lg:px-8 pt-12 text-center md:text-left">
                            <div className="flex flex-col md:flex-row items-center md:items-start gap-5 mb-8 animate-divine">
                                <Link href="/" className="group p-3 bg-white/[0.03] hover:bg-white/[0.08] rounded-2xl transition-all border border-white/5 hover:border-white/10 active:scale-95">
                                    <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-white" />
                                </Link>
                                <div className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-amber-500/10 border border-amber-400/20 rounded-full text-amber-300 text-[10px] font-black uppercase tracking-[0.2em] shadow-inner">
                                    <Feather className="w-3.5 h-3.5" />
                                    Diário de Favoritos
                                </div>
                            </div>

                            <h1 className="text-4xl md:text-6xl font-black tracking-divine text-white mb-4 divine-halo animate-divine text-center md:text-left">
                                Adicionar Mensagem
                            </h1>
                            <p className="text-slate-400 max-w-2xl text-lg leading-relaxed animate-divine [animation-delay:200ms] text-center md:text-left mx-auto md:mx-0">
                                Cole ou escreva uma mensagem que você gostou. Ela será salva como favorita e usada pela IA para aprender seu estilo.
                            </p>
                        </div>
                    </CosmicHeader>
                </div>

                {/* MAIN CONTENT */}
                <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-20 flex flex-col space-y-8 py-20">

                    {/* Textarea Card */}
                    <div className="stellar-card rounded-[2.5rem] p-8 md:p-12 border border-white/5 animate-divine">
                        <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
                            Sua Mensagem Favorita
                        </label>
                        <textarea
                            value={mensagem}
                            onChange={(e) => setMensagem(e.target.value)}
                            placeholder="Cole aqui uma mensagem devocional que te tocou, uma oração que você escreveu, ou qualquer texto inspirador..."
                            className="w-full h-64 bg-white/[0.02] border border-white/10 rounded-2xl p-6 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all resize-none text-lg leading-relaxed"
                        />

                        {/* Seletor de Categoria */}
                        <div className="mt-6">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                                Categoria
                            </label>
                            <select
                                value={categoria}
                                onChange={(e) => setCategoria(e.target.value as CategoriaDna)}
                                className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all cursor-pointer"
                            >
                                {CATEGORIAS.map((cat) => (
                                    <option key={cat.value} value={cat.value} className="bg-slate-900">
                                        {cat.label}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-600 mt-2">
                                A mensagem será salva em ambos os bancos: Favoritos e DNA Categorizado
                            </p>
                        </div>

                        {/* Contador de caracteres */}
                        <div className="flex justify-between items-center mt-4">
                            <span className="text-xs text-slate-600">
                                {mensagem.length} caracteres
                            </span>
                            <span className="text-xs text-slate-600">
                                Mínimo: 50 | Ideal: 200-500
                            </span>
                        </div>
                    </div>

                    {/* Botão Salvar */}
                    <button
                        onClick={handleSubmit}
                        disabled={loading || mensagem.trim().length < 50}
                        className={`w-full py-5 rounded-2xl font-black text-lg uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${sucesso
                            ? 'bg-emerald-600 text-white'
                            : mensagem.trim().length >= 50
                                ? 'bg-amber-500 hover:bg-amber-400 text-black'
                                : 'bg-white/5 text-slate-600 cursor-not-allowed'
                            }`}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Salvando...
                            </>
                        ) : sucesso ? (
                            <>
                                <Check className="w-5 h-5" />
                                Salvo com Sucesso!
                            </>
                        ) : (
                            <>
                                <Send className="w-5 h-5" />
                                Salvar como Favorita
                            </>
                        )}
                    </button>

                    {/* Dica */}
                    <div className="text-center text-sm text-slate-500 leading-relaxed">
                        <p>💡 <strong>Dica:</strong> Quanto mais mensagens você salvar, melhor a IA aprenderá seu estilo preferido!</p>
                    </div>

                </main>
            </div>
        </CosmicBackground>
    );
}
