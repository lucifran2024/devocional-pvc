'use client';

// ===========================================
// DIÁRIO DE ORAÇÃO (/oracao) — reformulado em 03/10/2026 a pedido de
// Lucifran ("melhorar a função"). Antes era só uma lista de pedidos, nunca
// usada. Agora: "Orar agora" (um pedido por vez, começando pelo que está há
// mais tempo sem oração), categorias, quantas vezes orou, lista para mandar
// no grupo da célula, testemunho para compartilhar e sugestões para começar.
// ===========================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    HeartHandshake, Plus, Trash2, Loader2, Pencil, X, Check,
    CheckCircle2, Undo2, Share2, HandHeart,
} from 'lucide-react';
import { CosmicBackground } from '@/components/ui/CosmicBackground';
import { BackButton } from '@/components/ui/BackButton';
import {
    getPedidosOracao, criarPedidoOracao, atualizarPedidoOracao,
    marcarRespondido, voltarParaOrando, removerPedidoOracao, registrarOracao,
    CATEGORIAS_ORACAO, rotuloCategoria, diasOrando, quandoFoi, ordemParaOrar, textoListaOracao, textoTestemunho,
    type CategoriaOracao, type PedidoOracao,
} from '@/lib/oracao';

type Aba = 'orando' | 'respondido';

const SUGESTOES: { titulo: string; categoria: CategoriaOracao }[] = [
    { titulo: 'Minha família', categoria: 'familia' },
    { titulo: 'Os membros da célula', categoria: 'celula' },
    { titulo: 'A minha igreja', categoria: 'igreja' },
];

