/* SPDX-License-Identifier: AGPL-3.0-only */
'use strict';
const LOTE_SEL = { deck: null, slide: null, ids: new Set() };
function idsSeleccionados() {
  if (LOTE_SEL.deck !== S.deck || LOTE_SEL.slide !== curSlide()) { LOTE_SEL.deck = S.deck; LOTE_SEL.slide = curSlide(); LOTE_SEL.ids.clear(); }
  const vivos = new Set(zonas(curSlide()).flat().filter(b => !curSlide().lienzoLibre ||
    typeof bloqueVisible !== 'function' || bloqueVisible(b, S.deck)).map(b => b.id));
  for (const id of LOTE_SEL.ids) if (!vivos.has(id)) LOTE_SEL.ids.delete(id);
  return LOTE_SEL.ids;
}
function marcaSeleccionBloques(id, aditiva) {
  const ids = idsSeleccionados(), b = id && findBlock(id)?.block;
  if (!aditiva) ids.clear();
  if (b) {
    const grupo = b.group ? zonas(curSlide()).flat().filter(x => x.group === b.group).map(x => x.id) : [id];
    const quitar = aditiva && grupo.every(k => ids.has(k));
    grupo.forEach(k => quitar ? ids.delete(k) : ids.add(k));
  }
  pintaSeleccionBloques();
}
function pintaSeleccionBloques() {
  const ids = idsSeleccionados();
  for (const el of document.querySelectorAll('#stageInner .blk[data-bid]')) el.classList.toggle('sel-lote', ids.has(el.dataset.bid));
  if (typeof actualizaControlesComposicion === 'function') actualizaControlesComposicion();
  if (typeof sincronizaPanelCapas === 'function') sincronizaPanelCapas();
}
function duplicarSeleccionActiva() {
  if (!S.selBlock) return;
  if (!curSlide().lienzoLibre) { dupBlock(S.selBlock); return; }
  const ids = idsSeleccionados();
  const elegidos = ids.has(S.selBlock) ? [...ids] : [S.selBlock];
  try { aplicaLoteBloques(S.deck, curSlide(), elegidos, 'duplicar'); }
  catch (error) { toast(error.message, 'warn'); }
}
function eliminarSeleccionActiva() {
  if (!S.selBlock) return;
  const ids = idsSeleccionados();
  if (!curSlide().lienzoLibre || !ids.has(S.selBlock) || ids.size <= 1) { delBlock(S.selBlock); return; }
  try {
    aplicaLoteBloques(S.deck, curSlide(), [...ids], 'eliminar');
    toast('Bloques eliminados', null, { t:'Deshacer', fn:doUndo });
  } catch (error) { toast(error.message, 'warn'); }
}
function cambiaBloqueoSeleccion(bloquear) {
  const f = S.selBlock && findBlock(S.selBlock); if (!f || f.slide !== curSlide()) return;
  if (!f.slide.lienzoLibre) { f.block.locked = bloquear; commit(); return; }
  const ids = idsSeleccionados(), elegidos = ids.has(S.selBlock) ? [...ids] : [S.selBlock];
  try { aplicaLoteBloques(S.deck, f.slide, elegidos, bloquear ? 'bloquear' : 'desbloquear'); }
  catch (error) { toast(error.message, 'warn'); }
}
/* Todas las operaciones son atómicas en el historial y solo afectan al mazo
   y a la diapositiva que originaron la selección. Un bloqueo no cambia datos. */
