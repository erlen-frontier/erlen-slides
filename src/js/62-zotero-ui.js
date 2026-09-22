/* ==== 62-zotero-ui.js ==== */
'use strict';
/* ================= la ventana de Zotero ================= */

let ZOT_V = { col: '', colN: '', q: '', todo: false, sel: null, filas: [], mas: false, abiertas: null };
function zotReinicia() {
  ZOT_V = { col: '', colN: '', q: '', todo: false, sel: new Set(), filas: [], mas: false, abiertas: new Set() };
}

/* ---------- traer un archivo exportado ---------- */
/* Sirve en cualquier parte, también donde la página no puede salir a otro
   dominio: es solo texto que él pega o suelta encima. */
function zotCajaArchivo(alTerminar, plegada) {
  const aviso = h('p', { class: 'hint', style: 'margin:6px 0 0' });
  const area = h('textarea', { class: 'field field-mono', rows: 3,
    placeholder: 'Pega aquí lo exportado de Zotero: CSL JSON, BibTeX o RIS' });
  const mete = txt => {
    let refs;
    try { refs = refsDesdeTexto(txt); } catch (e) { aviso.textContent = e.message; aviso.className = 'hint err'; return; }
    if (!refs) { aviso.textContent = 'Eso es un DOI: tráelo desde el panel de Referencias.'; aviso.className = 'hint err'; return; }
    const res = zotIngresa(refs, false);
    aviso.className = 'hint';
    aviso.textContent = res.add + (res.add === 1 ? ' referencia añadida' : ' referencias añadidas') +
      (res.rep ? ' · ' + res.rep + ' ya estaban' : '') + '.';
    area.value = '';
    if (alTerminar) alTerminar(res);
  };
  const leeArchivo = f => {
    if (!f) return;
    const fr = new FileReader();
    fr.onload = () => mete(String(fr.result || ''));
    fr.onerror = () => { aviso.textContent = 'No se pudo leer ese archivo.'; aviso.className = 'hint err'; };
    fr.readAsText(f);
  };
  const entrada = h('input', { type: 'file', accept: '.json,.bib,.bibtex,.ris,.txt', style: 'display:none',
    onchange: e => { leeArchivo(e.target.files && e.target.files[0]); e.target.value = ''; } });
  const zona = h('div', { class: 'zot-suelta', tabindex: '0',
    onclick: () => entrada.click(),
    onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); entrada.click(); } },
    ondragover: e => { e.preventDefault(); zona.classList.add('encima'); },
    ondragleave: () => zona.classList.remove('encima'),
    ondrop: e => {
      e.preventDefault(); zona.classList.remove('encima');
      const dt = e.dataTransfer;
      if (dt.files && dt.files[0]) return leeArchivo(dt.files[0]);
      const t = dt.getData('text/plain');
      if (t) mete(t);
    } },
    h('b', null, '⇩ Suelta aquí el archivo'), h('span', null, ' o haz clic para buscarlo'), entrada);
  const dentro = h('div', null,
    h('p', { class: 'hint', style: 'margin:0 0 7px' },
      'En Zotero: clic derecho sobre la colección → Exportar colección… → formato CSL JSON (o BibTeX, o RIS). ' +
      'También puedes arrastrar los ítems directo desde Zotero si tienes la Copia rápida en uno de esos formatos.'),
    zona, area,
    h('div', { style: 'display:flex;gap:7px;margin-top:7px' },
      h('button', { class: 'btn btn-sm', onclick: () => mete(area.value) }, '↓ Traer lo pegado')),
    aviso);
  /* Con la conexión funcionando esto estorba: se deja plegado a un renglón. */
  if (plegada) {
    return h('details', { class: 'zot-arch' },
      h('summary', null, 'Traer un archivo exportado de Zotero (CSL JSON, BibTeX o RIS)'), dentro);
  }
  return h('div', { class: 'zot-arch' },
    h('div', { class: 'panel-label' }, 'Traer lo exportado de Zotero'), dentro);
}

