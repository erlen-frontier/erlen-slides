/* ==== 84-calidad.js ==== */
'use strict';
/* ================= control de calidad científica =================
   Reglas pequeñas y explicables para que una figura conserve contexto:
   datos válidos, ejes nombrados, escala compatible, procedencia y un pie.
   Son avisos locales, no una afirmación sobre la validez del experimento. */

function calidadCientifica(deck) {
  const d = deck || S.deck;
  const fallos = [];
  const add = (grado, i, qué, cómo, bid) => fallos.push({ grado, i, qué, cómo, bid });
  d.slides.forEach((sl, i) => zonas(sl).flat().forEach(b => {
    if (!b) return;
    if (b.type === 'chart') {
      let series = [];
      try { series = chartSeries(b); } catch (e) { add('error', i, 'La gráfica no se puede interpretar', 'Revisa las columnas y vuelve a dibujarla.', b.id); return; }
      const puntos = series.flatMap(s => s.pts || []);
      if (!puntos.length) add('error', i, 'La gráfica no tiene puntos válidos', 'Conserva al menos dos filas numéricas antes de presentar.', b.id);
      if (!(b.xlabel || '').trim()) add('aviso', i, 'La gráfica no nombra el eje horizontal', 'Indica magnitud y unidad, por ejemplo «Tiempo (s)».', b.id);
      if (!(b.ylabel || '').trim()) add('aviso', i, 'La gráfica no nombra el eje vertical', 'Indica magnitud y unidad, por ejemplo «Señal (V)».', b.id);
      if ((b.xlabel || '').trim() && !/[([\[{]/.test(b.xlabel)) add('sugerencia', i, 'El eje horizontal no muestra una unidad', 'Añádela si aplica, por ejemplo «Tiempo (s)».', b.id);
      if ((b.ylabel || '').trim() && !/[([\[{]/.test(b.ylabel)) add('sugerencia', i, 'El eje vertical no muestra una unidad', 'Añádela si aplica, por ejemplo «Señal (V)».', b.id);
      if (!(b.caption || '').trim()) add('sugerencia', i, 'La gráfica no tiene pie', 'Resume qué representa y qué debe mirar la audiencia.', b.id);
      if (!b.fuente) add('sugerencia', i, 'La gráfica no declara procedencia', 'Añade archivo, fecha, huella o instrumento en Figura viva.', b.id);
      if (b.logX && puntos.some(p => !isFinite(p[0]) || p[0] <= 0)) add('error', i, 'La escala logarítmica de x contiene valores no positivos', 'Corrige los datos o usa una escala lineal.', b.id);
      if (b.logY && puntos.some(p => !isFinite(p[1]) || p[1] <= 0)) add('error', i, 'La escala logarítmica de y contiene valores no positivos', 'Corrige los datos o usa una escala lineal.', b.id);
      const errores = puntos.filter(p => p.length > 2 && p[2] != null);
      if (errores.some(p => !isFinite(p[2]) || p[2] <= 0)) add('aviso', i, 'Hay barras de error no positivas', 'Usa una incertidumbre numérica mayor que cero o elimina la columna.', b.id);
    }
    if (b.type === 'func') {
      if (!(b.xlabel || '').trim()) add('aviso', i, 'La función no nombra el eje horizontal', 'Indica la variable y su unidad.', b.id);
      if (!(b.ylabel || '').trim()) add('aviso', i, 'La función no nombra el eje vertical', 'Indica la magnitud y su unidad.', b.id);
      if (!(b.caption || '').trim()) add('sugerencia', i, 'La función no tiene pie', 'Explica el modelo y sus supuestos en una línea.', b.id);
    }
    if (['image', 'galeria', 'video', 'estruct', 'montaje', 'geo'].includes(b.type) && b.src && !b.fuente)
      add('sugerencia', i, 'La figura no declara procedencia', 'Conserva la fuente original o describe que es una ilustración.', b.id);
    if (b.type === 'table' && b.header && b.rows?.length > 1 && b.rows[0].some(x => !String(x || '').trim()))
      add('aviso', i, 'La tabla tiene encabezados vacíos', 'Nombra cada columna y escribe la unidad cuando corresponda.', b.id);
  }));
  return fallos;
}

/* ---------- salidas científicas ----------
   La diapositiva completa sigue teniendo una salida PNG para compartirla.
   Cuando se necesita reutilizar una figura en un artículo, el bloque de datos
   puede viajar como SVG autónomo: conserva trazos, texto y etiquetas, y no
   depende del CSS de Erlen. */
function bloqueCientificoActual(deck) {
  const d = deck || S.deck;
  const seleccionado = S.selBlock && findBlock(S.selBlock, d);
  if (seleccionado && ['chart', 'func'].includes(seleccionado.block.type)) return seleccionado.block;
  const sl = d.slides[S.cur] || d.slides[0];
  if (!sl) return null;
  for (const arr of zonas(sl)) {
    const b = arr.find(x => x && ['chart', 'func'].includes(x.type));
    if (b) return b;
  }
  return null;
}

function exportFiguraSVG() {
  flushEdicion();
  const b = bloqueCientificoActual(S.deck);
  if (!b) { toast('Selecciona una gráfica o función para exportarla como SVG', 'warn'); return false; }
  try {
    const rendered = renderChart(Object.assign({}, b, { capas: false, despues: null }), S.deck, 'export', 1200);
    const svg = rendered && rendered.matches && rendered.matches('svg') ? rendered : rendered?.querySelector?.('svg');
    if (!svg) throw new Error('La gráfica no produjo un SVG');
    /* El namespace de un elemento creado con createElementNS ya lo conserva el
       serializador; quitar el atributo explícito evita que JSDOM/WebKit lo
       duplique al convertir el nodo a XML. */
    svg.removeAttribute('xmlns');
    svg.setAttribute('version', '1.1');
    svg.setAttribute('font-family', 'Arial, Helvetica, sans-serif');
    const meta = document.createElementNS(SVGNS, 'metadata');
    meta.textContent = JSON.stringify({
      schema: 'erlen-scientific-figure-v1',
      app: 'Erlen Slides', version: window.ERLEN?.version || 'desconocida',
      generatedAt: new Date().toISOString(), title: b.title || '',
      caption: b.caption || '', source: b.fuente || null
    });
    svg.insertBefore(meta, svg.firstChild);
    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(svg);
    const nombre = deckSlug() + '-figura-' + String(b.id || 'grafica').slice(0, 8) + '.svg';
    downloadFile(nombre, xml, 'image/svg+xml;charset=utf-8');
    toast('SVG científico descargado');
    return true;
  } catch (e) {
    toast('No se pudo generar el SVG; usa la exportación a PDF', 'warn');
    window.ErlenDiagnostico?.reportar('exportar-svg');
    return false;
  }
}

function informeExportacion(deck) {
  const d = deck || S.deck;
  const warnings = [];
  const add = (code, severity, message, slides, formats) => warnings.push({ code, severity, message, slides: [...new Set(slides || [])], formats });
  const figuras = [];
  d.slides.forEach((sl, i) => zonas(sl).flat().forEach(b => {
    if (!b) return;
    if (['chart', 'func', 'image', 'galeria', 'video', 'smart', 'estruct', 'montaje', 'geo'].includes(b.type)) figuras.push({ b, i });
    if (b.type === 'video') add('video-static-export', 'warning', 'El vídeo se omite en PDF, Beamer y PowerPoint; conserva el enlace para la presentación en vivo.', [i + 1], ['pdf', 'beamer', 'pptx']);
    if (b.src && /^https?:\/\//i.test(String(b.src))) add('external-resource', 'warning', 'La figura usa un recurso externo; puede no aparecer sin conexión o bloquearse al abrir el archivo.', [i + 1], ['pdf', 'beamer', 'pptx', 'svg']);
  }));
  const fallos = calidadCientifica(d);
  fallos.forEach(f => add('scientific-audit-' + f.grado, f.grado === 'error' ? 'error' : 'warning', f.qué + '. ' + f.cómo, [f.i + 1], ['pdf', 'beamer', 'pptx', 'svg']));
  const charts = figuras.filter(x => ['chart', 'func'].includes(x.b.type));
  if (charts.length) add('pptx-rasterized-figures', 'info', 'PowerPoint conserva el texto y las tablas editables, pero las gráficas se insertan como imagen.', charts.map(x => x.i + 1), ['pptx']);
  if (figuras.some(x => x.b.type === 'image')) add('image-format-dependency', 'info', 'Las imágenes conservan su formato original; comprueba resolución y licencia antes de compartir.', figuras.filter(x => x.b.type === 'image').map(x => x.i + 1), ['pdf', 'beamer', 'pptx']);
  return {
    schema: 'erlen-export-report-v1',
    app: 'Erlen Slides', version: window.ERLEN?.version || 'desconocida',
    generatedAt: new Date().toISOString(), deck: { title: d.meta?.title || '', slides: d.slides.length },
    formats: {
      pdf: 'Vectorial mediante impresión del navegador; revisa fuentes y gráficos de fondo.',
      beamer: 'Vectorial y editable en Overleaf; las figuras se descargan por separado.',
      pptx: 'Texto y tablas editables; las gráficas se insertan como imagen.',
      svg: 'Figura científica independiente para gráficas y funciones seleccionadas.'
    }, warnings,
    summary: { errors: warnings.filter(x => x.severity === 'error').length, warnings: warnings.filter(x => x.severity === 'warning').length, info: warnings.filter(x => x.severity === 'info').length }
  };
}

function exportInformeExportacion() {
  flushEdicion();
  const informe = informeExportacion(S.deck);
  downloadFile(deckSlug() + '-informe-exportacion.json', JSON.stringify(informe, null, 2), 'application/json');
  toast('Informe de exportación descargado');
  return informe;
}

/* Plantilla ligera basada en afirmación-evidencia: usa zonas existentes para no
   introducir un layout nuevo ni cambiar el formato JSON. */
function nuevaAfirmacionEvidencia() {
  const afirmacion = Object.assign(newBlock('text'), {
    text: 'Escribe aquí una afirmación comprobable.', size: 'l'
  });
  const evidencia = Object.assign(newBlock('chart'), {
    data: 'x,y\n1,2\n2,3\n3,4', xlabel: 'Variable independiente (unidad)',
    ylabel: 'Resultado (unidad)', title: 'Evidencia ilustrativa',
    caption: 'Describe qué muestran estos datos y su limitación.',
    fuente: { nombre: 'ilustrativo', cuando: new Date().toISOString().slice(0, 10), n: 3, huella: 'ilustrativo' }
  });
  const slide = slidePlantilla('twocol', 'Escribe la afirmación principal', [[afirmacion], [evidencia]]);
  slide.notes = 'Explica el resultado, la incertidumbre y el límite de la evidencia.';
  S.deck.slides.splice(S.cur + 1, 0, slide); S.cur++; S.selBlock = afirmacion.id; S.tab = 'bloque';
  commit(); renderAll(); toast('Plantilla de afirmación y evidencia añadida');
}

function openCalidadCientifica() {
  const cuerpo = h('div', null, h('p', { class: 'hint' }, 'Revisando datos, ejes, escalas y procedencia…'));
  openModal({ title: 'Calidad científica', size: 'modal-lg', body: cuerpo,
    foot: [h('button', { class: 'btn btn-pri', onclick: closeModal }, 'Cerrar')] });
  setTimeout(() => {
    const fallos = calidadCientifica(S.deck);
    cuerpo.replaceChildren();
    const cuenta = g => fallos.filter(x => x.grado === g).length;
    cuerpo.append(h('div', { class: 'rv-marcador' },
      h('div', { class: 'rv-m rv-error' }, h('b', null, String(cuenta('error'))), h('span', null, 'errores')), 
      h('div', { class: 'rv-m rv-aviso' }, h('b', null, String(cuenta('aviso'))), h('span', null, 'avisos')),
      h('div', { class: 'rv-m rv-sug' }, h('b', null, String(cuenta('sugerencia'))), h('span', null, 'sugerencias'))));
    if (!fallos.length) {
      cuerpo.append(h('p', { style: 'margin-top:14px;line-height:1.6' }, 'No encontré problemas de datos, escalas, ejes o procedencia en las figuras revisadas. Esta revisión no sustituye la validación del experimento.'));
      return;
    }
    ['error', 'aviso', 'sugerencia'].forEach(g => {
      const xs = fallos.filter(x => x.grado === g); if (!xs.length) return;
      cuerpo.append(h('span', { class: 'sublabel', style: 'margin:16px 0 6px' }, g === 'error' ? 'Hay que arreglarlo' : g === 'aviso' ? 'Conviene revisarlo' : 'Se puede mejorar'));
      xs.forEach(f => cuerpo.append(h('button', { class: 'rv-fila g-' + g, onclick: () => { closeModal(); S.cur = f.i; S.selBlock = f.bid || null; S.tab = f.bid ? 'bloque' : 'slide'; renderAll(); } },
        h('span', { class: 'rv-i' }, String(f.i + 1)), h('span', { class: 'rv-tx' }, h('b', null, f.qué), h('span', null, f.cómo)))));
    });
  }, 60);
}
