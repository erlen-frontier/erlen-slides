// SPDX-License-Identifier: MIT
/* Copyright (c) 2026 Erlen contributors
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
/* Mey, la mascota de Erlen (docs/MARCA.md del portal), en pixel art. Fuente única de sus
   poses: el portal genera con ella web/recursos/mey/*.svg y el favicon (herramientas/mey.mjs)
   y las apps la usan para pintar a Mey en su interfaz (por ejemplo, en los estados vacíos de
   diseno/suite-inicio.mjs). No importa nada: también se sirve como IIFE (const erlenMey).

   mey('hola')                    → '<svg class="erlen-mey" …>' decorativo (aria-hidden)
   mey('pensando', {titulo:'…'})  → con role="img" y <title>, si la pose informa por sí sola
   mey('hola', {tile:true})       → el ícono: 16×16 sobre el tile violeta
   mey.poses                      → ['hola', 'pensando', …]

   Cada pose es una cuadrícula de 16×14 celdas. Leyenda: g vidrio · w líquido, brazos y patas
   · e ojos y trazos en tinta · x acento · p papel · . vacío. La boca es el menisco: el
   líquido sube por las paredes y deja una sonrisa; en «aviso» sube por el centro (ceño).
   Los colores son los de la marca, fijos en claro y en oscuro: con tokens, en oscuro el
   líquido tomaría el color del vidrio y Mey perdería la boca. Se muestra en múltiplos de
   16 px de ancho para que los píxeles salgan parejos. */
const COLOR_MEY={g:'#83d4ad',w:'#177451',e:'#18171b',x:'#59368b',p:'#fdfdfd',r:'#e4007c',n:'#f29d0a',a:'#94621e'};
const TILE_MEY='#59368b';
const POSES_MEY={
 hola: `
................
................
.....gggggg.....
......gggg......
......gggg......
.....gggggg.....
....gggggggg....
....geggggeg.ww.
...ggeggggeggw..
...ggggggggggw..
.wwwwggggggww...
...wwwwggwwww...
...wwwwwwwwww...
....ww....ww....`,
 pensando: `
.............g..
...........g....
.....gggggg.....
......gggg......
......gggg......
.....gggggg.....
....ggeggge.....
....ggegggeg....
...gggggggggg...
...ggggggggggw..
.wwwwggwwggwwww.
...wwwwwwwwww...
...wwwwwwwwww...
....ww....ww....`,
 exito: `
..............x.
.x...gggggg..xxx
xxx...gggg....x.
.x....gggg......
.....gggggg.....
.w..gggggggg..w.
..w.geggggeg.w..
..wgegeggegegw..
...gggggggggg...
...wwggggggww...
...wwwwggwwww...
...wwwwwwwwww...
.....w....w.....
................`,
 aviso: `
................
..............w.
.....gggggg..ww.
......gggg......
......gggg......
.....geggeg.....
....gggggggg....
.w..geggggeg..w.
.wwggeggggeggww.
...gggggggggg...
...gggwwwwggg...
...gwwwwwwwwg...
...wwwwwwwwww...
....ww....ww....`,
 dormido: `
............xxx.
.............x..
.....gggggg.xxx.
......gggg......
......gggg......
.....gggggg.....
....gggggggg....
....gggggggg....
...geeggggeeg...
...gggggggggg...
...gggggggggg...
.wwwwwwwwwwwwww.
...wwwwwwwwww...
...www....www...`,

 leyendo: `
................
................
.....gggggg.....
......gggg......
......gggg......
.....gggggg.....
....gggggggg....
....gggggggg....
...ggeggggegg...
...ggeggggegg...
.wxppppxxppppxw.
..xxxxxxxxxxxx..
...wwwwwwwwww...
....ww....ww....`,
 midiendo: `
............xxx.
............xpx.
.....gggggg.xpx.
......gggg..xpx.
......gggg..xpx.
.....gggggg.xxx.
....ggegggeg.x..
....ggegggeg.w..
...ggggggggggw..
...gggggggggg...
.wwwwggggggww...
...wwwwggwwww...
...wwwwwwwwww...
....ww....ww....`,
 graficando: `
................
...........e....
.....gggggge.x..
......gggg.e.x..
......gggg.ewxw.
.....ggggggewxw.
....gggggggeeeee
....geggggeg..w.
...ggeggggeggw..
...gggggggggg...
.wwwwggggggww...
...wwwwggwwww...
...wwwwwwwwww...
....ww....ww....`
};

