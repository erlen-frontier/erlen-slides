/* ==== 68-figuras-vivas.js ==== */
'use strict';
/* ================= figuras vivas =================
   Cuatro cosas que convierten una gráfica pegada en una vista de tus datos:
     · capas: la figura se construye al ritmo del argumento (ejes → datos → ajuste → el punto que importa);
     · antes / después: dos estados de la misma figura, y el público ve qué se movió;
     · procedencia: de qué archivo salió, cuándo y con qué huella, y se actualiza si el archivo cambia;
     · paquete reproducible: datos + pgfplots + PNG, para que cualquiera la regenere. */

/* ---------- capas: qué dice cada una ---------- */
function nombresCapas(b) {
  if (!b || !b.capas) return [];
  const series = chartSeries(b).filter(s => s.pts.length);
  const out = series.map(s => mathToUnicode(s.name));
  if ((b.kind || 'linea') === 'ajuste' && b.type !== 'func') out.push('el ajuste');
  if (b.destaca && series[b.destaca.serie]) out.push('lo que importa' + (b.destaca.txt ? ': ' + b.destaca.txt : ''));
  return out;
}
/* Lo que se dice en cada capa, para la vista de presentador. */
function notaCapa(b, k) { return (Array.isArray(b.capasTxt) && b.capasTxt[k]) || ''; }

/* ---------- antes / después ---------- */
/* Interpola dos tablas con las mismas columnas; si no coinciden en tamaño,
   se anima lo que se pueda y el resto aparece al final. */
function lerpTabla(a, b, t) {
  const A = parseTable(a), B = parseTable(b);
  const nA = A.rows.length, nB = B.rows.length, n = Math.max(nA, nB);
  const ncol = Math.max(A.headers.length, B.headers.length);
  const filas = [];
  for (let i = 0; i < n; i++) {
    const ra = A.rows[Math.min(i, nA - 1)] || [], rb = B.rows[Math.min(i, nB - 1)] || [];
    const f = [];
    for (let j = 0; j < ncol; j++) {
      const va = +ra[j], vb = +rb[j];
      f.push(isFinite(va) && isFinite(vb) ? va + (vb - va) * t : (isFinite(vb) ? vb : va));
    }
    filas.push(f);
  }
  return [B.headers.length >= A.headers.length ? B.headers : A.headers].concat(filas).map(r => r.join('\t')).join('\n');
}
const suaviza = t => t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
/* Anima la gráfica del holder desde A hasta B, redibujando fotogramas. */
function animaHaciaDespues(b, deck, mode, avail, holder, alTerminar) {
  const A = b.data, B = b.despues.data;
  const dur = 750, t0 = performance.now();
  const paso = () => {
    const t = Math.min(1, (performance.now() - t0) / dur);
    const clone = Object.assign({}, b, { data: lerpTabla(A, B, suaviza(t)) });
    const svg = renderChart(clone, deck, mode === 'present' ? 'export' : mode, avail);
    const viejo = holder.querySelector('svg.chart-morph');
    svg.classList.add('chart-morph');
    if (viejo) viejo.replaceWith(svg); else holder.append(svg);
    if (t < 1) requestAnimationFrame(paso); else if (alTerminar) alTerminar();
  };
  paso();
}
/* Devuelve cuántos pasos consume (uno). */
function renderDespues(b, deck, mode, avail, holder, fragN, stepShown, edit) {
  const d = b.despues;
  if (!d) return 0;
  const esImagen = b.type === 'image';
  if (esImagen && !d.src) return 0;
  if (!esImagen && !d.data) return 0;
  const capa = h('div', { class: 'despues-capa' });
  holder.classList.add('con-despues');
  if (esImagen) capa.append(h('img', { src: d.src, alt: b.alt || b.caption || 'Después' }));
  else capa.append(renderChart(Object.assign({}, b, { data: d.data, capas: false }), deck, mode === 'present' ? 'export' : mode, avail));
  if (mode === 'present') {
    capa.classList.add('frag', 'an-fade');
    capa.dataset.frag = fragN;
    if (fragN < stepShown) capa.classList.add('on');
    /* Cuando el paso llega, la gráfica se mueve de A a B en vez de aparecer de golpe. */
    if (!esImagen) {
      const mo = new MutationObserver(() => {
        if (capa.classList.contains('on') && !capa.dataset.animada) {
          capa.dataset.animada = '1';
          capa.style.opacity = '0';
          animaHaciaDespues(b, deck, mode, avail, holder, () => { capa.style.opacity = ''; const m = holder.querySelector('svg.chart-morph'); if (m) m.remove(); });
        }
      });
      mo.observe(capa, { attributes: true, attributeFilter: ['class'] });
    }
  } else if (edit) {
    capa.classList.add('despues-borde');
    capa.append(h('span', { class: 'despues-rot' }, 'después · paso ' + (fragN + 1)));
    capa.style.opacity = '0';
    holder.addEventListener('mouseenter', () => { capa.style.opacity = '1'; });
    holder.addEventListener('mouseleave', () => { capa.style.opacity = '0'; });
  } else capa.style.display = 'none';
  holder.append(capa);
  return 1;
}
/* Vista previa del cambio en el editor. */
function pruebaDespues(b) {
  const holder = $('#stageInner .blk[data-bid="' + b.id + '"] .chart-holder');
  if (!holder || b.type !== 'chart') { toast('Ponte en la diapositiva de la gráfica'); return; }
  const [W] = slideDims(S.deck);
  animaHaciaDespues(b, S.deck, 'edit', W * ((b.w || 78) / 100), holder, () => setTimeout(() => { const m = holder.querySelector('svg.chart-morph'); if (m) m.remove(); }, 900));
}

