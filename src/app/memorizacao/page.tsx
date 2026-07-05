'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Brain, Plus, Trash2, Loader2, X, Eye, Check, XCircle,
    Heart, CalendarClock, Trophy,
} from 'lucide-react';
import { CosmicBackground } from '@/components/ui/CosmicBackground';
import { BackButton } from '@/components/ui/BackButton';
import { getAllInteracoesPorTipo, type BibliaInteracao } from '@/lib/supabase';
import {
    getVersiculosMemorizacao, adicionarVersiculoMemorizacao,
    registrarRevisao, removerVersiculoMemorizacao, estaVencido,
    NIVEL_MAX, INTERVALOS_DIAS,
    type VersiculoMemorizacao,
} from '@/lib/memorizacao';

// Percentual de palavras ocultadas em cada nível (fica mais difícil conforme decora)
const OCULTAR_POR_NIVEL = [0.3, 0.45, 0.6, 0.75, 0.9, 1];

/**
 * Oculta palavras de forma determinística (mesmo versículo → mesmas lacunas),
 * distribuídas ao longo do texto conforme o nível.
 */
function ocultarPalavras(texto: string, nivel: number): { palavra: string; oculta: boolean }[] {
    const fracao = OCULTAR_POR_NIVEL[Math.min(nivel, NIVEL_MAX)];
    const palavras = texto.split(/\s+/).filter(Boolean);
    if (fracao >= 1) return palavras.map(p => ({ palavra: p, oculta: true }));

    // Passo fixo: oculta 1 a cada N palavras, com offset pseudo-aleatório estável
    const total = palavras.length;
    const qtdOcultar = Math.max(1, Math.round(total * fracao));
    const passo = total / qtdOcultar;
    const indices = new Set<number>();
    for (let i = 0; i < qtdOcultar; i++) {
        indices.add(Math.min(total - 1, Math.floor(i * passo + passo / 2)));
    }
    return palavras.map((p, i) => ({ palavra: p, oculta: indices.has(i) }));
}

function NivelDots({ nivel }: { nivel: number }) {
    return (
        <span className="inline-flex items-center gap-0.5" title={`Nível ${nivel} de ${NIVEL_MAX} — revisões a cada ${INTERVALOS_DIAS[nivel]} ${INTERVALOS_DIAS[nivel] === 1 ? 'dia' : 'dias'}`}>
            {Array.from({ length: NIVEL_MAX + 1 }, (_, i) => (
                <span key={i} className={`w-1.5 h-1.5 rounded-full ${i <= nivel && nivel > 0 ? 'bg-amber-500' : 'bg-slate-200 dark:bg-surface-1'}`} />
            ))}
        </span>
    );
}

function formatarProximaRevisao(dataISO: string): string {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const alvo = new Date(dataISO + 'T00:00:00');
    const diff = Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
    if (diff <= 0) return 'hoje';
    if (diff === 1) return 'amanhã';
    return `em ${diff} dias`;
}

