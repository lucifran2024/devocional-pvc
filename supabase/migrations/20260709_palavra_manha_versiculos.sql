-- =============================================
-- MIGRATION: Palavra da Manhã — tabela de versículos usados
-- Objetivo: registrar o versículo usado a cada dia e nunca repetir
-- o mesmo versículo dentro de uma janela de 365 dias.
-- =============================================

create table if not exists public.palavra_manha_versiculos (
  id bigint primary key generated always as identity,
  data date not null unique,
  versiculo_ref text not null,           -- referência como exibida (ex.: "Salmos 118:24")
  ref_norm text not null,                -- chave normalizada p/ dedupe (ex.: "salmos 118:24")
  categoria text,
  mensagem_id bigint,                    -- id em palavra_manha_diaria (quando houver)
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_pmv_ref_norm on public.palavra_manha_versiculos(ref_norm);
create index if not exists idx_pmv_data on public.palavra_manha_versiculos(data desc);

alter table public.palavra_manha_versiculos enable row level security;

drop policy if exists "pmv public read" on public.palavra_manha_versiculos;
create policy "pmv public read"
  on public.palavra_manha_versiculos for select
  to anon, authenticated, service_role
  using (true);

drop policy if exists "pmv service insert" on public.palavra_manha_versiculos;
create policy "pmv service insert"
  on public.palavra_manha_versiculos for insert
  to service_role
  with check (true);

drop policy if exists "pmv service update" on public.palavra_manha_versiculos;
create policy "pmv service update"
  on public.palavra_manha_versiculos for update
  to service_role
  using (true);

comment on table public.palavra_manha_versiculos is 'Versiculo usado pela Palavra da Manha em cada dia; base para anti-repeticao de 365 dias.';
comment on column public.palavra_manha_versiculos.ref_norm is 'Referencia normalizada (minuscula, sem acento, livro cap:versiculo) para deduplicacao.';
