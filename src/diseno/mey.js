/* erlen-diseno 2.11.10 · generado por @erlen/design/tools/generate; no editar a mano */
const erlenMey=(()=>{
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
// Autorizado por el usuario el 2026-10-04: más colores para Mey, independientes del portal.
const PALETAS_MEY=Object.freeze({
 verde:Object.freeze({g:'#83d4ad',w:'#177451'}),
 violeta:Object.freeze({g:'#d9c8ef',w:'#59368b'}),
 azul:Object.freeze({g:'#b9dff5',w:'#205e94'}),
 cobre:Object.freeze({g:'#f2d0b9',w:'#864522'}),
 rosa:Object.freeze({g:'#f8bddc',w:'#a7005a'}),
 cempasuchil:Object.freeze({g:'#ffe0a3',w:'#9c5800'})
});
function coloresMey(color='verde'){
 if(!Object.hasOwn(PALETAS_MEY,color))throw new Error('mey: color desconocido: '+color);
 return {...COLOR_MEY,...PALETAS_MEY[color]};
}
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

function celdasMey(filas,dy,colores=COLOR_MEY,material=false){
 let r='';
 filas.forEach((fila,y)=>{
  if(fila.length!==16)throw new Error('mey: la fila '+y+' mide '+fila.length+', no 16');
  for(let x=0;x<16;){
   const c=fila[x];
   if(c==='.'){x++;continue;}
   if(!colores[c])throw new Error('mey: celda desconocida «'+c+'» en ('+x+','+y+')');
   let n=1;
   while(x+n<16&&colores[fila[x+n]]===colores[c])n++;
   r+='<rect x="'+x+'" y="'+(y+dy)+'" width="'+n+'" height="1" fill="'+colores[c]+'"'+(material?' data-mey-pigmento="'+c+'"':'')+'/>';
   x+=n;
  }
 });
 return r;
}

// El contorno gana pasos conectados de 1/2 y 1/4 de celda en tamaños grandes.
// El favicon de 16 px conserva la cuadrícula simple para no emborronarse.
function detallesMey(filas,dy,colores=COLOR_MEY,material=false){
 let r='';
 const punto=(x,y,c,t=.5)=>{r+='<rect x="'+x+'" y="'+(y+dy)+'" width="'+t+'" height="'+t+'" fill="'+colores[c]+'"'+(material?' data-mey-pigmento="'+c+'"':'')+'/>';};
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

// Contornos de regiones conectadas: elimina las divisiones entre píxeles y conserva
// los huecos. Cada arte puede elegir una silueta angular o curvas continuas.
function contornoMey(filas,acepta,dy=0,suave=false){
 const bordes=new Map(),clave=p=>p.join(','),hay=(x,y)=>!!filas[y]?.[x]&&acepta(filas[y][x],x,y);
 const agrega=(a,b)=>{const k=clave(a);if(!bordes.has(k))bordes.set(k,[]);bordes.get(k).push(b);};
 filas.forEach((fila,y)=>fila.forEach((c,x)=>{if(!acepta(c,x,y))return;
  if(!hay(x,y-1))agrega([x,y],[x+1,y]);if(!hay(x+1,y))agrega([x+1,y],[x+1,y+1]);
  if(!hay(x,y+1))agrega([x+1,y+1],[x,y+1]);if(!hay(x-1,y))agrega([x,y+1],[x,y]);
 }));
 const punto=p=>Number(p[0].toFixed(2))+','+Number((p[1]+dy).toFixed(2)),rutas=[];
 while(bordes.size){
  const inicio=bordes.keys().next().value.split(',').map(Number),poligono=[inicio];let actual=inicio,previa=[inicio[0]-1,inicio[1]];
  do{
   const k=clave(actual),opciones=bordes.get(k);if(!opciones?.length)break;
   const dx=actual[0]-previa[0],dy0=actual[1]-previa[1],prioridad=b=>{const ex=b[0]-actual[0],ey=b[1]-actual[1];return dx*ey-dy0*ex===1?3:dx*ex+dy0*ey===1?2:dx*ey-dy0*ex===-1?1:0;};
   opciones.sort((a,b)=>prioridad(b)-prioridad(a));const siguiente=opciones.shift();if(!opciones.length)bordes.delete(k);
   previa=actual;actual=siguiente;if(clave(actual)!==clave(inicio))poligono.push(actual);
  }while(clave(actual)!==clave(inicio));
  const vertices=poligono.filter((p,i)=>{const a=poligono[(i+poligono.length-1)%poligono.length],b=poligono[(i+1)%poligono.length];return(p[0]-a[0])*(b[1]-p[1])!==(p[1]-a[1])*(b[0]-p[0]);});
  if(vertices.length<3)continue;
  if(!suave){rutas.push('M'+vertices.map(punto).join('L')+'Z');continue;}
  const esquinas=vertices.map((p,i)=>{const a=vertices[(i+vertices.length-1)%vertices.length],b=vertices[(i+1)%vertices.length],interp=q=>{const d=Math.hypot(q[0]-p[0],q[1]-p[1]),r=Math.min(.48,d/2);return[p[0]+(q[0]-p[0])*r/d,p[1]+(q[1]-p[1])*r/d];};return{antes:interp(a),p,despues:interp(b)};});
  let d='M'+punto(esquinas[0].despues);for(let i=1;i<=esquinas.length;i++){const e=esquinas[i%esquinas.length];d+='L'+punto(e.antes)+'Q'+punto(e.p)+' '+punto(e.despues);}rutas.push(d+'Z');
 }
 return rutas.join('');
}

function ilustracionMey(filas,dy,colores){
 const texto=filas.map(f=>f.join('')).join('|')+Object.values(colores).join('|');let h=2166136261,k=5381;
 for(const c of texto){h=Math.imul(h^c.charCodeAt(0),16777619);k=Math.imul(k,33)^c.charCodeAt(0);}
 const id='mey-v'+(h>>>0).toString(36)+(k>>>0).toString(36),pigmentos=[...new Set(filas.flat().filter(c=>c!=='.'&&c!=='e'))];
 const cara=(c,x,y)=>c==='e'&&filas[y].slice(0,x).includes('g')&&filas[y].slice(x+1).includes('g');
 const cuerpo=(c,x,y)=>c==='g'||c==='w'||cara(c,x,y),contorno=contornoMey(filas,cuerpo,dy,true);
 let defs='<clipPath id="'+id+'-clip"><path d="'+contorno+'"/></clipPath>';
 for(const c of pigmentos)defs+='<linearGradient color="'+colores[c]+'" id="'+id+'-'+c+'" x1="0" y1="0" x2="1" y2="1"><stop class="mey-material-luz" offset="0" stop-color="'+colores[c]+'"/><stop offset=".3" stop-color="'+colores[c]+'"/><stop offset=".65" stop-color="'+colores[c]+'"/><stop class="mey-material-sombra" offset="1" stop-color="'+colores[c]+'"/></linearGradient>';
 const adorno='<g class="mey-decoraciones" clip-path="url(#'+id+'-clip)">'+
  '<g data-mey-decoracion="cristal" display="none"><path d="M2,-2L7,-2L0,16L-5,16ZM10,-2L11,-2L4,16L3,16Z"/></g>'+
  '<g data-mey-decoracion="aero" display="none"><circle cx="5.6" cy="6.3" r="1"/><circle cx="10.9" cy="9.7" r=".55"/><path d="M4,4Q7,2 11,4"/></g>'+
  '<g data-mey-decoracion="deco" display="none"><path d="M8,14L2,5M8,14L5,3M8,14L8,2M8,14L11,3M8,14L14,5M2,12L8,5L14,12M3,13L8,7L13,13"/></g>'+
  '<g data-mey-decoracion="bauhaus" display="none"><circle cx="5" cy="6" r="1.8"/><path d="M9,3L13,7L9,7Z"/><path d="M3,11H13V13H3Z"/></g>'+
  '<g data-mey-decoracion="metal" display="none"><path d="M0,3L16,1V2L0,4ZM0,8L16,5V6L0,9ZM0,13L16,10V11L0,14Z"/></g>'+
  '<g data-mey-decoracion="circuito" display="none"><path d="M3,4H6V6H13M3,11H10V13H13M10,3V4H13M2,8H4M12,8H14"/><circle cx="6" cy="4" r=".35"/><circle cx="10" cy="11" r=".35"/></g>'+
  '<g data-mey-decoracion="plano" display="none"><path d="M0,3H16M0,6H16M0,9H16M0,12H16M4,-4V16M8,-4V16M12,-4V16M0,14L16,-2"/></g>'+
  '<g data-mey-decoracion="retro" display="none"><path d="M0,3H16M0,5H16M0,7H16M0,9H16M0,11H16M0,13H16"/></g></g>';
 let variantes='';for(const suave of [false,true]){
  let formas='<path class="mey-vector-contorno" d="'+contornoMey(filas,cuerpo,dy,suave)+'" fill="none"/>';
  for(const c of pigmentos){const region=(v,x,y)=>v===c||(c==='g'&&cara(v,x,y));formas+='<path data-mey-material="'+c+'" d="'+contornoMey(filas,region,dy,suave)+'" fill="url(#'+id+'-'+c+')"/>';}
  const ojos=contornoMey(filas,c=>c==='e',dy,suave);
  variantes+='<g class="mey-vector" data-mey-vector="'+(suave?'suave':'angular')+'" display="none">'+formas+adorno+'<path data-mey-material="e" d="'+ojos+'" fill="'+colores.e+'"/></g>';
 }
 // Las referencias locales son deterministas por dibujo y paleta; nunca un contador global.
 return '<!--mey-arte-inicio--><g class="mey-ilustracion" display="none"><defs>'+defs+'</defs>'+variantes+'</g><!--mey-arte-fin-->';
}

function accesibleMey(opciones){
 const titulo=opciones.titulo?String(opciones.titulo).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])):'';
 return titulo?'role="img" aria-label="'+titulo+'"><title>'+titulo+'</title>':'aria-hidden="true" focusable="false">';
}

/* filas: cuadrícula de trabajo de 18 filas. alto: true fuerza el lienzo de 16×18 (Mey viva, para
   que no salte de tamaño cuando aparece el papel picado). */
function svgMey(filas,pose,atuendo,opciones,alto){
 const color=opciones.color||'verde',colores=coloresMey(color);
 const arriba=alto||filas.slice(0,ALTO_MEY).some(f=>f.some(c=>c!=='.'));
 const vista=arriba?'0 -'+ALTO_MEY+' 16 '+(14+ALTO_MEY):'0 0 16 14';
 // Con opciones.celda, tamaño en píxeles enteros por celda (el pixel art no se emborrona).
 const tam=(opciones.celda?' width="'+16*opciones.celda+'" height="'+(arriba?14+ALTO_MEY:14)*opciones.celda+'"':'')+(opciones.estilo?' style="'+opciones.estilo+'"':'');
 const celdas=arriba?celdasMey(filas,-ALTO_MEY,colores,true):celdasMey(filas.slice(ALTO_MEY),0,colores,true);
 const arte=ilustracionMey(arriba?filas:filas.slice(ALTO_MEY),arriba?-ALTO_MEY:0,colores);
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+vista+'"'+tam+' shape-rendering="crispEdges" class="erlen-mey" data-pose="'+pose+'"'+(atuendo!=='ninguno'?' data-atuendo="'+atuendo+'"':'')+(color!=='verde'?' data-color="'+color+'"':'')+' '+accesibleMey(opciones)+celdas+(opciones.detalle!==false&&(!opciones.celda||opciones.celda>=2)?detallesMey(filas,arriba?-ALTO_MEY:0,colores,true):'')+arte+'</svg>';
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
  pon(k.a+6,e.salto>0||e.saludo?k.y+1:k.y+2,'n','.');
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
mey.colores=Object.freeze(Object.keys(PALETAS_MEY));
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

/* Color local independiente: conserva erlen-mey-apariencia como cadena de atuendo. */
const coloresEnMemoria=new WeakMap();
mey.colorLocal=function(ventana){
 const clave='erlen-mey-color';
 return {
  leer(){
   try{const valor=ventana?.localStorage?.getItem(clave);if(valor!==null&&valor!==undefined)return mey.colores.includes(valor)?valor:'verde';}catch{}
   return ventana?coloresEnMemoria.get(ventana)||'verde':'verde';
  },
  guardar(color){
   coloresMey(color);
   if(ventana)coloresEnMemoria.set(ventana,color);
   try{ventana?.localStorage?.setItem(clave,color);}catch{}
   if(ventana?.Event)ventana.dispatchEvent?.(new ventana.Event('erlen-mey-color'));
  }
 };
};

/* Personalidad del movimiento, independiente del modelo de conversación y del atuendo.
   Los perfiles sesgan decisiones; conservan el mazo completo y las pausas de accesibilidad. */
const PERSONALIDADES_MEY=Object.freeze({
 tranquila:Object.freeze({pausa:2.4,gesto:16000,pesos:Object.freeze({quieta:1.8,pensar:1.6,travesura:.4,jugar:.6,bailar:.5,pasear:.7}),preferidos:Object.freeze(['siesta','lectura','burbuja','idea','estatuas'])}),
 traviesa:Object.freeze({pausa:1,gesto:9000,pesos:Object.freeze({}),preferidos:Object.freeze(['inocente','confeti','escondidillas','pasolunar','rebeldia'])}),
 dramatica:Object.freeze({pausa:.85,gesto:6500,pesos:Object.freeze({travesura:1.5,bailar:1.5,jugar:1.3,pensar:.7}),preferidos:Object.freeze(['huelga','aplausos','berrinche','reverencia','teletransporte'])})
});
function perfilPersonalidadMey(nombre='traviesa'){
 if(!Object.hasOwn(PERSONALIDADES_MEY,nombre))throw new Error('mey: personalidad desconocida: '+nombre);
 return PERSONALIDADES_MEY[nombre];
}
mey.personalidades=Object.freeze(Object.keys(PERSONALIDADES_MEY));
const personalidadesEnMemoria=new WeakMap();
const personalidadesSinGuardar=new WeakSet();
mey.personalidadLocal=function(ventana){
 const clave='erlen-mey-personalidad';
 return {
  leer(){
   if(ventana&&personalidadesSinGuardar.has(ventana))return personalidadesEnMemoria.get(ventana)||'traviesa';
   try{const valor=ventana?.localStorage?.getItem(clave);if(valor!==null&&valor!==undefined)return mey.personalidades.includes(valor)?valor:'traviesa';}catch{}
   return ventana?personalidadesEnMemoria.get(ventana)||'traviesa':'traviesa';
  },
  guardar(nombre){
   perfilPersonalidadMey(nombre);
   if(ventana)personalidadesEnMemoria.set(ventana,nombre);
   try{ventana?.localStorage?.setItem(clave,nombre);if(ventana)personalidadesSinGuardar.delete(ventana);}
   catch{if(ventana)personalidadesSinGuardar.add(ventana);}
   if(ventana?.Event)ventana.dispatchEvent?.(new ventana.Event(clave));
  }
 };
};

/* ---------- Mey viva ----------
   Cada cuadro sale de la pose por transformaciones de la cuadrícula, no de dibujos aparte:
   mirar (los ojos de 1×2 se mueven una celda dentro del vidrio), parpadear o guiñar (el ojo
   pierde su celda de arriba), saltar (todo sube una fila), chapotear (se mueven las perneras),
   saludar (la mano sube), soltar una burbuja por el cuello y, al celebrar, papel picado.
   Pixel art de verdad: cambios de cuadro, sin interpolar. Filas en coordenadas de la pose. */
const CUADRO_MS=83;
const enCuadros=n=>n*CUADRO_MS;
const CHAPOTEO_MEY={hola:{izq:{12:'...wwwww.wwww...'},der:{12:'...wwww.wwwww...'}}};
const SALUDO_MEY={hola:{1:[[14,7,'.'],[14,6,'w']],2:[[14,7,'.'],[14,6,'w'],[14,5,'w']]}};

function neutro(){
 return {
  mirada:{dx:0,dy:0},parpadeo:false,salto:0,chapoteo:null,burbuja:null,saludo:false,
  fiesta:false,caminando:0,sentada:false,ojos:null,inclinar:0,burbujas:null,
  destello:null,seca:0,flotar:0,deCabeza:false,brazoIzq:0,brazoDer:1,agachar:0,estirar:0,cartel:false,confeti:0
 };
}

function ojosMey(filas){
 const ojos=[];
 for(let y=1;y<filas.length-1;y++)for(let x=0;x<16;x++)if(filas[y][x]==='e'&&filas[y+1][x]==='e'&&filas[y-1][x]!=='e')ojos.push({x,y});
 return ojos;
}

function ojosDeCara(filas){
 return ojosMey(filas).filter(({x,y})=>
  filas[y].slice(0,x).includes('g')&&filas[y].slice(x+1).includes('g')
 );
}

function cuadroMey(pose,e={},atuendo,fiesta){
 const f=[...Array.from({length:ALTO_MEY},vacia),...filasMey(pose)];
 if(pose==='hola'){
  if(e.brazoIzq===1){
   f[10+ALTO_MEY][1]='.';f[10+ALTO_MEY][2]='.';
   for(const [x,y] of [[2,9],[2,8],[2,7],[1,7]])f[y+ALTO_MEY][x]='w';
  }else if(e.brazoIzq===2){
   f[10+ALTO_MEY][1]='.';f[10+ALTO_MEY][2]='.';
   for(const [x,y] of [[2,9],[2,8],[2,7],[1,6],[1,5]])f[y+ALTO_MEY][x]='w';
  }
  const der=e.saludo?1:(e.brazoDer??1);
  if(der===0){
   f[7+ALTO_MEY][13]='.';f[7+ALTO_MEY][14]='.';f[8+ALTO_MEY][13]='.';f[9+ALTO_MEY][13]='.';
   f[10+ALTO_MEY][13]='w';f[10+ALTO_MEY][14]='w';
  }
 }
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
 const ojos=ojosDeCara(f);
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
 }else if(e.ojos&&['cerrados','felices','guino'].includes(e.ojos)){
  const cara=ojosDeCara(f);
  if(cara.length){
   const centro=cara.reduce((s,o)=>s+o.x,0)/cara.length;
   const lista=e.ojos==='guino'?[[...cara].sort((a,b)=>b.x-a.x)[0]]:cara;
   for(const {x,y} of lista){
    const lado=x<centro?1:-1;
    if(e.ojos==='felices'){
     f[y+1][x]='g';f[y][x]='e';if(f[y][x+lado]==='g')f[y][x+lado]='e';
    }else{
     f[y][x]='g';f[y+1][x]='e';if(f[y+1][x+lado]==='g')f[y+1][x+lado]='e';
    }
   }
  }
 }
 vestirMey(f,atuendo,e,ojos);
 const t=tapaMey(f);
 let nSalto=0;
 if(t){
  const y=t.y+1;
  const cuelloLimpio=f[y].every((c,x)=>x>=t.a+1&&x<=t.b-1?c==='g':c==='.');
  if(cuelloLimpio){
   if(e.agachar){f.splice(y,1);f.unshift(vacia());}
   else if(e.estirar&&f[0].every(c=>c==='.')){f.splice(y,0,[...f[y]]);f.shift();}
  }
 }
 const salto=e.salto===true?1:Math.min(3,Math.max(0,+e.salto||0));
 const libres=f.findIndex(fila=>fila.some(c=>c!=='.'));
 nSalto=Math.min(salto,libres<0?0:libres);
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
 if(nSalto>0){
  f.splice(0,nSalto);
  for(let i=0;i<nSalto;i++)f.push(vacia());
 }
 // Flotar: sube hasta ALTO_MEY filas (se le olvidó la gravedad).
 if(e.flotar){const n=Math.min(ALTO_MEY,e.flotar);f.splice(0,n);for(let i=0;i<n;i++)f.push(vacia());}
 // Utilería en la misma cuadrícula: el cartel queda encima de la cara, nunca sobre los ojos.
 if(e.cartel){
  const no=['e..epeeee','ee.epe..e','e.eepe..e','e..epeeee'];
  // Compensar el espejo del actor para que el texto siga diciendo NO hacia la izquierda.
  for(let y=0;y<4;y++)for(let x=6;x<15;x++)f[y][x]=no[y][e.cartel==='espejo'?14-x:x-6]==='e'?'e':'p';
  for(let y=4;y<12;y++)if(f[y][13]==='.')f[y][13]='a';
 }
 if(e.confeti){
  const piezas=[[1,0,'r'],[4,1,'n'],[11,0,'x'],[14,2,'r'],[0,4,'x'],[15,5,'n']];
  for(const [x,y,c] of piezas){const yy=y+e.confeti-1;if(f[yy]?.[x]==='.')f[yy][x]=c;}
 }
 return f;
}
mey.cuadro=(pose,estado={},atuendo='ninguno')=>cuadroMey(pose,{...neutro(),...estado},atuendo,false).map(f=>f.join('')).join('\n');

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
 figures:{trabajo:'graficando'},ftir:{trabajo:'graficando'},xrd:{trabajo:'graficando'},xps:{trabajo:'graficando'},dft:{trabajo:'graficando'},fem:{trabajo:'graficando'},
 thermal:{trabajo:'midiendo'},
 rmn:{trabajo:'graficando'},
 pentagrama:{trabajo:'hola'},
 analyze:{trabajo:'graficando'},data:{trabajo:'midiendo'},projects:{trabajo:'leyendo'},release:{trabajo:'leyendo'},burocracy:{trabajo:'leyendo'},
 'legacy-editor':{trabajo:'hola'},tunning:{trabajo:'midiendo'}
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
const JUEGOS_MEY=['siesta','escondidillas','burbuja','probador','baile','hipo','mareo','carrera','estornudo','lectura','idea','estatuas','gransalto','resbalon','perseguida','gravedad','evaporacion','techo','pasolunar','berrinche','inocente','teletransporte','reverencia','rebeldia','huelga','aplausos','confeti'];

