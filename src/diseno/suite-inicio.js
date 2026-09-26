/* erlen-diseno 1.8.0 · generado por herramientas/diseno-sync.mjs --modo iife; no editar a mano */
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
   · e ojos y trazos en tinta · x acento · p papel · . vacío. El líquido sube por los
   bordes del matraz como agua por capilaridad y se divide abajo en dos perneras: no es una boca.
   Los colores son los de la marca, fijos en claro y en oscuro para distinguir el líquido
   del vidrio. Se muestra en múltiplos de
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
.wwwwwwggwwww...
...wwwwwwwwww...
...wwww..wwww...
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
.wwwwwwggwwwwww.
...wwwwwwwwww...
...wwww..wwww...
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
...wwwwggwwww...
...wwwwwwwwww...
...wwww..wwww...
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
...wwwwggwwww...
...wwwwwwwwww...
...wwww..wwww...
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
.wwwwwwggwwwwww.
...wwww..wwww...
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
...wwww..wwww...
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
.wwwwwwggwwww...
...wwwwwwwwww...
...wwww..wwww...
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
.wwwwwwggwwww...
...wwwwwwwwww...
...wwww..wwww...
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

// El contorno gana pasos conectados de 1/2 y 1/4 de celda en tamaños grandes.
// El favicon de 16 px conserva la cuadrícula simple para no emborronarse.
function detallesMey(filas,dy){
 let r='';
 const punto=(x,y,c,t=.5)=>{r+='<rect x="'+x+'" y="'+(y+dy)+'" width="'+t+'" height="'+t+'" fill="'+COLOR_MEY[c]+'"/>';};
 // Capilaridad en tres alturas: junto al vidrio, en el cuerpo y en el centro.
 // No hay línea de tinta ni rasgos faciales nuevos.
 for(let y=ALTO_MEY+8;y<filas.length-2;y++){
  if(filas[y].slice(3,13).join('')==='wwwwggwwww'&&filas[y+1].slice(3,13).every(c=>c==='w')){
   for(const x of [3,3.5,12,12.5])if(filas[y-1][Math.floor(x)]==='g')punto(x,y-.5,'w');
   for(const x of [7,7.5,8,8.5])punto(x,y+.5,'w');
  }
 }
 // Transiciones de vidrio: cada escalón toca la fila anterior y la siguiente.
 // No se añaden reflejos en la cabeza ni fragmentos flotantes fuera de los brazos.
 for(let y=ALTO_MEY+2;y<ALTO_MEY+9;y++){
  const bordes=f=>[f.findIndex(c=>c==='g'),f.lastIndexOf('g')];
  const [izq,der]=bordes(filas[y]),[sigIzq,sigDer]=bordes(filas[y+1]);
  if(izq>=3&&izq<=6&&sigIzq>=3&&sigIzq<=6){
   if(sigIzq===izq-1){punto(izq-.25,y+.25,'g',.25);punto(izq-.5,y+.5,'g');}
   if(sigIzq===izq+1){punto(sigIzq-.5,y+1,'g');punto(sigIzq-.25,y+1.5,'g',.25);}
  }
  if(der>=9&&der<=12&&sigDer>=9&&sigDer<=12){
   if(sigDer===der+1){punto(der+1,y+.25,'g',.25);punto(der+1,y+.5,'g');}
   if(sigDer===der-1){punto(sigDer+1,y+1,'g');punto(sigDer+1,y+1.5,'g',.25);}
  }
 }
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
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+vista+'"'+tam+' shape-rendering="crispEdges" class="erlen-mey" data-pose="'+pose+'"'+(atuendo!=='ninguno'?' data-atuendo="'+atuendo+'"':'')+' '+accesibleMey(opciones)+celdas+(opciones.detalle!==false&&(!opciones.celda||opciones.celda>=2)?detallesMey(filas,arriba?-ALTO_MEY:0):'')+'</svg>';
}

/* ---------- Atuendos ----------
   Mey se viste con un toque mexicano. Parte sin atuendo; los demás son
   disfraces para ocasiones. Cada prenda se coloca buscando en la pose el tapón (corrida de 6
   celdas de vidrio sobre un cuello de 4), el paso del cuello al cuerpo y los ojos, así sirve
   para todas las poses. Solo pinta sobre vidrio o vacío: nunca tapa ojos ni utilería. */
const ATUENDOS_MEY=['rebozo','gala','charro','luchador','astronauta','cientifica','exploradora','artista','invierno','ninguno'];
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
 }
 if(atuendo==='luchador'&&k){
  // Máscara de luchador: rosa mexicano del cuello a debajo de los ojos, ribete cempasúchil
  // alrededor de cada ojo y franja blanca al centro de la frente.
  const cara=caraMey(f,k.y,k.y+5);
  const yb=cara.length?Math.max(...cara.map(o=>o.y))+1:k.y+4,arriba=cara.length?Math.min(...cara.map(o=>o.y)):k.y+2;
  const cercaDeOjo=(x,y)=>cara.some(o=>Math.abs(o.x-x)+Math.abs(o.y-y)===1);
  for(let y=k.y;y<=yb;y++)for(let x=0;x<16;x++)if(f[y][x]==='g')f[y][x]=cercaDeOjo(x,y)?'n':(y<arriba&&(x===k.a+2||x===k.a+3)?'p':'r');
 }
 if(atuendo==='astronauta'){
  // Aro de escafandra con borde violeta visible también sobre papel claro.
  for(let x=t.a-1;x<=t.b+1;x++)pon(x,t.y-1,'x','.');
  for(let y=t.y;y<=t.y+2;y++){
   pon(t.a-2,y,'x','.');pon(t.b+2,y,'x','.');
  }
  if(k){pon(k.a,k.y,'p','g');pon(k.a+5,k.y,'p','g');pon(k.a-1,k.y+1,'x','g.');pon(k.a+6,k.y+1,'x','g.');}
 }
 if(atuendo==='cientifica'&&k){
  pon(k.a,k.y,'x','g');pon(k.a+5,k.y,'x','g');
  const cara=caraMey(f,k.y,k.y+5);
  const debajo=cara.length?Math.max(...cara.map(o=>o.y))+1:k.y+4;
  for(let y=debajo;y<=debajo+2;y++){
   for(let x=k.a-1;x<=k.a+1;x++)pon(x,y,'p','g');
   for(let x=k.a+4;x<=k.a+6;x++)pon(x,y,'p','g');
   pon(k.a-2,y,'x','g.');pon(k.a+7,y,'x','g.');
  }
  pon(k.a+2,debajo,'x','g');
 }
 if(atuendo==='exploradora'){
  // Sombrero de campo de ala ancha, galón dorado y chaleco claro con bolsillos.
  for(let x=t.a-2;x<=t.b+2;x++)pon(x,t.y-1,'x','.');
  for(let x=t.a;x<=t.b;x++){pon(x,t.y-2,'n','.');pon(x,t.y-3,'x','.');}
  if(k){
   const cara=caraMey(f,k.y,k.y+5),debajo=cara.length?Math.max(...cara.map(o=>o.y))+1:k.y+4;
   for(let y=debajo;y<=debajo+1;y++)for(const x of [k.a-1,k.a,k.a+5,k.a+6])pon(x,y,'p','g');
   pon(k.a,debajo+1,'n','p');pon(k.a+5,debajo+1,'n','p');
  }
 }
 if(atuendo==='artista'){
  // Boina ladeada, delantal violeta: la cara y el nivel del líquido quedan a la vista.
  for(let x=t.a-1;x<=t.b+1;x++)pon(x,t.y-1,'r','.');
  for(let x=t.a-2;x<=t.b;x++)pon(x,t.y-2,'r','.');
  pon(t.a,t.y-3,'r','.');
  if(k){
   const cara=caraMey(f,k.y,k.y+5),debajo=cara.length?Math.max(...cara.map(o=>o.y))+1:k.y+4;
   for(let y=debajo-3;y<debajo;y++){pon(k.a-1,y,'x','g');pon(k.a+6,y,'x','g');}
   for(let y=debajo;y<=debajo+2;y++)for(let x=k.a;x<=k.a+5;x++)pon(x,y,'x','g');
   pon(k.a+1,debajo,'p','x');pon(k.a+4,debajo,'p','x');
   pon(k.a+2,debajo+1,'n','x');pon(k.a+3,debajo+1,'r','x');
  }
 }
 if(atuendo==='invierno'){
  // Gorro de punto con pompón y bufanda al cuello, sin cubrir los ojos.
  for(let x=t.a-1;x<=t.b+1;x++)pon(x,t.y-1,x%2?'r':'x','.');
  for(let x=t.a;x<=t.b;x++)pon(x,t.y-2,'x','.');
  pon(t.a+2,t.y-3,'r','.');pon(t.a+3,t.y-3,'r','.');
  if(k){
   for(let x=k.a;x<=k.a+5;x++)pon(x,k.y,'p','g');
   pon(k.a+1,k.y,'n','p');pon(k.a+4,k.y,'n','p');
   for(let y=k.y+1;y<=k.y+3;y++)pon(k.a-1,y,'p','g.');
   pon(k.a-1,k.y+4,'n','g.');
  }
 }
}

