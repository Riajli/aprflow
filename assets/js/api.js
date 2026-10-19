/* APRFlow · conexão com o Supabase (somente funções RPC) */
(function(){
  const TOKEN_KEY = 'aprflow-token';
  const USER_KEY = 'aprflow-usuario';

  const MSG = {
    LOGIN_INVALIDO: 'E-mail ou senha incorretos.',
    SESSAO_EXPIRADA: 'Sua sessão terminou. Entre novamente.',
    SEM_PERMISSAO: 'Seu perfil não permite esta ação.',
    DOCUMENTO_NAO_ENCONTRADO: 'Documento não encontrado ou sem acesso.',
    DOCUMENTO_BLOQUEADO: 'Documento encerrado ou cancelado não pode ser alterado.',
    LIBERACAO_BLOQUEADA: 'Há pendências que impedem a liberação.',
    TRANSICAO_INVALIDA: 'Esta ação não é possível na situação atual do documento.',
    ENCERRAMENTO_INCOMPLETO: 'Complete o encerramento antes de encerrar a PT.',
    PT_VENCIDA: 'A validade desta PT terminou.',
    CLIENTE_INATIVO: 'O acesso desta empresa está desativado.',
    SENHA_CURTA: 'A senha deve ter pelo menos 8 caracteres.',
    SENHA_ATUAL_INCORRETA: 'A senha atual não confere.',
    EMAIL_EM_USO: 'Já existe um usuário com este e-mail.',
    DADOS_INVALIDOS: 'Confira os dados informados.'
  };

  function ls(fn){ try { return fn(); } catch(e){ return null; } }

  const API = {
    token(){ return ls(()=>localStorage.getItem(TOKEN_KEY)); },
    usuario(){ return ls(()=>JSON.parse(localStorage.getItem(USER_KEY))); },
    salvarSessao(token, usuario){ ls(()=>{ localStorage.setItem(TOKEN_KEY, token); localStorage.setItem(USER_KEY, JSON.stringify(usuario)); }); },
    limpar(){ ls(()=>{ localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); }); },
    configurado(){ const c = window.APRFLOW_CONFIG || {}; return c.SUPABASE_URL && !/SEU-PROJETO/.test(c.SUPABASE_URL) && c.SUPABASE_ANON_KEY && !/COLE-AQUI/.test(c.SUPABASE_ANON_KEY); },

    async rpc(fn, args){
      const c = window.APRFLOW_CONFIG;
      if(!API.configurado()) throw Object.assign(new Error('O site ainda não foi ligado ao banco. Preencha assets/js/config.js.'), {code:'NAO_CONFIGURADO'});
      let r;
      try {
        r = await fetch(`${c.SUPABASE_URL}/rest/v1/rpc/${fn}`, {
          method: 'POST',
          headers: Object.assign({ apikey: c.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
            /^eyJ/.test(c.SUPABASE_ANON_KEY) ? { Authorization: `Bearer ${c.SUPABASE_ANON_KEY}` } : {}),
          body: JSON.stringify(args || {})
        });
      } catch(e){
        throw Object.assign(new Error('Sem conexão com o servidor. Verifique a internet e tente de novo.'), {code:'SEM_CONEXAO'});
      }
      const txt = await r.text();
      let j = null; try { j = txt ? JSON.parse(txt) : null; } catch(e){}
      if(!r.ok){
        const code = (j && j.message) || 'ERRO';
        const err = new Error(MSG[code] ? (j.hint || MSG[code]) : (j && (j.hint || j.message)) || 'Erro inesperado no servidor.');
        err.code = code;
        err.detalhes = j && j.details ? String(j.details).split(' | ') : [];
        if(code === 'SESSAO_EXPIRADA'){ API.limpar(); location.href = 'index.html?expirou=1'; }
        throw err;
      }
      return j;
    },

    /* Chamada autenticada: acrescenta o token da sessão */
    call(fn, args){ return API.rpc(fn, Object.assign({ p_token: API.token() }, args || {})); },

    /* Para páginas internas: exige sessão válida */
    async exigirLogin(){
      if(!API.token()){ location.href = 'index.html'; return null; }
      const u = await API.call('eu');
      API.salvarSessao(API.token(), u);
      return u;
    },

    async sair(){
      try { await API.rpc('logout', { p_token: API.token() }); } catch(e){}
      API.limpar(); location.href = 'index.html';
    }
  };

  const PERFIS = { admin:'Administrador da plataforma', gestor:'Gestor', tecnico:'Técnico / Elaborador', liberador:'Liberador', consulta:'Consulta' };
  const PODE = {
    editar:    ['admin','gestor','tecnico'],
    liberar:   ['admin','gestor','liberador'],
    encerrar:  ['admin','gestor','tecnico','liberador'],
    suspender: ['admin','gestor','tecnico','liberador'],
    usuarios:  ['admin','gestor'],
    clientes:  ['admin']
  };
  API.PERFIS = PERFIS;
  API.pode = (u, acao) => !!u && (PODE[acao] || []).includes(u.perfil);

  /* Avisos rápidos */
  let tt = null;
  API.toast = (txt, tipo) => {
    let el = document.getElementById('toast');
    if(!el){ el = document.createElement('div'); el.id = 'toast'; el.setAttribute('role','status'); document.body.appendChild(el); }
    el.className = 'toast' + (tipo === 'bad' ? ' bad' : '');
    el.textContent = txt; el.hidden = false;
    clearTimeout(tt); tt = setTimeout(()=>{ el.hidden = true; }, tipo === 'bad' ? 6000 : 3000);
  };

  API.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  window.API = API;
})();
