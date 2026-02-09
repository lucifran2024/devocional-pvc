-- =============================================
-- BACKFILL: Preenche campos anti-repetição para registros existentes
-- Extrai titulo, punchline, imagem_central, abertura_tipo, fechamento_tipo
-- a partir do texto_msg de cada registro
-- =============================================

-- 1) TITULO: Extrair primeira linha limpa (truncado a 200 chars)
UPDATE public.dna_geracoes
SET titulo = LEFT(TRIM(
    regexp_replace(
        regexp_replace(
            (string_to_array(texto_msg, E'\n'))[1],
            '\*+', '', 'g'
        ),
        'MENSAGEM\s*\d+\s*[-—]\s*', '', 'gi'
    )
), 200)
WHERE titulo IS NULL
  AND texto_msg IS NOT NULL
  AND LENGTH(TRIM(texto_msg)) > 10;

-- 2) PUNCHLINE: Extrair última linha significativa (>5 chars, sem separadores)
UPDATE public.dna_geracoes
SET punchline = subquery.ultima_linha
FROM (
    SELECT id,
           TRIM(regexp_replace(
               lines[array_length(lines, 1)],
               '\*+', '', 'g'
           )) AS ultima_linha
    FROM (
        SELECT id,
               array_agg(line ORDER BY rn DESC) FILTER (
                   WHERE LENGTH(TRIM(regexp_replace(
                       regexp_replace(line, '\*+', '', 'g'),
                       '[-—]+', '', 'g'
                   ))) > 5
               ) AS lines
        FROM (
            SELECT id, unnest(string_to_array(texto_msg, E'\n')) AS line,
                   row_number() OVER (PARTITION BY id) AS rn
            FROM public.dna_geracoes
            WHERE punchline IS NULL AND texto_msg IS NOT NULL
        ) raw_lines
        GROUP BY id
    ) grouped
    WHERE lines IS NOT NULL AND array_length(lines, 1) > 0
) subquery
WHERE public.dna_geracoes.id = subquery.id;

-- 3) IMAGEM_CENTRAL: Detectar metáfora principal com base em palavras-chave
UPDATE public.dna_geracoes SET imagem_central = 'mesa'
WHERE imagem_central IS NULL AND (LOWER(texto_msg) LIKE '%mesa posta%' OR LOWER(texto_msg) LIKE '%banquete%');

UPDATE public.dna_geracoes SET imagem_central = 'silêncio'
WHERE imagem_central IS NULL AND (LOWER(texto_msg) LIKE '%silêncio%' OR LOWER(texto_msg) LIKE '%silencio%' OR LOWER(texto_msg) LIKE '%quieto%');

UPDATE public.dna_geracoes SET imagem_central = 'deserto'
WHERE imagem_central IS NULL AND (LOWER(texto_msg) LIKE '%deserto%' OR LOWER(texto_msg) LIKE '%aridez%' OR LOWER(texto_msg) LIKE '%árido%');

UPDATE public.dna_geracoes SET imagem_central = 'construção'
WHERE imagem_central IS NULL AND (LOWER(texto_msg) LIKE '%construção%' OR LOWER(texto_msg) LIKE '%construir%' OR LOWER(texto_msg) LIKE '%alicerce%' OR LOWER(texto_msg) LIKE '%andaime%' OR LOWER(texto_msg) LIKE '%tijolo%' OR LOWER(texto_msg) LIKE '%canteiro de obras%');

UPDATE public.dna_geracoes SET imagem_central = 'quarto escuro'
WHERE imagem_central IS NULL AND (LOWER(texto_msg) LIKE '%quarto escuro%' OR LOWER(texto_msg) LIKE '%escuridão%' OR LOWER(texto_msg) LIKE '%trevas%');

UPDATE public.dna_geracoes SET imagem_central = 'tempestade'
WHERE imagem_central IS NULL AND (LOWER(texto_msg) LIKE '%tempestade%' OR LOWER(texto_msg) LIKE '%mar revolto%' OR LOWER(texto_msg) LIKE '%ondas%');

UPDATE public.dna_geracoes SET imagem_central = 'jardim'
WHERE imagem_central IS NULL AND (LOWER(texto_msg) LIKE '%jardim%' OR LOWER(texto_msg) LIKE '%florescer%' OR LOWER(texto_msg) LIKE '%brotar%' OR LOWER(texto_msg) LIKE '%semente%');

UPDATE public.dna_geracoes SET imagem_central = 'fogo'
WHERE imagem_central IS NULL AND (LOWER(texto_msg) LIKE '%fogo%' OR LOWER(texto_msg) LIKE '%fornalha%' OR LOWER(texto_msg) LIKE '%chama%');

UPDATE public.dna_geracoes SET imagem_central = 'caminho'
WHERE imagem_central IS NULL AND (LOWER(texto_msg) LIKE '%caminho%' OR LOWER(texto_msg) LIKE '%trilha%' OR LOWER(texto_msg) LIKE '%jornada%' OR LOWER(texto_msg) LIKE '%pegadas%');

UPDATE public.dna_geracoes SET imagem_central = 'rio'
WHERE imagem_central IS NULL AND (LOWER(texto_msg) LIKE '%rio caudaloso%' OR LOWER(texto_msg) LIKE '%fonte de água%' OR LOWER(texto_msg) LIKE '%nascente%');

UPDATE public.dna_geracoes SET imagem_central = 'âncora'
WHERE imagem_central IS NULL AND (LOWER(texto_msg) LIKE '%âncora%' OR LOWER(texto_msg) LIKE '%ancora%' OR LOWER(texto_msg) LIKE '%porto seguro%');

