/* ==== 64-argumento.js ==== */
'use strict';
/* ================= la vista de argumento =================
   La charla como cadena de afirmaciones, no como pila de diapositivas. Cada
   renglón es una afirmación de una línea (el título de su diapositiva) y su
   evidencia: la gráfica, figura, tabla o ecuación que la sostiene. Es la
   estructura «aserción-evidencia» de Alley, que en los estudios con
   estudiantes de ingeniería subió lo que el público recordaba; aquí es el modo
   de trabajo, no un consejo. Si a una afirmación le falta evidencia se ve como
   un hueco, no como una diapositiva vacía. */

const AR = { on: false, keyh: null };
const argRoot = () => $('#argRoot');

/* Evidencia: lo que enseña algo. Un párrafo no es evidencia; una gráfica sí. */
const ES_EVIDENCIA = new Set(['chart', 'func', 'image', 'galeria', 'table', 'math', 'montaje', 'smart', 'estruct', 'geo', 'video', 'chem', 'teorema']);
const ETIQ_EVID = { chart: 'gráfica', func: 'gráfica dinámica', image: 'figura', galeria: 'galería', table: 'tabla',
  math: 'ecuación', montaje: 'montaje', smart: 'diagrama', estruct: 'estructura', geo: 'figura', video: 'video', chem: 'reacción', teorema: 'teorema' };
const cuentaPalabras = s => (String(s || '').trim().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;

/* Una afirmación de verdad tiene verbo y dice algo: no es «Resultados» ni
   «DRX de la muestra». Sin analizador sintáctico, se busca un verbo de los que
   llevan las conclusiones científicas, o terminaciones verbales claras; una
   frase larga también pasa, porque rara vez es una etiqueta. */
const VERBOS_AFIRMAN = new Set(('es son esta estan hay tiene tienen baja bajan sube suben aumenta aumentan disminuye disminuyen ' +
  'mejora mejoran crece crecen cae caen cambia cambian depende dependen indica indican confirma confirman produce producen ' +
  'reduce reducen permite permiten favorece favorecen explica explican sugiere sugieren coincide coinciden concuerda concuerdan ' +
  'cristaliza cristalizan mantiene mantienen alcanza alcanzan supera superan logra logran forma forman aparece aparecen ' +
  'desaparece desaparecen domina dominan controla controlan limita limitan requiere requieren funciona funcionan sirve sirven ' +
  'puede pueden debe deben hace hacen da dan va van resulta resultan queda quedan sigue siguen ocurre ocurren existe existen ' +
  'implica implican genera generan provoca provocan rompe rompen oxida oxidan reacciona reaccionan absorbe absorben emite emiten ' +
  'conduce conducen difunde difunden gana ganan pierde pierden vale valen basta bastan importa importan mide miden ' +
  'no nunca siempre porque cuando mientras aunque si').split(' '));
function tieneVerbo(s) {
  const w = String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-z0-9]+/g) || [];
  if (w.some(x => VERBOS_AFIRMAN.has(x))) return true;
  if (/(^|[^a-záéíóúñ])[a-záéíóúñ]{2,}(ó|ió)(?![a-záéíóúñ])/i.test(s)) return true;      /* pretérito: bajó, subió… (\b no entiende acentos) */
  if (/\b(obtuvo|obtuvimos|hicimos|hizo|vimos|vio|fue|fueron|tuvo|tuvimos|pudo|pudimos|dio|dimos|puso|pusimos|dijo|supo)\b/i.test(s)) return true;
  if (/\b(muestra|muestran|demuestra|demuestran|revela|revelan|predice|predicen)\s+(que|como|un|una|el|la|los|las)\b/i.test(s)) return true;
  if (/\bse\s+[a-záéíóú]+(a|e|an|en|o|io|aron|ieron)\b/i.test(s)) return true;              /* «se forma», «se observó» */
  if (w.some(x => /(amos|emos|imos|aron|ieron|ara|era|ira|aran|eran|iran|aba|aban|ia|ian)$/.test(x) && x.length > 5)) return true;
  return false;
}
function esAfirmacion(t) {
  const s = String(t || '').trim();
  if (!s || tituloGenerico(s)) return false;
  const n = cuentaPalabras(s);
  if (n < 3) return false;
  return tieneVerbo(s) || n >= 9;
}
/* Los cierres y aperturas de rigor no son afirmaciones y no hay que exigirles verbo. */
const CIERRES = ['conclusiones', 'conclusion', 'agradecimientos', 'gracias', 'preguntas', 'referencias', 'bibliografia',
  'perspectivas', 'trabajo futuro', 'resumen', 'contenido', 'indice', 'objetivos', 'hipotesis', 'objetivo general'];
