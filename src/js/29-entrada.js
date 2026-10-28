/* ==== 29-entrada.js ==== */
'use strict';
/* ================= arrastrar y pegar =================
   Meter contenido sin pasar por ningún menú: sueltas el archivo sobre la
   diapositiva o pegas del portapapeles y se convierte en el bloque que toca. */

function nuevoBloqueEn(tipo, ajustes) {
  const sl = curSlide();
  const n = zonasDe(sl.layout);
  if (!n) { toast('Esta diapositiva no admite bloques; usa una de contenido'); return null; }
  const b = Object.assign(newBlock(tipo), ajustes || {});
  zona(sl, clamp((S.insCol || 1) - 1, 0, n - 1)).push(b);
  S.selBlock = b.id;
  return b;
}
const leeComoDataURL = f => new Promise(res => {
  const r = new FileReader(); r.onload = () => res(r.result); r.onerror = r.onabort = () => res(null);
  try { r.readAsDataURL(f); } catch (error) { res(null); }
});
const leeComoTexto = f => new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => res(null); r.readAsText(f); });

/* ¿El texto pegado parece una tabla de datos? */
function pareceTabla(txt) {
  const lineas = String(txt).split(/\r?\n/).filter(l => l.trim());
  if (lineas.length < 2) return false;
  const sep = /\t|;/.test(lineas[0]) || /,/.test(lineas[0]);
  if (!sep) return false;
  const t = parseTable(txt);
  return t.rows.length >= 2 && t.rows[0].length >= 2;
}
/* ¿Y a LaTeX? */
function pareceLatex(txt) {
  const t = String(txt).trim();
  return /\\(frac|sqrt|sum|int|alpha|beta|gamma|Delta|lambda|mathrm|text|left|right|begin)\b/.test(t) ||
    (/^\$\$?[\s\S]+\$\$?$/.test(t) && t.length < 400);
}
const pareceQuimica = txt => /\\ce\{/.test(txt) || /^[A-Z][a-z]?\d*([A-Z][a-z]?\d*|\s|\+|->|<->|\(|\)|\d)+$/.test(String(txt).trim()) && /\d/.test(txt) && txt.length < 120;

/* Convierte una tabla en bloque de gráfica si los datos son numéricos, o en
   tabla si no lo son. */
function bloqueDeDatos(txt, nombre) {
  const t = parseTable(txt);
  const numerico = t.rows.length >= 3 && t.rows.every(f => f.slice(1).every(v => typeof v === 'number' && isFinite(v)));
  if (numerico) {
    const det = detectaTecnica(txt, nombre);
    if (det) { const bi = bloqueInstrumento(txt, det, nombre); if (bi) { setTimeout(() => avisaInstrumento(det, bi), 500); return det.tec.n.toLowerCase(); } }
    const b = nuevoBloqueEn('chart', { kind: 'linea' });
    if (b) { b.data = txt; if (nombre && typeof marcaFuente === 'function') marcaFuente(b, nombre); return 'gráfica'; }
    return null;
  }
  const filas = String(txt).split(/\r?\n/).filter(l => l.trim())
    .map(l => l.split(/\t|;|,/).map(c => c.trim()));
  const nc = Math.max.apply(null, filas.map(f => f.length));
  filas.forEach(f => { while (f.length < nc) f.push(''); });
  const b = nuevoBloqueEn('table', { rows: filas.slice(0, 20), header: true });
  return b ? 'tabla' : null;
}

/* ---------- soltar archivos ---------- */
async function metArchivos(lista) {
  const archivos = Array.from(lista || []);
  if (!archivos.length) return;
  const deck = S.deck, slide = curSlide();
  /* Un lote de imágenes se prepara antes de tocar la presentación: cambiar
     de documento durante la lectura no deja una inserción a medias. */
  if (archivos.every(f => /^image\//.test(f.type))) {
    const leidos = await Promise.all(archivos.map(leeComoDataURL));
    if (S.deck !== deck || curSlide() !== slide) { toast('La diapositiva cambió; vuelve a insertar las imágenes.', 'warn'); return; }
    let n = 0;
    archivos.forEach((f, i) => {
      if (!leidos[i]) return;
      if (nuevoBloqueEn(f.type === 'image/gif' ? 'video' : 'image', {src:leidos[i], caption:''})) n++;
    });
    if (n) { commit(); toast(n === 1 ? 'Se insertó la imagen' : 'Se insertaron ' + n + ' elementos', null, {t:'Deshacer', fn:doUndo}); }
    if (leidos.some(x => !x)) toast('No se pudieron leer algunas imágenes.', 'warn');
    return;
  }
  let n = 0, aviso = '';
  for (const f of archivos) {
    if (/\.json$/i.test(f.name) || f.type === 'application/json') {
      const txt = await leeComoTexto(f);
      let bruto = null;
      try { bruto = JSON.parse(txt); } catch (e) { toast('Ese .json no se pudo leer', 'warn'); continue; }
      cargaSegura(bruto, null);
      return;
    }
    if (/^image\//.test(f.type)) {
      const uri = await leeComoDataURL(f);
      if (!uri) continue;
      if (S.deck !== deck || curSlide() !== slide) { toast('La diapositiva cambió; vuelve a insertar la imagen.', 'warn'); break; }
      if (f.type === 'image/gif') { nuevoBloqueEn('video', { src: uri, caption: '' }); aviso = 'GIF'; }
      else {
        nuevoBloqueEn('image', { src: uri, caption: '' });
        aviso = 'imagen';
      }
      n++; continue;
    }
    if (/^video\//.test(f.type)) {
      if (f.size > VID_MAX) { toast('El video pasa de 12 MB; comprímelo antes', 'warn'); continue; }
      const uri = await leeComoDataURL(f);
      if (uri) { nuevoBloqueEn('video', { src: uri }); n++; aviso = 'video'; }
      continue;
    }
    if (/\.(csv|tsv|txt|dat|xy|asc|uxd|dif|prn)$/i.test(f.name) || /^text\//.test(f.type)) {
      const txt = await leeComoTexto(f);
      if (!txt) continue;
      /* ¿Ya hay gráficas que salieron de un archivo con este nombre? Entonces
         es una medición nueva del mismo archivo: se ofrece actualizarlas. */
      if (typeof ofreceActualizarFuente === 'function' && await ofreceActualizarFuente(f.name, txt)) { n++; aviso = 'fuente conocida'; continue; }
      /* Si el archivo viene de un equipo, la gráfica sale ya rotulada. */
      const det = detectaTecnica(txt, f.name);
      if (det) {
        const b = bloqueInstrumento(txt, det, f.name);
        if (b) { n++; aviso = det.tec.n.toLowerCase(); setTimeout(() => avisaInstrumento(det, b), 500); continue; }
      }
      const q = bloqueDeDatos(txt, f.name);
      if (q) { n++; aviso = q; }
      continue;
    }
    toast('No sé qué hacer con «' + f.name + '»', 'warn');
  }
  if (n) {
    commit();
    toast(n === 1 ? 'Se insertó la ' + aviso : 'Se insertaron ' + n + ' elementos', null, { t: 'Deshacer', fn: doUndo });
  }
}

/* ---------- pegar ---------- */
async function pegaContenido(e) {
  const dt = e.clipboardData;
  if (!dt) return false;
  const img = Array.from(dt.items || []).find(x => x.kind === 'file' && /^image\//.test(x.type));
  if (img) {
    e.preventDefault();
    const f = img.getAsFile();
    if (!f) return true;
    const deck = S.deck, slide = curSlide(), uri = await leeComoDataURL(f);
    if (S.deck !== deck || curSlide() !== slide) { toast('La diapositiva cambió; vuelve a pegar la imagen.', 'warn'); return true; }
    if (uri) {
      if (nuevoBloqueEn('image', { src: uri, caption: '' })) { commit(); toast('Imagen pegada', null, { t: 'Deshacer', fn: doUndo }); }
    } else toast('No se pudo leer la imagen.', 'warn');
    return true;
  }
  const dentro = e.target && e.target.closest && e.target.closest('[data-edit], input, textarea, [contenteditable]');
  if (dentro) return false;                       /* dentro de un campo manda el pegado normal */
  const txt = dt.getData('text/plain');
  if (!txt || !txt.trim()) return false;
  e.preventDefault();
  let qué = null;
  if (pareceTabla(txt)) qué = bloqueDeDatos(txt);
  else if (pareceLatex(txt)) { nuevoBloqueEn('math', { tex: txt.replace(/^\$\$?|\$\$?$/g, '').trim() }); qué = 'ecuación'; }
  else if (pareceQuimica(txt)) { nuevoBloqueEn('chem', { tex: txt.replace(/\\ce\{|\}$/g, '').trim() }); qué = 'reacción'; }
  else {
    const lineas = txt.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const vinetas = lineas.length > 1 && lineas.every(l => /^[-*•·]\s+/.test(l));
    if (vinetas) { nuevoBloqueEn('bullets', { items: lineas.map(l => ({ t: l.replace(/^[-*•·]\s+/, ''), lvl: 0 })) }); qué = 'lista'; }
    else { nuevoBloqueEn('text', { text: txt.trim() }); qué = 'texto'; }
  }
  if (qué) { commit(); toast('Se pegó como ' + qué, null, { t: 'Deshacer', fn: doUndo }); }
  return true;
}

/* ---------- enganches ---------- */
function initEntrada() {
  const zona_ = $('.canvas-wrap') || $('#canvasScroll');
  let capa = null;
  const muestra = () => {
    if (capa) return;
    capa = h('div', { class: 'suelta-capa' }, h('div', { class: 'suelta-caja' },
      h('b', null, 'Suelta aquí'), h('span', null, 'imagen, video, GIF, .csv con datos o un proyecto .json')));
    zona_.append(capa);
  };
  const quita = () => { if (capa) { capa.remove(); capa = null; } };
  let dentro = 0;
  ['dragenter', 'dragover'].forEach(ev => zona_.addEventListener(ev, e => {
    if (dragBlk) return;
    if (!Array.from(e.dataTransfer.types || []).some(t => t === 'Files')) return;
    e.preventDefault(); e.dataTransfer.dropEffect = 'copy';
    if (ev === 'dragenter') dentro++;
    muestra();
  }));
  zona_.addEventListener('dragleave', e => { if (--dentro <= 0) { dentro = 0; quita(); } });
  zona_.addEventListener('drop', async e => {
    if (dragBlk) return;
    if (!e.dataTransfer.files || !e.dataTransfer.files.length) return;
    e.preventDefault(); dentro = 0; quita();
    await metArchivos(e.dataTransfer.files);
  });
  document.addEventListener('paste', e => {
    if (P.on || CL.on || $('#modalRoot').firstChild) return;
    pegaContenido(e);
  });
}


