import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';import {IDBFactory} from 'fake-indexeddb';
import {editor} from '../herramientas/test-browser.mjs';import {createExchange} from '../web/exchange-v2.mjs';
/* Slides recibe de Erlen DoE un informe (tipo informe-v1 del contrato de la suite,
   docs/intercambio-doe.md del portal) y lo abre como presentación nueva. JSDOM no mide: aquí se
   comprueban la validación, la conversión, la vista previa, lo que se crea y lo que no; que el
   texto no desborde se revisa en un navegador real (docs/validacion.md). */
const leer=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const espera=(ms=0)=>new Promise(r=>setTimeout(r,ms));

/* Un informe como el que arma DoE (src/js/29e-cargas.js de erlen-doe), con todo lo que obliga
   a partir: un párrafo largo, una lista larga, una tabla de 37 filas y 9 columnas, una figura
   de puntos, un espectro de 12000 puntos con marcas y un «$» que en Slides abriría matemáticas. */
function informe({simulado=true,secciones}={}){
 const frase=i=>'La frase número '+i+' del resumen explica un resultado del diseño con bastante detalle para que no quepa todo junto.';
 const x=Array.from({length:12000},(_,i)=>4000-i/4),y=x.map(v=>Math.exp(-(((v-1362)/6)**2))+0.01*Math.sin(v/40));
 return {format:'erlen-context-copy-v1',kind:'informe-v1',source:{tool:'doe',title:'Proyecto L9 ZnAl',version:'0.3.0'},
  snapshot:{titulo:'Caracterización del L9',subtitulo:'Erlen DoE',fecha:'2026-09-23',
   secciones:secciones||[
    {titulo:'Qué se analizó',bloques:[{tipo:'parrafo',texto:'Diseño L9 con 9 corridas; coste de 12 $ por corrida.'},{tipo:'parrafo',texto:Array.from({length:9},(_,i)=>frase(i+1)).join(' ')}]},
    {titulo:'Hallazgos',bloques:[{tipo:'lista',elementos:Array.from({length:12},(_,i)=>'[indicio] Hallazgo '+(i+1)+' sobre la banda de 1362')}]},
    {titulo:'Efectos del diseño',bloques:[{tipo:'tabla',titulo:'Contribución de cada factor',columns:['Descriptor','Factor','%','p','q','n','r','ρ','Nota'],
     data:Array.from({length:37},(_,i)=>['1362 · FWHM','ABCD'[i%4],99.912345678-i,0.000123456,null,9,true,-0.5,'celda '+i])}]},
    {titulo:'Puntajes',bloques:[{tipo:'figura',titulo:'Puntajes del PCA',figura:{titulo:'Puntajes del PCA',xLabel:'CP1 (61.2 %)',yLabel:'CP2 (20.1 %)',
     series:[{nombre:'A = 1',x:[1,2,3],y:[0.5,-0.2,0.1],estilo:'puntos'},{nombre:'error',x:[4,5],y:[1,2],estilo:'puntos'}]}}]},
    {titulo:'Espectros',bloques:[{tipo:'figura',titulo:'Espectros y ventanas',figura:{titulo:'Espectros',xLabel:'Número de onda / cm⁻¹',yLabel:'Absorbancia (u. a.)',invertirX:true,
     series:[{nombre:'corrida 1',x,y,estilo:'lineas'}],marcas:[{x:1362,etiqueta:'1362'}],regiones:[{desde:1290,hasta:1440,etiqueta:'1362'}],nota:simulado?'DATOS SIMULADOS':'',simulado}}]},
    {titulo:'Vacía',bloques:[]}],
   procedencia:{app:'Erlen DoE 0.3.0',proyecto:'L9 ZnAl',simulado}}};
}
async function guarda(idb,{source='doe',target='slides',payload=informe()}={}){return createExchange(idb).putTransfer({source,target,payload});}
async function abre(url,idb){return editor(url,{indexedDB:idb,crypto:globalThis.crypto});}
const modal=d=>d.querySelector('#modalRoot .modal');
async function esperaModal(d){for(let i=0;i<200&&!modal(d);i++)await espera(5);return modal(d);}
const boton=(m,t)=>[...m.querySelectorAll('button')].find(b=>b.textContent.trim()===t);
const biblioteca=run=>JSON.parse(run('JSON.stringify(Object.keys(decksStore()))'));

