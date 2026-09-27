import test from 'node:test';import assert from 'node:assert/strict';import {editor} from '../herramientas/test-browser.mjs';

/* La gráfica dinámica: una fórmula con deslizadores. Lo que se comprueba es
   lo que un químico notaría en la sala: que un polo no se una con una raya,
   que un escalón empinado no salga con esquinas, que el deslizador de un
   parámetro que abarca décadas se pueda mover y que el PDF diga lo mismo. */
const J=(run,s)=>JSON.parse(run(`JSON.stringify(${s})`));

test('The formula parser says where it got stuck',async()=>{const{dom,run,errors}=await editor();try{
 assert.deepEqual(J(run,"exprTry('A*exp(-Ea/(R*x)')"),{error:'falta «)»',pos:15},'el paréntesis que falta, al final');
 assert.equal(J(run,"exprTry('2 $ 3')").pos,2,'el carácter extraño');
 assert.equal(J(run,"exprTry('1 + foo(x)')").pos,4,'la función desconocida, donde empieza su nombre');
 assert.equal(J(run,"exprTry('gauss(x, 1)')").pos,0);
 assert.equal(J(run,"exprTry('(x+1))')").pos,5,'lo que sobra al final');
 assert.equal(J(run,"exprTry('x*')").pos,2,'la fórmula que termina antes de tiempo');
 assert.equal(run("exprTry('2x + sin(x)').fn({x:1})"),2+Math.sin(1),'las fórmulas buenas siguen igual');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('A pole is not joined across and does not flatten the curve',async()=>{const{dom,run,errors}=await editor();try{
 const r=J(run,`(()=>{const b=Object.assign(newBlock('func'),{curves:[{expr:'tan(x)',name:'tan'}],params:[],xmin:-5,xmax:5});
  const s=chartSeries(b);const g=renderChart(b,S.deck,'export',900);
  const d=[...g.querySelectorAll('path[fill="none"]')].map(p=>p.getAttribute('d')).join('');
  return {cortes:s[0].cortes,rango:s.rangoY,trazos:(d.match(/M/g)||[]).length,
   ticks:[...g.querySelectorAll('text')].map(t=>t.textContent)}})()`);
 assert.equal(r.cortes,4,'tan x tiene cuatro polos en [-5, 5] (±π/2, ±3π/2)');
 assert.ok(r.trazos>=4,'el trazo se corta en cada polo: '+r.trazos+' tramos');
 assert.ok(r.rango[0]>-40&&r.rango[1]<40&&r.rango[1]>3,'el eje lo fija la parte normal de la curva, no el 10¹⁶ del polo: '+r.rango);
 assert.ok(!r.ticks.some(t=>/10/.test(t)&&/\d{2,}/.test(t)&&t.length>4),'sin rótulos gigantes: '+r.ticks);
 /* Una función continua y empinada no es un polo. */
 const f=J(run,`(()=>{const b=Object.assign(newBlock('func'),{curves:[{expr:'1/(exp((x-EF)/(kB*T/eV))+1)',name:'f'}],
  params:[{name:'EF',value:0,min:-1,max:1,step:0.05},{name:'T',value:10,min:10,max:2000,step:10}],xmin:-0.5,xmax:0.5});
  const s=chartSeries(b);return {cortes:s[0].cortes,rango:s.rangoY||null,medio:s[0].pts.filter(p=>p[1]>0.05&&p[1]<0.95).length,n:s[0].pts.length}})()`);
 assert.equal(f.cortes,0,'el escalón de Fermi a 10 K es continuo');
 assert.equal(f.rango,null);
 assert.ok(f.medio>=4,'la subida se resuelve con puntos, no con una esquina: '+f.medio);
 assert.ok(f.n<=900,'y el refinado tiene tope: '+f.n);
 /* Una oscilación rápida agota el presupuesto de puntos, y aun así no se corta. */
 const osc=J(run,`(()=>{const s=chartSeries(Object.assign(newBlock('func'),{curves:[{expr:'sin(50*x)',name:'s'}],params:[],xmin:0,xmax:12}));return {c:s[0].cortes,r:s.rangoY||null}})()`);
 assert.deepEqual(osc,{c:0,r:null},'sin(50x) es continua');
 /* Fuera del dominio (raíz de un negativo) la curva empieza donde empieza. */
 const q=J(run,`(()=>{const s=chartSeries(Object.assign(newBlock('func'),{curves:[{expr:'sqrt(x-0.3)',name:'r'}],params:[],xmin:0,xmax:1}));
  const ok=s[0].pts.filter(p=>isFinite(p[1]));return ok[0][0]})()`);
 assert.ok(q>=0.3&&q<0.301,'el primer punto válido está pegado al borde del dominio: '+q);
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('With a log x axis the samples are spread by decades',async()=>{const{dom,run,errors}=await editor();try{
 const n=+run(`chartSeries(Object.assign(newBlock('func'),{curves:[{expr:'log10(x)',name:'l'}],params:[],xmin:0.01,xmax:100,logX:true}))[0].pts.filter(p=>p[0]<0.1).length`);
 assert.ok(n>=40,'la primera de cuatro décadas se lleva su cuarta parte de puntos: '+n);
 /* Y el cursor de lectura en un eje log apunta al x correcto: no se prueba
    el ratón en JSDOM, pero el dibujo no puede fallar. */
 run(`renderChart(Object.assign(newBlock('func'),{curves:[{expr:'x^2',name:'y'}],params:[],xmin:0.01,xmax:100,logX:true,logY:true}),S.deck,'edit',900)`);
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Sliders: decades, units, reset and Greek names',async()=>{const{dom,run,errors}=await editor();try{
 assert.equal(+run("posDeslizador({value:1e10,min:1e6,max:1e14,log:true})"),500,'10¹⁰ cae en el centro de 10⁶–10¹⁴');
 assert.equal(+run("valorDeslizador({min:1e6,max:1e14,log:true},750)"),1e12);
 assert.equal(+run("posDeslizador({value:3,min:0,max:10,log:true})"),3,'sin extremos positivos no hay escala log');
 assert.equal(+run("pasoParam(0,0.001)"),0.000005);
 assert.equal(+run("pasoParam(10,150)"),1);
 assert.equal(+run("pasoConservado(1,1,5)"),1,'el orden de una reflexión sigue yendo de uno en uno');
 assert.equal(+run("pasoConservado(1,0.1,1)"),0.005,'pero un paso que no cabe en el recorrido se recalcula');
 assert.equal(run("texParam('lam')"),'\\lambda');
 assert.equal(run("texParam('theta0')"),'\\theta_{0}');
 assert.equal(run("texParam('q_m')"),'q_{\\mathrm{m}}');
 assert.equal(run("texParam('Ea')"),'\\mathrm{Ea}','lo de antes sigue igual');
 run(`wsNueva();addSlide('content');(()=>{const b=Object.assign(newBlock('func'),bloqueDesdeModelo(FUNC_MODELS.find(m=>m.id==='arrhenius')));
  zona(S.deck.slides[S.cur],0).push(b);window.__f=b;commit()})()`);
 const s=J(run,`(()=>{const r=[...document.querySelectorAll('#stageInner .sliders input[type=range]')];
  return {max:r.map(x=>x.max),uni:[...document.querySelectorAll('#stageInner .sl-unit')].map(u=>u.textContent.replace(/\\s+/g,' ')),
   reset:!!document.querySelector('#stageInner .sl-reset'),aria:r[0].getAttribute('aria-valuetext')}})()`);
 assert.deepEqual(s.max,['1000','150'],'A va por décadas y Ea es lineal');
 assert.equal(s.uni.length,2,'cada valor lleva su unidad');
 assert.ok(s.reset);
 assert.match(s.aria,/10.*s/,'el lector de pantalla oye el valor con su unidad: '+s.aria);
 run(`(()=>{const r=document.querySelector('#stageInner .sliders input[type=range]');r.value=750;r.dispatchEvent(new Event('input'))})()`);
 assert.equal(+run('__f.params[0].value'),1e12,'mover el deslizador log cambia A por décadas');
 run(`document.querySelector('#stageInner .sl-reset').click()`);
 assert.equal(+run('__f.params[0].value'),1e10,'«↺» vuelve al valor con que se abrió');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('The ready-made models are complete and their formulas are right',async()=>{const{dom,run,errors}=await editor();try{
 const ms=J(run,`FUNC_MODELS.map(m=>{const b=Object.assign(newBlock('func'),bloqueDesdeModelo(m));
  const usados=new Set();(m.curves||[]).forEach(c=>{const r=exprTry(c.expr);if(r&&r.vars)r.vars.forEach(v=>usados.add(v))});usados.delete('x');
  const s=chartSeries(b);
  return {id:m.id,n:m.n,x:!!(m.x&&m.x.d),y:!!(m.y&&m.y.d),nota:!!m.nota,usados:[...usados].sort(),params:m.params.map(p=>p.name).sort(),
   recortada:s.some(q=>q.recortada||q.cortes),dentro:m.params.every(p=>p.value>=p.min&&p.value<=p.max&&p.d),finitos:s.map(q=>q.pts.filter(p=>isFinite(p[1])).length),errores:s.filter(q=>q.error).length}})`);
 assert.ok(ms.length>=17,'modelos: '+ms.length);
 assert.equal(new Set(ms.map(m=>m.id)).size,ms.length,'los id no se repiten');
 for(const m of ms){
  assert.ok(m.x&&m.y&&m.nota,m.id+': dice qué es cada eje y sus supuestos');
  assert.deepEqual(m.usados,m.params,m.id+': cada símbolo de la fórmula es un parámetro, y al revés');
  assert.ok(m.dentro,m.id+': cada valor cabe en su deslizador y dice qué es');
  assert.equal(m.errores,0,m.id);
  assert.equal(m.recortada,false,m.id+': una curva regular se dibuja entera, sin cortes ni eje recortado');
  assert.ok(m.finitos.every(n=>n>150),m.id+': la curva se evalúa en todo el intervalo: '+m.finitos);
 }
 /* Números que se pueden comprobar a mano. */
 const ev=(id,i,x,cambia)=>+run(`(()=>{const m=FUNC_MODELS.find(q=>q.id===${JSON.stringify(id)});const v={x};
  m.params.forEach(p=>v[p.name]=p.value);Object.assign(v,${JSON.stringify(cambia||{})});return exprCompile(m.curves[${i}].expr).fn(v)})()`.replace('{x}','{x:'+x+'}'));
 const cerca=(a,b,tol,msg)=>assert.ok(Math.abs(a-b)<=tol,msg+': '+a+' frente a '+b);
 cerca(ev('bragg',0,11.6),0.15406/(2*Math.sin(5.8*Math.PI/180)),1e-9,'Bragg: d = λ/(2 sen θ) con θ = 2θ/2');
 cerca(ev('bragg',0,11.6),0.7622,1e-3,'un pico en 11.6° con Cu Kα son 7.6 Å');
 cerca(ev('scherrer',0,20),0.9*0.15406/(20*Math.cos(5.8*Math.PI/180))*180/Math.PI,1e-12,'Scherrer en grados');
 const w=1.3;
 cerca(ev('perfiles-linea',0,w/2,{w}),0.5,2e-4,'la gaussiana vale ½ a medio FWHM');
 cerca(ev('perfiles-linea',1,w/2,{w}),0.5,1e-12,'la lorentziana también: mismo FWHM');
 cerca(ev('perfiles-linea',2,w/2,{w}),0.5,2e-4,'y el pseudo-Voigt');
 cerca(ev('michaelis-menten',0,5),50,1e-12,'v = Vmax/2 en [S] = Km');
 cerca(ev('segundo-orden',0,4),0.5,1e-12,'2.º orden: t½ = 1/(k[A]₀) = 4 min');
 cerca(ev('primer-orden',0,Math.log(2)/0.25),0.5,1e-12,'1.er orden: t½ = ln 2/k');
 cerca(ev('langmuir',0,20),60,1e-9,'Langmuir: qm/2 en Ce = 1/KL');
 cerca(ev('freundlich',0,32,{KF:10,n:5}),20,1e-9,'Freundlich: 10·32^(1/5) = 20');
 cerca(ev('cinetica-adsorcion',1,1/(0.001*100)),50,1e-9,'pseudo-2.º orden: qt = qe/2 en t = 1/(k₂qe)');
 cerca(ev('vant-hoff',0,400,{dH:-20,dS:-50}),Math.exp(20000/(8.314462618*400)-50/8.314462618),1e-12,"Van 't Hoff");
 cerca(Math.log(ev('arrhenius',0,350)),ev('arrhenius-lineal',0,1000/350),1e-9,'la forma lineal es el logaritmo de la otra');
 cerca(ev('tauc',0,3),0,0,'Tauc: sin absorción por debajo de Eg');
 cerca(ev('tauc',0,4.2),1e5*Math.pow(1,0.5)/4.2,1e-6,'Tauc: α = B(hν − Eg)^r/hν');
 cerca(ev('fermi-dirac',0,0),0.5,1e-12,'f(EF) = ½');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Beamer draws the same dynamic graph as the screen',async()=>{const{dom,run,errors}=await editor();try{
 const tex=run(`(()=>{const b=Object.assign(newBlock('func'),{curves:[{expr:'tan(x)',name:'tan'}],params:[],xmin:-5,xmax:5});return chartToPgf(b,'')})()`);
 assert.match(tex,/unbounded coords=jump/);
 assert.match(tex,/\(-?[\d.]+,nan\)/,'los polos se escriben como cortes');
 assert.match(tex,/xmin=-5,\s*xmax=5/,'el intervalo elegido, no el que deduzca pgfplots');
 const ys=[...tex.matchAll(/\((-?[\d.e+-]+),(-?[\d.e+-]+)\)/g)].map(m=>+m[2]);
 assert.ok(ys.length>200,'los puntos refinados no se diezman: '+ys.length);
 assert.ok(Math.max(...ys.map(Math.abs))<200,'nada de 10¹⁶ que haga fallar a TeX: '+Math.max(...ys.map(Math.abs)));
 const [,y0,y1]=tex.match(/ymin=(-?[\d.]+),\s*ymax=(-?[\d.]+)/)||[];
 assert.ok(+y0<-3&&+y1>3&&+y1<40,'el rango y es el de la pantalla: '+y0+'…'+y1);
 const fijo=run(`chartToPgf(Object.assign(newBlock('func'),{yminAuto:false,ymin0:0,ymax0:2}),'')`);
 assert.match(fijo,/ymin=0,\s*ymax=2/,'el eje Y fijado a mano llega al papel');
 const conUnidades=run(`(()=>{wsNueva();addSlide('content');const b=Object.assign(newBlock('func'),bloqueDesdeModelo(FUNC_MODELS.find(m=>m.id==='arrhenius')));
  zona(S.deck.slides[S.cur],0).push(b);return toBeamer(S.deck)})()`);
 assert.match(conUnidades,/con A = 10000000000 s⁻¹, Ea = 60 kJ mol⁻¹/,'el comentario dice los valores con sus unidades');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Dynamic graphs saved before these changes still work',async()=>{const{dom,run,errors}=await editor();try{
 /* Un bloque v1 tal cual: sin unit, log ni tex en los parámetros. */
 const viejo={id:'f1',type:'func',curves:[{expr:'A*exp(-Ea*1000/(R*x))',name:'k(T)'}],params:[{name:'A',value:1e10,min:1e8,max:1e12,step:1e8},{name:'Ea',value:60,min:10,max:150,step:1}],
  xmin:280,xmax:500,xlabel:'Temperatura $T$ (K)',ylabel:'$k$ (s$^{-1}$)',title:'',w:78,ar:0.52,grid:true,legend:true,sliders:true,anim:'draw'};
 const r=J(run,`(()=>{wsNueva();addSlide('content');const b=${JSON.stringify(viejo)};zona(S.deck.slides[S.cur],0).push(b);commit();
  const r=[...document.querySelectorAll('#stageInner .sliders input[type=range]')];
  return {max:r.map(x=>x.max),uni:document.querySelectorAll('#stageInner .sl-unit').length,tex:/addplot/.test(toBeamer(S.deck)),puntos:chartSeries(b)[0].pts.length}})()`);
 assert.deepEqual(r.max,['1000000000000','150'],'sin «log», el deslizador sigue siendo lineal');
 assert.equal(r.uni,0);
 assert.ok(r.tex&&r.puntos>200);
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});
