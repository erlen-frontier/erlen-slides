/* SPDX-License-Identifier: AGPL-3.0-only */
/* Página de la extensión «graficas»: se evalúa tras operaciones.js, en el
   ámbito de la app, para leer los datos con parseTable, detectaTecnica y
   chartSeries, los mismos que usan el editor y el dibujo.

   Dos reglas atraviesan todo el archivo:
   · Lo que se dibuja y lo que se informa son puntos medidos. Ni la comparación
     interpola una serie sobre la rejilla de otra ni un pico se coloca en un
     máximo suavizado: el suavizado solo sirve para encontrarlo.
   · Lo que cambia la lectura de una figura (normalizar, desplazar, recortar)
     se dice en la respuesta y en el pie propuesto; nunca en silencio. */
(function () {
  'use strict';
  const U = ERLEN_MCP.util, falla = U.falla, avisa = U.avisa;
  const numTexto = v => isFinite(v) ? String(+(+v).toPrecision(10)) : '';
  const redondea = (v, n) => +(+v).toPrecision(n || 6);

  /* ---------- utilidades ---------- */
  function intervalo(v) {
    if (v == null) return null;
    if (!Array.isArray(v) || v.length !== 2 || !v.every(x => x !== null && x !== '' && isFinite(+x)) || +v[0] === +v[1])
      falla('«intervalo_x» debe ser [mínimo, máximo] con dos números distintos, p. ej. [5, 40].');
    return [Math.min(+v[0], +v[1]), Math.max(+v[0], +v[1])];
  }
  /* El mismo submuestreo que archivo_datos (operaciones.js): mínimo y máximo
     de cada intervalo, en su orden, así que cada pico conserva su posición y
     su intensidad exactas. Aquí va por serie, porque cada archivo tiene la suya. */
  function submuestrea(pts, max) {
    if (!(max >= 4) || pts.length <= max) return pts;
    const cubos = Math.floor((max - 2) / 2), n = pts.length - 2, idx = [0];
    for (let c = 0; c < cubos; c++) {
      const ini = 1 + Math.floor(c * n / cubos), fin = 1 + Math.floor((c + 1) * n / cubos);
      let lo = ini, hi = ini;
      for (let j = ini; j < fin; j++) {
        if (!(pts[j][1] >= pts[lo][1])) lo = j;
        if (!(pts[j][1] <= pts[hi][1])) hi = j;
      }
      if (lo === hi) idx.push(lo); else idx.push(Math.min(lo, hi), Math.max(lo, hi));
    }
    idx.push(pts.length - 1);
    return idx.map(k => pts[k]);
  }
  /* Área por trapecios sobre los puntos medidos (x ascendente). */
  function area(pts) {
    let s = 0;
    for (let i = 1; i < pts.length; i++) s += (pts[i][0] - pts[i - 1][0]) * (pts[i][1] + pts[i - 1][1]) / 2;
    return s;
  }
  /* Valor de una serie en x por interpolación lineal. Solo se usa para
     calcular cuánto desplazar las curvas sin que se crucen: no se dibuja. */
  function interpola(pts, x) {
    if (x < pts[0][0] || x > pts[pts.length - 1][0]) return NaN;
    let lo = 0, hi = pts.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts[m][0] <= x) lo = m; else hi = m; }
    const [x0, y0] = pts[lo], [x1, y1] = pts[hi];
    return x1 === x0 ? Math.max(y0, y1) : y0 + (y1 - y0) * (x - x0) / (x1 - x0);
  }
  /* Una x repetida (hay equipos que la escriben dos veces) se queda con un solo
     valor para interpolar: el que peor le viene a la separación. */
  function unicos(pts, elige) {
    const out = [];
    pts.forEach(p => { const u = out[out.length - 1]; if (u && u[0] === p[0]) u[1] = elige(u[1], p[1]); else out.push([p[0], p[1]]); });
    return out;
  }
  const mediana = a => { const s = a.slice().sort((p, q) => p - q); return s.length ? s[s.length >> 1] : NaN; };
  const pasoMediano = xs => mediana(xs.slice(1).map((x, i) => Math.abs(x - xs[i])).filter(d => d > 0));
  /* Un encabezado de x que parseTable no pueda confundir con un número: si la
     primera fila fuera toda numérica, se leería como datos. */
  const cabeceraX = t => { const s = String(t || '').replace(/[\t\n\r]/g, ' ').trim(); return s && isNaN(parseFloat(s.replace(/\s/g, ''))) ? s : 'x'; };
  const lista = xs => xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' y ' + xs[xs.length - 1];

  /* ---------- comparar espectros ---------- */
  const SUSTANTIVO = { xrd: 'Difractogramas de rayos X', ftir: 'Espectros FTIR', raman: 'Espectros Raman', uvvis: 'Espectros UV-Vis',
    pl: 'Espectros de fotoluminiscencia', tga: 'Termogramas (TGA)', cv: 'Voltamperogramas' };

  ERLEN_MCP.registra('graficasCompara', a => {
    const d = a.deck;
    const archivos = a.archivos || [];
    const normalizar = a.normalizar == null ? 'ninguno' : String(a.normalizar);
    if (!['max', 'area', 'ninguno'].includes(normalizar)) falla('«normalizar» debe ser max, area o ninguno.');
    let desplazar = a.desplazar == null ? 'auto' : a.desplazar;
    if (desplazar !== 'auto' && !(isFinite(+desplazar) && +desplazar >= 0 && +desplazar <= 150))
      falla('«desplazar» debe ser «auto» o un porcentaje del intervalo de y entre 0 (superpuestas) y 150.');
    const rango = intervalo(a.intervalo_x);
    const maxPts = a.max_puntos == null ? 1500 : Math.floor(+a.max_puntos);
    if (!(maxPts >= 50)) falla('«max_puntos» debe ser al menos 50.');
    let tec = null;
    if (a.tecnica) {
      tec = TECNICAS.find(x => x.id === a.tecnica);
      if (!tec) falla('Técnica desconocida: «' + a.tecnica + '». Válidas: ' + TECNICAS.map(x => x.id).join(', ') + '.');
    }

    const series = archivos.map((f, k) => {
      const donde = '«' + f.ruta + '»';
      const t = parseTable(f.texto);
      if (t.rows.length < 2 || t.headers.length < 2) falla(donde + ': no se reconocieron al menos dos columnas numéricas y dos filas.');
      const col = f.columna == null ? 1 : Math.floor(+f.columna) - 1;
      if (!(col >= 1 && col < t.headers.length)) falla(donde + ': «columna» debe ir de 2 a ' + t.headers.length + ' (la 1 es x).');
      const todos = t.rows.map(r => [r[0], r[col]]).filter(p => isFinite(p[0]) && isFinite(p[1]));
      if (todos.length < 2) falla(donde + ': la columna ' + (col + 1) + ' no tiene al menos dos valores numéricos.');
      const xs0 = todos.map(p => p[0]);
      const xmin0 = Math.min(...xs0), xmax0 = Math.max(...xs0);
      /* Orden ascendente de x (el FTIR suele venir al revés). Los puntos son
         los mismos; solo cambia el orden en que se guardan. */
      let pts = (rango ? todos.filter(p => p[0] >= rango[0] && p[0] <= rango[1]) : todos.slice()).sort((p, q) => p[0] - q[0]);
      if (pts.length < 2) falla(donde + ': no tiene al menos dos puntos entre x = ' + rango[0] + ' y ' + rango[1] + ' (sus datos van de ' + redondea(xmin0) + ' a ' + redondea(xmax0) + ').');
      const enIntervalo = pts.length;
      const imax = pts.reduce((m, p, i) => p[1] > pts[m][1] ? i : m, 0);
      /* El máximo se informa con los números del archivo, antes de normalizar. */
      const maxOriginal = { x: pts[imax][0], y: pts[imax][1] };
      let divisor = 1;
      if (normalizar === 'max') {
        divisor = pts[imax][1];
        if (!(divisor > 0)) falla(donde + ': el máximo es ' + divisor + '; no se puede normalizar al máximo una serie sin valores positivos.');
      } else if (normalizar === 'area') {
        divisor = area(pts);
        if (!(divisor > 0)) falla(donde + ': el área bajo la curva es ' + redondea(divisor, 4) + '; con un área nula o negativa no se puede normalizar por área.');
      }
      /* Se divide (no se multiplica por el inverso) para que el máximo quede
         en 1 exacto. Se normaliza antes de submuestrear: el divisor sale de
         todos los puntos del intervalo. */
      if (divisor !== 1) pts = pts.map(p => [p[0], p[1] / divisor]);
      pts = submuestrea(pts, maxPts);
      const det = detectaTecnica(f.texto, f.archivo);
      let nombre = String(f.nombre != null && String(f.nombre).trim() ? f.nombre : f.archivo.replace(/\.[^.]+$/, '')).replace(/[\t\n\r]+/g, ' ').trim().slice(0, 60);
      if (esColumnaError(nombre)) falla('El nombre «' + nombre + '» (' + donde + ') se leería como una columna de error; elige otro con «nombre».');
      return { f, nombre, pts, t, col, total: todos.length, enIntervalo, xmin0, xmax0, maxOriginal, divisor, det };
    });

    if (!tec) {
      const ids = series.map(s => s.det && s.det.tec && s.det.tec.id).filter(Boolean);
      tec = ids.length ? TECNICAS.find(x => x.id === ids[0]) : null;
      if (new Set(ids).size > 1) avisa('Los archivos parecen de técnicas distintas (' + Array.from(new Set(ids)).join(', ') + '); se usó ' + ids[0] + '. Fíjala con «tecnica» si no es esa.');
      if (!ids.length) avisa('No se reconoció la técnica: los ejes quedan como x e y. Pásala con «tecnica» o escribe xlabel/ylabel en «propiedades».');
    }
    const conTec = tec && tec.id !== 'generico';

    /* La tabla: una columna de x con la unión de las rejillas y una columna por
       archivo. Donde un archivo no midió, la celda queda vacía y la curva une
       solo sus propios puntos: ningún valor se inventa por interpolación. */
    const claves = new Map();
    series.forEach((s, j) => s.pts.forEach(([x, y]) => {
      const c = numTexto(x);
      if (!claves.has(c)) claves.set(c, { x, v: [] });
      claves.get(c).v[j] = y;
    }));
    const filas = Array.from(claves.values()).sort((p, q) => p.x - q.x);
    const comun = filas.length === Math.max(...series.map(s => s.pts.length)) && series.every(s => s.pts.length === filas.length);
    const cab = [cabeceraX(conTec ? tec.x : series[0].t.headers[0])].concat(series.map(s => s.nombre));
    const texto = [cab.join('\t')].concat(filas.map(r => [numTexto(r.x)].concat(series.map((_, j) => numTexto(r.v[j]))).join('\t'))).join('\n');

    /* Desplazamiento. La app apila la primera serie arriba y separa cada una
       de la siguiente un porcentaje del intervalo total de y. En «auto» se
       busca el menor que evite que se crucen donde comparten x. */
    const ys = series.flatMap(s => s.pts.map(p => p[1]));
    const span = (Math.max(...ys) - Math.min(...ys)) || 1;
    let offsetPct = 0, necesario = 0;
    if (desplazar === 'auto') {
      for (let i = 0; i + 1 < series.length; i++) {
        /* La serie de arriba (A) no debe bajar de la de abajo (B): para A cuenta
           su valor más bajo en cada x y para B, el más alto. */
        const A = unicos(series[i].pts, Math.min), B = unicos(series[i + 1].pts, Math.max);
        B.forEach(([x, y]) => { const ya = interpola(A, x); if (isFinite(ya)) necesario = Math.max(necesario, y - ya); });
        A.forEach(([x, y]) => { const yb = interpola(B, x); if (isFinite(yb)) necesario = Math.max(necesario, yb - y); });
      }
      /* No cruzarse no basta para leerlas: con curvas casi iguales (lo normal
         tras normalizar) saldría un 10 % y las líneas base se pegarían. Por eso
         hay un suelo del 35 % y un margen del 6 % sobre lo necesario. */
      offsetPct = Math.max(35, Math.ceil((necesario / span * 100 + 6) / 5) * 5);
      if (offsetPct > 150) { avisa('Para que las curvas no se crucen harían falta un ' + Math.round(necesario / span * 100) + ' % de separación; se usó el máximo del editor (150 %) y alguna se cruzará. Prueba normalizar: "max".'); offsetPct = 150; }
    } else offsetPct = Math.round(+desplazar);
    const apiladas = offsetPct > 0;

    const b = U.bloqueDesde({ tipo: 'chart' });
    b.data = texto;
    b.kind = 'linea';
    if (conTec) { b.tecnica = tec.id; b.xlabel = tec.x; }
    const baseY = conTec ? tec.y : 'y';
    const nombreY = baseY.replace(/\s*\([^)]*\)\s*$/, '');
    b.ylabel = normalizar === 'max' ? nombreY + ' normalizada (u. a.)' : normalizar === 'area' ? nombreY + ' normalizada por área (u. a.)' : baseY;
    if (conTec && tec.invertirX) b.invertirX = true;
    b.offset = apiladas;
    if (apiladas) b.offsetPct = offsetPct;
    b.legend = true;
    const nombres = series.map(s => s.nombre);
    const hash = ERLEN_MCP_HUELLA(texto);
    b.fuente = { nombre: String(series.map(s => s.f.archivo).join(' + ')).slice(0, 120), cuando: new Date().toISOString().slice(0, 10),
      n: filas.length, huella: hash, instrumento: conTec ? tec.n : undefined };

    /* El pie propuesto dice qué se hizo con los datos. */
    const frases = [(conTec && SUSTANTIVO[tec.id] || 'Curvas') + ' de ' + lista(nombres) + '.'];
    if (normalizar === 'max') frases.push('Cada curva está dividida por su valor máximo en el intervalo mostrado.');
    if (normalizar === 'area') frases.push('Cada curva está dividida por su área (regla del trapecio) en el intervalo mostrado.');
    if (apiladas) frases.push(normalizar === 'ninguno' ? 'Curvas desplazadas verticalmente con la misma escala de intensidad; el desplazamiento es solo de presentación.' : 'Curvas desplazadas verticalmente; el desplazamiento es solo de presentación.');
    const sugerido = frases.join(' ');
    b.caption = a.caption != null && String(a.caption).trim() ? String(a.caption) : sugerido;
    if (a.caption != null && String(a.caption).trim()) {
      if (normalizar !== 'ninguno' && !/normaliz/i.test(a.caption)) avisa('El pie no dice que las curvas están normalizadas (' + (normalizar === 'max' ? 'al máximo' : 'por área') + '). Propuesta: «' + sugerido + '».');
      if (apiladas && !/desplaz|apilad|offset|separad/i.test(a.caption)) avisa('El pie no dice que las curvas están desplazadas en vertical. Propuesta: «' + sugerido + '».');
    }
    if (a.propiedades && typeof a.propiedades === 'object') {
      if (['data', 'datos', 'archivo_datos', 'fuente'].some(k => a.propiedades[k] != null)) falla('«propiedades» no puede cambiar los datos ni la procedencia: los arma esta herramienta.');
      U.aplicaPropiedades(b, a.propiedades);
    }

    let n, zonaN;
    if (a.diapositiva != null) {
      const i = U.indiceDiapositiva(d, a.diapositiva), sl = d.slides[i], nz = zonasDe(sl.layout);
      if (!nz) falla('La diapositiva ' + (i + 1) + ' usa el diseño «' + sl.layout + '», que no admite bloques.');
      zonaN = a.zona == null ? 1 : Math.floor(+a.zona);
      if (!(zonaN >= 1 && zonaN <= nz)) falla('La diapositiva ' + (i + 1) + ' tiene ' + nz + ' zona(s); «zona» debe ir de 1 a ' + nz + '.');
      zona(sl, zonaN - 1).push(b);
      n = i + 1;
    } else {
      const sl = U.diapositivaNueva({ titulo: a.titulo });
      zona(sl, 0).push(b);
      const pos = a.posicion == null ? d.slides.length : clamp(Math.floor(+a.posicion) - 1, 0, d.slides.length);
      d.slides.splice(pos, 0, sl);
      n = pos + 1; zonaN = 1;
    }
    const r = U.valida(d);
    r.resultado = {
      bloque: b.id, diapositiva: n, zona: zonaN,
      tecnica: conTec ? tec.n : 'sin identificar',
      series: nombres.length, filas_guardadas: filas.length,
      rejilla_x: comun ? 'común: todos los archivos se midieron en los mismos x' : 'distinta: la tabla une las rejillas y cada serie conserva solo sus puntos medidos (celdas vacías donde no midió; sin interpolar)',
      normalizacion: normalizar === 'ninguno' ? 'ninguna: intensidades tal como vienen en los archivos'
        : normalizar === 'max' ? 'cada serie dividida por su máximo en el intervalo (el máximo queda en 1)'
        : 'cada serie dividida por su área (trapecios sobre los puntos medidos del intervalo); unidades de y: 1/(unidad de x)',
      desplazamiento: apiladas ? { porcentaje: offsetPct, modo: desplazar === 'auto' ? 'automático: lo que evita cruces donde las series comparten x más un 6 % de margen (en pasos de 5 %, al menos 35 %)' : 'fijado', orden: 'la primera serie arriba', nota: 'Solo de presentación: el eje y pierde sus números y muestra «u. a.».' } : 'ninguno: curvas superpuestas con leyenda',
      intervalo_x: rango,
      archivos: series.map(s => ({
        ruta: s.f.ruta, serie: s.nombre, columna: s.t.headers[s.col], sha256: s.f.sha256,
        filas_archivo: s.total, filas_en_intervalo: s.enIntervalo, filas_guardadas: s.pts.length,
        x_archivo: [redondea(s.xmin0), redondea(s.xmax0)],
        maximo_original: s.maxOriginal,
        ...(normalizar !== 'ninguno' ? { divisor: redondea(s.divisor, 8) } : {}),
        tecnica_detectada: s.det && s.det.tec ? s.det.tec.id : null
      })),
      procedencia: { nombre: b.fuente.nombre, n: b.fuente.n, huella: hash, que_es: 'huella de la tabla combinada guardada en la gráfica (como en el editor); la de cada archivo original está en archivos[].sha256' },
      pie: b.caption, pie_sugerido: sugerido,
      nota: 'Mira el resultado con vista_previa. Para rotular picos, marcar_picos con este bloque' + (normalizar !== 'ninguno' ? ' (las intensidades que informe serán las normalizadas)' : '') + '.'
    };
    return r;
  });

  /* ---------- recorte de archivo_datos (transformaBloque) ----------
     La técnica se detecta con el archivo completo, antes de recortar: un
     difractograma recortado a 5–15° ya no parecería uno. */
  ERLEN_MCP.registra('graficasRecorta', a => {
    const [lo, hi] = intervalo(a.intervalo_x);
    const t = parseTable(a.texto);
    if (t.rows.length < 2 || t.headers.length < 2) falla('No se reconocieron al menos dos columnas numéricas y dos filas en «' + a.nombre + '».');
    const xs = t.rows.map(r => r[0]).filter(isFinite);
    const filas = t.rows.filter(r => r[0] >= lo && r[0] <= hi);
    if (filas.length < 2) falla('«' + a.nombre + '» no tiene al menos dos filas entre x = ' + lo + ' y ' + hi + ' (sus datos van de ' + redondea(Math.min(...xs)) + ' a ' + redondea(Math.max(...xs)) + ').');
    const det = detectaTecnica(a.texto, a.nombre);
    return {
      texto: [t.headers.map(h => String(h).replace(/[\t\n\r]/g, ' ')).join('\t')].concat(filas.map(r => r.map(numTexto).join('\t'))).join('\n'),
      tecnica: det && det.tec && det.tec.id !== 'generico' ? det.tec.id : null, filas: filas.length, total: t.rows.length
    };
  });

  /* ---------- picos ---------- */
  /* Máximos locales de la curva suavizada con su prominencia (lo que el pico
     sobresale de la base más alta de sus dos lados, como en scipy), y la
     posición y la altura del punto medido más alto de su entorno. */
  function detectaPicos(pts, o) {
    const n = pts.length, s = o.minimos ? -1 : 1;
    const ys = pts.map(p => s * p[1]);
    const w = o.suavizado != null ? Math.max(0, Math.floor(+o.suavizado)) : Math.max(1, Math.round(n / 400));
    const sm = ys.map((_, i) => { let t = 0, c = 0; for (let j = Math.max(0, i - w); j <= Math.min(n - 1, i + w); j++) { t += ys[j]; c++; } return t / c; });
    const lo = Math.min(...sm), rango = (Math.max(...sm) - lo) || 1;
    const out = [];
    for (let i = 1; i < n - 1; i++) {
      if (!(sm[i] > sm[i - 1] && sm[i] >= sm[i + 1])) continue;
      let izq = sm[i], der = sm[i];
      for (let j = i - 1; j >= 0 && sm[j] <= sm[i]; j--) izq = Math.min(izq, sm[j]);
      for (let j = i + 1; j < n && sm[j] <= sm[i]; j++) {
        /* Una meseta a la misma altura sigue siendo el mismo pico. */
        der = Math.min(der, sm[j]);
      }
      const prom = (sm[i] - Math.max(izq, der)) / rango;
      if (prom < o.prominencia) continue;
      let k = i;
      for (let j = Math.max(0, i - w - 1); j <= Math.min(n - 1, i + w + 1); j++) if (ys[j] > ys[k]) k = j;
      out.push({ k, prom });
    }
    /* Dos candidatos que caen en el mismo punto medido son un pico. */
    const porK = new Map();
    out.forEach(c => { if (!porK.has(c.k) || porK.get(c.k).prom < c.prom) porK.set(c.k, c); });
    return Array.from(porK.values()).sort((p, q) => q.prom - p.prom).slice(0, o.max).sort((p, q) => p.k - q.k);
  }
  const esDrx = b => b.tecnica === 'xrd' || /2\s*θ|2\s*\\theta|2theta/i.test(String(b.xlabel || ''));

  ERLEN_MCP.registra('graficasPicos', a => {
    const d = a.deck, f = U.buscaBloque(d, a.bloque), b = f.bloque;
    if (b.type !== 'chart') falla('marcar_picos trabaja sobre bloques «chart»; este es «' + b.type + '».');
    if ((b.kind || 'linea') === 'barras') falla('En una gráfica de barras no hay picos que marcar.');
    const series = chartSeries(b);
    if (!series.length) falla('La gráfica no tiene series con datos.');
    /* Qué series: por número (desde 1) o por nombre; por omisión, todas. */
    let elegidas = series.map((_, i) => i);
    if (a.serie != null) {
      const i = /^\d+$/.test(String(a.serie)) ? +a.serie - 1 : series.findIndex(s => s.name === String(a.serie));
      if (!(i >= 0 && i < series.length)) falla('No hay serie «' + a.serie + '». Series: ' + series.map((s, j) => (j + 1) + ' «' + s.name + '»').join(', ') + '.');
      elegidas = [i];
    }
    const prom = a.prominencia_min == null ? 0.05 : +a.prominencia_min;
    if (!(prom > 0 && prom < 1)) falla('«prominencia_min» es una fracción del intervalo de y de la serie, entre 0 y 1 (p. ej. 0.05).');
    const max = a.max_picos == null ? 10 : Math.floor(+a.max_picos);
    if (!(max >= 1 && max <= 30)) falla('«max_picos» debe ir de 1 a 30.');
    const sentido = a.sentido == null ? 'auto' : String(a.sentido);
    if (!['auto', 'maximos', 'minimos'].includes(sentido)) falla('«sentido» debe ser auto, maximos o minimos.');
    /* Las bandas de un FTIR en transmitancia son mínimos. */
    const minimos = sentido === 'minimos' || (sentido === 'auto' && /transmit/i.test(String(b.ylabel || '')));
    const lambda = a.longitud_onda == null ? null : +a.longitud_onda;
    if (lambda != null) {
      if (!(lambda > 0 && lambda < 10)) falla('«longitud_onda» va en ångström (p. ej. 1.5406 para Cu Kα1).');
      if (!esDrx(b)) falla('«longitud_onda» solo tiene sentido en un difractograma con 2θ en x.');
    }
    const etiquetas = a.etiquetas == null ? [] : a.etiquetas;
    if (!Array.isArray(etiquetas) || etiquetas.some(e => !e || typeof e !== 'object' || !isFinite(+e.x) || e.texto == null))
      falla('«etiquetas» es una lista de {x, texto} (y «serie» opcional, desde 1).');
    const soloEtiquetas = !!a.solo_etiquetas;
    if (soloEtiquetas && !etiquetas.length) falla('«solo_etiquetas» necesita «etiquetas».');

    const informe = [];
    const nuevos = [];
    elegidas.forEach(si => {
      /* Los puntos de la serie en orden de x: son los guardados en la gráfica. */
      const pts = series[si].pts.map(p => [p[0], p[1]]).sort((p, q) => p[0] - q[0]);
      if (pts.length < 5) { avisa('La serie «' + series[si].name + '» tiene menos de cinco puntos: no se buscan picos.'); return; }
      const xs = pts.map(p => p[0]);
      const paso = pasoMediano(xs), spanX = xs[xs.length - 1] - xs[0];
      const tol = a.tolerancia_x != null ? Math.abs(+a.tolerancia_x) : Math.max(5 * paso, spanX * 0.005);
      const dec = Math.max(0, Math.min(3, Math.ceil(-Math.log10(paso || 1) - 1e-9)));
      const detectados = detectaPicos(pts, { minimos, prominencia: prom, max, suavizado: a.suavizado }).map(c => ({
        x: pts[c.k][0], y: pts[c.k][1], k: c.k, prominencia: redondea(c.prom, 3), texto: pts[c.k][0].toFixed(dec), origen: 'automatico', detectado: true }));
      /* Las etiquetas del usuario mandan sobre las automáticas; sin «serie», van
         a la primera serie elegida (la de arriba si están apiladas). */
      const propias = etiquetas.filter(e => e.serie == null ? si === elegidas[0] : +e.serie - 1 === si);
      const extra = [];
      propias.forEach(e => {
        const x = +e.x, texto = String(e.texto).slice(0, 40);
        const cerca = detectados.filter(p => Math.abs(p.x - x) <= tol).sort((p, q) => Math.abs(p.x - x) - Math.abs(q.x - x))[0];
        if (cerca) { cerca.texto = texto; cerca.origen = 'usuario'; cerca.x_pedida = x; return; }
        /* Sin pico detectado cerca: el punto medido más alto (o más bajo) de
           la ventana, nunca un valor inventado en x. */
        let k = -1;
        pts.forEach((p, j) => { if (Math.abs(p[0] - x) <= tol && (k < 0 || (minimos ? p[1] < pts[k][1] : p[1] > pts[k][1]))) k = j; });
        if (k < 0) { avisa('No hay puntos de «' + series[si].name + '» a menos de ' + redondea(tol, 3) + ' de x = ' + x + ': la etiqueta «' + texto + '» no se puso.'); return; }
        const ya = detectados.find(p => p.k === k) || extra.find(p => p.k === k);
        if (ya) { ya.texto = texto; ya.origen = 'usuario'; ya.x_pedida = x; return; }
        extra.push({ x: pts[k][0], y: pts[k][1], k, prominencia: null, texto, origen: 'usuario', detectado: false, x_pedida: x });
      });
      const todos = detectados.concat(extra).filter(p => !soloEtiquetas || p.origen === 'usuario').sort((p, q) => p.x - q.x);
      todos.forEach(p => nuevos.push({ x: p.x, y: p.y, serie: si, txt: p.texto, ...(minimos ? { abajo: true } : {}) }));
      informe.push({
        serie: series[si].name, n: si + 1, sentido: minimos ? 'mínimos (bandas)' : 'máximos',
        tolerancia_x: redondea(tol, 4),
        picos: todos.map(p => {
          const o = { x: p.x, y: p.y, texto: p.texto, origen: p.origen, detectado: p.detectado };
          if (p.prominencia != null) o.prominencia = p.prominencia;
          if (p.x_pedida != null) o.x_pedida = p.x_pedida;
          if (lambda) o.d_angstrom = redondea(lambda / (2 * Math.sin(p.x / 2 * Math.PI / 180)), 5);
          return o;
        })
      });
    });
    const conservados = a.reemplazar === false ? (b.picos || []) : (b.picos || []).filter(p => !elegidas.includes(+p.serie || 0));
    b.picos = conservados.concat(nuevos);
    if (!b.picos.length) delete b.picos;
    if (!nuevos.length) avisa('No se marcó ningún pico: baja «prominencia_min» o revisa la serie.');
    if (b.picos && b.picos.length > 60) falla('Demasiados rótulos (' + b.picos.length + '); el máximo es 60. Baja «max_picos».');
    const r = U.valida(d);
    r.resultado = {
      bloque: b.id, diapositiva: f.i + 1, rotulos: nuevos.length, series: informe,
      metodo: 'Media móvil para localizar máximos locales y su prominencia (fracción del intervalo de y de la serie); la posición y la intensidad informadas son las del punto guardado más alto de su entorno, sin interpolar ni suavizar.',
      ...(lambda ? { bragg: 'd = λ / (2 sen θ) con λ = ' + lambda + ' Å, θ = (2θ)/2' } : {}),
      nota: 'Los valores son los de la gráfica' + (b.fuente && / \+ /.test(b.fuente.nombre) ? ' (una comparación: si se normalizó, la intensidad es la normalizada)' : '') + '. No se asignan índices de Miller ni bandas: si los conoces, pásalos en «etiquetas» con su x.'
    };
    return r;
  });

  /* ---------- revisión ----------
     Un rótulo de pico que ya no cae en un punto de su serie (se cambiaron los
     datos a mano o se volvieron a leer) señala algo que la figura no muestra. */
  ERLEN_MCP.registraRevision('picos-sin-dato', deck => {
    const out = [];
    deck.slides.forEach((sl, i) => zonas(sl).flat().forEach(b => {
      if (!b || b.type !== 'chart' || !Array.isArray(b.picos) || !b.picos.length) return;
      const series = chartSeries(b);
      const igual = (u, v) => Math.abs(u - v) <= 1e-9 * Math.max(1, Math.abs(u), Math.abs(v));
      const sueltos = b.picos.filter(p => { const s = series[+p.serie || 0]; return !s || !s.pts.some(q => igual(q[0], p.x) && igual(q[1], p.y)); });
      if (sueltos.length) out.push({ categoria: 'ciencia', diapositiva: i + 1, bloque: b.id,
        problema: sueltos.length + ' rótulo(s) de pico no coinciden con los datos actuales de la gráfica (' + sueltos.map(p => p.txt || p.x).join(', ') + ').',
        arreglo: 'Vuelve a ejecutar marcar_picos sobre el bloque o quita los rótulos (editar_bloque con picos: null).' });
    }));
    return out;
  });
})();
