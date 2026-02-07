-- =============================================
-- MIGRATION: Melhorar sistema anti-repetição
-- Adicionar tracking de versículos e temas automáticos
-- =============================================

-- Adicionar coluna de versículos usados (array de strings)
ALTER TABLE public.dna_geracoes
ADD COLUMN IF NOT EXISTS versiculos_usados TEXT[],
ADD COLUMN IF NOT EXISTS tema_principal TEXT,
ADD COLUMN IF NOT EXISTS angulo_usado VARCHAR(50);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_dna_geracoes_tema ON public.dna_geracoes(tema_principal);
CREATE INDEX IF NOT EXISTS idx_dna_geracoes_versiculos ON public.dna_geracoes USING GIN(versiculos_usados);

-- Comentários
COMMENT ON COLUMN public.dna_geracoes.tema_principal IS 'Tema principal da mensagem (ex: Confiança, Gratidão, Fé)';
COMMENT ON COLUMN public.dna_geracoes.angulo_usado IS 'Ângulo usado na geração (ESPELHO_MODERNO, RAIZ_HISTORICA, etc)';
COMMENT ON COLUMN public.dna_geracoes.versiculos_usados IS 'Array de referências bíblicas usadas (ex: João 3:16, Salmos 23:1)';
