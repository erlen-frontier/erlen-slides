/* ==== 05-editor.js ==== */
'use strict';
/* ================= lienzo: zoom, selección, edición en vivo ================= */
const MULTILINE = new Set(['text', 'code', 'bblock', 'quote', 'teorema']);

const EN_VERTICAL = () => window.matchMedia('(max-width:920px) and (orientation:portrait)').matches;
function effZoom() {
  const [W, H] = slideDims(S.deck);
  const sc = $('#canvasScroll');
  const estrecho = window.matchMedia('(max-width:920px)').matches;
  const pad = estrecho ? 22 : 56;
  /* En escritorio se reserva al menos el relleno real del lienzo (38 px por lado
     desde 08-slides.css) más un pequeño margen; si no se puede medir, 56. En
     pantallas estrechas el relleno es fijo y pequeño (08-slides.css). */
  let pw = pad, ph = pad;
  if (!estrecho) {
    const cs = getComputedStyle(sc), px = k => parseFloat(cs[k]);
    const padX = px('paddingLeft') + px('paddingRight') + 6, padY = px('paddingTop') + px('paddingBottom') + 6;
    if (isFinite(padX)) pw = Math.max(padX, pad);
    if (isFinite(padY)) ph = Math.max(padY, pad);
  }
  /* En vertical el lienzo se ajusta al alto de la diapositiva, así que medir
     ese alto para decidir la escala sería morderse la cola: manda el ancho. */
  const fit = EN_VERTICAL()
    ? Math.min((sc.clientWidth - pw) / W, 1.5)
    : Math.min((sc.clientWidth - pw) / W, (sc.clientHeight - ph) / H, 1.5);
  return S.zoom || Math.max(0.08, fit);
}

function renderCanvas() {
  const [W, H] = slideDims(S.deck);
  if (curSlide().lienzoLibre) {
    const ids = idsSeleccionados();
    let actual = S.selBlock && findBlock(S.selBlock);
    if (S.selBlock && (!actual || actual.slide !== curSlide() || (typeof bloqueVisible === 'function' && !bloqueVisible(actual.block, S.deck)))) {
      S.selBlock = Array.from(ids).at(-1) || null;
      actual = S.selBlock && findBlock(S.selBlock);
    }
    if (!S.selBlock) ids.clear();
    else if (!ids.has(S.selBlock) && actual) {
      ids.clear();
      const grupo = actual.block.group;
      for (const b of zonas(curSlide()).flat()) if ((b.id === S.selBlock || (grupo && b.group === grupo)) &&
        (typeof bloqueVisible !== 'function' || bloqueVisible(b, S.deck))) ids.add(b.id);
    }
  }
  const z = effZoom();
  const stage = $('#stage'), inner = $('#stageInner');
  const foco = document.activeElement;
  const bloqueFoco = foco?.closest?.('.blk[data-bid]');
  const restaurarFoco = curSlide().lienzoLibre && bloqueFoco && inner.contains(bloqueFoco) && bloqueFoco.dataset.bid === S.selBlock
    ? { id: bloqueFoco.dataset.bid, tabindex: bloqueFoco.getAttribute('tabindex'), role: bloqueFoco.getAttribute('role') } : null;
  stage.style.width = W * z + 'px'; stage.style.height = H * z + 'px';
  inner.style.transform = `scale(${z})`;
  inner.innerHTML = '';
  inner.append(renderSlide(S.deck, S.cur, 'edit'));
  $('#zoomLabel').textContent = Math.round(z * 100) + '%';
  const libre = $('#lienzoLibreBtn');
  if (libre) {
    const disponible = zonasDe(curSlide().layout) > 0;
    libre.disabled = !disponible;
    libre.setAttribute('aria-pressed', String(!!curSlide().lienzoLibre && disponible));
    libre.title = disponible ? 'Activar o desactivar la colocación libre en esta diapositiva' : 'Este diseño no admite bloques';
  }
  const objetos = $('#lienzoObjetosBtn');
  if (objetos) { objetos.hidden = !(curSlide().lienzoLibre && zonasDe(curSlide().layout)); objetos.disabled = !zonas(curSlide()).some(z => z.length); }
  const iman = $('#lienzoImanBtn');
  if (iman) {
    iman.hidden = !(curSlide().lienzoLibre && zonasDe(curSlide().layout));
    iman.setAttribute('aria-pressed', String(S.prefs?.imanLienzo !== false));
  }
  mountToolbar();
  pintaSeleccionBloques();
  if (restaurarFoco) {
    const destino = Array.from(inner.querySelectorAll('.blk[data-bid]')).find(el => el.dataset.bid === restaurarFoco.id);
    if (destino) {
      destino.setAttribute('tabindex', restaurarFoco.tabindex ?? '0');
      destino.setAttribute('role', restaurarFoco.role || 'group');
      const b = findBlock(restaurarFoco.id)?.block;
      destino.setAttribute('aria-label', etiquetaBloqueLibre(restaurarFoco.id, b));
      destino.focus({ preventScroll: true });
    }
  }
  /* Modo esqueleto: el lienzo queda tapado hasta que el argumento se sostiene. */
  const tapaVieja = $('#stage .esq-tapa'); if (tapaVieja) tapaVieja.remove();
  if (typeof enEsqueleto === 'function' && enEsqueleto() && !(typeof AR !== 'undefined' && AR.on)) stage.append(tapaEsqueleto());
  if (typeof pintaMirada === 'function' && MIRADA.on) pintaMirada();
}

