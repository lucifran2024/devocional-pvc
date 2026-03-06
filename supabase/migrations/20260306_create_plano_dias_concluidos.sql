-- Migração: Criação de tabela para rastrear dias concluídos por plano
-- Data: 2026-03-06

create table if not exists public.plano_dias_concluidos (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    plano_id uuid references public.planos(id) on delete cascade not null,
    dia_numero integer not null,
    data_conclusao date default current_date,
    created_at timestamptz default now(),
    unique(user_id, plano_id, dia_numero)
);

alter table public.plano_dias_concluidos enable row level security;

create policy "Usuário vê seus dias concluídos"
  on public.plano_dias_concluidos for select using (auth.uid() = user_id);

create policy "Usuário marca dias concluídos"
  on public.plano_dias_concluidos for insert with check (auth.uid() = user_id);

create policy "Usuário remove dias concluídos"
  on public.plano_dias_concluidos for delete using (auth.uid() = user_id);

create index idx_dias_concluidos_user_plano
  on public.plano_dias_concluidos(user_id, plano_id);
