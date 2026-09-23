/* ==== 88e-informe.js ==== */
'use strict';
/* ================= un informe de Erlen DoE, como presentación nueva =================
   DoE envía su informe (tipo `informe-v1` del contrato de la suite,
   docs/intercambio-doe.md del portal) para contarlo en una reunión de grupo.
   Aquí se valida, se convierte en diapositivas y se enseña antes de crear
   nada: la presentación nace nueva en la biblioteca solo tras confirmarlo, la
   que estaba abierta se conserva y la copia de intercambio no se toca (se
   borra, si acaso, en la página de recursos de la suite).

   La conversión es un borrador para hablar, no un facsímil del informe: el
   texto se reparte con el mismo umbral de palabras que 66-carga.js considera
   una diapositiva hablada, las tablas se recortan a lo que se lee de lejos y
   las figuras pasan a gráficas de datos editables. Todo recorte se dice en el
   pie de la tabla o de la figura y en las notas; nada se inventa. */

/* Límites del tipo, tal como los fija el contrato. */
const INFORME_LIMITES = { secciones: 30, bloques: 200, bytes: 2 * 1024 * 1024, columnas: 50, filas: 500, series: 8, puntos: 20000, marcas: 40, regiones: 20 };
/* Lo que cabe en una diapositiva. Las palabras siguen el umbral «media» de
   66-carga.js: más de 60 ya es mucho para una diapositiva hablada. El alto se
   mide, no se adivina: en Chromium, una diapositiva de contenido 16:9 con
   Metropolis deja un cuerpo de 1280 × 601 px de lienzo; caben nueve bloques de
   texto de una línea (37 px de línea y 26 de separación), diez viñetas y una
   tabla de ocho filas cortas con su pie (cada fila de una línea, 52 px). El
   modelo de abajo usa esas medidas con margen. La presentación nace con ese
   tema y esa proporción a propósito: con otro tema cambian las letras, y
   «Preparar mi charla» avisa entonces de lo que no quepa. */
const INF_PALABRAS = 55, INF_VINETAS = 7, INF_COLUMNAS = 7, INF_CELDA = 48, INF_PUNTOS = 4000;
const INF_ALTO = 601, INF_ANCHO = 1180;
const infLineas = (t, cpl) => Math.max(1, Math.ceil(String(t).length / cpl));
const infAltoTexto = t => 26 + 37 * infLineas(t, 72);
const infAltoVineta = t => 18 + 37 * infLineas(t, 64);
/* Alto útil bajo un título (que puede ocupar varias líneas) y el subtítulo. */
const infDisponible = titulo => INF_ALTO - 20 - 40 * (infLineas(titulo, 60) - 1) - 30;
/* Cuántos caracteres de un párrafo (o una viñeta) caben en ese alto. */
const infCaracteres = (alto, cpl) => Math.max(cpl, Math.floor((alto - 26) / 37) * cpl);

const infTexto = v => typeof v === 'string';
const infObjeto = v => v !== null && typeof v === 'object' && !Array.isArray(v);
function infFalla(msg) { throw new Error(msg); }
function infCadena(v, donde, max) {
  if (v == null) return '';
  if (!infTexto(v)) infFalla(donde + ' debe ser texto.');
  if (max && v.length > max) infFalla(donde + ' supera ' + max + ' caracteres.');
  return v;
}

/* ---------- validar ----------
   Devuelve el informe normalizado o lanza un Error con el motivo en español
   llano. No toca el estado: se llama antes de enseñar nada. */
