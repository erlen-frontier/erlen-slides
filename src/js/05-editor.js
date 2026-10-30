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
  pintaBarraContextual();
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
  if (objetos) {
    objetos.hidden = !(curSlide().lienzoLibre && zonasDe(curSlide().layout));
    objetos.disabled = !zonasDe(curSlide().layout);
    objetos.setAttribute('aria-expanded', String(!!$('#panelCapas') && !$('#panelCapas').hidden));
  }
  const iman = $('#lienzoImanBtn');
  if (iman) {
    iman.hidden = !(curSlide().lienzoLibre && zonasDe(curSlide().layout));
    iman.setAttribute('aria-pressed', String(S.prefs?.imanLienzo !== false));
  }
  actualizaControlesComposicion();
  mountToolbar();
  pintaSeleccionBloques();
  pintaPanelCapas();
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
  $$('#stageInner .seleccion-marco').forEach(e => e.remove());
  if (id) {
    const el = $(`#stageInner .blk[data-bid="${id}"]`);
    if (el) { el.classList.add('sel'); mountToolbar(); }
  }
  /* El panel derecho sigue al bloque: se abre en «Bloque» al seleccionar y
     vuelve a la pestaña anterior al soltar. */
  if (id && S.tab !== 'bloque') { S.tabPrev = S.tab; S.tab = 'bloque'; }
  else if (!id && S.tab === 'bloque') S.tab = S.tabPrev || 'insert';
  if (id !== antes || S.tab === 'bloque') renderInspector();
  actualizaControlesComposicion();
  sincronizaPanelCapas();
  pintaBarraContextual();
}
function etiquetaBloqueLibre(id, b) {
  const nombre = (BLOCK_DEFS.find(d => d.id === b?.type) || {}).name || b?.type || 'Bloque';
  const seleccion = idsSeleccionados();
  const varios = seleccion.has(id) && seleccion.size > 1;
  const bloqueada = varios && [...seleccion].some(k => findBlock(k)?.block.locked);
  return varios
    ? seleccion.size + ' bloques seleccionados, ' + nombre + ' activo. ' + (bloqueada ? 'Desbloquea la selección antes de moverla.' : 'Usa las flechas para moverlos juntos y Mayús con flechas para cambiar el tamaño de la selección.')
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
  /* Algunas selecciones restauran varios ids después de elegir el activo. */
  pintaBarraContextual();
  const old = $('#stageInner .blk-toolbar'); if (old) old.remove();
  $$('#stageInner .ancho-asa').forEach(e => e.remove());
  $$('#stageInner .libre-asa').forEach(e => e.remove());
  $$('#stageInner .seleccion-marco').forEach(e => e.remove());
  if (!S.selBlock) return;
  const el = $(`#stageInner .blk[data-bid="${S.selBlock}"]`);
  const f = findBlock(S.selBlock);
  if (!el || !f) return;
  if (curSlide().lienzoLibre && idsSeleccionados().size > 1) montaMarcoSeleccionLibre();
  if (f.block.locked) {
    const varias = curSlide().lienzoLibre && idsSeleccionados().size > 1;
    el.append(h('div', { class: 'blk-toolbar' }, h('button', { onclick: () => cambiaBloqueoSeleccion(false) }, varias ? 'Desbloquear selección' : 'Desbloquear'))); return;
  }
  const k = clamp(1 / effZoom(), 0.6, 2.4);   // en móvil el zoom es bajo: la barra no debe volverse gigante
  const bar = h('div', { class: 'blk-toolbar', style: `top:-8px;right:0;transform:translateY(-100%) scale(${k});transform-origin:bottom right` });
  /* Perder el foco repinta el lienzo. Mantenerlo hasta el clic evita que el
     botón desaparezca antes de ejecutar su acción; esta vacía la edición. */
  bar.addEventListener('pointerdown', e => { if (rawEl && e.target.closest('button')) e.preventDefault(); });
  const add = (txt, title, fn, cls) => bar.append(h('button', { title, 'aria-label': title, class: cls || '', onclick: e => { e.stopPropagation(); fn(e); } }, txt));
  const asa = h('button', { class: 'tb-asa', title: 'Arrastra para colocarlo en otro sitio o suéltalo sobre una miniatura', 'aria-label': 'Mover bloque' }, '⠿');
  asa.addEventListener('pointerdown', ev => curSlide().lienzoLibre ? iniciaGestoLibre(ev, S.selBlock, 'mover') : iniciaArrastre(ev, S.selBlock));
  asa.addEventListener('click', ev => ev.stopPropagation());
  bar.append(asa);
  if (curSlide().lienzoLibre) {
    const varias = idsSeleccionados().size > 1;
    add('↑', varias ? 'Adelantar selección' : 'Adelantar capa', () => mueveCapasSeleccionadas('adelante'));
    add('↓', varias ? 'Retrasar selección' : 'Retrasar capa', () => mueveCapasSeleccionadas('atras'));
    if (idsSeleccionados().size === 1) bar.append(h('button', { type:'button', title:'Transformar objeto', 'aria-label':'Transformar objeto',
      onclick: e => { e.stopPropagation(); abrePanelLateral('bloque', 'Posición en la diapositiva'); } }, '↻'));
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
  add('⚙', 'Propiedades en el panel', () => abrePanelLateral('bloque'));
  add('✕', curSlide().lienzoLibre && idsSeleccionados().size > 1 ? 'Eliminar selección' : 'Eliminar bloque', eliminarSeleccionActiva, 'tb-danger');
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
  /* Si arriba no cabe, intenta colocar la barra debajo del objeto. No debe
     ocupar el propio texto que la persona acaba de seleccionar para editar. */
  const cuerpo = el.closest('.fbody') || el.closest('.slide');
  if (cuerpo && bar.getBoundingClientRect().top < cuerpo.getBoundingClientRect().top + 2) {
    const bloque = el.getBoundingClientRect(), limite = cuerpo.getBoundingClientRect();
    if (bloque.bottom + bar.getBoundingClientRect().height + 8 <= limite.bottom) {
      bar.style.top = 'calc(100% + 8px)';
      bar.style.transform = `scale(${k})`;
      bar.style.transformOrigin = 'top right';
    }
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
  it('⧉', curSlide().lienzoLibre && idsSeleccionados().size > 1 ? 'Duplicar selección' : 'Duplicar el bloque', null, duplicarSeleccionActiva);
  if (curSlide().lienzoLibre) {
    const seleccion = [...idsSeleccionados()], varias = seleccion.length > 1;
    const bloqueada = seleccion.some(id => findBlock(id)?.block.locked);
    it('▣', (bloqueada ? 'Desbloquear ' : 'Bloquear ') + (varias ? 'selección' : 'bloque'), null, () => cambiaBloqueoSeleccion(!bloqueada));
  }
  it('⇥', curSlide().lienzoLibre && idsSeleccionados().size > 1 ? 'Mover bloque activo a otra diapositiva o zona…' : 'Mover a otra diapositiva o zona…', null, () => openMoverBloque(f.block));
  menu.append(h('div', { class: 'm-sep' }));
  it('⚙', 'Propiedades', 'en el panel derecho', () => abrePanelLateral('bloque'));
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
  if (p.length === 2) {
    if (b.type === 'bblock') b.body = v;
    else if (b.type === 'text') cambiaTextoFormateado(b, v);
    else b.text = v;
    return;
  }
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

let rawEl = null, rawCancel = false, pendingFocus = null, rawFormato = null, rawAntes = null;

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
  const ctx = contextoBarra(), seleccion = ctx && capturaTextoBarra(ctx), rango = sel.rangeCount && sel.getRangeAt(0);
  const enInicio = rango && sel.focusNode === rango.startContainer && sel.focusOffset === rango.startOffset;
  const pos = seleccion ? (enInicio ? seleccion.inicio : seleccion.fin) : r.toString().length;
  ULTIMO_PUNTO = { ek: rawEl.dataset.ek, pos, cur: S.cur };
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
  const partes = ekParts(p.ek), bloque = partes[0] === 'b' && partes.length === 2 ? findBlock(partes[1])?.block : null;
  if (bloque?.type === 'text') reemplazaTextoFormateado(bloque, pos, pos, puente + txt);
  else setRaw(p.ek, antes + puente + txt + actual.slice(pos));
  ULTIMO_PUNTO = { ek: p.ek, pos: pos + puente.length + txt.length, cur: S.cur };
  return true;
}
const hayPuntoDeTexto = () => !!(ULTIMO_PUNTO && ULTIMO_PUNTO.cur === S.cur);
function pintaTextoEnEdicion(el, b) {
  if (!rangosFormatoTexto(b).length) el.innerText = b.text || '';
  else {
    const nodos = partesFormatoTexto(b).map(p => {
      const txt = document.createTextNode(b.text.slice(p.inicio, p.fin));
      const css = [];
      if (p.negrita !== (b.negrita === true)) css.push('font-weight:' + (p.negrita ? 'var(--speso-b,700)' : 'normal'));
      if (p.cursiva !== (b.cursiva === true)) css.push('font-style:' + (p.cursiva ? 'italic' : 'normal'));
      return css.length ? h('span', {style:css.join(';')}, txt) : txt;
    });
    el.replaceChildren(...nodos);
  }
  /* El navegador necesita un salto adicional para colocar el cursor en una
     línea final vacía; innerText lo descarta al guardar, no el salto real. */
  if ((b.text || '').endsWith('\n')) el.append(document.createTextNode('\n'));
}
function actualizaTextoEnEdicion(el, e) {
  if (!rawFormato || el !== rawEl) return;
  const anterior = rawFormato.text, nuevo = el.innerText.replace(/\n$/, ''), guardado = contextoBarra();
  const seleccion = guardado && capturaTextoBarra(guardado);
  if (anterior !== nuevo) {
    let a = rawAntes?.inicio, z = rawAntes?.fin;
    const diferencia = nuevo.length - anterior.length;
    if (a === z && diferencia < 0 && /^deleteContentBackward/.test(e.inputType || '')) a += diferencia;
    else if (a === z && diferencia < 0 && /^deleteContentForward/.test(e.inputType || '')) z -= diferencia;
    const n = nuevo.length - (anterior.length - z);
    if (Number.isInteger(a) && Number.isInteger(z) && a >= 0 && z <= anterior.length && n >= a &&
        anterior.slice(0, a) === nuevo.slice(0, a) && anterior.slice(z) === nuevo.slice(n))
      reemplazaTextoFormateado(rawFormato, a, z, nuevo.slice(a, n));
    else cambiaTextoFormateado(rawFormato, nuevo);
  }
  rawAntes = null;
  /* Durante la composición IME no se reemplazan nodos que el teclado controla. */
  if (!e.isComposing && seleccion && (rangosFormatoTexto(rawFormato).length || el.querySelector('span'))) {
    pintaTextoEnEdicion(el, rawFormato);
    restauraTextoBarra(seleccion);
  }
}
function enterRaw(el) {
  if (rawEl === el) return;
  rawEl = el; rawCancel = false;
  el.classList.add('editing-raw');
  const p = ekParts(el.dataset.ek), b = p[0] === 'b' && p.length === 2 ? findBlock(p[1])?.block : null;
  rawFormato = b?.type === 'text' ? {...b, text:String(b.text || ''), formatoTexto:deepCopy(b.formatoTexto || []), _original:b} : null;
  rawAntes = null;
  if (rawFormato) pintaTextoEnEdicion(el, rawFormato); else el.innerText = getRaw(el.dataset.ek);
  const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  S.editingRaw = true;
}
function leaveRaw(el, nextEk) {
  if (rawEl !== el) return;
  rawEl = null; S.editingRaw = false;
  const formato = rawFormato; rawFormato = null; rawAntes = null;
  const ek = el.dataset.ek;
  if (rawCancel) { rawCancel = false; renderCanvas(); return; }
  const v = el.innerText.replace(/\n$/, '');
  if (formato) cambiaTextoFormateado(formato, v);
  const changed = v !== getRaw(ek) || !!(formato && JSON.stringify(formato.formatoTexto || []) !== JSON.stringify(formato._original.formatoTexto || []));
  if (formato && findBlock(formato.id)?.block === formato._original) {
    formato._original.text = formato.text;
    if (formato.formatoTexto?.length) formato._original.formatoTexto = formato.formatoTexto;
    else delete formato._original.formatoTexto;
  } else setRaw(ek, v);
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
  if (typeof aplicaCambioPanelPendiente === 'function') aplicaCambioPanelPendiente();
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
  if (b.type === 'image' && b.src) {
    const giro = h('button', {type:'button', class:'libre-asa libre-giro', 'aria-label':'Girar figura',
      title:'Arrastra para girar; usa Intro para ajustar el ángulo', style:`transform:translateX(-50%) scale(${k})`}, '↻');
    giro.addEventListener('click', e => { e.stopPropagation(); if (e.detail === 0) abrePanelLateral('bloque', 'Posición en la diapositiva'); });
    giro.addEventListener('pointerdown', e => iniciaGiroLibre(e, b.id));
    el.append(giro);
  }
}

function iniciaGiroLibre(ev, id) {
  if (ev.button > 0) return;
  const deck = S.deck, slide = curSlide(), f = findBlock(id), seleccion = idsSeleccionados();
  const env = document.querySelector('#stageInner .blk[data-bid="' + id + '"] .imgwrap');
  if (!slide.lienzoLibre || S.selBlock !== id || seleccion.size !== 1 || !seleccion.has(id) ||
      !f || f.slide !== slide || f.block.type !== 'image' || f.block.locked || !env) return;
  const r = env.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return;
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2, x0 = ev.clientX, y0 = ev.clientY;
  const inicio = Math.atan2(y0 - cy, x0 - cx), anterior = {...transformacionLibreDe(f.block)};
  const posicion = {...posicionLibreDe(slide, f.block)}, pointer = ev.pointerId;
  let actual = anterior, activo = false;
  const mismo = e => pointer == null || e.pointerId === pointer;
  const vigente = () => deck === S.deck && slide === curSlide() && slide.lienzoLibre && S.selBlock === id &&
    idsSeleccionados().size === 1 && idsSeleccionados().has(id) && findBlock(id)?.block === f.block && !f.block.locked &&
    ['x','y','w','h'].every(k => posicionLibreDe(slide, f.block)[k] === posicion[k]) &&
    ['giro','voltearH','voltearV'].every(k => transformacionLibreDe(f.block)[k] === anterior[k]);
  const cap = env.parentElement?.querySelector(':scope > figcaption');
  const svg = env.closest('.slide')?.querySelector('.lienzo-conectores');
  const restaura = () => { if (env.isConnected) { env.style.transform = cssTransformacionLibre(transformacionLibreDe(f.block)); if (cap) ajustaPieImagen(env, cap); pintaConectoresLienzo(svg, slide, deck); } };
  const quita = () => {
    document.removeEventListener('pointermove', mueve); document.removeEventListener('pointerup', suelta);
    document.removeEventListener('pointercancel', cancela); document.removeEventListener('keydown', escapa, true);
    document.body.classList.remove('arrastra-bloque');
  };
  const cancela = e => { if (e?.type === 'pointercancel' && !mismo(e)) return; quita(); restaura(); };
  const escapa = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancela(); } };
  const mueve = e => {
    if (!mismo(e)) return;
    if (!vigente()) { cancela(); return; }
    if (!activo && Math.hypot(e.clientX - x0, e.clientY - y0) < 3) return;
    activo = true;
    let grados = anterior.giro + (Math.atan2(e.clientY - cy, e.clientX - cx) - inicio) * 180 / Math.PI;
    if (e.shiftKey) grados = Math.round(grados / 15) * 15;
    grados = redondeaLibre(((grados + 180) % 360 + 360) % 360 - 180);
    actual = {...anterior, giro:grados}; env.style.transform = cssTransformacionLibre(actual); if (cap) ajustaPieImagen(env, cap);
    pintaConectoresLienzo(svg, slide, deck, null, new Map([[id, grados]]));
  };
  const suelta = e => {
    if (!mismo(e)) return;
    quita();
    if (!activo || !vigente() || !aplicaTransformacionLibre(deck, slide, id, actual)) restaura();
  };
  ev.preventDefault(); ev.stopPropagation();
  try { ev.currentTarget.setPointerCapture(pointer); } catch (e) {}
  document.body.classList.add('arrastra-bloque');
  document.addEventListener('pointermove', mueve); document.addEventListener('pointerup', suelta);
  document.addEventListener('pointercancel', cancela); document.addEventListener('keydown', escapa, true);
}

