'use client';

import { useState, useEffect, useCallback } from 'react';
import { StickyNote, Plus, Trash2, Loader2, Pencil, X, Check, Copy, Share2, NotebookPen } from 'lucide-react';
import { CosmicBackground } from '@/components/ui/CosmicBackground';
import { BackButton } from '@/components/ui/BackButton';
import {
    getAllInteracoesPorTipo, atualizarNotaBiblia, removerInteracaoBiblia,
    type BibliaInteracao,
} from '@/lib/supabase';
import {
    getAnotacoesLivres, criarAnotacaoLivre, atualizarAnotacaoLivre, removerAnotacaoLivre,
    type AnotacaoLivre,
} from '@/lib/anotacoes';

type Aba = 'biblia' | 'caderno';

function formatarDataRelativa(iso: string): string {
    const d = new Date(iso);
    const dias = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (dias <= 0) return 'hoje';
    if (dias === 1) return 'ontem';
    if (dias < 30) return `${dias}d atrás`;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

async function compartilharTexto(texto: string): Promise<'share' | 'copy' | 'erro'> {
    try {
        if (typeof navigator !== 'undefined' && navigator.share) {
            await navigator.share({ text: texto });
            return 'share';
        }
        await navigator.clipboard.writeText(texto);
        return 'copy';
    } catch {
        return 'erro';
    }
}

export default function AnotacoesPage() {
    const [aba, setAba] = useState<Aba>('biblia');
    const [feedback, setFeedback] = useState<string | null>(null);

    // Notas da Bíblia
    const [notas, setNotas] = useState<BibliaInteracao[]>([]);
    const [loadingNotas, setLoadingNotas] = useState(true);
    const [notaEditId, setNotaEditId] = useState<number | null>(null);
    const [notaEditTexto, setNotaEditTexto] = useState('');

    // Caderno (anotações livres)
    const [livres, setLivres] = useState<AnotacaoLivre[]>([]);
    const [loadingLivres, setLoadingLivres] = useState(true);
    const [editando, setEditando] = useState<string | 'nova' | null>(null);
    const [tituloEdit, setTituloEdit] = useState('');
    const [textoEdit, setTextoEdit] = useState('');
    const [salvando, setSalvando] = useState(false);

    const avisar = (msg: string) => {
        setFeedback(msg);
        setTimeout(() => setFeedback(null), 2000);
    };

    const carregarNotas = useCallback(async () => {
        setLoadingNotas(true);
        const nts = await getAllInteracoesPorTipo('nota', 300);
        setNotas(nts.filter((n: BibliaInteracao) => n.nota));
        setLoadingNotas(false);
    }, []);

    const carregarLivres = useCallback(async () => {
        setLoadingLivres(true);
        setLivres(await getAnotacoesLivres());
        setLoadingLivres(false);
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- carga assíncrona (setState após await)
        carregarNotas();
        // eslint-disable-next-line react-hooks/set-state-in-effect -- carga assíncrona (setState após await)
        carregarLivres();
    }, [carregarNotas, carregarLivres]);

    // ===== ações: notas da Bíblia =====
    const textoNotaBiblia = (n: BibliaInteracao) =>
        `"${n.texto_versiculo}" — ${n.livro_nome} ${n.capitulo}:${n.versiculo}\n\n📝 ${n.nota}`;

    const copiarNota = async (n: BibliaInteracao) => {
        try {
            await navigator.clipboard.writeText(textoNotaBiblia(n));
            avisar('Copiado!');
        } catch { avisar('Não foi possível copiar'); }
    };

    const compartilharNota = async (n: BibliaInteracao) => {
        const r = await compartilharTexto(textoNotaBiblia(n));
        if (r === 'copy') avisar('Copiado para compartilhar!');
        else if (r === 'erro') avisar('Não foi possível compartilhar');
    };

    const salvarEdicaoNota = async (n: BibliaInteracao) => {
        if (!n.id || !notaEditTexto.trim()) return;
        await atualizarNotaBiblia(n.id, notaEditTexto.trim());
        setNotas(prev => prev.map(item => item.id === n.id ? { ...item, nota: notaEditTexto.trim() } : item));
        setNotaEditId(null);
        setNotaEditTexto('');
        avisar('Nota atualizada!');
    };

    const apagarNota = async (id: number) => {
        setNotas(prev => prev.filter(n => n.id !== id));
        await removerInteracaoBiblia(id);
        avisar('Nota removida');
    };

    // ===== ações: caderno =====
    const textoLivre = (a: AnotacaoLivre) => `${a.titulo ? a.titulo + '\n\n' : ''}${a.texto}`;

    const copiarLivre = async (a: AnotacaoLivre) => {
        try {
            await navigator.clipboard.writeText(textoLivre(a));
            avisar('Copiado!');
        } catch { avisar('Não foi possível copiar'); }
    };

    const compartilharLivre = async (a: AnotacaoLivre) => {
        const r = await compartilharTexto(textoLivre(a));
        if (r === 'copy') avisar('Copiado para compartilhar!');
        else if (r === 'erro') avisar('Não foi possível compartilhar');
    };

    const abrirNova = () => { setEditando('nova'); setTituloEdit(''); setTextoEdit(''); };
    const abrirEdicao = (a: AnotacaoLivre) => { setEditando(a.id); setTituloEdit(a.titulo || ''); setTextoEdit(a.texto); };

    const salvarLivre = async () => {
        if (!textoEdit.trim() || salvando) return;
        setSalvando(true);
        if (editando === 'nova') await criarAnotacaoLivre(tituloEdit.trim(), textoEdit.trim());
        else if (editando) await atualizarAnotacaoLivre(editando, tituloEdit.trim(), textoEdit.trim());
        setEditando(null);
        await carregarLivres();
        setSalvando(false);
        avisar('Salvo!');
    };

    const removerLivre = async (id: string) => {
        setLivres(prev => prev.filter(a => a.id !== id));
        await removerAnotacaoLivre(id);
        avisar('Anotação removida');
    };

    const botaoAcao = 'p-2 rounded-lg text-slate-300 dark:text-text-muted hover:bg-amber-50 dark:hover:bg-amber-500/15 hover:text-amber-600 dark:hover:text-amber-400 transition-all';

    return (
        <CosmicBackground className="flex flex-col min-h-screen px-4 sm:px-6 py-8 selection:bg-amber-500/30">
            <div className="max-w-3xl mx-auto w-full space-y-6">
                <BackButton href="/" label="Início" />

                <div className="text-center space-y-2">
                    <h1 className="reading-serif text-3xl md:text-4xl font-semibold text-text-primary">
                        Minhas Anotações
                    </h1>
                    <p className="text-text-muted text-sm">Suas notas da Bíblia e seu caderno pessoal.</p>
                </div>

                {/* Abas */}
                <div className="flex bg-surface-2 rounded-xl p-1 max-w-sm mx-auto w-full">
                    {([['biblia', 'Notas da Bíblia', notas.length], ['caderno', 'Caderno', livres.length]] as const).map(([id, label, count]) => (
                        <button
                            key={id}
                            onClick={() => setAba(id)}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${aba === id
                                ? 'bg-amber-500 text-amber-950 shadow-md'
                                : 'text-text-muted hover:text-text-primary'
                                }`}
                        >
                            {label}
                            {count > 0 && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${aba === id ? 'bg-amber-950/15' : 'bg-surface-1'}`}>{count}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Feedback flutuante */}
                {feedback && (
                    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-surface-1 border border-amber-500/30 text-sm font-semibold text-text-primary shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
                        {feedback}
                    </div>
                )}

                {/* ===== NOTAS DA BÍBLIA ===== */}
                {aba === 'biblia' && (
                    <div className="space-y-2.5">
                        {loadingNotas ? (
                            <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 text-amber-500 animate-spin" /></div>
                        ) : notas.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center">
                                    <StickyNote className="w-7 h-7 text-amber-400" />
                                </div>
                                <div>
                                    <p className="text-text-primary font-semibold text-sm">Nenhuma nota ainda</p>
                                    <p className="text-text-muted text-xs mt-1 max-w-[240px] mx-auto leading-relaxed">
                                        Durante a leitura da Bíblia, toque num versículo e escolha o ícone de nota para anotá-lo aqui.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            notas.map((n) => (
                                <div key={n.id} className="p-4 rounded-xl bg-slate-50 dark:bg-surface-2 border border-slate-100 dark:border-transparent group">
                                    <div className="flex items-start gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <div className="text-amber-600 dark:text-amber-400 text-sm font-bold">{n.livro_nome} {n.capitulo}:{n.versiculo}</div>
                                                {n.created_at && (
                                                    <span className="text-[10px] font-semibold text-slate-400 dark:text-text-muted bg-slate-100 dark:bg-surface-1 px-1.5 py-0.5 rounded-full" title={new Date(n.created_at).toLocaleString('pt-BR')}>
                                                        {formatarDataRelativa(n.created_at)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-slate-800 dark:text-text-primary text-[15px] mt-1.5 leading-[1.8] reading-serif">{n.texto_versiculo}</div>
                                        </div>
                                        <div className="flex items-center gap-0.5 shrink-0">
                                            <button onClick={() => copiarNota(n)} className={botaoAcao} title="Copiar versículo + nota">
                                                <Copy className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => compartilharNota(n)} className={botaoAcao} title="Compartilhar">
                                                <Share2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => { if (notaEditId === n.id) { setNotaEditId(null); } else { setNotaEditId(n.id!); setNotaEditTexto(n.nota || ''); } }}
                                                className={`p-2 rounded-lg transition-all ${notaEditId === n.id ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400' : botaoAcao.replace('p-2 rounded-lg ', '')}`}
                                                title="Editar nota"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => apagarNota(n.id!)} className="p-2 rounded-lg text-slate-300 dark:text-text-muted hover:bg-red-50 dark:hover:bg-red-500/20 hover:text-red-500 transition-all" title="Apagar">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {notaEditId !== n.id ? (
                                        <div className="text-slate-600 dark:text-text-secondary text-sm mt-2 bg-slate-100 dark:bg-surface-1 rounded-lg px-3 py-2 border-l-2 border-amber-400/60 whitespace-pre-wrap">
                                            {n.nota}
                                        </div>
                                    ) : (
                                        <div className="mt-3 animate-in fade-in slide-in-from-top-1 duration-150">
                                            <textarea
                                                value={notaEditTexto}
                                                onChange={e => setNotaEditTexto(e.target.value)}
                                                rows={3}
                                                autoFocus
                                                className="w-full bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-subtle rounded-xl px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-amber-400 dark:focus:border-amber-500/50 resize-none"
                                            />
                                            <div className="flex justify-end gap-2 mt-2">
                                                <button onClick={() => setNotaEditId(null)} className="px-3 py-1.5 text-xs rounded-lg text-text-muted hover:bg-surface-2 font-medium">Cancelar</button>
                                                <button onClick={() => salvarEdicaoNota(n)} disabled={!notaEditTexto.trim()}
                                                    className="px-3 py-1.5 text-xs rounded-lg bg-amber-500 text-amber-950 font-bold hover:bg-amber-400 disabled:opacity-40">
                                                    Salvar
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* ===== CADERNO ===== */}
                {aba === 'caderno' && (
                    <div className="space-y-2.5">
                        {editando ? (
                            <div className="rounded-xl border border-amber-500/30 bg-slate-50 dark:bg-surface-2 p-4 space-y-3">
                                <input
                                    value={tituloEdit}
                                    onChange={(e) => setTituloEdit(e.target.value)}
                                    placeholder="Título (opcional)"
                                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-subtle text-text-primary text-sm font-semibold focus:outline-none focus:border-amber-400 dark:focus:border-amber-500/50"
                                />
                                <textarea
                                    value={textoEdit}
                                    onChange={(e) => setTextoEdit(e.target.value)}
                                    placeholder="Escreva sua anotação..."
                                    rows={6}
                                    autoFocus
                                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-subtle text-text-primary text-sm leading-relaxed resize-y focus:outline-none focus:border-amber-400 dark:focus:border-amber-500/50"
                                />
                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => setEditando(null)} className="px-4 py-2 rounded-lg text-sm font-semibold text-text-muted hover:text-text-primary flex items-center gap-1.5">
                                        <X className="w-4 h-4" /> Cancelar
                                    </button>
                                    <button onClick={salvarLivre} disabled={!textoEdit.trim() || salvando}
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
                            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center">
                                    <NotebookPen className="w-7 h-7 text-amber-400" />
                                </div>
                                <div>
                                    <p className="text-text-primary font-semibold text-sm">Caderno vazio</p>
                                    <p className="text-text-muted text-xs mt-1">Crie sua primeira anotação livre.</p>
                                </div>
                            </div>
                        ) : (
                            livres.map((a) => (
                                <div key={a.id} className="p-4 rounded-xl bg-slate-50 dark:bg-surface-2 border border-slate-100 dark:border-transparent group">
                                    <div className="flex items-start gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="reading-serif font-semibold text-text-primary">{a.titulo || 'Sem título'}</h3>
                                                <span className="text-[10px] font-semibold text-slate-400 dark:text-text-muted bg-slate-100 dark:bg-surface-1 px-1.5 py-0.5 rounded-full" title={new Date(a.updated_at).toLocaleString('pt-BR')}>
                                                    {formatarDataRelativa(a.updated_at)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-text-secondary whitespace-pre-wrap mt-1.5 leading-relaxed">{a.texto}</p>
                                        </div>
                                        <div className="flex items-center gap-0.5 shrink-0">
                                            <button onClick={() => copiarLivre(a)} className={botaoAcao} title="Copiar">
                                                <Copy className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => compartilharLivre(a)} className={botaoAcao} title="Compartilhar">
                                                <Share2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => abrirEdicao(a)} className={botaoAcao} title="Editar">
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => removerLivre(a.id)} className="p-2 rounded-lg text-slate-300 dark:text-text-muted hover:bg-red-50 dark:hover:bg-red-500/20 hover:text-red-500 transition-all" title="Apagar">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </CosmicBackground>
    );
}
