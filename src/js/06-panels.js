/* ==== 06-panels.js ==== */
'use strict';
/* ================= tira de diapositivas + panel derecho ================= */
let dragFrom = null;

/* En vertical la tira es una cuadrícula de dos columnas con el ancho que sobra:
   las miniaturas dejan de ser sellos de 100 px y se pueden tocar y leer. */
function thumbW() {
  if (window.matchMedia('(max-width:920px) and (orientation:portrait)').matches)
    return clamp(Math.floor((Math.min(window.innerWidth, 920) - 52) / 2), 100, 190);
  return window.matchMedia('(max-width:920px)').matches ? 100 : 168;
}

/* Devuelve, para cada diapositiva, el id de la sección a la que pertenece
   (las de sección no pertenecen a sí mismas). */
function seccionDe(deck) {
  const out = []; let act = null;
  deck.slides.forEach((sl, i) => {
    if (sl.layout === 'section') { act = sl.id; out[i] = null; }
    else out[i] = act;
  });
  return out;
}
function limpiaSeleccion() { if (S.sel && S.sel.size) { S.sel.clear(); renderFilmstrip(); } }
function seleccionadas() {
  const v = Array.from(S.sel || []).filter(i => i >= 0 && i < S.deck.slides.length);
  return v.length > 1 ? v.sort((a, b) => a - b) : [];
}
function duplicaSeleccion() {
  const v = seleccionadas(); if (!v.length) return;
  v.slice().reverse().forEach(i => {
    const c = deepCopy(S.deck.slides[i]); c.id = uid();
    for (const arr of zonas(c)) arr.forEach(b => b.id = uid());
    S.deck.slides.splice(i + 1, 0, c);
  });
  S.sel.clear(); commit();
  toast(v.length + ' diapositivas duplicadas', null, { t: 'Deshacer', fn: doUndo });
}
function borraSeleccion() {
  const v = seleccionadas(); if (!v.length) return;
  if (S.deck.slides.length - v.length < 1) { toast('La presentación necesita al menos una diapositiva'); return; }
  v.slice().reverse().forEach(i => S.deck.slides.splice(i, 1));
  S.sel.clear();
  S.cur = clamp(S.cur, 0, S.deck.slides.length - 1); S.selBlock = null;
  commit();
  toast(v.length + ' diapositivas eliminadas', null, { t: 'Deshacer', fn: doUndo });
}

function renderFilmstrip() {
  const list = $('#fsList'); list.innerHTML = '';
  const cab = $('.fs-head'); if (cab) pintaCabeceraTira(cab);
  const [W, H] = slideDims(S.deck);
  const tw = thumbW(), k = tw / W, th = Math.round(H * k);
  const secs = seccionDe(S.deck);
  S.plegadas = S.plegadas || new Set();
  S.sel = S.sel || new Set();
  const cuenta = {};
  secs.forEach(id => { if (id) cuenta[id] = (cuenta[id] || 0) + 1; });

  S.deck.slides.forEach((sl, i) => {
    if (sl.layout === 'section') {
      const plegada = S.plegadas.has(sl.id);
      const n = cuenta[sl.id] || 0;
      const cabS = h('div', { class: 'fs-sec' + (plegada ? ' plegada' : ''), title: plegada ? 'Mostrar las diapositivas de esta sección' : 'Plegar esta sección' });
      cabS.append(h('button', { class: 'fs-caret', 'aria-label': plegada ? 'Desplegar' : 'Plegar',
        onclick: e => { e.stopPropagation(); plegada ? S.plegadas.delete(sl.id) : S.plegadas.add(sl.id); renderFilmstrip(); } }, plegada ? '▸' : '▾'));
      cabS.append(h('span', { class: 'fs-sec-n' }, (sl.title || 'Sección').trim() || 'Sección'));
      cabS.append(h('span', { class: 'fs-sec-c' }, String(n)));
      cabS.addEventListener('click', () => { plegada ? S.plegadas.delete(sl.id) : S.plegadas.add(sl.id); renderFilmstrip(); });
      list.append(cabS);
    } else if (secs[i] && S.plegadas.has(secs[i])) {
      return;
    }
    const clip = h('div', { style: `width:${tw}px;height:${th}px;overflow:hidden;position:relative` });
    const mini = renderSlide(S.deck, i, 'thumb');
    mini.style.transform = `scale(${k})`; mini.style.transformOrigin = 'top left';
    clip.append(mini);
    const marcada = S.sel.has(i);
    const fuera = typeof fueraDeRama === 'function' && fueraDeRama(sl);
    const item = h('div', { class: 'fs-item' + (i === S.cur ? ' sel' : '') + (marcada ? ' multi' : '') + (fuera ? ' fuera-rama' : ''), draggable: 'true', 'data-i': i,
      title: sl.title || (LAY[sl.layout] || {}).name || 'Diapositiva' },
      h('div', { class: 'fs-thumb' }, clip,
        h('span', { class: 'fs-num' }, String(i + 1)),
        fuera ? h('span', { class: 'fs-rama', title: 'No va en la rama activa' }, '⊘') : null,
        minutosDe(sl) ? h('span', { class: 'fs-min' }, mmss(minutosDe(sl))) : null,
        pendientesDe(sl).some(t => !t.ok)
          ? h('span', { class: 'fs-todo', title: pendientesDe(sl).filter(t => !t.ok).map(t => '· ' + t.t).join('\n') },
              String(pendientesDe(sl).filter(t => !t.ok).length))
          : null,
        h('div', { class: 'fs-tools' },
          h('button', { title: 'Duplicar', onclick: e => { e.stopPropagation(); dupSlide(i); } }, '⧉'),
          h('button', { title: 'Eliminar', onclick: e => { e.stopPropagation(); delSlide(i); } }, '✕'))));
    item.addEventListener('click', e => {
      if (e.ctrlKey || e.metaKey) {
        if (!S.sel.size) S.sel.add(S.cur);
        S.sel.has(i) ? S.sel.delete(i) : S.sel.add(i);
        renderFilmstrip(); return;
      }
      if (e.shiftKey) {
        const a = Math.min(S.cur, i), b = Math.max(S.cur, i);
        for (let k2 = a; k2 <= b; k2++) S.sel.add(k2);
        renderFilmstrip(); return;
      }
      S.sel.clear();
      if (S.cur !== i) { S.cur = i; S.selBlock = null; renderAll(); } else renderFilmstrip();
    });
    item.addEventListener('dragstart', e => { dragFrom = i; e.dataTransfer.effectAllowed = 'move'; });
    item.addEventListener('dragover', e => {
      e.preventDefault();
      const r = item.getBoundingClientRect();
      const before = (window.matchMedia('(max-width:920px)').matches ? e.clientX - r.left < r.width / 2 : e.clientY - r.top < r.height / 2);
      item.classList.toggle('dragover-before', before);
      item.classList.toggle('dragover-after', !before);
    });
    item.addEventListener('dragleave', () => item.classList.remove('dragover-before', 'dragover-after', 'dragover-blk'));
    item.addEventListener('drop', e => {
      e.preventDefault();
      const before = item.classList.contains('dragover-before');
      item.classList.remove('dragover-before', 'dragover-after');
      if (dragFrom == null) return;
      let to = i + (before ? 0 : 1);
      if (dragFrom < to) to--;
      moveSlide(dragFrom, to); dragFrom = null;
    });
    list.append(item);
  });
}

