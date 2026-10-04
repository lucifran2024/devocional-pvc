-- Áudio da Bíblia: 5 MB não cabia nos capítulos longos (Salmo 119 ≈ 6,5 MB
-- na leitura nova com pausas). 20 MB cobre o maior capítulo com folga.
update storage.buckets set file_size_limit = 20971520 where id = 'bible-audio';

-- Gravações de culto: cada conta só envia, vê e apaga na própria pasta
-- (o app já grava em <user.id>/<arquivo>). Antes qualquer conta logada
-- conseguia listar e apagar as gravações das outras.
drop policy if exists "cultos_audio_insert" on storage.objects;
drop policy if exists "cultos_audio_select" on storage.objects;
drop policy if exists "cultos_audio_delete" on storage.objects;

create policy "cultos_audio_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'cultos-audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "cultos_audio_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'cultos-audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "cultos_audio_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'cultos-audio' and (storage.foldername(name))[1] = auth.uid()::text);
