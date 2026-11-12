/* ==== 48-lab-edit.js ==== */
'use strict';
/* ================= el montaje: colocar, rotular y unir ================= */

const MONTAJE_W = 800, MONTAJE_H = 460;

function montajeVacio() {
  return { piezas: [], flechas: [] };
}
/* Un montaje de arranque, para no empezar en blanco. */
let MO_GRUPO = 'vidrio';

/* Ejemplos de arranque, uno por disciplina. */
const PZ = (k, x, y, esc, et) => ({ id: uid(), k, x, y, esc: esc || 1, et: et || '' });
const LN = (tipo, x1, y1, x2, y2, texto) => ({ id: uid(), tipo, x1, y1, x2, y2, texto: texto || '' });

function montajeEjemplo() {
  /* Reflujo y filtración al vacío: el montaje que más se repite en una
     síntesis de estado sólido por vía húmeda. */
  return {
    piezas: [
      PZ('soporte', 140, 230, 1.5), PZ('refrigerante', 240, 122, 1.05),
      PZ('balon', 240, 262, 1.15, 'Reflujo'), PZ('parrilla', 240, 372, 0.9, 'Agitación y calor'),
      PZ('kitasato', 560, 270, 1.2, 'Filtración al vacío')
    ],
    flechas: [LN('flecha', 340, 290, 460, 290, 'filtrar')]
  };
}
function montajeCircuito() {
  /* Malla sencilla: pila, interruptor, resistencia y lámpara. */
  return {
    piezas: [
      PZ('pila', 150, 110, 1, 'Fuente'), PZ('interruptor', 330, 110, 1, ''),
      PZ('resistencia', 510, 110, 1, 'R'), PZ('lampara', 510, 300, 1, 'Carga'),
      PZ('amperimetro', 240, 300, 1, 'A')
    ],
    flechas: [
      LN('cable', 195, 110, 285, 110), LN('cable', 375, 110, 465, 110),
      LN('cableL', 555, 110, 555, 300), LN('cable', 465, 300, 285, 300),
      LN('cableL', 195, 300, 105, 110)
    ]
  };
}
function montajeOptica() {
  /* Banco óptico: láser, rendija, lente y pantalla. */
  return {
    piezas: [
      PZ('laser', 110, 190, 1.1, 'Láser'), PZ('rendija', 250, 190, 1, 'Rendija'),
      PZ('lente-conv', 400, 190, 1.1, 'Lente'), PZ('pantalla', 580, 190, 1.1, 'Pantalla'),
      PZ('banco', 350, 340, 2.2, 'Banco óptico')
    ],
    flechas: [LN('cable', 160, 190, 230, 190), LN('cable', 270, 190, 375, 190), LN('cable', 425, 190, 555, 190)]
  };
}
function montajeBio() {
  /* Flujo de una PCR: muestra, mezcla, termociclador y gel. */
  return {
    piezas: [
      PZ('eppendorf', 110, 170, 1.05, 'Muestra'), PZ('micropipeta', 250, 165, 1, ''),
      PZ('pcr', 420, 180, 1.15, 'Termociclador'), PZ('gel', 620, 180, 1.1, 'Electroforesis'),
      PZ('flujo', 200, 360, 1, 'Campana de flujo')
    ],
    flechas: [
      LN('flecha', 160, 175, 215, 175, 'alicuotar'),
      LN('flecha', 300, 175, 350, 175, 'mezcla'),
      LN('flecha', 500, 180, 555, 180, 'amplificado')
    ]
  };
}
const MO_EJEMPLOS = [
  { id: 'quim', n: 'Química · reflujo y filtración', ic: '⚗', build: montajeEjemplo },
  { id: 'circ', n: 'Física · circuito de una malla', ic: '⚡', build: montajeCircuito },
  { id: 'opt', n: 'Física · banco óptico', ic: '◐', build: montajeOptica },
  { id: 'bio', n: 'Biología · flujo de PCR', ic: '⬢', build: montajeBio }
];

function renderMontaje(b, deck, mode, availPx) {
  const m = b.mont || montajeVacio();
  const wrap = h('div', { class: 'mont-wrap', style: `width:${b.w || 88}%` });
  const svg = svgMontaje(m, deck);
  wrap.append(svg);
  return wrap;
}