/* Encabezado de la tira: título o, si hay varias marcadas, sus acciones. */
function pintaCabeceraTira(cab) {
  const v = seleccionadas();
  cab.innerHTML = '';
  if (!v.length) { cab.classList.remove('con-sel'); cab.append(h('span', { class: 'panel-label' }, 'Diapositivas')); return; }
  cab.classList.add('con-sel');
  cab.append(h('span', { class: 'fs-cuenta' }, v.length + ' marcadas'),
    h('button', { class: 'icon-btn', title: 'Duplicar las marcadas', onclick: duplicaSeleccion }, '⧉'),
    h('button', { class: 'icon-btn tb-danger', title: 'Eliminar las marcadas', onclick: borraSeleccion }, '✕'),
    h('button', { class: 'icon-btn', title: 'Quitar la marca', onclick: limpiaSeleccion }, '⨯'));
}

function updateChrome() {
  /* «Diapositiva 4 de 6» no cabe con el resto de la barra en una pantalla
     estrecha: ahí se queda en «4/6», que es lo que se consulta. */
  const pos = $('#slidePos');
  pos.innerHTML = '';
  pos.append(h('span', { class: 'only-wide-i' }, 'Diapositiva '), String(S.cur + 1),
    h('span', { class: 'only-wide-i' }, ' de '), h('span', { class: 'only-narrow-i' }, '/'),
    String(S.deck.slides.length));
  pos.setAttribute('aria-label', `Diapositiva ${S.cur + 1} de ${S.deck.slides.length}`);
  $('#undoBtn').toggleAttribute('disabled', !S.undo.length);
  $('#redoBtn').toggleAttribute('disabled', !S.redo.length);
  /* Se compara en vez de mirar el foco: mientras escribes, campo y mazo ya
     coinciden y no se toca el cursor; si difieren con el foco puesto es que el
     mazo cambió por otra vía (deshacer, abrir otro proyecto) y el campo tiene
     que seguirlo, o la siguiente tecla reescribiría el título viejo encima. */
  const ti = $('#deckTitleInput');
  const titulo = S.deck.meta.title || '';
  if (ti.value !== titulo) ti.value = titulo;
}

/* ---------- panel derecho ---------- */
/* Grupo que se pliega y recuerda si lo dejaste abierto. Sin esto la pestaña
   de Diseño son casi tres pantallas de scroll. */
/* Los grupos que se tocan una vez y se olvidan nacen plegados. */
const PLEGADO_DEF = { tipografia: true, pie: true, identidad: true, portada: true, estilos: true, trans: true, pendientes: true, notacion: true, insertLayouts: true };
function plegado(id) {
  const g = (S.prefs && S.prefs.grupos) || {};
  return g[id] == null ? !!PLEGADO_DEF[id] : g[id] === true;
}
/* Convierte un grupo ya armado en uno plegable. */
function aPlegable(id, nodo, resumen) {
  const lab = nodo.querySelector('.panel-label');
  const titulo = lab ? lab.textContent : id;
  if (lab) lab.remove();
  return grupo(id, titulo, Array.from(nodo.childNodes), { resumen });
}
function grupo(id, titulo, hijos, opts) {
  opts = opts || {};
  const cerrado = plegado(id);
  const cab = h('button', { class: 'g-cab', 'aria-expanded': cerrado ? 'false' : 'true' },
    h('span', { class: 'g-caret' }, cerrado ? '▸' : '▾'),
    h('span', { class: 'panel-label' }, titulo),
    opts.resumen ? h('span', { class: 'g-res' }, opts.resumen) : null);
  const cuerpo = h('div', { class: 'g-cuerpo' + (cerrado ? ' oculto' : '') }, hijos.filter(Boolean));
  cab.addEventListener('click', () => {
    S.prefs.grupos = S.prefs.grupos || {};
    S.prefs.grupos[id] = !plegado(id);
    guardaPrefs();
    renderInspector();
  });
  return h('div', { class: 'igroup plegable' + (cerrado ? ' cerrado' : '') }, cab, cuerpo);
}

function renderInspector() {
  /* La cinta solo se refresca (sin repintar); con la cinta puesta, el panel
     de la derecha se pinta únicamente cuando está abierto como panel de detalles. */
  actualizaCinta();
  if (enCinta() && !document.body.classList.contains('panel-temporal')) return;
  const tabIns = $('.itab[data-tab=insert]');
  if (tabIns) tabIns.hidden = enCinta();                   // «Insertar» vive en la cinta
  if (enCinta() && S.tab === 'insert') S.tab = 'slide';
  const body = $('#inspBody'); body.innerHTML = '';
  const tabBlk = $('.itab-blk');
  const hayBloque = !!(S.selBlock && findBlock(S.selBlock));
  if (tabBlk) {
    tabBlk.hidden = !hayBloque;
    if (hayBloque) {
      const f = findBlock(S.selBlock);
      const d = BLOCK_DEFS.find(x => x.id === f.block.type);
      /* El rótulo se queda corto a propósito: el nombre largo del tipo va en
         la cabecera de abajo, y así la fila de pestañas no crece. */
      tabBlk.title = d ? 'Propiedades de: ' + d.name : 'Propiedades del bloque';
    }
  }
  if (S.tab === 'bloque' && !hayBloque) S.tab = S.tabPrev || 'insert';
  $$('.itab').forEach(t => {
    const activo=t.dataset.tab===S.tab;t.classList.toggle('on',activo);
    t.setAttribute('role','tab');t.id='insp-tab-'+t.dataset.tab;
    t.setAttribute('aria-selected',String(activo));t.setAttribute('aria-controls','inspBody');t.tabIndex=activo?0:-1;
  });
  $('#inspBody').setAttribute('role','tabpanel');
  $('#inspBody').setAttribute('aria-labelledby','insp-tab-'+S.tab);
  /* Con la cinta puesta, el panel de detalles se abre a petición y se cierra con ✕ o Escape. */
  if (document.body.classList.contains('panel-temporal')) {
    body.append(h('div', { class: 'cinta-cerrar' },
      h('span', null, 'Detalles'),
      h('button', { type: 'button', class: 'btn btn-sm', id: 'detallesCerrar', title: 'Cerrar el panel de detalles (Escape)', onclick: cierraPanelDetalles }, '✕ Cerrar')));
  }
  if (S.tab === 'bloque') renderBlockTab(body);
  else if (S.tab === 'insert') renderInsertTab(body);
  else if (S.tab === 'slide') renderSlideTab(body);
  else renderDesignTab(body);
}

/* ---------- pestaña contextual: el bloque seleccionado ----------
   Lo que antes vivía tras ⚙ en una ventana ahora está a la vista mientras
   editas, y cada cambio se ve en la diapositiva sin cerrar nada. */
