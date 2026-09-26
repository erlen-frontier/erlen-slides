/* erlen-diseno 1.7.0 · generado por herramientas/diseno-sync.mjs --modo iife; no editar a mano */
const erlenInicio=(()=>{
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
 const tam=(opciones.celda?' width="'+16*opciones.celda+'" height="'+(arriba?14+ALTO_MEY:14)*opciones.celda+'"':'')+(opciones.estilo?' style="'+opciones.estilo+'"':'');
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

function mey(pose='hola',opciones={}){
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
 // Caminar: una pata se levanta en cada paso (se borra de la fila de abajo). Sentarse: patas
 // recogidas, el cuerpo baja una fila.
 if(e.caminando||e.sentada){
  const y=f.map(fila=>fila.some(c=>c!=='.')).lastIndexOf(true);
  if(y>=0){
   // La fila de abajo son siempre las patas.
   if(e.sentada){f.splice(y,1);f.unshift(vacia());}
   else for(let x=0;x<16;x++)if(f[y][x]==='w'&&(e.caminando===1?x<8:x>=8))f[y][x]='.';
  }
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
 const neutro=()=>({mirada:{dx:0,dy:0},parpadeo:false,salto:false,chapoteo:null,burbuja:null,saludo:false,fiesta:false,caminando:0,sentada:false});
 // Paseo: con energía completa y un espacio más ancho que ella, Mey camina por él. x en píxeles
 // (múltiplo de la celda), rumbo 1 a la derecha y -1 a la izquierda (se voltea en espejo).
 let x=0,rumbo=1,punteroX=null;
 const holgura=()=>Math.max(0,Math.floor((host.clientWidth-16*celda)/celda))*celda;
 const conPaseo=()=>opciones.paseo!==false&&energia()==='completa'&&holgura()>=8*celda;
 let e=neutro();
 let pintado='',temporizadores=new Set(),activo=false,ultimoPuntero=-Infinity,ocupada=false,visible=true;
 const ahora=()=>ventana.performance?.now?.()??Date.now();
 const estilo=()=>conPaseo()?'display:block;transform:translateX('+x+'px)'+(rumbo<0?' scaleX(-1)':''):'';
 const pintar=()=>{
  if(conPaseo()){if(!host.style.position)host.style.position='relative';host.style.overflow='hidden';}
  const svg=svgMey(cuadroMey(pose,e,atuendo,false),pose,atuendo,{...opciones,celda,estilo:estilo()},true);if(svg!==pintado){host.innerHTML=svg;pintado=svg;}
 };
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
  const b=host.getBoundingClientRect();if(!b.width)return;
  if(ev.clientY>=b.top&&ev.clientY<=b.bottom&&ev.clientX>=b.left&&ev.clientX<=b.right)punteroX=ev.clientX-b.left;
  if(ocupada)return;
  const cx=b.left+(conPaseo()?x+8*celda:b.width/2),cy=b.top+b.height/2;
  const dx=ev.clientX<cx-b.width*.6?-1:ev.clientX>cx+b.width*.6?1:0;
  const dy=ev.clientY<cy-b.height*.6?-1:0;
  ultimoPuntero=ahora();
  const dxv=conPaseo()&&rumbo<0?-dx:dx; // volteada en espejo, su izquierda es nuestra derecha
  if(dxv!==e.mirada.dx||dy!==e.mirada.dy)poner({mirada:{dx:dxv,dy}});
 };
 const celebrar=()=>{
  if(!activo||ocupada)return;
  const antes=pose;
  secuencia([[0,{parpadeo:'guino',salto:true}],[140,{salto:false}],[140,{salto:true}],[140,{salto:false,parpadeo:false}]],()=>{
   pose='exito';poner({fiesta:true});ocupada=true;
   despues(1200,()=>{pose=antes;ocupada=false;poner({fiesta:false});});
  });
 };
 // Camina hasta destino (px) a un paso por cuadro, alternando las patas; al llegar, a veces se sienta.
 const caminar=(destino,alLlegar)=>{
  const meta=Math.max(0,Math.min(holgura(),Math.round(destino/celda)*celda));
  if(meta===x){alLlegar&&alLlegar();return;}
  ocupada=true;rumbo=meta>x?1:-1;
  const paso=n=>{
   if(!activo)return;
   x+=rumbo*celda;poner({caminando:n%2?1:2,sentada:false});
   if(x!==meta)despues(140,()=>paso(n+1));
   else despues(140,()=>{poner({caminando:0});ocupada=false;alLlegar&&alLlegar();});
  };
  despues(0,()=>paso(0));
 };
 const pasear=()=>{
  if(!ocupada&&conPaseo()){
   const cerca=punteroX!==null&&ahora()-ultimoPuntero<1500;
   const destino=cerca?punteroX-8*celda:Math.floor(azar()*(holgura()/celda+1))*celda;
   caminar(destino,()=>{if(!cerca&&azar()<.3){poner({sentada:true});despues(entre(2000,4000),()=>poner({sentada:false}));}});
  }
  despues(entre(4000,9000),pasear);
 };
 const alClic=()=>{if(energia()==='completa')celebrar();};
 const reducido=ventana.matchMedia?ventana.matchMedia('(prefers-reduced-motion: reduce)'):null;
 const puedeMoverse=()=>opciones.vivo!==false&&energia()!=='quieta'&&!(reducido&&reducido.matches)&&visible&&!doc.hidden;
 const parar=()=>{activo=false;ocupada=false;for(const id of temporizadores)reloj.clearTimeout(id);temporizadores.clear();ventana.removeEventListener('pointermove',alPuntero);e=neutro();pintar();};
 const arrancar=()=>{
  if(activo||!puedeMoverse())return;
  activo=true;
  despues(entre(1200,2600),parpadeo);
  if(energia()==='completa'){ventana.addEventListener('pointermove',alPuntero,{passive:true});despues(entre(2000,4000),curiosa);despues(entre(5000,9000),traviesa);despues(entre(1500,3500),pasear);}
 };
 const revisar=()=>puedeMoverse()?arrancar():parar();
 const ajustar=()=>{const nueva=medir();if(nueva!==celda){const antes=energia();celda=nueva;x=Math.round(x/celda)*celda;if(energia()!==antes){parar();revisar();return;}}x=Math.min(x,holgura());pintar();};
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
  get paseo(){return {activo:conPaseo(),x,rumbo,holgura:holgura(),sentada:!!e.sentada};},
  caminar(destino){if(activo&&!ocupada&&conPaseo())caminar(destino);},
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
 const ATRIBUTOS=['lugar','app','pose','atuendo','energia','titulo','vivo','paseo','celda'];
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
   if(o.paseo==='false')o.paseo=false;else delete o.paseo;
   if(o.celda){const c=parseInt(o.celda,10);if(c>0)o.celda=c;else delete o.celda;}
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
 */
/* Pantalla de inicio común de Erlen Suite (docs/COHERENCIA-APPS.md §3 del portal), el
   patrón de Erlen Slides convertido en componente. La app declara textos, «Nuevo…»,
   ejemplos, su biblioteca y recursos; este módulo pinta la barra lateral, la colección de
   inicio y las vistas, filtra, deja el editor inerte y lleva el foco y el título de la
   pestaña. Solo importa a Mey (diseno/mey.mjs; en el IIFE va incrustada) y no guarda datos:
   la biblioteca la da la app.
   Estilos en diseno/inicio.css, solo con tokens --erlen-*.

   mountInicio(host, {
     nombre: 'Erlen Notes', corto: 'NOTES', objetos: 'páginas',      // «Mis páginas»
     marca?: '<svg…>', estado: 'Versión alfa', subtitulo: 'Cuadernos de investigación',
     eyebrow: 'CUADERNO CIENTÍFICO · ERLEN NOTES', titulo: ['Cuadernos ', 'científicos'],
     lead: 'Frase de una o dos líneas.',
     nuevo: {etiqueta:'Nueva página', detalle:'Página en blanco', accion},
     importar?: {etiqueta:'Importar…', accion},
     continuar?: () => ({etiqueta:'Seguir con «X»', accion}) | null,
     ejemplos?: [{id, disciplina, arte, titulo, descripcion, accion, etiqueta?}],
     biblioteca?: {listar: () => [{id, titulo, detalle?, fecha?, miniatura?, abrir, duplicar?, descargar?}],
                   vacio?: {titulo, texto}},
     recursos?: [{titulo, texto, etiqueta, accion}],
     acerca?: {texto, enlaces:[{etiqueta, url}]},
     fuente?: {url, licencia:'AGPLv3'},
     editor?: Element,            // se vuelve inert mientras el inicio está abierto
     menuSuite?: contenedor => {}, // monta <erlen-suite-nav> en la cabecera
     app?: 'notes',                // perfil de Mey; por defecto, corto en minúsculas
     mey?: false | pose => '<svg…>', // por defecto Mey viva (<erlen-mey lugar="vacio">): dormida
                                   // en la biblioteca vacía y pensando si la búsqueda no encuentra;
                                   // false la quita; una función (paquete 1.4–1.5) pinta ese SVG quieto
     alAbrir?, alCerrar?
   })
   Devuelve {elemento, abrir(vista), cerrar(), actualizar(), avisar(texto,{error}), abierta, vista, destruir()}.
   avisar() muestra un aviso persistente (role=status, o alert si es error) arriba del contenido
   hasta que cambia la vista; menuSuite se llama una sola vez y su nodo se conserva.
   Vistas: 'inicio', 'biblioteca', 'ejemplos', 'recursos', 'acerca'. */
const VISTAS=['inicio','biblioteca','ejemplos','recursos','acerca'];

function mountInicio(host,config){
 if(!host||!host.ownerDocument)throw Error('mountInicio necesita un elemento anfitrión.');
 if(!config||typeof config.nombre!=='string'||!config.nuevo||typeof config.nuevo.accion!=='function')throw Error('mountInicio necesita nombre y nuevo.accion.');
 const doc=host.ownerDocument;
 const objetos=config.objetos||'documentos';
 const nombres={inicio:'Inicio',biblioteca:'Mis '+objetos,ejemplos:'Ejemplos editables',recursos:'Recursos y respaldos',acerca:'Acerca de'};
 const disponibles=VISTAS.filter(v=>v==='inicio'||v==='acerca'||(v==='biblioteca'&&config.biblioteca)||(v==='ejemplos'&&config.ejemplos&&config.ejemplos.length)||(v==='recursos'&&config.recursos&&config.recursos.length));
 let vista='inicio',abierta=false,tituloPrevio=null,busqueda='',orden='recientes',aviso=null,hueco=null;

 const el=(tag,attrs,...hijos)=>{
  const n=doc.createElement(tag);
  for(const [k,v] of Object.entries(attrs||{}))if(v!==null&&v!==undefined&&v!==false)n.setAttribute(k,v===true?'':String(v));
  n.append(...hijos.flat().filter(h=>h!==null&&h!==undefined&&h!==false));
  return n;
 };
 const boton=(texto,accion,clase='',attrs={})=>{const b=el('button',{type:'button',class:('erlen-inicio-boton '+clase).trim(),...attrs},typeof texto==='string'?el('span',{class:'erlen-inicio-boton-texto'},texto):texto);if(typeof texto==='string'&&!attrs.title)b.title=texto;b.addEventListener('click',accion);return b;};
 const marca=()=>{const s=el('span',{class:'erlen-inicio-marca-icono','aria-hidden':'true'});if(config.marca)s.innerHTML=config.marca;return s;};
 // Mey solo si la app la pasa (config.mey): este módulo no importa nada para seguir sirviendo como IIFE.
 const ilustracion=pose=>{
  if(config.mey===false)return null;
  const s=el('span',{class:'erlen-inicio-mey','aria-hidden':'true'});
  if(typeof config.mey==='function'){s.innerHTML=config.mey(pose);return s;}
  // Mey viva del paquete: se adapta sola al hueco y al perfil de la app, y toma cada mejora de diseno/mey.mjs.
  if(mey.definir(doc.defaultView))s.append(el('erlen-mey',{lugar:'vacio',pose,app:config.app||(config.corto||'').toLowerCase()||null}));
  else s.innerHTML=mey(pose);
  return s;
 };
 const alEditor=fn=>()=>{cerrar();fn();};

 const raiz=el('main',{class:'erlen-inicio',hidden:true,'aria-label':config.nombre});
 host.append(raiz);

 // Clave estable del control enfocado, para devolverle el foco tras repintar.
 const claveFoco=n=>n&&n!==doc.body&&raiz.contains(n)?n.tagName+'|'+(n.getAttribute('aria-label')||n.textContent.trim()):null;
 function pintar(){
  const foco=claveFoco(doc.activeElement);
  raiz.replaceChildren();
  const nav=el('nav',{class:'erlen-inicio-nav','aria-label':'Navegación del inicio'},
   disponibles.filter(v=>v!=='acerca').map(v=>{const a=el('a',{href:'#',class:'erlen-inicio-enlace','aria-current':v===vista?'page':null},nombres[v]);a.addEventListener('click',e=>{e.preventDefault();abrir(v);});return a;}));
  const acerca=el('a',{href:'#',class:'erlen-inicio-enlace','aria-current':vista==='acerca'?'page':null},'Acerca de');
  acerca.addEventListener('click',e=>{e.preventDefault();abrir('acerca');});
  const lateral=el('aside',{class:'erlen-inicio-lateral'},
   el('div',{class:'erlen-inicio-marca'},marca(),el('span',null,'Erlen'),config.corto?el('small',null,config.corto):null),
   nav,
   el('div',{class:'erlen-inicio-lateral-pie'},acerca,
    config.fuente?el('a',{class:'erlen-inicio-fuente',href:config.fuente.url,target:'_blank',rel:'noopener'},'Código fuente · '+(config.fuente.licencia||'')):null,
    config.estado?el('p',{class:'erlen-inicio-estado'},config.estado,el('span',null,'Sin cuenta · tu trabajo se queda en este navegador.')):null));
  const acciones=el('div',{class:'erlen-inicio-cabecera-acciones'},el('span',{class:'erlen-inicio-local'},'En este navegador'));
  const cont=config.continuar&&config.continuar();
  if(cont)acciones.append(boton(cont.etiqueta,alEditor(cont.accion),'secundario'));
  if(config.menuSuite){if(!hueco){hueco=el('span',{class:'erlen-inicio-suite'});config.menuSuite(hueco);}acciones.append(hueco);}
  const cabecera=el('header',{class:'erlen-inicio-cabecera'},el('span',null,config.subtitulo||config.nombre),acciones);
  const contenido=el('div',{class:'erlen-inicio-contenido'});
  raiz.append(el('div',{class:'erlen-inicio-marco'},lateral,el('div',{class:'erlen-inicio-panel'},cabecera,contenido)));
  if(aviso)contenido.append(el('p',{class:'erlen-inicio-aviso'+(aviso.error?' error':''),role:aviso.error?'alert':'status'},aviso.texto));
  ({inicio:pintarInicio,biblioteca:pintarBiblioteca,ejemplos:pintarEjemplos,recursos:pintarRecursos,acerca:pintarAcerca})[vista](contenido);
  if(foco){const n=[...raiz.querySelectorAll('button,a,input,select,[tabindex]')].find(x=>claveFoco(x)===foco);if(n)n.focus({preventScroll:true});}
 }

 const titulo=(texto,em)=>el('h1',{class:'erlen-inicio-titulo',tabindex:'-1'},texto,em?el('em',null,em):null);
 const cabeceraVista=(c,nombre)=>c.append(el('header',{class:'erlen-inicio-vista-cabecera'},el('span',{class:'erlen-inicio-eyebrow'},(config.corto?'ERLEN '+config.corto:config.nombre.toUpperCase())),titulo(nombre)));
 function tarjetaNueva(){
  const b=el('button',{type:'button',class:'erlen-inicio-nueva'},el('span',{class:'erlen-inicio-mas','aria-hidden':'true'},'+'),el('strong',null,config.nuevo.etiqueta),config.nuevo.detalle?el('small',null,config.nuevo.detalle):null);
  b.addEventListener('click',alEditor(config.nuevo.accion));
  return b;
 }
 function tarjetaEjemplo(e){
  const arte=el('div',{class:'erlen-inicio-arte','aria-hidden':'true'});
  if(typeof e.arte==='string'&&e.arte.trim().startsWith('<svg'))arte.innerHTML=e.arte;else arte.textContent=e.arte||'';
  return el('article',{class:'erlen-inicio-ejemplo','data-busqueda':[e.disciplina,e.titulo,e.descripcion].join(' ').toLowerCase()},
   e.disciplina?el('span',{class:'erlen-inicio-eyebrow'},e.disciplina):null,arte,el('h2',null,e.titulo),e.descripcion?el('p',null,e.descripcion):null,
   boton(e.etiqueta||'Abrir ejemplo',alEditor(e.accion),'primario'));
 }
 function pintarInicio(c){
  const buscar=el('input',{type:'search',class:'erlen-inicio-campo',placeholder:'Buscar un ejemplo…','aria-label':'Buscar ejemplos'});
  const rejilla=el('section',{class:'erlen-inicio-rejilla','aria-label':'Colección de inicio'},tarjetaNueva(),(config.ejemplos||[]).slice(0,3).map(tarjetaEjemplo));
  buscar.addEventListener('input',()=>{const q=buscar.value.trim().toLowerCase();for(const t of rejilla.querySelectorAll('.erlen-inicio-ejemplo'))t.hidden=!!q&&!t.dataset.busqueda.includes(q);});
  const [texto,em]=Array.isArray(config.titulo)?config.titulo:[config.titulo||config.nombre];
  c.append(el('div',{class:'erlen-inicio-bienvenida'},
   el('div',null,config.eyebrow?el('span',{class:'erlen-inicio-eyebrow'},config.eyebrow):null,titulo(texto,em),config.lead?el('p',{class:'erlen-inicio-lead'},config.lead):null),
   config.ejemplos&&config.ejemplos.length?el('label',{class:'erlen-inicio-buscar'},buscar):null));
  const accionesMeta=el('div',{class:'erlen-inicio-acciones'});
  if(config.ejemplos&&config.ejemplos.length>3)accionesMeta.append(boton('Explorar ejemplos',()=>abrir('ejemplos'),'secundario'));
  if(config.importar)accionesMeta.append(boton(config.importar.etiqueta||'Importar…',alEditor(config.importar.accion),'secundario'));
  c.append(el('div',{class:'erlen-inicio-meta'},el('h2',null,'Colección de inicio'),accionesMeta),rejilla);
  const recientes=config.biblioteca?config.biblioteca.listar().slice(0,4):[];
  if(recientes.length){
   const ver=el('a',{href:'#',class:'erlen-inicio-enlace-texto'},'Ver todo');ver.addEventListener('click',e=>{e.preventDefault();abrir('biblioteca');});
   c.append(el('div',{class:'erlen-inicio-meta'},el('h2',null,'Recientes'),ver),el('ul',{class:'erlen-inicio-recientes'},recientes.map(r=>{const b=boton([el('strong',null,r.titulo||'Sin título'),r.detalle||r.fecha?el('small',null,[r.detalle,r.fecha].filter(Boolean).join(' · ')):null],alEditor(r.abrir),'reciente');return el('li',null,b);})));
  }
  if(config.ejemplos&&config.ejemplos.length)c.append(el('footer',{class:'erlen-inicio-pie'},el('p',null,'Ejemplos didácticos · sustituye los datos por los de tu investigación.'),el('span',{class:'erlen-inicio-activo'},'Guardado local activo')));
 }
 function pintarBiblioteca(c){
  cabeceraVista(c,nombres.biblioteca);
  const buscar=el('input',{type:'search',class:'erlen-inicio-campo',placeholder:'Buscar en tu biblioteca…','aria-label':'Buscar en tu biblioteca',value:busqueda});
  const ordenar=el('select',{class:'erlen-inicio-campo','aria-label':'Ordenar'},el('option',{value:'recientes'},'Más recientes'),el('option',{value:'nombre'},'Nombre A–Z'));
  ordenar.value=orden;
  const rejilla=el('section',{class:'erlen-inicio-rejilla','aria-label':nombres.biblioteca});
  const conteo=el('p',{class:'erlen-inicio-nota',role:'status'});
  const repintar=()=>{
   const q=busqueda.trim().toLowerCase();
   let items=config.biblioteca.listar();
   const total=items.length;
   if(q)items=items.filter(i=>[i.titulo,i.detalle].join(' ').toLowerCase().includes(q));
   if(orden==='nombre')items=[...items].sort((a,b)=>String(a.titulo||'').localeCompare(String(b.titulo||''),'es'));
   rejilla.replaceChildren();
   if(!items.length){
    const v=config.biblioteca.vacio||{};
    rejilla.append(total?el('div',{class:'erlen-inicio-vacio'},ilustracion('pensando'),el('h3',null,'No hay coincidencias'),el('p',null,'Prueba con otro nombre o limpia la búsqueda.'))
     :el('div',{class:'erlen-inicio-vacio'},ilustracion('dormido'),el('h3',null,v.titulo||'Aquí empieza tu trabajo'),el('p',null,v.texto||'Crea uno nuevo o importa un archivo. Tu trabajo se guarda en este navegador; puedes descargarlo en cualquier momento.'),boton(config.nuevo.etiqueta,alEditor(config.nuevo.accion),'primario')));
   }
   for(const i of items)rejilla.append(el('article',{class:'erlen-inicio-tarjeta'},
    el('div',{class:'erlen-inicio-miniatura','aria-hidden':'true'},el('small',null,'En este navegador'),el('span',null,i.miniatura||i.titulo||'Sin título')),
    el('div',{class:'erlen-inicio-tarjeta-cuerpo'},el('h3',null,i.titulo||'Sin título'),i.detalle||i.fecha?el('p',null,[i.detalle,i.fecha].filter(Boolean).join(' · ')):null,
     el('div',{class:'erlen-inicio-acciones'},boton('Abrir',alEditor(i.abrir),'primario',{'aria-label':'Abrir «'+(i.titulo||'Sin título')+'»'}),
      i.duplicar?boton('Duplicar',()=>{Promise.resolve(i.duplicar()).then(repintar,e=>{aviso={texto:'No se pudo duplicar: '+(e&&e.message||e),error:true};pintar();});},'secundario',{'aria-label':'Duplicar «'+(i.titulo||'Sin título')+'»'}):null,
      i.descargar?boton('Descargar',()=>i.descargar(),'secundario',{'aria-label':'Descargar «'+(i.titulo||'Sin título')+'»'}):null))));
   conteo.textContent=items.length+' de '+total+' '+objetos;
  };
  buscar.addEventListener('input',()=>{busqueda=buscar.value;repintar();});
  ordenar.addEventListener('change',()=>{orden=ordenar.value;repintar();});
  c.append(el('div',{class:'erlen-inicio-controles'},buscar,ordenar),conteo,rejilla,
   el('footer',{class:'erlen-inicio-pie'},el('p',null,'Los archivos locales son tuyos. Borrar los datos del navegador elimina estas copias: conserva un respaldo descargado.')));
  repintar();
 }
 function pintarEjemplos(c){
  cabeceraVista(c,nombres.ejemplos);
  c.append(el('p',{class:'erlen-inicio-lead'},'Puntos de partida editables. Los datos son ilustrativos: sustitúyelos por los de tu investigación.'),
   el('section',{class:'erlen-inicio-rejilla','aria-label':nombres.ejemplos},tarjetaNueva(),config.ejemplos.map(tarjetaEjemplo)));
 }
 function pintarRecursos(c){
  cabeceraVista(c,nombres.recursos);
  c.append(el('section',{class:'erlen-inicio-rejilla','aria-label':nombres.recursos},config.recursos.map(r=>el('article',{class:'erlen-inicio-ejemplo'},el('h2',null,r.titulo),r.texto?el('p',null,r.texto):null,boton(r.etiqueta||'Abrir',()=>r.accion(),'secundario')))));
 }
 function pintarAcerca(c){
  cabeceraVista(c,nombres.acerca);
  const a=config.acerca||{};
  c.append(el('div',{class:'erlen-inicio-acerca'},el('h2',null,config.nombre+(config.subtitulo?' · '+config.subtitulo:'')),a.texto?el('p',null,a.texto):null,
   a.enlaces&&a.enlaces.length?el('ul',null,a.enlaces.map(l=>el('li',null,el('a',{href:l.url,target:'_blank',rel:'noopener'},l.etiqueta)))):null));
 }

 function abrir(v='inicio'){
  const nueva=disponibles.includes(v)?v:'inicio';
  if(nueva!==vista)aviso=null;
  vista=nueva;
  if(!abierta){tituloPrevio=doc.title;abierta=true;raiz.hidden=false;if(config.editor)config.editor.inert=true;doc.body.classList.add('erlen-inicio-abierto');if(config.alAbrir)config.alAbrir();}
  pintar();
  raiz.scrollTop=0;
  doc.title=nombres[vista]+' · '+config.nombre;
  raiz.querySelector('.erlen-inicio-titulo')?.focus({preventScroll:true});
 }
 function cerrar(){
  if(!abierta)return;
  abierta=false;raiz.hidden=true;aviso=null;
  if(config.editor)config.editor.inert=false;
  doc.body.classList.remove('erlen-inicio-abierto');
  if(tituloPrevio!==null)doc.title=tituloPrevio;
  if(config.alCerrar)config.alCerrar();
 }
 return {
  elemento:raiz,abrir,cerrar,
  actualizar(){if(abierta)pintar();},
  avisar(texto,{error=false}={}){aviso=texto?{texto:String(texto),error:!!error}:null;if(abierta)pintar();},
  get abierta(){return abierta;},
  get vista(){return vista;},
  destruir(){cerrar();raiz.remove();}
 };
}

return mountInicio;})();
