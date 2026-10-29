import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {IDBFactory} from 'fake-indexeddb';
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
 const paquete=JSON.parse(archivo);assert.equal(paquete.formato,'erlen-respaldo-v1');assert.equal(paquete.proyectos.length,3);
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
