/* ==== 08b-presentador.js ==== */
'use strict';
/* ================= vista de presentador =================
   Ventana aparte con el reloj, la diapositiva actual, la que sigue y las
   notas. Se abre con la tecla P durante la presentación. Si el navegador
   bloquea la ventana (pasa en algunos visores incrustados), se muestra el
   mismo panel encima de la presentación, con un aviso. */

const VP = { win: null, doc: null, tick: null, t0: null, pausa: 0, corriendo: false, enPagina: false };

const dosCif = n => (n < 10 ? '0' : '') + n;
function cronoTexto() {
  const ms = VP.corriendo ? (Date.now() - VP.t0) : VP.pausa;
  const s = Math.floor(ms / 1000);
  return dosCif(Math.floor(s / 60)) + ':' + dosCif(s % 60);
}
function cronoIniciar() { if (VP.corriendo) return; VP.t0 = Date.now() - VP.pausa; VP.corriendo = true; }
function cronoPausar() { if (!VP.corriendo) return; VP.pausa = Date.now() - VP.t0; VP.corriendo = false; }
function cronoCero() { VP.pausa = 0; VP.t0 = Date.now(); }

/* Miniatura de una diapositiva a un ancho dado, sin videos en marcha. */
function miniDe(idx, ancho, modo, paso) {
  const [W, H] = slideDims(S.deck);
  const k = ancho / W;
  const clip = h('div', { class: 'vp-clip', style: `width:${ancho}px;height:${Math.round(H * k)}px` });
  if (idx < 0 || idx >= S.deck.slides.length) { clip.classList.add('vp-fin'); clip.append(h('span', null, 'Fin de la presentación')); return clip; }
  const sl = renderSlide(S.deck, idx, modo || 'thumb', paso == null ? 99 : paso);
  sl.style.transform = `scale(${k})`; sl.style.transformOrigin = 'top left';
  $$('video', sl).forEach(v => { v.removeAttribute('autoplay'); v.removeAttribute('data-autoplay'); v.pause && v.pause(); });
  clip.append(sl);
  return clip;
}

