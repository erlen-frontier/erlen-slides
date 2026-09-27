/* SPDX-License-Identifier: AGPL-3.0-only */
/* Más formatos para exportar_presentacion, hechos con lo que ya tiene la app:

     png       una imagen por diapositiva (Chromium), para el chat del grupo,
               un póster o un informe;
     folleto   el folleto para repartir del editor, ya impreso a PDF (Chromium);
     paquete   el kit de defensa como .zip reproducible, con los datos de cada
               gráfica en CSV, las figuras en SVG y el informe (Chromium);
     figuras   cada gráfica, función y estructura en SVG, con los datos en CSV,
               y las imágenes con su formato original (sin Chromium);
     informe   el informe de exportación en JSON (sin Chromium).

   Lo que se puede sacar sin rasterizar sale de JSDOM (exportaciones.pagina.js);
   lo demás, de la sesión de Chromium de navegador.mjs, interceptando la
   descarga igual que el PowerPoint. Todo se escribe dentro de la carpeta de
   trabajo. */
import {writeFileSync, mkdirSync, readdirSync, unlinkSync, statSync} from 'node:fs';
import {basename, dirname, resolve} from 'node:path';
import {ErrorUso, rutaSegura, visible, op, proyectoValidado} from '../motor.mjs';
import {sesion, imprimible} from '../navegador.mjs';

const EXT_IMAGEN = {'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg', 'image/tiff': 'tif', 'image/bmp': 'bmp', 'application/pdf': 'pdf'};
const baseDe = ruta => basename(ruta, '.json');
/* Una carpeta de salida: el destino sin la extensión que un modelo le pone
   a veces por costumbre («figs.png»). */
const carpetaDe = (destino, porOmision, ext) => rutaSegura(destino ? destino.replace(new RegExp('\\.' + ext + '$', 'i'), '') : porOmision);

/* Un SVG en «data:…;utf8,» trae a veces un «%» suelto («width="100%"»): se
   deja como está en vez de hacer fallar toda la exportación. */
const sinEscapes = t => { try { return decodeURIComponent(t); } catch { return t; } };
/* data: → bytes y extensión. null si es un recurso remoto o desconocido. */
function bytesDe(src) {
  const m = /^data:([^;,]*)((?:;[^,;]*)*),(.*)$/s.exec(src || '');
  if (!m) return null;
  const mime = (m[1] || '').toLowerCase();
  return {ext: EXT_IMAGEN[mime] || null, mime,
    bytes: /;base64/i.test(m[2]) ? Buffer.from(m[3], 'base64') : Buffer.from(sinEscapes(m[3]), 'utf8')};
}

/* ---------- png ---------- */
async function png(a) {
  const escala = a.escala == null ? 2 : +a.escala;
  if (!(escala >= 1 && escala <= 3)) throw new ErrorUso('«escala» va de 1 a 3 (por omisión 2: el doble de la resolución de la diapositiva).');
  /* El destino se comprueba antes de abrir Chromium: un nombre fuera de la
     carpeta se dice igual haya navegador o no. */
  const carpeta = carpetaDe(a.destino, baseDe(rutaSegura(a.archivo, '.json')) + '-png', 'png');
  const {deck, p, W, H} = await imprimible(a.archivo);
  let html;
  try { html = await p.content(); } finally { await p.close(); }
  /* La densidad de píxeles solo se fija al crear el contexto: uno propio,
     del tamaño exacto de la diapositiva. */
  const s = await sesion();
  const ctx = await s.navegador.newContext({viewport: {width: W, height: H}, deviceScaleFactor: escala});
  try {
    const q = await ctx.newPage();
    await q.setContent(html, {waitUntil: 'load'});
    await q.evaluate(() => document.fonts && document.fonts.ready);
    await q.addStyleTag({content: '.tip{display:none}html,body{background:#fff}.pr-page{margin:0}'});
    mkdirSync(carpeta, {recursive: true});
    const cifras = Math.max(2, String(deck.slides.length).length);
    const paginas = q.locator('.pr-page'), total = await paginas.count(), archivos = [];
    /* Si antes se exportó una versión más larga, sus últimas diapositivas
       quedarían como si fueran de esta: se borran solo las que llevan un
       nombre de esta exportación (dos o más cifras y .png) con un número
       mayor que el de diapositivas. Las demás se sobrescriben abajo. */
    for (const n of readdirSync(carpeta)) if (/^\d{2,}\.png$/.test(n) && parseInt(n, 10) > total) unlinkSync(resolve(carpeta, n));
    for (let i = 0; i < total; i++) {
      const nombre = String(i + 1).padStart(cifras, '0') + '.png';
      await paginas.nth(i).screenshot({path: resolve(carpeta, nombre), type: 'png'});
      archivos.push(nombre);
    }
    return {carpeta: visible(carpeta), archivos, tamano: [Math.round(W * escala), Math.round(H * escala)], escala,
      nota: 'Una imagen por diapositiva, con los pasos ya revelados. Para proyectar o imprimir, mejor el PDF.'};
  } finally { await ctx.close(); }
}

