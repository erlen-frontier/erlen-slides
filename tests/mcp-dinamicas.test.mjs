/* SPDX-License-Identifier: AGPL-3.0-only */
/* La extensión «dinamicas» del MCP (mcp/extensiones/dinamicas.*): catálogo de
   modelos, validación con el analizador real, creación desde un modelo,
   ajuste de deslizadores y la regla de revisar_presentacion. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, existsSync} from 'node:fs';
import {join} from 'node:path';
import {conServidor, proyecto, bloques} from './_mcp-cliente.mjs';

const funcs = (dir, n) => proyecto(dir, n).slides.flatMap(bloques).filter(b => b.type === 'func');

test('MCP dinamicas: catálogo de modelos', {timeout: 120000}, async () => {
  await conServidor(async c => {
    const {result: {tools}} = await c.pide('tools/list');
    for (const n of ['listar_modelos_dinamicos', 'validar_grafica_dinamica', 'ajustar_grafica_dinamica']) assert.ok(tools.some(t => t.name === n), n);
    const r = await c.llama('listar_modelos_dinamicos', {});
    assert.equal(r.error, false, r.texto);
    assert.ok(r.datos.modelos.length >= 17);
    const arr = r.datos.modelos.find(m => m.id === 'arrhenius');
    assert.deepEqual(arr.curvas, [{nombre: 'k(T)', expr: 'A*exp(-Ea*1000/(R*x))'}]);
    assert.deepEqual(arr.parametros.find(p => p.nombre === 'Ea'), {nombre: 'Ea', significado: 'Energía de activación', unidad: 'kJ mol⁻¹', valor: 60, min: 10, max: 150, paso: 1});
    assert.equal(arr.parametros.find(p => p.nombre === 'A').log, true);
    assert.equal(arr.x.unidad, 'K');
    assert.ok(r.datos.modelos.every(m => m.nota && m.x.significado && m.y.significado && m.parametros.every(p => p.significado)), 'todo símbolo explicado');
    const ads = await c.llama('listar_modelos_dinamicos', {buscar: 'adsorción'});
    assert.deepEqual(ads.datos.modelos.map(m => m.id).sort(), ['cinetica-adsorcion', 'freundlich', 'langmuir']);
    const xrd = await c.llama('listar_modelos_dinamicos', {buscar: 'XRD'});
    assert.ok(['bragg', 'scherrer', 'pico-gaussiano'].every(id => xrd.datos.modelos.some(m => m.id === id)), xrd.datos.modelos.map(m => m.id).join());
    assert.match((await c.llama('guia_formato', {})).datos.convenciones.func, /listar_modelos_dinamicos/);
  });
});

test('MCP dinamicas: validar sin guardar', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    const v = b => c.llama('validar_grafica_dinamica', {bloque: b});
    const sintaxis = await v({curves: [{expr: 'A*exp(-k*x', name: 'C'}], params: {A: 1, k: 0.2}, xmin: 0, xmax: 10});
    assert.equal(sintaxis.error, false, sintaxis.texto);
    assert.equal(sintaxis.datos.valido, false);
    assert.equal(sintaxis.datos.errores[0].posicion, 10);
    assert.equal(sintaxis.datos.errores[0].marca, 'A*exp(-k*x▸');
    assert.match(sintaxis.datos.resumen[0], /falta «\)».*carácter 11/);

    const sinDefinir = await v({curves: ['A*exp(-k*x)'], params: [{name: 'A', value: 1, min: 0, max: 2}], xmin: 0, xmax: 10});
    assert.match(sinDefinir.datos.errores[0].problema, /sin definir: k/);

    const fuera = await v({modelo: 'arrhenius', params: {Ea: 500}});
    assert.match(fuera.datos.errores[0].problema, /Ea» = 500 queda fuera del deslizador \[10, 150\]/);
    const ancho = await v({modelo: 'arrhenius', params: {Ea: {value: 500, max: 600}}});
    assert.equal(ancho.datos.valido, true, 'con max que lo incluya, vale');
    assert.equal((await v({modelo: 'arrhenius', params: {k: 1}})).datos.errores[0].parametro, 'k', 'parámetro que el modelo no tiene');
    assert.match((await v({modelo: 'nada'})).texto, /Modelo desconocido.*arrhenius/);
    assert.match((await v({curves: ['R*x'], params: {R: 2}, xmin: 0, xmax: 1})).datos.errores[0].problema, /constante de la app/);

    const dominio = await v({curves: ['ln(x)'], xmin: -1, xmax: 1});
    assert.equal(dominio.datos.valido, true);
    assert.ok(dominio.datos.avisos.some(t => /no da valor en el 5\d %/.test(t)), dominio.datos.avisos.join(' | '));
    assert.equal((await v({curves: ['sqrt(-1-x^2)'], xmin: 0, xmax: 1})).datos.errores[0].problema.includes('ningún valor finito'), true);

    const polo = await v({curves: ['1/(x-2)'], xmin: 0, xmax: 5});
    assert.equal(polo.datos.curvas[0].discontinuidades, 1);

    const ok = await v({modelo: 'Michaelis–Menten', params: {Km: 10}});
    assert.equal(ok.datos.valido, true, ok.texto);
    assert.equal(ok.datos.modelo, 'michaelis-menten', 'el modelo también se encuentra por su nombre');
    assert.deepEqual(ok.datos.curvas[0].control[0], {x: 0, y: 0});
    assert.equal(ok.datos.curvas[0].control[4].y, 83.33, 'Vmax·50/(Km+50) con Km = 10');
    assert.equal(ok.datos.bloque.tipo, 'func');
    assert.equal(ok.datos.bloque.params.find(p => p.name === 'Km').unit, 'mmol L$^{-1}$');
    const libre = await v({curves: ['a*x'], params: {a: 3}, xmin: 0, xmax: 1});
    assert.deepEqual(libre.datos.bloque.params[0], {name: 'a', value: 3, min: 0, max: 6, step: 0.05});
    assert.ok(libre.datos.avisos.some(t => /sin min\/max/.test(t)));
    assert.deepEqual(readdirSync(dir).filter(n => n.endsWith('.json')), [], 'validar no escribe nada');
  });
});

test('MCP dinamicas: crear, ajustar, revisar y exportar', {timeout: 180000}, async () => {
  await conServidor(async (c, dir) => {
    const cr = await c.llama('crear_presentacion', {archivo: 'd', titulo: 'Cinética', diapositivas: [
      {titulo: 'Arrhenius', zonas: [[{tipo: 'func', modelo: 'arrhenius', params: {Ea: 75}, caption: 'Valores ilustrativos.'}]]}]});
    assert.equal(cr.error, false, cr.texto);
    let [f] = funcs(dir, 'd');
    assert.equal(f.curves[0].expr, 'A*exp(-Ea*1000/(R*x))');
    assert.equal(f.params.find(p => p.name === 'Ea').value, 75);
    assert.equal(f.params.find(p => p.name === 'A').log, true, 'las unidades y la escala del modelo viajan al bloque');
    assert.equal(f.xlabel, 'Temperatura $T$ (K)');
    assert.equal(f.caption, 'Valores ilustrativos.');
    assert.equal(f.modelo, undefined, 'el bloque guardado es un func v1 normal');

    const mala = await c.llama('agregar_bloque', {archivo: 'd', diapositiva: 2, bloque: {tipo: 'func', curves: [{expr: 'C0*exp(-k*x', name: 'C'}], params: {C0: 1, k: 0.3}, xmin: 0, xmax: 10}});
    assert.equal(mala.error, true);
    assert.match(mala.texto, /no se puede dibujar.*«C»: .*falta «\)».*C0\*exp\(-k\*x▸/);
    assert.equal(funcs(dir, 'd').length, 1, 'una gráfica que no se puede dibujar no se guarda');

    const libre = await c.llama('agregar_bloque', {archivo: 'd', diapositiva: 2, bloque: {tipo: 'func', curvas: [{expr: 'C0/(1+k*C0*x)', name: '[A]'}], parametros: {C0: 1, k: {value: 0.3, min: 0.01, max: 1}}, xmin: 0, xmax: 10}});
    assert.equal(libre.error, false, libre.texto);
    const b2 = funcs(dir, 'd')[1];
    assert.deepEqual(b2.params.map(p => [p.name, p.value, p.min, p.max]), [['C0', 1, 0, 2], ['k', 0.3, 0.01, 1]], 'de objeto a lista, con recorrido');
    assert.equal(b2.curves[0].expr, 'C0/(1+k*C0*x)');

    const aj = await c.llama('ajustar_grafica_dinamica', {archivo: 'd', bloque: f.id, valores: {A: 1e12, Ea: {value: 90}}, xmax: 600});
    assert.equal(aj.error, false, aj.texto);
    assert.equal(aj.datos.cambiado, true);
    [f] = funcs(dir, 'd');
    assert.deepEqual([f.params[0].value, f.params[1].value, f.xmax], [1e12, 90, 600]);
    assert.ok(aj.datos.curvas[0].y_max > 0);
    const antes = readFileSync(join(dir, 'd.json'), 'utf8');
    const fuera = await c.llama('ajustar_grafica_dinamica', {archivo: 'd', bloque: f.id, valores: {Ea: 900}});
    assert.equal(fuera.error, true);
    assert.match(fuera.texto, /No se cambió nada.*fuera del deslizador/);
    assert.equal(readFileSync(join(dir, 'd.json'), 'utf8'), antes);
    assert.match((await c.llama('ajustar_grafica_dinamica', {archivo: 'd', bloque: f.id, valores: {B: 1}})).texto, /no tiene el parámetro «B»/);
    assert.equal((await c.llama('historial_presentacion', {archivo: 'd'})).datos.deshacer[0].antes_de, 'ajustar_grafica_dinamica');

    const parcial = await c.llama('editar_bloque', {archivo: 'd', bloque: f.id, cambios: {params: {Ea: 1}}});
    assert.equal(parcial.error, true);
    assert.match(parcial.texto, /ajustar_grafica_dinamica/);
    /* Una edición a mano que rompe la fórmula pasa (no se sabe el resto del
       bloque), pero revisar_presentacion la señala. */
    assert.equal((await c.llama('editar_bloque', {archivo: 'd', bloque: b2.id, cambios: {curves: [{expr: 'C0/(1+k*C0*x', name: '[A]'}]}})).error, false);
    const rev = (await c.llama('revisar_presentacion', {archivo: 'd'})).datos;
    const h = rev.adicional.filter(x => x.regla === 'grafica-dinamica');
    assert.equal(h.length, 1, JSON.stringify(rev.adicional));
    assert.equal(h[0].bloque, b2.id);
    assert.equal(h[0].diapositiva, 2);
    assert.match(h[0].problema, /falta «\)»/);

    const ex = await c.llama('exportar_presentacion', {archivo: 'd', formato: 'beamer'});
    assert.equal(ex.error, false, ex.texto);
    const carpeta = join(dir, ex.datos.archivo || ex.datos.carpeta || 'd-beamer');
    const tex = existsSync(carpeta) && readdirSync(carpeta).find(n => n.endsWith('.tex'));
    const src = readFileSync(join(carpeta, tex), 'utf8');
    assert.match(src, /con A = 1000000000000 s⁻¹, Ea = 90 kJ mol⁻¹/, 'el PDF usa los valores ajustados');
    assert.match(src, /xmin=280,\s*xmax=600/);
  });
});
