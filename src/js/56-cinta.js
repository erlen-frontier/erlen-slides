/* ==== 56-cinta.js ==== */
'use strict';
/* ================= la cinta de arriba =================
   Las herramientas del editor en una cinta con pestañas, como en las apps de
   oficina. Es la disposición de fábrica. La cinta la pinta el componente común
   de la suite (src/diseno/suite-cinta.js, cargado tal cual por _orden.txt;
   erlen-suite docs/COHERENCIA-APPS.md §5): aquí solo se declara qué hay en
   cada pestaña y se llama a las mismas funciones que el panel de la derecha.
   Lo que necesita un formulario largo (un deslizador, un color, todas las
   propiedades de un bloque) se abre en el panel de detalles, a la derecha,
   que se cierra con ✕ o Escape. */

const SITIOS_BARRA = [
  { id: 'arriba', n: 'Cinta arriba', d: 'Pestañas y botones en una cinta superior, como en las apps de oficina. Es la disposición de fábrica y deja todo el ancho para la diapositiva.' },
  { id: 'lado', n: 'Panel a la derecha', d: 'Las propiedades viven siempre a la vista en un panel lateral con pestañas.' }
];
function disposicion() { return ((S.prefs && S.prefs.barras) || PREFS_DEF.barras) === 'lado' ? 'lado' : 'arriba'; }
function enCinta() { return disposicion() === 'arriba'; }

/* ---------- iconos: SVG de lucide incrustados en el build (herramientas/build.mjs) ---------- */
function icCinta(nombre) {
  const d = window.ERLEN_ICONOS && window.ERLEN_ICONOS[nombre];
  if (!d) return null;
  const esc = v => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'
    + d.map(([t, a]) => '<' + t + Object.entries(a).map(([k, v]) => ' ' + k + '="' + esc(v) + '"').join('') + '/>').join('') + '</svg>';
}
function icNodo(nombre) {
  const s = icCinta(nombre);
  if (!s) return null;
  const t = document.createElement('template');
  t.innerHTML = s;
  return t.content.firstChild;
}

/* ---------- piezas de la configuración declarativa ---------- */
/* titulo = rótulo · explicación (atajo); el nombre accesible es el rótulo visible. */
function ctl(tipo, id, etiqueta, icono, accion, x) {
  x = x || {};
  const c = { tipo, id, etiqueta, icono: icono ? icCinta(icono) : null, accion };
  if (x.atajo) c.atajo = x.atajo;
  c.titulo = etiqueta + (x.d ? ' · ' + x.d : '') + (x.atajo ? ' (' + x.atajo + ')' : '');
  for (const k of ['activo', 'deshabilitado', 'oculto', 'opciones']) if (x[k]) c[k] = x[k];
  return c;
}
const grande = (id, et, ic, fn, x) => ctl('grande', id, et, ic, fn, x);
const peque = (id, et, ic, fn, x) => ctl('pequeno', id, et, ic, fn, x);
const inter = (id, et, ic, fn, activo, x) => ctl('interruptor', id, et, ic, fn, Object.assign({ activo }, x));
const menuC = (id, et, ic, opciones, x) => ctl('menu', id, et, ic, null, Object.assign({ opciones }, x));
const grupoC = (etiqueta, ...controles) => ({ etiqueta, controles: controles.filter(Boolean) });
/* Opción de menú con marca: la cinta pinta ✓ y aria-checked. */
const opc = (etiqueta, accion, marcado, descripcion) => ({ etiqueta, accion, descripcion: descripcion || undefined, marcado });

const blq = () => { const f = S.selBlock && findBlock(S.selBlock); return f ? f.block : null; };
const conBloque = fn => () => { const b = blq(); if (b) fn(b); };
const insertar = id => () => addBlockToSlide(id, S.insCol || 1);
const opcionesBloques = ids => () => BLOCK_DEFS.filter(d => ids.includes(d.id))
  .map(d => ({ etiqueta: d.name, accion: insertar(d.id) }));