const esCierre = t => CIERRES.includes(String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.:;·!¡]+$/, '').trim());
function evidenciasDe(sl) {
  return zonas(sl).flat().filter(b => ES_EVIDENCIA.has(b.type)).map(b => ETIQ_EVID[b.type] || b.type);
}
/* El diagnóstico de cada renglón. */
function estadoAfirmacion(sl) {
  const t = String(sl.title || '').trim();
  const ev = evidenciasDe(sl);
  if (!t && /gracias|preguntas|comentarios/i.test(zonas(sl).flat().map(b => b.text || '').join(' '))) return { k: 'cierre', txt: 'Diapositiva de cierre', ev };
  if (!t) return { k: 'sin-titulo', txt: 'Sin afirmación', ev };
  if (esCierre(t)) return { k: 'cierre', txt: ev.length ? ev.join(' + ') : 'Diapositiva de cierre o apertura', ev };
  if (!esAfirmacion(t)) {
    const txt = tituloGenerico(t) ? 'Nombra la sección, no dice qué pasa'
      : cuentaPalabras(t) < 3 ? 'Muy corto para ser una afirmación'
      : 'No dice qué pasa: le falta el verbo («…baja», «…confirma», «…es»)';
    return { k: 'generico', txt, ev };
  }
  if (!ev.length) return { k: 'sin-evidencia', txt: 'Sin evidencia que la sostenga', ev };
  return { k: 'bien', txt: ev.join(' + '), ev };
}
/* Resumen para el esqueleto y la barra. */
function resumenArgumento(deck) {
  const d = deck || S.deck;
  const filas = [];
  d.slides.forEach((sl, i) => {
    if (sl.layout === 'title' || sl.layout === 'toc' || sl.bibAuto) return;
    if (sl.layout === 'section') { filas.push({ i, sl, seccion: true }); return; }
    filas.push({ i, sl, est: estadoAfirmacion(sl) });
  });
  const af = filas.filter(f => !f.seccion);
  return {
    filas, total: af.length,
    listas: af.filter(f => f.est.k === 'bien' || f.est.k === 'cierre').length,
    sinEvidencia: af.filter(f => f.est.k === 'sin-evidencia').length,
    genericas: af.filter(f => f.est.k === 'generico' || f.est.k === 'sin-titulo').length,
    vacias: af.filter(f => f.est.k === 'sin-titulo').length
  };
}
/* El argumento leído de corrido: las afirmaciones una tras otra. Si se lee
   mal como párrafo, la charla tampoco se sigue. */
function hiloArgumento(deck) {
  return resumenArgumento(deck).filas.filter(f => !f.seccion && f.est.k !== 'cierre' && (f.sl.title || '').trim())
    .map(f => f.sl.title.trim().replace(/[.。]$/, '')).join('. ') + '.';
}

