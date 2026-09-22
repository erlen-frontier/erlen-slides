/* ==== 18-pie-edit.js ==== */
'use strict';
/* ================= editores del pie y de las notas ================= */

/* Diapositiva representativa para la vista previa: la actual si lleva pie,
   si no la primera de contenido. */
function slidePrevia() {
  const p = pieDe(S.deck.meta);
  const lleva = i => {
    const l = S.deck.slides[i].layout;
    if (l === 'title') return !!p.enPortada;
    if (l === 'section') return !!p.enSecciones;
    return true;
  };
  if (lleva(S.cur)) return S.cur;
  const i = S.deck.slides.findIndex((sl, k) => lleva(k));
  return i < 0 ? S.cur : i;
}
/* Tira con la parte baja de esa diapositiva, para ver el pie en vivo. */
function vistaPie(caja, rotulo) {
  caja.innerHTML = '';
  const idx = slidePrevia();
  const ancho = Math.max(260, (caja.clientWidth || 520) - 4);
  const [W, H] = slideDims(S.deck);
  const k = ancho / W;
  const alto = Math.round(H * k);
  const visible = Math.min(alto, Math.max(76, Math.round(alto * 0.30)));
  const clip = h('div', { class: 'pie-clip', style: `width:${ancho}px;height:${visible}px` });
  const sl = renderSlide(S.deck, idx, 'thumb', 99);
  sl.style.transform = `scale(${k})`;
  sl.style.transformOrigin = 'top left';
  sl.style.marginTop = -(alto - visible) + 'px';
  clip.append(sl);
  caja.append(clip);
  if (rotulo) rotulo.textContent = 'Vista previa · diapositiva ' + (idx + 1);
}

