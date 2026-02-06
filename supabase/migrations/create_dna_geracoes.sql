-- =============================================
-- TABELA: dna_geracoes
-- Armazena as mensagens geradas pelo DNA Categorizado
-- =============================================

CREATE TABLE IF NOT EXISTS public.dna_geracoes (
    id SERIAL PRIMARY KEY,
    batch_id UUID NOT NULL,         -- Agrupa mensagens geradas juntas
    texto_msg TEXT NOT NULL,        -- O texto da mensagem gerada
    categoria TEXT,                 -- Categoria usada na geração (opcional)
    filtros JSONB,                  -- Filtros usados na geração (opcional)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_dna_geracoes_batch ON public.dna_geracoes(batch_id);
CREATE INDEX IF NOT EXISTS idx_dna_geracoes_created ON public.dna_geracoes(created_at DESC);

-- RLS (anon pode tudo por enquanto)
ALTER TABLE public.dna_geracoes ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists to avoid errors
DROP POLICY IF EXISTS "anon_full_access" ON public.dna_geracoes;

-- Create policy
CREATE POLICY "anon_full_access" ON public.dna_geracoes 
    FOR ALL 
    TO anon 
    USING (true) 
    WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.dna_geracoes TO anon;
GRANT ALL ON public.dna_geracoes TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.dna_geracoes_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.dna_geracoes_id_seq TO authenticated;