function barajarMey(lista,azar){const a=[...lista];for(let i=a.length-1;i>0;i--){const j=Math.floor(azar()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

mey.siguienteJuego=function(memoria,azar=Math.random,nombres=JUEGOS_MEY,personalidad='traviesa'){
 const perfil=perfilPersonalidadMey(personalidad);
 let dato=null;try{dato=memoria?.leer?.();}catch{}
 const ultimo=nombres.includes(dato?.ultimo)?dato.ultimo:null;
 let vistos=Array.isArray(dato?.vistos)?dato.vistos.filter(n=>nombres.includes(n)):[];
 let quedan=nombres.filter(n=>!vistos.includes(n));
 if(!quedan.length){vistos=[];quedan=nombres.filter(n=>n!==ultimo||nombres.length===1);}
 const preferidos=quedan.filter(n=>perfil.preferidos.includes(n));
 const juego=barajarMey(preferidos.length&&azar()<.7?preferidos:quedan,azar)[0];
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

/* mey.mente: modelo puro de conducta (en segundos, sin DOM, reloj ni mutación). */
const clampMey=function(valor,min=0,max=1){
 const n=Number(valor);
 if(Number.isNaN(n))return min;
 return n<min?min:(n>max?max:n);
};

const ENFRIAMIENTO_MENTE=Object.freeze({
 pasear:6,acercarse:15,curiosear:8,travesura:12,jugar:4,bostezar:60,dormir:90,estirarse:60,pensar:30,bailar:45,quieta:0
});

mey.mente={
 enfriamiento:ENFRIAMIENTO_MENTE,
 inicial(memoria={},hora=12){
  const afectoVal=typeof memoria?.afecto==='number'?memoria.afecto:0.3;
  const esNoche=hora<6||hora>=23;
  return {
   energia:0.8,
   curiosidad:0.4,
   aburrimiento:0.2,
   afecto:clampMey(afectoVal,0,1),
   sueno:clampMey(esNoche?0.5:0,0,1)
  };
 },
 actualizar(imp={},s={},dt=0){
  const inactividad=Number(s.inactividad)||0;
  const cerca=!!s.cerca;
  const estimulo=Number(s.estimulo)||0;
  const caricia=!!s.caricia;
  const durmiendo=!!s.durmiendo;
  const hora=typeof s.hora==='number'?s.hora:12;

  let aburrimiento=Number(imp.aburrimiento)||0;
  aburrimiento+=inactividad>10?(dt/45):(-dt/20);

  let curiosidad=Number(imp.curiosidad)||0;
  if(estimulo>0){
   curiosidad+=estimulo*0.3;
  }else{
   const paso=dt/30;
   if(curiosidad<0.4)curiosidad=Math.min(0.4,curiosidad+paso);
   else if(curiosidad>0.4)curiosidad=Math.max(0.4,curiosidad-paso);
  }

  let sueno=Number(imp.sueno)||0;
  if(durmiendo){
   sueno+=-dt/120;
  }else{
   if(inactividad>60)sueno+=dt/240;
   else if(inactividad<5)sueno+=-dt/60;
   if(hora<6||hora>=23)sueno+=dt/600;
  }

  let afecto=Number(imp.afecto)||0;
  afecto+=(caricia?0.12:0)+(cerca?dt/40:0)-(dt/900);

  sueno=clampMey(sueno,0,1);
  const energia=clampMey(1-0.6*sueno,0,1);

  return {
   energia,
   curiosidad:clampMey(curiosidad,0,1),
   aburrimiento:clampMey(aburrimiento,0,1),
   afecto:clampMey(afecto,0,1),
   sueno
  };
 },
 utilidad(nombre,imp={},s={}){
  const energia=clampMey(imp.energia??0.8,0,1);
  const curiosidad=clampMey(imp.curiosidad??0.4,0,1);
  const aburrimiento=clampMey(imp.aburrimiento??0.2,0,1);
  const afecto=clampMey(imp.afecto??0.3,0,1);
  const sueno=clampMey(imp.sueno??0,0,1);

  const paseo=!!s.paseo;
  const juegos=!!s.juegos;
  const punteroVisto=!!s.punteroVisto;
  const distancia=Number(s.distancia)||0;
  const novedad=!!s.novedad;
  const quietaMucho=!!s.quietaMucho;
  const escribiendo=!!s.escribiendo;
  const inactividad=Number(s.inactividad)||0;

  if(escribiendo&&['pasear','acercarse','travesura','jugar','bailar','estirarse'].includes(nombre)){
   return 0;
  }

  let u=0;
  switch(nombre){
   case 'quieta':
    u=0.35;
    break;
   case 'pasear':
    u=paseo?(0.3+0.4*energia+0.3*curiosidad)*(1-sueno):0;
    break;
   case 'acercarse':
    u=(paseo&&punteroVisto&&distancia>4)?(0.2+0.8*afecto+0.3*curiosidad):0;
    break;
   case 'curiosear':
    u=novedad?(0.3+0.6*curiosidad):0;
    break;
   case 'travesura':
    u=0.2+0.6*aburrimiento;
    break;
   case 'jugar':
    u=juegos?(0.5+0.8*aburrimiento):0;
    break;
   case 'bostezar':
    u=sueno>0.35?(0.9*sueno):0;
    break;
   case 'dormir':
    u=(sueno>0.6&&inactividad>30)?((sueno-0.6)*3):0;
    break;
   case 'estirarse':
    u=quietaMucho?(0.15+0.5*aburrimiento):0;
    break;
   case 'pensar':
    u=0.15+0.3*curiosidad;
    break;
   case 'bailar':
    u=(afecto>0.5&&energia>0.6)?(0.1+0.5*afecto):0;
    break;
   default:
    u=0;
  }
  return u*(perfilPersonalidadMey(s.personalidad).pesos[nombre]??1);
 },
 elegir(nombres=[],imp={},s={},ultimaVez={},ahora=0,azar){
  const candidatos=[];
  for(const n of nombres){
   const u=mey.mente.utilidad(n,imp,s);
   const cd=ENFRIAMIENTO_MENTE[n]??0;
   const tUltima=typeof ultimaVez?.[n]==='number'?ultimaVez[n]:-Infinity;
   const transcurrido=ahora-tUltima;
   const fraccion=cd>0?Math.max(0,1-(transcurrido/cd)):0;
   const puntaje=u*(1-fraccion);
   if(puntaje>0.05){
    candidatos.push({nombre:n,puntaje,peso:puntaje*puntaje});
   }
  }
  if(!candidatos.length)return 'quieta';
  const r=Number(azar());
  if(r<=0)return candidatos[0].nombre;
  const suma=candidatos.reduce((acc,c)=>acc+c.peso,0);
  if(suma<=0)return candidatos[0].nombre;
  let objetivo=r*suma;
  for(const c of candidatos){
   objetivo-=c.peso;
   if(objetivo<=0)return c.nombre;
  }
  return candidatos[candidatos.length-1].nombre;
 }
};

mey.memoriaConducta=function(ventana,clave='erlen-mey-conducta'){
 const POR_DEFECTO={visitas:0,ultima:0,afecto:0.3};
 let respaldo=null;
 return {
  leer(){
   try{
    const v=ventana?.localStorage?.getItem(clave);
    if(v){
     const parseado=JSON.parse(v);
     if(parseado&&typeof parseado==='object')return parseado;
    }
   }catch{}
   return respaldo||{...POR_DEFECTO};
  },
  guardar(dato){
   respaldo=dato;
   try{
    ventana?.localStorage?.setItem(clave,JSON.stringify(dato));
   }catch{}
  }
 };
};

/* mey.montar(host, {lugar, app, pose, atuendo, energia, celda, vivo, ventana, reloj, aleatorio,
   fecha, memoria, memoriaConducta, personalidad})
   pinta a Mey dentro de host (lienzo fijo de 16×18) y la anima según su energía:
   - completa: latido de conducta, percepción de la página, paseos, juegos y reacciones al clic.
   - calma: animación vital discreta; sin sensores de página, salvo eventos de la app.
   - quieta: no se mueve.
   Sin celda fija mide el host (ResizeObserver); por debajo de 3 px por celda baja a calma.
   Con movimiento reducido, fuera de la vista, pestaña oculta o saveData no se mueve.
   Los eventos de guardado se ignoran dormida y se limitan a uno por minuto; otros se deduplican en 3 s.
   En «recreo», opciones.memoria recuerda los juegos vistos; opciones.juego fuerza el primero.
   opciones.memoriaConducta conserva visitas y afecto; personalidad fija el carácter visual.
   Devuelve pose(), atuendo(), reaccionar(), personalidad,
   evento(), ajustar(), cuadro(), impulsos, conducta, memoria, celda, activa, juego y detener(). */
mey.montar=function(host,opciones={}){
 const ventana=opciones.ventana||host.ownerDocument.defaultView;
 const doc=host.ownerDocument;
 const reloj=opciones.reloj||ventana;
 const azar=opciones.aleatorio||Math.random;
 const fecha=opciones.fecha||(()=>Date.now());
 const ahora=()=>+fecha();
 const memoriaConducta=opciones.memoriaConducta||mey.memoriaConducta(ventana);
 let memConducta=null;
 try{memConducta=memoriaConducta?.leer?.();}catch{}
 memConducta=memConducta&&typeof memConducta==='object'?{visitas:0,ultima:0,afecto:0.3,...memConducta}:{visitas:0,ultima:0,afecto:0.3};
 const visitasGuardadas=Number(memConducta.visitas),ultimaGuardada=Number(memConducta.ultima),afectoGuardado=Number(memConducta.afecto);
 const tFecha=fecha();
 const ultima=Number.isFinite(ultimaGuardada)&&ultimaGuardada>0?ultimaGuardada:0;
 const visitasPrevias=Number.isFinite(visitasGuardadas)?Math.max(0,Math.floor(visitasGuardadas)):0;
 const primeraVisita=visitasPrevias===0;
 const dias=ultima===0?0:Math.max(0,(tFecha-ultima)/86400000);
 const afectoInicial=clampMey((Number.isFinite(afectoGuardado)?afectoGuardado:0.3)-(ultima===0?0:dias*0.05),0.1,1);
 let visitas=visitasPrevias;
 if(ultima===0||tFecha-ultima>30*60*1000)visitas++;
 let memGuardada={visitas,ultima:tFecha,afecto:afectoInicial};
 try{memoriaConducta?.guardar?.({...memGuardada});}catch{}
 let imp=mey.mente.inicial({afecto:afectoInicial},new Date(tFecha).getHours());
 let ultimoAfectoPersistido=afectoInicial;
 let ultimaPersistencia=ahora();
 const apariencia=mey.aparienciaLocal(ventana);
 const colorLocal=mey.colorLocal(ventana);
 const personalidadLocal=mey.personalidadLocal(ventana);
 let personalidad=opciones.personalidad||personalidadLocal.leer();
 const perfil=()=>perfilPersonalidadMey(personalidad);
 perfil();
 const r=mey.resolver({...opciones,atuendo:opciones.atuendo||apariencia.leer()});
 const poseVigilia=r.pose==='dormido'?'hola':r.pose;
 const energiaPedida=opciones.energia||r.energia;
 if(!['completa','calma','quieta'].includes(energiaPedida))throw new Error('mey: energía desconocida: '+energiaPedida);
 const medir=()=>opciones.celda||celdaMey(r.eje==='alto'?host.clientHeight:host.clientWidth,14+ALTO_MEY,r);
 let celda=medir();
 const energia=()=>energiaPedida==='completa'&&celda<3?'calma':energiaPedida;
 const empiezaDurmiendo=r.lugar==='vacio'&&r.pose==='dormido'&&energia()==='completa';
 let durmiendo=empiezaDurmiendo;
 if(durmiendo)imp.sueno=Math.max(imp.sueno,0.7);
 let pose=r.pose,atuendo=r.atuendo;
 vestirMey(Array.from({length:18},vacia),atuendo,{},[]);
 // Paseo: con energía completa y un espacio más ancho que ella, Mey camina por él. x en píxeles
 // (múltiplo de la celda), rumbo 1 a la derecha y -1 a la izquierda (se voltea en espejo).
 let x=0,rumbo=1,punteroX=null;
 const holgura=()=>Math.max(0,Math.floor((host.clientWidth-16*celda)/celda))*celda;
 const conPaseo=()=>opciones.paseo!==false&&energia()==='completa'&&holgura()>=8*celda;
 let e=durmiendo?{...neutro(),sentada:true}:neutro();
 let pintado='',fijos=new Set(),escena=new Set(),activo=false,ultimoPuntero=-Infinity,ocupada=false,visible=true;
 const recreo=opciones.juegos??r.juegos;
 // La memoria de la persona y, si no guarda nada (bloqueada o de prueba), la de esta visita.
 const guardada=opciones.memoria||(recreo?mey.memoriaLocal(ventana):null);
 let deLaVisita=null;
 const memoria={leer(){let d=null;try{d=guardada?.leer?.();}catch{}return d||deLaVisita;},guardar(d){deLaVisita=d;try{guardada?.guardar?.(d);}catch{}}};
 let jugando=null,pendiente=null,jugados=0,ultimaReaccion=null,ultimoJuego=null,ultimoFinJuego=ahora(),finJuegoActual=null;
 let tPunteroPrev=0,distMeyPrev=0,distanciaPuntero=Infinity,velPuntero=0,dentroDesde=null,tienePunteroPrevio=false;
 let ultimaActividad=ahora(),ultimaCercana=-Infinity,ultimoSusto=-Infinity,ultimaTecla=-Infinity;
 let novedad=null,ultimaConductaMovimiento=ahora(),ultimaTravesura=null,conductaActual=durmiendo?'dormir':null,noAntesDe=0,ultimaVezConducta={};
 let saludoPresenciaRealizado=false,cariciaPendiente=false,historialClics=[],afectoAlIniciarRafaga=null,finMolesta=0,ultimoClic=-Infinity,finDormir=null;
 let guardadoEn=-Infinity,ultimoEvento={tipo:null,t:-Infinity};
 let ocultoDesde=null,enCarga=false,bienvenidaProgramada=false;
 // De cabeza (camina por el techo) es un espejo vertical del mismo dibujo.
 const estilo=()=>{const t=[];if(conPaseo())t.push('translateX('+x+'px)'+(rumbo<0?' scaleX(-1)':''));if(e.deCabeza)t.push('scaleY(-1)');return t.length?'display:block;transform:'+t.join(' '):'';};
 const pintar=()=>{
  if(conPaseo()){if(!host.style.position)host.style.position='relative';host.style.overflow='hidden';}
  const dibujo=e.cartel&&conPaseo()&&rumbo<0?{...e,cartel:'espejo'}:e;
  const svg=svgMey(cuadroMey(pose,dibujo,atuendo,false),pose,atuendo,{...opciones,color:opciones.color||colorLocal.leer(),celda,detalle:true,estilo:estilo()},true);if(svg!==pintado){host.innerHTML=svg;pintado=svg;}
 };
 const poner=cambios=>{e={...e,...cambios};pintar();};
 const despues=(ms,fn,fijo=false)=>{
  const conjunto=fijo?fijos:escena;
  const id=reloj.setTimeout(()=>{
   conjunto.delete(id);
   if(activo)fn();
  },ms);
  conjunto.add(id);
  return id;
 };
 const entre=(a,b)=>a+Math.floor(azar()*(b-a));
 // Un paso es [cuadros, cambios] o [cuadros, función] (cambia pose, lugar o disfraz entre cuadros).
 const secuencia=(pasos,fin)=>{
  ocupada=true;let t=0;
  for(const [c,cambios] of pasos){
   t+=c;
   despues(enCuadros(t),()=>typeof cambios==='function'?cambios():poner(cambios));
  }
  despues(enCuadros(t),()=>{ocupada=false;fin&&fin();});
 };
 const interrumpir=()=>{
  for(const id of escena)reloj.clearTimeout(id);
  escena.clear();
  ocupada=false;
  durmiendo=false;
  jugando=null;
  pendiente=null;
  enCarga=false;
  finDormir=null;
  ultimoFinJuego=ahora();
  e=neutro();
  pose=poseVigilia;
  finJuegoActual=null;
  conductaActual=null;
  pintar();
 };
 const brinco=(h=2)=>[
  [0,{agachar:1}],
  [2,{agachar:0,estirar:1,salto:Math.ceil(h/2)}],
  [1,{estirar:0,salto:h}],
  [3,{estirar:1,salto:Math.ceil(h/2)}],
  [1,{estirar:0,salto:0,agachar:1}],
  [2,{agachar:0}]
 ];
 const sentarse=()=>[[0,{agachar:1}],[2,{agachar:0,sentada:true}]];
 const levantarse=()=>[[0,{agachar:1,sentada:false}],[2,{agachar:0}]];
 const girar=nuevoRumbo=>[[0,{agachar:1}],[1,()=>{rumbo=typeof nuevoRumbo==='function'?nuevoRumbo():nuevoRumbo;pintar();}],[1,{agachar:0}]];
 const tropezar=()=>[
  [0,{inclinar:1,ojos:'grandes',caminando:1}],
  [1,{caminando:3,estirar:1}],
  [1,{estirar:0,caminando:0,agachar:1}],
  [1,{inclinar:0,agachar:0,sentada:true}],
  [4,{ojos:null,mirada:{dx:-1,dy:0}}],
  [3,{mirada:{dx:1,dy:0}}],
  [3,{mirada:{dx:0,dy:0}}]
 ];
 const APLAUSO_ARRIBA={brazoIzq:2,brazoDer:1,saludo:2,estirar:1,agachar:0,ojos:'felices'};
 const APLAUSO_ABAJO={brazoIzq:0,brazoDer:0,saludo:false,estirar:0,agachar:1};
 const TRAVESURAS={
  guino:[
   [0,{parpadeo:'guino'}],
   [1,{parpadeo:false,ojos:'guino'}],
   [1,{inclinar:-1}],
   [1,{brazoIzq:1}],
   [2,{agachar:1}],
   [1,{agachar:0,estirar:1,salto:1}],
   [1,{estirar:0,brazoIzq:2}],
   [2,{salto:0,agachar:1}],
   [1,{agachar:0,brazoIzq:1}],
   [2,{brazoIzq:0,inclinar:0}],
   [1,{ojos:null,parpadeo:'guino'}],
   [1,{parpadeo:false}]
  ],
  chapoteo:[
   [0,{chapoteo:'izq'}],
   [1,{chapoteo:null,agachar:1}],
   [1,{chapoteo:'der',agachar:0}],
   [1,{chapoteo:null,estirar:1}],
   [1,{chapoteo:'izq',estirar:0}],
   [1,{chapoteo:'der',ojos:'felices'}],
   [1,{chapoteo:null,agachar:1}],
   [1,{chapoteo:'izq',agachar:0}],
   [1,{chapoteo:'der',estirar:1}],
   [1,{chapoteo:null,estirar:0}],
   [1,{chapoteo:'izq',brazoIzq:1}],
   [1,{chapoteo:'der',brazoIzq:0,ojos:null}],
   [1,{chapoteo:null}]
  ],
  burbuja:[
   [0,{mirada:{dx:0,dy:-1}}],
   [1,{estirar:1}],
   [1,{estirar:0,burbuja:0}],
   [2,{burbuja:1}],
   [2,{burbuja:2}],
   [2,{burbuja:3,ojos:'grandes'}],
   [2,{burbuja:4}],
   [2,{burbuja:5,ojos:null}],
   [2,{burbuja:null,destello:[9,1]}],
   [1,{destello:null,parpadeo:'ambos'}],
   [1,{parpadeo:false,mirada:{dx:0,dy:0}}]
  ],
  saludo:[
   [0,{ojos:'grandes',estirar:1}],
   [2,{estirar:0,ojos:null,saludo:1}],
   [1,{saludo:2,ojos:'felices'}],
   [2,{saludo:1}],
   [2,{saludo:2}],
   [2,{saludo:1}],
   [2,{saludo:2,inclinar:1}],
   [2,{saludo:1,inclinar:0}],
   [2,{saludo:2}],
   [2,{saludo:false,agachar:1}],
   [2,{agachar:0,ojos:null}]
  ],
  celebrar:[
   ...brinco(2),
   [0,()=>{pose='exito';poner({fiesta:true,ojos:'felices'});}],
   [4,{salto:1}],
   [2,{salto:0}],
   [2,{salto:1}],
   [2,{salto:0}],
   [4,()=>{pose=poseVigilia;poner({fiesta:false,ojos:null});}]
  ],
  risa:[
   [0,{ojos:'felices',agachar:1}],
   [1,{agachar:0,estirar:1,chapoteo:'izq'}],
   [1,{estirar:0,agachar:1,chapoteo:'der'}],
   [1,{agachar:0,estirar:1,chapoteo:null}],
   [1,{estirar:0,agachar:1,chapoteo:'izq'}],
   [1,{agachar:0,estirar:1,chapoteo:'der'}],
   [1,{estirar:0,agachar:1,chapoteo:null}],
   [1,{agachar:0,estirar:1,chapoteo:'izq'}],
   [1,{estirar:0,brazoIzq:1,chapoteo:null}],
   [3,{brazoIzq:0,ojos:null}]
  ],
  sorpresa:[
   [0,{ojos:'grandes',estirar:1,salto:1}],
   [1,{salto:2}],
   [1,{salto:1}],
   [1,{salto:0,estirar:0,agachar:1}],
   [2,{agachar:0}],
   [5,{ojos:null}]
  ],
  cosquillas:[
   [0,{ojos:'felices',inclinar:-1}],
   [1,{inclinar:1,brazoIzq:1}],
   [1,{inclinar:-1,brazoIzq:0,saludo:1}],
   [1,{inclinar:1,saludo:false,brazoIzq:1}],
   [1,{inclinar:-1,brazoIzq:2}],
   [1,{inclinar:1,brazoIzq:0,saludo:2}],
   [1,{inclinar:-1,saludo:false}],
   [1,{inclinar:1,agachar:1}],
   [1,{inclinar:-1,agachar:0,estirar:1}],
   [1,{inclinar:1,estirar:0}],
   [1,{inclinar:0,ojos:null}]
  ],
  bostezo:[
   [0,{parpadeo:'ambos'}],
   [2,{parpadeo:false,ojos:'cerrados'}],
   [1,{estirar:1}],
   [3,{brazoIzq:1}],
   [3,{brazoIzq:2}],
   [2,{brazoIzq:1,estirar:0,agachar:1}],
   [2,{agachar:0,brazoIzq:0}],
   [2,{ojos:null,parpadeo:'ambos'}],
   [1,{parpadeo:false}],
   [2,{parpadeo:'ambos'}],
   [1,{parpadeo:false}]
  ],
  estirarse:[
   [0,{agachar:1}],
   [2,{agachar:0,estirar:1,ojos:'cerrados'}],
   [1,{brazoIzq:1,saludo:1}],
   [2,{brazoIzq:2,saludo:2}],
   [4,{estirar:0,brazoIzq:1,saludo:1}],
   [1,{agachar:1,brazoIzq:0,saludo:false}],
   [2,{agachar:0,ojos:null}],
   [2,{parpadeo:'ambos'}],
   [1,{parpadeo:false}]
  ],
  aplauso:[
   [0,APLAUSO_ARRIBA],
   [1,APLAUSO_ABAJO],
   [1,APLAUSO_ARRIBA],
   [1,APLAUSO_ABAJO],
   [1,APLAUSO_ARRIBA],
   [1,APLAUSO_ABAJO],
   [1,APLAUSO_ARRIBA],
   [1,APLAUSO_ABAJO],
   [1,APLAUSO_ARRIBA],
   [2,{brazoIzq:0,brazoDer:1,saludo:false,estirar:0,agachar:0,ojos:null}]
  ],
  pensar:[
   [0,()=>{pose='pensando';pintar();}],
   [3,{mirada:{dx:0,dy:-1}}],
   [4,{mirada:{dx:1,dy:-1}}],
   [4,{mirada:{dx:-1,dy:-1}}],
   [3,{mirada:{dx:0,dy:-1},inclinar:1}],
   [3,{inclinar:0,mirada:{dx:0,dy:0}}],
   [2,{parpadeo:'ambos'}],
   [1,{parpadeo:false}],
   [2,()=>{pose=poseVigilia;pintar();}]
  ],
  preocupacion:[
   [0,()=>{pose='aviso';pintar();}],
   [1,{ojos:'grandes'}],
   [1,{inclinar:-1}],
   [1,{inclinar:1}],
   [1,{inclinar:-1}],
   [1,{inclinar:1}],
   [2,{inclinar:0,mirada:{dx:-1,dy:0}}],
   [2,{mirada:{dx:1,dy:0}}],
   [2,{mirada:{dx:0,dy:0},ojos:null}],
   [2,{agachar:1}],
   [2,{agachar:0}],
   [2,()=>{pose=poseVigilia;pintar();}]
  ],
  asentir:[
   [0,{agachar:1}],
   [1,{agachar:0,estirar:1}],
   [1,{estirar:0,ojos:'felices'}],
   [1,{agachar:1}],
   [2,{agachar:0}],
   [2,{ojos:null}]
  ],
  enojo:[
   [0,()=>{pose='aviso';pintar();}],
   [0,{ojos:'grandes',inclinar:-1}],
   [1,{inclinar:1}],
   [1,{inclinar:-1}],
   [1,{inclinar:1}],
   [1,{inclinar:-1}],
   [2,{inclinar:0,ojos:null}],
   [4,{agachar:1}],
   [3,{agachar:0}],
   [2,()=>{pose=poseVigilia;pintar();}]
  ]
 };
 const despertar=fin=>{
  if(!durmiendo){fin&&fin();return;}
  const alDespertar=fin||finDormir;
  interrumpir();
  finDormir=null;
  durmiendo=false;
  pose=poseVigilia;
  e=neutro();
  pintar();
  conductaActual='despertar';
  secuencia(TRAVESURAS.sorpresa,()=>secuencia(TRAVESURAS.estirarse,()=>secuencia(TRAVESURAS.saludo,()=>{
   conductaActual=null;
   ultimaConductaMovimiento=ahora();
   noAntesDe=ahora()+enCuadros(entre(24,72))*(2-imp.energia)*perfil().pausa;
   alDespertar&&alDespertar();
  })));
 };
 const alPuntero=ev=>{
  const b=host.getBoundingClientRect();if(!b.width)return;
  const tAhora=ahora(),estabaDormida=durmiendo;
  ultimaActividad=tAhora;
  const dentro=ev.clientY>=b.top&&ev.clientY<=b.bottom&&ev.clientX>=b.left&&ev.clientX<=b.right;
  if(dentro){
   if(dentroDesde===null)dentroDesde=tAhora;
   punteroX=ev.clientX-b.left;
  }else dentroDesde=null;
  ultimoPuntero=tAhora;
  const cx=b.left+(conPaseo()?x+8*celda:b.width/2),cy=b.top+b.height/2;
  const distMey=Math.hypot(ev.clientX-cx,ev.clientY-cy);
  distanciaPuntero=distMey;
  if(distMey<=12*celda)ultimaCercana=tAhora;
  if(!tienePunteroPrevio){
   tienePunteroPrevio=true;tPunteroPrev=tAhora;distMeyPrev=distMey;
  }else{
   const dt=tAhora-tPunteroPrev;
   if(dt>=8){
    const instVel=((distMeyPrev-distMey)/dt)*1000;
    velPuntero=velPuntero===0?instVel:0.5*velPuntero+0.5*instVel;
    tPunteroPrev=tAhora;distMeyPrev=distMey;
   }
  }
  if(distMey<=12*celda&&velPuntero>=1200&&imp.afecto<.6&&!estabaDormida&&!jugando&&tAhora-ultimoSusto>10000){
   ultimoSusto=tAhora;
   interrumpir();
   conductaActual='susto';
   const dir=ev.clientX>cx?-1:1,destRetiro=x+dir*entre(4,8)*celda;
   secuencia(TRAVESURAS.sorpresa,()=>{
    if(conPaseo())caminar(destRetiro,()=>{conductaActual=null;},{cuadros:1});
    else conductaActual=null;
   });
   return;
  }
  if(estabaDormida&&distMey<=12*celda)despertar();
  if(ocupada)return;
  const dx=ev.clientX<cx-b.width*.6?-1:ev.clientX>cx+b.width*.6?1:0;
  const dy=ev.clientY<cy-b.height*.6?-1:(ev.clientY>cy+b.height*.6?1:0);
  const dxv=conPaseo()&&rumbo<0?-dx:dx;
  if(dxv!==e.mirada.dx||dy!==e.mirada.dy)poner({mirada:{dx:dxv,dy}});
 };
 const celebrar=()=>{
  if(!activo||ocupada)return;
  ultimaReaccion='celebrar';
  secuencia(TRAVESURAS.celebrar);
 };
 /* Camina hasta destino (px) alternando las patas. cuadros por paso, zancada en celdas, brinco (salta
    a cada paso), libre (puede salir del escenario: se esconde tras el borde), sigilo (sin mover brazos)
    y pausa() → cuadros que se queda congelada antes del siguiente paso (0 sigue). En el recreo es torpe:
    a veces se tropieza a medio camino (y a veces hasta se cae sentada). Sin paseo llega en el acto. */
 const caminar=(destino,alLlegar,opts={})=>{
  if(!conPaseo()){alLlegar&&alLlegar();return;}
  const {
   cuadros=2,
   zancada=1,brinco=false,libre=false,sigilo=false,pausa=null,torpe=recreo,atras=false
  } = opts;
  const borde=libre?17*celda:0;
  const meta=Math.max(-borde,Math.min(holgura()+borde,Math.round(destino/celda)*celda));
  if(meta===x){alLlegar&&alLlegar();return;}
  ocupada=true;
  const nuevoRumbo=meta>x?1:-1;
  const andar=()=>{
   if(!activo)return;
   ocupada=true;
   const total=Math.ceil(Math.abs(meta-x)/(zancada*celda));
   let tropiezo=torpe&&total>3&&azar()<.18?1+Math.floor(azar()*(total-2)):-1;
   const paso=n=>{
    if(!activo)return;
    if(n===tropiezo){
     tropiezo=-1;
     secuencia(tropezar(),()=>{
      ocupada=true;
      if(azar()<.35){
       secuencia(sentarse(),()=>{
        ocupada=true;
        despues(enCuadros(entre(7,12)),()=>secuencia(levantarse(),()=>paso(n)));
       });
      }else{
       secuencia(levantarse(),()=>paso(n));
      }
     });
     return;
    }
    const espera=pausa?pausa():0;
    if(espera){
     despues(enCuadros(espera),()=>paso(n));
     return;
    }
    const dur=cuadros+(n===0||n>=total-2?1:0);
    const A=Math.max(1,Math.floor(dur/2));
    const B=dur-A;
    poner({
     caminando:n%2?3:4,
     agachar:0,
     brazoIzq:sigilo?0:(n%2?1:0),
     sentada:false,
     salto:brinco&&n%2===0?1:0,
     estirar:brinco&&n%2===0?1:0
    });
    despues(enCuadros(A),()=>{
     x=nuevoRumbo>0?Math.min(meta,x+zancada*celda):Math.max(meta,x-zancada*celda);
     poner({
      caminando:n%2?1:2,
      agachar:brinco?1:0,
      salto:0,
      estirar:0
     });
     if(x!==meta){
      despues(enCuadros(B),()=>paso(n+1));
     }else{
      despues(enCuadros(B),()=>{
       poner({caminando:0,agachar:0,brazoIzq:0,salto:0,estirar:0});
       ocupada=false;
       alLlegar&&alLlegar();
      });
     }
    });
   };
   paso(0);
  };
  const frente=atras?-nuevoRumbo:nuevoRumbo;
  if(frente!==rumbo){
   secuencia(girar(frente),andar);
  }else{
   andar();
  }
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
 const risa=()=>TRAVESURAS.risa;
 // Saluda; a veces con tanto entusiasmo que se va de lado y se cae sentada.
 const saludo=()=>[...TRAVESURAS.saludo,...(azar()<.2?tropezar():[])];
 const hipido=(t=0)=>[
  [t,{agachar:1}],
  [1,{agachar:0,estirar:1,salto:1,ojos:'grandes',burbujas:[[9,3]]}],
  [1,{salto:0,estirar:0}],
  [2,{ojos:null,burbujas:[[9,2]]}],
  [2,{burbujas:[[9,1]]}],
  [2,{burbujas:[[9,0]]}],
  [2,{burbujas:null}]
 ];
 const fiesta=()=>[[0,()=>{pose='exito';poner({fiesta:true});}],[14,()=>{pose=poseVigilia;poner({fiesta:false});}]];
 // Sale corriendo por el borde más cercano (o aparece ya escondida al llegar).
 const esconderse=(primero,s,listo)=>{
  if(!conPaseo())return listo();
  if(primero){ponerX(fuera(s),-s);return listo();}
  caminar(fuera(s),()=>secuencia(girar(-rumbo),listo),{cuadros:1,zancada:2,libre:true});
 };
 const cerca=()=>x>holgura()/2?1:-1;
 let lado0=1;
 const JUEGOS={
  // La encuentras dormida y roncando burbujas; la despiertas acercándote (o se despierta sola).
  siesta:{
   foto:()=>({pose:'dormido',e:{sentada:true}}),
   inicio(primero,listo){pose='dormido';if(primero&&conPaseo())x=alAzar();poner({sentada:true});listo();},
   correr(fin){
    const ronquidos=2+Math.floor(azar()*3);
    const despertar=()=>{pose=poseVigilia;secuencia([[0,{burbuja:null,ojos:'grandes'}],...levantarse(),...brinco(2),[0,{mirada:{dx:-1,dy:0}}],[6,{mirada:{dx:1,dy:0}}],[5,{mirada:{dx:0,dy:0},parpadeo:'guino'}],[4,{parpadeo:false}],...saludo()],fin);};
    const roncar=k=>{
     if(k>=ronquidos||ahora()-ultimoPuntero<1200)return despertar();
     secuencia([[0,{burbuja:0}],[4,{burbuja:1}],[4,{burbuja:2}],[4,{burbuja:3}],[4,{burbuja:4}],[4,{burbuja:null}]],()=>despues(enCuadros(entre(4,11)),()=>roncar(k+1)));
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
    if(!conPaseo()){
     const pasos=[];for(let i=0,n=2+Math.floor(azar()*2);i<n;i++)pasos.push([i?entre(4,7):0,{parpadeo:'ambos',mirada:{dx:0,dy:0}}],[entre(8,16),{parpadeo:false,ojos:'grandes'}],...brinco(2),[5,{ojos:null,mirada:{dx:i%2?1:-1,dy:0}}],[4,{mirada:{dx:0,dy:0}}]);
     return secuencia([...pasos,...saludo(),...risa()],fin);
    }
    const s=lado0,o=azar()<.7?-s:s;
    secuencia([[0,()=>ponerX(asomo(s),-s)],[0,{mirada:{dx:1,dy:0}}],[entre(7,12),{mirada:{dx:0,dy:0},ojos:'grandes'}],[5,()=>{ponerX(fuera(s));poner({ojos:null});}],[entre(8,18),()=>ponerX(asomo(o),-o)],[0,{mirada:{dx:1,dy:-1}}],[entre(7,11),{mirada:{dx:0,dy:0},parpadeo:'guino'}],[4,{parpadeo:false}]],
     ()=>caminar(o<0?entre(4,24)*celda:holgura()-entre(4,24)*celda,()=>secuencia([...saludo(),...risa()],fin),{cuadros:1,zancada:2,libre:true,brinco:true}));
   }
  },
  // Persigue una burbuja que suelta, la burbuja revienta y ella se queda chiquita.
  burbuja:{
   foto:()=>({pose:'hola',e:{burbujas:[[11,2],[13,0]],mirada:{dx:1,dy:0}}}),
   correr(fin){
    const volar=[[0,{mirada:{dx:0,dy:-1},burbujas:[[9,4]]}],[3,{burbujas:[[10,3]]}],[3,{burbujas:[[12,2]],mirada:{dx:1,dy:-1}}],[3,{burbujas:[[13,1]]}],[3,{burbujas:[[14,1]],mirada:{dx:1,dy:0}}]];
    const reventar=[[0,{burbujas:[[14,0]]}],[3,{burbujas:null,destello:[14,1],ojos:'grandes',mirada:{dx:0,dy:0}}],[3,{destello:null}],[5,()=>{pose='aviso';poner({ojos:null});}],[11,()=>{pose=poseVigilia;pintar();}],...risa()];
    secuencia(volar,()=>caminar(aDistancia(entre(8,24)),()=>secuencia(reventar,fin),{cuadros:entre(1,3),brinco:azar()<.5}));
   }
  },
  // Probador: se cambia de disfraz de un brinco en otro y se queda con el que más le gusta.
  probador:{
   foto:()=>({pose:'hola',atuendo:uno(['gala','charro','luchador']),e:{parpadeo:'guino'}}),
   correr(fin){
    const lista=barajarMey(ATUENDOS_MEY.filter(a=>a!==atuendo&&a!=='ninguno'),azar);
    const pasos=[];
    for(const a of lista)pasos.push(...brinco(2),[0,()=>{atuendo=a;pintar();}],[entre(6,11),{mirada:{dx:uno([-1,1]),dy:0}}],[entre(4,7),{mirada:{dx:0,dy:0}}]);
    const final=uno([...lista,'rebozo']);
    pasos.push(...brinco(2),[0,()=>{atuendo=final;poner({parpadeo:'guino'});}],[4,{parpadeo:false}],...saludo());
    secuencia(pasos,fin);
   }
  },
  // Baile: pasos al azar sin repetir el anterior y papel picado al final.
  baile:{
   foto:()=>({pose:'exito',e:{fiesta:true}}),
   correr(fin){
    const movs=[()=>[[0,{chapoteo:'izq'}],[2,{chapoteo:'der'}],[2,{chapoteo:null}]],()=>brinco(2),()=>girar(()=>-rumbo),()=>[[0,{inclinar:1}],[2,{inclinar:-1}],[2,{inclinar:0}]],()=>saludo(),()=>[...brinco(2),[0,{parpadeo:'guino'}],[2,{parpadeo:false}]]];
    const pasos=[],n=6+Math.floor(azar()*6);let previo=-1;
    for(let i=0;i<n;i++){let k=Math.floor(azar()*movs.length);if(k===previo)k=(k+1)%movs.length;previo=k;const m=movs[k]();m[0][0]=i?entre(2,4):0;pasos.push(...m);}
    secuencia([...pasos,...sentarse(),[0,{parpadeo:'ambos'}],...levantarse(),[0,{parpadeo:false,ojos:'grandes'}],[2,{ojos:null}],...saludo(),...fiesta()],fin);
   }
  },
  // Hipo: brinquitos con burbuja y cara de «perdón».
  hipo:{
   foto:()=>({pose:'hola',e:{burbujas:[[9,2]],ojos:'grandes'}}),
   correr(fin){
    const pasos=[],n=3+Math.floor(azar()*3);
    for(let i=0;i<n;i++)pasos.push(...hipido(i?entre(8,19):4),[0,{mirada:{dx:uno([-1,0,1]),dy:0}}]);
    secuencia([...pasos,[6,{mirada:{dx:0,dy:0},parpadeo:'guino'}],[4,{parpadeo:false}],...risa()],fin);
   }
  },
  // Da vueltas cada vez más rápido, se marea, se sienta y sacude la cabeza.
  mareo:{
   foto:()=>({pose:'hola',e:{sentada:true,inclinar:uno([-1,1]),mirada:{dx:1,dy:-1}}}),
   correr(fin){
    const vueltas=6+Math.floor(azar()*5);
    const marear=i=>{
     if(i>=vueltas){
      const circulo=[{dx:1,dy:0},{dx:1,dy:-1},{dx:0,dy:-1},{dx:-1,dy:-1},{dx:-1,dy:0},{dx:0,dy:0}],pasos=[];
      for(let k=0;k<12;k++)pasos.push([2,{mirada:circulo[k%6],inclinar:k%4<2?1:-1}]);
      return secuencia([...pasos,...sentarse(),[0,{inclinar:0,mirada:{dx:0,dy:0}}],[entre(14,24),{mirada:{dx:-1,dy:0}}],[2,{mirada:{dx:1,dy:0}}],[2,{mirada:{dx:-1,dy:0}}],[2,{mirada:{dx:0,dy:0}}],...levantarse(),[4,{parpadeo:'guino'}],[4,{parpadeo:false}]],fin);
     }
     const intervalo=Math.max(2,4-Math.floor(2*i/vueltas));
     secuencia(girar(()=>-rumbo),()=>despues(enCuadros(intervalo-2),()=>marear(i+1)));
    };
    marear(0);
   }
  },
  // Llega corriendo, se tropieza, se ríe de sí misma y saluda.
  carrera:{
   foto:()=>({pose:'hola',e:{sentada:true,ojos:'grandes'}}),
   inicio(primero,listo){lado0=primero?lado():cerca();esconderse(primero,lado0,listo);},
   correr(fin){
    const tropiezo=[...tropezar(),...risa(),...levantarse(),...saludo()];
    caminar(lado0<0?entre(6,30)*celda:holgura()-entre(6,30)*celda,()=>secuencia(tropiezo,fin),{cuadros:1,zancada:2,libre:true});
   }
  },
  // Estornudo (a veces falsa alarma primero): ¡achú! de burbujas.
  estornudo:{
   foto:()=>({pose:'hola',e:{parpadeo:'ambos',inclinar:-1}}),
   correr(fin){
    const nube=()=>Array.from({length:5+Math.floor(azar()*4)},()=>[entre(1,15),entre(0,6)]);
    const aguantar=[[0,{parpadeo:'ambos',inclinar:-1}],[entre(5,8),{inclinar:0}],[3,{inclinar:-1}]];
    const falsa=azar()<.5?[[entre(6,10),{inclinar:0,parpadeo:false,ojos:'grandes'}],[entre(7,13),{ojos:null,mirada:{dx:0,dy:-1}}],[entre(6,11),{mirada:{dx:0,dy:0}}],[entre(4,8),{inclinar:-1,parpadeo:'ambos'}]]:[];
    secuencia([...aguantar,...falsa],()=>despues(enCuadros(entre(4,7)),()=>{
     const salto=brinco(2);
     salto[0]=[0,{...salto[0][1],inclinar:1,parpadeo:false,ojos:'grandes',burbujas:nube()}];
     secuencia(salto,()=>secuencia([[3,{burbujas:nube()}],[3,{burbujas:nube()}],[4,{burbujas:null,inclinar:0,ojos:null}],[4,{mirada:{dx:-1,dy:0}}],[4,{mirada:{dx:1,dy:0}}],[4,{mirada:{dx:0,dy:0}}],...risa()],fin));
    }));
   }
  },
  // Lee mientras camina, choca con algo invisible, se voltea y sigue leyendo.
  lectura:{
   foto:()=>({pose:'leyendo'}),
   inicio(primero,listo){pose='leyendo';pintar();listo();},
   correr(fin){
    const leer=[];for(let i=0,n=2+Math.floor(azar()*3);i<n;i++)leer.push([i?4:0,{mirada:{dx:-1,dy:0}}],[entre(6,10),{mirada:{dx:0,dy:0}}],[entre(5,8),{mirada:{dx:1,dy:0}}]);
    if(!conPaseo())return secuencia([...leer,[5,{mirada:{dx:0,dy:0},parpadeo:'ambos'}],[7,{inclinar:1}],[entre(8,14),{inclinar:0,parpadeo:false,ojos:'grandes'}],...brinco(2),[5,()=>{pose=poseVigilia;poner({ojos:null});}],...risa()],fin);
    const choque=[[0,()=>{pose=poseVigilia;poner({ojos:'grandes',inclinar:-1});}],...brinco(2),[6,{inclinar:0,ojos:null,mirada:{dx:-1,dy:0}}],[5,{mirada:{dx:0,dy:0}}],...girar(()=>-rumbo),[0,()=>{pose='leyendo';pintar();}],[entre(6,12),()=>{}]];
    secuencia([...leer,[4,{mirada:{dx:0,dy:0}}]],()=>caminar(aDistancia(entre(8,20)),()=>secuencia(choque,()=>caminar(aDistancia(entre(5,14)),()=>{pose=poseVigilia;pintar();fin();},{cuadros:3}),{cuadros:3})));
   }
  },
  // Piensa con la mirada arriba, se le prende el foco, corre brincando y celebra.
  idea:{
   foto:()=>({pose:'pensando'}),
   inicio(primero,listo){pose='pensando';pintar();listo();},
   correr(fin){
    secuencia([[0,{mirada:{dx:0,dy:-1}}],[entre(11,18),{mirada:{dx:1,dy:-1}}],[entre(8,14),{mirada:{dx:-1,dy:-1}}]],()=>{
     pose=poseVigilia;
     const salto=brinco(2);
     salto[0]=[0,{...salto[0][1],destello:[13,1],ojos:'grandes',mirada:{dx:0,dy:0}}];
     secuencia(salto,()=>secuencia([[5,{destello:null,ojos:null}]],()=>caminar(aDistancia(entre(6,20)),()=>secuencia([...brinco(2),[0,{parpadeo:'guino'}],[2,{parpadeo:false}],...saludo(),...fiesta()],fin),{cuadros:entre(1,3),brinco:true})));
    });
   }
  },
  // El gran salto (ironía): se prepara muchísimo, tiembla de concentración… y el salto es de una
  // celda. Aterriza orgullosa y saluda como si nada.
  gransalto:{
   foto:()=>({pose:'hola',e:{sentada:true,parpadeo:'ambos'}}),
   correr(fin){
    const temblor=[];for(let i=0,n=6+Math.floor(azar()*6);i<n;i++)temblor.push([i?1:entre(6,11),{inclinar:i%2?1:-1}]);
    secuencia([...sentarse(),[0,{parpadeo:'ambos'}],...temblor,[2,{inclinar:0,parpadeo:false,ojos:'grandes'}]],()=>despues(enCuadros(6),()=>secuencia([...levantarse(),...brinco(1),[entre(6,11),{mirada:{dx:-1,dy:0}}],[5,{mirada:{dx:1,dy:0}}],[5,{mirada:{dx:0,dy:0},parpadeo:'guino'}],[4,{parpadeo:false}],...saludo()],fin)));
   }
  },
  // Resbalón: de tanto jugar le escurre una gota de sudor, la gota llega al piso y ella la pisa.
  // Después mira a los lados: «¿nadie vio?».
  resbalon:{
   foto:()=>({pose:'hola',e:{sentada:true,inclinar:-1,ojos:'grandes'}}),
   correr(fin){
    const gota=[[14,8],[14,9],[14,11],[14,13],[14,15],[14,17]];
    secuencia([...gota.map(([x,y],i)=>[i?entre(2,3):0,{burbujas:[[x,y]]}]),[entre(6,11),{mirada:{dx:1,dy:0}}],[5,{mirada:{dx:0,dy:0},caminando:2}],[2,{caminando:1,burbujas:null,inclinar:-1,ojos:'grandes'}]],()=>secuencia([...brinco(2),[0,{caminando:0}]],()=>secuencia([...sentarse(),[0,{inclinar:0}],[8,{mirada:{dx:-1,dy:0}}],[3,{mirada:{dx:1,dy:0}}],[3,{mirada:{dx:-1,dy:0}}],[3,{mirada:{dx:0,dy:0},ojos:null}],...levantarse(),[4,{parpadeo:'guino'}],[4,{parpadeo:false}],...saludo()],fin)));
   }
  },
  // La burbuja la persigue a ella: huye mirando atrás y la burbuja le revienta en la cara.
  perseguida:{
   foto:()=>({pose:'hola',e:{burbujas:[[1,5]],ojos:'grandes',mirada:{dx:-1,dy:0}}}),
   correr(fin){
    secuencia([[0,{burbujas:[[9,4]],mirada:{dx:0,dy:-1}}],[4,{burbujas:[[7,3]]}],[4,{burbujas:[[4,3]],mirada:{dx:-1,dy:0}}],[4,{burbujas:[[2,5]],ojos:'grandes'}]],
     ()=>despues(enCuadros(5),()=>caminar(aDistancia(entre(10,26)),()=>secuencia([[0,{burbujas:[[3,4]],mirada:{dx:0,dy:0}}],[2,{burbujas:[[5,5]]}],[2,{burbujas:null,destello:[6,4],parpadeo:'ambos',ojos:null}],[4,{destello:null}],[5,{parpadeo:false}],...risa()],fin),{cuadros:1})));
   }
  },
  // Se le olvida la gravedad: flota, patalea en el aire, se acuerda… y cae de sentón.
  gravedad:{
   foto:()=>({pose:'hola',e:{flotar:2,ojos:'grandes',caminando:1}}),
   correr(fin){
    const pasos=[[0,{ojos:'grandes'}]];
    for(let k=1;k<=4;k++)pasos.push([entre(4,7),{flotar:k,caminando:k%2?1:2}]);
    for(let i=0,n=3+Math.floor(azar()*4);i<n;i++)pasos.push([2,{caminando:i%2?1:2,mirada:{dx:i%2?1:-1,dy:0}}]);
    secuencia([...pasos,[entre(6,11),{caminando:0,mirada:{dx:0,dy:0},ojos:null,parpadeo:'guino'}],[4,{parpadeo:false,ojos:'grandes'}],[1,{flotar:2}],[1,{flotar:0,inclinar:1}],...sentarse(),[0,{inclinar:0}],[7,{ojos:null,mirada:{dx:-1,dy:0}}],[4,{mirada:{dx:1,dy:0}}],[4,{mirada:{dx:0,dy:0}}],...levantarse(),...risa()],fin);
   }
  },
  // Se evapora (química pura): pierde el líquido de las perneras fila por fila, se preocupa,
  // se junta una nube arriba y le llueve adentro hasta quedar llena otra vez.
  evaporacion:{
   foto:()=>({pose:'hola',e:{seca:2,mirada:{dx:0,dy:-1},burbujas:[[5,1],[10,0]]}}),
   correr(fin){
    const vapor=k=>[entre(6,10),{seca:k,burbujas:[[entre(3,13),entre(0,3)],[entre(3,13),entre(0,3)]]}];
    const nube=[[6,0],[7,0],[8,0],[9,0],[5,1],[10,1]];
    secuencia([[0,{mirada:{dx:0,dy:-1}}],vapor(1),vapor(2),vapor(3),[6,{ojos:'grandes',burbujas:null}],[8,{ojos:null,mirada:{dx:-1,dy:0}}],[6,{mirada:{dx:1,dy:0}}],[6,{mirada:{dx:0,dy:-1},burbujas:nube}],[7,{burbujas:[...nube,[7,2],[9,1]]}],[3,{burbujas:[...nube,[7,3],[9,2],[6,1]],seca:2}],[3,{burbujas:[...nube,[9,3],[6,2],[8,1]],seca:1}],[3,{burbujas:[...nube,[6,3],[8,2]],seca:0}],[4,{burbujas:null,mirada:{dx:0,dy:0}}],...risa()],fin);
   }
  },
  // Camina por el techo: de un brinco queda de cabeza, pasea así tan campante y se cae.
  techo:{
   foto:()=>({pose:'hola',e:{deCabeza:true}}),
   correr(fin){
    const caida=[[4,{mirada:{dx:0,dy:-1}}],[7,{ojos:'grandes'}],[4,{deCabeza:false,inclinar:1}],...sentarse(),[0,{inclinar:0}],[7,{ojos:null,mirada:{dx:-1,dy:-1}}],[2,{mirada:{dx:1,dy:-1}}],[2,{mirada:{dx:0,dy:0}}],...levantarse(),...risa()];
    secuencia([...brinco(2),...brinco(2),[0,{deCabeza:true,ojos:'grandes'}],[7,{ojos:null}]],
     ()=>caminar(aDistancia(entre(5,14)),()=>secuencia(caida,fin),{cuadros:2,torpe:false}));
   }
  },
  // Paso lunar: las patas avanzan, pero Mey se desliza mirando al lado contrario.
  pasolunar:{
   foto:()=>({pose:'hola',e:{caminando:3,brazoIzq:1,parpadeo:'guino'}}),
   correr(fin){
    const terminar=()=>secuencia([[0,{caminando:0,parpadeo:'guino'}],[6,{parpadeo:false}],...saludo()],fin);
    if(conPaseo())caminar(aDistancia(entre(8,18)),terminar,{cuadros:3,atras:true,torpe:false});
    else secuencia([[0,{caminando:1,inclinar:1}],[3,{caminando:3,inclinar:0}],[3,{caminando:2,inclinar:-1}],[3,{caminando:4,inclinar:0}],[3,{caminando:0}]],terminar);
   }
  },
  // Protesta por nada, patalea... y termina celebrando su propia protesta.
  berrinche:{
   foto:()=>({pose:'hola',e:{brazoIzq:2,brazoDer:2,agachar:1}}),
   correr(fin){
    const pasos=[[0,{brazoIzq:2,brazoDer:2}]];
    for(let i=0,n=entre(3,6);i<n;i++)pasos.push([3,{chapoteo:'izq',agachar:1,inclinar:-1}],[3,{chapoteo:'der',agachar:0,inclinar:1}]);
    secuencia([...pasos,[3,{chapoteo:null,inclinar:0,brazoIzq:0,brazoDer:1}],...risa(),...fiesta()],fin);
   }
  },
  // Suelta una burbuja, mira a los lados y se hace la que estaba leyendo.
  inocente:{
   foto:()=>({pose:'leyendo',e:{mirada:{dx:1,dy:0}}}),
   correr(fin){
    secuencia([[0,()=>{pose='hola';pintar();}],...TRAVESURAS.burbuja,[4,{mirada:{dx:-1,dy:0}}],[5,{mirada:{dx:1,dy:0}}],[4,()=>{pose='leyendo';poner({mirada:{dx:0,dy:0}});}],[16,()=>{pose=poseVigilia;poner({parpadeo:'guino'});}],[4,{parpadeo:false}]],fin);
   }
  },
  // Mucho esfuerzo para teletransportarse: sigue exactamente en el mismo sitio.
  teletransporte:{
   foto:()=>({pose:'pensando',e:{agachar:1,destello:[12,1]}}),
   correr(fin){
    const pasos=[];
    for(let i=0,n=entre(3,5);i<n;i++)pasos.push([3,{agachar:1,parpadeo:'ambos',inclinar:-1}],[3,{inclinar:1,destello:[12,1]}]);
    secuencia([...pasos,[2,{inclinar:0,agachar:0,parpadeo:false,destello:null}],...brinco(2),[0,{ojos:'grandes',mirada:{dx:-1,dy:0}}],[8,{mirada:{dx:1,dy:0}}],[8,{ojos:null,mirada:{dx:0,dy:0}}],...risa()],fin);
   }
  },
  // Saluda a su público imaginario; la reverencia se convierte en un sentón.
  reverencia:{
   foto:()=>({pose:'hola',e:{inclinar:1,brazoIzq:1}}),
   correr(fin){
    secuencia([...saludo(),[3,{inclinar:1,agachar:1}],[4,{inclinar:1,ojos:'grandes'}],...tropezar(),...levantarse(),[0,{inclinar:0,ojos:null}],...risa()],fin);
   }
  },
  // Se niega con la cabeza, se sienta de espaldas... y vuelve a asomarse por curiosidad.
  rebeldia:{
   foto:()=>({pose:'hola',e:{sentada:true,mirada:{dx:-1,dy:0},brazoDer:0}}),
   correr(fin){
    secuencia([[0,{mirada:{dx:-1,dy:0},brazoDer:0}],[4,{mirada:{dx:1,dy:0}}],[4,{mirada:{dx:-1,dy:0}}],...girar(()=>-rumbo),...sentarse(),[12,{mirada:{dx:1,dy:-1}}],[8,{parpadeo:'guino'}],[3,{parpadeo:false}],...levantarse(),...girar(()=>-rumbo),...saludo()],fin);
   }
  },
  // Huelga de unos segundos: dice NO con su cartel, revisa si la vieron y se despide feliz.
  huelga:{
   foto:()=>({pose:'hola',e:{cartel:true,brazoDer:1,mirada:{dx:-1,dy:0}}}),
   correr(fin){
    secuencia([[0,{cartel:true,brazoDer:1}],[10,{mirada:{dx:-1,dy:0}}],[10,{mirada:{dx:1,dy:0}}],[8,{mirada:{dx:0,dy:0},agachar:1}],[6,{agachar:0}],[10,{parpadeo:'guino'}],[4,{parpadeo:false,cartel:false}],...saludo()],fin);
   }
  },
  // Exige atención con las manos, espera... y se concede su propia ovación.
  aplausos:{
   foto:()=>({pose:'hola',e:{brazoIzq:2,saludo:2,ojos:'grandes'}}),
   correr(fin){
    secuencia([[0,{brazoIzq:2,saludo:2,ojos:'grandes'}],[8,{mirada:{dx:-1,dy:0}}],[8,{mirada:{dx:1,dy:0}}],[10,{mirada:{dx:0,dy:0},ojos:null}],[8,{agachar:1}],[4,{agachar:0,brazoIzq:0,saludo:false}],...TRAVESURAS.aplauso,[6,{brazoIzq:0,brazoDer:0,saludo:false,agachar:0,estirar:0}],[5,{inclinar:1}],[5,{inclinar:0,parpadeo:'guino'}],[4,{parpadeo:false}]],fin);
   }
  },
  // Confeti sin culpable: lo avienta, señala fuera del escenario y abre su libro.
  confeti:{
   foto:()=>({pose:'leyendo',e:{confeti:2,mirada:{dx:1,dy:0}}}),
   correr(fin){
    secuencia([[0,{brazoIzq:2,saludo:2,confeti:1,ojos:'felices'}],[4,{confeti:2}],[4,{confeti:3,brazoIzq:0,saludo:false}],[4,{confeti:4,ojos:null}],[4,{confeti:5}],[4,{confeti:0,mirada:{dx:-1,dy:0}}],[8,{mirada:{dx:1,dy:0},brazoDer:1}],[8,()=>{pose='leyendo';poner({brazoDer:0,mirada:{dx:0,dy:0}});}],[18,{parpadeo:'guino'}],[4,{parpadeo:false}]],fin);
   }
  },
  // Estatuas de marfil: avanza de puntitas y se congela si mueves el puntero (o cuando se le antoja).
  estatuas:{
   foto:()=>({pose:'hola',e:{caminando:1,ojos:'grandes'}}),
   correr(fin){
    let congelada=0;
    const pausa=()=>{
     if(congelada<25&&(ahora()-ultimoPuntero<700||azar()<.08)){congelada++;if(!e.ojos)poner({ojos:'grandes'});return 5;}
     if(e.ojos)poner({ojos:null});return 0;
    };
    // Sin espacio: baila en su lugar y se congela en poses chistosas, con ojos de «¿me viste?».
    if(!conPaseo()){
     const quieta={chapoteo:null,saludo:false,inclinar:0,salto:0};
     const poses=[()=>[[0,{...quieta,chapoteo:'izq'}]],()=>[[0,{...quieta,chapoteo:'der'}]],()=>[...saludo(),[0,quieta]],()=>[[0,{...quieta,inclinar:1}]],()=>[[0,{...quieta,inclinar:-1}]],()=>[...brinco(2),[0,quieta]]];
     const pasos=[];for(let i=0,n=8+Math.floor(azar()*5);i<n;i++){const gesto=uno(poses)();if(i)gesto[0][0]=entre(3,5);pasos.push(...gesto);if(azar()<.3)pasos.push([0,{ojos:'grandes'}],[entre(8,13),{ojos:null}]);}
     return secuencia([...pasos,[3,quieta],...risa()],fin);
    }
    const tramos=2+Math.floor(azar()*2);
    const tramo=k=>{
     if(k>=tramos)return secuencia([[0,{ojos:null,caminando:0,parpadeo:'guino'}],[4,{parpadeo:false}],...risa()],fin);
     caminar(aDistancia(entre(5,14)),()=>despues(enCuadros(entre(4,8)),()=>tramo(k+1)),{cuadros:3,sigilo:true,pausa});
    };
    tramo(0);
   }
  }
 };
 const empezar=(nombre,fin)=>{
  let n=nombre||pendiente||mey.siguienteJuego(memoria,azar,JUEGOS_MEY,personalidad);
  // Nunca el mismo juego dos veces seguidas, aunque el primero haya venido forzado.
  if(!nombre&&!pendiente&&n===ultimoJuego&&JUEGOS_MEY.length>1)n=mey.siguienteJuego(memoria,azar,JUEGOS_MEY,personalidad);
  pendiente=null;jugando=n;ultimoJuego=n;finJuegoActual=fin||null;
  const primero=!jugados++;
  pose=poseVigilia;atuendo=opciones.atuendo||apariencia.leer();e=neutro();
  if(primero&&conPaseo()){x=alAzar();rumbo=lado();}
  pintar();
  const listo=()=>despues(enCuadros(primero?entre(6,14):entre(4,8)),()=>JUEGOS[n].correr(terminar));
  JUEGOS[n].inicio?JUEGOS[n].inicio(primero,listo):listo();
 };
 const terminar=()=>{
  const fin=finJuegoActual;
  finJuegoActual=null;
  jugando=null;
  ultimoFinJuego=ahora();
  pose=poseVigilia;
  atuendo=opciones.atuendo||apariencia.leer();
  e=neutro();
  pintar();
  fin&&fin();
 };
 const foto=n=>{const f=JUEGOS[n].foto();pose=f.pose;if(f.atuendo)atuendo=f.atuendo;e={...neutro(),...f.e};if(conPaseo()){x=alAzar();rumbo=lado();}};
 // Al clic, en el recreo reacciona distinto cada vez (nunca dos veces seguidas lo mismo).
 const REACCIONES={celebrar:null,risa,tropiezo:()=>tropezar(),guino:()=>TRAVESURAS.guino,hipo:()=>hipido(),sorpresa:()=>TRAVESURAS.sorpresa};
 const completarConducta=nombre=>{
  if(conductaActual!==nombre)return;
  conductaActual=null;
  ultimaConductaMovimiento=ahora();
  noAntesDe=ahora()+enCuadros(entre(24,72))*(2-imp.energia)*perfil().pausa;
 };
 const roncada=()=>{
  if(!durmiendo||!activo)return;
  const pasos=[[0,{burbuja:0}],[2,{burbuja:1}],[2,{burbuja:2}],[2,{burbuja:3}],[2,{burbuja:4}],[2,{burbuja:5}],[2,{burbuja:null}]];
  secuencia(pasos,()=>{if(durmiendo){ocupada=true;despues(enCuadros(entre(4,10)),roncada);}});
 };
 const COMPORTAMIENTOS={
  quieta:fin=>fin(),
  pasear:fin=>{
   if(!conPaseo())return fin();
   caminar(alAzar(),()=>{
    if(azar()<.3){
     secuencia(sentarse(),()=>{ocupada=true;despues(enCuadros(entre(24,48)),()=>secuencia(levantarse(),fin));});
    }else fin();
   });
  },
  acercarse:fin=>{
   if(!conPaseo()||punteroX===null)return fin();
   caminar(punteroX-8*celda,()=>{
    const dx=punteroX<x+8*celda?-1:punteroX>x+8*celda?1:0;
    const mirada={dx:rumbo<0?-dx:dx,dy:0};
    poner({mirada,ojos:imp.afecto>.6?'felices':null});
    ocupada=true;
    despues(enCuadros(entre(36,72)),()=>{poner({mirada:{dx:0,dy:0},ojos:null});fin();});
   });
  },
  curiosear:fin=>{
   if(!novedad)return fin();
   const m={dx:novedad.dx,dy:novedad.dy};
   secuencia([[0,{mirada:m,inclinar:m.dx}],[24,{mirada:{dx:0,dy:0},inclinar:0}]],()=>{novedad=null;fin();});
  },
  travesura:fin=>{
   const lista=mey.travesuras.filter(n=>n!=='celebrar'&&n!=='enojo'&&n!==ultimaTravesura);
   const n=uno(lista);ultimaTravesura=n;
   secuencia(TRAVESURAS[n],fin);
  },
  jugar:fin=>empezar(undefined,fin),
  bostezar:fin=>secuencia(TRAVESURAS.bostezo,fin),
  estirarse:fin=>secuencia(TRAVESURAS.estirarse,fin),
  pensar:fin=>secuencia(TRAVESURAS.pensar,fin),
  bailar:fin=>JUEGOS.baile.correr(fin),
  dormir:fin=>{
   secuencia(TRAVESURAS.bostezo,()=>secuencia(sentarse(),()=>{
    durmiendo=true;pose='dormido';poner({burbuja:null,sentada:true});finDormir=fin;roncada();
   }));
  }
 };
 const correrConducta=nombre=>{
  const comportamiento=COMPORTAMIENTOS[nombre]||COMPORTAMIENTOS.quieta;
  conductaActual=nombre;
  ultimaConductaMovimiento=ahora();
  comportamiento(()=>completarConducta(nombre));
 };
 const estadoSensorial=()=>{
  const t=ahora();
  return {
   inactividad:Math.max(0,(t-ultimaActividad)/1000),
   cerca:t-ultimaCercana<2000,
   estimulo:novedad?1:(t-ultimoPuntero<500?.25:0),
   caricia:cariciaPendiente,
   durmiendo,
   hora:new Date(fecha()).getHours(),
   paseo:conPaseo(),
   juegos:recreo,
   punteroVisto:Number.isFinite(ultimoPuntero)&&t-ultimoPuntero<5000,
   distancia:distanciaPuntero,
   novedad,
   quietaMucho:t-ultimaConductaMovimiento>30000,
   escribiendo:t-ultimaTecla<4000,
   personalidad
  };
 };
 const persistirConducta=(forzar=false)=>{
  const afecto=clampMey(imp.afecto,0,1);
  if(!forzar&&Math.abs(afecto-ultimoAfectoPersistido)<=.02)return;
  memGuardada={visitas,ultima:fecha(),afecto};
  try{memoriaConducta.guardar({...memGuardada});}catch{}
  ultimoAfectoPersistido=afecto;
  ultimaPersistencia=ahora();
 };
 const latido=()=>{
  if(!activo||energia()!=='completa')return;
  const s=estadoSensorial();
  imp=mey.mente.actualizar(imp,s,.5);
  cariciaPendiente=false;
  if(!saludoPresenciaRealizado&&dentroDesde!==null&&ahora()-dentroDesde>=enCuadros(18)&&ultimoClic<dentroDesde){
   saludoPresenciaRealizado=true;
   imp.afecto=clampMey(imp.afecto+.04,0,1);
   if(!durmiendo&&!ocupada&&!jugando)ejecutarReaccion('saludo');
  }
  if(durmiendo){
   if(ahora()-ultimaCercana<2000||imp.sueno<.2)despertar();
  }else if(!ocupada&&!jugando&&ahora()>=noAntesDe){
   const nombre=recreo&&!s.escribiendo&&ahora()-ultimoFinJuego>enCuadros(96)*perfil().pausa?'jugar':
    mey.mente.elegir(['quieta','pasear','acercarse','curiosear','travesura','jugar','bostezar','estirarse','pensar','bailar','dormir'],imp,s,ultimaVezConducta,ahora()/1000,azar);
   ultimaVezConducta[nombre]=ahora()/1000;
   correrConducta(nombre);
  }
  if(ahora()-ultimaPersistencia>=30000&&Math.abs(imp.afecto-ultimoAfectoPersistido)>.02)persistirConducta();
  despues(enCuadros(6),latido,true);
 };
 const vida=()=>{
  if(!activo)return;
  if(!ocupada&&!durmiendo){
   const fotoDormida=pose==='dormido';
   if(fotoDormida||azar()<.7){
    const pasos=[[0,{ojos:'cerrados'}],[imp.sueno>.5?4:1,{ojos:null}]];
    if(azar()<.3)pasos.push([2,{ojos:'cerrados'}],[1,{ojos:null}]);
    secuencia(pasos);
   }else secuencia([[0,{estirar:1}],[2,{estirar:0}]]);
  }
  despues(enCuadros(entre(22,50))*perfil().pausa,vida,true);
 };
 const ejecutarReaccion=(nombre,fin)=>{
  const funcion=REACCIONES[nombre];
  const pasos=nombre==='celebrar'?TRAVESURAS.celebrar:(typeof funcion==='function'?funcion():TRAVESURAS[nombre]);
  if(!pasos){fin&&fin();return;}
  conductaActual='reaccion';
  secuencia(pasos,()=>{conductaActual=null;noAntesDe=ahora()+enCuadros(24);fin&&fin();});
 };
 const alClic=()=>{
  const t=ahora();
  ultimaActividad=t;
  if(energia()!=='completa'||!activo)return;
  ultimaCercana=t;
  const reinicia=ultimoClic===-Infinity||t-ultimoClic>=4000;
  if(reinicia){historialClics=[];afectoAlIniciarRafaga=imp.afecto;}
  historialClics=historialClics.filter(x=>t-x<=6000);
  historialClics.push(t);ultimoClic=t;
  if(durmiendo){despertar();return;}
  if(jugando)return;
  const n=historialClics.length;
  if(n>1)cariciaPendiente=false;
  if(n>=8){
   interrumpir();jugando='mareo';conductaActual='mareo';
   JUEGOS.mareo.correr(()=>{
    jugando=null;conductaActual=null;ultimoFinJuego=ahora();pose=poseVigilia;e=neutro();pintar();
    noAntesDe=ahora()+enCuadros(24);
   });
   return;
  }
  if(t<finMolesta){interrumpir();ultimaReaccion='sorpresa';ejecutarReaccion('sorpresa');return;}
  if(n>=4){
   imp.afecto=clampMey(Math.min(imp.afecto,afectoAlIniciarRafaga??imp.afecto)-.1,0,1);finMolesta=t+8000;
   interrumpir();ultimaReaccion='enojo';ejecutarReaccion('enojo');return;
  }
  if(n>=2&&n<=3&&t-historialClics[0]<=2500){
   interrumpir();ultimaReaccion='cosquillas';ejecutarReaccion('cosquillas');return;
  }
  if(n===1){
   cariciaPendiente=true;
   const nombre=recreo?uno(['celebrar','risa','tropiezo','guino','hipo','sorpresa','cosquillas'].filter(x=>x!==ultimaReaccion)):'celebrar';
   ultimaReaccion=nombre;interrumpir();ejecutarReaccion(nombre);
  }
 };
 const alTecla=()=>{ultimaActividad=ahora();ultimaTecla=ahora();};
 const alClicPagina=()=>{ultimaActividad=ahora();};
 let ultimaPosicionScroll=Number(ventana.scrollY)||0;
 const alScroll=()=>{
  ultimaActividad=ahora();
  const y=Number(ventana.scrollY)||0,dy=y>=ultimaPosicionScroll?1:-1;
  ultimaPosicionScroll=y;
  if(ahora()-ultimoPuntero<1000||durmiendo)return;
  const antes=e.mirada;
  poner({mirada:{dx:antes.dx,dy}});
  despues(enCuadros(12),()=>{if(e.mirada.dy===dy)poner({mirada:{dx:antes.dx,dy:antes.dy}});});
 };
 const alFocus=ev=>{
  ultimaActividad=ahora();
  const b=host.getBoundingClientRect(),objetivo=ev.target?.getBoundingClientRect?.();
  if(!objetivo)return;
  const cx=b.left+(conPaseo()?x+8*celda:b.width/2),cy=b.top+b.height/2;
  const fx=objetivo.left+objetivo.width/2,fy=objetivo.top+objetivo.height/2;
  const dxDist=fx-cx,dyDist=fy-cy,cerca=Math.hypot(dxDist,dyDist)<4*celda;
  const dx=cerca?0:Math.sign(dxDist),dy=cerca?0:Math.sign(dyDist);
  novedad=dx||dy?{dx,dy}:null;
  if(durmiendo)return;
  const anterior=e.mirada;poner({mirada:{dx,dy}});
  despues(enCuadros(12),()=>{if(e.mirada.dx===dx&&e.mirada.dy===dy)poner({mirada:anterior});});
 };
 const aplicarEvento=tipo=>{
  if(tipo==='exito')return ejecutarReaccion('celebrar');
  if(tipo==='guardado')return ejecutarReaccion('asentir');
  if(tipo==='error'||tipo==='aviso')return ejecutarReaccion('preocupacion');
  if(tipo==='listo')return ejecutarReaccion('sorpresa',()=>ejecutarReaccion('saludo'));
  if(tipo==='carga'){
   enCarga=true;conductaActual='carga';const inicio=ahora();
   const pensar=()=>{
    if(!enCarga)return;
    if(ahora()-inicio>=30000){enCarga=false;conductaActual=null;return;}
    secuencia(TRAVESURAS.pensar,()=>{if(enCarga){ocupada=true;despues(enCuadros(1),pensar);}else conductaActual=null;});
   };
   pensar();
   despues(30000,()=>{enCarga=false;if(!ocupada)conductaActual=null;});
  }
 };
 const lanzarEvento=(tipo,desdeControl=false)=>{
  if(!mey.eventos.includes(tipo)){
   if(desdeControl)throw new Error('mey: evento desconocido: '+tipo);
   return;
  }
  if(!activo)return;
  const t=ahora();
  if(tipo==='guardado'){if(durmiendo||conductaActual==='dormir'||t-guardadoEn<60000)return;guardadoEn=t;}
  else if(ultimoEvento.tipo===tipo&&t-ultimoEvento.t<3000)return;
  ultimoEvento={tipo,t};
  ultimaActividad=t;
  const dormida=durmiendo;
  interrumpir();
  if(dormida){durmiendo=true;pose='dormido';e={...neutro(),sentada:true};pintar();despertar(()=>aplicarEvento(tipo));}
  else aplicarEvento(tipo);
 };
 const alEventoVentana=ev=>lanzarEvento(ev.detail?.tipo,false);
 const reducido=ventana.matchMedia?ventana.matchMedia('(prefers-reduced-motion: reduce)'):null;
 const puedeMoverse=()=>opciones.vivo!==false&&energia()!=='quieta'&&!(reducido&&reducido.matches)&&!ventana.navigator?.connection?.saveData&&visible&&!doc.hidden;
 const quitarSensores=()=>{
  ventana.removeEventListener('pointermove',alPuntero);
  ventana.removeEventListener('click',alClicPagina,true);
  ventana.removeEventListener('keydown',alTecla);
  ventana.removeEventListener('scroll',alScroll,true);
  doc.removeEventListener('focusin',alFocus);
  ventana.removeEventListener('erlen-mey-evento',alEventoVentana);
 };
 const agregarSensores=()=>{
  if(energia()==='completa'){
   ventana.addEventListener('pointermove',alPuntero,{passive:true});
   ventana.addEventListener('click',alClicPagina,true);
   ventana.addEventListener('keydown',alTecla);
   ventana.addEventListener('scroll',alScroll,true);
   doc.addEventListener('focusin',alFocus);
  }
  if(energia()==='completa'||energia()==='calma')ventana.addEventListener('erlen-mey-evento',alEventoVentana);
 };
 const parar=()=>{
  const estaba=activo;
  activo=false;ocupada=false;
  for(const id of escena)reloj.clearTimeout(id);
  for(const id of fijos)reloj.clearTimeout(id);
  escena.clear();fijos.clear();quitarSensores();
  if(!recreo||estaba)e=durmiendo?{...neutro(),sentada:true}:neutro();
  if(recreo){if(jugando){pendiente=jugando;jugados=0;jugando=null;finJuegoActual=null;pose=poseVigilia;}x=Math.max(0,Math.min(holgura(),x));}
  if(!durmiendo)conductaActual=null;
  pintar();
 };
 const arrancar=()=>{
  if(activo||!puedeMoverse())return;
  activo=true;
  agregarSensores();
  despues(enCuadros(entre(14,32)),vida,true);
  if(energia()!=='completa')return;
  despues(enCuadros(6),latido,true);
  if(durmiendo){conductaActual='dormir';roncada();return;}
  if(recreo){empezar();return;}
  if(!bienvenidaProgramada&&(r.lugar==='bienvenida'||r.lugar==='vacio')){
   bienvenidaProgramada=true;
   const espera=entre(12,24),hora=new Date(fecha()).getHours();
   noAntesDe=ahora()+enCuadros(espera+24);
   despues(enCuadros(espera),()=>{
    const saludar=()=>{
     if(primeraVisita){
      secuencia([[0,{mirada:{dx:-1,dy:0}}],[8,{mirada:{dx:1,dy:0}}],[8,{mirada:{dx:0,dy:0}}],[8,()=>ejecutarReaccion('saludo')]]);
     }else if(dias>=3){
      ejecutarReaccion('saludo',()=>ejecutarReaccion('risa'));
     }
    };
    if(hora<6)secuencia(TRAVESURAS.bostezo,saludar);else saludar();
   });
  }
 };
 const revisar=()=>puedeMoverse()?arrancar():parar();
 const alCambiarVisibilidad=()=>{
  if(doc.hidden){
   if(ocultoDesde===null)ocultoDesde=fecha();
   parar();
   return;
  }
  const ausente=ocultoDesde===null?0:fecha()-ocultoDesde;
  ocultoDesde=null;
  revisar();
  if(activo&&energia()==='completa'&&ausente>=30000){
   const regreso=()=>ausente>=600000?ejecutarReaccion('bostezo',()=>ejecutarReaccion('saludo')):ejecutarReaccion('saludo');
   if(durmiendo)despertar(regreso);else regreso();
  }
 };
 const ajustar=()=>{const nueva=medir();if(nueva!==celda){const antes=energia();celda=nueva;x=Math.round(x/celda)*celda;if(energia()!==antes){parar();revisar();return;}}x=Math.min(x,holgura());pintar();};
 const alCambiarApariencia=()=>{if(!opciones.atuendo&&jugando!=='probador'){atuendo=apariencia.leer();pintar();}};
 host.addEventListener('click',alClic);
 doc.addEventListener('visibilitychange',alCambiarVisibilidad);
 reducido?.addEventListener?.('change',revisar);
 const alCambiarPersonalidad=ev=>{
  if(ev?.type==='storage'&&ev.key!==null&&ev.key!==undefined&&ev.key!=='erlen-mey-personalidad')return;
  if(!opciones.personalidad)personalidad=personalidadLocal.leer();
  host.dataset.meyPersonalidad=personalidad;
  // Acaba la escena en curso; aplica la nueva cadencia en la siguiente decisión.
  noAntesDe=ahora()+enCuadros(24)*perfil().pausa;
 };
 alCambiarPersonalidad();
 ventana.addEventListener('erlen-mey-personalidad',alCambiarPersonalidad);
 ventana.addEventListener('storage',alCambiarPersonalidad);
 const alCambiarColor=()=>pintar();
 ventana.addEventListener('erlen-mey-color',alCambiarColor);
 ventana.addEventListener('storage',alCambiarColor);
 ventana.addEventListener('erlen-mey-apariencia',alCambiarApariencia);
 ventana.addEventListener('storage',alCambiarApariencia);
 let observador=null,medidor=null;
 if(ventana.IntersectionObserver){observador=new ventana.IntersectionObserver(entradas=>{visible=entradas.some(x=>x.isIntersecting);revisar();});observador.observe(host);}
 // Con celda fija también observa: el hueco para pasear cambia con el ancho.
 if(ventana.ResizeObserver){medidor=new ventana.ResizeObserver(()=>ajustar());medidor.observe(r.eje==='alto'?host:(host.parentElement||host));}
 host.dataset.meyViva='';
 if(recreo){
  if(opciones.juego&&!JUEGOS[opciones.juego])throw new Error('mey: juego desconocido: '+opciones.juego);
  pendiente=opciones.juego||mey.siguienteJuego(memoria,azar,JUEGOS_MEY,personalidad);
  if(!puedeMoverse()||energia()!=='completa')foto(pendiente);
 }
 pintar();arrancar();
 return {
  pose(nombre){filasMey(nombre);pose=nombre;pintar();},
  atuendo(nombre){vestirMey(Array.from({length:18},vacia),nombre,{},[]);atuendo=nombre;pintar();},
  jugar(nombre){
   if(!recreo)throw new Error('mey: jugar requiere lugar recreo');
   if(!Object.hasOwn(JUEGOS,nombre))throw new Error('mey: juego desconocido: '+nombre);
   interrumpir();
   if(activo&&energia()==='completa')empezar(nombre);
   else{pendiente=nombre;foto(nombre);pintar();}
  },
  reaccionar(nombre){if(nombre==='celebrar')return celebrar();if(!TRAVESURAS[nombre])throw new Error('mey: travesura desconocida: '+nombre);if(activo&&!ocupada)secuencia(TRAVESURAS[nombre]);},
  ajustar,
  cuadro(){return cuadroMey(pose,e,atuendo,false).map(f=>f.join('')).join('\n');},
  get celda(){return celda;},
  get paseo(){return {activo:conPaseo(),x,rumbo,holgura:holgura(),sentada:!!e.sentada};},
  caminar(destino,alLlegar,opts){if(activo&&!ocupada&&conPaseo())caminar(destino,alLlegar,opts);},
  get energia(){return energia();},
  get activa(){return activo;},
  get personalidad(){return personalidad;},
  get juego(){return jugando||pendiente;},
  get reaccion(){return ultimaReaccion;},
  get impulsos(){return {...imp};},
  get conducta(){return conductaActual||'quieta';},
  evento(tipo){return lanzarEvento(tipo,true);},
  get memoria(){return {...memGuardada};},
  detener(){persistirConducta(true);parar();host.removeEventListener('click',alClic);doc.removeEventListener('visibilitychange',alCambiarVisibilidad);reducido?.removeEventListener?.('change',revisar);ventana.removeEventListener('erlen-mey-apariencia',alCambiarApariencia);ventana.removeEventListener('storage',alCambiarApariencia);ventana.removeEventListener('erlen-mey-color',alCambiarColor);ventana.removeEventListener('storage',alCambiarColor);ventana.removeEventListener('erlen-mey-personalidad',alCambiarPersonalidad);ventana.removeEventListener('storage',alCambiarPersonalidad);observador?.disconnect();medidor?.disconnect();delete host.dataset.meyViva;delete host.dataset.meyPersonalidad;}
 };
};
mey.travesuras=['guino','chapoteo','burbuja','saludo','celebrar','risa','sorpresa','cosquillas','bostezo','estirarse','aplauso','pensar','preocupacion','asentir','enojo'];
mey.eventos=['exito','guardado','error','aviso','carga','listo'];
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
 const ATRIBUTOS=['lugar','app','pose','atuendo','energia','titulo','vivo','paseo','celda','color','juego','personalidad'];
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
  jugar(nombre){this._control?.jugar(nombre);}
  get control(){return this._control;}
 }
 ventana.customElements.define('erlen-mey',ErlenMey);
 return true;
};
if(typeof window!=='undefined')mey.definir(window);

/* Física de Mey: paso fijo con acumulador (G. Fiedler, «Fix Your Timestep!»), péndulo Verlet con restricción de distancia (T. Jakobsen; verlet-js, MIT), llegada con frenado (C. Reynolds) y resorte crítico (wobble, MIT). Ideas, sin código copiado. Unidades: px, s, rad; y crece hacia abajo; rotación positiva = horaria (CSS). */
const FISICA_MEY=Object.freeze({G:2200,H:1/240,SUBPASOS:12,VMAX:76,A_ARRANQUE:260,A_LLEGADA:220,A_FRENO:420,FRICCION:1400,
 AMORT_PENDULO:2.4,ARRASTRE_AIRE:.15,ARRASTRE_GIRO:.8,REST_PARED:.45,REST_SUELO:.35,REBOTE_MIN:520,V_CAIDA_MAX:2600,
 V_LANZAR:2400,GIRO_MAX:12,SALTO:240,EMPUJON:180,SALTO_EMPUJON:200,V_PUNTERO:900,PAUSA_EMPUJON:1500,ENDEREZAR:14});
const penduloMey=(s,px,py,h)=>{
 const k=Math.exp(-FISICA_MEY.AMORT_PENDULO*h);
 let nx=s.cx+(s.cx-s.qx)*k,ny=s.cy+(s.cy-s.qy)*k+FISICA_MEY.G*h*h;
 s.qx=s.cx;s.qy=s.cy;
 let dx=nx-px,dy=ny-py,d=Math.hypot(dx,dy);
 if(d<1e-9){dx=0;dy=s.L;d=s.L;}
 s.cx=px+dx*s.L/d;s.cy=py+dy*s.L/d;
 return s;
};
const anguloMey=(s,px,py)=>Math.atan2(s.cx-px,s.cy-py);
const llegadaMey=(dx,dy,o)=>{
 const d=Math.hypot(dx,dy);
 if(d<1e-6){o.x=0;o.y=0;return o;}
 const v=Math.min(FISICA_MEY.VMAX,Math.sqrt(2*FISICA_MEY.A_LLEGADA*d));
 o.x=dx/d*v;o.y=dy/d*v;
 return o;
};
const marchaMey=(v,o,h)=>{
 const vel=Math.hypot(v.x,v.y),obj=Math.hypot(o.x,o.y);
 const lim=vel>FISICA_MEY.VMAX+1?FISICA_MEY.FRICCION:obj>vel&&v.x*o.x+v.y*o.y>=0?FISICA_MEY.A_ARRANQUE:FISICA_MEY.A_FRENO;
 const ex=o.x-v.x,ey=o.y-v.y,en=Math.hypot(ex,ey),max=lim*h;
 if(en<=max){v.x=o.x;v.y=o.y;}
 else {v.x+=ex*max/en;v.y+=ey*max/en;}
 return v;
};
// Huella del cuerpo alrededor del mismo centro usado por transform-origin.
const huellaMey=(w,h,rot)=>{
 const cos=Math.cos(rot),sin=Math.sin(rot),cx=w/2+.05*h*sin,cy=.55*h-.05*h*cos;
 const rx=(Math.abs(w*cos)+Math.abs(h*sin))/2,ry=(Math.abs(w*sin)+Math.abs(h*cos))/2;
 return {left:cx-rx,right:cx+rx,top:cy-ry,bottom:cy+ry};
};
const vueloMey=(c,h,lim)=>{
 c.vy=Math.min(c.vy+FISICA_MEY.G*h,FISICA_MEY.V_CAIDA_MAX);
 const k=Math.exp(-FISICA_MEY.ARRASTRE_AIRE*h);
 c.vx*=k;c.vy*=k;
 const y0=c.y;
 c.x+=c.vx*h;c.y+=c.vy*h;c.rot+=c.giro*h;c.giro*=Math.exp(-FISICA_MEY.ARRASTRE_GIRO*h);
 const huella=huellaMey(lim.ancho,lim.alto,c.rot);
 const izq=lim.izq-huella.left,der=lim.der+lim.ancho-huella.right,techo=lim.techo-huella.top;
 if(c.x<izq){c.x=izq;if(c.vx<0)c.vx=-c.vx*FISICA_MEY.REST_PARED;c.giro*=-.6;}
 if(c.x>der){c.x=der;if(c.vx>0)c.vx=-c.vx*FISICA_MEY.REST_PARED;c.giro*=-.6;}
 if(c.y<techo){c.y=techo;if(c.vy<0)c.vy=-c.vy*FISICA_MEY.REST_PARED;}
 if(c.vy>0){
  let piso=lim.suelo;
  for(const p of lim.plataformas){
   const tope=p.top-lim.alto;
   if(y0<=tope&&c.y>=tope&&c.x+lim.ancho/2>=p.left&&c.x+lim.ancho/2<=p.right&&tope<piso)piso=tope;
  }
  if(c.y>=piso){
   c.y=piso;
   const imp=c.vy;
   if(imp>FISICA_MEY.REBOTE_MIN){c.vy=-imp*FISICA_MEY.REST_SUELO;c.giro*=.6;return -imp;}
   c.vy=0;return imp;
  }
 }
 return 0;
};
const enderezarMey=(c,h)=>{
 const a=-(FISICA_MEY.ENDEREZAR**2)*c.rot-2*FISICA_MEY.ENDEREZAR*c.giro;
 c.giro+=a*h;c.rot+=c.giro*h;
 if(Math.abs(c.rot)<.002&&Math.abs(c.giro)<.05)c.rot=c.giro=0;
 return c;
};
mey.fisica={c:FISICA_MEY,pendulo:penduloMey,angulo:anguloMey,llegada:llegadaMey,marcha:marchaMey,vuelo:vueloMey,enderezar:enderezarMey};

/* Una presencia por documento. Posición y velocidad continuas; los gestos de pixel art
   no cambian su trayectoria. El puntero solicita destinos, nunca recoloca al personaje. */
const claveRecorridoMey=Symbol.for('erlen.mey.recorrido');
mey.recorridoActual=documento=>{const c=documento?.[claveRecorridoMey];if(c&&!c.elemento.isConnected){c.detener();return null;}return c||null;};
mey.recorrerPagina=function(opciones={}){
 const doc=opciones.documento||(typeof document!=='undefined'?document:null);
 if(!doc?.body||!doc.defaultView?.requestAnimationFrame)return null;
 const existente=mey.recorridoActual(doc);if(existente){existente.actualizar?.(opciones);return existente;}
 const win=doc.defaultView,mq=win.matchMedia?.('(prefers-reduced-motion:reduce)');
 const personalidadLocal=mey.personalidadLocal(win);
 let personalidad=opciones.personalidad||personalidadLocal.leer();
 perfilPersonalidadMey(personalidad);
 const ingles=(opciones.idioma||doc.documentElement.lang||'es').startsWith('en');
 const textos={actor:ingles?'Mey: play or move me':'Mey: jugar o arrastrar a otro lugar',titulo:ingles?'Mey · you can take me with you':'Mey · puedes llevarme contigo',pausa:ingles?"Pause Mey's walk":'Pausar el paseo de Mey',seguir:ingles?"Resume Mey's walk":'Reanudar el paseo de Mey',pausaCorta:ingles?'Mey · pause':'Mey · pausa',seguirCorta:ingles?'Mey · resume':'Mey · seguir'};
 const actor=doc.createElement('button');actor.type='button';actor.className='mey-libre';
 const sincronizarAccion=()=>{actor.setAttribute('aria-label',typeof opciones.accion==='function'?(ingles?'Mey: help or move me':'Mey: ayuda o arrastrar a otro lugar'):textos.actor);actor.title=textos.titulo;};
 sincronizarAccion();
 const pausa=doc.createElement('button');pausa.type='button';pausa.className='mey-libre-pausa';
 pausa.setAttribute('aria-label',textos.pausa);pausa.setAttribute('aria-pressed','false');pausa.textContent=textos.pausaCorta;
 doc.body.append(actor,pausa);doc.documentElement.dataset.erlenMeyPresencia='';
 const celda=win.innerWidth<700?3:4,w=16*celda,h=18*celda,O={x:w/2,y:.55*h};
 actor.style.transformOrigin=`${O.x}px ${O.y.toFixed(2)}px`;
 const limitar=(n,a,b)=>Math.min(Math.max(n,a),Math.max(a,b));
 const suelo=()=>Math.max(8,win.innerHeight-h-70),derecha=()=>Math.max(8,win.innerWidth-w-8);
 const selectorAnclas=()=>opciones.anclas||'.hero-strip,.grupo-herramientas>h3,.workspace-note,.erlen-inicio-meta';
 let x=limitar(win.innerWidth-w-32,8,derecha()),y=suelo(),vx=0,velY=0,vy=0,elevacion=0,modo='camina',rot=0,giro=0,acumulado=0;
 let ultimo=0,raf=0,muerta=false,manual=false,arrastre=null,foco=false,rumbo=-1,distancia=0,pend=null,pivote=null,pivoteAntes=null,vPivote=0,plataformas=[],punteroAnt=null,ultimoEmpujon=-Infinity,vxFrame=0,rotAntes=0;
 let prox=0,sonda=-Infinity,obstaculos=[],ruta=[],puntero=null,seguido=0,gestoHasta=0,ultimoSalto=-Infinity,ultimoDibujo=-Infinity,cuadro='',replanear=true,ignorarClic=false,cruceAntes=false,metaPuntero=null,sobreMey=false;
 const objetivo={x:0,y:0},vel={x:0,y:0},cuerpo={x:0,y:0,vx:0,vy:0,rot:0,giro:0},cuerpoLim={izq:8,der:8,techo:8,suelo:8,ancho:w,alto:h,plataformas},pivotePaso={x:0,y:0};
 const gestos={agacharHasta:0,estirarHasta:0,grandesHasta:0,inclinar:0,inclinarHasta:0},punteroV={x:0,y:0};
 const apariencia=mey.aparienciaLocal(win);
 const colorLocal=mey.colorLocal(win);
 const reducida=()=>!!mq?.matches||!!win.navigator.connection?.saveData;
 const quieta=()=>manual||reducida()||foco||doc.hidden||!!actor.closest('[inert]');
 const encuadrar=()=>{
  const r=huellaMey(w,h,rot);
  x=limitar(x,8-r.left,derecha()+w-r.right);
  y=limitar(y,8-r.top,Math.min(suelo(),win.innerHeight-8-r.bottom));
 };
 const posicionar=()=>{
  const py=modo==='camina'?limitar(y+elevacion,8,suelo()):y;
  actor.style.transform=`translate3d(${x.toFixed(2)}px,${py.toFixed(2)}px,0)${Math.abs(rot)>1e-4?` rotate(${rot.toFixed(4)}rad)`:''}`;
  actor.dataset.x=x.toFixed(2);actor.dataset.y=py.toFixed(2);
 };
 const direccion=(v,margen)=>v < -margen?-1:v > margen?1:0;
 const dibujar=t=>{
  const aire=modo==='vuela',colgada=modo==='colgada',agitada=colgada&&(Math.abs(giro)>4||vPivote>250);
  const marcha=modo==='camina'&&Math.hypot(vx,velY)>8&&!quieta()&&!arrastre;
  const estado=quieta()?'quieta':arrastre||colgada?'juega':aire?velY<0?'salta':'cae':elevacion<-.5?(vy<0?'salta':'cae'):marcha?'camina':'observa';
  actor.dataset.estado=estado;
  actor.dataset.meyPersonalidad=personalidad;
  const perfil=perfilPersonalidadMey(personalidad),fase=t%perfil.gesto;
  const expresiva=!quieta()&&!arrastre&&!aire&&!colgada&&fase<900;
  const e={...neutro(),caminando:marcha?1+Math.floor(distancia/(celda*2))%4:0,
   mirada:{dx:puntero?direccion(puntero.x-x-w/2,24):rumbo,dy:puntero?direccion(puntero.y-y-h/2,28):0},
   parpadeo:!quieta()&&Math.floor(t/140)%31===30,
   chapoteo:aire||agitada?(Math.floor(t/166)%2?'der':'izq'):null,
   ojos:t<gestos.grandesHasta||aire&&Math.hypot(vx,velY)>900||colgada&&Math.abs(giro)>6?'grandes':gestoHasta>t?'felices':null,
   agachar:t<gestos.agacharHasta?1:0,
   estirar:t>=gestos.agacharHasta&&t<gestos.estirarHasta?1:0,
   inclinar:!aire&&!colgada&&t<gestos.inclinarHasta?gestos.inclinar:0};
  const atuendo=apariencia.leer(),color=colorLocal.leer();
  if(expresiva){
   if(personalidad==='tranquila')e.parpadeo=fase<250?'ambos':false;
   else if(personalidad==='traviesa'){e.parpadeo=fase<250?'guino':false;e.brazoIzq=fase<450?1:0;}
   else{e.brazoIzq=2;e.saludo=2;e.ojos='felices';e.inclinar=fase<450?-1:1;}
  }
  const dibujo=JSON.stringify([e,atuendo,color]);
  if(dibujo===cuadro||(t-ultimoDibujo<90&&!quieta()))return;
  cuadro=dibujo;ultimoDibujo=t;
  actor.innerHTML=svgMey(cuadroMey('hola',e,atuendo,false),'hola',atuendo,{celda,color},true);
 };
 const sondear=()=>{
  const extra=typeof opciones.evitar==='function'?opciones.evitar():opciones.evitar||[];
  obstaculos=[...doc.querySelectorAll('a,button,summary,erlen-suite-nav,input,select,textarea,[contenteditable="true"],iframe,canvas,[role="dialog"],[role="button"],[role="option"],[role="tab"],[data-mey-evitar]'),...extra]
   .filter(e=>e?.getBoundingClientRect&&e!==actor&&e!==pausa&&!e.closest('.mey-libre,[inert]'))
   .map(e=>e.getBoundingClientRect()).filter(r=>r.width&&r.height&&r.bottom>0&&r.top<win.innerHeight);
  plataformas=[...doc.querySelectorAll(selectorAnclas())].map(e=>e.getBoundingClientRect()).filter(r=>r.width&&r.bottom>0&&r.top<win.innerHeight).map(r=>({left:r.left,right:r.right,top:r.top}));
  cuerpoLim.plataformas=plataformas;
 };
 const colision=(nx,ny)=>obstaculos.some(r=>nx+w>r.left-6&&nx<r.right+6&&ny+h>r.top-6&&ny<r.bottom+6);
 const pasoLibre=(a,b)=>{
  const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/12));
  for(let i=1;i<=n;i++)if(colision(a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n))return false;
  return true;
 };
 const proteger=()=>{
  // Cede el clic al control sin desaparecer. El agarre conserva la captura
  // del puntero y la marcha busca una salida desde la misma posición.
  const cruce=colision(x,modo==='camina'?y+elevacion:y);
  actor.style.visibility='';
  actor.style.pointerEvents=cruce&&!arrastre?'none':'';
  if(cruce&&!cruceAntes)replanear=true;cruceAntes=cruce;
 };
 const planear=(meta,t)=>{
  // Rejilla de pasos y búsqueda de rutas dentro del espacio visible. Incluye ambos
  // márgenes incluso en móvil; cada tramo completo se comprueba, no solo su extremo.
  const xs=[8],ys=[8];
  for(let n=72;n<derecha();n+=64)xs.push(n);if(derecha()>8)xs.push(derecha());
  for(let n=72;n<suelo();n+=64)ys.push(n);if(suelo()>8)ys.push(suelo());
  const nodos=[];
  for(let j=0;j<ys.length;j++)for(let i=0;i<xs.length;i++)if(!colision(xs[i],ys[j]))nodos.push({x:xs[i],y:ys[j],i,j});
  const actual={x,y},oculta=colision(x,y);
  const inicio=nodos.toSorted((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y)).find(n=>oculta||pasoLibre(actual,n));
  if(!inicio){ruta=[];prox=t+900;replanear=false;return;}
  const porCelda=new Map(nodos.map(n=>[`${n.i},${n.j}`,n])),padres=new Map([[inicio,null]]),cola=[inicio];
  for(let k=0;k<cola.length;k++){
   const a=cola[k];
   for(const [i,j] of [[a.i-1,a.j],[a.i+1,a.j],[a.i,a.j-1],[a.i,a.j+1]]){
    const b=porCelda.get(`${i},${j}`);
    if(b&&!padres.has(b)&&pasoLibre(a,b)){padres.set(b,a);cola.push(b);}
   }
  }
  const fin=cola.toSorted((a,b)=>Math.hypot(a.x-meta.x,a.y-meta.y)-Math.hypot(b.x-meta.x,b.y-meta.y))[0];
  const camino=[];for(let n=fin;n;n=padres.get(n))camino.unshift({x:n.x,y:n.y});
  // Suprime esquinas innecesarias sin atajar a través de un control.
  ruta=[];let desde=actual;
  while(camino.length){let i=camino.length-1;while(i>0&&!pasoLibre(desde,camino[i]))i--;const siguiente=camino[i];ruta.push(siguiente);desde=siguiente;camino.splice(0,i+1);}
  prox=t+5500;replanear=false;
 };
 const destino=t=>{
  const siguiendo=puntero&&t-puntero.t<1800&&Math.hypot(puntero.x-x-w/2,puntero.y-y-h/2)<260;
  if(siguiendo){
   const lado=puntero.x>x+w/2?-1:1;
   return {x:limitar(puntero.x-w/2+lado*64,8,derecha()),y:limitar(puntero.y-h/2+70,8,suelo())};
  }
  const anclas=[...doc.querySelectorAll(selectorAnclas())].map(e=>e.getBoundingClientRect()).filter(r=>r.width&&r.top>h+60&&r.top<win.innerHeight-80);
  const fase=Math.floor(t/5500),ancla=anclas[fase%Math.max(1,anclas.length)];
  return {x:limitar(win.innerWidth*(.12+((fase*.37)%.7)),8,derecha()),y:ancla?limitar(ancla.top-h-12,8,suelo()):suelo()};
 };
 const aterrizar=(imp,t)=>{
  modo='camina';velY=0;vy=0;elevacion=0;objetivo.x=objetivo.y=0;rot=Math.atan2(Math.sin(rot),Math.cos(rot));actor.style.pointerEvents='';ruta=[];replanear=false;prox=t+600;
  if(imp>900){gestos.agacharHasta=t+300;gestos.estirarHasta=t+400;}
  else if(imp>300){gestos.agacharHasta=t+200;gestos.estirarHasta=t+300;}
  else {gestos.agacharHasta=t+100;gestos.estirarHasta=t+100;}
  if(imp>1200)gestos.grandesHasta=t+600;
 };
 const salto=t=>{if(t-ultimoSalto<1000||quieta()||modo!=='camina'||elevacion!==0||vy!==0)return;ultimoSalto=t;vy=-FISICA_MEY.SALTO;gestoHasta=t+900;};
 const paso=t=>{
  raf=0;if(muerta)return;if(!actor.isConnected){control.detener();return;}
  if(quieta()){
   ultimo=0;
   // Un modal con foco en un botón puede cerrar sin focusout: solo vigila el inert.
   if(!manual&&!reducida()&&!foco&&!doc.hidden)raf=win.requestAnimationFrame(paso);
   return;
  }
  const dt=ultimo?Math.min(.05,(t-ultimo)/1000):0;ultimo=t;
  if(t-sonda>250){sondear();sonda=t;}
  acumulado+=dt;
  let n=Math.min(FISICA_MEY.SUBPASOS,Math.floor(acumulado/FISICA_MEY.H));
  acumulado-=n*FISICA_MEY.H;if(acumulado>FISICA_MEY.H)acumulado=0;
  if(arrastre){
   if(modo==='colgada'){
    for(let i=0;i<n;i++){
     if(i===n-1)rotAntes=rot;
     pivotePaso.x=pivoteAntes.x+(pivote.x-pivoteAntes.x)*(i+1)/n;
     pivotePaso.y=pivoteAntes.y+(pivote.y-pivoteAntes.y)*(i+1)/n;
     penduloMey(pend,pivotePaso.x,pivotePaso.y,FISICA_MEY.H);
     rot=pend.phi0-anguloMey(pend,pivotePaso.x,pivotePaso.y);
     const c=Math.cos(rot),s=Math.sin(rot);
     x=pivotePaso.x-O.x-(arrastre.gx*c-arrastre.gy*s);
     y=pivotePaso.y-O.y-(arrastre.gx*s+arrastre.gy*c);
    }
    vPivote=dt?Math.hypot(pivote.x-pivoteAntes.x,pivote.y-pivoteAntes.y)/dt:0;
    pivoteAntes={x:pivote.x,y:pivote.y};
   }else vPivote=0;
   // El puntero alcanza el borde; el cuerpo girado sigue dentro de la pantalla.
   encuadrar();proteger();dibujar(t);posicionar();raf=win.requestAnimationFrame(paso);return;
  }
  proteger();
  if(puntero&&t-puntero.t<1800&&t-seguido>240&&Math.hypot(puntero.x-x-w/2,puntero.y-y-h/2)<260){
   const metaPaseo=destino(t);if(!metaPuntero||Math.hypot(metaPaseo.x-metaPuntero.x,metaPaseo.y-metaPuntero.y)>24){replanear=true;metaPuntero=metaPaseo;}seguido=t;
  }else metaPuntero=null;
  if(replanear||t>prox)planear(destino(t),t);
  while(ruta.length&&Math.hypot(ruta[0].x-x,ruta[0].y-y)<2)ruta.shift();
  const meta=sobreMey?{x,y}:ruta[0]||{x,y},dx=meta.x-x,dy=meta.y-y,d=Math.hypot(dx,dy);
  llegadaMey(dx,dy,objetivo);
  cuerpoLim.der=derecha();cuerpoLim.suelo=suelo();
  let distanciaPaso=0;
  for(let i=0;i<n;i++){
   if(modo==='vuela'){
    cuerpo.x=x;cuerpo.y=y;cuerpo.vx=vx;cuerpo.vy=velY;cuerpo.rot=rot;cuerpo.giro=giro;
    const r=vueloMey(cuerpo,FISICA_MEY.H,cuerpoLim);
    x=cuerpo.x;y=cuerpo.y;vx=cuerpo.vx;velY=cuerpo.vy;rot=cuerpo.rot;giro=cuerpo.giro;
    if(r<0)gestos.agacharHasta=t+100;
    else if(r>0)aterrizar(r,t);
   }
   if(modo==='camina'){
    if(elevacion===0&&vy===0){
     vel.x=vx;vel.y=velY;marchaMey(vel,objetivo,FISICA_MEY.H);vx=vel.x;velY=vel.y;
    }
    const nx=limitar(x+vx*FISICA_MEY.H,8,derecha()),ny=limitar(y+velY*FISICA_MEY.H,8,suelo());
    if(colision(x,y)||pasoLibre({x,y},{x:nx,y:ny})){
     distanciaPaso+=Math.hypot(nx-x,ny-y);x=nx;y=ny;
    }else {vx=velY=0;ruta=[];replanear=true;}
    if(elevacion<0||vy<0){
     vy+=FISICA_MEY.G*FISICA_MEY.H;elevacion+=vy*FISICA_MEY.H;
     if(elevacion>=0){elevacion=0;vy=0;gestos.agacharHasta=t+100;}
    }
    if(rot||giro){
     cuerpo.rot=rot;cuerpo.giro=giro;enderezarMey(cuerpo,FISICA_MEY.H);rot=cuerpo.rot;giro=cuerpo.giro;
    }
   }
  }
  distancia+=distanciaPaso;
  if(modo==='camina'){
   if(Math.abs(vx)>8)rumbo=vx<0?-1:1;
   const ax=dt?(vx-vxFrame)/dt:0;vxFrame=vx;
   if(elevacion===0&&vy===0&&Math.abs(ax)>150){gestos.inclinar=Math.sign(ax);gestos.inclinarHasta=t+170;}
   if(!arrastre&&!quieta()&&elevacion===0&&vy===0&&puntero&&t-puntero.t<120&&Math.hypot(punteroV.x,punteroV.y)>=FISICA_MEY.V_PUNTERO&&Math.hypot(puntero.x-x-w/2,puntero.y-y-h/2)<=1.5*w&&
      (puntero.x<x-8||puntero.x>x+w+8||puntero.y<y-8||puntero.y>y+h+8)&&t-ultimoEmpujon>=FISICA_MEY.PAUSA_EMPUJON){
    const s=Math.sign(punteroV.x)||1;
    vx=s*FISICA_MEY.EMPUJON;velY=0;vy=-FISICA_MEY.SALTO_EMPUJON;
    gestos.grandesHasta=t+500;gestos.inclinar=-s;gestos.inclinarHasta=t+170;
    ultimoEmpujon=t;ruta=[];replanear=true;
   }
  }
  if(!ruta.length&&d<2)prox=Math.min(prox,t+750);
  encuadrar();
  proteger();dibujar(t);posicionar();raf=win.requestAnimationFrame(paso);
 };
 const arrancar=()=>{
  if(muerta)return;if(!actor.isConnected){control.detener();return;}
  win.cancelAnimationFrame(raf);raf=0;ultimo=0;acumulado=0;sondear();proteger();
  if(quieta()){vx=velY=0;cuadro='';dibujar(0);posicionar();}
  else raf=win.requestAnimationFrame(paso);
 };
 const fisicaLibre=()=>!quieta();
 const colgar=()=>{
  modo='colgada';elevacion=0;vy=0;
  let L=Math.hypot(arrastre.gx,arrastre.gy),phi0=Math.atan2(-arrastre.gx,-arrastre.gy);
  if(L<2*celda){L=2*celda;phi0=0;}
  const phi=phi0-rot;
  pend={L,phi0,cx:pivote.x+L*Math.sin(phi),cy:pivote.y+L*Math.cos(phi)};
  pend.qx=pend.cx-vx*FISICA_MEY.H;pend.qy=pend.cy-velY*FISICA_MEY.H;
  rotAntes=rot;pivoteAntes={x:pivote.x,y:pivote.y};
 };
 const mover=e=>{
  if(arrastre&&arrastre.id===e.pointerId){
   if(Math.hypot(e.clientX-arrastre.inicioX,e.clientY-arrastre.inicioY)>4)arrastre.movida=true;
   if(!fisicaLibre()||!arrastre.movida){
    x=limitar(arrastre.x0+e.clientX-arrastre.inicioX,8,derecha());y=limitar(arrastre.y0+e.clientY-arrastre.inicioY,8,suelo());
    vx=velY=vy=elevacion=0;posicionar();
   }else {
    pivote={x:limitar(e.clientX,0,win.innerWidth),y:limitar(e.clientY,0,win.innerHeight)};
    if(modo!=='colgada')colgar();
   }
  }else if(e.pointerType!=='touch'){
   const ahora=win.performance.now();
   puntero={x:e.clientX,y:e.clientY,t:ahora};
   if(punteroAnt){
    const transcurrido=ahora-punteroAnt.t;
    if(transcurrido>=8){
     const escala=1000/transcurrido;
     punteroV.x=punteroV.x*.5+(e.clientX-punteroAnt.x)*escala*.5;
     punteroV.y=punteroV.y*.5+(e.clientY-punteroAnt.y)*escala*.5;
     punteroAnt={x:e.clientX,y:e.clientY,t:ahora};
    }
   }else punteroAnt={x:e.clientX,y:e.clientY,t:ahora};
  }
 };
 const bajar=e=>{
  if(e.button!==0)return;e.preventDefault();ignorarClic=false;
  const qx=e.clientX-(x+O.x),qy=e.clientY-(y+O.y),c=Math.cos(rot),s=Math.sin(rot);
  arrastre={id:e.pointerId,x0:x,y0:y,inicioX:e.clientX,inicioY:e.clientY,movida:false,gx:qx*c+qy*s,gy:-qx*s+qy*c};
  actor.setPointerCapture?.(e.pointerId);actor.dataset.arrastrando='';
  proteger();
 };
 const subir=()=>{
  if(!arrastre)return;
  const a=arrastre;ignorarClic=a.movida;arrastre=null;delete actor.dataset.arrastrando;
  if(modo==='colgada'){
   if(quieta()){
    modo='camina';rot=giro=0;x=limitar(x,8,derecha());y=limitar(y,8,suelo());pend=null;
   }else {
    vx=(pend.cx-pend.qx)/FISICA_MEY.H;velY=(pend.cy-pend.qy)/FISICA_MEY.H;
    const rapidez=Math.hypot(vx,velY);
    if(rapidez>FISICA_MEY.V_LANZAR){const k=FISICA_MEY.V_LANZAR/rapidez;vx*=k;velY*=k;}
    giro=limitar((rot-rotAntes)/FISICA_MEY.H,-FISICA_MEY.GIRO_MAX,FISICA_MEY.GIRO_MAX);
    modo='vuela';pend=null;
   }
  }else if(modo==='vuela'){vx=velY=giro=0;}
  encuadrar();posicionar();ruta=[];replanear=true;puntero=null;sondear();proteger();
 };
 const jugar=()=>{
  if(ignorarClic){ignorarClic=false;return;}
  if(typeof opciones.accion==='function')opciones.accion();else if(!quieta())salto(win.performance.now());
 };
 const desplazar=()=>{
  replanear=true;sonda=-Infinity;
  sondear();proteger();
  if(!quieta()&&modo==='camina'&&!arrastre)salto(win.performance.now());
  // Pausada conserva la posición y cede el clic cuando pasa un control.
 };
 const cambiarPausa=()=>{manual=!manual;pausa.setAttribute('aria-pressed',String(manual));pausa.setAttribute('aria-label',manual?textos.seguir:textos.pausa);pausa.textContent=manual?textos.seguirCorta:textos.pausaCorta;arrancar();};
 const observarFoco=win.MutationObserver?new win.MutationObserver(()=>alFoco()):null;
 const alFoco=()=>{
  let activo=doc.activeElement;while(activo?.shadowRoot?.activeElement)activo=activo.shadowRoot.activeElement;
  const nueva=!!activo?.matches('input,textarea,select,[contenteditable="true"]');
  if(nueva===foco)return;foco=nueva;
  if(foco)observarFoco?.observe(doc.body,{subtree:true,childList:true});else observarFoco?.disconnect();arrancar();
 };
 const alSalirDelFoco=()=>win.queueMicrotask(alFoco);
 const tecla=e=>{if(e.key==='Escape'&&!manual){subir();cambiarPausa();}};
 const redimensionar=()=>{encuadrar();posicionar();ruta=[];replanear=true;arrancar();};
 const aparienciaCambiada=()=>{cuadro='';ultimoDibujo=-Infinity;dibujar(win.performance.now());};
 const personalidadCambiada=ev=>{
  if(ev?.type==='storage'&&ev.key!==null&&ev.key!==undefined&&ev.key!=='erlen-mey-personalidad')return;
  personalidad=opciones.personalidad||personalidadLocal.leer();
  aparienciaCambiada();
 };
 const atender=()=>{sobreMey=true;gestoHasta=win.performance.now()+600;};
 const dejar=()=>{sobreMey=false;};
 const eventos=[[actor,'pointerenter',atender],[actor,'pointerleave',dejar],[actor,'dragstart',e=>e.preventDefault()],[win,'pointermove',mover],[win,'resize',redimensionar],[doc,'visibilitychange',arrancar],[doc,'focusin',alFoco],[doc,'focusout',alSalirDelFoco],[doc,'keydown',tecla],[actor,'pointerdown',bajar],[actor,'pointerup',subir],[actor,'pointercancel',subir],[actor,'lostpointercapture',subir],[actor,'click',jugar],[pausa,'click',cambiarPausa],[win,'erlen-mey-color',aparienciaCambiada],[win,'erlen-mey-apariencia',aparienciaCambiada],[win,'storage',aparienciaCambiada],[win,'erlen-mey-personalidad',personalidadCambiada],[win,'storage',personalidadCambiada]];
 for(const [el,n,fn] of eventos)el.addEventListener(n,fn,{passive:n==='pointermove'});
 doc.addEventListener('scroll',desplazar,{capture:true,passive:true});mq?.addEventListener?.('change',arrancar);
 const control={elemento:actor,pausa,
  actualizar(nuevas={}){if(nuevas.personalidad)perfilPersonalidadMey(nuevas.personalidad);opciones={...opciones,...nuevas};personalidadCambiada();sincronizarAccion();replanear=true;if(nuevas.pausaEn)control.ubicarPausa(nuevas.pausaEn);},
  ubicarPausa(contenedor){pausa.classList.toggle('mey-libre-pausa--integrada',!!contenedor);(contenedor||doc.body).append(pausa);},
  estado:()=>({x,y:modo==='camina'?y+elevacion:y,tx:ruta.at(-1)?.x??x,ty:ruta.at(-1)?.y??y,vx,velY,vy,modo,rot,estado:actor.dataset.estado,quieta:quieta(),personalidad}),
  detener(){muerta=true;win.cancelAnimationFrame(raf);for(const [el,n,fn] of eventos)el.removeEventListener(n,fn);doc.removeEventListener('scroll',desplazar,true);mq?.removeEventListener?.('change',arrancar);observarFoco?.disconnect();actor.remove();pausa.remove();if(doc[claveRecorridoMey]===control){delete doc[claveRecorridoMey];delete doc.documentElement.dataset.erlenMeyPresencia;}}
 };
 actor.control=control;doc[claveRecorridoMey]=control;
 if(opciones.pausaEn)control.ubicarPausa(opciones.pausaEn);
 sondear();proteger();dibujar(0);posicionar();arrancar();return control;
};

return mey;})();
