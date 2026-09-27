/* SPDX-License-Identifier: AGPL-3.0-only */
/* Extensión «tablas» (mcp/extensiones/tablas.*): tablas desde CSV con la
   lectura de las gráficas, redondeo sobre los dígitos escritos, valor ± error
   redondeado según la incertidumbre, unidades, reparto en varias diapositivas y
   los errores que protegen los datos. Los archivos son ilustrativos. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {conServidor, proyecto, bloques} from './_mcp-cliente.mjs';

const tabla = (dir, archivo, n) => bloques(proyecto(dir, archivo).slides[n - 1]).find(b => b.type === 'table');

test('MCP tablas: CSV en español, redondeo y unidades', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    /* Excel en español: punto y coma y coma decimal, con una celda de texto,
       una vacía y el exponente que escribe un equipo. */
    writeFileSync(join(dir, 'sintesis.csv'), '﻿Muestra;Zn/Al;pH;T [°C];Área BET;Notas\r\n'
      + 'ZA-1;2;8,0;65;45,678;\r\nZA-2;3;9,5;65;38,2;lavada\r\nZA-3;4;10,0;80;0,0004567;n.d.\r\nZA-4;2;10,5;80;1,2e-5;\r\n');
    const r = await c.llama('crear_presentacion', {archivo: 'p', diapositivas: [{titulo: 'Síntesis', zonas: [[
      {tipo: 'table', archivo_tabla: 'sintesis.csv', cifras: {5: 3}, unidades: {'Área BET': 'm²/g'}, caption: 'Datos ilustrativos.'}]]}]});
    assert.equal(r.error, false, r.texto);
    assert.deepEqual(r.datos.avisos, [], 'las opciones no llegan a la app como propiedades desconocidas');
    const b = tabla(dir, 'p', 2);
    assert.equal(b.header, true);
    assert.equal(b.caption, 'Datos ilustrativos.');
    assert.deepEqual(b.rows, [
      ['Muestra', 'Zn/Al', 'pH', 'T [°C]', 'Área BET (m²/g)', 'Notas'],
      ['ZA-1', '2', '8,0', '65', '45,7', ''],
      ['ZA-2', '3', '9,5', '65', '38,2', 'lavada'],
      ['ZA-3', '4', '10,0', '80', '0,000457', 'n.d.'],
      ['ZA-4', '2', '10,5', '80', '$1{,}2\\times10^{-5}$', '']]);
    const info = r.datos.datos_importados[0];
    assert.equal(info.bloque, b.id);
    assert.equal(info.archivo_tabla, 'sintesis.csv');
    assert.deepEqual(info.lectura, {separador: ';', decimal: ',', encabezado: true, encabezado_detectado: true});
    assert.deepEqual([info.filas_archivo, info.filas_mostradas, info.columnas_archivo, info.columnas_mostradas], [4, 4, 6, 6]);
    assert.deepEqual(info.valores, {numericas: 16, sin_cambio: 14, redondeadas: 2, solo_formato: 1, con_menos_cifras: 1, texto: 6, vacias: 2, pares_combinados: 0});
    assert.deepEqual(info.ejemplos_redondeo, [{original: '45,678', mostrado: '45,7'}, {original: '0,0004567', mostrado: '0,000457'}]);
    assert.deepEqual(info.columnas.map(x => x.unidad), [null, null, null, '°C', 'm²/g', null]);
    assert.ok(info.avisos.some(a => /menos cifras de las pedidas/.test(a)), 'no inventa ceros: 1,2e-5 no pasa a 1,20e-5');
    assert.ok(info.avisos.some(a => /sin unidad.*«Zn\/Al», «pH»/.test(a)));
    assert.equal(info.ajuste.cabe, true);
    assert.equal(proyecto(dir, 'p').slides[1].blocks[0]._importado, undefined, 'el informe no se guarda en el proyecto');

    /* Redondeo sobre los dígitos escritos: 1,005 → 1,01 (en binario sería
       1,00), negativos, exponentes, acarreo y cero. */
    writeFileSync(join(dir, 'bordes.txt'), 'x\ty\tz\n0.0004567\t9.996\t9.96\n-0.0004567\t0.004\t99.5\n1.2e-5\t-0.004\t12345\n1.005\t1.2345E3\t2.5\n-3.14159\t-0.125\t0.00049\n');
    const e = await c.llama('agregar_bloque', {archivo: 'p', diapositiva: 2, bloque: {tipo: 'table', archivo_tabla: 'bordes.txt', cifras: {x: 3, z: 2}, decimales: {y: 2}}});
    assert.equal(e.error, false, e.texto);
    assert.deepEqual(tabla(dir, 'p', 2).rows, [['Muestra', 'Zn/Al', 'pH', 'T [°C]', 'Área BET (m²/g)', 'Notas'], ...tabla(dir, 'p', 2).rows.slice(1)], 'la primera tabla sigue igual');
    const bt = bloques(proyecto(dir, 'p').slides[1]).filter(x => x.type === 'table')[1];
    assert.deepEqual(bt.rows, [
      ['x', 'y', 'z'],
      ['0.000457', '10.00', '10'],
      ['-0.000457', '0.00', '$1.0\\times10^{2}$'],
      ['$1.2\\times10^{-5}$', '0.00', '$1.2\\times10^{4}$'],
      ['1.01', '$1.2345\\times10^{3}$', '2.5'],
      ['-3.14', '-0.13', '0.00049']]);
    const ib = e.datos.datos_importados[0];
    assert.equal(ib.lectura.separador, 'tabulador');
    assert.ok(ib.avisos.some(a => /2 valor\(es\) quedaron en cero/.test(a)));

    /* separador_decimal, columnas por nombre y en otro orden, filas, y un
       encabezado con la unidad tras «/». */
    writeFileSync(join(dir, 'cv.csv'), 'E / V,I (mA),Ciclo\n0.10,1.25,1\n0.20,2.5,1\n0.30,3.75,2\n');
    const f = await c.llama('agregar_bloque', {archivo: 'p', diapositiva: 2, bloque: {tipo: 'table', archivo_tabla: 'cv.csv', columnas: ['I (mA)', 1], filas: [2, 3], separador_decimal: ',', pie_con_fuente: true}});
    assert.equal(f.error, false, f.texto);
    const bf = bloques(proyecto(dir, 'p').slides[1]).find(x => x.id === f.datos.id);
    assert.deepEqual(bf.rows, [['I (mA)', 'E / V'], ['2,5', '0,20'], ['3,75', '0,30']]);
    assert.equal(bf.caption, 'Datos: cv.csv.');
    assert.deepEqual(f.datos.datos_importados[0].columnas.map(x => x.unidad), ['mA', 'V']);
    assert.equal(f.datos.datos_importados[0].valores.solo_formato, 4);

    /* editar_bloque vuelve a leer el archivo (los cambios no llevan «tipo»). */
    const g = await c.llama('editar_bloque', {archivo: 'p', bloque: f.datos.id, cambios: {archivo_tabla: 'cv.csv', encabezado: false, filas: [1, 2]}});
    assert.equal(g.error, false, g.texto);
    const bg = bloques(proyecto(dir, 'p').slides[1]).find(x => x.id === f.datos.id);
    assert.equal(bg.header, false);
    assert.deepEqual(bg.rows, [['E / V', 'I (mA)', 'Ciclo'], ['0.10', '1.25', '1']]);
    assert.equal(bg.caption, 'Datos: cv.csv.', 'el mismo archivo conserva su pie');

    /* Con otro archivo, el pie deja de atribuirle los datos al anterior. */
    writeFileSync(join(dir, 'cv2.csv'), 'E / V,I (mA)\n0.5,4.1\n');
    const h = await c.llama('editar_bloque', {archivo: 'p', bloque: f.datos.id, cambios: {archivo_tabla: 'cv2.csv'}});
    assert.equal(h.error, false, h.texto);
    assert.equal(bloques(proyecto(dir, 'p').slides[1]).find(x => x.id === f.datos.id).caption, '');
    assert.ok(h.datos.datos_importados[0].avisos.some(a => /decía «Datos: cv\.csv\.»/.test(a)));

    /* editar_bloque no sabe el tipo en Node: la página lo comprueba. */
    const graf = await c.llama('agregar_bloque', {archivo: 'p', diapositiva: 2, bloque: {tipo: 'chart', caption: 'Gráfica'}});
    const antes = JSON.stringify(proyecto(dir, 'p'));
    const mal = await c.llama('editar_bloque', {archivo: 'p', bloque: graf.datos.id, cambios: {archivo_tabla: 'cv.csv'}});
    assert.equal(mal.error, true);
    assert.match(mal.texto, /solo vale para bloques «table».*«chart»/);
    assert.equal(JSON.stringify(proyecto(dir, 'p')), antes);
  });
});

