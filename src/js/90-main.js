/* ==== 90-main.js ==== */
'use strict';
/* ================= menús flotantes, atajos y arranque ================= */
let _menuLibreCleanup=null;
function closeMenus() { if(_menuLibreCleanup){_menuLibreCleanup();_menuLibreCleanup=null;} $$('.menu,.pop').forEach(m => m.remove()); }
function showMenu(menu, anchor) {
  closeMenus();
  document.body.append(menu);
  const r = anchor.getBoundingClientRect();
  const mw = menu.offsetWidth, mh = menu.offsetHeight;
  let left = Math.min(r.left, window.innerWidth - mw - 10);
  let top = r.bottom + 6;
  if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 6);
  menu.style.left = Math.max(8, left) + 'px';
  menu.style.top = top + 'px';
  menu.style.position = 'fixed';
  let timer,limpia=()=>{};
  const off=e=>{if(!menu.contains(e.target)&&!anchor.contains(e.target))closeMenus();};
  if(window.FloatingUIDOM){const F=window.FloatingUIDOM;
    limpia=F.autoUpdate(anchor,menu,()=>F.computePosition(anchor,menu,{strategy:'fixed',placement:'bottom-start',middleware:[F.offset(6),F.flip({padding:8}),F.shift({padding:8}),F.size({padding:8,apply:({availableHeight,elements})=>{elements.floating.style.maxHeight=Math.max(80,availableHeight)+'px';}})]}).then(({x,y})=>{if(menu.isConnected){menu.style.left=x+'px';menu.style.top=y+'px';}}).catch(()=>{}));
  }
  menu.addEventListener('keydown',e=>{const bs=[...menu.querySelectorAll('button:not([disabled])')];const i=bs.indexOf(document.activeElement);if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeMenus();anchor.focus();}else if((e.key==='ArrowDown'||e.key==='ArrowUp')&&bs.length){e.preventDefault();bs[(i+(e.key==='ArrowDown'?1:-1)+bs.length)%bs.length].focus();}});
  timer=setTimeout(()=>document.addEventListener('mousedown',off),0);
  _menuLibreCleanup=()=>{clearTimeout(timer);document.removeEventListener('mousedown',off);limpia();};
}

