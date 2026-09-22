/* ==== 34-pulido.js ==== */
'use strict';
/* ================= pulido: transiciones, vista general, ensayo =================
   Cuatro cosas que sólo se notan al presentar de verdad: que las diapositivas
   no salten, poder ver todas sin salir, que la pantalla no se apague a media
   defensa y saber cuánto tiempo te llevó cada una en el ensayo. */

/* ---------- transiciones ----------
   Beamer sí las tiene: \transdissolve y \transwipe escriben la transición en
   el propio PDF, así que el .tex sale con lo mismo que ves en pantalla. */
/* ---------- transiciones entre diapositivas ----------
   Cada una tiene su equivalente REAL en el PDF: no es una animación de la app
   que se pierda al exportar, sino la orden de transición de página que Beamer
   escribe en el documento y que respetan los lectores en pantalla completa.
   'cls' es la clase con que se hace en la app; 'inv' es la variante cuando
   retrocedes, para que el movimiento vaya en el sentido del guion. */
const TRANS = [
  { id: 'ninguna', n: 'Ninguna', d: 'La diapositiva aparece de golpe. Es lo que hace Beamer de fábrica.', tex: null, cls: null },
  { id: 'fundido', n: 'Fundido', d: 'La nueva entra difuminada en un cuarto de segundo. Discreta y la más segura en un proyector viejo.',
    tex: '\\transdissolve[duration=0.25]', cls: 'tr-fundido' },
  { id: 'desplaza', n: 'Desplazamiento', d: 'Entra corrida desde el lado hacia el que avanzas. Ayuda a sentir el orden del guion.',
    tex: '\\transwipe[duration=0.25,direction=180]', cls: 'tr-der', inv: 'tr-izq' },
  { id: 'empuja', n: 'Empuje', d: 'La nueva empuja a la anterior fuera de la pantalla. Marca el avance con más fuerza.',
    tex: '\\transwipe[duration=0.3,direction=180]', cls: 'tr-empuja-der', inv: 'tr-empuja-izq' },
  { id: 'subir', n: 'Subir', d: 'La nueva entra desde abajo. Va bien entre las diapositivas de una misma idea.',
    tex: '\\transwipe[duration=0.25,direction=270]', cls: 'tr-sube' },
  { id: 'persiana', n: 'Persiana', d: 'Se descubre en franjas horizontales, como al abrir una persiana.',
    tex: '\\transblindshorizontal[duration=0.3]', cls: 'tr-persiana' },
  { id: 'persianav', n: 'Persiana vertical', d: 'Lo mismo, pero en franjas verticales.',
    tex: '\\transblindsvertical[duration=0.3]', cls: 'tr-persianav' },
  { id: 'abrir', n: 'Abrir', d: 'Se abre desde el centro hacia los lados, como un telón.',
    tex: '\\transsplitverticalout[duration=0.3]', cls: 'tr-abrir' },
  { id: 'cerrar', n: 'Cerrar', d: 'Se cierra hacia el centro. Sirve para rematar una sección.',
    tex: '\\transsplithorizontalin[duration=0.3]', cls: 'tr-cerrar' },
  { id: 'caja', n: 'Caja', d: 'Se abre desde el centro en un rectángulo que crece.',
    tex: '\\transboxout[duration=0.3]', cls: 'tr-caja' },
  { id: 'destello', n: 'Destello', d: 'Un barrido en diagonal con grano. Es vistosa: úsala para una portada, no para cada diapositiva.',
    tex: '\\transglitter[duration=0.35,direction=315]', cls: 'tr-destello' }
];
const TK_TRANS = {}; TRANS.forEach(t => TK_TRANS[t.id] = t);
function transDe(m) {
  const t = (m || {}).trans;
  return TRANS.find(x => x.id === t) || TRANS[1];
}
const menosMovimiento = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

function aplicaTransicion(sl, dir) {
  if (!dir || menosMovimiento()) return;
  const t = transDe(S.deck.meta);
  if (!t.cls) return;
  const cls = (dir < 0 && t.inv) ? t.inv : t.cls;
  sl.classList.add(cls);
  setTimeout(() => sl.classList.remove(cls), 620);
}

/* ---------- que la pantalla no se apague ----------
   Screen Wake Lock: disponible en Chrome, Safari y Firefox desde 2024. Donde
   no exista, no pasa nada: la app sigue igual. */
