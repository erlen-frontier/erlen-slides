/* SPDX-License-Identifier: AGPL-3.0-only */
import test from 'node:test';
import assert from 'node:assert/strict';
import {editor} from '../herramientas/test-browser.mjs';

async function prepara(t) {
  const app = await editor(); t.after(() => app.dom.window.close());
  app.run(`wsNueva(); addSlide('blanco'); curSlide().lienzoLibre = true;
    const b = newBlock('image'); Object.assign(b,{id:'figura',alt:'Figura ilustrativa',
      src:'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="50"%3E%3Crect width="30" height="50" fill="red"/%3E%3C/svg%3E',
      catalogo:{id:'pieza-ilustrativa',author:'Autor de ejemplo',license:'CC-BY-3.0'},
      posLibre:{x:10,y:20,w:40,h:20}});
    curSlide().blocks.push(b); snapNow(); renderAll(); selectBlock('figura');`);
  return app;
}
const json = (run, expr) => JSON.parse(run('JSON.stringify(' + expr + ')'));

test('figure orientation is undoable and survives JSON without changing the source', async t => {
  const {run, errors} = await prepara(t), original = run("findBlock('figura').block.src");
  assert.equal(run('typeof aplicaTransformacionLibre'), 'function');
  assert.equal(run("aplicaTransformacionLibre(S.deck,curSlide(),'figura',{giro:45,voltearH:true,voltearV:false})"), true);
  assert.deepEqual(json(run,"findBlock('figura').block.transformacionLibre"),{giro:45,voltearH:true,voltearV:false});
  assert.match(run("renderSlide(S.deck,S.cur,'present',0).querySelector('.imgwrap').style.transform"), /rotate\(45deg\).*scaleX\(-1\)/);
  const restored=json(run,"saneaDeck(JSON.parse(JSON.stringify(S.deck))).deck.slides[1].blocks[0]");
  assert.equal(restored.src,original); assert.equal(restored.catalogo.author,'Autor de ejemplo');
  assert.deepEqual(restored.transformacionLibre,{giro:45,voltearH:true,voltearV:false});
  run('doUndo()'); assert.equal(run("findBlock('figura').block.transformacionLibre"),undefined);
  run('doRedo()'); assert.equal(run("findBlock('figura').block.transformacionLibre.giro"),45);
  assert.deepEqual(errors, []);
});

test('a rotated scientific image keeps the connector attached to the block box', async t => {
  const {run,errors} = await prepara(t);
  run(`const b=newBlock('text');Object.assign(b,{id:'destino',text:'Destino',posLibre:{x:70,y:50,w:20,h:20}});
    curSlide().blocks.push(b);curSlide().conectores=[{desde:'figura',hasta:'destino'}];snapNow()`);
  const coordenadas=()=>json(run,`(()=>{const line=renderSlide(S.deck,S.cur,'export',99).querySelector('.lienzo-conectores line');
    return ['x1','y1','x2','y2'].map(k=>+line.getAttribute(k));})()`);
  const antes=coordenadas(), source=run("findBlock('figura').block.src");
  run("aplicaTransformacionLibre(S.deck,curSlide(),'figura',{giro:90,voltearH:false,voltearV:false})");
  assert.deepEqual(coordenadas(),antes);
  assert.equal(run("findBlock('figura').block.src"),source);
  assert.deepEqual(errors,[]);
});

test('aspect lock keeps both dimensions in proportion for keyboard and numeric changes', async t => {
  const {run,dom,errors} = await prepara(t);
  run("findBlock('figura').block.bloqueaProporcion=true; snapNow(); renderAll(); selectBlock('figura')");
  run("document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',shiftKey:true,bubbles:true}))");
  let p=json(run,"findBlock('figura').block.posLibre");
  assert.ok(Math.abs(p.w / p.h - 2) < .002, JSON.stringify(p));
  run("doUndo(); ponDisposicion('lado'); selectBlock('figura'); S.tab='bloque'; renderInspector()");
  const width=dom.window.document.querySelector('#inspBody input[aria-label="Anchura (%)"]');
  assert.ok(width); width.value='50'; width.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
  p=json(run,"findBlock('figura').block.posLibre");
  assert.deepEqual(p,{x:10,y:20,w:50,h:25});
  run('doUndo()'); assert.deepEqual(json(run,"findBlock('figura').block.posLibre"),{x:10,y:20,w:40,h:20});
  assert.deepEqual(errors, []);
});

test('locked or stale figures and malformed orientation cannot change valid source data', async t => {
  const {run,errors} = await prepara(t);
  assert.equal(run('typeof aplicaTransformacionLibre'), 'function');
  run("window.__deck=S.deck; window.__slide=curSlide(); findBlock('figura').block.locked=true");
  const before=run('JSON.stringify(S.deck)');
  assert.equal(run("aplicaTransformacionLibre(__deck,__slide,'figura',{giro:90,voltearH:false,voltearV:false})"),false);
  assert.equal(run('JSON.stringify(S.deck)'),before);
  run("findBlock('figura').block.locked=false");
  assert.equal(run("aplicaTransformacionLibre(__deck,__slide,'figura',{giro:Infinity,voltearH:false,voltearV:false})"),false);
  run('wsNueva()');
  assert.equal(run("aplicaTransformacionLibre(__deck,__slide,'figura',{giro:90,voltearH:false,voltearV:false})"),false);
  assert.deepEqual(errors, []);
});

