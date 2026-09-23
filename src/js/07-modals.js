/* ==== 07-modals.js ==== */
'use strict';
/* ================= modales: ecuaciones, química, propiedades, archivo ================= */
/* Reduce la fórmula de una tarjeta hasta que quepa en su ancho. */
function fitTile(btn) {
  requestAnimationFrame(() => {
    const k = btn.querySelector('.katex');
    if (!k) return;
    const avail = btn.clientWidth - 12;
    const w = k.scrollWidth || k.getBoundingClientRect().width;
    if (w > avail && avail > 0) {
      const s = Math.max(0.42, avail / w);
      k.style.transform = 'scale(' + s.toFixed(3) + ')';
      k.style.transformOrigin = 'center center';
      k.style.display = 'inline-block';
    }
  });
}

let _focoPrevio = null;
let _modalFondos = [];
let _modalCleanup = null;
const FOCABLES = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function openModal(opts) {
  closeModal();
  _focoPrevio = document.activeElement;
  _modalCleanup = opts.onclose || null;
  _modalFondos = [$('#app'), $('#inicioRoot .erlen-inicio')].filter(Boolean).map(el => [el, el.inert]);
  _modalFondos.forEach(([el]) => { el.inert = true; });
  const tid = 'mo-t-' + Math.random().toString(36).slice(2, 8);
  const box = h('div', { class: 'modal ' + (opts.size || ''), role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': tid, tabindex: '-1' },
    h('div', { class: 'mo-head' }, h('span', { class: 'mo-title', id: tid }, opts.title),
      h('button', { class: 'icon-btn', 'aria-label': 'Cerrar', onclick: () => { closeModal(); } }, '✕')),
    h('div', { class: 'mo-body' }, opts.body));
  if (opts.foot) box.append(h('div', { class: 'mo-foot' }, opts.foot));
  const mask = h('div', { class: 'mask', onmousedown: e => { if (e.target === mask && !opts.noMaskClose) { closeModal(); } } }, box);
  /* El tabulador se queda dentro del diálogo mientras esté abierto. */
  box.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeModal(); return; }
    if (e.key !== 'Tab') return;
    const f = $$(FOCABLES, box).filter(x => x.offsetParent !== null || x === document.activeElement);
    if (!f.length) return;
    const pri = f[0], ult = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === pri || document.activeElement === box)) { e.preventDefault(); ult.focus(); }
    else if (!e.shiftKey && document.activeElement === ult) { e.preventDefault(); pri.focus(); }
  });
  $('#modalRoot').append(mask);
  setTimeout(() => {
    if (!document.contains(box)) return;
    const f = $$(FOCABLES, box).filter(x => x.offsetParent !== null);
    const campo = f.find(x => x.matches('input, textarea, select'));
    (campo || f[0] || box).focus();
  }, 30);
  return box;
}
function closeModal() {
  $('#modalRoot').innerHTML = '';
  _modalFondos.forEach(([el, inert]) => { el.inert = inert; }); _modalFondos = [];
  const cleanup = _modalCleanup; _modalCleanup = null; if (cleanup) cleanup();
  if (_focoPrevio && document.contains(_focoPrevio)) { try { _focoPrevio.focus(); } catch (e) {} }
  _focoPrevio = null;
}

/* ---------- editor de ecuaciones ---------- */
function openEqEditor(block) {
  let cat = EQT[0].id, symCat = null;
  const prev = h('div', { class: 'eq-preview' });
  const errEl = h('div', { class: 'eq-err' });
  const ta = h('textarea', { class: 'field field-mono', rows: 3, placeholder: 'Aquí aparece el código LaTeX al usar la paleta. Escribirlo a mano es opcional.' });
  ta.value = block.tex || '';
  const upd = () => {
    const t = ta.value.trim();
    prev.innerHTML = '';
    if (!t) { prev.append(h('span', { style: 'color:var(--faint);font-size:13px' }, 'Elige una plantilla o símbolo para empezar')); errEl.textContent = ''; return; }
    try {
      katex.render(t, prev, { displayMode: true, strict: false, trust: false });
      prev.classList.remove('err'); errEl.textContent = '';
    } catch (e) {
      prev.classList.add('err');
      prev.innerHTML = '<span class="math-err">' + esc(t) + '</span>';
      errEl.textContent = 'Revisa la sintaxis: ' + String(e.message || e).replace('KaTeX parse error: ', '');
    }
  };
  ta.addEventListener('input', deb(upd, 160));

  const zone = h('div');
  const catChips = h('div', { class: 'chips' });
  const symChips = h('div', { class: 'chips' });
  function paintChips() {
    catChips.innerHTML = ''; symChips.innerHTML = '';
    EQT.forEach(c => catChips.append(h('button', { class: 'chip' + (cat === c.id && !symCat ? ' on' : ''), onclick: () => { cat = c.id; symCat = null; paint(); } }, c.name)));
    SYMS.forEach((c, i) => symChips.append(h('button', { class: 'chip' + (symCat === i ? ' on' : ''), onclick: () => { symCat = i; paint(); } }, c.name)));
  }
  function paint() {
    paintChips();
    zone.innerHTML = '';
    if (symCat != null) {
      const g = h('div', { class: 'sym-grid' });
      SYMS[symCat].items.forEach(s => {
        const b = h('button', { class: 'sym', title: s.t, onclick: () => { insertAtCursor(ta, (ta.value && !ta.value.endsWith(' ') ? ' ' : '') + s.t, undefined); upd(); } });
        b.innerHTML = kStr(s.d, false);
        g.append(b);
      });
      zone.append(g);
    } else {
      const c = EQT.find(x => x.id === cat);
      const g = h('div', { class: 'tpl-grid' });
      c.items.forEach(t => {
        const b = h('button', { class: 'tpl', title: 'Insertar: ' + t.n, onclick: () => { ta.value = ta.value.trim() ? ta.value + ' \\quad ' + t.t : t.t; upd(); } });
        b.innerHTML = kStr(t.t, false) + '<span class="tname">' + esc(t.n) + '</span>';
        g.append(b); fitTile(b);
      });
      zone.append(g);
    }
  }

  const sizeSeg = h('div', { class: 'seg', style: 'width:auto' });
  [['n', 'Normal'], ['l', 'Grande']].forEach(([v, n]) => sizeSeg.append(h('button', { class: (block.size || 'n') === v ? 'on' : '', onclick: e => { block.size = v; $$('button', sizeSeg).forEach(x => x.classList.remove('on')); e.target.classList.add('on'); } }, n)));

  openModal({
    title: 'Ecuación', size: 'modal-lg',
    body: h('div', null,
      prev, errEl,
      h('div', { class: 'panel-label', style: 'display:block;margin-bottom:6px' }, 'Plantillas por clic'),
      catChips,
      h('div', { class: 'panel-label', style: 'display:block;margin:8px 0 6px' }, 'Símbolos (se insertan donde esté el cursor)'),
      symChips,
      zone,
      h('div', { class: 'eq-src-label' },
        h('span', { class: 'panel-label' }, 'Código LaTeX (opcional)'),
        sizeSeg),
      ta),
    foot: [
      h('span', { class: 'foot-note' }, 'Consejo: dentro de un texto también puedes escribir $\\alpha$ entre signos de pesos para matemática en línea.'),
      h('button', { class: 'btn', onclick: () => { ta.value = ''; upd(); } }, 'Limpiar'),
      h('button', { class: 'btn btn-pri', onclick: () => { block.tex = ta.value.trim(); closeModal(); commit(); } }, 'Guardar ecuación')
    ]
  });
  paint(); upd();
  if (!window.matchMedia('(max-width:920px)').matches) setTimeout(() => ta.focus(), 50);
}

