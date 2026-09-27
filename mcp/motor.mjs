/* SPDX-License-Identifier: AGPL-3.0-only */
/* Motor del servidor MCP: la aplicación construida, cargada en JSDOM, y la
   carpeta de trabajo donde viven los proyectos JSON v1.

   Cada cambio se lee del disco, se aplica con las funciones de la propia
   aplicación, pasa por saneaDeck y solo entonces se escribe. Si algo falla,
   el archivo anterior queda intacto y el error se devuelve tal cual. */
import {readFileSync, writeFileSync, renameSync, readdirSync, statSync, existsSync, mkdirSync, rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve, relative, isAbsolute, extname, basename, dirname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {homedir} from 'node:os';
import {estructuraDesde} from './quimica.mjs';
import {archivos as archivosExtension} from './extensiones.mjs';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const APP = resolve(RAIZ, 'public/index.html');
const MAX_IMAGEN = 8 * 1024 * 1024;
const MAX_DATOS = 20 * 1024 * 1024;
const MIME = {'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml'};

export class ErrorUso extends Error {}

/* Los clientes MCP arrancan el servidor con un directorio actual que no se
   elige (a veces «/»): por eso la carpeta por omisión cuelga del usuario. */
export function carpetaTrabajo() {
  const dir = resolve(process.env.ERLEN_SLIDES_DIR || resolve(homedir(), 'erlen-slides'));
  mkdirSync(dir, {recursive: true});
  return dir;
}

/* Una ruta que el modelo propone siempre se interpreta dentro de la carpeta de
   trabajo: ni rutas absolutas fuera de ella ni «..». */
export function rutaSegura(nombre, extension) {
  if (typeof nombre !== 'string' || !nombre.trim()) throw new ErrorUso('Falta el nombre del archivo.');
  const base = carpetaTrabajo();
  let n = nombre.trim();
  if (extension && !n.toLowerCase().endsWith(extension)) n += extension;
  const ruta = resolve(base, n);
  const rel = relative(base, ruta);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw new ErrorUso('«' + nombre + '» queda fuera de la carpeta de trabajo (' + base + ').');
  return ruta;
}
const visible = ruta => relative(carpetaTrabajo(), ruta).split(sep).join('/');

/* ---------- la aplicación en JSDOM ---------- */
let pagina = null;
async function cargaPagina() {
  if (!existsSync(APP)) throw new ErrorUso('No existe public/index.html. Ejecuta «npm ci» y «npm run build» en ' + RAIZ + ' antes de arrancar el servidor MCP.');
  const [{JSDOM, VirtualConsole}, {IDBFactory, IDBKeyRange}] = await Promise.all([import('jsdom'), import('fake-indexeddb')]);
  const vc = new VirtualConsole();
  const dom = new JSDOM(readFileSync(APP, 'utf8'), {
    url: 'http://127.0.0.1:8130/', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.matchMedia = () => ({matches: false, addEventListener() {}, removeEventListener() {}});
      w.ResizeObserver = class {observe() {} disconnect() {} unobserve() {}};
      w.indexedDB = new IDBFactory(); w.IDBKeyRange = IDBKeyRange;
      w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder; w.structuredClone = structuredClone;
      w.Element.prototype.scrollIntoView = function () {};
      w.URL.createObjectURL = () => 'blob:mcp'; w.URL.revokeObjectURL = () => {};
      w.confirm = () => true; w.alert = () => {};
    }
  });
  await new Promise(r => dom.window.addEventListener('load', r, {once: true}));
  /* La huella de los datos, igual que huellaDe (68-figuras-vivas.js): los
     cinco primeros bytes del SHA-256 del texto. JSDOM no trae crypto.subtle. */
  dom.window.ERLEN_MCP_HUELLA = texto => createHash('sha256').update(String(texto || ''), 'utf8').digest('hex').slice(0, 10);
  dom.window.eval(readFileSync(new URL('./operaciones.js', import.meta.url), 'utf8'));
  /* Las extensiones de la página, detrás, con ERLEN_MCP ya definido. */
  for (const ruta of archivosExtension('.pagina.js')) {
    try { dom.window.eval(readFileSync(ruta, 'utf8')); }
    catch (e) { throw new Error('La extensión ' + ruta + ' falló al cargarse en la página: ' + e.message); }
  }
  return dom;
}
async function op(nombre, args) {
  pagina ||= cargaPagina().catch(e => { pagina = null; throw e; });
  const dom = await pagina;
  dom.window.__mcpArgs = JSON.stringify(args || {});
  const r = JSON.parse(dom.window.eval('ERLEN_MCP.ejecuta(' + JSON.stringify(nombre) + ', __mcpArgs)'));
  delete dom.window.__mcpArgs;
  if (r.error) throw new ErrorUso(r.error);
  return r.ok;
}
export function version() {
  try { return JSON.parse(readFileSync(resolve(RAIZ, 'package.json'), 'utf8')).version; } catch { return '0.0.0'; }
}

