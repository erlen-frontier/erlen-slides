/* ==== 44-historia.js ==== */
'use strict';
/* ================= línea de tiempo y bitácora del documento =================
   Control sobre el objeto (la primera ruta de la propiedad psicológica) y
   progreso visible (la palanca más fuerte sobre el ánimo de trabajar). El
   deshacer muere al cerrar la pestaña; esto no. */

const LS_HISTORIA = 'erlen-slides.historia';
const TOPE_HISTORIA = 10;
const TOPE_HISTORIA_BYTES = 4 * 1024 * 1024;

const diaDe = t => new Date(t).toISOString().slice(0, 10);
function leeHistoria() { const h = lsGet(LS_HISTORIA, []); return Array.isArray(h) ? h : []; }

/* Una entrada por día y por presentación: no interesa cada guardado, interesa
   cómo estaba la presentación ese día. */
function guardaHistoria(motivo) {
  if (!S.deck || !S.deck.slides.length) return false;
  const clave = S.deckName || S.deck.meta.title || 'sin-nombre';
  let hist = leeHistoria();
  const hoy = diaDe(Date.now());
  const entrada = {
    dia: hoy, when: Date.now(), clave, motivo: motivo || '',
    n: S.deck.slides.length,
    avisos: (() => { try { return revisaMazo().fallos.length; } catch (e) { return null; } })(),
    pendientes: cuentaPendientes(),
    minutos: minutosTotales(S.deck),
    deck: S.deck
  };
  hist = hist.filter(x => !(x.dia === hoy && x.clave === clave));
  hist.push(entrada);
  hist.sort((a, b) => a.when - b.when);
  /* Se recorta hasta que quepa: primero por número, después por peso. */
  while (hist.length > TOPE_HISTORIA) hist.shift();
  let ok = lsSet(LS_HISTORIA, hist);
  while (!ok && hist.length > 1) { hist.shift(); ok = lsSet(LS_HISTORIA, hist); }
  if (!ok) { try { localStorage.removeItem(LS_HISTORIA); } catch (e) {} }
  return ok;
}
function pesoHistoria() {
  try { return (localStorage.getItem(LS_HISTORIA) || '').length / 1048576; } catch (e) { return 0; }
}

function restauraHistoria(i) {
  const hist = leeHistoria();
  const e = hist[i];
  if (!e || !e.deck) return;
  if (!confirm('Se va a abrir la presentación como estaba el ' + fmtDia(e.dia) + '. La versión de ahora queda en el autoguardado. ¿Continuar?')) return;
  guardaHistoria('antes de restaurar');
  if (cargaSegura(e.deck, S.deckName)) { closeModal(); toast('Restaurada la versión del ' + fmtDia(e.dia), null, { t: 'Deshacer', fn: doUndo }); }
}
/* Traer una sola diapositiva de una versión anterior, sin tirar el resto. */
function traeDiapositiva(i, k) {
  const e = leeHistoria()[i];
  if (!e || !e.deck || !e.deck.slides[k]) return;
  const sl = copiaDiapositiva(e.deck.slides[k]);
  S.deck.slides.splice(S.cur + 1, 0, sl);
  S.cur = S.cur + 1; SESION.nuevas++;
  commit(); closeModal();
  toast('Diapositiva traída del ' + fmtDia(e.dia), null, { t: 'Deshacer', fn: doUndo });
}
function fmtDia(d) {
  const [a, m, x] = String(d).split('-');
  const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return +x + ' ' + MES[+m - 1] + ' ' + a;
}

