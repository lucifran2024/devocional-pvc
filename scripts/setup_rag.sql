-- =====================================================
-- RAG Setup para Devocional PVC
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- 1. Habilita a extensão de vetores
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Cria tabela para armazenar chunks de documentos
CREATE TABLE IF NOT EXISTS document_chunks (
    id BIGSERIAL PRIMARY KEY,
    document_name TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(768),  -- Dimensão do Gemini embedding
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Índice único para evitar duplicatas
    UNIQUE(document_name, chunk_index)
);

-- 3. Índice para busca por similaridade (melhora performance)
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx 
ON document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 4. Índice para busca por nome do documento
CREATE INDEX IF NOT EXISTS document_chunks_name_idx 
ON document_chunks(document_name);

-- 5. Função para buscar chunks similares a uma query
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding VECTOR(768),
    match_count INT DEFAULT 5,
    filter JSONB DEFAULT '{}'
)
RETURNS TABLE (
    id BIGINT,
    document_name TEXT,
    content TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.document_name,
        dc.content,
        1 - (dc.embedding <=> query_embedding) AS similarity
    FROM document_chunks dc
    WHERE dc.metadata @> filter
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 6. Desabilita RLS para simplicidade (já que não há autenticação de usuário)
ALTER TABLE document_chunks DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- Pronto! Agora você pode executar o script de indexação
-- =====================================================
