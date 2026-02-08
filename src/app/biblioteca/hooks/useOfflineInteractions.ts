'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    salvarInteracaoBiblia,
    removerInteracaoBiblia,
    removerInteracaoPorVersiculoETipo,
    getInteracoesPorCapitulo,
    atualizarNotaBiblia,
    type BibliaInteracao,
} from '@/lib/supabase';
import {
    queueAction,
    getPendingActions,
    removePendingAction,
    getPendingCount,
} from '@/lib/bible-db';

interface InteracoesMap {
    destaques: Record<number, BibliaInteracao>;
    favoritos: Record<number, BibliaInteracao>;
    notas: Record<number, BibliaInteracao>;
}

// ID local para itens criados offline (negativo para não conflitar com Supabase)
let offlineIdCounter = -1;

/**
 * Hook que gerencia interações da Bíblia com suporte offline.
 * Online: salva no Supabase normalmente.
 * Offline: salva localmente e enfileira para sync.
 */
export function useOfflineInteractions(livroAbrev: string, livroNome: string, capitulo: number) {
    const [interacoesMap, setInteracoesMap] = useState<InteracoesMap>({ destaques: {}, favoritos: {}, notas: {} });
    const [pendingCount, setPendingCount] = useState(0);
    const [syncing, setSyncing] = useState(false);
    const localCacheRef = useRef<BibliaInteracao[]>([]);

    // Carregar interações do Supabase (ou do cache local se offline)
    const carregarInteracoes = useCallback(async () => {
        const map: InteracoesMap = { destaques: {}, favoritos: {}, notas: {} };

        if (navigator.onLine) {
            try {
                const dados = await getInteracoesPorCapitulo(livroAbrev, capitulo);
                localCacheRef.current = dados;
                localStorage.setItem(`biblia-inter-${livroAbrev}-${capitulo}`, JSON.stringify(dados));

                dados.forEach((item: BibliaInteracao) => {
                    if (item.tipo === 'destaque') map.destaques[item.versiculo] = item;
                    else if (item.tipo === 'favorito') map.favoritos[item.versiculo] = item;
                    else if (item.tipo === 'nota') map.notas[item.versiculo] = item;
                });
            } catch {
                // Falhou mesmo online, tenta cache local
                loadFromLocalCache(map);
            }
        } else {
            // Offline: usa cache do localStorage
            loadFromLocalCache(map);
        }

        setInteracoesMap(map);
        updatePendingCount();
    }, [livroAbrev, capitulo]);

    const loadFromLocalCache = (map: InteracoesMap) => {
        try {
            const cached = localStorage.getItem(`biblia-inter-${livroAbrev}-${capitulo}`);
            if (cached) {
                const dados: BibliaInteracao[] = JSON.parse(cached);
                localCacheRef.current = dados;
                dados.forEach((item) => {
                    if (item.tipo === 'destaque') map.destaques[item.versiculo] = item;
                    else if (item.tipo === 'favorito') map.favoritos[item.versiculo] = item;
                    else if (item.tipo === 'nota') map.notas[item.versiculo] = item;
                });
            }
        } catch { /* cache vazio */ }
    };

    const updatePendingCount = async () => {
        try {
            const count = await getPendingCount();
            setPendingCount(count);
        } catch {
            setPendingCount(0);
        }
    };

    // Salvar interação (online ou offline)
    const salvarInteracao = async (interacao: Omit<BibliaInteracao, 'id' | 'created_at'>): Promise<BibliaInteracao | null> => {
        if (navigator.onLine) {
            try {
                const { data } = await salvarInteracaoBiblia(interacao);
                return data;
            } catch {
                // Falhou, salva offline
            }
        }

        // Offline: cria item local
        const localItem: BibliaInteracao = {
            ...interacao,
            id: offlineIdCounter--,
            created_at: new Date().toISOString(),
        };

        // Enfileirar para sync
        await queueAction({
            action: 'save',
            table: 'biblia_interacoes',
            data: interacao as unknown as Record<string, unknown>,
        });

        // Adicionar ao cache local
        localCacheRef.current.push(localItem);
        localStorage.setItem(`biblia-inter-${livroAbrev}-${capitulo}`, JSON.stringify(localCacheRef.current));
        updatePendingCount();

        return localItem;
    };

    // Remover interação por ID
    const removerInteracao = async (id: number): Promise<void> => {
        if (navigator.onLine && id > 0) {
            try {
                await removerInteracaoBiblia(id);
                // Remover do cache local
                localCacheRef.current = localCacheRef.current.filter(i => i.id !== id);
                localStorage.setItem(`biblia-inter-${livroAbrev}-${capitulo}`, JSON.stringify(localCacheRef.current));
                return;
            } catch { /* falhou, tenta offline */ }
        }

        // Offline: remove do cache local
        localCacheRef.current = localCacheRef.current.filter(i => i.id !== id);
        localStorage.setItem(`biblia-inter-${livroAbrev}-${capitulo}`, JSON.stringify(localCacheRef.current));

        if (id > 0) {
            // Era um item real do Supabase — enfileirar delete
            await queueAction({
                action: 'delete',
                table: 'biblia_interacoes',
                data: { id },
            });
            updatePendingCount();
        }
    };

    // Remover por versículo e tipo
    const removerPorVersiculoETipo = async (tipo: string, versiculo: number): Promise<void> => {
        if (navigator.onLine) {
            try {
                await removerInteracaoPorVersiculoETipo(tipo, livroAbrev, capitulo, versiculo);
                localCacheRef.current = localCacheRef.current.filter(
                    i => !(i.tipo === tipo && i.versiculo === versiculo)
                );
                localStorage.setItem(`biblia-inter-${livroAbrev}-${capitulo}`, JSON.stringify(localCacheRef.current));
                return;
            } catch { /* offline fallback */ }
        }

        // Offline
        const item = localCacheRef.current.find(i => i.tipo === tipo && i.versiculo === versiculo);
        localCacheRef.current = localCacheRef.current.filter(
            i => !(i.tipo === tipo && i.versiculo === versiculo)
        );
        localStorage.setItem(`biblia-inter-${livroAbrev}-${capitulo}`, JSON.stringify(localCacheRef.current));

        if (item && item.id && item.id > 0) {
            await queueAction({
                action: 'delete',
                table: 'biblia_interacoes',
                data: { tipo, livro_abrev: livroAbrev, capitulo, versiculo },
            });
            updatePendingCount();
        }
    };

    // Atualizar nota
    const atualizarNota = async (id: number, nota: string): Promise<void> => {
        if (navigator.onLine && id > 0) {
            try {
                await atualizarNotaBiblia(id, nota);
                const item = localCacheRef.current.find(i => i.id === id);
                if (item) item.nota = nota;
                localStorage.setItem(`biblia-inter-${livroAbrev}-${capitulo}`, JSON.stringify(localCacheRef.current));
                return;
            } catch { /* offline fallback */ }
        }

        // Offline
        const item = localCacheRef.current.find(i => i.id === id);
        if (item) item.nota = nota;
        localStorage.setItem(`biblia-inter-${livroAbrev}-${capitulo}`, JSON.stringify(localCacheRef.current));

        if (id > 0) {
            await queueAction({
                action: 'update',
                table: 'biblia_interacoes',
                data: { id, nota },
            });
            updatePendingCount();
        }
    };

    // Processar fila de sync quando volta online
    const syncPendingActions = useCallback(async (): Promise<number> => {
        setSyncing(true);
        let successCount = 0;

        try {
            const actions = await getPendingActions();

            for (const action of actions) {
                try {
                    if (action.action === 'save' && action.table === 'biblia_interacoes') {
                        await salvarInteracaoBiblia(action.data as unknown as Omit<BibliaInteracao, 'id' | 'created_at'>);
                        successCount++;
                    } else if (action.action === 'delete' && action.table === 'biblia_interacoes') {
                        if (action.data.id) {
                            await removerInteracaoBiblia(action.data.id as number);
                        } else {
                            await removerInteracaoPorVersiculoETipo(
                                action.data.tipo as string,
                                action.data.livro_abrev as string,
                                action.data.capitulo as number,
                                action.data.versiculo as number
                            );
                        }
                        successCount++;
                    } else if (action.action === 'update' && action.table === 'biblia_interacoes') {
                        await atualizarNotaBiblia(action.data.id as number, action.data.nota as string);
                        successCount++;
                    }

                    // Remover ação processada
                    if (action.id) await removePendingAction(action.id);
                } catch {
                    // Falhou — mantém na fila para próxima tentativa
                    console.warn('[OFFLINE-SYNC] Falha ao sincronizar ação:', action);
                }
            }
        } finally {
            setSyncing(false);
            updatePendingCount();
        }

        return successCount;
    }, []);

    // Auto-sync quando volta online
    useEffect(() => {
        const handleOnline = async () => {
            const synced = await syncPendingActions();
            if (synced > 0) {
                // Recarregar interações frescas do servidor
                carregarInteracoes();
            }
        };

        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [syncPendingActions, carregarInteracoes]);

    return {
        interacoesMap,
        pendingCount,
        syncing,
        carregarInteracoes,
        salvarInteracao,
        removerInteracao,
        removerPorVersiculoETipo,
        atualizarNota,
        syncPendingActions,
    };
}
