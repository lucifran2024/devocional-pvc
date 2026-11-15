'use client';

// Liga/desliga de uma linha (14/11/2026), para as preferências de leitura.
// A linha inteira é o botão (44 px de altura); a bolinha só mostra o estado.
export function Interruptor({ rotulo, ligado, onMudar }: {
    rotulo: string;
    ligado: boolean;
    onMudar: (ligado: boolean) => void;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={ligado}
            onClick={() => onMudar(!ligado)}
            className="flex min-h-11 w-full items-center justify-between gap-3 text-left"
        >
            <span className="text-xs font-semibold text-text-secondary">{rotulo}</span>
            <span
                aria-hidden="true"
                className={`relative h-6 w-10 shrink-0 rounded-full transition-colors duration-200 ${ligado ? 'bg-amber-500' : 'bg-border-strong'}`}
            >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${ligado ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
            </span>
        </button>
    );
}
