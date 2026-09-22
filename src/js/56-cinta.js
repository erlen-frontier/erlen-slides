/* ==== 56-cinta.js ==== */
'use strict';
/* ================= la cinta de arriba =================
   La otra manera de tener las herramientas: en vez del panel de la derecha,
   una cinta con pestañas arriba, como en PowerPoint. No duplica la lógica:
   los botones llaman a las mismas funciones y los controles de formulario
   —los que necesitan un deslizador o un color— se abren en una hojita, que es
   lo que hace PowerPoint con la flecha de la esquina de cada grupo. */

const SITIOS_BARRA = [
  { id: 'lado', n: 'Panel a la derecha', d: 'Las propiedades viven en un panel lateral que no tapa nada. Es lo que trae Erlen de fábrica.' },
  { id: 'arriba', n: 'Cinta arriba', d: 'Pestañas y botones en una cinta superior, como en PowerPoint. Deja más ancho para la diapositiva.' }
];
const enCinta = () => (S.prefs && S.prefs.barras) === 'arriba';

/* ---------- piezas de la cinta ---------- */
function cintaGrupo(nombre, ...items) {
  return { nombre, items: items.filter(Boolean) };
}
const bg = (ic, et, fn, tit) => ({ k: 'bg', ic, et, fn, tit });
const sm = (ic, et, fn, tit) => ({ k: 'sm', ic, et, fn, tit });
const mn = (ic, et, arma, tit) => ({ k: 'mn', ic, et, arma, tit });
const pop = (ic, et, arma, tit) => ({ k: 'pop', ic, et, arma, tit });
const sep = () => ({ k: 'sep' });

/* Abre una hojita con contenido de formulario, anclada al botón. */
function abreHoja(nodo, ancla, titulo) {
  const caja = h('div', { class: 'menu cinta-hoja' });
  if (titulo) caja.append(h('div', { class: 'cinta-hoja-t' }, titulo));
  const cuerpo = h('div', { class: 'cinta-hoja-c' }, nodo);
  const vivo = deb(() => { renderCanvas(); commit({ skipInsp: true }); }, 200);
  cuerpo.addEventListener('input', vivo);
  cuerpo.addEventListener('change', vivo);
  cuerpo.addEventListener('click', e => { if (e.target.closest('.seg button, label.check')) vivo(); });
  caja.append(cuerpo);
  showMenu(caja, ancla);
}
function menuDe(lista) {
  const m = h('div', { class: 'menu' });
  lista.forEach(x => {
    if (!x) return;
    if (x.sep) { m.append(h('div', { class: 'menu-sep' })); return; }
    m.append(h('button', { title: x.d || '', onclick: () => { closeMenus(); x.fn(); } },
      h('span', { class: 'mi' }, x.ic || '·'), h('span', null, x.n), x.d ? h('em', null, x.d) : null));
  });
  return m;
}

/* ---------- el contenido de cada pestaña ---------- */
function cintaPestanas() {
  const hayBloque = !!(S.selBlock && findBlock(S.selBlock));
  const P = [
    { id: 'inicio', n: 'Inicio' },
    { id: 'insertar', n: 'Insertar' },
    { id: 'diseno', n: 'Diseño' },
    { id: 'diapo', n: 'Diapositiva' },
    { id: 'presentar', n: 'Presentar' }
  ];
  if (hayBloque) P.splice(4, 0, { id: 'bloque', n: 'Bloque', acento: true });
  return P;
}