async function pideWake() {
  try {
    if (!('wakeLock' in navigator) || P.wake) return;
    P.wake = await navigator.wakeLock.request('screen');
    P.wake.addEventListener('release', () => { P.wake = null; });
  } catch (e) { P.wake = null; }
}
function sueltaWake() {
  const w = P.wake; P.wake = null;
  if (w && w.release) { try { w.release(); } catch (e) {} }
}
function initWake() {
  document.addEventListener('visibilitychange', () => {
    if (P.on && document.visibilityState === 'visible') pideWake();
  });
}

/* ---------- el cursor se quita solo ----------
   Con el lápiz encendido se queda: ahí sí hace falta ver dónde apuntas. */
function armaCursor() {
  const raiz = $('.present-root'); if (!raiz) return;
  const despierta = () => {
    raiz.classList.remove('sin-cursor');
    clearTimeout(P.cursorT);
    P.cursorT = setTimeout(() => {
      if (P.on && P.tinta !== 'lapiz' && !$('#pIr') && !P.vista) raiz.classList.add('sin-cursor');
    }, 2600);
  };
  P.cursorMove = despierta;
  raiz.addEventListener('pointermove', despierta);
  raiz.addEventListener('pointerdown', despierta);
  despierta();
}
function paraCursor() {
  clearTimeout(P.cursorT); P.cursorT = null; P.cursorMove = null;
}

/* ---------- vista general (tecla O) ---------- */
function alternaVista() { P.vista ? cierraVista() : abreVista(); }
function abreVista() {
  if (P.vista) return;
  const raiz = $('.present-root'); if (!raiz) return;
  raiz.classList.remove('sin-cursor');
  P.vista = { sel: P.i };
  const [W, H] = slideDims(S.deck);
  const anchoCol = window.matchMedia('(max-width:760px)').matches ? 148 : 210;
  const k = anchoCol / W, alto = Math.round(H * k);
  /* La rejilla se dibuja con columnas del ancho exacto de la miniatura: si se
     dejan crecer, la diapositiva se sale de su recuadro y pisa a la vecina. */
  const rej = h('div', { class: 'pv-rej', style: `grid-template-columns:repeat(auto-fill,${anchoCol + 8}px)` });
  S.deck.slides.forEach((sl, i) => {
    const clip = h('div', { class: 'pv-clip', style: `width:${anchoCol}px;height:${alto}px` });
    const mini = renderSlide(S.deck, i, 'thumb', 99);
    mini.style.transform = `scale(${k})`; mini.style.transformOrigin = 'top left';
    clip.append(mini);
    const cel = h('button', {
      class: 'pv-cel' + (i === P.i ? ' actual' : ''), 'data-i': i,
      'aria-label': `Diapositiva ${i + 1}: ${(sl.title || '').trim() || (LAY[sl.layout] || {}).name || ''}`,
      onclick: e => { e.stopPropagation(); saltaVista(i); }
    }, clip, h('span', { class: 'pv-pie' },
      h('b', null, String(i + 1)),
      h('span', null, (sl.title || '').trim() || (LAY[sl.layout] || {}).name || '')));
    rej.append(cel);
  });
  const caja = h('div', { class: 'pv-root', id: 'pVista' },
    h('div', { class: 'pv-barra' },
      h('span', { class: 'pv-tit' }, 'Todas las diapositivas'),
      h('span', { class: 'pv-ay' }, 'flechas para moverte · Enter para saltar · O o Esc para volver')),
    rej);
  caja.addEventListener('click', e => { if (e.target === caja) cierraVista(); });
  raiz.append(caja);
  marcaVista();
}
function marcaVista() {
  if (!P.vista) return;
  $$('#pVista .pv-cel').forEach(c => c.classList.toggle('foco', +c.dataset.i === P.vista.sel));
  const el = $(`#pVista .pv-cel.foco`);
  if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
}
function saltaVista(i) {
  cierraVista();
  P.i = clamp(i, 0, S.deck.slides.length - 1); P.step = 0;
  paintPresent(0);
}
function cierraVista() {
  P.vista = null;
  const c = $('#pVista'); if (c) c.remove();
}
/* Devuelve true si la tecla era suya. */
function teclaVista(e) {
  if (!P.vista) return false;
  const k = e.key, n = S.deck.slides.length;
  const cols = () => {
    const rej = $('#pVista .pv-rej'); if (!rej || !rej.firstChild) return 1;
    const ancho = rej.clientWidth, cel = rej.firstChild.getBoundingClientRect().width + 12;
    return Math.max(1, Math.round(ancho / cel));
  };
  const mueve = d => { P.vista.sel = clamp(P.vista.sel + d, 0, n - 1); marcaVista(); };
  if (k === 'Escape' || k === 'o' || k === 'O') { cierraVista(); return true; }
  if (k === 'ArrowRight') { mueve(1); return true; }
  if (k === 'ArrowLeft') { mueve(-1); return true; }
  if (k === 'ArrowDown') { mueve(cols()); return true; }
  if (k === 'ArrowUp') { mueve(-cols()); return true; }
  if (k === 'Home') { P.vista.sel = 0; marcaVista(); return true; }
  if (k === 'End') { P.vista.sel = n - 1; marcaVista(); return true; }
  if (k === 'Enter' || k === ' ') { saltaVista(P.vista.sel); return true; }
  return true;   /* mientras está abierta, el resto del teclado no avanza */
}

