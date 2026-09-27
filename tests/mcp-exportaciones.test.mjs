/* SPDX-License-Identifier: AGPL-3.0-only */
/* La extensión «exportaciones» (mcp/extensiones/exportaciones.*): figuras e
   informe salen de JSDOM y se prueban siempre; png, folleto y paquete
   necesitan Chromium y su prueba se salta si no hay ninguno. Se mira dentro
   de cada archivo, no solo su nombre: la cabecera de los PNG, las páginas del
   PDF, las entradas del ZIP y que los SVG sean XML bien formado. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {inflateRawSync, crc32} from 'node:zlib';
import {readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync} from 'node:fs';
import {join} from 'node:path';
import {JSDOM} from 'jsdom';
import {conServidor, proyecto, bloques} from './_mcp-cliente.mjs';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
/* Un difractograma pequeño con coma decimal y punto y coma, como sale del equipo. */
const XRD = '2theta;Intensidad\n' + Array.from({length: 200}, (_, i) => {
  const x = 5 + i * 0.3;
  return x.toFixed(1).replace('.', ',') + ';' + (80 + 900 * Math.exp(-((x - 11.6) ** 2) / 0.4)).toFixed(1).replace('.', ',');
}).join('\n') + '\n';

/* Ancho y alto de un PNG, leídos de su bloque IHDR. */
function ihdr(buf) {
  assert.equal(buf.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'firma PNG');
  assert.equal(buf.subarray(12, 16).toString(), 'IHDR');
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}
const bienFormado = xml => {
  const doc = new new JSDOM('').window.DOMParser().parseFromString(xml, 'image/svg+xml');
  assert.equal(doc.getElementsByTagName('parsererror').length, 0, 'XML bien formado');
  assert.equal(doc.documentElement.namespaceURI, 'http://www.w3.org/2000/svg');
  return doc;
};
/* Lector mínimo de ZIP (el de tests/exportaciones.test.mjs): recorre el
   directorio central, descomprime y comprueba el CRC de cada entrada. */
function leeZip(bytes) {
  const b = Buffer.from(bytes), u16 = o => b.readUInt16LE(o), u32 = o => b.readUInt32LE(o);
  let fin = b.length - 22;
  while (fin >= 0 && u32(fin) !== 0x06054b50) fin--;
  assert.ok(fin >= 0, 'el archivo no termina en un directorio central de ZIP');
  const salida = new Map();
  for (let i = 0, p = u32(fin + 16); i < u16(fin + 10); i++) {
    assert.equal(u32(p), 0x02014b50, 'entrada ' + i + ' del directorio central');
    const metodo = u16(p + 10), suma = u32(p + 16), comp = u32(p + 20), plano = u32(p + 24), ln = u16(p + 28), desplaza = u32(p + 42);
    const nombre = b.subarray(p + 46, p + 46 + ln).toString('utf8');
    const inicio = desplaza + 30 + u16(desplaza + 26) + u16(desplaza + 28);
    const datos = metodo === 8 ? inflateRawSync(b.subarray(inicio, inicio + comp)) : b.subarray(inicio, inicio + comp);
    assert.equal(datos.length, plano, 'tamaño de ' + nombre);
    assert.equal(crc32(datos) >>> 0, suma, 'CRC de ' + nombre);
    salida.set(nombre, datos);
    p += 46 + ln + u16(p + 30) + u16(p + 32);
  }
  return salida;
}

async function charla(c, dir, extra = []) {
  mkdirSync(join(dir, 'datos'), {recursive: true});
  writeFileSync(join(dir, 'datos', 'hdl.xy'), XRD);
  writeFileSync(join(dir, 'sem.png'), PNG);
  const r = await c.llama('crear_presentacion', {archivo: 'hdl', titulo: 'HDL Zn-Al', diapositivas: [
    {titulo: 'Difractograma', zonas: [[{tipo: 'chart', archivo_datos: 'datos/hdl.xy', caption: 'XRD del HDL.'}]]},
    {diseno: 'twocol', titulo: 'Morfología', zonas: [[{tipo: 'image', archivo: 'sem.png', caption: 'SEM.'}], [{tipo: 'estruct', smiles: 'OC(=O)c1ccccc1', caption: 'Benzoato.'}]]},
    /* Con su fórmula: desde las gráficas dinámicas validadas (#42), un bloque
       func vacío no se guarda. */
    {titulo: 'Modelo', zonas: [[{tipo: 'func', curves: [{expr: 'C0*exp(-k*x)', name: 'C(t)'}],
      params: [{name: 'C0', value: 1, min: 0.1, max: 2, step: 0.1}, {name: 'k', value: 0.3, min: 0.01, max: 1, step: 0.01}],
      xmin: 0, xmax: 10, xlabel: 't (h)', ylabel: 'C (mM)', caption: 'Liberación.'}]]},
    ...extra]});
  assert.equal(r.error, false, r.texto);
  return r;
}

