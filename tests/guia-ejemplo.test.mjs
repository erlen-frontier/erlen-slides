/* SPDX-License-Identifier: AGPL-3.0-only */
import test from 'node:test';
import assert from 'node:assert/strict';
import {editor} from '../herramientas/test-browser.mjs';

/* Guía de un ejemplo recién abierto: aparece, se cierra y lo recuerda, y se
   retira al cargar otro mazo. Datos de los ejemplos: ilustrativos. */

test('la guía de un ejemplo aparece con sus tres salidas, se cierra y no vuelve a salir', async () => {
  const {dom, run, errors} = await editor();
  try {
    const raw = await run(`(() => {
      S.deck = EJEMPLOS[0].build();
      localStorage.removeItem('erlen-slides.guia-ejemplo');
      muestraGuiaEjemplo();
      const botones = [...document.querySelectorAll('.guia-ejemplo .guia-acciones button')].map(x => x.textContent);
      const aparece = document.querySelectorAll('.guia-ejemplo').length;
      document.querySelector('.guia-cerrar').click();
      const tras = document.querySelectorAll('.guia-ejemplo').length;
      const recordada = lsGet('erlen-slides.guia-ejemplo', {}).cerrada === true;
      muestraGuiaEjemplo();
      const otraVez = document.querySelectorAll('.guia-ejemplo').length;
      return JSON.stringify({botones, aparece, tras, recordada, otraVez});
    })()`);
    const r = JSON.parse(raw);
    assert.deepEqual(r.botones, ['Cambiar datos', 'Ver revisión', 'Presentar']);
    assert.equal(r.aparece, 1, 'una sola franja');
    assert.equal(r.tras, 0, 'se cierra con ✕');
    assert.equal(r.recordada, true, 'el cierre se recuerda en el navegador');
    assert.equal(r.otraVez, 0, 'y no vuelve a salir');
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('cargar otro mazo retira la guía del ejemplo anterior', async () => {
  const {dom, run, errors} = await editor();
  try {
    const raw = await run(`(() => {
      localStorage.removeItem('erlen-slides.guia-ejemplo');
      S.deck = EJEMPLOS[1].build();
      muestraGuiaEjemplo();
      const antes = document.querySelectorAll('.guia-ejemplo').length;
      loadDeck(blankDeck(), null, true);
      const despues = document.querySelectorAll('.guia-ejemplo').length;
      return JSON.stringify({antes, despues});
    })()`);
    const r = JSON.parse(raw);
    assert.equal(r.antes, 1);
    assert.equal(r.despues, 0, 'al cargar otra presentación, la guía desaparece');
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});