/* ---------- ensayo cronometrado ---------- */
function iniciaEnsayo() {
  P.ensayo = { tiempos: {}, actual: null, desde: 0, arranque: Date.now() };
  SESION.ensayos++;
  const raiz = $('.present-root'); if (!raiz) return;
  raiz.append(h('div', { class: 'p-ensayo', id: 'pEnsayo' },
    h('span', { class: 'pe-pt' }, '●'), h('span', { class: 'pe-txt', id: 'pEnsayoTxt' }, '0:00')));
  marcaEnsayo();
  P.ensayoT = setInterval(pintaEnsayo, 500);
  pintaEnsayo();
}
/* Cierra el tiempo de la diapositiva que se deja y abre el de la nueva. */
function marcaEnsayo() {
  const E = P.ensayo; if (!E) return;
  const ahora = Date.now();
  if (E.actual != null && E.actual !== P.i) {
    E.tiempos[E.actual] = (E.tiempos[E.actual] || 0) + (ahora - E.desde);
    E.actual = null;
  }
  if (E.actual == null) { E.actual = P.i; E.desde = ahora; }
}
function cierraTramo() {
  const E = P.ensayo; if (!E || E.actual == null) return;
  E.tiempos[E.actual] = (E.tiempos[E.actual] || 0) + (Date.now() - E.desde);
  E.desde = Date.now();
}
function pintaEnsayo() {
  const E = P.ensayo, el = $('#pEnsayoTxt'); if (!E || !el) return;
  const enEsta = (E.actual === P.i ? Date.now() - E.desde : 0) + (E.tiempos[P.i] || 0);
  const total = Date.now() - E.arranque;
  const prev = minutosDe(S.deck.slides[P.i]) * 60000;
  el.textContent = reloj(enEsta) + (prev ? ' / ' + reloj(prev) : '') + ' · total ' + reloj(total);
  const caja = $('#pEnsayo');
  if (caja) caja.classList.toggle('pasado', !!prev && enEsta > prev * 1.15);
}
const reloj = ms => {
  const s = Math.max(0, Math.round(ms / 1000));
  return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60);
};
function terminaEnsayo() {
  const E = P.ensayo; if (!E) return null;
  cierraTramo();
  clearInterval(P.ensayoT); P.ensayoT = null;
  P.ensayo = null;
  const caja = $('#pEnsayo'); if (caja) caja.remove();
  return E;
}
function reporteEnsayo(E) {
  /* Lo medido queda en la presentación, por id, para la línea de tiempo. */
  try {
    const t = {};
    S.deck.slides.forEach((sl, i) => { if (E.tiempos[i] >= 1000) t[sl.id] = Math.round(E.tiempos[i] / 1000); });
    S.deck.meta.ensayo = { cuando: new Date().toISOString().slice(0, 10), tiempos: t };
  } catch (e) {}
  const cuerpo = h('div');
  const totalReal = Object.keys(E.tiempos).reduce((a, k) => a + E.tiempos[k], 0);
  const totalPrev = minutosTotales(S.deck) * 60000;
  cuerpo.append(h('p', { class: 'hint', style: 'margin-top:0' },
    'Tiempo medido de verdad, diapositiva por diapositiva. Lo previsto es el campo «Minutos previstos» de cada una.'));
  const res = h('div', { class: 'en-res' },
    h('div', null, h('b', null, reloj(totalReal)), h('span', null, 'ensayo')),
    h('div', null, h('b', null, totalPrev ? reloj(totalPrev) : '—'), h('span', null, 'previsto')),
    h('div', { class: !totalPrev ? '' : totalReal > totalPrev ? 'malo' : 'bueno' },
      h('b', null, totalPrev ? (totalReal > totalPrev ? '+' : '−') + reloj(Math.abs(totalReal - totalPrev)) : '—'),
      h('span', null, 'diferencia')));
  cuerpo.append(res);
  const tabla = h('table', { class: 'en-tab' },
    h('thead', null, h('tr', null, h('th', null, '#'), h('th', null, 'Diapositiva'), h('th', null, 'Previsto'), h('th', null, 'Ensayo'), h('th', null, 'Δ'))));
  const tb = h('tbody');
  S.deck.slides.forEach((sl, i) => {
    const real = E.tiempos[i] || 0;
    const prev = minutosDe(sl) * 60000;
    const dif = prev ? real - prev : null;
    tb.append(h('tr', { class: real ? '' : 'sinver' },
      h('td', null, String(i + 1)),
      h('td', null, (sl.title || '').trim() || (LAY[sl.layout] || {}).name || ''),
      h('td', null, prev ? reloj(prev) : '—'),
      h('td', null, real ? reloj(real) : '—'),
      h('td', { class: dif == null ? '' : (dif > 15000 ? 'malo' : dif < -15000 ? 'corto' : 'bueno') },
        dif == null ? '—' : (dif >= 0 ? '+' : '−') + reloj(Math.abs(dif)))));
  });
  tabla.append(tb);
  cuerpo.append(tabla);
  cuerpo.append(h('p', { class: 'hint' }, 'Las diapositivas que no viste en el ensayo quedan en gris.'));
  openModal({
    title: 'Cómo te fue en el ensayo', size: 'modal-lg', body: cuerpo,
    foot: [
      h('button', { class: 'btn', onclick: () => { aplicaTiemposEnsayo(E); closeModal(); } }, 'Usar estos tiempos como previstos'),
      h('button', { class: 'btn btn-pri', onclick: closeModal }, 'Listo')]
  });
}
function aplicaTiemposEnsayo(E) {
  let n = 0;
  S.deck.slides.forEach((sl, i) => {
    const real = E.tiempos[i] || 0;
    if (real < 3000) return;
    sl.min = Math.round(real / 6000) / 10;   /* décimas de minuto */
    n++;
  });
  commit();
  toast(n ? `Se guardaron los tiempos de ${n} diapositivas` : 'No hubo tiempos que guardar');
}
function presentaEnsayo() {
  startPresent(false, { ensayo: true });
  toast('Ensayo en marcha. Al salir con Esc verás el reporte.');
}

