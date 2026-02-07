-- =============================================
-- MIGRATION: Adicionar tracking de tema/ângulo às gerações
-- Para melhorar sistema anti-repetição
-- =============================================

-- Adicionar colunas de tracking
ALTER TABLE public.dna_geracoes
ADD COLUMN IF NOT EXISTS tema_principal TEXT,
ADD COLUMN IF NOT EXISTS angulo_usado VARCHAR(50);

-- Índice para buscar por tema (anti-repetição)
CREATE INDEX IF NOT EXISTS idx_dna_geracoes_tema ON public.dna_geracoes(tema_principal);

-- Comentários
COMMENT ON COLUMN public.dna_geracoes.tema_principal IS 'Tema principal da mensagem (ex: Confiança, Gratidão, Fé)';
COMMENT ON COLUMN public.dna_geracoes.angulo_usado IS 'Ângulo usado na geração (ESPELHO_MODERNO, RAIZ_HISTORICA, etc)';
