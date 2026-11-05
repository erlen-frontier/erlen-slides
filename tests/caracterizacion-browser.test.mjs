/* SPDX-License-Identifier: AGPL-3.0-only */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';

/* Caracterización en Chromium real: el modal de análisis, la gráfica de Tauc y la
   de pico, la conversión de nm a eV, y el diseño en escritorio, teléfono y modo
   oscuro. Los datos son sintéticos y se generan en la propia prueba. */

test('Caracterización en Chromium: Tauc con reflectancia, Scherrer y diseño en teléfono', {timeout: 240000}, async t => {
  const bin = process.env.ERLEN_CHROMIUM || '/usr/bin/chromium';
  if (!existsSync(bin)) { t.skip('Set ERLEN_CHROMIUM to run browser validation.'); return; }
  const port = Number(process.env.ERLEN_CARACTERIZACION_PORT || 4399);
  const server = spawn(process.execPath, [fileURLToPath(new URL('../herramientas/serve.mjs', import.meta.url))], {env: {...process.env, PORT: String(port)}, stdio: ['ignore', 'pipe', 'pipe']});
  t.after(() => server.kill());
  await new Promise((ok, fail) => { server.stdout.once('data', ok); server.once('error', fail); server.once('exit', code => fail(new Error('Server exited: ' + code))); });
  const browser = await chromium.launch({executablePath: bin, args: ['--no-sandbox']});
  t.after(() => browser.close());
  const context = await browser.newContext({viewport: {width: 1440, height: 1000}, deviceScaleFactor: 2});
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:' + port + '/');
  await page.evaluate(() => wsCerrar());
  const artifacts = fileURLToPath(new URL('../.local/caracterizacion/', import.meta.url));
  mkdirSync(artifacts, {recursive: true});

  /* Reflectancia de un borde directo en 3.1 eV (ver tests/caracterizacion.test.mjs). */
  const abreReflectancia = () => page.evaluate(() => {
    const filas = [];
    for (let lam = 300; lam <= 700; lam += 2) {
      const hv = 1239.84 / lam;
      const f = hv > 3.1 ? 3 * Math.sqrt(hv - 3.1) / hv + 0.02 : 0.02;
      filas.push(lam + ',' + (((1 + f) - Math.sqrt(f * f + 2 * f)) * 100).toFixed(4));
    }
    window.__bCaract = Object.assign(newBlock('chart'), {data: 'λ,R\n' + filas.join('\n'), tecnica: 'uvvis-dr', xlabel: 'Longitud de onda (nm)', ylabel: 'Reflectancia (%)'});
    openAnalisis(window.__bCaract);
  });
  const filaValor = etiqueta => page.locator('#modalRoot .an-fila', {hasText: etiqueta}).locator('.an-val').textContent();

  await t.test('Tauc: el aviso de nm convierte a eV, la banda sale cerca de 3.1 eV y la ventana se fija a mano', async () => {
    await abreReflectancia();
    await page.waitForSelector('#modalRoot .an-plot');
    assert.equal(await page.locator('#modalRoot .seg-4 button.on').textContent(), 'Tauc', 'abre en Tauc');
    assert.match(await page.locator('#modalRoot .an-aviso').first().textContent(), /nanómetros/);
    await page.click('#modalRoot .an-aviso button');
    const eg = parseFloat(await filaValor('Banda prohibida'));
    assert.ok(Math.abs(eg - 3.1) < 0.08, 'Eg = ' + eg);
    await page.fill('#modalRoot input[aria-label="Inicio del tramo (eV)"]', '3.2');
    assert.match(await page.locator('#modalRoot .an-fila', {has: page.locator('.an-et', {hasText: /^Tramo$/})}).textContent(), /fijado a mano/);
    await page.locator('#modalRoot .modal').screenshot({path: artifacts + 'tauc-escritorio.png'});
    await page.keyboard.press('Escape');
    const guardado = await page.evaluate(() => window.__bCaract.analisisOpc);
    assert.equal(guardado.nmAeV, true);
    assert.equal(guardado.desde, 3.2, 'la ventana queda con la gráfica');
  });

  await t.test('Scherrer: un pico gaussiano de FWHM 0.4° da unos 20.8 nm con Cu Kα', async () => {
    await page.evaluate(() => {
      const sigma = 0.4 / 2.3548, filas = ['2theta,I'];
      for (let x = 20; x <= 50.0001; x += 0.02) filas.push(x.toFixed(2) + ',' + Math.exp(-Math.pow((x - 35) / sigma, 2) / 2).toFixed(6));
      window.__bDrx = Object.assign(newBlock('chart'), {data: filas.join('\n'), tecnica: 'xrd'});
      openAnalisis(window.__bDrx);
    });
    await page.waitForSelector('#modalRoot .an-plot');
    assert.equal(await page.locator('#modalRoot .seg-4 button.on').textContent(), 'Pico y anchura', 'la difracción abre en pico y anchura');
    await page.click('#modalRoot .seg-4 button:has-text("Scherrer")');
    const nm = parseFloat(await filaValor('Tamaño de cristalita'));
    const esperado = 0.9 * 0.15406 / (0.4 * Math.PI / 180 * Math.cos(17.5 * Math.PI / 180));
    assert.ok(Math.abs(nm - esperado) / esperado < 0.01, 'D = ' + nm + ' nm, esperado ' + esperado.toFixed(2));
    assert.equal(await page.locator('#modalRoot select[aria-label="Radiación del tubo"]').inputValue(), '0.15406');
    await page.locator('#modalRoot .modal').screenshot({path: artifacts + 'scherrer-escritorio.png'});
    await page.keyboard.press('Escape');
  });

  await t.test('en teléfono el modal y las gráficas caben sin desbordar la pantalla', async () => {
    await page.setViewportSize({width: 390, height: 844});
    await page.evaluate(() => openAnalisis(window.__bCaract));
    await page.waitForSelector('#modalRoot .an-plot');
    const medidas = await page.evaluate(() => {
      const m = document.querySelector('#modalRoot .modal'), g = document.querySelector('#modalRoot .an-plot');
      return {modal: m.getBoundingClientRect().width, desborde: m.scrollWidth - m.clientWidth, grafica: g.getBoundingClientRect().width, ventana: window.innerWidth};
    });
    assert.ok(medidas.modal <= medidas.ventana, 'el modal cabe en el ancho: ' + JSON.stringify(medidas));
    assert.ok(medidas.desborde <= 1, 'sin desborde horizontal dentro del modal: ' + medidas.desborde);
    assert.ok(medidas.grafica <= medidas.modal, 'la gráfica cabe en el modal');
    await page.locator('#modalRoot .modal').screenshot({path: artifacts + 'tauc-telefono.png'});
    await page.keyboard.press('Escape');
  });

  await t.test('modo oscuro: la gráfica se lee con los colores del tema', async () => {
    await page.setViewportSize({width: 1440, height: 1000});
    await page.emulateMedia({colorScheme: 'dark'});
    await page.evaluate(() => openAnalisis(window.__bCaract));
    await page.waitForSelector('#modalRoot .an-plot');
    await page.locator('#modalRoot .modal').screenshot({path: artifacts + 'tauc-oscuro.png'});
    await page.keyboard.press('Escape');
    await page.emulateMedia({colorScheme: 'light'});
  });

  assert.deepEqual(errors, [], 'sin errores de página');
});