function pintaMarcoSeleccionLibre(marco, posiciones) {
  if (!marco || !posiciones.length) return;
  const x = Math.min(...posiciones.map(p => p.x)), y = Math.min(...posiciones.map(p => p.y));
  const der = Math.max(...posiciones.map(p => p.x + p.w)), abajo = Math.max(...posiciones.map(p => p.y + p.h));
  Object.assign(marco.style, { left: x + '%', top: y + '%', width: (der - x) + '%', height: (abajo - y) + '%' });
}

function montaMarcoSeleccionLibre() {
  const sl = curSlide(), raiz = $('#stageInner .slide'), ids = [...idsSeleccionados()];
  const bloques = ids.map(id => findBlock(id)?.block);
  if (!raiz || ids.length < 2 || bloques.some(b => !b)) return;
  const bloqueada = bloques.some(b => b.locked), marco = h('div', { class: 'seleccion-marco', 'aria-hidden': bloqueada ? 'true' : null });
  pintaMarcoSeleccionLibre(marco, bloques.map(b => posicionLibreDe(sl, b)));
  if (!bloqueada) {
    const nombres = { nw: 'superior izquierda', ne: 'superior derecha', sw: 'inferior izquierda', se: 'inferior derecha' };
    const k = clamp(1 / effZoom(), 0.6, 2.4);
    for (const lado of Object.keys(nombres)) {
      const asa = h('button', { type: 'button', class: 'grupo-asa libre-' + lado,
        'aria-label': 'Cambiar tamaño de la selección: esquina ' + nombres[lado], title: 'Cambiar tamaño de la selección', style: `transform:scale(${k})` });
      asa.addEventListener('click', e => e.stopPropagation());
      asa.addEventListener('pointerdown', e => iniciaGestoLibre(e, S.selBlock, lado));
      marco.append(asa);
    }
  }
  raiz.append(marco);
}

