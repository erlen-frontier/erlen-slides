/* SPDX-License-Identifier: AGPL-3.0-only */
'use strict';
/* La franja ocupa su propio espacio: no cubre el objeto ni el panel de capas.
   Sus controles conservan su nodo mientras siga seleccionada la misma pieza,
   de modo que el primer clic también funciona al terminar una edición en vivo. */
function contextoBarra() {
  const deck = S.deck, slide = curSlide(), f = S.selBlock && findBlock(S.selBlock);
  if (!f || f.slide !== slide) return null;
  const seleccion = idsSeleccionados();
  const ids = slide.lienzoLibre && seleccion.has(f.block.id) ? [...seleccion] : [f.block.id];
  const bloques = ids.map(id => findBlock(id)?.block);
  if (!bloques.length || bloques.some(b => !b)) return null;
  const b = f.block;
  return {deck, slide, b, ids, bloques, bloqueos:bloques.map(x => !!x.locked), tipo:b.type,
    conImagen:!!b.src, conFigura:!!b.figura, conFuente:!!b.cientifico, forma:formaColorBarra(b)};
}
function formaColorBarra(b) {
  if (!esFormaLibre(b) || b.cientifico || b.catalogo || b.orig || b.recProp || !Array.isArray(b.figura.objects) || b.figura.objects.length !== 1) return '';
  const obj = b.figura.objects[0];
  const esperado = {rect:'rect', circle:'circle', line:'rect', arrow:'arrow'}[b.formaLibre];
  return obj && !obj.locked && obj.kind === esperado ? b.formaLibre : '';
}
function mismoContextoBarra(a, b) {
  return !!a && !!b && a.deck === b.deck && a.slide === b.slide && a.b === b.b && a.tipo === b.tipo && a.forma === b.forma &&
    a.conImagen === b.conImagen && a.conFigura === b.conFigura && a.conFuente === b.conFuente &&
    a.ids.length === b.ids.length && a.ids.every((id, i) => id === b.ids[i] && a.bloques[i] === b.bloques[i] && a.bloqueos[i] === b.bloqueos[i]);
}
function vigenteBarra(ctx) { return mismoContextoBarra(ctx, contextoBarra()); }

/* Guarda la selección de texto antes de que un control del navegador tome el
   foco, para aplicar el formato sin desplazar el cursor. */