/* ---------- las pestañas fijas ---------- */
function cintaInicio() {
  return { id: 'inicio', etiqueta: 'Inicio', grupos: [
    grupoC('Historial',
      peque('deshacer', 'Deshacer', 'Undo2', doUndo, { atajo: 'Ctrl+Z', deshabilitado: () => !S.undo.length }),
      peque('rehacer', 'Rehacer', 'Redo2', doRedo, { atajo: 'Ctrl+Shift+Z', deshabilitado: () => !S.redo.length })),
    grupoC('Diapositivas',
      menuC('nueva', 'Nueva', 'SquarePlus', () => LAYOUTS.map(l => ({ etiqueta: l.name, descripcion: l.d, accion: () => addSlide(l.id) })),
        { d: 'Nueva diapositiva con el acomodo que elijas; Ctrl+M añade una de contenido' }),
      peque('duplicar-diapo', 'Duplicar', 'Copy', () => dupSlide(S.cur), { atajo: 'Ctrl+D', d: 'Duplicar esta diapositiva' }),
      peque('quitar-diapo', 'Eliminar', 'Trash2', () => delSlide(S.cur), { d: 'Eliminar esta diapositiva', deshabilitado: () => S.deck.slides.length <= 1 }),
      peque('esquema', 'Desde un esquema', 'ListTree', openEsquema, { d: 'Pega tu índice y se vuelve diapositivas' })),
    grupoC('Edición',
      peque('buscar', 'Buscar y reemplazar', 'Search', () => openBuscar(), { atajo: 'Ctrl+F' }),
      peque('paleta', 'Ir a / hacer', 'Command', openPaleta, { atajo: 'Ctrl+K', d: 'Cualquier orden por su nombre' })),
    grupoC('Argumento',
      grande('argumento', 'Argumento', 'Route', alternaArgumento, { atajo: 'Ctrl+Shift+A', d: 'La charla como cadena de afirmaciones' }),
      peque('cuentamelo', 'Cuéntamelo', 'Mic', openCuentamelo, { d: 'Habla o pega lo que dirías y saca las afirmaciones' }),
      peque('linea-tiempo', 'Línea de tiempo', 'ChartGantt', alternaLineaTiempo, { atajo: 'Ctrl+Shift+T', d: 'La charla como línea de tiempo' }),
      peque('memoria', 'Memoria', 'Library', () => openMemoria(), { d: 'Buscar en todas tus charlas' }),
      peque('tutor', 'Tutor', 'GraduationCap', openTutor, { d: 'Las reglas que ya son tuyas' }))
  ] };
}

