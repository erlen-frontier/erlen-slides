/* SPDX-License-Identifier: AGPL-3.0-only */
/* Extensión «doe» del MCP: un informe de Erlen DoE (informe-v1), suelto o en
   su copia de intercambio, pasa a presentación con leeInforme e informeADeck.
   Los límites salen de src/contratos/informe-v1-limites.json, nunca escritos
   a mano aquí. Los datos del informe son ilustrativos. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {conServidor, proyecto, bloques} from './_mcp-cliente.mjs';
import {prepareTransfer} from '../web/exchange-v2.mjs';

const L = Object.fromEntries(Object.entries(JSON.parse(readFileSync(new URL('../src/contratos/informe-v1-limites.json', import.meta.url), 'utf8'))).filter(([k]) => !k.startsWith('$')));

/* Un Taguchi L9 ilustrativo: la matriz con su respuesta, los efectos y una
   figura de medias. */
const MATRIZ = [[1, 1, 1, 1, 1, 71.234567], [2, 1, 2, 2, 2, 74.8], [3, 1, 3, 3, 3, 69.5], [4, 2, 1, 2, 3, 80.1], [5, 2, 2, 3, 1, 83.4],
  [6, 2, 3, 1, 2, 78.9], [7, 3, 1, 3, 2, 76.3], [8, 3, 2, 1, 3, 79.05], [9, 3, 3, 2, 1, 81.7]];
function informe({simulado = true, secciones} = {}) {
  return {format: 'erlen-context-copy-v1', kind: 'informe-v1', source: {tool: 'doe', title: 'Síntesis L9 (ilustrativo)', version: '0.3.0'},
    snapshot: {titulo: 'Taguchi L9 de la síntesis', subtitulo: 'Datos ilustrativos', fecha: '2026-09-27',
      secciones: secciones || [
        {titulo: 'Diseño', bloques: [{tipo: 'parrafo', texto: 'Arreglo L9 con cuatro factores a tres niveles; la respuesta es el rendimiento en %.'}]},
        {titulo: 'Matriz y respuesta', bloques: [{tipo: 'tabla', titulo: 'Corridas', columns: ['Corrida', 'T', 'pH', 't', 'Relación', 'Rendimiento (%)'], data: MATRIZ}]},
        {titulo: 'Medias por nivel', bloques: [{tipo: 'figura', titulo: 'Efecto de T', figura: {xLabel: 'Nivel', yLabel: 'S/N (dB)',
          series: [{nombre: 'T', x: [1, 2, 3], y: [37.1, 38.2, 37.9], estilo: 'lineas'}], simulado}}]}],
      procedencia: {app: 'Erlen DoE 0.3.0', proyecto: 'Síntesis L9', simulado}}};
}
const escribeJson = (dir, n, v) => writeFileSync(join(dir, n), JSON.stringify(v));
const celdas = deck => deck.slides.flatMap(sl => bloques(sl).filter(b => b.type === 'table').flatMap(b => b.rows.flat()));

