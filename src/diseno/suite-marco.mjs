import {aplicarIconoAplicacion} from './productos.mjs';
// SPDX-License-Identifier: MIT
/* Copyright (c) 2026 Erlen contributors
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is furnished to do
 * so, subject to the following conditions:
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
/* Marco común de las apps de Erlen Suite (docs/COHERENCIA-APPS.md §4): cabecera con marca,
   nombre, menú de suite, título, estado y acciones; cinta debajo; cuerpo con navegación,
   trabajo y detalles; pie. mountMarco solo organiza los nodos que la app le pasa: los mueve,
   no los clona ni los reconstruye, así que las referencias, los listeners y la selección del
   dominio se conservan. Estilos en diseno/marco.css, solo con tokens --erlen-*.

   mountMarco(host, {
     app: 'notes',                  // id de la app en la suite; perfil de Mey y menú
     nombre: 'Erlen Notes',         // nombre visible (h1 del marco)
     inicio: () => {},              // obligatorio, sin argumentos: activa el inicio real de la app
     elementos: {                   // nodos propiedad de la app; solo trabajo es obligatorio
       titulo?,                     // título editable del documento
       estado?,                     // indicador de guardado (role="status")
       acciones?,                   // una acción principal y sus hermanas
       utilidades?,                 // buscar, tema, ayuda…
       cinta?,                      // cinta ya montada con mountCinta
       navegacion?,                 // tira/esquema/biblioteca de la izquierda
       trabajo,                     // documento, hoja, lienzo… (conserva su scroll y zoom)
       detalles?,                   // propiedades largas a la derecha
       pie?                         // estado y enlaces en el pie
     },
     navegacionSuite?: {items, home},  // catálogo serializado de mountSuiteNavigation; sin él,
                                       // el menú conserva su detección standalone
     mey?: false                    // por defecto Mey en la cabecera/estado (lugar «barra»)
     ayuda?: {                      // panel de Mey que guía y ejecuta comandos (suite-mey-ayuda.mjs)
       cinta?: ()=>cintaHandle|null,   // función: la cinta se recrea en varias apps
       pasos?: [{control, pestana?, texto}] | ()=>[…],  // atajos sugeridos (controles de cinta)
       extras?: ()=>[Comando…]         // comandos fuera de la cinta (menú Archivo, cabecera)
     }
   })
   Devuelve {elemento, abrirDetalles(), cerrarDetalles(), abrirNavegacion(), cerrarNavegacion(),
   abrirAyuda(), cerrarAyuda(), destruir()} (los controles del cajón de navegación son una
   extensión aditiva deliberada del contrato original: el cajón móvil no existía cuando se
   escribió; `abrirAyuda` abre el panel de Mey cuando la app pasa `ayuda`). Montar dos veces en
   el mismo host es un error. Al destruir, los nodos vuelven a su padre original, se restauran
   los `inert` previos, se libera el menú de suite, Mey y los listeners, y se retira el marco. */
import {mountSuiteNavigation} from './suite-nav.mjs';
import {mey} from './mey.mjs';
import {crearAyudaMey,TEXTOS_AYUDA_MEY} from './suite-mey-ayuda.mjs';

const SLOTS=['titulo','estado','acciones','utilidades','cinta','navegacion','trabajo','detalles','pie'];
const ESTRECHO=920;
// Acción principal de la cabecera: las apps la marcan con una de estas clases. En móvil vertical sube a
// una barra inferior (ver «barraAccion»); una app sin acción marcada conserva su tira.
const PRIMARIA='.primary,.primario,.btn-pri,.btn-primary,.principal';
const ALTO_BAJO=500;

const MARCA_SVG='<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path d="M25 10h14v13.2c0 1.2.4 2.3 1.1 3.2L52.6 45A8 8 0 0 1 46 56H18a8 8 0 0 1-6.6-11.7l12.5-18.6c.7-.9 1.1-2 1.1-3.2Z" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linejoin="round"/><path d="M17.6 43h28.8l4.4 6.5A4.3 4.3 0 0 1 46.7 55H17.3a4.3 4.3 0 0 1-4.1-5.8Z" fill="var(--erlen-verde,#245b43)"/><path d="M22 16h20" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/></svg>';

function crear(tag,clase,doc){const el=doc.createElement(tag);if(clase)el.className=clase;return el;}

