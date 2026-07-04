'use client';

import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Heart, StickyNote, Plus, Trash2, Loader2, Pencil, X, Check } from 'lucide-react';
import { CosmicBackground } from '@/components/ui/CosmicBackground';
import { BackButton } from '@/components/ui/BackButton';
import { getAllInteracoesPorTipo, type BibliaInteracao } from '@/lib/supabase';
import {
    getAnotacoesLivres, criarAnotacaoLivre, atualizarAnotacaoLivre, removerAnotacaoLivre,
    type AnotacaoLivre,
} from '@/lib/anotacoes';

type Aba = 'biblia' | 'livres';

export default function AnotacoesPage() {
    const [aba, setAba] = useState<Aba>('biblia');

    // Da Bíblia
    const [favoritos, setFavoritos] = useState<BibliaInteracao[]>([]);
    const [notas, setNotas] = useState<BibliaInteracao[]>([]);
    const [loadingBiblia, setLoadingBiblia] = useState(true);

    // Livres
    const [livres, setLivres] = useState<AnotacaoLivre[]>([]);
    const [loadingLivres, setLoadingLivres] = useState(true);
    const [editando, setEditando] = useState<string | 'nova' | null>(null);
    const [tituloEdit, setTituloEdit] = useState('');
    const [textoEdit, setTextoEdit] = useState('');
    const [salvando, setSalvando] = useState(false);

    const carregarBiblia = useCallback(async () => {
        setLoadingBiblia(true);
        const [favs, nts] = await Promise.all([
            getAllInteracoesPorTipo('favorito', 200),
            getAllInteracoesPorTipo('nota', 200),
        ]);
        setFavoritos(favs.filter((f: BibliaInteracao) => f.texto_versiculo));
        setNotas(nts.filter((n: BibliaInteracao) => n.nota));
        setLoadingBiblia(false);
    }, []);

    const carregarLivres = useCallback(async () => {
        setLoadingLivres(true);
        setLivres(await getAnotacoesLivres());
        setLoadingLivres(false);
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- carga assíncrona (setState após await)
        carregarBiblia();
        // eslint-disable-next-line react-hooks/set-state-in-effect -- carga assíncrona (setState após await)
        carregarLivres();
    }, [carregarBiblia, carregarLivres]);

    const abrirNova = () => {
        setEditando('nova');
        setTituloEdit('');
        setTextoEdit('');
    };

    const abrirEdicao = (a: AnotacaoLivre) => {
        setEditando(a.id);
        setTituloEdit(a.titulo || '');
        setTextoEdit(a.texto);
    };

    const salvar = async () => {
        if (!textoEdit.trim() || salvando) return;
        setSalvando(true);
        if (editando === 'nova') {
            await criarAnotacaoLivre(tituloEdit.trim(), textoEdit.trim());
        } else if (editando) {
            await atualizarAnotacaoLivre(editando, tituloEdit.trim(), textoEdit.trim());
        }
        setEditando(null);
        await carregarLivres();
        setSalvando(false);
    };

    const remover = async (id: string) => {
        setLivres((prev) => prev.filter((a) => a.id !== id));
        await removerAnotacaoLivre(id);
    };

    const formatarData = (iso: string) =>
        new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

    return (
        <CosmicBackground className="flex flex-col min-h-screen px-4 sm:px-6 py-8 selection:bg-amber-500/30">
            <div className="max-w-3xl mx-auto w-full space-y-6">
                <BackButton href="/" label="Início" />

                <div className="text-center space-y-2">
                    <h1 className="reading-serif text-3xl md:text-4xl font-semibold text-text-primary">
                        Minhas Anotações
                    </h1>
                    <p className="text-text-muted text-sm">Seus versículos marcados e seu caderno pessoal.</p>
                </div>

                {/* Abas */}
                <div className="flex bg-surface-2 rounded-xl p-1 max-w-sm mx-auto w-full">
                    {([['biblia', 'Da Bíblia'], ['livres', 'Livres']] as const).map(([id, label]) => (
                        <button
                            key={id}
                            onClick={() => setAba(id)}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${aba === id
                                ? 'bg-amber-500 text-amber-950 shadow-md'
                                : 'text-text-muted hover:text-text-primary'
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* ABA DA BÍBLIA */}
                {aba === 'biblia' && (
                    <div className="space-y-6">
                        {loadingBiblia ? (
                            <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 text-amber-500 animate-spin" /></div>
                        ) : favoritos.length === 0 && notas.length === 0 ? (
                            <div className="text-center py-12 text-text-muted">
                                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
                                <p className="text-sm">Você ainda não marcou versículos nem escreveu notas na Bíblia.</p>
                            </div>
                        ) : (
                            <>
                                {notas.length > 0 && (
                                    <section className="space-y-3">
                                        <h2 className="flex items-center gap-2 text-sm font-bold text-text-primary">
                                            <StickyNote className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Notas
                                        </h2>
                                        {notas.map((n) => (
                                            <div key={n.id} className="rounded-2xl border border-border-subtle bg-surface-1 p-4">
                                                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">
                                                    {n.livro_nome} {n.capitulo}:{n.versiculo}
                                                </div>
                                                <p className="reading-serif text-sm text-text-secondary italic mb-2">&ldquo;{n.texto_versiculo}&rdquo;</p>
                                                <p className="text-sm text-text-primary whitespace-pre-wrap border-l-2 border-amber-500/40 pl-3">{n.nota}</p>
                                            </div>
                                        ))}
                                    </section>
                                )}

                                {favoritos.length > 0 && (
                                    <section className="space-y-3">
                                        <h2 className="flex items-center gap-2 text-sm font-bold text-text-primary">
                                            <Heart className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Versículos favoritos
                                        </h2>
                                        {favoritos.map((f) => (
                                            <div key={f.id} className="rounded-2xl border border-border-subtle bg-surface-1 p-4">
                                                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">
                                                    {f.livro_nome} {f.capitulo}:{f.versiculo}
                                                </div>
                                                <p className="reading-serif text-sm text-text-secondary italic">&ldquo;{f.texto_versiculo}&rdquo;</p>
                                            </div>
                                        ))}
                                    </section>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* ABA LIVRES */}
                {aba === 'livres' && (
                    <div className="space-y-4">
                        {editando ? (
                            <div className="rounded-2xl border border-amber-500/30 bg-surface-1 p-4 space-y-3">
                                <input
                                    value={tituloEdit}
                                    onChange={(e) => setTituloEdit(e.target.value)}
                                    placeholder="Título (opcional)"
                                    className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border-subtle text-text-primary text-sm font-semibold focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
                                />
                                <textarea
                                    value={textoEdit}
                                    onChange={(e) => setTextoEdit(e.target.value)}
                                    placeholder="Escreva sua anotação..."
                                    rows={6}
                                    autoFocus
                                    className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border-subtle text-text-primary text-sm leading-relaxed resize-y focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
                                />
                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => setEditando(null)} className="px-4 py-2 rounded-lg text-sm font-semibold text-text-muted hover:text-text-primary flex items-center gap-1.5">
                                        <X className="w-4 h-4" /> Cancelar
                                    </button>
                                    <button onClick={salvar} disabled={!textoEdit.trim() || salvando}
                                        className="px-4 py-2 rounded-lg bg-amber-500 text-amber-950 text-sm font-bold hover:bg-amber-400 disabled:opacity-50 flex items-center gap-1.5">
                                        {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Salvar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button onClick={abrirNova}
                                className="w-full py-3 rounded-xl bg-amber-500 text-amber-950 font-bold hover:bg-amber-400 transition-colors flex items-center justify-center gap-2">
                                <Plus className="w-5 h-5" /> Nova anotação
                            </button>
                        )}

                        {loadingLivres ? (
                            <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 text-amber-500 animate-spin" /></div>
                        ) : livres.length === 0 && !editando ? (
                            <div className="text-center py-12 text-text-muted">
                                <Pencil className="w-10 h-10 mx-auto mb-3 opacity-40" />
                                <p className="text-sm">Nenhuma anotação ainda. Crie a primeira!</p>
                            </div>
                        ) : (
                            livres.map((a) => (
                                <div key={a.id} className="rounded-2xl border border-border-subtle bg-surface-1 p-4 group">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <h3 className="reading-serif font-semibold text-text-primary">{a.titulo || 'Sem título'}</h3>
                                        <div className="flex gap-1 shrink-0">
                                            <button onClick={() => abrirEdicao(a)} className="p-1.5 rounded-lg text-text-muted hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10" title="Editar">
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => remover(a.id)} className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-500/10" title="Excluir">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-sm text-text-secondary whitespace-pre-wrap">{a.texto}</p>
                                    <p className="text-[10px] text-text-muted uppercase tracking-wider mt-2">{formatarData(a.updated_at)}</p>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </CosmicBackground>
    );
}
