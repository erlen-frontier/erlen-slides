import test from 'node:test';
import assert from 'node:assert/strict';
import {editor} from '../herramientas/test-browser.mjs';

test('the slide overview moves a slide with buttons and supports undo without changing its data', async t => {
  const app = await editor();
  t.after(() => app.dom.window.close());
  app.run("wsNueva();addSlide('content');curSlide().title='Segunda';curSlide().notes='Notas privadas';addBlockToSlide('chart',1);closeModal();findBlock(S.selBlock).block.data='1,2\\n3,4';commit();window.__slide=curSlide().id;abreClasificador();");
  const d = app.dom.window.document;
  const button = d.querySelector('[aria-label="Mover antes: diapositiva actual"]');
  assert.ok(button);
  assert.equal(d.querySelector('.cl-cel .cl-clip').getAttribute('aria-hidden'), 'true');
  assert.equal(d.querySelector('.cl-cel .cl-pie').getAttribute('aria-hidden'), 'true');
  button.click();
  assert.equal(app.run('S.cur'), 0);
  assert.equal(app.run('S.deck.slides[0].id'), app.run('__slide'));
  assert.equal(app.run('S.deck.slides[0].notes'), 'Notas privadas');
  assert.equal(app.run('zonas(S.deck.slides[0]).flat()[0].data'), '1,2\n3,4');
  assert.equal(app.run('findBlock(S.selBlock).slide'), app.run('curSlide()'));
  assert.match(d.querySelector('.cl-estado').textContent, /posición 1 de 2/);
  app.run('cierraClasificador();doUndo()');
  assert.equal(app.run('S.deck.slides[1].id'), app.run('__slide'));
});

test('Alt and arrow keys move a slide, respect boundaries and keep focus', async t => {
  const app = await editor();
  t.after(() => app.dom.window.close());
  app.run("wsNueva();addSlide('content');addSlide('content');S.cur=1;window.__slide=curSlide().id;abreClasificador();");
  const d = app.dom.window.document;
  d.querySelector('.cl-cel.actual').focus();
  app.dom.window.dispatchEvent(new app.dom.window.KeyboardEvent('keydown', {key:'ArrowRight', altKey:true, bubbles:true}));
  assert.equal(app.run('S.cur'), 2);
  assert.equal(app.run('curSlide().id'), app.run('__slide'));
  assert.equal(d.activeElement, d.querySelector('.cl-cel.actual'));
  assert.equal(d.querySelector('[aria-label="Mover después: diapositiva actual"]').disabled, true);
});

test('multiple marked slides cannot be accidentally reordered as one', async t => {
  const app = await editor();
  t.after(() => app.dom.window.close());
  app.run("wsNueva();addSlide('content');addSlide('content');S.cur=1;abreClasificador();S.sel.add(0);S.sel.add(1);CL.pinta();window.__before=JSON.stringify(S.deck.slides.map(s=>s.id));");
  const d = app.dom.window.document;
  assert.equal(d.querySelector('[aria-label="Mover antes: diapositiva actual"]').disabled, true);
  assert.equal(d.querySelector('.cl-cel').getAttribute('draggable'), 'false');
  app.dom.window.dispatchEvent(new app.dom.window.KeyboardEvent('keydown', {key:'ArrowLeft', altKey:true, bubbles:true}));
  assert.equal(app.run('JSON.stringify(S.deck.slides.map(s=>s.id))'), app.run('__before'));
});

test('a single remaining mark can be cleared before moving a slide', async t => {
  const app = await editor();
  t.after(() => app.dom.window.close());
  app.run("wsNueva();addSlide('content');addSlide('content');S.cur=1;abreClasificador();");
  const d = app.dom.window.document;
  const ctrlClick = index => d.querySelector(`.cl-cel[data-i="${index}"]`).dispatchEvent(new app.dom.window.MouseEvent('click', {bubbles:true, ctrlKey:true}));
  ctrlClick(2); ctrlClick(1);
  assert.equal(app.run('S.sel.size'), 1);
  assert.equal(d.querySelector('[aria-label="Mover antes: diapositiva actual"]').disabled, true);
  const clear = [...d.querySelectorAll('.cl-acc button')].find(b => b.textContent === 'Quitar la marca');
  assert.ok(clear);
  clear.click();
  assert.equal(app.run('S.sel.size'), 0);
  assert.equal(d.querySelector('[aria-label="Mover antes: diapositiva actual"]').disabled, false);
});

test('keyboard navigation clears the block selected on the previous slide', async t => {
  const app = await editor();
  t.after(() => app.dom.window.close());
  app.run("wsNueva();addSlide('content');addBlockToSlide('text',1);window.__block=S.selBlock;window.__i=S.cur;addSlide('content');S.cur=__i;S.selBlock=__block;abreClasificador();");
  app.dom.window.dispatchEvent(new app.dom.window.KeyboardEvent('keydown', {key:'ArrowRight', bubbles:true}));
  assert.equal(app.run('S.cur'), app.run('__i + 1'));
  assert.equal(app.run('S.selBlock'), null);
  app.dom.window.dispatchEvent(new app.dom.window.KeyboardEvent('keydown', {key:'ArrowLeft', altKey:true, bubbles:true}));
  app.run('cierraClasificador()');
  assert.equal(app.run('comandosPaleta().some(c=>c.n === "Por pasos" && (c.sub || "").includes("Bloque"))'), false);
  assert.notEqual(app.run('findBlock(__block).block.step'), true);
});

test('dragging a different slide clears the previous slide block selection', async t => {
  const app = await editor();
  t.after(() => app.dom.window.close());
  app.run("wsNueva();addSlide('content');addBlockToSlide('text',1);window.__block=S.selBlock;window.__i=S.cur;addSlide('content');S.cur=__i;S.selBlock=__block;abreClasificador();");
  const w = app.dom.window, d = w.document;
  const start = new w.Event('dragstart', {bubbles:true, cancelable:true});
  Object.defineProperty(start, 'dataTransfer', {value:{effectAllowed:''}});
  const i = app.run('__i');
  d.querySelector(`.cl-cel[data-i="${i + 1}"]`).dispatchEvent(start);
  const target = d.querySelector(`.cl-cel[data-i="${i}"]`);
  target.classList.add('antes');
  target.dispatchEvent(new w.Event('drop', {bubbles:true, cancelable:true}));
  assert.equal(app.run('S.cur'), i);
  assert.equal(app.run('S.selBlock'), null);
  assert.equal(app.run('findBlock(__block).slide === curSlide()'), false);
});

test('opening the overview commits an in-progress title before changing slides', async t => {
  const app = await editor();
  t.after(() => app.dom.window.close());
  app.run("wsNueva();addSlide('content');renderAll();window.__title=document.querySelector('#stageInner [data-ek=\"slide.title\"]');enterRaw(__title);__title.innerText='Título pendiente';abreClasificador();");
  assert.equal(app.run('S.deck.slides[1].title'), 'Título pendiente');
  app.dom.window.dispatchEvent(new app.dom.window.KeyboardEvent('keydown', {key:'ArrowLeft', bubbles:true}));
  assert.notEqual(app.run('S.deck.slides[0].title'), 'Título pendiente');
});
