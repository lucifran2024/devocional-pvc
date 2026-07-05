'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    HeartHandshake, Plus, Trash2, Loader2, Pencil, X, Check,
    CheckCircle2, Undo2, Sparkles,
} from 'lucide-react';
import { CosmicBackground } from '@/components/ui/CosmicBackground';
import { BackButton } from '@/components/ui/BackButton';
import {
    getPedidosOracao, criarPedidoOracao, atualizarPedidoOracao,
    marcarRespondido, voltarParaOrando, removerPedidoOracao,
    type PedidoOracao,
} from '@/lib/oracao';

type Aba = 'orando' | 'respondido';

function formatarData(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function diasOrando(p: PedidoOracao): number {
    const fim = p.respondido_em ? new Date(p.respondido_em) : new Date();
    return Math.max(0, Math.floor((fim.getTime() - new Date(p.created_at).getTime()) / 86400000));
}

export default function OracaoPage() {
    const [aba, setAba] = useState<Aba>('orando');
    const [pedidos, setPedidos] = useState<PedidoOracao[]>([]);
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState<string | null>(null);

    // Formulário (novo / edição)
    const [editando, setEditando] = useState<number | 'novo' | null>(null);
    const [tituloEdit, setTituloEdit] = useState('');
    const [detalhesEdit, setDetalhesEdit] = useState('');
    const [salvando, setSalvando] = useState(false);

    // Marcar como respondido (testemunho)
    const [respondendoId, setRespondendoId] = useState<number | null>(null);
    const [respostaTexto, setRespostaTexto] = useState('');

    const avisar = (msg: string) => {
        setFeedback(msg);
        setTimeout(() => setFeedback(null), 2000);
    };

    const carregar = useCallback(async () => {
        setLoading(true);
        setPedidos(await getPedidosOracao());
        setLoading(false);
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- carga assíncrona (setState após await)
        carregar();
    }, [carregar]);

    const orando = pedidos.filter(p => p.status === 'orando');
    const respondidos = pedidos.filter(p => p.status === 'respondido');
    const lista = aba === 'orando' ? orando : respondidos;

    const abrirNovo = () => { setEditando('novo'); setTituloEdit(''); setDetalhesEdit(''); };
    const abrirEdicao = (p: PedidoOracao) => { setEditando(p.id); setTituloEdit(p.titulo); setDetalhesEdit(p.detalhes || ''); };

    const salvar = async () => {
        if (!tituloEdit.trim() || salvando) return;
        setSalvando(true);
        if (editando === 'novo') await criarPedidoOracao(tituloEdit.trim(), detalhesEdit.trim());
        else if (editando) await atualizarPedidoOracao(editando, tituloEdit.trim(), detalhesEdit.trim());
        setEditando(null);
        await carregar();
        setSalvando(false);
        avisar('Pedido salvo!');
    };

    const confirmarRespondido = async (id: number) => {
        await marcarRespondido(id, respostaTexto.trim());
        setRespondendoId(null);
        setRespostaTexto('');
        await carregar();
        avisar('Glória a Deus! 🙌');
    };

    const desfazerRespondido = async (id: number) => {
        await voltarParaOrando(id);
        await carregar();
        avisar('De volta à lista de oração');
    };

    const remover = async (id: number) => {
        setPedidos(prev => prev.filter(p => p.id !== id));
        await removerPedidoOracao(id);
        avisar('Pedido removido');
    };

    return (
        <CosmicBackground className="flex flex-col min-h-screen px-4 sm:px-6 py-8 selection:bg-amber-500/30">
            <div className="max-w-3xl mx-auto w-full space-y-6">
                <BackButton href="/" label="Início" />

                <div className="text-center space-y-2">
                    <h1 className="reading-serif text-3xl md:text-4xl font-semibold text-text-primary">
                        Diário de Oração
                    </h1>
                    <p className="text-text-muted text-sm">Registre seus pedidos e celebre as respostas de Deus.</p>
                </div>

                {/* Abas */}
                <div className="flex bg-surface-2 rounded-xl p-1 max-w-sm mx-auto w-full">
                    {([['orando', 'Orando', orando.length], ['respondido', 'Respondidos', respondidos.length]] as const).map(([id, label, count]) => (
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

                {/* Formulário novo/edição */}
                {editando !== null ? (
                    <div className="rounded-xl border border-amber-500/30 bg-slate-50 dark:bg-surface-2 p-4 space-y-3">
                        <input
                            value={tituloEdit}
                            onChange={(e) => setTituloEdit(e.target.value)}
                            placeholder="Pelo que você está orando?"
                            autoFocus
                            className="w-full px-3 py-2 rounded-lg bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-subtle text-text-primary text-sm font-semibold focus:outline-none focus:border-amber-400 dark:focus:border-amber-500/50"
                        />
                        <textarea
                            value={detalhesEdit}
                            onChange={(e) => setDetalhesEdit(e.target.value)}
                            placeholder="Detalhes do pedido (opcional)..."
                            rows={4}
                            className="w-full px-3 py-2 rounded-lg bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-subtle text-text-primary text-sm leading-relaxed resize-y focus:outline-none focus:border-amber-400 dark:focus:border-amber-500/50"
                        />
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setEditando(null)} className="px-4 py-2 rounded-lg text-sm font-semibold text-text-muted hover:text-text-primary flex items-center gap-1.5">
                                <X className="w-4 h-4" /> Cancelar
                            </button>
                            <button onClick={salvar} disabled={!tituloEdit.trim() || salvando}
                                className="px-4 py-2 rounded-lg bg-amber-500 text-amber-950 text-sm font-bold hover:bg-amber-400 disabled:opacity-50 flex items-center gap-1.5">
                                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Salvar
                            </button>
                        </div>
                    </div>
                ) : aba === 'orando' && (
                    <button onClick={abrirNovo}
                        className="w-full py-3 rounded-xl bg-amber-500 text-amber-950 font-bold hover:bg-amber-400 transition-colors flex items-center justify-center gap-2">
                        <Plus className="w-5 h-5" /> Novo pedido de oração
                    </button>
                )}

                {/* Lista */}
                <div className="space-y-2.5">
                    {loading ? (
                        <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 text-amber-500 animate-spin" /></div>
                    ) : lista.length === 0 && editando === null ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center">
                                {aba === 'orando'
                                    ? <HeartHandshake className="w-7 h-7 text-amber-400" />
                                    : <Sparkles className="w-7 h-7 text-amber-400" />}
                            </div>
                            <div>
                                <p className="text-text-primary font-semibold text-sm">
                                    {aba === 'orando' ? 'Nenhum pedido ativo' : 'Nenhuma resposta registrada ainda'}
                                </p>
                                <p className="text-text-muted text-xs mt-1 max-w-[260px] mx-auto leading-relaxed">
                                    {aba === 'orando'
                                        ? 'Registre um pedido e acompanhe sua jornada de oração.'
                                        : 'Quando Deus responder um pedido, marque-o e ele aparece aqui como testemunho.'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        lista.map((p) => (
                            <div key={p.id} className={`p-4 rounded-xl border group ${p.status === 'respondido'
                                ? 'bg-emerald-50/60 dark:bg-emerald-500/5 border-emerald-200/60 dark:border-emerald-500/20'
                                : 'bg-slate-50 dark:bg-surface-2 border-slate-100 dark:border-transparent'}`}>
                                <div className="flex items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {p.status === 'respondido' && (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                            )}
                                            <h3 className="reading-serif font-semibold text-text-primary">{p.titulo}</h3>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap mt-1">
                                            <span className="text-[10px] font-semibold text-slate-400 dark:text-text-muted bg-slate-100 dark:bg-surface-1 px-1.5 py-0.5 rounded-full">
                                                desde {formatarData(p.created_at)}
                                            </span>
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${p.status === 'respondido'
                                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'}`}>
                                                {p.status === 'respondido'
                                                    ? `respondido em ${formatarData(p.respondido_em!)}`
                                                    : `${diasOrando(p)} ${diasOrando(p) === 1 ? 'dia' : 'dias'} orando`}
                                            </span>
                                        </div>
                                        {p.detalhes && (
                                            <p className="text-sm text-text-secondary whitespace-pre-wrap mt-2 leading-relaxed">{p.detalhes}</p>
                                        )}
                                        {p.status === 'respondido' && p.resposta && (
                                            <div className="text-sm text-emerald-700 dark:text-emerald-300 mt-2 bg-emerald-100/60 dark:bg-emerald-500/10 rounded-lg px-3 py-2 border-l-2 border-emerald-400/70 whitespace-pre-wrap">
                                                <span className="font-bold text-[11px] uppercase tracking-wider block mb-0.5 opacity-70">Como Deus respondeu</span>
                                                {p.resposta}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-0.5 shrink-0">
                                        {p.status === 'orando' ? (
                                            <>
                                                <button
                                                    onClick={() => { setRespondendoId(respondendoId === p.id ? null : p.id); setRespostaTexto(''); }}
                                                    className={`p-2 rounded-lg transition-all ${respondendoId === p.id
                                                        ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                                        : 'text-slate-300 dark:text-text-muted hover:bg-emerald-50 dark:hover:bg-emerald-500/15 hover:text-emerald-600 dark:hover:text-emerald-400'}`}
                                                    title="Marcar como respondido"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => abrirEdicao(p)} className="p-2 rounded-lg text-slate-300 dark:text-text-muted hover:bg-amber-50 dark:hover:bg-amber-500/15 hover:text-amber-600 dark:hover:text-amber-400 transition-all" title="Editar">
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                            </>
                                        ) : (
                                            <button onClick={() => desfazerRespondido(p.id)} className="p-2 rounded-lg text-slate-300 dark:text-text-muted hover:bg-amber-50 dark:hover:bg-amber-500/15 hover:text-amber-600 dark:hover:text-amber-400 transition-all" title="Voltar para orando">
                                                <Undo2 className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button onClick={() => remover(p.id)} className="p-2 rounded-lg text-slate-300 dark:text-text-muted hover:bg-red-50 dark:hover:bg-red-500/20 hover:text-red-500 transition-all" title="Apagar">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Formulário de testemunho ao marcar respondido */}
                                {respondendoId === p.id && (
                                    <div className="mt-3 animate-in fade-in slide-in-from-top-1 duration-150">
                                        <textarea
                                            value={respostaTexto}
                                            onChange={e => setRespostaTexto(e.target.value)}
                                            placeholder="Como Deus respondeu? (opcional, mas vale registrar o testemunho)"
                                            rows={3}
                                            autoFocus
                                            className="w-full bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-subtle rounded-xl px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-emerald-400 dark:focus:border-emerald-500/50 resize-none"
                                        />
                                        <div className="flex justify-end gap-2 mt-2">
                                            <button onClick={() => setRespondendoId(null)} className="px-3 py-1.5 text-xs rounded-lg text-text-muted hover:bg-surface-2 font-medium">Cancelar</button>
                                            <button onClick={() => confirmarRespondido(p.id)}
                                                className="px-3 py-1.5 text-xs rounded-lg bg-emerald-500 text-emerald-950 font-bold hover:bg-emerald-400 transition-colors">
                                                Confirmar resposta
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </CosmicBackground>
    );
}