test('MCP tablas: valor ± error redondeado según la incertidumbre', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    /* Tabulado, con comillas, la esquina vacía y una incertidumbre ausente. */
    writeFileSync(join(dir, 'drx.tsv'), '\td003 (Å)\t± (Å)\tFWHM\tsd\n'
      + '"ZA, pH 8"\t7.5612\t0.0213\t0.4123\t0.0096\n'
      + 'ZA-2\t7.6049\t0.0151\t0.3877\t0.051\n'
      + 'ZA-3\t1234\t56\t0.3\t0.013\n'
      + 'ZA-4\t1.23e-5\t4.4e-7\t0.2049\tn.d.\n');
    const r = await c.llama('crear_presentacion', {archivo: 'e', diapositivas: [{titulo: 'DRX', zonas: [[{tipo: 'table', archivo_tabla: 'drx.tsv', combinar_error: true}]]}]});
    assert.equal(r.error, false, r.texto);
    const info = r.datos.datos_importados[0];
    assert.deepEqual(tabla(dir, 'e', 2).rows, [
      ['', 'd003 (Å)', 'FWHM'],
      ['ZA, pH 8', '7.56 ± 0.02', '0.41 ± 0.01'],
      ['ZA-2', '7.605 ± 0.015', '0.39 ± 0.05'],
      ['ZA-3', '1230 ± 60', '0.3 ± 0.013'],
      ['ZA-4', '$(1.23 \\pm 0.04)\\times10^{-5}$', '0.2049']]);
    assert.equal(info.columnas_archivo, 5);
    assert.equal(info.columnas_mostradas, 3);
    assert.deepEqual(info.columnas.map(x => [x.archivo, x.error_de, x.unidad]), [[1, undefined, null], [2, 3, 'Å'], [4, 5, null]]);
    assert.equal(info.valores.pares_combinados, 7);
    assert.match(info.incertidumbre, /1 cifra significativa \(2 si la primera es un 1\)/);
    assert.ok(info.avisos.some(a => /no son un número positivo.*n\.d\./.test(a)), 'la incertidumbre de texto no se inventa');
    assert.ok(info.avisos.some(a => /menos decimales que su incertidumbre/.test(a)), '0,3 no pasa a 0,300');

    /* cifras_error fuerza dos cifras; combinar solo una columna. */
    const d = await c.llama('agregar_bloque', {archivo: 'e', diapositiva: 2, bloque: {tipo: 'table', archivo_tabla: 'drx.tsv', combinar_error: [2], cifras_error: 2, filas: [1, 2], separador_decimal: ','}});
    assert.equal(d.error, false, d.texto);
    const bd = bloques(proyecto(dir, 'e').slides[1]).find(x => x.id === d.datos.id);
    assert.deepEqual(bd.rows, [['', 'd003 (Å)', 'FWHM', 'sd'], ['ZA, pH 8', '7,561 ± 0,021', '0,4123', '0,0096'], ['ZA-2', '7,605 ± 0,015', '0,3877', '0,051']]);

    /* Sin incertidumbre, el valor sigue la regla general de su columna; un
       cero escrito con más decimales se recorta. */
    const g = await c.llama('agregar_bloque', {archivo: 'e', diapositiva: 2, bloque: {tipo: 'table', archivo_tabla: 'drx.tsv', combinar_error: true, cifras: 2, filas: [4, 4]}});
    assert.equal(g.error, false, g.texto);
    assert.deepEqual(bloques(proyecto(dir, 'e').slides[1]).find(x => x.id === g.datos.id).rows[1], ['ZA-4', '$(1.23 \\pm 0.04)\\times10^{-5}$', '0.20']);
    writeFileSync(join(dir, 'ceros.csv'), 'm (g),± m (g),x\n0.000,0.02,0.000\n1.234,0.02,1.26\n');
    const z = await c.llama('agregar_bloque', {archivo: 'e', diapositiva: 2, bloque: {tipo: 'table', archivo_tabla: 'ceros.csv', combinar_error: true, decimales: {x: 1}}});
    assert.equal(z.error, false, z.texto);
    assert.deepEqual(bloques(proyecto(dir, 'e').slides[1]).find(x => x.id === z.datos.id).rows, [['m (g)', 'x'], ['0.00 ± 0.02', '0.0'], ['1.23 ± 0.02', '1.3']]);
  });
});

