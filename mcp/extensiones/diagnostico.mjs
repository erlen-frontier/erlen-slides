/* SPDX-License-Identifier: AGPL-3.0-only */
/* Diagnóstico: qué versión de Node corre el servidor, si la aplicación está
   construida y al día, dónde está la carpeta de trabajo, si hay Chromium y si
   RDKit carga. Cuando algo falla, la respuesta trae el comando que lo arregla,
   para que el asistente se lo pueda dar tal cual a quien no programa.

   Las comprobaciones sueltas se exportan también: las usa el instalador
   (herramientas/mcp-instalar.mjs), que corre antes de que el servidor exista
   en el cliente. Por eso aquí nada importa de node_modules al cargar. */
import {readdirSync, statSync, existsSync, accessSync, constants} from 'node:fs';
import {resolve, relative, join, sep} from 'node:path';
import {homedir} from 'node:os';
import {RAIZ, version, listar} from '../motor.mjs';
import {archivos, CARPETAS} from '../extensiones.mjs';
import {candidatos} from '../navegador.mjs';

export const NODE_MINIMO = 22;
export const nodeValido = (v = process.versions.node) => Number(String(v).split('.')[0]) >= NODE_MINIMO;

/* El archivo más reciente de un árbol. node_modules y los ocultos no cuentan:
   no son fuente de la aplicación. */
function masReciente(dir) {
  let mejor = null;
  const recorre = d => {
    let entradas;
    try { entradas = readdirSync(d, {withFileTypes: true}); } catch { return; }
    for (const e of entradas) {
      if (e.name.startsWith('.') || e.name === 'node_modules') continue;
      const r = join(d, e.name);
      if (e.isDirectory()) { recorre(r); continue; }
      try { const t = statSync(r).mtimeMs; if (!mejor || t > mejor.t) mejor = {t, ruta: r}; } catch {}
    }
  };
  recorre(dir);
  return mejor;
}

/* ¿Existe public/index.html y es posterior a todo src/? Tras un «git pull» la
   fuente cambia y el servidor seguiría usando la aplicación vieja sin avisar.
   El build escribe dos módulos generados en src/js antes que public/, así que
   una compilación recién hecha siempre queda por delante. */
export function estadoCompilacion(raiz = RAIZ) {
  const app = resolve(raiz, 'public/index.html');
  const fuente = masReciente(resolve(raiz, 'src'));
  if (!existsSync(app)) return {existe: false, al_dia: false, archivo: app};
  const construida = statSync(app).mtimeMs;
  const alDia = !fuente || construida >= fuente.t;
  return {existe: true, al_dia: alDia, archivo: app, construida: new Date(construida).toISOString(),
    ...(alDia ? {} : {cambio_posterior: relative(raiz, fuente.ruta).split(sep).join('/'), modificado: new Date(fuente.t).toISOString()})};
}

/* Las dependencias que el servidor carga siempre. Mirar el package.json de
   cada una basta para saber si «npm ci» se hizo, sin cargarlas. */
export function dependenciasInstaladas(raiz = RAIZ) {
  const faltan = ['jsdom', 'fake-indexeddb', '@rdkit/rdkit', 'playwright-core']
    .filter(p => !existsSync(resolve(raiz, 'node_modules', p, 'package.json')));
  return {ok: !faltan.length, faltan};
}

/* Rutas habituales de Chrome y Edge, para contestar sin lanzar nada. Con
   «channel» Playwright los busca en estas mismas rutas. */
function rutasCanal(canal) {
  const pf = [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean);
  if (canal === 'chrome') return ['/opt/google/chrome/chrome', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ...pf.map(p => join(p, 'Google', 'Chrome', 'Application', 'chrome.exe'))];
  return ['/opt/microsoft/msedge/msedge', '/usr/bin/microsoft-edge', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    ...pf.map(p => join(p, 'Microsoft', 'Edge', 'Application', 'msedge.exe'))];
}

/* El primer navegador que usaría la vista previa, con los mismos candidatos
   y en el mismo orden que mcp/navegador.mjs, pero sin arrancarlo. */