test('invalid imported transforms are removed without changing images or unknown project fields', async t => {
  const {run,errors} = await prepara(t), source=run("findBlock('figura').block.src");
  run("findBlock('figura').block.transformacionLibre={giro:'90',voltearH:'true',voltearV:false};findBlock('figura').block.campoAjeno={valor:'conservar'}");
  const cleaned=json(run,'saneaDeck(JSON.parse(JSON.stringify(S.deck)))');
  assert.equal(cleaned.deck.slides[1].blocks[0].src,source);
  assert.deepEqual(cleaned.deck.slides[1].blocks[0].campoAjeno,{valor:'conservar'});
  assert.equal(cleaned.deck.slides[1].blocks[0].transformacionLibre,undefined);
  assert.match(cleaned.avisos.join(' '),/transformación inválida/i);
  assert.deepEqual(errors,[]);
});

test('proportional scaling respects slide edges and leaves a locked selection unchanged', async t => {
  const {run,errors} = await prepara(t);
  run("findBlock('figura').block.posLibre={x:80,y:70,w:20,h:20};findBlock('figura').block.bloqueaProporcion=true;snapNow();renderAll();selectBlock('figura')");
  run("document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',shiftKey:true,bubbles:true}))");
  assert.deepEqual(json(run,"findBlock('figura').block.posLibre"),{x:80,y:70,w:20,h:20});
  run("findBlock('figura').block.locked=true;snapNow();renderAll();selectBlock('figura')");
  const before=run('JSON.stringify(S.deck)');
  assert.equal(run("cambiaProporcionLibre(S.deck,curSlide(),'figura',false)"),false);
  assert.equal(run('JSON.stringify(S.deck)'),before);
  assert.deepEqual(errors,[]);
});

test('all four resize corners keep the opposite corner and the aspect ratio', async t => {
  const {run,errors} = await prepara(t);
  const original={x:30,y:30,w:20,h:10};
  for (const corner of ['nw','ne','sw','se']) {
    const p=json(run,`calculaEscalaLibre([${JSON.stringify(original)}],'${corner}',1.5)[0]`);
    assert.equal(p.w/p.h,2);
    assert.equal(corner.includes('e') ? p.x : p.x+p.w,corner.includes('e') ? original.x : original.x+original.w);
    assert.equal(corner.includes('s') ? p.y : p.y+p.h,corner.includes('s') ? original.y : original.y+original.h);
  }
  assert.deepEqual(errors,[]);
});

test('precise single-object controls cannot change a multiple selection', async t => {
  const {run,dom,errors} = await prepara(t);
  run("const otro=newBlock('text'); otro.id='otro';curSlide().blocks.push(otro);selectBlock('figura');idsSeleccionados().add('otro');ponDisposicion('lado');S.tab='bloque';renderInspector()");
  const width=dom.window.document.querySelector('#inspBody input[aria-label="Anchura (%)"]');
  assert.ok(width.disabled);
  const before=run("JSON.stringify(findBlock('figura').block.posLibre)");
  width.value='50';width.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
  assert.equal(run("JSON.stringify(findBlock('figura').block.posLibre)"),before);
  assert.deepEqual(errors,[]);
});

test('Beamer retains a figure rotation and reflection without changing its source', async t => {
  const {run,errors} = await prepara(t), source=run("findBlock('figura').block.src");
  run("aplicaTransformacionLibre(S.deck,curSlide(),'figura',{giro:45,voltearH:true,voltearV:false})");
  const tex=run('toBeamer(S.deck)');
  assert.match(tex,/\\rotatebox\[origin=c\]\{-45\}\{\\scalebox\{-1\}\[1\]\{/);
  assert.equal(run("findBlock('figura').block.src"),source);
  assert.deepEqual(errors,[]);
});

test('Beamer keeps orientation and annotations on full-bleed figures', async t => {
  const {run,errors} = await prepara(t);
  run("curSlide().layout='sangre';const b=findBlock('figura').block;b.marcas=[{t:'rect',x:.1,y:.2,w:.3,h:.2}];b.transformacionLibre={giro:45,voltearH:true,voltearV:false}");
  const tex=run('toBeamer(S.deck)');
  assert.match(tex,/\\rotatebox\[origin=c\]\{-45\}\{\\scalebox\{-1\}\[1\]\{/);
  assert.match(tex,/\\erlensangre\{figura-figura\}/);
  assert.match(tex,/\\draw\[erlenliq/);
  assert.deepEqual(errors,[]);
});