/* La cuadrícula de trabajo lleva ALTO_MEY filas libres encima de la pose (16×18): ahí caben el
   sombrero de charro, el papel picado y las burbujas. Si nada las ocupa, el SVG sale a 16×14 y
   es idéntico al de siempre. */
const ALTO_MEY=4;
const vacia=()=>Array(16).fill('.');

function filasMey(pose){
 const arte=POSES_MEY[pose];
 if(arte===undefined)throw new Error('mey: pose desconocida: '+pose);
 return arte.trim().split('\n').map(f=>f.split(''));
}

function celdasMey(filas,dy){
 let r='';
 filas.forEach((fila,y)=>{
  if(fila.length!==16)throw new Error('mey: la fila '+y+' mide '+fila.length+', no 16');
  for(let x=0;x<16;){
   const c=fila[x];
   if(c==='.'){x++;continue;}
   if(!COLOR_MEY[c])throw new Error('mey: celda desconocida «'+c+'» en ('+x+','+y+')');
   let n=1;
   while(x+n<16&&COLOR_MEY[fila[x+n]]===COLOR_MEY[c])n++;
   r+='<rect x="'+x+'" y="'+(y+dy)+'" width="'+n+'" height="1" fill="'+COLOR_MEY[c]+'"/>';
   x+=n;
  }
 });
 return r;
}

function accesibleMey(opciones){
 const titulo=opciones.titulo?String(opciones.titulo).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])):'';
 return titulo?'role="img" aria-label="'+titulo+'"><title>'+titulo+'</title>':'aria-hidden="true" focusable="false">';
}

/* filas: cuadrícula de trabajo de 18 filas. alto: true fuerza el lienzo de 16×18 (Mey viva, para
   que no salte de tamaño cuando aparece el papel picado). */
function svgMey(filas,pose,atuendo,opciones,alto){
 const arriba=alto||filas.slice(0,ALTO_MEY).some(f=>f.some(c=>c!=='.'));
 const vista=arriba?'0 -'+ALTO_MEY+' 16 '+(14+ALTO_MEY):'0 0 16 14';
 // Con opciones.celda, tamaño en píxeles enteros por celda (el pixel art no se emborrona).
 const tam=opciones.celda?' width="'+16*opciones.celda+'" height="'+(arriba?14+ALTO_MEY:14)*opciones.celda+'"':'';
 const celdas=arriba?celdasMey(filas,-ALTO_MEY):celdasMey(filas.slice(ALTO_MEY),0);
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+vista+'"'+tam+' shape-rendering="crispEdges" class="erlen-mey" data-pose="'+pose+'"'+(atuendo!=='ninguno'?' data-atuendo="'+atuendo+'"':'')+' '+accesibleMey(opciones)+celdas+'</svg>';
}

/* ---------- Atuendos ----------
   Mey se viste con un toque mexicano. «rebozo» es su ropa de todos los días; los demás son
   disfraces para ocasiones. Cada prenda se coloca buscando en la pose el tapón (corrida de 6
   celdas de vidrio sobre un cuello de 4), el paso del cuello al cuerpo y los ojos, así sirve
   para todas las poses. Solo pinta sobre vidrio o vacío: nunca tapa ojos ni utilería. */
const ATUENDOS_MEY=['rebozo','gala','charro','luchador','ninguno'];
const PAPEL_PICADO_MEY=['eeeeeeeeeeeeeeee','rrr.nnn.xxx.rrr.','r.r.n.n.x.x.r.r.','.r...n...x...r..'];

function corridaMey(fila,patron=/g+/){const m=fila.join('').match(patron);return m?{a:m.index,b:m.index+m[0].length-1,n:m[0].length}:null;}
function tapaMey(f){
 for(let y=0;y<f.length-1;y++){const c=corridaMey(f[y]),d=corridaMey(f[y+1]);if(c&&d&&c.n===6&&d.n===4&&d.a===c.a+1)return {y,a:c.a,b:c.b};}
 return null;
}
function cuelloMey(f,t){
 for(let y=t.y+1;y<f.length-1;y++){const c=corridaMey(f[y]),d=corridaMey(f[y+1],/[ge]+/);if(c&&d&&c.n===4&&d.n>=6&&d.a<c.a)return {y:y+1,a:c.a-1};}
 return null;
}

