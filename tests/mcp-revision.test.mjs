/* SPDX-License-Identifier: AGPL-3.0-only */
/* Extensión «revision»: cada regla con un caso que debe avisar y otro,
   parecido, que no (el texto en español y los ejemplos de química de una
   charla de materiales), que las reglas llegan a «adicional» de
   revisar_presentacion, que no avisan en los ejemplos incluidos y que pasan
   rápido sobre una charla de 40 diapositivas. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {conServidor, proyecto} from './_mcp-cliente.mjs';

const T = t => ({tipo: 'text', text: t});
const D = (texto, extra) => ({titulo: 'Resultados del lote', zonas: [[T(texto)]], ...extra});
/* La portada es la diapositiva 1: la primera de «diapositivas» es la 2. */
async function revisa(c, dir, diapositivas, meta, titulo = 'Prueba') {
  const r = await c.llama('crear_presentacion', {archivo: 'r', titulo, diapositivas, sobrescribir: true});
  assert.equal(r.error, false, r.texto);
  if (meta) {
    const p = proyecto(dir, 'r');
    Object.assign(p.meta, meta);
    writeFileSync(join(dir, 'r.json'), JSON.stringify(p));
  }
  const v = await c.llama('revisar_convenciones', {archivo: 'r'});
  assert.equal(v.error, false, v.texto);
  assert.ok(!v.datos.hallazgos.some(h => /La regla falló/.test(h.problema)), JSON.stringify(v.datos.hallazgos));
  return v.datos.hallazgos;
}
const de = (hs, regla) => hs.filter(h => h.regla === regla);
const nada = (hs, regla) => assert.deepEqual(de(hs, regla), [], regla + ' no debía avisar');

test('MCP revision: unidades', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    let h = await revisa(c, dir, [D('Envejecido 24 hrs a 65 grados C con 50 ml de agua; lavado 30 seg.'), D('Secado a 25 ºC; 5 Kg de precursor y 300 °K.')]);
    const s = de(h, 'unidades-simbolos');
    assert.deepEqual(s.map(x => x.diapositiva), [2, 2, 2, 2, 3, 3, 3]);
    assert.ok(s.every(x => x.categoria === 'unidades' && x.bloque && x.arreglo));
    assert.match(s.find(x => /hrs/.test(x.problema)).arreglo, /«24 h»/);
    h = await revisa(c, dir, [D('Envejecido 24 h a 65 °C con 50 mL; el segundo lavado duró 30 s. Las hrs de laboratorio no cuentan; grupo Kg.')]);
    nada(h, 'unidades-simbolos');

    /* Número pegado a la unidad: solo con la notación automática apagada. */
    const pegado = [D('Calcinado a 500°C con 10mL de disolución.')];
    assert.equal(de(await revisa(c, dir, pegado, {notacion: false}), 'unidades-espacio').length, 1);
    nada(await revisa(c, dir, pegado), 'unidades-espacio');
    nada(await revisa(c, dir, [D('Inclinación de 45°, rendimiento del 20%, orbital 1s, politipo 2M1 y Ti3C2.')], {notacion: false}), 'unidades-espacio');

    /* La misma magnitud con dos unidades. */
    h = await revisa(c, dir, [D('Síntesis a 90 °C.'), D('Calcinado a 773 K.')]);
    assert.equal(de(h, 'unidades-mezcla').length, 1);
    assert.match(de(h, 'unidades-mezcla')[0].problema, /°C \(diapositiva 2\) y en K \(diapositiva 3\)/);
    h = await revisa(c, dir, [D('Espaciado basal d = 7.6 Å.'), D('La distancia interlaminar es de 0.76 nm.')]);
    assert.match(de(h, 'unidades-mezcla')[0].problema, /espaciado en nm/);
    h = await revisa(c, dir, [D('Ea = 45 kJ/mol por Arrhenius.'), D('Ea = 0.47 eV por DFT.')]);
    assert.match(de(h, 'unidades-mezcla')[0].problema, /«Ea»/);
    /* Temperatura criogénica o ambiente en K, rampas en K/min, tamaños en nm. */
    nada(await revisa(c, dir, [D('Síntesis a 80 °C con rampa de 10 K/min.'), D('Susceptibilidad medida de 2 a 300 K.'), D('Partículas de 20 nm con espaciado de 7.6 Å.')]), 'unidades-mezcla');
    nada(await revisa(c, dir, [D('Isoterma BET a T = 77 K.'), D('Síntesis a T = 100 °C.')]), 'unidades-mezcla');
  });
});

