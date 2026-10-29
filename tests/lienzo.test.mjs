/* SPDX-License-Identifier: AGPL-3.0-only */
import test from 'node:test';
import assert from 'node:assert/strict';
import {editor} from '../herramientas/test-browser.mjs';
import {aMarkdown, leeMarkdown} from '../src/markdown-core.mjs';

async function prepara(t) {
  const app = await editor();
  t.after(() => app.dom.window.close());
  app.run(`wsNueva(); addSlide('content');
    curSlide().title = 'Resultados ilustrativos';
    curSlide().notes = 'Nota de prueba';
    curSlide().blocks = [
      {id:'texto-libre', type:'text', text:'Texto de prueba', size:'n', align:'left'},
      {id:'grafica-libre', type:'chart', kind:'linea', data:'x,y\\n1,2\\n3,4', w:78, ar:0.52,
       fuente:{nombre:'datos.csv',cuando:'2026-01-01',n:2,huella:'1234'}}
    ];
    snapNow(); renderAll();`);
  return app;
}

test('the free canvas is optional and toggling it preserves the original slide and sources', async t => {
  const {run} = await prepara(t);
  const original = JSON.parse(run('JSON.stringify(curSlide())'));
  assert.equal(original.lienzoLibre, undefined);
  assert.equal(run("!!document.querySelector('#lienzoLibreBtn')"), true);
  run("document.querySelector('#lienzoLibreBtn').click()");
  const libre = JSON.parse(run('JSON.stringify(curSlide())'));
  assert.equal(libre.lienzoLibre, true);
  assert.equal(libre.layout, original.layout);
  assert.equal(libre.title, original.title);
  assert.equal(libre.notes, original.notes);
  assert.deepEqual(libre.blocks[1].fuente, original.blocks[1].fuente);
  const visibles = JSON.parse(run(`JSON.stringify(['texto-libre','grafica-libre'].map(id => {
    const b = document.querySelector('#stageInner .blk[data-bid="'+id+'"]');
    return {exists:!!b, x:b?.style.left, y:b?.style.top, w:b?.style.width, h:b?.style.height};
  }))`));
  for (const b of visibles) assert.ok(b.exists && b.x && b.y && b.w && b.h);
  run("document.querySelector('#lienzoLibreBtn').click()");
  const vuelta = JSON.parse(run('JSON.stringify(curSlide())'));
  assert.equal(!!vuelta.lienzoLibre, false);
  assert.equal(vuelta.blocks.length, 2);
  assert.equal(vuelta.notes, original.notes);
  assert.deepEqual(vuelta.blocks[1].fuente, original.blocks[1].fuente);
  assert.equal(run("document.querySelector('#stageInner .blk[data-bid=texto-libre]').style.left"), '');
});

test('geometry survives project validation, copying and undo without altering old layouts', async t => {
  const {run} = await prepara(t);
  run(`curSlide().lienzoLibre = true;
    curSlide().blocks[0].posLibre = {x:10,y:20,w:35,h:25};
    curSlide().blocks[1].posLibre = {x:50,y:55,w:40,h:35};
    snapNow(); renderAll();`);
  const roundtrip = JSON.parse(run('JSON.stringify(saneaDeck(JSON.parse(JSON.stringify(S.deck))))'));
  assert.deepEqual(roundtrip.deck.slides[1].blocks[0].posLibre, {x:10,y:20,w:35,h:25});
  assert.equal(roundtrip.deck.slides[1].blocks[1].data, 'x,y\n1,2\n3,4');
  run('dupSlide(S.cur)');
  assert.deepEqual(JSON.parse(run('JSON.stringify(curSlide().blocks[0].posLibre)')), {x:10,y:20,w:35,h:25});
  run('doUndo()');
  assert.deepEqual(JSON.parse(run('JSON.stringify(curSlide().blocks[0].posLibre)')), {x:10,y:20,w:35,h:25});
  run(`window.__viejo = blankDeck(); __viejo.slides.push({id:'viejo',layout:'blanco',title:'',blocks:[{id:'v',type:'text',text:'Antes'}]});`);
  assert.equal(run("renderSlide(__viejo,1,'export',99).querySelector('[data-bid=v]').style.left"), '');
});

