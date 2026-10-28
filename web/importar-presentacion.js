/* SPDX-License-Identifier: AGPL-3.0-only */
window.ERLEN_IMPORTAR = (() => {
'use strict';
function textoPPTX(html) {
  const doc = new DOMParser().parseFromString(String(html || '').replace(/<br\s*\/?\s*>|<\/p>|<\/li>/gi, '\n'), 'text/html');
  doc.querySelectorAll('script,style,iframe,object').forEach(n => n.remove());
  return (doc.body.textContent || '').replace(/\u00a0/g, ' ').trim();
}
function imagenPPTX(src) {
  if (typeof src !== 'string' || src.length > 12 * 1048576) return '';
  return /^data:image\/(png|jpeg|gif|webp);base64,[a-z\d+/=\s]+$/i.test(src) ? src : '';
}
/* Content adaptation is explicit: Office geometry and fonts are replaced by
   Erlen layouts. Never claim pixel-perfect import or discard a chart's data. */
function adaptaPPTX(raw, archivo = 'PowerPoint') {
  if (!Array.isArray(raw?.slides) || !raw.slides.length || raw.slides.length > 200) throw new Error('La presentación debe contener de 1 a 200 diapositivas.');
  const deck = blankDeck(); deck.slides = []; deck.meta.title = archivo.replace(/\.pptx$/i, '');
  deck.meta.aspect = Math.abs(raw.size?.width / raw.size?.height - 4 / 3) < 0.08 ? '43' : '169';
  const avisos = [], add = (i, motivo) => avisos.push({ diapositiva: i + 1, motivo });
  const block = (tipo, datos) => Object.assign(newBlock(tipo), datos);
  let cantidad = 0;
  raw.slides.forEach((sl, i) => {
    let titulo = '', bloques = [];
    function elemento(e, nivel = 0) {
      if (!e || nivel > 8 || ++cantidad > 5000) throw new Error('El PowerPoint tiene demasiados objetos. Divide el archivo.');
      if (e.type === 'group' || e.type === 'diagram') {
        if (Array.isArray(e.elements) && e.elements.length) e.elements.forEach(x => elemento(x, nivel + 1));
        else if (Array.isArray(e.textList)) bloques.push(block('text', { text: e.textList.map(String).join('\n') }));
        add(i, 'Un grupo o diagrama se separó en contenido editable; sus conectores y posiciones pueden cambiar.'); return;
      }
      if (e.type === 'text' || e.type === 'shape') {
        const texto = textoPPTX(e.content);
        if (texto) {
          if (!titulo && texto.length < 180 && +e.top < (raw.size?.height || 540) * 0.3) titulo = texto.replace(/\n+/g, ' ').replace(/\$/g, '\\$');
          else for (let p = 0; p < texto.length; p += 1000) bloques.push(block('text', { text: texto.slice(p, p + 1000).replace(/\$/g, '\\$') }));
        }
        if (e.type === 'shape') add(i, 'Las formas se adaptaron como texto; su dibujo y efectos de Office no se conservan.');
      } else if (e.type === 'image') {
        const src = imagenPPTX(e.base64);
        if (src) { bloques.push(block('image', { src, alt: '', caption: '', w: 85 })); if (e.rect || e.rotate || e.isFlipH || e.isFlipV) add(i, 'Se conservó la imagen original; revisa su recorte, giro y orientación.'); }
        else add(i, 'Una imagen tiene un formato no compatible o no está incrustada. Vuelve a insertarla desde el archivo original.');
      } else if (e.type === 'table') {
        if (!Array.isArray(e.data) || !e.data.length) { add(i, 'No se pudieron leer las celdas de una tabla.'); return; }
        const rows = e.data.map(row => row.map(c => textoPPTX(c.text).replace(/\$/g, '\\$')));
        if (e.data.some(row => row.some(c => c.rowSpan > 1 || c.colSpan > 1 || c.hMerge || c.vMerge))) add(i, 'Las celdas combinadas requieren revisión; se conservó el texto de las celdas leído por el parser.');
        tabla(rows, i, '');
      } else if (e.type === 'chart') {
        if (['scatterChart', 'bubbleChart'].includes(e.chartType)) {
          const columnas = e.data || [];
          const rows = Array.from({ length: Math.max(0, ...columnas.map(c => c.length)) }, (_, n) => columnas.map(c => c[n] == null ? '' : String(c[n])));
          tabla([columnas.map((_, n) => n === 0 ? 'x' : n === 1 ? 'y' : 'Dato ' + (n + 1)), ...rows], i, 'Datos importados de la gráfica');
        } else {
          const rows = [['Serie', 'Categoría', 'Valor']];
          for (const serie of e.data || []) for (const v of serie.values || []) rows.push([String(serie.key || ''), String(serie.xlabels?.[v.x] ?? v.x), String(v.y)]);
          tabla(rows, i, 'Datos importados de la gráfica');
        }
        add(i, 'La gráfica se importó como tabla de datos. Crea una gráfica de Tabula para elegir sus ejes y unidades.');
      } else if (e.type === 'math' && e.latex) bloques.push(block('math', { tex: String(e.latex).slice(0, 20000) }));
      else add(i, 'Un objeto ' + String(e.type || 'desconocido').slice(0, 40) + ' no se importó. Revísalo en el PowerPoint original.');
    }
    function tabla(rows, indice, caption) {
      if (rows.length > 1000 || rows.some(r => r.length > 40)) throw new Error('Una tabla es demasiado grande. Divide sus filas o columnas en el PowerPoint.');
      for (let p = 1; p < rows.length || p === 1; p += 10) bloques.push(block('table', { rows: [rows[0], ...rows.slice(p, p + 10)], header: true, caption }));
      if (rows.length > 11) add(indice, 'Una tabla larga se dividió, repitiendo el encabezado y conservando las filas.');
    }
    (sl.elements || []).slice().sort((a, b) => (+a.top || 0) - (+b.top || 0) || (+a.left || 0) - (+b.left || 0)).forEach(e => elemento(e));
    if (sl.layoutElements?.length) add(i, 'Los objetos del patrón de diapositiva no se importaron. Revisa logotipos y encabezados.');
    if (sl.transition) add(i, 'La transición de Office no se conserva. Puedes elegir una transición en Diseño.');
    /* One table or figure per slide; short text blocks can share a slide. */
    const partes = []; let actual = [];
    for (const b of bloques) { if (actual.length && (b.type !== 'text' || actual.some(x => x.type !== 'text') || actual.reduce((n, x) => n + (x.text?.length || 0), 0) + (b.text?.length || 0) > 1200)) { partes.push(actual); actual = []; } actual.push(b); }
    if (actual.length || !partes.length) partes.push(actual);
    if (partes.length > 1) add(i, 'El contenido se repartió en ' + partes.length + ' diapositivas para facilitar su edición.');
    partes.forEach((bs, k) => deck.slides.push({ id: uid(), layout: 'content', title: titulo + (k ? ' · continuación ' + (k + 1) : ''), blocks: bs, notes: k ? '' : textoPPTX(sl.note) }));
  });
  if (deck.slides.length > 200 || JSON.stringify(deck).length > 25 * 1048576) throw new Error('El contenido adaptado es demasiado grande. Divide el PowerPoint en archivos más pequeños.');
  const unicos = avisos.filter((a, i) => avisos.findIndex(b => b.diapositiva === a.diapositiva && b.motivo === a.motivo) === i);
  deck.meta.importacion = { v: 1, formato: 'pptx', archivo: archivo.slice(0, 200), originales: raw.slides.length, avisos: unicos };
  return { deck, avisos: unicos };
}
function openImportarPresentacion() {
  flushEdicion(); const original = S.deck;
  let cerrado = false, turno = 0, worker = null, timer = null, propuesta = null, rechazaLectura = null;
  const estado = h('p', { class: 'hint', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' }, 'Elige un proyecto JSON, un PowerPoint PPTX o un guion Markdown. Se abrirá una copia nueva en tu biblioteca.'), detalles = h('div'), vista = h('div', { class: 'flujo-preview' });
  const archivo = h('input', { class: 'field', type: 'file', accept: '.json,.pptx,.md,.markdown', 'aria-label': 'Archivo de presentación' });
  const cancelar = (abortar = true) => { clearTimeout(timer); worker?.terminate(); worker = null; const rechaza = rechazaLectura; rechazaLectura = null; if (abortar) rechaza?.(new Error('Lectura cancelada.')); };
  const aceptar = h('button', { class: 'btn btn-pri', disabled: true, onclick: () => {
    if (!propuesta || cerrado || S.deck !== original) { estado.textContent = 'La presentación abierta cambió. Selecciona de nuevo el archivo.'; return; }
    if (!wsAbreAsistente(propuesta.deck, propuesta.deck.meta.title || propuesta.nombre)) estado.textContent = 'No se pudo guardar la copia. Descarga un respaldo y libera espacio en el navegador.';
  } }, 'Abrir copia editable');
  archivo.addEventListener('change', async () => {
    cancelar(); const actual = ++turno, f = archivo.files[0]; propuesta = null; aceptar.disabled = true; detalles.replaceChildren(); vista.replaceChildren();
    if (!f) { estado.textContent = 'Selecciona un archivo para ver su contenido.'; return; }
    estado.textContent = 'Leyendo el archivo…'; archivo.setAttribute('aria-busy', 'true');
    try {
      if (f.size > 25 * 1048576) throw new Error('El archivo supera 25 MiB. Divide la presentación.');
      let r;
      if (/\.pptx$/i.test(f.name)) {
        const buffer = await f.arrayBuffer(); if (cerrado || actual !== turno) return;
        const core = await extensionSlides('pptxcore'); core.revisaPaquetePPTX(buffer);
        if (cerrado || actual !== turno) return;
        const raw = await new Promise((resolve, reject) => {
          rechazaLectura = reject;
          worker = new Worker(new URL('libre/pptx-worker.mjs', document.baseURI), { type: 'module' });
          worker.onmessage = ({ data }) => { cancelar(false); data.error ? reject(new Error(data.error)) : resolve(data.resultado); };
          worker.onerror = () => { cancelar(false); reject(new Error('No se pudo iniciar el lector local de PowerPoint. Comprueba los archivos de la aplicación.')); };
          timer = setTimeout(() => { cancelar(false); reject(new Error('La lectura tardó demasiado. Divide el PowerPoint e inténtalo de nuevo.')); }, 30000);
          worker.postMessage(buffer, [buffer]);
        });
        if (cerrado || actual !== turno) return;
        r = adaptaPPTX(raw, f.name);
        detalles.append(h('p', null, 'Se importan textos, imágenes incrustadas, tablas, ecuaciones compatibles y notas. El acomodo, las fuentes y los efectos se adaptan al estilo de Tabula; compara con el PowerPoint original.'));
      } else if (/\.(md|markdown)$/i.test(f.name)) r = await deckDesdeMarkdown(await f.text());
      else if (/\.json$/i.test(f.name)) {
        const bruto = JSON.parse(await f.text());
        if (cerrado || actual !== turno || S.deck !== original) return;
        if (bruto?.version === 2 && typeof bruto.payloadJSON === 'string') {
          let verificado;
          try { verificado = await erlenExchange.verifyTransfer(bruto, 'slides'); }
          catch (e) { if (!cerrado && actual === turno && S.deck === original) rechazaCopia(e); return; }
          if (!cerrado && actual === turno && S.deck === original) recibeRegistro(verificado);
          return;
        }
        r = saneaDeck(bruto); if (r.error) throw new Error(r.error);
        if (SANEA_REMOTOS.length) throw new Error('El proyecto incluye recursos remotos. Incrusta las imágenes en el proyecto original antes de importarlo desde esta vista.');
      } else throw new Error('Selecciona un archivo .json, .pptx o .md.');
      if (cerrado || actual !== turno || S.deck !== original) return;
      propuesta = { ...r, nombre: f.name }; aceptar.disabled = false;
      const avisos = (r.avisos || []).map(a => typeof a === 'string' ? a : 'Original ' + a.diapositiva + ': ' + a.motivo);
      estado.textContent = r.deck.slides.length + ' diapositivas listas para revisar.' + (avisos.length ? ' Hay ' + avisos.length + ' ajustes de importación.' : '');
      if (avisos.length) detalles.append(h('details', null, h('summary', null, 'Ver ajustes de importación (' + avisos.length + ')'), h('ul', null, avisos.map(a => h('li', null, a)))));
      r.deck.slides.forEach((sl, i) => vista.append(h('div', { class: 'flujo-mini' }, h('strong', null, 'Diapositiva ' + (i + 1) + ': ' + (sl.title || r.deck.meta.title || 'Sin título')), h('div', { class: 'flujo-lamina', 'aria-hidden': 'true' }, renderSlide(r.deck, i, 'thumb', 99)))));
    } catch (e) { if (!cerrado && actual === turno) estado.textContent = e.message || 'No se pudo leer el archivo.'; }
    finally { if (!cerrado && actual === turno) archivo.removeAttribute('aria-busy'); }
  });
  openModal({ title: 'Importar una presentación', size: 'modal-lg', body: h('div', null, h('label', null, 'Archivo de presentación', archivo), estado, detalles, vista), foot: [h('button', { class: 'btn', onclick: closeModal }, 'Cancelar'), aceptar], onclose: () => { cerrado = true; turno++; cancelar(); } });
}
return { openImportarPresentacion, adaptaPPTX, textoPPTX };
})();