function cintaInsertar() {
  const zonas = () => zonasDe(curSlide().layout);
  return { id: 'insertar', etiqueta: 'Insertar', grupos: [
    grupoC('Destino',
      menuC('zona', 'Zona', 'Columns3', () => {
        const nz = zonas(), nombres = NOMBRES_ZONA[curSlide().layout] || [];
        return Array.from({ length: nz }, (_, i) => opc(nombres[i] || ('Zona ' + (i + 1)), () => { S.insCol = i + 1; }, () => (S.insCol || 1) === i + 1));
      }, { d: 'En qué columna o celda entran los bloques nuevos', oculto: () => zonas() <= 1 })),
    grupoC('Contenido',
      grande('ins-text', 'Texto', 'Type', insertar('text')),
      grande('ins-bullets', 'Viñetas', 'List', insertar('bullets')),
      grande('ins-math', 'Ecuación', 'Sigma', insertar('math')),
      grande('ins-chem', 'Reacción', 'ArrowRightLeft', insertar('chem'), { d: 'Reacción química con mhchem' }),
      grande('ins-image', 'Figura', 'Image', insertar('image')),
      grande('ins-table', 'Tabla', 'Table', insertar('table'))),
    grupoC('Más contenido',
      menuC('mas-bloques', 'Más bloques', 'Blocks', opcionesBloques(['galeria', 'quote', 'bblock', 'code', 'spacer'])),
      menuC('datos-medios', 'Datos y medios', 'ChartLine', opcionesBloques(['chart', 'func', 'video', 'smart']), { d: 'Gráficas, video y diagramas' }),
      menuC('quimica-lab', 'Química y laboratorio', 'FlaskConical', () => [
        { etiqueta: 'Crear figura científica…', descripcion: 'Espectros, moléculas y datos con su procedencia', accion: openCiencia },
        { separador: true }, ...opcionesBloques(['estruct', 'montaje'])()]),
      menuC('matematicas', 'Matemáticas', 'Pi', opcionesBloques(['teorema', 'geo']))),
    grupoC('Citas',
      peque('referencias', 'Referencias…', 'BookMarked', () => openReferencias(), { d: 'DOI o BibTeX, citas y bibliografía' }),
      peque('zotero', 'Desde Zotero…', 'LibraryBig', () => openZotero(), { d: 'Traer de tu biblioteca de Zotero' }),
      menuC('estilo-cita', 'Estilo de cita', 'Superscript', () => ESTILOS_CITA.map(e => opc(e.n + ' · ' + e.ej,
        () => { S.deck.meta.citEstilo = e.id; invalidaCitas(); commit(); }, () => estiloCita(S.deck) === e.id, e.d))),
      peque('ins-refs', 'Bibliografía', 'BookOpen', insertar('refs'), { d: 'Bloque con la lista de referencias citadas' }))
  ] };
}

function cintaDiseno() {
  const m = () => S.deck.meta;
  return { id: 'diseno', etiqueta: 'Diseño', grupos: [
    grupoC('Tema',
      menuC('tema', 'Tema', 'Palette', () => Object.keys(THEMES).map(k => opc(THEMES[k].name, () => { m().theme = k; commit(); }, () => m().theme === k, THEMES[k].desc)),
        { d: 'Los temas Beamer' }),
      peque('acento', 'Color de acento…', 'Droplet', () => abrePanelLateral('design', 'Tema Beamer'), { d: 'El color de tu universidad o de tu laboratorio' }),
      menuC('tipografia', 'Tipografía', 'CaseSensitive', () => FUENTES.filter(x => x.id !== 'auto').map(x => opc(x.n, () => { m().fuente = x.id; commit(); }, () => (m().fuente || 'auto') === x.id, x.esp || '')))),
    grupoC('Ideas',
      grande('ideas', 'Ideas de diseño', 'Sparkles', () => { const b = blq(); abreDisenador(b && b.type === 'image' ? b : undefined); },
        { d: 'Propone acomodos según la figura' })),
    grupoC('Movimiento',
      menuC('transicion', 'Transición', 'MoveRight', () => TRANS.map(t => opc(t.n, () => { m().trans = t.id; commit(); }, () => (m().trans || 'fundido') === t.id, t.d)),
        { d: 'Cómo se pasa de una diapositiva a otra' })),
    grupoC('Público',
      menuC('nivel', 'Nivel', 'Users', () => NIVELES.map(x => opc(x.n, () => ponNivel(x.id), () => nivelDe(S.deck) === x.id, x.d)),
        { d: 'Comité, congreso o divulgación: la misma charla, distinta profundidad' }),
      peque('glosario', 'Glosario…', 'BookA', openGlosas, { d: 'Términos en una frase, para el nivel de divulgación' })),
    grupoC('Marca',
      peque('pie', 'Pie de página…', 'PanelBottom', openPieEditor, { d: 'Plantillas al estilo Beamer' }),
      peque('escudo', 'Escudo…', 'Shield', () => abrePanelLateral('design', 'Identidad institucional'), { d: 'Logotipo institucional' }),
      peque('estilos', 'Estilos guardados…', 'Bookmark', openEstilos, { d: 'Guardar y reutilizar una combinación de tema, color y tipografía' })),
    grupoC('Detalles',
      peque('panel-diseno', 'Más opciones…', 'PanelRight', () => abrePanelLateral('design'), { d: 'Abre el panel de detalles de Diseño' }))
  ] };
}

