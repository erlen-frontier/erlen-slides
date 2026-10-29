/* SPDX-License-Identifier: AGPL-3.0-only */
/* Extensión «masiva» del MCP: buscar_reemplazar, estilo_global y
   normalizar_titulos. Lo que importa: la vista previa no escribe, aplicar
   hace exactamente lo previsto y entra en el historial, y nada alcanza los
   datos de una gráfica, las ecuaciones sin pedirlo ni las siglas y fórmulas
   de un título. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {conServidor, proyecto, bloques} from './_mcp-cliente.mjs';
import {normalizaTitulo} from '../mcp/extensiones/masiva.mjs';

const DATOS = '2θ (°)\tDRX\n10\t5\n20\t8\n30\t3';
const MAZO = {archivo: 'm', titulo: 'Avance DRX', diapositivas: [
  {titulo: 'Patrones de DRX', notas: 'Comentar el DRX de la muestra a pH 10.', zonas: [[
    {tipo: 'text', text: 'El DRX confirma la fase; ver $\\mathrm{DRX}$ y [@DRX2020].'},
    {tipo: 'bullets', items: [{t: 'DRX a 25 °C', lvl: 0}, {t: 'Síntesis a 500°C', lvl: 0}]},
    {tipo: 'chart', data: DATOS, caption: 'Patrón de DRX (ilustrativo).'},
    {tipo: 'math', tex: '\\text{DRX}: n\\lambda = 2d\\sin\\theta'}]]},
  {titulo: 'Tabla de DRX', notas: 'Nada de DRX aquí no.', zonas: [[
    {tipo: 'table', rows: [['Muestra', 'DRX'], ['A', 'sí']]},
    {tipo: 'text', text: 'La síntesis de Alúmina con Al, entre 25 °C y 500°C.'}]]}
]};
const crea = async c => { const r = await c.llama('crear_presentacion', MAZO); assert.equal(r.error, false, r.texto); };
const bruto = (dir, n) => readFileSync(join(dir, n + '.json'), 'utf8');

test('MCP masiva: buscar_reemplazar, vista previa y aplicar', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    await crea(c);
    const antes = bruto(dir, 'm');
    const v = await c.llama('buscar_reemplazar', {archivo: 'm', buscar: 'DRX', reemplazar: 'XRD'});
    assert.equal(v.error, false, v.texto);
    assert.equal(v.datos.modo, 'vista previa');
    assert.equal(bruto(dir, 'm'), antes, 'la vista previa no escribe');
    assert.equal((await c.llama('historial_presentacion', {archivo: 'm'})).datos.deshacer.length, 0);
    /* portada (título y título corto), 2 títulos, 2 notas, texto (fuera de
       $…$ y de la cita), viñeta, pie y celda */
    assert.equal(v.datos.total, 10, JSON.stringify(v.datos.cambios));
    assert.match(v.datos.omitidas_en_matematicas, /^1 /);
    assert.match(v.datos.omitidas_en_citas, /^1 /);
    const fila = v.datos.cambios.find(x => x.campo === 'text');
    assert.equal(fila.coincide, 'DRX');
    assert.match(fila.despues, /El XRD confirma/);

    const a = await c.llama('buscar_reemplazar', {archivo: 'm', buscar: 'DRX', reemplazar: 'XRD', aplicar: true});
    assert.equal(a.error, false, a.texto);
    assert.equal(a.datos.modo, 'aplicado');
    assert.equal(a.datos.total, 10);
    const p = proyecto(dir, 'm'), [s1, s2] = [p.slides[1], p.slides[2]];
    assert.equal(p.meta.title, 'Avance XRD');
    assert.equal(s1.title, 'Patrones de XRD');
    const [texto, vinetas, grafica, ecuacion] = bloques(s1);
    assert.equal(texto.text, 'El XRD confirma la fase; ver $\\mathrm{DRX}$ y [@DRX2020].', 'ni matemáticas ni citas');
    assert.equal(vinetas.items[0].t, 'XRD a 25 °C');
    assert.equal(grafica.data, DATOS, 'los datos de la gráfica no se tocan');
    assert.equal(grafica.caption, 'Patrón de XRD (ilustrativo).');
    assert.equal(ecuacion.tex, '\\text{DRX}: n\\lambda = 2d\\sin\\theta', 'las ecuaciones no, sin pedirlo');
    assert.deepEqual(bloques(s2)[0].rows[0], ['Muestra', 'XRD']);
    assert.equal(s2.notes, 'Nada de XRD aquí no.');
    assert.deepEqual(bloques(s1).map(b => b.id), bloques(JSON.parse(antes).slides[1]).map(b => b.id), 'los id siguen');

    const h = (await c.llama('historial_presentacion', {archivo: 'm'})).datos;
    assert.equal(h.deshacer[0].antes_de, 'buscar_reemplazar');
    assert.equal((await c.llama('deshacer', {archivo: 'm'})).error, false);
    assert.equal(proyecto(dir, 'm').slides[1].title, 'Patrones de DRX');

    /* Aplicar sin nada que cambiar no llena el historial. */
    const n = (await c.llama('historial_presentacion', {archivo: 'm'})).datos.deshacer.length;
    const vacio = await c.llama('buscar_reemplazar', {archivo: 'm', buscar: 'inexistente', reemplazar: 'x', aplicar: true});
    assert.equal(vacio.datos.total, 0);
    assert.equal((await c.llama('historial_presentacion', {archivo: 'm'})).datos.deshacer.length, n);
  });
});

