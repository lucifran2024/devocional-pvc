/**
 * Storage Helper - Gerencia downloads do Supabase Storage
 * v5 — BASE removida. Apenas CCE como conhecimento externo.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Cache em memória (apenas CCE)
let cachedConhecimentoCompilado: string | null = null;
let cacheTimestamp: number | null = null;
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hora

/**
 * Download de arquivo do Storage
 */
export async function downloadFile(
    supabase: SupabaseClient,
    bucket: string,
    path: string
): Promise<string | null> {
    if (!path) return '';

    const { data: file, error } = await supabase.storage
        .from(bucket)
        .download(path.trim());

    if (error) {
        console.error(`Erro ao baixar ${path}:`, error);
        return null;
    }

    return await file.text();
}

/**
 * Carrega CCE (Conhecimento Compilado Essencial) com cache
 */
export async function loadKnowledgeFiles(
    supabase: SupabaseClient,
    bucket: string = 'pvc'
): Promise<{
    conhecimentoCompilado: string;
}> {
    const now = Date.now();
    const cacheExpired = !cacheTimestamp || (now - cacheTimestamp) > CACHE_TTL_MS;

    if (cacheExpired || !cachedConhecimentoCompilado) {
        console.log('📥 [CACHE] Baixando CCE...');

        const compilado = await downloadFile(supabase, bucket, 'base/Conhecimento_Compilado_Essencial.v1.4.txt');

        cachedConhecimentoCompilado = compilado || '';
        cacheTimestamp = now;

        console.log(`📚 [CACHE] Atualizado. CCE=${cachedConhecimentoCompilado.length} chars`);
    } else {
        console.log('⚡ [CACHE] Usando CCE do cache');
    }

    return {
        conhecimentoCompilado: cachedConhecimentoCompilado!
    };
}

/**
 * Carrega arquivos específicos da requisição (sem cache)
 */
export async function loadRequestFiles(
    supabase: SupabaseClient,
    modoStoragePath: string,
    bucket: string = 'pvc'
): Promise<{
    agentStart: string;
    modoTexto: string;
}> {
    const [agentStart, modoTexto] = await Promise.all([
        downloadFile(supabase, bucket, 'agent_start/AGENT_START.txt'),
        downloadFile(supabase, bucket, modoStoragePath)
    ]);

    if (!modoTexto) {
        throw new Error(`Arquivo do modo (${modoStoragePath}) não encontrado no bucket '${bucket}'.`);
    }

    return {
        agentStart: agentStart || 'Você é um assistente pastoral sábio e acolhedor.',
        modoTexto
    };
}

/**
 * Invalida o cache manualmente
 */
export function invalidateCache(): void {
    cachedConhecimentoCompilado = null;
    cacheTimestamp = null;
    console.log('🗑️ [CACHE] Invalidado manualmente');
}
