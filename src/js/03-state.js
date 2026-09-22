/* ==== 03-state.js ==== */
'use strict';
/* ================= estado, historial y guardado ================= */
const LS_AUTO = 'erlen-slides.autosave';
const LS_DECKS = 'erlen-slides.decks';
const LS_PREFS = 'erlen-slides.prefs';
const LS_ESTILOS = 'erlen-slides.estilos';

/* ---------- preferencias de la app (no viajan en el .json del proyecto) ---------- */
/* barras: 'arriba' = cinta (de fábrica), 'lado' = panel a la derecha. Si el
   usuario eligió el panel, su preferencia guardada manda sobre esta. */
const PREFS_DEF = { tema: 'auto', estiloPorOmision: null, barras: 'arriba' };
function cargaPrefs() { return Object.assign({}, PREFS_DEF, lsGet(LS_PREFS, {}) || {}); }
function guardaPrefs() { lsSet(LS_PREFS, S.prefs); }
/* auto = la del sistema; claro/oscuro fuerzan el modo. */
function aplicaTemaApp() {
  const t = (S.prefs || PREFS_DEF).tema;
  const raiz = document.documentElement;
  if (t === 'claro') raiz.dataset.theme = 'light';
  else if (t === 'oscuro') raiz.dataset.theme = 'dark';
  else delete raiz.dataset.theme;
  const btn = $('#temaBtn');
  if (btn) {
    btn.textContent = t === 'claro' ? '☀' : t === 'oscuro' ? '☾' : '◐';
    btn.title = 'Apariencia del editor: ' + (t === 'claro' ? 'clara' : t === 'oscuro' ? 'oscura' : 'la del sistema');
  }
}
function cambiaTemaApp(t) { S.prefs.tema = t; guardaPrefs(); aplicaTemaApp(); }

const S = {
  prefs: null,
  archivo: null,           // manija del .json del disco, si el usuario eligió uno
  archivoNombre: null,
  sel: new Set(),          // diapositivas marcadas en la tira
  plegadas: new Set(),     // secciones plegadas
  deck: null,
  cur: 0,                 // índice de diapositiva actual
  selBlock: null,         // id de bloque seleccionado
  tab: 'insert',
  zoom: null,             // null = ajustar
  editingRaw: false,
  undo: [], redo: [],
  deckName: null          // nombre bajo el que está guardada (Archivo)
};

const lsGet = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { window.ErlenDiagnostico?.reportar('guardar-local'); return false; } };

const curSlide = () => S.deck.slides[S.cur];
/* Devuelve (creándolo si hace falta) el arreglo de bloques de una zona. */
function zona(sl, i) {
  const k = CLAVES_ZONA[clamp(i, 0, CLAVES_ZONA.length - 1)];
  if (!sl[k]) sl[k] = [];
  return sl[k];
}
/* Todas las zonas con contenido de una diapositiva. */
function zonas(sl) { return CLAVES_ZONA.map(k => sl[k] || []); }

function findBlock(id, deck = S.deck) {
  for (const sl of deck.slides) {
    for (const arr of zonas(sl)) {
      const i = arr.findIndex(b => b.id === id);
      if (i >= 0) return { slide: sl, arr, i, block: arr[i] };
    }
  }
  return null;
}

/* secciones + numeración */
function sectionsOf(deck) {
  const out = [];
  deck.slides.forEach((sl, i) => { if (sl.layout === 'section') out.push({ i, name: sl.title || 'Sección' }); });
  return out;
}
function countersFor(deck, idx) {
  let fig = 0, tab = 0, secN = 0, secName = '';
  for (let i = 0; i < idx; i++) {
    const sl = deck.slides[i];
    if (sl.layout === 'section') { secN++; secName = sl.title || ''; }
    for (const arr of zonas(sl)) for (const b of arr) {
      if (b.type === 'image' || b.type === 'chart' || b.type === 'func' || b.type === 'video' || b.type === 'smart' || b.type === 'estruct' || b.type === 'montaje' || b.type === 'geo') fig++;
      if (b.type === 'table') tab++;
    }
  }
  const sl = deck.slides[idx];
  if (sl && sl.layout === 'section') { secN++; secName = sl.title || ''; }
  return { fig, tab, secN, secName, secTotal: sectionsOf(deck).length };
}

