/* ==== 01-util.js ==== */
'use strict';
/* ================= utilidades ================= */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
let _uid = Date.now() % 1e7;
const uid = () => 'b' + (_uid++).toString(36) + Math.floor(Math.random() * 46656).toString(36);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const deb = (fn, ms) => { let t; const f = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; f.now = (...a)=>{clearTimeout(t); fn(...a);}; return f; };
const deepCopy = o => JSON.parse(JSON.stringify(o));

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat(9)) {
    if (k == null || k === false) continue;
    el.append(k.nodeType ? k : document.createTextNode(k));
  }
  return el;
}

/* Paneles y repintados locales: conservar el recorrido de teclado. */
const PANEL_FOCOS = new WeakMap();
function panelMuestra(panel,clase){
 if(!panel)return;let estado=PANEL_FOCOS.get(panel);
 if(!estado){estado={clase,volver:null};PANEL_FOCOS.set(panel,estado);panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();panelOculta(panel,estado.clase);}});}
 estado.clase=clase;const foco=document.activeElement;
 if(foco&&foco!==document.body&&!panel.contains(foco))estado.volver=foco;
 panel.classList.remove(clase);
}
function panelOculta(panel,clase){
 if(!panel)return;panel.classList.add(clase);const previo=PANEL_FOCOS.get(panel)?.volver;
 const destino=previo&&document.contains(previo)&&!previo.disabled?previo:null;
 destino?.focus({preventScroll:true});
}
function conFocoConservado(pinta,root){
 const foco=document.activeElement,dentro=foco&&root?.contains(foco),tag=foco?.tagName;
 const key=dentro&&(foco.getAttribute('data-foco')||foco.id||foco.getAttribute('aria-label'));
 const atributo=dentro&&(foco.hasAttribute('data-foco')?'data-foco':foco.id?'id':'aria-label');
 const inicio=dentro?foco.selectionStart:null,fin=dentro?foco.selectionEnd:null;
 const resultado=pinta();
 if(key&&!document.contains(foco)){
  const destino=Array.from(root.querySelectorAll('['+atributo+']')).find(e=>e.tagName===tag&&e.getAttribute(atributo)===key);
  if(destino&&!destino.disabled){destino.focus({preventScroll:true});if(inicio!==null&&typeof destino.setSelectionRange==='function')try{destino.setSelectionRange(inicio,fin);}catch{}}
 }
 return resultado;
}

/* Aviso breve. Con `accion` aparece un botón dentro del aviso —«Deshacer»—
   para que nada destructivo ocurra sin salida a la vista. */
function toast(msg, kind, accion) {
  const t = h('div', { class: 'toast' + (kind ? ' ' + kind : '') }, h('span', null, msg));
  let vivo = true;
  const cerrar = () => { if (!vivo) return; vivo = false; t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 320); };
  if (accion) {
    t.classList.add('con-accion');
    t.append(h('button', { class: 'toast-btn', onclick: () => { cerrar(); accion.fn(); } }, accion.t || 'Deshacer'));
  }
  $('#toasts').append(t);
  setTimeout(cerrar, accion ? 6500 : 2600);
  return t;
}

/* ---------- KaTeX ---------- */
const KOPT = { throwOnError: false, strict: false, trust: false, errorColor: '#C0392B' };
function kRenderTo(el, tex, display) {
  try { katex.render(tex, el, Object.assign({ displayMode: !!display }, KOPT)); }
  catch (e) { el.innerHTML = ''; el.append(h('span', { class: 'math-err' }, tex)); }
}
function kStr(tex, display) {
  try { return katex.renderToString(tex, Object.assign({ displayMode: !!display }, KOPT)); }
  catch (e) { return '<span class="math-err">' + esc(tex) + '</span>'; }
}
/* Texto con matemáticas en línea: segmenta $...$ (\$ = literal). */
function inlineRich(text) {
  const out = [];
  let s = String(text == null ? '' : text), buf = '', i = 0, inM = false;
  while (i < s.length) {
    const c = s[i];
    if (c === '\\' && s[i + 1] === '$') { buf += '$'; i += 2; continue; }
    if (c === '$') {
      if (inM) out.push({ m: buf }); else if (buf) out.push({ t: buf });
      buf = ''; inM = !inM; i++; continue;
    }
    buf += c; i++;
  }
  if (buf) out.push(inM ? { t: '$' + buf } : { t: buf });
  const html = out.map(seg => seg.m != null ? kStr(seg.m, false)
    : esc(typeof conNotacion === 'function' ? conNotacion(seg.t) : seg.t).replace(/\n/g, '<br>')).join('');
  /* Las marcas de cita ([@clave]) pasan intactas por esc(): se resuelven aquí,
     ya con el número que les toca en este momento. */
  const conCitas = typeof resuelveCitas === 'function' ? resuelveCitas(html, 'html') : html;
  return typeof glosasEnHtml === 'function' ? glosasEnHtml(conCitas) : conCitas;
}
/* Texto por párrafos; una línea que empieza y termina con $$ se vuelve ecuación centrada. */
function blockRich(text) {
  const lines = String(text == null ? '' : text).split('\n');
  const out = []; let para = [];
  const flush = () => { if (para.length) { out.push('<p>' + para.map(inlineRich).join('<br>') + '</p>'); para = []; } };
  for (const ln of lines) {
    const t = ln.trim();
    if (t.length > 4 && t.startsWith('$$') && t.endsWith('$$')) { flush(); out.push('<div>' + kStr(t.slice(2, -2), true) + '</div>'); }
    else if (t === '') flush();
    else para.push(ln);
  }
  flush();
  return out.join('') || '<p></p>';
}

const fmtWhen = ts => new Date(ts).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

/* Inserta texto en un textarea/input en la posición del cursor. */
function insertAtCursor(ta, text, selOffset) {
  const a = ta.selectionStart == null ? ta.value.length : ta.selectionStart;
  const b = ta.selectionEnd == null ? a : ta.selectionEnd;
  ta.value = ta.value.slice(0, a) + text + ta.value.slice(b);
  const p = a + (selOffset != null ? selOffset : text.length);
  ta.focus(); ta.setSelectionRange(p, p);
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

async function copyText(txt) {
  try { await navigator.clipboard.writeText(txt); return true; }
  catch (e) {
    try {
      const ta = h('textarea', { style: 'position:fixed;left:-9999px' }, txt);
      document.body.append(ta); ta.select();
      const ok = document.execCommand('copy'); ta.remove(); return ok;
    } catch (e2) { return false; }
  }
}


