/* SPDX-License-Identifier: AGPL-3.0-only */
/* Lo que necesita un navegador de verdad: ver cómo queda una diapositiva,
   imprimir el PDF y armar el PowerPoint. JSDOM no mide ni rasteriza, así que
   estas tres salidas se hacen en Chromium (playwright-core), con la aplicación
   servida desde public/ en 127.0.0.1 y sin salir a Internet.

   Chromium es opcional: si no está instalado, el resto del servidor funciona
   y estas herramientas lo dicen con el comando para instalarlo. */
import http from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {resolve, extname, join, sep, basename} from 'node:path';
import {ErrorUso, RAIZ, rutaSegura, visible, proyectoValidado} from './motor.mjs';

const PUBLICO = resolve(RAIZ, 'public');
const TIPOS = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png'};

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
  let navegador;
  try {
    navegador = await pw.chromium.launch(process.env.ERLEN_CHROMIUM ? {executablePath: process.env.ERLEN_CHROMIUM} : {});
  } catch (e) {
    servidor.close();
    throw new ErrorUso('No se pudo abrir Chromium. Instálalo con «npx playwright-core install chromium» en ' + RAIZ +
      ' o indica uno existente con la variable ERLEN_CHROMIUM. Detalle: ' + String(e.message).split('\n')[0]);
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

export async function vistaPrevia(a) {
  const {deck, p} = await imprimible(a.archivo);
  try {
    await p.addStyleTag({content: '.tip{display:none}body{background:#fff}.pr-page{margin:0}'});
    const total = deck.slides.length;
    let lista;
    if (a.diapositiva == null) lista = Array.from({length: Math.min(total, 6)}, (_, i) => i + 1);
    else lista = (Array.isArray(a.diapositiva) ? a.diapositiva : [a.diapositiva]).map(x => {
      const n = /^\d+$/.test(String(x)) ? +x : deck.slides.findIndex(s => s.id === x) + 1;
      if (n < 1 || n > total) throw new ErrorUso('No hay diapositiva «' + x + '»: la presentación tiene ' + total + '.');
      return n;
    }).slice(0, 8);
    const paginas = p.locator('.pr-page');
    const imagenes = [];
    for (const n of lista) {
      /* Desbordamiento real, medido en Chromium: lo que JSDOM no puede decir. */
      const desborda = await paginas.nth(n - 1).evaluate(el => {
        const r = el.getBoundingClientRect();
        return [...el.querySelectorAll('.slide *')].some(x => { const b = x.getBoundingClientRect(); return b.width && (b.bottom > r.bottom + 2 || b.right > r.right + 2); });
      });
      const png = await paginas.nth(n - 1).screenshot({type: 'png'});
      imagenes.push({n, png: png.toString('base64'), desborda});
    }
    return {total, imagenes};
  } finally { await p.close(); }
}

export async function exportaPdf(a) {
  const {ruta, p, W, H} = await imprimible(a.archivo);
  try {
    const destino = rutaSegura(a.destino || basename(ruta, '.json') + '.pdf', '.pdf');
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
  await descarga.saveAs(destino);
  return {archivo: visible(destino), nota: 'Texto y tablas quedan editables; las gráficas se insertan como imagen. Ábrelo antes de enviarlo.'};
}
