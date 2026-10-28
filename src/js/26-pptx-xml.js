/* ==== 26-pptx-xml.js ==== */
'use strict';
/* ================= exportación a PowerPoint =================
   Se arma el .pptx a mano (OOXML dentro de un ZIP), sin librerías externas.
   La posición de cada elemento se lee de la propia diapositiva ya dibujada,
   así que el resultado coincide con lo que se ve en la app. El texto y las
   tablas quedan editables; ecuaciones, gráficas y diagramas van como imagen
   porque PowerPoint no tiene equivalente. */

const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
  'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
const EMU_PULG = 914400;
/* Tipografías seguras: las de LaTeX no están instaladas en cualquier equipo. */
const FUENTE_PPTX = { lm: 'Times New Roman', termes: 'Times New Roman', stix: 'Times New Roman',
  pagella: 'Cambria', schola: 'Cambria', heros: 'Arial', lmsans: 'Arial', fira: 'Calibri', source: 'Calibri' };

/* El navegador devuelve los colores en varias formas: rgb(), rgba(),
   color(srgb …) cuando hay color-mix, o #hex. Se normalizan a canal 0-255
   y opacidad, para poder aplanarlos sobre el fondo de la diapositiva. */
function leeColor(c) {
  const t = String(c == null ? '' : c).trim();
  let m = /rgba?\(([^)]+)\)/.exec(t);
  if (m) {
    const v = m[1].split(/[,\s/]+/).filter(Boolean).map(parseFloat);
    return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 };
  }
  m = /color\(\s*srgb\s+([^)]+)\)/.exec(t);
  if (m) {
    const v = m[1].split(/[\s/]+/).filter(Boolean).map(parseFloat);
    return { r: v[0] * 255, g: v[1] * 255, b: v[2] * 255, a: v.length > 3 ? v[3] : 1 };
  }
  m = /^#?([0-9a-f]{6})$/i.exec(t);
  if (m) return { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4), 16), a: 1 };
  m = /^#([0-9a-f]{3})$/i.exec(t);
  if (m) return { r: parseInt(m[1][0] + m[1][0], 16), g: parseInt(m[1][1] + m[1][1], 16), b: parseInt(m[1][2] + m[1][2], 16), a: 1 };
  return null;
}
const _hx = v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0').toUpperCase();
/* Color aplanado sobre un fondo, porque PowerPoint pinta sin transparencia. */
function hex6(c, fondo) {
  const v = leeColor(c);
  if (!v) return '000000';
  if (v.a >= 0.995 || !fondo) return _hx(v.r) + _hx(v.g) + _hx(v.b);
  const f = leeColor(fondo) || { r: 255, g: 255, b: 255 };
  const k = v.a;
  return _hx(v.r * k + f.r * (1 - k)) + _hx(v.g * k + f.g * (1 - k)) + _hx(v.b * k + f.b * (1 - k));
}
const opaco = c => { const v = leeColor(c); return !!v && v.a > 0.04; };

/* Nada de lo que se hereda viaja en el clon: dentro del <foreignObject> no hay
   ni `:root` ni la diapositiva de la que colgaba el trozo, así que cada
   `var(--acc)` se queda sin valor y la letra vuelve a la serifa de fábrica.
   Se resuelve todo contra el elemento original —que sí lo hereda— y se
   escribe en el envoltorio. */
/* Solo lo que se hereda y no cambia de tamaño a nada: fijar aquí el
   `font-size` reescalaba los `em` de dentro y partía los rótulos. */
