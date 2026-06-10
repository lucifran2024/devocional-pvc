'use client';

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

// ============================================
// TYPES
// ============================================

export interface CachedVersiculo {
    verse: number;
    text: string;
}

interface CachedChapter {
    key: string;            // "NTLH:43:3" (versao:livroId:cap)
    versao: string;
    livroId: number;
    capitulo: number;
    versiculos: CachedVersiculo[];
    cachedAt: number;       // Date.now()
}

export interface PendingAction {
    id?: number;
    action: 'save' | 'delete' | 'update';
    table: string;
    data: Record<string, unknown>;
    createdAt: number;
}

export interface LocalInteraction {
    localId?: number;
    remoteId?: number;       // id no Supabase (null se nunca sincronizou)
    synced: boolean;
    deleted: boolean;        // marcado para deletar no sync
    tipo: 'destaque' | 'favorito' | 'nota';
    livro_abrev: string;
    livro_nome: string;
    capitulo: number;
    versiculo: number;
    texto_versiculo: string;
    cor?: string;
    nota?: string;
    created_at?: string;
}

interface BibleDBSchema extends DBSchema {
    chapters: {
        key: string;
        value: CachedChapter;
        indexes: { 'by-versao': string };
    };
    pendingActions: {
        key: number;
        value: PendingAction;
    };
    localInteractions: {
        key: number;
        value: LocalInteraction;
        indexes: {
            'by-chapter': [string, number];     // [livro_abrev, capitulo]
            'by-synced': number;                // 0 ou 1
        };
    };
}

// ============================================
// DATABASE
// ============================================

const DB_NAME = 'biblia-offline';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<BibleDBSchema>> | null = null;

function getDB(): Promise<IDBPDatabase<BibleDBSchema>> {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('IndexedDB not available on server'));
    }
    if (!dbPromise) {
        dbPromise = openDB<BibleDBSchema>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                // Store de capítulos
                if (!db.objectStoreNames.contains('chapters')) {
                    const chaptersStore = db.createObjectStore('chapters', { keyPath: 'key' });
                    chaptersStore.createIndex('by-versao', 'versao');
                }
                // Store de ações pendentes (Fase 3)
                if (!db.objectStoreNames.contains('pendingActions')) {
                    db.createObjectStore('pendingActions', { keyPath: 'id', autoIncrement: true });
                }
                // Store de interações locais (Fase 3)
                if (!db.objectStoreNames.contains('localInteractions')) {
                    const interStore = db.createObjectStore('localInteractions', { keyPath: 'localId', autoIncrement: true });
                    interStore.createIndex('by-chapter', ['livro_abrev', 'capitulo']);
                    interStore.createIndex('by-synced', 'synced');
                }
            },
        });
    }
    return dbPromise;
}

// ============================================
// FASE 1: CACHE DE CAPÍTULOS
// ============================================

function makeChapterKey(versao: string, livroId: number, capitulo: number): string {
    return `${versao}:${livroId}:${capitulo}`;
}

/**
 * Busca um capítulo do cache local (IndexedDB).
 * Retorna null se não encontrado.
 */
export async function getCachedChapter(
    versao: string,
    livroId: number,
    capitulo: number
): Promise<CachedVersiculo[] | null> {
    try {
        const db = await getDB();
        const key = makeChapterKey(versao, livroId, capitulo);
        const cached = await db.get('chapters', key);
        return cached ? cached.versiculos : null;
    } catch (err) {
        console.warn('[BIBLE-DB] Erro ao ler cache:', err);
        return null;
    }
}

/**
 * Salva um capítulo no cache local (IndexedDB).
 */
export async function cacheChapter(
    versao: string,
    livroId: number,
    capitulo: number,
    versiculos: CachedVersiculo[]
): Promise<void> {
    try {
        const db = await getDB();
        const key = makeChapterKey(versao, livroId, capitulo);
        await db.put('chapters', {
            key,
            versao,
            livroId,
            capitulo,
            versiculos,
            cachedAt: Date.now(),
        });
    } catch (err) {
        console.warn('[BIBLE-DB] Erro ao salvar cache:', err);
    }
}

/**
 * Retorna estatísticas do cache.
 */
export async function getCacheStats(): Promise<{
    totalChapters: number;
    versions: Record<string, number>;
}> {
    try {
        const db = await getDB();
        const all = await db.getAll('chapters');
        const versions: Record<string, number> = {};
        for (const ch of all) {
            versions[ch.versao] = (versions[ch.versao] || 0) + 1;
        }
        return { totalChapters: all.length, versions };
    } catch {
        return { totalChapters: 0, versions: {} };
    }
}

/**
 * Verifica se uma versão está completamente baixada (1189 capítulos).
 */
export async function isBibleDownloaded(versao: string): Promise<boolean> {
    try {
        const db = await getDB();
        const all = await db.getAllFromIndex('chapters', 'by-versao', versao);
        return all.length >= 1189;
    } catch {
        return false;
    }
}

/**
 * Conta quantos capítulos estão no cache para uma versão.
 */