const CSS_VP = `
  :root{color-scheme:dark}
  body.vp{margin:0;background:#12161C;color:#E7ECF2;font:14px/1.5 'Fira Sans',system-ui,-apple-system,sans-serif;
    height:100vh;display:flex;flex-direction:column;overflow:hidden}
  .vp-bar{display:flex;align-items:center;gap:16px;padding:10px 16px;border-bottom:1px solid #2A323C;flex:none}
  .vp-crono{font:600 30px/1 'JetBrains Mono',ui-monospace,monospace;font-variant-numeric:tabular-nums;letter-spacing:.02em}
  .vp-reloj{font:400 15px/1 'JetBrains Mono',ui-monospace,monospace;color:#93A1B0;font-variant-numeric:tabular-nums}
  .vp-bar button{background:#1D242C;color:#E7ECF2;border:1px solid #333D49;border-radius:8px;
    padding:6px 12px;font-size:13.5px;cursor:pointer;font-family:inherit}
  .vp-bar button:hover{border-color:#F09A4D;color:#F5B173}
  .vp-crono.atras{color:#F2938A}
  .vp-ritmo{display:flex;align-items:baseline;gap:9px;font-size:12.5px;color:#7E8B99;white-space:nowrap}
  .vp-ritmo .vp-dif{font:600 13px/1 'JetBrains Mono',ui-monospace,monospace;font-variant-numeric:tabular-nums;color:#93A1B0}
  .vp-ritmo .vp-dif.mal{color:#F2938A}
  .vp-ritmo .vp-dif.ok{color:#7FCB9B}
  .vp-rot-min{margin-left:9px;color:#F09A4D;letter-spacing:0;text-transform:none;font-size:11.5px}
  .vp-notas ul{margin:.2em 0 .7em;padding-left:22px}
  .vp-notas li{margin:0 0 .3em}
  .vp-cuenta{margin-left:auto;font:600 17px/1 'JetBrains Mono',ui-monospace,monospace;font-variant-numeric:tabular-nums}
  .vp-cuenta small{font-weight:400;color:#93A1B0;font-size:13px}
  .vp-cuerpo{flex:1;display:grid;grid-template-columns:1.55fr 1fr;gap:16px;padding:16px;min-height:0}
  .vp-col{display:flex;flex-direction:column;gap:8px;min-height:0;min-width:0}
  .vp-col.der{gap:14px}
  .vp-rot{font-size:11px;letter-spacing:.13em;text-transform:uppercase;color:#7E8B99;flex:none}
  .vp-clip{position:relative;overflow:hidden;border-radius:6px;background:#000;
    box-shadow:0 6px 22px rgba(0,0,0,.45);flex:none;align-self:flex-start}
  .vp-clip.vp-fin{display:grid;place-items:center;background:#1A2028;color:#7E8B99;font-size:15px}
  .vp-notas{flex:1;min-height:0;overflow:auto;background:#171D24;border:1px solid #29313A;border-radius:10px;
    padding:12px 14px;font-size:16px;line-height:1.6}
  .vp-notas p{margin:0 0 .7em}
  .vp-notas .vacio{color:#6D7A88;font-style:italic}
  .vp-pie{flex:none;display:flex;align-items:center;gap:12px;padding:9px 16px;border-top:1px solid #2A323C;
    color:#93A1B0;font-size:12.5px}
  .vp-pie b{color:#E7ECF2;font-weight:500}
  .vp-nav{display:flex;gap:8px;margin-right:auto}
  .vp-nav button{background:#1D242C;color:#E7ECF2;border:1px solid #333D49;border-radius:8px;
    padding:7px 16px;font-size:14px;cursor:pointer;font-family:inherit}
  .vp-nav button:hover{border-color:#F09A4D}
  @media (max-width:860px){.vp-cuerpo{grid-template-columns:1fr;overflow:auto}}

  /* panel dentro de la misma pantalla (respaldo) */
  .vp-panel{position:fixed;left:0;right:0;bottom:0;height:46dvh;z-index:170;background:#12161C;color:#E7ECF2;
    border-top:2px solid #F09A4D;display:flex;flex-direction:column;
    font:14px/1.5 'Fira Sans',system-ui,-apple-system,sans-serif;box-shadow:0 -12px 34px rgba(0,0,0,.5)}
  .vp-panel .vp-aviso{flex:none;display:flex;align-items:center;gap:10px;padding:8px 14px;
    background:#3A2A16;color:#F5CDA0;font-size:12.5px;line-height:1.4}
  .vp-panel .vp-aviso b{color:#FFD9AE}
  .vp-panel .vp-cerrar{margin-left:auto;flex:none;background:#1D242C;color:#E7ECF2;border:1px solid #4A3A22;
    border-radius:7px;padding:5px 11px;font-size:12.5px;cursor:pointer;font-family:inherit}
  .vp-panel-in{flex:1;display:flex;flex-direction:column;min-height:0}
  .vp-panel .vp-cuerpo{padding:12px;gap:12px}
  .vp-panel .vp-crono{font-size:24px}
  .vp-panel .vp-bar{padding:7px 14px}
`;

function estiloPresentador() {
  const estilo = h('style', { html: CSS_VP });
  // Tauri assigns a nonce to bundled styles; carry it to dynamically created
  // styles so the presenter's CSS is accepted by the same policy.
  const nonce = document.querySelector('style[nonce]')?.nonce;
  if (nonce) estilo.nonce = nonce;
  return estilo;
}

function armaPresentador(doc, cont, med) {
  cont.innerHTML = '';
  const crono = h('span', { class: 'vp-crono' }, cronoTexto());
  const reloj = h('span', { class: 'vp-reloj' }, '');
  const btnPP = h('button', null, VP.corriendo ? '❙❙ Pausar' : '▶ Iniciar');
  btnPP.addEventListener('click', () => { VP.corriendo ? cronoPausar() : cronoIniciar(); btnPP.textContent = VP.corriendo ? '❙❙ Pausar' : '▶ Iniciar'; });
  const btnCero = h('button', { title: 'Poner el cronómetro en cero' }, '↺');
  btnCero.addEventListener('click', () => { cronoCero(); crono.textContent = cronoTexto(); });
  const cuenta = h('span', { class: 'vp-cuenta' });
  const ritmo = h('span', { class: 'vp-ritmo' });

  const ahora = h('div', { class: 'vp-col' }, h('div', { class: 'vp-rot' }, 'En pantalla'));
  const sigue = h('div', { class: 'vp-col der' });
  const notas = h('div', { class: 'vp-notas' });

  cont.append(
    h('div', { class: 'vp-bar' }, crono, btnPP, btnCero, reloj, ritmo, cuenta),
    h('div', { class: 'vp-cuerpo' }, ahora, sigue),
    h('div', { class: 'vp-pie' },
      h('div', { class: 'vp-nav' },
        h('button', { onclick: () => advance(-1) }, '◀ Anterior'),
        h('button', { onclick: () => advance(1) }, 'Siguiente ▶')),
      h('span', null, h('b', null, '←  →'), ' avanzar · ', h('b', null, 'Esc'), ' terminar')));

  VP.ui = { crono, reloj, cuenta, ritmo, ahora, sigue, notas, doc, cont, med: med || cont };
  pintaPresentador();

  clearInterval(VP.tick);
  VP.tick = setInterval(() => {
    if (!VP.ui) return;
    VP.ui.crono.textContent = cronoTexto();
    const d = new Date();
    VP.ui.reloj.textContent = dosCif(d.getHours()) + ':' + dosCif(d.getMinutes());
    marcaRitmo();
  }, 500);
}

