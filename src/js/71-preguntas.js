/* ==== 71-preguntas.js ==== */
'use strict';
/* ================= las preguntas que te van a hacer =================
   A partir de lo que hay en cada diapositiva —qué técnica, qué ajuste, qué
   afirmación— se proponen las preguntas que un sinodal haría. Tú las
   contestas o las descartas; cada respuesta se vuelve una diapositiva de
   respaldo enlazada, que luego sale en el índice de preguntas (tecla Q). Las
   que no puedes contestar quedan en rojo: el ensayo se vuelve apéndice, y el
   nervio de la defensa, trabajo hecho. Sin modelo: son plantillas por lo que
   ve en tus diapositivas, y por eso se dicen como sugerencias. */

const PREG_TECNICA = {
  xrd: ['¿Con qué patrón se calibró el difractómetro y cuál es la incertidumbre en 2θ?', '¿Cómo descartó orientación preferencial o textura en la muestra?', '¿Refinó por Rietveld? ¿Qué valores de χ² y R_wp obtuvo?'],
  ftir: ['¿Se midió en ATR o en pastilla de KBr, y cómo afecta eso a las bandas?', '¿Cómo asignó cada banda: por literatura o por cálculo?'],
  uvvis: ['¿Cómo determinó la banda prohibida: por Tauc directo o indirecto, y por qué?', '¿Corrigió la dispersión (Kubelka-Munk) si midió reflectancia?'],
  'uvvis-dr': ['¿Cómo pasó la reflectancia a absorción para la banda prohibida: con Kubelka–Munk? ¿Qué tramo ajustó?'],
  tga: ['¿En qué atmósfera y con qué rampa de calentamiento midió?', '¿La pérdida de masa corresponde a qué especie, y cómo lo confirmó?'],
  raman: ['¿Qué láser y qué potencia usó, y descartó calentamiento local?', '¿Cómo distingue los modos de la muestra de los del sustrato?'],
  cv: ['¿Qué electrodo de referencia y qué velocidad de barrido usó?', '¿El proceso es reversible? ¿Qué separación de picos obtuvo?']
};
const PREG_PALABRA = [
  [/sol[- ]?gel/i, '¿Qué precursor, disolvente y pH usó en el sol-gel, y cómo los eligió?'],
  [/recoc|calcin|tratamiento t[eé]rmico/i, '¿Cómo eligió la temperatura y el tiempo de recocido? ¿Probó otros?'],
  [/perovskit/i, '¿Cuál es la estabilidad frente a humedad y luz, y cómo la midió?'],
  [/nanopart|nanocrist|cristalita/i, '¿Cuál es la distribución de tamaños, no solo el promedio?'],
  [/dopa|sustitu|impurif/i, '¿Cómo confirmó que el dopante entró a la red y no quedó segregado?'],
  [/rendimiento|pureza|purific/i, '¿Cuál fue el rendimiento y cómo verificó la pureza?'],
  [/reproducib|lote/i, '¿Cuántas réplicas hizo y qué dispersión obtuvo entre lotes?'],
  [/microscop|micrograf|\b(SEM|TEM|AFM)\b/, '¿Es representativa la micrografía? ¿Cuántas zonas observó?'],
  [/eficien|conversi[oó]n/i, '¿Bajo qué condiciones de iluminación midió la eficiencia y con qué área de dispositivo?'],
  [/simulaci|DFT|c[aá]lculo|modelo/i, '¿Qué aproximaciones usa el modelo y cómo validó sus resultados contra experimento?'],
  [/mejora|aumenta|baja|disminuye|crece|mayor|menor/i, '¿La diferencia es estadísticamente significativa? ¿Con qué n y qué prueba?']
];
const PREG_BLOQUE = {
  chart: ['¿Qué representan las barras de error, si las hay: desviación estándar o error estándar?'],
  table: ['¿Cuántas mediciones hay detrás de cada valor de la tabla?'],
  math: ['¿Qué suposiciones hay detrás de esta ecuación y cuándo dejan de valer?'],
  estruct: ['¿Cómo confirmó la estructura: RMN, masas, difracción?'],
  montaje: ['¿Qué variable del montaje es la más sensible y cómo la controló?']
};
const PREG_GENERAL = [
  '¿Cuál es la novedad frente a lo ya publicado?',
  '¿Cuál es la limitación principal del método y cómo la acota?',
  '¿Qué harías distinto si empezaras de nuevo?',
  '¿Cuál es el siguiente paso y qué necesita para darlo?'
];