function renderBlockTab(body) {
  renderBlockTab_(body);
  const f = S.selBlock && findBlock(S.selBlock);
  if (!f) return;
  const b = f.block;
  const refresca = () => renderInspector();
  if(b.cientifico)body.append(h('button',{class:'btn btn-pri ciencia-btn',onclick:()=>cienciaReabrir(b)},cienciaIcono('FlaskConical'),'Editar datos científicos'));
  if ((b.type === 'chart' || b.type === 'image') && typeof panelFigurasVivas === 'function') body.append(panelFigurasVivas(b, refresca));
  if (typeof panelNivelBloque === 'function') body.append(panelNivelBloque(b));
  if (b.type === 'math' && typeof openDerivacion === 'function') {
    const g = h('div', { class: 'igroup' }, h('span', { class: 'panel-label' }, 'Derivación'));
    g.append(h('button', { class: 'btn btn-sm' + (b.derivacion ? ' btn-pri' : ''), onclick: () => openDerivacion(b) },
      b.derivacion ? '∑ Editar los ' + pasosDe(b).length + ' pasos' : '∑ Mostrarla paso a paso'));
    if (b.derivacion) g.append(h('button', { class: 'btn btn-sm', style: 'margin-left:6px', onclick: () => { b.derivacion = false; commit(); refresca(); } }, 'Volver a una sola ecuación'));
    g.append(h('p', { class: 'hint' }, 'Cada paso entra con la flecha y lo que cambió se pinta del color de acento, con el porqué al lado.'));
    body.append(g);
  }
}
function renderBlockTab_(body) {
  const f = findBlock(S.selBlock);
  if (!f) { renderInsertTab(body); return; }
  const b = f.block;
  const def = BLOCK_DEFS.find(x => x.id === b.type) || { name: b.type, ic: '▦' };
  body.append(h('div', { class: 'blk-cab' },
    h('span', { class: 'blk-ic' }, def.ic || '▦'),
    h('div', null, h('b', null, def.name),
      h('span', { class: 'blk-donde' }, 'Diapositiva ' + (S.cur + 1) + (f.arr.length > 1 ? ' · bloque ' + (f.i + 1) + ' de ' + f.arr.length : ''))),
    h('button', { class: 'icon-btn', title: 'Quitar la selección', onclick: () => selectBlock(null) }, '✕')));

  let cuerpo;
  try { cuerpo = cuerpoProps(b, { panel: true }); }
  catch (e) { cuerpo = h('div', null, h('p', { class: 'hint' }, 'No se pudieron mostrar las propiedades de este bloque.')); }
  cuerpo.classList.add('blk-props');
  /* Un solo oyente para todo el cuerpo: así los controles de la ventana
     sirven tal cual, sin duplicar la lógica de cada uno. */
  const vivo = deb(() => { renderCanvas(); commit({ skipInsp: true }); }, 200);
  cuerpo.addEventListener('input', vivo);
  cuerpo.addEventListener('change', vivo);
  cuerpo.addEventListener('click', e => { if (e.target.closest('.seg button, label.check')) vivo(); });
  body.append(cuerpo);

  const g = h('div', { class: 'igroup' }, h('span', { class: 'panel-label' }, 'Acciones'));
  g.append(h('div', { style: 'display:flex;gap:7px;flex-wrap:wrap' },
    h('button', { class: 'btn btn-sm', onclick: () => moveBlock(S.selBlock, -1) }, '↑ Subir'),
    h('button', { class: 'btn btn-sm', onclick: () => moveBlock(S.selBlock, 1) }, '↓ Bajar'),
    h('button', { class: 'btn btn-sm', onclick: () => dupBlock(S.selBlock) }, '⧉ Duplicar'),
    h('button', { class: 'btn btn-sm', onclick: () => openMoverBloque(b) }, '⇥ Mover a…'),
    h('button', { class: 'btn btn-sm btn-danger', onclick: () => delBlock(S.selBlock) }, '✕ Eliminar')));
  body.append(g);
}

function layoutWire(id) {
  const box = h('div', { class: 'lp' });
  const ACC = '#8A93B4';
  const bar = (x, y, w, hh, c) => box.append(h('i', { style: `left:${x}px;top:${y}px;width:${w}px;height:${hh}px;${c ? 'background:' + c : ''}` }));
  const cab = () => bar(0, 0, 64, 8, ACC);
  const lineas = (x, y, w, n, sep) => { for (let i = 0; i < n; i++) bar(x, y + i * (sep || 5), w, 2); };
  switch (id) {
    case 'title': bar(10, 12, 44, 5); bar(14, 20, 36, 3); bar(18, 27, 28, 2); break;
    case 'section': bar(6, 14, 30, 6); bar(6, 23, 20, 2); break;
    case 'toc': bar(6, 6, 24, 4); lineas(10, 14, 34, 3); break;
    case 'content': cab(); lineas(6, 13, 46, 3); break;
    case 'flujo': cab(); lineas(5, 13, 26, 4); lineas(34, 13, 26, 4); break;
    case 'enunciado': cab(); bar(11, 16, 42, 4); bar(11, 23, 42, 4); bar(20, 30, 24, 2); break;
    case 'ancho': cab(); bar(2, 12, 60, 20, ACC); break;
    case 'twocol': cab(); lineas(5, 13, 25, 3); bar(34, 13, 25, 14, ACC); break;
    case 'barra': cab(); bar(4, 12, 15, 20, ACC); lineas(23, 13, 36, 4); break;
    case 'comparacion': cab(); bar(4, 12, 27, 4, ACC); lineas(4, 19, 27, 3); bar(33, 12, 27, 4, ACC); lineas(33, 19, 27, 3); break;
    case 'tres': cab(); lineas(4, 13, 17, 3); lineas(24, 13, 17, 3); lineas(44, 13, 17, 3); break;
    case 'pasos': cab();
      [4, 24, 44].forEach(x => { box.append(h('i', { style: `left:${x}px;top:12px;width:7px;height:7px;border-radius:50%;background:${ACC}` })); });
      lineas(4, 22, 17, 2); lineas(24, 22, 17, 2); lineas(44, 22, 17, 2); break;
    case 'cuadricula': cab();
      bar(4, 12, 27, 2, ACC); lineas(4, 16, 27, 2); bar(33, 12, 27, 2, ACC); lineas(33, 16, 27, 2);
      bar(4, 25, 27, 2, ACC); lineas(4, 29, 20, 1); bar(33, 25, 27, 2, ACC); lineas(33, 29, 20, 1); break;
    case 'rejilla6': cab();
      [4, 24, 44].forEach(x => { bar(x, 12, 17, 2, ACC); lineas(x, 16, 17, 2); bar(x, 24, 17, 2, ACC); lineas(x, 28, 17, 2); }); break;
    case 'filas': cab();
      [12, 21, 30].forEach(y => { bar(4, y, 12, 4, ACC); lineas(20, y + 1, 40, 1); }); break;
    case 'partida': bar(0, 0, 31, 36, ACC); box.append(h('i', { style: 'left:33px;top:0;width:31px;height:36px;background:#C6CBDD' })); break;
    case 'sangre': bar(0, 0, 64, 36, ACC); box.append(h('i', { style: 'left:0;top:26px;width:64px;height:10px;background:#4A5270' })); break;
    case 'piefigura': cab(); bar(2, 12, 42, 20, ACC); lineas(48, 14, 14, 4); break;
    case 'zigzag': cab(); bar(2, 12, 28, 9, ACC); lineas(34, 13, 26, 3); lineas(2, 25, 26, 3); bar(34, 24, 28, 9, ACC); break;
    case 'dato': cab(); bar(16, 14, 32, 12, ACC); bar(20, 29, 24, 2); break;
    case 'cita': cab(); bar(6, 12, 6, 8, ACC); lineas(16, 14, 44, 3); bar(38, 29, 22, 2); break;
    default: cab(); lineas(6, 13, 46, 3);
  }
  return box;
}

