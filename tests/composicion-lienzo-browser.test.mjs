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

  await t.test('canvas menus close with Escape and keep keyboard focus and selection',async()=>{
    await reset();
    const conectores=page.locator('#lienzoConectoresBtn'), menu=page.locator('.menu-conectores');
    await conectores.focus();await page.keyboard.press('Enter');
    assert.equal(await menu.getByRole('button',{name:'Selecciona dos objetos para conectar'}).isDisabled(),true);
    assert.equal(await menu.getAttribute('aria-label'),'Conectores');
    assert.equal(await menu.evaluate(el=>document.activeElement===el),true,'Un menú sin opciones activas recibe el foco');
    await page.keyboard.press('Escape');
    assert.equal(await menu.count(),0);
    assert.equal(await conectores.evaluate(el=>document.activeElement===el),true);
    const margenFoco=await conectores.evaluate(el=>{
      const tira=el.closest('.foot-izq').getBoundingClientRect(), boton=el.getBoundingClientRect();
      const estilo=getComputedStyle(el);
      return {izquierda:boton.left-tira.left,derecha:tira.right-boton.right,
        anillo:parseFloat(estilo.outlineWidth)+parseFloat(estilo.outlineOffset),visible:el.matches(':focus-visible')};
    });
    // El desplazamiento horizontal y los rectángulos pueden redondear a subpíxeles distintos.
    assert.ok(margenFoco.visible && margenFoco.anillo>=6 && margenFoco.izquierda>=margenFoco.anillo-.5 &&
      margenFoco.derecha>=margenFoco.anillo-.5,JSON.stringify(margenFoco));
    assert.deepEqual(await seleccion(),[]);

    await page.evaluate(()=>{selectBlock('a');selectBlock('b',true);});
    const formas=page.locator('#lienzoFormasBtn');
    await formas.focus();await page.keyboard.press('Enter');
    const rectangulo=page.getByRole('button',{name:'Rectángulo',exact:true});
    assert.equal(await rectangulo.evaluate(el=>document.activeElement===el),true);
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.getByRole('button',{name:'Elipse',exact:true}).evaluate(el=>document.activeElement===el),true);
    await page.keyboard.press('Escape');
    assert.equal(await rectangulo.count(),0);
    assert.equal(await formas.evaluate(el=>document.activeElement===el),true);
    assert.deepEqual(await seleccion(),['a','b']);

    await conectores.click();
    assert.equal(await page.getByRole('button',{name:'Conectar: A → B'}).evaluate(el=>document.activeElement===el),true);
    await page.keyboard.press('Escape');
    assert.equal(await menu.count(),0);
    assert.equal(await conectores.evaluate(el=>document.activeElement===el),true);
    assert.deepEqual(await seleccion(),['a','b']);
    assert.deepEqual(await page.evaluate(()=>curSlide().conectores || []),[]);

    await formas.focus();await page.keyboard.press('Enter');await page.keyboard.press('Tab');
    assert.equal(await page.getByRole('button',{name:'Elipse',exact:true}).evaluate(el=>document.activeElement===el),true);
    await page.keyboard.press('Shift+Tab');await page.keyboard.press('Shift+Tab');
    assert.equal(await rectangulo.count(),0);
    assert.equal(await formas.evaluate(el=>document.activeElement===el),true);
    await page.keyboard.press('Enter');await page.keyboard.press('ArrowUp');await page.keyboard.press('Tab');
    assert.equal(await rectangulo.count(),0);
    assert.equal(await page.locator('#lienzoCatalogoBtn').evaluate(el=>document.activeElement===el),true);
    await formas.focus();await page.keyboard.press('Enter');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
    await page.waitForFunction(()=>curSlide().blocks.some(b=>b.formaLibre==='circle'));
    await page.keyboard.press('Control+z');
    assert.equal(await page.evaluate(()=>curSlide().blocks.some(b=>b.formaLibre==='circle')),false);

    await page.evaluate(()=>selectBlock(null));
    await page.locator('#cinta [data-pestana=diapo]').click();
    const cinta=page.locator('#cinta [data-control=lienzo-conectores]');
    await cinta.focus();await page.keyboard.press('Enter');
    const menuCinta=page.getByRole('menu',{name:'Conectores'});
    assert.equal(await menuCinta.getByRole('menuitem',{name:'Selecciona dos objetos para conectar'}).isDisabled(),true);
    assert.equal(await menuCinta.evaluate(el=>document.activeElement===el),true,'La cinta permite cerrar un menú sin acciones activas');
    await page.keyboard.press('Escape');
    assert.equal(await menuCinta.count(),0);
    assert.equal(await cinta.getAttribute('aria-expanded'),'false');
    assert.equal(await cinta.evaluate(el=>document.activeElement===el),true);
    await page.locator('#cinta [data-pestana=inicio]').click();
  });

  await t.test('connectors follow a pointer gesture, cancel safely and can be removed and undone',async()=>{
    await reset();
    await page.evaluate(()=>cierraPanelCapas());
    await page.getByRole('button',{name:'Conectores'}).click();
    assert.equal(await page.getByRole('button',{name:'Selecciona dos objetos para conectar'}).isDisabled(),true);
    await page.keyboard.press('Escape');
    await page.locator('#lienzoObjetosBtn').click();
    await page.getByRole('checkbox',{name:'Marcar A'}).check();
    await page.getByRole('checkbox',{name:'Marcar B'}).check();
    await page.getByRole('button',{name:'Seleccionar marcados'}).click();
    await page.getByRole('button',{name:'Cerrar panel de capas'}).click();
    await page.getByRole('button',{name:'Conectores'}).click();
    await page.getByRole('button',{name:'Conectar: A → B'}).click();
    assert.deepEqual(await page.evaluate(()=>curSlide().conectores),[{desde:'a',hasta:'b'}]);
    const linea=page.locator('#stageInner .lienzo-conectores line');
    assert.equal(await page.locator('#stageInner .lienzo-conectores').getAttribute('aria-label'),'A hacia B');
    const original=await linea.evaluate(el=>['x1','y1','x2','y2'].map(k=>+el.getAttribute(k)));
    assert.deepEqual(original,[384,216,640,216]);
    await page.evaluate(()=>{S.prefs.imanLienzo=false;selectBlock('b');});
    const previo=await page.evaluate(()=>({...findBlock('b').block.posLibre}));
    const asa=await page.getByRole('button',{name:'Mover bloque'}).boundingBox();
    await page.mouse.move(asa.x+asa.width/2,asa.y+asa.height/2);await page.mouse.down();
    await page.mouse.move(asa.x+asa.width/2+50,asa.y+asa.height/2+35,{steps:5});
    assert.notDeepEqual(await linea.evaluate(el=>['x1','y1','x2','y2'].map(k=>+el.getAttribute(k))),original);
    assert.deepEqual(await page.evaluate(()=>({...findBlock('b').block.posLibre})),previo,'la vista previa aún no modifica el proyecto');
    await page.keyboard.press('Escape');await page.mouse.up();
    assert.deepEqual(await linea.evaluate(el=>['x1','y1','x2','y2'].map(k=>+el.getAttribute(k))),original);
    const asa2=await page.getByRole('button',{name:'Mover bloque'}).boundingBox();
    await page.mouse.move(asa2.x+asa2.width/2,asa2.y+asa2.height/2);await page.mouse.down();
    await page.mouse.move(asa2.x+asa2.width/2+50,asa2.y+asa2.height/2+35,{steps:5});await page.mouse.up();
    assert.notDeepEqual(await page.evaluate(()=>({...findBlock('b').block.posLibre})),previo);
    await page.evaluate(()=>doUndo());
    assert.deepEqual(await page.evaluate(()=>({...findBlock('b').block.posLibre})),previo);
    assert.deepEqual(await linea.evaluate(el=>['x1','y1','x2','y2'].map(k=>+el.getAttribute(k))),original);
    await page.getByRole('button',{name:'Conectores'}).click();
    await page.getByRole('button',{name:'Eliminar conexión: A → B'}).click();
    assert.equal(await linea.count(),0);
    await page.evaluate(()=>doUndo());assert.equal(await linea.count(),1);
  });

  await t.test('connector styles are editable, undoable and retained by project and copies',async()=>{
    await reset();await page.evaluate(()=>{selectBlock('a');selectBlock('b',true);});
    await page.getByRole('button',{name:'Conectores'}).click();
    await page.getByRole('button',{name:'Conectar: A → B'}).click();
    const abrir = async () => {
      await page.getByRole('button',{name:'Conectores'}).click();
      await page.getByRole('button',{name:'Editar conexión: A → B'}).click();
      return page.getByRole('dialog',{name:'Estilo de conexión'});
    };
    let dialogo = await abrir();
    assert.equal(await dialogo.getByLabel('Usar color del tema').isChecked(),true);
    assert.equal(await dialogo.getByLabel('Color personalizado').isDisabled(),true);
    const accesibilidad = await new AxeBuilder({page}).include('#modalRoot').analyze();
    assert.deepEqual(accesibilidad.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id),[]);
    await dialogo.getByLabel('Usar color del tema').uncheck();
    await dialogo.getByLabel('Color personalizado').fill('#bd325f');
    await dialogo.getByLabel('Grosor (1–8)').fill('7');
    await dialogo.getByLabel('Extremos').selectOption('ambos');
    await dialogo.getByRole('button',{name:'Aplicar'}).click();
    const esperado = {desde:'a',hasta:'b',color:'#bd325f',grosor:7,flecha:'ambos'};
    assert.deepEqual(await page.evaluate(()=>curSlide().conectores[0]),esperado);
    const linea = page.locator('#stageInner .lienzo-conectores line');
    assert.equal(await linea.getAttribute('stroke'),'#bd325f');
    assert.equal(await linea.getAttribute('stroke-width'),'7');
    assert.equal(await page.locator('#stageInner .lienzo-conectores path').count(),2);
    assert.deepEqual(await page.evaluate(()=>saneaDeck(JSON.parse(JSON.stringify(S.deck))).deck.slides[1].conectores[0]),esperado);
    await page.keyboard.press('Control+z');
    assert.deepEqual(await page.evaluate(()=>curSlide().conectores[0]),{desde:'a',hasta:'b'});
    await page.keyboard.press('Control+Shift+z');
    assert.deepEqual(await page.evaluate(()=>curSlide().conectores[0]),esperado);
    await page.evaluate(()=>{selectBlock('a');selectBlock('b',true);});
    await page.getByRole('button',{name:'Duplicar selección',exact:true}).first().click();
    const copia = await page.evaluate(()=>curSlide().conectores[1]);
    assert.notEqual(copia.desde,'a');assert.notEqual(copia.hasta,'b');
    assert.deepEqual({color:copia.color,grosor:copia.grosor,flecha:copia.flecha},
      {color:'#bd325f',grosor:7,flecha:'ambos'});
    await page.keyboard.press('Control+z');
    await page.keyboard.press('Control+d');
    const diapositiva = await page.evaluate(()=>curSlide().conectores[0]);
    assert.notEqual(diapositiva.desde,'a');assert.notEqual(diapositiva.hasta,'b');
    assert.deepEqual({color:diapositiva.color,grosor:diapositiva.grosor,flecha:diapositiva.flecha},
      {color:'#bd325f',grosor:7,flecha:'ambos'});
    await page.keyboard.press('Control+z');
    dialogo = await abrir();
    await dialogo.getByLabel('Usar color del tema').check();
    await dialogo.getByLabel('Grosor (1–8)').fill('3');
    await dialogo.getByLabel('Extremos').selectOption('ninguna');
    await dialogo.getByRole('button',{name:'Aplicar'}).click();
    assert.deepEqual(await page.evaluate(()=>curSlide().conectores[0]),{desde:'a',hasta:'b',flecha:'ninguna'});
    assert.equal(await page.locator('#stageInner .lienzo-conectores path').count(),0);
    assert.equal(await linea.getAttribute('stroke'),await page.evaluate(()=>temaDe(S.deck).fg));
    dialogo = await abrir();
    await page.evaluate(()=>{curSlide().conectores[0].grosor=8;});
    await dialogo.getByRole('button',{name:'Aplicar'}).click();
    assert.match(await dialogo.getByRole('status').textContent(),/conexión cambió/i);
    assert.equal(await page.evaluate(()=>curSlide().conectores[0].grosor),8);
    await dialogo.getByRole('button',{name:'Cancelar'}).click();
  });

  await t.test('connections survive project reopening, duplication and changes of slide layout',async()=>{
    await reset();await page.evaluate(()=>{selectBlock('a');selectBlock('b',true);});
    await page.getByRole('button',{name:'Conectores'}).click();
    await page.getByRole('button',{name:'Conectar: A → B'}).click();
    const original=await page.evaluate(()=>JSON.stringify(S.deck));
    const abierto=await page.evaluate(()=>saneaDeck(JSON.parse(JSON.stringify(S.deck))));
    assert.equal(abierto.deck.v,1);
    assert.deepEqual(abierto.deck.slides[1].conectores,[{desde:'a',hasta:'b'}]);
    assert.equal(await page.evaluate(()=>JSON.stringify(S.deck)),original);
    await page.getByRole('button',{name:'Duplicar selección',exact:true}).first().click();
    const copia=await page.evaluate(()=>({conexiones:curSlide().conectores,bloques:curSlide().blocks.map(b=>({id:b.id,text:b.text}))}));
    assert.equal(copia.conexiones.length,2);
    const copiada=copia.conexiones[1];
    assert.notEqual(copiada.desde,'a');assert.notEqual(copiada.hasta,'b');
    assert.equal(copia.bloques.find(b=>b.id===copiada.desde).text,'A');
    assert.equal(copia.bloques.find(b=>b.id===copiada.hasta).text,'B');
    await page.evaluate(()=>doUndo());
    await page.keyboard.press('Control+d');
    const duplicada=await page.evaluate(()=>({sl:curSlide(),original:S.deck.slides[S.cur-1]}));
    assert.equal(duplicada.sl.conectores.length,1);
    assert.notEqual(duplicada.sl.conectores[0].desde,'a');
    assert.equal(duplicada.sl.blocks.find(b=>b.id===duplicada.sl.conectores[0].desde).text,'A');
    await page.evaluate(()=>changeLayout(curSlide(),'section'));
    const restaurado=await page.evaluate(()=>saneaDeck(JSON.parse(JSON.stringify(S.deck))).deck.slides[S.cur]);
    assert.equal(restaurado.conectores.length,1);
    assert.ok(restaurado._guardados.some(b=>b.id===restaurado.conectores[0].hasta));
    await page.evaluate(()=>changeLayout(curSlide(),'blanco'));
    assert.equal(await page.locator('#stageInner .lienzo-conectores line').count(),1);
    await page.evaluate(()=>delBlock(curSlide().conectores[0].desde));
    assert.equal(await page.evaluate(()=>curSlide().conectores),undefined);
    await page.evaluate(()=>doUndo());
    assert.equal(await page.locator('#stageInner .lienzo-conectores line').count(),1);
  });

  await t.test('presentation steps and exported files preserve the direction and timing of connections',async()=>{
    await reset();
    const salida=await page.evaluate(async()=>{
      const sl=curSlide();sl.blocks[0].step=true;sl.blocks[1].step=true;
      sl.blocks[1].posLibre.y=40;sl.conectores=[{desde:'b',hasta:'a'}];
      const original=JSON.stringify(S.deck), ext=await extensionSlides('exportador');
      const pasos=[0,1,2].map(n=>{
        const r=renderSlide(S.deck,S.cur,'present',n), g=r.querySelector('.lienzo-conectores g');
        return {count:+r.dataset.frags,step:+g.dataset.frag,visible:g.classList.contains('on')};
      });
      const html=await (await ext.creaHTML(S.deck)).text(), ppt=await ext.creaPPTX(S.deck);
      const avanzado=await (await window.JSZip.loadAsync(ppt.blob)).file('ppt/slides/slide2.xml').async('string');
      const guardar=window.downloadFile;let blob;
      window.downloadFile=async(_name,b)=>{blob=b;return true;};
      try {await exportPPTX();} finally {window.downloadFile=guardar;closeModal();}
      const clasico=await (await window.JSZip.loadAsync(blob)).file('ppt/slides/slide2.xml').async('string');
      return {pasos,html,avanzado,clasico,sinCambios:JSON.stringify(S.deck)===original};
    });
    assert.deepEqual(salida.pasos,[{count:2,step:1,visible:false},{count:2,step:1,visible:false},{count:2,step:1,visible:true}]);
    assert.equal(salida.sinCambios,true);
    for(const xml of [salida.avanzado,salida.clasico]) {
      assert.match(xml,/<a:prstGeom prst="line"/);
      assert.match(xml,/<a:tailEnd type="triangle"/);
      assert.match(xml,/flipH="1"/);assert.match(xml,/flipV="1"/);
    }
    const offline=await context.newPage();
    try {
      await offline.setContent(salida.html,{waitUntil:'load'});
      await offline.waitForFunction(()=>typeof presenter!=='undefined' && presenter.isReady());
      await offline.evaluate(()=>presenter.slide(1));
      const flecha=offline.locator('.present .lienzo-conectores g');
      assert.equal(await flecha.getAttribute('data-fragment-index'),'1');
      assert.equal(await flecha.evaluate(el=>el.classList.contains('visible')),false);
      await offline.evaluate(()=>presenter.next());
      await offline.waitForFunction(()=>document.querySelector('.present .blk[data-bid="a"]').classList.contains('visible'));
      assert.equal(await flecha.evaluate(el=>el.classList.contains('visible')),false);
      await offline.evaluate(()=>presenter.next());
      await offline.waitForFunction(()=>document.querySelector('.present .lienzo-conectores g').classList.contains('visible'));
    } finally { await offline.close(); }
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
    await page.locator('#lienzoImanBtn').focus();await page.keyboard.press('Tab');
    assert.equal(await page.locator('#lienzoFormasBtn').evaluate(b=>document.activeElement===b),true);
    const vista=await page.evaluate(()=>({ancho:document.documentElement.scrollWidth,ventana:innerWidth,
      formas:document.querySelector('#lienzoFormasBtn').getBoundingClientRect().toJSON()}));
    assert.ok(vista.ancho<=vista.ventana+1 && vista.formas.left>=0 && vista.formas.right<=vista.ventana,JSON.stringify(vista));
    await page.getByRole('button',{name:'Conectores'}).click();
    await page.getByRole('button',{name:'Conectar: A → B'}).click();
    await page.getByRole('button',{name:'Conectores'}).click();
    await page.getByRole('button',{name:'Editar conexión: A → B'}).click();
    const dialogo=page.getByRole('dialog',{name:'Estilo de conexión'});
    await dialogo.getByLabel('Extremos').selectOption('ambos');
    const cabida=await dialogo.getByLabel('Extremos').evaluate(el=>{
      const estilo=getComputedStyle(el), ctx=document.createElement('canvas').getContext('2d');
      ctx.font=estilo.font; return {ancho:el.clientWidth, texto:ctx.measureText(el.selectedOptions[0].textContent).width};
    });
    assert.ok(cabida.ancho>=cabida.texto+40,JSON.stringify(cabida));
    const modalAccesible=await new AxeBuilder({page}).include('#modalRoot').analyze();
    assert.deepEqual(modalAccesible.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id),[]);
    await dialogo.getByRole('button',{name:'Cancelar'}).click();
    await page.evaluate(()=>{findBlock('a').block.text='A'.repeat(80);findBlock('b').block.text='B'.repeat(80);renderAll();selectBlock('a');selectBlock('b',true);});
    await page.getByRole('button',{name:'Conectores'}).click();
    const menu=await page.locator('.menu-conectores').evaluate(el=>({ancho:el.clientWidth,contenido:el.scrollWidth,
      botones:[...el.querySelectorAll('button')].map(b=>({ancho:b.clientWidth,contenido:b.scrollWidth}))}));
    assert.ok(menu.contenido<=menu.ancho+1 && menu.botones.every(b=>b.contenido<=b.ancho+1),JSON.stringify(menu));
  });

  await t.test('the ribbon keeps a compact height without losing insertion controls',async()=>{
    await page.keyboard.press('Escape');await page.setViewportSize({width:1280,height:720});await reset();
    await page.evaluate(()=>selectBlock('a'));
    const nombres=['inicio','insertar','diseno','diapo','presentar','vista'];
    for(const nombre of [...nombres,'contextual']){
      const tab=nombre==='contextual'?'#cinta [data-contextual]':'#cinta [data-pestana='+nombre+']';
      await page.locator(tab).click();
      const cinta=await page.evaluate(()=>{
        const panel=document.querySelector('#cinta .erlen-cinta-panel'),fila=panel.querySelector('.erlen-cinta-fila');
        return {alto:panel.getBoundingClientRect().height,ancho:fila.clientWidth,contenido:fila.scrollWidth};
      });
      assert.ok(cinta.alto<=83,JSON.stringify({nombre,...cinta}));
      if(nombre==='insertar')assert.ok(cinta.contenido<=cinta.ancho+1,JSON.stringify(cinta));
    }
    await page.setViewportSize({width:390,height:844});
    for(const nombre of [...nombres,'contextual']){
      const tab=nombre==='contextual'?'#cinta [data-contextual]':'#cinta [data-pestana='+nombre+']';
      await page.locator(tab).click();
      const cinta=await page.evaluate(()=>{
        const panel=document.querySelector('#cinta .erlen-cinta-panel');
        return {alto:panel.getBoundingClientRect().height,grupos:[...panel.querySelectorAll('[role=group]:not([hidden])')].map(g=>g.getAttribute('aria-label')),
          botones:[...panel.querySelectorAll('button:not([hidden])')].map(b=>{
          const r=b.getBoundingClientRect(),t=b.querySelector('.erlen-cinta-texto').getBoundingClientRect();
          return {nombre:b.textContent,width:r.width,height:r.height,cabe:t.left>=r.left-1 && t.right<=r.right+1 && t.top>=r.top-1 && t.bottom<=r.bottom+1};
        })};
      });
      assert.ok(cinta.alto<=53 && cinta.grupos.length>0 && cinta.grupos.every(Boolean) && cinta.botones.every(b=>b.width>=44 && b.height>=44 && b.cabe),JSON.stringify({nombre,...cinta}));
    }
  });

  await t.test('portrait canvas controls reserve space and scroll without covering the slide',async()=>{
    for(const {width,height,aspect,capas} of [
      {width:320,height:700,aspect:'169',capas:false},
      {width:390,height:844,aspect:'43',capas:true}
    ]){
      await page.setViewportSize({width,height});await reset();
      await page.evaluate(aspect=>{S.deck.meta.aspect=aspect;renderAll();selectBlock('a');selectBlock('b',true);},aspect);
      if(capas)await page.locator('#lienzoObjetosBtn').click();
      await page.locator('#lienzoConectoresBtn').focus();
      const layout=await page.evaluate(()=>{
        const rect=s=>document.querySelector(s).getBoundingClientRect();
        const sc=document.querySelector('#canvasScroll'),pie=rect('.canvas-foot'),tira=rect('.foot-izq'),boton=rect('#lienzoConectoresBtn');
        const zoom=[...document.querySelectorAll('.zoombox button')].filter(b=>b.getClientRects().length).map(b=>{
          const r=b.getBoundingClientRect();return {width:r.width,height:r.height};
        });
        return {ancho:document.documentElement.scrollWidth,ventana:innerWidth,lienzo:rect('#canvasScroll').toJSON(),pie:pie.toJSON(),
          tira:tira.toJSON(),boton:boton.toJSON(),panel:document.querySelector('#panelCapas').hidden?null:rect('#panelCapas').toJSON(),
          desplazamiento:sc.scrollHeight-sc.clientHeight,zoom};
      });
      assert.ok(layout.ancho<=layout.ventana+1 && layout.lienzo.bottom<=layout.pie.top+1,JSON.stringify(layout));
      if(capas)assert.ok(layout.pie.bottom<=layout.panel.top+1 && layout.lienzo.height>70,JSON.stringify(layout));
      assert.ok(layout.boton.left>=layout.tira.left+5 && layout.boton.right<=layout.tira.right-5,JSON.stringify(layout));
      assert.ok(layout.zoom.every(b=>b.width>=44 && b.height>=44),JSON.stringify(layout.zoom));
      const visible=await page.evaluate(()=>{
        const sc=document.querySelector('#canvasScroll'),stage=document.querySelector('#stage');
        sc.scrollTop=0;const arriba=stage.getBoundingClientRect().top>=sc.getBoundingClientRect().top;
        sc.scrollTop=sc.scrollHeight;const abajo=stage.getBoundingClientRect().bottom<=sc.getBoundingClientRect().bottom;
        return {arriba,abajo};
      });
      assert.deepEqual(visible,{arriba:true,abajo:true});
      await page.getByRole('button',{name:'Conectores'}).click();
      assert.equal(await page.getByRole('button',{name:'Conectar: A → B'}).isVisible(),true);
      await page.keyboard.press('Escape');
      if(capas)await page.getByRole('button',{name:'Cerrar panel de capas'}).click();
    }
  });

  await t.test('the selected ribbon tab stays visible when the viewport narrows or the tab changes',async()=>{
    await page.keyboard.press('Escape');await page.setViewportSize({width:1440,height:1000});await reset();
    await page.locator('#cinta [data-pestana=diapo]').click();
    await page.setViewportSize({width:390,height:844});
    const rects=()=>page.evaluate(()=>{
      const fila=document.querySelector('#cinta .erlen-cinta-pestanas').getBoundingClientRect();
      const tab=document.querySelector('#cinta [role=tab][aria-selected=true]').getBoundingClientRect();
      return {fila:{left:fila.left,right:fila.right},tab:{left:tab.left,right:tab.right}};
    });
    await page.waitForFunction(()=>{
      const fila=document.querySelector('#cinta .erlen-cinta-pestanas').getBoundingClientRect();
      const tab=document.querySelector('#cinta [role=tab][aria-selected=true]').getBoundingClientRect();
      return tab.left>=fila.left-1 && tab.right<=fila.right+1;
    });
    assert.ok((await rects()).tab.right<=390);
    await page.locator('#cinta [data-pestana=inicio]').click();
    await page.locator('#cinta [data-pestana=diapo]').click();
    const medida=await rects();
    assert.ok(medida.tab.left>=medida.fila.left-1 && medida.tab.right<=medida.fila.right+1,JSON.stringify(medida));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  });

  await t.test('canvas switches remain legible while the editor theme changes',async()=>{
    await page.setViewportSize({width:1440,height:1000});await reset();
    await page.locator('#cinta [data-pestana=diapo]').click();
    await page.evaluate(()=>cambiaTemaApp('claro'));await page.waitForTimeout(200);
    await page.evaluate(()=>cambiaTemaApp('oscuro'));
    const oscuro=await new AxeBuilder({page}).include('#cinta').analyze();
    assert.deepEqual(oscuro.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id),[]);
    await page.waitForTimeout(200);await page.evaluate(()=>cambiaTemaApp('claro'));
    const claro=await new AxeBuilder({page}).include('#cinta').analyze();
    assert.deepEqual(claro.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id),[]);
  });

  await t.test('the ribbon canvas menus operate on the same objects and keep the footer usable',async()=>{
    await page.keyboard.press('Escape');await page.setViewportSize({width:1440,height:1000});await reset();
    await page.locator('#cinta [data-pestana=diapo]').click();
    const cinta=page.locator('#cinta'), menu=name=>page.getByRole('menu',{name,exact:true});
    const formas=cinta.locator('[data-control=lienzo-formas]');
    await formas.focus();await page.keyboard.press('ArrowDown');
    assert.equal(await formas.getAttribute('aria-expanded'),'true');
    await menu('Formas').getByRole('menuitem',{name:'Rectángulo'}).click();
    await page.waitForFunction(()=>curSlide().blocks.some(b=>b.formaLibre==='rect'));
    await page.keyboard.press('Control+z');
    assert.equal(await page.evaluate(()=>curSlide().blocks.some(b=>b.formaLibre==='rect')),false);

    await page.evaluate(()=>{selectBlock('a');selectBlock('b',true);});
    const organizar=cinta.locator('[data-control=lienzo-organizar]');
    await organizar.click();
    assert.equal(await menu('Organizar').getByRole('menuitem',{name:'Distribuir horizontalmente'}).isDisabled(),true);
    await menu('Organizar').getByRole('menuitem',{name:'Alinear a la izquierda'}).click();
    assert.deepEqual((await posiciones()).map(p=>p.x),[10,10,75]);
    await page.keyboard.press('Control+z');assert.deepEqual((await posiciones()).map(p=>p.x),[10,50,75]);
    await page.evaluate(()=>{findBlock('b').block.locked=true;renderAll();selectBlock('a');selectBlock('b',true);});
    await organizar.click();
    assert.equal(await menu('Organizar').getByRole('menuitem',{name:'Alinear a la izquierda'}).isDisabled(),true);
    await page.keyboard.press('Escape');
    assert.deepEqual((await posiciones()).map(p=>p.x),[10,50,75]);
    await page.evaluate(()=>{findBlock('b').block.locked=false;renderAll();selectBlock('a');selectBlock('b',true);});

    const conectores=cinta.locator('[data-control=lienzo-conectores]');
    await conectores.click();await menu('Conectores').getByRole('menuitem',{name:'Conectar: A → B'}).click();
    assert.deepEqual(await page.evaluate(()=>curSlide().conectores),[{desde:'a',hasta:'b'}]);
    await page.evaluate(()=>selectBlock(null));
    await conectores.click();await menu('Conectores').getByRole('menuitem',{name:'Eliminar conexión: A → B'}).click();
    assert.equal(await page.locator('#stageInner .lienzo-conectores line').count(),0);
    await page.keyboard.press('Control+z');assert.equal(await page.locator('#stageInner .lienzo-conectores line').count(),1);

    await cinta.locator('[data-control=lienzo-catalogo]').click();
    const catalogo=page.getByRole('dialog',{name:'Catálogo científico'});
    await catalogo.getByRole('searchbox',{name:'Buscar figuras'}).waitFor();
    await catalogo.getByRole('button',{name:'Cancelar'}).click();
    await cinta.locator('[data-control=lienzo-capas]').click();
    await cinta.locator('[data-pestana=presentar]').click();
    await page.getByRole('button',{name:'Cerrar panel de capas'}).click();
    assert.equal(await page.locator('#lienzoObjetosBtn').evaluate(el=>document.activeElement===el),true,
      'El foco vuelve al control del pie cuando ya no existe el abridor de la cinta');
    assert.equal(await page.locator('#lienzoFormasBtn').isVisible(),true);
  });

  mkdirSync(fileURLToPath(new URL('../.local/',import.meta.url)),{recursive:true});
  await page.screenshot({path:fileURLToPath(new URL('../.local/composicion-lienzo.png',import.meta.url))});
  assert.deepEqual(errores,[]);
});
