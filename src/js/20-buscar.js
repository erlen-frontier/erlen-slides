/* ==== 20-buscar.js ==== */
'use strict';
/* ================= buscar y reemplazar · paleta de comandos ================= */

/* Todos los textos editables del mazo, con cómo leerlos y escribirlos. */
function camposTexto(deck) {
  const out = [];
  const add = (i, et, get, set) => out.push({ i, et, get, set });
  const M = deck.meta;
  [['title', 'Título'], ['subtitle', 'Subtítulo'], ['authors', 'Autores'], ['institute', 'Institución'],
   ['date', 'Fecha'], ['short', 'Título corto'], ['pieTexto', 'Leyenda del pie']].forEach(([k, et]) =>
    add(0, 'Portada · ' + et, () => M[k] || '', v => M[k] = v));
  deck.slides.forEach((sl, i) => {
    add(i, 'Título', () => sl.title || '', v => sl.title = v);
    add(i, 'Subtítulo', () => sl.subtitle || '', v => sl.subtitle = v);
    add(i, 'Notas', () => sl.notes || '', v => sl.notes = v);
    (sl.zt || []).forEach((_, z) => add(i, 'Encabezado ' + (z + 1), () => (sl.zt || [])[z] || '', v => { sl.zt = sl.zt || []; sl.zt[z] = v; }));
    zonas(sl).forEach(arr => arr.forEach(b => {
      const nom = (BLOCK_DEFS.find(x => x.id === b.type) || {}).name || b.type;
      if (b.type === 'bullets') (b.items || []).forEach((it, k) => add(i, nom, () => it.t || '', v => it.t = v));
      else if (b.type === 'table') (b.rows || []).forEach((r, ri) => r.forEach((_, ci) => add(i, nom, () => b.rows[ri][ci] || '', v => b.rows[ri][ci] = v)));
      else if (b.type === 'bblock') { add(i, nom, () => b.btitle || '', v => b.btitle = v); add(i, nom, () => b.body || '', v => b.body = v); }
      else if (b.type === 'quote') { add(i, nom, () => b.text || '', v => b.text = v); add(i, nom, () => b.by || '', v => b.by = v); }
      else if (b.text != null || b.type === 'text' || b.type === 'code') add(i, nom, () => b.text || '', v => b.text = v);
      if (b.type === 'teorema') { add(i, nom, () => b.titulo || '', v => b.titulo = v); }
      if (b.caption != null || ['image', 'chart', 'func', 'video', 'smart', 'table', 'estruct', 'montaje', 'geo'].indexOf(b.type) >= 0)
        add(i, nom + ' · pie', () => b.caption || '', v => b.caption = v);
      if (b.type === 'smart') (b.items || []).forEach(it => {
        add(i, nom, () => it.t || '', v => it.t = v);
        add(i, nom, () => it.d || '', v => it.d = v);
      });
    }));
  });
  return out;
}
const sinAcentos = x => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function buscaEn(deck, q, opts) {
  opts = opts || {};
  const res = [];
  if (!q) return res;
  const norm = t => opts.caso ? String(t) : sinAcentos(t);
  const aguja = norm(q);
  camposTexto(deck).forEach(c => {
    const txt = c.get();
    if (!txt) return;
    const hay = norm(txt);
    let p = hay.indexOf(aguja), n = 0;
    while (p >= 0) {
      n++;
      if (n === 1) res.push({ campo: c, i: c.i, et: c.et, ctx: contexto(txt, p, q.length), n: 0 });
      p = hay.indexOf(aguja, p + aguja.length);
    }
    if (n) res[res.length - 1].n = n;
  });
  return res;
}
function contexto(txt, p, len) {
  const a = Math.max(0, p - 26), b = Math.min(txt.length, p + len + 30);
  return { antes: (a ? '…' : '') + txt.slice(a, p), coincide: txt.slice(p, p + len), despues: txt.slice(p + len, b) + (b < txt.length ? '…' : '') };
}
function reemplazaTodo(deck, q, por, opts) {
  opts = opts || {};
  let n = 0;
  const norm = t => opts.caso ? String(t) : sinAcentos(t);
  const aguja = norm(q);
  if (!aguja) return 0;
  camposTexto(deck).forEach(c => {
    const txt = c.get();
    if (!txt) return;
    const hay = norm(txt);
    let out = '', p = 0, k = hay.indexOf(aguja);
    while (k >= 0) { out += txt.slice(p, k) + por; p = k + q.length; n++; k = hay.indexOf(aguja, p); }
    if (n && p) { out += txt.slice(p); c.set(out); }
  });
  return n;
}