// Ojos «de cara»: tinta con vidrio a ambos lados en su fila (así los ejes del gráfico no cuentan).
function caraMey(f,y0,y1){
 const celdas=[];
 for(let y=Math.max(0,y0);y<=Math.min(f.length-1,y1);y++){const s=f[y].join('');for(let x=0;x<16;x++)if(s[x]==='e'&&s.slice(0,x).includes('g')&&s.slice(x+1).includes('g'))celdas.push({x,y});}
 return celdas;
}

function vestirMey(f,atuendo,e,ojos){
 if(!atuendo||atuendo==='ninguno')return;
 if(!ATUENDOS_MEY.includes(atuendo))throw new Error('mey: atuendo desconocido: '+atuendo);
 const t=tapaMey(f);if(!t)return;
 const k=cuelloMey(f,t);
 const pon=(x,y,c,sobre)=>{if(f[y]&&x>=0&&x<16&&sobre.includes(f[y][x]))f[y][x]=c;};
 if((atuendo==='rebozo'||atuendo==='gala')&&k){
  ['r','n','p','x','n','r'].forEach((c,i)=>pon(k.a+i,k.y,c,'g'));
  pon(k.a+5,k.y+1,'r','g.');
  pon(k.a+6,e.salto||e.saludo?k.y+1:k.y+2,'n','.');
 }
 if(atuendo==='gala'){
  const cx=t.b+1,cy=t.y-1;
  for(const [x,y] of [[cx,cy-1],[cx-1,cy],[cx+1,cy],[cx,cy+1]])pon(x,y,'n','.');
  pon(cx,cy,'a','.');
 }
 if(atuendo==='charro'){
  for(let x=t.a-3;x<=t.b+3;x++)pon(x,t.y-1,'e','.');
  pon(t.a-1,t.y-1,'n','e');pon(t.b+1,t.y-1,'n','e');
  pon(t.a-3,t.y-2,'e','.');pon(t.b+3,t.y-2,'e','.');
  for(let x=t.a;x<=t.b;x++)pon(x,t.y-2,'n','.');
  for(let x=t.a;x<=t.b;x++)pon(x,t.y-3,'e','.');
  for(let x=t.a+1;x<=t.b-1;x++)pon(x,t.y-4,'e','.');
  for(let x=t.a+2;x<=t.b-2;x++)pon(x,t.y-5,'e','.');
  if(k){['r','r','n','n','r','r'].forEach((c,i)=>pon(k.a+i,k.y,c,'g'));pon(k.a,k.y+1,'r','g');pon(k.a+5,k.y+1,'r','g');}
  // Bigote de charro: una fila de aire bajo los ojos, sobre el menisco, con las puntas hacia arriba.
  const cara=k?caraMey(f,k.y,k.y+5):[];
  if(cara.length){
   const lx=Math.min(...cara.map(o=>o.x)),rx=Math.max(...cara.map(o=>o.x)),yb=Math.max(...cara.map(o=>o.y));
   for(let x=lx;x<=rx;x++)pon(x,yb+2,'e','g');
   pon(lx-1,yb+1,'e','g');pon(rx+1,yb+1,'e','g');
  }
 }
 if(atuendo==='luchador'&&k){
  // Máscara de luchador: rosa mexicano del cuello a debajo de los ojos, ribete cempasúchil
  // alrededor de cada ojo y franja blanca al centro de la frente.
  const cara=caraMey(f,k.y,k.y+5);
  const yb=cara.length?Math.max(...cara.map(o=>o.y))+1:k.y+4,arriba=cara.length?Math.min(...cara.map(o=>o.y)):k.y+2;
  const cercaDeOjo=(x,y)=>cara.some(o=>Math.abs(o.x-x)+Math.abs(o.y-y)===1);
  for(let y=k.y;y<=yb;y++)for(let x=0;x<16;x++)if(f[y][x]==='g')f[y][x]=cercaDeOjo(x,y)?'n':(y<arriba&&(x===k.a+2||x===k.a+3)?'p':'r');
 }
}

function papelPicadoMey(f){PAPEL_PICADO_MEY.forEach((fila,y)=>{for(let x=0;x<16;x++)if(fila[x]!=='.'&&f[y][x]==='.')f[y][x]=fila[x];});}

