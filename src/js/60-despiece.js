/* ==== 60-despiece.js ==== */
'use strict';
/* ================= adaptar una figura de artículo =================
   El MIT Comm Lab lo dice claro: cuando pegas la figura del paper, el público
   «salta inmediatamente a intentar entenderla» y deja de escucharte. Lo que
   recomiendan es partirla en paneles, tapar lo que no vas a comentar, señalar
   con una flecha lo que estaba enterrado en el pie, y acreditar la fuente.
   Eso es exactamente lo que hace esta ventana.

   Las coordenadas van en fracción de la imagen (0 a 1), así que sobreviven a
   cualquier tamaño y se pueden cocer igual en el archivo exportado. */

const MARCAS_FIG = [
  { id: 'flecha', n: 'Flecha', d: 'Apunta al dato del que estás hablando.' },
  { id: 'circulo', n: 'Círculo', d: 'Rodea la zona interesante.' },
  { id: 'rect', n: 'Recuadro', d: 'Encierra una región completa.' }
];
const MK_MARCA = {}; MARCAS_FIG.forEach(m => MK_MARCA[m.id] = m);
const LETRAS_PANEL = 'abcdefghij'.split('');

const tapasDe = b => Array.isArray(b.tapas) ? b.tapas : [];
const marcasDe = b => Array.isArray(b.marcas) ? b.marcas : [];
const figAdaptada = b => tapasDe(b).length > 0 || marcasDe(b).length > 0;

