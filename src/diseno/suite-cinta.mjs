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
/* Cinta de herramientas común de Erlen Suite (docs/COHERENCIA-APPS.md §5 del portal).
   Declarativa: la app describe pestañas, grupos y controles; este módulo pinta la
   cinta al estilo de las apps de oficina, con el patrón ARIA de pestañas y barra de
   herramientas, teclado completo, menús, pestañas contextuales y plegado. No importa
   nada y no toca el DOM fuera de su anfitrión (salvo el menú abierto, en <body>).
   Estilos en diseno/cinta.css, solo con tokens --erlen-*.

   mountCinta(host, {
     app: 'notes',                        // clave de preferencias (plegado)
     etiqueta: 'Herramientas de Notes',   // nombre accesible de la cinta
     archivo: {etiqueta:'Archivo', accion},  // opcional: botón «Archivo» a la izquierda
     pestanas: [{id, etiqueta, grupos:[{etiqueta, controles:[control…]}]}],
     contextuales: () => [pestaña…],      // opcional: pestañas según la selección
     inicial: 'inicio',
     alCambiar: id => {}                  // opcional
   })
   control = {tipo:'grande'|'pequeno'|'interruptor'|'menu', id?, etiqueta, icono?,
              atajo?, titulo?, accion?, activo?:()=>bool, deshabilitado?:()=>bool,
              oculto?:()=>bool, opciones?: [opción…] | ()=>[opción…]}
   opción  = {etiqueta, icono?, descripcion?, atajo?, accion, marcado?:()=>bool,
              deshabilitado?:()=>bool} | {separador:true}
   icono: texto (un glifo), un nodo, o una cadena SVG escrita por la propia app.
   Devuelve {elemento, actualizar(), seleccionar(id), plegar(bool), destruir()}. */
const TIPOS=['grande','pequeno','interruptor','menu'];
let contador=0;

