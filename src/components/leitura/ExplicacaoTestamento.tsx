'use client';

// ===========================================
// EXPLICAR O TESTAMENTO INTEIRO (03/10/2026)
// Quadro "Antigo / Novo Testamento" no topo da leitura do dia (Ler e Explicar)
// e o painel que mostra a explicação do testamento inteiro, para o dia em que
// não der para ler tudo. O painel cobre a tela e, ao fechar, a leitura continua
// onde estava.
// ===========================================

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { X } from 'lucide-react';

import { NOME_TESTAMENTO, type Testamento } from '@/lib/explicacao-testamento';

export interface OpcaoTestamento {
    testamento: Testamento;
    referencia: string;
}

/**
 * Quadro da leitura por testamento (03/10/2026): Lucifran pediu para padronizar
 * os 4 botões do topo ("o de antes tava feio") — os amarelados de navegação
 * (Voltar ao começo / Pular direto) e os de explicar tinham estilos diferentes.
 * Agora é uma linha por testamento, com a referência e os mesmos dois botões.
 */
export function LeituraPorTestamento({ opcoes, atual, onLer, onExplicar }: {
    opcoes: OpcaoTestamento[];
    atual?: Testamento | null;
    onLer: (testamento: Testamento) => void;
    onExplicar: (testamento: Testamento) => void;
}) {
    if (!opcoes.length) return null;
    return (
        <div data-leitura-por-testamento className="w-full divide-y divide-border-subtle rounded-2xl border border-border-subtle bg-surface-1">
            {opcoes.map(o => {
                const nome = NOME_TESTAMENTO[o.testamento];
                return (
                    <div key={o.testamento} className="flex items-center gap-2 px-3 py-2">
                        <div className="min-w-0 flex-1">
                            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-text-primary">
                                <span className="truncate">{nome}</span>
                                {atual === o.testamento && (
                                    <span className="shrink-0 text-[11px] font-medium text-amber-700 dark:text-amber-400">· lendo</span>
                                )}
                            </p>
                            <p className="truncate text-xs text-text-muted">{o.referencia}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => onLer(o.testamento)}
                            aria-label={`Ler o ${nome}: ${o.referencia}`}
                            className="min-h-10 shrink-0 rounded-xl border border-border-subtle px-3 text-sm font-semibold text-text-secondary transition-colors hover:border-amber-500/40 hover:text-text-primary active:scale-[0.98]"
                        >
                            Ler
                        </button>
                        <button
                            type="button"
                            onClick={() => onExplicar(o.testamento)}
                            aria-label={`Explicar o ${nome} inteiro: ${o.referencia}`}
                            className="min-h-10 shrink-0 rounded-xl bg-amber-500/15 px-3 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-500/25 active:scale-[0.98] dark:text-amber-300"
                        >
                            Explicar
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

export interface PainelExplicacaoTestamentoProps {
    testamento: Testamento;
    referencia: string;
    conteudo: string | null;
    carregando: boolean;
    erro: boolean;
    fontSize?: number;
    onFechar: () => void;
    onTentarDeNovo: () => void;
}

export function PainelExplicacaoTestamento({
    testamento,
    referencia,
    conteudo,
    carregando,
    erro,
    fontSize = 18,
    onFechar,
    onTentarDeNovo,
}: PainelExplicacaoTestamentoProps) {
    // Esc fecha. A página de trás fica como está: o painel cobre a tela e tem
    // rolagem própria; ao fechar, a leitura continua no mesmo ponto.
    useEffect(() => {
        const fecharComEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar(); };
        window.addEventListener('keydown', fecharComEsc);
        return () => window.removeEventListener('keydown', fecharComEsc);
    }, [onFechar]);

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label={`Explicação do ${NOME_TESTAMENTO[testamento]}: ${referencia}`}
            className="fixed inset-0 z-[70] flex flex-col bg-surface-0 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
            <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
                <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-text-muted font-semibold truncate">
                        Explicação da leitura de hoje
                    </p>
                    <h2 className="font-bold text-text-primary text-base truncate">{NOME_TESTAMENTO[testamento]} · {referencia}</h2>
                </div>
                <button
                    type="button"
                    onClick={onFechar}
                    aria-label="Fechar a explicação"
                    className="shrink-0 p-2.5 -mr-1 rounded-full text-text-muted hover:bg-surface-2 hover:text-text-primary transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5">
                <div className="mx-auto w-full max-w-3xl">
                    {carregando ? (
                        <div role="status">
                            <p className="text-[13px] font-medium text-text-muted">Preparando a explicação de {referencia}…</p>
                            <p className="mt-1 text-[13px] text-text-muted">Na primeira vez leva até um minuto; depois fica guardada para todos.</p>
                            <div className="mt-5 space-y-2.5 animate-pulse" aria-hidden="true">
                                <div className="h-3 w-2/5 rounded-full bg-surface-2" />
                                <div className="h-3 rounded-full bg-surface-2" />
                                <div className="h-3 w-11/12 rounded-full bg-surface-2" />
                                <div className="h-3 w-4/5 rounded-full bg-surface-2" />
                                <div className="h-3 w-3/5 rounded-full bg-surface-2 mt-6" />
                                <div className="h-3 rounded-full bg-surface-2" />
                                <div className="h-3 w-10/12 rounded-full bg-surface-2" />
                            </div>
                        </div>
                    ) : erro || !conteudo ? (
                        <div role="alert" className="rounded-2xl border border-border-subtle bg-surface-1 px-5 py-4">
                            <p className="text-sm text-text-secondary">Não foi possível preparar a explicação agora.</p>
                            <button
                                type="button"
                                onClick={onTentarDeNovo}
                                className="mt-3 min-h-11 rounded-xl border border-border-subtle bg-surface-2 px-4 text-sm font-medium text-text-primary transition-colors hover:border-amber-500/30 active:scale-[0.98]"
                            >
                                Tentar de novo
                            </button>
                        </div>
                    ) : (
                        <>
                            <div
                                data-explicacao-testamento
                                className="leading-relaxed break-words text-text-secondary [&_h3]:hidden [&_h4:first-of-type]:mt-0 [&_h4]:mt-6 [&_h4]:font-semibold [&_h4]:leading-snug [&_h4]:text-text-primary [&_p]:mt-1.5 [&_strong]:font-semibold [&_strong]:text-text-primary [&_em]:text-text-primary/80 [&_hr]:hidden"
                                style={{ fontSize: `${Math.max(16, fontSize - 2)}px` }}
                            >
                                <ReactMarkdown>{conteudo}</ReactMarkdown>
                            </div>
                            <button
                                type="button"
                                onClick={onFechar}
                                className="mt-8 mb-4 w-full min-h-12 rounded-xl border border-border-subtle bg-surface-1 text-text-primary font-medium transition-colors hover:border-amber-500/30 active:scale-[0.98]"
                            >
                                Voltar à leitura
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}
