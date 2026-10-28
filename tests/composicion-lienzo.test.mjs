/* SPDX-License-Identifier: AGPL-3.0-only */
import test from 'node:test';
import assert from 'node:assert/strict';
import {editor} from '../herramientas/test-browser.mjs';
import * as figuras from '../src/figuras-core.mjs';

async function prepara(t) {
  const app = await editor();
  t.after(() => app.dom.window.close());
  app.run(`wsNueva(); addSlide('blanco');
    curSlide().lienzoLibre = true;
    curSlide().blocks = [
      {id:'a',type:'text',text:'A',posLibre:{x:10,y:20,w:20,h:20}},
      {id:'b',type:'chart',kind:'linea',data:'x,y\\n1,2',fuente:{nombre:'fuente.csv'},posLibre:{x:50,y:40,w:20,h:20}},
      {id:'c',type:'text',text:'C',posLibre:{x:30,y:70,w:10,h:10}}
    ]; snapNow(); renderAll();`);
  return app;
}
const valor = (run, expression) => JSON.parse(run('JSON.stringify(' + expression + ')'));

test('scaling a selection preserves its relative placement and scientific source, and undoes together', async t => {
  const {run} = await prepara(t);
  const ejecuta = "typeof escalaSeleccionLibre === 'function' && escalaSeleccionLibre(S.deck,curSlide(),['a','b'],'se',1.5)";
  assert.equal(run(ejecuta), true);
  assert.deepEqual(valor(run, "[findBlock('a').block.posLibre,findBlock('b').block.posLibre]"), [
    {x:10,y:20,w:30,h:30}, {x:70,y:50,w:30,h:30}
  ]);
  assert.equal(run("findBlock('b').block.fuente.nombre"), 'fuente.csv');
  run('doUndo()');
  assert.deepEqual(valor(run, "[findBlock('a').block.posLibre,findBlock('b').block.posLibre]"), [
    {x:10,y:20,w:20,h:20}, {x:50,y:40,w:20,h:20}
  ]);
});

test('scaling from the opposite corner respects minimum sizes and slide limits', async t => {
  const {run} = await prepara(t);
  assert.equal(run("typeof escalaSeleccionLibre === 'function' && escalaSeleccionLibre(S.deck,curSlide(),['a','b'],'nw',0.5)"), true);
  assert.deepEqual(valor(run, "[findBlock('a').block.posLibre,findBlock('b').block.posLibre]"), [
    {x:40,y:40,w:10,h:10}, {x:60,y:50,w:10,h:10}
  ]);
  run('doUndo()');
  assert.equal(run("escalaSeleccionLibre(S.deck,curSlide(),['a','b'],'se',100)"), true);
  assert.deepEqual(valor(run, "[findBlock('a').block.posLibre,findBlock('b').block.posLibre]"), [
    {x:10,y:20,w:30,h:30}, {x:70,y:50,w:30,h:30}
  ]);
  run('doUndo()');
  assert.equal(run("escalaSeleccionLibre(S.deck,curSlide(),['a','b'],'nw',0)"), true);
  const posiciones = valor(run, "[findBlock('a').block.posLibre,findBlock('b').block.posLibre]");
  assert.ok(posiciones.every(p => p.w >= 1 && p.h >= 1 && p.x >= 0 && p.y >= 0 && p.x+p.w <= 100 && p.y+p.h <= 100));
});

test('scaling rejects a locked, hidden, missing or stale member without changing anything', async t => {
  const {run} = await prepara(t);
  const existe = run("typeof escalaSeleccionLibre === 'function'"); assert.equal(existe, true);
  run("findBlock('b').block.locked=true; snapNow(); window.__deck=S.deck; window.__slide=curSlide()");
  let antes = run('JSON.stringify(S.deck)');
  assert.equal(run("escalaSeleccionLibre(__deck,__slide,['a','b'],'se',1.2)"), false);
  assert.equal(run('JSON.stringify(S.deck)'), antes);
  run("delete findBlock('b').block.locked;findBlock('b').block.nivel='comite';S.deck.meta.nivel='congreso';snapNow()");
  antes = run('JSON.stringify(S.deck)');
  assert.equal(run("escalaSeleccionLibre(__deck,__slide,['a','b'],'se',1.2)"), false);
  assert.equal(run("escalaSeleccionLibre(__deck,__slide,['a','missing'],'se',1.2)"), false);
  assert.equal(run('JSON.stringify(S.deck)'), antes);
  run('loadDeck(blankDeck(),null)');
  assert.equal(run("escalaSeleccionLibre(__deck,__slide,['a','b'],'se',1.2)"), false);
});

