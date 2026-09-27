/* SPDX-License-Identifier: AGPL-3.0-only */
/* abrir_en_editor (mcp/extensiones/editor.mjs): el servidor local que sirve la
   app y entrega un proyecto con una clave de un solo uso. Sin navegador
   (ERLEN_SLIDES_SIN_NAVEGADOR=1) y en un puerto libre (ERLEN_SLIDES_PUERTO=0);
   las peticiones las hace el fetch de Node, como las haría la página. */
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {conServidor} from './_mcp-cliente.mjs';

process.env.ERLEN_SLIDES_SIN_NAVEGADOR = '1';
process.env.ERLEN_SLIDES_PUERTO = '0';

/* Petición cruda, sin normalizar la ruta ni el Host como haría fetch. */
const cruda = (puerto, ruta, host = '127.0.0.1:' + puerto) => new Promise((ok, mal) => {
  http.get({host: '127.0.0.1', port: puerto, path: ruta, headers: {host}}, r => { let t = ''; r.on('data', d => { t += d; }); r.on('end', () => ok({status: r.statusCode, texto: t})); }).on('error', mal);
});

test('MCP: abrir_en_editor serves the app and hands out the project once, only with its key', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    const cr = await c.llama('crear_presentacion', {archivo: 'hdl', titulo: 'Síntesis de HDL', diapositivas: [{titulo: 'El pH 10 da la fase más pura'}]});
    assert.equal(cr.error, false, cr.texto);
    const r = await c.llama('abrir_en_editor', {archivo: 'hdl'});
    assert.equal(r.error, false, r.texto);
    const {url, navegador, nota, archivo, caduca} = r.datos;
    assert.equal(archivo, 'hdl.json');
    assert.match(url, /^http:\/\/127\.0\.0\.1:\d+\/\?abrir=[A-Za-z0-9_-]{32}$/);
    assert.match(navegador, /ERLEN_SLIDES_SIN_NAVEGADOR/);
    assert.match(nota, /Exportar → Proyecto \(\.json\)/);
    assert.ok(Date.parse(caduca) > Date.now());
    const base = new URL(url), puerto = Number(base.port), clave = base.searchParams.get('abrir');

    // La página es la app construida.
    const pagina = await fetch(url);
    assert.equal(pagina.status, 200);
    assert.match(pagina.headers.get('content-type'), /text\/html/);
    assert.match(await pagina.text(), /function wsAbrirDelAsistente/);

    // Un HEAD no la gasta; la clave equivocada no da nada.
    assert.equal((await fetch(new URL('mcp/abrir/' + clave, url), {method: 'HEAD'})).status, 200);
    for (const mala of ['x'.repeat(32), clave.slice(0, -1), clave + 'a', '..%2F..%2Fhdl.json'])
      assert.equal((await fetch(new URL('mcp/abrir/' + mala, url))).status, 404, mala);
    assert.equal((await fetch(new URL('mcp/abrir/' + clave, url), {method: 'POST'})).status, 405);

    // Con la clave: el proyecto, una vez.
    const p = await fetch(new URL('mcp/abrir/' + clave, url));
    assert.equal(p.status, 200);
    assert.equal(p.headers.get('cache-control'), 'no-store');
    const datos = await p.json();
    assert.equal(datos.formato, 'erlen-mcp-abrir-v1');
    assert.equal(datos.archivo, 'hdl.json');
    assert.equal(datos.deck.meta.title, 'Síntesis de HDL');
    assert.equal(datos.deck.slides[1].title, 'El pH 10 da la fase más pura');
    const otra = await fetch(new URL('mcp/abrir/' + clave, url));
    assert.equal(otra.status, 404);
    assert.match((await otra.json()).error, /ya se usó/);

    // Nada fuera de public/: ni la carpeta de trabajo ni el código del servidor, ni listados.
    for (const ruta of ['/../package.json', '/%2e%2e/package.json', '/..%2fpackage.json', '/%2e%2e%2fmcp%2fservidor.mjs', '/hdl.json', dir + '/hdl.json', '/libre/'])
      assert.ok([403, 404].includes((await cruda(puerto, ruta)).status), ruta);
    // Otro Host (DNS rebinding) no recibe ni la página.
    assert.equal((await cruda(puerto, '/', 'atacante.example:' + puerto)).status, 403);

    // Una segunda llamada reutiliza el servidor, con otra clave.
    const r2 = (await c.llama('abrir_en_editor', {archivo: 'hdl.json'})).datos;
    assert.equal(new URL(r2.url).port, base.port);
    assert.notEqual(new URL(r2.url).searchParams.get('abrir'), clave);

    // Errores claros para la IA.
    assert.match((await c.llama('abrir_en_editor', {archivo: 'no-existe'})).texto, /No existe/);
    assert.match((await c.llama('abrir_en_editor', {archivo: '../fuera'})).texto, /fuera de la carpeta/);
  });
});

test('MCP: abrir_en_editor keys expire', {timeout: 120000}, async () => {
  process.env.ERLEN_SLIDES_CADUCIDAD = '1';
  try {
    await conServidor(async c => {
      await c.llama('crear_presentacion', {archivo: 'p'});
      const {url} = (await c.llama('abrir_en_editor', {archivo: 'p'})).datos;
      await new Promise(r => setTimeout(r, 1300));
      assert.equal((await fetch(new URL('mcp/abrir/' + new URL(url).searchParams.get('abrir'), url))).status, 404);
    });
  } finally { delete process.env.ERLEN_SLIDES_CADUCIDAD; }
});
