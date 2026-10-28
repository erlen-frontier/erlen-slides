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
/* Panel de ayuda de Mey: «te guía y ejecuta con tu clic». Busca entre los comandos reales
   de la cinta (suite-cinta.mjs#comandos) más los extras que pase la app, muestra dónde
   está cada uno (pestaña › grupo) y lo ejecuta solo cuando la persona pulsa «Hazlo».
   Mey no lee el documento ni envía nada: el panel solo conoce etiquetas de comandos y lo
   que la app declare en `pasos` y `extras`; no hay modelo de lenguaje.

   crearAyudaMey(doc, {
     app:'notes', nombre:'Erlen Notes',
     mascota:mey('hola'),                 // SVG inicial; false si la página ya tiene a Mey
     cinta:()=>cintaHandle|null,          // función: la cinta se recrea en varias apps
     pasos:[{control:'nueva', pestana?, texto}],  | ()=>[…],  atajos sugeridos
     extras:()=>[Comando…],               // comandos fuera de la cinta (menú Archivo…)
     cerrar:()=>{}                        // cierra el cajón que contiene el panel
   })
   Devuelve {nodo, enfocarBusqueda(), destruir()}.
   Comando = {clave, pestana, etiqueta, ruta, atajo?, titulo?, habilitado, ejecutar()}
   (el mismo tipo que suite-cinta.mjs#comandos; los extras suelen llevar pestana:'').
   Estilos en marco.css (.erlen-ayuda-*), solo con tokens --erlen-*. */
import {mey} from './mey.mjs';

export const TEXTOS_AYUDA_MEY={
 es:{
  titulo:'Mey te ayuda',
  intro:'Encuentro comandos de esta herramienta y los ejecuto cuando me lo pides. No leo tu documento ni envío nada.',
  etiquetaBuscar:'¿Qué quieres hacer?',
  ayudaBuscar:'Por ejemplo: guardar, insertar tabla, exportar',
  empieza:'Empieza por aquí',
  mostrar:'Mostrar',
  hazlo:'Hazlo',
  noDisponible:'No disponible ahora',
  sinResultados:'No encontré ese comando en esta herramienta. Prueba con otra palabra.',
  resultados:n=>n===1?'1 resultado':n+' resultados',
  sinCinta:'Esta vista no tiene cinta de herramientas; solo puedo mostrarte las acciones de la cabecera y del menú Archivo.',
  ubicacion:'Dónde está'
 },
 en:{
  titulo:'Mey helps',
  intro:'I find commands in this tool and run them when you ask. I don\'t read your document or send anything.',
  etiquetaBuscar:'What do you want to do?',
  ayudaBuscar:'For example: save, insert table, export',
  empieza:'Start here',
  mostrar:'Show me',
  hazlo:'Do it',
  noDisponible:'Not available now',
  sinResultados:'I couldn\'t find that command in this tool. Try another word.',
  resultados:n=>n===1?'1 result':n+' results',
  sinCinta:'This view has no toolbar; I can only show header and File menu actions.',
  ubicacion:'Where it is'
 }
};

/* Búsqueda por palabras: cada token debe ser prefijo de una palabra de la etiqueta, la ruta,
   el título o el atajo, o de una palabra de su grupo de sinónimos (Y entre tokens, O dentro
   del grupo). Así «guardar» encuentra «Descargar proyecto» y «desc» encuentra «Guardar». */
const SINONIMOS=[
 ['guardar','descargar','exportar'],
 ['abrir','importar','cargar'],
 ['nuevo','crear','anadir','agregar','insertar'],
 ['buscar','encontrar','reemplazar'],
 ['deshacer','revertir'],
 ['imprimir','pdf'],
 ['ayuda','atajos']
];

