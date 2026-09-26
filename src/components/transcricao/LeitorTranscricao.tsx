'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Check, CircleCheck, Copy, Edit3, ExternalLink, FileText, Loader2, Save, Share2, Trash2, X } from 'lucide-react';
import { atualizarTextoTranscricao } from '@/lib/transcricoes';
import {
    contarPalavras,
    descreverPalavras,
    extrairIdYoutube,
    formatarDataTranscricao,
    linkDoVideo,
    paragrafosParaLeitura,
    tempoLeitura,
} from '@/lib/transcricao-apresentacao';
import { useAcoesTranscricao, type Avisar } from '@/hooks/useAcoesTranscricao';
import { BotaoAcao } from './BotaoAcao';
import { MiniaturaVideo } from './MiniaturaVideo';

export interface LeitorTranscricaoProps {
    titulo: string;
    texto: string;
    fonteUrl?: string | null;
    criadoEm?: string | null;
    /** Descrição da origem, ex.: "Legenda do YouTube · português". */
    origem?: string | null;
    /** Id em Minhas transcrições; sem ele, a transcrição ainda não foi salva. */
    salvoId?: string | null;
    salvando?: boolean;
    onFechar: () => void;
    onSalvar?: () => void;
    /** Chamado depois que a edição foi gravada; quem abriu atualiza o `texto`. */
    onTextoSalvo?: (id: string, texto: string) => void;
    onExcluir?: (id: string) => Promise<boolean>;
    avisar?: Avisar;
}