test('invalid geometry is reported and falls back to visible content', async t => {
  const {run} = await prepara(t);
  const result = JSON.parse(run(`JSON.stringify((()=>{
    const d = deepCopy(S.deck), s = d.slides[1]; s.lienzoLibre = true;
    s.blocks[0].posLibre = {x:'10',y:0,w:20,h:20};
    const r = saneaDeck(d), node = renderSlide(r.deck,1,'export',99).querySelector('[data-bid="texto-libre"]');
    return {warnings:r.avisos, pos:r.deck.slides[1].blocks[0].posLibre, visible:!!node && !!node.style.left};
  })())`));
  assert.ok(result.warnings.length > 0);
  assert.deepEqual(result.pos, {x:5,y:6,w:40,h:24});
  assert.equal(result.visible, true);
});

test('new blocks remain individually selectable even when the canvas has many items', async t => {
  const {run} = await prepara(t);
  run(`curSlide().lienzoLibre=true;
    for(let i=2;i<9;i++)curSlide().blocks.push({id:'bloque-'+i,type:'text',text:'Bloque '+i});
    renderAll();`);
  const posiciones=JSON.parse(run(`JSON.stringify([...document.querySelectorAll('#stageInner .blk[data-bid]')].map(el=>[el.style.left,el.style.top]))`));
  assert.equal(new Set(posiciones.map(p=>p.join(','))).size, 9);
  assert.equal(run("!!document.querySelector('#lienzoObjetosBtn')"),true);
  run("document.querySelector('#lienzoObjetosBtn').click()");
  const boton=run("[...document.querySelectorAll('#panelCapas button')].find(b=>b.textContent.includes('Bloque 2'))");
  assert.ok(boton);
  boton.click();
  assert.equal(run('S.selBlock'),'bloque-2');
});

test('choosing a block puts keyboard focus where arrows move and resize it', async t => {
  const {run}=await prepara(t);
  run(`curSlide().lienzoLibre=true;curSlide().blocks[0].posLibre={x:10,y:20,w:35,h:25};
    snapNow();renderAll();document.querySelector('#lienzoObjetosBtn').focus();
    document.querySelector('#lienzoObjetosBtn').click();
    [...document.querySelectorAll('#panelCapas button')].find(b=>b.textContent.includes('Texto de prueba')).click();`);
  assert.equal(run('document.activeElement.dataset.bid'),'texto-libre');
  run("document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}))");
  assert.deepEqual(JSON.parse(run("JSON.stringify(findBlock('texto-libre').block.posLibre)")),{x:11,y:20,w:35,h:25});
  assert.equal(run('document.activeElement.dataset.bid'),'texto-libre');
  assert.match(run("document.activeElement.getAttribute('aria-label')"),/flechas/i);
  run("document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,shiftKey:true}))");
  assert.deepEqual(JSON.parse(run("JSON.stringify(findBlock('texto-libre').block.posLibre)")),{x:11,y:20,w:35,h:26});
  assert.equal(run('document.activeElement.dataset.bid'),'texto-libre');
});

test('editing a free text block keeps movement controls without adding them to its text', async t => {
  const {run} = await prepara(t);
  run(`curSlide().lienzoLibre=true; renderAll(); selectBlock('texto-libre');
    document.querySelector('#stageInner [data-bid="texto-libre"] [data-edit]')?.focus();`);
  assert.equal(run("!!document.querySelector('#stageInner [data-bid=texto-libre] .tb-asa')"),true);
  assert.equal(run("document.querySelector('#stageInner [data-bid=texto-libre] [data-edit]')?.textContent"),'Texto de prueba');
});