function initShortcuts() {
  window.addEventListener('keydown', e => {
    if (P.on || CL.on || (typeof AR !== 'undefined' && AR.on) || (typeof TL !== 'undefined' && TL.on)) return;
    if (wsAbierto()) return;   /* con el inicio abierto, los atajos del editor no actúan */
    if ($('#modalRoot').firstChild) { if(e.key === 'Escape') { e.preventDefault(); closeModal(); } return; }
    const inField = e.target.closest('input,textarea,select,button,a[href],[contenteditable],[role="combobox"],[role="listbox"],[role="slider"],[role="spinbutton"],[role="menuitem"]');
    const mod = e.ctrlKey || e.metaKey;
    if (e.key === 'F5') { e.preventDefault(); startPresent(e.shiftKey); return; }
    if (e.key === 'F9') { e.preventDefault(); alternaConcentracion(); return; }
    if (e.key === 'F7') { e.preventDefault(); alternaCodigo(); return; }
    if (e.key === 'F8') { e.preventDefault(); openPendientes(); return; }
    if (mod && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); e.shiftKey ? doRedo() : doUndo(); return; }
    if (mod && e.key === 'y') { e.preventDefault(); doRedo(); return; }
    if (mod && (e.key === 'd' || e.key === 'D')) { e.preventDefault(); dupSlide(S.cur); return; }
    /* Sin Mayús: Ctrl+Shift+M es la mirada (más abajo). */
    if (mod && !e.shiftKey && (e.key === 'm' || e.key === 'M')) { e.preventDefault(); addSlide('content'); return; }
    if (mod && (e.key === 'p' || e.key === 'P')) { e.preventDefault(); openPdfHelp(); return; }
    if (mod && (e.key === 's' || e.key === 'S')) { e.preventDefault(); saveDeckAs(); return; }
    if (mod && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); openPaleta(); return; }
    if (mod && (e.key === 'j' || e.key === 'J')) { e.preventDefault(); alternaAsistente(); return; }
    if (mod && e.shiftKey && (e.key === 'b' || e.key === 'B')) { e.preventDefault(); ponDisposicion(enCinta() ? 'lado' : 'arriba'); return; }
    if (mod && (e.key === 'f' || e.key === 'F')) { e.preventDefault(); openBuscar(); return; }
    if (mod && (e.key === 'g' || e.key === 'G')) { e.preventDefault(); alternaClasificador(); return; }
    if (mod && e.shiftKey && (e.key === 'a' || e.key === 'A')) { e.preventDefault(); alternaArgumento(); return; }
    if (mod && e.shiftKey && (e.key === 'm' || e.key === 'M')) { e.preventDefault(); alternaMirada(); return; }
    if (mod && e.shiftKey && (e.key === 't' || e.key === 'T')) { e.preventDefault(); alternaLineaTiempo(); return; }
    /* Escape cierra la ventana aunque el cursor esté dentro de un campo:
       si no, buscar y reemplazar se queda abierto y hay que ir al ratón. */
    if (e.key === 'Escape' && _focoNodo) { e.preventDefault(); asisQuitaFoco(); return; }
    if (e.key === 'Escape' && $('#modalRoot').firstChild) { e.preventDefault(); closeModal(); return; }
    if (inField) return;
    if ($('#modalRoot').firstChild) return;
    if (curSlide().lienzoLibre && S.selBlock && !mod && !e.altKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      const f = findBlock(S.selBlock);
      if (f && f.slide === curSlide() && !f.block.locked) {
        const p = { ...posicionLibreDe(f.slide, f.block) };
        const dx = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
        const dy = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
        const seleccion = idsSeleccionados();
        if (seleccion.has(f.block.id) && seleccion.size > 1) {
          e.preventDefault();
          if ([...seleccion].some(id => findBlock(id)?.block.locked)) toast('Desbloquea los bloques seleccionados antes de moverlos.', 'warn');
          else if (e.shiftKey) escalaSeleccionLibre(S.deck, f.slide, [...seleccion], 'se', dx + dy > 0 ? 1.02 : 0.98);
          else mueveSeleccionLibre(S.deck, f.slide, [...seleccion], dx, dy);
          return;
        }
        if (e.shiftKey) { p.w = clamp(p.w + dx, 1, 100 - p.x); p.h = clamp(p.h + dy, 1, 100 - p.y); }
        else { p.x = clamp(p.x + dx, 0, 100 - p.w); p.y = clamp(p.y + dy, 0, 100 - p.h); }
        e.preventDefault(); aplicaPosicionLibre(f.block.id, p); return;
      }
    }
    if (e.key === 'Delete' && S.selBlock) {
      e.preventDefault();
      const ids = idsSeleccionados();
      if (curSlide().lienzoLibre && ids.has(S.selBlock) && ids.size > 1) {
        try { aplicaLoteBloques(S.deck, curSlide(), [...ids], 'eliminar'); }
        catch (error) { toast(error.message, 'warn'); }
      } else delBlock(S.selBlock);
      return;
    }
    if (e.key === 'Escape') {
      if (S.sel && S.sel.size) limpiaSeleccion();
      else if (S.selBlock) selectBlock(null);
      else if (document.body.classList.contains('panel-temporal')) cierraPanelDetalles();
      return;
    }
    if (e.key === 'PageDown' && S.cur < S.deck.slides.length - 1) { e.preventDefault(); S.cur++; S.selBlock = null; renderAll(); return; }
    if (e.key === 'PageUp' && S.cur > 0) { e.preventDefault(); S.cur--; S.selBlock = null; renderAll(); return; }
  });
}

