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

-- CPF: confere os dígitos verificadores
create or replace function public._cpf_valido(p text)
returns boolean language plpgsql immutable as $$
declare d text := regexp_replace(coalesce(p,''), '\D', '', 'g'); s int; t int; i int; dv int;
begin
  if length(d) <> 11 or d ~ '^(\d)\1{10}$' then return false; end if;
  for t in 9..10 loop
    s := 0;
    for i in 1..t loop s := s + substr(d, i, 1)::int * (t + 2 - i); end loop;
    dv := (s * 10) % 11 % 10;
    if dv <> substr(d, t + 1, 1)::int then return false; end if;
  end loop;
  return true;
end $$;

-- CPF gravado sempre no formato 000.000.000-00
create or replace function public._cpf_fmt(p text)
returns text language sql immutable as $$
  select case when length(regexp_replace(coalesce(p,''), '\D', '', 'g')) = 11 then
    regexp_replace(regexp_replace(coalesce(p,''), '\D', '', 'g'), '^(\d{3})(\d{3})(\d{3})(\d{2})$', '\1.\2.\3-\4')
  else nullif(trim(coalesce(p,'')), '') end;
$$;

-- Perfis que elaboram APR precisam de registro profissional (MTE ou CREA)
create or replace function public._exige_registro(p_perfil text)
returns boolean language sql immutable as $$ select p_perfil in ('admin','gestor','tecnico'); $$;

-- O que falta no cadastro do usuário
create or replace function public._cadastro_pendente(u public.usuarios)
returns text[] language sql stable as $$
  select array_remove(array[
    case when not public._cpf_valido(u.cpf) then 'cpf' end,
    case when coalesce(trim(u.funcao),'') = '' then 'funcao' end,
    case when public._exige_registro(u.perfil)
          and (coalesce(u.reg_tipo,'') not in ('MTE','CREA') or coalesce(trim(u.reg_num),'') = '') then 'registro' end
  ], null);
$$;

-- Confere CPF, função e registro conforme o perfil
create or replace function public._validar_cadastro(p_perfil text, p_cpf text, p_funcao text, p_reg_tipo text, p_reg_num text)
returns void language plpgsql immutable as $$
begin
  if not public._cpf_valido(p_cpf) then
    raise exception 'DADOS_INVALIDOS' using hint = 'Informe um CPF válido.';
  end if;
  if coalesce(trim(p_funcao),'') = '' then
    raise exception 'DADOS_INVALIDOS' using hint = 'Informe a função ou cargo.';
  end if;
  if public._exige_registro(p_perfil) then
    if coalesce(p_reg_tipo,'') not in ('MTE','CREA') or coalesce(trim(p_reg_num),'') = '' then
      raise exception 'DADOS_INVALIDOS' using hint = 'Informe o registro profissional (MTE ou CREA) e o número.';
    end if;
  end if;
end $$;

create or replace function public._usuario_json(u public.usuarios)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', u.id, 'nome', u.nome, 'email', u.email, 'perfil', u.perfil,
    'cliente_id', u.cliente_id,
    'cliente_nome', (select nome from clientes where id = u.cliente_id),
    'cpf', u.cpf, 'funcao', u.funcao, 'reg_tipo', u.reg_tipo, 'reg_num', u.reg_num,
    'pendente', to_jsonb(public._cadastro_pendente(u)));
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
    'encerrada_em', d.encerrada_em, 'encerrada_por_nome', (select nome from usuarios where id = d.encerrada_por),
    'suspensa_por', d.suspensa_por);
$$;

-- Data e hora digitadas no formulário (sem fuso) são do horário de Brasília
create or replace function public._dh(p_txt text)
returns timestamptz language sql stable as $$
  select case when coalesce(p_txt,'') = '' then null
              else (p_txt::timestamp at time zone 'America/Sao_Paulo') end;
$$;

