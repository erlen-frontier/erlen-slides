import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {IDBFactory} from 'fake-indexeddb';
import {editor} from '../herramientas/test-browser.mjs';
const source=readFileSync(new URL('../src/js/88b-recuperacion.js',import.meta.url),'utf8');
const deck=t=>({meta:{title:'Prueba'},slides:[{layout:'content',blocks:[{type:'text',text:t}]}]});
function setup(factory=new IDBFactory()) {
 let library={},fail=false;const notices=[];
 const ctx={indexedDB:factory,TextEncoder,Date,console,S:{deck:deck('actual'),deckName:'Original'},uid:()=> 'draft',toast:t=>notices.push(t),
  decksStore:()=>library,lsSet:(k,v)=>{if(fail)return false;library=v;return true;},LS_DECKS:'library',
  saneaDeck:d=>d.slides[0]?.invalid?{error:'inválido'}:{deck:JSON.parse(JSON.stringify(d)),avisos:[]}};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 return {ctx,run:s=>vm.runInContext(s,ctx),notices,library:()=>library,setLibrary:v=>library=v,fail:()=>fail=true};
}
test('Copia inmutable, persistencia entre sesiones y recuperación como copia',async()=>{
 const factory=new IDBFactory(),s=setup(factory),d=deck('primera');
 const pending=s.ctx.recGuardar(d,'Original');d.slides[0].blocks[0].text='segunda';assert.equal(await pending,true);
 const otra=setup(factory),copias=await otra.ctx.recLista();assert.equal(JSON.parse(copias[0].datos).slides[0].blocks[0].text,'primera');
 otra.setLibrary({Original:{deck:deck('actual'),when:1}});
 const nombres=otra.ctx.recImporta([{nombre:'Original',deck:JSON.parse(copias[0].datos)}]);
 assert.equal(nombres[0],'Original (recuperada)');assert.equal(otra.library().Original.deck.slides[0].blocks[0].text,'actual');
 assert.equal(otra.library()[nombres[0]].deck.slides[0].blocks[0].text,'primera');assert.equal(otra.ctx.S.deck.slides[0].blocks[0].text,'actual');
});
test('Deduplicación, ventana de cinco minutos y puntos manuales',async()=>{
 const s=setup();await s.ctx.recGuardar(deck('a'),'Original');await s.ctx.recGuardar(deck('a'),'Original');assert.equal((await s.ctx.recLista()).length,1);
 await s.ctx.recGuardar(deck('b'),'Original');await s.ctx.recGuardar(deck('c'),'Original');
 assert.deepEqual((await s.ctx.recLista()).map(x=>JSON.parse(x.datos).slides[0].blocks[0].text),['c','a']);
 await s.ctx.recGuardar(deck('c'),'Original',{fijar:true});await s.ctx.recGuardar(deck('d'),'Original');await s.ctx.recGuardar(deck('e'),'Original');
 assert.deepEqual((await s.ctx.recLista()).map(x=>JSON.parse(x.datos).slides[0].blocks[0].text),['e','c','a']);
});
test('Dos pestañas conservan sus escrituras mediante transacciones',async()=>{
 const factory=new IDBFactory(),a=setup(factory),b=setup(factory);
 await Promise.all([a.ctx.recGuardar(deck('a'),'A'),b.ctx.recGuardar(deck('b'),'B')]);assert.equal((await a.ctx.recLista()).length,2);
});
test('Retención acotada por presentación y fallo atómico bajo límite global',async()=>{
 const s=setup();for(let i=0;i<25;i++)await s.ctx.recGuardar(deck(String(i)),'A',{fijar:true});assert.equal((await s.ctx.recLista()).length,20);
 const before=JSON.stringify(await s.ctx.recLista());s.run('RECUP.maxBytes=1');assert.equal(await s.ctx.recGuardar(deck('large'),'A'),false);assert.equal(JSON.stringify(await s.ctx.recLista()),before);
 const t=setup();await t.ctx.recGuardar(deck('a'),'A');await t.ctx.recGuardar(deck('b'),'B');
 t.run('RECUP.maxBytes=220');const prev=JSON.stringify(await t.ctx.recLista());assert.equal(await t.ctx.recGuardar(deck('c'),'C'),false);assert.equal(JSON.stringify(await t.ctx.recLista()),prev);
});
test('Una entrada inválida o biblioteca llena no restaura parcialmente',()=>{
 const s=setup();s.setLibrary({Original:{deck:deck('intacto'),when:1}});const before=JSON.stringify(s.library());
 assert.throws(()=>s.ctx.recImporta([{nombre:'Bien',deck:deck('ok')},{nombre:'Mal',deck:{slides:[]}}]));assert.equal(JSON.stringify(s.library()),before);
 s.fail();assert.throws(()=>s.ctx.recImporta([{nombre:'Bien',deck:deck('ok')}]));assert.equal(JSON.stringify(s.library()),before);
});
test('Nombres conflictivos no sobrescriben entradas ni alteran prototipos',()=>{
 const s=setup();s.setLibrary({'A (recuperada)':{deck:deck('previo'),when:1}});
 const r=s.ctx.recMezcla(s.library(),[{nombre:'A',deck:deck('a')},{nombre:'__proto__',deck:deck('b')}]);
 assert.equal(r.nombres[0],'A (recuperada) 2');assert.equal(Object.keys(r.store).length,3);assert.equal({}.deck,undefined);
});
test('IndexedDB no disponible: aviso acotado, sin romper el editor',async()=>{
 const s=setup(null);assert.equal(await s.ctx.recGuardar(deck('a'),'A'),false);assert.equal(await s.ctx.recGuardar(deck('b'),'A'),false);assert.equal(s.notices.length,1);
});
test('Recupera texto aún en edición sin tocar el documento ni forzar pérdida de foco',async()=>{
 const s=setup();s.ctx.S.cur=0;s.ctx.S.deck.slides[0].blocks[0].id='b1';
 s.ctx.rawEl={isConnected:true,dataset:{ek:'b:b1'},innerText:'texto en curso\n'};
 s.ctx.deepCopy=x=>JSON.parse(JSON.stringify(x));s.ctx.ekParts=x=>x.split(':');
 s.ctx.findBlock=(id,d=s.ctx.S.deck)=>({block:d.slides[0].blocks.find(b=>b.id===id)});
 s.ctx.cambiaTextoFormateado=(b,v)=>{b.text=v;};
 const editor=readFileSync(new URL('../src/js/05-editor.js',import.meta.url),'utf8');
 vm.runInContext(editor.match(/function setRaw\([\s\S]*?\n\}/)[0],s.ctx);
 await s.ctx.recActual();assert.equal(s.ctx.S.deck.slides[0].blocks[0].text,'actual');
 assert.equal(JSON.parse((await s.ctx.recLista())[0].datos).slides[0].blocks[0].text,'texto en curso');
 const bloque=s.ctx.S.deck.slides[0].blocks[0];
 Object.assign(bloque,{text:'aaaa',formatoTexto:[{inicio:2,fin:4,negrita:true}]});
 s.ctx.rawFormato={...bloque,text:'aaaaa',formatoTexto:[{inicio:3,fin:5,negrita:true}]};
 s.ctx.rawEl.innerText='aaaaa';
 await s.ctx.recActual(true);
 const recuperado=JSON.parse((await s.ctx.recLista())[0].datos).slides[0].blocks[0];
 assert.equal(recuperado.text,'aaaaa');
 assert.deepEqual(recuperado.formatoTexto,[{inicio:3,fin:5,negrita:true}]);
 assert.deepEqual(bloque.formatoTexto,[{inicio:2,fin:4,negrita:true}]);
});
test('Un fallo durante la escritura revierte también las eliminaciones por retención',async()=>{
 const s=setup();await s.ctx.recGuardar(deck('a'),'A');await s.ctx.recGuardar(deck('b'),'A');const db=await s.ctx.recDB();
 const before=JSON.stringify(await s.ctx.recLista()),transaction=db.transaction.bind(db);
 db.transaction=(...args)=>{const tx=transaction(...args);if(args[1]==='readwrite'){const objectStore=tx.objectStore.bind(tx);tx.objectStore=n=>{const store=objectStore(n);store.add=()=>{throw new Error('Fallo de escritura simulado');};return store;};}return tx;};
 assert.equal(await s.ctx.recGuardar(deck('c'),'A'),false);assert.equal(JSON.stringify(await s.ctx.recLista()),before);
});
test('Respaldo completo exportado e importado en una biblioteca vacía',async()=>{
 const origen=setup();origen.setLibrary({Original:{deck:deck('original guardado'),when:1},Otra:{deck:deck('otra presentación'),when:2}});
 origen.ctx.flushEdicion=()=>{};origen.ctx.saveInd={now:()=>{}};origen.ctx.deepCopy=x=>JSON.parse(JSON.stringify(x));let archivo;
 origen.ctx.downloadFile=(nombre,datos)=>{archivo=datos;};await origen.ctx.recExportaBiblioteca();
 const paquete=JSON.parse(archivo);assert.equal(paquete.formato,'tabula-respaldo-v1');assert.equal(paquete.proyectos.length,3);
 const destino=setup();const nombres=destino.ctx.recImporta(paquete.proyectos);
 assert.equal(nombres.length,3);assert.deepEqual(Object.values(destino.library()).map(x=>x.deck.slides[0].blocks[0].text),['original guardado','otra presentación','actual']);
});
test('Cambiar de presentación no escribe el nuevo contenido en el archivo anterior',async()=>{
 let resolver,escrito;const archivo={createWritable:()=>new Promise(r=>resolver=r)};
 const ctx={S:{archivo,deck:deck('anterior')},actualizaIndicadorArchivo:()=>{},toast:()=>{}};
 const source=readFileSync(new URL('../src/js/33-archivo.js',import.meta.url),'utf8');
 vm.createContext(ctx);vm.runInContext(source.match(/async function escribeArchivo\([\s\S]*?\n\}/)[0],ctx);
 const pending=ctx.escribeArchivo();ctx.S.deck=deck('nuevo');ctx.S.archivo=null;
 resolver({write:async s=>{escrito=JSON.parse(s);},close:async()=>{}});assert.equal(await pending,true);assert.equal(escrito.slides[0].blocks[0].text,'anterior');
});

