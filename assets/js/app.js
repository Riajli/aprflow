/* APRFlow · lista de documentos e navegação */
(async function(){
  const el = id => document.getElementById(id);
  const esc = API.esc;
  const ST = { '':'Todos', rascunho:'Rascunho', liberada:'Liberada', suspensa:'Suspensa', encerrada:'Encerrada', cancelada:'Cancelada' };
  const pad = n => String(n).padStart(2,'0');
  const fmtDH = s => { if(!s) return '—'; const d=new Date(s); return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };

  let U;
  try { U = await API.exigirLogin(); }
  catch(e){ el('lista').innerHTML = `<div class="msg bad">${esc(e.message)}</div>`; return; }
  if(!U) return;

  el('whoNome').textContent = U.nome;
  el('whoInfo').textContent = API.PERFIS[U.perfil] + (U.cliente_nome ? ' · ' + U.cliente_nome : '');
  if(!API.pode(U, 'usuarios')){ el('lnkAdmin').textContent = 'Minha senha'; el('lnkAdmin').href = 'admin.html#senha'; }
  el('bNovo').hidden = !API.pode(U, 'editar');
  el('bDuplicar').hidden = !API.pode(U, 'editar');
  el('bSair').addEventListener('click', async () => { if(Editor.temPendente()) await Editor.salvarAgora(); API.sair(); });

  /* ---------- Lista ---------- */
  let filtro = '', busca = '', tBusca = null;
  el('filtros').innerHTML = Object.entries(ST).map(([k,v]) => `<button type="button" data-f="${k}" aria-pressed="${k===''}">${v}</button>`).join('');
  el('filtros').addEventListener('click', e => {
    const b = e.target.closest('[data-f]'); if(!b) return;
    filtro = b.dataset.f;
    el('filtros').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    carregar();
  });
  el('busca').addEventListener('input', () => { clearTimeout(tBusca); tBusca = setTimeout(() => { busca = el('busca').value; carregar(); }, 350); });

  const vis = d => d.status === 'liberada' && d.validade_fim && new Date(d.validade_fim) < new Date() ? 'vencida' : d.status;
  const stLabel = s => ({...ST, vencida:'Vencida'})[s] || s;

  async function carregar(){
    try {
      const docs = await API.call('listar_documentos', { p_status: filtro || null, p_busca: busca || null });
      if(!docs.length){
        el('lista').innerHTML = `<div class="empty">${filtro || busca ? 'Nenhum documento encontrado com esses filtros.' : API.pode(U,'editar') ? 'Nenhum documento ainda. Use “+ Nova APR / PT” para criar o primeiro.' : 'Nenhum documento ainda.'}</div>`;
        return;
      }
      const admin = U.perfil === 'admin';
      el('lista').innerHTML = `<div class="tbl-wrap"><table class="tbl"><thead><tr>
        <th>Número</th><th>Serviço</th><th>Local</th>${admin ? '<th>Cliente</th>' : ''}<th>Situação</th><th>Atualizado</th></tr></thead><tbody>
        ${docs.map(d => { const s = vis(d); return `<tr data-id="${d.id}" tabindex="0">
          <td class="num">${esc(d.numero)}</td>
          <td class="c-serv"><div class="clip">${esc(d.servico || 'Sem descrição')}</div></td>
          <td class="c-local muted">${esc(d.local || '')}</td>
          ${admin ? `<td class="c-cli muted">${esc(d.cliente_nome)}</td>` : ''}
          <td><span class="st ${s}">${stLabel(s)}</span></td>
          <td class="c-dt muted">${fmtDH(d.atualizado_em)}</td></tr>`; }).join('')}
        </tbody></table></div>`;
    } catch(e){
      el('lista').innerHTML = `<div class="msg bad">${esc(e.message)}</div>`;
    }
  }
  el('lista').addEventListener('click', e => { const tr = e.target.closest('tr[data-id]'); if(tr) location.hash = `#/doc/${tr.dataset.id}`; });
  el('lista').addEventListener('keydown', e => { const tr = e.target.closest('tr[data-id]'); if(tr && e.key === 'Enter') location.hash = `#/doc/${tr.dataset.id}`; });

  /* ---------- Novo documento ---------- */
  async function criar(clienteId){
    try {
      const r = await API.call('criar_documento', { p_cliente_id: clienteId || null });
      API.toast(`Documento ${r.numero} criado.`);
      location.hash = `#/doc/${r.id}`;
    } catch(e){ API.toast(e.message, 'bad'); }
  }
  el('bNovo').addEventListener('click', async () => {
    if(U.perfil !== 'admin') return criar(null);
    try {
      const cl = (await API.call('listar_clientes')).filter(c => c.ativo);
      if(!cl.length){ API.toast('Cadastre um cliente em Administração antes de criar documentos.', 'bad'); return; }
      el('novoCliente').innerHTML = cl.map(c => `<option value="${c.id}">${esc(c.nome)}</option>`).join('');
      el('novoDlg').hidden = false;
    } catch(e){ API.toast(e.message, 'bad'); }
  });
  el('novoCancelar').addEventListener('click', () => { el('novoDlg').hidden = true; });
  el('fNovo').addEventListener('submit', e => { e.preventDefault(); el('novoDlg').hidden = true; criar(el('novoCliente').value); });

  /* ---------- Navegação ---------- */
  Editor.onVoltar = () => { location.hash = ''; };
  async function rota(){
    const m = location.hash.match(/^#\/doc\/([0-9a-f-]{36})(?:\/(\w+))?/);
    if(m){
      el('vList').hidden = true; el('vEdit').hidden = false;
      try { const d = await Editor.abrir(m[1], U, m[2]); document.title = `${d.numero} · APRFlow`; }
      catch(e){ API.toast(e.message, 'bad'); location.hash = ''; }
    } else {
      if(Editor.temPendente()) await Editor.salvarAgora();
      Editor.fechar();
      el('vEdit').hidden = true; el('vList').hidden = false; document.title = 'APRFlow · Documentos';
      carregar();
    }
  }
  window.addEventListener('hashchange', rota);
  rota();
})();