/* ---------- folleto ---------- */
async function folleto(a) {
  const porHoja = a.por_hoja == null ? 3 : +a.por_hoja;
  if (![2, 3, 6].includes(porHoja)) throw new ErrorUso('«por_hoja» puede ser 2, 3 o 6 (por omisión 3: miniatura y renglones para anotar).');
  const {ruta, deck} = await proyectoValidado(a.archivo);
  const destino = rutaSegura(a.destino || baseDe(ruta) + '-folleto.pdf', '.pdf');
  const s = await sesion();
  /* El mismo folletoHTML del editor (Exportar → Folleto para repartir): allí
     se descarga para imprimirlo a mano; aquí se imprime directamente. */
  const html = await s.pagina.evaluate(({d, n}) => { loadDeck(d, null); return folletoHTML(n); }, {d: deck, n: porHoja});
  const p = await s.contexto.newPage();
  try {
    await p.setContent(html, {waitUntil: 'load'});
    await p.evaluate(() => document.fonts && document.fonts.ready);
    mkdirSync(dirname(destino), {recursive: true});
    const pdf = await p.pdf({preferCSSPageSize: true, printBackground: true});
    writeFileSync(destino, pdf);
    /* Las hojas se cuentan en el PDF: el folleto reparte por lo que cabe en
       la página, no por un número fijo. Chromium deja sin comprimir el
       diccionario de cada página. */
    const hojas = (pdf.toString('latin1').match(/\/Type\s*\/Page(?![a-z])/g) || []).length;
    return {archivo: visible(destino), por_hoja: porHoja, hojas, bytes: pdf.length,
      nota: porHoja === 6 ? 'Seis por hoja, sin renglones: para repartir la charla completa.' : 'Carta vertical, con renglones al lado de cada diapositiva para anotar.'};
  } finally { await p.close(); }
}

/* ---------- figuras ---------- */
async function figuras(a) {
  const {ruta, deck} = await proyectoValidado(a.archivo);
  const r = await op('exportaFiguras', {deck});
  const carpeta = carpetaDe(a.destino, baseDe(ruta) + '-figuras', 'svg');
  mkdirSync(carpeta, {recursive: true});
  const escritos = [], avisos = [...r.avisos];
  for (const f of [...r.figuras, ...r.datos]) {
    writeFileSync(resolve(carpeta, f.nombre), f.texto);
    escritos.push({archivo: f.nombre, diapositiva: f.diapositiva, tipo: f.nombre.endsWith('.csv') ? 'datos' : f.tipo, pie: f.pie || undefined});
  }
  for (const im of r.imagenes) {
    const b = bytesDe(im.src);
    if (!b) { avisos.push('«' + im.nombre + '» es un recurso remoto (' + String(im.src).slice(0, 60) + '): no se descargó.'); continue; }
    const nombre = im.nombre + '.' + (b.ext || 'bin');
    if (!b.ext) avisos.push('«' + nombre + '» es ' + (b.mime || 'de tipo desconocido') + ': se guardó tal cual.');
    writeFileSync(resolve(carpeta, nombre), b.bytes);
    escritos.push({archivo: nombre, tipo: im.tipo, pie: im.pie || undefined});
  }
  if (!escritos.length) throw new ErrorUso('La presentación no tiene gráficas, funciones, estructuras ni imágenes que exportar.');
  return {carpeta: visible(carpeta), archivos: escritos, avisos,
    nota: 'Gráficas, funciones y estructuras en SVG vectorial (se abren en Inkscape o Illustrator, o se insertan en Word y LaTeX); junto a cada gráfica, sus datos en CSV. Las imágenes van como se subieron, sin el recorte ni el marco del editor.'};
}

