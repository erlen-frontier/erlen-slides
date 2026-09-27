/* SPDX-License-Identifier: AGPL-3.0-only */
/* Extensión «masiva»: cambios que tocan muchas diapositivas a la vez.

     buscar_reemplazar   texto en títulos, bloques, pies, tablas, notas…
     estilo_global       tamaño, alineación, animación o anchura de muchos bloques
     normalizar_titulos  mayúscula de oración (o de título) y punto final

   Las tres siguen el mismo patrón: sin «aplicar» devuelven la lista de lo que
   cambiaría y no escriben nada; con aplicar=true hacen exactamente eso, pasan
   por saneaDeck y dejan la versión anterior en el historial. Un cambio masivo
   mal pensado estropea cuarenta diapositivas de golpe: verlo antes es la
   mitad de la herramienta.

   Solo se tocan campos de texto con nombre. Los datos de las gráficas, las
   imágenes, las estructuras, la procedencia y los id no están en la lista,
   así que ningún patrón puede alcanzarlos. */
import vm from 'node:vm';
import {lee, op, visible, escribe, guardaVersion, ErrorUso} from '../motor.mjs';

const CLAVES_ZONA = ['blocks', 'blocks2', 'blocks3', 'blocks4', 'blocks5', 'blocks6'];
const MAX_LISTA = 100;

/* ---------- lo común ---------- */

/* «diapositivas» admite números (desde 1), id y rangos «3-7». Devuelve el
   conjunto de índices desde 0, o null si no se filtra. */
function seleccion(deck, lista) {
  if (lista == null) return null;
  if (!Array.isArray(lista)) lista = [lista];
  const n = deck.slides.length, sel = new Set();
  for (const x of lista) {
    const s = String(x).trim();
    const rango = /^(\d+)\s*[-–]\s*(\d+)$/.exec(s);
    if (rango) {
      const a = +rango[1], b = +rango[2];
      if (a < 1 || b > n || a > b) throw new ErrorUso('Rango de diapositivas «' + s + '» fuera de 1–' + n + '.');
      for (let k = a; k <= b; k++) sel.add(k - 1);
    } else if (/^\d+$/.test(s)) {
      if (+s < 1 || +s > n) throw new ErrorUso('No hay diapositiva ' + s + ': la presentación tiene ' + n + '.');
      sel.add(+s - 1);
    } else {
      const i = deck.slides.findIndex(sl => sl.id === s);
      if (i < 0) throw new ErrorUso('No hay ninguna diapositiva con id «' + s + '».');
      sel.add(i);
    }
  }
  return sel;
}

/* El proyecto pasa antes por saneaDeck: así las viñetas, tablas y zonas
   tienen la forma que espera el recorrido, y el resultado que se enseña es
   el mismo que se guardaría. */
async function prepara(a) {
  const {ruta, deck} = lee(a.archivo);
  const {deck: limpio} = await op('sanea', {deck});
  return {ruta, deck: limpio, sel: seleccion(limpio, a.diapositivas)};
}

/* Guarda solo si hubo cambios: un «aplicar» que no cambia nada no debe
   llenar el historial de versiones idénticas. */
function remata(ruta, r, total, aplicar, herramienta, extra) {
  const out = {archivo: visible(ruta), modo: aplicar ? 'aplicado' : 'vista previa', total, ...extra};
  if (aplicar && total) {
    guardaVersion(ruta, herramienta);
    escribe(ruta, r.deck);
    if (r.avisos && r.avisos.length) out.avisos = r.avisos;
    out.nota = 'Cambios guardados. deshacer los revierte todos de una vez.';
  } else if (aplicar) out.nota = 'No había nada que cambiar; el archivo no se tocó.';
  else out.nota = total ? 'Vista previa: el archivo no se ha tocado. Repite la llamada con aplicar=true para hacer estos cambios.' : 'Sin cambios que hacer.';
  return out;
}
const recorta = lista => lista.length > MAX_LISTA ? lista.slice(0, MAX_LISTA) : lista;

/* ---------- buscar y reemplazar ---------- */

const AMBITOS = ['titulos', 'texto', 'notas', 'pies', 'tablas', 'ecuaciones', 'encabezados', 'graficas', 'portada'];
/* Las ecuaciones quedan fuera por omisión: cambiar «x» por «y» no debe
   reescribir la TeX de nadie sin que se pida. */
const AMBITOS_POR_OMISION = AMBITOS.filter(x => x !== 'ecuaciones');
const META = [['title', 'titulo'], ['subtitle', 'subtitulo'], ['short', 'titulo_corto'], ['authors', 'autores'], ['institute', 'institucion'], ['date', 'fecha'], ['pieTexto', 'pie']];

