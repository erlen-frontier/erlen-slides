import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {editor} from '../herramientas/test-browser.mjs';

/* Una gráfica de laboratorio tiene que enseñar dónde se midió y hasta dónde
   llega el eje: sin eso, la figura no dice lo que el autor cree que dice. */
const grafica=(run,extra)=>run(`(()=>{const b=Object.assign(newBlock('chart'),${JSON.stringify(extra)});
 window.__g=renderChart(b,S.deck,'export',900);return window.__g.querySelectorAll('path[fill]:not([fill="none"])').length})()`);

test('A curve of measurements shows the measurements',async()=>{const{dom,run,errors}=await editor();try{
 run("wsNueva();addSlide('content')");
 const pocos='x\ty\n0\t0.01\n1\t0.13\n2\t0.25\n3\t0.37\n4\t0.49';
 assert.equal(grafica(run,{data:pocos,kind:'linea'}),5,'cinco medidas, cinco marcas');
 assert.equal(grafica(run,{data:pocos,kind:'linea',puntos:false}),0,'la casilla puede apagarlas');
 const muchos='x\ty\n'+Array.from({length:60},(_,i)=>i+'\t'+Math.sin(i/6).toFixed(3)).join('\n');
 assert.equal(grafica(run,{data:muchos,kind:'linea'}),0,'un registro continuo no se llena de marcas');
 assert.equal(grafica(run,{data:muchos,kind:'linea',puntos:true}),60,'salvo que se pidan');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('The vertical axis reaches the data it is drawing',async()=>{const{dom,run,errors}=await editor();try{
 run("wsNueva();addSlide('content')");
 const ticks=(data)=>JSON.parse(run(`(()=>{const b=Object.assign(newBlock('chart'),{data:${JSON.stringify(data)},kind:'linea'});
   const g=renderChart(b,S.deck,'export',900);
   return JSON.stringify([...g.querySelectorAll('text')].map(t=>t.textContent))})()`));
 const t1=ticks('x\ty\n0\t0.01\n2\t0.25\n4\t0.49');
 assert.ok(t1.includes('0.5'),'el máximo 0.49 necesita un tick en 0.5, no quedarse en 0.4: '+JSON.stringify(t1));
 const t2=ticks('x\ty\n0\t-1\n1\t0\n2\t1');
 assert.ok(t2.includes('-1')&&t2.includes('1'),'los extremos también se rotulan: '+JSON.stringify(t2));
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('The left margin follows the tick labels instead of a fixed guess',async()=>{const{dom,run,errors}=await editor();try{
 run("wsNueva();addSlide('content')");
 /* El eje vertical se dibuja justo en el margen: su x dice cuánto se reservó. */
 const margen=data=>+run(`(()=>{const b=Object.assign(newBlock('chart'),{data:${JSON.stringify(data)},kind:'linea'});
   const g=renderChart(b,S.deck,'export',900);
   const ejes=[...g.querySelectorAll('line')].filter(l=>l.getAttribute('x1')===l.getAttribute('x2'));
   return Math.min(...ejes.map(l=>+l.getAttribute('x1')))})()`);
 const corto=margen('x\ty\n0\t0.01\n2\t0.25\n4\t0.49');
 const largo=margen('x\ty\n0\t1200\n2\t18400\n4\t35600');
 assert.ok(corto<largo,'«0,1» no necesita el mismo pasillo que «40000»: '+corto+' vs '+largo);
 assert.ok(corto>=46&&largo<=118,'el margen se queda dentro de los límites: '+corto+' y '+largo);
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Numbers in a table line up on the right, on screen and in Beamer',async()=>{const{dom,run,errors}=await editor();try{
 run(`wsNueva();addSlide('content');
  (()=>{const b=Object.assign(newBlock('table'),{header:true,rows:[['Condición','Respuesta','Naturaleza'],['Control','1.00','Ilustrativa'],['A','1.08','Ilustrativa'],['B','0.97','Ilustrativa']]});
   zona(S.deck.slides[S.cur],0).push(b);window.__t=b.id;commit()})()`);
 const clases=JSON.parse(run("JSON.stringify([...document.querySelectorAll('#stageInner table.btab tr')].map(tr=>[...tr.children].map(c=>c.classList.contains('num'))))"));
 assert.deepEqual(clases[0],[false,true,false],'solo la columna de cifras se alinea a la derecha');
 assert.deepEqual(clases[1],[false,true,false]);
 assert.match(run('toBeamer(S.deck)'),/\\begin\{tabular\}\{crc\}/,'la columna numérica va en r');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('A fit does not report a precision it does not have',async()=>{const{dom,run,errors}=await editor();try{
 assert.equal(run("conError(0.12, 1.6e-18)"),'0.12','el ruido de coma flotante no es una incertidumbre');
 assert.equal(run("conError(0.12, 0.004)"),'0.1200 ± 0.0040','una incertidumbre real sí se reporta');
 assert.equal(run("conError(1.5, 0)"),'1.5');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('The build ships its own tab icon',()=>{
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 assert.match(html,/<link rel="icon" href="data:image\/svg\+xml,/,'sin favicon incrustado cada carga deja un 404');
});

/* Una medida sin su incertidumbre es media medida, y la incertidumbre llega
   pegada a los datos: en la columna de al lado. Estas pruebas sostienen que
   esa columna no se dibuja como una serie más y que la barra que produce dice
   lo mismo en pantalla que en el PDF. */
const CON_ERROR = 'C\tAbsorbancia\t±\n0\t0.004\t0.002\n2\t0.118\t0.006\n4\t0.229\t0.009\n6\t0.347\t0.011\n8\t0.452\t0.015\n10\t0.571\t0.018';

test('A column of uncertainty is a bar, not one more series',async()=>{const{dom,run,errors}=await editor();try{
 run("wsNueva();addSlide('content')");
 const ss=JSON.parse(run(`JSON.stringify(chartSeries({type:'chart',data:${JSON.stringify(CON_ERROR)}}))`));
 assert.equal(ss.length,1,'«±» no es una serie: '+ss.map(s=>s.name).join(', '));
 assert.equal(ss[0].tieneError,true);
 assert.deepEqual(ss[0].pts[1],[2,0.118,0.006],'la barra viaja con su punto');
 /* Y al revés: una columna con nombre de magnitud sigue siendo una serie. En
    un laboratorio «E» es un potencial y «u» una velocidad. */
 const noSon=JSON.parse(run(`JSON.stringify(['E','u','s','Señal','Error estándar','sd','± A','desv'].map(esColumnaError))`));
 assert.deepEqual(noSon,[false,false,false,false,true,true,true,true]);
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('The error bar is drawn whole, on screen and in Beamer',async()=>{const{dom,run,errors}=await editor();try{
 run("wsNueva();addSlide('content')");
 const r=JSON.parse(run(`JSON.stringify((()=>{const b=Object.assign(newBlock('chart'),{data:${JSON.stringify(CON_ERROR)},kind:'dispersion'});
   const g=renderChart(b,S.deck,'export',900);
   const barras=[...g.querySelectorAll('g[stroke-width="1.6"]')];
   const tapas=barras.flatMap(x=>[...x.querySelectorAll('line')]).filter(l=>l.getAttribute('y1')===l.getAttribute('y2'));
   const ys=[...g.querySelectorAll('line')].map(l=>+l.getAttribute('y1'));
   return {barras:barras.length, tapas:tapas.length, arriba:Math.min(...ys), tex:chartToPgf(b,'')};})())`));
 assert.equal(r.barras,6,'una barra por medida');
 assert.equal(r.tapas,12,'y dos topes en cada barra');
 assert.ok(r.arriba>0,'ninguna barra se sale por arriba del marco: '+r.arriba);
 assert.match(r.tex,/error bars\/\.cd, y dir=both, y explicit/,'el PDF no declara las barras');
 assert.match(r.tex,/\(2,0\.118\) \+- \(0,0\.006\)/,'cada punto lleva su barra al PDF');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

/* En un eje logarítmico solo caben los positivos, la recta de un ajuste es la
   del logaritmo —la linealización de siempre— y las marcas van por décadas. */
const DECAE = 't\tc\n0\t100\n10\t61\n20\t37\n30\t22\n40\t14\n50\t8.2';

test('A logarithmic axis draws only what has a logarithm',async()=>{const{dom,run,errors}=await editor();try{
 run("wsNueva();addSlide('content')");
 const r=JSON.parse(run(`JSON.stringify((()=>{const b=Object.assign(newBlock('chart'),{data:'x\\ty\\n1\\t10\\n2\\t0\\n3\\t-5\\n4\\t1000',kind:'dispersion',logY:true});
   const g=renderChart(b,S.deck,'export',900);
   const esc=escalasChart(b,'dispersion',false);
   return {malos:g.outerHTML.includes('NaN'), marcas:g.querySelectorAll('path[fill]:not([fill="none"])').length,
     rotulos:[...g.querySelectorAll('text')].map(t=>t.textContent),
     vale:[[1,10],[2,0],[3,-5]].map(p=>esc.vale(p))};})())`));
 assert.equal(r.malos,false,'un logaritmo imposible no puede acabar en el atributo de un nodo');
 assert.equal(r.marcas,2,'el cero y el negativo no se dibujan; los otros dos sí');
 assert.deepEqual(r.vale,[true,false,false]);
 assert.ok(r.rotulos.includes('10')&&r.rotulos.includes('1000'),'el eje se rotula por décadas: '+JSON.stringify(r.rotulos));
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('On a log axis the fit is the fit of the log, in both outputs',async()=>{const{dom,run,errors}=await editor();try{
 run("wsNueva();addSlide('content')");
 const r=JSON.parse(run(`JSON.stringify((()=>{const b=Object.assign(newBlock('chart'),{data:${JSON.stringify(DECAE)},kind:'ajuste',logY:true});
   const g=renderChart(b,S.deck,'export',900);
   const pts=chartSeries(b)[0].pts;
   const enLog=linFit(pts.map(([x,y])=>[x,Math.log10(y)]));
   const crudo=linFit(pts);
   return {pendiente:enLog.m, crudo:crudo.m, texto:[...g.querySelectorAll('.ch-fit')].map(d=>d.textContent).join(' '),
     tex:chartToPgf(b,'')};})())`));
 assert.match(r.tex,/ymode=log/,'el PDF no pone el eje en logaritmo');
 const m=/\\log_\{10\} y = (-?[\d.]+)\\,x/.exec(r.tex);
 assert.ok(m,'el PDF no dice sobre qué se ajustó: '+r.tex.split('\n').filter(l=>l.includes('node')).join());
 assert.ok(Math.abs(+m[1]-r.pendiente)<1e-3,`el PDF ajusta ${m[1]} y la pantalla ${r.pendiente}`);
 assert.ok(Math.abs(r.pendiente-r.crudo)>1e-3,'la prueba no distingue: elige datos donde ajustar el log no sea lo mismo');
 assert.match(r.texto,/log/,'en pantalla la ecuación tiene que decir que es el logaritmo');
 /* La recta se emite como coordenadas: en el espacio del dibujo es recta, y
    así pgfplots traza exactamente la misma que se ve. */
 assert.ok(!/domain=.*samples=2/.test(r.tex),'una fórmula lineal sobre un eje log dibujaría otra curva');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Log and linear axes agree with the export on what is drawn',async()=>{const{dom,run,errors}=await editor();try{
 run("wsNueva();addSlide('content')");
 /* Donde no cabe el logaritmo tampoco se anuncia: en barras la barra sale del
    cero, y al apilar espectros el desplazamiento se suma sobre el eje. */
 const casos=JSON.parse(run(`JSON.stringify(['linea','dispersion','ajuste','barras'].map(k=>{
   const b=Object.assign(newBlock('chart'),{data:${JSON.stringify(DECAE)},kind:k,logY:true,logX:true});
   const esc=escalasChart(b,k,false);
   const tex=chartToPgf(b,'');
   return {k,logY:esc.logY,logX:esc.logX,tex:/ymode=log/.test(tex)&&/xmode=log/.test(tex)};}))`));
 for(const c of casos){
  assert.equal(c.tex,c.logY&&c.logX,`«${c.k}»: la pantalla y el PDF no coinciden en la escala`);
  if(c.k==='barras') assert.equal(c.logY,false,'una barra en eje logarítmico no tiene dónde empezar');
 }
 const apilado=run(`escalasChart({logY:true},'linea',true).logY`);
 assert.equal(apilado,false,'al apilar espectros el desplazamiento vive en el eje: no puede ser logarítmico');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

/* Rótulos de picos (los pone marcar_picos del MCP): en pantalla, cada uno
   sobre su punto y con su serie; en pgfplots, un \draw con su nodo. Datos
   sintéticos. */
test('Peak labels sit on their measured point, on screen and in pgfplots',async()=>{const{dom,run,errors}=await editor();try{
 run("wsNueva();addSlide('content')");
 const data='x\tA\tB\n1\t0\t5\n2\t10\t6\n3\t0\t5\n4\t2\t9\n5\t0\t5';
 const r=JSON.parse(run(`(()=>{const b=Object.assign(newBlock('chart'),{data:${JSON.stringify(data)},kind:'linea',
   picos:[{x:2,y:10,serie:0,txt:'(003)'},{x:4,y:9,serie:1,txt:'4.0'}]});
   const g=renderChart(b,S.deck,'export',900);
   const picos=[...g.querySelectorAll('g.pico')].map(p=>({t:p.querySelector('text').textContent,x:+p.querySelector('line').getAttribute('x1')}));
   const hueco=renderChart(Object.assign({},b,{_picosHueco:true}),S.deck,'export',900);
   const capas=renderChart(Object.assign({},b,{capas:true}),S.deck,'export',900);
   return JSON.stringify({picos,pgf:chartToPgf(b,''),
     recortado:[...g.querySelectorAll('g.pico')].some(p=>p.closest('[clip-path]')),
     marco:[g,hueco].map(x=>x.querySelector('clipPath rect').getAttribute('y')),
     enHueco:hueco.querySelectorAll('g.pico').length,
     porCapas:[...capas.querySelectorAll('g.capa')].map(c=>c.querySelectorAll('g.pico').length)})})()`));
 assert.deepEqual(r.picos.map(p=>p.t),['(003)','4.0']);
 assert.ok(r.picos[0].x<r.picos[1].x,'de izquierda a derecha, en su x');
 assert.equal(r.recortado,false,'la franja de los rótulos no se recorta con el marco');
 assert.equal(r.marco[0],r.marco[1],'el «después» deja el mismo hueco: el marco no salta');
 assert.equal(r.enHueco,0,'y no rotula picos que sus datos no tienen');
 assert.deepEqual(r.porCapas,[1,1],'por capas, cada rótulo entra con su serie');
 assert.match(r.pgf,/\\draw\[serieA, line width=\.4pt\] \(axis cs:2,10\) \+\+\(0,2pt\) -- \+\+\(0,5pt\) node\[anchor=south, font=\\tiny, inner sep=1pt\] \{\(003\)\};/);
 assert.match(r.pgf,/\\draw\[serieB[^\n]*\(axis cs:4,9\)/);
 assert.match(r.pgf,/clip mode=individual/);
 /* saneaDeck conserva los rótulos válidos y descarta los que no tienen dónde ir. */
 const s=JSON.parse(run(`(()=>{const d=deepCopy(S.deck);const b=Object.assign(newBlock('chart'),{picos:[{x:1,y:2,txt:'a'},{x:'z',y:1},'nada']});
   zona(d.slides[1],0).push(b);return JSON.stringify(saneaDeck(d).deck.slides[1].blocks.find(x=>x.type==='chart').picos)})()`));
 assert.deepEqual(s,[{x:1,y:2,serie:0,txt:'a'}]);
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

/* Espectros apilados con el eje invertido (FTIR): el nombre de cada curva va
   al final visible, a la derecha, no fuera del marco, aunque los datos
   vengan en x ascendente. */
test('Stacked series names stay inside the frame with a reversed axis',async()=>{const{dom,run,errors}=await editor();try{
 run("wsNueva();addSlide('content')");
 const data='x\tuno\tdos\n'+Array.from({length:40},(_,i)=>(400+i*90)+'\t'+(90-i%7)+'\t'+(80-i%5)).join('\n');
 const r=JSON.parse(run(`(()=>{const b=Object.assign(newBlock('chart'),{data:${JSON.stringify(data)},kind:'linea',offset:true,invertirX:true});
   const g=renderChart(b,S.deck,'export',900);const W=+g.querySelector('svg').getAttribute('viewBox').split(' ')[2];
   const t=[...g.querySelectorAll('text')].filter(x=>x.textContent==='uno'||x.textContent==='dos').map(x=>+x.getAttribute('x'));
   return JSON.stringify({t,W})})()`));
 assert.equal(r.t.length,2);
 assert.ok(r.t.every(x=>x>r.W*0.6),'los nombres, a la derecha: '+JSON.stringify(r));
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});
