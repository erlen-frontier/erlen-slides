/* erlen-diseno 1.3.0 · generado por herramientas/diseno-sync.mjs --modo iife; no editar a mano */
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
const apps=[['slides','Slides'],['notes','Notes'],['pentagrama','Pentagrama'],['documents','Documents'],['spreadsheets','Spreadsheets'],['figures','Figures'],['ftir','FTIR Studio'],['doe','DoE']];
function mountSuiteNavigation(parent,current){
 if(!parent||!apps.some(([id])=>id===current))throw Error('Aplicación de la suite inválida.');
 // Standalone releases have no sibling apps. Do not create broken file/root links.
 if(!parent.ownerDocument.defaultView.location.pathname.startsWith('/'+current+'/'))return null;
 if(parent.querySelector('erlen-suite-nav'))return parent.querySelector('erlen-suite-nav');
 const doc=parent.ownerDocument,host=doc.createElement('erlen-suite-nav');
 const root=host.attachShadow({mode:'open'});
 root.innerHTML=`<style>:host{display:inline-block;font:14px/1.5 var(--erlen-font-ui,system-ui,sans-serif);color:var(--erlen-tinta,#243c32)}*{box-sizing:border-box}summary{cursor:pointer;min-height:40px;padding:9px 12px;border:1px solid var(--erlen-linea-fuerte,#c4d1bf);border-radius:6px;background:var(--erlen-superficie-2,#f7f9f3);list-style:none;font-weight:600}summary::-webkit-details-marker{display:none}summary::after{content:' ▾'}summary:focus-visible,a:focus-visible{outline:3px solid var(--erlen-foco,#94621e);outline-offset:3px}nav{display:none;position:fixed;z-index:2147483000;width:270px;max-width:calc(100vw - 24px);overflow:auto;background:var(--erlen-superficie,#fffefa);border:1px solid var(--erlen-linea-fuerte,#c4d1bf);box-shadow:var(--erlen-sombra-menu,0 10px 28px #183b3226);border-radius:9px;padding:12px}details[open] nav{display:block}a{display:block;padding:10px 12px;min-height:42px;color:var(--erlen-verde,#245b43);text-decoration:none;border-radius:5px}a:hover{background:var(--erlen-verde-suave,#e9f0e2)}a[aria-current]{font-weight:700;background:var(--erlen-verde-suave,#e9f0e2)}small{display:block;padding:8px 12px;font-size:12px;line-height:1.5;color:var(--erlen-tinta-suave,#53644d)}.home{border-bottom:1px solid var(--erlen-linea,#dbe2d8);border-radius:0;margin-bottom:5px}</style><details><summary aria-label="Cambiar de aplicación de Erlen">Suite</summary><nav aria-label="Aplicaciones Erlen"><a class="home" href="/" target="_blank" rel="noopener">Inicio de Erlen ↗</a>${apps.map(([id,label])=>`<a href="/${id}/" ${id===current?'aria-current="page"':'target="_blank" rel="noopener"'}>${label}${id===current?' · actual':' ↗'}</a>`).join('')}<small>Las otras apps se abren en otra pestaña. Tu trabajo sigue aquí.</small></nav></details>`;
 const details=root.querySelector('details'),summary=root.querySelector('summary'),nav=root.querySelector('nav');
 function position(){if(!details.open)return;const r=summary.getBoundingClientRect(),w=Math.min(270,doc.defaultView.innerWidth-24);nav.style.left=Math.max(12,Math.min(r.left,doc.defaultView.innerWidth-w-12))+'px';nav.style.top=Math.min(r.bottom+6,doc.defaultView.innerHeight-100)+'px';nav.style.maxHeight=Math.max(88,doc.defaultView.innerHeight-r.bottom-18)+'px';}
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