function initChrome() {
  const pintaTitulo = deb(() => { renderFilmstrip(); renderCanvas(); }, 350);
  $('#deckTitleInput').addEventListener('input', () => { S.deck.meta.title = $('#deckTitleInput').value; saveInd(); pintaTitulo(); });
  $('#deckTitleInput').addEventListener('change', () => commit());
  $('#undoBtn').addEventListener('click', doUndo);
  $('#redoBtn').addEventListener('click', doRedo);
  $('#addSlideBtn').addEventListener('click', e => {
    const pop = h('div', { class: 'pop' }, h('div', { class: 'lay-grid' },
      LAYOUTS.map(l => h('button', { class: 'lay-opt', onclick: () => { closeMenus(); addSlide(l.id); } }, layoutWire(l.id), h('span', { class: 'lb' }, l.name)))));
    showMenu(pop, e.currentTarget);
  });
  $('#presentBtn').addEventListener('click', e => {
    if (e.shiftKey || e.altKey) { startPresent(false); alternaPresentador(); return; }
    startPresent(false);
  });
  $('#presentBtn').addEventListener('contextmenu', e => {
    e.preventDefault();
    const menu = h('div', { class: 'menu' });
    menu.append(h('button', { onclick: () => { closeMenus(); startPresent(false); } }, h('span', { class: 'mi' }, '▶'), h('span', null, 'Presentar')),
      h('button', { onclick: () => { closeMenus(); startPresent(true); } }, h('span', { class: 'mi' }, '▶'), h('span', null, 'Presentar desde esta diapositiva')),
      h('button', { onclick: () => { closeMenus(); startPresent(false); alternaPresentador(); } }, h('span', { class: 'mi' }, '▤'), h('span', null, 'Con vista de presentador')),
      h('button', { onclick: () => { closeMenus(); presentaEnsayo(); } }, h('span', { class: 'mi' }, '⏱'), h('span', null, 'Ensayar con cronómetro'), h('span', { class: 'msub' }, 'mide tu tiempo real')));
    showMenu(menu, e.currentTarget);
  });
  $('#exportBtn').addEventListener('click', e => openExport(e.currentTarget));
  const mkItem = menu => (ic, label, sub, fn) => menu.append(h('button', { onclick: () => { closeMenus(); fn(); pistaAtajo(leeAtajo(sub), label); } },
    h('span', { class: 'mi' }, ic), h('span', null, label), sub ? h('span', { class: 'msub' }, sub) : null));
  function fileMenu(anchor) {
    const menu = h('div', { class: 'menu' }), item = mkItem(menu);
    item('▤', 'Mis presentaciones…', null, openDecks);
    item('⤓', 'Guardar como…', 'Ctrl+S', saveDeckAs);
    item('↶', 'Copias y recuperación', null, openRecuperacion);
    menu.append(h('div', { class: 'm-sep' }));
    item('✦', 'Nueva presentación…', 'plantillas', openPlantillas);
    item('↥', 'Importar proyecto .json…', null, importJSON);
    if (S.archivo) item('⏺', 'Dejar de guardar en el archivo', S.archivoNombre, sueltaArchivo);
    else item('⤓', 'Guardar en un archivo del disco…', 'se mantiene al día solo', eligeArchivo);
    menu.append(h('div', { class: 'm-sep' }));
    item('◆', 'Estilos…', 'tema, color, tipografía', openEstilos);
    item('◔', 'Pendientes…', 'F8', openPendientes);
    item('⚗', 'Calidad científica…', null, openCalidadCientifica);
    item('◷', 'Bitácora del documento…', 'historial por días', openBitacora);
    item('∑', 'Ver el código de esta diapositiva', 'F7', () => alternaCodigo(true));
    item('⛶', 'Modo concentración', 'F9', () => alternaConcentracion());
    item('⌕', 'Buscar y reemplazar…', 'Ctrl+F', () => openBuscar());
    item('⌘', 'Ir a / hacer…', 'Ctrl+K', openPaleta);
    showMenu(menu, anchor);
  }
  $('#decksBtn').addEventListener('click', e => fileMenu(e.currentTarget));
  $('#moreBtn').addEventListener('click', e => {
    const menu = h('div', { class: 'menu' }), item = mkItem(menu);
    item('▶', 'Presentar con vista de presentador', 'o tecla P al presentar', () => { startPresent(false); alternaPresentador(); });
    menu.append(h('div', { class: 'm-sep' }));
    item('▤', 'Mis presentaciones…', null, openDecks);
    item('⤓', 'Guardar como…', null, saveDeckAs);
    item('↶', 'Copias y recuperación', null, openRecuperacion);
    item('⟲', 'Deshacer', 'Ctrl+Z', doUndo);
    item('⟳', 'Rehacer', 'Ctrl+Shift+Z', doRedo);
    item('✦', 'Nueva presentación…', null, openPlantillas);
    item('↥', 'Importar proyecto .json…', null, importJSON);
    menu.append(h('div', { class: 'm-sep' }));
    item('⌘', 'Ir a / hacer…', 'Ctrl+K', openPaleta);
    item('⌕', 'Buscar y reemplazar…', 'Ctrl+F', () => openBuscar());
    item('◆', 'Estilos…', null, openEstilos);
    item('⚗', 'Calidad científica…', null, openCalidadCientifica);
    menu.append(h('div', { class: 'm-sep' }));
    item('▤', 'Exportar a PDF', null, openPdfHelp);
    item('∑', 'Código Beamer (.tex)', null, openTexView);
    item('{}', 'Proyecto (.json)', null, () => exportJSON());
    item('▣', 'Imagen de esta diapositiva', null, exportPNG);
    item('⌁', 'SVG científico', null, exportFiguraSVG);
    item('⚗', 'Informe de exportación', null, exportInformeExportacion);
    menu.append(h('div', { class: 'm-sep' }));
    const ap = S.prefs.tema;
    item(ap === 'claro' ? '☀' : ap === 'oscuro' ? '☾' : '◐', 'Apariencia del editor',
      ap === 'claro' ? 'clara' : ap === 'oscuro' ? 'oscura' : 'la del sistema',
      () => cambiaTemaApp(ap === 'auto' ? 'claro' : ap === 'claro' ? 'oscuro' : 'auto'));
    item('✦', 'Asistente', null, alternaAsistente);
    item('⌂', 'Inicio y biblioteca', null, wsInicio);
    item('?', 'Ayuda y atajos', null, openHelp);
    showMenu(menu, e.currentTarget);
  });
  $('#helpBtn').addEventListener('click', openHelp);
  $('#asisBtn').addEventListener('click', () => alternaAsistente());
  if (typeof aplicaDisposicion === 'function') aplicaDisposicion();
  $('#temaBtn').addEventListener('click', e => {
    const menu = h('div', { class: 'menu' });
    [['auto', '◐', 'La del sistema'], ['claro', '☀', 'Clara'], ['oscuro', '☾', 'Oscura']].forEach(([v, ic, n]) =>
      menu.append(h('button', { class: S.prefs.tema === v ? 'on' : '', onclick: () => { closeMenus(); cambiaTemaApp(v); } },
        h('span', { class: 'mi' }, ic), h('span', null, n))));
    showMenu(menu, e.currentTarget);
  });
  $('#buscarBtn').addEventListener('click', () => openBuscar());
  $('#zoomIn').addEventListener('click', () => { S.zoom = clamp((S.zoom || effZoom()) * 1.2, 0.1, 3); renderCanvas(); });
  $('#zoomOut').addEventListener('click', () => { S.zoom = clamp((S.zoom || effZoom()) / 1.2, 0.1, 3); renderCanvas(); });
  $('#zoomFit').addEventListener('click', () => { S.zoom = null; renderCanvas(); });
  $('#sorterBtn').addEventListener('click', alternaClasificador);
  $('#prepInd').addEventListener('click', () => openRevision());
  $('#concBtn').addEventListener('click', () => alternaConcentracion());
  $$('.itab').forEach(t => t.addEventListener('click', () => {
    S.tab = t.dataset.tab;
    $$('.itab').forEach(x => { const activo = x === t; x.classList.toggle('on', activo); x.setAttribute('aria-selected', String(activo)); x.tabIndex = activo ? 0 : -1; });
    renderInspector(); openDrawer(true);
  }));
  $('.insp-tabs').addEventListener('keydown',e=>{
    const tabs=$$('.itab').filter(t=>!t.hidden),i=tabs.indexOf(document.activeElement);
    if(i<0)return;let next=null;
    if(e.key==='ArrowRight')next=tabs[(i+1)%tabs.length];
    if(e.key==='ArrowLeft')next=tabs[(i+tabs.length-1)%tabs.length];
    if(e.key==='Home')next=tabs[0];if(e.key==='End')next=tabs[tabs.length-1];
    if(next){e.preventDefault();next.click();next.focus();}
  });
  /* Con la cinta, el botón del cajón abre el panel de detalles en la pestaña actual. */
  $('#hambBtn').addEventListener('click', () => {
    if (detallesEstado()) cierraDrawer();
    else if (enCinta()) abrePanelLateral(S.tab);
    else openDrawer(true);
  });
  window.addEventListener('resize', deb(() => {
    const movil = matchMedia('(max-width:920px)').matches;
    if (!movil) openDrawer(false);
    /* Al pasar a móvil, un panel de detalles abierto en columna no se queda
       medio visible: se cierra, y el botón del cajón lo vuelve a abrir. */
    else if (document.body.classList.contains('panel-temporal') && detallesEstado() !== 'cajon') cierraPanelDetalles();
    renderFilmstrip(); renderCanvas();
  }, 150));
  window.addEventListener('beforeunload', () => { flushEdicion(); saveInd.now(); });
}
let drawerFoco = null;
/* Cerrar el cajón: con la cinta, también se cierra el panel de detalles. */
function cierraDrawer() {
  if (document.body.classList.contains('panel-temporal')) cierraPanelDetalles();
  else openDrawer(false);
}
/* Estado real del panel de detalles según el marco: el cajón accesible en pantallas
   estrechas o la columna de detalles a todo ancho. El marco cierra su cajón también por
   su cuenta (su ✕, su máscara o Escape), y estos caminos se reflejan abajo en la escucha
   de captura, así que la app y el marco nunca llevan estados distintos. */