function papelPicadoMey(f){PAPEL_PICADO_MEY.forEach((fila,y)=>{for(let x=0;x<16;x++)if(fila[x]!=='.'&&f[y][x]==='.')f[y][x]=fila[x];});}

function mey(pose='hola',opciones={}){
 if(opciones.tile)return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" class="erlen-mey" data-pose="'+pose+'" '+accesibleMey(opciones)+'<rect width="16" height="16" rx="3.5" fill="'+TILE_MEY+'"/><g shape-rendering="crispEdges">'+celdasMey(filasMey(pose),1)+'</g></svg>';
 const atuendo=opciones.atuendo||'ninguno';
 const fiesta=pose==='exito'&&opciones.papelPicado!==false;
 return svgMey(cuadroMey(pose,{},atuendo,fiesta),pose,atuendo,opciones,false);
}
mey.poses=Object.keys(POSES_MEY);
mey.atuendos=ATUENDOS_MEY;
/* El vestidor solo guarda el atuendo. No altera el favicon ni las poses semánticas de las apps.
   Si localStorage está bloqueado, la elección dura hasta salir de esta página. */
const aparienciasEnMemoria=new WeakMap();
mey.aparienciaLocal=function(ventana){
 const clave='erlen-mey-apariencia';
 return {
  leer(){
   try{const almacen=ventana?.localStorage;if(almacen){const valor=almacen.getItem(clave);return ATUENDOS_MEY.includes(valor)?valor:'ninguno';}}catch{}
   return aparienciasEnMemoria.get(ventana)||'ninguno';
  },
  guardar(atuendo){
   if(!ATUENDOS_MEY.includes(atuendo))throw new Error('mey: atuendo desconocido: '+atuendo);
   aparienciasEnMemoria.set(ventana,atuendo);
   try{ventana?.localStorage?.setItem(clave,atuendo);}catch{}
   ventana?.dispatchEvent?.(new ventana.Event('erlen-mey-apariencia'));
  }
 };
};

/* ---------- Mey viva ----------
   Cada cuadro sale de la pose por transformaciones de la cuadrícula, no de dibujos aparte:
   mirar (los ojos de 1×2 se mueven una celda dentro del vidrio), parpadear o guiñar (el ojo
   pierde su celda de arriba), saltar (todo sube una fila), chapotear (se mueven las perneras),
   saludar (la mano sube), soltar una burbuja por el cuello y, al celebrar, papel picado.
   Pixel art de verdad: cambios de cuadro, sin interpolar. Filas en coordenadas de la pose. */
const CHAPOTEO_MEY={hola:{izq:{12:'...wwwww.wwww...'},der:{12:'...wwww.wwwww...'}}};
const SALUDO_MEY={hola:{1:[[14,7,'.'],[14,6,'w']],2:[[14,7,'.'],[14,6,'w'],[14,5,'w']]}};

function ojosMey(filas){
 const ojos=[];
 for(let y=1;y<filas.length-1;y++)for(let x=0;x<16;x++)if(filas[y][x]==='e'&&filas[y+1][x]==='e'&&filas[y-1][x]!=='e')ojos.push({x,y});
 return ojos;
}

function cuadroMey(pose,e,atuendo,fiesta){
 const f=[...Array.from({length:ALTO_MEY},vacia),...filasMey(pose)];
 if(e.saludo)for(const [x,y,c] of SALUDO_MEY[pose]?.[e.saludo===true?1:e.saludo]||[])f[y+ALTO_MEY][x]=c;
 const ch=e.chapoteo&&CHAPOTEO_MEY[pose]?.[e.chapoteo];
 if(ch)for(const [y,fila] of Object.entries(ch))f[+y+ALTO_MEY]=fila.split('');
 // Evaporarse: las filas de líquido del cuerpo (6 celdas o más, sin las patas) se vuelven vidrio
 // de arriba abajo. El borde del líquido desaparece sin modificar la cara.
 if(e.seca){
  // Solo dentro del cuerpo (el ancho de la fila de encima de las patas): los brazos no se evaporan.
  const base=f[f.length-2],a=base.findIndex(c=>c!=='.'),b=15-[...base].reverse().findIndex(c=>c!=='.');
  const filas=[];for(let y=ALTO_MEY;y<f.length-1;y++)if(f[y].filter(c=>c==='w').length>=6)filas.push(y);
  for(const y of filas.slice(0,e.seca))for(let x=a;x<=b;x++)if(f[y][x]==='w')f[y][x]='g';
 }
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
 }else if(e.ojos==='grandes'){
  // Sorpresa: cada ojo crece a 2×2 hacia el centro de la cara (sin comerse la pared del vidrio).
  const centro=ojos.reduce((s,o)=>s+o.x,0)/(ojos.length||1);
  for(const o of ojos){const lado=o.x<centro?1:-1;for(const y of [o.y,o.y+1])if(f[y][o.x+lado]==='g')f[y][o.x+lado]='e';}
 }
 vestirMey(f,atuendo,e,ojos);
 // Inclinarse (tropiezo, mareo, estornudo): la cabeza y los hombros se corren una celda.
 if(e.inclinar){const n=Math.sign(e.inclinar);for(let y=0;y<ALTO_MEY+6;y++)f[y]=n>0?['.',...f[y].slice(0,15)]:[...f[y].slice(1),'.'];}
 if(fiesta||e.fiesta)papelPicadoMey(f);
 if(e.burbuja!==null&&e.burbuja!==undefined){
  const y=ALTO_MEY+1-e.burbuja;
  if(y>=0&&f[y][9]==='.')f[y][9]='g';
 }
 // Burbujas sueltas en coordenadas del lienzo de 16×18 y un destello (idea, burbuja que revienta).
 for(const [x,y] of e.burbujas||[])if(f[y]?.[x]==='.')f[y][x]='g';
 if(e.destello){const [x,y]=e.destello;for(const [dx,dy,c] of [[0,0,'p'],[1,0,'x'],[-1,0,'x'],[0,1,'x'],[0,-1,'x']])if(f[y+dy]?.[x+dx]==='.')f[y+dy][x+dx]=c;}
 // Caminar: una pata se levanta en cada paso (se borra de la fila de abajo). Sentarse: patas
 // recogidas, el cuerpo baja una fila.
 if(e.caminando||e.sentada){
  const y=f.map(fila=>fila.some(c=>c!=='.')).lastIndexOf(true);
  if(y>=0){
   // La fila de abajo son siempre las patas.
   if(e.sentada){f.splice(y,1);f.unshift(vacia());}
   else for(let x=0;x<16;x++)if(f[y][x]==='w'&&([1,3].includes(e.caminando)?x<8:x>=8))f[y][x]='.';
   if(!e.sentada&&e.caminando>=3){const z=e.caminando===3?5:10;if(f[y-1][z]==='w')f[y][z]='w';}
  }
 }
 if(e.salto){f.shift();f.push(vacia());}
 // Flotar: sube hasta ALTO_MEY filas (se le olvidó la gravedad).
 if(e.flotar){const n=Math.min(ALTO_MEY,e.flotar);f.splice(0,n);for(let i=0;i<n;i++)f.push(vacia());}
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
 barra:{pose:'hola',energia:'calma',min:1,max:3,defecto:2,eje:'alto'},
 // Recreo: un escenario ancho donde Mey juega (la portada del portal). Ver «Juegos» abajo.
 recreo:{pose:'hola',energia:'completa',min:3,max:5,defecto:4,juegos:true}
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
 return {lugar,pose:final,atuendo:atuendo||perfil.atuendo||'ninguno',energia:l.energia,min:l.min,max:l.max,defecto:l.defecto,eje:l.eje||'ancho',juegos:!!l.juegos};
};
mey.lugares=Object.keys(LUGARES_MEY);
mey.perfiles=Object.keys(PERFILES_MEY);