test('MCP masiva: los hits reales desplazan y conservan los estilos de texto', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    const texto = '😀 uno cat | cat fin $cat$ [@cat2020]';
    const primero = texto.indexOf('cat'), segundo = texto.indexOf('cat', primero + 3), fin = texto.indexOf('fin');
    const rangos = [{inicio: primero, fin: primero + 3, negrita: false},
      {inicio: segundo, fin: segundo + 3, cursiva: true}, {inicio: fin, fin: fin + 3, negrita: false}];
    const r = await c.llama('crear_presentacion', {archivo: 'rangos', diapositivas: [{zonas: [[
      {tipo: 'text', text: texto, negrita: true, formatoTexto: rangos},
      {tipo: 'text', text: 'cat 500°C [@cat2020]', formatoTexto: [{inicio: 4, fin: 9, cursiva: true}]},
      {tipo: 'chart', data: DATOS, caption: 'cat'}
    ]]}]});
    assert.equal(r.error, false, r.texto);
    const antes = bruto(dir, 'rangos');
    const args = {archivo: 'rangos', buscar: 'cat', reemplazar: 'gato', mayusculas: true};
    let v = await c.llama('buscar_reemplazar', args);
    assert.equal(v.error, false, v.texto);
    assert.equal(bruto(dir, 'rangos'), antes);
    assert.equal(v.datos.total, 4);
    assert.match(v.datos.omitidas_en_matematicas, /^1 /);
    assert.match(v.datos.omitidas_en_citas, /^2 /);
    const a = await c.llama('buscar_reemplazar', {...args, aplicar: true});
    assert.equal(a.error, false, a.texto);
    assert.deepEqual(a.datos.cambios, v.datos.cambios);
    let p = proyecto(dir, 'rangos'), [b, b2, chart] = p.slides[1].blocks;
    assert.equal(b.text, '😀 uno gato | gato fin $cat$ [@cat2020]');
    const p1 = b.text.indexOf('gato'), p2 = b.text.indexOf('gato', p1 + 4), pf = b.text.indexOf('fin');
    assert.deepEqual(b.formatoTexto, [{inicio: p1, fin: p1 + 4, negrita: false},
      {inicio: p2, fin: p2 + 4, cursiva: true}, {inicio: pf, fin: pf + 3, negrita: false}]);
    assert.equal(b2.text, 'gato 500°C [@cat2020]');
    assert.deepEqual(b2.formatoTexto, [{inicio: 5, fin: 10, cursiva: true}]);
    assert.equal(chart.data, DATOS);
    assert.equal(chart.caption, 'gato');
    assert.equal((await c.llama('deshacer', {archivo: 'rangos'})).error, false);
    assert.deepEqual(proyecto(dir, 'rangos').slides[1].blocks[0].formatoTexto, rangos);

    /* Una coincidencia atraviesa dos rangos; al borrar se conservan los
       estilos posteriores, sin buscar una diferencia textual aproximada. */
    v = await c.llama('buscar_reemplazar', {archivo: 'rangos', buscar: 'cat \\| cat', regex: true, reemplazar: '', mayusculas: true, aplicar: true});
    assert.equal(v.error, false, v.texto);
    b = proyecto(dir, 'rangos').slides[1].blocks[0];
    assert.equal(b.text, '😀 uno  fin $cat$ [@cat2020]');
    assert.deepEqual(b.formatoTexto, [{inicio: b.text.indexOf('fin'), fin: b.text.indexOf('fin') + 3, negrita: false}]);
    assert.equal((await c.llama('deshacer', {archivo: 'rangos'})).error, false);

    /* El reemplazo regex expandido también desplaza los rangos posteriores. */
    v = await c.llama('buscar_reemplazar', {archivo: 'rangos', buscar: '(\\d+)°C', regex: true, reemplazar: '$1 °C', aplicar: true});
    assert.equal(v.error, false, v.texto);
    b2 = proyecto(dir, 'rangos').slides[1].blocks[1];
    assert.equal(b2.text, 'cat 500 °C [@cat2020]');
    assert.deepEqual(b2.formatoTexto, [{inicio: 4, fin: 10, cursiva: true}]);
  });
});

