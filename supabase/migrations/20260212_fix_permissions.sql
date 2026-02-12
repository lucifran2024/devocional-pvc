-- Allow delete access to public (anon/authenticated) for devocional_externo_posts
-- This allows the frontend to delete posts from the cache
create policy "Allow public delete access"
  on public.devocional_externo_posts
  for delete
  to anon, authenticated
  using (true);

-- Check permissions for dna_categorizado just in case (ensure insert is allowed)
-- Assuming the table exists, we add a policy if it doesn't have one broadly open
-- (Safest to just rely on existing policies for dna_categorizado, but if it fails we fix later)