function cintaDiapositiva() {
  const sl = () => curSlide();
  return { id: 'diapo', etiqueta: 'Diapositiva', grupos: [
    grupoC('Acomodo',
      menuC('acomodo', 'Acomodo', 'LayoutDashboard', () => LAYOUTS.map(l => opc(l.name, () => changeLayout(curSlide(), l.id), () => sl().layout === l.id, l.d)),
        { d: 'Cómo se reparte el contenido' }),
      peque('ajustar-texto', 'Ajustar texto', 'ALargeSmall', () => { ajustarTexto(curSlide()); commit(); }, { d: 'Busca el mayor tamaño que cabe' }),
      peque('medida', 'Tamaño y márgenes…', 'Scaling', () => abrePanelLateral('slide', 'Aprovechar el espacio'), { d: 'Tamaño del texto y márgenes laterales' })),
    grupoC('Guion',
      grande('notas', 'Notas', 'NotebookPen', () => openNotasEditor(S.cur), { d: 'Notas del orador de esta diapositiva' }),
      peque('todas-notas', 'Todas las notas', 'ScrollText', () => openNotasEditor(S.cur, 'todas'), { d: 'El guion de corrido' }),
      peque('minutos', 'Tiempo previsto…', 'Clock', () => abrePanelLateral('slide', 'Notas del orador'), { d: 'Minutos previstos para esta diapositiva' })),
    grupoC('Preguntas',
      grande('preguntas', 'Preguntas', 'MessageCircleQuestion', openPreguntas, { d: 'Las que te van a hacer, con su respaldo' }),
      inter('respaldo', 'De respaldo', 'Archive', () => alternaRespaldo(S.cur), () => esRespaldo(sl()), { d: 'Guardarla para las preguntas, fuera de la charla' }),
      peque('aprendido', 'Lo aprendido', 'Lightbulb', openAprendizaje, { d: 'Lo que confunde en tus charlas' })),
    grupoC('Ramas',
      peque('ramas', 'Ramas…', 'GitBranch', openRamas, { d: 'La del comité, la de diez minutos… la misma charla' }),
      inter('en-rama', 'En la rama activa', 'SquareCheck', () => alternaEnRama(S.cur), () => !!ramaActiva() && !fueraDeRama(sl()),
        { d: 'Sacar o meter esta diapositiva en la rama activa', deshabilitado: () => !ramaActiva() || sl().layout === 'title' })),
    grupoC('Cognición',
      grande('carga', 'Carga', 'Brain', openCarga, { d: 'Redundancia, atención dividida y señalización, con el arreglo' }),
      inter('mirada', 'Mirada', 'Eye', alternaMirada, () => MIRADA.on, { atajo: 'Ctrl+Shift+M', d: 'Dónde cae primero el ojo' })),
    grupoC('Pendientes',
      peque('anotar', 'Anotar', 'StickyNote', () => nuevoPendiente(S.cur), { d: 'Anotar un pendiente en esta diapositiva' }),
      peque('pendientes', 'Ver pendientes', 'ListTodo', openPendientes, { atajo: 'F8' })),
    grupoC('Detalles',
      peque('panel-diapo', 'Más opciones…', 'PanelRight', () => abrePanelLateral('slide'), { d: 'Abre el panel de detalles de la diapositiva' }))
  ] };
}

