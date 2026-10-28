/* ==== 33-archivo.js ==== */
'use strict';
/* ================= respaldo a un archivo y folletos ================= */

/* ---------- respaldo a un archivo del disco ----------
   El autoguardado vive en el navegador y se pierde si se limpian los datos.
   Con permiso del navegador, el proyecto se escribe también en un .json de
   verdad y se mantiene al día solo. */
const hayArchivoAPI = () => typeof window.showSaveFilePicker === 'function';

async function eligeArchivo() {
  if (!hayArchivoAPI()) {
    toast('Este navegador no deja escribir archivos directamente; usa Exportar → Proyecto (.json)', 'warn');
    return;
  }
  try {
    S.archivo = await window.showSaveFilePicker({
      suggestedName: deckSlug() + '.json',
      types: [{ description: 'Proyecto de Tabula', accept: { 'application/json': ['.json'] } }]
    });
    S.archivoNombre = S.archivo.name;
    await escribeArchivo();
    actualizaIndicadorArchivo();
    toast('Se guardará también en «' + S.archivoNombre + '»');
  } catch (e) {
    if (e && e.name === 'AbortError') return;
    toast('No se pudo abrir el archivo', 'warn');
  }
}
async function escribeArchivo() {
  if (!S.archivo) return false;
  const archivo = S.archivo;
  const datos = JSON.stringify(S.deck, null, 2);
  try {
    const w = await archivo.createWritable();
    await w.write(datos);
    await w.close();
    return true;
  } catch (e) {
    if (S.archivo !== archivo) return false;
    S.archivo = null;
    actualizaIndicadorArchivo();
    toast('Se perdió el permiso sobre el archivo; vuelve a elegirlo', 'warn');
    return false;
  }
}
const guardaArchivo = deb(() => { escribeArchivo(); }, 1200);
function sueltaArchivo() { S.archivo = null; S.archivoNombre = null; actualizaIndicadorArchivo(); toast('Se dejó de escribir en el archivo'); }
function actualizaIndicadorArchivo() {
  const el = $('#saveInd');
  if (!el) return;
  el.title = S.archivo ? 'También se guarda en ' + S.archivoNombre : 'Guardado en este navegador';
  el.classList.toggle('con-archivo', !!S.archivo);
}

/* El escritorio conserva solo un identificador opaco; la ruta vive en Rust.
   Una generación distingue un documento nuevo incluso tras deshacer/rehacer. */
let archivoEscritorioActual = null, generacionArchivoEscritorio = 0, operacionArchivoEscritorio = false, ultimoGuardadoLocal = true, archivoNuevoInicial = null;
let campoArchivoActivo = null;
const hayEscritorio = () => typeof window.__TAURI__?.core?.invoke === 'function';
function liberaArchivoEscritorio(ref) {
  if (!ref || !hayEscritorio()) return;
  window.__TAURI__.core.invoke('cerrar_archivo_proyecto', {id: ref.id}).catch(() => {});
}
function olvidaArchivoEscritorio() {
  const anterior = archivoEscritorioActual;
  archivoEscritorioActual = null;
  archivoNuevoInicial = null;
  generacionArchivoEscritorio++;
  liberaArchivoEscritorio(anterior);
}
function marcaArchivoNuevo() {
  archivoNuevoInicial = JSON.stringify(S.deck);
  actualizaEstadoArchivoEscritorio();
}
function recuperaEstadoArchivoNuevo(auto) {
  if (!auto || auto.archivoNuevoSinCambios === true) marcaArchivoNuevo();
}
function escrituraPendienteEnLienzo() {
  return typeof rawEl !== 'undefined' && rawEl?.isConnected &&
    rawEl.innerText.replace(/\n$/, '') !== getRaw(rawEl.dataset.ek);
}
/* Algunos controles del inspector actualizan el modelo al perder el foco. */
function terminaEdicionArchivo() {
  const activo = document.activeElement;
  if (activo?.matches?.('input:not([type=button]):not([type=submit]), textarea, select')) activo.blur();
  flushEdicion();
}
/* Añadir valores por defecto es inocuo; cambiar o descartar valores del
   archivo no lo es. Compara iterativamente para admitir datos anidados. */