/* Los textos que se pueden cambiar, cada uno con dónde está (diapositiva,
   bloque, campo), a qué ámbito pertenece y si lleva matemáticas en línea que
   haya que proteger. Es la misma lista que camposTexto (20-buscar.js) del
   editor, con las ecuaciones, los teoremas y los ejes de las gráficas. */
function campos(deck, ambitos, sel, conEcuaciones) {
  const out = [];
  const add = (ambito, lugar, campo, obj, clave, prosa = true) => {
    if (!ambitos.has(ambito) || !obj) return;
    const v = obj[clave];
    if (typeof v !== 'string' || !v) return;
    out.push({ambito, ...lugar, campo, obj, clave, mat: prosa && !conEcuaciones});
  };
  if (!sel || sel.has(0)) META.forEach(([k, n]) => add('portada', {diapositiva: 1}, 'portada.' + n, deck.meta, k));
  deck.slides.forEach((sl, i) => {
    if (sel && !sel.has(i)) return;
    const L = {diapositiva: i + 1};
    add('titulos', L, 'titulo', sl, 'title');
    add('titulos', L, 'subtitulo', sl, 'subtitle');
    add('notas', L, 'notas', sl, 'notes');
    (sl.zt || []).forEach((_, z) => add('encabezados', L, 'encabezado[' + (z + 1) + ']', sl.zt, z));
    CLAVES_ZONA.forEach(k => (sl[k] || []).forEach(b => {
      if (!b || typeof b !== 'object') return;
      const B = {diapositiva: i + 1, bloque: b.id, tipo: b.type};
      switch (b.type) {
        case 'text': case 'quote': add('texto', B, 'text', b, 'text'); add('texto', B, 'by', b, 'by'); break;
        /* En el código un «$» es una variable del shell, no matemáticas. */
        case 'code': add('texto', B, 'text', b, 'text', false); break;
        case 'bullets': (b.items || []).forEach((it, j) => add('texto', B, 'items[' + (j + 1) + ']', it, 't')); break;
        case 'bblock': add('texto', B, 'btitle', b, 'btitle'); add('texto', B, 'body', b, 'body'); break;
        case 'teorema': add('texto', B, 'titulo', b, 'titulo'); add('texto', B, 'body', b, 'body'); break;
        case 'smart': (b.items || []).forEach((it, j) => { add('texto', B, 'items[' + (j + 1) + '].t', it, 't'); add('texto', B, 'items[' + (j + 1) + '].d', it, 'd'); }); break;
        case 'math':
          add('ecuaciones', B, 'tex', b, 'tex', false);
          (b.pasos || []).forEach((p, j) => { add('ecuaciones', B, 'pasos[' + (j + 1) + '].tex', p, 'tex', false); add('texto', B, 'pasos[' + (j + 1) + '].por', p, 'por'); });
          break;
        case 'chem': add('ecuaciones', B, 'tex', b, 'tex', false); break;
        case 'table': (b.rows || []).forEach((r, ri) => (r || []).forEach((_, ci) => add('tablas', B, 'celda[' + (ri + 1) + ',' + (ci + 1) + ']', r, ci))); break;
        case 'chart': case 'func': add('graficas', B, 'title', b, 'title'); add('graficas', B, 'xlabel', b, 'xlabel'); add('graficas', B, 'ylabel', b, 'ylabel'); break;
        case 'galeria': ((b.gal && b.gal.imgs) || []).forEach((g, j) => { add('pies', B, 'imagen[' + (j + 1) + '].cap', g, 'cap'); add('pies', B, 'imagen[' + (j + 1) + '].alt', g, 'alt'); }); break;
      }
      add('pies', B, 'caption', b, 'caption');
      add('pies', B, 'alt', b, 'alt');
    }));
  });
  return out;
}

/* Esta función se ejecuta en un contexto aparte de vm con límite de tiempo:
   un patrón con retroceso catastrófico, del tipo (a+)+b, puede bloquear el
   motor de expresiones regulares durante minutos, y vm es lo único que lo
   interrumpe de verdad. Por eso no puede usar nada de fuera: recibe y
   devuelve texto JSON. */
