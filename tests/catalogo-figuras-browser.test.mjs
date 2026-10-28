/* SPDX-License-Identifier: AGPL-3.0-only */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';

async function start(t, port) {
  const bin = process.env.ERLEN_CHROMIUM || '/usr/bin/chromium';
  if (!existsSync(bin)) { t.skip('Chromium is required.'); return null; }
  const server = spawn(process.execPath, [fileURLToPath(new URL('../herramientas/serve.mjs', import.meta.url))],
    {env:{...process.env, PORT:String(port)}, stdio:['ignore','pipe','pipe']});
  t.after(() => server.kill());
  await new Promise((resolve,reject) => {
    server.stdout.once('data', resolve);
    server.once('error', reject);
    server.once('exit', code => reject(new Error('Server exited: ' + code)));
  });
  const browser = await chromium.launch({executablePath:bin, args:['--no-sandbox']});
  t.after(() => browser.close());
  const page = await browser.newPage({viewport:{width:1440,height:1000}}), errors = [];
  page.setDefaultTimeout(8000); page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:' + port + '/');
  await page.evaluate(() => { wsNueva(); addSlide('blanco'); alternaLienzoLibre(); });
  return {page, errors};
}

test('catalog pieces are independent slide objects with preserved credits', {timeout:120000}, async t => {
  const app = await start(t, Number(process.env.ERLEN_CATALOGO_TEST_PORT || 4271));
  if (!app) return;
  const {page, errors} = app;
  await page.locator('#lienzoCatalogoBtn').click();
  const dialog = page.getByRole('dialog', {name:'Catálogo científico'});
  await dialog.getByRole('searchbox', {name:'Buscar figuras'}).fill('mitocondria');
  const result = dialog.getByRole('button', {name:'Mitocondria Biología · Servier', exact:true});
  await result.locator('img').evaluate(el => el.decode());
  await dialog.getByRole('button', {name:'Mitocondria Biología · Servier', exact:true}).click();
  await dialog.getByRole('img', {name:'Mitocondria'}).waitFor();
  assert.match(await dialog.textContent(), /Servier/);
  assert.match(await dialog.textContent(), /CC-BY-3\.0/);
  await dialog.getByRole('button', {name:'Añadir al lienzo'}).click();
  await dialog.waitFor({state:'hidden'});
  const inserted = await page.evaluate(() => structuredClone(curSlide().blocks[0]));
  assert.equal(inserted.type, 'image');
  assert.equal(inserted.catalogo.author, 'Servier');
  assert.equal(inserted.catalogo.license, 'CC-BY-3.0');
  assert.ok(inserted.catalogo.url && inserted.catalogo.licenseURL && inserted.catalogo.sha256);
  assert.match(inserted.src, /^data:image\/svg\+xml/);
  assert.ok(await page.locator('#stageInner .blk[data-bid="' + inserted.id + '"] img').evaluate(el => el.complete && el.naturalWidth > 0));

  await page.keyboard.press('ArrowRight');
  const moved = await page.evaluate(id => ({...findBlock(id).block.posLibre}), inserted.id);
  assert.ok(moved.x > inserted.posLibre.x);
  await page.keyboard.press('Control+z');
  assert.deepEqual(await page.evaluate(id => ({...findBlock(id).block.posLibre}), inserted.id), inserted.posLibre);
  const reloaded = await page.evaluate(() => saneaDeck(JSON.parse(JSON.stringify(S.deck))).deck.slides[1].blocks[0]);
  assert.deepEqual(reloaded.catalogo, inserted.catalogo);
  assert.equal(reloaded.src, inserted.src);
  assert.ok(await page.evaluate(() => informeExportacion(S.deck).warnings.some(w => w.code === 'catalog-attribution')));
  const exported = await page.evaluate(async () => {
    const exporter = await extensionSlides('exportador');
    const pptx = await exporter.creaPPTX(S.deck);
    const zip = await window.JSZip.loadAsync(pptx.blob);
    const svgFiles = Object.keys(zip.files).filter(name => /^ppt\/media\/.*\.svg$/i.test(name));
    const svg = await Promise.all(svgFiles.map(name => zip.file(name).async('string')));
    // Compare the displayed SVG with the embedded PowerPoint SVG at the same
    // viewport. The source artwork can have a viewBox of a different aspect
    // ratio than its viewport, which must remain letterboxed on export.
    const pixels = async src => {
      const img = new Image(); img.src = src; await img.decode();
      const canvas = document.createElement('canvas'); canvas.width = 100; canvas.height = 140;
      const context = canvas.getContext('2d'); context.drawImage(img, 0, 0, 100, 140);
      return context.getImageData(0, 0, 100, 140).data;
    };
    const originalPixels = await pixels(S.deck.slides[1].blocks[0].src);
    const exportedPixels = await pixels('data:image/svg+xml,' + encodeURIComponent(svg[0]));
    const changed = originalPixels.reduce((total, value, index) => total + (Math.abs(value - exportedPixels[index]) > 8), 0);
    const html = await (await exporter.creaHTML(S.deck)).text();
    const review = await (await extensionSlides('compartir')).revisaSalida('pptx', S.deck);
    return {svg, html, review, changed};
  });
  assert.ok(exported.svg.some(svg => svg.includes('Servier') && svg.includes('CC-BY-3.0')));
  assert.ok(exported.changed < 100, 'PowerPoint must preserve the visible SVG proportions');
  assert.ok(exported.html.includes(inserted.src));
  assert.ok(exported.review.some(item => /requiere atribución/.test(item.mensaje)));
  const [figureDownload] = await Promise.all([
    page.waitForEvent('download'), page.evaluate(() => exportFigures())
  ]);
  const downloadedSvg = new TextDecoder('utf-8', {fatal:true}).decode(await readFile(await figureDownload.path()));
  assert.match(downloadedSvg, /Servier/);
  assert.match(downloadedSvg, /100×140/);
  const kit = await page.evaluate(async () => {
    const files = await archivosKit();
    const svg = files.find(file => file.nombre.startsWith('figuras/') && file.nombre.endsWith('.svg'));
    const credits = files.find(file => file.nombre === 'creditos-figuras.txt');
    const provenance = JSON.parse(files.find(file => file.nombre === 'provenance.json').datos);
    return {svg:new TextDecoder('utf-8', {fatal:true}).decode(svg.datos), credits:credits?.datos, provenance};
  });
  assert.match(kit.svg, /100×140/);
  assert.match(kit.credits, /Servier/);
  assert.equal(kit.provenance.figures[0].catalog.author, 'Servier');
  const markdownWarnings = await page.evaluate(async () => {
    const markdown = await extensionSlides('markdown');
    return markdown.aMarkdown(S.deck, {zonasPorDiseno:Object.fromEntries(LAYOUTS.map(l => [l.id, zonasDe(l.id)])), incrustarFiguras:true}).avisos;
  });
  assert.ok(markdownWarnings.some(warning => /Markdown no conserva la procedencia/.test(warning)));
  const [classicDownload] = await Promise.all([
    page.waitForEvent('download'), page.evaluate(() => exportPPTX())
  ]);
  const classicBytes = [...await readFile(await classicDownload.path())];
  const classic = await page.evaluate(async bytes => {
    const zip = await window.JSZip.loadAsync(new Uint8Array(bytes));
    const slide = await zip.file('ppt/slides/slide2.xml').async('string');
    const png = Object.keys(zip.files).find(name => /^ppt\/media\/.*\.png$/.test(name));
    return {slide, png:png ? await zip.file(png).async('base64') : ''};
  }, classicBytes);
  assert.match(classic.slide, /<p:pic>/);
  assert.ok(classic.png.startsWith('iVBORw0KGgo'), 'Classic PowerPoint must contain the drawing as a PNG');
  assert.match(await page.getByRole('dialog', {name:'Revisar el PowerPoint'}).textContent(), /incluye la atribución/i);
  await page.getByRole('dialog', {name:'Revisar el PowerPoint'}).getByRole('button', {name:'Entendido'}).click();
  await page.getByRole('button', {name:'Archivo', exact:true}).click();
  await page.getByRole('menuitem', {name:/Créditos de figuras/}).click();
  const credits = page.getByRole('dialog', {name:'Créditos de figuras'});
  assert.match(await credits.textContent(), /Mitocondria/);
  assert.match(await credits.textContent(), /Servier/);
  assert.match(await credits.textContent(), /CC-BY-3\.0/);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    credits.getByRole('button', {name:'Descargar créditos'}).click()
  ]);
  const text = await readFile(await download.path(), 'utf8');
  assert.match(text, /Servier/);
  assert.match(text, /CC-BY-3\.0/);
  assert.ok(text.includes(inserted.catalogo.url) && text.includes(inserted.catalogo.licenseURL));

  // Two different catalog pieces participate in the ordinary canvas
  // selection and resize together without losing their separate provenance.
  await credits.getByRole('button', {name:'Cerrar'}).last().click();
  await page.locator('#lienzoCatalogoBtn').click();
  await dialog.getByRole('searchbox', {name:'Buscar figuras'}).fill('matraz erlenmeyer');
  await dialog.getByRole('button', {name:/Matraz Erlenmeyer.*Slides 2\.0 contributors/}).click();
  await dialog.getByRole('button', {name:'Añadir al lienzo'}).click();
  await page.locator('#lienzoObjetosBtn').click();
  await page.getByRole('checkbox', {name:'Marcar Mitocondria'}).check();
  await page.getByRole('checkbox', {name:'Marcar Matraz Erlenmeyer'}).check();
  await page.getByRole('button', {name:'Seleccionar marcados'}).click();
  const beforeResize = await page.evaluate(() => curSlide().blocks.map(block => ({...block.posLibre})));
  const slideBox = await page.locator('#stageInner .slide').boundingBox();
  const resize = await page.getByRole('button', {name:'Cambiar tamaño de la selección: esquina inferior derecha'}).boundingBox();
  await page.mouse.move(resize.x + resize.width / 2, resize.y + resize.height / 2); await page.mouse.down();
  await page.mouse.move(resize.x + resize.width / 2 + slideBox.width * .08, resize.y + resize.height / 2 + slideBox.height * .04, {steps:5});
  await page.mouse.up();
  const afterResize = await page.evaluate(() => curSlide().blocks.map(block => ({...block.posLibre})));
  assert.ok(afterResize.every((position, index) => position.w > beforeResize[index].w));
  const reopened = await page.evaluate(() => saneaDeck(JSON.parse(JSON.stringify(S.deck))).deck.slides[1].blocks);
  assert.deepEqual(reopened.map(block => block.posLibre), afterResize);
  assert.deepEqual(reopened.map(block => block.catalogo.author), ['Servier', 'Slides 2.0 contributors']);
  await page.keyboard.press('Control+z');
  assert.deepEqual(await page.evaluate(() => curSlide().blocks.map(block => ({...block.posLibre}))), beforeResize);

  await page.evaluate(id => pickImage(findBlock(id).block), inserted.id);
  await page.locator('#imgFileInput').setInputFiles({name:'replacement.svg', mimeType:'image/svg+xml',
    buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="8"/></svg>')});
  await page.waitForFunction(id => findBlock(id).block.src.startsWith('data:image/svg+xml;base64,'), inserted.id);
  assert.equal(await page.evaluate(id => findBlock(id).block.catalogo, inserted.id), undefined);
  assert.doesNotMatch(await page.evaluate(() => textoCreditosCatalogo(S.deck)), /Servier/);
  await page.evaluate(() => doUndo());
  assert.equal(await page.evaluate(id => findBlock(id).block.catalogo.author, inserted.id), 'Servier');

  await page.evaluate(id => openRecorte(findBlock(id).block), inserted.id);
  let crop = page.getByRole('dialog', {name:'Encuadrar la imagen'});
  await crop.getByRole('button', {name:'1:1', exact:true}).click();
  await crop.getByRole('button', {name:'Aplicar', exact:true}).click();
  assert.match(await page.evaluate(() => textoCreditosCatalogo(S.deck)), /Recortada en Tabula/);
  const croppedSize = await page.evaluate(async id => {
    const image = new Image(); image.src = findBlock(id).block.src; await image.decode();
    return [image.naturalWidth, image.naturalHeight];
  }, inserted.id);
  assert.ok(croppedSize[0] >= 1000 && croppedSize[1] >= 1000, 'A cropped vector must stay usable at presentation size');
  await page.evaluate(id => openRecorte(findBlock(id).block), inserted.id);
  crop = page.getByRole('dialog', {name:'Encuadrar la imagen'});
  await crop.getByRole('button', {name:'Quitar el recorte'}).click();
  assert.doesNotMatch(await page.evaluate(() => textoCreditosCatalogo(S.deck)), /Recortada en Tabula/);

  const annotationError = await page.evaluate(async id => {
    try { await (await extensionSlides('figuras')).openFiguraCapas(findBlock(id).block); return null; }
    catch (error) { return error.message; }
  }, inserted.id);
  assert.equal(annotationError, null);
  await page.getByRole('status').filter({hasText:/^Listo\./}).waitFor();
  await page.getByRole('button', {name:'Insertar copia anotada'}).click();
  const annotated = await page.evaluate(() => curSlide().blocks.at(-1));
  assert.notEqual(annotated.id, inserted.id);
  assert.equal(annotated.catalogo.author, 'Servier');
  assert.ok(annotated.catalogo.changes.some(change => /anotad/i.test(change)));
  assert.match(decodeURIComponent(annotated.src.slice(annotated.src.indexOf(',') + 1)), /<metadata>.*Servier/);
  const annotationSize = await page.evaluate(async block => {
    const image = new Image(); image.src = block.figura.objects.find(object => object.kind === 'image').src; await image.decode();
    return [image.naturalWidth, image.naturalHeight];
  }, annotated);
  assert.ok(annotationSize[0] >= 800 && annotationSize[1] >= 1000, 'A vector annotation must retain enough detail for a slide');
  assert.ok(Math.abs(annotationSize[0] / annotationSize[1] - 100 / 140) < .002);
  assert.match(await page.evaluate(() => textoCreditosCatalogo(S.deck)), /copia anotada/);
  await page.evaluate(id => { curSlide().blocks = curSlide().blocks.filter(block => block.id !== id); commit(); }, inserted.id);
  assert.match(await page.evaluate(() => textoCreditosCatalogo(S.deck)), /Servier/);
  const rejected = await page.evaluate(async () => {
    const editor = await extensionSlides('figuras');
    const examples = [
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>',
      '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.invalid/a.png"/></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject/></svg>'
    ];
    return Promise.all(examples.map(async svg => {
      const block = Object.assign(newBlock('image'), {src:'data:image/svg+xml,' + encodeURIComponent(svg)});
      try { await editor.openFiguraCapas(block); return false; } catch { return true; }
    }));
  });
  assert.deepEqual(rejected, [true, true, true]);
  const legacyId = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 20; canvas.height = 20;
    const block = Object.assign(newBlock('image'), {src:canvas.toDataURL('image/png'), catalogo:'valor previo'});
    curSlide().blocks.push(block); commit(); return block.id;
  });
  await page.evaluate(id => openRecorte(findBlock(id).block), legacyId);
  crop = page.getByRole('dialog', {name:'Encuadrar la imagen'});
  await crop.getByRole('button', {name:'1:1', exact:true}).click();
  await crop.getByRole('button', {name:'Aplicar', exact:true}).click();
  assert.equal(await page.evaluate(id => findBlock(id).block.catalogo, legacyId), 'valor previo');
  assert.deepEqual(errors, []);
});