/* ---------- archivos ---------- */
function lee(archivo) {
  const ruta = rutaSegura(archivo, '.json');
  if (!existsSync(ruta)) throw new ErrorUso('No existe «' + visible(ruta) + '». Usa listar_presentaciones o crear_presentacion.');
  let bruto;
  try { bruto = JSON.parse(readFileSync(ruta, 'utf8')); } catch (e) { throw new ErrorUso('«' + visible(ruta) + '» no es un JSON válido: ' + e.message); }
  return {ruta, deck: bruto};
}
function escribe(ruta, deck) {
  mkdirSync(dirname(ruta), {recursive: true});
  const tmp = ruta + '.tmp-' + process.pid;
  writeFileSync(tmp, JSON.stringify(deck, null, 2) + '\n');
  renameSync(tmp, ruta);
}

/* ---------- historial ----------
   Antes de cada cambio se guarda la versión anterior en .historial/ dentro de
   la carpeta de trabajo. deshacer la repone y aparta la actual en rehacer; un
   cambio nuevo vacía rehacer, como en cualquier editor. */
const MAX_VERSIONES = 50;
function dirHistorial(ruta, pila) {
  const clave = visible(ruta).replace(/\.json$/i, '').replace(/[\/\\]/g, '__');
  return resolve(carpetaTrabajo(), '.historial', clave, pila);
}
const versiones = (ruta, pila) => {
  const dir = dirHistorial(ruta, pila);
  return existsSync(dir) ? readdirSync(dir).filter(n => n.endsWith('.json')).sort() : [];
};
let contador = 0;
function apila(ruta, pila, contenido, operacion) {
  const dir = dirHistorial(ruta, pila);
  mkdirSync(dir, {recursive: true});
  const sello = new Date().toISOString().replace(/[:.]/g, '-') + '-' + String(++contador % 1000).padStart(3, '0');
  writeFileSync(resolve(dir, sello + '__' + operacion + '.json'), contenido);
  const todas = versiones(ruta, pila);
  todas.slice(0, Math.max(0, todas.length - MAX_VERSIONES)).forEach(n => rmSync(resolve(dir, n)));
}
function guardaVersion(ruta, operacion) {
  if (!existsSync(ruta)) return;
  apila(ruta, 'deshacer', readFileSync(ruta, 'utf8'), operacion);
  rmSync(dirHistorial(ruta, 'rehacer'), {recursive: true, force: true});
}
const describeVersion = (ruta, pila, n) => {
  const [sello, operacion] = n.replace(/\.json$/, '').split('__');
  let diapositivas = null, titulo = null;
  try { const d = JSON.parse(readFileSync(resolve(dirHistorial(ruta, pila), n), 'utf8')); diapositivas = d.slides.length; titulo = d.meta?.title || ''; } catch {}
  return {version: n.replace(/\.json$/, ''), cuando: sello.slice(0, 19).replace(/T(\d\d)-(\d\d)-(\d\d)/, 'T$1:$2:$3'), antes_de: operacion, diapositivas, titulo};
};

/* Lee, aplica, valida y guarda. Devuelve el resultado de la operación y los
   avisos (reparaciones de saneaDeck y propiedades dudosas), que el modelo
   debe ver. */
async function modifica(archivo, operacion, args, nombreHerramienta) {
  const {ruta, deck} = lee(archivo);
  const entrada = await preparaEntrada(args);
  const r = await op(operacion, {...entrada, deck});
  guardaVersion(ruta, nombreHerramienta || operacion);
  escribe(ruta, r.deck);
  const out = {archivo: visible(ruta), ...(r.resultado || {}), avisos: r.avisos};
  if (r.datos_importados) out.datos_importados = r.datos_importados;
  if (r.estructuras) out.estructuras = r.estructuras;
  return out;
}