/* ---------- informe ---------- */
async function informe(a) {
  const {ruta, deck} = await proyectoValidado(a.archivo);
  const r = await op('exportaInforme', {deck});
  const destino = rutaSegura(a.destino || baseDe(ruta) + '-informe-exportacion.json', '.json');
  mkdirSync(dirname(destino), {recursive: true});
  writeFileSync(destino, JSON.stringify(r, null, 2) + '\n');
  return {archivo: visible(destino), resumen: r.summary,
    avisos: r.warnings.filter(w => w.severity !== 'info').map(w => ({gravedad: w.severity, diapositivas: w.slides, mensaje: w.message, formatos: w.formats}))};
}

/* ---------- paquete ---------- */
async function paquete(a) {
  const {ruta, deck} = await proyectoValidado(a.archivo);
  const destino = rutaSegura(a.destino || baseDe(ruta) + '-paquete.zip', '.zip');
  const [fig, inf] = await Promise.all([op('exportaFiguras', {deck}), op('exportaInforme', {deck})]);
  /* Lo que el kit del editor no trae y hace falta para rehacer las figuras:
     los datos exactos de cada gráfica, su procedencia y los SVG. */
  const procedencia = {schema: 'erlen-slides-datos-v1',
    nota: 'Cada CSV son los datos de la gráfica tal como se dibujan (si vinieron de un archivo de equipo, ya limpios y quizá submuestreados). La huella es el SHA-256 abreviado de la tabla guardada en proyecto.json.',
    datos: fig.datos.map(d => ({archivo: 'datos/' + d.nombre, diapositiva: d.diapositiva, bloque: d.bloque, pie: d.pie, ejes: d.ejes, procedencia: d.procedencia}))};
  /* El LEEME del kit nombra una sola vez cada carpeta, en su primer archivo. */
  const extra = [
    ...fig.datos.map((d, i) => ({nombre: 'datos/' + d.nombre, datos: d.texto, ...(i ? {} : {rotulo: 'datos/', desc: 'Los datos de cada gráfica en CSV y su procedencia.'})})),
    ...(fig.datos.length ? [{nombre: 'datos/procedencia.json', datos: JSON.stringify(procedencia, null, 2) + '\n'}] : []),
    ...fig.figuras.map(f => ({nombre: 'figuras/' + f.nombre, datos: f.texto})),
    {nombre: 'informe-exportacion.json', datos: JSON.stringify(inf, null, 2) + '\n', desc: 'Qué cambia o se pierde en cada formato de exportación.'}
  ];
  const s = await sesion();
  const [descarga, lista] = await Promise.all([
    s.pagina.waitForEvent('download'),
    s.pagina.evaluate(async ({d, extra}) => {
      loadDeck(d, null);
      const archivos = await archivosKit(extra);
      await downloadFile(deckSlug() + '-paquete.zip', await armaZip(archivos), 'application/zip');
      return archivos.map(x => ({nombre: x.nombre, bytes: typeof x.datos === 'string' ? new TextEncoder().encode(x.datos).length : x.datos.length}));
    }, {d: deck, extra})
  ]);
  mkdirSync(dirname(destino), {recursive: true});
  await descarga.saveAs(destino);
  return {archivo: visible(destino), bytes: statSync(destino).size, contenido: lista,
    nota: 'Kit de defensa del editor más los datos y las figuras vectoriales: proyecto.json se abre en Erlen, presentacion.tex compila en Overleaf. Falta el PDF: exportar_presentacion con formato «pdf».'};
}

/* Las opciones propias de estos formatos, para el esquema de exportar_presentacion. */
png.propiedades = {escala: {type: 'number', minimum: 1, maximum: 3, description: 'Solo png: densidad de píxeles, de 1 a 3 (por omisión 2).'}};
folleto.propiedades = {por_hoja: {type: 'integer', enum: [2, 3, 6], description: 'Solo folleto: diapositivas por hoja, 2, 3 o 6 (por omisión 3).'}};

export default {
  formatos: {png, folleto, paquete, figuras, informe},
  convenciones: {
    exportaciones: 'exportar_presentacion también da: png (una imagen por diapositiva en <nombre>-png/, «escala» 1–3), folleto (PDF para repartir, «por_hoja» 2, 3 o 6), paquete (.zip reproducible: proyecto, .tex, datos CSV con procedencia, figuras SVG e informe), figuras (SVG de gráficas y estructuras, CSV de datos e imágenes originales en <nombre>-figuras/) e informe (avisos por formato en JSON). png, folleto y paquete requieren Chromium o Chrome.'
  }
};
