import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {editor} from '../herramientas/test-browser.mjs';
/* La pantalla de inicio local montada por src/js/88-workspace.js. JSDOM no mide geometría: aquí se
   comprueban estructura, rutas, foco, inercia del editor y datos; la vista se revisa en un navegador real. */
const raiz=d=>d.querySelector('#inicioRoot main.erlen-inicio');
const nav=(d,texto)=>[...raiz(d).querySelectorAll('.erlen-inicio-enlace')].find(a=>a.textContent===texto);
const boton=(d,texto)=>[...raiz(d).querySelectorAll('button')].find(b=>b.textContent.trim()===texto);
const espera=()=>new Promise(r=>setTimeout(r,0));
/* Cambiar el hash a mano: hashchange es asíncrono (en un navegador y en jsdom), y desde jsdom 30 llega después
   de un setTimeout(0). Se espera al evento mismo, y un turno más para que la vista termine de pintarse. */
const aHash=(w,h)=>new Promise(r=>{w.addEventListener('hashchange',()=>setTimeout(r,0),{once:true});w.location.hash=h;});

test('The local home component and stylesheet are inlined in the build',()=>{
 const orden=readFileSync(new URL('../src/js/_orden.txt',import.meta.url),'utf8').trim().split('\n');
 assert.ok(orden.indexOf('../diseno/inicio.mjs')>=0&&orden.indexOf('../diseno/inicio.mjs')===orden.indexOf('88-workspace.js')-1,'El componente va justo antes de 88-workspace.js');
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 const cinta=readFileSync(new URL('../src/diseno/cinta.css',import.meta.url),'utf8'),inicioCss=readFileSync(new URL('../src/diseno/inicio.css',import.meta.url),'utf8');
 assert.ok(html.includes(inicioCss),'inicio.css está íntegro en el build');
 assert.ok(html.indexOf(inicioCss)>html.indexOf(cinta),'inicio.css va tras cinta.css');
 assert.ok(html.includes('const erlenInicio=(()=>{'));
 assert.ok(Buffer.byteLength(html)<=3.6*1024*1024,'El HTML único no pasa de 3,6 MiB: '+Buffer.byteLength(html));
 const css=readFileSync(new URL('../src/css/_orden.txt',import.meta.url),'utf8').trim().split('\n').map(n=>readFileSync(new URL('../src/css/'+n,import.meta.url),'utf8')).join('\n');
 assert.doesNotMatch(css,/\.(suite-(shell|sidebar|brand|topbar|content|welcome|archive-[a-z]+|search|page-heading)|slides-(showcase|example|new-card)|ws-(shell|hero|card|grid|thumb|empty|section-head|controls|eyebrow|note)|workspace)\b/,'No queda CSS de la portada antigua');
 assert.doesNotMatch(readFileSync(new URL('../src/cuerpo.html',import.meta.url),'utf8'),/workspaceRoot/);
});

