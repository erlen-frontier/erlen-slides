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

/* El texto sigue siendo una cadena JSON v1. Los rangos opcionales usan los
   mismos offsets UTF-16 que Selection y conservan las anulaciones explícitas,
   incluso si coinciden con el bloque. No contienen HTML ni alteran la fuente. */
const cortaParejaTexto = (texto, i) => i > 0 && i < texto.length && /[\uD800-\uDBFF]/.test(texto[i - 1]) && /[\uDC00-\uDFFF]/.test(texto[i]);
function rangosFormatoTexto(b) {
  const texto = String(b.text == null ? '' : b.text), rangos = [];
  if (!Array.isArray(b.formatoTexto)) return rangos;
  let fin = 0;
  for (const r of b.formatoTexto) {
    if (!r || !Number.isSafeInteger(r.inicio) || !Number.isSafeInteger(r.fin) || r.inicio < fin ||
        r.inicio >= r.fin || r.fin > texto.length ||
        (typeof r.negrita !== 'boolean' && typeof r.cursiva !== 'boolean')) continue;
    /* No dividir la pareja UTF-16 de un carácter suplementario. */
    if (cortaParejaTexto(texto, r.inicio) || cortaParejaTexto(texto, r.fin)) continue;
    const limpio = {inicio:r.inicio, fin:r.fin};
    if (typeof r.negrita === 'boolean') limpio.negrita = r.negrita;
    if (typeof r.cursiva === 'boolean') limpio.cursiva = r.cursiva;
    rangos.push(limpio); fin = r.fin;
  }
  return rangos;
}
function partesFormatoTexto(b, inicio = 0, fin = String(b.text == null ? '' : b.text).length) {
  const largo = String(b.text == null ? '' : b.text).length, partes = [];
  inicio = clamp(inicio, 0, largo); fin = clamp(fin, inicio, largo);
  const base = {negrita:b.negrita === true, cursiva:b.cursiva === true};
  let p = inicio;
  const agrega = (a, z, r) => {
    if (a < z) partes.push({inicio:a, fin:z, negrita:r?.negrita ?? base.negrita, cursiva:r?.cursiva ?? base.cursiva,
      negritaExplicita:typeof r?.negrita === 'boolean', cursivaExplicita:typeof r?.cursiva === 'boolean'});
  };
  for (const r of rangosFormatoTexto(b)) {
    if (r.fin <= inicio) continue;
    if (r.inicio >= fin) break;
    agrega(p, Math.min(r.inicio, fin), null);
    agrega(Math.max(p, r.inicio), Math.min(r.fin, fin), r);
    p = Math.min(r.fin, fin);
  }
  agrega(p, fin, null);
  return partes;
}
function guardaPartesFormatoTexto(b, partes) {
  const rangos = [];
  for (const p of partes) {
    if (p.inicio >= p.fin) continue;
    const r = {inicio:p.inicio, fin:p.fin};
    if (p.negritaExplicita || p.negrita !== (b.negrita === true)) r.negrita = p.negrita;
    if (p.cursivaExplicita || p.cursiva !== (b.cursiva === true)) r.cursiva = p.cursiva;
    if (r.negrita == null && r.cursiva == null) continue;
    const anterior = rangos[rangos.length - 1];
    if (anterior && anterior.fin === r.inicio && anterior.negrita === r.negrita && anterior.cursiva === r.cursiva) anterior.fin = r.fin;
    else rangos.push(r);
  }
  if (rangos.length) b.formatoTexto = rangos; else delete b.formatoTexto;
}
function cambiaFormatoTexto(b, inicio, fin, campo, valor) {
  const partes = partesFormatoTexto(b), nuevas = [];
  for (const p of partes) {
    const cortes = [p.inicio, Math.max(p.inicio, Math.min(p.fin, inicio)), Math.max(p.inicio, Math.min(p.fin, fin)), p.fin];
    for (let i = 0; i < cortes.length - 1; i++) {
      if (cortes[i] === cortes[i + 1]) continue;
      const trozo = {...p, inicio:cortes[i], fin:cortes[i + 1]};
      if (trozo.inicio >= inicio && trozo.fin <= fin) { trozo[campo] = valor; trozo[campo + 'Explicita'] = false; }
      nuevas.push(trozo);
    }
  }
  guardaPartesFormatoTexto(b, nuevas);
}
/* Reemplaza un intervalo manteniendo los estilos a ambos lados; lo insertado
   hereda el primer carácter sustituido o el carácter anterior al cursor. */