/* ---------- alta de la conexión ---------- */
function zotPanelAlta(pinta) {
  const cfg = zotCfg();
  const caja = h('div');
  const aviso = h('p', { class: 'hint', style: 'margin:8px 0 0' });

  const via = v => { cfg.via = v; zotGuarda(cfg); pinta(); };
  caja.append(h('div', { class: 'zot-vias' },
    h('button', { class: 'btn btn-sm' + (cfg.via === 'web' ? ' btn-pri' : ''), onclick: () => via('web') }, '☁ Zotero en la nube'),
    h('button', { class: 'btn btn-sm' + (cfg.via === 'local' ? ' btn-pri' : ''), onclick: () => via('local') }, '▣ Zotero en esta computadora')));

  if (cfg.via === 'web') {
    const usuario = h('input', { class: 'field', value: cfg.usuario, inputmode: 'numeric',
      placeholder: 'p. ej. 1234567', oninput: e => { cfg.usuario = e.target.value.trim(); } });
    const clave = h('input', { class: 'field field-mono', type: 'password', value: cfg.clave,
      autocomplete: 'off', spellcheck: 'false', placeholder: 'la clave que acabas de crear',
      oninput: e => { cfg.clave = e.target.value.trim(); } });
    const ojo = h('button', { class: 'icon-btn', title: 'Ver la clave',
      onclick: () => { clave.type = clave.type === 'password' ? 'text' : 'password'; } }, '◎');
    const recordar = h('input', { type: 'checkbox', checked: cfg.recordar,
      onchange: e => { cfg.recordar = e.target.checked; } });
    caja.append(
      h('ol', { class: 'zot-pasos' },
        h('li', null, 'Abre ', h('a', { href: ZOT_CLAVES_URL + '/new', target: '_blank', rel: 'noopener noreferrer' }, 'zotero.org/settings/keys ↗'),
          ' y crea una clave nueva. Con ', h('b', null, '«Allow library access»'), ' de solo lectura basta; no necesita permiso de escritura.'),
        h('li', null, 'En esa misma página, arriba, viene tu número de usuario («Your userID for use in API calls»).'),
        h('li', null, 'Pégalos aquí:')),
      h('div', { class: 'irow' }, h('label', null, 'Número de usuario'), h('div', { style: 'flex:1.6' }, usuario)),
      h('div', { class: 'irow' }, h('label', null, 'Clave de API'),
        h('div', { style: 'flex:1.6;display:flex;gap:5px' }, clave, ojo)),
      h('label', { class: 'check' }, recordar, 'Recordarla en este navegador'),
      h('p', { class: 'hint' }, 'La clave se queda en tu navegador y solo viaja a api.zotero.org. ' +
        'No pasa por el asistente ni se guarda dentro de la presentación, así que el .json y el .tex que compartas no la llevan.'));
  } else {
    caja.append(
      h('ol', { class: 'zot-pasos' },
        h('li', null, 'Ten Zotero abierto en esta computadora.'),
        h('li', null, 'En Zotero: ', h('b', null, 'Configuración → Avanzado'), ' → activa ',
          h('b', null, '«Allow other applications on this computer to communicate with Zotero»'), '.'),
        h('li', null, 'Listo: no pide clave y funciona sin internet.')),
      h('p', { class: 'hint' }, 'Lee tu biblioteca local en ' + ZOT_LOCAL + '. Es de solo lectura y no sale de tu máquina.'));
  }

  const conectar = async () => {
    aviso.className = 'hint'; aviso.textContent = 'Probando la conexión…';
    zotGuarda(cfg);
    try {
      const r = await zotPide('/items/top', { limit: 1, format: 'json', include: 'data' });
      const n = r.total === null ? null : r.total;
      aviso.textContent = 'Conectado' + (n === null ? '.' : ' · ' + n + ' referencias en tu biblioteca.');
      zotReinicia();
      pinta();
    } catch (e) {
      aviso.className = 'hint err';
      aviso.textContent = e.message;
    }
  };
  caja.append(h('div', { style: 'display:flex;gap:7px;flex-wrap:wrap;margin-top:9px' },
    h('button', { class: 'btn btn-pri btn-sm', onclick: conectar }, '⇄ Probar y conectar'),
    h('button', { class: 'btn btn-sm', onclick: () => { zotOlvida(); zotReinicia(); pinta(); } }, 'Olvidar la clave')), aviso);
  return caja;
}

/* ---------- el árbol de colecciones ---------- */
function zotArbol(nodos, alElegirCol, alAbrir, nivel) {
  const cont = h('div');
  (nodos || []).forEach(n => {
    const abierta = ZOT_V.abiertas.has(n.key);
    const fila = h('div', { class: 'zot-col' + (ZOT_V.col === n.key ? ' on' : ''), style: 'padding-left:' + (6 + (nivel || 0) * 13) + 'px' },
      n.hijos.length
        ? h('button', { class: 'zot-tri', title: abierta ? 'Cerrar' : 'Abrir', 'aria-expanded': abierta ? 'true' : 'false',
            onclick: e => { e.stopPropagation(); if (abierta) ZOT_V.abiertas.delete(n.key); else ZOT_V.abiertas.add(n.key); alAbrir(); } }, abierta ? '▾' : '▸')
        : h('span', { class: 'zot-tri' }, ''),
      h('button', { class: 'zot-colb', onclick: () => alElegirCol(n) },
        h('span', { class: 'zot-coln' }, n.n),
        n.nItems === null ? '' : h('span', { class: 'zot-cont' }, String(n.nItems))));
    cont.append(fila);
    if (abierta && n.hijos.length) cont.append(zotArbol(n.hijos, alElegirCol, alAbrir, (nivel || 0) + 1));
  });
  return cont;
}

