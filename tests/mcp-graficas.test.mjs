/* SPDX-License-Identifier: AGPL-3.0-only */
/* Extensión «graficas» del MCP: comparar_espectros, marcar_picos e
   intervalo_x con archivo_datos.

   TODOS LOS DATOS DE ESTE ARCHIVO SON SINTÉTICOS: sumas de lorentzianas sobre
   una línea base, con los centros en puntos de la rejilla para que la
   posición correcta de cada pico se conozca exactamente. No son mediciones. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFileSync, readFileSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {conServidor, proyecto, bloques} from './_mcp-cliente.mjs';

/* Difractograma sintético de un HDL (posiciones de tipo hidrotalcita, solo
   para tener picos donde se esperan). Rejilla 5–70° en pasos de «paso». */
const PICOS_DRX = [[11.66, 1000, 0.18], [23.44, 450, 0.2], [34.62, 300, 0.25], [39.18, 180, 0.3], [46.66, 120, 0.3], [60.14, 150, 0.2], [61.46, 140, 0.2]];
function drx({escala = 1, desde = 5, paso = 0.02, hasta = 70, base = 100} = {}) {
  const filas = ['2Theta\tIntensity (synthetic)'];
  const n = Math.round((hasta - desde) / paso);
  for (let i = 0; i <= n; i++) {
    const x = +(desde + i * paso).toFixed(2);
    let y = base;
    for (const [c, A, w] of PICOS_DRX) y += escala * A / (1 + ((x - c) / w) ** 2);
    filas.push(x.toFixed(2) + '\t' + y.toFixed(3));
  }
  return filas.join('\n') + '\n';
}
/* FTIR sintético en transmitancia, de 4000 a 400 cm⁻¹ como lo exporta un equipo. */
const BANDAS = [[3450, 40, 120], [1630, 15, 20], [1360, 45, 15], [780, 20, 20], [550, 25, 25]];
function ftir() {
  const filas = ['cm-1,T'];
  for (let x = 4000; x >= 400; x -= 2) {
    let y = 95;
    for (const [c, p, w] of BANDAS) y -= p / (1 + ((x - c) / w) ** 2);
    filas.push(x + ',' + y.toFixed(4));
  }
  return filas.join('\n') + '\n';
}
const tabla = texto => {
  const [cab, ...filas] = texto.split('\n');
  return {cab: cab.split('\t'), filas: filas.map(f => f.split('\t').map(c => c === '' ? NaN : +c))};
};
const serie = (t, j) => t.filas.filter(f => Number.isFinite(f[j])).map(f => [f[0], f[j]]);
const sha = t => createHash('sha256').update(t, 'utf8').digest('hex');
const grafica = (dir, n, id) => proyecto(dir, n).slides.flatMap(bloques).find(b => b.id === id);

function prepara(dir) {
  mkdirSync(join(dir, 'drx'), {recursive: true});
  writeFileSync(join(dir, 'drx/ph8.xy'), drx({escala: 0.6}));
  writeFileSync(join(dir, 'drx/ph9.xy'), drx({escala: 0.8}));
  /* Otra rejilla (paso 0.03 desde 5.01): las series no comparten x. */
  writeFileSync(join(dir, 'drx/ph10.xy'), drx({escala: 1, desde: 5.01, paso: 0.03, hasta: 69.99}));
  writeFileSync(join(dir, 'zn-al-ftir.csv'), ftir());
  writeFileSync(join(dir, 'binario.dat'), Buffer.from([1, 2, 0, 3, 4]));
}