test('MCP masiva: no guarda si la inserción crea una pareja sustituta en una frontera de formato', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    const r = await c.llama('crear_presentacion', {archivo: 'utf16', diapositivas: [{titulo: 'x', zonas: [[
      {tipo: 'text', text: 'x\uDC00', formatoTexto: [{inicio: 0, fin: 1, negrita: true}]}
    ]]}]});
    assert.equal(r.error, false, r.texto);
    const antes = bruto(dir, 'utf16'), h = (await c.llama('historial_presentacion', {archivo: 'utf16'})).datos.deshacer.length;
    for (const aplicar of [false, true]) {
      const cambio = await c.llama('buscar_reemplazar', {archivo: 'utf16', buscar: 'x', reemplazar: '\uD83D', aplicar});
      assert.equal(cambio.error, true); assert.match(cambio.texto, /formatoTexto|UTF-16/);
      assert.equal(bruto(dir, 'utf16'), antes);
      assert.equal((await c.llama('historial_presentacion', {archivo: 'utf16'})).datos.deshacer.length, h);
    }
  });
});

test('MCP masiva: conserva overrides explícitos en los tramos intactos aunque coincidan con el bloque', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    const formatoTexto = [{inicio: 0, fin: 3, negrita: true, cursiva: true}];
    const r = await c.llama('crear_presentacion', {archivo: 'override', diapositivas: [{zonas: [[
      {tipo: 'text', text: 'abc xx def', negrita: true, formatoTexto}
    ]]}]});
    assert.equal(r.error, false, r.texto);
    const antes = bruto(dir, 'override'), h = (await c.llama('historial_presentacion', {archivo: 'override'})).datos.deshacer.length;
    const cambio = await c.llama('buscar_reemplazar', {archivo: 'override', buscar: 'xx', reemplazar: 'y', aplicar: true});
    if (cambio.error) {
      assert.equal(bruto(dir, 'override'), antes, 'un fallo no guarda otros cambios');
      assert.equal((await c.llama('historial_presentacion', {archivo: 'override'})).datos.deshacer.length, h);
    }
    assert.equal(cambio.error, false, cambio.texto);
    const b = proyecto(dir, 'override').slides[1].blocks[0];
    assert.equal(b.text, 'abc y def');
    assert.deepEqual(b.formatoTexto, formatoTexto, 'negrita explícita debe seguir sobreescribiendo al bloque si este cambia después');
  });
});

