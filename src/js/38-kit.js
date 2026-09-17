/* ==== 38-kit.js ==== */
'use strict';
/* ================= comprobación del archivo y kit de defensa =================
   El efecto IKEA solo se sostiene si el trabajo termina bien. Esto es lo que
   separa «lo exporté» de «me sirvió el día de la defensa». */

/* Ancho nativo de un proyector normal: por debajo de eso la imagen se ve
   interpolada aunque en la laptop se vea perfecta. */
const PX_PROYECTOR = 1920;

function tamNatural(src) {
  return new Promise(res => {
    const im = new Image();
    im.onload = () => res([im.naturalWidth, im.naturalHeight]);
    im.onerror = () => res(null);
    im.src = src;
  });
}

async function compruebaArchivo() {
  const m = S.deck.meta, [W] = slideDims(S.deck);
  const r = [];
  const ok = (q, d) => r.push({ e: 'ok', q, d });
  const av = (q, d) => r.push({ e: 'aviso', q, d });
  const mal = (q, d) => r.push({ e: 'error', q, d });

  /* --- tipografía --- */
  const fu = fuenteDe(m);
  if (fu.id === 'auto') ok('Tipografía del tema', 'Se usa la del tema y viaja tal cual al código Beamer.');
  else if (fu.propia) ok('Tipografía ' + fu.n, 'Es una de las de LaTeX y va dentro de la app: la pantalla y el PDF muestran la misma letra.');
  else av('Tipografía ' + fu.n, 'Viene de Google Fonts: al imprimir a PDF conviene revisar que se haya incrustado, y en LaTeX hace falta que el paquete esté instalado.');

  /* --- imágenes --- */
  /* El SVG es vectorial: no se pixela nunca, así que no entra en la cuenta. */
  const esVector = src => /^data:image\/svg/i.test(src || '');
  const imgs = allImageBlocks().filter(b => b.src && !esVector(b.src));
  const vectores = allImageBlocks().filter(b => b.src && esVector(b.src)).length;
  let flojas = [];
  for (const b of imgs) {
    const t = await tamNatural(b.src);
    if (!t) continue;
    const anchoEnPantalla = (b.w || 70) / 100 * W;
    const necesarios = anchoEnPantalla / W * PX_PROYECTOR;
    if (t[0] < necesarios * 0.75) flojas.push({ b, tiene: t[0], necesita: Math.round(necesarios) });
  }
  if (!imgs.length) ok('Figuras', vectores
    ? (vectores === 1 ? 'La única figura es vectorial' : 'Las ' + vectores + ' figuras son vectoriales') + ': se ven nítidas a cualquier tamaño.'
    : 'La presentación no lleva imágenes de mapa de bits.');
  else if (!flojas.length) ok(imgs.length + (imgs.length === 1 ? ' figura' : ' figuras'), 'Todas tienen resolución de sobra para un proyector de 1920 px.');
  else mal(flojas.length + (flojas.length === 1 ? ' figura borrosa' : ' figuras borrosas'),
    flojas.map(f => (f.b.caption || 'sin pie') + ': ' + f.tiene + ' px de ancho, hacen falta ' + f.necesita).join(' · ')
    + '. Vuelve a exportarla del equipo con más resolución.');

  /* --- videos --- */
  const vids = [];
  S.deck.slides.forEach(sl => zonas(sl).flat().forEach(b => { if (b.type === 'video') vids.push(b); }));
  const sinPoster = vids.filter(b => b.mime !== 'image/gif' && !b.poster);
  if (!vids.length) ok('Sin video', 'Nada que pueda fallar por códecs en la sala.');
  else if (!sinPoster.length) ok(vids.length + (vids.length === 1 ? ' video' : ' videos'), 'Todos tienen su primer fotograma guardado, así que el PDF impreso no queda en blanco.');
  else av(sinPoster.length + (sinPoster.length === 1 ? ' video sin fotograma' : ' videos sin fotograma'),
    'En el PDF esos huecos saldrán vacíos. Ábrelos una vez en el editor para que se capture el fotograma.');

  /* --- peso --- */
  const bytes = JSON.stringify(S.deck).length;
  const mb = bytes / 1048576;
  if (mb < 8) ok('Pesa ' + mb.toFixed(1) + ' MB', 'Cabe sin problema en un correo o en una memoria USB.');
  else av('Pesa ' + mb.toFixed(1) + ' MB', 'Para enviarlo por correo conviene bajar la resolución de las imágenes o quitar el video.');

  /* --- páginas esperadas --- */
  let pgs = 0;
  S.deck.slides.forEach((sl, i) => { pgs += 1 + stepCount(S.deck, i); });
  ok('El PDF tendrá unas ' + pgs + ' páginas', S.deck.slides.length + ' diapositivas más los pasos de las apariciones. Si al imprimir sale otra cifra, algo se quedó fuera.');

  /* --- formato --- */
  if (m.aspect === '43') av('Formato 4:3', 'Es el formato viejo. Si el proyector es panorámico quedarán franjas negras a los lados; el kit incluye una versión 16:9 por si acaso.');
  else ok('Formato 16:9', 'El habitual hoy. El kit incluye además una versión 4:3 por si el proyector del aula es antiguo.');

  /* --- pendientes --- */
  const pd = cuentaPendientes();
  if (pd) av(pd + (pd === 1 ? ' pendiente sin marcar' : ' pendientes sin marcar'), 'Los anotaste tú. Revísalos antes de dar la presentación por terminada.');

  return r;
}

