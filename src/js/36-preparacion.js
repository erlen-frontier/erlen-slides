/* ==== 36-preparacion.js ==== */
'use strict';
/* ================= barra de preparación, pendientes y concentración =======
   · 06 · Metas claras es uno de los dos antecedentes del flujo que sí resisten
     el meta-análisis. Aquí la meta es una sola: ¿está lista para presentar?
   · 02 · Los pendientes hacen barata la reentrada tras una interrupción y
     hacen visible el progreso, que es la palanca más fuerte sobre el ánimo.
   · 03 · Menos cosas en pantalla cuando toca escribir. */

/* ---------- 06 · ¿está lista? ---------- */
let _prep = null, _prepPide = null;
function pintaPreparacion() {
  const el = $('#prepInd'); if (!el) return;
  if (!_prep) { el.textContent = 'Revisando…'; el.className = 'prep-ind'; return; }
  const { errores, avisos, pendientes } = _prep;
  el.innerHTML = '';
  const total = errores + avisos + pendientes;
  if (!total) {
    el.className = 'prep-ind lista';
    /* En una pantalla estrecha el rótulo completo se cortaba a media palabra:
       la parte prescindible se oculta en vez de recortarse. */
    el.append(h('i', { class: 'prep-pt' }), h('span', null, 'Lista',
      h('span', { class: 'only-wide-i' }, ' para presentar')));
    el.title = 'La revisión no encuentra nada que arreglar.';
    return;
  }
  el.className = 'prep-ind' + (errores ? ' con-error' : ' con-aviso');
  const p = [];
  if (errores) p.push([errores, errores === 1 ? ' problema' : ' problemas']);
  if (avisos) p.push([avisos, avisos === 1 ? ' aviso' : ' avisos']);
  if (pendientes) p.push([pendientes, pendientes === 1 ? ' pendiente' : ' pendientes']);
  /* Igual con las cuentas: en estrecho quedan las cifras, que es lo que se mira. */
  const texto = h('span', null);
  /* append() nativo escribe «null» si se le pasa null: el separador solo se
     añade cuando toca. */
  p.forEach(([n, nombre], i) => {
    if (i) texto.append(h('span', null, ' · '));
    texto.append(String(n), h('span', { class: 'only-wide-i' }, nombre));
  });
  el.append(h('i', { class: 'prep-pt' }), texto);
  el.title = 'Qué falta para que esté lista. Clic para verlo diapositiva por diapositiva.';
}
/* La revisión recorre todo el mazo y no es gratis: se recalcula en reposo. */
function pidePreparacion() {
  clearTimeout(_prepPide);
  _prepPide = setTimeout(() => {
    try {
      const r = revisaMazo();
      _prep = {
        errores: r.fallos.filter(f => f.grado === 'error').length,
        avisos: r.fallos.filter(f => f.grado === 'aviso').length,
        pendientes: cuentaPendientes()
      };
    } catch (e) { _prep = null; }
    pintaPreparacion();
  }, 900);
}

/* ---------- 02 · pendientes dentro de la presentación ----------
   Viven en el .json del proyecto pero nunca salen al PDF, al .tex ni al pptx. */
function pendientesDe(sl) { return (sl && Array.isArray(sl.todo)) ? sl.todo : []; }
function cuentaPendientes() {
  return S.deck.slides.reduce((a, sl) => a + pendientesDe(sl).filter(t => !t.ok).length, 0);
}
function agregaPendiente(i, texto) {
  const sl = S.deck.slides[i]; if (!sl) return;
  sl.todo = pendientesDe(sl).concat([{ id: uid(), t: texto, ok: false, when: Date.now() }]);
  commit();
}
function alternaPendiente(i, id) {
  const sl = S.deck.slides[i]; if (!sl) return;
  const t = pendientesDe(sl).find(x => x.id === id); if (!t) return;
  t.ok = !t.ok;
  commit();
}
function borraPendiente(i, id) {
  const sl = S.deck.slides[i]; if (!sl) return;
  sl.todo = pendientesDe(sl).filter(x => x.id !== id);
  if (!sl.todo.length) delete sl.todo;
  commit();
}
function nuevoPendiente(i) {
  const t = prompt('¿Qué falta en esta diapositiva?', '');
  if (t && t.trim()) agregaPendiente(i == null ? S.cur : i, t.trim());
}

function openPendientes() {
  const cuerpo = h('div');
  const dibuja = () => {
    cuerpo.innerHTML = '';
    const total = cuentaPendientes();
    cuerpo.append(h('p', { class: 'hint', style: 'margin-top:0' },
      'Notas de trabajo para ti. Se guardan en el proyecto y ' +
      'no aparecen en el PDF, ni en el código Beamer, ni en el PowerPoint.'));
    const lista = h('div', { class: 'pd-lista' });
    let hay = false;
    S.deck.slides.forEach((sl, i) => {
      const ts = pendientesDe(sl);
      if (!ts.length) return;
      hay = true;
      const tit = (sl.title || '').trim() || (LAY[sl.layout] || {}).name || '';
      lista.append(h('div', { class: 'pd-grupo' },
        h('button', { class: 'pd-cab', onclick: () => { S.cur = i; renderAll(); closeModal(); } },
          h('b', null, String(i + 1)), h('span', null, tit)),
        h('div', { class: 'pd-items' }, ts.map(t => h('div', { class: 'pd-item' + (t.ok ? ' hecho' : '') },
          h('label', { class: 'check' },
            h('input', { type: 'checkbox', checked: !!t.ok, onchange: () => { alternaPendiente(i, t.id); dibuja(); } }),
            t.t),
          h('button', { class: 'icon-btn', title: 'Quitar el pendiente', onclick: () => { borraPendiente(i, t.id); dibuja(); } }, '✕'))))));
    });
    if (!hay) {
      lista.append(h('div', { class: 'vacio-caja' },
        h('span', { class: 'vc-ic' }, '◔'),
        h('b', null, 'No hay pendientes anotados'),
        h('p', null, 'Sirven para dejar por escrito lo que falta —«poner la micrografía de SEM», «confirmar el dato con el asesor»— y encontrarlo al volver, sin reconstruir de memoria dónde ibas.'),
        h('div', { class: 'vc-vias' },
          h('button', { class: 'btn btn-sm btn-pri', onclick: () => { nuevoPendiente(S.cur); dibuja(); } },
            'Anotar uno en la diapositiva ' + (S.cur + 1)))));
    }
    cuerpo.append(lista);
    if (hay) cuerpo.append(h('p', { class: 'hint' }, total ? 'Quedan ' + total + ' sin marcar.' : 'Todos marcados como hechos.'));
  };
  dibuja();
  openModal({
    title: 'Pendientes', size: 'modal-sm', body: cuerpo,
    foot: [h('button', { class: 'btn', onclick: () => { nuevoPendiente(S.cur); dibuja(); } }, '+ En esta diapositiva'),
      h('button', { class: 'btn btn-pri', onclick: closeModal }, 'Listo')]
  });
}

/* ---------- 03 · modo concentración ---------- */
function alternaConcentracion(on) {
  const app = $('#app');
  const activo = on == null ? !app.classList.contains('concentrado') : !!on;
  app.classList.toggle('concentrado', activo);
  if (activo) toast('Modo concentración · F9 para salir');
  renderCanvas();
  renderFilmstrip();
}