test('MCP revision: cifras', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    let h = await revisa(c, dir, [D('Espaciado basal d = 7.60412 Å.')]);
    assert.equal(de(h, 'cifras-excesivas').length, 1);
    assert.match(de(h, 'cifras-excesivas')[0].problema, /«7\.60412 Å»/);
    nada(await revisa(c, dir, [D('d = 7.60412(3) Å y a = 3.07412 ± 0.00002 Å; λ = 1.540598 Å (Cu Kα); d = 7.60 Å; doi 10.1021/acs.chemmater.1c01234; 123456 cuentas.')]), 'cifras-excesivas');

    const tabla = filas => D('Tabla de resultados.', {zonas: [[{tipo: 'table', header: true, filas}]]});
    h = await revisa(c, dir, [tabla([['Muestra', 'd (Å)'], ['A', '7.6'], ['B', '7.612'], ['C', '8']])]);
    assert.equal(de(h, 'cifras-columna').length, 1);
    assert.match(de(h, 'cifras-columna')[0].problema, /«d \(Å\)»/);
    nada(await revisa(c, dir, [tabla([['[A⁻]/[HA]', 'pH − pKa'], ['0.1', '−1'], ['1', '0'], ['10', '1']]), tabla([['Muestra', 'Rendimiento (%)'], ['A', '81.2 %'], ['B', '79.5 %'], ['C', '84.0 %']])]), 'cifras-columna');

    h = await revisa(c, dir, [D('Disolución 0.5 M de Zn(NO3)2.'), D('Relación Zn/Al de 2,5 en la mezcla.')]);
    assert.equal(de(h, 'cifras-separador').length, 1);
    assert.equal(de(h, 'cifras-separador')[0].diapositiva, 3);
    nada(await revisa(c, dir, [D('Disolución 0.5 M en 1,2-etanodiol, par (1,2), 1,000 ciclos y 2.1 mL.')]), 'cifras-separador');
    nada(await revisa(c, dir, [D('Disolución 0,5 M y relación de 2,5.')]), 'cifras-separador');
    nada(await revisa(c, dir, [D('Centrifugado a 12.500 rpm.'), D('Disolución 0,5 M.')]), 'cifras-separador');
  });
});

test('MCP revision: notación', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    const formula = [D('Se obtuvo Zn(OH)2 junto con ZnCl2.')];
    const h = await revisa(c, dir, formula, {notacion: false});
    assert.equal(de(h, 'notacion-formulas').length, 1);
    assert.match(de(h, 'notacion-formulas')[0].arreglo, /\$\\mathrm\{Zn\(OH\)_2\}\$/);
    nada(await revisa(c, dir, formula), 'notacion-formulas');
    nada(await revisa(c, dir, [D('Por DRX y SEM; R2 = 0.99 y ZnO.')], {notacion: false}), 'notacion-formulas');

    let s = de(await revisa(c, dir, [D('Patrón de difracción de rayos X (DRX).'), D('El XRD confirma la fase.')]), 'notacion-sinonimos');
    assert.equal(s.length, 1);
    assert.match(s[0].problema, /«DRX» \(diapositiva 2\) y «XRD» \(diapositiva 3\)/);
    s = de(await revisa(c, dir, [D('Espectro UV-Vis.'), D('Absorción UV-vis del sólido.')]), 'notacion-sinonimos');
    assert.equal(s.length, 1);
    nada(await revisa(c, dir, [D('Difracción de rayos X (DRX) y PXRD de referencia.'), D('La DRX confirma la fase.')]), 'notacion-sinonimos');
  });
});

