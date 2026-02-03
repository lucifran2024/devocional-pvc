-- =====================================================
-- MIGRAÇÃO: Copiar favoritos para dna_categorizado COM CATEGORIAS
-- =====================================================
-- Execute DEPOIS de criar a tabela dna_categorizado
-- Os favoritos originais permanecem na tabela favoritos_mensagens

-- COPIAR E CATEGORIZAR baseado na análise do conteúdo
INSERT INTO dna_categorizado (texto_msg, categoria, created_at)
SELECT 
    texto_msg,
    CASE 
        -- ORAÇÃO: Contém padrões de oração
        WHEN texto_msg ILIKE '%oração%' OR texto_msg ILIKE '%senhor%obrigado%' 
            OR texto_msg ILIKE '%pai%entrego%' OR texto_msg ILIKE '%amém%'
            OR texto_msg ILIKE '%te peço%' OR texto_msg ILIKE '%consagro%'
            THEN 'oração'
        
        -- VERSÍCULO: Contém referência bíblica clara
        WHEN texto_msg ~ '\([A-Za-záéíóúãõê]+ \d+:\d+.*\)'
            OR texto_msg ILIKE '%salmos%' OR texto_msg ILIKE '%isaías%'
            OR texto_msg ILIKE '%mateus%' OR texto_msg ILIKE '%eclesiastes%'
            THEN 'versículo'
        
        -- DEVOCIONAL: Estrutura formatada com título/reflexão
        WHEN texto_msg ILIKE '%📖 leitura do dia%' 
            OR texto_msg ILIKE '%P0%—%' OR texto_msg ILIKE '%P1%—%'
            OR texto_msg ILIKE '**%**%' 
            THEN 'devocional'
        
        -- DECLARAÇÃO: Profecias e declarações de fé
        WHEN texto_msg ILIKE '%declaro%' OR texto_msg ILIKE '%profetizo%'
            OR texto_msg ILIKE '%eu creio%' OR texto_msg ILIKE '%deus diz%'
            THEN 'declaração'
        
        -- EXORTAÇÃO: Encorajamento direto
        WHEN texto_msg ILIKE '%confie%' OR texto_msg ILIKE '%não desista%'
            OR texto_msg ILIKE '%você é%' OR texto_msg ILIKE '%força%'
            OR texto_msg ILIKE '%aguente firme%'
            THEN 'exortação'
        
        -- REFLEXÃO: Pensamentos curtos
        WHEN LENGTH(texto_msg) < 300 THEN 'reflexão'
        
        -- DEFAULT
        ELSE 'outro'
    END as categoria,
    created_at
FROM favoritos_mensagens
WHERE historico_id IS NULL;

-- Verificar resultado
SELECT categoria, COUNT(*) as total 
FROM dna_categorizado 
GROUP BY categoria 
ORDER BY total DESC;