export function mey(pose='hola',opciones={}){
 if(opciones.tile)return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" class="erlen-mey" data-pose="'+pose+'" '+accesibleMey(opciones)+'<rect width="16" height="16" rx="3.5" fill="'+TILE_MEY+'"/><g shape-rendering="crispEdges">'+celdasMey(filasMey(pose),1)+'</g></svg>';
 const atuendo=opciones.atuendo||'rebozo';
 const fiesta=pose==='exito'&&opciones.papelPicado!==false;
 return svgMey(cuadroMey(pose,{},atuendo,fiesta),pose,atuendo,opciones,false);
}
mey.poses=Object.keys(POSES_MEY);
mey.atuendos=ATUENDOS_MEY;

/* ---------- Mey viva ----------
   Cada cuadro sale de la pose por transformaciones de la cuadrícula, no de dibujos aparte:
   mirar (los ojos de 1×2 se mueven una celda dentro del vidrio), parpadear o guiñar (el ojo
   pierde su celda de arriba), saltar (todo sube una fila), chapotear (el menisco se inclina),
   saludar (la mano sube), soltar una burbuja por el cuello y, al celebrar, papel picado.
   Pixel art de verdad: cambios de cuadro, sin interpolar. Filas en coordenadas de la pose. */
const CHAPOTEO_MEY={hola:{izq:{10:'.wwwwwggggggw...',11:'...wwwwwggwww...'},der:{10:'.wwwggggggwww...',11:'...wwwggwwwww...'}}};
const SALUDO_MEY={hola:[[14,7,'.'],[14,6,'w']]};

function ojosMey(filas){
 const ojos=[];
 for(let y=1;y<filas.length-1;y++)for(let x=0;x<16;x++)if(filas[y][x]==='e'&&filas[y+1][x]==='e'&&filas[y-1][x]!=='e')ojos.push({x,y});
 return ojos;
}

function cuadroMey(pose,e,atuendo,fiesta){
 const f=[...Array.from({length:ALTO_MEY},vacia),...filasMey(pose)];
 if(e.saludo)for(const [x,y,c] of SALUDO_MEY[pose]||[])f[y+ALTO_MEY][x]=c;
 const ch=e.chapoteo&&CHAPOTEO_MEY[pose]?.[e.chapoteo];
 if(ch)for(const [y,fila] of Object.entries(ch))f[+y+ALTO_MEY]=fila.split('');
 const ojos=ojosMey(f);
 if(e.mirada&&(e.mirada.dx||e.mirada.dy)){
  const {dx,dy}=e.mirada;
  const cabe=ojos.every(({x,y})=>[y+dy,y+dy+1].every(yy=>{const c=f[yy]?.[x+dx];return c==='g'||c==='e';}));
  if(cabe){
   for(const {x,y} of ojos){f[y][x]='g';f[y+1][x]='g';}
   for(const o of ojos){o.x+=dx;o.y+=dy;f[o.y][o.x]='e';f[o.y+1][o.x]='e';}
  }
 }
 if(e.parpadeo){
  const orden=[...ojos].sort((a,b)=>a.x-b.x);
  for(const [i,o] of orden.entries())if(e.parpadeo==='ambos'||(e.parpadeo==='guino'&&i===orden.length-1))f[o.y][o.x]='g';
 }
 vestirMey(f,atuendo,e,ojos);
 if(fiesta||e.fiesta)papelPicadoMey(f);
 if(e.burbuja!==null&&e.burbuja!==undefined){
  const y=ALTO_MEY+1-e.burbuja;
  if(y>=0&&f[y][9]==='.')f[y][9]='g';
 }
 if(e.salto){f.shift();f.push(vacia());}
 return f;
}

/* ---------- Mey en cada app: lugares y perfiles ----------
   Un «lugar» es el tipo de espacio que la app le da a Mey. Fija la pose por defecto, cuánto se
   mueve y entre qué tamaños elige (en píxeles por celda: el ancho es 16 celdas). El perfil de la
   app pone la pose de «trabajo» (Notes lee, Spreadsheets mide, Figures grafica…). Así cada app
   solo dice dónde va Mey y ella decide el resto; las mejoras de aquí llegan a todas. */
