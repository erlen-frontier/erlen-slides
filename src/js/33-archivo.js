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
    const mini = renderSlide(S.deck, i, 'thumb', 99);
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
    '<div class="fo-hoja">' + celdas.join('') + '</div></body></html>';
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
    body: h('div', null, cuerpo, h('p', { class: 'hint', style: 'margin-top:12px' },
      'Se descarga un archivo que abres en el navegador e imprimes como PDF. Las versiones de 2 y 3 por hoja llevan renglones para que el comité anote al lado.')),
    foot: [h('button', { class: 'btn', onclick: closeModal }, 'Cancelar')]
  });
}

