'use client';

import { useMemo } from 'react';
import {
    Target, Flame, Calendar, TrendingUp,
    Star, Award, Zap, Clock
} from 'lucide-react';

interface ReadingPlanProgressProps {
    totalDias: number;
    diasConcluidos: number[];
    diaAtual: number;
    dataInicio?: string;
}

// Gera array de todos os dias do plano
function getAllDays(total: number): number[] {
    return Array.from({ length: total }, (_, i) => i + 1);
}

// Calcula sequência atual de dias consecutivos
function calcularSequenciaAtual(concluidos: number[]): number {
    if (concluidos.length === 0) return 0;
    const sorted = [...concluidos].sort((a, b) => b - a);
    let seq = 1;
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === sorted[i - 1] - 1) {
            seq++;
        } else {
            break;
        }
    }
    return seq;
}

// Calcula a maior sequência já atingida
function calcularMaiorSequencia(concluidos: number[]): number {
    if (concluidos.length === 0) return 0;
    const sorted = [...concluidos].sort((a, b) => a - b);
    let maior = 1;
    let atual = 1;
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === sorted[i - 1] + 1) {
            atual++;
            maior = Math.max(maior, atual);
        } else {
            atual = 1;
        }
    }
    return maior;
}

// Gera semanas (linhas de 7 dias) para o heatmap
function generateWeeks(dias: number[]): number[][] {
    const weeks: number[][] = [];
    let currentWeek: number[] = [];
    for (const dia of dias) {
        currentWeek.push(dia);
        if (currentWeek.length === 7) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    }
    if (currentWeek.length > 0) {
        // Pad com 0 para completar a semana
        while (currentWeek.length < 7) currentWeek.push(0);
        weeks.push(currentWeek);
    }
    return weeks;
}

