/* SPDX-License-Identifier: AGPL-3.0-only */
import test from 'node:test';
import assert from 'node:assert/strict';
import {editor} from '../herramientas/test-browser.mjs';

/* Diálogo de análisis: selección de serie, y el botón que escribe el resultado en el título.
   Datos sintéticos generados aquí. */

const enPagina = (fn, run) => JSON.parse(run('JSON.stringify((' + fn.toString() + ')())'));

test('varias series: el selector elige cuál se analiza y la elección se guarda con la gráfica', async () => {
  const {dom, run, errors} = await editor();
  try {
    const r = enPagina(function () {
      const filas = ['x,uno,dos'];
      for (let x = 1; x <= 20; x++) filas.push(x + ',' + (2 * x + 1) + ',' + (5 - 0.1 * x).toFixed(3));
      const b = Object.assign(newBlock('chart'), { data: filas.join('\n') });
      const undo0 = S.undo.length;
      openAnalisis(b);
      const opciones = [...document.querySelectorAll('#modalRoot .an-campo select option')].map(o => o.textContent);
      const info0 = document.querySelector('#modalRoot .hint').textContent;
      const sel = document.querySelector('#modalRoot .an-campo select');
      sel.value = '1';
      sel.dispatchEvent(new Event('change'));
      const info1 = document.querySelector('#modalRoot .hint').textContent;
      closeModal();
      return { opciones, info0, info1, serie: b.analisisOpc.serie, undo: S.undo.length - undo0 };
    }, run);
    assert.equal(r.opciones.length, 2, 'una opción por serie: ' + r.opciones.join(' / '));
    assert.match(r.info0, /uno/, 'al abrir, analiza la primera');
    assert.match(r.info1, /dos/, 'tras elegir, analiza la segunda');
    assert.equal(r.serie, 1);
    assert.equal(r.undo, 1, 'un solo paso de deshacer');
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('«Poner el resultado en el título» escribe la pendiente, cierra el diálogo y deja un solo paso de deshacer', async () => {
  const {dom, run, errors} = await editor();
  try {
    const r = enPagina(function () {
      const b = Object.assign(newBlock('chart'), { data: 'x,y\n1,2\n2,4.1\n3,5.9\n4,8.2\n5,9.9', title: '' });
      const undo0 = S.undo.length;
      openAnalisis(b);
      const abiertos = document.querySelectorAll('#modalRoot .modal').length;
      [...document.querySelectorAll('#modalRoot .btn-sm')].find(x => /Poner el resultado en el título/.test(x.textContent)).click();
      return { abiertos, cerrados: document.querySelectorAll('#modalRoot .modal').length, titulo: b.title, undo: S.undo.length - undo0 };
    }, run);
    assert.equal(r.abiertos, 1);
    assert.equal(r.cerrados, 0, 'el diálogo se cierra');
    assert.match(r.titulo, /^m = [\d.]+ ± [\d.]+, R² = [\d.]+$/, 'título: ' + r.titulo);
    assert.equal(r.undo, 1, 'un solo paso de deshacer, no dos');
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});
