'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle, BookOpen, Check, CircleCheck, ClipboardPaste, Copy, FileText,
    Library, Loader2, RotateCw, Save, Search, Share2, X, Youtube,
} from 'lucide-react';
import { CosmicBackground } from '@/components/ui/CosmicBackground';
import { BackButton } from '@/components/ui/BackButton';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { BotaoAcao } from '@/components/transcricao/BotaoAcao';
import { CartaoTranscricao } from '@/components/transcricao/CartaoTranscricao';
import { LeitorTranscricao } from '@/components/transcricao/LeitorTranscricao';
import { MiniaturaVideo } from '@/components/transcricao/MiniaturaVideo';
import { useToast } from '@/hooks/useToast';
import { useAcoesTranscricao, type Avisar } from '@/hooks/useAcoesTranscricao';
import { getTranscricoes, salvarTranscricao, removerTranscricao, type Transcricao } from '@/lib/transcricoes';
import {
    chaveBusca, contarPalavras, descreverOrigem, descreverPalavras, etapaTranscricao, extrairIdYoutube,
    filtrarTranscricoes, formatarDuracao, mensagemErroTranscricao, paragrafosParaLeitura, tempoLeitura,
} from '@/lib/transcricao-apresentacao';

interface ResultadoTranscricao {
    titulo: string;
    texto: string;
    idioma: string;
    /** Link exatamente como foi transcrito (é o que vai para o histórico). */
    fonteUrl: string;
}

const ID_LISTA = 'minhas-transcricoes';

