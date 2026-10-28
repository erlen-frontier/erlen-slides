/* ==== 54-galeria.js ==== */
'use strict';
/* ================= galería de figuras =================
   El equivalente a los «Diseños de imágenes» de PowerPoint, pero pensado para
   ciencia: de dos a seis micrografías o espectros con su letra (a), (b), (c)
   y un pie común. En el .tex sale como una figura con minipages, que es lo
   que se usa en un artículo, y no necesita ningún paquete extra. */

const GAL_MODOS = [
  { id: 'rejilla', n: 'Cuadrícula', d: 'Todas del mismo tamaño, en filas de dos o tres.' },
  { id: 'tira', n: 'Tira', d: 'Una sola fila; va bien para una secuencia temporal.' },
  { id: 'mosaico', n: 'Mosaico', d: 'La primera grande y las demás pequeñas al lado.' }
];
const GK_MODO = {}; GAL_MODOS.forEach(x => GK_MODO[x.id] = x);
const LETRAS_FIG = 'abcdefgh'.split('');

function galeriaNueva() {
  return { imgs: [], modo: 'rejilla', cols: 2, letras: true, hueco: 8 };
}
function galDe(b) {
  if (!b.gal) b.gal = galeriaNueva();
  const g = b.gal;
  if (!Array.isArray(g.imgs)) g.imgs = [];
  return g;
}
const galColumnas = g => g.modo === 'tira' ? Math.max(1, g.imgs.length) : clamp(+g.cols || 2, 1, 4);

/* ---------- pintar en la diapositiva ---------- */
function renderGaleria(b, deck, mode, availPx, modoImagen = mode) {
  const g = galDe(b);
  const fig = h('figure', { class: 'gal-fig', style: `width:${b.w || 92}%` });
  const rej = h('div', { class: 'gal-rej gal-' + g.modo });
  const cols = galColumnas(g);
  rej.style.gap = (g.hueco || 8) + 'px';
  if (g.modo !== 'mosaico') rej.style.gridTemplateColumns = `repeat(${cols}, minmax(0,1fr))`;
  if (!g.imgs.length) {
    fig.append(h('div', { class: 'img-ph' }, mode === 'edit' ? 'Doble clic para elegir las figuras de la galería' : ' '));
    return h('div', { class: 'blk b-galeria' }, fig);
  }
  g.imgs.forEach((im, i) => {
    const celda = h('div', { class: 'gal-celda' + (g.modo === 'mosaico' && i === 0 ? ' gal-grande' : '') });
    const img = h('img', { src: im.src, alt: im.alt || im.cap || 'Figura ' + (i + 1) });
    aplicaVistaImagen(img, im.src, modoImagen);
    const env = h('div', { class: 'gal-img' }, img);
    if (typeof aplicaEstiloImg === 'function' && b.est) aplicaEstiloImg(env, { src: im.src, est: b.est }, deck);
    celda.append(env);
    const et = (g.letras ? '(' + LETRAS_FIG[i] + ')' : '') + (im.cap ? (g.letras ? ' ' : '') + im.cap : '');
    if (et.trim()) celda.append(h('span', { class: 'gal-cap', html: inlineRich(et) }));
    rej.append(celda);
  });
  fig.append(rej);
  const cap = b.caption || '';
  if (cap || mode === 'edit') {
    fig.append(h('figcaption', null,
      h('span', { class: 'cap-label' }, 'Figura: '),
      h('span', { class: (cap ? '' : 'vacio'), html: inlineRich(cap) })));
  }
  return h('div', { class: 'blk b-galeria' }, fig);
}