/* ---------- procedencia ---------- */
async function huellaDe(txt) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(txt || '')));
    return Array.from(new Uint8Array(buf)).slice(0, 5).map(x => x.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    let hsh = 0; for (const c of String(txt || '')) hsh = (hsh * 31 + c.charCodeAt(0)) >>> 0;
    return hsh.toString(16);
  }
}
async function marcaFuente(b, nombre, extra) {
  const { rows } = parseTable(b.data || '');
  b.fuente = Object.assign({ nombre: nombre || 'pegado', cuando: new Date().toISOString().slice(0, 10),
    n: rows.length, huella: await huellaDe(b.data || '') }, extra || {});
  return b.fuente;
}
function selloFuente(b) {
  const f = b.fuente;
  return h('div', { class: 'sello-fuente' }, 'datos: ' + f.nombre + ' · ' + f.cuando + ' · n=' + f.n + ' · ' + f.huella);
}
function selloFuenteTex(b, p) {
  const f = b.fuente;
  return p + '\\par\\vspace{1pt}{\\centering\\tiny\\color{gray} datos: ' + texEscape(f.nombre + ' · ' + f.cuando + ' · n=' + f.n + ' · ' + f.huella) + '\\par}';
}
/* Las gráficas de la charla que salieron del mismo archivo. */
function graficasDeFuente(nombre, deck) {
  const out = [];
  (deck || S.deck).slides.forEach((sl, i) => zonas(sl).flat().forEach(b => {
    if (b.type === 'chart' && b.fuente && b.fuente.nombre === nombre) out.push({ b, i });
  }));
  return out;
}
/* Llegó un archivo con el mismo nombre que uno ya usado: se ofrece actualizar
   todas las gráficas que salieron de él. Es la figura como vista de los datos. */
async function ofreceActualizarFuente(nombre, texto) {
  const usan = graficasDeFuente(nombre);
  if (!usan.length) return false;
  const nueva = await huellaDe(texto);
  const cambiadas = usan.filter(x => x.b.fuente.huella !== nueva);
  if (!cambiadas.length) { toast('Ese archivo ya es el que usan tus gráficas'); return true; }
  toast(cambiadas.length + (cambiadas.length === 1 ? ' gráfica usa' : ' gráficas usan') + ' «' + nombre + '» con datos anteriores',
    null, { t: 'Actualizarlas', fn: async () => {
      for (const x of cambiadas) { x.b.data = texto; await marcaFuente(x.b, nombre, { instrumento: x.b.fuente.instrumento }); }
      commit();
      toast('Actualizadas ' + cambiadas.length + '. Deshacer con Ctrl+Z si no era eso.');
    } });
  return true;
}

