import test from 'node:test';import assert from 'node:assert/strict';import {inflateRawSync,crc32} from 'node:zlib';import {editor} from '../herramientas/test-browser.mjs';

/* Lector mínimo de ZIP: recorre el directorio central, descomprime cada
   entrada y comprueba su CRC. Sirve para mirar el .pptx por dentro sin
   dependencias y sin confiar en la misma rutina que lo escribió. */
function leeZip(bytes){
 const b=Buffer.from(bytes);const u16=o=>b.readUInt16LE(o),u32=o=>b.readUInt32LE(o);
 let fin=b.length-22;while(fin>=0&&u32(fin)!==0x06054b50)fin--;
 assert.ok(fin>=0,'el archivo no termina en un directorio central de ZIP');
 const total=u16(fin+10);let p=u32(fin+16);const salida=new Map();
 for(let i=0;i<total;i++){
  assert.equal(u32(p),0x02014b50,'entrada '+i+' del directorio central');
  const metodo=u16(p+10),suma=u32(p+16),comp=u32(p+20),plano=u32(p+24);
  const ln=u16(p+28),le=u16(p+30),lc=u16(p+32),desplaza=u32(p+42);
  const nombre=b.slice(p+46,p+46+ln).toString('utf8');
  assert.equal(u32(desplaza),0x04034b50,'cabecera local de '+nombre);
  const ln2=u16(desplaza+26),le2=u16(desplaza+28);
  const inicio=desplaza+30+ln2+le2;
  const crudo=b.slice(inicio,inicio+comp);
  const datos=metodo===8?inflateRawSync(crudo):crudo;
  assert.equal(datos.length,plano,'tamaño de '+nombre);
  assert.equal(crc32(datos)>>>0,suma,'CRC de '+nombre);
  salida.set(nombre,datos.toString('utf8'));
  p+=46+ln+le+lc;
 }
 return salida;
}

