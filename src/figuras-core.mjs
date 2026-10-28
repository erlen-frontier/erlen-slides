/* SPDX-License-Identifier: AGPL-3.0-only */
/* A small, allowlisted document model. Never deserialize arbitrary Fabric
   classes or remote resources from a project. Canvas is only an editor. */
const kinds = ['text', 'rect', 'circle', 'arrow', 'image'];
const num = (n, a, b) => typeof n === 'number' && Number.isFinite(n) && n >= a && n <= b;
export const colorFigura = c => c === 'transparent' || /^#[\da-f]{6}$/i.test(c);
export const imagenFigura = s => typeof s === 'string' && s.length <= 12 * 1048576 && /^data:image\/(?:png|jpeg|webp);base64,[\da-z+/=\s]+$/i.test(s);
export function validaFigura(f) {
  if (!f || f.v !== 1 || !num(f.width, 200, 1600) || !num(f.height, 150, 1200) || !Array.isArray(f.objects) || f.objects.length > 100 || !colorFigura(f.background)) throw new Error('La figura no tiene un formato compatible.');
  const ids = new Set();
  const objects = f.objects.map(o => {
    if (!o || !kinds.includes(o.kind) || typeof o.id !== 'string' || !o.id || o.id.length > 80 || ids.has(o.id) || !num(o.x, -1600, 3200) || !num(o.y, -1200, 2400) || !num(o.width, 1, 3200) || !num(o.height, 1, 2400) || !num(o.angle, -180, 180) || !colorFigura(o.fill) || !colorFigura(o.stroke) || !num(o.strokeWidth, 0, 20)) throw new Error('Un objeto de la figura no es válido.');
    ids.add(o.id);
    const b = { id: o.id, kind: o.kind, x: o.x, y: o.y, width: o.width, height: o.height, angle: o.angle, fill: o.fill, stroke: o.stroke, strokeWidth: o.strokeWidth, locked: o.locked === true };
    if (o.kind === 'text') {
      if (typeof o.text !== 'string' || o.text.length > 2000 || !num(o.fontSize, 8, 160)) throw new Error('El texto de la figura no es válido.');
      b.text = o.text; b.fontSize = o.fontSize;
    }
    if (o.kind === 'image') { if (!imagenFigura(o.src)) throw new Error('Usa imágenes PNG, JPEG o WebP incrustadas.'); b.src = o.src; }
    return b;
  });
  return { v: 1, width: f.width, height: f.height, background: f.background, objects };
}
const escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
export function svgFigura(modelo, alt = '') {
  const f = validaFigura(modelo);
  const elementos = f.objects.map(o => {
    const base = `fill="${o.fill}" stroke="${o.stroke}" stroke-width="${o.strokeWidth}"`;
    let shape;
    if (o.kind === 'rect') shape = `<rect width="${o.width}" height="${o.height}" ${base}/>`;
    if (o.kind === 'circle') shape = `<ellipse cx="${o.width / 2}" cy="${o.height / 2}" rx="${o.width / 2}" ry="${o.height / 2}" ${base}/>`;
    if (o.kind === 'arrow') shape = `<path d="M0 ${o.height / 2} H${Math.max(0, o.width - 16)} M${Math.max(0, o.width - 16)} ${Math.max(0, o.height / 2 - 10)} L${o.width} ${o.height / 2} L${Math.max(0, o.width - 16)} ${o.height / 2 + 10}" fill="none" stroke="${o.stroke}" stroke-width="${Math.max(1, o.strokeWidth)}"/>`;
    if (o.kind === 'image') shape = `<image width="${o.width}" height="${o.height}" href="${o.src}" preserveAspectRatio="none"/>`;
    if (o.kind === 'text') shape = `<text fill="${o.fill}" font-family="Arial, sans-serif" font-size="${o.fontSize}" xml:space="preserve">${o.text.split('\n').map((l, i) => `<tspan x="0" y="${o.fontSize + i * o.fontSize * 1.2}">${escape(l)}</tspan>`).join('')}</text>`;
    return `<g transform="translate(${o.x} ${o.y}) rotate(${o.angle})">${shape}</g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f.width}" height="${f.height}" viewBox="0 0 ${f.width} ${f.height}" role="img"><title>${escape(alt)}</title><rect width="100%" height="100%" fill="${f.background}"/>${elementos.join('')}</svg>`;
}
export function recortesFigura(modelo, mideTexto = (t, size) => t.length * size * 0.65) {
  const f = validaFigura(modelo), recortes = [];
  for (const o of f.objects) {
    let w = o.width, ht = o.height, y0 = 0;
    if (o.kind === 'text') { w = Math.max(...o.text.split('\n').map(t => mideTexto(t, o.fontSize)), 0); ht = o.text.split('\n').length * o.fontSize * 1.2; }
    if (o.kind === 'arrow') { y0 = Math.max(0, ht / 2 - 10); ht = 20; }
    const a = o.angle * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    const puntos = [[0, y0], [w, y0], [0, y0 + ht], [w, y0 + ht]].map(([x, y]) => [o.x + x * c - y * s, o.y + x * s + y * c]);
    if (puntos.some(([x, y]) => x < -3 || y < -3 || x > f.width + 3 || y > f.height + 3)) recortes.push(o.id);
  }
  return recortes;
}