const LUGARES_MEY={
 bienvenida:{pose:'hola',energia:'completa',min:3,max:12,defecto:8},
 vacio:{pose:'dormido',energia:'completa',min:3,max:8,defecto:6},
 trabajo:{pose:null,energia:'calma',min:2,max:6,defecto:4},
 carga:{pose:'pensando',energia:'calma',min:2,max:6,defecto:4},
 exito:{pose:'exito',energia:'calma',min:2,max:8,defecto:4},
 error:{pose:'aviso',energia:'calma',min:2,max:8,defecto:4},
 barra:{pose:'hola',energia:'calma',min:1,max:3,defecto:2,eje:'alto'}
};
const PERFILES_MEY={
 slides:{trabajo:'hola'},notes:{trabajo:'leyendo'},documents:{trabajo:'leyendo'},lens:{trabajo:'leyendo'},
 methods:{trabajo:'leyendo'},learn:{trabajo:'leyendo'},research:{trabajo:'leyendo'},novelty:{trabajo:'leyendo'},
 spreadsheets:{trabajo:'midiendo'},doe:{trabajo:'midiendo'},
 figures:{trabajo:'graficando'},ftir:{trabajo:'graficando'},xrd:{trabajo:'graficando'},dft:{trabajo:'graficando'},
 pentagrama:{trabajo:'hola'}
};

/* Resuelve qué Mey toca: {pose, atuendo, energia, min, max, defecto, eje}. Lo explícito gana a
   lo del lugar, y lo del lugar a lo del perfil de la app. */
mey.resolver=function({lugar='bienvenida',app,pose,atuendo}={}){
 const l=LUGARES_MEY[lugar];
 if(!l)throw new Error('mey: lugar desconocido: '+lugar);
 const perfil=PERFILES_MEY[app]||{};
 const final=pose||l.pose||perfil.trabajo||'hola';
 filasMey(final);
 return {lugar,pose:final,atuendo:atuendo||perfil.atuendo||'rebozo',energia:l.energia,min:l.min,max:l.max,defecto:l.defecto,eje:l.eje||'ancho'};
};
mey.lugares=Object.keys(LUGARES_MEY);
mey.perfiles=Object.keys(PERFILES_MEY);

/* Píxeles por celda que caben en el espacio: el entero más grande dentro de [min, max]; sin
   medida (0), el tamaño por defecto del lugar. */
function celdaMey(espacio,filas,r){
 const c=Math.floor(espacio/(r.eje==='alto'?filas:16));
 return c>0?Math.max(r.min,Math.min(r.max,c)):r.defecto;
}

/* mey.montar(host, {lugar, app, pose, atuendo, energia, celda, vivo, ventana, reloj, aleatorio})
   pinta a Mey dentro de host (lienzo fijo de 16×18) y la anima según su energía:
   - completa: curiosa (parpadea, mira alrededor, sigue al puntero con los ojos) y traviesa
     (guiña, chapotea, saluda, suelta burbujas); al clic brinca y celebra con papel picado.
   - calma: solo parpadea; reacciona cuando la app se lo pide (reaccionar, pose).
   - quieta: no se mueve.
   Sin celda fija mide el host (ResizeObserver) y elige el tamaño que cabe; por debajo de 3 px
   por celda la energía baja a calma. Con prefers-reduced-motion: reduce, fuera de la vista o
   con la pestaña oculta no se mueve. Devuelve {pose(), atuendo(), reaccionar(), ajustar(),
   cuadro(), celda, activa, detener()}. */