function cintaPresentar() {
  return { id: 'presentar', etiqueta: 'Presentar', grupos: [
    grupoC('Presentar',
      grande('presentar', 'Desde el principio', 'Play', () => startPresent(false), { atajo: 'F5' }),
      peque('desde-aqui', 'Desde aquí', 'StepForward', () => startPresent(true), { atajo: 'Mayús+F5' }),
      peque('presentador', 'Vista de presentador', 'Presentation', () => { startPresent(false); alternaPresentador(); }, { d: 'Segunda ventana con cronómetro y notas' })),
    grupoC('Ensayo',
      peque('ensayar', 'Ensayar', 'Timer', presentaEnsayo, { d: 'Mide tu tiempo real por diapositiva' }),
      peque('ajustar-tiempo', 'Ajustar al tiempo', 'Hourglass', openAjustarTiempo, { d: 'Cuadrar la charla al tiempo que te dan' })),
    grupoC('Revisar',
      grande('revisar', 'Revisar', 'CircleCheckBig', () => openRevision(), { d: 'Desbordes, contraste y figuras sin pie' }),
      peque('sala', 'Simulacro de sala', 'Projector', () => openSala(), { d: 'Proyector, distancia y daltonismo' }),
      peque('accesible', 'Accesibilidad', 'Accessibility', openAccesibilidad, { d: 'Paleta segura, texto alterno y contraste' }),
      peque('archivo-final', 'Archivo final', 'FileCheck', () => openComprobacion(), { d: 'Resolución, tipografías y peso' }),
      peque('calidad', 'Calidad científica', 'Microscope', openCalidadCientifica, { d: 'Unidades, incertidumbres y procedencia de los datos' }))
  ] };
}

function cintaVista() {
  const concentrado = () => $('#app').classList.contains('concentrado');
  const compacta = () => !!($('#densChk') && $('#densChk').checked);
  const zoom = f => () => { S.zoom = f ? clamp((S.zoom || effZoom()) * f, 0.1, 3) : null; renderCanvas(); };
  return { id: 'vista', etiqueta: 'Vista', grupos: [
    grupoC('Vistas',
      grande('ver-todas', 'Ver todas', 'LayoutGrid', alternaClasificador, { atajo: 'Ctrl+G', d: 'Todas las diapositivas en una cuadrícula' }),
      inter('codigo', 'Código Beamer', 'Code', () => alternaCodigo(), () => typeof _codigoAbierto !== 'undefined' && !!_codigoAbierto, { atajo: 'F7', d: 'El .tex de esta diapositiva al lado' }),
      inter('concentracion', 'Concentración', 'Minimize2', () => alternaConcentracion(), concentrado, { atajo: 'F9', d: 'Solo la diapositiva' })),
    grupoC('Zoom',
      peque('acercar', 'Acercar', 'ZoomIn', zoom(1.2)),
      peque('alejar', 'Alejar', 'ZoomOut', zoom(1 / 1.2)),
      peque('ajustar', 'Ajustar a la ventana', 'Expand', zoom(null))),
    grupoC('Apariencia',
      menuC('apariencia', 'Apariencia', 'SunMoon', () => [
        opc('Clara', () => cambiaTemaApp('claro'), () => S.prefs.tema === 'claro'),
        opc('Oscura', () => cambiaTemaApp('oscuro'), () => S.prefs.tema === 'oscuro'),
        opc('La del sistema', () => cambiaTemaApp('auto'), () => (S.prefs.tema || 'auto') === 'auto')], { d: 'Apariencia del editor' }),
      inter('densidad', 'Compacta', 'Rows3', () => { const c = $('#densChk'); if (c) { c.checked = !c.checked; c.dispatchEvent(new Event('change', { bubbles: true })); } }, compacta,
        { d: 'Interfaz compacta: menos aire entre controles' }),
      menuC('herramientas', 'Herramientas', 'PanelTop', () => SITIOS_BARRA.map(x => opc(x.n, () => ponDisposicion(x.id), () => disposicion() === x.id, x.d)),
        { atajo: 'Ctrl+Shift+B', d: 'Cinta arriba o panel a la derecha' }))
  ] };
}

/* ---------- la pestaña contextual: el tipo del bloque seleccionado ---------- */
const EDITORES_BLOQUE = () => ({ math: openEqEditor, chem: openChemEditor, chart: openChartEditor, func: openFuncEditor,
  smart: openSmartEditor, estruct: openEstructura, montaje: openMontaje, geo: openGeometria, galeria: openGaleria });
