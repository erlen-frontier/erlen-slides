/* ==== 59-ajustar-tiempo.js ==== */
'use strict';
/* ================= ajustar la charla a un tiempo =================
   El caso que todo el mundo vive: tienes la charla de 45 y te dan 12. La regla
   2 del artículo de PLOS dice un minuto por diapositiva, así que la aritmética
   es sencilla; lo difícil es decidir qué se cae. Aquí no se borra nada: lo que
   sobra se manda al respaldo, donde sigue disponible si preguntan.

   Se ordena por lo que cuesta menos perder, y tú puedes marcar como
   imprescindible lo que no se toca. */

const MIN_POR_OMISION = 1;                 /* si no le pusiste minutos */
const minEstimado = sl => minutosDe(sl) || MIN_POR_OMISION;

/* Lo que no se quita nunca: portada, índice, secciones y lo marcado a mano. */
function intocable(sl) {
  return sl.layout === 'title' || sl.layout === 'toc' || sl.layout === 'section' || !!sl.clave;
}
/* Cuánto duele quitarla: número bajo = se va antes.
   Pesa el contenido, si tiene notas escritas, y dónde está en el guion. */
function valorDiapositiva(sl, i, deck) {
  if (intocable(sl)) return 1e6;
  let v = 0;
  const bloques = zonas(sl).flat();
  const tipos = new Set(bloques.map(b => b.type));
  /* lo que suele ser el resultado pesa más que el relleno */
  if (tipos.has('chart') || tipos.has('func')) v += 40;
  if (tipos.has('image') || tipos.has('galeria')) v += 26;
  if (tipos.has('math') || tipos.has('chem')) v += 22;
  if (tipos.has('table')) v += 20;
  if (tipos.has('montaje') || tipos.has('estruct') || tipos.has('geo')) v += 18;
  if (tipos.has('smart')) v += 14;
  if (tipos.has('teorema')) v += 16;
  if ((sl.notes || '').trim().length > 60) v += 18;   /* la preparaste con cuidado */
  if ((sl.citas || []).length) v += 8;
  const texto = bloques.map(b => (b.text || '') + (b.items || []).map(x => x.t || '').join(' ')).join(' ');
  v += clamp(texto.length / 60, 0, 12);
  /* las últimas de cada sección suelen ser detalle; las primeras, el argumento */
  const secs = typeof seccionDe === 'function' ? seccionDe(deck) : [];
  const mismaSec = secs.length ? secs[i] : null;
  if (mismaSec) {
    const dentro = deck.slides.filter((_, j) => secs[j] === mismaSec);
    const pos = dentro.indexOf(sl);
    if (pos === 0) v += 14;
    if (pos === dentro.length - 1 && dentro.length > 2) v -= 6;
  }
  /* una diapositiva de solo texto es la primera candidata */
  if (bloques.length && [...tipos].every(t => t === 'text' || t === 'bullets')) v -= 10;
  return v;
}

/* Devuelve el plan: qué se queda y qué se va al respaldo, para llegar al
   tiempo pedido sin tocar lo intocable. */
function planTiempo(deck, objetivoMin) {
  const d = deck || S.deck;
  const charla = [];
  d.slides.forEach((sl, i) => { if (!esRespaldo(sl)) charla.push({ sl, i, min: minEstimado(sl), val: valorDiapositiva(sl, i, d) }); });
  const actual = charla.reduce((a, x) => a + x.min, 0);
  const objetivo = Math.max(1, +objetivoMin || 0);
  const plan = { actual, objetivo, quitar: [], quedan: [], sobra: actual - objetivo, fijas: 0, resultado: actual, imposible: false };
  charla.forEach(x => { if (intocable(x.sl)) plan.fijas += x.min; });
  if (actual <= objetivo) { plan.quedan = charla; return plan; }
  /* se van las de menor valor hasta cuadrar, conservando al menos una */
  const orden = charla.filter(x => !intocable(x.sl)).sort((a, b) => a.val - b.val || b.min - a.min);
  let resta = actual - objetivo;
  const fuera = new Set();
  for (const x of orden) {
    if (resta <= 0 || fuera.size >= charla.length - 1) break;
    fuera.add(x.i); resta -= x.min;
  }
  plan.quitar = charla.filter(x => fuera.has(x.i));
  plan.quedan = charla.filter(x => !fuera.has(x.i));
  plan.resultado = plan.quedan.reduce((a, x) => a + x.min, 0);
  plan.imposible = resta > 0;              /* no se llega respetando las restricciones */
  return plan;
}

function aplicaPlanTiempo(plan) {
  const d = S.deck;
  const ids = new Set(plan.quitar.map(x => x.sl.id));
  if (!d.slides.some(sl => !esRespaldo(sl) && !ids.has(sl.id))) {
    toast('Tiene que quedar al menos una diapositiva en la charla', 'warn');
    return false;
  }
  const mover = d.slides.filter(sl => ids.has(sl.id));
  d.slides = d.slides.filter(sl => !ids.has(sl.id));
  mover.forEach(sl => { sl.respaldo = true; d.slides.push(sl); });
  S.cur = clamp(S.cur, 0, finCharla(d));
  S.selBlock = null;
  commit();
  return true;
}

