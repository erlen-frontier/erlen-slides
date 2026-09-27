/* SPDX-License-Identifier: AGPL-3.0-only */
/* Extensión «markdown»: de un guion en Markdown a una presentación, y de una
   presentación a Markdown.

   Mucha gente escribe primero la charla como un esquema de texto (en sus
   notas, en un README, en lo que devuelve un asistente). importar_markdown lo
   convierte de una vez en diapositivas con los bloques reales del editor, y
   exportar_presentacion con formato «markdown» hace el camino inverso: un
   borrador del guion que se puede editar como texto y volver a importar.

   El analizador es propio y pequeño a propósito: solo reconoce lo que tiene
   equivalente en un bloque de la app y avisa de todo lo demás (negritas,
   enlaces, HTML, encabezados profundos…) en vez de tirarlo en silencio. La
   sintaxis está en docs/mcp-extensiones/markdown.md. */
import {readFileSync, writeFileSync, mkdirSync, statSync, existsSync} from 'node:fs';
import {dirname, basename, extname, posix} from 'node:path';
import {op, escribe, guardaVersion, preparaEntrada, archivoEnCarpeta, rutaSegura, visible, ErrorUso, proyectoValidado} from '../motor.mjs';

const MAX_MD = 2 * 1024 * 1024;
const EXT_MD = ['.md', '.markdown', '.txt'];