function reemplazaTextoFormateado(b, inicio, fin, insercion) {
  const texto = String(b.text == null ? '' : b.text), partes = partesFormatoTexto(b), nuevas = [];
  inicio = clamp(inicio, 0, texto.length); fin = clamp(fin, inicio, texto.length);
  insercion = String(insercion);
  const posicion = inicio < fin ? inicio : Math.max(0, inicio - 1);
  const heredada = partes.find(p => p.inicio <= posicion && posicion < p.fin) || {negrita:b.negrita === true, cursiva:b.cursiva === true};
  for (const p of partes) if (p.inicio < inicio) nuevas.push({...p, fin:Math.min(p.fin, inicio)});
  if (insercion.length) nuevas.push({...heredada, inicio, fin:inicio + insercion.length});
  const delta = insercion.length - (fin - inicio);
  for (const p of partes) if (p.fin > fin) nuevas.push({...p, inicio:Math.max(p.inicio, fin) + delta, fin:p.fin + delta});
  b.text = texto.slice(0, inicio) + insercion + texto.slice(fin);
  guardaPartesFormatoTexto(b, nuevas);
}
function cambiaTextoFormateado(b, texto) {
  const anterior = String(b.text == null ? '' : b.text), nuevo = String(texto);
  if (anterior === nuevo) return;
  let a = 0, z = anterior.length, n = nuevo.length;
  while (a < z && a < n && anterior[a] === nuevo[a]) a++;
  while (z > a && n > a && anterior[z - 1] === nuevo[n - 1]) { z--; n--; }
  if (cortaParejaTexto(anterior, a) || cortaParejaTexto(nuevo, a)) a--;
  if (cortaParejaTexto(anterior, z) || cortaParejaTexto(nuevo, n)) { z++; n++; }
  reemplazaTextoFormateado(b, a, z, nuevo.slice(a, n));
}

/* Solo se permite una frontera si el render de ambos lados reproduce el del
   texto completo. Así el propio analizador protege fórmulas, citas, glosas y
   notación, sin duplicar sus reglas. Un token indivisible usa el estilo de su
   primer carácter; la selección exacta permanece en el modelo. */
function segmentosFormatoTexto(b, inicio = 0, fin = String(b.text == null ? '' : b.text).length) {
  const texto = String(b.text == null ? '' : b.text), partes = partesFormatoTexto(b), out = [];
  inicio = clamp(inicio, 0, texto.length); fin = clamp(fin, inicio, texto.length);
  const agrega = (a, z, estilo) => {
    a = Math.max(a, inicio); z = Math.min(z, fin);
    if (a >= z) return;
    /* Reunir dos fragmentos con el mismo estilo puede cambiar la notación
       que cada uno produjo por separado, aunque la frontera fuera segura. */
    out.push({inicio:a, fin:z, negrita:estilo.negrita, cursiva:estilo.cursiva});
  };
  const estiloEn = p => partes.find(x => x.inicio <= p && x.fin > p);
  let lineaInicio = 0;
  for (const linea of texto.split('\n')) {
    const lineaFin = lineaInicio + linea.length, t = linea.trim();
    let actual = lineaInicio;
    const display = t.length > 4 && t.startsWith('$$') && t.endsWith('$$');
    for (const p of partes) {
      if (p.inicio <= actual || p.inicio >= lineaFin) continue;
      let corte = p.inicio;
      if (display) corte = lineaFin;
      else {
        const entero = inlineRich(texto.slice(actual, lineaFin));
        let intentos = 0;
        while (corte < lineaFin && (cortaParejaTexto(texto, corte) ||
          inlineRich(texto.slice(actual, corte)) + inlineRich(texto.slice(corte, lineaFin)) !== entero)) {
          corte++;
          /* Una fórmula enorme no debe congelar la interfaz. */
          if (++intentos >= 128) { corte = lineaFin; break; }
        }
      }
      const estilo = estiloEn(actual); if (estilo) agrega(actual, corte, estilo);
      actual = corte;
    }
    const estilo = estiloEn(actual); if (estilo) agrega(actual, lineaFin, estilo);
    const salto = estiloEn(lineaFin); if (salto && lineaFin < texto.length) agrega(lineaFin, lineaFin + 1, salto);
    lineaInicio = lineaFin + 1;
  }
  return out;
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

function blockRichFormato(b) {
  if (!rangosFormatoTexto(b).length) return blockRich(b.text);
  const texto = String(b.text == null ? '' : b.text), segmentos = segmentosFormatoTexto(b), out = [];
  let inicio = 0, para = [];
  const flush = () => { if (para.length) { out.push('<p>' + para.join('<br>') + '</p>'); para = []; } };
  const cssDe = s => {
    const css = [];
    if (s.negrita !== (b.negrita === true)) css.push('font-weight:' + (s.negrita ? 'var(--speso-b,700)' : 'normal'));
    if (s.cursiva !== (b.cursiva === true)) css.push('font-style:' + (s.cursiva ? 'italic' : 'normal'));
    return css.join(';');
  };
  for (const linea of texto.split('\n')) {
    const fin = inicio + linea.length, t = linea.trim();
    if (t.length > 4 && t.startsWith('$$') && t.endsWith('$$')) {
      flush();
      const estilo = segmentos.find(s => s.inicio <= inicio + linea.indexOf('$$') && s.fin > inicio + linea.indexOf('$$'));
      const css = estilo ? cssDe(estilo) : '';
      out.push('<div' + (css ? ' style="' + css + '"' : '') + '>' + kStr(t.slice(2, -2), true) + '</div>');
    } else if (!t) flush();
    else {
      const html = segmentos.filter(s => s.inicio < fin && s.fin > inicio).map(s => {
        const fragmento = texto.slice(Math.max(inicio, s.inicio), Math.min(fin, s.fin));
        const css = cssDe(s), contenido = inlineRich(fragmento);
        return css ? '<span style="' + css + '">' + contenido + '</span>' : contenido;
      }).join('');
      para.push(html);
    }
    inicio = fin + 1;
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