function abreArgumento() {
  if (AR.on) return;
  if (typeof CL !== 'undefined' && CL.on) cierraClasificador();
  AR.on = true;
  const raiz = argRoot();
  raiz.innerHTML = '';
  const lista = h('div', { class: 'ar-lista', id: 'arLista' });
  const cuenta = h('span', { class: 'cl-cuenta' });
  const hilo = h('div', { class: 'ar-hilo' });
  const wrap = h('div', { class: 'cl-root ar-root', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Vista de argumento' },
    h('div', { class: 'cl-barra' },
      h('span', { class: 'cl-tit' }, 'El argumento'),
      cuenta,
      h('div', { class: 'cl-acc' },
        h('button', { class: 'btn btn-sm', title: 'Leer las afirmaciones de corrido', onclick: () => { hilo.hidden = !hilo.hidden; if (!hilo.hidden) pintaHilo(); } }, '¶ Leerlo de corrido'),
        h('button', { class: 'btn btn-sm', onclick: () => nuevaAfirmacion(null) }, '+ Afirmación')),
      h('button', { class: 'btn', onclick: cierraArgumento }, 'Cerrar')),
    h('div', { class: 'ar-cuerpo' },
      h('p', { class: 'ar-intro' },
        'Cada renglón es una afirmación de una línea —lo que quieres que el público se lleve— y la evidencia que la sostiene. ',
        'Escríbela como frase con verbo: «La banda prohibida baja con el yodo», no «Resultados».'),
      hilo, lista));
  hilo.hidden = true;
  raiz.append(wrap);
  pintaArgumento();
  AR.keyh = e => {
    if (e.key === 'Escape') { e.preventDefault(); cierraArgumento(); }
  };
  window.addEventListener('keydown', AR.keyh, true);
  document.body.classList.add('con-clasificador');

  function pintaHilo() {
    hilo.innerHTML = '';
    hilo.append(h('div', { class: 'panel-label' }, 'Leído de corrido'), h('p', null, hiloArgumento(S.deck)),
      h('p', { class: 'hint' }, 'Si este párrafo no se sigue, la charla tampoco. Cambia el orden arrastrando o reescribe la afirmación que rompe el hilo.'));
  }

  function pintaArgumento() {
    lista.innerHTML = '';
    const r = resumenArgumento(S.deck);
    cuenta.textContent = r.total + (r.total === 1 ? ' afirmación' : ' afirmaciones') +
      (r.sinEvidencia ? ' · ' + r.sinEvidencia + ' sin evidencia' : '') +
      (r.genericas ? ' · ' + r.genericas + (r.genericas === 1 ? ' que no afirma nada' : ' que no afirman nada') : '') +
      (!r.sinEvidencia && !r.genericas && r.total ? ' · el argumento se sostiene' : '');
    let n = 0;
    r.filas.forEach(f => {
      if (f.seccion) {
        lista.append(h('div', { class: 'ar-sec' }, h('span', null, f.sl.title || 'Sección'),
          h('button', { class: 'icon-btn', title: 'Ir a la diapositiva', onclick: () => irA(f.i) }, '→')));
        return;
      }
      n++;
      const est = f.est;
      const campo = h('div', { class: 'ar-af' + (est.k === 'sin-titulo' ? ' is-empty' : ''), contenteditable: 'plaintext-only',
        'data-ph': 'Escribe la afirmación de esta diapositiva…', spellcheck: 'true', lang: 'es' }, f.sl.title || '');
      campo.addEventListener('blur', () => {
        const v = campo.innerText.replace(/\n/g, ' ').trim();
        if (v !== (f.sl.title || '')) { f.sl.title = v; commit({ skipInsp: true }); pintaArgumento(); }
      });
      campo.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); campo.blur(); nuevaAfirmacion(f.i); }
        if (e.key === 'ArrowDown' && e.altKey) { e.preventDefault(); mueve(f.i, 1); }
        if (e.key === 'ArrowUp' && e.altKey) { e.preventDefault(); mueve(f.i, -1); }
      });
      const evid = h('div', { class: 'ar-ev ar-' + est.k },
        h('span', { class: 'ar-dot' }, est.k === 'bien' || est.k === 'cierre' ? '●' : est.k === 'sin-evidencia' ? '○' : '!'),
        h('span', null, est.txt));
      const acciones = h('div', { class: 'ar-acc' },
        h('button', { class: 'btn btn-sm', title: 'Añadir la evidencia que la sostiene',
          onclick: e => menuEvidencia(f.i, e.currentTarget) }, '+ Evidencia'),
        h('button', { class: 'icon-btn', title: 'Subir (Alt+↑)', onclick: () => mueve(f.i, -1) }, '↑'),
        h('button', { class: 'icon-btn', title: 'Bajar (Alt+↓)', onclick: () => mueve(f.i, 1) }, '↓'),
        h('button', { class: 'icon-btn', title: 'Abrir la diapositiva', onclick: () => irA(f.i) }, '→'));
      const fila = h('div', { class: 'ar-fila' + (S.cur === f.i ? ' on' : ''), 'data-i': String(f.i) },
        h('span', { class: 'ar-n' }, String(n)),
        h('div', { class: 'ar-txt' }, campo, evid),
        acciones);
      lista.append(fila);
    });
    if (!r.total) lista.append(h('p', { class: 'hint', style: 'padding:14px' }, 'Todavía no hay afirmaciones. Pulsa «+ Afirmación» y escribe la primera.'));
    if (!hilo.hidden) pintaHilo();
  }

  function irA(i) { S.cur = i; S.selBlock = null; cierraArgumento(); renderAll(); }
  function mueve(i, d) {
    const j = i + d;
    if (j < 0 || j >= S.deck.slides.length) return;
    const sl = S.deck.slides[j];
    if (sl.layout === 'title' || sl.bibAuto) return;
    moveSlide(i, j);
    pintaArgumento();
  }
  function nuevaAfirmacion(despuesDe) {
    const at = despuesDe == null ? posBib(S.deck) : despuesDe + 1;
    addSlide('content', at);
    const sl = S.deck.slides[at];
    sl.title = '';
    /* nace vacía de contenido: la evidencia se elige, no se hereda */
    zonas(sl).forEach(z => { z.length = 0; });
    commit({ skipInsp: true });
    pintaArgumento();
    const campo = lista.querySelector('.ar-fila[data-i="' + at + '"] .ar-af');
    if (campo) campo.focus();
  }
  function menuEvidencia(i, ancla) {
    const ops = [
      { ic: '∿', n: 'Gráfica de datos', fn: () => ponEvidencia(i, 'chart') },
      { ic: '▣', n: 'Figura', fn: () => ponEvidencia(i, 'image') },
      { ic: '▦', n: 'Tabla', fn: () => ponEvidencia(i, 'table') },
      { ic: '∑', n: 'Ecuación', fn: () => ponEvidencia(i, 'math') },
      { ic: '⚗', n: 'Montaje o diagrama', fn: () => ponEvidencia(i, 'montaje') },
      { ic: '⬡', n: 'Estructura química', fn: () => ponEvidencia(i, 'estruct') }
    ];
    showMenu(menuDe(ops), ancla);
  }
  function ponEvidencia(i, tipo) {
    S.cur = i;
    addBlockToSlide(tipo, 1);
    cierraArgumento();
    renderAll();
  }
}
function cierraArgumento() {
  if (!AR.on) return;
  AR.on = false;
  argRoot().innerHTML = '';
  if (AR.keyh) window.removeEventListener('keydown', AR.keyh, true);
  document.body.classList.remove('con-clasificador');
  renderAll();
}
function alternaArgumento() { AR.on ? cierraArgumento() : abreArgumento(); }

