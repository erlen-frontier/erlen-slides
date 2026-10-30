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

test('connectors follow slide geometry, hide with their endpoints, and preserve scientific data', async t => {
  const {run,errors} = await prepara(t);
  run("curSlide().conectores=[{desde:'a',hasta:'b'}];snapNow()");
  const fuente = run("JSON.stringify(findBlock('c').block)");
  const coordenadas = () => valor(run, `(()=>{
    const line=renderSlide(S.deck,S.cur,'export',99).querySelector('.lienzo-conectores line');
    return line && ['x1','y1','x2','y2'].map(k=>+line.getAttribute(k));
  })()`);
  const iguales = (actual, esperadas) => actual.forEach((n,i)=>assert.ok(Math.abs(n-esperadas[i])<.001,JSON.stringify(actual)));
  iguales(coordenadas(),[384,252,640,324]);
  run("S.deck.meta.aspect='43'");
  iguales(coordenadas(),[307.2,268.8,512,345.6]);
  run("findBlock('b').block.nivel='comite';S.deck.meta.nivel='congreso'");
  assert.equal(coordenadas(),null);
  run("delete findBlock('b').block.nivel;findBlock('b').block.posLibre={x:18,y:20,w:20,h:20}");
  assert.equal(coordenadas(),null,'dos cajas superpuestas no producen una flecha engañosa');
  assert.deepEqual(valor(run,'curSlide().conectores'),[{desde:'a',hasta:'b'}]);
  run("findBlock('b').block.posLibre={x:50,y:40,w:20,h:20}");
  iguales(coordenadas(),[307.2,268.8,512,345.6]);
  assert.equal(run("JSON.stringify(findBlock('c').block)"),fuente);
  assert.deepEqual(errors,[]);
});

test('a shape with a caption anchors to the whole block instead of assuming the image fills it', async t => {
  const {run,errors} = await prepara(t);
  run(`Object.assign(findBlock('b').block, {type:'image',formaLibre:'circle',w:100,caption:'Pie de figura',
    src:'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"/%3E',
    figura:{width:300,height:150,objects:[{kind:'circle',x:8,y:8,width:284,height:134,angle:0}]},
    transformacionLibre:{giro:45,voltearH:false,voltearV:false}});
    curSlide().conectores=[{desde:'a',hasta:'b'}];`);
  const destino = () => valor(run, `(()=>{
    const line=renderSlide(S.deck,S.cur,'export',99).querySelector('.lienzo-conectores line');
    return ['x2','y2'].map(k=>+line.getAttribute(k));
  })()`);
  assert.deepEqual(destino(),[640,324]);
  run("delete findBlock('b').block.caption");
  const girada = destino();
  assert.ok(Math.abs(girada[0] - 676.073836) < .001 && Math.abs(girada[1] - 334.145766) < .001, JSON.stringify(girada));
  run("findBlock('b').block.posLibre.y=20;findBlock('b').block.w=50;findBlock('b').block.transformacionLibre.giro=0");
  const estrecha = destino();
  assert.ok(Math.abs(estrecha[0] - (768 - 128 * 284 / 600)) < .001, JSON.stringify(estrecha));
  assert.equal(estrecha[1],216);
  assert.deepEqual(errors,[]);
});

test('project import remaps unambiguous connector IDs and rejects ambiguous links with a warning', async t => {
  const {run,errors} = await prepara(t);
  run(`window.__original=deepCopy(S.deck);
    __original.slides[0].blocks=[{id:'a',type:'text',text:'Colisión en otra diapositiva'}];
    __original.slides[1].blocks2[0].fuente={nombre:'fuente.csv',cuando:'2026-01-01',n:2,huella:'1234'};
    __original.slides[1].conectores=[{desde:'a',hasta:'b'}];`);
  const valido = valor(run,'saneaDeck(__original)');
  const sl = valido.deck.slides[1], enlace = sl.conectores[0];
  assert.notEqual(enlace.desde,'a');
  assert.equal(sl.blocks.find(b=>b.id===enlace.desde).text,'A');
  assert.equal(sl.blocks.find(b=>b.id===enlace.hasta).text,'B');
  assert.equal(sl.blocks2[0].data,'x,y\n1,2');
  assert.deepEqual(sl.blocks2[0].fuente,{nombre:'fuente.csv',cuando:'2026-01-01',n:2,huella:'1234'});
  run("__original.slides[1].blocks2.push({id:'a',type:'text',text:'Identidad ambigua'});__original.slides[1].conectores.push({desde:'b',hasta:'b'},{desde:'a',hasta:'inexistente'})");
  const ambiguo = valor(run,'saneaDeck(__original)');
  assert.equal(ambiguo.deck.slides[1].conectores,undefined);
  assert.match(ambiguo.avisos.join(' '),/conexiones inválidas o ambiguas/i);
  assert.deepEqual(errors,[]);
});

test('project import keeps valid connector styles and reports invalid ones without discarding the connection', async t => {
  const {run,errors} = await prepara(t);
  run(`window.__original=deepCopy(S.deck);
    __original.slides[1].conectores=[
      {desde:'a',hasta:'b',color:'#b12565',grosor:7,flecha:'ambos'},
      {desde:'a',hasta:'c',color:'url(https://example.invalid)',grosor:9,flecha:'otra'},
      {desde:'b',hasta:'c',color:'#1155aa',grosor:0,flecha:'ninguna'}];`);
  const importado = valor(run,'saneaDeck(__original)');
  assert.deepEqual(importado.deck.slides[1].conectores,[
    {desde:'a',hasta:'b',color:'#b12565',grosor:7,flecha:'ambos'},
    {desde:'a',hasta:'c'},
    {desde:'b',hasta:'c',color:'#1155aa',flecha:'ninguna'}]);
  assert.match(importado.avisos.join(' '),/estilos de conexión inválidos/i);
  assert.deepEqual(errors,[]);
});

test('reopening a section keeps the complete source of a connected, temporarily stored chart', async t => {
  const {run,errors} = await prepara(t);
  run(`findBlock('c').block.fuente={nombre:'muestra-'.repeat(18)+'.csv',cuando:'2026-10-28',n:1,huella:'1234'};
    curSlide().conectores=[{desde:'a',hasta:'c'}];
    changeLayout(curSlide(),'section');
    S.deck.slides[0].blocks=[{id:'c',type:'text',text:'Colisión en otra diapositiva'}];`);
  const original = valor(run,"curSlide()._guardados.find(b=>b.id==='c')");
  const reabierta = valor(run,'saneaDeck(JSON.parse(JSON.stringify(S.deck))).deck.slides[S.cur]');
  const guardada = reabierta._guardados.find(b=>b.id===reabierta.conectores[0].hasta);
  assert.notEqual(guardada.id,original.id,'la colisión de IDs se resuelve sin perder la relación');
  delete guardada.id; delete original.id;
  assert.deepEqual(guardada,original,'los datos y la procedencia permanecen intactos');
  assert.deepEqual(errors,[]);
});
