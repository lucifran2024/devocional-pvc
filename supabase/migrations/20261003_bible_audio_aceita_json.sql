-- O cache do áudio da Bíblia guarda dois arquivos por capítulo: full.mp3 e
-- full.json (marcação de cada versículo). O bucket só aceitava audio/mpeg e
-- recusava o full.json em silêncio: o cache nunca era encontrado e cada
-- "Ouvir" narrava o capítulo inteiro de novo (03/10/2026: 63 mp3, 0 json).
update storage.buckets
set allowed_mime_types = array['audio/mpeg', 'application/json']
where id = 'bible-audio';
