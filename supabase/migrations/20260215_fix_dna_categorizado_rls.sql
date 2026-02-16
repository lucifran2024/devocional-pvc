-- =====================================================
-- FIX: Garantir RLS + Policies para dna_categorizado
-- =====================================================
-- Problema: tabela foi criada sem RLS/policies.
-- Se RLS foi habilitado no dashboard, inserts falham silenciosamente.

-- Habilitar RLS (idempotente - se já estiver habilitado, não faz nada)
ALTER TABLE public.dna_categorizado ENABLE ROW LEVEL SECURITY;

-- Dropar policies existentes se houver (para evitar conflito)
DROP POLICY IF EXISTS "Allow public read" ON public.dna_categorizado;
DROP POLICY IF EXISTS "Allow public insert" ON public.dna_categorizado;
DROP POLICY IF EXISTS "Allow public update" ON public.dna_categorizado;
DROP POLICY IF EXISTS "Allow public delete" ON public.dna_categorizado;

-- Criar policies permissivas (app sem auth obrigatória)
CREATE POLICY "Allow public read" ON public.dna_categorizado
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public insert" ON public.dna_categorizado
    FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow public update" ON public.dna_categorizado
    FOR UPDATE TO anon, authenticated USING (true);

CREATE POLICY "Allow public delete" ON public.dna_categorizado
    FOR DELETE TO anon, authenticated USING (true);
