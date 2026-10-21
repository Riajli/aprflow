-- =====================================================================
-- APRFlow · 02 · Funções (RPC)
-- Rodar depois do 01_estrutura.sql. Pode ser rodado de novo sempre que
-- este arquivo mudar (as funções são recriadas).
-- Funções que começam com "_" são internas e não ficam acessíveis ao site.
-- =====================================================================

-- ---------- Internas ----------

create or replace function public._sessao(p_token text)
returns public.usuarios
language plpgsql security definer set search_path = public, extensions as $$
declare u public.usuarios;
begin
  select us.* into u
    from sessoes s join usuarios us on us.id = s.usuario_id
   where s.token = p_token and s.expira_em > now() and us.ativo;
  if not found then
    raise exception 'SESSAO_EXPIRADA' using hint = 'Sua sessão terminou. Entre novamente.';
  end if;
  return u;
end $$;

create or replace function public._exigir(u public.usuarios, p_acao text)
returns void language plpgsql as $$
begin
  if not (case p_acao
    when 'editar'    then u.perfil in ('admin','gestor','tecnico')
    when 'liberar'   then u.perfil in ('admin','gestor','liberador')
    when 'encerrar'  then u.perfil in ('admin','gestor','tecnico','liberador')
    when 'suspender' then u.perfil <> 'consulta'
    when 'usuarios'  then u.perfil in ('admin','gestor')
    when 'clientes'  then u.perfil = 'admin'
    else false end) then
    raise exception 'SEM_PERMISSAO' using hint = 'Seu perfil não permite esta ação.';
  end if;
end $$;

create or replace function public._usuario_json(u public.usuarios)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', u.id, 'nome', u.nome, 'email', u.email, 'perfil', u.perfil,
    'cliente_id', u.cliente_id,
    'cliente_nome', (select nome from clientes where id = u.cliente_id));
$$;

create or replace function public._log(u public.usuarios, p_acao text, p_cliente uuid, p_doc uuid, p_detalhe jsonb default null)
returns void language sql security definer set search_path = public as $$
  insert into atividades(usuario_id, cliente_id, documento_id, acao, detalhe)
  values (u.id, coalesce(p_cliente, u.cliente_id), p_doc, p_acao, p_detalhe);
$$;

create or replace function public._doc(u public.usuarios, p_id uuid)
returns public.documentos
language plpgsql security definer set search_path = public as $$
declare d public.documentos;
begin
  select * into d from documentos where id = p_id for update;
  if not found or (u.perfil <> 'admin' and d.cliente_id is distinct from u.cliente_id) then
    raise exception 'DOCUMENTO_NAO_ENCONTRADO' using hint = 'Documento não encontrado ou sem acesso.';
  end if;
  if d.excluido_em is not null then
    raise exception 'DOCUMENTO_NA_LIXEIRA' using hint = 'Este documento está na lixeira. Restaure-o para continuar.';
  end if;
  return d;
end $$;

create or replace function public._evento(p_id uuid, p_txt text)
returns void language sql security definer set search_path = public as $$
  update documentos
     set eventos = eventos || jsonb_build_array(jsonb_build_object('em', now(), 'txt', p_txt))
   where id = p_id;
$$;

create or replace function public._doc_json(d public.documentos)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', d.id, 'numero', d.numero, 'status', d.status, 'codigo', d.codigo,
    'cliente_id', d.cliente_id, 'cliente_nome', (select nome from clientes where id = d.cliente_id),
    'cliente_cnpj', (select cnpj from clientes where id = d.cliente_id),
    'cliente_endereco', (select endereco from clientes where id = d.cliente_id),
    'dados', d.dados, 'eventos', d.eventos,
    'criado_em', d.criado_em, 'atualizado_em', d.atualizado_em,
    'criado_por_nome', (select nome from usuarios where id = d.criado_por),
    'liberada_em', d.liberada_em, 'liberada_por_nome', (select nome from usuarios where id = d.liberada_por),
    'validade_ini', d.validade_ini, 'validade_fim', d.validade_fim,
    'encerrada_em', d.encerrada_em, 'encerrada_por_nome', (select nome from usuarios where id = d.encerrada_por));
$$;

-- Data e hora digitadas no formulário (sem fuso) são do horário de Brasília
create or replace function public._dh(p_txt text)
returns timestamptz language sql stable as $$
  select case when coalesce(p_txt,'') = '' then null
              else (p_txt::timestamp at time zone 'America/Sao_Paulo') end;