function capturaTextoBarra(ctx) {
  if (!ctx || !rawEl || rawEl.dataset.ek !== 'b:' + ctx.b.id || !rawEl.isConnected) return null;
  const seleccion = getSelection();
  if (!seleccion || !seleccion.rangeCount) return null;
  const r = seleccion.getRangeAt(0);
  if (!rawEl.contains(r.startContainer) || !rawEl.contains(r.endContainer)) return null;
  /* Range.toString omite los saltos <br> y los límites entre párrafos. Un
     centinela hace que innerText cuente también los saltos al final del rango. */
  const medidor = h('div', {style:'position:fixed;left:-99999px;top:0;opacity:0;pointer-events:none;white-space:pre-wrap'});
  document.body.append(medidor);
  const offset = (nodo, posicion) => {
    const prefijo = document.createRange(); prefijo.selectNodeContents(rawEl); prefijo.setEnd(nodo, posicion);
    medidor.replaceChildren(prefijo.cloneContents(), document.createTextNode('\u200b'));
    return Math.max(0, medidor.innerText.length - 1);
  };
  try { return {deck:ctx.deck, slide:ctx.slide, b:ctx.b, ek:rawEl.dataset.ek,
    inicio:offset(r.startContainer, r.startOffset), fin:offset(r.endContainer, r.endOffset)}; }
  finally { medidor.remove(); }
}
function restauraTextoBarra(guardado) {
  if (!guardado || guardado.deck !== S.deck || guardado.slide !== curSlide() || findBlock(guardado.b.id)?.block !== guardado.b || guardado.b.locked) return;
  focusEdit(guardado.ek);
  if (!rawEl || rawEl.dataset.ek !== guardado.ek) return;
  const texto = document.createTreeWalker(rawEl, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT), nodos = [];
  while (texto.nextNode()) if (texto.currentNode.nodeType === Node.TEXT_NODE || texto.currentNode.nodeName === 'BR') nodos.push(texto.currentNode);
  const punto = offset => {
    for (const nodo of nodos) {
      if (nodo.nodeType === Node.TEXT_NODE) { if (offset <= nodo.length) return [nodo, offset]; offset -= nodo.length; }
      else if (offset > 0) {
        offset--;
        if (!offset) return [nodo.parentNode, Array.prototype.indexOf.call(nodo.parentNode.childNodes,nodo) + 1];
      }
    }
    return [rawEl, rawEl.childNodes.length];
  };
  const [a, ai] = punto(guardado.inicio), [b, bi] = punto(guardado.fin), r = document.createRange();
  try { r.setStart(a, ai); r.setEnd(b, bi); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) { /* queda el cursor al final */ }
}
function ejecutaBarra(ctx, fn, conservarTexto = false) {
  const bar = $('#barraContextual'), guardado = conservarTexto ? (capturaTextoBarra(ctx) || bar?._textoPrevio) : null;
  if (bar) bar._textoPrevio = null;
  if (!vigenteBarra(ctx)) return;
  flushEdicion();
  if (!vigenteBarra(ctx)) return;
  fn(guardado);
  if (conservarTexto) restauraTextoBarra(guardado);
}
function cambiaTextoBarra(ctx, campo, valor) {
  ejecutaBarra(ctx, seleccion => {
    const b = ctx.b;
    if (ctx.ids.length !== 1 || b.locked || b.type !== 'text') return;
    const estilo = campo === 'negrita' || campo === 'cursiva';
    if (estilo && seleccion && seleccion.fin > seleccion.inicio) {
      const texto = String(b.text || '');
      let inicio = clamp(seleccion.inicio, 0, texto.length), fin = clamp(seleccion.fin, inicio, texto.length);
      /* La selección visual no debe cortar un emoji o un acento combinado. */
      if (typeof Intl.Segmenter === 'function') for (const parte of new Intl.Segmenter(undefined, {granularity:'grapheme'}).segment(texto)) {
        const a = parte.index, z = a + parte.segment.length;
        if (a < inicio && inicio < z) inicio = a;
        if (a < fin && fin < z) fin = z;
      }
      if (inicio === fin) return;
      const activo = partesFormatoTexto(b, inicio, fin).every(p => p[campo]);
      cambiaFormatoTexto(b, inicio, fin, campo, !activo);
      commit(); return;
    }
    const previo = campo === 'size' ? b.size || 'n' : campo === 'align' ? b.align || 'left' : !!b[campo];
    const nuevo = typeof valor === 'function' ? valor(previo) : valor;
    if (previo === nuevo) return;
    const partes = estilo ? partesFormatoTexto(b) : null;
    if (estilo && !nuevo) delete b[campo]; else b[campo] = nuevo;
    if (partes) { partes.forEach(p => { p[campo] = nuevo; p[campo + 'Explicita'] = false; }); guardaPartesFormatoTexto(b, partes); }
    commit();
  }, true);
}
async function cambiaColorFormaBarra(ctx, propiedad, color) {
  if (!/^#[\da-f]{6}$/i.test(color) || !vigenteBarra(ctx) || !ctx.forma || ctx.ids.length !== 1 || ctx.b.locked) return;
  flushEdicion();
  if (!vigenteBarra(ctx)) return;
  const b = ctx.b, figura = b.figura, firma = JSON.stringify(figura), fuente = b.src;
  try {
    const core = await extensionSlides('figurascore');
    if (!vigenteBarra(ctx) || b.figura !== figura || JSON.stringify(b.figura) !== firma || b.src !== fuente) return;
    const modelo = deepCopy(figura), objeto = modelo.objects[0];
    if (!objeto || objeto[propiedad] === color) return;
    objeto[propiedad] = color;
    if (propiedad === 'stroke' && !objeto.strokeWidth) objeto.strokeWidth = 4;
    const validada = core.validaFigura(modelo), svg = core.svgFigura(validada, b.alt || 'Forma');
    b.figura = validada; b.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    commit();
  } catch (error) { if (vigenteBarra(ctx)) toast('No se pudo cambiar el color de la forma.', 'warn'); }
}
function actualizaBarraContextual(bar, ctx) {
  const b = ctx.b;
  const size = bar.querySelector('[data-barra-accion="tamano"]'); if (size) size.value = b.size || 'n';
  const seleccion = capturaTextoBarra(ctx), fuente = rawFormato || b;
  const partes = seleccion && seleccion.fin > seleccion.inicio ? partesFormatoTexto(fuente, seleccion.inicio, seleccion.fin) : [];
  const estado = campo => partes.length ? (partes.every(p => p[campo]) ? 'true' : partes.some(p => p[campo]) ? 'mixed' : 'false') : String(b[campo] === true);
  for (const [accion, activo] of [['negrita',estado('negrita')], ['cursiva',estado('cursiva')],
    ['izquierda',!b.align || b.align === 'left'], ['centro',b.align === 'center'], ['derecha',b.align === 'right']]) {
    const boton = bar.querySelector('[data-barra-accion="'+accion+'"]'); if (boton) boton.setAttribute('aria-pressed', String(activo));
  }
  for (const input of bar.querySelectorAll('input[type="color"]')) {
    const valor = b.figura?.objects?.[0]?.[input.dataset.color];
    if (/^#[\da-f]{6}$/i.test(valor || '') && document.activeElement !== input) input.value = valor;
  }
}
/* Mostrar u ocultar la franja cambia el alto disponible para el ajuste
   automático. Ajustar solo la escala evita destruir el editor que recibió el
   primer clic, su foco o su selección. */
function ajustaVistaPorBarra() {
  const stage = $('#stage'), inner = $('#stageInner'), label = $('#zoomLabel');
  if (!S.deck || !stage || !inner || !$('#canvasScroll')) return;
  const [w, h] = slideDims(S.deck), z = effZoom();
  stage.style.width = w * z + 'px'; stage.style.height = h * z + 'px';
  inner.style.transform = `scale(${z})`;
  if (label) label.textContent = Math.round(z * 100) + '%';
}
function pintaBarraContextual() {
  const bar = $('#barraContextual'); if (!bar) return;
  const ctx = contextoBarra();
  if (!ctx) {
    const cambia = !bar.hidden; bar.hidden = true; bar.replaceChildren(); bar._contexto = null; bar._textoPrevio = null;
    if (cambia) ajustaVistaPorBarra();
    return;
  }
  if (mismoContextoBarra(bar._contexto, ctx)) { bar.hidden = false; actualizaBarraContextual(bar, ctx); return; }
  const foco = bar.contains(document.activeElement) ? document.activeElement?.dataset.barraAccion : null;
  const desplazamiento = bar.scrollLeft, aparece = bar.hidden;
  bar.replaceChildren(); bar.hidden = false; bar._contexto = ctx; bar._textoPrevio = null;
  if (aparece) ajustaVistaPorBarra();
  const varias = ctx.ids.length > 1, bloqueada = ctx.bloqueos.some(Boolean), b = ctx.b;
  const grupo = () => { const el = h('div', {class:'contexto-grupo'}); bar.append(el); return el; };
  const icono = (nombre, alternativo) => icNodo(nombre) || alternativo;
  const btn = (destino, simbolo, nombre, accion, fn, opciones = {}) => {
    const boton = h('button', {type:'button', title:nombre, 'aria-label':nombre, 'data-barra-accion':accion,
      disabled:opciones.disabled, ...(opciones.pressed == null ? {} : {'aria-pressed':String(opciones.pressed)}),
      onclick:() => ejecutaBarra(ctx, fn)}, simbolo);
    destino.append(boton); return boton;
  };
  const cab = grupo(); cab.append(h('span', {class:'contexto-nombre'}, varias ? ctx.ids.length + ' objetos' : (BLOCK_DEFS.find(d => d.id === b.type)?.name || 'Objeto')));
  if (!varias && !bloqueada && b.type === 'text') {
    const g = grupo(), tam = h('select', {'aria-label':'Tamaño del texto', title:'Tamaño del texto', 'data-barra-accion':'tamano',
      onchange:e => cambiaTextoBarra(ctx, 'size', e.currentTarget.value)},
      h('option',{value:'s'},'Pequeño'),h('option',{value:'n'},'Normal'),h('option',{value:'l'},'Grande'));
    g.append(tam);
    const texto = (simbolo,nombre,accion,campo,valor) => g.append(h('button',{type:'button',title:nombre,'aria-label':nombre,
      'data-barra-accion':accion,'aria-pressed':'false',onclick:() => cambiaTextoBarra(ctx,campo,valor)},simbolo));
    texto(icono('Bold','N'),'Negrita','negrita','negrita',v=>!v);
    texto(icono('Italic','C'),'Cursiva','cursiva','cursiva',v=>!v);
    texto(icono('AlignLeft','≡'),'Alinear texto a la izquierda','izquierda','align','left');
    texto(icono('AlignCenter','≡'),'Centrar texto','centro','align','center');
    texto(icono('AlignRight','≡'),'Alinear texto a la derecha','derecha','align','right');
  } else if (!varias && !bloqueada && b.type === 'image') {
    const g = grupo();
    if (ctx.forma) {
      const color = (nombre, propiedad, simbolo) => {
        const valor = b.figura.objects[0][propiedad], input = h('input',{type:'color',value:/^#[\da-f]{6}$/i.test(valor) ? valor : '#000000',
          'aria-label':nombre,title:nombre,'data-color':propiedad,'data-barra-accion':'color-'+propiedad,
          onchange:e => cambiaColorFormaBarra(ctx,propiedad,e.currentTarget.value)});
        g.append(h('label',{class:'contexto-color',title:nombre},simbolo,input));
      };
      if (ctx.forma === 'line') color('Color de la línea','fill','Línea');
      else if (ctx.forma === 'arrow') color('Color del trazo','stroke','Trazo');
      else { color('Color de relleno','fill','Relleno'); color('Color de contorno','stroke','Contorno'); }
    } else {
      btn(g,icono('ImageUp','▣'),'Cambiar imagen','imagen',() => pickImage(b));
      if (b.src) btn(g,icono('Crop','⛶'),'Encuadrar imagen','encuadrar',() => openRecorte(b));
    }
    if (b.figura) btn(g,icono('Pencil','✎'),'Editar capas de la figura','figura',() => openFiguraCapas(b));
    else if (b.cientifico) btn(g,icono('FlaskConical','✎'),'Editar fuente de la figura','fuente',() => cienciaReabrir(b));
  }
  const g = grupo(), sufijo = varias ? 'selección' : 'bloque';
  btn(g,icono('CopyPlus','⧉'),'Duplicar '+sufijo,'duplicar',duplicarSeleccionActiva,{disabled:bloqueada});
  if (ctx.slide.lienzoLibre) {
    btn(g,icono('ArrowUp','↑'),varias ? 'Adelantar selección' : 'Adelantar capa','adelantar',() => mueveCapasSeleccionadas('adelante'),{disabled:bloqueada});
    btn(g,icono('ArrowDown','↓'),varias ? 'Retrasar selección' : 'Retrasar capa','retrasar',() => mueveCapasSeleccionadas('atras'),{disabled:bloqueada});
  } else {
    btn(g,icono('ArrowUp','↑'),'Subir bloque','adelantar',() => moveBlock(b.id,-1),{disabled:bloqueada});
    btn(g,icono('ArrowDown','↓'),'Bajar bloque','retrasar',() => moveBlock(b.id,1),{disabled:bloqueada});
  }
  btn(g,icono(bloqueada ? 'LockOpen' : 'Lock','▣'),(bloqueada ? 'Desbloquear ' : 'Bloquear ')+sufijo,'bloqueo',() => cambiaBloqueoSeleccion(!bloqueada));
  btn(g,icono('Trash2','✕'),'Eliminar '+sufijo,'eliminar',eliminarSeleccionActiva,{disabled:bloqueada});
  btn(g,icono('Settings2','⚙'),'Propiedades del bloque','propiedades',() => abrePanelLateral('bloque'),{disabled:bloqueada});
  actualizaBarraContextual(bar,ctx); bar.scrollLeft = desplazamiento;
  if (foco) bar.querySelector('[data-barra-accion="'+foco+'"]')?.focus({preventScroll:true});
}
function iniciaBarraContextual() {
  const bar = $('#barraContextual'); if (!bar || bar._iniciada) return;
  bar._iniciada = true;
  document.addEventListener('selectionchange', () => {
    const ctx = bar._contexto;
    if (ctx && vigenteBarra(ctx) && rawEl) actualizaBarraContextual(bar, ctx);
  });
  bar.addEventListener('pointerdown', e => {
    const ctx = bar._contexto;
    bar._textoPrevio = ctx ? capturaTextoBarra(ctx) : null;
    if (bar._textoPrevio && e.target.closest('button')) e.preventDefault();
  });
}
