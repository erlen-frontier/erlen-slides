/* SPDX-License-Identifier: AGPL-3.0-only */
import test from 'node:test';
import assert from 'node:assert/strict';
import {editor} from '../herramientas/test-browser.mjs';

/* Un aviso de la revisión lleva a su diapositiva y selecciona su bloque. Los datos
   de la prueba son sintéticos y se generan aquí. */

test('un aviso de la revisión va a su diapositiva y selecciona el bloque que señala', async () => {
  const {dom, run, errors} = await editor();
  try {
    const raw = await run(`(async () => {
      const d = blankDeck();
      const grafica = Object.assign(newBlock('chart'), {id: 'grafica-sin-pie',
        data: 'x\\ty\\n1\\t2\\n2\\t3\\n3\\t4\\n4\\t5\\n5\\t6\\n6\\t7\\n7\\t8\\n8\\t9', xlabel: 'x (u)', ylabel: 'y (u)'});
      d.slides = [{id: 's-texto', layout: 'blanco', title: '', blocks: []},
                  {id: 's-grafica', layout: 'blanco', title: '', blocks: [grafica]}];
      S.deck = d; S.cur = 0; S.selBlock = null;
      openRevision();
      await new Promise(res => setTimeout(res, 250));
      const fila = [...document.querySelectorAll('#modalRoot .rv-fila')].find(x => /Figura sin pie/.test(x.textContent));
      const encontrada = !!fila;
      if (fila) fila.click();
      return JSON.stringify({encontrada, cur: S.cur, sel: S.selBlock, cerrado: !document.querySelector('#modalRoot .modal')});
    })()`);
    const r = JSON.parse(raw);
    assert.equal(r.encontrada, true, 'la revisión avisa de la figura sin pie');
    assert.equal(r.cur, 1, 'el aviso lleva a la diapositiva de la gráfica');
    assert.equal(r.sel, 'grafica-sin-pie', 'y selecciona el bloque que señala');
    assert.equal(r.cerrado, true, 'el diálogo se cierra al saltar');
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});