/* ---------- el editor ---------- */
function openGaleria(b) {
  const deck = S.deck, slide = curSlide(), g = deepCopy(galDe(b));
  const vista = h('div', { class: 'gal-vista' });
  const lista = h('div', { class: 'gal-lista' });
  const estado = h('p', {class:'hint', role:'status'});
  let cargando = false, cerrado = false;
  const esperando = [];

  const pinta = () => {
    vista.innerHTML = '';
    const falso = { type: 'galeria', id: b.id, gal: g, w: 100, caption: b.caption, est: b.est };
    vista.append(renderGaleria(falso, S.deck, 'edit'));
    lista.innerHTML = '';
    if (!g.imgs.length) lista.append(h('p', { class: 'hint' }, 'Todavía no hay figuras. Añade la primera con el botón de abajo, o suelta varias de golpe sobre este cuadro.'));
    g.imgs.forEach((im, i) => {
      const mini = h('img', { class: 'gal-mini', src: im.src, alt: '' });
      aplicaVistaImagen(mini, im.src, 'thumb');
      const fila = h('div', { class: 'gal-fila' },
        h('span', { class: 'gal-letra' }, '(' + LETRAS_FIG[i] + ')'),
        mini,
        h('input', { class: 'field', value: im.cap || '', placeholder: 'Pie de esta figura (opcional)',
          oninput: e => { im.cap = e.target.value; pinta(); } }),
        h('button', { class: 'icon-btn', title: 'Subir', onclick: () => { if (i) { g.imgs.splice(i - 1, 0, g.imgs.splice(i, 1)[0]); pinta(); } } }, '↑'),
        h('button', { class: 'icon-btn', title: 'Bajar', onclick: () => { if (i < g.imgs.length - 1) { g.imgs.splice(i + 1, 0, g.imgs.splice(i, 1)[0]); pinta(); } } }, '↓'),
        h('button', { class: 'icon-btn', title: 'Quitar', onclick: () => { g.imgs.splice(i, 1); pinta(); } }, '✕'));
      lista.append(fila);
    });
  };

  const meteArchivos = async files => {
    const pend = [...files].filter(f => /^image\//.test(f.type));
    if (!pend.length) return;
    if (cargando) { esperando.push(...pend); estado.textContent = 'Leyendo imágenes…'; return; }
    cargando = true; listo.disabled = true; estado.textContent = 'Leyendo imágenes…';
    let lote = pend, errores = false, exceso = false;
    while (lote.length) {
      const cupo = 8 - g.imgs.length;
      if (lote.length > cupo) exceso = true;
      const leidos = await Promise.all(lote.slice(0, Math.max(0, cupo)).map(leeComoDataURL));
      if (cerrado) return;
      leidos.filter(Boolean).forEach(src => g.imgs.push({src, cap:'', alt:''}));
      if (leidos.some(x => !x)) errores = true;
      pinta(); lote = esperando.splice(0);
    }
    cargando = false; listo.disabled = false;
    estado.textContent = errores ? 'No se pudieron leer algunas imágenes.' : exceso ? 'La galería admite hasta 8 imágenes.' : '';
  };
  const entrada = h('input', { type: 'file', accept: 'image/*', multiple: true, style: 'display:none',
    onchange: e => { meteArchivos(e.target.files); e.target.value = ''; } });

  const zona = h('div', { class: 'gal-soltar' },
    h('span', null, 'Suelta aquí varias figuras a la vez, o'),
    h('button', { class: 'btn btn-sm', onclick: () => entrada.click() }, '＋ Añadir figuras…'), entrada);
  zona.addEventListener('dragover', e => { e.preventDefault(); zona.classList.add('on'); });
  zona.addEventListener('dragleave', () => zona.classList.remove('on'));
  zona.addEventListener('drop', e => { e.preventDefault(); zona.classList.remove('on'); meteArchivos(e.dataTransfer.files); });

  const ctr = h('div', { class: 'gal-ctr' });
  const segModo = h('div', { class: 'seg' });
  GAL_MODOS.forEach(m => segModo.append(h('button', { class: g.modo === m.id ? 'on' : '', title: m.d,
    onclick: () => { g.modo = m.id; $$('button', segModo).forEach(x => x.classList.toggle('on', x.textContent === m.n)); pinta(); } }, m.n)));
  ctr.append(h('span', { class: 'mo-par' }, h('span', { class: 'an-et' }, 'Disposición'), segModo));
  const segCols = h('div', { class: 'seg' });
  [2, 3, 4].forEach(n => segCols.append(h('button', { class: g.cols === n ? 'on' : '',
    onclick: () => { g.cols = n; $$('button', segCols).forEach(x => x.classList.toggle('on', +x.textContent === n)); pinta(); } }, String(n))));
  ctr.append(h('span', { class: 'mo-par' }, h('span', { class: 'an-et' }, 'Columnas'), segCols));
  ctr.append(h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: g.letras !== false,
    onchange: e => { g.letras = e.target.checked; pinta(); } }), 'Numerar (a), (b), (c)'));

  pinta();
  const cuerpo = h('div', null, vista, ctr, zona, estado, lista,
    h('p', { class: 'hint' }, 'En el .tex sale como una figura con minipages —lo mismo que se hace en un artículo— y cada pie pequeño se convierte en su subtítulo. El estilo de figura (forma, marco, filtro) se aplica a todas a la vez desde la pestaña Bloque.'));
  const listo = h('button', { class: 'btn btn-pri', onclick: () => {
    if (cargando) return;
    if (S.deck !== deck || curSlide() !== slide || findBlock(b.id)?.block !== b || b.locked) {
      toast('La diapositiva o la galería cambió; vuelve a abrirla.', 'warn'); closeModal(); return;
    }
    b.gal = g; commit(); closeModal();
  } }, 'Listo');
  openModal({
    title: 'Galería de figuras', size: 'modal-lg', body: cuerpo,
    foot: [listo], onclose: () => { cerrado = true; }
  });
}

