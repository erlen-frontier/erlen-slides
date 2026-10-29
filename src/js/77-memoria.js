/* ==== 77-memoria.js ==== */
'use strict';
/* ================= tu propia memoria de diapositivas =================
   «¿Dónde expliqué el método de Tauc?» Busca en todas tus charlas guardadas
   en este navegador —y en la abierta— por título, texto y notas, con la misma
   normalización del asistente (sin acentos, por raíces) y los sinónimos del
   glosario. Devuelve la diapositiva exacta y la trae con sus datos, sus
   referencias y sus glosas. Tu mejor explicación de algo no se pierde. */

const raizDe = w => w.slice(0, 5);
const palabrasClave = s => (String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-z0-9]{3,}/g) || []);
function textoDeDiapositiva(sl) {
  const t = [sl.title || '', sl.subtitle || '', sl.notes || ''];
  zonas(sl).flat().forEach(b => {
    if (typeof textosCitables === 'function') t.push(...textosCitables(b));
    if (b.type === 'chart') t.push(b.xlabel || '', b.ylabel || '', b.title || '', b.tecnica || '');
    if (b.type === 'math') t.push(b.tex || '');
  });
  return t.join(' ');
}
/* Todas las charlas: la abierta y las guardadas. */
function charlasIndexables() {
  const out = [{ nombre: S.deckName || (S.deck.meta.title || 'Esta charla'), deck: S.deck, actual: true }];
  const st = typeof decksStore === 'function' ? decksStore() : {};
  Object.keys(st).forEach(n => { if (st[n] && st[n].deck && st[n].deck !== S.deck && n !== S.deckName) out.push({ nombre: n, deck: st[n].deck, cuando: st[n].when }); });
  return out;
}
function buscaEnMemoria(q) {
  const raices = palabrasClave(q).map(raizDe);
  if (!raices.length) return [];
  /* sinónimos del glosario: si buscas el término, también vale su explicación */
  const extra = [];
  (typeof glosasDe === 'function' ? glosasDe(S.deck) : []).forEach(g => {
    const kg = palabrasClave(g.termino).map(raizDe);
    if (kg.some(k => raices.includes(k))) extra.push(...palabrasClave(g.breve).map(raizDe));
  });
  const out = [];
  charlasIndexables().forEach(ch => {
    (ch.deck.slides || []).forEach((sl, i) => {
      if (sl.layout === 'title' || sl.layout === 'toc' || sl.bibAuto) return;
      const txt = textoDeDiapositiva(sl);
      const rs = new Set(palabrasClave(txt).map(raizDe));
      const tit = new Set(palabrasClave(sl.title).map(raizDe));
      let s = 0;
      raices.forEach(r => { if (tit.has(r)) s += 3; else if (rs.has(r)) s += 1; });
      extra.forEach(r => { if (rs.has(r)) s += 0.4; });
      const cubre = raices.filter(r => rs.has(r) || tit.has(r)).length / raices.length;
      if (cubre >= 0.5 && s > 0) out.push({ ch, sl, i, s: s * (0.5 + cubre) });
    });
  });
  out.sort((a, b) => b.s - a.s);
  return out.slice(0, 24);
}
/* Trae una diapositiva de otra charla con lo que necesita para vivir aquí. */
function traeDeMemoria(r) {
  const d = r.ch.deck;
  const copia = copiaDiapositiva(r.sl);
  delete copia.bibAuto; delete copia.respaldo;
  /* referencias citadas en ella */
  const claves = new Set();
  (typeof textosCitables === 'function' ? zonas(copia).flat().flatMap(textosCitables).concat([copia.title || '', copia.notes || '']) : []).forEach(t => clavesEnTexto(t).forEach(c => claves.add(c)));
  const refsOrigen = Array.isArray(d.meta.refs) ? d.meta.refs : [];
  const traidas = refsOrigen.filter(x => claves.has(x.clave) || (copia.citas || []).includes(x.id) || zonas(copia).flat().some(b => b.cita === x.id));
  if (traidas.length) zotIngresa(traidas.map(x => Object.assign({}, x, { id: uid() })), false);
  /* si la referencia entró con otro id, las citas al pie se reasignan por clave */
  copia.citas = (copia.citas || []).map(id => { const o = refsOrigen.find(x => x.id === id); const n = o && refsDe(S.deck).find(x => x.clave === o.clave); return n ? n.id : null; }).filter(Boolean);
  zonas(copia).flat().forEach(b => { if (b.cita) { const o = refsOrigen.find(x => x.id === b.cita); const n = o && refsDe(S.deck).find(x => x.clave === o.clave); if (n) b.cita = n.id; else delete b.cita; } });
  /* glosas que usa */
  const gl = Array.isArray(d.meta.glosas) ? d.meta.glosas : [];
  const usadas = new Set();
  [copia.title || ''].concat(zonas(copia).flat().flatMap(b => typeof textosCitables === 'function' ? textosCitables(b) : [])).forEach(t => (typeof terminosEn === 'function' ? terminosEn(t) : []).forEach(x => usadas.add(x.toLowerCase())));
  gl.forEach(g => { if (usadas.has(String(g.termino).toLowerCase()) && !glosaDe(g.termino, S.deck)) glosasDe(S.deck).push(Object.assign({}, g)); });
  const at = Math.min(S.cur + 1, posBib(S.deck));
  S.deck.slides.splice(at, 0, copia);
  S.cur = at; S.selBlock = null;
  invalidaCitas(); commit();
  return copia;
}
function openMemoria(q0) {
  const q = h('input', { class: 'field', value: q0 || '', placeholder: '¿Dónde expliqué… el método de Tauc, la ley de Bragg, el sol-gel?' });
  const lista = h('div', { class: 'mem-lista' });
  const aviso = h('p', { class: 'hint', style: 'margin:6px 0 0' });
  const [W, H] = slideDims(S.deck);
  const anchoMini = 150, esc = anchoMini / W;
  const busca = () => {
    lista.innerHTML = '';
    const rs = buscaEnMemoria(q.value);
    const n = charlasIndexables().length;
    aviso.textContent = q.value.trim() ? rs.length + (rs.length === 1 ? ' diapositiva' : ' diapositivas') + ' en ' + n + (n === 1 ? ' charla' : ' charlas') : n + (n === 1 ? ' charla en este navegador' : ' charlas en este navegador') + '. Escribe qué buscas.';
    rs.forEach(r => {
      const mini = h('div', { class: 'mem-mini', style: `width:${anchoMini}px;height:${Math.round(H * esc)}px` },
        h('div', { style: `transform:scale(${esc});transform-origin:0 0;width:${W}px;height:${H}px;pointer-events:none` }, renderSlide(r.ch.deck, r.i, 'thumb', 99)));
      lista.append(h('div', { class: 'mem-fila' }, mini,
        h('div', { class: 'mem-txt' }, h('b', null, r.sl.title || '(sin título)'),
          h('span', null, (r.ch.actual ? 'Esta charla' : r.ch.nombre) + ' · diapositiva ' + (r.i + 1)),
          h('em', null, String(r.sl.notes || textoDeDiapositiva(r.sl)).slice(0, 140))),
        r.ch.actual
          ? h('button', { class: 'btn btn-sm', onclick: () => { closeModal(); S.cur = r.i; S.selBlock = null; renderAll(); } }, '→ Ir')
          : h('button', { class: 'btn btn-sm btn-pri', onclick: () => { traeDeMemoria(r); closeModal(); toast('Traída con sus referencias y glosas'); } }, '⇩ Traer a esta charla')));
    });
  };
  q.addEventListener('input', deb(busca, 250));
  busca();
  openModal({ title: 'Tu memoria de diapositivas', size: 'modal-lg',
    body: h('div', null, q, aviso, lista,
      h('p', { class: 'hint', style: 'margin-top:8px' }, 'Busca en la charla abierta y en las guardadas en Archivo → Mis presentaciones. Al traer una, vienen sus datos, sus referencias y sus glosas.')),
    foot: [h('button', { class: 'btn btn-pri', onclick: () => closeModal() }, 'Listo')] });
}