/* El panel no es modal: el lienzo sigue disponible y ambos comparten la misma
   selección. La primera fila representa la capa más cercana a quien mira. */
let arrastreCapa = null, aplazaPanelCapas = false, panelCapasPendiente = false, temporizadorCapas = null, abridorPanelCapas = null;
function terminaInteraccionCapas() {
  if (!aplazaPanelCapas || arrastreCapa) return;
  clearTimeout(temporizadorCapas);
  temporizadorCapas = setTimeout(() => {
    aplazaPanelCapas = false; temporizadorCapas = null;
    if (panelCapasPendiente) { panelCapasPendiente = false; pintaPanelCapas(); }
  }, 0);
}
function limpiaIndicadorCapas() {
  $$('#panelCapas [data-insercion]').forEach(el => delete el.dataset.insercion);
}
function cierraPanelCapas() {
  const panel = $('#panelCapas'); if (!panel || panel.hidden) return;
  const dentro = panel.contains(document.activeElement);
  arrastreCapa = null; aplazaPanelCapas = false; panelCapasPendiente = false; clearTimeout(temporizadorCapas);
  limpiaIndicadorCapas(); panel.hidden = true;
  panel.querySelector('.capas-lista')?.replaceChildren();
  $('.canvas-wrap')?.classList.remove('capas-abierto');
  const boton = $('#lienzoObjetosBtn'); if (boton) boton.setAttribute('aria-expanded', 'false');
  renderCanvas();
  const destino = [abridorPanelCapas, boton].find(el => el?.isConnected && !el.disabled && !el.closest('[hidden]'));
  abridorPanelCapas = null;
  if (dentro && destino) destino.focus({preventScroll:true});
}
function seleccionaCapasVisibles() {
  const deck = S.deck, sl = curSlide();
  if (!sl.lienzoLibre || !zonasDe(sl.layout)) return;
  flushEdicion();
  if (deck !== S.deck || sl !== curSlide() || !sl.lienzoLibre) return;
  const visibles = bloquesEnCapas(sl).filter(b => bloqueVisible(b, deck));
  if (!visibles.length) return;
  const activo = visibles.find(b => b.id === S.selBlock)?.id || visibles.at(-1).id;
  selectBlock(activo);
  const ids = idsSeleccionados(); ids.clear(); visibles.forEach(b => ids.add(b.id));
  pintaSeleccionBloques(); mountToolbar();
}
function openObjetosLienzo(abridor) {
  const panel = $('#panelCapas'), sl = curSlide();
  if (!panel || !sl.lienzoLibre || !zonasDe(sl.layout)) return;
  if (!panel.hidden) { cierraPanelCapas(); return; }
  const control = abridor?.currentTarget || abridor;
  abridorPanelCapas = control?.tagName === 'BUTTON' ? control : document.activeElement;
  panel.hidden = false; $('.canvas-wrap').classList.add('capas-abierto');
  $('#lienzoObjetosBtn')?.setAttribute('aria-expanded', 'true');
  renderCanvas();
}
function iniciaPanelCapas() {
  const wrap = $('.canvas-wrap'); if (!wrap || $('#panelCapas')) return;
  const cerrar = h('button', {type:'button', class:'icon-btn', 'aria-label':'Cerrar panel de capas', title:'Cerrar panel de capas', onclick:cierraPanelCapas}, '✕');
  const lista = h('div', {class:'lienzo-lista capas-lista', role:'list', 'aria-label':'Orden de capas'});
  const todas = h('input', {type:'checkbox', 'data-panel-todas':'', title:'Seleccionar o desmarcar todas las capas visibles',
    onchange:e => { if (e.currentTarget.checked) seleccionaCapasVisibles(); else selectBlock(null); }});
  const seleccionar = h('button', {type:'button', class:'btn btn-sm', 'data-panel-seleccionar':'', onclick:() => {
    if (S.selBlock && idsSeleccionados().has(S.selBlock)) enfocaBloqueLibre(S.selBlock);
  }, title:'Enfocar la selección en el lienzo'}, 'Seleccionar marcados');
  const panel = h('aside', {id:'panelCapas', class:'panel-capas', role:'region', 'aria-label':'Capas de la diapositiva', hidden:true},
    h('div', {class:'capas-cab'}, h('div', null, h('strong', null, 'Capas'), h('span', null, 'De delante hacia atrás')), cerrar),
    h('p', {class:'capas-ayuda'}, 'En casillas y nombres, ↑↓ recorren capas; los botones de flecha las ordenan.'),
    h('div', {class:'capas-seleccion'}, h('label', {class:'capas-todas'}, todas, 'Marcar visibles'),
      h('p', {class:'capas-estado', role:'status', 'aria-live':'polite'})), lista,
    h('div', {class:'capas-pie'}, seleccionar));
  /* Perder el foco en un editor puede repintar el panel durante el primer
     clic. Mantener el nodo hasta soltar evita que ese clic se pierda. */
  panel.addEventListener('pointerdown', () => {
    aplazaPanelCapas = true;
    const suelta = e => {
      if (e.type === 'blur' && e.target !== window) return;
      document.removeEventListener('pointerup', suelta, true);
      document.removeEventListener('pointercancel', suelta, true);
      window.removeEventListener('blur', suelta, true);
      if (e.type === 'blur') { arrastreCapa = null; limpiaIndicadorCapas(); }
      terminaInteraccionCapas();
    };
    document.addEventListener('pointerup', suelta, true);
    document.addEventListener('pointercancel', suelta, true);
    window.addEventListener('blur', suelta, true);
  });
  panel.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cierraPanelCapas(); return; }
    if (e.defaultPrevented || e.isComposing || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const paso = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    const accion = e.target.dataset.capaAccion;
    if (!paso || (accion !== 'marca' && accion !== 'seleccionar')) return;
    const controles = Array.from(lista.querySelectorAll('[data-capa-accion="' + accion + '"]:not(:disabled)'));
    const indice = controles.indexOf(e.target); if (indice < 0) return;
    e.preventDefault();
    const destino = controles[indice + paso];
    if (destino) {
      destino.focus({preventScroll:true});
      destino.closest('[data-capa-fila]').scrollIntoView({block:'nearest', inline:'nearest'});
    }
  });
  wrap.append(panel);
}
function miniaturaCapa(b, nombre) {
  const mini = h('span', {class:'capa-mini', 'aria-hidden':'true'});
  if (b.type === 'image' && b.src) {
    const img = h('img', {src:b.src, alt:''}); aplicaVistaImagen(img, b.src, 'thumb'); mini.append(img);
  } else {
    const iconos = {text:'T', bullets:'≡', image:'▧', chart:'▥', func:'ƒ', math:'∑', chem:'⚗', table:'▦', galeria:'▤', video:'▶', smart:'◇'};
    mini.textContent = iconos[b.type] || String(nombre || '•').slice(0, 1).toUpperCase();
  }
  return mini;
}
function sincronizaPanelCapas() {
  const panel = $('#panelCapas'); if (!panel || panel.hidden) return;
  const sl = curSlide(), seleccion = idsSeleccionados(), orden = bloquesEnCapas(sl).slice().reverse();
  const disponibles = new Map(orden.map(b => [String(b.id), b]));
  const visibles = orden.filter(b => bloqueVisible(b, S.deck));
  const marcadas = visibles.filter(b => seleccion.has(b.id)).length;
  const todas = panel.querySelector('[data-panel-todas]');
  if (todas) {
    todas.disabled = !sl.lienzoLibre || !zonasDe(sl.layout) || !visibles.length;
    todas.checked = !!visibles.length && marcadas === visibles.length;
    todas.indeterminate = marcadas > 0 && marcadas < visibles.length;
  }
  const estado = panel.querySelector('.capas-estado');
  if (estado) estado.textContent = !sl.lienzoLibre || !zonasDe(sl.layout) ? 'Activa el lienzo libre en esta diapositiva.' :
    !orden.length ? 'Esta diapositiva todavía no tiene capas.' : seleccion.size ? seleccion.size + (seleccion.size === 1 ? ' capa seleccionada' : ' capas seleccionadas') : 'Ninguna capa seleccionada';
  const seleccionar = panel.querySelector('[data-panel-seleccionar]'); if (seleccionar) seleccionar.disabled = !seleccion.size;
  for (const fila of panel.querySelectorAll('[data-capa-fila]')) {
    const b = disponibles.get(fila.dataset.capaFila); if (!b) continue;
    const elegido = seleccion.has(b.id), varios = elegido && seleccion.size > 1;
    const ids = varios ? new Set(seleccion) : new Set([b.id]);
    const bloqueada = orden.some(x => ids.has(x.id) && x.locked);
    const oculto = typeof bloqueVisible === 'function' && !bloqueVisible(b, S.deck);
    fila.classList.toggle('seleccionada', elegido);
    fila.classList.toggle('activa', S.selBlock === b.id);
    const marca = fila.querySelector('[data-capa-accion="marca"]'); if (marca) marca.checked = elegido && !oculto;
    const asa = fila.querySelector('[data-capa-arrastrar]');
    if (asa) { asa.classList.toggle('deshabilitada', bloqueada || oculto); asa.setAttribute('draggable', String(!bloqueada && !oculto)); }
    for (const [direccion, paso, palabra] of [['adelante',-1,'Adelantar'], ['atras',1,'Retrasar']]) {
      const boton = fila.querySelector('[data-capa-direccion="'+direccion+'"]'); if (!boton) continue;
      const puede = orden.some((x, i) => ids.has(x.id) && orden[i + paso] && !ids.has(orden[i + paso].id));
      boton.disabled = oculto || bloqueada || !puede;
      boton.setAttribute('aria-label', palabra + (varios ? ' selección desde ' : ' capa ') + fila.dataset.capaReferencia);
    }
  }
}
function pintaPanelCapas() {
  const panel = $('#panelCapas'); if (!panel || panel.hidden) return;
  if (aplazaPanelCapas) { panelCapasPendiente = true; return; }
  const deck = S.deck, sl = curSlide(), lista = panel.querySelector('.capas-lista');
  if (arrastreCapa && (arrastreCapa.deck !== deck || arrastreCapa.slide !== sl)) arrastreCapa = null;
  const foco = document.activeElement, filaFoco = foco?.closest?.('[data-capa-fila]');
  const restaurar = panel.contains(foco) && filaFoco ? {id:filaFoco.dataset.capaFila, accion:foco.dataset.capaAccion} : null;
  const desplazamiento = lista.scrollTop;
  const orden = sl.lienzoLibre && zonasDe(sl.layout) ? bloquesEnCapas(sl).slice().reverse() : [];
  const actuales = new Map(Array.from(lista.children).map(fila => [fila.dataset.capaFila, fila]));
  const ids = new Set(orden.map(b => String(b.id)));
  for (const [id, fila] of actuales) if (!ids.has(id) || fila._capa?.deck !== deck || fila._capa?.slide !== sl) { fila.remove(); actuales.delete(id); }
  for (const [i, b] of orden.entries()) {
    const nombre = (BLOCK_DEFS.find(d => d.id === b.type) || {}).name || b.type;
    const detalle = String(b.text || b.caption || b.title || b.tex || b.alt || '').replace(/\s+/g, ' ').slice(0, 80);
    const referencia = detalle || nombre, oculto = typeof bloqueVisible === 'function' && !bloqueVisible(b, deck);
    let existente = actuales.get(String(b.id));
    const previo = existente?._capa;
    if (previo && previo.b === b && previo.nombre === nombre && previo.detalle === detalle && previo.oculto === oculto &&
        previo.locked === !!b.locked && previo.src === b.src && previo.tipo === b.type) {
      if (lista.children[i] !== existente) lista.insertBefore(existente, lista.children[i] || null);
      continue;
    }
    if (existente) existente.remove();
    const marca = h('input', {type:'checkbox', disabled:oculto, 'aria-label':'Marcar '+referencia, 'data-capa-accion':'marca',
      title:'Usa las flechas arriba y abajo para recorrer las capas', onchange:e => {
      if (S.deck !== deck || curSlide() !== sl || findBlock(b.id)?.block !== b) return;
      if (e.target.checked !== idsSeleccionados().has(b.id)) selectBlock(b.id, true);
    }});
    const asa = h('span', {class:'capa-asa', 'data-capa-arrastrar':'', draggable:'true', 'aria-hidden':'true',
      title:'Arrastrar para cambiar el orden'}, '⠿');
    const elige = h('button', {type:'button', class:'lienzo-lista-nombre', 'data-capa-accion':'seleccionar', disabled:oculto,
      title:'Usa las flechas arriba y abajo para recorrer las capas', onclick:e => {
      if (S.deck !== deck || curSlide() !== sl || findBlock(b.id)?.block !== b) return;
      selectBlock(b.id, e.ctrlKey || e.metaKey || e.shiftKey); if (S.selBlock) enfocaBloqueLibre(S.selBlock);
    }}, h('span', {class:'capa-nombre'}, detalle || nombre), h('span', {class:'capa-tipo'}, nombre + (oculto ? ' · oculto en este nivel' : '') + (b.locked ? ' · bloqueado' : '')));
    const capa = (direccion, signo, palabra) => h('button', {type:'button', class:'capa-accion', 'data-capa-id':b.id,
      'data-capa-accion':direccion, 'data-capa-direccion':direccion, 'aria-label':palabra+' capa '+referencia,
      onclick:() => {
        if (S.deck !== deck || curSlide() !== sl || findBlock(b.id)?.block !== b) return;
        const seleccion = idsSeleccionados(), ids = seleccion.has(b.id) ? [...seleccion] : [b.id];
        mueveCapasLibres(deck, sl, ids, direccion);
      }}, signo);
    const bloqueado = !!b.locked;
    const candado = sv('svg', {viewBox:'0 0 24 24', class:'capa-icono', 'aria-hidden':'true', focusable:'false'},
      sv('rect', {x:5,y:10,width:14,height:11,rx:2}),
      sv('path', {d:bloqueado ? 'M8 10V7a4 4 0 0 1 8 0v3' : 'M8 10V7a4 4 0 0 1 7.8-1.2'}));
    const bloqueo = h('button', {type:'button', class:'capa-accion capa-bloqueo', disabled:oculto, 'data-capa-accion':'bloqueo',
      'aria-label':(bloqueado ? 'Desbloquear' : 'Bloquear')+' capa '+referencia, title:bloqueado ? 'Desbloquear capa' : 'Bloquear capa',
      onclick:() => {
        if (S.deck !== deck || curSlide() !== sl || findBlock(b.id)?.block !== b) return;
        try {
          flushEdicion();
          if (S.deck === deck && curSlide() === sl && findBlock(b.id)?.block === b && !!b.locked === bloqueado)
            aplicaLoteBloques(deck, sl, [b.id], bloqueado ? 'desbloquear' : 'bloquear');
        } catch (error) { toast(error.message, 'warn'); }
      }}, candado);
    const fila = h('div', {class:'lienzo-lista-fila capa-fila', role:'listitem', 'data-capa-fila':b.id, 'data-capa-referencia':referencia},
      asa, marca, miniaturaCapa(b,nombre), elige, bloqueo, capa('adelante','↑','Adelantar'), capa('atras','↓','Retrasar'));
    fila._capa = {deck, slide:sl, b, nombre, detalle, oculto, locked:!!b.locked, src:b.src, tipo:b.type};
    asa.addEventListener('dragstart', e => {
      if (S.deck !== deck || curSlide() !== sl || findBlock(b.id)?.block !== b) { e.preventDefault(); return; }
      if (!idsSeleccionados().has(b.id)) selectBlock(b.id);
      const ids = [...idsSeleccionados()], bloques = bloquesEnCapas(sl);
      if (!ids.length || bloques.some(x => ids.includes(x.id) && x.locked)) { e.preventDefault(); toast('Desbloquea la selección antes de cambiar su orden.', 'warn'); return; }
      arrastreCapa = {deck, slide:sl, ids, orden:bloques.slice()};
      e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'tabula-capa');
    });
    asa.addEventListener('dragend', () => { arrastreCapa = null; limpiaIndicadorCapas(); terminaInteraccionCapas(); });
    const marcaDestino = e => {
      if (!arrastreCapa || arrastreCapa.deck !== S.deck || arrastreCapa.slide !== curSlide() || arrastreCapa.ids.includes(b.id)) return;
      e.preventDefault(); e.dataTransfer.dropEffect = 'move'; limpiaIndicadorCapas();
      const r = fila.getBoundingClientRect(); fila.dataset.insercion = e.clientY < r.top + r.height / 2 ? 'antes' : 'despues';
    };
    fila.addEventListener('dragenter', marcaDestino);
    fila.addEventListener('dragover', marcaDestino);
    fila.addEventListener('drop', e => {
      const arrastre = arrastreCapa; if (!arrastre) return;
      e.preventDefault(); e.stopPropagation(); const r = fila.getBoundingClientRect(), antes = e.clientY < r.top + r.height / 2;
      arrastreCapa = null; limpiaIndicadorCapas();
      const seleccion = idsSeleccionados();
      if (seleccion.size !== arrastre.ids.length || arrastre.ids.some(id => !seleccion.has(id))) return;
      insertaCapasLibres(arrastre.deck, arrastre.slide, arrastre.ids, b.id, antes, arrastre.orden);
    });
    lista.insertBefore(fila, lista.children[i] || null);
  }
  sincronizaPanelCapas(); lista.scrollTop = desplazamiento;
  if (restaurar) {
    const fila = Array.from(lista.querySelectorAll('[data-capa-fila]')).find(el => el.dataset.capaFila === restaurar.id);
    const destino = Array.from(fila?.querySelectorAll('[data-capa-accion]') || []).find(el => el.dataset.capaAccion === restaurar.accion && !el.disabled);
    (destino || fila?.querySelector('.lienzo-lista-nombre:not([disabled])'))?.focus({preventScroll:true});
  }
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
  if (accion !== 'mover' && !['nw', 'ne', 'sw', 'se'].includes(accion)) return;
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
  const proporcionInicial = ids.length === 1 && bloques[0].bloqueaProporcion === true;
  const p0 = posiciones[0], pointer = ev.pointerId;
  const limites = posiciones.reduce((a, p) => ({xMin:Math.min(a.xMin,p.x), yMin:Math.min(a.yMin,p.y),
    xMax:Math.max(a.xMax,p.x+p.w), yMax:Math.max(a.yMax,p.y+p.h)}), {xMin:100,yMin:100,xMax:0,yMax:0});
  const {xMin, yMin, xMax, yMax} = limites;
  const caja = {x:xMin, y:yMin, w:xMax-xMin, h:yMax-yMin};
  const x0 = ev.clientX, y0 = ev.clientY;
  let previa = p0, dxFinal = 0, dyFinal = 0, factorFinal = 1, activo = false;
  try { ev.currentTarget.setPointerCapture(pointer); } catch (e) {}
  const mismo = e => pointer == null || e.pointerId === pointer;
  const pinta = (n, p) => Object.assign(n.style, { left: p.x + '%', top: p.y + '%', width: p.w + '%', height: p.h + '%' });
  const svg = raiz.querySelector('.lienzo-conectores');
  const conectaVista = ps => pintaConectoresLienzo(svg, sl, deck, new Map(ids.map((id, i) => [id, ps[i]])));
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
      const nuevas = posiciones.map(q => ({...q, x:clamp(q.x + dxFinal, 0, 100 - q.w), y:clamp(q.y + dyFinal, 0, 100 - q.h)}));
      nuevas.forEach((q, i) => pinta(elementos[i], q));
      pintaMarcoSeleccionLibre(raiz.querySelector('.seleccion-marco'), nuevas); conectaVista(nuevas);
      return;
    } else if (ids.length > 1 || proporcionInicial) {
      const anchoPx = caja.w / 100 * rect.width, altoPx = caja.h / 100 * rect.height;
      const vx = (accion.includes('e') ? 1 : -1) * anchoPx, vy = (accion.includes('s') ? 1 : -1) * altoPx;
      factorFinal = 1 + ((e.clientX - x0) * vx + (e.clientY - y0) * vy) / (vx * vx + vy * vy);
      const nuevas = calculaEscalaLibre(posiciones, accion, factorFinal);
      if (nuevas) { nuevas.forEach((q, i) => pinta(elementos[i], q)); if (ids.length === 1) previa = nuevas[0]; pintaMarcoSeleccionLibre(raiz.querySelector('.seleccion-marco'), nuevas); conectaVista(nuevas); }
      return;
    } else {
      if (accion.includes('e')) p.w = clamp(p0.w + dx, 1, 100 - p0.x);
      if (accion.includes('s')) p.h = clamp(p0.h + dy, 1, 100 - p0.y);
      if (accion.includes('w')) { p.x = clamp(p0.x + dx, 0, p0.x + p0.w - 1); p.w = p0.x + p0.w - p.x; }
      if (accion.includes('n')) { p.y = clamp(p0.y + dy, 0, p0.y + p0.h - 1); p.h = p0.y + p0.h - p.y; }
    }
    previa = Object.fromEntries(Object.entries(p).map(([k, v]) => [k, redondeaLibre(v)]));
    pinta(el, previa); conectaVista([previa]);
  };
  const quita = () => {
    document.removeEventListener('pointermove', mueve);
    document.removeEventListener('pointerup', suelta);
    document.removeEventListener('pointercancel', cancela);
    document.removeEventListener('keydown', escapa, true);
    document.body.classList.remove('arrastra-bloque');
    quitaGuias();
  };
  const restaura = () => {
    const actuales = elementos.map((n, i) => {
      const actual = S.deck === deck && curSlide() === sl && findBlock(ids[i])?.block === bloques[i] ? posicionLibreDe(sl, bloques[i]) : posiciones[i];
      if (n.isConnected) pinta(n, actual);
      return actual;
    });
    if (raiz.isConnected) { pintaMarcoSeleccionLibre(raiz.querySelector('.seleccion-marco'), actuales); conectaVista(actuales); }
  };
  const cancela = e => { if (e && e.type === 'pointercancel' && !mismo(e)) return; quita(); restaura(); };
  const escapa = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancela(); } };
  const suelta = e => {
    if (!mismo(e)) return;
    quita();
    const seleccionActual = idsSeleccionados();
    const vigente = S.deck === deck && curSlide() === sl && S.selBlock === id &&
      seleccionActual.size === ids.length && ids.every(k => seleccionActual.has(k)) &&
      bloques.every((b, i) => findBlock(ids[i])?.block === b && !b.locked &&
        (ids.length > 1 || (b.bloqueaProporcion === true) === proporcionInicial) &&
        (typeof bloqueVisible !== 'function' || bloqueVisible(b, deck)) &&
        ['x','y','w','h'].every(k => posicionLibreDe(sl, b)[k] === posiciones[i][k]));
    if (activo && vigente) {
      if (accion === 'mover') { if (!mueveSeleccionLibre(deck, sl, ids, dxFinal, dyFinal)) restaura(); }
      else if (ids.length > 1) { if (!escalaSeleccionLibre(deck, sl, ids, accion, factorFinal)) restaura(); }
      else if (!aplicaPosicionLibre(id, previa)) restaura();
    } else restaura();
    if (raiz.isConnected) pintaMarcoSeleccionLibre(raiz.querySelector('.seleccion-marco'), bloques.map(b => posicionLibreDe(sl, b)));
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

function actualizaControlesComposicion() {
  const barra = $('#lienzoComposicion'); if (!barra) return;
  barra.hidden = !(curSlide().lienzoLibre && zonasDe(curSlide().layout));
  const organizar = $('#lienzoOrganizarBtn');
  if (organizar) organizar.disabled = idsSeleccionados().size < 2;
  actualizaCinta();
}

function alternaImanLienzo() {
  S.prefs.imanLienzo = S.prefs.imanLienzo === false; guardaPrefs();
  $('#lienzoImanBtn')?.setAttribute('aria-pressed', String(S.prefs.imanLienzo));
  actualizaCinta();
}

/* Los menús del pie y de la cinta comparten opciones y validaciones. */
function opcionesOrganizaLienzo() {
  const deck = S.deck, slide = curSlide(), ids = [...idsSeleccionados()];
  const bloqueada = ids.some(id => findBlock(id)?.block.locked);
  return [
    ['Alinear a la izquierda', 'izquierda'], ['Alinear al centro', 'centro'], ['Alinear a la derecha', 'derecha'],
    ['Alinear arriba', 'arriba'], ['Alinear en medio', 'medio'], ['Alinear abajo', 'abajo'],
    ['Distribuir horizontalmente', 'distribuir-h'], ['Distribuir verticalmente', 'distribuir-v']
  ].map(([etiqueta, accion]) => ({etiqueta, deshabilitado: () => bloqueada || ids.length < (accion.startsWith('distribuir') ? 3 : 2), accion: () => {
    const actuales = idsSeleccionados();
    if (S.deck !== deck || curSlide() !== slide || actuales.size !== ids.length || !ids.every(id => actuales.has(id))) {
      toast('La selección cambió. Vuelve a abrir Organizar.', 'warn'); return;
    }
    if (!organizaSeleccionLibre(deck, slide, ids, accion)) toast('No hay cambios que aplicar a la selección.', 'warn');
    if (S.selBlock) enfocaBloqueLibre(S.selBlock);
  }}));
}

function abreEstiloConector(deck, slide, conector, nombre, anchor) {
  if (deck !== S.deck || slide !== curSlide() || !slide.lienzoLibre || !slide.conectores?.includes(conector)) {
    toast('La conexión ya no está en esta diapositiva.', 'warn'); return;
  }
  if (anchor?.isConnected) anchor.focus();
  const captura = JSON.stringify(conector), estilo = estiloConector(conector);
  const color = h('input', {id:uid(), class:'field', type:'color', value:estilo.color || temaDe(deck).fg,
    disabled:!estilo.color});
  const tema = h('input', {type:'checkbox', checked:!estilo.color, onchange:e => { color.disabled = e.currentTarget.checked; }});
  const grosor = h('input', {id:uid(), class:'field', type:'number', min:'1', max:'8', step:'1',
    value:String(estilo.grosor ?? 3), required:true});
  const flecha = h('select', {id:uid(), class:'field'},
    [['fin', 'Flecha en destino'], ['ambos', 'Flechas en ambos extremos'], ['ninguna', 'Sin flechas']]
      .map(([valor, etiqueta]) => h('option', {value:valor, selected:(estilo.flecha || 'fin') === valor}, etiqueta)));
  const mensaje = h('p', {class:'hint', role:'status', 'aria-live':'polite'});
  const fila = (etiqueta, campo) => h('div', {class:'irow'},
    h('label', {for:campo.id}, etiqueta), h('div', {style:'flex:1.4'}, campo));
  const form = h('form', {id:uid(), class:'estilo-conector', onsubmit:e => {
    e.preventDefault();
    if (typeof flushEdicion === 'function') flushEdicion();
    if (deck !== S.deck || slide !== curSlide() || !slide.lienzoLibre ||
        !slide.conectores?.includes(conector) || JSON.stringify(conector) !== captura) {
      mensaje.textContent = 'La conexión cambió. Cierra este diálogo y vuelve a abrirlo.'; return;
    }
    const ancho = Number(grosor.value);
    if (!Number.isInteger(ancho) || ancho < 1 || ancho > 8) {
      mensaje.textContent = 'El grosor debe ser un número entero entre 1 y 8.'; grosor.focus(); return;
    }
    const siguiente = {...conector};
    delete siguiente.color; delete siguiente.grosor; delete siguiente.flecha;
    if (!tema.checked) siguiente.color = color.value;
    if (ancho !== 3) siguiente.grosor = ancho;
    if (flecha.value !== 'fin') siguiente.flecha = flecha.value;
    const cambio = JSON.stringify(siguiente) !== JSON.stringify(conector);
    if (cambio) {
      delete conector.color; delete conector.grosor; delete conector.flecha;
      Object.assign(conector, siguiente);
    }
    closeModal();
    if (cambio) { commit(); toast('Estilo de conexión actualizado', null, {t:'Deshacer', fn:doUndo}); }
  }}, h('p', null, nombre),
  h('label', {class:'check'}, tema, 'Usar color del tema'),
  fila('Color personalizado', color), fila('Grosor (1–8)', grosor), fila('Extremos', flecha), mensaje);
  openModal({title:'Estilo de conexión', size:'modal-sm', body:form, foot:[
    h('button', {class:'btn', type:'button', onclick:closeModal}, 'Cancelar'),
    h('button', {class:'btn btn-pri', type:'submit', form:form.id}, 'Aplicar')
  ]});
}

function opcionesConectoresLienzo() {
  const deck = S.deck, slide = curSlide(), ids = [...idsSeleccionados()], hasta = S.selBlock;
  const desde = ids.find(id => id !== hasta), bloques = new Map(zonas(slide).flat().map(b => [b.id, b]));
  const existe = (slide.conectores || []).some(c => c.desde === desde && c.hasta === hasta);
  const puede = ids.length === 2 && desde && hasta && ids.every(id => bloques.get(id)?.type !== 'spacer');
  const opciones = [{etiqueta: puede ? 'Conectar: ' + nombreConector(bloques.get(desde), slide) + ' → ' + nombreConector(bloques.get(hasta), slide) : 'Selecciona dos objetos para conectar',
    deshabilitado: () => !puede || existe, accion: () => {
    if (conectaBloques(deck, slide, desde, hasta)) {
      const visible = conectoresVisibles(slide, deck).some(c => c.desde === desde && c.hasta === hasta);
      toast(visible ? 'Conexión creada' : 'Conexión creada; separa los objetos para verla', null, {t:'Deshacer', fn:doUndo});
    }
    else toast('La selección cambió o la conexión ya existe.', 'warn');
  }}];
  for (const c of slide.conectores || []) {
    const nombre = nombreConector(bloques.get(c.desde), slide) + ' → ' + nombreConector(bloques.get(c.hasta), slide);
    opciones.push({etiqueta:'Editar conexión: ' + nombre, accion:anchor => abreEstiloConector(deck, slide, c, nombre, anchor)});
    opciones.push({etiqueta:'Eliminar conexión: ' + nombre, accion:() => {
      if (eliminaConector(deck, slide, c.desde, c.hasta)) toast('Conexión eliminada', null, {t:'Deshacer', fn:doUndo});
      else toast('La conexión ya no está en esta diapositiva.', 'warn');
    }});
  }
  return opciones;
}

function opcionesFormasLienzo() {
  return [['Rectángulo', 'rect'], ['Elipse', 'circle'], ['Línea', 'line'], ['Flecha', 'arrow']]
    .map(([etiqueta, tipo]) => ({etiqueta, accion:() => {
      insertaFormaLibre(tipo).catch(error => toast(error.message || 'No se pudo insertar la forma.', 'warn'));
    }}));
}

function menuOpcionesLienzo(anchor, opciones, clase = '') {
  const menu = h('div', {class:'menu' + (clase ? ' ' + clase : ''), role:'group', tabindex:'-1',
    'aria-label':anchor.getAttribute('aria-label') || anchor.textContent.trim()});
  for (const o of opciones) menu.append(h('button', {type:'button', disabled:!!o.deshabilitado?.(), onclick:() => {
    closeMenus(); o.accion(anchor);
  }}, o.etiqueta));
  showMenu(menu, anchor);
  menu.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const botones = [...menu.querySelectorAll('button:not([disabled])')], i = botones.indexOf(document.activeElement);
    if ((e.shiftKey && i <= 0) || (!e.shiftKey && i === botones.length - 1)) {
      closeMenus(); anchor.focus();
      if (e.shiftKey) e.preventDefault();
    }
  });
  (menu.querySelector('button:not([disabled])') || menu).focus();
}
function menuOrganizaLienzo(anchor) { menuOpcionesLienzo(anchor, opcionesOrganizaLienzo()); }
function menuConectoresLienzo(anchor) { menuOpcionesLienzo(anchor, opcionesConectoresLienzo(), 'menu-conectores'); }
function menuFormasLienzo(anchor) { menuOpcionesLienzo(anchor, opcionesFormasLienzo()); }

