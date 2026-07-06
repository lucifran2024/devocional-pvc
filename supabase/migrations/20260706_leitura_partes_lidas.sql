-- ============================================================
-- LEITURA DIÁRIA POR PARTES
-- Antes: marcar como lido gravava só a DATA — marcou a parte 1,
-- o dia inteiro aparecia lido. Agora cada parte é marcada
-- individualmente; o dia conta no progresso anual quando todas
-- as partes foram lidas.
--
-- partes_lidas NULL = dia marcado inteiro (registros legados).
-- ============================================================

alter table public.leitura_diaria_lida
    add column if not exists partes_lidas int[] default null,
    add column if not exists total_partes int default null;

-- O upsert de partes precisa de UPDATE (as policies originais
-- só cobriam select/insert/delete).
drop policy if exists "leitura_diaria_own_update" on public.leitura_diaria_lida;
create policy "leitura_diaria_own_update" on public.leitura_diaria_lida
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
