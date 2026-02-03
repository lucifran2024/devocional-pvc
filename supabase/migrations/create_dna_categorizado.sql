-- =====================================================
-- NOVA TABELA: dna_categorizado
-- =====================================================
-- Execute este SQL no Supabase SQL Editor

-- Criar tipo ENUM para categorias
DO $$ BEGIN
    CREATE TYPE categoria_dna AS ENUM (
        'devocional',
        'oração',
        'versículo',
        'reflexão',
        'exortação',
        'declaração',
        'outro'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tabela para DNA Categorizado
CREATE TABLE IF NOT EXISTS dna_categorizado (
    id SERIAL PRIMARY KEY,
    texto_msg TEXT NOT NULL,
    categoria TEXT NOT NULL DEFAULT 'outro',
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_dna_categoria ON dna_categorizado(categoria);
CREATE INDEX IF NOT EXISTS idx_dna_created ON dna_categorizado(created_at DESC);

-- Verificar se foi criado
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'dna_categorizado';
