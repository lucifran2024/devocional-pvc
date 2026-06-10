-- ============================================================
-- AUTENTICAÇÃO MULTI-USUÁRIO + VERSÃO PÚBLICA
--
-- Versão completa (admin): dj_lucifran@hotmail.com
-- Versão pública: Palavra do Dia, Versículo, Bíblia, Plano de Leitura
--
-- O que esta migration faz:
-- 1. Tabela app_admins + função is_admin()
-- 2. biblia_interacoes/historico ganham user_id (privacidade por usuário)
-- 3. Tabelas privadas do dono (dna_*, devocional_externo_posts) ficam
--    restritas ao admin — público não lê nem escreve
-- 4. palavra_manha_diaria continua pública (leitura) para todos os logados
-- ============================================================

-- ----------------------------------------------------------------
-- 1. ADMINS
-- ----------------------------------------------------------------
create table if not exists public.app_admins (
    email text primary key,
    created_at timestamptz default now()
);

alter table public.app_admins enable row level security;
-- Ninguém lê/escreve via API (apenas service_role ignora RLS)

insert into public.app_admins (email)
values ('dj_lucifran@hotmail.com')
on conflict (email) do nothing;

-- Função usada nas policies: o JWT do usuário logado tem email de admin?
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select exists (
        select 1 from public.app_admins
        where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    );
$$;

-- ----------------------------------------------------------------
-- 2. BIBLIA_INTERACOES → por usuário
--    default auth.uid(): o app não precisa enviar user_id no insert
-- ----------------------------------------------------------------
alter table public.biblia_interacoes
    add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;

create index if not exists idx_biblia_interacoes_user on public.biblia_interacoes(user_id);

-- Reivindica os dados existentes (sem dono) para o admin, se a conta já existir
update public.biblia_interacoes
set user_id = (select id from auth.users where lower(email) = 'dj_lucifran@hotmail.com' limit 1)
where user_id is null;

drop policy if exists "biblia_interacoes_all_access" on public.biblia_interacoes;
drop policy if exists "interacoes_por_usuario" on public.biblia_interacoes;
create policy "interacoes_por_usuario"
    on public.biblia_interacoes
    for all
    to authenticated
    using (user_id = auth.uid() or (user_id is null and public.is_admin()))
    with check (user_id = auth.uid() or (user_id is null and public.is_admin()));

-- ----------------------------------------------------------------
-- 3. BIBLIA_HISTORICO_LEITURA → por usuário
-- ----------------------------------------------------------------
alter table public.biblia_historico_leitura
    add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;

create index if not exists idx_biblia_historico_user on public.biblia_historico_leitura(user_id);

update public.biblia_historico_leitura
set user_id = (select id from auth.users where lower(email) = 'dj_lucifran@hotmail.com' limit 1)
where user_id is null;

drop policy if exists "biblia_historico_all_access" on public.biblia_historico_leitura;
drop policy if exists "historico_por_usuario" on public.biblia_historico_leitura;
create policy "historico_por_usuario"
    on public.biblia_historico_leitura
    for all
    to authenticated
    using (user_id = auth.uid() or (user_id is null and public.is_admin()))
    with check (user_id = auth.uid() or (user_id is null and public.is_admin()));

-- ----------------------------------------------------------------
-- 4. TABELAS PRIVADAS DO DONO → somente admin
-- ----------------------------------------------------------------

-- dna_categorizado
drop policy if exists "Allow public read" on public.dna_categorizado;
drop policy if exists "Allow public insert" on public.dna_categorizado;
drop policy if exists "Allow public update" on public.dna_categorizado;
drop policy if exists "Allow public delete" on public.dna_categorizado;
drop policy if exists "dna_categorizado_admin_only" on public.dna_categorizado;
create policy "dna_categorizado_admin_only"
    on public.dna_categorizado
    for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

-- dna_geracoes
drop policy if exists "anon_full_access" on public.dna_geracoes;
drop policy if exists "dna_geracoes_admin_only" on public.dna_geracoes;
create policy "dna_geracoes_admin_only"
    on public.dna_geracoes
    for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

-- devocional_externo_posts
drop policy if exists "Allow public read access" on public.devocional_externo_posts;
drop policy if exists "Allow public delete access" on public.devocional_externo_posts;
drop policy if exists "devocional_externo_admin_only" on public.devocional_externo_posts;
create policy "devocional_externo_admin_only"
    on public.devocional_externo_posts
    for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());
-- (a policy de service_role já existente continua valendo para os crons)

-- ----------------------------------------------------------------
-- OBS: palavra_manha_diaria, planos, plano_dias permanecem com leitura
-- pública (necessário para a versão pública do app). usuario_inscricoes
-- e plano_dias_concluidos já são por usuário (auth.uid()).
-- ----------------------------------------------------------------