/* ---------- selección + barra de bloque ---------- */
function selectBlock(id, aditiva = false) {
  marcaSeleccionBloques(id, aditiva);
  const marcados = idsSeleccionados();
  if (id && !marcados.has(id)) id = Array.from(marcados).at(-1) || null;
  const antes = S.selBlock;
  S.selBlock = id;
  $$('#stageInner .blk.sel').forEach(e => e.classList.remove('sel'));
  const tb = $('#stageInner .blk-toolbar'); if (tb) tb.remove();
  $$('#stageInner .ancho-asa').forEach(e => e.remove());
  $$('#stageInner .libre-asa').forEach(e => e.remove());
  if (id) {
    const el = $(`#stageInner .blk[data-bid="${id}"]`);
    if (el) { el.classList.add('sel'); mountToolbar(); }
  }
  /* El panel derecho sigue al bloque: se abre en «Bloque» al seleccionar y
     vuelve a la pestaña anterior al soltar. */
  if (id && S.tab !== 'bloque') { S.tabPrev = S.tab; S.tab = 'bloque'; }
  else if (!id && S.tab === 'bloque') S.tab = S.tabPrev || 'insert';
  if (id !== antes || S.tab === 'bloque') renderInspector();
}
function etiquetaBloqueLibre(id, b) {
  const nombre = (BLOCK_DEFS.find(d => d.id === b?.type) || {}).name || b?.type || 'Bloque';
  const seleccion = idsSeleccionados();
  const varios = seleccion.has(id) && seleccion.size > 1;
  const bloqueada = varios && [...seleccion].some(k => findBlock(k)?.block.locked);
  return varios
    ? seleccion.size + ' bloques seleccionados, ' + nombre + ' activo. ' + (bloqueada ? 'Desbloquea la selección antes de moverla.' : 'Usa las flechas para moverlos juntos.')
    : nombre + (b?.locked ? ', bloqueado' : ', usa las flechas para mover y Mayús con flechas para cambiar el tamaño');
}
function enfocaBloqueLibre(id) {
  const b = id && findBlock(id)?.block;
  const destino = b && Array.from(document.querySelectorAll('#stageInner .blk[data-bid]')).find(el => el.dataset.bid === String(id));
  if (!destino) return;
  destino.tabIndex = 0; destino.setAttribute('role', 'group');
  destino.setAttribute('aria-label', etiquetaBloqueLibre(id, b));
  destino.focus({ preventScroll: true });
}
function mountToolbar() {
  const old = $('#stageInner .blk-toolbar'); if (old) old.remove();
  $$('#stageInner .ancho-asa').forEach(e => e.remove());
  $$('#stageInner .libre-asa').forEach(e => e.remove());
  if (!S.selBlock) return;
  const el = $(`#stageInner .blk[data-bid="${S.selBlock}"]`);
  const f = findBlock(S.selBlock);
  if (!el || !f) return;
  if (f.block.locked) {
    el.append(h('div', { class: 'blk-toolbar' }, h('button', { onclick: () => { f.block.locked = false; commit(); } }, 'Desbloquear'))); return;
  }
  const k = clamp(1 / effZoom(), 0.6, 2.4);   // en móvil el zoom es bajo: la barra no debe volverse gigante
  const bar = h('div', { class: 'blk-toolbar', style: `top:-8px;right:0;transform:translateY(-100%) scale(${k});transform-origin:bottom right` });
  const add = (txt, title, fn, cls) => bar.append(h('button', { title, class: cls || '', onclick: e => { e.stopPropagation(); fn(e); } }, txt));
  const asa = h('button', { class: 'tb-asa', title: 'Arrastra para colocarlo en otro sitio o suéltalo sobre una miniatura' }, '⠿');
  asa.addEventListener('pointerdown', ev => curSlide().lienzoLibre ? iniciaGestoLibre(ev, S.selBlock, 'mover') : iniciaArrastre(ev, S.selBlock));
  asa.addEventListener('click', ev => ev.stopPropagation());
  bar.append(asa);
  if (curSlide().lienzoLibre) {
    add('↑', 'Adelantar capa', () => mueveCapaLibre(S.deck, curSlide(), S.selBlock, 'adelante'));
    add('↓', 'Retrasar capa', () => mueveCapaLibre(S.deck, curSlide(), S.selBlock, 'atras'));
  } else {
    add('↑', 'Subir bloque', () => moveBlock(S.selBlock, -1));
    add('↓', 'Bajar bloque', () => moveBlock(S.selBlock, 1));
  }
  if (f.block.type === 'table') {
    bar.append(h('div', { class: 'tb-sep2' }));
    add('▦', 'Filas y columnas…', ev => menuTabla(f.block, ev));
  }
  if (f.block.type === 'math') add('ƒ', 'Editar ecuación', () => openEqEditor(f.block));
  if (f.block.type === 'chem') add('⇌', 'Editar reacción', () => openChemEditor(f.block));
  if (f.block.type === 'image') { add('▣', 'Cambiar imagen', () => pickImage(f.block)); if (f.block.figura) add('✎', 'Editar capas de la figura', () => openFiguraCapas(f.block)); if (f.block.cientifico) add('✎', 'Editar fuente de la figura', () => cienciaReabrir(f.block)); }
  if (f.block.type === 'chart') add('∿', 'Editar datos y gráfica', () => openChartEditor(f.block));
  if (f.block.type === 'func') add('𝑓', 'Editar fórmulas y parámetros', () => openFuncEditor(f.block));
  if (f.block.type === 'video') add('▶', 'Cambiar video', () => pickVideo(f.block));
  if (f.block.type === 'smart') add('◈', 'Editar diagrama', () => openSmartEditor(f.block));
  if (f.block.type === 'estruct') add('⬡', 'Dibujar la estructura', () => openEstructura(f.block));
  if (f.block.type === 'montaje') add('⚗', 'Editar el montaje', () => openMontaje(f.block));
  if (f.block.type === 'teorema') add('∴', 'Tipo de enunciado', () => openTeorema(f.block));
  if (f.block.type === 'geo') add('△', 'Elegir la figura y sus rótulos', () => openGeometria(f.block));
  bar.append(h('div', { class: 'tb-sep2' }));
  add('⋯', 'Más acciones…', ev => menuBloque(f, ev));
  add('⚙', 'Propiedades en el panel', () => { S.tab = 'bloque'; renderInspector(); openDrawer(true); });
  add('✕', 'Eliminar bloque', () => delBlock(S.selBlock), 'tb-danger');
  el.append(bar);
  if (ARRASTRA_CUERPO[f.block.type]) {
    el.classList.add('blk-movible');
    if (!el._arrastraCuerpoMontado) {
      el._arrastraCuerpoMontado = true;
      el.addEventListener('pointerdown', ev => arrastraCuerpo(ev, f.block.id, el));
    }
  }
  if (curSlide().lienzoLibre) { if (idsSeleccionados().size <= 1) montaManijasLibres(el, f.block); }
  else montaManija(el, f.block);
  /* Si arriba no cabe, la barra se mete dentro del bloque: así nunca tapa
     el título del marco ni se queda fuera del alcance del ratón. */
  const cuerpo = el.closest('.fbody') || el.closest('.slide');
  if (cuerpo && bar.getBoundingClientRect().top < cuerpo.getBoundingClientRect().top + 2) {
    bar.style.top = '4px';
    bar.style.transform = `scale(${k})`;
    bar.style.transformOrigin = 'top right';
  }
}

/* ---------- menús de la barra del bloque ----------
   Antes una tabla mostraba once botones seguidos. Las acciones que no se usan
   a cada rato viven ahora en dos menús, y la barra baja a siete. */