function detallesEstado() {
  const insp = $('#inspector');
  if (!insp) return null;
  if (window.matchMedia('(max-width:920px)').matches) return insp.closest('.erlen-marco-cajon') ? 'cajon' : null;
  return insp.closest('.erlen-marco-cuerpo')?.classList.contains('con-detalles') ? 'columna' : null;
}
/* El marco enseña u oculta el panel (abrirDetalles/cerrarDetalles) según el estado de la
   app: idempotente, y conserva la selección y el foco del editor al mover los nodos. */
function sincronizaDetalles() {
  if (!MARCO) return;
  const movil = window.matchMedia('(max-width:920px)').matches;
  const visible = movil ? $('#inspector').classList.contains('open') : (!enCinta() || document.body.classList.contains('panel-temporal'));
  const deseado = visible ? (movil ? 'cajon' : 'columna') : null;
  if (detallesEstado() === deseado) return;
  if (deseado) MARCO.abrirDetalles(); else MARCO.cerrarDetalles();
}
function openDrawer(on) {
  const movil = window.matchMedia('(max-width:920px)').matches;
  on = !!on && movil;
  const panel = $('#inspector');
  const antes = panel.classList.contains('open');
  panel.classList.toggle('open', on);
  $('#hambBtn').setAttribute('aria-expanded', String(on));
  sincronizaDetalles();
  if (on) {
    if (!antes) drawerFoco = document.activeElement;
  } else if (antes && drawerFoco && document.contains(drawerFoco)) drawerFoco.focus();
}
document.addEventListener('keydown', e => {
  const panel = $('#inspector');
  if (!panel?.classList.contains('open') || $('#modalRoot').firstChild) return;
  /* Escape cierra solo el cajón: no suelta además el bloque seleccionado. Se escucha en
     captura para que el estado del panel quede al día antes de que el cajón del marco —
     que también lo cierra— procese la tecla. */
  if (e.key === 'Escape') { e.preventDefault(); cierraDrawer(); }
}, true);
/* El cajón del marco se cierra también con su ✕ o su máscara, y su botón de navegación lo
   sustituye por el otro cajón: en captura se devuelve el panel a su estado de la app. */