test('Arranque conserva la version reciente si biblioteca y autoguardado difieren',async()=>{
 const s=setup();await s.ctx.recGuardar(deck('original'),'Original');await s.ctx.recGuardar(deck('reciente'),'Original');
 s.ctx.S.deck=deck('reciente');s.setLibrary({Original:{deck:deck('original'),when:1}});
 s.ctx.document={addEventListener:()=>{}};s.ctx.deb=f=>f;
 s.ctx.recInicia();await s.run('RECUP.cola');
 assert.equal(JSON.parse((await s.ctx.recLista())[0].datos).slides[0].blocks[0].text,'reciente');
});

test('Arranque no reemplaza historias existentes de otras presentaciones',async()=>{
 const s=setup();await s.ctx.recGuardar(deck('original'),'Otra');await s.ctx.recGuardar(deck('reciente'),'Otra');
 s.setLibrary({Otra:{deck:deck('original'),when:1}});s.ctx.document={addEventListener:()=>{}};s.ctx.deb=f=>f;
 s.ctx.recInicia();await s.run('RECUP.cola');
 const copias=(await s.ctx.recLista()).filter(c=>c.clave==='nombre:Otra');
 assert.equal(JSON.parse(copias[0].datos).slides[0].blocks[0].text,'reciente');
});

