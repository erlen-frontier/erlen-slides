/* SPDX-License-Identifier: AGPL-3.0-only */
window.ERLEN_FLUJOS = (() => {
'use strict';
function limpiaDiagramaSVG(texto) {
  const doc = new DOMParser().parseFromString(texto, 'image/svg+xml');
  if (doc.querySelector('parsererror') || doc.documentElement.localName !== 'svg') throw new Error('El diagrama no produjo un SVG válido.');
  for (const el of doc.querySelectorAll('*')) {
    if (['script', 'foreignObject', 'iframe', 'image', 'a'].includes(el.localName) || (el.localName === 'style' && /@import|url\(\s*["']?(?!#)/i.test(el.textContent))) { el.remove(); continue; }
    for (const a of [...el.attributes]) if (/^on/i.test(a.name) || /href$/i.test(a.name) || /(?:https?:|javascript:|@import|url\(\s*["']?(?!#))/i.test(a.value)) el.removeAttribute(a.name);
  }
  doc.documentElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return new XMLSerializer().serializeToString(doc.documentElement);
}

/* Markdown y MCP usan el mismo analizador y el mismo constructor de bloques. */
async function deckDesdeMarkdown(texto) {
  if (new TextEncoder().encode(texto).length > 2 * 1024 * 1024) throw new Error('El guion supera 2 MiB.');
  const core = await extensionSlides('markdown'), ops = await extensionSlides('operaciones');
  const r = core.leeMarkdown(texto);
  if (!r.diapositivas.length && !r.meta.titulo) throw new Error('Escribe # Título y ## Título de cada diapositiva.');
  if (r.diapositivas.length > 200) throw new Error('Divide el guion en presentaciones de hasta 200 diapositivas.');
  for (const sl of r.diapositivas) for (const z of sl.zonas || []) for (const b of z) {
    if (b.tipo !== 'image') continue;
    const imagen = b.src || b.archivo;
    if (!/^data:image\/(png|jpeg|gif|webp|svg\+xml)[;,]/i.test(imagen)) throw new Error('Las imágenes deben estar incrustadas en el Markdown. Inserta los archivos locales después de importar; no se descargan imágenes remotas.');
    b.src = imagen; delete b.archivo;
  }
  const res = JSON.parse(ops.ejecuta('nueva', JSON.stringify({ ...r.meta, diapositivas: r.diapositivas })));
  if (res.error) throw new Error(res.error);
  res.ok.deck.slides[0].notes = r.portada.notas || '';
  res.ok.deck.slides[0].min = r.portada.minutos || 0;
  return { deck: res.ok.deck, avisos: [...r.avisos, ...(res.ok.avisos || [])] };
}
function openMarkdown() {
  flushEdicion(); const deck = S.deck;
  let cerrado = false, turno = 0, propuesta = null;
  const texto = h('textarea', { class: 'field field-mono', rows: 12, 'aria-label': 'Guion Markdown', placeholder: '# Mi charla\n\n## Pregunta\n\n- Objetivo\n- Evidencia\n\nNotas:\nExplicación para el público.' });
  const estado = h('p', { class: 'hint', role: 'status' }, 'Pega tu guion o abre un archivo .md. Se creará una presentación nueva.'), vista = h('div', { class: 'flujo-preview' });
  const aceptar = h('button', { class: 'btn btn-pri', disabled: true, onclick: () => { if (propuesta && S.deck === deck) wsAbreAsistente(propuesta, propuesta.meta.title || 'Guion Markdown'); else toast('La presentación abierta cambió. Vuelve a importar el guion.', 'warn'); } }, 'Crear presentación');
  function invalida() { turno++; propuesta = null; aceptar.disabled = true; vista.replaceChildren(); estado.textContent = 'Guion modificado. Pulsa Vista previa.'; }
  texto.addEventListener('input', invalida);
  const archivo = h('input', { type: 'file', accept: '.md,.markdown,.txt', 'aria-label': 'Abrir guion Markdown' });
  archivo.addEventListener('change', async () => {
    invalida(); const actual = turno, f = archivo.files[0]; if (!f) return;
    try { if (f.size > 2 * 1024 * 1024) throw new Error('El guion supera 2 MiB.'); const t = await f.text(); if (!cerrado && turno === actual) { texto.value = t; invalida(); } }
    catch (e) { if (!cerrado) estado.textContent = e.message; }
  });
  const previo = h('button', { class: 'btn', onclick: async () => {
    invalida(); const actual = turno; previo.disabled = true; estado.textContent = 'Preparando vista previa…';
    try {
      const r = await deckDesdeMarkdown(texto.value);
      if (cerrado || actual !== turno || S.deck !== deck) return;
      propuesta = r.deck; aceptar.disabled = false;
      estado.textContent = r.deck.slides.length + ' diapositivas.' + (r.avisos.length ? ' Avisos: ' + r.avisos.join(' ') : '');
      r.deck.slides.forEach((sl, i) => vista.append(h('div', { class: 'flujo-mini' }, h('span', null, String(i + 1)), h('div', { class: 'flujo-lamina' }, renderSlide(r.deck, i, 'thumb', 99)))));
    } catch (e) { if (!cerrado && actual === turno) estado.textContent = e.message; }
    finally { previo.disabled = false; }
  } }, 'Vista previa');
  openModal({ title: 'Crear desde Markdown', body: h('div', null, texto, archivo, estado, vista), foot: [previo, aceptar], onclose: () => { cerrado = true; } });
}
async function exportMarkdownUI() {
  flushEdicion(); const deck = deepCopy(S.deck), nombre = deckSlug();
  try {
    const core = await extensionSlides('markdown');
    const r = core.aMarkdown(deck, { zonasPorDiseno: Object.fromEntries(LAYOUTS.map(l => [l.id, zonasDe(l.id)])), incrustarFiguras: true });
    await downloadFile(nombre + '.md', new Blob([r.md], { type: 'text/markdown;charset=utf-8' }), 'text/markdown');
    if (r.avisos.length) openModal({ title: 'Límites del guion Markdown', body: h('div', null, h('p', null, 'El proyecto JSON conserva todos los datos y formatos. En el guion:'), h('ul', null, r.avisos.map(a => h('li', null, a)))) });
  } catch (e) { toast(e.message, 'warn'); }
}

async function exportPPTXEditable() {
  flushEdicion(); const deck = deepCopy(S.deck), nombre = deckSlug();
  toast('Preparando PowerPoint editable…');
  try {
    const ext = await extensionSlides('exportador'), r = await ext.creaPPTX(deck);
    await downloadFile(nombre + '-editable.pptx', r.blob, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    if (r.avisos.length) openModal({ title: 'Informe del PowerPoint', body: h('div', null, h('p', null, 'Revisa estos límites antes de compartir el archivo. El proyecto JSON conserva las fuentes científicas.'), h('ul', null, r.avisos.map(a => h('li', null, 'Diapositiva ' + a.diapositiva + ': ' + a.motivo)))) });
  } catch (e) { toast('No se pudo exportar: ' + e.message, 'warn'); }
}
function openHTMLPresentacion() {
  const notas = h('input', { type: 'checkbox' }), estado = h('p', { class: 'hint', role: 'status' }, 'Un archivo para presentar sin conexión: navegación, pasos y deslizadores de funciones. Las imágenes y vídeos deben estar incrustados.');
  const generar = h('button', { class: 'btn btn-pri', onclick: async () => {
    flushEdicion(); const deck = deepCopy(S.deck), nombre = deckSlug(), incluir = notas.checked;
    generar.disabled = true; estado.textContent = 'Preparando archivo…';
    try { const ext = await extensionSlides('exportador'); const blob = await ext.creaHTML(deck, incluir); await downloadFile(nombre + '-presentacion.html', blob, 'text/html'); estado.textContent = 'Archivo descargado. Ábrelo en el navegador.'; }
    catch (e) { estado.textContent = 'No se pudo generar: ' + e.message; }
    finally { generar.disabled = false; }
  } }, 'Descargar presentación HTML');
  openModal({ title: 'Presentación HTML autónoma', body: h('div', null, estado, h('label', null, notas, ' Incluir notas del orador (serán visibles para quien reciba el archivo)')), foot: [generar] });
}

/* El diagrama es un bloque image compatible con JSON v1. Conserva su fuente,
   y su SVG permite presentar y exportar sin cargar Mermaid de nuevo. */
async function generaDiagrama(texto) {
  if (!fuenteDiagramaValida(texto)) throw new Error('Usa hasta 20 000 caracteres, sin enlaces, instrucciones de configuración ni contenido externo.');
  const { default: mermaid } = await extensionSlides('mermaid');
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', suppressErrorRendering: true, theme: 'default', htmlLabels: false, flowchart: { htmlLabels: false }, maxTextSize: 20000 });
  const r = await mermaid.render('erlen-diagrama-' + uid(), texto);
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(limpiaDiagramaSVG(r.svg));
}
function openDiagramaTexto(original) {
  flushEdicion(); const deck = S.deck, slide = curSlide();
  let cerrado = false, turno = 0, fuente = null, src = null;
  const texto = h('textarea', { class: 'field field-mono', rows: 10, 'aria-label': 'Fuente del diagrama', placeholder: 'flowchart LR\n  A[Pregunta] --> B[Método]\n  B --> C[Evidencia]' }); texto.value = original?.cientifico?.texto || '';
  const titulo = h('input', { class: 'field', 'aria-label': 'Nombre del diagrama', value: original?.alt || '', placeholder: 'Nombre del diagrama' });
  const vista = h('img', { class: 'diagrama-preview', alt: 'Vista previa del diagrama' }), estado = h('p', { class: 'hint', role: 'status' }, 'Escribe un flujo, una secuencia, relaciones o un cronograma. La fuente queda guardada para reeditarlo.');
  const insertar = h('button', { class: 'btn btn-pri', disabled: true, onclick: () => {
    if (!src || fuente !== texto.value || cerrado) return;
    if (S.deck !== deck || curSlide() !== slide || (original && findBlock(original.id)?.block !== original)) { estado.textContent = 'La diapositiva cambió. Abre de nuevo el editor del diagrama.'; return; }
    if (original?.locked) { estado.textContent = 'Desbloquea la figura antes de editarla.'; return; }
    const b = original || newBlock('image');
    Object.assign(b, { src, alt: titulo.value || 'Diagrama', caption: original?.caption || titulo.value, cientifico: { v: 1, tipo: 'diagrama', texto: fuente }, w: original?.w || 85 });
    if (!original) insertaFiguraNueva(b, slide);
    closeModal(); S.selBlock = b.id; commit();
  } }, original ? 'Actualizar diagrama' : 'Insertar diagrama');
  texto.addEventListener('input', () => { turno++; src = fuente = null; insertar.disabled = true; vista.removeAttribute('src'); });
  const dibujar = h('button', { class: 'btn', onclick: async () => {
    const actual = ++turno, t = texto.value; insertar.disabled = true; dibujar.disabled = true; estado.textContent = 'Dibujando…';
    try { const uri = await generaDiagrama(t); if (cerrado || actual !== turno) return; fuente = t; src = uri; vista.src = uri; insertar.disabled = false; estado.textContent = 'Revisa la figura y sus etiquetas antes de insertarla.'; }
    catch (e) { if (!cerrado && actual === turno) estado.textContent = 'Revisa la sintaxis: ' + e.message; }
    finally { dibujar.disabled = false; }
  } }, 'Dibujar');
  openModal({ title: 'Diagrama desde texto', body: h('div', null, titulo, texto, estado, vista), foot: [dibujar, insertar], onclose: () => { cerrado = true; } });
}

/* Selección visual de temas sobre el contenido real, con un solo paso de undo. */
function openTemasVisuales() {
  flushEdicion(); const deck = S.deck, actual = S.cur;
  const rejilla = h('div', { class: 'temas-visuales' });
  for (const [id, tema] of Object.entries(THEMES)) {
    const copia = deepCopy(deck); copia.meta.theme = id;
    const boton = h('button', { class: 'tema-visual', 'aria-label': 'Aplicar tema ' + tema.name, onclick: () => {
      if (S.deck !== deck) { toast('La presentación cambió. Abre de nuevo los temas.', 'warn'); return; }
      deck.meta.theme = id; closeModal(); commit();
    } }, h('div', { class: 'flujo-lamina' }, renderSlide(copia, actual, 'thumb', 99)), h('strong', null, tema.name), h('span', null, tema.desc || ''));
    rejilla.append(boton);
  }
  openModal({ title: 'Elegir estilo con tu diapositiva', body: rejilla });
}

/* Grabación local optativa, sin cuentas ni subida. La captura siempre nace
   de un clic; las pistas se cierran también si falla el micrófono. */
function openGrabacion() {
  if (GRABACION.recorder || GRABACION.solicitando) { toast('Ya hay una grabación o una solicitud de captura.'); return; }
  if (!navigator.mediaDevices?.getDisplayMedia || typeof MediaRecorder === 'undefined') { toast('Este navegador no admite grabación de pantalla. Usa un navegador compatible en localhost o HTTPS.', 'warn'); return; }
  let cerrado = false;
  const micro = h('input', { type: 'checkbox', checked: true }), estado = h('p', { class: 'hint', role: 'status' }, 'Elige la pestaña o pantalla de tu presentación. El vídeo se descarga en tu equipo.');
  const iniciar = h('button', { class: 'btn btn-pri', onclick: async () => {
    if (GRABACION.solicitando) return; GRABACION.solicitando = true; iniciar.disabled = true;
    const pistas = []; const nombre = deckSlug(); let limpia = () => { pistas.forEach(t => t.stop()); };
    try {
      const pantalla = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false }); pistas.push(...pantalla.getTracks());
      if (cerrado) { pistas.forEach(t => t.stop()); return; }
      if (micro.checked) { const voz = await navigator.mediaDevices.getUserMedia({ audio: true }); pistas.push(...voz.getAudioTracks()); }
      if (cerrado) { pistas.forEach(t => t.stop()); return; }
      const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find(t => MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(new MediaStream(pistas), mime ? { mimeType: mime } : {}), partes = [];
      const panel = h('div', { id: 'grabacionControl', class: 'grabacion-control', role: 'status' }, h('span', null, 'Grabando · archivo local'), h('button', { class: 'btn', onclick: () => { if (rec.state !== 'inactive') rec.stop(); } }, 'Detener y descargar'));
      GRABACION.recorder = rec; GRABACION.pistas = pistas;
      limpia = () => { pistas.forEach(t => t.stop()); GRABACION.recorder = null; GRABACION.pistas = []; panel.remove(); };
      rec.ondataavailable = e => { if (e.data.size) partes.push(e.data); };
      rec.onerror = () => { limpia(); toast('La grabación se interrumpió. Comprueba espacio y permisos.', 'warn'); };
      rec.onstop = async () => { limpia(); if (partes.length) { const tipo = rec.mimeType || 'video/webm'; await downloadFile(nombre + '-grabacion.' + (tipo.includes('mp4') ? 'mp4' : 'webm'), new Blob(partes, { type: tipo }), tipo); } };
      pantalla.getVideoTracks()[0].addEventListener('ended', () => { if (rec.state !== 'inactive') rec.stop(); });
      closeModal(); document.body.append(panel); rec.start(1000); startPresent(false);
    } catch (e) { limpia(); if (!cerrado) estado.textContent = 'No se inició la grabación: ' + e.message; else toast('No se inició la grabación: ' + e.message, 'warn'); }
    finally { GRABACION.solicitando = false; iniciar.disabled = false; }
  } }, 'Elegir pantalla y grabar');
  openModal({ title: 'Grabar la presentación', body: h('div', null, estado, h('label', null, micro, ' Incluir mi micrófono')), foot: [iniciar], onclose: () => { cerrado = true; } });
}

function openOrganizarBloques() {
  flushEdicion(); const deck = S.deck, slide = curSlide(), ids = new Set(idsSeleccionados());
  if (!ids.size && S.selBlock) ids.add(S.selBlock);
  const lista = h('div', { class: 'bloques-lote' }), estado = h('p', { class: 'hint', role: 'status' }, 'Selecciona varios bloques. Agrupar permite seleccionarlos juntos; cada acción se deshace con Ctrl+Z.');
  const zonaDestino = h('select', { class: 'field', 'aria-label': 'Zona de destino' }, Array.from({ length: zonasDe(slide.layout) }, (_, i) => h('option', { value: i }, 'Zona ' + (i + 1))));
  const ancho = h('input', { class: 'field', type: 'number', min: 10, max: 100, value: 80, 'aria-label': 'Anchura en porcentaje' });
  const ejecuta = (a, v) => { try { aplicaLoteBloques(deck, slide, ids, a, v); closeModal(); } catch (e) { estado.textContent = e.message; } };
  zonas(slide).forEach((arr, z) => arr.forEach(b => {
    const control = h('input', { type: 'checkbox', checked: ids.has(b.id), onchange: () => { control.checked ? ids.add(b.id) : ids.delete(b.id); } });
    const nombre = (BLOCK_DEFS.find(d => d.id === b.type) || {}).name || b.type;
    lista.append(h('label', null, control, ' Zona ' + (z + 1) + ' · ' + nombre + ' · ' + String(b.text || b.caption || b.title || b.tex || b.alt || '').slice(0, 90) + (b.locked ? ' · bloqueado' : '')));
  }));
  const acciones = h('div', { class: 'flujo-acciones' });
  [['Agrupar', 'agrupar'], ['Desagrupar', 'desagrupar'], ['Bloquear', 'bloquear'], ['Desbloquear', 'desbloquear'], ['Duplicar', 'duplicar'], ['Eliminar', 'eliminar']].forEach(([n, a]) => acciones.append(h('button', { class: 'btn', onclick: () => ejecuta(a) }, n)));
  for (const [n, a] of [['Izquierda', 'left'], ['Centro', 'center'], ['Derecha', 'right']]) acciones.append(h('button', { class: 'btn', onclick: () => ejecuta('alinear', a) }, 'Alinear: ' + n));
  openModal({ title: 'Organizar bloques', body: h('div', null, estado, lista, acciones, h('div', { class: 'flujo-acciones' }, zonaDestino, h('button', { class: 'btn', disabled: !zonasDe(slide.layout), onclick: () => ejecuta('mover', +zonaDestino.value) }, 'Mover selección'), ancho, h('button', { class: 'btn', onclick: () => ejecuta('ancho', +ancho.value) }, 'Igualar anchuras'))) });
}

return { deckDesdeMarkdown, openMarkdown, exportMarkdownUI, exportPPTXEditable, openHTMLPresentacion, generaDiagrama, openDiagramaTexto, openTemasVisuales, openGrabacion, openOrganizarBloques };
})();