function archivoPierdeDatos(original, abierto) {
  const pendientes = [[original, abierto]];
  while (pendientes.length) {
    const [a, b] = pendientes.pop();
    if (a === null || typeof a !== 'object') { if (a !== b) return true; continue; }
    if (!b || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return true;
    if (Array.isArray(a) && a.length !== b.length) return true;
    for (const k of Object.keys(a)) {
      if (!Object.hasOwn(b, k)) return true;
      pendientes.push([a[k], b[k]]);
    }
  }
  return false;
}
function archivoEscritorioPendiente() {
  if (!hayEscritorio() || !S.deck) return false;
  if (campoArchivoActivo?.elemento === document.activeElement && campoArchivoActivo.valor !== campoArchivoActivo.elemento.value) return true;
  if (escrituraPendienteEnLienzo()) return true;
  if (!archivoEscritorioActual) return archivoNuevoInicial === null || JSON.stringify(S.deck) !== archivoNuevoInicial;
  return archivoEscritorioActual.requiereGuardarComo || JSON.stringify(S.deck) !== archivoEscritorioActual.guardado;
}
function actualizaEstadoArchivoEscritorio(localOk) {
  if (!hayEscritorio() || !S.deck) return;
  if (typeof localOk === 'boolean') ultimoGuardadoLocal = localOk;
  const el = $('#saveInd'); if (!el) return;
  if (!ultimoGuardadoLocal) { el.textContent = 'Error de guardado local'; el.title = 'La copia local no se pudo guardar. Guarda el proyecto en un archivo.'; el.classList.remove('on'); return; }
  const pendiente = archivoEscritorioPendiente();
  el.textContent = archivoEscritorioActual ? (pendiente ? 'Cambios sin guardar' : 'Archivo guardado ✓') : 'Guardado aquí · sin archivo';
  el.title = archivoEscritorioActual ? (pendiente ? 'Hay cambios pendientes en «' : 'Guardado en «') + archivoEscritorioActual.nombre + '»' : 'La copia local se guarda en Tabula. Usa Guardar para crear un archivo.';
  el.classList.toggle('on', !pendiente);
}
function confirmaCambioArchivo() {
  if (!hayEscritorio() || !archivoEscritorioPendiente()) return true;
  return confirm('Hay cambios que no se han guardado en un archivo. ¿Cambiar de presentación de todos modos?');
}
function confirmaSalidaArchivo(ventana = null) {
  if ($('#modalRoot')?.firstChild) { toast('Termina o cancela el diálogo abierto antes de cerrar.', 'warn'); return false; }
  terminaEdicionArchivo();
  saveInd.now();
  if (operacionArchivoEscritorio || guardandoProyectoEscritorio) { toast('Espera a que termine la operación de archivo antes de cerrar.', 'warn'); return false; }
  if (!archivoEscritorioPendiente()) return true;
  openModal({title:'Cambios sin guardar', size:'modal-sm',
    body:h('p', null, 'Hay cambios que todavía no se han guardado en un archivo. Puedes seguir editando para guardarlos antes de cerrar.'),
    foot:[h('button', {class:'btn', onclick:closeModal}, 'Seguir editando'),
      h('button', {class:'btn btn-danger', onclick:() => {
        closeModal();
        if (!ventana?.destroy) { toast('No se pudo cerrar la ventana.', 'warn'); return; }
        ventana.destroy().catch(() => toast('No se pudo cerrar la ventana.', 'warn'));
      }}, 'Cerrar sin guardar')]});
  return false;
}
function instalaCierreNativo() {
  if (!hayEscritorio()) return;
  const win = window.__TAURI__?.window?.getCurrentWindow?.();
  if (!win?.onCloseRequested) return;
  win.onCloseRequested(e => { if (!confirmaSalidaArchivo(win)) e.preventDefault(); }).catch(() => {
    toast('No se pudo activar el aviso al cerrar. Guarda una copia del proyecto.', 'warn');
  });
  document.addEventListener('focusin', e => {
    if (e.target?.matches?.('input:not([type=button]):not([type=submit]), textarea, select')) campoArchivoActivo = {elemento:e.target, valor:e.target.value};
  });
  document.addEventListener('input', e => {
    if ((rawEl && e.target === rawEl) || e.target === campoArchivoActivo?.elemento) actualizaEstadoArchivoEscritorio();
  });
  document.addEventListener('focusout', e => { if (e.target === campoArchivoActivo?.elemento) { campoArchivoActivo = null; actualizaEstadoArchivoEscritorio(); } });
}
async function abrirProyectoEscritorio() {
  if (!hayEscritorio()) return importJSON();
  if (operacionArchivoEscritorio || guardandoProyectoEscritorio) { toast('Ya hay una operación de archivo abierta', 'warn'); return; }
  terminaEdicionArchivo();
  const generacion = generacionArchivoEscritorio, anterior = JSON.stringify(S.deck);
  operacionArchivoEscritorio = true;
  let ref = null;
  try {
    ref = await window.__TAURI__.core.invoke('abrir_archivo_proyecto');
    if (!ref) return;
    terminaEdicionArchivo();
    if (generacion !== generacionArchivoEscritorio || JSON.stringify(S.deck) !== anterior) {
      toast('La presentación cambió mientras se elegía el archivo. Vuelve a abrirlo.', 'warn'); return;
    }
    let bruto;
    try { bruto = JSON.parse(ref.contenido); } catch { throw new Error('El archivo no es un JSON válido.'); }
    const comprobado = saneaDeck(bruto);
    if (comprobado.error) throw new Error(comprobado.error);
    if (!confirmaCambioArchivo() || !wsConservar()) return;
    if (!cargaSegura(bruto, null, true)) return;
    const ajustado = archivoPierdeDatos(bruto, S.deck);
    archivoEscritorioActual = {id: ref.id, nombre: ref.nombre, guardado: JSON.stringify(S.deck), requiereGuardarComo: ajustado};
    ref = null;
    actualizaEstadoArchivoEscritorio();
    if (wsAbierto()) wsCerrar();
    if (ajustado) openAvisosImport([...(comprobado.avisos || []), 'Algunos datos del archivo necesitaron ajustes. Usa Guardar como para conservar el original.']);
  } catch (e) {
    toast('No se pudo abrir el proyecto. ' + String(e?.message || e), 'warn');
  } finally {
    liberaArchivoEscritorio(ref);
    operacionArchivoEscritorio = false;
  }
}
async function guardarProyectoEscritorio(como = false) {
  if (!hayEscritorio()) return saveDeckAs();
  if (operacionArchivoEscritorio || guardandoProyectoEscritorio) { toast('Ya hay una operación de archivo abierta', 'warn'); return; }
  terminaEdicionArchivo();
  const generacion = generacionArchivoEscritorio, anterior = archivoEscritorioActual;
  const contenido = JSON.stringify(S.deck, null, 2), guardado = JSON.stringify(S.deck);
  operacionArchivoEscritorio = true;
  let ref = null;
  try {
    if (como || !anterior || anterior.requiereGuardarComo) {
      ref = await window.__TAURI__.core.invoke('guardar_archivo_proyecto_como', {nombre: deckSlug() + '.json', contenido});
      if (!ref) return;
    } else {
      await window.__TAURI__.core.invoke('guardar_archivo_proyecto', {id: anterior.id, contenido});
      ref = anterior;
    }
    if (generacion !== generacionArchivoEscritorio || archivoEscritorioActual !== anterior) {
      if (ref !== anterior) liberaArchivoEscritorio(ref);
      toast('Se guardó la presentación anterior; la presentación abierta no cambió.', 'warn'); return;
    }
    if (ref !== anterior) liberaArchivoEscritorio(anterior);
    archivoEscritorioActual = {id: ref.id, nombre: ref.nombre, guardado};
    terminaEdicionArchivo();
    actualizaEstadoArchivoEscritorio();
    if (archivoEscritorioPendiente()) toast('Se guardó una versión anterior; hay cambios posteriores sin incluir.', 'warn');
    else toast('Proyecto guardado en «' + ref.nombre + '»');
  } catch (e) {
    window.ErlenDiagnostico?.reportar('guardar-proyecto');
    toast('No se pudo guardar el proyecto. ' + String(e?.message || e), 'warn');
    actualizaEstadoArchivoEscritorio();
  } finally { operacionArchivoEscritorio = false; }
}

/* ---------- folletos ---------- */
const FOLLETOS = [
  { n: 2, lb: '2 por hoja', d: 'Grandes, con espacio amplio para anotar al lado.' },
  { n: 3, lb: '3 por hoja', d: 'El clásico de congreso: miniatura y renglones a la derecha.' },
  { n: 6, lb: '6 por hoja', d: 'Compacto, para repartir la presentación completa.' }
];
function folletoHTML(porHoja) {
  const [W, H] = slideDims(S.deck);
  const wb = $('#workbench'); wb.innerHTML = '';
  const ancho = porHoja === 6 ? 250 : porHoja === 3 ? 300 : 430;
  const k = ancho / W;
  const celdas = S.deck.slides.map((sl, i) => {
    const clip = h('div', { class: 'fo-mini', style: `width:${ancho}px;height:${Math.round(H * k)}px` });
    const mini = renderSlide(S.deck, i, 'thumb', 99, {imagenOriginal:true});
    mini.style.transform = `scale(${k})`; mini.style.transformOrigin = 'top left';
    clip.append(mini);
    const renglones = h('div', { class: 'fo-lin' });
    const nl = porHoja === 6 ? 0 : porHoja === 3 ? 6 : 9;
    for (let r = 0; r < nl; r++) renglones.append(h('i'));
    const cel = h('div', { class: 'fo-cel' }, h('span', { class: 'fo-n' }, String(i + 1)), clip, nl ? renglones : null);
    wb.append(cel);
    return cel.outerHTML;
  });
  const css = collectCSS();
  wb.innerHTML = '';
  const m = S.deck.meta;
  return '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Folleto · ' + esc(m.title || 'Presentación') +
    '</title><style>' + css + '</style><style>' +
    '@page{size:letter portrait;margin:12mm}' +
    'html,body{margin:0;background:#fff;color:#15181C;font:13px/1.5 system-ui,-apple-system,sans-serif}' +
    '.fo-cab{padding:0 0 10px;border-bottom:1.5px solid #15181C;margin-bottom:14px}' +
    '.fo-cab h1{margin:0 0 2px;font-size:17px}.fo-cab p{margin:0;color:#5A6470;font-size:12px}' +
    '.fo-hoja{display:grid;gap:' + (porHoja === 6 ? '10px 16px' : '14px') + ';' +
      'grid-template-columns:' + (porHoja === 6 ? 'repeat(2,1fr)' : '1fr') + '}' +
    '.fo-cel{display:' + (porHoja === 6 ? 'block' : 'flex') + ';gap:14px;align-items:flex-start;' +
      'break-inside:avoid;page-break-inside:avoid;padding-bottom:' + (porHoja === 6 ? '4px' : '8px') + '}' +
    '.fo-n{font:700 11px ui-monospace,monospace;color:#8A94A0;flex:none;width:18px;text-align:right;padding-top:3px}' +
    '.fo-mini{overflow:hidden;border:1px solid #C9D0D8;border-radius:4px;position:relative;background:#fff;flex:none}' +
    '.fo-lin{flex:1;min-width:0;padding-top:6px}' +
    '.fo-lin i{display:block;height:22px;border-bottom:1px solid #DDE2E8}' +
    '.tip{font:12.5px system-ui;background:#161A26;color:#fff;padding:9px 15px;text-align:center;margin:-12mm -12mm 12px}' +
    '@media print{.tip{display:none}}</style></head><body>' +
    '<div class="tip">Imprime este archivo (Ctrl+P / Cmd+P) y elige «Guardar como PDF».</div>' +
    '<div class="fo-cab"><h1>' + esc(m.title || 'Presentación') + '</h1><p>' +
    esc([m.authors, m.date].filter(Boolean).join(' · ')) + (m.authors || m.date ? ' · ' : '') +
    S.deck.slides.length + ' diapositivas · ' + porHoja + ' por hoja</p></div>' +
    '<div class="fo-hoja">' + celdas.join('') + '</div>' + scriptAjustesFiguras() + '</body></html>';
}
function openFolleto() {
  const cuerpo = h('div', { class: 'fo-grid' });
  FOLLETOS.forEach(f => cuerpo.append(h('button', { class: 'pl-card', onclick: () => {
    closeModal();
    downloadFile(deckSlug() + '-folleto-' + f.n + '.html', folletoHTML(f.n), 'text/html;charset=utf-8');
    toast('Folleto listo: ábrelo e imprímelo como PDF');
  } }, h('span', { class: 'pl-ic' }, '▤'), h('span', { class: 'pl-n' }, f.lb), h('span', { class: 'pl-d' }, f.d))));
  openModal({
    title: 'Folleto para repartir', size: 'modal-sm',
    body: h('div', null, cuerpo, avisoCreditosCatalogo(), h('p', { class: 'hint', style: 'margin-top:12px' },
      'Se descarga un archivo que abres en el navegador e imprimes como PDF. Las versiones de 2 y 3 por hoja llevan renglones para que el comité anote al lado.')),
    foot: [h('button', { class: 'btn', onclick: closeModal }, 'Cancelar')]
  });
}

