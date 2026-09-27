/* ==== 57-citas.js ==== */
'use strict';
/* ================= referencias y citas =================
   Es el hueco que señala «Ten simple rules for effective presentation slides»:
   la gente deja las citas para el final y se le pierde de dónde salió cada
   figura. Aquí se ponen en el momento: pegas un DOI o un BibTeX, la referencia
   queda guardada en la presentación, la cita corta aparece al pie de la
   diapositiva y al exportar sale una bibliografía de verdad.

   La numeración es la de un artículo: por orden de primera aparición. */

function refsDe(deck) {
  const d = deck || S.deck;
  if (!Array.isArray(d.meta.refs)) d.meta.refs = [];
  return d.meta.refs;
}
function refPorId(id, deck) { return refsDe(deck).find(r => r.id === id) || null; }

/* ---------- estilos de cita ----------
   La marca que se ve —[1], el volado de la ACS, (Kojima et al., 2009)— nunca se
   teclea: se calcula cada vez a partir de dónde está citada la referencia. Por
   eso al insertar una cita nueva a la mitad de la charla todo se renumera solo,
   y al cambiar de estilo se reescribe la presentación entera. */
const ESTILOS_CITA = [
  { id: 'num', n: 'Numérico', ej: '[1]',
    d: 'Entre corchetes y por orden de aparición, como en IEEE y en buena parte de las revistas de materiales.' },
  { id: 'sup', n: 'Superíndice', ej: '¹',
    d: 'El número volado, sin corchetes: es el de las revistas de la ACS.' },
  { id: 'an', n: 'Autor-año', ej: '(Kojima et al., 2009)',
    d: 'Estilo APA o Harvard. La bibliografía va en orden alfabético, no de aparición.' },
  { id: 'autnum', n: 'Autor-número', ej: 'Kojima et al. [1]',
    d: 'El apellido junto al número: quien escucha sigue la fuente sin buscarla en la lista.' }
];
const EK_CITA = {};
ESTILOS_CITA.forEach(e => { EK_CITA[e.id] = e; });
const estiloCita = deck => {
  const e = ((deck || S.deck).meta || {}).citEstilo;
  return EK_CITA[e] ? e : 'num';
};

/* ---------- la clave con que se cita ----------
   Como en BibTeX: «kojima2009». Es estable, se puede teclear a mano y sobrevive
   a que se reordene la presentación. */
const soloLlano = s => String(s || '').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
function claveBase(r) {
  const A = apellidos(r.autores);
  const raiz = soloLlano(A[0] || '').slice(0, 14) || soloLlano(r.titulo).slice(0, 14) || 'ref';
  return raiz + (String(r.anio || '').match(/\d{4}/) || [''])[0];
}
function aseguraClaves(deck) {
  const d = deck || S.deck;
  const usadas = new Set();
  const refs = refsDe(d);
  refs.forEach(r => {
    if (!r.clave) return;
    if (usadas.has(r.clave)) r.clave = ''; else usadas.add(r.clave);
  });
  refs.forEach(r => {
    if (r.clave) return;
    const base = claveBase(r);
    let c = base, i = 0;
    while (usadas.has(c) || !c) c = base + String.fromCharCode(98 + (i++));   /* b, c, d… */
    r.clave = c; usadas.add(c);
  });
  return d;
}
const refPorClave = (clave, deck) => refsDe(deck).find(r => r.clave === clave) || null;

/* La marca dentro del texto: [@kojima2009] o [@kojima2009; @west2014].
   Es la misma sintaxis de Pandoc, así que se puede escribir a mano. */
const RE_CITA = /\[@([A-Za-z0-9]+(?:\s*;\s*@[A-Za-z0-9]+)*)\]/g;
const clavesDeGrupo = g => String(g).split(';').map(x => x.replace(/^[\s@]+/, '').trim()).filter(Boolean);
function clavesEnTexto(s) {
  const out = [];
  String(s == null ? '' : s).replace(RE_CITA, (m, g) => { clavesDeGrupo(g).forEach(c => out.push(c)); return m; });
  return out;
}
/* Dónde puede haber una cita escrita: prosa, viñetas, cajas, pies y celdas.
   En el bloque de código no, ahí un [@algo] es código. */
function textosCitables(b) {
  const t = [];
  if (b.type !== 'code' && typeof b.text === 'string') t.push(b.text);
  if (typeof b.body === 'string') t.push(b.body);
  if (typeof b.caption === 'string') t.push(b.caption);
  if (typeof b.btitle === 'string') t.push(b.btitle);
  if (Array.isArray(b.items)) b.items.forEach(i => { if (i && typeof i.t === 'string') t.push(i.t); });
  if (Array.isArray(b.rows)) b.rows.forEach(f => { if (Array.isArray(f)) f.forEach(c => { if (typeof c === 'string') t.push(c); }); });
  return t;
}

/* Las referencias usadas, en el orden en que aparecen. Se recorre la charla como
   la ve el público: diapositiva por diapositiva, bloque por bloque. */
function usoRefs(deck) {
  const d = deck || S.deck;
  aseguraClaves(d);
  const orden = [];
  const mete = r => { if (r && orden.indexOf(r.id) < 0) orden.push(r.id); };
  const enTexto = t => clavesEnTexto(t).forEach(c => mete(refPorClave(c, d)));
  d.slides.forEach(sl => {
    enTexto(sl.title); enTexto(sl.subtitle);
    zonas(sl).flat().forEach(b => {
      textosCitables(b).forEach(enTexto);
      if (b.cita) mete(refPorId(b.cita, d));
    });
    (sl.citas || []).forEach(id => mete(refPorId(id, d)));
  });
  return orden;
}
/* Calcular el orden en cada marca sería carísimo: se guarda hasta el siguiente
   cambio del mazo. */
