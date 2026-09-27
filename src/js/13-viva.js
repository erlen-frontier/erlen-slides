/* ==== 13-viva.js ==== */
'use strict';
/* ================= editores de contenido vivo ================= */

const CHART_KINDS = [
  { id: 'linea',  name: 'Espectro' },
  { id: 'dispersion', name: 'Dispersión' },
  { id: 'ajuste', name: 'Ajuste lineal' },
  { id: 'barras', name: 'Barras' }
];
function kindIcon(id) {
  const s = sv('svg', { width: 46, height: 28, viewBox: '0 0 46 28' });
  const c = 'currentColor';
  const L = (d, o) => sv('path', { d, fill: 'none', stroke: c, 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: o || 1 });
  const D = (x, y) => sv('circle', { cx: x, cy: y, r: 2.6, fill: c });
  s.append(sv('path', { d: 'M4,24 h38 M4,24 V3', stroke: c, 'stroke-width': 1.4, fill: 'none', opacity: .45 }));
  if (id === 'linea') s.append(L('M7,20 C13,6 15,22 20,10 C25,2 28,20 33,13 C37,8 39,17 42,14'));
  else if (id === 'dispersion') [[10, 19], [17, 14], [23, 16], [29, 9], [36, 7]].forEach(p => s.append(D(p[0], p[1])));
  else if (id === 'ajuste') { s.append(L('M8,21 L41,6', .8)); [[11, 20], [18, 16], [24, 14], [31, 10], [38, 7]].forEach(p => s.append(D(p[0], p[1]))); }
  else { [[10, 12], [18, 7], [26, 15], [34, 10]].forEach(p => s.append(sv('rect', { x: p[0], y: p[1], width: 6, height: 24 - p[1], rx: 2, fill: c }))); }
  return s;
}