function buscaEnTextos(json) {
  const {textos, patron, flags, literal, reemplazo, mayusculaInicial} = JSON.parse(json);
  const re = new RegExp(patron, flags);
  /* Tramos intocables: las matemáticas en línea ($…$, $$…$$) si no se pidió
     el ámbito de ecuaciones, y siempre las citas [@clave]. */
  const protegidos = (t, mat) => {
    const r = [];
    for (const m of t.matchAll(/\[@[^\]\n]*\]/g)) r.push([m.index, m.index + m[0].length, 'cita']);
    if (!mat) return r;
    let abre = -1, doble = false;
    for (let k = 0; k < t.length; k++) {
      if (t[k] === '\\') { k++; continue; }
      if (t[k] !== '$') continue;
      const dd = t[k + 1] === '$';
      if (abre < 0) { abre = k; doble = dd; if (dd) k++; }
      else if (doble && !dd) continue;
      else { r.push([abre, k + (doble ? 2 : 1), 'mat']); if (doble) k++; abre = -1; }
    }
    /* Un «$» sin cerrar: mejor proteger hasta el final que partir una fórmula. */
    if (abre >= 0) r.push([abre, t.length, 'mat']);
    return r;
  };
  /* Las referencias $1, $<nombre>, $& y $$ de String.replace, a mano, porque
     cada coincidencia se decide por separado (algunas caen en tramos
     protegidos y no se reemplazan). */
  const expande = (m, por) => por.replace(/\$(\$|&|<([^>]*)>|(\d{1,2}))/g, (x, c, nombre, num) => {
    if (c === '$') return '$';
    if (c === '&') return m[0];
    if (nombre != null) return (m.groups && m.groups[nombre]) || '';
    if (+num > 0 && +num < m.length) return m[+num] || '';
    if (num.length === 2 && +num[0] > 0 && +num[0] < m.length) return (m[+num[0]] || '') + num[1];
    return x;
  });
  return JSON.stringify(textos.map(({t, mat}) => {
    const prot = protegidos(t, mat), hits = [];
    let nuevo = '', ultimo = 0, enMat = 0, enCita = 0, m;
    re.lastIndex = 0;
    while ((m = re.exec(t))) {
      /* Una coincidencia vacía (x*, ^) insertaría el reemplazo entre cada
         letra: se salta. */
      if (!m[0].length) { re.lastIndex++; continue; }
      const a = m.index, b = a + m[0].length;
      const p = prot.find(x => a < x[1] && b > x[0]);
      if (p) { if (p[2] === 'mat') enMat++; else enCita++; continue; }
      let por = reemplazo == null ? null : literal ? reemplazo : expande(m, reemplazo);
      if (por && mayusculaInicial && /^\p{Lu}/u.test(m[0]) && /^\p{Ll}/u.test(por)) por = por[0].toUpperCase() + por.slice(1);
      /* Un reemplazo que deja lo mismo (el «25 °C» que ya tenía su espacio)
         no es un cambio y no debe inflar la vista previa. */
      if (por === m[0]) continue;
      hits.push([a, b, por]);
      if (por != null) { nuevo += t.slice(ultimo, a) + por; ultimo = b; }
    }
    return {hits, nuevo: reemplazo == null ? null : nuevo + t.slice(ultimo), enMat, enCita};
  }));
}

/* Sin distinguir mayúsculas se ignoran también las tildes, como en el
   buscador del editor: «sintesis» encuentra «Síntesis». La ñ no: «ano» y
   «año» son palabras distintas. */