function cajaMontaje(m) {
  if (!m.piezas.length && !m.flechas.length) return { x: 0, y: 0, w: MONTAJE_W, h: MONTAJE_H };
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  m.piezas.forEach(p => {
    const w = 100 * (p.esc || 1), hh = 140 * (p.esc || 1);
    x0 = Math.min(x0, p.x - w / 2); x1 = Math.max(x1, p.x + w / 2);
    y0 = Math.min(y0, p.y - hh / 2); y1 = Math.max(y1, p.y + hh / 2 + (p.et ? 22 : 0));
  });
  (m.flechas || []).forEach(f => {
    x0 = Math.min(x0, f.x1, f.x2); x1 = Math.max(x1, f.x1, f.x2);
    y0 = Math.min(y0, f.y1, f.y2); y1 = Math.max(y1, f.y1, f.y2);
  });
  const mg = 24;
  return { x: x0 - mg, y: y0 - mg, w: Math.max(80, x1 - x0 + mg * 2), h: Math.max(60, y1 - y0 + mg * 2) };
}

/* Una línea puede ser flecha (proceso) o cable (circuito), recta o en escuadra.
   Los cables van en ángulo recto porque así se dibuja un circuito. */
function puntosLinea(f) {
  if (f.tipo === 'cableL') {
    const mx = (f.x1 + f.x2) / 2;
    return [[f.x1, f.y1], [mx, f.y1], [mx, f.y2], [f.x2, f.y2]];
  }
  return [[f.x1, f.y1], [f.x2, f.y2]];
}
function trazaLinea(destino, f, tinta, marca) {
  const pts = puntosLinea(f);
  const attrs = { points: pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' '),
    fill: 'none', stroke: tinta, 'stroke-width': 2.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  if (f.tipo !== 'cable' && f.tipo !== 'cableL') attrs['marker-end'] = 'url(#' + marca + ')';
  destino.append(sv('polyline', attrs));
  if (f.tipo === 'cable' || f.tipo === 'cableL') {
    destino.append(sv('circle', { cx: f.x1, cy: f.y1, r: 3.4, fill: tinta }));
    destino.append(sv('circle', { cx: f.x2, cy: f.y2, r: 3.4, fill: tinta }));
  }
}

/* Parte una frase en renglones cortos para que quepa dentro de la forma. */
function renglones(txt, max) {
  const pal = String(txt || '').split(/\s+/).filter(Boolean);
  const out = []; let l = '';
  pal.forEach(w => {
    if (!l) l = w;
    else if ((l + ' ' + w).length <= max) l += ' ' + w;
    else { out.push(l); l = w; }
  });
  if (l) out.push(l);
  return out.slice(0, 4);
}
/* El texto que va dentro de una forma, centrado en la pieza. */
function textoForma(destino, p, C, esc) {
  if (!formaConTexto(p.k) || !(p.txt || '').trim()) return;
  const est = C.estilo;
  const lin = renglones(p.txt, 14);
  const tam = clamp(19 - lin.length * 1.4, 11, 19) * esc;
  const alto = tam * 1.22;
  const y0 = p.y - (lin.length - 1) * alto / 2;
  const col = est === 'solido' ? (C.fondo || '#fff') : C.traza;
  lin.forEach((l, i) => {
    const t = sv('text', { x: p.x, y: y0 + i * alto + tam * 0.34, 'text-anchor': 'middle',
      'font-size': tam.toFixed(1), fill: col, 'font-family': 'inherit', 'font-weight': 600 });
    t.textContent = l;
    destino.append(t);
  });
}