export async function buscaNavegador() {
  for (const c of candidatos()) {
    if (c.executablePath) {
      if (existsSync(c.executablePath)) return {encontrado: true, ruta: c.executablePath, origen: process.env.ERLEN_CHROMIUM ? 'ERLEN_CHROMIUM' : 'instalado'};
      if (process.env.ERLEN_CHROMIUM) return {encontrado: false, origen: 'ERLEN_CHROMIUM', ruta: c.executablePath};
      continue;
    }
    if (c.channel) {
      const r = rutasCanal(c.channel).find(existsSync);
      if (r) return {encontrado: true, ruta: r, origen: c.channel === 'chrome' ? 'Google Chrome' : 'Microsoft Edge'};
      continue;
    }
    try {
      const pw = (await import('playwright-core')).default;
      const r = pw.chromium.executablePath();
      if (r && existsSync(r)) return {encontrado: true, ruta: r, origen: 'playwright-core'};
    } catch {}
  }
  return {encontrado: false};
}

/* Arrancarlo de verdad: solo si se pide, porque tarda y abre un proceso. */
async function pruebaNavegador() {
  let pw;
  try { pw = (await import('playwright-core')).default; } catch (e) { return {ok: false, error: 'No se pudo cargar playwright-core: ' + String(e.message).split('\n')[0]}; }
  let primerError = null;
  for (const opciones of candidatos()) {
    try {
      const n = await pw.chromium.launch(opciones);
      const v = n.version();
      await n.close();
      return {ok: true, version: v};
    } catch (e) { primerError ||= e; if (process.env.ERLEN_CHROMIUM) break; }
  }
  return {ok: false, error: String(primerError && primerError.message || 'sin candidatos').split('\n')[0]};
}

async function pruebaRDKit() {
  const t0 = Date.now();
  try {
    const rd = await (await import('@rdkit/rdkit')).default();
    return {cargado: true, version: rd.version(), milisegundos: Date.now() - t0};
  } catch (e) { return {cargado: false, error: String(e && e.message || e).split('\n')[0]}; }
}

function tamanoArbol(dir) {
  let archivos = 0, bytes = 0;
  const recorre = d => {
    let entradas;
    try { entradas = readdirSync(d, {withFileTypes: true}); } catch { return; }
    for (const e of entradas) {
      const r = join(d, e.name);
      if (e.isDirectory()) recorre(r);
      else { archivos++; try { bytes += statSync(r).size; } catch {} }
    }
  };
  recorre(dir);
  return {archivos, bytes, legible: bytes < 1048576 ? Math.round(bytes / 1024) + ' KB' : (bytes / 1048576).toFixed(1) + ' MB'};
}

/* La carpeta se examina sin crearla: si no existe, eso es justo lo que hay
   que contar (el servidor la crea en la primera escritura). */
function estadoCarpeta() {
  const ruta = resolve(process.env.ERLEN_SLIDES_DIR || resolve(homedir(), 'erlen-slides'));
  const out = {ruta, origen: process.env.ERLEN_SLIDES_DIR ? 'ERLEN_SLIDES_DIR' : 'por omisión (~/erlen-slides)', existe: existsSync(ruta)};
  if (!out.existe) return out;
  try { accessSync(ruta, constants.W_OK); out.escribible = true; } catch { out.escribible = false; }
  try { out.presentaciones = listar().presentaciones.length; } catch (e) { out.presentaciones = null; out.error = e.message; }
  out.historial = tamanoArbol(resolve(ruta, '.historial'));
  return out;
}

/* Variables que cambian el comportamiento del servidor. Las rutas se enseñan;
   de las que pueden llevar credenciales (un proxy con usuario y clave) o
   cualquier cosa con pinta de secreto, solo el nombre. */
const VARIABLES = ['ERLEN_SLIDES_DIR', 'ERLEN_CHROMIUM', 'ERLEN_MCP_EXTENSIONES', 'PLAYWRIGHT_BROWSERS_PATH', 'NODE_OPTIONS', 'NODE_EXTRA_CA_CERTS', 'HTTPS_PROXY', 'HTTP_PROXY', 'NO_PROXY'];
const SENSIBLE = /KEY|TOKEN|SECRET|PASS|AUTH|CRED|PROXY|NODE_OPTIONS/i;
export function variables(env = process.env) {
  const nombres = new Set([...VARIABLES, ...Object.keys(env).filter(k => k.startsWith('ERLEN_'))]);
  const out = {};
  for (const k of [...nombres].sort()) {
    if (env[k] == null) continue;
    out[k] = SENSIBLE.test(k) ? '(definida)' : env[k];
  }
  return out;
}

