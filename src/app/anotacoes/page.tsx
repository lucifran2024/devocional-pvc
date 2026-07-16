'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    StickyNote, Plus, Trash2, Loader2, Pencil, X, Check, Copy, Share2,
    NotebookPen, Link2, FileText, ExternalLink, Sparkles,
} from 'lucide-react';
import { CosmicBackground } from '@/components/ui/CosmicBackground';
import { BackButton } from '@/components/ui/BackButton';
import {
    supabase, getAllInteracoesPorTipo, atualizarNotaBiblia, removerInteracaoBiblia,
    type BibliaInteracao,
} from '@/lib/supabase';
import {
    getAnotacoesLivres, criarAnotacaoLivre, atualizarAnotacaoLivre, removerAnotacaoLivre,
    type AnotacaoLivre,
} from '@/lib/anotacoes';
import {
    extrairLinksVideoSocial,
    type LinkVideoSocial,
    type PlataformaVideoSocial,
} from '@/lib/social-video';

type Aba = 'biblia' | 'caderno';

interface ResultadoVideoSocial {
    notaId: string;
    titulo: string;
    texto: string;
    url: string;
    plataforma: PlataformaVideoSocial;
    completa: boolean;
}

interface AlvoVideoSocial {
    notaId: string;
    url: string;
}

