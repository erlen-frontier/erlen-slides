/* SPDX-License-Identifier: AGPL-3.0-only */
/* Página de la extensión «tablas»: de un CSV, TSV o TXT a las filas de un
   bloque «table». Se evalúa tras operaciones.js.

   Una tabla de una charla cita los datos: lo que dice la celda es lo que
   decía el archivo, salvo el redondeo que se pida, y cada cifra que cambia se
   cuenta. Por eso aquí nada pasa por parseFloat: los números se leen como
   texto decimal (dígitos y posición de la coma) y se redondean sobre esos
   dígitos, sin el error binario que convierte 1,005 en 1,00. */
(function () {
  'use strict';
  const { falla } = ERLEN_MCP.util;

  /* ---------- leer el archivo ----------
     Separador y coma decimal con las mismas reglas que parseTable
     (12-chart.js), para que un archivo se lea igual como gráfica que como
     tabla. parseTable no sirve tal cual: convierte cada celda en número
     (parseFloat acepta «5 mL» como 5), recorta la línea antes de partirla (y
     con ella la celda vacía de la esquina) y descarta las filas sin cifras. */
  const ES_DECIMAL = /^[+-]?\d{1,3}(?:\.\d{3})*,\d+$|^[+-]?\d+,\d+$/;
  function separador(lineas) {
    const muestra = lineas.slice(0, 12).join('\n');
    const hay = re => re.test(muestra);
    if (hay(/\t/)) return '\t';
    if (hay(/;/)) return ';';
    if (hay(/,/)) return ',';
    return ' ';
  }
  /* Comillas al estilo CSV: «"Zn, Al"» es una celda y «""» una comilla. */
  function parte(linea, sep) {
    const out = [];
    let celda = '', comillas = false, citada = false;
    const corta = () => { out.push(citada ? celda : celda.trim()); celda = ''; citada = false; };
    for (let i = 0; i < linea.length; i++) {
      const c = linea[i];
      if (comillas) {
        if (c === '"' && linea[i + 1] === '"') { celda += '"'; i++; }
        else if (c === '"') comillas = false;
        else celda += c;
      } else if (c === '"' && !celda.trim()) { comillas = true; citada = true; celda = ''; }
      else if (sep === ' ' ? /\s/.test(c) : c === sep) {
        if (sep === ' ' && !celda && !citada) continue;
        corta();
      } else if (!citada) celda += c;
    }
    if (sep !== ' ' || celda || citada) corta();
    return out;
  }

  /* ---------- números como texto decimal ----------
     Un número queda como {neg, dig, pos}: su valor es 0,dig × 10^pos, con
     «dig» sin ceros a la izquierda y con los de la derecha tal como se
     escribieron («2,50» son tres cifras). El cero tiene «dig» vacío y guarda
     sus decimales. */
  function numero(texto, coma) {
    let t = String(texto).trim().replace(/−/g, '-');
    let grupos = false;
    if (coma) {
      if (/^[+-]?\d{1,3}(?:\.\d{3})+(?:,\d*)?(?:[eE][+-]?\d+)?$/.test(t)) { t = t.replace(/\./g, ''); grupos = true; }
      else if (t.includes('.')) return null;
      t = t.replace(',', '.');
    }
    const m = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(t);
    if (!m || !(m[2] + (m[3] || '')).length) return null;
    const ent = m[2], frac = m[3] || '', todo = ent + frac;
    const dig = todo.replace(/^0+/, '');
    const ceros = todo.length - dig.length;
    if (!dig) return { neg: false, dig: '', pos: 0, decs: Math.max(0, frac.length - (m[4] ? +m[4] : 0)), exp: m[4] != null, grupos };
    return { neg: m[1] === '-', dig, pos: ent.length - ceros + (m[4] ? +m[4] : 0), exp: m[4] != null, grupos };
  }
  /* Suma uno a una cadena de dígitos; si crece («99» → «100»), lo dice. */
  function incrementa(d) {
    const a = d.split('');
    let i = a.length - 1;
    while (i >= 0 && a[i] === '9') a[i--] = '0';
    if (i < 0) return { dig: '1' + a.join(''), crece: true };
    a[i] = String(+a[i] + 1);
    return { dig: a.join(''), crece: false };
  }
  /* Conserva «m» dígitos; la mitad sube, en valor absoluto, como Excel y
     Origin: así la tabla coincide con la hoja de cálculo de quien la hizo.
     Si hay menos dígitos de los pedidos, no se inventan: «2,5» a tres cifras
     sigue siendo «2,5». Con «cifras», 9,96 a dos cifras es 10 (el acarreo no
     añade una cifra); con «decimales», 9,96 a uno es 10,0. */
  function conserva(n, m, porDecimales) {
    /* Un cero escrito «0,000» se recorta a los decimales pedidos. */
    if (!n.dig) return porDecimales && n.decs > m ? Object.assign({}, n, { decs: Math.max(0, m) }) : n;
    if (n.dig.length <= m) return n;
    let dig = n.dig, pos = n.pos;
    if (m < 1) { dig = '0'.repeat(1 - m) + dig; pos += 1 - m; m = 1; }
    const decs = m - pos;
    let r = { dig: dig.slice(0, m), crece: false };
    if (dig[m] >= '5') r = incrementa(r.dig);
    if (r.crece) { pos++; if (!porDecimales) r.dig = r.dig.slice(0, m); }
    const sin = r.dig.replace(/^0+/, '');
    /* Lo que queda en cero al redondear (0,0004 a dos decimales) guarda sus
       decimales para escribirse «0,00». */
    if (!sin) return Object.assign({}, n, { neg: false, dig: '', pos: 0, decs: Math.max(0, decs) });
    return Object.assign({}, n, { dig: sin, pos: pos - (r.dig.length - sin.length) });
  }
  const aCifras = (n, c) => conserva(n, c, false);
  const aDecimales = (n, d) => conserva(n, n.pos + d, true);
  const decimalesDe = n => n.dig ? n.dig.length - n.pos : n.decs;
  const iguales = (a, b) => a.dig === b.dig && a.pos === b.pos && a.neg === b.neg && decimalesDe(a) === decimalesDe(b);

  /* Escribir: en notación fija salvo que el archivo usara exponente o que el
     redondeo deje ceros que no son cifras (12 345 a dos cifras es 1,2 × 10⁴,
     no 12 000). Dentro de $…$ la coma va entre llaves para que KaTeX no le
     añada espacio. */
  function fija(n, marca) {
    if (!n.dig) { const d = decimalesDe(n); return d > 0 ? '0' + marca + '0'.repeat(d) : '0'; }
    const { dig, pos } = n;
    let s;
    if (pos <= 0) s = '0' + marca + '0'.repeat(-pos) + dig;
    else if (pos >= dig.length) s = dig + '0'.repeat(pos - dig.length);
    else s = dig.slice(0, pos) + marca + dig.slice(pos);
    return (n.neg ? '-' : '') + s;
  }
  const marcaMate = marca => marca === ',' ? '{,}' : '.';
  function escribe(n, marca) {
    const e = n.pos - 1;
    if (!n.dig || !(n.exp || n.pos > n.dig.length) || e === 0) return fija(n, marca);
    return '$' + fija(Object.assign({}, n, { pos: 1 }), marcaMate(marca)) + '\\times10^{' + e + '}$';
  }
  /* Cambiar solo la marca decimal de un número que no se redondea. */
  const cambiaMarca = (t, coma, marca) => coma ? t.replace(/\./g, '').replace(',', marca) : t.replace('.', marca);

  /* ---------- encabezados y unidades ---------- */
  const RE_UNIDAD = /^(.*?)\s*(?:\(([^()]+)\)|\[([^\[\]]+)\]|\s\/\s*(\S.*))$/;
  function unidadDe(cab) {
    const m = RE_UNIDAD.exec(String(cab || '').trim());
    return m && m[1] ? (m[2] || m[3] || m[4]).trim() : null;
  }
  /* Una columna se nombra por su número en el archivo (desde 1) o por su
     encabezado tal como está escrito. */
  function columna(k, cab, ncol, nombre) {
    if (/^\d+$/.test(String(k))) {
      const c = +k - 1;
      if (c < 0 || c >= ncol) falla('«' + nombre + '»: no hay columna ' + k + '; el archivo tiene ' + ncol + '.');
      return c;
    }
    const c = cab ? cab.indexOf(String(k)) : -1;
    if (c < 0) falla('«' + nombre + '»: no hay ninguna columna llamada «' + k + '»' + (cab ? '. Encabezados: ' + cab.map(x => '«' + x + '»').join(', ') + '.' : ' (el archivo no tiene encabezado; usa el número de columna).'));
    return c;
  }
  /* «cifras» y «decimales»: un número vale para todas las columnas; un
     objeto {columna: n}, para esas, y manda sobre el número general. */
  function regla(v, nombre, min, cab, ncol) {
    const out = { todas: null, cols: new Map() };
    if (v == null) return out;
    const n = x => { if (!(Number.isInteger(+x) && +x >= min && +x <= 15) || x === '' || typeof x === 'boolean') falla('«' + nombre + '» debe ser un entero entre ' + min + ' y 15 (recibido: ' + JSON.stringify(x) + ').'); return +x; };
    if (typeof v === 'number' || typeof v === 'string') out.todas = n(v);
    else if (v && typeof v === 'object' && !Array.isArray(v)) Object.keys(v).forEach(k => out.cols.set(columna(k, cab, ncol, nombre), n(v[k])));
    else falla('«' + nombre + '» debe ser un número o un objeto {columna: valor}.');
    return out;
  }

  /* ---------- incertidumbre ----------
     La GUM (§7.2.6) pide dos cifras significativas como mucho; dentro de
     eso, la práctica habitual: una cifra, o dos si la primera es un 1 (0,14
     a una cifra sería 0,1, casi un 30 % menos), y el valor redondeado en la
     misma posición decimal que la última cifra de su incertidumbre. */
  const redondeaError = (e, cifrasError) => aCifras(e, cifrasError || (e.dig[0] === '1' ? 2 : 1));

  ERLEN_MCP.registra('tablaDesdeTexto', a => {
    const nombre = a.nombre || 'archivo';
    const o = a.opciones || {};
    const lineas = String(a.texto || '').replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim() !== '');
    if (!lineas.length) falla('«' + nombre + '» está vacío.');
    const sep = separador(lineas);
    let celdas = lineas.map(l => parte(l, sep)).filter(r => r.some(c => c !== ''));
    if (!celdas.length) falla('«' + nombre + '» no tiene celdas con contenido.');
    const coma = sep !== ',' && celdas.some(r => r.some(c => ES_DECIMAL.test(c.replace(/["'\s]/g, ''))));
    /* Sin «Math.max(...)»: un archivo de instrumento tiene más líneas que
       argumentos admite una llamada. */
    const ncol = celdas.reduce((m, r) => Math.max(m, r.length), 0);
    celdas = celdas.map(r => r.concat(Array(ncol - r.length).fill('')));
    const esNum = c => c !== '' && numero(c, coma) != null;

    /* Hay encabezado si la primera fila es toda texto y, además, alguna
       columna tiene cifras debajo o todas las filas llevan texto. «A1; 2;
       7,5» no es un encabezado. */
    const primera = celdas[0];
    const detectado = celdas.length > 1 && primera.every(c => !esNum(c))
      && (primera.some((c, j) => c !== '' && celdas.slice(1).some(r => esNum(r[j]))) || celdas.slice(1).every(r => r.some(c => c !== '' && !esNum(c))));
    const encabezado = o.encabezado == null ? detectado : !!o.encabezado;
    const cab0 = encabezado ? primera : null;
    let cuerpo = celdas.slice(encabezado ? 1 : 0);
    const filasArchivo = cuerpo.length;
    if (!filasArchivo) falla('«' + nombre + '» no tiene filas de datos' + (encabezado ? ' debajo del encabezado.' : '.'));

    /* filas: [primera, última] de los datos, desde 1, sin el encabezado. */
    if (o.filas != null) {
      const f = Array.isArray(o.filas) ? o.filas : String(o.filas).split(/\s*[-–:]\s*/);
      const ini = Math.floor(+f[0]), fin = f[1] == null || f[1] === '' ? filasArchivo : Math.floor(+f[1]);
      if (!(ini >= 1 && fin >= ini && ini <= filasArchivo)) falla('«filas» debe ser [primera, última] entre 1 y ' + filasArchivo + ' (las filas de datos de «' + nombre + '», sin el encabezado).');
      cuerpo = cuerpo.slice(ini - 1, Math.min(fin, filasArchivo));
    }

    let cols = Array.from({ length: ncol }, (_, j) => j);
    if (o.columnas != null) {
      if (!Array.isArray(o.columnas) || !o.columnas.length) falla('«columnas» debe ser una lista de columnas (número desde 1 o encabezado).');
      cols = o.columnas.map(k => columna(k, cab0, ncol, 'columnas'));
      if (new Set(cols).size !== cols.length) falla('«columnas» repite una columna.');
    }

    const marcaArchivo = coma ? ',' : '.';
    const marca = o.separador_decimal == null ? marcaArchivo : String(o.separador_decimal);
    if (marca !== '.' && marca !== ',') falla('«separador_decimal» debe ser «.» o «,».');
    const cifras = regla(o.cifras, 'cifras', 1, cab0, ncol);
    const decimales = regla(o.decimales, 'decimales', 0, cab0, ncol);
    if (cifras.todas != null && decimales.todas != null) falla('Pide «cifras» o «decimales» para todas las columnas, no las dos; para mezclar, usa un objeto por columna.');
    cifras.cols.forEach((_, c) => { if (decimales.cols.has(c)) falla('La columna ' + (c + 1) + ' tiene «cifras» y «decimales»: elige una.'); });
    const reglaDe = c => cifras.cols.has(c) ? { cifras: cifras.cols.get(c) } : decimales.cols.has(c) ? { decimales: decimales.cols.get(c) }
      : cifras.todas != null ? { cifras: cifras.todas } : decimales.todas != null ? { decimales: decimales.todas } : null;
    const cifrasError = o.cifras_error == null ? null : +o.cifras_error;
    if (cifrasError != null && cifrasError !== 1 && cifrasError !== 2) falla('«cifras_error» debe ser 1 o 2.');

    /* Pares valor ± error: la columna de error es la de la derecha del valor
       en el archivo y la delata su encabezado (esColumnaError, la lista que
       usan las gráficas para las barras de error). */
    const pares = new Map();
    if (o.combinar_error) {
      if (!cab0) falla('«combinar_error» necesita encabezados para reconocer las columnas de error (±, sd, error…).');
      const pedidas = Array.isArray(o.combinar_error) ? o.combinar_error.map(k => columna(k, cab0, ncol, 'combinar_error')) : null;
      cols.forEach(c => {
        if (esColumnaError(cab0[c]) || c + 1 >= ncol || !esColumnaError(cab0[c + 1])) return;
        if (!pedidas || pedidas.includes(c)) pares.set(c, c + 1);
      });
      (pedidas || []).forEach(c => { if (!pares.has(c)) falla('La columna ' + (c + 1) + ' («' + cab0[c] + '») no se muestra o no tiene a su derecha una columna de error reconocible (±, sd, sem, error, desv…).'); });
      if (!pares.size) falla('Ninguna columna mostrada tiene a su derecha una columna de error. Una columna de error lleva en el encabezado ±, sd, sem, error, desv o incertidumbre.');
      pares.forEach((_, c) => { if (cifras.cols.has(c) || decimales.cols.has(c)) falla('La columna ' + (c + 1) + ' se combina con su error, que fija sus decimales: quita «cifras» o «decimales» de esa columna.'); });
      const errores = new Set(pares.values());
      cols = cols.filter(c => !errores.has(c));
    }

    const avisos = [];
    const cuenta = { numericas: 0, sin_cambio: 0, redondeadas: 0, solo_formato: 0, con_menos_cifras: 0, texto: 0, vacias: 0, pares_combinados: 0 };
    const ejemplos = [], menos = new Set(), numericas = new Set();
    let agrupadas = 0, ceros = 0;
    const anota = (original, mostrado) => { if (ejemplos.length < 6) ejemplos.push({ original, mostrado }); };

    /* Una celda sin redondeo conserva su texto; solo cambia la marca decimal
       si se pide otra, y el exponente se escribe × 10ⁿ. */
    function celdaNumero(t, n, r, c) {
      cuenta.numericas++;
      if (n.grupos) agrupadas++;
      let v = n;
      if (r && r.cifras != null) { v = aCifras(n, r.cifras); if (n.dig && n.dig.length < r.cifras) { cuenta.con_menos_cifras++; menos.add(c); } }
      else if (r) { v = aDecimales(n, r.decimales); if (decimalesDe(n) < r.decimales) { cuenta.con_menos_cifras++; menos.add(c); } }
      if (!iguales(v, n)) {
        cuenta.redondeadas++;
        if (!v.dig && n.dig) ceros++;
        const s = escribe(v, marca);
        anota(t, s);
        return s;
      }
      cuenta.sin_cambio++;
      if (!n.exp && marca === marcaArchivo) return t;
      cuenta.solo_formato++;
      return n.exp ? escribe(n, marca) : cambiaMarca(t, coma, marca);
    }
    function celdaPar(tv, te, nv, ne, c) {
      if (te === '' || !ne || !ne.dig || ne.neg) {
        if (te !== '') avisos.push('Hay incertidumbres que no son un número positivo (p. ej. «' + te + '», columna ' + (pares.get(c) + 1) + '): esas celdas muestran solo el valor.');
        return celdaNumero(tv, nv, reglaDe(c), c);
      }
      cuenta.numericas += 2;
      cuenta.pares_combinados++;
      const er = redondeaError(ne, cifrasError);
      const d = decimalesDe(er);
      const vr = aDecimales(nv, d);
      if (decimalesDe(nv) < d) {
        avisos.push('Algunos valores tienen menos decimales que su incertidumbre redondeada (p. ej. «' + tv + ' ± ' + te + '»): se dejan como están, sin añadir ceros que el archivo no trae.');
        cuenta.con_menos_cifras++;
      }
      const cambia = [[nv, vr], [ne, er]].filter(([x, y]) => !iguales(x, y)).length;
      cuenta.redondeadas += cambia;
      cuenta.sin_cambio += 2 - cambia;
      if (!vr.dig && nv.dig) ceros++;
      let s;
      if ((nv.exp || ne.exp) && vr.dig && vr.pos !== 1) {
        /* Con exponente, uno común para los dos: (1,23 ± 0,04) × 10⁻⁵. */
        const e = vr.pos - 1, baja = x => Object.assign({}, x, { pos: x.pos - e }), mm = marcaMate(marca);
        s = '$(' + fija(baja(vr), mm) + ' \\pm ' + fija(baja(er), mm) + ')\\times10^{' + e + '}$';
      } else s = fija(vr, marca) + ' ± ' + fija(er, marca);
      if (cambia) anota(tv + ' ± ' + te, s);
      return s;
    }

    const filas = cuerpo.map(r => cols.map((c, k) => {
      const t = r[c];
      if (t === '') {
        if (pares.has(c) && r[pares.get(c)] !== '') avisos.push('Hay incertidumbres sin su valor (columna ' + (pares.get(c) + 1) + '): no se muestran.');
        cuenta.vacias++;
        return '';
      }
      const n = numero(t, coma);
      if (!n) { cuenta.texto++; return t; }
      numericas.add(k);
      return pares.has(c) ? celdaPar(t, r[pares.get(c)], n, numero(r[pares.get(c)], coma), c) : celdaNumero(t, n, reglaDe(c), c);
    }));

    /* Encabezados con su unidad: se reconoce la que ya traen («d (Å)»,
       «T [°C]», «E / V») y se añade la que se pida. Pedir otra distinta de
       la del archivo es un error: la etiqueta sola no cambia los datos. */
    if (o.unidades != null && (typeof o.unidades !== 'object' || Array.isArray(o.unidades))) falla('«unidades» debe ser un objeto {columna: "unidad"}.');
    const unidades = new Map();
    if (o.unidades) {
      if (!cab0) falla('«unidades» necesita una fila de encabezado donde escribirse (encabezado: true si la primera fila lo es).');
      Object.keys(o.unidades).forEach(k => unidades.set(columna(k, cab0, ncol, 'unidades'), String(o.unidades[k]).trim()));
      unidades.forEach((u, c) => { if (!cols.includes(c)) falla('«unidades» nombra la columna ' + (c + 1) + ', que no se muestra.'); });
    }
    const columnasInfo = cols.map((c, k) => {
      if (!cab0) return { archivo: c + 1, encabezado: null, unidad: null };
      let h = cab0[c], u = unidadDe(h);
      const pedida = unidades.get(c);
      if (pedida && u && u !== pedida) falla('La columna ' + (c + 1) + ' («' + h + '») ya dice su unidad, «' + u + '», y se pidió «' + pedida + '». Si los datos están en otra unidad, conviértelos en el archivo: la etiqueta sola no los cambia.');
      if (pedida && !u) { h += ' (' + pedida + ')'; u = pedida; }
      /* El valor combinado toma la unidad de su error si él no la dice. */
      if (pares.has(c) && !u && unidadDe(cab0[pares.get(c)])) { u = unidadDe(cab0[pares.get(c)]); h += ' (' + u + ')'; }
      return Object.assign({ archivo: c + 1, encabezado: h, unidad: u, numerica: numericas.has(k) }, pares.has(c) ? { error_de: pares.get(c) + 1 } : {});
    });
    if (cab0) {
      const sin = columnasInfo.filter(x => x.numerica && !x.unidad);
      if (sin.length) avisos.push('Columnas numéricas sin unidad en el encabezado: ' + sin.map(x => '«' + x.encabezado + '»').join(', ') + '. Si la tienen, pásala en «unidades»; si son adimensionales (relación molar, pH), está bien así.');
    }
    columnasInfo.forEach(x => delete x.numerica);
    if (agrupadas) avisos.push(agrupadas + ' celda(s) con punto de miles se leyeron como miles («1.500» = 1500), igual que en las gráficas: compruébalo si el archivo mezcla punto y coma decimales.');
    if (coma && cuerpo.some(r => r.some(c => /^[+-]?\d*\.\d+$/.test(c) && numero(c, true) == null)))
      avisos.push('El archivo usa coma decimal y tiene celdas con punto («1.5»): se dejaron como texto, sin interpretarlas.');
    if (ceros) avisos.push(ceros + ' valor(es) quedaron en cero al redondear: pide más decimales o cifras si esa diferencia importa.');
    if (menos.size) avisos.push('Algunas celdas de la(s) columna(s) ' + Array.from(menos).map(c => c + 1).join(', ') + ' tienen menos cifras de las pedidas: se muestran como están, sin añadir ceros que el archivo no trae.');

    const cabeceras = cab0 ? columnasInfo.map(x => x.encabezado) : null;
    const rows = cabeceras ? [cabeceras].concat(filas) : filas;
    const info = {
      archivo_tabla: nombre,
      lectura: { separador: sep === '\t' ? 'tabulador' : sep === ' ' ? 'espacios' : sep, decimal: marcaArchivo, encabezado, encabezado_detectado: detectado },
      filas_archivo: filasArchivo, filas_mostradas: filas.length, columnas_archivo: ncol, columnas_mostradas: cols.length,
      columnas: columnasInfo,
      valores: cuenta,
      separador_decimal: marca,
      ...(ejemplos.length ? { ejemplos_redondeo: ejemplos } : {}),
      ...(pares.size ? { incertidumbre: 'Incertidumbre a ' + (cifrasError ? cifrasError + ' cifra(s) significativa(s)' : '1 cifra significativa (2 si la primera es un 1)') + ' y valor redondeado en la misma posición decimal; la mitad sube.' } : {}),
      avisos: Array.from(new Set(avisos))
    };
    return { rows, header: !!cabeceras, info, ajuste: ajuste(rows, !!cabeceras, a.aspecto, a.caption) };
  });

  /* ---------- ¿cabe en una diapositiva? ----------
     Estimación, no medida (la medida la da vista_previa en Chromium),
     calibrada en Chromium con «content» y el tema por omisión. Cada fila
     mide unos 52 px: caben 9 filas de cuerpo bajo el encabezado, 8 con un
     pie de una línea (la décima ya sale cortada por el margen inferior, y
     vista_previa no siempre lo cuenta como desborde). A lo ancho, cada carácter (la celda más larga de cada
     columna más su relleno) ocupa unos 15 px: unos 78 caben a 16:9 y 57 a
     4:3; pasado eso las celdas se parten en dos líneas y las filas crecen. */
  const FILAS_MAX = 9,CARACTERES_MAX = { 169: 78, 43: 57 };
  const largo = c => String(c).replace(/\\times10\^\{([^}]*)\}/g, '×10$1').replace(/\\pm/g, '±').replace(/[${}\\]/g, '').length;
  function ajuste(rows, header, aspecto, caption) {
    const ncol = rows.length ? rows[0].length : 0;
    const ancho = Array.from({ length: ncol }, (_, j) => rows.reduce((m, r) => Math.max(m, largo(r[j] || '')), 0)).reduce((s, x) => s + x + 3, 0);
    const anchoMax = CARACTERES_MAX[String(aspecto)] || CARACTERES_MAX[169];
    const pie = caption ? largo(caption) : 0;
    const filasMax = FILAS_MAX - (pie ? 1 : 0) - (pie > anchoMax * 1.3 ? 1 : 0);
    const cuerpo = rows.length - (header ? 1 : 0);
    return { cabe: cuerpo <= filasMax && ancho <= anchoMax, filas: cuerpo, filas_max: filasMax, ancho_caracteres: ancho, ancho_max: anchoMax };
  }

  /* ---------- editar_bloque ----------
     Los cambios llegan sin el tipo del bloque, así que Node no puede saber
     si «archivo_tabla» cae en una tabla. Aquí, con el proyecto delante, se
     comprueba antes de la operación; y si el pie nombraba otro archivo
     («Datos: a.csv.»), esa frase se quita: no se atribuye a un archivo lo
     que ya no viene de él. */
  const ejecuta = ERLEN_MCP.ejecuta;
  const { buscaBloque, ErrorMcp } = ERLEN_MCP.util;
  ERLEN_MCP.ejecuta = function (op, json) {
    if (op !== 'editaBloque' || String(json).indexOf('"archivo_tabla"') < 0) return ejecuta(op, json);
    let a;
    try { a = JSON.parse(json); } catch (e) { return ejecuta(op, json); }
    const inf = a.cambios && a.cambios._importado;
    if (!inf || !inf.archivo_tabla) return ejecuta(op, json);
    try {
      const b = buscaBloque(a.deck, a.bloque).bloque;
      if (b.type !== 'table') falla('«archivo_tabla» solo vale para bloques «table»; «' + a.bloque + '» es «' + b.type + '».');
      const nombre = String(inf.archivo_tabla).split('/').pop();
      const m = /(?:^|\s)Datos: (.+)\.$/.exec(b.caption || '');
      if (a.cambios.caption === undefined && m && m[1] !== nombre) {
        a.cambios.caption = b.caption.slice(0, m.index).trim();
        inf.avisos.push('El pie decía «Datos: ' + m[1] + '.» y la tabla ahora viene de «' + nombre + '»: se quitó esa frase (pie_con_fuente la pone con el archivo nuevo).');
      }
    } catch (e) {
      return JSON.stringify({ error: e instanceof ErrorMcp ? e.message : 'Error interno: ' + (e && e.message || e) });
    }
    return ejecuta(op, JSON.stringify(a));
  };
})();