test('The transport is the literal copy of the suite exchange-v2, wrapped for the shared scope',()=>{
 const literal=leer('../web/exchange-v2.mjs');
 const suite=new URL('../../erlen-suite/web/exchange-v2.mjs',import.meta.url);
 /* En un clon suelto no está el portal; junto a él, la copia tiene que ser idéntica. */
 if(existsSync(suite))assert.equal(literal,readFileSync(suite,'utf8'),'web/exchange-v2.mjs difiere de la del portal: vuelve a copiarla');
 assert.match(literal,/^\/\* MIT License/);assert.match(literal,/const APPS=\[[^\]]*'slides'[^\]]*'doe'[^\]]*'lens'/);
 const envuelta=leer('../src/js/88d-intercambio.js');
 const cuerpo=envuelta.slice(envuelta.indexOf('const erlenExchange=(()=>{\n')+'const erlenExchange=(()=>{\n'.length,envuelta.lastIndexOf('\nreturn {'));
 assert.equal(cuerpo,literal.replace(/^export (const|async function|function) /gm,'$1 '),'88d-intercambio.js es la copia literal, sin más cambio que los export');
 const orden=leer('../src/js/_orden.txt').trim().split('\n');
 assert.ok(orden.indexOf('88d-intercambio.js')>orden.indexOf('88-workspace.js')&&orden.indexOf('88e-informe.js')===orden.indexOf('88d-intercambio.js')+1);
 assert.match(leer('../public/index.html'),/const erlenExchange=\(\(\)=>\{/);
});