/* Píxeles por celda que caben en el espacio: el entero más grande dentro de [min, max]; sin
   medida (0), el tamaño por defecto del lugar. */
function celdaMey(espacio,filas,r){
 const c=Math.floor(espacio/(r.eje==='alto'?filas:16));
 return c>0?Math.max(r.min,Math.min(r.max,c)):r.defecto;
}

/* ---------- Juegos (lugar «recreo») ----------
   En el recreo Mey no repite travesuras: juega. Cada juego es una escena cómica corta (una
   siesta con ronquidos, las escondidillas, el hipo…) con lado, velocidad, disfraz y tiempos al
   azar, así que ni el mismo juego sale igual dos veces. El orden sale de un mazo por persona:
   mey.siguienteJuego no repite un juego hasta haberlos jugado todos, ni empieza una vuelta con
   el último de la anterior. La memoria es {leer(), guardar(dato)}; mey.memoriaLocal(ventana) la
   guarda en localStorage y, si no se puede, en memoria (nunca falla). */
const JUEGOS_MEY=['siesta','escondidillas','burbuja','probador','baile','hipo','mareo','carrera','estornudo','lectura','idea','estatuas','gransalto','resbalon','perseguida','gravedad','evaporacion','techo'];

function barajarMey(lista,azar){const a=[...lista];for(let i=a.length-1;i>0;i--){const j=Math.floor(azar()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

mey.siguienteJuego=function(memoria,azar=Math.random,nombres=JUEGOS_MEY){
 let dato=null;try{dato=memoria?.leer?.();}catch{}
 const ultimo=nombres.includes(dato?.ultimo)?dato.ultimo:null;
 let vistos=Array.isArray(dato?.vistos)?dato.vistos.filter(n=>nombres.includes(n)):[];
 let quedan=nombres.filter(n=>!vistos.includes(n));
 if(!quedan.length){vistos=[];quedan=nombres.filter(n=>n!==ultimo||nombres.length===1);}
 const juego=barajarMey(quedan,azar)[0];
 try{memoria?.guardar?.({vistos:[...vistos,juego],ultimo:juego});}catch{}
 return juego;
};

mey.memoriaLocal=function(ventana,clave='erlen-mey-recreo'){
 let respaldo=null;
 return {
  leer(){try{const v=ventana?.localStorage?.getItem(clave);if(v)return JSON.parse(v);}catch{}return respaldo;},
  guardar(dato){respaldo=dato;try{ventana?.localStorage?.setItem(clave,JSON.stringify(dato));}catch{}}
 };
};

/* mey.montar(host, {lugar, app, pose, atuendo, energia, celda, vivo, ventana, reloj, aleatorio, memoria})
   pinta a Mey dentro de host (lienzo fijo de 16×18) y la anima según su energía:
   - completa: curiosa (parpadea, mira alrededor, sigue al puntero con los ojos) y traviesa
     (guiña, chapotea, saluda, suelta burbujas); al clic brinca y celebra con papel picado.
   - calma: solo parpadea; reacciona cuando la app se lo pide (reaccionar, pose).
   - quieta: no se mueve.
   Sin celda fija mide el host (ResizeObserver) y elige el tamaño que cabe; por debajo de 3 px
   por celda la energía baja a calma. Con prefers-reduced-motion: reduce, fuera de la vista o
   con la pestaña oculta no se mueve (tampoco con saveData). En el lugar «recreo» juega (ver
   «Juegos»): opciones.memoria recuerda qué juegos vio la persona (por defecto localStorage) y
   opciones.juego fuerza el primero. Si no puede moverse, se queda en la foto de su juego: aun
   quieta, cada visita la encuentra distinta. Devuelve {pose(), atuendo(), reaccionar(), ajustar(),
   cuadro(), celda, activa, juego, detener()}. */
mey.montar=function(host,opciones={}){
 const ventana=opciones.ventana||host.ownerDocument.defaultView;
 const doc=host.ownerDocument;
 const reloj=opciones.reloj||ventana;
 const azar=opciones.aleatorio||Math.random;
 const apariencia=mey.aparienciaLocal(ventana);
 const r=mey.resolver({...opciones,atuendo:opciones.atuendo||apariencia.leer()});
 let pose=r.pose,atuendo=r.atuendo;
 vestirMey(Array.from({length:18},vacia),atuendo,{},[]);
 const energiaPedida=opciones.energia||r.energia;
 if(!['completa','calma','quieta'].includes(energiaPedida))throw new Error('mey: energía desconocida: '+energiaPedida);
 const medir=()=>opciones.celda||celdaMey(r.eje==='alto'?host.clientHeight:host.clientWidth,14+ALTO_MEY,r);
 let celda=medir();
 const energia=()=>energiaPedida==='completa'&&celda<3?'calma':energiaPedida;
 const neutro=()=>({mirada:{dx:0,dy:0},parpadeo:false,salto:false,chapoteo:null,burbuja:null,saludo:false,fiesta:false,caminando:0,sentada:false,ojos:null,inclinar:0,burbujas:null,destello:null,seca:0,flotar:0,deCabeza:false});
 // Paseo: con energía completa y un espacio más ancho que ella, Mey camina por él. x en píxeles
 // (múltiplo de la celda), rumbo 1 a la derecha y -1 a la izquierda (se voltea en espejo).
 let x=0,rumbo=1,punteroX=null;
 const holgura=()=>Math.max(0,Math.floor((host.clientWidth-16*celda)/celda))*celda;
 const conPaseo=()=>opciones.paseo!==false&&energia()==='completa'&&holgura()>=8*celda;
 let e=neutro();
 let pintado='',temporizadores=new Set(),activo=false,ultimoPuntero=-Infinity,ocupada=false,visible=true;
 const recreo=opciones.juegos??r.juegos;
 // La memoria de la persona y, si no guarda nada (bloqueada o de prueba), la de esta visita.
 const guardada=opciones.memoria||(recreo?mey.memoriaLocal(ventana):null);
 let deLaVisita=null;
 const memoria={leer(){let d=null;try{d=guardada?.leer?.();}catch{}return d||deLaVisita;},guardar(d){deLaVisita=d;try{guardada?.guardar?.(d);}catch{}}};
 let jugando=null,pendiente=null,jugados=0,ultimaReaccion=null,ultimoJuego=null;
 const ahora=()=>ventana.performance?.now?.()??Date.now();
 // De cabeza (camina por el techo) es un espejo vertical del mismo dibujo.
 const estilo=()=>{const t=[];if(conPaseo())t.push('translateX('+x+'px)'+(rumbo<0?' scaleX(-1)':''));if(e.deCabeza)t.push('scaleY(-1)');return t.length?'display:block;transform:'+t.join(' '):'';};
 const pintar=()=>{
  if(conPaseo()){if(!host.style.position)host.style.position='relative';host.style.overflow='hidden';}
  const svg=svgMey(cuadroMey(pose,e,atuendo,false),pose,atuendo,{...opciones,celda,detalle:true,estilo:estilo()},true);if(svg!==pintado){host.innerHTML=svg;pintado=svg;}
 };
 const poner=cambios=>{e={...e,...cambios};pintar();};
 const despues=(ms,fn)=>{const id=reloj.setTimeout(()=>{temporizadores.delete(id);if(activo)fn();},ms);temporizadores.add(id);return id;};
 const entre=(a,b)=>a+Math.floor(azar()*(b-a));
 // Un paso es [ms, cambios] o [ms, función] (cambia pose, lugar o disfraz entre cuadros).
 const secuencia=(pasos,fin)=>{ocupada=true;let t=0;for(const [ms,cambios] of pasos){t+=ms;despues(t,()=>typeof cambios==='function'?cambios():poner(cambios));}despues(t+1,()=>{ocupada=false;fin&&fin();});};
 const parpadeo=()=>{if(!ocupada)secuencia([[0,{parpadeo:'ambos'}],[140,{parpadeo:false}]]);despues(entre(2400,5200),parpadeo);};
 const curiosa=()=>{
  if(!ocupada&&!jugando&&ahora()-ultimoPuntero>2000)secuencia([[0,{mirada:{dx:-1,dy:0}}],[700,{mirada:{dx:1,dy:0}}],[700,{mirada:{dx:0,dy:-1}}],[500,{mirada:{dx:0,dy:0}}]]);
  despues(entre(3500,7000),curiosa);
 };
 const TRAVESURAS={
  guino:[[0,{parpadeo:'guino'}],[90,{inclinar:-1}],[90,{salto:true,inclinar:0}],[120,{salto:false,inclinar:1}],[120,{inclinar:0}],[180,{parpadeo:false}]],
  chapoteo:[[0,{chapoteo:'izq'}],[120,{chapoteo:null}],[120,{chapoteo:'der'}],[120,{chapoteo:null}],[120,{chapoteo:'izq'}],[120,{chapoteo:'der'}],[120,{chapoteo:null}]],
  burbuja:[[0,{mirada:{dx:0,dy:-1},burbuja:0}],[220,{burbuja:1}],[220,{burbuja:2}],[220,{burbuja:3}],[220,{burbuja:4}],[260,{burbuja:null,mirada:{dx:0,dy:0}}]],
  saludo:[[0,{saludo:1}],[120,{saludo:2}],[120,{saludo:1}],[120,{saludo:false}],[120,{saludo:1}],[120,{saludo:2}],[120,{saludo:1}],[120,{saludo:false}]]
 };
 const traviesa=()=>{
  if(!ocupada){const nombres=Object.keys(TRAVESURAS);secuencia(TRAVESURAS[nombres[Math.floor(azar()*nombres.length)]]);}
  despues(entre(9000,16000),traviesa);
 };
 const alPuntero=ev=>{
  const b=host.getBoundingClientRect();if(!b.width)return;
  if(ev.clientY>=b.top&&ev.clientY<=b.bottom&&ev.clientX>=b.left&&ev.clientX<=b.right)punteroX=ev.clientX-b.left;
  ultimoPuntero=ahora();
  if(ocupada)return;
  const cx=b.left+(conPaseo()?x+8*celda:b.width/2),cy=b.top+b.height/2;
  const dx=ev.clientX<cx-b.width*.6?-1:ev.clientX>cx+b.width*.6?1:0;
  const dy=ev.clientY<cy-b.height*.6?-1:0;
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
 /* Camina hasta destino (px) alternando las patas. ms por paso, zancada en celdas, brinco (salta
    a cada paso), libre (puede salir del escenario: se esconde tras el borde) y pausa() → ms que
    se queda congelada antes del siguiente paso (0 sigue). En el recreo es torpe: a veces se
    tropieza a medio camino (y a veces hasta se cae sentada). Sin paseo llega en el acto. */
 const caminar=(destino,alLlegar,{ms=140,zancada=1,brinco=false,libre=false,pausa=null,torpe=recreo}={})=>{
  if(!conPaseo()){alLlegar&&alLlegar();return;}
  const borde=libre?17*celda:0;
  const meta=Math.max(-borde,Math.min(holgura()+borde,Math.round(destino/celda)*celda));
  if(meta===x){alLlegar&&alLlegar();return;}
  ocupada=true;rumbo=meta>x?1:-1;
  const total=Math.ceil(Math.abs(meta-x)/(zancada*celda));
  let tropiezo=torpe&&total>3&&azar()<.18?1+Math.floor(azar()*(total-2)):-1;
  const paso=n=>{
   if(!activo)return;
   if(n===tropiezo){
    tropiezo=-1;poner({inclinar:1,ojos:'grandes',caminando:1});
    if(azar()<.35)despues(160,()=>{poner({inclinar:0,sentada:true});despues(entre(600,1000),()=>{poner({sentada:false,ojos:null,mirada:{dx:-1,dy:0}});despues(250,()=>{poner({mirada:{dx:0,dy:0}});paso(n);});});});
    else despues(180,()=>{poner({inclinar:0,ojos:null});despues(ms,()=>paso(n));});
    return;
   }
   const espera=pausa?pausa():0;
   if(espera){despues(espera,()=>paso(n));return;}
   poner({caminando:n%2?3:4,sentada:false,salto:brinco&&n%2===0});
   despues(Math.floor(ms/2),()=>{
    x=rumbo>0?Math.min(meta,x+zancada*celda):Math.max(meta,x-zancada*celda);
    poner({caminando:n%2?1:2});
    if(x!==meta)despues(Math.ceil(ms/2),()=>paso(n+1));
    else despues(Math.ceil(ms/2),()=>{poner({caminando:0,salto:false});ocupada=false;alLlegar&&alLlegar();});
   });
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
 /* ---------- Recreo: los juegos ----------
    Cada juego tiene foto (cómo se ve quieta), inicio opcional (dónde y cómo la encuentras;
    primero = la persona recién llega) y correr(fin). Las direcciones de la mirada y de inclinarse
    son de Mey: al voltearse en espejo, el navegador las voltea con ella. */
 const uno=lista=>lista[Math.floor(azar()*lista.length)];
 const lado=()=>azar()<.5?-1:1;
 const fuera=s=>s<0?-17*celda:holgura()+17*celda;
 const asomo=s=>s<0?-9*celda:holgura()+9*celda;
 const alAzar=()=>Math.floor(azar()*(holgura()/celda+1))*celda;
 const aDistancia=n=>{const h=holgura(),d=n*celda,ops=[x+d,x-d].filter(v=>v>=0&&v<=h);return ops.length?uno(ops):(x>h/2?0:h);};
 const ponerX=(px,r)=>{x=px;if(r)rumbo=r;pintar();};
 const voltear=()=>{rumbo=-rumbo;pintar();};
 const risa=()=>[[0,{chapoteo:'izq',parpadeo:'ambos'}],[100,{chapoteo:null}],[100,{chapoteo:'der',parpadeo:false}],[100,{chapoteo:null,parpadeo:'ambos'}],[100,{chapoteo:'izq'}],[100,{chapoteo:'der',parpadeo:false}],[100,{chapoteo:null}]];
 // Saluda; a veces con tanto entusiasmo que se va de lado y se cae sentada.
 const saludo=()=>[[0,{saludo:1}],[110,{saludo:2}],[110,{saludo:1}],[110,{saludo:false}],[110,{saludo:1}],[110,{saludo:2}],[110,{saludo:1}],[110,{saludo:false}],...(azar()<.2?[[0,{saludo:2}],[150,{inclinar:1,saludo:false}],[150,{inclinar:-1}],[150,{inclinar:0,sentada:true,ojos:'grandes'}],[700,{ojos:null,parpadeo:'guino'}],[300,{parpadeo:false,sentada:false}]]:[])];
 const hipido=(t=0)=>[[t,{salto:true,ojos:'grandes',burbujas:[[9,3]]}],[110,{salto:false}],[200,{ojos:null,burbujas:[[9,2]]}],[200,{burbujas:[[9,1]]}],[200,{burbujas:[[9,0]]}],[200,{burbujas:null}]];
 const fiesta=()=>[[0,()=>{pose='exito';poner({fiesta:true});}],[1200,()=>{pose=r.pose;poner({fiesta:false});}]];
 // Sale corriendo por el borde más cercano (si ya jugaba) o aparece ya escondida (si recién llegas).
 const esconderse=(primero,s,listo)=>{if(!conPaseo())return listo();if(primero){ponerX(fuera(s),-s);return listo();}caminar(fuera(s),()=>{rumbo=-s;pintar();listo();},{ms:60,zancada:2,libre:true});};
 const cerca=()=>x>holgura()/2?1:-1;
 let lado0=1;
 const JUEGOS={
  // La encuentras dormida y roncando burbujas; la despiertas acercándote (o se despierta sola).
  siesta:{
   foto:()=>({pose:'dormido',e:{sentada:true}}),
   inicio(primero,listo){pose='dormido';if(primero&&conPaseo())x=alAzar();poner({sentada:true});listo();},
   correr(fin){
    const ronquidos=2+Math.floor(azar()*3);
    const despertar=()=>{pose=r.pose;secuencia([[0,{sentada:false,burbuja:null,ojos:'grandes',salto:true}],[160,{salto:false}],[520,{ojos:null,mirada:{dx:-1,dy:0}}],[420,{mirada:{dx:1,dy:0}}],[420,{mirada:{dx:0,dy:0},parpadeo:'guino'}],[300,{parpadeo:false}],...saludo()],fin);};
    const roncar=k=>{
     if(k>=ronquidos||ahora()-ultimoPuntero<1200)return despertar();
     secuencia([[0,{burbuja:0}],[300,{burbuja:1}],[300,{burbuja:2}],[300,{burbuja:3}],[300,{burbuja:4}],[300,{burbuja:null}]],()=>despues(entre(300,900),()=>roncar(k+1)));
    };
    roncar(0);
   }
  },
  // Escondidillas: se asoma por un borde, se esconde y reaparece por el otro.
  escondidillas:{
   foto:()=>({pose:'hola',e:{mirada:{dx:1,dy:0}}}),
   inicio(primero,listo){lado0=primero?lado():cerca();esconderse(primero,lado0,listo);},
   correr(fin){
    // Sin espacio para esconderse: juega «¿dónde está Mey?… ¡bu!» en su lugar.
    if(!conPaseo()){const pasos=[];for(let i=0,n=2+Math.floor(azar()*2);i<n;i++)pasos.push([i?entre(300,600):0,{parpadeo:'ambos',mirada:{dx:0,dy:0}}],[entre(700,1300),{parpadeo:false,ojos:'grandes',salto:true}],[150,{salto:false}],[400,{ojos:null,mirada:{dx:i%2?1:-1,dy:0}}],[350,{mirada:{dx:0,dy:0}}]);return secuencia([...pasos,...saludo(),...risa()],fin);}
    const s=lado0,o=azar()<.7?-s:s;
    secuencia([[0,()=>ponerX(asomo(s),-s)],[0,{mirada:{dx:1,dy:0}}],[entre(600,1000),{mirada:{dx:0,dy:0},ojos:'grandes'}],[450,()=>{ponerX(fuera(s));poner({ojos:null});}],[entre(700,1500),()=>ponerX(asomo(o),-o)],[0,{mirada:{dx:1,dy:-1}}],[entre(600,900),{mirada:{dx:0,dy:0},parpadeo:'guino'}],[300,{parpadeo:false}]],
     ()=>caminar(o<0?entre(4,24)*celda:holgura()-entre(4,24)*celda,()=>secuencia([...saludo(),...risa()],fin),{ms:70,zancada:2,libre:true,brinco:true}));
   }
  },
  // Persigue una burbuja que suelta, la burbuja revienta y ella se queda chiquita.
  burbuja:{
   foto:()=>({pose:'hola',e:{burbujas:[[11,2],[13,0]],mirada:{dx:1,dy:0}}}),
   correr(fin){
    const volar=[[0,{mirada:{dx:0,dy:-1},burbujas:[[9,4]]}],[260,{burbujas:[[10,3]]}],[260,{burbujas:[[12,2]],mirada:{dx:1,dy:-1}}],[260,{burbujas:[[13,1]]}],[260,{burbujas:[[14,1]],mirada:{dx:1,dy:0}}]];
    const reventar=[[0,{burbujas:[[14,0]]}],[260,{burbujas:null,destello:[14,1],ojos:'grandes',mirada:{dx:0,dy:0}}],[220,{destello:null}],[400,()=>{pose='aviso';poner({ojos:null});}],[900,()=>{pose=r.pose;pintar();}],...risa()];
    secuencia(volar,()=>caminar(aDistancia(entre(8,24)),()=>secuencia(reventar,fin),{ms:entre(90,150),brinco:azar()<.5}));
   }
  },
  // Probador: se cambia de disfraz de un brinco en otro y se queda con el que más le gusta.
  probador:{
   foto:()=>({pose:'hola',atuendo:uno(['gala','charro','luchador']),e:{parpadeo:'guino'}}),
   correr(fin){
    const lista=barajarMey(ATUENDOS_MEY.filter(a=>a!==atuendo&&a!=='ninguno'),azar);
    const pasos=[];
    for(const a of lista)pasos.push([0,{salto:true}],[110,()=>{atuendo=a;poner({salto:false});}],[entre(500,900),{mirada:{dx:uno([-1,1]),dy:0}}],[entre(350,600),{mirada:{dx:0,dy:0}}]);
    const final=uno([...lista,'rebozo']);
    pasos.push([0,{salto:true}],[110,()=>{atuendo=final;poner({salto:false,parpadeo:'guino'});}],[400,{parpadeo:false}],...saludo());
    secuencia(pasos,fin);
   }
  },
  // Baile: pasos al azar sin repetir el anterior y papel picado al final.
  baile:{
   foto:()=>({pose:'exito',e:{fiesta:true}}),
   correr(fin){
    const movs=[()=>[[0,{chapoteo:'izq'}],[170,{chapoteo:'der'}],[170,{chapoteo:null}]],()=>[[0,{salto:true}],[150,{salto:false}]],()=>[[0,voltear]],()=>[[0,{inclinar:1}],[180,{inclinar:-1}],[180,{inclinar:0}]],()=>[[0,{saludo:true}],[170,{saludo:false}]],()=>[[0,{parpadeo:'guino',salto:true}],[150,{salto:false,parpadeo:false}]]];
    const pasos=[],n=6+Math.floor(azar()*6);let previo=-1;
    for(let i=0;i<n;i++){let k=Math.floor(azar()*movs.length);if(k===previo)k=(k+1)%movs.length;previo=k;const m=movs[k]();m[0][0]=i?entre(160,300):0;pasos.push(...m);}
    secuencia([...pasos,[250,{sentada:true,parpadeo:'ambos'}],[140,{sentada:false,parpadeo:false,ojos:'grandes'}],[140,{ojos:null}],...saludo(),...fiesta()],fin);
   }
  },
  // Hipo: brinquitos con burbuja y cara de «perdón».
  hipo:{
   foto:()=>({pose:'hola',e:{burbujas:[[9,2]],ojos:'grandes'}}),
   correr(fin){
    const pasos=[],n=3+Math.floor(azar()*3);
    for(let i=0;i<n;i++)pasos.push(...hipido(i?entre(700,1600):300),[0,{mirada:{dx:uno([-1,0,1]),dy:0}}]);
    secuencia([...pasos,[500,{mirada:{dx:0,dy:0},parpadeo:'guino'}],[350,{parpadeo:false}],...risa()],fin);
   }
  },
  // Da vueltas cada vez más rápido, se marea, se sienta y sacude la cabeza.
  mareo:{
   foto:()=>({pose:'hola',e:{sentada:true,inclinar:uno([-1,1]),mirada:{dx:1,dy:-1}}}),
   correr(fin){
    const pasos=[],vueltas=6+Math.floor(azar()*5);
    for(let i=0;i<vueltas;i++)pasos.push([Math.max(70,240-i*22),voltear]);
    const circulo=[{dx:1,dy:0},{dx:1,dy:-1},{dx:0,dy:-1},{dx:-1,dy:-1},{dx:-1,dy:0},{dx:0,dy:0}];
    for(let i=0;i<12;i++)pasos.push([140,{mirada:circulo[i%6],inclinar:i%4<2?1:-1}]);
    secuencia([...pasos,[200,{sentada:true,inclinar:0,mirada:{dx:0,dy:0}}],[entre(1200,2000),{mirada:{dx:-1,dy:0}}],[200,{mirada:{dx:1,dy:0}}],[200,{mirada:{dx:-1,dy:0}}],[200,{mirada:{dx:0,dy:0},sentada:false}],[300,{parpadeo:'guino'}],[300,{parpadeo:false}]],fin);
   }
  },
  // Llega corriendo, se tropieza, se ríe de sí misma y saluda.
  carrera:{
   foto:()=>({pose:'hola',e:{sentada:true,ojos:'grandes'}}),
   inicio(primero,listo){lado0=primero?lado():cerca();esconderse(primero,lado0,listo);},
   correr(fin){
    const tropiezo=[[0,{inclinar:1,caminando:1,ojos:'grandes'}],[180,{inclinar:0,caminando:0,sentada:true}],[700,{ojos:null,mirada:{dx:-1,dy:0}}],[350,{mirada:{dx:1,dy:0}}],[350,{mirada:{dx:0,dy:0}}],...risa(),[200,{sentada:false}],...saludo()];
    caminar(lado0<0?entre(6,30)*celda:holgura()-entre(6,30)*celda,()=>secuencia(tropiezo,fin),{ms:60,zancada:2,libre:true});
   }
  },
  // Estornudo (a veces falsa alarma primero): ¡achú! de burbujas.
  estornudo:{
   foto:()=>({pose:'hola',e:{parpadeo:'ambos',inclinar:-1}}),
   correr(fin){
    const nube=()=>Array.from({length:5+Math.floor(azar()*4)},()=>[entre(1,15),entre(0,6)]);
    const aguantar=[[0,{parpadeo:'ambos',inclinar:-1}],[entre(400,700),{inclinar:0}],[250,{inclinar:-1}]];
    const falsa=azar()<.5?[[entre(500,800),{inclinar:0,parpadeo:false,ojos:'grandes'}],[entre(600,1100),{ojos:null,mirada:{dx:0,dy:-1}}],[entre(500,900),{mirada:{dx:0,dy:0}}],[entre(300,700),{inclinar:-1,parpadeo:'ambos'}]]:[];
    secuencia([...aguantar,...falsa,[entre(300,600),{inclinar:1,salto:true,parpadeo:false,ojos:'grandes',burbujas:nube()}],[150,{salto:false}],[250,{burbujas:nube()}],[250,{burbujas:nube()}],[300,{burbujas:null,inclinar:0,ojos:null}],[350,{mirada:{dx:-1,dy:0}}],[300,{mirada:{dx:1,dy:0}}],[300,{mirada:{dx:0,dy:0}}],...risa()],fin);
   }
  },
  // Lee mientras camina, choca con algo invisible, se voltea y sigue leyendo.
  lectura:{
   foto:()=>({pose:'leyendo'}),
   inicio(primero,listo){pose='leyendo';pintar();listo();},
   correr(fin){
    // Lee renglón por renglón (los ojos van de un lado a otro); sin espacio, cabecea y despierta de golpe.
    const leer=[];for(let i=0,n=2+Math.floor(azar()*3);i<n;i++)leer.push([i?300:0,{mirada:{dx:-1,dy:0}}],[entre(500,800),{mirada:{dx:0,dy:0}}],[entre(400,700),{mirada:{dx:1,dy:0}}]);
    if(!conPaseo())return secuencia([...leer,[400,{mirada:{dx:0,dy:0},parpadeo:'ambos'}],[600,{inclinar:1}],[entre(700,1200),{inclinar:0,parpadeo:false,ojos:'grandes',salto:true}],[150,{salto:false}],[400,()=>{pose=r.pose;poner({ojos:null});}],...risa()],fin);
    const choque=[[0,()=>{pose=r.pose;poner({salto:true,ojos:'grandes',inclinar:-1});}],[150,{salto:false}],[500,{inclinar:0,ojos:null,mirada:{dx:-1,dy:0}}],[400,{mirada:{dx:0,dy:0}}],[300,()=>{voltear();pose='leyendo';pintar();}],[entre(500,1000),()=>{}]];
    secuencia([...leer,[300,{mirada:{dx:0,dy:0}}]],()=>caminar(aDistancia(entre(8,20)),()=>secuencia(choque,()=>caminar(aDistancia(entre(5,14)),()=>{pose=r.pose;pintar();fin();},{ms:260})),{ms:260}));
   }
  },
  // Piensa con la mirada arriba, se le prende el foco, corre brincando y celebra.
  idea:{
   foto:()=>({pose:'pensando'}),
   inicio(primero,listo){pose='pensando';pintar();listo();},
   correr(fin){
    secuencia([[0,{mirada:{dx:0,dy:-1}}],[entre(900,1500),{mirada:{dx:1,dy:-1}}],[entre(700,1200),{mirada:{dx:-1,dy:-1}}],[entre(700,1200),()=>{pose=r.pose;poner({destello:[13,1],salto:true,ojos:'grandes',mirada:{dx:0,dy:0}});}],[160,{salto:false}],[450,{destello:null,ojos:null}]],
     ()=>caminar(aDistancia(entre(6,20)),()=>secuencia([[0,{parpadeo:'guino',salto:true}],[150,{salto:false}],[150,{parpadeo:false,saludo:true}],[200,{saludo:false}],...fiesta()],fin),{ms:90,brinco:true}));
   }
  },
  // El gran salto (ironía): se prepara muchísimo, tiembla de concentración… y el salto es de una
  // celda. Aterriza orgullosa y saluda como si nada.
  gransalto:{
   foto:()=>({pose:'hola',e:{sentada:true,parpadeo:'ambos'}}),
   correr(fin){
    const temblor=[];for(let i=0,n=6+Math.floor(azar()*6);i<n;i++)temblor.push([i?90:entre(500,900),{inclinar:i%2?1:-1}]);
    secuencia([[0,{sentada:true,parpadeo:'ambos'}],...temblor,[200,{inclinar:0,parpadeo:false,ojos:'grandes'}],[500,{sentada:false,salto:true,ojos:null}],[90,{salto:false}],[entre(500,900),{mirada:{dx:-1,dy:0}}],[400,{mirada:{dx:1,dy:0}}],[400,{mirada:{dx:0,dy:0},parpadeo:'guino'}],[300,{parpadeo:false}],...saludo()],fin);
   }
  },
  // Resbalón: de tanto jugar le escurre una gota de sudor, la gota llega al piso y ella la pisa.
  // Después mira a los lados: «¿nadie vio?».
  resbalon:{
   foto:()=>({pose:'hola',e:{sentada:true,inclinar:-1,ojos:'grandes'}}),
   correr(fin){
    const gota=[[14,8],[14,9],[14,11],[14,13],[14,15],[14,17]];
    secuencia([...gota.map(([x,y],i)=>[i?entre(160,240):0,{burbujas:[[x,y]]}]),[entre(500,900),{mirada:{dx:1,dy:0}}],[400,{mirada:{dx:0,dy:0},caminando:2}],[160,{caminando:1,burbujas:null,inclinar:-1,salto:true,ojos:'grandes'}],[140,{salto:false,caminando:0,inclinar:0,sentada:true}],[700,{mirada:{dx:-1,dy:0}}],[220,{mirada:{dx:1,dy:0}}],[220,{mirada:{dx:-1,dy:0}}],[220,{mirada:{dx:0,dy:0},ojos:null}],[400,{sentada:false,parpadeo:'guino'}],[300,{parpadeo:false}],...saludo()],fin);
   }
  },
  // La burbuja la persigue a ella: huye mirando atrás y la burbuja le revienta en la cara.
  perseguida:{
   foto:()=>({pose:'hola',e:{burbujas:[[1,5]],ojos:'grandes',mirada:{dx:-1,dy:0}}}),
   correr(fin){
    secuencia([[0,{burbujas:[[9,4]],mirada:{dx:0,dy:-1}}],[300,{burbujas:[[7,3]]}],[300,{burbujas:[[4,3]],mirada:{dx:-1,dy:0}}],[300,{burbujas:[[2,5]],ojos:'grandes'}],[400,()=>{}]],
     ()=>caminar(aDistancia(entre(10,26)),()=>secuencia([[0,{burbujas:[[3,4]],mirada:{dx:0,dy:0}}],[200,{burbujas:[[5,5]]}],[200,{burbujas:null,destello:[6,4],parpadeo:'ambos',ojos:null}],[300,{destello:null}],[400,{parpadeo:false}],...risa()],fin),{ms:80}));
   }
  },
  // Se le olvida la gravedad: flota, patalea en el aire, se acuerda… y cae de sentón.
  gravedad:{
   foto:()=>({pose:'hola',e:{flotar:2,ojos:'grandes',caminando:1}}),
   correr(fin){
    const pasos=[[0,{ojos:'grandes'}]];
    for(let k=1;k<=4;k++)pasos.push([entre(350,550),{flotar:k,caminando:k%2?1:2}]);
    for(let i=0,n=3+Math.floor(azar()*4);i<n;i++)pasos.push([200,{caminando:i%2?1:2,mirada:{dx:i%2?1:-1,dy:0}}]);
    secuencia([...pasos,[entre(500,900),{caminando:0,mirada:{dx:0,dy:0},ojos:null,parpadeo:'guino'}],[350,{parpadeo:false,ojos:'grandes'}],[120,{flotar:2}],[80,{flotar:0,inclinar:1}],[140,{inclinar:0,sentada:true}],[600,{ojos:null,mirada:{dx:-1,dy:0}}],[300,{mirada:{dx:1,dy:0}}],[300,{mirada:{dx:0,dy:0},sentada:false}],...risa()],fin);
   }
  },
  // Se evapora (química pura): pierde el líquido de las perneras fila por fila, se preocupa,
  // se junta una nube arriba y le llueve adentro hasta quedar llena otra vez.
  evaporacion:{
   foto:()=>({pose:'hola',e:{seca:2,mirada:{dx:0,dy:-1},burbujas:[[5,1],[10,0]]}}),
   correr(fin){
    const vapor=k=>[entre(500,800),{seca:k,burbujas:[[entre(3,13),entre(0,3)],[entre(3,13),entre(0,3)]]}];
    const nube=[[6,0],[7,0],[8,0],[9,0],[5,1],[10,1]];
    secuencia([[0,{mirada:{dx:0,dy:-1}}],vapor(1),vapor(2),vapor(3),[500,{ojos:'grandes',burbujas:null}],[700,{ojos:null,mirada:{dx:-1,dy:0}}],[500,{mirada:{dx:1,dy:0}}],[500,{mirada:{dx:0,dy:-1},burbujas:nube}],[600,{burbujas:[...nube,[7,2],[9,1]]}],[250,{burbujas:[...nube,[7,3],[9,2],[6,1]],seca:2}],[250,{burbujas:[...nube,[9,3],[6,2],[8,1]],seca:1}],[250,{burbujas:[...nube,[6,3],[8,2]],seca:0}],[300,{burbujas:null,mirada:{dx:0,dy:0}}],...risa()],fin);
   }
  },
  // Camina por el techo: de un brinco queda de cabeza, pasea así tan campante y se cae.
  techo:{
   foto:()=>({pose:'hola',e:{deCabeza:true}}),
   correr(fin){
    const caida=[[300,{mirada:{dx:0,dy:-1}}],[600,{ojos:'grandes'}],[300,{deCabeza:false,inclinar:1}],[140,{inclinar:0,sentada:true}],[600,{ojos:null,mirada:{dx:-1,dy:-1}}],[200,{mirada:{dx:1,dy:-1}}],[200,{mirada:{dx:0,dy:0},sentada:false}],...risa()];
    secuencia([[0,{salto:true}],[120,{salto:false}],[150,{salto:true}],[120,{deCabeza:true,salto:false,ojos:'grandes'}],[600,{ojos:null}]],
     ()=>caminar(aDistancia(entre(5,14)),()=>secuencia(caida,fin),{ms:200,torpe:false}));
   }
  },
  // Estatuas de marfil: avanza de puntitas y se congela si mueves el puntero (o cuando se le antoja).
  estatuas:{
   foto:()=>({pose:'hola',e:{caminando:1,ojos:'grandes'}}),
   correr(fin){
    let congelada=0;
    const pausa=()=>{
     if(congelada<25&&(ahora()-ultimoPuntero<700||azar()<.08)){congelada++;if(!e.ojos)poner({ojos:'grandes'});return 450;}
     if(e.ojos)poner({ojos:null});return 0;
    };
    // Sin espacio: baila en su lugar y se congela en poses chistosas, con ojos de «¿me viste?».
    if(!conPaseo()){
     const quieta={chapoteo:null,saludo:false,inclinar:0,salto:false},poses=[{chapoteo:'izq'},{chapoteo:'der'},{saludo:true},{inclinar:1},{inclinar:-1},{salto:true}];
     const pasos=[];for(let i=0,n=8+Math.floor(azar()*5);i<n;i++){pasos.push([entre(220,380),{...quieta,...uno(poses)}]);if(azar()<.3)pasos.push([0,{ojos:'grandes'}],[entre(700,1100),{ojos:null}]);}
     return secuencia([...pasos,[250,quieta],...risa()],fin);
    }
    const tramos=2+Math.floor(azar()*2);
    const tramo=k=>{
     if(k>=tramos)return secuencia([[0,{ojos:null,caminando:0,parpadeo:'guino'}],[350,{parpadeo:false}],...risa()],fin);
     caminar(aDistancia(entre(5,14)),()=>despues(entre(300,700),()=>tramo(k+1)),{ms:240,pausa});
    };
    tramo(0);
   }
  }
 };
 const empezar=nombre=>{
  let n=nombre||pendiente||mey.siguienteJuego(memoria,azar);
  // Nunca el mismo juego dos veces seguidas, aunque el primero haya venido forzado.
  if(!nombre&&!pendiente&&n===ultimoJuego&&JUEGOS_MEY.length>1)n=mey.siguienteJuego(memoria,azar);
  pendiente=null;jugando=n;ultimoJuego=n;
  const primero=!jugados++;
  pose=r.pose;atuendo=opciones.atuendo||apariencia.leer();e=neutro();
  // Recién llegas: también el lugar y hacia dónde mira cambian (el juego puede moverla después).
  if(primero&&conPaseo()){x=alAzar();rumbo=lado();}
  pintar();
  const listo=()=>despues(primero?entre(500,1200):entre(300,700),()=>JUEGOS[n].correr(terminar));
  JUEGOS[n].inicio?JUEGOS[n].inicio(primero,listo):listo();
 };
 const otroJuego=()=>ocupada?despues(800,otroJuego):empezar();
 const terminar=()=>{jugando=null;pose=r.pose;atuendo=opciones.atuendo||apariencia.leer();e=neutro();pintar();despues(entre(3500,8000),otroJuego);};
 const foto=n=>{const f=JUEGOS[n].foto();pose=f.pose;if(f.atuendo)atuendo=f.atuendo;e={...neutro(),...f.e};if(conPaseo()){x=alAzar();rumbo=lado();}};
 // Al clic, en el recreo reacciona distinto cada vez (nunca dos veces seguidas lo mismo).
 const REACCIONES={celebrar:null,risa,tropiezo:()=>[[0,{inclinar:1,ojos:'grandes'}],[160,{inclinar:0,sentada:true}],[700,{ojos:null,parpadeo:'guino'}],[300,{parpadeo:false,sentada:false}]],guino:()=>TRAVESURAS.guino,hipo:()=>hipido(),sorpresa:()=>[[0,{ojos:'grandes',salto:true,inclinar:-1}],[150,{salto:false}],[450,{ojos:null,inclinar:0}]]};
 const alClic=()=>{
  ultimoPuntero=ahora();
  if(energia()!=='completa')return;
  if(!recreo)return celebrar();
  if(!activo||ocupada)return;
  const n=uno(Object.keys(REACCIONES).filter(k=>k!==ultimaReaccion));ultimaReaccion=n;
  n==='celebrar'?celebrar():secuencia(REACCIONES[n]());
 };
 const reducido=ventana.matchMedia?ventana.matchMedia('(prefers-reduced-motion: reduce)'):null;
 const puedeMoverse=()=>opciones.vivo!==false&&energia()!=='quieta'&&!(reducido&&reducido.matches)&&!ventana.navigator?.connection?.saveData&&visible&&!doc.hidden;
 const parar=()=>{
  const estaba=activo;
  activo=false;ocupada=false;for(const id of temporizadores)reloj.clearTimeout(id);temporizadores.clear();ventana.removeEventListener('pointermove',alPuntero);
  // En el recreo, quieta desde el principio conserva la foto de su juego. Si deja un juego a
  // medias (sale de la vista), lo retoma desde el principio al volver.
  if(!recreo||estaba)e=neutro();
  if(recreo){if(jugando){pendiente=jugando;jugados=0;jugando=null;pose=r.pose;}x=Math.max(0,Math.min(holgura(),x));}
  pintar();
 };
 const arrancar=()=>{
  if(activo||!puedeMoverse())return;
  activo=true;
  despues(entre(1200,2600),parpadeo);
  if(energia()!=='completa')return;
  ventana.addEventListener('pointermove',alPuntero,{passive:true});despues(entre(2000,4000),curiosa);
  if(recreo)empezar();else{despues(entre(5000,9000),traviesa);despues(entre(1500,3500),pasear);}
 };
 const revisar=()=>puedeMoverse()?arrancar():parar();
 const ajustar=()=>{const nueva=medir();if(nueva!==celda){const antes=energia();celda=nueva;x=Math.round(x/celda)*celda;if(energia()!==antes){parar();revisar();return;}}x=Math.min(x,holgura());pintar();};
 const alCambiarApariencia=()=>{if(!opciones.atuendo&&jugando!=='probador'){atuendo=apariencia.leer();pintar();}};
 host.addEventListener('click',alClic);
 doc.addEventListener('visibilitychange',revisar);
 reducido?.addEventListener?.('change',revisar);
 ventana.addEventListener('erlen-mey-apariencia',alCambiarApariencia);
 ventana.addEventListener('storage',alCambiarApariencia);
 let observador=null,medidor=null;
 if(ventana.IntersectionObserver){observador=new ventana.IntersectionObserver(entradas=>{visible=entradas.some(x=>x.isIntersecting);revisar();});observador.observe(host);}
 // Con celda fija también observa: el hueco para pasear cambia con el ancho.
 if(ventana.ResizeObserver){medidor=new ventana.ResizeObserver(()=>ajustar());medidor.observe(r.eje==='alto'?host:(host.parentElement||host));}
 host.dataset.meyViva='';
 if(recreo){
  if(opciones.juego&&!JUEGOS[opciones.juego])throw new Error('mey: juego desconocido: '+opciones.juego);
  pendiente=opciones.juego||mey.siguienteJuego(memoria,azar);
  if(!puedeMoverse()||energia()!=='completa')foto(pendiente);
 }
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
  get juego(){return jugando||pendiente;},
  get reaccion(){return ultimaReaccion;},
  detener(){parar();host.removeEventListener('click',alClic);doc.removeEventListener('visibilitychange',revisar);reducido?.removeEventListener?.('change',revisar);ventana.removeEventListener('erlen-mey-apariencia',alCambiarApariencia);ventana.removeEventListener('storage',alCambiarApariencia);observador?.disconnect();medidor?.disconnect();delete host.dataset.meyViva;}
 };
};
mey.travesuras=['guino','chapoteo','burbuja','saludo','celebrar'];
mey.juegos=JUEGOS_MEY;

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
     ejemplos?: [{id, disciplina, arte?, imagen?, titulo, descripcion?, accion, etiqueta?}],
     // arte: SVG del contenido o texto; imagen: archivo local relativo a la raíz de la app
     // (p. ej. 'ejemplos/muestra.webp'). Nunca URLs externas, absolutas ni data:.
     biblioteca?: {listar: () => [{id, titulo, detalle?, fecha?, miniatura?, abrir, duplicar?, descargar?,
                                    renombrar?: (nuevoTitulo) => void | Promise<void>,
                                    eliminar?: () => void | Promise<void>}],
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
  const b=el('button',{type:'button',class:'erlen-inicio-nueva'},el('span',{class:'erlen-inicio-mas','aria-hidden':'true'},'+'),el('span',{class:'erlen-inicio-nueva-datos'},el('strong',null,config.nuevo.etiqueta),config.nuevo.detalle?el('small',null,config.nuevo.detalle):null));
  b.addEventListener('click',alEditor(config.nuevo.accion));
  return b;
 }
 function tarjetaEjemplo(e){
  const arte=el('div',{class:'erlen-inicio-arte','aria-hidden':'true'});
  // La ruta debe quedar dentro de la app incluso tras normalizar segmentos codificados.
  const base=new URL('.',doc.baseURI);
  const imagen=typeof e.imagen==='string'&&e.imagen.trim()&&!/^[\\/]|[?#:]|\\/.test(e.imagen)?new URL(e.imagen,base):null;
  if(imagen&&imagen.origin===base.origin&&imagen.pathname.startsWith(base.pathname))
   arte.append(el('img',{src:e.imagen,alt:'',loading:'lazy',decoding:'async'}));
  else if(typeof e.arte==='string'&&e.arte.trim().startsWith('<svg'))arte.innerHTML=e.arte;
  else arte.textContent=e.arte||'';
  return el('article',{class:'erlen-inicio-ejemplo con-arte','data-busqueda':[e.disciplina,e.titulo,e.descripcion].join(' ').toLowerCase()},
   arte,el('div',{class:'erlen-inicio-ejemplo-datos'},e.disciplina?el('span',{class:'erlen-inicio-eyebrow'},e.disciplina):null,el('h2',null,e.titulo),e.descripcion?el('p',{class:'erlen-inicio-solo-lectura'},e.descripcion):null),
   boton(e.etiqueta||'Abrir ejemplo',alEditor(e.accion),'primario',{'aria-label':(e.etiqueta||'Abrir ejemplo')+' · '+e.titulo}));
 }
 function pintarInicio(c){
  const buscar=el('input',{type:'search',class:'erlen-inicio-campo',placeholder:'Buscar un ejemplo…','aria-label':'Buscar ejemplos'});
  const rejilla=el('section',{class:'erlen-inicio-rejilla erlen-inicio-coleccion','aria-label':'Colección de inicio'},tarjetaNueva(),(config.ejemplos||[]).map(tarjetaEjemplo));
  buscar.addEventListener('input',()=>{const q=buscar.value.trim().toLowerCase();for(const t of rejilla.querySelectorAll('.erlen-inicio-ejemplo'))t.hidden=!!q&&!t.dataset.busqueda.includes(q);});
  const [texto,em]=Array.isArray(config.titulo)?config.titulo:[config.titulo||config.nombre];
  c.append(el('div',{class:'erlen-inicio-bienvenida'},
   el('div',null,config.eyebrow?el('span',{class:'erlen-inicio-eyebrow'},config.eyebrow):null,titulo(texto,em),config.lead?el('p',{class:'erlen-inicio-lead'},config.lead):null),
   config.ejemplos&&config.ejemplos.length?el('label',{class:'erlen-inicio-buscar'},buscar):null));
  if(config.mey!==false&&typeof config.mey!=='function'&&mey.definir(doc.defaultView))
   c.append(el('div',{class:'erlen-inicio-recreo','aria-hidden':'true'},el('erlen-mey',{lugar:'recreo',app:config.app||(config.corto||'').toLowerCase()||null})));
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
  const rejilla=el('section',{class:'erlen-inicio-rejilla erlen-inicio-biblioteca','aria-label':nombres.biblioteca});
  const conteo=el('p',{class:'erlen-inicio-nota',role:'status'});
  const fallo=(verbo,e)=>{aviso={texto:'No se pudo '+verbo+': '+(e&&e.message||e),error:true};pintar();};
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
   for(const i of items){
    const nombre=i.titulo||'Sin título';
    rejilla.append(el('article',{class:'erlen-inicio-tarjeta'},
    el('div',{class:'erlen-inicio-miniatura','aria-hidden':'true'},el('small',null,'En este navegador'),el('span',null,i.miniatura||i.titulo||'Sin título')),
    el('div',{class:'erlen-inicio-tarjeta-cuerpo'},el('h3',null,i.titulo||'Sin título'),i.detalle||i.fecha?el('p',null,[i.detalle,i.fecha].filter(Boolean).join(' · ')):null,
     el('div',{class:'erlen-inicio-acciones'},boton('Abrir',alEditor(i.abrir),'primario',{'aria-label':'Abrir «'+(i.titulo||'Sin título')+'»'}),
      i.duplicar?boton('Duplicar',()=>{Promise.resolve().then(()=>i.duplicar()).then(repintar,e=>fallo('duplicar',e));},'secundario',{'aria-label':'Duplicar «'+nombre+'»'}):null,
      i.descargar?boton('Descargar',()=>i.descargar(),'secundario',{'aria-label':'Descargar «'+nombre+'»'}):null,
      typeof i.renombrar==='function'?boton('Renombrar',()=>{
       const respuesta=doc.defaultView.prompt('Nuevo nombre para «'+nombre+'»',nombre);
       if(respuesta===null)return;
       const nuevo=respuesta.trim();
       if(!nuevo){fallo('renombrar','el nombre no puede estar vacío');return;}
       if(nuevo!==nombre)Promise.resolve().then(()=>i.renombrar(nuevo)).then(repintar,e=>fallo('renombrar',e));
      },'secundario',{'aria-label':'Renombrar «'+nombre+'»'}):null,
      typeof i.eliminar==='function'?boton('Eliminar',()=>{
       if(doc.defaultView.confirm('¿Eliminar «'+nombre+'»? Esta acción no se puede deshacer.'))
        Promise.resolve().then(()=>i.eliminar()).then(repintar,e=>fallo('eliminar',e));
      },'peligro',{'aria-label':'Eliminar «'+nombre+'»'}):null))));
   }
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
   el('section',{class:'erlen-inicio-rejilla erlen-inicio-coleccion','aria-label':nombres.ejemplos},tarjetaNueva(),config.ejemplos.map(tarjetaEjemplo)));
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
