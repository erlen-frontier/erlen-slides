/* SPDX-License-Identifier: AGPL-3.0-only */
window.ERLEN_FIGURAS = (() => {
'use strict';
async function openFiguraCapas(original) {
  flushEdicion(); const deck = S.deck, slide = curSlide();
  if (original?.locked) { toast('Desbloquea la figura antes de editarla.', 'warn'); return; }
  const core = await extensionSlides('figurascore');
  if (S.deck !== deck || curSlide() !== slide) return;
  let modelo = original?.figura ? core.validaFigura(original.figura) : { v: 1, width: 960, height: 540, background: '#ffffff', objects: [] };
  /* Adapting an existing scientific image creates a new block. The source
     image, measurements and scientific model remain on the original block. */
  if (original?.src && !original.figura) {
    let src = original.src;
    if (!/^data:image\//i.test(src)) throw new Error('Incrusta la imagen antes de añadir anotaciones.');
    if (!core.imagenFigura(src)) {
      if (!/^data:image\/svg\+xml[;,]/i.test(src)) throw new Error('Usa una imagen PNG, JPEG, WebP o SVG incrustada.');
      const xml = src.includes(';base64,') ? atob(src.split(',')[1]) : decodeURIComponent(src.slice(src.indexOf(',') + 1));
      const doc = new DOMParser().parseFromString(xml, 'image/svg+xml');
      if (doc.querySelector('parsererror,script,foreignObject,iframe') || [...doc.querySelectorAll('*')].some(n => [...n.attributes].some(a =>
        a.name !== 'xmlns' && a.prefix !== 'xmlns' && (/^on/i.test(a.name) || (/href$/i.test(a.name) && !a.value.startsWith('#') && !core.imagenFigura(a.value)) || /(?:https?:|javascript:|blob:|@import|url\(\s*["']?(?!#))/i.test(a.value))) || /@import|url\(\s*["']?(?!#)/i.test(n.localName === 'style' ? n.textContent : ''))) throw new Error('El SVG contiene recursos externos o contenido no compatible. Usa una copia PNG.');
      const im = await leeImagen(src);
      const w = im.naturalWidth || 960, ht = im.naturalHeight || 540, scale = Math.min(1600 / w, 1200 / ht);
      const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(w * scale)); cv.height = Math.max(1, Math.round(ht * scale));
      cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); src = cv.toDataURL('image/png');
    }
    const im = await leeImagen(src), w = 850, ht = Math.min(470, w * im.naturalHeight / im.naturalWidth), wi = ht * im.naturalWidth / im.naturalHeight;
    modelo.objects.push({ id: uid(), kind: 'image', x: (960 - wi) / 2, y: (540 - ht) / 2, width: wi, height: ht, angle: 0, fill: 'transparent', stroke: 'transparent', strokeWidth: 0, src, locked: true });
  }
  if (S.deck !== deck || curSlide() !== slide || (original && findBlock(original.id)?.block !== original)) return;
  let cerrado = false, canvas = null, seleccionado = modelo.objects.at(-1)?.id || null, pintando = 0;
  const copias = [], futuros = [], fotos = new Map();
  const copia = () => ({ ...modelo, objects: modelo.objects.map(o => ({ ...o })) });
  const estado = h('p', { class: 'hint', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' }, 'Cargando el editor de figuras…');
  const nombre = h('input', { class: 'field', value: String(original?.alt || original?.caption || '').slice(0, 500), maxlength: 500 });
  const pie = h('input', { class: 'field', value: original?.caption || '', maxlength: 1000 });
  const lista = h('div', { class: 'figura-objetos', role: 'group', 'aria-label': 'Objetos de la figura, de fondo a frente' });
  const lienzo = h('canvas'), visor = h('div', { class: 'figura-visor', 'aria-hidden': 'true' }, lienzo);
  visor.style.setProperty('--figura-ar', modelo.width + '/' + modelo.height);
  const controles = h('div', { class: 'figura-props' });
  const medidasCampos = h('div', { class: 'figura-props' });
  const medidas = h('details', { class: 'figura-medidas' }, h('summary', null, 'Posición, tamaño y giro'), medidasCampos);
  const campos = {};
  const actual = () => modelo.objects.find(o => o.id === seleccionado);
  const boton = (texto, fn) => h('button', { class: 'btn', type: 'button', onclick: fn }, texto);
  const undo = boton('Deshacer', () => { if (copias.length) { futuros.push(copia()); modelo = copias.pop(); refresca(); } });
  const redo = boton('Rehacer', () => { if (futuros.length) { copias.push(copia()); modelo = futuros.pop(); refresca(); } });
  function cambia(fn, mensaje) {
    const antes = copia();
    try { fn(); modelo = core.validaFigura(modelo); copias.push(antes); if (copias.length > 50) copias.shift(); futuros.length = 0; refresca(); if (mensaje) estado.textContent = mensaje; }
    catch (e) { modelo = antes; estado.textContent = e.message; refresca(); }
  }
  for (const [key, texto, min, max] of [['x', 'Posición horizontal', -1600, 3200], ['y', 'Posición vertical', -1200, 2400], ['width', 'Anchura', 1, 3200], ['height', 'Altura', 1, 2400], ['angle', 'Giro en grados', -180, 180], ['fontSize', 'Tamaño de letra', 8, 160]]) {
    const input = h('input', { class: 'field', type: 'number', min, max, step: 1 }); campos[key] = input;
    input.addEventListener('change', () => { const o = actual(); if (o && !o.locked) cambia(() => { o[key] = input.valueAsNumber; }); });
    (key === 'fontSize' ? controles : medidasCampos).append(h('label', null, texto, input));
  }
  const texto = h('textarea', { class: 'field', rows: 3, maxlength: 2000 }); campos.text = texto;
  const ponTexto = () => { const o = actual(); if (!cerrado && o?.kind === 'text' && !o.locked && o.text !== texto.value) cambia(() => { o.text = texto.value; }); };
  texto.addEventListener('change', ponTexto); texto.addEventListener('input', deb(ponTexto, 180));
  controles.append(h('label', { class: 'figura-texto' }, 'Texto del objeto', texto));
  const color = h('input', { type: 'color', value: '#17202a' }); campos.color = color;
  color.addEventListener('change', () => { const o = actual(); if (o && !o.locked) cambia(() => { o.kind === 'arrow' ? o.stroke = color.value : o.fill = color.value; }); });
  controles.append(h('label', null, 'Color del objeto', color));
  const fondo = h('select', { class: 'field' }, h('option', { value: '#ffffff' }, 'Blanco'), h('option', { value: 'transparent' }, 'Transparente'), h('option', { value: '#17202a' }, 'Oscuro')); fondo.value = modelo.background;
  fondo.addEventListener('change', () => cambia(() => { modelo.background = fondo.value; }));
  const bloquear = boton('Bloquear objeto', () => { const o = actual(); if (o) cambia(() => { o.locked = !o.locked; }); });
  const borrar = boton('Eliminar objeto', () => { const o = actual(); if (o && !o.locked) cambia(() => { modelo.objects = modelo.objects.filter(x => x.id !== o.id); seleccionado = modelo.objects.at(-1)?.id || null; }, 'Objeto eliminado. Puedes deshacer.'); });
  const mover = (dx, dy) => { const o = actual(); if (o && !o.locked) cambia(() => { o.x += dx; o.y += dy; }); };
  const movimiento = h('div', { class: 'flujo-acciones' }, [['Mover a la izquierda', -10, 0], ['Mover a la derecha', 10, 0], ['Mover hacia arriba', 0, -10], ['Mover hacia abajo', 0, 10]].map(([n, x, y]) => boton(n, () => mover(x, y))));
  const alFrente = boton('Traer al frente', () => { const o = actual(); if (o && !o.locked) cambia(() => { modelo.objects = modelo.objects.filter(x => x !== o).concat(o); }); });
  const alFondo = boton('Enviar al fondo', () => { const o = actual(); if (o && !o.locked) cambia(() => { modelo.objects = [o, ...modelo.objects.filter(x => x !== o)]; }); });
  const seleccionadoTitulo = h('p', { class: 'hint' }, 'Selecciona un objeto para editarlo.');
  const panel = h('div', { class: 'figura-panel' }, h('h3', null, 'Objetos'), lista, seleccionadoTitulo, controles, medidas, movimiento, h('div', { class: 'flujo-acciones' }, alFrente, alFondo, bloquear, borrar));
  const insertar = kind => cambia(() => {
    const o = { id: uid(), kind, x: 80, y: 80, width: kind === 'text' ? 400 : 200, height: kind === 'text' ? 60 : 120, angle: 0, fill: kind === 'text' ? '#17202a' : '#dcecf5', stroke: '#17202a', strokeWidth: kind === 'text' ? 0 : 3, locked: false };
    if (kind === 'text') { o.text = 'Escribe tu texto'; o.fontSize = 32; }
    modelo.objects.push(o); seleccionado = o.id;
  }, 'Objeto añadido. Edita sus propiedades o muévelo en el lienzo.');
  const archivo = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', 'aria-label': 'Añadir imagen a la figura' });
  archivo.addEventListener('change', async () => {
    const f = archivo.files[0]; if (!f) return;
    try {
      if (f.size > 8 * 1048576) throw new Error('La imagen supera 8 MiB. Usa una copia más pequeña.');
      const src = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(new Error('No se pudo leer la imagen.')); r.readAsDataURL(f); });
      if (!core.imagenFigura(src)) throw new Error('Selecciona una imagen PNG, JPEG o WebP.');
      const im = await leeImagen(src); if (cerrado) return;
      cambia(() => { const o = { id: uid(), kind: 'image', x: 80, y: 80, width: 400, height: Math.min(400, 400 * im.naturalHeight / im.naturalWidth), angle: 0, src, fill: 'transparent', stroke: 'transparent', strokeWidth: 0, locked: false }; modelo.objects.push(o); seleccionado = o.id; }, 'Imagen añadida. El archivo original se conserva.');
    } catch (e) { if (!cerrado) estado.textContent = e.message; }
    finally { archivo.value = ''; }
  });
  const guardar = h('button', { class: 'btn btn-pri', disabled: true, onclick: () => {
    if (cerrado || S.deck !== deck || curSlide() !== slide || (original && (findBlock(original.id)?.block !== original || original.locked))) { estado.textContent = 'La diapositiva cambió. Abre de nuevo el editor de figuras.'; return; }
    if (!nombre.value.trim()) { estado.textContent = 'Describe qué muestra la figura para quien no puede verla.'; nombre.focus(); return; }
    if (!modelo.objects.length) { estado.textContent = 'Añade al menos un objeto a la figura.'; return; }
    try {
      const fig = core.validaFigura(modelo); if (JSON.stringify(fig).length > 25 * 1048576) throw new Error('La figura es demasiado grande. Usa imágenes más pequeñas.');
      const b = original?.figura ? original : newBlock('image');
      if (b !== original && esFuenteCatalogo(original?.catalogo)) {
        b.catalogo = deepCopy(original.catalogo);
        b.catalogo.changes = [...(Array.isArray(b.catalogo.changes) ? b.catalogo.changes : []), 'Adaptada como copia anotada en Tabula'];
      }
      let svg = core.svgFigura(fig, nombre.value.trim());
      if (esFuenteCatalogo(b.catalogo)) svg = svgConCreditosCatalogo(svg, b.catalogo);
      Object.assign(b, { figura: fig, src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), alt: nombre.value.trim(), caption: pie.value.trim(), w: b.w || 85 });
      if (b !== original) insertaFiguraNueva(b, slide);
      closeModal(); S.selBlock = b.id; commit(); toast('Figura guardada con sus objetos editables.');
    } catch (e) { estado.textContent = e.message; }
  } }, original?.figura ? 'Guardar figura' : original ? 'Insertar copia anotada' : 'Insertar figura');
  const dialogo = openModal({ title: original?.figura ? 'Editar figura por capas' : 'Crear figura por capas', size: 'modal-lg figura-modal', body: h('div', null,
    h('p', { class: 'hint' }, original && !original.figura ? 'Añade anotaciones a una copia. La figura científica original y sus datos permanecen intactos.' : 'Añade objetos y selecciónalos en la lista o en el lienzo. Todos los cambios se pueden hacer con el teclado.'),
    !original && !zonasDe(slide.layout) ? h('p', { class: 'hint' }, 'Al insertar se creará una diapositiva nueva para la figura. Cancelar conserva la portada o sección actual.') : null,
    h('div', { class: 'figura-descripcion' }, h('label', null, 'Descripción accesible (obligatoria)', nombre), h('label', null, 'Pie de figura (opcional)', pie), h('label', null, 'Fondo', fondo)),
    h('div', { class: 'flujo-acciones' }, [['Texto', 'text'], ['Rectángulo', 'rect'], ['Elipse', 'circle'], ['Flecha', 'arrow']].map(([n, k]) => boton('Añadir ' + n.toLowerCase(), () => insertar(k))), undo, redo),
    h('label', null, 'Añadir una imagen', archivo), estado, h('div', { class: 'figura-trabajo' }, visor, panel)),
    foot: [h('button', { class: 'btn', onclick: closeModal }, 'Cancelar'), guardar], onclose: () => { cerrado = true; pintando++; canvas?.dispose(); } });
  dialogo.addEventListener('keydown', e => {
    if (!(e.ctrlKey || e.metaKey) || e.target.matches('input,textarea') || !['z', 'y'].includes(e.key.toLowerCase())) return;
    e.preventDefault(); e.stopPropagation(); (e.key.toLowerCase() === 'y' || e.shiftKey ? redo : undo).click();
  });
  async function refresca() {
    if (cerrado) return;
    if (!actual()) seleccionado = modelo.objects.at(-1)?.id || null;
    const o = actual(); seleccionadoTitulo.textContent = o ? 'Objeto seleccionado: ' + etiqueta(o) + (o.locked ? ' · bloqueado' : '') : 'Selecciona un objeto para editarlo.';
    conFocoConservado(() => lista.replaceChildren(...modelo.objects.map(x => h('button', { class: 'btn', type: 'button', 'data-foco': x.id, 'aria-pressed': x.id === seleccionado ? 'true' : 'false', onclick: () => { seleccionado = x.id; refresca(); estado.textContent = 'Seleccionado: ' + etiqueta(x); } }, etiqueta(x) + (x.locked ? ' · bloqueado' : '')))), lista);
    for (const [key, campo] of Object.entries(campos)) {
      const textoProp = key === 'fontSize' || key === 'text'; campo.disabled = !o || o.locked || (textoProp && o.kind !== 'text') || (key === 'color' && o.kind === 'image') || (o.kind === 'text' && ['width', 'height'].includes(key));
      if (textoProp) campo.closest('label').hidden = o?.kind !== 'text';
      if (key === 'color') campo.closest('label').hidden = o?.kind === 'image';
      campo.value = key === 'color' ? (o?.kind === 'arrow' ? o.stroke : o?.fill) === 'transparent' ? '#17202a' : (o?.kind === 'arrow' ? o.stroke : o?.fill) || '#17202a' : o?.[key] ?? '';
    }
    bloquear.disabled = !o; bloquear.textContent = o?.locked ? 'Desbloquear objeto' : 'Bloquear objeto';
    [borrar, alFrente, alFondo, ...movimiento.querySelectorAll('button')].forEach(b => { b.disabled = !o || o.locked; });
    undo.disabled = !copias.length; redo.disabled = !futuros.length; fondo.value = modelo.background;
    if (!canvas) return;
    const turno = ++pintando; canvas.clear(); canvas.backgroundColor = modelo.background;
    const F = await extensionSlides('fabric');
    for (const x of modelo.objects) {
      if (cerrado || turno !== pintando) return;
      const opt = { left: x.x, top: x.y, angle: x.angle, originX: 'left', originY: 'top', fill: x.fill, stroke: x.stroke, strokeWidth: x.strokeWidth, selectable: !x.locked, evented: !x.locked, objectCaching: false, lockScalingFlip: true };
      let obj;
      if (x.kind === 'rect') obj = new F.Rect({ ...opt, width: x.width, height: x.height });
      if (x.kind === 'circle') obj = new F.Ellipse({ ...opt, rx: x.width / 2, ry: x.height / 2 });
      if (x.kind === 'text') obj = new F.FabricText(x.text, { ...opt, fontFamily: 'Arial', fontSize: x.fontSize, lineHeight: 1.2, hasControls: false });
      if (x.kind === 'arrow') obj = new F.Path(`M0 ${x.height / 2} H${Math.max(0, x.width - 16)} M${Math.max(0, x.width - 16)} ${Math.max(0, x.height / 2 - 10)} L${x.width} ${x.height / 2} L${Math.max(0, x.width - 16)} ${x.height / 2 + 10}`, { ...opt, fill: 'transparent' });
      if (x.kind === 'image') {
        if (!fotos.has(x.src)) fotos.set(x.src, leeImagen(x.src));
        const im = await fotos.get(x.src); if (cerrado || turno !== pintando) return;
        obj = new F.FabricImage(im, { ...opt, scaleX: x.width / im.naturalWidth, scaleY: x.height / im.naturalHeight });
      }
      obj.__id = x.id; obj.__width = x.width; obj.__height = x.height; obj.__sx = obj.scaleX; obj.__sy = obj.scaleY;
      canvas.add(obj); if (x.id === seleccionado && !x.locked) canvas.setActiveObject(obj);
    }
    canvas.requestRenderAll();
  }
  try {
    const F = await extensionSlides('fabric'); if (cerrado) return;
    canvas = new F.Canvas(lienzo, { width: modelo.width, height: modelo.height, selection: false, preserveObjectStacking: true, enableRetinaScaling: false });
    canvas.upperCanvasEl.removeAttribute('tabindex'); canvas.upperCanvasEl.setAttribute('aria-hidden', 'true');
    const seleccion = e => { const id = e.selected?.[0]?.__id; if (id && id !== seleccionado) { seleccionado = id; refresca(); estado.textContent = 'Seleccionado: ' + etiqueta(actual()); } };
    canvas.on('selection:created', seleccion); canvas.on('selection:updated', seleccion);
    canvas.on('object:modified', ({ target }) => { const o = modelo.objects.find(x => x.id === target?.__id); if (!o || o.locked) return; cambia(() => { o.x = Math.round(target.left); o.y = Math.round(target.top); o.angle = ((Math.round(target.angle) + 540) % 360) - 180; o.width = Math.max(1, Math.round(target.__width * Math.abs(target.scaleX / target.__sx))); o.height = Math.max(1, Math.round(target.__height * Math.abs(target.scaleY / target.__sy))); }, 'Objeto actualizado. Puedes deshacer.'); });
    await refresca(); guardar.disabled = false; estado.textContent = 'Listo. Usa la lista de objetos y los controles, o arrastra en el lienzo.';
  } catch (e) { if (!cerrado) estado.textContent = 'No se pudo abrir el lienzo: ' + e.message; }
  function etiqueta(o) { return ({ text: 'Texto', rect: 'Rectángulo', circle: 'Elipse', arrow: 'Flecha', image: 'Imagen' }[o?.kind] || 'Objeto') + (o?.text ? ': ' + o.text.slice(0, 45) : ''); }
}
function leeImagen(src) { return new Promise((resolve, reject) => { const im = new Image(); im.onload = () => resolve(im); im.onerror = () => reject(new Error('No se pudo leer la imagen.')); im.src = src; }); }
return { openFiguraCapas };
})();