$$;

-- Regras conferidas no servidor antes de liberar a PT
create or replace function public._validar_liberacao(dd jsonb)
returns text[] language plpgsql stable as $$
declare
  e text[] := '{}';
  w jsonb; r record; ini timestamptz; fim timestamptz; n int := 0;
begin
  if coalesce(trim(dd#>>'{id,empresa}'),'') = '' then e := array_append(e, 'Empresa não informada'::text); end if;
  if coalesce(trim(dd#>>'{id,cnpj}'),'')    = '' then e := array_append(e, 'CNPJ não informado'::text); end if;
  if coalesce(trim(dd#>>'{id,servico}'),'') = '' then e := array_append(e, 'Serviço não descrito'::text); end if;

  if coalesce(jsonb_typeof(dd->'equipe'),'') <> 'array' or jsonb_array_length(dd->'equipe') = 0 then
    e := array_append(e, 'Nenhum executante incluído'::text);
  else
    for w in select * from jsonb_array_elements(dd->'equipe') loop
      n := n + 1;
      if coalesce(trim(w->>'nome'),'') = '' then e := array_append(e, format('Executante %s sem nome', n)::text); end if;
      if coalesce((w->>'aso')::boolean, false) is false then e := array_append(e, format('Executante %s sem ASO apto', n)::text); end if;
      if coalesce(w->>'ass','') = '' then e := array_append(e, format('Executante %s sem assinatura de ciência', n)::text); end if;
    end loop;
  end if;

  if coalesce(trim(dd#>>'{lib,elaborador,nome}'),'')   = '' then e := array_append(e, 'Elaborador sem nome'::text); end if;
  if coalesce(trim(dd#>>'{lib,elaborador,regNum}'),'') = '' then e := array_append(e, 'Elaborador sem registro profissional'::text); end if;
  if coalesce(dd#>>'{lib,elaborador,ass}','')          = '' then e := array_append(e, 'Elaborador sem assinatura'::text); end if;
  if coalesce(trim(dd#>>'{lib,liberador,nome}'),'')    = '' then e := array_append(e, 'Liberador sem nome'::text); end if;
  if coalesce(trim(dd#>>'{lib,liberador,cpf}'),'')     = '' then e := array_append(e, 'Liberador sem CPF'::text); end if;
  if coalesce(dd#>>'{lib,liberador,ass}','')           = '' then e := array_append(e, 'Liberador sem assinatura'::text); end if;

  ini := public._dh(dd#>>'{lib,ini}');
  fim := public._dh(dd#>>'{lib,fim}');
  if ini is null or fim is null then e := array_append(e, 'Validade da PT não definida'::text);
  elsif fim <= ini then e := array_append(e, 'Fim da validade antes do início'::text);
  elsif fim - ini > interval '12 hours' then e := array_append(e, 'Validade maior que um turno (12 h)'::text);
  end if;

  if jsonb_typeof(dd#>'{lib,imped}') = 'object' then
    for r in select key, value from jsonb_each_text(dd#>'{lib,imped}') loop
      if r.value = 'presente' then e := array_append(e, 'Há condição impeditiva presente'::text); exit; end if;
    end loop;
  end if;

  if coalesce((dd->>'usarMatriz')::boolean, true) and jsonb_typeof(dd->'riscos') = 'object' then
    for r in select key, value from jsonb_each(dd->'riscos') loop
      if coalesce((r.value->>'on')::boolean,false)
         and coalesce((r.value->>'p')::int,0) * coalesce((r.value->>'s')::int,0) >= 12 then
        e := array_append(e, 'Há risco classificado como crítico'::text); exit;
      end if;
    end loop;
  end if;
  return e;
end $$;

-- ---------- Acesso ----------

create or replace function public._esvaziar_lixeira()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with apagados as (
    delete from documentos where excluido_em < now() - interval '30 days'
    returning id, cliente_id, numero)
  insert into atividades(cliente_id, acao, detalhe)
  select cliente_id, 'documento_apagado_definitivo', jsonb_build_object('numero', numero, 'documento_id', id) from apagados;
  get diagnostics n = row_count;
  return n;
end $$;

-- Chamado todo dia pela rotina do GitHub: mantém o projeto ativo e esvazia a lixeira vencida
create or replace function public.ping()
returns timestamptz language plpgsql security definer set search_path = public as $$
begin
  perform public._esvaziar_lixeira();
  return now();
end $$;

-- Só funciona enquanto não existir nenhum usuário
create or replace function public.criar_admin_inicial(p_email text, p_senha text, p_nome text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare u public.usuarios;
begin
  if exists (select 1 from usuarios) then
    raise exception 'JA_CONFIGURADO' using hint = 'O administrador inicial já foi criado.';
  end if;
  if length(coalesce(p_senha,'')) < 8 then
    raise exception 'SENHA_CURTA' using hint = 'A senha deve ter pelo menos 8 caracteres.';
  end if;
  insert into usuarios(nome, email, senha_hash, perfil)
  values (trim(p_nome), lower(trim(p_email)), crypt(p_senha, gen_salt('bf')), 'admin')
  returning * into u;
  return public._usuario_json(u);
end $$;

create or replace function public.login(p_email text, p_senha text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare u public.usuarios; t text;
begin
  select * into u from usuarios where email = lower(trim(p_email)) and ativo;
  if not found or u.senha_hash <> crypt(p_senha, u.senha_hash) then
    perform pg_sleep(0.4);
    raise exception 'LOGIN_INVALIDO' using hint = 'E-mail ou senha incorretos.';
  end if;
  if u.cliente_id is not null and not exists (select 1 from clientes where id = u.cliente_id and ativo) then
    raise exception 'CLIENTE_INATIVO' using hint = 'O acesso desta empresa está desativado.';
  end if;
  delete from sessoes where expira_em < now();
  t := encode(gen_random_bytes(32), 'hex');
  insert into sessoes(token, usuario_id, expira_em) values (t, u.id, now() + interval '12 hours');
  update usuarios set ultimo_acesso = now() where id = u.id;
  perform public._log(u, 'login', null, null);
  return jsonb_build_object('token', t, 'usuario', public._usuario_json(u));
end $$;

create or replace function public.logout(p_token text)
returns void language sql security definer set search_path = public as $$
  delete from sessoes where token = p_token;
$$;

create or replace function public.eu(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  return public._usuario_json(public._sessao(p_token));
end $$;

create or replace function public.alterar_minha_senha(p_token text, p_atual text, p_nova text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare u public.usuarios := public._sessao(p_token);
begin
  if u.senha_hash <> crypt(p_atual, u.senha_hash) then
    raise exception 'SENHA_ATUAL_INCORRETA' using hint = 'A senha atual não confere.';
  end if;
  if length(coalesce(p_nova,'')) < 8 then
    raise exception 'SENHA_CURTA' using hint = 'A nova senha deve ter pelo menos 8 caracteres.';
  end if;
  update usuarios set senha_hash = crypt(p_nova, gen_salt('bf')) where id = u.id;
  delete from sessoes where usuario_id = u.id and token <> p_token;
  perform public._log(u, 'senha_alterada', null, null);
end $$;

-- ---------- Clientes ----------

create or replace function public.listar_clientes(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u public.usuarios := public._sessao(p_token);
begin
  return coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'nome', c.nome, 'cnpj', c.cnpj, 'ativo', c.ativo,
            'endereco', c.endereco,
            'usuarios', (select count(*) from usuarios where cliente_id = c.id),
            'documentos', (select count(*) from documentos where cliente_id = c.id and excluido_em is null)) order by c.nome)
    from clientes c where u.perfil = 'admin' or c.id = u.cliente_id), '[]'::jsonb);
end $$;

drop function if exists public.salvar_cliente(text, uuid, text, text, boolean);
create or replace function public.salvar_cliente(p_token text, p_id uuid, p_nome text, p_cnpj text, p_ativo boolean,
                                                p_endereco jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u public.usuarios := public._sessao(p_token); c public.clientes;
        e jsonb := case when jsonb_typeof(p_endereco) = 'object' then p_endereco else '{}'::jsonb end;
begin
  perform public._exigir(u, 'clientes');
  if coalesce(trim(p_nome),'') = '' then
    raise exception 'DADOS_INVALIDOS' using hint = 'Informe o nome do cliente.';
  end if;
  if p_id is null then
    insert into clientes(nome, cnpj, ativo, endereco) values (trim(p_nome), nullif(trim(p_cnpj),''), coalesce(p_ativo,true), e) returning * into c;
    perform public._log(u, 'cliente_criado', c.id, null, jsonb_build_object('nome', c.nome));
  else
    update clientes set nome = trim(p_nome), cnpj = nullif(trim(p_cnpj),''), ativo = coalesce(p_ativo,true), endereco = e
     where id = p_id returning * into c;
    perform public._log(u, 'cliente_alterado', c.id, null, jsonb_build_object('nome', c.nome));
  end if;
  return jsonb_build_object('id', c.id);
end $$;

-- ---------- Usuários ----------

create or replace function public.listar_usuarios(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u public.usuarios := public._sessao(p_token);
begin
  perform public._exigir(u, 'usuarios');
  return coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'nome', x.nome, 'email', x.email, 'perfil', x.perfil,
            'ativo', x.ativo, 'cliente_id', x.cliente_id, 'cliente_nome', c.nome, 'ultimo_acesso', x.ultimo_acesso)
            order by c.nome nulls first, x.nome)
    from usuarios x left join clientes c on c.id = x.cliente_id
   where u.perfil = 'admin' or x.cliente_id = u.cliente_id), '[]'::jsonb);
end $$;

create or replace function public.salvar_usuario(p_token text, p_id uuid, p_nome text, p_email text, p_perfil text,
                                                p_cliente_id uuid, p_ativo boolean, p_senha text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare u public.usuarios := public._sessao(p_token); x public.usuarios; cli uuid := p_cliente_id;
begin
  perform public._exigir(u, 'usuarios');
  if u.perfil <> 'admin' then
    if p_perfil = 'admin' then raise exception 'SEM_PERMISSAO' using hint = 'Só o administrador da plataforma cria administradores.'; end if;
    cli := u.cliente_id;
  end if;
  if p_perfil = 'admin' then cli := null; end if;
  if coalesce(trim(p_nome),'') = '' or coalesce(trim(p_email),'') = '' then
    raise exception 'DADOS_INVALIDOS' using hint = 'Informe nome e e-mail.';
  end if;
  if p_perfil <> 'admin' and cli is null then
    raise exception 'DADOS_INVALIDOS' using hint = 'Escolha o cliente do usuário.';
  end if;
  if coalesce(p_senha,'') <> '' and length(p_senha) < 8 then
    raise exception 'SENHA_CURTA' using hint = 'A senha deve ter pelo menos 8 caracteres.';
  end if;

  if p_id is null then
    if coalesce(p_senha,'') = '' then
      raise exception 'DADOS_INVALIDOS' using hint = 'Defina uma senha inicial.';
    end if;
    insert into usuarios(nome, email, senha_hash, perfil, cliente_id, ativo)
    values (trim(p_nome), lower(trim(p_email)), crypt(p_senha, gen_salt('bf')), p_perfil, cli, coalesce(p_ativo,true))
    returning * into x;
    perform public._log(u, 'usuario_criado', cli, null, jsonb_build_object('email', x.email, 'perfil', x.perfil));
  else
    select * into x from usuarios where id = p_id;
    if not found or (u.perfil <> 'admin' and x.cliente_id is distinct from u.cliente_id) then
      raise exception 'SEM_PERMISSAO' using hint = 'Usuário de outra empresa.';
    end if;
    if u.perfil <> 'admin' and x.perfil = 'admin' then
      raise exception 'SEM_PERMISSAO' using hint = 'Usuário administrador da plataforma.';
    end if;
    update usuarios set nome = trim(p_nome), email = lower(trim(p_email)), perfil = p_perfil,
           cliente_id = cli, ativo = coalesce(p_ativo,true),
           senha_hash = case when coalesce(p_senha,'') <> '' then crypt(p_senha, gen_salt('bf')) else senha_hash end
     where id = p_id returning * into x;
    if not x.ativo or coalesce(p_senha,'') <> '' then delete from sessoes where usuario_id = x.id; end if;
    perform public._log(u, 'usuario_alterado', cli, null, jsonb_build_object('email', x.email, 'perfil', x.perfil, 'ativo', x.ativo));
  end if;
  return jsonb_build_object('id', x.id);
exception when unique_violation then
  raise exception 'EMAIL_EM_USO' using hint = 'Já existe um usuário com este e-mail.';
end $$;

-- ---------- Documentos ----------

create or replace function public.criar_documento(p_token text, p_cliente_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u public.usuarios := public._sessao(p_token); c public.clientes; a int := extract(year from now() at time zone 'America/Sao_Paulo');
        seq int; d public.documentos;
begin
  perform public._exigir(u, 'editar');
  select * into c from clientes where id = case when u.perfil = 'admin' then p_cliente_id else u.cliente_id end and ativo;
  if not found then raise exception 'DADOS_INVALIDOS' using hint = 'Escolha um cliente ativo.'; end if;
  insert into contadores(cliente_id, ano, ultimo) values (c.id, a, 1)
  on conflict (cliente_id, ano) do update set ultimo = contadores.ultimo + 1
  returning ultimo into seq;
  insert into documentos(cliente_id, numero, ano, sequencia, dados, criado_por)
  values (c.id, format('APR-PT-%s-%s', a, lpad(seq::text, 4, '0')), a, seq,
          jsonb_build_object('id', jsonb_build_object('empresa', c.nome, 'cnpj', coalesce(c.cnpj,''))), u.id)
  returning * into d;
  perform public._evento(d.id, format('Documento criado por %s', u.nome));
  perform public._log(u, 'documento_criado', c.id, d.id, jsonb_build_object('numero', d.numero));
  return jsonb_build_object('id', d.id, 'numero', d.numero);
end $$;

drop function if exists public.listar_documentos(text, text, text);
create or replace function public.listar_documentos(p_token text, p_status text default null, p_busca text default null,
                                                   p_lixeira boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u public.usuarios := public._sessao(p_token); b text := '%' || coalesce(trim(p_busca),'') || '%';
begin
  if coalesce(p_lixeira,false) and u.perfil not in ('admin','gestor') then
    raise exception 'SEM_PERMISSAO' using hint = 'Seu perfil não acessa a lixeira.';
  end if;
  return coalesce((select jsonb_agg(x order by x->>'ordem' desc) from (
    select jsonb_build_object(
      'id', d.id, 'numero', d.numero, 'status', d.status, 'cliente_nome', c.nome,
      'empresa', d.dados#>>'{id,empresa}', 'local', d.dados#>>'{id,local}', 'servico', d.dados#>>'{id,servico}',
      'criado_em', d.criado_em, 'atualizado_em', d.atualizado_em, 'criado_por_nome', us.nome,
      'liberada_em', d.liberada_em, 'validade_fim', d.validade_fim, 'encerrada_em', d.encerrada_em,
      'excluido_em', d.excluido_em, 'excluido_por_nome', ex.nome,
      'apagar_em', d.excluido_em + interval '30 days',
      'ordem', case when coalesce(p_lixeira,false) then d.excluido_em else d.criado_em end) x
    from documentos d join clientes c on c.id = d.cliente_id
         left join usuarios us on us.id = d.criado_por left join usuarios ex on ex.id = d.excluido_por
   where (u.perfil = 'admin' or d.cliente_id = u.cliente_id)
     and (case when coalesce(p_lixeira,false) then d.excluido_em is not null else d.excluido_em is null end)
     and (p_status is null or p_status = '' or d.status = p_status)
     and (coalesce(trim(p_busca),'') = '' or d.numero ilike b or c.nome ilike b
          or d.dados#>>'{id,servico}' ilike b or d.dados#>>'{id,local}' ilike b)
   order by d.criado_em desc
   limit 300) t), '[]'::jsonb);
end $$;

create or replace function public.obter_documento(p_token text, p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u public.usuarios := public._sessao(p_token); d public.documentos;
begin
  select * into d from documentos where id = p_id;
  if not found or (u.perfil <> 'admin' and d.cliente_id is distinct from u.cliente_id) then
    raise exception 'DOCUMENTO_NAO_ENCONTRADO' using hint = 'Documento não encontrado ou sem acesso.';
  end if;
  if d.excluido_em is not null then
    raise exception 'DOCUMENTO_NA_LIXEIRA' using hint = 'Este documento está na lixeira. Restaure-o para abrir.';
  end if;
  return public._doc_json(d);
end $$;

-- Rascunho: grava tudo. Liberada ou suspensa: só encerramento e motivo de suspensão.
create or replace function public.salvar_documento(p_token text, p_id uuid, p_dados jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u public.usuarios := public._sessao(p_token); d public.documentos := public._doc(u, p_id); nd jsonb;
begin
  if d.status = 'rascunho' and u.perfil = 'liberador' then
    -- o liberador preenche apenas a parte da liberação
    nd := jsonb_set(d.dados, '{lib}', coalesce(p_dados->'lib', d.dados->'lib', '{}'::jsonb), true);
  elsif d.status = 'rascunho' then
    perform public._exigir(u, 'editar');
    nd := p_dados;
  elsif d.status in ('liberada','suspensa') then
    perform public._exigir(u, 'suspender');
    nd := jsonb_set(d.dados, '{enc}', coalesce(p_dados->'enc', d.dados->'enc', '{}'::jsonb), true);
    if d.dados ? 'lib' then
      nd := jsonb_set(nd, '{lib,motivo}', to_jsonb(coalesce(p_dados#>>'{lib,motivo}','')), true);
    end if;
  else
    raise exception 'DOCUMENTO_BLOQUEADO' using hint = 'Documento encerrado ou cancelado não pode ser alterado.';
  end if;
  update documentos set dados = nd, atualizado_em = now() where id = p_id;
  return jsonb_build_object('atualizado_em', now());
end $$;

create or replace function public.liberar_documento(p_token text, p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u public.usuarios := public._sessao(p_token); d public.documentos := public._doc(u, p_id); erros text[];
begin
  perform public._exigir(u, 'liberar');
  if d.status <> 'rascunho' then
    raise exception 'TRANSICAO_INVALIDA' using hint = 'Só um rascunho pode ser liberado.';
  end if;
  erros := public._validar_liberacao(d.dados);
  if array_length(erros, 1) > 0 then
    raise exception 'LIBERACAO_BLOQUEADA' using hint = 'Há pendências que impedem a liberação.', detail = array_to_string(erros, ' | ');
  end if;
  update documentos set status = 'liberada', liberada_em = now(), liberada_por = u.id,
         validade_ini = public._dh(dados#>>'{lib,ini}'), validade_fim = public._dh(dados#>>'{lib,fim}'),
         atualizado_em = now()
   where id = p_id returning * into d;
  perform public._evento(d.id, format('PT liberada no sistema por %s (liberador: %s)', u.nome, coalesce(d.dados#>>'{lib,liberador,nome}','')));
  perform public._log(u, 'documento_liberado', d.cliente_id, d.id, jsonb_build_object('numero', d.numero));
  select * into d from documentos where id = p_id;
  return public._doc_json(d);
end $$;

create or replace function public.suspender_documento(p_token text, p_id uuid, p_motivo text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u public.usuarios := public._sessao(p_token); d public.documentos := public._doc(u, p_id);
begin
  perform public._exigir(u, 'suspender');
  if d.status <> 'liberada' then raise exception 'TRANSICAO_INVALIDA' using hint = 'Só uma PT liberada pode ser suspensa.'; end if;
  update documentos set status = 'suspensa', atualizado_em = now(),
         dados = jsonb_set(dados, '{lib,motivo}', '""'::jsonb, true) where id = p_id;
  perform public._evento(p_id, format('PT suspensa por %s: %s', u.nome, coalesce(nullif(trim(p_motivo),''), 'motivo não informado')));
  perform public._log(u, 'documento_suspenso', d.cliente_id, d.id, jsonb_build_object('motivo', p_motivo));
  select * into d from documentos where id = p_id;
  return public._doc_json(d);
end $$;

create or replace function public.retomar_documento(p_token text, p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u public.usuarios := public._sessao(p_token); d public.documentos := public._doc(u, p_id);
begin
  perform public._exigir(u, 'liberar');
  if d.status <> 'suspensa' then raise exception 'TRANSICAO_INVALIDA' using hint = 'Só uma PT suspensa pode ser retomada.'; end if;
  if d.validade_fim is not null and d.validade_fim < now() then
    raise exception 'PT_VENCIDA' using hint = 'A validade desta PT terminou. Encerre e emita um novo documento.';
  end if;
  update documentos set status = 'liberada', atualizado_em = now() where id = p_id;
  perform public._evento(p_id, format('Trabalho retomado por %s após conferência das condições', u.nome));
  perform public._log(u, 'documento_retomado', d.cliente_id, d.id);
  select * into d from documentos where id = p_id;
  return public._doc_json(d);
end $$;

create or replace function public.encerrar_documento(p_token text, p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u public.usuarios := public._sessao(p_token); d public.documentos := public._doc(u, p_id); k text;
begin
  perform public._exigir(u, 'encerrar');
  if d.status not in ('liberada','suspensa') then
    raise exception 'TRANSICAO_INVALIDA' using hint = 'Só uma PT liberada ou suspensa pode ser encerrada.';
  end if;
  foreach k in array array['x_serv','x_area','x_ferr','x_bloq','x_equipe'] loop
    if coalesce((d.dados#>>array['enc','chk',k])::boolean, false) is false then
      raise exception 'ENCERRAMENTO_INCOMPLETO' using hint = 'Marque todos os itens de encerramento.';
    end if;
  end loop;
  if coalesce(trim(d.dados#>>'{enc,resp,nome}'),'') = '' or coalesce(d.dados#>>'{enc,resp,ass}','') = '' then
    raise exception 'ENCERRAMENTO_INCOMPLETO' using hint = 'Informe e assine como responsável pelo encerramento.';
  end if;
  update documentos set status = 'encerrada', encerrada_em = now(), encerrada_por = u.id, atualizado_em = now()
   where id = p_id;
  perform public._evento(p_id, format('PT encerrada por %s (%s)', d.dados#>>'{enc,resp,nome}',
          case when d.dados#>>'{enc,situacao}' = 'nao' then 'serviço não concluído' else 'serviço concluído' end));
  perform public._log(u, 'documento_encerrado', d.cliente_id, d.id);
  select * into d from documentos where id = p_id;
  return public._doc_json(d);
end $$;

create or replace function public.cancelar_documento(p_token text, p_id uuid, p_motivo text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u public.usuarios := public._sessao(p_token); d public.documentos := public._doc(u, p_id);
begin
  perform public._exigir(u, 'editar');
  if d.status <> 'rascunho' then raise exception 'TRANSICAO_INVALIDA' using hint = 'Só um rascunho pode ser cancelado.'; end if;
  if coalesce(trim(p_motivo),'') = '' then raise exception 'DADOS_INVALIDOS' using hint = 'Informe o motivo do cancelamento.'; end if;
  update documentos set status = 'cancelada', atualizado_em = now() where id = p_id;
  perform public._evento(p_id, format('Documento cancelado por %s: %s', u.nome, p_motivo));
  perform public._log(u, 'documento_cancelado', d.cliente_id, d.id, jsonb_build_object('motivo', p_motivo));
  select * into d from documentos where id = p_id;
  return public._doc_json(d);
end $$;

-- Cria um rascunho novo copiando a análise (sem assinaturas, liberação e encerramento)
create or replace function public.duplicar_documento(p_token text, p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u public.usuarios := public._sessao(p_token); o public.documentos := public._doc(u, p_id);
        a int := extract(year from now() at time zone 'America/Sao_Paulo'); seq int; d public.documentos; nd jsonb; i int;
begin
  perform public._exigir(u, 'editar');
  nd := o.dados - 'enc' - 'lib';
  if jsonb_typeof(nd->'equipe') = 'array' then
    for i in 0 .. jsonb_array_length(nd->'equipe') - 1 loop
      nd := jsonb_set(nd, array['equipe', i::text, 'ass'], 'null'::jsonb);
      nd := jsonb_set(nd, array['equipe', i::text, 'em'],  'null'::jsonb);
    end loop;
  end if;
  insert into contadores(cliente_id, ano, ultimo) values (o.cliente_id, a, 1)
  on conflict (cliente_id, ano) do update set ultimo = contadores.ultimo + 1
  returning ultimo into seq;
  insert into documentos(cliente_id, numero, ano, sequencia, dados, criado_por)
  values (o.cliente_id, format('APR-PT-%s-%s', a, lpad(seq::text, 4, '0')), a, seq, nd, u.id)
  returning * into d;
  perform public._evento(d.id, format('Documento criado por %s a partir de %s', u.nome, o.numero));
  perform public._log(u, 'documento_duplicado', d.cliente_id, d.id, jsonb_build_object('origem', o.numero, 'numero', d.numero));
  return jsonb_build_object('id', d.id, 'numero', d.numero);
end $$;

-- ---------- Lixeira ----------

-- Rascunho e cancelado: gestor ou administrador. Encerrado: só o administrador, digitando o número.
-- Liberado ou suspenso: precisa ser encerrado antes.
create or replace function public.excluir_documento(p_token text, p_id uuid, p_confirmacao text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u public.usuarios := public._sessao(p_token); d public.documentos := public._doc(u, p_id);
begin
  if d.status in ('liberada','suspensa') then
    raise exception 'EXCLUSAO_BLOQUEADA' using hint = 'PT liberada ou suspensa não pode ser apagada. Encerre a PT antes.';
  elsif d.status = 'encerrada' then
    if u.perfil <> 'admin' then
      raise exception 'SEM_PERMISSAO' using hint = 'Só o administrador da plataforma pode apagar uma PT encerrada.';
    end if;
    if upper(trim(coalesce(p_confirmacao,''))) <> upper(d.numero) then
      raise exception 'CONFIRMACAO_INVALIDA' using hint = 'Digite o número do documento exatamente como aparece para confirmar.';
    end if;
  elsif u.perfil not in ('admin','gestor') then
    raise exception 'SEM_PERMISSAO' using hint = 'Só o gestor ou o administrador pode apagar documentos.';
  end if;
  update documentos set excluido_em = now(), excluido_por = u.id where id = p_id;
  perform public._evento(p_id, format('Documento enviado para a lixeira por %s', u.nome));
  perform public._log(u, 'documento_para_lixeira', d.cliente_id, d.id, jsonb_build_object('numero', d.numero, 'status', d.status));
  return jsonb_build_object('numero', d.numero, 'apagar_em', now() + interval '30 days');
end $$;

create or replace function public.restaurar_documento(p_token text, p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u public.usuarios := public._sessao(p_token); d public.documentos;
begin
  select * into d from documentos where id = p_id for update;
  if not found or (u.perfil <> 'admin' and d.cliente_id is distinct from u.cliente_id) then
    raise exception 'DOCUMENTO_NAO_ENCONTRADO' using hint = 'Documento não encontrado ou sem acesso.';
  end if;
  if d.excluido_em is null then
    raise exception 'TRANSICAO_INVALIDA' using hint = 'Este documento não está na lixeira.';
  end if;
  if u.perfil not in ('admin','gestor') or (d.status = 'encerrada' and u.perfil <> 'admin') then
    raise exception 'SEM_PERMISSAO' using hint = 'Seu perfil não pode restaurar este documento.';
  end if;
  update documentos set excluido_em = null, excluido_por = null where id = p_id;
  perform public._evento(p_id, format('Documento restaurado da lixeira por %s', u.nome));
  perform public._log(u, 'documento_restaurado', d.cliente_id, d.id, jsonb_build_object('numero', d.numero));
  return jsonb_build_object('numero', d.numero);
end $$;

-- ---------- Verificação pública (QR code do documento) ----------

create or replace function public.verificar_documento(p_codigo text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare d public.documentos;
begin
  select * into d from documentos where codigo = lower(trim(p_codigo)) and excluido_em is null;
  if not found then return null; end if;
  return jsonb_build_object(
    'numero', d.numero,
    'status', case when d.status = 'liberada' and d.validade_fim < now() then 'vencida' else d.status end,
    'empresa', d.dados#>>'{id,empresa}', 'local', d.dados#>>'{id,local}', 'servico', d.dados#>>'{id,servico}',
    'validade_ini', d.validade_ini, 'validade_fim', d.validade_fim,
    'liberada_em', d.liberada_em, 'encerrada_em', d.encerrada_em, 'consultado_em', now());
end $$;

-- ---------- Permissões de execução ----------
-- Fecha tudo e abre só as funções que o site chama.
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.prokind = 'f' loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;

grant execute on function public.ping()                                   to anon;
grant execute on function public.login(text, text)                        to anon;
grant execute on function public.logout(text)                             to anon;
grant execute on function public.eu(text)                                 to anon;
grant execute on function public.alterar_minha_senha(text, text, text)    to anon;
grant execute on function public.listar_clientes(text)                    to anon;
grant execute on function public.salvar_cliente(text, uuid, text, text, boolean, jsonb) to anon;
grant execute on function public.listar_usuarios(text)                    to anon;
grant execute on function public.salvar_usuario(text, uuid, text, text, text, uuid, boolean, text) to anon;
grant execute on function public.criar_documento(text, uuid)              to anon;
grant execute on function public.listar_documentos(text, text, text, boolean) to anon;
grant execute on function public.excluir_documento(text, uuid, text)     to anon;
grant execute on function public.restaurar_documento(text, uuid)          to anon;
grant execute on function public.obter_documento(text, uuid)              to anon;
grant execute on function public.salvar_documento(text, uuid, jsonb)      to anon;
grant execute on function public.liberar_documento(text, uuid)            to anon;
grant execute on function public.suspender_documento(text, uuid, text)    to anon;
grant execute on function public.retomar_documento(text, uuid)            to anon;
grant execute on function public.encerrar_documento(text, uuid)           to anon;
grant execute on function public.cancelar_documento(text, uuid, text)     to anon;
grant execute on function public.duplicar_documento(text, uuid)           to anon;
grant execute on function public.verificar_documento(text)                to anon;
-- criar_admin_inicial NÃO fica liberada para o site: rode no SQL Editor.
