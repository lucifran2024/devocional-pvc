-- =====================================================
-- MIGRAÇÃO: Criar tabela favoritos_mensagens
-- =====================================================
-- Execute este SQL no Supabase SQL Editor

-- Tabela para armazenar favoritos de mensagens individuais
CREATE TABLE IF NOT EXISTS favoritos_mensagens (
    id SERIAL PRIMARY KEY,
    historico_id INTEGER REFERENCES historico_geracoes(id) ON DELETE CASCADE,
    indice_msg INTEGER NOT NULL DEFAULT 0,
    texto_msg TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permitir NULL em historico_id (para mensagens manuais)
ALTER TABLE favoritos_mensagens 
ALTER COLUMN historico_id DROP NOT NULL;

-- Índice para busca rápida por historico_id
CREATE INDEX IF NOT EXISTS idx_favoritos_historico 
ON favoritos_mensagens(historico_id);

-- Índice para busca de todos os favoritos recentes
CREATE INDEX IF NOT EXISTS idx_favoritos_created 
ON favoritos_mensagens(created_at DESC);

-- Verificar se foi criado
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'favoritos_mensagens';