const VOCALES = {a: 'aáàâäã', e: 'eéèêë', i: 'iíìîï', o: 'oóòôöõ', u: 'uúùûü'};
const SIN_TILDE = {};
Object.entries(VOCALES).forEach(([v, xs]) => [...xs].forEach(x => { SIN_TILDE[x] = v; }));
function patronLiteral(texto, ignoraTildes) {
  return [...texto].map(ch => {
    const base = ignoraTildes && SIN_TILDE[ch.toLowerCase()];
    return base ? '[' + VOCALES[base] + ']' : ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('');
}

const MAX_PATRON = 300, TIEMPO_MS = 1500;
async function buscarReemplazar(a) {
  const buscar = a.buscar;
  if (typeof buscar !== 'string' || !buscar) throw new ErrorUso('«buscar» debe ser un texto no vacío.');
  if (buscar.length > MAX_PATRON) throw new ErrorUso('«buscar» tiene ' + buscar.length + ' caracteres; el límite es ' + MAX_PATRON + '.');
  const reemplazar = a.reemplazar == null ? null : String(a.reemplazar);
  if (a.aplicar && reemplazar == null) throw new ErrorUso('Para aplicar hace falta «reemplazar» (puede ser "" para borrar).');
  let ambitos = a.ambito == null ? AMBITOS_POR_OMISION : Array.isArray(a.ambito) ? a.ambito : [a.ambito];
  const malos = ambitos.filter(x => !AMBITOS.includes(x));
  if (malos.length) throw new ErrorUso('Ámbito desconocido: ' + malos.map(x => '«' + x + '»').join(', ') + '. Válidos: ' + AMBITOS.join(', ') + '.');
  if (!ambitos.length) throw new ErrorUso('«ambito» está vacío: no hay dónde buscar.');
  ambitos = new Set(ambitos);

  const regex = !!a.regex, caso = !!a.mayusculas;
  let patron = regex ? buscar : patronLiteral(buscar, !caso);
  /* Palabra completa con letras de cualquier idioma: \b de JavaScript cree
     que la «í» de «síntesis» corta la palabra. */
  if (a.palabra_completa) patron = '(?<![\\p{L}\\p{N}_])(?:' + patron + ')(?![\\p{L}\\p{N}_])';
  const flags = 'gu' + (caso ? '' : 'i');
  try { new RegExp(patron, flags); } catch (e) { throw new ErrorUso('La expresión regular no es válida: ' + e.message.replace(/^Invalid regular expression: /, '') + '.'); }

  const {ruta, deck, sel} = await prepara(a);
  const lista = campos(deck, ambitos, sel, ambitos.has('ecuaciones'));
  let res;
  try {
    res = JSON.parse(vm.runInNewContext('(' + buscaEnTextos.toString() + ')(entrada)', {
      entrada: JSON.stringify({textos: lista.map(c => ({t: c.obj[c.clave], mat: c.mat})), patron, flags, literal: !regex, reemplazo: reemplazar, mayusculaInicial: !regex && !caso})
    }, {timeout: TIEMPO_MS}));
  } catch (e) {
    if (/timed out/i.test(e.message)) throw new ErrorUso('La búsqueda tardó más de ' + TIEMPO_MS / 1000 + ' s y se detuvo: el patrón probablemente tiene cuantificadores anidados, como (a+)+. Simplifícalo.');
    throw new ErrorUso('La búsqueda falló: ' + e.message);
  }

  const cambios = [], porAmbito = {};
  let total = 0, enMat = 0, enCita = 0;
  const ctx = (t, x, y) => t.slice(Math.max(0, x), y).replace(/\s+/g, ' ');
  lista.forEach((c, k) => {
    const r = res[k], t = c.obj[c.clave];
    enMat += r.enMat; enCita += r.enCita;
    if (!r.hits.length) return;
    if (reemplazar != null && r.nuevo === t) return;
    total += r.hits.length;
    porAmbito[c.ambito] = (porAmbito[c.ambito] || 0) + r.hits.length;
    r.hits.forEach(([x, y, por]) => {
      if (cambios.length >= MAX_LISTA) return;
      const antes = (x > 40 ? '…' : '') + ctx(t, x - 40, x), despues = ctx(t, y, y + 40) + (y + 40 < t.length ? '…' : '');
      const fila = {diapositiva: c.diapositiva, ...(c.bloque ? {bloque: c.bloque, tipo: c.tipo} : {}), campo: c.campo, coincide: t.slice(x, y), antes: antes + t.slice(x, y) + despues};
      if (por != null) fila.despues = antes + por + despues;
      cambios.push(fila);
    });
    if (a.aplicar) c.obj[c.clave] = r.nuevo;
  });

  const extra = {coincidencias: total, por_ambito: porAmbito, diapositivas: [...new Set(cambios.map(x => x.diapositiva))], cambios};
  if (total > cambios.length) extra.lista_recortada = 'Se muestran ' + cambios.length + ' de ' + total + '.';
  if (enMat) extra.omitidas_en_matematicas = enMat + ' coincidencia(s) dentro de $…$ no se tocan; añade «ecuaciones» al ámbito si también deben cambiar.';
  if (enCita) extra.omitidas_en_citas = enCita + ' coincidencia(s) dentro de citas [@clave] no se tocan.';
  if (reemplazar == null) {
    extra.nota = total ? 'Solo búsqueda: pasa «reemplazar» para ver el cambio propuesto.' : 'Sin coincidencias.';
    return {archivo: visible(ruta), modo: 'búsqueda', total, ...extra};
  }
  const r = a.aplicar && total ? await op('sanea', {deck}) : null;
  return remata(ruta, r, total, !!a.aplicar, 'buscar_reemplazar', extra);
}

/* ---------- estilo global ---------- */
async function estiloGlobal(a) {
  if (!a.propiedades || typeof a.propiedades !== 'object' || Array.isArray(a.propiedades) || !Object.keys(a.propiedades).length)
    throw new ErrorUso('«propiedades» debe ser un objeto con al menos una propiedad, p. ej. {"anim": "fade"}.');
  const {ruta, deck, sel} = await prepara(a);
  const r = await op('masivaEstilo', {deck, indices: sel ? [...sel] : null, tipo_bloque: a.tipo_bloque, propiedades: a.propiedades});
  const {cambios, total, omitidos} = r.resultado;
  const extra = {cambios: recorta(cambios), ...(omitidos.length ? {omitidos} : {})};
  if (total > MAX_LISTA) extra.lista_recortada = 'Se muestran ' + MAX_LISTA + ' de ' + total + '.';
  return remata(ruta, r, total, !!a.aplicar, 'estilo_global', extra);
}

/* ---------- normalizar títulos ----------
   Mayúscula de oración a la española: solo la primera letra. Lo difícil es
   no romper lo que ya estaba bien: siglas (XRD, FTIR), fórmulas (Zn(OH)2,
   ZnAl-LDH, CO3²⁻), unidades (pH, eV, °C), símbolos de elemento (Zn, Mg) y
   nombres propios (Scherrer). La regla: una palabra solo se pasa a
   minúscula si todo el título estaba en «Mayúscula De Título», que es
   cuando no se puede saber qué mayúsculas eran intencionadas. Si el título
   ya estaba en oración, sus mayúsculas interiores se respetan y se avisan. */
const FUNCIONALES = new Set(('a al ante bajo cabe como con contra de del desde durante e el en entre hacia hasta la las lo los mediante ni o os para por que se según segun sin so sobre su sus tras u un una unas unos y').split(' '));
const ELEMENTOS = new Set(('H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og').split(' '));
/* Símbolos que en español también son palabras corrientes: en un título en
   Mayúscula De Título «La» es un artículo, no el lantano. */
const AMBIGUOS = new Set(['Al', 'La', 'No', 'Se', 'Es', 'Si', 'Ni', 'Te', 'Os', 'Ti', 'Fe', 'Ir', 'As', 'Re', 'He', 'In', 'Y', 'O', 'U', 'Pa', 'Po', 'Ha']);
/* Los que además se rescatan si el título habla de química (hay otro
   símbolo o una fórmula): «Dopaje Con Al Y Mg» es aluminio. Los artículos y
   conjunciones («La», «Se», «Y») no, porque ahí casi siempre son palabras. */
const RESCATABLES = new Set(['Al', 'Ni', 'Fe', 'In', 'As', 'Ir', 'Re', 'Ti']);
/* Terminaciones de palabras corrientes: una palabra así que se pasa a
   minúscula no hace falta revisarla, un nombre propio casi nunca acaba así. */
const CORRIENTE = /(ción|ciones|sión|siones|dad|dades|tad|miento|mientos|ico|ica|icos|icas|ado|ada|ados|adas|ido|ida|idos|idas|ente|entes|ncia|ncias|ismo|ivo|iva|ivos|ivas|oso|osa|ura|uras|aje|ajes|ar|er|ir)$/u;
const ABREVIATURAS = new Set(['etc', 'al', 'vs', 'cf', 'fig', 'figs', 'ca', 'aprox', 'núm', 'num', 'vol', 'ed', 'eds', 'dr', 'dra', 'sr', 'sra', 'p', 'pp', 'ej', 'ref', 'refs', 'e.g', 'i.e']);
const ABRE = /^[¿¡"'«“‘(\[]*/u, CIERRA = /[.,;:!?…"'»”’)\]]*$/u;
const minus = s => s.toLocaleLowerCase('es');
const mayusInicial = s => s.charAt(0).toLocaleUpperCase('es') + s.slice(1);

/* Qué es cada trozo de palabra (entre guiones o barras). */
function clase(p) {
  if (!p) return 'vacio';
  if (/[^\p{L}]/u.test(p)) return 'protegida';             // cifras, paréntesis, °, subíndices, ⁻…
  const M = [...p].filter(ch => /\p{Lu}/u.test(ch)).length;
  if (M >= 2) return 'protegida';                           // XRD, ZnAl, LDH, FTIR, II
  if (M === 1 && !/^\p{Lu}/u.test(p)) return 'protegida';   // pH, eV, mRNA
  if (M === 1) return ELEMENTOS.has(p) ? 'elemento' : 'capital';
  return 'minuscula';
}

/* Las matemáticas en línea se cambian por una marca antes de partir en
   palabras (pueden llevar espacios) y la palabra que la contiene queda
   entera protegida: en «$\\alpha$-Al$_2$O$_3$» la «O» no es una vocal. */
const MARCA = /\uE000(\d+)\uE001/g;
function trocea(titulo) {
  const mats = [];
  const conMarcas = String(titulo).replace(/\$\$[^$]*\$\$|\$[^$]*\$/g, m => '\uE000' + (mats.push(m) - 1) + '\uE001');
  const palabras = [];
  conMarcas.split(/(\s+)/).forEach((w, j) => {
    if (j % 2 || !w) { if (w) palabras.push({esp: w}); return; }
    const ini = w.match(ABRE)[0], resto = w.slice(ini.length);
    const fin = resto.match(CIERRA)[0], nucleo = resto.slice(0, resto.length - fin.length);
    const partes = nucleo.split(/([-‐–\/])/);
    palabras.push({ini, fin, partes, clases: partes.map((p, i) => i % 2 ? 'sep' : clase(p))});
  });
  return {palabras, une: () => palabras.map(w => w.esp != null ? w.esp : w.ini + w.partes.join('') + w.fin).join('').replace(MARCA, (_, k) => mats[+k])};
}

function normalizaTitulo(titulo, opciones) {
  const {estilo, quitarPunto, conservar} = opciones;
  let t = String(titulo);
  const {palabras, une} = trocea(t);
  /* La oración empieza en la primera palabra con letras o fórmula: en
     «1. Síntesis De…» el número no cuenta. */
  const primero = palabras.find(w => w.partes && /[\p{L}\uE000]/u.test(w.partes.join('')));
  const conLetras = palabras.filter(w => w.partes && w.partes.some(p => /\p{L}/u.test(p)));
  const texto = palabras.filter(w => w.partes).map(w => w.partes.join('')).join(' ');
  /* Todo en mayúsculas: no hay forma de saber qué es sigla y qué no. */
  if (/\p{L}{4}/u.test(texto) && !/\p{Ll}/u.test(texto)) return {titulo: t, omitida: 'todo en mayúsculas: no se distingue una sigla de una palabra'};
  /* ¿Estaba en Mayúscula De Título? Una palabra funcional en mayúscula
     («De», «En») lo delata; si no, que la mayoría de las de contenido
     empiecen por mayúscula. */
  const resto = conLetras.filter(w => w !== primero && w.partes.length === 1);
  const funcionalMayus = resto.some(w => w.clases[0] !== 'minuscula' && w.clases[0] !== 'protegida' && FUNCIONALES.has(minus(w.partes[0])) && !ELEMENTOS.has(w.partes[0]));
  const contenido = resto.filter(w => (w.clases[0] === 'capital' || w.clases[0] === 'minuscula') && !FUNCIONALES.has(minus(w.partes[0])) && w.partes[0].length >= 3);
  const capitales = contenido.filter(w => w.clases[0] === 'capital').length;
  const deTitulo = funcionalMayus || (contenido.length >= 2 && capitales / contenido.length >= 0.6);
  const quimica = palabras.some(w => w.partes && w.partes.some((p, i) => (w.clases[i] === 'elemento' && !AMBIGUOS.has(p)) || (w.clases[i] === 'protegida' && /\p{Lu}\p{Ll}?[\d₀-₉(]/u.test(p))));
  const guardadas = new Set((conservar || []).map(String));
  const bajadas = [], respetadas = [];

  conLetras.forEach(w => {
    /* Un compuesto con guion donde algún trozo es químico (Zn-Al, Mg/Al)
       conserva todos sus símbolos, aunque «Al» sea también una palabra. */
    const quimico = w.partes.length > 1 && w.clases.some(c => c === 'protegida' || c === 'elemento');
    w.partes = w.partes.map((p, i) => {
      const c = w.clases[i];
      if (c === 'sep' || c === 'vacio' || c === 'protegida' || guardadas.has(p) || guardadas.has(w.partes.join(''))) return p;
      const primera = w === primero && i === 0;
      const funcional = FUNCIONALES.has(minus(p));
      if (primera) return c === 'minuscula' ? mayusInicial(p) : p;
      if (c === 'elemento' && (quimico || !AMBIGUOS.has(p) || !deTitulo)) return p;
      if (c === 'elemento' && quimica && RESCATABLES.has(p)) { respetadas.push(p); return p; }
      if (estilo === 'titulo') {
        if (c === 'minuscula') return funcional ? p : mayusInicial(p);
        if (funcional && (deTitulo || c !== 'elemento')) return minus(p);
        return p;
      }
      if (c === 'minuscula') return p;
      if (!deTitulo) { respetadas.push(p); return p; }
      bajadas.push(p);
      return minus(p);
    });
  });
  t = une();
  if (quitarPunto) {
    const m = /(\S*?)\.$/u.exec(t.trimEnd());
    if (m && !/\.\.$/.test(t.trimEnd()) && !ABREVIATURAS.has(minus(m[1].replace(ABRE, '')))) t = t.trimEnd().slice(0, -1);
  }
  return {titulo: t, bajadas: bajadas.filter(p => p.length >= 4 && !FUNCIONALES.has(minus(p)) && !CORRIENTE.test(minus(p))), respetadas};
}

async function normalizarTitulos(a) {
  const estilo = a.estilo == null ? 'oracion' : a.estilo;
  if (!['oracion', 'titulo'].includes(estilo)) throw new ErrorUso('«estilo» debe ser «oracion» o «titulo».');
  if (a.conservar != null && !Array.isArray(a.conservar)) throw new ErrorUso('«conservar» debe ser una lista de palabras.');
  const {ruta, deck, sel} = await prepara(a);
  const opciones = {estilo, quitarPunto: a.quitar_punto_final !== false, conservar: a.conservar};
  const cambios = [], omitidas = [], revisar = [];
  const trata = (i, campo, obj, clave) => {
    const antes = obj[clave];
    if (typeof antes !== 'string' || !antes.trim()) return;
    const r = normalizaTitulo(antes, opciones);
    if (r.omitida) { omitidas.push({diapositiva: i + 1, campo, titulo: antes, motivo: r.omitida}); return; }
    if (r.bajadas.length) revisar.push({diapositiva: i + 1, campo, pasadas_a_minuscula: r.bajadas});
    if (r.respetadas.length) revisar.push({diapositiva: i + 1, campo, mayusculas_respetadas: r.respetadas});
    if (r.titulo === antes) return;
    cambios.push({diapositiva: i + 1, id: deck.slides[i].id, campo, antes, despues: r.titulo});
    obj[clave] = r.titulo;
  };
  deck.slides.forEach((sl, i) => {
    if (sel && !sel.has(i)) return;
    trata(i, 'titulo', sl, 'title');
    if (a.incluir_encabezados) (sl.zt || []).forEach((_, z) => {
      /* En «dato» el primer encabezado es la cifra y en «cita» la fuente: no son títulos. */
      if (sl.layout === 'dato' || sl.layout === 'cita') return;
      trata(i, 'encabezado[' + (z + 1) + ']', sl.zt, z);
    });
  });
  if (a.incluir_portada && (!sel || sel.has(0))) trata(0, 'portada.titulo', deck.meta, 'title');
  const extra = {estilo, cambios: recorta(cambios)};
  if (omitidas.length) extra.omitidas = omitidas;
  if (revisar.length) {
    extra.revisar = revisar;
    extra.sobre_revisar = 'pasadas_a_minuscula: el título estaba en Mayúscula De Título y estas palabras se bajaron; si alguna es un nombre propio (Scherrer, Rietveld), pásala en «conservar». mayusculas_respetadas: el título ya estaba en oración y se dejaron como estaban por si son nombres propios.';
  }
  const r = a.aplicar && cambios.length ? await op('sanea', {deck}) : null;
  return remata(ruta, r, cambios.length, !!a.aplicar, 'normalizar_titulos', extra);
}

/* ---------- catálogo ---------- */
const archivo = {type: 'string', description: 'Proyecto JSON dentro de la carpeta de trabajo; «.json» es opcional.'};
const diapositivas = {type: 'array', items: {anyOf: [{type: 'integer', minimum: 1}, {type: 'string'}]},
  description: 'Limita el cambio a estas diapositivas: números desde 1, id o rangos «3-7». Por omisión, todas.'};
const aplicar = {type: 'boolean', description: 'false (por omisión): solo enseña lo que cambiaría. true: lo cambia y guarda la versión anterior en el historial.'};
const cambia = {readOnlyHint: false, destructiveHint: false, openWorldHint: false};

export default {
  herramientas: [
    {name: 'buscar_reemplazar', title: 'Buscar y reemplazar',
      description: 'Busca un texto en toda la presentación y, con «reemplazar», propone el cambio en cada sitio (diapositiva, bloque, campo, antes → después). Sin aplicar=true no escribe nada: revisa la lista y repite con aplicar=true. Recorre títulos, texto, viñetas, cajas, teoremas, SmartArt, pies, tablas, notas, encabezados, títulos y ejes de gráficas y portada; nunca los datos de las gráficas, las imágenes, las estructuras ni los id. Por omisión no toca nada dentro de $…$ ni las ecuaciones (ámbito «ecuaciones» para eso) ni las citas [@clave]. Sin mayusculas=true ignora mayúsculas y tildes y conserva la mayúscula inicial de cada coincidencia.',
      inputSchema: {type: 'object', required: ['archivo', 'buscar'], properties: {
        archivo,
        buscar: {type: 'string', description: 'Texto literal, o expresión regular con regex=true (hasta ' + MAX_PATRON + ' caracteres).'},
        reemplazar: {type: 'string', description: 'Texto nuevo; "" borra. Sin él, solo busca. Con regex=true admite $1, $<nombre>, $& y $$ (un «$» literal).'},
        regex: {type: 'boolean', description: 'Interpreta «buscar» como expresión regular de JavaScript (con la bandera u).'},
        mayusculas: {type: 'boolean', description: 'Distingue mayúsculas y tildes. Por omisión no.'},
        palabra_completa: {type: 'boolean', description: 'Solo palabras enteras: «Al» no encuentra «Alúmina».'},
        ambito: {type: 'array', items: {type: 'string', enum: AMBITOS},
          description: 'Dónde buscar. Por omisión todo salvo «ecuaciones». titulos (títulos y subtítulos de diapositiva), texto (texto, viñetas, cajas, citas, teoremas, SmartArt, código), notas, pies (pies y texto alterno), tablas, ecuaciones (TeX de ecuaciones y reacciones, y lo que va entre $…$), encabezados (de zona), graficas (título y ejes), portada (título, autores, institución…).'},
        diapositivas, aplicar}},
      annotations: cambia, run: buscarReemplazar},
    {name: 'estilo_global', title: 'Estilo global',
      description: 'Cambia de una vez una propiedad de presentación en muchos bloques: tamaño del texto, alineación, animación de entrada, velocidad, retardo, aparición por pasos, anchura de figuras, cuadrícula y leyenda de gráficas. Filtra por tipo de bloque y por diapositivas. Sin aplicar=true solo enseña lo que cambiaría. Rechaza propiedades y valores que la app no admite; los bloques a los que una propiedad no se aplica se cuentan en «omitidos».',
      inputSchema: {type: 'object', required: ['archivo', 'propiedades'], properties: {
        archivo,
        tipo_bloque: {anyOf: [{type: 'string'}, {type: 'array', items: {type: 'string'}}], description: 'Solo bloques de este tipo (o tipos): text, bullets, math, chart, image, smart…'},
        propiedades: {type: 'object', description: 'Una o varias de estas; también en español (tamano, alineacion, animacion, velocidad, retardo, por_pasos, ancho, cuadricula, leyenda).', properties: {
          size: {type: 'string', enum: ['s', 'n', 'l'], description: 'Tamaño: pequeño, normal, grande. Texto: s/n/l; ecuaciones: n/l.'},
          align: {type: 'string', enum: ['left', 'center'], description: 'Alineación del texto o de las celdas de una tabla.'},
          anim: {type: 'string', description: 'Efecto de entrada al presentar: none, fade, surgir, up, down, left, right, zoom, alejar, rebote, barrido, cortina, voltear, destacar, draw (solo gráficas y diagramas).'},
          animVel: {type: 'string', enum: ['rapida', 'normal', 'lenta'], description: 'Velocidad del efecto.'},
          animRet: {type: 'integer', minimum: 0, maximum: 2000, description: 'Retardo del efecto en ms.'},
          step: {type: 'boolean', description: 'Aparece en su propio paso (viñetas: punto por punto).'},
          w: {type: 'number', minimum: 10, maximum: 100, description: 'Anchura en % de figuras, gráficas, estructuras y diagramas.'},
          grid: {type: 'boolean', description: 'Cuadrícula de las gráficas.'},
          legend: {type: 'boolean', description: 'Leyenda de las gráficas.'}}},
        diapositivas, aplicar}},
      annotations: cambia, run: estiloGlobal},
    {name: 'normalizar_titulos', title: 'Normalizar títulos',
      description: 'Unifica las mayúsculas de los títulos de diapositiva: «oracion» (solo la primera letra, como se escribe en español) o «titulo» (cada palabra de contenido en mayúscula). Respeta siglas y fórmulas (XRD, FTIR, ZnAl-LDH, Zn(OH)2, pH, °C), símbolos de elemento y lo que va entre $…$; quita el punto final. Sin aplicar=true solo enseña los cambios y lo que conviene revisar (posibles nombres propios).',
      inputSchema: {type: 'object', required: ['archivo'], properties: {
        archivo,
        estilo: {type: 'string', enum: ['oracion', 'titulo'], description: 'Por omisión «oracion».'},
        quitar_punto_final: {type: 'boolean', description: 'Quita el punto final (no el de «etc.» ni los puntos suspensivos). Por omisión true.'},
        conservar: {type: 'array', items: {type: 'string'}, description: 'Palabras que no se tocan nunca, p. ej. nombres propios: ["Scherrer", "Rietveld"].'},
        incluir_encabezados: {type: 'boolean', description: 'También los encabezados de zona (comparacion, filas…).'},
        incluir_portada: {type: 'boolean', description: 'También el título de la portada.'},
        diapositivas, aplicar}},
      annotations: cambia, run: normalizarTitulos}
  ],
  convenciones: {
    cambios_masivos: 'buscar_reemplazar, estilo_global y normalizar_titulos enseñan primero lo que cambiarían; enséñale la lista al usuario si es larga y aplica con aplicar=true. Un solo deshacer revierte todo el lote.'
  }
};

/* Para las pruebas de la lógica de títulos sin arrancar el servidor. */
export {normalizaTitulo, buscaEnTextos};