document.addEventListener('click', e => {
  const t = e.target;
  if (!(t instanceof Element) || !$('#inspector')?.classList.contains('open')) return;
  if (t.closest('.erlen-marco-cajon-cerrar') || t.closest('.erlen-marco-mascara')) cierraDrawer();
  else if (t.closest('.erlen-marco-abrir-cajon')) openDrawer(false);
}, true);

/* ---------- arranque ---------- */
function boot() {
  montaMarco();
  S.prefs = cargaPrefs();
  aplicaTemaApp();
  const auto = lsGet(LS_AUTO, null);
  S.respaldoId = null;
  let rescatado = null, sitio = null;
  if (auto && auto.deck && Array.isArray(auto.deck.slides) && auto.deck.slides.length) {
    /* Si el saneador tropieza, la aplicación no puede quedarse en blanco: el autoguardado se
       relee en cada arranque, así que el fallo sería permanente y sin salida. Se sigue con una
       presentación nueva y se guarda el original aparte para poder rescatarlo. */
    try {
      const r = saneaDeck(auto.deck);
      if (r.deck) { S.deck = r.deck; S.deckName = auto.deckName || null; S.respaldoId = typeof auto.respaldoId === 'string' && auto.respaldoId.length<200 ? auto.respaldoId : null; rescatado = r.avisos; sitio = auto.sitio || null; }
    } catch (e) {
      S.autoRoto = auto;
      console.error('No se pudo abrir el autoguardado', e);
    }
  }
  /* La primera vez se abre en blanco: una portada limpia y nada más. El ejemplo
     científico y las plantillas piloto están en Archivo → plantillas. */
  if (!S.deck) { S.deck = blankDeck(); S.deck.meta.theme = 'revista'; }
  /* compatibilidad hacia adelante */
  S.deck.meta = Object.assign({ theme: 'metropolis', aspect: '169', numbers: true, footline: true, title: '' }, S.deck.meta || {});
  S.deck.meta.pie = pieDe(S.deck.meta);
  S.deck.meta.notas = notasDe(S.deck.meta);
  if (!THEMES[S.deck.meta.theme]) S.deck.meta.theme = 'metropolis';
  S.deck.slides.forEach(sl => { sl.blocks = sl.blocks || []; if (sl.layout === 'twocol') sl.blocks2 = sl.blocks2 || []; });
  snapNow();
  initChrome();
  initCanvasEvents();
  initShortcuts();
  initPresentTouch();
  initEntrada();
  initWake();
  initPistas();
  initHistoria();
  aplicaTemaApp();
  /* Volver al punto exacto: la gente ya quiere retomar, solo hay que dejarla. */
  const retomado = aplicaSitio(sitio);
  arrancaSesion();
  renderAll();
  const el = $('#saveInd'); if (el) { el.textContent = 'Guardado aquí ✓'; el.classList.add('on'); }
  if (retomado) setTimeout(() => avisaRetomado(sitio, auto && auto.when), 700);
  if (rescatado && rescatado.length) setTimeout(() => openAvisosImport(rescatado), 400);
  avisaAutoRoto();
  wsInit();
  recInicia();
  cienciaIconos();
}

