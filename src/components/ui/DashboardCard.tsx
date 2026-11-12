'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

interface DashboardCardProps {
    href: string;
    title: string;
    desc: string;
    icon: LucideIcon;
}

// Cartão de atalho do início (12/11/2026): compacto, em grade de 2 colunas.
// O cartão inteiro é o botão. Saíram a etiqueta que repetia o título
// ("Caderno" no Caderno), o rodapé "ACESSAR" e o realce em degradê.
export function DashboardCard({ href, title, desc, icon: Icon }: DashboardCardProps) {
    return (
        <Link
            href={href}
            className="cartao group flex h-full min-h-[132px] flex-col gap-3 p-4 transition-colors hover:border-amber-500/45 active:scale-[0.98] dark:hover:bg-surface-2"
        >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400" aria-hidden="true">
                <Icon className="h-5 w-5" />
            </span>
            <span className="flex flex-col gap-1">
                <span className="reading-serif text-[17px] font-semibold leading-snug text-text-primary">{title}</span>
                <span className="text-[13px] leading-snug text-text-secondary">{desc}</span>
            </span>
        </Link>
    );
}
