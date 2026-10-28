/* SPDX-License-Identifier: AGPL-3.0-only */
'use strict';

/* Las figuras se insertan como imágenes SVG autónomas y bloques individuales.
   El catálogo se carga al abrirlo, y cada dibujo solo al pedir su vista previa. */
async function openCatalogoFiguras() {
  if (typeof flushEdicion === 'function') flushEdicion();
  const deck = S.deck, slide = curSlide();
  const vigente = () => S.deck === deck && curSlide() === slide && slide.lienzoLibre && zonasDe(slide.layout) > 0;
  if (!vigente()) { toast('Activa el lienzo libre en una diapositiva que admita bloques.', 'warn'); return; }
  let cerrado = false, turno = 0, pagina = 0, actual = null, figura = null, observador = null;
  const carga = h('p', {class:'hint', role:'status', 'aria-live':'polite'}, 'Cargando el catálogo local…');
  const cancelar = h('button', {class:'btn', type:'button', onclick:closeModal}, 'Cancelar');
  const dialogo = openModal({title:'Catálogo científico', size:'modal-lg', body:carga, foot:[cancelar],
    onclose:() => { cerrado = true; turno++; observador?.disconnect(); }});
  let catalogo;
  try { catalogo = await extensionSlides('catalogo'); }
  catch (error) { if (!cerrado) carga.textContent = 'No se pudo abrir el catálogo local. ' + error.message; return; }
  if (cerrado) return;
  if (!vigente()) { carga.textContent = 'La diapositiva cambió. Cierra el catálogo y vuelve a abrirlo.'; return; }

  const porPagina = 24;
  const busca = h('input', { class:'field', type:'search', 'aria-label':'Buscar figuras', placeholder:'Buscar una figura científica…', autocomplete:'off' });
  const areas = [...new Set(catalogo.CATALOGO.map(entry => entry.area))].sort((a,b) => a.localeCompare(b, 'es'));
  const area = h('select', { class:'field', 'aria-label':'Área científica' },
    h('option', {value:''}, 'Todas las áreas'), areas.map(name => h('option', {value:name}, name)));
  const cuenta = h('p', {class:'hint'}), lista = h('div', {class:'catalogo-piezas', 'aria-label':'Figuras encontradas'});
  const anterior = h('button', {class:'btn btn-sm', type:'button', onclick:() => { pagina--; pinta(); }}, 'Anterior');
  const siguiente = h('button', {class:'btn btn-sm', type:'button', onclick:() => { pagina++; pinta(); }}, 'Siguiente');
  const preview = h('div', {class:'catalogo-preview'});
  const datos = h('div', {class:'catalogo-datos'});
  const estado = h('p', {class:'hint', role:'status', 'aria-live':'polite'}, 'Elige una figura para ver su dibujo y sus créditos.');
  const agregar = h('button', {class:'btn btn-pri', type:'button', disabled:true, onclick:inserta}, 'Añadir al lienzo');

  function pinta() {
    const piezas = catalogo.buscarPiezas(busca.value, area.value);
    const paginas = Math.max(1, Math.ceil(piezas.length / porPagina));
    pagina = clamp(pagina, 0, paginas - 1);
    cuenta.textContent = piezas.length + (piezas.length === 1 ? ' figura' : ' figuras') + ' · página ' + (pagina + 1) + ' de ' + paginas;
    anterior.disabled = pagina === 0; siguiente.disabled = pagina + 1 >= paginas;
    if (observador) observador.disconnect();
    lista.replaceChildren(); lista.scrollTop = 0;
    if (typeof IntersectionObserver === 'function') observador = new IntersectionObserver(entries => {
      for (const item of entries) if (item.isIntersecting) {
        observador.unobserve(item.target);
        cargaMiniatura(item.target, catalogo.CATALOGO.find(entry => entry.id === item.target.dataset.id));
      }
    }, {root:lista, rootMargin:'60px'});
    const visibles = piezas.slice(pagina * porPagina, (pagina + 1) * porPagina);
    if (!visibles.length) lista.append(h('p', {class:'hint'}, 'No se encontraron figuras. Prueba otra búsqueda o área.'));
    for (const entry of visibles) {
      const boton = h('button', {class:'catalogo-pieza', type:'button',
        'aria-pressed':String(actual?.id === entry.id), 'data-id':entry.id, onclick:() => selecciona(entry)},
        h('span', {class:'catalogo-miniatura', 'aria-hidden':'true'}),
        h('span', {class:'catalogo-pieza-texto'}, h('span', null, entry.n), h('small', null, entry.area + ' · ' + entry.author)));
      lista.append(boton);
      if (observador) observador.observe(boton); else cargaMiniatura(boton, entry);
    }
  }
  async function cargaMiniatura(boton, entry) {
    if (!entry) return;
    try {
      const resultado = await catalogo.crearFigura(entry.id);
      if (cerrado || !boton.isConnected) return;
      boton.querySelector('.catalogo-miniatura')?.replaceChildren(h('img', {
        src:'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(resultado.svg), alt:''
      }));
    } catch (error) { /* La selección ofrece el error y permite volver a intentarlo. */ }
  }
  function cambiaBusqueda() {
    pagina = 0; actual = null; figura = null; turno++; agregar.disabled = true;
    preview.replaceChildren(); datos.replaceChildren(); estado.textContent = 'Elige una figura para ver su dibujo y sus créditos.'; pinta();
  }
  busca.addEventListener('input', cambiaBusqueda); area.addEventListener('change', cambiaBusqueda);
  async function selecciona(entry) {
    actual = entry; figura = null; const peticion = ++turno; agregar.disabled = true;
    for (const boton of lista.querySelectorAll('[data-id]')) boton.setAttribute('aria-pressed', String(boton.dataset.id === entry.id));
    preview.replaceChildren(); datos.replaceChildren(); estado.textContent = 'Cargando el dibujo…';
    try {
      const resultado = await catalogo.crearFigura(entry.id);
      if (cerrado || peticion !== turno) return;
      if (!vigente()) { estado.textContent = 'La diapositiva cambió. Cierra el catálogo y vuelve a abrirlo.'; return; }
      figura = resultado;
      preview.append(h('img', {src:'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(resultado.svg), alt:resultado.nombre}));
      const fuente = resultado.procedencia;
      datos.append(h('h3', null, resultado.nombre), h('p', null, fuente.author + ' · ' + fuente.license),
        h('p', {class:'hint'}, 'Fuente: ' + fuente.url), h('p', {class:'hint'}, 'Licencia: ' + fuente.licenseURL));
      estado.textContent = 'Figura lista para añadir. Conserva sus créditos al compartir.';
      agregar.disabled = false;
    } catch (error) {
      if (!cerrado && peticion === turno) estado.textContent = 'No se pudo cargar la figura. ' + String(error.message || error);
    }
  }
  function inserta() {
    if (!figura || cerrado || !vigente()) { estado.textContent = 'La diapositiva cambió. Cierra el catálogo y vuelve a abrirlo.'; agregar.disabled = true; return; }
    if (typeof flushEdicion === 'function') flushEdicion();
    if (!vigente()) { estado.textContent = 'La diapositiva cambió. Cierra el catálogo y vuelve a abrirlo.'; agregar.disabled = true; return; }
    const block = Object.assign(newBlock('image'), {
      src:'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(figura.svg), alt:figura.nombre,
      catalogo:deepCopy(figura.procedencia), w:100, posLibre:{x:41, y:25, w:18, h:45}
    });
    zona(slide, clamp((S.insCol || 1) - 1, 0, zonasDe(slide.layout) - 1)).push(block);
    S.selBlock = block.id;
    closeModal(); commit(); enfocaBloqueLibre(block.id);
  }
  const filtros = h('div', {class:'catalogo-filtros'}, h('label', null, 'Buscar figuras', busca), h('label', null, 'Área', area));
  const detalle = h('section', {class:'catalogo-detalle', 'aria-label':'Vista previa de la figura'}, preview, datos, estado);
  const contenido = h('div', null, filtros, cuenta, h('div', {class:'catalogo-columnas'},
    h('div', null, lista, h('div', {class:'catalogo-paginacion'}, anterior, siguiente)), detalle));
  dialogo.querySelector('.mo-body').replaceChildren(contenido);
  dialogo.querySelector('.mo-foot').replaceChildren(cancelar, agregar);
  pinta();
  busca.focus();
}

function esFuenteCatalogo(item) { return !!item && typeof item === 'object' && !Array.isArray(item) && typeof item.id === 'string'; }
function fuentesCatalogo(deck) {
  const encontrados = [], vistos = new Set();
  for (const slide of deck.slides || []) for (const block of zonas(slide).flat()) {
    const item = block?.catalogo;
    if (!esFuenteCatalogo(item)) continue;
    const key = JSON.stringify([item.id, item.sha256, item.author, item.license, item.url, item.changes]);
    if (!vistos.has(key)) { vistos.add(key); encontrados.push(item); }
  }
  return encontrados;
}
function textoCreditoCatalogo(item) {
  const texto = value => typeof value === 'string' ? value.slice(0, 12000) : '';
  return [
    texto(item.name) + (item.originalTitle ? ' (' + texto(item.originalTitle) + ')' : ''),
    texto(item.author) + ' · ' + texto(item.license), texto(item.url),
    item.creatorURL && item.creatorURL !== item.url ? texto(item.creatorURL) : '', texto(item.licenseURL),
    Array.isArray(item.changes) && item.changes.length ? 'Cambios: ' + item.changes.map(texto).join('; ') : '',
    texto(item.licenseNotice)
  ].filter(Boolean).join('\n');
}
function textoCreditosCatalogo(deck) { return fuentesCatalogo(deck).map(textoCreditoCatalogo).join('\n\n'); }
function svgConCreditosCatalogo(svg, item) {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml'), root = doc.documentElement;
  if (doc.querySelector('parsererror') || root?.localName !== 'svg') throw new Error('No se pudo conservar la atribución en el SVG.');
  const metadata = doc.createElementNS('http://www.w3.org/2000/svg', 'metadata'); metadata.textContent = JSON.stringify(item);
  const desc = doc.createElementNS('http://www.w3.org/2000/svg', 'desc'); desc.textContent = textoCreditoCatalogo(item);
  root.prepend(metadata, desc);
  return new XMLSerializer().serializeToString(doc);
}
function marcaRecorteCatalogo(block, recortada) {
  if (!esFuenteCatalogo(block.catalogo)) return;
  const marca = 'Recortada en Tabula';
  const changes = Array.isArray(block.catalogo.changes) ? block.catalogo.changes.filter(c => c !== marca) : [];
  block.catalogo.changes = recortada ? [...changes, marca] : changes;
}
function avisoCreditosCatalogo(deck = S.deck) {
  if (!fuentesCatalogo(deck).some(item => /^(CC-BY-|MIT)/.test(String(item.license || '')))) return null;
  return h('p', {class:'hint', role:'status'}, 'Al compartir, incluye la atribución de las figuras. ',
    h('button', {class:'btn btn-sm', type:'button', onclick:() => downloadFile(deckSlug() + '-creditos-figuras.txt', textoCreditosCatalogo(deck) + '\n', 'text/plain;charset=utf-8')}, 'Descargar créditos'));
}
function recuerdaCreditosCatalogo(deck = S.deck) {
  if (fuentesCatalogo(deck).some(item => /^(CC-BY-|MIT)/.test(String(item.license || ''))))
    toast('Incluye los créditos de las figuras al compartir.', 'warn', {t:'Créditos', fn:openCreditosCatalogo});
}
function openCreditosCatalogo() {
  const texto = textoCreditosCatalogo(S.deck);
  const cuerpo = h('div', null, h('p', {class:'hint'}, 'Incluye las atribuciones que correspondan al compartir tu presentación.'),
    texto ? h('pre', {class:'catalogo-creditos', tabindex:'0'}, texto) : h('p', null, 'Esta presentación no tiene figuras del catálogo.'));
  openModal({title:'Créditos de figuras', size:'modal-lg', body:cuerpo,
    foot:[h('button', {class:'btn', type:'button', onclick:closeModal}, 'Cerrar'),
      h('button', {class:'btn btn-pri', type:'button', disabled:!texto,
        onclick:() => downloadFile(deckSlug() + '-creditos-figuras.txt', texto + '\n', 'text/plain;charset=utf-8')}, 'Descargar créditos')]});
}
