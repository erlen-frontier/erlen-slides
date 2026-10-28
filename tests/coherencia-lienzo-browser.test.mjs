/* SPDX-License-Identifier: AGPL-3.0-only */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';

test('free canvas actions use the visible layer order', {timeout:120000}, async t => {
  const bin=process.env.ERLEN_CHROMIUM || '/usr/bin/chromium';
  if (!existsSync(bin)) { t.skip('Chromium is required.'); return; }
  const port=Number(process.env.ERLEN_COHERENCIA_TEST_PORT || 4305);
  const server=spawn(process.execPath,[fileURLToPath(new URL('../herramientas/serve.mjs',import.meta.url))],
    {env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
  t.after(()=>server.kill());
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',c=>reject(new Error('Server exited: '+c)));});
  const browser=await chromium.launch({executablePath:bin,args:['--no-sandbox']});
  t.after(()=>browser.close());
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  t.after(()=>page.close());page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(7000);
  await page.goto('http://127.0.0.1:'+port+'/');
  const reset=()=>page.evaluate(()=>{
    const deck=blankDeck(),slide={id:'capas',layout:'twocol',title:'',lienzoLibre:true,blocks:[],blocks2:[]};
    for(const [id,layer] of [['a',0],['b',1],['c',2],['d',3]]) {
      const block=newBlock('text');Object.assign(block,{id,text:id.toUpperCase(),capaLibre:layer,posLibre:{x:20+layer*4,y:20+layer*4,w:30,h:25}});
      (layer<2?slide.blocks:slide.blocks2).push(block);
    }
    deck.slides.push(slide);wsNueva(deck);S.cur=1;snapNow();renderAll();
  });
  const order=()=>page.evaluate(()=>Array.from(renderSlide(S.deck,S.cur,'present',99).querySelectorAll('.lienzo-capa .blk[data-bid]')).map(el=>el.dataset.bid));

  await t.test('the ribbon advances and retracts an explicitly ordered layer, with undo and redo',async()=>{
    await reset();await page.evaluate(()=>selectBlock('b'));
    await page.locator('[data-pestana="bloque"]').click();
    await page.locator('[data-control="subir"]').click();
    assert.deepEqual(await order(),['a','c','b','d']);
    await page.evaluate(()=>doUndo());assert.deepEqual(await order(),['a','b','c','d']);
    await page.evaluate(()=>doRedo());assert.deepEqual(await order(),['a','c','b','d']);
    await page.evaluate(()=>selectBlock('b'));
    await page.locator('[data-pestana="bloque"]').click();
    await page.locator('[data-control="bajar"]').click();
    assert.deepEqual(await order(),['a','b','c','d']);
  });

  await t.test('the floating toolbar advances the whole selection across zones without reversing it',async()=>{
    await reset();await page.evaluate(()=>{selectBlock('b');selectBlock('c',true);});
    await page.locator('#stageInner .blk-toolbar button[title^="Adelantar"]').click();
    assert.deepEqual(await order(),['a','d','b','c']);
    assert.deepEqual((await page.evaluate(()=>[...idsSeleccionados()])).sort(),['b','c']);
    await page.evaluate(()=>doUndo());assert.deepEqual(await order(),['a','b','c','d']);
  });

  await t.test('a locked member prevents the entire selected set from changing layers',async()=>{
    await reset();await page.evaluate(()=>{findBlock('b').block.locked=true;snapNow();selectBlock('b');selectBlock('c',true);});
    const antes=await page.evaluate(()=>({deck:JSON.stringify(S.deck),undos:S.undo.length}));
    await page.locator('#stageInner .blk-toolbar button[title^="Adelantar"]').click();
    assert.deepEqual(await order(),['a','b','c','d']);
    assert.deepEqual(await page.evaluate(()=>({deck:JSON.stringify(S.deck),undos:S.undo.length})),antes);
    assert.match(await page.locator('#toasts .toast').last().innerText(),/Desbloquea/);
  });

  await t.test('layer order survives project validation, standalone HTML and PowerPoint export',async()=>{
    await reset();await page.evaluate(()=>selectBlock('b'));
    await page.locator('[data-pestana="bloque"]').click();await page.locator('[data-control="subir"]').click();
    const out=await page.evaluate(async()=>{
      const d=saneaDeck(JSON.parse(JSON.stringify(S.deck))).deck;
      const capas=Array.from(renderSlide(d,1,'present',99).querySelectorAll('.lienzo-capa .blk[data-bid]')).map(el=>el.dataset.bid);
      const ext=await extensionSlides('exportador'),html=await (await ext.creaHTML(d)).text(),ppt=await ext.creaPPTX(d);
      const zip=await window.JSZip.loadAsync(ppt.blob),xml=await zip.file('ppt/slides/slide2.xml').async('string');
      return {capas,html,xml};
    });
    assert.deepEqual(out.capas,['a','c','b','d']);
    assert.ok(out.xml.indexOf('>A<')<out.xml.indexOf('>C<') && out.xml.indexOf('>C<')<out.xml.indexOf('>B<') && out.xml.indexOf('>B<')<out.xml.indexOf('>D<'));
    const offline=await browser.newPage();try {
      await offline.setContent(out.html,{waitUntil:'load'});
      await offline.waitForFunction(()=>typeof presenter!=='undefined' && presenter.isReady());
      await offline.evaluate(()=>presenter.slide(1));
      assert.deepEqual(await offline.evaluate(()=>Array.from(document.querySelectorAll('.present .lienzo-capa .blk[data-bid]')).map(el=>el.dataset.bid)),['a','c','b','d']);
    } finally {await offline.close();}
  });

  await t.test('duplicating from the ribbon shows and selects an offset copy in one undo step',async()=>{
    await reset();await page.evaluate(()=>{findBlock('a').block.fuente={nombre:'datos-ilustrativos.csv',huella:'ejemplo'};snapNow();selectBlock('a');});
    await page.locator('[data-pestana="bloque"]').click();await page.locator('[data-control="duplicar-bloque"]').click();
    const resultado=await page.evaluate(()=>({original:deepCopy(findBlock('a').block),copia:deepCopy(findBlock(S.selBlock).block),ids:[...idsSeleccionados()],capas:bloquesEnCapas(curSlide()).map(b=>b.id)}));
    assert.notEqual(resultado.copia.id,'a');
    assert.deepEqual(resultado.original.posLibre,{x:20,y:20,w:30,h:25});
    assert.deepEqual(resultado.copia.posLibre,{x:22,y:22,w:30,h:25});
    assert.deepEqual(resultado.copia.fuente,resultado.original.fuente);
    assert.deepEqual(resultado.ids,[resultado.copia.id]);
    assert.equal(resultado.capas.at(-1),resultado.copia.id);
    await page.evaluate(()=>doUndo());assert.equal(await page.evaluate(()=>zonas(curSlide()).flat().length),4);
    await page.evaluate(()=>doRedo());assert.equal(await page.evaluate(()=>zonas(curSlide()).flat().length),5);
  });

  await t.test('duplicating a group keeps its geometry together at the edge and creates a separate group',async()=>{
    await reset();await page.evaluate(()=>{
      const b=findBlock('b').block,c=findBlock('c').block;
      b.group=c.group='grupo-original';b.posLibre={x:10,y:10,w:20,h:20};c.posLibre={x:80,y:80,w:20,h:20};
      b.fuente={nombre:'datos-ilustrativos.csv',huella:'ejemplo'};snapNow();renderAll();selectBlock('b');
    });
    await page.locator('#stageInner .blk-toolbar button[title="Más acciones…"]').click();
    await page.locator('.menu').getByRole('button',{name:/Duplicar/}).click();
    const r=await page.evaluate(()=>{
      const todos=zonas(curSlide()).flat(),copias=todos.filter(b=>!['a','b','c','d'].includes(b.id));
      return {copias:deepCopy(copias),seleccion:[...idsSeleccionados()],orden:bloquesEnCapas(curSlide()).map(b=>b.id),originales:deepCopy([findBlock('b').block,findBlock('c').block])};
    });
    assert.equal(r.copias.length,2);
    const b=r.copias.find(x=>x.text==='B'),c=r.copias.find(x=>x.text==='C');
    assert.deepEqual(b.posLibre,{x:8,y:8,w:20,h:20});assert.deepEqual(c.posLibre,{x:78,y:78,w:20,h:20});
    assert.equal(b.group,c.group);assert.notEqual(b.group,'grupo-original');
    assert.deepEqual(b.fuente,r.originales[0].fuente);
    assert.deepEqual(r.seleccion.slice().sort(),[b.id,c.id].sort());
    assert.deepEqual(r.orden,['a','b','c','d',b.id,c.id]);
    await page.evaluate(()=>doUndo());assert.equal(await page.evaluate(()=>zonas(curSlide()).flat().length),4);
  });

  for (const control of ['toolbar','ribbon','inspector','keyboard']) {
    await t.test('deleting a multiple selection with '+control+' removes the same blocks in one step',async()=>{
      await reset();await page.evaluate(()=>{selectBlock('a');selectBlock('c',true);});
      if(control==='toolbar') await page.locator('#stageInner .blk-toolbar button[title^="Eliminar"]').click();
      if(control==='ribbon') {await page.locator('[data-pestana="bloque"]').click();await page.locator('[data-control="eliminar-bloque"]').click();}
      if(control==='inspector') {await page.evaluate(()=>abrePanelLateral('bloque'));await page.locator('#inspBody').getByRole('button',{name:/Eliminar/}).click();}
      if(control==='keyboard') {await page.evaluate(()=>enfocaBloqueLibre('c'));await page.keyboard.press('Delete');}
      assert.deepEqual(await page.evaluate(()=>zonas(curSlide()).flat().map(b=>b.id)),['b','d']);
      await page.evaluate(()=>doUndo());assert.deepEqual(await page.evaluate(()=>zonas(curSlide()).flat().map(b=>b.id)),['a','b','c','d']);
    });
  }

  await t.test('locked members prevent partial deletion and duplication from the toolbar',async()=>{
    await reset();await page.evaluate(()=>{findBlock('a').block.locked=true;snapNow();selectBlock('a');selectBlock('c',true);});
    const antes=await page.evaluate(()=>({deck:JSON.stringify(S.deck),undo:S.undo.length}));
    await page.locator('#stageInner .blk-toolbar button[title^="Eliminar"]').click();
    assert.deepEqual(await page.evaluate(()=>({deck:JSON.stringify(S.deck),undo:S.undo.length})),antes);
    await page.locator('#stageInner .blk-toolbar button[title="Más acciones…"]').click();
    await page.locator('.menu').getByRole('button',{name:/Duplicar/}).click();
    assert.deepEqual(await page.evaluate(()=>({deck:JSON.stringify(S.deck),undo:S.undo.length})),antes);
    assert.match(await page.locator('#toasts .toast').last().innerText(),/Desbloquea/);
  });

  await t.test('a selection can be locked and unlocked together',async()=>{
    await reset();await page.evaluate(()=>{selectBlock('a');selectBlock('c',true);});
    await page.locator('#stageInner .blk-toolbar button[title="Más acciones…"]').click();
    const bloquear=page.locator('.menu').getByRole('button',{name:'Bloquear selección'});
    assert.equal(await bloquear.count(),1);await bloquear.click();
    assert.deepEqual(await page.evaluate(()=>['a','c'].map(id=>findBlock(id).block.locked)),[true,true]);
    await page.locator('#stageInner .blk-toolbar').getByRole('button',{name:'Desbloquear selección'}).click();
    assert.deepEqual(await page.evaluate(()=>['a','c'].map(id=>findBlock(id).block.locked)),[false,false]);
    await page.evaluate(()=>doUndo());assert.deepEqual(await page.evaluate(()=>['a','c'].map(id=>findBlock(id).block.locked)),[true,true]);
  });

  await t.test('selection actions have descriptive names for assistive technology',async()=>{
    await reset();await page.evaluate(()=>{selectBlock('a');selectBlock('c',true);});
    const barra=page.locator('#stageInner .blk-toolbar');
    assert.equal(await barra.getByRole('button',{name:'Adelantar selección'}).count(),1);
    assert.equal(await barra.getByRole('button',{name:'Retrasar selección'}).count(),1);
    assert.equal(await barra.getByRole('button',{name:'Eliminar selección'}).count(),1);
  });

  await t.test('a stale batch selection is rejected instead of partially duplicating it',async()=>{
    await reset();
    const r=await page.evaluate(()=>{
      const antes=JSON.stringify(S.deck),undo=S.undo.length;let error='';
      try {aplicaLoteBloques(S.deck,curSlide(),['a','ausente'],'duplicar');}catch(e){error=e.message;}
      return {intacto:antes===JSON.stringify(S.deck),undo:undo===S.undo.length,error};
    });
    assert.equal(r.intacto,true);assert.equal(r.undo,true);assert.match(r.error,/selección|bloque/i);
  });

  await t.test('traditional layouts retain their block order controls and duplication',async()=>{
    await reset();await page.evaluate(()=>{curSlide().lienzoLibre=false;snapNow();renderAll();selectBlock('b');});
    await page.locator('[data-pestana="bloque"]').click();await page.locator('[data-control="subir"]').click();
    assert.deepEqual(await page.evaluate(()=>curSlide().blocks.map(b=>b.id)),['b','a']);
    await page.locator('[data-control="duplicar-bloque"]').click();
    const r=await page.evaluate(()=>({ids:curSlide().blocks.map(b=>b.id),pos:deepCopy(findBlock(S.selBlock).block.posLibre)}));
    assert.equal(r.ids.length,3);assert.deepEqual(r.pos,{x:24,y:24,w:30,h:25});
  });

  await t.test('clicking a layer action while editing text saves the text and performs the action',async()=>{
    await reset();await page.evaluate(()=>selectBlock('a'));
    const texto=page.locator('#stageInner .blk[data-bid="a"] [data-edit]');
    await texto.click();await texto.fill('Texto actualizado');
    await page.locator('#stageInner .blk-toolbar button[title="Adelantar capa"]').click();
    assert.equal(await page.evaluate(()=>findBlock('a').block.text),'Texto actualizado');
    assert.deepEqual(await order(),['b','a','c','d']);
  });

  await t.test('undo and redo text before an earlier canvas movement',async()=>{
    await reset();await page.evaluate(()=>{selectBlock('a');aplicaPosicionLibre('a',{x:25,y:20,w:30,h:25});});
    const texto=page.locator('#stageInner .blk[data-bid="a"] [data-edit]');
    await texto.click();await texto.fill('Texto actualizado');await page.keyboard.press('Control+z');
    assert.deepEqual(await page.evaluate(()=>({texto:findBlock('a').block.text,x:findBlock('a').block.posLibre.x})),{texto:'A',x:25});
    await page.evaluate(()=>doRedo());
    assert.deepEqual(await page.evaluate(()=>({texto:findBlock('a').block.text,x:findBlock('a').block.posLibre.x})),{texto:'Texto actualizado',x:25});
    await page.evaluate(()=>doUndo());await page.evaluate(()=>doUndo());
    assert.deepEqual(await page.evaluate(()=>({texto:findBlock('a').block.text,x:findBlock('a').block.posLibre.x})),{texto:'A',x:20});
  });

  await t.test('undo and redo with no changes leave the cursor in the text',async()=>{
    await reset();await page.evaluate(()=>selectBlock('a'));
    const texto=page.locator('#stageInner .blk[data-bid="a"] [data-edit]');await texto.click();
    assert.equal(await page.evaluate(()=>S.undo.length),0);
    await page.keyboard.press('Control+z');
    assert.equal(await page.evaluate(()=>document.activeElement?.matches('[data-edit]')),true);
    await page.keyboard.press('Control+Shift+z');
    assert.equal(await page.evaluate(()=>document.activeElement?.matches('[data-edit]')),true);
  });

  await t.test('the first text edit can be undone even when no earlier history exists',async()=>{
    await reset();await page.evaluate(()=>selectBlock('a'));
    const texto=page.locator('#stageInner .blk[data-bid="a"] [data-edit]');await texto.click();await texto.fill('Primer cambio');
    await page.keyboard.press('Control+z');assert.equal(await page.evaluate(()=>findBlock('a').block.text),'A');
    await page.evaluate(()=>doRedo());assert.equal(await page.evaluate(()=>findBlock('a').block.text),'Primer cambio');
  });

  await t.test('an immediately duplicated object does not leave a pending inspector commit above undo',async()=>{
    await reset();await page.evaluate(()=>{selectBlock('a');abrePanelLateral('bloque');});
    await page.evaluate(()=>{
      const props=document.querySelector('#inspBody .blk-props');
      [...props.querySelectorAll('button')].find(b=>b.textContent==='Grande').click();
      [...document.querySelectorAll('#inspBody button')].find(b=>b.textContent.includes('Duplicar')).click();
    });
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(()=>zonas(curSlide()).flat().length),5);
    await page.evaluate(()=>doUndo());
    assert.equal(await page.evaluate(()=>zonas(curSlide()).flat().length),4);
    assert.equal(await page.evaluate(()=>findBlock('a').block.size),'l');
    await page.evaluate(()=>doUndo());assert.equal(await page.evaluate(()=>findBlock('a').block.size),'n');
  });

  await t.test('undo immediately after an inspector change restores the previous value',async()=>{
    await reset();await page.evaluate(()=>{selectBlock('a');abrePanelLateral('bloque');});
    await page.evaluate(()=>{
      [...document.querySelectorAll('#inspBody .blk-props button')].find(b=>b.textContent==='Grande').click();
      doUndo();
    });
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(()=>findBlock('a').block.size),'n');
    await page.evaluate(()=>doRedo());assert.equal(await page.evaluate(()=>findBlock('a').block.size),'l');
  });

  await t.test('quick edits to two different blocks keep separate undo steps',async()=>{
    await reset();await page.evaluate(()=>{selectBlock('a');abrePanelLateral('bloque');});
    await page.evaluate(()=>{
      [...document.querySelectorAll('#inspBody .blk-props button')].find(b=>b.textContent==='Grande').click();
      selectBlock('b');
      [...document.querySelectorAll('#inspBody .blk-props button')].find(b=>b.textContent==='Grande').click();
    });
    await page.waitForTimeout(300);await page.evaluate(()=>doUndo());
    assert.deepEqual(await page.evaluate(()=>['a','b'].map(id=>findBlock(id).block.size)),['l','n']);
    await page.evaluate(()=>doUndo());assert.deepEqual(await page.evaluate(()=>['a','b'].map(id=>findBlock(id).block.size)),['n','n']);
  });

  await t.test('unlocking from the inspector applies to the whole selected set',async()=>{
    await reset();await page.evaluate(()=>{selectBlock('a');selectBlock('c',true);cambiaBloqueoSeleccion(true);abrePanelLateral('bloque');});
    await page.locator('#inspBody .blk-props').getByRole('button',{name:/Desbloquear/}).click();
    assert.deepEqual(await page.evaluate(()=>['a','c'].map(id=>findBlock(id).block.locked)),[false,false]);
  });

  await t.test('moving to another slide is explicitly labelled as a single active-block action',async()=>{
    await reset();await page.evaluate(()=>{selectBlock('a');selectBlock('c',true);});
    await page.locator('#stageInner .blk-toolbar button[title="Más acciones…"]').click();
    assert.equal(await page.locator('.menu').getByRole('button',{name:/Mover bloque activo a otra diapositiva/}).count(),1);
  });
  assert.deepEqual(errors,[]);
});