test('Deshacer y rehacer conservan el estado saliente como punto de recuperación',async()=>{
 const s=setup();const state=readFileSync(new URL('../src/js/03-state.js',import.meta.url),'utf8');
 for(const fn of ['doUndo','doRedo'])vm.runInContext(state.match(new RegExp('function '+fn+'\\(\\) \\{[\\s\\S]*?\\n\\}'))[0],s.ctx);
 Object.assign(s.ctx,{snapDeck:x=>JSON.parse(JSON.stringify(x)),abreSnap:x=>x,clamp:(x,a,b)=>Math.min(b,Math.max(a,x)),renderAll:()=>{},saveInd:()=>s.ctx.recActual()});
 await s.ctx.recGuardar(deck('inicial'),'Original');await s.ctx.recGuardar(deck('trabajo reciente'),'Original');
 Object.assign(s.ctx.S,{deck:deck('trabajo reciente'),undo:[deck('anterior')],redo:[],cur:0});s.ctx.doUndo();await s.run('RECUP.cola');
 let textos=(await s.ctx.recLista()).map(c=>JSON.parse(c.datos).slides[0].blocks[0].text);
 assert.ok(textos.includes('trabajo reciente'));assert.ok(textos.includes('anterior'));
 s.ctx.doRedo();await s.run('RECUP.cola');textos=(await s.ctx.recLista()).map(c=>JSON.parse(c.datos).slides[0].blocks[0].text);
 assert.ok(textos.includes('trabajo reciente'));assert.ok(textos.includes('anterior'));
});

test('Un autoguardado viejo al arrancar no elimina la última copia buena',async()=>{
 const s=setup();s.ctx.S.deckName=null;s.ctx.S.respaldoId='borrador:previo';
 await s.ctx.recGuardar(deck('inicial'),null);await s.ctx.recGuardar(deck('reciente'),null);
 s.ctx.S.deck=deck('inicial');s.ctx.document={addEventListener:()=>{}};s.ctx.deb=f=>f;
 s.ctx.recInicia();await s.run('RECUP.cola');
 assert.ok((await s.ctx.recLista()).some(c=>JSON.parse(c.datos).slides[0].blocks[0].text==='reciente'));
});