/* ---------- a LaTeX ----------
   Filas de minipages: compila en cualquier parte, sin subcaption. */
function galeriaTex(b, p) {
  const g = galDe(b);
  if (!g.imgs.length) return p + '% (galería vacía)';
  const cols = galColumnas(g);
  const L = [];
  L.push(p + '\\begin{figure}');
  L.push(p + '  \\centering');
  if (g.modo === 'mosaico' && g.imgs.length > 1) {
    const anchoG = 0.56, anchoP = 0.40;
    L.push(p + `  \\begin{minipage}[t]{${anchoG}\\linewidth}\\centering`);
    L.push(p + '    ' + figNombreTex(b, 0, 1));
    if (g.letras || g.imgs[0].cap) L.push(p + '    \\\\[2pt] {\\scriptsize ' + subpie(g, 0) + '}');
    L.push(p + '  \\end{minipage}\\hfill');
    L.push(p + `  \\begin{minipage}[t]{${anchoP}\\linewidth}\\centering`);
    g.imgs.slice(1).forEach((im, k) => {
      L.push(p + '    ' + figNombreTex(b, k + 1, 1));
      if (g.letras || im.cap) L.push(p + '    \\\\[1pt] {\\scriptsize ' + subpie(g, k + 1) + '}');
      if (k < g.imgs.length - 2) L.push(p + '    \\\\[4pt]');
    });
    L.push(p + '  \\end{minipage}');
  } else {
    const ancho = (0.98 / cols - 0.015).toFixed(3);
    g.imgs.forEach((im, i) => {
      L.push(p + `  \\begin{minipage}[t]{${ancho}\\linewidth}\\centering`);
      L.push(p + '    ' + figNombreTex(b, i, 1));
      if (g.letras || im.cap) L.push(p + '    \\\\[2pt] {\\scriptsize ' + subpie(g, i) + '}');
      L.push(p + '  \\end{minipage}' + ((i + 1) % cols === 0 || i === g.imgs.length - 1 ? '' : '\\hfill'));
      if ((i + 1) % cols === 0 && i < g.imgs.length - 1) L.push(p + '  \\\\[6pt]');
    });
  }
  if ((b.caption || '').trim()) L.push(p + '  \\caption{' + texInline(b.caption) + '}');
  L.push(p + '\\end{figure}');
  return L.join('\n');
}
const galNombre = (b, i) => 'gal-' + String(b.id).replace(/[^a-z0-9]/gi, '').slice(-6) + '-' + LETRAS_FIG[i];
function figNombreTex(b, i, ancho) { return `\\erlenfig{${(+ancho || 1).toFixed(2)}}{${galNombre(b, i)}}`; }
function subpie(g, i) {
  const im = g.imgs[i];
  const et = (g.letras ? '(' + LETRAS_FIG[i] + ')' : '') + (im.cap ? (g.letras ? ' ' : '') + im.cap : '');
  return texInline(et);
}


