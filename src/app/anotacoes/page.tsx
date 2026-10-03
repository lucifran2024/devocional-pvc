'use client';

// ===========================================
// CADERNO (/anotacoes) — reformulado em 03/10/2026 a pedido de Lucifran:
// o Caderno era a 2ª aba de "Anotações" e é o que ele mais usa (links de
// Reels/TikTok para transcrever). Agora é uma lista só, com as notas dos
// versículos junto, busca, filtros, edição no próprio cartão, "Ver tudo" para
// texto longo, "Abrir na Bíblia" e confirmação antes de apagar.
// A transcrição de vídeo (16/07/2026) continua igual.
// ===========================================

import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
    StickyNote, Plus, Trash2, Loader2, Pencil, X, Check, Copy, Share2,
    NotebookPen, Link2, FileText, ExternalLink, Sparkles, Search, BookOpen,
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
import {
    FILTROS_CADERNO, contarPorFiltro, filtrarCaderno, montarItensCaderno, referenciaDaNota, textoLongo,
    type FiltroCaderno,
} from '@/lib/caderno';
import { persistBibliaPosicao } from '@/lib/biblia-posicao';

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
    if (dias < 30) return `${dias} dias atrás`;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
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

const botaoIcone = 'grid h-10 w-10 place-items-center rounded-lg text-text-muted hover:bg-surface-2 hover:text-text-primary transition-colors';
const botaoIconePerigo = 'grid h-10 w-10 place-items-center rounded-lg text-text-muted hover:bg-red-500/10 hover:text-red-500 transition-colors';
const campo = 'w-full rounded-xl bg-surface-0 border border-border-subtle px-3.5 py-2.5 text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-amber-500/60';

