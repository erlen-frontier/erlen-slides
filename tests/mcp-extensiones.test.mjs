/* SPDX-License-Identifier: AGPL-3.0-only */
/* El sistema de extensiones del MCP (mcp/extensiones.mjs): herramientas,
   operaciones de página, reglas de revisión, prompts, convenciones, formatos
   de exportación y transformaciones de bloque, con una extensión de prueba en
   tests/fixtures/mcp-extension. Y la extensión de referencia «estadisticas». */
import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {conServidor, proyecto} from './_mcp-cliente.mjs';

const extensiones = fileURLToPath(new URL('./fixtures/mcp-extension/', import.meta.url));

test('MCP: cada gancho de las extensiones', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    const {result: {tools}} = await c.pide('tools/list');
    assert.ok(tools.some(t => t.name === 'prueba_poner_titulo'));
    assert.ok(tools.find(t => t.name === 'exportar_presentacion').inputSchema.properties.formato.enum.includes('prueba'));
    const {result: {prompts}} = await c.pide('prompts/list');
    assert.ok(prompts.some(p => p.name === 'prueba_prompt'));
    assert.equal((await c.pide('prompts/get', {name: 'prueba_prompt', arguments: {x: 'mundo'}})).result.messages[0].content.text, 'hola mundo');
    assert.equal((await c.llama('guia_formato', {})).datos.convenciones.prueba, 'convención de prueba');

    const cr = await c.llama('crear_presentacion', {archivo: 'p', diapositivas: [{titulo: 'Uno', zonas: [[{tipo: 'text', gritar: 'hola'}]]}, {titulo: 'Dos'}]});
    assert.equal(cr.error, false, cr.texto);
    assert.equal(proyecto(dir, 'p').slides[1].blocks[0].text, 'HOLA', 'transformaBloque');

    const t = await c.llama('prueba_poner_titulo', {archivo: 'p', titulo: '¡Resultados!'});
    assert.equal(t.error, false, t.texto);
    assert.equal(t.datos.cambiadas, 2);
    assert.equal(proyecto(dir, 'p').slides[2].title, '¡Resultados!');
    assert.equal((await c.llama('historial_presentacion', {archivo: 'p'})).datos.deshacer[0].antes_de, 'prueba_poner_titulo', 'entra en el historial');

    const rev = (await c.llama('revisar_presentacion', {archivo: 'p'})).datos;
    assert.deepEqual(rev.adicional.map(h => [h.regla, h.diapositiva]), [['prueba-sin-signo', 2], ['prueba-sin-signo', 3]]);
    assert.equal((await c.llama('exportar_presentacion', {archivo: 'p', formato: 'prueba'})).datos.diapositivas, 3);
  }, {extensiones});
});

test('MCP: extensión estadisticas', {timeout: 120000}, async () => {
  await conServidor(async c => {
    await c.llama('crear_presentacion', {archivo: 'e', titulo: 'E', diapositivas: [
      {titulo: 'Datos', minutos: 2, notas: 'Decir algo.', zonas: [[{tipo: 'text', text: 'Cuatro palabras aquí bien'}, {tipo: 'chart', caption: 'Pie corto'}, {tipo: 'math', tex: 'E=mc^2'}]]},
      {diseno: 'section', titulo: 'Fin'}]});
    const r = await c.llama('estadisticas_presentacion', {archivo: 'e'});
    assert.equal(r.error, false, r.texto);
    assert.deepEqual(r.datos.total, {diapositivas: 3, palabras: 8, figuras: 1, tablas: 0, ecuaciones: 1, minutos: 2, con_notas: 1});
    assert.equal(r.datos.diapositivas[1].palabras, 7);
  });
});
