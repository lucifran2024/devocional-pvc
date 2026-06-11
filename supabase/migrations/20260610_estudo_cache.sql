-- ============================================================
-- CACHE DE ESTUDOS DA PASSAGEM
-- As 3 opções (entender/meditar/fixar) são determinísticas por
-- (referência, tipo). Cachear evita recomputar na IA — a 2ª pessoa
-- (ou a 2ª visita) recebe instantaneamente.
-- ============================================================

create table if not exists public.estudo_cache (
    id bigint generated always as identity primary key,
    referencia text not null,
    tipo_estudo text not null,
    resultado text not null,
    created_at timestamptz default now(),
    unique (referencia, tipo_estudo)
);

create index if not exists idx_estudo_cache_lookup
    on public.estudo_cache (referencia, tipo_estudo);

alter table public.estudo_cache enable row level security;

-- Leitura pública (todos os usuários logados aproveitam o mesmo cache)
drop policy if exists "estudo_cache_read" on public.estudo_cache;
create policy "estudo_cache_read"
    on public.estudo_cache
    for select
    using (true);

-- Escrita: só o service_role (a Edge Function usa service key)
drop policy if exists "estudo_cache_write" on public.estudo_cache;
create policy "estudo_cache_write"
    on public.estudo_cache
    for all
    to service_role
    using (true)
    with check (true);