function renderInsertTab(body) {
  const sl = curSlide();
  const nz = zonasDe(sl.layout);
  const canBlocks = nz > 0;
  const g1 = h('div', { class: 'igroup' }, h('span', { class: 'panel-label' }, 'Bloques de contenido'));
  if (nz > 1) {
    if ((S.insCol || 1) > nz) S.insCol = 1;
    const nombres = NOMBRES_ZONA[sl.layout] || [];
    const seg = h('div', { class: 'seg' + (nz > 2 ? ' seg-4' : ''), style: 'margin-bottom:9px' });
    for (let c = 1; c <= nz; c++) {
      const et = nombres[c - 1] || ('Zona ' + c);
      seg.append(h('button', { class: (S.insCol || 1) === c ? 'on' : '', title: 'Insertar en ' + et,
        onclick: () => { S.insCol = c; renderInspector(); } }, nz > 2 ? String(c) : et));
    }
    g1.append(seg);
    if (nz > 2) g1.append(h('p', { class: 'hint', style: 'margin:-4px 0 9px' },
      'Los bloques nuevos van a la ' + (nombres[(S.insCol || 1) - 1] || ('zona ' + (S.insCol || 1))) + '.'));
  }
  const basicos = ['text','bullets','math','chem','image','table','refs','quote'];
  const mkGrid = (grp, filtro = () => true) => {
    const grid = h('div', { class: 'insert-grid' });
    BLOCK_DEFS.filter(d => d.grp === grp && filtro(d)).forEach(d => grid.append(
      h('button', { class: 'ins-btn', onclick: () => addBlockToSlide(d.id, S.insCol || 1) },
        h('span', { class: 'ic' }, d.ic), h('span', { class: 'lb' }, d.name))));
    return grid;
  };
  g1.append(mkGrid('base', d => basicos.includes(d.id)));
  g1.append(h('details', {class:'slides-avanzadas'}, h('summary', null, 'Más bloques'), mkGrid('base', d => !basicos.includes(d.id))));
  const avanzadas = h('details', {class:'slides-avanzadas'},
    h('summary', null, 'Más contenido científico'),
    h('div', {class:'slides-avanzadas-body'},
      h('span', {class:'panel-label'}, 'Contenido vivo'), mkGrid('viva'),
      h('span', {class:'panel-label'}, 'Química y laboratorio'), mkGrid('quim'),
      h('button',{class:'btn ciencia-btn',onclick:openCiencia},cienciaIcono('FlaskConical'),'Crear figura científica'),
      h('span', {class:'panel-label'}, 'Matemáticas'), mkGrid('mate')));
  g1.append(avanzadas);
  if (!canBlocks) g1.append(h('p', { class: 'hint' }, 'Esta diapositiva (' + ((LAY[sl.layout] || {}).name || 'sin diseño').toLowerCase() + ') se edita haciendo clic sobre sus textos. Si insertas un bloque, se abre una diapositiva de contenido justo después y va ahí.'));
  else g1.append(h('p', { class: 'hint' }, 'Haz clic en cualquier texto para editarlo, o en una zona vacía para escribir ahí mismo; doble clic en el hueco de una zona añade otro texto. En viñetas: Enter agrega punto, Tab lo anida.'));
  body.append(g1);

  const g2 = h('div', { class: 'igroup' }, h('span', { class: 'panel-label' }, 'Nueva diapositiva'));
  g2.append(h('button', { class: 'btn btn-pri', style: 'width:100%;margin-bottom:9px', onclick: nuevaAfirmacionEvidencia },
    '＋ Afirmación + evidencia'));
  gruposLayout().forEach(([grupo, items]) => {
    g2.append(h('span', { class: 'sublabel' }, grupo));
    const lg = h('div', { class: 'lay-grid', style: 'grid-template-columns:repeat(2,1fr)' });
    items.forEach(l => lg.append(h('button', { class: 'lay-opt', title: l.d, onclick: () => addSlide(l.id) },
      layoutWire(l.id), h('span', { class: 'lb' }, l.name))));
    g2.append(lg);
  });
  body.append(aPlegable('insertLayouts', g2, 'Ver diseños'));
}

const NOMBRES_ZONA = {
  twocol: ['Columna 1', 'Columna 2'],
  barra: ['Barra', 'Principal'],
  comparacion: ['Lado 1', 'Lado 2'],
  tres: ['Col. 1', 'Col. 2', 'Col. 3'],
  pasos: ['Paso 1', 'Paso 2', 'Paso 3'],
  cuadricula: ['Celda 1', 'Celda 2', 'Celda 3', 'Celda 4'],
  rejilla6: ['Celda 1', 'Celda 2', 'Celda 3', 'Celda 4', 'Celda 5', 'Celda 6'],
  filas: ['Fila 1', 'Fila 2', 'Fila 3'],
  partida: ['Mitad 1', 'Mitad 2'],
  piefigura: ['Figura', 'Pie'],
  zigzag: ['Figura 1', 'Texto 1', 'Texto 2', 'Figura 2']
};
function gruposLayout() {
  const out = [];
  LAYOUTS.forEach(l => {
    let g = out.find(x => x[0] === l.grp);
    if (!g) { g = [l.grp, []]; out.push(g); }
    g[1].push(l);
  });
  return out;
}

/* Al cambiar de diseño, ningún bloque se pierde: los de las zonas que
   desaparecen se acumulan en la última que sobrevive. */
function changeLayout(sl, to) {
  if (sl.layout === to) return;
  const destino = zonasDe(to);
  if (destino === 0) {
    const todos = CLAVES_ZONA.reduce((a, k) => a.concat(sl[k] || []), []);
    if (todos.length) { sl._guardados = todos; }
    CLAVES_ZONA.forEach(k => delete sl[k]);
    sl.blocks = [];
  } else {
    if (sl._guardados) { sl.blocks = (sl.blocks || []).concat(sl._guardados); delete sl._guardados; }
    const sobran = CLAVES_ZONA.slice(destino);
    const rescate = sobran.reduce((a, k) => a.concat(sl[k] || []), []);
    sobran.forEach(k => delete sl[k]);
    if (rescate.length) zona(sl, destino - 1).push(...rescate);
    for (let i = 0; i < destino; i++) zona(sl, i);
  }
  prepararZonas(sl, to);
  if (to === 'toc' && !sl.title) sl.title = 'Contenido';
  sl.layout = to;
  S.selBlock = null;
  S.insCol = 1;
  commit();
}