test('Autoguardado roto abre un borrador nuevo sin reutilizar la identidad anterior',async()=>{
 const s=setup();const main=readFileSync(new URL('../src/js/90-main.js',import.meta.url),'utf8');
 vm.runInContext(main.match(/function boot\(\) \{[\s\S]*?\n\}/)[0],s.ctx);
 const auto={deck:deck('roto'),respaldoId:'borrador:previo'};
 Object.assign(s.ctx,{lsGet:()=>auto,LS_AUTO:'auto',cargaPrefs:()=>({}),saneaDeck:()=>{throw new Error('roto');},blankDeck:()=>deck('nuevo'),THEMES:{metropolis:{},revista:{}},pieDe:()=>'',notasDe:()=>'',aplicaSitio:()=>false,document:{addEventListener:()=>{}},deb:f=>f,$:()=>null,console:{error:()=>{}}});
 for(const name of ['montaMarco','aplicaTemaApp','snapNow','initChrome','initCanvasEvents','initShortcuts','initPresentTouch','initEntrada','initWake','initPistas','initHistoria','arrancaSesion','renderAll','avisaAutoRoto','wsInit','cienciaIconos'])s.ctx[name]=()=>{};
 s.ctx.S.deckName=null;s.ctx.S.respaldoId=auto.respaldoId;
 await s.ctx.recGuardar(deck('inicial'),null);await s.ctx.recGuardar(deck('reciente'),null);
 s.ctx.S.deck=null;s.ctx.boot();await s.run('RECUP.cola');
 assert.notEqual(s.ctx.S.respaldoId,auto.respaldoId);
 const previas=(await s.ctx.recLista()).filter(c=>c.clave===auto.respaldoId);
 assert.equal(previas.length,2);assert.equal(JSON.parse(previas[0].datos).slides[0].blocks[0].text,'reciente');
});

test('Eliminar historial espera copias pendientes y respeta otros documentos y biblioteca',async()=>{
 const s=setup();s.setLibrary({A:{deck:deck('biblioteca'),when:1}});
 s.ctx.recGuardar(deck('uno'),'A');s.ctx.recGuardar(deck('dos'),'A');s.ctx.recGuardar(deck('otro'),'B');
 await s.ctx.recEliminar('nombre:A');
 assert.deepEqual((await s.ctx.recLista()).map(c=>c.clave),['nombre:B']);
 assert.equal(s.library().A.deck.slides[0].blocks[0].text,'biblioteca');
 assert.equal(s.ctx.S.deck.slides[0].blocks[0].text,'actual');
});

/* Aislamiento de identidad: Tabula comparte origen con la etapa anterior, pero tiene claves y
   base de recuperación propias. Arrancar, guardar una charla y un punto de recuperación no debe
   leer, escribir, migrar ni borrar nada de lo anterior; sus datos quedan byte a byte intactos. */
const CLAVES_ANTERIORES=['erlen-slides.autosave','erlen-slides.decks','erlen-slides.prefs','erlen-slides.estilos',
 'erlen-slides.sesion','erlen-slides.historia','erlen-slides.zotero','erlen-slides.charlas','erlen-slides.biblioteca.v1',
 'erlen-cinta.plegada','erlen-color','erlen-estilo'];
const BASE_ANTERIOR='erlen-slides-recuperacion-v1';
const FILA_ANTERIOR={id:1,clave:'nombre:Anterior',nombre:'Anterior',titulo:'Anterior',
 datos:'{"v":1,"meta":{"title":"Anterior"},"slides":[]}',fecha:1,inicio:1,bytes:43,fijada:true};
