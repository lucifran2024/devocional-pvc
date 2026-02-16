-- Migration: Sync Favorites from History to DNA Categorizado
-- Description: Backfills approval/likes from historico_geracoes into dna_categorizado
-- which may have been missed due to previous RLS issues.

DO $$
BEGIN
    -- Insert missing records
    INSERT INTO public.dna_categorizado (texto_msg, categoria, tags, created_at, historico_id)
    SELECT 
        h.resultado_texto,
        'devocional'::text,  -- Default category
        ARRAY['recuperado_historico'], -- Tag to identify recovered items
        h.created_at,
        h.id
    FROM public.historico_geracoes h
    WHERE h.aprovado = true
    AND h.resultado_texto IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM public.dna_categorizado d 
        WHERE d.texto_msg = h.resultado_texto
    );
    
    RAISE NOTICE 'Sync completed.';
END $$;