UPDATE public.dna_geracoes SET imagem_central = 'porta'
WHERE imagem_central IS NULL AND (LOWER(texto_msg) LIKE '%porta aberta%' OR LOWER(texto_msg) LIKE '%chave que abre%');

UPDATE public.dna_geracoes SET imagem_central = 'batalha'
WHERE imagem_central IS NULL AND (LOWER(texto_msg) LIKE '%batalha%' OR LOWER(texto_msg) LIKE '%guerra espiritual%' OR LOWER(texto_msg) LIKE '%escudo%' OR LOWER(texto_msg) LIKE '%armadura%');

UPDATE public.dna_geracoes SET imagem_central = 'refúgio'
WHERE imagem_central IS NULL AND (LOWER(texto_msg) LIKE '%refúgio%' OR LOWER(texto_msg) LIKE '%esconderijo%' OR LOWER(texto_msg) LIKE '%fortaleza%');

UPDATE public.dna_geracoes SET imagem_central = 'cura'
WHERE imagem_central IS NULL AND (LOWER(texto_msg) LIKE '%cura%' OR LOWER(texto_msg) LIKE '%ferida%' OR LOWER(texto_msg) LIKE '%cicatriz%');

UPDATE public.dna_geracoes SET imagem_central = 'luz'
WHERE imagem_central IS NULL AND (LOWER(texto_msg) LIKE '%luz resplandece%' OR LOWER(texto_msg) LIKE '%vela que ilumina%' OR LOWER(texto_msg) LIKE '%farol%' OR LOWER(texto_msg) LIKE '%luz do mundo%');

UPDATE public.dna_geracoes SET imagem_central = 'espelho'
WHERE imagem_central IS NULL AND (LOWER(texto_msg) LIKE '%espelho%' OR LOWER(texto_msg) LIKE '%vitrine%' OR LOWER(texto_msg) LIKE '%se compara%');

-- 4) ABERTURA_TIPO: Detectar tipo com base no corpo (2ª linha significativa)
-- Primeiro: pergunta (tem ? nas primeiras linhas do corpo)
UPDATE public.dna_geracoes SET abertura_tipo = 'pergunta'
WHERE abertura_tipo IS NULL
  AND texto_msg ~ '(?m)^.{0,200}\?';

-- Imperativo (começa com verbo no imperativo)
UPDATE public.dna_geracoes SET abertura_tipo = 'imperativo'
WHERE abertura_tipo IS NULL
  AND texto_msg ~* '(?m)(Pare|Olhe|Pense|Imagine|Lembre|Abra|Feche|Levante|Creia|Confie|Descanse|Não se|Abrace|Avance)';

-- Cena (descreve situação)
UPDATE public.dna_geracoes SET abertura_tipo = 'cena'
WHERE abertura_tipo IS NULL
  AND texto_msg ~* '(?m)(A notificação|O quarto|A fila|A conversa|O vento|A vitrine|O boleto|A mesa posta|A noite|O mundo)';

-- Bíblica
UPDATE public.dna_geracoes SET abertura_tipo = 'biblica'
WHERE abertura_tipo IS NULL
  AND texto_msg ~* '(?m)^[">]|A Bíblia|Está escrito|Jesus disse';

-- Afirmação "X é Y"
UPDATE public.dna_geracoes SET abertura_tipo = 'afirmacao'
WHERE abertura_tipo IS NULL
  AND texto_msg ~* '(?m)(A vida é|A fé é|A graça é|Deus é|A igreja não é|O perdão é)';

-- Default: narrativa
UPDATE public.dna_geracoes SET abertura_tipo = 'narrativa'
WHERE abertura_tipo IS NULL AND texto_msg IS NOT NULL;

-- 5) FECHAMENTO_TIPO: Detectar com base na última frase
-- Oração
UPDATE public.dna_geracoes SET fechamento_tipo = 'oracao'
WHERE fechamento_tipo IS NULL
  AND (LOWER(texto_msg) LIKE '%amém%' OR texto_msg ~* '(?m)(Senhor,|Pai,|Em nome de)[\s\S]{0,100}$');

-- Imperativo (termina com ordem)
UPDATE public.dna_geracoes SET fechamento_tipo = 'imperativo'
WHERE fechamento_tipo IS NULL
  AND texto_msg ~* '(?m)(Descanse\.|Avance\.|Aja |Abrace |Solte |Celebre |Regue |Não se atrase|Não se intimide)[\s\S]{0,30}$';

-- Presença de Deus (termina com "Deus + verbo")
UPDATE public.dna_geracoes SET fechamento_tipo = 'presenca'
WHERE fechamento_tipo IS NULL
  AND texto_msg ~* '(?m)(Deus está|Deus transforma|Deus prepara|Ele te sustenta|Ele te conduz)[\s\S]{0,50}$';

-- Declaração
UPDATE public.dna_geracoes SET fechamento_tipo = 'declaracao'
WHERE fechamento_tipo IS NULL
  AND texto_msg ~* '(?m)(Eu creio|Eu declaro|Eu confio|Nós cremos)[\s\S]{0,50}$';

-- Promessa
UPDATE public.dna_geracoes SET fechamento_tipo = 'promessa'
WHERE fechamento_tipo IS NULL
  AND texto_msg ~* '(?m)(A promessa|Está escrito|Porque Deus)[\s\S]{0,50}$';

-- Default: punchline
UPDATE public.dna_geracoes SET fechamento_tipo = 'punchline'
WHERE fechamento_tipo IS NULL AND texto_msg IS NOT NULL;
