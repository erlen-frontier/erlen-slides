/* ==== 30-esquema.js ==== */
'use strict';
/* ================= diapositivas desde un esquema ================= */

/* Reglas: «# » abre una sección, «## » o una línea suelta abre diapositiva,
   «- » añade viñeta (la sangría la anida) y el resto es texto. */
function leeEsquema(txt) {
  const slides = [];
  let actual = null;
  const nueva = (layout, titulo) => {
    const sl = { id: uid(), layout, title: titulo || '', blocks: [] };
    prepararZonas(sl, layout);
    slides.push(sl);
    return sl;
  };
  String(txt || '').split(/\r?\n/).forEach(cruda => {
    const linea = cruda.replace(/\t/g, '    ');
    const t = linea.trim();
    if (!t) return;
    let m = /^(#{1,3})\s+(.*)$/.exec(t);
    if (m) {
      if (m[1].length === 1) { actual = null; nueva('section', m[2]); }
      else actual = nueva('content', m[2]);
      return;
    }
    m = /^([-*•·]|\d+[.)])\s+(.*)$/.exec(t);
    if (m) {
      if (!actual) actual = nueva('content', '');
      const sangria = linea.length - linea.replace(/^\s+/, '').length;
      const lvl = clamp(Math.floor(sangria / 2), 0, 2);
      const arr = zona(actual, 0);
      let ult = arr[arr.length - 1];
      if (!ult || ult.type !== 'bullets') { ult = Object.assign(newBlock('bullets'), { items: [] }); arr.push(ult); }
      ult.items.push({ t: m[2], lvl });
      return;
    }
    const sangrada = /^\s{2,}/.test(linea);
    if (!actual || (!sangrada && !zona(actual, 0).length && !actual.title)) {
      if (!actual) actual = nueva('content', t); else actual.title = t;
      return;
    }
    if (!sangrada && zona(actual, 0).length) { actual = nueva('content', t); return; }
    zona(actual, 0).push(Object.assign(newBlock('text'), { text: t }));
  });
  return slides;
}

const EJEMPLO_ESQUEMA = [
  '# Introducción',
  '## El problema',
  '- Qué se sabe hoy',
  '- Qué falta por resolver',
  '## Hipótesis',
  'La síntesis asistida por microondas reduce el tamaño de cristalita.',
  '',
  '# Metodología',
  '## Ruta de síntesis',
  '- Precursores y proporciones',
  '- Condiciones de reacción',
  '  - Temperatura',
  '  - Tiempo',
  '## Caracterización',
  '- DRX',
  '- FTIR'
].join('\n');

function openEsquema() {
  const ta = h('textarea', { class: 'field es-area', rows: 14, placeholder: EJEMPLO_ESQUEMA, spellcheck: 'true', lang: 'es' });
  const prev = h('div', { class: 'es-prev' });
  const resumen = h('span', { class: 'foot-note' });
  let hechas = [];
  const pinta = () => {
    hechas = leeEsquema(ta.value);
    prev.innerHTML = '';
    if (!hechas.length) { prev.append(h('p', { class: 'hint', style: 'margin:0' }, 'Escribe o pega tu índice y aquí verás la estructura que va a salir.')); resumen.textContent = ''; return; }
    hechas.forEach((sl, i) => {
      const bl = zonas(sl).flat();
      const n = bl.reduce((a, b) => a + (b.type === 'bullets' ? (b.items || []).length : 1), 0);
      prev.append(h('div', { class: 'es-fila' + (sl.layout === 'section' ? ' es-sec' : '') },
        h('span', { class: 'es-n' }, sl.layout === 'section' ? '§' : String(i + 1)),
        h('span', { class: 'es-t' }, sl.title || '(sin título)'),
        n ? h('span', { class: 'es-c' }, n + (n === 1 ? ' elemento' : ' elementos')) : null));
    });
    const secs = hechas.filter(x => x.layout === 'section').length;
    resumen.textContent = hechas.length + ' diapositivas' + (secs ? ' · ' + secs + (secs === 1 ? ' sección' : ' secciones') : '');
  };
  ta.addEventListener('input', deb(pinta, 200));
  const cuerpo = h('div', { class: 'es-grid' },
    h('div', null, h('span', { class: 'sublabel', style: 'margin:0 0 5px' }, 'Tu esquema'), ta,
      h('p', { class: 'hint' }, '«# » abre una sección · «## » abre una diapositiva · «- » añade una viñeta, y con dos espacios delante la anida · lo demás se escribe como texto.'),
      h('button', { class: 'btn btn-sm', onclick: () => { ta.value = EJEMPLO_ESQUEMA; pinta(); } }, 'Poner un ejemplo')),
    h('div', null, h('span', { class: 'sublabel', style: 'margin:0 0 5px' }, 'Lo que se va a crear'), prev));
  openModal({
    title: 'Diapositivas desde un esquema', size: 'modal-lg', body: cuerpo,
    foot: [resumen,
      h('button', { class: 'btn', onclick: () => {
        hechas = leeEsquema(ta.value);
        if (!hechas.length) { toast('Escribe primero el esquema'); return; }
        S.deck.slides.splice(S.cur + 1, 0, ...hechas);
        S.cur = S.cur + 1; S.selBlock = null;
        closeModal(); commit();
        toast(hechas.length + ' diapositivas añadidas', null, { t: 'Deshacer', fn: doUndo });
      } }, 'Añadir tras la actual'),
      h('button', { class: 'btn btn-pri', onclick: () => {
        hechas = leeEsquema(ta.value);
        if (!hechas.length) { toast('Escribe primero el esquema'); return; }
        const d = deckDe({ title: S.deck.meta.title || '', theme: S.deck.meta.theme }, [slidePlantilla('title', '')].concat(hechas));
        const est = estiloPorOmision(); if (est) Object.assign(d.meta, est);
        closeModal();
        cargaSegura(d, null);
      } }, 'Crear una presentación')]
  });
  pinta();
  setTimeout(() => ta.focus(), 40);
}


