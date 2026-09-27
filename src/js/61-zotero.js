/* ==== 61-zotero.js ==== */
'use strict';
/* ================= Zotero =================
   La biblioteca ya la tiene armada en Zotero; volver a teclear cada referencia
   en la presentación es trabajo hecho dos veces. Aquí se conecta directo:

     · Zotero en la nube   → api.zotero.org, con la clave que él mismo crea.
     · Zotero de escritorio → http://127.0.0.1:23119/api, sin clave y sin internet.
     · Por archivo          → lo que exporte de Zotero (CSL JSON, BibTeX o RIS).

   La clave vive solo en su navegador y viaja únicamente a api.zotero.org: ni
   pasa por aquí ni se guarda en la presentación. La vía por archivo existe
   porque hay sitios (el artefacto publicado en claude.ai, por ejemplo) donde la
   política de seguridad de la página bloquea toda conexión a otro dominio. */

const LS_ZOTERO = 'erlen-slides.zotero';
const ZOT_WEB = 'https://api.zotero.org';
const ZOT_LOCAL = 'http://127.0.0.1:23119/api';
const ZOT_CLAVES_URL = 'https://www.zotero.org/settings/keys';

let ZOT_CLAVE_MEM = '';                 /* si prefiere no guardarla en el navegador */
let ZOT_CACHE = { cols: null, sello: '' };

/* ---------- la conexión ---------- */
function zotCfg() {
  const c = lsGet(LS_ZOTERO, null) || {};
  return {
    via: c.via === 'local' ? 'local' : 'web',
    usuario: String(c.usuario || '').trim(),
    clave: String(c.clave || ZOT_CLAVE_MEM || '').trim(),
    recordar: c.recordar !== false
  };
}
function zotGuarda(cfg) {
  ZOT_CLAVE_MEM = cfg.clave || '';
  lsSet(LS_ZOTERO, { via: cfg.via, usuario: cfg.usuario, recordar: !!cfg.recordar,
    clave: cfg.recordar ? cfg.clave : '' });
  ZOT_CACHE = { cols: null, sello: '' };
}
function zotOlvida() {
  ZOT_CLAVE_MEM = '';
  try { localStorage.removeItem(LS_ZOTERO); } catch (e) {}
  ZOT_CACHE = { cols: null, sello: '' };
}
const zotSello = c => c.via + '|' + c.usuario;
const zotBase = c => c.via === 'local' ? ZOT_LOCAL + '/users/0' : ZOT_WEB + '/users/' + encodeURIComponent(c.usuario);
/* La vía local no pide nada; la de la nube necesita número de usuario y clave. */
const zotListo = cfg => {
  const c = cfg || zotCfg();
  return c.via === 'local' || (/^\d{3,12}$/.test(c.usuario) && c.clave.length >= 8);
};
/* ¿Estamos dentro del artefacto de claude.ai? Ahí la página no puede salir a otro dominio. */
function zotEnCaja() { try { return !!(window.claude && typeof window.claude.use === 'function'); } catch (e) { return false; } }

function zotErr(tipo, msg) { const e = new Error(msg); e.tipo = tipo; return e; }
function zotMsgRed(c) {
  if (c.via === 'local') {
    return 'No contesta Zotero en esta computadora. Ábrelo y activa Configuración → Avanzado → ' +
      '«Allow other applications on this computer to communicate with Zotero».';
  }
  return 'No se pudo llegar a api.zotero.org.' + (zotEnCaja()
    ? ' Estás viendo Erlen dentro de claude.ai, y esa página bloquea las conexiones a otros sitios. ' +
      'Descarga el archivo de la app (o ábrela desde el sitio publicado) y la conexión funciona; ' +
      'mientras tanto puedes traer tus referencias por archivo, aquí abajo.'
    : ' Revisa tu conexión, o trae las referencias por archivo aquí abajo.');
}