test('a no-op scale leaves imported fractional coordinates and undo history untouched', async t => {
  const {run} = await prepara(t);
  run("findBlock('a').block.posLibre.x=10.004;snapNow()");
  const antes=run('JSON.stringify(S.deck)'), historia=run('S.undo.length');
  assert.equal(run("escalaSeleccionLibre(S.deck,curSlide(),['a','b'],'se',1)"),false);
  assert.equal(run('JSON.stringify(S.deck)'),antes);assert.equal(run('S.undo.length'),historia);
});

test('aligning centers changes positions rather than contents and undoes in one step', async t => {
  const {run} = await prepara(t);
  const ejecuta = "typeof organizaSeleccionLibre === 'function' && organizaSeleccionLibre(S.deck,curSlide(),['a','b','c'],'centro')";
  assert.equal(run(ejecuta), true);
  assert.deepEqual(valor(run, "['a','b','c'].map(id=>findBlock(id).block.posLibre.x)"), [30,30,35]);
  assert.deepEqual(valor(run, "['a','b','c'].map(id=>findBlock(id).block.posLibre.y)"), [20,40,70]);
  assert.equal(run("findBlock('b').block.fuente.nombre"), 'fuente.csv');
  run('doUndo()');
  assert.deepEqual(valor(run, "['a','b','c'].map(id=>findBlock(id).block.posLibre.x)"), [10,50,30]);
});

test('aligning already centered fractional boxes makes no change', async t => {
  const {run} = await prepara(t);
  run("findBlock('a').block.posLibre.x=10.004;findBlock('b').block.posLibre.x=10.004;snapNow()");
  const antes=run('JSON.stringify(S.deck)');
  assert.equal(run("organizaSeleccionLibre(S.deck,curSlide(),['a','b'],'centro')"),false);
  assert.equal(run('JSON.stringify(S.deck)'),antes);
});

test('distribution makes equal spaces while preserving end objects and sizes', async t => {
  const {run} = await prepara(t);
  assert.equal(run("typeof organizaSeleccionLibre === 'function' && organizaSeleccionLibre(S.deck,curSlide(),['a','b','c'],'distribuir-h')"), true);
  assert.deepEqual(valor(run, "['a','c','b'].map(id=>findBlock(id).block.posLibre.x)"), [10,35,50]);
  run('doUndo()');
  assert.equal(run("organizaSeleccionLibre(S.deck,curSlide(),['a','b','c'],'distribuir-v')"), true);
  assert.deepEqual(valor(run, "['a','b','c'].map(id=>findBlock(id).block.posLibre.y)"), [20,45,70]);
  assert.deepEqual(valor(run, "['a','b','c'].map(id=>findBlock(id).block.posLibre.h)"), [20,20,10]);
});

test('distribution preserves fractional positions of both end blocks', async t => {
  const {run} = await prepara(t);
  run("findBlock('a').block.posLibre.x=10.004;findBlock('b').block.posLibre.x=50.006;snapNow()");
  assert.equal(run("organizaSeleccionLibre(S.deck,curSlide(),['a','b','c'],'distribuir-h')"),true);
  assert.equal(run("findBlock('a').block.posLibre.x"),10.004);
  assert.equal(run("findBlock('b').block.posLibre.x"),50.006);
});

test('alignment and distribution cannot partially change locked or incomplete selections', async t => {
  const {run} = await prepara(t);
  assert.equal(run("typeof organizaSeleccionLibre === 'function'"), true);
  run("findBlock('b').block.locked=true;snapNow()");
  const antes = run('JSON.stringify(S.deck)');
  assert.equal(run("organizaSeleccionLibre(S.deck,curSlide(),['a','b','c'],'izquierda')"), false);
  assert.equal(run("organizaSeleccionLibre(S.deck,curSlide(),['a','missing'],'izquierda')"), false);
  assert.equal(run("organizaSeleccionLibre(S.deck,curSlide(),['a','c'],'distribuir-h')"), false);
  assert.equal(run('JSON.stringify(S.deck)'), antes);
});

test('a shape is not inserted if the slide stops accepting blocks while its library loads', async t => {
  const app = await prepara(t);app.dom.window.__figuras = figuras;
  const pendiente = app.run("window.__espera=new Promise(resolve=>window.__termina=resolve);extensionSlides=()=>__espera;insertaFormaLibre('rect')");
  app.run("curSlide().layout='title';window.__termina(window.__figuras)");
  assert.equal(await pendiente,false);
  assert.equal(app.run("curSlide().blocks.some(b=>b.formaLibre)"),false);
});