test('MCP graficas: comparar_espectros con datos sintéticos de DRX', {timeout: 180000}, async () => {
  await conServidor(async (c, dir) => {
    prepara(dir);
    assert.equal((await c.llama('crear_presentacion', {archivo: 'p', titulo: 'HDL (datos sintéticos)'})).error, false);
    const r = await c.llama('comparar_espectros', {archivo: 'p', titulo: 'Tres pH', normalizar: 'max',
      archivos: [{ruta: 'drx/ph8.xy', nombre: 'pH 8'}, {ruta: 'drx/ph9.xy', nombre: 'pH 9'}, {ruta: 'drx/ph10.xy', nombre: 'pH 10'}]});
    assert.equal(r.error, false, r.texto);
    const d = r.datos;
    assert.equal(d.diapositiva, 2);
    assert.equal(d.series, 3);
    assert.match(d.tecnica, /Difracción/);
    assert.match(d.rejilla_x, /distinta/);
    assert.match(d.normalizacion, /máximo/);
    assert.match(d.pie, /dividida por su valor máximo/);
    assert.match(d.pie, /desplazadas/);
    const b = grafica(dir, 'p', d.bloque);
    assert.equal(b.xlabel, '2θ (°)');
    assert.equal(b.ylabel, 'Intensidad normalizada (u. a.)');
    assert.equal(b.offset, true);
    assert.ok(b.offsetPct >= 10 && b.offsetPct <= 150 && b.offsetPct % 5 === 0, 'offsetPct ' + b.offsetPct);
    assert.equal(b.caption, d.pie);

    /* Procedencia: todos los archivos en el nombre; la huella es la de la tabla
       guardada (como en el editor) y la respuesta trae el SHA-256 de cada archivo. */
    assert.equal(b.fuente.nombre, 'ph8.xy + ph9.xy + ph10.xy');
    assert.equal(b.fuente.huella, sha(b.data).slice(0, 10));
    const t = tabla(b.data);
    assert.equal(b.fuente.n, t.filas.length);
    assert.deepEqual(t.cab.slice(1), ['pH 8', 'pH 9', 'pH 10']);
    ['drx/ph8.xy', 'drx/ph9.xy', 'drx/ph10.xy'].forEach((ruta, j) => {
      const a = d.archivos[j];
      assert.equal(a.ruta, ruta);
      assert.equal(a.sha256, sha(readFileSync(join(dir, ruta), 'utf8')));
      assert.ok(a.filas_guardadas <= 1500 && a.filas_archivo > 2000);
      /* El máximo original viene del archivo: el punto de su rejilla más
         cercano al centro del pico (003) sintético. */
      assert.equal(a.maximo_original.x, j === 2 ? 11.67 : 11.66);
      assert.equal(a.divisor, a.maximo_original.y);
    });
    /* Normalizado al máximo: cada serie llega a 1 exacto. */
    [1, 2, 3].forEach(j => assert.equal(Math.max(...serie(t, j).map(p => p[1])), 1));
    /* Sin interpolar: cada punto de pH 10 (otra rejilla) es un punto de su
       archivo multiplicado por su divisor, y no aparece donde no se midió. */
    const orig = new Map(tabla(readFileSync(join(dir, 'drx/ph10.xy'), 'utf8')).filas.map(f => [f[0], f[1]]));
    const s10 = serie(t, 3);
    assert.equal(s10.length, d.archivos[2].filas_guardadas);
    s10.forEach(([x, y]) => { assert.ok(orig.has(x), 'x medido ' + x); assert.ok(Math.abs(y * d.archivos[2].divisor - orig.get(x)) < 1e-6); });
    /* Desplazamiento automático: la primera serie arriba y sin cruces donde comparten x. */
    const ys = [1, 2, 3].flatMap(j => serie(t, j).map(p => p[1]));
    const paso = (Math.max(...ys) - Math.min(...ys)) * b.offsetPct / 100;
    const s8 = new Map(serie(t, 1)), s9 = serie(t, 2);
    s9.forEach(([x, y]) => { if (s8.has(x)) assert.ok(s8.get(x) + paso >= y - 1e-9, 'pH 8 queda por encima de pH 9 en x=' + x); });

    /* Superpuestas, sin normalizar, recortadas y en una diapositiva existente. */
    const r2 = await c.llama('comparar_espectros', {archivo: 'p', diapositiva: 2, desplazar: 0, intervalo_x: [30, 10],
      archivos: ['drx/ph8.xy', 'drx/ph9.xy'], caption: 'Mis dos muestras.'});
    assert.equal(r2.error, false, r2.texto);
    const b2 = grafica(dir, 'p', r2.datos.bloque);
    assert.equal(r2.datos.diapositiva, 2);
    assert.equal(b2.offset, false);
    assert.deepEqual(r2.datos.intervalo_x, [10, 30]);
    assert.match(r2.datos.rejilla_x, /común/);
    assert.equal(r2.datos.normalizacion.startsWith('ninguna'), true);
    assert.equal(b2.caption, 'Mis dos muestras.');
    const t2 = tabla(b2.data);
    assert.ok(t2.filas.every(f => f[0] >= 10 && f[0] <= 30));
    assert.deepEqual(t2.cab.slice(1), ['ph8', 'ph9']);
    /* Los valores sin normalizar son los del archivo. */
    const o8 = new Map(tabla(readFileSync(join(dir, 'drx/ph8.xy'), 'utf8')).filas.map(f => [f[0], f[1]]));
    serie(t2, 1).forEach(([x, y]) => assert.equal(y, o8.get(x)));

    /* Por área: la integral por trapecios de cada serie guardada vale 1
       (sin submuestrear, max_puntos alto). */
    const r3 = await c.llama('comparar_espectros', {archivo: 'p', normalizar: 'area', max_puntos: 5000, archivos: ['drx/ph8.xy', 'drx/ph10.xy'], caption: 'Sin decirlo.'});
    assert.equal(r3.error, false, r3.texto);
    const t3 = tabla(grafica(dir, 'p', r3.datos.bloque).data);
    [1, 2].forEach(j => {
      const s = serie(t3, j);
      let A = 0; for (let i = 1; i < s.length; i++) A += (s[i][0] - s[i - 1][0]) * (s[i][1] + s[i - 1][1]) / 2;
      assert.ok(Math.abs(A - 1) < 1e-9, 'área ' + A);
    });
    /* Un pie propio que calla la normalización y el desplazamiento recibe aviso. */
    assert.ok(r3.datos.avisos.some(x => /no dice que las curvas están normalizadas/.test(x)));
    assert.ok(r3.datos.avisos.some(x => /desplazadas en vertical/.test(x)));
  });
});