test('a failed local drawing load reports the error and leaves the slide untouched', {timeout:120000}, async t => {
  const app = await start(t, Number(process.env.ERLEN_CATALOGO_ERROR_TEST_PORT || 4272));
  if (!app) return;
  const {page, errors} = app;
  let blockLoads = true;
  await page.route('**/figures-catalog/assets/chunks/*.mjs*', route => blockLoads ? route.abort() : route.continue());
  await page.locator('#lienzoCatalogoBtn').click();
  const dialog = page.getByRole('dialog', {name:'Catálogo científico'});
  await dialog.getByRole('searchbox', {name:'Buscar figuras'}).fill('mitocondria');
  await dialog.getByRole('button', {name:'Mitocondria Biología · Servier', exact:true}).click();
  await dialog.getByRole('status').filter({hasText:/No se pudo cargar/}).waitFor();
  assert.equal(await dialog.getByRole('button', {name:'Añadir al lienzo'}).isDisabled(), true);
  assert.equal(await page.evaluate(() => curSlide().blocks.length), 0);
  blockLoads = false;
  await dialog.getByRole('button', {name:'Mitocondria Biología · Servier', exact:true}).click();
  await dialog.getByRole('img', {name:'Mitocondria'}).waitFor();
  assert.equal(await dialog.getByRole('button', {name:'Añadir al lienzo'}).isEnabled(), true);
  assert.deepEqual(errors, []);
});

