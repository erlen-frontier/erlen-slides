/* SPDX-License-Identifier: AGPL-3.0-only */
/* ================= operaciones del servidor MCP =================
   Este archivo no es un módulo de Node: se evalúa dentro de la página del
   editor (JSDOM), en el mismo ámbito que los módulos concatenados, para que
   cada operación use las funciones reales de la aplicación —newBlock,
   prepararZonas, saneaDeck, toBeamer, calidadCientifica— y no una copia que
   con el tiempo se aparte de ellas.

   Todo entra y sale como texto JSON: los objetos no cruzan de un ámbito a
   otro, y así el proyecto que se guarda es exactamente el que se validó.
   Sin 'use strict' arriba: un eval estricto guardaría ERLEN_MCP en su propio
   ámbito y la página no lo vería. El modo estricto va dentro de la función. */
var ERLEN_MCP = (function () {
  'use strict';
  const ES_ENCABEZADO_FICTICIO = { dato: true, cita: true };
  const TIPOS_GUIADOS = ['text', 'bullets', 'math', 'chem', 'table', 'bblock', 'quote', 'code', 'spacer', 'chart', 'func', 'smart', 'teorema', 'refs', 'image'];

  class ErrorMcp extends Error {}
  const falla = m => { throw new ErrorMcp(m); };

  /* ---------- localizar ---------- */
  function indiceDiapositiva(deck, ref) {
    if (typeof ref === 'number' || /^\d+$/.test(String(ref))) {
      const n = Math.floor(+ref);
      if (n < 1 || n > deck.slides.length) falla('No hay diapositiva ' + n + ': la presentación tiene ' + deck.slides.length + '.');
      return n - 1;
    }
    const i = deck.slides.findIndex(s => s.id === ref);
    if (i < 0) falla('No hay ninguna diapositiva con id «' + ref + '».');
    return i;
  }
  function buscaBloque(deck, id) {
    for (let i = 0; i < deck.slides.length; i++) {
      const sl = deck.slides[i];
      for (let z = 0; z < CLAVES_ZONA.length; z++) {
        const arr = sl[CLAVES_ZONA[z]];
        if (!Array.isArray(arr)) continue;
        const j = arr.findIndex(b => b && b.id === id);
        if (j >= 0) return { i, z, arr, j, bloque: arr[j], sl };
      }
    }
    falla('No hay ningún bloque con id «' + id + '». Usa ver_presentacion para consultar los id.');
  }

  /* ---------- construir ---------- */
  function tablaATexto(v) {
    if (!Array.isArray(v)) return v;
    return v.map(f => (Array.isArray(f) ? f : [f]).map(c => String(c == null ? '' : c).replace(/[\t\n]/g, ' ')).join('\t')).join('\n');
  }
  function aplicaPropiedades(b, props) {
    Object.keys(props || {}).forEach(k => {
      if (k === 'tipo' || k === 'type' || k === 'id') return;
      let v = props[k];
      if (b.type === 'chart' && k === 'data') v = tablaATexto(v);
      if (b.type === 'smart' && k === 'items' && Array.isArray(v)) v = v.map(it => typeof it === 'string' ? { t: it } : it);
      if (b.type === 'table' && k === 'rows' && Array.isArray(v)) v = v.map(f => Array.isArray(f) ? f.map(c => String(c == null ? '' : c)) : [String(f)]);
      if (v === null) delete b[k]; else b[k] = v;
    });
    return b;
  }
  function bloqueDesde(spec) {
    if (!spec || typeof spec !== 'object') falla('Cada bloque debe ser un objeto con «tipo».');
    const tipo = spec.tipo || spec.type;
    if (!BLOCK_DEFS.some(d => d.id === tipo)) falla('Tipo de bloque desconocido: «' + tipo + '». Tipos válidos: ' + BLOCK_DEFS.map(d => d.id).join(', ') + '.');
    return aplicaPropiedades(newBlock(tipo), spec);
  }
  function aplicaEncabezados(sl, encabezados) {
    if (!Array.isArray(encabezados)) return;
    sl.zt = sl.zt || [];
    encabezados.forEach((t, i) => { if (t != null) sl.zt[i] = String(t); });
  }
  function aplicaZonas(sl, zonasSpec) {
    if (zonasSpec == null) return;
    if (!Array.isArray(zonasSpec)) falla('«zonas» debe ser una lista de listas de bloques: una lista por zona.');
    const n = zonasDe(sl.layout);
    if (n === 0 && zonasSpec.some(z => Array.isArray(z) && z.length)) falla('El diseño «' + sl.layout + '» no admite bloques.');
    if (zonasSpec.length > n) falla('El diseño «' + sl.layout + '» tiene ' + n + ' zona(s) y se enviaron ' + zonasSpec.length + '.');
    zonasSpec.forEach((z, i) => {
      if (!Array.isArray(z)) falla('La zona ' + (i + 1) + ' debe ser una lista de bloques.');
      sl[CLAVES_ZONA[i]] = z.map(bloqueDesde);
    });
  }
  function cambiaDiseno(sl, to) {
    if (!LAY[to]) falla('Diseño desconocido: «' + to + '». Diseños válidos: ' + LAYOUTS.map(l => l.id).join(', ') + '.');
    if (sl.layout === to) return;
    /* Mismo reparto que changeLayout (06-panels.js), sin tocar el estado del editor. */
    const destino = zonasDe(to);
    if (destino === 0) {
      const todos = CLAVES_ZONA.reduce((a, k) => a.concat(sl[k] || []), []);
      if (todos.length) sl._guardados = todos;
      CLAVES_ZONA.forEach(k => delete sl[k]);
      sl.blocks = [];
    } else {
      if (sl._guardados) { sl.blocks = (sl.blocks || []).concat(sl._guardados); delete sl._guardados; }
      const sobran = CLAVES_ZONA.slice(destino);
      const rescate = sobran.reduce((a, k) => a.concat(sl[k] || []), []);
      sobran.forEach(k => delete sl[k]);
      if (rescate.length) zona(sl, destino - 1).push(...rescate);
      for (let i = 0; i < destino; i++) zona(sl, i);
    }
    prepararZonas(sl, to);
    if (to === 'toc' && !sl.title) sl.title = 'Contenido';
    sl.layout = to;
  }
  function diapositivaNueva(a) {
    const layout = a.diseno || 'content';
    if (!LAY[layout]) falla('Diseño desconocido: «' + layout + '». Diseños válidos: ' + LAYOUTS.map(l => l.id).join(', ') + '.');
    const sl = { id: uid(), layout, title: a.titulo != null ? String(a.titulo) : (layout === 'toc' ? 'Contenido' : ''), blocks: [] };
    prepararZonas(sl, layout);
    /* Los encabezados de muestra de «Dato grande» y «Cita destacada» son una
       cifra y una atribución reales de otra investigación: no pueden quedarse
       en una charla sin que alguien los haya escrito. */
    if (ES_ENCABEZADO_FICTICIO[layout]) sl.zt = sl.zt.map(() => '');
    aplicaEncabezados(sl, a.encabezados);
    aplicaZonas(sl, a.zonas);
    if (a.notas != null) sl.notes = String(a.notas);
    if (a.minutos != null) sl.min = +a.minutos;
    if (layout === 'twocol' || layout === 'barra') { if (a.division != null) sl.split = +a.division; }
    if (layout === 'flujo' && a.columnas != null) sl.cols = +a.columnas;
    return sl;
  }

  /* ---------- validar ---------- */
  function valida(deck) {
    const r = saneaDeck(deck);
    if (r.error) falla(r.error);
    return { deck: r.deck, avisos: Array.from(new Set(r.avisos)) };
  }

  /* ---------- resumir ---------- */
  const corto = (s, n) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  function resumenBloque(b) {
    const r = { id: b.id, tipo: b.type };
    switch (b.type) {
      case 'text': case 'quote': case 'code': r.texto = corto(b.text, 120); break;
      case 'bullets': r.vinetas = (b.items || []).map(it => '  '.repeat(it.lvl || 0) + corto(it.t, 90)); break;
      case 'math': case 'chem': r.tex = corto(b.tex, 120); break;
      case 'table': r.filas = (b.rows || []).length; r.columnas = ((b.rows || [])[0] || []).length; r.encabezado = (b.rows || [])[0]; break;
      case 'bblock': r.titulo = b.btitle; r.texto = corto(b.body, 100); break;
      case 'chart': r.clase = b.kind; r.ejes = [b.xlabel, b.ylabel]; r.filas = String(b.data || '').split('\n').length - 1; break;
      case 'func': r.curvas = (b.curves || []).map(c => c.expr); break;
      case 'smart': r.clase = b.kind; r.elementos = (b.items || []).map(it => corto(it.t, 50)); break;
      case 'teorema': r.clase = b.kind; r.texto = corto(b.body, 100); break;
      case 'image': r.imagen = b.src ? (String(b.src).startsWith('data:') ? 'incrustada' : b.src) : 'vacía'; break;
    }
    if (b.caption) r.pie = corto(b.caption, 100);
    return r;
  }
  function esquema(deck) {
    return {
      meta: {
        titulo: deck.meta.title, subtitulo: deck.meta.subtitle, autores: deck.meta.authors, institucion: deck.meta.institute,
        fecha: deck.meta.date, tema: deck.meta.theme, aspecto: deck.meta.aspect, acento: deck.meta.acento || null,
        referencias: (deck.meta.refs || []).map(r => ({ id: r.id, autores: corto(r.autores, 60), titulo: corto(r.titulo, 80), anio: r.anio, doi: r.doi }))
      },
      minutos: Math.round(deck.slides.reduce((a, s) => a + (+s.min || 0), 0) * 100) / 100,
      diapositivas: deck.slides.map((sl, i) => {
        const n = zonasDe(sl.layout);
        const o = { n: i + 1, id: sl.id, diseno: sl.layout, titulo: sl.title };
        if (n) o.zonas = CLAVES_ZONA.slice(0, n).map(k => (sl[k] || []).map(resumenBloque));
        if (sl.zt && sl.zt.length) o.encabezados = sl.zt;
        if (sl.notes) o.notas = corto(sl.notes, 160);
        if (sl.min) o.minutos = sl.min;
        if (sl.citas) o.citas = sl.citas;
        return o;
      })
    };
  }

  /* ---------- guía ---------- */
  function guia() {
    const ejemplo = {};
    TIPOS_GUIADOS.forEach(t => { const b = newBlock(t); delete b.id; ejemplo[t] = b; });
    return {
      disenos: LAYOUTS.map(l => ({ id: l.id, nombre: l.name, zonas: l.z, uso: l.d, encabezados: ZT_DEF[l.id] ? (ES_ENCABEZADO_FICTICIO[l.id] ? ZT_DEF[l.id].map(() => '') : ZT_DEF[l.id]) : undefined })),
      temas: Object.keys(THEMES).map(k => ({ id: k, nombre: THEMES[k].name, uso: THEMES[k].desc, oscuro: THEMES[k].dark })),
      tipografias: FUENTES.map(f => ({ id: f.id, nombre: f.n || f.name || f.id })),
      bloques: BLOCK_DEFS.map(d => ({ tipo: d.id, nombre: d.name, guiado: TIPOS_GUIADOS.includes(d.id) })),
      valores_por_omision: ejemplo,
      clases: {
        chart: CHART_KINDS.map(k => k.id),
        smart: SMART_KINDS.map(k => ({ id: k.id, uso: k.d, min: k.min, max: k.max })),
        bblock: ['block', 'alert', 'example'],
        teorema: TEOREMAS.map(t => t.id),
        text_size: ['s', 'n', 'l'], text_align: ['left', 'center', 'right']
      }
    };
  }

  /* ---------- revisar ---------- */
  function revisa(deck) {
    loadDeck(deck, null);
    const cal = calidadCientifica(deck).map(f => ({ grado: f.grado, diapositiva: f.i + 1, problema: f.qué, arreglo: f.cómo, bloque: f.bid }));
    let acc = { hallazgos: [] };
    try { acc = revisaAccesibilidad(deck); } catch (e) {}
    /* El contraste se mide con estilos calculados y JSDOM no los calcula de
       verdad: se omite aquí en vez de dar un resultado inventado. */
    const accesibilidad = (acc.hallazgos || []).filter(h => !/contraste/i.test(h.qué)).map(h => ({ diapositiva: h.i + 1, problema: h.qué, arreglo: h.cómo }));
    const inf = informeExportacion(deck);
    const estructura = [];
    deck.slides.forEach((sl, i) => {
      const n = zonasDe(sl.layout);
      if (n && !['title', 'section', 'toc'].includes(sl.layout) && !String(sl.title || '').trim() && !['dato', 'cita', 'sangre', 'partida'].includes(sl.layout))
        estructura.push({ diapositiva: i + 1, problema: 'La diapositiva no tiene título', arreglo: 'Un título que diga la conclusión ayuda a seguir la charla.' });
      if (n && CLAVES_ZONA.slice(0, n).every(k => !(sl[k] || []).length))
        estructura.push({ diapositiva: i + 1, problema: 'La diapositiva no tiene bloques', arreglo: 'Añade contenido o cambia a un diseño de estructura.' });
      const palabras = CLAVES_ZONA.slice(0, n).reduce((a, k) => a + (sl[k] || []).reduce((x, b) => x + String(b.text || b.body || (b.items || []).map(it => it.t).join(' ') || '').split(/\s+/).filter(Boolean).length, 0), 0);
      if (palabras > 90) estructura.push({ diapositiva: i + 1, problema: 'Mucho texto (' + palabras + ' palabras)', arreglo: 'Divide en dos diapositivas, pasa detalle a las notas o usa el diseño «flujo».' });
    });
    return {
      calidad_cientifica: cal, accesibilidad, estructura,
      exportacion: inf.warnings.map(w => ({ gravedad: w.severity, mensaje: w.message, diapositivas: w.slides, formatos: w.formats })),
      resumen: inf.summary,
      nota: 'Reglas locales y explicables; no validan el experimento. El contraste y el desbordamiento se comprueban solo con vista_previa en un navegador real.'
    };
  }

  /* ---------- operaciones ---------- */
  const OPS = {
    guia: () => guia(),
    nueva: a => {
      const d = blankDeck();
      const m = d.meta;
      const mapa = { titulo: 'title', titulo_corto: 'short', subtitulo: 'subtitle', autores: 'authors', institucion: 'institute', fecha: 'date', tema: 'theme', aspecto: 'aspect', acento: 'acento', tipografia: 'fuente' };
      Object.keys(mapa).forEach(k => { if (a[k] != null) m[mapa[k]] = String(a[k]); });
      if (a.titulo && !a.titulo_corto) m.short = String(a.titulo).slice(0, 40);
      return valida(d);
    },
    sanea: a => valida(a.deck),
    esquema: a => esquema(a.deck),
    metadatos: a => {
      const d = a.deck, m = d.meta, c = a.cambios || {};
      const mapa = { titulo: 'title', titulo_corto: 'short', subtitulo: 'subtitle', autores: 'authors', institucion: 'institute', fecha: 'date', tema: 'theme', aspecto: 'aspect', acento: 'acento', tipografia: 'fuente', numeros: 'numbers', pie: 'footline' };
      Object.keys(c).forEach(k => {
        const dest = mapa[k];
        if (!dest) falla('Metadato desconocido: «' + k + '». Válidos: ' + Object.keys(mapa).join(', ') + '.');
        if (c[k] === null) delete m[dest]; else m[dest] = (dest === 'numbers' || dest === 'footline') ? !!c[k] : String(c[k]);
      });
      if (c.tema != null && !THEMES[c.tema]) falla('Tema desconocido: «' + c.tema + '». Temas: ' + Object.keys(THEMES).join(', ') + '.');
      if (c.aspecto != null && !['169', '43'].includes(String(c.aspecto))) falla('El aspecto debe ser «169» o «43».');
      return valida(d);
    },
    agregaDiapositiva: a => {
      const d = a.deck, sl = diapositivaNueva(a);
      const pos = a.posicion == null ? d.slides.length : clamp(Math.floor(+a.posicion) - 1, 0, d.slides.length);
      d.slides.splice(pos, 0, sl);
      const r = valida(d);
      r.resultado = { diapositiva: pos + 1, id: sl.id, zonas: zonasDe(sl.layout), encabezados: sl.zt || [] };
      return r;
    },
    editaDiapositiva: a => {
      const d = a.deck, i = indiceDiapositiva(d, a.diapositiva), sl = d.slides[i];
      if (a.diseno != null) cambiaDiseno(sl, a.diseno);
      if (a.titulo != null) sl.title = String(a.titulo);
      if (a.notas != null) sl.notes = String(a.notas);
      if (a.minutos != null) { if (+a.minutos > 0) sl.min = +a.minutos; else delete sl.min; }
      if (a.division != null) sl.split = +a.division;
      if (a.columnas != null) sl.cols = +a.columnas;
      aplicaEncabezados(sl, a.encabezados);
      aplicaZonas(sl, a.zonas);
      const r = valida(d);
      r.resultado = { diapositiva: i + 1, id: sl.id };
      return r;
    },
    eliminaDiapositiva: a => {
      const d = a.deck, i = indiceDiapositiva(d, a.diapositiva);
      if (d.slides.length === 1) falla('No se puede dejar la presentación sin diapositivas.');
      const [sl] = d.slides.splice(i, 1);
      const r = valida(d);
      r.resultado = { eliminada: i + 1, id: sl.id, titulo: sl.title };
      return r;
    },
    mueveDiapositiva: a => {
      const d = a.deck, i = indiceDiapositiva(d, a.diapositiva);
      const [sl] = d.slides.splice(i, 1);
      const j = clamp(Math.floor(+a.a) - 1, 0, d.slides.length);
      d.slides.splice(j, 0, sl);
      const r = valida(d);
      r.resultado = { de: i + 1, a: j + 1, id: sl.id };
      return r;
    },
    agregaBloque: a => {
      const d = a.deck, i = indiceDiapositiva(d, a.diapositiva), sl = d.slides[i];
      const n = zonasDe(sl.layout);
      if (!n) falla('La diapositiva ' + (i + 1) + ' usa el diseño «' + sl.layout + '», que no admite bloques.');
      const z = a.zona == null ? 1 : Math.floor(+a.zona);
      if (z < 1 || z > n) falla('La diapositiva ' + (i + 1) + ' tiene ' + n + ' zona(s); «zona» debe ir de 1 a ' + n + '.');
      const b = bloqueDesde(a.bloque), arr = zona(sl, z - 1);
      const pos = a.posicion == null ? arr.length : clamp(Math.floor(+a.posicion) - 1, 0, arr.length);
      arr.splice(pos, 0, b);
      const r = valida(d);
      r.resultado = { id: b.id, diapositiva: i + 1, zona: z, posicion: pos + 1 };
      return r;
    },
    editaBloque: a => {
      const d = a.deck, f = buscaBloque(d, a.bloque);
      aplicaPropiedades(f.bloque, a.cambios || {});
      const r = valida(d);
      r.resultado = { id: f.bloque.id, diapositiva: f.i + 1 };
      return r;
    },
    eliminaBloque: a => {
      const d = a.deck, f = buscaBloque(d, a.bloque);
      f.arr.splice(f.j, 1);
      const r = valida(d);
      r.resultado = { eliminado: f.bloque.id, diapositiva: f.i + 1 };
      return r;
    },
    agregaReferencia: a => {
      const d = a.deck, ref = { id: uid() };
      ['autores', 'titulo', 'revista', 'anio', 'vol', 'pag', 'doi', 'url', 'clave'].forEach(k => { if (a[k] != null) ref[k] = String(a[k]); });
      if (!ref.autores && !ref.titulo && !ref.doi) falla('Una referencia necesita al menos autores, título o DOI.');
      d.meta.refs = (d.meta.refs || []).concat([ref]);
      (a.diapositivas || []).forEach(x => { const sl = d.slides[indiceDiapositiva(d, x)]; sl.citas = (sl.citas || []).concat([ref.id]); });
      const r = valida(d);
      r.resultado = { id: ref.id, clave: ref.clave || null };
      return r;
    },
    revisa: a => revisa(valida(a.deck).deck),
    beamer: a => ({ tex: toBeamer(valida(a.deck).deck) }),
    html: a => { const v = valida(a.deck).deck; loadDeck(v, null); return { html: buildPrintableHTML(false) }; }
  };

  function ejecuta(op, argsJson) {
    try {
      if (!OPS[op]) falla('Operación desconocida: ' + op);
      return JSON.stringify({ ok: OPS[op](JSON.parse(argsJson || '{}')) });
    } catch (e) {
      return JSON.stringify({ error: e instanceof ErrorMcp ? e.message : 'Error interno: ' + (e && e.message || e) });
    }
  }
  return { ejecuta };
})();