let CITAS_CACHE = null;
const invalidaCitas = () => { CITAS_CACHE = null; };
function ordenRefs(deck) {
  const d = deck || S.deck;
  if (CITAS_CACHE && CITAS_CACHE.d === d) return CITAS_CACHE.orden;
  let orden = usoRefs(d);
  if (estiloCita(d) === 'an') {
    /* Autor-año: la lista va alfabética, como en un artículo. */
    orden = orden.slice().sort((x, y) => {
      const a = refPorId(x, d) || {}, b = refPorId(y, d) || {};
      const ka = soloLlano(apellidos(a.autores)[0] || a.titulo || '');
      const kb = soloLlano(apellidos(b.autores)[0] || b.titulo || '');
      return ka.localeCompare(kb, 'es') || String(a.anio || '').localeCompare(String(b.anio || ''));
    });
  }
  CITAS_CACHE = { d, orden };
  return orden;
}
const numeroRef = (id, deck) => ordenRefs(deck).indexOf(id) + 1;

/* Quién firma, en corto: «Kojima et al.» */
function quienCita(r) {
  const A = apellidos(r.autores);
  if (!A.length) return (r.titulo || 'Sin autor').slice(0, 22);
  return firmantes(A);
}
/* La marca ya resuelta, en el estilo elegido. modo: 'html' | 'tex' | 'txt'. */
function marcaCita(refs, deck, modo) {
  const d = deck || S.deck;
  const est = estiloCita(d);
  const nums = refs.map(r => numeroRef(r.id, d)).filter(n => n > 0);
  const envuelve = (visible, crudo) => modo === 'html'
    ? '<span class="cita-m">' + visible + '</span>' : crudo;
  if (est === 'an') {
    const t = '(' + refs.map(r => [quienCita(r), r.anio].filter(Boolean).join(', ')).join('; ') + ')';
    return envuelve(esc(t), t);
  }
  if (est === 'sup') {
    const t = nums.join(',');
    if (modo === 'html') return '<sup class="cita-m">' + esc(t) + '</sup>';
    if (modo === 'tex') return '\\textsuperscript{' + t + '}';
    return '^' + t;
  }
  const corch = '[' + nums.join(modo === 'tex' ? ',' : ', ') + ']';
  if (est === 'autnum') {
    const quien = refs.map(quienCita).join('; ');
    return modo === 'html'
      ? esc(quien) + ' <span class="cita-m">' + esc(corch) + '</span>'
      : quien + ' ' + corch;
  }
  return envuelve(esc(corch), corch);
}
/* Cambia las marcas escritas por las resueltas. Se aplica al final del pintado
   y al final del escape de LaTeX, porque [@clave] sobrevive intacto a los dos. */
function resuelveCitas(s, modo, deck) {
  const txt = String(s == null ? '' : s);
  if (txt.indexOf('[@') < 0) return txt;
  const d = deck || (modo === 'tex' && typeof TEX_DECK !== 'undefined' && TEX_DECK ? TEX_DECK : S.deck);
  if (!d || !d.meta) return txt;
  return txt.replace(RE_CITA, (m, g) => {
    const refs = clavesDeGrupo(g).map(c => refPorClave(c, d)).filter(Boolean);
    if (!refs.length) {
      return modo === 'html' ? '<span class="cita-rota" title="Esa referencia ya no está">[cita perdida]</span>' : '[cita perdida]';
    }
    return marcaCita(refs, d, modo);
  });
}

/* ---------- cómo se escribe una referencia ---------- */
/* Solo los apellidos, que es lo que lleva una cita corta.
   Acepta «Apellido, Nombre; Apellido, Nombre» y «Nombre Apellido and …». */
/* Un nombre entre llaves es una institución («{Organización Mundial de la Salud}»),
   como en BibTeX: se queda entero en vez de reducirse a la última palabra. */
const sinLlaves = s => String(s || '').replace(/[{}]/g, '');
/* «et al.» (o el «and others» de BibTeX) al final no es un apellido: se quita
   de la lista y queda anotado en «etal», para que la cita corta diga
   «Nadie et al.» y no «Nadie y et al.». */
const RE_ETAL = /^\{?\s*(?:et\s*al\.?|others)\s*\}?$/i;
/* Se parte por «;», « and » o « y », pero nunca dentro de llaves: «{Food and
   Agriculture Organization}» es un solo nombre. */
function partesAutores(autores) {
  const s = String(autores || ''), out = [];
  let n = 0, ini = 0;
  for (let j = 0; j < s.length; j++) {
    const ch = s[j];
    if (ch === '{') n++;
    else if (ch === '}') n = Math.max(0, n - 1);
    else if (!n) {
      const m = ch === ';' ? [';'] : /\s/.test(ch) ? s.slice(j).match(/^\s+(?:and|y)\s+/i) : null;
      if (m) { out.push(s.slice(ini, j)); j += m[0].length - 1; ini = j + 1; }
    }
  }
  out.push(s.slice(ini));
  return out.map(x => x.trim()).filter(Boolean);
}
function apellidos(autores) {
  const todos = partesAutores(autores);
  const A = todos.filter(x => !RE_ETAL.test(x))
    .map(x => {
      const inst = x.match(/^\{(.+)\}$/);
      if (inst) return inst[1].trim();
      return x.includes(',') ? x.split(',')[0].trim() : (x.split(/\s+/).pop() || x);
    });
  A.etal = A.length < todos.length;
  return A;
}
/* Quién firma, en corto: uno, «A y B» o «A et al.». */
const firmantes = A => !A.length ? '' : A.etal || A.length > 2 ? A[0] + ' et al.'
  : A.length === 1 ? A[0] : A[0] + ' y ' + A[1];
/* Abreviatura de revista al estilo ISO 4, con las palabras que más salen.
   Solo se aplica si el nombre es largo: «Nature» se queda como está. */
