-- =====================================================
-- MIGRAÇÃO: Consolidar favoritos_mensagens → dna_categorizado
-- =====================================================
-- Objetivo: Unificar as duas tabelas de favoritos em uma só (dna_categorizado)
-- Adiciona historico_id e indice_msg ao dna_categorizado para manter vínculo com gerações

-- 1. Adicionar colunas ao dna_categorizado
ALTER TABLE dna_categorizado
ADD COLUMN IF NOT EXISTS historico_id INTEGER REFERENCES historico_geracoes(id) ON DELETE SET NULL;

ALTER TABLE dna_categorizado
ADD COLUMN IF NOT EXISTS indice_msg INTEGER DEFAULT 0;

-- 2. Criar índices para busca por historico_id
CREATE INDEX IF NOT EXISTS idx_dna_historico_id ON dna_categorizado(historico_id);
CREATE INDEX IF NOT EXISTS idx_dna_historico_indice ON dna_categorizado(historico_id, indice_msg);

-- 3. Migrar entradas COM historico_id (favoritos do gerador)
-- Estas nunca existiram no dna_categorizado antes
INSERT INTO dna_categorizado (texto_msg, categoria, tags, historico_id, indice_msg, created_at)
SELECT
    fm.texto_msg,
    CASE
        WHEN fm.texto_msg ILIKE '%oração%' OR fm.texto_msg ILIKE '%senhor%obrigado%'
            OR fm.texto_msg ILIKE '%amém%' OR fm.texto_msg ILIKE '%te peço%'
            OR fm.texto_msg ILIKE '%pai%entrego%' OR fm.texto_msg ILIKE '%consagro%'
            THEN 'oração'
        WHEN fm.texto_msg ~ '\([A-Za-záéíóúãõê]+ \d+:\d+.*\)'
            OR fm.texto_msg ILIKE '%salmos%' OR fm.texto_msg ILIKE '%isaías%'
            OR fm.texto_msg ILIKE '%mateus%' OR fm.texto_msg ILIKE '%eclesiastes%'
            THEN 'versículo'
        WHEN fm.texto_msg ILIKE '%📖 leitura do dia%'
            OR fm.texto_msg ILIKE '**%**%'
            THEN 'devocional'
        WHEN fm.texto_msg ILIKE '%declaro%' OR fm.texto_msg ILIKE '%profetizo%'
            OR fm.texto_msg ILIKE '%eu creio%' OR fm.texto_msg ILIKE '%deus diz%'
            THEN 'declaração'
        WHEN fm.texto_msg ILIKE '%confie%' OR fm.texto_msg ILIKE '%não desista%'
            OR fm.texto_msg ILIKE '%você é%' OR fm.texto_msg ILIKE '%aguente firme%'
            THEN 'exortação'
        WHEN LENGTH(fm.texto_msg) < 300 THEN 'reflexão'
        ELSE 'outro'
    END as categoria,
    ARRAY['migrado_favoritos']::TEXT[] as tags,
    fm.historico_id,
    fm.indice_msg,
    fm.created_at
FROM favoritos_mensagens fm
WHERE fm.historico_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM dna_categorizado dc
    WHERE dc.texto_msg = fm.texto_msg
);

-- 4. Migrar entradas manuais (historico_id IS NULL) que ainda não existem
INSERT INTO dna_categorizado (texto_msg, categoria, tags, historico_id, indice_msg, created_at)
SELECT
    fm.texto_msg,
    CASE
        WHEN fm.texto_msg ILIKE '%oração%' OR fm.texto_msg ILIKE '%senhor%obrigado%'
            OR fm.texto_msg ILIKE '%amém%' OR fm.texto_msg ILIKE '%te peço%'
            OR fm.texto_msg ILIKE '%pai%entrego%' OR fm.texto_msg ILIKE '%consagro%'
            THEN 'oração'
        WHEN fm.texto_msg ~ '\([A-Za-záéíóúãõê]+ \d+:\d+.*\)'
            OR fm.texto_msg ILIKE '%salmos%' OR fm.texto_msg ILIKE '%isaías%'
            OR fm.texto_msg ILIKE '%mateus%' OR fm.texto_msg ILIKE '%eclesiastes%'
            THEN 'versículo'
        WHEN fm.texto_msg ILIKE '%📖 leitura do dia%'
            OR fm.texto_msg ILIKE '**%**%'
            THEN 'devocional'
        WHEN fm.texto_msg ILIKE '%declaro%' OR fm.texto_msg ILIKE '%profetizo%'
            OR fm.texto_msg ILIKE '%eu creio%' OR fm.texto_msg ILIKE '%deus diz%'
            THEN 'declaração'
        WHEN fm.texto_msg ILIKE '%confie%' OR fm.texto_msg ILIKE '%não desista%'
            OR fm.texto_msg ILIKE '%você é%' OR fm.texto_msg ILIKE '%aguente firme%'
            THEN 'exortação'
        WHEN LENGTH(fm.texto_msg) < 300 THEN 'reflexão'
        ELSE 'outro'
    END as categoria,
    ARRAY['migrado_favoritos']::TEXT[] as tags,
    NULL as historico_id,
    fm.indice_msg,
    fm.created_at
FROM favoritos_mensagens fm
WHERE fm.historico_id IS NULL
AND NOT EXISTS (
    SELECT 1 FROM dna_categorizado dc
    WHERE dc.texto_msg = fm.texto_msg
);

-- 5. Verificação
SELECT 'favoritos_mensagens' as tabela, COUNT(*) as total FROM favoritos_mensagens
UNION ALL
SELECT 'dna_categorizado' as tabela, COUNT(*) as total FROM dna_categorizado;

SELECT COUNT(*) as nao_migrados
FROM favoritos_mensagens fm
WHERE NOT EXISTS (
    SELECT 1 FROM dna_categorizado dc WHERE dc.texto_msg = fm.texto_msg
);

-- NOTA: NÃO dropar favoritos_mensagens ainda. Fazer isso só depois de verificar tudo.