function leeInforme(payload) {
  if (!infObjeto(payload) || payload.format !== 'erlen-context-copy-v1') infFalla('La copia no tiene el formato de intercambio de Erlen.');
  if (payload.kind !== 'informe-v1') infFalla('Esta copia es de tipo «' + String(payload.kind).slice(0, 40) + '». Slides abre como presentación los informes de Erlen DoE (informe-v1).');
  if (!infObjeto(payload.source) || payload.source.tool !== 'doe') infFalla('Esta copia viene de «' + String(infObjeto(payload.source) ? payload.source.tool : '?').slice(0, 40) + '». Slides solo abre como presentación los informes de Erlen DoE.');
  const s = payload.snapshot;
  if (!infObjeto(s)) infFalla('La copia no trae el informe.');
  if (new TextEncoder().encode(JSON.stringify(s)).length > INFORME_LIMITES.bytes) infFalla('El informe supera 2 MiB, el límite del tipo informe-v1.');
  const titulo = infCadena(s.titulo, 'El título del informe', 300).trim();
  if (!titulo) infFalla('El informe no tiene título.');
  if (!Array.isArray(s.secciones) || !s.secciones.length) infFalla('El informe no trae secciones.');
  if (s.secciones.length > INFORME_LIMITES.secciones) infFalla('El informe trae ' + s.secciones.length + ' secciones; el tipo admite ' + INFORME_LIMITES.secciones + '.');
  let nBloques = 0, simulado = false;
  const secciones = s.secciones.map((sec, i) => {
    const donde = 'La sección ' + (i + 1);
    if (!infObjeto(sec)) infFalla(donde + ' no es válida.');
    if (!Array.isArray(sec.bloques)) infFalla(donde + ' no trae su lista de bloques.');
    nBloques += sec.bloques.length;
    if (nBloques > INFORME_LIMITES.bloques) infFalla('El informe trae más de ' + INFORME_LIMITES.bloques + ' bloques, el límite del tipo.');
    const bloques = sec.bloques.map((b, j) => {
      const dondeB = donde + ', bloque ' + (j + 1);
      if (!infObjeto(b)) infFalla(dondeB + ' no es válido.');
      if (b.tipo === 'parrafo') return { tipo: 'parrafo', texto: infCadena(b.texto, dondeB) };
      if (b.tipo === 'lista') {
        if (!Array.isArray(b.elementos) || !b.elementos.every(infTexto)) infFalla(dondeB + ': la lista debe ser de textos.');
        return { tipo: 'lista', elementos: b.elementos.slice() };
      }
      if (b.tipo === 'tabla') return infTabla(b, dondeB);
      if (b.tipo === 'figura') {
        const f = infFigura(b.figura, dondeB);
        if (f.simulado) simulado = true;
        return { tipo: 'figura', titulo: infCadena(b.titulo, dondeB + ' (título)', 300), figura: f };
      }
      return infFalla(dondeB + ' es de tipo «' + String(b.tipo).slice(0, 30) + '», que el tipo informe-v1 no define.');
    });
    return { titulo: infCadena(sec.titulo, donde + ' (título)', 300).trim(), bloques };
  });
  const p = s.procedencia;
  if (p != null && !infObjeto(p)) infFalla('La procedencia del informe no es válida.');
  const procedencia = { app: infCadena(p && p.app, 'La aplicación de origen', 200), proyecto: infCadena(p && p.proyecto, 'El proyecto de origen', 300), simulado: !!(p && p.simulado === true) };
  return {
    titulo, subtitulo: infCadena(s.subtitulo, 'El subtítulo', 300), fecha: infCadena(s.fecha, 'La fecha', 60),
    secciones, procedencia, simulado: simulado || procedencia.simulado,
    fuente: { titulo: infCadena(payload.source.title, 'El título de origen', 300), version: infCadena(payload.source.version, 'La versión de origen', 60) }
  };
}
function infTabla(b, donde) {
  if (!Array.isArray(b.columns) || !b.columns.every(infTexto)) infFalla(donde + ': la tabla no trae los nombres de sus columnas.');
  if (b.columns.length > INFORME_LIMITES.columnas) infFalla(donde + ': la tabla tiene ' + b.columns.length + ' columnas; el tipo admite ' + INFORME_LIMITES.columnas + '.');
  if (!Array.isArray(b.data)) infFalla(donde + ': la tabla no trae sus filas.');
  if (b.data.length > INFORME_LIMITES.filas) infFalla(donde + ': la tabla tiene ' + b.data.length + ' filas; el tipo admite ' + INFORME_LIMITES.filas + '.');
  const celdaOk = c => c === null || infTexto(c) || typeof c === 'boolean' || (typeof c === 'number' && Number.isFinite(c));
  b.data.forEach((r, i) => {
    if (!Array.isArray(r) || !r.every(celdaOk)) infFalla(donde + ': la fila ' + (i + 1) + ' de la tabla no es válida.');
    if (r.length > b.columns.length) infFalla(donde + ': la fila ' + (i + 1) + ' tiene más celdas que columnas.');
  });
  return { tipo: 'tabla', titulo: infCadena(b.titulo, donde + ' (título)', 300), columns: b.columns.slice(), data: b.data.map(r => r.slice()) };
}
/* Una figura-xy-v1 completa, con los límites de ese tipo. */
function infFigura(f, donde) {
  if (!infObjeto(f)) infFalla(donde + ': la figura no trae sus datos.');
  if (!Array.isArray(f.series) || f.series.length > INFORME_LIMITES.series) infFalla(donde + ': la figura debe traer hasta ' + INFORME_LIMITES.series + ' series.');
  const num = v => typeof v === 'number' && Number.isFinite(v);
  const series = f.series.map((s, i) => {
    if (!infObjeto(s) || !Array.isArray(s.x) || !Array.isArray(s.y) || s.x.length !== s.y.length) infFalla(donde + ': la serie ' + (i + 1) + ' no trae x e y de igual longitud.');
    if (s.x.length > INFORME_LIMITES.puntos) infFalla(donde + ': la serie ' + (i + 1) + ' supera ' + INFORME_LIMITES.puntos + ' puntos.');
    if (!s.x.every(num) || !s.y.every(num)) infFalla(donde + ': la serie ' + (i + 1) + ' tiene valores no numéricos.');
    if (s.estilo != null && s.estilo !== 'lineas' && s.estilo !== 'puntos') infFalla(donde + ': la serie ' + (i + 1) + ' tiene un estilo desconocido.');
    return { nombre: infCadena(s.nombre, donde + ' (nombre de serie)', 200), x: s.x, y: s.y, estilo: s.estilo || 'lineas' };
  });
  const lista = (v, max, que) => {
    if (v == null) return [];
    if (!Array.isArray(v) || v.length > max) infFalla(donde + ': la figura admite hasta ' + max + ' ' + que + '.');
    return v;
  };
  const marcas = lista(f.marcas, INFORME_LIMITES.marcas, 'marcas').map(m => {
    if (!infObjeto(m) || !num(m.x)) infFalla(donde + ': una marca de la figura no es válida.');
    return { x: m.x, etiqueta: infCadena(m.etiqueta, donde + ' (marca)', 200) };
  });
  const regiones = lista(f.regiones, INFORME_LIMITES.regiones, 'regiones').map(r => {
    if (!infObjeto(r) || !num(r.desde) || !num(r.hasta)) infFalla(donde + ': una región de la figura no es válida.');
    return { desde: r.desde, hasta: r.hasta, etiqueta: infCadena(r.etiqueta, donde + ' (región)', 200) };
  });
  return {
    titulo: infCadena(f.titulo, donde + ' (título de la figura)', 300), xLabel: infCadena(f.xLabel, donde + ' (eje x)', 200), yLabel: infCadena(f.yLabel, donde + ' (eje y)', 200),
    invertirX: f.invertirX === true, series, marcas, regiones, nota: infCadena(f.nota, donde + ' (nota)', 1000), simulado: f.simulado === true
  };
}