/* ---------- utilidades de texto ---------- */
const RE_CORTE = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const RE_TITULO = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const RE_LISTA = /^([ \t]*)([-*+]|\d{1,9}[.)])(?:[ \t]+(.*)|[ \t]*$)/;
const RE_VALLA = /^ {0,3}(`{3,}|~{3,})[ \t]*([^\s`]*)[^`]*$/;
const RE_IMAGEN = /^ {0,3}!\[((?:\\.|[^\]\\])*)\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+"((?:\\.|[^"\\])*)")?\s*\)(?:\{([^}]*)\})?\s*$/;
const RE_SEPARADOR = /^[ \t]*\|?[ \t]*:?-+:?[ \t]*(\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;
const RE_NOTAS = /^ {0,3}(?:notas?|notes?)\s*:\s*(.*)$/i;
const RE_PIE_TABLA = /^ {0,3}(?:(?:tabla|table)\s*:|:)\s+(.*)$/i;
const RE_COLUMNAS = /^ {0,3}:{3,}[ \t]*(\S+)?[ \t]*(\S+)?[ \t]*$/;
const RE_DIVISOR = /^ {0,3}\|\|\|[ \t]*$/;

const nivelTitulo = l => { const m = RE_TITULO.exec(l); return m ? m[1].length : 0; };
const ancho = s => s.replace(/\t/g, '    ').length;
const sinTildes = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/* Lo que interrumpe un párrafo. Un párrafo exportado cuya línea empiece así
   se escapa con «\» delante para que vuelva como texto. */
function esConstruccion(l) {
  return RE_TITULO.test(l) || RE_CORTE.test(l) || RE_LISTA.test(l) || RE_VALLA.test(l) || /^ {0,3}(\$\$|>|<!--)/.test(l) ||
    RE_COLUMNAS.test(l) || RE_DIVISOR.test(l) || RE_IMAGEN.test(l) || RE_NOTAS.test(l);
}
/* Una línea «--- | ---» bajo otra con barras convertiría el párrafo en tabla. */
const esSeparador = l => l.includes('|') && l.includes('-') && RE_SEPARADOR.test(l);
const pideEscape = l => esConstruccion(l) || esSeparador(l) || RE_PIE_TABLA.test(l);
const escapaParrafo = l => (pideEscape(l) || l.startsWith('\\')) ? '\\' + l : l;
const desescapaParrafo = l => l.startsWith('\\') && (pideEscape(l.slice(1)) || l[1] === '\\') ? l.slice(1) : l;
/* En una cita, «Nota:» al principio la volvería notas del orador y una raya
   en la última línea, su autor. */
const citaPideEscape = l => RE_NOTAS.test(l) || /^\s*(—|–|--)/.test(l);
const escapaCita = l => (citaPideEscape(l) || l.startsWith('\\')) ? '\\' + l : l;
const desescapaCita = l => l.startsWith('\\') && (citaPideEscape(l.slice(1)) || l[1] === '\\') ? l.slice(1) : l;

/* ---------- marcado en línea ----------
   La app no tiene negrita, cursiva, tachado, código en línea ni enlaces: sus
   marcas se quitan. «\*», «\_», «\`», «\[», «\~» y «\\» son caracteres
   literales, que es como la exportación protege un texto que las llevaba. Las
   matemáticas $…$ no se tocan. */
const TROZOS = /(\\\$|\$(?:\\.|[^$\\\n])+\$)/;
const ESCAPABLES = '\\*_`[~';
const RESERVA = i => String.fromCharCode(0xE000 + i);
function quitaMarcas(trozo) {
  const hubo = {};
  let t = trozo.replace(/\\([\\*_`[~])/g, (_, c) => RESERVA(ESCAPABLES.indexOf(c)));
  const antes = t;
  t = t.replace(/\*\*(?=\S)([^*\n]+?)\*\*|__(?=\S)([^_\n]+?)__/g, (_, a, b) => a || b);
  t = t.replace(/(^|[^\w*\\])\*(?=[^\s*])([^*\n]+?)\*(?!\w)/g, '$1$2').replace(/(^|[^\w\\])_(?=[^\s_])([^_\n]+?)_(?!\w)/g, '$1$2');
  t = t.replace(/~~(?=\S)([^~\n]+?)~~/g, '$1');
  if (t !== antes) hubo.enfasis = true;
  const antes2 = t;
  t = t.replace(/`([^`\n]+)`/g, '$1');
  if (t !== antes2) hubo.codigo = true;
  if (/(^|[^!\\])\[[^\]\n]*\]\([^)\n]+\)/.test(t)) { t = t.replace(/(^|[^!\\])\[([^\]\n]*)\]\(([^)\s\n]+)[^)\n]*\)/g, '$1$2 ($3)'); hubo.enlaces = true; }
  return {t: t.replace(/[-]/g, c => ESCAPABLES[c.charCodeAt(0) - 0xE000]), hubo};
}
/* Lo contrario, al exportar: si el importador fuera a quitar algo, o el texto
   ya trae una barra invertida delante de uno de esos caracteres, se escapan. */
const protege = s => String(s == null ? '' : s).split(TROZOS).map((trozo, k) => {
  if (k % 2) return trozo;
  return quitaMarcas(trozo).t !== trozo ? trozo.replace(/[\\*_`[~]/g, '\\$&') : trozo;
}).join('');
/* En las notas solo cortan los títulos # y ## y la raya «---». */
const cortaNotas = l => (nivelTitulo(l) >= 1 && nivelTitulo(l) <= 2) || RE_CORTE.test(l);
const escapaNota = l => (cortaNotas(l) || l.startsWith('\\')) ? '\\' + l : l;
const desescapaNota = l => l.startsWith('\\') && (cortaNotas(l.slice(1)) || l[1] === '\\') ? l.slice(1) : l;

/* Celdas de una fila de tabla, con «\|» para una barra literal. */
function celdas(l) {
  let s = l.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
  const out = [];
  let actual = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && s[i + 1] === '|') { actual += '|'; i++; continue; }
    if (s[i] === '|') { out.push(actual.trim()); actual = ''; continue; }
    actual += s[i];
  }
  out.push(actual.trim());
  return out;
}

/* ---------- de Markdown a diapositivas ----------
   Devuelve {meta, portada, diapositivas, avisos}. Las diapositivas tienen ya
   la forma de crear_presentacion ({diseno, titulo, zonas, notas, minutos…});
   las imágenes llevan «archivo» tal como venía en el Markdown. */
const CLAVES_META = {
  titulo: 'titulo', title: 'titulo', titulo_corto: 'titulo_corto', short: 'titulo_corto', subtitulo: 'subtitulo', subtitle: 'subtitulo',
  autores: 'autores', autor: 'autores', author: 'autores', authors: 'autores', institucion: 'institucion', institute: 'institucion',
  institution: 'institucion', afiliacion: 'institucion', fecha: 'fecha', date: 'fecha', tema: 'tema', theme: 'tema',
  aspecto: 'aspecto', aspect: 'aspecto', acento: 'acento', accent: 'acento', tipografia: 'tipografia', font: 'tipografia'
};
function valorYaml(v) {
  v = v.trim();
  if (v.startsWith('"')) { try { return JSON.parse(v); } catch { return v.slice(1, v.endsWith('"') ? -1 : undefined); } }
  if (v.startsWith("'")) return v.slice(1, v.endsWith("'") ? -1 : undefined).replace(/''/g, "'");
  /* Lista en línea, [A. Pérez, B. Soto]: se escribe separada por comas. */
  if (/^\[.*\]$/.test(v)) return v.slice(1, -1).split(',').map(x => valorYaml(x)).filter(Boolean).join(', ');
  return v.replace(/\s+#.*$/, '');
}
function leeCabecera(lineas, avisos) {
  if (!/^---\s*$/.test(lineas[0] || '')) return null;
  const fin = lineas.findIndex((l, i) => i > 0 && /^(---|\.\.\.)\s*$/.test(l));
  if (fin < 0) return null;
  const cuerpo = lineas.slice(1, fin);
  /* Si no parece YAML, el primer «---» era un corte de diapositiva. */
  if (!cuerpo.every(l => !l.trim() || /^\s*#/.test(l) || /^[\p{L}\w-]+\s*:/u.test(l) || /^\s+-\s/.test(l))) return null;
  const meta = {};
  let lista = null;
  cuerpo.forEach((l, k) => {
    if (!l.trim() || /^\s*#/.test(l)) return;
    const item = /^\s+-\s+(.*)$/.exec(l);
    if (item) { if (lista) lista.push(valorYaml(item[1])); return; }
    const m = /^([\p{L}\w-]+)\s*:\s*(.*)$/u.exec(l);
    const clave = CLAVES_META[sinTildes(m[1]).replace(/-/g, '_')];
    lista = null;
    if (!clave) { avisos.push('Línea ' + (k + 2) + ': la clave «' + m[1] + '» de la cabecera no se usa (válidas: ' + [...new Set(Object.values(CLAVES_META))].join(', ') + ').'); return; }
    if (m[2].trim()) meta[clave] = valorYaml(m[2]);
    else { lista = []; meta[clave] = lista; }
  });
  for (const k in meta) if (Array.isArray(meta[k])) meta[k] = meta[k].join(', ');
  if (meta.aspecto) meta.aspecto = String(meta.aspecto).replace(/[^\d]/g, '');
  return {meta, siguiente: fin + 1};
}

export function leeMarkdown(texto) {
  const lineas = String(texto || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
  const avisos = [];
  const avisados = new Set();
  const avisa = (n, t, unaVez) => { if (unaVez) { if (avisados.has(unaVez)) return; avisados.add(unaVez); } avisos.push('Línea ' + n + ': ' + t); };
  const cab = leeCabecera(lineas, avisos);
  const meta = cab ? cab.meta : {};
  const portada = {tipo: 'portada', notas: '', minutos: null};
  const diapositivas = [];
  /* «titulo: ""» en la cabecera también es un título (vacío): los «#» son secciones. */
  let tituloVisto = 'titulo' in meta;
  let actual = portada;           // portada, una diapositiva o null tras «---»
  let tras_corte = false;
  let parrafo = null;             // {lineas, n}
  let lista = null;               // viñetas abiertas (siguen tras una línea en blanco)
  let pilaSangria = [];
  let notas = null;               // {destino} mientras se leen notas «Notas:»
  let divs = [];                  // «::: columnas» abiertos
  const imagenes = new Map();     // bloque → línea, para dar errores con número

  const nueva = (diseno, titulo, n) => {
    const d = {diseno, titulo, zonas: [[]], z: 0, notas: '', minutos: null, disenoExplicito: null, encabezados: null, division: null, columnas: false, n};
    diapositivas.push(d);
    actual = d; tras_corte = false; lista = null;
    return d;
  };
  /* Destino de un bloque: la diapositiva actual si admite bloques; si no, una
     diapositiva sin título (con aviso salvo que la abra un «---»). */
  const diapositivaParaBloques = n => {
    if (actual && actual !== portada && actual.diseno !== 'section') return actual;
    if (!tras_corte) avisa(n, actual && actual.diseno === 'section'
      ? 'contenido justo después de la sección «' + actual.titulo + '» sin un «## Título»: va en una diapositiva sin título.'
      : 'contenido antes de la primera diapositiva «## Título»: va en una diapositiva sin título.');
    return nueva('content', '', n);
  };
  const diapositivaParaAjustes = n => (actual ? actual : nueva('content', '', n));
  const agrega = (b, n) => {
    const d = diapositivaParaBloques(n);
    d.zonas[d.z].push(b);
    if (b.tipo !== 'bullets') lista = null;
    /* La app no tiene «debajo de las columnas»: se dice en vez de moverlo. */
    if (d.cerradas && !d.avisoCerradas) { d.avisoCerradas = true; avisa(n, 'lo que va tras el «:::» que cierra las columnas queda en la última columna.'); }
    return b;
  };

  /* Marcado en línea (quitaMarcas), con un aviso por clase en todo el archivo. */
  const enLinea = (s, n) => String(s).split(TROZOS).map((trozo, k) => {
    if (k % 2) return trozo;
    const {t, hubo} = quitaMarcas(trozo);
    if (hubo.enfasis) avisa(n, 'la app no tiene negrita, cursiva ni tachado en el texto: se quitaron las marcas.', 'enfasis');
    if (hubo.codigo) avisa(n, 'el código en línea (`…`) se dejó como texto normal.', 'codigo-en-linea');
    if (hubo.enlaces) avisa(n, 'los enlaces se escribieron como «texto (url)».', 'enlaces');
    if (/(^|[^\\])!\[[^\]\n]*\]\([^)\n]+\)/.test(trozo)) avisa(n, 'una imagen dentro de un párrafo no se inserta: ponla sola en su línea.');
    if (/(^|[^\\])\[\^[^\]]+\]/.test(trozo)) avisa(n, 'las notas al pie [^…] no existen en la app: pásalas a las notas del orador o a una referencia.', 'notas-al-pie');
    if (/<\/?[a-z][a-z0-9]*(\s[^>]*)?\/?>/i.test(trozo)) avisa(n, 'el HTML no se interpreta: queda como texto.', 'html');
    return t;
  }).join('');

  const cierraParrafo = () => {
    if (!parrafo) return;
    const {n} = parrafo;
    const crudo = parrafo.lineas.join('\n').trim();
    parrafo = null;
    if (!crudo) return;
    /* Una reacción sola en su párrafo: \ce{…} o $\ce{…}$. */
    const ce = /^\$?\\ce\{([\s\S]*)\}\$?$/.exec(crudo);
    if (ce && !/\}\s*\S/.test(ce[1].replace(/\{[^{}]*\}/g, ''))) { agrega({tipo: 'chem', tex: ce[1].trim()}, n); return; }
    /* Salto de línea duro: «\» o dos espacios al final. */
    const piezas = [];
    parrafo = null;
    crudo.split('\n').forEach((l, k, arr) => {
      const duro = /(\\|  )$/.test(l) && k < arr.length - 1;
      const limpio = desescapaParrafo(l.trim()).replace(duro ? /\s*\\?\s*$/ : /\s+$/, '');
      piezas.push(limpio + (k < arr.length - 1 ? (duro ? '\n' : ' ') : ''));
    });
    const texto = enLinea(piezas.join(''), n);
    if (actual === portada && !meta.subtitulo) { meta.subtitulo = texto.replace(/\n/g, ' '); return; }
    agrega({tipo: 'text', text: texto}, n);
  };
  const cierraNotas = () => {
    if (!notas) return;
    const t = notas.lineas.map(desescapaNota).join('\n').replace(/^\n+|\s+$/g, '');
    if (t) notas.destino.notas = notas.destino.notas ? notas.destino.notas + '\n\n' + t : t;
    notas = null;
  };
  const directiva = (contenido, n) => {
    const m = /^\s*([\p{L}_]+)\s*:\s*([\s\S]*?)\s*$/u.exec(contenido);
    if (!m) return;
    const clave = sinTildes(m[1]);
    const v = m[2];
    if (clave === 'minutos' || clave === 'minutes') {
      const x = +String(v).replace(',', '.');
      if (!(x > 0)) { avisa(n, '«minutos» debe ser un número mayor que 0; se ignoró «' + v + '».'); return; }
      diapositivaParaAjustes(n).minutos = x;
    } else if (clave === 'diseno' || clave === 'layout') {
      const d = actual && actual !== portada ? actual : nueva('content', '', n);
      d.disenoExplicito = v.trim();
    } else if (clave === 'encabezados') {
      const d = actual && actual !== portada ? actual : nueva('content', '', n);
      d.encabezados = celdas('|' + v + '|');
    } else avisa(n, 'directiva «' + m[1] + '» desconocida (válidas: minutos, diseno, encabezados); se ignoró.');
  };

  let i = cab ? cab.siguiente : 0;
  for (; i < lineas.length; i++) {
    const l = lineas[i], n = i + 1;
    if (notas) {
      if (!cortaNotas(l)) { notas.lineas.push(l); continue; }
      cierraNotas();
    }
    if (!l.trim()) { cierraParrafo(); continue; }

    /* Vallas de código: ```lang, ```chem, ```math. */
    let m = RE_VALLA.exec(l);
    if (m) {
      cierraParrafo();
      const valla = m[1], lang = m[2].toLowerCase(), cuerpo = [];
      let cerrada = false;
      for (i++; i < lineas.length; i++) {
        if (new RegExp('^ {0,3}' + valla[0] + '{' + valla.length + ',}\\s*$').test(lineas[i])) { cerrada = true; break; }
        cuerpo.push(lineas[i]);
      }
      if (!cerrada) avisa(n, 'bloque ' + valla + ' sin cerrar: llega hasta el final del archivo.');
      const t = cuerpo.join('\n');
      if (['chem', 'ce', 'mhchem'].includes(lang)) agrega({tipo: 'chem', tex: t.trim().replace(/^\\ce\{([\s\S]*)\}$/, '$1')}, n);
      else if (lang === 'math') agrega({tipo: 'math', tex: t.trim()}, n);
      else agrega({tipo: 'code', text: t, lang: m[2]}, n);
      continue;
    }
    /* $$ … $$ en una línea o en varias. */
    if (/^ {0,3}\$\$/.test(l)) {
      cierraParrafo();
      let t = l.trim().slice(2);
      let cerrada = /\$\$\s*$/.test(t);
      if (cerrada) t = t.replace(/\$\$\s*$/, '');
      else {
        const cuerpo = [t];
        for (i++; i < lineas.length; i++) {
          if (/\$\$\s*$/.test(lineas[i])) { cuerpo.push(lineas[i].replace(/\$\$\s*$/, '')); cerrada = true; break; }
          cuerpo.push(lineas[i]);
        }
        t = cuerpo.join('\n');
      }
      if (!cerrada) avisa(n, '«$$» sin cerrar: la ecuación llega hasta el final del archivo.');
      t = t.trim();
      const ce = /^\\ce\{([\s\S]*)\}$/.exec(t);
      agrega(ce ? {tipo: 'chem', tex: ce[1].trim()} : {tipo: 'math', tex: t}, n);
      continue;
    }
    /* Comentarios HTML: directivas o comentarios del autor. */
    if (/^ {0,3}<!--/.test(l)) {
      cierraParrafo(); lista = null;
      let t = l.trim().slice(4);
      while (!t.includes('-->') && i + 1 < lineas.length) t += '\n' + lineas[++i];
      const [dentro, despues] = t.split('-->');
      directiva(dentro, n);
      if (despues && despues.trim()) avisa(n, 'texto tras «-->» en la misma línea; se ignoró: «' + despues.trim().slice(0, 40) + '».');
      continue;
    }
    m = RE_TITULO.exec(l);
    if (m) {
      cierraParrafo();
      const nivel = m[1].length, t = enLinea(m[2] || '', n);
      if (nivel === 1) {
        if (!tituloVisto && !diapositivas.length) { meta.titulo = t; tituloVisto = true; actual = portada; lista = null; }
        else nueva('section', t, n);
      } else if (nivel === 2) nueva('content', t, n);
      else {
        if (nivel > 3) avisa(n, 'los títulos «' + m[1] + '» no existen en una diapositiva: van como texto grande, igual que «###».', 'titulo-profundo');
        agrega({tipo: 'text', text: t, size: 'l'}, n);
      }
      continue;
    }
    if (RE_CORTE.test(l)) { cierraParrafo(); actual = null; tras_corte = true; lista = null; continue; }
    m = RE_COLUMNAS.exec(l);
    if (m) {
      cierraParrafo(); lista = null;
      if (!m[1]) {
        if (!divs.length) { avisa(n, '«:::» de cierre sin un «::: columnas» abierto; se ignoró.'); continue; }
        if (divs.pop() === 'columnas' && actual && actual.columnas) actual.cerradas = true;
        continue;
      }
      if (sinTildes(m[1]) !== 'columnas') { divs.push('otro'); avisa(n, 'el bloque «::: ' + m[1] + '» no existe; su contenido se lee como si no estuviera.'); continue; }
      divs.push('columnas');
      const d = diapositivaParaBloques(n);
      if (d.zonas[0].length) avisa(n, 'lo que va antes de «::: columnas» queda arriba de la primera columna.');
      d.columnas = true;
      if (m[2]) {
        const x = +m[2].replace('%', '');
        if (x >= 15 && x <= 85) d.division = x; else avisa(n, 'la división de «::: columnas» debe ir de 15 a 85 (% de la primera columna); se ignoró «' + m[2] + '».');
      }
      continue;
    }
    if (RE_DIVISOR.test(l)) {
      cierraParrafo(); lista = null;
      const d = diapositivaParaBloques(n);
      d.columnas = true;
      d.z++; d.zonas[d.z] = [];
      continue;
    }
    m = RE_NOTAS.exec(l);
    if (m) {
      cierraParrafo(); lista = null;
      notas = {destino: diapositivaParaAjustes(n), lineas: [m[1]]};
      continue;
    }
    /* Citas: «> nota: …» son notas del orador; lo demás, un bloque de cita. */
    if (/^ {0,3}>/.test(l)) {
      cierraParrafo(); lista = null;
      const cuerpo = [];
      for (; i < lineas.length && /^ {0,3}>/.test(lineas[i]); i++) cuerpo.push(lineas[i].replace(/^ {0,3}> ?/, ''));
      i--;
      const nota = RE_NOTAS.exec(cuerpo[0]);
      if (nota) {
        const d = diapositivaParaAjustes(n), t = [nota[1], ...cuerpo.slice(1)].join('\n').trim();
        if (t) d.notas = d.notas ? d.notas + '\n\n' + t : t;
        continue;
      }
      let by = '';
      const ultima = /^\s*(?:—|–|--)\s*(.+)$/.exec(cuerpo[cuerpo.length - 1]);
      if (ultima && cuerpo.length > 1) { by = ultima[1].trim(); cuerpo.pop(); }
      const texto = cuerpo.map(x => desescapaCita(x.trim())).join('\n').replace(/\n{2,}/g, '\u0000').replace(/\n/g, ' ').replace(/\u0000/g, '\n');
      agrega({tipo: 'quote', text: enLinea(texto, n), by: enLinea(by, n)}, n);
      continue;
    }
    m = RE_IMAGEN.exec(l);
    if (m) {
      cierraParrafo();
      const des = s => String(s || '').replace(/\\(.)/g, '$1');
      const ruta = m[2] || m[3];
      const b = {tipo: 'image', caption: des(m[1])};
      if (/^(https?:|data:)/i.test(ruta)) b.src = ruta; else b.archivo = ruta;
      if (m[4]) b.alt = des(m[4]);
      if (m[5]) {
        const w = /(?:^|\s)(?:w|width|ancho)\s*=\s*"?(\d+(?:\.\d+)?)%?"?/.exec(m[5]);
        if (w && +w[1] > 0 && +w[1] <= 100) b.w = +w[1]; else avisa(n, 'atributos «{' + m[5] + '}» no reconocidos; usa {w=60} (% del ancho).');
      }
      imagenes.set(agrega(b, n), n);
      continue;
    }
    /* Tablas con encabezado: la segunda fila es el separador «|---|---|». */
    if (l.includes('|') && i + 1 < lineas.length && lineas[i + 1].includes('|') && lineas[i + 1].includes('-') && RE_SEPARADOR.test(lineas[i + 1])) {
      cierraParrafo();
      const cabecera = celdas(l), sep = celdas(lineas[i + 1]);
      const filas = [cabecera];
      let recortada = false;
      for (i += 2; i < lineas.length && lineas[i].trim() && lineas[i].includes('|') && !esConstruccion(lineas[i]); i++) {
        const f = celdas(lineas[i]);
        if (f.length > cabecera.length) recortada = true;
        filas.push(cabecera.map((_, k) => f[k] == null ? '' : f[k]));
      }
      if (recortada) avisa(n, 'una fila de la tabla tiene más celdas que el encabezado; las de más se quitaron.');
      const izquierda = sep.length && sep.every(c => /^:-+$/.test(c));
      const b = {tipo: 'table', header: true, align: izquierda ? 'l' : 'c', rows: filas.map(f => f.map(c => enLinea(c, n)))};
      /* Pie: «Tabla: …» justo debajo (o tras una línea en blanco). */
      let k = i;
      if (k < lineas.length && !lineas[k].trim() && k + 1 < lineas.length && RE_PIE_TABLA.test(lineas[k + 1])) k++;
      const pie = k < lineas.length ? RE_PIE_TABLA.exec(lineas[k]) : null;
      if (pie) { b.caption = enLinea(pie[1].trim(), k + 1); i = k; } else i--;
      agrega(b, n);
      continue;
    }
    m = RE_LISTA.exec(l);
    if (m && !(parrafo && /^\d/.test(m[2]) && m[1] === '')) {
      cierraParrafo();
      const sangria = ancho(m[1]);
      const d = diapositivaParaBloques(n);
      const ultimo = d.zonas[d.z][d.zonas[d.z].length - 1];
      if (!lista || ultimo !== lista) {
        lista = agrega({tipo: 'bullets', items: []}, n);
        pilaSangria = [];
      }
      if (/^\d/.test(m[2])) avisa(n, 'las listas numeradas se convierten en viñetas: escribe el número en el texto si importa.', 'numerada');
      while (pilaSangria.length && sangria < pilaSangria[pilaSangria.length - 1]) pilaSangria.pop();
      if (!pilaSangria.length || sangria > pilaSangria[pilaSangria.length - 1]) pilaSangria.push(sangria);
      let lvl = pilaSangria.length - 1;
      if (lvl > 2) { avisa(n, 'las viñetas solo tienen tres niveles: esta pasa al tercero.'); lvl = 2; }
      const t = (m[3] || '').replace(/^\[[ xX]\]\s+/, '');
      lista.items.push({t: enLinea(t, n), lvl});
      continue;
    }
    /* Continuación de una viñeta: línea sangrada, o pegada a ella sin blanco. */
    if (lista && lista.items.length && (/^\s/.test(l) || (!parrafo && !/^\s*$/.test(lineas[i - 1] || '')))) {
      const it = lista.items[lista.items.length - 1];
      it.t = (it.t + ' ' + enLinea(l.trim(), n)).trim();
      continue;
    }
    lista = null;
    if (parrafo) parrafo.lineas.push(l);
    else parrafo = {lineas: [l], n};
  }
  cierraParrafo();
  cierraNotas();
  if (divs.includes('columnas')) avisa(lineas.length, '«::: columnas» sin cerrar con «:::».');

  /* De las diapositivas en lectura a las de crear_presentacion. */
  const porZonas = {2: 'twocol', 3: 'tres', 4: 'cuadricula', 6: 'rejilla6'};
  const salida = diapositivas.map(d => {
    const o = {diseno: d.diseno, titulo: d.titulo};
    if (d.diseno !== 'section') {
      const nz = d.zonas.length;
      o.diseno = d.disenoExplicito || (nz === 1 ? 'content' : porZonas[nz] || 'content');
      if (!d.disenoExplicito && nz > 1 && !porZonas[nz]) avisa(d.n, nz + ' columnas no corresponden a ningún diseño: indica uno con <!-- diseno: … -->.');
      /* Sin bloques no se mandan zonas: un diseño sin zonas (índice) las rechazaría. */
      if (d.zonas.some(z => z.length)) o.zonas = d.zonas;
    } else if (d.disenoExplicito) o.diseno = d.disenoExplicito;
    if (d.notas) o.notas = d.notas;
    if (d.minutos != null) o.minutos = d.minutos;
    if (d.encabezados) o.encabezados = d.encabezados;
    if (d.division != null) o.division = d.division;
    return o;
  });
  return {meta, portada: {notas: portada.notas, minutos: portada.minutos}, diapositivas: salida, avisos, imagenes, lineas: diapositivas.map(d => d.n)};
}

/* ---------- de una presentación a Markdown ---------- */
const MIME_EXT = {'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg'};
const yaml = v => JSON.stringify(String(v));
const unaLinea = s => String(s == null ? '' : s).replace(/\s*\n\s*/g, ' ').trim();
const celda = s => unaLinea(s).replace(/\|/g, '\\|');
const comentario = s => String(s).replace(/--+>?/g, '—');
/* Marca de las exportaciones: solo un archivo que la lleve se sobrescribe. */
export const MARCA = '<!-- Exportado por Erlen Slides. Se puede editar y volver a importar con importar_markdown. -->';

/* zonasPorDiseno: {id: número de zonas}, de la guía de la app. */
export function aMarkdown(deck, {zonasPorDiseno, carpetaFiguras}) {
  const L = [], avisos = [], figuras = [];
  const m = deck.meta || {};
  L.push('---');
  L.push('titulo: ' + yaml(m.title || ''));
  if (m.short && m.short !== String(m.title || '').slice(0, 40)) L.push('titulo_corto: ' + yaml(m.short));
  [['subtitulo', m.subtitle], ['autores', m.authors], ['institucion', m.institute], ['fecha', m.date], ['tema', m.theme],
    ['aspecto', m.aspect], ['acento', m.acento], ['tipografia', m.fuente]].forEach(([k, v]) => { if (v) L.push(k + ': ' + yaml(v)); });
  L.push('---', MARCA, '');
  const ajustes = sl => {
    if (sl.min) L.push('<!-- minutos: ' + sl.min + ' -->');
  };
  const notas = sl => {
    if (!String(sl.notes || '').trim()) return;
    L.push('', 'Notas:');
    String(sl.notes).replace(/\s+$/, '').split('\n').forEach(x => L.push(escapaNota(x)));
  };
  const porZonas = {1: 'content', 2: 'twocol', 3: 'tres', 4: 'cuadricula', 6: 'rejilla6'};
  const perdidos = new Set();
  const bloque = (b, n, anterior) => {
    const out = [];
    switch (b.type) {
      case 'text': {
        const t = String(b.text || '').replace(/\n+$/, '');
        /* El importador quita la sangría de cada línea: no se escribe. */
        if (b.size === 'l' && !t.includes('\n') && t.trim()) out.push('### ' + protege(t.trim()));
        else if (t.trim()) out.push(t.split('\n').map(x => escapaParrafo(protege(x.trim()))).join('\\\n'));
        else return null;
        if (b.size === 's') perdidos.add('el tamaño pequeño del texto');
        if (b.align === 'center') perdidos.add('la alineación centrada del texto');
        break;
      }
      case 'bullets': {
        if (anterior && anterior.type === 'bullets') out.push('<!-- -->', '');
        const items = (b.items || []).filter(it => String(it.t || '').trim());
        if (!items.length) return null;
        /* En Markdown el nivel sale de la sangría respecto a la viñeta
           anterior: una lista no puede empezar sangrada ni saltarse un nivel. */
        const niveles = items.map(it => Math.max(0, Math.min(2, +it.lvl || 0)));
        if (niveles.some((v, j) => v > (j ? niveles[j - 1] + 1 : 0))) avisos.push('Diapositiva ' + n + ': una lista empieza sangrada o salta un nivel; al volver a importarla, cada viñeta queda como mucho un nivel por debajo de la anterior.');
        items.forEach((it, j) => out.push('  '.repeat(niveles[j]) + '- ' + protege(unaLinea(it.t))));
        if (b.step) perdidos.add('la aparición paso a paso de las viñetas');
        break;
      }
      case 'math': if (!String(b.tex || '').trim()) return null; out.push('$$', String(b.tex).trim(), '$$'); break;
      case 'chem': if (!String(b.tex || '').trim()) return null; out.push('```chem', String(b.tex).trim(), '```'); break;
      case 'code': {
        const t = String(b.text || '');
        const valla = '`'.repeat(Math.max(3, ...[...t.matchAll(/`+/g)].map(x => x[0].length + 1)));
        out.push(valla + (b.lang || ''), t, valla);
        break;
      }
      case 'table': {
        const rows = (b.rows || []).filter(Array.isArray);
        if (!rows.length) return null;
        const nc = Math.max(...rows.map(r => r.length));
        const fila = r => '| ' + Array.from({length: nc}, (_, k) => celda(protege(unaLinea(r[k])))).join(' | ') + ' |';
        out.push(fila(rows[0]), '|' + Array.from({length: nc}, () => b.align === 'l' ? ' :--- ' : ' :---: ').join('|') + '|');
        rows.slice(1).forEach(r => out.push(fila(r)));
        if (!b.header) avisos.push('Diapositiva ' + n + ': una tabla sin fila de encabezado sale con la primera fila como encabezado (Markdown no tiene tablas sin él).');
        if (b.caption) out.push('', 'Tabla: ' + protege(unaLinea(b.caption)));
        break;
      }
      case 'image': {
        const src = String(b.src || '');
        let ruta;
        const dm = /^data:([^;,]+)((?:;[^,;]*)*),(.*)$/s.exec(src);
        if (dm) {
          const ext = MIME_EXT[dm[1]];
          if (!ext) { avisos.push('Diapositiva ' + n + ': una imagen ' + dm[1] + ' no se pudo extraer.'); return ['<!-- imagen ' + comentario(dm[1]) + ' sin extraer' + (b.caption ? ': ' + comentario(unaLinea(b.caption)) : '') + ' -->']; }
          const nombre = 'diapositiva-' + String(n).padStart(2, '0') + '-' + (figuras.length + 1) + '.' + ext;
          figuras.push({nombre, bytes: /;base64/i.test(dm[2]) ? Buffer.from(dm[3], 'base64') : Buffer.from(decodeURIComponent(dm[3]), 'utf8')});
          ruta = carpetaFiguras + '/' + nombre;
        } else if (/^https?:/i.test(src)) ruta = src;
        else { avisos.push('Diapositiva ' + n + ': una imagen vacía no se exportó.'); return null; }
        const esc = s => unaLinea(s).replace(/([\]\\])/g, '\\$1');
        out.push('![' + esc(b.caption) + '](' + (/[\s()<>]/.test(ruta) ? '<' + ruta + '>' : ruta) + (b.alt ? ' "' + unaLinea(b.alt).replace(/(["\\])/g, '\\$1') + '"' : '') + ')' + (b.w ? '{w=' + b.w + '}' : ''));
        break;
      }
      case 'quote': {
        /* Un salto de línea de la cita es una línea «>» en blanco. */
        String(b.text || '').split('\n').forEach((x, j) => { if (j) out.push('>'); out.push('> ' + escapaCita(protege(x.trim()))); });
        if (b.by) out.push('> — ' + protege(unaLinea(b.by)));
        break;
      }
      case 'spacer': perdidos.add('los espaciadores'); return null;
      default: {
        const que = b.caption ? ' (pie: ' + unaLinea(b.caption).slice(0, 80) + ')' : '';
        avisos.push('Diapositiva ' + n + ': el bloque «' + b.type + '»' + que + ' no tiene equivalente en Markdown; queda como comentario y se conserva solo en el proyecto.');
        out.push('<!-- bloque «' + b.type + '»' + comentario(que) + ' sin equivalente en Markdown: se conserva en el proyecto -->');
      }
    }
    return out;
  };

  (deck.slides || []).forEach((sl, k) => {
    const n = k + 1, nz = zonasPorDiseno[sl.layout] ?? 1;
    if (k === 0 && sl.layout === 'title') { ajustes(sl); notas(sl); L.push(''); return; }
    if (k === 0) avisos.push('La primera diapositiva no es una portada: al importar se añadirá una delante.');
    if (sl.layout === 'section') {
      L.push('# ' + protege(unaLinea(sl.title)));
      ajustes(sl); notas(sl); L.push('');
      return;
    }
    const titulo = unaLinea(sl.title);
    if (titulo) L.push('## ' + protege(titulo));
    else L.push('---', '');
    const inferido = porZonas[nz];
    if (!titulo || sl.layout !== inferido) L.push('<!-- diseno: ' + sl.layout + ' -->');
    ajustes(sl);
    if (Array.isArray(sl.zt) && sl.zt.some(x => String(x || '').trim())) {
      const zt = sl.zt.map(celda);
      if (zt.some(x => comentario(x) !== x)) avisos.push('Diapositiva ' + n + ': un encabezado de zona con «--» se escribió con «—» para no cerrar el comentario.');
      L.push('<!-- encabezados: ' + zt.map(comentario).join(' | ') + ' -->');
    }
    L.push('');
    const zonas = ['blocks', 'blocks2', 'blocks3', 'blocks4', 'blocks5', 'blocks6'].slice(0, nz).map(c => sl[c] || []);
    const pinta = lista => {
      let anterior = null;
      lista.forEach(b => {
        const out = bloque(b, n, anterior);
        if (!out) return;
        L.push(...out, '');
        anterior = b;
      });
    };
    if (nz >= 2) {
      L.push('::: columnas' + ((sl.layout === 'twocol' || sl.layout === 'barra') && sl.split != null ? ' ' + sl.split : ''), '');
      zonas.forEach((z, j) => { if (j) L.push('|||', ''); pinta(z); });
      L.push(':::');
    } else pinta(zonas[0] || []);
    if (sl.citas && sl.citas.length) perdidos.add('las citas por diapositiva');
    notas(sl);
    L.push('');
  });
  if ((m.refs || []).length) avisos.push((m.refs.length === 1 ? 'La referencia' : 'Las ' + m.refs.length + ' referencias') + ' del proyecto no se exportan a Markdown; siguen en el proyecto.');
  if (perdidos.size) avisos.push('No tienen equivalente en Markdown y no se exportan: ' + [...perdidos].join(', ') + '.');
  return {md: L.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\s*$/, '\n'), figuras, avisos};
}

/* ---------- herramientas ---------- */
let zonasCache = null;
async function zonasPorDiseno() {
  if (!zonasCache) zonasCache = Object.fromEntries((await op('guia')).disenos.map(d => [d.id, d.zonas]));
  return zonasCache;
}

const META_ARGS = ['titulo', 'subtitulo', 'autores', 'institucion', 'fecha', 'tema', 'aspecto', 'acento'];

async function importa(a) {
  if ((a.archivo_md == null) === (a.markdown == null)) throw new ErrorUso('Pasa «archivo_md» (un .md de la carpeta de trabajo) o «markdown» (el texto), uno de los dos.');
  let texto, carpeta = '';
  if (a.archivo_md != null) {
    const ruta = archivoEnCarpeta(a.archivo_md, 'el archivo Markdown', MAX_MD);
    if (!EXT_MD.includes(extname(ruta).toLowerCase())) throw new ErrorUso('«archivo_md» debe ser .md, .markdown o .txt.');
    texto = readFileSync(ruta, 'utf8');
    carpeta = posix.dirname(visible(ruta));
  } else {
    texto = String(a.markdown);
    if (Buffer.byteLength(texto) > MAX_MD) throw new ErrorUso('El Markdown pasa de 2 MB.');
  }
  const destino = rutaSegura(a.archivo, '.json');
  if (!a.probar && existsSync(destino) && !a.sobrescribir) throw new ErrorUso('«' + visible(destino) + '» ya existe. Elige otro nombre o pasa sobrescribir: true (la versión anterior queda en el historial).');

  const r = leeMarkdown(texto);
  if (!r.diapositivas.length && !r.meta.titulo) throw new ErrorUso('El Markdown no tiene ni título ni diapositivas: usa «# Título» y «## Diapositiva» (ver guia_formato, convención «markdown»).');
  /* Las imágenes se buscan junto al .md, dentro de la carpeta de trabajo;
     el error dice la línea del Markdown. */
  for (const [b, n] of r.imagenes) {
    if (b.archivo == null) continue;
    if (carpeta && carpeta !== '.') b.archivo = posix.join(carpeta, b.archivo);
    try { archivoEnCarpeta(b.archivo, 'la imagen', Infinity); }
    catch (e) { throw new ErrorUso('Línea ' + n + ' del Markdown: ' + e.message); }
  }
  const meta = {...r.meta};
  META_ARGS.forEach(k => { if (a[k] != null) meta[k] = a[k]; });
  let res;
  try {
    const entrada = await preparaEntrada({...meta, diapositivas: r.diapositivas});
    res = await op('nueva', entrada);
  } catch (e) {
    /* «Diapositiva 3 del lote» se traduce a la línea del Markdown. */
    const x = /^Diapositiva (\d+) del lote/.exec(e.message);
    if (x && r.lineas[+x[1] - 1]) throw new ErrorUso('Línea ' + r.lineas[+x[1] - 1] + ' del Markdown: ' + e.message);
    throw e;
  }
  const avisosApp = [...res.avisos];
  if (r.portada.notas || r.portada.minutos) {
    res = await op('editaDiapositiva', {deck: res.deck, diapositiva: 1, notas: r.portada.notas || undefined, minutos: r.portada.minutos || undefined});
    avisosApp.push(...res.avisos);
  }
  const deck = res.deck;
  if (!a.probar) {
    guardaVersion(destino, 'importar_markdown');
    escribe(destino, deck);
  }
  const bloques = sl => ['blocks', 'blocks2', 'blocks3', 'blocks4', 'blocks5', 'blocks6'].reduce((s, k) => s + (sl[k] || []).length, 0);
  return {
    archivo: visible(destino), escrito: !a.probar, diapositivas: deck.slides.length,
    minutos: Math.round(deck.slides.reduce((s, sl) => s + (+sl.min || 0), 0) * 100) / 100,
    esquema: deck.slides.map((sl, k) => ({n: k + 1, diseno: sl.layout, titulo: k === 0 ? deck.meta.title : sl.title, bloques: bloques(sl), ...(sl.min ? {minutos: sl.min} : {}), ...(sl.notes ? {notas: true} : {})})),
    avisos: [...r.avisos, ...new Set(avisosApp)],
    nota: a.probar ? 'Solo se analizó: no se escribió nada. Repite sin «probar» para crear el proyecto.'
      : 'Revisa con revisar_presentacion y mira el mosaico con vista_previa. Las figuras de datos y las estructuras químicas se añaden después con agregar_bloque.'
  };
}

async function exporta(a) {
  const {ruta, deck} = await proyectoValidado(a.archivo);
  const base = basename(ruta, '.json');
  const junto = posix.dirname(visible(ruta));
  const destino = rutaSegura(a.destino || (junto === '.' ? '' : junto + '/') + base + '.md', '.md');
  /* El nombre por omisión suele coincidir con el guion del que se importó:
     un .md escrito a mano (con comentarios, negritas o enlaces que la
     importación quitó) no se pisa. Una exportación anterior sí. */
  if (existsSync(destino) && !readFileSync(destino, 'utf8').includes(MARCA))
    throw new ErrorUso('«' + visible(destino) + '» ya existe y no es una exportación de Erlen Slides: no se sobrescribe. Indica otro nombre en «destino».');
  const carpetaFiguras = basename(destino, extname(destino)) + '-figuras';
  const r = aMarkdown(deck, {zonasPorDiseno: await zonasPorDiseno(), carpetaFiguras});
  mkdirSync(dirname(destino), {recursive: true});
  if (r.figuras.length) {
    const dir = rutaSegura(posix.join(posix.dirname(visible(destino)), carpetaFiguras));
    mkdirSync(dir, {recursive: true});
    r.figuras.forEach(f => writeFileSync(dir + '/' + f.nombre, f.bytes));
  }
  writeFileSync(destino, r.md);
  return {
    archivo: visible(destino), bytes: statSync(destino).size, diapositivas: deck.slides.length,
    figuras: r.figuras.map(f => posix.join(posix.dirname(visible(destino)), carpetaFiguras, f.nombre).replace(/^\.\//, '')),
    avisos: r.avisos,
    nota: 'Las imágenes siguen incrustadas en el proyecto; aquí se extrajeron a ' + carpetaFiguras + '/ para que el Markdown se pueda volver a importar con importar_markdown.'
  };
}

export default {
  herramientas: [{
    name: 'importar_markdown', title: 'Importar Markdown',
    description: 'Crea una presentación desde un guion en Markdown, en una sola operación (entra entero o no entra): cabecera YAML o el primer «# » → título y metadatos; «# » → sección; «## » → diapositiva; viñetas (anidadas hasta 3 niveles); párrafos → texto; $$…$$ → ecuación; \\ce{…} o ```chem → reacción; ```lang → código; tablas | con encabezado; ![pie](ruta.png) → imagen de la carpeta; «Notas:» o «> nota:» → notas del orador; <!-- minutos: 2 --> → tiempo; --- → corte; «::: columnas» con ||| → dos columnas. Avisa de lo que no tiene equivalente. La sintaxis completa está en guia_formato (convención «markdown»).',
    inputSchema: {type: 'object', required: ['archivo'], properties: {
      archivo_md: {type: 'string', description: 'Archivo .md de la carpeta de trabajo. Las imágenes se buscan junto a él.'},
      markdown: {type: 'string', description: 'El Markdown como texto, en lugar de archivo_md. Las imágenes se buscan en la carpeta de trabajo.'},
      archivo: {type: 'string', description: 'Proyecto JSON que se crea, p. ej. «charla-hdl».'},
      sobrescribir: {type: 'boolean', description: 'Reemplaza un proyecto existente (la versión anterior queda en el historial).'},
      probar: {type: 'boolean', description: 'Solo analiza y valida: devuelve el esquema y los avisos sin escribir nada.'},
      titulo: {type: 'string'}, subtitulo: {type: 'string'}, autores: {type: 'string'}, institucion: {type: 'string'}, fecha: {type: 'string'},
      tema: {type: 'string', description: 'Id de tema (guia_formato). Manda sobre el de la cabecera, como el resto de metadatos.'},
      aspecto: {type: 'string', enum: ['169', '43']}, acento: {type: 'string', pattern: '^#[0-9a-fA-F]{6}$'}}},
    annotations: {readOnlyHint: false, destructiveHint: false, openWorldHint: false},
    run: importa
  }],
  convenciones: {
    markdown: 'importar_markdown y exportar_presentacion (formato «markdown»): cabecera YAML opcional (titulo, subtitulo, autores, institucion, fecha, tema, aspecto, acento); sin cabecera, el primer «# » es el título. «# X» sección; «## X» diapositiva; «### X» texto grande; «---» corte (diapositiva sin título); «- » viñetas (dos espacios por nivel, hasta 3); párrafo → texto (\\ o dos espacios al final = salto de línea; $…$ en línea se conserva); «$$…$$» ecuación; «\\ce{…}» solo en su párrafo, «$$\\ce{…}$$» o ```chem → reacción; ```lang → código; tabla | con fila separadora |---| (todas :--- = alineada a la izquierda) y «Tabla: pie» debajo; ![pie](ruta.png "texto alternativo"){w=60} → imagen (ruta junto al .md, dentro de la carpeta de trabajo); «> cita» con «> — Autor»; «Notas:» hasta la siguiente diapositiva o «> nota: …» → notas del orador; <!-- minutos: 2 -->, <!-- diseno: enunciado -->, <!-- encabezados: A | B -->; «::: columnas [40]» … «|||» … «:::» → columnas (2 twocol, 3 tres, 4 cuadricula). Negrita, cursiva, enlaces y HTML no existen en la app: se quitan con aviso; \\*, \\_, \\`, \\[ y \\~ escriben el carácter tal cual. La exportación no pisa un .md escrito a mano: usa «destino».'
  },
  formatos: {markdown: exporta}
};