const ABREV_REV = {
  journal: 'J.', international: 'Int.', american: 'Am.', european: 'Eur.', royal: 'R.',
  chemical: 'Chem.', chemistry: 'Chem.', physical: 'Phys.', physics: 'Phys.',
  materials: 'Mater.', material: 'Mater.', science: 'Sci.', sciences: 'Sci.',
  society: 'Soc.', letters: 'Lett.', letter: 'Lett.', review: 'Rev.', reviews: 'Rev.',
  research: 'Res.', applied: 'Appl.', advanced: 'Adv.', analytical: 'Anal.',
  biological: 'Biol.', biology: 'Biol.', molecular: 'Mol.', crystallography: 'Crystallogr.',
  crystal: 'Cryst.', spectroscopy: 'Spectrosc.', spectrometry: 'Spectrom.',
  thermal: 'Therm.', analysis: 'Anal.', engineering: 'Eng.', technology: 'Technol.',
  energy: 'Energy', environmental: 'Environ.', química: 'Quím.', ciencia: 'Cienc.',
  revista: 'Rev.', española: 'Esp.', mexicana: 'Mex.'
};
const MENUDAS = new Set(['of', 'the', 'and', 'for', 'de', 'la', 'y', 'del', 'en']);
function revistaCorta(nombre) {
  const n = String(nombre || '').trim();
  if (n.length <= 26) return n;
  /* «Tesis de maestría, Universidad de Guadalajara» no es el nombre de una
     revista: la norma ISO 4 no le aplica y abreviarla la deja mal escrita. */
  if (n.indexOf(',') >= 0) return n;
  const p = n.split(/\s+/).map(w => {
    const k = w.toLowerCase().replace(/[.,:;]/g, '');
    if (MENUDAS.has(k)) return null;
    return ABREV_REV[k] || w;
  }).filter(Boolean);
  const corto = p.join(' ');
  return corto.length < n.length ? corto : n;
}
/* Cita corta al pie: «Rodríguez et al., Nature 2021». */
function citaCorta(r) {
  if (!r) return '';
  const quien = firmantes(apellidos(r.autores));
  return [quien, revistaCorta(r.revista), r.anio].filter(Boolean).join(', ');
}
/* Referencia completa, al estilo de una lista de artículo. */
function citaLarga(r) {
  if (!r) return '';
  const p = [];
  if (r.autores) p.push(sinLlaves(r.autores));
  if (r.titulo) p.push('«' + r.titulo + '»');
  const rev = [r.revista, r.vol ? '**' + r.vol + '**' : '', r.pag].filter(Boolean).join(' ');
  if (rev) p.push(rev);
  if (r.anio) p.push('(' + r.anio + ')');
  let s = p.join(', ') + '.';
  if (r.doi) s += ' DOI: ' + r.doi;
  else if (r.url) s += ' ' + r.url;
  return s;
}

/* El volumen va entre ** **, que ni inlineRich ni LaTeX entienden: en
   pantalla se vuelve <b> y en LaTeX \textbf. Antes la lista de referencias
   enseñaba los asteriscos tal cual. */
function citaLargaHtml(r) {
  const p = citaLarga(r).split('**');
  if (p.length < 3 || p.length % 2 === 0) return inlineRich(citaLarga(r));
  return p.map((t, i) => i % 2 ? '<b>' + inlineRich(t) + '</b>' : inlineRich(t)).join('');
}
function citaLargaTex(r) {
  const p = citaLarga(r).split('**');
  if (p.length < 3 || p.length % 2 === 0) return texInline(citaLarga(r));
  return p.map((t, i) => i % 2 ? '\\textbf{' + texInline(t) + '}' : texInline(t)).join('');
}

/* ---------- traer una referencia de fuera ---------- */
/* Crossref es abierta y no pide clave; con el DOI basta. */
const limpiaDOI = s => String(s || '').trim()
  .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '');
async function refDesdeDOI(doi) {
  const limpio = limpiaDOI(doi);
  if (!/^10\.\d{4,9}\/\S+$/.test(limpio)) throw new Error('Eso no parece un DOI');
  const res = await fetch('https://api.crossref.org/works/' + encodeURIComponent(limpio), {
    headers: { Accept: 'application/json' }
  });
  if (!res.ok) throw new Error(res.status === 404 ? 'Ese DOI no está en Crossref' : 'Crossref respondió ' + res.status);
  return refDesdeCrossref((await res.json()).message || {}, limpio);
}
/* Crossref escribe los títulos con marcado JATS: «TiO<sub>2</sub>»,
   «<i>in situ</i>». Los subíndices y superíndices de cifras pasan a sus
   caracteres Unicode (en química importan; los mapas son los de 12-chart.js);
   el resto de etiquetas se quita. */
function sinMarcado(s) {
  let t = String(s || '')
    .replace(/<sub>\s*([0-9+-]+)\s*<\/sub>/gi, (m, n) => n.replace(/./g, c => SUB_UNI[c]))
    .replace(/<sup>\s*([0-9+-]+)\s*<\/sup>/gi, (m, n) => n.replace(/./g, c => SUP_UNI[c]));
  /* Una pasada no basta: «<scr<b>ipt>» deja «<script>» al quitar la de dentro.
     Se repite hasta que no quede ninguna (el texto se escapa al pintarse, pero
     esta función promete texto llano y lo cumple sola). */
  for (let antes = null; antes !== t;) { antes = t; t = t.replace(/<[^<>]*>/g, ''); }
  return t
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim();
}
/* La respuesta de Crossref (su «message») a una referencia de aquí. Lo que
   Crossref no trae se queda vacío: no se rellena con nada supuesto. */
