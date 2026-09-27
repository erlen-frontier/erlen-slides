/* SPDX-License-Identifier: AGPL-3.0-only */
/* Lo que necesita un navegador de verdad: ver cómo queda una diapositiva,
   imprimir el PDF y armar el PowerPoint. JSDOM no mide ni rasteriza, así que
   estas tres salidas se hacen en Chromium (playwright-core), con la aplicación
   servida desde public/ en 127.0.0.1 y sin salir a Internet.

   Chromium es opcional: si no está instalado, el resto del servidor funciona
   y estas herramientas lo dicen con el comando para instalarlo. */
import http from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {resolve, extname, join, sep, basename, dirname} from 'node:path';
import {readdirSync, existsSync, mkdirSync} from 'node:fs';
import {homedir} from 'node:os';
import {ErrorUso, RAIZ, rutaSegura, visible, proyectoValidado} from './motor.mjs';

const PUBLICO = resolve(RAIZ, 'public');
const TIPOS = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png'};

/* Dónde buscar un navegador, en orden: el indicado, el de playwright-core,
   Chrome o Edge instalados, cualquier Chromium de otra versión de Playwright
   y los de sistema. Así la vista previa funciona sin configurar nada en la
   mayoría de las máquinas. */
export function candidatos() {
  if (process.env.ERLEN_CHROMIUM) return [{executablePath: process.env.ERLEN_CHROMIUM}];
  const out = [{}, {channel: 'chrome'}, {channel: 'msedge'}];
  const cachés = [process.env.PLAYWRIGHT_BROWSERS_PATH, join(homedir(), '.cache', 'ms-playwright'), join(homedir(), 'Library', 'Caches', 'ms-playwright'),
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'ms-playwright')].filter(Boolean);
  const dentro = ['chrome-linux/chrome', 'chrome-linux64/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium', 'chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium', 'chrome-win/chrome.exe', 'chrome-win64/chrome.exe',
    'chrome-linux/headless_shell', 'chrome-headless-shell-linux64/chrome-headless-shell'];
  for (const c of cachés) {
    let dirs = [];
    try { dirs = readdirSync(c).filter(n => /^chromium(_headless_shell)?-\d+$/.test(n)).sort().reverse(); } catch {}
    for (const d of dirs) for (const x of dentro) { const r = join(c, d, x); if (existsSync(r)) out.push({executablePath: r}); }
  }
  ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium']
    .forEach(r => { if (existsSync(r)) out.push({executablePath: r}); });
  return out;
}

let arranque = null;
async function arranca() {
  let pw;
  try { pw = (await import('playwright-core')).default; } catch { throw new ErrorUso('Falta playwright-core. Ejecuta «npm ci» en ' + RAIZ + '.'); }
  const servidor = http.createServer(async (q, r) => {
    try {
      let p = resolve(PUBLICO, '.' + decodeURIComponent(new URL(q.url, 'http://x').pathname));
      if (p !== PUBLICO && !p.startsWith(PUBLICO + sep)) { r.writeHead(403).end(); return; }
      if ((await stat(p)).isDirectory()) p = join(p, 'index.html');
      r.writeHead(200, {'content-type': TIPOS[extname(p)] || 'application/octet-stream'}).end(await readFile(p));
    } catch { r.writeHead(404).end(); }
  });
  await new Promise(ok => servidor.listen(0, '127.0.0.1', ok));
  servidor.unref();
  let navegador, primerError = null;
  for (const opciones of candidatos()) {
    try { navegador = await pw.chromium.launch(opciones); break; }
    catch (e) { primerError ||= e; if (process.env.ERLEN_CHROMIUM) break; }
  }
  if (!navegador) {
    servidor.close();
    throw new ErrorUso('No se encontró Chromium ni Chrome. Instálalo con «npx playwright-core install chromium» en ' + RAIZ +
      ' o indica uno con la variable ERLEN_CHROMIUM. Detalle: ' + String(primerError && primerError.message).split('\n')[0]);
  }
  const contexto = await navegador.newContext({acceptDownloads: true, viewport: {width: 1440, height: 900}});
  contexto.setDefaultTimeout(90000);
  const pagina = await contexto.newPage();
  await pagina.goto(`http://127.0.0.1:${servidor.address().port}/`);
  await pagina.waitForFunction(() => typeof loadDeck === 'function' && typeof buildPrintableHTML === 'function');
  return {navegador, contexto, pagina, servidor};
}
async function sesion() {
  arranque ||= arranca().catch(e => { arranque = null; throw e; });
  return arranque;
}
export async function cierra() {
  if (!arranque) return;
  try { const s = await arranque; await s.navegador.close(); s.servidor.close(); } catch {}
  arranque = null;
}

/* Abre el proyecto en la aplicación y devuelve una página con la versión
   imprimible: una .pr-page por diapositiva, con el CSS de la app. */
async function imprimible(archivo) {
  const {ruta, deck} = await proyectoValidado(archivo);
  const s = await sesion();
  const info = await s.pagina.evaluate(d => { loadDeck(d, null); const [W, H] = slideDims(d); return {html: buildPrintableHTML(false), W, H}; }, deck);
  const p = await s.contexto.newPage({viewport: {width: info.W, height: info.H}});
  await p.setContent(info.html, {waitUntil: 'load'});
  await p.evaluate(() => document.fonts && document.fonts.ready);
  return {ruta, deck, p, W: info.W, H: info.H};
}

/* Qué se sale de su sitio, medido en Chromium: bloques que invaden el pie o
   rebasan el borde, y zonas cuyo contenido no cabe. JSDOM no puede decirlo. */