/* ---------- una petición ---------- */
async function zotPide(ruta, params, cfg) {
  const c = cfg || zotCfg();
  if (c.via === 'web' && !/^\d{3,12}$/.test(c.usuario)) {
    throw zotErr('falta', 'Falta tu número de usuario de Zotero (son solo dígitos).');
  }
  const qs = Object.keys(params || {})
    .filter(k => params[k] !== '' && params[k] !== null && params[k] !== undefined)
    .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
  const cab = { 'Zotero-API-Version': '3' };
  if (c.via === 'web' && c.clave) cab['Zotero-API-Key'] = c.clave;
  let res;
  try {
    res = await fetch(zotBase(c) + ruta + (qs ? '?' + qs : ''),
      { headers: cab, mode: 'cors', credentials: 'omit', cache: 'no-store' });
  } catch (e) { throw zotErr('red', zotMsgRed(c)); }
  if (res.status === 403) {
    throw zotErr('permiso', c.via === 'local'
      ? 'Zotero está abierto pero no deja entrar. Activa «Allow other applications on this computer to communicate with Zotero» en Configuración → Avanzado.'
      : 'Zotero rechazó la clave. Revisa que esté completa y que tenga permiso de lectura sobre tu biblioteca.');
  }
  if (res.status === 404) throw zotErr('nohay', 'Zotero no encontró eso. Si acabas de pegar el número de usuario, revísalo.');
  if (res.status === 429 || res.status === 503) throw zotErr('espera', 'La API de Zotero pide esperar un momento. Inténtalo en unos segundos.');
  if (!res.ok) throw zotErr('http', 'Zotero respondió ' + res.status + '.');
  let datos;
  try { datos = await res.json(); } catch (e) { throw zotErr('http', 'Zotero devolvió algo que no pude leer.'); }
  const num = n => { const v = res.headers.get(n); return v === null ? null : +v; };
  return { datos, total: num('Total-Results'), version: num('Last-Modified-Version') };
}

/* Varias páginas seguidas. La API entrega de cien en cien. */
async function zotTodo(ruta, params, cfg, tope) {
  const lim = 100, max = tope || 300;
  let start = 0, lista = [], mas = false;
  for (;;) {
    const r = await zotPide(ruta, Object.assign({}, params, { limit: lim, start }), cfg);
    const lote = Array.isArray(r.datos) ? r.datos : (r.datos ? [r.datos] : []);
    lista = lista.concat(lote);
    if (lote.length < lim) break;
    start += lim;
    if (lista.length >= max) { mas = true; break; }
  }
  return { lista, mas };
}

/* ---------- colecciones, en árbol ---------- */
async function zotColecciones(cfg) {
  const c = cfg || zotCfg();
  if (ZOT_CACHE.cols && ZOT_CACHE.sello === zotSello(c)) return ZOT_CACHE.cols;
  const r = await zotTodo('/collections', {}, c, 500);
  const nodos = r.lista.map(x => {
    const d = x.data || {};
    return { key: x.key || d.key || '', n: String(d.name || '(sin nombre)'),
      padre: d.parentCollection || '', hijos: [],
      nItems: (x.meta && typeof x.meta.numItems === 'number') ? x.meta.numItems : null };
  }).filter(n => n.key);
  const porKey = {};
  nodos.forEach(n => { porKey[n.key] = n; });
  const raiz = [];
  nodos.forEach(n => { const p = n.padre && porKey[n.padre]; (p ? p.hijos : raiz).push(n); });
  const ordena = a => { a.sort((x, y) => x.n.localeCompare(y.n, 'es')); a.forEach(x => ordena(x.hijos)); };
  ordena(raiz);
  ZOT_CACHE = { cols: raiz, sello: zotSello(c) };
  return raiz;
}

/* ---------- de un ítem de Zotero a una referencia de aquí ---------- */
const ZOT_NO_SIRVEN = new Set(['attachment', 'note', 'annotation']);
const ZOT_ETIQ = {
  journalArticle: 'Artículo', book: 'Libro', bookSection: 'Capítulo', conferencePaper: 'Congreso',
  thesis: 'Tesis', report: 'Informe', preprint: 'Preprint', webpage: 'Página web', patent: 'Patente',
  dataset: 'Datos', computerProgram: 'Programa', manuscript: 'Manuscrito', document: 'Documento',
  magazineArticle: 'Revista', newspaperArticle: 'Periódico', encyclopediaArticle: 'Enciclopedia',
  dictionaryEntry: 'Diccionario', presentation: 'Ponencia', standard: 'Norma', letter: 'Carta',
  interview: 'Entrevista', film: 'Película', videoRecording: 'Video', audioRecording: 'Audio',
  blogPost: 'Entrada de blog', forumPost: 'Foro', map: 'Mapa', bill: 'Iniciativa', case: 'Sentencia',
  statute: 'Ley', email: 'Correo', podcast: 'Pódcast', radioBroadcast: 'Radio', tvBroadcast: 'TV'
};
/* Los que firman de verdad. Si no hay autor, valen los editores. */
const ZOT_FIRMAN = ['author', 'presenter', 'inventor', 'programmer', 'artist', 'director',
  'podcaster', 'cartographer', 'performer', 'sponsor', 'interviewee'];