export default function CadernoPage() {
    const router = useRouter();
    const [feedback, setFeedback] = useState<string | null>(null);
    const [busca, setBusca] = useState('');
    const [filtro, setFiltro] = useState<FiltroCaderno>('tudo');
    const [confirmandoApagar, setConfirmandoApagar] = useState<string | null>(null);
    const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

    // Notas dos versículos
    const [notas, setNotas] = useState<BibliaInteracao[]>([]);
    const [loadingNotas, setLoadingNotas] = useState(true);
    const [notaEditId, setNotaEditId] = useState<number | null>(null);
    const [notaEditTexto, setNotaEditTexto] = useState('');

    // Anotações livres
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
        setTimeout(() => setFeedback(null), 2200);
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
        carregarNotas();
        carregarLivres();
    }, [carregarNotas, carregarLivres]);

    const itens = useMemo(() => montarItensCaderno(livres, notas), [livres, notas]);
    const contagem = useMemo(() => contarPorFiltro(itens), [itens]);
    const visiveis = useMemo(() => filtrarCaderno(itens, filtro, busca), [itens, filtro, busca]);
    const carregando = loadingNotas || loadingLivres;

    const alternarExpandido = (chave: string) => setExpandidos(prev => {
        const novo = new Set(prev);
        if (novo.has(chave)) novo.delete(chave); else novo.add(chave);
        return novo;
    });

    // ===== ações: notas dos versículos =====
    const textoNotaBiblia = (n: BibliaInteracao) =>
        `"${n.texto_versiculo}" — ${referenciaDaNota(n)}\n\n${n.nota}`;

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
        setConfirmandoApagar(null);
        setNotas(prev => prev.filter(n => n.id !== id));
        await removerInteracaoBiblia(id);
        avisar('Nota apagada');
    };

    // Abre a Bíblia no versículo da nota (a Bíblia retoma a posição guardada)
    const abrirNaBiblia = (n: BibliaInteracao) => {
        persistBibliaPosicao({ livro: n.livro_abrev, livroNome: n.livro_nome, capitulo: n.capitulo, versiculo: n.versiculo });
        router.push('/biblioteca');
    };

    // ===== ações: anotações livres =====
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

    const fecharEditor = () => {
        setEditando(null);
        setUrlVideoSelecionada(null);
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

        fecharEditor();
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
        setConfirmandoApagar(null);
        setLivres(prev => prev.filter(a => a.id !== id));
        await removerAnotacaoLivre(id);
        avisar('Anotação apagada');
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

    // ===== pedaços da tela =====

    const editorAnotacao = (
        <div className="rounded-2xl border border-amber-500/40 bg-surface-1 p-4 space-y-3">
            <input
                value={tituloEdit}
                onChange={(e) => setTituloEdit(e.target.value)}
                placeholder="Título (opcional)"
                aria-label="Título da anotação"
                className={`${campo} font-semibold`}
            />
            <textarea
                value={textoEdit}
                onChange={(e) => alterarTextoEdit(e.target.value)}
                placeholder="Escreva ou cole um link do Instagram ou do TikTok…"
                aria-label="Texto da anotação"
                rows={6}
                autoFocus
                className={`${campo} leading-relaxed resize-y`}
            />

            {linksVideoEdit.length > 0 && (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                        <Link2 className="w-4 h-4 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden="true" />
                        <div>
                            <p className="text-sm font-semibold text-text-primary">
                                {linksVideoEdit.length === 1 ? '1 vídeo encontrado' : `${linksVideoEdit.length} vídeos encontrados`}
                            </p>
                            <p className="text-xs text-text-muted">
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
                                    ? 'border-amber-500 bg-surface-1'
                                    : 'border-transparent bg-surface-1/60 hover:border-amber-500/30'
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
                                    <span className="block text-xs font-semibold text-text-primary">
                                        {nomePlataforma(link.plataforma)}{linksVideoEdit.length > 1 ? ` · vídeo ${index + 1}` : ''}
                                    </span>
                                    <span className="block text-[11px] text-text-muted truncate">{link.url}</span>
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                <button onClick={fecharEditor} className="min-h-11 px-4 py-2 rounded-xl text-sm font-semibold text-text-muted hover:text-text-primary flex items-center justify-center gap-1.5">
                    <X className="w-4 h-4" /> Cancelar
                </button>
                <button onClick={() => salvarLivre()} disabled={!textoEdit.trim() || salvando}
                    className={`min-h-11 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-1.5 ${linkSelecionadoEdit
                        ? 'border border-amber-500/60 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10'
                        : 'bg-amber-500 text-amber-950 hover:bg-amber-400'}`}>
                    {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Salvar
                </button>
                {linkSelecionadoEdit && (
                    <button
                        onClick={() => salvarLivre(linkSelecionadoEdit.url)}
                        disabled={!textoEdit.trim() || salvando}
                        className="min-h-11 px-4 py-2 rounded-xl bg-amber-500 text-amber-950 text-sm font-bold hover:bg-amber-400 disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                        {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        Salvar e transcrever
                    </button>
                )}
            </div>
        </div>
    );

    const confirmacaoApagar = (texto: string, onApagar: () => void) => (
        <div role="alertdialog" aria-label={texto} className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2.5">
            <p className="text-sm font-medium text-text-primary">{texto}</p>
            <div className="flex gap-2">
                <button onClick={() => setConfirmandoApagar(null)} className="min-h-10 px-3 rounded-lg text-sm font-semibold text-text-muted hover:text-text-primary">
                    Cancelar
                </button>
                <button onClick={onApagar} className="min-h-10 px-3 rounded-lg bg-red-500 text-white text-sm font-bold hover:bg-red-400">
                    Apagar
                </button>
            </div>
        </div>
    );

    const acoes = (botoes: { rotulo: string; icone: ReactNode; onClick: () => void; perigo?: boolean }[]) => (
        <div className="flex items-center gap-0.5">
            {botoes.map(b => (
                <button
                    key={b.rotulo}
                    onClick={b.onClick}
                    aria-label={b.rotulo}
                    title={b.rotulo}
                    className={b.perigo ? botaoIconePerigo : botaoIcone}
                >
                    {b.icone}
                </button>
            ))}
        </div>
    );

    const textoRecolhivel = (chave: string, texto: string, classe: string) => {
        const longo = textoLongo(texto);
        const aberto = expandidos.has(chave);
        return (
            <>
                <p className={`${classe} whitespace-pre-wrap ${longo && !aberto ? 'line-clamp-6' : ''}`}>{texto}</p>
                {longo && (
                    <button onClick={() => alternarExpandido(chave)} className="mt-1 text-sm font-semibold text-amber-700 dark:text-amber-400 hover:underline">
                        {aberto ? 'Ver menos' : 'Ver tudo'}
                    </button>
                )}
            </>
        );
    };

    const cartaoNotaBiblia = (n: BibliaInteracao, chave: string) => (
        <article className="rounded-2xl border border-border-subtle bg-surface-1 p-4">
            <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-bold text-amber-700 dark:text-amber-400">{referenciaDaNota(n)}</h3>
                {n.created_at && (
                    <span className="shrink-0 text-xs text-text-muted" title={new Date(n.created_at).toLocaleString('pt-BR')}>
                        {formatarDataRelativa(n.created_at)}
                    </span>
                )}
            </div>
            <p className="reading-serif mt-1.5 text-[15px] leading-[1.75] text-text-primary">{n.texto_versiculo}</p>

            {notaEditId !== n.id ? (
                <div className="mt-3 border-l-2 border-amber-500/60 pl-3">
                    {textoRecolhivel(chave, n.nota || '', 'text-sm leading-relaxed text-text-secondary')}
                </div>
            ) : (
                <div className="mt-3">
                    <textarea
                        value={notaEditTexto}
                        onChange={e => setNotaEditTexto(e.target.value)}
                        rows={3}
                        autoFocus
                        aria-label={`Nota de ${referenciaDaNota(n)}`}
                        className={`${campo} resize-y`}
                    />
                    <div className="flex justify-end gap-2 mt-2">
                        <button onClick={() => setNotaEditId(null)} className="min-h-10 px-3 rounded-lg text-sm font-semibold text-text-muted hover:text-text-primary">Cancelar</button>
                        <button onClick={() => salvarEdicaoNota(n)} disabled={!notaEditTexto.trim()}
                            className="min-h-10 px-4 rounded-lg bg-amber-500 text-amber-950 text-sm font-bold hover:bg-amber-400 disabled:opacity-40">
                            Salvar
                        </button>
                    </div>
                </div>
            )}

            <div className="mt-3 flex items-center justify-between gap-2">
                <button onClick={() => abrirNaBiblia(n)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 -ml-2 text-sm font-semibold text-text-secondary hover:text-amber-700 dark:hover:text-amber-400">
                    <BookOpen className="w-4 h-4" aria-hidden="true" /> Abrir na Bíblia
                </button>
                {acoes([
                    { rotulo: 'Copiar versículo e nota', icone: <Copy className="w-4 h-4" />, onClick: () => copiarNota(n) },
                    { rotulo: 'Compartilhar', icone: <Share2 className="w-4 h-4" />, onClick: () => compartilharNota(n) },
                    { rotulo: 'Editar nota', icone: <Pencil className="w-4 h-4" />, onClick: () => { setNotaEditId(n.id!); setNotaEditTexto(n.nota || ''); } },
                    { rotulo: 'Apagar nota', icone: <Trash2 className="w-4 h-4" />, onClick: () => setConfirmandoApagar(chave), perigo: true },
                ])}
            </div>
            {confirmandoApagar === chave && confirmacaoApagar('Apagar esta nota?', () => apagarNota(n.id!))}
        </article>
    );

    const cartaoAnotacao = (a: AnotacaoLivre, chave: string) => {
        if (editando === a.id) return editorAnotacao;
        const linksVideo = extrairLinksVideoSocial(a.texto);
        return (
            <article className="rounded-2xl border border-border-subtle bg-surface-1 p-4">
                <div className="flex items-baseline justify-between gap-3">
                    <h3 className="reading-serif font-semibold text-text-primary">{a.titulo || 'Sem título'}</h3>
                    <span className="shrink-0 text-xs text-text-muted" title={new Date(a.updated_at).toLocaleString('pt-BR')}>
                        {formatarDataRelativa(a.updated_at)}
                    </span>
                </div>
                {linksVideo.length > 0 && (
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                        <Link2 className="w-3 h-3" aria-hidden="true" />
                        {linksVideo.length === 1 ? `Vídeo do ${nomePlataforma(linksVideo[0].plataforma)}` : `${linksVideo.length} vídeos`}
                    </p>
                )}

                <div className="mt-2">
                    {textoRecolhivel(chave, a.texto, 'text-sm leading-relaxed text-text-secondary break-words')}
                </div>

                {linksVideo.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-border-subtle space-y-3">
                        {linksVideo.length > 1 && (
                            <p className="text-xs font-semibold text-text-muted">Escolha abaixo qual vídeo deseja transcrever</p>
                        )}
                        {linksVideo.map((linkVideo, index) => {
                            const transcrevendo = transcrevendoVideo?.notaId === a.id && transcrevendoVideo.url === linkVideo.url;
                            const resultadoDesteVideo = resultadoVideo?.notaId === a.id && resultadoVideo.url === linkVideo.url ? resultadoVideo : null;
                            const erroDesteVideo = erroVideo?.notaId === a.id && erroVideo.url === linkVideo.url ? erroVideo.mensagem : null;

                            return (
                                <div key={linkVideo.url} data-video-url={linkVideo.url} className="rounded-xl border border-border-subtle bg-surface-0/60 p-3">
                                    <div className="flex items-center gap-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-semibold text-text-primary">
                                                {nomePlataforma(linkVideo.plataforma)}{linksVideo.length > 1 ? ` · vídeo ${index + 1}` : ''}
                                            </p>
                                            <p className="text-[11px] text-text-muted truncate">{linkVideo.url}</p>
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
                                        className="mt-2.5 w-full min-h-11 px-4 py-2.5 rounded-xl bg-amber-500 text-amber-950 text-sm font-bold hover:bg-amber-400 disabled:opacity-60 flex items-center justify-center gap-2"
                                    >
                                        {transcrevendo
                                            ? <Loader2 className="w-4 h-4 animate-spin" />
                                            : <Sparkles className="w-4 h-4" />}
                                        {transcrevendo ? 'Ouvindo e transcrevendo…' : 'Transcrever este vídeo'}
                                    </button>
                                    {transcrevendo && (
                                        <p className="text-xs text-text-muted text-center mt-2">
                                            Buscando este vídeo e ouvindo toda a fala. Pode levar alguns minutos.
                                        </p>
                                    )}

                                    {erroDesteVideo && (
                                        <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-600 dark:text-red-400 text-xs leading-relaxed">
                                            {erroDesteVideo}
                                        </div>
                                    )}

                                    {resultadoDesteVideo && (
                                        <div className="mt-3 rounded-2xl bg-surface-1 border border-emerald-500/30 overflow-hidden">
                                            <div className="px-4 py-3 bg-emerald-500/10 border-b border-emerald-500/20 flex items-start gap-3">
                                                <FileText className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
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

                <div className="mt-3 flex justify-end">
                    {acoes([
                        { rotulo: 'Copiar', icone: <Copy className="w-4 h-4" />, onClick: () => copiarLivre(a) },
                        { rotulo: 'Compartilhar', icone: <Share2 className="w-4 h-4" />, onClick: () => compartilharLivre(a) },
                        { rotulo: 'Editar anotação', icone: <Pencil className="w-4 h-4" />, onClick: () => abrirEdicao(a) },
                        { rotulo: 'Apagar anotação', icone: <Trash2 className="w-4 h-4" />, onClick: () => setConfirmandoApagar(chave), perigo: true },
                    ])}
                </div>
                {confirmandoApagar === chave && confirmacaoApagar('Apagar esta anotação?', () => removerLivre(a.id))}
            </article>
        );
    };

    const vazio = () => {
        if (itens.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                    <NotebookPen className="w-8 h-8 text-amber-500" aria-hidden="true" />
                    <div>
                        <p className="text-text-primary font-semibold">Seu caderno está vazio</p>
                        <p className="text-text-muted text-sm mt-1 max-w-[280px] mx-auto leading-relaxed">
                            Escreva uma anotação, cole um link de vídeo para transcrever ou anote um versículo durante a leitura.
                        </p>
                    </div>
                </div>
            );
        }
        return (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                <StickyNote className="w-7 h-7 text-text-muted" aria-hidden="true" />
                <p className="text-text-secondary text-sm">
                    {busca.trim() ? `Nada encontrado para “${busca.trim()}”.` : 'Nada aqui ainda.'}
                </p>
                {(busca.trim() || filtro !== 'tudo') && (
                    <button onClick={() => { setBusca(''); setFiltro('tudo'); }} className="text-sm font-semibold text-amber-700 dark:text-amber-400 hover:underline">
                        Ver tudo
                    </button>
                )}
            </div>
        );
    };

    return (
        <CosmicBackground className="flex flex-col min-h-screen px-4 sm:px-6 py-8 selection:bg-amber-500/30">
            <div className="max-w-3xl mx-auto w-full space-y-5">
                <BackButton href="/" label="Início" />

                <div className="space-y-1.5">
                    <h1 className="reading-serif text-3xl md:text-4xl font-semibold text-text-primary">Caderno</h1>
                    <p className="text-text-muted text-sm">Suas anotações, os versículos que você anotou e os vídeos que você transcreve.</p>
                </div>

                {editando === 'nova' ? editorAnotacao : (
                    <button onClick={abrirNova}
                        className="w-full min-h-12 rounded-xl bg-amber-500 text-amber-950 font-bold hover:bg-amber-400 transition-colors flex items-center justify-center gap-2">
                        <Plus className="w-5 h-5" /> Nova anotação ou link
                    </button>
                )}

                {itens.length > 0 && (
                    <div className="space-y-3">
                        <label className="relative block">
                            <span className="sr-only">Buscar no caderno</span>
                            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" aria-hidden="true" />
                            <input
                                type="search"
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                                placeholder="Buscar no caderno"
                                className={`${campo} min-h-11 pl-10`}
                            />
                        </label>
                        <div role="group" aria-label="Mostrar" className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                            {FILTROS_CADERNO.map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setFiltro(f.id)}
                                    aria-pressed={filtro === f.id}
                                    className={`shrink-0 min-h-10 rounded-full px-3 text-sm font-semibold transition-colors ${filtro === f.id
                                        ? 'bg-text-primary text-surface-0'
                                        : 'border border-border-subtle text-text-secondary hover:text-text-primary'}`}
                                >
                                    {f.rotulo} <span className={filtro === f.id ? 'opacity-70' : 'text-text-muted'}>{contagem[f.id]}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Aviso flutuante */}
                {feedback && (
                    <div role="status" className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-surface-1 border border-amber-500/30 text-sm font-semibold text-text-primary shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
                        {feedback}
                    </div>
                )}

                {carregando ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 text-amber-500 animate-spin" /></div>
                ) : visiveis.length === 0 ? vazio() : (
                    <ul className="space-y-3">
                        {visiveis.map(item => (
                            <li key={item.chave}>
                                {item.tipo === 'livre'
                                    ? cartaoAnotacao(item.anotacao, item.chave)
                                    : cartaoNotaBiblia(item.nota, item.chave)}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </CosmicBackground>
    );
}
