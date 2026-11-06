/* SPDX-License-Identifier: AGPL-3.0-only */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';

/* Los avisos no deben tapar los controles de la parte baja (chips de estado, zoom y
   la barra de acción del teléfono). La comprobación es geométrica: el aviso tiene
   pointer-events:none, así que elementFromPoint no lo vería. */

test('los avisos no tapan los controles inferiores, en escritorio ni en teléfono', {timeout: 240000}, async t => {
  const bin = process.env.ERLEN_CHROMIUM || '/usr/bin/chromium';
  if (!existsSync(bin)) { t.skip('Set ERLEN_CHROMIUM to run browser validation.'); return; }
  const port = Number(process.env.ERLEN_AVISOS_PORT || 4396);
  const server = spawn(process.execPath, [fileURLToPath(new URL('../herramientas/serve.mjs', import.meta.url))], {env: {...process.env, PORT: String(port)}, stdio: ['ignore', 'pipe', 'pipe']});
  t.after(() => server.kill());
  await new Promise((ok, fail) => { server.stdout.once('data', ok); server.once('error', fail); server.once('exit', code => fail(new Error('Server exited: ' + code))); });
  const browser = await chromium.launch({executablePath: bin, args: ['--no-sandbox']});
  t.after(() => browser.close());

  for (const [nombre, viewport] of [['escritorio', {width: 1440, height: 900}], ['teléfono', {width: 390, height: 844}]]) {
    await t.test('avisos sobre los controles inferiores: ' + nombre, async () => {
      const page = await browser.newPage({viewport});
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto('http://127.0.0.1:' + port + '/?plantilla=calibracion');
      await page.waitForTimeout(1500);
      await page.evaluate(() => toast('Aviso de prueba para la franja inferior.'));
      const r = await page.evaluate(() => {
        const caja = el => { const b = el.getBoundingClientRect(); return {l: b.left, t: b.top, r: b.right, b: b.bottom, h: b.height}; };
        const cruza = (a, c) => a.l < c.r && c.l < a.r && a.t < c.b && c.t < a.b;
        const avisos = [...document.querySelectorAll('#toasts .toast')].map(caja).filter(x => x.h > 0);
        const controles = [];
        for (const s of ['.canvas-foot', '.zoombox', '.erlen-marco-barra-accion', '.canvas-foot button', '.zoombox button', '.erlen-marco-barra-accion button'])
          document.querySelectorAll(s).forEach(el => { const c = caja(el); if (c.h > 0 && c.b > innerHeight / 2) controles.push({s, ...c}); });
        return {avisos: avisos.length, controles: controles.length, tapados: controles.filter(c => avisos.some(a => cruza(a, c))).map(c => c.s)};
      });
      assert.ok(r.avisos >= 1, 'el aviso está en pantalla');
      assert.ok(r.controles >= 2, 'hay controles inferiores que comprobar: ' + r.controles);
      assert.deepEqual(r.tapados, [], 'ningún control inferior queda debajo del aviso');
      assert.deepEqual(errors, [], 'sin errores de página');
      await page.close();
    });
  }
});
