/* SPDX-License-Identifier: AGPL-3.0-only */
import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

async function catalogo() {
  try { return await import('../src/figures-catalog/index.mjs'); }
  catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND') assert.fail('El catálogo de Figures todavía no está integrado.');
    throw error;
  }
}

test('the local scientific catalog is complete, searchable and preserves source licenses', async () => {
  const {CATALOGO, buscarPiezas} = await catalogo();
  assert.equal(CATALOGO.length, 1000);
  assert.equal(new Set(CATALOGO.map(item => item.id)).size, 1000);
  assert.equal(new Set(CATALOGO.map(item => item.area)).size, 14);
  assert.ok(buscarPiezas('MITOCONDRIA', 'Biología').some(item => item.n === 'Mitocondria'));
  assert.deepEqual(buscarPiezas('mitocondria', 'Astronomía'), []);
  for (const license of ['CC-BY-3.0', 'CC-BY-4.0', 'CC0-1.0', 'MIT']) {
    const item = CATALOGO.find(entry => entry.license === license);
    assert.ok(item && item.author && item.sha256 && item.licenseURL, license);
  }
  assert.ok(CATALOGO.some(item => item.id === 'erlenmeyer' && item.license === 'AGPL-3.0-only'));
});

test('a local catalog asset is loaded on demand as a self-contained credited vector', async () => {
  const {buscarPiezas, piezaLista, crearFigura} = await catalogo();
  const item = buscarPiezas('mitocondria', 'Biología').find(entry => entry.license === 'CC-BY-3.0');
  assert.ok(item);
  assert.equal(piezaLista(item.id), false);
  const dom = new JSDOM('<!doctype html>');
  const previous = globalThis.document;
  globalThis.document = dom.window.document;
  try {
    const figure = await crearFigura(item.id);
    assert.equal(piezaLista(item.id), true);
    assert.equal(figure.procedencia.id, item.id);
    assert.equal(figure.procedencia.author, item.author);
    assert.equal(figure.procedencia.license, item.license);
    assert.equal(figure.procedencia.sha256, item.sha256);
    assert.ok(figure.procedencia.url && figure.procedencia.licenseURL);
    const svg = new dom.window.DOMParser().parseFromString(figure.svg, 'image/svg+xml');
    assert.equal(svg.querySelector('parsererror,script,foreignObject,iframe'), null);
    assert.ok(svg.querySelectorAll('path,rect,circle,ellipse,polygon').length > 0);
    assert.equal(JSON.parse(svg.querySelector('metadata').textContent).sha256, item.sha256);
    assert.match(svg.querySelector('desc').textContent, /CC-BY-3\.0/);
    const native = await crearFigura('erlenmeyer');
    const nativeSvg = new dom.window.DOMParser().parseFromString(native.svg, 'image/svg+xml');
    assert.equal(native.procedencia.license, 'AGPL-3.0-only');
    assert.ok(nativeSvg.querySelectorAll('path,rect,circle,ellipse').length > 0);
    const own = await crearFigura('autoclave');
    assert.match(own.procedencia.url, /erlen-suite\/blob\/c8e743be0c0b88433cdf7a2807e6757c03e873af\/apps\/figures\/src\/catalog\.mjs$/);
    await assert.rejects(crearFigura('no-existe-en-el-catalogo'), /catálogo/i);
  } finally {
    globalThis.document = previous;
    dom.window.close();
  }
});

test('the build serves catalog modules locally without embedding every drawing in the editor', async () => {
  const {readFileSync, existsSync} = await import('node:fs');
  const {fileURLToPath} = await import('node:url');
  const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
  const catalogPath = publicDir + 'libre/figures-catalog/';
  assert.ok(existsSync(catalogPath + 'index.mjs'), 'El build debe incluir el módulo local del catálogo.');
  assert.ok(existsSync(catalogPath + 'assets/chunks/lot1-bioicons-01.mjs'));
  const manifest = JSON.parse(readFileSync(publicDir + 'libre/manifest.json', 'utf8'));
  assert.ok(manifest.some(asset => asset.file === 'figures-catalog/index.mjs' && asset.sha256));
  assert.ok(manifest.some(asset => asset.file === 'figures-catalog/assets/chunks/lot1-bioicons-01.mjs' && asset.sha256));
  const html = readFileSync(publicDir + 'index.html', 'utf8');
  assert.doesNotMatch(html, /bioicons:mitochondrium-1:e291791574ae/, 'Los SVG del catálogo no deben cargarse con la interfaz inicial.');
});

test('every catalog drawing matches its normalized hash and renders with its attribution', {timeout:120000}, async () => {
  const {createHash} = await import('node:crypto');
  const {CATALOGO, crearFigura} = await catalogo();
  const chunks = new Map();
  const dom = new JSDOM('<!doctype html>');
  const previous = globalThis.document;
  globalThis.document = dom.window.document;
  try {
    for (const entry of CATALOGO) {
      if (entry.sha256) {
        if (!chunks.has(entry.chunk)) chunks.set(entry.chunk, (await import('../src/figures-catalog/assets/chunks/' + entry.chunk + '.mjs')).default);
        const source = chunks.get(entry.chunk)[entry.id];
        assert.equal(typeof source, 'string', entry.id);
        assert.equal(createHash('sha256').update(source).digest('hex'), entry.normalizedSHA256, entry.id);
      }
      const figure = await crearFigura(entry.id);
      assert.equal(figure.procedencia.id, entry.id);
      assert.equal(figure.procedencia.author, entry.author);
      assert.equal(figure.procedencia.license, entry.license);
      assert.match(figure.svg, /^<svg[\s>]/, entry.id);
    }
  } finally {
    globalThis.document = previous;
    dom.window.close();
  }
});
