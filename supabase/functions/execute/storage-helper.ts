/**
 * Storage Helper - Gerencia downloads do Supabase Storage
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Cache em memória
let cachedBaseConhecimento: string | null = null;
let cachedConhecimentoCompilado: string | null = null;
let cachedBancoOuroExemplos: string | null = null;
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
 * Carrega arquivos de conhecimento (com cache)
 */
export async function loadKnowledgeFiles(
    supabase: SupabaseClient,
    bucket: string = 'pvc'
): Promise<{
    baseConhecimento: string;
    conhecimentoCompilado: string;
    bancoOuroExemplos: string;
}> {
    const now = Date.now();
    const cacheExpired = !cacheTimestamp || (now - cacheTimestamp) > CACHE_TTL_MS;

    if (cacheExpired || !cachedBaseConhecimento) {
        console.log('📥 [CACHE] Baixando arquivos de conhecimento...');

        const [base, compilado, ouro] = await Promise.all([
            downloadFile(supabase, bucket, 'base/BASE_DE_CONHECIMENTO_UNIFICADA_v2.txt'),
            downloadFile(supabase, bucket, 'base/Conhecimento_Compilado_Essencial.v1.4.txt'),
            downloadFile(supabase, bucket, 'base/BANCO_DE_OURO_EXEMPLOS E BANCO_MICRO_SHOTS.txt')
        ]);

        cachedBaseConhecimento = base || '';
        cachedConhecimentoCompilado = compilado || '';
        cachedBancoOuroExemplos = ouro || '';
        cacheTimestamp = now;

        console.log(`📚 [CACHE] Atualizado. Base=${cachedBaseConhecimento.length} chars`);
    } else {
        console.log('⚡ [CACHE] Usando cache existente');
    }

    return {
        baseConhecimento: cachedBaseConhecimento!,
        conhecimentoCompilado: cachedConhecimentoCompilado!,
        bancoOuroExemplos: cachedBancoOuroExemplos!
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
    cachedBaseConhecimento = null;
    cachedConhecimentoCompilado = null;
    cachedBancoOuroExemplos = null;
    cacheTimestamp = null;
    console.log('🗑️ [CACHE] Invalidado manualmente');
}
