-- Caderno de anotações livres + transcrições (YouTube/culto) e bucket de áudio.
-- Aplicada em 2026-07-04 no projeto tayopwdelkmelgmrtnoa.

create table if not exists public.anotacoes_livres (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  titulo text,
  texto text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.anotacoes_livres enable row level security;
create policy "anot_livres_select" on public.anotacoes_livres for select using (auth.uid() = user_id);
create policy "anot_livres_insert" on public.anotacoes_livres for insert with check (auth.uid() = user_id);
create policy "anot_livres_update" on public.anotacoes_livres for update using (auth.uid() = user_id);
create policy "anot_livres_delete" on public.anotacoes_livres for delete using (auth.uid() = user_id);
create index if not exists idx_anot_livres_user on public.anotacoes_livres(user_id);

create table if not exists public.transcricoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null default 'culto',
  titulo text,
  fonte_url text,
  texto text not null default '',
  notas text default '',
  created_at timestamptz not null default now()
);
alter table public.transcricoes enable row level security;
create policy "transc_select" on public.transcricoes for select using (auth.uid() = user_id);
create policy "transc_insert" on public.transcricoes for insert with check (auth.uid() = user_id);
create policy "transc_update" on public.transcricoes for update using (auth.uid() = user_id);
create policy "transc_delete" on public.transcricoes for delete using (auth.uid() = user_id);
create index if not exists idx_transc_user on public.transcricoes(user_id);

-- Bucket privado para os áudios de culto gravados
insert into storage.buckets (id, name, public)
values ('cultos-audio', 'cultos-audio', false)
on conflict (id) do nothing;

create policy "cultos_audio_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'cultos-audio');
create policy "cultos_audio_select" on storage.objects
  for select to authenticated using (bucket_id = 'cultos-audio');
create policy "cultos_audio_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'cultos-audio');
