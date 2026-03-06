'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import {
    ArrowLeft, BookOpen, CheckCircle2, Circle, Loader2,
    Calendar, Trophy, Flame, Target, ChevronRight, Play
} from 'lucide-react';
import { CosmicBackground } from '@/components/ui/CosmicBackground';
import { getTodosOsDiasDoPlano, getDiasConcluidos, getMinhasInscricoes } from '@/lib/plans';
import type { PlanoDia, InscricaoPlano, Plano } from '@/lib/types/plans';

export default function PlanoDetalhesPage() {
    return (
        <Suspense fallback={
            <CosmicBackground className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            </CosmicBackground>
        }>
            <PlanoDetalhesContent />
        </Suspense>
    );
}

function PlanoDetalhesContent() {
    const searchParams = useSearchParams();
    const planoId = searchParams.get('plano_id');

    const [dias, setDias] = useState<PlanoDia[]>([]);
    const [diasConcluidos, setDiasConcluidos] = useState<number[]>([]);
    const [inscricao, setInscricao] = useState<(InscricaoPlano & { plano: Plano }) | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!planoId) return;
        loadData();
    }, [planoId]);

    async function loadData() {
        if (!planoId) return;
        setLoading(true);
        try {
            const [todosDias, concluidos, inscricoes] = await Promise.all([
                getTodosOsDiasDoPlano(planoId),
                getDiasConcluidos(planoId),
                getMinhasInscricoes()
            ]);
            setDias(todosDias);

            // Combinar dias do banco com localStorage (fallback sem login)
            let todosConcluidos = concluidos;
            if (typeof window !== 'undefined') {
                const localKey = `plano-dias-concluidos:${planoId}`;
                const localRaw = localStorage.getItem(localKey);
                if (localRaw) {
                    const localDias: number[] = JSON.parse(localRaw);
                    const merged = [...new Set([...todosConcluidos, ...localDias])].sort((a, b) => a - b);
                    todosConcluidos = merged;
                }
            }
            setDiasConcluidos(todosConcluidos);

            const insc = inscricoes.find(i => i.plano_id === planoId) || null;
            setInscricao(insc);
        } catch (error) {
            console.error('Erro ao carregar detalhes do plano:', error);
        } finally {
            setLoading(false);
        }
    }

    if (!planoId) {
        return (
            <CosmicBackground className="min-h-screen flex items-center justify-center">
                <p className="text-text-muted">Plano não especificado.</p>
            </CosmicBackground>
        );
    }

    if (loading) {
        return (
            <CosmicBackground className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            </CosmicBackground>
        );
    }

    const plano = inscricao?.plano;
    const totalDias = plano?.duracao_dias || dias.length;
    const totalConcluidos = diasConcluidos.length;
    const percentual = totalDias > 0 ? Math.round((totalConcluidos / totalDias) * 100) : 0;
    const diaAtual = inscricao?.dia_atual || 1;

    // Calcular sequência de dias consecutivos
    const calcularSequencia = (): number => {
        if (diasConcluidos.length === 0) return 0;
        const sorted = [...diasConcluidos].sort((a, b) => b - a);
        let seq = 1;
        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i] === sorted[i - 1] - 1) {
                seq++;
            } else {
                break;
            }
        }
        return seq;
    };

    const sequencia = calcularSequencia();

    // Estimar data de conclusão (dias restantes)
    const diasRestantes = totalDias - totalConcluidos;

    return (
        <CosmicBackground className="min-h-screen px-6 py-8 selection:bg-amber-500/30">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Back */}
                <Link href="/planos" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Voltar aos Planos
                </Link>

                {/* Header com Progresso */}
                <div className="animate-enter">
                    <div className="glass-panel rounded-3xl p-6 md:p-8 border border-border-subtle relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 blur-[80px] rounded-full -mr-16 -mt-16 pointer-events-none"></div>

                        <div className="relative z-10 space-y-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <BookOpen className="w-5 h-5 text-amber-400" />
                                        <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold">
                                            Seu Progresso
                                        </span>
                                    </div>
                                    <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
                                        {plano?.titulo || 'Plano de Leitura'}
                                    </h1>
                                    {plano?.descricao && (
                                        <p className="text-text-muted text-sm mt-1 max-w-lg">{plano.descricao}</p>
                                    )}
                                </div>

                                {/* Percentual Circular */}
                                <div className="shrink-0 flex flex-col items-center">
                                    <div className="relative w-20 h-20">
                                        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                                            <path
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                fill="none"
                                                stroke="rgba(255,255,255,0.06)"
                                                strokeWidth="3"
                                            />
                                            <path
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                fill="none"
                                                stroke="url(#gold-gradient)"
                                                strokeWidth="3"
                                                strokeDasharray={`${percentual}, 100`}
                                                strokeLinecap="round"
                                            />
                                            <defs>
                                                <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                    <stop offset="0%" stopColor="#f59e0b" />
                                                    <stop offset="100%" stopColor="#f97316" />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-lg font-bold text-text-primary">{percentual}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Barra de Progresso */}
                            <div className="w-full h-2.5 bg-surface-2 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-700 ease-out"
                                    style={{ width: `${Math.max(2, percentual)}%` }}
                                />
                            </div>

                            {/* Estatísticas */}
                            <div className="grid grid-cols-3 gap-4 pt-2">
                                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-2/50 border border-border-subtle">
                                    <Target className="w-5 h-5 text-emerald-400 shrink-0" />
                                    <div>
                                        <p className="text-lg font-bold text-text-primary">{totalConcluidos}<span className="text-text-muted font-normal text-sm">/{totalDias}</span></p>
                                        <p className="text-[10px] text-text-muted uppercase tracking-widest">Dias Lidos</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-2/50 border border-border-subtle">
                                    <Flame className="w-5 h-5 text-orange-400 shrink-0" />
                                    <div>
                                        <p className="text-lg font-bold text-text-primary">{sequencia}</p>
                                        <p className="text-[10px] text-text-muted uppercase tracking-widest">Sequência</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-2/50 border border-border-subtle">
                                    <Calendar className="w-5 h-5 text-blue-400 shrink-0" />
                                    <div>
                                        <p className="text-lg font-bold text-text-primary">{diasRestantes}</p>
                                        <p className="text-[10px] text-text-muted uppercase tracking-widest">Restantes</p>
                                    </div>
                                </div>
                            </div>

                            {/* Botão Continuar Leitura */}
                            <Link
                                href={`/plano-de-leitura?plano_id=${planoId}&dia=${diaAtual}`}
                                className="w-full mt-2 px-6 py-3.5 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400 hover:scale-[1.01] transition-all shadow-lg hover:shadow-amber-500/20 flex items-center justify-center gap-2"
                            >
                                <Play className="w-5 h-5 fill-current" />
                                Continuar — Dia {diaAtual}
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Grid de Dias */}
                <div className="space-y-4 animate-enter" style={{ animationDelay: '0.1s' }}>
                    <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-amber-400" />
                        Todos os Dias
                    </h2>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {dias.map((dia) => {
                            const isConcluido = diasConcluidos.includes(dia.dia_numero);
                            const isAtual = dia.dia_numero === diaAtual;
                            const isFuturo = dia.dia_numero > diaAtual && !isConcluido;

                            return (
                                <Link
                                    key={dia.id}
                                    href={`/plano-de-leitura?plano_id=${planoId}&dia=${dia.dia_numero}`}
                                    className={`
                                        group relative p-4 rounded-2xl border transition-all duration-200
                                        ${isConcluido
                                            ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/15'
                                            : isAtual
                                                ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30 hover:bg-amber-500/15'
                                                : isFuturo
                                                    ? 'bg-surface-1 border-border-subtle opacity-60 hover:opacity-100 hover:bg-surface-2'
                                                    : 'bg-surface-1 border-border-subtle hover:bg-surface-2 hover:border-border-strong'
                                        }
                                    `}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <span className={`text-2xl font-black ${isConcluido ? 'text-emerald-400' :
                                            isAtual ? 'text-amber-400' :
                                                'text-text-muted'
                                            }`}>
                                            {dia.dia_numero}
                                        </span>
                                        {isConcluido ? (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                        ) : isAtual ? (
                                            <Play className="w-4 h-4 text-amber-400 fill-amber-400" />
                                        ) : (
                                            <Circle className="w-4 h-4 text-text-muted/30" />
                                        )}
                                    </div>
                                    <p className={`text-xs leading-tight line-clamp-2 ${isConcluido ? 'text-emerald-300/80' :
                                        isAtual ? 'text-amber-300/80' :
                                            'text-text-muted'
                                        }`}>
                                        {dia.referencia}
                                    </p>
                                    {isAtual && (
                                        <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-400 font-bold uppercase tracking-widest">
                                            Continuar <ChevronRight className="w-3 h-3" />
                                        </div>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Legenda */}
                <div className="flex items-center justify-center gap-6 text-xs text-text-muted py-4">
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Concluído</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Play className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span>Dia Atual</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Circle className="w-3.5 h-3.5 text-text-muted/30" />
                        <span>Pendente</span>
                    </div>
                </div>

                {/* Conquista */}
                {percentual >= 100 && (
                    <div className="text-center py-8 animate-enter">
                        <div className="inline-flex flex-col items-center gap-3 p-8 rounded-3xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                            <Trophy className="w-12 h-12 text-amber-400" />
                            <h3 className="text-2xl font-bold text-text-primary">Plano Concluído! 🎉</h3>
                            <p className="text-text-muted text-sm">Parabéns! Você completou toda a leitura deste plano.</p>
                        </div>
                    </div>
                )}

            </div>
        </CosmicBackground>
    );
}
