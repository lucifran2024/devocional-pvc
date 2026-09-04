'use client';

import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react';
import type { BibliaReadingAlign } from '@/lib/biblia-reading-align';

const OPCOES: {
    valor: BibliaReadingAlign;
    label: string;
    aria: string;
    Icon: typeof AlignLeft;
}[] = [
    { valor: 'left', label: 'Esquerda', aria: 'Alinhar à esquerda', Icon: AlignLeft },
    { valor: 'center', label: 'Centro', aria: 'Alinhar ao centro', Icon: AlignCenter },
    { valor: 'right', label: 'Direita', aria: 'Alinhar à direita', Icon: AlignRight },
];

export function BibliaReadingAlignControls({
    value,
    onChange,
}: {
    value: BibliaReadingAlign;
    onChange: (align: BibliaReadingAlign) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-text-secondary">Alinhamento</span>
            <div className="flex items-center gap-1.5" role="group" aria-label="Alinhamento da leitura">
                {OPCOES.map(({ valor, label, aria, Icon }) => (
                    <button
                        key={valor}
                        type="button"
                        onClick={() => onChange(valor)}
                        className={`p-2 rounded-lg transition-colors ${
                            value === valor
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                : 'hover:bg-surface-2 text-text-secondary'
                        }`}
                        title={label}
                        aria-label={aria}
                        aria-pressed={value === valor}
                    >
                        <Icon className="w-4 h-4" />
                    </button>
                ))}
            </div>
        </div>
    );
}