/* ---------- lo que viene de disco: imágenes y datos ---------- */
function archivoEnCarpeta(nombre, que, max) {
  const ruta = rutaSegura(String(nombre));
  if (!existsSync(ruta) || !statSync(ruta).isFile()) throw new ErrorUso('No existe ' + que + ' «' + visible(ruta) + '» en la carpeta de trabajo (' + carpetaTrabajo() + ').');
  const st = statSync(ruta);
  if (st.size > max) throw new ErrorUso(que[0].toUpperCase() + que.slice(1) + ' «' + visible(ruta) + '» pesa ' + (st.size / 1048576).toFixed(1) + ' MB; el límite es ' + max / 1048576 + ' MB.');
  return ruta;
}
/* Las imágenes se incrustan como data: URI, que es lo que guarda la app. */
function incrustaImagen(b, esImagen) {
  if (!((esImagen || (b.tipo || b.type) === 'image') && b.archivo != null)) return b;
  const ruta = archivoEnCarpeta(b.archivo, 'la imagen', MAX_IMAGEN);
  const ext = extname(ruta).toLowerCase();
  if (!MIME[ext]) throw new ErrorUso('Formato de imagen no admitido: «' + ext + '». Usa ' + Object.keys(MIME).join(', ') + '.');
  const out = {...b, src: 'data:' + MIME[ext] + ';base64,' + readFileSync(ruta).toString('base64')};
  delete out.archivo;
  return out;
}
/* Los datos se leen aquí y se interpretan dentro de la app (parseTable,
   detectaTecnica), que es quien sabe de separadores y técnicas. */
function leeDatos(b, datos) {
  if (b.archivo_datos == null || datos[b.archivo_datos]) return;
  const ruta = archivoEnCarpeta(b.archivo_datos, 'el archivo de datos', MAX_DATOS);
  const bytes = readFileSync(ruta);
  if (bytes.subarray(0, 8000).includes(0)) throw new ErrorUso('«' + visible(ruta) + '» es binario. Exporta los datos del equipo como texto (CSV, TXT, XY, DAT).');
  datos[b.archivo_datos] = {nombre: basename(ruta), texto: bytes.toString('utf8')};
}
/* Estructuras químicas: SMILES, un bloque MOL o un archivo .mol/.sdf de la
   carpeta pasan por RDKit (quimica.mjs) y llegan a la app ya como estructura
   nativa, en «est». */
const EXT_MOL = ['.mol', '.sdf', '.mdl'];
async function convierteEstructura(b) {
  const clave = ['smiles', 'mol', 'archivo_mol'].filter(k => b[k] != null);
  if (!clave.length) return b;
  if (clave.length > 1) throw new ErrorUso('Usa solo una de estas propiedades: smiles, mol o archivo_mol.');
  let entrada, nombre;
  if (b.archivo_mol != null) {
    const ruta = archivoEnCarpeta(b.archivo_mol, 'el archivo de estructura', 2 * 1048576);
    if (!EXT_MOL.includes(extname(ruta).toLowerCase())) throw new ErrorUso('«archivo_mol» debe ser .mol o .sdf (se usa la primera molécula).');
    nombre = basename(ruta);
    entrada = {mol: readFileSync(ruta, 'utf8').split(/^\$\$\$\$/m)[0], nombre};
  } else entrada = b.smiles != null ? {smiles: b.smiles} : {mol: b.mol};
  const {est, info} = await estructuraDesde(entrada);
  const out = {...b, est, smiles: info.smiles, _quimica: {...info, ...(nombre ? {archivo: nombre} : {})}};
  delete out.mol; delete out.archivo_mol;
  return out;
}
/* Transformaciones de bloque que aportan las extensiones (extensiones.mjs):
   se aplican en orden tras las de aquí. */
