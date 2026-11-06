/* SPDX-License-Identifier: AGPL-3.0-only */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';

/* Los doce ejemplos incluidos deben salir de la revisión sin ningún aviso.
   El desborde (el contenido que no cabe) solo se mide con geometría real, así que
   la prueba corre en Chromium. Los datos de los ejemplos son ilustrativos. */

test('los doce ejemplos pasan la revisión sin avisos en Chromium', {timeout: 240000}, async t => {
  const bin = process.env.ERLEN_CHROMIUM || '/usr/bin/chromium';
  if (!existsSync(bin)) { t.skip('Set ERLEN_CHROMIUM to run browser validation.'); return; }
  const port = Number(process.env.ERLEN_EJEMPLOS_PORT || 4398);
  const server = spawn(process.execPath, [fileURLToPath(new URL('../herramientas/serve.mjs', import.meta.url))], {env: {...process.env, PORT: String(port)}, stdio: ['ignore', 'pipe', 'pipe']});
  t.after(() => server.kill());
  await new Promise((ok, fail) => { server.stdout.once('data', ok); server.once('error', fail); server.once('exit', code => fail(new Error('Server exited: ' + code))); });
  const browser = await chromium.launch({executablePath: bin, args: ['--no-sandbox']});
  t.after(() => browser.close());
  const page = await browser.newPage({viewport: {width: 1440, height: 900}}), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:' + port + '/');
  await page.evaluate(() => wsCerrar());

  const hallazgos = await page.evaluate(() => EJEMPLOS.map(e => {
    S.deck = e.build();
    return {id: e.id, avisos: revisaMazo().fallos.map(f => f.grado + ' · diapositiva ' + (f.i + 1) + ' · ' + f.qué)};
  }));
  assert.equal(hallazgos.length, 12, 'son doce ejemplos');
  for (const h of hallazgos)
    assert.deepEqual(h.avisos, [], h.id + ' tiene avisos de revisión');
  assert.deepEqual(errors, [], 'sin errores de página');
});