function menuTabla(b, ev) {
  const menu = h('div', { class: 'menu' });
  const it = (ic, lab, sub, fn, off) => menu.append(h('button', { disabled: !!off, onclick: () => { closeMenus(); fn(); } },
    h('span', { class: 'mi' }, ic), h('span', null, lab), sub ? h('span', { class: 'msub' }, sub) : null));
  const cols = b.rows[0] ? b.rows[0].length : 0;
  it('＋', 'Agregar fila', b.rows.length + ' ahora', () => { b.rows.push(Array(cols || 3).fill('')); commit(); });
  it('－', 'Quitar la última fila', null, () => { if (b.rows.length > 1) { b.rows.pop(); commit(); } }, b.rows.length < 2);
  menu.append(h('div', { class: 'm-sep' }));
  it('＋', 'Agregar columna', cols + ' ahora', () => { b.rows.forEach(r => r.push('')); commit(); });
  it('－', 'Quitar la última columna', null, () => { if (cols > 1) { b.rows.forEach(r => r.pop()); commit(); } }, cols < 2);
  menu.append(h('div', { class: 'm-sep' }));
  it(b.header ? '☑' : '☐', 'Primera fila como encabezado', null, () => { b.header = !b.header; commit(); });
  it('◫', 'Alineación ' + ((b.align || 'c') === 'c' ? '→ izquierda' : '→ centrada'), null, () => { b.align = (b.align || 'c') === 'c' ? 'l' : 'c'; commit(); });
  showMenu(menu, ev.currentTarget || ev.target);
}
function menuBloque(f, ev) {
  const menu = h('div', { class: 'menu' });
  const it = (ic, lab, sub, fn) => menu.append(h('button', { onclick: () => { closeMenus(); fn(); } },
    h('span', { class: 'mi' }, ic), h('span', null, lab), sub ? h('span', { class: 'msub' }, sub) : null));
  /* Lo específico del tipo va primero: es lo que se busca al abrir el menú. */
  const b = f.block;
  let hubo = false;
  if (b.type === 'image' && b.src) {
    it('⛶', 'Encuadrar y recortar…', null, () => openRecorte(b));
    it('⊢', 'Barra de escala…', 'SEM, TEM, AFM', () => openEscala(b));
    hubo = true;
  }
  if (b.type === 'chart') {
    it('σ', 'Analizar la serie…', 'ajuste, pico, Scherrer, Tauc', () => openAnalisis(b));
    it('⚗', 'Tipo de medida y ejes…', null, () => openTecnica(b));
    it('▦', 'Crear tabla con estos datos', null, () => chartToTable(b));
    hubo = true;
  }
  if (hubo) menu.append(h('div', { class: 'm-sep' }));
  it('⧉', 'Duplicar el bloque', null, () => dupBlock(S.selBlock));
  it('⇥', 'Mover a otra diapositiva o zona…', null, () => openMoverBloque(f.block));
  menu.append(h('div', { class: 'm-sep' }));
  it('⚙', 'Propiedades', 'en el panel derecho', () => { S.tab = 'bloque'; renderInspector(); openDrawer(true); });
  it('▣', 'Propiedades en una ventana', null, () => openBlockProps(f.block));
  showMenu(menu, ev.currentTarget || ev.target);
}

/* ---------- edición de texto en sitio ---------- */
function ekParts(ek) { return ek.split(':'); }
function getRaw(ek) {
  const m = S.deck.meta, sl = curSlide();
  if (ek === 'meta.title') return m.title || '';
  if (ek === 'meta.subtitle') return m.subtitle || '';
  if (ek === 'meta.authors') return m.authors || '';
  if (ek === 'meta.institute') return m.institute || '';
  if (ek === 'meta.date') return m.date || '';
  if (ek === 'slide.title') return sl.title || '';
  if (ek === 'slide.subtitle') return sl.subtitle || '';
  if (ek.startsWith('zt:')) return (sl.zt || [])[+ek.slice(3)] || '';
  const p = ekParts(ek);
  const f = findBlock(p[1]); if (!f) return '';
  const b = f.block;
  if (p.length === 2) return b.type === 'bblock' ? (b.body || '') : (b.text || '');
  if (p[2] === 't') return b.btitle || '';
  if (p[2] === 'by') return b.by || '';
  if (p[2] === 'tt') return b.titulo || '';
  if (p[2] === 'body') return b.body || '';
  if (p[2] === 'cap' || p[2] === 'tcap') return b.caption || '';
  if (p[2] === 'li') return (b.items[+p[3]] || {}).t || '';
  if (p[2] === 'cell') { const [r, c] = p[3].split(',').map(Number); return (b.rows[r] || [])[c] || ''; }
  return '';
}
function setRaw(ek, v, deck = S.deck, cur = S.cur) {
  const m = deck.meta, sl = deck.slides[cur];
  if (ek === 'meta.title') { m.title = v; return; }
  if (ek === 'meta.subtitle') { m.subtitle = v; return; }
  if (ek === 'meta.authors') { m.authors = v; return; }
  if (ek === 'meta.institute') { m.institute = v; return; }
  if (ek === 'meta.date') { m.date = v; return; }
  if (ek === 'slide.title') { sl.title = v; return; }
  if (ek === 'slide.subtitle') { sl.subtitle = v; return; }
  if (ek.startsWith('zt:')) { sl.zt = sl.zt || []; sl.zt[+ek.slice(3)] = v; return; }
  const p = ekParts(ek);
  const f = findBlock(p[1], deck); if (!f) return;
  const b = f.block;
  if (p.length === 2) { if (b.type === 'bblock') b.body = v; else b.text = v; return; }
  if (p[2] === 't') { b.btitle = v; return; }
  if (p[2] === 'by') { b.by = v; return; }
  if (p[2] === 'tt') { b.titulo = v; return; }
  if (p[2] === 'body') { b.body = v; return; }
  if (p[2] === 'cap' || p[2] === 'tcap') { b.caption = v; return; }
  if (p[2] === 'li') { if (b.items[+p[3]]) b.items[+p[3]].t = v; return; }
  if (p[2] === 'cell') { const [r, c] = p[3].split(',').map(Number); if (b.rows[r]) b.rows[r][c] = v; return; }
}
function isMultiline(ek) {
  const p = ekParts(ek);
  if (p[0] !== 'b' || p.length !== 2) return false;
  const f = findBlock(p[1]);
  return f && MULTILINE.has(f.block.type);
}

let rawEl = null, rawCancel = false, pendingFocus = null;

/* ---------- dónde quedó el cursor ----------
   Para poder meter una cita en mitad de la frase después de elegirla en una
   ventana, hay que acordarse de dónde se estaba escribiendo: la ventana se lleva
   el foco y la selección del navegador se pierde. */
let ULTIMO_PUNTO = null;
function apuntaPunto() {
  if (!rawEl || !rawEl.isConnected) return;
  const sel = getSelection();
  if (!sel || !sel.focusNode || !rawEl.contains(sel.focusNode)) return;
  const r = document.createRange();
  r.selectNodeContents(rawEl);
  try { r.setEnd(sel.focusNode, sel.focusOffset); } catch (e) { return; }
  ULTIMO_PUNTO = { ek: rawEl.dataset.ek, pos: r.toString().length, cur: S.cur };
}
document.addEventListener('selectionchange', apuntaPunto);
/* Mete un texto donde quedó el cursor. Trabaja sobre la fuente del bloque, no
   sobre lo pintado, así que da igual que el foco ande en otra parte. */
