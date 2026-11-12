'use client';

import Link from 'next/link';
import { ChevronRight, type LucideIcon } from 'lucide-react';

interface DashboardCardProps {
    href: string;
    title: string;
    desc: string;
    icon: LucideIcon;
}

// Linha de atalho do início (12/11/2026, 2º ajuste). Os cartões iguais com
// ícone em quadradinho colorido deixavam a tela "comum"; cada grupo virou um
// cartão dividido em linhas (GrupoDeAtalhos, em app/page.tsx). Ícone simples,
// cinza, que fica âmbar no toque; a seta anda um pouco. A linha inteira é o botão.
export function DashboardCard({ href, title, desc, icon: Icon }: DashboardCardProps) {
    return (
        <Link
            href={href}
            className="group flex min-h-16 items-center gap-3.5 px-5 py-3 transition-colors duration-200 hover:bg-surface-2/60 active:bg-surface-2"
        >
            <Icon
                className="h-5 w-5 shrink-0 text-text-muted transition-[color,transform] duration-200 group-hover:text-amber-700 group-active:scale-90 group-active:text-amber-700 dark:group-hover:text-amber-400 dark:group-active:text-amber-400"
                aria-hidden="true"
            />
            <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold leading-snug text-text-primary">{title}</span>
                <span className="block text-[13px] leading-snug text-text-secondary">{desc}</span>
            </span>
            <ChevronRight
                className="h-5 w-5 shrink-0 text-text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-active:translate-x-1"
                aria-hidden="true"
            />
        </Link>
    );
}