function cintaContenido(tab) {
  const sl = curSlide();
  const f = S.selBlock && findBlock(S.selBlock);
  const b = f && f.block;

  if (tab === 'inicio') return [
    cintaGrupo('Deshacer',
      sm('⟲', 'Deshacer', doUndo, 'Ctrl+Z'),
      sm('⟳', 'Rehacer', doRedo, 'Ctrl+Shift+Z')),
    cintaGrupo('Diapositivas',
      mn('＋', 'Nueva', () => menuDe(LAYOUTS.map(l => ({ ic: '▭', n: l.name, d: l.d, fn: () => addSlide(l.id) }))), 'Nueva diapositiva con el diseño que elijas'),
      mn('▤', 'Acomodo', () => menuDe(LAYOUTS.map(l => ({ ic: sl.layout === l.id ? '●' : '▭', n: l.name, d: l.d, fn: () => changeLayout(curSlide(), l.id) }))), 'Cambiar el acomodo de esta diapositiva'),
      sm('⧉', 'Duplicar', () => dupSlide(S.cur), 'Ctrl+D'),
      sm('✕', 'Quitar', () => delSlide(S.cur), 'Eliminar esta diapositiva')),
    cintaGrupo('Contenido',
      bg('T', 'Texto', () => addBlockToSlide('text', S.insCol || 1)),
      bg('≔', 'Viñetas', () => addBlockToSlide('bullets', S.insCol || 1)),
      bg('▣', 'Figura', () => addBlockToSlide('image', S.insCol || 1)),
      bg('∑', 'Ecuación', () => addBlockToSlide('math', S.insCol || 1)),
      bg('⊞', 'Tabla', () => addBlockToSlide('table', S.insCol || 1))),
    cintaGrupo('Argumento',
      bg('¶', 'Argumento', alternaArgumento, 'La charla como cadena de afirmaciones · Ctrl+Shift+A'),
      sm('◉', 'Cuéntamelo', openCuentamelo, 'Habla o pega lo que dirías y saca las afirmaciones'),
      sm('⌛', 'Tiempo', alternaLineaTiempo, 'La charla como línea de tiempo · Ctrl+Shift+T'),
      sm('▥', 'Memoria', () => openMemoria(), 'Buscar en todas tus charlas'),
      sm('◔', 'Tutor', openTutor, 'Las reglas que ya son tuyas'),
      sm('◉', 'Mirada', alternaMirada, 'Dónde cae primero el ojo · Ctrl+Shift+M')),
    cintaGrupo('Edición',
      sm('⌕', 'Buscar', () => openBuscar(), 'Ctrl+F'),
      sm('⌘', 'Ir a / hacer', openPaleta, 'Ctrl+K'),
      sm('⊞', 'Ver todas', alternaClasificador, 'Ctrl+G')),
    cintaGrupo('Ayuda',
      bg('✦', 'Asistente', () => alternaAsistente(), 'Pídele las cosas con tus palabras · Ctrl+J'),
      sm('?', 'Ayuda', () => openHelp(), 'Ayuda y atajos'))
  ];

  if (tab === 'insertar') {
    /* En la cinta el nombre va debajo del icono: unos cuantos se acortan
       para que no se parta la palabra. */
    const CORTO = { montaje: 'Montaje', estruct: 'Estructura', teorema: 'Teorema', geo: 'Geometría',
      galeria: 'Galería', smart: 'SmartArt', chart: 'Gráfica', func: 'Dinámica', video: 'Video',
      bblock: 'Caja', bullets: 'Viñetas', image: 'Figura' };
    const g = (nom, ids) => cintaGrupo(nom, ...BLOCK_DEFS.filter(x => ids.includes(x.id))
      .map(d => bg(d.ic, CORTO[d.id] || d.name, () => addBlockToSlide(d.id, S.insCol || 1), d.name)));
    return [
      g('Básicos', ['text', 'bullets', 'math', 'chem', 'image', 'table']),
      cintaGrupo('Más contenido',
        mn('＋', 'Más bloques', () => menuDe(BLOCK_DEFS.filter(d => d.grp === 'base' && !['text','bullets','math','chem','image','table'].includes(d.id)).map(d => ({ic:d.ic,n:d.name,fn:()=>addBlockToSlide(d.id,S.insCol||1)})))),
        mn('⚗', 'Ciencia y figuras', () => menuDe([
          {ic:'⚗',n:'Crear figura científica',fn:openCiencia},
          {sep:1},
          ...BLOCK_DEFS.filter(d=>d.grp !== 'base').map(d=>({ic:d.ic,n:d.name,fn:()=>addBlockToSlide(d.id,S.insCol||1)}))
        ]))),
      cintaGrupo('Ideas',
        bg('✨', 'Ideas de diseño', () => abreDisenador(), 'Propone acomodos según la figura'),
        sm('☰', 'Desde un esquema', openEsquema, 'Pega tu índice y se vuelve diapositivas'))
    ];
  }

  if (tab === 'diseno') return [
    cintaGrupo('Tema',
      mn('◆', 'Tema', () => menuDe(Object.keys(THEMES).map(k => ({ ic: S.deck.meta.theme === k ? '●' : '◇', n: THEMES[k].name, d: THEMES[k].desc, fn: () => { S.deck.meta.theme = k; commit(); } }))), 'Los temas Beamer'),
      pop('◐', 'Acento', () => panelSoloGrupo('acento'), 'Color de acento de la presentación'),
      mn('A', 'Tipografía', () => menuDe(FUENTES.filter(x => x.id !== 'auto').map(x => ({ ic: (S.deck.meta.fuente || 'auto') === x.id ? '●' : '·', n: x.n, d: x.esp || '', fn: () => { S.deck.meta.fuente = x.id; commit(); } }))), 'Diez tipografías científicas')),
    cintaGrupo('Movimiento',
      mn('⇢', 'Transición', () => menuDe(TRANS.map(t => ({ ic: (S.deck.meta.trans || 'fundido') === t.id ? '●' : '◇', n: t.n, d: t.d, fn: () => { S.deck.meta.trans = t.id; commit(); } }))), 'Cómo se pasa de una diapositiva a otra')),
    cintaGrupo('Público',
      mn('◒', 'Nivel', () => menuDe(NIVELES.map(x => ({ ic: nivelDe(S.deck) === x.id ? '●' : '◇', n: x.n, d: x.d, fn: () => ponNivel(x.id) }))), 'Comité, congreso o divulgación: la misma charla, distinta profundidad'),
      sm('“', 'Glosario', openGlosas, 'Términos en una frase, para el nivel de divulgación'),
      sm('⑂', 'Ramas', openRamas, 'La del comité, la de diez minutos… la misma charla'),
      sm('♿', 'Accesible', openAccesibilidad, 'Paleta segura, texto alterno, contraste')),
    cintaGrupo('Marca',
      sm('▭', 'Pie de página', openPieEditor, 'Plantillas al estilo Beamer'),
      sm('◈', 'Escudo', () => abrePanelLateral('design'), 'Logotipo institucional'),
      sm('☰', 'Estilos', openEstilos, 'Guardar y reutilizar una combinación')),
    cintaGrupo('Pantalla',
      mn('◑', 'Apariencia', () => menuDe([
        { ic: '☀', n: 'Clara', fn: () => cambiaTemaApp('claro') },
        { ic: '☾', n: 'Oscura', fn: () => cambiaTemaApp('oscuro') },
        { ic: '◐', n: 'La del sistema', fn: () => cambiaTemaApp('auto') }]), 'Apariencia del editor'),
      mn('▦', 'Herramientas', () => menuDe(SITIOS_BARRA.map(x => ({
        ic: (S.prefs.barras || 'lado') === x.id ? '●' : '◇', n: x.n, d: x.d, fn: () => ponDisposicion(x.id) }))), 'Panel a la derecha o cinta arriba'),
      sm('⛶', 'Concentración', alternaConcentracion, 'F9')),
    cintaGrupo('Todo el panel',
      sm('⋯', 'Más de diseño', () => abrePanelLateral('design'), 'Abre el panel completo de Diseño'))
  ];

  if (tab === 'diapo') return [
    cintaGrupo('Acomodo',
      mn('▤', 'Acomodo', () => menuDe(LAYOUTS.map(l => ({ ic: sl.layout === l.id ? '●' : '▭', n: l.name, d: l.d, fn: () => changeLayout(curSlide(), l.id) }))), 'Cómo se reparte el contenido'),
      sm('⤢', 'Ajustar texto', () => { ajustarTexto(curSlide()); commit(); }, 'Busca el mayor tamaño que cabe'),
      pop('↕', 'Tamaño y márgenes', () => panelSoloGrupo('medida'), 'Tamaño del texto y márgenes laterales')),
    cintaGrupo('Guion',
      bg('✎', 'Notas', () => openNotasEditor(S.cur), 'Notas del orador de esta diapositiva'),
      sm('☰', 'Todas las notas', () => openNotasEditor(S.cur, 'todas'), 'El guion de corrido'),
      sm('◷', 'Minutos', () => abrePanelLateral('slide'), 'Tiempo previsto de esta diapositiva')),
    cintaGrupo('Preguntas',
      bg('?', 'Preguntas', openPreguntas, 'Las que te van a hacer, con su respaldo'),
      sm('◔', 'Aprendido', openAprendizaje, 'Lo que confunde en tus charlas')),
    cintaGrupo('Rama',
      sm(typeof fueraDeRama === 'function' && fueraDeRama(sl) ? '⊘' : '⑂', 'En la rama', () => alternaEnRama(S.cur), 'Sacar o meter esta diapositiva en la rama activa')),
    cintaGrupo('Tiempo',
      bg('◷', 'Ajustar', openAjustarTiempo, 'Cuadrar la charla al tiempo que te dan'),
      sm('❝', 'Referencias', () => openReferencias(), 'DOI o BibTeX, citas y bibliografía'),
      sm('Z', 'Zotero', () => openZotero(), 'Traer de tu biblioteca de Zotero'),
      mn('¹', 'Estilo', () => menuDe(ESTILOS_CITA.map(e => ({ ic: estiloCita(S.deck) === e.id ? '●' : '◇',
        n: e.n + '   ' + e.ej, d: e.d, fn: () => { S.deck.meta.citEstilo = e.id; invalidaCitas(); commit(); } }))), 'Estilo de las citas'),
      sm(esRespaldo(sl) ? '☑' : '☐', 'Respaldo', () => alternaRespaldo(S.cur), 'Guardarla para preguntas')),
    cintaGrupo('Cognición',
      bg('◔', 'Carga', openCarga, 'Redundancia, atención dividida y señalización, con el arreglo'),
      sm('◉', 'Mirada', alternaMirada, 'El recorrido estimado del ojo')),
    cintaGrupo('Pendientes',
      sm('◻', 'Anotar', () => nuevoPendiente(S.cur), 'Anotar un pendiente aquí'),
      sm('☑', 'Ver todos', openPendientes, 'F8')),
    cintaGrupo('Todo el panel',
      sm('⋯', 'Más de diapositiva', () => abrePanelLateral('slide'), 'Abre el panel completo de Diapositiva'))
  ];

  if (tab === 'bloque' && b) {
    const def = BLOCK_DEFS.find(x => x.id === b.type) || { name: b.type, ic: '▦' };
    const editable = { math: openEqEditor, chem: openChemEditor, chart: openChartEditor, func: openFuncEditor,
      smart: openSmartEditor, estruct: openEstructura, montaje: openMontaje, geo: openGeometria, galeria: openGaleria };
    return [
      cintaGrupo(def.name,
        editable[b.type] ? bg(def.ic, 'Editar', () => editable[b.type](b), 'Abrir el editor de este bloque') : null,
        b.type === 'image' ? bg('▣', 'Cambiar', () => pickImage(b), 'Elegir otra imagen') : null,
        pop('⚙', 'Propiedades', () => cuerpoProps(b, { panel: true }), 'Todas las propiedades de este bloque')),
      b.type === 'image' && b.src ? cintaGrupo('Figura',
        bg('✨', 'Ideas', () => abreDisenador(b), 'Acomodos propuestos según la imagen'),
        pop('◑', 'Estilo', () => { const c = h('div', { class: 'ie-caja' }); panelEstiloImagen(b, c); return c; }, 'Forma, marco, sombra y filtro'),
        sm('⊞', 'Del artículo', () => openDespiece(b), 'Partir en paneles, tapar leyendas y señalar'),
        sm('⛶', 'Encuadrar', () => openRecorte(b), 'Recorte y zoom'),
        sm('⊢', 'Escala', () => openEscala(b), 'Barra de escala de micrografía')) : null,
      cintaGrupo('Aparición',
        sm(b.step ? '☑' : '☐', 'Por pasos', () => { b.step = !b.step; commit(); }, 'Aparece en su propio paso al presentar'),
        mn('✧', 'Efecto', () => menuDe(ANIMS.filter(a => a.id !== 'draw' || ['chart', 'func', 'smart', 'geo'].includes(b.type))
          .map(a => ({ ic: (b.anim || 'fade') === a.id ? '●' : '◇', n: a.name, d: a.d || '', fn: () => { b.anim = a.id; b.step = true; commit(); } }))), 'Efecto de entrada'),
        mn('⏱', 'Velocidad', () => menuDe(ANIM_VEL.map(v => ({ ic: (b.animVel || 'normal') === v.id ? '●' : '◇', n: v.n, d: v.ms + ' ms', fn: () => { b.animVel = v.id; commit(); } }))), 'Duración del efecto')),
      cintaGrupo('Orden',
        sm('↑', 'Subir', () => moveBlock(S.selBlock, -1)),
        sm('↓', 'Bajar', () => moveBlock(S.selBlock, 1)),
        sm('⧉', 'Duplicar', () => dupBlock(S.selBlock)),
        sm('⇥', 'Mover a…', () => openMoverBloque(b)),
        sm('✕', 'Eliminar', () => delBlock(S.selBlock)))
    ].filter(Boolean);
  }

  if (tab === 'presentar') return [
    cintaGrupo('Presentar',
      bg('▶', 'Presentar', () => startPresent(false), 'F5'),
      sm('▷', 'Desde aquí', () => startPresent(true), 'Mayús+F5'),
      sm('▤', 'Presentador', () => { startPresent(false); alternaPresentador(); }, 'Segunda ventana con cronómetro y notas'),
      sm('◷', 'Ensayar', presentaEnsayo, 'Mide tu tiempo real por diapositiva')),
    cintaGrupo('Revisar',
      bg('✓', 'Revisar', openRevision, 'Desbordes, contraste y figuras sin pie'),
      sm('◐', 'Simulacro', openSala, 'Proyector, distancia y daltonismo'),
      sm('▢', 'Archivo final', openComprobacion, 'Resolución, tipografías y peso')),
    cintaGrupo('Exportar',
      bg('⤓', 'PDF', openPdfHelp),
      sm('{ }', 'Código Beamer', openTexView),
      sm('▧', 'PowerPoint', exportPPTX),
      sm('▥', 'Folleto', openFolleto),
      sm('✎', 'Guion', exportGuion)),
    cintaGrupo('Guardar',
      sm('⌸', 'Mis presentaciones', openDecks),
      sm('⤒', 'Guardar como…', saveDeckAs, 'Ctrl+S'),
      sm('⤓', 'Proyecto .json', () => exportJSON()),
      sm('▦', 'Kit de defensa', kitDefensa, 'Todo lo del día en un .zip'))
  ];

  return [];
}

