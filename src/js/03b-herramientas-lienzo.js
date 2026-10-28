/* SPDX-License-Identifier: AGPL-3.0-only */
'use strict';

/* La capa es independiente de la zona: se guarda con el bloque para que la
   duplicación de diapositivas conserve el orden aunque cambien los IDs. */
function bloquesEnCapas(sl, deck = S.deck) {
  const bloques = zonas(sl).flat();
  /* En sangre la primera figura se pinta detrás de la banda aunque aparezca
     después del texto en el arreglo original. */
  if (sl.layout === 'sangre') {
    const figura = (sl.blocks || []).find(b => ['image','chart','func','galeria','video','montaje'].includes(b.type) &&
      (typeof bloqueVisible !== 'function' || bloqueVisible(b, deck)));
    const i = bloques.indexOf(figura); if (i > 0) bloques.unshift(...bloques.splice(i, 1));
  }
  const validas = bloques.map(b => b.capaLibre).filter(n => Number.isSafeInteger(n) && n >= 0 && n <= 1000000);
  if (!validas.length) return bloques;
  const siguiente = validas.reduce((a, b) => Math.max(a, b), 0) + 1;
  return bloques.map((b, i) => ({b, i, capa: Number.isSafeInteger(b.capaLibre) && b.capaLibre >= 0 && b.capaLibre <= 1000000 ? b.capaLibre : siguiente + i}))
    .sort((a, b) => a.capa - b.capa || a.i - b.i).map(x => x.b);
}
function mueveCapaLibre(deck, slide, id, direccion) {
  if (deck !== S.deck || slide !== curSlide() || !slide.lienzoLibre) return false;
  if (typeof flushEdicion === 'function') flushEdicion();
  if (deck !== S.deck || slide !== curSlide()) return false;
  const lista = bloquesEnCapas(slide), desde = lista.findIndex(b => b.id === id);
  if (desde < 0 || lista[desde].locked) return false;
  const destinos = {atras: desde - 1, adelante: desde + 1, fondo: 0, frente: lista.length - 1};
  if (!Object.hasOwn(destinos, direccion)) return false;
  const hasta = destinos[direccion];
  if (hasta < 0 || hasta >= lista.length || hasta === desde) return false;
  const [bloque] = lista.splice(desde, 1); lista.splice(hasta, 0, bloque);
  lista.forEach((b, i) => { b.capaLibre = i; });
  commit();
  return true;
}

/* Desplazar el grupo completo, no cada bloque por separado: así un borde no
   comprime la distancia entre ellos. La selección se valida antes de escribir. */
function mueveSeleccionLibre(deck, slide, ids, dx, dy) {
  if (deck !== S.deck || slide !== curSlide() || !slide.lienzoLibre || !Number.isFinite(dx) || !Number.isFinite(dy)) return false;
  if (typeof flushEdicion === 'function') flushEdicion();
  if (deck !== S.deck || slide !== curSlide()) return false;
  const elegidos = Array.from(new Set(ids));
  const porId = new Map(zonas(slide).flat().map(b => [b.id, b]));
  const bloques = elegidos.map(id => porId.get(id) || null);
  if (!bloques.length || bloques.some(b => !b || b.locked)) return false;
  const cajas = bloques.map(b => ({...posicionLibreDe(slide, b)}));
  const limites = cajas.reduce((a, p) => ({izq:Math.min(a.izq,p.x), arriba:Math.min(a.arriba,p.y),
    der:Math.max(a.der,p.x+p.w), abajo:Math.max(a.abajo,p.y+p.h)}), {izq:100,arriba:100,der:0,abajo:0});
  const {izq, arriba, der, abajo} = limites;
  dx = clamp(redondeaLibre(clamp(dx, -izq, 100 - der)), -izq, 100 - der);
  dy = clamp(redondeaLibre(clamp(dy, -arriba, 100 - abajo)), -arriba, 100 - abajo);
  if (!dx && !dy) return false;
  bloques.forEach((b, i) => { const p = cajas[i]; b.posLibre = {...p,
    x: clamp(p.x + dx, 0, 100 - p.w), y: clamp(p.y + dy, 0, 100 - p.h)}; });
  commit();
  return true;
}

/* Ajuste por distancia visual, no por porcentaje fijo: funciona igual con
   zoom y con formatos 16:9 o 4:3. Solo los ejes realmente alineados se pintan. */
function imantaMovimientoLibre(slide, ids, caja, dx, dy, anchoPx, altoPx) {
  const omitidos = new Set(ids), x = [0, 50, 100], y = [0, 50, 100];
  for (const b of zonas(slide).flat()) {
    if (omitidos.has(b.id) || (typeof bloqueVisible === 'function' && !bloqueVisible(b, S.deck))) continue;
    const p = posicionLibreDe(slide, b);
    x.push(p.x, p.x + p.w / 2, p.x + p.w);
    y.push(p.y, p.y + p.h / 2, p.y + p.h);
  }
  function eje(inicio, longitud, delta, destinos, tam) {
    let mejor = null;
    const tolerancia = 8 / Math.max(1, tam) * 100;
    for (const origen of [inicio, inicio + longitud / 2, inicio + longitud]) for (const destino of destinos) {
      const correccion = destino - (origen + delta), nuevo = delta + correccion;
      if (Math.abs(correccion) <= tolerancia && nuevo >= -inicio && nuevo <= 100 - inicio - longitud &&
          (!mejor || Math.abs(correccion) < Math.abs(mejor.correccion))) mejor = {delta: nuevo, guia: destino, correccion};
    }
    return mejor || {delta, guia: null};
  }
  const sx = eje(caja.x, caja.w, dx, x, anchoPx), sy = eje(caja.y, caja.h, dy, y, altoPx);
  return {dx: clamp(redondeaLibre(sx.delta), -caja.x, 100 - caja.x - caja.w),
    dy: clamp(redondeaLibre(sy.delta), -caja.y, 100 - caja.y - caja.h), guias: {x: sx.guia, y: sy.guia}};
}
