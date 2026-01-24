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
      glass-card border border-white/5 
      flex flex-col items-start justify-between gap-6
      transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/[0.03]'}
    `}>
            {/* Background Glow */}
            <div className={`absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-10 transition-opacity duration-700`}>
                <Icon className="w-32 h-32 -mr-10 -mt-10 rotate-12 text-white" />
            </div>

            <div className="z-10 w-full">
                {/* Header with Icon */}
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-4 rounded-2xl bg-white/5 border border-white/10 ${accentColor} group-hover:scale-110 transition-transform duration-500 shadow-lg shadow-black/20`}>
                        <Icon className="w-8 h-8" />
                    </div>
                    {badge && (
                        <span className="px-3 py-1 bg-white/10 border border-white/10 rounded-full text-[10px] font-bold text-white tracking-widest uppercase">
                            {badge}
                        </span>
                    )}
                </div>

                {/* Text */}
                <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-[#FCD34D] transition-colors tracking-tight">
                    {title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed font-medium">
                    {desc}
                </p>
            </div>

            {/* Footer Action */}
            {!disabled && (
                <div className="w-full pt-4 border-t border-white/5 mt-auto flex items-center justify-between group-hover:border-white/10 transition-colors">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest group-hover:text-slate-300">Acessar</span>
                    <div className={`p-2 rounded-full bg-white/5 ${accentColor} group-hover:bg-white/10 transition-all`}>
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