test('MCP masiva: ámbitos, diapositivas, mayúsculas, palabra completa y regex', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    await crea(c);
    const busca = async args => { const r = await c.llama('buscar_reemplazar', {archivo: 'm', ...args}); assert.equal(r.error, false, r.texto); return r.datos; };

    /* Solo notas, y solo la diapositiva 3. */
    let r = await busca({buscar: 'DRX', reemplazar: 'XRD', ambito: ['notas'], diapositivas: [3], aplicar: true});
    assert.equal(r.total, 1);
    let p = proyecto(dir, 'm');
    assert.equal(p.slides[2].notes, 'Nada de XRD aquí no.');
    assert.equal(p.slides[1].notes, 'Comentar el DRX de la muestra a pH 10.');
    assert.equal(p.slides[2].title, 'Tabla de DRX');
    assert.equal((await busca({buscar: 'DRX', ambito: ['tablas']})).total, 1);
    assert.equal((await busca({buscar: 'DRX', diapositivas: ['2-3'], ambito: ['titulos']})).total, 2);

    /* Sin distinguir: ignora mayúsculas y tildes y conserva la mayúscula inicial. */
    r = await busca({buscar: 'sintesis', reemplazar: 'preparación'});
    assert.equal(r.total, 2);
    assert.ok(r.cambios.some(x => x.despues.includes('Preparación a 500°C')), JSON.stringify(r.cambios));
    assert.ok(r.cambios.some(x => x.despues.includes('La preparación de')));
    assert.equal((await busca({buscar: 'sintesis', mayusculas: true})).total, 0);
    assert.equal((await busca({buscar: 'Síntesis', mayusculas: true})).total, 1);

    /* Palabra completa: «Al» no es «Alúmina». */
    assert.equal((await busca({buscar: 'Al', mayusculas: true})).total, 2);
    assert.equal((await busca({buscar: 'Al', mayusculas: true, palabra_completa: true})).total, 1);

    /* Regex con grupos: el espacio entre la cifra y la unidad. */
    r = await busca({buscar: '(\\d+)\\s*°C', regex: true, reemplazar: '$1 °C', aplicar: true});
    assert.equal(r.total, 2, 'las que ya tenían el espacio no cuentan: ' + JSON.stringify(r.cambios));
    p = proyecto(dir, 'm');
    assert.equal(bloques(p.slides[1])[1].items[1].t, 'Síntesis a 500 °C');
    assert.equal(bloques(p.slides[2])[1].text, 'La síntesis de Alúmina con Al, entre 25 °C y 500 °C.');

    /* Con «ecuaciones» sí entra en la TeX y en $…$. */
    r = await busca({buscar: 'DRX', reemplazar: 'XRD', ambito: ['ecuaciones', 'texto'], aplicar: true});
    p = proyecto(dir, 'm');
    assert.equal(bloques(p.slides[1])[3].tex, '\\text{XRD}: n\\lambda = 2d\\sin\\theta');
    assert.equal(bloques(p.slides[1])[0].text, 'El XRD confirma la fase; ver $\\mathrm{XRD}$ y [@DRX2020].', 'la cita sigue protegida');

    /* Errores claros. */
    const mal = async (args, re) => { const x = await c.llama('buscar_reemplazar', {archivo: 'm', ...args}); assert.equal(x.error, true); assert.match(x.texto, re); };
    await mal({buscar: '(', regex: true}, /expresión regular no es válida/);
    await mal({buscar: 'x', ambito: ['graficos']}, /Ámbito desconocido/);
    await mal({buscar: 'x', aplicar: true}, /hace falta «reemplazar»/);
    await mal({buscar: 'x', diapositivas: [9]}, /No hay diapositiva 9/);
    await mal({buscar: 'x'.repeat(400)}, /límite/);
  });
});

test('MCP masiva: una regex catastrófica se corta a tiempo', {timeout: 120000}, async () => {
  await conServidor(async c => {
    await c.llama('crear_presentacion', {archivo: 'r', diapositivas: [{titulo: 'x', notas: 'a'.repeat(40) + 'c'}]});
    const t0 = Date.now();
    const r = await c.llama('buscar_reemplazar', {archivo: 'r', buscar: '(a+)+b', regex: true});
    assert.equal(r.error, true);
    assert.match(r.texto, /tardó más de/);
    assert.ok(Date.now() - t0 < 10000);
    /* El servidor sigue respondiendo. */
    assert.equal((await c.llama('buscar_reemplazar', {archivo: 'r', buscar: 'aaac'})).datos.total, 1);
  });
});

