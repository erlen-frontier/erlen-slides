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
  const TIPOS_GUIADOS = ['text', 'bullets', 'math', 'chem', 'table', 'bblock', 'quote', 'code', 'spacer', 'chart', 'func', 'smart', 'teorema', 'refs', 'image', 'estruct'];

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
  /* Un modelo escribe a menudo el nombre en español («texto», «pie»): se
     traduce si la propiedad de destino existe en ese tipo de bloque. */
  const ALIAS = {
    texto: 'text', pie: 'caption', leyenda_figura: 'caption', datos: 'data', filas: 'rows', ancho: 'w',
    ecuacion: 'tex', formula: 'tex', reaccion: 'tex', cuerpo: 'body', autor: 'by', lenguaje: 'lang', clase: 'kind',
    eje_x: 'xlabel', eje_y: 'ylabel', elementos: 'items', vinetas: 'items', encabezado: 'header', tamano: 'size', tamanio: 'size', 'tamaño': 'size', alineacion: 'align',
    titulo: ['btitle', 'title', 'titulo'], alto: 'hpx', curvas: 'curves', parametros: 'params', animacion: 'anim', texto_alterno: 'alt'
  };
  /* Propiedades que la aplicación lee de algún bloque: lo que no esté aquí
     ni en los valores por omisión es casi seguro una errata. Se sacan del
     propio build para que la lista no se quede atrás. */
  const CONOCIDAS = new Set();
  Array.from(document.scripts).forEach(s => { for (const m of s.textContent.matchAll(/\bb\.([A-Za-z_$][\w$]*)/g)) CONOCIDAS.add(m[1]); });
  ['archivo', 'archivo_datos', 'columnas', 'max_puntos', 'tecnica', 'smiles'].forEach(k => CONOCIDAS.add(k));
  let AVISOS = [];
  const avisa = t => { if (!AVISOS.includes(t)) AVISOS.push(t); };

  function distancia(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  function nombrePropiedad(b, k) {
    const base = newBlock(b.type);
    if (k in base) return k;
    const al = ALIAS[k];
    /* Primero un destino que el bloque ya trae; si el alias es inequívoco,
       también uno opcional que la app lea (el pie de una gráfica no viene en
       sus valores por omisión, pero existe). */
    const destino = (Array.isArray(al) ? al : [al]).find(x => x && x in base) || (typeof al === 'string' && CONOCIDAS.has(al) ? al : null);
    if (destino) return destino;
    if (!CONOCIDAS.has(k)) {
      const cerca = Object.keys(base).concat(['caption', 'alt', 'anim']).filter(x => x !== 'id' && x !== 'type')
        .sort((x, y) => distancia(k, x) - distancia(k, y))[0];
      const parece = cerca && distancia(k, cerca) <= Math.max(2, Math.floor(k.length / 3));
      avisa('Bloque ' + b.type + ': la propiedad «' + k + '» no la usa la aplicación y se ignorará al dibujar' + (parece ? '; ¿quisiste decir «' + cerca + '»?' : '. Consulta guia_formato.'));
    }
    return k;
  }

  /* ---------- datos de instrumento ----------
     El texto del archivo se interpreta con parseTable y detectaTecnica, los
     mismos que al soltar un archivo en el editor. Lo que se guarda es la tabla
     limpia (tabuladores y punto decimal) y la procedencia con su huella. */
  function submuestrea(rows, max) {
    /* Mínimo y máximo de cada intervalo, en su orden: cada pico conserva su
       posición y su intensidad exactas, que en un difractograma o un espectro
       es lo que se va a leer. Se decide por la primera serie y los mismos
       índices valen para las demás columnas. */
    if (!(max >= 4) || rows.length <= max) return rows;
    const cubos = Math.floor((max - 2) / 2), n = rows.length - 2, idx = [0];
    for (let c = 0; c < cubos; c++) {
      const ini = 1 + Math.floor(c * n / cubos), fin = 1 + Math.floor((c + 1) * n / cubos);
      let lo = ini, hi = ini;
      for (let j = ini; j < fin; j++) {
        if (!(rows[j][1] >= rows[lo][1])) lo = j;
        if (!(rows[j][1] <= rows[hi][1])) hi = j;
      }
      if (lo === hi) idx.push(lo); else idx.push(Math.min(lo, hi), Math.max(lo, hi));
    }
    idx.push(rows.length - 1);
    return idx.map(k => rows[k]);
  }
  const numTexto = v => isFinite(v) ? String(+v.toPrecision(10)) : '';
  function importaDatos(b, datos, opciones) {
    if (b.type !== 'chart') falla('«archivo_datos» solo vale para bloques «chart».');
    const t = parseTable(datos.texto);
    if (t.rows.length < 2 || t.headers.length < 2) falla('No se reconocieron al menos dos columnas numéricas y dos filas en «' + datos.nombre + '».');
    let cols = t.headers.map((_, i) => i);
    if (Array.isArray(opciones.columnas)) {
      cols = opciones.columnas.map(c => Math.floor(+c) - 1);
      if (cols.length < 2 || cols.some(c => !(c >= 0 && c < t.headers.length))) falla('«columnas» debe listar al menos dos columnas entre 1 y ' + t.headers.length + ' (la primera es x).');
    }
    let rows = t.rows.map(r => cols.map(c => r[c])).filter(r => isFinite(r[0]));
    const total = rows.length;
    rows = submuestrea(rows, opciones.max_puntos == null ? 1500 : +opciones.max_puntos);
    const texto = [cols.map(c => t.headers[c]).join('\t')].concat(rows.map(r => r.map(numTexto).join('\t'))).join('\n');
    const det = detectaTecnica(texto, datos.nombre);
    let tec = det && det.tec;
    if (opciones.tecnica) {
      tec = TECNICAS.find(x => x.id === opciones.tecnica);
      if (!tec) falla('Técnica desconocida: «' + opciones.tecnica + '». Válidas: ' + TECNICAS.map(x => x.id).join(', ') + '.');
    }
    b.data = texto;
    if (tec && tec.id !== 'generico') {
      b.tecnica = tec.id; b.kind = tec.kind; b.xlabel = tec.x; b.ylabel = tec.y;
      if (tec.invertirX) b.invertirX = true; else delete b.invertirX;
    }
    b.fuente = { nombre: datos.nombre, cuando: new Date().toISOString().slice(0, 10), n: rows.length, huella: ERLEN_MCP_HUELLA(texto), instrumento: tec && tec.id !== 'generico' ? tec.n : undefined };
    return { archivo: datos.nombre, tecnica: tec ? tec.n : 'sin identificar', filas_archivo: total, filas_guardadas: rows.length, columnas: cols.map(c => t.headers[c]), x: [rows[0][0], rows[rows.length - 1][0]] };
  }

  function aplicaPropiedades(b, props, datos) {
    const p = Object.assign({}, props || {});
    let info = null;
    if (p.archivo_datos != null) {
      if (!datos) falla('No se pudo leer «' + p.archivo_datos + '».');
      info = importaDatos(b, datos, p);
    }
    if (info) ['archivo_datos', 'columnas', 'max_puntos', 'tecnica'].forEach(k => delete p[k]);
    Object.keys(p).forEach(k0 => {
      if (k0 === 'tipo' || k0 === 'type' || k0 === 'id' || k0 === '_quimica' || k0 === '_importado') return;
      if (k0 === 'estilo' && b.type === 'estruct') return;
      const k = nombrePropiedad(b, k0);
      let v = p[k0];
      if (b.type === 'chart' && k === 'data') v = tablaATexto(v);
      if (b.type === 'smart' && k === 'items' && Array.isArray(v)) v = v.map(it => typeof it === 'string' ? { t: it } : it);
      if (b.type === 'table' && k === 'rows' && Array.isArray(v)) v = v.map(f => Array.isArray(f) ? f.map(c => String(c == null ? '' : c)) : [String(f)]);
      if ((k === 'est' || k === 'smiles') && b.type !== 'estruct') falla('SMILES y MOL solo valen para bloques «estruct»; este es «' + b.type + '».');
      if (k === 'src' && !['image', 'video'].includes(b.type)) falla('Solo los bloques image y video llevan una imagen o un vídeo (src/archivo); este es «' + b.type + '».');
      if (v === null) delete b[k]; else b[k] = v;
    });
    /* _importado también puede venir del transformaBloque de una extensión:
       es un informe para la respuesta (recogeImportados), no una propiedad. */
    if (info) b._importado = info;
    else if (p._importado) b._importado = p._importado;
    if (b.type === 'estruct') acabaEstructura(b, p);
    return b;
  }
  /* La estructura llega de RDKit con su recuento de hidrógenos en _h. La app
     los deduce por valencia; solo donde no coinciden (un metal, un radical,
     un átomo raro) se fija el número, para que el dibujo diga lo mismo que
     RDKit sin congelar el resto de átomos cuando se edite en el lienzo. */
  function acabaEstructura(b, p) {
    const e = b.est;
    if (p.estilo != null) {
      if (!e) falla('Este bloque «estruct» aún no tiene estructura: pasa smiles, mol o archivo_mol.');
      if (!ESTILOS_REVISTA.some(x => x.id === p.estilo)) falla('Estilo de estructura desconocido: «' + p.estilo + '». Válidos: ' + ESTILOS_REVISTA.map(x => x.id).join(', ') + '.');
      e.estilo = p.estilo;
    }
    if (!e || !p._quimica) return;
    if (p.w == null) b._autoW = true;
    let fijados = 0;
    e.atomos.forEach(a => {
      const h = a._h; delete a._h;
      a.h = null;
      if (h != null && hImplicitos(e, a) !== h) { a.h = h; fijados++; }
    });
    const q = p._quimica;
    const exceso = e.atomos.filter(a => excesoValencia(e, a)).map(a => a.el);
    ESTRUCTURAS.push(Object.assign({ bloque: b.id, formula: formulaMolecular(e) }, q, fijados ? { hidrogenos_fijados: fijados } : {},
      exceso.length ? { avisos: (q.avisos || []).concat(['Valencia excedida en ' + exceso.join(', ') + ': revisa cargas.']) } : {}));
  }
  function bloqueDesde(spec) {
    if (!spec || typeof spec !== 'object' || Array.isArray(spec)) falla('Cada bloque debe ser un objeto con «tipo».');
    const tipo = spec.tipo || spec.type;
    if (!BLOCK_DEFS.some(d => d.id === tipo)) falla('Tipo de bloque desconocido: «' + tipo + '». Tipos válidos: ' + BLOCK_DEFS.map(d => d.id).join(', ') + '.');
    return aplicaPropiedades(newBlock(tipo), spec, DATOS[spec.archivo_datos]);
  }
  /* Los archivos de datos los lee Node y llegan aquí por nombre. */
  let DATOS = {};
  let IMPORTADOS = [];
  let ESTRUCTURAS = [];
  function recogeImportados(deck) {
    deck.slides.forEach(sl => CLAVES_ZONA.forEach(k => (sl[k] || []).forEach(b => {
      if (b && b._importado) { IMPORTADOS.push(Object.assign({ bloque: b.id }, b._importado)); delete b._importado; }
    })));
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

  /* Varias diapositivas de una vez: o entran todas o ninguna, y el error dice
     cuál del lote falló. */
  function lote(lista) {
    return lista.map((x, k) => {
      try { return diapositivaNueva(x || {}); }
      catch (e) { if (e instanceof ErrorMcp) falla('Diapositiva ' + (k + 1) + ' del lote' + (x && x.titulo ? ' («' + x.titulo + '»)' : '') + ': ' + e.message); throw e; }
    });
  }

  /* ---------- validar ---------- */
  /* ---------- tamaño de las estructuras ----------
     Una estructura llena el ancho que se le da, así que con el mismo «w» un
     ion suelto sale gigante y una molécula grande, diminuta. Si el modelo no
     fija «w», se calcula para que el enlace mida lo mismo en todas (unos 32 px
     en una diapositiva de 1280), según el ancho aproximado de su zona. */
  const ENLACE_PX = 36, HUECO_COL = 32;
  /* Ancho de la zona en px de diapositiva, medido en Chromium: el cuerpo
     (W − 96) menos los huecos de 32 px entre columnas. */
  function anchoZona(W, sl, z) {
    const C = W - 96, col = n => (C - HUECO_COL * (n - 1)) / n;
    const s = (+sl.split || 50) / 100;
    switch (sl.layout) {
      case 'twocol': case 'barra': return (C - HUECO_COL) * (z === 0 ? s : 1 - s);
      case 'comparacion': case 'partida': case 'cuadricula': case 'zigzag': return col(2);
      case 'tres': case 'pasos': case 'rejilla6': case 'tresfig': return col(3);
      case 'flujo': return col(+sl.cols || 2);
      case 'filas': return C * 0.78;
      case 'piefigura': return (C - HUECO_COL) * (z === 0 ? 0.7 : 0.3);
      case 'dato': return C * 0.7;
      case 'cita': return C * 0.82;
      default: return C;
    }
  }
  function ajustaEstructuras(deck) {
    const [W] = slideDims(deck);
    deck.slides.forEach((sl, i) => CLAVES_ZONA.forEach((k, z) => (sl[k] || []).forEach(b => {
      if (!b || !b._autoW) return;
      delete b._autoW;
      const zonaPx = anchoZona(W, sl, z);
      const cajaW = cajaEstructura(b.est).w;
      const ideal = cajaW * (ENLACE_PX * W / 1280) / 40 / zonaPx * 100;
      b.w = Math.round(clamp(ideal, 12, 100));
      const info = ESTRUCTURAS.find(x => x.bloque === b.id);
      if (!info) return;
      info.ancho = b.w;
      const px = Math.round(40 * zonaPx * b.w / 100 / cajaW);
      info.enlace_px = px;
      if (px < 24) info.avisos = (info.avisos || []).concat(['La molécula no cabe a buen tamaño en esta zona de la diapositiva ' + (i + 1) + ': los enlaces medirán unos ' + px + ' px, poco legible en una sala. Usa un diseño más ancho («content» o «ancho») o muestra un fragmento.']);
    })));
  }

  function valida(deck) {
    recogeImportados(deck);
    ajustaEstructuras(deck);
    const r = saneaDeck(deck);
    if (r.error) falla(r.error);
    const out = { deck: r.deck, avisos: Array.from(new Set(AVISOS.concat(r.avisos))) };
    if (IMPORTADOS.length) out.datos_importados = IMPORTADOS;
    if (ESTRUCTURAS.length) out.estructuras = ESTRUCTURAS;
    return out;
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
      case 'chart': r.clase = b.kind; r.ejes = [b.xlabel, b.ylabel]; r.filas = String(b.data || '').split('\n').length - 1; if (b.fuente) r.datos_de = b.fuente.nombre; break;
      case 'func': r.curvas = (b.curves || []).map(c => c.expr); break;
      case 'smart': r.clase = b.kind; r.elementos = (b.items || []).map(it => corto(it.t, 50)); break;
      case 'teorema': r.clase = b.kind; r.texto = corto(b.body, 100); break;
      case 'estruct': r.estructura = b.est ? (b.smiles || b.est.atomos.length + ' átomos') : 'vacía'; if (b.est) r.estilo = b.est.estilo || 'diapo'; break;
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
      disenos: LAYOUTS.map(l => ({ id: l.id, nombre: l.name, zonas: l.z, uso: l.d, sin_titulo: l.sinTitulo || undefined, encabezados: ZT_DEF[l.id] ? (ES_ENCABEZADO_FICTICIO[l.id] ? ZT_DEF[l.id].map(() => '') : ZT_DEF[l.id]) : undefined })),
      temas: Object.keys(THEMES).map(k => ({ id: k, nombre: THEMES[k].name, uso: THEMES[k].desc, oscuro: THEMES[k].dark })),
      tipografias: FUENTES.map(f => ({ id: f.id, nombre: f.n || f.name || f.id })),
      bloques: BLOCK_DEFS.map(d => ({ tipo: d.id, nombre: d.name, guiado: TIPOS_GUIADOS.includes(d.id) })),
      valores_por_omision: ejemplo,
      clases: {
        chart: CHART_KINDS.map(k => k.id),
        smart: SMART_KINDS.map(k => ({ id: k.id, uso: k.d, min: k.min, max: k.max })),
        bblock: ['block', 'alert', 'example'],
        teorema: TEOREMAS.map(t => t.id),
        estruct_estilo: ESTILOS_REVISTA.map(x => ({ id: x.id, nombre: x.n })),
        text_size: ['s', 'n', 'l'], text_align: ['left', 'center', 'right']
      }
    };
  }

  /* ---------- revisar ---------- */
  function revisa(deck, objetivo) {
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
      /* Los diseños que no llevan título lo declaran con «sinTitulo» en
         LAYOUTS; la lista fija queda para los que aún no lo hacen. */
      const sinTitulo = (LAY[sl.layout] && LAY[sl.layout].sinTitulo) || ['title', 'section', 'toc', 'dato', 'cita', 'sangre', 'partida'].includes(sl.layout);
      if (n && !sinTitulo && !String(sl.title || '').trim())
        estructura.push({ diapositiva: i + 1, problema: 'La diapositiva no tiene título', arreglo: 'Un título que diga la conclusión ayuda a seguir la charla.' });
      if (n && CLAVES_ZONA.slice(0, n).every(k => !(sl[k] || []).length))
        estructura.push({ diapositiva: i + 1, problema: 'La diapositiva no tiene bloques', arreglo: 'Añade contenido o cambia a un diseño de estructura.' });
      const palabras = CLAVES_ZONA.slice(0, n).reduce((a, k) => a + (sl[k] || []).reduce((x, b) => x + String(b.text || b.body || (b.items || []).map(it => it.t).join(' ') || '').split(/\s+/).filter(Boolean).length, 0), 0);
      if (palabras > 90) estructura.push({ diapositiva: i + 1, problema: 'Mucho texto (' + palabras + ' palabras)', arreglo: 'Divide en dos diapositivas, pasa detalle a las notas o usa el diseño «flujo».' });
    });
    /* Las de respaldo no se cuentan en el tiempo: no se llega a ellas avanzando. */
    const charla = deck.slides.filter(s => !esRespaldo(s));
    const minutos = charla.reduce((a, s) => a + (+s.min || 0), 0);
    const tiempo = { minutos_previstos: Math.round(minutos * 100) / 100, sin_tiempo: deck.slides.map((s, i) => s.min || esRespaldo(s) ? 0 : i + 1).filter(Boolean) };
    if (objetivo > 0) {
      tiempo.minutos_objetivo = +objetivo;
      if (tiempo.sin_tiempo.length === charla.length) tiempo.valoracion = 'Ninguna diapositiva tiene minutos: asigna «minutos» para comparar con el objetivo. Como referencia, ' + charla.length + ' diapositivas suelen ocupar ' + Math.round(charla.length * 1.2) + '–' + Math.round(charla.length * 2) + ' min.';
      else if (minutos > objetivo * 1.1) tiempo.valoracion = 'Excede el objetivo en ' + Math.round((minutos - objetivo) * 10) / 10 + ' min: recorta o mueve diapositivas a respaldo.';
      else if (minutos < objetivo * 0.8) tiempo.valoracion = 'Queda corta por ' + Math.round((objetivo - minutos) * 10) / 10 + ' min.';
      else tiempo.valoracion = 'Dentro del objetivo.';
    }
    /* Reglas de las extensiones: cada una devuelve hallazgos con su
       categoría; una regla que falla no tumba la revisión, se anota. */
    const adicional = [];
    REVISIONES.forEach(({ nombre, fn }) => {
      try { (fn(deck) || []).forEach(h => adicional.push(Object.assign({ regla: nombre }, h))); }
      catch (e) { adicional.push({ regla: nombre, problema: 'La regla falló: ' + (e && e.message || e) }); }
    });
    return {
      calidad_cientifica: cal, accesibilidad, estructura, tiempo, ...(adicional.length ? { adicional } : {}),
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
      if (a.tema != null && !THEMES[a.tema]) falla('Tema desconocido: «' + a.tema + '». Temas: ' + Object.keys(THEMES).join(', ') + '.');
      if (Array.isArray(a.diapositivas)) d.slides.push(...lote(a.diapositivas));
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
    agregaDiapositivas: a => {
      const d = a.deck;
      if (!Array.isArray(a.diapositivas) || !a.diapositivas.length) falla('«diapositivas» debe ser una lista con al menos una diapositiva.');
      const nuevas = lote(a.diapositivas);
      const pos = a.posicion == null ? d.slides.length : clamp(Math.floor(+a.posicion) - 1, 0, d.slides.length);
      d.slides.splice(pos, 0, ...nuevas);
      const r = valida(d);
      r.resultado = { diapositivas: nuevas.map((sl, k) => ({ n: pos + k + 1, id: sl.id, diseno: sl.layout, titulo: sl.title })) };
      return r;
    },
    duplicaDiapositiva: a => {
      const d = a.deck, i = indiceDiapositiva(d, a.diapositiva);
      const c = deepCopy(d.slides[i]); c.id = uid();
      CLAVES_ZONA.forEach(k => (c[k] || []).forEach(b => { b.id = uid(); }));
      d.slides.splice(i + 1, 0, c);
      const r = valida(d);
      r.resultado = { original: i + 1, copia: i + 2, id: c.id };
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
      const d = a.deck, f = buscaBloque(d, a.bloque), c = a.cambios || {};
      /* Datos cambiados a mano: la procedencia ya no describe lo que se ve. */
      if (f.bloque.type === 'chart' && f.bloque.fuente && (c.data != null || c.datos != null) && c.archivo_datos == null) {
        avisa('La gráfica declaraba datos de «' + f.bloque.fuente.nombre + '» y se cambiaron a mano: se quitó la procedencia para no atribuir al archivo lo que ya no viene de él.');
        delete f.bloque.fuente;
      }
      aplicaPropiedades(f.bloque, c, DATOS[c.archivo_datos]);
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
    revisa: a => revisa(valida(a.deck).deck, +a.minutos_objetivo || 0),
    beamer: a => {
      const d = valida(a.deck).deck, tema = THEMES[d.meta.theme] || THEMES.metropolis;
      /* Las figuras salen con el nombre que el .tex espera (figName). */
      loadDeck(d, null);
      const figuras = allImageBlocks().map(b => ({ nombre: b._nom || figName(b), src: b.src,
        estilo: !!(b.est && ((b.est.forma && b.est.forma !== 'recta') || (b.est.marco && b.est.marco !== 'none') || b.est.sombra || (b.est.filtro && b.est.filtro !== 'none'))) }));
      if (d.meta.logo) figuras.unshift({ nombre: 'logo-erlen', src: d.meta.logo, estilo: false });
      return { tex: toBeamer(d), motor: /metropolis|XeLaTeX/.test(tema.tex) ? 'xelatex' : 'pdflatex', figuras };
    },
    html: a => { const v = valida(a.deck).deck; loadDeck(v, null); return { html: buildPrintableHTML(false) }; }
  };

  /* ---------- extensiones ----------
     Los archivos mcp/extensiones/*.pagina.js se evalúan después de este y
     añaden operaciones y reglas de revisión con estas dos funciones. */
  const REVISIONES = [];
  function registra(nombre, fn) {
    if (OPS[nombre]) throw new Error('La operación «' + nombre + '» ya existe.');
    OPS[nombre] = fn;
  }
  function registraRevision(nombre, fn) {
    if (typeof nombre === 'function') { fn = nombre; nombre = 'regla-' + (REVISIONES.length + 1); }
    REVISIONES.push({ nombre, fn });
  }
  const util = { valida, bloqueDesde, aplicaPropiedades, diapositivaNueva, lote, indiceDiapositiva, buscaBloque, cambiaDiseno, esquema, resumenBloque, falla, avisa, ErrorMcp };

  function ejecuta(op, argsJson) {
    try {
      if (!OPS[op]) falla('Operación desconocida: ' + op);
      const args = JSON.parse(argsJson || '{}');
      AVISOS = []; IMPORTADOS = []; ESTRUCTURAS = []; DATOS = args.__datos || {};
      return JSON.stringify({ ok: OPS[op](args) });
    } catch (e) {
      return JSON.stringify({ error: e instanceof ErrorMcp ? e.message : 'Error interno: ' + (e && e.message || e) });
    }
  }
  return { ejecuta, registra, registraRevision, util };
})();