/* ---------- almacen de medios ----------
   Las imagenes y los videos viajan en base64 y pesan mucho. Si cada paso del
   historial guardara una copia completa, veinte ediciones con un video de
   10 MB dejarian la pestana sin memoria. Aqui cada archivo se guarda una sola
   vez y las copias del historial conservan nada mas una referencia. */
const MEDIOS = new Map();
const MARCA = '#medio:';
const TOPE_PASOS = 150;                 // pasos de deshacer
const TOPE_MEDIOS = 64 * 1024 * 1024;   // caracteres de medios retenidos

/* Clave por longitud exacta + dos huellas de tres muestras del archivo:
   basta para distinguirlos y no recorre 10 MB en cada cambio. */
function claveMedio(s) {
  const n = s.length, mitad = n >> 1;
  const trozos = n <= 12288 ? [s]
    : [s.slice(0, 4096), s.slice(mitad - 2048, mitad + 2048), s.slice(n - 4096)];
  let a = 0x811c9dc5, b = 0x01000193;
  for (const t of trozos) for (let i = 0; i < t.length; i++) {
    const c = t.charCodeAt(i);
    a ^= c; a = (a * 16777619) >>> 0;
    b = (b + c * 31 + ((b << 5) >>> 0)) >>> 0;
  }
  return n.toString(36) + '-' + a.toString(36) + b.toString(36);
}
const esMedio = v => typeof v === 'string' && v.length > 1024 && v.slice(0, 5) === 'data:';

/* Copia ligera del deck: los medios se sustituyen por su referencia. */
function snapDeck(deck) {
  return JSON.stringify(deck, function(k, v) {
    const fuente = this && this.v === 1 && ['molecula','3d','datos'].includes(this.tipo) && ['mol','texto'].includes(k) && typeof v === 'string' && v.length > 1024;
    if (!esMedio(v) && !fuente) return v;
    const base = claveMedio(v); let c = base, intento = 0;
    // Dos fuentes distintas pueden coincidir en las muestras de la huella.
    while (MEDIOS.has(c) && MEDIOS.get(c) !== v) c = base + '-' + (++intento).toString(36);
    if (!MEDIOS.has(c)) MEDIOS.set(c, v);
    return MARCA + c;
  });
}
/* Reconstruye el deck devolviendo cada archivo a su lugar. */
function abreSnap(s) {
  return JSON.parse(s, (k, v) => {
    if (typeof v !== 'string' || v.lastIndexOf(MARCA, 0) !== 0) return v;
    const c = v.slice(MARCA.length);
    return MEDIOS.has(c) ? MEDIOS.get(c) : v;
  });
}
function pesoMedios() { let n = 0; for (const v of MEDIOS.values()) n += v.length; return n; }
/* Suelta los archivos que ya no menciona ningun paso del historial. */
function podarMedios() {
  const vivos = new Set(), rx = /#medio:([0-9a-z-]+)/g;
  const mira = s => { let m; rx.lastIndex = 0; while ((m = rx.exec(s))) vivos.add(m[1]); };
  S.undo.forEach(mira); S.redo.forEach(mira);
  if (S._snap) mira(S._snap);
  for (const k of MEDIOS.keys()) if (!vivos.has(k)) MEDIOS.delete(k);
}
function recortaHistorial() {
  while (S.undo.length > TOPE_PASOS) S.undo.shift();
  podarMedios();
  let g = 0;
  while (pesoMedios() > TOPE_MEDIOS && S.undo.length > 8 && g++ < 500) { S.undo.shift(); podarMedios(); }
}
/* Cuanto ocupa el historial completo, en MB. Se usa en Ayuda. */
function memoriaHistorial() {
  let n = 0;
  S.undo.forEach(s => n += s.length); S.redo.forEach(s => n += s.length);
  return (n + pesoMedios()) / 1048576;
}