const preguntasDe = deck => { const d = deck || S.deck; if (!Array.isArray(d.meta.preguntas)) d.meta.preguntas = []; return d.meta.preguntas; };
function textoDiapositiva(sl) {
  return [sl.title, sl.subtitle].concat(zonas(sl).flat().map(b => (typeof textosCitables === 'function' ? textosCitables(b) : []).join(' '))).join(' ');
}
/* Propone; no repite las que ya están (mismo texto). */
function proponePreguntas(deck) {
  const d = deck || S.deck;
  const ya = new Set(preguntasDe(d).map(q => q.texto));
  const nuevas = [];
  const mete = (texto, i) => { if (!ya.has(texto)) { ya.add(texto); nuevas.push({ id: uid(), texto, sl: i, estado: 'abierta', respaldo: null }); } };
  d.slides.forEach((sl, i) => {
    if (sl.layout === 'title' || sl.layout === 'toc' || sl.layout === 'section' || sl.bibAuto || esRespaldo(sl)) return;
    const txt = textoDiapositiva(sl);
    zonas(sl).flat().forEach(b => {
      if (b.type === 'chart' && b.tecnica && PREG_TECNICA[b.tecnica]) PREG_TECNICA[b.tecnica].forEach(q => mete(q, i));
      if (b.type === 'chart' && (b.kind === 'ajuste')) mete('¿Cuál es la incertidumbre de la pendiente y por qué un ajuste lineal?', i);
      if (PREG_BLOQUE[b.type]) PREG_BLOQUE[b.type].forEach(q => mete(q, i));
      if (b.type === 'image' && b.escala) mete('¿Es representativa la micrografía? ¿Cuántas zonas observó?', i);
    });
    PREG_PALABRA.forEach(([re, q]) => { if (re.test(txt)) mete(q, i); });
  });
  const ult = Math.max(0, finCharla(d));
  PREG_GENERAL.forEach(q => mete(q, ult));
  if (refsDe(d).length) mete('¿En qué se diferencia su método del de ' + quienCita(refsDe(d)[0]) + '?', ult);
  preguntasDe(d).push(...nuevas);
  return nuevas.length;
}
/* Cada respuesta es una diapositiva de respaldo con la pregunta de título. */
function respondePregunta(q) {
  const d = S.deck;
  if (q.respaldo && d.slides.some(s => s.id === q.respaldo)) { q.estado = 'respondida'; return d.slides.findIndex(s => s.id === q.respaldo); }
  const sl = { id: uid(), layout: 'content', title: q.texto.replace(/^¿|\?$/g, ''), blocks: [], respaldo: true, notes: 'Respuesta preparada para: ' + q.texto };
  prepararZonas(sl, 'content');
  zona(sl, 0).push(Object.assign(newBlock('bullets'), { items: [{ t: 'Respuesta corta: ', lvl: 0 }, { t: 'Evidencia que la sostiene: ', lvl: 0 }] }));
  d.slides.push(sl);
  q.respaldo = sl.id; q.estado = 'respondida';
  commit();
  return d.slides.length - 1;
}
function resumenPreguntas(deck) {
  const ps = preguntasDe(deck);
  const vivas = ps.filter(q => q.estado !== 'descartada');
  return { total: vivas.length, respondidas: vivas.filter(q => q.estado === 'respondida').length, abiertas: vivas.filter(q => q.estado === 'abierta').length };
}

