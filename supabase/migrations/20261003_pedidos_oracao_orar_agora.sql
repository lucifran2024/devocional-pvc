-- 03/10/2026 — Diário de Oração reformulado (Claude Code, pedido de Lucifran).
-- Só acrescenta colunas: categoria do pedido, quantas vezes a pessoa orou por
-- ele e quando foi a última vez (modo "Orar agora"). Nada é apagado.
-- Reversão: alter table public.pedidos_oracao drop column categoria,
--           drop column vezes_orado, drop column ultima_oracao_em;
alter table public.pedidos_oracao
    add column if not exists categoria text,
    add column if not exists vezes_orado integer not null default 0,
    add column if not exists ultima_oracao_em timestamptz;