test('keyboard movement and resizing are undoable and blocked elements cannot move', async t => {
  const {run} = await prepara(t);
  run(`curSlide().lienzoLibre = true; curSlide().blocks[0].posLibre = {x:10,y:20,w:35,h:25};
    snapNow(); renderAll(); selectBlock('texto-libre');
    document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));`);
  assert.deepEqual(JSON.parse(run('JSON.stringify(curSlide().blocks[0].posLibre)')), {x:11,y:20,w:35,h:25});
  run('doUndo()');
  assert.deepEqual(JSON.parse(run('JSON.stringify(curSlide().blocks[0].posLibre)')), {x:10,y:20,w:35,h:25});
  run(`selectBlock('texto-libre'); document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',shiftKey:true,bubbles:true}));`);
  assert.deepEqual(JSON.parse(run('JSON.stringify(curSlide().blocks[0].posLibre)')), {x:10,y:20,w:35,h:26});
  run(`curSlide().blocks[0].locked=true; snapNow(); selectBlock('texto-libre');
    document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));`);
  assert.deepEqual(JSON.parse(run('JSON.stringify(curSlide().blocks[0].posLibre)')), {x:10,y:20,w:35,h:26});
});

test('a pending drag cannot overwrite a position changed while it was active', async t => {
  const app = await prepara(t), d = app.dom.window.document, w = app.dom.window;
  app.run(`curSlide().lienzoLibre=true; curSlide().blocks[0].posLibre={x:10,y:20,w:35,h:25}; snapNow(); renderAll(); selectBlock('texto-libre');`);
  const slide = d.querySelector('#stageInner .slide');
  slide.getBoundingClientRect = () => ({left:0, top:0, width:1280, height:720, right:1280, bottom:720});
  const handle = d.querySelector('#stageInner [data-bid="texto-libre"] .tb-asa');
  handle.dispatchEvent(new w.MouseEvent('pointerdown', {bubbles:true, button:0, clientX:100, clientY:100}));
  d.dispatchEvent(new w.MouseEvent('pointermove', {bubbles:true, clientX:230, clientY:100}));
  app.run("aplicaPosicionLibre('texto-libre',{x:40,y:20,w:35,h:25})");
  const steps = app.run('S.undo.length');
  d.dispatchEvent(new w.MouseEvent('pointerup', {bubbles:true, clientX:230, clientY:100}));
  assert.deepEqual(JSON.parse(app.run('JSON.stringify(curSlide().blocks[0].posLibre)')), {x:40,y:20,w:35,h:25});
  assert.equal(app.run('S.undo.length'), steps);
});

test('Beamer warns in the editor and generated source when placement will change', async t => {
  const {run} = await prepara(t);
  run(`curSlide().lienzoLibre=true; curSlide().blocks[0].posLibre={x:10,y:20,w:35,h:25};`);
  assert.match(run('toBeamer(S.deck)'), /%[^\n]*(?:posici[oó]n|acomodo)[^\n]*/i);
  run('openTexView()');
  assert.match(run("document.querySelector('#modalRoot').textContent"), /(?:posici[oó]n|acomodo)[^.]*(?:no se conserv|cambi)/i);
  const fragmentos=run(`toBeamer(S.deck).split(MARCA_DIAPO)`);
  assert.doesNotMatch(fragmentos[1],/posici[oó]n libre/i);
  assert.match(fragmentos[2],/posici[oó]n libre/i);
});

test('Markdown reports when free placement does not survive export', () => {
  const deck = {v:1, meta:{title:'Prueba'}, slides:[{layout:'content',title:'Diapositiva',lienzoLibre:true,
    blocks:[{id:'t',type:'text',text:'Texto',posLibre:{x:10,y:20,w:35,h:25}}]}]};
  const result = aMarkdown(deck, {zonasPorDiseno:{content:1}});
  assert.ok(result.avisos.some(a => /(?:posici[oó]n|acomodo)/i.test(a)), JSON.stringify(result.avisos));
});