export function mountCinta(host,config){
 if(!host||!host.ownerDocument)throw Error('mountCinta necesita un elemento anfitrión.');
 if(!config||!Array.isArray(config.pestanas)||!config.pestanas.length)throw Error('mountCinta necesita al menos una pestaña.');
 for(const p of config.pestanas)validarPestana(p);
 const doc=host.ownerDocument,win=doc.defaultView,uid='erlen-cinta-'+(++contador);
 const clave='erlen.cinta.'+(config.app||'app')+'.plegada';
 const leer=()=>{try{return win.localStorage.getItem(clave)==='1';}catch{return false;}};
 const guardar=v=>{try{win.localStorage.setItem(clave,v?'1':'0');}catch{}};
 let activa=config.inicial||config.pestanas[0].id,plegada=leer(),menu=null,firmaPestanas='',firmaPanel='';
 const vivos=new Map();   // botón → control, para refrescar estados sin repintar

 const raiz=el('div',{class:'erlen-cinta'});
 // La fila de pestañas lleva «Archivo» y «Plegar» fuera del tablist: un tablist solo puede
 // contener pestañas (ARIA aria-required-children).
 const fila=el('div',{class:'erlen-cinta-pestanas'});
 const lista=el('div',{class:'erlen-cinta-lista',role:'tablist','aria-label':config.etiqueta||'Herramientas'});
 const panel=el('div',{class:'erlen-cinta-panel',role:'tabpanel',id:uid+'-panel',tabindex:'-1'});
 raiz.append(fila,panel);
 host.append(raiz);

 function el(tag,attrs={},...hijos){
  const n=doc.createElement(tag);
  for(const [k,v] of Object.entries(attrs||{}))if(v!==null&&v!==undefined&&v!==false)n.setAttribute(k,v===true?'':String(v));
  n.append(...hijos.filter(h=>h!==null&&h!==undefined));
  return n;
 }
 function icono(i){
  if(i===undefined||i===null||i==='')return null;
  const s=el('span',{class:'erlen-cinta-icono','aria-hidden':'true'});
  if(typeof i==='string'&&i.trim().startsWith('<svg'))s.innerHTML=i;
  else if(typeof i==='string')s.textContent=i;
  else s.append(i.cloneNode(true));
  return s;
 }
 const todas=()=>[...config.pestanas,...(typeof config.contextuales==='function'?(config.contextuales()||[]).map(p=>(validarPestana(p),{...p,contextual:true})):[])];

 function pintarPestanas(ps){
  fila.replaceChildren();lista.replaceChildren();
  if(config.archivo){
   const b=el('button',{type:'button',class:'erlen-cinta-archivo'},config.archivo.etiqueta||'Archivo');
   b.addEventListener('click',()=>config.archivo.accion&&config.archivo.accion(b));
   fila.append(b);
  }
  fila.append(lista);
  for(const p of ps){
   const b=el('button',{type:'button',role:'tab',class:'erlen-cinta-pestana',id:uid+'-tab-'+p.id,'aria-controls':uid+'-panel','aria-selected':'false',tabindex:'-1','data-pestana':p.id,'data-contextual':p.contextual?'true':null},p.etiqueta);
   b.addEventListener('click',()=>{if(plegada)fijarPlegado(false);seleccionar(p.id,true);});
   b.addEventListener('dblclick',()=>fijarPlegado(!plegada));
   lista.append(b);
  }
  fila.append(el('span',{class:'erlen-cinta-hueco'}));
  const pl=el('button',{type:'button',class:'erlen-cinta-plegar','aria-expanded':String(!plegada),'aria-controls':uid+'-panel',title:'Plegar o desplegar la cinta (Ctrl+F1)'},el('span',{'aria-hidden':'true'},plegada?'⌄':'⌃'),el('span',{class:'erlen-cinta-oculto'},plegada?'Desplegar la cinta':'Plegar la cinta'));
  pl.addEventListener('click',()=>fijarPlegado(!plegada));
  fila.append(pl);
 }

 function pintarPanel(p){
  const foco=doc.activeElement&&panel.contains(doc.activeElement)?doc.activeElement.dataset.control:null;
  vivos.clear();
  panel.replaceChildren();
  panel.setAttribute('aria-labelledby',uid+'-tab-'+p.id);
  const barra=el('div',{class:'erlen-cinta-fila',role:'toolbar','aria-label':p.etiqueta});
  for(const g of p.grupos){
   const grupo=el('div',{class:'erlen-cinta-grupo',role:'group','aria-label':g.etiqueta});
   const controles=el('div',{class:'erlen-cinta-controles'});
   const grandes=g.controles.filter(c=>c.tipo==='grande'),resto=g.controles.filter(c=>c.tipo!=='grande');
   for(const c of grandes)controles.append(boton(c));
   for(let i=0;i<resto.length;i+=3){const col=el('div',{class:'erlen-cinta-columna'});for(const c of resto.slice(i,i+3))col.append(boton(c));controles.append(col);}
   grupo.append(controles,el('span',{class:'erlen-cinta-rotulo','aria-hidden':'true'},g.etiqueta));
   barra.append(grupo);
  }
  barra.addEventListener('keydown',moverEnBarra);
  panel.append(barra);
  refrescar();
  const botones=enfocables(barra);
  const destino=(foco&&botones.find(b=>b.dataset.control===foco))||botones[0];
  for(const b of vivos.keys())b.tabIndex=b===destino?0:-1;
  if(foco&&destino)destino.focus();
 }

 function boton(c){
  const nombre=c.etiqueta+(c.atajo?' ('+c.atajo+')':'');
  const b=el('button',{type:'button',class:'erlen-cinta-boton','data-tipo':c.tipo,'data-control':c.id||c.etiqueta,title:c.titulo||nombre,'aria-haspopup':c.tipo==='menu'?'menu':null,'aria-expanded':c.tipo==='menu'?'false':null},icono(c.icono),el('span',{class:'erlen-cinta-texto'},c.etiqueta),c.tipo==='menu'?el('span',{class:'erlen-cinta-flecha','aria-hidden':'true'},'▾'):null);
  b.addEventListener('click',()=>{
   if(b.disabled)return;
   if(c.tipo==='menu'){abrirMenu(c,b);return;}
   if(c.accion)c.accion(b);
   actualizar();
  });
  vivos.set(b,c);
  return b;
 }

 function refrescar(){
  for(const [b,c] of vivos){
   b.hidden=!!(c.oculto&&c.oculto());
   b.disabled=!!(c.deshabilitado&&c.deshabilitado());
   if(c.tipo==='interruptor')b.setAttribute('aria-pressed',String(!!(c.activo&&c.activo())));
  }
  for(const col of panel.querySelectorAll('.erlen-cinta-columna,.erlen-cinta-grupo'))col.hidden=![...col.querySelectorAll('.erlen-cinta-boton')].some(b=>!b.hidden);
  // La barra conserva siempre un único punto de tabulación, aunque el control que lo tenía
  // se haya deshabilitado u ocultado (p. ej. Deshacer cuando se acaba el historial).
  const bs=[...vivos.keys()],usables=bs.filter(b=>!b.hidden&&!b.disabled);
  for(const b of bs)if(b.hidden||b.disabled)b.tabIndex=-1;
  if(usables.length&&!usables.some(b=>b.tabIndex===0))usables[0].tabIndex=0;
 }

 const enfocables=barra=>[...barra.querySelectorAll('.erlen-cinta-boton')].filter(b=>!b.hidden&&!b.disabled);
 function moverEnBarra(e){
  const bs=enfocables(e.currentTarget),i=bs.indexOf(doc.activeElement);
  if(i<0)return;
  let j=null;
  if(e.key==='ArrowRight')j=(i+1)%bs.length;
  else if(e.key==='ArrowLeft')j=(i-1+bs.length)%bs.length;
  else if(e.key==='Home')j=0;
  else if(e.key==='End')j=bs.length-1;
  else if(e.key==='ArrowDown'&&bs[i].dataset.tipo==='menu'){e.preventDefault();bs[i].click();return;}
  if(j===null)return;
  e.preventDefault();
  bs.forEach((b,k)=>b.tabIndex=k===j?0:-1);
  bs[j].focus();
 }
 lista.addEventListener('keydown',e=>{
  const ts=[...lista.querySelectorAll('[role=tab]')],i=ts.indexOf(doc.activeElement);
  if(i<0)return;
  let j=null;
  if(e.key==='ArrowRight')j=(i+1)%ts.length;
  else if(e.key==='ArrowLeft')j=(i-1+ts.length)%ts.length;
  else if(e.key==='Home')j=0;
  else if(e.key==='End')j=ts.length-1;
  else if(e.key==='ArrowDown'&&!plegada){e.preventDefault();const b=enfocables(panel)[0];if(b)b.focus();return;}
  if(j===null)return;
  e.preventDefault();
  seleccionar(ts[j].dataset.pestana,true);
  ts[j].focus();
 });

 function abrirMenu(c,ancla){
  cerrarMenu();
  const opciones=typeof c.opciones==='function'?c.opciones():(c.opciones||[]);
  const m=el('div',{class:'erlen-cinta-menu',role:'menu','aria-label':c.etiqueta});
  for(const o of opciones){
   if(o.separador){m.append(el('div',{class:'erlen-cinta-separador',role:'separator'}));continue;}
   const conMarca=typeof o.marcado==='function';
   const it=el('button',{type:'button',role:conMarca?'menuitemcheckbox':'menuitem','aria-checked':conMarca?String(!!o.marcado()):null,class:'erlen-cinta-opcion',tabindex:'-1',disabled:o.deshabilitado&&o.deshabilitado()?true:null},
    icono(o.icono)||el('span',{class:'erlen-cinta-icono','aria-hidden':'true'}),
    el('span',{class:'erlen-cinta-opcion-texto'},o.etiqueta,o.descripcion?el('small',null,o.descripcion):null),
    o.atajo?el('kbd',null,o.atajo):null);
   it.addEventListener('click',()=>{cerrarMenu(true);if(o.accion)o.accion(ancla);actualizar();});
   m.append(it);
  }
  m.addEventListener('keydown',e=>{
   const its=[...m.querySelectorAll('.erlen-cinta-opcion:not([disabled])')],i=its.indexOf(doc.activeElement);
   if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cerrarMenu(true);return;}
   if(e.key==='Tab'){cerrarMenu(true);return;}
   let j=null;
   if(e.key==='ArrowDown')j=(i+1)%its.length;
   else if(e.key==='ArrowUp')j=(i-1+its.length)%its.length;
   else if(e.key==='Home')j=0;
   else if(e.key==='End')j=its.length-1;
   if(j!==null&&its.length){e.preventDefault();its[j].focus();}
  });
  doc.body.append(m);
  ancla.setAttribute('aria-expanded','true');
  const r=ancla.getBoundingClientRect(),w=m.offsetWidth||240,h=m.offsetHeight||0;
  const vw=win.innerWidth||doc.documentElement.clientWidth,vh=win.innerHeight||doc.documentElement.clientHeight;
  m.style.left=Math.max(8,Math.min(r.left,vw-w-8))+'px';
  m.style.top=(r.bottom+4+h>vh-8&&r.top-4-h>8?r.top-4-h:r.bottom+4)+'px';
  const fuera=e=>{if(!m.contains(e.target)&&e.target!==ancla&&!ancla.contains(e.target))cerrarMenu();};
  win.setTimeout(()=>doc.addEventListener('pointerdown',fuera),0);
  menu={m,ancla,fuera};
  const primero=m.querySelector('.erlen-cinta-opcion:not([disabled])');
  if(primero)primero.focus();
 }
 function cerrarMenu(devolverFoco){
  if(!menu)return;
  doc.removeEventListener('pointerdown',menu.fuera);
  menu.m.remove();
  menu.ancla.setAttribute('aria-expanded','false');
  if(devolverFoco&&menu.ancla.isConnected)menu.ancla.focus();
  menu=null;
 }

 function fijarPlegado(v){
  plegada=!!v;guardar(plegada);
  raiz.toggleAttribute('data-plegada',plegada);
  panel.hidden=plegada;
  firmaPestanas='';actualizar();
 }
 const atajo=e=>{if(e.key==='F1'&&(e.ctrlKey||e.metaKey)&&raiz.isConnected&&!raiz.closest('[inert]')){e.preventDefault();fijarPlegado(!plegada);}};
 doc.addEventListener('keydown',atajo);

 function actualizar(){
  const ps=todas();
  if(!ps.some(p=>p.id===activa))activa=config.pestanas[0].id;
  const firma=ps.map(p=>p.id+(p.contextual?'*':'')+':'+p.etiqueta).join('|')+'|'+plegada;
  if(firma!==firmaPestanas){
   const teniaFoco=lista.contains(doc.activeElement)&&doc.activeElement.getAttribute('role')==='tab';
   firmaPestanas=firma;pintarPestanas(ps);
   if(teniaFoco)lista.querySelector('[aria-selected=true]')?.focus();
  }
  for(const t of lista.querySelectorAll('[role=tab]')){const on=t.dataset.pestana===activa;t.setAttribute('aria-selected',String(on));t.tabIndex=on?0:-1;}
  const p=ps.find(x=>x.id===activa);
  const firmaP=p.id+':'+p.grupos.map(g=>g.etiqueta+'='+g.controles.map(c=>c.id||c.etiqueta).join(',')).join(';');
  if(firmaP!==firmaPanel){firmaPanel=firmaP;pintarPanel(p);}
  else refrescar();
 }
 function seleccionar(id,delUsuario){
  if(!todas().some(p=>p.id===id))return;
  const cambia=id!==activa;
  activa=id;actualizar();
  if(cambia&&delUsuario&&config.alCambiar)config.alCambiar(id);
 }

 raiz.toggleAttribute('data-plegada',plegada);
 panel.hidden=plegada;
 actualizar();
 return {
  elemento:raiz,
  actualizar,
  seleccionar:id=>seleccionar(id,false),
  plegar:v=>fijarPlegado(v),
  get activa(){return activa;},
  destruir(){cerrarMenu();doc.removeEventListener('keydown',atajo);raiz.remove();}
 };
}

function validarPestana(p){
 if(!p||typeof p.id!=='string'||!p.id||typeof p.etiqueta!=='string'||!Array.isArray(p.grupos))throw Error('Pestaña de cinta inválida: necesita id, etiqueta y grupos.');
 for(const g of p.grupos){
  if(!g||typeof g.etiqueta!=='string'||!Array.isArray(g.controles))throw Error('Grupo de cinta inválido en «'+p.etiqueta+'».');
  for(const c of g.controles)if(!c||!TIPOS.includes(c.tipo)||typeof c.etiqueta!=='string'||!c.etiqueta)throw Error('Control de cinta inválido en «'+g.etiqueta+'»: tipo '+(c&&c.tipo));
 }
}