function svgMontaje(m, deck) {
  const th = temaDe(deck || S.deck);
  const tinta = (m && m.borde) || th.fg;
  const caja = cajaMontaje(m);
  const svg = sv('svg', { class: 'mont-svg', viewBox: `${caja.x.toFixed(1)} ${caja.y.toFixed(1)} ${caja.w.toFixed(1)} ${caja.h.toFixed(1)}`,
    preserveAspectRatio: 'xMidYMid meet', style: `aspect-ratio:${(caja.w / caja.h).toFixed(3)}` });
  const defs = sv('defs');
  const marca = sv('marker', { id: 'mont-punta', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' });
  marca.append(sv('path', { d: 'M0 0 L10 5 L0 10 z', fill: tinta }));
  defs.append(marca); svg.append(defs);

  (m.flechas || []).forEach(f => {
    trazaLinea(svg, f, tinta, 'mont-punta');
    if (f.texto) {
      const t = sv('text', { x: (f.x1 + f.x2) / 2, y: Math.min(f.y1, f.y2) - 9, 'text-anchor': 'middle',
        'font-size': 17, fill: tinta, 'font-family': 'inherit' });
      t.textContent = f.texto;
      svg.append(t);
    }
  });
  m.piezas.forEach(p => {
    const esc = p.esc || 1;
    const C = coloresLab(p, m, deck);
    const g = piezaSvg(p.k, C, C.estilo, p.nivel);
    const rot = p.rot ? ` rotate(${p.rot})` : '';
    g.setAttribute('transform', `translate(${p.x} ${p.y}) scale(${esc}${p.espejo ? ',' + esc : ''})${rot} translate(-50 -70)`);
    if (p.espejo) g.setAttribute('transform', `translate(${p.x} ${p.y}) scale(${-esc} ${esc})${rot} translate(-50 -70)`);
    svg.append(g);
    textoForma(svg, p, C, esc);
    if (p.et) {
      const t = sv('text', { x: p.x, y: p.y + 70 * esc + 18, 'text-anchor': 'middle', 'font-size': 17,
        fill: tinta, 'font-family': 'inherit' });
      t.textContent = p.et;
      svg.append(t);
    }
  });
  return svg;
}

/* Una fila de muestras de color: la paleta con nombre más un color libre. */
function coloresFila(valor, alElegir) {
  const fila = h('div', { class: 'mo-swf' });
  LIQ_COLORES.forEach(([v, n]) => {
    const on = (valor || 'auto') === v;
    const bt = h('button', { class: 'mo-sw' + (on ? ' on' : '') + (v === 'auto' ? ' auto' : ''),
      title: n, onclick: () => alElegir(v) });
    if (v !== 'auto') bt.style.background = v;
    fila.append(bt);
  });
  const libre = h('input', { type: 'color', class: 'mo-sw-libre', title: 'Color a medida',
    value: (valor && valor !== 'auto') ? valor : '#3E86D6',
    oninput: e => alElegir(e.target.value) });
  fila.append(libre);
  return fila;
}

/* ---------- editor ---------- */
function openMontaje(b) {
  if (!b.mont) b.mont = montajeVacio();
  const m = deepCopy(b.mont);
  let sel = null;

  const lienzo = h('div', { class: 'mo-lienzo' });
  const capa = sv('svg', { class: 'mo-svg', viewBox: `0 0 ${MONTAJE_W} ${MONTAJE_H}` });
  lienzo.append(capa);

  const aDibujo = ev => {
    const r = capa.getBoundingClientRect();
    return { x: (ev.clientX - r.left) / r.width * MONTAJE_W, y: (ev.clientY - r.top) / r.height * MONTAJE_H };
  };
  const piezaEn = p => {
    for (let i = m.piezas.length - 1; i >= 0; i--) {
      const q = m.piezas[i], e = q.esc || 1;
      if (Math.abs(p.x - q.x) < 50 * e && Math.abs(p.y - q.y) < 70 * e) return q;
    }
    return null;
  };

  const pinta = () => {
    capa.innerHTML = '';
    const th = temaDe(S.deck);
    const defs = sv('defs');
    const marca = sv('marker', { id: 'mo-punta', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' });
    marca.append(sv('path', { d: 'M0 0 L10 5 L0 10 z', fill: 'currentColor' }));
    defs.append(marca); capa.append(defs);
    (m.flechas || []).forEach(f => {
      trazaLinea(capa, f, 'currentColor', 'mo-punta');
      if (f.texto) { const t = sv('text', { x: (f.x1 + f.x2) / 2, y: Math.min(f.y1, f.y2) - 8, 'text-anchor': 'middle', 'font-size': 16, fill: 'currentColor' }); t.textContent = f.texto; capa.append(t); }
      /* asas para estirar la línea por sus extremos */
      capa.append(sv('circle', { cx: f.x1, cy: f.y1, r: 7, class: 'mo-asa' + (sel === f.id ? ' sel' : '') }));
      capa.append(sv('circle', { cx: f.x2, cy: f.y2, r: 7, class: 'mo-asa' + (sel === f.id ? ' sel' : '') }));
    });
    m.piezas.forEach(p => {
      const e = p.esc || 1;
      const C = coloresLab(p, m, S.deck);
      const g = piezaSvg(p.k, C, C.estilo, p.nivel);
      g.setAttribute('transform', `translate(${p.x} ${p.y}) scale(${p.espejo ? -e : e} ${e})${p.rot ? ' rotate(' + p.rot + ')' : ''} translate(-50 -70)`);
      capa.append(g);
      textoForma(capa, p, C, e);
      if (p.et) { const t = sv('text', { x: p.x, y: p.y + 70 * e + 17, 'text-anchor': 'middle', 'font-size': 16, fill: 'currentColor' }); t.textContent = p.et; capa.append(t); }
      if (sel === p.id) capa.append(sv('rect', { x: p.x - 50 * e, y: p.y - 70 * e, width: 100 * e, height: 140 * e, class: 'mo-sel' }));
    });
    pintaAcciones();
  };

  const extremoEn = p => {
    for (const f of (m.flechas || [])) {
      if (Math.hypot(f.x1 - p.x, f.y1 - p.y) < 12) return { f, k: 1 };
      if (Math.hypot(f.x2 - p.x, f.y2 - p.y) < 12) return { f, k: 2 };
    }
    return null;
  };
  lienzo.addEventListener('pointerdown', ev => {
    const p0 = aDibujo(ev);
    /* primero los extremos de las líneas: son más pequeños y quedan encima */
    const ex = extremoEn(p0);
    if (ex) {
      ev.preventDefault();
      sel = ex.f.id; pinta();
      const mueve = e2 => {
        const p = aDibujo(e2);
        const x = Math.round(clamp(p.x, 6, MONTAJE_W - 6) / 5) * 5;
        const y = Math.round(clamp(p.y, 6, MONTAJE_H - 6) / 5) * 5;
        if (ex.k === 1) { ex.f.x1 = x; ex.f.y1 = y; } else { ex.f.x2 = x; ex.f.y2 = y; }
        pinta();
      };
      const fin = () => { window.removeEventListener('pointermove', mueve); window.removeEventListener('pointerup', fin); };
      window.addEventListener('pointermove', mueve); window.addEventListener('pointerup', fin);
      return;
    }
    const q = piezaEn(p0);
    sel = q ? q.id : null;
    pinta();
    if (!q) return;
    ev.preventDefault();
    const dx = p0.x - q.x, dy = p0.y - q.y;
    const mueve = e2 => {
      const p = aDibujo(e2);
      q.x = Math.round(clamp(p.x - dx, 30, MONTAJE_W - 30) / 5) * 5;
      q.y = Math.round(clamp(p.y - dy, 40, MONTAJE_H - 40) / 5) * 5;
      pinta();
    };
    const fin = () => { window.removeEventListener('pointermove', mueve); window.removeEventListener('pointerup', fin); };
    window.addEventListener('pointermove', mueve); window.addEventListener('pointerup', fin);
  });

  /* galería */
  /* Con casi cien piezas, una sola lista no se puede recorrer: van por grupo. */
  let grupoVis = MO_GRUPO, busca = '';
  const galeria = h('div', { class: 'mo-gal' });
  const pestanas = h('div', { class: 'mo-tabs' });
  const campoBusca = h('input', { class: 'field mo-busca', placeholder: 'Buscar entre las ' + LAB.length + ' piezas…',
    autocomplete: 'off', oninput: e => { busca = e.target.value.trim(); pintaGaleria(true); } });
  const rejilla = h('div');
  const pintaGaleria = (conservaFoco) => {
    pestanas.innerHTML = ''; rejilla.innerHTML = '';
    Object.keys(LAB_GRUPOS).forEach(gp => pestanas.append(h('button', {
      class: 'mo-tab' + (!busca && grupoVis === gp ? ' on' : ''),
      onclick: () => { busca = ''; campoBusca.value = ''; grupoVis = gp; MO_GRUPO = gp; pintaGaleria(); } }, LAB_GRUPOS[gp])));
    const rej = h('div', { class: 'mo-rej' });
    const lista = busca
      ? LAB.filter(x => casa(x.n + ' ' + x.id.replace(/-/g, ' ') + ' ' + (LAB_GRUPOS[x.grp] || ''), busca)).slice(0, 60)
      : LAB.filter(x => x.grp === grupoVis);
    if (busca && !lista.length) rejilla.append(h('p', { class: 'hint' }, 'Ninguna pieza se llama así. Prueba con «matraz», «flecha», «célula» o «idea».'));
    lista.forEach(def => {
      const mini = sv('svg', { viewBox: '0 0 100 140', class: 'mo-mini' });
      mini.append(piezaSvg(def.id, coloresLab(null, m, S.deck), (m.estilo || 'suave')));
      rej.append(h('button', { class: 'mo-item', title: 'Añadir ' + def.n,
        onclick: () => {
          const p = { id: uid(), k: def.id, x: 120 + (m.piezas.length % 5) * 130, y: 120 + Math.floor(m.piezas.length / 5) * 150, esc: 1.1, et: '' };
          m.piezas.push(p); sel = p.id; pinta();
        } }, mini, h('span', null, def.n)));
    });
    rejilla.append(rej);
    if (conservaFoco) campoBusca.focus({ preventScroll: true });
  };
  pintaGaleria();
  galeria.append(pestanas, campoBusca, rejilla);

  const acciones = h('div', { class: 'mo-acc' });
  function pintaAcciones() {
    acciones.innerHTML = '';
    const ln = (m.flechas || []).find(x => x.id === sel);
    if (ln) {
      acciones.append(h('b', null, ln.tipo === 'flecha' || !ln.tipo ? 'Flecha' : ln.tipo === 'cable' ? 'Cable' : 'Cable en L'));
      acciones.append(h('input', { class: 'field', style: 'width:180px', value: ln.texto || '', placeholder: 'Rótulo (opcional)',
        oninput: e => { ln.texto = e.target.value; pinta(); } }));
      const seg = h('div', { class: 'seg' });
      [['flecha', 'Flecha'], ['cable', 'Cable'], ['cableL', 'En L']].forEach(([v, n]) =>
        seg.append(h('button', { class: (ln.tipo || 'flecha') === v ? 'on' : '', onclick: () => { ln.tipo = v; pinta(); } }, n)));
      acciones.append(seg);
      acciones.append(h('button', { class: 'btn btn-sm btn-danger', onclick: () => { m.flechas = m.flechas.filter(x => x !== ln); sel = null; pinta(); } }, '✕ Quitar'));
      return;
    }
    const p = m.piezas.find(x => x.id === sel);
    if (!p) {
      acciones.append(h('span', { class: 'hint', style: 'margin:0' },
        m.piezas.length ? 'Haz clic en una pieza para moverla, rotularla o cambiar su tamaño. Las flechas y los cables se estiran por sus extremos.'
          : 'Elige piezas de la galería de la izquierda y arrástralas para armar el montaje. Hay vidrio, equipo, biología, circuitos y óptica.'));
      return;
    }
    const def = LABK[p.k] || { n: p.k };
    acciones.append(h('b', null, def.n));
    const et = h('input', { class: 'field', style: 'width:180px', value: p.et || '', placeholder: 'Rótulo (opcional)',
      oninput: e => { p.et = e.target.value; pinta(); } });
    acciones.append(et);
    const tam = h('input', { type: 'range', min: 60, max: 220, step: 5, value: Math.round((p.esc || 1) * 100), style: 'width:120px',
      oninput: e => { p.esc = +e.target.value / 100; pinta(); } });
    const par = (et, ctrl, tit) => h('span', { class: 'mo-par', title: tit || '' }, h('span', { class: 'an-et' }, et), ctrl);
    acciones.append(par('Tamaño', tam));
    const giro = h('input', { type: 'range', min: -180, max: 180, step: 5, value: Math.round(p.rot || 0), style: 'width:104px',
      oninput: e => { p.rot = +e.target.value; pinta(); } });
    acciones.append(par('Giro', giro, 'Doble clic en la barra para volver a cero'));
    giro.ondblclick = () => { p.rot = 0; pinta(); };
    acciones.append(h('button', { class: 'btn btn-sm', title: 'Voltear en horizontal', onclick: () => { p.espejo = !p.espejo; pinta(); } }, '⇄'));
    acciones.append(h('button', { class: 'btn btn-sm', title: 'Traer al frente', onclick: () => { m.piezas = m.piezas.filter(x => x !== p).concat([p]); pinta(); } }, '⤒'));
    acciones.append(h('button', { class: 'btn btn-sm btn-danger', onclick: () => { m.piezas = m.piezas.filter(x => x !== p); sel = null; pinta(); } }, '✕ Quitar'));
    /* Segunda línea: color propio y, si la pieza lo admite, nivel de líquido. */
    const fila2 = h('div', { class: 'mo-acc mo-acc2' });
    if (formaConTexto(p.k)) {
      const dentro = h('input', { class: 'field', style: 'width:170px', value: p.txt || '', placeholder: 'Texto dentro',
        oninput: e => { p.txt = e.target.value.slice(0, 60); pinta(); } });
      fila2.append(par('Dentro', dentro, 'Una frase corta que va dentro de la forma'));
    }
    fila2.append(par('Color', coloresFila(p.col, v => { p.col = v; pinta(); })));
    if (tieneLiquido(p.k)) {
      const niv = h('input', { type: 'range', min: 0, max: 100, step: 5, value: Math.round((p.nivel == null ? 1 : p.nivel) * 100), style: 'width:104px',
        oninput: e => { p.nivel = +e.target.value / 100; pinta(); } });
      fila2.append(par('Nivel', niv, 'Sube o baja el líquido dentro de la pieza'));
    }
    acciones.append(fila2);
    /* el rótulo no debe robar el foco al repintar */
    setTimeout(() => { if (document.activeElement === document.body) et.focus({ preventScroll: true }); }, 0);
  }

  const nuevaLinea = tipo => {
    const n = (m.flechas || []).length;
    const l = { id: uid(), tipo, x1: 120, y1: 420 - n % 3 * 22, x2: 280, y2: 420 - n % 3 * 22, texto: '' };
    m.flechas = (m.flechas || []).concat([l]);
    sel = l.id; pinta();
  };
  const barra = h('div', { class: 'mo-barra' },
    h('button', { class: 'btn btn-sm', title: 'Flecha de proceso: arrastra sus extremos para colocarla', onclick: () => nuevaLinea('flecha') }, '→ Flecha'),
    h('button', { class: 'btn btn-sm', title: 'Cable recto, sin punta: para circuitos', onclick: () => nuevaLinea('cable') }, '— Cable'),
    h('button', { class: 'btn btn-sm', title: 'Cable en escuadra, como se dibuja un circuito', onclick: () => nuevaLinea('cableL') }, '⌐ Cable en L'),
    h('button', { class: 'btn btn-sm', onclick: e2 => {
      const menu = h('div', { class: 'menu' });
      MO_EJEMPLOS.forEach(x => menu.append(h('button', { onclick: () => { closeMenus(); const e = x.build(); m.piezas = e.piezas; m.flechas = e.flechas; sel = null; pinta(); } },
        h('span', { class: 'mi' }, x.ic), h('span', null, x.n))));
      showMenu(menu, e2.currentTarget);
    } }, '✦ Ejemplos'),
    h('button', { class: 'btn btn-sm', onclick: () => { m.piezas = []; m.flechas = []; sel = null; pinta(); } }, '⌫ Vaciar'));

  /* Segunda fila: cómo se dibuja todo el montaje. */
  const barraEstilo = h('div', { class: 'mo-barra mo-barra2' });
  const pintaEstilo = () => {
    barraEstilo.innerHTML = '';
    const seg = h('div', { class: 'seg' });
    ESTILOS_LAB.forEach(x => seg.append(h('button', {
      class: (m.estilo || 'suave') === x.id ? 'on' : '', title: x.d,
      onclick: () => { m.estilo = x.id; pintaEstilo(); pinta(); pintaGaleria(); } }, x.n)));
    barraEstilo.append(h('span', { class: 'mo-par' }, h('span', { class: 'an-et' }, 'Estilo'), seg));
    barraEstilo.append(h('span', { class: 'mo-par' }, h('span', { class: 'an-et' }, 'Color'),
      coloresFila(m.col, v => { m.col = v; pintaEstilo(); pinta(); pintaGaleria(); })));
    barraEstilo.append(h('span', { class: 'hint', style: 'margin:0;flex:1 1 140px' }, EK_LAB[m.estilo || 'suave'].d));
  };
  pintaEstilo();

  const cuerpo = h('div', { class: 'mo-caja' },
    h('div', { class: 'mo-cols' }, galeria, h('div', { class: 'mo-der' }, barra, barraEstilo, lienzo, acciones)));
  pinta();

  openModal({
    title: 'Montaje experimental', size: 'modal-lg', body: cuerpo,
    foot: [h('button', { class: 'btn btn-pri', onclick: () => { b.mont = m; commit(); closeModal(); } }, 'Listo')]
  });
}

/* ---------- a TikZ ----------
   Cada figura se traduce una a una: el PDF sale idéntico al dibujo. */
function montajeTikz(b, p) {
  const m = b.mont || montajeVacio();
  if (!m.piezas.length && !(m.flechas || []).length) return p + '% (montaje vacío)';
  const caja = cajaMontaje(m);
  const k = 0.021;
  const X = v => ((v - caja.x - caja.w / 2) * k).toFixed(3);
  const Y = v => (-(v - caja.y - caja.h / 2) * k).toFixed(3);
  const L = [];
  const reg = registroColores();
  const marcaDefs = L.length;
  L.push(p + '\\begin{tikzpicture}[x=1cm, y=1cm, line width=0.7pt, line cap=round, line join=round, draw=tabulatinta, text=tabulatinta]');
  (m.flechas || []).forEach(f => {
    const pts = puntosLinea(f).map(q => `(${X(q[0])},${Y(q[1])})`).join(' -- ');
    const cable = f.tipo === 'cable' || f.tipo === 'cableL';
    L.push(p + `  \\draw[${cable ? '' : '-{Stealth[length=2mm]}'}] ${pts};`);
    if (cable) {
      L.push(p + `  \\fill[tabulatinta] (${X(f.x1)},${Y(f.y1)}) circle[radius=0.05];`);
      L.push(p + `  \\fill[tabulatinta] (${X(f.x2)},${Y(f.y2)}) circle[radius=0.05];`);
    }
    if (f.texto) L.push(p + `  \\node[above, font=\\scriptsize] at (${X((f.x1 + f.x2) / 2)},${Y(Math.min(f.y1, f.y2))}) {${rotuloTex(f.texto)}};`);
  });
  m.piezas.forEach(pz => {
    const def = LABK[pz.k]; if (!def) return;
    const e = (pz.esc || 1) * k;
    const sx = pz.espejo ? -e : e;
    const PX = v => (+X(pz.x) + (v - 50) * sx).toFixed(3);
    const PY = v => (+Y(pz.y) - (v - 70) * e).toFixed(3);
    const C = coloresLab(pz, m, TEX_DECK || S.deck);
    const estilo = C.estilo;
    const nivel = (pz.nivel == null) ? 1 : clamp(pz.nivel, 0, 1);
    L.push(p + `  % ${def.n}`);
    const figs = def.fig.slice().sort((u, v) => (ORDEN_PAP[papDe(u)] ?? 3) - (ORDEN_PAP[papDe(v)] ?? 3));
    let recorte = false;
    figs.forEach(f => {
      const pap = papDe(f);
      const est = estiloTikz(pap, estilo, C, reg);
      if (!est) return;
      /* El nivel del líquido se logra recortando, igual que en pantalla. */
      if (pap === 'liq' && nivel < 0.999 && !recorte) {
        recorte = true;
        L.push(p + '  \\begin{scope}');
        L.push(p + `    \\clip (${PX(-20)},${PY(340)}) rectangle (${PX(120)},${PY(140 - 140 * nivel)});`);
      } else if (recorte && pap !== 'liq') { L.push(p + '  \\end{scope}'); recorte = false; }
      const sang = recorte ? '  ' : '';
      const rc = f.rx ? `, rounded corners=${(f.rx * e).toFixed(2)}cm` : '';
      if (f.t === 'l') L.push(p + sang + `  \\draw${est} (${PX(f.x1)},${PY(f.y1)}) -- (${PX(f.x2)},${PY(f.y2)});`);
      else if (f.t === 'c') L.push(p + sang + `  \\draw${est} (${PX(f.cx)},${PY(f.cy)}) circle[radius=${(f.r * e).toFixed(3)}];`);
      else if (f.t === 'e') L.push(p + sang + `  \\draw${est} (${PX(f.cx)},${PY(f.cy)}) ellipse[x radius=${Math.abs(f.rx * e).toFixed(3)}, y radius=${(f.ry * e).toFixed(3)}];`);
      else if (f.t === 'r') L.push(p + sang + `  \\draw${est.slice(0, -1) + rc + ']'} (${PX(f.x)},${PY(f.y + f.h)}) rectangle (${PX(f.x + f.w)},${PY(f.y)});`);
      else if (f.t === 'p') L.push(p + sang + '  ' + pathATikz(f.d, PX, PY, est));
    });
    if (recorte) L.push(p + '  \\end{scope}');
    if (formaConTexto(pz.k) && (pz.txt || '').trim()) {
      const lin = renglones(pz.txt, 14).map(x => rotuloTex(x));
      const colTx = reg.n(estilo === 'solido' ? C.fondo : C.traza);
      L.push(p + `  \\node[align=center, font=\\scriptsize\\bfseries, text=${colTx}] at (${X(pz.x)},${Y(pz.y)}) {${lin.join(' \\\\ ')}};`);
    }
    if (pz.et) L.push(p + `  \\node[below, font=\\scriptsize] at (${X(pz.x)},${(+Y(pz.y) - 70 * e - 0.06).toFixed(3)}) {${rotuloTex(pz.et)}};`);
  });
  L.push(p + '\\end{tikzpicture}');
  /* Las declaraciones de color van antes del dibujo. */
  if (reg.defs.length) L.splice(marcaDefs, 0, ...reg.defs.map(d => p + d));
  return L.join('\n');
}
/* Las mismas reglas de pintado que en pantalla, leídas de la misma tabla
   (PINTURA_LAB, en 47b-lab.js). Aquí solo se traduce: los rellenos se mezclan
   con el fondo en vez de usar opacidad —así el PDF sale igual también en los
   temas oscuros— y el ancho se toma en puntos, que es la unidad del papel.
   Antes esta función tenía su propia copia de las reglas y ya había divergido:
   la sombra, el líquido, el metal y las líneas finas no coincidían con la
   pantalla, y el grosor del trazo era el mismo en los cuatro estilos. */
function estiloTikz(pap, estilo, C, reg) {
  const c = celdaLab(pap, estilo);
  if (!c) return null;
  const T = C.traza || '#222222';
  const anchoPt = (c.ancho ? c.ancho[1] : (TRAZO_BASE[estilo] || TRAZO_BASE.suave)[1]);
  if (c.sinTrazo) return `[fill=${reg.n(tonoLab(c.relleno, C))}, draw=none]`;
  const op = [];
  if (c.relleno) op.push('fill=' + reg.n(tonoLab(c.relleno, C)));
  op.push('draw=' + reg.n(c.trazo ? tonoLab(c.trazo, C) : T));
  op.push('line width=' + anchoPt + 'pt');
  if (c.opacidad != null) op.push('opacity=' + c.opacidad);
  return '[' + op.join(', ') + ']';
}
/* Traduce un path SVG sencillo (M L Q A Z) a un \draw de TikZ.
   Los arcos se muestrean en tramos: así el relleno del líquido tiene el área
   que le toca en vez de quedarse en una raya. */
function arcoEnPuntos(x0, y0, rx, ry, rot, grande, barrido, x1, y1, n) {
  const fi = rot * Math.PI / 180;
  const dx2 = (x0 - x1) / 2, dy2 = (y0 - y1) / 2;
  const xp = Math.cos(fi) * dx2 + Math.sin(fi) * dy2;
  const yp = -Math.sin(fi) * dx2 + Math.cos(fi) * dy2;
  let rx2 = rx * rx, ry2 = ry * ry;
  const l = xp * xp / rx2 + yp * yp / ry2;
  if (l > 1) { const k = Math.sqrt(l); rx *= k; ry *= k; rx2 = rx * rx; ry2 = ry * ry; }
  const num = rx2 * ry2 - rx2 * yp * yp - ry2 * xp * xp;
  const den = rx2 * yp * yp + ry2 * xp * xp;
  let co = Math.sqrt(Math.max(0, num / den));
  if (grande === barrido) co = -co;
  const cxp = co * rx * yp / ry, cyp = -co * ry * xp / rx;
  const cx = Math.cos(fi) * cxp - Math.sin(fi) * cyp + (x0 + x1) / 2;
  const cy = Math.sin(fi) * cxp + Math.cos(fi) * cyp + (y0 + y1) / 2;
  const ang = (ux, uy, vx, vy) => {
    const d = (ux * vx + uy * vy) / (Math.hypot(ux, uy) * Math.hypot(vx, vy));
    const a = Math.acos(Math.min(1, Math.max(-1, d)));
    return (ux * vy - uy * vx < 0) ? -a : a;
  };
  const t1 = ang(1, 0, (xp - cxp) / rx, (yp - cyp) / ry);
  let dt = ang((xp - cxp) / rx, (yp - cyp) / ry, (-xp - cxp) / rx, (-yp - cyp) / ry);
  if (!barrido && dt > 0) dt -= 2 * Math.PI;
  if (barrido && dt < 0) dt += 2 * Math.PI;
  const pts = [];
  for (let k = 1; k <= n; k++) {
    const t = t1 + dt * k / n;
    pts.push([
      Math.cos(fi) * rx * Math.cos(t) - Math.sin(fi) * ry * Math.sin(t) + cx,
      Math.sin(fi) * rx * Math.cos(t) + Math.cos(fi) * ry * Math.sin(t) + cy
    ]);
  }
  return pts;
}
function pathATikz(d, PX, PY, est) {
  const tok = d.match(/[MLQAZmlqaz]|-?\d*\.?\d+/g) || [];
  const out = [];
  let i = 0, px = 0, py = 0;
  const num = () => parseFloat(tok[i++]);
  while (i < tok.length) {
    const c = tok[i++];
    if (c === 'M') { const x = num(), y = num(); out.push(`(${PX(x)},${PY(y)})`); px = x; py = y; }
    else if (c === 'L') { const x = num(), y = num(); out.push(`-- (${PX(x)},${PY(y)})`); px = x; py = y; }
    else if (c === 'Q') { const cx = num(), cy = num(), x = num(), y = num(); out.push(`.. controls (${PX(cx)},${PY(cy)}) .. (${PX(x)},${PY(y)})`); px = x; py = y; }
    else if (c === 'A') {
      const rx = num(), ry = num(), rot = num(), grande = num(), barrido = num(), x = num(), y = num();
      arcoEnPuntos(px, py, rx, ry, rot, grande, barrido, x, y, 14)
        .forEach(q => out.push(`-- (${PX(q[0])},${PY(q[1])})`));
      px = x; py = y;
    }
    else if (c === 'Z' || c === 'z') out.push('-- cycle');
  }
  return `\\draw${est} ` + out.join(' ') + ';';
}


