/* SPDX-License-Identifier: AGPL-3.0-only */
/* El servidor MCP de punta a punta, como lo usaría un cliente: se arranca por
   stdio, se negocia el protocolo y se construye, revisa, deshace y exporta
   una presentación con las herramientas. Requiere el build
   (public/index.html). La vista previa, el PDF y el PowerPoint necesitan
   Chromium: su prueba se salta si no hay ninguno. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync, mkdirSync, readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createInterface} from 'node:readline';

/* Un PNG de 1×1 con relleno detrás del IEND: los lectores lo ignoran y pesa
   lo bastante para que la respuesta tenga que resumirlo. */
const PNG = Buffer.concat([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'), Buffer.alloc(4096)]);

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
    return {error: !!r.result.isError, texto, datos: r.result.isError ? null : JSON.parse(texto), crudo: r.result};
  };
  const inicia = async (version = '2025-06-18') => {
    const r = await pide('initialize', {protocolVersion: version, capabilities: {}, clientInfo: {name: 'prueba', version: '0'}});
    proc.stdin.write(JSON.stringify({jsonrpc: '2.0', method: 'notifications/initialized'}) + '\n');
    return r;
  };
  return {proc, pide, llama, inicia, ruido, cierra: () => new Promise(ok => { proc.on('exit', ok); proc.stdin.end(); })};
}
async function conServidor(fn, version) {
  const dir = mkdtempSync(join(tmpdir(), 'erlen-mcp-'));
  const c = cliente(dir);
  try { await c.inicia(version); await fn(c, dir); assert.deepEqual(c.ruido, [], 'stdout solo lleva mensajes del protocolo'); }
  finally { await c.cierra(); rmSync(dir, {recursive: true, force: true}); }
}
const proyecto = (dir, n) => JSON.parse(readFileSync(join(dir, n + '.json'), 'utf8'));
const bloques = sl => ['blocks', 'blocks2', 'blocks3', 'blocks4'].flatMap(k => sl[k] || []);

test('MCP: protocolo, catálogo y prompts', {timeout: 120000}, async () => {
  await conServidor(async c => {
    const {result: {tools}} = await c.pide('tools/list');
    const nombres = tools.map(t => t.name);
    for (const t of ['guia_formato', 'crear_presentacion', 'agregar_diapositivas', 'duplicar_diapositiva', 'agregar_bloque', 'editar_bloque', 'deshacer', 'rehacer', 'historial_presentacion', 'revisar_presentacion', 'exportar_presentacion', 'vista_previa'])
      assert.ok(nombres.includes(t), 'falta ' + t);
    /* Un tipo por propiedad: varios clientes rechazan «type» en lista. */
    const recorre = v => { if (Array.isArray(v)) v.forEach(recorre); else if (v && typeof v === 'object') { assert.ok(!Array.isArray(v.type), JSON.stringify(v).slice(0, 80)); Object.values(v).forEach(recorre); } };
    tools.forEach(t => { assert.equal(t.inputSchema.type, 'object'); assert.ok(t.annotations); recorre(t.inputSchema); });

    const {result: {prompts}} = await c.pide('prompts/list');
    assert.ok(prompts.some(p => p.name === 'presentacion_desde_resultados'));
    const p = await c.pide('prompts/get', {name: 'presentacion_desde_resultados', arguments: {tema: 'HDL Zn-Al', minutos: '12'}});
    assert.match(p.result.messages[0].content.text, /HDL Zn-Al[\s\S]*minutos_objetivo=12/);
    assert.equal((await c.pide('prompts/get', {name: 'figura_desde_datos', arguments: {}})).error.code, -32602);

    const guia = await c.llama('guia_formato', {});
    assert.ok(guia.datos.disenos.some(d => d.id === 'twocol' && d.zonas === 2));
    assert.deepEqual(guia.datos.disenos.find(d => d.id === 'dato').encabezados, ['', ''], 'la cifra de muestra no se ofrece como contenido');
    assert.ok(guia.crudo.structuredContent, 'structuredContent en 2025-06-18');

    assert.match((await c.llama('crear_presentacion', {})).texto, /Falta «archivo»/);
    assert.match((await c.llama('herramienta_rara', {})).texto, /Herramienta desconocida/);
    assert.equal((await c.pide('metodo/raro', {})).error.code, -32601);
  });
  await conServidor(async c => {
    assert.equal((await c.llama('listar_ejemplos', {})).crudo.structuredContent, undefined, 'sin structuredContent en versiones anteriores');
  }, '2025-03-26');
});