function insertaEnPunto(txt) {
  const p = ULTIMO_PUNTO;
  if (!p || !txt || p.cur !== S.cur) return false;      /* se cambió de diapositiva */
  const actual = getRaw(p.ek);
  if (typeof actual !== 'string') { ULTIMO_PUNTO = null; return false; }
  const pos = clamp(p.pos, 0, actual.length);
  const antes = actual.slice(0, pos);
  /* La marca va pegada a la palabra, como se cita de verdad. */
  const puente = (antes && /\S$/.test(antes) && !/\s$/.test(antes)) ? '' : '';
  setRaw(p.ek, antes + puente + txt + actual.slice(pos));
  ULTIMO_PUNTO = { ek: p.ek, pos: pos + puente.length + txt.length, cur: S.cur };
  return true;
}
const hayPuntoDeTexto = () => !!(ULTIMO_PUNTO && ULTIMO_PUNTO.cur === S.cur);
function enterRaw(el) {
  if (rawEl === el) return;
  rawEl = el; rawCancel = false;
  el.classList.add('editing-raw');
  el.innerText = getRaw(el.dataset.ek);
  const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  S.editingRaw = true;
}
function leaveRaw(el, nextEk) {
  if (rawEl !== el) return;
  rawEl = null; S.editingRaw = false;
  const ek = el.dataset.ek;
  if (rawCancel) { rawCancel = false; renderCanvas(); return; }
  const v = el.innerText.replace(/\n$/, '');
  const changed = v !== getRaw(ek);
  setRaw(ek, v);
  if (changed && ek === 'slide.title' && typeof ensena === 'function' && typeof tituloGenerico === 'function' && tituloGenerico(v)) ensena('afirmacion', 'Ese título nombra la sección');
  pendingFocus = nextEk || null;
  if (changed) commit({ skipInsp: true }); else renderCanvas();
  if (pendingFocus) { focusEdit(pendingFocus); pendingFocus = null; }
}
/* Guarda lo que se esté escribiendo en línea antes de que otra acción vuelva a
   pintar el lienzo. Sin esto, escribir y pulsar «insertar» sin pasar por
   ningún otro sitio perdía el texto: el guardado solo llegaba al perder el foco. */
function flushEdicion() {
  if (rawEl) { const el = rawEl; try { el.blur(); } catch (e) { /* nada */ } if (rawEl === el) leaveRaw(el); }
}
function focusEdit(ek) {
  const el = $(`#stageInner [data-ek="${ek}"]`);
  if (el) el.focus();
}

/* ---------- arrastrar bloques ----------
   Con eventos de puntero, no con arrastre HTML5: así funciona igual con el
   ratón, con lápiz y con el dedo, que es donde el arrastre clásico no existe. */
let dragBlk = null, _lineaDrop = null, _destino = null, _chip = null, _miniDestino = null;

function montaManijasLibres(el, b) {
  const k = clamp(1 / effZoom(), 0.6, 2.4);
  for (const lado of ['nw', 'ne', 'sw', 'se']) {
    const asa = h('button', { type: 'button', class: 'libre-asa libre-' + lado,
      title: 'Cambiar el tamaño', 'aria-label': 'Cambiar el tamaño del bloque', style: `transform:scale(${k})` });
    asa.addEventListener('click', e => e.stopPropagation());
    asa.addEventListener('pointerdown', e => iniciaGestoLibre(e, b.id, lado));
    el.append(asa);
  }
}

/* Una lista independiente de la posición permite alcanzar también elementos
   completamente cubiertos por otros o al trabajar solo con teclado. */
function openObjetosLienzo() {
  const deck = S.deck, sl = curSlide();
  if (!sl.lienzoLibre || !zonasDe(sl.layout)) return;
  const lista = h('div', { class: 'lienzo-lista' }), marcados = new Set(idsSeleccionados());
  const selecciona = h('button', { class: 'btn btn-pri', disabled: !marcados.size, onclick: () => {
    if (S.deck !== deck || curSlide() !== sl) return;
    const bloques = bloquesEnCapas(sl).filter(b => marcados.has(b.id));
    if (!bloques.length) return;
    const grupos = new Set(bloques.map(b => b.group).filter(Boolean));
    for (const b of bloquesEnCapas(sl)) if (b.group && grupos.has(b.group)) marcados.add(b.id);
    const ultimo = bloques.at(-1);
    closeModal(); selectBlock(ultimo.id);
    const ids = idsSeleccionados(); ids.clear(); for (const id of marcados) ids.add(id);
    pintaSeleccionBloques(); mountToolbar(); enfocaBloqueLibre(ultimo.id);
  } }, 'Seleccionar marcados');
  function pinta() {
    lista.replaceChildren();
    const orden = bloquesEnCapas(sl).slice().reverse();
    orden.forEach((b, i) => {
      const nombre = (BLOCK_DEFS.find(d => d.id === b.type) || {}).name || b.type;
      const detalle = String(b.text || b.caption || b.title || b.tex || b.alt || '').replace(/\s+/g, ' ').slice(0, 80);
      const referencia = detalle || nombre;
      const oculto = typeof bloqueVisible === 'function' && !bloqueVisible(b, deck);
      const marca = h('input', { type: 'checkbox', disabled: oculto, checked: !oculto && marcados.has(b.id), 'aria-label': 'Marcar ' + referencia,
        onchange: e => { e.target.checked ? marcados.add(b.id) : marcados.delete(b.id); selecciona.disabled = !marcados.size; } });
      const elige = h('button', { type: 'button', class: 'btn lienzo-lista-nombre', disabled: oculto, onclick: () => {
        if (S.deck !== deck || curSlide() !== sl || !findBlock(b.id)) return;
        closeModal(); selectBlock(b.id); enfocaBloqueLibre(b.id);
      } }, (orden.length - i) + ' · ' + nombre + (detalle ? ' · ' + detalle : '') + (b.locked ? ' · bloqueado' : '') + (oculto ? ' · oculto en este nivel' : ''));
      const capa = (direccion, signo, etiqueta, desactivado) => h('button', { type: 'button', class: 'btn btn-sm',
        disabled: b.locked || oculto || desactivado, 'aria-label': etiqueta + ' capa ' + referencia,
        'data-capa-id': b.id, 'data-capa-direccion': direccion,
        onclick: () => { if (mueveCapaLibre(deck, sl, b.id, direccion)) {
          pinta();
          const botones = Array.from(lista.querySelectorAll('[data-capa-id]'));
          const siguiente = botones.find(n => n.dataset.capaId === String(b.id) && n.dataset.capaDireccion === direccion && !n.disabled);
          (siguiente || botones.find(n => n.dataset.capaId === String(b.id) && !n.disabled))?.focus();
        } } }, signo);
      lista.append(h('div', { class: 'lienzo-lista-fila' }, marca, elige,
        capa('adelante', '↑', 'Adelantar', i === 0), capa('atras', '↓', 'Retrasar', i === orden.length - 1)));
    });
  }
  pinta();
  openModal({ title: 'Bloques de la diapositiva', body: h('div', null,
    h('p', { class: 'hint' }, 'La primera capa está delante. Elige un bloque o marca varios para moverlos juntos.'), lista),
    foot: [h('button', { class: 'btn', onclick: closeModal }, 'Cerrar'), selecciona] });
}