function openComprobacion() {
  const cuerpo = h('div');
  cuerpo.append(h('p', { class: 'hint', style: 'margin-top:0' }, 'Comprobando…'));
  openModal({ title: 'Comprobación del archivo', size: 'modal-sm', body: cuerpo,
    foot: [h('button', { class: 'btn btn-pri', onclick: closeModal }, 'Listo')] });
  compruebaArchivo().then(rs => {
    cuerpo.innerHTML = '';
    const errores = rs.filter(x => x.e === 'error').length, avisos = rs.filter(x => x.e === 'aviso').length;
    cuerpo.append(h('p', { class: 'hint', style: 'margin-top:0' },
      errores ? 'Hay ' + errores + (errores === 1 ? ' cosa que arreglar' : ' cosas que arreglar') + ' antes de presentar.'
        : avisos ? 'Nada grave; ' + avisos + (avisos === 1 ? ' punto merece un vistazo.' : ' puntos merecen un vistazo.')
        : 'Todo en orden para el día de la presentación.'));
    rs.forEach(x => cuerpo.append(h('div', { class: 'ck-fila ck-' + x.e },
      h('span', { class: 'ck-i' }, x.e === 'ok' ? '✓' : x.e === 'aviso' ? '!' : '✕'),
      h('span', { class: 'ck-tx' }, h('b', null, x.q), h('span', null, x.d)))));
  });
}

/* ---------- 09 · kit de defensa ---------- */
function leemeKit(pgs) {
  const m = S.deck.meta;
  return [
    'KIT DE DEFENSA · ' + (m.title || 'Presentación'),
    'Generado con Erlen el ' + new Date().toLocaleString('es-MX'),
    '',
    'QUÉ HAY AQUÍ',
    '  presentacion.tex       El código Beamer. Se compila en Overleaf o con pdflatex.',
    '  presentacion-4-3.tex   La misma, en formato 4:3, por si el proyector del aula es antiguo.',
    '  proyecto.json          El proyecto entero. Se abre en Erlen con Archivo → Importar.',
    '  guion.html             Tu guion con miniaturas, notas y tiempos. Ábrelo e imprímelo.',
    '  figuras/               Las imágenes sueltas, por si las necesitas en el artículo.',
    '',
    'LO QUE FALTA Y TIENES QUE PONER TÚ',
    '  presentacion.pdf       Expórtalo desde Erlen con Exportar → PDF (imprimir) y',
    '                         guárdalo en esta misma carpeta. Es el archivo que vas a proyectar.',
    '',
    'ANTES DE SALIR DE CASA',
    '  [ ] El PDF está en esta carpeta y abre bien.',
    '  [ ] Una copia en memoria USB, además de la nube.',
    '  [ ] El PDF también en el teléfono o el correo, por si la USB falla.',
    '  [ ] Guion impreso, o en el teléfono.',
    '',
    'EN LA SALA',
    '  [ ] Probar el proyector y el adaptador antes de que entre el jurado.',
    '  [ ] Abrir el PDF en pantalla completa, no el editor.',
    '  [ ] Silenciar notificaciones del sistema.',
    '  [ ] Si el proyector es 4:3, usar la versión 4-3.',
    '',
    'La presentación tiene ' + S.deck.slides.length + ' diapositivas y unas ' + pgs + ' páginas de PDF.',
    (minutosTotales(S.deck) ? 'Tiempo previsto: ' + mmss(minutosTotales(S.deck)) + ' min.' : 'Sin tiempos previstos por diapositiva.')
  ].join('\n');
}

