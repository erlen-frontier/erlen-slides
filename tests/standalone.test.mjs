import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {IDBFactory} from 'fake-indexeddb';import {editor} from '../herramientas/test-browser.mjs';
test('Slides boots independently; all navigation and resource actions resolve',async()=>{const {dom,errors,run}=await editor();try{
 assert.match(dom.window.document.title,/Tabula/);
 // Cada ruta local abre su vista de inicio.
 const inicio=()=>dom.window.document.querySelector('#inicioRoot main.erlen-inicio');
 const vistas={inicio:'inicio',plantillas:'ejemplos',biblioteca:'biblioteca',herramientas:'recursos',servicio:'acerca'};
 for(const [view,vista] of Object.entries(vistas)){run('wsCambiar('+JSON.stringify(view)+')');assert.equal(inicio().hidden,false);assert.equal(run('INICIO.vista'),vista);assert.equal(dom.window.location.hash,view==='inicio'?'#inicio':'#inicio/'+view);}
 run('wsNueva()');assert.equal(inicio().hidden,true);assert.equal(dom.window.location.hash,'#presentaciones');assert.equal(run('S.deck.slides[0].blocks.length'),0);
 run('openDecks()');run('closeModal()');run('openEdicion()');assert.match(dom.window.document.querySelector('#modalRoot').textContent,/AGPLv3/);assert.deepEqual(errors,[]);
}finally{dom.window.close();}});
test('Twelve examples validate and render all 72 slides, with editable blocks and Beamer output',async()=>{const {dom,errors,run}=await editor();try{
 assert.equal(run('EJEMPLOS.length'),12);
 for(let i=0;i<12;i++){
  run(`window.__deck=EJEMPLOS[${i}].build()`);const clean=run('saneaDeck(__deck)');assert.ok(clean.deck,JSON.stringify(clean));
  assert.equal(clean.deck.slides.length,6);assert.match(clean.deck.meta.subtitle,/ilustrativos/);
  for(let j=0;j<6;j++){run(`window.__slide=renderSlide(__deck,${j},'export')`);const node=dom.window.__slide;assert.ok(node);assert.equal(node.querySelectorAll('.katex-error').length,0,'KaTeX '+i+'/'+j);}
  assert.match(run('toBeamer(__deck)'),/\\begin\{document\}/);const first=run('JSON.stringify(__deck)');run(`EJEMPLOS[${i}].build().meta.title='Changed'`);assert.equal(run('JSON.stringify(__deck)'),first);
 }
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});
test('Named presentation survives switching to an example and back',async()=>{const{dom,run,errors}=await editor();try{
 run("wsNueva();S.deck.meta.title='Original';S.deck.slides[0].title='Original result';wsInicio();wsNueva(EJEMPLOS[0].build());wsInicio('biblioteca')");
 assert.equal(run("decksStore().Original.deck.slides[0].title"),'Original result');assert.ok(run('Object.keys(decksStore()).length>=2'));assert.deepEqual(errors,[]);
}finally{dom.window.close();}});
test('Direct example link opens the editor after preserving the draft',async()=>{const{dom,run,errors}=await editor('http://localhost:8130/?plantilla=cinetica');try{assert.equal(dom.window.document.querySelector('#inicioRoot main.erlen-inicio').hidden,true);assert.equal(dom.window.location.search,'','El parámetro se consume y se retira de la URL');assert.ok(!dom.window.document.querySelector('#app').inert,'El editor no queda inerte');assert.equal(run('S.deck.meta.title'),'Cinética de primer orden');assert.deepEqual(errors,[]);}finally{dom.window.close();}});
test('Build has no production endpoints, cloud SDK, external font requests or other suite editors',()=>{
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 for(const bad of ['.supabase.co','sentryDsn','window.supabase','fonts.googleapis.com','function docEstudio(','function figEstudio(','function daEstudio('])assert.equal(html.includes(bad),false,bad);
 assert.match(html,/github.com\/erlen-frontier\/erlen-slides/);
});

test('The editor stays independent at the root and in a subdirectory',async()=>{
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 for(const clausula of ['SPDX-License-Identifier: MIT','Permission is hereby granted','WITHOUT WARRANTY OF ANY KIND'])
  assert.ok(html.includes(clausula),'Falta parte del aviso MIT de los componentes: '+clausula);
 assert.doesNotMatch(html,/erlen-suite-catalog|erlen-suite-exchange-v2/);
 for(const ruta of ['/','/slides/']){
  const app=await editor('http://localhost:8130'+ruta);
  try{
   const d=app.dom.window.document;
   assert.equal(d.querySelector('erlen-suite-nav'),null,'No hay menú de otras aplicaciones en '+ruta);
   assert.ok(d.querySelector('#inicioRoot main.erlen-inicio:not([hidden])'));
   app.run('wsNueva()');
   assert.equal(d.querySelector('.erlen-marco').hasAttribute('inert'),false);
   assert.equal(d.querySelector('erlen-suite-nav'),null,'El editor tampoco monta el menú en '+ruta);
   assert.deepEqual(app.errors,[]);
  }finally{app.dom.window.close();}
 }
});

test('A retired copy link does not open or delete an existing transfer',async()=>{
 const db=new IDBFactory(),id='0b8c1f3e-5a7d-4c2e-9f10-1234567890ab',valor={id,payloadJSON:'original'};
 await new Promise((ok,fail)=>{const r=db.open('erlen-suite-exchange-v2',1);r.onupgradeneeded=()=>r.result.createObjectStore('transfers',{keyPath:'id'});r.onerror=()=>fail(r.error);r.onsuccess=()=>{const base=r.result,tx=base.transaction('transfers','readwrite');tx.objectStore('transfers').put(valor);tx.oncomplete=()=>{base.close();ok();};tx.onerror=()=>fail(tx.error);};});
 const app=await editor('http://localhost:8130/slides/#copy='+id,{indexedDB:db});
 try{
  assert.equal(app.dom.window.location.hash,'#inicio');
  assert.equal(app.dom.window.document.querySelector('#modalRoot [role=dialog]'),null);
  assert.equal(app.run('Object.keys(decksStore()).length'),0);
  const guardado=await new Promise((ok,fail)=>{const r=db.open('erlen-suite-exchange-v2',1);r.onerror=()=>fail(r.error);r.onsuccess=()=>{const base=r.result,tx=base.transaction('transfers','readonly'),lectura=tx.objectStore('transfers').get(id);lectura.onsuccess=()=>ok(lectura.result);lectura.onerror=()=>fail(lectura.error);tx.oncomplete=()=>base.close();};});
  assert.deepEqual(guardado,valor);assert.deepEqual(app.errors,[]);
 }finally{app.dom.window.close();}
});
