-- ============================================================
-- DIÁRIO DE ORAÇÃO + MEMORIZAÇÃO DE VERSÍCULOS
--
-- 1. pedidos_oracao: pedidos com status orando/respondido
-- 2. versiculos_memorizacao: revisão espaçada de versículos
--
-- Ambas por usuário (user_id default auth.uid() + RLS), no mesmo
-- padrão de biblia_interacoes pós-multiusuário.
-- ============================================================

-- ----------------------------------------------------------------
-- 1. DIÁRIO DE ORAÇÃO
-- ----------------------------------------------------------------
create table if not exists public.pedidos_oracao (
    id bigserial primary key,
    user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
    titulo text not null,
    detalhes text,
    status varchar(20) not null default 'orando',  -- 'orando' | 'respondido'
    resposta text,                                  -- testemunho de como Deus respondeu
    respondido_em timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_pedidos_oracao_user
    on public.pedidos_oracao(user_id, status, created_at desc);

alter table public.pedidos_oracao enable row level security;

drop policy if exists "pedidos_oracao_por_usuario" on public.pedidos_oracao;
create policy "pedidos_oracao_por_usuario"
    on public.pedidos_oracao
    for all
    to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

-- ----------------------------------------------------------------
-- 2. MEMORIZAÇÃO DE VERSÍCULOS (revisão espaçada)
--    nivel 0..5 → intervalos de revisão 1, 3, 7, 14, 30, 90 dias
-- ----------------------------------------------------------------
create table if not exists public.versiculos_memorizacao (
    id bigserial primary key,
    user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
    livro_abrev varchar(10) not null,
    livro_nome varchar(50) not null,
    capitulo integer not null,
    versiculo integer not null,
    texto text not null,
    versao varchar(10) default 'NTLH',
    nivel integer not null default 0,
    acertos integer not null default 0,
    revisoes integer not null default 0,
    proxima_revisao date not null default current_date,
    ultima_revisao timestamptz,
    created_at timestamptz default now(),
    unique (user_id, livro_abrev, capitulo, versiculo)
);

create index if not exists idx_memorizacao_user_revisao
    on public.versiculos_memorizacao(user_id, proxima_revisao);

alter table public.versiculos_memorizacao enable row level security;

drop policy if exists "memorizacao_por_usuario" on public.versiculos_memorizacao;
create policy "memorizacao_por_usuario"
    on public.versiculos_memorizacao
    for all
    to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