test('MCP tablas: partir en varias diapositivas, de una vez', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    const filas = Array.from({length: 20}, (_, i) => `ZA-${i + 1};${2 + i % 3};${(8 + i * 0.1).toFixed(1).replace('.', ',')}`);
    writeFileSync(join(dir, 'serie.csv'), 'Muestra;Zn/Al;pH\n' + filas.join('\n') + '\n');
    await c.llama('crear_presentacion', {archivo: 's', titulo: 'Serie'});

    /* Sin partir: una diapositiva y el aviso de que no cabe. */
    const g = await c.llama('agregar_bloque', {archivo: 's', diapositiva: 1, bloque: {tipo: 'table', archivo_tabla: 'serie.csv'}});
    assert.equal(g.error, true, 'la portada no admite bloques');
    await c.llama('agregar_diapositiva', {archivo: 's', titulo: 'Toda'});
    const t = await c.llama('agregar_bloque', {archivo: 's', diapositiva: 2, bloque: {tipo: 'table', archivo_tabla: 'serie.csv'}});
    assert.equal(t.error, false, t.texto);
    assert.equal(t.datos.datos_importados[0].ajuste.cabe, false);
    assert.ok(t.datos.datos_importados[0].avisos.some(a => /20 filas.*partir: true/.test(a)));
    const p = await c.llama('tabla_desde_archivo', {archivo: 's', archivo_tabla: 'serie.csv', titulo: 'La serie completa', posicion: 2, partir: true, notas: 'Comentar solo la tendencia.'});
    assert.equal(p.error, false, p.texto);
    assert.deepEqual(p.datos.diapositivas.map(x => [x.n, x.titulo]), [[2, 'La serie completa'], [3, 'La serie completa (cont.)'], [4, 'La serie completa (cont.)']]);
    assert.deepEqual(p.datos.tabla.filas_por_diapositiva, [7, 7, 6]);
    assert.equal(p.datos.tabla.ajuste.cabe, true);
    assert.equal(p.datos.tabla.archivo_tabla, 'serie.csv');
    const d = proyecto(dir, 's');
    assert.equal(d.slides.length, 5);
    assert.equal(d.slides[1].notes, 'Comentar solo la tendencia.');
    const partes = [2, 3, 4].map(n => tabla(dir, 's', n).rows);
    partes.forEach(r => assert.deepEqual(r[0], ['Muestra', 'Zn/Al', 'pH'], 'el encabezado se repite'));
    assert.deepEqual(partes.flatMap(r => r.slice(1)).map(r => r[0]), filas.map(f => f.split(';')[0]), 'ninguna fila se pierde ni se repite');
    /* Un solo paso en el historial: deshacer quita las tres. */
    assert.equal((await c.llama('historial_presentacion', {archivo: 's'})).datos.deshacer[0].antes_de, 'tabla_desde_archivo');
    await c.llama('deshacer', {archivo: 's'});
    assert.equal(proyecto(dir, 's').slides.length, 2);

    const q = await c.llama('tabla_desde_archivo', {archivo: 's', archivo_tabla: 'serie.csv', titulo: 'Por partes', partir: true, filas_por_diapositiva: 5, pie_con_fuente: true, caption: 'Serie ilustrativa.'});
    assert.equal(q.error, false, q.texto);
    assert.deepEqual(q.datos.tabla.filas_por_diapositiva, [5, 5, 5, 5]);
    assert.equal(tabla(dir, 's', 6).caption, 'Serie ilustrativa. Datos: serie.csv.');
    const sin = await c.llama('tabla_desde_archivo', {archivo: 's', archivo_tabla: 'serie.csv', filas: [1, 4]});
    assert.equal(sin.error, false, sin.texto);
    assert.equal(sin.datos.tabla.diapositivas, 1);
    assert.ok(!sin.datos.avisos.some(a => /caben unas/.test(a)));
    /* El pie de la fuente cuenta al estimar: con pie caben 8 filas, no 9. */
    const pf = await c.llama('tabla_desde_archivo', {archivo: 's', archivo_tabla: 'serie.csv', partir: true, pie_con_fuente: true});
    assert.deepEqual(pf.datos.tabla.filas_por_diapositiva, [7, 7, 6]);
    assert.equal(pf.datos.tabla.ajuste.filas_max, 8);
    const alto = await c.llama('tabla_desde_archivo', {archivo: 's', archivo_tabla: 'serie.csv', partir: true, filas_por_diapositiva: 15});
    assert.ok(alto.datos.avisos.some(a => /10 filas por diapositiva.*baja «filas_por_diapositiva»/.test(a)), alto.texto);
  });
});