function mideDesbordes(pagina) {
  const sl = pagina.querySelector('.slide');
  if (!sl) return [];
  const R = sl.getBoundingClientRect();
  const pie = sl.querySelector('.footline');
  const limite = pie && pie.getBoundingClientRect().height ? pie.getBoundingClientRect().top : R.bottom;
  const out = [];
  sl.querySelectorAll('[data-bid]').forEach(b => {
    let abajo = -Infinity, derecha = -Infinity;
    for (const x of [b, ...b.querySelectorAll('*')]) {
      /* El MathML de KaTeX está para los lectores de pantalla, recortado a un
         píxel: tiene medidas, pero no se ve. */
      if (x.closest('.katex-mathml')) continue;
      const r = x.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      /* Lo que un contenedor recorta cuenta igual: en la sala se ve cortado. */
      abajo = Math.max(abajo, r.bottom); derecha = Math.max(derecha, r.right);
    }
    const dy = Math.round(abajo - limite), dx = Math.round(derecha - R.right);
    if (dy > 2 || dx > 2) out.push({bloque: b.dataset.bid, px_abajo: Math.max(0, dy), px_derecha: Math.max(0, dx)});
  });
  return out;
}

export async function vistaPrevia(a) {
  const {deck, p, W, H} = await imprimible(a.archivo);
  try {
    await p.addStyleTag({content: '.tip{display:none}body{background:#fff}.pr-page{margin:0}'});
    const total = deck.slides.length;
    const paginas = p.locator('.pr-page');
    const desbordes = await p.$$eval('.pr-page', (els, fn) => {
      const mide = new Function('return ' + fn)();
      return els.map((el, i) => ({n: i + 1, desbordes: mide(el)})).filter(x => x.desbordes.length);
    }, mideDesbordes.toString());

    /* Sin diapositivas pedidas: un mosaico de toda la charla en una imagen,
       para ver el ritmo y la coherencia visual de un vistazo. */
    if (a.diapositiva == null) {
      const desde = Math.max(1, Math.floor(+a.desde || 1));
      if (desde > total) throw new ErrorUso('La presentación tiene ' + total + ' diapositivas.');
      const hasta = Math.min(total, desde + 35);
      const cols = hasta - desde + 1 <= 4 ? 2 : 3, z = cols === 2 ? 0.45 : 0.32;
      await p.evaluate(({desde, hasta, cols, z, W}) => {
        const area = document.getElementById('printArea');
        [...area.children].forEach((el, i) => { if (i + 1 < desde || i + 1 > hasta) el.remove(); else el.setAttribute('data-n', i + 1); });
        const st = document.createElement('style');
        st.textContent = `#printArea{display:grid;grid-template-columns:repeat(${cols},${Math.round(W * z)}px);gap:14px;padding:14px;width:max-content;background:#E6E9EF}
          .pr-page{zoom:${z};position:relative;box-shadow:0 0 0 2px #9AA3B2}
          .pr-page::after{content:attr(data-n);position:absolute;right:0;top:0;padding:2px 16px;font:700 40px system-ui;background:#161A26;color:#fff;opacity:.88;border-bottom-left-radius:10px;z-index:9}`;
        document.head.append(st);
      }, {desde, hasta, cols, z, W});
      const png = await p.locator('#printArea').screenshot({type: 'png'});
      return {modo: 'mosaico', total, mostradas: [desde, hasta], imagenes: [{png: png.toString('base64')}], desbordes,
        nota: hasta < total ? 'Faltan las diapositivas ' + (hasta + 1) + '–' + total + ': pide desde=' + (hasta + 1) + '.' : undefined};
    }

    const lista = (Array.isArray(a.diapositiva) ? a.diapositiva : [a.diapositiva]).map(x => {
      const n = /^\d+$/.test(String(x)) ? +x : deck.slides.findIndex(s => s.id === x) + 1;
      if (n < 1 || n > total) throw new ErrorUso('No hay diapositiva «' + x + '»: la presentación tiene ' + total + '.');
      return n;
    });
    if (lista.length > 8) throw new ErrorUso('Pide como mucho ocho diapositivas por llamada, o ninguna para ver el mosaico completo.');
    const imagenes = [];
    for (const n of lista) imagenes.push({n, png: (await paginas.nth(n - 1).screenshot({type: 'png'})).toString('base64')});
    return {modo: 'detalle', total, imagenes, desbordes: desbordes.filter(d => lista.includes(d.n)), tamano: [W, H]};
  } finally { await p.close(); }
}

export async function exportaPdf(a) {
  const {ruta, p, W, H} = await imprimible(a.archivo);
  try {
    const destino = rutaSegura(a.destino || basename(ruta, '.json') + '.pdf', '.pdf');
    mkdirSync(dirname(destino), {recursive: true});
    await p.pdf({path: destino, width: W + 'px', height: H + 'px', printBackground: true, preferCSSPageSize: true});
    return {archivo: visible(destino)};
  } finally { await p.close(); }
}

export async function exportaPptx(a) {
  const {ruta, deck} = await proyectoValidado(a.archivo);
  const s = await sesion();
  await s.pagina.evaluate(d => loadDeck(d, null), deck);
  const [descarga] = await Promise.all([s.pagina.waitForEvent('download'), s.pagina.evaluate(() => exportPPTX())]);
  const destino = rutaSegura(a.destino || basename(ruta, '.json') + '.pptx', '.pptx');
  mkdirSync(dirname(destino), {recursive: true});
  await descarga.saveAs(destino);
  return {archivo: visible(destino), nota: 'Texto y tablas quedan editables; las gráficas se insertan como imagen. Ábrelo antes de enviarlo.'};
}

/* Para las extensiones: la sesión de Chromium con la app abierta y la página
   imprimible de un proyecto (una .pr-page por diapositiva). */
export {sesion, imprimible};
