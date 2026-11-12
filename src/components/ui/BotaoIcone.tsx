'use client';

import type { ReactNode } from 'react';

// Botões compactos dos cartões do início (12/11/2026, 2º ajuste: os três
// quadradões de 58 px pesavam demais no fim de cada cartão). A área de toque
// continua com 44 px; o que diminuiu foi o peso visual: sem caixa nem borda
// em repouso, um fundo leve só no toque. O BotaoAcao (com nome embaixo do
// ícone) segue nas telas de transcrição.

const TOQUE = 'transition-[background-color,color,transform] duration-200 active:scale-90 disabled:opacity-40 disabled:active:scale-100';

/** Só o ícone; o nome vai para o leitor de tela e para a dica do computador. */
export function BotaoIcone({
    rotulo,
    onClick,
    disabled = false,
    feito = false,
    children,
}: {
    rotulo: string;
    onClick?: () => void;
    disabled?: boolean;
    feito?: boolean;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={rotulo}
            title={rotulo}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${TOQUE} ${feito
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'}`}
        >
            {children}
        </button>
    );
}

/** Pílula com ícone e nome: a ação principal do cartão. */
export function PilulaAcao({
    onClick,
    ativa = false,
    pressionada,
    children,
}: {
    onClick?: () => void;
    ativa?: boolean;
    pressionada?: boolean;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={pressionada}
            className={`inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold ${TOQUE} active:scale-[0.96] ${ativa
                ? 'bg-amber-500/15 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                : 'bg-surface-2/70 text-text-primary hover:bg-surface-2'}`}
        >
            {children}
        </button>
    );
}
