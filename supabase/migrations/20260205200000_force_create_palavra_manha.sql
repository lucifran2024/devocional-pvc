-- FORCE CREATE TABLE (Idempotent)
create table if not exists palavra_manha_cache (
  id bigint primary key generated always as identity,
  data date not null unique,
  dia_semana text not null,
  categoria text not null,
  formato text not null,
  mensagem text not null,
  passagem_ref text,
  amei_count integer default 0,
  feedback_score float default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indices
create index if not exists idx_palavra_manha_data on palavra_manha_cache(data);

-- RLS
alter table palavra_manha_cache enable row level security;

-- Policies (Drop first to avoid errors if they exist)
drop policy if exists "Enable read access for all users" on palavra_manha_cache;
create policy "Enable read access for all users" on palavra_manha_cache for select using (true);

drop policy if exists "Enable insert for authenticated users" on palavra_manha_cache;
create policy "Enable insert for authenticated users" on palavra_manha_cache for insert with check (true);

drop policy if exists "Enable update for authenticated users" on palavra_manha_cache;
create policy "Enable update for authenticated users" on palavra_manha_cache for update using (true);