/* ---------- paquete reproducible ---------- */
async function svgAPng(nodo, ancho) {
  /* renderChart devuelve una caja con el SVG dentro (y la ecuación del ajuste al lado). */
  const svg = (nodo.tagName || '').toLowerCase() === 'svg' ? nodo : nodo.querySelector('svg');
  if (!svg) throw new Error('no hay SVG que convertir');
  const copia = svg.cloneNode(true);
  copia.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const vb = (copia.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
  if (!copia.getAttribute('width') && vb.length === 4) { copia.setAttribute('width', vb[2]); copia.setAttribute('height', vb[3]); }
  const xml = new XMLSerializer().serializeToString(copia);
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
  const im = new Image();
  await new Promise((ok, mal) => { im.onload = ok; im.onerror = mal; im.src = url; });
  const esc = ancho / (im.width || 720);
  const c = document.createElement('canvas');
  c.width = Math.round((im.width || 720) * esc); c.height = Math.round((im.height || 400) * esc);
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
  return c.toDataURL('image/png');
}
function csvDe(b) {
  const { headers, rows } = parseTable(b.data || '');
  return [headers.join(',')].concat(rows.map(r => r.map(v => isFinite(v) ? String(v) : '').join(','))).join('\n') + '\n';
}
function texSuelto(b) {
  const cuerpo = chartToPgf(Object.assign({}, b, { w: 100 }), '');
  return ['\\documentclass[tikz,border=4pt]{standalone}', '\\usepackage{pgfplots}', '\\pgfplotsset{compat=1.18}',
    '\\usepackage[utf8]{inputenc}', '\\usepackage{siunitx}',
    '% Compilar con: pdflatex figura.tex', '\\begin{document}',
    '\\begin{minipage}{12cm}', cuerpo, '\\end{minipage}', '\\end{document}', ''].join('\n');
}
async function paqueteFigura(b) {
  if (!b || b.type !== 'chart') { toast('El paquete es para gráficas de datos'); return; }
  const t = toast('Armando el paquete…');
  try {
    const nombre = (b.caption || b.title || 'figura').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 40) || 'figura';
    const { rows } = parseTable(b.data || '');
    const series = chartSeries(b);
    const L = ['PAQUETE DE FIGURA · Erlen', '', 'Figura: ' + (b.caption || b.title || '(sin pie)'),
      'Tipo: ' + (b.kind || 'linea'), 'Ejes: ' + (b.xlabel || 'x') + ' / ' + (b.ylabel || 'y'),
      'Puntos: ' + rows.length + ' · series: ' + series.map(x => x.name).join(', ') +
        (series.some(x => x.tieneError) ? ' · con barras de error' : '')];
    if (b.fuente) L.push('Procedencia: ' + b.fuente.nombre + ' · ' + b.fuente.cuando + ' · huella ' + b.fuente.huella + (b.fuente.instrumento ? ' · ' + b.fuente.instrumento : ''));
    /* El ajuste que se anota es el que se ve: con un eje logarítmico, el del
       logaritmo. Si aquí se recalculara sobre los datos crudos, el LEEME del
       paquete contradiría a la propia figura que lo acompaña. */
    const esc = escalasChart(b, b.kind || 'linea', (b.kind || 'linea') === 'linea' && !!b.offset);
    if ((b.kind || '') === 'ajuste') series.forEach(s => {
      const ok = s.pts.filter(esc.vale).map(q => [esc.eX(q[0]), esc.eY(q[1])]);
      const f = (typeof linFitSE === 'function' ? linFitSE(ok) : null) || linFit(ok);
      const de = (esc.logY ? 'log₁₀ y' : 'y') + ' frente a ' + (esc.logX ? 'log₁₀ x' : 'x');
      if (f) L.push('Ajuste ' + s.name + ' (' + de + '): pendiente ' + sigFig(f.m, 4) + (f.sm != null ? ' ± ' + sigFig(f.sm, 2) : '') + ', ordenada ' + sigFig(f.b, 4) + (f.sb != null ? ' ± ' + sigFig(f.sb, 2) : '') + (f.r2 != null ? ', R² = ' + sigFig(f.r2, 4) : ''));
    });
    L.push('', 'Archivos:', '  datos.csv    los datos tal cual, coma como separador',
      '  figura.tex   la figura en pgfplots; pdflatex figura.tex la regenera',
      '  figura.png   una vista rápida', '', 'Generado el ' + new Date().toISOString().slice(0, 10) + ' con Erlen.');
    const svg = renderChart(Object.assign({}, b, { w: 100, capas: false, despues: null }), S.deck, 'export', 900);
    const png = await svgAPng(svg, 1600);
    const archivos = [
      { nombre: 'LEEME.txt', datos: L.join('\n') + '\n' },
      { nombre: 'datos.csv', datos: csvDe(b) },
      { nombre: 'figura.tex', datos: texSuelto(b) },
      { nombre: 'figura.png', datos: b64aBytes(png) },
      { nombre: 'provenance.json', datos: JSON.stringify({
        schema: 'erlen-provenance-v1',
        application: 'Erlen Slides',
        version: window.ERLEN?.version || 'desconocida',
        generatedAt: new Date().toISOString(),
        figure: { id: b.id || null, title: b.title || null, caption: b.caption || null,
          kind: b.kind || 'linea', xlabel: b.xlabel || null, ylabel: b.ylabel || null },
        source: b.fuente || null,
        dataSha256: await huellaDe(b.data || '')
      }, null, 2) + '\n' }
    ];
    const blob = await armaZip(archivos);
    await downloadFile(nombre + '-paquete.zip', blob, 'application/zip');
    toast('Paquete listo: datos, pgfplots y PNG');
  } catch (e) { toast('No se pudo armar el paquete: ' + e.message, 'warn'); }
  finally { if (t) t.remove(); }
}

