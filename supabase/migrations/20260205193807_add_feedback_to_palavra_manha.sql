-- Add feedback columns to palavra_manha_cache
alter table palavra_manha_cache
add column if not exists amei_count integer default 0,
add column if not exists feedback_score float default 0;

-- Simple function to increment amei_count (avoid concurrency issues)
create or replace function increment_amei(row_id bigint)
returns void
language sql
security definer
as $$
  update palavra_manha_cache
  set amei_count = amei_count + 1
  where id = row_id;
$$;