/* ---------- editor de reacciones ----------
   El campo de texto sigue mandando: quien solo quiera escribir H2O escribe H2O
   y ya está. Lo que se ha añadido alrededor es lo que 81-quimica.js sabe de la
   fórmula —masa, composición, ajuste, tabla periódica—, y todo ello por debajo
   de la vista previa, nunca por delante. Si el módulo no estuviera cargado, el
   diálogo sigue siendo el de siempre. */
function openChemEditor(block) {
  const hayQuim = typeof quimPanelAnalisis === 'function';
  const secc = typeof quimSeccion === 'function' ? quimSeccion
    : (t, a, ...k) => h('section', { class: 'qz-sec' },
        h('div', { class: 'qz-sec-cab' }, h('span', { class: 'panel-label' }, t)), k);

  const prev = h('div', { class: 'eq-preview' });
  const errEl = h('div', { class: 'eq-err' });
  const ta = h('textarea', { class: 'field field-mono', rows: 3, placeholder: 'Ej.: 2 H2 + O2 -> 2 H2O   (los subíndices se acomodan solos)' });
  ta.value = block.tex || '';

  function upd() {
    const t = ta.value.trim();
    prev.innerHTML = '';
    if (!t) {
      prev.append(h('span', { class: 'qz-vacio' }, 'Escribe la reacción tal cual —H2SO4, Fe^3+, ->— o toma una plantilla de abajo'));
      errEl.textContent = '';
    } else {
      try {
        katex.render('\\ce{' + t + '}', prev, { displayMode: true, strict: false, trust: false });
        prev.classList.remove('err'); errEl.textContent = '';
      } catch (e) {
        prev.classList.add('err');
        prev.innerHTML = '<span class="math-err">' + esc(t) + '</span>';
        errEl.textContent = 'Revisa la sintaxis: ' + String(e.message || e).replace('KaTeX parse error: ', '');
      }
    }
    if (panel) panel.refresca(ta.value);
  }
  ta.addEventListener('input', deb(upd, 160));
  const pon = t => { ta.value = t; upd(); ta.focus(); };
  /* Al insertar, el campo recupera el foco y el diálogo saltaría hacia arriba.
     Devolver el desplazamiento donde estaba deja la tabla periódica a la vista
     para el siguiente clic, que es como se formula: elemento tras elemento. */
  const mete = (t, off) => {
    const cont = ta.closest('.mo-body');
    const y = cont ? cont.scrollTop : 0;
    insertAtCursor(ta, t, off); upd();
    if (cont) cont.scrollTop = y;
  };
  const panel = hayQuim ? quimPanelAnalisis(pon) : null;

  /* Atajos en grupos: buscar una flecha entre trece fichas sueltas costaba más
     que escribirla a mano. */
  const grupos = typeof QUIM_ATAJOS !== 'undefined' ? QUIM_ATAJOS : [{ n: '', k: CHEM_KEYS }];
  const atajos = h('div', { class: 'qz-atajos' }, grupos.map(g => h('div', { class: 'qz-atajo-g' },
    g.n ? h('span', { class: 'qz-atajo-n' }, g.n) : null,
    h('div', { class: 'chips' }, g.k.map(k => h('button', { class: 'chip', type: 'button', onclick: () => mete(k.t, k.off) }, k.l))))));

  /* Plantillas por familia. */
  const fams = typeof QUIM_PLANTILLAS !== 'undefined' ? QUIM_PLANTILLAS : [{ id: 'x', n: 'Reacciones', items: CHEMT }];
  let fam = fams[0].id;
  const famChips = h('div', { class: 'chips' });
  const rejilla = h('div', { class: 'tpl-grid' });
  function pintaFams() {
    famChips.innerHTML = ''; rejilla.innerHTML = '';
    fams.forEach(f => famChips.append(h('button', { class: 'chip' + (fam === f.id ? ' on' : ''), type: 'button',
      onclick: () => { fam = f.id; pintaFams(); } }, f.n)));
    (fams.find(f => f.id === fam) || fams[0]).items.forEach(t => {
      const b = h('button', { class: 'tpl', type: 'button', title: t.t, onclick: () => pon(t.t) });
      b.innerHTML = kStr('\\ce{' + t.t + '}', false) + '<span class="tname">' + esc(t.n) + '</span>';
      rejilla.append(b); fitTile(b);
    });
  }

  /* Tabla periódica: se arma la primera vez que se abre y ya se queda. */
  const tpCaja = h('div', { class: 'qz-tp-caja' });
  const tpBtn = h('button', { class: 'btn btn-sm qz-desp', type: 'button', 'aria-expanded': 'false' }, '⊞ Ver la tabla');
  tpBtn.addEventListener('click', () => {
    const abre = !tpCaja.firstChild || tpCaja.classList.contains('plegada');
    if (!tpCaja.firstChild) tpCaja.append(quimTablaPeriodica(s => mete(s)));
    tpCaja.classList.toggle('plegada', !abre);
    tpBtn.setAttribute('aria-expanded', abre ? 'true' : 'false');
    tpBtn.textContent = abre ? '⊟ Ocultar la tabla' : '⊞ Ver la tabla';
  });

  const cuerpo = h('div', { class: 'qz-cuerpo' },
    h('div', { class: 'qz-mirador' }, prev, errEl),
    secc('Reacción', 'Notación mhchem: los subíndices y las flechas se componen solos.', ta),
    panel ? panel.el : null,
    h('div', { class: 'qz-herr' },
      secc('Atajos', 'Se insertan donde esté el cursor.', atajos),
      hayQuim ? secc('Buscar por nombre', 'Un diccionario de especies de laboratorio, en los dos sentidos.',
        quimBuscadorNombres(f => mete(f))) : null,
      secc('Plantillas', 'Sustituyen lo escrito por la reacción entera.', famChips, rejilla),
      hayQuim ? secc('Tabla periódica', 'Clic en un elemento para insertar su símbolo.', tpBtn, tpCaja) : null));

  openModal({
    title: 'Reacción química', size: 'modal-lg modal-quim',
    body: cuerpo,
    foot: [
      h('span', { class: 'foot-note' }, 'Escribe con naturalidad: H2O, CO2, Fe^3+, (aq), <=> para equilibrio, v para precipitado.'),
      h('button', { class: 'btn', onclick: () => { ta.value = ''; upd(); ta.focus(); } }, 'Limpiar'),
      h('button', { class: 'btn btn-pri', onclick: () => { block.tex = ta.value.trim(); closeModal(); commit(); } }, 'Guardar reacción')
    ]
  });
  pintaFams(); upd();
  if (!window.matchMedia('(max-width:920px)').matches) setTimeout(() => ta.focus(), 50);
}

/* ---------- propiedades de bloque ---------- */
/* El cuerpo de propiedades se arma una sola vez y sirve para los dos sitios:
   la ventana de siempre y la pestaña «Bloque» del panel derecho. */