/* La vista previa es solo DOM: cancelar nunca escribe en el modelo ni crea
   historial. El rectángulo medido incorpora el zoom real del navegador. */
function iniciaGestoLibre(ev, id, accion) {
  if (ev.button > 0 || !id || ev.ctrlKey || ev.metaKey || ev.shiftKey) return;
  if (typeof flushEdicion === 'function') flushEdicion();
  const deck = S.deck, sl = curSlide(), f = findBlock(id);
  const raiz = $('#stageInner .slide');
  const el = raiz && Array.from(raiz.querySelectorAll('.blk[data-bid]')).find(n => n.dataset.bid === id);
  if (!sl.lienzoLibre || S.selBlock !== id || !f || f.slide !== sl || f.block.locked || !el) return;
  const seleccion = idsSeleccionados();
  if (!seleccion.has(id)) { seleccion.clear(); seleccion.add(id); }
  const ids = seleccion.has(id) && seleccion.size > 1 ? [...seleccion] : [id];
  if (ids.length > 1 && accion !== 'mover') { toast('Selecciona un solo bloque para cambiar su tamaño.', 'warn'); return; }
  const porId = new Map(zonas(sl).flat().map(b => [b.id, b]));
  const bloques = ids.map(k => porId.get(k) || null);
  if (bloques.some(b => !b || b.locked)) { toast('Desbloquea los bloques seleccionados antes de moverlos.', 'warn'); return; }
  const nodos = new Map(Array.from(raiz.querySelectorAll('.blk[data-bid]')).map(n => [n.dataset.bid, n]));
  const elementos = ids.map(k => nodos.get(String(k)));
  if (elementos.some(n => !n)) return;
  const rect = raiz.getBoundingClientRect();
  if (!(rect.width > 0 && rect.height > 0)) return;
  ev.preventDefault(); ev.stopPropagation();
  const posiciones = bloques.map(b => ({ ...posicionLibreDe(sl, b) }));
  const p0 = posiciones[0], pointer = ev.pointerId;
  const limites = posiciones.reduce((a, p) => ({xMin:Math.min(a.xMin,p.x), yMin:Math.min(a.yMin,p.y),
    xMax:Math.max(a.xMax,p.x+p.w), yMax:Math.max(a.yMax,p.y+p.h)}), {xMin:100,yMin:100,xMax:0,yMax:0});
  const {xMin, yMin, xMax, yMax} = limites;
  const caja = {x:xMin, y:yMin, w:xMax-xMin, h:yMax-yMin};
  const x0 = ev.clientX, y0 = ev.clientY;
  let previa = p0, dxFinal = 0, dyFinal = 0, activo = false;
  try { ev.currentTarget.setPointerCapture(pointer); } catch (e) {}
  const mismo = e => pointer == null || e.pointerId === pointer;
  const pinta = (n, p) => Object.assign(n.style, { left: p.x + '%', top: p.y + '%', width: p.w + '%', height: p.h + '%' });
  const guias = g => {
    if (g.x == null && g.y == null) { quitaGuias(); return; }
    const capa = capaGuias(); if (!capa) return; capa.replaceChildren();
    if (g.x != null) capa.append(h('i', {class: 'guia-libre-v', style: 'left:' + g.x + '%'}));
    if (g.y != null) capa.append(h('i', {class: 'guia-libre-h', style: 'top:' + g.y + '%'}));
  };
  const mueve = e => {
    if (!mismo(e)) return;
    const dx = (e.clientX - x0) / rect.width * 100, dy = (e.clientY - y0) / rect.height * 100;
    if (!activo && Math.abs(e.clientX - x0) < 3 && Math.abs(e.clientY - y0) < 3) return;
    activo = true;
    const p = { ...p0 };
    if (accion === 'mover') {
      dxFinal = clamp(dx, -caja.x, 100 - caja.x - caja.w);
      dyFinal = clamp(dy, -caja.y, 100 - caja.y - caja.h);
      if (S.prefs?.imanLienzo !== false && !e.altKey) {
        const ajuste = imantaMovimientoLibre(sl, ids, caja, dxFinal, dyFinal, rect.width, rect.height);
        dxFinal = ajuste.dx; dyFinal = ajuste.dy; guias(ajuste.guias);
      } else {
        dxFinal = clamp(redondeaLibre(dxFinal), -caja.x, 100 - caja.x - caja.w);
        dyFinal = clamp(redondeaLibre(dyFinal), -caja.y, 100 - caja.y - caja.h);
        quitaGuias();
      }
      posiciones.forEach((q, i) => pinta(elementos[i], {...q,
        x:clamp(q.x + dxFinal, 0, 100 - q.w), y:clamp(q.y + dyFinal, 0, 100 - q.h)}));
      return;
    } else {
      if (accion.includes('e')) p.w = clamp(p0.w + dx, 1, 100 - p0.x);
      if (accion.includes('s')) p.h = clamp(p0.h + dy, 1, 100 - p0.y);
      if (accion.includes('w')) { p.x = clamp(p0.x + dx, 0, p0.x + p0.w - 1); p.w = p0.x + p0.w - p.x; }
      if (accion.includes('n')) { p.y = clamp(p0.y + dy, 0, p0.y + p0.h - 1); p.h = p0.y + p0.h - p.y; }
    }
    previa = Object.fromEntries(Object.entries(p).map(([k, v]) => [k, redondeaLibre(v)]));
    pinta(el, previa);
  };
  const quita = () => {
    document.removeEventListener('pointermove', mueve);
    document.removeEventListener('pointerup', suelta);
    document.removeEventListener('pointercancel', cancela);
    document.removeEventListener('keydown', escapa, true);
    document.body.classList.remove('arrastra-bloque');
    quitaGuias();
  };
  const restaura = () => elementos.forEach((n, i) => {
    if (!n.isConnected) return;
    const actual = S.deck === deck && curSlide() === sl && findBlock(ids[i])?.block === bloques[i] ? posicionLibreDe(sl, bloques[i]) : posiciones[i];
    pinta(n, actual);
  });
  const cancela = e => { if (e && e.type === 'pointercancel' && !mismo(e)) return; quita(); restaura(); };
  const escapa = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancela(); } };
  const suelta = e => {
    if (!mismo(e)) return;
    quita();
    const seleccionActual = idsSeleccionados();
    const vigente = S.deck === deck && curSlide() === sl && S.selBlock === id &&
      seleccionActual.size === ids.length && ids.every(k => seleccionActual.has(k)) &&
      bloques.every((b, i) => findBlock(ids[i])?.block === b && !b.locked &&
        (typeof bloqueVisible !== 'function' || bloqueVisible(b, deck)) &&
        ['x','y','w','h'].every(k => posicionLibreDe(sl, b)[k] === posiciones[i][k]));
    if (activo && vigente) {
      if (accion === 'mover') { if (!mueveSeleccionLibre(deck, sl, ids, dxFinal, dyFinal)) restaura(); }
      else if (!aplicaPosicionLibre(id, previa)) restaura();
    } else restaura();
  };
  document.body.classList.add('arrastra-bloque');
  document.addEventListener('pointermove', mueve);
  document.addEventListener('pointerup', suelta);
  document.addEventListener('pointercancel', cancela);
  document.addEventListener('keydown', escapa, true);
}

