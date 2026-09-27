/* SPDX-License-Identifier: AGPL-3.0-only */
/* Motor del servidor MCP: la aplicación construida, cargada en JSDOM, y la
   carpeta de trabajo donde viven los proyectos JSON v1.

   Cada cambio se lee del disco, se aplica con las funciones de la propia
   aplicación, pasa por saneaDeck y solo entonces se escribe. Si algo falla,
   el archivo anterior queda intacto y el error se devuelve tal cual. */
import {readFileSync, writeFileSync, renameSync, readdirSync, statSync, existsSync, mkdirSync} from 'node:fs';
import {resolve, relative, isAbsolute, extname, basename, dirname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {homedir} from 'node:os';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const APP = resolve(RAIZ, 'public/index.html');
const MAX_IMAGEN = 8 * 1024 * 1024;
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
  dom.window.eval(readFileSync(new URL('./operaciones.js', import.meta.url), 'utf8'));
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
/* Lee, aplica, valida y guarda. Devuelve el resultado de la operación y los
   avisos de saneaDeck, que el modelo debe ver: dicen qué se reparó. */
async function modifica(archivo, operacion, args) {
  const {ruta, deck} = lee(archivo);
  const r = await op(operacion, {...args, deck});
  escribe(ruta, r.deck);
  return {archivo: visible(ruta), ...(r.resultado || {}), avisos: r.avisos};
}

/* Las imágenes se incrustan como data: URI, que es lo que guarda la app. */
function incrustaImagenes(bloque, esImagen) {
  if (!bloque || typeof bloque !== 'object') return bloque;
  const b = {...bloque};
  if ((esImagen || (b.tipo || b.type) === 'image') && b.archivo) {
    const ruta = rutaSegura(String(b.archivo));
    const ext = extname(ruta).toLowerCase();
    if (!MIME[ext]) throw new ErrorUso('Formato de imagen no admitido: ' + ext + '. Usa ' + Object.keys(MIME).join(', ') + '.');
    if (!existsSync(ruta)) throw new ErrorUso('No existe la imagen «' + visible(ruta) + '» en la carpeta de trabajo.');
    const st = statSync(ruta);
    if (st.size > MAX_IMAGEN) throw new ErrorUso('La imagen pesa ' + Math.round(st.size / 1048576) + ' MB; el límite es 8 MB.');
    b.src = 'data:' + MIME[ext] + ';base64,' + readFileSync(ruta).toString('base64');
    delete b.archivo;
  }
  return b;
}
const incrustaZonas = zonas => Array.isArray(zonas) ? zonas.map(z => Array.isArray(z) ? z.map(incrustaImagenes) : z) : zonas;

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
  return {carpeta: base, presentaciones: out};
}

export function ejemplos() {
  const cat = JSON.parse(readFileSync(resolve(RAIZ, 'examples/catalog.json'), 'utf8'));
  return cat.map(e => ({id: e.id, titulo: e.title, descripcion: e.description, diapositivas: e.slides, datos: 'ilustrativos'}));
}

export async function crear(a) {
  const ruta = rutaSegura(a.archivo, '.json');
  if (existsSync(ruta) && !a.sobrescribir) throw new ErrorUso('«' + visible(ruta) + '» ya existe. Elige otro nombre o pasa sobrescribir: true.');
  let r;
  if (a.desde_ejemplo) {
    if (!/^[a-z0-9-]+$/.test(a.desde_ejemplo) || !existsSync(resolve(RAIZ, 'examples', a.desde_ejemplo, 'proyecto.json')))
      throw new ErrorUso('Ejemplo desconocido: «' + a.desde_ejemplo + '». Usa listar_ejemplos.');
    const deck = JSON.parse(readFileSync(resolve(RAIZ, 'examples', a.desde_ejemplo, 'proyecto.json'), 'utf8'));
    r = await op('sanea', {deck});
    const cambios = {};
    for (const k of ['titulo', 'subtitulo', 'autores', 'institucion', 'fecha', 'tema', 'aspecto']) if (a[k] != null) cambios[k] = a[k];
    if (Object.keys(cambios).length) r = await op('metadatos', {deck: r.deck, cambios});
  } else r = await op('nueva', a);
  escribe(ruta, r.deck);
  return {archivo: visible(ruta), diapositivas: r.deck.slides.length, avisos: r.avisos,
    nota: a.desde_ejemplo ? 'Copia de un ejemplo con datos ilustrativos: sustituye cifras y afirmaciones antes de presentar.' : 'La presentación empieza con una portada; añade diapositivas con agregar_diapositiva.'};
}

export async function ver(a) {
  const {ruta, deck} = lee(a.archivo);
  const {deck: limpio} = await op('sanea', {deck});
  if (a.completo) return {archivo: visible(ruta), proyecto: limpio};
  return {archivo: visible(ruta), ...(await op('esquema', {deck: limpio}))};
}

export const metadatos = a => modifica(a.archivo, 'metadatos', {cambios: a.cambios});
export const agregaDiapositiva = a => modifica(a.archivo, 'agregaDiapositiva', {...a, zonas: incrustaZonas(a.zonas)});
export const editaDiapositiva = a => modifica(a.archivo, 'editaDiapositiva', {...a, zonas: incrustaZonas(a.zonas)});
export const eliminaDiapositiva = a => modifica(a.archivo, 'eliminaDiapositiva', a);
export const mueveDiapositiva = a => modifica(a.archivo, 'mueveDiapositiva', a);
export const agregaBloque = a => modifica(a.archivo, 'agregaBloque', {...a, bloque: incrustaImagenes(a.bloque)});
export const editaBloque = a => modifica(a.archivo, 'editaBloque', {...a, cambios: incrustaImagenes(a.cambios || {}, true)});
export const eliminaBloque = a => modifica(a.archivo, 'eliminaBloque', a);
export const agregaReferencia = a => modifica(a.archivo, 'agregaReferencia', a);

export async function revisar(a) {
  const {ruta, deck} = lee(a.archivo);
  return {archivo: visible(ruta), ...(await op('revisa', {deck}))};
}

/* Formatos que no necesitan navegador. PDF, PowerPoint y la vista previa
   están en navegador.mjs. */
export async function exportaTexto(a, formato) {
  const {ruta, deck} = lee(a.archivo);
  const ext = formato === 'beamer' ? '.tex' : '.html';
  const destino = rutaSegura(a.destino || basename(ruta, '.json') + ext, ext);
  const r = await op(formato === 'beamer' ? 'beamer' : 'html', {deck});
  writeFileSync(destino, formato === 'beamer' ? r.tex : r.html);
  return {archivo: visible(destino), bytes: statSync(destino).size};
}

export async function proyectoValidado(archivo) {
  const {ruta, deck} = lee(archivo);
  return {ruta, deck: (await op('sanea', {deck})).deck};
}
export {visible, RAIZ};