/* ---------- gráfica de datos ---------- */
function openChartEditor(b) {
  const prev = h('div', { class: 'chart-prev' });
  const draw = deb(() => {
    prev.innerHTML = '';
    const clone = Object.assign({}, b, { w: 100 });
    prev.append(renderChart(clone, S.deck, 'thumb', 720));
    info.textContent = describeData(b);
  }, 130);
  const info = h('span', { class: 'foot-note' });

  const kinds = h('div', { class: 'kind-grid' });
  const paintKinds = () => {
    kinds.innerHTML = '';
    CHART_KINDS.forEach(k => kinds.append(h('button', {
      class: 'kind-opt' + (b.kind === k.id ? ' on' : ''),
      onclick: () => { b.kind = k.id; paintKinds(); paintOpts(); draw(); }
    }, kindIcon(k.id), h('span', { class: 'lb' }, k.name))));
  };

  const ta = h('textarea', { class: 'field field-mono paste-area', spellcheck: 'false',
    placeholder: 'Pega aquí tus columnas desde Excel u Origin.\n\nPrimera columna = eje X, las siguientes = series.\nLa primera fila puede llevar los nombres.' });
  ta.value = b.data || '';
  ta.addEventListener('input', () => { b.data = ta.value; draw(); });

  const opts = h('div');
  function paintOpts() {
    opts.innerHTML = '';
    const fld = (key, ph, wide) => h('input', { class: 'field', value: b[key] || '', placeholder: ph, style: 'margin-bottom:7px',
      oninput: e => { b[key] = e.target.value; draw(); } });
    opts.append(h('span', { class: 'panel-label', style: 'display:block;margin-bottom:6px' }, 'Ejes y título'),
      fld('xlabel', 'Nombre del eje X (admite $matemáticas$)'),
      fld('ylabel', 'Nombre del eje Y'),
      fld('title', 'Título dentro de la gráfica (opcional)'));
    const chk = (key, label, def) => h('label', { class: 'check' },
      h('input', { type: 'checkbox', checked: b[key] !== undefined ? !!b[key] : !!def, onchange: e => { b[key] = e.target.checked; paintOpts(); draw(); } }), label);
    opts.append(chk('grid', 'Rejilla de fondo', true));
    if (b.kind === 'linea') {
      /* Por omisión se marcan los puntos cuando son pocos: pocos datos son
         mediciones y hay que verlas; muchos son un registro continuo. */
      opts.append(chk('puntos', 'Marcar los puntos medidos', (parseTable(b.data || '').rows.length || 0) <= 30));
      opts.append(chk('offset', 'Apilar series con desplazamiento (espectros comparados)'));
      opts.append(chk('area', 'Rellenar bajo la curva'));
      if (b.offset) {
        const lab = h('label', null, `Separación · ${b.offsetPct == null ? 55 : b.offsetPct} %`);
        opts.append(h('div', { class: 'irow' }, lab),
          h('input', { type: 'range', min: 0, max: 150, step: 5, value: b.offsetPct == null ? 55 : b.offsetPct,
            oninput: e => { b.offsetPct = +e.target.value; lab.textContent = `Separación · ${b.offsetPct} %`; draw(); } }));
      }
      opts.append(chk('xrev', 'Invertir el eje X (útil en FTIR)'));
    }
    if (b.kind === 'ajuste') opts.append(chk('showFit', 'Mostrar la ecuación y el R²', true));
    /* Escala logarítmica. En barras no cabe —la barra sale del cero— y al
       apilar espectros tampoco, porque el desplazamiento se suma sobre el
       propio eje. El ajuste, si lo hay, pasa a hacerse sobre el logaritmo:
       es la linealización de siempre, y conviene decirlo aquí. */
    if (b.kind !== 'barras') {
      opts.append(h('span', { class: 'panel-label', style: 'display:block;margin:10px 0 4px' }, 'Escala'));
      opts.append(chk('logX', 'Eje X logarítmico'));
      if (!(b.kind === 'linea' && b.offset)) opts.append(chk('logY', 'Eje Y logarítmico'));
      if (b.logX || b.logY) {
        const ss = chartSeries(b);
        const esc = escalasChart(b, b.kind, b.kind === 'linea' && !!b.offset);
        let fuera = 0, total = 0;
        ss.forEach(s => s.pts.forEach(pt => { total++; if (!esc.vale(pt)) fuera++; }));
        opts.append(h('p', { class: 'hint' },
          (b.kind === 'ajuste' ? 'El ajuste se hace sobre el logaritmo, que es la recta que se ve. ' : '') +
          (fuera ? `${fuera} de ${total} puntos no son positivos y quedan fuera: en un eje logarítmico no tienen sitio.`
                 : 'Un cero o un negativo no tienen logaritmo: si los hubiera, quedarían fuera del dibujo.')));
      }
    }
    opts.append(chk('legend', 'Leyenda', true));
  }
  paintKinds(); paintOpts();

  const samples = h('div', { class: 'chips', style: 'margin-top:4px' },
    CHART_SAMPLES.map(sm => h('button', { class: 'chip', onclick: () => {
      Object.assign(b, { data: sm.data, kind: sm.kind, xlabel: sm.xlabel, ylabel: sm.ylabel,
        offset: !!sm.offset, logX: !!sm.logX, logY: !!sm.logY });
      ta.value = sm.data; paintKinds(); paintOpts(); draw();
    } }, sm.n)));

  openModal({
    title: 'Gráfica de datos', size: 'modal-lg',
    onclose: () => commit(),
    body: h('div', null,
      kinds,
      h('div', { class: 'data-grid' },
        h('div', null,
          h('span', { class: 'panel-label', style: 'display:block;margin-bottom:6px' }, 'Datos'),
          ta,
          h('p', { class: 'hint' }, 'Reconoce tabuladores, comas y punto y coma, y también la coma decimal del Excel en español. Para varias series, agrega más columnas. ' +
            'Una columna titulada «±», «error», «sd», «sem» o «desv» no se dibuja como serie: es la incertidumbre de la columna anterior y sale como barra de error.'),
          h('span', { class: 'panel-label', style: 'display:block;margin:10px 0 4px' }, 'O empieza con un ejemplo'),
          samples),
        h('div', null,
          h('span', { class: 'panel-label', style: 'display:block;margin-bottom:6px' }, 'Vista previa'),
          prev,
          h('div', { style: 'margin-top:12px' }, opts)))),
    foot: [
      info,
      h('button', { class: 'btn btn-pri', onclick: () => { closeModal(); commit(); } }, 'Listo')
    ]
  });
  draw();
}
function describeData(b) {
  const { rows } = parseTable(b.data);
  if (!rows.length) return 'Aún no hay datos numéricos que graficar.';
  /* Se cuenta lo que se va a dibujar, no las columnas: una columna de error no
     es una serie, y decirlo aquí es la señal de que se reconoció como tal. */
  const ss = chartSeries(b);
  const conErr = ss.filter(s => s.tieneError).length;
  return `${rows.length} puntos · ${ss.length} ${ss.length === 1 ? 'serie' : 'series'} (${ss.map(s => s.name).join(', ')})` +
    (conErr ? ` · ${conErr === ss.length && ss.length === 1 ? 'con barras de error' : conErr + ' con barras de error'}` : '');
}