function zotAutores(cr) {
  const l = Array.isArray(cr) ? cr : [];
  let usa = l.filter(a => a && ZOT_FIRMAN.indexOf(a.creatorType) >= 0);
  if (!usa.length) usa = l.filter(a => a && a.creatorType === 'editor');
  if (!usa.length) usa = l.filter(a => a && (a.name || a.lastName));
  /* Los nombres de una sola pieza (una institución) van entre llaves, como en
     BibTeX, para que la cita corta no se quede con la última palabra. */
  return usa.map(a => a.name
    ? '{' + String(a.name).trim() + '}'
    : [a.lastName, a.firstName].map(x => String(x || '').trim()).filter(Boolean).join(', '))
    .filter(Boolean).join('; ');
}
/* Dónde salió publicado: revista, libro, congreso, universidad, repositorio… */
function zotContenedor(d) {
  const cont = d.publicationTitle || d.bookTitle || d.proceedingsTitle || d.encyclopediaTitle ||
    d.dictionaryTitle || d.websiteTitle || d.blogTitle || d.forumTitle || d.programTitle ||
    d.journalAbbr;
  if (cont) return String(cont);
  const t = d.itemType;
  if (t === 'thesis') return [d.type, d.university].filter(Boolean).join(', ');
  if (t === 'report') return [d.reportType, d.institution].filter(Boolean).join(', ');
  if (t === 'preprint' || t === 'dataset') return String(d.repository || d.publisher || '');
  if (t === 'presentation') return String(d.meetingName || d.presentationType || '');
  if (t === 'patent') return String(d.issuingAuthority || '');
  return String(d.publisher || d.seriesTitle || '');
}
const zotLimpiaDOI = s => String(s || '').trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '');
function zotDOI(d) {
  if (d.DOI) return zotLimpiaDOI(d.DOI);
  const m = String(d.extra || '').match(/(?:^|\n)\s*DOI:\s*(\S+)/i);
  return m ? zotLimpiaDOI(m[1]) : '';
}
function zotAnio(it) {
  const d = it.data || {}, m = it.meta || {};
  const s = String(m.parsedDate || d.date || '');
  const a = s.match(/\b(1[5-9]\d\d|20\d\d|21\d\d)\b/);
  return a ? a[1] : '';
}
/* Devuelve { r, tipo } : la referencia y la etiqueta del tipo, que solo se usa
   para pintar la lista (no viaja en la presentación). */
function zotRef(it) {
  const d = it.data || {};
  return {
    r: {
      id: uid(),
      autores: zotAutores(d.creators),
      titulo: String(d.title || d.caseName || d.subject || '').trim(),
      revista: zotContenedor(d),
      anio: zotAnio(it),
      vol: String(d.volume || ''),
      pag: String(d.pages || '').replace(/--/g, '–'),
      doi: zotDOI(d),
      url: String(d.url || ''),
      zot: String(it.key || d.key || '')
    },
    tipo: ZOT_ETIQ[d.itemType] || 'Documento'
  };
}

async function zotItems(opts, cfg) {
  const o = opts || {};
  const ruta = o.col ? '/collections/' + encodeURIComponent(o.col) + '/items/top' : '/items/top';
  const p = { format: 'json', include: 'data', sort: o.orden || 'dateModified', direction: 'desc' };
  if (o.q) { p.q = o.q; p.qmode = o.todo ? 'everything' : 'titleCreatorYear'; }
  const r = await zotTodo(ruta, p, cfg, o.tope || 200);
  const utiles = r.lista.filter(x => x && x.data && !ZOT_NO_SIRVEN.has(x.data.itemType));
  return { lista: utiles.map(zotRef), mas: r.mas };
}

