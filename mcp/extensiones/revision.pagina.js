/* SPDX-License-Identifier: AGPL-3.0-only */
/* Página de la extensión «revision»: reglas de revisar_presentacion que miran
   lo que un comité ve y la revisión de la app no mira: unidades, cifras,
   notación, siglas, notas del orador y referencias a figuras. Sus hallazgos
   salen en «adicional», cada uno con su categoría, su diapositiva y el arreglo.

   Criterio común: callar ante la duda. Una revisión que grita de más se ignora
   (31-revision.js lo dice igual), así que cada regla solo avisa de lo que es un
   error casi seguro y deja pasar lo que tiene una lectura legítima. Todo se
   evalúa en un IIFE para no chocar con los nombres globales de la app. */
(() => {
  /* Cada regla se registra en revisar_presentacion y además aquí, para que
     revisar_convenciones las pase solas, sin la revisión completa (que dibuja
     cada diapositiva y tarda segundos). */
  const REGLAS = [];
  const R = (nombre, fn) => {
    const segura = deck => { const r = fn(deck); return Array.isArray(r) ? r : []; };
    REGLAS.push({ nombre, fn: segura });
    ERLEN_MCP.registraRevision(nombre, segura);
  };

  /* ---------- el texto que ve el público ---------- */
  const SIN_TITULO = ['title', 'section', 'toc', 'dato', 'cita', 'sangre', 'partida'];
  const NO_PROSA = new Set(['code', 'math', 'chem', 'refs']);
  const visibles = sl => {
    const n = typeof zonasDe === 'function' ? zonasDe(sl.layout) : 1;
    return CLAVES_ZONA.slice(0, n).flatMap(k => sl[k] || []).filter(Boolean);
  };
  const esContenido = sl => {
    const lay = typeof LAY !== 'undefined' && LAY[sl.layout];
    return !(lay && lay.sinTitulo) && !SIN_TITULO.includes(sl.layout) && visibles(sl).length > 0;
  };
  const deBloque = b => {
    if (typeof textosCitables === 'function') return textosCitables(b);
    const t = [];
    ['text', 'body', 'caption', 'btitle'].forEach(k => { if (typeof b[k] === 'string') t.push(b[k]); });
    (b.items || []).forEach(i => { if (i && typeof i.t === 'string') t.push(i.t); });
    (b.rows || []).forEach(f => (Array.isArray(f) ? f : []).forEach(c => { if (typeof c === 'string') t.push(c); }));
    return t;
  };
  /* Sin matemáticas en línea (ahí manda TeX), citas, enlaces ni DOI: nada de
     eso es prosa y todo produce números o siglas que no lo son. */
  const limpia = s => String(s == null ? '' : s)
    .replace(/\\\$/g, ' ').replace(/\$[^$]*\$/g, ' ')
    .replace(/\[@[^\]]*\]/g, ' ').replace(/https?:\/\/\S+/g, ' ').replace(/\b10\.\d{4,9}\/\S+/g, ' ')
    .replace(/\{\{([^{}]{1,60})\}\}/g, '$1');
  /* Cada trozo: {i (0-based), bid, campo, t (limpio), crudo}. Memorizado por
     mazo: las trece reglas recorren el mismo texto. */
  let memo = null;
  function trozos(deck) {
    if (memo && memo.deck === deck) return memo.t;
    const out = [];
    deck.slides.forEach((sl, i) => {
      const pon = (crudo, campo, bid) => { if (typeof crudo === 'string' && crudo.trim()) out.push({ i, bid: bid || null, campo, t: limpia(crudo), crudo }); };
      pon(sl.title, 'titulo'); pon(sl.subtitle, 'subtitulo');
      visibles(sl).forEach(b => {
        if (NO_PROSA.has(b.type)) return;
        deBloque(b).forEach(s => pon(s, b.type === 'table' ? 'celda' : (s === b.caption ? 'pie' : 'texto'), b.id));
        if (b.type === 'chart' || b.type === 'func') { pon(b.xlabel, 'eje', b.id); pon(b.ylabel, 'eje', b.id); }
      });
    });
    memo = { deck, t: out };
    return out;
  }
  const hallazgo = (categoria, grado, i, problema, arreglo, bid) =>
    Object.assign({ categoria, grado, diapositiva: i + 1, problema, arreglo }, bid ? { bloque: bid } : {});
  const lista = ns => { const u = [...new Set(ns)]; return u.length > 6 ? u.slice(0, 6).join(', ') + '…' : u.join(', '); };
  const diapos = is => { const u = [...new Set(is)]; return (u.length === 1 ? 'diapositiva ' : 'diapositivas ') + lista(u.map(i => i + 1)); };
  const cita = s => '«' + String(s).trim().replace(/\s+/g, ' ').slice(0, 40) + '»';
  const notacionActiva = deck => (deck.meta || {}).notacion !== false;

  /* ================= unidades ================= */
  /* Formas que no son el símbolo del SI (o su forma recomendada), siempre
     detrás de un número: así «segundo», «hrs.» sueltos o «Km» de un nombre no
     cuentan. [patrón, lo que está mal, cómo se escribe]. */
  const N = '(?<![\\p{L}\\d])\\d+(?:[.,]\\d+)?\\s*';
  const FIN = '(?![\\p{L}\\d])';
  const SIMBOLOS_MAL = [
    [N + '(?:seg|segs|sec|secs)\\.?' + FIN, '«seg» o «sec» no es un símbolo', 'El segundo es «s», sin punto ni plural: «30 s».'],
    [N + '(?:hrs|hr|hs)\\.?' + FIN, '«hrs» no es un símbolo', 'La hora es «h», sin punto ni plural: «24 h».'],
    [N + 'mins\\.?' + FIN, '«mins» no es un símbolo', 'El minuto es «min», sin plural: «15 min».'],
    [N + 'grs?\\.?' + FIN, '«gr» no es un símbolo', 'El gramo es «g»: «2.5 g».'],
    [N + 'K(?:g|m|Hz|J|W|Pa|V)' + FIN, 'Prefijo kilo en mayúscula', 'El prefijo kilo es «k» minúscula: «kg», «km», «kHz», «kJ», «kPa».'],
    [N + '(?:ml|mls)' + FIN, '«ml» en lugar de «mL»', 'El SI admite «l» y «L», pero se recomienda «L» para no confundirla con un 1: «10 mL».'],
    [N + '(?:lts?|Lts?)\\.?' + FIN, '«lt» no es un símbolo', 'El litro es «L»: «2 L».'],
    [N + '(?:mts)\\.?' + FIN, '«mts» no es un símbolo', 'El metro es «m», sin plural.'],
    [N + '(?:nms|mgs|kgs|cms|mms)' + FIN, 'Símbolo de unidad en plural', 'Los símbolos no llevan plural: «5 nm», «20 mg».'],
    [N + 'um' + FIN, '«um» en lugar de «µm»', 'El micrómetro es «µm» (letra griega mu).'],
    [N + 'cc' + FIN, '«cc» no es un símbolo', 'Escribe «cm³» o «mL».'],
    [N + '(?:angstroms?|Angstroms?|amstrongs?|Amstrongs?|ángstroms?|Ångströms?)' + FIN, 'Ángstrom escrito con letras', 'Con número va el símbolo: «7.6 Å».'],
    [N + 'grados?\\s+(?:centígrados|cent[ií]grados|Celsius|celsius|C)' + FIN, '«grados C» en lugar de «°C»', 'Con número va el símbolo: «25 °C».'],
    [N + '(?:grados?\\s+(?:Kelvin|kelvin|K)|[°º]\\s?K)' + FIN, 'Kelvin con «grados»', 'El kelvin no lleva grado: «300 K».'],
    ['º\\s?C' + FIN, '«º» (ordinal) en lugar de «°» (grado)', 'El símbolo de grado es «°», no el ordinal «º»: «25 °C».'],
    [N + '°\\s+C' + FIN, 'Espacio entre «°» y «C»', '«°C» es un solo símbolo: «25 °C».']
  ].map(([re, problema, arreglo]) => ({ re: new RegExp(re, 'u'), problema, arreglo }));

  R('unidades-simbolos', deck => {
    const out = [], vistos = new Set();
    trozos(deck).forEach(p => SIMBOLOS_MAL.forEach(r => {
      const m = r.re.exec(p.t);
      const clave = p.i + '|' + r.problema;
      if (!m || vistos.has(clave)) return;
      vistos.add(clave);
      out.push(hallazgo('unidades', 'aviso', p.i, r.problema + ': ' + cita(m[0]), r.arreglo, p.bid));
    }));
    return out;
  });

  /* Número pegado a la unidad. Con la notación automática activa (lo normal)
     la app ya pone el espacio fino al dibujar, así que solo importa cuando el
     proyecto la apagó. El SI no deja espacio con % ni con el grado de ángulo;
     «s», «h» y «M» quedan fuera porque «1s», «2p» o «2M1» son orbitales y
     politipos, no cantidades. */
  const PEGADA = new RegExp('(?<![\\p{L}\\d.,])(\\d+(?:[.,]\\d+)?)(nm|µm|mm|cm|mL|mg|kg|mol|mmol|mM|µM|eV|meV|kJ|kPa|MPa|GPa|Pa|kHz|MHz|Hz|min|Å|mV|mA|ppm|°C|K|L|g|V|W)(?![\\p{L}\\d])', 'u');
  R('unidades-espacio', deck => {
    if (notacionActiva(deck)) return [];
    const out = [], vistos = new Set();
    trozos(deck).forEach(p => {
      const m = PEGADA.exec(p.t);
      if (!m || vistos.has(p.i)) return;
      vistos.add(p.i);
      out.push(hallazgo('unidades', 'sugerencia', p.i, 'Número pegado a la unidad: ' + cita(m[0]),
        'El SI separa número y unidad con un espacio («25 °C», «10 mL»); solo % y el grado de ángulo van pegados. También puedes activar la notación automática, que lo hace sola.', p.bid));
    });
    return out;
  });

  /* La misma magnitud con dos unidades. Solo se compara lo que sin duda es la
     misma magnitud: una temperatura de síntesis en K al lado de otras en °C
     (por debajo de 100 °C, el K de una medida criogénica o a temperatura
     ambiente es la convención y no se señala), el espaciado de red en nm y en
     Å, o una misma variable («d =», «E_a =») con dos unidades de su dimensión.
     Un eje de temperatura en K y otro en °C también cuenta. */
  const DIM = { 'nm': 'longitud', 'Å': 'longitud', 'pm': 'longitud', '°C': 'temperatura', 'ºC': 'temperatura', 'K': 'temperatura', 'eV': 'energía', 'meV': 'energía', 'kJ': 'energía', 'kcal': 'energía' };
  const RE_VAL = /(?<![\p{L}\d.,])(\d+(?:[.,]\d+)?)\s*(nm|Å|pm|°C|ºC|K|meV|eV|kJ|kcal)(?![\p{L}\d/⁻·]|\s*[−-]\s*1|\s*\/)/gu;
  const RE_VAR = /(?<![\p{L}\d])([\p{L}][\p{L}\d_₀-₉()]{0,6})\s*[=≈]\s*(\d+(?:[.,]\d+)?)\s*(nm|Å|pm|°C|ºC|K|meV|eV|kJ|kcal)(?![\p{L}\d])/gu;
  const ESPACIADO = /(espaciad|basal|interlaminar|interplanar|entre\s+(?:capas|láminas|planos)|par[áa]metros?\s+de\s+red|\bd\s*[(_₀-₉0-9=])/iu;
  const norm = u => u === 'ºC' ? '°C' : u;
  R('unidades-mezcla', deck => {
    const out = [];
    const temp = { '°C': [], K: [] }, esp = { nm: [], 'Å': [] }, vars = new Map(), ejes = { '°C': [], K: [] };
    trozos(deck).forEach(p => {
      if (p.campo === 'eje') {
        const u = /\((°C|ºC|K)\)/.exec(p.t);
        if (u && /temperat|^\s*T\b/i.test(p.t)) ejes[norm(u[1])].push(p.i);
        return;
      }
      for (const m of p.t.matchAll(RE_VAL)) {
        const v = parseFloat(m[1].replace(',', '.')), u = norm(m[2]);
        if (u === '°C') temp['°C'].push(p.i);
        else if (u === 'K' && v >= 373) temp.K.push(p.i);
        if ((u === 'nm' || u === 'Å') && ESPACIADO.test(p.t.slice(Math.max(0, m.index - 40), m.index))) esp[u].push(p.i);
      }
      for (const m of p.t.matchAll(RE_VAR)) {
        const u = norm(m[3]), dim = DIM[u], clave = m[1] + '|' + dim;
        /* El mismo umbral que arriba: «T = 77 K» de una isoterma BET no choca con «T = 100 °C». */
        if (u === 'K' && parseFloat(m[2].replace(',', '.')) < 373) continue;
        if (!vars.has(clave)) vars.set(clave, new Map());
        const us = vars.get(clave);
        if (!us.has(u)) us.set(u, []);
        us.get(u).push(p.i);
      }
    });
    const avisa = (que, a, ua, b, ub, arreglo) => {
      const primera = Math.min(...a, ...b);
      out.push(hallazgo('unidades', 'aviso', primera, que + ' en ' + ua + ' (' + diapos(a) + ') y en ' + ub + ' (' + diapos(b) + ')', arreglo));
    };
    const hechos = new Set();
    if (temp['°C'].length && temp.K.length) { hechos.add('temperatura'); avisa('Temperaturas de proceso', temp['°C'], '°C', temp.K, 'K', 'Usa una sola escala en toda la charla (T/K = t/°C + 273.15); si una medida exige K, dilo.'); }
    else if (ejes['°C'].length && ejes.K.length) { hechos.add('temperatura'); avisa('Ejes de temperatura', ejes['°C'], '°C', ejes.K, 'K', 'Rotula todos los ejes de temperatura con la misma unidad para poder compararlos de un vistazo.'); }
    if (esp.nm.length && esp['Å'].length) { hechos.add('longitud'); avisa('El espaciado', esp.nm, 'nm', esp['Å'], 'Å', 'Elige nm o Å para las distancias de red y úsala en texto, tablas y ejes (1 nm = 10 Å).'); }
    vars.forEach((us, clave) => {
      const [nombre, dim] = clave.split('|');
      if (us.size < 2 || hechos.has(dim)) return;
      const [[ua, a], [ub, b]] = [...us.entries()];
      hechos.add(dim);
      avisa('«' + nombre + '» aparece', a, ua, b, ub, 'La misma magnitud con la misma unidad en toda la charla; si conviertes, hazlo una vez.');
    });
    return out;
  });

  /* ================= cifras ================= */
  /* Cifras significativas de un número escrito, sin signo ni ceros a la izquierda. */
  const significativas = s => s.replace(/^[−-]/, '').replace(/[.,]/, '').replace(/^0+/, '').length;
  const decimales = s => { const m = /[.,](\d+)$/.exec(s); return m ? m[1].length : 0; };
  /* Seis cifras o más con tres decimales o más: 7.60412 Å, R² = 0.999871.
     No cuenta si lleva su incertidumbre («± 0.00003» o «7.60412(3)») ni junto
     a una longitud de onda de rayos X, que se cita con toda su precisión. */
  const RE_NUM = /(?<![\p{L}\d.,])[−-]?\d+[.,]\d+(?![\d]|[.,]\d)/gu;
  R('cifras-excesivas', deck => {
    const out = [], vistos = new Set();
    trozos(deck).forEach(p => {
      if (p.campo === 'eje' || /λ|Kα|K-?alfa|longitud de onda/i.test(p.t)) return;
      for (const m of p.t.matchAll(RE_NUM)) {
        const n = m[0];
        if (significativas(n) < 6 || decimales(n) < 3) continue;
        if (/^\s*(\(\d|±|\+\/-)/.test(p.t.slice(m.index + n.length))) continue;
        const clave = p.i + '|' + (p.bid || p.campo);
        if (vistos.has(clave)) continue;
        vistos.add(clave);
        const unidad = (/^\s*[\p{L}°Å%µ]{1,5}/u.exec(p.t.slice(m.index + n.length)) || [''])[0];
        out.push(hallazgo('cifras', 'sugerencia', p.i, 'Demasiadas cifras significativas: ' + cita(n + unidad),
          'Redondea a las cifras que sostiene la incertidumbre de la medida (p. ej. «7.60 Å»), o escribe la incertidumbre al lado.', p.bid));
      }
    });
    return out;
  });

  /* Una columna numérica de tabla con decimales dispares: «1.00 · 1.08 · 1»
     o «1.2 · 3.456». Solo si al menos dos celdas llevan decimales y la
     diferencia es de dos o más: «0.1 · 1 · 10» (razones exactas) no se toca. */
  const CELDA = /^\s*[−-]?(\d+(?:[.,]\d+)?)\s*(?:(?:±|\+\/-)\s*\d+(?:[.,]\d+)?)?\s*(?:%|[\p{L}°Å·⁻¹²³/]{1,8})?\s*$/u;
  R('cifras-columna', deck => {
    const out = [];
    deck.slides.forEach((sl, i) => visibles(sl).filter(b => b.type === 'table' && Array.isArray(b.rows) && b.rows.length > 2).forEach(b => {
      const filas = b.rows.filter(Array.isArray);
      const cab = b.header ? filas[0] : null;
      const cuerpo = b.header ? filas.slice(1) : filas;
      const ancho = Math.max(0, ...cuerpo.map(f => f.length));
      for (let j = 0; j < ancho; j++) {
        const celdas = cuerpo.map(f => String(f[j] == null ? '' : f[j]).trim()).filter(Boolean);
        const nums = celdas.map(c => CELDA.exec(c)).filter(Boolean).map(m => m[1]);
        if (nums.length < 3 || nums.length < celdas.length * 0.8) continue;
        const ds = nums.map(decimales);
        const conDec = ds.filter(d => d > 0).length;
        const lo = Math.min(...ds), hi = Math.max(...ds);
        if (conDec < 2 || hi - lo < 2) continue;
        const nombre = cab && String(cab[j] || '').trim();
        out.push(hallazgo('cifras', 'sugerencia', i, 'Decimales dispares en la columna ' + (nombre ? '«' + nombre + '»' : j + 1) + ' (de ' + lo + ' a ' + hi + ')',
          'Una columna con la misma precisión se compara de un vistazo: escribe todas con los mismos decimales, los que sostenga la medida.', b.id));
      }
    }));
    return out;
  });

  /* Punto y coma decimal en la misma charla. La coma solo cuenta si no puede
     ser otra cosa: nada de localizadores IUPAC («1,2-diol»), pares
     «(1,2)», listas «1,2,3» ni miles «1,000». */
  const RE_PUNTO = /(?<![\p{L}\d.,/])\d+\.\d+(?![\d]|\.\d|\p{L})/gu;
  const RE_COMA = /(?<![\p{L}\d.,/])(\d+),(\d+)(?![\d,]|\.\d|\s*[-‐‑]\s*\p{L}|[-‐‑])/gu;
  R('cifras-separador', deck => {
    const punto = [], coma = [];
    trozos(deck).forEach(p => {
      for (const m of p.t.matchAll(RE_PUNTO)) {
        /* «2.1 Síntesis» al principio es un número de apartado, no un decimal. */
        if (!p.t.slice(0, m.index).trim() && /^\s+\p{Lu}/u.test(p.t.slice(m.index + m[0].length))) continue;
        /* «12.500 rpm» puede ser un millar con punto: tres decimales exactos
           no deciden nada, igual que «1,000» con coma. */
        if (/^[1-9]\d{0,2}\.\d{3}$/.test(m[0])) continue;
        punto.push(p.i);
      }
      for (const m of p.t.matchAll(RE_COMA)) {
        if (m[2].length === 3 && m[1] !== '0') continue;
        if (p.t[m.index - 1] === '(' && p.t[m.index + m[0].length] === ')') continue;
        coma.push(p.i);
      }
    });
    if (!punto.length || !coma.length) return [];
    const menor = coma.length <= punto.length ? coma : punto;
    return [hallazgo('cifras', 'aviso', menor[0], 'Separador decimal mezclado: punto en ' + diapos(punto) + ' y coma en ' + diapos(coma),
      'Usa uno solo en toda la charla, también en tablas y ejes (en química se usa mucho el punto, como en los artículos).')];
  });

  /* ================= notación ================= */
  /* Fórmulas sin subíndices. Con la notación automática activa la app ya
     dibuja Zn(OH)₂, así que solo avisa cuando el proyecto la apagó. Usa el
     mismo detector de la app (esFormula, 39-notacion.js), que exige que todos
     los símbolos sean elementos: «DRX», «R2» o «SEM» no son fórmulas. */
  R('notacion-formulas', deck => {
    if (notacionActiva(deck) || typeof esFormula !== 'function') return [];
    const out = [], vistos = new Set();
    trozos(deck).forEach(p => {
      if (vistos.has(p.i)) return;
      const fs = (p.t.match(/[A-Za-z0-9()·]+/g) || []).filter(esFormula);
      if (!fs.length) return;
      vistos.add(p.i);
      const f = fs[0];
      const tex = '$\\mathrm{' + f.replace(/([A-Za-z)])(\d+)/g, '$1_$2') + '}$';
      out.push(hallazgo('notacion', 'sugerencia', p.i, 'Fórmula sin subíndices: ' + [...new Set(fs)].slice(0, 4).map(x => '«' + x + '»').join(', '),
        'Escríbela como ' + tex + ' o en un bloque de química (mhchem), o activa la notación automática del proyecto, que pone los subíndices sola.', p.bid));
    });
    return out;
  });

  /* Dos nombres para la misma técnica o material en una charla: el público
     duda si son cosas distintas. Siglas en español y en inglés, y variantes
     de escritura de la misma sigla. */
  const SINONIMOS = [['DRX', 'XRD'], ['MEB', 'SEM'], ['MET', 'TEM'], ['ATG', 'TGA'], ['CDB', 'DSC'], ['ATD', 'DTA'],
    ['HDL', 'LDH'], ['RMN', 'NMR'], ['EDS', 'EDX', 'EDXS'], ['FTIR', 'FT-IR', 'IRTF'], ['AFM', 'MFA'],
    ['UV-Vis', 'UV-vis', 'UV–Vis', 'UV–vis', 'UV/Vis', 'UV-VIS']];
  const RE_SIN = SINONIMOS.map(g => g.map(s => new RegExp('(?<![\\p{L}\\d\\-–/])' + s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + '(?![\\p{L}\\d]|[-–/]\\p{L})', 'u')));
  R('notacion-sinonimos', deck => {
    const out = [];
    const ps = trozos(deck);
    SINONIMOS.forEach((g, k) => {
      const usos = g.map((s, j) => ps.filter(p => RE_SIN[k][j].test(p.t)).map(p => p.i));
      const usadas = g.map((s, j) => ({ s, u: usos[j] })).filter(x => x.u.length);
      if (usadas.length < 2) return;
      usadas.sort((a, b) => b.u.length - a.u.length || a.u[0] - b.u[0]);
      const otra = usadas[1];
      out.push(hallazgo('notacion', 'aviso', otra.u[0], 'La misma técnica con dos nombres: ' + usadas.map(x => '«' + x.s + '» (' + diapos(x.u) + ')').join(' y '),
        'Elige una forma (por ejemplo «' + usadas[0].s + '») y úsala en toda la charla, también en ejes y pies.'));
    });
    return out;
  });

  /* ================= siglas ================= */
  /* Siglas que cualquiera en la sala conoce, formatos de archivo y abreviaturas
     que no se definen. Lo demás (DRX, SEM, HDL, BET…) se define la primera vez. */
  const UNIVERSALES = new Set(('SI UV IR ADN DNA ARN RNA PDF CSV TSV JSON XML HTML DOI URL ISBN ISSN PNG SVG JPG JPEG GIF TIFF ' +
    'USB PC OK EE UU USA README LICENSE UA ND NA NS RPM PPM IA AI ID API CPU GPU RAM TV IUPAC ONU OMS PhD MSc').split(' '));
  const RE_SIGLA = /(?<![\p{L}\p{N}\-–/])([A-Z][A-Z0-9]*[A-Z][A-Z0-9]*(?:-[A-Z][A-Za-z0-9]*)*)s?(?![\p{L}\p{N}]|[-–]\p{L})/gu;
  /* Palabras en mayúsculas para enfatizar («MUY», «SOLO», «HOLA») no son
     siglas. Las cortas van en lista; de cuatro letras en adelante, una palabra
     pronunciable con dos vocales o más se deja pasar: se pierde alguna sigla
     (UNAM, HOMO) pero no se acusa a una palabra. */
  const PALABRAS = new Set(('YA LA EL EN ES UN DE SE TE MI TU SU LO YO AL LE MUY LOS LAS UNA UNO CON SIN POR QUE DEL ' +
    'MAS HAY SER FIN VER OJO DOS VEZ HOY').split(' '));
  const palabra = s => PALABRAS.has(s) || (/^[A-Z]{4,}$/.test(s) && (s.match(/[AEIOU]/g) || []).length >= 2 && !/[^AEIOU]{3}/.test(s));
  const romano = s => /^[IVXLCDM]+$/.test(s);
  const deElementos = s => typeof SIMBOLOS !== 'undefined' && /^(?:[A-Z][a-z]?\d*)+$/.test(s) &&
    s.match(/[A-Z][a-z]?/g).every(x => SIMBOLOS.has(x));
  const escRe = s => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  R('acronimos-sin-definir', deck => {
    const glosas = Array.isArray((deck.meta || {}).glosas) ? deck.meta.glosas : [];
    const enGlosario = new Set(glosas.flatMap(g => [g && g.termino].concat(String(g && g.alias || '').split(/\s*,\s*/))).filter(Boolean).map(s => String(s).trim()));
    /* Lo que aparece en las ecuaciones y reacciones es una especie o un
       símbolo (el HA de un equilibrio), no una sigla. */
    const simbolos = new Set();
    deck.slides.forEach(sl => {
      visibles(sl).forEach(b => { if (b.type === 'math' || b.type === 'chem') (String(b.tex || b.text || '').match(/[A-Z][A-Za-z0-9]*/g) || []).forEach(x => simbolos.add(x)); });
    });
    trozos(deck).forEach(p => (String(p.crudo).match(/\$[^$]*\$/g) || []).forEach(m => (m.match(/[A-Z][A-Za-z0-9]*/g) || []).forEach(x => simbolos.add(x))));
    /* Las definiciones se buscan en todo, portada incluida («Hidróxidos dobles
       laminares (HDL)» en el título de la charla); los usos, fuera de la
       portada, donde las siglas son de afiliaciones. */
    const meta = deck.meta || {};
    const todos = [meta.title, meta.subtitle].filter(t => typeof t === 'string' && t.trim()).map(t => ({ i: 0, t: limpia(t), campo: 'meta' }))
      .concat(trozos(deck)).filter(p => p.campo !== 'eje');
    const ps = todos.map((p, k) => ({ p, k })).filter(x => x.p.campo !== 'meta' && deck.slides[x.p.i].layout !== 'title');
    const primeras = new Map();
    ps.forEach(({ p, k }) => {
      /* Un trozo en mayúsculas sostenidas es un rótulo, no siglas. */
      if ((p.t.match(/\b\p{Lu}{4,}\b/gu) || []).length >= 3) return;
      const t = p.t.replace(/\[[^\]]{1,20}\]/g, ' ');
      for (const m of t.matchAll(RE_SIGLA)) {
        const s = m[1];
        if (primeras.has(s)) continue;
        const partes = s.split('-');
        if (partes.every(x => UNIVERSALES.has(x) || !/[A-Z].*[A-Z]/.test(x)) || UNIVERSALES.has(s)) continue;
        if (partes[0].length > 6 || palabra(s) || romano(s) || deElementos(s) || simbolos.has(s) || enGlosario.has(s)) continue;
        if (typeof esFormula === 'function' && esFormula(s)) continue;
        primeras.set(s, { k, p });
      }
    });
    const out = [];
    primeras.forEach(({ k, p }, s) => {
      const e = escRe(s);
      const def = new RegExp('(?<![\\p{L}\\p{N}])' + e + 's?\\s*\\((?=[^)]*\\p{Ll})[^)]{4,}\\)|\\(\\s*' + e + 's?\\s*(?:[),;:]|\\s+(?:por|en|del|de)\\b)|(?<![\\p{L}\\p{N}])' + e + '\\s*[:=—–]\\s*\\p{Ll}', 'u');
      const d = todos.findIndex(q => def.test(q.t));
      if (d >= 0 && d <= k) return;
      if (d > k) out.push(hallazgo('acronimos', 'sugerencia', p.i, 'La sigla «' + s + '» se usa antes de definirse (se define en la diapositiva ' + (todos[d].i + 1) + ')',
        'Desarrolla la sigla la primera vez que aparece: «nombre completo (' + s + ')».', p.bid));
      else out.push(hallazgo('acronimos', 'sugerencia', p.i, 'La sigla «' + s + '» no se define',
        'Desarróllala la primera vez que aparece, «nombre completo (' + s + ')», o añádela al glosario (meta.glosas) si la charla lo usa.', p.bid));
    });
    return out;
  });

  /* ================= notas del orador ================= */
  const palabras = s => (String(s || '').trim().match(/\S+/g) || []).length;
  /* Solo cuando la charla ya usa notas: si ninguna diapositiva las tiene, se
     dice una vez para toda la charla y solo si es larga. */
  R('orador-sin-notas', deck => {
    const cont = deck.slides.map((sl, i) => ({ sl, i })).filter(x => esContenido(x.sl));
    const con = cont.filter(x => String(x.sl.notes || '').trim());
    if (!con.length) return cont.length >= 5 ? [hallazgo('orador', 'sugerencia', cont[0].i, 'Ninguna diapositiva tiene notas del orador',
      'Unas líneas por diapositiva (la cifra exacta, la transición, la respuesta a la pregunta previsible) salen en la vista de presentador.')] : [];
    /* Un solo hallazgo con la lista: tres avisos iguales por charla son ruido. */
    const sin = cont.filter(x => !String(x.sl.notes || '').trim()).map(x => x.i);
    return sin.length ? [hallazgo('orador', 'sugerencia', sin[0], (sin.length === 1 ? 'La diapositiva ' : 'Las diapositivas ') + lista(sin.map(i => i + 1)) + (sin.length === 1 ? ' no tiene' : ' no tienen') + ' notas (' + con.length + ' de ' + cont.length + ' de contenido las tienen)',
      'Añade qué vas a decir o qué debe mirar el público; aparece en la vista de presentador.')] : [];
  });
  /* tiempo.sin_tiempo de la revisión común ya lista las que no tienen minutos;
     esta regla lo vuelve un hallazgo con arreglo cuando la mayoría sí los tiene,
     que es cuando falta uno de verdad (la app avisa por su cuenta por debajo del 60 %). */
  R('orador-sin-minutos', deck => {
    const con = deck.slides.filter(sl => +sl.min > 0);
    if (!con.length || con.length === deck.slides.length || con.length < deck.slides.length * 0.6) return [];
    const media = Math.round(con.reduce((a, sl) => a + +sl.min, 0) / con.length * 2) / 2 || 0.5;
    const sin = deck.slides.map((sl, i) => +sl.min > 0 ? -1 : i).filter(i => i >= 0);
    return [hallazgo('orador', 'sugerencia', sin[0], (sin.length === 1 ? 'La diapositiva ' : 'Las diapositivas ') + lista(sin.map(i => i + 1)) + (sin.length === 1 ? ' no tiene' : ' no tienen') + ' minutos previstos (' + con.length + ' de ' + deck.slides.length + ' los tienen)',
      'Asígnales minutos (la media de las demás es ' + media + ' min) para que el total y el ritmo de la vista de presentador sean fiables.')];
  });
  /* Unas 130 palabras por minuto leídas en voz alta (lo mismo que usa «Notas
     de corrido», 34-pulido.js). Con un 25 % de margen y a partir de 50 palabras:
     unas notas de guion, no de apuntes, que no caben en el tiempo previsto. */
  const PPM = 130;
  R('orador-notas-largas', deck => deck.slides.map((sl, i) => ({ sl, i, w: palabras(sl.notes), min: +sl.min || 0 }))
    .filter(x => x.min > 0 && x.w >= 50 && x.w / PPM > x.min * 1.25)
    .map(x => hallazgo('orador', 'aviso', x.i, 'Las notas (' + x.w + ' palabras) necesitan unos ' + Math.round(x.w / PPM * 10) / 10 + ' min leídas en voz alta y la diapositiva tiene ' + x.min + ' min',
      'Recorta las notas a lo esencial (≈' + Math.round(x.min * PPM) + ' palabras) o dale más tiempo a la diapositiva.')));

  /* ================= figuras ================= */
  /* «Figura 3» en el texto tiene que existir. Si los pies van numerados
     («Figura 2. …»), se compara con esa numeración; si no, con el número de
     figuras de la charla. «Figura 3 de Pérez» o «en [@clave]» citan la figura
     de otro trabajo y no se miran. */
  const TIPOS_FIG = new Set((typeof TIPOS_FIGURA !== 'undefined' ? TIPOS_FIGURA : ['image', 'chart', 'func', 'video', 'smart', 'estruct', 'montaje', 'geo']).concat(['galeria']));
  const CLASES = [
    { nombre: 'Figura', es: b => TIPOS_FIG.has(b.type), ref: /(?<![\p{L}])(?:Figuras?|Figs?\.)\s*(\d+)(?:\s*(?:y|a|,|[-–])\s*(\d+))?/gu, rotulo: /^\s*(?:Figura|Fig\.)\s*(\d+)/u },
    { nombre: 'Tabla', es: b => b.type === 'table', ref: /(?<![\p{L}])Tablas?\s+(\d+)(?:\s*(?:y|a|,|[-–])\s*(\d+))?/gu, rotulo: /^\s*Tabla\s*(\d+)/u }
  ];
  R('figuras-referencias', deck => {
    const out = [];
    CLASES.forEach(C => {
      let total = 0;
      const rotulos = [];
      deck.slides.forEach((sl, i) => visibles(sl).forEach(b => {
        if (!C.es(b)) return;
        total++;
        const m = C.rotulo.exec(String(b.caption || ''));
        if (m) rotulos.push({ n: +m[1], i, bid: b.id });
      }));
      /* Pies numerados: duplicados y orden. */
      const vistos = new Map();
      rotulos.forEach(r => {
        if (vistos.has(r.n)) out.push(hallazgo('figuras', 'aviso', r.i, 'Dos pies numerados «' + C.nombre + ' ' + r.n + '» (diapositivas ' + (vistos.get(r.n) + 1) + ' y ' + (r.i + 1) + ')', 'Renumera para que cada ' + C.nombre.toLowerCase() + ' tenga su número.', r.bid));
        else vistos.set(r.n, r.i);
      });
      const fuera = rotulos.find((r, k) => k > 0 && r.n < rotulos[k - 1].n);
      if (fuera) out.push(hallazgo('figuras', 'sugerencia', fuera.i, 'La numeración no sigue el orden de la charla: «' + C.nombre + ' ' + fuera.n + '» va después de otra con número mayor', 'Numera en el orden en que aparecen.', fuera.bid));
      const numeros = new Set(rotulos.map(r => r.n));
      const avisadas = new Set();
      trozos(deck).forEach(p => {
        /* El rótulo del propio pie no es una referencia. */
        const t = p.campo === 'pie' ? p.t.replace(C.rotulo, '') : p.t;
        for (const m of t.matchAll(C.ref)) {
          const tras = t.slice(m.index + m[0].length, m.index + m[0].length + 40);
          if (/^\s*[a-z]?\)?\s*(?:de|del|en)\s/u.test(tras) || /et al|\[@/.test(tras)) continue;
          [m[1], m[2]].filter(Boolean).map(Number).forEach(n => {
            const falta = numeros.size ? !numeros.has(n) : n > total;
            if (!falta || avisadas.has(n) || n === 0) return;
            avisadas.add(n);
            out.push(hallazgo('figuras', 'aviso', p.i, numeros.size
              ? 'Se cita la ' + C.nombre + ' ' + n + ', pero ningún pie lleva ese número (hay ' + lista([...numeros].sort((a, b) => a - b)) + ')'
              : 'Se cita la ' + C.nombre + ' ' + n + ' y la charla tiene ' + total + ' ' + (total === 1 ? C.nombre.toLowerCase() : C.nombre.toLowerCase() + 's'),
            'Corrige el número de la referencia o numera los pies («' + C.nombre + ' 1. …») para que coincidan.', p.bid));
          });
        }
      });
    });
    return out;
  });

  /* ---------- solo estas reglas ---------- */
  ERLEN_MCP.registra('revisionConvenciones', a => {
    const deck = ERLEN_MCP.util.valida(a.deck).deck;
    const cats = Array.isArray(a.categorias) && a.categorias.length ? new Set(a.categorias) : null;
    const hallazgos = [];
    const t0 = Date.now();
    REGLAS.forEach(({ nombre, fn }) => {
      /* Como en la revisión común: una regla que falla se anota y las demás siguen. */
      try { fn(deck).forEach(h => { if (!cats || cats.has(h.categoria)) hallazgos.push(Object.assign({ regla: nombre }, h)); }); }
      catch (e) { hallazgos.push({ regla: nombre, problema: 'La regla falló: ' + (e && e.message || e) }); }
    });
    const cuenta = {};
    hallazgos.forEach(h => { if (h.categoria) cuenta[h.categoria] = (cuenta[h.categoria] || 0) + 1; });
    return { hallazgos, por_categoria: cuenta, reglas: REGLAS.map(r => r.nombre), ms: Date.now() - t0 };
  });
})();