test('MCP graficas: errores de comparar_espectros', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    prepara(dir);
    await c.llama('crear_presentacion', {archivo: 'p'});
    const falla = async (args, patron) => {
      const r = await c.llama('comparar_espectros', {archivo: 'p', ...args});
      assert.equal(r.error, true, JSON.stringify(args));
      assert.match(r.texto, patron);
    };
    await falla({archivos: ['drx/ph8.xy']}, /de 2 a 8/);
    await falla({archivos: ['drx/ph8.xy', 'drx/nada.xy']}, /No existe/);
    await falla({archivos: ['drx/ph8.xy', 'binario.dat']}, /binario/);
    await falla({archivos: ['drx/ph8.xy', '../fuera.xy']}, /fuera de la carpeta/);
    await falla({archivos: ['drx/ph8.xy', 'drx/ph9.xy'], intervalo_x: [80, 90]}, /no tiene al menos dos puntos entre x = 80 y 90/);
    await falla({archivos: ['drx/ph8.xy', 'drx/ph9.xy'], normalizar: 'z'}, /normalizar/);
    await falla({archivos: ['drx/ph8.xy', 'drx/ph9.xy'], desplazar: 400}, /desplazar/);
    await falla({archivos: ['drx/ph8.xy', {ruta: 'drx/ph9.xy', nombre: 'sd'}]}, /columna de error/);
    await falla({archivos: ['drx/ph8.xy', {ruta: 'drx/ph9.xy', columna: 5}]}, /columna/);
    await falla({archivos: ['drx/ph8.xy', 'drx/ph9.xy'], propiedades: {data: 'x\ty\n1\t2'}}, /no puede cambiar los datos/);
    /* Nada de lo anterior tocó el proyecto. */
    assert.equal(proyecto(dir, 'p').slides.length, 1);
  });
});

