/* SPDX-License-Identifier: AGPL-3.0-only */
import test from 'node:test';
import assert from 'node:assert/strict';
import {editor} from '../herramientas/test-browser.mjs';

/* Caracterización de sólidos en el editor: Kubelka–Munk, nm → eV, Scherrer,
   Tauc y el error de la banda prohibida. Los datos son sintéticos y se
   generan aquí con una semilla fija o con un modelo explícito; no describen
   ningún experimento. */

/* Cada comprobación es una función que se ejecuta dentro de la página. */
const enPagina = (fn, run) => JSON.parse(run('JSON.stringify((' + fn.toString() + ')())'));

test('Kubelka–Munk: F(R) con la reflectancia en porcentaje, nulo fuera de (0, 100) %', async () => {
  const {dom, run, errors} = await editor();
  try {
    assert.equal(run('kubelkaMunk(50)'), 0.25);
    assert.ok(Math.abs(run('kubelkaMunk(20)') - 1.6) < 1e-12, 'F(20 %) = 0.64 / 0.4');
    for (const malo of ['kubelkaMunk(0)', 'kubelkaMunk(100)', 'kubelkaMunk(-5)', 'kubelkaMunk(NaN)'])
      assert.equal(run(malo), null, malo);
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('nm → eV, y la detección de datos en nanómetros', async () => {
  const {dom, run, errors} = await editor();
  try {
    assert.ok(Math.abs(run('nmAeV(400)') - 3.0996) < 1e-9, 'E = 1239.84 / 400');
    assert.equal(run('nmAeV(0)'), null);
    assert.equal(run('pareceNanometros([250, 300, 400, 500, 600, 700, 800])'), true);
    assert.equal(run('pareceNanometros([1.2, 2.5, 3.1, 3.8, 4.2])'), false, 'los eV no son nanómetros');
    assert.equal(run('pareceNanometros([10, 20, 30])'), false, 'los 2θ tampoco');
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('Scherrer: fórmula, y un K o una λ no válidos se rechazan en lugar de sustituirse', async () => {
  const {dom, run, errors} = await editor();
  try {
    const esperado = 0.9 * 0.15406 / (0.4 * Math.PI / 180 * Math.cos(17.5 * Math.PI / 180));
    assert.ok(Math.abs(run('scherrer(0.4, 35, 0.9, 0.15406).nm') - esperado) < 1e-9 * esperado);
    assert.equal(run('scherrer(0.4, 35).K'), 0.9, 'por omisión: K = 0.9');
    assert.equal(run('scherrer(0.4, 35).lambda'), 0.15406, 'y Cu Kα');
    assert.equal(run('scherrer(0.4, 35, 0, 0.15406)'), null, 'K = 0 no se cambia por 0.9');
    assert.equal(run('scherrer(0.4, 35, 0.9, 0)'), null, 'λ = 0 no se cambia por Cu Kα');
    assert.equal(run('scherrer(0, 35)'), null, 'sin anchura no hay tamaño');
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('Tauc: con ventana fijada recupera Eg; el orden de los puntos no cambia nada', async () => {
  const {dom, run, errors} = await editor();
  try {
    const r = enPagina(function () {
      const p = []; for (let x = 2.8; x <= 4.0001; x += 0.01) p.push([+x.toFixed(4), Math.sqrt(Math.max(100 * (x - 3.2), 0)) / x]);
      const fijo = tauc(p, true, { desde: 3.3, hasta: 3.9 });
      const auto = tauc(p, true, null);
      const invertido = tauc(p.slice().reverse(), true, null);
      const soloUnExtremo = tauc(p, true, { desde: 3.3, hasta: null });
      return { eg: fijo.eg, sEg: fijo.sEg, autoFijo: fijo.auto, egAuto: auto.eg, autoFlag: auto.auto,
        egInvertido: invertido.eg, egAutoDesde: auto.desde, egAutoHasta: auto.hasta, soloUnExtremoAuto: soloUnExtremo.auto };
    }, run);
    assert.ok(Math.abs(r.eg - 3.2) < 1e-9, 'Eg = ' + r.eg);
    assert.ok(r.sEg < 1e-9, 'sin ruido el error es nulo: ' + r.sEg);
    assert.equal(r.autoFijo, false, 'una ventana fijada no es automática');
    assert.ok(Math.abs(r.egAuto - 3.2) < 1e-6 && r.autoFlag === true, 'el automático encuentra el tramo recto');
    assert.ok(Math.abs(r.egInvertido - r.egAuto) < 1e-9, 'el orden de entrada no importa');
    assert.ok(r.egAutoDesde >= 3.2 - 1e-9 && r.egAutoHasta <= 3.6, 'el tramo automático queda junto al borde: ' + r.egAutoDesde + '–' + r.egAutoHasta);
    assert.equal(r.soloUnExtremoAuto, true, 'con un solo extremo fijado, el otro sale del automático');
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('el error de Eg coincide con la dispersión real al repetir el ajuste con ruido', async () => {
  const {dom, run, errors} = await editor();
  try {
    const r = enPagina(function () {
      let seed = 20240607;
      const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      const gauss = () => { let u = 0; while (u === 0) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); };
      const Eg = 3.2, m = 40, sig = 0.3, xs = [];
      for (let x = 3.25; x <= 3.951; x += 0.05) xs.push(+x.toFixed(4));
      const eg = [], se = [], previa = [];
      for (let t = 0; t < 400; t++) {
        const pts = xs.map(x => { const y = m * (x - Eg) + sig * gauss(); return [x, Math.sqrt(Math.max(y, 1e-6)) / x]; });
        const q = tauc(pts, true, { desde: 3.25, hasta: 3.95 });
        eg.push(q.eg); se.push(q.sEg);
        /* La fórmula anterior: errores relativos de la pendiente y la ordenada, sumados como independientes. */
        previa.push(Math.abs(q.eg) * Math.sqrt((q.f.sb / q.f.b) ** 2 + (q.f.sm / q.f.m) ** 2));
      }
      const media = a => a.reduce((s, v) => s + v, 0) / a.length;
      const sd = a => { const mu = media(a); return Math.sqrt(a.reduce((s, v) => s + (v - mu) * (v - mu), 0) / (a.length - 1)); };
      return { sdEmpirica: sd(eg), sEgMedio: media(se), previaMedio: media(previa), egMedio: media(eg) };
    }, run);
    const cociente = r.sEgMedio / r.sdEmpirica;
    assert.ok(cociente > 0.85 && cociente < 1.15, 'error reportado / dispersión real = ' + cociente.toFixed(3));
    assert.ok(Math.abs(r.egMedio - 3.2) < 0.001, 'el ajuste no tiene sesgo apreciable: ' + r.egMedio);
    assert.ok(r.previaMedio / r.sdEmpirica > 5, 'la fórmula anterior se pasaba: ' + (r.previaMedio / r.sdEmpirica).toFixed(1) + ' veces');
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('la reflectancia y los nanómetros se transforman y se excluye lo que no tiene sentido', async () => {
  const {dom, run, errors} = await editor();
  try {
    const r = enPagina(function () {
      return puntosTauc({ pts: [[400, 10], [500, 0], [600, 150], [700, 20]] }, { fuente: 'dr', nmAeV: true, directa: true });
    }, run);
    assert.equal(r.convertido, true);
    assert.equal(r.excl, 2, 'R = 0 % y R = 150 % no tienen F(R)');
    assert.equal(r.pts.length, 2);
    assert.ok(Math.abs(r.pts[0][0] - 1239.84 / 400) < 1e-9, 'x en eV');
    assert.ok(Math.abs(r.pts[0][1] - 4.05) < 1e-9, 'F(10 %) = 0.9² / 0.2');
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('UV-Vis de reflectancia: se reconoce por el nombre y tiene su propia etiqueta', async () => {
  const {dom, run, errors} = await editor();
  try {
    const r = enPagina(function () {
      const texto = 'λ,R\n' + Array.from({ length: 20 }, (_, i) => (250 + i * 20) + ',' + (80 - i)).join('\n');
      return {
        reflectancia: detectaTecnica(texto, 'UV-Vis reflectancia.csv').tec.id,
        drs: detectaTecnica(texto, 'medida_DRS_02.csv').tec.id,
        absorbancia: detectaTecnica(texto, 'UV-Vis absorbancia.csv').tec.id,
        etiqueta: TECNICAS.find(t => t.id === 'uvvis-dr').y,
        xrd: 'xrd' in PREG_TECNICA, drx: 'drx' in PREG_TECNICA, preguntasDR: Array.isArray(PREG_TECNICA['uvvis-dr'])
      };
    }, run);
    assert.equal(r.reflectancia, 'uvvis-dr');
    assert.equal(r.drs, 'uvvis-dr');
    assert.equal(r.absorbancia, 'uvvis', 'la absorbancia sigue siendo UV-Vis');
    assert.equal(r.etiqueta, 'Reflectancia (%)');
    assert.equal(r.xrd, true, 'las preguntas de DRX usan la misma clave que la técnica');
    assert.equal(r.drx, false, 'la clave antigua «drx» ya no existe');
    assert.equal(r.preguntasDR, true);
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('al abrir un archivo, los ajustes del análisis solo entran si son válidos', async () => {
  const {dom, run, errors} = await editor();
  try {
    const r = enPagina(function () {
      const b = { id: 'g-aj', type: 'chart', analisis: 'raro', analisisOpc: { serie: -3, fuente: 'x', directa: 'si', nmAeV: true, desde: 3.1, hasta: 'a', K: 0.9, lambda: NaN } };
      saneaBloque(b, [], null);
      return { modoQuitado: b.analisis === undefined, opc: b.analisisOpc };
    }, run);
    assert.equal(r.modoQuitado, true);
    assert.deepEqual(r.opc, { serie: 0, nmAeV: true, desde: 3.1, K: 0.9 });
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('Tauc con reflectancia: un borde directo en 3.1 eV se recupera desde la reflectancia, con la ventana guardada al cerrar', async () => {
  const {dom, run, errors} = await editor();
  try {
    const r = enPagina(function () {
      /* Modelo: borde directo en 3.1 eV. F(R) = 3·√(hν − 3.1)/hν + 0.02 por encima del borde; la reflectancia sale
         de invertir F(R) = (1 − R)² / 2R, con R = (1 + F) − √(F² + 2F). */
      const filas = [];
      for (let lam = 300; lam <= 700; lam += 2) {
        const hv = 1239.84 / lam;
        const f = hv > 3.1 ? 3 * Math.sqrt(hv - 3.1) / hv + 0.02 : 0.02;
        filas.push(lam + ',' + (((1 + f) - Math.sqrt(f * f + 2 * f)) * 100).toFixed(4));
      }
      const b = Object.assign(newBlock('chart'), { data: 'λ,R\n' + filas.join('\n'), tecnica: 'uvvis-dr', xlabel: 'Longitud de onda (nm)', ylabel: 'Reflectancia (%)' });
      const undo0 = S.undo.length;
      openAnalisis(b);
      const modo = [...document.querySelectorAll('#modalRoot .seg-4 button.on')].map(x => x.textContent);
      const aviso = [...document.querySelectorAll('#modalRoot .an-aviso')].map(x => x.textContent).join(' | ');
      const fuente = [...document.querySelectorAll('#modalRoot .seg button.on')].map(x => x.textContent);
      /* El eje está en nm: el aviso ofrece convertir a eV. */
      [...document.querySelectorAll('#modalRoot .an-aviso button')].find(x => /Convertir a eV/.test(x.textContent)).click();
      const eg1 = [...document.querySelectorAll('#modalRoot .an-fila')].find(f => /Banda prohibida/.test(f.textContent)).querySelector('.an-val').textContent;
      const campo = document.querySelector('#modalRoot input[aria-label="Inicio del tramo (eV)"]');
      campo.value = '3.2';
      campo.dispatchEvent(new Event('input'));
      const tramo = [...document.querySelectorAll('#modalRoot .an-fila')].find(f => /Tramo/.test(f.textContent)).textContent;
      closeModal();
      return { modo, aviso, fuente, eg1, tramo, graficas: 1, undo: S.undo.length - undo0, opc: b.analisisOpc };
    }, run);
    assert.deepEqual(r.modo, ['Tauc'], 'la reflectancia abre directamente en Tauc');
    assert.ok(r.fuente.includes('Reflectancia difusa (%)'), 'la fuente de reflectancia se toma de la técnica: ' + r.fuente.join(' / '));
    assert.match(r.aviso, /nanómetros/, 'el aviso de nm aparece');
    const eg = parseFloat(r.eg1);
    assert.ok(Math.abs(eg - 3.1) < 0.08, 'la banda prohibida sale cerca de 3.1 eV: ' + r.eg1);
    assert.match(r.tramo, /fijado a mano/, 'al fijar el inicio, el tramo pasa a ser manual');
    assert.equal(r.opc.nmAeV, true, 'la conversión a eV queda guardada');
    assert.equal(r.opc.desde, 3.2, 'la ventana fijada se guarda con la gráfica');
    assert.equal(r.undo, 1, 'un solo paso de deshacer por sesión de análisis');
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('Scherrer en pantalla: calcula el tamaño y un K no válido avisa en lugar de dar un número', async () => {
  const {dom, run, errors} = await editor();
  try {
    const r = enPagina(function () {
      /* Pico gaussiano centrado en 35° 2θ con FWHM = 0.4°. */
      const sigma = 0.4 / 2.3548, filas = ['2theta,I'];
      for (let x = 20; x <= 50.0001; x += 0.02) filas.push(x.toFixed(2) + ',' + Math.exp(-Math.pow((x - 35) / sigma, 2) / 2).toFixed(6));
      const b = Object.assign(newBlock('chart'), { data: filas.join('\n'), tecnica: 'xrd', analisis: 'scherrer' });
      openAnalisis(b);
      const filas2 = () => [...document.querySelectorAll('#modalRoot .an-fila')].map(f => f.textContent);
      const tamano = filas2().find(t => /Tamaño de cristalita/.test(t));
      const caja = document.querySelector('#modalRoot input[aria-label="Factor de forma K"]');
      caja.value = '0';
      caja.dispatchEvent(new Event('input'));
      const avisos = [...document.querySelectorAll('#modalRoot .hint')].map(x => x.textContent);
      closeModal();
      return { tamano, aviso: avisos.find(t => /positivos/.test(t)) || '', opcK: b.analisisOpc.K };
    }, run);
    const nm = parseFloat(/Tamaño de cristalita\s*([\d.]+)\s*nm/.exec(r.tamano)[1]);
    const esperado = 0.9 * 0.15406 / (0.4 * Math.PI / 180 * Math.cos(17.5 * Math.PI / 180));
    assert.ok(Math.abs(nm - esperado) / esperado < 0.01, 'D = ' + nm + ' nm, esperado ' + esperado.toFixed(3));
    assert.equal(r.aviso, 'K y λ tienen que ser números positivos.');
    assert.equal(r.opcK, 0, 'el valor escrito se guarda tal cual; el aviso lo señala');
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});