/* Lo que no se pudo abrir se ofrece en crudo: es el trabajo del usuario y no se tira en
   silencio por mucho que la aplicación no sepa leerlo. */
function avisaAutoRoto() {
  if (!S.autoRoto) return;
  const roto = S.autoRoto;
  S.autoRoto = null;
  toast('No se pudo abrir lo último que tenías; se ha empezado de cero.', 'warn');
  setTimeout(() => openModal({
    title: 'No se pudo abrir tu presentación', size: 'modal-sm',
    body: h('div', null,
      h('p', null, 'Lo guardado en este navegador tiene algo que la aplicación no ha sabido leer, ' +
        'así que se ha abierto una presentación nueva para no dejarte con la pantalla en blanco.'),
      h('p', null, 'Tu trabajo sigue ahí. Descárgalo en crudo y podrás recuperarlo cuando esto esté corregido.')),
    foot: [
      h('button', { class: 'btn', onclick: () => closeModal() }, 'Ahora no'),
      h('button', { class: 'btn', onclick: openRecuperacion }, 'Buscar versiones anteriores'),
      h('button', { class: 'btn btn-pri', onclick: () => {
        downloadFile('erlen-rescate.json', JSON.stringify(roto, null, 1), 'application/json');
        closeModal();
      } }, 'Descargar lo que había')
    ]
  }), 700);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