function openPieEditor() {
  const m = S.deck.meta;
  const p = pieEdit(m);
  const prev = h('div', { class: 'pie-prev' });
  const ctr = h('div', { class: 'pie-ctr' });
  const rot = h('span', { class: 'sublabel', style: 'margin:0 0 6px' }, 'Vista previa');
  const refresca = () => { renderCanvas(); renderFilmstrip(); vistaPie(prev, rot); };
  const guarda = () => { m.pie = p; saveInd(); refresca(); };
  const repinta = () => { pinta(); guarda(); };

  const segDe = (val, opts, fn, cls) => {
    const s = h('div', { class: 'seg ' + (cls || '') });
    opts.forEach(([v, n, tit]) => s.append(h('button', { class: val === v ? 'on' : '', title: tit || '', onclick: () => fn(v) }, n)));
    return s;
  };
  const fila = (lab, ctrl) => h('div', null, h('div', { class: 'irow' }, h('label', null, lab)), ctrl);

  function selectorInsert(c, i) {
    const sel = h('select', { class: 'field', onchange: e => { c.t = e.target.value; repinta(); } });
    PIE_INSERTS.filter(x => x.id !== 'texto' || true).forEach(x =>
      sel.append(h('option', { value: x.id, selected: c.t === x.id }, x.n)));
    const caja = h('div', { class: 'pie-celda' },
      h('span', { class: 'sublabel', style: 'margin:0 0 4px' }, 'Celda ' + (i + 1)), sel);
    if (c.t === 'texto') {
      caja.append(h('input', { class: 'field', style: 'margin-top:5px', value: c.x || '', placeholder: 'Texto; admite {autor} {titulo} {n} {N}…',
        oninput: e => { c.x = e.target.value; guarda(); } }));
    }
    return caja;
  }

  const CHIPS = [['{autor}', 'Autores'], ['{tituloCorto}', 'Título corto'], ['{institucion}', 'Institución'],
    ['{fecha}', 'Fecha'], ['{seccion}', 'Sección'], ['{n}', 'Número'], ['{N}', 'Total'], ['{leyenda}', 'Leyenda']];

  function pinta() {
    ctr.innerHTML = '';
    ctr.append(fila('Plantilla del pie', segDe(p.modo, PIE_MODOS.map(x => [x.id, x.n, x.d]),
      v => { p.modo = v; if (v === 'linea' && !p.texto) p.texto = m.pieTexto || '{autor} · {tituloCorto} · {n}/{N}'; repinta(); }, 'seg-4 seg-wrap')));
    ctr.append(h('p', { class: 'hint', style: 'margin:-2px 0 12px' }, (PIE_MODOS.find(x => x.id === p.modo) || {}).d || ''));

    if (p.modo === 'tema') {
      ctr.append(h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: m.footline !== false,
        onchange: e => { m.footline = e.target.checked; guarda(); } }), 'Barra de pie del tema'));
      ctr.append(h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: m.numbers !== false,
        onchange: e => { m.numbers = e.target.checked; guarda(); } }), 'Número de diapositiva'));
      ctr.append(h('p', { class: 'hint' }, 'Cada tema Beamer trae su propio pie: Madrid y Cambridge lo ponen en tres franjas de color, Metropolis solo numera y Sobrio usa una línea discreta. Elige otra plantilla arriba para armarlo tú.'));
    } else if (p.modo === 'numero') {
      ctr.append(fila('Formato', segDe(p.numFormato, [['n', '3'], ['nN', '3 / 24']], v => { p.numFormato = v; repinta(); })));
    } else if (p.modo === 'linea') {
      ctr.append(h('div', { class: 'irow' }, h('label', null, 'Texto de la línea')));
      const inp = h('input', { class: 'field', value: p.texto || '', placeholder: '{autor} · {tituloCorto} · {n}/{N}',
        oninput: e => { p.texto = e.target.value; guarda(); } });
      ctr.append(inp);
      const chips = h('div', { class: 'chips', style: 'margin:8px 0 4px' });
      CHIPS.forEach(([tk, n]) => chips.append(h('button', { class: 'chip', title: 'Insertar ' + tk,
        onclick: () => { insertAtCursor(inp, tk); p.texto = inp.value; guarda(); } }, n)));
      ctr.append(chips);
      ctr.append(h('p', { class: 'hint' }, 'Las piezas entre llaves se sustituyen en cada diapositiva, igual que \\insertshortauthor o \\insertframenumber en Beamer.'));
    } else if (p.modo === 'celdas') {
      ctr.append(fila('Número de celdas', segDe(p.ncel, [[2, 'Dos'], [3, 'Tres']], v => {
        p.ncel = v;
        p.celdas = deepCopy(PIE_DEF_CELDAS[v]);
        repinta();
      })));
      const rej = h('div', { class: 'pie-celdas' });
      p.celdas.slice(0, p.ncel).forEach((c, i) => rej.append(selectorInsert(c, i)));
      ctr.append(rej);
      ctr.append(h('p', { class: 'hint' }, 'Dos celdas equivalen al pie «split» de Beamer y tres al de «infolines». Cada celda es un \\insert… del original.'));
    }

    if (p.modo !== 'tema' && p.modo !== 'ninguno') {
      ctr.append(h('div', { class: 'm-sep2' }));
      if (p.modo !== 'numero') {
        ctr.append(fila('Tamaño de letra', segDe(p.tam, PIE_TAM, v => { p.tam = v; repinta(); }, 'seg-4')));
        ctr.append(fila('Fondo', segDe(p.fondo, PIE_FONDOS, v => { p.fondo = v; repinta(); }, 'seg-4')));
        ctr.append(fila('Línea superior', segDe(p.regla, PIE_REGLAS, v => { p.regla = v; repinta(); })));
      }
      if (p.modo === 'celdas') ctr.append(fila('Alineación', segDe(p.alineado,
        [['extremos', 'A los extremos'], ['centrado', 'Todo centrado']], v => { p.alineado = v; repinta(); })));
      ctr.append(h('div', { class: 'm-sep2' }));
    }
    ctr.append(h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!p.enPortada,
      onchange: e => { p.enPortada = e.target.checked; guarda(); } }), 'Mostrarlo también en la portada'));
    ctr.append(h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!p.enSecciones,
      onchange: e => { p.enSecciones = e.target.checked; guarda(); } }), 'Mostrarlo en las diapositivas de sección'));
    ctr.append(h('p', { class: 'hint' }, 'En Beamer esas dos diapositivas se declaran [plain], que quita el pie. Al activarlas, Erlen las exporta sin [plain] para que la barra aparezca.'));
  }

  pinta();
  const cuerpo = h('div', { class: 'pie-grid' }, ctr, h('div', null, rot, prev));
  openModal({
    title: 'Pie de página', size: 'modal-lg', body: cuerpo,
    onclose: () => commit(),
    foot: [h('span', { class: 'foot-note' }, 'Se aplica a toda la presentación y viaja al código Beamer.'),
      h('button', { class: 'btn btn-pri', onclick: () => { closeModal(); commit(); } }, 'Listo')]
  });
  setTimeout(() => vistaPie(prev, rot), 30);
}