function pintaPresentador() {
  const u = VP.ui; if (!u) return;
  const total = S.deck.slides.length;
  const pasos = stepCount(S.deck, P.i);
  u.cuenta.innerHTML = '';
  u.cuenta.append(String(P.i + 1), h('small', null, ' / ' + total));
  if (pasos) u.cuenta.append(h('small', null, `  ·  paso ${Math.min(P.step, pasos)}/${pasos}`));

  const [W, H] = slideDims(S.deck);
  const anchoDisp = u.med.clientWidth || 900, altoDisp = (u.med.clientHeight || 620) - 150;
  const porAlto = Math.round(Math.max(120, altoDisp) * W / H);
  const colA = u.ahora.clientWidth || Math.round(anchoDisp * 0.58);
  const colB = u.sigue.clientWidth || Math.round(anchoDisp * 0.36);
  const anchoA = Math.max(200, Math.min(colA, porAlto));
  const anchoB = Math.max(170, Math.min(colB, Math.round(porAlto * 0.46)));
  u.ahora.innerHTML = '';
  u.ahora.append(h('div', { class: 'vp-rot' }, 'En pantalla'), miniDe(P.i, anchoA, 'present', P.step));
  u.sigue.innerHTML = '';
  u.sigue.append(h('div', { class: 'vp-rot' }, P.i + 1 < S.deck.slides.length ? 'Sigue' : 'Sigue — fin'),
    miniDe(P.i + 1, anchoB));
  const sl = S.deck.slides[P.i] || {};
  u.notas.innerHTML = '';
  const partes = partesNota(sl.notes);
  partes.forEach(pt => {
    if (pt.tipo === 'lista') { const ul = h('ul'); pt.items.forEach(t => ul.append(h('li', { html: inlineRich(t) }))); u.notas.append(ul); }
    else u.notas.append(h('p', { html: inlineRich(pt.texto) }));
  });
  /* Lo que se dice en la capa que acaba de aparecer, si la gráfica va por capas. */
  zonas(sl).flat().forEach(b => {
    if (b.type !== 'chart' || !b.capas) return;
    const svg = document.querySelector('#pStage .blk[data-bid="' + b.id + '"] svg');
    const encendidas = svg ? svg.querySelectorAll('g.capa.on').length : 0;
    const nombres = nombresCapas(b);
    const k = encendidas - 1;
    const txt = k < 0 ? 'Solo los ejes: di qué se va a ver.' : (notaCapa(b, k) || nombres[k] || '');
    u.notas.prepend(h('p', { class: 'vp-capa' }, h('b', null, 'Capa ' + Math.max(0, encendidas) + '/' + nombres.length + ' · '), txt));
  });
  if (!u.notas.firstChild) u.notas.append(h('p', { class: 'vacio' }, 'Sin notas para esta diapositiva.'));
  const rotNota = h('div', { class: 'vp-rot' }, 'Notas');
  if (minutosDe(sl)) rotNota.append(h('span', { class: 'vp-rot-min' }, mmss(minutosDe(sl)) + ' min'));
  u.sigue.append(rotNota, u.notas);
  marcaRitmo();
}

/* Compara el cronómetro con los minutos previstos hasta esta diapositiva. */
function marcaRitmo() {
  const u = VP.ui; if (!u || !u.ritmo) return;
  const plan = minutosHasta(S.deck, P.i);
  const total = minutosTotales(S.deck);
  if (!total) { u.ritmo.textContent = ''; u.crono.classList.remove('atras', 'bien'); return; }
  const seg = (VP.corriendo ? (Date.now() - VP.t0) : VP.pausa) / 1000;
  const dif = seg - plan * 60;
  u.ritmo.innerHTML = '';
  u.ritmo.append(h('span', { class: 'vp-plan' }, 'previsto ' + mmss(plan) + ' de ' + mmss(total)));
  if (VP.corriendo || VP.pausa) {
    const atrasado = dif > 30;
    u.ritmo.append(h('span', { class: 'vp-dif ' + (atrasado ? 'mal' : dif < -30 ? 'ok' : '') },
      (dif >= 0 ? '+' : '−') + mmss(Math.abs(dif) / 60)));
    u.crono.classList.toggle('atras', atrasado);
  }
}

