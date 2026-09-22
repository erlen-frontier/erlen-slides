import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';import {editor} from '../herramientas/test-browser.mjs';
/* La pantalla de inicio: el componente común de la suite (src/js/87a-suite-inicio.js) montado
   por src/js/88-workspace.js con las rutas por hash de siempre. JSDOM no mide geometría: aquí se
   comprueban estructura, rutas, foco, inercia del editor y datos; la vista se revisa en un navegador real. */
const raiz=d=>d.querySelector('#inicioRoot main.erlen-inicio');
const nav=(d,texto)=>[...raiz(d).querySelectorAll('.erlen-inicio-enlace')].find(a=>a.textContent===texto);
const boton=(d,texto)=>[...raiz(d).querySelectorAll('button')].find(b=>b.textContent.trim()===texto);
const espera=()=>new Promise(r=>setTimeout(r,0));

test('The home screen is the synced suite component and its stylesheet is inlined in the build; the old portada is gone',()=>{
 const copia=readFileSync(new URL('../src/js/87a-suite-inicio.js',import.meta.url),'utf8');
 assert.equal(copia,readFileSync(new URL('../src/diseno/suite-inicio.js',import.meta.url),'utf8'),'src/js/87a-suite-inicio.js difiere de src/diseno/suite-inicio.js: copia la del paquete.');
 const orden=readFileSync(new URL('../src/js/_orden.txt',import.meta.url),'utf8').trim().split('\n');
 assert.ok(orden.indexOf('87a-suite-inicio.js')>=0&&orden.indexOf('87a-suite-inicio.js')===orden.indexOf('88-workspace.js')-1,'El componente va justo antes de 88-workspace.js');
 assert.equal(orden.includes('88a-suite.js'),false,'La portada propia ya no se carga');
 assert.equal(existsSync(new URL('../src/js/88a-suite.js',import.meta.url)),false);
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 const cinta=readFileSync(new URL('../src/diseno/cinta.css',import.meta.url),'utf8'),inicioCss=readFileSync(new URL('../src/diseno/inicio.css',import.meta.url),'utf8');
 assert.ok(html.includes(inicioCss),'inicio.css del paquete, íntegro en el build');
 assert.ok(html.indexOf(inicioCss)>html.indexOf(cinta),'inicio.css va tras cinta.css');
 assert.ok(html.includes('const erlenInicio=(()=>{'));
 assert.ok(Buffer.byteLength(html)<=3*1024*1024,'El HTML único no pasa de 3 MiB: '+Buffer.byteLength(html));
 const css=readFileSync(new URL('../src/css/_orden.txt',import.meta.url),'utf8').trim().split('\n').map(n=>readFileSync(new URL('../src/css/'+n,import.meta.url),'utf8')).join('\n');
 assert.doesNotMatch(css,/\.(suite-(shell|sidebar|brand|topbar|content|welcome|archive-[a-z]+|search|page-heading)|slides-(showcase|example|new-card)|ws-(shell|hero|card|grid|thumb|empty|section-head|controls|eyebrow|note)|workspace)\b/,'No queda CSS de la portada antigua');
 assert.doesNotMatch(readFileSync(new URL('../src/cuerpo.html',import.meta.url),'utf8'),/workspaceRoot/);
});

