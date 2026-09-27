/* ==== 27-pptx-contenido.js ==== */
'use strict';
/* ================= .pptx: contenido y empaquetado ================= */

/* Texto del modelo -> corridas, con las matemáticas pasadas a unicode. */
function corridas(txt, base) {
  const out = [];
  String(txt == null ? '' : txt).split(/(\$[^$]*\$)/g).forEach(seg => {
    if (!seg) return;
    if (seg.length > 1 && seg[0] === '$' && seg[seg.length - 1] === '$')
      out.push(Object.assign({}, base, { t: mathToUnicode(seg.slice(1, -1)), cur: true }));
    else out.push(Object.assign({}, base, { t: seg }));
  });
  return out.length ? out : [Object.assign({}, base, { t: '' })];
}
function parrafosDe(txt, base, opt) {
  return String(txt == null ? '' : txt).split(/\n{2,}|\n/).filter((l, i, a) => l.trim() || a.length === 1)
    .map(l => Object.assign({ runs: corridas(l.trim(), base) }, opt || {}));
}

/* Marco de un elemento en EMU, relativo a la diapositiva. */
/* Un número que no lo es no puede llegar al XML: PowerPoint da por inservible
   la forma entera y la diapositiva sale en blanco sin decir por qué. Pasa en
   cuanto se mide un elemento que ya no está en el documento. */
const _n = (v, resp) => isFinite(v) ? v : resp;
function marco(el, raiz, esc) {
  const r = el.getBoundingClientRect(), R = raiz.getBoundingClientRect();
  return {
    x: _n(Math.round((r.left - R.left) * esc), 0), y: _n(Math.round((r.top - R.top) * esc), 0),
    w: Math.max(1, _n(Math.round(r.width * esc), 1)), h: Math.max(1, _n(Math.round(r.height * esc), 1))
  };
}
/* Estilo de texto leído de la propia diapositiva. */
let _FONDO = '#FFFFFF';
function estilo(el, ptPorPx, fuente) {
  const cs = getComputedStyle(el);
  const px = parseFloat(cs.fontSize);
  return {
    pt: isFinite(px) ? Math.max(6, +(px * ptPorPx).toFixed(1)) : 18,
    col: hex6(cs.color, _FONDO), neg: parseInt(cs.fontWeight, 10) >= 600,
    al: cs.textAlign === 'start' ? 'left' : cs.textAlign,
    fuente: fuente
  };
}

