'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    BookOpen, Calendar, CheckCircle,
    ArrowRight, ChevronRight, Loader2, Play
} from 'lucide-react';
import { CosmicBackground } from '@/components/ui/CosmicBackground';
import { BackButton } from '@/components/ui/BackButton';
import { getPlanosDisponiveis, getMinhasInscricoes, inscreverEmPlano, getDiasConcluidos } from '@/lib/plans';
import { Plano, InscricaoPlano } from '@/lib/types/plans';
import Link from 'next/link';

export default function PlanosPage() {
    console.log('Planos Page Mounted');
    const router = useRouter();
    const [planos, setPlanos] = useState<Plano[]>([]);
    const [inscricoes, setInscricoes] = useState<InscricaoPlano[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);
    const [progressoMap, setProgressoMap] = useState<Record<string, { concluidos: number; total: number }>>({});

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            const [listaPlanos, listaInscricoes] = await Promise.all([
                getPlanosDisponiveis(),
                getMinhasInscricoes()
            ]);
            setPlanos(listaPlanos);
            setInscricoes(listaInscricoes);

            // Carregar progresso real de cada inscrição
            const progMap: Record<string, { concluidos: number; total: number }> = {};
            await Promise.all(listaInscricoes.map(async (insc) => {
                const dias = await getDiasConcluidos(insc.plano_id);
                const plano = listaPlanos.find(p => p.id === insc.plano_id);
                progMap[insc.plano_id] = {
                    concluidos: dias.length,
                    total: plano?.duracao_dias || 1
                };
            }));
            setProgressoMap(progMap);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    async function handleIniciar(planoId: string) {
        try {
            setProcessing(planoId);
            const inscricao = await inscreverEmPlano(planoId);

            if (inscricao) {
                router.push(`/plano-de-leitura?plano_id=${planoId}`);
            } else {
                alert('Erro ao inscrever no plano. Tente novamente.');
                setProcessing(null);
            }
        } catch (error: unknown) {
            console.error("Erro ao iniciar plano:", error);
            const message = error instanceof Error ? error.message : '';
            if (message === 'USER_NOT_AUTHENTICATED') {
                router.push('/plano-de-leitura?plano_id=' + planoId);
            } else {
                alert('Ocorreu um erro inesperado ao iniciar o plano.');
            }
            setProcessing(null);
        }
    }

    const planoAtivo = inscricoes.length > 0 ? inscricoes[0] : null;

    // Paleta única (identidade dourada) — sem cores decorativas por plano
    const themeClasses = 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';

    if (loading) {
        return (
            <CosmicBackground className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            </CosmicBackground>
        );
    }

    return (
        <CosmicBackground className="flex flex-col min-h-screen px-6 py-12 md:py-20 selection:bg-amber-500/30">

            <div className="max-w-4xl mx-auto w-full space-y-12">

                {/* Voltar */}
                <div className="-mb-4">
                    <BackButton href="/" label="Início" />
                </div>

                {/* Header */}
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-2 border border-border-subtle">
                        <BookOpen className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-bold text-text-muted uppercase tracking-widest">
                            Central de Estudos
                        </span>
                    </div>
                    <h1 className="reading-serif text-4xl md:text-5xl font-semibold text-text-primary">
                        Planos de Leitura
                    </h1>
                    <p className="text-text-muted max-w-lg">
                        Escolha uma jornada guiada e aprofunde seu conhecimento bíblico, um dia de cada vez.
                    </p>
                </div>

                {/* Plano Ativo (Destaque) */}
                {planoAtivo && planoAtivo.plano && (
                    <div className="w-full relative group rounded-3xl border border-amber-500/25 dark:border-amber-500/20 bg-gradient-to-br from-amber-500/[0.07] via-transparent to-transparent animate-enter overflow-hidden">
                        <div className="p-6 md:p-8 relative">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[80px] rounded-full -mr-16 -mt-16 pointer-events-none"></div>

                            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] uppercase tracking-widest text-amber-600 dark:text-amber-500 font-bold">Em Progresso</span>
                                        <span className="text-text-muted">•</span>
                                        <span className="text-[10px] uppercase tracking-widest text-text-muted">
                                            {progressoMap[planoAtivo.plano_id]
                                                ? `${progressoMap[planoAtivo.plano_id].concluidos} de ${progressoMap[planoAtivo.plano_id].total} dias lidos`
                                                : `Dia ${planoAtivo.dia_atual} de ${planoAtivo.plano.duracao_dias}`
                                            }
                                        </span>
                                    </div>
                                    <h2 className="reading-serif text-2xl md:text-[1.7rem] font-semibold text-text-primary">
                                        {planoAtivo.plano.titulo}
                                    </h2>
                                    {/* Barra de Progresso */}
                                    <div className="w-full md:w-64 h-2 bg-surface-2 rounded-full overflow-hidden mt-3">
                                        <div
                                            className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-700 ease-out"
                                            style={{ width: `${Math.max(5, progressoMap[planoAtivo.plano_id] ? Math.round((progressoMap[planoAtivo.plano_id].concluidos / progressoMap[planoAtivo.plano_id].total) * 100) : 0)}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <Link
                                    href={`/plano-detalhes?plano_id=${planoAtivo.plano_id}`}
                                    className="shrink-0 px-6 py-3 rounded-xl bg-amber-500 text-amber-950 font-bold hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/15 hover:shadow-amber-500/25 flex items-center gap-2 group/btn"
                                >
                                    <Play className="w-4 h-4 fill-current" />
                                    Ver Progresso
                                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                {/* Lista de Planos Disponíveis */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Card Leitura Diária (Legado) */}
                    <div className="group relative p-6 rounded-2xl bg-surface-1 border border-border-subtle hover:bg-surface-2 hover:border-border-strong transition-all flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                            <div className="p-3 rounded-xl text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <span className="px-2.5 py-1 rounded-full bg-surface-2 border border-border-subtle text-[11px] font-semibold text-text-secondary tracking-wide">
                                Diário
                            </span>
                        </div>
                        <div>
                            <h3 className="reading-serif text-xl font-semibold text-text-primary mb-1 group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">
                                Leitura do Dia
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-text-muted tracking-wide font-medium">
                                <span>Devocional</span>
                                <span>•</span>
                                <span>Automático</span>
                            </div>
                        </div>
                        <p className="text-sm text-text-muted leading-relaxed">
                            A leitura diária tradicional, baseada no calendário anual da igreja.
                        </p>
                        <div className="mt-auto pt-4 flex items-center justify-between border-t border-border-subtle">
                            <Link href="/plano-de-leitura" className="text-sm font-semibold text-text-muted hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-2 transition-colors">
                                Acessar agora <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>

                    {planos.map((plano) => {
                        const inscricao = inscricoes.find(i => i.plano_id === plano.id);
                        const isAtivo = !!inscricao;
                        const theme = themeClasses;

                        return (
                            <div
                                key={plano.id}
                                className="group relative p-6 rounded-2xl bg-surface-1 border border-border-subtle hover:bg-surface-2 hover:border-border-strong transition-all flex flex-col gap-4"
                            >
                                <div className="flex justify-between items-start">
                                    <div className={`p-3 rounded-xl border ${theme}`}>
                                        <Calendar className="w-6 h-6" />
                                    </div>
                                    {plano.badge && (
                                        <span className="px-2.5 py-1 rounded-full bg-surface-2 border border-border-subtle text-[11px] font-semibold text-text-secondary tracking-wide capitalize">
                                            {plano.badge.toLowerCase()}
                                        </span>
                                    )}
                                </div>

                                <div>
                                    <h3 className="reading-serif text-xl font-semibold text-text-primary mb-1 group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">
                                        {plano.titulo}
                                    </h3>
                                    <div className="flex items-center gap-2 text-xs text-text-muted tracking-wide font-medium">
                                        <span>{plano.duracao_dias} dias</span>
                                        <span>•</span>
                                        <span>Diário</span>
                                    </div>
                                </div>

                                <p className="text-sm text-text-muted leading-relaxed">
                                    {plano.descricao}
                                </p>

                                <div className="mt-auto pt-4 flex items-center justify-between border-t border-border-subtle">
                                    {isAtivo ? (
                                        <Link
                                            href={`/plano-detalhes?plano_id=${plano.id}`}
                                            className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            {progressoMap[plano.id]
                                                ? `${progressoMap[plano.id].concluidos}/${progressoMap[plano.id].total} dias`
                                                : 'Ver Progresso'
                                            }
                                        </Link>
                                    ) : (
                                        <button
                                            onClick={() => handleIniciar(plano.id)}
                                            disabled={!!processing}
                                            className="text-sm font-semibold text-text-muted hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-2 transition-colors disabled:opacity-50"
                                        >
                                            {processing === plano.id ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Iniciando...
                                                </>
                                            ) : (
                                                <>
                                                    Iniciar plano
                                                    <ChevronRight className="w-4 h-4" />
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

            </div>
        </CosmicBackground>
    );
}