// Leitura em tela cheia de uma transcrição, com as ações sempre à mão.
export function LeitorTranscricao({
    titulo,
    texto,
    fonteUrl,
    criadoEm,
    origem,
    salvoId,
    salvando = false,
    onFechar,
    onSalvar,
    onTextoSalvo,
    onExcluir,
    avisar,
}: LeitorTranscricaoProps) {
    const idTitulo = useId();
    const idEditor = useId();
    const voltarRef = useRef<HTMLButtonElement>(null);
    const [editando, setEditando] = useState(false);
    const [rascunho, setRascunho] = useState(texto);
    const [salvandoEdicao, setSalvandoEdicao] = useState(false);
    const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
    const [excluindo, setExcluindo] = useState(false);
    const { copiado, copiar, compartilhar, enviarArquivo } = useAcoesTranscricao({ titulo, texto, fonteUrl, avisar });

    const paragrafos = useMemo(() => paragrafosParaLeitura(texto), [texto]);
    const palavras = useMemo(() => contarPalavras(texto), [texto]);
    const link = linkDoVideo(fonteUrl);
    const temCapa = !!extrairIdYoutube(fonteUrl);
    const detalhes = [
        formatarDataTranscricao(criadoEm),
        origem,
        descreverPalavras(palavras),
        tempoLeitura(palavras),
    ].filter(Boolean).join(' · ');
    const alterado = editando && rascunho.trim() !== texto.trim();

    const fechar = useCallback(() => {
        if (alterado && !window.confirm('Descartar as alterações que você fez?')) return;
        onFechar();
    }, [alterado, onFechar]);

    const cancelarEdicao = useCallback(() => {
        if (alterado && !window.confirm('Descartar as alterações que você fez?')) return;
        setRascunho(texto);
        setEditando(false);
    }, [alterado, texto]);

    // Aberto: foco no Voltar e a página de trás não rola; ao fechar, o foco volta.
    useEffect(() => {
        const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        voltarRef.current?.focus();
        const overflowAntes = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = overflowAntes;
            anterior?.focus();
        };
    }, []);

    // Esc: fecha a confirmação, depois a edição, depois a leitura
    useEffect(() => {
        const aoTeclar = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (confirmandoExclusao) setConfirmandoExclusao(false);
            else if (editando) cancelarEdicao();
            else fechar();
        };
        window.addEventListener('keydown', aoTeclar);
        return () => window.removeEventListener('keydown', aoTeclar);
    }, [confirmandoExclusao, editando, cancelarEdicao, fechar]);

    const editar = () => {
        setRascunho(texto);
        setConfirmandoExclusao(false);
        setEditando(true);
    };

    const salvarEdicao = async () => {
        const limpo = rascunho.trim();
        if (!salvoId || !limpo || salvandoEdicao) return;
        setSalvandoEdicao(true);
        const ok = await atualizarTextoTranscricao(salvoId, limpo);
        setSalvandoEdicao(false);
        if (!ok) {
            avisar?.('error', 'Não foi possível salvar. Tente novamente.');
            return;
        }
        onTextoSalvo?.(salvoId, limpo);
        setRascunho(limpo);
        setEditando(false);
        avisar?.('success', 'Alterações salvas.');
    };

    const confirmarExclusao = async () => {
        if (!salvoId || !onExcluir || excluindo) return;
        setExcluindo(true);
        const ok = await onExcluir(salvoId);
        setExcluindo(false);
        if (ok) setConfirmandoExclusao(false);
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[65] flex justify-center bg-black/50 backdrop-blur-sm animate-[fadeIn_150ms_ease-out] motion-reduce:animate-none md:p-6"
            onMouseDown={(e) => { if (e.target === e.currentTarget) fechar(); }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={idTitulo}
                className="relative flex h-full w-full flex-col overflow-hidden bg-surface-0 shadow-2xl animate-[slideUp_220ms_ease-out] motion-reduce:animate-none md:max-w-3xl md:rounded-3xl md:border md:border-border-subtle"
            >
                {/* Topo */}
                <div className="flex items-center gap-2 border-b border-border-subtle bg-surface-1/95 px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur">
                    <button
                        ref={voltarRef}
                        type="button"
                        onClick={fechar}
                        className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-semibold text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
                    >
                        <ArrowLeft className="h-5 w-5" aria-hidden="true" /> Voltar
                    </button>
                    {salvoId ? (
                        <span className="ml-auto flex items-center gap-1.5 pr-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                            <CircleCheck className="h-4 w-4" aria-hidden="true" /> Em Minhas transcrições
                        </span>
                    ) : (
                        <span className="ml-auto pr-2 text-xs font-semibold text-amber-700 dark:text-amber-300">Ainda não salva</span>
                    )}
                </div>

                {/* Texto */}
                <div className="flex-1 overflow-y-auto overscroll-contain">
                    <div className="mx-auto w-full max-w-2xl px-4 pb-10 pt-5 sm:px-8">
                        <div className="flex gap-3">
                            {temCapa && <MiniaturaVideo fonteUrl={fonteUrl} className="aspect-video w-32 shrink-0 self-start sm:w-44" />}
                            <div className="min-w-0 flex-1">
                                <h2 id={idTitulo} className="reading-serif text-xl font-semibold leading-snug text-text-primary sm:text-2xl">{titulo}</h2>
                                {detalhes && <p className="mt-1.5 text-xs leading-relaxed text-text-muted">{detalhes}</p>}
                            </div>
                        </div>

                        {(link || (salvoId && onExcluir && !editando)) && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {link && (
                                    <a
                                        href={link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-1 px-3.5 py-2 text-sm font-semibold text-text-secondary transition-colors hover:border-amber-500/40 hover:text-text-primary"
                                    >
                                        <ExternalLink className="h-4 w-4" aria-hidden="true" /> Abrir no YouTube
                                    </a>
                                )}
                                {salvoId && onExcluir && !editando && (
                                    <button
                                        type="button"
                                        onClick={() => setConfirmandoExclusao(true)}
                                        className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-1 px-3.5 py-2 text-sm font-semibold text-text-secondary transition-colors hover:border-red-400/50 hover:text-red-500"
                                    >
                                        <Trash2 className="h-4 w-4" aria-hidden="true" /> Excluir
                                    </button>
                                )}
                            </div>
                        )}

                        {confirmandoExclusao && (
                            <div role="alert" className="mt-3 space-y-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
                                <div>
                                    <p className="text-sm font-semibold text-red-700 dark:text-red-300">Excluir esta transcrição?</p>
                                    <p className="mt-1 text-xs text-text-secondary">Ela sai de Minhas transcrições e não dá para desfazer.</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setConfirmandoExclusao(false)}
                                        className="min-h-[44px] flex-1 rounded-xl border border-border-subtle bg-surface-1 text-sm font-semibold text-text-secondary"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={confirmarExclusao}
                                        disabled={excluindo}
                                        className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-500 text-sm font-bold text-white disabled:opacity-60"
                                    >
                                        {excluindo ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
                                        Sim, excluir
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="mt-6">
                            {editando ? (
                                <>
                                    <label htmlFor={idEditor} className="text-xs font-semibold uppercase tracking-wider text-amber-700/80 dark:text-amber-400/70">
                                        Editando o texto
                                    </label>
                                    <textarea
                                        id={idEditor}
                                        value={rascunho}
                                        onChange={(e) => setRascunho(e.target.value)}
                                        className="mt-2 min-h-[60vh] w-full resize-y rounded-2xl border border-border-subtle bg-surface-1 p-4 text-base leading-relaxed text-text-primary focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                    />
                                </>
                            ) : (
                                <article className="reading-serif space-y-5 text-[17px] leading-[1.8] text-text-primary">
                                    {paragrafos.map((paragrafo, i) => (
                                        <p key={i} className="whitespace-pre-line">{paragrafo}</p>
                                    ))}
                                </article>
                            )}
                        </div>
                    </div>
                </div>

                {/* Ações */}
                <div className="border-t border-border-subtle bg-surface-1/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur">
                    {editando ? (
                        <div className="mx-auto flex max-w-2xl gap-2 px-1 pb-1">
                            <button
                                type="button"
                                onClick={cancelarEdicao}
                                className="flex min-h-[52px] flex-1 items-center justify-center gap-1.5 rounded-2xl border border-border-subtle text-sm font-semibold text-text-secondary"
                            >
                                <X className="h-4 w-4" aria-hidden="true" /> Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={salvarEdicao}
                                disabled={salvandoEdicao || !rascunho.trim()}
                                className="flex min-h-[52px] flex-[2] items-center justify-center gap-1.5 rounded-2xl bg-amber-500 text-sm font-bold text-amber-950 disabled:opacity-60"
                            >
                                {salvandoEdicao ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                                Salvar alterações
                            </button>
                        </div>
                    ) : (
                        <div className="mx-auto grid max-w-2xl grid-cols-4 gap-1">
                            <BotaoAcao
                                variante={copiado ? 'feito' : 'barra'}
                                icone={copiado ? Check : Copy}
                                rotulo={copiado ? 'Copiado' : 'Copiar'}
                                onClick={copiar}
                            />
                            <BotaoAcao variante="barra" icone={Share2} rotulo="Compartilhar" onClick={compartilhar} />
                            <BotaoAcao variante="barra" icone={FileText} rotulo="Arquivo" ariaLabel="Arquivo de texto (.txt)" onClick={enviarArquivo} />
                            {salvoId ? (
                                <BotaoAcao variante="barra" icone={Edit3} rotulo="Editar" onClick={editar} />
                            ) : (
                                <BotaoAcao
                                    variante="primario"
                                    icone={Save}
                                    rotulo={salvando ? 'Salvando…' : 'Salvar'}
                                    carregando={salvando}
                                    disabled={!onSalvar}
                                    onClick={onSalvar}
                                />
                            )}
                        </div>
                    )}
                    <span className="sr-only" aria-live="polite">{copiado ? 'Texto copiado' : ''}</span>
                </div>
            </div>
        </div>,
        document.body,
    );
}