/* Mide el contenido y ajusta la escala para que llene la diapositiva sin desbordarse. */
function ajustarTexto(sl) {
  const [W, H] = slideDims(S.deck);
  const banco = $('#workbench');
  const probar = esc => {
    sl.scale = esc;
    banco.innerHTML = '';
    const nodo = renderSlide(S.deck, S.deck.slides.indexOf(sl), 'export');
    banco.append(nodo);
    const cuerpo = nodo.querySelector('.fbody');
    if (!cuerpo) return 0;
    const alto = cuerpo.scrollHeight, hueco = cuerpo.clientHeight;
    banco.innerHTML = '';
    return hueco ? alto / hueco : 0;
  };
  const previa = sl.scale;
  let mejor = 1;
  for (let e = 1.40; e >= 0.70; e -= 0.02) {
    if (probar(+e.toFixed(2)) <= 1) { mejor = +e.toFixed(2); break; }
    mejor = 0.70;
  }
  sl.scale = previa;
  if (Math.abs(mejor - (previa || 1)) < 0.015) { toast('El texto ya aprovecha el espacio disponible'); return; }
  sl.scale = mejor;
  commit();
  toast(mejor > (previa || 1) ? `Texto agrandado a ${Math.round(mejor * 100)} %` : `Texto ajustado a ${Math.round(mejor * 100)} % para que quepa`);
}

function renderSlideTab(body) {
  const sl = curSlide();
  /* Respaldo para preguntas y referencias de esta diapositiva. */
  const gR = h('div', { class: 'igroup' }, h('span', { class: 'panel-label' }, 'Esta diapositiva'));
  gR.append(h('label', { class: 'check' },
    h('input', { type: 'checkbox', checked: esRespaldo(sl), onchange: () => alternaRespaldo(S.cur) }),
    'Guardarla como respaldo para preguntas'));
  gR.append(h('p', { class: 'hint' }, esRespaldo(sl)
    ? 'No cuenta en la numeración ni en el tiempo previsto, y no se llega a ella avanzando. Al presentar, la tecla Q abre el índice para saltar a la que responda la pregunta.'
    : 'El apéndice de la charla: lo que no cuentas pero quieres tener a mano si preguntan.'));
  const nCit = ((sl.citas || []).length) + zonas(sl).flat().filter(b => b.cita).length;
  gR.append(h('div', { style: 'display:flex;gap:7px;flex-wrap:wrap;margin-top:6px' },
    h('button', { class: 'btn btn-sm', onclick: () => openReferencias() },
      '❝ Referencias' + (nCit ? ' · ' + nCit + ' en esta' : '')),
    h('button', { class: 'btn btn-sm', title: 'Traer referencias de tu biblioteca de Zotero',
      onclick: () => openZotero() }, 'Z Zotero')));
  body.append(gR);
  /* Cognición: carga y mirada de esta diapositiva. */
  {
    const c = (sl.layout === 'title' || sl.layout === 'section' || sl.layout === 'toc') ? null : cargaDe(sl, S.deck);
    const gC = h('div', { class: 'igroup' }, h('span', { class: 'panel-label' }, 'Cómo se procesa'));
    gC.append(h('div', { style: 'display:flex;gap:7px;flex-wrap:wrap' },
      h('button', { class: 'btn btn-sm' + (c && c.nivel === 'alta' ? ' btn-danger' : ''), onclick: openCarga,
        title: 'Redundancia, atención dividida y señalización' }, '◔ Carga' + (c ? ' · ' + c.nivel : '')),
      h('button', { class: 'btn btn-sm' + (MIRADA.on ? ' btn-pri' : ''), onclick: () => { alternaMirada(); renderInspector(); }, title: 'Dónde cae primero el ojo' }, '◉ Mirada'),
      h('button', { class: 'btn btn-sm', onclick: alternaArgumento, title: 'La charla como cadena de afirmaciones' }, '¶ Argumento')));
    if (c && c.nivel !== 'baja') {
      const peor = ['redundancia', 'atencion', 'senal'].map(k => c[k]).sort((x, y) => GRADO_N[y.g] - GRADO_N[x.g])[0];
      gC.append(h('p', { class: 'hint' }, peor.txt + (peor.fix ? ' → ' + peor.fix : '')));
    }
    body.append(gC);
  }
  if (typeof panelSubtitulos === 'function') body.append(panelSubtitulos(sl));
  if (typeof ramaActiva === 'function' && ramaActiva()) {
    const r = ramaActiva();
    const g = h('div', { class: 'igroup' }, h('span', { class: 'panel-label' }, 'Rama activa: ' + r.n));
    g.append(h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: enRama(sl), onchange: () => alternaEnRama(S.cur) }), 'Esta diapositiva va en la rama'));
    body.append(g);
  }
  const g = h('div', { class: 'igroup' }, h('span', { class: 'panel-label' }, 'Acomodo del texto'));
  gruposLayout().forEach(([grupo, items]) => {
    g.append(h('span', { class: 'sublabel' }, grupo));
    const lg = h('div', { class: 'lay-grid', style: 'grid-template-columns:repeat(2,1fr)' });
    items.forEach(l => lg.append(h('button', {
      class: 'lay-opt' + (sl.layout === l.id ? ' on' : ''), title: l.d,
      onclick: () => changeLayout(sl, l.id)
    }, layoutWire(l.id), h('span', { class: 'lb' }, l.name))));
    g.append(lg);
  });
  g.append(h('p', { class: 'hint' }, (LAY[sl.layout] || {}).d || ''));
  if (sl.layout !== 'title') {
    g.append(h('input', { class: 'field', value: sl.title || '', placeholder: sl.layout === 'section' ? 'Nombre de la sección' : 'Título del marco', style: 'margin-bottom:8px',
      onchange: e => { sl.title = e.target.value; commit({ skipInsp: true }); } }));
  }
  if (zonasDe(sl.layout) > 0) {
    g.append(h('input', { class: 'field', value: sl.subtitle || '', placeholder: 'Subtítulo (opcional)', style: 'margin-bottom:8px',
      onchange: e => { sl.subtitle = e.target.value; commit({ skipInsp: true }); } }));
    g.append(h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!sl.vcenter, onchange: e => { sl.vcenter = e.target.checked; commit({ skipInsp: true }); } }), 'Centrar contenido verticalmente'));
  }
  if (sl.layout === 'twocol' || sl.layout === 'barra') {
    const esBarra = sl.layout === 'barra';
    const min = esBarra ? 20 : 25, max = esBarra ? 45 : 75, def = esBarra ? 30 : 50;
    const txt = () => `${esBarra ? 'Anchura de la barra' : 'Anchura de columnas'} · ${sl.split || def} % / ${100 - (sl.split || def)} %`;
    const lab = h('label', null, txt());
    g.append(h('div', { class: 'irow' }, lab),
      h('input', { type: 'range', min, max, step: 5, value: sl.split || def,
        oninput: e => { sl.split = +e.target.value; lab.textContent = txt(); },
        onchange: () => commit({ skipInsp: true }) }));
  }
  if (sl.layout === 'flujo') {
    const seg = h('div', { class: 'seg', style: 'margin-bottom:9px' });
    [2, 3].forEach(n => seg.append(h('button', { class: (sl.cols || 2) === n ? 'on' : '',
      onclick: () => { sl.cols = n; commit(); } }, n + ' columnas')));
    g.append(h('div', { class: 'irow' }, h('label', null, 'Columnas de texto')), seg);
  }
  body.append(g);

  /* ---- aprovechamiento del espacio ---- */
  const gEsp = h('div', { class: 'igroup' }, h('span', { class: 'panel-label' }, 'Aprovechar el espacio'));
  const escala = Math.round((sl.scale || 1) * 100);
  const labE = h('label', null, `Tamaño del texto · ${escala} %`);
  gEsp.append(h('div', { class: 'irow' }, labE),
    h('input', { type: 'range', min: 70, max: 140, step: 2, value: escala,
      oninput: e => { sl.scale = +e.target.value / 100; labE.textContent = `Tamaño del texto · ${e.target.value} %`; renderCanvas(); },
      onchange: () => commit({ skipInsp: true }) }));
  const segM = h('div', { class: 'seg', style: 'margin:8px 0 4px' });
  [['estrecho', 'Estrechos'], ['normal', 'Normales'], ['amplio', 'Amplios']].forEach(([v, n]) =>
    segM.append(h('button', { class: (sl.pad || 'normal') === v ? 'on' : '',
      onclick: () => { sl.pad = v; commit(); } }, n)));
  gEsp.append(h('div', { class: 'irow' }, h('label', null, 'Márgenes laterales')), segM);
  gEsp.append(h('button', { class: 'btn btn-sm', style: 'margin-top:8px', onclick: () => ajustarTexto(sl) }, '⤢ Ajustar texto al espacio'));
  gEsp.append(h('p', { class: 'hint' }, 'Sube el tamaño y estrecha los márgenes si la diapositiva se ve vacía. El botón busca por ti el mayor tamaño que todavía cabe.'));
  body.append(gEsp);

  const g2 = h('div', { class: 'igroup' }, h('span', { class: 'panel-label' }, 'Notas del orador'));
  g2.append(h('textarea', { class: 'field', rows: 5, placeholder: 'Notas visibles solo para ti (tecla N al presentar)',
    onchange: e => { sl.notes = e.target.value; commit({ skipInsp: true }); } }, sl.notes || ''));
  const filaMin = h('div', { class: 'irow', style: 'margin-top:8px' }, h('label', null, 'Minutos previstos'),
    h('input', { class: 'field', type: 'number', min: '0', max: '60', step: '0.5', style: 'width:86px', value: sl.min || '', placeholder: '—',
      onchange: e => { const v = +e.target.value; if (v > 0) sl.min = v; else delete sl.min; commit({ skipInsp: true }); renderFilmstrip(); } }));
  g2.append(filaMin);
  const totMin = minutosTotales(S.deck);
  if (totMin) g2.append(h('p', { class: 'hint', style: 'margin-top:4px' }, 'Total previsto de la presentación: ' + mmss(totMin) + ' min.'));
  g2.append(h('div', { style: 'display:flex;gap:7px;flex-wrap:wrap;margin-top:8px' },
    h('button', { class: 'btn btn-sm', onclick: () => openNotasEditor(S.cur) }, '✎ Editor de notas…'),
    h('button', { class: 'btn btn-sm', title: 'Todas las notas en una lista, para escribir el guion de una sentada', onclick: () => openNotasEditor(S.cur, 'todas') }, '☰ Todas de corrido…'),
    h('button', { class: 'btn btn-sm', onclick: exportGuion }, '¶ Guion imprimible')));
  body.append(g2);

  const gPd = h('div', { class: 'igroup' }, h('span', { class: 'panel-label' }, 'Pendientes de esta diapositiva'));
  const ts = pendientesDe(sl);
  if (ts.length) {
    ts.forEach(t => gPd.append(h('div', { class: 'pd-item' + (t.ok ? ' hecho' : '') },
      h('label', { class: 'check' },
        h('input', { type: 'checkbox', checked: !!t.ok, onchange: () => alternaPendiente(S.cur, t.id) }), t.t),
      h('button', { class: 'icon-btn', title: 'Quitar el pendiente', onclick: () => borraPendiente(S.cur, t.id) }, '✕'))));
  } else {
    gPd.append(h('p', { class: 'hint', style: 'margin-top:0' },
      'Anota lo que falta aquí y lo verás al volver, sin tener que acordarte. No sale en el PDF ni en el .tex.'));
  }
  gPd.append(h('div', { style: 'display:flex;gap:7px;flex-wrap:wrap;margin-top:8px' },
    h('button', { class: 'btn btn-sm', onclick: () => nuevoPendiente(S.cur) }, '+ Anotar pendiente'),
    h('button', { class: 'btn btn-sm', title: 'Todos los pendientes (F8)', onclick: openPendientes }, '◔ Ver todos')));
  body.append(aPlegable('pendientes', gPd, ts.length ? ts.filter(t => !t.ok).length + ' sin hacer' : 'ninguno'));

  const g3 = h('div', { class: 'igroup' }, h('span', { class: 'panel-label' }, 'Acciones'));
  g3.append(h('div', { style: 'display:flex;gap:7px;flex-wrap:wrap' },
    h('button', { class: 'btn btn-sm', onclick: () => dupSlide(S.cur) }, '⧉ Duplicar'),
    h('button', { class: 'btn btn-sm', onclick: () => moveSlide(S.cur, S.cur - 1) }, '↑ Subir'),
    h('button', { class: 'btn btn-sm', onclick: () => moveSlide(S.cur, S.cur + 1) }, '↓ Bajar'),
    h('button', { class: 'btn btn-sm btn-danger', onclick: () => delSlide(S.cur) }, '✕ Eliminar')));
  body.append(g3);
}