async function siembraBaseAnterior(base) {
 const db=await new Promise((resolve,reject)=>{
  const req=base.open(BASE_ANTERIOR,1);
  req.onupgradeneeded=()=>req.result.createObjectStore('copias',{keyPath:'id',autoIncrement:true});
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });
 try {
  await new Promise((resolve,reject)=>{
   const tx=db.transaction('copias','readwrite');tx.objectStore('copias').put(FILA_ANTERIOR);
   tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);
  });
 } finally {db.close();}
}
test('Tabula no lee, escribe ni borra las claves ni la base de recuperación anteriores',async()=>{
 const accesos=[],base=new IDBFactory();
 await siembraBaseAnterior(base);
 const fabrica={
  open(nombre,...resto){accesos.push('open:'+nombre);return base.open(nombre,...resto);},
  deleteDatabase(nombre){accesos.push('deleteDatabase:'+nombre);return base.deleteDatabase(nombre);},
  cmp:(a,b)=>base.cmp(a,b)
 };
 let anteriores;
 const {dom,errors,run}=await editor('http://localhost:8130/',{indexedDB:fabrica,preparar:w=>{
  const al=w.localStorage,deckViejo={meta:{title:'Vieja'},slides:[{layout:'content',blocks:[{type:'text',text:'vieja'}]}]};
  al.setItem('erlen-slides.autosave',JSON.stringify({deck:deckViejo,deckName:'Vieja'}));
  al.setItem('erlen-slides.decks',JSON.stringify({Vieja:{deck:deckViejo,when:1}}));
  al.setItem('erlen-slides.prefs',JSON.stringify({tema:'oscuro',barras:'lado'}));
  al.setItem('erlen-slides.estilos',JSON.stringify({fuente:'vieja'}));
  al.setItem('erlen-slides.sesion',JSON.stringify({linea:'vieja',when:1}));
  al.setItem('erlen-slides.historia',JSON.stringify([{dia:'2000-01-01',clave:'Vieja',motivo:'vieja'}]));
  al.setItem('erlen-slides.zotero',JSON.stringify({via:'web',usuario:'viejo',clave:'secreta'}));
  al.setItem('erlen-slides.charlas',JSON.stringify([{cuando:'2000-01-01',titulo:'Vieja',diapositivas:[]}]));
  al.setItem('erlen-slides.biblioteca.v1',JSON.stringify({Vieja:{deck:deckViejo,when:1}}));
  al.setItem('erlen-cinta.plegada','1');
  al.setItem('erlen-color','cobre');al.setItem('erlen-estilo','bauhaus');
  anteriores=new Map(CLAVES_ANTERIORES.map(clave=>[clave,al.getItem(clave)]));
  accesos.length=0;
  const proto=Object.getPrototypeOf(al);
  for(const metodo of ['getItem','setItem','removeItem','clear']){
   const original=proto[metodo];
   proto[metodo]=function(...args){accesos.push(metodo+':'+String(args[0]));return original.apply(this,args);};
  }
 }});
 try{
  assert.deepEqual(errors,[]);
  assert.equal(run('Object.keys(decksStore()).length'),0,'La biblioteca nueva empieza vacía');
  assert.equal(run('S.deckName'),null,'El autoguardado anterior no se adopta');
  assert.notEqual(run('S.deck.meta.title'),'Vieja');
  run("guardaCharla({cuando:new Date().toISOString(),titulo:'Nueva',dur:0,nota:'',diapositivas:[]})");
  assert.equal(run('charlasStore().length'),1,'La charla se guarda en la clave nueva');
  assert.equal(await run('recActual(true)'),true,'El punto de recuperación se guarda en la base nueva');
  assert.ok((await run('recLista()')).length>=1,'La base nueva conserva la copia');
  assert.equal(run('Object.keys(decksStore()).length'),0,'Guardar charla y recuperación no crea biblioteca');
  const almacen=dom.window.localStorage;
  assert.equal(almacen.getItem('tabula.decks'),null,'Sin biblioteca heredada no se escribe una copia');
  const durante=accesos.slice();
  const tocadas=durante.filter(a=>a.slice(a.indexOf(':')+1).startsWith('erlen-'));
  assert.deepEqual(tocadas,[],'Cero lecturas, escrituras o borrados de las claves anteriores: '+tocadas.join(', '));
  const baseTocada=durante.filter(a=>a==='open:'+BASE_ANTERIOR||a==='deleteDatabase:'+BASE_ANTERIOR);
  assert.deepEqual(baseTocada,[],'La base anterior no se abre ni se borra: '+baseTocada.join(', '));
  assert.ok(durante.includes('open:tabula-recuperacion-v1'),'Tabula abre su propia base de recuperación');
  for(const clave of CLAVES_ANTERIORES)assert.equal(almacen.getItem(clave),anteriores.get(clave),'La clave '+clave+' conserva sus bytes');
  assert.deepEqual(errors,[]);
 }finally{dom.window.close();}
 const control=await new Promise((resolve,reject)=>{
  const req=base.open(BASE_ANTERIOR);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });
 try{
  assert.equal(control.version,1,'La base anterior conserva su versión');
  const filas=await new Promise((resolve,reject)=>{
   const tx=control.transaction('copias','readonly'),req=tx.objectStore('copias').getAll();
   req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
  assert.deepEqual(filas,[FILA_ANTERIOR],'La base anterior conserva su única fila intacta');
 }finally{control.close();}
});