test('Markdown round trip leaves the previous slide notes unchanged', () => {
  const deck = {v:1,meta:{title:'Presentación'},slides:[
    {layout:'title',title:'',blocks:[]},
    {layout:'content',title:'Anterior',notes:'Nota anterior\nSegunda línea',blocks:[{id:'a',type:'text',text:'Primero'}]},
    {layout:'content',title:'Libre',lienzoLibre:true,blocks:[{id:'b',type:'text',text:'Después',posLibre:{x:5,y:6,w:40,h:24}}]}
  ]};
  const salida=aMarkdown(deck,{zonasPorDiseno:{title:0,content:1}});
  const recibido=leeMarkdown(salida.md);
  assert.equal(recibido.diapositivas[0].notas,'Nota anterior\nSegunda línea');
  assert.ok(salida.avisos.some(a=>/posici[oó]n libre/i.test(a)));
});

test('a new locked block keeps its initial placement when an earlier block is removed', async t => {
  const {run} = await prepara(t);
  run(`document.querySelector('#lienzoLibreBtn').click(); addBlockToSlide('text',1);
    window.__a=S.selBlock; addBlockToSlide('text',1); window.__b=S.selBlock;
    findBlock(__b).block.locked=true; commit();`);
  const antes=JSON.parse(run('JSON.stringify(findBlock(__b).block.posLibre || null)'));
  assert.ok(antes,'la posición inicial debe guardarse en el proyecto');
  run('delBlock(__a)');
  assert.deepEqual(JSON.parse(run('JSON.stringify(findBlock(__b).block.posLibre)')),antes);
});

test('imported and pasted blocks keep their positions when another block changes order', async t => {
  const {run} = await prepara(t);
  run(`window.__importado=deepCopy(S.deck);__importado.slides[1].lienzoLibre=true;
    __importado.slides[1].blocks[1].locked=true;
    cargaSegura(__importado,null);S.cur=1;renderAll();
    window.__posImportada=JSON.stringify(findBlock('grafica-libre').block.posLibre);
    moveBlock('texto-libre',1);`);
  assert.deepEqual(JSON.parse(run("JSON.stringify(findBlock('grafica-libre').block.posLibre)")),JSON.parse(run('__posImportada')));
  run(`window.__pegado=nuevoBloqueEn('text',{text:'Texto pegado'});commit();
    window.__posPegada=JSON.stringify(__pegado.posLibre);moveBlock('texto-libre',-1);`);
  assert.deepEqual(JSON.parse(run('JSON.stringify(__pegado.posLibre)')),JSON.parse(run('__posPegada')));
  assert.ok(JSON.parse(run('__posPegada')));
});

test('arrow keys in an inspector select never move the selected block', async t => {
  const {run} = await prepara(t);
  run(`curSlide().lienzoLibre=true;curSlide().blocks[1].posLibre={x:20,y:30,w:40,h:30};
    snapNow();renderAll();selectBlock('grafica-libre');
    window.__control=document.createElement('select');__control.innerHTML='<option>Primero</option><option>Segundo</option>';
    document.querySelector('#inspector').append(__control);__control.focus();
    __control.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));`);
  assert.deepEqual(JSON.parse(run("JSON.stringify(findBlock('grafica-libre').block.posLibre)")),{x:20,y:30,w:40,h:30});
});

test('classic PowerPoint export warns that free positioning needs checking', async t => {
  const {run} = await prepara(t);
  run(`curSlide().lienzoLibre=true; curSlide().blocks[0].posLibre={x:10,y:20,w:35,h:25};
    window.downloadFile=async()=>true; window.rasteriza=async()=>null;`);
  await run('exportPPTX()');
  assert.match(run("document.querySelector('#modalRoot').textContent"), /(?:posici[oó]n|acomodo)[^.]*(?:revisa|difer)/i);
});
