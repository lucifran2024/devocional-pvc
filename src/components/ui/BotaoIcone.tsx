'use client';

import type { ReactNode } from 'react';

// Botões compactos do início (12/11/2026, 2º ajuste: os três quadradões de
// 58 px pesavam demais). A área de toque continua com 44 px; o que diminuiu
// foi o peso visual: sem caixa nem borda em repouso, um fundo leve só no
// toque. O BotaoAcao (com nome embaixo do ícone) segue nas telas de transcrição.
//
// 14/11/2026 ("preto, papel e ouro"): `noCampo` é a versão para dentro do
// campo invertido (a página do Versículo): as cores vêm do campo, não do tema.
// A pílula tem dois pesos: `principal` (cheia, a ação do bloco) e a comum.

const TOQUE = 'transition-[background-color,color,transform] duration-200 active:scale-90 disabled:opacity-40 disabled:active:scale-100';

/** Só o ícone; o nome vai para o leitor de tela e para a dica do computador. */
export function BotaoIcone({
    rotulo,
    onClick,
    disabled = false,
    feito = false,
    noCampo = false,
    children,
}: {
    rotulo: string;
    onClick?: () => void;
    disabled?: boolean;
    feito?: boolean;
    noCampo?: boolean;
    children: ReactNode;
}) {
    const cor = noCampo
        ? 'text-campo-texto hover:bg-campo-toque'
        : feito
            ? 'text-emerald-700 dark:text-emerald-400'
            : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary';
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={rotulo}
            title={rotulo}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${TOQUE} ${cor}`}
        >
            {children}
        </button>
    );
}

/** Pílula com ícone e nome: a ação principal do bloco. */
export function PilulaAcao({
    onClick,
    ativa = false,
    pressionada,
    principal = false,
    noCampo = false,
    children,
}: {
    onClick?: () => void;
    ativa?: boolean;
    pressionada?: boolean;
    /** Cheia: tinta sobre o papel (ou papel sobre o preto) */
    principal?: boolean;
    noCampo?: boolean;
    children: ReactNode;
}) {
    let cor: string;
    if (noCampo) {
        // Dentro do campo a pílula cheia é o contrário do campo
        cor = 'bg-campo-texto text-campo hover:opacity-90';
    } else if (ativa) {
        cor = 'bg-amber-500/15 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300';
    } else if (principal) {
        cor = 'bg-campo text-campo-texto hover:opacity-90';
    } else {
        cor = 'bg-surface-2 text-text-primary hover:bg-border-strong/50';
    }
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={pressionada}
            className={`inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold ${TOQUE} active:scale-[0.96] ${cor}`}
        >
            {children}
        </button>
    );
}