/* Abre la ventana; si el navegador la bloquea devuelve false. */
function abrePresentador() {
  if (VP.win && !VP.win.closed) { try { VP.win.focus(); } catch (e) {} return true; }
  let w = null;
  // WebKit needs an explicit URL to dispatch the native new-window request.
  const destino = window.__TAURI__?.core?.invoke ? 'about:blank' : '';
  try { w = window.open(destino, 'erlenPresentador', 'width=1180,height=780,menubar=no,toolbar=no'); } catch (e) { w = null; }
  if (!w || !w.document) return false;
  try {
    const d = w.document;
    d.open(); d.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Erlen · presentador</title></head><body class="vp"></body></html>'); d.close();
    $$('style, link[rel="stylesheet"]').forEach(s => d.head.append(s.cloneNode(true)));
    d.head.append(estiloPresentador());
    d.body.className = 'vp';
    const cont = h('div', { style: 'display:contents' });
    d.body.append(cont);
    d.addEventListener('keydown', e => onPresentKey(e));
    w.addEventListener('resize', () => pintaPresentador());
    w.addEventListener('beforeunload', () => { VP.win = null; VP.ui = null; clearInterval(VP.tick); });
    VP.win = w; VP.doc = d;
    cronoIniciar();
    armaPresentador(d, cont, d.body);
    return true;
  } catch (e) { try { w.close(); } catch (e2) {} return false; }
}

/* Panel dentro de la misma pantalla, para cuando la ventana está bloqueada. */
function panelEnPagina() {
  cierraPanelEnPagina();
  const raiz = $('.present-root'); if (!raiz) return;
  const caja = h('div', { class: 'vp-panel' });
  const cont = h('div', { class: 'vp-panel-in' });
  caja.append(h('div', { class: 'vp-aviso' },
    'El navegador no permitió abrir una segunda ventana, así que el panel se muestra aquí. ',
    h('b', null, 'Ojo: si la pantalla está duplicada, el público también lo ve.'),
    h('button', { class: 'vp-cerrar', onclick: () => { cierraPanelEnPagina(); VP.enPagina = false; } }, 'Ocultar (P)')), cont);
  raiz.append(caja);
  if (!$('#vpEstilo')) { const estilo = estiloPresentador(); estilo.id = 'vpEstilo'; document.head.append(estilo); }
  VP.enPagina = true;
  cronoIniciar();
  armaPresentador(document, cont, cont);
}
function cierraPanelEnPagina() {
  const v = $('.vp-panel'); if (v) v.remove();
  if (VP.ui && VP.ui.doc === document) { VP.ui = null; clearInterval(VP.tick); }
}

let cerrandoPresentador = false;
async function cerrarVentanaPresentador() {
  if (!VP.win || VP.win.closed) return true;
  const invocar = window.__TAURI__?.core?.invoke;
  if (typeof invocar !== 'function') { try { VP.win.close(); return true; } catch (e) { return false; } }
  cerrandoPresentador = true;
  try { await invocar('cerrar_presentador'); return true; }
  catch (e) { toast('No se pudo cerrar la ventana del presentador.', 'warn'); return false; }
  finally { cerrandoPresentador = false; }
}
async function alternaPresentador() {
  if (cerrandoPresentador) return;
  if (VP.win && !VP.win.closed) {
    if (await cerrarVentanaPresentador()) { VP.win = null; VP.ui = null; clearInterval(VP.tick); toast('Vista de presentador cerrada'); }
    return;
  }
  if (VP.enPagina) { cierraPanelEnPagina(); VP.enPagina = false; return; }
  if (abrePresentador()) { VP.enPagina = false; return; }
  // In the desktop app, do not expose private notes on the projected slide
  // if the separate presenter window could not be created.
  if (window.__TAURI__?.core?.invoke) { toast('No se pudo abrir la ventana del presentador.', 'warn'); return; }
  panelEnPagina();
}
function cierraPresentador() {
  clearInterval(VP.tick); VP.tick = null;
  if (VP.win && !VP.win.closed) cerrarVentanaPresentador();
  VP.win = null; VP.doc = null; VP.ui = null;
  cierraPanelEnPagina(); VP.enPagina = false;
  cronoPausar();
}


