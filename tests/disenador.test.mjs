import test from 'node:test';import assert from 'node:assert/strict';import {editor} from '../herramientas/test-browser.mjs';
/* El Diseñador según el contenido (src/js/55-disenador.js): qué propone para
   cada tipo de diapositiva, que las propuestas son deterministas, que nunca
   escriben texto nuevo y que el panel se abre sin figura. JSDOM no mide: las
   miniaturas se revisan en un navegador real. */

/* Una diapositiva de contenido con los bloques dados, y sus propuestas. */
const monta=(run,bloques,layout='content')=>run(`(()=>{wsNueva();addSlide(${JSON.stringify(layout)});const sl=curSlide();CLAVES_ZONA.forEach(k=>delete sl[k]);
 prepararZonas(sl,sl.layout);zona(sl,0).push(...${JSON.stringify(bloques)}.map(b=>Object.assign(newBlock(b.type),b)));commit();return S.cur;})()`);
const propuestas=run=>JSON.parse(run(`JSON.stringify(propuestasDiapositiva(S.deck,S.cur).map(p=>({id:p.id,n:p.n,d:p.d,origen:p.origen,layout:p.copia.slides[S.cur].layout,sl:p.copia.slides[S.cur],total:p.copia.slides.length,nueva:p.copia.slides[S.cur+1]})))`));
const ids=ps=>ps.map(p=>p.id);
/* Todo el texto visible de una diapositiva, en palabras. */
const palabras=sl=>{const out=[];const v=x=>{if(typeof x==='string')out.push(...x.replace(/\$[^$]*\$/g,' ').split(/[\s«»“”"—–:;,.()]+/).filter(Boolean));};
 v(sl.title);(sl.zt||[]).forEach(v);['blocks','blocks2','blocks3','blocks4','blocks5','blocks6'].forEach(k=>(sl[k]||[]).forEach(b=>{v(b.text);v(b.by);v(b.caption);v(b.body);v(b.btitle);v(b.tex);(b.items||[]).forEach(it=>{v(it.t);v(it.d);});}));return out;};

const LARGO=['La síntesis hidrotermal de hidróxidos dobles laminares de Zn y Al se hizo a pH constante, con goteo lento de la disolución de nitratos sobre la base.',
 'El sólido se envejeció en las aguas madre durante veinticuatro horas, se lavó hasta conductividad constante y se secó en estufa a temperatura moderada.',
 'La difracción de rayos X muestra las reflexiones basales esperadas para una fase laminar; la anchura de los picos cambia con la temperatura de envejecimiento.',
 'El análisis térmico separa la pérdida de agua interlaminar de la deshidroxilación de las láminas, y la espectroscopia infrarroja confirma el anión intercalado.'];

test('Long text proposes a flowing layout and splitting in two, without losing or inventing words',async()=>{const {dom,errors,run}=await editor();try{
 monta(run,[{type:'text',text:LARGO.slice(0,2).join('\n\n')},{type:'text',text:LARGO.slice(2).join('\n\n')}]);
 run("curSlide().title='Síntesis y caracterización'");
 const ps=propuestas(run);
 assert.ok(ids(ps).includes('flujo'));assert.ok(ids(ps).includes('dos-columnas'));assert.ok(ids(ps).includes('dos-diapositivas'));
 assert.equal(ps.find(p=>p.id==='flujo').layout,'flujo');
 const dos=ps.find(p=>p.id==='dos-columnas');assert.equal(dos.layout,'twocol');
 assert.equal(dos.sl.blocks.length,1);assert.equal(dos.sl.blocks2.length,1,'Un bloque por columna');
 const partida=ps.find(p=>p.id==='dos-diapositivas');assert.equal(partida.total,run('S.deck.slides.length')+1,'Crea una diapositiva detrás');
 assert.equal(partida.nueva.title,'Síntesis y caracterización','Con el mismo título, sin añadir nada');
 const antes=palabras(run('curSlide()')).sort();
 for(const p of ps){if(p.id==='dos-diapositivas')continue;assert.deepEqual(palabras(p.sl).sort(),antes,'«'+p.id+'» conserva exactamente las palabras');}
 assert.deepEqual([...palabras(partida.sl),...palabras(partida.nueva)].filter(w=>w!=='Síntesis'&&w!=='y'&&w!=='caracterización').sort(),antes.filter(w=>w!=='Síntesis'&&w!=='y'&&w!=='caracterización').sort());
 ps.forEach(p=>assert.ok(p.d.length>20&&p.d.length<260,'Cada propuesta explica por qué en una frase: '+p.id));
 assert.deepEqual(propuestas(run).map(p=>[p.id,p.d]),ps.map(p=>[p.id,p.d]),'Deterministas');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('A short ordered list becomes a SmartArt process; a list with branches, a hierarchy',async()=>{const {dom,errors,run}=await editor();try{
 monta(run,[{type:'bullets',items:[{t:'1. Coprecipitación a pH 10',lvl:0},{t:'2. Envejecimiento 24 h',lvl:0},{t:'3. Lavado y secado',lvl:0},{t:'4. Caracterización por DRX',lvl:0}]}]);
 let ps=propuestas(run);
 assert.equal(ps[0].id,'smart-proceso','Pasos numerados: proceso primero');
 const bl=ps[0].sl.blocks[0];assert.equal(bl.type,'smart');assert.equal(bl.kind,'proceso');
 assert.equal(bl.id,run('curSlide().blocks[0].id'),'Conserva el id del bloque');
 assert.deepEqual(bl.items.map(x=>x.t),['Coprecipitación a pH 10','Envejecimiento 24 h','Lavado y secado','Caracterización por DRX'],'Solo quita la numeración que ya dibuja el diagrama');
 assert.ok(ids(ps).includes('smart-lista'));
 monta(run,[{type:'bullets',items:[{t:'Técnicas de caracterización',lvl:0},{t:'DRX',lvl:1},{t:'FTIR',lvl:1},{t:'TGA',lvl:1}]}]);
 ps=propuestas(run);assert.deepEqual(ids(ps).slice(0,2),['smart-jerarquia','smart-radial']);
 assert.deepEqual(ps[0].sl.blocks[0].items,[{t:'Técnicas de caracterización'},{t:'DRX',lvl:1},{t:'FTIR',lvl:1},{t:'TGA',lvl:1}]);
 monta(run,[{type:'bullets',items:[{t:'2009: primera celda de perovskita',lvl:0},{t:'2012: celdas de estado sólido',lvl:0},{t:'2016: más del 20 % de eficiencia',lvl:0}]}]);
 ps=propuestas(run);assert.equal(ps[0].id,'smart-cronologia');assert.deepEqual(ps[0].sl.blocks[0].items[0],{t:'2009',d:'primera celda de perovskita'});
 monta(run,[{type:'bullets',items:[{t:'Adsorción del colorante',lvl:0},{t:'Separación magnética',lvl:0},{t:'Regeneración del adsorbente',lvl:0}]}]);
 assert.equal(propuestas(run)[0].id,'smart-ciclo');
 // La viñeta vacía que deja Intro no cuenta; sin «lvl» es primer nivel, como en el resto del editor.
 monta(run,[{type:'bullets',items:[{t:'Paso 1: pesar'},{t:'Paso 2: disolver'},{t:'Paso 3: filtrar'},{t:''}]}]);
 ps=propuestas(run);assert.match(ps[0].d,/Son 3 pasos/);assert.equal(ps[0].sl.blocks[0].items.length,3);
 monta(run,[{type:'bullets',items:[{t:'Técnicas'},{t:'DRX',lvl:1},{t:'FTIR',lvl:1}]}]);
 assert.equal(propuestas(run)[0].id,'smart-jerarquia');
 // Dos padres con hijos no son una raíz con ramas: nada que tome el primero como centro.
 monta(run,[{type:'bullets',items:[{t:'Ventajas'},{t:'Barato',lvl:1},{t:'Rápido',lvl:1},{t:'Límites'},{t:'Poco cristalino',lvl:1}]}]);
 assert.deepEqual(ids(propuestas(run)).filter(x=>x.startsWith('smart-')),['smart-contraste']);
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('A single number becomes «dato», a quote «cita», an equation goes to the centre; placeholder headers never leak in',async()=>{const {dom,errors,run}=await editor();try{
 monta(run,[{type:'text',text:'Rendimiento de la síntesis: 94 %'}]);
 let ps=propuestas(run);assert.equal(ps[0].id,'dato');
 assert.deepEqual(ps[0].sl.zt,['94 %','Rendimiento de la síntesis']);assert.equal(ps[0].sl.blocks.length,0,'El texto pasa a la cifra y su rótulo');
 monta(run,[{type:'text',text:'Conversión de 94 % a 80 °C'}]);
 assert.equal(ids(propuestas(run)).includes('dato'),false,'Dos cifras no son un dato');
 monta(run,[{type:'quote',text:'La química es la ciencia central.',by:''}]);
 ps=propuestas(run);const c=ps.find(p=>p.id==='cita');assert.ok(c);
 assert.deepEqual(c.sl.zt,[''],'Sin autor, el encabezado queda vacío: nunca el de muestra');
 assert.equal(c.sl.blocks[0].type,'text');assert.equal(c.sl.blocks[0].text,'La química es la ciencia central.');
 monta(run,[{type:'text',text:'«El orden es el primer paso.» — Autor de la tesis'}]);
 assert.deepEqual(propuestas(run).find(p=>p.id==='cita').sl.zt,['Autor de la tesis']);
 monta(run,[{type:'math',tex:'\\Delta G = \\Delta H - T\\Delta S'},{type:'text',text:'Criterio de espontaneidad.'}]);
 ps=propuestas(run);const e=ps.find(p=>p.id==='enfasis');assert.ok(e);assert.equal(e.layout,'enunciado');assert.equal(e.sl.blocks[0].size,'l');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Figures: chart with text goes side by side or with a wide caption; two to four figures go into grids',async()=>{const {dom,errors,run}=await editor();try{
 monta(run,[{type:'chart'},{type:'text',text:'El pico a 11.6° corresponde a la reflexión basal (003) de la fase laminar.'}]);
 let ps=propuestas(run);
 const ft=ps.find(p=>p.id==='figura-texto');assert.ok(ft);assert.equal(ft.layout,'twocol');assert.equal(ft.sl.blocks[0].type,'chart');assert.equal(ft.sl.blocks2[0].type,'text');
 assert.equal(ps.find(p=>p.id==='pie-ancho').layout,'piefigura');
 monta(run,[{type:'chart'},{type:'text',text:'Antes'},{type:'chart'},{type:'text',text:'Después'}]);
 ps=propuestas(run);assert.ok(ids(ps).includes('lado-a-lado'));
 const z=ps.find(p=>p.id==='zigzag');assert.deepEqual(['blocks','blocks2','blocks3','blocks4'].map(k=>z.sl[k].map(b=>b.type)),[['chart'],['text'],['text'],['chart']]);
 monta(run,[{type:'chart'},{type:'table'},{type:'chart'},{type:'chart'}]);
 ps=propuestas(run);const q=ps.find(p=>p.id==='cuadricula');assert.ok(q);assert.deepEqual(q.sl.zt,['','','',''],'Celdas sin los rótulos de muestra');
 monta(run,[{type:'chart'},{type:'chart'},{type:'chart'}]);assert.equal(propuestas(run).find(p=>p.id==='tres').layout,'tres');
 // Portadas y secciones no tienen dónde acomodar nada.
 run("wsNueva();S.cur=0");assert.deepEqual(propuestas(run),[]);
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('The panel opens for any slide, applies an idea in one undoable step and keeps the image path',async()=>{const {dom,errors,run}=await editor();try{
 const d=dom.window.document;
 monta(run,[{type:'bullets',items:[{t:'Paso 1: pesar',lvl:0},{t:'Paso 2: disolver',lvl:0},{t:'Paso 3: filtrar',lvl:0}]}]);
 await run('abreDisenador()');
 assert.ok(d.querySelector('#disPanel.on'),'Se abre sin figura');
 assert.match(d.querySelector('.dis-lee').textContent,/Veo .*lista/);
 const tarjetas=[...d.querySelectorAll('.dis-tar')];assert.ok(tarjetas.length>=2);assert.equal(tarjetas[0].dataset.propuesta,'smart-proceso');
 const antes=run('JSON.stringify(curSlide())');
 tarjetas[0].click();
 assert.equal(run('curSlide().blocks[0].type'),'smart');
 run('doUndo()');assert.equal(run('JSON.stringify(curSlide())'),antes,'Ctrl+Z lo deshace de una vez');
 // Una tarjeta pintada para otra diapositiva no se aplica a la actual: se repinta.
 await run('abreDisenador()');
 const vieja=d.querySelector('.dis-tar');
 run("addSlide('content');curSlide().blocks=[Object.assign(newBlock('text'),{text:'Rendimiento: 94 %'})];commit()");
 const otra=run('JSON.stringify(curSlide())');
 vieja.click();await new Promise(r=>setTimeout(r,20));
 assert.equal(run('JSON.stringify(curSlide())'),otra,'No toca la diapositiva nueva');
 assert.equal(d.querySelector('.dis-tar').dataset.propuesta,'dato','Las ideas ya son las de la diapositiva actual');
 run('cierraDisenador()');
 // Con una figura, sus propuestas se suman a las del contenido.
 monta(run,[{type:'image',src:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='},{type:'text',text:'Micrografía SEM de las plaquetas hexagonales del hidróxido doble laminar.'}]);
 const ps=propuestas(run);assert.ok(ps.some(p=>p.origen==='figura'));assert.ok(ids(ps).includes('pie-ancho'));
 // Desde la búsqueda de órdenes y la cinta.
 assert.ok(run("typeof abreDisenador==='function'"));
 run('wsNueva();S.cur=0');await run('abreDisenador()');assert.equal(d.querySelector('#disPanel.on'),null,'En la portada no se abre');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});
