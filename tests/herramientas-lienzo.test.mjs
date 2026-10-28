/* SPDX-License-Identifier: AGPL-3.0-only */
import test from 'node:test';
import assert from 'node:assert/strict';
import {editor} from '../herramientas/test-browser.mjs';

async function prepara(t) {
  const app = await editor();
  t.after(() => app.dom.window.close());
  app.run(`wsNueva(); addSlide('twocol');
    curSlide().lienzoLibre = true;
    curSlide().blocks = [
      {id:'a',type:'text',text:'A',posLibre:{x:10,y:20,w:20,h:20}},
      {id:'b',type:'text',text:'B',posLibre:{x:50,y:40,w:20,h:20}}
    ];
    curSlide().blocks2 = [{id:'c',type:'chart',kind:'linea',data:'x,y\\n1,2',fuente:{nombre:'fuente.csv'},posLibre:{x:30,y:20,w:20,h:20}}];
    snapNow(); renderAll();`);
  return app;
}
const valor = (run, expression) => JSON.parse(run('JSON.stringify(' + expression + ')'));

test('layer order crosses zones, survives duplication and validation, and can be undone', async t => {
  const {run} = await prepara(t);
  const fuente = run("JSON.stringify(curSlide().blocks2[0].fuente)");
  const orden = () => valor(run, "Array.from(renderSlide(S.deck,S.cur,'present',0).querySelectorAll('.lienzo-capa .blk[data-bid]')).map(el=>el.dataset.bid)");
  assert.deepEqual(orden(), ['a','b','c']);
  assert.equal(run("mueveCapaLibre(S.deck,curSlide(),'a','frente')"), true);
  assert.deepEqual(orden(), ['b','c','a']);
  assert.equal(run("JSON.stringify(curSlide().blocks2[0].fuente)"), fuente);
  run('doUndo()'); assert.deepEqual(orden(), ['a','b','c']);
  run('doRedo()'); assert.deepEqual(orden(), ['b','c','a']);
  run('dupSlide(S.cur)');
  const ordenCopia = valor(run, "Array.from(renderSlide(S.deck,S.cur,'present',0).querySelectorAll('.lienzo-capa .blk[data-bid]')).map(el=>findBlock(el.dataset.bid).block.type==='chart'?'C':findBlock(el.dataset.bid).block.text)");
  assert.deepEqual(ordenCopia, ['B','C','A']);
  const reabierto = valor(run, "(()=>{const d=saneaDeck(JSON.parse(JSON.stringify(S.deck))).deck;return Array.from(renderSlide(d,S.cur,'export',99).querySelectorAll('.lienzo-capa .blk[data-bid]')).map(el=>findBlock(el.dataset.bid,d).block.type==='chart'?'C':findBlock(el.dataset.bid,d).block.text)})()");
  assert.deepEqual(reabierto, ['B','C','A']);
});

test('a full-bleed figure remains behind text even when its source block comes later', async t => {
  const {run} = await prepara(t);
  run(`const sl=curSlide(); sl.layout='sangre'; sl.blocks=[
    {id:'text-before',type:'text',text:'Título',posLibre:{x:5,y:70,w:80,h:20}},
    {id:'image-after',type:'image',src:'',posLibre:{x:0,y:0,w:100,h:100}}
  ]; sl.blocks2=[];`);
  assert.deepEqual(valor(run, "Array.from(renderSlide(S.deck,S.cur,'present',0).querySelectorAll('.lienzo-capa .blk[data-bid]')).map(el=>el.dataset.bid)"), ['image-after','text-before']);
});

test('keyboard moves all selected free blocks together in one undoable step', async t => {
  const {run} = await prepara(t);
  run("selectBlock('a'); selectBlock('b',true); document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}))");
  assert.deepEqual(valor(run, "[findBlock('a').block.posLibre.x,findBlock('b').block.posLibre.x]"), [11,51]);
  run('doUndo()');
  assert.deepEqual(valor(run, "[findBlock('a').block.posLibre.x,findBlock('b').block.posLibre.x]"), [10,50]);
});

test('adding a block replaces a previous multi-selection with the new active block', async t => {
  const {run} = await prepara(t);
  run("selectBlock('a');selectBlock('b',true);addBlockToSlide('text',1)");
  const id=run('S.selBlock');
  assert.deepEqual(valor(run,'[...idsSeleccionados()]'),[id]);
  assert.equal(run("document.querySelectorAll('#stageInner .sel-lote').length"),1);
  assert.equal(run("document.querySelectorAll('#stageInner .libre-asa').length"),4);
});

test('a locked member prevents a multi-block keyboard move', async t => {
  const {run} = await prepara(t);
  run("findBlock('b').block.locked=true; snapNow(); renderAll(); selectBlock('b'); selectBlock('a',true)");
  const antes = run('JSON.stringify(S.deck)');
  run("document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}))");
  assert.equal(run('JSON.stringify(S.deck)'), antes);
});

test('Delete removes the selected blocks together and undo restores them', async t => {
  const {run} = await prepara(t);
  run("selectBlock('a');selectBlock('b',true);document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'Delete',bubbles:true}))");
  assert.deepEqual(valor(run, 'zonas(curSlide()).flat().map(b=>b.id)'), ['c']);
  run('doUndo()');
  assert.deepEqual(valor(run, 'zonas(curSlide()).flat().map(b=>b.id)'), ['a','b','c']);
  assert.equal(run("findBlock('c').block.fuente.nombre"), 'fuente.csv');
});