/* Todas las formas de una diapositiva ya dibujada. */
async function formasSlide(raiz, sl, deck, idx, ctx) {
  const F = [];
  const esc = ctx.esc, ptPorPx = ctx.ptPorPx, fuente = ctx.fuente;
  _FONDO = ctx.fondo;
  const id = () => ctx.id++;
  const ver = s => raiz.querySelector(s);
  const todos = s => Array.from(raiz.querySelectorAll(s));
  const texto = (el, txt, extra) => {
    if (!el) return;
    const st = estilo(el, ptPorPx, fuente);
    const f = marco(el, raiz, esc);
    f.h = Math.round(f.h * 1.25) + 40000;
    F.push(xmlTexto(id(), f, Object.assign(st, {
      parrafos: parrafosDe(txt, {}, { al: st.al, desp: 200 })
    }, extra || {})));
  };
  const imagen = async (el, uri, alt) => {
    if (!el || !uri) return;
    const rid = await ctx.medio(uri);
    if (rid) F.push(xmlImagen(id(), marco(el, raiz, esc), rid, alt));
  };
  const pinta = async (el, alt) => {
    if (!el) return;
    const uri = await rasteriza(el, ctx.css, 2);
    if (uri) { const rid = await ctx.medio(uri); if (rid) F.push(xmlImagen(id(), marco(el, raiz, esc), rid, alt)); }
  };
  const m = deck.meta;

  /* barra del título del marco */
  const ft = ver('.frametitle');
  if (ft) {
    const bg = getComputedStyle(ft).backgroundColor;
    if (opaco(bg)) F.push(xmlRect(id(), marco(ft, raiz, esc), hex6(bg, ctx.fondo)));
    texto(ver('.ft-t'), sl.title);
    if (ver('.ft-s')) texto(ver('.ft-s'), sl.subtitle);
  }
  /* portada */
  if (sl.layout === 'title') {
    await imagen(ver('.tp-logo img') || ver('.tp-logo-esq img'), m.logo, m.logoAlt || m.institute);
    const rule = ver('.tp-rule');
    if (rule && opaco(getComputedStyle(rule).backgroundColor)) F.push(xmlRect(id(), marco(rule, raiz, esc), hex6(getComputedStyle(rule).backgroundColor, ctx.fondo)));
    texto(ver('.tp-title'), m.title);
    texto(ver('.tp-sub'), m.subtitle);
    texto(ver('.tp-auth'), m.authors);
    texto(ver('.tp-inst'), m.institute);
    texto(ver('.tp-date'), m.date);
  }
  /* sección */
  if (sl.layout === 'section') {
    const banda = ver('.sec-band');
    if (banda && opaco(getComputedStyle(banda).backgroundColor)) F.push(xmlRect(id(), marco(banda, raiz, esc), hex6(getComputedStyle(banda).backgroundColor, ctx.fondo)));
    texto(ver('.sec-kicker'), (ver('.sec-kicker') || {}).textContent || '');
    texto(ver('.sec-name'), sl.title);
    const barra = ver('.sec-prog i');
    if (barra) F.push(xmlRect(id(), marco(barra, raiz, esc), hex6(getComputedStyle(barra).backgroundColor, ctx.fondo)));
  }
  /* índice */
  const toc = ver('.toc-list');
  if (toc) {
    const st = estilo(toc.querySelector('li') || toc, ptPorPx, fuente);
    const f = marco(toc, raiz, esc); f.h += 60000;
    F.push(xmlTexto(id(), f, Object.assign(st, {
      parrafos: Array.from(toc.querySelectorAll('li')).map(li => ({
        runs: corridas(li.textContent.replace(/\s+/g, ' ').trim(), {}), vineta: false, desp: 500
      }))
    })));
  }
  /* encabezados de zona */
  /* Todos los que pinta 04-render.js con zt(): la cifra y el rótulo del dato
     grande, el autor de la cita, el rótulo de cada fila y los de la pantalla
     partida también son texto de la diapositiva, y sin ellos esos diseños
     llegaban al PowerPoint vacíos. */
  todos('.zona-tit, .comp-tit, .paso-tit, .celda-tit, .paso-n, .dt-num, .dt-rot, .ct-autor, .fl-rot, .pt-tit')
    .filter(el => el.textContent.trim()).forEach(el => texto(el, el.textContent));

  /* bloques */
  for (const el of todos('.blk[data-bid]')) {
    const f0 = findBlockEn(deck, el.dataset.bid);
    if (!f0) continue;
    const b = f0.block;
    const pie = el.querySelector('figcaption, .chart-cap, .smart-cap, .tab-caption');
    if (b.type === 'text' || b.type === 'quote') {
      const cual = el.querySelector('blockquote span') || el;
      const st = estilo(cual, ptPorPx, fuente);
      const f = marco(el, raiz, esc); f.h = Math.round(f.h * 1.3) + 40000;
      const ps = parrafosDe(b.text, {}, { al: st.al, desp: 400 });
      if (b.type === 'quote' && b.by) ps.push({ runs: corridas('— ' + b.by, { cur: true }), al: st.al, desp: 0 });
      F.push(xmlTexto(id(), f, Object.assign(st, { parrafos: ps })));
    } else if (b.type === 'bullets') {
      const li = el.querySelector('li');
      const st = estilo(li || el, ptPorPx, fuente);
      const f = marco(el, raiz, esc); f.h = Math.round(f.h * 1.3) + 40000;
      F.push(xmlTexto(id(), f, Object.assign(st, { al: 'left',
        parrafos: (b.items || []).map(it => ({ runs: corridas(it.t, {}), vineta: true, lvl: it.lvl || 0, al: 'left', desp: 500 })) })));
    } else if (b.type === 'code') {
      const st = estilo(el.querySelector('pre') || el, ptPorPx, fuente);
      const f = marco(el, raiz, esc);
      const bg = getComputedStyle(el.querySelector('pre') || el).backgroundColor;
      if (opaco(bg)) F.push(xmlRect(id(), f, hex6(bg, ctx.fondo), true));
      const fi = Object.assign({}, f); fi.x += 60000; fi.y += 45000; fi.w -= 120000;
      F.push(xmlTexto(id(), fi, Object.assign(st, { al: 'left',
        parrafos: String(b.text || '').split('\n').map(l => ({ runs: [{ t: l, mono: true }], al: 'left', desp: 0 })) })));
    } else if (b.type === 'bblock') {
      const caja = el.querySelector('.bb') || el;
      const f = marco(caja, raiz, esc);
      const bg = getComputedStyle(caja).backgroundColor;
      if (opaco(bg)) F.push(xmlRect(id(), f, hex6(bg, ctx.fondo), true));
      const tit = caja.querySelector('.bb-title'), cue = caja.querySelector('.bb-body');
      [tit, cue].forEach(x => {
        if (!x) return;
        const c = getComputedStyle(x).backgroundColor;
        if (opaco(c)) F.push(xmlRect(id(), marco(x, raiz, esc), hex6(c, ctx.fondo)));
      });
      if (tit) texto(tit, b.btitle);
      if (cue) texto(cue, b.body);
    } else if (b.type === 'table') {
      const tab = el.querySelector('table');
      if (tab) {
        const st = estilo(tab.querySelector('td, th') || tab, ptPorPx, fuente);
        F.push(xmlTabla(id(), marco(tab, raiz, esc), (b.rows || []).map(r => r.map(c => mathToUnicode(String(c || '')))),
          { pt: st.pt, col: st.col, fuente: fuente, encabezado: !!b.header, al: b.align === 'l' ? 'l' : 'ctr' }));
      }
      if (pie) texto(pie, pie.textContent);
    } else if (b.type === 'image') {
      const im = el.querySelector('img');
      if (im && b.src) await imagen(im, b.src, b.alt || b.caption || '');
      if (pie) texto(pie, pie.textContent);
    } else {
      const visual = el.querySelector('.chart-box, .smart-box, .vid-wrap, .katex-display') || el.firstElementChild || el;
      await pinta(visual, b.caption || (b.type === 'math' || b.type === 'chem' ? 'Ecuación' : 'Figura'));
      if (pie) texto(pie, pie.textContent);
    }
  }
  /* pie de página */
  const fl = ver('.footline');
  if (fl) {
    const bg = getComputedStyle(fl).backgroundColor;
    if (opaco(bg)) F.push(xmlRect(id(), marco(fl, raiz, esc), hex6(bg, ctx.fondo)));
    todos('.footline .fl-cell, .footline > span').forEach(c => {
      const bgc = getComputedStyle(c).backgroundColor;
      if (opaco(bgc) && bgc !== bg) F.push(xmlRect(id(), marco(c, raiz, esc), hex6(bgc, ctx.fondo)));
      if (c.textContent.trim()) texto(c, c.textContent);
    });
    const li = ver('.footline .fl-logo-img');
    if (li) await imagen(li, m.logo, '');
  }
  if (ver('.pagenum')) texto(ver('.pagenum'), ver('.pagenum').textContent);
  if (ver('.pie-nota')) texto(ver('.pie-nota'), ver('.pie-nota').textContent);
  if (ver('.pie-logo img')) await imagen(ver('.pie-logo img'), m.logo, '');
  return F;
}
/* findBlock pero sobre un mazo cualquiera */
function findBlockEn(deck, id) {
  for (const sl of deck.slides) for (const arr of zonas(sl)) {
    const i = arr.findIndex(b => b.id === id);
    if (i >= 0) return { slide: sl, arr, i, block: arr[i] };
  }
  return null;
}