function openBuscar(inicial) {
  let opts = { caso: false };
  const campoQ = h('input', { class: 'field', placeholder: 'Buscar en toda la presentación…', value: inicial || '' });
  const campoR = h('input', { class: 'field', placeholder: 'Reemplazar por…' });
  const lista = h('div', { class: 'bu-lista' });
  const resumen = h('span', { class: 'foot-note' });
  const pinta = () => {
    const q = campoQ.value.trim();
    lista.innerHTML = '';
    const r = buscaEn(S.deck, q, opts);
    const total = r.reduce((a, x) => a + x.n, 0);
    resumen.textContent = !q ? 'Escribe para buscar en títulos, viñetas, tablas, cajas, pies de figura y notas.'
      : total ? `${total} ${total === 1 ? 'coincidencia' : 'coincidencias'} en ${new Set(r.map(x => x.i)).size} diapositivas`
      : 'Sin coincidencias';
    if (!q || !r.length) return;
    let ultima = -1;
    r.forEach(x => {
      if (x.i !== ultima) {
        ultima = x.i;
        const sl = S.deck.slides[x.i];
        lista.append(h('div', { class: 'bu-cab' }, `${x.i + 1} · ${(sl.title || '').trim() || (LAY[sl.layout] || {}).name || ''}`));
      }
      lista.append(h('button', { class: 'bu-fila', onclick: () => { closeModal(); S.cur = x.i; S.selBlock = null; renderAll(); } },
        h('span', { class: 'bu-et' }, x.et),
        h('span', { class: 'bu-tx' }, x.ctx.antes, h('mark', null, x.ctx.coincide), x.ctx.despues),
        x.n > 1 ? h('span', { class: 'bu-n' }, '×' + x.n) : null));
    });
  };
  campoQ.addEventListener('input', deb(pinta, 160));
  const caja = h('label', { class: 'check' }, h('input', { type: 'checkbox', onchange: e => { opts.caso = e.target.checked; pinta(); } }), 'Distinguir mayúsculas y acentos');
  const cuerpo = h('div', null, campoQ, h('div', { style: 'height:8px' }), campoR, caja, lista);
  openModal({
    title: 'Buscar y reemplazar', size: 'modal-lg', body: cuerpo,
    foot: [resumen,
      h('button', { class: 'btn', onclick: () => {
        const q = campoQ.value.trim();
        if (!q) { toast('Escribe qué buscar'); return; }
        const n = reemplazaTodo(S.deck, q, campoR.value, opts);
        if (!n) { toast('No hubo coincidencias'); return; }
        commit();
        toast(n + (n === 1 ? ' reemplazo hecho' : ' reemplazos hechos'), null, { t: 'Deshacer', fn: doUndo });
        pinta();
      } }, 'Reemplazar todo'),
      h('button', { class: 'btn btn-pri', onclick: closeModal }, 'Cerrar')]
  });
  pinta();
  setTimeout(() => { campoQ.focus(); campoQ.select(); }, 40);
}