function openBlockProps(b) {
  const body = cuerpoProps(b, {});
  openModal({
    title: 'Propiedades · ' + (BLOCK_DEFS.find(d => d.id === b.type) || { name: b.type }).name,
    size: 'modal-sm',
    body,
    onclose: () => commit({ skipInsp: true }),
    foot: [h('button', { class: 'btn btn-pri', onclick: () => { closeModal(); commit({ skipInsp: true }); } }, 'Listo')]
  });
}
function cuerpoProps(b, op) {
  op = op || {};
  const enPanel = !!op.panel;
  const cierra = () => { if (!enPanel) closeModal(); };
  const body = h('div');
  const row = (lab, ctrl) => body.append(h('div', { class: 'irow' }, h('label', null, lab), h('div', { style: 'flex:1.4' }, ctrl)));
  const segOf = (val, opts, fn) => {
    const s = h('div', { class: 'seg' });
    opts.forEach(([v, n]) => s.append(h('button', { class: val === v ? 'on' : '', onclick: e => { fn(v); $$('button', s).forEach(x => x.classList.remove('on')); e.target.classList.add('on'); } }, n)));
    return s;
  };
  if (b.type === 'text') {
    row('Tamaño', segOf(b.size || 'n', [['s', 'Pequeño'], ['n', 'Normal'], ['l', 'Grande']], v => b.size = v));
    row('Alineación', segOf(b.align || 'left', [['left', 'Izquierda'], ['center', 'Centrado']], v => b.align = v));
  } else if (b.type === 'bullets') {
    body.append(h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!b.step, onchange: e => b.step = e.target.checked }), 'Revelar punto por punto al presentar (\\pause)'));
    body.append(h('p', { class: 'hint' }, 'Dentro de la diapositiva: Enter agrega un punto nuevo, Tab lo anida, Mayús+Tab lo regresa, Retroceso en un punto vacío lo elimina.'));
  } else if (b.type === 'math') {
    row('Tamaño', segOf(b.size || 'n', [['n', 'Normal'], ['l', 'Grande']], v => b.size = v));
    body.append(h('p', { class: 'hint' }, 'Para editar el contenido usa el botón ƒ de la barra del bloque.'));
  } else if (b.type === 'image') {
    const lab = h('label', null, `Anchura · ${b.w || 70} %`);
    body.append(h('div', { class: 'irow' }, lab), h('input', { type: 'range', min: 20, max: 100, step: 5, value: b.w || 70,
      oninput: e => { b.w = +e.target.value; lab.textContent = `Anchura · ${b.w} %`; } }));
    if (b.src && typeof panelEstiloImagen === 'function') {
      const est = h('div', { class: 'ie-caja' });
      panelEstiloImagen(b, est);
      body.append(h('div', { class: 'panel-label', style: 'margin-top:10px' }, 'Estilo de la figura'), est);
    }
    row('Texto alterno', h('input', { class: 'field', value: b.alt || '', placeholder: 'Qué muestra la imagen, para quien no la ve',
      onchange: e => b.alt = e.target.value }));
    body.append(h('p', { class: 'hint' }, 'El texto alterno describe la imagen para lectores de pantalla y viaja al archivo imprimible y al PowerPoint. Es distinto del pie de figura, que sí se ve en la diapositiva.'));
    body.append(h('div', { style: 'display:flex;gap:7px;margin-top:6px' },
      h('button', { class: 'btn btn-sm', onclick: () => { cierra(); pickImage(b); } }, 'Cambiar imagen…'),
      b.src ? h('button', { class: 'btn btn-sm', onclick: () => { cierra(); openRecorte(b); } }, '⛶ Encuadrar…') : null,
      b.src ? h('button', { class: 'btn btn-sm', onclick: () => { cierra(); openEscala(b); } }, '⊢ Barra de escala…') : null,
      b.src && typeof abreDisenador === 'function' ? h('button', { class: 'btn btn-sm btn-pri', onclick: () => { cierra(); abreDisenador(b); } }, '✨ Ideas de diseño') : null,
      b.src ? h('button', { class: 'btn btn-sm', title: 'Partir en paneles, tapar leyendas y señalar', onclick: () => { cierra(); openDespiece(b); } }, '⊞ Adaptar del artículo…') : null));
  } else if (b.type === 'table') {
    body.append(h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!b.header, onchange: e => b.header = e.target.checked }), 'Primera fila como encabezado'));
    row('Alineación', segOf(b.align || 'c', [['c', 'Centrada'], ['l', 'Izquierda']], v => b.align = v));
    body.append(h('p', { class: 'hint' }, 'Las filas y columnas se agregan desde el botón ▦ de la barra del bloque. Tab salta entre celdas. El estilo sigue las reglas booktabs de LaTeX: sin líneas verticales.'));
  } else if (b.type === 'bblock') {
    row('Tipo de caja', segOf(b.kind || 'block', [['block', 'Normal'], ['alert', 'Alerta'], ['example', 'Ejemplo']], v => b.kind = v));
    body.append(h('p', { class: 'hint' }, 'Equivale a los entornos block, alertblock y exampleblock de Beamer.'));
  } else if (b.type === 'spacer') {
    const lab = h('label', null, `Altura · ${b.hpx || 24} px`);
    body.append(h('div', { class: 'irow' }, lab), h('input', { type: 'range', min: 8, max: 160, step: 4, value: b.hpx || 24,
      oninput: e => { b.hpx = +e.target.value; lab.textContent = `Altura · ${b.hpx} px`; } }));
  } else if (b.type === 'code') {
    row('Lenguaje (solo referencia)', h('input', { class: 'field', value: b.lang || '', onchange: e => b.lang = e.target.value }));
  } else if (b.type === 'chart' || b.type === 'func') {
    const lab = h('label', null, `Anchura · ${b.w || 78} %`);
    body.append(h('div', { class: 'irow' }, lab), h('input', { type: 'range', min: 35, max: 100, step: 1, value: b.w || 78,
      oninput: e => { b.w = +e.target.value; lab.textContent = `Anchura · ${b.w} %`; } }));
    const labH = h('label', null, `Altura · ${Math.round(chartAR(b) * 100)} % del ancho`);
    body.append(h('div', { class: 'irow' }, labH), h('input', { type: 'range', min: 30, max: 110, step: 2, value: Math.round(chartAR(b) * 100),
      oninput: e => { b.ar = +e.target.value / 100; labH.textContent = `Altura · ${e.target.value} % del ancho`; } }));
    body.append(h('button', { class: 'btn btn-sm', style: 'margin-top:6px', onclick: () => { cierra(); (b.type === 'chart' ? openChartEditor : openFuncEditor)(b); } },
      b.type === 'chart' ? 'Editar datos y gráfica…' : 'Editar fórmulas y parámetros…'));
    if (b.type === 'chart') body.append(h('button', { class: 'btn btn-sm', style: 'margin:6px 0 0 6px', onclick: () => { chartToTable(b); cierra(); } }, 'Crear tabla con estos datos'));
    if (b.type === 'chart') {
      body.append(h('button', { class: 'btn btn-sm', style: 'margin:6px 0 0 0', onclick: () => { cierra(); openAnalisis(b); } }, 'σ Analizar la serie…'));
      body.append(h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: b.conError !== false,
        onchange: e => b.conError = e.target.checked }), 'Mostrar la pendiente con su error'));
    }
  } else if (b.type === 'teorema') {
    body.append(h('p', { class: 'hint', style: 'margin-top:0' },
      'Tipo actual: ' + teoDe(b).n + '. En el código Beamer sale como \\begin{' + teoDe(b).env + '}, el entorno de AMS de verdad.'));
    body.append(h('button', { class: 'btn btn-sm', onclick: () => { cierra(); openTeorema(b); } }, '∴ Cambiar el tipo…'));
  } else if (b.type === 'geo') {
    const labG = h('label', null, `Anchura · ${b.w || 58} %`);
    body.append(h('div', { class: 'irow' }, labG), h('input', { type: 'range', min: 20, max: 100, step: 2, value: b.w || 58,
      oninput: e => { b.w = +e.target.value; labG.textContent = `Anchura · ${b.w} %`; } }));
    body.append(h('p', { class: 'hint' }, 'Figura actual: ' + ((GK[(b.geo || {}).kind] || {}).n || '—') + '. Los rótulos se editan en el constructor y salen a TikZ, no como imagen.'));
    body.append(h('button', { class: 'btn btn-sm', onclick: () => { cierra(); openGeometria(b); } }, '△ Elegir figura y rótulos…'));
  } else if (b.type === 'estruct' || b.type === 'montaje') {
    const esE = b.type === 'estruct';
    const lab = h('label', null, `Anchura · ${b.w || (esE ? 55 : 88)} %`);
    body.append(h('div', { class: 'irow' }, lab), h('input', { type: 'range', min: 20, max: 100, step: 2, value: b.w || (esE ? 55 : 88),
      oninput: e => { b.w = +e.target.value; lab.textContent = `Anchura · ${b.w} %`; } }));
    body.append(h('p', { class: 'hint' }, esE
      ? 'La estructura se dibuja con ángulos de 30° y longitud de enlace constante, como en un artículo. Los carbonos van implícitos y los hidrógenos se calculan por valencia.'
      : 'El montaje se dibuja con trazos, así que toma el color del tema y no se pixela. En el .tex sale como TikZ, no como imagen.'));
    body.append(h('button', { class: 'btn btn-sm', style: 'margin-top:6px', onclick: () => { cierra(); (esE ? openEstructura : openMontaje)(b); } },
      esE ? '⬡ Dibujar la estructura…' : '⚗ Editar el montaje…'));
  } else if (b.type === 'smart') {
    const lab = h('label', null, `Anchura · ${b.w || 84} %`);
    body.append(h('div', { class: 'irow' }, lab), h('input', { type: 'range', min: 40, max: 100, step: 2, value: b.w || 84,
      oninput: e => { b.w = +e.target.value; lab.textContent = `Anchura · ${b.w} %`; } }));
    const sk = SK[b.kind] || { n: b.kind || '—', d: '' };
    body.append(h('p', { class: 'hint' }, 'Tipo actual: ' + sk.n + '. ' + sk.d));
    body.append(h('button', { class: 'btn btn-sm', style: 'margin-top:6px', onclick: () => { cierra(); openSmartEditor(b); } }, 'Editar diagrama…'));
  } else if (b.type === 'video') {
    const lab = h('label', null, `Anchura · ${b.w || 70} %`);
    body.append(h('div', { class: 'irow' }, lab), h('input', { type: 'range', min: 25, max: 100, step: 5, value: b.w || 70,
      oninput: e => { b.w = +e.target.value; lab.textContent = `Anchura · ${b.w} %`; } }));
    if (b.mime !== 'image/gif') {
      body.append(h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: b.autoplay !== false, onchange: e => b.autoplay = e.target.checked }), 'Reproducir solo al llegar a la diapositiva'));
      body.append(h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: b.loop !== false, onchange: e => b.loop = e.target.checked }), 'Repetir en bucle'));
      body.append(h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: b.controls !== false, onchange: e => b.controls = e.target.checked }), 'Mostrar controles al presentar'));
      body.append(h('p', { class: 'hint' }, 'El video va sin sonido para que los navegadores lo dejen arrancar solo. En el PDF se imprime el primer fotograma.'));
    } else {
      body.append(h('p', { class: 'hint' }, 'Los GIF se animan solos en la presentación y se imprimen como imagen fija en el PDF.'));
    }
    body.append(h('button', { class: 'btn btn-sm', style: 'margin-top:6px', onclick: () => { cierra(); pickVideo(b); } }, 'Cambiar archivo…'));
  } else {
    body.append(h('p', { class: 'hint' }, 'Edita el contenido haciendo clic directamente sobre el texto en la diapositiva.'));
  }

  /* --- entrada animada, para cualquier bloque --- */
  body.append(h('div', { style: 'border-top:1px solid var(--line2);margin:14px 0 10px' }));
  body.append(h('span', { class: 'panel-label', style: 'display:block;margin-bottom:8px' }, 'Aparición al presentar'));
  if (b.type === 'bullets') {
    body.append(h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!b.step, onchange: e => { b.step = e.target.checked; } }), 'Revelar punto por punto'));
  } else {
    body.append(h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!b.step, onchange: e => { b.step = e.target.checked; } }), 'Aparecer en su propio paso'));
  }
  /* Los efectos se agrupan como en PowerPoint: discretos, con movimiento y de revelado. */
  const usables = ANIMS.filter(a => a.id !== 'draw' || b.type === 'chart' || b.type === 'func' || b.type === 'smart' || b.type === 'geo');
  const animSel = h('select', { class: 'field', onchange: e => { b.anim = e.target.value; pintaPista(); } });
  const grupos = [...new Set(usables.map(a => a.grp).filter(Boolean))];
  usables.filter(a => !a.grp).forEach(a => animSel.append(h('option', { value: a.id, selected: (b.anim || 'fade') === a.id }, a.name)));
  grupos.forEach(g => {
    const og = h('optgroup', { label: g });
    usables.filter(a => a.grp === g).forEach(a => og.append(h('option', { value: a.id, selected: (b.anim || 'fade') === a.id, title: a.d || '' }, a.name)));
    animSel.append(og);
  });
  body.append(h('div', { class: 'irow' }, h('label', null, 'Efecto'), h('div', { style: 'flex:1.4' }, animSel)));
  body.append(h('div', { class: 'irow' }, h('label', null, 'Velocidad'),
    h('div', { style: 'flex:1.4' }, segOf(b.animVel || 'normal', ANIM_VEL.map(v => [v.id, v.n]), v => b.animVel = v))));
  const ret = h('label', null, `Retardo · ${b.animRet || 0} ms`);
  body.append(h('div', { class: 'irow' }, ret), h('input', { type: 'range', min: 0, max: 1200, step: 50, value: b.animRet || 0,
    oninput: e => { b.animRet = +e.target.value; ret.textContent = `Retardo · ${b.animRet} ms`; } }));
  const pista = h('p', { class: 'hint' });
  const pintaPista = () => {
    const a = AK_ANIM[b.anim || 'fade'];
    pista.textContent = (a && a.d ? a.d + ' ' : '') +
      'Los pasos avanzan con la flecha derecha o la barra espaciadora. En el PDF el paso se conserva, pero el movimiento no: un PDF no anima.';
  };
  pintaPista();
  body.append(pista);
  return body;
}