test('MCP tablas: errores que protegen los datos', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    writeFileSync(join(dir, 't.csv'), 'Muestra,d (Å),Error\nA,7.56,0.02\n');
    writeFileSync(join(dir, 'sin.csv'), 'Muestra,d,pH\nA,7.56,8\n');
    writeFileSync(join(dir, 'bin.csv'), Buffer.from([0x4d, 0x00, 0x01, 0x02]));
    await c.llama('crear_presentacion', {archivo: 'x', diapositivas: [{titulo: 'Uno'}]});
    const antes = JSON.stringify(proyecto(dir, 'x'));
    const casos = [
      [{tipo: 'chart', archivo_tabla: 't.csv'}, /solo vale para bloques «table»/],
      [{tipo: 'table', archivo_tabla: 't.csv', rows: [['a']]}, /no los dos/],
      [{tipo: 'table', archivo_tabla: 't.csv', partir: true}, /tabla_desde_archivo con partir/],
      [{tipo: 'table', archivo_tabla: 'no-existe.csv'}, /No existe/],
      [{tipo: 'table', archivo_tabla: '../fuera.csv'}, /fuera de la carpeta de trabajo/],
      [{tipo: 'table', archivo_tabla: 'bin.csv'}, /binario/],
      [{tipo: 'table', archivo_tabla: 't.csv', columnas: [4]}, /no hay columna 4/],
      [{tipo: 'table', archivo_tabla: 't.csv', columnas: ['Tamaño']}, /ninguna columna llamada «Tamaño»/],
      [{tipo: 'table', archivo_tabla: 't.csv', unidades: {2: 'nm'}}, /ya dice su unidad, «Å»/],
      [{tipo: 'table', archivo_tabla: 't.csv', cifras: 3, decimales: 2}, /no las dos/],
      [{tipo: 'table', archivo_tabla: 't.csv', cifras: {2: 3}, decimales: {2: 1}}, /elige una/],
      [{tipo: 'table', archivo_tabla: 't.csv', cifras: 0}, /entre 1 y 15/],
      [{tipo: 'table', archivo_tabla: 't.csv', filas: [3, 4]}, /«filas» debe ser/],
      [{tipo: 'table', archivo_tabla: 'sin.csv', combinar_error: true}, /Ninguna columna mostrada/],
      [{tipo: 'table', archivo_tabla: 't.csv', combinar_error: true, cifras: {2: 2}}, /fija sus decimales/],
      [{tipo: 'table', archivo_tabla: 't.csv', separador_decimal: ';'}, /«\.» o «,»/]
    ];
    for (const [bloque, re] of casos) {
      const r = await c.llama('agregar_bloque', {archivo: 'x', diapositiva: 2, bloque});
      assert.equal(r.error, true, JSON.stringify(bloque));
      assert.match(r.texto, re, JSON.stringify(bloque));
    }
    const t = await c.llama('tabla_desde_archivo', {archivo: 'x', archivo_tabla: 't.csv', filas_por_diapositiva: 5});
    assert.match(t.texto, /solo se usa con partir/);
    assert.equal(JSON.stringify(proyecto(dir, 'x')), antes, 'un error no toca el proyecto');
    /* La convención llega a la guía. */
    assert.match((await c.llama('guia_formato', {})).datos.convenciones.tablas_desde_archivo, /archivo_tabla/);
  });
});
