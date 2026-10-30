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
    DADOS_INVALIDOS: 'Confira os dados informados.',
    DOCUMENTO_NA_LIXEIRA: 'Este documento está na lixeira.',
    EXCLUSAO_BLOQUEADA: 'Este documento não pode ser apagado na situação atual.',
    CONFIRMACAO_INVALIDA: 'O número digitado não confere com o documento.',
    CPF_EM_USO: 'Já existe um usuário com este CPF nesta empresa.'
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
      let u = await API.call('eu');
      if(u.pendente && u.pendente.length) u = await API.completarCadastro(u);
      API.salvarSessao(API.token(), u);
      return u;
    },

    /* Pede CPF, função e registro que faltam no cadastro. Só segue depois de salvar. */
    completarCadastro(u){
      const esc = API.esc, reg = API.exigeRegistro(u.perfil);
      const m = document.createElement('div');
      m.className = 'modal'; m.setAttribute('role','dialog'); m.setAttribute('aria-modal','true'); m.setAttribute('aria-labelledby','ccTit');
      m.innerHTML = `<form class="card" novalidate>
        <h3 id="ccTit" style="margin:0">Complete seu cadastro</h3>
        <p class="hint" style="margin:0">Olá, ${esc(u.nome)}. Estes dados passam a preencher automaticamente os campos de responsável nos documentos (elaborador, liberador e encerramento). Você continua podendo alterar no documento quando for outra pessoa.</p>
        <div class="form-grid">
          <label class="fld c6"><span>CPF <b class="rq">*</b></span><input id="ccCpf" inputmode="numeric" maxlength="14" placeholder="000.000.000-00" value="${esc(u.cpf||'')}" autocomplete="off"></label>
          <label class="fld c6"><span>Função ou cargo <b class="rq">*</b></span><input id="ccFun" value="${esc(u.funcao||'')}" placeholder="Ex.: Técnico de Segurança do Trabalho"></label>
          ${reg?`<label class="fld c4"><span>Registro <b class="rq">*</b></span><select id="ccRt"><option value="MTE" ${u.reg_tipo!=='CREA'?'selected':''}>MTE (técnico)</option><option value="CREA" ${u.reg_tipo==='CREA'?'selected':''}>CREA (engenheiro)</option></select></label>
          <label class="fld c8"><span>Nº do registro <b class="rq">*</b></span><input id="ccRn" value="${esc(u.reg_num||'')}" placeholder="Ex.: SP/012345 ou 5061234567/SP"></label>`:''}
        </div>
        <div class="msg bad" id="ccErr" hidden></div>
        <div class="acts"><button type="button" class="btn ghost" id="ccSair">Sair</button><button type="submit" class="btn pri">Salvar e continuar</button></div>
      </form>`;
      document.body.appendChild(m);
      const q = id => m.querySelector('#'+id), err = t => { q('ccErr').textContent = t; q('ccErr').hidden = false; };
      q('ccCpf').addEventListener('input', e => { e.target.value = API.maskCPF(e.target.value); });
      q('ccSair').addEventListener('click', () => API.sair());
      setTimeout(() => q(u.cpf ? 'ccFun' : 'ccCpf').focus(), 50);
      return new Promise(res => {
        m.querySelector('form').addEventListener('submit', async e => {
          e.preventDefault(); q('ccErr').hidden = true;
          const cpf = q('ccCpf').value, fun = q('ccFun').value.trim();
          if(!API.cpfOk(cpf)) return err('Informe um CPF válido.');
          if(!fun) return err('Informe a função ou cargo.');
          if(reg && !q('ccRn').value.trim()) return err('Informe o número do registro profissional.');
          try {
            const nu = await API.call('completar_cadastro', { p_cpf: cpf, p_funcao: fun,
              p_reg_tipo: reg ? q('ccRt').value : null, p_reg_num: reg ? q('ccRn').value.trim() : null });
            m.remove(); API.toast('Cadastro completo.'); res(nu);
          } catch(x){ err(x.message); }
        });
      });
    },

    async sair(){
      try { await API.rpc('logout', { p_token: API.token() }); } catch(e){}
      API.limpar(); location.href = 'index.html';
    }
  };

  const PERFIS = { admin:'Administrador da plataforma', gestor:'Gestor', tecnico:'Técnico / Elaborador', liberador:'Liberador', consulta:'Consulta' };
  const PODE = {
    editar:    ['admin','gestor','tecnico'],
    liberar:   ['admin','gestor','tecnico','liberador'],
    encerrar:  ['admin','gestor','tecnico','liberador'],
    suspender: ['admin','gestor','tecnico','liberador'],
    usuarios:  ['admin','gestor'],
    clientes:  ['admin']
  };
  API.PERFIS = PERFIS;
  API.iniciais = n => { const p=String(n||'').trim().split(/\s+/).filter(w=>w.length>2||/^[A-ZÀ-Ú]/.test(w)); return ((p[0]||'?')[0]+(p.length>1?p[p.length-1][0]:'')).toUpperCase(); };
  API.exigeRegistro = p => ['admin','gestor','tecnico'].includes(p);
  API.maskCPF = v => { const d=String(v).replace(/\D/g,'').slice(0,11);
    return d.replace(/^(\d{3})(\d)/,'$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/,'$1.$2.$3').replace(/\.(\d{3})(\d{1,2})$/,'.$1-$2'); };
  API.cpfOk = v => { const d=String(v).replace(/\D/g,''); if(d.length!==11||/^(\d)\1+$/.test(d)) return false;
    for(let t=9;t<11;t++){ let s=0; for(let i=0;i<t;i++) s+=+d[i]*(t+1-i); if((s*10)%11%10!==+d[t]) return false; } return true; };
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
