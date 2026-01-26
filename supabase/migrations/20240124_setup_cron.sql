-- 1. Habilitar a extensão pg_cron (se ainda não estiver)
create extension if not exists pg_cron;

-- 2. Habilitar a extensão pg_net (necessária para chamar a função via HTTP)
create extension if not exists pg_net;

-- 3. Agendar o Cron Job para rodar todo dia às 07:00 da manhã (Horário UTC - Ajuste se necessário)
-- Nota: 07:00 UTC = 04:00 Brasil (aprox). Para 07:00 Brasil, use '0 10 * * *' (10h UTC)
select
  cron.schedule(
    'enviar-devocional-diario', -- Nome do job
    '0 10 * * *',              -- Cron expression (10:00 UTC = 07:00 BRT)
    $$
    select
      net.http_post(
          url:='https://tayopwdelkmelgmrtnoa.supabase.co/functions/v1/send-daily-notification',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer SUAS_CHAVES_AQUI"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
  );

-- Para verificar se foi agendado:
-- select * from cron.job;

-- Para remover se precisar:
-- select cron.unschedule('enviar-devocional-diario');