/* ---------- convertir ---------- */
/* El informe es texto plano: el «$» de Slides abre matemáticas y «[@clave]»
   una cita. Se escapan para que se vea lo que escribió DoE: el «$» con su
   barra (la convención de inlineRich y del .tex) y la cita con un espacio duro
   tras el corchete, que LaTeX también sabe escribir. */
const infPlano = t => String(t == null ? '' : t).replace(/\$/g, '\\$').replace(/\[@(?=[A-Za-z0-9])/g, '[\u00a0@');
const infPalabras = t => (String(t).trim().match(/\S+/g) || []).length;
const infCorta = (t, n) => { const s = String(t); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };
/* Parte un texto en trozos de hasta `max` palabras y `chars` caracteres,
   primero por frases y, si una frase sola no cabe, por palabras. Un trozo
   cortado a media frase lo dice con «…». */
function infTrocea(texto, max, chars) {
  const t = String(texto).replace(/\s+/g, ' ').trim();
  if (!t) return [];
  const cabe = x => infPalabras(x) <= max && x.length <= chars;
  if (cabe(t)) return [t];
  const out = [];
  let cur = '';
  const suelta = () => { if (cur) out.push(cur); cur = ''; };
  for (const f of t.split(/(?<=[.!?;:])\s+/)) {
    if (!cabe(f)) {
      suelta();
      let trozo = [], sigue = '';
      for (const p of f.split(' ')) {
        if (trozo.length && !cabe(sigue + trozo.concat(p).join(' ') + '…')) { out.push(sigue + trozo.join(' ') + '…'); trozo = []; sigue = '…'; }
        trozo.push(p);
      }
      out.push(sigue + trozo.join(' '));
      continue;
    }
    if (cur && !cabe(cur + ' ' + f)) suelta();
    cur = cur ? cur + ' ' + f : f;
  }
  suelta();
  return out;
}
/* Una celda como se lee en la diapositiva: hasta seis cifras significativas
   (el valor completo sigue en la copia de DoE) y el texto largo, recortado. */
function infCelda(c, max) {
  if (c === null || c === undefined) return '';
  if (typeof c === 'boolean') return c ? 'sí' : 'no';
  if (typeof c === 'number') return String(Number(c.toPrecision(6)));
  return infCorta(c.replace(/\s+/g, ' ').trim(), max);
}
/* La tabla cabe si caben su pie y sus filas: la letra de la tabla es de 21 px
   (unos 11,5 px por carácter) con 29 de línea y 26 de relleno por fila, y el
   pie, de 18 px con 26 de línea. Si todas las columnas caben a su ancho
   natural, cada celda va en una línea; si no, se supone el reparto a partes
   iguales, que es lo peor que hace el navegador. Las celdas de texto se quedan
   en dos líneas como mucho, y una palabra más ancha que su columna se deja
   partir (con un guion discrecional, que el .tex también entiende) para que
   no empuje la tabla fuera. */
function infTablaBloque(t, disponible) {
  const cols = t.columns.slice(0, INF_COLUMNAS), omitC = t.columns.length - cols.length;
  const cpl = Math.max(6, Math.floor((INF_ANCHO / cols.length - 40) / 11.5)), max = Math.max(12, Math.min(INF_CELDA, cpl * 2));
  const corte = Math.max(4, cpl - 3);   /* las mayúsculas y las cifras son más anchas que la media */
  const numero = w => /^[-+−]?[\d.,]+(?:e[-+]?\d+)?%?$/i.test(w);
  const celda = c => infCelda(c, max);
  const cabeza = cols.map(celda), cuerpo = t.data.map(r => cols.map((_, j) => celda(r[j])));
  const natural = cols.reduce((a, _, j) => a + 40 + 11.5 * Math.max(cabeza[j].length, ...cuerpo.slice(0, 15).map(r => r[j].length)), 0);
  const lineas = x => natural <= INF_ANCHO ? 1 : infLineas(x, cpl);
  const alto = r => 26 + 29 * Math.max(...r.map(lineas));
  const pie = 16 + 26 * infLineas(t.titulo + ' · Se muestran 000 de 000 filas (000 omitidas), 00 de 00 columnas (00 omitidas) y celdas largas acortadas con «…»', 95);
  let usado = alto(cabeza) + pie, n = 0;
  for (const f of cuerpo) {
    const a = alto(f);
    if (n && usado + a > disponible) break;
    usado += a; n++;
  }
  /* Solo hace falta partir palabras cuando la tabla no cabe a su ancho natural. */
  const parte = v => natural <= INF_ANCHO ? infPlano(v) : infPlano(v.replace(new RegExp('\\S{' + (corte + 1) + ',}', 'g'), w => numero(w) ? w : w.match(new RegExp('.{1,' + corte + '}', 'g')).join('\u00ad')));
  const rows = [cabeza].concat(cuerpo.slice(0, n)).map(r => r.map(parte));
  const omitF = t.data.length - n;
  const cortadas = [t.columns].concat(t.data.slice(0, n)).some(r => cols.some((_, j) => typeof r[j] === 'string' && infCelda(r[j], max) !== r[j].replace(/\s+/g, ' ').trim()));
  const recorte = [omitF ? 'se muestran ' + n + ' de ' + t.data.length + ' filas (' + omitF + (omitF === 1 ? ' omitida' : ' omitidas') + ')' : '',
    omitC ? cols.length + ' de ' + t.columns.length + ' columnas (' + omitC + (omitC === 1 ? ' omitida' : ' omitidas') + ')' : '',
    cortadas ? 'celdas largas acortadas con «…»' : ''].filter(Boolean).join(', ').replace(/, ([^,]*)$/, ' y $1');
  const caption = [t.titulo.trim(), recorte ? recorte.charAt(0).toUpperCase() + recorte.slice(1) : ''].filter(Boolean).join(' · ');
  const b = Object.assign(newBlock('table'), { header: true, align: 'c', caption: infPlano(caption), rows });
  return { b, recorte, filas: t.data.length, columnas: t.columns.length };
}
/* Reduce una serie a `cap` puntos conservando el mínimo y el máximo de cada
   tramo, en su orden: un pico estrecho de un espectro no desaparece al
   aligerarlo. Devuelve los índices que se quedan. */
function infDiezma(y, cap) {
  const n = y.length;
  if (n <= cap) return y.map((_, i) => i);
  const tramos = Math.max(1, Math.floor(cap / 2)), paso = n / tramos, out = [];
  for (let k = 0; k < tramos; k++) {
    const a = Math.floor(k * paso), z = Math.min(n, Math.floor((k + 1) * paso));
    if (z <= a) continue;
    let lo = a, hi = a;
    for (let i = a; i < z; i++) { if (y[i] < y[lo]) lo = i; if (y[i] > y[hi]) hi = i; }
    if (lo === hi) out.push(lo); else out.push(Math.min(lo, hi), Math.max(lo, hi));
  }
  return out;
}
/* Nombre de columna que la gráfica lee como serie: sin tabuladores, sin
   parecer un número (cambiaría la lectura de la coma decimal) y sin parecer
   una columna de error (12-chart.js la engancharía a la serie anterior). */
function infNombreSerie(nombre, i) {
  let n = String(nombre || '').replace(/[\t\r\n]+/g, ' ').trim() || 'Serie ' + (i + 1);
  if (/^[\d\s.,+\-−eE%]+$/.test(n)) n = 'Serie ' + n;
  if (esColumnaError(n)) n = '«' + n.replace(/±/g, '+/-') + '»';
  return esColumnaError(n) ? 'Serie ' + (i + 1) : n;
}
function infFiguraBloque(f, titulo) {
  const conPuntos = f.series.filter(s => s.x.length);
  const nota = [];
  const cuenta = (n, uno, varios) => n ? n + ' ' + (n === 1 ? uno : varios) : '';
  if (f.marcas.length || f.regiones.length) nota.push('Las marcas y regiones de la figura (' + [cuenta(f.marcas.length, 'marca', 'marcas'), cuenta(f.regiones.length, 'región', 'regiones')].filter(Boolean).join(' y ') + ') no se dibujan aquí: están en las notas.');
  const leyenda = [titulo.trim() || f.titulo.trim(), f.nota.trim()].filter(Boolean);
  if (!conPuntos.length) {
    /* Nada que dibujar: la figura se cuenta como tabla de sus series, nunca como una imagen inventada. */
    const t = Object.assign(newBlock('table'), { header: true, align: 'c',
      caption: infPlano(leyenda.concat('La figura no trae puntos que dibujar').join(' · ')),
      rows: [['Serie', 'Puntos']].concat(f.series.map((s, i) => [infPlano(infNombreSerie(s.nombre, i)), '0'])) });
    return { b: t, nota, reducida: '' };
  }
  const cap = Math.max(50, Math.floor(INF_PUNTOS / conPuntos.length));
  const idx = conPuntos.map(s => infDiezma(s.y, cap));
  const total = conPuntos.reduce((a, s) => a + s.x.length, 0), quedan = idx.reduce((a, v) => a + v.length, 0);
  const cab = ['x'].concat(conPuntos.map((s, i) => infNombreSerie(s.nombre, i)));
  const iguales = !idx.some((v, k) => v.length !== conPuntos[k].x.length) &&
    conPuntos.every(s => s.x.length === conPuntos[0].x.length && s.x.every((v, i) => v === conPuntos[0].x[i]));
  const filas = [];
  if (iguales) conPuntos[0].x.forEach((x, i) => filas.push([x].concat(conPuntos.map(s => s.y[i]))));
  /* Series con su propio eje x: cada una en sus filas y con el resto de las
     columnas vacías, así cada serie conserva su orden de puntos. */
  else conPuntos.forEach((s, k) => idx[k].forEach(i => filas.push([s.x[i]].concat(conPuntos.map((_, j) => j === k ? s.y[i] : '')))));
  const reducida = quedan < total ? 'reducida para la diapositiva a ' + quedan + ' de ' + total + ' puntos, con el mínimo y el máximo de cada tramo' : '';
  if (reducida) leyenda.push(reducida.charAt(0).toUpperCase() + reducida.slice(1));
  const puntos = conPuntos.every(s => s.estilo === 'puntos');
  if (!puntos && conPuntos.some(s => s.estilo === 'puntos')) nota.push('La figura mezclaba líneas y puntos; aquí todas las series van con líneas.');
  const b = Object.assign(newBlock('chart'), {
    kind: puntos ? 'dispersion' : 'linea', data: [cab.join('\t')].concat(filas.map(r => r.map(String).join('\t'))).join('\n'),
    xlabel: infPlano(f.xLabel), ylabel: infPlano(f.yLabel), title: '', caption: infPlano(leyenda.join(' · ')),
    w: 86, ar: 0.5, legend: conPuntos.length > 1, showFit: false, anim: 'fade'
  });
  if (f.invertirX) b.invertirX = true;
  return { b, nota, reducida };
}

/* informe normalizado + datos de la copia → { deck, avisos, nombre }. */
function informeADeck(inf, copia) {
  const sim = inf.simulado, avisos = [];
  const subt = extra => [extra, sim ? 'DATOS SIMULADOS' : ''].filter(Boolean).join(' · ');
  const origen = 'Del informe de Erlen DoE «' + inf.titulo + '»';
  const slides = [];
  inf.secciones.forEach((sec, si) => {
    const titulo = infPlano(sec.titulo || 'Sección ' + (si + 1));
    const propias = [];
    let cur = null;
    const disponible = infDisponible(titulo);
    const nueva = () => { cur = { bloques: [], palabras: 0, vinetas: 0, alto: 0, notas: [] }; propias.push(cur); return cur; };
    const hueco = (palabras, alto, vineta) => !cur || (cur.bloques.length && (cur.palabras + palabras > INF_PALABRAS || cur.alto + alto > disponible || (vineta && cur.vinetas + 1 > INF_VINETAS)));
    const sola = (b, notas) => { propias.push({ bloques: [b], notas }); cur = null; };
    sec.bloques.forEach(b => {
      if (b.tipo === 'parrafo') {
        infTrocea(b.texto, INF_PALABRAS, infCaracteres(disponible, 72)).forEach(t => {
          const n = infPalabras(t);
          const a = infAltoTexto(t);
          if (hueco(n, a, false)) nueva();
          cur.bloques.push(Object.assign(newBlock('text'), { text: infPlano(t) }));
          cur.palabras += n; cur.alto += a;
        });
      } else if (b.tipo === 'lista') {
        let lista = null;
        b.elementos.forEach(e => infTrocea(e, INF_PALABRAS, infCaracteres(disponible - 26, 64)).forEach(t => {
          const n = infPalabras(t);
          /* Una lista nueva añade su separación; una viñeta que sigue a otra, no. */
          let a = infAltoVineta(t) + (lista && cur && cur.bloques[cur.bloques.length - 1] === lista ? 0 : 26);
          if (hueco(n, a, true)) { nueva(); lista = null; a = infAltoVineta(t) + 26; }
          if (!lista || cur.bloques[cur.bloques.length - 1] !== lista) { lista = Object.assign(newBlock('bullets'), { items: [], step: false }); cur.bloques.push(lista); }
          lista.items.push({ t: infPlano(t), lvl: 0 });
          cur.palabras += n; cur.vinetas++; cur.alto += a;
        }));
      } else if (b.tipo === 'tabla') {
        const r = infTablaBloque(b, disponible);
        const que = '«' + (b.titulo.trim() || 'Tabla') + '»';
        if (r.recorte) avisos.push('Tabla ' + que + ': ' + r.recorte + '.');
        sola(r.b, r.recorte ? ['Tabla ' + que + ' recortada: ' + r.recorte + '. La tabla completa (' + r.filas + ' filas, ' + r.columnas + ' columnas) sigue en el informe de DoE.'] : []);
      } else {
        const f = b.figura, r = infFiguraBloque(f, b.titulo);
        const que = '«' + (b.titulo.trim() || f.titulo.trim() || 'Figura') + '»';
        const notas = r.nota.slice();
        if (r.reducida) { avisos.push('Figura ' + que + ': ' + r.reducida + '.'); notas.push('Figura ' + que + ' ' + r.reducida + '.'); }
        if (r.b.type === 'table') avisos.push('Figura ' + que + ': no trae puntos; se muestra como tabla de sus series.');
        if (f.marcas.length) notas.push('Marcas: ' + f.marcas.map(m => (m.etiqueta || '') + ' (x = ' + m.x + ')').join('; ') + '.');
        if (f.regiones.length) notas.push('Regiones: ' + f.regiones.map(g => (g.etiqueta ? g.etiqueta + ' ' : '') + 'de ' + g.desde + ' a ' + g.hasta).join('; ') + '.');
        if (r.nota.length) avisos.push('Figura ' + que + ': ' + r.nota.join(' '));
        sola(r.b, notas);
      }
    });
    if (!propias.length) propias.push({ bloques: [Object.assign(newBlock('text'), { text: 'Esta sección no tiene contenido en el informe.' })], notas: [] });
    propias.forEach((p, k) => {
      const parte = propias.length > 1 ? ' (parte ' + (k + 1) + ' de ' + propias.length + ')' : '';
      slides.push(slidePlantilla('content', titulo, [p.bloques], {
        subtitle: subt(k ? 'continuación' : ''),
        notes: [origen + ', sección «' + (sec.titulo || 'Sección ' + (si + 1)) + '»' + parte + '.'].concat(p.notas, sim ? ['Datos simulados: no los presentes como mediciones.'] : []).join('\n')
      }));
    });
  });
  const app = inf.procedencia.app || 'Erlen DoE' + (inf.fuente.version ? ' ' + inf.fuente.version : '');
  const tituloOrigen = inf.fuente.titulo || inf.titulo;
  const creada = new Date(copia.createdAt).toISOString();
  slides.push(slidePlantilla('content', 'Procedencia', [[
    Object.assign(newBlock('bullets'), { items: [
      'Aplicación: ' + app,
      inf.procedencia.proyecto ? 'Proyecto: ' + inf.procedencia.proyecto : '',
      'Título: ' + tituloOrigen,
      'Copia enviada el ' + creada.slice(0, 10) + '; abierta en Erlen Slides el ' + new Date().toISOString().slice(0, 10),
      sim ? 'DATOS SIMULADOS: el informe los declara así; no son mediciones.' : ''
    ].filter(Boolean).map(t => ({ t: infPlano(t), lvl: 0 })), step: false }),
    /* En un bloque de código: la notación automática del texto (39-notacion.js)
       tomaría «5a7d» por un número con su unidad y metería un espacio. */
    Object.assign(newBlock('code'), { lang: 'text', text: 'Copia de intercambio  ' + copia.id + '\nSHA-256               ' + copia.sha256 }),
    Object.assign(newBlock('text'), { size: 's', text: 'Las tablas y figuras pueden ir recortadas para caber en la diapositiva: cada una lo dice en su pie y en las notas. El informe completo sigue en Erlen DoE.' })
  ]], { subtitle: subt(''), notes: 'La procedencia también se guarda en el proyecto (.json), en meta.origen.' }));
  const portada = slidePlantilla('title', '', null, { notes: origen + '. Copia ' + copia.id + ' · SHA-256 ' + copia.sha256 + (sim ? '\nDatos simulados: no los presentes como mediciones.' : '') });
  const deck = deckDe({
    title: infPlano(inf.titulo), subtitle: infPlano(subt(inf.subtitulo.trim())), date: infPlano(inf.fecha.trim()),
    origen: { formato: 'erlen-context-copy-v1', kind: 'informe-v1', tool: 'doe', app, titulo: tituloOrigen, proyecto: inf.procedencia.proyecto,
      id: copia.id, sha256: copia.sha256, creada, recibida: new Date().toISOString(), simulado: sim }
  }, [portada].concat(slides));
  return { deck, avisos, simulado: sim, nombre: inf.titulo.slice(0, 110) };
}

/* ---------- recibir ---------- */
/* #copy=<id>: se lee al arrancar (o si alguien lo pega en esta pestaña) y se
   retira de la URL sin dejar entrada en el historial. */
function copiaEnUrl() {
  if (!/^#copy=/.test(location.hash)) return null;
  let id = '';
  try { id = decodeURIComponent(location.hash.slice(6)); } catch (e) { id = location.hash.slice(6); }
  history.replaceState(null, '', location.pathname + location.search + '#suite/inicio');
  return id;
}
/* La copia viaja en IndexedDB de la suite: getTransfer comprueba la huella y
   que vaya dirigida a Slides. */
async function recibeCopiaSuite(id) {
  let r;
  try { r = await erlenExchange.getTransfer(String(id), 'slides'); }
  catch (e) { rechazaCopia(e); return null; }
  return recibeRegistro(r);
}
/* Fuera de la suite, DoE descarga el registro (erlen-copia-slides-<id8>.json);
   Importar proyecto lo trae aquí con las mismas comprobaciones. */
async function recibeArchivoCopia(registro) {
  let r;
  try { r = await erlenExchange.verifyTransfer(registro, 'slides'); }
  catch (e) { rechazaCopia(e); return null; }
  return recibeRegistro(r);
}
function recibeRegistro(r) {
  let res;
  try { res = informeADeck(leeInforme(r.payload), r); }
  catch (e) { rechazaCopia(e); return null; }
  previewInforme(res, r);
  return res;
}
function rechazaCopia(e) {
  openModal({ title: 'No se abrió la copia', size: 'modal-sm', body: h('div', { class: 'inf-rechazo' },
    h('p', null, (e && e.message) || 'La copia no se pudo leer.'),
    h('p', { class: 'hint' }, 'No se creó ni se cambió nada. Pide otra copia a Erlen DoE o recupérala desde la página de recursos de la suite.')),
    foot: [h('button', { class: 'btn btn-pri', onclick: closeModal }, 'Entendido')] });
}
/* Nombre libre en la biblioteca: nunca se sobrescribe una presentación. */
function infNombreLibre(base) {
  const store = decksStore(), b = String(base || '').trim() || 'Informe de DoE';
  let nombre = b, i = 2;
  while (Object.hasOwn(store, nombre)) nombre = b + ' (' + i++ + ')';
  return nombre;
}
function previewInforme(res, r) {
  const d = res.deck, nombre = infNombreLibre(res.nombre), o = d.meta.origen;
  const lista = h('div', { class: 'es-prev inf-prev' });
  d.slides.forEach((sl, i) => {
    const bl = zonas(sl).flat();
    const que = sl.layout === 'title' ? 'portada' : bl.map(b => b.type === 'table' ? 'tabla' : b.type === 'chart' ? 'gráfica' : b.type === 'bullets' ? b.items.length + (b.items.length === 1 ? ' viñeta' : ' viñetas') : 'texto').join(' · ');
    lista.append(h('div', { class: 'es-fila' }, h('span', { class: 'es-n' }, String(i + 1)),
      h('span', { class: 'es-t' }, (sl.layout === 'title' ? d.meta.title : sl.title).replace(/\\\$/g, '$') + (sl.subtitle && /continuación/.test(sl.subtitle) ? ' (cont.)' : '')),
      h('span', { class: 'es-c' }, que)));
  });
  const body = h('div', { class: 'inf-preview' },
    h('p', null, (o.app || 'Erlen DoE') + ' envió el informe «' + o.titulo + '»' + (o.proyecto ? ' del proyecto «' + o.proyecto + '»' : '') + '. Se creará una presentación nueva en tu biblioteca, «' + nombre + '», con ' + d.slides.length + ' diapositivas. La presentación abierta se conserva y la copia de intercambio no se borra.'),
    res.simulado ? h('p', { class: 'inf-simulado', role: 'note' }, 'DATOS SIMULADOS. El informe declara datos simulados: la portada, cada diapositiva y la procedencia lo dirán. No los presentes como mediciones.') : null,
    h('span', { class: 'sublabel', style: 'margin:0 0 5px' }, 'Lo que se va a crear'), lista,
    res.avisos.length ? h('div', null, h('span', { class: 'sublabel', style: 'margin:10px 0 5px' }, 'Para que quepa en las diapositivas'),
      h('ul', { class: 'av-lista' }, res.avisos.map(a => h('li', null, a)))) : null,
    h('p', { class: 'hint' }, 'Copia ' + r.id + ' · SHA-256 ' + r.sha256 + ' · enviada el ' + o.creada.slice(0, 10) + '. La procedencia queda en la última diapositiva.'));
  openModal({ title: 'Abrir el informe de DoE como presentación', size: 'modal-lg', body,
    foot: [h('button', { class: 'btn', onclick: closeModal }, 'Cancelar'),
      h('button', { class: 'btn btn-pri', onclick: () => creaDesdeInforme(res) }, 'Crear presentación')] });
}
/* Solo aquí se crea algo: primero la copia en la biblioteca (si no cabe, no
   se abre nada) y después se abre. */
function creaDesdeInforme(res) {
  const r = saneaDeck(res.deck);
  if (!r.deck) { toast(r.error || 'El informe no produjo una presentación válida.', 'warn'); return false; }
  if (typeof wsConservar === 'function' && !wsConservar()) return false;
  const store = decksStore(), nombre = infNombreLibre(res.nombre);
  Object.defineProperty(store, nombre, { value: { deck: r.deck, when: Date.now() }, enumerable: true, configurable: true, writable: true });
  if (!lsSet(LS_DECKS, store)) { toast('No hay espacio en este navegador para la presentación nueva. Descarga un respaldo y libera espacio; no se creó nada.', 'warn'); return false; }
  closeModal();
  loadDeck(r.deck, nombre);
  if (typeof wsCerrar === 'function') wsCerrar();
  INICIO?.actualizar?.();
  toast('Presentación creada desde el informe de DoE: «' + nombre + '».');
  return true;
}
