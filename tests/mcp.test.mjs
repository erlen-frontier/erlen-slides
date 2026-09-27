/* SPDX-License-Identifier: AGPL-3.0-only */
/* El servidor MCP de punta a punta, como lo usaría un cliente: se arranca por
   stdio, se negocia el protocolo y se construye una presentación completa con
   las herramientas. Requiere el build (public/index.html). La vista previa,
   el PDF y el PowerPoint usan Chromium y no se prueban aquí. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createInterface} from 'node:readline';

function cliente(dir) {
  const proc = spawn(process.execPath, [new URL('../mcp/servidor.mjs', import.meta.url).pathname], {env: {...process.env, ERLEN_SLIDES_DIR: dir}, stdio: ['pipe', 'pipe', 'pipe']});
  const pendientes = new Map(), ruido = [];
  let n = 0;
  createInterface({input: proc.stdout}).on('line', l => {
    let m;
    try { m = JSON.parse(l); } catch { ruido.push(l); return; }
    pendientes.get(m.id)?.(m); pendientes.delete(m.id);
  });
  const pide = (method, params) => new Promise(ok => { const id = ++n; pendientes.set(id, ok); proc.stdin.write(JSON.stringify({jsonrpc: '2.0', id, method, params}) + '\n'); });
  const llama = async (name, args) => {
    const r = await pide('tools/call', {name, arguments: args});
    const texto = r.result.content[0].text;
    return {error: !!r.result.isError, texto, datos: r.result.isError ? null : JSON.parse(texto)};
  };
  return {proc, pide, llama, ruido, avisa: m => proc.stdin.write(JSON.stringify({jsonrpc: '2.0', ...m}) + '\n'), cierra: () => new Promise(ok => { proc.on('exit', ok); proc.stdin.end(); })};
}

test('servidor MCP: protocolo y construcción de una presentación', {timeout: 120000}, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'erlen-mcp-'));
  const c = cliente(dir);
  try {
    const ini = await c.pide('initialize', {protocolVersion: '2025-06-18', capabilities: {}, clientInfo: {name: 'prueba', version: '0'}});
    assert.equal(ini.result.protocolVersion, '2025-06-18');
    assert.equal(ini.result.serverInfo.name, 'erlen-slides');
    assert.ok(ini.result.capabilities.tools);
    c.avisa({method: 'notifications/initialized'});

    const {result: {tools}} = await c.pide('tools/list');
    const nombres = tools.map(t => t.name);
    for (const t of ['guia_formato', 'crear_presentacion', 'agregar_diapositiva', 'agregar_bloque', 'editar_bloque', 'revisar_presentacion', 'exportar_presentacion', 'vista_previa'])
      assert.ok(nombres.includes(t), 'falta ' + t);
    tools.forEach(t => assert.equal(t.inputSchema.type, 'object'));

    const guia = (await c.llama('guia_formato', {})).datos;
    assert.ok(guia.disenos.some(d => d.id === 'twocol' && d.zonas === 2));
    assert.ok(guia.temas.some(t => t.id === 'metropolis'));
    assert.deepEqual(guia.disenos.find(d => d.id === 'dato').encabezados, ['', ''], 'la cifra de muestra no se ofrece como contenido');

    const creada = await c.llama('crear_presentacion', {archivo: 'hdl', titulo: 'Síntesis de HDL Zn-Al', autores: 'Autora de prueba', tema: 'revista'});
    assert.equal(creada.error, false, creada.texto);
    assert.equal(creada.datos.archivo, 'hdl.json');
    assert.equal((await c.llama('crear_presentacion', {archivo: 'hdl'})).error, true, 'no sobrescribe sin pedirlo');

    const d2 = await c.llama('agregar_diapositiva', {archivo: 'hdl', diseno: 'twocol', titulo: 'Condiciones de síntesis', notas: 'Explicar el pH.', minutos: 2,
      zonas: [[{tipo: 'bullets', items: ['Coprecipitación a pH constante', 'Relación Zn/Al = 2']}], [{tipo: 'chem', tex: 'Zn^2+ + 2 OH- -> Zn(OH)2 v'}]]});
    assert.equal(d2.error, false, d2.texto);
    assert.equal(d2.datos.diapositiva, 2);

    const graf = await c.llama('agregar_bloque', {archivo: 'hdl', diapositiva: 2, zona: 2, bloque: {tipo: 'chart', kind: 'dispersion', data: [['t', 'Conversión'], [0, 0], [10, 34], [20, 63]], xlabel: 'Tiempo (min)', ylabel: 'Conversión (%)', caption: 'Datos ilustrativos.'}});
    assert.equal(graf.error, false, graf.texto);
    const idGraf = graf.datos.id;

    assert.equal((await c.llama('agregar_bloque', {archivo: 'hdl', diapositiva: 2, zona: 3, bloque: {tipo: 'text', text: 'x'}})).error, true, 'zona fuera de rango');
    assert.equal((await c.llama('agregar_bloque', {archivo: 'hdl', diapositiva: 1, bloque: {tipo: 'text', text: 'x'}})).error, true, 'la portada no admite bloques');
    assert.match((await c.llama('agregar_bloque', {archivo: 'hdl', diapositiva: 2, bloque: {tipo: 'nube'}})).texto, /Tipo de bloque desconocido/);

    assert.equal((await c.llama('editar_bloque', {archivo: 'hdl', bloque: idGraf, cambios: {ylabel: 'Conversión de Zn (%)'}})).error, false);
    assert.equal((await c.llama('agregar_diapositiva', {archivo: 'hdl', diseno: 'dato', encabezados: ['2:1', 'relación molar Zn/Al']})).error, false);
    assert.equal((await c.llama('mover_diapositiva', {archivo: 'hdl', diapositiva: 3, a: 2})).error, false);
    const ref = await c.llama('agregar_referencia', {archivo: 'hdl', autores: 'Autor, A.', titulo: 'Título verificado', anio: '2020', clave: 'Autor2020', diapositivas: [3]});
    assert.equal(ref.error, false, ref.texto);

    const proyecto = JSON.parse(readFileSync(join(dir, 'hdl.json'), 'utf8'));
    assert.equal(proyecto.v, 1);
    assert.equal(proyecto.slides.length, 3);
    assert.equal(proyecto.slides[1].layout, 'dato');
    assert.deepEqual(proyecto.slides[1].zt, ['2:1', 'relación molar Zn/Al']);
    const dos = proyecto.slides[2];
    assert.equal(dos.layout, 'twocol');
    assert.deepEqual(dos.blocks[0].items, [{t: 'Coprecipitación a pH constante', lvl: 0}, {t: 'Relación Zn/Al = 2', lvl: 0}]);
    assert.equal(dos.blocks2[1].data, 't\tConversión\n0\t0\n10\t34\n20\t63');
    assert.equal(dos.blocks2[1].ylabel, 'Conversión de Zn (%)');
    assert.deepEqual(dos.citas, [ref.datos.id]);

    const vista = (await c.llama('ver_presentacion', {archivo: 'hdl'})).datos;
    assert.equal(vista.diapositivas.length, 3);
    assert.equal(vista.diapositivas[2].zonas[1][1].tipo, 'chart');
    assert.equal(vista.minutos, 2);

    const rev = (await c.llama('revisar_presentacion', {archivo: 'hdl'})).datos;
    assert.ok(rev.calidad_cientifica.some(f => f.bloque === idGraf && /procedencia/.test(f.problema)));

    const tex = await c.llama('exportar_presentacion', {archivo: 'hdl', formato: 'beamer'});
    assert.equal(tex.error, false, tex.texto);
    const fuente = readFileSync(join(dir, 'hdl.tex'), 'utf8');
    assert.match(fuente, /\\documentclass\[aspectratio=169/);
    assert.match(fuente, /\\ce\{Zn\^2\+ \+ 2 OH- -> Zn\(OH\)2 v\}/);
    assert.equal((await c.llama('exportar_presentacion', {archivo: 'hdl', formato: 'html'})).error, false);
    assert.match(readFileSync(join(dir, 'hdl.html'), 'utf8'), /Síntesis de HDL Zn-Al/);

    assert.match((await c.llama('ver_presentacion', {archivo: '../fuera'})).texto, /fuera de la carpeta de trabajo/);
    writeFileSync(join(dir, 'roto.json'), '{');
    assert.match((await c.llama('ver_presentacion', {archivo: 'roto'})).texto, /no es un JSON válido/);
    assert.equal((await c.llama('eliminar_diapositiva', {archivo: 'hdl', diapositiva: 9})).error, true);
    assert.equal(JSON.parse(readFileSync(join(dir, 'hdl.json'), 'utf8')).slides.length, 3, 'un error no toca el archivo');

    const ej = await c.llama('crear_presentacion', {archivo: 'curso/cinetica', desde_ejemplo: 'cinetica', autores: 'Yo'});
    assert.equal(ej.error, false, ej.texto);
    assert.ok(existsSync(join(dir, 'curso', 'cinetica.json')));
    const lista = (await c.llama('listar_presentaciones', {})).datos.presentaciones.map(p => p.archivo).sort();
    assert.deepEqual(lista, ['curso/cinetica.json', 'hdl.json']);

    const desconocido = await c.pide('metodo/raro', {});
    assert.equal(desconocido.error.code, -32601);
    assert.deepEqual(c.ruido, [], 'stdout solo lleva mensajes del protocolo');
  } finally {
    await c.cierra();
    rmSync(dir, {recursive: true, force: true});
  }
});