/* ---------- la ventana ---------- */
function openAjustarTiempo() {
  const d = S.deck;
  const actual = slidesCharla(d).reduce((a, sl) => a + minEstimado(sl), 0);
  let objetivo = Math.max(5, Math.round(actual * 0.4 / 5) * 5);
  const vista = h('div');

  const pinta = () => {
    const plan = planTiempo(d, objetivo);
    vista.innerHTML = '';
    const cabe = plan.actual <= plan.objetivo;
    vista.append(h('div', { class: 'at-res' },
      h('div', null, h('b', null, mmss(plan.actual)), h('span', null, 'ahora')),
      h('div', { class: 'at-flecha' }, '→'),
      h('div', null, h('b', { class: cabe ? '' : 'at-obj' }, mmss(objetivo)), h('span', null, 'objetivo')),
      h('div', { class: 'at-cuenta' }, cabe
        ? 'Ya cabe: no hace falta quitar nada.'
        : plan.imposible
          ? 'No se alcanza el objetivo respetando las diapositivas imprescindibles y conservando al menos una en la charla. El plan deja ' + mmss(plan.resultado) + '.'
          : 'Al respaldo irían ' + plan.quitar.length + (plan.quitar.length === 1 ? ' diapositiva' : ' diapositivas') +
            ', y la charla quedaría en ' + mmss(plan.resultado) + '.')));
    if (!plan.quitar.length) return;
    const lista = h('div', { class: 'at-lista' });
    plan.quitar.forEach(x => {
      const [W, H] = slideDims(d);
      const tw = 132, k = tw / W;
      const clip = h('div', { class: 'at-clip', style: `width:${tw}px;height:${Math.round(H * k)}px` });
      const mini = renderSlide(d, x.i, 'thumb');
      mini.style.transform = `scale(${k})`; mini.style.transformOrigin = 'top left';
      clip.append(mini);
      lista.append(h('div', { class: 'at-fila' }, clip,
        h('div', { class: 'at-txt' },
          h('b', null, (x.i + 1) + ' · ' + ((x.sl.title || '').trim() || (LAY[x.sl.layout] || {}).name || 'Sin título')),
          h('em', null, mmss(x.min) + ' · ' + motivo(x))),
        h('button', { class: 'btn btn-sm', title: 'Marcarla como imprescindible para que no se toque',
          onclick: () => { x.sl.clave = true; commit({ skipInsp: true }); pinta(); } }, '★ No la quites')));
    });
    vista.append(lista);
    const conClave = d.slides.filter(sl => sl.clave).length;
    if (conClave) vista.append(h('p', { class: 'hint' },
      conClave + (conClave === 1 ? ' diapositiva marcada como imprescindible' : ' diapositivas marcadas como imprescindibles') +
      ' · se quedan pase lo que pase.'));
  };
  const motivo = x => {
    const t = new Set(zonas(x.sl).flat().map(b => b.type));
    if (!t.size) return 'está vacía';
    if ([...t].every(y => y === 'text' || y === 'bullets')) return 'solo texto';
    if ((x.sl.notes || '').trim().length < 20) return 'sin notas preparadas';
    return 'la de menor peso en su sección';
  };

  const rango = h('input', { type: 'range', min: 3, max: Math.max(10, Math.ceil(actual)), step: 1, value: objetivo,
    oninput: e => { objetivo = +e.target.value; etq.textContent = objetivo + ' min'; pinta(); } });
  const etq = h('b', { class: 'at-min' }, objetivo + ' min');
  const rapidos = h('div', { class: 'at-rapidos' });
  [5, 10, 12, 15, 20, 30, 45].filter(v => v <= Math.max(10, Math.ceil(actual))).forEach(v =>
    rapidos.append(h('button', { class: 'btn btn-sm', onclick: () => { objetivo = v; rango.value = v; etq.textContent = v + ' min'; pinta(); } }, v + ' min')));

  pinta();
  const cuerpo = h('div', null,
    h('p', { class: 'hint', style: 'margin-top:0' },
      'Los minutos salen de los que asignaste por diapositiva; a las que no tienen se les cuenta uno, que es lo que recomienda la regla del minuto por diapositiva. Nada se borra: lo que sobra pasa al respaldo y sigue ahí para las preguntas.'),
    h('div', { class: 'at-ctrl' }, h('span', { class: 'an-et' }, 'Tiempo que te dan'), etq, rango),
    rapidos, vista);
  openModal({
    title: 'Ajustar la charla a un tiempo', size: 'modal-lg', body: cuerpo,
    foot: [
      h('button', { class: 'btn', onclick: () => closeModal() }, 'Cancelar'),
      h('button', { class: 'btn btn-pri', onclick: () => {
        const plan = planTiempo(S.deck, objetivo);
        if (plan.actual <= plan.objetivo) { toast('Ya cabía en ese tiempo'); closeModal(); return; }
        if (!plan.quitar.length) { toast('No se puede reducir más sin quitar diapositivas imprescindibles o vaciar la charla.', 'warn'); return; }
        if (!aplicaPlanTiempo(plan)) return;
        closeModal();
        toast(plan.quitar.length + ' al respaldo · la charla queda en ' + mmss(plan.resultado) +
          (plan.imposible ? ' · no se alcanzó el objetivo' : ''), plan.imposible ? 'warn' : null, { t: 'Deshacer', fn: doUndo });
      } }, 'Ajustar')]
  });
}