/* ---------- archivo: mis presentaciones ---------- */
function decksStore() { return lsGet(LS_DECKS, {}); }
function openDecks() {
  const store = decksStore();
  const body = h('div');
  body.append(h('div', { style: 'display:flex;gap:7px;flex-wrap:wrap;margin-bottom:14px' },
    h('button', { class: 'btn btn-sm btn-pri', onclick: () => { saveDeckAs(); } }, 'Guardar actual como…'),
    h('button', { class: 'btn btn-sm', onclick: openRecuperacion }, 'Copias y recuperación'),
    h('button', { class: 'btn btn-sm', onclick: () => { newDeckFlow(false); } }, 'Nueva en blanco'),
    h('button', { class: 'btn btn-sm', onclick: () => { newDeckFlow(true); } }, 'Nueva desde el ejemplo'),
    h('button', { class: 'btn btn-sm', onclick: () => importJSON() }, 'Importar .json…')));
  const names = Object.keys(store).sort((a, b) => store[b].when - store[a].when);
  if (!names.length) {
    /* Estado vacío con las tres cosas que hacen falta: en qué punto estás,
       qué es esto y por dónde salir. */
    body.append(h('div', { class: 'vacio-caja' },
      h('span', { class: 'vc-ic' }, '▤'),
      h('b', null, 'Todavía no has guardado ninguna con nombre'),
      h('p', null, 'La presentación en la que trabajas se autoguarda sola en este navegador. Guardarla «con nombre» sirve para tener varias a la vez y saltar entre ellas — por ejemplo, la del coloquio y la de la defensa.'),
      h('div', { class: 'vc-vias' },
        h('button', { class: 'btn btn-sm btn-pri', onclick: () => saveDeckAs() }, 'Guardar esta con un nombre'),
        h('button', { class: 'btn btn-sm', onclick: () => { closeModal(); openPlantillas(); } }, 'Empezar una desde plantilla'),
        h('button', { class: 'btn btn-sm', onclick: () => importJSON() }, 'Traer un .json que ya tenías'))));
  }
  names.forEach(name => {
    const d = store[name];
    body.append(h('div', { class: 'deck-row' },
      h('div', { class: 'dname' }, h('b', null, name), h('span', { class: 'dmeta' }, `${d.deck.slides.length} diapositivas · ${fmtWhen(d.when)}`)),
      h('button', { class: 'btn btn-sm', onclick: () => { if (cargaSegura(d.deck, name)) closeModal(); } }, 'Abrir'),
      h('button', { class: 'btn btn-sm btn-danger', title: 'Eliminar', onclick: () => { if(!confirm('¿Eliminar «'+name+'» de la biblioteca? Sus versiones se conservan en Copias y recuperación; allí puedes eliminarlas también.'))return; const s = decksStore(); delete s[name]; if(lsSet(LS_DECKS, s)){if(S.deckName===name){S.deckName=null;S.respaldoId=null;saveInd.now();}openDecks();}else toast('No se pudo eliminar la presentación','warn'); } }, '✕')));
  });
  body.append(h('p', { class: 'hint', style: 'margin-top:10px' }, 'Estas copias viven en el almacenamiento de este navegador. Para respaldar o cambiar de dispositivo, usa Exportar → Proyecto (.json).'));

  openModal({ title: 'Mis presentaciones', body });
}
function saveDeckAs() {
  flushEdicion();
  const campo = h('input', { class: 'field', type: 'text', maxlength: '120', 'aria-label': 'Nombre de la presentación', autocomplete: 'off' });
  campo.value = S.deckName || S.deck.meta.title || 'Mi presentación';
  const mensaje = h('p', { class: 'hint', role: 'status', 'aria-live': 'polite' });
  let reemplazo = null;
  const guardar = h('button', { class: 'btn btn-pri', type: 'submit' }, 'Guardar');
  campo.addEventListener('input', () => { reemplazo = null; guardar.textContent = 'Guardar'; mensaje.textContent = ''; });
  const form = h('form', { onsubmit: e => {
    e.preventDefault();
    const name = campo.value.trim();
    if (!name) { mensaje.textContent = 'Escribe un nombre para encontrarla en tu biblioteca.'; campo.focus(); return; }
    const s = decksStore();
    if (Object.prototype.hasOwnProperty.call(s, name) && reemplazo !== name) {
      reemplazo = name; guardar.textContent = 'Reemplazar copia guardada';
      mensaje.textContent = 'Ya existe una presentación con ese nombre. Puedes cambiarlo o reemplazar la copia anterior.';
      return;
    }
    Object.defineProperty(s, name, {value: {deck: deepCopy(S.deck), when: Date.now()}, enumerable: true, writable: true, configurable: true});
    if (lsSet(LS_DECKS, s)) { S.deckName = name; saveInd.now(); toast(`Guardada como «${name}»`); openDecks(); }
    else mensaje.textContent = 'No se pudo guardar. Exporta el proyecto a un archivo para conservar una copia.';
  } }, h('label', null, 'Nombre de la presentación', campo),
    h('p', {class: 'hint'}, 'Se guarda en este navegador. Puedes exportar el proyecto para llevarlo a otro dispositivo.'), mensaje,
    h('div', {class: 'mo-foot'}, h('button', {class: 'btn', type: 'button', onclick: () => openDecks()}, 'Cancelar'), guardar));
  openModal({title: 'Guardar en mi biblioteca', body: form});
}
function newDeckFlow(demo) {
  if (!confirm('Se abrirá una presentación nueva. La actual queda en el autoguardado' + (S.deckName ? ` y en «${S.deckName}»` : '') + '. ¿Continuar?')) return;
  if (S.deckName) { const s = decksStore(); s[S.deckName] = { deck: S.deck, when: Date.now() }; lsSet(LS_DECKS, s); }
  loadDeck(demo ? demoDeck() : blankDeck(), null);
  closeModal();
}
function loadDeck(deck, name) {
  if (S.deck) { flushEdicion(); recActual(true); }
  S.respaldoId = null;
  S.archivo = null; S.archivoNombre = null;
  S.deck = deepCopy(deck); S.deckName = name || null;
  S.cur = 0; S.selBlock = null; S.undo = []; S.redo = []; S.zoom = null;
  snapNow(); saveInd(); renderAll();
}
function importJSON() {
  let inp = h('input', { type: 'file', accept: '.json,application/json', style: 'display:none' });
  document.body.append(inp);
  inp.addEventListener('change', () => {
    const f = inp.files[0]; if (!f) { inp.remove(); return; }
    const rd = new FileReader();
    rd.onload = () => {
      let bruto = null;
      try { bruto = JSON.parse(rd.result); }
      catch (e) { toast('Ese archivo no es un .json válido', 'warn'); inp.remove(); return; }
      /* Una copia de la suite descargada fuera del portal (erlen-copia-slides-<id8>.json):
         no es un proyecto, se abre con la vista previa del informe (88e-informe.js). */
      if (bruto && bruto.version === 2 && typeof bruto.payloadJSON === 'string') { recibeArchivoCopia(bruto); inp.remove(); return; }
      cargaSegura(bruto, null);
      inp.remove();
    };
    rd.onerror = () => { toast('No se pudo leer el archivo', 'warn'); inp.remove(); };
    rd.readAsText(f);
  });
  inp.click();
}