/* Un trozo del panel lateral, para meterlo en una hojita de la cinta. */
function panelSoloGrupo(cual) {
  const caja = h('div');
  if (cual === 'acento') {
    const tmp = h('div');
    try { renderDesignTab(tmp); } catch (e) { /* si algo falla, se muestra el panel entero */ }
    const g = [...tmp.querySelectorAll('.igroup')].find(x => /acento/i.test(x.textContent));
    caja.append(g || tmp);
  } else if (cual === 'medida') {
    const tmp = h('div');
    try { renderSlideTab(tmp); } catch (e) { }
    const gs = [...tmp.querySelectorAll('.igroup')].filter(x => /tamaño|margen|texto/i.test(x.textContent));
    if (gs.length) gs.forEach(g => caja.append(g)); else caja.append(tmp);
  }
  if (!caja.firstChild) caja.append(h('p', { class: 'hint' }, 'Este control vive en el panel completo.'));
  return caja;
}
/* Abre el panel lateral de una pestaña aunque estemos en modo cinta. */
function abrePanelLateral(tab) {
  S.tab = tab;
  document.body.classList.add('panel-temporal');
  renderInspector();
  openDrawer(true);
}

/* ---------- pintar la cinta ---------- */
let CINTA_TAB = 'inicio';
function pintaCinta() {
  const raiz = $('#cinta');
  if (!raiz) return;
  raiz.hidden = !enCinta();
  document.body.classList.toggle('con-cinta', enCinta());
  if (!enCinta()) { raiz.innerHTML = ''; return; }
  raiz.innerHTML = '';

  const pes = cintaPestanas();
  if (!pes.some(p => p.id === CINTA_TAB)) CINTA_TAB = 'inicio';
  const barra = h('div', { class: 'cinta-tabs', role: 'tablist' });
  pes.forEach(p => barra.append(h('button', {
    class: 'cinta-tab' + (CINTA_TAB === p.id ? ' on' : '') + (p.acento ? ' acc' : ''),
    role: 'tab', 'aria-selected': CINTA_TAB === p.id ? 'true' : 'false',
    onclick: () => { CINTA_TAB = p.id; pintaCinta(); } }, p.n)));
  barra.append(h('span', { style: 'flex:1' }));
  barra.append(h('button', { class: 'cinta-tab cinta-lado', title: 'Volver al panel de la derecha',
    onclick: () => ponDisposicion('lado') }, '▦ Panel'));
  raiz.append(barra);

  const fila = h('div', { class: 'cinta-fila' });
  cintaContenido(CINTA_TAB).forEach((g, i) => {
    /* Como en PowerPoint: los botones grandes en una fila y los pequeños
       apilados en columnas de tres a su lado. */
    const caja = h('div', { class: 'cinta-grupo' });
    const items = h('div', { class: 'cinta-items' });
    const grandes = g.items.filter(x => x.k === 'bg');
    const chicos = g.items.filter(x => x.k !== 'bg' && x.k !== 'sep');
    if (grandes.length) {
      const fg = h('div', { class: 'cinta-bigs' });
      grandes.forEach(it => fg.append(cintaItem(it)));
      items.append(fg);
    }
    for (let i = 0; i < chicos.length; i += 3) {
      const col = h('div', { class: 'cinta-col' });
      chicos.slice(i, i + 3).forEach(it => col.append(cintaItem(it)));
      items.append(col);
    }
    caja.append(items, h('span', { class: 'cinta-gn' }, g.nombre));
    fila.append(caja);
  });
  raiz.append(fila);
}
function cintaItem(it) {
  if (it.k === 'sep') return h('span', { class: 'cinta-sep' });
  const cont = (ic, et) => [h('span', { class: 'cinta-ic' }, ic), h('span', { class: 'cinta-et' }, et)];
  if (it.k === 'bg') return h('button', { class: 'cinta-b bgr', title: it.tit || it.et, onclick: it.fn }, ...cont(it.ic, it.et));
  if (it.k === 'sm') return h('button', { class: 'cinta-b chi', title: it.tit || it.et, onclick: it.fn }, ...cont(it.ic, it.et));
  if (it.k === 'mn') return h('button', { class: 'cinta-b chi men', title: it.tit || it.et,
    onclick: e => showMenu(it.arma(), e.currentTarget) }, ...cont(it.ic, it.et), h('span', { class: 'cinta-fl' }, '▾'));
  if (it.k === 'pop') return h('button', { class: 'cinta-b chi men', title: it.tit || it.et,
    onclick: e => abreHoja(it.arma(), e.currentTarget, it.tit || it.et) }, ...cont(it.ic, it.et), h('span', { class: 'cinta-fl' }, '▾'));
  return h('span');
}

/* ---------- cambiar de disposición ---------- */
function ponDisposicion(id) {
  S.prefs = S.prefs || {};
  S.prefs.barras = id === 'arriba' ? 'arriba' : 'lado';
  guardaPrefs();
  document.body.classList.remove('panel-temporal');
  aplicaDisposicion();
  toast(id === 'arriba' ? 'Herramientas arriba, como en PowerPoint' : 'Herramientas en el panel de la derecha');
}
function aplicaDisposicion() {
  pintaCinta();
  if (enCinta()) closeDrawerSiProcede();
  renderInspector();
  /* Cambiar de disposición cambia el ancho disponible: sin volver a ajustar,
     el lienzo se queda con la escala anterior hasta el siguiente redibujo. */
  if (S.deck) { S.zoom = null; renderCanvas(); }
}
function closeDrawerSiProcede() {
  if (document.body.classList.contains('panel-temporal')) return;
  const insp = $('#inspector'); if (insp) insp.classList.remove('abierto');
}