async function kitDefensa() {
  const t = toast('Armando el kit…');
  try {
    let pgs = 0;
    S.deck.slides.forEach((sl, i) => { pgs += 1 + stepCount(S.deck, i); });

    const figuras = [];
    for (let i = 0; i < S.deck.slides.length; i++) for (const b of zonas(S.deck.slides[i]).flat()) {
      if (!['image', 'chart', 'func', 'video', 'galeria', 'estruct', 'montaje', 'geo'].includes(b.type)) continue;
      figuras.push({ id: b.id || null, slide: i + 1, type: b.type, caption: b.caption || null,
        source: b.fuente || null, dataSha256: b.data ? await huellaDe(b.data) : null });
    }
    const provenance = { schema: 'erlen-provenance-v1', application: 'Erlen Slides',
      version: window.ERLEN?.version || 'desconocida', generatedAt: new Date().toISOString(),
      deck: { title: S.deck.meta.title || '', authors: S.deck.meta.authors || '',
        sourceFormat: 'erlen-json-v1' }, figures };

    const otro = deepCopy(S.deck);
    otro.meta.aspect = S.deck.meta.aspect === '43' ? '169' : '43';
    const nombreOtro = 'presentacion-' + (otro.meta.aspect === '43' ? '4-3' : '16-9') + '.tex';

    const archivos = [
      { nombre: 'LEEME.txt', datos: leemeKit(pgs) },
      { nombre: 'presentacion.tex', datos: toBeamer(S.deck) },
      { nombre: nombreOtro, datos: toBeamer(otro) },
      { nombre: 'proyecto.json', datos: JSON.stringify(S.deck, null, 2) },
      { nombre: 'guion.html', datos: guionHTML() },
      { nombre: 'provenance.json', datos: JSON.stringify(provenance, null, 2) + '\n' }
    ];
    const imgs = allImageBlocks().filter(b => b.src);
    if (S.deck.meta.logo) imgs.unshift({ id: 'logo', src: S.deck.meta.logo, caption: 'logo' });
    imgs.forEach(b => {
      const d = dataUriToBlob(b.src);
      if (!d) return;
      const ext = d.mime.includes('svg') ? 'svg' : d.mime.includes('jpeg') ? 'jpg' : 'png';
      const datos = new Uint8Array(0);
      archivos.push({ nombre: 'figuras/' + (b.id === 'logo' ? 'logo' : figName(b)) + '.' + ext, blob: d.blob, datos });
    });
    /* Los archivos que vienen como Blob se pasan a bytes antes de comprimir. */
    for (const a of archivos) if (a.blob) a.datos = new Uint8Array(await a.blob.arrayBuffer());
    const blob = await armaZip(archivos);
    await downloadFile(deckSlug() + '-kit.zip', blob, 'application/zip');
    if (t) t.remove();
    toast('Kit listo · ' + archivos.length + ' archivos. Falta que le pongas el PDF.');
  } catch (e) {
    if (t) t.remove();
    toast('No se pudo armar el kit: ' + e.message, 'warn');
  }
}