// Estado de `inert` de cada hijo de <body> mientras un cajón está abierto (atributo, no propiedad:
// así funciona igual en JSDOM y en el navegador y se restaura exactamente lo previo).
function inmovilizar(doc,exceptos){
 const guardados=[];
 for(const hijo of doc.body.children){
  if(exceptos.includes(hijo))continue;
  // Un dialog cerrado ya está fuera del foco. showModal() gestiona su propia modalidad;
  // marcarlo inert explícitamente impediría usar formularios abiertos desde el cajón.
  if(hijo.localName==='dialog'&&!hijo.open)continue;
  guardados.push({hijo,inert:hijo.hasAttribute('inert')});
  hijo.setAttribute('inert','');
 }
 return guardados;
}
function restaurar(guardados){
 for(const {hijo,inert} of guardados)if(inert)hijo.setAttribute('inert','');else hijo.removeAttribute('inert');
}

export function mountMarco(host,config){
 if(!host||host.nodeType!==1)throw new Error('mountMarco: falta un host válido.');
 const doc=host.ownerDocument;
 if(!doc||!doc.defaultView)throw new Error('mountMarco: el host necesita un documento con ventana.');
 if(!config||typeof config!=='object')throw new Error('mountMarco: falta la configuración.');
 const {app,nombre,inicio,elementos,navegacionSuite}=config;
 if(typeof app!=='string'||!app.trim())throw new Error('mountMarco: falta app.');
 if(typeof nombre!=='string'||!nombre.trim())throw new Error('mountMarco: falta nombre.');
 aplicarIconoAplicacion(doc,app);
 if(typeof inicio!=='function')throw new Error('mountMarco: inicio debe ser un callback sin argumentos.');
 if(!elementos||typeof elementos!=='object')throw new Error('mountMarco: faltan elementos.');
 for(const [clave,nodo] of Object.entries(elementos)){
  if(!SLOTS.includes(clave))throw new Error('mountMarco: elemento desconocido: '+clave);
  if(nodo!==undefined&&nodo!==null&&(!nodo.ownerDocument||nodo.nodeType!==1))throw new Error('mountMarco: elemento inválido: '+clave);
 }
 const trabajo=elementos.trabajo;
 if(!trabajo||!trabajo.ownerDocument)throw new Error('mountMarco: falta el nodo de trabajo.');
 if(trabajo.ownerDocument!==doc)throw new Error('mountMarco: los nodos deben pertenecer al documento del host.');
 if(navegacionSuite!==undefined&&(!navegacionSuite||!Array.isArray(navegacionSuite.items)||!navegacionSuite.home))throw new Error('mountMarco: navegacionSuite debe ser {items, home}.');
 if(config.ayuda!==undefined){
  const a=config.ayuda;
  if(!a||typeof a!=='object'||Array.isArray(a))throw new Error('mountMarco: ayuda inválida: ayuda');
  if(a.cinta!==undefined&&a.cinta!==null&&typeof a.cinta!=='function')throw new Error('mountMarco: ayuda inválida: cinta');
  if(a.pasos!==undefined&&a.pasos!==null&&!Array.isArray(a.pasos)&&typeof a.pasos!=='function')throw new Error('mountMarco: ayuda inválida: pasos');
  if(a.extras!==undefined&&a.extras!==null&&typeof a.extras!=='function')throw new Error('mountMarco: ayuda inválida: extras');
 }
 if(host.querySelector('.erlen-marco'))throw new Error('mountMarco: el host ya tiene un marco montado.');

 const win=doc.defaultView;
 const movidos=[];   // {nodo, padre, siguiente, indice} para devolverlos en destruir()
 const mover=nodo=>{if(!nodo)return;movidos.push({nodo,padre:nodo.parentNode,siguiente:nodo.nextSibling,indice:nodo.parentNode?[...nodo.parentNode.childNodes].indexOf(nodo):null});};
 for(const clave of SLOTS)mover(elementos[clave]);
 // Mover nodos vivos colapsa los rangos del documento que tocan el subárbol movido (los objetos
 // Range viven y mutan con él), así que se guardan sus límites como datos y se reconstruyen después.
 const seleccion=win.getSelection?win.getSelection():null;
 const guardarSeleccion=()=>{
  const limites=[];
  if(seleccion)for(let i=0;i<seleccion.rangeCount;i++){const r=seleccion.getRangeAt(i);limites.push({s:r.startContainer,o:r.startOffset,e:r.endContainer,f:r.endOffset});}
  return {limites,foco:doc.activeElement};
 };
 const restaurarSeleccion=({limites,foco})=>{
  // Primero el foco (focus() puede colapsar la selección en algunos motores), después los rangos.
  if(foco&&foco!==doc.body&&foco.ownerDocument===doc&&doc.contains(foco)&&typeof foco.focus==='function')foco.focus({preventScroll:true});
  if(seleccion&&limites.length){
   seleccion.removeAllRanges();
   for(const d of limites){
    if(!d.s?.isConnected||!d.e?.isConnected)continue;
    const r=doc.createRange();
    try{r.setStart(d.s,d.o);r.setEnd(d.e,d.f);seleccion.addRange(r);}catch{/* límites ya no válidos */}
   }
  }
 };
 const estadoPrevio=guardarSeleccion();

 // data-erlen-app para los perfiles de Mey; se restaura al destruir.
 const raiz=doc.documentElement;
 const appPrevia=raiz.getAttribute('data-erlen-app');
 raiz.setAttribute('data-erlen-app',app);

 const marco=crear('div','erlen-marco',doc);
 const cabecera=crear('header','erlen-app-header',doc);
 const marca=crear('button','erlen-marco-marca',doc);
 marca.type='button';marca.title='Volver a '+nombre;
 marca.setAttribute('aria-label','Volver a '+nombre);
 marca.innerHTML=MARCA_SVG+'<span class="erlen-marco-marca-nombre">Erlen</span>';
 const alPulsarMarca=()=>inicio();
 marca.addEventListener('click',alPulsarMarca);
 const abrirCajonNav=crear('button','erlen-marco-abrir-cajon',doc);
 abrirCajonNav.type='button';abrirCajonNav.title='Navegación';abrirCajonNav.setAttribute('aria-label','Abrir la navegación');
 abrirCajonNav.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
 const h1=crear('h1','erlen-marco-nombre',doc);
 h1.textContent=nombre;
 const huecoSuite=crear('div','erlen-marco-suite',doc);
 const titulo=crear('div','erlen-marco-titulo',doc);
 const estado=crear('div','erlen-marco-estado',doc);
 const conAyuda=!!config.ayuda&&config.mey!==false;
 const meyHueco=crear(conAyuda?'button':'span','erlen-marco-mey',doc);
 if(conAyuda){
  meyHueco.type='button';
  meyHueco.setAttribute('aria-haspopup','dialog');
  const idioma=(doc.documentElement.lang||'').toLowerCase().startsWith('en')?'en':'es';
  meyHueco.setAttribute('aria-label',idioma==='en'?'Mey, help for '+nombre:'Mey, ayuda de '+nombre);
  meyHueco.title=TEXTOS_AYUDA_MEY[idioma].titulo;
  meyHueco.addEventListener('click',abrirAyuda);
 }
 const acciones=crear('div','erlen-marco-acciones',doc);
 const utilidades=crear('div','erlen-marco-utilidades',doc);
 const controles=crear('div','erlen-marco-controles',doc);
 controles.append(titulo,estado,acciones,utilidades);
 cabecera.append(abrirCajonNav,marca,h1,huecoSuite,controles);
 for(const [contenedor,clave] of [[titulo,'titulo'],[estado,'estado'],[acciones,'acciones'],[utilidades,'utilidades']]){
  if(elementos[clave])contenedor.append(elementos[clave]);
  else if(contenedor!==estado)contenedor.remove();
 }
 estado.append(meyHueco);
 if(config.mey===false)meyHueco.remove();
 // El nombre del documento cede primero cuando falta ancho (marco.css, escritorio): si queda
 // recortado, su texto completo pasa a title y se restituye el title anterior cuando vuelve a caber.
 const nombreDoc=elementos.titulo;
 if(nombreDoc){
  const sincroniza=()=>{
   const texto=String(nombreDoc.value??nombreDoc.textContent??'').trim();
   const recortado=nombreDoc.scrollWidth>nombreDoc.clientWidth+1;
   if(texto&&recortado){
    if(nombreDoc.dataset.tooltipNombre===undefined){nombreDoc.dataset.tooltipNombre=nombreDoc.getAttribute('title')??'';}
    nombreDoc.title=texto;
   }else if(nombreDoc.dataset.tooltipNombre!==undefined){
    const previo=nombreDoc.dataset.tooltipNombre;
    delete nombreDoc.dataset.tooltipNombre;
    if(previo)nombreDoc.title=previo;else nombreDoc.removeAttribute('title');
   }
  };
  for(const evento of ['pointerenter','focus','input'])nombreDoc.addEventListener(evento,sincroniza);
  if(typeof doc.defaultView?.MutationObserver==='function')new doc.defaultView.MutationObserver(sincroniza).observe(nombreDoc,{childList:true,characterData:true,subtree:true});
 }

 const cuerpo=crear('div','erlen-marco-cuerpo',doc);
 const nodoNav=crear('nav','erlen-marco-navegacion',doc);
 const nodoTrabajo=crear('main','erlen-marco-trabajo',doc);
 const nodoDetalles=crear('aside','erlen-marco-detalles',doc);
 if(elementos.navegacion){nodoNav.append(elementos.navegacion);cuerpo.classList.add('con-navegacion');}
 if(elementos.detalles){nodoDetalles.append(elementos.detalles);}
 nodoTrabajo.append(trabajo);
 cuerpo.append(nodoNav,nodoTrabajo,nodoDetalles);
 if(!elementos.navegacion){nodoNav.remove();abrirCajonNav.remove();}
 if(!elementos.detalles)nodoDetalles.remove();

 marco.append(cabecera);
 if(elementos.cinta){const franja=crear('div','erlen-marco-cinta',doc);franja.append(elementos.cinta);marco.append(franja);}
 marco.append(cuerpo);
 const pie=elementos.pie?crear('footer','erlen-app-footer',doc):null;
 if(pie){pie.append(elementos.pie);marco.append(pie);}
 host.append(marco);
 restaurarSeleccion(estadoPrevio);
 
 // Barra inferior de la acción principal (≤ 920 px y alto > 500 px: móvil y tableta en vertical). En la
 // tira de la cabecera la acción quedaba a 412-650 px de un teléfono de 375 y solo se alcanzaba
 // desplazando la tira. El botón se mueve (no se clona): conserva listeners y referencias, y
 // vuelve a su sitio al ensanchar la ventana, al girar en paisaje corto o al destruir el marco.
 const barraAccion=elementos.acciones?crear('div','erlen-marco-barra-accion',doc):null;
 let primariaMovida=null,origenPrimaria=null;
 const modoBarra=()=>win.innerWidth<=ESTRECHO&&win.innerHeight>ALTO_BAJO;
 function devolverPrimaria(){
  if(!primariaMovida)return;
  const {padre,siguiente}=origenPrimaria,nodo=primariaMovida;
  primariaMovida=null;origenPrimaria=null;
  const antes=guardarSeleccion();
  const destino=padre?.isConnected?padre:acciones;
  if(siguiente&&siguiente.parentNode===destino)destino.insertBefore(nodo,siguiente);else destino.append(nodo);
  restaurarSeleccion(antes);
 }
 function sincronizarBarraAccion(){
  if(!barraAccion)return;
  if(!modoBarra()){devolverPrimaria();barraAccion.remove();marco.classList.remove('con-barra-accion');return;}
  if(!primariaMovida){
   const primaria=acciones.querySelector(PRIMARIA);
   if(!primaria)return;
   origenPrimaria={padre:primaria.parentNode,siguiente:primaria.nextSibling};
   primariaMovida=primaria;
   const antes=guardarSeleccion();
   if(barraAccion.parentNode!==marco)marco.append(barraAccion);
   barraAccion.append(primaria);
   restaurarSeleccion(antes);
  }
  if(barraAccion.parentNode!==marco)marco.append(barraAccion);
  marco.classList.add('con-barra-accion');
 }
 if(barraAccion){
  sincronizarBarraAccion();
  win.addEventListener('resize',sincronizarBarraAccion);
 }
 // Una app puede añadir su acción principal después de montar el marco.
 const vigiaAccion=barraAccion&&win.MutationObserver?new win.MutationObserver(()=>{if(!primariaMovida)sincronizarBarraAccion();}):null;
 if(vigiaAccion)vigiaAccion.observe(acciones,{childList:true,subtree:true});

 // Indicador de desborde: data-desborde=inicio|fin|ambos|'' en la tira de controles (todos los
 // anchos) y en el pie compacto (≤ 600 px o paisaje corto). El degradado del borde lo
 // pinta marco.css; con forced-colors o en impresión no hay máscara. Además del scroll y del
 // tamaño de la ventana, un MutationObserver vuelve a medir cuando la app llena los huecos
 // después de montar el marco: la caja no cambia de tamaño, pero su contenido sí.
 function vigilarDesborde(elemento,soloEstrecho){
  if(!elemento)return null;
  let pendiente=false;
  const medir=()=>{
   pendiente=false;
   if(soloEstrecho&&win.innerWidth>600&&!(win.innerWidth<=ESTRECHO&&win.innerHeight<=500)){if(elemento.dataset.desborde)elemento.dataset.desborde='';return;}
   const inicio=elemento.scrollLeft>1,fin=elemento.scrollLeft+elemento.clientWidth<elemento.scrollWidth-1;
   elemento.dataset.desborde=inicio&&fin?'ambos':inicio?'inicio':fin?'fin':'';
  };
  const programa=()=>{
   if(pendiente)return;
   pendiente=true;
   if(win.requestAnimationFrame)win.requestAnimationFrame(medir);else medir();
  };
  programa();
  elemento.addEventListener('scroll',programa,{passive:true});
  win.addEventListener('resize',programa);
  let observador=null,mutador=null;
  if(win.ResizeObserver){observador=new win.ResizeObserver(programa);observador.observe(elemento);}
  if(win.MutationObserver){mutador=new win.MutationObserver(programa);mutador.observe(elemento,{childList:true,subtree:true});}
  return {despegar(){elemento.removeEventListener('scroll',programa);win.removeEventListener('resize',programa);if(observador)observador.disconnect();if(mutador)mutador.disconnect();}};
 }
 const vigias=[vigilarDesborde(controles,false),vigilarDesborde(pie,true)].filter(Boolean);

 const navSuite=(()=>{
  // Sin catálogo, el menú standalone solo conoce las apps históricas: una app fuera de esa lista
  // (analyze, data, projects, release, editor histórico…) se queda sin menú en vez de romper el
  // arranque. Con catálogo explícito el menú siempre se monta para su app.
  try{return mountSuiteNavigation(huecoSuite,app,navegacionSuite);}catch{return null;}
 })();
 const libre=config.mey!==false&&!!doc.defaultView.requestAnimationFrame;
 const controlMey=config.mey===false||libre?null:mey.montar(meyHueco,{lugar:'barra',app});
 if(libre){if(conAyuda)meyHueco.textContent=(doc.documentElement.lang||'').startsWith('en')?'Mey · help':'Mey · ayuda';else meyHueco.remove();}
 const paseoMey=libre?mey.recorrerPagina({documento:doc,evitar:[trabajo],pausaEn:controles,accion:conAyuda?abrirAyuda:undefined}):null;

 // ---- Cajón accesible (navegación en estrecho; detalles a ≤ 920 px) ----
 let cajon=null,mascara=null,guardados=[],focoPrevio=null,devolver=null,alCerrarCajon=null,tipoCajon=null;
 function visible(el){
  for(let nodo=el;nodo?.nodeType===1;nodo=nodo.parentElement){
   const estilo=win.getComputedStyle(nodo);
   if(nodo.hidden||nodo.hasAttribute('inert')||estilo.display==='none'||estilo.visibility==='hidden')return false;
  }
  return true;
 }
 function enfocables(contenedor){
  return [...contenedor.querySelectorAll('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(el=>!el.disabled&&el.type!=='hidden'&&visible(el));
 }
 function abrirCajon(nodo,{tituloCajon,izquierda,tipo,devolver:volver,onClose}){
  if(cajon)cerrarCajon();
  tipoCajon=tipo||null;
  devolver=volver||null;
  focoPrevio=doc.activeElement;
  mascara=crear('div','erlen-marco-mascara',doc);
  cajon=crear('aside','erlen-marco-cajon'+(izquierda?' erlen-marco-cajon-izq':''),doc);
  cajon.setAttribute('role','dialog');
  cajon.setAttribute('aria-modal','true');
  cajon.setAttribute('aria-label',tituloCajon);
  const cab=crear('div','erlen-marco-cajon-cabecera',doc);
  const rotulo=crear('div','erlen-marco-cajon-titulo',doc);
  rotulo.textContent=tituloCajon;
  const cerrar=crear('button','erlen-marco-cajon-cerrar',doc);
  cerrar.type='button';cerrar.textContent='✕';cerrar.title='Cerrar';cerrar.setAttribute('aria-label','Cerrar');
  cab.append(rotulo,cerrar);
  const contenido=crear('div','erlen-marco-cajon-cuerpo',doc);
  const antesDeMover=guardarSeleccion();
  contenido.append(nodo);
  restaurarSeleccion(antesDeMover);
  cajon.append(cab,contenido);
  doc.body.append(mascara,cajon);
  guardados=inmovilizar(doc,[mascara,cajon]);
  alCerrarCajon=onClose;
  cerrar.addEventListener('click',cerrarCajon);
  mascara.addEventListener('click',cerrarCajon);
  cajon.addEventListener('keydown',alPulsar);
  (enfocables(cajon)[0]||cerrar).focus();
 }
 function alPulsar(evento){
  if(evento.key==='Escape'){evento.preventDefault();evento.stopPropagation();cerrarCajon();return;}
  if(evento.key!=='Tab')return;
  const lista=enfocables(cajon);
  if(!lista.length){evento.preventDefault();return;}
  const primero=lista[0],ultimo=lista[lista.length-1];
  if(evento.shiftKey&&doc.activeElement===primero){evento.preventDefault();ultimo.focus();}
  else if(!evento.shiftKey&&doc.activeElement===ultimo){evento.preventDefault();primero.focus();}
 }
 function cerrarCajon(){
  if(!cajon)return;
  const nodo=cajon.querySelector('.erlen-marco-cajon-cuerpo')?.firstElementChild;
  const volver=devolver;
  cajon.removeEventListener('keydown',alPulsar);
  cajon.remove();mascara.remove();
  restaurar(guardados);
  guardados=[];cajon=null;mascara=null;
  if(nodo&&volver){const antesDeVolver=guardarSeleccion();volver(nodo);restaurarSeleccion(antesDeVolver);}
  const devolverFoco=focoPrevio;focoPrevio=null;
  if(doc.contains(devolverFoco)&&typeof devolverFoco.focus==='function')devolverFoco.focus({preventScroll:true});
  const cerrar=alCerrarCajon;alCerrarCajon=null;devolver=null;tipoCajon=null;
  if(cerrar)cerrar();
 }
 function abrirDetalles(){
  if(!elementos.detalles)throw new Error('mountMarco: la app no tiene panel de detalles.');
  if(win.innerWidth<=ESTRECHO){
   abrirCajon(elementos.detalles,{tituloCajon:'Detalles',tipo:'detalles',devolver:nodo=>nodoDetalles.append(nodo),onClose:()=>{if(win.innerWidth>ESTRECHO)cuerpo.classList.remove('con-detalles');}});
  }else cuerpo.classList.add('con-detalles');
 }
 // «con-detalles» y «con-navegacion» son lo que la app quiere en ancho: el cajón es solo cosa del
 // estrecho. Cerrar un cajón a ≤ 920 px no borra ese deseo; si no, al ensanchar la ventana la
 // columna no volvería. En ancho, cerrar sí oculta la columna. Si la app oculta explícitamente
 // su nodo de detalles, cerrar también elimina la columna deseada desde estrecho.
 function cerrarDetalles(){
  if(cajon&&tipoCajon==='detalles')cerrarCajon();
  if(win.innerWidth>ESTRECHO||elementos.detalles?.hidden)cuerpo.classList.remove('con-detalles');
 }
 // El cajón de navegación (estrecho) y su columna (ancho) se abren y cierran igual que los
 // detalles: tras elegir una entrada en móvil la app lo cierra para ver el trabajo, y en
 // escritorio puede ofrecer su propio conmutador de columna («Vista → Catálogo»).
 function abrirNavegacion(){
  if(!elementos.navegacion)return;
  if(win.innerWidth<=ESTRECHO)abrirCajon(elementos.navegacion,{tituloCajon:'Navegación',izquierda:true,tipo:'navegacion',devolver:nodo=>nodoNav.append(nodo)});
  else cuerpo.classList.add('con-navegacion');
 }
 function cerrarNavegacion(){
  if(cajon&&tipoCajon==='navegacion')cerrarCajon();
  if(win.innerWidth>ESTRECHO)cuerpo.classList.remove('con-navegacion');
 }
 // Reducir la ventana no debe convertir una columna pasiva en un modal que interrumpa
 // el trabajo. Solo seguimos en un cajón cuando el foco está dentro de los detalles.
 // La preferencia de columna se conserva al ensanchar, también si el cajón no se abrió.
 let estrecho=win.innerWidth<=ESTRECHO;
 function adaptarPaneles(){
  const nuevo=win.innerWidth<=ESTRECHO;
  if(nuevo===estrecho)return;
  estrecho=nuevo;
  if(nuevo){
   if(!cajon&&!marco.closest('[inert]')&&cuerpo.classList.contains('con-detalles')&&elementos.detalles&&!elementos.detalles.hidden&&elementos.detalles.contains(doc.activeElement)){
    const antes=guardarSeleccion();
    abrirDetalles();
    restaurarSeleccion(antes);
   }
  }else if(cajon&&(tipoCajon==='detalles'||tipoCajon==='navegacion')){
   const tipo=tipoCajon,antes=guardarSeleccion();
   cerrarCajon();
   cuerpo.classList.add(tipo==='detalles'?'con-detalles':'con-navegacion');
   if(antes.foco?.isConnected&&visible(antes.foco))restaurarSeleccion(antes);
   else if(!visible(doc.activeElement))marca.focus({preventScroll:true});
  }
 }
 win.addEventListener('resize',adaptarPaneles);
 // Panel de ayuda de Mey (con config.ayuda): un cajón modal igual en escritorio y en estrecho.
 // La búsqueda toma el foco al abrir, no el primer enfocable del cajón.
 let panelAyuda=null;
 function abrirAyuda(){
  if(!config.ayuda)return;
  if(cajon&&tipoCajon==='ayuda')return;
  panelAyuda=crearAyudaMey(doc,{
   app,nombre,mascota:paseoMey?false:mey('hola'),
   cinta:config.ayuda.cinta||(()=>null),
   pasos:config.ayuda.pasos||[],
   extras:config.ayuda.extras||(()=>[]),
   cerrar:cerrarAyuda
  });
  abrirCajon(panelAyuda.nodo,{tituloCajon:'Mey',tipo:'ayuda',devolver:nodo=>nodo.remove(),onClose:()=>{panelAyuda.destruir();panelAyuda=null;}});
  panelAyuda.enfocarBusqueda();
 }
 function cerrarAyuda(){
  if(cajon&&tipoCajon==='ayuda')cerrarCajon();
 }
 abrirCajonNav.addEventListener('click',abrirNavegacion);

 function destruir(){
  if(!marco.parentNode)return;
  cerrarCajon();
  win.removeEventListener('resize',adaptarPaneles);
  if(barraAccion){win.removeEventListener('resize',sincronizarBarraAccion);vigiaAccion?.disconnect();devolverPrimaria();barraAccion.remove();}
  for(const vigia of vigias)vigia.despegar();
  controlMey?.detener();
  paseoMey?.detener();
  navSuite?.dispose?.();
  marca.removeEventListener('click',alPulsarMarca);
  // Restaurar de atrás hacia delante conserva la posición original entre hermanos.
  const antesDeDevolver=guardarSeleccion();
  for(const {nodo,padre,siguiente,indice} of [...movidos].sort((a,b)=>(b.indice??-1)-(a.indice??-1))){
   if(!nodo)continue;
   if(indice===null||!padre){nodo.remove();continue;}
   if(siguiente&&siguiente.parentNode===padre)padre.insertBefore(nodo,siguiente);
   else padre.append(nodo);
  }
  restaurarSeleccion(antesDeDevolver);
  if(appPrevia===null)raiz.removeAttribute('data-erlen-app');else raiz.setAttribute('data-erlen-app',appPrevia);
  marco.remove();
 }
 return {elemento:marco,abrirDetalles,cerrarDetalles,abrirNavegacion,cerrarNavegacion,abrirAyuda,cerrarAyuda,destruir};
}