export const TRANSFORMADORES = [];
async function preparaEntrada(args) {
  const datos = {};
  const bloque = async (b, esImagen) => {
    if (!b || typeof b !== 'object' || Array.isArray(b)) return b;
    leeDatos(b, datos);
    let out = await convierteEstructura(incrustaImagen(b, esImagen));
    for (const t of TRANSFORMADORES) out = await t(out, {esImagen: !!esImagen, datos});
    return out;
  };
  const zonas = z => Array.isArray(z) ? Promise.all(z.map(x => Array.isArray(x) ? Promise.all(x.map(y => bloque(y))) : x)) : z;
  const out = {...args};
  if (out.bloque) out.bloque = await bloque(out.bloque);
  if (out.cambios && typeof out.cambios === 'object') out.cambios = await bloque(out.cambios, true);
  if (out.zonas) out.zonas = await zonas(out.zonas);
  if (Array.isArray(out.diapositivas)) out.diapositivas = await Promise.all(out.diapositivas.map(async d => d && typeof d === 'object' && !Array.isArray(d) ? {...d, zonas: await zonas(d.zonas)} : d));
  out.__datos = datos;
  return out;
}

/* Un proyecto con figuras incrustadas pesa megas: al enseñárselo al modelo,
   cada data: URI se resume en su tipo y tamaño. */
function compacta(v) {
  if (typeof v === 'string' && v.startsWith('data:') && v.length > 200) {
    const m = v.match(/^data:([^;,]+)/);
    return '[' + (m ? m[1] : 'datos') + ' incrustado, ' + Math.round(v.length * 0.75 / 1024) + ' KB]';
  }
  if (Array.isArray(v)) return v.map(compacta);
  if (v && typeof v === 'object') { const o = {}; for (const k in v) o[k] = compacta(v[k]); return o; }
  return v;
}

/* ---------- operaciones públicas ---------- */
export const guia = () => op('guia');

export function listar() {
  const base = carpetaTrabajo(), out = [];
  const recorre = dir => {
    for (const n of readdirSync(dir, {withFileTypes: true})) {
      const ruta = resolve(dir, n.name);
      if (n.isDirectory()) { if (!n.name.startsWith('.') && n.name !== 'node_modules') recorre(ruta); continue; }
      if (!n.name.endsWith('.json')) continue;
      try {
        const d = JSON.parse(readFileSync(ruta, 'utf8'));
        if (d && d.v === 1 && Array.isArray(d.slides)) out.push({archivo: visible(ruta), titulo: d.meta?.title || '', diapositivas: d.slides.length, modificado: statSync(ruta).mtime.toISOString()});
      } catch {}
    }
  };
  recorre(base);
  out.sort((a, b) => b.modificado.localeCompare(a.modificado));
  return {carpeta: base, presentaciones: out};
}

export function ejemplos() {
  const cat = JSON.parse(readFileSync(resolve(RAIZ, 'examples/catalog.json'), 'utf8'));
  return cat.map(e => ({id: e.id, titulo: e.title, descripcion: e.description, diapositivas: e.slides, datos: 'ilustrativos'}));
}

export async function crear(a) {
  const ruta = rutaSegura(a.archivo, '.json');
  if (existsSync(ruta) && !a.sobrescribir) throw new ErrorUso('«' + visible(ruta) + '» ya existe. Elige otro nombre o pasa sobrescribir: true (la versión anterior queda en el historial).');
  const entrada = await preparaEntrada(a);
  let r;
  if (a.desde_ejemplo) {
    if (!/^[a-z0-9-]+$/.test(a.desde_ejemplo) || !existsSync(resolve(RAIZ, 'examples', a.desde_ejemplo, 'proyecto.json')))
      throw new ErrorUso('Ejemplo desconocido: «' + a.desde_ejemplo + '». Usa listar_ejemplos.');
    const deck = JSON.parse(readFileSync(resolve(RAIZ, 'examples', a.desde_ejemplo, 'proyecto.json'), 'utf8'));
    r = await op('sanea', {deck});
    const cambios = {};
    for (const k of ['titulo', 'subtitulo', 'autores', 'institucion', 'fecha', 'tema', 'aspecto', 'acento']) if (a[k] != null) cambios[k] = a[k];
    if (Object.keys(cambios).length) r = await op('metadatos', {deck: r.deck, cambios});
    if (Array.isArray(a.diapositivas) && a.diapositivas.length) r = await op('agregaDiapositivas', {deck: r.deck, diapositivas: entrada.diapositivas, __datos: entrada.__datos});
  } else r = await op('nueva', entrada);
  guardaVersion(ruta, 'crear_presentacion');
  escribe(ruta, r.deck);
  const out = {archivo: visible(ruta), diapositivas: r.deck.slides.length, avisos: r.avisos};
  if (r.datos_importados) out.datos_importados = r.datos_importados;
  if (r.estructuras) out.estructuras = r.estructuras;
  out.nota = a.desde_ejemplo ? 'Copia de un ejemplo con datos ilustrativos: sustituye cifras y afirmaciones antes de presentar.'
    : r.deck.slides.length === 1 ? 'La presentación empieza con una portada; añade diapositivas con agregar_diapositivas.' : 'Revisa con revisar_presentacion y mira el resultado con vista_previa.';
  return out;
}