mey.montar=function(host,opciones={}){
 const ventana=opciones.ventana||host.ownerDocument.defaultView;
 const doc=host.ownerDocument;
 const reloj=opciones.reloj||ventana;
 const azar=opciones.aleatorio||Math.random;
 const r=mey.resolver(opciones);
 let pose=r.pose,atuendo=r.atuendo;
 vestirMey(Array.from({length:18},vacia),atuendo,{},[]);
 const energiaPedida=opciones.energia||r.energia;
 if(!['completa','calma','quieta'].includes(energiaPedida))throw new Error('mey: energía desconocida: '+energiaPedida);
 const medir=()=>opciones.celda||celdaMey(r.eje==='alto'?host.clientHeight:host.clientWidth,14+ALTO_MEY,r);
 let celda=medir();
 const energia=()=>energiaPedida==='completa'&&celda<3?'calma':energiaPedida;
 const neutro=()=>({mirada:{dx:0,dy:0},parpadeo:false,salto:false,chapoteo:null,burbuja:null,saludo:false,fiesta:false});
 let e=neutro();
 let pintado='',temporizadores=new Set(),activo=false,ultimoPuntero=-Infinity,ocupada=false,visible=true;
 const ahora=()=>ventana.performance?.now?.()??Date.now();
 const pintar=()=>{const svg=svgMey(cuadroMey(pose,e,atuendo,false),pose,atuendo,{...opciones,celda},true);if(svg!==pintado){host.innerHTML=svg;pintado=svg;}};
 const poner=cambios=>{e={...e,...cambios};pintar();};
 const despues=(ms,fn)=>{const id=reloj.setTimeout(()=>{temporizadores.delete(id);if(activo)fn();},ms);temporizadores.add(id);return id;};
 const entre=(a,b)=>a+Math.floor(azar()*(b-a));
 const secuencia=(pasos,fin)=>{ocupada=true;let t=0;for(const [ms,cambios] of pasos){t+=ms;despues(t,()=>poner(cambios));}despues(t+1,()=>{ocupada=false;fin&&fin();});};
 const parpadeo=()=>{if(!ocupada)secuencia([[0,{parpadeo:'ambos'}],[140,{parpadeo:false}]]);despues(entre(2400,5200),parpadeo);};
 const curiosa=()=>{
  if(!ocupada&&ahora()-ultimoPuntero>2000)secuencia([[0,{mirada:{dx:-1,dy:0}}],[700,{mirada:{dx:1,dy:0}}],[700,{mirada:{dx:0,dy:-1}}],[500,{mirada:{dx:0,dy:0}}]]);
  despues(entre(3500,7000),curiosa);
 };
 const TRAVESURAS={
  guino:[[0,{parpadeo:'guino'}],[120,{salto:true}],[120,{salto:false}],[260,{parpadeo:false}]],
  chapoteo:[[0,{chapoteo:'izq'}],[160,{chapoteo:'der'}],[160,{chapoteo:'izq'}],[160,{chapoteo:'der'}],[160,{chapoteo:null}]],
  burbuja:[[0,{mirada:{dx:0,dy:-1},burbuja:0}],[220,{burbuja:1}],[220,{burbuja:2}],[220,{burbuja:3}],[220,{burbuja:4}],[260,{burbuja:null,mirada:{dx:0,dy:0}}]],
  saludo:[[0,{saludo:true}],[180,{saludo:false}],[180,{saludo:true}],[180,{saludo:false}],[180,{saludo:true}],[180,{saludo:false}]]
 };
 const traviesa=()=>{
  if(!ocupada){const nombres=Object.keys(TRAVESURAS);secuencia(TRAVESURAS[nombres[Math.floor(azar()*nombres.length)]]);}
  despues(entre(9000,16000),traviesa);
 };
 const alPuntero=ev=>{
  if(ocupada)return;
  const b=host.getBoundingClientRect();if(!b.width)return;
  const cx=b.left+b.width/2,cy=b.top+b.height/2;
  const dx=ev.clientX<cx-b.width*.6?-1:ev.clientX>cx+b.width*.6?1:0;
  const dy=ev.clientY<cy-b.height*.6?-1:0;
  ultimoPuntero=ahora();
  if(dx!==e.mirada.dx||dy!==e.mirada.dy)poner({mirada:{dx,dy}});
 };
 const celebrar=()=>{
  if(!activo||ocupada)return;
  const antes=pose;
  secuencia([[0,{parpadeo:'guino',salto:true}],[140,{salto:false}],[140,{salto:true}],[140,{salto:false,parpadeo:false}]],()=>{
   pose='exito';poner({fiesta:true});ocupada=true;
   despues(1200,()=>{pose=antes;ocupada=false;poner({fiesta:false});});
  });
 };
 const alClic=()=>{if(energia()==='completa')celebrar();};
 const reducido=ventana.matchMedia?ventana.matchMedia('(prefers-reduced-motion: reduce)'):null;
 const puedeMoverse=()=>opciones.vivo!==false&&energia()!=='quieta'&&!(reducido&&reducido.matches)&&visible&&!doc.hidden;
 const parar=()=>{activo=false;ocupada=false;for(const id of temporizadores)reloj.clearTimeout(id);temporizadores.clear();ventana.removeEventListener('pointermove',alPuntero);e=neutro();pintar();};
 const arrancar=()=>{
  if(activo||!puedeMoverse())return;
  activo=true;
  despues(entre(1200,2600),parpadeo);
  if(energia()==='completa'){ventana.addEventListener('pointermove',alPuntero,{passive:true});despues(entre(2000,4000),curiosa);despues(entre(5000,9000),traviesa);}
 };
 const revisar=()=>puedeMoverse()?arrancar():parar();
 const ajustar=()=>{const nueva=medir();if(nueva===celda)return;const antes=energia();celda=nueva;if(energia()!==antes){parar();revisar();}else pintar();};
 host.addEventListener('click',alClic);
 doc.addEventListener('visibilitychange',revisar);
 reducido?.addEventListener?.('change',revisar);
 let observador=null,medidor=null;
 if(ventana.IntersectionObserver){observador=new ventana.IntersectionObserver(entradas=>{visible=entradas.some(x=>x.isIntersecting);revisar();});observador.observe(host);}
 if(!opciones.celda&&ventana.ResizeObserver){medidor=new ventana.ResizeObserver(()=>ajustar());medidor.observe(r.eje==='alto'?host:(host.parentElement||host));}
 host.dataset.meyViva='';
 pintar();arrancar();
 return {
  pose(nombre){filasMey(nombre);pose=nombre;pintar();},
  atuendo(nombre){vestirMey(Array.from({length:18},vacia),nombre,{},[]);atuendo=nombre;pintar();},
  reaccionar(nombre){if(nombre==='celebrar')return celebrar();if(!TRAVESURAS[nombre])throw new Error('mey: travesura desconocida: '+nombre);if(activo&&!ocupada)secuencia(TRAVESURAS[nombre]);},
  ajustar,
  cuadro(){return cuadroMey(pose,e,atuendo,false).map(f=>f.join('')).join('\n');},
  get celda(){return celda;},
  get energia(){return energia();},
  get activa(){return activo;},
  detener(){parar();host.removeEventListener('click',alClic);doc.removeEventListener('visibilitychange',revisar);reducido?.removeEventListener?.('change',revisar);observador?.disconnect();medidor?.disconnect();delete host.dataset.meyViva;}
 };
};
mey.travesuras=['guino','chapoteo','burbuja','saludo','celebrar'];