/* ================= modo esqueleto =================
   Fricción útil: al empezar por el argumento, el lienzo queda cerrado hasta
   que la cadena se sostiene (al menos tres afirmaciones, todas con verbo). Es
   el freno al error más caro: pulir la diapositiva cuatro cuando la charla
   todavía no sabe a dónde va. Siempre se puede saltar; es un freno, no un muro. */
const enEsqueleto = deck => !!((deck || S.deck).meta || {}).esqueleto;
function esqueletoListo(deck) {
  const r = resumenArgumento(deck);
  return r.total >= 3 && r.genericas === 0;
}
function empiezaPorElArgumento() {
  const d = demoDeck();
  d.slides = [d.slides[0]];
  d.meta.title = ''; d.meta.subtitle = ''; d.meta.esqueleto = true; d.meta.refs = [];
  loadDeck(d, null);
  for (let k = 0; k < 3; k++) {
    const sl = { id: uid(), layout: 'content', title: '', blocks: [] };
    prepararZonas(sl, 'content');
    S.deck.slides.push(sl);
  }
  S.cur = 1;
  commit();
  abreArgumento();
}
function desbloqueaLienzo() {
  delete S.deck.meta.esqueleto;
  commit();
  toast('Lienzo abierto: ahora sí, a darle forma');
}
/* La tapa que cubre el lienzo mientras dura el esqueleto. */
function tapaEsqueleto() {
  const r = resumenArgumento(S.deck);
  const listo = esqueletoListo(S.deck);
  return h('div', { class: 'esq-tapa' },
    h('div', { class: 'esq-caja' },
      h('div', { class: 'esq-tit' }, 'Primero el argumento'),
      h('p', null, 'El lienzo se abre cuando la cadena de afirmaciones se sostiene: al menos tres, todas con verbo y sin nombres de sección. ' +
        'Es el freno al error más caro de una charla: pulir la diapositiva cuatro antes de saber a dónde va todo.'),
      h('div', { class: 'esq-prog' },
        h('b', null, r.listas + r.sinEvidencia), ' de ', h('b', null, Math.max(3, r.total)), ' afirmaciones listas' +
        (r.vacias ? ' · ' + r.vacias + ' por escribir' : '') +
        (r.genericas - r.vacias > 0 ? ' · ' + (r.genericas - r.vacias) + ' por reescribir' : '')),
      h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:12px' },
        h('button', { class: 'btn btn-pri', onclick: abreArgumento }, '☰ Escribir el argumento'),
        h('button', { class: 'btn' + (listo ? ' btn-pri' : ''), disabled: !listo, title: listo ? '' : 'Todavía falta que las afirmaciones se sostengan',
          onclick: desbloqueaLienzo }, listo ? '◇ Abrir el lienzo' : '◆ Abrir el lienzo'),
        h('button', { class: 'btn btn-ghost', onclick: desbloqueaLienzo }, 'Saltarme esto'))));
}


