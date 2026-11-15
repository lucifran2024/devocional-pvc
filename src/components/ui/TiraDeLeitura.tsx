'use client';

import { createPortal } from 'react-dom';

// Tira do capítulo (14/11/2026). Enquanto se lê rolando, o nome do capítulo
// fica numa tira lisa, da largura da tela, com o fundo da própria página. Ela
// substitui o selo flutuante de antes, que era transparente e cobria a
// primeira linha do texto (ressalva do parecer independente de 14/11). O
// texto passa por baixo de uma borda limpa; a linha de ouro é o quanto do
// capítulo já foi lido. Tocar na tira traz a barra de volta.
// Vai por portal: escapa de qualquer transform da página.
export function TiraDeLeitura({ titulo, progresso, onTocar, rotulo }: {
    titulo: string;
    /** de 0 a 1; sem ele a tira não mostra a linha de progresso */
    progresso?: number;
    onTocar?: () => void;
    rotulo?: string;
}) {
    if (typeof document === 'undefined') return null;
    return createPortal(
        <div data-tira-leitura className="fixed inset-x-0 top-0 z-[60] animate-[fadeIn_0.15s_ease-out] bg-surface-0 pt-[env(safe-area-inset-top)] md:left-[88px]">
            <button
                type="button"
                onClick={onTocar}
                aria-label={rotulo ?? `${titulo}. Mostrar a barra`}
                className="flex h-9 w-full items-center justify-center px-5 text-[0.8125rem] font-semibold text-text-secondary"
            >
                <span className="truncate">{titulo}</span>
            </button>
            <div className="h-px w-full bg-border-subtle" aria-hidden="true">
                {progresso != null && (
                    <div className="h-full origin-left bg-amber-500" style={{ transform: `scaleX(${Math.min(1, Math.max(0, progresso))})` }} />
                )}
            </div>
        </div>,
        document.body,
    );
}