export async function countCachedChapters(versao: string): Promise<number> {
    try {
        const db = await getDB();
        const all = await db.getAllFromIndex('chapters', 'by-versao', versao);
        return all.length;
    } catch {
        return 0;
    }
}

/**
 * Limpa o cache de uma versão ou de tudo.
 */
export async function clearCache(versao?: string): Promise<void> {
    try {
        const db = await getDB();
        if (versao) {
            const all = await db.getAllFromIndex('chapters', 'by-versao', versao);
            const tx = db.transaction('chapters', 'readwrite');
            for (const ch of all) {
                await tx.store.delete(ch.key);
            }
            await tx.done;
        } else {
            await db.clear('chapters');
        }
    } catch (err) {
        console.warn('[BIBLE-DB] Erro ao limpar cache:', err);
    }
}

// ============================================
// BUSCA LOCAL (offline, sem acento, sem limite de tamanho)
// ============================================

export interface LocalSearchResult {
    book: number;
    chapter: number;
    verse: number;
    text: string;
}

function normalizarBusca(s: string): string {
    return s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');
}

/**
 * Busca texto nos capítulos baixados (IndexedDB).
 * Ignora acentos ("coracao" acha "coração"), aceita termos curtos ("fé")
 * e múltiplas palavras (todas precisam aparecer no versículo).
 * A API bolls.life é accent-sensitive e rejeita termos ≤2 chars — esta
 * busca local cobre exatamente esses casos e ainda funciona offline.
 */
export async function searchVersesLocal(
    versao: string,
    termo: string,
    limit: number = 100
): Promise<LocalSearchResult[]> {
    const palavras = normalizarBusca(termo.trim()).split(/\s+/).filter(Boolean);
    if (palavras.length === 0) return [];

    try {
        const db = await getDB();
        const chapters = await db.getAllFromIndex('chapters', 'by-versao', versao);
        if (chapters.length === 0) return [];

        // Ordena por livro/capítulo para resultados em ordem bíblica
        chapters.sort((a, b) => a.livroId - b.livroId || a.capitulo - b.capitulo);

        const resultados: LocalSearchResult[] = [];
        for (const ch of chapters) {
            for (const v of ch.versiculos) {
                const textoNorm = normalizarBusca(v.text);
                if (palavras.every(p => textoNorm.includes(p))) {
                    resultados.push({
                        book: ch.livroId,
                        chapter: ch.capitulo,
                        verse: v.verse,
                        text: v.text,
                    });
                    if (resultados.length >= limit) return resultados;
                }
            }
        }
        return resultados;
    } catch (err) {
        console.warn('[BIBLE-DB] Erro na busca local:', err);
        return [];
    }
}

// ============================================
// FASE 2: DOWNLOAD EM BATCH
// ============================================

// Total de capítulos por livro (bookId -> capitulos)
const CAPITULOS_POR_LIVRO: Record<number, number> = {
    1:50, 2:40, 3:27, 4:36, 5:34, 6:24, 7:21, 8:4, 9:31, 10:24,
    11:22, 12:25, 13:29, 14:36, 15:10, 16:13, 17:10, 18:42, 19:150, 20:31,
    21:12, 22:8, 23:66, 24:52, 25:5, 26:48, 27:12, 28:14, 29:3, 30:9,
    31:1, 32:4, 33:7, 34:3, 35:3, 36:3, 37:2, 38:14, 39:4,
    40:28, 41:16, 42:24, 43:21, 44:28, 45:16, 46:16, 47:13, 48:6, 49:6,
    50:4, 51:4, 52:5, 53:3, 54:6, 55:4, 56:3, 57:1, 58:13, 59:5,
    60:5, 61:3, 62:5, 63:1, 64:1, 65:1, 66:22,
};

const TOTAL_CHAPTERS = 1189;

/**
 * Baixa toda uma versão da Bíblia em batch.
 * Retorna o número de capítulos baixados com sucesso.
 */
