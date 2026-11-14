// Marca do app (14/11/2026): a Bíblia com a fita marcadora do ícone, desenhada
// nas cores do tema. O livro usa a cor do "campo" (papel no escuro, tinta no
// claro), a cruz é vazada na cor do fundo e a fita é o vermelho do ícone.
export function MarcaBiblia({ className = 'h-7 w-7' }: { className?: string }) {
    return (
        <svg viewBox="0 0 28 28" className={className} aria-hidden="true" focusable="false">
            <rect x="5" y="3.5" width="18" height="21" rx="3.2" fill="var(--campo)" />
            <path d="M8.6 3.5v21" stroke="var(--bg-surface-0)" strokeOpacity="0.28" strokeWidth="1" />
            <path d="M14.6 10.2v9M11.5 13.3h6.2" stroke="var(--bg-surface-0)" strokeWidth="2.1" strokeLinecap="round" />
            <path d="M18.4 3.5h2.9v7.3l-1.45-1.5-1.45 1.5z" fill="var(--fita)" />
        </svg>
    );
}