test('MCP graficas: marcar_picos en DRX y FTIR sintéticos, Beamer y revisión', {timeout: 180000}, async () => {
  await conServidor(async (c, dir) => {
    prepara(dir);
    await c.llama('crear_presentacion', {archivo: 'p', diapositivas: [
      {titulo: 'DRX', zonas: [[{tipo: 'chart', archivo_datos: 'drx/ph10.xy', caption: 'Difractograma sintético.'}]]},
      {titulo: 'FTIR', zonas: [[{tipo: 'chart', archivo_datos: 'zn-al-ftir.csv', caption: 'Espectro sintético.'}]]}]});
    const v = (await c.llama('ver_presentacion', {archivo: 'p'})).datos;
    const [idDrx, idIr] = [2, 3].map(n => v.diapositivas[n - 1].zonas[0][0].id);

    /* Los siete picos sintéticos, exactos, con su intensidad del archivo. */
    const r = await c.llama('marcar_picos', {archivo: 'p', bloque: idDrx, longitud_onda: 1.5406,
      etiquetas: [{x: 11.6, texto: '(003)'}, {x: 23.5, texto: '(006)'}]});
    assert.equal(r.error, false, r.texto);
    const ps = r.datos.series[0].picos;
    const esperadas = PICOS_DRX.map(p => p[0]).map(x => +(5.01 + Math.round((x - 5.01) / 0.03) * 0.03).toFixed(2));
    assert.deepEqual(ps.map(p => p.x), esperadas, 'posiciones: los puntos de la rejilla más cercanos a cada centro');
    const orig = new Map(tabla(readFileSync(join(dir, 'drx/ph10.xy'), 'utf8')).filas.map(f => [f[0], f[1]]));
    ps.forEach(p => assert.equal(p.y, orig.get(p.x), 'la intensidad es la del archivo'));
    assert.equal(ps[0].texto, '(003)');
    assert.equal(ps[0].origen, 'usuario');
    assert.equal(ps[1].texto, '(006)');
    assert.equal(ps[2].texto, ps[2].x.toFixed(2), 'sin etiqueta: la posición, nunca un índice inventado');
    assert.ok(ps.every(p => !/\(\d{3}\)/.test(p.texto) || p.origen === 'usuario'));
    assert.ok(Math.abs(ps[0].d_angstrom - 1.5406 / (2 * Math.sin(ps[0].x / 2 * Math.PI / 180))) < 1e-4);
    const b = grafica(dir, 'p', idDrx);
    assert.equal(b.picos.length, 7);
    assert.deepEqual(b.picos[0], {x: ps[0].x, y: ps[0].y, serie: 0, txt: '(003)'});

    /* solo_etiquetas y una etiqueta lejos de todo dato. */
    const r2 = await c.llama('marcar_picos', {archivo: 'p', bloque: idDrx, solo_etiquetas: true,
      etiquetas: [{x: 11.66, texto: '(003)'}, {x: 200, texto: 'nada'}]});
    assert.equal(r2.error, false, r2.texto);
    assert.equal(grafica(dir, 'p', idDrx).picos.length, 1);
    assert.ok(r2.datos.avisos.some(x => /«nada» no se puso/.test(x)));

    /* FTIR en transmitancia: las bandas son mínimos y los rótulos van debajo. */
    const ri = await c.llama('marcar_picos', {archivo: 'p', bloque: idIr});
    assert.equal(ri.error, false, ri.texto);
    assert.match(ri.datos.series[0].sentido, /mínimos/);
    assert.deepEqual(ri.datos.series[0].picos.map(p => p.x), BANDAS.map(b => b[0]).sort((a, b) => a - b));
    assert.deepEqual(ri.datos.series[0].picos.map(p => p.texto), ['550', '780', '1360', '1630', '3450']);
    assert.ok(grafica(dir, 'p', idIr).picos.every(p => p.abajo === true));

    /* Errores. */
    const mal = async (args, patron) => { const x = await c.llama('marcar_picos', {archivo: 'p', ...args}); assert.equal(x.error, true); assert.match(x.texto, patron); };
    await mal({bloque: 'nadie'}, /No hay ningún bloque/);
    await mal({bloque: idIr, longitud_onda: 1.5406}, /solo tiene sentido en un difractograma/);
    await mal({bloque: idDrx, prominencia_min: 2}, /prominencia_min/);
    await mal({bloque: idDrx, serie: 4}, /No hay serie/);

    /* Beamer: cada rótulo en su punto, sin recortarse con el marco. */
    await c.llama('marcar_picos', {archivo: 'p', bloque: idDrx, etiquetas: [{x: 11.6, texto: '(003)'}]});
    const ex = await c.llama('exportar_presentacion', {archivo: 'p', formato: 'beamer'});
    assert.equal(ex.error, false, ex.texto);
    const tex = readFileSync(join(dir, ex.datos.tex), 'utf8');
    assert.match(tex, /clip mode=individual/);
    /* El PDF dibuja el pico entero: el submuestreo de pgfplots conserva el máximo. */
    assert.ok(tex.includes('(' + ps[0].x + ',' + ps[0].y + ')'), 'la cima de (003) está entre las coordenadas');
    assert.match(tex, /\\draw\[serieA, line width=\.4pt\] \(axis cs:11\.67,[\d.]+\) \+\+\(0,2pt\) -- \+\+\(0,5pt\) node\[anchor=south, font=\\tiny, inner sep=1pt\] \{\(003\)\};/);
    assert.match(tex, /\(axis cs:1360,[\d.]+\) \+\+\(0,-2pt\) -- \+\+\(0,-5pt\) node\[anchor=north/);

    /* Datos cambiados a mano: el rótulo ya no cae en un punto y la revisión lo dice. */
    await c.llama('editar_bloque', {archivo: 'p', bloque: idDrx, cambios: {data: 'x\ty\n10\t1\n11\t2\n12\t1'}});
    const rev = (await c.llama('revisar_presentacion', {archivo: 'p'})).datos;
    assert.ok(rev.adicional.some(h => h.regla === 'picos-sin-dato' && h.diapositiva === 2), JSON.stringify(rev.adicional));
  });
});

test('MCP graficas: intervalo_x recorta archivo_datos y lo declara', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    prepara(dir);
    const r = await c.llama('crear_presentacion', {archivo: 'p', diapositivas: [{titulo: 'Basal', zonas: [[
      {tipo: 'chart', archivo_datos: 'drx/ph9.xy', intervalo_x: [5, 15], caption: 'Reflexión basal (sintético).'}]]}]});
    assert.equal(r.error, false, r.texto);
    const b = proyecto(dir, 'p').slides[1].blocks[0];
    const t = tabla(b.data);
    assert.ok(t.filas.every(f => f[0] >= 5 && f[0] <= 15));
    assert.equal(t.filas.length, 501);
    assert.equal(b.fuente.nombre, 'ph9.xy (x 5–15)');
    assert.equal(b.tecnica, 'xrd', 'la técnica se detecta con el archivo completo');
    assert.equal(b.intervalo_x, undefined);
    assert.deepEqual(r.datos.datos_importados[0].x, [5, 15]);
    const mal = await c.llama('agregar_bloque', {archivo: 'p', diapositiva: 2, bloque: {tipo: 'chart', archivo_datos: 'drx/ph9.xy', intervalo_x: [100, 120]}});
    assert.equal(mal.error, true);
    assert.match(mal.texto, /no tiene al menos dos filas entre x = 100 y 120/);
    const sin = await c.llama('agregar_bloque', {archivo: 'p', diapositiva: 2, bloque: {tipo: 'chart', intervalo_x: [1, 2]}});
    assert.equal(sin.error, true);
    assert.match(sin.texto, /solo vale junto a «archivo_datos»/);
  });
});
