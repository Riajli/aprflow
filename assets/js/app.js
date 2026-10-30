/* APRFlow · lista de documentos e navegação */
(async function(){
  const el = id => document.getElementById(id);
  const esc = API.esc;
  const ST = { '':'Todos', rascunho:'Rascunho', liberada:'Liberada', suspensa:'Suspensa', encerrada:'Encerrada', cancelada:'Cancelada' };
  const pad = n => String(n).padStart(2,'0');
  const FMT_SP = new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const fmtDH = s => { if(!s) return '—'; const d=new Date(s); return isNaN(d) ? '—' : FMT_SP.format(d).replace(',', ''); };   /* horário de Brasília */

  let U;
  try { U = await API.exigirLogin(); }
  catch(e){ el('lista').innerHTML = `<div class="msg bad">${esc(e.message)}</div>`; return; }
  if(!U) return;

  el('whoNome').textContent = U.nome;
  el('whoInfo').textContent = API.PERFIS[U.perfil] + (U.cliente_nome ? ' · ' + U.cliente_nome : '');
  if(!API.pode(U, 'usuarios')){ el('lnkAdminT').textContent = 'Minha conta'; el('lnkAdmin').href = 'admin.html#senha'; }
  el('whoIni').textContent = API.iniciais(U.nome);
  el('bNovo').hidden = !API.pode(U, 'editar');
  el('bDuplicar').hidden = !API.pode(U, 'editar');
  el('bSair').addEventListener('click', async () => { if(Editor.temPendente()) await Editor.salvarAgora(); API.sair(); });

  /* ---------- Lista ---------- */
  let filtro = '', busca = '', tBusca = null, lixeira = false, docs = [];
  const sel = new Set();
  const podeLixeira = ['admin','gestor'].includes(U.perfil);
  el('bLixeira').hidden = !podeLixeira;
  el('filtros').innerHTML = Object.entries(ST).map(([k,v]) => `<button type="button" data-f="${k}" aria-pressed="${k===''}">${v}</button>`).join('');
  el('filtros').addEventListener('click', e => {
    const b = e.target.closest('[data-f]'); if(!b) return;
    filtro = b.dataset.f;
    el('filtros').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    carregar();
  });
  el('busca').addEventListener('input', () => { clearTimeout(tBusca); tBusca = setTimeout(() => { busca = el('busca').value; carregar(); }, 350); });
  el('bLixeira').addEventListener('click', () => {
    lixeira = !lixeira; sel.clear();
    el('bLixeira').setAttribute('aria-pressed', String(lixeira));
    el('bLixeira').textContent = lixeira ? '← Voltar aos documentos' : 'Lixeira';
    el('lixInfo').hidden = !lixeira; el('bNovo').hidden = lixeira || !API.pode(U, 'editar');
    carregar();
  });

  const vis = d => d.status === 'liberada' && d.validade_fim && new Date(d.validade_fim) < new Date() ? 'vencida' : d.status;
  const stLabel = s => ({...ST, vencida:'Vencida'})[s] || s;
  const IC = {
    pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 11v6M9.5 14.5 12 17l2.5-2.5"/></svg>',
    lixo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    volta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>'
  };
  /* Quem pode enviar cada documento para a lixeira */
  const podeApagar = d => (['rascunho','cancelada'].includes(d.status) && U.perfil !== 'consulta' && (['admin','gestor'].includes(U.perfil) || d.criado_por === U.id)) || (d.status === 'encerrada' && U.perfil === 'admin');
  const podeApagarJa = d => d.status === 'rascunho' && !d.elab_assinado;   /* rascunho sem a assinatura do elaborador */
  const podeRestaurar = d => ['admin','gestor'].includes(U.perfil) && (d.status !== 'encerrada' || U.perfil === 'admin');
  const diasRestantes = d => Math.max(0, Math.ceil((new Date(d.apagar_em) - new Date()) / 864e5));

  function atualizarSelecao(){
    const n = sel.size;
    el('selbar').hidden = n === 0 || lixeira;
    el('selInfo').textContent = n === 1 ? '1 documento selecionado' : `${n} documentos selecionados`;
    const todos = el('lista').querySelector('#selTodos');
    if(todos){ const vis = docs.length; todos.checked = vis > 0 && docs.every(d => sel.has(d.id)); todos.indeterminate = n > 0 && !todos.checked; }
  }

  async function carregar(){
    try {
      docs = await API.call('listar_documentos', { p_status: filtro || null, p_busca: busca || null, p_lixeira: lixeira });
      [...sel].forEach(id => { if(!docs.some(d => d.id === id)) sel.delete(id); });
      if(!docs.length){
        el('lista').innerHTML = `<div class="empty">${lixeira ? 'A lixeira está vazia.' : filtro || busca ? 'Nenhum documento encontrado com esses filtros.' : API.pode(U,'editar') ? 'Nenhum documento ainda. Use “+ Nova APR / PT” para criar o primeiro.' : 'Nenhum documento ainda.'}</div>`;
        atualizarSelecao(); return;
      }
      const admin = U.perfil === 'admin';
      el('lista').innerHTML = `<div class="tbl-wrap"><table class="tbl"><thead><tr>
        ${lixeira ? '' : '<th class="c-sel"><input type="checkbox" id="selTodos" aria-label="Selecionar todos os documentos da lista"></th>'}
        <th>Número</th><th>Serviço</th><th>Local</th>${admin ? '<th>Cliente</th>' : ''}<th>Situação</th><th>${lixeira ? 'Na lixeira' : 'Atualizado'}</th><th class="c-acts"><span class="sr">Ações</span></th></tr></thead><tbody>
        ${docs.map(d => { const s = vis(d); return `<tr data-id="${d.id}" tabindex="0">
          ${lixeira ? '' : `<td class="c-sel"><input type="checkbox" data-sel="${d.id}" ${sel.has(d.id)?'checked':''} aria-label="Selecionar ${esc(d.numero)}"></td>`}
          <td class="num">${esc(d.numero)}</td>
          <td class="c-serv"><div class="clip">${esc(d.servico || 'Sem descrição')}</div></td>
          <td class="c-local muted">${esc(d.local || '')}</td>
          ${admin ? `<td class="c-cli muted">${esc(d.cliente_nome)}</td>` : ''}
          <td><span class="st ${s}">${stLabel(s)}</span>${s === 'rascunho' && d.elab_assinado && !lixeira ? '<br><span class="st-tag" title="APR concluída e assinada pelo elaborador">Pronto para liberar</span>' : ''}</td>
          <td class="c-dt muted">${lixeira ? `${fmtDH(d.excluido_em)}<br>Apagado de vez em ${diasRestantes(d)} dia(s)` : fmtDH(d.atualizado_em)}</td>
          <td class="c-acts">${lixeira
            ? (podeRestaurar(d) ? `<button class="ibtn" data-rest="${d.id}" title="Restaurar" aria-label="Restaurar ${esc(d.numero)}">${IC.volta}</button>` : '')
            : `<button class="ibtn" data-pdf="${d.id}" title="Baixar PDF" aria-label="Baixar PDF de ${esc(d.numero)}">${IC.pdf}</button>${podeApagar(d) ? `<button class="ibtn del" data-del="${d.id}" title="Enviar para a lixeira" aria-label="Enviar ${esc(d.numero)} para a lixeira">${IC.lixo}</button>` : ''}`}</td></tr>`; }).join('')}
        </tbody></table></div>`;
      atualizarSelecao();
    } catch(e){
      el('lista').innerHTML = `<div class="msg bad">${esc(e.message)}</div>`;
    }
  }

  el('lista').addEventListener('click', async e => {
    const t = e.target;
    if(t.id === 'selTodos'){ docs.forEach(d => t.checked ? sel.add(d.id) : sel.delete(d.id)); el('lista').querySelectorAll('[data-sel]').forEach(c => c.checked = t.checked); atualizarSelecao(); return; }
    if(t.dataset && t.dataset.sel){ t.checked ? sel.add(t.dataset.sel) : sel.delete(t.dataset.sel); atualizarSelecao(); return; }
    if(t.closest('.c-sel')) return;
    const bPdf = t.closest('[data-pdf]'), bDel = t.closest('[data-del]'), bRest = t.closest('[data-rest]');
    if(bPdf) return baixarUm(bPdf.dataset.pdf, bPdf);
    if(bDel) return abrirExclusao(docs.find(d => d.id === bDel.dataset.del));
    if(bRest) return restaurar(docs.find(d => d.id === bRest.dataset.rest));
    const tr = t.closest('tr[data-id]');
    if(tr){ if(lixeira){ API.toast('Restaure o documento para abri-lo.'); return; } location.hash = `#/doc/${tr.dataset.id}`; }
  });
  el('lista').addEventListener('keydown', e => { if(e.target.matches('input,button')) return; const tr = e.target.closest('tr[data-id]'); if(tr && e.key === 'Enter' && !lixeira) location.hash = `#/doc/${tr.dataset.id}`; });

  /* ---------- PDF ---------- */
  function baixarBlob(blob, nome){
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  async function baixarUm(id, btn){
    if(btn) btn.disabled = true;
    try {
      const doc = await API.call('obter_documento', { p_id: id });
      const pdf = await APRPDF.gerarDeDoc(doc);
      baixarBlob(pdf.output('blob'), APRPDF.nomeArquivo(doc));
    } catch(e){ API.toast(e.message || 'Não foi possível gerar o PDF.', 'bad'); }
    finally { if(btn) btn.disabled = false; }
  }
  el('bLimparSel').addEventListener('click', () => { sel.clear(); el('lista').querySelectorAll('[data-sel]').forEach(c => c.checked = false); atualizarSelecao(); });
  el('bZip').addEventListener('click', async () => {
    if(!window.JSZip){ API.toast('Compactador indisponível. Verifique a conexão e recarregue a página.', 'bad'); return; }
    const ids = docs.filter(d => sel.has(d.id)).map(d => d.id);
    if(!ids.length) return;
    const b = el('bZip'); b.disabled = true;
    const zip = new JSZip(), falhas = [];
    try {
      for(let i = 0; i < ids.length; i++){
        b.textContent = `Gerando ${i + 1} de ${ids.length}…`;
        try {
          const doc = await API.call('obter_documento', { p_id: ids[i] });
          const pdf = await APRPDF.gerarDeDoc(doc);
          zip.file(APRPDF.nomeArquivo(doc), pdf.output('arraybuffer'));
        } catch(e){ falhas.push((docs.find(d => d.id === ids[i]) || {}).numero || ids[i]); }
      }
      if(Object.keys(zip.files).length){
        b.textContent = 'Compactando…';
        const blob = await zip.generateAsync({ type:'blob', compression:'DEFLATE' });
        const d = new Date(), stamp = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
        baixarBlob(blob, `APRFlow_documentos_${stamp}.zip`);
      }
      if(falhas.length) API.toast(`Não foi possível gerar: ${falhas.join(', ')}.`, 'bad');
      else API.toast(ids.length === 1 ? 'PDF baixado em ZIP.' : `${ids.length} PDFs baixados em ZIP.`);
    } finally { b.disabled = false; b.textContent = 'Baixar selecionados (ZIP)'; }
  });

  /* ---------- Lixeira ---------- */
  let excluindo = null, definitivo = false;
  function textoExclusao(){
    const d = excluindo, enc = d.status === 'encerrada';
    el('delT').textContent = definitivo ? `Apagar ${d.numero} definitivamente?` : `Enviar ${d.numero} para a lixeira?`;
    el('delTxt').textContent = definitivo
      ? 'O rascunho é apagado agora, sem passar pela lixeira. Não é possível desfazer.'
      : enc
      ? 'Esta PT está encerrada e é um registro de que o trabalho foi autorizado. Ela ficará na lixeira por 30 dias e depois será apagada de vez.'
      : 'O documento sai da lista e fica na lixeira por 30 dias. Nesse prazo, pode ser restaurado. Depois, é apagado de vez.';
    el('delOk').textContent = definitivo ? 'Apagar definitivamente' : 'Enviar para a lixeira';
    el('delOk').className = definitivo ? 'btn bad' : 'btn warn';
    el('delJa').hidden = definitivo || !podeApagarJa(d);
    el('delJaTxt').hidden = definitivo || !podeApagarJa(d);
  }
  function abrirExclusao(d){
    if(!d) return;
    excluindo = d; definitivo = false;
    const enc = d.status === 'encerrada';
    textoExclusao();
    el('delConfF').hidden = !enc; el('delConf').value = ''; el('delConfL').textContent = `Digite ${d.numero} para confirmar`;
    el('delErro').hidden = true; el('delDlg').hidden = false;
    (enc ? el('delConf') : el('delOk')).focus();
  }
  el('delJa').addEventListener('click', () => { definitivo = true; el('delErro').hidden = true; textoExclusao(); el('delOk').focus(); });
  el('delCancelar').addEventListener('click', () => { el('delDlg').hidden = true; excluindo = null; });
  el('fDel').addEventListener('submit', async e => {
    e.preventDefault(); if(!excluindo) return;
    el('delErro').hidden = true;
    if(excluindo.status === 'encerrada' && el('delConf').value.trim().toUpperCase() !== excluindo.numero.toUpperCase()){
      el('delErro').textContent = 'O número digitado não confere com o documento.'; el('delErro').hidden = false; return;
    }
    try {
      await API.call('excluir_documento', { p_id: excluindo.id, p_confirmacao: el('delConf').value || null, p_definitivo: definitivo });
      el('delDlg').hidden = true; sel.delete(excluindo.id);
      API.toast(definitivo ? `${excluindo.numero} apagado definitivamente.` : `${excluindo.numero} enviado para a lixeira. Pode ser restaurado por 30 dias.`);
      excluindo = null; definitivo = false; carregar();
    } catch(err){ el('delErro').textContent = err.message; el('delErro').hidden = false; }
  });
  async function restaurar(d){
    if(!d) return;
    try { await API.call('restaurar_documento', { p_id: d.id }); API.toast(`${d.numero} restaurado.`); carregar(); }
    catch(e){ API.toast(e.message, 'bad'); }
  }
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && !el('delDlg').hidden){ el('delDlg').hidden = true; excluindo = null; } });

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
