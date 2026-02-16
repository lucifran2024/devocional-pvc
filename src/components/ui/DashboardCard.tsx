'use client';

import Link from 'next/link';
import { ArrowRight, LucideIcon } from 'lucide-react';

interface DashboardCardProps {
    href?: string;
    title: string;
    desc: string;
    icon: LucideIcon;
    accentColor?: string;
    disabled?: boolean;
    badge?: string;
}

export function DashboardCard({
    href,
    title,
    desc,
    icon: Icon,
    accentColor = "text-indigo-400",
    disabled = false,
    badge
}: DashboardCardProps) {
    const CardContent = (
        <div className={`
      relative group h-full w-full p-6 lg:p-8 rounded-3xl 
      glass-card
      flex flex-col items-start justify-between gap-6
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    `}>
            {/* Background Glow */}
            <div className={`absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-10 transition-opacity duration-700`}>
                <Icon className="w-32 h-32 -mr-10 -mt-10 rotate-12 text-current" />
            </div>

            <div className="z-10 w-full">
                {/* Header with Icon */}
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-4 rounded-2xl bg-surface-2 border border-border-subtle ${accentColor} group-hover:scale-110 transition-transform duration-500 shadow-sm`}>
                        <Icon className="w-8 h-8" />
                    </div>
                    {badge && (
                        <span className="px-3 py-1 bg-surface-2 border border-border-subtle rounded-full text-[10px] font-bold text-text-secondary tracking-widest uppercase">
                            {badge}
                        </span>
                    )}
                </div>

                {/* Text */}
                <h3 className="text-2xl font-bold text-text-primary mb-2 group-hover:text-accent-primary transition-colors tracking-tight">
                    {title}
                </h3>
                <p className="text-text-secondary text-sm leading-relaxed font-medium">
                    {desc}
                </p>
            </div>

            {/* Footer Action */}
            {!disabled && (
                <div className="w-full pt-4 border-t border-border-subtle mt-auto flex items-center justify-between group-hover:border-border-strong transition-colors">
                    <span className="text-xs font-bold text-text-muted uppercase tracking-widest group-hover:text-text-secondary">Acessar</span>
                    <div className={`p-2 rounded-full bg-surface-2 ${accentColor} group-hover:bg-active transition-all`}>
                        <ArrowRight className="w-4 h-4" />
                    </div>
                </div>
            )}
        </div>
    );

    if (disabled || !href) {
        return CardContent;
    }

    return (
        <Link href={href} className="w-full h-full block">
            {CardContent}
        </Link>
    );
}