test('Slides opens on its home screen: inert editor, focus on the h1, frozen status literal, collection and illustrative examples',async()=>{const {dom,errors,run}=await editor();try{
 const d=dom.window.document,w=dom.window;
 assert.equal(raiz(d).hidden,false,'Al abrir se ve el inicio, no el editor vacío');
 assert.equal(w.location.hash,'#suite/inicio');
 assert.equal(d.querySelector('#app').inert,true,'El editor queda inerte bajo el inicio');
 assert.ok(d.body.classList.contains('erlen-inicio-abierto'));
 assert.equal(d.activeElement,raiz(d).querySelector('h1'),'El foco va al h1');
 assert.equal(raiz(d).querySelector('h1').textContent,'Presentaciones científicas');
 assert.equal(raiz(d).querySelector('h1 em').textContent,'científicas');
 assert.equal(d.title,'Inicio · Erlen Slides');
 assert.equal(raiz(d).querySelectorAll('h1').length,1);
 assert.match(raiz(d).querySelector('.erlen-inicio-estado').textContent,/^Disponible · beta/,'Literal congelado del portal');
 assert.equal(raiz(d).querySelector('.erlen-inicio-marca svg')?.getAttribute('viewBox'),'0 0 64 64','El matraz de la marca');
 const rejilla=raiz(d).querySelector('[aria-label="Colección de inicio"]');
 assert.equal(rejilla.querySelector('.erlen-inicio-nueva strong').textContent,'Nueva presentación');
 const ejemplos=[...rejilla.querySelectorAll('.erlen-inicio-ejemplo')];
 assert.deepEqual(ejemplos.map(e=>e.querySelector('h2').textContent),['Calibración UV–Vis','Cinética de primer orden','Defensa de tesis']);
 for(const e of ejemplos)assert.match(e.querySelector('p').textContent,/Datos ilustrativos\.$/,'Cada ejemplo declara sus datos ilustrativos');
 assert.match(raiz(d).querySelector('.erlen-inicio-pie').textContent,/Ejemplos didácticos · sustituye los datos/);
 assert.ok(boton(d,'Explorar ejemplos')&&boton(d,'Importar proyecto'));
 assert.equal(boton(d,'Continuar presentación'),undefined,'Sin nada empezado no se ofrece continuar');
 // Buscar filtra la colección.
 const buscar=raiz(d).querySelector('input[type=search]');buscar.value='cinética';buscar.dispatchEvent(new w.Event('input'));
 assert.deepEqual(ejemplos.map(e=>e.hidden),[true,false,true]);
 // Con el inicio abierto no actúan los atajos del editor.
 const n=run('S.deck.slides.length');
 d.body.dispatchEvent(new w.KeyboardEvent('keydown',{key:'m',ctrlKey:true,bubbles:true}));
 d.body.dispatchEvent(new w.KeyboardEvent('keydown',{key:'F9',bubbles:true}));
 assert.equal(run('S.deck.slides.length'),n);assert.equal(d.querySelector('#app').classList.contains('concentrado'),false);
 // «Abrir ejemplo» entra al editor con el ejemplo y devuelve el foco al título.
 ejemplos[0].querySelector('button').click();
 assert.equal(raiz(d).hidden,true);assert.ok(!d.querySelector('#app').inert);
 assert.equal(run('S.deck.meta.title'),'Calibración UV–Vis');assert.equal(w.location.hash,'#presentaciones');
 assert.equal(d.activeElement,d.querySelector('#deckTitleInput'));
 assert.equal(d.title,'Erlen Slides · Presentaciones científicas','Al cerrar se devuelve el título de la pestaña');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Hash routes keep their historical names and follow the component navigation both ways',async()=>{const {dom,errors,run}=await editor('http://localhost:8130/#suite/herramientas');try{
 const d=dom.window.document,w=dom.window;
 assert.equal(run('INICIO.vista'),'recursos','#suite/herramientas abre Recursos y respaldos');
 assert.equal(d.title,'Recursos y respaldos · Erlen Slides');
 const pares=[['Mis presentaciones','biblioteca'],['Ejemplos editables','plantillas'],['Recursos y respaldos','herramientas'],['Acerca de','servicio'],['Inicio','inicio']];
 for(const [texto,ruta] of pares){nav(d,texto).click();assert.equal(w.location.hash,'#suite/'+ruta,texto);assert.equal(nav(d,texto).getAttribute('aria-current'),'page');assert.equal(d.activeElement,raiz(d).querySelector('h1'));}
 // Hacia atrás: cambiar el hash abre la vista, #presentaciones vuelve al editor.
 w.location.hash='#suite/plantillas';await espera();
 assert.equal(run('INICIO.vista'),'ejemplos');
 const titulos=[...raiz(d).querySelectorAll('.erlen-inicio-ejemplo h2')].map(h=>h.textContent);
 assert.equal(titulos.length,12,'Los doce ejemplos editables');
 w.location.hash='#presentaciones';await espera();
 assert.equal(raiz(d).hidden,true);assert.ok(!d.querySelector('#app').inert);
 w.location.hash='#suite/servicio';await espera();
 assert.equal(run('INICIO.vista'),'acerca');assert.match(raiz(d).textContent,/versión 0\.2\.1/);assert.match(raiz(d).textContent,/AGPLv3/);
 w.location.hash='#suite/nada';await espera();assert.equal(run('INICIO.vista'),'inicio','Una vista desconocida cae en Inicio');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Opening the home screen keeps the draft; the library opens, duplicates in place and downloads',async()=>{const {dom,errors,run}=await editor();try{
 const d=dom.window.document;
 run("wsNueva();S.deck.meta.title='Seminario';S.deck.slides[0].title='Borrador sin guardar';saveInd()");
 // La marca de la barra vuelve al inicio sin perder el borrador.
 d.querySelector('#inicioBtn').click();
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

test('An empty library explains where work is kept; personal templates are listed and can be removed with undo',async()=>{const {dom,errors,run}=await editor('http://localhost:8130/#suite/biblioteca');try{
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
