/* SPDX-License-Identifier: AGPL-3.0-only */
/* Analizador compartido por la interfaz y MCP; sin DOM, Node ni red. */
import {parseDocument, visit, isScalar, isAlias, LineCounter} from 'yaml';
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
   La app no admite negrita, cursiva o tachado por fragmentos, ni código en línea o enlaces: sus
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


/* ---------- escáner de cuerpo compartido (Markdown simple y Quarto) ----------
   leeMarkdown y leeQuarto comparten este escáner: no hay una segunda gramática.
   Las diferencias entre ambos quedan en la cabecera (leeCabecera /
   leeCabeceraQuarto) y en el tratamiento de divs/chunks de Quarto. */

const RE_DIV_QUARTO = /^ {0,3}(:{3,})[ \t]*(.*\S)?[ \t]*$/;
const RE_ATRIBUTO_DIV = /\{\s*\.([A-Za-z][A-Za-z0-9_-]*)/;
const RE_ANCHO_COL = /width\s*=\s*["']?(\d+(?:\.\d+)?)%?/i;

function leeDivClase(l) {
  const m = RE_DIV_QUARTO.exec(l);
  if (!m) return null;
  const colones = m[1].length;
  const resto = (m[2] || '').trim();
  if (!resto) return {colones, clase: null, ancho: null, raw: ''};
  const cm = RE_ATRIBUTO_DIV.exec(resto);
  if (!cm) return {colones, clase: 'desconocida', ancho: null, raw: resto};
  const clase = cm[1].toLowerCase();
  const wm = RE_ANCHO_COL.exec(resto);
  return {colones, clase, ancho: wm ? +wm[1] : null, raw: resto};
}
function esPausa(l) {
  return /^\s*\. \. \.\s*$/.test(l);
}
function esChunkQuarto(l) {
  /* ```{python} o ~~~{r} ; el interior {…} no es lenguaje ordinario */
  return /^ {0,3}(`{3,}|~{3,})[ \t]*\{([^}]*)\}[ \t]*$/.test(l);
}

const LENGUAJES_QUARTO = ['python', 'r', 'julia', 'ojs', 'javascript', 'js'];
const FILTROS_QUARTO = ['listing', 'include', '@', '{{<', 'shortcode'];

/* Escáner de cuerpo. `opciones` = {quarto: bool, quartoMeta}. */
function leeCuerpo(lineas, avisos, meta, opciones = {}) {
  const quarto = !!opciones.quarto;
  const qmeta = opciones.quartoMeta || null;
  const errores = opciones.errores; // array o undefined
  let bloqueante = false;
  const marcaError = (n, msg) => {
    bloqueante = true;
    if (errores) errores.push({linea: n, columna: 1, mensaje: msg});
    avisos.push('Línea ' + n + ': ' + msg + ' (se bloquea aplicar).');
  };
  const ausentes = new Set();
  const avisa = (n, t, unaVez) => { if (unaVez) { if (ausentes.has(unaVez)) return; ausentes.add(unaVez); } avisos.push('Línea ' + n + ': ' + t); };
  const portada = {tipo: 'portada', notas: '', minutos: null};
  const diapositivas = [];
  let tituloVisto = 'titulo' in meta;
  let actual = portada;
  let tras_corte = false;
  let parrafo = null;
  let lista = null;
  let pilaSangria = [];
  let notas = null;
  let divs = [];
  let colStack = null; // {cols: [{ancho, bloques}], iniciado}
  let modoInc = false; // dentro de incremental?
  let notasBlock = false;
  let fragmentBlock = false;
  const imagenes = new Map();

  const nueva = (diseno, titulo, n) => {
    const d = {diseno, titulo, zonas: [[]], z: 0, notas: '', minutos: null, disenoExplicito: null, encabezados: null, division: null, columnas: false, n, columnasQ: null};
    diapositivas.push(d);
    actual = d; tras_corte = false; lista = null; colStack = null; modoInc = false; notasBlock = false; fragmentBlock = false;
    return d;
  };
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
    // Quarto: si hay columnas abiertas, append a la columna actual; si columnasQ existe pero
    // aún no hay columna (contenido previo antes de la primera columna), va a zonas[0] (previo).
    if (quarto && d.columnasQ && d.columnasQ.length) {
      d.columnasQ[d.columnasQ.length - 1].bloques.push(b);
    } else {
      d.zonas[d.z].push(b);
    }
    if (b.tipo !== 'bullets') lista = null;
    if (d.cerradas && !d.avisoCerradas) { d.avisoCerradas = true; avisa(n, 'lo que va tras el «:::» que cierra las columnas queda en la última columna.'); }
    return b;
  };
  const enLinea = (s, n) => String(s).split(TROZOS).map((trozo, k) => {
    if (k % 2) return trozo;
    const {t, hubo} = quitaMarcas(trozo);
    if (hubo.enfasis) avisa(n, 'la app no admite negrita, cursiva ni tachado por fragmentos: se quitaron las marcas.', 'enfasis');
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
    if (esPausa(crudo)) {
      // Pausa: es un paso previo sin contenido; no se crea bloque de texto.
      // Se modela como text vacío con step? No: en Quarto `. . .` es marcador de pausa sin contenido visible.
      // El IR no lo soporta como bloque; se procesa como paso (limpia lista) para no perder el paso siguiente.
      // El adaptador IR no necesita pausa; se descarta con la semántica de paso preservada en el siguiente bloque.
      // Para no perder información, se añade un bloque text vacío con step que el modelo filtrará.
      agrega({tipo: 'text', text: '', step: true}, n);
      return;
    }
    const ce = /^\$?\\ce\{([\s\S]*)\}\$?$/.exec(crudo);
    if (ce && !/\}\s*\S/.test(ce[1].replace(/\{[^{}]*\}/g, ''))) { agrega({tipo: 'chem', tex: ce[1].trim()}, n); return; }
    const piezas = [];
    crudo.split('\n').forEach((l, k, arr) => {
      const duro = /(\\|  )$/.test(l) && k < arr.length - 1;
      const limpio = desescapaParrafo(l.trim()).replace(duro ? /\s*\\?\s*$/ : /\s+$/, '');
      piezas.push(limpio + (k < arr.length - 1 ? (duro ? '\n' : ' ') : ''));
    });
    const texto = enLinea(piezas.join(''), n);
    if (actual === portada && !meta.subtitulo) { meta.subtitulo = texto.replace(/\n/g, ' '); return; }
    const nb = (fragmentBlock || (quarto && modoInc)) ? {tipo: 'text', text: texto, step: true} : {tipo: 'text', text: texto};
    agrega(nb, n);
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
      d.encabezados = celdas('|' + v + (v.endsWith('\\') ? ' |' : '|'));
    } else avisa(n, 'directiva «' + m[1] + '» desconocida (válidas: minutos, diseno, encabezados); se ignoró.');
  };

  let i = opciones.inicio || 0;
  for (; i < lineas.length; i++) {
    const l = lineas[i], n = i + 1;
    if (quarto && notasBlock && notas) {
      const dvN = leeDivClase(l);
      if (dvN && !dvN.clase) {
        const abierto = divs.pop();
        const esperado = abierto ? abierto.colones : 3;
        if (dvN.colones !== esperado) marcaError(n, 'cierre de notas de ' + dvN.colones + ' colones no coincide con apertura de ' + esperado + '.');
        cierraNotas();
        notasBlock = false;
        if (abierto && abierto.prev) { modoInc = abierto.prev.modoInc; fragmentBlock = abierto.prev.fragmentBlock; notasBlock = abierto.prev.notasBlock; }
        // assert handled below via var check; notasBlock already false
        continue;
      }
      if (dvN && dvN.clase && dvN.clase !== 'notes') {
        // Un div anidado dentro de notas se trata como texto literal de notas (seguro), no como apertura.
      }
      notas.lineas.push(l);
      continue;
    }
    if (notas) {
      if (!cortaNotas(l)) { notas.lineas.push(l); continue; }
      cierraNotas();
    }
    if (!l.trim()) { cierraParrafo(); continue; }

    // Quarto: divisores de div {.notes} {.columns} {.column} {.incremental} {.nonincremental} {.fragment}
    if (quarto) {
      const dv = leeDivClase(l);
      if (dv) {
        cierraParrafo();
        if (dv.clase) {
          const colones = dv.colones;
          if (dv.clase === 'notes') {
            const prev = {modoInc, fragmentBlock, notasBlock};
            notasBlock = true;
            const destino = diapositivaParaAjustes(n);
            notas = {destino, lineas: []};
            divs.push({clase: 'notes', colones, prev});
          } else if (dv.clase === 'columns') {
            divs.push({clase: 'columns', colones, prev: {modoInc, fragmentBlock, notasBlock}});
            const d = diapositivaParaBloques(n);
            if (!d.columnasQ) d.columnasQ = [];
            if (d.zonas[0].length && !d.columnas) avisa(n, 'lo que va antes de «::: columns» queda arriba de la primera columna.');
            d.columnas = true;
            if (d.columnasQ.length && !colStack) colStack = {cols: d.columnasQ};
          } else if (dv.clase === 'column') {
            divs.push({clase: 'column', colones, prev: {modoInc, fragmentBlock, notasBlock}});
            const d = diapositivaParaBloques(n);
            if (!d.columnasQ) d.columnasQ = [];
            const ancho = dv.ancho != null ? Math.round(dv.ancho) : (d.columnasQ.length ? 100 : 50);
            if (d.columnasQ.length >= 6) {
              avisa(n, 'hay más de seis columnas: la séptima y siguientes se añaden a la última columna.');
            } else {
              d.columnasQ.push({ancho: Math.max(1, Math.min(100, ancho)), bloques: []});
            }
            colStack = {cols: d.columnasQ};
          } else if (dv.clase === 'incremental') {
            divs.push({clase: 'incremental', colones, prev: {modoInc, fragmentBlock, notasBlock}});
            modoInc = true;
          } else if (dv.clase === 'nonincremental') {
            divs.push({clase: 'nonincremental', colones, prev: {modoInc, fragmentBlock, notasBlock}});
            modoInc = false;
          } else if (dv.clase === 'fragment') {
            divs.push({clase: 'fragment', colones, prev: {modoInc, fragmentBlock, notasBlock}});
            fragmentBlock = true;
          } else {
            divs.push({clase: dv.clase, colones, prev: {modoInc, fragmentBlock, notasBlock}});
            avisa(n, 'el bloque «::: ' + dv.clase + '» no existe; su contenido se lee como si no estuviera.');
          }
          continue;
        } else {
          // Cierre: debe coincidir en colones con el abierto; restaura contexto previo
          const abierto = divs.pop();
          if (!abierto) { marcaError(n, '«:::» de cierre sin div abierto; se ignoró.'); continue; }
          if (abierto.colones !== dv.colones) {
            marcaError(n, 'cierre «:::' + ':' + '» de ' + dv.colones + ' colones no coincide con apertura de ' + abierto.colones + ' («' + abierto.clase + '»).');
            // Aun así se cierra para no apilar errores posteriores, restaurando contexto.
          }
          if (abierto.clase === 'notes') {
            cierraNotas();
          } else if (abierto.clase === 'incremental' || abierto.clase === 'nonincremental') {
            lista = null;
          } else if (abierto.clase === 'fragment') {
            // nada
          } else if (abierto.clase === 'column') {
            // nada
          } else if (abierto.clase === 'columns') {
            if (actual && actual.columnas) actual.cerradas = true;
          }
          if (abierto.prev) {
            modoInc = abierto.prev.modoInc;
            fragmentBlock = abierto.prev.fragmentBlock;
            notasBlock = abierto.prev.notasBlock;
            if (abierto.clase === 'fragment') fragmentBlock = abierto.prev.fragmentBlock;
            if (abierto.clase === 'incremental' || abierto.clase === 'nonincremental') { /* modoInc ya restaurado */ }
          }
          continue;
        }
      }
      if (esPausa(l)) {
        cierraParrafo();
        agrega({tipo: 'text', text: '', step: true}, n);
        continue;
      }
      // Filtros / includes / shortcodes / HTML crudo en Quarto: aviso + se conserva fuente (el caller guarda meta.guion.fuente)
      if (/\{\{\s*include/.test(l) || /\{\{<\s*include/.test(l) || /{{<\s/.test(l) || /\{\{eval/.test(l)) {
        avisa(n, 'incluye/filtro Quarto no se ejecuta ni se carga: queda en la fuente original y no se aplica como contenido.', 'filtro-quarto');
        // No se crea bloque ficticio.
        continue;
      }
      if (/^ {0,3}<(\/?[a-z][a-z0-9]*(\s[^>]*)?\/?>)/i.test(l) && /<(script|iframe|object|form)[\s>]/i.test(l)) {
        avisa(n, 'HTML crudo no se ejecuta: queda como texto y no crea bloques ficticios.', 'html-crudo-quarto');
      }
    }

    /* Vallas de código: ```lang, ```{python}, ```chem, ```math. */
    let m = RE_VALLA.exec(l);
    if (m) {
      cierraParrafo();
      const valla = m[1], langCrudo = m[2] || '', resto = l.slice(l.indexOf(valla) + valla.length).trim();
      // Quarto chunk: ```{python}
      const chunk = /^\{([^}]*)\}$/.exec(resto);
      const esChunk = !!chunk;
      let lang = langCrudo.toLowerCase();
      let chunkLang = null;
      if (esChunk) {
        const dentro = chunk[1].trim().toLowerCase();
        // {python} o {python, echo=true} → lenguaje es la primera palabra
        chunkLang = dentro.split(/[,\\s]+/)[0] || dentro;
        lang = chunkLang;
        if (!LENGUAJES_QUARTO.includes(lang)) {
          avisa(n, 'chunk «{' + dentro + '}» no es un lenguaje mostrado conocido (válidos: ' + LENGUAJES_QUARTO.join(', ') + '); se conserva como código mostrado sin ejecutar.');
        }
      }
      const cuerpo = [];
      let cerrada = false;
      for (i++; i < lineas.length; i++) {
        if (new RegExp('^ {0,3}' + valla[0] + '{' + valla.length + ',}\\s*$').test(lineas[i])) { cerrada = true; break; }
        cuerpo.push(lineas[i]);
      }
      if (!cerrada) { if (quarto) marcaError(n, 'bloque ' + valla + ' sin cerrar: llega hasta el final del archivo.'); else avisa(n, 'bloque ' + valla + ' sin cerrar: llega hasta el final del archivo.'); }
      const t = cuerpo.join('\n');
      // Opciones #| en chunks → aviso de no ejecución
      if (esChunk && cuerpo.some(x => /^#\|/.test(x.trim()))) {
        avisa(n, 'opciones «#|» de Quarto no se ejecutan: Lámina no calcula resultados, solo muestra el código.', 'chunk-opciones');
      }
      if (quarto && esChunk) {
        // Nunca se ejecuta: se importa como código mostrado.
        // El generador normalizado emite fences ordinarios sin motor ejecutable (aQuarto).
        const b = {tipo: 'code', text: t, lang: lang || 'text'};
        if (fragmentBlock || modoInc) b.step = true;
        agrega(b, n);
      } else if (['chem', 'ce', 'mhchem'].includes(lang)) agrega({tipo: 'chem', tex: t.trim().replace(/^\\ce\{([\s\S]*)\}$/, '$1')}, n);
      else if (lang === 'math') agrega({tipo: 'math', tex: t.trim()}, n);
      else {
        const b = {tipo: 'code', text: t, lang: m[2] || ''};
        if (fragmentBlock) b.step = true;
        agrega(b, n);
      }
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
      if (!cerrada) { if (quarto) marcaError(n, '«$$» sin cerrar: la ecuación llega hasta el final del archivo.'); else avisa(n, '«$$» sin cerrar: la ecuación llega hasta el final del archivo.'); }
      t = t.trim();
      const ce = /^\\ce\{([\s\S]*)\}$/.exec(t);
      if (ce) agrega({tipo: 'chem', tex: ce[1].trim()}, n);
      else {
        const b = {tipo: 'math', tex: t};
        if (fragmentBlock) b.step = true;
        agrega(b, n);
      }
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
        if (quarto) { nueva('section', t, n); }
        else if (!tituloVisto && !diapositivas.length) { meta.titulo = t; tituloVisto = true; actual = portada; lista = null; }
        else nueva('section', t, n);
      } else if (nivel === 2) nueva('content', t, n);
      else {
        if (nivel > 3) avisa(n, 'los títulos «' + m[1] + '» no existen en una diapositiva: van como texto grande, igual que «###».', 'titulo-profundo');
        { const tb = {tipo: 'text', text: t, size: 'l'}; if (fragmentBlock) tb.step = true; agrega(tb, n); }
      }
      continue;
    }
    if (RE_CORTE.test(l)) { cierraParrafo(); actual = null; tras_corte = true; lista = null; continue; }
    // Markdown antiguo «::: columnas» / «:::» / «|||» (solo si no es div Quarto ya tratado)
    if (!quarto) {
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
      const b = {tipo: 'quote', text: enLinea(texto, n), by: enLinea(by, n)};
      if (fragmentBlock) b.step = true;
      agrega(b, n);
      continue;
    }
    m = RE_IMAGEN.exec(l);
    if (m) {
      cierraParrafo();
      const des = s => String(s || '').replace(/\\(.)/g, '$1');
      const ruta = m[2] || m[3];
      const b = {tipo: 'image', caption: des(m[1])};
      if (fragmentBlock) b.step = true;
      if (m[4]) b.alt = des(m[4]);
      if (m[5]) {
        const w = /(?:^|\s)(?:w|width|ancho)\s*=\s*"?\d+(?:\.\d+)?%?"?/.exec(m[5]);
        // extraer número con el mismo regex que antes
        const wm = /(?:^|\s)(?:w|width|ancho)\s*=\s*"?(\d+(?:\.\d+)?)%?"?/.exec(m[5]);
        if (wm && +wm[1] > 0 && +wm[1] <= 100) b.w = +wm[1]; else avisa(n, 'atributos «{' + m[5] + '}» no reconocidos; usa {w=60} (% del ancho).');
      }
      if (quarto) {
        // QMD: solo data: permitido queda resuelto. Todo lo demás queda en b.archivo (sin resolver) y bloquea.
        if (/^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml)[;,]/i.test(ruta)) {
          b.src = ruta;
        } else if (/^data:/i.test(ruta)) {
          b.archivo = ruta;
          marcaError(n, 'la imagen de datos no es de un tipo ya permitido (PNG/JPEG/WebP/GIF/SVG): no se resuelve y bloquea aplicar/compilar.');
        } else {
          b.archivo = ruta;
          if (/^https?:/i.test(ruta)) {
            marcaError(n, 'una imagen remota «' + ruta + '» no se descarga ni se acepta como recurso QMD: bloquea aplicar/compilar hasta insertarla localmente.');
          } else if (ruta.split('/').includes('..')) {
            marcaError(n, 'la ruta de imagen «' + ruta + '» contiene «..» y se rechaza: no es resoluble por selección y bloquea aplicar/compilar.');
          } else if (/^(?:\/|~\/?|[a-z][a-z0-9+.-]*:)/i.test(ruta)) {
            marcaError(n, 'la ruta de imagen «' + ruta + '» es absoluta o con esquema y se rechaza: no es resoluble y bloquea aplicar/compilar.');
          } else {
            marcaError(n, 'la imagen «' + ruta + '» no está incrustada (data:) y no se resuelve automáticamente: selecciona los archivos locales o bloquea aplicar/compilar.');
          }
        }
      } else {
        if (/^(https?:|data:)/i.test(ruta)) b.src = ruta; else b.archivo = ruta;
        if (/^data:/i.test(ruta)) {
          if (!/^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml)[;,]/i.test(ruta)) {
            avisa(n, 'la imagen de datos no es de un tipo ya permitido (PNG/JPEG/WebP/GIF/SVG).', 'imagen-data');
          }
        }
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
      if (fragmentBlock) b.step = true;
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
        const nb = {tipo: 'bullets', items: []};
        if (modoInc) nb.step = true;
        else if (fragmentBlock) nb.step = true;
        lista = agrega(nb, n);
        pilaSangria = [];
      } else {
        // Si la lista ya abierta no lleva step y entramos en incremental, marcarla.
        if (modoInc && !lista.step) lista.step = true;
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
  if (divs.length) {
    const abiertas = divs.map(x => x.clase).filter(Boolean).join(', ');
    if (quarto) marcaError(lineas.length, 'div sin cerrar: ' + abiertas + '.'); else avisa(lineas.length, 'div sin cerrar: ' + abiertas + '.');
  } else if (divs.includes && divs.includes('columnas')) {
    avisa(lineas.length, '«::: columnas» sin cerrar con «:::».');
  }
  if (quarto && qmeta) {
    // Diagnóstico si hay columnas abiertas sin cerrar o >6 ya manejado por columna.
    const d0 = diapositivas.find(d => d.columnasQ && d.columnasQ.length > 6);
    if (d0) avisa(d0.n, 'hay más de seis columnas: sobran y se diagnosticaron.');
  }
  /* De las diapositivas en lectura a las de crear_presentacion. */
  const porZonas = {2: 'twocol', 3: 'tres', 4: 'cuadricula', 6: 'rejilla6'};
  const salida = diapositivas.map(d => {
    const o = {diseno: d.diseno, titulo: d.titulo};
    if (d.diseno !== 'section') {
      let zonasFinales = d.zonas;
      if (d.columnasQ && d.columnasQ.length) {
        const cols = d.columnasQ;
        const anchosQ = cols.map(c => Math.max(1, Math.min(100, Math.round(c.ancho || 100))));
        const sumaTmp = anchosQ.reduce((a, b) => a + b, 0) || 1;
        const norm = anchosQ.map(a => (a / sumaTmp) * 100);
        const zonasQ = cols.map(c => c.bloques);
        // Preservar bloques previos a las columnas: fusionalos al inicio de la primera columna
        const previo = (d.zonas[0] && d.zonas[0].length) ? d.zonas[0] : null;
        if (previo && zonasQ.length) zonasQ[0] = [...previo, ...zonasQ[0]];
        zonasFinales = zonasQ;
        o.anchoColumnasQ = norm.map(x => Math.round(x));
        const s = o.anchoColumnasQ.reduce((a, b) => a + b, 0);
        if (s !== 100 && o.anchoColumnasQ.length) o.anchoColumnasQ[o.anchoColumnasQ.length - 1] += (100 - s);
        if (cols.length === 2) o.division = Math.round(norm[0]);
      }
      const nz = zonasFinales.length;
      o.diseno = d.disenoExplicito || (nz === 1 ? 'content' : porZonas[nz] || 'content');
      if (!d.disenoExplicito && nz > 1 && !porZonas[nz]) avisa(d.n, nz + ' columnas no corresponden a ningún diseño: indica uno con <!-- diseno: … -->.');
      if (zonasFinales.some(z => z.length)) o.zonas = zonasFinales;
      // (columnas ya mapeadas arriba con previo preservado)
      else if (d.division != null) o.division = d.division;
    } else if (d.disenoExplicito) o.diseno = d.disenoExplicito;
    if (d.notas) o.notas = d.notas;
    if (d.minutos != null) o.minutos = d.minutos;
    if (d.encabezados) o.encabezados = d.encabezados;
    if (d.division != null && !o.division) o.division = d.division;
    if (d.anchoColumnasQ) o.anchoColumnasQ = d.anchoColumnasQ;
    return o;
  });
  return {meta, portada: {notas: portada.notas, minutos: portada.minutos}, diapositivas: salida, avisos, imagenes, lineas: diapositivas.map(d => d.n), errores: errores || [], bloqueante: !!bloqueante};
}


export function leeMarkdown(texto) {
  const lineas = String(texto || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
  const avisos = [];
  const cab = leeCabecera(lineas, avisos);
  const meta = cab ? cab.meta : {};
  const inicio = cab ? cab.siguiente : 0;
  return leeCuerpo(lineas, avisos, meta, {inicio, quarto: false});
}

/* ---------- de una presentación a Markdown ---------- */
const MIME_EXT = {'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg'};
const yaml = v => JSON.stringify(String(v));
const unaLinea = s => String(s == null ? '' : s).replace(/\s*\n\s*/g, ' ').trim();
/* «|» se escapa como «\|», que es lo que lee celdas(). Una «\» al final de la
   celda no debe tocar la barra que la cierra: se le pone un espacio detrás, que
   celdas() quita al recortar (el encabezado de zona, cuyo valor llega recortado,
   lo resuelve además al leerlo). Las demás «\» (el LaTeX de una celda) se
   quedan tal cual, como las escribe una persona. */
const celda = s => unaLinea(s).replace(/\\$|\|/g, m => m === '|' ? '\\|' : '\\ ');
const comentario = s => String(s).replace(/--+>?/g, '—');
/* Marca de las exportaciones: solo un archivo que la lleve se sobrescribe. */
export const MARCA = '<!-- Exportado por Lámina. Se puede editar y volver a importar con importar_markdown. -->';

/* zonasPorDiseno: {id: número de zonas}, de la guía de la app. */
export function aMarkdown(deck, {zonasPorDiseno, carpetaFiguras, incrustarFiguras = false}) {
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
        if (b.align === 'right') perdidos.add('la alineación a la derecha del texto');
        if (b.negrita === true) perdidos.add('la negrita del bloque de texto');
        if (b.cursiva === true) perdidos.add('la cursiva del bloque de texto');
        if (Array.isArray(b.formatoTexto) && b.formatoTexto.some(r => r && Number.isInteger(r.inicio) && Number.isInteger(r.fin) &&
          r.inicio < t.length && r.fin > 0 && r.fin > r.inicio && (typeof r.negrita === 'boolean' || typeof r.cursiva === 'boolean')))
          perdidos.add('la negrita y cursiva por fragmentos del texto');
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
        if (b.catalogo && typeof b.catalogo === 'object' && typeof b.catalogo.id === 'string')
          avisos.push('Diapositiva ' + n + ': Markdown no conserva la procedencia editable de esta figura; guarda el proyecto JSON y comparte sus créditos.');
        let ruta;
        const dm = /^data:([^;,]+)((?:;[^,;]*)*),(.*)$/s.exec(src);
        if (dm && incrustarFiguras) ruta = src;
        else if (dm) {
          const ext = MIME_EXT[dm[1]];
          if (!ext) { avisos.push('Diapositiva ' + n + ': una imagen ' + dm[1] + ' no se pudo extraer.'); return ['<!-- imagen ' + comentario(dm[1]) + ' sin extraer' + (b.caption ? ': ' + comentario(unaLinea(b.caption)) : '') + ' -->']; }
          const nombre = 'diapositiva-' + String(n).padStart(2, '0') + '-' + (figuras.length + 1) + '.' + ext;
          figuras.push({nombre, bytes: /;base64/i.test(dm[2]) ? Uint8Array.from(atob(dm[3]), c => c.charCodeAt(0)) : new TextEncoder().encode(decodeURIComponent(dm[3]))});
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
    const lienzoLibre = sl.lienzoLibre && nz > 0 && ['blocks','blocks2','blocks3','blocks4','blocks5','blocks6'].some(c => Array.isArray(sl[c]) && sl[c].length);
    const conectores = Array.isArray(sl.conectores) && sl.conectores.length > 0;
    const comentaConectores = () => { if (conectores) L.push('<!-- Los conectores no se conservan en Markdown; consulta el proyecto JSON. -->'); };
    if (lienzoLibre) {
      avisos.push('Diapositiva ' + n + ': la posición libre no se conserva en Markdown; el acomodo cambiará al importar.');
    }
    if (conectores) avisos.push('Diapositiva ' + n + ': los conectores no se conservan en Markdown; consulta el proyecto JSON.');
    if (k === 0 && sl.layout === 'title') { comentaConectores(); ajustes(sl); notas(sl); L.push(''); return; }
    if (k === 0) avisos.push('La primera diapositiva no es una portada: al importar se añadirá una delante.');
    if (sl.layout === 'section') {
      L.push('# ' + protege(unaLinea(sl.title)));
      comentaConectores();
      ajustes(sl); notas(sl); L.push('');
      return;
    }
    const titulo = unaLinea(sl.title);
    if (titulo) L.push('## ' + protege(titulo));
    else L.push('---', '');
    if (lienzoLibre) L.push('<!-- La posición libre no se conserva en Markdown; consulta el proyecto JSON. -->');
    comentaConectores();
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


/* ---------- Quarto: cabecera segura con yaml@2.9.1 (YAML 1.2/core) ---------- */
const TAGS_BASICOS = new Set(['tag:yaml.org,2002:str', 'tag:yaml.org,2002:int', 'tag:yaml.org,2002:float', 'tag:yaml.org,2002:bool', 'tag:yaml.org,2002:null', 'tag:yaml.org,2002:seq', 'tag:yaml.org,2002:map']);

function validaAstQuarto(doc, avisos, errores, lc) {
  const notas = []; // {tipo, tag?, pos?}
  const pushPos = (nodo) => {
    try {
      const r = nodo && nodo.range ? nodo.range[0] : null;
      if (r != null && lc) return lc.linePos(r);
    } catch {}
    return null;
  };
  visit(doc, {
    Alias(_k, nodo) { notas.push({tipo: 'alias', pos: pushPos(nodo)}); },
    Scalar(_k, nodo) {
      if (nodo.tag && !TAGS_BASICOS.has(nodo.tag)) notas.push({tipo: 'tag', tag: nodo.tag, pos: pushPos(nodo)});
    },
    Map(_k, nodo) {
      if (nodo.tag && !TAGS_BASICOS.has(nodo.tag)) notas.push({tipo: 'tag', tag: nodo.tag, pos: pushPos(nodo)});
    },
    Seq(_k, nodo) {
      if (nodo.tag && !TAGS_BASICOS.has(nodo.tag)) notas.push({tipo: 'tag', tag: nodo.tag, pos: pushPos(nodo)});
    },
    Pair(_k, nodo) {
      const clave = nodo.key;
      if (clave && !isScalar(clave)) notas.push({tipo: 'nonscalar', pos: pushPos(clave)});
      else if (clave && isScalar(clave) && clave.value === '<<') notas.push({tipo: 'merge', pos: pushPos(clave)});
      if (clave && clave.tag && !TAGS_BASICOS.has(clave.tag)) notas.push({tipo: 'tag', tag: clave.tag, pos: pushPos(clave)});
      if (nodo.value && nodo.value.tag && !TAGS_BASICOS.has(nodo.value.tag)) notas.push({tipo: 'tag', tag: nodo.value.tag, pos: pushPos(nodo.value)});
    }
  });
  for (const n of notas.slice(0, 6)) {
    const msg = n.tipo === 'alias' ? 'se rechaza alias (YAML 1.2/core).' :
      n.tipo === 'nonscalar' ? 'se rechaza clave no escalar (YAML 1.2/core).' :
      n.tipo === 'merge' ? 'se rechaza clave de merge «<<» (YAML 1.2/core).' :
      'etiqueta no básica ' + (n.tag || '').replace('tag:yaml.org,2002:', '!!') + ' (YAML 1.2/core).';
    if (n.pos && typeof n.pos.line === 'number') {
      const linea = n.pos.line + 1; // lc.linePos 1-based sobre textoYaml; +1 por «---»
      const columna = n.pos.col;
      avisos.push('Línea ' + linea + ', columna ' + columna + ': YAML: ' + msg);
      if (errores) errores.push({linea, columna, mensaje: 'YAML: ' + msg});
    } else {
      avisos.push('Línea 1: YAML: ' + msg);
      if (errores) errores.push({linea: 1, columna: 1, mensaje: 'YAML: ' + msg});
    }
  }
  return notas.length === 0;
}
function leeCabeceraQuarto(lineas, avisos, errores = []) {
  if (!/^---\s*$/.test(lineas[0] || '')) return null;
  const fin = lineas.findIndex((l, i) => i > 0 && /^(---|\.\.\.)\s*$/.test(l));
  if (fin < 0) {
    // ¿Hay front matter reconocible sin cerrar? (primera línea tras --- parece clave YAML)
    const cuerpo = lineas.slice(1);
    const pareceYaml = cuerpo.length > 0 && (/^[\p{L}\w-]+\s*:/u.test((cuerpo[0] || '').trim()) || /^[-?]/.test((cuerpo[0] || '').trim()));
    if (pareceYaml) {
      const msg = 'front matter sin cerrar «---» (se bloquea aplicar).';
      avisos.push('Línea 1: YAML: ' + msg);
      errores.push({linea: 1, columna: 1, mensaje: 'YAML: ' + msg});
      return {error: true, siguiente: lineas.length, meta: {}, quartoRaw: null, errores: [], bloqueante: true};
    }
    return null;
  }
  const textoYaml = lineas.slice(1, fin).join('\n');
  const lc = new LineCounter();
  const doc = parseDocument(textoYaml, {version: '1.2', schema: 'core', uniqueKeys: true, merge: false, lineCounter: lc});
  const posDe = e => {
    // e.pos son offsets; lc.linePos devuelve {line, col} 1-based sobre textoYaml.
    const p0 = Array.isArray(e.pos) ? e.pos[0] : e.pos;
    let linea = null, columna = null;
    try {
      const lp = lc.linePos(p0);
      if (lp && typeof lp.line === 'number') { linea = lp.line + 1; columna = lp.col; }
    } catch {}
    const m = /line (\d+), column (\d+)/i.exec(String(e.message || ''));
    if (m) { linea = (+m[1]) + 1; columna = +m[2]; }
    if (linea == null) { linea = 2; columna = 1; }
    // linea ya incluye +1 por el «---» (lp.line es 1-based sobre YAML; m es 1-based sobre YAML)
    return {linea, columna};
  };
  if (doc.errors && doc.errors.length) {
    for (const e of doc.errors.slice(0, 4)) {
      const {linea, columna} = posDe(e);
      const msg = String(e.message || 'error YAML').split('\n')[0];
      avisos.push('Línea ' + linea + ', columna ' + columna + ': YAML: ' + msg + ' (se bloquea aplicar).');
      errores.push({linea, columna, mensaje: 'YAML: ' + msg});
    }
    return {error: true, siguiente: fin + 1, meta: {}, quartoRaw: null, errores: doc.errors, bloqueante: true};
  }
  // AST ANTES de toJS (tags en maps/seqs, alias, no-escalar, merge) — si falla, NO se ejecuta toJS
  const astOk = validaAstQuarto(doc, avisos, errores, lc);
  if (!astOk) {
    return {error: true, siguiente: fin + 1, meta: {}, quartoRaw: null, errores: [{message: 'YAML no permitido'}], bloqueante: true};
  }
  let raw;
  try {
    raw = doc.toJS({maxAliasCount: 0});
  } catch (e) {
    avisos.push('Línea 1: YAML: ' + String(e.message || e).slice(0, 160) + ' (se bloquea aplicar).');
    errores.push({linea: 1, columna: 1, mensaje: 'YAML: ' + String(e.message || e).slice(0, 160)});
    return {error: true, siguiente: fin + 1, meta: {}, quartoRaw: null, errores: [e], bloqueante: true};
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    avisos.push('Línea 1: YAML: el front matter no es un objeto (se bloquea aplicar).');
    errores.push({linea: 1, columna: 1, mensaje: 'YAML: el front matter no es un objeto'});
    return {error: true, siguiente: fin + 1, meta: {}, quartoRaw: null, errores: [{message: 'no es objeto'}], bloqueante: true};
  }
  const meta = {};
  const conv = (v) => {
    if (v == null) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (Array.isArray(v)) return v.map(x => (x && typeof x === 'object' && !Array.isArray(x) && 'name' in x ? String(x.name) : String(x == null ? '' : x)).trim()).filter(Boolean).join(', ');
    if (typeof v === 'object') {
      if (!Array.isArray(v) && 'name' in v) return String(v.name);
      return '';
    }
    return String(v);
  };
  const getKey = (obj, ...nombres) => {
    for (const n of nombres) if (obj && Object.hasOwn(obj, n)) return obj[n];
    return undefined;
  };
  const titulo = getKey(raw, 'title', 'titulo');
  if (titulo != null) meta.titulo = conv(titulo);
  const subtitulo = getKey(raw, 'subtitle', 'subtitulo');
  if (subtitulo != null) meta.subtitulo = conv(subtitulo);
  const autor = getKey(raw, 'author', 'autor', 'authors', 'autores');
  if (autor != null) meta.autores = conv(autor);
  const fecha = getKey(raw, 'date', 'fecha');
  if (fecha != null) meta.fecha = conv(fecha);
  // Formato estrictamente tipado: string o objeto con revealjs (+ solo opciones conocidas)
  const format = raw.format;
  let opts = null;
  if (format !== undefined) {
    if (typeof format === 'string') {
      if (format === 'revealjs' || format === 'reveal') opts = {};
      else avisos.push('Línea 1: «format: ' + format + '» no es revealjs (válido para Quarto).');
    } else if (format && typeof format === 'object' && !Array.isArray(format)) {
      if (Object.hasOwn(format, 'revealjs')) opts = format.revealjs;
      else if (Object.hasOwn(format, 'reveal')) opts = format.reveal;
      else avisos.push('Línea 1: «format» no contiene «revealjs» (válido para Quarto).');
      // Diagnóstico de opciones desconocidas dentro de revealjs
      const conocidasFmt = new Set(['theme', 'transition', 'slide-number', 'slideNumber', 'incremental', 'embed-resources', 'html-math-method', 'title-slide-attributes', 'width', 'height', 'center', 'controls', 'preview-links', 'loop', 'margin', 'hideOnStart']);
      // Solo se avisan las no soportadas por Lámina pero que puedan cambiar render/apariencia
      const noSoportadas = ['width', 'height', 'center', 'controls', 'loop', 'margin', 'hideOnStart', 'preview-links', 'title-slide-attributes'];
      if (opts && typeof opts === 'object') {
        for (const k of Object.keys(opts)) if (noSoportadas.includes(k)) avisos.push('Línea 1: opción «format.revealjs.' + k + '» no se mapea en Lámina y no se aplica; queda en la fuente original.');
        else if (!conocidasFmt.has(k) && !/^(embed-resources|html-math-method|slide-number|slideNumber|incremental|theme|transition)$/.test(k)) {
          // Desconocida en absoluto
          avisos.push('Línea 1: opción «format.revealjs.' + k + '» desconocida; queda en la fuente original y no se aplica.');
        }
      }
    } else {
      avisos.push('Línea 1: «format» no es string ni objeto (se ignora).');
    }
  }
  // Validar forma de opts antes de usar «in»: debe ser objeto plano o undefined
  if (opts !== null && opts !== undefined) {
    if (typeof opts !== 'object' || Array.isArray(opts)) {
      avisos.push('Línea 1: «format.revealjs» no es un objeto y se ignora.');
      opts = null;
    }
  }
  const rawTheme = opts && 'theme' in opts ? opts.theme : undefined;
  const rawTrans = opts && 'transition' in opts ? opts.transition : undefined;
  let theme = 'default', transition = 'none';
  if (rawTheme !== undefined) {
    if (typeof rawTheme !== 'string' || !TEMAS_QUARTO.includes(rawTheme)) {
      avisos.push('Línea 1: «theme: ' + String(rawTheme) + '» no soportado (válidos: ' + TEMAS_QUARTO.join(', ') + '); se usa «default».');
      theme = 'default';
    } else theme = rawTheme;
  }
  if (rawTrans !== undefined) {
    if (typeof rawTrans !== 'string' || !TRANS_QUARTO.includes(rawTrans)) {
      avisos.push('Línea 1: «transition: ' + String(rawTrans) + '» no soportado (válidos: ' + TRANS_QUARTO.join(', ') + '); se usa «none».');
      transition = 'none';
    } else transition = rawTrans;
  }
  let slideNumber = true, incremental = false;
  if (opts && typeof opts === 'object') {
    const snKey = 'slide-number' in opts ? 'slide-number' : ('slideNumber' in opts ? 'slideNumber' : null);
    if (snKey) {
      const v = opts[snKey];
      if (typeof v !== 'boolean') {
        avisos.push('Línea 1: «slide-number: ' + String(v) + '» no es booleano; se usa «true».');
        slideNumber = true;
      } else slideNumber = v;
    }
    if ('incremental' in opts) {
      const v = opts.incremental;
      if (typeof v !== 'boolean') {
        avisos.push('Línea 1: «incremental: ' + String(v) + '» no es booleano; se usa «false».');
        incremental = false;
      } else incremental = v;
    }
  }
  const quarto = {theme, transition, slideNumber: !!slideNumber, incremental: !!incremental};
  const rawCopia = Object.fromEntries(Object.entries(raw));
  const conocidas = new Set(['title', 'titulo', 'subtitle', 'subtitulo', 'author', 'autor', 'authors', 'autores', 'date', 'fecha', 'format', 'execute']);
  const resto = Object.keys(raw).filter(k => !conocidas.has(k));
  if (resto.length) {
    avisos.push('Línea 1: YAML con claves no convertibles («' + resto.join(', ') + '») no se ejecutan ni se cargan; quedan en la fuente original y no crean contenido.');
  }
  if (raw.execute !== undefined) {
    avisos.push('Línea 1: configuración «execute» no se ejecuta: Lámina no calcula resultados, solo muestra el código.');
  }
  const textoTodo = textoYaml;
  if (/bibliography|references|bib/i.test(textoTodo)) {
    avisos.push('Línea 1: bibliografía externa no se carga: queda en la fuente original.');
  }
  if (/filters\s*:/i.test(textoTodo)) {
    avisos.push('Línea 1: filtros Quarto no se ejecutan: quedan en la fuente original.');
  }
  if (/include[-\s_]*inheader|include[-\s_]*before|include[-\s_]*after|include-in/i.test(textoTodo)) {
    avisos.push('Línea 1: «include-in-header/before/after» no se cargan: quedan en la fuente original.');
  }
  return {meta, siguiente: fin + 1, quartoRaw: rawCopia, quarto, errores: []};
}

/* ---------- Quarto: importación (mismo intermedio que leeMarkdown + quarto) ---------- */
export function leeQuarto(texto) {
  const lineas = String(texto || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
  const avisos = [];
  const erroresYaml = [];
  const cab = leeCabeceraQuarto(lineas, avisos, erroresYaml);
  if (cab && cab.error) {
    return {meta: cab.meta, portada: {notas: '', minutos: null}, diapositivas: [], avisos, imagenes: new Map(), lineas: [], quarto: null, quartoRaw: cab.quartoRaw, errores: erroresYaml, bloqueante: true};
  }
  const meta = cab ? cab.meta : {};
  const inicio = cab ? cab.siguiente : 0;
  const r = leeCuerpo(lineas, avisos, meta, {inicio, quarto: true, quartoMeta: cab?.quarto || null, errores: []});
  r.meta = meta;
  // Portada solo si hay título en YAML (decisión del plan): si no hay título en YAML y quedo portada vacía,
  // se evita empujarla como diapositiva desde el cuerpo. El cuerpo ya crea diapositivas sin título si hay contenido
  // antes de la primera «##»; si el cuerpo solo trae «#» secciones sin título previo, es válido.
  // Enriquecer meta.quarto para el sanitizer/adapter: solo lo que el intermedio puede llevar.
  if (cab?.quarto) {
    r.meta.quarto = {...cab.quarto};
  } else if (!('titulo' in meta)) {
    // Sin título no hay portada vacía obligatoria: si el cuerpo no produjo diapositivas y no hay título, error tipado aguas arriba.
  }
  r.quarto = cab?.quarto || null;
  r.quartoRaw = cab?.quartoRaw || null;
  // Si hubo error YAML bloqueante, marcarlo: la sintaxis mal formada bloquea aplicar.
  // bloqueante viene de leeCuerpo — no pisar
  // Construcciones válidas no soportadas (filtros/includes/etc) son avisos; según el plan solo permiten copia adaptada si hay pérdidas.
  // No se sustituyen bloques ficticios: la proyección avisa y la fuente sigue descargable (requiere meta.guion.fuente aguas arriba).
  // El adaptador de importación (web/mcp) debe rechazar aplicar si hay «recursos sin resolver» (imagen con archivo) sin selección.
  // Para dejarlo explícito para el adaptador: lista de líneas con imágenes sin resolver.
  r.recursosSinResolver = [];
  for (const [b, n] of r.imagenes) {
    if (b.archivo != null && b.src == null) r.recursosSinResolver.push({linea: n, archivo: b.archivo, caption: b.caption || ''});
  }
  return r;
}

/* ---------- Quarto: IR de importación → deckCompatible (modeloQuarto) ---------- */
/* Convierte bloques del intermedio de importación a bloques del IR de exportación.
   Los bloques no portables (chem, bblock, galeria, smart, teorema, estruct, montaje,
   geo, func, chart, video, refs, spacer) no se inventan: se reportan como no convertidos
   para que el adaptador (preparaProyectoQuarto) los rasterice o falle. Aquí se lanza
   Error con diapositiva/bloque si el adaptador no los convirtió. */
export function modeloQuarto(deckCompatible, {recursos = [], incluirNotas = false} = {}) {
  if (!deckCompatible || typeof deckCompatible !== 'object' || Array.isArray(deckCompatible)) throw new Error('modeloQuarto: el deck no es válido.');
  const meta = deckCompatible.meta || {};
  // Solo contrato real de deck: meta.title/subtitle/authors/date (operaciones nueva) + meta.quarto
  // NO se acepta meta.titulo/autores etc del intermedio de importación.
  if (meta.titulo !== undefined || meta.subtitulo !== undefined || meta.autores !== undefined || meta.fecha !== undefined) {
    throw new Error('modeloQuarto: el deck trae claves de intermedio (titulo/autores/…) en lugar de title/authors: usa el deck real, no el intermedio de leeQuarto directo.');
  }
  const titulo = String(meta.title ?? '').trim();
  const subtitulo = String(meta.subtitle ?? '').trim();
  const autorRaw = meta.authors ?? '';
  const autor = (Array.isArray(autorRaw) ? autorRaw.map(x => (x && typeof x === 'object' && !Array.isArray(x) && 'name' in x ? String(x.name) : String(x))).join(', ') : String(autorRaw ?? '')).trim();
  const fecha = String(meta.date ?? '').trim();
  const q = meta.quarto && typeof meta.quarto === 'object' && !Array.isArray(meta.quarto) ? meta.quarto : {};
  const theme = TEMAS_QUARTO.includes(q.theme) ? q.theme : 'default';
  const transition = TRANS_QUARTO.includes(q.transition) ? q.transition : 'none';
  const slideNumber = q.slideNumber === true ? true : (q.slideNumber === false ? false : true);
  const incremental = q.incremental === true;
  if (!Array.isArray(deckCompatible.slides)) throw new Error('modeloQuarto: «slides» no es válido.');
  if (deckCompatible.slides.length > 200) throw new Error('modeloQuarto: hay ' + deckCompatible.slides.length + ' diapositivas; el máximo es 200.');
  if (!deckCompatible.slides.length && !String(meta.title ?? '').trim()) throw new Error('modeloQuarto: documento totalmente vacío (sin título ni diapositivas).');
  // Copia defensiva de recursos: no mutar el array del caller.
  const recursosCopia = (Array.isArray(recursos) ? recursos.slice() : []).map(r => ({nombre: String(r?.nombre ?? ''), base64: String(r?.base64 ?? '')}));
  let contadorRecursos = 0;
  const proximoNombre = ext => {
    // Monotonic contador global a la llamada (no colisiona con nSlide*10+nBloq)
    contadorRecursos++;
    return 'assets/figura-' + contadorRecursos + '.' + ext;
  };
  const slides = deckCompatible.slides;
  const primerTitulo = slides.length && slides[0] && slides[0].layout === 'title';
  const diapositivas = [];
  const bloqueAQuarto = (b, nSlide, nBloq) => {
    if (!b || typeof b !== 'object') throw new Error('modeloQuarto: bloque no válido en la diapositiva ' + nSlide + ', bloque ' + nBloq + '.');
    const tipo = b.type;
    if (!tipo) throw new Error('modeloQuarto: bloque sin «type» en la diapositiva ' + nSlide + ', bloque ' + nBloq + ' (se esperaba el contrato de deck).');
    // Rechazar lienzoLibre / formato parcial no preparados: no se omiten en silencio.
    if (b.posLibre != null) throw new Error('modeloQuarto: la diapositiva ' + nSlide + ', bloque ' + nBloq + ' trae lienzo libre no preparado; el adaptador debe rasterizar la diapositiva completa.');
    if (b.transformacionLibre !== undefined || b.capaLibre !== undefined) throw new Error('modeloQuarto: la diapositiva ' + nSlide + ', bloque ' + nBloq + ' trae transformación/capa libre no preparada.');
    if (tipo === 'text' && Array.isArray(b.formatoTexto) && b.formatoTexto.length) throw new Error('modeloQuarto: la diapositiva ' + nSlide + ', bloque ' + nBloq + ' trae formato parcial no preparado; el adaptador debe rasterizar o aplanar.');
    switch (tipo) {
      case 'text': return {tipo: 'texto', text: String(b.text ?? ''), ...(b.step ? {step: true} : {})};
      case 'bullets': {
        const items = (b.items || []).map(it => {
          const lvlRaw = Number(it?.lvl ?? 0);
          const lvl = Number.isFinite(lvlRaw) ? Math.max(0, Math.min(2, lvlRaw)) : 0;
          return {text: String(it?.t ?? ''), nivel: lvl};
        });
        return {tipo: 'lista', items, incremental: b.step ? true : false, ...(b.step ? {step: true} : {})};
      }
      case 'code': {
        const lang = String(b.lang ?? 'text');
        if (!LANG_CODE.test(lang) || lang.includes('{') || lang.includes('}')) throw new Error('modeloQuarto: el lenguaje «' + lang + '» no es válido (diapositiva ' + nSlide + ', bloque ' + nBloq + ').');
        return {tipo: 'codigo', lang, text: String(b.text ?? ''), ...(b.step ? {step: true} : {})};
      }
      case 'math': return {tipo: 'math', tex: String(b.tex ?? ''), ...(b.step ? {step: true} : {})};
      case 'table': {
        const rows = (b.rows || []).map(r => (Array.isArray(r) ? r.map(c => String(c ?? '')) : [String(r ?? '')]));
        return {tipo: 'tabla', rows, header: b.header !== false, ...(b.step ? {step: true} : {})};
      }
      case 'quote': return {tipo: 'cita', text: String(b.text ?? ''), autor: String(b.by ?? ''), ...(b.step ? {step: true} : {})};
      case 'image': {
        const src = String(b.src ?? '');
        const dm = /^data:([^;,]+)((?:;[^,;]*)*),(.*)$/s.exec(src);
        if (dm) {
          const ext = {'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/webp': 'webp'}[dm[1].toLowerCase()];
          if (!ext) throw new Error('modeloQuarto: la imagen «' + (b.caption || 'sin pie') + '» no es PNG/JPEG/WebP (diapositiva ' + nSlide + ', bloque ' + nBloq + '); rasterízala a PNG en el adaptador.');
          const b64 = dm[3].trim();
          let bytes;
          try { bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); } catch { throw new Error('modeloQuarto: base64 inválido (diapositiva ' + nSlide + ', bloque ' + nBloq + ').'); }
          if (bytes.length > 12 * 1024 * 1024) throw new Error('modeloQuarto: la imagen «' + (b.caption || '') + '» pasa de 12 MiB (diapositiva ' + nSlide + ', bloque ' + nBloq + ').');
          const nombre = proximoNombre(ext);
          recursosCopia.push({nombre, base64: b64});
          const alt = String(b.alt ?? b.caption ?? '');
          return {tipo: 'imagen', recurso: nombre, alt, ...(b.step ? {step: true} : {})};
        }
        if (/^https?:/i.test(src)) throw new Error('modeloQuarto: la imagen remota «' + (b.caption || 'sin pie') + '» no se descarga: insértala localmente (diapositiva ' + nSlide + ', bloque ' + nBloq + ').');
        if (b.archivo != null) throw new Error('modeloQuarto: la diapositiva ' + nSlide + ', bloque ' + nBloq + ' trae una imagen sin resolver «' + String(b.archivo) + '»: el adaptador debe incrustarla (data:) o rasterizarla.');
        throw new Error('modeloQuarto: la imagen «' + (b.caption || 'sin pie') + '» no trae datos incrustados (diapositiva ' + nSlide + ', bloque ' + nBloq + '); el adaptador debe rasterizarla a PNG.');
      }
      default:
        throw new Error('modeloQuarto: la diapositiva ' + nSlide + ', bloque ' + nBloq + ' trae un bloque «' + String(tipo) + '» que el adaptador no convirtió; no se emite como IR. Rasterízalo a PNG o elimina el bloque.');
    }
  };
  for (let i = primerTitulo ? 1 : 0; i < slides.length; i++) {
    const sl = slides[i];
    if (!sl || typeof sl !== 'object') continue;
    const nSlide = i + 1;
    if (sl.lienzoLibre) throw new Error('modeloQuarto: la diapositiva ' + nSlide + ' usa lienzo libre; el adaptador debe exportar la diapositiva completa como imagen.');
    const seccion = sl.layout === 'section';
    const tituloSl = String(sl.title ?? '').trim();
    if (seccion) {
      const bloquesSec = ['blocks', 'blocks2', 'blocks3', 'blocks4', 'blocks5', 'blocks6'].reduce((a, k) => a + (Array.isArray(sl[k]) ? sl[k].length : 0), 0);
      if (bloquesSec) throw new Error('modeloQuarto: la diapositiva ' + nSlide + ' es sección pero trae ' + bloquesSec + ' bloque(s); no se omiten.');
      diapositivas.push({titulo: tituloSl, seccion: true, columnas: [{ancho: 100, bloques: []}], notas: incluirNotas ? String(sl.notes ?? '') : ''});
      continue;
    }
    // Columnas: SOLO contrato de deck (blocks/blocks2/… en orden). Nada de `zonas` ni `columnasQ` del intermedio.
    // La app normaliza con prepararZonas: blocks..blocks6 reflejan el layout. Solo aquellas con contenido
    // (o la primera si la slide está vacía) cuentan como columnas; vacías trailing se ignoran.
    const bloquesPorColumna = ['blocks', 'blocks2', 'blocks3', 'blocks4', 'blocks5', 'blocks6'].map(k => Array.isArray(sl[k]) ? sl[k] : []).filter(z => z.length);
    // Quirks: si solo hay un blocks array (content), es una columna. Si deck trae 0 zonas (title/section ya filtradas), es [[]].
    const cols = bloquesPorColumna.length ? bloquesPorColumna : [[]];
    // Recortar a número de zonas del layout si se conoce? La app ya normaliza via prepararZonas; aquí se respeta lo que haya en blocks*.
    // Pero layouts de 1 zona solo deben tener blocks; si traen blocks2 con contenido es error de preparación.
    if (cols.length > 6) throw new Error('modeloQuarto: la diapositiva ' + nSlide + ' tiene ' + cols.length + ' columnas; el máximo es 6.');
    // Anchos
    let anchos;
    if (cols.length === 1) anchos = [100];
    else if (sl.split != null || sl.division != null) {
      const div = Math.round(+(sl.split ?? sl.division));
      if (!Number.isInteger(div) || div < 1 || div > 99) throw new Error('modeloQuarto: «split» no válido en la diapositiva ' + nSlide + '.');
      if (cols.length === 2) anchos = [div, 100 - div];
      else {
        const base = Math.floor(100 / cols.length);
        anchos = cols.map((_, k) => k === cols.length - 1 ? 100 - base * k : base);
      }
    } else {
      const base = Math.floor(100 / cols.length);
      anchos = cols.map((_, k) => k === cols.length - 1 ? 100 - base * k : base);
    }
    const suma = anchos.reduce((a, b) => a + b, 0);
    if (suma !== 100) anchos[anchos.length - 1] += (100 - suma);
    const columnas = cols.map((bloques, k) => ({
      ancho: anchos[k],
      bloques: bloques.map((b, j) => bloqueAQuarto(b, nSlide, j + 1))
    }));
    diapositivas.push({titulo: tituloSl, seccion: false, columnas, notas: incluirNotas ? String(sl.notes ?? '') : ''});
  }
  return {titulo, subtitulo, autor, fecha, opciones: {theme, transition, slideNumber, incremental}, diapositivas, recursos: recursosCopia};
}

/* ---------- Quarto: modelo IR de exportación (QuartoProyecto, paso 6) ---------- */
const TEMAS_QUARTO = ['default', 'dark', 'simple', 'serif'];
const TRANS_QUARTO = ['none', 'fade', 'slide'];
const LANG_CODE = /^[A-Za-z0-9_+-]{0,40}$/;
const NOMBRE_RECURSO = /^assets\/figura-\d+\.(png|jpg|jpeg|webp)$/;
const MIME_RECURSO = {'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'webp': 'image/webp'};

function nombreRecursoSeguro(nombre) {
  if (typeof nombre !== 'string') return false;
  if (nombre.includes('..') || nombre.includes('\\') || nombre.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(nombre)) return false;
  if (nombre !== nombre.trim() || /[\u0000-\u001f\u007f]/.test(nombre)) return false;
  if (!nombre.startsWith('assets/')) return false;
  const base = nombre.slice('assets/'.length);
  if (!base || base.includes('/') || base.includes('..')) return false;
  return NOMBRE_RECURSO.test(nombre);
}
function vallaPara(texto) {
  const max = Math.max(0, ...[...String(texto ?? '').matchAll(/`+/g)].map(x => x[0].length));
  return '`'.repeat(Math.max(3, max + 1));
}
function validaMath(tex) {
  if (typeof tex !== 'string') return 'la ecuación no es texto';
  if (tex.includes('\u0000')) return 'la ecuación contiene NUL';
  if (tex.includes('{{<')) return 'la ecuación contiene un shortcode';
  for (let i = 0; i < tex.length; i++) {
    if (tex[i] === '$') {
      let bs = 0;
      for (let j = i - 1; j >= 0 && tex[j] === '\\'; j--) bs++;
      if (bs % 2 === 0) return 'la ecuación contiene un «$» no escapado';
    }
  }
  if (tex.includes('</')) return 'la ecuación contiene HTML';
  return null;
}
function escapaTextoQuarto(s) {
  let t = String(s ?? '');
  t = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  t = t.replace(/([\\`*_[\]{}#!\|$])/g, '\\$1');
  return t;
}
function escapaLineaInicioQuarto(t) {
  return t.split('\n').map(l => {
    if (/^\s*[-+>]\s/.test(l)) return l.replace(/^(\s*)([-+>])/, '$1\\$2');
    if (/^\s*\d+[.)]\s/.test(l)) return l.replace(/^(\s*\d+)([.)])/, '$1\\$2');
    if (/^\s*:::/.test(l)) return l.replace(/^(\s*)(:::)/, '$1\\$2');
    return l;
  }).join('\n');
}
function escapaInlineQuarto(s) {
  const t = escapaTextoQuarto(String(s ?? '').replace(/\s*\n\s*/g, ' ').trim());
  return escapaLineaInicioQuarto(t);
}
function escapaCeldaQuarto(s) {
  return escapaInlineQuarto(s);
}
function textoBloqueQuarto(s) {
  const t = escapaTextoQuarto(String(s ?? '').replace(/\r\n?/g, '\n'));
  return escapaLineaInicioQuarto(t);
}
function yamlQ(v) {
  // Las metadatos son texto semántico: Quarto aplica Markdown/shortcodes al title/author.
  // Se escapan literales (&<> y marcas) ANTES de quoting JSON para que salgan como texto.
  // ¡OJO! `\\` en un string YAML double-quoted es escape YAML: `\\{` es inválido ('unknown escape sequence').
  // La salida real es JSON valid-YAML: `\\{` en disco es `\\{`? No: JSON.stringify produce `\\{` como `\\{` en el texto? Simplificación:
  // usamos YAML single-quoted (sin escapes) para evitar confusión JSON/YAML. Single-quoted solo escapa ''.
  const literal = escapaInlineQuarto(String(v ?? ''));
  // Single-quoted YAML: duplicar ' y envolver.
  return "'" + literal.replace(/'/g, "''") + "'";
}

export function aQuarto(modelo, {incrustarFiguras = false} = {}) {
  if (!modelo || typeof modelo !== 'object' || Array.isArray(modelo)) throw new Error('aQuarto: el modelo Quarto no es válido.');
  const CLAVES_MODELO = new Set(['titulo', 'subtitulo', 'autor', 'fecha', 'opciones', 'diapositivas', 'recursos']);
  for (const k of Object.keys(modelo)) if (!CLAVES_MODELO.has(k)) throw new Error('aQuarto: campo desconocido «' + k + '» en el modelo.');
  if (modelo.opciones && typeof modelo.opciones === 'object' && !Array.isArray(modelo.opciones)) {
    const CLAVES_OP = new Set(['theme', 'transition', 'slideNumber', 'incremental']);
    for (const k of Object.keys(modelo.opciones)) if (!CLAVES_OP.has(k)) throw new Error('aQuarto: campo desconocido «' + k + '» en opciones.');
  }
  if (Array.isArray(modelo.diapositivas)) for (const d of modelo.diapositivas) {
    if (d && typeof d === 'object' && !Array.isArray(d)) {
      const CD = new Set(['titulo', 'seccion', 'columnas', 'notas']);
      for (const k of Object.keys(d)) if (!CD.has(k)) throw new Error('aQuarto: campo desconocido «' + k + '» en diapositiva.');
      if (Array.isArray(d.columnas)) for (const c of d.columnas) {
        if (c && typeof c === 'object' && !Array.isArray(c)) {
          const CC = new Set(['ancho', 'bloques']);
          for (const k of Object.keys(c)) if (!CC.has(k)) throw new Error('aQuarto: campo desconocido «' + k + '» en columna.');
          if (Array.isArray(c.bloques)) for (const b of c.bloques) {
            if (b && typeof b === 'object' && !Array.isArray(b)) {
              // Claves estrictas por discriminante (paridad deny_unknown_fields con Rust).
              const POR_TIPO = {
                texto: new Set(['tipo', 'text', 'step']),
                lista: new Set(['tipo', 'items', 'incremental', 'step']),
                codigo: new Set(['tipo', 'lang', 'text', 'step']),
                tabla: new Set(['tipo', 'rows', 'header', 'step']),
                cita: new Set(['tipo', 'text', 'autor', 'step']),
                math: new Set(['tipo', 'tex', 'step']),
                imagen: new Set(['tipo', 'recurso', 'alt', 'step'])
              };
              const permitidas = POR_TIPO[b.tipo];
              if (!permitidas) throw new Error('aQuarto: bloque «' + String(b.tipo) + '» desconocido (deny_unknown_fields).');
              for (const k of Object.keys(b)) if (!permitidas.has(k)) throw new Error('aQuarto: campo desconocido «' + k + '» en bloque «' + b.tipo + '» (deny_unknown_fields).');
              if (b.tipo === 'lista' && Array.isArray(b.items)) for (const it of b.items) {
                if (it && typeof it === 'object' && !Array.isArray(it)) {
                  const CI = new Set(['text', 'nivel']);
                  for (const k of Object.keys(it)) if (!CI.has(k)) throw new Error('aQuarto: campo desconocido «' + k + '» en ítem de lista (deny_unknown_fields).');
                }
              }
            }
          }
        }
      }
    }
  }
  if (Array.isArray(modelo.recursos)) for (const r of modelo.recursos) {
    if (r && typeof r === 'object' && !Array.isArray(r)) {
      const CR = new Set(['nombre', 'base64']);
      for (const k of Object.keys(r)) if (!CR.has(k)) throw new Error('aQuarto: campo desconocido «' + k + '» en recurso.');
    }
  }
  for (const k of ['titulo', 'subtitulo', 'autor', 'fecha', 'opciones', 'diapositivas', 'recursos']) {
    if (!(k in modelo)) throw new Error('aQuarto: falta «' + k + '» en el modelo Quarto.');
  }
  if (typeof modelo.titulo !== 'string' || typeof modelo.subtitulo !== 'string' || typeof modelo.autor !== 'string' || typeof modelo.fecha !== 'string')
    throw new Error('aQuarto: titulo/subtitulo/autor/fecha deben ser texto.');
  const op = modelo.opciones;
  if (!op || typeof op !== 'object' || Array.isArray(op)) throw new Error('aQuarto: «opciones» no es válido.');
  if (!TEMAS_QUARTO.includes(op.theme)) throw new Error('aQuarto: «theme» no soportado: «' + String(op.theme) + '» (válidos: ' + TEMAS_QUARTO.join(', ') + ').');
  if (!TRANS_QUARTO.includes(op.transition)) throw new Error('aQuarto: «transition» no soportado: «' + String(op.transition) + '» (válidos: ' + TRANS_QUARTO.join(', ') + ').');
  if (typeof op.slideNumber !== 'boolean' || typeof op.incremental !== 'boolean') throw new Error('aQuarto: «slideNumber»/«incremental» deben ser booleanos.');
  if (!Array.isArray(modelo.diapositivas)) throw new Error('aQuarto: «diapositivas» no es válida.');
  if (modelo.diapositivas.length > 200) throw new Error('aQuarto: hay ' + modelo.diapositivas.length + ' diapositivas; el máximo es 200.');
  if (!modelo.diapositivas.length && !modelo.titulo) throw new Error('aQuarto: documento totalmente vacío (sin título ni diapositivas).');
  if (!Array.isArray(modelo.recursos)) throw new Error('aQuarto: «recursos» no es válido.');
  if (modelo.recursos.length > 1000) throw new Error('aQuarto: hay ' + modelo.recursos.length + ' recursos; el máximo es 1000.');
  const recursosPorNombre = new Map();
  let totalBytes = 0;
  for (const r of modelo.recursos) {
    if (!r || typeof r !== 'object' || typeof r.nombre !== 'string' || typeof r.base64 !== 'string') throw new Error('aQuarto: un recurso no es válido.');
    if (!nombreRecursoSeguro(r.nombre)) throw new Error('aQuarto: el nombre de recurso «' + r.nombre + '» no es seguro.');
    if (recursosPorNombre.has(r.nombre)) throw new Error('aQuarto: el recurso «' + r.nombre + '» está duplicado.');
    const ext = r.nombre.split('.').pop().toLowerCase();
    if (!MIME_RECURSO[ext]) throw new Error('aQuarto: la extensión de «' + r.nombre + '» no es PNG/JPEG/WebP.');
    let bytesRec;
    try { bytesRec = Uint8Array.from(atob(r.base64), c => c.charCodeAt(0)); } catch { throw new Error('aQuarto: el base64 de «' + r.nombre + '» no es válido.'); }
    if (bytesRec.length > 12 * 1024 * 1024) throw new Error('aQuarto: el recurso «' + r.nombre + '» pasa de 12 MiB.');
    const sigOk = (ext === 'png' && bytesRec.length >= 8 && bytesRec[0] === 0x89 && bytesRec[1] === 0x50 && bytesRec[2] === 0x4e && bytesRec[3] === 0x47 && bytesRec[4] === 0x0d && bytesRec[5] === 0x0a && bytesRec[6] === 0x1a && bytesRec[7] === 0x0a) || (ext === 'webp' && bytesRec.length >= 12 && bytesRec[0] === 0x52 && bytesRec[1] === 0x49 && bytesRec[2] === 0x46 && bytesRec[3] === 0x46 && bytesRec[8] === 0x57 && bytesRec[9] === 0x45 && bytesRec[10] === 0x42 && bytesRec[11] === 0x50) || ((ext === 'jpg' || ext === 'jpeg') && bytesRec.length >= 10 && bytesRec[0] === 0xff && bytesRec[1] === 0xd8 && bytesRec[2] === 0xff && bytesRec[3] >= 0xe0 && bytesRec[3] <= 0xef);
    if (!sigOk) throw new Error('aQuarto: la firma binaria de «' + r.nombre + '» no corresponde a ' + ext + '.');
    totalBytes += bytesRec.length;
    if (totalBytes > 64 * 1024 * 1024) throw new Error('aQuarto: los recursos pasan de 64 MiB decodificados.');
    recursosPorNombre.set(r.nombre, r);
  }
  const figuras = [];
  const seenFiguras = new Set();
  const dias = modelo.diapositivas.map((d, k) => {
    if (!d || typeof d !== 'object' || Array.isArray(d)) throw new Error('aQuarto: la diapositiva ' + (k + 1) + ' no es válida.');
    if (typeof d.titulo !== 'string' || typeof d.seccion !== 'boolean' || !Array.isArray(d.columnas) || typeof d.notas !== 'string')
      throw new Error('aQuarto: la diapositiva ' + (k + 1) + ' tiene campos inválidos.');
    if (d.columnas.length > 6) throw new Error('aQuarto: la diapositiva ' + (k + 1) + ' tiene ' + d.columnas.length + ' columnas; el máximo es 6.');
    if (!d.columnas.length) throw new Error('aQuarto: la diapositiva ' + (k + 1) + ' no tiene columnas.');
    const suma = d.columnas.reduce((s, c) => s + (+c?.ancho || 0), 0);
    if (suma !== 100) throw new Error('aQuarto: la diapositiva ' + (k + 1) + ' tiene anchos que suman ' + suma + ' (deben sumar 100).');
    for (const c of d.columnas) {
      if (!c || typeof c !== 'object' || !Array.isArray(c.bloques)) throw new Error('aQuarto: una columna de la diapositiva ' + (k + 1) + ' no es válida.');
      if (!Number.isInteger(c.ancho) || c.ancho < 1 || c.ancho > 100) throw new Error('aQuarto: el ancho «' + String(c.ancho) + '» de la diapositiva ' + (k + 1) + ' no es un entero de 1 a 99.');
      for (const b of c.bloques) {
        if (!b || typeof b !== 'object' || Array.isArray(b)) throw new Error('aQuarto: un bloque de la diapositiva ' + (k + 1) + ' no es válido.');
        const tipo = b.tipo;
        if (!['texto', 'lista', 'codigo', 'tabla', 'cita', 'math', 'imagen'].includes(tipo))
          throw new Error('aQuarto: la diapositiva ' + (k + 1) + ' trae un bloque «' + String(tipo) + '» que el adaptador no convirtió; no se emite un comentario vacío.');
        if (b.step != null && typeof b.step !== 'boolean') throw new Error('aQuarto: «step» no es booleano en la diapositiva ' + (k + 1) + '.');
        if (tipo === 'texto' && typeof b.text !== 'string') throw new Error('aQuarto: un bloque «texto» sin «text» en la diapositiva ' + (k + 1) + '.');
        if (tipo === 'lista') {
          if (!Array.isArray(b.items)) throw new Error('aQuarto: una lista sin «items» en la diapositiva ' + (k + 1) + '.');
          if (typeof b.incremental !== 'boolean') throw new Error('aQuarto: una lista sin «incremental» booleano en la diapositiva ' + (k + 1) + '.');
          for (const it of b.items) {
            if (!it || typeof it.text !== 'string' || ![0, 1, 2].includes(it.nivel)) throw new Error('aQuarto: un ítem de lista inválido en la diapositiva ' + (k + 1) + '.');
          }
        }
        if (tipo === 'codigo') {
          if (typeof b.lang !== 'string' || typeof b.text !== 'string') throw new Error('aQuarto: un bloque «codigo» sin «lang»/«text» en la diapositiva ' + (k + 1) + '.');
          if (!LANG_CODE.test(b.lang)) throw new Error('aQuarto: el lenguaje «' + b.lang + '» contiene caracteres no permitidos en la diapositiva ' + (k + 1) + '.');
        }
        if (tipo === 'tabla') {
          if (!Array.isArray(b.rows) || !b.rows.length || b.rows.some(r => !Array.isArray(r) || r.some(c => typeof c !== 'string'))) throw new Error('aQuarto: una tabla inválida en la diapositiva ' + (k + 1) + '.');
          if (typeof b.header !== 'boolean') throw new Error('aQuarto: una tabla sin «header» booleano en la diapositiva ' + (k + 1) + '.');
        }
        if (tipo === 'cita') {
          if (typeof b.text !== 'string' || typeof b.autor !== 'string') throw new Error('aQuarto: una cita sin «text»/«autor» en la diapositiva ' + (k + 1) + '.');
        }
        if (tipo === 'math') {
          if (typeof b.tex !== 'string') throw new Error('aQuarto: una ecuación sin «tex» en la diapositiva ' + (k + 1) + '.');
          const e = validaMath(b.tex);
          if (e) throw new Error('aQuarto: la diapositiva ' + (k + 1) + ': ' + e + ' (diapositiva/bloque).');
        }
        if (tipo === 'imagen') {
          if (typeof b.recurso !== 'string' || typeof b.alt !== 'string') throw new Error('aQuarto: una imagen sin «recurso»/«alt» en la diapositiva ' + (k + 1) + '.');
          if (!nombreRecursoSeguro(b.recurso)) throw new Error('aQuarto: la imagen «' + b.recurso + '» no es un recurso permitido en la diapositiva ' + (k + 1) + '.');
          if (!recursosPorNombre.has(b.recurso)) throw new Error('aQuarto: la imagen «' + b.recurso + '» no aparece en «recursos» (diapositiva ' + (k + 1) + ').');
        }
      }
    }
    return d;
  });
  const L = [];
  L.push('---');
  if (modelo.titulo) L.push('title: ' + yamlQ(modelo.titulo));
  if (modelo.subtitulo) L.push('subtitle: ' + yamlQ(modelo.subtitulo));
  if (modelo.autor) L.push('author: ' + yamlQ(modelo.autor));
  if (modelo.fecha) L.push('date: ' + yamlQ(modelo.fecha));
  L.push('format:');
  L.push('  revealjs:');
  L.push('    theme: ' + op.theme);
  L.push('    transition: ' + op.transition);
  L.push('    slide-number: ' + String(op.slideNumber));
  L.push('    incremental: ' + String(op.incremental));
  L.push('    embed-resources: true');
  L.push('    html-math-method: mathml');
  L.push('execute:');
  L.push('  enabled: false');
  L.push('  eval: false');
  L.push('---', '');
  const pintaBloque = (b) => {
    if (b.tipo === 'texto') {
      const t = b.text.trim();
      if (!t) return;
      if (b.step) { L.push('::: {.fragment}'); L.push(textoBloqueQuarto(t)); L.push(':::'); }
      else L.push(textoBloqueQuarto(t));
      L.push('');
    } else if (b.tipo === 'lista') {
      if (b.step && !(b.items.length > 0 && b.incremental)) L.push('::: {.fragment}');
      const envolver = b.items.length > 0 && b.incremental;
      if (envolver) L.push('::: {.incremental}');
      for (const it of b.items) L.push('  '.repeat(it.nivel) + '- ' + escapaInlineQuarto(it.text));
      if (envolver) L.push(':::');
      if (b.step && !(b.items.length > 0 && b.incremental)) L.push(':::');
      L.push('');
    } else if (b.tipo === 'codigo') {
      const valla = vallaPara(b.text);
      if (b.step) L.push('::: {.fragment}');
      L.push(valla + b.lang);
      L.push(String(b.text));
      L.push(valla);
      if (b.step) L.push(':::');
      L.push('');
    } else if (b.tipo === 'tabla') {
      if (b.step) L.push('::: {.fragment}');
      const rows = b.rows.map(r => r.map(escapaCeldaQuarto));
      const nc = Math.max(...rows.map(r => r.length));
      const fila = r => '| ' + Array.from({length: nc}, (_, k) => (r[k] ?? '')).join(' | ') + ' |';
      if (b.header) {
        L.push(fila(rows[0]));
        L.push('|' + Array.from({length: nc}, () => ' :---: ').join('|') + '|');
        rows.slice(1).forEach(r => L.push(fila(r)));
      } else {
        // Tablas sin cabecera: header sintético vacío + separador, seguidos de TODAS las filas
        // (no se promueve la fila 0 a header; así se conserva la semántica al releer).
        L.push('|' + Array.from({length: nc}, () => '  ').join(' | ') + ' |');
        L.push('|' + Array.from({length: nc}, () => ' :---: ').join('|') + '|');
        rows.forEach(r => L.push(fila(r)));
      }
      if (b.step) L.push(':::');
      L.push('');
    } else if (b.tipo === 'cita') {
      if (b.step) L.push('::: {.fragment}');
      String(b.text).split('\n').forEach((x, j) => { if (j) L.push('>'); L.push('> ' + escapaInlineQuarto(x.trim())); });
      if (b.autor) L.push('> — ' + escapaInlineQuarto(b.autor));
      if (b.step) L.push(':::');
      L.push('');
    } else if (b.tipo === 'math') {
      if (b.step) L.push('::: {.fragment}');
      L.push('$$');
      L.push(String(b.tex).trim());
      L.push('$$');
      if (b.step) L.push(':::');
      L.push('');
    } else if (b.tipo === 'imagen') {
      if (b.step) L.push('::: {.fragment}');
      const rec = recursosPorNombre.get(b.recurso);
      let ruta = b.recurso;
      if (incrustarFiguras && rec) {
        const ext = rec.nombre.split('.').pop().toLowerCase();
        ruta = 'data:' + MIME_RECURSO[ext] + ';base64,' + rec.base64;
      } else if (rec && !incrustarFiguras) {
        if (!seenFiguras.has(rec.nombre)) { seenFiguras.add(rec.nombre); figuras.push({nombre: rec.nombre, bytes: Uint8Array.from(atob(rec.base64), c => c.charCodeAt(0))}); }
      }
      const altTxt = escapaInlineQuarto(String(b.alt ?? ''));
      L.push('![' + altTxt + '](' + (/[\s()<>]/.test(ruta) && !ruta.startsWith('data:') ? '<' + ruta + '>' : ruta) + ')');
      if (b.step) L.push(':::');
      L.push('');
    }
  };
  for (const d of dias) {
    if (d.seccion) {
      L.push('# ' + escapaInlineQuarto(d.titulo));
      L.push('');
      if (d.notas.trim()) {
        L.push('::: {.notes}');
        L.push(textoBloqueQuarto(d.notas.trim()));
        L.push(':::');
        L.push('');
      }
      continue;
    }
    L.push('## ' + escapaInlineQuarto(d.titulo));
    if (d.columnas.length === 1) {
      for (const b of d.columnas[0].bloques) pintaBloque(b);
    } else {
      L.push('');
      L.push(':::: {.columns}');
      for (const c of d.columnas) {
        L.push('');
        L.push('::: {.column width="' + c.ancho + '%"}');
        for (const b of c.bloques) pintaBloque(b);
        L.push(':::');
      }
      L.push('');
      L.push('::::');
      L.push('');
    }
    if (d.notas.trim()) {
      L.push('::: {.notes}');
      L.push(textoBloqueQuarto(d.notas.trim()));
      L.push(':::');
      L.push('');
    }
  }
  let qmd = L.join('\n');
  qmd = qmd.replace(/\n+$/, '') + '\n';
  if (new TextEncoder().encode(qmd).length > 2 * 1024 * 1024) throw new Error('aQuarto: el texto generado pasa de 2 MiB.');
  return {qmd, figuras};
}