const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export default function ReadingPlanProgress({
    totalDias,
    diasConcluidos,
    diaAtual,
    dataInicio
}: ReadingPlanProgressProps) {
    const allDays = useMemo(() => getAllDays(totalDias), [totalDias]);
    const weeks = useMemo(() => generateWeeks(allDays), [allDays]);
    const concluidosSet = useMemo(() => new Set(diasConcluidos), [diasConcluidos]);

    const totalConcluidos = diasConcluidos.length;
    const percentual = totalDias > 0 ? Math.round((totalConcluidos / totalDias) * 100) : 0;
    const sequenciaAtual = useMemo(() => calcularSequenciaAtual(diasConcluidos), [diasConcluidos]);
    const maiorSequencia = useMemo(() => calcularMaiorSequencia(diasConcluidos), [diasConcluidos]);
    const diasRestantes = totalDias - totalConcluidos;

    // Previsão de conclusão
    const previsao = useMemo(() => {
        if (!dataInicio || totalConcluidos === 0) return null;
        const inicio = new Date(dataInicio);
        const hoje = new Date();
        const diasDesdeInicio = Math.max(1, Math.ceil((hoje.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)));
        const mediaDiasPorDia = totalConcluidos / diasDesdeInicio;
        if (mediaDiasPorDia <= 0) return null;
        const diasParaConcluir = Math.ceil(diasRestantes / mediaDiasPorDia);
        const dataConclusao = new Date(hoje);
        dataConclusao.setDate(dataConclusao.getDate() + diasParaConcluir);
        return {
            diasParaConcluir,
            data: dataConclusao.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
            noPrazo: diasParaConcluir <= totalDias // Se vai terminar antes do "prazo natural"
        };
    }, [dataInicio, totalConcluidos, diasRestantes, totalDias]);

    // Marcos de progresso
    const milestones = useMemo(() => {
        const marks = [
            { threshold: 25, label: 'Início', icon: Zap, color: 'text-cyan-400' },
            { threshold: 50, label: 'Metade', icon: Star, color: 'text-blue-400' },
            { threshold: 75, label: 'Reta Final', icon: TrendingUp, color: 'text-purple-400' },
            { threshold: 100, label: 'Concluído!', icon: Award, color: 'text-amber-400' },
        ];
        return marks.map(m => ({
            ...m,
            reached: percentual >= m.threshold,
            current: percentual >= m.threshold && percentual < (marks[marks.indexOf(m) + 1]?.threshold || 101)
        }));
    }, [percentual]);

    return (
        <div className="space-y-6 animate-enter" style={{ animationDelay: '0.15s' }}>

            {/* Grid de estatísticas aprimorado */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                    icon={<Target className="w-4 h-4 text-emerald-400" />}
                    value={`${totalConcluidos}/${totalDias}`}
                    label="Dias Lidos"
                />
                <StatCard
                    icon={<Flame className="w-4 h-4 text-orange-400" />}
                    value={String(sequenciaAtual)}
                    label="Sequência"
                    highlight={sequenciaAtual >= 3}
                />
                <StatCard
                    icon={<TrendingUp className="w-4 h-4 text-purple-400" />}
                    value={String(maiorSequencia)}
                    label="Recorde"
                />
                <StatCard
                    icon={<Calendar className="w-4 h-4 text-blue-400" />}
                    value={String(diasRestantes)}
                    label="Restantes"
                />
            </div>

            {/* Marcos de progresso */}
            <div className="glass-panel rounded-2xl p-5 border border-border-subtle">
                <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    Marcos
                </h3>
                <div className="flex items-center justify-between relative">
                    {/* Linha de fundo */}
                    <div className="absolute top-1/2 left-0 right-0 h-1 bg-surface-2 rounded-full -translate-y-1/2" />
                    {/* Linha preenchida */}
                    <div
                        className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-amber-500 rounded-full -translate-y-1/2 transition-all duration-1000"
                        style={{ width: `${Math.min(100, percentual)}%` }}
                    />
                    {milestones.map((m, i) => {
                        const Icon = m.icon;
                        return (
                            <div
                                key={m.threshold}
                                className="relative z-10 flex flex-col items-center gap-1.5"
                                style={{ width: `${100 / milestones.length}%` }}
                            >
                                <div className={`
                                    w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500
                                    ${m.reached
                                        ? 'bg-surface-0 border-amber-500/50 shadow-lg shadow-amber-500/20'
                                        : 'bg-surface-2 border-border-subtle'
                                    }
                                    ${m.current ? 'ring-2 ring-amber-500/30 scale-110' : ''}
                                `}>
                                    <Icon className={`w-3.5 h-3.5 ${m.reached ? m.color : 'text-text-muted/40'}`} />
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${m.reached ? 'text-text-primary' : 'text-text-muted/50'}`}>
                                    {m.label}
                                </span>
                                <span className={`text-[10px] ${m.reached ? 'text-text-muted' : 'text-text-muted/30'}`}>
                                    {m.threshold}%
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Heatmap semanal */}
            <div className="glass-panel rounded-2xl p-5 border border-border-subtle">
                <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    Calendário de Leitura
                </h3>

                <div className="overflow-x-auto">
                    <div className="inline-flex flex-col gap-1.5 min-w-fit">
                        {/* Cabeçalho dos dias da semana */}
                        <div className="flex gap-1.5 pl-8">
                            {weekDays.map((d, i) => (
                                <div key={i} className="w-7 h-4 flex items-center justify-center text-[9px] text-text-muted font-bold uppercase">
                                    {d}
                                </div>
                            ))}
                        </div>

                        {/* Grid de semanas */}
                        {weeks.map((week, wi) => (
                            <div key={wi} className="flex items-center gap-1.5">
                                {/* Label da semana */}
                                <span className="text-[9px] text-text-muted/50 w-8 text-right font-mono shrink-0">
                                    S{wi + 1}
                                </span>
                                {/* Dias */}
                                {week.map((dia, di) => {
                                    if (dia === 0) {
                                        return <div key={di} className="w-7 h-7" />;
                                    }
                                    const isConcluido = concluidosSet.has(dia);
                                    const isAtual = dia === diaAtual;
                                    const isPassado = dia < diaAtual;
                                    const isFuturo = dia > diaAtual && !isConcluido;

                                    return (
                                        <div
                                            key={di}
                                            className={`
                                                w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold
                                                transition-all duration-200 cursor-default
                                                ${isConcluido
                                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                    : isAtual
                                                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 ring-1 ring-amber-500/20'
                                                        : isPassado
                                                            ? 'bg-red-500/10 text-red-400/50 border border-red-500/20'
                                                            : 'bg-surface-2/50 text-text-muted/30 border border-border-subtle/50'
                                                }
                                            `}
                                            title={
                                                isConcluido
                                                    ? `Dia ${dia} — Concluído ✓`
                                                    : isAtual
                                                        ? `Dia ${dia} — Atual`
                                                        : `Dia ${dia}`
                                            }
                                        >
                                            {dia}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Legenda do heatmap */}
                <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-border-subtle">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm bg-emerald-500/20 border border-emerald-500/30" />
                        <span className="text-[10px] text-text-muted">Lido</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm bg-amber-500/20 border border-amber-500/40" />
                        <span className="text-[10px] text-text-muted">Atual</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm bg-red-500/10 border border-red-500/20" />
                        <span className="text-[10px] text-text-muted">Perdido</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm bg-surface-2/50 border border-border-subtle/50" />
                        <span className="text-[10px] text-text-muted">Futuro</span>
                    </div>
                </div>
            </div>

            {/* Previsão de conclusão */}
            {previsao && (
                <div className="glass-panel rounded-2xl p-5 border border-border-subtle">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                <Clock className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-text-primary">Previsão de Conclusão</p>
                                <p className="text-xs text-text-muted">
                                    Com sua média atual, você termina em ~{previsao.diasParaConcluir} dias
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-bold text-text-primary">{previsao.data}</p>
                            <p className={`text-[10px] font-bold uppercase tracking-widest ${previsao.noPrazo ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {previsao.noPrazo ? 'No ritmo!' : 'Acelere!'}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Componente de card de estatística
function StatCard({
    icon,
    value,
    label,
    highlight = false
}: {
    icon: React.ReactNode;
    value: string;
    label: string;
    highlight?: boolean;
}) {
    return (
        <div className={`
            flex items-center gap-3 px-4 py-3 rounded-xl border transition-all
            ${highlight
                ? 'bg-amber-500/10 border-amber-500/20 shadow-lg shadow-amber-500/5'
                : 'bg-surface-2/50 border-border-subtle'
            }
        `}>
            <div className="shrink-0">{icon}</div>
            <div>
                <p className="text-lg font-bold text-text-primary">{value}</p>
                <p className="text-[10px] text-text-muted uppercase tracking-widest">{label}</p>
            </div>
        </div>
    );
}
