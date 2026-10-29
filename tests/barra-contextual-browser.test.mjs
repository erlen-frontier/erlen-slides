/* SPDX-License-Identifier: AGPL-3.0-only */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
import {AxeBuilder} from '@axe-core/playwright';

test('contextual controls follow the selected object and keep the canvas usable', {timeout:180000}, async t => {
  const bin=process.env.ERLEN_CHROMIUM||'/usr/bin/chromium';
  if(!existsSync(bin)){t.skip('Chromium is required.');return;}
  const port=Number(process.env.ERLEN_BARRA_TEST_PORT||4465);
  const server=spawn(process.execPath,[fileURLToPath(new URL('../herramientas/serve.mjs',import.meta.url))],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
  t.after(()=>server.kill());
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',c=>reject(Error('Server exited: '+c)));});
  const browser=await chromium.launch({executablePath:bin,args:['--no-sandbox']});t.after(()=>browser.close());
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];t.after(()=>context.close());
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(3000);
  await page.goto('http://127.0.0.1:'+port+'/');
  const reset=()=>page.evaluate(()=>{
    const d=blankDeck(),s={id:'barra',layout:'blanco',title:'',lienzoLibre:true,blocks:[]};
    const a=newBlock('text');Object.assign(a,{id:'texto',text:'Hola $x$',posLibre:{x:15,y:20,w:35,h:25}});
    const b=newBlock('text');Object.assign(b,{id:'otro',text:'Segundo',posLibre:{x:55,y:20,w:30,h:25}});
    const i=newBlock('image');Object.assign(i,{id:'imagen',alt:'Ilustración',src:'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="30" height="20"%3E%3Crect width="30" height="20" fill="%230088aa"/%3E%3C/svg%3E',posLibre:{x:55,y:55,w:30,h:25}});
    s.blocks.push(a,b,i);d.slides.push(s);loadDeck(d,null,true);wsCerrar();S.cur=1;S.selBlock=null;snapNow();renderAll();
  });
  const barra=page.getByRole('toolbar',{name:'Herramientas del objeto'});
  const visible=async()=>assert.equal(await barra.isVisible(),true,'La barra contextual aparece al seleccionar un objeto');
  const selecciona=async(inicio,fin)=>page.evaluate(([a,z])=>{
    const el=document.querySelector('#stageInner .blk[data-bid="texto"] [data-edit]');
    const nodos=[],walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
    while(walker.nextNode())nodos.push(walker.currentNode);
    const punto=pos=>{for(const nodo of nodos){if(pos<=nodo.length)return [nodo,pos];pos-=nodo.length;}throw Error('Selección fuera del texto');};
    const [n,i]=punto(a),[m,j]=punto(z),r=document.createRange();r.setStart(n,i);r.setEnd(m,j);
    const s=getSelection();s.removeAllRanges();s.addRange(r);
  },[inicio,fin]);

  await t.test('the first click on unselected text selects it and starts editing',async()=>{
    await reset();
    const editor=page.locator('#stageInner .blk[data-bid="texto"] [data-edit]');
    await editor.click();await page.keyboard.press('End');await page.keyboard.type(' añadido');
    await page.evaluate(()=>flushEdicion());
    assert.equal(await page.evaluate(()=>findBlock('texto').block.text),'Hola $x$ añadido');
  });

  await t.test('showing the toolbar leaves the fitted slide above the bottom controls',async()=>{
    await reset();await page.evaluate(()=>selectBlock('texto'));await visible();
    const r=await page.evaluate(()=>{const s=document.querySelector('#stage').getBoundingClientRect(),f=document.querySelector('.canvas-foot').getBoundingClientRect();return {bottom:s.bottom,foot:f.top};});
    assert.ok(r.bottom<=r.foot+1,JSON.stringify(r));
  });

  await t.test('text selection exposes type-specific and common actions outside the slide',async()=>{
    await reset();assert.equal(await barra.isVisible(),false);await page.evaluate(()=>selectBlock('texto'));await visible();
    for(const name of ['Negrita','Cursiva','Alinear texto a la izquierda','Centrar texto','Alinear texto a la derecha','Duplicar bloque','Adelantar capa','Retrasar capa','Bloquear bloque','Eliminar bloque'])
      assert.equal(await barra.getByRole('button',{name,exact:true}).count(),1,name);
    assert.equal(await barra.getByRole('combobox',{name:'Tamaño del texto'}).count(),1);
    const r=await page.evaluate(()=>{const a=document.querySelector('#barraContextual').getBoundingClientRect(),s=document.querySelector('#stage').getBoundingClientRect();return {barra:a.bottom,slide:s.top};});
    assert.ok(r.barra<=r.slide+1,JSON.stringify(r));
  });

  await t.test('text formatting preserves a live edit, selection and undo history',async()=>{
    await reset();await page.evaluate(()=>selectBlock('texto'));await visible();
    const editor=page.locator('#stageInner .blk[data-bid="texto"] [data-edit]');
    await editor.click();await page.keyboard.press('End');await page.keyboard.type(' más');
    await barra.getByRole('button',{name:'Negrita'}).click();
    assert.deepEqual(await page.evaluate(()=>({text:findBlock('texto').block.text,bold:!!findBlock('texto').block.negrita,focus:document.activeElement?.dataset.ek})),{text:'Hola $x$ más',bold:true,focus:'b:texto'});
    await page.keyboard.type(' continúa');
    await barra.getByRole('button',{name:'Cursiva'}).click();
    assert.equal(await page.evaluate(()=>findBlock('texto').block.text),'Hola $x$ más continúa');
    assert.equal(await page.evaluate(()=>!!findBlock('texto').block.cursiva),true);
    await page.evaluate(()=>doUndo());assert.equal(await page.evaluate(()=>!!findBlock('texto').block.cursiva),false);
    await page.evaluate(()=>doUndo());assert.equal(await page.evaluate(()=>findBlock('texto').block.text),'Hola $x$ más');
  });

  await t.test('formatting keeps a cursor at the start of a later line',async()=>{
    await reset();await page.evaluate(()=>{findBlock('texto').block.text='Uno\nDos';snapNow();renderAll();selectBlock('texto');});
    const editor=page.locator('#stageInner .blk[data-bid="texto"] [data-edit]');await editor.click();
    await page.evaluate(()=>{
      const el=document.querySelector('#stageInner .blk[data-bid="texto"] [data-edit]');
      const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let node,last;
      while((node=walker.nextNode())) last=node;
      const r=document.createRange();r.setStart(last,0);r.collapse(true);
      const s=getSelection();s.removeAllRanges();s.addRange(r);
    });
    await barra.getByRole('button',{name:'Negrita'}).click();
    await page.keyboard.type('X');
    await page.evaluate(()=>flushEdicion());
    assert.equal(await page.evaluate(()=>findBlock('texto').block.text),'Uno\nXDos');
  });

  await t.test('formatting preserves a text selection spanning multiple lines',async()=>{
    await reset();await page.evaluate(()=>{findBlock('texto').block.text='Uno\nDos';snapNow();renderAll();selectBlock('texto');});
    await page.locator('#stageInner .blk[data-bid="texto"] [data-edit]').click();
    await page.evaluate(()=>{
      const el=document.querySelector('#stageInner .blk[data-bid="texto"] [data-edit]'),walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),nodos=[];
      while(walker.nextNode())nodos.push(walker.currentNode);
      const r=document.createRange();r.setStart(nodos[0],1);r.setEnd(nodos.at(-1),2);
      const s=getSelection();s.removeAllRanges();s.addRange(r);
    });
    await barra.getByRole('button',{name:'Cursiva'}).click();
    await page.keyboard.type('X');await page.evaluate(()=>flushEdicion());
    assert.equal(await page.evaluate(()=>findBlock('texto').block.text),'UXs');
  });

  await t.test('a selection can combine styles, toggle a mixed range and survive undo and JSON',async()=>{
    await reset();await page.evaluate(()=>{findBlock('texto').block.text='Alfa beta gamma';snapNow();renderAll();selectBlock('texto');});
    const editor=page.locator('#stageInner .blk[data-bid="texto"] [data-edit]');await editor.click();
    await selecciona(5,9);await barra.getByRole('button',{name:'Negrita'}).click();
    assert.equal(await page.evaluate(()=>getSelection().toString()),'beta');
    assert.deepEqual(await page.evaluate(()=>findBlock('texto').block.formatoTexto),[{inicio:5,fin:9,negrita:true}]);
    const aspecto=await page.evaluate(()=>{
      const e=document.querySelector('#stageInner .blk[data-bid="texto"] [data-edit]'),r=document.createTreeWalker(e,NodeFilter.SHOW_TEXT),out=[];
      while(r.nextNode()){const n=r.currentNode,s=getComputedStyle(n.parentElement);out.push([n.data,s.fontWeight,s.fontStyle]);}return out;
    });
    assert.equal(aspecto.map(x=>x[0]).join(''),'Alfa beta gamma');
    assert.ok(+aspecto.find(x=>x[0]==='beta')[1]>=600,JSON.stringify(aspecto));
    assert.ok(+aspecto.find(x=>x[0].includes('Alfa'))[1]<600,JSON.stringify(aspecto));
    await selecciona(5,12);await barra.getByRole('button',{name:'Cursiva'}).click();
    assert.deepEqual(await page.evaluate(()=>findBlock('texto').block.formatoTexto),[
      {inicio:5,fin:9,negrita:true,cursiva:true},{inicio:9,fin:12,cursiva:true}]);
    await selecciona(5,12);await page.waitForTimeout(50);
    assert.equal(await barra.getByRole('button',{name:'Negrita'}).getAttribute('aria-pressed'),'mixed');
    await barra.getByRole('button',{name:'Negrita'}).click();
    assert.deepEqual(await page.evaluate(()=>findBlock('texto').block.formatoTexto),[{inicio:5,fin:12,negrita:true,cursiva:true}]);
    await page.evaluate(()=>doUndo());
    assert.deepEqual(await page.evaluate(()=>findBlock('texto').block.formatoTexto),[
      {inicio:5,fin:9,negrita:true,cursiva:true},{inicio:9,fin:12,cursiva:true}]);
    await page.evaluate(()=>doRedo());
    const r=await page.evaluate(()=>{const d=saneaDeck(JSON.parse(JSON.stringify(S.deck)));return {v:d.deck.v,b:d.deck.slides[1].blocks[0],avisos:d.avisos};});
    assert.equal(r.b.text,'Alfa beta gamma');
    assert.deepEqual(r.b.formatoTexto,[{inicio:5,fin:12,negrita:true,cursiva:true}]);
    assert.ok(!r.avisos.some(x=>/formato de texto/.test(x)),JSON.stringify(r.avisos));
  });

  await t.test('typing and replacement keep formatting attached to the intended text',async()=>{
    await reset();await page.evaluate(()=>{findBlock('texto').block.text='aaa bbb ccc';snapNow();renderAll();selectBlock('texto');});
    await page.locator('#stageInner .blk[data-bid="texto"] [data-edit]').click();
    await selecciona(4,7);await barra.getByRole('button',{name:'Negrita'}).click();
    await selecciona(1,1);await page.keyboard.type('X');
    await selecciona(5,8);await page.keyboard.type('D');
    await page.evaluate(()=>flushEdicion());
    assert.deepEqual(await page.evaluate(()=>({text:findBlock('texto').block.text,formato:findBlock('texto').block.formatoTexto})),
      {text:'aXaa D ccc',formato:[{inicio:5,fin:6,negrita:true}]});
    await page.evaluate(()=>doUndo());
    assert.deepEqual(await page.evaluate(()=>({text:findBlock('texto').block.text,formato:findBlock('texto').block.formatoTexto})),
      {text:'aaa bbb ccc',formato:[{inicio:4,fin:7,negrita:true}]});
  });

  await t.test('typing after trailing line breaks preserves the newlines and existing formatting',async()=>{
    for(const teclas of [['Enter'],['Shift+Enter'],['Enter','Enter']]){
      await reset();await page.evaluate(()=>{
        Object.assign(findBlock('texto').block,{text:'abc',formatoTexto:[{inicio:0,fin:2,negrita:true}]});
        snapNow();renderAll();selectBlock('texto');
      });
      await page.locator('#stageInner .blk[data-bid="texto"] [data-edit]').click();
      await page.keyboard.press('End');
      for(const tecla of teclas) await page.keyboard.press(tecla);
      await page.keyboard.type('X');await page.evaluate(()=>flushEdicion());
      assert.deepEqual(await page.evaluate(()=>({text:findBlock('texto').block.text,formato:findBlock('texto').block.formatoTexto})),
        {text:'abc'+'\n'.repeat(teclas.length)+'X',formato:[{inicio:0,fin:2,negrita:true}]},teclas.join('+'));
    }
    await reset();await page.evaluate(()=>{
      Object.assign(findBlock('texto').block,{text:'abc',formatoTexto:[{inicio:0,fin:3,negrita:true}]});
      snapNow();renderAll();selectBlock('texto');
    });
    await page.locator('#stageInner .blk[data-bid="texto"] [data-edit]').click();
    await page.keyboard.press('End');await page.keyboard.press('Enter');await page.keyboard.press('Enter');
    await page.keyboard.press('Backspace');await page.keyboard.type('X');await page.evaluate(()=>flushEdicion());
    assert.deepEqual(await page.evaluate(()=>({text:findBlock('texto').block.text,formato:findBlock('texto').block.formatoTexto})),
      {text:'abc\nX',formato:[{inicio:0,fin:5,negrita:true}]},'la inserción hereda el estilo y borrar un salto no desplaza el texto');
    await reset();await page.evaluate(()=>{
      Object.assign(findBlock('texto').block,{text:'abc\n',formatoTexto:[{inicio:0,fin:2,negrita:true}]});
      snapNow();renderAll();selectBlock('texto');
    });
    await page.locator('#stageInner .blk[data-bid="texto"] [data-edit]').click();
    await page.evaluate(()=>flushEdicion());
    assert.equal(await page.evaluate(()=>findBlock('texto').block.text),'abc\n','enfocar y salir no debe borrar un salto existente');
  });

  await t.test('editing preserves explicit overrides even when they match the block style',async()=>{
    await reset();await page.evaluate(()=>{
      Object.assign(findBlock('texto').block,{text:'abc xx def',negrita:true,formatoTexto:[{inicio:0,fin:3,negrita:true,cursiva:true}]});
      snapNow();renderAll();selectBlock('texto');
    });
    await page.locator('#stageInner .blk[data-bid="texto"] [data-edit]').click();
    await page.keyboard.press('End');await page.keyboard.type('!');await page.evaluate(()=>flushEdicion());
    assert.deepEqual(await page.evaluate(()=>findBlock('texto').block.formatoTexto),[{inicio:0,fin:3,negrita:true,cursiva:true}]);
    await page.locator('#stageInner .blk[data-bid="texto"] [data-edit]').click();
    await selecciona(0,3);await barra.getByRole('button',{name:'Cursiva'}).click();
    assert.deepEqual(await page.evaluate(()=>findBlock('texto').block.formatoTexto),[{inicio:0,fin:3,negrita:true}]);
  });

  await t.test('inserting a repeated citation keeps its position and the original formatting',async()=>{
    await reset();await page.evaluate(()=>{
      const b=findBlock('texto').block;
      Object.assign(b,{text:'a\n[@x][@x]',formatoTexto:[{inicio:6,fin:10,negrita:true}]});
      S.deck.meta.refs=[{id:'referencia',clave:'x',titulo:'Referencia ilustrativa',autores:'Autora',anio:'2020'}];
      snapNow();renderAll();selectBlock('texto');
    });
    await page.locator('#stageInner .blk[data-bid="texto"] [data-edit]').click();
    await selecciona(2,2);
    assert.equal(await page.evaluate(()=>{apuntaPunto();flushEdicion();return citaEnElTexto(['referencia']);}),true);
    assert.deepEqual(await page.evaluate(()=>({text:findBlock('texto').block.text,formato:findBlock('texto').block.formatoTexto})),
      {text:'a\n[@x][@x][@x]',formato:[{inicio:10,fin:14,negrita:true}]});
  });

  await t.test('the citation cursor accounts for a line break without formatting',async()=>{
    await reset();await page.evaluate(()=>{
      findBlock('texto').block.text='a\nx';
      S.deck.meta.refs=[{id:'referencia',clave:'x',titulo:'Referencia ilustrativa',autores:'Autora',anio:'2020'}];
      snapNow();renderAll();selectBlock('texto');
    });
    await page.locator('#stageInner .blk[data-bid="texto"] [data-edit]').click();
    await page.evaluate(()=>{
      const el=document.querySelector('#stageInner .blk[data-bid="texto"] [data-edit]'), walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
      let ultimo;while(walker.nextNode())ultimo=walker.currentNode;
      const r=document.createRange();r.setStart(ultimo,0);r.collapse(true);
      const s=getSelection();s.removeAllRanges();s.addRange(r);apuntaPunto();flushEdicion();citaEnElTexto(['referencia']);
    });
    assert.equal(await page.evaluate(()=>findBlock('texto').block.text),'a\n[@x]x');
  });

  await t.test('a partial override can remove bold inside a bold block without removing italic',async()=>{
    await reset();await page.evaluate(()=>{const b=findBlock('texto').block;Object.assign(b,{text:'uno dos tres',negrita:true,cursiva:true});snapNow();renderAll();selectBlock('texto');});
    await page.locator('#stageInner .blk[data-bid="texto"] [data-edit]').click();
    await selecciona(4,7);await barra.getByRole('button',{name:'Negrita'}).click();
    assert.deepEqual(await page.evaluate(()=>findBlock('texto').block.formatoTexto),[{inicio:4,fin:7,negrita:false}]);
    const estilo=await page.evaluate(()=>{const e=document.querySelector('#stageInner .blk[data-bid="texto"] [data-edit] span');const s=getComputedStyle(e);return {texto:e.textContent,peso:s.fontWeight,cursiva:s.fontStyle};});
    assert.deepEqual(estilo,{texto:'dos',peso:'400',cursiva:'italic'});
    await selecciona(7,7);await barra.getByRole('button',{name:'Negrita'}).click();
    assert.equal(await page.evaluate(()=>!!findBlock('texto').block.negrita),false);
    assert.equal(await page.evaluate(()=>!!findBlock('texto').block.cursiva),true);
    assert.equal(await page.evaluate(()=>findBlock('texto').block.formatoTexto),undefined);
  });

  await t.test('formatting does not alter formulas, scientific notation, citations or glossary marks',async()=>{
    await reset();
    const r=await page.evaluate(()=>{
      const b=findBlock('texto').block;
      b.text='Dato 10 mg/L, $x^2$ y [@X] sobre {{fase}}.';
      const antes=renderSlide(S.deck,1,'present',0).querySelector('.blk[data-bid="texto"]');
      b.formatoTexto=[{inicio:0,fin:2,negrita:true},{inicio:6,fin:8,cursiva:true},{inicio:15,fin:18,negrita:true},{inicio:25,fin:28,cursiva:true}];
      const despues=renderSlide(S.deck,1,'present',0).querySelector('.blk[data-bid="texto"]');
      const resultado={texto:b.text,antes:antes.textContent,despues:despues.textContent,math:despues.querySelectorAll('.katex').length};
      b.text='a (00l) y 10 mg/L más $x^2$ fin';delete b.formatoTexto;
      resultado.millerAntes=renderSlide(S.deck,1,'present',0).querySelector('.blk[data-bid="texto"]').textContent;
      b.formatoTexto=[{inicio:4,fin:5,negrita:true},{inicio:6,fin:14,cursiva:true}];
      resultado.millerDespues=renderSlide(S.deck,1,'present',0).querySelector('.blk[data-bid="texto"]').textContent;
      return resultado;
    });
    assert.equal(r.texto,'Dato 10 mg/L, $x^2$ y [@X] sobre {{fase}}.');
    assert.equal(r.antes,r.despues);assert.equal(r.math,1);
    assert.equal(r.millerAntes,r.millerDespues,'el índice de Miller no debe convertirse en una unidad');
  });

  await t.test('keyboard actions retain focus on the contextual control',async()=>{
    await reset();await page.evaluate(()=>selectBlock('texto'));
    const bold=barra.getByRole('button',{name:'Negrita'});await bold.focus();await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(()=>!!findBlock('texto').block.negrita),true);
    assert.equal(await page.evaluate(()=>document.activeElement?.dataset.barraAccion),'negrita');
  });

  await t.test('a keyboard selection stays formatted when a toolbar control receives focus',async()=>{
    await reset();await page.evaluate(()=>{findBlock('texto').block.text='uno dos';snapNow();renderAll();selectBlock('texto');});
    await page.locator('#stageInner .blk[data-bid="texto"] [data-edit]').click();
    await page.keyboard.press('Home');
    for(let i=0;i<3;i++) await page.keyboard.press('Shift+ArrowRight');
    assert.equal(await page.evaluate(()=>getSelection().toString()),'uno');
    await barra.getByRole('button',{name:'Negrita'}).focus();await page.keyboard.press('Enter');
    assert.deepEqual(await page.evaluate(()=>findBlock('texto').block.formatoTexto),[{inicio:0,fin:3,negrita:true}]);
  });

  await t.test('formatting cannot split an emoji or a combining accent',async()=>{
    await reset();await page.evaluate(()=>{findBlock('texto').block.text='a😀 e\u0301 b';snapNow();renderAll();selectBlock('texto');});
    await page.locator('#stageInner .blk[data-bid="texto"] [data-edit]').click();
    await selecciona(1,2);await barra.getByRole('button',{name:'Negrita'}).click();
    assert.deepEqual(await page.evaluate(()=>findBlock('texto').block.formatoTexto),[{inicio:1,fin:3,negrita:true}]);
    await selecciona(4,5);await barra.getByRole('button',{name:'Cursiva'}).click();
    assert.deepEqual(await page.evaluate(()=>findBlock('texto').block.formatoTexto),[
      {inicio:1,fin:3,negrita:true},{inicio:4,fin:6,cursiva:true}]);
  });

  await t.test('all block property controls open the visible details panel with the ribbon',async()=>{
    for(const via of ['barra','flotante','menu']){
      await reset();await page.evaluate(()=>selectBlock('texto'));
      if(via==='barra') await barra.getByRole('button',{name:'Propiedades del bloque'}).click();
      if(via==='flotante') await page.getByRole('button',{name:'Propiedades en el panel'}).click();
      if(via==='menu') {
        await page.getByRole('button',{name:'Más acciones…'}).click();
        await page.locator('.menu button').filter({hasText:'Propiedades'}).first().click();
      }
      assert.equal(await page.locator('#inspector').isVisible(),true,via);
      assert.ok(await page.locator('#inspBody').locator('> *').count()>0,via);
      assert.equal(await page.evaluate(()=>S.tab),'bloque',via);
      await page.evaluate(()=>cierraPanelDetalles());
    }
  });

  await t.test('the existing object toolbar does not cover text near the top of a narrow canvas',async()=>{
    await page.setViewportSize({width:390,height:844});await reset();
    await page.evaluate(()=>{findBlock('texto').block.posLibre={x:20,y:0,w:60,h:25};renderAll();selectBlock('texto');});
    const r=await page.evaluate(()=>{const texto=document.querySelector('#stageInner .blk[data-bid="texto"] [data-edit]').getBoundingClientRect(),bar=document.querySelector('#stageInner .blk-toolbar').getBoundingClientRect();return {texto:{top:texto.top,bottom:texto.bottom},bar:{top:bar.top,bottom:bar.bottom}};});
    assert.ok(r.bar.bottom<=r.texto.top || r.bar.top>=r.texto.bottom,JSON.stringify(r));
    await page.setViewportSize({width:1440,height:1000});
  });

  await t.test('common actions affect the whole selection and respect locked members',async()=>{
    await reset();await page.evaluate(()=>{selectBlock('texto');selectBlock('otro',true);});await visible();
    assert.equal(await barra.getByRole('button',{name:'Duplicar selección'}).count(),1);
    assert.equal(await barra.getByRole('combobox',{name:'Tamaño del texto'}).count(),0);
    await barra.getByRole('button',{name:'Bloquear selección'}).click();
    assert.deepEqual(await page.evaluate(()=>['texto','otro'].map(id=>!!findBlock(id).block.locked)),[true,true]);
    assert.equal(await barra.getByRole('button',{name:'Desbloquear selección'}).count(),1);
    await barra.getByRole('button',{name:'Desbloquear selección'}).click();
    await barra.getByRole('button',{name:'Duplicar selección'}).click();
    assert.equal(await page.evaluate(()=>zonas(curSlide()).flat().length),5);
    await page.evaluate(()=>doUndo());assert.equal(await page.evaluate(()=>zonas(curSlide()).flat().length),3);
  });

  await t.test('activating another selected object keeps the multiple-selection controls live',async()=>{
    await reset();await page.evaluate(()=>{selectBlock('texto');selectBlock('otro',true);});
    const bloque=page.locator('#stageInner .blk[data-bid="texto"]'),caja=await bloque.boundingBox();assert.ok(caja);
    await bloque.click({position:{x:caja.width/2,y:caja.height-8}});
    assert.deepEqual((await page.evaluate(()=>[...idsSeleccionados()])).sort(),['otro','texto']);
    assert.equal(await page.evaluate(()=>S.selBlock),'texto');
    assert.equal(await barra.getByRole('button',{name:'Duplicar selección'}).count(),1);
    assert.equal(await barra.getByRole('combobox',{name:'Tamaño del texto'}).count(),0);
    await barra.getByRole('button',{name:'Duplicar selección'}).click();
    assert.equal(await page.evaluate(()=>zonas(curSlide()).flat().length),5);
  });

  await t.test('a marquee selection immediately exposes the multiple-selection controls',async()=>{
    await reset();const caja=await page.locator('#stageInner .slide').boundingBox();assert.ok(caja);
    await page.mouse.move(caja.x+caja.width*.05,caja.y+caja.height*.1);await page.mouse.down();
    await page.mouse.move(caja.x+caja.width*.9,caja.y+caja.height*.5,{steps:5});await page.mouse.up();
    assert.deepEqual((await page.evaluate(()=>[...idsSeleccionados()])).sort(),['otro','texto']);
    assert.equal(await barra.getByRole('button',{name:'Duplicar selección'}).count(),1);
    await barra.getByRole('button',{name:'Duplicar selección'}).click();
    assert.equal(await page.evaluate(()=>zonas(curSlide()).flat().length),5);
  });

  await t.test('image controls offer crop and replacement without changing the original on open',async()=>{
    await reset();await page.evaluate(()=>selectBlock('imagen'));await visible();
    const original=await page.evaluate(()=>findBlock('imagen').block.src);
    assert.equal(await barra.getByRole('button',{name:'Cambiar imagen'}).count(),1);
    await barra.getByRole('button',{name:'Encuadrar imagen'}).click();
    await page.getByRole('dialog',{name:'Encuadrar la imagen'}).waitFor({state:'visible'});
    assert.equal(await page.evaluate(()=>findBlock('imagen').block.src),original);
    await page.keyboard.press('Escape');
  });

  await t.test('the selected shape provides undoable colors while compound scientific figures remain protected',async()=>{
    await reset();await page.evaluate(async()=>{await insertaFormaLibre('rect');});await visible();
    const id=await page.evaluate(()=>S.selBlock),before=await page.evaluate(id=>deepCopy(findBlock(id).block),id);
    await barra.getByLabel('Color de relleno').fill('#bb2211');
    await page.waitForFunction(({id})=>findBlock(id).block.figura.objects[0].fill==='#bb2211',{id});
    assert.match(decodeURIComponent(await page.evaluate(id=>findBlock(id).block.src,id)),/fill="#bb2211"/);
    await page.evaluate(()=>doUndo());assert.equal(await page.evaluate(id=>findBlock(id).block.figura.objects[0].fill,id),before.figura.objects[0].fill);
    await page.evaluate(id=>selectBlock(id),id);
    await barra.getByLabel('Color de contorno').fill('#003399');
    await page.waitForFunction(({id})=>findBlock(id).block.figura.objects[0].stroke==='#003399',{id});
    await page.evaluate(()=>selectBlock('imagen'));
    assert.equal(await barra.getByLabel('Color de relleno').count(),0);
    assert.equal(await barra.getByLabel('Color de contorno').count(),0);
  });

  await t.test('an asynchronous shape color cannot change a different or replaced selection',async()=>{
    await reset();await page.evaluate(async()=>{await insertaFormaLibre('rect');});
    const r=await page.evaluate(async()=>{
      const id=S.selBlock,b=findBlock(id).block,original=b.src,old=extensionSlides;
      let resolver;extensionSlides=()=>new Promise(resolve=>{resolver=resolve;});
      try {
        const tarea=cambiaColorFormaBarra(contextoBarra(),'fill','#ff0000');
        const core=await old('figurascore');selectBlock('texto');resolver(core);await tarea;
        return {src:b.src,original,fill:b.figura.objects[0].fill};
      } finally {extensionSlides=old;}
    });
    assert.equal(r.src,r.original);assert.notEqual(r.fill,'#ff0000');
  });

  await t.test('replacing an image can be undone without losing the original',async()=>{
    await reset();await page.evaluate(()=>{S.prefs.sinDisenador=true;selectBlock('imagen');});
    const original=await page.evaluate(()=>findBlock('imagen').block.src);
    const [chooser]=await Promise.all([page.waitForEvent('filechooser'),barra.getByRole('button',{name:'Cambiar imagen'}).click()]);
    await chooser.setFiles({name:'sustituta.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>')});
    await page.waitForFunction(original=>findBlock('imagen').block.src!==original,original);
    await page.evaluate(()=>doUndo());assert.equal(await page.evaluate(()=>findBlock('imagen').block.src),original);
  });

  await t.test('image controls update immediately after choosing a file for an empty block',async()=>{
    await reset();await page.evaluate(()=>{S.prefs.sinDisenador=true;findBlock('imagen').block.src='';snapNow();renderAll();selectBlock('imagen');});
    assert.equal(await barra.getByRole('button',{name:'Encuadrar imagen'}).count(),0);
    const [chooser]=await Promise.all([page.waitForEvent('filechooser'),barra.getByRole('button',{name:'Cambiar imagen'}).click()]);
    await chooser.setFiles({name:'nueva.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>')});
    await page.waitForFunction(()=>!!findBlock('imagen').block.src);
    assert.equal(await barra.getByRole('button',{name:'Encuadrar imagen'}).count(),1);
  });

  await t.test('replacing an editable figure removes its obsolete layer-editing action',async()=>{
    await reset();await page.evaluate(async()=>{S.prefs.sinDisenador=true;await insertaFormaLibre('rect');delete findBlock(S.selBlock).block.formaLibre;snapNow();renderAll();});
    const id=await page.evaluate(()=>S.selBlock),original=await page.evaluate(id=>findBlock(id).block.src,id);
    assert.equal(await barra.getByRole('button',{name:'Editar capas de la figura'}).count(),1);
    const [chooser]=await Promise.all([page.waitForEvent('filechooser'),barra.getByRole('button',{name:'Cambiar imagen'}).click()]);
    await chooser.setFiles({name:'nueva.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>')});
    await page.waitForFunction(({id,original})=>findBlock(id).block.src!==original,{id,original});
    assert.equal(await barra.getByRole('button',{name:'Editar capas de la figura'}).count(),0);
  });

  await t.test('stale controls do not modify a replacement object sharing its id',async()=>{
    await reset();await page.evaluate(()=>selectBlock('texto'));await visible();
    const r=await page.evaluate(()=>{const button=document.querySelector('#barraContextual [data-barra-accion="negrita"]'),f=findBlock('texto');f.arr[f.i]={...f.block,text:'Reemplazo'};const n=S.undo.length;button.click();return {text:f.arr[f.i].text,bold:!!f.arr[f.i].negrita,pasos:S.undo.length-n};});
    assert.deepEqual(r,{text:'Reemplazo',bold:false,pasos:0});
  });

  await t.test('text style and alignment survive project and export',async()=>{
    await reset();await page.evaluate(()=>selectBlock('texto'));await visible();
    await barra.getByRole('button',{name:'Negrita'}).click();
    await barra.getByRole('button',{name:'Cursiva'}).click();
    await barra.getByRole('button',{name:'Alinear texto a la derecha'}).click();
    await barra.getByRole('combobox',{name:'Tamaño del texto'}).selectOption('l');
    const r=await page.evaluate(async()=>{
      const deck=saneaDeck(JSON.parse(JSON.stringify(S.deck))).deck,b=deck.slides[1].blocks.find(b=>b.id==='texto');
      const html=await (await (await extensionSlides('exportador')).creaHTML(deck)).text();
      const tex=toBeamer(deck);return {b,html,tex};
    });
    assert.equal(r.b.negrita,true);assert.equal(r.b.cursiva,true);assert.equal(r.b.align,'right');assert.equal(r.b.size,'l');
    assert.match(r.html,/b-text[^"<>]*txt-negrita/);assert.match(r.html,/txt-cursiva/);assert.match(r.html,/al-d/);
    assert.match(r.tex,/\\bfseries/);assert.match(r.tex,/\\itshape/);assert.match(r.tex,/\\raggedleft/);
  });

  await t.test('PowerPoint retains whole-block text styles for editable plain text',async()=>{
    await reset();await page.evaluate(()=>selectBlock('otro'));
    await barra.getByRole('button',{name:'Negrita'}).click();
    await barra.getByRole('button',{name:'Cursiva'}).click();
    const xml=await page.evaluate(async()=>{
      const ppt=await (await extensionSlides('exportador')).creaPPTX(S.deck);
      return await (await window.JSZip.loadAsync(ppt.blob)).file('ppt/slides/slide2.xml').async('string');
    });
    assert.match(xml,/<a:rPr[^>]*\bb="1"[^>]*>/);assert.match(xml,/<a:rPr[^>]*\bi="1"[^>]*>/);
    assert.match(xml,/>Segundo</);
  });

  await t.test('the classic PowerPoint exporter also retains bold and italic text',async()=>{
    await reset();await page.evaluate(()=>selectBlock('otro'));
    await barra.getByRole('button',{name:'Negrita'}).click();
    await barra.getByRole('button',{name:'Cursiva'}).click();
    const xml=await page.evaluate(async()=>{
      let archivo;const old=window.downloadFile;
      window.downloadFile=async(nombre,blob)=>{if(nombre.endsWith('.pptx'))archivo=blob;return true;};
      try {await exportPPTX();} finally {window.downloadFile=old;closeModal();}
      return await (await window.JSZip.loadAsync(archivo)).file('ppt/slides/slide2.xml').async('string');
    });
    const run=xml.match(/<a:rPr[^>]*>(?:(?!<\/a:r>)[\s\S])*?<a:t[^>]*>Segundo<\/a:t>/)?.[0]||'';
    assert.match(run,/\bb="1"/);assert.match(run,/\bi="1"/);
  });

  await t.test('narrow and short windows keep the toolbar accessible alongside layers',async()=>{
    for(const viewport of [{width:390,height:844},{width:844,height:390}]){
      await page.setViewportSize(viewport);await reset();await page.evaluate(()=>selectBlock('texto'));await visible();
      await page.locator('#lienzoObjetosBtn').click();
      const dimensions=await page.evaluate(()=>{const b=document.querySelector('#barraContextual').getBoundingClientRect(),c=document.querySelector('#canvasScroll').getBoundingClientRect(),p=document.querySelector('#panelCapas').getBoundingClientRect();return {ancho:document.documentElement.scrollWidth,ventana:innerWidth,barra:{top:b.top,bottom:b.bottom,right:b.right},lienzo:{height:c.height,top:c.top,bottom:c.bottom},panel:{top:p.top}};});
      assert.ok(dimensions.ancho<=dimensions.ventana+1 && dimensions.barra.right<=dimensions.ventana+1,JSON.stringify(dimensions));
      assert.ok(dimensions.barra.bottom<=dimensions.lienzo.top+1 && dimensions.lienzo.height>70,JSON.stringify(dimensions));
      const axe=await new AxeBuilder({page}).include('#barraContextual').analyze();
      assert.deepEqual(axe.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id),[]);
      await barra.getByRole('button',{name:'Eliminar bloque'}).focus();
      const enfocado=await page.evaluate(()=>{const b=document.activeElement.getBoundingClientRect(),t=document.querySelector('#barraContextual').getBoundingClientRect();return b.left>=t.left-1 && b.right<=t.right+1;});
      assert.equal(enfocado,true,'El foco desplaza la barra hasta el control incluso en pantallas estrechas');
      await page.locator('#panelCapas').getByRole('button',{name:'Cerrar panel de capas'}).click();
    }
  });
  await t.test('the contextual toolbar is accessible in light and dark themes',async()=>{
    await page.setViewportSize({width:1440,height:1000});await reset();await page.evaluate(()=>selectBlock('texto'));
    for(const tema of ['light','dark']){
      await page.evaluate(tema=>document.documentElement.dataset.theme=tema,tema);
      const axe=await new AxeBuilder({page}).include('#barraContextual').analyze();
      assert.deepEqual(axe.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id),[],tema);
    }
  });
  assert.deepEqual(errors,[]);
});