test('MCP doe: un informe suelto pasa a presentación con su procedencia', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    escribeJson(dir, 'informe.json', informe());
    const huella = createHash('sha256').update(readFileSync(join(dir, 'informe.json'))).digest('hex');
    const r = await c.llama('importar_informe_doe', {archivo_informe: 'informe.json', archivo: 'charla', autores: 'A. Autora', subtitulo: 'Reunión de grupo'});
    assert.equal(r.error, false, r.texto);
    const deck = proyecto(dir, 'charla');
    assert.equal(r.datos.diapositivas, deck.slides.length);
    assert.equal(deck.slides[0].layout, 'title');
    assert.deepEqual(deck.slides.slice(1).map(s => s.title), ['Diseño', 'Matriz y respuesta', 'Medias por nivel', 'Procedencia']);
    assert.deepEqual(r.datos.lista.map(d => d.titulo), ['Taguchi L9 de la síntesis', 'Diseño', 'Matriz y respuesta', 'Medias por nivel', 'Procedencia']);
    assert.equal(deck.meta.authors, 'A. Autora');
    assert.equal(deck.meta.subtitle, 'Reunión de grupo · DATOS SIMULADOS', 'un subtítulo propio no borra el aviso de datos simulados');
    /* La matriz no cabe entera en una diapositiva: el recorte lo decide
       informeADeck y se dice, nunca se calla. */
    assert.ok(r.datos.avisos_conversion.some(t => /^Tabla «Corridas»: se muestran \d+ de 9 filas/.test(t)), r.datos.avisos_conversion.join(' | '));
    /* Las cifras llegan como las lee informeADeck (seis cifras significativas); ninguna otra. */
    const cs = celdas(deck);
    for (const v of ['71.2346', '74.8', '83.4']) assert.ok(cs.includes(v), v);
    assert.ok(bloques(deck.slides[3]).some(b => b.type === 'chart' && /37\.1/.test(b.data)));
    /* La procedencia, al final y en meta.origen. */
    const ultima = deck.slides.at(-1);
    assert.ok(bloques(ultima).some(b => b.type === 'code' && b.text.includes(huella)));
    assert.deepEqual({copia: r.datos.procedencia.copia, sha256: r.datos.procedencia.sha256, simulado: r.datos.procedencia.simulado}, {copia: 'informe.json', sha256: huella, simulado: true});
    assert.equal(deck.meta.origen.kind, 'informe-v1');
    assert.equal(r.datos.forma, 'informe suelto');
    assert.match(r.datos.avisos.join(' '), /sin su copia de intercambio/);
    assert.equal((await c.llama('historial_presentacion', {archivo: 'charla'})).datos.deshacer.length, 0);

    const otra = await c.llama('importar_informe_doe', {archivo_informe: 'informe.json', archivo: 'charla'});
    assert.equal(otra.error, true);
    assert.match(otra.texto, /ya existe/);
    assert.equal((await c.llama('importar_informe_doe', {archivo_informe: 'informe.json', archivo: 'charla', sobrescribir: true, tema: 'revista'})).error, false);
    assert.equal(proyecto(dir, 'charla').meta.theme, 'revista');
    assert.equal((await c.llama('historial_presentacion', {archivo: 'charla'})).datos.deshacer[0].antes_de, 'importar_informe_doe');
    const pisa = await c.llama('importar_informe_doe', {archivo_informe: 'informe.json', archivo: 'informe', sobrescribir: true});
    assert.equal(pisa.error, true);
    assert.match(pisa.texto, /se conserva intacto/);
    assert.equal(JSON.parse(readFileSync(join(dir, 'informe.json'), 'utf8')).kind, 'informe-v1');
  });
});

test('MCP doe: la copia de intercambio se verifica antes de abrirla', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    const registro = await prepareTransfer({source: 'doe', target: 'slides', payload: informe({simulado: false})});
    const nombre = 'erlen-copia-slides-' + registro.id.slice(0, 8) + '.json';
    escribeJson(dir, nombre, registro);
    const r = await c.llama('importar_informe_doe', {archivo_informe: nombre, archivo: 'desde-copia'});
    assert.equal(r.error, false, r.texto);
    assert.equal(r.datos.forma, 'copia de intercambio verificada');
    assert.deepEqual([r.datos.procedencia.copia, r.datos.procedencia.sha256, r.datos.simulado], [registro.id, registro.sha256, false]);
    assert.equal(r.datos.procedencia.enviada, new Date(registro.createdAt).toISOString());
    assert.ok(!/SIMULADOS/.test(proyecto(dir, 'desde-copia').meta.subtitle));

    escribeJson(dir, 'tocada.json', {...registro, payloadJSON: registro.payloadJSON.replace('74.8', '99.9')});
    const t = await c.llama('importar_informe_doe', {archivo_informe: 'tocada.json', archivo: 'x'});
    assert.equal(t.error, true);
    assert.match(t.texto, /La copia cambió o está dirigida a otra aplicación/);
    escribeJson(dir, 'otra.json', await prepareTransfer({source: 'doe', target: 'notes', payload: informe()}));
    assert.match((await c.llama('vista_previa_informe', {archivo_informe: 'otra.json'})).texto, /dirigida a otra aplicación/);
    assert.ok(!readdirSync(dir).includes('x.json'), 'nada se crea con una copia rechazada');
  });
});

