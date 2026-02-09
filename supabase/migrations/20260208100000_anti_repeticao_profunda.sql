-- =============================================
-- MIGRATION: Anti-Repetição Profunda
-- Adiciona colunas para rastrear MOLDE, IMAGEM CENTRAL,
-- TIPO DE ABERTURA/FECHAMENTO e PUNCHLINE
-- Isso permite detectar repetição "invisível" que tema/verso não pega
-- =============================================

-- Novas colunas na tabela dna_geracoes
ALTER TABLE public.dna_geracoes
ADD COLUMN IF NOT EXISTS titulo VARCHAR(200),
ADD COLUMN IF NOT EXISTS imagem_central VARCHAR(100),
ADD COLUMN IF NOT EXISTS abertura_tipo VARCHAR(30),
ADD COLUMN IF NOT EXISTS fechamento_tipo VARCHAR(30),
ADD COLUMN IF NOT EXISTS punchline TEXT;

-- Índices para busca rápida nas novas colunas
CREATE INDEX IF NOT EXISTS idx_dna_geracoes_imagem ON public.dna_geracoes(imagem_central);
CREATE INDEX IF NOT EXISTS idx_dna_geracoes_abertura ON public.dna_geracoes(abertura_tipo);
CREATE INDEX IF NOT EXISTS idx_dna_geracoes_fechamento ON public.dna_geracoes(fechamento_tipo);

-- Comentários descritivos
COMMENT ON COLUMN public.dna_geracoes.titulo IS 'Título da mensagem extraído (ex: "A FÉ QUE SUSTENTA NO SILÊNCIO")';
COMMENT ON COLUMN public.dna_geracoes.imagem_central IS 'Metáfora/imagem principal (ex: mesa, silêncio, deserto, construção, quarto escuro)';
COMMENT ON COLUMN public.dna_geracoes.abertura_tipo IS 'Tipo de abertura: cena, afirmacao, biblica, imperativo, pergunta, narrativa';
COMMENT ON COLUMN public.dna_geracoes.fechamento_tipo IS 'Tipo de fechamento: oracao, imperativo, declaracao, presenca, punchline, promessa';
COMMENT ON COLUMN public.dna_geracoes.punchline IS 'Última frase/sentença da mensagem';
