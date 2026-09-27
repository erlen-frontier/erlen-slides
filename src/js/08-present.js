/* ==== 08-present.js ==== */
'use strict';
/* ================= modo presentación ================= */
const P = { on: false, i: 0, step: 0, notes: false, keyh: null, tinta: 'off', trazos: {}, moverPunto: null,
  wake: null, cursorT: null, cursorMove: null, vista: null, ensayo: null, ensayoT: null };

function startPresent(fromCurrent, opts) {
  opts = opts || {};
  P.on = true; P.i = fromCurrent ? S.cur : 0; P.step = 0; P.notes = false; P.t0 = Date.now();
  while (typeof fueraDeRama === 'function' && P.i < S.deck.slides.length - 1 && fueraDeRama(S.deck.slides[P.i])) P.i++;
  P.tinta = 'off'; P.trazos = {}; P.vista = null; P.ensayo = null;
  const root = $('#presentRoot');
  root.innerHTML = '';
  const wrap = h('div', { class: 'present-root', tabindex: '-1' },
    h('div', { class: 'present-stage', id: 'pStage' }),
    h('div', { class: 'p-progress' }, h('i', { id: 'pProg' })),
    h('div', { class: 'p-counter', id: 'pCount' }),
    h('div', { class: 'p-hint', id: 'pHint' }, '← → avanzar · O ver todas · P presentador · L lápiz · G ir a · N notas · F pantalla completa · Esc salir'));
  root.append(wrap);
  setTimeout(() => { const el = $('#pHint'); if (el) el.style.opacity = '0'; }, 3200);
  paintPresent(0);
  wrap.focus();
  pideWake();
  armaCursor();
  if (opts.ensayo) iniciaEnsayo();
  P.keyh = e => onPresentKey(e);
  window.addEventListener('keydown', P.keyh, true);
  wrap.addEventListener('click', e => {
    if (e.target.closest('.p-notes, .sliders, video, input, .p-ir, #pTinta, .pv-root, .p-ensayo')) return;
    if (P.tinta === 'lapiz') return;
    advance(1);
  });
  wrap.addEventListener('contextmenu', e => { e.preventDefault(); advance(-1); });
  window.addEventListener('resize', fitPresent);
  try { document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {}); } catch (e) {}
}

/* Redibuja la diapositiva completa. Los cambios de paso NO pasan por aquí:
   así el video sigue corriendo y los deslizadores conservan su posición. */
function paintPresent(dir) {
  const stage = $('#pStage'); if (!stage) return;
  stage.innerHTML = '';
  const sl = renderSlide(S.deck, P.i, 'present', P.step);
  stage.append(sl);
  aplicaTransicion(sl, dir);
  marcaEnsayo();
  fitPresent();
  armDraw(sl, P.step);
  playVideos(sl);
  capaTinta(); pintaTinta();
  if ($('#pTinta')) $('#pTinta').classList.toggle('activo', P.tinta === 'lapiz');
  const ownNum = !!sl.querySelector('.pagenum, .fl-page');
  const cnt = $('#pCount');
  cnt.textContent = `${P.i + 1} / ${S.deck.slides.length}`;
  cnt.style.display = ownNum ? 'none' : '';
  const th = temaDe(S.deck);
  const pr = $('#pProg');
  pr.style.background = th.acc;
  pr.style.width = ((P.i + 1) / S.deck.slides.length * 100) + '%';
  paintNotes();
  if (typeof pintaSubtitulos === 'function') pintaSubtitulos();
  if (P.ensayo) pintaEnsayo();
  if (VP.ui) pintaPresentador();
}
function paintNotes() {
  const old = $('.p-notes'); if (old) old.remove();
  if (!P.notes) return;
  const n = S.deck.slides[P.i].notes || '';
  const root = $('.present-root'); if (!root) return;
  root.append(h('div', { class: 'p-notes' },
    h('h4', null, `Notas · diapositiva ${P.i + 1}`),
    h('div', { html: n ? blockRich(n) : '<p style="opacity:.55">Sin notas para esta diapositiva.</p>' })));
}
function fitPresent() {
  const stage = $('#pStage'); if (!stage) return;
  const [W, H] = slideDims(S.deck);
  const z = Math.min(window.innerWidth / W, window.innerHeight / H);
  stage.style.transform = `scale(${z})`;
  stage.style.width = W + 'px'; stage.style.height = H + 'px';
  stage.style.transformOrigin = 'center center';
}
/* Muestra u oculta los fragmentos ya construidos; dispara la transición
   del que se acaba de revelar. */