/* ---------- historial ---------- */
const saveInd = deb(() => {
  const el = $('#saveInd');
  recActual();
  const ok = lsSet(LS_AUTO, { deck: S.deck, deckName: S.deckName, respaldoId:S.respaldoId, when: Date.now(), sitio: marcaSitio() });
  if (el) { el.textContent = ok ? 'Guardado aquí ✓' : 'Sin guardar'; el.classList.toggle('on', ok); }
  if (S.deckName) {
    const store = decksStore();
    Object.defineProperty(store, S.deckName, {value:{deck:S.deck,when:Date.now()},enumerable:true,writable:true,configurable:true});
    if (!lsSet(LS_DECKS,store)) toast('No se pudo actualizar la copia con nombre. Descarga un respaldo.', 'warn');
  }
  if (S.archivo) guardaArchivo();
  if (typeof nubeSincroniza === 'function') nubeSincroniza();
  if (!ok && !S._avisoLS) {
    S._avisoLS = true;
    toast('La presentacion ya no cabe en el guardado autom\u00e1tico del navegador (suele ser por los videos). Guarda el proyecto .json desde Exportar.', 'warn');
  }
}, 700);

function commit(opts) {
  /* La bibliografía se pone al día antes de guardar el paso, para que deshacer
     devuelva la presentación entera y no la deje a medias. */
  if (typeof sincronizaBib === 'function') sincronizaBib(S.deck);
  S.undo.push(S._snap || snapDeck(S.deck));
  S.redo.length = 0;
  S._snap = snapDeck(S.deck);
  recortaHistorial();
  const el = $('#saveInd'); if (el) { el.textContent = 'Guardando…'; el.classList.remove('on'); }
  saveInd();
  renderAll(opts);
  if (typeof tutorObserva === 'function') tutorObserva();
}
function snapNow() { S._snap = snapDeck(S.deck); }
function doUndo() {
  if (!S.undo.length) return;
  recActual(true);
  if (typeof invalidaCitas === 'function') invalidaCitas();
  S.redo.push(S._snap || snapDeck(S.deck));
  S.deck = abreSnap(S.undo.pop());
  S._snap = snapDeck(S.deck);
  S.cur = clamp(S.cur, 0, S.deck.slides.length - 1); S.selBlock = null;
  saveInd(); renderAll();
}
function doRedo() {
  if (!S.redo.length) return;
  recActual(true);
  if (typeof invalidaCitas === 'function') invalidaCitas();
  S.undo.push(S._snap || snapDeck(S.deck));
  S.deck = abreSnap(S.redo.pop());
  S._snap = snapDeck(S.deck);
  S.cur = clamp(S.cur, 0, S.deck.slides.length - 1); S.selBlock = null;
  saveInd(); renderAll();
}

/* ---------- operaciones ---------- */
function addSlide(layout, at) {
  if (typeof flushEdicion === 'function') flushEdicion();
  const sl = { id: uid(), layout, title: layout === 'toc' ? 'Contenido' : layout === 'section' ? 'Nueva sección' : layout === 'title' ? '' : 'Título de la diapositiva', blocks: [] };
  prepararZonas(sl, layout);
  /* Sin texto de relleno: una diapositiva nueva enseña solo el recuadro de cada
     zona, y ahí va lo que se inserte. Lo que había que explicar del diseño lo
     dice el propio recuadro. */
  const i = at == null ? S.cur + 1 : at;
  S.deck.slides.splice(i, 0, sl);
  S.cur = i; S.selBlock = null;
  SESION.nuevas++;
  commit();
}
function dupSlide(i) {
  const c = deepCopy(S.deck.slides[i]); c.id = uid();
  for (const arr of zonas(c)) arr.forEach(b => b.id = uid());
  S.deck.slides.splice(i + 1, 0, c); S.cur = i + 1; S.selBlock = null; SESION.nuevas++; commit();
}
function delSlide(i) {
  if (S.deck.slides.length <= 1) { toast('La presentación necesita al menos una diapositiva'); return; }
  const nom = (S.deck.slides[i].title || '').trim();
  S.deck.slides.splice(i, 1);
  S.cur = clamp(S.cur, 0, S.deck.slides.length - 1); S.selBlock = null; SESION.borradas++; commit();
  toast('Diapositiva eliminada' + (nom ? ' · ' + nom : ''), null, { t: 'Deshacer', fn: doUndo });
}
function moveSlide(from, to) {
  if (to < 0 || to >= S.deck.slides.length || from === to) return;
  const [sl] = S.deck.slides.splice(from, 1);
  S.deck.slides.splice(to, 0, sl);
  S.cur = to; commit();
}
/* Crea las zonas y los encabezados que pide el diseño. */
function prepararZonas(sl, layout) {
  const n = zonasDe(layout);
  for (let i = 0; i < n; i++) zona(sl, i);
  if (ZT_DEF[layout]) {
    sl.zt = sl.zt || [];
    ZT_DEF[layout].forEach((t, i) => { if (sl.zt[i] == null) sl.zt[i] = t; });
  }
  if ((layout === 'twocol' || layout === 'barra') && sl.split == null) sl.split = layout === 'barra' ? 30 : 50;
  if (layout === 'flujo' && sl.cols == null) sl.cols = 2;
}

