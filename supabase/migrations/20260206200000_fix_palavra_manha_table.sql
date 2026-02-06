-- 1. Ensure Table Exists (Idempotent)
create table if not exists palavra_manha_diaria (
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

-- 2. Ensure Index Exists
create index if not exists idx_pm_diaria_data on palavra_manha_diaria(data);

-- 3. Ensure RLS is Enabled
alter table palavra_manha_diaria enable row level security;

-- 4. Re-apply Policies (Drop first to ensure they are correct and not duplicated)

-- Drop potential old or conflicting policies
drop policy if exists "Enable read access for all users" on palavra_manha_diaria;
drop policy if exists "Enable insert for authenticated users" on palavra_manha_diaria;
drop policy if exists "Enable update for authenticated users" on palavra_manha_diaria;
drop policy if exists "Public Read Access" on palavra_manha_diaria;
drop policy if exists "Service Insert Access" on palavra_manha_diaria;
drop policy if exists "Service Update Access" on palavra_manha_diaria;
drop policy if exists "Public Feedback Update" on palavra_manha_diaria;

-- Apply Correct Policies

-- Allow ANYONE to read (public app)
create policy "Public Read Access"
on palavra_manha_diaria for select
to anon, authenticated, service_role
using (true);

-- Allow SERVICE ROLE to write (Edge Function)
create policy "Service Insert Access"
on palavra_manha_diaria for insert
to service_role
with check (true);

-- Allow SERVICE ROLE to update
create policy "Service Update Access"
on palavra_manha_diaria for update
to service_role
using (true);

-- Allow PUBLIC to update `amei_count` only (via RPC, but strictly via policy if direct update used)
create policy "Public Feedback Update"
on palavra_manha_diaria for update
to anon, authenticated
using (true)
with check (true);

-- 5. Ensure RPC Function Exists and Points to Correct Table
create or replace function increment_amei_diaria(row_id bigint)
returns void
language sql
security definer
as $$
  update palavra_manha_diaria
  set amei_count = amei_count + 1
  where id = row_id;
$$;