test('MCP: construir, importar datos, revisar, deshacer y exportar', {timeout: 180000}, async () => {
  await conServidor(async (c, dir) => {
    /* Un difractograma ficticio de prueba: 3000 puntos, coma decimal y un pico. */
    mkdirSync(join(dir, 'datos'));
    const filas = ['2Theta;Intensity'];
    for (let i = 0; i < 3000; i++) { const x = 5 + i * 0.02; filas.push(x.toFixed(2).replace('.', ',') + ';' + (100 + 900 * Math.exp(-((x - 11.7) ** 2) / 0.01)).toFixed(1).replace('.', ',')); }
    writeFileSync(join(dir, 'datos', 'muestra-xrd.csv'), filas.join('\n'));
    writeFileSync(join(dir, 'sem.png'), PNG);

    const creada = await c.llama('crear_presentacion', {archivo: 'hdl', titulo: 'Síntesis de HDL Zn-Al', autores: 'Autora de prueba', tema: 'revista', diapositivas: [
      {diseno: 'twocol', titulo: 'Condiciones de síntesis', notas: 'Explicar el pH.', minutos: 2,
        zonas: [[{tipo: 'bullets', items: ['Coprecipitación a pH constante', 'Relación Zn/Al = 2']}], [{tipo: 'chem', ecuacion: 'Zn^2+ + 2 OH- -> Zn(OH)2 v'}]]},
      {diseno: 'content', titulo: 'La fase es pura', minutos: 2, zonas: [[{tipo: 'chart', archivo_datos: 'datos/muestra-xrd.csv', pie: 'Difractograma de la muestra a pH 10.'}]]},
      {diseno: 'dato', encabezados: ['2:1', 'relación molar Zn/Al'], minutos: 1},
      {diseno: 'content', titulo: 'Morfología', minutos: 1, zonas: [[{tipo: 'image', archivo: 'sem.png', caption: 'SEM.', w: 60}, {tipo: 'text', texto: 'Placas.', tamaño: 'l', algin: 'center'}]]}
    ]});
    assert.equal(creada.error, false, creada.texto);
    assert.equal(creada.datos.diapositivas, 5);
    const imp = creada.datos.datos_importados[0];
    assert.equal(imp.tecnica, 'Difracción de rayos X');
    assert.equal(imp.filas_archivo, 3000);
    assert.ok(imp.filas_guardadas <= 1500 && imp.filas_guardadas >= 700, 'una línea base plana guarda un punto por intervalo: ' + imp.filas_guardadas);
    assert.ok(creada.datos.avisos.some(a => /«algin»[\s\S]*«align»/.test(a)), 'avisa de la errata y sugiere la propiedad: ' + creada.datos.avisos);
    assert.equal(creada.datos.avisos.length, 1, 'los alias no generan avisos: ' + creada.datos.avisos);

    let d = proyecto(dir, 'hdl');
    assert.equal(d.slides[1].blocks2[0].tex, 'Zn^2+ + 2 OH- -> Zn(OH)2 v', 'alias ecuacion → tex');
    const graf = d.slides[2].blocks[0];
    assert.equal(graf.xlabel, '2θ (°)');
    assert.equal(graf.caption, 'Difractograma de la muestra a pH 10.', 'alias pie → caption');
    assert.equal(graf.fuente.nombre, 'muestra-xrd.csv');
    assert.equal(graf.fuente.instrumento, 'Difracción de rayos X');
    assert.equal(graf.fuente.huella, createHash('sha256').update(graf.data).digest('hex').slice(0, 10), 'la huella es la de huellaDe');
    const ys = graf.data.split('\n').slice(1).map(l => +l.split('\t')[1]);
    const xs = graf.data.split('\n').slice(1).map(l => +l.split('\t')[0]);
    assert.equal(Math.max(...ys), 1000, 'el submuestreo conserva la intensidad del pico');
    assert.equal(xs[ys.indexOf(1000)], 11.7, 'y su posición');
    assert.equal(d.slides[4].blocks[0].src.slice(0, 22), 'data:image/png;base64,');
    assert.equal(d.slides[4].blocks[1].text, 'Placas.');
    assert.equal(d.slides[4].blocks[1].size, 'l', 'alias tamaño → size');

    /* Un lote con un error no escribe nada y dice cuál falló. */
    const malo = await c.llama('agregar_diapositivas', {archivo: 'hdl', diapositivas: [{titulo: 'Bien'}, {titulo: 'Mal', diseno: 'inventado'}]});
    assert.match(malo.texto, /Diapositiva 2 del lote \(«Mal»\): Diseño desconocido/);
    assert.equal(proyecto(dir, 'hdl').slides.length, 5);

    assert.equal((await c.llama('agregar_bloque', {archivo: 'hdl', diapositiva: 2, zona: 3, bloque: {tipo: 'text', text: 'x'}})).error, true, 'zona fuera de rango');
    assert.equal((await c.llama('agregar_bloque', {archivo: 'hdl', diapositiva: 1, bloque: {tipo: 'text', text: 'x'}})).error, true, 'la portada no admite bloques');
    assert.match((await c.llama('agregar_bloque', {archivo: 'hdl', diapositiva: 2, bloque: {tipo: 'nube'}})).texto, /Tipo de bloque desconocido/);
    assert.match((await c.llama('agregar_bloque', {archivo: 'hdl', diapositiva: 2, bloque: {tipo: 'text', archivo_datos: 'datos/muestra-xrd.csv'}})).texto, /solo vale para bloques «chart»/);
    assert.match((await c.llama('agregar_bloque', {archivo: 'hdl', diapositiva: 2, bloque: {tipo: 'chart', archivo_datos: 'no-existe.csv'}})).texto, /No existe el archivo de datos/);

    /* Cambiar los datos a mano retira la procedencia. */
    const ed = await c.llama('editar_bloque', {archivo: 'hdl', bloque: graf.id, cambios: {data: [['x', 'y'], [1, 2], [2, 3]]}});
    assert.ok(ed.datos.avisos.some(a => /se quitó la procedencia/.test(a)));
    assert.equal(proyecto(dir, 'hdl').slides[2].blocks[0].fuente, undefined);

    /* Deshacer y rehacer. */
    let h = (await c.llama('historial_presentacion', {archivo: 'hdl'})).datos;
    assert.equal(h.deshacer[0].antes_de, 'editar_bloque');
    const des = await c.llama('deshacer', {archivo: 'hdl'});
    assert.equal(des.error, false, des.texto);
    assert.equal(proyecto(dir, 'hdl').slides[2].blocks[0].fuente.nombre, 'muestra-xrd.csv');
    assert.equal((await c.llama('rehacer', {archivo: 'hdl'})).error, false);
    assert.equal(proyecto(dir, 'hdl').slides[2].blocks[0].fuente, undefined);
    await c.llama('deshacer', {archivo: 'hdl'});
    await c.llama('mover_diapositiva', {archivo: 'hdl', diapositiva: 4, a: 2});
    assert.match((await c.llama('rehacer', {archivo: 'hdl'})).texto, /No hay nada que rehacer/, 'un cambio nuevo vacía rehacer');

    const dup = await c.llama('duplicar_diapositiva', {archivo: 'hdl', diapositiva: 3});
    assert.equal(dup.datos.copia, 4);
    d = proyecto(dir, 'hdl');
    assert.equal(d.slides.length, 6);
    assert.notEqual(bloques(d.slides[2])[0].id, bloques(d.slides[3])[0].id, 'la copia tiene ids nuevos');
    await c.llama('eliminar_diapositiva', {archivo: 'hdl', diapositiva: 4});

    const ref = await c.llama('agregar_referencia', {archivo: 'hdl', autores: 'Autor, A.', titulo: 'Título de prueba', anio: '2020', clave: 'Autor2020', diapositivas: [3]});
    assert.equal(ref.error, false, ref.texto);
    assert.deepEqual(proyecto(dir, 'hdl').slides[2].citas, [ref.datos.id]);

    const vista = (await c.llama('ver_presentacion', {archivo: 'hdl'})).datos;
    assert.equal(vista.diapositivas.length, 5);
    assert.equal(vista.minutos, 6);
    const una = (await c.llama('ver_presentacion', {archivo: 'hdl', diapositiva: 5})).datos;
    assert.match(una.diapositiva.blocks[0].src, /^\[image\/png incrustado, \d+ KB\]$/, 'sin base64 en la respuesta');

    const rev = (await c.llama('revisar_presentacion', {archivo: 'hdl', minutos_objetivo: 15})).datos;
    assert.equal(rev.tiempo.minutos_previstos, 6);
    assert.match(rev.tiempo.valoracion, /Queda corta/);

    const tex = await c.llama('exportar_presentacion', {archivo: 'hdl', formato: 'beamer'});
    assert.equal(tex.error, false, tex.texto);
    assert.equal(tex.datos.carpeta, 'hdl-beamer');
    const fuente = readFileSync(join(dir, 'hdl-beamer', 'hdl.tex'), 'utf8');
    assert.match(fuente, /\\documentclass\[aspectratio=169/);
    assert.match(fuente, /\\ce\{Zn\^2\+ \+ 2 OH- -> Zn\(OH\)2 v\}/);
    const fig = readdirSync(join(dir, 'hdl-beamer')).find(n => n.endsWith('.png'));
    assert.ok(fig && fuente.includes('{' + fig.replace(/\.png$/, '') + '}'), 'la figura se llama como la espera el .tex');
    assert.deepEqual(readFileSync(join(dir, 'hdl-beamer', fig)), PNG);
    assert.equal((await c.llama('exportar_presentacion', {archivo: 'hdl', formato: 'html'})).error, false);
    assert.match(readFileSync(join(dir, 'hdl.html'), 'utf8'), /Síntesis de HDL Zn-Al/);

    assert.match((await c.llama('ver_presentacion', {archivo: '../fuera'})).texto, /fuera de la carpeta de trabajo/);
    writeFileSync(join(dir, 'roto.json'), '{');
    assert.match((await c.llama('ver_presentacion', {archivo: 'roto'})).texto, /no es un JSON válido/);
    const antes = readFileSync(join(dir, 'hdl.json'), 'utf8');
    assert.equal((await c.llama('eliminar_diapositiva', {archivo: 'hdl', diapositiva: 9})).error, true);
    assert.equal(readFileSync(join(dir, 'hdl.json'), 'utf8'), antes, 'un error no toca el archivo');
    assert.match((await c.llama('crear_presentacion', {archivo: 'hdl'})).texto, /ya existe/);

    const ej = await c.llama('crear_presentacion', {archivo: 'curso/cinetica', desde_ejemplo: 'cinetica', autores: 'Yo'});
    assert.equal(ej.error, false, ej.texto);
    const lista = (await c.llama('listar_presentaciones', {})).datos.presentaciones.map(p => p.archivo).sort();
    assert.deepEqual(lista, ['curso/cinetica.json', 'hdl.json'], 'el historial no aparece como presentación');
  });
});

test('MCP: vista previa, PDF y PowerPoint en Chromium', {timeout: 240000}, async t => {
  await conServidor(async (c, dir) => {
    await c.llama('crear_presentacion', {archivo: 'p', titulo: 'Prueba', diapositivas: [
      {titulo: 'Corta', zonas: [[{tipo: 'text', text: 'Hola.'}]]},
      {titulo: 'Larga', zonas: [[{tipo: 'text', text: 'palabra '.repeat(500)}]]}]});
    const v = await c.llama('vista_previa', {archivo: 'p'});
    if (v.error && /No se encontró Chromium/.test(v.texto)) { t.skip('sin Chromium'); return; }
    assert.equal(v.error, false, v.texto);
    assert.equal(v.datos.modo, 'mosaico');
    assert.equal(v.crudo.content.filter(x => x.type === 'image').length, 1);
    const larga = proyecto(dir, 'p').slides[2].blocks[0].id;
    assert.deepEqual(v.datos.desbordes.map(x => x.n), [3], 'solo se desborda la diapositiva larga');
    assert.equal(v.datos.desbordes[0].desbordes[0].bloque, larga);
    const det = await c.llama('vista_previa', {archivo: 'p', diapositiva: [1, 2]});
    assert.equal(det.crudo.content.filter(x => x.type === 'image').length, 2);
    assert.equal((await c.llama('exportar_presentacion', {archivo: 'p', formato: 'pdf'})).error, false);
    assert.equal(readFileSync(join(dir, 'p.pdf')).subarray(0, 5).toString(), '%PDF-');
    assert.equal((await c.llama('exportar_presentacion', {archivo: 'p', formato: 'pptx'})).error, false);
    assert.equal(readFileSync(join(dir, 'p.pptx')).subarray(0, 2).toString(), 'PK');
  });
});

/* Etanol dibujado a mano en V2000, con sus coordenadas: se respetan. */
const ETANOL_MOL = `etanol
  a mano

  3  2  0  0  0  0  0  0  0  0999 V2000
    0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    1.3000    0.7500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    2.6000    0.0000    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0
  2  3  1  0
M  END
$$$$
`;

test('MCP: estructuras químicas desde SMILES y MOL', {timeout: 180000}, async () => {
  await conServidor(async (c, dir) => {
    writeFileSync(join(dir, 'etanol.sdf'), ETANOL_MOL);
    const r = await c.llama('crear_presentacion', {archivo: 'q', titulo: 'Química', diapositivas: [
      {diseno: 'tres', titulo: 'Tres', zonas: [
        [{tipo: 'estruct', smiles: 'CC(=O)Oc1ccccc1C(=O)O', caption: 'Aspirina'}],
        [{tipo: 'estruct', smiles: 'C[C@H](N)C(=O)[O-].[Na+]', caption: 'L-alaninato de sodio'}],
        [{tipo: 'estruct', smiles: '[CH2]C', caption: 'Radical etilo', estilo: 'acs'}]]},
      {titulo: 'Archivo', zonas: [[{tipo: 'estruct', archivo_mol: 'etanol.sdf', caption: 'Etanol'}]]}]});
    assert.equal(r.error, false, r.texto);
    const [asp, ala, etilo, etanol] = r.datos.estructuras;
    assert.equal(asp.formula, 'C₉H₈O₄');
    assert.equal(asp.masa_molar, 180.159);
    assert.equal(ala.formula, 'C₃H₆NNaO₂');
    assert.equal(ala.estereocentros, 1);
    assert.equal(etilo.formula, 'C₂H₅', 'el radical conserva los hidrógenos que dice RDKit');
    assert.equal(etilo.hidrogenos_fijados, 1);
    assert.equal(etanol.formula, 'C₂H₆O');
    assert.equal(etanol.archivo, 'etanol.sdf');
    for (const e of [asp, ala]) assert.ok(e.enlace_px >= 33 && e.enlace_px <= 37, 'mismo tamaño de enlace en todas: ' + e.enlace_px);

    const d = proyecto(dir, 'q');
    const [bAsp, bAla, bEt] = [d.slides[1].blocks[0], d.slides[1].blocks2[0], d.slides[1].blocks3[0]];
    assert.equal(bAsp.smiles, 'CC(=O)Oc1ccccc1C(=O)O');
    assert.equal(bAsp.est.enlaces.filter(x => x.orden === 2).length, 5, 'benceno en Kekulé (3) y dos C=O');
    assert.ok(bAla.est.enlaces.some(x => x.tipo === 'cuna' || x.tipo === 'raya'), 'el estereocentro lleva cuña');
    assert.deepEqual(bAla.est.atomos.filter(a => a.carga).map(a => [a.el, a.carga]).sort(), [['Na', 1], ['O', -1]]);
    assert.equal(bEt.est.estilo, 'acs');
    /* El Na⁺ no puede caer encima de la molécula. */
    const na = bAla.est.atomos.find(a => a.el === 'Na');
    const otros = bAla.est.atomos.filter(a => a !== na);
    assert.ok(Math.min(...otros.map(a => Math.hypot(a.x - na.x, a.y - na.y))) >= 40, 'el contraión queda aparte');
    /* Las coordenadas del archivo se respetan: el etanol sigue siendo un zigzag. */
    const [c1, c2, o] = d.slides[2].blocks[0].est.atomos;
    assert.ok(c2.y < c1.y && c2.y < o.y, 'el C central queda arriba, como en el archivo');

    assert.match((await c.llama('agregar_bloque', {archivo: 'q', diapositiva: 3, bloque: {tipo: 'estruct', smiles: 'C1CC(('}})).texto, /RDKit no reconoce el SMILES/);
    assert.match((await c.llama('agregar_bloque', {archivo: 'q', diapositiva: 3, bloque: {tipo: 'text', smiles: 'CCO'}})).texto, /solo valen para bloques «estruct»/);
    assert.match((await c.llama('editar_bloque', {archivo: 'q', bloque: bEt.id, cambios: {estilo: 'vogue'}})).texto, /Estilo de estructura desconocido/);
    assert.equal((await c.llama('editar_bloque', {archivo: 'q', bloque: bEt.id, cambios: {estilo: 'nature'}})).error, false);
    assert.equal(proyecto(dir, 'q').slides[1].blocks3[0].est.estilo, 'nature');
    const cambio = await c.llama('editar_bloque', {archivo: 'q', bloque: bEt.id, cambios: {smiles: 'c1ccncc1'}});
    assert.equal(cambio.datos.estructuras[0].formula, 'C₅H₅N');

    assert.equal((await c.llama('exportar_presentacion', {archivo: 'q', formato: 'beamer'})).error, false);
    const tex = readFileSync(join(dir, 'q-beamer', 'q.tex'), 'utf8');
    assert.ok((tex.match(/\\begin\{tikzpicture\}/g) || []).length >= 4, 'cada estructura sale como TikZ');
  });
});