function nomePlataforma(plataforma: PlataformaVideoSocial): string {
    return plataforma === 'instagram' ? 'Instagram' : 'TikTok';
}

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
    const [urlVideoSelecionada, setUrlVideoSelecionada] = useState<string | null>(null);
    const [salvando, setSalvando] = useState(false);
    const [transcrevendoVideo, setTranscrevendoVideo] = useState<AlvoVideoSocial | null>(null);
    const [resultadoVideo, setResultadoVideo] = useState<ResultadoVideoSocial | null>(null);
    const [erroVideo, setErroVideo] = useState<AlvoVideoSocial & { mensagem: string } | null>(null);
    const [salvandoTranscricao, setSalvandoTranscricao] = useState(false);

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

    const abrirNova = () => {
        setEditando('nova');
        setTituloEdit('');
        setTextoEdit('');
        setUrlVideoSelecionada(null);
    };

    const abrirEdicao = (a: AnotacaoLivre) => {
        setEditando(a.id);
        setTituloEdit(a.titulo || '');
        setTextoEdit(a.texto);
        setUrlVideoSelecionada(extrairLinksVideoSocial(a.texto)[0]?.url || null);
    };

    const alterarTextoEdit = (novoTexto: string) => {
        const links = extrairLinksVideoSocial(novoTexto);
        setTextoEdit(novoTexto);
        setUrlVideoSelecionada(atual =>
            atual && links.some(link => link.url === atual) ? atual : links[0]?.url || null
        );
    };

    const salvarLivre = async (urlParaTranscrever?: string) => {
        if (!textoEdit.trim() || salvando) return;
        setSalvando(true);

        const titulo = tituloEdit.trim();
        const texto = textoEdit.trim();
        let anotacaoSalva: AnotacaoLivre | null = null;

        if (editando === 'nova') {
            anotacaoSalva = await criarAnotacaoLivre(titulo, texto);
        } else if (editando) {
            const original = livres.find(a => a.id === editando);
            const ok = await atualizarAnotacaoLivre(editando, titulo, texto);
            if (ok && original) {
                anotacaoSalva = {
                    ...original,
                    titulo: titulo || null,
                    texto,
                    updated_at: new Date().toISOString(),
                };
            }
        }

        if (!anotacaoSalva) {
            setSalvando(false);
            avisar('Não foi possível salvar');
            return;
        }

        setEditando(null);
        setUrlVideoSelecionada(null);
        await carregarLivres();
        setSalvando(false);

        const linkEscolhido = extrairLinksVideoSocial(texto)
            .find(link => link.url === urlParaTranscrever);
        if (linkEscolhido) {
            avisar('Salvo! Iniciando transcrição…');
            await transcreverVideo(anotacaoSalva, linkEscolhido);
        } else {
            avisar('Salvo!');
        }
    };

    const removerLivre = async (id: string) => {
        setLivres(prev => prev.filter(a => a.id !== id));
        await removerAnotacaoLivre(id);
        avisar('Anotação removida');
    };

    async function transcreverVideo(a: AnotacaoLivre, link: LinkVideoSocial) {
        if (transcrevendoVideo) return;

        setTranscrevendoVideo({ notaId: a.id, url: link.url });
        setErroVideo(null);
        setResultadoVideo(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                setErroVideo({ notaId: a.id, url: link.url, mensagem: 'Sua sessão expirou. Entre novamente no app.' });
                return;
            }

            const resp = await fetch('/api/transcrever-social', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: link.url }),
            });
            const data = await resp.json();
            if (!resp.ok || !data.ok) {
                setErroVideo({
                    notaId: a.id,
                    url: link.url,
                    mensagem: data.message || 'Não consegui transcrever este vídeo. Tente novamente.',
                });
                return;
            }

            setResultadoVideo({
                notaId: a.id,
                titulo: String(data.titulo || `Vídeo do ${link.plataforma === 'instagram' ? 'Instagram' : 'TikTok'}`),
                texto: String(data.texto || ''),
                url: link.url,
                plataforma: link.plataforma,
                completa: data.completa !== false,
            });
        } catch {
            setErroVideo({ notaId: a.id, url: link.url, mensagem: 'Erro de conexão. Tente novamente.' });
        } finally {
            setTranscrevendoVideo(null);
        }
    }

    const copiarTranscricao = async () => {
        if (!resultadoVideo) return;
        try {
            await navigator.clipboard.writeText(resultadoVideo.texto);
            avisar('Transcrição copiada!');
        } catch {
            avisar('Não foi possível copiar');
        }
    };

    const salvarTranscricaoNaAnotacao = async (a: AnotacaoLivre) => {
        if (!resultadoVideo || resultadoVideo.notaId !== a.id || salvandoTranscricao) return;
        setSalvandoTranscricao(true);

        const origem = nomePlataforma(resultadoVideo.plataforma);
        const textoAtualizado = `${a.texto.trim()}\n\n---\n\nTranscrição do vídeo (${origem})\nVídeo: ${resultadoVideo.url}\n\n${resultadoVideo.texto.trim()}`;
        const tituloAtualizado = a.titulo || resultadoVideo.titulo;
        const ok = await atualizarAnotacaoLivre(a.id, tituloAtualizado, textoAtualizado);

        if (ok) {
            const agora = new Date().toISOString();
            setLivres(prev => prev.map(item => item.id === a.id
                ? { ...item, titulo: tituloAtualizado, texto: textoAtualizado, updated_at: agora }
                : item));
            setResultadoVideo(null);
            avisar('Transcrição salva na anotação!');
        } else {
            setErroVideo({ notaId: a.id, url: resultadoVideo.url, mensagem: 'Não consegui salvar a transcrição. Verifique a conexão.' });
        }
        setSalvandoTranscricao(false);
    };

    const linksVideoEdit = extrairLinksVideoSocial(textoEdit);
    const linkSelecionadoEdit = linksVideoEdit.find(link => link.url === urlVideoSelecionada)
        || linksVideoEdit[0]
        || null;
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
                                    onChange={(e) => alterarTextoEdit(e.target.value)}
                                    placeholder="Escreva uma anotação ou cole um link do Instagram/TikTok..."
                                    rows={6}
                                    autoFocus
                                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-subtle text-text-primary text-sm leading-relaxed resize-y focus:outline-none focus:border-amber-400 dark:focus:border-amber-500/50"
                                />

                                {linksVideoEdit.length > 0 && (
                                    <div className="rounded-xl border border-amber-300/70 dark:border-amber-500/25 bg-amber-50/80 dark:bg-amber-500/10 p-3 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                                                <Link2 className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-text-primary">
                                                    {linksVideoEdit.length === 1 ? '1 vídeo encontrado' : `${linksVideoEdit.length} vídeos encontrados`}
                                                </p>
                                                <p className="text-[11px] text-text-muted">
                                                    {linksVideoEdit.length === 1
                                                        ? 'Você pode salvar e começar a transcrição agora.'
                                                        : 'Escolha qual vídeo deseja transcrever primeiro.'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            {linksVideoEdit.map((link, index) => (
                                                <label
                                                    key={link.url}
                                                    className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${linkSelecionadoEdit?.url === link.url
                                                        ? 'border-amber-500 bg-white dark:bg-surface-1'
                                                        : 'border-transparent bg-white/55 dark:bg-surface-1/45 hover:border-amber-300 dark:hover:border-amber-500/30'
                                                        }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="video-para-transcrever"
                                                        value={link.url}
                                                        checked={linkSelecionadoEdit?.url === link.url}
                                                        onChange={() => setUrlVideoSelecionada(link.url)}
                                                        className="accent-amber-500"
                                                    />
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block text-xs font-bold text-text-primary">
                                                            {nomePlataforma(link.plataforma)}{linksVideoEdit.length > 1 ? ` · vídeo ${index + 1}` : ''}
                                                        </span>
                                                        <span className="block text-[10px] text-text-muted truncate">{link.url}</span>
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                                    <button onClick={() => { setEditando(null); setUrlVideoSelecionada(null); }} className="min-h-11 px-4 py-2 rounded-lg text-sm font-semibold text-text-muted hover:text-text-primary flex items-center justify-center gap-1.5">
                                        <X className="w-4 h-4" /> Cancelar
                                    </button>
                                    <button onClick={() => salvarLivre()} disabled={!textoEdit.trim() || salvando}
                                        className="min-h-11 px-4 py-2 rounded-lg border border-amber-400/70 text-amber-700 dark:text-amber-300 text-sm font-bold hover:bg-amber-500/10 disabled:opacity-50 flex items-center justify-center gap-1.5">
                                        {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Salvar
                                    </button>
                                    {linkSelecionadoEdit && (
                                        <button
                                            onClick={() => salvarLivre(linkSelecionadoEdit.url)}
                                            disabled={!textoEdit.trim() || salvando}
                                            className="min-h-11 px-4 py-2 rounded-lg bg-amber-500 text-amber-950 text-sm font-bold hover:bg-amber-400 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm shadow-amber-500/20"
                                        >
                                            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                            Salvar e transcrever
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <button onClick={abrirNova}
                                className="w-full py-3 rounded-xl bg-amber-500 text-amber-950 font-bold hover:bg-amber-400 transition-colors flex items-center justify-center gap-2">
                                <Plus className="w-5 h-5" /> Nova anotação ou link
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
                            livres.map((a) => {
                                const linksVideo = extrairLinksVideoSocial(a.texto);

                                return (
                                    <div key={a.id} className={`p-4 rounded-2xl bg-slate-50 dark:bg-surface-2 border group transition-colors ${linksVideo.length > 0 ? 'border-amber-300/70 dark:border-amber-500/25' : 'border-slate-100 dark:border-transparent'}`}>
                                        <div className="flex items-start gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="reading-serif font-semibold text-text-primary">{a.titulo || 'Sem título'}</h3>
                                                    <span className="text-[10px] font-semibold text-slate-400 dark:text-text-muted bg-slate-100 dark:bg-surface-1 px-1.5 py-0.5 rounded-full" title={new Date(a.updated_at).toLocaleString('pt-BR')}>
                                                        {formatarDataRelativa(a.updated_at)}
                                                    </span>
                                                    {linksVideo.length > 0 && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/15 px-2 py-1 rounded-full">
                                                            <Link2 className="w-3 h-3" /> {linksVideo.length === 1 ? nomePlataforma(linksVideo[0].plataforma) : `${linksVideo.length} vídeos`}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-text-secondary whitespace-pre-wrap mt-1.5 leading-relaxed max-h-64 overflow-y-auto">{a.texto}</p>
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

                                        {linksVideo.length > 0 && (
                                            <div className="mt-4 pt-3 border-t border-amber-200/70 dark:border-amber-500/15 space-y-3">
                                                <p className="text-[11px] font-semibold text-text-muted">
                                                    {linksVideo.length === 1 ? 'Vídeo salvo nesta anotação' : 'Escolha abaixo qual vídeo deseja transcrever'}
                                                </p>
                                                {linksVideo.map((linkVideo, index) => {
                                                    const transcrevendo = transcrevendoVideo?.notaId === a.id && transcrevendoVideo.url === linkVideo.url;
                                                    const resultadoDesteVideo = resultadoVideo?.notaId === a.id && resultadoVideo.url === linkVideo.url ? resultadoVideo : null;
                                                    const erroDesteVideo = erroVideo?.notaId === a.id && erroVideo.url === linkVideo.url ? erroVideo.mensagem : null;

                                                    return (
                                                        <div key={linkVideo.url} data-video-url={linkVideo.url} className="rounded-xl border border-amber-200/80 dark:border-amber-500/20 bg-white/70 dark:bg-surface-1/60 p-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                                                                    <Link2 className="w-4 h-4" />
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-xs font-bold text-text-primary">
                                                                        {nomePlataforma(linkVideo.plataforma)}{linksVideo.length > 1 ? ` · vídeo ${index + 1}` : ''}
                                                                    </p>
                                                                    <p className="text-[10px] text-text-muted truncate">{linkVideo.url}</p>
                                                                </div>
                                                                <a
                                                                    href={linkVideo.url}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    aria-label={`Abrir ${nomePlataforma(linkVideo.plataforma)} vídeo ${index + 1}`}
                                                                    className="min-h-10 px-3 rounded-lg border border-border-subtle text-text-muted hover:text-amber-600 dark:hover:text-amber-400 text-xs font-semibold flex items-center gap-1.5 shrink-0"
                                                                >
                                                                    <ExternalLink className="w-3.5 h-3.5" /> Abrir
                                                                </a>
                                                            </div>
                                                            <button
                                                                onClick={() => transcreverVideo(a, linkVideo)}
                                                                disabled={Boolean(transcrevendoVideo)}
                                                                aria-label={`Transcrever ${nomePlataforma(linkVideo.plataforma)} vídeo ${index + 1}`}
                                                                className="mt-2.5 w-full min-h-11 px-4 py-2.5 rounded-xl bg-amber-500 text-amber-950 text-sm font-bold hover:bg-amber-400 disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm shadow-amber-500/15"
                                                            >
                                                                {transcrevendo
                                                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                                                    : <Sparkles className="w-4 h-4" />}
                                                                {transcrevendo ? 'Ouvindo e transcrevendo…' : 'Transcrever este vídeo'}
                                                            </button>
                                                            {transcrevendo && (
                                                                <p className="text-[11px] text-text-muted text-center mt-2">
                                                                    Buscando este vídeo e ouvindo toda a fala. Pode levar alguns minutos.
                                                                </p>
                                                            )}

                                                            {erroDesteVideo && (
                                                                <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-600 dark:text-red-400 text-xs leading-relaxed">
                                                                    {erroDesteVideo}
                                                                </div>
                                                            )}

                                                            {resultadoDesteVideo && (
                                                                <div className="mt-3 rounded-2xl bg-white dark:bg-surface-1 border border-emerald-300/70 dark:border-emerald-500/25 overflow-hidden">
                                                                    <div className="px-4 py-3 bg-emerald-50 dark:bg-emerald-500/10 border-b border-emerald-200/70 dark:border-emerald-500/20 flex items-start gap-3">
                                                                        <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                                                            <FileText className="w-4.5 h-4.5" />
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <p className="text-sm font-bold text-text-primary">Transcrição pronta</p>
                                                                            <p className="text-[11px] text-text-muted truncate">{resultadoDesteVideo.titulo}</p>
                                                                        </div>
                                                                    </div>
                                                                    <p className="px-4 py-3 text-sm text-text-secondary whitespace-pre-wrap leading-relaxed max-h-[45vh] overflow-y-auto">
                                                                        {resultadoDesteVideo.texto}
                                                                    </p>
                                                                    {!resultadoDesteVideo.completa && (
                                                                        <p className="mx-4 mb-3 text-xs text-amber-700 dark:text-amber-300">
                                                                            O vídeo gerou um texto muito longo e pode ter sido cortado no final.
                                                                        </p>
                                                                    )}
                                                                    <div className="p-3 border-t border-border-subtle grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                        <button
                                                                            onClick={copiarTranscricao}
                                                                            className="min-h-11 px-4 py-2.5 rounded-xl border border-border-subtle text-text-primary text-sm font-bold hover:bg-surface-2 flex items-center justify-center gap-2"
                                                                        >
                                                                            <Copy className="w-4 h-4" /> Copiar texto
                                                                        </button>
                                                                        <button
                                                                            onClick={() => salvarTranscricaoNaAnotacao(a)}
                                                                            disabled={salvandoTranscricao}
                                                                            className="min-h-11 px-4 py-2.5 rounded-xl bg-emerald-500 text-emerald-950 text-sm font-bold hover:bg-emerald-400 disabled:opacity-60 flex items-center justify-center gap-2"
                                                                        >
                                                                            {salvandoTranscricao
                                                                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                                                                : <Check className="w-4 h-4" />}
                                                                            Salvar nesta anotação
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </CosmicBackground>
    );
}
