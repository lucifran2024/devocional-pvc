'use client';

import { useState, useEffect, useRef } from 'react';
import {
    X, Download, Trash2, Loader2, CheckCircle, Cloud, HardDrive,
    AlertCircle, Pause
} from 'lucide-react';
import {
    downloadBibleVersion,
    countCachedChapters,
    clearCache,
    getCacheStats,
} from '@/lib/bible-db';

interface VersaoInfo {
    codigo: string;
    nome: string;
    nomeCompleto: string;
}

interface VersionStatus {
    cached: number;
    total: number;
    downloading: boolean;
    progress: number;
}

const TOTAL_CHAPTERS = 1189;

interface OfflineManagerProps {
    versoes: VersaoInfo[];
    onClose: () => void;
}

export function OfflineManager({ versoes, onClose }: OfflineManagerProps) {
    const [statusMap, setStatusMap] = useState<Record<string, VersionStatus>>({});
    const [loading, setLoading] = useState(true);
    const [totalCached, setTotalCached] = useState(0);
    const abortRef = useRef<AbortController | null>(null);
    const [downloadingVersion, setDownloadingVersion] = useState<string | null>(null);

    // Carregar status de cada versão
    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        setLoading(true);
        const stats = await getCacheStats();
        const map: Record<string, VersionStatus> = {};
        let total = 0;

        for (const v of versoes) {
            const cached = stats.versions[v.codigo] || 0;
            total += cached;
            map[v.codigo] = {
                cached,
                total: TOTAL_CHAPTERS,
                downloading: false,
                progress: 0,
            };
        }

        setStatusMap(map);
        setTotalCached(total);
        setLoading(false);
    };

    const handleDownload = async (versao: VersaoInfo) => {
        if (downloadingVersion) return; // Já tem download ativo

        const controller = new AbortController();
        abortRef.current = controller;
        setDownloadingVersion(versao.codigo);

        setStatusMap(prev => ({
            ...prev,
            [versao.codigo]: { ...prev[versao.codigo], downloading: true, progress: 0 },
        }));

        try {
            const downloaded = await downloadBibleVersion(
                versao.codigo,
                (done, total) => {
                    setStatusMap(prev => ({
                        ...prev,
                        [versao.codigo]: {
                            ...prev[versao.codigo],
                            progress: Math.round((done / total) * 100),
                            cached: done,
                        },
                    }));
                },
                controller.signal
            );

            setStatusMap(prev => ({
                ...prev,
                [versao.codigo]: {
                    ...prev[versao.codigo],
                    downloading: false,
                    cached: downloaded,
                },
            }));
        } catch {
            // Cancelled ou erro
        } finally {
            setDownloadingVersion(null);
            abortRef.current = null;
            // Recarregar stats reais
            const count = await countCachedChapters(versao.codigo);
            setStatusMap(prev => ({
                ...prev,
                [versao.codigo]: {
                    ...prev[versao.codigo],
                    downloading: false,
                    cached: count,
                },
            }));
            await loadStats();
        }
    };

    const handleCancel = () => {
        abortRef.current?.abort();
    };

    const handleClear = async (codigo: string) => {
        await clearCache(codigo);
        setStatusMap(prev => ({
            ...prev,
            [codigo]: { ...prev[codigo], cached: 0, progress: 0 },
        }));
        await loadStats();
    };

    const getStatusIcon = (status: VersionStatus) => {
        if (status.downloading) return <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />;
        if (status.cached >= TOTAL_CHAPTERS) return <CheckCircle className="w-5 h-5 text-emerald-400" />;
        if (status.cached > 0) return <HardDrive className="w-5 h-5 text-blue-400" />;
        return <Cloud className="w-5 h-5 text-slate-500" />;
    };

    const getStatusText = (status: VersionStatus) => {
        if (status.downloading) return `Baixando... ${status.progress}%`;
        if (status.cached >= TOTAL_CHAPTERS) return 'Completo';
        if (status.cached > 0) return `${status.cached} de ${TOTAL_CHAPTERS} caps`;
        return 'Não baixado';
    };

    const estimateSize = (chapters: number) => {
        // ~4.5KB por capítulo em média
        const mb = (chapters * 4.5) / 1024;
        return mb < 1 ? `${Math.round(mb * 1024)}KB` : `${mb.toFixed(1)}MB`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="glass-panel rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden border border-white/10">
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-2">
                        <Download className="w-5 h-5 text-amber-400" />
                        <span className="font-bold text-white">Bíblia Offline</span>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Info */}
                <div className="px-4 py-3 bg-white/5 border-b border-white/10">
                    <p className="text-slate-400 text-xs">
                        Baixe versões da Bíblia para ler sem internet. Cada versão tem {TOTAL_CHAPTERS} capítulos (~5MB).
                    </p>
                    {totalCached > 0 && (
                        <p className="text-emerald-400 text-xs mt-1 font-medium">
                            {totalCached} capítulos em cache ({estimateSize(totalCached)})
                        </p>
                    )}
                </div>

                {/* Lista de versões */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                        </div>
                    ) : (
                        versoes.map(v => {
                            const status = statusMap[v.codigo] || { cached: 0, total: TOTAL_CHAPTERS, downloading: false, progress: 0 };
                            const isComplete = status.cached >= TOTAL_CHAPTERS;
                            const isDownloading = status.downloading;
                            const hasPartial = status.cached > 0 && !isComplete;

                            return (
                                <div key={v.codigo} className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                                    <div className="p-3 flex items-center gap-3">
                                        {getStatusIcon(status)}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-white font-bold text-sm">{v.nome}</span>
                                                <span className="text-slate-500 text-xs truncate">{v.nomeCompleto}</span>
                                            </div>
                                            <div className="text-xs mt-0.5">
                                                <span className={isComplete ? 'text-emerald-400' : hasPartial ? 'text-blue-400' : 'text-slate-500'}>
                                                    {getStatusText(status)}
                                                </span>
                                                {status.cached > 0 && (
                                                    <span className="text-slate-600 ml-2">{estimateSize(status.cached)}</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            {isDownloading ? (
                                                <button
                                                    onClick={handleCancel}
                                                    className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs font-bold transition-colors flex items-center gap-1"
                                                >
                                                    <Pause className="w-3 h-3" /> Parar
                                                </button>
                                            ) : !isComplete ? (
                                                <button
                                                    onClick={() => handleDownload(v)}
                                                    disabled={!!downloadingVersion}
                                                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 text-xs font-bold transition-colors disabled:opacity-30 flex items-center gap-1"
                                                >
                                                    <Download className="w-3 h-3" />
                                                    {hasPartial ? 'Continuar' : 'Baixar'}
                                                </button>
                                            ) : (
                                                <span className="text-emerald-400 text-xs font-bold px-2">Pronto</span>
                                            )}
                                            {status.cached > 0 && !isDownloading && (
                                                <button
                                                    onClick={() => handleClear(v.codigo)}
                                                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                                                    title="Remover cache"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Barra de progresso */}
                                    {(isDownloading || hasPartial) && (
                                        <div className="h-1 bg-white/5">
                                            <div
                                                className={`h-full transition-all duration-300 ${isDownloading ? 'bg-amber-500' : 'bg-blue-500/50'}`}
                                                style={{ width: `${Math.round((status.cached / TOTAL_CHAPTERS) * 100)}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-white/10 bg-white/5">
                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Os capítulos que você lê são salvos automaticamente no cache.</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