/* ---------- bitácora ---------- */
function openBitacora() {
  const cuerpo = h('div');
  /* Se lee una sola vez: leeHistoria() vuelve a parsear el JSON en cada
     llamada, así que comparar objetos entre dos lecturas nunca casa. */
  const todo = leeHistoria();
  const clave = S.deckName || S.deck.meta.title || 'sin-nombre';
  const hist = todo.map((x, i) => ({ e: x, i })).filter(x => x.e.clave === clave);
  const ult = ultimaSesion();

  const hoy = {
    n: S.deck.slides.length,
    avisos: (() => { try { return revisaMazo().fallos.length; } catch (e) { return null; } })(),
    pendientes: cuentaPendientes(),
    minutos: minutosTotales(S.deck)
  };
  cuerpo.append(h('div', { class: 'cifras-min' },
    h('div', null, h('b', null, String(hoy.n)), h('span', null, hoy.n === 1 ? 'diapositiva' : 'diapositivas')),
    h('div', null, h('b', null, hoy.avisos == null ? '—' : String(hoy.avisos)), h('span', null, 'por revisar')),
    h('div', null, h('b', null, String(hoy.pendientes)), h('span', null, 'pendientes')),
    h('div', null, h('b', null, hoy.minutos ? mmss(hoy.minutos) : '—'), h('span', null, 'previstos'))));

  if (SESION.nuevas || SESION.borradas || SESION.exportes || SESION.ensayos) {
    cuerpo.append(h('div', { class: 'bit-hoy' },
      h('span', { class: 'panel-label' }, 'En esta sesión'),
      h('p', null, lineaResumen() + ' · ' + minutosSesion() + ' min de trabajo')));
  } else if (ult) {
    cuerpo.append(h('div', { class: 'bit-hoy' },
      h('span', { class: 'panel-label' }, 'La última vez'),
      h('p', null, ult.linea)));
  }

  cuerpo.append(h('span', { class: 'panel-label', style: 'display:block;margin:16px 0 8px' }, 'Cómo ha ido creciendo'));
  if (!hist.length) {
    cuerpo.append(h('div', { class: 'vacio-caja' },
      h('span', { class: 'vc-ic' }, '◷'),
      h('b', null, 'Todavía no hay historial'),
      h('p', null, 'Cada día que trabajes en esta presentación se guarda una copia con la que puedes comparar, y de la que puedes rescatar una diapositiva suelta o volver entera.'),
      h('div', { class: 'vc-vias' },
        h('button', { class: 'btn btn-sm btn-pri', onclick: () => { guardaHistoria('a mano'); closeModal(); openBitacora(); } },
          'Guardar la copia de hoy'))));
  } else {
    const maxN = Math.max(...hist.map(x => x.e.n), hoy.n);
    hist.slice().reverse().forEach(({ e, i: idx }) => {
      const fila = h('div', { class: 'bit-fila' },
        h('span', { class: 'bit-dia' }, fmtDia(e.dia)),
        h('span', { class: 'bit-barra' }, h('i', { style: `width:${(e.n / maxN * 100).toFixed(1)}%` })),
        h('span', { class: 'bit-n' }, e.n + (e.n === 1 ? ' diap.' : ' diap.')),
        h('span', { class: 'bit-av' }, e.avisos == null ? '' : e.avisos + ' av.'),
        h('button', { class: 'btn btn-sm', title: 'Ver y rescatar diapositivas de ese día', onclick: () => openVersion(idx) }, 'Ver'));
      cuerpo.append(fila);
    });
    cuerpo.append(h('p', { class: 'hint' },
      hist.length + (hist.length === 1 ? ' copia guardada' : ' copias guardadas') +
      ' · ocupan ' + pesoHistoria().toFixed(1) + ' MB en este navegador. Se conservan las ' + TOPE_HISTORIA + ' más recientes.'));
  }
  openModal({
    title: 'Bitácora del documento', size: 'modal-sm', body: cuerpo,
    foot: [h('button', { class: 'btn', onclick: () => { guardaHistoria('a mano'); closeModal(); openBitacora(); } }, 'Guardar copia de hoy'),
      h('button', { class: 'btn btn-pri', onclick: closeModal }, 'Listo')]
  });
}

/* Ver una versión anterior: miniaturas, con la opción de traerse una sola. */
function openVersion(i) {
  const e = leeHistoria()[i];
  if (!e || !e.deck) return;
  const cuerpo = h('div');
  cuerpo.append(h('p', { class: 'hint', style: 'margin-top:0' },
    'Así estaba el ' + fmtDia(e.dia) + ': ' + e.deck.slides.length +
    ' diapositivas. Puedes traerte una sola a la presentación de ahora, o volver entera a este día.'));
  const rej = h('div', { class: 'ver-rej' });
  const [W, H] = slideDims(e.deck);
  const k = 150 / W;
  const wb = $('#workbench'); const antes = wb.innerHTML;
  e.deck.slides.forEach((sl, kk) => {
    const clip = h('div', { class: 'ver-clip', style: `width:150px;height:${Math.round(H * k)}px` });
    let mini = null;
    try { mini = renderSlide(e.deck, kk, 'thumb', 99); } catch (err) { mini = h('div'); }
    mini.style.transform = `scale(${k})`; mini.style.transformOrigin = 'top left';
    clip.append(mini);
    rej.append(h('button', { class: 'ver-cel', title: 'Traer esta diapositiva a la presentación de ahora',
      onclick: () => traeDiapositiva(i, kk) }, clip, h('span', null, (kk + 1) + ' · ' + ((sl.title || '').trim() || (LAY[sl.layout] || {}).name || ''))));
  });
  wb.innerHTML = antes;
  cuerpo.append(rej);
  openModal({
    title: 'Versión del ' + fmtDia(e.dia), size: 'modal-lg', body: cuerpo,
    foot: [h('button', { class: 'btn btn-danger', onclick: () => restauraHistoria(i) }, 'Volver entera a este día'),
      h('button', { class: 'btn btn-pri', onclick: () => { closeModal(); openBitacora(); } }, 'Atrás')]
  });
}

/* La copia del día se guarda al salir, que es cuando ya está el trabajo hecho. */
function initHistoria() {
  window.addEventListener('beforeunload', () => { try { guardaHistoria('cierre'); } catch (e) {} });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && (SESION.nuevas || SESION.borradas)) {
      try { guardaHistoria('en segundo plano'); } catch (e) {}
    }
  });
}