/* ---------- ayuda ---------- */
function openHelp(pestana) {
  const K = (k, d) => h('div', { class: 'help-row' }, h('span', null, d), h('kbd', null, k));
  const cuerpo = h('div');
  const tabs = h('div', { class: 'help-tabs' });
  let activa = ['uso', 'glosario', 'atajos', 'privacidad'].includes(pestana) ? pestana : 'uso';
  const caja = (titulo, ...hijos) => h('div', { style: 'background:var(--panel2);border:1px solid var(--line);border-radius:9px;padding:10px 12px;margin:0 0 12px' },
    h('span', { class: 'panel-label', style: 'display:block;margin-bottom:6px' }, titulo), ...hijos);

  function panelUso() {
    return h('div', null,
      h('p', { style: 'margin:0 0 12px;font-size:13.5px;color:var(--mut);line-height:1.55' },
        'Todo se edita haciendo clic sobre la diapositiva. Las ecuaciones y reacciones se arman con plantillas y símbolos — sin escribir LaTeX. Al terminar, exporta a PDF, a código Beamer (.tex) o guarda el proyecto (.json).'),
      caja('Si el texto queda apretado',
        h('p', { style: 'margin:0;font-size:13px;line-height:1.6;color:var(--mut)' },
          'En la pestaña ', h('b', { style: 'color:var(--ink)' }, 'Diapositiva'), ' hay trece formas de acomodar el contenido: texto fluido en columnas, enunciado grande, a todo lo ancho, barra lateral, comparación, tres columnas, pasos numerados y cuadrícula 2×2. Debajo están el tamaño del texto y los márgenes laterales, y el botón ',
          h('b', { style: 'color:var(--ink)' }, 'Ajustar texto al espacio'), ', que busca el mayor tamaño que todavía cabe.')),
      caja('Contenido vivo',
        h('p', { style: 'margin:0;font-size:13px;line-height:1.6;color:var(--mut)' },
          h('b', { style: 'color:var(--ink)' }, 'Gráfica de datos'), ': pega tus columnas de Excel u Origin y elige espectro, dispersión, ajuste lineal (con su ecuación y R²) o barras. ',
          h('b', { style: 'color:var(--ink)' }, 'Gráfica dinámica'), ': escribe una fórmula con x; cualquier otra letra se vuelve un deslizador que puedes mover mientras presentas. ',
          h('b', { style: 'color:var(--ink)' }, 'Video o GIF'), ': se reproduce al llegar a la diapositiva y en el PDF se imprime su primer fotograma. ',
          h('b', { style: 'color:var(--ink)' }, 'Diagrama SmartArt'), ': diez diagramas —proceso, ciclo, jerarquía, pirámide, embudo, radial, Venn, cronología, matriz y lista— que se arman solo escribiendo los textos.')),
      caja('Al presentar',
        h('p', { style: 'margin:0;font-size:13px;line-height:1.6;color:var(--mut)' },
          'La tecla ', h('b', { style: 'color:var(--ink)' }, 'P'), ' abre la ',
          h('b', { style: 'color:var(--ink)' }, 'vista de presentador'), ' en una segunda ventana: cronómetro, hora, la diapositiva que sigue y tus notas. Arrástrala a la pantalla de tu computadora y deja el proyector con la presentación. Si el navegador no deja abrir la ventana, el mismo panel aparece abajo, con aviso.')),
      caja('Mover bloques',
        h('p', { style: 'margin:0;font-size:13px;line-height:1.6;color:var(--mut)' },
          'Selecciona un bloque y arrástralo desde el asa ', h('b', { style: 'color:var(--ink)' }, '⠿'),
          ' de su barra: dentro de la diapositiva para reacomodarlo o cambiarlo de columna, o hasta una miniatura de la izquierda para mandarlo a otra diapositiva. El botón ',
          h('b', { style: 'color:var(--ink)' }, '⇥'), ' hace lo mismo eligiendo de una lista, útil en pantallas pequeñas.')),
      caja('Antes de presentar',
        h('p', { style: 'margin:0;font-size:13px;line-height:1.6;color:var(--mut)' },
          'Exportar → ', h('b', { style: 'color:var(--ink)' }, 'Revisar antes de presentar'), ' recorre todas las diapositivas y te dice qué conviene arreglar: contenido que no cabe en el marco, texto con poco contraste para una sala con luz, figuras sin pie, imágenes que se verán borrosas al proyectar, diapositivas vacías o sin título y secciones sin contenido. Un clic te lleva a cada una.')),
      caja('Matemáticas',
        h('p', { style: 'margin:0;font-size:13px;line-height:1.6;color:var(--mut)' },
          h('b', { style: 'color:var(--ink)' }, 'Teorema y demostración'),
          ': ocho enunciados —teorema, lema, proposición, corolario, definición, ejemplo, observación y demostración— que en el código Beamer salen como el entorno de AMS que les toca, con su nombre en español y el cuadrito de fin de demostración. ',
          h('b', { style: 'color:var(--ink)' }, 'Figura geométrica'),
          ': seis construcciones con rótulos editables —triángulo con sus lados y su ángulo, circunferencia con radio, cuerda y tangente, área bajo la curva entre a y b, recta numérica con intervalo abierto o cerrado, suma de vectores por el paralelogramo y ángulos entre paralelas—. Y el editor de ecuaciones trae ahora ciento y pico de plantillas, con secciones de matemáticas, física y biología.')),
      caja('Química y laboratorio',
        h('p', { style: 'margin:0;font-size:13px;line-height:1.6;color:var(--mut)' },
          h('b', { style: 'color:var(--ink)' }, 'Estructura química'),
          ': un lienzo al modo ChemDraw. Arrastra desde un átomo para sacar un enlace —los ángulos se ajustan solos a 30° y la longitud es siempre la misma—, cambia el elemento, pon cargas, marca cuñas para la estereoquímica y encaja anillos (benceno, piridina, furano, naftaleno) haciendo clic sobre un enlace para fusionarlos. Los carbonos van implícitos y los hidrógenos se calculan por valencia, como en un artículo. ',
          h('b', { style: 'color:var(--ink)' }, 'Montaje de laboratorio'),
          ': noventa y cinco piezas repartidas en seis grupos —vidrio, montaje y calor, equipo, biología, circuitos y óptica y mecánica—. Sirve igual para un reflujo, para un flujo de PCR, para un circuito de una malla o para un banco óptico: colocas las piezas, las rotulas y las unes con flechas o con cables en escuadra. Las dos cosas son vectoriales: toman el color del tema, no se pixelan y en el código Beamer salen como TikZ de verdad, no como imagen.')),
      caja('Ensayar y medir el tiempo',
        h('p', { style: 'margin:0;font-size:13px;line-height:1.6;color:var(--mut)' },
          'Exportar → ', h('b', { style: 'color:var(--ink)' }, 'Ensayar con cronómetro'),
          ' hace un pase normal, pero cronometrando cada diapositiva. Arriba a la izquierda ves el tiempo de la que tienes delante frente al previsto, y al salir con Esc aparece la tabla: previsto, real y diferencia, con las que no viste en gris. Si el ensayo te salió bien, un botón guarda esos tiempos como los previstos.')),
      caja('Al presentar, además',
        h('p', { style: 'margin:0;font-size:13px;line-height:1.6;color:var(--mut)' },
          h('b', { style: 'color:var(--ink)' }, 'O'), ' abre la rejilla con todas las diapositivas encima de la presentación: te mueves con las flechas y saltas con Enter, sin que el público vea el editor. ',
          h('b', { style: 'color:var(--ink)' }, 'L'), ' enciende el lápiz para dibujar sobre la diapositiva, otra vez deja el puntero y una tercera lo apaga; ',
          h('b', { style: 'color:var(--ink)' }, 'C'), ' borra los trazos. Escribir un ', h('b', { style: 'color:var(--ink)' }, 'número'),
          ' o pulsar ', h('b', { style: 'color:var(--ink)' }, 'G'), ' abre «Ir a», que salta por número o por parte del título, para cuando el jurado pregunta por algo de atrás.')),
      caja('Meter contenido sin menús',
        h('p', { style: 'margin:0;font-size:13px;line-height:1.6;color:var(--mut)' },
          'Puedes ', h('b', { style: 'color:var(--ink)' }, 'arrastrar'), ' al lienzo una imagen, un GIF, un video, un .csv con datos o un proyecto .json, y se convierte en el bloque que toca. Y al ',
          h('b', { style: 'color:var(--ink)' }, 'pegar'), ': una captura del portapapeles se vuelve figura, una tabla copiada de Excel se vuelve gráfica o tabla según los datos, y algo con \\frac o \\alpha se vuelve ecuación. Para arrancar una presentación entera, «Desde un esquema» convierte tu índice en texto plano en secciones, títulos y viñetas.')),
      caja('Exportar a PowerPoint',
        h('p', { style: 'margin:0;font-size:13px;line-height:1.6;color:var(--mut)' },
          'Exportar → ', h('b', { style: 'color:var(--ink)' }, 'PowerPoint (.pptx)'),
          ' arma el archivo aquí mismo, sin subir nada a ningún sitio. Los textos, las viñetas y las tablas quedan ',
          h('b', { style: 'color:var(--ink)' }, 'editables'), '; las ecuaciones, las gráficas y los diagramas van como imagen, porque PowerPoint no tiene equivalente. Las notas del orador viajan también. Es la vía cuando el comité o el congreso piden el archivo en PowerPoint.')),
      caja('Para moverte rápido',
        h('p', { style: 'margin:0;font-size:13px;line-height:1.6;color:var(--mut)' },
          h('b', { style: 'color:var(--ink)' }, 'Ctrl+K'), ' abre «Ir a / hacer»: escribes parte del texto de una diapositiva y saltas a ella, o el nombre de una acción y se ejecuta. ',
          h('b', { style: 'color:var(--ink)' }, 'Ctrl+F'), ' busca y reemplaza en toda la presentación, notas incluidas. En la tira de la izquierda, las diapositivas se agrupan bajo su sección y la sección se pliega; con ',
          h('b', { style: 'color:var(--ink)' }, 'Ctrl+clic'), ' o ', h('b', { style: 'color:var(--ink)' }, 'Mayús+clic'),
          ' marcas varias para duplicarlas o borrarlas de golpe. Al borrar algo aparece un aviso con «Deshacer».')),
      caja('Hacerlo tuyo',
        h('p', { style: 'margin:0;font-size:13px;line-height:1.6;color:var(--mut)' },
          'En ', h('b', { style: 'color:var(--ink)' }, 'Diseño'), ' puedes poner el ',
          h('b', { style: 'color:var(--ink)' }, 'color de tu universidad'), ': se aplica a títulos, viñetas, cajas, diagramas y pie, y viaja al .tex como \\definecolor con \\setbeamercolor{structure}. Esa combinación de tema, color, tipografía, pie y escudo se guarda como un ',
          h('b', { style: 'color:var(--ink)' }, 'estilo'), ' con nombre, y puedes marcarlo para que toda presentación nueva arranque con él. Las presentaciones nuevas parten de una plantilla: defensa de tesis, avance de proyecto, seminario o clase, ya con sus secciones y tiempos. El botón ◐ de arriba cambia la apariencia del editor entre clara, oscura y la del sistema.')),
      caja('Tipografía',
        h('p', { style: 'margin:0;font-size:13px;line-height:1.6;color:var(--mut)' },
          'En ', h('b', { style: 'color:var(--ink)' }, 'Diseño → Tipografía'), ' hay nueve familias usadas en publicación científica. Seis de ellas —Latin Modern, Times (Termes), Palatino (Pagella), New Century Schoolbook, Latin Modern Sans y Helvetica (Heros)— son ',
          h('b', { style: 'color:var(--ink)' }, 'las mismas que usa LaTeX'), ' y viajan dentro de la app: lo que ves en pantalla es la letra exacta del PDF, y funcionan aunque no haya internet. Al exportar, cada una carga su paquete (mathptmx, mathpazo, lmodern, newcent…) protegido con \\IfFileExists, así que el .tex compila aunque el paquete falte.')),
      caja('Pie de página y notas',
        h('p', { style: 'margin:0;font-size:13px;line-height:1.6;color:var(--mut)' },
          'En ', h('b', { style: 'color:var(--ink)' }, 'Diseño → Pie de página'), ' eliges la plantilla igual que en Beamer: el pie del tema, solo el número, una línea de texto o dos y tres celdas (los pies «split» e «infolines»). Cada celda lleva un dato —autor, título, sección, número, logotipo— o texto libre con piezas entre llaves como ',
          h('b', { style: 'color:var(--ink)' }, '{autor}'), ' o ', h('b', { style: 'color:var(--ink)' }, '{n}/{N}'), '. Todo se exporta como un \\setbeamertemplate{footline} de verdad. ',
          'Las notas tienen su propio editor con vista previa y minutos previstos por diapositiva; en el .tex pueden salir como páginas aparte o en segunda pantalla, y el botón ',
          h('b', { style: 'color:var(--ink)' }, 'Guion imprimible'), ' arma una hoja con miniatura, notas y tiempos.')),
      caja('Escudo de tu institución',
        h('p', { style: 'margin:0;font-size:13px;line-height:1.6;color:var(--mut)' },
          'En la pestaña ', h('b', { style: 'color:var(--ink)' }, 'Diseño'), ' → Identidad institucional puedes subir el escudo (PNG con fondo transparente o SVG), ponerlo en la portada —centrado o en la esquina—, repetirlo al pie de cada diapositiva y agregar una leyenda. Todo se exporta también al .tex; el archivo del logotipo se descarga junto con las figuras y el documento compila aunque todavía no lo hayas subido.')),
      h('div', { class: 'help-grid' },
        h('div', null,
          h('span', { class: 'panel-label', style: 'display:block;margin-bottom:6px' }, 'Editar'),
          h('p', { class: 'hint' }, 'Clic en cualquier texto para escribir. En viñetas, Enter agrega un punto y Tab lo anida. Doble clic en una ecuación, reacción o gráfica abre su editor.')),
        h('div', null,
          h('span', { class: 'panel-label', style: 'display:block;margin-bottom:6px' }, 'Matemáticas'),
          h('p', { class: 'hint' }, 'Escribe entre $ y $ dentro de cualquier texto para componer una fórmula en línea. La paleta inserta plantillas y símbolos por clic.'))),
      h('p', { class: 'hint', style: 'margin-top:12px' },
        'El autoguardado vive en este navegador. Para respaldar o pasar a otro equipo usa Exportar → Proyecto (.json); para editar el LaTeX real, Exportar → Código Beamer (.tex), listo para Overleaf: las gráficas viajan como código pgfplots, no como imágenes.'));
  }

  function panelAtajos() {
    return h('div', { class: 'help-grid' },
      h('div', null,
        K('Ctrl J', 'Abrir el asistente'), K('Doble clic', 'Editar figura, galería, montaje o gráfica'),
        K('Ctrl ⇧ B', 'Herramientas arriba o a la derecha'), K('Ctrl F1', 'Plegar o desplegar la cinta'),
        K('Ctrl ⇧ A', 'Argumento'), K('Ctrl ⇧ T', 'Línea de tiempo'), K('Ctrl ⇧ M', 'Recorrido del ojo'),
        K('Q', 'Al presentar: respaldo para preguntas'),
        K('Ctrl K', 'Ir a / hacer'), K('Ctrl F', 'Buscar y reemplazar'), K('Ctrl G', 'Ver todas las diapositivas'),
        K('Ctrl V', 'Pegar imagen, tabla o ecuación'),
        K('Ctrl Z', 'Deshacer'), K('Ctrl ⇧ Z', 'Rehacer'), K('Ctrl D', 'Duplicar diapositiva'),
        K('Ctrl M', 'Nueva diapositiva'), K('Ctrl S', 'Guardar como'),
        K('↑ ↓', 'Cambiar de diapositiva'), K('Supr', 'Eliminar el bloque seleccionado'),
        K('Ctrl clic', 'Marcar varias diapositivas'), K('⇧ clic', 'Marcar un tramo'),
        K('Esc', 'Quitar la marca, cancelar o cerrar el panel de detalles')),
      h('div', null,
        K('F5', 'Presentar desde el inicio'), K('→ Espacio', 'Avanzar un paso'), K('←', 'Retroceder'),
        K('O', 'Al presentar: ver todas y saltar'),
        K('P', 'Al presentar: vista de presentador'),
        K('L', 'Al presentar: lápiz y puntero'), K('C', 'Al presentar: borrar los trazos'),
        K('G o un número', 'Al presentar: ir a una diapositiva'),
        K('N', 'Al presentar: ver notas del orador'), K('F', 'Al presentar: pantalla completa'),
        K('B', 'Al presentar: pantalla en negro'), K('R', 'Al presentar: reiniciar la animación')));
  }

  function panelPrivacidad() {
    const diagnostico = window.ErlenDiagnostico;
    if (!diagnostico?.disponible) return h('p', null, 'Esta copia no envía diagnósticos. Tu presentación se guarda en este navegador.');
    const check = h('input', {type: 'checkbox', 'aria-label': 'Compartir diagnósticos técnicos'});
    check.checked = diagnostico.estado().activo;
    check.addEventListener('change', () => { diagnostico.activar(check.checked); pintar(); });
    const estado = h('p', {role: 'status', style: 'font-size:13px'}, '');
    const prueba = h('button', {class: 'btn', disabled: !check.checked, onclick: () => {
      const id = diagnostico.reportar('prueba');
      estado.textContent = id ? 'Prueba preparada. Su recepción se comprueba en Sentry.' : 'Espera a que cargue el diagnóstico. Solo se permite una prueba por sesión.';
    }}, 'Enviar diagnóstico de prueba');
    return h('div', null,
      h('p', null, 'El diagnóstico es opcional y está desactivado inicialmente. Activarlo ayuda a corregir fallos de edición, guardado y descarga.'),
      h('label', {style: 'display:flex;align-items:center;gap:10px;margin:16px 0'}, check, 'Compartir diagnósticos técnicos'),
      h('p', null, 'Solo enviamos a Sentry el tipo de fallo, la versión de Erlen y la línea del programa. No enviamos textos, títulos, archivos, cuentas, historial de clics ni grabaciones de pantalla. Como proveedor de la conexión, Sentry recibe datos de red; estos informes no llevan identificadores de usuario.'),
      h('p', null, 'Puedes desactivarlo aquí en cualquier momento. La preferencia se guarda en este navegador. No cambia la telemetría de uso, que sigue desactivada, ni afecta a las herramientas gratuitas.'),
      prueba, estado);
  }

  function pintar() {
    tabs.innerHTML = '';
    [['uso', 'Cómo se usa'], ['glosario', 'Glosario'], ['atajos', 'Atajos'], ['privacidad', 'Privacidad']].forEach(([id, n]) => {
      tabs.append(h('button', { class: activa === id ? 'on' : '', onclick: () => { activa = id; pintar(); } }, n));
    });
    cuerpo.innerHTML = '';
    cuerpo.append(activa === 'uso' ? panelUso() : activa === 'glosario' ? renderGlosario() : activa === 'privacidad' ? panelPrivacidad() : panelAtajos());
  }
  pintar();

  openModal({
    title: 'Ayuda',
    body: h('div', null, tabs, cuerpo),
    foot: [
      h('a', { class: 'foot-note', href: GUIA_URL, target: '_blank', rel: 'noopener',
        style: 'color:var(--acc);font-weight:600;text-decoration:none' }, 'Abrir la guía de caracterización →'),
      h('button', { class: 'btn btn-pri', onclick: closeModal }, 'Cerrar')
    ]
  });
}

