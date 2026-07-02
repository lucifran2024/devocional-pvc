'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
    /** Destino do voltar. Se omitido, usa router.back(). */
    href?: string;
    label?: string;
    className?: string;
}

const baseClasses = `inline-flex items-center gap-2 pl-3 pr-4 py-2 rounded-full
    bg-white/80 dark:bg-surface-1/80 backdrop-blur-md
    border border-slate-200 dark:border-border-subtle
    text-sm font-medium text-slate-600 dark:text-text-secondary shadow-sm
    hover:text-slate-900 dark:hover:text-text-primary
    hover:border-amber-400/50 dark:hover:border-amber-500/40
    transition-all duration-200 group`;

export function BackButton({ href, label = 'Voltar', className = '' }: BackButtonProps) {
    const router = useRouter();

    const inner = (
        <>
            <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
            <span>{label}</span>
        </>
    );

    if (href) {
        return (
            <Link href={href} className={`${baseClasses} ${className}`}>
                {inner}
            </Link>
        );
    }

    return (
        <button type="button" onClick={() => router.back()} className={`${baseClasses} ${className}`}>
            {inner}
        </button>
    );
}
