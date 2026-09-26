/* erlen-diseno 1.8.0 · generado por herramientas/diseno-sync.mjs --modo iife; no editar a mano */
const erlenSuiteNavigation=(()=>{
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
// Explicit navigation only: no storage access, transfers or background requests.
const apps=[['slides','Slides'],['notes','Notes'],['lens','Lens'],['pentagrama','Pentagrama'],['documents','Documents'],['spreadsheets','Spreadsheets'],['figures','Figures'],['ftir','FTIR Studio'],['doe','DoE'],['xrd','XRD Studio'],['methods','Methods'],['dft','DFT Studio'],['learn','Learn']];
function mountSuiteNavigation(parent,current){
 if(!parent||!apps.some(([id])=>id===current))throw Error('Aplicación de la suite inválida.');
 // Standalone releases have no sibling apps. Do not create broken file/root links.
 if(!parent.ownerDocument.defaultView.location.pathname.startsWith('/'+current+'/'))return null;
 if(parent.querySelector('erlen-suite-nav'))return parent.querySelector('erlen-suite-nav');
 const doc=parent.ownerDocument,host=doc.createElement('erlen-suite-nav');
 const root=host.attachShadow({mode:'open'});
 const salida='<svg class="salida" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10M7 17 17 7"/></svg>';
 root.innerHTML=`<style>
:host{display:inline-block;font:14px/1.5 var(--erlen-font-ui,system-ui,sans-serif);color:var(--erlen-tinta,#243c32)}
*{box-sizing:border-box}
summary{display:inline-flex;align-items:center;gap:8px;cursor:pointer;min-height:44px;padding:9px 12px;border:1px solid var(--erlen-linea-fuerte,#c4d1bf);border-radius:var(--erlen-radio-campo,7px);background:var(--erlen-superficie-2,#f7f9f3);list-style:none;font-weight:600}
summary::-webkit-details-marker{display:none}
summary svg{width:16px;height:16px;transition:transform .18s ease}
details[open] summary svg{transform:rotate(180deg)}
summary:focus-visible,a:focus-visible{outline:3px solid var(--erlen-foco,#94621e);outline-offset:3px}
nav{display:none;position:fixed;z-index:2147483000;width:448px;max-width:calc(100vw - 24px);overflow:auto;background:var(--erlen-superficie,#fffefa);border:1px solid var(--erlen-linea-fuerte,#c4d1bf);box-shadow:var(--erlen-sombra-menu,0 10px 28px #183b3226);border-radius:var(--erlen-radio-panel,18px);padding:12px}
details[open] nav{display:block}
a{display:flex;align-items:center;gap:8px;min-height:44px;padding:8px 12px;color:var(--erlen-verde,#245b43);text-decoration:none;border-radius:var(--erlen-radio-pequeno,8px)}
a:hover,a:focus-visible{background:var(--erlen-verde-suave,#e9f0e2)}
a[aria-current]{font-weight:700;background:var(--erlen-verde-suave,#e9f0e2)}
.salida{width:16px;height:16px;flex:none;margin-left:auto}
.apps{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(7,auto);grid-auto-flow:column;gap:2px 8px}
.home{border-bottom:1px solid var(--erlen-linea,#dbe2d8);border-radius:0;margin-bottom:8px}
small{display:block;margin-top:8px;padding:8px 12px;border-top:1px solid var(--erlen-linea,#dbe2d8);font-size:12px;line-height:1.5;color:var(--erlen-tinta-suave,#53644d)}
.oculto{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@supports ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){nav{background:color-mix(in srgb,var(--erlen-superficie,#fffefa) 88%,transparent);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px)}}
@media (prefers-reduced-transparency:reduce),(prefers-contrast:more),(forced-colors:active){nav{background:var(--erlen-superficie,#fffefa);-webkit-backdrop-filter:none;backdrop-filter:none}}
@media (max-width:540px){.apps{display:block}}
@media (prefers-reduced-motion:reduce){summary svg{transition:none}}
@media print{nav{display:none!important;-webkit-backdrop-filter:none;backdrop-filter:none;box-shadow:none}}
</style><details><summary aria-label="Cambiar de aplicación de Erlen">Suite<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary><nav aria-label="Aplicaciones Erlen"><a class="home" href="/" target="_blank" rel="noopener">Inicio de Erlen${salida}<span class="oculto">(se abre en otra pestaña)</span></a><div class="apps">${apps.map(([id,label])=>`<a href="/${id}/" ${id===current?'aria-current="page"':'target="_blank" rel="noopener"'}>${label}${id===current?' · actual':salida+'<span class="oculto">(se abre en otra pestaña)</span>'}</a>`).join('')}</div><small>Las otras apps se abren en otra pestaña. Tu trabajo sigue aquí.</small></nav></details>`;
 const details=root.querySelector('details'),summary=root.querySelector('summary'),nav=root.querySelector('nav');
 function position(){if(!details.open)return;const r=summary.getBoundingClientRect(),w=Math.min(448,doc.defaultView.innerWidth-24);nav.style.left=Math.max(12,Math.min(r.right-w,doc.defaultView.innerWidth-w-12))+'px';nav.style.top=Math.min(r.bottom+6,doc.defaultView.innerHeight-100)+'px';nav.style.maxHeight=Math.max(88,doc.defaultView.innerHeight-r.bottom-18)+'px';}
 details.addEventListener('toggle',position);
 root.addEventListener('keydown',e=>{if(e.key==='Escape'&&details.open){details.open=false;summary.focus();}});
 root.querySelector('[aria-current]').addEventListener('click',e=>{e.preventDefault();details.open=false;summary.focus();});
 const outside=e=>{if(!e.composedPath().includes(host))details.open=false;};
 const onScroll=()=>{if(!details.open)return;const r=summary.getBoundingClientRect();if(r.bottom<0||r.top>doc.defaultView.innerHeight)details.open=false;else position();};
 doc.addEventListener('pointerdown',outside);doc.defaultView.addEventListener('resize',position);doc.defaultView.addEventListener('scroll',onScroll,{passive:true});
 host.dispose=()=>{doc.removeEventListener('pointerdown',outside);doc.defaultView.removeEventListener('resize',position);doc.defaultView.removeEventListener('scroll',onScroll);host.remove();};
 parent.append(host);return host;
}

return mountSuiteNavigation;})();
