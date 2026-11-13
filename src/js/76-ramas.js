/* ==== 76-ramas.js ==== */
'use strict';
/* ================= ramas con sentido =================
   «La del comité», «la de diez minutos», «la del congreso con la DRX nueva»
   no son archivos distintos: son ramas de la misma charla. Una rama es un
   nombre, las diapositivas que no van en ella, y opcionalmente su nivel y su
   título. Las figuras y las referencias son las mismas por construcción:
   corriges una y queda corregida en todas. Al presentar y al exportar, las
   diapositivas fuera de la rama activa no existen; en la tira se ven atenuadas. */

const ramasDe = deck => { const d = deck || S.deck; if (!Array.isArray(d.meta.ramas)) d.meta.ramas = []; return d.meta.ramas; };
const ramaActiva = deck => { const d = deck || S.deck; return ramasDe(d).find(r => r.id === d.meta.rama) || null; };
/* ¿Esta diapositiva va en la rama activa? Sin rama activa va todo. */
function enRama(sl, deck) {
  const r = ramaActiva(deck);
  if (!r || !sl) return true;
  return !(Array.isArray(r.fuera) && r.fuera.includes(sl.id));
}
const fueraDeRama = (sl, deck) => !enRama(sl, deck);
function alternaEnRama(i) {
  const r = ramaActiva();
  if (!r) { toast('Primero elige una rama en Diseño → Ramas'); return; }
  const sl = S.deck.slides[i]; if (!sl || sl.layout === 'title') return;
  r.fuera = Array.isArray(r.fuera) ? r.fuera : [];
  const k = r.fuera.indexOf(sl.id);
  if (k >= 0) r.fuera.splice(k, 1); else r.fuera.push(sl.id);
  commit();
}
function nuevaRama(nombre, base) {
  const r = { id: uid(), n: nombre || 'Rama', fuera: base ? (base.fuera || []).slice() : [], nivel: base ? base.nivel : null, titulo: base ? base.titulo : '' };
  ramasDe(S.deck).push(r);
  S.deck.meta.rama = r.id;
  commit();
  return r;
}
function activaRama(id) {
  S.deck.meta.rama = id || null;
  const r = ramaActiva();
  if (r && r.nivel) S.deck.meta.nivel = r.nivel;
  commit();
  toast(r ? 'Rama: ' + r.n + ' · ' + cuentaRama(r) : 'Sin rama: se ve todo');
}
function cuentaRama(r) {
  const n = S.deck.slides.filter(sl => !sl.bibAuto && sl.layout !== 'title' && !(r.fuera || []).includes(sl.id)).length;
  const min = S.deck.slides.filter(sl => !(r.fuera || []).includes(sl.id) && !esRespaldo(sl)).reduce((a, sl) => a + (minutosDe(sl) || 0), 0);
  return n + ' diapositivas' + (min ? ' · ' + Math.round(min) + ' min' : '');
}
/* Título de la charla en la rama activa (para el .tex y la portada). */
function tituloEnRama(deck) {
  const r = ramaActiva(deck);
  return (r && r.titulo) ? r.titulo : (deck || S.deck).meta.title || '';
}

