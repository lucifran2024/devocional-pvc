'use client';

import { ArrowRight, Check, Lightbulb, Loader2 } from 'lucide-react';

// ===========================================
// FIM DA PARTE — fecha cada parte da Leitura do Dia.
// Mostra onde o leitor está (Parte N de M), o que vem a seguir (próximo
// capítulo e título da seção, da lista de perícopes, sem IA) e as ações.
// Substitui as frases de instrução que ficavam depois dos versículos e o
// cartão com o botão grande "Marcar parte como lida" (Continuar já marca).
// ===========================================

export interface FimDaParteProps {
    parte: number;
    totalPartes: number;
    /** Partes já registradas como lidas (1 = primeira). */
    partesLidas: number[];
    /** Capítulo da parte atual, ex.: "Salmos 84". */
    capituloAtual: string;
    /** Próxima parte; null na última. */
    proxima: { capitulo: string; secao?: string } | null;
    /** Passagem inteira do dia, ex.: "Salmos 84-88". */
    passagem: string;
    /** Leitura do dia inteira concluída. */
    concluida: boolean;
    /** Carregando a próxima parte ou a explicação: desativa as ações. */
    ocupado?: boolean;
    explicando?: boolean;
    onContinuar: () => void;
    /** Sem ele, o botão Explicar não aparece. */
    onExplicar?: () => void;
    /** Marcação manual da parte (só na leitura pessoal). */
    marcacao?: { lida: boolean; carregando: boolean; onAlternar: () => void } | null;
    /** Progresso do ano (só na leitura pessoal). */
    anual?: { lidos: number; total: number; pct: number } | null;
}

function BotaoMarcar({ parte, varias, lida, carregando, onAlternar }: {
    parte: number;
    varias: boolean;
    lida: boolean;
    carregando: boolean;
    onAlternar: () => void;
}) {
    const rotulo = lida
        ? `${varias ? `Parte ${parte} lida` : 'Leitura marcada como lida'}. Toque para desmarcar`
        : varias ? `Marcar parte ${parte} como lida` : 'Marcar leitura como lida';
    return (
        <button
            type="button"
            onClick={onAlternar}
            disabled={carregando}
            aria-label={rotulo}
            aria-pressed={lida}
            className={`shrink-0 inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors active:scale-[0.98] disabled:opacity-60 ${lida
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : 'border border-border-strong text-text-secondary hover:border-amber-500/50 hover:text-text-primary'}`}
        >
            {carregando
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : lida && <Check className="h-4 w-4" />}
            {lida ? 'Lida' : 'Marcar como lida'}
        </button>
    );
}

export function FimDaParte({
    parte,
    totalPartes,
    partesLidas,
    capituloAtual,
    proxima,
    passagem,
    concluida,
    ocupado = false,
    explicando = false,
    onContinuar,
    onExplicar,
    marcacao,
    anual,
}: FimDaParteProps) {
    const varias = totalPartes > 1;
    const ultima = parte >= totalPartes;
    const lidas = new Set(partesLidas);
    // Dia já concluído na última parte: "Concluir leitura" não tem mais o que fazer
    const mostrarPrincipal = !(ultima && concluida);

    return (
        <section
            aria-label={varias ? `Fim da parte ${parte} de ${totalPartes}` : 'Fim da leitura'}
            data-fim-parte
            className="border-t border-border-subtle pt-4"
        >
            {/* Onde o leitor está */}
            <div className="flex min-h-11 items-center justify-between gap-3">
                <p className="min-w-0 text-[15px] leading-snug">
                    {varias && (
                        <>
                            <span className="font-semibold text-text-primary tabular-nums">Parte {parte} de {totalPartes}</span>
                            <span aria-hidden="true" className="text-text-muted"> · </span>
                        </>
                    )}
                    <span className={varias ? 'text-text-secondary' : 'font-semibold text-text-primary'}>{capituloAtual}</span>
                </p>
                {marcacao && (
                    <BotaoMarcar
                        parte={parte}
                        varias={varias}
                        lida={marcacao.lida}
                        carregando={marcacao.carregando}
                        onAlternar={marcacao.onAlternar}
                    />
                )}
            </div>

            {varias && (
                <ol aria-hidden="true" className="mt-2 flex gap-1.5">
                    {Array.from({ length: totalPartes }, (_, i) => i + 1).map((p) => {
                        const estado = lidas.has(p) ? 'lida' : p === parte ? 'atual' : 'pendente';
                        return (
                            <li
                                key={p}
                                data-testid="segmento-parte"
                                data-estado={estado}
                                className={`h-1 flex-1 rounded-full transition-colors ${estado === 'lida'
                                    ? 'bg-amber-500'
                                    : estado === 'atual' ? 'bg-amber-500/45' : 'bg-border-strong/70'}`}
                            />
                        );
                    })}
                </ol>
            )}

            {/* O que vem a seguir (ou o fim do dia) */}
            {proxima ? (
                <div className="mt-6">
                    <p className="text-[13px] font-medium text-text-muted">A seguir</p>
                    <p className="reading-serif mt-1 text-xl leading-tight text-text-primary">{proxima.capitulo}</p>
                    {proxima.secao && <p className="mt-1 text-sm text-text-secondary">{proxima.secao}</p>}
                </div>
            ) : concluida ? (
                <div className="mt-6 flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                        <Check className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                        <p className="font-semibold text-text-primary">Leitura de hoje concluída</p>
                        <p className="text-sm text-text-muted">{passagem}</p>
                    </div>
                </div>
            ) : varias && ultima ? (
                <p className="mt-6 text-sm text-text-secondary">Última parte da leitura de hoje.</p>
            ) : null}

            {/* Ações */}
            {(mostrarPrincipal || onExplicar) && (
            <div className="mt-6 flex gap-3">
                {mostrarPrincipal && (
                    <button
                        type="button"
                        onClick={onContinuar}
                        disabled={ocupado}
                        className="btn-premium flex-1 min-h-12 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                    >
                        {ultima ? <Check className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
                        {ultima ? 'Concluir leitura' : 'Continuar'}
                    </button>
                )}
                {onExplicar && (
                    <button
                        type="button"
                        onClick={onExplicar}
                        disabled={ocupado}
                        className={`${mostrarPrincipal ? 'px-5' : 'flex-1'} min-h-12 rounded-xl border border-border-subtle bg-surface-2 text-text-primary flex items-center justify-center gap-2 transition-colors hover:border-amber-500/30 active:scale-[0.98] disabled:opacity-50`}
                    >
                        {explicando
                            ? <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                            : <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
                        {explicando ? 'Gerando...' : 'Explicar'}
                    </button>
                )}
            </div>
            )}

            {/* Progresso do ano (secundário) */}
            {anual && anual.total > 0 && (
                <div className="mt-6">
                    <div className="flex items-baseline justify-between gap-3 text-[13px]">
                        <span className="text-text-muted">Sua leitura no ano</span>
                        <span className="tabular-nums text-text-secondary">{anual.lidos} de {anual.total} {anual.total === 1 ? 'dia' : 'dias'}</span>
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-border-subtle">
                        <div
                            className="h-full rounded-full bg-amber-500/80 transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(anual.pct, anual.lidos > 0 ? 2 : 0))}%` }}
                        />
                    </div>
                </div>
            )}
        </section>
    );
}
