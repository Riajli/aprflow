/* APRFlow · geração do PDF do documento (texto selecionável)
   Usa jsPDF + jspdf-autotable. Depende das listas e regras de editor.js. */
(function(){
  const MM = { L: 12, R: 12, TOP2: 19, BOT: 15 };          /* margens (mm) */
  const COR = { borda:[154,165,162], cab:[227,233,231], tinta:[26,26,26], cinza:[85,96,93], marca:[13,92,83], verde:[29,128,72], verm:[194,56,44] };

  /* A fonte padrão do PDF (Helvetica) só aceita caracteres latinos: troca o resto */
  const T = v => String(v ?? '')
    .replace(/[–—]/g,'-').replace(/[“”]/g,'"').replace(/[‘’]/g,"'")
    .replace(/₂/g,'2').replace(/…/g,'...').replace(/[✓✔☑]/g,'X').replace(/☐/g,' ')
    .replace(/≥/g,'>=').replace(/≤/g,'<=').replace(/[^\x00-\xFF]/g,'');

  const pad = n => String(n).padStart(2,'0');
  const agora = () => { const d=new Date(); return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };

  function qrDataURL(texto){
    if(!window.QRCode || !texto) return null;
    const box = document.createElement('div'); box.style.cssText='position:fixed;left:-9999px;top:0';
    document.body.appendChild(box);
    try {
      new QRCode(box, { text: texto, width: 256, height: 256, correctLevel: QRCode.CorrectLevel.M });
      const c = box.querySelector('canvas');
      return c ? c.toDataURL('image/png') : (box.querySelector('img')||{}).src || null;
    } catch(e){ return null; } finally { box.remove(); }
  }

  /* Prepara o que é assíncrono (assinaturas recortadas) antes de desenhar */
  async function prepararAssinaturas(s){
    const urls = [];
    s.equipe.forEach(w => w.ass && urls.push(w.ass));
    [s.lib.elaborador.ass, s.lib.liberador.ass, s.enc.resp.ass].forEach(u => u && urls.push(u));
    const mapa = new Map();
    await Promise.all(urls.map(async u => { const r = await Assin.recortarURL(u); if(r) mapa.set(u, r); }));
    return mapa;
  }

  function desenhar(s, sigs){
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit:'mm', format:'a4', orientation:'portrait', compress:true });
    const PW = doc.internal.pageSize.getWidth(), PH = doc.internal.pageSize.getHeight();
    const CW = PW - MM.L - MM.R;
    const st = statusVis();
    let y = MM.L;

    doc.setFont('helvetica','normal'); doc.setTextColor(...COR.tinta); doc.setDrawColor(...COR.borda); doc.setLineWidth(0.25);
    doc.setProperties({ title: `${s.meta.numero} - APR / PT`, subject: 'Análise Preliminar de Riscos / Permissão de Trabalho', creator: 'APRFlow' });

    const base = {
      theme:'grid', margin:{ top:MM.TOP2, left:MM.L, right:MM.R, bottom:MM.BOT },
      styles:{ font:'helvetica', fontSize:8, cellPadding:1.5, lineColor:COR.borda, lineWidth:0.2, textColor:COR.tinta, valign:'middle', overflow:'linebreak' },
      headStyles:{ fillColor:COR.cab, textColor:COR.tinta, fontStyle:'bold', fontSize:7.5 },
      rowPageBreak:'avoid'
    };
    const tabela = opt => { doc.autoTable(Object.assign({}, base, { startY:y }, opt,
      { styles:Object.assign({}, base.styles, opt.styles||{}), headStyles:Object.assign({}, base.headStyles, opt.headStyles||{}) })); y = doc.lastAutoTable.finalY; };
    const th = (t, extra) => Object.assign({ content:T(t), styles:{ fillColor:COR.cab, fontStyle:'bold', fontSize:7.5 } }, extra||{});
    const td = (t, extra) => Object.assign({ content:T(t) }, extra||{});
    const espaco = h => { if(y + h > PH - MM.BOT){ doc.addPage(); y = MM.TOP2; } };
    const secao = titulo => {
      espaco(16); y += 3;
      doc.setFillColor(...COR.cab); doc.rect(MM.L, y, CW, 6.2, 'FD');
      doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(...COR.tinta);
      doc.text(T(titulo).toUpperCase(), PW/2, y + 4.3, { align:'center' });
      doc.setFont('helvetica','normal'); y += 6.2;
    };

    /* ---------- Cabeçalho da primeira página ---------- */
    const HH = 30;
    doc.rect(MM.L, y, CW, HH);
    const RW = 62;
    doc.line(MM.L + 38, y, MM.L + 38, y + HH); doc.line(PW - MM.R - RW, y, PW - MM.R - RW, y + HH);
    doc.setFont('helvetica','bold'); doc.setFontSize(15); doc.setTextColor(...COR.marca);
    doc.text('APRFlow', MM.L + 19, y + HH/2 + 2, { align:'center' });
    doc.setTextColor(...COR.tinta); doc.setFontSize(12.5);
    doc.text(['ANÁLISE PRELIMINAR DE RISCOS /', 'PERMISSÃO DE TRABALHO'], MM.L + 38 + (CW - 38 - RW)/2, y + HH/2 - 1.5, { align:'center' });
    const qr = qrDataURL(urlVerificacao());
    if(qr) doc.addImage(qr, 'PNG', PW - MM.R - RW + 2, y + 2.5, 25, 25);
    doc.setFont('courier','normal'); doc.setFontSize(7.2);
    doc.text([`Nº ${T(s.meta.numero)}`, `${s.meta.codigo ? T(s.meta.codigo)+' · ' : ''}Rev. ${T(s.meta.rev)}`, '', 'Situação:', st.toUpperCase()],
             PW - MM.R - RW + 29, y + 8, { align:'left', lineHeightFactor:1.45 });
    doc.setFont('helvetica','normal');
    y += HH + 3;

    /* ---------- Identificação ---------- */
    const rows = [
      [th('Empresa'), td(s.id.empresa), th('CNPJ'), td(s.id.cnpj)],
      ...(fmtEnd(s.id.endEmpresa) ? [[th('Endereço da empresa'), td(fmtEnd(s.id.endEmpresa), { colSpan:3 })]] : []),
      [th('Local do serviço'), td(s.id.local, { colSpan:3 })],
      ...(fmtEnd(s.id.endLocal) ? [[th('Endereço do local'), td(fmtEnd(s.id.endLocal), { colSpan:3 })]] : []),
      [th('Data inicial'), td(fmtData(s.id.dataIni)), th('Data final'), td(fmtData(s.id.dataFim))],
      [th('Elaboração da APR'), td(fmtData(s.id.elaboracao)), th('Ordem de serviço'), td(s.id.os)],
      [th('Serviço a ser executado'), td(s.id.servico, { colSpan:3 })]
    ];
    tabela({ body: rows, columnStyles:{ 0:{cellWidth:34}, 1:{cellWidth:CW/2-34}, 2:{cellWidth:30}, 3:{cellWidth:CW/2-30} } });

    /* ---------- Atividades críticas ---------- */
    secao('Identificação de atividades críticas e condições especiais');
    const grade = []; for(let i = 0; i < ATIV.length; i += 5) grade.push(ATIV.slice(i, i+5).map(a => ({ content:`${a.n}  ${T(a.nome)}`, marcado: !!s.ativ[a.id] })));
    tabela({ body: grade.map(l => l.map(c => ({ content:c.content, marcado:c.marcado }))), styles:{ fontSize:7, cellPadding:{ top:1.6, bottom:1.6, left:6, right:1.4 }, valign:'top' },
      columnStyles:{ 0:{cellWidth:CW/5}, 1:{cellWidth:CW/5}, 2:{cellWidth:CW/5}, 3:{cellWidth:CW/5}, 4:{cellWidth:CW/5} },
      didDrawCell: d => { if(d.section !== 'body') return; const raw = d.cell.raw || {}; const bx = d.cell.x + 1.6, by = d.cell.y + 1.7;
        doc.setDrawColor(...COR.tinta); doc.setLineWidth(0.3); doc.rect(bx, by, 3, 3);
        if(raw.marcado){ doc.setLineWidth(0.5); doc.line(bx+0.5, by+0.5, bx+2.5, by+2.5); doc.line(bx+2.5, by+0.5, bx+0.5, by+2.5); }
        doc.setDrawColor(...COR.borda); doc.setLineWidth(0.25); } });
    if(tx(s.outras)) tabela({ body:[[th('Outras situações'), td(s.outras)]], columnStyles:{ 0:{cellWidth:34} } });

    /* ---------- Condições impeditivas ---------- */
    secao('Condições impeditivas');
    tabela({ head:[['Verificação no local', { content:'Resposta', styles:{ halign:'center' } }]],
      body: impedimentos().map(c => { const v = s.lib.imped?.[c.key]; const a = c.a;
        const tit = c.titulo ? T(c.titulo) + (a && a.tipo === 'permissao' ? ` · ${T(a.doc)} nº ${T(s.permNum[a.id] || '-')}` : '') + '\n' : '';
        const det = c.orient ? `\n${T(c.orient)} Se "Não": ${T(c.seNao)}` : '';
        return [ { content: tit + T(c.perg) + det },
                 { content: v === 'ausente' ? 'Sim' : v === 'presente' ? 'NÃO' : '-', styles:{ halign:'center', fontStyle:'bold',
                   textColor: v === 'ausente' ? COR.verde : v === 'presente' ? COR.verm : COR.tinta } } ]; }),
      columnStyles:{ 1:{ cellWidth:24 } } });

    const ctrl = ativOn().filter(a => a.tipo === 'controle');
    if(ctrl.length){ secao('Requisitos das atividades críticas');
      tabela({ body: ctrl.map(a => [ `Nº ${a.n} - ${T(a.nome)}: ${T(a.regra)}` ]) }); }

    /* ---------- Riscos ---------- */
    secao('Riscos potenciais');
    const mz = s.usarMatriz;
    const nivelTxt = (p, q) => { const nv = nivel(p, q); return nv ? `${nv.label} (${nv.n})` : '-'; };
    const corNivel = (p, q) => { const nv = nivel(p, q); return nv ? ({ baixo:[207,233,214], moderado:[244,228,161], alto:[246,194,140], critico:[238,154,146] })[nv.c] : null; };
    const rBody = [
      ...riscosOn().map(r => { const v = s.riscos[r[0]]; return mz ? [T(r[1]), v.p || '-', v.s || '-', { content:nivelTxt(v.p, v.s), styles:{ fillColor: corNivel(v.p, v.s) || [255,255,255] } }] : [T(r[1])]; }),
      ...s.riscosExtra.map(x => { const t = `${T(x.nome)}\nMedida: ${T(x.medida)}`; return mz ? [t, x.p || '-', x.s || '-', { content:nivelTxt(x.p, x.s), styles:{ fillColor: corNivel(x.p, x.s) || [255,255,255] } }] : [t]; })
    ];
    tabela({ head:[ mz ? ['Risco', { content:'P', styles:{halign:'center'} }, { content:'S', styles:{halign:'center'} }, { content:'Nível', styles:{halign:'center'} }] : ['Risco'] ],
      body: rBody.length ? rBody : [[ mz ? { content:'Nenhum risco informado', colSpan:4 } : 'Nenhum risco informado' ]],
      columnStyles: mz ? { 1:{cellWidth:14, halign:'center'}, 2:{cellWidth:14, halign:'center'}, 3:{cellWidth:30, halign:'center'} } : {} });

    /* ---------- Medidas, EPI, EPC ---------- */
    const listaSel = (lista, b) => lista.filter(([id]) => get(`${b}.${id}`)).map(([, n]) => T(n));
    const colunas = (itens, n=3) => { const out = []; for(let i = 0; i < itens.length; i += n){ const l = itens.slice(i, i+n).map(t => '• ' + t); while(l.length < n) l.push(''); out.push(l); } return out; };
    const blocoLista = (titulo, itens) => { secao(titulo);
      const b = colunas(itens);
      tabela({ body: b.length ? b : [[{ content:'Nenhum item selecionado', colSpan:3 }]], theme:'plain',
        styles:{ fontSize:7.5, cellPadding:{ top:1, bottom:1, left:2, right:2 } }, tableLineWidth:0.2, tableLineColor:COR.borda,
        columnStyles:{ 0:{cellWidth:CW/3}, 1:{cellWidth:CW/3}, 2:{cellWidth:CW/3} } }); };
    blocoLista('Medidas de segurança obrigatórias', [...listaSel(MEDIDAS,'medidas'), ...s.riscosExtra.filter(x => tx(x.medida)).map(x => T(x.medida)), ...(tx(s.medidaOutra) ? [T(s.medidaOutra)] : [])]);
    blocoLista('EPI', [...listaSel(EPI,'epi'), ...(tx(s.epiOutro) ? [T(s.epiOutro)] : [])]);
    blocoLista('EPC e ferramentas', [...listaSel(EPC,'epc'), ...(tx(s.epcOutro) ? [T(s.epcOutro)] : [])]);

    /* ---------- Emergência ---------- */
    secao('Plano de resposta a emergências');
    tabela({ body: s.emerg.planos.map((p, i) => [{ content:`Plano ${'ABCD'[i]}`, styles:{ fontStyle:'bold', fillColor:COR.cab } }, T(p)]), columnStyles:{ 0:{cellWidth:20} } });
    const tels = s.emerg.tel.filter(t => tx(t.s) || tx(t.t));
    y += 2;
    tabela({ head:[['Telefones de emergência', 'Telefone']], body: tels.length ? tels.map(t => [T(t.s), T(t.t)]) : [[' ', ' ']], columnStyles:{ 1:{cellWidth:50} } });
    const hosp = s.emerg.hospitais.filter(h => tx(h.nome) || fmtEnd(h.addr));
    y += 2;
    tabela({ head:[['Hospital de referência', 'Endereço', 'Telefone', 'Distância', 'Tempo']],
      body: hosp.length ? hosp.map(h => [T(h.nome), T(fmtEnd(h.addr)), T(h.tel), tx(h.km) ? T(h.km)+' km' : '', tx(h.min) ? T(h.min)+' min' : '']) : [[' ',' ',' ',' ',' ']],
      columnStyles:{ 0:{cellWidth:42}, 2:{cellWidth:28}, 3:{cellWidth:18, halign:'center'}, 4:{cellWidth:16, halign:'center'} } });
    if(fmtEnd(s.id.endLocal)){ espaco(6); doc.setFontSize(7); doc.setTextColor(...COR.cinza); doc.text(T('Rota a partir de: ' + fmtEnd(s.id.endLocal)), MM.L, y + 3.5, { maxWidth:CW }); doc.setTextColor(...COR.tinta); y += 5; }

    /* ---------- Assinaturas (desenho comum) ---------- */
    const SIGH = 17;
    const desenharAss = (d, url, em) => {
      const c = d.cell, r = url && sigs.get(url);
      if(r){ const maxW = c.width - 4, maxH = c.height - 7.5; const k = Math.min(maxW / r.w, maxH / r.h);
        const w = r.w * k, h = r.h * k; doc.addImage(r.url, 'PNG', c.x + (c.width - w)/2, c.y + 1.2 + (maxH - h)/2, w, h); }
      if(em){ doc.setFontSize(6.5); doc.setTextColor(...COR.cinza); doc.text(T(fmtDH(em)), c.x + c.width/2, c.y + c.height - 1.8, { align:'center' }); doc.setTextColor(...COR.tinta); }
    };

    /* ---------- Equipe ---------- */
    secao('Trabalhadores executantes');
    tabela({ head:[['Nome','Função','CPF','Matrícula','Treinamentos','ASO', { content:'Ciência', styles:{ halign:'center' } }]],
      body: s.equipe.length ? s.equipe.map(w => [T(w.nome), T(w.funcao), T(w.cpf), T(w.mat),
        Object.keys(TREIN).filter(t => w.trein?.[t]).map(t => TREIN[t]).join(', ') || '-', w.aso ? 'Apto' : '-', { content:'', sig:w.ass, em:w.em }])
        : [[{ content:'Nenhum executante incluído', colSpan:7 }]],
      columnStyles:{ 2:{cellWidth:24}, 3:{cellWidth:17}, 4:{cellWidth:22}, 5:{cellWidth:11, halign:'center'}, 6:{cellWidth:44} },
      didParseCell: d => { if(d.section === 'body' && d.column.index === 6 && d.cell.raw && d.cell.raw.sig !== undefined) d.cell.styles.minCellHeight = SIGH; },
      didDrawCell: d => { if(d.section === 'body' && d.column.index === 6 && d.cell.raw && d.cell.raw.sig !== undefined) desenharAss(d, d.cell.raw.sig, d.cell.raw.em); } });

    /* ---------- Liberação ---------- */
    secao('Permissão de trabalho - liberação');
    const L = s.lib, conf = [...requisitos().map(r => [L.req[r.key], r.txt]), ...GERAIS.map(g => [L.gerais[g[0]], g[1]])];
    const pessoa = (o, extra) => [T(o.nome), T(o.funcao), extra].filter(tx).join('\n');
    const sigRow = (a, b) => [th('Assinatura'), { content:'', sig:a.ass, em:a.em }, th('Assinatura'), { content:'', sig:b.ass, em:b.em }];
    tabela({ body:[
        [th('Validade'), td(`${fmtDH(L.ini)} até ${fmtDH(L.fim)}${s.meta.liberadaEm ? ' · Liberada em ' + fmtDH(s.meta.liberadaEm) : ''}`, { colSpan:3 })],
        [th('Conferências'), td(conf.map(([ok, t]) => `${ok ? '[X]' : '[  ]'} ${T(t)}`).join('\n'), { colSpan:3 })],
        [th('Elaborado por'), td(pessoa(L.elaborador, tx(L.elaborador.regNum) ? `Registro ${L.elaborador.regTipo} nº ${L.elaborador.regNum}` : '')),
         th('Liberado por'), td(pessoa(L.liberador, tx(L.liberador.cpf) ? `CPF ${L.liberador.cpf}` : ''))],
        sigRow(L.elaborador, L.liberador)
      ],
      columnStyles:{ 0:{cellWidth:28}, 1:{cellWidth:CW/2-28}, 2:{cellWidth:28}, 3:{cellWidth:CW/2-28} },
      didParseCell: d => { if(d.cell.raw && d.cell.raw.sig !== undefined) d.cell.styles.minCellHeight = SIGH + 2; },
      didDrawCell: d => { if(d.section === 'body' && d.cell.raw && d.cell.raw.sig !== undefined) desenharAss(d, d.cell.raw.sig, d.cell.raw.em); } });

    /* ---------- Encerramento ---------- */
    secao('Encerramento');
    const E = s.enc;
    tabela({ body:[
        [th('Conferências'), td(ENC.map(e => `${E.chk[e[0]] ? '[X]' : '[  ]'} ${T(e[1])}`).join('\n'), { colSpan:3 })],
        [th('Situação'), td(s.meta.encerradaEm ? (E.situacao === 'concluido' ? 'Concluído' : 'Não concluído') : '-'), th('Encerrada em'), td(fmtDH(s.meta.encerradaEm))],
        [th('Responsável'), td(E.resp.nome), th('Assinatura'), { content:'', sig:E.resp.ass, em:E.resp.em }],
        ...(tx(E.obs) ? [[th('Observações'), td(E.obs, { colSpan:3 })]] : [])
      ],
      columnStyles:{ 0:{cellWidth:28}, 1:{cellWidth:CW/2-28}, 2:{cellWidth:28}, 3:{cellWidth:CW/2-28} },
      didParseCell: d => { if(d.cell.raw && d.cell.raw.sig !== undefined) d.cell.styles.minCellHeight = SIGH + 2; },
      didDrawCell: d => { if(d.section === 'body' && d.cell.raw && d.cell.raw.sig !== undefined) desenharAss(d, d.cell.raw.sig, d.cell.raw.em); } });

    /* ---------- Declaração (justificada) ---------- */
    y += 4; espaco(10);
    doc.setDrawColor(...COR.borda); doc.line(MM.L, y, PW - MM.R, y); y += 3;
    DECLARACAO.forEach((p, i) => {
      const forte = i === DECLARACAO.length - 1;
      doc.setFont('helvetica', forte ? 'bold' : 'normal'); doc.setFontSize(7.8);
      const linhas = doc.splitTextToSize(T(p), CW), h = linhas.length * 3.4;
      espaco(h + 2);
      doc.text(T(p), MM.L, y + 2.8, { maxWidth:CW, align:'justify', lineHeightFactor:1.25 });
      y += h + 1.8;
    });
    doc.setFont('helvetica','normal');

    /* ---------- Histórico ---------- */
    if(s.meta.eventos.length){ secao('Histórico');
      tabela({ body: s.meta.eventos.map(e => [T(fmtDH(e.em)), T(e.txt)]), styles:{ fontSize:7.2 }, columnStyles:{ 0:{cellWidth:30} } }); }

    /* ---------- Cabeçalho, rodapé e marca d'água em todas as páginas ---------- */
    const n = doc.getNumberOfPages(), gerado = agora();
    const marca = st === 'rascunho' ? 'RASCUNHO - SEM VALOR DE AUTORIZAÇÃO' : st === 'cancelada' ? 'CANCELADO' : '';
    for(let i = 1; i <= n; i++){
      doc.setPage(i);
      if(i > 1){
        doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(...COR.marca); doc.text('APRFlow', MM.L, 10);
        doc.setTextColor(...COR.tinta); doc.setFontSize(7.5); doc.text('ANÁLISE PRELIMINAR DE RISCOS / PERMISSÃO DE TRABALHO', MM.L + 17, 10);
        doc.setFont('courier','normal'); doc.text(`Nº ${T(s.meta.numero)}`, PW - MM.R, 10, { align:'right' });
        doc.setDrawColor(...COR.borda); doc.line(MM.L, 12.5, PW - MM.R, 12.5);
      }
      doc.setDrawColor(...COR.borda); doc.line(MM.L, PH - 10.5, PW - MM.R, PH - 10.5);
      doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(...COR.cinza);
      doc.text(`Nº ${T(s.meta.numero)} · Rev. ${T(s.meta.rev)} · ${st.toUpperCase()}`, MM.L, PH - 6.5);
      doc.text(`Página ${i} de ${n}`, PW/2, PH - 6.5, { align:'center' });
      doc.text(`Gerado em ${gerado}`, PW - MM.R, PH - 6.5, { align:'right' });
      if(marca){
        doc.saveGraphicsState(); doc.setGState(new doc.GState({ opacity:0.13 }));
        doc.setFont('helvetica','bold'); const fs = st === 'cancelada' ? 80 : 30; doc.setFontSize(fs); doc.setTextColor(...COR.verm);
        const w = doc.getTextWidth(marca), a = Math.PI / 4, hh = fs * 0.3528 * 0.35;
        doc.text(marca, PW/2 - (w/2) * Math.cos(a) + hh * Math.sin(a), PH/2 + (w/2) * Math.sin(a) + hh * Math.cos(a), { angle:45 });
        doc.restoreGraphicsState();
      }
      doc.setTextColor(...COR.tinta);
    }
    return doc;
  }

  /* s = documento já normalizado pelo editor */
  async function gerarDeEstado(s){
    if(!window.jspdf || !window.jspdf.jsPDF) throw new Error('Gerador de PDF indisponível. Verifique a conexão e recarregue a página.');
    const sigs = await prepararAssinaturas(s);
    const anterior = state;
    state = s;
    try { return desenhar(s, sigs); } finally { state = anterior; }
  }
  const gerarDeDoc = doc => gerarDeEstado(Editor.normalizar(doc));
  const nomeArquivo = s => `${String(s.meta ? s.meta.numero : s.numero).replace(/[^\w.-]+/g,'_')}.pdf`;

  window.APRPDF = { gerarDeEstado, gerarDeDoc, nomeArquivo };
})();