let ignoraClicLibre = false;
/* La selección por recuadro no interfiere con un clic, texto editable ni
   desplazamiento táctil. La selección solo se escribe al soltar el puntero. */
function iniciaSeleccionPorMarco(ev) {
  if (ev.button !== 0 || ev.pointerType === 'touch' || ev.ctrlKey || ev.metaKey ||
      ev.target.closest('.blk,.blk-toolbar,.grupo-asa,[data-nueva-z],[data-edit],button,input,select,textarea,a')) return;
  const raizInicial = ev.target.closest('.slide');
  if (!raizInicial || !curSlide().lienzoLibre) return;
  if (typeof flushEdicion === 'function') flushEdicion();
  const deck = S.deck, slide = curSlide(), raiz = $('#stageInner .slide'), inner = $('#stageInner');
  if (!raiz || !slide.lienzoLibre) return;
  const rect = raiz.getBoundingClientRect(); if (!(rect.width > 0 && rect.height > 0)) return;
  const inicial = new Set(idsSeleccionados()), activoInicial = S.selBlock, aditiva = ev.shiftKey;
  const punto = e => ({ x: clamp((e.clientX - rect.left) / rect.width * 100, 0, 100), y: clamp((e.clientY - rect.top) / rect.height * 100, 0, 100) });
  const desde = punto(ev), pointer = ev.pointerId, x0 = ev.clientX, y0 = ev.clientY;
  let marco = null, limites = null, activo = false;
  const mismo = e => pointer == null || e.pointerId === pointer;
  const quita = () => {
    document.removeEventListener('pointermove', mueve); document.removeEventListener('pointerup', suelta);
    document.removeEventListener('pointercancel', cancela); document.removeEventListener('keydown', escapa, true);
    if (marco) marco.remove();
  };
  const mueve = e => {
    if (!mismo(e)) return;
    if (!activo && Math.abs(e.clientX - x0) < 4 && Math.abs(e.clientY - y0) < 4) return;
    activo = true; const hasta = punto(e);
    limites = { x: Math.min(desde.x, hasta.x), y: Math.min(desde.y, hasta.y),
      w: Math.abs(hasta.x - desde.x), h: Math.abs(hasta.y - desde.y) };
    if (!marco) { marco = h('div', { class: 'lienzo-marquee', 'aria-hidden': 'true' }); raiz.append(marco); }
    Object.assign(marco.style, {left: limites.x + '%', top: limites.y + '%', width: limites.w + '%', height: limites.h + '%'});
    e.preventDefault();
  };
  const evitaClicAlSoltar = () => {
    ignoraClicLibre = true;
    setTimeout(() => { ignoraClicLibre = false; }, 0);
  };
  const cancela = e => {
    if (e?.type === 'pointercancel' && !mismo(e)) return;
    if (activo && e?.type === 'keydown') {
      ignoraClicLibre = true;
      const alSoltar = up => { if (!mismo(up)) return; document.removeEventListener('pointerup', alSoltar, true); evitaClicAlSoltar(); };
      document.addEventListener('pointerup', alSoltar, true);
    }
    quita();
  };
  const escapa = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancela(e); } };
  const suelta = e => {
    if (!mismo(e)) return;
    quita(); if (!activo || !limites) return;
    evitaClicAlSoltar();
    const actuales = idsSeleccionados();
    if (S.deck !== deck || curSlide() !== slide || !slide.lienzoLibre || S.selBlock !== activoInicial ||
        actuales.size !== inicial.size || [...inicial].some(id => !actuales.has(id))) return;
    const bloques = zonas(slide).flat().filter(b => typeof bloqueVisible !== 'function' || bloqueVisible(b, deck));
    const encontrados = bloques.filter(b => {
      const p = posicionLibreDe(slide, b);
      return p.x < limites.x + limites.w && p.x + p.w > limites.x && p.y < limites.y + limites.h && p.y + p.h > limites.y;
    });
    const grupos = new Set(encontrados.map(b => b.group).filter(Boolean));
    const ids = aditiva ? new Set(inicial) : new Set();
    for (const b of bloques) if (encontrados.includes(b) || (b.group && grupos.has(b.group))) ids.add(b.id);
    const ultimo = encontrados.at(-1)?.id || (aditiva ? [...ids].at(-1) : null);
    selectBlock(ultimo);
    const seleccion = idsSeleccionados(); seleccion.clear(); for (const id of ids) seleccion.add(id);
    pintaSeleccionBloques(); mountToolbar(); actualizaControlesComposicion();
    if (ultimo) enfocaBloqueLibre(ultimo);
  };
  try { inner.setPointerCapture(pointer); } catch (e) {}
  document.addEventListener('pointermove', mueve); document.addEventListener('pointerup', suelta);
  document.addEventListener('pointercancel', cancela); document.addEventListener('keydown', escapa, true);
}

