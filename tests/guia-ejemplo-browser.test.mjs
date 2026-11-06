/* SPDX-License-Identifier: AGPL-3.0-only */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';

/* La guía de un ejemplo abierto desde su enlace directo en Chromium real: sus tres
   salidas, el cierre que se recuerda tras recargar y el diseño en teléfono. Los
   datos del ejemplo son ilustrativos. */

test('la guía de un ejemplo abierto ofrece sus tres salidas y se recuerda al cerrarla', {timeout: 240000}, async t => {
  const bin = process.env.ERLEN_CHROMIUM || '/usr/bin/chromium';
  if (!existsSync(bin)) { t.skip('Set ERLEN_CHROMIUM to run browser validation.'); return; }
  const port = Number(process.env.ERLEN_GUIA_PORT || 4394);
  const server = spawn(process.execPath, [fileURLToPath(new URL('../herramientas/serve.mjs', import.meta.url))], {env: {...process.env, PORT: String(port)}, stdio: ['ignore', 'pipe', 'pipe']});
  t.after(() => server.kill());
  await new Promise((ok, fail) => { server.stdout.once('data', ok); server.once('error', fail); server.once('exit', code => fail(new Error('Server exited: ' + code))); });
  const browser = await chromium.launch({executablePath: bin, args: ['--no-sandbox']});
  t.after(() => browser.close());
  const artifacts = fileURLToPath(new URL('../.local/guia-ejemplo/', import.meta.url));
  mkdirSync(artifacts, {recursive: true});
  const url = 'http://127.0.0.1:' + port + '/?plantilla=calibracion';

  await t.test('escritorio: la guía abre el ejemplo y sus tres salidas funcionan', async () => {
    const context = await browser.newContext({viewport: {width: 1440, height: 900}, deviceScaleFactor: 2});
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url);
    const guia = page.locator('.guia-ejemplo');
    await guia.waitFor({state: 'visible'});
    await page.screenshot({path: artifacts + 'guia-escritorio.png'});
    await page.locator('.guia-ejemplo button', {hasText: 'Ver revisión'}).click();
    assert.equal(await page.locator('#modalRoot .mo-title').textContent(), 'Revisión', 'Ver revisión abre la revisión');
    await page.keyboard.press('Escape');
    await page.locator('.guia-ejemplo button', {hasText: 'Cambiar datos'}).click();
    await page.waitForSelector('#modalRoot .modal');
    await page.keyboard.press('Escape');
    await page.locator('.guia-ejemplo button', {hasText: 'Presentar'}).click();
    assert.equal(await page.evaluate(() => P.on), true, 'Presentar entra en la presentación');
    assert.deepEqual(errors, [], 'sin errores de página');
    await context.close();
  });

  await t.test('la guía cerrada no vuelve a salir al abrir el ejemplo otra vez', async () => {
    const context = await browser.newContext({viewport: {width: 1440, height: 900}});
    const page = await context.newPage();
    await page.goto(url);
    await page.locator('.guia-cerrar').click();
    assert.equal(await page.locator('.guia-ejemplo').count(), 0, 'se cierra');
    await page.goto(url);
    await page.waitForTimeout(800);
    assert.equal(await page.locator('.guia-ejemplo').count(), 0, 'y recargar con el mismo ejemplo no la vuelve a mostrar');
    await context.close();
  });

  await t.test('teléfono: la guía cabe sin desbordar la pantalla', async () => {
    const context = await browser.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 2});
    const page = await context.newPage();
    await page.goto(url.replace('calibracion', 'espectroscopia'));
    await page.locator('.guia-ejemplo').waitFor({state: 'visible'});
    const desborde = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.ok(desborde <= 1, 'sin desborde horizontal: ' + desborde);
    await page.locator('.guia-ejemplo').screenshot({path: artifacts + 'guia-telefono.png'});
    await context.close();
  });
});
