'use client';

import Link from 'next/link';
import { ArrowRight, LucideIcon } from 'lucide-react';

interface DashboardCardProps {
    href?: string;
    title: string;
    desc: string;
    icon: LucideIcon;
    accentColor?: string;
    iconBg?: string;
    badgeColor?: string;
    disabled?: boolean;
    badge?: string;
    featured?: boolean;
}

export function DashboardCard({
    href,
    title,
    desc,
    icon: Icon,
    accentColor = "text-indigo-400",
    iconBg = "bg-indigo-500/10 border-indigo-500/20",
    badgeColor = "bg-surface-2 border-border-subtle text-text-muted",
    disabled = false,
    badge,
    featured = false,
}: DashboardCardProps) {
    const CardContent = (
        <div className={`
            relative group h-full w-full rounded-3xl overflow-hidden
            flex flex-col items-start justify-between
            border transition-all duration-300
            ${featured
                ? 'p-7 lg:p-8 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border-amber-500/30 hover:border-amber-500/60 hover:shadow-lg hover:shadow-amber-500/10'
                : 'p-6 lg:p-7 bg-white dark:bg-surface-1/60 border-slate-200 dark:border-white/6 hover:border-slate-300 dark:hover:border-white/12 hover:shadow-md dark:hover:shadow-black/30'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            backdrop-blur-sm
        `}>
            {/* Decorative background icon */}
            <div className="absolute -bottom-4 -right-4 opacity-0 group-hover:opacity-[0.06] dark:group-hover:opacity-[0.08] transition-opacity duration-500 pointer-events-none">
                <Icon className="w-36 h-36 rotate-12" />
            </div>

            {/* Subtle top border accent */}
            <div className={`absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-3xl
                ${featured ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-transparent via-current to-transparent'}
                ${accentColor}
            `} />

            <div className="z-10 w-full flex-1 flex flex-col gap-4">
                {/* Header with Icon + Badge */}
                <div className="flex justify-between items-start">
                    <div className={`
                        p-3.5 rounded-2xl border
                        ${accentColor} ${iconBg}
                        group-hover:scale-110 group-hover:rotate-[-3deg]
                        transition-all duration-300 shadow-sm
                    `}>
                        <Icon className="w-6 h-6" />
                    </div>
                    {badge && (
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border ${badgeColor}`}>
                            {badge}
                        </span>
                    )}
                </div>

                {/* Text */}
                <div>
                    <h3 className={`text-xl font-bold mb-1.5 tracking-tight transition-colors duration-200
                        ${featured ? 'text-amber-700 dark:text-amber-300 group-hover:text-amber-600 dark:group-hover:text-amber-200' : 'text-slate-800 dark:text-text-primary group-hover:text-slate-900 dark:group-hover:text-white'}
                    `}>
                        {title}
                    </h3>
                    <p className="text-slate-500 dark:text-text-muted text-sm leading-relaxed">
                        {desc}
                    </p>
                </div>
            </div>

            {/* Footer Action */}
            {!disabled && (
                <div className="w-full pt-4 mt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between group-hover:border-slate-200 dark:group-hover:border-white/10 transition-colors">
                    <span className="text-xs font-bold text-slate-400 dark:text-text-muted uppercase tracking-widest group-hover:text-slate-600 dark:group-hover:text-text-secondary transition-colors">
                        Acessar
                    </span>
                    <div className={`
                        w-7 h-7 rounded-full flex items-center justify-center
                        ${accentColor} ${iconBg} border
                        group-hover:translate-x-0.5 transition-transform duration-200
                    `}>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                </div>
            )}
        </div>
    );

    if (disabled || !href) {
        return CardContent;
    }

    return (
        <Link href={href} className="w-full h-full block group">
            {CardContent}
        </Link>
    );
}