export async function downloadBibleVersion(
    versao: string,
    onProgress: (done: number, total: number) => void,
    signal?: AbortSignal
): Promise<number> {
    let downloaded = 0;
    const failed: { livroId: number; cap: number }[] = [];

    // Gerar lista de todos os capítulos para baixar
    const jobs: { livroId: number; cap: number }[] = [];
    for (const [bookIdStr, totalCaps] of Object.entries(CAPITULOS_POR_LIVRO)) {
        const bookId = Number(bookIdStr);
        for (let cap = 1; cap <= totalCaps; cap++) {
            jobs.push({ livroId: bookId, cap });
        }
    }

    // Baixar em chunks de 5 simultâneos
    const CHUNK_SIZE = 5;
    for (let i = 0; i < jobs.length; i += CHUNK_SIZE) {
        if (signal?.aborted) break;

        const chunk = jobs.slice(i, i + CHUNK_SIZE);
        const results = await Promise.allSettled(
            chunk.map(async ({ livroId, cap }) => {
                // Verificar se já tem no cache
                const cached = await getCachedChapter(versao, livroId, cap);
                if (cached) {
                    downloaded++;
                    onProgress(downloaded, TOTAL_CHAPTERS);
                    return;
                }

                const resp = await fetch(
                    `https://bolls.life/get-chapter/${versao}/${livroId}/${cap}/`,
                    { signal }
                );
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const data = await resp.json();
                if (!Array.isArray(data)) throw new Error('Formato inválido');

                const versiculos = data.map((v: { verse: number; text: string }) => ({
                    verse: v.verse,
                    text: v.text.replace(/<[^>]*>/g, ''),
                }));

                await cacheChapter(versao, livroId, cap, versiculos);
                downloaded++;
                onProgress(downloaded, TOTAL_CHAPTERS);
            })
        );

        // Coletar falhas para retry
        results.forEach((r, idx) => {
            if (r.status === 'rejected') {
                failed.push(chunk[idx]);
            }
        });

        // Pequeno delay entre chunks para não sobrecarregar a API
        if (i + CHUNK_SIZE < jobs.length) {
            await new Promise(r => setTimeout(r, 100));
        }
    }

    // Retry dos que falharam (uma vez)
    if (failed.length > 0 && !signal?.aborted) {
        for (const { livroId, cap } of failed) {
            if (signal?.aborted) break;
            try {
                const resp = await fetch(
                    `https://bolls.life/get-chapter/${versao}/${livroId}/${cap}/`,
                    { signal }
                );
                if (resp.ok) {
                    const data = await resp.json();
                    if (Array.isArray(data)) {
                        const versiculos = data.map((v: { verse: number; text: string }) => ({
                            verse: v.verse,
                            text: v.text.replace(/<[^>]*>/g, ''),
                        }));
                        await cacheChapter(versao, livroId, cap, versiculos);
                        downloaded++;
                        onProgress(downloaded, TOTAL_CHAPTERS);
                    }
                }
            } catch { /* skip */ }
            await new Promise(r => setTimeout(r, 200));
        }
    }

    return downloaded;
}

// ============================================
// FASE 3: INTERAÇÕES OFFLINE
// ============================================

/**
 * Salva uma interação localmente no IndexedDB.
 */
export async function salvarInteracaoLocal(interacao: Omit<LocalInteraction, 'localId' | 'synced' | 'deleted'>): Promise<number> {
    const db = await getDB();
    const localId = await db.add('localInteractions', {
        ...interacao,
        synced: false,
        deleted: false,
    } as LocalInteraction);
    return localId;
}

/**
 * Busca interações locais por capítulo.
 */
export async function getInteracoesLocais(livroAbrev: string, capitulo: number): Promise<LocalInteraction[]> {
    try {
        const db = await getDB();
        const all = await db.getAllFromIndex('localInteractions', 'by-chapter', [livroAbrev, capitulo]);
        return all.filter(i => !i.deleted);
    } catch {
        return [];
    }
}

/**
 * Marca uma interação local como deletada.
 */
export async function marcarInteracaoRemovida(localId: number): Promise<void> {
    const db = await getDB();
    const item = await db.get('localInteractions', localId);
    if (item) {
        item.deleted = true;
        item.synced = false;
        await db.put('localInteractions', item);
    }
}

/**
 * Atualiza nota de uma interação local.
 */
export async function atualizarNotaLocal(localId: number, nota: string): Promise<void> {
    const db = await getDB();
    const item = await db.get('localInteractions', localId);
    if (item) {
        item.nota = nota;
        item.synced = false;
        await db.put('localInteractions', item);
    }
}

/**
 * Enfileira uma ação para sync posterior.
 */
export async function queueAction(action: Omit<PendingAction, 'id' | 'createdAt'>): Promise<void> {
    const db = await getDB();
    await db.add('pendingActions', {
        ...action,
        createdAt: Date.now(),
    } as PendingAction);
}

/**
 * Retorna todas ações pendentes.
 */
export async function getPendingActions(): Promise<PendingAction[]> {
    const db = await getDB();
    return db.getAll('pendingActions');
}

/**
 * Remove uma ação pendente (após sync bem sucedido).
 */
export async function removePendingAction(id: number): Promise<void> {
    const db = await getDB();
    await db.delete('pendingActions', id);
}

/**
 * Conta ações pendentes.
 */
export async function getPendingCount(): Promise<number> {
    const db = await getDB();
    return (await db.getAll('pendingActions')).length;
}

/**
 * Sincroniza interações locais com as do Supabase.
 * Insere no IndexedDB todas que vieram do servidor (com synced=true).
 */
export async function syncInteracoesFromServer(interacoes: LocalInteraction[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('localInteractions', 'readwrite');
    for (const inter of interacoes) {
        await tx.store.put({
            ...inter,
            synced: true,
            deleted: false,
        });
    }
    await tx.done;
}

/**
 * Retorna todas interações não sincronizadas.
 */
export async function getUnsyncedInteractions(): Promise<LocalInteraction[]> {
    try {
        const db = await getDB();
        const all = await db.getAll('localInteractions');
        return all.filter(i => !i.synced);
    } catch {
        return [];
    }
}
