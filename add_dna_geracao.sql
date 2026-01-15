-- =====================================================
-- MIGRAÇÃO: Adicionar campo dna_geracao
-- =====================================================
-- Execute este SQL no Supabase SQL Editor

ALTER TABLE historico_geracoes 
ADD COLUMN IF NOT EXISTS dna_geracao JSONB;

-- Criar índice para consultas por data (otimização)
CREATE INDEX IF NOT EXISTS idx_historico_data_ref 
ON historico_geracoes(data_referencia DESC);

-- Verificar se foi criado
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'historico_geracoes' 
AND column_name = 'dna_geracao';