export async function ver(a) {
  const {ruta, deck} = lee(a.archivo);
  const {deck: limpio} = await op('sanea', {deck});
  const pinta = v => a.incluir_binarios ? v : compacta(v);
  if (a.diapositiva != null) {
    const n = /^\d+$/.test(String(a.diapositiva)) ? +a.diapositiva : limpio.slides.findIndex(s => s.id === a.diapositiva) + 1;
    if (!(n >= 1 && n <= limpio.slides.length)) throw new ErrorUso('No hay diapositiva «' + a.diapositiva + '»: la presentación tiene ' + limpio.slides.length + '.');
    return {archivo: visible(ruta), n, diapositiva: pinta(limpio.slides[n - 1])};
  }
  if (a.completo) return {archivo: visible(ruta), proyecto: pinta(limpio)};
  return {archivo: visible(ruta), ...(await op('esquema', {deck: limpio}))};
}

export const metadatos = a => modifica(a.archivo, 'metadatos', {cambios: a.cambios}, 'editar_metadatos');
export const agregaDiapositiva = a => modifica(a.archivo, 'agregaDiapositiva', a, 'agregar_diapositiva');
export const agregaDiapositivas = a => modifica(a.archivo, 'agregaDiapositivas', a, 'agregar_diapositivas');
export const duplicaDiapositiva = a => modifica(a.archivo, 'duplicaDiapositiva', a, 'duplicar_diapositiva');
export const editaDiapositiva = a => modifica(a.archivo, 'editaDiapositiva', a, 'editar_diapositiva');
export const eliminaDiapositiva = a => modifica(a.archivo, 'eliminaDiapositiva', a, 'eliminar_diapositiva');
export const mueveDiapositiva = a => modifica(a.archivo, 'mueveDiapositiva', a, 'mover_diapositiva');
export const agregaBloque = a => modifica(a.archivo, 'agregaBloque', a, 'agregar_bloque');
export const editaBloque = a => modifica(a.archivo, 'editaBloque', a, 'editar_bloque');
export const eliminaBloque = a => modifica(a.archivo, 'eliminaBloque', a, 'eliminar_bloque');
export const agregaReferencia = a => modifica(a.archivo, 'agregaReferencia', a, 'agregar_referencia');

export function historial(a) {
  const ruta = rutaSegura(a.archivo, '.json');
  const d = versiones(ruta, 'deshacer').reverse().map(n => describeVersion(ruta, 'deshacer', n));
  const r = versiones(ruta, 'rehacer').reverse().map(n => describeVersion(ruta, 'rehacer', n));
  return {archivo: visible(ruta), deshacer: d, rehacer: r};
}
/* deshacer y rehacer son la misma operación con las pilas cambiadas. */
function mueveVersion(a, desde, hacia, verbo) {
  const ruta = rutaSegura(a.archivo, '.json');
  const pasos = Math.max(1, Math.floor(+a.pasos || 1));
  const pila = versiones(ruta, desde);
  if (!pila.length) throw new ErrorUso('No hay nada que ' + verbo + ' en «' + visible(ruta) + '».');
  if (pasos > pila.length) throw new ErrorUso('Solo se puede ' + verbo + ' ' + pila.length + ' paso(s).');
  let ultima;
  for (let k = 0; k < pasos; k++) {
    const n = versiones(ruta, desde).pop();
    ultima = describeVersion(ruta, desde, n);
    if (existsSync(ruta)) apila(ruta, hacia, readFileSync(ruta, 'utf8'), n.split('__')[1].replace(/\.json$/, ''));
    const origen = resolve(dirHistorial(ruta, desde), n);
    escribe(ruta, JSON.parse(readFileSync(origen, 'utf8')));
    rmSync(origen);
  }
  return {archivo: visible(ruta), pasos, restaurado: {cuando: ultima.cuando, [verbo === 'deshacer' ? 'era_antes_de' : 'rehace']: ultima.antes_de, diapositivas: ultima.diapositivas},
    quedan: {deshacer: versiones(ruta, 'deshacer').length, rehacer: versiones(ruta, 'rehacer').length}};
}
export const deshacer = a => mueveVersion(a, 'deshacer', 'rehacer', 'deshacer');
export const rehacer = a => mueveVersion(a, 'rehacer', 'deshacer', 'rehacer');

