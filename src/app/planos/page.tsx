'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    BookOpen, Calendar, CheckCircle, Circle,
    ArrowRight, Award, ChevronRight, Loader2, Play
} from 'lucide-react';
import { CosmicBackground } from '@/components/ui/CosmicBackground';
import { getPlanosDisponiveis, getMinhasInscricoes, inscreverEmPlano } from '@/lib/plans';
import { Plano, InscricaoPlano } from '@/lib/types/plans';
import Link from 'next/link';

export default function PlanosPage() {
    console.log('Planos Page Mounted');
    const router = useRouter();
    const [planos, setPlanos] = useState<Plano[]>([]);
    const [inscricoes, setInscricoes] = useState<InscricaoPlano[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);

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
                // Redireciona para o leitor com o plano selecionado
                router.push(`/plano-de-leitura?plano_id=${planoId}`);
            } else {
                alert('Erro ao inscrever no plano. Tente novamente.');
                setProcessing(null);
            }
        } catch (error: unknown) {
            console.error("Erro ao iniciar plano:", error);
            const message = error instanceof Error ? error.message : '';
            if (message === 'USER_NOT_AUTHENTICATED') {
                // Sem login, abre o plano em modo leitura (sem salvar progresso)
                router.push('/plano-de-leitura?plano_id=' + planoId);
            } else {
                alert('Ocorreu um erro inesperado ao iniciar o plano.');
            }
            setProcessing(null);
        }
    }

    // Encontrar o plano ativo mais recente (se houver)
    const planoAtivo = inscricoes.length > 0 ? inscricoes[0] : null;

    // Mapa de cores
    const colorMap: Record<string, string> = {
        blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        green: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        orange: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
        cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
        indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    };

    const getTheme = (color: string | null) => colorMap[color || 'blue'] || colorMap.blue;

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

                {/* Header */}
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
                        <BookOpen className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                            Central de Estudos
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">
                        Planos de Leitura
                    </h1>
                    <p className="text-slate-400 max-w-lg">
                        Escolha uma jornada guiada e aprofunde seu conhecimento bíblico com ajuda da Inteligência Artificial.
                    </p>
                </div>

                {/* Plano Ativo (Destaque) */}
                {planoAtivo && planoAtivo.plano && (
                    <div className="w-full relative group p-1 rounded-3xl bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-blue-500/20 animate-enter">
                        <div className="bg-[#0A0A0A] rounded-[22px] p-6 md:p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[80px] rounded-full -mr-16 -mt-16 pointer-events-none"></div>

                            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] uppercase tracking-widest text-amber-500 font-bold">Em Progresso</span>
                                        <span className="text-slate-600">•</span>
                                        <span className="text-[10px] uppercase tracking-widest text-slate-400">
                                            Dia {planoAtivo.dia_atual} de {planoAtivo.plano.duracao_dias}
                                        </span>
                                    </div>
                                    <h2 className="text-2xl font-bold text-white group-hover:text-amber-400 transition-colors">
                                        {planoAtivo.plano.titulo}
                                    </h2>
                                    {/* Barra de Progresso */}
                                    <div className="w-full md:w-64 h-2 bg-white/10 rounded-full overflow-hidden mt-3">
                                        <div
                                            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 shimmer"
                                            style={{ width: `${Math.max(5, planoAtivo.progresso_percent || 0)}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <Link
                                    href={`/plano-de-leitura?plano_id=${planoAtivo.plano_id}`}
                                    className="shrink-0 px-6 py-3 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-400 hover:scale-105 transition-all shadow-lg hover:shadow-amber-500/20 flex items-center gap-2 group/btn"
                                >
                                    <Play className="w-4 h-4 fill-current" />
                                    Continuar Leitura
                                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                {/* Lista de Planos Disponíveis */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Card Leitura Diária (Legado) */}
                    <div className="group relative p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                            <div className="p-3 rounded-xl text-amber-400 bg-amber-500/10 border-amber-500/20">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-bold text-white uppercase tracking-widest">
                                DIÁRIO
                            </span>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white mb-1 group-hover:text-amber-300 transition-colors">
                                Leitura do Dia
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-widest font-medium">
                                <span>Devocional</span>
                                <span>•</span>
                                <span>Automático</span>
                            </div>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            A leitura diária tradicional, baseada no calendário anual da igreja.
                        </p>
                        <div className="mt-auto pt-4 flex items-center justify-between border-t border-white/5">
                            <Link href="/plano-de-leitura" className="text-xs font-bold text-slate-400 hover:text-white uppercase tracking-widest flex items-center gap-2 transition-colors">
                                Acessar Agora <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>

                    {planos.map((plano) => {
                        const inscricao = inscricoes.find(i => i.plano_id === plano.id);
                        const isAtivo = !!inscricao;
                        const theme = getTheme(plano.cor_tema);

                        return (
                            <div
                                key={plano.id}
                                className="group relative p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all flex flex-col gap-4"
                            >
                                <div className="flex justify-between items-start">
                                    <div className={`p-3 rounded-xl ${theme}`}>
                                        <Calendar className="w-6 h-6" />
                                    </div>
                                    {plano.badge && (
                                        <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-bold text-white uppercase tracking-widest">
                                            {plano.badge}
                                        </span>
                                    )}
                                </div>

                                <div>
                                    <h3 className="text-xl font-bold text-white mb-1 group-hover:text-blue-300 transition-colors">
                                        {plano.titulo}
                                    </h3>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-widest font-medium">
                                        <span>{plano.duracao_dias} Dias</span>
                                        <span>•</span>
                                        <span>Diário</span>
                                    </div>
                                </div>

                                <p className="text-sm text-slate-400 leading-relaxed">
                                    {plano.descricao}
                                </p>

                                <div className="mt-auto pt-4 flex items-center justify-between border-t border-white/5">
                                    {isAtivo ? (
                                        <Link
                                            href={`/plano-de-leitura?plano_id=${plano.id}`}
                                            className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2 hover:text-emerald-300 transition-colors"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            Aberto
                                        </Link>
                                    ) : (
                                        <button
                                            onClick={() => handleIniciar(plano.id)}
                                            disabled={!!processing}
                                            className="text-xs font-bold text-slate-400 hover:text-white uppercase tracking-widest flex items-center gap-2 transition-colors disabled:opacity-50"
                                        >
                                            {processing === plano.id ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Iniciando...
                                                </>
                                            ) : (
                                                <>
                                                    Iniciar Plano
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

                {/* Voltar */}
                <div className="text-center pt-8">
                    <Link href="/" className="text-sm text-slate-600 hover:text-white transition-colors">
                        ← Voltar para Dashboard
                    </Link>
                </div>

            </div>
        </CosmicBackground>
    );
}
