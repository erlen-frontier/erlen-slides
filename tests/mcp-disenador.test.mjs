/* SPDX-License-Identifier: AGPL-3.0-only */
/* Extensión «disenador» del MCP: sugerir_disenos y aplicar_diseno sobre una
   charla de química con datos ilustrativos. El mosaico solo se comprueba si
   hay Chromium; sin él, la respuesta debe seguir trayendo las propuestas. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {conServidor, proyecto} from './_mcp-cliente.mjs';

const DIAPOSITIVAS = [
  {titulo: 'Ruta de síntesis', zonas: [[{tipo: 'bullets', items: [{t: '1. Coprecipitación a pH 10'}, {t: '2. Envejecimiento 24 h'}, {t: '3. Lavado y secado'}, {t: '4. Caracterización por DRX'}]}]]},
  {titulo: 'Rendimiento', zonas: [[{tipo: 'text', text: 'Rendimiento de la síntesis (dato ilustrativo): 94 %'}]]},
  {titulo: 'Difractograma', zonas: [[{tipo: 'chart', caption: 'Datos ilustrativos'}, {tipo: 'text', text: 'La reflexión basal (003) indica una fase laminar; los datos son ilustrativos.'}]]},
  {titulo: 'Espontaneidad', zonas: [[{tipo: 'math', tex: '\\Delta G = \\Delta H - T\\Delta S'}]]},
  {diseno: 'section', titulo: 'Resultados'}
];

test('MCP: sugerir_disenos y aplicar_diseno', {timeout: 180000}, async () => {
  await conServidor(async (c, dir) => {
    const {result: {tools}} = await c.pide('tools/list');
    assert.ok(tools.some(t => t.name === 'sugerir_disenos') && tools.some(t => t.name === 'aplicar_diseno'));
    assert.equal((await c.llama('crear_presentacion', {archivo: 'q', titulo: 'HDL', diapositivas: DIAPOSITIVAS})).error, false);

    const s = await c.llama('sugerir_disenos', {archivo: 'q', diapositiva: 2, imagen: false});
    assert.equal(s.error, false, s.texto);
    assert.equal(s.datos.diapositiva, 2);
    assert.match(s.datos.lectura, /lista/);
    const p0 = s.datos.propuestas[0];
    assert.equal(p0.id, 'smart-proceso');
    assert.ok(p0.razon.length > 20, 'Cada propuesta explica por qué');
    assert.deepEqual(p0.zonas, [[{id: proyecto(dir, 'q').slides[1].blocks[0].id, tipo: 'smart', clase: 'proceso', elementos: 4}]]);
    assert.equal(s.crudo.content.length, 1, 'Con imagen:false, solo texto');
    // Deterministas: la misma diapositiva da la misma lista.
    assert.deepEqual((await c.llama('sugerir_disenos', {archivo: 'q', diapositiva: 2, imagen: false})).datos.propuestas, s.datos.propuestas);

    const dato = (await c.llama('sugerir_disenos', {archivo: 'q', diapositiva: 3, imagen: false})).datos.propuestas[0];
    assert.equal(dato.id, 'dato');
    assert.deepEqual(dato.encabezados, ['94 %', 'Rendimiento de la síntesis (dato ilustrativo)']);
    const fig = (await c.llama('sugerir_disenos', {archivo: 'q', diapositiva: 4, imagen: false})).datos.propuestas.map(p => p.id);
    assert.ok(fig.includes('figura-texto') && fig.includes('pie-ancho'), fig.join());
    assert.equal((await c.llama('sugerir_disenos', {archivo: 'q', diapositiva: 5, imagen: false})).datos.propuestas[0].id, 'enfasis');
    const sec = await c.llama('sugerir_disenos', {archivo: 'q', diapositiva: 6, imagen: false});
    assert.equal(sec.error, true);
    assert.match(sec.texto, /no tiene zonas/);

    // Aplicar: entra en el historial y se deshace.
    const antes = proyecto(dir, 'q').slides[1];
    const ap = await c.llama('aplicar_diseno', {archivo: 'q', diapositiva: 2, propuesta: 'smart-proceso'});
    assert.equal(ap.error, false, ap.texto);
    assert.equal(ap.datos.id, 'smart-proceso');
    const b = proyecto(dir, 'q').slides[1].blocks[0];
    assert.equal(b.type, 'smart');
    assert.deepEqual(b.items.map(x => x.t), ['Coprecipitación a pH 10', 'Envejecimiento 24 h', 'Lavado y secado', 'Caracterización por DRX']);
    assert.equal((await c.llama('historial_presentacion', {archivo: 'q'})).datos.deshacer[0].antes_de, 'aplicar_diseno');
    assert.equal((await c.llama('deshacer', {archivo: 'q'})).error, false);
    assert.deepEqual(proyecto(dir, 'q').slides[1], antes);

    const mal = await c.llama('aplicar_diseno', {archivo: 'q', diapositiva: 2, propuesta: 'no-existe'});
    assert.equal(mal.error, true);
    assert.match(mal.texto, /smart-proceso/, 'El error lista las propuestas que hay');

    // Con mosaico: una imagen PNG si hay Chromium; si no, el motivo en texto.
    const m = await c.llama('sugerir_disenos', {archivo: 'q', diapositiva: 4});
    assert.equal(m.error, false, m.texto);
    assert.ok(m.datos.propuestas.length >= 2);
    const img = m.crudo.content.find(x => x.type === 'image');
    if (img) { assert.equal(img.mimeType, 'image/png'); assert.equal(Buffer.from(img.data, 'base64').subarray(1, 4).toString(), 'PNG'); assert.match(m.datos.imagen, /Mosaico/); }
    else assert.match(m.datos.imagen, /^Sin mosaico: /);
  });
});