/* ---------- <erlen-mey> ----------
   La forma más simple de poner a Mey en una app: <erlen-mey lugar="vacio"></erlen-mey>.
   Atributos: lugar, app, pose, atuendo, energia, titulo y vivo="false". Mide el espacio que le
   da su contenedor, se monta al entrar en el documento y se detiene al salir; cambiar un
   atributo la repinta. el.reaccionar('celebrar') y compañía pasan al motor. mey.definir(window)
   registra la etiqueta (una vez por ventana); al cargar este módulo en un navegador se registra
   sola. */
mey.definir=function(ventana){
 if(!ventana||!ventana.customElements||!ventana.HTMLElement)return false;
 if(ventana.customElements.get('erlen-mey'))return true;
 const ATRIBUTOS=['lugar','app','pose','atuendo','energia','titulo','vivo'];
 class ErlenMey extends ventana.HTMLElement{
  static get observedAttributes(){return ATRIBUTOS;}
  connectedCallback(){this.montar();}
  disconnectedCallback(){this._control?.detener();this._control=null;}
  attributeChangedCallback(){if(this._control)this.montar();}
  montar(){
   this._control?.detener();
   if(!this.style.display)this.style.display='block';
   const o={ventana};for(const a of ATRIBUTOS){const v=this.getAttribute(a);if(v!==null)o[a]=v;}
   if(!o.app)o.app=this.ownerDocument.documentElement.dataset.erlenApp;
   if(o.vivo==='false')o.vivo=false;else delete o.vivo;
   this.setAttribute('aria-hidden',o.titulo?'false':'true');
   try{this._control=mey.montar(this,o);}catch(error){this._control=null;this.textContent='';throw error;}
  }
  reaccionar(nombre){this._control?.reaccionar(nombre);}
  get control(){return this._control;}
 }
 ventana.customElements.define('erlen-mey',ErlenMey);
 return true;
};
if(typeof window!=='undefined')mey.definir(window);
