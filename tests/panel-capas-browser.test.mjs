/* SPDX-License-Identifier: AGPL-3.0-only */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
import {AxeBuilder} from '@axe-core/playwright';

test('the layers panel stays usable while editing the free canvas', {timeout:180000}, async t=>{
  const bin=process.env.ERLEN_CHROMIUM||'/usr/bin/chromium';
  if(!existsSync(bin)){t.skip('Chromium is required.');return;}
  const port=Number(process.env.ERLEN_PANEL_CAPAS_PORT||4445);
  const server=spawn(process.execPath,[fileURLToPath(new URL('../herramientas/serve.mjs',import.meta.url))],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
  t.after(()=>server.kill());
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',c=>reject(Error('Server exited: '+c)));});
  const browser=await chromium.launch({executablePath:bin,args:['--no-sandbox']});t.after(()=>browser.close());
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];t.after(()=>context.close());
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(5000);
  await page.goto('http://127.0.0.1:'+port+'/');
  const reset=()=>page.evaluate(()=>{
    const d=blankDeck(),s={id:'panel',layout:'blanco',title:'',lienzoLibre:true,blocks:[]};
    for(const [id,x,y] of [['a',10,15],['b',48,15],['c',10,15],['d',75,55]]){
      const b=newBlock('text');Object.assign(b,{id,text:id.toUpperCase(),posLibre:{x,y,w:20,h:20}});s.blocks.push(b);
    }
    d.slides.push(s);loadDeck(d,null,true);wsCerrar();S.cur=1;S.selBlock=null;snapNow();renderAll();
  });
  const panel=page.getByRole('region',{name:'Capas de la diapositiva'});
  const abrir=async()=>{await page.locator('#lienzoObjetosBtn').click();await panel.waitFor();};
  const orden=()=>page.evaluate(()=>bloquesEnCapas(curSlide()).map(b=>b.id));
  const filas=()=>panel.locator('[data-capa-fila]').evaluateAll(els=>els.map(el=>el.dataset.capaFila));
  const llevar=async (desde,hacia,parte='antes')=>{
    const handle=panel.locator('[data-capa-fila="'+desde+'"] [data-capa-arrastrar]'),destino=panel.locator('[data-capa-fila="'+hacia+'"]');
    await handle.waitFor({state:'visible'});await destino.waitFor({state:'visible'});
    const a=await handle.boundingBox(),b=await destino.boundingBox();assert.ok(a&&b);
    await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();
    await page.mouse.move(b.x+b.width/2,b.y+(parte==='antes'?5:b.height-5),{steps:8});
    await page.waitForFunction(({id,parte})=>document.querySelector('[data-capa-fila="'+id+'"]')?.dataset.insercion===parte,{id:hacia,parte});
    await page.mouse.up();
  };

  await t.test('selection follows the canvas in both directions without closing or blocking it',async()=>{
    await reset();await abrir();
    assert.equal(await page.locator('#app').evaluate(el=>el.inert),false);
    assert.equal(await page.locator('#modalRoot .mask').count(),0);
    assert.deepEqual(await filas(),['d','c','b','a']);
    await panel.getByRole('checkbox',{name:'Marcar A'}).check();
    await panel.getByRole('checkbox',{name:'Marcar C'}).check();
    assert.deepEqual((await page.evaluate(()=>[...idsSeleccionados()])).sort(),['a','c']);
    assert.equal(await page.locator('#stageInner .blk.sel-lote').count(),2);
    await page.locator('#stageInner .blk[data-bid="b"]').click({position:{x:8,y:8}});
    assert.equal(await panel.isVisible(),true);
    assert.equal(await panel.getByRole('checkbox',{name:'Marcar A'}).isChecked(),false);
    assert.equal(await panel.getByRole('checkbox',{name:'Marcar B'}).isChecked(),true);
    await panel.locator('[data-capa-fila="a"] .lienzo-lista-nombre').click();
    assert.equal(await page.evaluate(()=>S.selBlock),'a');
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.bid),'a');
    assert.equal(await panel.isVisible(),true);
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(()=>findBlock('a').block.posLibre.x),11);
  });

  await t.test('the first layer control click commits text editing even when that row changes',async()=>{
    await reset();if(!(await panel.isVisible()))await abrir();
    await page.locator('#stageInner .blk[data-bid="b"] [data-edit]').click();
    await page.keyboard.press('End');await page.keyboard.type(' nuevo');
    await panel.locator('[data-capa-fila="b"] .lienzo-lista-nombre').click();
    assert.equal(await page.evaluate(()=>findBlock('b').block.text),'B nuevo');
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.bid),'b');
    await page.waitForFunction(()=>document.querySelector('[data-capa-fila="b"]')?.textContent.includes('B nuevo'));
    assert.match(await panel.locator('[data-capa-fila="b"]').textContent(),/B nuevo/);
    await page.locator('#stageInner .blk[data-bid="b"] [data-edit]').click();
    await page.keyboard.press('End');await page.keyboard.type(' más');
    await panel.getByRole('checkbox',{name:'Marcar B nuevo'}).uncheck();
    assert.equal(await page.evaluate(()=>findBlock('b').block.text),'B nuevo más');
    assert.equal(await page.evaluate(()=>idsSeleccionados().has('b')),false);
  });

  await t.test('dragging and keyboard controls change the visible stack and undo in one step',async()=>{
    await reset();if(!(await panel.isVisible()))await abrir();
    const antes=await page.evaluate(()=>S.undo.length);
    await llevar('a','c','antes');
    assert.deepEqual(await orden(),['b','c','a','d']);
    assert.deepEqual(await filas(),['d','a','c','b']);
    assert.equal(await page.evaluate(()=>S.undo.length),antes+1);
    assert.deepEqual(await page.evaluate(()=>Array.from(renderSlide(S.deck,S.cur,'present',99).querySelectorAll('.lienzo-capa .blk[data-bid]')).map(el=>el.dataset.bid)),['b','c','a','d']);
    await page.keyboard.press('Control+z');assert.deepEqual(await orden(),['a','b','c','d']);
    await page.keyboard.press('Control+Shift+z');assert.deepEqual(await orden(),['b','c','a','d']);
    await panel.getByRole('button',{name:'Retrasar capa A'}).focus();await page.keyboard.press('Enter');
    assert.deepEqual(await orden(),['b','a','c','d']);
    assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Retrasar capa A');
    const guardado=await page.evaluate(()=>saneaDeck(JSON.parse(JSON.stringify(S.deck))).deck.slides[1].blocks.map(b=>({id:b.id,capa:b.capaLibre})));
    assert.deepEqual(guardado.map(x=>x.capa),[1,0,2,3]);
  });

  await t.test('moving multiple layers preserves their order and locked selections are atomic',async()=>{
    await reset();if(!(await panel.isVisible()))await abrir();
    await panel.getByRole('checkbox',{name:'Marcar A'}).check();await panel.getByRole('checkbox',{name:'Marcar C'}).check();
    await llevar('c','d','antes');
    assert.deepEqual(await orden(),['b','d','a','c']);
    assert.deepEqual((await page.evaluate(()=>[...idsSeleccionados()])).sort(),['a','c']);
    await page.keyboard.press('Control+z');assert.deepEqual(await orden(),['a','b','c','d']);
    await panel.getByRole('checkbox',{name:'Marcar A'}).check();await panel.getByRole('checkbox',{name:'Marcar C'}).check();
    await panel.getByRole('button',{name:'Bloquear capa A'}).click();
    assert.equal(await page.evaluate(()=>findBlock('a').block.locked),true);
    const previo=await page.evaluate(()=>({json:JSON.stringify(S.deck),undo:S.undo.length}));
    assert.equal(await panel.getByRole('button',{name:/Adelantar selección desde C/}).isDisabled(),true);
    await panel.locator('[data-capa-fila="c"] [data-capa-arrastrar]').evaluate(el=>{
      const dt=new DataTransfer();el.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:dt}));
      document.querySelector('[data-capa-fila="d"]').dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt,clientY:0}));
    });
    assert.deepEqual(await page.evaluate(()=>({json:JSON.stringify(S.deck),undo:S.undo.length})),previo);
    await panel.getByRole('button',{name:'Desbloquear capa A'}).click();
    assert.equal(await page.evaluate(()=>findBlock('a').block.locked),false);
  });

  await t.test('the panel follows slide changes and handles blocks hidden at the current level',async()=>{
    await reset();if(!(await panel.isVisible()))await abrir();
    await page.evaluate(()=>{findBlock('b').block.nivel='comite';S.deck.meta.nivel='congreso';renderAll();});
    await page.waitForFunction(()=>document.querySelector('[data-capa-fila="b"] input')?.disabled === true);
    assert.equal(await panel.getByRole('checkbox',{name:'Marcar B'}).isDisabled(),true);
    assert.match(await panel.locator('[data-capa-fila="b"]').textContent(),/oculto en este nivel/i);
    await page.evaluate(()=>{S.cur=0;S.selBlock=null;renderAll();});
    assert.equal(await panel.isVisible(),true);
    assert.match(await panel.textContent(),/lienzo libre/i);
    await page.evaluate(()=>{S.cur=1;renderAll();});
    assert.deepEqual(await filas(),['d','c','b','a']);
    await panel.getByRole('button',{name:'Cerrar panel de capas'}).click();
    assert.equal(await panel.isVisible(),false);
    assert.equal(await page.locator('#panelCapas [data-capa-fila]').count(),0,'Closed panels should release their references to the presentation');
  });

  await t.test('an obsolete drag never overwrites a changed order or a different slide',async()=>{
    await reset();if(!(await panel.isVisible()))await abrir();
    const r=await page.evaluate(()=>{
      const source=document.querySelector('[data-capa-fila="a"] [data-capa-arrastrar]'),target=document.querySelector('[data-capa-fila="c"]');
      const dt=new DataTransfer();source.dispatchEvent(new DragEvent('dragstart',{bubbles:true,cancelable:true,dataTransfer:dt}));
      findBlock('d').block.capaLibre=20;
      const antes=JSON.stringify(S.deck),pasos=S.undo.length;
      target.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt,clientY:0}));
      const primer=JSON.stringify(S.deck)===antes && S.undo.length===pasos;
      renderAll();const source2=document.querySelector('[data-capa-fila="a"] [data-capa-arrastrar]'),target2=document.querySelector('[data-capa-fila="c"]');
      const dt2=new DataTransfer();source2.dispatchEvent(new DragEvent('dragstart',{bubbles:true,cancelable:true,dataTransfer:dt2}));
      S.cur=0;S.selBlock=null;renderAll();const antes2=JSON.stringify(S.deck),pasos2=S.undo.length;
      target2.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt2,clientY:0}));
      return {primer,segundo:JSON.stringify(S.deck)===antes2 && S.undo.length===pasos2};
    });
    assert.deepEqual(r,{primer:true,segundo:true});
  });

  await t.test('a stale layer action cannot lock a replacement object with the same id',async()=>{
    await reset();if(!(await panel.isVisible()))await abrir();
    const r=await page.evaluate(()=>{
      const boton=document.querySelector('[data-capa-fila="a"] [data-capa-accion="bloqueo"]'),f=findBlock('a');
      const reemplazo={...f.block,text:'Reemplazo',locked:false};f.arr[f.i]=reemplazo;
      const pasos=S.undo.length;boton.click();
      return {bloqueado:reemplazo.locked,pasos:S.undo.length-pasos};
    });
    assert.deepEqual(r,{bloqueado:false,pasos:0});
  });

  await t.test('an obsolete drag cannot reorder a replacement object with the same id',async()=>{
    await reset();if(!(await panel.isVisible()))await abrir();
    const r=await page.evaluate(()=>{
      const source=document.querySelector('[data-capa-fila="a"] [data-capa-arrastrar]'),target=document.querySelector('[data-capa-fila="c"]');
      const dt=new DataTransfer();source.dispatchEvent(new DragEvent('dragstart',{bubbles:true,cancelable:true,dataTransfer:dt}));
      const f=findBlock('a');f.arr[f.i]={...f.block,text:'Reemplazo'};
      const antes=JSON.stringify(S.deck),pasos=S.undo.length;
      target.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt,clientY:0}));
      return {igual:JSON.stringify(S.deck)===antes,pasos:S.undo.length-pasos};
    });
    assert.deepEqual(r,{igual:true,pasos:0});
  });

  await t.test('losing window focus during a pointer interaction releases pending panel updates',async()=>{
    await reset();if(!(await panel.isVisible()))await abrir();
    await page.evaluate(()=>{
      const elemento=document.querySelector('[data-capa-fila="a"] .lienzo-lista-nombre');
      elemento.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0}));
      findBlock('a').block.text='Actualizado';renderAll();
      window.dispatchEvent(new Event('blur'));
    });
    await page.waitForFunction(()=>document.querySelector('[data-capa-fila="a"]')?.textContent.includes('Actualizado'));
  });

  await t.test('group selection, thumbnails and saved projects retain scientific image data',async()=>{
    await reset();if(!(await panel.isVisible()))await abrir();
    const original=await page.evaluate(()=>{
      const a=findBlock('a').block,b=findBlock('b').block;a.group=b.group='grupo';
      const im=newBlock('image');Object.assign(im,{id:'figura',alt:'Imagen ilustrativa',src:'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="60"%3E%3Crect width="100" height="60" fill="%23278978"/%3E%3C/svg%3E',posLibre:{x:10,y:65,w:30,h:20}});
      curSlide().blocks.push(im);snapNow();renderAll();return im.src;
    });
    await panel.getByRole('checkbox',{name:'Marcar A'}).check();
    assert.equal(await panel.getByRole('checkbox',{name:'Marcar B'}).isChecked(),true);
    assert.deepEqual((await page.evaluate(()=>[...idsSeleccionados()])).sort(),['a','b']);
    assert.equal(await panel.locator('[data-capa-fila="figura"] .capa-mini img').getAttribute('src'),original);
    await llevar('a','figura','antes');
    assert.deepEqual(await orden(),['c','d','figura','a','b']);
    const datos=await page.evaluate(async()=>{
      let guardado='';const previo=window.__TAURI__;
      window.__TAURI__={core:{invoke:async (cmd,args)=>{
        if(cmd==='guardar_archivo_proyecto_como'){guardado=args.contenido;return {id:1,nombre:'capas.json'};}
        if(cmd==='abrir_archivo_proyecto')return {id:2,nombre:'capas.json',contenido:guardado};
        if(cmd==='cerrar_archivo_proyecto')return null;throw Error('Comando inesperado: '+cmd);
      }}};
      try {
        const ext=await extensionSlides('exportador'),html=await (await ext.creaHTML(S.deck)).text(),ppt=await ext.creaPPTX(S.deck);
        const zip=await window.JSZip.loadAsync(ppt.blob),xml=await zip.file('ppt/slides/slide2.xml').async('string');
        await guardarProyectoEscritorio(true);await abrirProyectoEscritorio();
        return {html,xml,orden:bloquesEnCapas(S.deck.slides[1]).map(b=>b.id),src:S.deck.slides[1].blocks.find(b=>b.id==='figura').src};
      } finally {window.__TAURI__=previo;}
    });
    assert.deepEqual(datos.orden,['c','d','figura','a','b']);assert.equal(datos.src,original);
    assert.ok(datos.html.indexOf('data-bid="c"')<datos.html.indexOf('data-bid="a"') && datos.html.indexOf('data-bid="a"')<datos.html.indexOf('data-bid="b"'));
    assert.ok(datos.xml.indexOf('>C<')<datos.xml.indexOf('>A<') && datos.xml.indexOf('>A<')<datos.xml.indexOf('>B<'));
  });

  await t.test('the panel remains accessible and leaves a usable canvas at narrow widths',async()=>{
    await page.setViewportSize({width:390,height:844});await reset();if(!(await panel.isVisible()))await abrir();
    const dimensiones=await page.evaluate(()=>{
      const p=document.querySelector('#panelCapas').getBoundingClientRect(),c=document.querySelector('#canvasScroll').getBoundingClientRect();
      return {ancho:document.documentElement.scrollWidth,ventana:innerWidth,panel:{left:p.left,right:p.right,top:p.top},lienzo:{height:c.height,bottom:c.bottom}};
    });
    assert.ok(dimensiones.ancho<=dimensiones.ventana+1 && dimensiones.panel.left>=0 && dimensiones.panel.right<=dimensiones.ventana+1,JSON.stringify(dimensiones));
    assert.ok(dimensiones.lienzo.height>80 && dimensiones.lienzo.bottom<=dimensiones.panel.top+1,JSON.stringify(dimensiones));
    const axe=await new AxeBuilder({page}).include('#panelCapas').analyze();
    assert.deepEqual(axe.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id),[]);
    await panel.getByRole('button',{name:'Cerrar panel de capas'}).click();
    assert.equal(await panel.isVisible(),false);
    await page.setViewportSize({width:1440,height:1000});
  });

  await t.test('landscape on a short screen leaves complete layer rows usable',async()=>{
    await page.setViewportSize({width:844,height:390});await reset();if(!(await panel.isVisible()))await abrir();
    for(const size of [{width:844,height:390},{width:740,height:360}]){
      await page.setViewportSize(size);
      const r=await page.evaluate(()=>{
        const lista=document.querySelector('#panelCapas .capas-lista').getBoundingClientRect();
        const fila=document.querySelector('#panelCapas [data-capa-fila]')?.getBoundingClientRect();
        return {lista:{top:lista.top,bottom:lista.bottom,height:lista.height},fila:fila&&{top:fila.top,bottom:fila.bottom,height:fila.height}};
      });
      assert.ok(r.fila && r.lista.height>=r.fila.height+2 && r.fila.bottom<=r.lista.bottom+1,JSON.stringify({size,...r}));
      const marca=panel.getByRole('checkbox',{name:'Marcar D'});if(await marca.isChecked())await marca.uncheck();await marca.check();
      assert.equal(await page.evaluate(()=>idsSeleccionados().has('d')),true);
    }
    await panel.getByRole('button',{name:'Cerrar panel de capas'}).click();
    await page.setViewportSize({width:1440,height:1000});
  });

  await t.test('the layers panel can be opened on an empty free slide and follows the first insertion',async()=>{
    await reset();await page.evaluate(()=>{curSlide().blocks=[];snapNow();renderAll();});
    if(await panel.isVisible())await panel.getByRole('button',{name:'Cerrar panel de capas'}).click();
    await abrir();assert.match(await panel.textContent(),/todavía no tiene capas/i);
    await page.evaluate(()=>{const b=newBlock('text');b.id='nuevo';b.text='Primera capa';curSlide().blocks.push(b);commit();});
    assert.equal(await panel.getByRole('checkbox',{name:'Marcar Primera capa'}).count(),1);
  });

  await t.test('the panel has no serious accessibility violations in light or dark mode',async()=>{
    await reset();if(!(await panel.isVisible()))await abrir();
    for(const colorScheme of ['light','dark']){
      await page.emulateMedia({colorScheme});
      const axe=await new AxeBuilder({page}).include('#panelCapas').analyze();
      assert.deepEqual(axe.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id),[],colorScheme);
    }
  });
  assert.deepEqual(errors,[]);
});