function cintaContextual() {
  const b = blq();
  if (!b) return [];
  const def = BLOCK_DEFS.find(x => x.id === b.type) || { name: 'Bloque' };
  const figura = () => { const x = blq(); return !!(x && x.type === 'image' && x.src); };
  const animables = () => { const x = blq(); return ANIMS.filter(a => a.id !== 'draw' || (x && ['chart', 'func', 'smart', 'geo'].includes(x.type))); };
  return [{ id: 'bloque', etiqueta: def.name, grupos: [
    grupoC(def.name,
      grande('editar-' + b.type, 'Editar', 'Pencil', conBloque(x => EDITORES_BLOQUE()[x.type](x)), { d: 'Abrir el editor de este bloque', oculto: () => { const x = blq(); return !x || !EDITORES_BLOQUE()[x.type]; } }),
      grande('cambiar-imagen', 'Cambiar', 'ImageUp', conBloque(pickImage), { d: 'Elegir otra imagen', oculto: () => { const x = blq(); return !x || x.type !== 'image'; } }),
      peque('propiedades', 'Propiedades…', 'SlidersHorizontal', () => abrePanelLateral('bloque'), { d: 'Todas las propiedades de este bloque en el panel de detalles' }),
      peque('datos-cientificos', 'Datos científicos…', 'Atom', conBloque(cienciaReabrir), { d: 'Editar los datos y su procedencia', oculto: () => { const x = blq(); return !x || !x.cientifico; } })),
    grupoC('Figura',
      peque('despiece', 'Del artículo', 'Scissors', conBloque(openDespiece), { d: 'Partir en paneles, tapar leyendas y señalar', oculto: () => !figura() }),
      peque('encuadrar', 'Encuadrar', 'Crop', conBloque(openRecorte), { d: 'Recorte y zoom', oculto: () => !figura() }),
      peque('escala', 'Barra de escala', 'Ruler', conBloque(openEscala), { d: 'Barra de escala de micrografía', oculto: () => !figura() })),
    grupoC('Aparición',
      inter('por-pasos', 'Por pasos', 'Footprints', conBloque(x => { x.step = !x.step; commit(); }), () => { const x = blq(); return !!(x && x.step); }, { d: 'Aparece en su propio paso al presentar' }),
      menuC('efecto', 'Efecto', 'WandSparkles', () => animables().map(a => opc(a.name, conBloque(x => { x.anim = a.id; x.step = true; commit(); }), () => { const x = blq(); return !!x && (x.anim || 'fade') === a.id; }, a.d || '')),
        { d: 'Efecto de entrada' }),
      menuC('velocidad', 'Velocidad', 'Gauge', () => ANIM_VEL.map(v => opc(v.n, conBloque(x => { x.animVel = v.id; commit(); }), () => { const x = blq(); return !!x && (x.animVel || 'normal') === v.id; }, v.ms + ' ms')),
        { d: 'Duración del efecto' })),
    grupoC('Orden',
      peque('subir', 'Subir', 'ArrowUp', () => moveBlock(S.selBlock, -1)),
      peque('bajar', 'Bajar', 'ArrowDown', () => moveBlock(S.selBlock, 1)),
      peque('duplicar-bloque', 'Duplicar', 'CopyPlus', () => dupBlock(S.selBlock), { d: 'Duplicar este bloque' }),
      peque('mover-bloque', 'Mover a…', 'ArrowRightToLine', conBloque(openMoverBloque), { d: 'Llevarlo a otra diapositiva' }),
      peque('eliminar-bloque', 'Eliminar', 'Delete', () => delBlock(S.selBlock), { atajo: 'Supr', d: 'Eliminar este bloque' }))
  ] }];
}