/* ---------- mover un bloque a otra diapositiva ---------- */
function openMoverBloque(b) {
  const f = findBlock(b.id); if (!f) return;
  const origen = S.deck.slides.indexOf(f.slide);
  const zOrigen = CLAVES_ZONA.findIndex(k => f.slide[k] === f.arr);
  const candidatas = [];
  S.deck.slides.forEach((sl, i) => { if (zonasDe(sl.layout)) candidatas.push({ i, sl }); });
  if (!candidatas.length) { toast('No hay diapositivas que admitan bloques'); return; }

  const selSl = h('select', { class: 'field' });
  candidatas.forEach(({ i, sl }) => {
    const nom = (sl.title || '').trim() || (LAY[sl.layout] ? LAY[sl.layout].name : 'Diapositiva');
    selSl.append(h('option', { value: String(i), selected: i === origen }, `${i + 1} · ${nom}${i === origen ? '  (actual)' : ''}`));
  });
  const selZ = h('select', { class: 'field' });
  const filaZ = h('div', { class: 'irow' }, h('label', null, 'Zona'), h('div', { style: 'flex:1.4' }, selZ));
  const pintaZonas = () => {
    const i = +selSl.value, sl = S.deck.slides[i], nz = zonasDe(sl.layout);
    const nombres = NOMBRES_ZONA[sl.layout] || [];
    selZ.innerHTML = '';
    for (let z = 0; z < nz; z++) selZ.append(h('option', { value: String(z), selected: i === origen && z === zOrigen }, nombres[z] || ('Zona ' + (z + 1))));
    filaZ.style.display = nz > 1 ? '' : 'none';
  };
  pintaZonas();
  selSl.addEventListener('change', pintaZonas);

  const body = h('div', null,
    h('div', { class: 'irow' }, h('label', null, 'Diapositiva'), h('div', { style: 'flex:1.4' }, selSl)),
    filaZ,
    h('p', { class: 'hint' }, 'El bloque se coloca al final de la zona elegida. También puedes arrastrarlo desde el asa ⠿ de su barra: dentro de la diapositiva para reacomodarlo, o sobre una miniatura de la izquierda para mandarlo a otra.'));

  openModal({
    title: 'Mover bloque', size: 'modal-sm', body,
    foot: [h('button', { class: 'btn', onclick: closeModal }, 'Cancelar'),
      h('button', { class: 'btn btn-pri', onclick: () => {
        const i = +selSl.value, z = +selZ.value;
        closeModal();
        if (moveBlockToSlide(b.id, i, z, null)) toast('Bloque movido a la diapositiva ' + (i + 1));
      } }, 'Mover')]
  });
}
