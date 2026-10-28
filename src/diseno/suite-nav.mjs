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
// Fuente única del menú de suite: diseno/suite-nav.mjs (docs/DISENO-PAQUETE.md). Colores como var(--erlen-*, valor) de tokens.css; las custom properties atraviesan el shadow DOM.
import {erlenColor,estilosErlen} from './suite-color.mjs';
// Navegación explícita y preferencias locales de apariencia; sin transferencias ni peticiones.
const apps=[['slides','Slides'],['notes','Notes'],['lens','Lens'],['pentagrama','Pentagrama'],['documents','Documents'],['spreadsheets','Spreadsheets'],['figures','Figures'],['ftir','FTIR Studio'],['doe','DoE'],['xrd','XRD Studio'],['xps','XPS Studio'],['thermal','Thermal'],['methods','Methods'],['dft','DFT Studio'],['fem','FEM Studio'],['learn','Learn']];
const escapar=texto=>String(texto).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// Misma validación que usa el menú: sin ella, un catálogo embebido mal formado pasaría la lectura
// y luego haría fallar a mountSuiteNavigation en el arranque.
function entradaValida(item,vistos){
 return !!item&&typeof item.id==='string'&&/^[a-z][a-z0-9-]*$/.test(item.id)&&typeof item.label==='string'&&!!item.label&&typeof item.href==='string'&&!!item.href&&!vistos.has(item.id);
}
// Catálogo de despliegue embebido por el build (<script type="application/json" id="erlen-suite-catalog">):
// devuelve {items,home} o null si no está o no tiene esa forma — nunca lanza ni hace peticiones.
export function catalogoDe(doc){
 try{
  const texto=doc?.getElementById?.('erlen-suite-catalog')?.textContent;
  if(!texto)return null;
  const dato=JSON.parse(texto);
  if(!dato||!Array.isArray(dato.items)||!dato.items.length||!dato.home||typeof dato.home.href!=='string'||!dato.home.href)return null;
  const vistos=new Set();
  for(const item of dato.items){if(!entradaValida(item,vistos))return null;vistos.add(item.id);}
  return {items:dato.items.map(({id,label,href})=>({id,label,href})),home:{id:dato.home.id||'portal',label:dato.home.label||'Inicio de Erlen',href:dato.home.href}};
 }catch{return null;}
}
export function mountSuiteNavigation(parent,current,opciones={}){
 if(!parent)throw Error('Aplicación de la suite inválida.');
 // Catálogo explícito {items:[{id,label,href}],home:{href}} desde el build; sin él, la lista
 // histórica de la suite con rutas locales y la detección standalone de siempre.
 let entradas,home;
 if(opciones&&(opciones.items||opciones.home)){
  if(!Array.isArray(opciones.items)||!opciones.items.length||!opciones.home||typeof opciones.home.href!=='string')throw Error('Aplicación de la suite inválida.');
  const vistos=new Set();
  entradas=opciones.items.map(item=>{
   if(!item||typeof item.id!=='string'||!/^[a-z][a-z0-9-]*$/.test(item.id)||typeof item.label!=='string'||!item.label||typeof item.href!=='string'||!item.href||vistos.has(item.id))throw Error('Aplicación de la suite inválida.');
   vistos.add(item.id);return [item.id,item.label,item.href];
  });
  home={href:opciones.home.href,label:opciones.home.label||'Inicio de Erlen'};
 }else{
  entradas=apps.map(([id,label])=>[id,label,'/'+id+'/']);
  home={href:'/',label:'Inicio de Erlen'};
 }
 const actual=entradas.find(([id])=>id===current);
 if(!actual)throw Error('Aplicación de la suite inválida.');
 // Standalone releases have no sibling apps. Do not create broken file/root links.
 const absoluta=/^[a-z][a-z0-9+.-]*:/i.test(actual[2]);
 if(!absoluta&&!parent.ownerDocument.defaultView.location.pathname.startsWith(actual[2]))return null;
 if(parent.querySelector('erlen-suite-nav'))return parent.querySelector('erlen-suite-nav');
 const doc=parent.ownerDocument,host=doc.createElement('erlen-suite-nav');
 const root=host.attachShadow({mode:'open'});
 const salida='<svg class="salida" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10M7 17 17 7"/></svg>';
 const filas=Math.max(1,Math.ceil(entradas.length/2));
 const css=`
:host{display:inline-block;font:14px/1.5 var(--erlen-font-ui,system-ui,sans-serif);color:var(--erlen-tinta,#243c32)}
*{box-sizing:border-box}
summary{display:inline-flex;align-items:center;gap:8px;cursor:pointer;min-height:44px;padding:9px 14px 9px 16px;border:1px solid var(--erlen-vidrio-contorno,#c4d1bf);border-radius:var(--erlen-radio-capsula,7px);background:var(--erlen-superficie,#f7f9f3);box-shadow:inset 0 1px 0 var(--erlen-vidrio-borde,transparent),0 1px 2px var(--erlen-vidrio-contorno,transparent);list-style:none;font-weight:600}
summary:hover{border-color:var(--erlen-verde,#245b43)}
summary::-webkit-details-marker{display:none}
summary svg{width:16px;height:16px;transition:transform .18s ease}
details[open] summary svg{transform:rotate(180deg)}
summary:focus-visible,a:focus-visible{outline:3px solid var(--erlen-foco,#94621e);outline-offset:3px}
nav{display:none;position:fixed;z-index:2147483000;width:448px;max-width:calc(100vw - 24px);overflow:auto;background:var(--erlen-superficie,#fffefa);border:1px solid var(--erlen-vidrio-contorno,#c4d1bf);box-shadow:var(--erlen-vidrio-relieve,0 0 0 transparent),var(--erlen-sombra-menu,0 10px 28px #183b3226);border-radius:var(--erlen-radio-panel,18px);padding:12px}
details[open] nav{display:block}
a{display:flex;align-items:center;gap:8px;min-height:44px;padding:8px 12px;color:var(--erlen-verde,#245b43);text-decoration:none;border-radius:var(--erlen-radio-capsula,8px)}
a:hover,a:focus-visible{background:var(--erlen-verde-suave,#e9f0e2)}
a[aria-current]{font-weight:700;background:var(--erlen-verde-suave,#e9f0e2)}
.salida{width:16px;height:16px;flex:none;margin-left:auto}
.apps{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(${filas},auto);grid-auto-flow:column;gap:2px 8px}
.home{border-bottom:1px solid var(--erlen-linea,#dbe2d8);border-radius:0;margin-bottom:8px}
small{display:block;margin-top:8px;padding:8px 12px;border-top:1px solid var(--erlen-linea,#dbe2d8);font-size:12px;line-height:1.5;color:var(--erlen-tinta-suave,#53644d)}
.oculto{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.apariencia{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:8px;padding:12px;border-top:1px solid var(--erlen-linea,#dbe2d8)}
.apariencia label{display:grid;gap:4px;min-width:0;font-size:12px}
.apariencia .estilo{grid-column:1/-1}
.apariencia select,.apariencia button{width:100%;min-width:0;min-height:44px;padding:8px;border:1px solid var(--erlen-linea-fuerte,#c4d1bf);border-radius:var(--erlen-radio-campo,8px);background:var(--erlen-superficie,#fffefa);color:var(--erlen-tinta,#243c32);font:inherit}
.apariencia button{grid-column:1/-1;cursor:pointer;font-size:12px}
.apariencia button:disabled{cursor:default;opacity:.6}
.apariencia :focus-visible{outline:3px solid var(--erlen-foco,#94621e);outline-offset:2px}
@supports ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){nav{background:var(--erlen-vidrio-fuerte,color-mix(in srgb,var(--erlen-superficie,#fffefa) 94%,transparent));-webkit-backdrop-filter:var(--erlen-vidrio-filtro,blur(18px) saturate(115%));backdrop-filter:var(--erlen-vidrio-filtro,blur(18px) saturate(115%))}}
@media (prefers-reduced-transparency:reduce),(prefers-contrast:more),(forced-colors:active){nav{background:var(--erlen-superficie,#fffefa);-webkit-backdrop-filter:none;backdrop-filter:none}}
@media (max-width:540px){.apps{display:block}}
@media (prefers-reduced-motion:reduce){summary svg{transition:none}}
@media print{nav{display:none!important;-webkit-backdrop-filter:none;backdrop-filter:none;box-shadow:none}}
`;
 // Hoja construible: el CSSOM no cuenta como estilo inline y sigue funcionando bajo una CSP con
 // style-src 'self' (Lens y Learn); un <style> dentro del shadow root la incumpliría y el menú
 // saldría sin estilos. Sin hojas construibles (navegadores antiguos, jsdom) se usa el <style>.
 let hoja=null;
 try{const Hoja=doc.defaultView.CSSStyleSheet;if(Hoja&&'adoptedStyleSheets' in root){hoja=new Hoja();hoja.replaceSync(css);}}catch{hoja=null;}
 root.innerHTML=(hoja?'':`<style>${css}</style>`)+`<details><summary aria-label="Cambiar de aplicación de Erlen">Suite<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary><nav aria-label="Aplicaciones Erlen"><a class="home" href="${escapar(home.href)}" target="_blank" rel="noopener">${escapar(home.label)}${salida}<span class="oculto">(se abre en otra pestaña)</span></a><div class="apps">${entradas.map(([id,label,href])=>`<a href="${escapar(href)}" ${id===current?'aria-current="page"':'target="_blank" rel="noopener"'}>${escapar(label)}${id===current?' · actual':salida+'<span class="oculto">(se abre en otra pestaña)</span>'}</a>`).join('')}</div><small>Las otras apps se abren en otra pestaña. Tu trabajo sigue aquí.</small></nav></details>`;
 if(hoja)root.adoptedStyleSheets=[hoja];
 const details=root.querySelector('details'),summary=root.querySelector('summary'),nav=root.querySelector('nav');
 // En el menú existente: no se añade una barra o un botón a la interfaz de trabajo.
 const win=doc.defaultView,panel=doc.createElement('section');
 panel.className='apariencia';panel.setAttribute('aria-label','Apariencia');
 const elegir=(nombre,opciones,clase)=>{
  const etiqueta=doc.createElement('label');etiqueta.textContent=nombre;
  if(clase)etiqueta.className=clase;
  const select=doc.createElement('select');
  for(const [valor,texto] of opciones){const opcion=doc.createElement('option');opcion.value=valor;opcion.textContent=texto;select.append(opcion);}
  etiqueta.append(select);panel.append(etiqueta);return select;
 };
 const estilo=elegir('Estilo visual',estilosErlen.map(({id,nombre})=>[id,nombre]),'estilo');
 const color=elegir('Color de acento',[['verde','Jade'],['platino','Platino'],['azul','Hielo'],['violeta','Iris'],['cobre','Champagne']]);
 const tema=elegir('Luz',[['sistema','Según tu dispositivo'],['claro','Claro'],['oscuro','Oscuro']]);
 const restaurar=doc.createElement('button');restaurar.type='button';restaurar.textContent='Restaurar estilo original';panel.append(restaurar);nav.append(panel);
 const sincronizar=()=>{
  estilo.value=erlenColor.leerEstilo(win);color.value=erlenColor.leer(win);tema.value=erlenColor.leerTema(win)||'sistema';
  restaurar.disabled=estilo.value==='original';
 };
 estilo.addEventListener('change',()=>erlenColor.guardarEstilo(win,estilo.value));
 color.addEventListener('change',()=>erlenColor.guardar(win,color.value));
 tema.addEventListener('change',()=>erlenColor.guardarTema(win,tema.value));
 restaurar.addEventListener('click',()=>{erlenColor.guardarEstilo(win,'original');estilo.focus();});
 const eventos=['erlen-estilo','erlen-color','erlen-tema'];
 for(const evento of eventos)win.addEventListener(evento,sincronizar);
 erlenColor.aplicarEstilo(win);sincronizar();
 function position(){if(!details.open)return;const r=summary.getBoundingClientRect(),w=Math.min(448,doc.defaultView.innerWidth-24);nav.style.left=Math.max(12,Math.min(r.right-w,doc.defaultView.innerWidth-w-12))+'px';nav.style.top=Math.min(r.bottom+6,doc.defaultView.innerHeight-100)+'px';nav.style.maxHeight=Math.max(88,doc.defaultView.innerHeight-r.bottom-18)+'px';}
 details.addEventListener('toggle',position);
 root.addEventListener('keydown',e=>{if(e.key==='Escape'&&details.open){details.open=false;summary.focus();}});
 root.querySelector('[aria-current]').addEventListener('click',e=>{e.preventDefault();details.open=false;summary.focus();});
 const outside=e=>{if(!e.composedPath().includes(host))details.open=false;};
 const onScroll=()=>{if(!details.open)return;const r=summary.getBoundingClientRect();if(r.bottom<0||r.top>doc.defaultView.innerHeight)details.open=false;else position();};
 doc.addEventListener('pointerdown',outside);doc.defaultView.addEventListener('resize',position);doc.defaultView.addEventListener('scroll',onScroll,{passive:true});
 host.dispose=()=>{for(const evento of eventos)win.removeEventListener(evento,sincronizar);doc.removeEventListener('pointerdown',outside);doc.defaultView.removeEventListener('resize',position);doc.defaultView.removeEventListener('scroll',onScroll);host.remove();};
 parent.append(host);return host;
}
// Los IIFE devuelven solo mountSuiteNavigation: el lector de catálogo viaja como propiedad.
mountSuiteNavigation.catalogoDe=catalogoDe;
