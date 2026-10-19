-- =====================================================================
-- APRFlow · 01 · Estrutura do banco
-- Rodar no Supabase: SQL Editor → colar tudo → Run (uma única vez).
-- Padrão: tabelas fechadas (RLS ligado, sem políticas). O site só acessa
-- o banco pelas funções do arquivo 02_funcoes.sql.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- Clientes (empresas atendidas)
create table if not exists public.clientes (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  cnpj        text,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

-- Usuários do sistema (login próprio, senha com hash bcrypt)
create table if not exists public.usuarios (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid references public.clientes(id),
  nome          text not null,
  email         text not null unique,
  senha_hash    text not null,
  perfil        text not null check (perfil in ('admin','gestor','tecnico','liberador','consulta')),
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  ultimo_acesso timestamptz,
  constraint usuario_cliente check (perfil = 'admin' or cliente_id is not null)
);

-- Sessões de login (token guardado no navegador)
create table if not exists public.sessoes (
  token       text primary key,
  usuario_id  uuid not null references public.usuarios(id) on delete cascade,
  criada_em   timestamptz not null default now(),
  expira_em   timestamptz not null
);
create index if not exists sessoes_usuario on public.sessoes(usuario_id);

-- Numeração sequencial por cliente e ano
create table if not exists public.contadores (
  cliente_id  uuid not null references public.clientes(id),
  ano         int  not null,
  ultimo      int  not null default 0,
  primary key (cliente_id, ano)
);

-- Documentos APR / PT
create table if not exists public.documentos (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid not null references public.clientes(id),
  numero         text not null,
  ano            int  not null,
  sequencia      int  not null,
  status         text not null default 'rascunho'
                 check (status in ('rascunho','liberada','suspensa','encerrada','cancelada')),
  dados          jsonb not null default '{}'::jsonb,
  eventos        jsonb not null default '[]'::jsonb,
  codigo         text not null unique default encode(extensions.gen_random_bytes(6), 'hex'),
  criado_por     uuid references public.usuarios(id),
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  liberada_em    timestamptz,
  liberada_por   uuid references public.usuarios(id),
  validade_ini   timestamptz,
  validade_fim   timestamptz,
  encerrada_em   timestamptz,
  encerrada_por  uuid references public.usuarios(id),
  unique (cliente_id, ano, sequencia)
);
create index if not exists documentos_cliente_data on public.documentos(cliente_id, criado_em desc);

-- Registro de atividades
create table if not exists public.atividades (
  id            bigint generated always as identity primary key,
  quando        timestamptz not null default now(),
  usuario_id    uuid references public.usuarios(id),
  cliente_id    uuid references public.clientes(id),
  documento_id  uuid references public.documentos(id),
  acao          text not null,
  detalhe       jsonb
);
create index if not exists atividades_quando on public.atividades(quando desc);

-- Tabelas fechadas: RLS ligado e nenhuma política
alter table public.clientes   enable row level security;
alter table public.usuarios   enable row level security;
alter table public.sessoes    enable row level security;
alter table public.contadores enable row level security;
alter table public.documentos enable row level security;
alter table public.atividades enable row level security;

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
