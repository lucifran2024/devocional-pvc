'use client';

import Link from 'next/link';
import { ChevronRight, type LucideIcon } from 'lucide-react';

interface DashboardCardProps {
    href: string;
    title: string;
    desc: string;
    icon: LucideIcon;
    /** Linha de cima existe: desenha a divisória a partir do texto */
    divisoria?: boolean;
}

// Linha de atalho do início (12/11/2026, 2º ajuste). Os cartões iguais com
// ícone em quadradinho colorido deixavam a tela "comum"; cada grupo virou um
// cartão dividido em linhas (GrupoDeAtalhos, em app/page.tsx). A linha inteira
// é o botão; a seta anda um pouco no toque.
// 5º ajuste ("as listas ficaram legais, mas não excelentes"): ícone âmbar num
// lugar fixo (o cinza parecia desligado), título 16 px e descrição 14 px, a
// divisória começa no texto e passa por baixo da seta, e o mesmo recuo de
// dentro dos cartões (16 px no celular).
export function DashboardCard({ href, title, desc, icon: Icon, divisoria = false }: DashboardCardProps) {
    return (
        <Link
            href={href}
            className="group flex items-center gap-3.5 pl-4 transition-colors duration-200 hover:bg-surface-2/60 active:bg-surface-2 md:pl-7"
        >
            <Icon
                className="h-[22px] w-[22px] shrink-0 text-amber-700 transition-transform duration-200 group-active:scale-90 dark:text-amber-400"
                aria-hidden="true"
            />
            <span
                data-divisoria
                className={`flex min-h-[4.25rem] min-w-0 flex-1 items-center gap-3 py-3 pr-4 md:pr-7 ${divisoria ? 'border-t border-border-subtle' : ''}`}
            >
                <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold leading-snug text-text-primary">{title}</span>
                    <span className="mt-0.5 block text-sm leading-snug text-text-secondary">{desc}</span>
                </span>
                <ChevronRight
                    className="h-[18px] w-[18px] shrink-0 text-text-muted opacity-70 transition-transform duration-200 group-hover:translate-x-0.5 group-active:translate-x-1"
                    aria-hidden="true"
                />
            </span>
        </Link>
    );
}