function limpiaMarcas() {
  if (_lineaDrop && _lineaDrop.parentNode) _lineaDrop.remove();
  _lineaDrop = null; _destino = null;
  $$('#stageInner [data-z].zona-activa').forEach(z => z.classList.remove('zona-activa'));
  $$('.fs-item.dragover-blk').forEach(z => z.classList.remove('dragover-blk'));
  _miniDestino = null;
}

function iniciaArrastre(ev, id) {
  if (!id || ev.button > 0 || findBlock(id)?.block.locked) return;
  ev.preventDefault(); ev.stopPropagation();
  const asa = ev.currentTarget;
  /* Los movimientos se escuchan en el documento: la captura del puntero falla
     en algunos navegadores y con lápiz, y entonces el bloque dejaba de recibir
     eventos en cuanto el cursor salía de él. */
  try { asa.setPointerCapture(ev.pointerId); } catch (e) {}
  let activo = false;
  const x0 = ev.clientX, y0 = ev.clientY;

  const mueve = e => {
    if (!activo) {
      if (Math.abs(e.clientX - x0) < 4 && Math.abs(e.clientY - y0) < 4) return;
      activo = true; dragBlk = id;
      document.body.classList.add('arrastra-bloque');
      _chip = h('div', { class: 'arrastre-chip' }, '⠿ moviendo el bloque');
      document.body.append(_chip);
    }
    _chip.style.left = e.clientX + 'px'; _chip.style.top = e.clientY + 'px';
    apuntaDestino(e.clientX, e.clientY);
  };
  const suelta = e => {
    document.removeEventListener('pointermove', mueve);
    document.removeEventListener('pointerup', suelta);
    document.removeEventListener('pointercancel', cancela);
    if (_chip) { _chip.remove(); _chip = null; }
    document.body.classList.remove('arrastra-bloque');
    if (!activo) { limpiaMarcas(); dragBlk = null; return; }
    const mini = _miniDestino, dest = _destino;
    limpiaMarcas(); dragBlk = null;
    if (mini != null) { if (moveBlockToSlide(id, mini, 0, null)) toast('Bloque movido a la diapositiva ' + (mini + 1)); }
    else if (dest) moveBlockToSlide(id, S.cur, dest.z, dest.i);
  };
  const cancela = () => {
    document.removeEventListener('pointermove', mueve);
    document.removeEventListener('pointerup', suelta);
    document.removeEventListener('pointercancel', cancela);
    if (_chip) { _chip.remove(); _chip = null; }
    document.body.classList.remove('arrastra-bloque');
    limpiaMarcas(); dragBlk = null;
  };
  document.addEventListener('pointermove', mueve);
  document.addEventListener('pointerup', suelta);
  document.addEventListener('pointercancel', cancela);
}

/* Decide qué hay bajo el dedo: una zona del lienzo o una miniatura. */
function apuntaDestino(x, y) {
  const bajo = document.elementFromPoint(x, y);
  if (!bajo) return;
  const mini = bajo.closest('.fs-item');
  if (mini) {
    if (_lineaDrop && _lineaDrop.parentNode) _lineaDrop.remove();
    _lineaDrop = null; _destino = null;
    $$('#stageInner [data-z].zona-activa').forEach(z => z.classList.remove('zona-activa'));
    const i = +mini.dataset.i;
    if (_miniDestino !== i) {
      $$('.fs-item.dragover-blk').forEach(z => z.classList.remove('dragover-blk'));
      mini.classList.add('dragover-blk'); _miniDestino = i;
    }
    return;
  }
  if (_miniDestino != null) { $$('.fs-item.dragover-blk').forEach(z => z.classList.remove('dragover-blk')); _miniDestino = null; }
  const cont = bajo.closest('[data-z]');
  if (cont && cont.closest('#stageInner')) marcaDestino(cont, y);
}
/* Coloca la guía de inserción dentro de la zona que está bajo el puntero. */
function marcaDestino(cont, y) {
  const hijos = Array.from(cont.children).filter(c => c.dataset && c.dataset.bid);
  let idx = hijos.length;
  for (let i = 0; i < hijos.length; i++) {
    const r = hijos[i].getBoundingClientRect();
    if (y < r.top + r.height / 2) { idx = i; break; }
  }
  const z = +cont.dataset.z || 0;
  if (_destino && _destino.z === z && _destino.i === idx && _lineaDrop && _lineaDrop.parentNode === cont) return;
  if (_lineaDrop && _lineaDrop.parentNode) _lineaDrop.remove();
  $$('#stageInner [data-z].zona-activa').forEach(x => x.classList.remove('zona-activa'));
  cont.classList.add('zona-activa');
  _lineaDrop = h('div', { class: 'drop-linea' });
  cont.insertBefore(_lineaDrop, hijos[idx] || null);
  _destino = { z, i: idx };
}

/* Crea un texto en la zona que el usuario está mirando y deja el cursor
   dentro: escribir es lo primero que se intenta al abrir una diapositiva. */
function nuevoTextoEnZona(z) {
  const n = zonasDe(curSlide().layout);
  S.insCol = n ? clamp((+z || 0) + 1, 1, n) : 1;
  addBlockToSlide('text', S.insCol);
  enfocaBloque(S.selBlock);
}
/* Pone el cursor al final del texto recién creado. */
function enfocaBloque(id) {
  if (!id) return;
  const blk = $(`#stageInner .blk[data-bid="${id}"]`);
  const el = blk && (blk.matches('[data-edit]') ? blk : blk.querySelector('[data-edit]'));
  if (!el) return;
  el.focus();
  try {
    const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  } catch (e) {}
}
/* Los bloques que no llevan texto dentro se arrastran agarrándolos, sin tener
   que apuntar al asa de la barra. */
