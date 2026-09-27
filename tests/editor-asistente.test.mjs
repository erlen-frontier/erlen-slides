/* SPDX-License-Identifier: AGPL-3.0-only */
/* ?abrir=<clave>: el proyecto que manda abrir_en_editor (mcp/extensiones/editor.mjs).
   La red de la página es un fetch simulado: aquí se prueba el camino de la app
   (pedir al mismo origen, enseñar, confirmar, retirar la clave de la URL y los
   errores); el servidor de verdad se prueba en tests/mcp-editor.test.mjs. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {editor} from '../herramientas/test-browser.mjs';

const CLAVE = 'AbCdEfGhIjKlMnOpQrStUvWxYz012345';
const DECK = {v: 1, meta: {title: 'Síntesis de HDL Zn-Al', theme: 'marino'},
  slides: [{layout: 'title'}, {layout: 'content', title: 'El pH 10 da la fase más pura', blocks: [{type: 'text', text: 'Datos ilustrativos.'}]}]};
const responde = (cuerpo, status = 200) => async () => ({ok: status >= 200 && status < 300, status, json: async () => (typeof cuerpo === 'function' ? cuerpo() : cuerpo)});
function red(respuesta) {
  const pedidas = [];
  return {pedidas, fetch: async (u, o) => { pedidas.push({u: String(u), o}); return respuesta(); }};
}
const modal = d => d.querySelector('#modalRoot');
async function esperaModal(d) {
  for (let i = 0; i < 50 && !modal(d).textContent; i++) await new Promise(r => setTimeout(r, 5));
  return modal(d).textContent;
}
const botonModal = (d, texto) => [...modal(d).querySelectorAll('button')].find(b => b.textContent.trim() === texto);

test('?abrir=<clave> fetches the project from the same origin, previews it and opens it only after confirming', async () => {
  const r = red(responde({formato: 'erlen-mcp-abrir-v1', archivo: 'hdl.json', deck: DECK}));
  const {dom, run, errors} = await editor('http://localhost:8130/?abrir=' + CLAVE, {fetch: r.fetch});
  try {
    const d = dom.window.document;
    const texto = await esperaModal(d);
    assert.deepEqual(r.pedidas.map(p => p.u), ['mcp/abrir/' + CLAVE], 'Una sola petición, relativa y al mismo origen');
    assert.equal(dom.window.location.search, '', 'La clave se retira de la URL');
    assert.match(texto, /Abrir la presentación del asistente/);
    assert.match(texto, /«hdl\.json», con 2 diapositivas/);
    assert.match(texto, /El pH 10 da la fase más pura/);
    assert.match(texto, /copia independiente del archivo/);
    assert.match(texto, /Exportar → Proyecto \(\.json\)/);
    assert.notEqual(run('S.deck.meta.title'), 'Síntesis de HDL Zn-Al', 'Nada se reemplaza antes de confirmar');
    botonModal(d, 'Abrir en el editor').click();
    assert.equal(run('S.deck.meta.title'), 'Síntesis de HDL Zn-Al');
    assert.equal(run('S.deck.slides[1].title'), 'El pH 10 da la fase más pura');
    assert.equal(run('S.deckName'), 'Síntesis de HDL Zn-Al');
    assert.equal(run('decksStore()["Síntesis de HDL Zn-Al"].deck.slides.length'), 2, 'Queda en la biblioteca');
    assert.equal(d.querySelector('#inicioRoot main.erlen-inicio').hidden, true, 'Se entra al editor');
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('Cancelling the preview leaves everything as it was, and a second copy never overwrites the first', async () => {
  const r = red(responde({formato: 'erlen-mcp-abrir-v1', archivo: 'hdl.json', deck: DECK}));
  const {dom, run, errors} = await editor('http://localhost:8130/?abrir=' + CLAVE, {fetch: r.fetch});
  try {
    const d = dom.window.document;
    await esperaModal(d);
    const antes = run('JSON.stringify(S.deck)');
    botonModal(d, 'Cancelar').click();
    assert.equal(run('JSON.stringify(S.deck)'), antes);
    assert.equal(run('Object.keys(decksStore()).length'), 0);
    // Dos veces el mismo proyecto: la segunda queda al lado, con otro nombre.
    for (let i = 0; i < 2; i++) {
      await run(`wsAbrirDelAsistente(${JSON.stringify(CLAVE)})`);
      botonModal(d, 'Abrir en el editor').click();
    }
    assert.deepEqual(JSON.parse(run('JSON.stringify(Object.keys(decksStore()).sort())')), ['Síntesis de HDL Zn-Al', 'Síntesis de HDL Zn-Al (2)']);
    // La abierta sin guardar, con el mismo título que la que llega: se conservan las dos.
    run("loadDeck(blankDeck(),null);S.deck.meta.title='Síntesis de HDL Zn-Al (3)';S.deck.slides[0].notes='mía'");
    await run(`wsAbrirDelAsistente(${JSON.stringify(CLAVE)})`);
    botonModal(d, 'Abrir en el editor').click();
    assert.equal(run('decksStore()["Síntesis de HDL Zn-Al (3)"].deck.slides[0].notes'), 'mía', 'No se pisa la presentación del usuario');
    assert.equal(run('S.deckName'), 'Síntesis de HDL Zn-Al (4)');
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('Expired keys, broken JSON, foreign payloads, malformed keys and a stopped server give explicit errors and change nothing', async () => {
  const casos = [
    [responde({error: 'x'}, 404), /caducó o ya se usó/],
    [responde(() => { throw new SyntaxError('Unexpected token'); }), /no es un JSON válido/],
    [responde({v: 1, slides: []}), /no es un proyecto de Erlen Slides/],
    [responde({formato: 'erlen-mcp-abrir-v1', archivo: 'x.json', deck: {v: 1, meta: {}, slides: 'nada'}}), /no se pudo leer/],
    [responde({}, 500), /error \(500\)/],
    [async () => { throw new TypeError('Failed to fetch'); }, /ya no está en marcha/]
  ];
  for (const [respuesta, error] of casos) {
    const r = red(respuesta);
    const {dom, run} = await editor('http://localhost:8130/?abrir=' + CLAVE, {fetch: r.fetch});
    try {
      const texto = await esperaModal(dom.window.document);
      assert.match(texto, /No se abrió la presentación del asistente/);
      assert.match(texto, error);
      assert.match(texto, /No se creó ni se cambió nada/);
      assert.equal(dom.window.location.search, '');
      assert.equal(run('Object.keys(decksStore()).length'), 0);
    } finally { dom.window.close(); }
  }
  // Una clave con barras o puntos no llega a pedirse.
  const r = red(responde({}));
  const {dom} = await editor('http://localhost:8130/?abrir=' + encodeURIComponent('../../etc/passwd'), {fetch: r.fetch});
  try {
    assert.match(await esperaModal(dom.window.document), /incompleto o mal copiado/);
    assert.deepEqual(r.pedidas, []);
  } finally { dom.window.close(); }
});

test('Under /slides/ the request stays relative to the deployment, and the normal start is untouched', async () => {
  const r = red(responde({}, 404));
  const {dom} = await editor('http://localhost:8130/slides/?abrir=' + CLAVE + '#suite/biblioteca', {fetch: r.fetch});
  try {
    await esperaModal(dom.window.document);
    assert.equal(new URL(r.pedidas[0].u, dom.window.location.href).pathname, '/slides/mcp/abrir/' + CLAVE);
    assert.equal(dom.window.location.pathname + dom.window.location.search + dom.window.location.hash, '/slides/#suite/biblioteca', 'Se conserva la vista pedida');
  } finally { dom.window.close(); }
  const sin = red(responde({}));
  const normal = await editor('http://localhost:8130/', {fetch: sin.fetch});
  try {
    assert.deepEqual(sin.pedidas, [], 'Sin ?abrir no hay peticiones');
    assert.equal(normal.dom.window.document.querySelector('#modalRoot').textContent, '');
  } finally { normal.dom.window.close(); }
});