test('An informe-v1 becomes a new deck: title slide, sections split to fit, trimmed tables, native charts and provenance',async()=>{const {dom,errors,run}=await abre('http://localhost:8130/slides/',new IDBFactory());try{
 const w=dom.window;
 w.__p=informe();
 const res=JSON.parse(run('JSON.stringify(informeADeck(leeInforme(__p),{id:"0b8c1f3e-5a7d-4c2e-9f10-1234567890ab",sha256:"a".repeat(64),createdAt:Date.UTC(2026,8,23)}))'));
 const {deck,avisos}=res,sl=deck.slides;
 assert.equal(sl[0].layout,'title');
 assert.equal(deck.meta.title,'Caracterización del L9');assert.equal(deck.meta.subtitle,'Erlen DoE · DATOS SIMULADOS');assert.equal(deck.meta.date,'2026-09-23');
 const titulos=sl.map(s=>s.title);
 assert.deepEqual([...new Set(titulos.slice(1))],['Qué se analizó','Hallazgos','Efectos del diseño','Puntajes','Espectros','Vacía','Procedencia']);
 /* Ninguna diapositiva de texto pasa del umbral de palabras ni de siete viñetas; las que siguen lo dicen. */
 const cuerpo=s=>s.blocks.flatMap(b=>b.type==='text'?[b.text]:b.type==='bullets'?b.items.map(i=>i.t):[]).join(' ').split(/\s+/).filter(Boolean).length;
 for(const s of sl.slice(1,-1))if(s.blocks.every(b=>b.type==='text'||b.type==='bullets')){assert.ok(cuerpo(s)<=55,s.title+': '+cuerpo(s)+' palabras');assert.ok(s.blocks.filter(b=>b.type==='bullets').reduce((n,b)=>n+b.items.length,0)<=7);}
 assert.ok(titulos.filter(t=>t==='Qué se analizó').length>=2,'el párrafo largo se parte');
 assert.equal(titulos.filter(t=>t==='Hallazgos').length,2,'doce viñetas van en dos diapositivas');
 const hall=sl.filter(s=>s.title==='Hallazgos');assert.equal(hall[1].subtitle,'continuación · DATOS SIMULADOS');
 assert.equal(hall.flatMap(s=>s.blocks[0].items).length,12,'ninguna viñeta se pierde');
 /* Todo el texto del informe llega, en orden. */
 const todo=sl.filter(s=>s.title==='Qué se analizó').flatMap(s=>s.blocks.map(b=>b.text)).join(' ');
 assert.match(todo,/^Diseño L9 con 9 corridas; coste de 12 \\\$ por corrida\. La frase número 1 /,'el «$» va escapado');
 assert.match(todo,/La frase número 9 [^]*juntos?\.$/);
 /* La tabla: diez filas y siete columnas, con el recorte en el pie y en las notas. */
 const tabla=sl.find(s=>s.title==='Efectos del diseño').blocks[0];
 assert.equal(tabla.type,'table');assert.equal(tabla.rows[0].length,7);
 const vistas=tabla.rows.length-1;assert.ok(vistas>=5&&vistas<=8,vistas+' filas: las que caben medidas en Chromium, no más');
 assert.deepEqual(tabla.rows[0],['Descriptor','Factor','%','p','q','n','r']);
 assert.deepEqual(tabla.rows[1],['1362 · FWHM','A','99.9123','0.000123456','','9','sí']);
 assert.equal(tabla.caption,'Contribución de cada factor · Se muestran '+vistas+' de 37 filas ('+(37-vistas)+' omitidas) y 7 de 9 columnas (2 omitidas)');
 assert.match(sl.find(s=>s.title==='Efectos del diseño').notes,/37 filas, 9 columnas/);
 assert.ok(avisos.some(a=>a.includes((37-vistas)+' omitidas')));
 /* Las figuras son gráficas de datos de Slides, no imágenes. */
 const pca=sl.find(s=>s.title==='Puntajes').blocks[0];
 assert.equal(pca.type,'chart');assert.equal(pca.kind,'dispersion');assert.equal(pca.xlabel,'CP1 (61.2 %)');
 const series=JSON.parse(run('JSON.stringify(chartSeries('+JSON.stringify(pca)+'))'));
 assert.deepEqual(series.map(s=>s.name),['A = 1','«error»'],'una serie llamada «error» no se toma por barra de error');
 assert.deepEqual(series.map(s=>s.pts),[[[1,0.5],[2,-0.2],[3,0.1]],[[4,1],[5,2]]],'los puntos, exactos y en su orden');
 const esp=sl.find(s=>s.title==='Espectros').blocks[0];
 assert.equal(esp.kind,'linea');assert.equal(esp.invertirX,true);
 const pts=JSON.parse(run('JSON.stringify(chartSeries('+JSON.stringify(esp)+')[0].pts)'));
 assert.ok(pts.length<=4000&&pts.length>1000,pts.length+' puntos');
 const orig=informe().snapshot.secciones[4].bloques[0].figura.series[0],imax=orig.y.indexOf(Math.max(...orig.y)),imin=orig.y.indexOf(Math.min(...orig.y));
 assert.ok(pts.some(p=>p[0]===orig.x[imax]&&p[1]===orig.y[imax]),'el máximo del pico se conserva al aligerar');
 assert.ok(pts.some(p=>p[0]===orig.x[imin]&&p[1]===orig.y[imin]),'y el mínimo');
 assert.ok(pts.every((p,i)=>!i||p[0]<pts[i-1][0]),'en el orden de la serie');
 assert.match(esp.caption,/Espectros y ventanas · DATOS SIMULADOS · Reducida para la diapositiva a \d+ de 12000 puntos/);
 assert.match(sl.find(s=>s.title==='Espectros').notes,/Marcas: 1362 \(x = 1362\)[^]*Regiones: 1362 de 1290 a 1440/);
 assert.match(sl.find(s=>s.title==='Vacía').blocks[0].text,/no tiene contenido/);
 /* La procedencia, en la última diapositiva y en el proyecto. */
 const fin=sl.at(-1);assert.equal(fin.title,'Procedencia');
 const textoFin=fin.blocks.flatMap(b=>b.items?b.items.map(i=>i.t):[b.text]).join('\n');
 for(const t of ['Aplicación: Erlen DoE 0.3.0','Proyecto: L9 ZnAl','Título: Proyecto L9 ZnAl','0b8c1f3e-5a7d-4c2e-9f10-1234567890ab','a'.repeat(64),'DATOS SIMULADOS'])assert.ok(textoFin.includes(t),t);
 assert.deepEqual({id:deck.meta.origen.id,sha256:deck.meta.origen.sha256,tool:deck.meta.origen.tool,kind:deck.meta.origen.kind,simulado:deck.meta.origen.simulado},{id:'0b8c1f3e-5a7d-4c2e-9f10-1234567890ab',sha256:'a'.repeat(64),tool:'doe',kind:'informe-v1',simulado:true});
 /* Sin datos simulados no hay rótulo que lo diga. */
 w.__q=informe({simulado:false});
 const real=JSON.parse(run('JSON.stringify(informeADeck(leeInforme(__q),{id:"x",sha256:"b",createdAt:0}).deck)'));
 assert.equal(real.meta.subtitle,'Erlen DoE');assert.ok(!JSON.stringify(real.slides).includes('SIMULADOS'));
 /* El mazo pasa el saneador de proyectos sin ajustes y se dibuja sin errores de KaTeX. */
 run('window.__d=saneaDeck(informeADeck(leeInforme(__p),{id:"x",sha256:"b",createdAt:0}).deck)');
 assert.deepEqual(JSON.parse(run('JSON.stringify(__d.avisos)')),[]);
 run('loadDeck(__d.deck,null)');
 const html=run('S.deck.slides.map((s,i)=>{S.cur=i;renderAll();return document.querySelector("#stageInner")?.innerHTML||""}).join("")');
 assert.ok(!/katex-error|math-err/.test(html),'ningún texto se toma por matemáticas');
 assert.match(html,/12 \$ por corrida/);
 /* Y sale a Beamer: el «$» como signo, la gráfica como pgfplots con el eje del FTIR invertido. */
 const tex=run('toBeamer(S.deck)');
 assert.match(tex,/12 \\\$ por corrida/);assert.match(tex,/x dir=reverse/);assert.match(tex,/DATOS SIMULADOS/);
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Invalid informes are refused in plain Spanish before anything is shown',async()=>{const {dom,run}=await abre('http://localhost:8130/slides/',new IDBFactory());try{
 const w=dom.window,falla=p=>{w.__p=p;return run('(()=>{try{leeInforme(__p);return ""}catch(e){return e.message}})()');};
 const base=informe();
 assert.match(falla({...base,kind:'tabla-v1'}),/tipo «tabla-v1»/);
 assert.match(falla({...base,source:{tool:'ftir',title:'x'}}),/viene de «ftir»/);
 assert.match(falla({...base,snapshot:{...base.snapshot,secciones:Array(31).fill({titulo:'s',bloques:[]})}}),/31 secciones/);
 assert.match(falla({...base,snapshot:{...base.snapshot,secciones:[{titulo:'s',bloques:Array(201).fill({tipo:'parrafo',texto:'a'})}]}}),/200 bloques/);
 assert.match(falla({...base,snapshot:{...base.snapshot,secciones:[{titulo:'s',bloques:[{tipo:'imagen',src:'x'}]}]}}),/tipo «imagen»/);
 assert.match(falla({...base,snapshot:{...base.snapshot,secciones:[{titulo:'s',bloques:[{tipo:'tabla',titulo:'t',columns:['a'],data:[[1,2]]}]}]}}),/más celdas que columnas/);
 assert.match(falla({...base,snapshot:{...base.snapshot,secciones:[{titulo:'s',bloques:[{tipo:'tabla',titulo:'t',columns:['a'],data:Array(501).fill([1])}]}]}}),/501 filas/);
 assert.match(falla({...base,snapshot:{...base.snapshot,secciones:[{titulo:'s',bloques:[{tipo:'figura',titulo:'f',figura:{series:[{nombre:'a',x:[1,2],y:[1]}]}}]}]}}),/igual longitud/);
 assert.match(falla({...base,snapshot:{...base.snapshot,secciones:[{titulo:'s',bloques:[{tipo:'figura',titulo:'f',figura:{series:Array(9).fill({nombre:'a',x:[1],y:[1]})}}]}]}}),/hasta 8 series/);
 assert.match(falla({...base,snapshot:{...base.snapshot,titulo:''}}),/no tiene título/);
 assert.match(falla({...base,snapshot:{...base.snapshot,secciones:[{titulo:'s',bloques:[{tipo:'parrafo',texto:'x'.repeat(2*1024*1024)}]}]}}),/2 MiB/);
}finally{dom.window.close();}});

