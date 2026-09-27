import test from 'node:test';import assert from 'node:assert/strict';import {editor} from '../herramientas/test-browser.mjs';

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
