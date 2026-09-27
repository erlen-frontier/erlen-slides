/* SPDX-License-Identifier: AGPL-3.0-only */
/* Página de la extensión «dinamicas»: se evalúa tras operaciones.js.

   Todo se decide con las piezas de la propia app: los modelos son
   FUNC_MODELS (02-data.js), las fórmulas se leen con exprTry (11-expr.js) y
   las curvas se muestrean con chartSeries (12-chart.js). Así lo que aquí se
   da por bueno es exactamente lo que el editor dibuja y lo que sale en el
   .tex; un validador aparte acabaría aceptando fórmulas que la app no lee. */
(function () {
  const { falla, avisa, buscaBloque, valida } = ERLEN_MCP.util;
  const r4 = v => isFinite(v) ? +(+v).toPrecision(4) : null;
  const plano = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const esObjeto = v => v && typeof v === 'object' && !Array.isArray(v);

  function buscaModelo(ref) {
    const k = plano(ref);
    const m = FUNC_MODELS.find(x => x.id === ref) || FUNC_MODELS.find(x => plano(x.id) === k || plano(x.n) === k);
    if (!m) falla('Modelo desconocido: «' + ref + '». Modelos: ' + FUNC_MODELS.map(x => x.id).join(', ') + ' (listar_modelos_dinamicos los describe).');
    return m;
  }

  function catalogo() {
    return FUNC_MODELS.map(m => ({
      id: m.id, nombre: m.n, descripcion: m.d,
      nota: m.nota ? mathToUnicode(m.nota) : '',
      curvas: m.curves.map(c => ({ nombre: c.name, expr: c.expr })),
      x: { significado: m.x.d, unidad: mathToUnicode(m.x.unit), rango: [m.xmin, m.xmax], rotulo: m.xlabel },
      y: { significado: m.y.d, unidad: mathToUnicode(m.y.unit), rotulo: m.ylabel },
      parametros: m.params.map(p => Object.assign({ nombre: p.name, significado: p.d || '', unidad: mathToUnicode(p.unit || ''),
        valor: p.value, min: p.min, max: p.max, paso: p.step }, p.log ? { log: true } : {}))
    }));
  }

  /* Un parámetro puede llegar como número ({A: 1e9}), como objeto
     ({A: {value, min, max}}) o en la lista de siempre. Sin recorrido se
     propone uno que contenga el valor, y se dice. */
  function normalizaParam(nombre, v, base, avisos) {
    const p = Object.assign({}, base || {}, { name: nombre });
    if (typeof v === 'number' || typeof v === 'string') p.value = +v;
    else if (esObjeto(v)) {
      const al = { valor: 'value', paso: 'step', unidad: 'unit', significado: 'd' };
      Object.keys(v).forEach(k => { if (k !== 'name' && k !== 'nombre') p[al[k] || k] = v[k]; });
    }
    ['value', 'min', 'max', 'step'].forEach(k => { if (p[k] != null) p[k] = +p[k]; });
    if (!(p.min != null && p.max != null) && isFinite(p.value)) {
      const v0 = p.value;
      const [a, z] = v0 > 0 ? [0, 2 * v0] : v0 < 0 ? [2 * v0, 0] : [-1, 1];
      if (p.min == null) p.min = a;
      if (p.max == null) p.max = z;
      avisos.push('«' + nombre + '» llegó sin min/max: el deslizador irá de ' + r4(p.min) + ' a ' + r4(p.max) + '. Pásalos si debe recorrer otro intervalo.');
    }
    /* Un recorrido nuevo sin paso explícito: el de antes solo vale si sigue
       dando posiciones razonables (Ea de 0.1 a 1 con paso 1 no se movería). */
    const pasoDado = esObjeto(v) && (v.step != null || v.paso != null);
    if (!(p.step > 0)) p.step = pasoParam(p.min, p.max);
    else if (!pasoDado) p.step = pasoConservado(p.step, p.min, p.max);
    return p;
  }

  /* De lo que manda el modelo de lenguaje a un bloque func completo, con los
     problemas separados en errores (el bloque no se crea) y avisos. */
  function expande(spec, errores, avisos) {
    const out = Object.assign({}, spec);
    ['curvas', 'parametros', 'modelo', 'tipo', 'type'].forEach(k => delete out[k]);
    let curvas = spec.curves != null ? spec.curves : spec.curvas;
    let params = spec.params != null ? spec.params : spec.parametros;
    let m = null;
    if (spec.modelo != null) {
      m = buscaModelo(spec.modelo);
      const base = bloqueDesdeModelo(m);
      Object.keys(base).forEach(k => { if (out[k] == null || k === 'curves' || k === 'params') out[k] = base[k]; });
      if (curvas != null) errores.push({ problema: 'Con «modelo» las fórmulas son las del modelo: quita «curves» o quita «modelo» y escribe las tuyas.' });
      curvas = base.curves;
      const valores = params;
      params = base.params;
      if (valores != null) {
        if (!esObjeto(valores)) errores.push({ problema: 'Con «modelo», «params» es un objeto {nombre: valor} o {nombre: {value, min, max}}.' });
        else Object.keys(valores).forEach(k => {
          const i = params.findIndex(p => p.name === k);
          if (i < 0) { errores.push({ parametro: k, problema: 'El modelo «' + m.id + '» no tiene el parámetro «' + k + '»; tiene ' + params.map(p => p.name).join(', ') + '.' }); return; }
          params[i] = normalizaParam(k, valores[k], params[i], avisos);
        });
      }
    }
    if (typeof curvas === 'string') curvas = [curvas];
    if (!Array.isArray(curvas) || !curvas.length) { errores.push({ problema: 'Falta la fórmula: pasa «modelo» (listar_modelos_dinamicos) o «curves»: [{expr, name}].' }); curvas = []; }
    out.curves = curvas.map((c, i) => typeof c === 'string' ? { expr: c, name: 'Curva ' + (i + 1) }
      : { expr: String(c.expr != null ? c.expr : c.formula != null ? c.formula : ''), name: String(c.name != null ? c.name : c.nombre != null ? c.nombre : 'Curva ' + (i + 1)) });
    if (params == null) params = [];
    if (esObjeto(params)) params = Object.keys(params).map(k => normalizaParam(k, params[k], null, avisos));
    else if (Array.isArray(params)) params = params.map(p => esObjeto(p) ? normalizaParam(String(p.name != null ? p.name : p.nombre), p, null, avisos) : (errores.push({ problema: 'Cada parámetro de la lista es un objeto {name, value, min, max}.' }), null)).filter(Boolean);
    else { errores.push({ problema: '«params» es una lista [{name, value, min, max}] o un objeto {nombre: valor}.' }); params = []; }
    out.params = params;
    ['xmin', 'xmax'].forEach(k => { if (out[k] != null) out[k] = +out[k]; });
    if (out.xmin == null || out.xmax == null) errores.push({ problema: 'Falta el intervalo de x: pasa «xmin» y «xmax».' });
    return { bloque: out, modelo: m };
  }

  function revisa(b, errores, avisos) {
    const nombres = new Set();
    b.params.forEach(p => {
      if (!/^[A-Za-z_][A-Za-z_0-9]*$/.test(p.name)) errores.push({ parametro: p.name, problema: '«' + p.name + '» no es un nombre de parámetro: letras, dígitos y _, empezando por letra.' });
      else if (p.name === 'x') errores.push({ parametro: 'x', problema: '«x» es la variable del eje horizontal, no un parámetro.' });
      else if (Object.prototype.hasOwnProperty.call(EXPR_CONST, p.name)) errores.push({ parametro: p.name, problema: '«' + p.name + '» es una constante de la app (' + EXPR_CONST[p.name] + ') y la fórmula nunca leería el parámetro: renómbralo.' });
      if (nombres.has(p.name)) errores.push({ parametro: p.name, problema: 'El parámetro «' + p.name + '» está repetido.' });
      nombres.add(p.name);
      if (![p.value, p.min, p.max].every(isFinite)) { errores.push({ parametro: p.name, problema: '«' + p.name + '» necesita value, min y max numéricos.' }); return; }
      if (!(p.max > p.min)) errores.push({ parametro: p.name, problema: '«' + p.name + '»: max (' + p.max + ') debe ser mayor que min (' + p.min + ').' });
      else if (p.value < p.min || p.value > p.max) errores.push({ parametro: p.name, problema: '«' + p.name + '» = ' + p.value + ' queda fuera del deslizador [' + p.min + ', ' + p.max + ']: cambia el valor o pasa min/max que lo incluyan.' });
      if (p.log && !(p.min > 0)) errores.push({ parametro: p.name, problema: '«' + p.name + '»: un deslizador logarítmico necesita min > 0.' });
    });
    const x0 = +b.xmin, x1 = +b.xmax;
    if (b.xmin != null && b.xmax != null) {
      if (!isFinite(x0) || !isFinite(x1) || !(x1 > x0)) errores.push({ problema: 'El intervalo de x no vale: xmax (' + b.xmax + ') debe ser mayor que xmin (' + b.xmin + ').' });
      else if (b.logX && !(x0 > 0)) errores.push({ problema: 'Con el eje x logarítmico, xmin debe ser positivo.' });
    }
    const usados = new Set();
    b.curves.forEach((c, i) => {
      const nombre = c.name || 'Curva ' + (i + 1);
      const r = exprTry(c.expr);
      if (!r) { errores.push({ curva: nombre, problema: 'La fórmula está vacía.' }); return; }
      if (r.error) {
        const e = { curva: nombre, expr: c.expr, problema: 'No se entiende la fórmula: ' + r.error + (r.pos != null ? ' (carácter ' + (r.pos + 1) + ')' : '') + '.' };
        if (r.pos != null) { e.posicion = r.pos; e.marca = c.expr.slice(0, r.pos) + '▸' + c.expr.slice(r.pos); }
        errores.push(e);
        return;
      }
      const faltan = Array.from(r.vars).filter(v => v !== 'x' && !nombres.has(v));
      if (faltan.length) errores.push({ curva: nombre, problema: 'Variables sin definir: ' + faltan.join(', ') + '. Añádelas a «params» con value, min y max (x es la variable del eje; las constantes son ' + Object.keys(EXPR_CONST).join(' ') + ').' });
      if (!r.vars.has('x')) avisos.push('«' + nombre + '» no depende de x: se dibujará como una recta horizontal.');
      r.vars.forEach(v => usados.add(v));
    });
    /* Si alguna fórmula no se entiende, no se sabe qué usa: callar es mejor
       que avisar de parámetros «sobrantes» que sí aparecen en ella. */
    const leidas = b.curves.every(c => { const r = exprTry(c.expr); return r && !r.error; });
    if (leidas) b.params.forEach(p => { if (nombres.has(p.name) && !usados.has(p.name)) avisos.push('El parámetro «' + p.name + '» no aparece en ninguna fórmula: su deslizador no moverá nada.'); });
  }

  /* Se evalúan las curvas con el muestreo de la pantalla: dónde no dan un
     número, qué alto alcanzan y cinco puntos de control. */
  function evalua(b, errores, avisos) {
    if (errores.length) return [];
    const bloque = Object.assign(newBlock('func'), b);
    const series = chartSeries(bloque);
    const x0 = +b.xmin, x1 = +b.xmax;
    const vals = {};
    b.params.forEach(p => { vals[p.name] = p.value; });
    return series.map((s, i) => {
      const c = exprTry(b.curves[i].expr);
      const ok = s.pts.filter(p => isFinite(p[1]));
      const ys = ok.map(p => p[1]);
      /* La fracción sin valor se mide sobre una rejilla uniforme: los puntos
         refinados se amontonan junto a los bordes del dominio y la sesgan. */
      const valeEn = f => {
        const x = b.logX && x0 > 0 ? Math.pow(10, Math.log10(x0) + f * (Math.log10(x1) - Math.log10(x0))) : x0 + f * (x1 - x0);
        let y; try { y = c.fn(Object.assign({ x }, vals)); } catch (e) { y = NaN; }
        return { x, y };
      };
      let sinValor = 0;
      for (let k = 0; k <= 200; k++) if (!isFinite(valeEn(k / 200).y)) sinValor++;
      const control = [0, 0.25, 0.5, 0.75, 1].map(f => { const q = valeEn(f); return { x: r4(q.x), y: r4(q.y) }; });
      const info = { curva: s.name, puntos: s.pts.length, validos: ok.length, y_min: r4(Math.min(...ys)), y_max: r4(Math.max(...ys)), control };
      if (s.cortes) info.discontinuidades = s.cortes;
      if (!ok.length) errores.push({ curva: s.name, problema: 'La fórmula no da ningún valor finito en [' + b.xmin + ', ' + b.xmax + '] con estos parámetros (¿un logaritmo o una raíz de negativos, una división entre cero?).' });
      else {
        const frac = sinValor / 201;
        if (frac > 0.02) avisos.push('«' + s.name + '» no da valor en el ' + Math.round(frac * 100) + ' % del intervalo (fuera de su dominio): ahí no se dibuja.');
        if (s.cortes) avisos.push('«' + s.name + '» tiene ' + s.cortes + ' discontinuidad(es) o polo(s): el trazo se corta ahí y el eje y se ajusta a la parte normal de la curva; fija el eje Y (yminAuto: false, ymin0, ymax0) si quieres otro rango.');
      }
      return info;
    });
  }

  function analiza(spec) {
    const errores = [], avisos = [];
    const { bloque, modelo } = expande(spec || {}, errores, avisos);
    revisa(bloque, errores, avisos);
    const curvas = evalua(bloque, errores, avisos);
    return { valido: !errores.length, errores, avisos, curvas, modelo: modelo ? modelo.id : undefined, bloque };
  }

  ERLEN_MCP.registra('dinamicaModelos', () => ({ modelos: catalogo() }));

  ERLEN_MCP.registra('dinamicaAnaliza', a => {
    let spec = a.bloque;
    if (a.deck && a.id) {
      const f = buscaBloque(ERLEN_MCP.util.valida(a.deck).deck, a.id);
      if (f.bloque.type !== 'func') falla('El bloque «' + a.id + '» es de tipo «' + f.bloque.type + '», no una gráfica dinámica (func).');
      spec = f.bloque;
    }
    if (!esObjeto(spec)) falla('Pasa «bloque» ({modelo, params} o {curves, params, xmin, xmax}) o «archivo» con el «bloque_id» de una gráfica dinámica.');
    const r = analiza(spec);
    ['id', 'type'].forEach(k => delete r.bloque[k]);
    return r;
  });

  /* Mover los deslizadores desde fuera: el estado que se ve al abrir la
     diapositiva y el que sale fijo en el PDF y en Beamer. */
  ERLEN_MCP.registra('dinamicaAjusta', a => {
    const d = a.deck, f = buscaBloque(d, a.bloque), b = f.bloque;
    if (b.type !== 'func') falla('El bloque «' + a.bloque + '» es de tipo «' + b.type + '», no una gráfica dinámica (func).');
    const antes = JSON.stringify(b.params || []);
    const params = deepCopy(b.params || []);
    const vals = a.valores || {};
    if (!esObjeto(vals)) falla('«valores» es un objeto {nombre: valor} o {nombre: {value, min, max}}.');
    const avisos = [];
    Object.keys(vals).forEach(k => {
      const i = params.findIndex(p => p.name === k);
      if (i < 0) falla('La gráfica no tiene el parámetro «' + k + '»; tiene ' + params.map(p => p.name).join(', ') + '.');
      params[i] = normalizaParam(k, vals[k], params[i], avisos);
    });
    const nuevo = Object.assign({}, b, { params });
    ['xmin', 'xmax'].forEach(k => { if (a[k] != null) nuevo[k] = +a[k]; });
    const r = analiza(nuevo);
    if (!r.valido) falla('No se cambió nada: ' + r.errores.map(e => (e.curva ? e.curva + ': ' : '') + e.problema).join(' '));
    b.params = r.bloque.params; b.xmin = r.bloque.xmin; b.xmax = r.bloque.xmax;
    r.avisos.concat(avisos).forEach(avisa);
    const out = valida(d);
    out.resultado = { id: b.id, diapositiva: f.i + 1, cambiado: antes !== JSON.stringify(b.params) || a.xmin != null || a.xmax != null,
      parametros: b.params.map(p => ({ nombre: p.name, valor: p.value, min: p.min, max: p.max })), curvas: r.curvas };
    return out;
  });

  /* En revisar_presentacion: lo mismo que se comprueba al crear, para las
     gráficas que se editaron a mano o vienen de antes. */
  ERLEN_MCP.registraRevision('grafica-dinamica', deck => {
    const out = [];
    deck.slides.forEach((sl, i) => zonas(sl).flat().forEach(b => {
      if (!b || b.type !== 'func') return;
      const r = analiza(b);
      r.errores.forEach(e => out.push({ categoria: 'gráfica dinámica', diapositiva: i + 1, bloque: b.id,
        problema: (e.curva ? '«' + e.curva + '»: ' : '') + e.problema + (e.marca ? ' → ' + e.marca : ''), arreglo: 'Corrígelo con editar_bloque o ajustar_grafica_dinamica; validar_grafica_dinamica lo comprueba antes.' }));
      r.avisos.forEach(t => out.push({ categoria: 'gráfica dinámica', diapositiva: i + 1, bloque: b.id, problema: t, gravedad: 'aviso' }));
    }));
    return out;
  });
})();
