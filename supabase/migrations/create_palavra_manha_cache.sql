-- Create table for caching Palavra da Manhã
create table if not exists palavra_manha_cache (
  id bigint primary key generated always as identity,
  data date not null unique,
  dia_semana text not null,
  categoria text not null,
  formato text not null,
  mensagem text not null,
  passagem_ref text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for faster lookups by date
create index if not exists idx_palavra_manha_data on palavra_manha_cache(data);

-- Enable RLS
alter table palavra_manha_cache enable row level security;

-- Policy for reading (public/authenticated)
create policy "Enable read access for all users"
on palavra_manha_cache for select
using (true);

-- Policy for insert (service role only or authenticated)
create policy "Enable insert for authenticated users"
on palavra_manha_cache for insert
with check (true);