/* ---------- lo exportado de Zotero: CSL JSON, BibTeX o RIS ---------- */
function cslRef(c) {
  const nom = a => a.literal ? '{' + String(a.literal).trim() + '}'
    : [a.family, a.given].map(x => String(x || '').trim()).filter(Boolean).join(', ');
  const lista = (c.author && c.author.length ? c.author : (c.editor || [])) || [];
  const dp = ((c.issued || {})['date-parts'] || [[]])[0] || [];
  const crudo = String((c.issued || {}).raw || (c.issued || {}).literal || '');
  const anio = dp[0] || (crudo.match(/\b(1[5-9]\d\d|20\d\d|21\d\d)\b/) || [''])[0];
  let cont = c['container-title'] || c['collection-title'] || c.publisher || '';
  if (Array.isArray(cont)) cont = cont[0] || '';
  return { id: uid(), autores: lista.map(nom).filter(Boolean).join('; '),
    titulo: String(c.title || ''), revista: String(cont),
    anio: anio ? String(anio) : '', vol: String(c.volume || ''),
    pag: String(c.page || '').replace(/--/g, '–'),
    doi: zotLimpiaDOI(c.DOI || ''), url: String(c.URL || '') };
}
function refsDesdeCSL(txt) {
  let j;
  try { j = JSON.parse(txt); } catch (e) { throw new Error('Eso no es un JSON válido.'); }
  const arr = Array.isArray(j) ? j
    : (Array.isArray(j.items) ? j.items : ((j.title || j.DOI || j.id) ? [j] : null));
  if (!arr) throw new Error('No encontré una lista de referencias en ese JSON.');
  const out = arr.filter(x => x && typeof x === 'object').map(cslRef)
    .filter(r => r.titulo || r.autores || r.doi);
  if (!out.length) throw new Error('Ese JSON no traía referencias con título ni autores.');
  return out;
}
/* Corta un .bib en entradas contando llaves (o paréntesis, en la forma
   @article(…) que BibTeX también admite). */