function paintSteps() {
  const stage = $('#pStage'); if (!stage) return;
  const sl = stage.firstChild; if (!sl) return;
  $$('.frag', sl).forEach(el => {
    const i = +el.dataset.frag;
    el.classList.toggle('on', i < P.step);
  });
  armDraw(sl, P.step);
  if (typeof pintaSubtitulos === 'function') pintaSubtitulos();
  if (VP.ui) pintaPresentador();
}
function armDraw(sl, shown) {
  $$('.chart-draw', sl).forEach(path => {
    let L = 0;
    try { L = path.getTotalLength(); } catch (e) { L = 0; }
    if (!L) return;
    path.style.setProperty('--dash', L.toFixed(1));
    const frag = path.closest('.frag');
    const visible = !frag || frag.classList.contains('on');
    if (visible && !path.classList.contains('play')) {
      path.style.strokeDasharray = L.toFixed(1);
      path.style.strokeDashoffset = L.toFixed(1);
      requestAnimationFrame(() => path.classList.add('play'));
    }
  });
}
function playVideos(sl) {
  $$('video[data-autoplay]', sl).forEach(v => {
    v.muted = true;
    const go = v.play();
    if (go && go.catch) go.catch(() => {});
  });
}
function advance(dir) {
  const total = stepCount(S.deck, P.i);
  if (dir > 0) {
    if (P.step < total) { P.step++; paintSteps(); return; }
    /* No se avanza al respaldo: se salta a él desde el índice (tecla Q). */
    const tope = typeof finCharla === 'function' && !esRespaldo(S.deck.slides[P.i]) ? finCharla(S.deck) : S.deck.slides.length - 1;
    let j = P.i + 1;
    while (j <= tope && typeof fueraDeRama === 'function' && fueraDeRama(S.deck.slides[j])) j++;   /* las de fuera de la rama no existen */
    if (j <= tope) { P.i = j; P.step = 0; paintPresent(1); }
    return;
  }
  if (P.step > 0) { P.step--; paintSteps(); return; }
  let j = P.i - 1;
  while (j >= 0 && typeof fueraDeRama === 'function' && fueraDeRama(S.deck.slides[j])) j--;
  if (j >= 0) { P.i = j; P.step = stepCount(S.deck, P.i); paintPresent(-1); }
}
function onPresentKey(e) {
  if (!P.on) return;
  const k = e.key;
  /* Con el cuadro «Ir a» abierto, el teclado es suyo. */
  if ($('#pIr')) {
    if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); cierraSalto(); }
    return;
  }
  /* Con el índice de preguntas abierto, el teclado es suyo. */
  if (typeof _idxPreg !== 'undefined' && _idxPreg) {
    if (k === 'Escape' || k === 'q' || k === 'Q') { e.preventDefault(); e.stopPropagation(); cierraIndicePreguntas(); }
    return;
  }
  /* Con la vista general abierta, el teclado es suyo. */
  if (P.vista) { if (teclaVista(e)) { e.preventDefault(); e.stopPropagation(); } return; }
  /* Con un deslizador de la gráfica dinámica enfocado, las flechas lo mueven
     a él: si pasaran de diapositiva, afinar un valor en plena charla sería
     imposible con el teclado. Re Pág y Av Pág siguen pasando diapositivas:
     es lo que manda un control remoto. */
  if (e.target && e.target.type === 'range' && e.target.closest && e.target.closest('.sliders') &&
      /^(Arrow|Home$|End$)/.test(k)) return;
  if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); endPresent(); return; }
  if (k === 'ArrowRight' || k === 'ArrowDown' || k === ' ' || k === 'PageDown' || k === 'Enter') { e.preventDefault(); e.stopPropagation(); advance(1); return; }
  if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || k === 'Backspace') { e.preventDefault(); e.stopPropagation(); advance(-1); return; }
  if (k === 'Home') { e.preventDefault(); P.i = 0; P.step = 0; paintPresent(-1); return; }
  if (k === 'End') { e.preventDefault(); P.i = finCharla(S.deck); P.step = stepCount(S.deck, P.i); paintPresent(1); return; }
  if (k === 'r' || k === 'R') { e.preventDefault(); paintPresent(0); return; }
  if (k === 'o' || k === 'O') { e.preventDefault(); alternaVista(); return; }
  if (k === 'n' || k === 'N') { e.preventDefault(); P.notes = !P.notes; paintNotes(); return; }
  if (k === 'p' || k === 'P') { e.preventDefault(); alternaPresentador(); return; }
  if (k === 'l' || k === 'L') { e.preventDefault(); alternaTinta(); return; }
  if ((k === 'c' || k === 'C') && !e.ctrlKey && !e.metaKey) { e.preventDefault(); borraTinta(); return; }
  if (k === 'q' || k === 'Q') { e.preventDefault(); alternaIndicePreguntas(); return; }
  if ((k === 's' || k === 'S') && !e.ctrlKey && !e.metaKey) { e.preventDefault(); alternaSubtitulos(); return; }
  if (k === 'g' || k === 'G') { e.preventDefault(); abreSalto(''); return; }
  if (/^[0-9]$/.test(k)) { e.preventDefault(); abreSalto(k); return; }
  if (k === 'f' || k === 'F') {
    e.preventDefault();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
    return;
  }
  if (k === 'b' || k === 'B') { e.preventDefault(); const r = $('.present-root'); if (r) r.style.visibility = r.style.visibility === 'hidden' ? '' : 'hidden'; }
}
function endPresent() {
  P.on = false;
  const ens = terminaEnsayo();
  cierraPresentador();
  cierraSalto();
  cierraVista();
  sueltaWake();
  paraCursor();
  if (P.moverPunto) { window.removeEventListener('pointermove', P.moverPunto); P.moverPunto = null; }
  P.tinta = 'off'; P.trazos = {};
  window.removeEventListener('keydown', P.keyh, true);
  window.removeEventListener('resize', fitPresent);
  $('#presentRoot').innerHTML = '';
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  S.cur = P.i; S.selBlock = null; renderAll();
  if (ens) setTimeout(() => reporteEnsayo(ens), 120);
  /* Si fue una charla de verdad (más de tres minutos y no un ensayo), se
     ofrece cerrar el ciclo: marcar dónde preguntaron. */
  const dur = Math.round((Date.now() - (P.t0 || Date.now())) / 1000);
  if (!ens && dur >= 180 && typeof openCierre === 'function') {
    setTimeout(() => toast('¿Cómo fue? Marca dónde preguntaron', null, { t: 'Marcar', fn: () => openCierre(dur) }), 400);
  }
}

/* swipe en móvil */
function initPresentTouch() {
  let x0 = null, y0 = null;
  document.addEventListener('touchstart', e => { if (!P.on) return; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  document.addEventListener('touchend', e => {
    if (!P.on || x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) advance(dx < 0 ? 1 : -1);
    x0 = null;
  }, { passive: true });
}