function formatarData(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
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

const campo = 'w-full rounded-xl bg-surface-0 border border-border-subtle px-3.5 py-2.5 text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-amber-500/60';
const botaoIcone = 'grid h-10 w-10 place-items-center rounded-lg text-text-muted hover:bg-surface-2 hover:text-text-primary transition-colors';

export default function OracaoPage() {
    const [aba, setAba] = useState<Aba>('orando');
    const [pedidos, setPedidos] = useState<PedidoOracao[]>([]);
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState<string | null>(null);

    // Formulário (novo / edição)
    const [editando, setEditando] = useState<number | 'novo' | null>(null);
    const [tituloEdit, setTituloEdit] = useState('');
    const [detalhesEdit, setDetalhesEdit] = useState('');
    const [categoriaEdit, setCategoriaEdit] = useState<CategoriaOracao | null>(null);
    const [salvando, setSalvando] = useState(false);

    // Marcar como respondido (testemunho) e apagar
    const [respondendoId, setRespondendoId] = useState<number | null>(null);
    const [respostaTexto, setRespostaTexto] = useState('');
    const [confirmandoApagar, setConfirmandoApagar] = useState<number | null>(null);

    // Orar agora: a fila do momento, a posição e quantos pedidos ele orou
    const [fila, setFila] = useState<PedidoOracao[] | null>(null);
    const [posicaoFila, setPosicaoFila] = useState(0);
    const [oradosAgora, setOradosAgora] = useState(0);

    const avisar = (msg: string) => {
        setFeedback(msg);
        setTimeout(() => setFeedback(null), 2200);
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

    const orando = useMemo(() => pedidos.filter(p => p.status === 'orando'), [pedidos]);
    const respondidos = useMemo(() => pedidos.filter(p => p.status === 'respondido'), [pedidos]);
    const lista = aba === 'orando' ? orando : respondidos;

    const abrirNovo = (sugestao?: { titulo: string; categoria: CategoriaOracao }) => {
        setEditando('novo');
        setTituloEdit(sugestao?.titulo || '');
        setDetalhesEdit('');
        setCategoriaEdit(sugestao?.categoria || null);
    };
    const abrirEdicao = (p: PedidoOracao) => {
        setEditando(p.id);
        setTituloEdit(p.titulo);
        setDetalhesEdit(p.detalhes || '');
        setCategoriaEdit((p.categoria as CategoriaOracao) || null);
    };

    const salvar = async () => {
        if (!tituloEdit.trim() || salvando) return;
        setSalvando(true);
        const ok = editando === 'novo'
            ? Boolean(await criarPedidoOracao(tituloEdit.trim(), detalhesEdit.trim(), categoriaEdit))
            : editando ? await atualizarPedidoOracao(editando, tituloEdit.trim(), detalhesEdit.trim(), categoriaEdit) : false;
        setSalvando(false);
        if (!ok) {
            avisar('Não foi possível salvar');
            return;
        }
        setEditando(null);
        setAba('orando');
        await carregar();
        avisar('Pedido salvo!');
    };

    const orei = async (p: PedidoOracao) => {
        const r = await registrarOracao(p);
        if (!r) {
            avisar('Não foi possível registrar agora');
            return false;
        }
        setPedidos(prev => prev.map(item => item.id === p.id ? { ...item, ...r } : item));
        return true;
    };

    const confirmarRespondido = async (id: number) => {
        await marcarRespondido(id, respostaTexto.trim());
        setRespondendoId(null);
        setRespostaTexto('');
        await carregar();
        avisar('Glória a Deus!');
    };

    const desfazerRespondido = async (id: number) => {
        await voltarParaOrando(id);
        await carregar();
        avisar('De volta à lista de oração');
    };

    const remover = async (id: number) => {
        setConfirmandoApagar(null);
        setPedidos(prev => prev.filter(p => p.id !== id));
        await removerPedidoOracao(id);
        avisar('Pedido apagado');
    };

    const compartilhar = async (texto: string) => {
        const r = await compartilharTexto(texto);
        if (r === 'copy') avisar('Copiado! É só colar no grupo.');
        else if (r === 'erro') avisar('Não foi possível compartilhar');
    };

    // ===== Orar agora =====
    const comecarOracao = () => {
        const ordem = ordemParaOrar(pedidos);
        if (!ordem.length) return;
        setFila(ordem);
        setPosicaoFila(0);
        setOradosAgora(0);
    };
    const fecharOracao = useCallback(() => setFila(null), []);
    const avancar = () => setPosicaoFila(i => i + 1);
    const oreiNaFila = async (p: PedidoOracao) => {
        if (await orei(p)) setOradosAgora(n => n + 1);
        avancar();
    };

    useEffect(() => {
        if (!fila) return;
        const fecharComEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') fecharOracao(); };
        window.addEventListener('keydown', fecharComEsc);
        return () => window.removeEventListener('keydown', fecharComEsc);
    }, [fila, fecharOracao]);

    const pedidoNaFila = fila && posicaoFila < fila.length
        ? pedidos.find(p => p.id === fila[posicaoFila].id) || fila[posicaoFila]
        : null;

    // ===== pedaços da tela =====

    const formulario = (
        <div className="rounded-2xl border border-amber-500/40 bg-surface-1 p-4 space-y-3">
            <input
                value={tituloEdit}
                onChange={(e) => setTituloEdit(e.target.value)}
                placeholder="Pelo que você quer orar?"
                aria-label="Pedido de oração"
                autoFocus
                className={`${campo} font-semibold`}
            />
            <textarea
                value={detalhesEdit}
                onChange={(e) => setDetalhesEdit(e.target.value)}
                placeholder="Detalhes (opcional): nomes, a situação, o que você pede…"
                aria-label="Detalhes do pedido"
                rows={3}
                className={`${campo} leading-relaxed resize-y`}
            />
            <div role="group" aria-label="Categoria" className="flex flex-wrap gap-2">
                {CATEGORIAS_ORACAO.map(c => (
                    <button
                        key={c.id}
                        type="button"
                        onClick={() => setCategoriaEdit(atual => atual === c.id ? null : c.id)}
                        aria-pressed={categoriaEdit === c.id}
                        className={`min-h-10 rounded-full px-3.5 text-sm font-semibold transition-colors ${categoriaEdit === c.id
                            ? 'bg-text-primary text-surface-0'
                            : 'border border-border-subtle text-text-secondary hover:text-text-primary'}`}
                    >
                        {c.rotulo}
                    </button>
                ))}
            </div>
            <div className="flex gap-2 justify-end">
                <button onClick={() => setEditando(null)} className="min-h-11 px-4 rounded-xl text-sm font-semibold text-text-muted hover:text-text-primary flex items-center gap-1.5">
                    <X className="w-4 h-4" /> Cancelar
                </button>
                <button onClick={salvar} disabled={!tituloEdit.trim() || salvando}
                    className="min-h-11 px-5 rounded-xl bg-amber-500 text-amber-950 text-sm font-bold hover:bg-amber-400 disabled:opacity-50 flex items-center gap-1.5">
                    {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Salvar
                </button>
            </div>
        </div>
    );

    const confirmacaoApagar = (id: number) => (
        <div role="alertdialog" aria-label="Apagar este pedido?" className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2.5">
            <p className="text-sm font-medium text-text-primary">Apagar este pedido?</p>
            <div className="flex gap-2">
                <button onClick={() => setConfirmandoApagar(null)} className="min-h-10 px-3 rounded-lg text-sm font-semibold text-text-muted hover:text-text-primary">Cancelar</button>
                <button onClick={() => remover(id)} className="min-h-10 px-3 rounded-lg bg-red-500 text-white text-sm font-bold hover:bg-red-400">Apagar</button>
            </div>
        </div>
    );

    const cartao = (p: PedidoOracao) => {
        if (editando === p.id) return formulario;
        const dias = diasOrando(p);
        const respondido = p.status === 'respondido';
        return (
            <article className={`rounded-2xl border p-4 ${respondido ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border-subtle bg-surface-1'}`}>
                <div className="flex items-start gap-2">
                    {respondido && <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />}
                    <h3 className="reading-serif text-lg font-semibold leading-snug text-text-primary">{p.titulo}</h3>
                </div>
                <p className="mt-1 text-xs text-text-muted">
                    {[
                        rotuloCategoria(p.categoria),
                        respondido
                            ? `respondido em ${formatarData(p.respondido_em!)}${dias > 0 ? `, depois de ${dias} ${dias === 1 ? 'dia' : 'dias'}` : ''}`
                            : dias === 0 ? 'pedido de hoje' : `orando há ${dias} ${dias === 1 ? 'dia' : 'dias'}`,
                        p.vezes_orado > 0 && `você orou ${p.vezes_orado} ${p.vezes_orado === 1 ? 'vez' : 'vezes'}`,
                        !respondido && p.ultima_oracao_em && `última ${quandoFoi(p.ultima_oracao_em)}`,
                    ].filter(Boolean).join(' · ')}
                </p>
                {p.detalhes && (
                    <p className="mt-2 text-sm leading-relaxed text-text-secondary whitespace-pre-wrap">{p.detalhes}</p>
                )}
                {respondido && p.resposta && (
                    <div className="mt-3 border-l-2 border-emerald-500/60 pl-3">
                        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Como Deus respondeu</p>
                        <p className="mt-0.5 text-sm leading-relaxed text-text-primary whitespace-pre-wrap">{p.resposta}</p>
                    </div>
                )}

                {respondendoId === p.id ? (
                    <div className="mt-3">
                        <textarea
                            value={respostaTexto}
                            onChange={e => setRespostaTexto(e.target.value)}
                            placeholder="Como Deus respondeu? (opcional, mas vale guardar o testemunho)"
                            aria-label="Como Deus respondeu"
                            rows={3}
                            autoFocus
                            className={`${campo} resize-y`}
                        />
                        <div className="flex justify-end gap-2 mt-2">
                            <button onClick={() => setRespondendoId(null)} className="min-h-10 px-3 rounded-lg text-sm font-semibold text-text-muted hover:text-text-primary">Cancelar</button>
                            <button onClick={() => confirmarRespondido(p.id)}
                                className="min-h-10 px-4 rounded-lg bg-emerald-500 text-emerald-950 text-sm font-bold hover:bg-emerald-400">
                                Confirmar resposta
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="mt-3 flex items-center justify-between gap-2">
                        {respondido ? (
                            <button onClick={() => compartilhar(textoTestemunho(p))} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 -ml-2 text-sm font-semibold text-text-secondary hover:text-emerald-700 dark:hover:text-emerald-400">
                                <Share2 className="w-4 h-4" aria-hidden="true" /> Compartilhar testemunho
                            </button>
                        ) : (
                            <button
                                onClick={async () => { if (await orei(p)) avisar('Oração registrada'); }}
                                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 -ml-2 text-sm font-semibold text-text-secondary hover:text-amber-700 dark:hover:text-amber-400"
                            >
                                <HandHeart className="w-4 h-4" aria-hidden="true" /> Orei por isso
                            </button>
                        )}
                        <div className="flex items-center gap-0.5">
                            {respondido ? (
                                <button onClick={() => desfazerRespondido(p.id)} aria-label="Voltar para orando" title="Voltar para orando" className={botaoIcone}>
                                    <Undo2 className="w-4 h-4" />
                                </button>
                            ) : (
                                <>
                                    <button onClick={() => { setRespondendoId(p.id); setRespostaTexto(''); }} aria-label="Deus respondeu" title="Deus respondeu" className={`${botaoIcone} hover:text-emerald-600 dark:hover:text-emerald-400`}>
                                        <CheckCircle2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => abrirEdicao(p)} aria-label="Editar pedido" title="Editar pedido" className={botaoIcone}>
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                </>
                            )}
                            <button onClick={() => setConfirmandoApagar(p.id)} aria-label="Apagar pedido" title="Apagar pedido" className="grid h-10 w-10 place-items-center rounded-lg text-text-muted hover:bg-red-500/10 hover:text-red-500 transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
                {confirmandoApagar === p.id && confirmacaoApagar(p.id)}
            </article>
        );
    };

    const painelOrarAgora = fila && createPortal(
        <div role="dialog" aria-modal="true" aria-label="Orar agora" className="fixed inset-0 z-[70] flex flex-col bg-surface-0 animate-in fade-in duration-200">
            <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-text-muted font-semibold">Orar agora</p>
                    <p className="font-bold text-text-primary">
                        {pedidoNaFila ? `${posicaoFila + 1} de ${fila.length}` : 'Terminou'}
                    </p>
                </div>
                <button onClick={fecharOracao} aria-label="Fechar" className="p-2.5 -mr-1 rounded-full text-text-muted hover:bg-surface-2 hover:text-text-primary">
                    <X className="w-5 h-5" />
                </button>
            </div>
            <div className="h-1 bg-border-subtle/60" aria-hidden="true">
                <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${Math.round((Math.min(posicaoFila, fila.length) / fila.length) * 100)}%` }} />
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-8">
                <div className="mx-auto w-full max-w-xl">
                    {pedidoNaFila ? (
                        <>
                            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">{rotuloCategoria(pedidoNaFila.categoria)}</p>
                            <h2 className="reading-serif mt-2 text-3xl font-semibold leading-tight text-text-primary">{pedidoNaFila.titulo}</h2>
                            {pedidoNaFila.detalhes && (
                                <p className="mt-4 text-lg leading-relaxed text-text-secondary whitespace-pre-wrap">{pedidoNaFila.detalhes}</p>
                            )}
                            <p className="mt-6 text-sm text-text-muted">
                                {[
                                    diasOrando(pedidoNaFila) === 0 ? 'Pedido de hoje' : `Orando há ${diasOrando(pedidoNaFila)} ${diasOrando(pedidoNaFila) === 1 ? 'dia' : 'dias'}`,
                                    pedidoNaFila.vezes_orado > 0 && `você já orou ${pedidoNaFila.vezes_orado} ${pedidoNaFila.vezes_orado === 1 ? 'vez' : 'vezes'}`,
                                ].filter(Boolean).join(' · ')}
                            </p>
                        </>
                    ) : (
                        <div className="text-center pt-10">
                            <HeartHandshake className="mx-auto w-10 h-10 text-amber-500" aria-hidden="true" />
                            <h2 className="reading-serif mt-4 text-2xl font-semibold text-text-primary">
                                {oradosAgora === 0 ? 'Até a próxima' : `Você orou por ${oradosAgora} ${oradosAgora === 1 ? 'pedido' : 'pedidos'}`}
                            </h2>
                            <p className="mt-2 text-text-secondary">&ldquo;Entreguem todas as suas preocupações a Deus, pois ele cuida de vocês.&rdquo; (1 Pedro 5:7, NTLH)</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="border-t border-border-subtle px-4 py-3" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
                <div className="mx-auto flex w-full max-w-xl gap-2">
                    {pedidoNaFila ? (
                        <>
                            <button onClick={avancar} className="min-h-12 px-5 rounded-xl border border-border-subtle text-text-secondary font-semibold hover:text-text-primary">
                                Pular
                            </button>
                            <button onClick={() => oreiNaFila(pedidoNaFila)} className="flex-1 min-h-12 rounded-xl bg-amber-500 text-amber-950 font-bold hover:bg-amber-400 flex items-center justify-center gap-2">
                                <HandHeart className="w-5 h-5" aria-hidden="true" /> Orei por isso
                            </button>
                        </>
                    ) : (
                        <button onClick={fecharOracao} className="flex-1 min-h-12 rounded-xl bg-amber-500 text-amber-950 font-bold hover:bg-amber-400">
                            Concluir
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );

    return (
        <CosmicBackground className="flex flex-col min-h-screen px-4 sm:px-6 py-8 selection:bg-amber-500/30">
            <div className="max-w-3xl mx-auto w-full space-y-5">
                <BackButton href="/" label="Início" />

                <div className="space-y-1.5">
                    <h1 className="reading-serif text-3xl md:text-4xl font-semibold text-text-primary">Diário de Oração</h1>
                    <p className="text-text-muted text-sm">Seus pedidos, o tempo com Deus e as respostas dele.</p>
                </div>

                {/* Aviso flutuante */}
                {feedback && (
                    <div role="status" className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-surface-1 border border-amber-500/30 text-sm font-semibold text-text-primary shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
                        {feedback}
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 text-amber-500 animate-spin" /></div>
                ) : pedidos.length === 0 && editando === null ? (
                    // Primeiro uso: um começo simples, com sugestões
                    <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
                        <HeartHandshake className="w-7 h-7 text-amber-500" aria-hidden="true" />
                        <h2 className="mt-3 text-lg font-semibold text-text-primary">Comece com um pedido</h2>
                        <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                            Anote por quem e pelo que você ora. Depois, em &ldquo;Orar agora&rdquo;, o app mostra um pedido por vez, e você vê há quanto tempo ora e como Deus respondeu.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {SUGESTOES.map(s => (
                                <button key={s.titulo} onClick={() => abrirNovo(s)} className="min-h-10 rounded-full border border-border-subtle px-3.5 text-sm font-semibold text-text-secondary hover:border-amber-500/40 hover:text-text-primary">
                                    {s.titulo}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => abrirNovo()} className="mt-4 w-full min-h-12 rounded-xl bg-amber-500 text-amber-950 font-bold hover:bg-amber-400 flex items-center justify-center gap-2">
                            <Plus className="w-5 h-5" /> Novo pedido
                        </button>
                    </div>
                ) : (
                    <>
                        {editando === 'novo' ? formulario : (
                            <div className="space-y-2">
                                {orando.length > 0 && (
                                    <button onClick={comecarOracao} className="w-full min-h-12 rounded-xl bg-amber-500 text-amber-950 font-bold hover:bg-amber-400 flex items-center justify-center gap-2">
                                        <HandHeart className="w-5 h-5" aria-hidden="true" />
                                        Orar agora · {orando.length} {orando.length === 1 ? 'pedido' : 'pedidos'}
                                    </button>
                                )}
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => abrirNovo()} className="min-h-11 rounded-xl border border-border-subtle text-sm font-semibold text-text-primary hover:border-amber-500/40 flex items-center justify-center gap-1.5">
                                        <Plus className="w-4 h-4" /> Novo pedido
                                    </button>
                                    <button
                                        onClick={() => compartilhar(textoListaOracao(pedidos))}
                                        disabled={orando.length === 0}
                                        className="min-h-11 rounded-xl border border-border-subtle text-sm font-semibold text-text-primary hover:border-amber-500/40 disabled:opacity-40 flex items-center justify-center gap-1.5"
                                    >
                                        <Share2 className="w-4 h-4" /> Compartilhar lista
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Abas */}
                        <div role="tablist" aria-label="Pedidos" className="flex bg-surface-2 rounded-xl p-1 w-full">
                            {([['orando', 'Orando', orando.length], ['respondido', 'Respondidos', respondidos.length]] as const).map(([id, label, count]) => (
                                <button
                                    key={id}
                                    role="tab"
                                    aria-selected={aba === id}
                                    onClick={() => setAba(id)}
                                    className={`flex-1 min-h-10 rounded-lg text-sm font-bold transition-colors ${aba === id
                                        ? 'bg-surface-0 text-text-primary shadow-sm'
                                        : 'text-text-muted hover:text-text-primary'}`}
                                >
                                    {label} {count > 0 && <span className="text-text-muted font-semibold">{count}</span>}
                                </button>
                            ))}
                        </div>

                        {lista.length === 0 ? (
                            <p className="py-8 text-center text-sm text-text-muted">
                                {aba === 'orando'
                                    ? 'Nenhum pedido em oração agora.'
                                    : 'Quando Deus responder um pedido, toque no sinal de resposta: ele aparece aqui como testemunho.'}
                            </p>
                        ) : (
                            <ul className="space-y-3">
                                {lista.map(p => <li key={p.id}>{cartao(p)}</li>)}
                            </ul>
                        )}
                    </>
                )}
            </div>
            {painelOrarAgora}
        </CosmicBackground>
    );
}
