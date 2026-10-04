'use client';

import { Loader2, type LucideIcon } from 'lucide-react';

type Variante = 'padrao' | 'barra' | 'primario' | 'feito';

const CORES: Record<Variante, string> = {
    padrao: 'border border-border-subtle bg-surface-2/60 text-text-primary hover:border-amber-500/40 hover:bg-amber-500/10',
    barra: 'text-text-secondary hover:bg-amber-500/10 hover:text-text-primary',
    primario: 'bg-amber-500 text-amber-950 shadow-sm hover:bg-amber-400',
    feito: 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
};

// Botão de ação com ícone e nome visível (Copiar, Compartilhar, Arquivo, Salvar…).
export function BotaoAcao({
    icone: Icone,
    rotulo,
    onClick,
    ariaLabel,
    variante = 'padrao',
    carregando = false,
    disabled = false,
}: {
    icone: LucideIcon;
    rotulo: string;
    onClick?: () => void;
    ariaLabel?: string;
    variante?: Variante;
    carregando?: boolean;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled || carregando}
            aria-label={ariaLabel}
            className={`flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-2 text-[12px] font-semibold transition active:scale-[0.97] disabled:opacity-60 ${CORES[variante]}`}
        >
            {carregando
                ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                : <Icone className="h-5 w-5" aria-hidden="true" />}
            <span className="max-w-full truncate leading-none">{rotulo}</span>
        </button>
    );
}
