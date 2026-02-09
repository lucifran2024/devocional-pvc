-- =============================================
-- MIGRATION: Adicionar coluna build_style na dna_geracoes
-- Permite separar gerações de favoritas vs estilo
-- para que anti-repetição funcione por modo
-- =============================================

-- Adicionar coluna build_style (favoritas, estilo, etc.)
ALTER TABLE public.dna_geracoes
ADD COLUMN IF NOT EXISTS build_style VARCHAR(30) DEFAULT 'favoritas';

-- Índice para filtrar por modo
CREATE INDEX IF NOT EXISTS idx_dna_geracoes_build_style ON public.dna_geracoes(build_style);

-- Comentário
COMMENT ON COLUMN public.dna_geracoes.build_style IS 'Modo que gerou: favoritas, estilo, etc. Usado para anti-repetição por modo.';

-- Backfill: Marcar registros existentes baseado na categoria
-- Se tem categoria definida E não é "todas", provavelmente veio do modo estilo
-- Se categoria é NULL ou "todas", provavelmente veio do modo favoritas
UPDATE public.dna_geracoes
SET build_style = 'estilo'
WHERE categoria IS NOT NULL
  AND categoria != 'todas'
  AND build_style IS NULL OR build_style = 'favoritas';