function themeMini(id) {
  const t = THEMES[id];
  const mini = h('div', { class: 'theme-mini', style: `background:${t.bg}` });
  if (id === 'cambridge' || id === 'sobrio') {
    mini.append(h('i', { style: `position:absolute;left:8px;top:7px;width:46px;height:6px;background:${t.ftfg};border-radius:1px` }),
      h('i', { style: `position:absolute;left:8px;top:16px;width:70px;height:2px;background:${t.acc}` }));
  } else {
    mini.append(h('i', { style: `position:absolute;left:0;top:0;right:0;height:14px;background:${t.ft}` }));
  }
  const ln = (y, w) => h('i', { style: `position:absolute;left:8px;top:${y}px;width:${w}px;height:3px;border-radius:2px;background:${t.fg};opacity:.5` });
  mini.append(ln(24, 52), ln(31, 44), ln(38, 48));
  mini.append(h('i', { style: `position:absolute;right:6px;bottom:5px;width:16px;height:4px;border-radius:2px;background:${t.acc}` }));
  return mini;
}

function renderDesignTab(body) {
  const m = S.deck.meta;
  /* Dónde viven las herramientas: panel a la derecha o cinta arriba. */
  const g0 = h('div', { class: 'igroup' }, h('span', { class: 'panel-label' }, 'Dónde están las herramientas'));
  const segD = h('div', { class: 'seg' });
  SITIOS_BARRA.forEach(x => segD.append(h('button', { class: disposicion() === x.id ? 'on' : '', 'aria-pressed': String(disposicion() === x.id),
    title: x.d, onclick: () => ponDisposicion(x.id) }, x.n)));
  g0.append(segD);
  g0.append(h('p', { class: 'hint' }, 'Con la cinta arriba, que es la de fábrica, las herramientas se agrupan en pestañas como en las apps de oficina y la diapositiva gana el ancho del panel. Lo que necesita más sitio se abre en este panel de detalles, que se cierra con ✕ o Escape. Ctrl+Shift+B cambia de una a otra.'));
  body.append(g0);
  const g1 = h('div', { class: 'igroup' }, h('span', { class: 'panel-label' }, 'Tema Beamer'));
  const tg = h('div', { class: 'theme-grid' });
  Object.keys(THEMES).forEach(id => {
    const t = THEMES[id];
    tg.append(h('button', { class: 'theme-card' + (m.theme === id ? ' on' : ''), onclick: () => { m.theme = id; commit(); } },
      themeMini(id), h('span', null, h('span', { class: 'theme-name' }, t.name), h('br'), h('span', { class: 'theme-desc' }, t.desc))));
  });
  g1.append(tg);
  const baseT = THEMES[m.theme] || THEMES.metropolis;
  const propio = m.acento && String(m.acento).toUpperCase() !== baseT.acc.toUpperCase();
  g1.append(h('span', { class: 'sublabel' }, 'Color de acento'));
  const paleta = h('div', { class: 'acc-grid' });
  const marca = hex => (m.acento || baseT.acc).toUpperCase() === hex.toUpperCase();
  paleta.append(h('button', { class: 'acc-op' + (!propio ? ' on' : ''), title: 'El del tema · ' + baseT.acc,
    style: `--c:${baseT.acc}`, onclick: () => { delete m.acento; commit(); } }, h('i', null), h('span', null, 'Tema')));
  ACENTOS.filter(([hex]) => hex.toUpperCase() !== baseT.acc.toUpperCase()).forEach(([hex, nom]) =>
    paleta.append(h('button', { class: 'acc-op' + (propio && marca(hex) ? ' on' : ''), title: nom + ' · ' + hex,
      style: `--c:${hex}`, onclick: () => { m.acento = hex; commit(); } }, h('i', null))));
  g1.append(paleta);
  const inp = h('input', { type: 'color', class: 'acc-inp', value: m.acento || baseT.acc,
    oninput: e => { m.acento = e.target.value.toUpperCase(); renderCanvas(); renderFilmstrip(); },
    onchange: () => commit({ skipInsp: true }) });
  g1.append(h('div', { class: 'acc-libre' }, inp,
    h('span', null, propio ? m.acento.toUpperCase() : 'Elige el tuyo'),
    propio ? h('button', { class: 'btn btn-sm', onclick: () => { delete m.acento; commit(); } }, 'Quitar') : null));
  g1.append(h('p', { class: 'hint' }, propio
    ? 'Se aplica a títulos, viñetas, cajas, diagramas y al pie, y viaja al .tex como \\definecolor + \\setbeamercolor{structure}. Las series de las gráficas conservan su paleta, que está comprobada para daltonismo y contraste.'
    : 'Cada tema trae el suyo. Puedes poner el de tu universidad o el de tu laboratorio: todo lo que se pinta lo toma de aquí, incluido el código Beamer.'));
  body.append(aPlegable('tema', g1, (THEMES[m.theme] || {}).name + (propio ? ' · color propio' : '')));

  const g2 = h('div', { class: 'igroup' }, h('span', { class: 'panel-label' }, 'Formato'));
  const seg = h('div', { class: 'seg', style: 'margin-bottom:9px' });
  [['169', 'Panorámica 16:9'], ['43', 'Clásica 4:3']].forEach(([v, n]) =>
    seg.append(h('button', { class: m.aspect === v ? 'on' : '', onclick: () => { m.aspect = v; S.zoom = null; commit(); } }, n)));
  g2.append(seg);
  body.append(aPlegable('formato', g2, m.aspect === '43' ? 'Clásica 4:3' : 'Panorámica 16:9'));

  /* ---- transiciones ---- */
  const tr = transDe(m);
  const gTr = h('div', { class: 'igroup' }, h('span', { class: 'panel-label' }, 'Al pasar de diapositiva'));
  const segTr = h('div', { class: 'seg', style: 'margin-bottom:9px' });
  TRANS.forEach(t => segTr.append(h('button', { class: tr.id === t.id ? 'on' : '', title: t.d,
    onclick: () => { m.trans = t.id; commit(); } }, t.n)));
  gTr.append(segTr);
  gTr.append(h('p', { class: 'hint' }, tr.d + (tr.tex
    ? ' Viaja al código Beamer como ' + tr.tex.split('[')[0] + ', así que el PDF pasa igual que la pantalla.'
    : '')));
  gTr.append(h('p', { class: 'hint', style: 'margin-top:-2px' },
    'Si tu sistema tiene activado «reducir movimiento», la app lo respeta y no anima nada.'));
  body.append(aPlegable('trans', gTr, tr.n));

  /* ---- notación científica ---- */
  const gN = h('div', { class: 'igroup' }, h('span', { class: 'panel-label' }, 'Notación científica'));
  gN.append(h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: m.notacion !== false,
    onchange: e => { m.notacion = e.target.checked; commit(); } }), 'Arreglar unidades y fórmulas al escribir'));
  gN.append(h('p', { class: 'hint' },
    'Escribes 10 mg/L y queda 10 mg L⁻¹; escribes CH3NH3PbI3 y quedan los subíndices; 2theta se vuelve 2θ. ' +
    'En el código Beamer sale como \\SI de siunitx y \\ce de mhchem, que es lo correcto. ' +
    'Solo toca el texto plano: nunca lo que va entre $…$ ni el código.'));
  body.append(aPlegable('notacion', gN, m.notacion !== false ? 'activada' : 'desactivada'));

  /* ---- tipografía ---- */
  const fu = fuenteDe(m);
  const gFu = h('div', { class: 'igroup' }, h('span', { class: 'panel-label' }, 'Tipografía'));
  const tarjeta = f => {
    const card = h('button', { class: 'fu-card' + (fu.id === f.id ? ' on' : ''), title: f.d,
      onclick: () => { m.fuente = f.id === 'auto' ? null : f.id; commit(); } });
    card.append(h('div', { class: 'fu-muestra' + (f.id !== 'auto' ? ' fu-' + f.id : '') },
      f.id === 'auto' ? 'Aa Bb Cc 0123' : 'Aa Bb Cc 0123'));
    card.append(h('div', { class: 'fu-nom' }, f.n, f.propia ? h('span', { class: 'fu-tag', title: 'Va dentro de la app: se ve igual aunque no haya internet' }, 'LaTeX') : null));
    if (f.esp) card.append(h('div', { class: 'fu-esp' }, f.esp));
    return card;
  };
  gFu.append(tarjeta(FU.auto));
  ['serif', 'sans'].forEach(g => {
    gFu.append(h('span', { class: 'sublabel' }, GRUPO_FUENTE[g]));
    FUENTES.filter(f => f.grp === g).forEach(f => gFu.append(tarjeta(f)));
  });
  gFu.append(h('p', { class: 'hint' }, fu.d));
  if (fu.texTxt) {
    gFu.append(h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: m.fuenteMat !== false,
      onchange: e => { m.fuenteMat = e.target.checked; commit({ skipInsp: true }); } }),
      'Que las matemáticas también usen esta familia'));
    gFu.append(h('p', { class: 'hint', style: 'margin-top:-2px' },
      'Solo cambia el PDF de LaTeX. En pantalla las ecuaciones siempre se ven con Computer Modern; si desactivas la casilla, el PDF queda igual que la pantalla.'));
  }
  body.append(aPlegable('tipografia', gFu, fu.n));

  const p = pieDe(m);
  const gPie = h('div', { class: 'igroup' }, h('span', { class: 'panel-label' }, 'Pie de página'));
  gPie.append(h('div', { class: 'pie-resumen' },
    h('b', null, (PIE_MODOS.find(x => x.id === p.modo) || {}).n || 'El del tema'),
    h('span', null, p.modo === 'tema'
      ? ((m.footline !== false ? 'barra del tema' : 'sin barra') + (m.numbers !== false ? ' · con número' : ' · sin número'))
      : p.modo === 'celdas' ? (p.ncel + ' celdas · ' + p.celdas.slice(0, p.ncel).map(c => (INS[c.t] || {}).n || '').join(' | '))
      : p.modo === 'linea' ? (p.texto || '—')
      : p.modo === 'numero' ? (p.numFormato === 'n' ? 'solo el número' : 'número y total')
      : 'sin nada abajo')));
  gPie.append(h('button', { class: 'btn btn-wide', onclick: openPieEditor }, '⚙ Configurar el pie…'));
  if (p.modo === 'tema') {
    gPie.append(h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: m.numbers !== false, onchange: e => { m.numbers = e.target.checked; commit({ skipInsp: true }); } }), 'Número de diapositiva'));
    gPie.append(h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: m.footline !== false, onchange: e => { m.footline = e.target.checked; commit({ skipInsp: true }); } }), 'Barra de pie del tema'));
  }
  body.append(aPlegable('pie', gPie, (PIE_MODOS.find(x => x.id === p.modo) || {}).n || ''));

  const g25 = h('div', { class: 'igroup' }, h('span', { class: 'panel-label' }, 'Identidad institucional'));
  if (m.logo) {
    g25.append(h('div', { class: 'logo-box' }, h('img', { src: m.logo, alt: 'Logotipo' })));
    const fila = h('div', { class: 'row-btns' },
      h('button', { class: 'btn btn-sm', onclick: () => pickLogo() }, 'Cambiar…'),
      h('button', { class: 'btn btn-sm', onclick: () => { delete m.logo; commit(); } }, 'Quitar'));
    g25.append(fila);
    g25.append(h('span', { class: 'hint' }, 'En la portada'));
    const seg2 = h('div', { class: 'seg', style: 'margin:5px 0 9px' });
    [['arriba', 'Arriba, centrado'], ['esquina', 'Esquina superior']].forEach(([v, n]) =>
      seg2.append(h('button', { class: (m.logoPos || 'arriba') === v ? 'on' : '', onclick: () => { m.logoPos = v; commit(); } }, n)));
    g25.append(seg2);
    if ((m.logoPos || 'arriba') === 'arriba') {
      const labL = h('label', null, `Tamaño en la portada · ${m.logoW || 16} %`);
      g25.append(h('div', { class: 'irow' }, labL),
        h('input', { type: 'range', min: 6, max: 40, step: 1, value: m.logoW || 16,
          oninput: e => { m.logoW = +e.target.value; labL.textContent = `Tamaño en la portada · ${e.target.value} %`; renderCanvas(); },
          onchange: () => commit({ skipInsp: true }) }));
    }
    g25.append(h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!m.logoPie,
      onchange: e => { m.logoPie = e.target.checked; commit({ skipInsp: true }); } }), 'También en el pie de cada diapositiva'));
  } else {
    g25.append(h('button', { class: 'btn btn-wide', onclick: () => pickLogo() }, '⬆ Subir escudo o logotipo…'));
    g25.append(h('span', { class: 'hint' }, 'PNG con fondo transparente o SVG. Aparece en la portada y, si quieres, en el pie de todas las diapositivas; también se exporta al código Beamer.'));
  }
  g25.append(h('input', { class: 'field', value: m.pieTexto || '', placeholder: 'Leyenda del pie (p. ej. Maestría en Ciencias en Química · CUCEI)', style: 'margin-top:9px',
    onchange: e => { m.pieTexto = e.target.value; commit({ skipInsp: true }); } }));
  body.append(aPlegable('identidad', g25, m.logo ? 'con escudo' : 'sin escudo'));

  const g3 = h('div', { class: 'igroup' }, h('span', { class: 'panel-label' }, 'Datos de la portada'));
  const fld = (key, ph) => h('input', { class: 'field', value: m[key] || '', placeholder: ph, style: 'margin-bottom:7px',
    onchange: e => { m[key] = e.target.value; commit({ skipInsp: true }); } });
  g3.append(fld('title', 'Título'), fld('subtitle', 'Subtítulo'), fld('authors', 'Autores'), fld('institute', 'Institución'), fld('date', 'Fecha'), fld('short', 'Título corto (pie de página)'));
  body.append(aPlegable('portada', g3, (m.authors || '').split('·')[0].trim() || 'sin autores'));

  const g4 = h('div', { class: 'igroup' }, h('span', { class: 'panel-label' }, 'Estilos'));
  g4.append(h('button', { class: 'btn btn-wide', onclick: openEstilos }, '◆ Guardar o aplicar un estilo…'));
  const nOm = (S.prefs || {}).estiloPorOmision;
  g4.append(h('p', { class: 'hint' }, nOm
    ? 'Las presentaciones nuevas arrancan con «' + nOm + '».'
    : 'Guarda esta combinación de tema, color, tipografía, pie y escudo para reutilizarla y para que las presentaciones nuevas arranquen con ella.'));
  body.append(aPlegable('estilos', g4, nOm || 'ninguno guardado'));
}

