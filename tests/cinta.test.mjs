import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {editor} from '../herramientas/test-browser.mjs';
/* La cinta de arriba: el componente común de la suite (src/js/55a-suite-cinta.js)
   montado por src/js/56-cinta.js. JSDOM no mide geometría: aquí se comprueban
   estructura, estados, teclado y ARIA; la vista se revisa en un navegador real. */
const FIJAS=['Inicio','Insertar','Diseño','Diapositiva','Presentar','Vista'];
const pestanas=d=>[...d.querySelectorAll('#cinta [role=tab]')];
const conBloque="wsNueva();addSlide('content');addBlockToSlide('math',1)";

test('The ribbon is the default layout, with Archivo and the fixed tabs in order; a saved side-panel choice is kept',async()=>{const {dom,errors,run}=await editor();try{
 const d=dom.window.document;run('wsNueva()');
 assert.equal(run('S.prefs.barras'),'arriba','La cinta es la disposición de fábrica');
 assert.equal(d.querySelector('#cinta').hidden,false);assert.ok(d.body.classList.contains('con-cinta'));
 assert.equal(d.querySelectorAll('#cinta .erlen-cinta').length,1,'Una sola cinta montada');
 const lista=d.querySelector('#cinta [role=tablist]');assert.equal(lista.getAttribute('aria-label'),'Herramientas de Slides');
 assert.deepEqual(pestanas(d).map(t=>t.textContent),FIJAS);
 assert.equal(pestanas(d)[0].getAttribute('aria-selected'),'true');
 assert.equal(lista.querySelector('.erlen-cinta-archivo').textContent,'Archivo','«Archivo» a la izquierda de las pestañas');
 const panel=d.querySelector('#cinta [role=tabpanel]');assert.equal(panel.getAttribute('aria-labelledby'),pestanas(d)[0].id);
 assert.ok(panel.querySelector('[role=toolbar] [role=group][aria-label=Historial]'));
 assert.equal(d.querySelector('#inspBody').childElementCount,0,'Con la cinta, el panel de detalles no se pinta hasta que se abre');
 // Quien eligió el panel a la derecha lo conserva.
 run("localStorage.setItem('erlen-slides.prefs',JSON.stringify({tema:'auto',barras:'lado'}));S.prefs=cargaPrefs();aplicaDisposicion()");
 assert.equal(run('S.prefs.barras'),'lado');assert.equal(d.querySelector('#cinta').hidden,true);assert.equal(d.body.classList.contains('con-cinta'),false);
 assert.equal(d.querySelector('#cinta .erlen-cinta'),null,'La cinta se desmonta en la otra disposición');
 assert.ok(d.querySelector('#inspBody').childElementCount>0,'El panel de la derecha vuelve a pintarse');
 run("ponDisposicion('arriba')");assert.equal(JSON.parse(dom.window.localStorage.getItem('erlen-slides.prefs')).barras,'arriba');
 assert.deepEqual(pestanas(d).map(t=>t.textContent),FIJAS);
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Selecting a block adds a contextual tab named after its type, without stealing the active tab or repainting on refresh',async()=>{const {dom,errors,run}=await editor();try{
 const d=dom.window.document;run(conBloque);
 const ctx=pestanas(d).find(t=>t.dataset.contextual);assert.ok(ctx,'Aparece la pestaña contextual');
 assert.equal(ctx.textContent,'Ecuación','Lleva el nombre del tipo de bloque, no «Bloque»');
 assert.equal(ctx.getAttribute('aria-selected'),'false','No roba la pestaña activa');
 ctx.click();
 const grupos=[...d.querySelectorAll('#cinta [role=group]')].filter(g=>!g.hidden).map(g=>g.getAttribute('aria-label'));
 assert.deepEqual(grupos,['Ecuación','Aparición','Orden'],'Sin el grupo de figura para una ecuación');
 // Refrescar tras un cambio de estado no repinta ni pierde el foco (antes se pintaba dos veces).
 const boton=d.querySelector('#cinta [data-control=subir]');boton.focus();
 run('renderAll()');
 assert.equal(d.querySelector('#cinta [data-control=subir]'),boton,'El mismo nodo: la cinta no se repinta');
 assert.equal(d.activeElement,boton,'El foco se queda donde estaba');
 // El interruptor refleja el estado del bloque.
 const pasos=d.querySelector('#cinta [data-control=por-pasos]');assert.equal(pasos.getAttribute('aria-pressed'),'false');
 pasos.click();assert.equal(run('findBlock(S.selBlock).block.step'),true);assert.equal(pasos.getAttribute('aria-pressed'),'true');
 // Otro tipo cambia el nombre; soltar la selección la quita y vuelve a una fija.
 run("addBlockToSlide('image',1)");assert.equal(pestanas(d).find(t=>t.dataset.contextual).textContent,'Figura');
 run('selectBlock(null)');
 assert.equal(pestanas(d).some(t=>t.dataset.contextual),false);assert.deepEqual(pestanas(d).map(t=>t.textContent),FIJAS);
 assert.equal(pestanas(d).filter(t=>t.getAttribute('aria-selected')==='true').length,1);
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Archivo opens its menu with file, export and about options',async()=>{const {dom,errors,run}=await editor();try{
 const d=dom.window.document;run('wsNueva()');
 const archivo=d.querySelector('#cinta .erlen-cinta-archivo');
 assert.equal(archivo.getAttribute('aria-haspopup'),'menu');assert.equal(archivo.getAttribute('aria-expanded'),'false');
 archivo.click();
 const menu=d.querySelector('.menu[role=menu][aria-label=Archivo]');assert.ok(menu,'Se abre el menú Archivo');
 assert.equal(archivo.getAttribute('aria-expanded'),'true');
 const opciones=[...menu.querySelectorAll('[role=menuitem]')].map(b=>b.children[1].textContent);
 for(const o of ['Mis presentaciones…','Nueva presentación…','Guardar como…','Guardar en un archivo…','Importar proyecto .json…','Copias y recuperación',
  'PDF…','PowerPoint (.pptx)','Código Beamer (.tex)','Folleto para repartir…','Guion del orador','Proyecto (.json)','Kit de defensa (.zip)','Imagen de la diapositiva','Acerca de Erlen Slides'])
  assert.ok(opciones.includes(o),'Falta en Archivo: '+o);
 assert.equal(d.activeElement,menu.querySelector('[role=menuitem]'),'El foco entra en el menú');
 [...menu.querySelectorAll('[role=menuitem]')].find(b=>b.textContent.startsWith('Acerca de')).click();
 assert.equal(d.querySelector('.menu[role=menu]'),null,'Elegir una opción cierra el menú');
 assert.match(d.querySelector('#modalRoot').textContent,/AGPLv3/);
 await Promise.resolve();assert.equal(archivo.getAttribute('aria-expanded'),'false','El observador de cierre (microtarea) lo devuelve a false');
 // Las operaciones de archivo no se repiten en las pestañas (una herramienta, un sitio).
 run('closeModal()');
 const etiquetas=[];for(const t of pestanas(d)){t.click();etiquetas.push(...[...d.querySelectorAll('#cinta .erlen-cinta-texto')].map(x=>x.textContent));}
 for(const o of ['Mis presentaciones','Guardar como…','PDF','PowerPoint','Kit de defensa'])assert.equal(etiquetas.includes(o),false,o+' debe vivir solo en Archivo');
 assert.equal(new Set(etiquetas.filter(e=>e!=='Más opciones…')).size,etiquetas.filter(e=>e!=='Más opciones…').length,'Ninguna herramienta repetida entre pestañas');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Ribbon icons are monochrome SVG, one per meaning',async()=>{const {dom,errors,run}=await editor();try{
 const d=dom.window.document;run(conBloque);
 const porIcono=new Map();
 for(const t of pestanas(d)){t.click();for(const b of d.querySelectorAll('#cinta .erlen-cinta-boton')){
  const ic=b.querySelector('.erlen-cinta-icono');assert.ok(ic&&ic.querySelector('svg'),'Sin icono SVG: '+b.textContent);
  assert.equal(ic.getAttribute('aria-hidden'),'true');
  const clave=ic.innerHTML,et=b.querySelector('.erlen-cinta-texto').textContent;
  if(!porIcono.has(clave))porIcono.set(clave,new Set());porIcono.get(clave).add(et);}}
 for(const ets of porIcono.values())assert.equal(ets.size,1,'El mismo icono para cosas distintas: '+[...ets].join(', '));
 assert.doesNotMatch(d.querySelector('#cinta').textContent,/[\u{1F300}-\u{1FAFF}✨♿⌛＋⛶]/u,'Sin emojis en la cinta');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Long properties open in a temporary details panel that closes with the button or Escape; the drawer button and Ctrl+Shift+M work with the ribbon',async()=>{const {dom,errors,run}=await editor();try{
 const d=dom.window.document,w=dom.window;run(conBloque+';closeModal()');   // insertar una ecuación abre su editor
 pestanas(d).find(t=>t.dataset.contextual).click();
 const props=d.querySelector('#cinta [data-control=propiedades]');props.focus();props.click();   // como al pulsarlo con el teclado
 assert.ok(d.body.classList.contains('panel-temporal'));assert.equal(run('S.tab'),'bloque');
 assert.ok(d.querySelector('#inspBody').childElementCount>1,'El panel pinta las propiedades del bloque');
 const cerrar=d.querySelector('#detallesCerrar');assert.ok(cerrar);assert.equal(d.activeElement,cerrar,'El foco pasa al panel');
 cerrar.click();assert.equal(d.body.classList.contains('panel-temporal'),false);
 assert.equal(d.activeElement,props,'Al cerrar, el foco vuelve a la cinta');
 // Escape dentro del panel también lo cierra.
 d.querySelector('[data-pestana=diseno]').click();d.querySelector('#cinta [data-control=escudo]').click();
 assert.ok(d.body.classList.contains('panel-temporal'));assert.equal(run('S.tab'),'design');
 const dentro=d.activeElement;assert.ok(d.querySelector('#inspector').contains(dentro),'El foco va a la sección pedida');
 dentro.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
 assert.equal(d.body.classList.contains('panel-temporal'),false);
 // El botón del cajón abre el panel de detalles (antes no hacía nada con la cinta puesta).
 d.querySelector('#hambBtn').click();assert.ok(d.body.classList.contains('panel-temporal'));
 run('cierraPanelDetalles()');
 // Ctrl+Shift+M enciende la mirada y ya no añade una diapositiva.
 run('selectBlock(null)');const n=run('S.deck.slides.length');
 d.body.dispatchEvent(new w.KeyboardEvent('keydown',{key:'M',ctrlKey:true,shiftKey:true,bubbles:true}));
 assert.equal(run('MIRADA.on'),true);assert.equal(run('S.deck.slides.length'),n);
 d.body.dispatchEvent(new w.KeyboardEvent('keydown',{key:'m',ctrlKey:true,bubbles:true}));assert.equal(run('S.deck.slides.length'),n+1,'Ctrl+M sigue añadiendo una diapositiva');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('The ribbon script is the synced suite package copy and its stylesheet is inlined in the build',()=>{
 const copia=readFileSync(new URL('../src/js/55a-suite-cinta.js',import.meta.url),'utf8');
 assert.equal(copia,readFileSync(new URL('../src/diseno/suite-cinta.js',import.meta.url),'utf8'),'src/js/55a-suite-cinta.js difiere de src/diseno/suite-cinta.js: copia la del paquete.');
 const orden=readFileSync(new URL('../src/js/_orden.txt',import.meta.url),'utf8').trim().split('\n');
 assert.ok(orden.indexOf('55a-suite-cinta.js')>=0&&orden.indexOf('55a-suite-cinta.js')===orden.indexOf('56-cinta.js')-1,'El componente va justo antes de 56-cinta.js');
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 assert.ok(html.includes(readFileSync(new URL('../src/diseno/cinta.css',import.meta.url),'utf8')),'cinta.css del paquete, íntegro en el build');
 assert.ok(html.includes('const erlenCinta=(()=>{'));
 assert.ok(Buffer.byteLength(html)<=3*1024*1024,'El HTML único no pasa de 3 MiB: '+Buffer.byteLength(html));
 assert.doesNotMatch(readFileSync(new URL('../src/css/01-editor.css',import.meta.url),'utf8'),/\.cinta-(b|tab|tabs|fila|grupo|items|bigs|col|gn|hoja|fl|sep)\b/,'No queda CSS de la cinta antigua');
});
