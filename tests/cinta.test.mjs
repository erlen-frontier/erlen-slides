import test from 'node:test';import assert from 'node:assert/strict';import {editor} from '../herramientas/test-browser.mjs';
/* La cinta de arriba: el componente local (src/diseno/cinta.js)
   montado por src/js/56-cinta.js. JSDOM no mide geometría: aquí se comprueban
   estructura, estados, teclado y ARIA; la vista se revisa en un navegador real. */
const FIJAS=['Insertar','Diseño','Presentar'];
const pestanas=d=>[...d.querySelectorAll('#cinta [role=tab]')];
const conBloque="wsNueva();addSlide('content');addBlockToSlide('math',1)";

test('The ribbon is the default layout, with Archivo and the fixed tabs in order; a saved side-panel choice is kept',async()=>{const {dom,errors,run}=await editor();try{
 const d=dom.window.document;run('wsNueva()');
 assert.equal(run('S.prefs.barras'),'arriba','La cinta es la disposición de fábrica');
 assert.equal(d.querySelector('#cinta').hidden,false);assert.ok(d.body.classList.contains('con-cinta'));
 assert.equal(d.querySelectorAll('#cinta .tabula-cinta').length,1,'Una sola cinta montada');
 const lista=d.querySelector('#cinta [role=tablist]');assert.equal(lista.getAttribute('aria-label'),'Herramientas de Lámina');
 assert.deepEqual(pestanas(d).map(t=>t.textContent),FIJAS);
 assert.equal(pestanas(d)[0].getAttribute('aria-selected'),'true');
 assert.equal(d.querySelector('#cinta .tabula-cinta-pestanas > .tabula-cinta-archivo').textContent,'Archivo','«Archivo» a la izquierda de las pestañas');
 assert.equal(lista.querySelector('.tabula-cinta-archivo, .tabula-cinta-plegar'),null,'El tablist solo contiene pestañas (paquete 1.7.0)');
 assert.deepEqual([...lista.children].map(c=>c.getAttribute('role')),FIJAS.map(()=>'tab'));
 const panel=d.querySelector('#cinta [role=tabpanel]');assert.equal(panel.getAttribute('aria-labelledby'),pestanas(d)[0].id);
 assert.ok(panel.querySelector('[role=toolbar] [role=group][aria-label=Diapositivas]'));
 assert.ok(d.querySelector('#inspBody').childElementCount>0,'El inspector persistente único se pinta al abrir');
 // Quien eligió el panel a la derecha lo conserva.
 run("localStorage.setItem('tabula.prefs',JSON.stringify({tema:'auto',barras:'lado'}));S.prefs=cargaPrefs();aplicaDisposicion()");
 assert.equal(run('S.prefs.barras'),'lado');assert.equal(d.querySelector('#cinta').hidden,true);assert.equal(d.body.classList.contains('con-cinta'),false);
 assert.equal(d.querySelector('#cinta .tabula-cinta'),null,'La cinta se desmonta en la otra disposición');
 assert.ok(d.querySelector('#inspBody').childElementCount>0,'El panel de la derecha vuelve a pintarse');
 run("ponDisposicion('arriba')");assert.equal(JSON.parse(dom.window.localStorage.getItem('tabula.prefs')).barras,'arriba');
 assert.deepEqual(pestanas(d).map(t=>t.textContent),FIJAS);
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Selecting a block shows the single contextual toolbar outside the slide, not a ribbon tab',async()=>{const {dom,errors,run}=await editor();try{
 const d=dom.window.document;run(conBloque);
 assert.equal(pestanas(d).some(t=>t.dataset.contextual),false,'No hay pestaña contextual');
 assert.deepEqual(pestanas(d).map(t=>t.textContent),FIJAS);
 const bar=d.querySelector('#barraContextual');assert.equal(bar.hidden,false,'La barra única vive fuera de la diapositiva');
 assert.match(bar.textContent,/Ecuación/);
 const boton=bar.querySelector('[data-barra-accion=editar]');assert.ok(boton,'Acción exclusiva Editar en la barra única');
 boton.focus();run('renderAll()');
 assert.equal(d.querySelector('#barraContextual [data-barra-accion=editar]'),boton,'La cinta no repinta el nodo enfocado');
 assert.equal(d.activeElement,boton);
 // Sin selección la barra se oculta y no queda blk-toolbar flotante en el lienzo.
 run('selectBlock(null)');
 assert.equal(bar.hidden,true);
 assert.equal(d.querySelector('#stageInner .blk-toolbar'),null,'Sin toolbar flotante duplicado');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Contextual action names follow a multiple selection without replacing the focused button',async()=>{const {dom,errors,run}=await editor();try{
 const d=dom.window.document;
 run("wsNueva();addSlide('content');alternaLienzoLibre();addBlockToSlide('text',1);window.__a=S.selBlock;addBlockToSlide('text',1);window.__b=S.selBlock;selectBlock(__a)");
 assert.equal(d.querySelector('#barraContextual').hidden,false);
 const duplicar=d.querySelector('#barraContextual [data-barra-accion=duplicar]');duplicar.focus();
 assert.equal(duplicar.getAttribute('aria-label'),'Duplicar bloque');
 run('selectBlock(__b,true)');
 assert.equal(duplicar.getAttribute('aria-label'),'Duplicar selección');
 assert.equal(d.querySelector('#barraContextual [data-barra-accion=duplicar]'),duplicar);
 assert.equal(d.activeElement,duplicar);
 run('selectBlock(__b,true)');
 assert.equal(duplicar.getAttribute('aria-label'),'Duplicar bloque');
 assert.equal(d.activeElement,duplicar);
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Canvas controls in the ribbon share state with the controls below the slide',async()=>{const {dom,errors,run}=await editor();try{
 const d=dom.window.document;run('wsNueva()');d.querySelector('#cinta [data-pestana=diseno]').click();
 assert.equal(run('cintaDiapositiva().grupos.flatMap(g=>g.controles).some(c=>c.id==="lienzo-libre")'),true,'El lienzo sigue en catálogo aunque esté oculto del primer nivel');
 run("addSlide('content');alternaLienzoLibre()");
 const palette=id=>{const c=run('cintaDiapositiva().grupos.flatMap(g=>g.controles).find(x=>x.id==="'+id+'")');assert.ok(c,'Paleta ofrece '+id);return c;};
 assert.equal(run('document.querySelector("#lienzoLibreBtn").getAttribute("aria-pressed")'),'true');
 const capas=palette('lienzo-capas');assert.ok(capas);
 run('openObjetosLienzo()');
 assert.equal(d.querySelector('#lienzoImanBtn')?.getAttribute('aria-pressed')??'true','true','El imán conserva su estado al activar el lienzo');
 assert.ok(palette('lienzo-formas'));
 assert.ok(palette('lienzo-organizar'));
 assert.ok(palette('lienzo-conectores'));
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Scientific chart tools are directly available without changing existing data',async()=>{const {dom,errors,run}=await editor();try{
 const d=dom.window.document;run("wsNueva();addSlide('content')");
 d.querySelector('#cinta [data-pestana=insertar]').click();
 const grafica=d.querySelector('#cinta [data-control=ins-chart]');
 const dinamica=d.querySelector('#cinta [data-control=ins-func]');
 assert.equal(grafica.textContent,'Gráfica de datos');
 assert.equal(dinamica.textContent,'Gráfica dinámica');
 grafica.click();
 assert.equal(run('findBlock(S.selBlock).block.type'),'chart');
 run('closeModal();window.__grafica=S.selBlock;window.__datos=JSON.stringify(findBlock(__grafica).block)');
 dinamica.click();
 assert.equal(run('findBlock(S.selBlock).block.type'),'func');
 assert.equal(run('JSON.stringify(findBlock(__grafica).block)'),run('__datos'));
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Archivo opens its menu with file, export and about options',async()=>{const {dom,errors,run}=await editor();try{
 const d=dom.window.document;run('wsNueva()');
 const archivo=d.querySelector('#cinta .tabula-cinta-archivo');
 assert.equal(archivo.getAttribute('aria-haspopup'),'menu');assert.equal(archivo.getAttribute('aria-expanded'),'false');
 archivo.click();
 const menu=d.querySelector('.menu[role=menu][aria-label=Archivo]');assert.ok(menu,'Se abre el menú Archivo');
 assert.equal(archivo.getAttribute('aria-expanded'),'true');
 const opciones=[...menu.querySelectorAll('[role=menuitem]')].map(b=>b.children[1].textContent);
 for(const o of ['Mis presentaciones…','Nueva presentación…','Guardar como…','Guardar en un archivo…','Importar presentación…','Revisar y compartir…','Copias y recuperación',
  'PDF…','PowerPoint (.pptx)','Código Beamer (.tex)','Folleto para repartir…','Guion del orador','Proyecto (.json)','Kit de defensa (.zip)','Imagen de la diapositiva','Acerca de Lámina'])
  assert.ok(opciones.includes(o),'Falta en Archivo: '+o);
 assert.equal(d.activeElement,menu.querySelector('[role=menuitem]'),'El foco entra en el menú');
 [...menu.querySelectorAll('[role=menuitem]')].find(b=>b.textContent.startsWith('Acerca de')).click();
 assert.equal(d.querySelector('.menu[role=menu]'),null,'Elegir una opción cierra el menú');
 assert.match(d.querySelector('#modalRoot').textContent,/AGPLv3/);
 await Promise.resolve();assert.equal(archivo.getAttribute('aria-expanded'),'false','El observador de cierre (microtarea) lo devuelve a false');
 // Las operaciones de archivo no se repiten en las pestañas (una herramienta, un sitio).
 run('closeModal()');
 const etiquetas=[];for(const t of pestanas(d)){t.click();etiquetas.push(...[...d.querySelectorAll('#cinta .tabula-cinta-texto')].map(x=>x.textContent));}
 for(const o of ['Mis presentaciones','Guardar como…','PDF','PowerPoint','Kit de defensa'])assert.equal(etiquetas.includes(o),false,o+' debe vivir solo en Archivo');
 assert.equal(etiquetas.filter(e=>e==='Catálogo científico').length,1,'El catálogo se encuentra junto a las herramientas del lienzo vía catálogo/ribbon');
 const unicas=etiquetas.filter(e=>e!=='Más opciones…');
 assert.equal(new Set(unicas).size,unicas.length,'Las demás herramientas no se repiten entre pestañas');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Ribbon icons are monochrome SVG, one per meaning',async()=>{const {dom,errors,run}=await editor();try{
 const d=dom.window.document;run(conBloque);
 const porIcono=new Map();
 for(const t of pestanas(d)){t.click();for(const b of d.querySelectorAll('#cinta .tabula-cinta-boton')){
  const ic=b.querySelector('.tabula-cinta-icono');assert.ok(ic&&ic.querySelector('svg'),'Sin icono SVG: '+b.textContent);
  assert.equal(ic.getAttribute('aria-hidden'),'true');
  const clave=ic.innerHTML,et=b.querySelector('.tabula-cinta-texto').textContent;
  if(!porIcono.has(clave))porIcono.set(clave,new Set());porIcono.get(clave).add(et);}}
 for(const ets of porIcono.values())assert.equal(ets.size,1,'El mismo icono para cosas distintas: '+[...ets].join(', '));
 assert.doesNotMatch(d.querySelector('#cinta').textContent,/[\u{1F300}-\u{1FAFF}✨♿⌛＋⛶]/u,'Sin emojis en la cinta');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Long properties open in a temporary details panel that closes with the button or Escape; the drawer button and Ctrl+Shift+M work with the ribbon',async()=>{const {dom,errors,run}=await editor();try{
 const d=dom.window.document,w=dom.window;run(conBloque+';closeModal()');   // insertar una ecuación abre su editor
 const props=d.querySelector('#barraContextual [data-barra-accion=propiedades]');assert.ok(props);props.focus();props.click();
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
