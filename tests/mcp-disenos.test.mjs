/* SPDX-License-Identifier: AGPL-3.0-only */
/* Los diseños nuevos vistos desde el MCP: «En blanco» se crea con sus bloques
   y la revisión no le pide el título que no enseña; «Tres figuras» y
   «Objetivos» llegan con sus rótulos genéricos y los que se le pasen. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {conServidor, proyecto, bloques} from './_mcp-cliente.mjs';

test('MCP: diapositiva en blanco y diseños para charlas científicas', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    const guia = (await c.llama('guia_formato', {})).datos;
    const blanco = guia.disenos.find(d => d.id === 'blanco');
    assert.ok(blanco && blanco.zonas === 1 && blanco.sin_titulo === true, 'la guía ofrece «blanco» y avisa de que no lleva título');
    assert.deepEqual(guia.disenos.find(d => d.id === 'tresfig').encabezados, ['(a)', '(b)', '(c)']);
    assert.deepEqual(guia.disenos.find(d => d.id === 'objetivos').encabezados, ['Objetivo general', 'Objetivos específicos']);
    assert.ok(guia.disenos.some(d => d.id === 'titular' && d.zonas === 1));

    assert.equal((await c.llama('crear_presentacion', {archivo: 'p', titulo: 'Avance de tesis'})).error, false);
    const r = await c.llama('agregar_diapositiva', {archivo: 'p', diseno: 'blanco',
      zonas: [[{tipo: 'text', text: 'Datos ilustrativos: una sola frase, sin título', size: 'l', align: 'center'}]]});
    assert.equal(r.error, false, r.texto);
    const d = proyecto(dir, 'p');
    const sl = d.slides[r.datos.diapositiva - 1];
    assert.equal(sl.layout, 'blanco');
    assert.equal(sl.title, '', 'nace sin título');
    assert.equal(bloques(sl).length, 1);

    const lote = await c.llama('agregar_diapositivas', {archivo: 'p', diapositivas: [
      {diseno: 'tresfig', titulo: 'Tres técnicas sobre la misma muestra (datos ilustrativos)', encabezados: [null, 'SEM'],
        zonas: [[{tipo: 'text', text: 'DRX'}], [{tipo: 'text', text: 'Micrografía'}], [{tipo: 'text', text: 'FTIR'}]]},
      {diseno: 'objetivos', titulo: 'Objetivos', zonas: [[{tipo: 'text', text: 'Objetivo general de ejemplo'}], [{tipo: 'bullets', items: ['Uno', 'Dos']}]]}]});
    assert.equal(lote.error, false, lote.texto);
    const [tf, ob] = proyecto(dir, 'p').slides.slice(-2);
    assert.deepEqual(tf.zt, ['(a)', 'SEM', '(c)'], 'los rótulos pasados sustituyen a los genéricos');
    assert.deepEqual(ob.zt, ['Objetivo general', 'Objetivos específicos']);

    const rev = (await c.llama('revisar_presentacion', {archivo: 'p'})).datos;
    const deBlanco = rev.estructura.filter(h => h.diapositiva === r.datos.diapositiva);
    assert.ok(!deBlanco.some(h => /título/i.test(h.problema)), 'la revisión pidió título a «En blanco»: ' + JSON.stringify(deBlanco));
  });
});