/* ---------- notas del orador ---------- */
function openNotasEditor(idx, modo) {
  let i = clamp(idx == null ? S.cur : idx, 0, S.deck.slides.length - 1);
  let vista = modo === 'todas' ? 'todas' : 'una';
  const m = S.deck.meta;
  const cfg = notasDe(m);
  const cuerpo = h('div');
  const selector = () => {
    const seg = h('div', { class: 'seg', style: 'margin-bottom:12px;max-width:340px' });
    [['una', 'Una a una'], ['todas', 'Todas de corrido']].forEach(([v, n]) =>
      seg.append(h('button', { class: vista === v ? 'on' : '', onclick: () => { vista = v; dibuja(); } }, n)));
    return seg;
  };
  const dibuja = () => {
    if (vista === 'todas') { cuerpo.innerHTML = ''; cuerpo.append(selector()); notasDeCorrido(cuerpo, n => { i = n; vista = 'una'; dibuja(); }); return; }
    const sl = S.deck.slides[i];
    cuerpo.innerHTML = '';
    cuerpo.append(selector());
    const cab = h('div', { class: 'nt-cab' },
      h('button', { class: 'btn btn-sm', disabled: i === 0, onclick: () => { i--; dibuja(); } }, '←'),
      h('span', { class: 'nt-tit' }, `Diapositiva ${i + 1} de ${S.deck.slides.length} · ${(sl.title || '').trim() || (LAY[sl.layout] || {}).name || ''}`),
      h('button', { class: 'btn btn-sm', disabled: i >= S.deck.slides.length - 1, onclick: () => { i++; dibuja(); } }, '→'));
    const prev = h('div', { class: 'nt-prev' });
    const ta = h('textarea', { class: 'field nt-area', rows: 9,
      placeholder: 'Lo que vas a decir. Una línea que empiece con «- » se vuelve viñeta.' }, sl.notes || '');
    const pinta = () => {
      prev.innerHTML = '';
      partesNota(ta.value).forEach(pt => {
        if (pt.tipo === 'lista') {
          const ul = h('ul');
          pt.items.forEach(t => ul.append(h('li', { html: inlineRich(t) })));
          prev.append(ul);
        } else prev.append(h('p', { html: inlineRich(pt.texto) }));
      });
      if (!prev.firstChild) prev.append(h('p', { class: 'vacio' }, 'Sin notas para esta diapositiva.'));
    };
    ta.addEventListener('input', () => { sl.notes = ta.value; pinta(); saveInd(); });
    pinta();

    const min = h('input', { class: 'field', type: 'number', min: '0', max: '60', step: '0.5', style: 'width:88px',
      value: sl.min || '', placeholder: '—',
      onchange: e => { const v = +e.target.value; if (v > 0) sl.min = v; else delete sl.min; totales(); saveInd(); renderFilmstrip(); } });
    const tot = h('span', { class: 'hint', style: 'margin:0' });
    const totales = () => {
      const t = minutosTotales(S.deck);
      tot.textContent = t ? `Total previsto: ${mmss(t)} min en ${S.deck.slides.filter(x => minutosDe(x)).length} diapositivas cronometradas.`
        : 'Sin tiempos aún. El total aparecerá aquí y en la vista de presentador.';
    };
    totales();

    cuerpo.append(cab,
      h('div', { class: 'nt-grid' },
        h('div', null, h('span', { class: 'sublabel', style: 'margin:0 0 5px' }, 'Notas'), ta,
          h('div', { class: 'irow', style: 'margin-top:8px' }, h('label', null, 'Minutos previstos'), min),
          tot),
        h('div', null, h('span', { class: 'sublabel', style: 'margin:0 0 5px' }, 'Cómo se verán'), prev)));

    const g = h('div', { class: 'igroup', style: 'margin-top:6px' },
      h('span', { class: 'panel-label' }, 'En el PDF de Beamer'));
    const seg = h('div', { class: 'seg seg-4 seg-wrap seg-2x2' });
    NOTA_MODOS.forEach(x => seg.append(h('button', { class: cfg.modo === x.id ? 'on' : '', title: x.d,
      onclick: () => { cfg.modo = x.id; m.notas = cfg; dibuja(); saveInd(); } }, x.n)));
    g.append(seg);
    g.append(h('p', { class: 'hint' }, (NOTA_MODOS.find(x => x.id === cfg.modo) || {}).d || ''));
    cuerpo.append(g);
  };
  dibuja();
  openModal({
    title: 'Notas del orador', size: 'modal-lg', body: cuerpo,
    onclose: () => commit(),
    foot: [h('button', { class: 'btn', onclick: () => { closeModal(); commit(); exportGuion(); } }, '¶ Guion imprimible'),
      h('button', { class: 'btn btn-pri', onclick: () => { closeModal(); commit(); } }, 'Listo')]
  });
}