test('changing slides while a drawing loads never inserts it into another slide', {timeout:120000}, async t => {
  const app = await start(t, Number(process.env.ERLEN_CATALOGO_STALE_TEST_PORT || 4273));
  if (!app) return;
  const {page, errors} = app;
  let requested, release;
  const received = new Promise(resolve => { requested = resolve; });
  const waiting = new Promise(resolve => { release = resolve; });
  t.after(() => release());
  await page.route('**/figures-catalog/assets/chunks/*.mjs', async route => {
    requested();
    await waiting;
    await route.continue();
  });
  await page.locator('#lienzoCatalogoBtn').click();
  const dialog = page.getByRole('dialog', {name:'Catálogo científico'});
  await dialog.getByRole('searchbox', {name:'Buscar figuras'}).fill('mitocondria');
  await dialog.getByRole('button', {name:'Mitocondria Biología · Servier', exact:true}).click();
  await received;
  await page.evaluate(() => { S.cur = 0; S.selBlock = null; renderAll(); });
  release();
  await dialog.getByRole('status').filter({hasText:/La diapositiva cambió/}).waitFor();
  assert.equal(await dialog.getByRole('button', {name:'Añadir al lienzo'}).isDisabled(), true);
  assert.deepEqual(await page.evaluate(() => S.deck.slides.map(slide => zonas(slide).flat().length)), [0, 0]);
  assert.deepEqual(errors, []);
});