/* ---------- la primera vez ----------
   Estado inicial con las tres cosas que pide un buen estado vacío: en qué
   punto estás, qué puedes aprender y por dónde salir. */
const TITULO_VACIO = 'Presentación sin título';
function deckEnBlanco() {
  const d = S.deck;
  if (!d || d.slides.length > 2) return false;
  const conAlgo = d.slides.some(sl => zonas(sl).some(z => z.length) || (sl.title || '').trim());
  const tit = (d.meta.title || '').trim();
  return !conAlgo && (!tit || tit === TITULO_VACIO) && !(d.meta.authors || '').trim();
}
function pintaPrimeraVez() {
  const vieja = $('#primeraVez'); if (vieja) vieja.remove();
  if (!deckEnBlanco()) return;
  if (S.prefs && S.prefs.sinPrimera) return;
  const via = (ic, tit, sub, fn) => h('button', { class: 'pz-via', onclick: fn },
    h('span', { class: 'pz-ic' }, ic), h('span', { class: 'pz-t' }, tit), h('span', { class: 'pz-s' }, sub));
  const caja = h('div', { class: 'primera-vez', id: 'primeraVez' },
    h('div', { class: 'pz-caja' },
      h('span', { class: 'pz-est' }, 'En blanco · se guarda sola en este navegador'),
      h('h3', null, 'Empieza por donde te sirva'),
      h('p', { class: 'pz-cue' }, 'Todo se edita haciendo clic sobre la diapositiva: el título, el texto y las viñetas. Las ecuaciones y las reacciones se arman con plantillas, sin escribir LaTeX.'),
      h('div', { class: 'pz-vias' },
        via('¶', 'Empezar por el argumento', 'primero las afirmaciones, luego las diapositivas', empiezaPorElArgumento),
        via('◉', 'Cuéntamelo primero', 'habla o pega lo que dirías; salen las afirmaciones', openCuentamelo),
        via('✦', 'Elegir una plantilla', 'defensa de tesis, avance, congreso', openPlantillas),
        via('☰', 'Pegar tu esquema', 'tu índice se vuelve secciones y diapositivas', openEsquema),
        via('◈', 'Ver el ejemplo', 'una presentación armada, para copiar la idea', () => cargaSegura(demoDeck(), null)),
        via('◆', 'Elegir tema y color', 'cinco temas Beamer y tu color', openEstilos)),
      h('div', { class: 'pz-fin' },
        h('button', { class: 'btn btn-sm', onclick: () => { S.tab = 'insert'; renderInspector(); openDrawer(true); ocultaPrimera(); } }, 'Empezar en blanco'),
        h('button', { class: 'btn btn-sm', onclick: () => { ocultaPrimera(); abreAsistente('Acompáñame paso a paso'); } }, '✦ Que me acompañen'),
        h('button', { class: 'btn btn-sm', onclick: () => openHelp('uso') }, 'Cómo se usa'),
        h('button', { class: 'pz-x', title: 'No volver a mostrarlo', onclick: () => { S.prefs.sinPrimera = true; guardaPrefs(); ocultaPrimera(); } }, 'No mostrar esto otra vez'))));
  const cont = $('.canvas-wrap'); if (cont) cont.append(caja);
}
function ocultaPrimera() { const v = $('#primeraVez'); if (v) v.remove(); }