/* ---------- controles en el panel del bloque ---------- */
function panelFigurasVivas(b, refresca) {
  const g = h('div', { class: 'igroup' }, h('span', { class: 'panel-label' }, 'Figura viva'));
  const esGraf = b.type === 'chart';
  if (esGraf) {
    /* capas */
    g.append(h('label', { class: 'check' },
      h('input', { type: 'checkbox', checked: !!b.capas, onchange: e => { b.capas = e.target.checked; if (!b.capas) delete b.destaca; commit(); refresca(); } }),
      'Revelar por capas al presentar'));
    if (b.capas) {
      const series = chartSeries(b).filter(s => s.pts.length);
      const nombres = nombresCapas(b);
      g.append(h('p', { class: 'hint' }, 'Al presentar: ejes → ' + nombres.join(' → ') + '. Cada capa es un paso; en el PDF salen como overlays de Beamer.'));
      /* el punto que importa */
      const d = b.destaca || null;
      const sel = h('select', { class: 'field', onchange: e => {
        const v = e.target.value;
        if (v === '') delete b.destaca; else { const [si, pi] = v.split(':').map(Number); b.destaca = Object.assign({ txt: '' }, b.destaca || {}, { serie: si, i: pi }); }
        commit(); refresca();
      } }, h('option', { value: '' }, 'Sin punto destacado'));
      series.forEach((s, si) => s.pts.forEach((pt, pi) => {
        if (!isFinite(pt[1])) return;
        sel.append(h('option', { value: si + ':' + pi, selected: d && d.serie === si && d.i === pi }, mathToUnicode(s.name) + ' · (' + sigFig(pt[0], 4) + ', ' + sigFig(pt[1], 4) + ')'));
      }));
      g.append(h('div', { class: 'irow' }, h('label', null, 'Destacar'), h('div', { style: 'flex:1.6' }, sel)));
      if (d) g.append(h('div', { class: 'irow' }, h('label', null, 'Rótulo'), h('div', { style: 'flex:1.6' },
        h('input', { class: 'field', value: d.txt || '', placeholder: 'p. ej. el máximo a 450 nm', oninput: e => { d.txt = e.target.value; }, onchange: () => commit() }))));
      /* lo que se dice en cada capa */
      g.append(h('span', { class: 'sublabel' }, 'Qué dices en cada capa (va a la vista de presentador)'));
      nombres.forEach((n, k) => g.append(h('input', { class: 'field', style: 'margin-bottom:4px', value: notaCapa(b, k), placeholder: n,
        oninput: e => { if (!Array.isArray(b.capasTxt)) b.capasTxt = []; b.capasTxt[k] = e.target.value; }, onchange: () => commit() })));
    }
  }
  /* antes / después */
  const hayD = !!(b.despues && (esGraf ? b.despues.data : b.despues.src));
  g.append(h('label', { class: 'check', style: 'margin-top:8px' },
    h('input', { type: 'checkbox', checked: hayD, onchange: e => {
      if (e.target.checked) b.despues = esGraf ? { data: b.data || '' } : { src: '' };
      else delete b.despues;
      commit(); refresca();
    } }), 'Antes y después: un segundo estado que entra como paso'));
  if (b.despues) {
    if (esGraf) {
      const ta = h('textarea', { class: 'field field-mono', rows: 5, spellcheck: 'false', placeholder: 'Los mismos encabezados, con los datos del «después»',
        oninput: e => { b.despues.data = e.target.value; }, onchange: () => commit() }, b.despues.data || '');
      g.append(ta, h('div', { style: 'display:flex;gap:6px;margin-top:6px;flex-wrap:wrap' },
        h('button', { class: 'btn btn-sm', onclick: () => pruebaDespues(b) }, '▶ Ver el cambio'),
        h('button', { class: 'btn btn-sm', onclick: () => { b.despues.data = b.data; commit(); refresca(); } }, 'Copiar los datos de antes')),
        h('p', { class: 'hint' }, 'Los ejes abarcan los dos estados para que la comparación sea honesta. En el PDF salen como dos overlays con el mismo marco.'));
    } else {
      g.append(h('button', { class: 'btn btn-sm', onclick: () => pideImagen(src => { b.despues.src = src; commit(); refresca(); }) },
        b.despues.src ? '🖼 Cambiar la imagen del después' : '🖼 Elegir la imagen del después'),
        h('p', { class: 'hint' }, 'La segunda imagen se funde sobre la primera al avanzar. Sirve para «misma muestra, después del recocido».'));
    }
  }
  /* procedencia y paquete */
  if (esGraf) {
    g.append(h('span', { class: 'sublabel', style: 'margin-top:8px' }, 'Procedencia'));
    if (b.fuente) {
      g.append(h('p', { class: 'hint', style: 'margin:0' }, 'De «' + b.fuente.nombre + '» · ' + b.fuente.cuando + ' · ' + b.fuente.n + ' filas · huella ' + b.fuente.huella +
        (b.fuente.instrumento ? ' · ' + b.fuente.instrumento : '')));
      g.append(h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!b.sello, onchange: e => { b.sello = e.target.checked; commit(); } }), 'Sello de procedencia bajo la figura (también en el PDF)'));
    } else {
      g.append(h('p', { class: 'hint', style: 'margin:0' }, 'Sin procedencia registrada. Si los datos vienen de un archivo, ponle nombre para poder actualizarla cuando el archivo cambie.'));
      const inp = h('input', { class: 'field', placeholder: 'p. ej. drx_muestra3.xy' });
      g.append(h('div', { style: 'display:flex;gap:6px;margin-top:4px' }, inp,
        h('button', { class: 'btn btn-sm', onclick: async () => { if (!inp.value.trim()) return; await marcaFuente(b, inp.value.trim()); commit(); refresca(); } }, 'Registrar')));
    }
    g.append(h('div', { style: 'margin-top:8px' },
      h('button', { class: 'btn btn-sm', onclick: () => paqueteFigura(b), title: 'CSV + pgfplots + PNG en un .zip' }, '⇩ Paquete reproducible')));
  }
  return g;
}

/* Elegir una imagen y recibirla ya reducida, sin tocar ningún bloque. */
function pideImagen(alTener) {
  const inp = h('input', { type: 'file', accept: 'image/*', style: 'display:none' });
  document.body.append(inp);
  inp.addEventListener('change', () => {
    const file = inp.files[0]; inp.remove();
    if (!file) return;
    const rd = new FileReader();
    rd.onload = () => {
      const url = rd.result;
      if (file.type === 'image/svg+xml' || file.size < 250000) { alTener(url); return; }
      const img = new Image();
      img.onload = () => {
        const MAX = 1600;
        let { width: w, height: hh } = img;
        if (Math.max(w, hh) > MAX) { const k = MAX / Math.max(w, hh); w = Math.round(w * k); hh = Math.round(hh * k); }
        const cv = h('canvas'); cv.width = w; cv.height = hh;
        cv.getContext('2d').drawImage(img, 0, 0, w, hh);
        alTener(file.type === 'image/png' ? cv.toDataURL('image/png') : cv.toDataURL('image/jpeg', 0.9));
      };
      img.onerror = () => alTener(url);
      img.src = url;
    };
    rd.readAsDataURL(file);
  });
  inp.click();
}