test('MCP exportaciones: figuras e informe, sin Chromium', {timeout: 180000}, async () => {
  await conServidor(async (c, dir) => {
    await charla(c, dir);
    const d = proyecto(dir, 'hdl');
    const [chart, img, est, fn] = [1, 2, 2, 3].map((i, k) => bloques(d.slides[i])[k === 2 ? 1 : 0]);
    const {result: {tools}} = await c.pide('tools/list');
    const props = tools.find(t => t.name === 'exportar_presentacion').inputSchema.properties;
    for (const f of ['png', 'folleto', 'paquete', 'figuras', 'informe']) assert.ok(props.formato.enum.includes(f), f);
    assert.equal(props.escala.maximum, 3, 'las opciones de cada formato llegan al esquema');
    assert.deepEqual(props.por_hoja.enum, [2, 3, 6]);

    const f = await c.llama('exportar_presentacion', {archivo: 'hdl', formato: 'figuras'});
    assert.equal(f.error, false, f.texto);
    assert.equal(f.datos.carpeta, 'hdl-figuras');
    const carpeta = join(dir, 'hdl-figuras');
    const pre = b => 'figura-' + b.id.slice(0, 8);
    assert.deepEqual(readdirSync(carpeta).sort(), [pre(chart) + '.csv', pre(chart) + '.svg', pre(est) + '.svg', pre(fn) + '.svg', pre(img) + '.png'].sort());
    /* La imagen sale con sus bytes originales. */
    assert.deepEqual(readFileSync(join(carpeta, pre(img) + '.png')), PNG);
    /* Cada SVG es un documento autónomo; el de la gráfica lleva sus ejes. */
    const svgs = Object.fromEntries([chart, est, fn].map(b => [b.type, readFileSync(join(carpeta, pre(b) + '.svg'), 'utf8')]));
    Object.values(svgs).forEach(bienFormado);
    const textos = [...bienFormado(svgs.chart).getElementsByTagName('text')].map(t => t.textContent);
    assert.ok(textos.includes(chart.xlabel) && textos.includes(chart.ylabel), 'rótulos de los ejes en el SVG: ' + chart.xlabel);
    assert.match(svgs.chart, /erlen-scientific-figure-v1/);
    assert.doesNotMatch(svgs.estruct, /var\(--|inherit/, 'sin variables de CSS ni letra heredada');
    assert.match(svgs.estruct, /<text[^>]*>O<\/text>/);
    /* El CSV son los datos de la gráfica, con punto decimal. */
    const csv = readFileSync(join(carpeta, pre(chart) + '.csv'), 'utf8').trim().split('\n');
    assert.equal(csv[0], '2theta,Intensidad');
    assert.equal(csv.length, 201);
    assert.deepEqual(csv[1].split(',').map(Number), [5, 80]);

    const i = await c.llama('exportar_presentacion', {archivo: 'hdl', formato: 'informe', destino: 'salidas/informe'});
    assert.equal(i.error, false, i.texto);
    assert.equal(i.datos.archivo, 'salidas/informe.json');
    const inf = JSON.parse(readFileSync(join(dir, 'salidas', 'informe.json'), 'utf8'));
    assert.equal(inf.schema, 'erlen-export-report-v1');
    assert.equal(inf.deck.slides, 4);
    assert.deepEqual(i.datos.resumen, inf.summary);

    for (const formato of ['figuras', 'informe', 'png', 'paquete']) {
      const fuera = await c.llama('exportar_presentacion', {archivo: 'hdl', formato, destino: '../fuera'});
      assert.equal(fuera.error, true, formato);
      assert.match(fuera.texto, /fuera de la carpeta de trabajo/);
    }
    const sin = await c.llama('crear_presentacion', {archivo: 'vacia', titulo: 'Sin figuras'});
    assert.equal(sin.error, false);
    assert.match((await c.llama('exportar_presentacion', {archivo: 'vacia', formato: 'figuras'})).texto, /no tiene gráficas/);
  });
});

test('MCP exportaciones: png, folleto y paquete en Chromium', {timeout: 300000}, async t => {
  await conServidor(async (c, dir) => {
    await charla(c, dir, Array.from({length: 5}, (_, k) => ({titulo: 'Extra ' + (k + 1), zonas: [[{tipo: 'text', text: 'Relleno.'}]]})));
    const total = proyecto(dir, 'hdl').slides.length;
    /* Una exportación anterior más larga: su diapositiva 99 no debe quedar. */
    mkdirSync(join(dir, 'hdl-png'), {recursive: true});
    writeFileSync(join(dir, 'hdl-png', '99.png'), PNG);
    writeFileSync(join(dir, 'hdl-png', 'mia.png'), PNG);
    const p = await c.llama('exportar_presentacion', {archivo: 'hdl', formato: 'png', escala: 1});
    if (p.error && /No se encontró Chromium/.test(p.texto)) { t.skip('sin Chromium'); return; }
    assert.equal(p.error, false, p.texto);
    const pngs = readdirSync(join(dir, 'hdl-png')).filter(n => /^\d+\.png$/.test(n)).sort();
    assert.deepEqual(pngs, Array.from({length: total}, (_, i) => String(i + 1).padStart(2, '0') + '.png'));
    assert.ok(existsSync(join(dir, 'hdl-png', 'mia.png')), 'no se borra lo que no es de la exportación');
    assert.deepEqual(ihdr(readFileSync(join(dir, 'hdl-png', '01.png'))), p.datos.tamano);
    const [W, H] = p.datos.tamano;
    const doble = await c.llama('exportar_presentacion', {archivo: 'hdl', formato: 'png', escala: 2, destino: 'alta.png'});
    assert.equal(doble.error, false, doble.texto);
    assert.equal(doble.datos.carpeta, 'alta');
    assert.deepEqual(ihdr(readFileSync(join(dir, 'alta', '03.png'))), [W * 2, H * 2]);
    assert.match((await c.llama('exportar_presentacion', {archivo: 'hdl', formato: 'png', escala: 4})).texto, /«escala» va de 1 a 3/);

    const f = await c.llama('exportar_presentacion', {archivo: 'hdl', formato: 'folleto', por_hoja: 2});
    assert.equal(f.error, false, f.texto);
    const pdf = readFileSync(join(dir, 'hdl-folleto.pdf'));
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    assert.ok(f.datos.hojas >= 2, 'nueve diapositivas a dos por hoja no caben en una: ' + f.datos.hojas);
    assert.match(pdf.toString('latin1'), /\/MediaBox\s*\[0 0 612 792\]/, 'carta vertical');
    assert.match((await c.llama('exportar_presentacion', {archivo: 'hdl', formato: 'folleto', por_hoja: 4})).texto, /2, 3 o 6/);

    const z = await c.llama('exportar_presentacion', {archivo: 'hdl', formato: 'paquete'});
    assert.equal(z.error, false, z.texto);
    const zip = leeZip(readFileSync(join(dir, 'hdl-paquete.zip')));
    assert.deepEqual([...zip.keys()], z.datos.contenido.map(x => x.nombre), 'la respuesta lista lo que hay dentro');
    for (const n of ['LEEME.txt', 'presentacion.tex', 'presentacion-4-3.tex', 'proyecto.json', 'guion.html', 'provenance.json', 'datos/procedencia.json', 'informe-exportacion.json']) assert.ok(zip.has(n), n);
    const d = proyecto(dir, 'hdl');
    assert.deepEqual(JSON.parse(zip.get('proyecto.json')).slides.map(s => s.id), d.slides.map(s => s.id));
    const chart = bloques(d.slides[1])[0];
    const csv = zip.get('datos/figura-' + chart.id.slice(0, 8) + '.csv').toString();
    assert.equal(csv.split('\n')[0], '2theta,Intensidad');
    const proc = JSON.parse(zip.get('datos/procedencia.json'));
    assert.equal(proc.datos[0].procedencia.nombre, 'hdl.xy');
    assert.equal(proc.datos[0].procedencia.huella, chart.fuente.huella);
    /* La procedencia del kit ahora se escribe (antes fallaba: «figures is not defined»). */
    assert.equal(JSON.parse(zip.get('provenance.json')).figures.find(x => x.id === chart.id).dataSha256, chart.fuente.huella);
    bienFormado(zip.get('figuras/figura-' + chart.id.slice(0, 8) + '.svg').toString());
    assert.ok([...zip.keys()].some(n => /^figuras\/figura-\w+\.png$/.test(n)), 'la imagen original');
    assert.match(zip.get('LEEME.txt').toString(), /datos\/\s+Los datos de cada gráfica/);
    assert.equal(JSON.parse(zip.get('informe-exportacion.json')).schema, 'erlen-export-report-v1');
    assert.match(zip.get('presentacion.tex').toString(), /\\begin\{document\}/);
  });
});