/* ---------- todas las notas de corrido ----------
   Escribir el guion salta menos si ves la charla entera de una sentada. */
function notasDeCorrido(cont, irA) {
  const lista = h('div', { class: 'nc-lista' });
  const tot = h('p', { class: 'hint', style: 'margin:0 0 10px' });
  const cuentaTot = () => {
    const con = S.deck.slides.filter(sl => (sl.notes || '').trim()).length;
    const pal = S.deck.slides.reduce((a, sl) => a + ((sl.notes || '').trim() ? (sl.notes.trim().split(/\s+/).length) : 0), 0);
    const min = minutosTotales(S.deck);
    const leidas = pal / 130;
    tot.textContent = `${con} de ${S.deck.slides.length} diapositivas con nota · ${pal} palabras · `
      + (leidas < 0.8 ? 'menos de un minuto leídas en voz alta' : `unos ${Math.round(leidas)} min leídas en voz alta`)
      + (min ? ` · ${mmss(min)} previstos` : '');
  };
  S.deck.slides.forEach((sl, i) => {
    const esSec = sl.layout === 'section';
    if (esSec) lista.append(h('div', { class: 'nc-sec' }, (sl.title || 'Sección').trim() || 'Sección'));
    const ta = h('textarea', { class: 'field nc-area', rows: 3,
      placeholder: 'Lo que vas a decir aquí. Una línea que empiece con «- » se vuelve viñeta.' }, sl.notes || '');
    const min = h('input', { class: 'field nc-min', type: 'number', min: '0', max: '60', step: '0.5',
      value: sl.min || '', placeholder: '—', title: 'Minutos previstos',
      onchange: e => { const v = +e.target.value; if (v > 0) sl.min = v; else delete sl.min; cuentaTot(); saveInd(); renderFilmstrip(); } });
    ta.addEventListener('input', () => { sl.notes = ta.value; cuentaTot(); saveInd(); });
    ta.addEventListener('focus', () => { S.cur = i; renderFilmstrip(); });
    /* La caja crece con lo que escribes: nada de barras dentro de barras. */
    const crece = () => { ta.style.height = 'auto'; ta.style.height = Math.min(360, Math.max(64, ta.scrollHeight + 2)) + 'px'; };
    ta.addEventListener('input', crece);
    setTimeout(crece, 0);
    lista.append(h('div', { class: 'nc-fila' + (i === S.cur ? ' actual' : '') },
      h('div', { class: 'nc-cab' },
        h('button', { class: 'nc-n', title: 'Abrir esta diapositiva sola', onclick: () => irA(i) }, String(i + 1)),
        h('span', { class: 'nc-t' }, (sl.title || '').trim() || (LAY[sl.layout] || {}).name || ''),
        min, h('span', { class: 'nc-um' }, 'min')),
      ta));
  });
  cuentaTot();
  cont.append(tot, lista);
}


