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

/* Escala de manera uniforme alrededor de la esquina opuesta. El límite se
   calcula para todo el conjunto, antes de cambiar cualquier bloque. */
function calculaEscalaLibre(posiciones, esquina, factor) {
  if (!Array.isArray(posiciones) || posiciones.length < 1 || !posiciones.every(posicionLibreValida) ||
      !['nw', 'ne', 'sw', 'se'].includes(esquina) || !Number.isFinite(factor)) return null;
  const caja = posiciones.reduce((a, p) => ({ izq: Math.min(a.izq, p.x), arriba: Math.min(a.arriba, p.y),
    der: Math.max(a.der, p.x + p.w), abajo: Math.max(a.abajo, p.y + p.h) }), { izq: 100, arriba: 100, der: 0, abajo: 0 });
  const ancho = caja.der - caja.izq, alto = caja.abajo - caja.arriba;
  const anclaX = esquina.includes('e') ? caja.izq : caja.der;
  const anclaY = esquina.includes('s') ? caja.arriba : caja.abajo;
  const minimo = Math.max(...posiciones.flatMap(p => [1 / p.w, 1 / p.h]));
  const maximo = Math.min((esquina.includes('e') ? 100 - anclaX : anclaX) / ancho,
    (esquina.includes('s') ? 100 - anclaY : anclaY) / alto);
  const escala = clamp(factor, minimo, maximo);
  if (Math.abs(escala - 1) < 1e-12) return posiciones.map(p => ({ ...p }));
  return posiciones.map(p => {
    const w = clamp(redondeaLibre(p.w * escala), 1, 100), h = clamp(redondeaLibre(p.h * escala), 1, 100);
    return { x: clamp(redondeaLibre(anclaX + (p.x - anclaX) * escala), 0, 100 - w),
      y: clamp(redondeaLibre(anclaY + (p.y - anclaY) * escala), 0, 100 - h), w, h };
  });
}

function escalaSeleccionLibre(deck, slide, ids, esquina, factor) {
  if (deck !== S.deck || slide !== curSlide() || !slide.lienzoLibre) return false;
  if (typeof flushEdicion === 'function') flushEdicion();
  if (deck !== S.deck || slide !== curSlide()) return false;
  const elegidos = Array.from(new Set(ids)), porId = new Map(zonas(slide).flat().map(b => [b.id, b]));
  const bloques = elegidos.map(id => porId.get(id));
  if (bloques.length < 2 || bloques.some(b => !b || b.locked ||
      (typeof bloqueVisible === 'function' && !bloqueVisible(b, deck)))) return false;
  const anteriores = bloques.map(b => ({ ...posicionLibreDe(slide, b) }));
  const nuevas = calculaEscalaLibre(anteriores, esquina, factor);
  if (!nuevas || nuevas.every((p, i) => ['x', 'y', 'w', 'h'].every(k => p[k] === anteriores[i][k]))) return false;
  bloques.forEach((b, i) => { b.posLibre = nuevas[i]; });
  commit();
  return true;
}

/* Alinear usa los extremos de la selección; distribuir iguala los espacios
   entre cajas y mantiene inmóviles las dos cajas extremas. */
