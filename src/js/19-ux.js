/* ==== 19-ux.js ==== */
'use strict';
/* ================= plantillas, estilos, búsqueda y paleta ================= */

/* ---------- plantillas de arranque ---------- */
function slidePlantilla(layout, titulo, bloques, extra) {
  const sl = Object.assign({ id: uid(), layout, title: titulo || '', blocks: [] }, extra || {});
  prepararZonas(sl, layout);
  (bloques || []).forEach((zona_, z) => { if (zona_ && zona_.length) zona(sl, z).push(...zona_); });
  return sl;
}
const _T = (t, o) => Object.assign(newBlock('text'), { text: t }, o || {});
const _V = its => Object.assign(newBlock('bullets'), { items: its.map(t => ({ t, lvl: 0 })) });
const _C = (tit, cuerpo, kind) => Object.assign(newBlock('bblock'), { btitle: tit, body: cuerpo, kind: kind || 'block' });

function deckDe(meta, slides) {
  return { v: 1, meta: Object.assign({ title: '', short: '', subtitle: '', authors: '', institute: '', date: '', theme: 'metropolis', aspect: '169', numbers: true, footline: true }, meta), slides };
}

const PLANTILLAS = [{id:'blanco',n:'En blanco',ic:'▢',d:'Una portada vacía. Tú decides qué contar.',build:blankDeck}];

function openPlantillas() {
  const rej = h('div', { class: 'pl-grid' });
  PLANTILLAS.forEach(p => {
    const n = p.build ? (() => { try { return p.build().slides.length; } catch (e) { return 0; } })() : 0;
    rej.append(h('button', { class: 'pl-card', onclick: () => {
      closeModal();
      if (S.deckName) { const st = decksStore(); st[S.deckName] = { deck: S.deck, when: Date.now() }; lsSet(LS_DECKS, st); }
      const d = p.build();
      const est = estiloPorOmision();
      if (est) Object.assign(d.meta, est);
      if (!loadDeck(d, null)) return;
      if (p.id === 'blanco' && typeof marcaArchivoNuevo === 'function') marcaArchivoNuevo();
      toast('Presentación nueva: ' + p.n);
    } },
      h('span', { class: 'pl-ic' }, p.ic),
      h('span', { class: 'pl-n' }, p.n),
      h('span', { class: 'pl-d' }, p.d),
      h('span', { class: 'pl-c' }, n + (n === 1 ? ' diapositiva' : ' diapositivas'))));
  });
  rej.append(h('button', { class: 'pl-card pl-esquema', onclick: () => { closeModal(); openEsquema(); } },
    h('span', { class: 'pl-ic' }, '☰'),
    h('span', { class: 'pl-n' }, 'Desde un esquema'),
    h('span', { class: 'pl-d' }, 'Pega tu índice o tu guion en texto y se arma la estructura: secciones, títulos y viñetas.'),
    h('span', { class: 'pl-c' }, 'las que salgan')));
  const est = estiloPorOmision();
  openModal({
    title: 'Nueva presentación', size: 'modal-lg',
    body: h('div', null, rej,
      h('p', { class: 'hint', style: 'margin-top:12px' },
        est ? 'La presentación nueva tomará tu estilo guardado: tema, tipografía, color, pie y escudo.'
            : 'La presentación actual queda guardada en el autoguardado. Si guardas un estilo propio en la pestaña Diseño, las presentaciones nuevas arrancarán con él.')),
    foot: [h('button', { class: 'btn', onclick: closeModal }, 'Cancelar')]
  });
}

/* ---------- estilo propio ---------- */
const CAMPOS_ESTILO = ['theme', 'acento', 'fuente', 'fuenteMat', 'aspect', 'numbers', 'footline',
  'pie', 'pieTexto', 'logo', 'logoPos', 'logoW', 'logoPie', 'logoAlt', 'institute', 'authors', 'short', 'notas'];