test('MCP doe: los informes inválidos se rechazan con el motivo de leeInforme', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    const base = informe();
    const casos = [
      [{...base, kind: 'tabla-v1'}, 'Esta copia es de tipo «tabla-v1». Slides abre como presentación los informes de Erlen DoE (informe-v1).'],
      [{...base, snapshot: {...base.snapshot, titulo: ''}}, 'El informe no tiene título.'],
      [{...base, source: {tool: 'ftir'}}, 'Esta copia viene de «ftir». Slides solo abre como presentación los informes de Erlen DoE.'],
      [{...base, snapshot: {...base.snapshot, secciones: [{titulo: 's', bloques: [{tipo: 'imagen'}]}]}}, 'La sección 1, bloque 1 es de tipo «imagen», que el tipo informe-v1 no define.']];
    for (const [i, [p, motivo]] of casos.entries()) {
      escribeJson(dir, 'mal' + i + '.json', p);
      const r = await c.llama('importar_informe_doe', {archivo_informe: 'mal' + i + '.json', archivo: 'p' + i});
      assert.equal(r.error, true);
      assert.equal(r.texto, motivo);
    }
    writeFileSync(join(dir, 'roto.json'), '{no');
    assert.match((await c.llama('vista_previa_informe', {archivo_informe: 'roto.json'})).texto, /no es un JSON válido/);
    assert.match((await c.llama('vista_previa_informe', {archivo_informe: 'no-esta.json'})).texto, /No existe el informe/);
    assert.ok(!readdirSync(dir).some(n => /^p\d\.json$/.test(n)));
  });
});

test('MCP doe: límites de informe-v1 y avisos de recorte, sin escribir en la vista previa', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    const tabla = n => ({tipo: 'tabla', titulo: 'Grande', columns: ['i', 'y'], data: Array.from({length: n}, (_, i) => [i + 1, i / 7])});
    const serie = n => ({tipo: 'figura', titulo: 'Espectro', figura: {xLabel: 'x', yLabel: 'y', series: [{nombre: 's', x: Array.from({length: n}, (_, i) => i), y: Array.from({length: n}, (_, i) => Math.sin(i / 50)), estilo: 'lineas'}]}});

    escribeJson(dir, 'grande.json', informe({secciones: [{titulo: 'Tabla', bloques: [tabla(L.filas)]}, {titulo: 'Figura', bloques: [serie(L.puntos)]}]}));
    const antes = readdirSync(dir).sort();
    const v = await c.llama('vista_previa_informe', {archivo_informe: 'grande.json'});
    assert.equal(v.error, false, v.texto);
    assert.deepEqual(readdirSync(dir).sort(), antes, 'la vista previa no escribe');
    assert.deepEqual(v.datos.limites, L);
    assert.deepEqual(v.datos.contenido.tablas, [{titulo: 'Grande', filas: L.filas, columnas: 2}]);
    assert.equal(v.datos.contenido.figuras[0].puntos, L.puntos);
    assert.equal(v.datos.lista.at(-1).titulo, 'Procedencia');
    const avisos = v.datos.avisos_conversion.join('\n');
    assert.match(avisos, new RegExp('Tabla «Grande»: se muestran \\d+ de ' + L.filas + ' filas'));
    assert.match(avisos, new RegExp('Figura «Espectro»: reducida para la diapositiva a \\d+ de ' + L.puntos + ' puntos'));

    const i = await c.llama('importar_informe_doe', {archivo_informe: 'grande.json', archivo: 'grande-charla'});
    assert.equal(i.error, false, i.texto);
    assert.deepEqual(i.datos.avisos_conversion, v.datos.avisos_conversion);
    assert.ok(/omitid/.test(proyecto(dir, 'grande-charla').slides.map(s => s.notes).join('\n')), 'el recorte también va en las notas');

    const pasa = [
      [[{titulo: 'T', bloques: [tabla(L.filas + 1)]}], (L.filas + 1) + ' filas; el tipo admite ' + L.filas],
      [[{titulo: 'T', bloques: [{tipo: 'tabla', titulo: 't', columns: Array.from({length: L.columnas + 1}, (_, k) => 'c' + k), data: []}]}], (L.columnas + 1) + ' columnas; el tipo admite ' + L.columnas],
      [[{titulo: 'F', bloques: [serie(L.puntos + 1)]}], 'supera ' + L.puntos + ' puntos'],
      [Array.from({length: L.secciones + 1}, () => ({titulo: 's', bloques: []})), (L.secciones + 1) + ' secciones; el tipo admite ' + L.secciones]];
    for (const [k, [secciones, texto]] of pasa.entries()) {
      escribeJson(dir, 'limite' + k + '.json', informe({secciones}));
      const r = await c.llama('vista_previa_informe', {archivo_informe: 'limite' + k + '.json'});
      assert.equal(r.error, true);
      assert.ok(r.texto.includes(texto), r.texto);
    }
  });
});
