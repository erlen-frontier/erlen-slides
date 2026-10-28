/* SPDX-License-Identifier: AGPL-3.0-only */
/* Real geometry and autonomous files. All numerical data are illustrative. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';

test('Slides upgrades in Chromium', {timeout: 120000}, async t => {
  const bin = process.env.ERLEN_CHROMIUM || '/usr/bin/chromium';
  if (!existsSync(bin)) { t.skip('Set ERLEN_CHROMIUM to run browser validation.'); return; }
  const port = Number(process.env.ERLEN_SLIDES_TEST_PORT || 4215);
  const server = spawn(process.execPath, [fileURLToPath(new URL('../herramientas/serve.mjs', import.meta.url))], {env: {...process.env, PORT: String(port)}, stdio: ['ignore', 'pipe', 'pipe']});
  t.after(() => server.kill());
  await new Promise((ok, fail) => { server.stdout.once('data', ok); server.once('error', fail); server.once('exit', code => fail(new Error('Server exited: ' + code))); });
  const browser = await chromium.launch({executablePath: bin, args: ['--no-sandbox']});
  t.after(() => browser.close());
  const page = await browser.newPage({viewport: {width: 1440, height: 1000}}), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:' + port + '/');
  await page.evaluate(() => wsCerrar());
  const artifacts = fileURLToPath(new URL('../.local/slides-upgrade/', import.meta.url));
  mkdirSync(artifacts, {recursive: true});

  await t.test('Markdown preview, one shared parser, embedded figures and remote rejection', async () => {
    await page.evaluate(() => openMarkdown());
    await page.getByRole('textbox', {name: 'Guion Markdown'}).fill('# Charla ilustrativa\n\n## Evidencia\n\n- Objetivo\n- Medición');
    await page.getByRole('button', {name: 'Vista previa', exact: true}).click();
    await page.getByRole('button', {name: 'Crear presentación', exact: true}).click();
    assert.equal(await page.evaluate(() => S.deck.slides.length), 2);
    const r = await page.evaluate(async () => {
      const before = JSON.stringify(S.deck), core = await extensionSlides('markdown');
      const d = deepCopy(S.deck), im = newBlock('image'); im.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='; im.caption = 'Figura ilustrativa'; d.slides[1].blocks.push(im);
      const out = core.aMarkdown(d, {zonasPorDiseno: Object.fromEntries(LAYOUTS.map(l => [l.id, zonasDe(l.id)])), incrustarFiguras: true});
      const vuelta = await deckDesdeMarkdown(out.md);
      let remoto; try { await deckDesdeMarkdown('# Título\n\n## Figura\n\n![Figura](https://example.org/imagen.png)'); } catch (e) { remoto = e.message; }
      return {imagen: vuelta.deck.slides[1].blocks.find(b => b.type === 'image').src, original: im.src, remoto, intacto: before === JSON.stringify(S.deck)};
    });
    assert.equal(r.imagen, r.original); assert.equal(r.intacto, true); assert.match(r.remoto, /incrustadas/);
  });

  await t.test('Mermaid retains editable source, rejects external configuration, previews themes', async () => {
    await page.evaluate(() => { S.cur = 1; renderAll(); openDiagramaTexto(); });
    await page.getByRole('textbox', {name: 'Fuente del diagrama'}).fill('flowchart LR\n A[Pregunta] --> B[Evidencia]');
    await page.getByRole('textbox', {name: 'Nombre del diagrama'}).fill('Diagrama ilustrativo');
    await page.getByRole('button', {name: 'Dibujar', exact: true}).click();
    await page.getByRole('button', {name: 'Insertar diagrama', exact: true}).click();
    const r = await page.evaluate(async () => {
      const b = curSlide().blocks.find(b => b.cientifico?.tipo === 'diagrama'), copia = JSON.parse(JSON.stringify(b));
      let rechazo; try { await generaDiagrama('%%{init: {securityLevel: "loose"}}%%\nflowchart LR\nA-->B'); } catch (e) { rechazo = e.message; }
      cienciaReabrir(b); return {valido: cienciaFuenteValida(copia.cientifico), svg: copia.src, fuente: copia.cientifico.texto, rechazo};
    });
    assert.equal(r.valido, true); assert.match(r.svg, /^data:image\/svg\+xml/); assert.match(decodeURIComponent(r.svg), /<text[\s>]/); assert.match(decodeURIComponent(r.svg), /Evidencia/); assert.match(r.fuente, /Evidencia/); assert.match(r.rechazo, /configuración/);
    assert.equal(await page.getByRole('textbox', {name: 'Fuente del diagrama'}).inputValue(), r.fuente);
    await page.evaluate(() => { closeModal(); openTemasVisuales(); });
    const n = await page.locator('.tema-visual').count(); assert.ok(n > 8);
    const geometry = await page.locator('.tema-visual .slide').first().boundingBox(); assert.ok(geometry.width > 200 && geometry.width < 500, JSON.stringify(geometry));
    await page.screenshot({path: artifacts + 'themes.png'});
    await page.evaluate(() => closeModal());
  });

  await t.test('Batch editing is atomic, respects locks, preserves source and undoes', async () => {
    const r = await page.evaluate(() => {
      const deck = S.deck, slide = curSlide(), bloques = slide.blocks.slice(0, 2), ids = bloques.map(b => b.id), fuente = JSON.stringify(bloques.map(b => b.cientifico || b.items));
      aplicaLoteBloques(deck, slide, ids, 'agrupar'); const group = bloques[0].group;
      selectBlock(ids[0]); const seleccion = [...idsSeleccionados()];
      aplicaLoteBloques(deck, slide, ids, 'bloquear');
      const antes = JSON.stringify(S.deck), undo = S.undo.length;
      delBlock(ids[0]); moveBlock(ids[0], 1); moveBlockToSlide(ids[0], 0, 0);
      let rechazo; try { aplicaLoteBloques(deck, slide, ids, 'eliminar'); } catch (e) { rechazo = e.message; }
      const protegido = antes === JSON.stringify(S.deck) && undo === S.undo.length;
      aplicaLoteBloques(deck, slide, ids, 'desbloquear');
      aplicaLoteBloques(deck, slide, ids, 'alinear', 'right');
      const alineado = bloques.every(b => b.blockAlign === 'right');
      doUndo();
      return {group, seleccion, ids, protegido, rechazo, alineado, deshecho: !curSlide().blocks[0].blockAlign, fuente: fuente === JSON.stringify(curSlide().blocks.slice(0, 2).map(b => b.cientifico || b.items))};
    });
    assert.ok(r.group); assert.deepEqual(r.seleccion, r.ids); assert.equal(r.protegido, true); assert.match(r.rechazo, /Desbloquea/); assert.equal(r.alineado, true); assert.equal(r.deshecho, true); assert.equal(r.fuente, true);
  });

  await t.test('A clipped nested table is detected with real geometry', async () => {
    const r = await page.evaluate(async () => {
      const d = blankDeck(), sl = ({id: uid(), layout: 'content', title: '', blocks: []}), b = newBlock('table'); sl.title = 'Tabla ilustrativa'; b.rows = Array.from({length: 70}, (_, i) => [String(i), 'Valor ilustrativo']); sl.blocks.push(b); d.slides.push(sl);
      const raiz = renderSlide(d, 1, 'export', 99); document.body.append(raiz); await document.fonts.ready;
      const recortes = recortesSlide(raiz); raiz.remove(); return {recortes, id: b.id};
    });
    assert.ok(r.recortes.some(r0 => r0.bloque === r.id && r0.tabla && r0.px > 3), JSON.stringify(r));
  });

  await t.test('Recording cancellation, microphone failures and download always release tracks', async () => {
    await page.evaluate(() => {
      window.__mediaTest = {mode: 'pending', tracks: [], recorder: window.MediaRecorder, stream: window.MediaStream, devices: navigator.mediaDevices};
      const track = () => { const t = {stopped: false, stop() { this.stopped = true; }, addEventListener() {}}; __mediaTest.tracks.push(t); return t; };
      const screen = () => { const t = track(); return {getTracks: () => [t], getVideoTracks: () => [t]}; };
      Object.defineProperty(navigator, 'mediaDevices', {configurable: true, value: {getDisplayMedia: () => __mediaTest.mode === 'pending' ? new Promise(ok => { __mediaTest.finish = () => ok(screen()); }) : Promise.resolve(screen()), getUserMedia: () => Promise.reject(new Error('Micrófono de prueba denegado'))}});
      window.MediaStream = class { constructor(tracks) { this.tracks = tracks; } };
      window.MediaRecorder = class {
        static isTypeSupported() { return true; }
        constructor() { this.state = 'inactive'; this.mimeType = 'video/webm'; }
        start() { if (__mediaTest.mode === 'start-error') throw new Error('Inicio de prueba fallido'); this.state = 'recording'; }
        stop() { this.state = 'inactive'; this.ondataavailable?.({data: new Blob(['mock recording'], {type: this.mimeType})}); this.onstop?.(); }
      };
    });
    try {
      await page.evaluate(() => openGrabacion());
      await page.getByRole('button', {name: 'Elegir pantalla y grabar'}).click();
      await page.evaluate(() => { closeModal(); __mediaTest.finish(); });
      await page.waitForFunction(() => !GRABACION.solicitando);
      assert.equal(await page.evaluate(() => __mediaTest.tracks.every(t => t.stopped)), true);
      await page.evaluate(() => { __mediaTest.mode = 'ready'; return openGrabacion(); });
      await page.getByRole('button', {name: 'Elegir pantalla y grabar'}).click();
      await page.waitForFunction(() => !GRABACION.solicitando);
      assert.match(await page.locator('#modalRoot').innerText(), /Micrófono de prueba denegado/);
      assert.equal(await page.evaluate(() => __mediaTest.tracks.every(t => t.stopped)), true);
      await page.evaluate(() => { closeModal(); return openGrabacion(); });
      await page.getByRole('checkbox', {name: 'Incluir mi micrófono'}).uncheck();
      await page.getByRole('button', {name: 'Elegir pantalla y grabar'}).click();
      const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', {name: 'Detener y descargar'}).click()]);
      assert.match(download.suggestedFilename(), /-grabacion\.webm$/);
      assert.equal(await page.evaluate(() => !GRABACION.recorder && __mediaTest.tracks.every(t => t.stopped)), true);
      await page.evaluate(() => { endPresent(); __mediaTest.mode = 'start-error'; return openGrabacion(); });
      await page.getByRole('checkbox', {name: 'Incluir mi micrófono'}).uncheck();
      await page.getByRole('button', {name: 'Elegir pantalla y grabar'}).click();
      await page.waitForFunction(() => !GRABACION.solicitando);
      assert.equal(await page.evaluate(() => !GRABACION.recorder && !document.getElementById('grabacionControl') && __mediaTest.tracks.every(t => t.stopped)), true);
    } finally {
      await page.evaluate(() => { endPresent(); closeModal(); window.MediaRecorder = __mediaTest.recorder; window.MediaStream = __mediaTest.stream; Object.defineProperty(navigator, 'mediaDevices', {configurable: true, value: __mediaTest.devices}); delete window.__mediaTest; });
    }
  });

  await t.test('Native PPTX and offline HTML retain data, fragments, functions and private notes policy', async () => {
    const r = await page.evaluate(async () => {
      const d = blankDeck(); d.meta.title = 'Validación con datos ilustrativos';
      function agregar(titulo, b) { const s = ({id: uid(), layout: 'content', title: '', blocks: []}); s.title = titulo; s.blocks = [b]; d.slides.push(s); }
      const tabla = newBlock('table'); tabla.rows = [['x', 'y'], ['0', '1'], ['0.7', '2'], ['4.2', '3']]; agregar('Tabla ilustrativa', tabla);
      const chart = newBlock('chart'); Object.assign(chart, {kind: 'linea', data: 'x,y\n0,1\n0.7,2\n4.2,3', xlabel: 'x (s)', ylabel: 'y (u.a.)', caption: 'Datos ilustrativos'}); agregar('Datos ilustrativos', chart);
      const smart = newBlock('smart'); smart.items = [{t: 'Pregunta'}, {t: 'Método'}, {t: 'Evidencia'}]; agregar('Proceso ilustrativo', smart);
      const f = newBlock('func'); Object.assign(f, {curves: [{expr: 'a*x', name: 'Ejemplo ilustrativo'}], params: [{name: 'a', value: 1, min: 0, max: 3, step: 0.1}], xmin: 0, xmax: 2, xlabel: 'x', ylabel: 'y', title: '', caption: 'Modelo ilustrativo', anim: 'none'}); agregar('Función interactiva ilustrativa', f);
      const lista = newBlock('bullets'); lista.items = [{t: 'Primero', lvl: 0}, {t: 'Segundo', lvl: 0}]; lista.step = true; agregar('Pasos', lista); d.slides[5].notes = 'NOTA_PRIVADA_DE_PRUEBA';
      const mermaid = newBlock('image'); mermaid.src = await generaDiagrama('flowchart LR\n A[Pregunta] --> B[Evidencia]'); mermaid.alt = 'Diagrama ilustrativo'; mermaid.caption = 'Diagrama ilustrativo'; agregar('Mermaid', mermaid);
      const ext = await extensionSlides('exportador'), antes = JSON.stringify(d);
      const p = await ext.creaPPTX(d), html = await ext.creaHTML(d), conNotas = await ext.creaHTML(d, true);
      const zip = await window.JSZip.loadAsync(p.blob), entries = Object.keys(zip.files), charts = entries.filter(n => /^ppt\/charts\/chart\d+\.xml$/.test(n));
      const chartXML = await zip.file(charts[0]).async('string'), smartXML = await zip.file('ppt/slides/slide4.xml').async('string');
      const archivo = await p.blob.arrayBuffer();
      return {pptx: [...new Uint8Array(archivo)], html: await html.text(), conNotas: await conNotas.text(), chartXML, smartXML, avisos: p.avisos, intacto: antes === JSON.stringify(d), nCharts: charts.length};
    });
    assert.equal(r.intacto, true); assert.equal(r.nCharts, 1); assert.match(r.chartXML, /scatterChart/); assert.match(r.chartXML, />0\.7</); assert.match(r.chartXML, />4\.2</); assert.match(r.smartXML, /custGeom|prstGeom/);
    assert.ok(r.avisos.some(a => a.diapositiva === 5)); assert.equal(r.html.includes('NOTA_PRIVADA_DE_PRUEBA'), false); assert.equal(r.conNotas.includes('NOTA_PRIVADA_DE_PRUEBA'), true);
    writeFileSync(artifacts + 'editable.pptx', Buffer.from(r.pptx)); writeFileSync(artifacts + 'presentacion.html', r.html);
    const offline = await browser.newPage({viewport: {width: 1440, height: 1000}}), red = [], errores = [];
    offline.on('pageerror', e => errores.push(e.message)); offline.on('request', req => {if (/^https?:/.test(req.url())) red.push(req.url());});
    // Managed Chromium blocks file: navigation. Load the complete artifact
    // into a fresh about:blank document, with no app or local-server origin.
    await offline.setContent(r.html, {waitUntil: 'load'});
    await offline.waitForFunction(() => typeof presenter !== 'undefined' && presenter.isReady());
    await offline.evaluate(() => presenter.slide(4));
    const antes = await offline.locator('.present .chart-holder').innerHTML();
    const slider = offline.locator('.present input[type=range]').first(); await slider.fill('2'); await slider.dispatchEvent('input');
    await offline.waitForFunction(() => document.querySelector('.present .sl-val')?.textContent === '2');
    await new Promise(ok => setTimeout(ok, 60)); assert.notEqual(await offline.locator('.present .chart-holder').innerHTML(), antes);
    await slider.focus(); await slider.press('ArrowRight'); assert.equal(await offline.evaluate(() => presenter.getIndices().h), 4);
    await offline.evaluate(() => presenter.slide(5)); assert.equal(await offline.locator('.present .fragment.visible').count(), 0);
    await offline.keyboard.press('ArrowRight'); assert.equal(await offline.locator('.present .fragment.visible').count(), 1);
    await offline.waitForFunction(() => +getComputedStyle(document.querySelector('.present .fragment.visible')).opacity >= 0.95);
    await offline.screenshot({path: artifacts + 'offline.png'}); assert.deepEqual(red, []); assert.deepEqual(errores, []); await offline.close();
  });
  assert.deepEqual(errors, []);
});
