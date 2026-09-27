/* SPDX-License-Identifier: AGPL-3.0-only */
/* Abrir en el editor: lo que la IA construyó, delante de la persona, en la
   aplicación de verdad y en su navegador.

   El editor guarda sus proyectos en el almacenamiento del navegador de su
   origen, así que no puede leer la carpeta de trabajo por su cuenta. Aquí se
   sirve public/ en 127.0.0.1 (un servidor por proceso, reutilizado) con una
   sola ruta más: /mcp/abrir/<clave>, que entrega UN proyecto, una vez y
   durante unos minutos. La clave es aleatoria (192 bits) y solo apunta a una
   copia en memoria hecha al llamar la herramienta: del navegador no llega
   ninguna ruta de archivo. La página la pide al mismo origen, enseña qué
   llega y lo abre solo si la persona lo confirma (88-workspace.js). */
import http from 'node:http';
import {randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
import {readFile, stat} from 'node:fs/promises';
import {resolve, extname, join, sep, basename} from 'node:path';
import {ErrorUso, RAIZ, lee, op, visible} from '../motor.mjs';

const PUBLICO = resolve(RAIZ, 'public');
const TIPOS = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8'};
/* 8130 es el puerto de «npm start»: el almacenamiento del navegador va por
   origen (con puerto), así que en el mismo puerto la biblioteca es la misma
   se abra el editor desde aquí o desde npm start. Si está ocupado, cualquiera
   libre, y se avisa de que esa biblioteca es otra. */
const PUERTO = process.env.ERLEN_SLIDES_PUERTO != null && process.env.ERLEN_SLIDES_PUERTO !== '' ? Number(process.env.ERLEN_SLIDES_PUERTO) : 8130;
const CADUCIDAD_MS = Math.max(1, Number(process.env.ERLEN_SLIDES_CADUCIDAD) || 600) * 1000;
const MAX_PENDIENTES = 20;
const RUTA = '/mcp/abrir/';

/* clave → {cuerpo, caduca}. Se borra al entregarse o al caducar. */
const pendientes = new Map();
const purga = () => { const ahora = Date.now(); for (const [k, v] of pendientes) if (v.caduca <= ahora) pendientes.delete(k); };

const cabeceras = tipo => ({'content-type': tipo, 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer'});
async function atiende(q, r, puerto) {
  /* Solo quien escribe 127.0.0.1 o localhost con este puerto: una página de
     Internet que redirija su dominio a 127.0.0.1 (DNS rebinding) trae otro Host. */
  if (q.headers.host !== '127.0.0.1:' + puerto && q.headers.host !== 'localhost:' + puerto) { r.writeHead(403, cabeceras('text/plain; charset=utf-8')).end('Prohibido'); return; }
  if (q.method !== 'GET' && q.method !== 'HEAD') { r.writeHead(405, {allow: 'GET, HEAD'}).end(); return; }
  let camino;
  try { camino = decodeURIComponent(new URL(q.url, 'http://127.0.0.1').pathname); } catch { r.writeHead(400).end(); return; }
  if (camino.startsWith(RUTA)) {
    purga();
    const clave = camino.slice(RUTA.length), p = /^[A-Za-z0-9_-]{16,128}$/.test(clave) && pendientes.get(clave);
    const no = {...cabeceras('application/json; charset=utf-8'), 'cache-control': 'no-store'};
    if (!p) { r.writeHead(404, no).end(JSON.stringify({error: 'El enlace caducó, ya se usó o no existe.'})); return; }
    if (q.method === 'HEAD') { r.writeHead(200, no).end(); return; }
    pendientes.delete(clave);
    r.writeHead(200, no).end(p.cuerpo);
    return;
  }
  /* El resto, archivos de public/ y nada más: sin listados de carpetas. */
  try {
    let p = resolve(PUBLICO, '.' + camino);
    if (p !== PUBLICO && !p.startsWith(PUBLICO + sep)) { r.writeHead(403).end(); return; }
    if ((await stat(p)).isDirectory()) p = join(p, 'index.html');
    const cuerpo = await readFile(p);
    r.writeHead(200, cabeceras(TIPOS[extname(p)] || 'application/octet-stream')).end(q.method === 'HEAD' ? undefined : cuerpo);
  } catch { r.writeHead(404, cabeceras('text/plain; charset=utf-8')).end('Archivo no encontrado'); }
}

const escucha = (servidor, puerto) => new Promise((ok, mal) => {
  const falla = e => { servidor.off('listening', listo); mal(e); };
  const listo = () => { servidor.off('error', falla); ok(); };
  servidor.once('error', falla).once('listening', listo).listen(puerto, '127.0.0.1');
});
let arranque = null;
async function arranca() {
  let puerto = 0;
  const servidor = http.createServer((q, r) => { atiende(q, r, puerto).catch(() => { try { r.writeHead(500).end(); } catch {} }); });
  let aviso = null;
  try { await escucha(servidor, PUERTO); }
  catch (e) {
    if (!PUERTO || e.code !== 'EADDRINUSE') throw new ErrorUso('No se pudo abrir el servidor local del editor: ' + e.message);
    await escucha(servidor, 0);
    aviso = 'El puerto ' + PUERTO + ' está ocupado (¿«npm start» u otra sesión del asistente?); el editor se sirve en otro. El navegador guarda la biblioteca por dirección: la de este puerto es distinta de la de http://127.0.0.1:' + PUERTO + '.';
  }
  puerto = servidor.address().port;
  /* No retiene el proceso: cuando el cliente MCP cierra, el servidor se va con él. */
  servidor.unref();
  return {servidor, puerto, aviso};
}
function servidorLocal() {
  arranque ||= arranca().catch(e => { arranque = null; throw e; });
  return arranque;
}

/* El navegador del sistema, con el programa y sus argumentos por separado:
   nunca una orden de shell armada con texto. La URL la construye este
   archivo (puerto numérico y clave base64url), no la IA ni el proyecto. */
function abreNavegador(url) {
  const [programa, args, extra] = process.platform === 'darwin' ? ['open', [url], {}]
    : process.platform === 'win32' ? ['cmd', ['/c', 'start', '""', url], {windowsVerbatimArguments: true}]
    : ['xdg-open', [url], {}];
  return new Promise(ok => {
    let hijo;
    try { hijo = spawn(programa, args, {stdio: 'ignore', detached: true, ...extra}); }
    catch (e) { ok('no se abrió (' + e.message + ')'); return; }
    hijo.once('error', e => ok('no se abrió (' + (e.code === 'ENOENT' ? 'no está «' + programa + '»' : e.message) + ')'));
    hijo.once('spawn', () => { hijo.unref(); ok('abierto'); });
  });
}

export default {
  herramientas: [{
    name: 'abrir_en_editor', title: 'Abrir en el editor',
    description: 'Abre el proyecto en el editor de Erlen Slides, en el navegador del usuario, para que lo vea y lo siga editando a mano. Sirve la app en 127.0.0.1 con un enlace de un solo uso que caduca en 10 minutos y devuelve siempre la URL por si el navegador no se abre. El editor pide confirmación antes de abrirlo. Lo que se edite en el navegador se guarda en el navegador, no en el archivo: para traerlo de vuelta, «Exportar → Proyecto (.json)» a la carpeta de trabajo.',
    inputSchema: {type: 'object', required: ['archivo'], properties: {archivo: {type: 'string', description: 'Proyecto de la carpeta de trabajo.'}}},
    annotations: {readOnlyHint: true, openWorldHint: false},
    run: async a => {
      const {ruta, deck} = lee(a.archivo);
      /* Se valida aquí para que un proyecto roto lo sepa la IA, no la persona
         delante de un aviso en el navegador. Viaja el archivo tal cual: la
         página lo vuelve a sanear y enseña los ajustes, como «Abrir proyecto». */
      await op('sanea', {deck});
      const {puerto, aviso} = await servidorLocal();
      purga();
      if (pendientes.size >= MAX_PENDIENTES) pendientes.delete(pendientes.keys().next().value);
      const clave = randomBytes(24).toString('base64url');
      const caduca = Date.now() + CADUCIDAD_MS;
      pendientes.set(clave, {caduca, cuerpo: JSON.stringify({formato: 'erlen-mcp-abrir-v1', archivo: basename(ruta), deck})});
      const url = 'http://127.0.0.1:' + puerto + '/?abrir=' + clave;
      const navegador = process.env.ERLEN_SLIDES_SIN_NAVEGADOR === '1' ? 'no se abrió (ERLEN_SLIDES_SIN_NAVEGADOR=1)' : await abreNavegador(url);
      const out = {archivo: visible(ruta), url, navegador, caduca: new Date(caduca).toISOString(),
        nota: (navegador === 'abierto' ? 'Se abrió el navegador. ' : 'Dale al usuario la URL para que la abra en su navegador. ') +
          'El enlace sirve una sola vez; el editor enseña la presentación y pide confirmación antes de abrirla. ' +
          'Desde ahí la copia del navegador es independiente del archivo: lo que el usuario edite se guarda en el navegador, no en «' + visible(ruta) + '». ' +
          'Para traer sus cambios, que use Exportar → Proyecto (.json) y guarde el archivo en la carpeta de trabajo con el mismo nombre; si después sigues editando con estas herramientas, vuelve a leerlo antes. ' +
          'El editor funciona mientras esté conectado este asistente.'};
      if (aviso) out.aviso = aviso;
      return out;
    }
  }],
  convenciones: {
    editor: 'abrir_en_editor enseña el proyecto en el editor del usuario (en su navegador) y devuelve la URL. Úsalo al terminar una versión o cuando el usuario quiera retocar a mano. Recuérdale que los cambios hechos en el navegador no vuelven solos al archivo: se traen con Exportar → Proyecto (.json).'
  }
};