/* ---------- logotipo institucional ---------- */
function pickLogo() {
  let inp = $('#logoFileInput');
  if (!inp) {
    inp = h('input', { type: 'file', id: 'logoFileInput', accept: 'image/*', style: 'display:none' });
    document.body.append(inp);
    inp.addEventListener('change', () => {
      const file = inp.files[0]; inp.value = '';
      if (!file) return;
      const rd = new FileReader();
      rd.onload = () => {
        const url = rd.result;
        const m = S.deck.meta;
        const listo = src => { m.logo = src; if (m.logoW == null) m.logoW = 16; if (m.logoPos == null) m.logoPos = 'arriba'; commit(); };
        if (file.type === 'image/svg+xml' || file.size < 160000) { listo(url); return; }
        const img = new Image();
        img.onload = () => {
          const MAX = 900;
          let w = img.width, hh = img.height;
          if (Math.max(w, hh) > MAX) { const k = MAX / Math.max(w, hh); w = Math.round(w * k); hh = Math.round(hh * k); }
          const cv = h('canvas'); cv.width = w; cv.height = hh;
          cv.getContext('2d').drawImage(img, 0, 0, w, hh);
          listo(cv.toDataURL('image/png'));
        };
        img.onerror = () => listo(url);
        img.src = url;
      };
      rd.readAsDataURL(file);
    });
  }
  inp.click();
}

