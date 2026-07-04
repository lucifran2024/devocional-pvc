-- Marcação de "lido" por data na Leitura do Dia pessoal + progresso anual.
-- Aplicada em 2026-07-04 no projeto tayopwdelkmelgmrtnoa.

create table if not exists public.leitura_diaria_lida (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  data date not null,
  created_at timestamptz not null default now(),
  unique (user_id, data)
);

alter table public.leitura_diaria_lida enable row level security;

create policy "leitura_diaria_own_select" on public.leitura_diaria_lida
  for select using (auth.uid() = user_id);
create policy "leitura_diaria_own_insert" on public.leitura_diaria_lida
  for insert with check (auth.uid() = user_id);
create policy "leitura_diaria_own_delete" on public.leitura_diaria_lida
  for delete using (auth.uid() = user_id);

create index if not exists idx_leitura_diaria_user on public.leitura_diaria_lida(user_id);