function initCanvasEvents() {
  const inner = $('#stageInner');
  const pie = $('.canvas-foot .foot-izq');
  iniciaBarraContextual();
  iniciaPanelCapas();
  /* El navegador puede dejar un botón parcialmente recortado al recibir foco.
     Desplazar solo la tira mantiene visible también su anillo de foco. */
  pie?.addEventListener('focusin', e => {
    if (pie.scrollWidth <= pie.clientWidth) return;
    const tira = pie.getBoundingClientRect(), control = e.target.getBoundingClientRect();
    if (control.left < tira.left + 6) pie.scrollLeft += control.left - tira.left - 6;
    else if (control.right > tira.right - 6) pie.scrollLeft += control.right - tira.right + 6;
  });
  if (pie && !$('#lienzoLibreBtn')) pie.append(h('button', { id: 'lienzoLibreBtn', type: 'button', class: 'btn btn-sm lienzo-control',
    'aria-pressed': 'false', onclick: alternaLienzoLibre }, 'Lienzo libre'));
  if (pie && !$('#lienzoObjetosBtn')) pie.append(h('button', { id: 'lienzoObjetosBtn', type: 'button', class: 'btn btn-sm',
    hidden: true, 'aria-controls':'panelCapas', 'aria-expanded':'false', title: 'Elegir bloques y ordenar las capas', onclick: openObjetosLienzo }, 'Capas'));
  if (pie && !$('#lienzoImanBtn')) pie.append(h('button', { id: 'lienzoImanBtn', type: 'button', class: 'btn btn-sm lienzo-control',
    hidden: true, 'aria-pressed': 'true', title: 'Ajustar a guías al mover; mantén Alt para omitir el ajuste', onclick: alternaImanLienzo }, 'Imán'));
  if (pie && !$('#lienzoComposicion')) {
    const organizar = h('button', { id: 'lienzoOrganizarBtn', type: 'button', class: 'btn btn-sm', 'aria-label': 'Organizar selección',
      onclick: e => menuOrganizaLienzo(e.currentTarget) }, 'Organizar');
    const formas = h('button', { id: 'lienzoFormasBtn', type: 'button', class: 'btn btn-sm', 'aria-label': 'Insertar formas',
      onclick: e => menuFormasLienzo(e.currentTarget) }, 'Formas');
    const catalogo = h('button', { id: 'lienzoCatalogoBtn', type: 'button', class: 'btn btn-sm', 'aria-label': 'Explorar figuras científicas',
      onclick: openCatalogoFiguras }, 'Figuras');
    const conectores = h('button', {id:'lienzoConectoresBtn', type:'button', class:'btn btn-sm',
      title:'Conectar dos objetos o eliminar conexiones', onclick:e => menuConectoresLienzo(e.currentTarget)}, 'Conectores');
    pie.append(h('div', { id: 'lienzoComposicion', class: 'lienzo-composicion', hidden: true }, formas, catalogo, organizar, conectores));
  }
  inner.addEventListener('pointerdown', iniciaSeleccionPorMarco);
  /* Arrastrar una imagen dispara el arrastre nativo del navegador, que cancela
     el puntero a media gesto. El lienzo tiene el suyo propio, con sus guías. */
  inner.addEventListener('dragstart', e => e.preventDefault());
  let primerClicTexto = null;
  inner.addEventListener('mousedown', e => {
    primerClicTexto = null;
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
      const campo = e.button === 0 && e.target.closest('[data-edit]');
      if (campo) primerClicTexto = {campo, x:e.clientX, y:e.clientY};
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
  /* Al aparecer la barra contextual, el lienzo puede moverse entre pulsar y
     soltar. Si un clic sin arrastre dejó el cursor fuera del editor enfocado,
     recupera su posición inicial al final del texto sin tocar selecciones. */
  document.addEventListener('mouseup', e => {
    const clic = primerClicTexto; primerClicTexto = null;
    if (!clic || e.button !== 0 || Math.abs(e.clientX - clic.x) > 5 || Math.abs(e.clientY - clic.y) > 5 ||
        rawEl !== clic.campo || document.activeElement !== clic.campo) return;
    const seleccion = getSelection();
    if (!seleccion || !seleccion.isCollapsed || (seleccion.anchorNode && clic.campo.contains(seleccion.anchorNode))) return;
    const rango = document.createRange(); rango.selectNodeContents(clic.campo); rango.collapse(false);
    seleccion.removeAllRanges(); seleccion.addRange(rango);
  }, true);
  inner.addEventListener('click', e => {
    if (ignoraClicLibre) { e.preventDefault(); e.stopPropagation(); ignoraClicLibre = false; return; }
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
  inner.addEventListener('beforeinput', e => {
    const ctx = rawFormato && contextoBarra();
    rawAntes = ctx ? capturaTextoBarra(ctx) : null;
  });
  inner.addEventListener('input', e => {
    const el = e.target.closest('[data-edit]');
    if (el) { actualizaTextoEnEdicion(el, e); el.classList.toggle('is-empty', !el.textContent.trim()); }
  });
  inner.addEventListener('compositionend', e => {
    const el = e.target.closest('[data-edit]');
    if (el) actualizaTextoEnEdicion(el, e);
  });
  inner.addEventListener('focusin', e => {
    const el = e.target.closest('[data-edit]');
    if (el) enterRaw(el);
  });
  inner.addEventListener('focusout', e => {
    const el = e.target.closest('[data-edit]');
    if (!el || rawEl !== el) return;
    const bar = $('#barraContextual'), ctx = contextoBarra();
    if (ctx && bar?.contains(e.relatedTarget)) bar._textoPrevio = capturaTextoBarra(ctx);
    const rel = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest('[data-edit]') : null;
    leaveRaw(el, rel ? rel.dataset.ek : null);
  });
  inner.addEventListener('keydown', e => {
    if (curSlide().lienzoLibre && (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && !e.isComposing && !e.defaultPrevented &&
        /^a$/i.test(e.key) && e.target.matches('.blk[data-bid]') && e.target.dataset.bid === S.selBlock) {
      e.preventDefault(); seleccionaCapasVisibles(); enfocaBloqueLibre(S.selBlock); return;
    }
    const nz = e.target.closest('[data-nueva-z]');
    if (nz && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); nuevoTextoEnZona(nz.dataset.nuevaZ); return; }
    const el = e.target.closest('[data-edit]');
    if (!el) return;
    const ek = el.dataset.ek, p = ekParts(ek);
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && !e.isComposing && !e.defaultPrevented &&
        /^(b|i)$/i.test(e.key) && rawEl === el) {
      const ctx = contextoBarra();
      if (ctx && ctx.b.type === 'text' && ctx.ids.length === 1 && !ctx.b.locked && ek === 'b:' + ctx.b.id) {
        e.preventDefault();
        if (!e.repeat) cambiaTextoBarra(ctx, e.key.toLowerCase() === 'b' ? 'negrita' : 'cursiva', v => !v);
        return;
      }
    }
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
  // The input can outlive the document when its picker is canceled. Weak keys
  // let it identify the original target without retaining an entire deck.
  const identidad = objeto => {
    const claves = pickImage._claves || (pickImage._claves = new WeakMap());
    let n = claves.get(objeto);
    if (!n) { n = (pickImage._siguiente || 0) + 1; pickImage._siguiente = n; claves.set(objeto, n); }
    return n;
  };
  let inp = $('#imgFileInput');
  if (!inp) {
    inp = h('input', { type: 'file', id: 'imgFileInput', accept: 'image/*', style: 'display:none' });
    document.body.append(inp);
    inp.addEventListener('change', () => {
      const destino = inp._destino; inp._destino = null;
      const file = inp.files[0]; inp.value = '';
      if (!file) return;
      const f = findBlock(_imgTargetId);
      if (!destino || identidad(S.deck) !== destino.deck || identidad(curSlide()) !== destino.slide || !f || identidad(f.block) !== destino.block) {
        toast('La diapositiva cambió; vuelve a elegir la imagen.', 'warn'); return;
      }
      const deck = S.deck, slide = curSlide(), lectura = inp._lectura = (inp._lectura || 0) + 1;
      const aplica = url => {
        if (inp._lectura !== lectura || S.deck !== deck || curSlide() !== slide || findBlock(f.block.id)?.block !== f.block) return;
        if (f.block.locked) return;
        f.block.src = url; delete f.block.cientifico; delete f.block.figura; delete f.block.formaLibre; delete f.block.orig; delete f.block.recProp;
        if (f.block.catalogo && esFuenteCatalogo(f.block.catalogo)) delete f.block.catalogo;
        commit(); disenadorAlPonerImagen(f.block);
      };
      const rd = new FileReader();
      rd.onload = () => aplica(rd.result);
      rd.onerror = rd.onabort = () => { if (inp._lectura === lectura && S.deck === deck) toast('No se pudo leer la imagen.', 'warn'); };
      try { rd.readAsDataURL(file); } catch (error) { rd.onerror(); }
    });
  }
  inp._destino = {deck:identidad(S.deck), slide:identidad(curSlide()), block:identidad(b)};
  inp._lectura = (inp._lectura || 0) + 1;
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