test('Slides opens on its home screen: inert editor, focus on the h1, frozen status literal, collection and illustrative examples',async()=>{const {dom,errors,run}=await editor();try{
 const d=dom.window.document,w=dom.window;
 assert.equal(raiz(d).hidden,false,'Al abrir se ve el inicio, no el editor vacío');
 assert.equal(w.location.hash,'#inicio');
 assert.equal(d.querySelector('.erlen-marco').hasAttribute('inert'),true,'El editor queda inerte bajo el inicio');
 assert.ok(d.body.classList.contains('erlen-inicio-abierto'));
 assert.equal(d.activeElement,raiz(d).querySelector('h1'),'El foco va al h1');
 assert.equal(raiz(d).querySelector('h1').textContent,'Crea y comparte tus ideas');
 assert.equal(raiz(d).querySelector('h1 em').textContent,'tus ideas');
 assert.equal(d.title,'Inicio · Tabula');
 assert.equal(raiz(d).querySelectorAll('h1').length,1);
 assert.match(raiz(d).querySelector('.erlen-inicio-estado').textContent,/^Disponible · beta/,'Literal congelado del portal');
 assert.equal(raiz(d).querySelector('.erlen-inicio-marca svg')?.getAttribute('viewBox'),'0 0 64 64','La marca de Tabula');
 const rejilla=raiz(d).querySelector('[aria-label="Colección de inicio"]');
 assert.equal(rejilla.querySelector('.erlen-inicio-nueva strong').textContent,'Nueva presentación');
 const ejemplos=[...rejilla.querySelectorAll('.erlen-inicio-ejemplo')];
 // Desde el paquete 1.8.0 el inicio muestra todos los ejemplos, no solo los tres primeros.
 const titulos=ejemplos.map(e=>e.querySelector('h2').textContent);
 assert.deepEqual(titulos.slice(0,3),['Calibración UV–Vis','Cinética de primer orden','Defensa de tesis']);
 assert.equal(titulos.length,run('EJEMPLOS.length'));
 for(const e of ejemplos)assert.match(e.querySelector('p').textContent,/Datos ilustrativos\.$/,'Cada ejemplo declara sus datos ilustrativos');
 assert.match(raiz(d).querySelector('.erlen-inicio-pie').textContent,/Ejemplos didácticos · sustituye los datos/);
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
 assert.equal(raiz(d).hidden,true);assert.ok(!d.querySelector('.erlen-marco').hasAttribute('inert'));
 assert.equal(run('S.deck.meta.title'),'Calibración UV–Vis');assert.equal(w.location.hash,'#presentaciones');
 assert.equal(d.activeElement,d.querySelector('#deckTitleInput'));
 assert.equal(d.title,'Tabula · Presentaciones','Al cerrar se devuelve el título de la pestaña');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Local hash routes follow navigation in both directions and accept historical links',async()=>{const {dom,errors,run}=await editor('http://localhost:8130/#suite/herramientas');try{
 const d=dom.window.document,w=dom.window;
 assert.equal(run('INICIO.vista'),'recursos','#suite/herramientas abre Recursos y respaldos');
 assert.equal(w.location.hash,'#inicio/herramientas','El enlace histórico se normaliza');
 assert.equal(w.history.length,1,'La normalización no crea una entrada en el historial');
 assert.equal(d.title,'Recursos y respaldos · Tabula');
 const pares=[['Mis presentaciones','biblioteca'],['Ejemplos editables','plantillas'],['Recursos y respaldos','herramientas'],['Acerca de','servicio'],['Inicio','inicio']];
 for(const [texto,ruta] of pares){nav(d,texto).click();assert.equal(w.location.hash,ruta==='inicio'?'#inicio':'#inicio/'+ruta,texto);assert.equal(nav(d,texto).getAttribute('aria-current'),'page');assert.equal(d.activeElement,raiz(d).querySelector('h1'));}
 // Hacia atrás: cambiar el hash abre la vista, #presentaciones vuelve al editor.
 await aHash(w,'#inicio/plantillas');
 assert.equal(run('INICIO.vista'),'ejemplos');
 const titulos=[...raiz(d).querySelectorAll('.erlen-inicio-ejemplo h2')].map(h=>h.textContent);
 assert.equal(titulos.length,12,'Los doce ejemplos editables');
 await aHash(w,'#presentaciones');
 assert.equal(raiz(d).hidden,true);assert.ok(!d.querySelector('.erlen-marco').hasAttribute('inert'));
 await aHash(w,'#inicio/servicio');
 assert.equal(run('INICIO.vista'),'acerca');assert.match(raiz(d).textContent,/versión 0\.3\.0/);assert.match(raiz(d).textContent,/AGPLv3/);
 await aHash(w,'#inicio/nada');assert.equal(run('INICIO.vista'),'inicio','Una vista desconocida cae en Inicio');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Opening the home screen keeps the draft; the library opens, duplicates in place and downloads',async()=>{const {dom,errors,run}=await editor();try{
 const d=dom.window.document;
 run("wsNueva();S.deck.meta.title='Seminario';S.deck.slides[0].title='Borrador sin guardar';saveInd()");
 // La marca de la barra vuelve al inicio sin perder el borrador.
 d.querySelector('.erlen-marco-marca').click();
 assert.equal(raiz(d).hidden,false);assert.equal(run("decksStore().Seminario.deck.slides[0].title"),'Borrador sin guardar');
 assert.ok(boton(d,'Continuar presentación'),'Se ofrece continuar la presentación empezada');
 assert.ok([...raiz(d).querySelectorAll('.erlen-inicio-recientes strong')].some(s=>s.textContent==='Seminario'),'Aparece en Recientes');
 boton(d,'Continuar presentación').click();
 assert.equal(raiz(d).hidden,true);assert.equal(run('S.deck.slides[0].title'),'Borrador sin guardar');
 // Archivo → Inicio y biblioteca.
 d.querySelector('#cinta .erlen-cinta-archivo').click();
 [...d.querySelectorAll('.menu[role=menu] [role=menuitem]')].find(b=>b.textContent.includes('Inicio y biblioteca')).click();
 assert.equal(raiz(d).hidden,false);
 nav(d,'Mis presentaciones').click();
 const tarjeta=()=>[...raiz(d).querySelectorAll('.erlen-inicio-tarjeta')];
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
 const personal=[...raiz(d).querySelectorAll('.erlen-inicio-ejemplo')].find(e=>e.querySelector('h2').textContent==='Grupo de lectura');
 assert.ok(personal,'La plantilla personal aparece entre los ejemplos');
 assert.equal(personal.querySelector('.erlen-inicio-eyebrow').textContent,'Personal');assert.equal(personal.querySelector('button').textContent,'Usar plantilla');
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
 assert.match(raiz(d).querySelector('.erlen-inicio-aviso[role=alert]').textContent,/No existe el ejemplo «no-existe»/);
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Appearance migrates once, stays isolated, and changes only the application',async()=>{
 const {dom,errors,run}=await editor('http://localhost:8130/',{preparar:w=>{
  w.localStorage.setItem('erlen-color','violeta');w.localStorage.setItem('erlen-estilo','bauhaus');
 }});try{
  const w=dom.window,d=w.document,almacen=w.localStorage,acceso=boton(d,'Apariencia');
  assert.equal(d.documentElement.dataset.erlenColor,'violeta');assert.equal(d.documentElement.dataset.erlenEstilo,'bauhaus');
  assert.equal(almacen.getItem('tabula.apariencia.color'),'violeta');assert.equal(almacen.getItem('tabula.apariencia.estilo'),'bauhaus');
  const antes=run('JSON.stringify(S.deck)'),inerciaAnterior=raiz(d).inert;acceso.focus();acceso.click();
  const dialogo=d.querySelector('#modalRoot [role=dialog]');assert.ok(dialogo);assert.equal(raiz(d).inert,true);
  const campo=nombre=>d.getElementById([...dialogo.querySelectorAll('label')].find(l=>l.textContent===nombre).htmlFor);
  const elegir=(nombre,valor)=>{const el=campo(nombre);el.value=valor;el.dispatchEvent(new w.Event('change',{bubbles:true}));};
  assert.equal(campo('Color de acento').value,'violeta');assert.equal(campo('Estilo visual').value,'bauhaus');
  elegir('Tema','oscuro');elegir('Color de acento','azul');elegir('Estilo visual','blueprint');
  assert.equal(d.documentElement.dataset.theme,'dark');assert.equal(d.documentElement.dataset.erlenColor,'azul');assert.equal(d.documentElement.dataset.erlenEstilo,'blueprint');
  assert.equal(almacen.getItem('erlen-color'),'violeta');assert.equal(almacen.getItem('erlen-estilo'),'bauhaus');
  almacen.setItem('erlen-color','cobre');w.dispatchEvent(new w.StorageEvent('storage',{key:'erlen-color',newValue:'cobre',storageArea:almacen}));
  assert.equal(d.documentElement.dataset.erlenColor,'azul','Las claves antiguas no sincronizan la apariencia');
  almacen.setItem('tabula.apariencia.color','platino');w.dispatchEvent(new w.StorageEvent('storage',{key:'tabula.apariencia.color',newValue:'platino',storageArea:almacen}));
  assert.equal(d.documentElement.dataset.erlenColor,'platino');assert.equal(campo('Color de acento').value,'platino','Otra pestaña de Tabula actualiza el diálogo');
  [...dialogo.querySelectorAll('button')].find(b=>b.textContent==='Restablecer').click();
  assert.equal(campo('Tema').value,'auto');assert.equal(campo('Color de acento').value,'verde');assert.equal(campo('Estilo visual').value,'original');
  assert.equal(almacen.getItem('erlen-color'),'cobre');assert.equal(almacen.getItem('erlen-estilo'),'bauhaus');
  assert.equal(run('JSON.stringify(S.deck)'),antes,'La presentación no se modifica');
  [...dialogo.querySelectorAll('button')].find(b=>b.textContent==='Cerrar').click();
  assert.equal(raiz(d).inert,inerciaAnterior);assert.equal(d.activeElement,acceso);assert.deepEqual(errors,[]);
 }finally{dom.window.close();}
});

test('Appearance remains usable when storage is blocked and existing local choices take precedence',async()=>{
 const bloqueado=await editor('http://localhost:8130/',{preparar:w=>Object.defineProperty(w,'localStorage',{configurable:true,get(){throw new w.DOMException('Bloqueado','SecurityError');}})});
 try{
  const w=bloqueado.dom.window,d=w.document;boton(d,'Apariencia').click();
  const dialogo=d.querySelector('#modalRoot [role=dialog]'),label=[...dialogo.querySelectorAll('label')].find(l=>l.textContent==='Color de acento');
  const campo=d.getElementById(label.htmlFor);campo.value='cobre';campo.dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.equal(d.documentElement.dataset.erlenColor,'cobre');
  [...dialogo.querySelectorAll('button')].find(b=>b.textContent==='Cerrar').click();boton(d,'Apariencia').click();
  const nuevo=d.querySelector('#modalRoot [role=dialog]'),etiqueta=[...nuevo.querySelectorAll('label')].find(l=>l.textContent==='Color de acento');
  assert.equal(d.getElementById(etiqueta.htmlFor).value,'cobre','La elección dura la sesión');
  assert.deepEqual(bloqueado.errors,[]);
 }finally{bloqueado.dom.window.close();}
 const propia=await editor('http://localhost:8130/',{preparar:w=>{
  w.localStorage.setItem('tabula.apariencia.color','verde');w.localStorage.setItem('tabula.apariencia.estilo','original');
  w.localStorage.setItem('erlen-color','violeta');w.localStorage.setItem('erlen-estilo','bauhaus');
 }});
 try{
  assert.equal(propia.dom.window.document.documentElement.dataset.erlenColor,undefined);
  assert.equal(propia.dom.window.document.documentElement.dataset.erlenEstilo,undefined);
  assert.deepEqual(propia.errors,[]);
 }finally{propia.dom.window.close();}
});
