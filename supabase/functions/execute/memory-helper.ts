/**
 * Memory Helper - Gerencia favoritos e histórico para contexto
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Detecta categoria de um texto favorito
 */
function detectarCategoria(texto: string): string {
    const textoLower = texto.toLowerCase();

    // Oração
    if (textoLower.includes('senhor,') || textoLower.includes('pai,') ||
        textoLower.includes('amém') || textoLower.includes('te peço')) {
        return 'ORACAO';
    }

    // Staccato - frases curtas
    const linhas = texto.split('\n').filter(l => l.trim().length > 0);
    const mediaCaracteresPorLinha = texto.length / linhas.length;
    if (linhas.length >= 5 && mediaCaracteresPorLinha < 80) {
        return 'STACCATO';
    }

    // Lista
    if (texto.includes('•') || texto.includes('1.') || texto.includes('- ')) {
        return 'LISTA';
    }

    // Micro
    if (texto.length < 300) {
        return 'MICRO';
    }

    return 'NARRATIVO';
}

/**
 * Carrega memória de favoritos com diversidade de categorias
 */
export async function loadMemory(supabase: SupabaseClient): Promise<string> {
    // Busca todos os favoritos individuais
    const { data: todosFavoritos } = await supabase
        .from('favoritos_mensagens')
        .select('texto_msg, created_at');

    // Agrupa por categoria
    const porCategoria: Record<string, any[]> = {
        ORACAO: [],
        STACCATO: [],
        LISTA: [],
        MICRO: [],
        NARRATIVO: []
    };

    if (todosFavoritos && todosFavoritos.length > 0) {
        todosFavoritos.forEach((f: any) => {
            const cat = detectarCategoria(f.texto_msg);
            porCategoria[cat].push(f);
        });
    }

    // Sorteia 3 de cada categoria (máximo 15 total)
    const memoriaPartes: string[] = [];
    const categorias = Object.keys(porCategoria);

    for (const cat of categorias) {
        const favoritos = porCategoria[cat];
        if (favoritos.length > 0) {
            const sorteados = favoritos
                .sort(() => Math.random() - 0.5)
                .slice(0, 3);

            sorteados.forEach((f: any) => {
                memoriaPartes.push(`-- ⭐ [${cat}] Exemplo:\n${f.texto_msg.substring(0, 350)}...`);
            });
        }
    }

    console.log(`🎲 [FAVORITOS] ${memoriaPartes.length} exemplos de ${categorias.length} categorias`);

    // Fallback para histórico antigo se não tiver favoritos individuais
    if (memoriaPartes.length === 0) {
        const { data: historicoAntigo } = await supabase
            .from('historico_geracoes')
            .select('passagem, resultado_texto, aprovado')
            .eq('aprovado', true)
            .order('created_at', { ascending: false })
            .limit(5);

        if (historicoAntigo && historicoAntigo.length > 0) {
            historicoAntigo.forEach((h: any) => {
                memoriaPartes.push(`-- 📜 Histórico Aprovado (${h.passagem}):\n${h.resultado_texto.substring(0, 250)}...`);
            });
            console.log(`📜 [HISTORICO] Fallback: ${historicoAntigo.length} favoritos antigos`);
        }
    }

    return memoriaPartes.length > 0
        ? memoriaPartes.join('\n\n')
        : 'Não há favoritos ainda. Gere devocionais e curta suas mensagens preferidas!';
}

/**
 * Carrega DNA dos últimos dias para evitar repetição
 */
export async function loadRecentDNA(
    supabase: SupabaseClient,
    currentDate: string,
    limit: number = 20
): Promise<{ angulosUsados: string[]; temperaturasUsadas: string[] }> {
    const { data: dnaRecente } = await supabase
        .from('historico_geracoes')
        .select('data_referencia, dna_geracao')
        .not('dna_geracao', 'is', null)
        .lt('data_referencia', currentDate)
        .order('data_referencia', { ascending: false })
        .limit(limit);

    // Extrair datas únicas (últimos 5 dias)
    const diasUnicos = [...new Set(dnaRecente?.map((d: any) => d.data_referencia) || [])].slice(0, 5);

    const angulosUsados = dnaRecente
        ?.filter((d: any) => diasUnicos.includes(d.data_referencia))
        ?.map((d: any) => d.dna_geracao?.angulo)
        ?.filter(Boolean) || [];

    const temperaturasUsadas = dnaRecente
        ?.filter((d: any) => diasUnicos.includes(d.data_referencia))
        ?.map((d: any) => d.dna_geracao?.temperatura)
        ?.filter(Boolean) || [];

    console.log(`🧬 [DNA] Dias: ${diasUnicos.length}, Ângulos usados: ${angulosUsados.length}`);

    return { angulosUsados, temperaturasUsadas };
}

/**
 * Carrega contexto profundo do dia (léxico e insights)
 */
export async function loadDeepContext(
    supabase: SupabaseClient,
    data: string
): Promise<string> {
    const { data: deepData, error } = await supabase
        .from('leitura_do_dia')
        .select('lexico_do_dia, insights_pre_minerados')
        .eq('data', data)
        .maybeSingle();

    if (error) {
        console.error('Erro ao buscar dados profundos:', error);
        return '';
    }

    let context = '';

    if (deepData?.lexico_do_dia && Array.isArray(deepData.lexico_do_dia)) {
        context += `\n\n### LÉXICO CHAVE (Palavras Essenciais):\n${deepData.lexico_do_dia.join(', ')}.`;
    }

    if (deepData?.insights_pre_minerados) {
        context += `\n\n### INSIGHTS PRÉ-MINERADOS:\n${JSON.stringify(deepData.insights_pre_minerados, null, 2)}`;
    }

    return context;
}