test('a pending catalog load never replaces a newer dialog', {timeout:120000}, async t => {
  const app = await start(t, Number(process.env.ERLEN_CATALOGO_MODAL_TEST_PORT || 4274));
  if (!app) return;
  const {page, errors} = app;
  let requested, release;
  const received = new Promise(resolve => { requested = resolve; });
  const waiting = new Promise(resolve => { release = resolve; });
  t.after(() => release());
  await page.route('**/figures-catalog/index.mjs', async route => {
    requested(); await waiting; await route.continue();
  });
  await page.locator('#lienzoCatalogoBtn').click();
  await received;
  await page.evaluate(() => openPdfHelp());
  const pdf = page.getByRole('dialog', {name:'Exportar a PDF'});
  await pdf.waitFor();
  release();
  await page.evaluate(async () => { await EXT_SLIDES.get('catalogo'); });
  assert.equal(await pdf.isVisible(), true);
  assert.equal(await page.getByRole('dialog', {name:'Catálogo científico'}).count(), 0);
  assert.deepEqual(errors, []);
});

test('a damaged SVG reports a PowerPoint export failure instead of disappearing', {timeout:120000}, async t => {
  const app = await start(t, Number(process.env.ERLEN_CATALOGO_CORRUPT_TEST_PORT || 4275));
  if (!app) return;
  const {page, errors} = app;
  await page.evaluate(() => {
    const block = Object.assign(newBlock('image'), {src:'data:image/svg+xml,%3Csvg%3Ebroken', alt:'Figura dañada'});
    curSlide().blocks.push(block); commit();
  });
  await page.evaluate(() => exportPPTX());
  assert.match(await page.locator('#toasts').textContent(), /No se pudo.*PowerPoint/i);
  assert.deepEqual(errors, []);
});