function organizaSeleccionLibre(deck, slide, ids, accion) {
  const acciones = ['izquierda', 'centro', 'derecha', 'arriba', 'medio', 'abajo', 'distribuir-h', 'distribuir-v'];
  if (deck !== S.deck || slide !== curSlide() || !slide.lienzoLibre || !acciones.includes(accion)) return false;
  if (typeof flushEdicion === 'function') flushEdicion();
  if (deck !== S.deck || slide !== curSlide()) return false;
  const elegidos = Array.from(new Set(ids)), porId = new Map(zonas(slide).flat().map(b => [b.id, b]));
  const bloques = elegidos.map(id => porId.get(id));
  if (bloques.length < (accion.startsWith('distribuir') ? 3 : 2) || bloques.some(b => !b || b.locked ||
      (typeof bloqueVisible === 'function' && !bloqueVisible(b, deck)))) return false;
  const anteriores = bloques.map(b => ({ ...posicionLibreDe(slide, b) })), nuevas = anteriores.map(p => ({ ...p }));
  const izq = Math.min(...anteriores.map(p => p.x)), der = Math.max(...anteriores.map(p => p.x + p.w));
  const arriba = Math.min(...anteriores.map(p => p.y)), abajo = Math.max(...anteriores.map(p => p.y + p.h));
  if (accion.startsWith('distribuir')) {
    const horizontal = accion === 'distribuir-h', eje = horizontal ? 'x' : 'y', tam = horizontal ? 'w' : 'h';
    const orden = nuevas.map((p, i) => ({ p, i })).sort((a, b) => a.p[eje] - b.p[eje] || a.i - b.i);
    const primero = orden[0].p[eje], ultimo = orden.at(-1).p;
    const espacio = (ultimo[eje] + ultimo[tam] - primero - orden.reduce((s, item) => s + item.p[tam], 0)) / (orden.length - 1);
    let cursor = primero;
    orden.forEach(({p}, i) => {
      if (i > 0 && i < orden.length - 1) p[eje] = redondeaLibre(cursor);
      cursor += p[tam] + espacio;
    });
  } else for (const p of nuevas) {
    const coloca = (eje, valor) => {
      if (Math.abs(p[eje] - valor) > 1e-9) p[eje] = clamp(valor, 0, 100 - p[eje === 'x' ? 'w' : 'h']);
    };
    if (accion === 'izquierda') coloca('x', izq);
    if (accion === 'centro') coloca('x', (izq + der - p.w) / 2);
    if (accion === 'derecha') coloca('x', der - p.w);
    if (accion === 'arriba') coloca('y', arriba);
    if (accion === 'medio') coloca('y', (arriba + abajo - p.h) / 2);
    if (accion === 'abajo') coloca('y', abajo - p.h);
  }
  if (!nuevas.every(posicionLibreValida) || nuevas.every((p, i) => ['x', 'y', 'w', 'h'].every(k => p[k] === anteriores[i][k]))) return false;
  bloques.forEach((b, i) => { b.posLibre = nuevas[i]; });
  commit();
  return true;
}

/* Las formas se insertan como figuras existentes: el SVG es autónomo y el
   modelo editable viaja en JSON sin inventar otro tipo de bloque. */
async function insertaFormaLibre(tipo) {
  const nombres = { rect: 'Rectángulo', circle: 'Elipse', line: 'Línea', arrow: 'Flecha' };
  if (!Object.hasOwn(nombres, tipo)) return false;
  if (typeof flushEdicion === 'function') flushEdicion();
  const deck = S.deck, slide = curSlide();
  const vigente = () => deck === S.deck && slide === curSlide() && slide.lienzoLibre && zonasDe(slide.layout) > 0;
  if (!vigente()) return false;
  const core = await extensionSlides('figurascore');
  if (!vigente()) return false;
  if (typeof flushEdicion === 'function') flushEdicion();
  if (!vigente()) return false;
  const objeto = { id: uid(), kind: tipo === 'line' ? 'rect' : tipo, x: 8, y: 8, width: 284, height: 134,
    angle: 0, fill: '#dcecf5', stroke: '#235747', strokeWidth: 4, locked: false };
  if (tipo === 'line') Object.assign(objeto, { x: 12, y: 70, width: 276, height: 10, fill: '#235747', stroke: 'transparent', strokeWidth: 0 });
  if (tipo === 'arrow') Object.assign(objeto, { x: 12, y: 15, width: 276, height: 120, fill: 'transparent', strokeWidth: 5 });
  const figura = core.validaFigura({ v: 1, width: 300, height: 150, background: 'transparent', objects: [objeto] });
  const b = newBlock('image');
  Object.assign(b, { formaLibre: tipo, figura, src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(core.svgFigura(figura, nombres[tipo])),
    alt: nombres[tipo], w: 100, posLibre: tipo === 'line' || tipo === 'arrow'
      ? { x: 30, y: 45, w: 40, h: 10 } : { x: 35, y: 35, w: 30, h: 30 } });
  zona(slide, clamp((S.insCol || 1) - 1, 0, zonasDe(slide.layout) - 1)).push(b);
  S.selBlock = b.id;
  commit();
  enfocaBloqueLibre(b.id);
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