function refDesdeCrossref(m, doi) {
  const aut = (m.author || []).map(a => a.name ? '{' + a.name + '}' : [a.family, a.given].filter(Boolean).join(', '))
    .filter(Boolean).join('; ');
  const fecha = m.issued || m['published-print'] || m['published-online'] || {};
  const anio = ((fecha['date-parts'] || [[]])[0] || [])[0];
  const primero = v => Array.isArray(v) ? (v[0] || '') : (v || '');
  return {
    id: uid(),
    autores: sinMarcado(aut),
    titulo: sinMarcado(primero(m.title)),
    revista: sinMarcado(primero(m['container-title'])),
    anio: anio ? String(anio) : '',
    vol: String(m.volume || ''), pag: String(m.page || '').replace(/(\d)\s*-+\s*(\d)/g, '$1–$2'),
    doi: limpiaDOI(m.DOI || doi), url: String(m.URL || '')
  };
}

/* ---------- BibTeX ----------
   Un lector de verdad, contando llaves, porque los .bib de Zotero, JabRef o las
   revistas traen llaves anidadas ({\'e}, {TiO$_2$}), comillas, números sueltos,
   abreviaturas de mes (month = jan) y «#» para concatenar. */
const TEX_ACENTO = { "'": '́', '`': '̀', '^': '̂', '"': '̈', '~': '̃',
  '=': '̄', '.': '̇', u: '̆', v: '̌', H: '̋', c: '̧', k: '̨', r: '̊', d: '̣', b: '̱' };
const TEX_LETRA = { ss: 'ß', o: 'ø', O: 'Ø', aa: 'å', AA: 'Å', ae: 'æ', AE: 'Æ', oe: 'œ', OE: 'Œ', l: 'ł', L: 'Ł', i: 'ı', j: 'ȷ' };
/* De LaTeX a texto llano: {\'e}, \'{e} y \'e son «é»; {\ss} es «ß»; \& es «&».
   Lo que va entre $…$ se deja tal cual, porque el editor lo dibuja. */
