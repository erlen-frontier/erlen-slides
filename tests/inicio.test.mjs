import test from 'node:test';import assert from 'node:assert/strict';import {editor} from '../herramientas/test-browser.mjs';
/* La pantalla de inicio local montada por src/js/88-workspace.js. JSDOM no mide geometría: aquí se
   comprueban estructura, rutas, foco, inercia del editor y datos; la vista se revisa en un navegador real. */
const raiz=d=>d.querySelector('#inicioRoot main.tabula-inicio');
const nav=(d,texto)=>[...raiz(d).querySelectorAll('.tabula-inicio-enlace')].find(a=>a.textContent===texto);
const boton=(d,texto)=>[...raiz(d).querySelectorAll('button')].find(b=>b.textContent.trim()===texto);
const espera=()=>new Promise(r=>setTimeout(r,0));
/* Cambiar el hash a mano: hashchange es asíncrono (en un navegador y en jsdom), y desde jsdom 30 llega después
   de un setTimeout(0). Se espera al evento mismo, y un turno más para que la vista termine de pintarse. */
const aHash=(w,h)=>new Promise(r=>{w.addEventListener('hashchange',()=>setTimeout(r,0),{once:true});w.location.hash=h;});
test('Slides opens on its home screen: inert editor, focus on the h1, collection and illustrative examples',async()=>{const {dom,errors,run}=await editor();try{
 const d=dom.window.document,w=dom.window;
 assert.equal(raiz(d).hidden,false,'Al abrir se ve el inicio, no el editor vacío');
 assert.equal(w.location.hash,'#inicio');
 assert.equal(d.querySelector('.tabula-marco').hasAttribute('inert'),true,'El editor queda inerte bajo el inicio');
 assert.ok(d.body.classList.contains('tabula-inicio-abierto'));
 assert.equal(d.activeElement,raiz(d).querySelector('h1'),'El foco va al h1');
 assert.equal(raiz(d).querySelectorAll('h1').length,1);
 const rejilla=raiz(d).querySelector('[aria-label="Colección de inicio"]');
 assert.equal(rejilla.querySelector('.tabula-inicio-nueva strong').textContent,'Nueva presentación');
 const ejemplos=[...rejilla.querySelectorAll('.tabula-inicio-ejemplo')];
 // Desde el paquete 1.8.0 el inicio muestra todos los ejemplos, no solo los tres primeros.
 const titulos=ejemplos.map(e=>e.querySelector('h2').textContent);
 assert.deepEqual(titulos.slice(0,3),['Calibración UV–Vis','Cinética de primer orden','Defensa de tesis']);
 assert.equal(titulos.length,run('EJEMPLOS.length'));
 for(const e of ejemplos)assert.match(e.querySelector('p').textContent,/Datos ilustrativos\.$/,'Cada ejemplo declara sus datos ilustrativos');
 assert.match(raiz(d).querySelector('.tabula-inicio-pie').textContent,/Ejemplos didácticos · sustituye los datos/);
 assert.ok(boton(d,'Explorar ejemplos')&&boton(d,'Importar proyecto'));
 assert.equal(boton(d,'Continuar presentación'),undefined,'Sin nada empezado no se ofrece continuar');
 // Buscar filtra la colección.
 const buscar=raiz(d).querySelector('input[type=search]');buscar.value='cinética';buscar.dispatchEvent(new w.Event('input'));
 assert.deepEqual(ejemplos.filter(e=>!e.hidden).map(e=>e.querySelector('h2').textContent),['Cinética de primer orden']);
 // Con el inicio abierto no actúan los atajos del editor.
 const n=run('S.deck.slides.length');
 d.body.dispatchEvent(new w.KeyboardEvent('keydown',{key:'m',ctrlKey:true,bubbles:true}));
 d.body.dispatchEvent(new w.KeyboardEvent('keydown',{key:'F9',bubbles:true}));
 assert.equal(run('S.deck.slides.length'),n);assert.equal(d.querySelector('#app').classList.contains('concentrado'),false);
 // «Abrir ejemplo» entra al editor con el ejemplo y devuelve el foco al título.
 ejemplos[0].querySelector('button').click();
 assert.equal(raiz(d).hidden,true);assert.ok(!d.querySelector('.tabula-marco').hasAttribute('inert'));
 assert.equal(run('S.deck.meta.title'),'Calibración UV–Vis');assert.equal(w.location.hash,'#presentaciones');
 assert.equal(d.activeElement,d.querySelector('#deckTitleInput'));
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Local hash routes follow navigation in both directions; unknown prefixes fall back to the home view',async()=>{const {dom,errors,run}=await editor('http://localhost:8130/#suite/herramientas');try{
 const d=dom.window.document,w=dom.window;
 assert.equal(run('INICIO.vista'),'inicio','#suite/herramientas ya no es una ruta: abre Inicio');
 assert.equal(w.location.hash,'#inicio','El prefijo desconocido se normaliza a Inicio');
 assert.equal(w.history.length,1,'La normalización no crea una entrada en el historial');
 const pares=[['Mis presentaciones','biblioteca'],['Ejemplos editables','plantillas'],['Recursos y respaldos','herramientas'],['Acerca de','servicio'],['Inicio','inicio']];
 for(const [texto,ruta] of pares){nav(d,texto).click();assert.equal(w.location.hash,ruta==='inicio'?'#inicio':'#inicio/'+ruta,texto);assert.equal(nav(d,texto).getAttribute('aria-current'),'page');assert.equal(d.activeElement,raiz(d).querySelector('h1'));}
 // Hacia atrás: cambiar el hash abre la vista, #presentaciones vuelve al editor.
 await aHash(w,'#inicio/plantillas');
 assert.equal(run('INICIO.vista'),'ejemplos');
 const titulos=[...raiz(d).querySelectorAll('.tabula-inicio-ejemplo h2')].map(h=>h.textContent);
 assert.equal(titulos.length,12,'Los doce ejemplos editables');
 await aHash(w,'#presentaciones');
 assert.equal(raiz(d).hidden,true);assert.ok(!d.querySelector('.tabula-marco').hasAttribute('inert'));
 await aHash(w,'#inicio/servicio');
 assert.equal(run('INICIO.vista'),'acerca');assert.match(raiz(d).textContent,/versión 0\.3\.0/);assert.match(raiz(d).textContent,/AGPLv3/);
 await aHash(w,'#inicio/nada');assert.equal(run('INICIO.vista'),'inicio','Una vista desconocida cae en Inicio');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Opening the home screen keeps the draft; the library opens, duplicates in place and downloads',async()=>{const {dom,errors,run}=await editor();try{
 const d=dom.window.document;
 run("wsNueva();S.deck.meta.title='Seminario';S.deck.slides[0].title='Borrador sin guardar';saveInd()");
 // La marca de la barra vuelve al inicio sin perder el borrador.
 d.querySelector('.tabula-marco-marca').click();
 assert.equal(raiz(d).hidden,false);assert.equal(run("decksStore().Seminario.deck.slides[0].title"),'Borrador sin guardar');
 assert.ok(boton(d,'Continuar presentación'),'Se ofrece continuar la presentación empezada');
 assert.ok([...raiz(d).querySelectorAll('.tabula-inicio-recientes strong')].some(s=>s.textContent==='Seminario'),'Aparece en Recientes');
 boton(d,'Continuar presentación').click();
 assert.equal(raiz(d).hidden,true);assert.equal(run('S.deck.slides[0].title'),'Borrador sin guardar');
 // Archivo → Inicio y biblioteca.
 d.querySelector('#cinta .tabula-cinta-archivo').click();
 [...d.querySelectorAll('.menu[role=menu] [role=menuitem]')].find(b=>b.textContent.includes('Inicio y biblioteca')).click();
 assert.equal(raiz(d).hidden,false);
 nav(d,'Mis presentaciones').click();
 const tarjeta=()=>[...raiz(d).querySelectorAll('.tabula-inicio-tarjeta')];
 assert.equal(tarjeta().length,1);assert.match(tarjeta()[0].textContent,/Seminario/);assert.match(tarjeta()[0].textContent,/1 diapositiva ·/);
 assert.match(raiz(d).querySelector('[role=status]').textContent,/1 de 1 presentaciones/);
 assert.match(raiz(d).textContent,/Borrar los datos del navegador elimina estas copias/);
 // Duplicar deja la copia en la biblioteca, sin abrirla.
 raiz(d).querySelector('[aria-label="Duplicar «Seminario»"]').click();await Promise.resolve();await espera();
 assert.equal(raiz(d).hidden,false,'Duplicar no sale del inicio');
 assert.deepEqual(Object.keys(run('decksStore()')).sort(),['Seminario','Seminario · copia']);
 assert.equal(tarjeta().length,2);assert.equal(run("decksStore()['Seminario · copia'].deck.meta.title"),'Seminario · copia');
 // Descargar entrega el proyecto JSON.
 run("window.__bajadas=[];downloadFile=(n,t)=>{__bajadas.push([n,t])}");
 raiz(d).querySelector('[aria-label="Descargar «Seminario»"]').click();
 assert.equal(run('__bajadas[0][0]'),'Seminario.json');assert.equal(JSON.parse(run('__bajadas[0][1]')).slides[0].title,'Borrador sin guardar');
 // Buscar sin resultados muestra el estado vacío de búsqueda.
 const buscar=raiz(d).querySelector('input[type=search]');buscar.value='zzz';buscar.dispatchEvent(new dom.window.Event('input'));
 assert.match(raiz(d).textContent,/No hay coincidencias/);
 // Abrir carga la copia en el editor.
 buscar.value='';buscar.dispatchEvent(new dom.window.Event('input'));
 raiz(d).querySelector('[aria-label="Abrir «Seminario · copia»"]').click();
 assert.equal(raiz(d).hidden,true);assert.equal(run('S.deckName'),'Seminario · copia');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('An empty library explains where work is kept; personal templates are listed and can be removed with undo',async()=>{const {dom,errors,run}=await editor('http://localhost:8130/#inicio/biblioteca');try{
 const d=dom.window.document;
 assert.match(raiz(d).textContent,/Aquí empieza tu próxima charla/);
 assert.ok(boton(d,'Nueva presentación'),'El estado vacío ofrece crear una');
 run("lsSet(LS_BIBLIOTECA,[{nombre:'Grupo de lectura',deck:EJEMPLOS[4].build(),when:1}]);INICIO.actualizar()");
 nav(d,'Ejemplos editables').click();
 const personal=[...raiz(d).querySelectorAll('.tabula-inicio-ejemplo')].find(e=>e.querySelector('h2').textContent==='Grupo de lectura');
 assert.ok(personal,'La plantilla personal aparece entre los ejemplos');
 assert.equal(personal.querySelector('.tabula-inicio-eyebrow').textContent,'Personal');assert.equal(personal.querySelector('button').textContent,'Usar plantilla');
 nav(d,'Recursos y respaldos').click();
 boton(d,'Gestionar plantillas').click();
 const modal=d.querySelector('#modalRoot [role=dialog]');assert.ok(modal);assert.equal(raiz(d).inert,true,'El diálogo deja inerte el inicio');
 modal.querySelector('[aria-label="Quitar «Grupo de lectura»"]').click();
 assert.equal(run('wsPlantillas().length'),0);
 [...d.querySelectorAll('#toasts .toast-btn')].pop().click();
 assert.equal(run('wsPlantillas().length'),1,'«Deshacer» la recupera');
 run('closeModal()');assert.ok(!raiz(d).inert);
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('An unknown direct example link opens the home screen with an explicit notice',async()=>{const {dom,errors}=await editor('http://localhost:8130/?plantilla=no-existe');try{
 const d=dom.window.document;
 assert.equal(raiz(d).hidden,false);assert.equal(dom.window.location.search,'');
 assert.match(raiz(d).querySelector('.tabula-inicio-aviso[role=alert]').textContent,/No existe el ejemplo «no-existe»/);
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

/* Almacenes estables: las claves antiguas de la Suite (`erlen-color/estilo`) no se
   leen, migran ni borran al arrancar, y las claves propias `tabula.*` no se crean
   sin elección. Esto proteje datos de usuario, no apariencia/materiales. */
test('Appearance keeps legacy suite keys and own tabula stores untouched under theme/density changes',async()=>{
 const accesos=[],antiguas=['erlen-color','erlen-estilo'],registra=w=>{
  const proto=Object.getPrototypeOf(w.localStorage);
  for(const metodo of ['getItem','setItem','removeItem','clear']){const original=proto[metodo];proto[metodo]=function(...args){accesos.push(metodo+':'+String(args[0]));return original.apply(this,args);};}
 };
 const {dom,errors,run}=await editor('http://localhost:8130/',{preparar:w=>{
  w.localStorage.setItem('erlen-color','cobre');w.localStorage.setItem('erlen-estilo','glassmorfismo');registra(w);
 }});try{
  const w=dom.window,d=w.document,almacen=w.localStorage,arranque=accesos.slice();
  const tocadas=arranque.filter(a=>antiguas.includes(a.slice(a.indexOf(':')+1)));
  assert.deepEqual(tocadas,[],'Cero accesos a claves antiguas al arrancar: '+tocadas.join(', '));
  assert.equal(almacen.getItem('erlen-color'),'cobre','La clave antigua conserva sus bytes');
  assert.equal(almacen.getItem('erlen-estilo'),'glassmorfismo');
  assert.equal(almacen.getItem('tabula.biblioteca.v1'),null);
  // Cambio de tema/densidad solo toca prefs propias: nunca escribe/borra legacy ni biblioteca
  run("cambiaTemaApp('claro');S.prefs.densidad='compacta';guardaPrefs();aplicaDensidadApp()");
  assert.equal(d.documentElement.dataset.theme,'light');
  assert.equal(d.documentElement.dataset.dens,'compacta');
  assert.equal(almacen.getItem('erlen-color'),'cobre');
  assert.equal(almacen.getItem('erlen-estilo'),'glassmorfismo');
  assert.deepEqual(errors,[]);
 }finally{dom.window.close();}
});

/* Con almacenamiento bloqueado el diálogo de Apariencia sigue usable (tema/densidad
   viven en la sesión) y no puede grabar ni modificar claves legacy. */
test('Appearance dialog stays usable when storage is blocked without touching legacy keys',async()=>{
 const bloqueado=await editor('http://localhost:8130/',{preparar:w=>Object.defineProperty(w,'localStorage',{configurable:true,get(){throw new w.DOMException('Bloqueado','SecurityError');}})});
 try{
  const w=bloqueado.dom.window,d=w.document;boton(d,'Apariencia').click();
  const dialogo=d.querySelector('#modalRoot [role=dialog]');assert.ok(dialogo);
  const tema=[...dialogo.querySelectorAll('label')].find(l=>l.textContent==='Tema');
  const campo=d.getElementById(tema.htmlFor);campo.value='oscuro';campo.dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.equal(d.documentElement.dataset.theme,'dark');
  [...dialogo.querySelectorAll('button')].find(b=>b.textContent==='Cerrar').click();boton(d,'Apariencia').click();
  const nuevo=d.querySelector('#modalRoot [role=dialog]'),etiqueta=[...nuevo.querySelectorAll('label')].find(l=>l.textContent==='Tema');
  assert.equal(d.getElementById(etiqueta.htmlFor).value,'oscuro','La elección dura la sesión');
  assert.deepEqual(bloqueado.errors,[]);
 }finally{bloqueado.dom.window.close();}
});