const estilosStore = () => lsGet(LS_ESTILOS, {}) || {};
function estiloActual() {
  const m = S.deck.meta, e = {};
  CAMPOS_ESTILO.forEach(k => { if (m[k] != null) e[k] = deepCopy(m[k]); });
  return e;
}
function aplicaEstilo(e) {
  CAMPOS_ESTILO.forEach(k => { if (e[k] != null) S.deck.meta[k] = deepCopy(e[k]); });
  commit();
}
function estiloPorOmision() {
  const n = (S.prefs || {}).estiloPorOmision;
  const st = estilosStore();
  return n && st[n] ? deepCopy(st[n].estilo) : null;
}
function guardaEstilo(nombre) {
  const st = estilosStore();
  st[nombre] = { estilo: estiloActual(), when: Date.now() };
  if (!lsSet(LS_ESTILOS, st)) { toast('No se pudo guardar el estilo (¿el escudo es muy pesado?)', 'warn'); return false; }
  return true;
}
function openEstilos() {
  const cuerpo = h('div');
  const pinta = () => {
    cuerpo.innerHTML = '';
    const st = estilosStore();
    const nombres = Object.keys(st).sort();
    const nom = h('input', { class: 'field', placeholder: 'Nombre del estilo, p. ej. «CUCEI azul»', value: '' });
    cuerpo.append(h('p', { class: 'hint', style: 'margin:0 0 10px' },
      'Un estilo guarda el tema, el color de acento, la tipografía, el formato, el pie, el escudo y los datos de portada que se repiten. No guarda el contenido.'));
    cuerpo.append(h('div', { class: 'irow' }, h('label', null, 'Guardar el actual como'), h('div', { style: 'flex:1.6' }, nom)));
    cuerpo.append(h('button', { class: 'btn btn-pri btn-sm', style: 'margin:2px 0 14px', onclick: () => {
      const v = nom.value.trim();
      if (!v) { toast('Ponle un nombre al estilo'); return; }
      if (guardaEstilo(v)) { toast('Estilo «' + v + '» guardado'); pinta(); }
    } }, 'Guardar estilo'));
    if (!nombres.length) { cuerpo.append(h('p', { class: 'hint' }, 'Todavía no tienes estilos guardados.')); return; }
    cuerpo.append(h('span', { class: 'sublabel' }, 'Tus estilos'));
    nombres.forEach(n => {
      const e = st[n].estilo || {};
      const t = THEMES[e.theme] || THEMES.metropolis;
      const col = e.acento || t.acc;
      const esOmision = (S.prefs || {}).estiloPorOmision === n;
      cuerpo.append(h('div', { class: 'est-fila' },
        h('i', { class: 'est-col', style: `background:${col}` }),
        h('div', { class: 'est-txt' }, h('b', null, n),
          h('span', null, [t.name, (FU[e.fuente] || {}).n, e.logo ? 'con escudo' : null].filter(Boolean).join(' · '))),
        h('button', { class: 'btn btn-sm', title: 'Aplicar a esta presentación', onclick: () => { aplicaEstilo(e); toast('Estilo aplicado'); closeModal(); } }, 'Aplicar'),
        h('button', { class: 'btn btn-sm' + (esOmision ? ' btn-pri' : ''), title: 'Usar en las presentaciones nuevas',
          onclick: () => { S.prefs.estiloPorOmision = esOmision ? null : n; guardaPrefs(); pinta(); } }, esOmision ? 'Por omisión ✓' : 'Por omisión'),
        h('button', { class: 'icon-btn', title: 'Eliminar', onclick: () => { const s2 = estilosStore(); delete s2[n]; lsSet(LS_ESTILOS, s2); if ((S.prefs || {}).estiloPorOmision === n) { S.prefs.estiloPorOmision = null; guardaPrefs(); } pinta(); } }, '✕')));
    });
  };
  pinta();
  openModal({ title: 'Estilos', size: 'modal-sm', body: cuerpo, foot: [h('button', { class: 'btn btn-pri', onclick: closeModal }, 'Listo')] });
}