-- Data e hora no horário de Brasília, para textos do histórico
create or replace function public._brt(t timestamptz)
returns text language sql stable as $$
  select to_char(t at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI');
$$;

-- Texto do histórico: quem foi informado no documento e, se for outra pessoa, quem registrou no sistema
create or replace function public._quem(p_acao text, p_informado text, p_logado text)
returns text language sql immutable as $$
  select case
    when coalesce(trim(p_informado),'') = '' then format('%s por %s', p_acao, p_logado)
    when lower(trim(p_informado)) = lower(trim(p_logado)) then format('%s por %s', p_acao, trim(p_informado))
    else format('%s por %s (registrado no sistema por %s)', p_acao, trim(p_informado), p_logado) end;
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

  -- A validade é definida pelo servidor no momento da liberação (até 12 h).
  -- Única regra de datas: a APR não pode ter data de elaboração no futuro.
  begin
    if nullif(dd#>>'{id,elaboracao}','')::date > (now() at time zone 'America/Sao_Paulo')::date then
      e := array_append(e, 'Data de elaboração da APR no futuro'::text);
    end if;
  exception when others then
    e := array_append(e, 'Data de elaboração da APR inválida'::text);
  end;

  if jsonb_typeof(dd#>'{lib,imped}') = 'object' then
    for r in select key, value from jsonb_each_text(dd#>'{lib,imped}') loop
      if r.value = 'presente' then e := array_append(e, 'Há verificação de condição impeditiva respondida com Não'::text); exit; end if;
    end loop;
  end if;

  -- Descrição das atividades por etapa (documentos a partir da versão 3)
  if coalesce((dd->>'modoEtapas')::boolean, false) then
    if coalesce(jsonb_typeof(dd->'etapas'),'') <> 'array' or jsonb_array_length(dd->'etapas') = 0 then
      e := array_append(e, 'Nenhuma etapa da atividade descrita'::text);
    else
      n := 0;
      for w in select * from jsonb_array_elements(dd->'etapas') loop
        n := n + 1;
        if coalesce(trim(w->>'ativ'),'') = '' then e := array_append(e, format('Etapa %s sem atividade', n)::text); end if;
        if coalesce(trim(w->>'med'),'') = ''  then e := array_append(e, format('Etapa %s sem medidas preventivas', n)::text); end if;
        if coalesce(jsonb_typeof(w->'riscos'),'') <> 'array' or jsonb_array_length(w->'riscos') = 0 then
          e := array_append(e, format('Etapa %s sem riscos', n)::text);
        elsif exists (select 1 from jsonb_array_elements(w->'riscos') x
                       where coalesce((x->>'p')::int,0) = 0 or coalesce((x->>'s')::int,0) = 0) then
          e := array_append(e, format('Etapa %s com risco sem avaliação', n)::text);
        elsif exists (select 1 from jsonb_array_elements(w->'riscos') x
                       where coalesce((x->>'p')::int,0) * coalesce((x->>'s')::int,0) >= 12) then
          e := array_append(e, format('Etapa %s com risco classificado como crítico', n)::text);
        end if;
      end loop;
    end if;
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

-- O próprio usuário completa CPF, função e registro (pedido no primeiro acesso após a atualização)
create or replace function public.completar_cadastro(p_token text, p_cpf text, p_funcao text,
                                                    p_reg_tipo text default null, p_reg_num text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u public.usuarios := public._sessao(p_token);
begin
  perform public._validar_cadastro(u.perfil, p_cpf, p_funcao, p_reg_tipo, p_reg_num);
  update usuarios set cpf = public._cpf_fmt(p_cpf), funcao = trim(p_funcao),
         reg_tipo = case when public._exige_registro(perfil) then p_reg_tipo else nullif(p_reg_tipo,'') end,
         reg_num  = case when public._exige_registro(perfil) then trim(p_reg_num) else nullif(trim(coalesce(p_reg_num,'')),'') end
   where id = u.id returning * into u;
  perform public._log(u, 'cadastro_completado', null, null);
  return public._usuario_json(u);
exception when unique_violation then
  raise exception 'CPF_EM_USO' using hint = 'Já existe um usuário com este CPF nesta empresa.';
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
            'ativo', x.ativo, 'cliente_id', x.cliente_id, 'cliente_nome', c.nome, 'ultimo_acesso', x.ultimo_acesso,
            'cpf', x.cpf, 'funcao', x.funcao, 'reg_tipo', x.reg_tipo, 'reg_num', x.reg_num,
            'pendente', to_jsonb(public._cadastro_pendente(x)))
            order by c.nome nulls first, x.nome)
    from usuarios x left join clientes c on c.id = x.cliente_id
   where u.perfil = 'admin' or x.cliente_id = u.cliente_id), '[]'::jsonb);
end $$;

drop function if exists public.salvar_usuario(text, uuid, text, text, text, uuid, boolean, text);
create or replace function public.salvar_usuario(p_token text, p_id uuid, p_nome text, p_email text, p_perfil text,
                                                p_cliente_id uuid, p_ativo boolean, p_senha text,
                                                p_cpf text default null, p_funcao text default null,
                                                p_reg_tipo text default null, p_reg_num text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare u public.usuarios := public._sessao(p_token); x public.usuarios; cli uuid := p_cliente_id; cn text;
        rt text := case when public._exige_registro(p_perfil) then p_reg_tipo else nullif(p_reg_tipo,'') end;
        rn text := case when public._exige_registro(p_perfil) then trim(p_reg_num) else nullif(trim(coalesce(p_reg_num,'')),'') end;
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
  perform public._validar_cadastro(p_perfil, p_cpf, p_funcao, p_reg_tipo, p_reg_num);

  if p_id is null then
    if coalesce(p_senha,'') = '' then
      raise exception 'DADOS_INVALIDOS' using hint = 'Defina uma senha inicial.';
    end if;
    insert into usuarios(nome, email, senha_hash, perfil, cliente_id, ativo, cpf, funcao, reg_tipo, reg_num)
    values (trim(p_nome), lower(trim(p_email)), crypt(p_senha, gen_salt('bf')), p_perfil, cli, coalesce(p_ativo,true),
            public._cpf_fmt(p_cpf), trim(p_funcao), rt, rn)
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
           cpf = public._cpf_fmt(p_cpf), funcao = trim(p_funcao), reg_tipo = rt, reg_num = rn,
           senha_hash = case when coalesce(p_senha,'') <> '' then crypt(p_senha, gen_salt('bf')) else senha_hash end
     where id = p_id returning * into x;
    if not x.ativo or coalesce(p_senha,'') <> '' then delete from sessoes where usuario_id = x.id; end if;
    perform public._log(u, 'usuario_alterado', cli, null, jsonb_build_object('email', x.email, 'perfil', x.perfil, 'ativo', x.ativo));
  end if;
  return jsonb_build_object('id', x.id);
exception when unique_violation then
  get stacked diagnostics cn = constraint_name;
  if cn = 'usuarios_cpf_empresa' then
    raise exception 'CPF_EM_USO' using hint = 'Já existe um usuário com este CPF nesta empresa.';
  end if;
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
      'criado_por', d.criado_por,
      'elab_assinado', coalesce(d.dados#>>'{lib,elaborador,ass}','') <> '',
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

-- Rascunho:
--   técnico: grava a APR e o bloco "Elaborado por"; a conferência e a liberação ficam com o liberador
--   liberador: grava só a conferência, a validade e o "Liberado por", e só depois da assinatura do elaborador
--   gestor e administrador: gravam tudo
--   qualquer alteração na APR (ou nos dados do elaborador) depois da assinatura apaga a assinatura do elaborador
-- Liberada ou suspensa: só encerramento e motivo de suspensão.
create or replace function public.salvar_documento(p_token text, p_id uuid, p_dados jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u public.usuarios := public._sessao(p_token); d public.documentos := public._doc(u, p_id); nd jsonb;
        lib_old jsonb := coalesce(d.dados->'lib', '{}'::jsonb); el_old jsonb; el_new jsonb;
begin
  if d.status = 'rascunho' and u.perfil = 'liberador' then
    -- só a parte da liberação, e só com a APR assinada pelo elaborador; o "Elaborado por" nunca muda
    if coalesce(lib_old#>>'{elaborador,ass}','') = '' then
      nd := d.dados;
    else
      nd := jsonb_set(d.dados, '{lib}',
              jsonb_set(coalesce(p_dados->'lib', lib_old), '{elaborador}', coalesce(lib_old->'elaborador', '{}'::jsonb), true), true);
    end if;
  elsif d.status = 'rascunho' then
    perform public._exigir(u, 'editar');
    nd := p_dados;
    if u.perfil = 'tecnico' then
      -- o técnico não preenche a conferência nem a liberação
      nd := jsonb_set(nd, '{lib}', jsonb_set(lib_old, '{elaborador}', coalesce(p_dados#>'{lib,elaborador}', lib_old->'elaborador', '{}'::jsonb), true), true);
    end if;
    -- APR alterada depois da assinatura do elaborador: a assinatura deixa de valer
    el_old := coalesce(lib_old->'elaborador', '{}'::jsonb);
    el_new := coalesce(nd#>'{lib,elaborador}', '{}'::jsonb);
    if coalesce(el_old->>'ass','') <> '' and coalesce(el_new->>'ass','') = coalesce(el_old->>'ass','')
       and ((nd - 'lib' - 'enc' - 'meta') is distinct from (d.dados - 'lib' - 'enc' - 'meta')
            or (nd->'meta') is distinct from (d.dados->'meta')
            or (el_new - 'ass' - 'em') is distinct from (el_old - 'ass' - 'em')) then
      nd := jsonb_set(nd, '{lib,elaborador,ass}', 'null'::jsonb, true);
      nd := jsonb_set(nd, '{lib,elaborador,em}',  'null'::jsonb, true);
    end if;
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
  -- Início da validade = momento do clique em Liberar PT; vale por até 12 horas
  update documentos set status = 'liberada', liberada_em = now(), liberada_por = u.id,
         validade_ini = now(), validade_fim = now() + interval '12 hours',
         dados = jsonb_set(jsonb_set(dados, '{lib,ini}', to_jsonb(now()), true), '{lib,fim}', to_jsonb(now() + interval '12 hours'), true),
         atualizado_em = now()
   where id = p_id returning * into d;
  perform public._evento(d.id, public._quem('PT liberada', d.dados#>>'{lib,liberador,nome}', u.nome)
          || format(' · válida de %s até %s (horário de Brasília)', public._brt(d.validade_ini), public._brt(d.validade_fim)));
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
  update documentos set status = 'suspensa', atualizado_em = now(), suspensa_por = u.id,
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
  -- o liberador (ou gestor/administrador) retoma; o técnico só retoma a suspensão que ele mesmo fez
  if not (u.perfil in ('admin','gestor','liberador') or (u.perfil = 'tecnico' and d.suspensa_por = u.id)) then
    raise exception 'SEM_PERMISSAO' using hint = 'Só o liberador, ou quem suspendeu a PT, pode retomar o trabalho.';
  end if;
  if d.status <> 'suspensa' then raise exception 'TRANSICAO_INVALIDA' using hint = 'Só uma PT suspensa pode ser retomada.'; end if;
  if d.validade_fim is not null and d.validade_fim < now() then
    raise exception 'PT_VENCIDA' using hint = 'A validade desta PT terminou. Encerre e emita um novo documento.';
  end if;
  update documentos set status = 'liberada', atualizado_em = now(), suspensa_por = null where id = p_id;
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
  if not public._cpf_valido(d.dados#>>'{enc,resp,cpf}') then
    raise exception 'ENCERRAMENTO_INCOMPLETO' using hint = 'Informe um CPF válido do responsável pelo encerramento.';
  end if;
  if d.dados#>>'{enc,situacao}' = 'nao' and coalesce(trim(d.dados#>>'{enc,obs}'),'') = '' then
    raise exception 'ENCERRAMENTO_INCOMPLETO' using hint = 'Informe nas observações o motivo de o serviço não ter sido concluído.';
  end if;
  update documentos set status = 'encerrada', encerrada_em = now(), encerrada_por = u.id, atualizado_em = now()
   where id = p_id;
  perform public._evento(p_id, public._quem('PT encerrada', d.dados#>>'{enc,resp,nome}', u.nome) ||
          format(' em %s (horário de Brasília)', public._brt(now())) ||
          case when d.dados#>>'{enc,situacao}' = 'nao' then ' · serviço não concluído' else ' · serviço concluído' end);
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
drop function if exists public.excluir_documento(text, uuid, text);
-- Rascunho e cancelado: gestor, administrador ou quem criou. Encerrado: só o administrador, digitando o número.
-- Liberado ou suspenso: precisa ser encerrado antes.
-- p_definitivo: rascunho sem assinatura do elaborador pode ser apagado na hora, sem passar pela lixeira.
create or replace function public.excluir_documento(p_token text, p_id uuid, p_confirmacao text default null,
                                                   p_definitivo boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u public.usuarios := public._sessao(p_token); d public.documentos := public._doc(u, p_id);
        dono boolean := u.perfil in ('admin','gestor') or d.criado_por = u.id;
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
  elsif not dono or u.perfil = 'consulta' then
    raise exception 'SEM_PERMISSAO' using hint = 'Só o gestor, o administrador ou quem criou o documento pode apagá-lo.';
  end if;

  if coalesce(p_definitivo, false) then
    if d.status <> 'rascunho' or coalesce(d.dados#>>'{lib,elaborador,ass}','') <> '' then
      raise exception 'EXCLUSAO_BLOQUEADA' using hint = 'Só um rascunho ainda não assinado pelo elaborador pode ser apagado na hora. Envie para a lixeira.';
    end if;
    delete from documentos where id = p_id;
    perform public._log(u, 'documento_apagado_definitivo', d.cliente_id, null, jsonb_build_object('numero', d.numero, 'documento_id', d.id));
    return jsonb_build_object('numero', d.numero, 'definitivo', true);
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
declare d public.documentos; dd jsonb;
begin
  select * into d from documentos where codigo = lower(trim(p_codigo)) and excluido_em is null;
  if not found then return null; end if;
  dd := d.dados;
  -- Só informações operacionais: nenhum nome ou CPF de executante
  return jsonb_build_object(
    'numero', d.numero,
    'status', case when d.status = 'liberada' and d.validade_fim < now() then 'vencida' else d.status end,
    'empresa', dd#>>'{id,empresa}', 'local', dd#>>'{id,local}', 'servico', dd#>>'{id,servico}',
    'validade_ini', d.validade_ini, 'validade_fim', d.validade_fim,
    'liberada_em', d.liberada_em, 'encerrada_em', d.encerrada_em, 'consultado_em', now(),
    'liberador', jsonb_build_object('nome', dd#>>'{lib,liberador,nome}', 'funcao', dd#>>'{lib,liberador,funcao}'),
    'elaborador', jsonb_build_object('nome', dd#>>'{lib,elaborador,nome}', 'funcao', dd#>>'{lib,elaborador,funcao}',
                                     'reg_tipo', dd#>>'{lib,elaborador,regTipo}', 'reg_num', dd#>>'{lib,elaborador,regNum}'),
    'executantes', case when jsonb_typeof(dd->'equipe') = 'array' then jsonb_array_length(dd->'equipe') else 0 end,
    'ativ', coalesce((select jsonb_agg(k order by k) from jsonb_each(coalesce(dd->'ativ','{}'::jsonb)) e(k, v) where v = 'true'::jsonb), '[]'::jsonb),
    'riscos_ativos', coalesce((select jsonb_agg(k) from jsonb_each(coalesce(dd->'riscos','{}'::jsonb)) e(k, v) where coalesce((v->>'on')::boolean,false)), '[]'::jsonb),
    'imped', coalesce(dd#>'{lib,imped}', '{}'::jsonb),
    'imped_extra', coalesce((select jsonb_agg(x->>'txt') from jsonb_array_elements(case when jsonb_typeof(dd->'impExtra') = 'array' then dd->'impExtra' else '[]'::jsonb end) x), '[]'::jsonb),
    'telefones', coalesce((select jsonb_agg(jsonb_build_object('s', t->>'s', 't', t->>'t'))
                   from jsonb_array_elements(case when jsonb_typeof(dd#>'{emerg,tel}') = 'array' then dd#>'{emerg,tel}' else '[]'::jsonb end) t
                  where coalesce(trim(t->>'t'),'') <> ''), '[]'::jsonb),
    'hospitais', coalesce((select jsonb_agg(jsonb_build_object('nome', h->>'nome', 'tel', h->>'tel', 'km', h->>'km', 'min', h->>'min', 'addr', h->'addr'))
                   from jsonb_array_elements(case when jsonb_typeof(dd#>'{emerg,hospitais}') = 'array' then dd#>'{emerg,hospitais}' else '[]'::jsonb end) h
                  where coalesce(trim(h->>'nome'),'') <> ''), '[]'::jsonb),
    'end_local', dd#>'{id,endLocal}',
    'end_empresa', dd#>'{id,endEmpresa}',
    'cliente_razao', nullif(trim(coalesce(dd#>>'{id,cliRazao}','')),''),
    'cliente_cnpj', nullif(trim(coalesce(dd#>>'{id,cliCnpj}','')),''),
    'encerramento', case when d.status = 'encerrada' then jsonb_build_object('nome', dd#>>'{enc,resp,nome}', 'funcao', dd#>>'{enc,resp,funcao}',
                      'situacao', dd#>>'{enc,situacao}') end,
    'suspensao', case when d.status = 'suspensa' then
                   (select e from jsonb_array_elements(d.eventos) e where e->>'txt' like 'PT suspensa%' order by e->>'em' desc limit 1) end);
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
grant execute on function public.salvar_usuario(text, uuid, text, text, text, uuid, boolean, text, text, text, text, text) to anon;
grant execute on function public.completar_cadastro(text, text, text, text, text) to anon;
grant execute on function public.criar_documento(text, uuid)              to anon;
grant execute on function public.listar_documentos(text, text, text, boolean) to anon;
grant execute on function public.excluir_documento(text, uuid, text, boolean) to anon;
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
