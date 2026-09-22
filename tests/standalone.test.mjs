import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {editor} from '../herramientas/test-browser.mjs';
test('Slides boots independently; all navigation and resource actions resolve',async()=>{const {dom,errors,run}=await editor();try{
 assert.match(dom.window.document.title,/Erlen Slides/);
 for(const view of ['inicio','plantillas','biblioteca','herramientas','servicio']){run('wsCambiar('+JSON.stringify(view)+')');assert.equal(dom.window.document.querySelector('#workspaceRoot').hidden,false);}
 run('wsNueva()');assert.equal(dom.window.document.querySelector('#workspaceRoot').hidden,true);assert.equal(run('S.deck.slides[0].blocks.length'),0);
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
test('Direct example link opens the editor after preserving the draft',async()=>{const{dom,run,errors}=await editor('http://localhost:8130/?plantilla=cinetica');try{assert.equal(dom.window.document.querySelector('#workspaceRoot').hidden,true);assert.equal(run('S.deck.meta.title'),'Cinética de primer orden');assert.deepEqual(errors,[]);}finally{dom.window.close();}});
test('Build has no production endpoints, cloud SDK, external font requests or other suite editors',()=>{
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 for(const bad of ['.supabase.co','sentryDsn','window.supabase','fonts.googleapis.com','function docEstudio(','function figEstudio(','function daEstudio('])assert.equal(html.includes(bad),false,bad);
 assert.match(html,/github.com\/jorgegonzalezsevilla\/erlen-slides/);
});

test('The suite menu appears only when mounted at /slides/, and links out without importing other editors',async()=>{
 // Montado en la suite: el menú común, con su aviso MIT íntegro en el build.
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 const licencia=readFileSync(new URL('../src/js/88a0-suite-nav.js',import.meta.url),'utf8');
 for(const clausula of ['SPDX-License-Identifier: MIT','Permission is hereby granted','WITHOUT WARRANTY OF ANY KIND'])
  assert.ok(html.includes(clausula)&&licencia.includes(clausula),'Falta parte del aviso MIT: '+clausula);
 // La copia del menú es la del paquete de diseño sincronizado, sin retoques locales.
 assert.equal(licencia,readFileSync(new URL('../src/diseno/suite-navigation.js',import.meta.url),'utf8'),'src/js/88a0-suite-nav.js difiere de src/diseno/suite-navigation.js: copia la del paquete.');
 const montado=await editor('http://localhost:8130/slides/');
 try{
  const host=montado.dom.window.document.querySelector('erlen-suite-nav');
  assert.ok(host,'El menú no se montó bajo /slides/.');
  const enlaces=[...host.shadowRoot.querySelectorAll('a')];
  assert.equal(enlaces.length,9,'Inicio de Erlen y las ocho aplicaciones del paquete de diseño 1.2.0.');
  assert.equal(host.shadowRoot.querySelector('[aria-current]').getAttribute('href'),'/slides/');
  assert.equal(host.shadowRoot.querySelector('details').open,false,'El menú abre cerrado.');
  for(const a of enlaces.filter(a=>!a.hasAttribute('aria-current')))assert.equal(a.target,'_blank');
  assert.deepEqual(montado.errors,[]);
 }finally{montado.dom.window.close();}
 // Distribución independiente: sin apps hermanas, no se inventan enlaces rotos.
 const suelto=await editor('http://localhost:8130/');
 try{
  assert.equal(suelto.dom.window.document.querySelector('erlen-suite-nav'),null,'Fuera de /slides/ no debe aparecer.');
  assert.deepEqual(suelto.errors,[]);
 }finally{suelto.dom.window.close();}
});