test('MCP revision: siglas', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    let a = de(await revisa(c, dir, [D('Se analizó por DRX y SEM.'), D('Difracción de rayos X (DRX) del HDL de Zn/Al.')]), 'acronimos-sin-definir');
    const drx = a.find(x => /«DRX»/.test(x.problema)), sem = a.find(x => /«SEM»/.test(x.problema));
    assert.match(drx.problema, /antes de definirse \(se define en la diapositiva 3\)/);
    assert.equal(drx.diapositiva, 2);
    assert.match(sem.problema, /no se define/);
    assert.match(a.find(x => /«HDL»/.test(x.problema)).problema, /no se define/);

    a = de(await revisa(c, dir, [
      D('Difracción de rayos X (DRX) y BET. DRX (difracción de rayos X) otra vez; SEM (microscopía electrónica de barrido).'),
      D('La DRX y el SEM confirman; UV, IR, pH y SI; Fe(III) y Co(II); CO2, H2O y NO; MUY IMPORTANTE: HOLA.'),
      {titulo: 'Equilibrio', zonas: [[{tipo: 'chem', tex: 'HA <=> H+ + A-'}, T('Solo HA en disolución.')]]}
    ], {glosas: [{termino: 'BET', breve: 'Brunauer–Emmett–Teller'}]}), 'acronimos-sin-definir');
    assert.deepEqual(a, []);
    /* Desarrollada en el título de la charla, que se ve en la portada. */
    nada(await revisa(c, dir, [D('El HDL se lavó tres veces.')], null, 'Hidróxidos dobles laminares (HDL) de Zn/Al'), 'acronimos-sin-definir');
  });
});

test('MCP revision: notas del orador', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    const cinco = notas => notas.map((n, k) => D('Contenido ' + k + '.', {notas: n || undefined, minutos: 1}));
    let h = await revisa(c, dir, cinco(['Decir A.', '', 'Decir C.', '', '']));
    let o = de(h, 'orador-sin-notas');
    assert.equal(o.length, 1);
    assert.match(o[0].problema, /Las diapositivas 3, 5, 6 no tienen notas \(2 de 5/);
    assert.equal(o[0].diapositiva, 3);
    assert.match(de(await revisa(c, dir, cinco(['', '', '', '', ''])), 'orador-sin-notas')[0].problema, /Ninguna/);
    nada(await revisa(c, dir, [D('Uno.'), D('Dos.')]), 'orador-sin-notas');
    nada(await revisa(c, dir, cinco(['a', 'b', 'c', 'd', 'e'])), 'orador-sin-notas');

    /* Sin minutos: solo cuando la mayoría los tiene. */
    const mins = ms => ms.map((m, k) => D('Contenido ' + k + '.', {minutos: m || undefined}));
    const sm = de(await revisa(c, dir, mins([1, 2, 1, 0, 2])), 'orador-sin-minutos');
    assert.equal(sm.length, 1);
    assert.match(sm[0].problema, /Las diapositivas 1, 5 no tienen minutos/);
    nada(await revisa(c, dir, mins([0, 0, 0, 0, 0])), 'orador-sin-minutos');
    nada(await revisa(c, dir, mins([1, 0, 0, 1, 0])), 'orador-sin-minutos');

    h = await revisa(c, dir, [D('Largas.', {minutos: 1, notas: 'palabra '.repeat(400)}), D('Cortas.', {minutos: 1, notas: 'palabra '.repeat(150)}), D('Sin tiempo.', {notas: 'palabra '.repeat(400)})]);
    o = de(h, 'orador-notas-largas');
    assert.deepEqual(o.map(x => x.diapositiva), [2]);
    assert.match(o[0].problema, /400 palabras\) necesitan unos 3.1 min/);
  });
});

test('MCP revision: referencias a figuras y tablas', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    const graf = pie => ({tipo: 'chart', datos: 'x,y\n1,2\n2,3', eje_x: '2θ (°)', eje_y: 'Intensidad (u.a.)', pie});
    let f = de(await revisa(c, dir, [{titulo: 'DRX', zonas: [[T('Como muestra la Figura 3, la fase es pura.'), graf('Difractograma ilustrativo.')]]}]), 'figuras-referencias');
    assert.equal(f.length, 1);
    assert.match(f[0].problema, /Figura 3 y la charla tiene 1 figura$/);
    f = de(await revisa(c, dir, [{titulo: 'A', zonas: [[graf('Figura 1. Patrón A.'), T('Comparar con la Figura 2 y la Tabla 2.')]]}, {titulo: 'B', zonas: [[graf('Figura 1. Patrón B.'), {tipo: 'table', header: true, filas: [['a', 'b'], ['1', '2']]}]]}]), 'figuras-referencias');
    assert.ok(f.some(x => /Dos pies numerados «Figura 1»/.test(x.problema)));
    assert.ok(f.some(x => /Figura 2, pero ningún pie lleva ese número/.test(x.problema)));
    assert.ok(f.some(x => /Tabla 2 y la charla tiene 1 tabla$/.test(x.problema)));
    nada(await revisa(c, dir, [{titulo: 'DRX', zonas: [[graf('Figura 1. Difractograma; comparar con la Figura 3 de Pérez et al.'), T('La Figura 1 muestra la fase; la Figura 4 en [@perez] es otra muestra.')]]}]), 'figuras-referencias');
  });
});

