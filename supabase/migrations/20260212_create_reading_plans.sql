-- Migração: Criação de tabelas para Múltiplos Planos de Leitura
-- Data: 2026-02-12

-- 1. Tabela de Definição dos Planos
create table if not exists public.planos (
    id uuid primary key default gen_random_uuid(),
    titulo text not null,
    descricao text,
    duracao_dias integer,
    badge text, -- "NOVO", "POPULAR", "CLÁSSICO"
    cor_tema text, -- "blue", "green", "orange", "purple", "indigo"
    capa_url text, -- opcional, para imagem de fundo
    ordem integer default 0,
    created_at timestamptz default now(),
    ativo boolean default true
);

-- RLS para planos (leitura pública, escrita restrita)
alter table public.planos enable row level security;
create policy "Planos visíveis para todos" on public.planos for select using (true);

-- 2. Tabela de Dias do Plano (Conteúdo)
create table if not exists public.plano_dias (
    id uuid primary key default gen_random_uuid(),
    plano_id uuid references public.planos(id) on delete cascade,
    dia_numero integer not null,
    referencia text not null, -- Ex: "Mateus 1-3"
    titulo_dia text, -- Opcional, ex: "O Sermão do Monte"
    created_at timestamptz default now()
);

-- Index para busca rápida por plano/dia
create index if not exists idx_plano_dias_plano_dia on public.plano_dias(plano_id, dia_numero);

-- RLS para plano_dias
alter table public.plano_dias enable row level security;
create policy "Dias visíveis para todos" on public.plano_dias for select using (true);

-- 3. Tabela de Inscrições/Progresso do Usuário
create table if not exists public.usuario_inscricoes (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    plano_id uuid references public.planos(id) on delete cascade not null,
    dia_atual integer default 1,
    data_inicio timestamptz default now(),
    ultimo_acesso timestamptz default now(),
    status text default 'ativo', -- 'ativo', 'concluido', 'pausado'
    created_at timestamptz default now(),
    unique(user_id, plano_id) -- Um usuário só pode ter uma inscrição ativa por plano
);

-- RLS para inscrições (cada usuário vê a sua)
alter table public.usuario_inscricoes enable row level security;
create policy "Usuário vê suas próprias inscrições" on public.usuario_inscricoes 
    for select using (auth.uid() = user_id);
create policy "Usuário cria suas próprias inscrições" on public.usuario_inscricoes 
    for insert with check (auth.uid() = user_id);
create policy "Usuário atualiza suas próprias inscrições" on public.usuario_inscricoes 
    for update using (auth.uid() = user_id);

-- 4. Função RPC para Progresso Detalhado (Opcional, mas útil)
create or replace function get_meus_planos()
returns table (
    plano_id uuid,
    titulo text,
    dia_atual integer,
    total_dias integer,
    status text,
    badge text,
    cor_tema text
) language sql security definer as $$
    select 
        p.id as plano_id,
        p.titulo,
        ui.dia_atual,
        p.duracao_dias as total_dias,
        ui.status,
        p.badge,
        p.cor_tema
    from public.usuario_inscricoes ui
    join public.planos p on p.id = ui.plano_id
    where ui.user_id = auth.uid()
    order by ui.ultimo_acesso desc;
$$;

-- 5. SEED DATA (Dados Iniciais)
-- Inserir Planos se não existirem
insert into public.planos (titulo, descricao, duracao_dias, badge, cor_tema, ordem)
select 'Bíblia em 1 Ano', 'A jornada completa pelas Escrituras, de Gênesis a Apocalipse.', 365, 'CLÁSSICO', 'blue', 1
where not exists (select 1 from public.planos where titulo = 'Bíblia em 1 Ano');

insert into public.planos (titulo, descricao, duracao_dias, badge, cor_tema, ordem)
select 'Novo Testamento em 90 Dias', 'Conheça a vida de Jesus e a igreja primitiva em 3 meses.', 90, 'POPULAR', 'green', 2
where not exists (select 1 from public.planos where titulo = 'Novo Testamento em 90 Dias');

insert into public.planos (titulo, descricao, duracao_dias, badge, cor_tema, ordem)
select 'Salmos e Provérbios', 'Sabedoria e adoração para o dia a dia em um mês.', 31, 'LEVE', 'orange', 3
where not exists (select 1 from public.planos where titulo = 'Salmos e Provérbios');

insert into public.planos (titulo, descricao, duracao_dias, badge, cor_tema, ordem)
select 'Evangelhos em 30 Dias', 'Mergulhe profundamente na vida e obra de Cristo.', 30, 'INTENSO', 'cyan', 4
where not exists (select 1 from public.planos where titulo = 'Evangelhos em 30 Dias');

-- Como inserir os dias? 
-- Isso geralmente requer um script separado ou carga em massa.
-- Vou deixar placeholders para o dia 1 de cada um para teste.

do $$
declare
    v_plano_nt uuid;
    v_plano_salmos uuid;
begin
    select id into v_plano_nt from public.planos where titulo = 'Novo Testamento em 90 Dias';
    select id into v_plano_salmos from public.planos where titulo = 'Salmos e Provérbios';

    -- Dias do NT (Apenas dia 1 para teste)
    if not exists (select 1 from public.plano_dias where plano_id = v_plano_nt and dia_numero = 1) then
        insert into public.plano_dias (plano_id, dia_numero, referencia, titulo_dia)
        values (v_plano_nt, 1, 'Mateus 1-4', 'A Genealogia e o Nascimento de Jesus');
    end if;

    -- Dias de Salmos (Apenas dia 1 para teste)
    if not exists (select 1 from public.plano_dias where plano_id = v_plano_salmos and dia_numero = 1) then
        insert into public.plano_dias (plano_id, dia_numero, referencia, titulo_dia)
        values (v_plano_salmos, 1, 'Salmos 1-5', 'O Caminho dos Justos');
    end if;

end $$;
