/* SPDX-License-Identifier: AGPL-3.0-only */
import test from 'node:test';
import assert from 'node:assert/strict';
import PptxGenJS from 'pptxgenjs';
import { revisaPaquetePPTX } from '../src/pptx-core.mjs';
import { validaFigura, svgFigura, recortesFigura } from '../src/figuras-core.mjs';

test('PPTX limits are checked before decompressing a real OOXML package', async () => {
  const p = new PptxGenJS(); p.addSlide().addText('Datos ilustrativos', { x: 1, y: 1, w: 5, h: 1 });
  const b = await p.write({ outputType: 'arraybuffer' });
  assert.equal(revisaPaquetePPTX(b).slides, 1);
  assert.throws(() => revisaPaquetePPTX(new ArrayBuffer(40)), /PPTX válido/);
  const corrupto = b.slice(0), v = new DataView(corrupto);
  let e = v.byteLength - 22; while (v.getUint32(e, true) !== 0x06054b50) e--;
  v.setUint32(v.getUint32(e + 16, true) + 24, 110 * 1048576, true);
  assert.throws(() => revisaPaquetePPTX(corrupto), /100 MiB/);
  const zip64 = b.slice(0); new DataView(zip64).setUint16(e + 10, 65535, true);
  assert.throws(() => revisaPaquetePPTX(zip64), /complejo|compatible/);
});

test('Figure documents preserve editability and export inert, escaped SVG', () => {
  const f = { v: 1, width: 960, height: 540, background: '#ffffff', objects: [{ id: 'label', kind: 'text', x: 40, y: 50, width: 400, height: 100, angle: 0, text: 'Señal <control> & réplica\nDatos ilustrativos', fontSize: 32, fill: '#17202a', stroke: 'transparent', strokeWidth: 0 }] };
  const antes = JSON.stringify(f), c = validaFigura(f), svg = svgFigura(c, 'Resultado ilustrativo');
  assert.equal(JSON.stringify(f), antes);
  assert.match(svg, /Señal &lt;control&gt; &amp; réplica/);
  assert.match(svg, /<tspan x="0" y="70.4">Datos ilustrativos/);
  assert.doesNotMatch(svg, /script|foreignObject|https?:\/\/(?!www.w3.org)/);
  assert.deepEqual(validaFigura(JSON.parse(JSON.stringify(c))), c);
  assert.deepEqual(recortesFigura(f), []);
  assert.deepEqual(recortesFigura({ ...f, objects: [{ ...f.objects[0], x: 900 }] }), ['label']);
  assert.throws(() => validaFigura({ ...f, objects: [{ ...f.objects[0], kind: 'iframe' }] }), /objeto/);
  assert.throws(() => validaFigura({ ...f, objects: [{ ...f.objects[0], fill: 'url(https://example.org)' }] }), /objeto/);
  assert.throws(() => validaFigura({ ...f, objects: [{ ...f.objects[0], x: NaN }] }), /objeto/);
  assert.throws(() => validaFigura({ ...f, objects: [{ ...f.objects[0], kind: 'image', src: 'https://example.org/img.png' }] }), /incrustadas/);
});
