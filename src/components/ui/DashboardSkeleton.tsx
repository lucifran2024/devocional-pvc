'use client';

import { Skeleton } from './Skeleton';

/**
 * DashboardSkeleton — replica fielmente o layout do dashboard
 * enquanto os dados carregam do Supabase.
 *
 * Seções cobertas:
 * 1. Hero com badge de data + Palavra da Manhã
 * 2. Card do Versículo do Dia
 * 3. Grid de 4 ferramentas (DashboardCards)
 */
export function DashboardSkeleton() {
    return (
        <div className="flex flex-col min-h-screen">
            {/* 1. HERO SKELETON */}
            <section className="relative w-full pt-32 pb-20 px-6">
                <div className="max-w-6xl mx-auto flex flex-col items-center text-center">
                    {/* Date Badge */}
                    <Skeleton shimmer className="h-7 w-56 rounded-full mb-8" />

                    {/* Streak Badge */}
                    <div className="absolute top-4 right-4">
                        <Skeleton shimmer className="h-8 w-20 rounded-full" />
                    </div>

                    {/* Palavra da Manhã label */}
                    <Skeleton shimmer className="h-4 w-40 rounded-full mb-2" />
                    <Skeleton shimmer className="h-5 w-32 rounded-full mb-6" />

                    {/* Palavra da Manhã card */}
                    <div className="w-full max-w-2xl mx-auto">
                        <div className="glass-card p-6 space-y-4">
                            <Skeleton shimmer className="h-6 w-3/4 mx-auto" />
                            <Skeleton shimmer className="h-4 w-full" />
                            <Skeleton shimmer className="h-4 w-full" />
                            <Skeleton shimmer className="h-4 w-2/3 mx-auto" />
                            <div className="pt-3 flex justify-center gap-3">
                                <Skeleton shimmer className="h-8 w-8 rounded-full" />
                                <Skeleton shimmer className="h-8 w-8 rounded-full" />
                                <Skeleton shimmer className="h-8 w-8 rounded-full" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 2. VERSÍCULO DO DIA SKELETON */}
            <section className="w-full px-6 -mt-8 mb-8">
                <div className="w-full max-w-2xl mx-auto mt-8">
                    <div className="glass-panel rounded-2xl p-6 border border-amber-500/10 space-y-4">
                        <div className="flex items-center justify-between">
                            <Skeleton shimmer className="h-4 w-32" />
                            <Skeleton shimmer className="h-7 w-7 rounded-lg" />
                        </div>
                        <Skeleton shimmer className="h-5 w-full" />
                        <Skeleton shimmer className="h-5 w-4/5" />
                        <Skeleton shimmer className="h-3 w-28" />
                    </div>
                </div>
            </section>

            {/* 3. GRID DE FERRAMENTAS SKELETON */}
            <section className="flex-1 w-full max-w-7xl mx-auto px-6 pb-24">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={i}
                            className="relative h-full w-full p-6 lg:p-7 rounded-3xl bg-white dark:bg-surface-1/60 border border-slate-200 dark:border-white/6"
                        >
                            <div className="space-y-4">
                                <div className="flex justify-between items-start">
                                    <Skeleton shimmer className="h-14 w-14 rounded-2xl" />
                                    <Skeleton shimmer className="h-6 w-20 rounded-full" />
                                </div>
                                <Skeleton shimmer className="h-7 w-3/4" />
                                <Skeleton shimmer className="h-4 w-full" />
                                <Skeleton shimmer className="h-4 w-2/3" />
                                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-white/5">
                                    <div className="flex justify-between items-center">
                                        <Skeleton shimmer className="h-4 w-16" />
                                        <Skeleton shimmer className="h-7 w-7 rounded-full" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
