/* ==== 72-cierre.js ==== */
'use strict';
/* ================= cerrar el ciclo después de presentar =================
   Al terminar marcas en qué diapositivas preguntaron o hubo caras de duda.
   Con varias charlas acumuladas, la app te enseña qué explicaciones tuyas
   confunden de manera consistente. Es la única forma de mejorar como
   expositor: retroalimentación agregada sobre tu propio material, no sobre
   consejos genéricos. */

const LS_CHARLAS = 'tabula.charlas';
const charlasStore = () => { const v = lsGet(LS_CHARLAS, []); return Array.isArray(v) ? v : []; };
function guardaCharla(reg) {
  const st = charlasStore();
  st.push(reg);
  while (st.length > 60) st.shift();
  lsSet(LS_CHARLAS, st);
}
/* La clave de una diapositiva entre charlas: su título llano. Así «la banda
   baja con el yodo» se reconoce aunque hayas movido la diapositiva. */
const claveTitulo = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 80);

function openCierre(duracionSeg) {
  const marcas = {};
  const rej = h('div', { class: 'ci-rej' });
  const [W, H] = slideDims(S.deck);
  const anchoMini = 172, esc = anchoMini / W;
  S.deck.slides.forEach((sl, i) => {
    if (sl.layout === 'title' || sl.bibAuto) return;
    const mini = h('div', { class: 'ci-mini', style: `width:${anchoMini}px;height:${Math.round(H * esc)}px` },
      h('div', { style: `transform:scale(${esc});transform-origin:0 0;width:${W}px;height:${H}px;pointer-events:none` }, renderSlide(S.deck, i, 'thumb', 99)));
    const est = h('div', { class: 'ci-est' });
    const b = (k, ic, tit) => h('button', { class: 'ci-b', title: tit, onclick: e => {
      const m = marcas[sl.id] = marcas[sl.id] || {};
      m[k] = !m[k];
      e.currentTarget.classList.toggle('on', !!m[k]);
    } }, ic);
    est.append(b('p', '?', 'Aquí preguntaron'), b('d', '☹', 'Hubo caras de duda'), b('f', '✓', 'Fluyó bien'));
    rej.append(h('div', { class: 'ci-celda' }, mini, h('div', { class: 'ci-num' }, String(i + 1)), est));
  });
  const nota = h('textarea', { class: 'field', rows: 2, placeholder: 'Algo que quieras recordar de esta charla (opcional)' });
  const guarda = () => {
    const reg = { cuando: new Date().toISOString(), titulo: S.deck.meta.title || '', dur: duracionSeg || 0, nota: nota.value.trim(),
      diapositivas: S.deck.slides.map(sl => ({ id: sl.id, clave: claveTitulo(sl.title), titulo: sl.title || '', m: marcas[sl.id] || {} })) };
    guardaCharla(reg);
    closeModal();
    toast('Guardado. Con dos o tres charlas ya se ve qué repite.');
  };
  openModal({ title: '¿Cómo fue? Marca dónde preguntaron', size: 'modal-lg',
    body: h('div', null,
      h('p', { class: 'hint', style: 'margin:0 0 10px' }, 'Un toque por diapositiva: «?» preguntaron, «☹» caras de duda, «✓» fluyó. Con varias charlas, «Lo que aprendiste» te dice qué explicación confunde siempre.'),
      rej, nota),
    foot: [h('button', { class: 'btn', onclick: () => closeModal() }, 'Ahora no'), h('button', { class: 'btn btn-pri', onclick: guarda }, 'Guardar')] });
}
/* Lo que se repite entre charlas. */
function aprendizajeCharlas() {
  const st = charlasStore();
  const por = {};
  st.forEach(c => c.diapositivas.forEach(d => {
    if (!d.clave) return;
    const r = por[d.clave] = por[d.clave] || { clave: d.clave, titulo: d.titulo, veces: 0, p: 0, d: 0, f: 0 };
    r.veces++; if (d.m.p) r.p++; if (d.m.d) r.d++; if (d.m.f) r.f++;
  }));
  const filas = Object.values(por).filter(r => r.veces >= 1 && (r.p || r.d || r.f));
  filas.sort((a, b) => (b.d + b.p) / b.veces - (a.d + a.p) / a.veces);
  return { charlas: st.length, filas };
}
function openAprendizaje() {
  const { charlas, filas } = aprendizajeCharlas();
  const cuerpo = h('div');
  if (!charlas) cuerpo.append(h('p', { class: 'hint' }, 'Todavía no hay charlas registradas. Al terminar de presentar, la app te pregunta dónde preguntaron; con eso se arma esto.'));
  else {
    cuerpo.append(h('p', { class: 'hint', style: 'margin:0 0 10px' }, charlas + (charlas === 1 ? ' charla registrada' : ' charlas registradas') + '. Se agrupan por título, así que una diapositiva se reconoce aunque la muevas.'));
    const confunden = filas.filter(r => r.veces >= 2 && (r.d + r.p) / r.veces >= 0.5);
    if (confunden.length) {
      cuerpo.append(h('div', { class: 'panel-label' }, 'Lo que confunde de manera consistente'));
      confunden.forEach(r => cuerpo.append(h('div', { class: 'ap-fila mal' },
        h('b', null, r.titulo || r.clave), h('span', null, 'dudas o preguntas en ' + (r.d + r.p) + ' de ' + r.veces + ' charlas'),
        h('em', null, r.d > r.p ? '→ Reescribe la explicación o añade un ejemplo concreto antes de la figura.' : '→ Prepara la respuesta como respaldo, o mete en la diapositiva lo que siempre preguntan.'))));
    }
    const fluyen = filas.filter(r => r.veces >= 2 && r.f / r.veces >= 0.5 && !(r.d + r.p));
    if (fluyen.length) {
      cuerpo.append(h('div', { class: 'panel-label', style: 'margin-top:10px' }, 'Lo que siempre fluye'));
      fluyen.forEach(r => cuerpo.append(h('div', { class: 'ap-fila bien' }, h('b', null, r.titulo || r.clave), h('span', null, 'fluyó en ' + r.f + ' de ' + r.veces))));
    }
    if (!confunden.length && !fluyen.length) cuerpo.append(h('p', { class: 'hint' }, 'Con una sola charla aún no hay patrón. Marca la próxima también.'));
    cuerpo.append(h('div', { class: 'panel-label', style: 'margin-top:10px' }, 'Todas las marcas'));
    filas.forEach(r => cuerpo.append(h('div', { class: 'ap-fila' }, h('b', null, r.titulo || r.clave), h('span', null, '? ' + r.p + ' · ☹ ' + r.d + ' · ✓ ' + r.f + ' / ' + r.veces))));
    cuerpo.append(h('button', { class: 'btn btn-sm btn-danger', style: 'margin-top:10px', onclick: () => { try { localStorage.removeItem(LS_CHARLAS); } catch (e) {} closeModal(); toast('Historial de charlas borrado'); } }, 'Borrar el historial'));
  }
  openModal({ title: 'Lo que aprendiste de tus charlas', size: 'modal-lg', body: cuerpo,
    foot: [h('button', { class: 'btn btn-pri', onclick: () => closeModal() }, 'Listo')] });
}