function openPreguntas() {
  if (!preguntasDe(S.deck).length) proponePreguntas(S.deck);
  const cuerpo = h('div');
  const pinta = () => {
    cuerpo.innerHTML = '';
    const r = resumenPreguntas(S.deck);
    cuerpo.append(h('div', { class: 'pq-res' },
      h('b', null, r.respondidas + ' de ' + r.total), ' con respuesta preparada',
      r.abiertas ? h('span', { class: 'pq-abiertas' }, ' · ' + r.abiertas + ' sin responder') : h('span', { class: 'pq-ok' }, ' · todas cubiertas'),
      h('span', { style: 'flex:1' }),
      h('button', { class: 'btn btn-sm', onclick: () => { const n = proponePreguntas(S.deck); commit(); toast(n ? n + ' preguntas nuevas' : 'No hay preguntas nuevas que proponer'); pinta(); } }, '↻ Proponer más'),
      h('button', { class: 'btn btn-sm', onclick: () => { preguntasDe(S.deck).push({ id: uid(), texto: '¿…?', sl: S.cur, estado: 'abierta', respaldo: null, propia: true }); commit(); pinta(); } }, '+ La mía')));
    cuerpo.append(h('p', { class: 'hint', style: 'margin:0 0 10px' }, 'Son plantillas a partir de lo que hay en tus diapositivas, no adivinación: sirven para que ensayes la respuesta. Cada «Preparar respuesta» crea una diapositiva de respaldo que luego encuentras con la tecla Q al presentar.'));
    const porSl = {};
    preguntasDe(S.deck).forEach(q => { (porSl[q.sl] = porSl[q.sl] || []).push(q); });
    Object.keys(porSl).map(Number).sort((a, b) => a - b).forEach(i => {
      const sl = S.deck.slides[i];
      cuerpo.append(h('div', { class: 'pq-sl' }, (i + 1) + ' · ' + (sl ? (sl.title || '(sin título)') : '')));
      porSl[i].forEach(q => {
        const fila = h('div', { class: 'pq-fila e-' + q.estado });
        const txt = h('div', { class: 'pq-txt', contenteditable: q.propia ? 'plaintext-only' : 'false' }, q.texto);
        if (q.propia) txt.addEventListener('blur', () => { q.texto = txt.innerText.trim(); commit(); });
        fila.append(h('span', { class: 'pq-dot' }, q.estado === 'respondida' ? '●' : q.estado === 'descartada' ? '–' : '○'), txt);
        const acc = h('div', { class: 'ar-acc' });
        if (q.estado === 'respondida') acc.append(h('button', { class: 'btn btn-sm', onclick: () => { const j = respondePregunta(q); closeModal(); S.cur = j; S.selBlock = null; renderAll(); } }, '→ Ver el respaldo'));
        else if (q.estado === 'abierta') acc.append(
          h('button', { class: 'btn btn-sm btn-pri', onclick: () => { const j = respondePregunta(q); closeModal(); S.cur = j; S.selBlock = null; renderAll(); toast('Escribe la respuesta corta y la evidencia; es una diapositiva de respaldo'); } }, 'Preparar respuesta'),
          h('button', { class: 'btn btn-sm', title: 'Ya está contestada en la charla', onclick: () => { q.estado = 'respondida'; commit(); pinta(); } }, 'Ya está en la charla'),
          h('button', { class: 'icon-btn', title: 'Descartar', onclick: () => { q.estado = 'descartada'; commit(); pinta(); } }, '✕'));
        else acc.append(h('button', { class: 'btn btn-sm', onclick: () => { q.estado = 'abierta'; commit(); pinta(); } }, 'Recuperar'));
        fila.append(acc);
        cuerpo.append(fila);
      });
    });
  };
  pinta();
  openModal({ title: 'Las preguntas que te van a hacer', size: 'modal-lg', body: cuerpo,
    foot: [h('button', { class: 'btn btn-pri', onclick: () => closeModal() }, 'Listo')] });
}


