import test from 'node:test';import assert from 'node:assert/strict';import {runInContext} from 'node:vm';import {editor} from '../herramientas/test-browser.mjs';

test('Search highlights and replaces the original text after a combining accent',async()=>{const{dom,run,errors}=await editor();try{
 run("(()=>{const d=blankDeck();d.slides[0].title='Cafe\\u0301 x';loadDeck(d,null,true);wsCerrar();openBuscar('x')})()");
 const modal=dom.window.document.querySelector('#modalRoot [role=dialog]');
 assert.equal(modal.querySelector('.bu-tx mark').textContent,'x');
 modal.querySelector('input[placeholder="Reemplazar por…"]').value='Z';
 const consulta=modal.querySelector('input[placeholder^="Buscar"]');
 const aviso=modal.querySelector('.hint[role=status]');
 const reemplazar=[...modal.querySelectorAll('button')].find(b=>b.textContent==='Reemplazar todo');
 consulta.dispatchEvent(new dom.window.Event('input',{bubbles:true}));reemplazar.click();
 await new Promise(resolve=>setTimeout(resolve,200));
 assert.equal(aviso.hidden,false,'el repintado pendiente no oculta el resultado');
 assert.equal(aviso.textContent,'1 reemplazo hecho.');
 assert.equal(run('S.deck.slides[0].title'),'Cafe\u0301 Z');
 run('doUndo()');assert.equal(run('S.deck.slides[0].title'),'Cafe\u0301 x');
 run('doRedo()');assert.equal(run('S.deck.slides[0].title'),'Cafe\u0301 Z');
 consulta.value='inexistente';consulta.dispatchEvent(new dom.window.Event('input',{bubbles:true}));reemplazar.click();
 assert.equal(aviso.textContent,'No hubo coincidencias.');
 consulta.value='';consulta.dispatchEvent(new dom.window.Event('input',{bubbles:true}));reemplazar.click();
 assert.equal(aviso.textContent,'Escribe qué buscar.');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Search replaces composed and combining accents without moving text formatting',async()=>{const{dom,run,errors}=await editor();try{
 run(`(()=>{const d=blankDeck();d.slides[0].title='Cafe\u0301 CAFÉ 🧪 cafe\u0301';
  d.slides.push({id:uid(),layout:'content',title:'',blocks:[Object.assign(newBlock('text'),{
   text:'e\u0301 cafe\u0301 y CAFÉ fin',formatoTexto:[{inicio:3,fin:8,negrita:true},{inicio:11,fin:15,cursiva:true},{inicio:16,fin:19,negrita:true}]})]});
  loadDeck(d,null,true);wsCerrar();openBuscar('CAFE')})()`);
 const modal=dom.window.document.querySelector('#modalRoot [role=dialog]');
 assert.match(modal.querySelector('.foot-note').textContent,/5 coincidencias/);
 assert.deepEqual([...modal.querySelectorAll('.bu-tx mark')].map(x=>x.textContent),['Cafe\u0301','cafe\u0301']);
 modal.querySelector('input[placeholder="Reemplazar por…"]').value='X🧪';
 [...modal.querySelectorAll('button')].find(b=>b.textContent==='Reemplazar todo').click();
 const lee=()=>JSON.parse(run(`JSON.stringify({title:S.deck.slides[0].title,b:S.deck.slides[1].blocks[0]})`));
 const cambiado=lee();
 assert.equal(cambiado.title,'X🧪 X🧪 🧪 X🧪');
 assert.equal(cambiado.b.text,'e\u0301 X🧪 y X🧪 fin');
 assert.deepEqual(cambiado.b.formatoTexto,[{inicio:3,fin:6,negrita:true},{inicio:9,fin:12,cursiva:true},{inicio:13,fin:16,negrita:true}]);
 run('doUndo()');const anterior=lee();
 assert.equal(anterior.b.text,'e\u0301 cafe\u0301 y CAFÉ fin');
 assert.deepEqual(anterior.b.formatoTexto,[{inicio:3,fin:8,negrita:true},{inicio:11,fin:15,cursiva:true},{inicio:16,fin:19,negrita:true}]);
 run('doRedo()');assert.deepEqual(lee(),cambiado);
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Search preserves original boundaries when normalization expands characters and emoji',async()=>{const{dom,run,errors}=await editor();try{
 run("(()=>{const d=blankDeck();d.slides[0].title='가x 가y 🧪z 🧪';loadDeck(d,null,true);wsCerrar();openBuscar('가')})()");
 let modal=dom.window.document.querySelector('#modalRoot [role=dialog]');
 assert.match(modal.querySelector('.foot-note').textContent,/2 coincidencias/);
 assert.equal(modal.querySelector('.bu-tx mark').textContent,'가');
 modal.querySelector('input[placeholder="Reemplazar por…"]').value='*';
 [...modal.querySelectorAll('button')].find(b=>b.textContent==='Reemplazar todo').click();
 assert.equal(run('S.deck.slides[0].title'),'*x *y 🧪z 🧪');
 run("closeModal();openBuscar('🧪')");modal=dom.window.document.querySelector('#modalRoot [role=dialog]');
 assert.match(modal.querySelector('.foot-note').textContent,/2 coincidencias/);
 assert.equal(modal.querySelector('.bu-tx mark').textContent,'🧪');
 modal.querySelector('input[placeholder="Reemplazar por…"]').value='B';
 [...modal.querySelectorAll('button')].find(b=>b.textContent==='Reemplazar todo').click();
 assert.equal(run('S.deck.slides[0].title'),'*x *y Bz B');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Search respects exact mode and a query reduced to no characters is safe',async()=>{const{dom,run,errors}=await editor();try{
 run("(()=>{const d=blankDeck();d.slides[0].title='Cafe\\u0301 CAFÉ café 🧪';loadDeck(d,null,true);wsCerrar();openBuscar('cafe')})()");
 const modal=dom.window.document.querySelector('#modalRoot [role=dialog]'),query=modal.querySelector('input[placeholder^="Buscar"]');
 assert.match(modal.querySelector('.foot-note').textContent,/3 coincidencias/);
 query.value='CAFÉ';modal.querySelector('input[type=checkbox]').click();
 assert.match(modal.querySelector('.foot-note').textContent,/1 coincidencia/);
 assert.equal(modal.querySelector('.bu-tx mark').textContent,'CAFÉ');
 query.value='\u0301';
 /* El timeout corta una regresión que bloquearía el bucle de eventos. */
 runInContext("document.querySelector('#modalRoot input[type=checkbox]').click()",dom.getInternalVMContext(),{timeout:2000});
 assert.match(modal.querySelector('.foot-note').textContent,/Sin coincidencias/);
 [...modal.querySelectorAll('button')].find(b=>b.textContent==='Reemplazar todo').click();
 assert.equal(run('S.deck.slides[0].title'),'Cafe\u0301 CAFÉ café 🧪');
 modal.querySelector('input[type=checkbox]').click();
 assert.equal(modal.querySelector('.bu-tx mark').textContent,'\u0301','el modo literal sí encuentra la marca');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Search finds locked blocks but replacement leaves them unchanged and explains why',async()=>{const{dom,run,errors}=await editor();try{
 run(`(()=>{const d=blankDeck();d.slides.push({id:'s',layout:'content',title:'x título',notes:'nota x otra',blocks:[
  Object.assign(newBlock('text'),{id:'protegido',text:'x x',locked:true,formatoTexto:[{inicio:0,fin:1,negrita:true}]}),
  Object.assign(newBlock('table'),{id:'tabla',locked:true,caption:'x',rows:[['x','otra'],['x','y']]}),
  Object.assign(newBlock('text'),{id:'libre',text:'x libre',formatoTexto:[{inicio:0,fin:1,cursiva:true}]})]});
  loadDeck(d,null,true);wsCerrar();openBuscar('x')})()`);
 const modal=dom.window.document.querySelector('#modalRoot [role=dialog]');
 const aviso=modal.querySelector('.hint[role=status]');
 assert.equal(aviso.hidden,true);
 assert.equal(modal.querySelector('.foot-note').textContent,'8 coincidencias en 1 diapositiva · 5 en bloques bloqueados');
 const filas=[...modal.querySelectorAll('.bu-fila')];
 assert.equal(filas.filter(f=>/bloquead/i.test(f.textContent)).length,4,'los resultados bloqueados se identifican');
 const antes=JSON.parse(run('JSON.stringify(S.deck.slides[1])'));
 modal.querySelector('input[placeholder="Reemplazar por…"]').value='largo';
 const reemplazar=[...modal.querySelectorAll('button')].find(b=>b.textContent==='Reemplazar todo');reemplazar.click();
 const despues=JSON.parse(run('JSON.stringify(S.deck.slides[1])'));
 assert.equal(despues.title,'largo título');assert.equal(despues.notes,'nota largo otra');
 assert.deepEqual(despues.blocks.slice(0,2),antes.blocks.slice(0,2));
 assert.equal(despues.blocks[2].text,'largo libre');
 assert.deepEqual(despues.blocks[2].formatoTexto,[{inicio:0,fin:5,cursiva:true}]);
 assert.match(dom.window.document.querySelector('#toasts .toast:last-child').textContent,/3 reemplazos.*5.*bloquead/);
 assert.match(modal.querySelector('.foot-note').textContent,/5 coincidencias.*5.*bloquead/);
 assert.equal(aviso.hidden,false);
 assert.match(aviso.textContent,/3 reemplazos hechos; 5 coincidencias en bloques bloqueados no se modificaron/);
 const pasos=run('S.undo.length');reemplazar.click();
 assert.equal(run('S.undo.length'),pasos,'no se crea historia si todos los resultados están bloqueados');
 assert.equal(aviso.hidden,false);
 assert.match(aviso.textContent,/No se hizo ningún reemplazo: 5 coincidencias en bloques bloqueados/);
 modal.querySelector('input[type=checkbox]').click();
 assert.equal(aviso.hidden,true,'al cambiar la opción de búsqueda se limpia el aviso anterior');
 reemplazar.click();assert.equal(aviso.hidden,false);
 const consulta=modal.querySelector('input[placeholder^="Buscar"]');
 consulta.value='y';consulta.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
 await new Promise(resolve=>setTimeout(resolve,200));
 assert.equal(aviso.hidden,true,'al cambiar la consulta se limpia el aviso anterior');
 run('doUndo()');assert.deepEqual(JSON.parse(run('JSON.stringify(S.deck.slides[1])')),antes);
 consulta.value='otra';consulta.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
 await new Promise(resolve=>setTimeout(resolve,200));reemplazar.click();
 assert.equal(aviso.textContent,'1 reemplazo hecho; 1 coincidencia en bloques bloqueados no se modificó.');
 assert.equal(run('S.deck.slides[1].notes'),'nota x largo');
 assert.equal(run('S.deck.slides[1].blocks[1].rows[0][1]'),'otra');
 run('doUndo()');assert.deepEqual(JSON.parse(run('JSON.stringify(S.deck.slides[1])')),antes);
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

/* Escribir es lo primero que se intenta en una diapositiva: cada zona vacía
   tiene que ofrecer dónde hacerlo, en cualquier diseño. */
test('Every zone of every layout offers a spot to start writing',async()=>{const{dom,run,errors}=await editor();try{
 run('wsNueva()');
 const conZonas=run('JSON.stringify(LAYOUTS.filter(l=>l.z>0).map(l=>[l.id,l.z]))');
 const faltan=[];
 for(const[id,z]of JSON.parse(conZonas)){
  run(`addSlide('content');changeLayout(S.deck.slides[S.cur],${JSON.stringify(id)});renderAll()`);
  const marcas=JSON.parse(run("JSON.stringify([...document.querySelectorAll('#stageInner .zona-vacia')].map(e=>e.dataset.nuevaZ))"));
  if(marcas.length!==z||marcas.join()!==Array.from({length:z},(_,i)=>i).join())faltan.push(id+' → '+JSON.stringify(marcas));
 }
 assert.deepEqual(faltan,[],'diseños sin marcador en alguna zona');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Clicking an empty zone creates the block in that zone, not always the first',async()=>{const{dom,run,errors}=await editor();try{
 run("wsNueva();addSlide('content');changeLayout(S.deck.slides[S.cur],'cuadricula');renderAll()");
 /* JSDOM no implementa innerText, que es lo que lee el guardado del texto: se
    comprueba dónde cae cada bloque y dónde queda el cursor. El tecleo de punta
    a punta se prueba en navegador, donde sí hay innerText. */
 const clic=z=>run(`(()=>{const e=document.querySelector('#stageInner .zona-vacia[data-nueva-z="${z}"]');
   if(!e)return null;e.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true}));return S.selBlock})()`);
 const puestos={};
 for(const z of [3,1,0,2]){
  const id=clic(z);
  assert.ok(id,'no había marcador en la zona '+z);
  assert.equal(run('document.activeElement.dataset.ek'),'b:'+id,'el cursor no quedó en el bloque nuevo');
  assert.equal(run('S.insCol'),z+1);
  puestos[z]=id;
 }
 const donde=JSON.parse(run('JSON.stringify(CLAVES_ZONA.slice(0,4).map(k=>(S.deck.slides[S.cur][k]||[]).map(b=>b.id)))'));
 assert.deepEqual(donde,[[puestos[0]],[puestos[1]],[puestos[2]],[puestos[3]]],'cada bloque debe quedarse en la celda donde se hizo clic');
 assert.equal(run("document.querySelectorAll('#stageInner .zona-vacia').length"),0,'ya no queda ninguna celda vacía');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('The caret lands in the new text and the insert column follows the click',async()=>{const{dom,run,errors}=await editor();try{
 run("wsNueva();addSlide('content');changeLayout(S.deck.slides[S.cur],'twocol');renderAll()");
 run(`document.querySelector('#stageInner .zona-vacia[data-nueva-z="1"]').dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true}))`);
 assert.equal(run('S.insCol'),2,'insertar debe apuntar a la columna en la que se hizo clic');
 assert.equal(run("document.activeElement.dataset.ek"),'b:'+run('S.selBlock'),'el cursor queda en el texto nuevo');
 assert.equal(run("(S.deck.slides[S.cur].blocks||[]).length"),0);
 assert.equal(run("(S.deck.slides[S.cur].blocks2||[]).length"),1);
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('The write-here markers never reach a thumbnail, the screen or an export',async()=>{const{dom,run,errors}=await editor();try{
 run("wsNueva();addSlide('content');changeLayout(S.deck.slides[S.cur],'tres');renderAll()");
 assert.equal(run("document.querySelectorAll('#stageInner .zona-vacia').length"),3);
 for(const modo of ['thumb','present','export'])
  assert.equal(run(`renderSlide(S.deck,S.cur,'${modo}').querySelectorAll('.zona-vacia').length`),0,'aparece en modo '+modo);
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('A selected figure can be grabbed and resized from either side',async()=>{const{dom,run,errors}=await editor();try{
 run(`wsNueva();addSlide('content');
  (()=>{const b=newBlock('image');b.src='data:image/png;base64,iVBORw0KGgo=';b.w=50;zona(S.deck.slides[S.cur],0).push(b);window.__im=b.id;commit()})();
  selectBlock(window.__im)`);
 assert.equal(run("document.querySelectorAll('#stageInner .blk-movible.sel').length"),1,'la figura seleccionada se puede agarrar');
 assert.equal(run("document.querySelectorAll('#stageInner .ancho-asa').length"),2,'una manija a cada lado');
 assert.equal(run("document.querySelectorAll('#stageInner .ancho-asa.asa-izq').length"),1);
 run("selectBlock(null);addBlockToSlide('text',1);selectBlock(S.selBlock)");
 assert.equal(run("document.querySelectorAll('#stageInner .blk-movible').length"),0,'un texto seleccionado se edita, no se arrastra agarrándolo');
 assert.equal(run("document.querySelectorAll('#stageInner .ancho-asa').length"),0,'el texto ocupa el ancho de su zona');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

/* En retrato el lienzo se ciñe a la diapositiva, así que la escala no puede
   depender del alto del lienzo, y la tira pasa a rejilla con miniaturas
   grandes. La composición es de CSS y JSDOM no la calcula: aquí se comprueban
   las decisiones que sí toma el código. */
const enRetrato = (dom, si) => { dom.window.matchMedia = q =>
  ({ matches: si ? /max-width:920px/.test(q) : false, media: q, addEventListener() {}, removeEventListener() {} }); };

test('In portrait the scale follows the width, not the height of the canvas',async()=>{const{dom,run,errors}=await editor();try{
 run("wsNueva();addSlide('content')");
 run(`(()=>{const sc=document.getElementById('canvasScroll');
   Object.defineProperty(sc,'clientWidth',{value:822,configurable:true});
   Object.defineProperty(sc,'clientHeight',{value:120,configurable:true})})()`);
 enRetrato(dom, false);
 const apaisado = run('effZoom()');
 enRetrato(dom, true);
 const vertical = run('effZoom()');
 assert.ok(Math.abs(vertical - 800 / 1280) < 1e-6, 'en vertical manda el ancho: ' + vertical);
 assert.ok(apaisado < vertical, 'en apaisado el alto sigue limitando: ' + apaisado);
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Portrait thumbnails are big enough to read and the counter fits the bar',async()=>{const{dom,run,errors}=await editor();try{
 run("wsNueva(EJEMPLOS[0].build())");
 enRetrato(dom, false);
 const apaisado = run('thumbW()');
 enRetrato(dom, true);
 dom.window.innerWidth = 390;
 const vertical = run('thumbW()');
 assert.equal(apaisado, 168);
 assert.ok(vertical >= 140 && vertical <= 190, 'dos columnas con el ancho que sobra: ' + vertical);
 run('updateChrome()');
 /* Las dos formas conviven en el marcado y el CSS enseña la que toca; el
    aria-label dice la larga siempre, que es lo que oye quien no la ve. */
 assert.equal(run("document.getElementById('slidePos').getAttribute('aria-label')"), 'Diapositiva 1 de 6');
 assert.match(run("document.getElementById('slidePos').textContent"), /Diapositiva 1 de \/6/);
 assert.equal(run("document.querySelectorAll('#slidePos .only-wide-i').length"), 2, 'lo prescindible se oculta en estrecho');
 assert.equal(run("document.querySelectorAll('#slidePos .only-narrow-i').length"), 1, 'y en su lugar queda «4/6»');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

/* Dos figuras en la misma diapositiva salían las dos como «Figura 1»: el
   contador solo avanzaba entre diapositivas. Una gráfica, una estructura y un
   SmartArt juntos tienen que ser 1, 2 y 3, y la tabla y la figura de la
   diapositiva siguiente, «Tabla 1» y «Figura 4». */
test('Figures and tables on the same slide are numbered one after another',async()=>{const{dom,run,errors}=await editor();try{
 const pies=JSON.parse(run(`JSON.stringify((()=>{const d=blankDeck();
  const conPie=(t,o)=>Object.assign(newBlock(t),{caption:'pie'},o||{});
  d.slides.push({id:uid(),layout:'tres',title:'Tres',blocks:[conPie('chart')],blocks2:[conPie('estruct',{est:{atomos:[{id:'a',x:0,y:0,el:'O',carga:0}],enlaces:[]}})],blocks3:[conPie('smart')]});
  d.slides.push({id:uid(),layout:'twocol',title:'Dos',blocks:[conPie('table')],blocks2:[conPie('chart')]});
  const lee=i=>[...renderSlide(d,i,'export',99).querySelectorAll('.cap-label')].map(x=>x.textContent.trim());
  return [lee(1),lee(2)];})())`));
 assert.deepEqual(pies[0],['Figura 1:','Figura 2:','Figura 3:']);
 assert.deepEqual(pies[1],['Tabla 1:','Figura 4:']);
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

/* Los títulos de Crossref llegan con marcado JATS. Quitar las etiquetas en una
   sola pasada dejaba «<script>» a partir de «<scr<b>ipt>» (CodeQL). */
test('Crossref markup is stripped until no tag is left',async()=>{const{dom,run,errors}=await editor();try{
 const r=JSON.parse(run(`JSON.stringify([sinMarcado('TiO<sub>2</sub> <i>in situ</i>'),sinMarcado('<scr<b>ipt>alert(1)</scr</b>ipt>'),sinMarcado('pH &lt; 7 &amp; T &gt; 300 K')])`));
 assert.equal(r[0],'TiO₂ in situ');
 assert.ok(!/<[a-z\/]/i.test(r[1]),'no queda ninguna etiqueta: '+r[1]);
 assert.equal(r[2],'pH < 7 & T > 300 K','las entidades pasan a sus caracteres');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

/* «(00l)» es un índice de Miller, no cero litros: se leía como número y
   unidad, en pantalla («00 l») y en Beamer (\SI{00}{\liter}). */
test('Miller indices are left alone by the automatic notation',async()=>{const{dom,run,errors}=await editor();try{
 const r=JSON.parse(run(`JSON.stringify(['Reflexión (00l) a 11.5°','planos (hk0), (1-10) y {100}','(003) de la HDL','10 mL y (5 L)'].map(t=>[notacion(t),notacionTex(t)]))`));
 assert.equal(r[0][0],'Reflexión (00l) a 11.5°');
 assert.equal(r[0][1],'Reflexión (00l) a \\SI{11.5}{\\degree}');
 assert.equal(r[1][0],'planos (hk0), (1-10) y {100}','el menos de un índice negativo tampoco se toca');
 assert.equal(r[2][1],'(003) de la HDL');
 assert.equal(r[3][0],'10\u2009mL y (5\u2009L)','las unidades de verdad siguen con su espacio fino');
 assert.equal(r[3][1],'\\SI{10}{\\milli\\liter} y (\\SI{5}{\\liter})');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

/* append() nativo escribe «null» si recibe null: el indicador decía
   «null1 problema». */
test('The readiness pill never shows the word null',async()=>{const{dom,run,errors}=await editor();try{
 const t=run(`(()=>{const out=[];for(const p of [{errores:1,avisos:0,pendientes:0},{errores:2,avisos:1,pendientes:3}]){_prep=p;pintaPreparacion();out.push(document.getElementById('prepInd').textContent);}return JSON.stringify(out)})()`);
 const [uno,varios]=JSON.parse(t);
 assert.equal(uno,'1 problema');
 assert.equal(varios,'2 problemas · 1 aviso · 3 pendientes');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

/* La «v» de mhchem es la flecha de precipitado: el analizador no la cuenta
   como átomo, pero no debe perderse ni al ajustar ni al componer. */
test('The precipitate arrow survives balancing and rendering',async()=>{const{dom,run,errors}=await editor();try{
 const r=JSON.parse(run(`JSON.stringify([quimAjusta('BaCl2 + Na2SO4 -> BaSO4 v + NaCl').texto,quimEcuacion('Zn^2+ + 2 OH- -> Zn(OH)2 v').ajustada,kStr('\\\\ce{Zn(OH)2 v}',true).includes('↓')])`));
 assert.equal(r[0],'BaCl2 + Na2SO4 -> BaSO4 v + 2 NaCl');
 assert.equal(r[1],true,'la v no es un átomo que descuadre la reacción');
 assert.equal(r[2],true,'KaTeX compone la flecha hacia abajo');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

/* \item [100] tomaba «[100]» como marca de la viñeta, y \item <001> se leía
   como capas de Beamer: el índice cristalográfico desaparecía o no compilaba. */
test('Bullets that start with [ or < keep their text in the Beamer export',async()=>{const{dom,run,errors}=await editor();try{
 const tex=run(`(()=>{const d=blankDeck();d.slides.push({id:uid(),layout:'content',title:'Direcciones',blocks:[Object.assign(newBlock('bullets'),{step:true,items:[{t:'<001> es la dirección de crecimiento',l:0},{t:'[100] también',l:0},{t:'Normal',l:0}]})]});loadDeck(d,null);return toBeamer(S.deck)})()`);
 assert.match(tex,/\\item<\+-> \{\}<001> es la dirección de crecimiento/);
 assert.match(tex,/\\item<\+-> \{\}\[100\] también/);
 assert.match(tex,/\\item<\+-> Normal\n/,'una viñeta normal no cambia');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});