/* ---------- guion del orador ---------- */
function guionHTML() {
  const [W, H] = slideDims(S.deck);
  const wb = $('#workbench'); wb.innerHTML = '';
  const k = 360 / W;
  const filas = S.deck.slides.map((sl, i) => {
    const clip = h('div', { class: 'gu-mini', style: `width:360px;height:${Math.round(H * k)}px` });
    const mini = renderSlide(S.deck, i, 'thumb', 99);
    mini.style.transform = `scale(${k})`; mini.style.transformOrigin = 'top left';
    clip.append(mini);
    const partes = partesNota(sl.notes);
    const notas = h('div', { class: 'gu-notas' });
    partes.forEach(pt => {
      if (pt.tipo === 'lista') { const ul = h('ul'); pt.items.forEach(t => ul.append(h('li', { html: inlineRich(t) }))); notas.append(ul); }
      else notas.append(h('p', { html: inlineRich(pt.texto) }));
    });
    if (!notas.firstChild) notas.append(h('p', { class: 'gu-vacio' }, '—'));
    const min = minutosDe(sl);
    const fila = h('div', { class: 'gu-fila' },
      h('div', { class: 'gu-izq' }, h('div', { class: 'gu-num' }, String(i + 1)), clip),
      h('div', { class: 'gu-der' },
        h('div', { class: 'gu-cab' }, h('b', null, (sl.title || '').trim() || (LAY[sl.layout] || {}).name || ''),
          min ? h('span', { class: 'gu-min' }, mmss(min) + ' min · acumulado ' + mmss(minutosHasta(S.deck, i))) : null),
        notas));
    wb.append(fila);
    return fila.outerHTML;
  });
  const css = collectCSS();
  wb.innerHTML = '';
  const tot = minutosTotales(S.deck);
  return '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Guion · ' +
    esc(S.deck.meta.title || 'Presentación') + '</title><style>' + css + '</style>' +
    '<style>@page{size:letter portrait;margin:14mm}' +
    'html,body{margin:0;background:#fff;color:#15181C;font:14px/1.55 system-ui,-apple-system,sans-serif}' +
    '.gu-head{padding:0 0 12px;border-bottom:2px solid #15181C;margin-bottom:16px}' +
    '.gu-head h1{margin:0 0 3px;font-size:20px}.gu-head p{margin:0;color:#5A6470;font-size:13px}' +
    '.gu-fila{display:flex;gap:16px;padding:12px 0;border-bottom:1px solid #DDE2E8;break-inside:avoid;page-break-inside:avoid}' +
    '.gu-izq{flex:none;display:flex;gap:8px}' +
    '.gu-num{font:700 15px/1 ui-monospace,monospace;color:#8A94A0;width:22px;text-align:right;padding-top:3px}' +
    '.gu-mini{overflow:hidden;border:1px solid #C9D0D8;border-radius:4px;position:relative;background:#fff}' +
    '.gu-der{flex:1;min-width:0}' +
    '.gu-cab{display:flex;justify-content:space-between;gap:12px;align-items:baseline;margin-bottom:5px}' +
    '.gu-cab b{font-size:15px}.gu-min{font:12px ui-monospace,monospace;color:#5A6470;white-space:nowrap}' +
    '.gu-notas p{margin:0 0 .5em}.gu-notas ul{margin:.2em 0 .5em;padding-left:20px}.gu-notas li{margin:0 0 .25em}' +
    '.gu-vacio{color:#A8B0BA}' +
    '.tip{font:13px system-ui;background:#161A26;color:#fff;padding:9px 15px;text-align:center;margin:-14mm -14mm 14px}' +
    '@media print{.tip{display:none}}</style></head><body>' +
    '<div class="tip">Imprime este archivo (Ctrl+P / Cmd+P) y elige «Guardar como PDF».</div>' +
    '<div class="gu-head"><h1>' + esc(S.deck.meta.title || 'Presentación') + '</h1><p>Guion del orador · ' +
    S.deck.slides.length + ' diapositivas' + (tot ? ' · ' + mmss(tot) + ' min previstos' : '') + '</p></div>' +
    filas.join('') + '</body></html>';
}
function exportGuion() {
  downloadFile(deckSlug() + '-guion.html', guionHTML(), 'text/html;charset=utf-8');
  toast('Guion listo: ábrelo e imprímelo como PDF');
}


