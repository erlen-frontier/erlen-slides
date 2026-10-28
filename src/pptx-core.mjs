/* SPDX-License-Identifier: AGPL-3.0-only */
/* Inspect sizes before any decompression. Unsupported ZIP64/encryption is
   rejected; a browser worker can be cancelled without changing a document. */
export function revisaPaquetePPTX(buffer) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength > 25 * 1048576) throw new Error('El PowerPoint debe pesar como máximo 25 MiB.');
  const v = new DataView(buffer), n = v.byteLength;
  let end = -1;
  for (let p = n - 22; p >= Math.max(0, n - 65557); p--) {
    if (v.getUint32(p, true) === 0x06054b50 && p + 22 + v.getUint16(p + 20, true) === n) { end = p; break; }
  }
  if (end < 0) throw new Error('El archivo no es un PPTX válido. Selecciona un .pptx, no un .ppt.');
  const count = v.getUint16(end + 10, true), size = v.getUint32(end + 12, true), start = v.getUint32(end + 16, true);
  if (v.getUint16(end + 4, true) || v.getUint16(end + 6, true) || v.getUint16(end + 8, true) !== count || count > 3000 || start + size > end) throw new Error('Este paquete es demasiado complejo o usa un formato ZIP no compatible.');
  let p = start, bytes = 0, slides = 0, presentation = false;
  const paths = new Set();
  for (let i = 0; i < count; i++) {
    if (p + 46 > start + size || v.getUint32(p, true) !== 0x02014b50) throw new Error('El PowerPoint tiene un directorio de archivos dañado.');
    const expanded = v.getUint32(p + 24, true), len = v.getUint16(p + 28, true), extra = v.getUint16(p + 30, true), comment = v.getUint16(p + 32, true), local = v.getUint32(p + 42, true);
    if (p + 46 + len + extra + comment > start + size || local + 30 > start || v.getUint32(local, true) !== 0x04034b50 || v.getUint16(p + 8, true) & 1) throw new Error('El paquete está dañado o protegido. Guarda una copia PPTX sin contraseña.');
    const name = new TextDecoder().decode(new Uint8Array(buffer, p + 46, len));
    if (paths.has(name) || name.includes('..') || name.startsWith('/') || name.includes('\\')) throw new Error('El paquete contiene rutas no compatibles.');
    paths.add(name); bytes += expanded;
    if (expanded > 25 * 1048576 || bytes > 100 * 1048576) throw new Error('El contenido descomprimido supera el límite de 100 MiB. Divide el PowerPoint.');
    if (/^ppt\/slides\/slide\d+\.xml$/.test(name)) slides++;
    if (name === 'ppt/presentation.xml') presentation = true;
    p += 46 + len + extra + comment;
  }
  if (p !== start + size || !presentation || !slides) throw new Error('El paquete no contiene una presentación PowerPoint.');
  if (slides > 200) throw new Error('Divide el PowerPoint en archivos de hasta 200 diapositivas.');
  return { slides, bytes };
}
