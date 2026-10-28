import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {editor} from '../herramientas/test-browser.mjs';

async function setup(t, invoke) {
  const app = await editor();
  t.after(() => app.dom.window.close());
  app.run("window.__downloads = []; window.__notices = []; downloadFile = async (...args) => window.__downloads.push(args); toast = (...args) => window.__notices.push(args);");
  if (invoke) app.dom.window.__TAURI__ = {core: {invoke}};
  return app;
}

test('desktop project export sends the current JSON to the native command', async t => {
  const calls = [];
  const app = await setup(t, async (...args) => { calls.push(args); return 'mi-charla.json'; });
  app.run("S.deck.meta.title = 'Mi charla'; S.deck.slides[0].notes = 'Notas privadas';");
  const before = app.run('JSON.stringify(S.deck)');
  await app.run('exportJSON()');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'guardar_proyecto');
  assert.equal(calls[0][1].nombre, 'mi-charla.json');
  assert.equal(JSON.stringify(JSON.parse(calls[0][1].contenido)), before);
  assert.equal(app.dom.window.__downloads.length, 0);
  assert.match(app.dom.window.__notices.at(-1)[0], /guardad/i);
});

test('cancelled or failed native saves do not fall back to a browser download', async t => {
  const app = await setup(t, async () => null);
  await app.run('exportJSON()');
  assert.equal(app.dom.window.__downloads.length, 0);
  assert.equal(app.dom.window.__notices.length, 0);
  app.dom.window.__TAURI__.core.invoke = async () => { throw new Error('Disco no disponible'); };
  await app.run('exportJSON()');
  assert.equal(app.dom.window.__downloads.length, 0);
  assert.match(app.dom.window.__notices.at(-1)[0], /no se pudo guardar/i);
});

test('web export keeps using the existing browser download', async t => {
  const app = await setup(t);
  await app.run('exportJSON()');
  assert.equal(app.dom.window.__downloads.length, 1);
  assert.match(app.dom.window.__downloads[0][0], /\.json$/);
  assert.equal(app.dom.window.__downloads[0][2], 'application/json');
});

test('desktop rejects overlapping saves and warns when edits happen during the dialog', async t => {
  let resolveSave;
  let calls = 0;
  const app = await setup(t, () => {
    calls++;
    return calls === 1 ? new Promise(resolve => { resolveSave = resolve; }) : Promise.resolve(null);
  });
  const first = app.run('exportJSON()');
  app.run("S.deck.meta.title = 'Edited after opening the dialog';");
  await app.run('exportJSON()');
  assert.equal(calls, 1);
  assert.match(app.dom.window.__notices.at(-1)[0], /guardado.*abiert/i);
  resolveSave('presentation.json');
  await first;
  assert.match(app.dom.window.__notices.at(-1)[0], /cambios posteriores/i);
  app.dom.window.__TAURI__.core.invoke = async () => { calls++; return null; };
  await app.run('exportJSON()');
  assert.equal(calls, 2);
});

test('desktop never reveals presenter notes on the projected slide when the window fails', async t => {
  const app = await setup(t, async () => null);
  app.run("window.open = (...args) => { window.__presenterOpen = args; return null; }; document.body.append(Object.assign(document.createElement('div'), {className: 'present-root'})); alternaPresentador();");
  assert.equal(app.dom.window.__presenterOpen[0], 'about:blank');
  assert.equal(app.dom.window.document.querySelector('.vp-panel'), null);
  assert.match(app.dom.window.__notices.at(-1)[0], /ventana del presentador/i);
});

test('presenter styles retain the application CSP nonce in the separate window', async t => {
  const app = await setup(t, async () => null);
  const popup = new JSDOM('', {url: 'https://localhost/'});
  t.after(() => { app.run('cierraPresentador()'); popup.window.close(); });
  const style = app.dom.window.document.createElement('style');
  style.nonce = 'presenter-nonce';
  app.dom.window.document.head.append(style);
  app.dom.window.open = () => popup.window;
  assert.equal(app.run('abrePresentador()'), true);
  const presenterStyle = [...popup.window.document.querySelectorAll('style')].find(node => node.textContent.includes('body.vp'));
  assert.ok(presenterStyle);
  assert.equal(presenterStyle.nonce, 'presenter-nonce');
});

test('closing the desktop presenter uses the native window command', async t => {
  const calls = [];
  const app = await setup(t, async command => { calls.push(command); });
  const popup = new JSDOM('', {url: 'https://localhost/'});
  t.after(() => { app.run('cierraPresentador()'); popup.window.close(); });
  app.dom.window.open = () => popup.window;
  assert.equal(app.run('abrePresentador()'), true);
  app.run('alternaPresentador()');
  await Promise.resolve();
  assert.deepEqual(calls, ['cerrar_presentador']);
});
