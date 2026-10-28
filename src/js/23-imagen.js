/* ==== 23-imagen.js ==== */
'use strict';
/* ================= encuadre de imágenes =================
   Un recorte con desplazamiento y zoom, como el de una foto de perfil. Se
   guarda el original aparte para poder volver a encuadrar sin pérdida. */

const PROPORCIONES = [['libre', 'Libre', 0], ['169', '16:9', 16 / 9], ['43', '4:3', 4 / 3],
  ['32', '3:2', 3 / 2], ['11', '1:1', 1], ['34', '3:4', 3 / 4]];

function openRecorte(b) {
  const fuente = b.orig || b.src;
  if (!fuente) { toast('Primero elige una imagen'); return; }
  const img = new Image();
  let prop = b.recProp || 'libre';
  let s = 1, s0 = 1, ox = 0, oy = 0, VW = 520, VH = 300, NW = 0, NH = 0;
  const caja = h('div', { class: 'rec-caja' });
  const lienzo = h('img', { class: 'rec-img', src: fuente, alt: '' });
  caja.append(lienzo, h('div', { class: 'rec-rejilla' }));
  const valZ = h('span', { class: 'rec-z' }, '100 %');
  const rngZ = h('input', { type: 'range', min: 100, max: 400, step: 1, value: 100,
    oninput: e => { zoomA(+e.target.value / 100 * s0); } });

  const ajusta = () => {
    s0 = Math.max(VW / NW, VH / NH);
    s = Math.max(s, s0);
    ox = clamp(ox, VW - NW * s, 0);
    oy = clamp(oy, VH - NH * s, 0);
    lienzo.style.width = (NW * s) + 'px';
    lienzo.style.height = (NH * s) + 'px';
    lienzo.style.transform = `translate(${ox}px, ${oy}px)`;
    rngZ.value = String(Math.round(s / s0 * 100));
    valZ.textContent = Math.round(s / s0 * 100) + ' %';
  };
  const zoomA = nuevo => {
    const anterior = s;
    s = clamp(nuevo, s0, s0 * 4);
    const cx = VW / 2, cy = VH / 2;
    ox = cx - (cx - ox) * (s / anterior);
    oy = cy - (cy - oy) * (s / anterior);
    ajusta();
  };
  const dimensiona = () => {
    const r = PROPORCIONES.find(p => p[0] === prop);
    VW = Math.min(560, Math.max(300, (caja.parentElement ? caja.parentElement.clientWidth : 560) - 4));
    VH = (r && r[2]) ? Math.round(VW / r[2]) : Math.round(VW * (NH / NW));
    VH = clamp(VH, 160, 420);
    if (r && !r[2]) VW = Math.min(VW, Math.round(VH * (NW / NH)));
    caja.style.width = VW + 'px'; caja.style.height = VH + 'px';
    s = 0; ox = 0; oy = 0; ajusta();
  };

  caja.addEventListener('pointerdown', ev => {
    ev.preventDefault();
    try { caja.setPointerCapture(ev.pointerId); } catch (e) {}
    const x0 = ev.clientX - ox, y0 = ev.clientY - oy;
    const mueve = e => { ox = e.clientX - x0; oy = e.clientY - y0; ajusta(); };
    const fin = () => { caja.removeEventListener('pointermove', mueve); caja.removeEventListener('pointerup', fin); };
    caja.addEventListener('pointermove', mueve);
    caja.addEventListener('pointerup', fin);
  });
  caja.addEventListener('wheel', e => { e.preventDefault(); zoomA(s * (e.deltaY < 0 ? 1.08 : 0.93)); }, { passive: false });

  const segP = h('div', { class: 'seg seg-4 seg-wrap' });
  PROPORCIONES.forEach(([id, n]) => segP.append(h('button', { class: prop === id ? 'on' : '',
    onclick: e => { prop = id; $$('button', segP).forEach(x => x.classList.remove('on')); e.target.classList.add('on'); dimensiona(); } }, n)));

  const cuerpo = h('div', { class: 'rec-cuerpo' },
    h('div', { class: 'rec-vista' }, caja),
    h('div', null,
      h('span', { class: 'sublabel', style: 'margin:0 0 5px' }, 'Proporción'), segP,
      h('div', { class: 'irow', style: 'margin-top:10px' }, h('label', null, 'Acercar'), valZ), rngZ,
      h('p', { class: 'hint' }, 'Arrastra la imagen para encuadrarla y usa la rueda o el deslizador para acercarla. El original se conserva, así que puedes volver a encuadrar cuando quieras.')));

  const aplica = () => {
    const sx = Math.max(0, -ox / s), sy = Math.max(0, -oy / s);
    const sw = Math.min(NW - sx, VW / s), sh = Math.min(NH - sy, VH / s);
    const MAX = 1600;
    // SVGs have vector detail beyond their nominal viewport (catalog pieces
    // use 100 × 140). Rasterize those at presentation resolution when cropped.
    const factor = MAX / Math.max(sw, sh);
    const k = /^data:image\/svg\+xml[;,]/i.test(fuente) ? factor : Math.min(1, factor);
    const cv = h('canvas'); cv.width = Math.round(sw * k); cv.height = Math.round(sh * k);
    const cx = cv.getContext('2d');
    cx.imageSmoothingQuality = 'high';
    cx.drawImage(img, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
    const jpg = /^data:image\/jpe?g/.test(fuente);
    if (!b.orig) b.orig = fuente;
    b.src = jpg ? cv.toDataURL('image/jpeg', 0.92) : cv.toDataURL('image/png');
    marcaRecorteCatalogo(b, true);
    b.recProp = prop;
    closeModal(); commit();
    toast('Imagen encuadrada', null, { t: 'Deshacer', fn: doUndo });
  };

  img.onload = () => {
    NW = img.naturalWidth || 800; NH = img.naturalHeight || 600;
    openModal({
      title: 'Encuadrar la imagen', size: 'modal-lg', body: cuerpo,
      foot: [
        b.orig ? h('button', { class: 'btn', onclick: () => { b.src = b.orig; delete b.orig; delete b.recProp; marcaRecorteCatalogo(b, false); closeModal(); commit(); toast('Recorte quitado'); } }, 'Quitar el recorte') : null,
        h('button', { class: 'btn', onclick: closeModal }, 'Cancelar'),
        h('button', { class: 'btn btn-pri', onclick: aplica }, 'Aplicar')
      ].filter(Boolean)
    });
    setTimeout(dimensiona, 40);
  };
  img.onerror = () => toast('No se pudo leer la imagen', 'warn');
  img.src = fuente;
}