test('MCP masiva: estilo_global', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    await crea(c);
    const antes = bruto(dir, 'm');
    const v = await c.llama('estilo_global', {archivo: 'm', propiedades: {anim: 'up'}});
    assert.equal(v.error, false, v.texto);
    assert.equal(bruto(dir, 'm'), antes, 'la vista previa no escribe');
    assert.equal(v.datos.total, 6, JSON.stringify(v.datos));
    assert.ok(v.datos.cambios.every(x => x.propiedad === 'anim' && x.despues === 'up'));

    let r = await c.llama('estilo_global', {archivo: 'm', tipo_bloque: 'text', propiedades: {size: 'l', alineacion: 'center'}, aplicar: true});
    assert.equal(r.error, false, r.texto);
    assert.equal(r.datos.total, 4);
    let p = proyecto(dir, 'm');
    for (const b of [...bloques(p.slides[1]), ...bloques(p.slides[2])].filter(b => b.type === 'text')) assert.deepEqual([b.size, b.align], ['l', 'center']);
    assert.equal(bloques(p.slides[1])[2].data, DATOS);
    assert.equal((await c.llama('historial_presentacion', {archivo: 'm'})).datos.deshacer[0].antes_de, 'estilo_global');

    /* Tablas: «left» se guarda como «l»; el tamaño «s» no existe en ecuaciones. */
    r = await c.llama('estilo_global', {archivo: 'm', propiedades: {align: 'left', size: 's'}, diapositivas: [2, 3], aplicar: true});
    p = proyecto(dir, 'm');
    assert.equal(bloques(p.slides[2])[0].align, 'l');
    assert.equal(bloques(p.slides[1])[3].size, 'n');
    assert.deepEqual(r.datos.omitidos, [{propiedad: 'size', tipo: 'math', motivo: 'las ecuaciones solo tienen tamaño normal y grande', bloques: 1}]);

    /* «draw» solo en gráficas; la anchura, solo donde la hay. */
    r = await c.llama('estilo_global', {archivo: 'm', propiedades: {anim: 'draw', w: 60}});
    assert.deepEqual(r.datos.cambios.map(x => x.tipo + ':' + x.propiedad).sort(), ['chart:anim', 'chart:w']);
    assert.ok(r.datos.omitidos.some(o => o.tipo === 'text' && o.propiedad === 'anim'));

    const mal = async (args, re) => { const x = await c.llama('estilo_global', {archivo: 'm', ...args}); assert.equal(x.error, true, x.texto); assert.match(x.texto, re); };
    await mal({propiedades: {color: 'red'}}, /no admitida.*Válidas: size/);
    await mal({propiedades: {anim: 'girar'}}, /Animación desconocida/);
    await mal({propiedades: {size: 'xl'}}, /debe ser s, n o l/);
    await mal({propiedades: {w: 300}}, /entre 10 y 100/);
    await mal({propiedades: {step: 'si'}}, /true o false/);
    await mal({tipo_bloque: 'text', propiedades: {w: 50}}, /no se aplica a «text»/);
    await mal({tipo_bloque: 'parrafo', propiedades: {step: true}}, /Tipo de bloque desconocido/);
    await mal({propiedades: {}}, /al menos una/);
  });
});