export default function MemorizacaoPage() {
    const [versiculos, setVersiculos] = useState<VersiculoMemorizacao[]>([]);
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState<string | null>(null);

    // Modal de adicionar (a partir dos favoritos)
    const [adicionarAberto, setAdicionarAberto] = useState(false);
    const [favoritos, setFavoritos] = useState<BibliaInteracao[]>([]);
    const [loadingFavoritos, setLoadingFavoritos] = useState(false);
    const [adicionandoId, setAdicionandoId] = useState<number | null>(null);

    // Modo praticar (flashcards dos vencidos)
    const [praticando, setPraticando] = useState(false);
    const [filaRevisao, setFilaRevisao] = useState<VersiculoMemorizacao[]>([]);
    const [indiceAtual, setIndiceAtual] = useState(0);
    const [revelado, setRevelado] = useState(false);
    const [acertosSessao, setAcertosSessao] = useState(0);

    const avisar = (msg: string) => {
        setFeedback(msg);
        setTimeout(() => setFeedback(null), 2000);
    };

    const carregar = useCallback(async () => {
        setLoading(true);
        setVersiculos(await getVersiculosMemorizacao());
        setLoading(false);
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- carga assíncrona (setState após await)
        carregar();
    }, [carregar]);

    const vencidos = versiculos.filter(estaVencido);
    const emDia = versiculos.filter(v => !estaVencido(v));

    // ===== adicionar dos favoritos =====
    const abrirAdicionar = async () => {
        setAdicionarAberto(true);
        setLoadingFavoritos(true);
        const favs = await getAllInteracoesPorTipo('favorito', 200);
        setFavoritos(favs);
        setLoadingFavoritos(false);
    };

    const jaAdicionado = (f: BibliaInteracao) => versiculos.some(v =>
        v.livro_abrev === f.livro_abrev && v.capitulo === f.capitulo && v.versiculo === f.versiculo
    );

    const adicionar = async (f: BibliaInteracao) => {
        setAdicionandoId(f.id!);
        const novo = await adicionarVersiculoMemorizacao({
            livro_abrev: f.livro_abrev,
            livro_nome: f.livro_nome,
            capitulo: f.capitulo,
            versiculo: f.versiculo,
            texto: f.texto_versiculo,
        });
        setAdicionandoId(null);
        if (novo) {
            setVersiculos(prev => [novo, ...prev]);
            avisar(`${f.livro_nome} ${f.capitulo}:${f.versiculo} adicionado!`);
        } else {
            avisar('Este versículo já está na memorização');
        }
    };

    const remover = async (id: number) => {
        setVersiculos(prev => prev.filter(v => v.id !== id));
        await removerVersiculoMemorizacao(id);
        avisar('Removido da memorização');
    };

    // ===== praticar =====
    const iniciarPratica = () => {
        const fila = vencidos.length > 0 ? vencidos : versiculos;
        if (fila.length === 0) return;
        setFilaRevisao(fila);
        setIndiceAtual(0);
        setRevelado(false);
        setAcertosSessao(0);
        setPraticando(true);
    };

    const versoAtual = filaRevisao[indiceAtual] || null;

    const palavrasOcultas = useMemo(
        () => versoAtual ? ocultarPalavras(versoAtual.texto, versoAtual.nivel) : [],
        [versoAtual]
    );

    const responder = async (acertou: boolean) => {
        if (!versoAtual) return;
        await registrarRevisao(versoAtual, acertou);
        if (acertou) setAcertosSessao(n => n + 1);

        if (indiceAtual + 1 < filaRevisao.length) {
            setIndiceAtual(i => i + 1);
            setRevelado(false);
        } else {
            setPraticando(false);
            await carregar();
            avisar(`Sessão concluída: ${acertosSessao + (acertou ? 1 : 0)}/${filaRevisao.length} 🎉`);
        }
    };

    return (
        <CosmicBackground className="flex flex-col min-h-screen px-4 sm:px-6 py-8 selection:bg-amber-500/30">
            <div className="max-w-3xl mx-auto w-full space-y-6">
                <BackButton href="/" label="Início" />

                <div className="text-center space-y-2">
                    <h1 className="reading-serif text-3xl md:text-4xl font-semibold text-text-primary">
                        Memorização
                    </h1>
                    <p className="text-text-muted text-sm">Guarde a Palavra no coração com revisão espaçada.</p>
                </div>

                {/* Feedback flutuante */}
                {feedback && (
                    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-surface-1 border border-amber-500/30 text-sm font-semibold text-text-primary shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
                        {feedback}
                    </div>
                )}

                {/* Ações principais */}
                {!loading && versiculos.length > 0 && (
                    <button
                        onClick={iniciarPratica}
                        className={`w-full py-4 rounded-2xl font-extrabold transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${vencidos.length > 0
                            ? 'bg-amber-500 text-amber-950 hover:bg-amber-400 shadow-lg shadow-amber-500/20'
                            : 'bg-surface-2 text-text-secondary hover:bg-surface-1 border border-border-subtle'}`}
                    >
                        <Brain className="w-5 h-5" />
                        {vencidos.length > 0
                            ? `Revisar agora (${vencidos.length} ${vencidos.length === 1 ? 'versículo' : 'versículos'})`
                            : 'Praticar mesmo assim'}
                    </button>
                )}

                <button onClick={abrirAdicionar}
                    className="w-full py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-semibold text-sm transition-colors flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Adicionar versículo dos favoritos
                </button>

                {/* Lista */}
                <div className="space-y-2.5">
                    {loading ? (
                        <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 text-amber-500 animate-spin" /></div>
                    ) : versiculos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center">
                                <Brain className="w-7 h-7 text-amber-400" />
                            </div>
                            <div>
                                <p className="text-text-primary font-semibold text-sm">Nenhum versículo ainda</p>
                                <p className="text-text-muted text-xs mt-1 max-w-[260px] mx-auto leading-relaxed">
                                    Favorite versículos na Bíblia (ícone de coração) e adicione-os aqui para memorizar.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {vencidos.length > 0 && (
                                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400 px-1">
                                    Para revisar · {vencidos.length}
                                </p>
                            )}
                            {vencidos.map(v => (
                                <CardVersiculo key={v.id} v={v} vencido remover={remover} />
                            ))}
                            {emDia.length > 0 && (
                                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-text-muted px-1 pt-2">
                                    Em dia · {emDia.length}
                                </p>
                            )}
                            {emDia.map(v => (
                                <CardVersiculo key={v.id} v={v} vencido={false} remover={remover} />
                            ))}
                        </>
                    )}
                </div>
            </div>

            {/* ===== MODAL ADICIONAR DOS FAVORITOS ===== */}
            {adicionarAberto && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-surface-1 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[80vh] flex flex-col overflow-hidden border border-slate-200 dark:border-border-subtle shadow-2xl">
                        <div className="p-4 border-b border-slate-200 dark:border-border-subtle flex items-center justify-between bg-slate-50 dark:bg-surface-2/50">
                            <div className="flex items-center gap-2">
                                <Heart className="w-5 h-5 text-amber-500" />
                                <span className="font-bold text-text-primary text-base">Seus favoritos</span>
                            </div>
                            <button onClick={() => setAdicionarAberto(false)} className="p-2 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {loadingFavoritos ? (
                                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-amber-500 animate-spin" /></div>
                            ) : favoritos.length === 0 ? (
                                <div className="text-center py-10 px-4">
                                    <Heart className="w-8 h-8 text-slate-300 dark:text-text-muted/40 mx-auto mb-3" />
                                    <p className="text-sm font-medium text-text-primary">Nenhum favorito ainda</p>
                                    <p className="text-xs text-text-muted mt-1">Toque no coração de um versículo durante a leitura da Bíblia para favoritá-lo.</p>
                                </div>
                            ) : (
                                favoritos.map(f => {
                                    const adicionado = jaAdicionado(f);
                                    return (
                                        <div key={f.id} className="p-3 rounded-xl bg-slate-50 dark:bg-surface-2 border border-slate-100 dark:border-transparent flex items-start gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="text-amber-600 dark:text-amber-400 text-sm font-bold">{f.livro_nome} {f.capitulo}:{f.versiculo}</div>
                                                <p className="text-text-secondary text-sm mt-1 leading-relaxed reading-serif line-clamp-3">{f.texto_versiculo}</p>
                                            </div>
                                            <button
                                                onClick={() => adicionar(f)}
                                                disabled={adicionado || adicionandoId === f.id}
                                                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${adicionado
                                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 cursor-default'
                                                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25'}`}
                                            >
                                                {adicionandoId === f.id
                                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    : adicionado
                                                        ? <><Check className="w-3.5 h-3.5" /> Na lista</>
                                                        : <><Plus className="w-3.5 h-3.5" /> Adicionar</>}
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ===== MODO PRATICAR (FLASHCARD) ===== */}
            {praticando && versoAtual && (
                <div className="fixed inset-0 z-[120] flex flex-col bg-white dark:bg-surface-0/98 backdrop-blur-xl animate-in fade-in duration-200" style={{ height: '100dvh' }}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-border-subtle shrink-0">
                        <button onClick={() => { setPraticando(false); carregar(); }} className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-sm font-medium">
                            <X className="w-5 h-5" />
                            <span className="hidden sm:inline">Sair</span>
                        </button>
                        <span className="text-sm font-bold text-text-primary tabular-nums">
                            {indiceAtual + 1} de {filaRevisao.length}
                        </span>
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-500 tabular-nums">
                            <Trophy className="w-3.5 h-3.5" /> {acertosSessao}
                        </span>
                    </div>

                    {/* Barra de progresso da sessão */}
                    <div className="h-1 bg-slate-100 dark:bg-white/5 shrink-0">
                        <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${((indiceAtual + (revelado ? 0.5 : 0)) / filaRevisao.length) * 100}%` }} />
                    </div>

                    {/* Cartão */}
                    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center px-6 py-8">
                        <div className="w-full max-w-xl text-center space-y-6">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25">
                                <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
                                    {versoAtual.livro_nome} {versoAtual.capitulo}:{versoAtual.versiculo}
                                </span>
                                <NivelDots nivel={versoAtual.nivel} />
                            </div>

                            <p className="reading-serif text-xl md:text-2xl leading-[1.9] text-text-primary">
                                {revelado
                                    ? versoAtual.texto
                                    : palavrasOcultas.map((p, i) => (
                                        <span key={i}>
                                            {p.oculta
                                                ? <span className="inline-block align-baseline border-b-2 border-amber-400/60 text-transparent select-none" aria-hidden>{' '.repeat(Math.max(3, Math.min(p.palavra.length, 12)))}</span>
                                                : p.palavra}
                                            {' '}
                                        </span>
                                    ))}
                            </p>

                            <p className="text-xs text-text-muted">
                                {revelado ? 'Você lembrou do versículo completo?' : 'Tente recitar em voz alta preenchendo as lacunas.'}
                            </p>
                        </div>
                    </div>

                    {/* Ações */}
                    <div className="shrink-0 px-6 pt-3 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] border-t border-slate-200 dark:border-border-subtle bg-white/95 dark:bg-surface-1/95 backdrop-blur-xl">
                        {!revelado ? (
                            <button
                                onClick={() => setRevelado(true)}
                                className="w-full max-w-xl mx-auto flex items-center justify-center gap-2 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-extrabold text-base transition-all active:scale-[0.98] shadow-lg shadow-amber-500/20"
                            >
                                <Eye className="w-5 h-5" /> Mostrar versículo
                            </button>
                        ) : (
                            <div className="flex gap-3 max-w-xl mx-auto">
                                <button
                                    onClick={() => responder(false)}
                                    className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold transition-all active:scale-[0.98]"
                                >
                                    <XCircle className="w-5 h-5" /> Errei
                                </button>
                                <button
                                    onClick={() => responder(true)}
                                    className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-extrabold transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/20"
                                >
                                    <Check className="w-5 h-5" /> Acertei
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </CosmicBackground>
    );
}

// Card de versículo na lista principal
function CardVersiculo({ v, vencido, remover }: {
    v: VersiculoMemorizacao;
    vencido: boolean;
    remover: (id: number) => void;
}) {
    return (
        <div className={`p-4 rounded-xl border group ${vencido
            ? 'bg-amber-50/70 dark:bg-amber-500/5 border-amber-200/70 dark:border-amber-500/20'
            : 'bg-slate-50 dark:bg-surface-2 border-slate-100 dark:border-transparent'}`}>
            <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-amber-600 dark:text-amber-400 text-sm font-bold">{v.livro_nome} {v.capitulo}:{v.versiculo}</span>
                        <NivelDots nivel={v.nivel} />
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${vencido
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            : 'bg-slate-100 dark:bg-surface-1 text-slate-400 dark:text-text-muted'}`}>
                            <CalendarClock className="w-3 h-3" />
                            {vencido ? 'revisar hoje' : `revisa ${formatarProximaRevisao(v.proxima_revisao)}`}
                        </span>
                    </div>
                    <p className="text-text-secondary text-sm mt-1.5 leading-[1.8] reading-serif line-clamp-2">{v.texto}</p>
                    {v.revisoes > 0 && (
                        <p className="text-[10px] text-slate-400 dark:text-text-muted mt-1.5 tabular-nums">
                            {v.acertos}/{v.revisoes} {v.revisoes === 1 ? 'revisão' : 'revisões'} corretas
                        </p>
                    )}
                </div>
                <button onClick={() => remover(v.id)} className="p-2 rounded-lg text-slate-300 dark:text-text-muted hover:bg-red-50 dark:hover:bg-red-500/20 hover:text-red-500 transition-all shrink-0" title="Remover">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
