/* ==== 35-sesion.js ==== */
'use strict';
/* ================= sesión: retomar, contar y cerrar =================
   Tres cosas de la revisión de evidencia:
   · el 67 % de la gente retoma sola lo que dejó a medias (efecto Ovsiankina),
     así que lo único que hay que hacer es no cobrarle el regreso;
   · de una sesión se recuerdan el pico y el final, no la duración, así que
     el cierre merece una línea;
   · nadie lee la ayuda, así que el atajo se enseña en el momento de usar
     el camino lento. */

const SESION = { t0: Date.now(), nuevas: 0, borradas: 0, exportes: 0, avisos0: null, ensayos: 0 };

/* ---------- 01 · retomar exactamente donde ibas ---------- */
function marcaSitio() {
  return { i: S.cur, bloque: S.selBlock || null, zoom: S.zoom || null, tab: S.tab };
}
function aplicaSitio(sitio) {
  if (!sitio || !S.deck) return false;
  const i = clamp(+sitio.i || 0, 0, S.deck.slides.length - 1);
  if (!i && !sitio.bloque) return false;
  S.cur = i;
  if (sitio.zoom) S.zoom = sitio.zoom;
  if (sitio.bloque && findBlock(sitio.bloque)) S.selBlock = sitio.bloque;
  if (sitio.tab && sitio.tab !== 'bloque') S.tab = sitio.tab;
  return true;
}
/* Aviso discreto y con salida: «no era ahí» devuelve a la primera. */
function avisaRetomado(sitio, cuando) {
  const sl = S.deck.slides[S.cur];
  const tit = (sl.title || '').trim() || (LAY[sl.layout] || {}).name || '';
  const dias = cuando ? Math.floor((Date.now() - cuando) / 86400000) : 0;
  const desde = dias >= 1 ? (dias === 1 ? 'ayer' : 'hace ' + dias + ' días') : null;
  toast('Seguías en la diapositiva ' + (S.cur + 1) + (tit ? ' · ' + tit : '') + (desde ? ' · ' + desde : ''),
    null, { t: 'Ir a la primera', fn: () => { S.cur = 0; S.selBlock = null; renderAll(); } });
}

/* ---------- 05 · resumen de cierre ---------- */
function avisosAhora() {
  try { return revisaMazo().fallos.length; } catch (e) { return null; }
}
function arrancaSesion() { SESION.avisos0 = avisosAhora(); }

function piezasResumen() {
  const p = [];
  if (SESION.nuevas) p.push(SESION.nuevas + (SESION.nuevas === 1 ? ' diapositiva nueva' : ' diapositivas nuevas'));
  if (SESION.borradas) p.push(SESION.borradas + (SESION.borradas === 1 ? ' eliminada' : ' eliminadas'));
  const ahora = avisosAhora();
  if (SESION.avisos0 != null && ahora != null && ahora < SESION.avisos0) {
    const d = SESION.avisos0 - ahora;
    p.push(d + (d === 1 ? ' aviso resuelto' : ' avisos resueltos'));
  }
  if (SESION.ensayos) p.push(SESION.ensayos === 1 ? 'un ensayo cronometrado' : SESION.ensayos + ' ensayos');
  if (SESION.exportes) p.push(SESION.exportes === 1 ? 'una exportación' : SESION.exportes + ' exportaciones');
  return p;
}
function lineaResumen() {
  const p = piezasResumen();
  const donde = S.archivoNombre ? 'guardado en ' + S.archivoNombre
    : S.deckName ? 'guardado como «' + S.deckName + '»'
    : 'guardado en este navegador';
  if (!p.length) return 'Sin cambios en esta sesión · ' + donde;
  return p.join(' · ') + ' · ' + donde;
}
const minutosSesion = () => Math.round((Date.now() - SESION.t0) / 60000);

/* Se muestra al exportar, que es el final natural de la sesión. */
function cierraSesion(motivo) {
  const t = minutosSesion();
  const linea = lineaResumen();
  guardaUltimaSesion(linea);
  toast((motivo ? motivo + ' · ' : '') + linea + (t >= 3 ? ' · ' + t + ' min de trabajo' : ''));
}
const LS_SESION = 'tabula.sesion';
function guardaUltimaSesion(linea) { lsSet(LS_SESION, { linea, when: Date.now() }); }
function ultimaSesion() { return lsGet(LS_SESION, null); }

/* ---------- 16 · el atajo aparece cuando usas el menú ---------- */
/* Sin esto, la gente se queda con el método de principiante: en el estudio
   de Cockburn ninguno usó los atajos aunque el 35 % sabía que existían. */
const VISTOS = new Set();
/* Reconoce «(Ctrl+K)», «Ctrl+S», «F5» dentro de un título o un subtítulo. */
const RE_ATAJO = /\(?\b((?:Ctrl|Cmd|Alt|May[úu]s|⇧)\s*\+\s*(?:⇧\s*\+\s*)?[A-Za-z0-9]|F\d{1,2})\b\)?/;
function leeAtajo(txt) {
  const m = RE_ATAJO.exec(String(txt || ''));
  return m ? m[1].replace(/\s+/g, '') : null;
}
/* Un solo oyente para toda la app: cualquier botón cuyo título lleve su atajo
   lo enseña al usarse. Así no hay que tocar cada botón uno por uno. */
function initPistas() {
  document.addEventListener('click', e => {
    const b = e.target.closest('button[title]');
    if (!b || P.on) return;
    const at = leeAtajo(b.title);
    if (!at) return;
    const nombre = b.title.replace(RE_ATAJO, '').replace(/[()\s·]+$/, '').trim();
    setTimeout(() => pistaAtajo(at, nombre), 260);
  }, true);
}
function pistaAtajo(atajo, accion) {
  if (!atajo) return;
  const clave = atajo + '|' + (accion || '');
  if (VISTOS.has(clave)) return;          // una vez por sesión, no es un regaño
  VISTOS.add(clave);
  const t = toast((accion ? accion + ' · ' : '') + 'atajo: ' + atajo);
  if (t) t.classList.add('toast-pista');
}


