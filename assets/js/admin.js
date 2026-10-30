/* APRFlow · administração: usuários, clientes e senha */
(async function(){
  const el = id => document.getElementById(id);
  const esc = API.esc;
  const pad = n => String(n).padStart(2,'0');
  const FMT_SP = new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const fmtDH = s => { if(!s) return '—'; const d=new Date(s); return isNaN(d) ? '—' : FMT_SP.format(d).replace(',', ''); };   /* horário de Brasília */

  /* CNPJ XX.XXX.XXX/XXXX-XX (aceita o formato alfanumérico) */
  function maskCNPJ(v){ let c=String(v).toUpperCase().replace(/[^0-9A-Z]/g,''); c=c.slice(0,12)+c.slice(12).replace(/\D/g,''); c=c.slice(0,14);
    const p=[c.slice(0,2),c.slice(2,5),c.slice(5,8),c.slice(8,12),c.slice(12,14)];
    let o=p[0]; if(p[1]) o+='.'+p[1]; if(p[2]) o+='.'+p[2]; if(p[3]) o+='/'+p[3]; if(p[4]) o+='-'+p[4]; return o; }
  function cnpjOk(v){ const c=String(v).toUpperCase().replace(/[^0-9A-Z]/g,''); if(!/^[0-9A-Z]{12}\d{2}$/.test(c)||/^(.)\1+$/.test(c)) return false;
    const val=ch=>ch.charCodeAt(0)-48, w1=[5,4,3,2,9,8,7,6,5,4,3,2], w2=[6,...w1];
    const dv=(n,w)=>{ const r=w.reduce((s,x,i)=>s+val(c[i])*x,0)%11; return r<2?0:11-r; };
    return dv(12,w1)===+c[12] && dv(13,w2)===+c[13]; }

  /* Endereço com busca de CEP (ViaCEP, com BrasilAPI de reserva) */
  const END_IDS = { cep:'cCep', log:'cLog', num:'cNum', comp:'cComp', bairro:'cBairro', cidade:'cCidade', uf:'cUf' };
  const maskCEP = v => String(v).replace(/\D/g,'').slice(0,8).replace(/^(\d{5})(\d)/,'$1-$2');
  const tx = v => (v==null?'':String(v)).trim();
  function lerEndereco(){ const e={}; for(const [k,id] of Object.entries(END_IDS)) e[k]=tx(el(id).value); e.uf=e.uf.toUpperCase(); return e; }
  function escreverEndereco(e){ e=e||{}; for(const [k,id] of Object.entries(END_IDS)) el(id).value = e[k] || ''; el('cCepSt').textContent='Digite o CEP para preencher o endereço, ou preencha à mão.'; }
  async function buscarCep(cep){
    const st=el('cCepSt'); st.textContent='Buscando CEP…';
    let d=null;
    try{ const r=await fetch(`https://viacep.com.br/ws/${cep}/json/`); if(r.ok){ const j=await r.json(); d=j.erro?false:{log:j.logradouro,bairro:j.bairro,cidade:j.localidade,uf:j.uf}; } }catch(e){}
    if(d==null){ try{ const r=await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`); if(r.ok){ const j=await r.json(); d={log:j.street,bairro:j.neighborhood,cidade:j.city,uf:j.state}; } else if(r.status===404) d=false; }catch(e){} }
    if(el('cCep').value.replace(/\D/g,'')!==cep) return;
    if(d){ if(d.log) el('cLog').value=d.log; if(d.bairro) el('cBairro').value=d.bairro; if(d.cidade) el('cCidade').value=d.cidade; if(d.uf) el('cUf').value=d.uf;
      st.textContent = d.log ? 'Endereço encontrado. Informe o número.' : 'CEP geral da cidade. Complete logradouro e bairro.'; el(d.log?'cNum':'cLog').focus(); }
    else if(d===false) st.textContent='CEP não encontrado. Preencha o endereço manualmente.';
    else st.textContent='Não foi possível consultar o CEP agora. Preencha o endereço manualmente.';
  }
  const cidadeUf = e => [tx(e&&e.cidade), tx(e&&e.uf)].filter(Boolean).join(' - ');

  let U;
  try { U = await API.exigirLogin(); } catch(e){ document.querySelector('main').innerHTML = `<div class="msg bad">${esc(e.message)}</div>`; return; }
  if(!U) return;
  el('whoNome').textContent = U.nome;
  el('whoInfo').textContent = API.PERFIS[U.perfil] + (U.cliente_nome ? ' · ' + U.cliente_nome : '');
  el('bSair').addEventListener('click', () => API.sair());
  el('whoIni').textContent = API.iniciais(U.nome);

  const podeUsuarios = API.pode(U, 'usuarios'), podeClientes = API.pode(U, 'clientes');
  if(!podeUsuarios) el('lnkAdminT').textContent = 'Minha conta';
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
  function ajustarCliente(){
    el('uClienteF').hidden = U.perfil !== 'admin' || el('uPerfil').value === 'admin';
    const reg = API.exigeRegistro(el('uPerfil').value); el('uRtF').hidden = !reg; el('uRnF').hidden = !reg;
  }
  el('uCpf').addEventListener('input', () => { const v = API.maskCPF(el('uCpf').value); el('uCpf').value = v; const bad = v.length >= 14 && !API.cpfOk(v); el('uCpf').classList.toggle('invalid', bad); el('uCpfErr').hidden = !bad; });
  el('uPerfil').addEventListener('change', ajustarCliente);

  function limparUsuario(){
    el('uId').value=''; el('uNome').value=''; el('uEmail').value=''; el('uSenha').value='';
    el('uCpf').value=''; el('uFuncao').value=''; el('uRegTipo').value='MTE'; el('uRegNum').value=''; el('uCpf').classList.remove('invalid'); el('uCpfErr').hidden=true;
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
        ${usuarios.map(x => `<tr data-id="${x.id}" tabindex="0"><td><b>${esc(x.nome)}</b><div class="muted">${esc(x.email)}${x.funcao?' · '+esc(x.funcao):''}</div>${x.pendente&&x.pendente.length?'<div class="muted" style="color:var(--warn)">Cadastro incompleto: '+esc(x.pendente.map(k=>({cpf:'CPF',funcao:'função',registro:'registro'}[k])).join(', '))+'</div>':''}</td>
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
    el('uCpf').value=x.cpf||''; el('uFuncao').value=x.funcao||''; el('uRegTipo').value=x.reg_tipo==='CREA'?'CREA':'MTE'; el('uRegNum').value=x.reg_num||'';
    el('uCpf').classList.remove('invalid'); el('uCpfErr').hidden=true;
    el('uTitulo').textContent='Editar usuário'; el('uSenhaL').textContent='Nova senha (deixe em branco para manter)'; el('uErro').hidden=true;
    ajustarCliente(); el('uNome').focus();
  });
  el('uNovo').addEventListener('click', () => { limparUsuario(); el('uNome').focus(); });
  el('uLimpar').addEventListener('click', limparUsuario);
  el('fUsuario').addEventListener('submit', async e => {
    e.preventDefault(); el('uErro').hidden = true;
    const erro = t => { el('uErro').textContent = t; el('uErro').hidden = false; };
    const reg = API.exigeRegistro(el('uPerfil').value);
    if(!API.cpfOk(el('uCpf').value)) return erro('Informe um CPF válido.');
    if(!el('uFuncao').value.trim()) return erro('Informe a função ou cargo.');
    if(reg && !el('uRegNum').value.trim()) return erro('Informe o número do registro profissional (MTE ou CREA).');
    try {
      await API.call('salvar_usuario', {
        p_cpf: el('uCpf').value, p_funcao: el('uFuncao').value.trim(),
        p_reg_tipo: reg ? el('uRegTipo').value : null, p_reg_num: reg ? el('uRegNum').value.trim() : null,
        p_id: el('uId').value || null, p_nome: el('uNome').value, p_email: el('uEmail').value,
        p_perfil: el('uPerfil').value, p_cliente_id: U.perfil==='admin' ? (el('uCliente').value || null) : null,
        p_ativo: el('uAtivo').checked, p_senha: el('uSenha').value || null });
      API.toast('Usuário salvo.'); el('uId').value=''; carregarUsuarios();
    } catch(err){ el('uErro').textContent = err.message; el('uErro').hidden = false; }
  });

  /* ---------- Clientes ---------- */
  let listaClientes = [];
  function limparCliente(){ el('cId').value=''; el('cNome').value=''; el('cCnpj').value=''; el('cAtivo').checked=true; el('cErro').hidden=true; el('cCnpjErr').hidden=true; el('cTitulo').textContent='Novo cliente'; escreverEndereco({}); }
  el('cCep').addEventListener('input', () => { const v=maskCEP(el('cCep').value); el('cCep').value=v; const d=v.replace(/\D/g,''); if(d.length===8) buscarCep(d); });
  async function carregarClientes(){
    try {
      listaClientes = await API.call('listar_clientes');
      el('cLista').innerHTML = listaClientes.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Cliente</th><th>Usuários</th><th>Documentos</th><th>Situação</th></tr></thead><tbody>
        ${listaClientes.map(c => `<tr data-id="${c.id}" tabindex="0"><td><b>${esc(c.nome)}</b><div class="muted">${esc(c.cnpj||'Sem CNPJ')}${cidadeUf(c.endereco)?' · '+esc(cidadeUf(c.endereco)):''}</div></td>
          <td>${c.usuarios}</td><td>${c.documentos}</td><td><span class="st ${c.ativo?'liberada':'cancelada'}">${c.ativo?'Ativo':'Inativo'}</span></td></tr>`).join('')}
        </tbody></table></div>` : '<div class="empty">Nenhum cliente cadastrado. Cadastre o primeiro ao lado.</div>';
    } catch(e){ el('cLista').innerHTML = `<div class="msg bad">${esc(e.message)}</div>`; }
  }
  el('cLista').addEventListener('click', e => {
    const tr = e.target.closest('tr[data-id]'); if(!tr) return;
    const c = listaClientes.find(x => x.id === tr.dataset.id); if(!c) return;
    el('cId').value=c.id; el('cNome').value=c.nome; el('cCnpj').value=c.cnpj||''; el('cAtivo').checked=c.ativo; escreverEndereco(c.endereco);
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
      await API.call('salvar_cliente', { p_id: el('cId').value || null, p_nome: el('cNome').value, p_cnpj: cnpj, p_ativo: el('cAtivo').checked, p_endereco: lerEndereco() });
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