test('Pasted data keeps its decimals whatever separator Excel used',async()=>{const{dom,run,errors}=await editor();try{
 const t=s=>JSON.parse(run('JSON.stringify(parseTable('+JSON.stringify(s)+'))'));
 assert.deepEqual(t('C\tAbsorbancia\n0\t0,004\n2\t0,118').rows,[[0,0.004],[2,0.118]]);
 assert.deepEqual(t('C;Absorbancia\n0;0,004\n2;0,118').rows,[[0,0.004],[2,0.118]]);
 assert.deepEqual(t('C\tAbsorbancia\n0\t0.004\n2\t0.118').rows,[[0,0.004],[2,0.118]]);
 assert.deepEqual(t('0,0.004\n2,0.118').rows,[[0,0.004],[2,0.118]]);
 assert.deepEqual(t('C\tA\n0\t1.234,5').rows,[[0,1234.5]]);
 assert.deepEqual(t('C\tAbsorbancia\n0\t0,004').headers,['C','Absorbancia']);
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Beamer marks code frames fragile, escapes them and drops file and shell primitives',async()=>{const{dom,run,errors}=await editor();try{
 const bloques=[
  {id:'cod',type:'code',text:'print(f"m: {x:.3f}")\nruta = C:\\datos',lang:'python'},
  {id:'ec',type:'math',tex:'x \\input{/etc/passwd}'},
  {id:'re',type:'chem',tex:'\\write18{curl http://malo.example}'},
  {id:'tx',type:'text',text:'en línea $\\input{/etc/passwd}$ fin'}];
 run('window.__deck=EJEMPLOS[0].build();__deck.slides[1].blocks.push(...'+JSON.stringify(bloques)+');window.__tex=toBeamer(__deck)');
 const tex=run('window.__tex');
 const frames=tex.split('\n').filter(l=>l.startsWith('\\begin{frame}'));
 assert.equal(frames.filter(l=>l.includes('fragile')).length,1,'solo el frame con código lleva [fragile]');
 assert.match(frames.find(l=>l.includes('fragile')),/^\\begin\{frame\}\[fragile\]/);
 assert.match(tex,/print\(f"m: \\\{x:\.3f\\\}"\)/);
 assert.match(tex,/ruta = C:\\textbackslash\{\}datos/);
 for(const orden of ['\\input{','\\write18'])assert.equal(tex.includes(orden),false,orden+' debía retirarse');
 assert.equal((tex.match(/retirado\]/g)||[]).length,3);
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Imported projects keep working sources and report the ones that phone home',async()=>{const{dom,run,errors}=await editor();try{
 run(`window.__r=saneaDeck((()=>{const d=EJEMPLOS[0].build();
  d.meta.logo='https://rastreador.example/pixel.png';
  d.slides[1].blocks.push({id:'i1',type:'image',src:'https://remoto.example/f.png',w:40});
  d.slides[1].blocks.push({id:'i2',type:'image',src:'javascript:alert(1)',w:40});
  d.slides[1].blocks.push({id:'i3',type:'image',src:'data:image/png;base64,iVBORw0KGgo=',poster:'file:///etc/passwd',w:40});
  return d;})())`);
 const r=JSON.parse(run('JSON.stringify(window.__r)'));
 assert.ok(r.deck,JSON.stringify(r));
 const bl=id=>r.deck.slides[1].blocks.find(b=>b.id===id);
 assert.equal(bl('i2').src,undefined,'javascript: no debe sobrevivir');
 assert.equal(bl('i3').poster,undefined,'file:// no debe sobrevivir');
 assert.equal(bl('i1').src,'https://remoto.example/f.png');
 assert.match(r.avisos.join(' · '),/rastreador\.example/);
 assert.match(r.avisos.join(' · '),/remoto\.example/);
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('PowerPoint package stays consistent when a branch hides slides',async()=>{const{dom,run,errors}=await editor();try{
 /* JSDOM no carga imágenes ni tiene lienzo: rasteriza() no resolvería nunca.
    Se comprueba la estructura del paquete, no la geometría de las formas. */
 run(`window.rasteriza=async()=>null;window.__pptx=null;window.downloadFile=async(n,b)=>{window.__pptx={n,bytes:await new Promise(ok=>{const fr=new FileReader();fr.onload=()=>ok(Array.from(new Uint8Array(fr.result)));fr.readAsArrayBuffer(b)})};return true};
  wsNueva(EJEMPLOS[0].build());
  S.deck.meta.ramas=[{id:'r1',n:'Corta',fuera:[S.deck.slides[2].id,S.deck.slides[4].id],nivel:null,titulo:''}];
  S.deck.meta.rama='r1'`);
 await run('exportPPTX()');
 const cap=run('window.__pptx');
 assert.ok(cap,'la exportación no entregó ningún archivo');
 assert.match(cap.n,/\.pptx$/);
 const partes=leeZip(Uint8Array.from(cap.bytes));
 const nombres=[...partes.keys()];
 const slides=nombres.filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n));
 assert.equal(slides.length,4,'6 diapositivas menos las 2 fuera de la rama');
 const tipos=partes.get('[Content_Types].xml');
 const rels=partes.get('ppt/_rels/presentation.xml.rels');
 for(const decl of [...tipos.matchAll(/PartName="\/(ppt\/(?:slides|notesSlides)\/[^"]+)"/g)].map(m=>m[1]))
  assert.ok(partes.has(decl),'declarada en [Content_Types].xml pero ausente: '+decl);
 for(const t of [...rels.matchAll(/Target="(slides\/slide\d+\.xml)"/g)].map(m=>m[1]))
  assert.ok(partes.has('ppt/'+t),'referenciada por presentation.xml.rels pero ausente: ppt/'+t);
 for(const n of nombres.filter(x=>/^ppt\/slides\/_rels\//.test(x)))
  assert.ok(partes.has('ppt/slides/'+n.split('/').pop().replace('.rels','')),'rels huérfano: '+n);
 for(const n of nombres.filter(x=>/^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(x)))
  assert.ok(partes.has('ppt/slides/slide'+n.replace(/\D+/g,'')+'.xml'),'nota sin diapositiva: '+n);
 assert.match(partes.get('docProps/app.xml'),/<Slides>4<\/Slides>/);
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

/* La exportación va con `await` en medio, y mientras tanto la aplicación no se
   detiene: la revisión del indicador de preparación se recalcula «en reposo» y
   usa el mismo banco de trabajo. Reponía su HTML y dejaba sueltos los nodos que
   la exportación tenía medio medidos, con lo que las formas que faltaban salían
   con `sz="NaN"` y un marco de 1 EMU: dos de cada cinco exportaciones traían
   alguna diapositiva en blanco, y ni el ZIP ni el XML tenían nada de raro. */
const capturaPptx = 'window.rasteriza=async()=>null;window.__pptx=null;window.downloadFile=async(n,b)=>{window.__pptx={n,bytes:await new Promise(ok=>{const fr=new FileReader();fr.onload=()=>ok(Array.from(new Uint8Array(fr.result)));fr.readAsArrayBuffer(b)})};return true};';

test('An idle recheck in the middle of the export cannot blank a slide',async()=>{const{dom,run,errors}=await editor();try{
 run(capturaPptx+"wsNueva(EJEMPLOS[0].build());window.__t=setInterval(()=>{try{revisaMazo()}catch(e){}},3)");
 await run('exportPPTX()');
 run('clearInterval(window.__t)');
 const partes=leeZip(Uint8Array.from(run('window.__pptx').bytes));
 const slides=[...partes.keys()].filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n));
 assert.equal(slides.length,6);
 for(const n of slides){
  const x=partes.get(n);
  assert.ok(!x.includes('NaN'),n+' lleva una medida que no es un número');
  assert.ok((x.match(/<p:sp>/g)||[]).length>=2,n+' se quedó sin formas');
  /* Un marco de 1 EMU es lo que deja un elemento que ya no estaba medido. */
  assert.ok(!/<a:ext cx="1" cy="1"\/>/.test(x),n+' tiene una forma de tamaño cero');
 }
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

/* Los encabezados de zona de «Dato grande», «Cita destacada», «Tres filas» y
   «Pantalla partida» no estaban en la lista de la exportación: la cifra, el
   autor y los rótulos no llegaban al PowerPoint. Esta prueba los recorre desde
   los que pinta el render, para que un diseño nuevo no se quede fuera. */
test('Every zone heading the slide shows reaches the PowerPoint',async()=>{const{dom,run,errors}=await editor();try{
 const clases=run(`[...new Set([...renderSlide.toString().matchAll(/class: '([a-z-]+)' \\+ emptyCls\\(zt\\(/g)].map(m=>m[1]))]`);
 assert.ok(clases.length>=8,'no se encontraron los encabezados en el render: '+clases);
 const selector=run('formasSlide.toString()');
 for(const c of clases) assert.ok(new RegExp('\\.'+c+'\\b').test(selector),'la exportación no recoge .'+c);
 run(capturaPptx+`(()=>{const d=blankDeck();
   const mk=(layout,zt)=>{const s={id:uid(),layout,title:'T '+layout,blocks:[]};prepararZonas(s,layout);s.zt=zt;return s;};
   d.slides.push(mk('dato',['7,6 nm','espacio basal']),mk('cita',['Autora, 2020']),mk('filas',['Fila uno','Fila dos','Fila tres']),mk('partida',['Mitad A','Mitad B']));
   wsNueva(d);})()`);
 await run('exportPPTX()');
 const partes=leeZip(Uint8Array.from(run('window.__pptx').bytes));
 const texto=n=>(partes.get('ppt/slides/slide'+n+'.xml').match(/<a:t[^>]*>[^<]*<\/a:t>/g)||[]).join(' ').replace(/\s/g,' '); /* el número y su unidad van con espacio duro */
 for(const [n,t] of [[2,'7,6 nm'],[2,'espacio basal'],[3,'Autora, 2020'],[4,'Fila dos'],[5,'Mitad B']])
  assert.ok(texto(n).includes(t),'falta «'+t+'» en la diapositiva '+n+': '+texto(n));
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

/* «En blanco» es un lienzo libre: ni título ni pie, pero sus bloques tienen
   que llegar a la pantalla, al Beamer y al PowerPoint. Los otros tres diseños
   nuevos llevan rótulos propios que tampoco pueden perderse por el camino. */
test('The blank slide and the new layouts reach the screen, Beamer and PowerPoint',async()=>{const{dom,run,errors}=await editor();try{
 run(capturaPptx+`(()=>{const d=blankDeck();
   const mk=(layout,title,zonas,zt)=>{const s={id:uid(),layout,title,blocks:[]};prepararZonas(s,layout);
     zonas.forEach((txt,i)=>zona(s,i).push({id:uid(),type:'text',text:txt}));if(zt)s.zt=zt;return s;};
   d.slides.push(mk('blanco','Titulo oculto',['Frase del lienzo libre']),
     mk('titular','Frase completa del titular de prueba',['Evidencia del titular']),
     mk('tresfig','Tres paneles',['Panel uno','Panel dos','Panel tres']),
     mk('objetivos','Objetivos',['Objetivo general de prueba','Objetivo especifico de prueba']));
   wsNueva(d);})()`);
 /* pantalla */
 const vista=JSON.parse(run(`JSON.stringify([1,2,3,4].map(i=>{const r=renderSlide(S.deck,i,'export',99);return {
   ft:!!r.querySelector('.frametitle'),titular:!!r.querySelector('.frametitle.ft-titular'),
   pie:!!r.querySelector('.footline, .pagenum, .pie-nota'),texto:r.textContent};}))`));
 assert.equal(vista[0].ft,false,'«En blanco» no enseña el título');
 assert.equal(vista[0].pie,false,'«En blanco» no lleva pie ni número');
 assert.ok(vista[0].texto.includes('Frase del lienzo libre'));
 assert.ok(!vista[0].texto.includes('Titulo oculto'));
 assert.equal(vista[1].titular,true,'el titular va en su propio estilo');
 assert.ok(vista[1].pie,'los demás diseños conservan el pie');
 for(const t of ['(a)','(b)','(c)','Panel dos'])assert.ok(vista[2].texto.includes(t),'falta «'+t+'» en «Tres figuras»');
 for(const t of ['Objetivo general','Objetivos específicos','Objetivo especifico de prueba'])assert.ok(vista[3].texto.includes(t),'falta «'+t+'» en «Objetivos»');
 /* Beamer */
 const tex=run('toBeamer(S.deck)');
 const marco=n=>tex.split(run('MARCA_DIAPO')+n+' ---')[1].split('\\end{frame}')[0];
 assert.match(marco(2),/^\s*\\begin\{frame\}\[plain\]\n/,'«En blanco» es un marco [plain]');
 assert.ok(marco(2).includes('Frase del lienzo libre')&&!tex.includes('Titulo oculto'));
 assert.ok(marco(3).includes('{Frase completa del titular de prueba}')&&marco(3).includes('Evidencia del titular'));
 assert.ok(marco(4).includes('(b)')&&marco(4).includes('Panel tres'));
 assert.match(marco(5),/\\begin\{block\}\{Objetivo general\}[\s\S]*Objetivo general de prueba[\s\S]*\\end\{block\}[\s\S]*Objetivos específicos[\s\S]*Objetivo especifico de prueba/);
 /* PowerPoint */
 await run('exportPPTX()');
 const partes=leeZip(Uint8Array.from(run('window.__pptx').bytes));
 const texto=n=>(partes.get('ppt/slides/slide'+n+'.xml').match(/<a:t[^>]*>[^<]*<\/a:t>/g)||[]).join(' ');
 assert.ok(texto(2).includes('Frase del lienzo libre'),'el bloque de «En blanco» no llegó: '+texto(2));
 assert.ok(!texto(2).includes('Titulo oculto')&&!/\d+ \/ \d+/.test(texto(2)),'«En blanco» no lleva título ni número: '+texto(2));
 assert.ok(texto(3).includes('Frase completa del titular de prueba')&&texto(3).includes('Evidencia del titular'));
 for(const t of ['(a)','(c)','Panel uno'])assert.ok(texto(4).includes(t),'falta «'+t+'» en el PowerPoint: '+texto(4));
 for(const t of ['Objetivo general','Objetivos específicos','Objetivo especifico de prueba'])assert.ok(texto(5).includes(t),'falta «'+t+'» en el PowerPoint: '+texto(5));
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

/* Una diapositiva nueva «En blanco» nace sin título ni bloques, y la revisión
   no le pide el título que no enseña. */
test('A new blank slide is born empty and the review does not ask for its title',async()=>{const{dom,run,errors}=await editor();try{
 run("wsNueva();addSlide('blanco')");
 const sl=JSON.parse(run('JSON.stringify(curSlide())'));
 assert.equal(sl.layout,'blanco');assert.equal(sl.title,'');assert.deepEqual(sl.blocks,[]);
 run("curSlide().blocks.push({id:uid(),type:'text',text:'Una sola frase'})");
 const avisos=run('JSON.stringify(revisaMazo().fallos.filter(x=>x.i===S.cur))');
 assert.ok(!/sin título/i.test(avisos),'la revisión pidió título a «En blanco»: '+avisos);
 /* y la regla sigue viva para los diseños que sí enseñan el título */
 run("addSlide('content');curSlide().title='';curSlide().blocks.push({id:uid(),type:'text',text:'Otra frase'})");
 assert.match(run('JSON.stringify(revisaMazo().fallos.filter(x=>x.i===S.cur))'),/sin título/i);
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('The export measures on its own bench, not on the shared one',async()=>{const{dom,run,errors}=await editor();try{
 run(capturaPptx+"wsNueva(EJEMPLOS[0].build());document.getElementById('workbench').innerHTML='<i id=\"testigo\"></i>'");
 await run('exportPPTX()');
 assert.ok(run("!!document.getElementById('testigo')"),'la exportación arrasó el banco compartido');
 assert.equal(run("document.querySelectorAll('body > div[style*=\"-99999px\"]').length"),1,'y tiene que recoger el suyo al terminar');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('A shape never carries a measurement that is not a number',async()=>{const{dom,run,errors}=await editor();try{
 run("wsNueva(EJEMPLOS[0].build())");
 const r=JSON.parse(run(`JSON.stringify((()=>{const suelto=document.createElement('p');
   const raiz=document.createElement('div');
   return {estilo:estilo(suelto,0.05,'Calibri'), marco:marco(suelto,raiz,1)};})())`));
 assert.ok(isFinite(r.estilo.pt)&&r.estilo.pt>0,'un elemento sin estilo calculado daba «sz=NaN»: '+r.estilo.pt);
 for(const k of ['x','y','w','h']) assert.ok(isFinite(r.marco[k]),'marco.'+k+' salió '+r.marco[k]);
 assert.ok(r.marco.w>=1&&r.marco.h>=1);
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

/* Lo que se rasteriza se serializa dentro de un <foreignObject>, donde no hay
   ni `:root` ni la diapositiva de la que colgaba: sin llevárselo escrito, un
   <svg> pierde su espacio de nombres y las variables de CSS se quedan sin
   valor. El SmartArt llegaba al PowerPoint como una hilera de rótulos sueltos,
   en serifa y sin cajas ni flechas. */
test('What gets rasterised carries its namespace and its inherited style',async()=>{const{dom,run,errors}=await editor();try{
 run("wsNueva(EJEMPLOS[0].build());S.cur=2;renderAll()");
 /* JSDOM no carga imágenes: se atrapa el `src` que rasteriza le pone al <img>. */
 const uri=run(`(()=>{const el=document.querySelector('#stageInner .smart-box');
   if(!el)return 'sin smart-box';
   el.style.setProperty('--acc','#123456');
   let visto='';
   const O=window.Image;
   window.Image=function(){const o={};Object.defineProperty(o,'src',{set(v){visto=v}});return o};
   rasteriza(el,':root{--acc:#123456}',2);
   window.Image=O;
   return visto})()`);
 const svg=decodeURIComponent(uri.replace(/^data:image\/svg\+xml;charset=utf-8,/,''));
 const dentro=/<svg [^>]*class="smart-svg[^>]*>/.exec(svg);
 assert.ok(dentro,'no está el dibujo del SmartArt dentro del recorte');
 assert.match(dentro[0],/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/,'el <svg> de dentro va sin espacio de nombres: se leería como una etiqueta desconocida y solo saldría su texto');
 /* Lo heredado se escribe en el envoltorio. JSDOM no resuelve propiedades
    personalizadas ni la familia tipográfica, así que aquí solo se comprueba
    que el envoltorio las lleva; el color y la letra de verdad se revisaron en
    Chromium contra el PowerPoint exportado. */
 assert.match(svg,/<div xmlns="http:\/\/www\.w3\.org\/1999\/xhtml" style="[^"]*color:/,'sin lo heredado, el recorte sale en la serifa de fábrica y sin color');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Loading or undoing while the title has focus does not write the old title back',async()=>{const{dom,run,errors}=await editor();try{
 const campo=()=>run("document.getElementById('deckTitleInput').value");
 run("wsNueva(EJEMPLOS[0].build());document.getElementById('deckTitleInput').focus()");
 assert.equal(campo(),'Calibración UV–Vis');
 run('wsNueva(EJEMPLOS[5].build())');
 assert.equal(run('document.activeElement.id'),'deckTitleInput');
 assert.equal(campo(),run('S.deck.meta.title'));
 assert.equal(campo(),'Equilibrio ácido–base');
 run("S.deck.meta.title='Titulo NUEVO';commit();doUndo()");
 assert.equal(run('S.deck.meta.title'),'Equilibrio ácido–base');
 assert.equal(campo(),'Equilibrio ácido–base');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});
