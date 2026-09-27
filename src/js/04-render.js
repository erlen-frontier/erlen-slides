/* ==== 04-render.js ==== */
'use strict';
/* ================= render de diapositivas ================= */
const slideDims = deck => deck.meta.aspect === '43' ? [1024, 768] : [1280, 720];

function renderSlide(deck, idx, mode, stepShown) {
  const sl = deck.slides[idx];
  const m = deck.meta;
  const edit = mode === 'edit';
  const ctx = countersFor(deck, idx);
  const fuente = fuenteDe(m);
  const root = h('div', { class: `slide th-${m.theme} asp${m.aspect === '43' ? '43' : '169'} mode-${mode}` + (fuente.id !== 'auto' ? ' fu-' + fuente.id : '') });
  { const t0 = temaDe(deck); root.style.setProperty('--sacc-ink', tintaSobre(t0.acc));
    const va = varsAcento(deck); for (const k in va) root.style.setProperty(k, va[k]); }
  let fragN = 0;

  /* El corrector del navegador se enciende en la prosa y se apaga donde
     estorbaría: código, fórmulas y datos. */
  const ed = (ek, ph, sinCorrector) => edit
    ? { 'data-edit': '', 'data-ek': ek, 'data-ph': ph || '', contenteditable: 'plaintext-only',
        spellcheck: sinCorrector ? 'false' : 'true', lang: 'es' }
    : {};
  const emptyCls = v => (v == null || String(v).trim() === '') ? ' is-empty' : '';

  /* ancho útil del cuerpo, en unidades de la diapositiva */
  const SLIDE_W = m.aspect === '43' ? 1024 : 1280;
  const BODY_PAD = { metropolis: 46, nocturno: 46, madrid: 34, cambridge: 44, sobrio: 52,
    banda: 52, bloque: 96, carbon: 56, ciruela: 60, salvia: 52, arena: 54, marino: 58, acuarela: 56 }[m.theme] || 46;
  const FACTOR_PAD = { estrecho: 0.45, normal: 1, amplio: 1.8 };
  const padK = FACTOR_PAD[sl.pad] != null ? FACTOR_PAD[sl.pad] : (sl.layout === 'ancho' ? 0.45 : 1);
  const bodyW = Math.round(SLIDE_W - BODY_PAD * 2 * padK);
  const GAP = 34;

  /* ---- bloques ---- */
  function renderBlock(b, availPx) {
    const sel = edit && S.selBlock === b.id;
    let el;
    switch (b.type) {
      case 'text':
        el = h('div', Object.assign({ class: `blk b-text sz-${b.size || 'n'}${b.align === 'center' ? ' al-c' : ''}${emptyCls(b.text)}`, html: blockRich(b.text) }, ed('b:' + b.id, 'Texto…')));
        break;
      case 'bullets': {
        const ul = h('ul', { class: 'bl' });
        (b.items || []).forEach((it, i) => {
          const li = h('li', Object.assign({ class: `lv${it.lvl || 0}${emptyCls(it.t)}`, html: inlineRich(it.t) }, ed(`b:${b.id}:li:${i}`, 'Punto…')));
          if (mode === 'present' && b.step) { li.classList.add('frag', 'an-' + (b.anim || 'fade'));
            if (typeof animMs === 'function') li.style.setProperty('--an-ms', animMs(b) + 'ms');
            li.style.setProperty('--an-ret', clamp(+b.animRet || 0, 0, 2000) + 'ms');
            li.dataset.frag = fragN; if (fragN < stepShown) li.classList.add('on'); fragN++; }
          ul.append(li);
        });
        el = h('div', { class: 'blk b-bullets' }, ul);
        if (edit && b.step) el.append(h('span', { class: 'step-badge' }, 'por pasos'));
        break;
      }
      case 'math':
        if (typeof conDerivacion === 'function' && conDerivacion(b)) {
          const frag = { n: fragN, mostrados: stepShown };
          el = renderDerivacion(b, deck, mode, edit, frag);
          fragN = frag.n;
          break;
        }
        el = h('div', { class: `blk b-math sz-${b.size || 'n'}` });
        if (b.tex) el.innerHTML = kStr(b.tex, true);
        else el.append(h('div', { class: 'img-ph', style: 'width:60%;aspect-ratio:auto;padding:22px 10px' }, edit ? 'Doble clic para escribir la ecuación con la paleta' : ' '));
        break;
      case 'chem':
        el = h('div', { class: 'blk b-chem' });
        if (b.tex) el.innerHTML = kStr('\\ce{' + b.tex + '}', true);
        else el.append(h('div', { class: 'img-ph', style: 'width:60%;aspect-ratio:auto;padding:22px 10px' }, edit ? 'Doble clic para armar la reacción química' : ' '));
        break;
      case 'image': {
        const fig = h('figure', null);
        if (b.src) {
          const env = h('div', { class: 'imgwrap', style: `width:${b.w || 70}%` },
            h('img', { src: b.src, alt: b.alt || b.caption || 'Figura' }),
            typeof capaFigura === 'function' ? capaFigura(b, deck) : null,
            typeof capaEscala === 'function' ? capaEscala(b) : null);
          if (typeof aplicaEstiloImg === 'function') aplicaEstiloImg(env, b, deck);
          fig.append(env);
          /* Antes / después: la segunda imagen se funde sobre la primera como un paso. */
          if (b.despues && b.despues.src && typeof renderDespues === 'function') {
            fragN += renderDespues(b, deck, mode, availPx || bodyW, env, fragN, stepShown, edit);
          }
        }
        if (!b.src) fig.append(h('div', { class: 'img-ph' }, edit ? 'Haz clic para elegir una imagen (PNG, JPG o SVG)' : ' '));
        const capTxt = b.caption || '';
        if (capTxt || edit) {
          const cap = h('figcaption', null, h('span', { class: 'cap-label' }, `Figura ${ctx.fig + 1}: `),
            h('span', Object.assign({ class: emptyCls(capTxt).trim(), html: inlineRich(capTxt) }, ed(`b:${b.id}:cap`, 'Pie de figura…'))));
          fig.append(cap);
        }
        el = h('div', { class: `blk b-image${b.frame ? ' imgframe' : ''}` }, fig);
        break;
      }
      case 'table': {
        const rows = b.rows || [];
        const tbl = h('table', { class: `btab${b.align === 'l' ? ' al-l' : ''}${b.header ? '' : ' no-head'}` });
        const numCols = columnasNumericas(rows, !!b.header);
        const mk = (r, ri, tag) => h('tr', null, r.map((c, ci) =>
          h(tag, Object.assign({ class: (emptyCls(c) + (numCols[ci] ? ' num' : '')).trim(), html: inlineRich(c) }, ed(`b:${b.id}:cell:${ri},${ci}`, '·', true))) ));
        if (b.header && rows.length) tbl.append(h('thead', null, mk(rows[0], 0, 'th')));
        tbl.append(h('tbody', null, rows.slice(b.header ? 1 : 0).map((r, i) => mk(r, i + (b.header ? 1 : 0), 'td'))));
        const wrap = h('div', { class: 'blk b-table' });
        const capTxt = b.caption || '';
        if (capTxt || edit) wrap.append(h('div', { class: 'tab-caption' }, h('span', { class: 'cap-label' }, `Tabla ${ctx.tab + 1}: `),
          h('span', Object.assign({ class: emptyCls(capTxt).trim(), html: inlineRich(capTxt) }, ed(`b:${b.id}:tcap`, 'Título de la tabla…')))));
        wrap.append(tbl);
        el = wrap;
        break;
      }
      case 'bblock': {
        el = h('div', { class: `blk b-bblock` },
          h('div', { class: `bb k-${b.kind || 'block'}` },
            h('div', Object.assign({ class: 'bb-title' + emptyCls(b.btitle), html: inlineRich(b.btitle) }, ed(`b:${b.id}:t`, 'Título de la caja…'))),
            h('div', Object.assign({ class: 'bb-body' + emptyCls(b.body), html: blockRich(b.body) }, ed(`b:${b.id}`, 'Contenido…')))));
        break;
      }
      case 'quote':
        el = h('div', { class: 'blk b-quote' },
          h('blockquote', null,
            h('span', Object.assign({ class: emptyCls(b.text).trim(), html: inlineRich(b.text) }, ed(`b:${b.id}`, 'Cita…'))),
            h('cite', { class: 'q-by' },
              h('span', Object.assign({ class: emptyCls(b.by).trim(), html: '— ' + inlineRich(b.by) }, ed(`b:${b.id}:by`, '— Autor'))))));
        break;
      case 'code':
        el = h('div', { class: 'blk b-code' }, h('pre', Object.assign({ html: esc(b.text) }, ed(`b:${b.id}`, 'código…', true))));
        break;
      case 'spacer':
        el = h('div', { class: 'blk b-spacer', style: `height:${b.hpx || 24}px` }, edit ? `↕ ${b.hpx || 24} px` : '');
        break;
      case 'chart':
      case 'func': {
        el = h('div', { class: 'blk b-chart' });
        const avail = availPx || bodyW;
        const holder = h('div', { class: 'chart-holder', style: `width:${b.w || 78}%` });
        const svgG = renderChart(b, deck, mode, avail);
        holder.append(svgG);
        el.append(holder);
        /* Por capas: cada capa es un paso de la presentación, como una viñeta más. */
        if (b.capas && svgG && svgG.querySelectorAll) {
          const gs = Array.from(svgG.querySelectorAll('g.capa'));
          gs.forEach(g => {
            if (mode === 'present') {
              g.classList.add('frag', 'an-fade');
              g.dataset.frag = fragN;
              if (fragN < stepShown) g.classList.add('on');
              fragN++;
            } else if (edit) fragN++;
          });
          if (edit && gs.length) el.append(h('span', { class: 'step-badge' }, gs.length + ' capas'));
        }
        /* Antes / después: el segundo estado entra como un paso más. */
        if (b.despues && typeof renderDespues === 'function') {
          const r = renderDespues(b, deck, mode, avail, holder, fragN, stepShown, edit);
          fragN += r;
        }
        /* El sello de procedencia: de qué archivo salió y cuándo. */
        if (b.sello && b.fuente && typeof selloFuente === 'function') el.append(selloFuente(b));
        if (b.type === 'func' && b.sliders && (b.params || []).length && (mode === 'edit' || mode === 'present')) {
          el.append(buildSliders(b, holder, deck, mode, avail));
        }
        const capTxt = b.caption || '';
        if (capTxt || edit) el.append(h('div', { class: 'chart-cap' },
          h('span', { class: 'cap-label' }, `Figura ${ctx.fig + 1}: `),
          h('span', Object.assign({ class: emptyCls(capTxt).trim(), html: inlineRich(capTxt) }, ed(`b:${b.id}:cap`, 'Pie de la gráfica…')))));
        break;
      }
      case 'teorema': {
        el = h('div', { class: 'blk b-teorema' });
        el.append(renderTeorema(b, deck, mode, edit, ed, emptyCls));
        break;
      }
      case 'geo': {
        el = h('div', { class: 'blk b-geo' });
        el.append(renderGeometria(b, deck));
        const capG = b.caption || '';
        if (capG || edit) el.append(h('div', { class: 'smart-cap' },
          h('span', { class: 'cap-label' }, `Figura ${ctx.fig + 1}: `),
          h('span', Object.assign({ class: emptyCls(capG).trim(), html: inlineRich(capG) }, ed(`b:${b.id}:cap`, 'Pie de la figura…')))));
        break;
      }
      case 'estruct': {
        el = h('div', { class: 'blk b-estruct' });
        el.append(renderEstructura(b, deck, mode));
        const capE = b.caption || '';
        if (capE || edit) el.append(h('div', { class: 'smart-cap' },
          h('span', { class: 'cap-label' }, `Figura ${ctx.fig + 1}: `),
          h('span', Object.assign({ class: emptyCls(capE).trim(), html: inlineRich(capE) }, ed(`b:${b.id}:cap`, 'Pie de la estructura…')))));
        break;
      }
      case 'galeria': {
        el = renderGaleria(b, deck, mode, availPx || bodyW);
        break;
      }
      case 'refs': {
        el = renderReferencias(b, deck, mode);
        break;
      }
      case 'montaje': {
        el = h('div', { class: 'blk b-montaje' });
        el.append(renderMontaje(b, deck, mode, availPx || bodyW));
        const capM = b.caption || '';
        if (capM || edit) el.append(h('div', { class: 'smart-cap' },
          h('span', { class: 'cap-label' }, `Figura ${ctx.fig + 1}: `),
          h('span', Object.assign({ class: emptyCls(capM).trim(), html: inlineRich(capM) }, ed(`b:${b.id}:cap`, 'Pie del montaje…')))));
        break;
      }
      case 'smart': {
        el = h('div', { class: 'blk b-smart' });
        el.append(renderSmart(b, deck, mode, availPx || bodyW));
        const capTxt = b.caption || '';
        if (capTxt || edit) el.append(h('div', { class: 'smart-cap' },
          h('span', { class: 'cap-label' }, `Figura ${ctx.fig + 1}: `),
          h('span', Object.assign({ class: emptyCls(capTxt).trim(), html: inlineRich(capTxt) }, ed(`b:${b.id}:cap`, 'Pie del diagrama…')))));
        break;
      }
      case 'video': {
        const fig = h('figure', null);
        if (b.src) {
          const wrap = h('div', { class: 'vid-wrap', style: `width:${b.w || 70}%` });
          if (mode === 'export' || mode === 'thumb') {
            wrap.append(b.poster
              ? h('img', { src: b.poster, alt: b.caption || 'Video' })
              : h('div', { class: 'vid-still' }, '▶'));
            if (mode === 'export') wrap.append(h('span', { class: 'vid-badge' }, '▶ video'));
          } else if (b.mime === 'image/gif') {
            wrap.append(h('img', { src: b.src, alt: b.alt || b.caption || 'Animación' }));
          } else {
            const v = h('video', {
              src: b.src, poster: b.poster || null, loop: b.loop !== false,
              muted: true, playsinline: true, preload: 'metadata',
              controls: mode === 'edit' ? true : (b.controls !== false ? true : null)
            });
            v.muted = true;
            if (mode === 'present' && b.autoplay !== false) v.dataset.autoplay = '1';
            wrap.append(v);
          }
          fig.append(wrap);
        } else {
          fig.append(h('div', { class: 'img-ph' }, edit ? 'Haz clic para elegir un video (MP4/WebM) o un GIF' : ' '));
        }
        const capTxt = b.caption || '';
        if (capTxt || edit) fig.append(h('figcaption', null,
          h('span', { class: 'cap-label' }, `Figura ${ctx.fig + 1}: `),
          h('span', Object.assign({ class: emptyCls(capTxt).trim(), html: inlineRich(capTxt) }, ed(`b:${b.id}:cap`, 'Pie del video…')))));
        el = h('div', { class: 'blk b-video' }, fig);
        break;
      }
      default: el = h('div');
    }
    if (b.type !== 'bullets' && b.step) {
      if (mode === 'present') {
        el.classList.add('frag', 'an-' + (b.anim || 'fade'));
        if (typeof animMs === 'function') el.style.setProperty('--an-ms', animMs(b) + 'ms');
        el.style.setProperty('--an-ret', clamp(+b.animRet || 0, 0, 2000) + 'ms');
        el.dataset.frag = fragN;
        if (fragN < stepShown) el.classList.add('on');
        fragN++;
      } else if (edit) {
        fragN++;
        el.append(h('span', { class: 'step-badge' }, 'paso ' + fragN));
      }
    }
    el.dataset.bid = b.id;
    if (edit && sel) el.classList.add('sel');
    /* El pie ya se escribió con el número de este bloque: el siguiente de la
       misma diapositiva lleva el siguiente. Sin esto, dos figuras juntas
       salían las dos como «Figura 1». */
    if (TIPOS_FIGURA.includes(b.type)) ctx.fig++;
    else if (b.type === 'table') ctx.tab++;
    return el;
  }

  /* ---- layouts ---- */
  const logoEl = (cls, w) => m.logo
    ? h('img', { class: cls, src: m.logo, alt: m.logoAlt || m.institute || 'Logotipo', style: w ? `width:${w}%` : null })
    : null;

  if (sl.layout === 'title') {
    const arriba = m.logo && (m.logoPos || 'arriba') === 'arriba';
    if (m.logo && !arriba) root.append(h('div', { class: 'tp-logo-esq' }, logoEl('logo-img')));
    root.append(h('div', { class: 'ly-title' },
      arriba ? h('div', { class: 'tp-logo' }, logoEl('logo-img', clamp(+m.logoW || 16, 5, 60))) : null,
      h('div', { class: 'tp-box' },
        h('div', Object.assign({ class: 'tp-title' + emptyCls(m.title), html: inlineRich(m.title) }, ed('meta.title', 'Título de la presentación'))),
        h('div', { class: 'tp-rule' }),
        h('div', Object.assign({ class: 'tp-sub' + emptyCls(m.subtitle), html: inlineRich(m.subtitle) }, ed('meta.subtitle', 'Subtítulo (opcional)'))),
        h('div', { class: 'tp-meta' },
          h('div', Object.assign({ class: 'tp-auth' + emptyCls(m.authors), html: inlineRich(m.authors) }, ed('meta.authors', 'Autores'))),
          h('div', Object.assign({ class: 'tp-inst' + emptyCls(m.institute), html: inlineRich(m.institute) }, ed('meta.institute', 'Institución'))),
          h('div', Object.assign({ class: 'tp-date' + emptyCls(m.date), html: inlineRich(m.date) }, ed('meta.date', 'Fecha')))))));
  } else if (sl.layout === 'section') {
    const inner = h('div', { class: 'sec-inner' },
      h('div', { class: 'sec-kicker' }, `Sección ${ctx.secN}`),
      h('div', Object.assign({ class: 'sec-name' + emptyCls(sl.title), html: inlineRich(sl.title) }, ed('slide.title', 'Nombre de la sección'))),
      h('div', { class: 'sec-prog' }, h('i', { style: `width:${ctx.secTotal ? (ctx.secN / ctx.secTotal) * 100 : 0}%` })));
    root.append(h('div', { class: 'ly-section' }, m.theme === 'madrid' ? h('div', { class: 'sec-band' }, inner) : inner));
  } else {
    const frame = h('div', { class: 'ly-frame' });
    const showFt = edit || (sl.title || '').trim() !== '' || (sl.subtitle || '').trim() !== '';
    if (showFt) {
      const ft = h('div', { class: 'frametitle' },
        h('div', Object.assign({ class: 'ft-t' + emptyCls(sl.title), html: inlineRich(sl.title) }, ed('slide.title', 'Título del marco'))));
      if (edit || (sl.subtitle || '').trim() !== '')
        ft.append(h('div', Object.assign({ class: 'ft-s' + emptyCls(sl.subtitle), html: inlineRich(sl.subtitle) }, ed('slide.subtitle', 'Subtítulo (opcional)'))));
      frame.append(ft);
    }
    const esc = clamp(+sl.scale || 1, 0.7, 1.4);
    const body = h('div', {
      class: 'fbody ly-' + sl.layout + (sl.vcenter ? ' v-center' : '') + ' pad-' + (sl.pad || (sl.layout === 'ancho' ? 'estrecho' : 'normal')),
      style: esc !== 1 ? `--sesc:${esc}` : null
    });
    if (sl.layout === 'toc') {
      const secs = sectionsOf(deck);
      const ol = h('ul', { class: 'toc-list' });
      if (secs.length) secs.forEach((s, i) => ol.append(h('li', null, h('span', { class: 'toc-num' }, String(i + 1)), h('span', { html: inlineRich(s.name) }))));
      else ol.append(h('li', null, h('span', { class: 'toc-num' }, '·'), h('span', { style: 'opacity:.55' }, edit ? 'Agrega diapositivas de sección y aparecerán aquí' : ' ')));
      body.append(ol);
    } else {
      /* ---- zonas ---- */
      const bloquesDe = (i, ancho) => (sl[CLAVES_ZONA[i]] || []).filter(x => typeof bloqueVisible !== 'function' || bloqueVisible(x, deck)).map(x => renderBlock(x, ancho));
      /* La zona vacía es el sitio donde uno hace clic esperando escribir, como
         en cualquier programa de diapositivas: se comporta como un botón que
         crea el texto ahí mismo y deja el cursor dentro. */
      const vacia = (i, texto) => edit && !(sl[CLAVES_ZONA[i]] || []).length
        ? h('div', { class: 'img-ph zona-vacia', 'data-nueva-z': String(i), role: 'button', tabindex: '0',
            title: 'Haz clic para escribir aquí', style: 'width:100%;aspect-ratio:auto' },
            h('span', { class: 'zv-t' }, texto),
            h('span', { class: 'zv-s' }, 'Haz clic para escribir'))
        : null;
      const ztEd = i => edit
        ? { 'data-edit': '', 'data-ek': 'zt:' + i, 'data-ph': 'Encabezado…', contenteditable: 'plaintext-only', spellcheck: 'true', lang: 'es' } : {};
      const zt = i => (sl.zt || [])[i] || '';

      if (sl.layout === 'flujo') {
        const nc = clamp(sl.cols || 2, 2, 3);
        const anchoCol = Math.round((bodyW - GAP * (nc - 1)) / nc);
        const flujo = h('div', { class: 'flujo n' + nc, 'data-z': '0' }, bloquesDe(0, anchoCol));
        body.append(flujo);
        const v = vacia(0, 'Inserta texto y viñetas: se repartirán solos en ' + nc + ' columnas');
        if (v) body.append(v);

      } else if (sl.layout === 'enunciado') {
        body.classList.add('v-center');
        const caja = h('div', { class: 'enunciado', 'data-z': '0' }, bloquesDe(0, Math.round(bodyW * 0.82)));
        body.append(caja);
        const v = vacia(0, 'Inserta un texto grande: la idea que quieres que se lleven');
        if (v) caja.append(v);

      } else if (sl.layout === 'twocol' || sl.layout === 'barra') {
        const esBarra = sl.layout === 'barra';
        const sp = clamp(sl.split || (esBarra ? 30 : 50), esBarra ? 20 : 25, esBarra ? 45 : 75);
        const w1 = Math.round((bodyW - GAP) * sp / 100), w2 = bodyW - GAP - w1;
        const c1 = h('div', { class: 'col' + (esBarra ? ' barra-lat' : ''), style: `flex:0 0 calc(${sp}% - ${GAP / 2}px)`, 'data-col': '1', 'data-z': '0' });
        if (esBarra && (zt(0) || edit)) c1.append(h('div', Object.assign({ class: 'zona-tit' + emptyCls(zt(0)), html: inlineRich(zt(0)) }, ztEd(0))));
        c1.append(...bloquesDe(0, esBarra ? w1 - 36 : w1));
        const c2 = h('div', { class: 'col', style: 'flex:1 1 auto', 'data-col': '2', 'data-z': '1' }, bloquesDe(1, w2));
        const v1 = vacia(0, esBarra ? 'Barra: cifras o datos clave' : 'Columna 1');
        const v2 = vacia(1, esBarra ? 'Contenido principal' : 'Columna 2');
        if (v1) c1.append(v1); if (v2) c2.append(v2);
        body.append(h('div', { class: 'cols' }, c1, c2));

      } else if (sl.layout === 'comparacion') {
        const w = Math.round((bodyW - GAP) / 2);
        const fila = h('div', { class: 'cols comparacion' });
        [0, 1].forEach(i => {
          const c = h('div', { class: 'col comp-col k' + i, 'data-col': String(i + 1) },
            h('div', Object.assign({ class: 'comp-tit' + emptyCls(zt(i)), html: inlineRich(zt(i)) }, ztEd(i))),
            h('div', { class: 'comp-cu', 'data-z': String(i) }, bloquesDe(i, w - 40)));
          const v = vacia(i, 'Lado ' + (i + 1));
          if (v) c.querySelector('.comp-cu').append(v);
          fila.append(c);
        });
        body.append(fila);

      } else if (sl.layout === 'tres' || sl.layout === 'pasos') {
        const esPaso = sl.layout === 'pasos';
        const w = Math.round((bodyW - GAP * 2) / 3);
        const fila = h('div', { class: 'cols tres' + (esPaso ? ' pasos' : '') });
        [0, 1, 2].forEach(i => {
          const c = h('div', { class: 'col', 'data-col': String(i + 1) });
          if (esPaso) {
            c.append(h('div', { class: 'paso-cab' },
              h('span', { class: 'paso-n' }, String(i + 1)),
              h('span', Object.assign({ class: 'paso-tit' + emptyCls(zt(i)), html: inlineRich(zt(i)) }, ztEd(i)))));
          }
          c.append(h('div', { class: 'col-cu', 'data-z': String(i) }, bloquesDe(i, esPaso ? w - 12 : w)));
          const v = vacia(i, esPaso ? 'Etapa ' + (i + 1) : 'Columna ' + (i + 1));
          if (v) c.querySelector('.col-cu').append(v);
          fila.append(c);
        });
        body.append(fila);

      } else if (sl.layout === 'sangre') {
        /* La figura llena el cuerpo y el texto va encima, en una banda con
           fondo para que se lea sobre cualquier imagen. */
        const todos = (sl[CLAVES_ZONA[0]] || []).filter(x => typeof bloqueVisible !== 'function' || bloqueVisible(x, deck));
        const iFig = todos.findIndex(x => ['image', 'chart', 'func', 'galeria', 'video', 'montaje'].includes(x.type));
        const marco = h('div', { class: 'sangre', 'data-z': '0' });
        if (iFig >= 0) marco.append(h('div', { class: 'sangre-fig' }, renderBlock(todos[iFig], Math.round(bodyW * 1.16))));
        const resto = todos.filter((_, i) => i !== iFig);
        if (resto.length) marco.append(h('div', { class: 'sangre-banda' }, resto.map(x => renderBlock(x, Math.round(bodyW * 0.9)))));
        body.append(marco);
        const v = vacia(0, 'Pon aquí la figura: llenará la diapositiva. El texto que añadas después va en la banda de abajo');
        if (v) marco.append(v);

      } else if (sl.layout === 'piefigura') {
        const w1 = Math.round((bodyW - GAP) * 0.68);
        const c1 = h('div', { class: 'col pf-fig', 'data-col': '1', 'data-z': '0' }, bloquesDe(0, w1));
        const c2 = h('div', { class: 'col pf-pie', 'data-col': '2', 'data-z': '1' }, bloquesDe(1, bodyW - GAP - w1 - 26));
        const v1 = vacia(0, 'La figura'); const v2 = vacia(1, 'El pie, con aire');
        if (v1) c1.append(v1); if (v2) c2.append(v2);
        body.append(h('div', { class: 'cols piefigura' }, c1, c2));

      } else if (sl.layout === 'zigzag') {
        const w = Math.round((bodyW - GAP) / 2);
        const rej = h('div', { class: 'zigzag' });
        [[0, 1], [2, 3]].forEach((par, f) => {
          const fila = h('div', { class: 'cols zz-fila' + (f ? ' invertida' : '') });
          par.forEach((i, k) => fila.append(h('div', { class: 'col zz-' + ((f + k) % 2 === 0 ? 'fig' : 'txt'), 'data-col': String(i + 1), 'data-z': String(i) },
            bloquesDe(i, w), vacia(i, (f + k) % 2 === 0 ? 'Figura ' + (f + 1) : 'Texto ' + (f + 1)))));
          rej.append(fila);
        });
        body.append(rej);

      } else if (sl.layout === 'partida') {
        const mitad = h('div', { class: 'partida' });
        [0, 1].forEach(i => {
          const c = h('div', { class: 'pt-lado k' + i, 'data-col': String(i + 1) },
            h('div', Object.assign({ class: 'pt-tit' + emptyCls(zt(i)), html: inlineRich(zt(i)) }, ztEd(i))),
            h('div', { class: 'pt-cu', 'data-z': String(i) }, bloquesDe(i, Math.round(bodyW / 2) - 40)));
          const v = vacia(i, 'Mitad ' + (i + 1));
          if (v) c.querySelector('.pt-cu').append(v);
          mitad.append(c);
        });
        body.append(mitad);

      } else if (sl.layout === 'filas') {
        const rej = h('div', { class: 'filas' });
        [0, 1, 2].forEach(i => {
          const f = h('div', { class: 'fl-fila' },
            h('div', Object.assign({ class: 'fl-rot' + emptyCls(zt(i)), html: inlineRich(zt(i)) }, ztEd(i))),
            h('div', { class: 'fl-cu', 'data-z': String(i), 'data-col': String(i + 1) }, bloquesDe(i, Math.round(bodyW * 0.78))));
          const v = vacia(i, 'Fila ' + (i + 1));
          if (v) f.querySelector('.fl-cu').append(v);
          rej.append(f);
        });
        body.append(rej);

      } else if (sl.layout === 'rejilla6') {
        const w = Math.round((bodyW - GAP * 2) / 3);
        const rej = h('div', { class: 'rejilla6' });
        [0, 1, 2, 3, 4, 5].forEach(i => {
          const c = h('div', { class: 'celda', 'data-col': String(i + 1) },
            h('div', Object.assign({ class: 'celda-tit' + emptyCls(zt(i)), html: inlineRich(zt(i)) }, ztEd(i))),
            h('div', { class: 'celda-cu', 'data-z': String(i) }, bloquesDe(i, w - 30)));
          const v = vacia(i, 'Celda ' + (i + 1));
          if (v) c.querySelector('.celda-cu').append(v);
          rej.append(c);
        });
        body.append(rej);

      } else if (sl.layout === 'dato') {
        body.classList.add('v-center');
        const caja = h('div', { class: 'dato' },
          h('div', Object.assign({ class: 'dt-num' + emptyCls(zt(0)), html: inlineRich(zt(0)) }, ztEd(0))),
          h('div', Object.assign({ class: 'dt-rot' + emptyCls(zt(1)), html: inlineRich(zt(1)) }, ztEd(1))),
          h('div', { class: 'dt-cu', 'data-z': '0' }, bloquesDe(0, Math.round(bodyW * 0.7))));
        const v = vacia(0, 'De dónde sale la cifra, o una gráfica pequeña');
        if (v) caja.querySelector('.dt-cu').append(v);
        body.append(caja);

      } else if (sl.layout === 'cita') {
        body.classList.add('v-center');
        const caja = h('div', { class: 'cita-caja' },
          h('div', { class: 'ct-comilla', 'aria-hidden': 'true' }, '\u201C'),
          h('div', { class: 'ct-cu', 'data-z': '0' }, bloquesDe(0, Math.round(bodyW * 0.82))),
          h('div', Object.assign({ class: 'ct-autor' + emptyCls(zt(0)), html: inlineRich(zt(0)) }, ztEd(0))));
        const v = vacia(0, 'La cita: un texto, y nada más');
        if (v) caja.querySelector('.ct-cu').append(v);
        body.append(caja);

      } else if (sl.layout === 'cuadricula') {
        const w = Math.round((bodyW - GAP) / 2);
        const rej = h('div', { class: 'cuadricula' });
        [0, 1, 2, 3].forEach(i => {
          const c = h('div', { class: 'celda', 'data-col': String(i + 1) },
            h('div', Object.assign({ class: 'celda-tit' + emptyCls(zt(i)), html: inlineRich(zt(i)) }, ztEd(i))),
            h('div', { class: 'celda-cu', 'data-z': String(i) }, bloquesDe(i, w - 44)));
          const v = vacia(i, 'Celda ' + (i + 1));
          if (v) c.querySelector('.celda-cu').append(v);
          rej.append(c);
        });
        body.append(rej);

      } else {
        /* content y ancho */
        body.dataset.z = '0';
        body.append(...bloquesDe(0, bodyW));
        const v = vacia(0, 'Inserta bloques desde el panel derecho →');
        if (v) { v.style.width = '64%'; v.style.alignSelf = 'center'; body.append(v); }
      }
    }
    const pg = typeof pieGlosas === 'function' ? pieGlosas(sl, deck) : null;
    if (pg) body.append(pg);
    const lc = typeof lineaCitas === 'function' ? lineaCitas(sl, deck, mode) : null;
    if (lc) body.append(lc);
    frame.append(body);
    root.append(frame);
  }

  /* ---- pie ---- */
  const th = temaDe(deck);
  const cfgPie = pieDe(m);
  const esPortada = sl.layout === 'title', esSeccion = sl.layout === 'section';
  const conPie = (!esPortada && !esSeccion) || (esPortada && cfgPie.enPortada) || (esSeccion && cfgPie.enSecciones);
  const pageTxt = (typeof esRespaldo === 'function' && esRespaldo(sl))
    ? rotuloDiapositiva(deck, idx)
    : `${typeof rotuloDiapositiva === 'function' ? rotuloDiapositiva(deck, idx) : idx + 1} / ${typeof totalCharla === 'function' ? totalCharla(deck) : deck.slides.length}`;
  let barraPropia = false;
  if (cfgPie.modo === 'tema') {
    if (m.footline && conPie && th.foot === 'cells') {
      root.append(h('div', { class: 'footline' },
        h('div', { class: 'fl-cell' }, m.authors || ' '),
        h('div', { class: 'fl-cell' }, m.short || m.title || ' '),
        h('div', { class: 'fl-cell' }, m.date || '', m.numbers ? h('span', { class: 'fl-page' }, (m.date ? ' · ' : '') + pageTxt) : '')));
      barraPropia = true;
    } else if (m.footline && conPie && th.foot === 'simple') {
      root.append(h('div', { class: 'footline' },
        h('span', null, m.authors || ' '),
        h('span', null, m.short || m.title || ' '),
        h('span', { class: 'fl-page' }, m.numbers ? pageTxt : (m.date || ' '))));
      barraPropia = true;
    } else if (m.numbers && conPie) {
      root.append(h('div', { class: 'pagenum' }, pageTxt));
    }
  } else if (conPie) {
    const pe = renderPie(deck, idx, mode);
    if (pe) {
      root.append(pe);
      if (pe.classList.contains('footline')) {
        barraPropia = true;
        root.style.setProperty('--pieH', Math.round((TAM_PX[cfgPie.tam] || 13) * 1.25 + 17) + 'px');
      }
    }
  }
  if (barraPropia) root.classList.add('con-barra');
  if (conPie && !barraPropia && (m.pieTexto || '').trim()) root.append(h('div', { class: 'pie-nota' }, m.pieTexto));
  if (conPie && m.logo && m.logoPie) root.append(h('div', { class: 'pie-logo' }, logoEl('logo-img')));
  root.dataset.frags = fragN;
  return root;
}

function stepCount(deck, idx) {
  const sl = deck.slides[idx];
  let n = 0;
  for (const arr of CLAVES_ZONA.map(k => sl[k] || [])) for (const b of arr) {
    if (b.type === 'bullets' && b.step) n += (b.items || []).length;
    else if (b.step) n += 1;
  }
  return n;
}


