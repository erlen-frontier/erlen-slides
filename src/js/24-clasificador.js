/* ==== 24-clasificador.js ==== */
'use strict';
/* ================= vista de clasificador =================
   Todas las diapositivas a la vez, para ver la estructura y reordenarla. */

const CL = { on: false, keyh: null, arrastra: null };

function abreClasificador() {
  if (CL.on) return;
  flushEdicion();
  CL.on = true;
  const raiz = $('#sorterRoot');
  raiz.innerHTML = '';
  const rej = h('div', { class: 'cl-rej', id: 'clRej', role: 'listbox', 'aria-label': 'Diapositivas', 'aria-multiselectable': 'true' });
  const cuenta = h('span', { class: 'cl-cuenta' });
  const estado = h('span', { class: 'cl-estado', role: 'status', 'aria-live': 'polite' });
  const acciones = h('div', { class: 'cl-acc' });
  const wrap = h('div', { class: 'cl-root', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Vista de clasificador' },
    h('div', { class: 'cl-barra' },
      h('span', { class: 'cl-tit' }, 'Todas las diapositivas'),
      cuenta, estado, acciones,
      h('button', { class: 'btn', onclick: cierraClasificador }, 'Cerrar')),
    rej);
  raiz.append(wrap);
  pintaClasificador();
  CL.keyh = e => teclaClasificador(e);
  window.addEventListener('keydown', CL.keyh, true);
  document.body.classList.add('con-clasificador');

  function pintaAcciones() {
    const v = seleccionadas();
    const marcadas = S.sel ? S.sel.size : 0;
    cuenta.textContent = marcadas ? marcadas + (marcadas === 1 ? ' marcada' : ' marcadas') : S.deck.slides.length + ' diapositivas';
    acciones.innerHTML = '';
    acciones.append(
      h('button', { class: 'btn btn-sm', 'aria-label': 'Mover antes: diapositiva actual', disabled: !!marcadas || S.cur === 0, onclick: () => moverActual(-1) }, h('span', { 'aria-hidden': 'true' }, '← '), 'Mover antes'),
      h('button', { class: 'btn btn-sm', 'aria-label': 'Mover después: diapositiva actual', disabled: !!marcadas || S.cur === S.deck.slides.length - 1, onclick: () => moverActual(1) }, 'Mover después', h('span', { 'aria-hidden': 'true' }, ' →')));
    if (v.length) acciones.append(
      h('button', { class: 'btn btn-sm', onclick: () => { duplicaSeleccion(); pintaClasificador(); } }, '⧉ Duplicar'),
      h('button', { class: 'btn btn-sm btn-danger', onclick: () => { borraSeleccion(); pintaClasificador(); } }, '✕ Eliminar'));
    if (marcadas) acciones.append(h('button', { class: 'btn btn-sm', onclick: () => { limpiaSeleccion(); pintaClasificador(); } }, 'Quitar la marca'));
  }

  function pintaClasificador() {
    rej.innerHTML = '';
    const [W, H] = slideDims(S.deck);
    const tw = window.matchMedia('(max-width:700px)').matches ? 200 : 268;
    const k = tw / W, th = Math.round(H * k);
    const secs = seccionDe(S.deck);
    S.sel = S.sel || new Set();
    S.deck.slides.forEach((sl, i) => {
      if (sl.layout === 'section') {
        rej.append(h('div', { class: 'cl-sec', role: 'presentation', 'aria-hidden': 'true' }, h('span', null, (sl.title || 'Sección').trim() || 'Sección')));
      }
      const clip = h('div', { class: 'cl-clip', 'aria-hidden': 'true', style: `width:${tw}px;height:${th}px` });
      const mini = renderSlide(S.deck, i, 'thumb', 99);
      mini.style.transform = `scale(${k})`; mini.style.transformOrigin = 'top left';
      clip.append(mini);
      const cel = h('div', {
        class: 'cl-cel' + (i === S.cur ? ' actual' : '') + (S.sel.has(i) ? ' multi' : ''),
        draggable: S.sel.size ? 'false' : 'true', 'data-i': i, tabindex: '0', role: 'option', 'aria-selected': (S.sel.size ? S.sel.has(i) : i === S.cur) ? 'true' : 'false',
        'aria-label': `Diapositiva ${i + 1}: ${(sl.title || '').trim() || (LAY[sl.layout] || {}).name || ''}`
      }, clip,
        h('div', { class: 'cl-pie', 'aria-hidden': 'true' },
          h('span', { class: 'cl-n' }, String(i + 1)),
          h('span', { class: 'cl-t' }, (sl.title || '').trim() || (LAY[sl.layout] || {}).name || ''),
          minutosDe(sl) ? h('span', { class: 'cl-min' }, mmss(minutosDe(sl))) : null));
      cel.addEventListener('click', e => {
        if (e.ctrlKey || e.metaKey) { if (!S.sel.size) S.sel.add(S.cur); S.sel.has(i) ? S.sel.delete(i) : S.sel.add(i); pintaClasificador(); return; }
        if (e.shiftKey) { const a = Math.min(S.cur, i), b = Math.max(S.cur, i); for (let k2 = a; k2 <= b; k2++) S.sel.add(k2); pintaClasificador(); return; }
        S.sel.clear(); S.cur = i; S.selBlock = null; cierraClasificador();
      });
      cel.addEventListener('dblclick', () => { S.sel.clear(); S.cur = i; S.selBlock = null; cierraClasificador(); });
      cel.addEventListener('dragstart', e => { if (S.sel.size) { e.preventDefault(); return; } CL.arrastra = i; e.dataTransfer.effectAllowed = 'move'; cel.classList.add('llevando'); });
      cel.addEventListener('dragend', () => { cel.classList.remove('llevando'); CL.arrastra = null; });
      cel.addEventListener('dragover', e => {
        e.preventDefault();
        const r = cel.getBoundingClientRect();
        cel.classList.toggle('antes', e.clientX - r.left < r.width / 2);
        cel.classList.toggle('despues', e.clientX - r.left >= r.width / 2);
      });
      cel.addEventListener('dragleave', () => cel.classList.remove('antes', 'despues'));
      cel.addEventListener('drop', e => {
        e.preventDefault();
        const antes = cel.classList.contains('antes');
        cel.classList.remove('antes', 'despues');
        if (CL.arrastra == null || S.sel.size) { CL.arrastra = null; return; }
        let to = i + (antes ? 0 : 1);
        if (CL.arrastra < to) to--;
        if (to !== CL.arrastra && CL.arrastra !== S.cur) S.selBlock = null;
        moveSlide(CL.arrastra, to);
        CL.arrastra = null;
        pintaClasificador();
      });
      rej.append(cel);
    });
    pintaAcciones();
    const act = rej.querySelector('.cl-cel.actual');
    if (act) act.scrollIntoView({ block: 'center' });
  }
  function moverActual(direccion) {
    if (S.sel && S.sel.size) { estado.textContent = 'Quita la selección múltiple para mover una diapositiva.'; return; }
    const destino = S.cur + direccion;
    if (destino < 0 || destino >= S.deck.slides.length) return;
    flushEdicion();
    moveSlide(S.cur, destino);
    pintaClasificador();
    const actual = rej.querySelector('.cl-cel.actual');
    if (actual) actual.focus();
    estado.textContent = 'Diapositiva movida a la posición ' + (destino + 1) + ' de ' + S.deck.slides.length + '.';
  }
  CL.pinta = pintaClasificador;
  CL.mover = moverActual;
}

function teclaClasificador(e) {
  if (!CL.on) return;
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cierraClasificador(); return; }
  if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    e.preventDefault(); e.stopPropagation(); CL.mover(e.key === 'ArrowLeft' ? -1 : 1); return;
  }
  if (e.target instanceof Element && e.target.closest('button')) return;
  const cels = $$('#clRej .cl-cel');
  if (!cels.length) return;
  const iAct = Math.max(0, cels.findIndex(c => +c.dataset.i === S.cur));
  const porFila = Math.max(1, Math.round($('#clRej').clientWidth / (cels[0].offsetWidth + 16)));
  let j = null;
  if (e.key === 'ArrowRight') j = iAct + 1;
  else if (e.key === 'ArrowLeft') j = iAct - 1;
  else if (e.key === 'ArrowDown') j = iAct + porFila;
  else if (e.key === 'ArrowUp') j = iAct - porFila;
  else if (e.key === 'Home') j = 0;
  else if (e.key === 'End') j = cels.length - 1;
  else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); cierraClasificador(); return; }
  if (j == null) return;
  e.preventDefault(); e.stopPropagation();
  j = clamp(j, 0, cels.length - 1);
  if (+cels[j].dataset.i !== S.cur) S.selBlock = null;
  S.cur = +cels[j].dataset.i;
  CL.pinta();
  const n = $$('#clRej .cl-cel')[j];
  if (n) n.focus();
}

function cierraClasificador() {
  if (!CL.on) return;
  CL.on = false;
  window.removeEventListener('keydown', CL.keyh, true);
  CL.mover = null;
  document.body.classList.remove('con-clasificador');
  $('#sorterRoot').innerHTML = '';
  renderAll();
}
function alternaClasificador() { CL.on ? cierraClasificador() : abreClasificador(); }