/* ---------- capa sobre la imagen, en pantalla ---------- */
function capaFigura(b, deck) {
  const tp = tapasDe(b), mc = marcasDe(b);
  if (!tp.length && !mc.length) return null;
  const th = temaDe(deck || S.deck);
  const svg = sv('svg', { class: 'fig-capa', viewBox: '0 0 100 100', preserveAspectRatio: 'none' });
  tp.forEach(t => svg.append(sv('rect', { x: t.x * 100, y: t.y * 100, width: t.w * 100, height: t.h * 100,
    fill: th.bg || '#ffffff' })));
  /* Las marcas no se estiran con el viewBox: van en su propia capa. */
  if (mc.length) {
    const s2 = sv('svg', { class: 'fig-capa fig-marcas', viewBox: '0 0 100 100', preserveAspectRatio: 'none' });
    mc.forEach(m => {
      const at = { fill: 'none', stroke: th.acc, 'stroke-width': 1.1, 'vector-effect': 'non-scaling-stroke',
        'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
      if (m.t === 'rect') s2.append(sv('rect', Object.assign({ x: m.x * 100, y: m.y * 100, width: m.w * 100, height: m.h * 100, rx: 1.2 }, at)));
      else if (m.t === 'circulo') s2.append(sv('ellipse', Object.assign({ cx: (m.x + m.w / 2) * 100, cy: (m.y + m.h / 2) * 100,
        rx: Math.abs(m.w) * 50, ry: Math.abs(m.h) * 50 }, at)));
      else {
        const x1 = m.x * 100, y1 = m.y * 100, x2 = (m.x + m.w) * 100, y2 = (m.y + m.h) * 100;
        s2.append(sv('line', Object.assign({ x1, y1, x2, y2 }, at)));
        const a = Math.atan2((m.h * 100), (m.w * 100));
        const L = 5;
        [a + 2.6, a - 2.6].forEach(g => s2.append(sv('line', Object.assign({
          x1: x2, y1: y2, x2: x2 + Math.cos(g) * L, y2: y2 + Math.sin(g) * L }, at))));
      }
    });
    const g = h('div', { class: 'fig-capas' }, svg, s2);
    return g;
  }
  return h('div', { class: 'fig-capas' }, svg);
}

/* ---------- recortar un panel ---------- */
/* Devuelve un data: con el trozo pedido, con las tapas que caen dentro ya
   pintadas encima. La fracción va en coordenadas de la imagen. */
function recortaPanel(src, r, tapas, colorFondo) {
  return new Promise(ok => {
    const im = new Image();
    im.onerror = () => ok(src);
    im.onload = () => {
      try {
        const W = im.naturalWidth, H = im.naturalHeight;
        const x = Math.round(r.x * W), y = Math.round(r.y * H);
        const w = Math.max(4, Math.round(r.w * W)), hh = Math.max(4, Math.round(r.h * H));
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = hh;
        const c = cv.getContext('2d');
        c.drawImage(im, x, y, w, hh, 0, 0, w, hh);
        (tapas || []).forEach(t => {
          c.fillStyle = colorFondo || '#ffffff';
          c.fillRect((t.x - r.x) * W, (t.y - r.y) * H, t.w * W, t.h * H);
        });
        ok(cv.toDataURL('image/png'));
      } catch (e) { ok(src); }
    };
    im.src = src;
  });
}
/* Las tapas y marcas que caen dentro de un panel, en coordenadas del panel. */
const dentroDe = (o, r) => {
  const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
  return cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h;
};
const remapea = (o, r) => Object.assign({}, o, {
  x: (o.x - r.x) / r.w, y: (o.y - r.y) / r.h, w: o.w / r.w, h: o.h / r.h });

/* ---------- la ventana ---------- */
function openDespiece(b) {
  if (!b || !b.src) { toast('Primero elige la imagen'); return; }
  let modo = 'panel';
  let paneles = Array.isArray(b._paneles) ? deepCopy(b._paneles) : [];
  let tapas = deepCopy(tapasDe(b));
  let marcas = deepCopy(marcasDe(b));
  let tipoMarca = 'flecha';
  const th = temaDe(S.deck);

  const lienzo = h('div', { class: 'dp-lienzo' });
  const img = h('img', { class: 'dp-img', src: b.src, alt: '' });
  const capa = sv('svg', { class: 'dp-capa', viewBox: '0 0 100 100', preserveAspectRatio: 'none' });
  lienzo.append(img, capa);

  const pinta = () => {
    capa.innerHTML = '';
    tapas.forEach((t, i) => {
      capa.append(sv('rect', { x: t.x * 100, y: t.y * 100, width: t.w * 100, height: t.h * 100,
        fill: th.bg || '#fff', stroke: '#C0392B', 'stroke-dasharray': '2 1.5',
        'stroke-width': 0.6, 'vector-effect': 'non-scaling-stroke', class: 'dp-tapa', 'data-i': i }));
    });
    marcas.forEach((m, i) => {
      const at = { fill: 'none', stroke: th.acc, 'stroke-width': 1.4, 'vector-effect': 'non-scaling-stroke', class: 'dp-marca', 'data-i': i };
      if (m.t === 'rect') capa.append(sv('rect', Object.assign({ x: m.x * 100, y: m.y * 100, width: m.w * 100, height: m.h * 100, rx: 1.2 }, at)));
      else if (m.t === 'circulo') capa.append(sv('ellipse', Object.assign({ cx: (m.x + m.w / 2) * 100, cy: (m.y + m.h / 2) * 100,
        rx: Math.abs(m.w) * 50, ry: Math.abs(m.h) * 50 }, at)));
      else {
        const x1 = m.x * 100, y1 = m.y * 100, x2 = (m.x + m.w) * 100, y2 = (m.y + m.h) * 100;
        capa.append(sv('line', Object.assign({ x1, y1, x2, y2 }, at)));
        const a = Math.atan2(m.h * 100, m.w * 100), L = 5;
        [a + 2.6, a - 2.6].forEach(g => capa.append(sv('line', Object.assign({ x1: x2, y1: y2,
          x2: x2 + Math.cos(g) * L, y2: y2 + Math.sin(g) * L }, at))));
      }
    });
    paneles.forEach((p, i) => {
      capa.append(sv('rect', { x: p.x * 100, y: p.y * 100, width: p.w * 100, height: p.h * 100,
        fill: 'none', stroke: th.acc, 'stroke-width': 1.2, 'vector-effect': 'non-scaling-stroke', class: 'dp-panel' }));
      const t = sv('text', { x: p.x * 100 + 1.6, y: p.y * 100 + 5.4, 'font-size': 5,
        fill: th.acc, 'font-weight': 700 });
      t.textContent = '(' + LETRAS_PANEL[i] + ')';
      capa.append(t);
    });
    cuenta.textContent = paneles.length
      ? paneles.length + (paneles.length === 1 ? ' panel marcado' : ' paneles marcados')
      : 'Ningún panel marcado todavía';
  };

  /* dibujar arrastrando */
  const frac = ev => {
    const r = lienzo.getBoundingClientRect();
    return { x: clamp((ev.clientX - r.left) / r.width, 0, 1), y: clamp((ev.clientY - r.top) / r.height, 0, 1) };
  };
  lienzo.addEventListener('pointerdown', ev => {
    ev.preventDefault();
    const p0 = frac(ev);
    let obj;
    if (modo === 'panel') { obj = { x: p0.x, y: p0.y, w: 0, h: 0 }; paneles.push(obj); }
    else if (modo === 'tapar') { obj = { x: p0.x, y: p0.y, w: 0, h: 0 }; tapas.push(obj); }
    else { obj = { t: tipoMarca, x: p0.x, y: p0.y, w: 0, h: 0 }; marcas.push(obj); }
    const mueve = e2 => {
      const p = frac(e2);
      if (modo === 'senal' && tipoMarca === 'flecha') { obj.w = p.x - p0.x; obj.h = p.y - p0.y; }
      else {
        obj.x = Math.min(p0.x, p.x); obj.y = Math.min(p0.y, p.y);
        obj.w = Math.abs(p.x - p0.x); obj.h = Math.abs(p.y - p0.y);
      }
      pinta();
    };
    const fin = () => {
      window.removeEventListener('pointermove', mueve); window.removeEventListener('pointerup', fin);
      const chico = Math.abs(obj.w) < 0.02 && Math.abs(obj.h) < 0.02;
      if (chico) {
        if (modo === 'panel') paneles.pop(); else if (modo === 'tapar') tapas.pop(); else marcas.pop();
      }
      pinta();
    };
    window.addEventListener('pointermove', mueve); window.addEventListener('pointerup', fin);
  });

  /* rejillas listas */
  const rejilla = (cols, filas) => {
    paneles = [];
    const mg = 0.004;
    for (let f = 0; f < filas; f++) for (let c = 0; c < cols; c++)
      paneles.push({ x: c / cols + mg, y: f / filas + mg, w: 1 / cols - mg * 2, h: 1 / filas - mg * 2 });
    pinta();
  };

  const cuenta = h('span', { class: 'hint', style: 'margin:0' });
  const segModo = h('div', { class: 'seg' });
  [['panel', 'Marcar paneles'], ['tapar', 'Tapar'], ['senal', 'Señalar']].forEach(([v, n]) =>
    segModo.append(h('button', { class: modo === v ? 'on' : '',
      onclick: e => { modo = v; $$('button', segModo).forEach(x => x.classList.remove('on')); e.target.classList.add('on'); segMarca.style.display = v === 'senal' ? '' : 'none'; } }, n)));
  const segMarca = h('div', { class: 'seg', style: 'display:none' });
  MARCAS_FIG.forEach(m => segMarca.append(h('button', { class: tipoMarca === m.id ? 'on' : '', title: m.d,
    onclick: e => { tipoMarca = m.id; $$('button', segMarca).forEach(x => x.classList.remove('on')); e.target.classList.add('on'); } }, m.n)));

  const barra = h('div', { class: 'dp-barra' }, segModo, segMarca,
    h('span', { class: 'an-et' }, 'Rejilla'),
    ...[[2, 1], [3, 1], [2, 2], [3, 2], [2, 3]].map(([c, f]) =>
      h('button', { class: 'btn btn-sm', title: c + ' columnas × ' + f + ' filas', onclick: () => rejilla(c, f) }, c + '×' + f)),
    h('button', { class: 'btn btn-sm', onclick: () => { paneles = []; pinta(); } }, '⌫ Paneles'),
    h('button', { class: 'btn btn-sm', onclick: () => { tapas = []; marcas = []; pinta(); } }, '⌫ Marcas'));

  /* la cita de la fuente */
  const refs = refsDe(S.deck);
  const selCita = h('select', { class: 'field' });
  selCita.append(h('option', { value: '' }, 'Sin acreditar'));
  refs.forEach(r => selCita.append(h('option', { value: r.id, selected: b.cita === r.id }, citaCorta(r) || r.titulo)));
  const filaCita = h('div', { class: 'irow' }, h('label', null, 'Modificado de'),
    h('div', { style: 'flex:1.6;display:flex;gap:6px' }, selCita,
      h('button', { class: 'btn btn-sm', title: 'Añadir una referencia', onclick: () => { closeModal(); openReferencias(); } }, '＋'),
      h('button', { class: 'btn btn-sm', title: 'Traerla de Zotero', onclick: () => { closeModal(); openZotero(); } }, 'Z')));

  pinta();
  const cuerpo = h('div', null,
    h('p', { class: 'hint', style: 'margin-top:0' },
      'Arrastra sobre la figura. Con «Marcar paneles» separas cada panel; con «Tapar» cubres la leyenda o la serie que no vas a comentar; con «Señalar» pones la flecha sobre el dato del que hablas. Nada de esto toca la imagen original.'),
    barra, h('div', { class: 'dp-marco' }, lienzo), cuenta, filaCita);

  const guardaMarcas = () => {
    b.tapas = tapas.slice(); b.marcas = marcas.slice();
    b.cita = selCita.value || undefined;
    if (!b.tapas.length) delete b.tapas;
    if (!b.marcas.length) delete b.marcas;
    if (!b.cita) delete b.cita;
  };

  openModal({
    title: 'Adaptar la figura del artículo', size: 'modal-lg', body: cuerpo,
    foot: [
      h('button', { class: 'btn', onclick: () => { guardaMarcas(); commit(); closeModal(); } }, 'Solo guardar marcas'),
      h('button', { class: 'btn btn-pri', onclick: async () => {
        if (!paneles.length) { toast('Marca al menos un panel, o usa una rejilla'); return; }
        guardaMarcas();
        await reparteEnDiapositivas(b, paneles, tapas, marcas, selCita.value);
        closeModal();
      } }, 'Un panel por diapositiva') ]
  });
}

/* Crea una diapositiva por panel, justo después de la actual. */
async function reparteEnDiapositivas(b, paneles, tapas, marcas, citaId) {
  const th = temaDe(S.deck);
  const base = b.orig || b.src;
  const titulo = (curSlide().title || '').trim();
  const pie = b.caption || '';
  const nuevas = [];
  for (let i = 0; i < paneles.length; i++) {
    const r = paneles[i];
    const dentroTapas = tapas.filter(t => dentroDe(t, r));
    const src = await recortaPanel(base, r, dentroTapas, th.bg || '#ffffff');
    const img = Object.assign(newBlock('image'), {
      src, w: 78,
      caption: (pie ? pie + ' ' : '') + '(' + LETRAS_PANEL[i] + ')',
      alt: b.alt || '',
      est: b.est ? deepCopy(b.est) : undefined
    });
    const dentroMarcas = marcas.filter(m => dentroDe(m, r)).map(m => remapea(m, r));
    if (dentroMarcas.length) img.marcas = dentroMarcas;
    if (citaId) img.cita = citaId;
    const sl = {
      id: uid(), layout: 'content',
      title: titulo ? titulo + ' · (' + LETRAS_PANEL[i] + ')' : 'Panel (' + LETRAS_PANEL[i] + ')',
      blocks: [img]
    };
    if (citaId) sl.citas = [citaId];
    nuevas.push(sl);
  }
  S.deck.slides.splice(S.cur + 1, 0, ...nuevas);
  commit();
  toast(nuevas.length + ' diapositivas, una por panel', null, { t: 'Deshacer', fn: doUndo });
}

/* ---------- a LaTeX ----------
   La imagen va dentro de un tikzpicture y el sistema de coordenadas se pone
   sobre ella, de 0 a 1, así que las tapas y las marcas caen en su sitio. */
function figuraConMarcasTex(b, p, imagen) {
  const w = ((b.w || 70) / 100).toFixed(2);
  const th = temaDe(TEX_DECK || S.deck);
  const L = [];
  L.push(p + '\\begin{tikzpicture}');
  L.push(p + `  \\node[inner sep=0] (tpfig) {${imagen || `\\erlenfig{${w}}{${figName(b)}}`}};`);
  L.push(p + '  \\begin{scope}[shift={(tpfig.south west)},');
  L.push(p + '      x={($(tpfig.south east)-(tpfig.south west)$)},');
  L.push(p + '      y={($(tpfig.north west)-(tpfig.south west)$)}]');
  const Y = v => (1 - v).toFixed(4);          /* en la imagen y crece hacia abajo */
  tapasDe(b).forEach(t => L.push(p +
    `    \\fill[erlenfondo] (${t.x.toFixed(4)},${Y(t.y + t.h)}) rectangle (${(t.x + t.w).toFixed(4)},${Y(t.y)});`));
  marcasDe(b).forEach(m => {
    if (m.t === 'rect') L.push(p + `    \\draw[erlenliq, line width=1pt, rounded corners=2pt] (${m.x.toFixed(4)},${Y(m.y + m.h)}) rectangle (${(m.x + m.w).toFixed(4)},${Y(m.y)});`);
    else if (m.t === 'circulo') L.push(p + `    \\draw[erlenliq, line width=1pt] (${(m.x + m.w / 2).toFixed(4)},${Y(m.y + m.h / 2)}) ellipse[x radius=${(Math.abs(m.w) / 2).toFixed(4)}, y radius=${(Math.abs(m.h) / 2).toFixed(4)}];`);
    else L.push(p + `    \\draw[erlenliq, line width=1pt, -{Stealth[length=2.4mm]}] (${m.x.toFixed(4)},${Y(m.y)}) -- (${(m.x + m.w).toFixed(4)},${Y(m.y + m.h)});`);
  });
  L.push(p + '  \\end{scope}');
  L.push(p + '\\end{tikzpicture}');
  return L.join('\n');
}