test('#copy=<id> is read at start, cleared without a history entry and previewed; confirming creates a new deck in the library',async()=>{
 const idb=new IDBFactory(),copia=await guarda(idb);
 const {dom,errors,run}=await abre('http://localhost:8130/slides/#copy='+copia.id,idb);try{
 const d=dom.window.document,w=dom.window;
 assert.equal(w.location.hash,'#suite/inicio','el #copy= se retira y queda la ruta de siempre');
 assert.equal(w.history.length,1,'sin entrada nueva en el historial');
 const m=await esperaModal(d);
 assert.equal(m.querySelector('.mo-title').textContent,'Abrir el informe de DoE como presentación');
 assert.match(m.textContent,/Erlen DoE 0\.3\.0 envió el informe «Proyecto L9 ZnAl» del proyecto «L9 ZnAl»/);
 assert.match(m.querySelector('.inf-simulado').textContent,/^DATOS SIMULADOS/);
 assert.match(m.textContent,/Se creará una presentación nueva en tu biblioteca, «Caracterización del L9», con \d+ diapositivas/);
 assert.match(m.textContent,/de 37 filas \(\d+ omitidas\)/);assert.ok(m.textContent.includes(copia.sha256));
 assert.deepEqual(biblioteca(run),[],'la vista previa no crea nada');
 boton(m,'Crear presentación').click();
 assert.equal(modal(d),null);
 assert.deepEqual(biblioteca(run),['Caracterización del L9']);
 assert.equal(run('S.deckName'),'Caracterización del L9');
 assert.equal(run('S.deck.meta.origen.id'),copia.id);assert.equal(run('S.deck.meta.origen.sha256'),copia.sha256);
 assert.equal(run('decksStore()["Caracterización del L9"].deck.slides.length'),run('S.deck.slides.length'));
 assert.equal(w.location.hash,'#presentaciones','se abre en el editor');
 assert.equal((await createExchange(idb).listTransfers()).length,1,'la copia de intercambio no se borra');
 assert.deepEqual(errors,[]);
 }finally{dom.window.close();}
});