export async function revisar(a) {
  const {ruta, deck} = lee(a.archivo);
  return {archivo: visible(ruta), ...(await op('revisa', {deck, minutos_objetivo: a.minutos_objetivo}))};
}

/* Formatos que no necesitan navegador. PDF, PowerPoint y la vista previa
   están en navegador.mjs. */
const EXT_FIG = {'image/png': 'png', 'image/jpeg': 'jpg', 'application/pdf': 'pdf'};
export async function exportaTexto(a, formato) {
  const {ruta, deck} = lee(a.archivo);
  const base = basename(ruta, '.json');
  if (formato === 'html') {
    const destino = rutaSegura(a.destino || base + '.html', '.html');
    const r = await op('html', {deck});
    mkdirSync(dirname(destino), {recursive: true});
    writeFileSync(destino, r.html);
    return {archivo: visible(destino), bytes: statSync(destino).size, nota: 'Ábrelo en un navegador e imprime a PDF sin márgenes y con gráficos de fondo.'};
  }
  /* Beamer: una carpeta con el .tex y sus figuras, lista para subir a
     Overleaf. El .tex deja un recuadro donde falte una figura, así que
     compila aunque alguna no se haya podido escribir. */
  const r = await op('beamer', {deck});
  const carpeta = rutaSegura(a.destino ? a.destino.replace(/\.tex$/i, '') : base + '-beamer');
  mkdirSync(carpeta, {recursive: true});
  writeFileSync(resolve(carpeta, base + '.tex'), r.tex);
  const escritas = [], avisos = [];
  for (const f of r.figuras) {
    const m = /^data:([^;,]+)((?:;[^,;]*)*),(.*)$/s.exec(f.src || '');
    if (!m) { avisos.push('«' + f.nombre + '» es un recurso remoto (' + String(f.src).slice(0, 60) + '): descárgalo y súbelo como ' + f.nombre + '.png.'); continue; }
    const ext = EXT_FIG[m[1]];
    if (!ext) { avisos.push('«' + f.nombre + '» es ' + m[1] + ', que Beamer no inserta: conviértela a PNG o PDF con ese nombre (en el editor, «Exportar figuras» lo hace).'); continue; }
    const bytes = /;base64/i.test(m[2]) ? Buffer.from(m[3], 'base64') : Buffer.from(decodeURIComponent(m[3]), 'utf8');
    writeFileSync(resolve(carpeta, f.nombre + '.' + ext), bytes);
    escritas.push(f.nombre + '.' + ext);
    if (f.estilo) avisos.push('«' + f.nombre + '» lleva forma, marco, sombra o filtro del editor; aquí va la imagen original. «Exportar figuras» del editor la da con el estilo aplicado.');
  }
  return {carpeta: visible(carpeta), tex: visible(resolve(carpeta, base + '.tex')), figuras: escritas, avisos,
    nota: 'Sube la carpeta a Overleaf o compila localmente con dos pasadas de ' + (r.motor === 'xelatex' ? 'XeLaTeX o LuaLaTeX (el tema usa la letra Fira)' : 'pdflatex') + '.'};
}

export async function proyectoValidado(archivo) {
  const {ruta, deck} = lee(archivo);
  return {ruta, deck: (await op('sanea', {deck})).deck};
}
/* Lo que usan las extensiones para escribir herramientas propias. */
export {visible, RAIZ, op, modifica, lee, escribe, guardaVersion, preparaEntrada, archivoEnCarpeta, compacta};
