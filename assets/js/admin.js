/* APRFlow · administração: usuários, clientes e senha */
(async function(){
  const el = id => document.getElementById(id);
  const esc = API.esc;
  const pad = n => String(n).padStart(2,'0');
  const fmtDH = s => { if(!s) return '—'; const d=new Date(s); return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };

  /* CNPJ XX.XXX.XXX/XXXX-XX (aceita o formato alfanumérico) */
  function maskCNPJ(v){ let c=String(v).toUpperCase().replace(/[^0-9A-Z]/g,''); c=c.slice(0,12)+c.slice(12).replace(/\D/g,''); c=c.slice(0,14);
    const p=[c.slice(0,2),c.slice(2,5),c.slice(5,8),c.slice(8,12),c.slice(12,14)];
    let o=p[0]; if(p[1]) o+='.'+p[1]; if(p[2]) o+='.'+p[2]; if(p[3]) o+='/'+p[3]; if(p[4]) o+='-'+p[4]; return o; }
  function cnpjOk(v){ const c=String(v).toUpperCase().replace(/[^0-9A-Z]/g,''); if(!/^[0-9A-Z]{12}\d{2}$/.test(c)||/^(.)\1+$/.test(c)) return false;
    const val=ch=>ch.charCodeAt(0)-48, w1=[5,4,3,2,9,8,7,6,5,4,3,2], w2=[6,...w1];
    const dv=(n,w)=>{ const r=w.reduce((s,x,i)=>s+val(c[i])*x,0)%11; return r<2?0:11-r; };
    return dv(12,w1)===+c[12] && dv(13,w2)===+c[13]; }

  let U;
  try { U = await API.exigirLogin(); } catch(e){ document.querySelector('main').innerHTML = `<div class="msg bad">${esc(e.message)}</div>`; return; }
  if(!U) return;
  el('whoNome').textContent = U.nome;
  el('whoInfo').textContent = API.PERFIS[U.perfil] + (U.cliente_nome ? ' · ' + U.cliente_nome : '');
  el('bSair').addEventListener('click', () => API.sair());

  const podeUsuarios = API.pode(U, 'usuarios'), podeClientes = API.pode(U, 'clientes');
  el('tUsuarios').hidden = !podeUsuarios;
  el('tClientes').hidden = !podeClientes;

  /* ---------- Seções ---------- */
  const SEC = { usuarios:'sUsuarios', clientes:'sClientes', senha:'sSenha' };
  function mostrar(sec){
    if(sec === 'usuarios' && !podeUsuarios) sec = 'senha';
    if(sec === 'clientes' && !podeClientes) sec = podeUsuarios ? 'usuarios' : 'senha';
    Object.entries(SEC).forEach(([k,id]) => { el(id).hidden = k !== sec; });
    el('admTabs').querySelectorAll('[data-sec]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.sec === sec)));
    if(sec === 'usuarios') carregarUsuarios();
    if(sec === 'clientes') carregarClientes();
  }
  el('admTabs').addEventListener('click', e => { const b = e.target.closest('[data-sec]'); if(b){ history.replaceState(null,'','#'+b.dataset.sec); mostrar(b.dataset.sec); } });

  /* ---------- Usuários ---------- */
  let clientes = [];
  const perfisPermitidos = U.perfil === 'admin' ? Object.keys(API.PERFIS) : Object.keys(API.PERFIS).filter(p => p !== 'admin');
  el('uPerfil').innerHTML = perfisPermitidos.map(p => `<option value="${p}">${API.PERFIS[p]}</option>`).join('');
  el('perfisAjuda').innerHTML = `<b>Perfis:</b> Gestor cadastra usuários e faz tudo na empresa · Técnico elabora a APR · Liberador preenche e libera a PT · Consulta só visualiza.${U.perfil==='admin'?' Administrador da plataforma vê todas as empresas.':''}`;
  function ajustarCliente(){ el('uClienteF').hidden = U.perfil !== 'admin' || el('uPerfil').value === 'admin'; }
  el('uPerfil').addEventListener('change', ajustarCliente);

  function limparUsuario(){
    el('uId').value=''; el('uNome').value=''; el('uEmail').value=''; el('uSenha').value='';
    el('uPerfil').value='tecnico'; el('uAtivo').checked=true; el('uErro').hidden=true;
    el('uTitulo').textContent='Novo usuário'; el('uSenhaL').innerHTML='Senha inicial <b class="rq">*</b>';
    if(clientes.length) el('uCliente').value = clientes[0].id;
    ajustarCliente();
  }
  let usuarios = [];
  async function carregarUsuarios(){
    try {
      if(U.perfil === 'admin'){
        clientes = (await API.call('listar_clientes'));
        el('uCliente').innerHTML = clientes.map(c => `<option value="${c.id}">${esc(c.nome)}${c.ativo?'':' (inativo)'}</option>`).join('');
      }
      usuarios = await API.call('listar_usuarios');
      el('uLista').innerHTML = usuarios.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nome</th><th>Perfil</th>${U.perfil==='admin'?'<th>Cliente</th>':''}<th>Situação</th><th>Último acesso</th></tr></thead><tbody>
        ${usuarios.map(x => `<tr data-id="${x.id}" tabindex="0"><td><b>${esc(x.nome)}</b><div class="muted">${esc(x.email)}</div></td>
          <td><span class="pill-perfil">${API.PERFIS[x.perfil]}</span></td>${U.perfil==='admin'?`<td class="muted">${esc(x.cliente_nome||'—')}</td>`:''}
          <td><span class="st ${x.ativo?'liberada':'cancelada'}">${x.ativo?'Ativo':'Inativo'}</span></td><td class="muted">${fmtDH(x.ultimo_acesso)}</td></tr>`).join('')}
        </tbody></table></div>` : '<div class="empty">Nenhum usuário cadastrado.</div>';
      if(!el('uId').value) limparUsuario();
    } catch(e){ el('uLista').innerHTML = `<div class="msg bad">${esc(e.message)}</div>`; }
  }
  el('uLista').addEventListener('click', e => {
    const tr = e.target.closest('tr[data-id]'); if(!tr) return;
    const x = usuarios.find(u => u.id === tr.dataset.id); if(!x) return;
    el('uId').value=x.id; el('uNome').value=x.nome; el('uEmail').value=x.email; el('uSenha').value='';
    if(!perfisPermitidos.includes(x.perfil)){ API.toast('Este usuário só pode ser alterado pelo administrador da plataforma.','bad'); return; }
    el('uPerfil').value=x.perfil; el('uAtivo').checked=x.ativo; if(x.cliente_id) el('uCliente').value=x.cliente_id;
    el('uTitulo').textContent='Editar usuário'; el('uSenhaL').textContent='Nova senha (deixe em branco para manter)'; el('uErro').hidden=true;
    ajustarCliente(); el('uNome').focus();
  });
  el('uNovo').addEventListener('click', () => { limparUsuario(); el('uNome').focus(); });
  el('uLimpar').addEventListener('click', limparUsuario);
  el('fUsuario').addEventListener('submit', async e => {
    e.preventDefault(); el('uErro').hidden = true;
    try {
      await API.call('salvar_usuario', {
        p_id: el('uId').value || null, p_nome: el('uNome').value, p_email: el('uEmail').value,
        p_perfil: el('uPerfil').value, p_cliente_id: U.perfil==='admin' ? (el('uCliente').value || null) : null,
        p_ativo: el('uAtivo').checked, p_senha: el('uSenha').value || null });
      API.toast('Usuário salvo.'); el('uId').value=''; carregarUsuarios();
    } catch(err){ el('uErro').textContent = err.message; el('uErro').hidden = false; }
  });

  /* ---------- Clientes ---------- */
  let listaClientes = [];
  function limparCliente(){ el('cId').value=''; el('cNome').value=''; el('cCnpj').value=''; el('cAtivo').checked=true; el('cErro').hidden=true; el('cCnpjErr').hidden=true; el('cTitulo').textContent='Novo cliente'; }
  async function carregarClientes(){
    try {
      listaClientes = await API.call('listar_clientes');
      el('cLista').innerHTML = listaClientes.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Cliente</th><th>Usuários</th><th>Documentos</th><th>Situação</th></tr></thead><tbody>
        ${listaClientes.map(c => `<tr data-id="${c.id}" tabindex="0"><td><b>${esc(c.nome)}</b><div class="muted">${esc(c.cnpj||'Sem CNPJ')}</div></td>
          <td>${c.usuarios}</td><td>${c.documentos}</td><td><span class="st ${c.ativo?'liberada':'cancelada'}">${c.ativo?'Ativo':'Inativo'}</span></td></tr>`).join('')}
        </tbody></table></div>` : '<div class="empty">Nenhum cliente cadastrado. Cadastre o primeiro ao lado.</div>';
    } catch(e){ el('cLista').innerHTML = `<div class="msg bad">${esc(e.message)}</div>`; }
  }
  el('cLista').addEventListener('click', e => {
    const tr = e.target.closest('tr[data-id]'); if(!tr) return;
    const c = listaClientes.find(x => x.id === tr.dataset.id); if(!c) return;
    el('cId').value=c.id; el('cNome').value=c.nome; el('cCnpj').value=c.cnpj||''; el('cAtivo').checked=c.ativo;
    el('cTitulo').textContent='Editar cliente'; el('cErro').hidden=true; el('cNome').focus();
  });
  el('cCnpj').addEventListener('input', () => { const v = maskCNPJ(el('cCnpj').value); el('cCnpj').value = v; const bad = v.length >= 18 && !cnpjOk(v); el('cCnpj').classList.toggle('invalid', bad); el('cCnpjErr').hidden = !bad; });
  el('cNovo').addEventListener('click', () => { limparCliente(); el('cNome').focus(); });
  el('cLimpar').addEventListener('click', limparCliente);
  el('fCliente').addEventListener('submit', async e => {
    e.preventDefault(); el('cErro').hidden = true;
    const cnpj = el('cCnpj').value.trim();
    if(cnpj && !cnpjOk(cnpj)){ el('cErro').textContent = 'CNPJ inválido. Confira os números.'; el('cErro').hidden = false; return; }
    try {
      await API.call('salvar_cliente', { p_id: el('cId').value || null, p_nome: el('cNome').value, p_cnpj: cnpj, p_ativo: el('cAtivo').checked });
      API.toast('Cliente salvo.'); limparCliente(); carregarClientes();
    } catch(err){ el('cErro').textContent = err.message; el('cErro').hidden = false; }
  });

  /* ---------- Minha senha ---------- */
  el('fSenha').addEventListener('submit', async e => {
    e.preventDefault(); el('sErro').hidden = true;
    if(el('sNova').value !== el('sNova2').value){ el('sErro').textContent = 'As duas novas senhas não são iguais.'; el('sErro').hidden = false; return; }
    try {
      await API.call('alterar_minha_senha', { p_atual: el('sAtual').value, p_nova: el('sNova').value });
      el('fSenha').reset(); API.toast('Senha alterada.');
    } catch(err){ el('sErro').textContent = err.message; el('sErro').hidden = false; }
  });

  mostrar((location.hash || '#usuarios').slice(1));
})();
