-- Create table for external devotional posts (Instagram, etc)
create table if not exists public.devocional_externo_posts (
  id uuid default gen_random_uuid() primary key,
  source text not null, -- 'instagram', 'voltemos', etc
  external_id text, -- ID único na origem ou URL
  content text,
  image_url text,
  post_url text,
  author_name text,
  published_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  unique(source, external_id)
);

-- RLS Policies
alter table public.devocional_externo_posts enable row level security;

-- Allow read access to everyone (public)
-- Allow read access to everyone (public)
drop policy if exists "Allow public read access" on public.devocional_externo_posts;
create policy "Allow public read access"
  on public.devocional_externo_posts
  for select
  to anon, authenticated
  using (true);

-- Allow write access only to service_role (Edge Functions)
-- Allow write access only to service_role (Edge Functions)
drop policy if exists "Allow service_role write access" on public.devocional_externo_posts;
create policy "Allow service_role write access"
  on public.devocional_externo_posts
  for all
  to service_role
  using (true)
  with check (true);