test('MCP revision: en revisar_presentacion, robusta y sin avisos de más en los ejemplos', {timeout: 300000}, async () => {
  await conServidor(async (c, dir) => {
    /* Bloques con valores raros no rompen ninguna regla. */
    const raro = await revisa(c, dir, [{titulo: 'Raro', zonas: [[{tipo: 'table', filas: [[null, 3], [], ['x']]}, {tipo: 'bullets', items: [null, {t: 5}]}, {tipo: 'text', text: 7}]]}]);
    assert.ok(Array.isArray(raro));

    await c.llama('crear_presentacion', {archivo: 'q', titulo: 'Q', sobrescribir: true, diapositivas: [D('Envejecido 24 hrs; se analizó por DRX.'), D('El XRD confirma la fase.')]});
    const rev = (await c.llama('revisar_presentacion', {archivo: 'q'})).datos;
    const reglas = new Set(rev.adicional.map(h => h.regla));
    ['unidades-simbolos', 'notacion-sinonimos', 'acronimos-sin-definir'].forEach(r => assert.ok(reglas.has(r), r));
    assert.ok(rev.adicional.every(h => h.categoria && h.diapositiva >= 1 && h.problema && h.arreglo));
    const solo = (await c.llama('revisar_convenciones', {archivo: 'q', categorias: ['unidades']})).datos;
    assert.deepEqual([...new Set(solo.hallazgos.map(h => h.categoria))], ['unidades']);
    assert.ok(solo.reglas.includes('figuras-referencias'));

    /* Los doce ejemplos: el único aviso es real (tres diapositivas de
       contenido sin notas cuando las demás las tienen). */
    const ej = (await c.llama('listar_ejemplos', {})).datos;
    const ejemplos = ej.ejemplos || ej;
    assert.equal(ejemplos.length, 12);
    for (const {id} of ejemplos) {
      await c.llama('crear_presentacion', {archivo: 'ej', desde_ejemplo: id, sobrescribir: true});
      const hs = (await c.llama('revisar_convenciones', {archivo: 'ej'})).datos.hallazgos;
      assert.deepEqual(hs.map(h => h.regla), ['orador-sin-notas'], id + ': ' + JSON.stringify(hs));
    }
  });
});

test('MCP revision: 40 diapositivas en poco tiempo', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    const ds = Array.from({length: 40}, (_, k) => ({titulo: 'Lote ' + k, minutos: 1, notas: k % 3 ? 'Decir el resultado del lote.' : '',
      zonas: [[T('Difracción de rayos X (DRX) del HDL a 65 °C durante 24 h; d = 7.6' + k + ' Å, ver Figura ' + (k + 1) + '. SEM y FTIR.'),
        {tipo: 'bullets', items: ['Zn(OH)2 a pH 10', '50 mL de NaOH 2 M', 'Relación Zn/Al = 2']},
        {tipo: 'table', header: true, filas: [['Muestra', 'd (Å)', 'FWHM (°)'], ['A', '7.61', '0.21'], ['B', '7.63', '0.25'], ['C', '7.60', '0.19']]},
        {tipo: 'chart', datos: 'x,y\n1,2\n2,3\n3,4', eje_x: '2θ (°)', eje_y: 'Intensidad (u.a.)', pie: 'Difractograma ilustrativo del lote ' + k + '.'}]]}));
    const r = await c.llama('crear_presentacion', {archivo: 'grande', titulo: 'Grande', diapositivas: ds});
    assert.equal(r.error, false, r.texto);
    const t0 = Date.now();
    const v = (await c.llama('revisar_convenciones', {archivo: 'grande'})).datos;
    const ms = Date.now() - t0;
    assert.ok(v.ms < 1000, 'las reglas tardaron ' + v.ms + ' ms');
    assert.ok(ms < 5000, 'la herramienta tardó ' + ms + ' ms');
    const reglas = v.hallazgos.map(h => h.regla);
    assert.ok(reglas.includes('acronimos-sin-definir') && reglas.includes('orador-sin-notas'));
    assert.ok(!reglas.includes('figuras-referencias'), 'Figura 1…40 existen');
    assert.ok(!reglas.includes('cifras-excesivas') && !reglas.includes('unidades-simbolos') && !reglas.includes('cifras-columna'));
  });
});