function normalizar(t){
 return String(t).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
}
function palabras(t){
 return normalizar(t).split(/[^a-z0-9]+/).filter(Boolean);
}
function coincideToken(token,palabrasPajar){
 if(palabrasPajar.some(p=>p.startsWith(token)))return true;
 for(const g of SINONIMOS){
  if(!g.some(w=>w.startsWith(token)))continue;
  if(palabrasPajar.some(p=>g.some(w=>p===w||p.startsWith(w))))return true;
 }
 return false;
}
function buscarComandos(consulta,entradas){
 const tokens=palabras(consulta);
 if(!tokens.length)return [];
 const hallazgos=[];
 entradas.forEach((entrada,i)=>{
  const c=entrada.comando;
  const palabrasEtiqueta=palabras(c.etiqueta);
  const pajar=[...palabrasEtiqueta,...palabras((c.ruta||[]).join(' ')),...palabras(c.titulo||''),...palabras(c.atajo||'')];
  let puntos=0;
  for(const tk of tokens){
   if(!coincideToken(tk,pajar))return;
   puntos+=palabrasEtiqueta.some(p=>p===tk)?3:palabrasEtiqueta.some(p=>p.startsWith(tk))?2:1;
  }
  hallazgos.push({entrada,puntos,i});
 });
 hallazgos.sort((a,b)=>b.puntos-a.puntos||(a.entrada.comando.habilitado!==b.entrada.comando.habilitado?(a.entrada.comando.habilitado?-1:1):a.i-b.i));
 return hallazgos.slice(0,8).map(h=>h.entrada);
}