test('Delete does not partially remove a selection containing a locked block', async t => {
  const {run} = await prepara(t);
  run("findBlock('b').block.locked=true;snapNow();renderAll();selectBlock('b');selectBlock('a',true)");
  const antes = run('JSON.stringify(S.deck)');
  run("document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'Delete',bubbles:true}))");
  assert.equal(run('JSON.stringify(S.deck)'), antes);
});

test('moving a selection stops at the slide edge without compressing it', async t => {
  const {run} = await prepara(t);
  assert.equal(run("mueveSeleccionLibre(S.deck,curSlide(),['a','b'],80,70)"), true);
  assert.deepEqual(valor(run, "[findBlock('a').block.posLibre,findBlock('b').block.posLibre]"), [
    {x:40,y:60,w:20,h:20}, {x:80,y:80,w:20,h:20}
  ]);
  run('doUndo()');
  assert.deepEqual(valor(run, "[findBlock('a').block.posLibre.x,findBlock('b').block.posLibre.x]"), [10,50]);
});

test('moving imported fractional geometry at the edge keeps every position valid', async t => {
  const {run} = await prepara(t);
  run("findBlock('a').block.posLibre={x:0.004,y:20,w:20,h:20};findBlock('b').block.posLibre={x:80,y:40,w:19.994,h:20};snapNow()");
  assert.equal(run("mueveSeleccionLibre(S.deck,curSlide(),['a','b'],1,0)"),true);
  const [a,b] = valor(run,"[findBlock('a').block.posLibre,findBlock('b').block.posLibre]");
  assert.ok(Math.abs((b.x-a.x)-(80-0.004))<1e-8,JSON.stringify({a,b}));
  assert.ok(a.x>=0 && b.x+b.w<=100,JSON.stringify({a,b}));
  assert.ok(Math.abs(b.x-80.006)<1e-8,JSON.stringify({a,b}));
});

test('layer moves reject locked or stale blocks and invalid layer data is cleaned on import', async t => {
  const {run} = await prepara(t);
  run("findBlock('a').block.locked=true; snapNow(); window.__slide=curSlide(); window.__deck=S.deck");
  const antes = run('JSON.stringify(S.deck)');
  assert.equal(run("mueveCapaLibre(__deck,__slide,'a','frente')"), false);
  assert.equal(run('JSON.stringify(S.deck)'), antes);
  run("findBlock('b').block.capaLibre='mal'; window.__validado=saneaDeck(S.deck)");
  assert.equal(run("__validado.deck.slides[1].blocks[1].capaLibre"), undefined);
  assert.match(run("__validado.avisos.join(' ')").toLowerCase(), /capas/);
  run("loadDeck(blankDeck(),null)");
  assert.equal(run("mueveCapaLibre(__deck,__slide,'b','frente')"), false);
});

test('smart guides snap a moved edge using screen-pixel tolerance', async t => {
  const {run} = await prepara(t);
  run("findBlock('c').block.posLibre.x=75");
  const snap = valor(run, "imantaMovimientoLibre(curSlide(),['a'],{x:10,y:20,w:20,h:20},19.5,0,1000,700)");
  assert.equal(snap.dx, 20);
  assert.equal(snap.guias.x, 50);
  const lejos = valor(run, "imantaMovimientoLibre(curSlide(),['a'],{x:10,y:20,w:20,h:20},18,0,1000,700)");
  assert.equal(lejos.dx, 18);
  const conZoom = valor(run, "imantaMovimientoLibre(curSlide(),['a'],{x:10,y:20,w:20,h:20},19,0,400,700)");
  assert.equal(conZoom.dx, 20);
  const masGrande = valor(run, "imantaMovimientoLibre(curSlide(),['a'],{x:10,y:20,w:20,h:20},19,0,2000,700)");
  assert.equal(masGrande.dx, 19);
  run("findBlock('b').block.posLibre.y=62;findBlock('c').block.posLibre.y=75");
  const vertical = valor(run, "imantaMovimientoLibre(curSlide(),['a'],{x:10,y:20,w:20,h:20},0,21.6,1000,700)");
  assert.equal(vertical.dy,22);
  assert.equal(vertical.guias.y,62);
});

test('alignment guides do not snap to a block hidden at the current presentation level', async t => {
  const {run} = await prepara(t);
  run("findBlock('c').block.posLibre.x=35;findBlock('c').block.nivel='comite';S.deck.meta.nivel='congreso'");
  const ajuste = valor(run, "imantaMovimientoLibre(curSlide(),['a'],{x:10,y:20,w:20,h:20},4.6,0,1000,700)");
  assert.equal(ajuste.dx, 4.6);
  assert.equal(ajuste.guias.x, null);
});

test('a block that becomes hidden is removed from the moving selection', async t => {
  const {run} = await prepara(t);
  run("selectBlock('a');selectBlock('c',true);findBlock('c').block.nivel='comite';S.deck.meta.nivel='congreso';renderAll()");
  assert.deepEqual(valor(run, '[...idsSeleccionados()]'), ['a']);
  const x = run("findBlock('c').block.posLibre.x");
  run("selectBlock('a');document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}))");
  assert.equal(run("findBlock('c').block.posLibre.x"), x);
});
