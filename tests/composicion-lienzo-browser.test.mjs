/* SPDX-License-Identifier: AGPL-3.0-only */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
import {AxeBuilder} from '@axe-core/playwright';

test('free canvas composition with real pointer and keyboard input', {timeout:120000}, async t => {
  const bin = process.env.ERLEN_CHROMIUM || '/usr/bin/chromium';
  if (!existsSync(bin)) { t.skip('Chromium is required.'); return; }
  const port = Number(process.env.ERLEN_COMPOSICION_TEST_PORT || 4243);
  const server = spawn(process.execPath, [fileURLToPath(new URL('../herramientas/serve.mjs', import.meta.url))],
    {env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
  t.after(()=>server.kill());
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',c=>reject(new Error('Server exited: '+c)));});
  const browser=await chromium.launch({executablePath:bin,args:['--no-sandbox']});
  t.after(()=>browser.close());
  const context=await browser.newContext({viewport:{width:1440,height:1000}}), page=await context.newPage(), errores=[];
  page.setDefaultTimeout(5000); page.on('pageerror',e=>errores.push(e.message));
  await page.goto('http://127.0.0.1:'+port+'/');
  async function reset() {
    await page.evaluate(()=>{
      const deck=blankDeck(), slide={id:'composicion',layout:'blanco',title:'',lienzoLibre:true,blocks:[]};
      for(const [id,x,y,w,h] of [['a',10,20,20,20],['b',50,20,20,20],['c',75,65,15,15]]) {
        const b=newBlock('text');Object.assign(b,{id,text:id.toUpperCase(),posLibre:{x,y,w,h}});slide.blocks.push(b);
      }
      deck.slides.push(slide);wsNueva(deck);S.cur=1;snapNow();renderAll();
    });
  }
  const posiciones=()=>page.evaluate(()=>['a','b','c'].map(id=>({...findBlock(id).block.posLibre})));
  const seleccion=()=>page.evaluate(()=>[...idsSeleccionados()].sort());
  const caja=()=>page.locator('#stageInner .slide').boundingBox();

  await t.test('marquee selects the intersected blocks and Escape cancels another gesture',async()=>{
    await reset();
    const r=await caja();
    await page.mouse.move(r.x+r.width*.05,r.y+r.height*.15);await page.mouse.down();
    await page.mouse.move(r.x+r.width*.72,r.y+r.height*.45,{steps:5});
    assert.equal(await page.locator('#stageInner .lienzo-marquee').count(),1);
    await page.mouse.up();
    assert.deepEqual(await seleccion(),['a','b']);
    await page.mouse.move(r.x+r.width*.72,r.y+r.height*.55);await page.mouse.down();
    await page.mouse.move(r.x+r.width*.96,r.y+r.height*.9,{steps:5});
    await page.keyboard.press('Escape');await page.mouse.up();
    assert.deepEqual(await seleccion(),['a','b']);
    assert.equal(await page.locator('#stageInner .lienzo-marquee').count(),0);
  });

  await t.test('a shifted marquee adds visible blocks and ordinary text editing remains usable',async()=>{
    await reset();await page.evaluate(()=>{selectBlock('a');});
    const r=await caja();
    await page.keyboard.down('Shift');
    await page.mouse.move(r.x+r.width*.72,r.y+r.height*.55);await page.mouse.down();
    await page.mouse.move(r.x+r.width*.96,r.y+r.height*.9,{steps:5});await page.mouse.up();
    await page.keyboard.up('Shift');
    assert.deepEqual(await seleccion(),['a','c']);
    await page.locator('#stageInner .blk[data-bid="b"] [data-edit]').click();
    await page.keyboard.type(' editable');
    await page.locator('#lienzoImanBtn').click();
    assert.equal(await page.evaluate(()=>findBlock('b').block.text),'B editable');
  });

  await t.test('the selection frame resizes every selected block proportionally and undoes together',async()=>{
    await reset();await page.evaluate(()=>{selectBlock('a');selectBlock('b',true);});
    mkdirSync(fileURLToPath(new URL('../.local/',import.meta.url)),{recursive:true});
    await page.screenshot({path:fileURLToPath(new URL('../.local/composicion-escritorio.png',import.meta.url))});
    const lienzo=await page.locator('#stageInner .slide').boundingBox(), controles=await page.locator('#lienzoComposicion').boundingBox();
    assert.ok(controles.y>=lienzo.y+lienzo.height || controles.x+controles.width<=lienzo.x,
      'La barra de formas y organización no debe tapar la diapositiva: '+JSON.stringify({lienzo,controles}));
    const antes=await posiciones(), r=await caja();
    const asa=page.getByRole('button',{name:'Cambiar tamaño de la selección: esquina inferior derecha'});
    const a=await asa.boundingBox();
    await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();
    await page.mouse.move(a.x+a.width/2+r.width*.12,a.y+a.height/2+r.height*.04,{steps:5});await page.mouse.up();
    const despues=await posiciones();
    assert.ok(despues[0].w>antes[0].w && despues[1].w>antes[1].w,JSON.stringify({antes,despues}));
    assert.ok(Math.abs(despues[0].w/antes[0].w-despues[1].w/antes[1].w)<.002,JSON.stringify({antes,despues}));
    assert.deepEqual(despues[2],antes[2]);
    await page.evaluate(()=>doUndo());assert.deepEqual(await posiciones(),antes);
  });

  await t.test('keyboard resizing works for a group and a changed block cancels a pending resize',async()=>{
    await reset();await page.evaluate(()=>{selectBlock('a');selectBlock('b',true);enfocaBloqueLibre('b');});
    const antes=await posiciones();await page.keyboard.press('Shift+ArrowRight');
    assert.ok((await posiciones())[0].w>antes[0].w);
    await page.evaluate(()=>{doUndo();selectBlock('a');selectBlock('b',true);});
    const r=await caja(), a=await page.getByRole('button',{name:'Cambiar tamaño de la selección: esquina inferior derecha'}).boundingBox();
    await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();
    await page.mouse.move(a.x+a.width/2+r.width*.08,a.y+a.height/2+r.height*.05,{steps:4});
    await page.evaluate(()=>{findBlock('b').block.posLibre.x=55;});await page.mouse.up();
    const actual=await posiciones();
    assert.deepEqual(actual[0],antes[0]);assert.equal(actual[1].x,55);assert.equal(actual[1].w,antes[1].w);
  });

  await t.test('alignment is available from the canvas using keyboard-accessible controls',async()=>{
    await reset();await page.evaluate(()=>{selectBlock('a');selectBlock('b',true);selectBlock('c',true);});
    await page.getByRole('button',{name:'Organizar selección'}).click();
    await page.getByRole('button',{name:'Alinear a la izquierda'}).click();
    assert.deepEqual((await posiciones()).map(p=>p.x),[10,10,10]);
    await page.evaluate(()=>doUndo());assert.deepEqual((await posiciones()).map(p=>p.x),[10,50,75]);
  });

  await t.test('the organize control follows selections made in the layers list and changes of the active block',async()=>{
    await reset();await page.locator('#lienzoObjetosBtn').click();
    await page.getByRole('checkbox',{name:'Marcar A'}).check();
    await page.getByRole('checkbox',{name:'Marcar B'}).check();
    await page.getByRole('button',{name:'Seleccionar marcados'}).click();
    assert.deepEqual(await seleccion(),['a','b']);
    assert.equal(await page.getByRole('button',{name:'Organizar selección'}).isEnabled(),true);
    await page.locator('#stageInner .blk[data-bid="a"]').click({position:{x:40,y:40}});
    assert.deepEqual(await seleccion(),['a','b']);
    assert.equal(await page.getByRole('button',{name:'Organizar selección'}).isEnabled(),true);
  });

  await t.test('basic shapes are inserted as editable local figure blocks',async()=>{
    await reset();
    await page.getByRole('button',{name:'Insertar formas'}).click();
    await page.getByRole('button',{name:'Rectángulo',exact:true}).click();
    await page.waitForFunction(()=>curSlide().blocks.some(b=>b.formaLibre==='rect'));
    const figura=await page.evaluate(()=>curSlide().blocks.find(b=>b.formaLibre==='rect'));
    assert.equal(figura.type,'image');assert.equal(figura.figura.objects[0].kind,'rect');
    assert.match(figura.src,/^data:image\/svg\+xml/);
    assert.equal(await page.locator('#stageInner .blk[data-bid="'+figura.id+'"] img').count(),1);
    await page.screenshot({path:fileURLToPath(new URL('../.local/formas-lienzo.png',import.meta.url))});
    await page.evaluate(()=>doUndo());assert.equal(await page.evaluate(()=>curSlide().blocks.some(b=>b.formaLibre==='rect')),false);
  });

  await t.test('inserting a shape after a slow load saves text typed while it was loading',async()=>{
    const ctx=await browser.newContext({viewport:{width:1440,height:1000}});
    let llega,liberar;const pedida=new Promise(r=>{llega=r;}), espera=new Promise(r=>{liberar=r;});
    try {
      await ctx.route('**/libre/figuras-core.mjs',async ruta=>{llega();await espera;await ruta.continue();});
      const p=await ctx.newPage();p.setDefaultTimeout(5000);await p.goto('http://127.0.0.1:'+port+'/');
      await p.evaluate(()=>{
        const deck=blankDeck(), b=newBlock('text');Object.assign(b,{id:'espera',text:'A',posLibre:{x:10,y:20,w:20,h:20}});
        deck.slides.push({id:'espera-slide',layout:'blanco',title:'',lienzoLibre:true,blocks:[b]});wsNueva(deck);S.cur=1;snapNow();renderAll();
      });
      await p.getByRole('button',{name:'Insertar formas'}).click();
      await p.getByRole('button',{name:'Rectángulo',exact:true}).click();
      await Promise.race([pedida,new Promise((_,reject)=>setTimeout(()=>reject(new Error('La carga de la figura no comenzó')),5000))]);
      await p.locator('#stageInner .blk[data-bid="espera"] [data-edit]').click();
      await p.keyboard.type(' pendiente');liberar();
      await p.waitForFunction(()=>curSlide().blocks.some(b=>b.formaLibre==='rect'));
      assert.equal(await p.evaluate(()=>findBlock('espera').block.text),'A pendiente');
      await p.evaluate(()=>doUndo());
      assert.equal(await p.evaluate(()=>findBlock('espera').block.text),'A pendiente');
      assert.equal(await p.evaluate(()=>curSlide().blocks.some(b=>b.formaLibre==='rect')),false);
    } finally { liberar();await ctx.close(); }
  });

  await t.test('all basic shapes survive project reopening without renumbering scientific figures',async()=>{
    await reset();
    for (const nombre of ['Rectángulo','Elipse','Línea','Flecha']) {
      await page.getByRole('button',{name:'Insertar formas'}).click();
      await page.getByRole('button',{name:nombre,exact:true}).click();
      await page.waitForFunction(n => curSlide().blocks.filter(b=>b.formaLibre).length===n, ['Rectángulo','Elipse','Línea','Flecha'].indexOf(nombre)+1);
    }
    const resultado=await page.evaluate(async()=>{
      const core=await extensionSlides('figurascore');
      const figuras=curSlide().blocks.filter(b=>b.formaLibre);
      figuras.forEach(b=>core.validaFigura(b.figura));
      const ciencia=newBlock('image');Object.assign(ciencia,{id:'ciencia',alt:'Micrografía ilustrativa',caption:'Micrografía',
        src:'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100"/%3E%3C/svg%3E'});
      curSlide().blocks.push(ciencia);materializaPosicionesLibres(curSlide());
      const p=renderSlide(S.deck,S.cur,'present',0), rotulo=p.querySelector('.blk[data-bid="ciencia"] .cap-label')?.textContent;
      const copia=saneaDeck(JSON.parse(JSON.stringify(S.deck))).deck;
      return {tipos:figuras.map(b=>b.formaLibre),objetos:figuras.map(b=>b.figura.objects[0].kind),rotulo,
        reabiertos:copia.slides[S.cur].blocks.filter(b=>b.formaLibre).map(b=>b.formaLibre)};
    });
    assert.deepEqual(resultado.tipos,['rect','circle','line','arrow']);
    assert.deepEqual(resultado.objetos,['rect','circle','rect','arrow']);
    assert.equal(resultado.rotulo,'Figura 1: ');
    assert.deepEqual(resultado.reabiertos,resultado.tipos);
  });

  await t.test('a new shape remains visible in standalone HTML and appears in the PowerPoint package',async()=>{
    await reset();
    await page.getByRole('button',{name:'Insertar formas'}).click();
    await page.getByRole('button',{name:'Flecha',exact:true}).click();
    await page.waitForFunction(()=>curSlide().blocks.some(b=>b.formaLibre==='arrow'));
    const salida=await page.evaluate(async()=>{
      const id=curSlide().blocks.find(b=>b.formaLibre==='arrow').id, ext=await extensionSlides('exportador');
      const html=await ext.creaHTML(S.deck), ppt=await ext.creaPPTX(S.deck), zip=await window.JSZip.loadAsync(ppt.blob);
      return {id,html:await html.text(),xml:await zip.file('ppt/slides/slide2.xml').async('string'),medios:Object.keys(zip.files).filter(n=>n.startsWith('ppt/media/'))};
    });
    assert.match(salida.xml,/<p:pic>/);assert.ok(salida.medios.some(n=>/\.svg$/i.test(n)),JSON.stringify(salida.medios));
    const offline=await context.newPage();
    await offline.setContent(salida.html,{waitUntil:'load'});
    await offline.waitForFunction(()=>typeof presenter!=='undefined' && presenter.isReady());
    await offline.evaluate(()=>presenter.slide(1));
    const imagen=offline.locator('.present .blk[data-bid="'+salida.id+'"] img');
    assert.equal(await imagen.count(),1);
    assert.ok(await imagen.evaluate(el=>el.complete && el.naturalWidth>0));
    await offline.close();
  });

  await t.test('the canvas composition controls have accessible names in a narrow viewport',async()=>{
    await page.setViewportSize({width:390,height:844});
    await reset();await page.evaluate(()=>{selectBlock('a');selectBlock('b',true);});
    const {violations}=await new AxeBuilder({page}).include('#lienzoComposicion').analyze();
    assert.deepEqual(violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id),[]);
    const vista=await page.evaluate(()=>({ancho:document.documentElement.scrollWidth,ventana:innerWidth,
      formas:document.querySelector('#lienzoFormasBtn').getBoundingClientRect().toJSON()}));
    assert.ok(vista.ancho<=vista.ventana+1 && vista.formas.left>=0 && vista.formas.right<=vista.ventana,JSON.stringify(vista));
  });

  mkdirSync(fileURLToPath(new URL('../.local/',import.meta.url)),{recursive:true});
  await page.screenshot({path:fileURLToPath(new URL('../.local/composicion-lienzo.png',import.meta.url))});
  assert.deepEqual(errores,[]);
});