function partesBibtex(txt) {
  const s = String(txt), out = [];
  let i = 0;
  while (i < s.length) {
    const a = s.indexOf('@', i);
    if (a < 0) break;
    /* Una arroba suelta (un correo en un comentario) no abre entrada: si se
       contaran llaves desde ahí, se tragaría la entrada siguiente. */
    const cab = s.slice(a, a + 80).match(/^@\w+\s*([{(])/);
    if (!cab) { i = a + 1; continue; }
    const abre = a + cab[0].length - 1, cierra = cab[1] === '(' ? ')' : '}';
    let n = 0, j = abre;
    for (; j < s.length; j++) {
      if (s[j] === cab[1]) n++;
      else if (s[j] === cierra) { n--; if (!n) { j++; break; } }
    }
    out.push(s.slice(a, j));
    i = j > a ? j : a + 1;
  }
  return out;
}
/* Las macros de @string valen para las entradas que las siguen; @comment y
   @preamble no son referencias. */
function refsDesdeBibtexMulti(txt) {
  const p = partesBibtex(txt);
  if (!p.length) throw new Error('No encontré ninguna entrada BibTeX (algo como @article{…}).');
  const out = [], macros = {};
  p.forEach(t => {
    const tipo = (t.match(/^@(\w+)/) || ['', ''])[1].toLowerCase();
    if (tipo === 'string') { try { Object.assign(macros, camposBibtex(t).campos); } catch (e) {} return; }
    if (tipo === 'comment' || tipo === 'preamble') return;
    try { out.push(refDesdeBibtex(t, macros)); } catch (e) {}
  });
  if (!out.length) throw new Error('Encontré entradas pero ninguna traía autores ni título.');
  return out;
}
function risRef(c) {
  const uno = (...tags) => { for (const t of tags) if (c[t] && c[t][0]) return c[t][0]; return ''; };
  const aut = [].concat(c.AU || [], c.A1 || [], (c.AU || c.A1) ? [] : (c.A2 || []));
  const pag = (c.SP && c.SP[0] ? c.SP[0] : '') + (c.EP && c.EP[0] ? '–' + c.EP[0] : '');
  const anio = (uno('PY', 'Y1', 'DA').match(/\b(1[5-9]\d\d|20\d\d|21\d\d)\b/) || [''])[0];
  return { id: uid(), autores: aut.join('; '),
    titulo: uno('TI', 'T1', 'CT', 'BT'), revista: uno('JO', 'JF', 'J2', 'T2', 'PB'),
    anio: anio, vol: uno('VL'), pag: pag.replace(/--/g, '–'),
    doi: zotLimpiaDOI(uno('DO', 'DI')), url: uno('UR', 'L1') };
}
function refsDesdeRIS(txt) {
  const s = String(txt).replace(/\r\n?/g, '\n');
  if (!/^\s*TY\s{2}-/m.test(s)) throw new Error('Eso no parece un archivo RIS.');
  const out = [];
  let cur = null, ult = null;
  s.split('\n').forEach(ln => {
    const m = ln.match(/^([A-Z][A-Z0-9])\s{2}-\s?(.*)$/);
    if (m) {
      const tag = m[1], val = m[2].trim();
      if (tag === 'TY') { cur = {}; ult = null; return; }
      if (tag === 'ER') { if (cur) out.push(risRef(cur)); cur = null; ult = null; return; }
      if (!cur) return;
      (cur[tag] = cur[tag] || []).push(val);
      ult = tag;
    } else if (cur && ult && ln.trim()) {
      const a = cur[ult];
      a[a.length - 1] += ' ' + ln.trim();
    }
  });
  if (cur) out.push(risRef(cur));
  const utiles = out.filter(r => r.titulo || r.autores || r.doi);
  if (!utiles.length) throw new Error('Ese RIS no traía referencias con título ni autores.');
  return utiles;
}
/* Reconoce solo el formato y aplica el lector que toca. */
function refsDesdeTexto(txt) {
  const s = String(txt || '').trim();
  if (!s) throw new Error('No hay nada pegado.');
  if (/^[[{]/.test(s)) return refsDesdeCSL(s);
  if (/@\w+\s*[{(]/.test(s)) return refsDesdeBibtexMulti(s);
  if (/^\s*TY\s{2}-/m.test(s)) return refsDesdeRIS(s);
  if (/^10\.\d{4,9}\//.test(s)) return null;   /* es un DOI: lo atiende el panel de Referencias */
  throw new Error('No reconocí el formato. De Zotero sirve CSL JSON, BibTeX o RIS.');
}

/* ---------- meterlas en la presentación sin repetir ---------- */
const zotLlano = s => String(s || '').toLowerCase().normalize('NFD')
  .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
/* Una referencia se reconoce por tres cosas, y basta con que coincida una: la
   clave de Zotero, el DOI o el título. Así, la que capturaste a mano hace meses
   y la misma traída de Zotero no acaban duplicadas. */
function refClaves(r) {
  const k = [];
  if (r.zot) k.push('z:' + r.zot);
  if (r.doi) k.push('d:' + String(r.doi).toLowerCase().trim());
  const t = zotLlano(r.titulo).slice(0, 70);
  if (t) k.push('t:' + t);
  return k;
}
function indiceRefs(deck) {
  const m = new Map();
  refsDe(deck).forEach(r => refClaves(r).forEach(k => { if (!m.has(k)) m.set(k, r); }));
  return m;
}
function refYaEsta(r, ind) {
  const k = refClaves(r);
  for (let i = 0; i < k.length; i++) { const y = ind.get(k[i]); if (y) return y; }
  return null;
}
const anota = (r, ind) => refClaves(r).forEach(k => { if (!ind.has(k)) ind.set(k, r); });

function zotIngresa(nuevas, citar) {
  const refs = refsDe(S.deck);
  const ind = indiceRefs(S.deck);
  let add = 0, rep = 0;
  const ids = [];
  (nuevas || []).forEach(r => {
    const ya = refYaEsta(r, ind);
    if (ya) {
      rep++; ids.push(ya.id);
      if (r.zot && !ya.zot) ya.zot = r.zot;           /* queda enlazada para poder actualizarla */
      ['autores', 'titulo', 'revista', 'anio', 'vol', 'pag', 'doi', 'url']
        .forEach(c => { if (!ya[c] && r[c]) ya[c] = r[c]; });
      anota(ya, ind);                                  /* con el DOI o la clave que acaba de ganar */
      return;
    }
    refs.push(r); anota(r, ind); add++; ids.push(r.id);
  });
  if (citar) ids.forEach(id => { if (!(curSlide().citas || []).includes(id)) alternaCitaEnDiapositiva(id); });
  commit();
  return { add, rep, ids };
}
/* Volver a preguntarle a Zotero por las referencias que vinieron de ahí. */
async function zotRefresca(cfg) {
  const c = cfg || zotCfg();
  const conClave = refsDe(S.deck).filter(r => r.zot);
  if (!conClave.length) throw new Error('Ninguna referencia de esta presentación vino de Zotero.');
  let tocadas = 0;
  for (let i = 0; i < conClave.length; i += 25) {
    const trozo = conClave.slice(i, i + 25);
    const res = await zotPide('/items', { format: 'json', include: 'data',
      itemKey: trozo.map(r => r.zot).join(','), limit: 50 }, c);
    (Array.isArray(res.datos) ? res.datos : []).forEach(it => {
      const nueva = zotRef(it).r;
      const vieja = conClave.find(r => r.zot === nueva.zot);
      if (!vieja) return;
      let cambio = false;
      ['autores', 'titulo', 'revista', 'anio', 'vol', 'pag', 'doi', 'url'].forEach(k => {
        if (nueva[k] && nueva[k] !== vieja[k]) { vieja[k] = nueva[k]; cambio = true; }
      });
      if (cambio) tocadas++;
    });
  }
  if (tocadas) commit();
  return { revisadas: conClave.length, tocadas };
}