const HEREDA = ['font-family', 'color', 'direction'];
function variablesHeredadas(el, css) {
  const cs = getComputedStyle(el);
  const nombres = new Set();
  for (let i = 0; i < cs.length; i++) if (String(cs[i]).indexOf('--') === 0) nombres.add(cs[i]);
  /* Donde el navegador no las enumera, los nombres salen de las hojas de
     estilo, que ya vienen recogidas para meterlas en el SVG. */
  if (!nombres.size && css) { const re = /--[A-Za-z0-9_-]+/g; let m; while ((m = re.exec(css))) nombres.add(m[0]); }
  const out = [];
  nombres.forEach(n => { const v = cs.getPropertyValue(n); if (v && v.trim()) out.push(n + ':' + v.trim()); });
  /* Y lo que se heredaba del cuerpo de la página: sin la letra, el SmartArt
     salía en la serifa de fábrica del navegador en vez de en la del tema. */
  HEREDA.forEach(n => { const v = cs.getPropertyValue(n); if (v && v.trim()) out.push(n + ':' + v.trim()); });
  return out.join(';');
}
const _atrXml = v => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* Rasteriza un trozo de la diapositiva a PNG con la misma pinta que en pantalla. */
function rasteriza(el, css, escala) {
  return new Promise(res => {
    const r = el.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), hh = Math.max(1, Math.round(r.height));
    const clon = el.cloneNode(true);
    clon.style.margin = '0';
    let contenido = clon;
    const libre = el.classList?.contains('blk') && el.closest('.lienzo-capa');
    if (libre) {
      /* El foreignObject ya mide la caja del bloque: sus coordenadas de página
         no deben aplicarse por segunda vez dentro de esa caja. Las copias de
         ancestros conservan los selectores del diseño sin crear más cajas. */
      Object.assign(clon.style, { position: 'relative', left: '0', top: '0', right: 'auto', bottom: 'auto', width: '100%', height: '100%' });
      for (let p = el.parentElement; p; p = p.parentElement) {
        const contexto = p.cloneNode(false); contexto.removeAttribute('id'); contexto.style.display = 'contents';
        contexto.append(contenido); contenido = contexto;
        if (p.classList?.contains('slide')) break;
      }
    }
    /* Un <svg> serializado dentro del <foreignObject> pierde su espacio de
       nombres si no lo lleva escrito: el navegador lo lee como una etiqueta
       desconocida de XHTML y solo pinta su texto suelto. Le pasaba a todo lo
       dibujado con `sv()` sin declararlo —el SmartArt llegaba al PowerPoint
       como una hilera de rótulos, sin cajas, sin flechas y sin color. */
    const svgs = (clon.tagName || '').toLowerCase() === 'svg' ? [clon] : [];
    if (clon.querySelectorAll) Array.prototype.push.apply(svgs, clon.querySelectorAll('svg'));
    svgs.forEach(s => s.setAttribute('xmlns', 'http://www.w3.org/2000/svg'));
    const estilo = 'width:' + w + 'px;height:' + hh + 'px;' + variablesHeredadas(el, css);
    const fragmento = libre ? new XMLSerializer().serializeToString(contenido) : htmlAXml(clon.outerHTML);
    const html = '<div xmlns="http://www.w3.org/1999/xhtml" style="' + _atrXml(estilo) + '">' + fragmento + '</div>';
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + hh + '">' +
      '<defs><style type="text/css"><![CDATA[' + css + ']]></style></defs>' +
      '<foreignObject width="100%" height="100%">' + html + '</foreignObject></svg>';
    const img = new Image();
    img.onload = () => {
      const k = escala || 2;
      const cv = document.createElement('canvas');
      cv.width = Math.round(w * k); cv.height = Math.round(hh * k);
      const cx = cv.getContext('2d');
      cx.scale(k, k); cx.drawImage(img, 0, 0);
      res(cv.toDataURL('image/png'));
    };
    img.onerror = () => res(null);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

/* ---------- formas ---------- */
function xmlTexto(id, f, texto) {
  const parr = (texto.parrafos || []).map(p => {
    const alin = p.al === 'center' ? ' algn="ctr"' : p.al === 'right' ? ' algn="r"' : p.al === 'justify' ? ' algn="just"' : '';
    const sang = p.lvl ? ' lvl="' + Math.min(4, p.lvl) + '"' : '';
    const vin = p.vineta ? '<a:buFont typeface="Arial" pitchFamily="34" charset="0"/><a:buChar char="&#8226;"/>'
      : '<a:buNone/>';
    const esp = '<a:spcAft><a:spcPts val="' + Math.round((p.desp != null ? p.desp : 300)) + '"/></a:spcAft>';
    const runs = (p.runs && p.runs.length ? p.runs : [{ t: '' }]).map(r => {
      const props = '<a:rPr lang="es-MX" sz="' + Math.round((r.pt != null ? r.pt : texto.pt) * 100) + '"' +
        (r.neg || texto.neg ? ' b="1"' : '') + (r.cur ? ' i="1"' : '') + ' dirty="0">' +
        '<a:solidFill><a:srgbClr val="' + (r.col || texto.col) + '"/></a:solidFill>' +
        '<a:latin typeface="' + xesc(r.mono ? 'Consolas' : texto.fuente) + '"/></a:rPr>';
      return '<a:r>' + props + '<a:t xml:space="preserve">' + xesc(r.t) + '</a:t></a:r>';
    }).join('');
    return '<a:p><a:pPr' + sang + alin + ' marL="' + (p.vineta ? 228600 * Math.min(2, (p.lvl || 0) + 1) : 0) +
      '" indent="' + (p.vineta ? -171450 : 0) + '">' + esp + vin + '</a:pPr>' + runs + '</a:p>';
  }).join('');
  return '<p:sp><p:nvSpPr><p:cNvPr id="' + id + '" name="Texto ' + id + '"/>' +
    '<p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>' +
    '<p:spPr><a:xfrm><a:off x="' + f.x + '" y="' + f.y + '"/><a:ext cx="' + f.w + '" cy="' + f.h + '"/></a:xfrm>' +
    '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>' +
    '<p:txBody><a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" anchor="t"><a:spAutoFit/></a:bodyPr>' +
    '<a:lstStyle/>' + (parr || '<a:p/>') + '</p:txBody></p:sp>';
}
function xmlRect(id, f, relleno, radio) {
  return '<p:sp><p:nvSpPr><p:cNvPr id="' + id + '" name="Fondo ' + id + '"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>' +
    '<p:spPr><a:xfrm><a:off x="' + f.x + '" y="' + f.y + '"/><a:ext cx="' + f.w + '" cy="' + f.h + '"/></a:xfrm>' +
    '<a:prstGeom prst="' + (radio ? 'roundRect' : 'rect') + '"><a:avLst/></a:prstGeom>' +
    '<a:solidFill><a:srgbClr val="' + relleno + '"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr>' +
    '<p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody></p:sp>';
}
function xmlImagen(id, f, rid, alt) {
  return '<p:pic><p:nvPicPr><p:cNvPr id="' + id + '" name="Imagen ' + id + '" descr="' + xesc(alt || '') + '"/>' +
    '<p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>' +
    '<p:blipFill><a:blip r:embed="' + rid + '"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>' +
    '<p:spPr><a:xfrm><a:off x="' + f.x + '" y="' + f.y + '"/><a:ext cx="' + f.w + '" cy="' + f.h + '"/></a:xfrm>' +
    '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>';
}
function xmlTabla(id, f, filas, opt) {
  const nc = filas[0].length;
  const anchoCol = Math.floor(f.w / nc);
  const alto = Math.max(200000, Math.floor(f.h / filas.length));
  const cols = filas[0].map(() => '<a:gridCol w="' + anchoCol + '"/>').join('');
  const cuerpo = filas.map((fila, ri) => {
    const celdas = fila.map(c => {
      const neg = (opt.encabezado && ri === 0) ? ' b="1"' : '';
      return '<a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:pPr algn="' + (opt.al || 'ctr') + '"/>' +
        '<a:r><a:rPr lang="es-MX" sz="' + Math.round(opt.pt * 100) + '"' + neg + '>' +
        '<a:solidFill><a:srgbClr val="' + opt.col + '"/></a:solidFill>' +
        '<a:latin typeface="' + xesc(opt.fuente) + '"/></a:rPr>' +
        '<a:t xml:space="preserve">' + xesc(c) + '</a:t></a:r></a:p></a:txBody>' +
        '<a:tcPr marL="45720" marR="45720" marT="27432" marB="27432" anchor="ctr"/></a:tc>';
    }).join('');
    return '<a:tr h="' + alto + '">' + celdas + '</a:tr>';
  }).join('');
  return '<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="' + id + '" name="Tabla ' + id + '"/>' +
    '<p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr><p:nvPr/></p:nvGraphicFramePr>' +
    '<p:xfrm><a:off x="' + f.x + '" y="' + f.y + '"/><a:ext cx="' + f.w + '" cy="' + f.h + '"/></p:xfrm>' +
    '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">' +
    '<a:tbl><a:tblPr firstRow="' + (opt.encabezado ? 1 : 0) + '" bandRow="1"/>' +
    '<a:tblGrid>' + cols + '</a:tblGrid>' + cuerpo + '</a:tbl></a:graphicData></a:graphic></p:graphicFrame>';
}