/* ---------- «Archivo» ---------- */
function abreArchivo(ancla) {
  const menu = h('div', { class: 'menu', role: 'menu', 'aria-label': 'Archivo' });
  const item = (ic, etiqueta, sub, fn) => menu.append(h('button', { type: 'button', role: 'menuitem', onclick: () => { closeMenus(); fn(); } },
    h('span', { class: 'mi', 'aria-hidden': 'true' }, icNodo(ic)), h('span', null, etiqueta), sub ? h('span', { class: 'msub' }, sub) : null));
  const sep = () => menu.append(h('div', { class: 'm-sep', role: 'separator' }));
  const titulo = t => menu.append(h('div', { class: 'menu-t', role: 'presentation' }, t));
  item('House', 'Inicio y biblioteca', null, () => wsInicio());
  item('FolderOpen', 'Mis presentaciones…', null, openDecks);
  item('FilePlus', 'Nueva presentación…', 'plantillas', openPlantillas);
  sep();
  item('Save', 'Guardar como…', 'Ctrl+S', saveDeckAs);
  if (S.archivo) item('HardDrive', 'Dejar de guardar en el archivo', S.archivoNombre, sueltaArchivo);
  else item('HardDrive', 'Guardar en un archivo…', 'se mantiene al día solo', eligeArchivo);
  item('Upload', 'Importar proyecto .json…', null, importJSON);
  item('History', 'Copias y recuperación', null, openRecuperacion);
  item('CalendarDays', 'Bitácora del documento…', 'historial por días', openBitacora);
  sep(); titulo('Exportar');
  item('FileText', 'PDF…', 'Ctrl+P', openPdfHelp);
  item('FileSliders', 'PowerPoint (.pptx)', 'texto y tablas editables', exportPPTX);
  item('FileCode', 'Código Beamer (.tex)', 'Overleaf', openTexView);
  item('FilePen', 'Esqueleto de artículo (.tex)', 'afirmaciones → secciones', exportArticulo);
  item('Printer', 'Folleto para repartir…', '2, 3 o 6 por hoja', openFolleto);
  item('NotebookText', 'Guion del orador', 'notas y miniaturas', exportGuion);
  item('FileJson', 'Proyecto (.json)', 'respaldo', () => exportJSON());
  item('Package', 'Kit de defensa (.zip)', 'todo lo del día', kitDefensa);
  item('FileImage', 'Imagen de la diapositiva', 'PNG', exportPNG);
  item('PenTool', 'Figura en SVG científico', 'gráfica o función seleccionada', exportFiguraSVG);
  item('ClipboardList', 'Informe de exportación', 'advertencias por formato', exportInformeExportacion);
  sep();
  item('Info', 'Acerca de Erlen Slides', 'versión y licencia', openEdicion);
  item('HelpCircle', 'Ayuda y atajos', null, () => openHelp());
  showMenu(menu, ancla);
  ancla.setAttribute('aria-expanded', 'true');
  const vigila = new MutationObserver(() => { if (!menu.isConnected) { ancla.setAttribute('aria-expanded', 'false'); vigila.disconnect(); } });
  vigila.observe(document.body, { childList: true });
  const primero = menu.querySelector('button');
  if (primero) primero.focus();
}

/* ---------- montaje y refresco ---------- */
let CINTA = null;
function configCinta() {
  return {
    app: 'slides',
    etiqueta: 'Herramientas de Slides',
    archivo: { etiqueta: 'Archivo', accion: abreArchivo },
    pestanas: [cintaInicio(), cintaInsertar(), cintaDiseno(), cintaDiapositiva(), cintaPresentar(), cintaVista()],
    contextuales: cintaContextual,
    inicial: 'inicio'
  };
}
/* Se llama tras cada cambio de estado o de selección (renderInspector,
   renderAll): la cinta solo refresca estados y la pestaña contextual, sin
   repintar ni perder el foco. */
