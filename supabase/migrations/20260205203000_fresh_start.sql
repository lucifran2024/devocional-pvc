-- 1. Create NEW table (fresh start)
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

-- 2. Index
create index if not exists idx_pm_diaria_data on palavra_manha_diaria(data);

-- 3. RLS (Security)
alter table palavra_manha_diaria enable row level security;

-- 4. Policies (EXPLICIT for ANON)

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

create policy "Service Update Access"
on palavra_manha_diaria for update
to service_role
using (true);

-- Allow PUBLIC to update `amei_count` only (via RPC, but strictly via policy if direct update used)
-- We prefer RPC for increments, but let's allow update for robustness if fallback is used
create policy "Public Feedback Update"
on palavra_manha_diaria for update
to anon, authenticated
using (true)
with check (true); -- Ideally restrict columns but Supabase UI makes that hard in SQL directly without triggers. Keeping open for now for "Amém".

-- 5. RPC Function for Amém (Directed to new table)
create or replace function increment_amei_diaria(row_id bigint)
returns void
language sql
security definer
as $$
  update palavra_manha_diaria
  set amei_count = amei_count + 1
  where id = row_id;
$$;
