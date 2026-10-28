/* SPDX-License-Identifier: AGPL-3.0-only */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { AxeBuilder } from '@axe-core/playwright';
import PptxGenJS from 'pptxgenjs';

test('Accessible import, figure editing and sharing in Chromium', { timeout: 180000 }, async t => {
  const executablePath = process.env.ERLEN_CHROMIUM || '/usr/bin/chromium';
  if (!existsSync(executablePath)) { t.skip('Set ERLEN_CHROMIUM to validate in a browser.'); return; }
  const port = Number(process.env.ERLEN_SLIDES_ACCESSIBLE_PORT || 4216);
  const server = spawn(process.execPath, [fileURLToPath(new URL('../herramientas/serve.mjs', import.meta.url))], { env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => server.kill());
  await new Promise((ok, fail) => { server.stdout.once('data', ok); server.once('error', fail); server.once('exit', c => fail(new Error('Server exited: ' + c))); });
  const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] }); t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage(), errors = [], externos = [];
  page.on('pageerror', e => errors.push(e.message));
  context.on('request', r => { if (/^https?:/.test(r.url()) && !r.url().startsWith('http://127.0.0.1:' + port)) externos.push(r.url()); });
  const artifacts = fileURLToPath(new URL('../.local/slides-accessible/', import.meta.url)); mkdirSync(artifacts, { recursive: true });
  const p = new PptxGenJS(); p.layout = 'LAYOUT_WIDE';
  const s = p.addSlide(); s.addText('Ejemplo ilustrativo', { x: .5, y: .2, w: 9, h: .6 }); s.addText('La señal aumenta', { x: .5, y: 1.5, w: 6, h: 1 });
  s.addTable([['Tiempo (s)', 'Señal (V)'], ['0', '0.2'], ['2', '0.7']], { x: .5, y: 3, w: 6, h: 1 }); s.addNotes('NOTAS PRIVADAS ILUSTRATIVAS');
  s.addImage({ path: fileURLToPath(new URL('../docs/images/inicio.png', import.meta.url)), x: 7, y: 2, w: 4, h: 2.5 });
  const c = p.addSlide(); c.addText('Gráfica ilustrativa', { x: .5, y: .2, w: 9, h: .6 }); c.addChart('scatter', [{ name: 'x', values: [0, .7, 4.2] }, { name: 'Señal', values: [1, 2, 3] }], { x: 1, y: 1, w: 5, h: 3 });
  const file = artifacts + 'import.pptx'; await p.writeFile({ fileName: file });
  await page.goto('http://127.0.0.1:' + port + '/');
  const status = () => page.locator('.modal [role="status"]');
  const audit = async name => {
    const { violations } = await new AxeBuilder({ page }).include('.modal').analyze();
    assert.deepEqual(violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })), [], name);
  };

  await t.test('One import entry reads PPTX locally, preserves numerical pairs and notes, and saves a new copy', async () => {
    await page.getByRole('button', { name: 'Importar proyecto', exact: true }).click();
    await page.getByLabel('Archivo de presentación', { exact: true }).setInputFiles(file);
    await page.getByRole('button', { name: 'Abrir copia editable' }).waitFor();
    await page.waitForFunction(() => !!document.querySelector('.mo-foot .btn-pri') && !document.querySelector('.mo-foot .btn-pri').disabled);
    await audit('PPTX import'); await page.screenshot({ path: artifacts + 'import-preview.png' });
    await page.getByRole('button', { name: 'Abrir copia editable' }).click();
    const r = await page.evaluate(() => ({ notes: S.deck.slides.map(sl => sl.notes), tables: S.deck.slides.flatMap(sl => zonas(sl).flat().filter(b => b.type === 'table').map(b => b.rows)), images: S.deck.slides.flatMap(sl => zonas(sl).flat().filter(b => b.type === 'image').map(b => b.src)), title: S.deck.meta.title, source: S.deck.meta.importacion, saved: !!decksStore()[S.deckName] }));
    assert.equal(r.saved, true); assert.equal(r.source.formato, 'pptx'); assert.ok(r.notes.includes('NOTAS PRIVADAS ILUSTRATIVAS'));
    assert.ok(r.tables.some(rows => JSON.stringify(rows) === JSON.stringify([['x', 'y'], ['0', '1'], ['0.7', '2'], ['4.2', '3']])));
    assert.ok(r.tables.some(rows => rows.some(row => row[0] === '2' && row[1] === '0.7')));
    assert.equal(r.images[0], 'data:image/png;base64,' + readFileSync(new URL('../docs/images/inicio.png', import.meta.url)).toString('base64'));
  });

  await t.test('The same import entry handles JSON, Markdown and verified DoE copies', async () => {
    for (const [name, data] of [['charla.md', '# Ejemplo ilustrativo\n\n## Método\n\n- Control ilustrativo'], ['charla.json', JSON.stringify({ v: 1, meta: { title: 'Proyecto ilustrativo' }, slides: [{ id: 'sl', layout: 'content', title: 'Método', blocks: [{ id: 'b', type: 'text', text: 'Control ilustrativo' }] }] })]]) {
      await page.evaluate(() => openImportarPresentacion());
      await page.getByLabel('Archivo de presentación', { exact: true }).setInputFiles({ name, mimeType: 'application/octet-stream', buffer: Buffer.from(data) });
      await page.waitForFunction(() => !!document.querySelector('.mo-foot .btn-pri') && !document.querySelector('.mo-foot .btn-pri').disabled);
      await page.getByRole('button', { name: 'Abrir copia editable' }).click();
      assert.ok(await page.evaluate(() => S.deck.slides.some(sl => zonas(sl).flat().some(b => b.text === 'Control ilustrativo' || b.items?.some(it => it.t === 'Control ilustrativo')))));
    }
    const registro = await page.evaluate(async () => erlenExchange.prepareTransfer({ source: 'doe', target: 'slides', payload: { format: 'erlen-context-copy-v1', kind: 'informe-v1', source: { tool: 'doe', title: 'Importación ilustrativa', version: '0.3.0' }, snapshot: { titulo: 'Informe ilustrativo', subtitulo: 'Prueba', fecha: '2026-09-30', secciones: [{ titulo: 'Método', bloques: [{ tipo: 'parrafo', texto: 'Control ilustrativo' }] }], procedencia: { app: 'Erlen DoE', proyecto: 'Importación ilustrativa', simulado: true } } } }));
    await page.evaluate(() => openImportarPresentacion());
    await page.getByLabel('Archivo de presentación', { exact: true }).setInputFiles({ name: 'copia-doe.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(registro)) });
    await page.getByRole('button', { name: 'Crear presentación', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Crear presentación', exact: true }).click();
    assert.equal(await page.evaluate(() => S.deck.meta.title), 'Informe ilustrativo');
    await page.evaluate(() => { window.__verify = erlenExchange.verifyTransfer; erlenExchange.verifyTransfer = (...args) => new Promise(ok => { window.__finishVerify = async () => ok(await window.__verify(...args)); }); openImportarPresentacion(); });
    await page.getByLabel('Archivo de presentación', { exact: true }).setInputFiles({ name: 'copia-doe.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(registro)) });
    await page.waitForFunction(() => typeof window.__finishVerify === 'function'); await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await page.evaluate(async () => { await window.__finishVerify(); erlenExchange.verifyTransfer = window.__verify; });
    await page.waitForTimeout(50); assert.equal(await page.locator('.modal').count(), 0);
    assert.equal(await page.evaluate(() => S.deck.meta.title), 'Informe ilustrativo');
  });

  await t.test('Cancel, unreadable files, external images and exhausted storage retain the open document', async () => {
    const before = await page.evaluate(() => JSON.stringify(S.deck));
    await page.evaluate(() => openImportarPresentacion());
    await page.getByLabel('Archivo de presentación', { exact: true }).setInputFiles({ name: 'bad.pptx', mimeType: 'application/octet-stream', buffer: Buffer.from('not a zip') });
    await status().filter({ hasText: /PPTX válido/ }).waitFor(); assert.equal(await page.evaluate(() => JSON.stringify(S.deck)), before);
    await page.getByLabel('Archivo de presentación', { exact: true }).setInputFiles({ name: 'remote.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ v: 1, meta: { title: 'Remote' }, slides: [{ id: 'a', layout: 'content', title: 'Remote', blocks: [{ id: 'im', type: 'image', src: 'https://example.org/image.png' }] }] })) });
    await status().filter({ hasText: /recursos remotos/ }).waitFor();
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await page.evaluate(() => { window.__Worker = Worker; window.__terminated = false; window.Worker = class { postMessage() {} terminate() { window.__terminated = true; } }; openImportarPresentacion(); });
    await page.getByLabel('Archivo de presentación', { exact: true }).setInputFiles(file);
    await page.waitForFunction(() => document.querySelector('.modal input[type=file]').hasAttribute('aria-busy'));
    await page.waitForTimeout(80); await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    assert.equal(await page.evaluate(() => window.__terminated), true); await page.evaluate(() => { Worker = window.__Worker; });
    await page.evaluate(() => openImportarPresentacion());
    await page.getByLabel('Archivo de presentación', { exact: true }).setInputFiles(file);
    await page.waitForFunction(() => !!document.querySelector('.mo-foot .btn-pri') && !document.querySelector('.mo-foot .btn-pri').disabled);
    await page.evaluate(() => { window.__setItem = Storage.prototype.setItem; Storage.prototype.setItem = function(k, v) { if (k === LS_DECKS) throw new DOMException('Quota test', 'QuotaExceededError'); return window.__setItem.call(this, k, v); }; });
    await page.getByRole('button', { name: 'Abrir copia editable' }).click(); await status().filter({ hasText: /No se pudo guardar/ }).waitFor();
    assert.equal(await page.evaluate(() => JSON.stringify(S.deck)), before);
    await page.evaluate(() => { Storage.prototype.setItem = window.__setItem; closeModal(); });
  });

  await t.test('Figures can be authored with keyboard controls, undone, reopened and read as SVG', async () => {
    await page.evaluate(() => { wsNueva(); window.__prevUndo = S.undo.length; window.__prevSlides = S.deck.slides.length; document.querySelector('#deckTitleInput').focus(); openFiguraCapas(); });
    await status().filter({ hasText: /^Listo\./ }).waitFor();
    assert.equal(await page.evaluate(() => document.querySelector('.erlen-marco').inert), true);
    const add = page.getByRole('button', { name: 'Añadir texto', exact: true }); await add.focus(); await add.press('Enter');
    await page.getByLabel('Texto del objeto', { exact: true }).fill('Datos ilustrativos'); await page.getByText('Posición, tamaño y giro', { exact: true }).click(); await page.getByLabel('Posición horizontal', { exact: true }).fill('140'); await page.getByLabel('Posición horizontal', { exact: true }).press('Tab');
    await page.getByRole('button', { name: 'Mover a la derecha', exact: true }).focus(); await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Insertar figura', exact: true }).click();
    assert.equal(await page.evaluate(() => S.undo.length - __prevUndo), 0);
    assert.equal(await page.evaluate(() => S.deck.slides.length - __prevSlides), 0);
    await status().filter({ hasText: /Describe qué muestra/ }).waitFor();
    assert.equal(await page.getByLabel('Descripción accesible (obligatoria)').evaluate(el => el === document.activeElement), true);
    await page.getByLabel('Descripción accesible (obligatoria)').fill('Esquema de un experimento ilustrativo');
    await page.getByRole('button', { name: 'Añadir rectángulo' }).focus(); await page.keyboard.press('Enter');
    await page.locator('.modal').getByRole('button', { name: 'Deshacer', exact: true }).click(); assert.equal(await page.locator('.figura-objetos button').count(), 1);
    await page.locator('.modal').getByRole('button', { name: 'Rehacer', exact: true }).click(); assert.equal(await page.locator('.figura-objetos button').count(), 2);
    await audit('Figure editor'); await page.screenshot({ path: artifacts + 'figure-desktop.png' });
    await page.getByRole('button', { name: 'Insertar figura', exact: true }).focus(); await page.keyboard.press('Tab');
    assert.equal(await page.getByRole('button', { name: 'Cerrar', exact: true }).evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.getByRole('button', { name: 'Insertar figura', exact: true }).evaluate(el => el === document.activeElement), true);
    await page.getByRole('button', { name: 'Insertar figura', exact: true }).click();
    const fig = await page.evaluate(() => { const b = curSlide().blocks.find(b => b.figura); return { model: b.figura, src: b.src, alt: b.alt, roundtrip: saneaDeck(S.deck).deck.slides[S.cur].blocks.find(b => b.figura).figura }; });
    assert.equal(await page.evaluate(() => S.undo.length - __prevUndo), 1);
    assert.equal(await page.evaluate(() => S.deck.slides.length - __prevSlides), 1);
    assert.equal(fig.model.objects[0].x, 150); assert.equal(fig.model.objects[0].text, 'Datos ilustrativos'); assert.deepEqual(fig.roundtrip, fig.model);
    assert.match(decodeURIComponent(fig.src), /<text/); assert.equal(fig.alt, 'Esquema de un experimento ilustrativo');
    await page.evaluate(() => openFiguraCapas(curSlide().blocks.find(b => b.figura))); await status().filter({ hasText: /^Listo\./ }).waitFor();
    await page.getByRole('button', { name: /Texto: Datos ilustrativos/ }).click(); await page.getByText('Posición, tamaño y giro', { exact: true }).click(); assert.equal(await page.getByLabel('Posición horizontal', { exact: true }).inputValue(), '150');
    await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('.modal'));
    assert.equal(await page.evaluate(() => document.querySelector('.erlen-marco').inert), false);
  });

  await t.test('Annotations create a new block and preserve the scientific original; locks and stale documents are respected', async () => {
    await page.evaluate(() => { const cv = document.createElement('canvas'); cv.width = 400; cv.height = 200; cv.getContext('2d').fillRect(0, 0, 400, 200); const b = Object.assign(newBlock('image'), { src: cv.toDataURL(), caption: 'Datos ilustrativos', cientifico: { v: 1, tipo: 'datos', texto: 'x,y\n1,2\n2,3', x: 'x', y: 'y', modo: 'markers' } }); curSlide().blocks.push(b); window.__original = JSON.stringify(b); window.__originalId = b.id; commit(); openFiguraCapas(b); });
    await status().filter({ hasText: /^Listo\./ }).waitFor(); await page.getByRole('button', { name: 'Añadir flecha' }).click();
    await page.getByLabel('Descripción accesible (obligatoria)').fill('Señal ilustrativa con una flecha de referencia');
    await page.getByRole('button', { name: 'Insertar copia anotada' }).click();
    assert.equal(await page.evaluate(() => JSON.stringify(findBlock(__originalId).block) === __original), true);
    assert.equal(await page.evaluate(() => curSlide().blocks.at(-1).figura.objects[0].locked), true);
    await page.evaluate(() => openFiguraCapas(curSlide().blocks.at(-1))); await status().filter({ hasText: /^Listo\./ }).waitFor();
    await page.evaluate(() => { curSlide().blocks.at(-1).locked = true; }); await page.getByRole('button', { name: 'Guardar figura', exact: true }).click(); await status().filter({ hasText: /diapositiva cambió/ }).waitFor(); await page.evaluate(() => { curSlide().blocks.at(-1).locked = false; closeModal(); });
  });

  await t.test('Sharing filters actionable checks, excludes private notes by default and exports readable PPTX', async () => {
    await page.evaluate(() => { curSlide().notes = 'NOTAS PRIVADAS ILUSTRATIVAS'; openCompartir('pptx'); });
    await page.waitForFunction(() => !!document.querySelector('.mo-foot .btn-pri') && !document.querySelector('.mo-foot .btn-pri').disabled);
    await audit('Sharing'); assert.equal(await page.getByRole('checkbox', { name: /Incluir notas del orador/ }).isChecked(), false);
    const downloadPromise = page.waitForEvent('download'); await page.getByRole('button', { name: 'Descargar PowerPoint', exact: true }).click();
    const download = await downloadPromise; await download.saveAs(artifacts + 'accessible-export.pptx');
    assert.ok(readFileSync(artifacts + 'accessible-export.pptx').length > 1000);
    await page.getByLabel('Formato para compartir', { exact: true }).selectOption('html');
    await page.waitForFunction(() => !!document.querySelector('.mo-foot .btn-pri') && !document.querySelector('.mo-foot .btn-pri').disabled);
    const htmlPromise = page.waitForEvent('download'); await page.getByRole('button', { name: 'Descargar HTML', exact: true }).click();
    const htmlDownload = await htmlPromise; await htmlDownload.saveAs(artifacts + 'accessible-export.html');
    const html = readFileSync(artifacts + 'accessible-export.html', 'utf8'); assert.doesNotMatch(html, /NOTAS PRIVADAS/); assert.match(html, /Esquema de un experimento ilustrativo/);
    assert.equal(await page.evaluate(() => curSlide().notes), 'NOTAS PRIVADAS ILUSTRATIVAS');
    await page.evaluate(() => closeModal());
  });

  await t.test('New dialogs pass axe in dark mode and fit a narrow viewport without horizontal scrolling', async () => {
    await page.setViewportSize({ width: 390, height: 844 }); await page.evaluate(() => { cambiaTemaApp('oscuro'); openFiguraCapas(curSlide().blocks.find(b => b.figura)); });
    await status().filter({ hasText: /^Listo\./ }).waitFor(); await audit('Dark mobile figure');
    assert.equal(await page.evaluate(() => document.querySelector('.modal').scrollWidth <= document.querySelector('.modal').clientWidth + 1), true);
    await page.screenshot({ path: artifacts + 'figure-mobile.png' }); await page.keyboard.press('Escape');
    await page.evaluate(() => openImportarPresentacion()); await audit('Dark mobile import'); await page.keyboard.press('Escape');
    await page.evaluate(() => openCompartir('html')); await page.waitForFunction(() => !!document.querySelector('.mo-foot .btn-pri') && !document.querySelector('.mo-foot .btn-pri').disabled); await audit('Dark mobile sharing');
    await page.screenshot({ path: artifacts + 'sharing-mobile.png' }); await page.keyboard.press('Escape');
  });
  assert.deepEqual(externos, []); assert.deepEqual(errors, []);
});
