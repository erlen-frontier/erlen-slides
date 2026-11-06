/* SPDX-License-Identifier: AGPL-3.0-only */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';

/* El botón σ de la barra contextual abre el análisis en Chromium real, en escritorio
   y en teléfono. Los datos son sintéticos y se generan en la prueba. */

test('el botón σ de la barra contextual abre el análisis de la gráfica', {timeout: 240000}, async t => {
  const bin = process.env.ERLEN_CHROMIUM || '/usr/bin/chromium';
  if (!existsSync(bin)) { t.skip('Set ERLEN_CHROMIUM to run browser validation.'); return; }
  const port = Number(process.env.ERLEN_ANALISIS_PORT || 4395);
  const server = spawn(process.execPath, [fileURLToPath(new URL('../herramientas/serve.mjs', import.meta.url))], {env: {...process.env, PORT: String(port)}, stdio: ['ignore', 'pipe', 'pipe']});
  t.after(() => server.kill());
  await new Promise((ok, fail) => { server.stdout.once('data', ok); server.once('error', fail); server.once('exit', code => fail(new Error('Server exited: ' + code))); });
  const browser = await chromium.launch({executablePath: bin, args: ['--no-sandbox']});
  t.after(() => browser.close());
  const artifacts = fileURLToPath(new URL('../.local/analisis-acceso/', import.meta.url));
  mkdirSync(artifacts, {recursive: true});

  for (const [nombre, viewport] of [['escritorio', {width: 1440, height: 900}], ['telefono', {width: 390, height: 844}]]) {
    await t.test('σ abre el análisis en ' + nombre, async () => {
      const context = await browser.newContext({viewport, deviceScaleFactor: 2});
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto('http://127.0.0.1:' + port + '/');
      await page.evaluate(() => wsCerrar());
      await page.evaluate(() => {
        const pico = [];
        const sigma = 0.4 / 2.3548;
        for (let x = 20; x <= 50.0001; x += 0.02) pico.push(x.toFixed(2) + ',' + Math.exp(-Math.pow((x - 35) / sigma, 2) / 2).toFixed(6));
        const d = blankDeck();
        const g = Object.assign(newBlock('chart'), {id: 'g-drx', data: '2theta,I\n' + pico.join('\n'), tecnica: 'xrd', xlabel: '2θ (°)', ylabel: 'Intensidad (u. a.)'});
        d.slides = [{id: 's-drx', layout: 'blanco', title: '', blocks: [g]}];
        S.deck = d; S.cur = 0; S.selBlock = 'g-drx';
        renderAll();
      });
      const boton = page.locator('#barraContextual [data-barra-accion="analizar"]');
      await boton.waitFor({state: 'visible'});
      await page.locator('#barraContextual').screenshot({path: artifacts + 'barra-' + nombre + '.png'});
      await boton.click();
      await page.waitForSelector('#modalRoot .modal');
      assert.equal(await page.locator('#modalRoot .mo-title').textContent(), 'Análisis de la serie');
      assert.equal(await page.locator('#modalRoot .seg-4 button.on').textContent(), 'Pico y anchura', 'la difracción abre en pico y anchura');
      await page.locator('#modalRoot .modal').screenshot({path: artifacts + 'analisis-' + nombre + '.png'});
      const desborde = await page.evaluate(() => {
        const m = document.querySelector('#modalRoot .modal');
        return m.scrollWidth - m.clientWidth;
      });
      assert.ok(desborde <= 1, 'el modal no desborda en ' + nombre + ': ' + desborde);
      await page.keyboard.press('Escape');
      assert.deepEqual(errors, [], 'sin errores de página');
      await context.close();
    });
  }
});