/* ---------- gráfica dinámica (fórmulas + deslizadores) ---------- */
function openFuncEditor(b) {
  const prev = h('div', { class: 'chart-prev' });
  const errEl = h('div', { class: 'eq-err' });
  const draw = deb(() => {
    prev.innerHTML = '';
    const clone = Object.assign({}, b, { w: 100, sliders: false });
    prev.append(renderChart(clone, S.deck, 'thumb', 720));
    /* El error dice en qué curva y en qué carácter: «▸» marca dónde se
       atascó el analizador, que en una fórmula larga ahorra buscarlo. */
    const cs = b.curves || [];
    const i = cs.findIndex(c => { const r = exprTry(c.expr); return r && r.error; });
    errEl.innerHTML = '';
    $$('.c-expr', curvesBox).forEach((inp, j) => inp.toggleAttribute('aria-invalid', j === i));
    if (i >= 0) {
      const r = exprTry(cs[i].expr), ex = String(cs[i].expr);
      errEl.append('Revisa la fórmula' + (cs.length > 1 ? ' «' + (cs[i].name || i + 1) + '»' : '') + ': ' + r.error);
      if (r.pos != null) errEl.append(h('code', { class: 'eq-pos' }, ex.slice(0, r.pos), h('mark', null, '▸'), ex.slice(r.pos)));
    }
    checkParams();
  }, 130);

  const curvesBox = h('div');
  const paramsBox = h('div');
  const missBox = h('div');

  function paintCurves() {
    curvesBox.innerHTML = '';
    (b.curves || []).forEach((cv, i) => {
      curvesBox.append(h('div', { class: 'curve-row' },
        h('input', { class: 'field c-name', value: cv.name || '', placeholder: 'Nombre', oninput: e => { cv.name = e.target.value; draw(); } }),
        h('span', { style: 'color:var(--mut);font-family:var(--mono)' }, 'y ='),
        h('input', { class: 'field c-expr', value: cv.expr || '', placeholder: 'A*exp(-k*x)', spellcheck: 'false',
          oninput: e => { cv.expr = e.target.value; draw(); } }),
        h('button', { class: 'icon-btn', title: 'Quitar curva', onclick: () => { b.curves.splice(i, 1); paintCurves(); draw(); } }, '✕')));
    });
    curvesBox.append(h('button', { class: 'btn btn-sm', onclick: () => { (b.curves = b.curves || []).push({ name: 'Curva ' + (b.curves.length + 1), expr: '' }); paintCurves(); draw(); } }, '+ Otra curva'));
  }
  function paintParams() {
    paramsBox.innerHTML = '';
    (b.params || []).forEach((p, i) => {
      /* Al cambiar el recorrido, el paso se recalcula: un paso de 0.1 en un
         recorrido de 0 a 0.001 dejaba el deslizador clavado. */
      const num = (key, ph) => h('input', { class: 'field p-num', type: 'number', value: p[key], placeholder: ph, step: 'any',
        oninput: e => { p[key] = +e.target.value; if (key !== 'value') p.step = pasoConservado(p.step, p.min, p.max); draw(); } });
      const fuera = !(+p.value >= +p.min && +p.value <= +p.max);
      paramsBox.append(h('div', { class: 'param-row' + (fuera ? ' fuera' : ''), title: fuera ? 'El valor queda fuera del recorrido del deslizador' : (p.d || null) },
        h('input', { class: 'field p-name', value: p.name, placeholder: 'A', spellcheck: 'false',
          oninput: e => { p.name = e.target.value.trim(); draw(); } }),
        h('span', { style: 'color:var(--faint);font-size:12px' }, 'de'), num('min', 'mín'),
        h('span', { style: 'color:var(--faint);font-size:12px' }, 'a'), num('max', 'máx'),
        h('span', { style: 'color:var(--faint);font-size:12px' }, 'valor'), num('value', 'valor'),
        h('input', { class: 'field p-unit', value: p.unit || '', placeholder: 'unidad', spellcheck: 'false', title: 'Unidad (admite $…$)',
          oninput: e => { p.unit = e.target.value; if (!p.unit) delete p.unit; } }),
        h('label', { class: 'check p-log', title: 'Deslizador por décadas: para parámetros que abarcan órdenes de magnitud (solo con extremos positivos)' },
          h('input', { type: 'checkbox', checked: !!p.log, onchange: e => { if (e.target.checked) p.log = true; else delete p.log; } }), 'log'),
        h('button', { class: 'icon-btn', title: 'Quitar', onclick: () => { b.params.splice(i, 1); paintParams(); draw(); } }, '✕')));
    });
    paramsBox.append(h('button', { class: 'btn btn-sm', onclick: () => { (b.params = b.params || []).push({ name: 'a', value: 1, min: 0, max: 10, step: 0.1 }); paintParams(); draw(); } }, '+ Otro parámetro'));
  }
  /* avisa de símbolos usados en las fórmulas que aún no son parámetros */
  function checkParams() {
    const known = new Set((b.params || []).map(p => p.name));
    const miss = new Set();
    (b.curves || []).forEach(cv => {
      const r = exprTry(cv.expr);
      if (r && r.vars) r.vars.forEach(v => { if (v !== 'x' && !known.has(v)) miss.add(v); });
    });
    missBox.innerHTML = '';
    /* Un parámetro llamado R, e o pi nunca llega a la fórmula: el analizador
       lee antes la constante. Mejor decirlo que dejar un deslizador mudo. */
    const tapados = (b.params || []).map(p => p.name).filter(n => Object.prototype.hasOwnProperty.call(EXPR_CONST, n));
    if (tapados.length) missBox.append(h('div', { class: 'hint', style: 'color:var(--warn);margin-bottom:6px' },
      tapados.join(', ') + (tapados.length > 1 ? ' son constantes' : ' es una constante') + ' de la app: la fórmula no lee ese parámetro. Cámbiale el nombre.'));
    if (miss.size) {
      missBox.append(h('div', { class: 'hint', style: 'color:var(--warn);margin-bottom:6px' },
        'Sin definir: ' + Array.from(miss).join(', ') + '. '),
        h('button', { class: 'btn btn-sm', onclick: () => {
          miss.forEach(n => (b.params = b.params || []).push({ name: n, value: 1, min: 0, max: 10, step: 0.1 }));
          paintParams(); draw();
        } }, 'Agregarlos como parámetros'));
    }
  }

  const rangeRow = h('div', { class: 'irow' },
    h('label', null, 'Rango de x'),
    h('input', { class: 'field', style: 'flex:0 0 92px', type: 'number', value: b.xmin, step: 'any', oninput: e => { b.xmin = +e.target.value; draw(); } }),
    h('span', { style: 'color:var(--faint)' }, 'a'),
    h('input', { class: 'field', style: 'flex:0 0 92px', type: 'number', value: b.xmax, step: 'any', oninput: e => { b.xmax = +e.target.value; draw(); } }));

  const yRow = h('div');
  function paintY() {
    yRow.innerHTML = '';
    yRow.append(h('label', { class: 'check' },
      h('input', { type: 'checkbox', checked: b.yminAuto === false, onchange: e => {
        if (e.target.checked) {
          /* Se parte de lo que se ve: con polos, el rango de la parte normal
             de la curva y no el valor junto a la asíntota. */
          const ss = chartSeries(b);
          const ys = [];
          ss.forEach(q => q.pts.forEach(pt => { if (isFinite(pt[1])) ys.push(pt[1]); }));
          const lo = ss.rangoY ? ss.rangoY[0] : ys.length ? Math.min.apply(null, ys) : 0;
          const hi = ss.rangoY ? ss.rangoY[1] : ys.length ? Math.max.apply(null, ys) : 1;
          b.ymin0 = lo;
          b.ymax0 = hi > lo ? hi + (hi - lo) * 0.05 : hi + (Math.abs(hi) * 0.05 || 1);
          b.yminAuto = false;
        } else b.yminAuto = true;
        paintY(); draw();
      } }), 'Fijar el eje Y (para que el deslizador cambie la altura de la curva)'));
    if (b.yminAuto === false) {
      yRow.append(h('div', { class: 'irow' },
        h('label', null, 'Rango de y'),
        h('input', { class: 'field', style: 'flex:0 0 92px', type: 'number', value: b.ymin0, step: 'any', oninput: e => { b.ymin0 = +e.target.value; draw(); } }),
        h('span', { style: 'color:var(--faint)' }, 'a'),
        h('input', { class: 'field', style: 'flex:0 0 92px', type: 'number', value: b.ymax0, step: 'any', oninput: e => { b.ymax0 = +e.target.value; draw(); } })));
    }
  }
  paintY();

  /* Ejes logarítmicos: la misma casilla que en la gráfica de datos. Con el
     eje x en logaritmo también el muestreo se reparte por décadas. */
  const logRow = h('div', { class: 'irow', style: 'gap:14px' },
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!b.logX, onchange: e => { b.logX = e.target.checked; draw(); } }), 'Eje x logarítmico'),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!b.logY, onchange: e => { b.logY = e.target.checked; draw(); } }), 'Eje y logarítmico'));

  const models = h('div', { class: 'model-grid' },
    FUNC_MODELS.map(m => h('button', { class: 'model-card', title: m.nota ? mathToUnicode(m.nota) : null, onclick: () => {
      Object.assign(b, bloqueDesdeModelo(m), { yminAuto: true });
      paintCurves(); paintParams(); paintY(); rangeRow.children[1].value = b.xmin; rangeRow.children[3].value = b.xmax;
      axl.value = b.xlabel || ''; ayl.value = b.ylabel || '';
      draw();
    } }, h('b', null, m.n), h('span', null, m.d))));

  const axl = h('input', { class: 'field', value: b.xlabel || '', placeholder: 'Nombre del eje X', style: 'margin-bottom:7px', oninput: e => { b.xlabel = e.target.value; draw(); } });
  const ayl = h('input', { class: 'field', value: b.ylabel || '', placeholder: 'Nombre del eje Y', oninput: e => { b.ylabel = e.target.value; draw(); } });

  paintCurves(); paintParams();

  openModal({
    title: 'Gráfica dinámica', size: 'modal-lg',
    onclose: () => commit(),
    body: h('div', null,
      h('p', { class: 'hint', style: 'margin:0 0 10px' }, 'Escribe la fórmula con x como variable. Cualquier otra letra se vuelve un parámetro con deslizador: al presentar puedes moverlo y la curva cambia en vivo.'),
      h('span', { class: 'panel-label', style: 'display:block;margin-bottom:6px' }, 'Modelos listos'),
      models,
      h('div', { class: 'data-grid', style: 'margin-top:14px' },
        h('div', null,
          h('span', { class: 'panel-label', style: 'display:block;margin-bottom:6px' }, 'Fórmulas'),
          curvesBox, errEl, missBox,
          h('span', { class: 'panel-label', style: 'display:block;margin:12px 0 6px' }, 'Parámetros con deslizador'),
          paramsBox,
          h('div', { style: 'margin-top:12px' }, rangeRow),
          yRow,
          h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: b.sliders !== false, onchange: e => { b.sliders = e.target.checked; draw(); } }), 'Mostrar los deslizadores en la diapositiva'),
          h('p', { class: 'fnhelp' },
            'Funciones: ', h('code', null, 'exp ln log10 sqrt abs sin cos tan sinh tanh erf'),
            ', perfiles ', h('code', null, 'gauss(x,μ,σ)'), ' y ', h('code', null, 'lorentz(x,x₀,γ)'),
            ', condicional ', h('code', null, 'if(x>0, a, b)'), '. Constantes: ',
            h('code', null, 'pi e R NA h c kB F eV'), '. Puedes escribir ', h('code', null, '2x'), ' sin el signo de multiplicar.')),
        h('div', null,
          h('span', { class: 'panel-label', style: 'display:block;margin-bottom:6px' }, 'Vista previa'),
          prev,
          h('div', { style: 'margin-top:12px' },
            h('span', { class: 'panel-label', style: 'display:block;margin-bottom:6px' }, 'Ejes'),
            axl, ayl, logRow)))),
    foot: [
      h('span', { class: 'foot-note' }, 'Los deslizadores funcionan también durante la presentación.'),
      h('button', { class: 'btn btn-pri', onclick: () => { closeModal(); commit(); } }, 'Listo')
    ]
  });
  draw();
}