function texALlano(s) {
  const letra = t => t === '\\i' ? 'i' : t === '\\j' ? 'j' : t;
  const fuera = t => t
    /* \'{e}, \'e, \' e y \c{c}, \c c: el acento se vuelve un carácter combinante. */
    .replace(/\\([\'`^"~=.])\s*(?:\{\s*(\\[ij](?![A-Za-z])|[A-Za-z])\s*\}|(\\[ij](?![A-Za-z])|[A-Za-z]))/g,
      (m, a, l1, l2) => letra(l1 || l2) + TEX_ACENTO[a])
    .replace(/\\([uvHckrdb])(?:\s*\{\s*(\\[ij](?![A-Za-z])|[A-Za-z])\s*\}|\s+([A-Za-z]))/g,
      (m, a, l1, l2) => letra(l1 || l2) + TEX_ACENTO[a])
    .replace(/\\(ss|aa|AA|ae|AE|oe|OE|o|O|l|L|i|j)(?![A-Za-z])\s*/g, (m, l) => TEX_LETRA[l])
    .replace(/\\([&%_#])/g, '$1')
    .replace(/\\textendash(?![A-Za-z])\s*/g, '–').replace(/\\textemdash(?![A-Za-z])\s*/g, '—')
    .replace(/---/g, '—').replace(/--/g, '–')
    .replace(/(^|[^\\])~/g, '$1\u00a0')
    /* Cualquier otra orden con argumento (\emph{…}, \textsubscript{2}, \ce{…})
       deja solo su texto. */
    .replace(/\\[A-Za-z]+\*?\s*(?=\{)/g, '')
    .replace(/[{}]/g, '');
  /* Lo que va entre $…$ se deja tal cual, y también \$ (un dólar literal):
     el editor dibuja lo uno y respeta lo otro. */
  return String(s || '').split(/((?:^|[^\\])\$[^$]*\$)/).map((t, k) => {
    if (!(k % 2)) return fuera(t);
    const i = t.indexOf('$');
    return fuera(t.slice(0, i)) + t.slice(i);
  }).join('').normalize('NFC').replace(/\s+/g, ' ').trim();
}
const MESES_BIB = { jan: '1', feb: '2', mar: '3', apr: '4', may: '5', jun: '6', jul: '7', aug: '8', sep: '9', oct: '10', nov: '11', dec: '12' };
/* Una entrada «@tipo{clave, campo = valor, …}» en crudo: el tipo, la clave y
   cada campo tal como está escrito (sin quitar llaves ni LaTeX). Las macros de
   @string llegan en «macros». */
function camposBibtex(txt, macros) {
  const s = String(txt || '');
  const cab = s.match(/^\s*@\s*(\w+)\s*([{(])/);
  if (!cab) throw new Error('Eso no parece una entrada BibTeX');
  const cierra = cab[2] === '(' ? ')' : '}';
  let i = cab[0].length;
  const fin = s.lastIndexOf(cierra);
  const cuerpo = s.slice(i, fin > i ? fin : s.length);
  const out = { tipo: cab[1].toLowerCase(), clave: '', campos: {} };
  let p = 0;
  const blanco = () => { while (p < cuerpo.length && /[\s,]/.test(cuerpo[p])) p++; };
  /* La clave es lo que hay antes de la primera coma, si no lleva «=». */
  const coma = cuerpo.indexOf(',');
  const antes = coma < 0 ? cuerpo : cuerpo.slice(0, coma);
  if (antes.indexOf('=') < 0) { out.clave = antes.trim(); p = coma < 0 ? cuerpo.length : coma + 1; }
  const valor = () => {
    const c = cuerpo[p];
    if (c === '{') {
      let n = 0, j = p;
      for (; j < cuerpo.length; j++) {
        if (cuerpo[j] === '\\') { j++; continue; }
        if (cuerpo[j] === '{') n++;
        else if (cuerpo[j] === '}') { n--; if (!n) break; }
      }
      const v = cuerpo.slice(p + 1, j); p = j + 1; return v;
    }
    if (c === '"') {
      let n = 0, j = p + 1;
      for (; j < cuerpo.length; j++) {
        if (cuerpo[j] === '\\') { j++; continue; }
        if (cuerpo[j] === '{') n++;
        else if (cuerpo[j] === '}') n--;
        else if (cuerpo[j] === '"' && n <= 0) break;
      }
      const v = cuerpo.slice(p + 1, j); p = j + 1; return v;
    }
    const m = cuerpo.slice(p).match(/^[^\s,#}]+/);
    const w = m ? m[0] : '';
    p += w.length;
    const k = w.toLowerCase();
    if (macros && Object.prototype.hasOwnProperty.call(macros, k)) return macros[k];
    if (MESES_BIB[k]) return MESES_BIB[k];
    return w;
  };
  while (p < cuerpo.length) {
    blanco();
    const m = cuerpo.slice(p).match(/^([A-Za-z][\w:.+-]*)\s*=\s*/);
    if (!m) { const sig = cuerpo.indexOf(',', p); if (sig < 0) break; p = sig + 1; continue; }
    p += m[0].length;
    let v = valor();
    /* «a # b»: se concatenan. */
    for (;;) {
      const q = cuerpo.slice(p).match(/^\s*#\s*/);
      if (!q) break;
      p += q[0].length; v += valor();
    }
    out.campos[m[1].toLowerCase()] = v;
  }
  return out;
}
/* Los autores de BibTeX van separados por «and» fuera de llaves; un nombre
   entero entre llaves es una institución y conserva sus llaves exteriores
   (apellidos() lo reconoce así). «and others» es «et al.». */
function autoresBibtex(v) {
  const partes = [];
  let n = 0, ini = 0;
  const s = String(v || '');
  for (let j = 0; j < s.length; j++) {
    if (s[j] === '{') n++;
    else if (s[j] === '}') n--;
    else if (!n && /\s/.test(s[j])) {
      const m = s.slice(j).match(/^\s+and\s+/i);
      if (m) { partes.push(s.slice(ini, j)); j += m[0].length - 1; ini = j + 1; }
    }
  }
  partes.push(s.slice(ini));
  return partes.map(x => x.trim()).filter(Boolean).map(x => {
    if (/^others$/i.test(x)) return '{et al.}';
    const inst = x.match(/^\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}$/);
    return inst ? '{' + texALlano(inst[1]) + '}' : texALlano(x);
  }).join('; ');
}
/* De los campos de una entrada a una referencia de aquí. */
function refDeCamposBibtex(e) {
  const c = e.campos || {};
  const t = k => texALlano(c[k] || '');
  /* DOI y enlace: sin llaves, espacios ni escapes de LaTeX (10.1000/a\_b). */
  const crudo = k => String(c[k] || '').replace(/[{}]/g, '').replace(/\\([_%&#~$])/g, '$1').replace(/\s+/g, '').trim();
  const anio = (t('year') || t('date')).match(/\b\d{4}\b/);
  return {
    id: uid(), autores: autoresBibtex(c.author || c.editor || ''), titulo: t('title'),
    revista: t('journal') || t('journaltitle') || t('booktitle') || t('school') || t('institution') || t('publisher'),
    anio: anio ? anio[0] : '', vol: t('volume'),
    pag: t('pages').replace(/(\d)\s*[-–]+\s*(\d)/g, '$1–$2'),
    doi: limpiaDOI(crudo('doi')), url: crudo('url')
  };
}
/* Un BibTeX pegado: una sola entrada. */
function refDesdeBibtex(txt, macros) {
  const s = String(txt || '');
  if (!/@\w+\s*[{(]/.test(s)) throw new Error('Eso no parece una entrada BibTeX');
  const r = refDeCamposBibtex(camposBibtex(s.slice(s.search(/@\w+\s*[{(]/)), macros));
  if (!r.titulo && !r.autores) throw new Error('No encontré ni autores ni título en ese BibTeX');
  return r;
}
const refVacia = () => ({ id: uid(), autores: '', titulo: '', revista: '', anio: '', vol: '', pag: '', doi: '', url: '' });

/* ---------- la bibliografía se pone y se quita sola ----------
   Como el «Actualizar bibliografía» de Word, pero sin tener que pulsarlo: en
   cuanto hay una cita aparece la diapositiva de referencias al final de la
   charla, crece con la lista, se parte en varias si no cabe y desaparece si te
   quedas sin citar nada. Se apaga en Referencias → «Mantener la bibliografía». */
const bibAutoOn = deck => ((deck || S.deck).meta || {}).bibAuto !== false;
function posBib(d) {
  let ultima = -1;
  d.slides.forEach((sl, i) => { if (!sl.bibAuto && !esRespaldo(sl)) ultima = i; });
  return ultima + 1;
}
function laminaBib(parte, partes) {
  const sl = { id: uid(), layout: 'content', bibAuto: true, title: 'Referencias', blocks: [] };
  prepararZonas(sl, 'content');
  zona(sl, 0).push({ id: uid(), type: 'refs', anim: 'fade', parte, partes });
  return sl;
}
let BIB_OCUPADO = false;
function sincronizaBib(deck) {
  const d = deck || S.deck;
  if (BIB_OCUPADO || !d || !d.meta || !Array.isArray(d.slides)) return false;
  BIB_OCUPADO = true;
  try {
    invalidaCitas();
    /* Si pusiste tú el bloque de referencias donde querías, mandas tú. */
    const propio = d.slides.some(sl => !sl.bibAuto && zonas(sl).flat().some(b => b.type === 'refs'));
    const cuantas = (bibAutoOn(d) && !propio) ? ordenRefs(d).length : 0;
    const quiere = cuantas ? Math.max(1, Math.ceil(cuantas / REFS_POR_LAMINA)) : 0;
    const idx = [];
    d.slides.forEach((sl, i) => { if (sl.bibAuto) idx.push(i); });
    const donde = posBib(d);
    const yaEsta = idx.length === quiere && idx.every((pos, k) => {
      if (pos !== donde + k) return false;
      const b = zonas(d.slides[pos]).flat().find(x => x.type === 'refs');
      return !!b && b.parte === k + 1 && b.partes === quiere;
    });
    if (yaEsta) return false;
    const idActual = (S.deck === d && d.slides[S.cur]) ? d.slides[S.cur].id : null;
    const viejas = idx.map(i => d.slides[i]);
    for (let i = idx.length - 1; i >= 0; i--) d.slides.splice(idx[i], 1);
    if (quiere) {
      const nuevas = [];
      for (let k = 0; k < quiere; k++) {
        const sl = viejas[k] || laminaBib(k + 1, quiere);
        sl.bibAuto = true;
        delete sl.respaldo;                 /* la bibliografía es de la charla, no del apéndice */
        sl.title = 'Referencias' + (quiere > 1 ? ' (' + (k + 1) + ' de ' + quiere + ')' : '');
        let b = zonas(sl).flat().find(x => x.type === 'refs');
        if (!b) { b = { id: uid(), type: 'refs', anim: 'fade' }; zona(sl, 0).push(b); }
        b.parte = k + 1; b.partes = quiere;
        nuevas.push(sl);
      }
      d.slides.splice(posBib(d), 0, ...nuevas);
    }
    if (S.deck === d) {
      const j = idActual ? d.slides.findIndex(x => x.id === idActual) : -1;
      S.cur = clamp(j >= 0 ? j : S.cur, 0, d.slides.length - 1);
    }
    return true;
  } finally { BIB_OCUPADO = false; }
}

/* ---------- pintar la cita al pie de la diapositiva ---------- */
function lineaCitas(sl, deck, mode) {
  const ids = [];
  (sl.citas || []).forEach(id => { if (!ids.includes(id)) ids.push(id); });
  zonas(sl).flat().forEach(b => { if (b.cita && !ids.includes(b.cita)) ids.push(b.cita); });
  const usables = ids.map(id => refPorId(id, deck)).filter(Boolean);
  if (!usables.length) return null;
  const caja = h('div', { class: 'slide-citas' });
  const est = estiloCita(deck);
  usables.forEach(r => {
    const n = numeroRef(r.id, deck);
    const marca = est === 'an' ? '' : est === 'sup' ? String(n) : '[' + n + ']';
    caja.append(h('span', { class: 'sc-item' },
      marca ? h('span', { class: 'sc-n' }, marca) : '', (marca ? ' ' : '') + citaCorta(r)));
  });
  return caja;
}

/* ---------- la diapositiva de referencias ---------- */
/* Con muchas referencias la lista se reparte en varias diapositivas; cada
   bloque sabe qué trozo le toca. */
const REFS_POR_LAMINA = 8;
function trozoRefs(b, orden) {
  const partes = Math.max(1, Math.floor(+(b && b.partes) || 1));
  const parte = clamp(Math.floor(+(b && b.parte) || 1), 1, partes);
  if (partes === 1) return { lista: orden, base: 0 };
  const porLam = Math.ceil(orden.length / partes);
  const ini = (parte - 1) * porLam;
  return { lista: orden.slice(ini, ini + porLam), base: ini };
}
function renderReferencias(b, deck, mode) {
  const orden = ordenRefs(deck);
  const caja = h('div', { class: 'blk b-refs' });
  if (!orden.length) {
    caja.append(h('div', { class: 'img-ph' }, mode === 'edit'
      ? 'Aún no has citado nada. Añade referencias desde el botón «Referencias» y aparecerán aquí.' : ' '));
    return caja;
  }
  const { lista, base } = trozoRefs(b, orden);
  const densa = lista.length > 8 ? ' refs-densa' : '';
  /* En autor-año la lista va sin numerar, como en un artículo. */
  const alfa = estiloCita(deck) === 'an';
  const cont = alfa ? h('ul', { class: 'refs-lista refs-alfa' + densa })
    : h('ol', { class: 'refs-lista' + densa, start: String(base + 1) });
  lista.forEach(id => {
    const r = refPorId(id, deck);
    cont.append(h('li', { html: citaLargaHtml(r) }));
  });
  caja.append(cont);
  return caja;
}

/* ---------- el editor ---------- */
function openReferencias(alElegir) {
  const pinta = () => {
    const refs = refsDe(S.deck);
    lista.innerHTML = '';
    if (!refs.length) {
      lista.append(h('p', { class: 'hint' }, 'Todavía no hay referencias. Pega un DOI o un BibTeX arriba, o créala a mano.'));
    }
    const orden = ordenRefs(S.deck);
    refs.forEach(r => {
      const n = orden.indexOf(r.id) + 1;
      const usada = n > 0;
      const enEsta = (curSlide().citas || []).includes(r.id);
      const est = estiloCita(S.deck);
      const marca = !usada ? '·' : est === 'sup' ? String(n) : est === 'an' ? '·' : '[' + n + ']';
      const fila = h('div', { class: 'ref-fila' + (usada ? '' : ' sin-usar') },
        h('span', { class: 'ref-n' }, marca),
        h('div', { class: 'ref-txt' },
          h('b', null, citaCorta(r) || '(referencia sin datos)'),
          h('em', null, r.titulo || '')),
        h('button', { class: 'ref-clave', title: 'Su clave: escribe [@' + r.clave + '] en cualquier texto y la marca sale sola. Clic para copiarla.',
          onclick: () => { copyText('[@' + r.clave + ']'); toast('Copiado: [@' + r.clave + ']'); } }, '@' + r.clave),
        h('button', { class: 'btn btn-sm btn-pri', title: 'Insertarla donde estabas escribiendo',
          onclick: () => {
            const donde = citaComoSea([r.id]);
            toast(donde === 'texto' ? 'Citada en el texto' : 'Citada al pie de esta diapositiva');
            openReferencias(alElegir);
          } }, '+ Citar'),
        h('button', { class: 'icon-btn' + (enEsta ? ' on' : ''), title: enEsta ? 'Quitarla del pie de esta diapositiva' : 'Ponerla al pie de esta diapositiva',
          onclick: () => { alternaCitaEnDiapositiva(r.id); pinta(); } }, '▁'),
        h('button', { class: 'icon-btn', title: 'Editar', onclick: () => formulario(r) }, '✎'),
        h('button', { class: 'icon-btn', title: 'Quitar de la presentación',
          onclick: () => { quitaReferencia(r.id); pinta(); } }, '✕'));
      lista.append(fila);
    });
  };

  const formulario = r => {
    const campos = [['autores', 'Autores', 'Apellido, N.; Apellido, N.'], ['titulo', 'Título', ''],
      ['revista', 'Revista o libro', ''], ['anio', 'Año', ''], ['vol', 'Volumen', ''],
      ['pag', 'Páginas', ''], ['doi', 'DOI', ''], ['url', 'Enlace', '']];
    const cuerpo = h('div');
    campos.forEach(([k, et, ph]) => cuerpo.append(h('div', { class: 'irow' },
      h('label', null, et),
      h('div', { style: 'flex:1.6' }, h('input', { class: 'field', value: r[k] || '', placeholder: ph,
        oninput: e => { r[k] = e.target.value; } })))));
    openModal({
      title: 'Referencia', size: '', body: cuerpo,
      foot: [h('button', { class: 'btn btn-pri', onclick: () => { commit(); closeModal(); openReferencias(alElegir); } }, 'Listo')]
    });
  };

  const entrada = h('textarea', { class: 'field field-mono', rows: 3,
    placeholder: 'Pega aquí un DOI (10.1038/…), una o varias entradas BibTeX, un RIS o un CSL JSON' });
  const aviso = h('p', { class: 'hint', style: 'margin:6px 0 0' });
  const traer = async () => {
    const txt = entrada.value.trim();
    if (!txt) return;
    aviso.textContent = 'Buscando…';
    try {
      /* Un DOI se le pregunta a Crossref; lo demás se lee tal cual, y puede
         venir un archivo entero exportado de Zotero con muchas entradas. */
      const esDOI = /^(https?:\/\/(dx\.)?doi\.org\/|doi:\s*)?10\.\d{4,9}\//i.test(txt);
      const refs = esDOI ? [await refDesdeDOI(txt)] : refsDesdeTexto(txt);
      const res = zotIngresa(refs, true);
      entrada.value = '';
      aviso.textContent = res.add + (res.add === 1 ? ' referencia añadida' : ' referencias añadidas') +
        (res.rep ? ' · ' + res.rep + ' ya estaban' : '') + ', citadas en esta diapositiva.';
      pinta();
      if (alElegir && res.ids.length) alElegir(res.ids[0]);
    } catch (e) {
      aviso.textContent = e.message + (/DOI/.test(e.message) ? '' : '') +
        (navigator.onLine === false ? ' · pareces estar sin conexión; puedes crearla a mano.' : '');
    }
  };
  entrada.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); traer(); } });

  const lista = h('div', { class: 'ref-lista' });

  /* Estilo de cita: se cambia y la presentación entera se reescribe. */
  const filaEstilo = h('div', { class: 'cit-estilos' });
  const pintaEstilo = () => {
    filaEstilo.innerHTML = '';
    const act = estiloCita(S.deck);
    ESTILOS_CITA.forEach(e => filaEstilo.append(h('button', {
      class: 'cit-op' + (act === e.id ? ' on' : ''), title: e.d,
      onclick: () => { S.deck.meta.citEstilo = e.id; invalidaCitas(); commit(); pintaEstilo(); pinta(); }
    }, h('span', { class: 'cit-ej' }, e.ej), h('span', { class: 'cit-n' }, e.n))));
  };
  pintaEstilo();
  const bibChk = h('input', { type: 'checkbox', checked: bibAutoOn(S.deck),
    onchange: e => { S.deck.meta.bibAuto = e.target.checked; invalidaCitas(); commit(); pinta(); } });

  const cuerpo = h('div', null,
    h('div', { class: 'panel-label' }, 'Estilo de cita'),
    filaEstilo,
    h('label', { class: 'check' }, bibChk, 'Poner y mantener sola la diapositiva de bibliografía'),
    h('p', { class: 'hint', style: 'margin:2px 0 14px' },
      'La marca nunca se teclea: se calcula. Si insertas una cita a la mitad de la charla, todo se renumera solo, ' +
      'y la lista de referencias se ordena, crece y se parte en varias diapositivas según haga falta.'),
    h('div', { class: 'panel-label' }, 'Añadir una referencia'),
    entrada,
    h('div', { style: 'display:flex;gap:7px;margin-top:7px;flex-wrap:wrap' },
      h('button', { class: 'btn btn-pri btn-sm', onclick: traer }, '↓ Traer lo pegado'),
      h('button', { class: 'btn btn-sm', title: 'Tu biblioteca de Zotero',
        onclick: () => { closeModal(); openZotero(alElegir); } }, 'Z Desde Zotero'),
      h('button', { class: 'btn btn-sm', onclick: () => { const r = refVacia(); refsDe(S.deck).push(r); commit(); formulario(r); } }, '✎ Escribirla a mano')),
    aviso,
    h('div', { class: 'panel-label', style: 'margin-top:14px' }, 'Referencias de esta presentación'),
    lista,
    h('p', { class: 'hint' }, 'Pon el cursor donde quieras la cita, abre esta ventana y pulsa «+ Citar»: entra en la frase. ' +
      'También puedes escribirla a mano con su clave, [@' + ((refsDe(S.deck)[0] || {}).clave || 'apellido2024') + '], ' +
      'y juntar varias con [@una; @otra]. El botón ▁ la manda al pie de la diapositiva en vez de al texto.'));
  pinta();
  openModal({ title: 'Referencias', size: 'modal-lg', body: cuerpo,
    foot: [h('button', { class: 'btn btn-pri', onclick: () => closeModal() }, 'Listo')] });
}

function alternaCitaEnDiapositiva(id, sl) {
  const s = sl || curSlide();
  if (!Array.isArray(s.citas)) s.citas = [];
  const i = s.citas.indexOf(id);
  if (i >= 0) s.citas.splice(i, 1); else s.citas.push(id);
  commit();
}
function quitaReferencia(id) {
  const r = refPorId(id, S.deck);
  S.deck.meta.refs = refsDe(S.deck).filter(x => x.id !== id);
  S.deck.slides.forEach(sl => {
    if (Array.isArray(sl.citas)) sl.citas = sl.citas.filter(x => x !== id);
    zonas(sl).flat().forEach(b => { if (b.cita === id) delete b.cita; });
  });
  if (r && r.clave) borraMarcas(S.deck, r.clave);
  invalidaCitas();
  commit();
}
/* Al quitar una referencia se van también sus marcas del texto: si no, quedaría
   un «[cita perdida]» a media frase. */
function borraMarcas(deck, clave) {
  const limpia = t => String(t == null ? '' : t).replace(RE_CITA, (m, g) => {
    const q = clavesDeGrupo(g).filter(c => c !== clave);
    return q.length ? '[' + q.map(c => '@' + c).join('; ') + ']' : '';
  }).replace(/[ \t]{2,}/g, ' ').replace(/ +([,.;:)])/g, '$1');
  deck.slides.forEach(sl => {
    if (typeof sl.title === 'string') sl.title = limpia(sl.title);
    if (typeof sl.subtitle === 'string') sl.subtitle = limpia(sl.subtitle);
    zonas(sl).flat().forEach(b => {
      if (b.type !== 'code' && typeof b.text === 'string') b.text = limpia(b.text);
      ['body', 'caption', 'btitle'].forEach(k => { if (typeof b[k] === 'string') b[k] = limpia(b[k]); });
      if (Array.isArray(b.items)) b.items.forEach(i => { if (i && typeof i.t === 'string') i.t = limpia(i.t); });
      if (Array.isArray(b.rows)) b.rows.forEach(f => { if (Array.isArray(f)) f.forEach((c, j) => { if (typeof c === 'string') f[j] = limpia(c); }); });
    });
  });
}

/* ---------- citar en el punto donde se estaba escribiendo ----------
   La app recuerda dónde quedó el cursor la última vez que se escribió en una
   viñeta o un párrafo (ULTIMO_PUNTO, en el editor), así que la cita entra ahí
   aunque para elegirla haya habido que abrir una ventana. */
function marcaDe(ids, deck) {
  const d = deck || S.deck;
  aseguraClaves(d);
  const refs = (ids || []).map(id => refPorId(id, d)).filter(Boolean);
  if (!refs.length) return '';
  return '[' + refs.map(r => '@' + r.clave).join('; ') + ']';
}
function citaEnElTexto(ids) {
  const tok = marcaDe(ids);
  if (!tok) return false;
  const ok = typeof insertaEnPunto === 'function' ? insertaEnPunto(tok) : false;
  if (ok) { invalidaCitas(); commit(); }
  return ok;
}
/* Si no hay dónde meterla en el texto, se cita al pie de la diapositiva. */
function citaComoSea(ids) {
  if (citaEnElTexto(ids)) return 'texto';
  const sl = curSlide();
  if (!Array.isArray(sl.citas)) sl.citas = [];
  (ids || []).forEach(id => { if (!sl.citas.includes(id)) sl.citas.push(id); });
  invalidaCitas();
  commit();
  return 'pie';
}

/* ---------- a LaTeX ---------- */
/* La cita al pie va como texto pequeño al final del frame, igual que en
   pantalla; la lista completa, como su propia diapositiva. */
function citasTex(sl, deck, p) {
  const ids = [];
  (sl.citas || []).forEach(id => { if (!ids.includes(id)) ids.push(id); });
  zonas(sl).flat().forEach(b => { if (b.cita && !ids.includes(b.cita)) ids.push(b.cita); });
  const usables = ids.map(id => refPorId(id, deck)).filter(Boolean);
  if (!usables.length) return null;
  const orden = ordenRefs(deck);
  const est = estiloCita(deck);
  const txt = usables.map(r => {
    const n = orden.indexOf(r.id) + 1;
    const marca = est === 'an' ? '' : est === 'sup' ? '\\textsuperscript{' + n + '}' : '[' + n + '] ';
    return marca + texInline(citaCorta(r));
  }).join(' \\quad ');
  return p + '\\vfill{\\tiny\\color{gray}' + txt + '}';
}
function referenciasTex(deck, p, blq) {
  const orden = ordenRefs(deck);
  if (!orden.length) return p + '% (sin referencias)';
  const { lista, base } = trozoRefs(blq, orden);
  if (!lista.length) return p + '% (sin referencias en este trozo)';
  /* Autor-año no lleva número: una lista sin viñeta hace exactamente eso. */
  if (estiloCita(deck) === 'an') {
    const L = [p + '\\begin{itemize}', p + '  \\setlength{\\itemsep}{2pt}'];
    lista.forEach(id => L.push(p + '  \\item[] ' + citaLargaTex(refPorId(id, deck))));
    L.push(p + '\\end{itemize}');
    return L.join('\n');
  }
  const L = [p + '\\begin{thebibliography}{' + orden.length + '}'];
  L.push(p + '  \\setlength{\\itemsep}{2pt}');
  if (base) L.push(p + '  \\setcounter{enumiv}{' + base + '}');
  lista.forEach(id => L.push(p + '  \\bibitem{} ' + citaLargaTex(refPorId(id, deck))));
  L.push(p + '\\end{thebibliography}');
  return L.join('\n');
}


