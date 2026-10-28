/* SPDX-License-Identifier: AGPL-3.0-only */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';

/* The geometry and pointer interactions below run in a real browser. */
test('free canvas tools support layers, snapping and moving several blocks in Chromium', {timeout:120000}, async t => {
  const bin = process.env.ERLEN_CHROMIUM || '/usr/bin/chromium';
  if (!existsSync(bin)) { t.skip('Chromium is required.'); return; }
  const port = Number(process.env.ERLEN_HERRAMIENTAS_TEST_PORT || 4231);
  const server = spawn(process.execPath,[fileURLToPath(new URL('../herramientas/serve.mjs', import.meta.url))],
    {env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
  t.after(()=>server.kill());
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',c=>reject(new Error('Server exited: '+c)));});
  const browser = await chromium.launch({executablePath:bin,args:['--no-sandbox']});
  t.after(()=>browser.close());
  const page = await browser.newPage({viewport:{width:1440,height:1000}}), errores=[];
  page.setDefaultTimeout(5000);
  page.on('pageerror',e=>errores.push(e.message));
  await page.goto('http://127.0.0.1:'+port+'/');
  await page.evaluate(()=>{
    const deck=blankDeck(), slide={id:'herramientas',layout:'blanco',title:'',lienzoLibre:true,blocks:[]};
    for (const [id,x,y] of [['a',10,20],['b',50,20],['c',75,65]]) {
      const b=newBlock('text'); Object.assign(b,{id,text:id.toUpperCase(),posLibre:{x,y,w:20,h:20}});slide.blocks.push(b);
    }
    deck.slides.push(slide);wsNueva(deck);S.cur=1;snapNow();renderAll();
  });
  const blk=id=>page.locator('#stageInner .blk[data-bid="'+id+'"]');
  const pos=id=>page.evaluate(id=>({...findBlock(id).block.posLibre}),id);

  await t.test('reorders layers from the accessible list and keeps the same order when presenting', async()=>{
    await page.locator('#lienzoObjetosBtn').click();
    await page.getByRole('button',{name:'Adelantar capa A'}).click();
    assert.deepEqual(await page.evaluate(()=>Array.from(renderSlide(S.deck,S.cur,'present',99).querySelectorAll('.lienzo-capa .blk[data-bid]')).map(el=>el.dataset.bid)),['b','a','c']);
    assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Adelantar capa A');
    await page.locator('#modalRoot .mo-foot').getByRole('button',{name:'Cerrar',exact:true}).click();
    const exportado=await page.evaluate(async()=>{
      const ext=await extensionSlides('exportador'), html=await ext.creaHTML(S.deck), ppt=await ext.creaPPTX(S.deck);
      const zip=await window.JSZip.loadAsync(ppt.blob);
      return {html:await html.text(),xml:await zip.file('ppt/slides/slide2.xml').async('string')};
    });
    assert.ok(exportado.xml.indexOf('>B<')<exportado.xml.indexOf('>A<') && exportado.xml.indexOf('>A<')<exportado.xml.indexOf('>C<'),exportado.xml.slice(0,1000));
    const offline=await browser.newPage();
    await offline.setContent(exportado.html,{waitUntil:'load'});
    await offline.waitForFunction(()=>typeof presenter!=='undefined' && presenter.isReady());
    await offline.evaluate(()=>presenter.slide(1));
    assert.deepEqual(await offline.evaluate(()=>Array.from(document.querySelectorAll('.present .lienzo-capa .blk[data-bid]')).map(el=>el.dataset.bid)),['b','a','c']);
    await offline.close();
    await page.evaluate(()=>doUndo());
    assert.deepEqual(await page.evaluate(()=>bloquesEnCapas(curSlide()).map(b=>b.id)),['a','b','c']);
  });

  await t.test('selects covered blocks with accessible checkboxes and keeps keyboard focus', async()=>{
    await page.locator('#lienzoObjetosBtn').click();
    await page.getByRole('checkbox',{name:'Marcar A'}).check();
    await page.getByRole('checkbox',{name:'Marcar B'}).check();
    await page.getByRole('button',{name:'Seleccionar marcados'}).click();
    assert.deepEqual((await page.evaluate(()=>[...idsSeleccionados()])).sort(),['a','b']);
    assert.equal(await page.locator('#stageInner .libre-asa').count(),0);
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.bid),'b');
    const etiqueta=await page.evaluate(()=>document.activeElement.getAttribute('aria-label'));
    await page.evaluate(()=>document.querySelector('#stageInner .blk[data-bid="a"]').dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0})));
    assert.deepEqual((await page.evaluate(()=>[...idsSeleccionados()])).sort(),['a','b']);
    assert.equal(await page.evaluate(()=>S.selBlock),'a');
    assert.equal(await page.locator('#stageInner .libre-asa').count(),0);
    assert.match(etiqueta,/2 bloques seleccionados/);
    assert.doesNotMatch(etiqueta,/cambiar el tamaño/);
    await page.evaluate(()=>enfocaBloqueLibre('a'));
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.bid),'a');
    assert.equal((await pos('a')).x,11); assert.equal((await pos('b')).x,51);
    await page.evaluate(()=>doUndo());
  });

  await t.test('focus announces the remaining selection after a block becomes hidden',async()=>{
    await page.evaluate(()=>{selectBlock('a');selectBlock('b',true);enfocaBloqueLibre('b');});
    assert.match(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),/2 bloques seleccionados/);
    await page.evaluate(()=>{findBlock('a').block.nivel='comite';S.deck.meta.nivel='congreso';renderAll();});
    const etiqueta=await page.evaluate(()=>document.activeElement.getAttribute('aria-label'));
    assert.doesNotMatch(etiqueta,/2 bloques seleccionados/);
    assert.match(etiqueta,/cambiar el tamaño/);
    await page.evaluate(()=>{delete findBlock('a').block.nivel;renderAll();selectBlock(null);});
  });

  await t.test('leaves text editing and moves the additive selection with arrow keys',async()=>{
    await page.evaluate(()=>selectBlock(null));
    await blk('a').locator('[data-edit]').click();
    await page.keyboard.type(' extra');
    await blk('b').locator('[data-edit]').click({modifiers:['Control']});
    assert.equal(await page.evaluate(()=>findBlock('a').block.text),'A extra');
    assert.equal(await page.evaluate(()=>document.activeElement.closest('.blk')?.dataset.bid),'b');
    assert.deepEqual((await page.evaluate(()=>[...idsSeleccionados()])).sort(),['a','b']);
    const a0=await pos('a'),b0=await pos('b');
    await page.keyboard.press('ArrowRight');
    assert.equal((await pos('a')).x,a0.x+1);assert.equal((await pos('b')).x,b0.x+1);
    await page.evaluate(()=>{doUndo();findBlock('a').block.text='A';snapNow();renderAll();selectBlock(null);});
  });

  await t.test('moves a multi-selection without changing the distance and undoes it once',async()=>{
    await page.evaluate(()=>selectBlock(null));
    await blk('a').click({position:{x:8,y:8}});
    await blk('b').click({position:{x:8,y:8},modifiers:['Control']});
    assert.deepEqual((await page.evaluate(()=>[...idsSeleccionados()])).sort(),['a','b']);
    assert.equal(await page.locator('#stageInner .libre-asa').count(),0);
    await page.locator('#lienzoImanBtn').click();
    const slide=await page.locator('#stageInner .slide').boundingBox(), asa=await blk('b').locator('.tb-asa').boundingBox();
    const a0=await pos('a'),b0=await pos('b');
    await page.mouse.move(asa.x+asa.width/2,asa.y+asa.height/2);await page.mouse.down();
    await page.mouse.move(asa.x+asa.width/2+slide.width*.05,asa.y+asa.height/2+slide.height*.03,{steps:4});await page.mouse.up();
    const a1=await pos('a'),b1=await pos('b');
    assert.ok(Math.abs(a1.x-a0.x-5)<.15 && Math.abs(b1.x-b0.x-5)<.15,JSON.stringify({a0,b0,a1,b1}));
    assert.ok(Math.abs(a1.y-a0.y-3)<.15 && Math.abs(b1.y-b0.y-3)<.15,JSON.stringify({a0,b0,a1,b1}));
    await page.evaluate(()=>doUndo());
    assert.deepEqual(await pos('a'),a0);assert.deepEqual(await pos('b'),b0);
    await page.locator('#lienzoImanBtn').click();
  });

  await t.test('shows an alignment guide and snaps to a neighboring block while dragging',async()=>{
    await page.evaluate(()=>{selectBlock('a');});
    const medida=await blk('a').locator('.libre-se').evaluate(el=>{const r=el.getBoundingClientRect();return {w:r.width,h:r.height};});
    assert.ok(Math.abs(medida.w-medida.h)<2 && medida.w>=30,JSON.stringify(medida));
    const slide=await page.locator('#stageInner .slide').boundingBox(), asa=await blk('a').locator('.tb-asa').boundingBox();
    await page.mouse.move(asa.x+asa.width/2,asa.y+asa.height/2);await page.mouse.down();
    await page.mouse.move(asa.x+asa.width/2+slide.width*.195,asa.y+asa.height/2,{steps:5});
    assert.equal(await page.locator('#stageInner .guia-libre-v').count(),1);
    await page.mouse.up();
    assert.ok(Math.abs((await pos('a')).x-30)<.1,JSON.stringify(await pos('a')));
    assert.equal(await page.locator('#stageInner .guia-libre-v').count(),0);
  });
  await t.test('Alt bypasses snapping and Escape discards a live gesture',async()=>{
    await page.evaluate(()=>{doUndo();selectBlock('a');});
    const slide=await page.locator('#stageInner .slide').boundingBox(), asa=await blk('a').locator('.tb-asa').boundingBox();
    await page.keyboard.down('Alt');
    await page.mouse.move(asa.x+asa.width/2,asa.y+asa.height/2);await page.mouse.down();
    await page.mouse.move(asa.x+asa.width/2+slide.width*.195,asa.y+asa.height/2,{steps:4});
    assert.equal(await page.locator('#stageInner .guia-libre-v').count(),0);
    await page.mouse.up();await page.keyboard.up('Alt');
    const p=await pos('a');assert.ok(Math.abs(p.x-29.5)<.15,JSON.stringify(p));
    const asa2=await blk('a').locator('.tb-asa').boundingBox();
    await page.mouse.move(asa2.x+asa2.width/2,asa2.y+asa2.height/2);await page.mouse.down();
    await page.mouse.move(asa2.x+asa2.width/2+slide.width*.04,asa2.y+asa2.height/2,{steps:4});
    await page.keyboard.press('Escape');await page.mouse.up();
    assert.deepEqual(await pos('a'),p);
    assert.equal(await page.locator('#stageInner .guias').count(),0);
  });
  await t.test('a locked or externally changed member cannot partially move a selection',async()=>{
    await page.evaluate(()=>{findBlock('b').block.locked=true;snapNow();renderAll();selectBlock('b');selectBlock('a',true);});
    const a0=await pos('a'),b0=await pos('b'), slide=await page.locator('#stageInner .slide').boundingBox();
    const asa=await blk('a').locator('.tb-asa').boundingBox();
    await page.mouse.move(asa.x+asa.width/2,asa.y+asa.height/2);await page.mouse.down();
    await page.mouse.move(asa.x+asa.width/2+slide.width*.04,asa.y+asa.height/2,{steps:4});await page.mouse.up();
    assert.deepEqual(await pos('a'),a0);assert.deepEqual(await pos('b'),b0);
    await page.evaluate(()=>{findBlock('b').block.locked=false;renderAll();selectBlock('a');selectBlock('b',true);});
    const asa2=await blk('b').locator('.tb-asa').boundingBox(), undo=await page.evaluate(()=>S.undo.length);
    await page.mouse.move(asa2.x+asa2.width/2,asa2.y+asa2.height/2);await page.mouse.down();
    await page.mouse.move(asa2.x+asa2.width/2+slide.width*.04,asa2.y+asa2.height/2,{steps:4});
    await page.evaluate(()=>{findBlock('b').block.posLibre.x=60;});
    await page.mouse.up();
    assert.deepEqual(await pos('a'),a0);assert.equal((await pos('b')).x,60);
    assert.equal(await page.evaluate(()=>S.undo.length),undo);
  });
  await t.test('a single-block drag is discarded if selection or visibility changes',async()=>{
    await page.evaluate(()=>{selectBlock('a');});
    const a0=await pos('a'), slide=await page.locator('#stageInner .slide').boundingBox();
    let asa=await blk('a').locator('.tb-asa').boundingBox();
    await page.mouse.move(asa.x+asa.width/2,asa.y+asa.height/2);await page.mouse.down();
    await page.mouse.move(asa.x+asa.width/2+slide.width*.05,asa.y+asa.height/2,{steps:4});
    await page.evaluate(()=>selectBlock('b'));await page.mouse.up();
    assert.deepEqual(await pos('a'),a0);
    await page.evaluate(()=>{selectBlock('a');});asa=await blk('a').locator('.tb-asa').boundingBox();
    await page.mouse.move(asa.x+asa.width/2,asa.y+asa.height/2);await page.mouse.down();
    await page.mouse.move(asa.x+asa.width/2+slide.width*.05,asa.y+asa.height/2,{steps:4});
    await page.evaluate(()=>{findBlock('a').block.nivel='congreso';S.deck.meta.nivel='comite';renderAll();});await page.mouse.up();
    assert.deepEqual(await pos('a'),a0);
    await page.evaluate(()=>{delete findBlock('a').block.nivel;S.deck.meta.nivel='congreso';renderAll();selectBlock(null);});
  });
  await t.test('modifier clicks select and deselect an image after it has been active',async()=>{
    await page.evaluate(()=>{const im=newBlock('image');Object.assign(im,{id:'figura',w:100,
      src:'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23000"/%3E%3C/svg%3E',
      posLibre:{x:5,y:65,w:20,h:20}});curSlide().blocks.push(im);snapNow();renderAll();selectBlock('figura');});
    await blk('figura').click({position:{x:5,y:5},modifiers:['Control']});
    assert.equal(await page.evaluate(()=>idsSeleccionados().has('figura')),false);
    await page.evaluate(()=>{selectBlock('figura');selectBlock('a');});
    await blk('figura').click({position:{x:5,y:5}});
    assert.equal(await page.evaluate(()=>S.selBlock),'figura');
  });
  mkdirSync(fileURLToPath(new URL('../.local/',import.meta.url)),{recursive:true});
  await page.screenshot({path:fileURLToPath(new URL('../.local/herramientas-lienzo.png',import.meta.url))});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:fileURLToPath(new URL('../.local/herramientas-lienzo-movil.png',import.meta.url))});
  const movil=await page.evaluate(()=>({ancho:document.documentElement.scrollWidth,ventana:innerWidth,
    iman:(()=>{const r=document.querySelector('#lienzoImanBtn').getBoundingClientRect();return {left:r.left,right:r.right,width:r.width}})()}));
  assert.ok(movil.ancho<=movil.ventana+1 && movil.iman.left>=0 && movil.iman.right<=movil.ventana,JSON.stringify(movil));
  await page.locator('#lienzoObjetosBtn').click();
  await page.screenshot({path:fileURLToPath(new URL('../.local/herramientas-capas-movil.png',import.meta.url))});
  assert.equal(await page.getByRole('checkbox',{name:'Marcar A'}).isVisible(),true);
  assert.deepEqual(errores,[]);
});