function actualizaCinta() {
  const host = $('#cinta');
  if (!host) return;
  const on = enCinta();
  host.hidden = !on;
  document.body.classList.toggle('con-cinta', on);
  if (!on) {
    document.body.classList.remove('panel-temporal');
    if (CINTA) { CINTA.destruir(); CINTA = null; }
    return;
  }
  if (!S.deck) return;
  if (!CINTA) CINTA = erlenCinta(host, configCinta());
  else CINTA.actualizar();
  const a = CINTA.elemento.querySelector('.erlen-cinta-archivo');
  if (a && !a.hasAttribute('aria-haspopup')) {
    a.setAttribute('aria-haspopup', 'menu'); a.setAttribute('aria-expanded', 'false');
    a.title = 'Archivo: abrir, guardar, exportar y acerca de';
  }
  const hamb = $('#hambBtn');
  if (hamb) { hamb.title = 'Panel de detalles'; hamb.setAttribute('aria-label', 'Abrir el panel de detalles'); }
}

/* ---------- el panel de detalles (el inspector, abierto desde la cinta) ---------- */
let detallesFoco = null;
function abrePanelLateral(tab, seccion) {
  const body = document.body;
  if (!body.classList.contains('panel-temporal')) detallesFoco = document.activeElement;
  /* Con la cinta, «Insertar» vive solo en la cinta: el panel abre en Diapositiva. */
  S.tab = tab === 'bloque' && !blq() ? 'slide' : tab;
  if (enCinta() && S.tab === 'insert') S.tab = 'slide';
  const yaAbierto = body.classList.contains('panel-temporal');
  if (enCinta()) body.classList.add('panel-temporal');
  renderInspector();
  openDrawer(true);   // en pantallas estrechas, cajón con foco atrapado
  /* En escritorio el panel quita ancho al lienzo: se vuelve a ajustar la diapositiva. */
  if (enCinta() && !yaAbierto && !$('#inspector').classList.contains('open') && S.deck) { S.zoom = null; renderCanvas(); }
  const insp = $('#inspector');
  let destino = null;
  if (seccion) {
    const busca = () => [...insp.querySelectorAll('.igroup')].find(g => { const l = g.querySelector('.panel-label'); return l && l.textContent.trim().startsWith(seccion); });
    let g = busca();
    if (g && g.classList.contains('cerrado')) { const cab = g.querySelector('.g-cab'); if (cab) cab.click(); g = busca(); }
    if (g) { g.scrollIntoView({ block: 'start' }); destino = $$(FOCABLES, g).find(x => !x.classList.contains('g-cab')) || g.querySelector('.g-cab'); }
  }
  if (!insp.classList.contains('open')) (destino || $('#detallesCerrar'))?.focus();
  actualizaCinta();
}
function cierraPanelDetalles() {
  const body = document.body;
  if (!body.classList.contains('panel-temporal')) return;
  body.classList.remove('panel-temporal');
  openDrawer(false);
  renderInspector();
  if (enCinta() && S.deck) { S.zoom = null; renderCanvas(); }
  if (detallesFoco && document.contains(detallesFoco) && !$('#inspector').contains(detallesFoco)) detallesFoco.focus();
  detallesFoco = null;
}
/* Escape dentro del panel de detalles (en escritorio; el cajón móvil tiene el suyo). */
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || !document.body.classList.contains('panel-temporal')) return;
  const insp = $('#inspector');
  if (!insp || insp.classList.contains('open') || $('#modalRoot').firstChild || !insp.contains(e.target)) return;
  e.preventDefault(); e.stopPropagation();
  cierraPanelDetalles();
}, true);

/* ---------- cambiar de disposición ---------- */
function ponDisposicion(id) {
  S.prefs = S.prefs || {};
  S.prefs.barras = id === 'lado' ? 'lado' : 'arriba';
  guardaPrefs();
  document.body.classList.remove('panel-temporal');
  openDrawer(false);
  aplicaDisposicion();
  toast(id === 'lado' ? 'Herramientas en el panel de la derecha' : 'Herramientas arriba, en la cinta');
}
function aplicaDisposicion() {
  actualizaCinta();
  renderInspector();
  /* Cambiar de disposición cambia el ancho disponible: sin volver a ajustar,
     el lienzo se queda con la escala anterior hasta el siguiente redibujo. */
  if (S.deck) { S.zoom = null; renderCanvas(); }
}
