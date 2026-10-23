/* APRFlow · assinaturas
   Recorta o espaço em branco em volta do traço e remove a linha-guia do quadro.
   Usado ao salvar (novas assinaturas) e ao exibir (assinaturas antigas, sem alterar a imagem guardada). */
(function(){
  const cache = new Map();

  /* Recebe um canvas ou uma imagem já carregada. Devolve { url, w, h } ou null se não houver traço. */
  function recortar(fonte){
    const W = fonte.naturalWidth || fonte.width, H = fonte.naturalHeight || fonte.height;
    if(!W || !H) return null;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.drawImage(fonte, 0, 0, W, H);
    const img = x.getImageData(0, 0, W, H), p = img.data;
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for(let y = 0; y < H; y++) for(let i = 0; i < W; i++){
      const k = (y * W + i) * 4, lum = 0.299 * p[k] + 0.587 * p[k+1] + 0.114 * p[k+2];
      if(lum < 175){ if(i < x0) x0 = i; if(i > x1) x1 = i; if(y < y0) y0 = y; if(y > y1) y1 = y; }
      else { p[k] = p[k+1] = p[k+2] = 255; }          /* apaga linha-guia e ruído claro */
    }
    if(x1 < 0) return null;
    x.putImageData(img, 0, 0);
    const m = Math.round(Math.max(W, H) * 0.02) + 2;
    x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(W - 1, x1 + m); y1 = Math.min(H - 1, y1 + m);
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const o = document.createElement('canvas'); o.width = w; o.height = h;
    const ox = o.getContext('2d'); ox.fillStyle = '#fff'; ox.fillRect(0, 0, w, h);
    ox.drawImage(c, x0, y0, w, h, 0, 0, w, h);
    return { url: o.toDataURL('image/png'), w, h, canvas: o };
  }

  /* Versão assíncrona para uma imagem guardada (data URL). Resultado em cache. */
  function recortarURL(url){
    if(!url) return Promise.resolve(null);
    if(cache.has(url)) return cache.get(url);
    const pr = new Promise(res => {
      const im = new Image();
      im.onload = () => { try { res(recortar(im) || { url, w: im.naturalWidth, h: im.naturalHeight }); } catch(e){ res({ url, w: im.naturalWidth, h: im.naturalHeight }); } };
      im.onerror = () => res(null);
      im.src = url;
    });
    cache.set(url, pr);
    return pr;
  }

  /* Troca, dentro de um elemento, as imagens marcadas com data-sig pela versão recortada */
  function aplicar(raiz){
    (raiz || document).querySelectorAll('img[data-sig]').forEach(async im => {
      const orig = im.dataset.sig;
      const r = await recortarURL(orig);
      if(r && im.dataset.sig === orig) im.src = r.url;
    });
  }

  window.Assin = { recortar, recortarURL, aplicar };
})();
