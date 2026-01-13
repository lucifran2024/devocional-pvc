// =====================================================
// RAG Helper - Busca semântica de documentos
// Usado pela Edge Function /execute
// =====================================================

const GEMINI_API_KEY = Deno.env.get('GEMINI_KEY');

/**
 * Gera embedding para uma query usando Gemini
 */
export async function generateQueryEmbedding(query: string): Promise<number[] | null> {
    if (!GEMINI_API_KEY) {
        console.error('❌ [RAG] GEMINI_KEY não configurada');
        return null;
    }

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'models/text-embedding-004',
                    content: { parts: [{ text: query }] }
                })
            }
        );

        if (!response.ok) {
            console.error('❌ [RAG] Erro na API Gemini:', await response.text());
            return null;
        }

        const data = await response.json();
        return data.embedding?.values || null;
    } catch (error) {
        console.error('❌ [RAG] Erro ao gerar embedding:', error);
        return null;
    }
}

/**
 * Busca chunks relevantes no banco de dados
 */
export async function searchRelevantChunks(
    supabaseClient: any,
    query: string,
    matchCount: number = 5
): Promise<{ content: string; document: string; similarity: number }[]> {
    console.log(`🔍 [RAG] Buscando chunks relevantes para: "${query.substring(0, 50)}..."`);

    // 1. Gera embedding da query
    const queryEmbedding = await generateQueryEmbedding(query);

    if (!queryEmbedding) {
        console.log('⚠️ [RAG] Não foi possível gerar embedding, retornando vazio');
        return [];
    }

    // 2. Busca chunks similares usando a função do banco
    const { data, error } = await supabaseClient.rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_count: matchCount,
        filter: {}
    });

    if (error) {
        console.error('❌ [RAG] Erro na busca:', error);
        return [];
    }

    console.log(`✅ [RAG] Encontrados ${data?.length || 0} chunks relevantes`);

    return (data || []).map((chunk: any) => ({
        content: chunk.content,
        document: chunk.document_name,
        similarity: chunk.similarity
    }));
}

/**
 * Formata chunks para inclusão no prompt
 */
export function formatChunksForPrompt(chunks: { content: string; document: string; similarity: number }[]): string {
    if (chunks.length === 0) return '';

    const formatted = chunks
        .map((c, i) => `[Trecho ${i + 1} - ${c.document} (relevância: ${(c.similarity * 100).toFixed(1)}%)]\n${c.content}`)
        .join('\n\n---\n\n');

    return `
=== CONHECIMENTO RELEVANTE (via RAG) ===

${formatted}

=== FIM DO CONHECIMENTO RELEVANTE ===
`;
}

/**
 * Função principal: busca e formata contexto relevante
 */
export async function getRelevantContext(
    supabaseClient: any,
    passagem: string,
    modoId: string,
    maxChunks: number = 10
): Promise<string> {
    // Cria uma query combinando passagem e modo
    const query = `${passagem} ${modoId} devocional cristão bíblia`;

    const chunks = await searchRelevantChunks(supabaseClient, query, maxChunks);

    if (chunks.length === 0) {
        console.log('⚠️ [RAG] Nenhum chunk encontrado, usando fallback');
        return '';
    }

    return formatChunksForPrompt(chunks);
}