const ARRASTRA_CUERPO = { image: 1, chart: 1, func: 1, video: 1, smart: 1, estruct: 1, montaje: 1, geo: 1, galeria: 1 };
/* El arrastre no empieza hasta que el puntero se mueve de verdad: así un clic
   sigue siendo un clic (seleccionar, doble clic para editar) y solo al mover
   se toma el bloque. */
function arrastraCuerpo(ev, id, el) {
  if (ev.button > 0 || !id) return;
  if (ev.ctrlKey || ev.metaKey || ev.shiftKey || S.selBlock !== id) return;
  if (ev.target.closest('.blk-toolbar, .ancho-asa, [data-edit], .sliders, button, input, a')) return;
  if (curSlide().lienzoLibre) { iniciaGestoLibre(ev, id, 'mover'); return; }
  const x0 = ev.clientX, y0 = ev.clientY;
  /* Se captura el puntero desde el principio: sin ello, en cuanto el cursor
     sale del bloque los movimientos dejan de llegar y el arrastre no arranca. */
  try { el.setPointerCapture(ev.pointerId); } catch (e) {}
  const quita = () => {
    document.removeEventListener('pointermove', mueve);
    document.removeEventListener('pointerup', quita);
    document.removeEventListener('pointercancel', quita);
  };
  const mueve = e => {
    if (Math.abs(e.clientX - x0) < 5 && Math.abs(e.clientY - y0) < 5) return;
    quita();
    iniciaArrastre({ button: 0, pointerId: e.pointerId, clientX: e.clientX, clientY: e.clientY,
      currentTarget: el, preventDefault() {}, stopPropagation() {} }, id);
  };
  document.addEventListener('pointermove', mueve);
  document.addEventListener('pointerup', quita);
  document.addEventListener('pointercancel', quita);
}

function initCanvasEvents() {
  const inner = $('#stageInner');
  const pie = $('.canvas-foot .foot-izq');
  if (pie && !$('#lienzoLibreBtn')) pie.append(h('button', { id: 'lienzoLibreBtn', type: 'button', class: 'btn btn-sm lienzo-control',
    'aria-pressed': 'false', onclick: alternaLienzoLibre }, 'Lienzo libre'));
  if (pie && !$('#lienzoObjetosBtn')) pie.append(h('button', { id: 'lienzoObjetosBtn', type: 'button', class: 'btn btn-sm',
    hidden: true, title: 'Elegir bloques y ordenar las capas', onclick: openObjetosLienzo }, 'Capas'));
  if (pie && !$('#lienzoImanBtn')) pie.append(h('button', { id: 'lienzoImanBtn', type: 'button', class: 'btn btn-sm lienzo-control',
    hidden: true, 'aria-pressed': 'true', title: 'Ajustar a guías al mover; mantén Alt para omitir el ajuste', onclick: e => {
      S.prefs.imanLienzo = S.prefs.imanLienzo === false; guardaPrefs();
      e.currentTarget.setAttribute('aria-pressed', String(S.prefs.imanLienzo));
    } }, 'Imán'));
  /* Arrastrar una imagen dispara el arrastre nativo del navegador, que cancela
     el puntero a media gesto. El lienzo tiene el suyo propio, con sus guías. */
  inner.addEventListener('dragstart', e => e.preventDefault());
  inner.addEventListener('mousedown', e => {
    if (e.target.closest('.sliders')) { e.stopPropagation(); return; }
    /* En mousedown y no en click: al soltar el ratón ya se ha ido el foco del
       texto anterior, y ese guardado vuelve a dibujar el lienzo, de modo que
       el clic caería sobre un marcador que ya no existe. */
    const nz = e.target.closest('[data-nueva-z]');
    if (nz) { e.preventDefault(); nuevoTextoEnZona(nz.dataset.nuevaZ); return; }
    const blk = e.target.closest('.blk');
    if (blk?.dataset.bid && (e.ctrlKey || e.metaKey || e.shiftKey) && !e.target.closest('.blk-toolbar')) {
      e.preventDefault();
      const id = blk.dataset.bid, deck = S.deck, slide = curSlide();
      if (slide.lienzoLibre) flushEdicion();
      const f = findBlock(id);
      if (deck !== S.deck || slide !== curSlide() || !f || f.slide !== slide) return;
      selectBlock(id, true);
      if (slide.lienzoLibre && S.selBlock) enfocaBloqueLibre(S.selBlock);
      return;
    }
    if (blk && blk.dataset.bid && blk.dataset.bid !== S.selBlock) {
      const ids = idsSeleccionados();
      if (curSlide().lienzoLibre && ids.size > 1 && ids.has(blk.dataset.bid)) {
        const anteriores = [...ids]; selectBlock(blk.dataset.bid);
        const actuales = idsSeleccionados(); actuales.clear(); anteriores.forEach(id => actuales.add(id)); pintaSeleccionBloques(); mountToolbar();
      } else selectBlock(blk.dataset.bid);
    }
    /* Insertar va a la columna donde acabas de hacer clic, no siempre a la primera. */
    const zc = e.target.closest('[data-z]');
    if (zc) {
      const n = zonasDe(curSlide().layout);
      const z = clamp((+zc.dataset.z || 0) + 1, 1, Math.max(1, n));
      if (n > 1 && S.insCol !== z) { S.insCol = z; if (S.tab === 'insert') renderInspector(); }
    }
  });
  inner.addEventListener('click', e => {
    if (e.target.closest('[data-nueva-z]')) return;
    if (e.ctrlKey || e.metaKey || e.shiftKey) return;
    const blk = e.target.closest('.blk');
    if (!blk) { if (!e.target.closest('.blk-toolbar')) selectBlock(null); return; }
    const f = findBlock(blk.dataset.bid); if (!f || f.block.locked) return;
    if (e.target.closest('.img-ph')) {
      if (f.block.type === 'image') pickImage(f.block);
      else if (f.block.type === 'math') openEqEditor(f.block);
      else if (f.block.type === 'chem') openChemEditor(f.block);
      else if (f.block.type === 'video') pickVideo(f.block);
    }
  });
  inner.addEventListener('dblclick', e => {
    const blk = e.target.closest('.blk');
    if (!blk) {
      const zc = e.target.closest('[data-z]');
      if (zc && !e.target.closest('[data-edit]')) nuevoTextoEnZona(zc.dataset.z);
      return;
    }
    const f = findBlock(blk.dataset.bid); if (!f || f.block.locked) return;
    if (f.block.type === 'math') openEqEditor(f.block);
    else if (f.block.type === 'chem') openChemEditor(f.block);
    else if (f.block.type === 'image' && f.block.figura) openFiguraCapas(f.block);
    else if (f.block.type === 'image' && f.block.cientifico) cienciaReabrir(f.block);
    else if (f.block.type === 'image' && f.block.src) pickImage(f.block);
    else if (f.block.type === 'chart') openChartEditor(f.block);
    else if (f.block.type === 'func') openFuncEditor(f.block);
    else if (f.block.type === 'video' && f.block.src) pickVideo(f.block);
    else if (f.block.type === 'smart') openSmartEditor(f.block);
    else if (f.block.type === 'estruct') openEstructura(f.block);
    else if (f.block.type === 'montaje') openMontaje(f.block);
    else if (f.block.type === 'geo') openGeometria(f.block);
    else if (f.block.type === 'galeria') openGaleria(f.block);
  });
  /* El texto de ayuda («Texto…») se pinta con una clase que solo se recalcula
     al redibujar: mientras escribes, se quita en cuanto hay algo escrito. */
  inner.addEventListener('input', e => {
    const el = e.target.closest('[data-edit]');
    if (el) el.classList.toggle('is-empty', !el.textContent.trim());
  });
  inner.addEventListener('focusin', e => {
    const el = e.target.closest('[data-edit]');
    if (el) enterRaw(el);
  });
  inner.addEventListener('focusout', e => {
    const el = e.target.closest('[data-edit]');
    if (!el || rawEl !== el) return;
    const rel = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest('[data-edit]') : null;
    leaveRaw(el, rel ? rel.dataset.ek : null);
  });
  inner.addEventListener('keydown', e => {
    const nz = e.target.closest('[data-nueva-z]');
    if (nz && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); nuevoTextoEnZona(nz.dataset.nuevaZ); return; }
    const el = e.target.closest('[data-edit]');
    if (!el) return;
    const ek = el.dataset.ek, p = ekParts(ek);
    if (e.key === 'Escape') { rawCancel = true; el.blur(); e.preventDefault(); return; }
    if (e.key === 'Enter' && !e.shiftKey) {
      if (p[2] === 'li') {
        e.preventDefault();
        const f = findBlock(p[1]); if (!f) return;
        const i = +p[3];
        const v = el.innerText.replace(/\n$/, '');
        rawEl = null; S.editingRaw = false;
        f.block.items[i].t = v;
        f.block.items.splice(i + 1, 0, { t: '', lvl: f.block.items[i].lvl || 0 });
        commit({ skipInsp: true });
        focusEdit(`b:${p[1]}:li:${i + 1}`);
        return;
      }
      if (!isMultiline(ek)) { e.preventDefault(); el.blur(); return; }
    }
    if (e.key === 'Tab' && p[2] === 'li') {
      e.preventDefault();
      const f = findBlock(p[1]); if (!f) return;
      const it = f.block.items[+p[3]]; if (!it) return;
      const v = el.innerText.replace(/\n$/, '');
      rawEl = null; S.editingRaw = false;
      it.t = v;
      it.lvl = clamp((it.lvl || 0) + (e.shiftKey ? -1 : 1), 0, 2);
      commit({ skipInsp: true });
      focusEdit(ek);
      return;
    }
    if (e.key === 'Tab' && p[2] === 'cell') {
      e.preventDefault();
      const f = findBlock(p[1]); if (!f) return;
      let [r, c] = p[3].split(',').map(Number);
      const v = el.innerText.replace(/\n$/, '');
      rawEl = null; S.editingRaw = false;
      if (f.block.rows[r]) f.block.rows[r][c] = v;
      const nc = f.block.rows[0].length;
      if (e.shiftKey) { c--; if (c < 0) { c = nc - 1; r = Math.max(0, r - 1); } }
      else { c++; if (c >= nc) { c = 0; r = Math.min(f.block.rows.length - 1, r + 1); } }
      commit({ skipInsp: true });
      focusEdit(`b:${p[1]}:cell:${r},${c}`);
      return;
    }
    if (e.key === 'Backspace' && p[2] === 'li' && el.innerText.trim() === '') {
      const f = findBlock(p[1]); if (!f || f.block.items.length <= 1) return;
      e.preventDefault();
      const i = +p[3];
      rawEl = null; S.editingRaw = false;
      f.block.items.splice(i, 1);
      commit({ skipInsp: true });
      if (i > 0) focusEdit(`b:${p[1]}:li:${i - 1}`);
      return;
    }
  });
  inner.addEventListener('paste', e => {
    const el = e.target.closest('[data-edit]'); if (!el) return;
    e.preventDefault();
    const txt = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, txt);
  });
}

