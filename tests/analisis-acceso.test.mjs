/* SPDX-License-Identifier: AGPL-3.0-only */
import test from 'node:test';
import assert from 'node:assert/strict';
import {editor} from '../herramientas/test-browser.mjs';

/* Acceso al análisis de la serie: acción del asistente y botón σ de la barra
   contextual. Los datos son sintéticos y se generan aquí. */

const CSV = 'x\ty\n1\t2\n2\t3\n3\t4\n4\t5\n5\t6\n6\t7\n7\t8\n8\t9';
const preparaDeck = `
  const d = blankDeck();
  const g = Object.assign(newBlock('chart'), {id: 'g-acceso', data: ${JSON.stringify(CSV)}, xlabel: 'x (u)', ylabel: 'y (u)', tecnica: 'xrd'});
  d.slides = [{id: 's-g', layout: 'blanco', title: '', blocks: [g]}];
  S.deck = d; S.cur = 0; S.selBlock = 'g-acceso';
  renderAll();
  await new Promise(r => setTimeout(r, 100));
`;

test('la acción del asistente solo se ofrece con una gráfica seleccionada', async () => {
  const {dom, run, errors} = await editor();
  try {
    const raw = await run(`(async () => {
      ${preparaDeck}
      const a = ACC.find(x => x.id === 'analizar-serie');
      const conGrafica = {req: a.req(), grupo: a.grp};
      S.selBlock = null; renderAll();
      const sinSeleccion = {req: a.req(), corre: a.corre()};
      return JSON.stringify({conGrafica, sinSeleccion});
    })()`);
    const r = JSON.parse(raw);
    assert.equal(r.conGrafica.req, true, 'con una gráfica seleccionada, la acción está disponible');
    assert.equal(r.conGrafica.grupo, 'Datos');
    assert.equal(r.sinSeleccion.req, false, 'sin selección no está disponible');
    assert.equal(r.sinSeleccion.corre, null, 'y, si se pide, dice que aquí no se puede');
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('la acción del asistente abre el análisis de la gráfica seleccionada', async () => {
  const {dom, run, errors} = await editor();
  try {
    const raw = await run(`(async () => {
      ${preparaDeck}
      const texto = ACC.find(x => x.id === 'analizar-serie').corre();
      const titulo = document.querySelector('#modalRoot .mo-title')?.textContent || '';
      const modo = [...document.querySelectorAll('#modalRoot .seg-4 button.on')].map(x => x.textContent);
      closeModal();
      return JSON.stringify({texto, titulo, modo});
    })()`);
    const r = JSON.parse(raw);
    assert.match(r.texto, /Abro el análisis/);
    assert.equal(r.titulo, 'Análisis de la serie');
    assert.deepEqual(r.modo, ['Pico y anchura'], 'una gráfica de difracción abre en pico y anchura');
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('el botón σ de la barra contextual aparece con una gráfica y se desactiva si está bloqueada', async () => {
  const {dom, run, errors} = await editor();
  try {
    const raw = await run(`(async () => {
      ${preparaDeck}
      const boton = () => document.querySelector('#barraContextual [data-barra-accion="analizar"]');
      const libre = boton() ? {existe: true, desactivado: boton().disabled, nombre: boton().getAttribute('aria-label')} : {existe: false};
      S.deck.slides[0].blocks[0].locked = true;
      renderAll();
      await new Promise(r => setTimeout(r, 100));
      const bloqueado = boton() ? {existe: true, desactivado: boton().disabled} : {existe: false};
      return JSON.stringify({libre, bloqueado});
    })()`);
    const r = JSON.parse(raw);
    assert.deepEqual(r.libre, {existe: true, desactivado: false, nombre: 'Analizar la serie'});
    assert.deepEqual(r.bloqueado, {existe: true, desactivado: true}, 'con el bloque bloqueado se ve, pero no se usa');
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});