export default function TranscreverYoutubePage() {
    const { toasts, removeToast, addToast } = useToast();
    const avisar = useCallback<Avisar>((tipo, mensagem) => addToast(tipo, mensagem), [addToast]);

    const [url, setUrl] = useState('');
    const [carregando, setCarregando] = useState(false);
    const [segundos, setSegundos] = useState(0);
    const [erro, setErro] = useState<string | null>(null);
    const [resultado, setResultado] = useState<ResultadoTranscricao | null>(null);
    const [salvoId, setSalvoId] = useState<string | null>(null);
    const [salvando, setSalvando] = useState(false);
    const [historico, setHistorico] = useState<Transcricao[]>([]);
    const [historicoPronto, setHistoricoPronto] = useState(false);
    const [busca, setBusca] = useState('');
    const [leitor, setLeitor] = useState<string | null>(null); // 'resultado' ou id de uma salva
    const [destaqueId, setDestaqueId] = useState<string | null>(null);

    const carregar = useCallback(async () => {
        setHistorico(await getTranscricoes('youtube'));
        setHistoricoPronto(true);
    }, []);
    useEffect(() => { carregar(); }, [carregar]);

    // Cronômetro só para mostrar o andamento enquanto transcreve
    useEffect(() => {
        if (!carregando) return;
        const inicio = Date.now();
        const timer = setInterval(() => setSegundos(Math.floor((Date.now() - inicio) / 1000)), 1000);
        return () => clearInterval(timer);
    }, [carregando]);

    // O destaque do cartão recém-salvo some sozinho
    useEffect(() => {
        if (!destaqueId) return;
        const timer = setTimeout(() => setDestaqueId(null), 6000);
        return () => clearTimeout(timer);
    }, [destaqueId]);

    const chaves = useMemo(() => historico.map(chaveBusca), [historico]);
    const filtrados = useMemo(() => filtrarTranscricoes(historico, busca, chaves), [historico, busca, chaves]);

    const transcrever = async () => {
        const link = url.trim();
        if (!link || carregando) return;
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); // fecha o teclado
        setSegundos(0);
        setCarregando(true);
        setErro(null);
        setResultado(null);
        setSalvoId(null);
        try {
            const resp = await fetch('/api/transcrever-youtube', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: link }),
            });
            const data = await resp.json();
            if (data.ok) {
                setResultado({ titulo: data.titulo, texto: data.texto, idioma: data.idioma, fonteUrl: link });
            } else {
                setErro(mensagemErroTranscricao(data));
            }
        } catch {
            setErro('Erro de conexão. Tente novamente.');
        } finally {
            setCarregando(false);
        }
    };

    const colar = async () => {
        try {
            const copiado = (await navigator.clipboard.readText()).trim();
            if (copiado) {
                setUrl(copiado);
                setErro(null);
                return;
            }
            avisar('info', 'Nada copiado ainda. No YouTube, toque em Compartilhar → Copiar link.');
        } catch {
            avisar('info', 'Toque e segure no campo e escolha Colar.');
        }
    };

    // Transcrever sozinho não salva: só este botão grava em Minhas transcrições.
    const salvar = async () => {
        if (!resultado || salvoId || salvando) return;
        setSalvando(true);
        const nova = await salvarTranscricao({
            tipo: 'youtube',
            titulo: resultado.titulo,
            fonte_url: resultado.fonteUrl,
            texto: resultado.texto,
        });
        setSalvando(false);
        if (!nova) {
            avisar('error', 'Não foi possível salvar. Verifique a internet e tente de novo.');
            return;
        }
        setSalvoId(nova.id);
        setHistorico((prev) => [nova, ...prev.filter((t) => t.id !== nova.id)]);
        setHistoricoPronto(true);
        setDestaqueId(nova.id);
        avisar('success', 'Salva em Minhas transcrições.');
    };

    const aoSalvarTexto = (id: string, texto: string) => {
        setHistorico((prev) => prev.map((t) => (t.id === id ? { ...t, texto } : t)));
        if (id === salvoId) setResultado((atual) => (atual ? { ...atual, texto } : atual));
    };

    const excluir = async (id: string) => {
        const ok = await removerTranscricao(id);
        if (!ok) {
            avisar('error', 'Não foi possível excluir. Verifique a internet e tente de novo.');
            return false;
        }
        setHistorico((prev) => prev.filter((t) => t.id !== id));
        if (id === salvoId) setSalvoId(null);
        setLeitor(null);
        avisar('success', 'Transcrição excluída.');
        return true;
    };

    const irParaLista = () => document.getElementById(ID_LISTA)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });

    const idPrevia = extrairIdYoutube(url);
    const mostrarPrevia = !!idPrevia && !carregando && resultado?.fonteUrl !== url.trim();
    const aberta = leitor && leitor !== 'resultado' ? historico.find((t) => t.id === leitor) ?? null : null;

    return (
        <CosmicBackground className="flex min-h-screen flex-col px-4 py-8 selection:bg-amber-500/30 sm:px-6">
            <div className="mx-auto w-full max-w-3xl space-y-6">
                <BackButton href="/" label="Início" />

                <header className="space-y-2 text-center">
                    <div className="inline-flex rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-600 dark:text-amber-400">
                        <Youtube className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <h1 className="reading-serif text-3xl font-semibold text-text-primary md:text-4xl">Transcrever do YouTube</h1>
                    <p className="text-sm text-text-muted">Cole o link de uma pregação e receba o texto para ler, copiar, compartilhar ou guardar.</p>
                    {historico.length > 0 && (
                        <button
                            type="button"
                            onClick={irParaLista}
                            className="mt-1 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-1/80 px-4 py-2 text-sm font-semibold text-text-secondary transition-colors hover:border-amber-500/40 hover:text-text-primary"
                        >
                            <Library className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                            Minhas transcrições · {historico.length}
                        </button>
                    )}
                </header>

                {/* Link do vídeo */}
                <div className="space-y-3 rounded-3xl border border-border-subtle bg-surface-1 p-4 shadow-sm">
                    <label htmlFor="link-video" className="block text-sm font-semibold text-text-primary">Link do vídeo</label>
                    <div className="relative">
                        <input
                            id="link-video"
                            type="url"
                            inputMode="url"
                            enterKeyHint="go"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && transcrever()}
                            placeholder="https://youtu.be/…"
                            className="w-full rounded-2xl border border-border-subtle bg-surface-2 py-3.5 pl-4 pr-24 text-base text-text-primary placeholder:text-text-muted focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        />
                        {url ? (
                            <button
                                type="button"
                                onClick={() => { setUrl(''); setErro(null); }}
                                aria-label="Limpar link"
                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2 text-text-muted transition-colors hover:bg-surface-1 hover:text-text-primary"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={colar}
                                className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded-xl border border-border-subtle bg-surface-1 px-3 py-2 text-sm font-semibold text-text-secondary transition-colors hover:text-text-primary"
                            >
                                <ClipboardPaste className="h-4 w-4" aria-hidden="true" /> Colar
                            </button>
                        )}
                    </div>

                    {mostrarPrevia && (
                        <div className="flex items-center gap-3 rounded-2xl bg-surface-2/60 p-2">
                            <MiniaturaVideo fonteUrl={url} className="aspect-video w-20 shrink-0" />
                            <p className="text-xs text-text-secondary">Vídeo reconhecido. Toque em <strong className="text-text-primary">Transcrever</strong>.</p>
                        </div>
                    )}
                    {!idPrevia && url.trim() && !carregando && !erro && (
                        <p className="text-xs text-amber-700 dark:text-amber-300">Esse endereço não parece de um vídeo do YouTube (youtube.com ou youtu.be).</p>
                    )}

                    <button
                        type="button"
                        onClick={transcrever}
                        disabled={!url.trim() || carregando}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 py-3.5 font-bold text-amber-950 transition hover:bg-amber-400 active:scale-[0.99] disabled:opacity-50"
                    >
                        {carregando ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Youtube className="h-5 w-5" aria-hidden="true" />}
                        {carregando ? 'Transcrevendo…' : 'Transcrever'}
                    </button>
                </div>

                {carregando && (
                    <div className="flex items-center gap-4 rounded-3xl border border-amber-500/25 bg-surface-1 p-5 shadow-sm">
                        <Loader2 className="h-8 w-8 shrink-0 animate-spin text-amber-500" aria-hidden="true" />
                        <div className="min-w-0 flex-1 space-y-1">
                            <p role="status" className="text-sm font-semibold text-text-primary">{etapaTranscricao(segundos)}</p>
                            <p className="text-xs text-text-muted">
                                <span className="tabular-nums" aria-hidden="true">{formatarDuracao(segundos)} · </span>
                                Mantenha o app aberto até terminar.
                            </p>
                        </div>
                    </div>
                )}

                {erro && (
                    <div role="alert" className="space-y-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300">
                        <p className="flex items-start gap-2">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> <span>{erro}</span>
                        </p>
                        <button
                            type="button"
                            onClick={transcrever}
                            disabled={!url.trim()}
                            className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 px-3 py-2 font-semibold transition-colors hover:bg-red-500/10 disabled:opacity-50"
                        >
                            <RotateCw className="h-4 w-4" aria-hidden="true" /> Tentar de novo
                        </button>
                    </div>
                )}

                {resultado && !carregando && (
                    <CartaoResultado
                        resultado={resultado}
                        salvoId={salvoId}
                        salvando={salvando}
                        onSalvar={salvar}
                        onLer={() => setLeitor('resultado')}
                        onVerLista={irParaLista}
                        avisar={avisar}
                    />
                )}

                {/* Onde as transcrições ficam guardadas */}
                <section id={ID_LISTA} aria-labelledby="titulo-minhas-transcricoes" className="scroll-mt-6 space-y-3 pt-2">
                    <div>
                        <h2 id="titulo-minhas-transcricoes" className="reading-serif flex items-center gap-2 text-xl font-semibold text-text-primary">
                            <Library className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                            Minhas transcrições
                            {historico.length > 0 && (
                                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-sans text-xs font-bold text-amber-700 dark:text-amber-300">{historico.length}</span>
                            )}
                        </h2>
                        <p className="mt-1 text-xs text-text-muted">Ficam guardadas na sua conta. Toque em uma para ler, copiar, compartilhar ou editar.</p>
                    </div>

                    {historico.length >= 4 && (
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
                            <input
                                type="search"
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                                placeholder="Buscar por título ou palavra"
                                aria-label="Buscar nas transcrições"
                                className="w-full rounded-2xl border border-border-subtle bg-surface-1 py-3 pl-10 pr-4 text-base text-text-primary placeholder:text-text-muted focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                            />
                        </div>
                    )}

                    {!historicoPronto ? (
                        <div className="space-y-2" aria-hidden="true">
                            {[0, 1].map((i) => (
                                <div key={i} className="h-[88px] animate-pulse rounded-2xl border border-border-subtle bg-surface-1" />
                            ))}
                        </div>
                    ) : historico.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border-strong bg-surface-1/60 p-6 text-center">
                            <p className="font-semibold text-text-primary">Nenhuma transcrição salva ainda</p>
                            <p className="mt-1 text-sm text-text-muted">
                                Depois de transcrever, toque em <strong className="text-text-secondary">Salvar em Minhas transcrições</strong>. Ela fica guardada aqui, na sua conta.
                            </p>
                        </div>
                    ) : filtrados.length === 0 ? (
                        <p className="rounded-2xl bg-surface-1/60 p-4 text-center text-sm text-text-muted">Nada encontrado para “{busca.trim()}”.</p>
                    ) : (
                        <ul className="space-y-2">
                            {filtrados.map((t) => (
                                <li key={t.id}>
                                    <CartaoTranscricao transcricao={t} destaque={t.id === destaqueId} onAbrir={() => setLeitor(t.id)} />
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>

            {leitor === 'resultado' && resultado && (
                <LeitorTranscricao
                    key="resultado"
                    titulo={resultado.titulo}
                    texto={resultado.texto}
                    fonteUrl={resultado.fonteUrl}
                    criadoEm={salvoId ? historico.find((t) => t.id === salvoId)?.created_at : null}
                    origem={descreverOrigem(resultado.idioma)}
                    salvoId={salvoId}
                    salvando={salvando}
                    onSalvar={salvar}
                    onFechar={() => setLeitor(null)}
                    onTextoSalvo={aoSalvarTexto}
                    onExcluir={excluir}
                    avisar={avisar}
                />
            )}
            {aberta && (
                <LeitorTranscricao
                    key={aberta.id}
                    titulo={aberta.titulo?.trim() || 'Sem título'}
                    texto={aberta.texto}
                    fonteUrl={aberta.fonte_url}
                    criadoEm={aberta.created_at}
                    salvoId={aberta.id}
                    onFechar={() => setLeitor(null)}
                    onTextoSalvo={aoSalvarTexto}
                    onExcluir={excluir}
                    avisar={avisar}
                />
            )}

            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </CosmicBackground>
    );
}

// Cartão do resultado: Salvar em destaque, ações com nome e o começo do texto.
function CartaoResultado({ resultado, salvoId, salvando, onSalvar, onLer, onVerLista, avisar }: {
    resultado: ResultadoTranscricao;
    salvoId: string | null;
    salvando: boolean;
    onSalvar: () => void;
    onLer: () => void;
    onVerLista: () => void;
    avisar: Avisar;
}) {
    const { copiado, copiar, compartilhar, enviarArquivo } = useAcoesTranscricao({
        titulo: resultado.titulo,
        texto: resultado.texto,
        fonteUrl: resultado.fonteUrl,
        avisar,
    });
    const palavras = useMemo(() => contarPalavras(resultado.texto), [resultado.texto]);
    const previa = useMemo(() => paragrafosParaLeitura(resultado.texto).slice(0, 2), [resultado.texto]);
    const detalhes = [descreverOrigem(resultado.idioma), descreverPalavras(palavras), tempoLeitura(palavras)].filter(Boolean).join(' · ');

    return (
        <section aria-labelledby="titulo-resultado" className="overflow-hidden rounded-3xl border border-amber-500/25 bg-surface-1 shadow-sm">
            <div className="flex gap-3 p-4">
                <MiniaturaVideo fonteUrl={resultado.fonteUrl} className="aspect-video w-28 shrink-0 self-start sm:w-40" />
                <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" /> Transcrição pronta
                    </p>
                    <h2 id="titulo-resultado" className="reading-serif mt-1 line-clamp-3 text-lg font-semibold leading-snug text-text-primary">{resultado.titulo}</h2>
                    <p className="mt-1 text-xs leading-relaxed text-text-muted">{detalhes}</p>
                </div>
            </div>

            <div className="space-y-2 px-4">
                {salvoId ? (
                    <div role="status" className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                        <span className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                            <CircleCheck className="h-5 w-5 shrink-0" aria-hidden="true" /> Salva em Minhas transcrições
                        </span>
                        <button type="button" onClick={onVerLista} className="shrink-0 rounded-xl px-2 py-1.5 text-sm font-semibold text-emerald-700 underline underline-offset-2 dark:text-emerald-300">
                            Ver lista
                        </button>
                    </div>
                ) : (
                    <>
                        <button
                            type="button"
                            onClick={onSalvar}
                            disabled={salvando}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 py-3.5 font-bold text-amber-950 shadow-sm shadow-amber-500/20 transition hover:bg-amber-400 active:scale-[0.99] disabled:opacity-60"
                        >
                            {salvando ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Save className="h-5 w-5" aria-hidden="true" />}
                            {salvando ? 'Salvando…' : 'Salvar em Minhas transcrições'}
                        </button>
                        <p className="text-center text-[11px] text-text-muted">Ainda não está salva: se sair sem salvar, ela se perde.</p>
                    </>
                )}
                <div className="grid grid-cols-3 gap-2">
                    <BotaoAcao icone={copiado ? Check : Copy} rotulo={copiado ? 'Copiado' : 'Copiar'} variante={copiado ? 'feito' : 'padrao'} onClick={copiar} />
                    <BotaoAcao icone={Share2} rotulo="Compartilhar" onClick={compartilhar} />
                    <BotaoAcao icone={FileText} rotulo="Arquivo" ariaLabel="Arquivo de texto (.txt)" onClick={enviarArquivo} />
                </div>
                <span className="sr-only" aria-live="polite">{copiado ? 'Texto copiado' : ''}</span>
            </div>

            <div className="relative mt-4 px-4">
                <div className="reading-serif max-h-44 space-y-3 overflow-hidden text-[16px] leading-[1.75] text-text-secondary">
                    {previa.map((paragrafo, i) => <p key={i}>{paragrafo}</p>)}
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-surface-1 to-transparent" aria-hidden="true" />
            </div>
            <div className="p-4 pt-3">
                <button
                    type="button"
                    onClick={onLer}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border-subtle bg-surface-2/60 py-3 font-semibold text-text-primary transition hover:border-amber-500/40 active:scale-[0.99]"
                >
                    <BookOpen className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" /> Ler transcrição completa
                </button>
            </div>
        </section>
    );
}