function openRamas() {
  const cuerpo = h('div');
  const pinta = () => {
    cuerpo.innerHTML = '';
    const ramas = ramasDe(S.deck);
    cuerpo.append(h('p', { class: 'hint', style: 'margin:0 0 10px' },
      'Una rama es la misma charla con algunas diapositivas fuera, un nivel y, si quieres, otro título. Las figuras, las referencias y el texto son compartidos: corriges una vez. ' +
      'Para sacar una diapositiva de la rama activa, en su panel o con el botón ⊘ de la tira.'));
    const fila = h('div', { class: 'rm-fila' + (!S.deck.meta.rama ? ' on' : '') },
      h('button', { class: 'rm-nom', onclick: () => { activaRama(null); pinta(); } }, h('b', null, 'La charla completa'), h('span', null, S.deck.slides.length + ' diapositivas')));
    cuerpo.append(fila);
    ramas.forEach(r => {
      const activa = S.deck.meta.rama === r.id;
      cuerpo.append(h('div', { class: 'rm-fila' + (activa ? ' on' : '') },
        h('button', { class: 'rm-nom', onclick: () => { activaRama(r.id); pinta(); } },
          h('b', null, r.n), h('span', null, cuentaRama(r) + (r.nivel ? ' · ' + (NK[r.nivel] || {}).n : '') + (r.titulo ? ' · «' + r.titulo + '»' : ''))),
        h('button', { class: 'icon-btn', title: 'Renombrar / ajustar', onclick: () => editaRama(r) }, '✎'),
        h('button', { class: 'icon-btn', title: 'Duplicar como rama nueva', onclick: () => { nuevaRama(r.n + ' (copia)', r); pinta(); } }, '⧉'),
        h('button', { class: 'icon-btn', title: 'Quitar la rama (las diapositivas no se borran)', onclick: () => { const k = ramas.indexOf(r); ramas.splice(k, 1); if (S.deck.meta.rama === r.id) S.deck.meta.rama = null; commit(); pinta(); } }, '✕')));
    });
    cuerpo.append(h('div', { style: 'display:flex;gap:6px;margin-top:10px;flex-wrap:wrap' },
      h('button', { class: 'btn btn-sm btn-pri', onclick: () => { const r = nuevaRama('Rama ' + (ramas.length + 1)); editaRama(r); } }, '+ Rama'),
      h('button', { class: 'btn btn-sm', title: 'Crear una rama nueva ajustada al tiempo, sin cambiar la de origen ni el respaldo', onclick: () => { closeModal(); openAjustarTiempo(true); } }, '◷ Rama de N minutos…')));
  };
  const editaRama = r => {
    const nom = h('input', { class: 'field', value: r.n, oninput: e => { r.n = e.target.value; } });
    const tit = h('input', { class: 'field', value: r.titulo || '', placeholder: 'Título de la charla en esta rama (opcional)', oninput: e => { r.titulo = e.target.value; } });
    const niv = h('select', { class: 'field', onchange: e => { r.nivel = e.target.value || null; } }, h('option', { value: '' }, 'El nivel que tenga la charla'));
    NIVELES.forEach(x => niv.append(h('option', { value: x.id, selected: r.nivel === x.id }, x.n)));
    const lista = h('div', { class: 'rm-lista' });
    S.deck.slides.forEach((sl, i) => {
      if (sl.layout === 'title' || sl.bibAuto) return;
      const fuera = (r.fuera || []).includes(sl.id);
      lista.append(h('label', { class: 'check rm-sl' + (fuera ? ' fuera' : '') },
        h('input', { type: 'checkbox', checked: !fuera, onchange: e => { r.fuera = r.fuera || []; const k = r.fuera.indexOf(sl.id); if (e.target.checked && k >= 0) r.fuera.splice(k, 1); if (!e.target.checked && k < 0) r.fuera.push(sl.id); } }),
        h('span', { class: 'rm-n' }, String(i + 1)), (sl.layout === 'section' ? '§ ' : '') + (sl.title || '(sin título)')));
    });
    openModal({ title: 'Rama', size: '', body: h('div', null,
      h('div', { class: 'irow' }, h('label', null, 'Nombre'), h('div', { style: 'flex:1.6' }, nom)),
      h('div', { class: 'irow' }, h('label', null, 'Título'), h('div', { style: 'flex:1.6' }, tit)),
      h('div', { class: 'irow' }, h('label', null, 'Nivel'), h('div', { style: 'flex:1.6' }, niv)),
      h('div', { class: 'panel-label', style: 'margin-top:10px' }, 'Qué va en esta rama'), lista),
      foot: [h('button', { class: 'btn btn-pri', onclick: () => { commit(); closeModal(); openRamas(); } }, 'Listo')] });
  };
  pinta();
  openModal({ title: 'Ramas de la charla', size: 'modal-lg', body: cuerpo,
    foot: [h('button', { class: 'btn btn-pri', onclick: () => closeModal() }, 'Listo')] });
}