test('MCP masiva: normalizar_titulos', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    const titulos = ['Síntesis De ZnAl-LDH Por Coprecipitación.', 'Patrones De XRD Y FTIR De Zn(OH)2', 'Ecuación de Scherrer', 'pH óptimo para la síntesis.', 'RESULTADOS GENERALES'];
    await c.llama('crear_presentacion', {archivo: 't', diapositivas: titulos.map(titulo => ({titulo}))});
    const antes = bruto(dir, 't');
    const v = await c.llama('normalizar_titulos', {archivo: 't'});
    assert.equal(v.error, false, v.texto);
    assert.equal(bruto(dir, 't'), antes);
    assert.deepEqual(v.datos.cambios.map(x => x.despues), ['Síntesis de ZnAl-LDH por coprecipitación', 'Patrones de XRD y FTIR de Zn(OH)2', 'pH óptimo para la síntesis']);
    assert.equal(v.datos.omitidas[0].diapositiva, 6);
    assert.ok(v.datos.revisar.some(x => x.diapositiva === 4 && x.mayusculas_respetadas.includes('Scherrer')));

    const a = await c.llama('normalizar_titulos', {archivo: 't', diapositivas: [2], aplicar: true});
    assert.equal(a.datos.total, 1);
    const p = proyecto(dir, 't');
    assert.equal(p.slides[1].title, 'Síntesis de ZnAl-LDH por coprecipitación');
    assert.equal(p.slides[2].title, titulos[1], 'fuera de la selección');
    assert.equal((await c.llama('deshacer', {archivo: 't'})).error, false);
    assert.equal(proyecto(dir, 't').slides[1].title, titulos[0]);

    /* Un texto literal con guion no es una expresión regular inválida. */
    assert.equal((await c.llama('buscar_reemplazar', {archivo: 't', buscar: 'ZnAl-LDH', ambito: ['titulos']})).datos.total, 1);

    const t = await c.llama('normalizar_titulos', {archivo: 't', estilo: 'titulo', quitar_punto_final: false});
    assert.equal(t.datos.cambios.find(x => x.diapositiva === 5).despues, 'pH Óptimo para la Síntesis.');
  });
});

test('masiva: mayúscula de oración con términos de química', () => {
  const o = t => normalizaTitulo(t, {estilo: 'oracion', quitarPunto: true}).titulo;
  const casos = [
    ['Síntesis De HDL ZnAl-LDH Por Coprecipitación.', 'Síntesis de HDL ZnAl-LDH por coprecipitación'],
    ['Efecto Del pH En La Cristalinidad', 'Efecto del pH en la cristalinidad'],
    ['Patrones De XRD Y FTIR De Zn(OH)2', 'Patrones de XRD y FTIR de Zn(OH)2'],
    ['Relación Molar Zn/Al En El HDL', 'Relación molar Zn/Al en el HDL'],
    ['Intercalación De CO3²⁻ Y NO3⁻ En La Lámina', 'Intercalación de CO3²⁻ y NO3⁻ en la lámina'],
    ['Estudio De $\\alpha$-Al$_2$O$_3$ A 500 °C', 'Estudio de $\\alpha$-Al$_2$O$_3$ a 500 °C'],
    ['Análisis Térmico (TGA) Del Material Calcinado', 'Análisis térmico (TGA) del material calcinado'],
    ['¿Por Qué Se Forma La Fase Hidrotalcita?', '¿Por qué se forma la fase hidrotalcita?'],
    ['Dopaje Con Al Y Mg', 'Dopaje con Al y Mg'],
    ['Efecto De La Temperatura De Calcinación', 'Efecto de la temperatura de calcinación'],
    /* Ya en oración: sus mayúsculas interiores pueden ser nombres propios o símbolos. */
    ['Ecuación de Scherrer', 'Ecuación de Scherrer'],
    ['Dopaje con Al y La', 'Dopaje con Al y La'],
    ['resultados de la síntesis', 'Resultados de la síntesis'],
    ['pH óptimo.', 'pH óptimo'],
    ['mRNA y eV en keV', 'mRNA y eV en keV'],
    ['Comparación con Smith et al.', 'Comparación con Smith et al.'],
    ['Conclusiones...', 'Conclusiones...'],
    ['RESULTADOS DE LA SÍNTESIS', 'RESULTADOS DE LA SÍNTESIS'],
    ['$\\Delta H$ de adsorción', '$\\Delta H$ de adsorción'],
    ['1. Síntesis De ZnAl-LDH Por Coprecipitación', '1. Síntesis de ZnAl-LDH por coprecipitación'],
    ['2. resultados', '2. Resultados'],
    ['$\\alpha$-alúmina calcinada', '$\\alpha$-alúmina calcinada']
  ];
  for (const [de, a] of casos) assert.equal(o(de), a, de);
  assert.equal(normalizaTitulo('Método De Rietveld Y Ley De Bragg', {estilo: 'oracion', conservar: ['Rietveld', 'Bragg']}).titulo, 'Método de Rietveld y ley de Bragg');
});