/* ---------- video / GIF ---------- */
const VID_MAX = 12 * 1024 * 1024;
let _vidTargetId = null;
function pickVideo(b) {
  _vidTargetId = b.id;
  let inp = $('#vidFileInput');
  if (!inp) {
    inp = h('input', { type: 'file', id: 'vidFileInput', accept: 'video/mp4,video/webm,video/quicktime,image/gif', style: 'display:none' });
    document.body.append(inp);
    inp.addEventListener('change', () => {
      const file = inp.files[0]; inp.value = '';
      if (!file) return;
      const f = findBlock(_vidTargetId); if (!f) return;
      if (file.size > VID_MAX) {
        toast('Ese archivo pesa ' + (file.size / 1048576).toFixed(1) + ' MB; recorta el clip o conviértelo a GIF (máx. 12 MB)', 'warn');
        return;
      }
      const rd = new FileReader();
      rd.onload = () => {
        f.block.src = rd.result;
        f.block.mime = file.type || (/\.gif$/i.test(file.name) ? 'image/gif' : 'video/mp4');
        if (f.block.mime === 'image/gif') { f.block.poster = ''; commit(); afterVideoSet(file); return; }
        grabPoster(rd.result, poster => { f.block.poster = poster || ''; commit(); afterVideoSet(file); });
      };
      rd.readAsDataURL(file);
    });
  }
  inp.click();
}
function afterVideoSet(file) {
  saveInd.now();
  if (!lsSet(LS_AUTO, { deck: S.deck, deckName: S.deckName, when: Date.now() })) {
    toast('El video no cabe en el guardado automático: exporta el proyecto .json para conservarlo', 'warn');
  }
}
/* primer fotograma como imagen fija, para el PDF y las miniaturas */
function grabPoster(src, cb) {
  const v = h('video', { src, muted: true, playsinline: true, preload: 'metadata' });
  v.muted = true;
  let done = false;
  const finish = p => { if (done) return; done = true; v.remove(); cb(p); };
  v.addEventListener('loadeddata', () => {
    try {
      v.currentTime = Math.min(0.1, (v.duration || 1) / 10);
    } catch (e) { finish(''); }
  });
  v.addEventListener('seeked', () => {
    try {
      const W = Math.min(1280, v.videoWidth || 640), H = Math.round(W * (v.videoHeight || 360) / (v.videoWidth || 640));
      const cv = h('canvas'); cv.width = W; cv.height = H;
      cv.getContext('2d').drawImage(v, 0, 0, W, H);
      finish(cv.toDataURL('image/jpeg', 0.82));
    } catch (e) { finish(''); }
  });
  v.addEventListener('error', () => finish(''));
  setTimeout(() => finish(''), 6000);
  $('#workbench').append(v);
}


/* Vista de datos: crea una tabla Beamer con los mismos números. */
function chartToTable(b) {
  const { headers, rows } = parseTable(b.data);
  if (!rows.length) { toast('No hay datos numéricos que pasar a la tabla'); return; }
  const f = findBlock(b.id); if (!f) return;
  const fmt = v => isFinite(v) ? String(Math.round(v * 1e6) / 1e6) : '';
  const t = newBlock('table');
  t.header = true;
  t.caption = b.title || b.ylabel || 'Datos de la gráfica';
  t.rows = [headers.slice()].concat(rows.slice(0, 14).map(r => r.map(fmt)));
  f.arr.splice(f.i + 1, 0, t);
  S.selBlock = t.id;
  commit();
  toast(rows.length > 14 ? 'Tabla creada con las primeras 14 filas' : 'Tabla creada');
}