/* ---------- paleta de comandos ---------- */
function comandos() {
  const c = [];
  const a = (n, sub, fn, grupo) => c.push({ n, sub, fn, grupo: grupo || 'Acciones' });
  a('Nueva presentación…', 'plantillas', openPlantillas);
  a('Diapositivas desde un esquema…', 'pegar un índice', openEsquema);
  a('Mis presentaciones…', null, openDecks);
  a('Guardar como…', 'Ctrl+S', saveDeckAs);
  a('Buscar y reemplazar…', 'Ctrl+F', () => openBuscar());
  a('Ver todas las diapositivas', 'Ctrl+G', alternaClasificador);
  a('Pendientes de la presentación…', 'F8', openPendientes);
  a('Anotar un pendiente aquí', null, () => nuevoPendiente(S.cur));
  a('Modo concentración', 'F9', () => alternaConcentracion());
  a('Bitácora del documento…', 'historial por días', openBitacora);
  a('Ver el código de esta diapositiva', 'F7', () => alternaCodigo(true));
  a('Revisar antes de presentar…', 'desbordes, contraste, figuras', openRevision);
  a('Simulacro de sala…', 'proyector, distancia, daltonismo', openSala);
  a('Ideas de diseño para la figura…', 'propone acomodos según la imagen', () => abreDisenador());
  a('Insertar galería de figuras', '(a) (b) (c) con un pie común', () => addBlockToSlide('galeria', S.insCol || 1));
  a('Insertar estructura química', 'editor tipo ChemDraw', () => { const b = nuevoBloqueEn('estruct', {}); if (b) { commit(); openEstructura(b); } });
  a('Insertar montaje experimental', 'vidrio, equipo, biología, circuitos', () => { const b = nuevoBloqueEn('montaje', {}); if (b) { b.mont = montajeEjemplo(); commit(); openMontaje(b); } });
  a('Insertar teorema o demostración', 'entornos de AMS', () => { const b = nuevoBloqueEn('teorema', {}); if (b) { commit(); openTeorema(b); } });
  a('Insertar figura geométrica', 'triángulo, círculo, integral, vectores', () => { const b = nuevoBloqueEn('geo', {}); if (b) { b.geo = geoPorOmision('triangulo'); commit(); openGeometria(b); } });
  a('Comprobar el archivo final…', 'resolución, fuentes, páginas', openComprobacion);
  a('Kit de defensa (.zip)', 'todo lo del día de la presentación', kitDefensa);
  a('Presentar', 'F5', () => startPresent(false));
  a('Presentar desde esta diapositiva', 'Mayús+F5', () => startPresent(true));
  a('Presentar con vista de presentador', 'P al presentar', () => { startPresent(false); alternaPresentador(); });
  a('Ajustar la charla a un tiempo…', 'te dan 12 minutos y tienes 45', openAjustarTiempo);
  a('Referencias…', 'DOI o BibTeX, citas y bibliografía', () => openReferencias());
  a('Zotero…', 'Traer referencias de tu biblioteca de Zotero', () => openZotero());
  a('Vista de argumento', 'La charla como cadena de afirmaciones con su evidencia · Ctrl+Shift+A', alternaArgumento);
  a('Cuéntamelo primero…', 'Habla o pega lo que dirías; las afirmaciones se vuelven diapositivas', openCuentamelo);
  a('Las preguntas que te van a hacer…', 'Propuestas por lo que hay en tus diapositivas, con respaldo', openPreguntas);
  a('Lo que aprendiste de tus charlas…', 'Qué confunde de manera consistente', openAprendizaje);
  a('Niveles y glosario…', 'Comité, congreso o divulgación; términos en una frase', openGlosas);
  NIVELES.forEach(x => a('Nivel: ' + x.n, x.d, () => ponNivel(x.id)));
  a('Ramas de la charla…', 'La del comité, la de diez minutos: la misma charla', openRamas);
  a('Sacar o meter esta diapositiva en la rama', 'Alterna en la rama activa', () => alternaEnRama(S.cur));
  a('Tu memoria de diapositivas…', 'Buscar en todas tus charlas y traer la diapositiva', () => openMemoria());
  a('La charla en el tiempo', 'Línea de tiempo con ancho por minutos · Ctrl+Shift+T', alternaLineaTiempo);
  a('Accesibilidad…', 'Paleta segura, texto alterno, contraste, MathML', openAccesibilidad);
  a('Esqueleto de artículo (.tex)', 'Afirmaciones → secciones, notas → prosa', exportArticulo);
  LAYOUTS.filter(l => l.z > 0).forEach(l => a('Acomodo: ' + l.name, l.d, () => changeLayout(curSlide(), l.id)));
  { const f = S.selBlock && findBlock(S.selBlock);
    if (f && f.block.type === 'smart') SMART_ACABADOS.forEach(x => a('Acabado del diagrama: ' + x.n, x.d, () => { f.block.acab = x.id; commit(); })); }
  a('Empezar por el argumento', 'Charla nueva con el lienzo cerrado hasta que el argumento se sostenga', empiezaPorElArgumento);
  a('Carga cognitiva…', 'Redundancia, atención dividida y señalización, con el arreglo', openCarga);
  a('Recorrido del ojo', 'Dónde cae primero la mirada en esta diapositiva · Ctrl+Shift+M', alternaMirada);
  a('Tutor de diseño…', 'Las reglas que te explica y las que ya son tuyas', openTutor);
  { const f = S.selBlock && findBlock(S.selBlock);
    if (f && f.block.type === 'chart') { a('Revelar la gráfica por capas', 'Ejes → series → ajuste → el punto que importa', () => { f.block.capas = true; commit(); });
      a('Paquete reproducible de la figura', 'CSV + pgfplots + PNG', () => paqueteFigura(f.block)); }
    if (f && f.block.type === 'math') a('Mostrar la ecuación paso a paso', 'Derivación guiada con lo que cambia resaltado', () => openDerivacion(f.block));
    if (f && (f.block.type === 'chart' || f.block.type === 'image')) a('Antes y después', 'Un segundo estado de la figura como paso', () => { f.block.despues = f.block.type === 'chart' ? { data: f.block.data || '' } : { src: '' }; commit(); S.tab = 'bloque'; renderInspector(); }); }
  ESTILOS_CITA.forEach(e => a('Estilo de cita: ' + e.n + '  ' + e.ej, e.d,
    () => { S.deck.meta.citEstilo = e.id; invalidaCitas(); commit(); }));
  a('Guardar esta diapositiva como respaldo', 'apéndice para preguntas', () => alternaRespaldo(S.cur));
  a('Ensayar con cronómetro', 'mide tu tiempo real por diapositiva', presentaEnsayo);
  a('Exportar a PDF', null, openPdfHelp);
  a('Ver el código Beamer', null, openTexView);
  a('Exportar a PowerPoint', '.pptx', exportPPTX);
  a('Folleto para repartir…', '2, 3 o 6 por hoja', openFolleto);
  a('Guardar en un archivo del disco…', null, eligeArchivo);
  a('Guion del orador', null, exportGuion);
  a('Descargar el proyecto .json', null, () => exportJSON());
  a('Configurar el pie de página…', null, openPieEditor);
  a('Editor de notas…', null, () => openNotasEditor(S.cur));
  a('Todas las notas de corrido…', 'escribir el guion de una sentada', () => openNotasEditor(S.cur, 'todas'));
  a('Estilos…', null, openEstilos);
  a('Asistente…', 'Ctrl+J · pídele las cosas con tus palabras', () => alternaAsistente());
  a('Herramientas arriba (cinta)', 'la disposición de fábrica · Ctrl+Shift+B', () => ponDisposicion('arriba'));
  a('Herramientas en el panel de la derecha', 'siempre a la vista · Ctrl+Shift+B', () => ponDisposicion('lado'));
  a('Ayuda y atajos', null, openHelp);
  a('Apariencia clara', null, () => cambiaTemaApp('claro'));
  a('Apariencia oscura', null, () => cambiaTemaApp('oscuro'));
  a('Apariencia del sistema', null, () => cambiaTemaApp('auto'));
  LAYOUTS.forEach(l => c.push({ n: 'Nueva diapositiva · ' + l.name, sub: l.d, grupo: 'Insertar', fn: () => addSlide(l.id) }));
  BLOCK_DEFS.forEach(b => c.push({ n: 'Insertar ' + b.name.toLowerCase(), grupo: 'Insertar', fn: () => addBlockToSlide(b.id, S.insCol || 1) }));
  Object.keys(THEMES).forEach(id => c.push({ n: 'Tema · ' + THEMES[id].name, sub: THEMES[id].desc, grupo: 'Diseño', fn: () => { S.deck.meta.theme = id; commit(); } }));
  FUENTES.filter(f => f.id !== 'auto').forEach(f => c.push({ n: 'Tipografía · ' + f.n, sub: f.esp, grupo: 'Diseño', fn: () => { S.deck.meta.fuente = f.id; commit(); } }));
  TRANS.forEach(t => c.push({ n: 'Transición · ' + t.n, sub: t.d, grupo: 'Diseño', fn: () => { S.deck.meta.trans = t.id; commit(); } }));
  return c;
}
/* Coincidencia laxa: todas las palabras, sin acentos y en cualquier orden. */
function casa(texto, q) {
  const t = sinAcentos(texto);
  return sinAcentos(q).split(/\s+/).filter(Boolean).every(w => t.indexOf(w) >= 0);
}
function openPaleta() {
  const inp = h('input', { class: 'field cp-inp', placeholder: 'Escribe una acción o parte del texto de una diapositiva…', autocomplete: 'off' });
  const lista = h('div', { class: 'cp-lista' });
  let items = [], sel = 0;
  const pinta = () => {
    const q = inp.value.trim();
    items = [];
    const cmds = comandos();
    if (q) {
      S.deck.slides.forEach((sl, i) => {
        const txt = [sl.title, sl.subtitle, ...(sl.zt || []),
          ...zonas(sl).flat().map(b => [b.text, b.btitle, b.body, b.caption, (b.items || []).map(x => x.t || x).join(' ')].join(' '))].join(' ');
        if (casa((i + 1) + ' ' + txt, q)) items.push({ n: `${i + 1} · ${(sl.title || '').trim() || (LAY[sl.layout] || {}).name}`, sub: (LAY[sl.layout] || {}).name, grupo: 'Ir a', fn: () => { S.cur = i; S.selBlock = null; renderAll(); } });
      });
      items = items.slice(0, 8).concat(cmds.filter(c => casa(c.n + ' ' + (c.sub || ''), q)).slice(0, 18));
    } else {
      items = cmds.filter(c => c.grupo === 'Acciones').slice(0, 10);
    }
    sel = clamp(sel, 0, Math.max(0, items.length - 1));
    lista.innerHTML = '';
    let grupo = null;
    items.forEach((it, k) => {
      if (it.grupo !== grupo) { grupo = it.grupo; lista.append(h('div', { class: 'cp-grupo' }, grupo)); }
      lista.append(h('button', { class: 'cp-fila' + (k === sel ? ' on' : ''), onmouseenter: () => { sel = k; marca(); },
        onclick: () => { closeModal(); it.fn(); } },
        h('span', { class: 'cp-n' }, it.n), it.sub ? h('span', { class: 'cp-s' }, it.sub) : null));
    });
    if (!items.length) lista.append(h('div', { class: 'cp-vacio' }, 'Nada coincide con «' + inp.value + '»'));
  };
  const marca = () => {
    const fs = $$('.cp-fila', lista);
    fs.forEach((e, k) => e.classList.toggle('on', k === sel));
    if (fs[sel]) fs[sel].scrollIntoView({ block: 'nearest' });
  };
  inp.addEventListener('input', () => { sel = 0; pinta(); });
  inp.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, items.length - 1); marca(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); marca(); }
    else if (e.key === 'Enter') { e.preventDefault(); const it = items[sel]; if (it) { closeModal(); it.fn(); } }
  });
  openModal({ title: 'Ir a / hacer', size: 'modal-sm', body: h('div', { class: 'cp-caja' }, inp, lista),
    foot: [h('span', { class: 'foot-note' }, '↑ ↓ para moverte · Enter para ejecutar · Esc para cerrar')] });
  pinta();
  setTimeout(() => inp.focus(), 40);
}


