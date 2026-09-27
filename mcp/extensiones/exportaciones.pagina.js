/* SPDX-License-Identifier: AGPL-3.0-only */
/* Página de la extensión «exportaciones»: lo que no necesita rasterizar se
   saca aquí, en JSDOM, con las mismas funciones que usan los botones del
   editor (figuraSVG, svgEstructura, allImageBlocks, informeExportacion). */
(function () {
  'use strict';
  const { valida } = ERLEN_MCP.util;

  /* Una celda de CSV: comillas solo cuando hacen falta (RFC 4180). */
  const celda = v => {
    const t = String(v == null ? '' : v);
    return /[",\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  };
  /* Los datos de una gráfica tal como se dibujan: los lee parseTable, igual
     que la gráfica, así que la coma decimal o el punto y coma de Excel salen
     normalizados y lo que no es número queda vacío. */
  function csvDe(b) {
    const t = parseTable(b.data || '');
    if (!t.rows.length) return null;
    return [t.headers.map(celda).join(',')].concat(t.rows.map(r => r.map(v => isFinite(v) ? String(v) : '').join(','))).join('\n') + '\n';
  }
  /* La estructura en SVG autónomo, en tinta negra sobre papel: sin variables
     de CSS ni la letra heredada del tema, que fuera de la app no existen. */
  function estructuraSVG(b, deck) {
    const svg = svgEstructura(b, deck, '#000000', false, false);
    const caja = cajaEstructura(b.est);
    svg.setAttribute('version', '1.1');
    svg.setAttribute('width', Math.round(caja.w * 2));
    svg.setAttribute('height', Math.round(caja.h * 2));
    svg.removeAttribute('class');
    return ('<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(svg))
      .replace(/var\(--[\w-]+,\s*([^)]+)\)/g, '$1')
      .replace(/font-family="inherit"/g, 'font-family="Arial, Helvetica, sans-serif"');
  }

  ERLEN_MCP.registra('exportaInforme', a => informeExportacion(valida(a.deck).deck));

  /* Todas las figuras de la charla: gráficas y funciones en SVG (con los
     datos de las gráficas en CSV), estructuras en SVG e imágenes con su
     formato original. Los nombres son los de figName, los mismos que usan
     el .tex y el kit. */
  ERLEN_MCP.registra('exportaFiguras', a => {
    const deck = valida(a.deck).deck;
    loadDeck(deck, null);
    const figuras = [], datos = [], avisos = [];
    deck.slides.forEach((sl, i) => zonas(sl).flat().forEach(b => {
      if (!b) return;
      const base = { diapositiva: i + 1, bloque: b.id, tipo: b.type, pie: b.caption || '' };
      if (b.type === 'chart' || b.type === 'func') {
        try { figuras.push(Object.assign({ nombre: figName(b) + '.svg', texto: figuraSVG(b, deck) }, base)); }
        catch (e) { avisos.push('La ' + (b.type === 'func' ? 'función' : 'gráfica') + ' ' + b.id + ' (diapositiva ' + (i + 1) + ') no produjo un SVG: ' + e.message); }
        const csv = b.type === 'chart' && csvDe(b);
        if (csv) datos.push(Object.assign({ nombre: figName(b) + '.csv', texto: csv, procedencia: b.fuente || null,
          ejes: { x: b.xlabel || '', y: b.ylabel || '' } }, base));
      }
      if (b.type === 'estruct' && b.est && b.est.atomos && b.est.atomos.length)
        figuras.push(Object.assign({ nombre: figName(b) + '.svg', texto: estructuraSVG(b, deck) }, base));
    }));
    /* Las imágenes van tal cual se subieron: el recorte, el marco o el filtro
       del editor no se aplican (eso lo hace «Exportar figuras» en la app). */
    const imgs = allImageBlocks().filter(b => b.src).map(b => ({ nombre: b._nom || figName(b), src: b.src, bloque: b.id, tipo: 'image', pie: b.caption || '' }));
    if (deck.meta.logo) imgs.unshift({ nombre: 'logo', src: deck.meta.logo, bloque: null, tipo: 'logo', pie: '' });
    return { figuras, datos, imagenes: imgs, avisos };
  });
})();
