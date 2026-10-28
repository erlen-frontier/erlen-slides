/* SPDX-License-Identifier: AGPL-3.0-only */
window.ERLEN_COMPARTIR = (() => {
'use strict';
async function revisaSalida(formato, deck = S.deck) {
  const hallazgos = [], add = (grado, i, mensaje, ayuda, bloque) => hallazgos.push({ grado, i, mensaje, ayuda, bloque });
  if (deck !== S.deck) throw new Error('Abre la presentación que quieres revisar.');
  await document.fonts?.ready;
  const revision = revisaMazo();
  revision.fallos.filter(f => f.grado !== 'sugerencia').forEach(f => add(f.grado, f.i, f.qué, f.cómo, f.bloque));
  const exportador = formato === 'pptx' ? await extensionSlides('exportador') : null;
  const coreFiguras = deck.slides.some(sl => zonas(sl).flat().some(b => b.figura)) ? await extensionSlides('figurascore') : null;
  const medida = document.createElement('canvas').getContext('2d');
  deck.slides.forEach((sl, i) => zonas(sl).flat().forEach(b => {
    if (['image', 'video'].includes(b.type) && b.src && !(b.alt || b.caption || '').trim()) add('aviso', i, 'Una figura no tiene descripción accesible.', 'Escribe su texto alterno o un pie que explique qué muestra.', b.id);
    if (b.type === 'galeria') for (const im of b.gal?.imgs || []) if (!(im.alt || im.cap || '').trim()) add('aviso', i, 'Una imagen de la galería no tiene descripción.', 'Describe cada panel en el editor de la galería.', b.id);
    if (b.type === 'table' && !b.header) add('aviso', i, 'La tabla no tiene encabezados de columna.', 'Activa la primera fila como encabezado en Propiedades.', b.id);
    if (b.figura) {
      try { if (coreFiguras.recortesFigura(b.figura, (t, size) => { medida.font = size + 'px Arial'; return medida.measureText(t).width; }).length) add('aviso', i, 'Un objeto queda fuera del borde de la figura.', 'Edita la figura y mueve el objeto o reduce su tamaño.', b.id); }
      catch { add('aviso', i, 'Los objetos editables de esta figura tienen un formato no compatible.', 'La imagen se conserva. Abre el proyecto original para recuperar sus objetos.', b.id); }
    }
    const fuentes = [b.src, b.poster, b.despues?.src, ...(b.gal?.imgs || []).map(im => im.src)].filter(Boolean);
    if (fuentes.some(s => !/^data:/i.test(s))) add(['pptx', 'html'].includes(formato) ? 'error' : 'aviso', i, 'Un recurso depende de una dirección externa.', 'Incrusta la imagen o el vídeo antes de compartirlo sin conexión.', b.id);
    if (b.type === 'video' && ['pptx', 'pdf', 'beamer'].includes(formato)) add('aviso', i, 'El vídeo no se reproducirá en este formato.', 'Comparte la presentación HTML para conservar los vídeos incrustados.', b.id);
    if (formato === 'pptx' && (['func', 'math', 'chem', 'montaje', 'estruct', 'geo', 'galeria'].includes(b.type) || (b.type === 'chart' && !exportador.chartNativo(b)) || (b.type === 'image' && (b.figura || b.cientifico)))) add('detalle', i, 'Esta figura conserva su apariencia; sus objetos internos no serán editables en PowerPoint.', 'El proyecto JSON conserva los datos y los objetos editables de Erlen.', b.id);
    if (Array.isArray(b.figura?.objects) && b.figura.background !== 'transparent') for (const o of b.figura.objects) {
      if (o?.kind === 'text' && /^#[\da-f]{6}$/i.test(o.fill) && /^#[\da-f]{6}$/i.test(b.figura.background) && contraste(o.fill, b.figura.background) < 4.5) { add('aviso', i, 'Un texto de la figura tiene poco contraste con su fondo.', 'Edita la figura y cambia el color del texto o el fondo.', b.id); break; }
    }
  }));
  if (deck.meta.logo && !/^data:/i.test(deck.meta.logo)) add(['html', 'pptx'].includes(formato) ? 'error' : 'aviso', 0, 'El logotipo depende de una dirección externa.', 'Incrusta el logotipo desde Diseño.');
  if (formato === 'pptx') add('detalle', 0, 'PowerPoint usa fuentes de Office y no incrusta las fuentes de Erlen.', 'Revisa el archivo final en el equipo donde vas a presentar.');
  if (deck.meta.importacion?.formato === 'pptx') add('detalle', 0, 'Esta presentación se adaptó desde PowerPoint.', 'Compara sus figuras, valores y notas con el archivo original.');
  return hallazgos;
}
function openCompartir(formatoInicial = 'pptx') {
  flushEdicion(); const original = S.deck;
  let cerrado = false, turno = 0, firma = '', hallazgos = [], generando = false;
  const formato = h('select', { class: 'field', 'aria-label': 'Formato para compartir' }, [['pptx', 'PowerPoint editable'], ['html', 'Presentación HTML sin conexión'], ['pdf', 'PDF'], ['beamer', 'Código Beamer'], ['json', 'Proyecto JSON editable']].map(([value, n]) => h('option', { value }, n))); formato.value = formatoInicial;
  const estado = h('p', { class: 'hint', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' }, 'Revisando la presentación…'), lista = h('div', { class: 'salida-hallazgos' });
  const notas = h('input', { type: 'checkbox' }), opcionNotas = h('label', { class: 'check' }, notas, ' Incluir notas del orador: quien reciba el archivo podrá leerlas');
  const consejo = h('p', { class: 'hint' });
  const filtrar = h('select', { class: 'field', 'aria-label': 'Mostrar hallazgos' }, h('option', { value: 'importantes' }, 'Problemas que revisar'), h('option', { value: 'todos' }, 'También límites del formato'));
  const revisar = h('button', { class: 'btn', onclick: actualiza }, 'Volver a revisar');
  const descargar = h('button', { class: 'btn btn-pri', disabled: true, onclick: async () => {
    flushEdicion();
    if (cerrado || S.deck !== original || firma !== JSON.stringify(S.deck)) { estado.textContent = 'El contenido cambió. Pulsa Volver a revisar.'; descargar.disabled = true; return; }
    const copia = deepCopy(S.deck), slug = deckSlug(), tipo = formato.value; generando = true; descargar.disabled = true; revisar.disabled = true; formato.disabled = true; notas.disabled = true; estado.textContent = 'Preparando el archivo…';
    try {
      if (tipo === 'pdf') { closeModal(); openPdfHelp(); return; }
      if (tipo === 'beamer') { closeModal(); openTexView(); return; }
      if (tipo === 'json') await downloadFile(slug + '.json', JSON.stringify(copia, null, 2), 'application/json');
      else {
        if (!notas.checked) copia.slides.forEach(sl => { sl.notes = ''; });
        const ext = await extensionSlides('exportador');
        if (tipo === 'pptx') {
          const r = await ext.creaPPTX(copia); await downloadFile(slug + '-editable.pptx', r.blob, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
          if (!cerrado && r.avisos.length) { hallazgos.push(...r.avisos.map(a => ({ grado: 'detalle', i: a.diapositiva - 1, mensaje: a.motivo, ayuda: 'El proyecto JSON conserva el contenido editable.', bloque: a.bloque }))); pinta(); }
        } else await downloadFile(slug + '-presentacion.html', await ext.creaHTML(copia, notas.checked), 'text/html');
      }
      if (!cerrado) estado.textContent = 'Archivo descargado. Abre la copia final y comprueba sus diapositivas antes de compartirla.';
    } catch (e) { if (!cerrado) estado.textContent = 'No se pudo generar el archivo: ' + e.message; }
    finally { generando = false; if (!cerrado) { descargar.disabled = false; revisar.disabled = false; formato.disabled = false; notas.disabled = false; } }
  } }, 'Descargar archivo');
  function pinta() {
    lista.replaceChildren(); const visible = hallazgos.filter(f => filtrar.value === 'todos' || f.grado !== 'detalle');
    if (!visible.length) lista.append(h('p', null, 'No se detectaron problemas en esta revisión. Comprueba también el archivo final.'));
    visible.forEach(f => lista.append(h('button', { class: 'rv-fila g-' + (f.grado === 'detalle' ? 'sugerencia' : f.grado), type: 'button', onclick: () => {
      closeModal(); wsCerrar(); S.cur = clamp(f.i, 0, S.deck.slides.length - 1); S.selBlock = f.bloque || null; renderAll();
      const b = f.bloque && findBlock(f.bloque)?.block;
      if (b?.figura) openFiguraCapas(b);
      else if (b) openBlockProps(b);
      else $('#deckTitleInput')?.focus();
    } }, h('span', { class: 'rv-i' }, String(f.i + 1)), h('span', { class: 'rv-tx' }, h('b', null, 'Diapositiva ' + (f.i + 1) + ': ' + f.mensaje), h('span', null, f.ayuda)))));
  }
  async function actualiza() {
    if (generando) return;
    const actual = ++turno; flushEdicion(); firma = JSON.stringify(S.deck); descargar.disabled = true; revisar.disabled = true; formato.disabled = true; lista.replaceChildren();
    const f = formato.value;
    opcionNotas.hidden = !['html', 'pptx'].includes(f);
    consejo.textContent = ({ pptx: 'Textos, tablas y gráficas compatibles quedan editables. Las figuras especiales conservan su apariencia como imagen.', html: 'Un archivo autónomo para presentar sin conexión. Conserva los pasos y los deslizadores de funciones.', pdf: 'Se abrirá la impresión del navegador. Elige Guardar como PDF.', beamer: 'Se abrirá el código para editar y compilar en LaTeX.', json: 'Conserva los datos, las figuras editables y todas las notas. Es la copia para seguir trabajando en Erlen.' })[f];
    descargar.textContent = ['pdf', 'beamer'].includes(f) ? 'Continuar con ' + (f === 'pdf' ? 'PDF' : 'Beamer') : 'Descargar ' + (f === 'pptx' ? 'PowerPoint' : f === 'html' ? 'HTML' : 'proyecto JSON');
    estado.textContent = 'Revisando contenido, accesibilidad y límites del formato…';
    try {
      await new Promise(r => setTimeout(r, 30)); if (cerrado || actual !== turno || S.deck !== original) return;
      hallazgos = await revisaSalida(f, original);
      if (cerrado || actual !== turno || S.deck !== original) return;
      pinta(); const errores = hallazgos.filter(x => x.grado === 'error').length, avisos = hallazgos.filter(x => x.grado === 'aviso').length;
      estado.textContent = errores + ' problemas y ' + avisos + ' avisos. Puedes abrir cada uno para corregirlo, o continuar con el archivo.';
      descargar.disabled = false;
    } catch (e) { if (!cerrado && actual === turno) { estado.textContent = 'No se pudo completar la revisión: ' + e.message; } }
    finally { if (!cerrado && actual === turno) { revisar.disabled = false; formato.disabled = false; } }
  }
  filtrar.addEventListener('change', pinta); formato.addEventListener('change', actualiza);
  openModal({ title: 'Revisar y compartir', size: 'modal-lg', body: h('div', null, h('label', null, 'Formato para compartir', formato), consejo, opcionNotas, estado, h('label', null, 'Mostrar hallazgos', filtrar), lista), foot: [h('button', { class: 'btn', onclick: closeModal }, 'Cancelar'), revisar, descargar], onclose: () => { cerrado = true; turno++; } });
  actualiza();
}
return { openCompartir, revisaSalida };
})();
