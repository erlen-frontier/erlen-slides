/* SPDX-License-Identifier: AGPL-3.0-only */
import test from 'node:test';
import assert from 'node:assert/strict';
import {editor} from '../herramientas/test-browser.mjs';

/* Sensibilidad de Tauc al tramo, anchura instrumental en Scherrer, saneado de los
   ajustes guardados y sugerencias de calidad sobre análisis. Datos sintéticos
   generados aquí con una semilla fija. */

const enPagina = (fn, run) => JSON.parse(run('JSON.stringify((' + fn.toString() + ')())'));

test('la sensibilidad al tramo es estrecha con datos sin ruido y se abre con ruido', async () => {
  const {dom, run, errors} = await editor();
  try {
    const r = enPagina(function () {
      let seed = 4242;
      const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      const gauss = () => { let u = 0; while (u === 0) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); };
      const cuadricula = (ruido) => {
        const p = [];
        for (let k = 0; k <= 80; k++) {
          const x = 2.8 + k * 0.0125;
          const y = Math.max(100 * (x - 3.2), 0) + ruido * gauss();
          p.push([+x.toFixed(4), Math.sqrt(Math.max(y, 1e-6)) / x]);
        }
        return p;
      };
      const exacto = cuadricula(0), ruidoso = cuadricula(3);
      const rExacto = tauc(exacto, true, { desde: 3.3, hasta: 3.9 });
      const rRuido = tauc(ruidoso, true, { desde: 3.3, hasta: 3.9 });
      const sExacto = sensibilidadTramo(exacto, true, rExacto);
      const sRuido = sensibilidadTramo(ruidoso, true, rRuido);
      return { anchoExacto: sExacto.max - sExacto.min, minExacto: sExacto.min, anchoRuido: sRuido.max - sRuido.min,
        minRuido: sRuido.min, maxRuido: sRuido.max, egRuido: rRuido.eg, vecinos: sRuido.n, sinResultado: sensibilidadTramo(exacto, true, null) };
    }, run);
    assert.ok(r.anchoExacto < 1e-9, 'sin ruido, los tramos vecinos dan el mismo Eg: ' + r.anchoExacto);
    assert.ok(Math.abs(r.minExacto - 3.2) < 1e-9);
    assert.ok(r.anchoRuido > 0.001, 'con ruido, mover el tramo cambia Eg: ' + r.anchoRuido);
    assert.ok(r.minRuido <= r.egRuido && r.egRuido <= r.maxRuido + 1e-12, 'el Eg central queda dentro del intervalo');
    assert.equal(r.vecinos, 9, 'las nueve ventanas son válidas');
    assert.equal(r.sinResultado, null, 'sin tramo no hay sensibilidad');
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('Scherrer descuenta la anchura instrumental en cuadratura y rechaza valores incoherentes', async () => {
  const {dom, run, errors} = await editor();
  try {
    const bDeg = Math.sqrt(0.5 * 0.5 - 0.2 * 0.2);
    const esperado = 0.9 * 0.15406 / (bDeg * Math.PI / 180 * Math.cos(15 * Math.PI / 180));
    const nm = run('scherrer(0.5, 30, 0.9, 0.15406, 0.2).nm');
    assert.ok(Math.abs(nm - esperado) < 1e-9 * esperado, 'D con β = √(β_obs² − β_inst²)');
    assert.equal(run('scherrer(0.5, 30, 0.9, 0.15406, 0.2).descontada'), true);
    assert.equal(run('scherrer(0.5, 30, 0.9, 0.15406).descontada'), false, 'sin anchura instrumental no se descuenta');
    assert.equal(run('scherrer(0.2, 30, 0.9, 0.15406, 0.2)'), null, 'la instrumental no puede igualar la observada');
    assert.equal(run('scherrer(0.5, 30, 0.9, 0.15406, -0.1)'), null, 'ni ser negativa');
    assert.equal(run('scherrer(0.5, 30, 0.9, 0.15406, NaN)'), null);
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('la anchura instrumental guardada con la gráfica solo entra si es un número no negativo', async () => {
  const {dom, run, errors} = await editor();
  try {
    const r = enPagina(function () {
      const bien = { id: 'a1', type: 'chart', analisisOpc: { betaInst: 0.12 } };
      const mal = { id: 'a2', type: 'chart', analisisOpc: { betaInst: -0.5 } };
      saneaBloque(bien, [], null);
      saneaBloque(mal, [], null);
      return { bien: bien.analisisOpc, mal: mal.analisisOpc };
    }, run);
    assert.deepEqual(r.bien, { betaInst: 0.12 });
    assert.deepEqual(r.mal, {}, 'el valor negativo se descarta');
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('calidad científica: un análisis de Tauc o de Scherrer pide que el pie diga qué supone', async () => {
  const {dom, run, errors} = await editor();
  try {
    const r = enPagina(function () {
      const grafica = (extra) => Object.assign(newBlock('chart'), Object.assign({ id: 'g-cal', data: 'x\ty\n1\t2\n2\t3\n3\t4\n4\t5\n5\t6',
        xlabel: 'Energía (eV)', ylabel: '(αhν)² (u. a.)', caption: 'Datos ilustrativos', fuente: { nombre: 'x', cuando: 'y', n: 5, huella: 'z' } }, extra));
      const deck = (b) => { const d = blankDeck(); d.slides = [{ id: 's-cal', layout: 'blanco', title: 'Título', blocks: [b] }]; return d; };
      const textos = (b) => calidadCientifica(deck(b)).map(f => f.qué);
      return {
        tauc: textos(grafica({ analisis: 'tauc' })),
        taucDeclarada: textos(grafica({ analisis: 'tauc', caption: 'Transición directa; tramo 3.3–3.9 eV' })),
        scherrer: textos(grafica({ analisis: 'scherrer', xlabel: '2θ (°)', ylabel: 'Intensidad (u. a.)' })),
        scherrerDeclarada: textos(grafica({ analisis: 'scherrer', xlabel: '2θ (°)', ylabel: 'Intensidad (u. a.)', caption: 'Radiación Cu Kα' })),
        sinAnalisis: textos(grafica({}))
      };
    }, run);
    assert.ok(r.tauc.includes('La banda prohibida no declara la transición'), JSON.stringify(r.tauc));
    assert.ok(!r.taucDeclarada.includes('La banda prohibida no declara la transición'), 'con la transición escrita, no avisa');
    assert.ok(r.scherrer.includes('El tamaño de cristalita no declara la radiación'), JSON.stringify(r.scherrer));
    assert.ok(!r.scherrerDeclarada.includes('El tamaño de cristalita no declara la radiación'));
    assert.ok(!r.sinAnalisis.some(t => /banda prohibida|cristalita/.test(t)), 'sin análisis guardado no hay estas sugerencias');
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});