export async function diagnostico(a = {}) {
  const problemas = [];
  const problema = (que, arreglo) => problemas.push({problema: que, arreglo});
  const enRaiz = c => 'cd "' + RAIZ + '" && ' + c;

  const node = {version: process.versions.node, ejecutable: process.execPath, minimo: NODE_MINIMO, ok: nodeValido()};
  if (!node.ok) problema('Node ' + node.version + ' es anterior a ' + NODE_MINIMO + '.', 'Instala Node.js ' + NODE_MINIMO + ' o posterior (versión LTS de https://nodejs.org) y vuelve a ejecutar «npm run mcp:instalar».');

  const dependencias = dependenciasInstaladas();
  if (!dependencias.ok) problema('Faltan dependencias: ' + dependencias.faltan.join(', ') + '.', enRaiz('npm ci'));

  const compilacion = estadoCompilacion();
  if (!compilacion.existe) problema('La aplicación no está construida (falta public/index.html).', enRaiz('npm run build'));
  else if (!compilacion.al_dia) problema('La aplicación construida es anterior a la fuente (' + compilacion.cambio_posterior + ' cambió después). El servidor usa la versión vieja.', enRaiz('npm run build') + ' y reinicia el cliente MCP');

  const carpeta = estadoCarpeta();
  if (carpeta.existe && !carpeta.escribible) problema('No se puede escribir en la carpeta de trabajo ' + carpeta.ruta + '.', 'Da permiso de escritura a esa carpeta o elige otra con ERLEN_SLIDES_DIR (npm run mcp:instalar -- --carpeta <otra>).');
  if (carpeta.historial && carpeta.historial.bytes > 500 * 1048576) problema('El historial ocupa ' + carpeta.historial.legible + '.', 'Puedes borrar ' + join(carpeta.ruta, '.historial') + ' sin perder las presentaciones (solo se pierde deshacer).');

  const navegador = await buscaNavegador();
  if (a.probar_navegador) navegador.prueba = await pruebaNavegador();
  if (!navegador.encontrado || (navegador.prueba && !navegador.prueba.ok)) {
    problema(navegador.origen === 'ERLEN_CHROMIUM' && !navegador.encontrado ? 'ERLEN_CHROMIUM apunta a ' + navegador.ruta + ', que no existe.'
      : navegador.encontrado ? 'Chromium no arrancó: ' + navegador.prueba.error
      : 'No hay Chromium ni Chrome: vista_previa, PDF y PowerPoint no funcionarán (lo demás sí).',
    enRaiz('npx playwright-core install chromium'));
  }

  const rdkit = await pruebaRDKit();
  if (!rdkit.cargado) problema('RDKit no carga: las estructuras desde SMILES o MOL no funcionarán. ' + rdkit.error, enRaiz('npm ci'));

  const extensiones = [...archivos('.mjs'), ...archivos('.pagina.js')].sort().map(r => {
    const base = CARPETAS.find(c => r.startsWith(c)) || CARPETAS[0];
    return base === CARPETAS[0] ? relative(RAIZ, r).split(sep).join('/') : r;
  });

  return {
    estado: problemas.length ? 'con_problemas' : 'bien',
    problemas,
    node,
    aplicacion: {version: version(), raiz: RAIZ, servidor: resolve(RAIZ, 'mcp', 'servidor.mjs'), dependencias, compilacion},
    carpeta_trabajo: carpeta,
    navegador,
    rdkit,
    extensiones,
    variables: variables(),
    plataforma: {sistema: process.platform, arquitectura: process.arch}
  };
}

export default {
  herramientas: [{
    name: 'diagnostico', title: 'Diagnóstico de la instalación',
    description: 'Comprueba la instalación del servidor: versión de Node, si la aplicación está construida y al día, la carpeta de trabajo (proyectos e historial), Chromium para la vista previa, RDKit y las extensiones cargadas. Cada problema trae el comando que lo arregla. Úsala cuando algo falle de forma rara o el usuario pregunte si todo está bien instalado.',
    inputSchema: {type: 'object', properties: {probar_navegador: {type: 'boolean', description: 'Arranca Chromium de verdad para comprobarlo (tarda unos segundos). Por omisión solo se busca.'}}},
    annotations: {readOnlyHint: true, openWorldHint: false},
    run: diagnostico
  }]
};
