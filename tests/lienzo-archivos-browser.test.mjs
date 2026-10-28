/* SPDX-License-Identifier: AGPL-3.0-only */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';

// Chromium exercises the editor and shortcuts; the native file picker and IPC
// are simulated here. Native Rust file operations have their own tests.
test('canvas composition survives desktop save, reopen and a failed save', {timeout:120000}, async t => {
  const bin = process.env.ERLEN_CHROMIUM || '/usr/bin/chromium';
  if (!existsSync(bin)) { t.skip('Chromium is required.'); return; }
  const port = Number(process.env.ERLEN_LIENZO_ARCHIVOS_TEST_PORT || 4268);
  const server = spawn(process.execPath, [fileURLToPath(new URL('../herramientas/serve.mjs', import.meta.url))],
    {env:{...process.env, PORT:String(port)}, stdio:['ignore','pipe','pipe']});
  t.after(() => server.kill());
  await new Promise((resolve, reject) => {
    server.stdout.once('data', resolve);
    server.once('error', reject);
    server.once('exit', code => reject(new Error('Server exited: ' + code)));
  });
  const browser = await chromium.launch({executablePath:bin, args:['--no-sandbox']});
  t.after(() => browser.close());
  const page = await browser.newPage({viewport:{width:1440, height:1000}}), errors = [];
  page.setDefaultTimeout(8000);
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const desktop = window.__testDesktop = {original:null, copy:null, opened:0, failed:0, saves:[], conflict:false};
    window.__TAURI__ = {
      core:{invoke:async (command, args = {}) => {
        if (command === 'guardar_archivo_proyecto_como') {
          if (desktop.original === null) {
            desktop.original = args.contenido;
            return {id:1, nombre:'original.json'};
          }
          desktop.copy = args.contenido;
          return {id:3, nombre:'copia.json'};
        }
        if (command === 'abrir_archivo_proyecto') {
          desktop.opened++;
          return {id:2, nombre:'original.json', contenido:desktop.original};
        }
        if (command === 'guardar_archivo_proyecto') {
          desktop.saves.push(args.id);
          if (desktop.conflict) { desktop.failed++; throw new Error('El archivo cambió fuera de Tabula'); }
          desktop.original = args.contenido;
          return null;
        }
        if (command === 'cerrar_archivo_proyecto') return null;
        throw new Error('Unexpected desktop command: ' + command);
      }},
      window:{getCurrentWindow:() => ({onCloseRequested:async () => {}})}
    };
  });
  await page.goto('http://127.0.0.1:' + port + '/');
  await page.getByRole('button', {name:/Nueva presentación/}).click();
  await page.locator('#addSlideBtn').click();
  await page.locator('.lay-opt').filter({hasText:'En blanco'}).click();
  await page.getByRole('button', {name:'Lienzo libre', exact:true}).click();
  let shapeCount = 0;
  for (const name of ['Rectángulo', 'Elipse']) {
    await page.getByRole('button', {name:'Insertar formas'}).click();
    await page.getByRole('button', {name, exact:true}).click();
    shapeCount++;
    await page.waitForFunction(count => curSlide().blocks.filter(b => b.formaLibre).length === count, shapeCount);
  }
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
  const before = await page.evaluate(() => curSlide().blocks.map(b => ({type:b.formaLibre, position:{...b.posLibre}})));
  assert.ok(before[1].position.x > before[0].position.x && before[1].position.y > before[0].position.y);

  await page.getByRole('button', {name:'Capas', exact:true}).click();
  await page.getByRole('checkbox', {name:'Marcar Rectángulo'}).check();
  await page.getByRole('checkbox', {name:'Marcar Elipse'}).check();
  await page.getByRole('button', {name:'Seleccionar marcados'}).click();
  await page.keyboard.press('Shift+ArrowRight');
  const composed = await page.evaluate(() => curSlide().blocks.map(b => ({
    id:b.id, type:b.formaLibre, position:{...b.posLibre}, figure:b.figura, src:b.src
  })));
  assert.ok(composed.every((b, i) => b.position.w > before[i].position.w));

  await page.keyboard.press('Control+Shift+s');
  await page.waitForFunction(() => window.__testDesktop.original && !operacionArchivoEscritorio);
  const original = await page.evaluate(() => window.__testDesktop.original);
  const savedSlide = JSON.parse(original).slides[1];
  assert.equal(savedSlide.lienzoLibre, true);
  assert.deepEqual(savedSlide.blocks.map(b => ({id:b.id, type:b.formaLibre, position:b.posLibre, figure:b.figura, src:b.src})), composed);

  // Reopening must restore the saved composition, not just leave the current
  // deck in place after reporting a successful open.
  await page.keyboard.press('ArrowRight');
  const unsavedPosition = await page.evaluate(() => ({...curSlide().blocks[0].posLibre}));
  assert.notDeepEqual(unsavedPosition, composed[0].position);
  let prompt;
  page.once('dialog', dialog => { prompt = dialog.message(); dialog.accept(); });
  await page.keyboard.press('Control+o');
  await page.waitForFunction(() => window.__testDesktop.opened === 1 && !operacionArchivoEscritorio);
  assert.match(prompt, /cambios.*no se han guardado/i);
  assert.equal(await page.locator('#modalRoot').locator(':scope > *').count(), 0);
  await page.locator('#fsList .fs-item[data-i="1"]').click();
  const reopened = await page.evaluate(() => curSlide().blocks.map(b => ({
    id:b.id, type:b.formaLibre, position:{...b.posLibre}, figure:b.figura, src:b.src
  })));
  assert.deepEqual(reopened, composed);
  for (const block of reopened) {
    const image = page.locator('#stageInner .blk[data-bid="' + block.id + '"] img');
    await image.evaluate(el => el.decode());
    assert.ok(await image.evaluate(el => el.complete && el.naturalWidth > 0));
  }

  await page.getByRole('button', {name:'Capas', exact:true}).click();
  await page.locator('.lienzo-lista-nombre').filter({hasText:'Rectángulo'}).click();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Control+s');
  await page.waitForFunction(() => window.__testDesktop.saves.length === 1 && !operacionArchivoEscritorio);
  const savedAgain = await page.evaluate(() => window.__testDesktop.original);
  assert.deepEqual(await page.evaluate(() => window.__testDesktop.saves), [2]);
  assert.notDeepEqual(JSON.parse(savedAgain).slides[1].blocks[0].posLibre, composed[0].position);

  await page.keyboard.press('ArrowLeft');
  const changed = await page.evaluate(() => ({...curSlide().blocks.find(b => b.formaLibre === 'rect').posLibre}));
  assert.notDeepEqual(changed, JSON.parse(savedAgain).slides[1].blocks[0].posLibre);
  const pendingDeck = await page.evaluate(() => JSON.parse(JSON.stringify(S.deck)));
  await page.evaluate(() => { window.__testDesktop.conflict = true; });
  await page.keyboard.press('Control+s');
  await page.waitForFunction(() => window.__testDesktop.failed === 1 && !operacionArchivoEscritorio);
  assert.deepEqual(await page.evaluate(() => window.__testDesktop.saves), [2, 2]);
  assert.equal(await page.evaluate(() => window.__testDesktop.original), savedAgain);
  assert.deepEqual(await page.evaluate(() => JSON.parse(JSON.stringify(S.deck))), pendingDeck);
  assert.match(await page.locator('#saveInd').textContent(), /Cambios sin guardar/);
  assert.match(await page.locator('body').textContent(), /El archivo cambió fuera de Tabula/);

  await page.keyboard.press('Control+Shift+s');
  await page.waitForFunction(() => window.__testDesktop.copy && !operacionArchivoEscritorio);
  const copy = JSON.parse(await page.evaluate(() => window.__testDesktop.copy));
  assert.deepEqual(copy, pendingDeck);
  assert.deepEqual(copy.slides[1].blocks.find(b => b.formaLibre === 'rect').posLibre, changed);
  assert.deepEqual(copy.slides[1].blocks.find(b => b.formaLibre === 'circle').figura, composed[1].figure);
  assert.equal(await page.evaluate(() => window.__testDesktop.original), savedAgain);
  assert.deepEqual(errors, []);
});