/* ---------- imágenes ---------- */
let _imgTargetId = null;
function pickImage(b) {
  _imgTargetId = b.id;
  let inp = $('#imgFileInput');
  if (!inp) {
    inp = h('input', { type: 'file', id: 'imgFileInput', accept: 'image/*', style: 'display:none' });
    document.body.append(inp);
    inp.addEventListener('change', () => {
      const file = inp.files[0]; inp.value = '';
      if (!file) return;
      const f = findBlock(_imgTargetId); if (!f) return;
      const deck = S.deck;
      const aplica = url => {
        if (S.deck !== deck || findBlock(f.block.id)?.block !== f.block) return;
        if (f.block.locked) return;
        f.block.src = url; delete f.block.cientifico; delete f.block.figura; delete f.block.orig; delete f.block.recProp;
        commit(); disenadorAlPonerImagen(f.block);
      };
      const rd = new FileReader();
      rd.onload = () => {
        const url = rd.result;
        if (file.type === 'image/svg+xml' || file.size < 250000) { aplica(url); return; }
        const img = new Image();
        img.onload = () => {
          const MAX = 1600;
          let { width: w, height: hh } = img;
          if (Math.max(w, hh) > MAX) { const k = MAX / Math.max(w, hh); w = Math.round(w * k); hh = Math.round(hh * k); }
          const cv = h('canvas'); cv.width = w; cv.height = hh;
          cv.getContext('2d').drawImage(img, 0, 0, w, hh);
          aplica(file.type === 'image/png' ? cv.toDataURL('image/png') : cv.toDataURL('image/jpeg', 0.9));
        };
        img.onerror = () => { aplica(url); };
        img.src = url;
      };
      rd.readAsDataURL(file);
    });
  }
  inp.click();
}

/* ---------- orquestador ---------- */
function renderAll(opts) {
  opts = opts || {};
  renderFilmstrip();
  renderCanvas();
  if (!opts.skipInsp) renderInspector();   // también refresca la cinta
  else actualizaCinta();
  updateChrome();
  pintaPrimeraVez();
  pidePreparacion();
  pintaCodigo();
  if (typeof tutorFoto === 'function' && (!TUTOR_FOTO || !curSlide() || TUTOR_FOTO.id !== curSlide().id)) tutorFoto();
}