export function crearAyudaMey(doc,{app,nombre,mascota,cinta,pasos,extras,cerrar}){
 if(!doc||!doc.createElement)throw Error('crearAyudaMey necesita un documento.');
 const idioma=(doc.documentElement.lang||'').toLowerCase().startsWith('en')?'en':'es';
 const t=TEXTOS_AYUDA_MEY[idioma];
 const mascotaHola=mascota===false?'':typeof mascota==='string'&&mascota?mascota:mey('hola');
 const el=(tag,attrs={},...hijos)=>{
  const n=doc.createElement(tag);
  for(const [k,v] of Object.entries(attrs||{}))if(v!==null&&v!==undefined&&v!==false)n.setAttribute(k,v===true?'':String(v));
  n.append(...hijos.filter(h=>h!==null&&h!==undefined));
  return n;
 };

 const nodo=el('section',{class:'erlen-ayuda','data-erlen-ayuda-app':app||''});
 const mascotaNodo=el('span',{class:'erlen-ayuda-mascota','aria-hidden':'true'});
 mascotaNodo.innerHTML=mascotaHola;
 const intro=el('p',{class:'erlen-ayuda-intro'},t.intro);
 const rotuloBuscar=el('span',{class:'erlen-ayuda-buscar-rotulo'},t.etiquetaBuscar);
 const entrada=el('input',{type:'search',class:'erlen-ayuda-entrada',placeholder:t.ayudaBuscar,autocomplete:'off',spellcheck:'false'});
 const buscar=el('label',{class:'erlen-ayuda-buscar'},rotuloBuscar,entrada);
 const estado=el('p',{class:'erlen-ayuda-estado',role:'status','aria-live':'polite'});
 const avisoCinta=el('p',{class:'erlen-ayuda-sincinta',hidden:true});
 const rotuloEmpieza=el('h3',{class:'erlen-ayuda-empieza',hidden:true},t.empieza);
 const lista=el('ul',{class:'erlen-ayuda-lista'});
 nodo.append(el('div',{class:'erlen-ayuda-cabecera'},mascota===false?null:mascotaNodo,el('div',{class:'erlen-ayuda-presentacion'},el('h2',{class:'erlen-ayuda-titulo'},t.titulo),intro)),buscar,estado,avisoCinta,rotuloEmpieza,lista);

 // Comandos disponibles = cinta (si existe) + extras. Se recalcula en cada apertura y
 // pulsación. Cada entrada recuerda si viene de la cinta: solo esos pueden «Mostrar».
 function disponibles(){
  const manejar=cinta?cinta():null;
  const deCinta=manejar&&typeof manejar.comandos==='function'?manejar.comandos():[];
  const fuera=extras?extras():[];
  return [...deCinta.map(comando=>({comando,deCinta:true})),...(fuera||[]).map(comando=>({comando,deCinta:false}))];
 }
 function resolverPasos(entradas){
  const fuente=typeof pasos==='function'?pasos():(pasos||[]);
  const resueltos=[];
  for(const p of fuente){
   if(!p||typeof p.control!=='string')continue;
   const hallado=entradas.find(e=>e.comando.clave===p.control&&(!p.pestana||e.comando.pestana===p.pestana));
   if(hallado)resueltos.push({entrada:hallado,texto:p.texto});
  }
  return resueltos;
 }
 function filaDe({entrada,texto}){
  const c=entrada.comando;
  const li=el('li',{class:'erlen-ayuda-fila'});
  li.append(el('span',{class:'erlen-ayuda-etiqueta'},c.etiqueta));
  if(c.ruta&&c.ruta.length)li.append(el('small',{class:'erlen-ayuda-ruta'},t.ubicacion+': '+c.ruta.join(' › ')));
  if(texto)li.append(el('small',{class:'erlen-ayuda-texto'},texto));
  if(!c.habilitado)li.append(el('span',{class:'erlen-ayuda-no'},t.noDisponible));
  const acciones=el('span',{class:'erlen-ayuda-acciones'});
  if(entrada.deCinta){
   const mostrar=el('button',{type:'button',class:'erlen-ayuda-mostrar'},t.mostrar);
   mostrar.addEventListener('click',()=>{cerrar();const manejar=cinta?cinta():null;if(manejar)manejar.enfocar(c.clave,c.pestana||undefined);});
   acciones.append(mostrar);
  }
  const hazlo=el('button',{type:'button',class:'erlen-ayuda-hazlo'},t.hazlo);
  if(!c.habilitado){hazlo.disabled=true;}
  else hazlo.addEventListener('click',()=>{cerrar();c.ejecutar();});
  acciones.append(hazlo);
  li.append(acciones);
  return li;
 }
 function pintar(){
  const entradas=disponibles();
  const consulta=entrada.value;
  const sinCinta=!cinta||!cinta();
  avisoCinta.hidden=!sinCinta;
  if(sinCinta)avisoCinta.textContent=t.sinCinta;
  lista.replaceChildren();
  mascotaNodo.innerHTML=mascotaHola;
  if(consulta.trim()===''){
   const resueltos=resolverPasos(entradas);
   // Sin cinta, los extras son lo único ejecutable: se listan junto al aviso, sin duplicar
   // los pasos ya resueltos.
   if(sinCinta){
    const vistos=new Set(resueltos.map(r=>r.entrada.comando.clave));
    for(const e of entradas)if(!vistos.has(e.comando.clave))resueltos.push({entrada:e});
   }
   rotuloEmpieza.hidden=!resueltos.length;
   estado.textContent=resueltos.length?'':t.ayudaBuscar;
   for(const r of resueltos)lista.append(filaDe(r));
   return;
  }
  rotuloEmpieza.hidden=true;
  const hallazgos=buscarComandos(consulta,entradas);
  estado.textContent=hallazgos.length?t.resultados(hallazgos.length):t.sinResultados;
  if(!hallazgos.length&&mascota!==false)mascotaNodo.innerHTML=mey('pensando');
  for(const h of hallazgos)lista.append(filaDe({entrada:h}));
 }
 entrada.addEventListener('input',pintar);
 pintar();
 return {
  nodo,
  enfocarBusqueda(){entrada.focus();},
  destruir(){entrada.removeEventListener('input',pintar);if(nodo.isConnected)nodo.remove();}
 };
}