function addBlockToSlide(type, col) {
  const _r = addBlockToSlide_(type, col);
  if (typeof ensena === 'function') {
    if (['image', 'chart', 'func', 'galeria', 'video'].includes(type)) ensena('pie', 'Acabas de poner una figura');
    else if (type === 'bullets') ensena('vinetas', 'Una lista nueva');
  }
  return _r;
}
function addBlockToSlide_(type, col) {
  if (typeof flushEdicion === 'function') flushEdicion();
  let sl = curSlide();
  let n = zonasDe(sl.layout);
  /* Desde la portada, el índice o una sección no hay dónde poner el bloque:
     en vez de decir que no, se abre una diapositiva de contenido justo después
     y el bloque va ahí. Es lo que uno espera al pulsar «Texto» nada más abrir. */
  if (!n) {
    addSlide('content');
    sl = curSlide(); n = zonasDe(sl.layout);
    zona(sl, 0).length = 0;
    toast('Nueva diapositiva de contenido para el bloque');
  }
  const b = newBlock(type);
  const arr = zona(sl, clamp((col || 1) - 1, 0, n - 1));
  arr.push(b);
  S.selBlock = b.id;
  commit();
  if (type === 'math') openEqEditor(b);
  else if (type === 'chem') openChemEditor(b);
  else if (type === 'image') pickImage(b);
  else if (type === 'chart') openChartEditor(b);
  else if (type === 'func') openFuncEditor(b);
  else if (type === 'video') pickVideo(b);
  else if (type === 'smart') openSmartEditor(b);
  else if (type === 'estruct') openEstructura(b);
  else if (type === 'montaje') { b.mont = montajeEjemplo(); openMontaje(b); }
  else if (type === 'geo') { b.geo = geoPorOmision('triangulo'); openGeometria(b); }
  else if (type === 'galeria') openGaleria(b);
}
function delBlock(id) {
  const f = findBlock(id); if (!f) return;
  const tipo = (BLOCK_DEFS.find(b => b.id === f.block.type) || {}).name || 'Bloque';
  f.arr.splice(f.i, 1);
  if (S.selBlock === id) S.selBlock = null;
  commit();
  toast(tipo + ' eliminado', null, { t: 'Deshacer', fn: doUndo });
}
function moveBlock(id, dir) {
  const f = findBlock(id); if (!f) return;
  const j = f.i + dir;
  if (j < 0 || j >= f.arr.length) return;
  f.arr.splice(f.i, 1); f.arr.splice(j, 0, f.block);
  commit();
}
function dupBlock(id) {
  const f = findBlock(id); if (!f) return;
  const c = deepCopy(f.block); c.id = uid();
  f.arr.splice(f.i + 1, 0, c); S.selBlock = c.id; commit();
}

/* Manda un bloque a otra diapositiva o a otra zona de la misma. */
function moveBlockToSlide(id, idxDest, zonaDest, posDest) {
  const f = findBlock(id); if (!f) return false;
  const dest = S.deck.slides[idxDest]; if (!dest) return false;
  const nz = zonasDe(dest.layout);
  if (!nz) { toast('Esa diapositiva no admite bloques'); return false; }
  prepararZonas(dest, dest.layout);
  const arr = zona(dest, clamp(zonaDest || 0, 0, nz - 1));
  if (arr === f.arr) {
    const desde = f.i;
    let hasta = posDest == null ? arr.length - 1 : clamp(posDest, 0, arr.length);
    if (hasta > desde) hasta--;
    if (hasta === desde) return false;
    arr.splice(desde, 1); arr.splice(hasta, 0, f.block);
  } else {
    f.arr.splice(f.i, 1);
    const hasta = posDest == null ? arr.length : clamp(posDest, 0, arr.length);
    arr.splice(hasta, 0, f.block);
  }
  S.cur = idxDest; S.selBlock = id;
  commit();
  return true;
}