function aplicaLoteBloques(deck, slide, ids, accion, valor) {
  flushEdicion();
  if (deck !== S.deck || slide !== curSlide()) throw new Error('La diapositiva cambió. Abre de nuevo Organizar bloques.');
  const elegidos = new Set(ids), bloques = zonas(slide).flat().filter(b => elegidos.has(b.id));
  if (!bloques.length) throw new Error('Selecciona al menos un bloque.');
  if (bloques.length !== elegidos.size) throw new Error('La selección cambió. Selecciona de nuevo los bloques.');
  const acciones = ['bloquear', 'desbloquear', 'agrupar', 'desagrupar', 'alinear', 'ancho', 'mover', 'duplicar', 'eliminar'];
  if (!acciones.includes(accion)) throw new Error('Acción desconocida.');
  if (accion === 'alinear' && !['left', 'center', 'right'].includes(valor)) throw new Error('Alineación desconocida.');
  if (accion === 'mover' && (!Number.isInteger(valor) || valor < 0 || valor >= zonasDe(slide.layout))) throw new Error('Zona de destino inválida.');
  if (accion === 'ancho' && !(Number.isFinite(valor) && valor >= 10 && valor <= 100)) throw new Error('Usa una anchura de 10 a 100 %.');
  if (!['bloquear', 'desbloquear'].includes(accion) && bloques.some(b => b.locked)) throw new Error('Desbloquea los bloques seleccionados antes de modificarlos.');
  if (accion === 'ancho' && bloques.some(b => !SEL_ANCHO[b.type])) throw new Error('La misma anchura se aplica a figuras, gráficas, vídeos y diagramas.');
  if (accion === 'agrupar') { const grupo = uid(); bloques.forEach(b => { b.group = grupo; }); }
  else if (accion === 'desagrupar') bloques.forEach(b => { delete b.group; });
  else if (accion === 'bloquear' || accion === 'desbloquear') bloques.forEach(b => { b.locked = accion === 'bloquear'; });
  else if (accion === 'alinear') bloques.forEach(b => { b.blockAlign = valor; });
  else if (accion === 'ancho') bloques.forEach(b => { b.w = valor; });
  else if (accion === 'duplicar') {
    const libre = !!slide.lienzoLibre, grupos = new Map(), copias = new Map();
    if (libre) materializaPosicionesLibres(slide);
    const orden = libre ? bloquesEnCapas(slide) : null;
    const posiciones = libre ? bloques.map(b => ({...posicionLibreDe(slide, b)})) : [];
    const limites = libre ? posiciones.reduce((a, p) => ({ izq:Math.min(a.izq,p.x), arriba:Math.min(a.arriba,p.y),
      der:Math.max(a.der,p.x+p.w), abajo:Math.max(a.abajo,p.y+p.h) }), {izq:100, arriba:100, der:0, abajo:0}) : null;
    const desplazamiento = (inicio, fin) => {
      const adelante = Math.max(0, 100 - fin), atras = Math.max(0, inicio);
      if (adelante >= 2) return 2;
      if (atras >= 2) return -2;
      return adelante >= atras ? adelante : -atras;
    };
    const dx = libre ? desplazamiento(limites.izq, limites.der) : 0;
    const dy = libre ? desplazamiento(limites.arriba, limites.abajo) : 0;
    for (const arr of zonas(slide)) for (let i = arr.length - 1; i >= 0; i--) if (elegidos.has(arr[i].id)) {
      const copia = deepCopy(arr[i]); copia.id = uid();
      if (copia.group) { if (!grupos.has(copia.group)) grupos.set(copia.group, uid()); copia.group = grupos.get(copia.group); }
      if (libre) {
        const p = posicionLibreDe(slide, arr[i]);
        copia.posLibre = {...p, x:clamp(p.x + dx, 0, 100 - p.w), y:clamp(p.y + dy, 0, 100 - p.h)};
        copias.set(arr[i].id, copia);
      }
      arr.splice(i + 1, 0, copia);
    }
    if (libre) {
      const nuevas = orden.filter(b => copias.has(b.id)).map(b => copias.get(b.id));
      [...orden, ...nuevas].forEach((b, i) => { b.capaLibre = i; });
      if (slide.conectores) slide.conectores.push(...slide.conectores
        .filter(c => copias.has(c.desde) && copias.has(c.hasta))
        .map(c => ({desde:copias.get(c.desde).id, hasta:copias.get(c.hasta).id})));
      const activa = copias.get(S.selBlock) || nuevas.at(-1), seleccion = idsSeleccionados();
      seleccion.clear(); nuevas.forEach(b => seleccion.add(b.id)); S.selBlock = activa?.id || null;
    }
  } else {
    for (const arr of zonas(slide)) for (let i = arr.length - 1; i >= 0; i--) if (elegidos.has(arr[i].id)) arr.splice(i, 1);
    if (accion === 'mover') zona(slide, valor).push(...bloques);
    else { S.selBlock = null; idsSeleccionados().clear(); }
  }
  commit();
}