test('Cancelling creates nothing, and a second copy never overwrites the first deck',async()=>{
 const idb=new IDBFactory(),copia=await guarda(idb);
 const {dom,errors,run}=await abre('http://localhost:8130/slides/#copy='+copia.id,idb);try{
 const d=dom.window.document;
 const antes=run('JSON.stringify(S.deck)');
 boton(await esperaModal(d),'Cancelar').click();
 assert.equal(modal(d),null);assert.deepEqual(biblioteca(run),[]);assert.equal(run('JSON.stringify(S.deck)'),antes);
 /* Otra vez por la misma pestaña (hashchange): ahora se acepta, y luego otra más. */
 for(const n of [1,2]){
  dom.window.location.hash='#copy='+copia.id;await espera(20);
  boton(await esperaModal(d),'Crear presentación').click();
 }
 assert.deepEqual(biblioteca(run).sort(),['Caracterización del L9','Caracterización del L9 (2)']);
 assert.deepEqual(errors,[]);
 }finally{dom.window.close();}
});

test('Another kind, another target, a damaged copy or a missing one is refused with a message and touches nothing',async()=>{
 const idb=new IDBFactory();
 const otroTipo=await guarda(idb,{payload:{format:'erlen-context-copy-v1',kind:'tabla-v1',source:{tool:'doe',title:'Matriz'},snapshot:{titulo:'t',rol:'diseno',tabla:{columns:['A'],data:[[1]]}}}});
 const otroDestino=await guarda(idb,{target:'documents'});
 const dañada=await guarda(idb);
 await new Promise((ok,mal)=>{const r=idb.open('erlen-suite-exchange-v2',1);r.onsuccess=()=>{const tx=r.result.transaction('transfers','readwrite'),st=tx.objectStore('transfers'),g=st.get(dañada.id);g.onsuccess=()=>{st.put({...g.result,payloadJSON:g.result.payloadJSON.replace('Caracterización','Manipulada')});};tx.oncomplete=()=>{r.result.close();ok();};tx.onerror=mal;};r.onerror=mal;});
 const casos=[[otroTipo.id,/tipo «tabla-v1»/],[otroDestino.id,/otra aplicación/],[dañada.id,/cambió/],['7d0b5a7e-1111-4222-8333-944455556666',/no está disponible/],['no-es-un-id',/inválido/]];
 for(const [id,motivo] of casos){
  const {dom,errors,run}=await abre('http://localhost:8130/slides/#copy='+encodeURIComponent(id),idb);try{
   const d=dom.window.document,antes=run('JSON.stringify(S.deck)');
   const m=await esperaModal(d);
   assert.equal(m.querySelector('.mo-title').textContent,'No se abrió la copia');
   assert.match(m.textContent,motivo);assert.match(m.textContent,/No se creó ni se cambió nada/);
   assert.equal(boton(m,'Crear presentación'),undefined);
   boton(m,'Entendido').click();
   assert.deepEqual(biblioteca(run),[]);assert.equal(run('JSON.stringify(S.deck)'),antes);
   assert.equal(dom.window.location.hash,'#suite/inicio');
   assert.deepEqual(errors,[]);
  }finally{dom.window.close();}
 }
 assert.equal((await createExchange(idb).listTransfers()).length,3,'rechazar no borra copias');
});

test('Outside the suite, the downloaded copy file opens through the same preview',async()=>{
 const idb=new IDBFactory(),{prepareTransfer}=await import('../web/exchange-v2.mjs');
 const registro=await prepareTransfer({source:'doe',target:'slides',payload:informe({simulado:false})});
 const {dom,errors,run}=await abre('http://localhost:8130/',idb);try{
  const d=dom.window.document;dom.window.__r=registro;
  run('recibeArchivoCopia(__r)');
  const m=await esperaModal(d);
  assert.equal(m.querySelector('.inf-simulado'),null,'sin datos simulados no se avisa de ellos');
  boton(m,'Crear presentación').click();
  assert.deepEqual(biblioteca(run),['Caracterización del L9']);
  dom.window.__r2={...registro,target:'notes'};run('recibeArchivoCopia(__r2)');
  assert.match((await esperaModal(d)).textContent,/otra aplicación|cambió/);
  assert.deepEqual(errors,[]);
 }finally{dom.window.close();}
});