/* ---------- la ventana ---------- */
function openZotero(alElegir) {
  if (!ZOT_V.sel) zotReinicia();
  const cuerpo = h('div', { class: 'zot-raiz' });

  const pinta = (recargar) => {
    cuerpo.innerHTML = '';
    if (!zotListo() || ZOT_V.alta) {
      cuerpo.append(zotPanelAlta(() => { ZOT_V.alta = false; pinta(true); }), zotCajaArchivo(() => {}));
      return;
    }
    cuerpo.append(zotBiblioteca(pinta, recargar, alElegir));
  };

  pinta(true);
  openModal({ title: 'Zotero', size: 'modal-lg', body: cuerpo,
    foot: [h('button', { class: 'btn', onclick: () => closeModal() }, 'Cerrar')] });
}

function zotBiblioteca(pinta, recargar, alElegir) {
  const cfg = zotCfg();
  const caja = h('div');
  const lista = h('div', { class: 'zot-lista' });
  const arbol = h('div', { class: 'zot-arbol' });
  const pieN = h('span', { class: 'zot-cuenta' });
  const aviso = h('p', { class: 'hint', style: 'margin:7px 0 0' });

  /* --- barra de arriba --- */
  const busca = h('input', { class: 'field', value: ZOT_V.q, placeholder: 'Buscar por título, autor o año…',
    oninput: e => { ZOT_V.q = e.target.value; retrasa(); } });
  let reloj = null;
  const retrasa = () => { clearTimeout(reloj); reloj = setTimeout(() => cargaItems(), 350); };
  const enTodo = h('input', { type: 'checkbox', checked: ZOT_V.todo,
    onchange: e => { ZOT_V.todo = e.target.checked; cargaItems(); } });
  caja.append(h('div', { class: 'zot-barra' },
    busca,
    h('label', { class: 'check', title: 'Busca también dentro de las notas y los textos completos' }, enTodo, 'En todo'),
    h('button', { class: 'icon-btn', title: 'Volver a preguntarle a Zotero',
      onclick: () => { ZOT_CACHE = { cols: null, sello: '' }; pinta(true); } }, '⟳'),
    h('button', { class: 'btn btn-sm', title: 'Cambiar la clave o la vía',
      onclick: () => { ZOT_V.alta = true; pinta(true); } }, '⚙ Conexión')));

  caja.append(h('div', { class: 'zot-cols' }, arbol, lista));

  /* --- pie --- */
  const agrega = (citar) => {
    const elegidas = ZOT_V.filas.filter(f => ZOT_V.sel.has(f.r.zot || f.r.id)).map(f => f.r);
    if (!elegidas.length) { aviso.className = 'hint err'; aviso.textContent = 'No has marcado ninguna.'; return; }
    /* Cada una entra con su propio identificador, no con el del listado. */
    const copias = elegidas.map(r => Object.assign({}, r, { id: uid() }));
    const res = zotIngresa(copias, citar);
    ZOT_V.sel.clear();
    aviso.className = 'hint';
    aviso.textContent = res.add + (res.add === 1 ? ' referencia añadida' : ' referencias añadidas') +
      (res.rep ? ' · ' + res.rep + ' ya estaban en la presentación' : '') +
      (citar ? ' y citadas en esta diapositiva.' : '.');
    toast(res.add ? 'Zotero: ' + res.add + (res.add === 1 ? ' referencia' : ' referencias') : 'Ya las tenías todas');
    if (alElegir && res.ids.length) alElegir(res.ids[0]);
    pintaLista();
    ponCuenta();
  };
  const bAgr = h('button', { class: 'btn btn-pri btn-sm', onclick: () => agrega(false) }, '+ Agregar');
  const bCit = h('button', { class: 'btn btn-sm', onclick: () => agrega(true) }, '+ Agregar y citar aquí');
  const bAct = h('button', { class: 'btn btn-sm', title: 'Vuelve a pedirle a Zotero los datos de las referencias que salieron de ahí',
    onclick: async () => {
      aviso.className = 'hint'; aviso.textContent = 'Preguntando a Zotero…';
      try {
        const r = await zotRefresca(cfg);
        aviso.textContent = r.tocadas ? 'Actualicé ' + r.tocadas + ' de ' + r.revisadas + '.'
          : 'Las ' + r.revisadas + ' que vinieron de Zotero ya estaban al día.';
      } catch (e) { aviso.className = 'hint err'; aviso.textContent = e.message; }
    } }, '⟳ Actualizar las que ya tengo');
  caja.append(h('div', { class: 'zot-pie' }, pieN, h('span', { style: 'flex:1' }), bAct, bCit, bAgr), aviso);
  caja.append(zotCajaArchivo(() => { pintaLista(); }, true));

  const ponCuenta = () => {
    const n = ZOT_V.sel.size;
    pieN.textContent = n ? n + (n === 1 ? ' marcada' : ' marcadas') : 'Marca las que quieras traer';
    bAgr.disabled = bCit.disabled = !n;
  };

  /* --- la lista --- */
  const pintaLista = () => {
    lista.innerHTML = '';
    const tengo = indiceRefs(S.deck);
    if (!ZOT_V.filas.length) {
      lista.append(h('p', { class: 'hint', style: 'padding:14px' },
        ZOT_V.q ? 'Nada con «' + ZOT_V.q + '» por aquí.' : 'Esta colección no tiene referencias.'));
      return;
    }
    ZOT_V.filas.forEach(f => {
      const llave = f.r.zot || f.r.id;
      const puesta = !!refYaEsta(f.r, tengo);
      const cb = h('input', { type: 'checkbox', checked: ZOT_V.sel.has(llave),
        onchange: e => { if (e.target.checked) ZOT_V.sel.add(llave); else ZOT_V.sel.delete(llave); ponCuenta(); } });
      lista.append(h('label', { class: 'zot-fila' + (puesta ? ' puesta' : '') },
        cb,
        h('div', { class: 'zot-txt' },
          h('b', null, citaCorta(f.r) || f.r.titulo || '(sin datos)'),
          h('em', null, f.r.titulo || '')),
        h('span', { class: 'zot-tipo' }, puesta ? 'ya está' : f.tipo)));
    });
    if (ZOT_V.mas) lista.append(h('p', { class: 'hint', style: 'padding:8px 12px' },
      'Se muestran las 200 más recientes. Afina con el buscador o entra a una colección.'));
  };

  const cargaItems = async () => {
    lista.innerHTML = '';
    lista.append(h('p', { class: 'hint', style: 'padding:14px' }, 'Preguntando a Zotero…'));
    try {
      const r = await zotItems({ col: ZOT_V.col, q: ZOT_V.q.trim(), todo: ZOT_V.todo }, cfg);
      ZOT_V.filas = r.lista; ZOT_V.mas = r.mas;
      pintaLista();
    } catch (e) {
      ZOT_V.filas = []; ZOT_V.mas = false;
      lista.innerHTML = '';
      lista.append(h('div', { class: 'zot-mal' }, h('b', null, '⚠ ' + e.message),
        e.tipo === 'red' || e.tipo === 'permiso'
          ? h('button', { class: 'btn btn-sm', style: 'margin-top:8px',
              onclick: () => { zotOlvida(); zotReinicia(); pinta(true); } }, 'Cambiar la conexión')
          : ''));
    }
    ponCuenta();
  };

  let RAIZ = null;
  const eligeCol = n => { ZOT_V.col = n ? n.key : ''; ZOT_V.colN = n ? n.n : ''; ZOT_V.sel.clear(); dibujaArbol(); cargaItems(); };
  const dibujaArbol = () => {
    arbol.innerHTML = '';
    arbol.append(h('button', { class: 'zot-col zot-todo' + (ZOT_V.col ? '' : ' on'),
      onclick: () => eligeCol(null) }, '⌂ Toda la biblioteca'));
    if (RAIZ === null) { arbol.append(h('p', { class: 'hint', style: 'padding:8px' }, 'Cargando…')); return; }
    if (RAIZ instanceof Error) { arbol.append(h('p', { class: 'hint err', style: 'padding:8px' }, RAIZ.message)); return; }
    if (!RAIZ.length) { arbol.append(h('p', { class: 'hint', style: 'padding:8px' }, 'Sin colecciones.')); return; }
    arbol.append(zotArbol(RAIZ, eligeCol, dibujaArbol, 0));
  };
  const cargaCols = async () => {
    dibujaArbol();
    try { RAIZ = await zotColecciones(cfg); } catch (e) { RAIZ = e; }
    dibujaArbol();
  };

  ponCuenta();
  if (recargar !== false) { cargaCols(); cargaItems(); }
  return caja;
}


