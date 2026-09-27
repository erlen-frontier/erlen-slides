/* SPDX-License-Identifier: AGPL-3.0-only */
/* Extensión «markdown» (mcp/extensiones/markdown.mjs): importar_markdown y el
   formato de exportación «markdown». Cada construcción, la ida y vuelta
   Markdown → proyecto → Markdown → proyecto, y los errores. Los datos de los
   ejemplos son ilustrativos. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync, readFileSync, mkdirSync, existsSync} from 'node:fs';
import {join} from 'node:path';
import {conServidor, proyecto, bloques} from './_mcp-cliente.mjs';

/* PNG de 1×1 px. */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

/* El proyecto sin ids, que cambian en cada importación. */
const sinIds = v => Array.isArray(v) ? v.map(sinIds) : v && typeof v === 'object'
  ? Object.fromEntries(Object.entries(v).filter(([k]) => k !== 'id').map(([k, x]) => [k, sinIds(x)])) : v;

const GUION = `---
titulo: "Síntesis de HDL Zn-Al por coprecipitación"
autores: [A. Pérez]
institucion: Facultad de Química
tema: marino
---
<!-- minutos: 0.5 -->

Notas:
Presentarme y decir que los datos son ilustrativos.

# Antecedentes

## Los HDL intercambian aniones
<!-- minutos: 2 -->
- Láminas tipo brucita con carga positiva
  - Aniones y agua en la intercapa
    - El carbonato es el más retenido
- La relación $M^{2+}/M^{3+}$ fija la densidad de carga

La fórmula general es $[M^{2+}_{1-x}M^{3+}_x(OH)_2]^{x+}$.

$$d_{003} = \\frac{\\lambda}{2\\sin\\theta}$$

\\ce{Zn^2+ + Al^3+ + OH- -> HDL}

> nota: No entrar en detalle de la estructura.

## Condiciones de síntesis
| Muestra | pH | $d_{003}$ (Å) |
|---|---|---|
| ZA-8 | 8 | 7,62 |
| ZA-10 | 10 | 7,55 |

Tabla: Datos ilustrativos, no medidos.

\`\`\`python
d = 1.5406 / (2 * sin(theta))
\`\`\`

\`\`\`chem
Zn(NO3)2 + Al(NO3)3 + NaOH -> Zn-Al-NO3
\`\`\`

# Resultados

## DRX de las muestras
<!-- diseno: twocol -->
::: columnas 40
- Picos basales (003) y (006)
|||
![Difractograma ilustrativo](figs/drx.png "Difractograma de ZA-10"){w=80}
:::

---
<!-- diseno: enunciado -->
### El pH 10 da la fase más ordenada

> La cristalinidad manda.
> — Nota de laboratorio (ilustrativa)
`;

test('MCP markdown: cada construcción del guion', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    mkdirSync(join(dir, 'charla/figs'), {recursive: true});
    writeFileSync(join(dir, 'charla/figs/drx.png'), PNG);
    writeFileSync(join(dir, 'charla/guion.md'), GUION);

    const r = await c.llama('importar_markdown', {archivo_md: 'charla/guion.md', archivo: 'hdl'});
    assert.equal(r.error, false, r.texto);
    const d = proyecto(dir, 'hdl');
    assert.equal(d.meta.title, 'Síntesis de HDL Zn-Al por coprecipitación');
    assert.equal(d.meta.authors, 'A. Pérez');
    assert.equal(d.meta.institute, 'Facultad de Química');
    assert.equal(d.meta.theme, 'marino');
    assert.deepEqual(d.slides.map(s => [s.layout, s.title]), [['title', ''], ['section', 'Antecedentes'], ['content', 'Los HDL intercambian aniones'],
      ['content', 'Condiciones de síntesis'], ['section', 'Resultados'], ['twocol', 'DRX de las muestras'], ['enunciado', '']]);
    assert.equal(d.slides[0].min, 0.5);
    assert.match(d.slides[0].notes, /ilustrativos/);

    const [vin, txt, math, chem] = bloques(d.slides[2]);
    assert.deepEqual(vin.items, [{t: 'Láminas tipo brucita con carga positiva', lvl: 0}, {t: 'Aniones y agua en la intercapa', lvl: 1},
      {t: 'El carbonato es el más retenido', lvl: 2}, {t: 'La relación $M^{2+}/M^{3+}$ fija la densidad de carga', lvl: 0}]);
    assert.equal(txt.type, 'text');
    assert.equal(txt.text, 'La fórmula general es $[M^{2+}_{1-x}M^{3+}_x(OH)_2]^{x+}$.', 'las matemáticas en línea se conservan');
    assert.equal(math.type, 'math'); assert.equal(math.tex, 'd_{003} = \\frac{\\lambda}{2\\sin\\theta}');
    assert.equal(chem.type, 'chem'); assert.equal(chem.tex, 'Zn^2+ + Al^3+ + OH- -> HDL');
    assert.equal(d.slides[2].min, 2);
    assert.equal(d.slides[2].notes, 'No entrar en detalle de la estructura.');

    const [tabla, codigo, chem2] = bloques(d.slides[3]);
    assert.equal(tabla.type, 'table');
    assert.deepEqual(tabla.rows, [['Muestra', 'pH', '$d_{003}$ (Å)'], ['ZA-8', '8', '7,62'], ['ZA-10', '10', '7,55']]);
    assert.equal(tabla.header, true);
    assert.equal(tabla.caption, 'Datos ilustrativos, no medidos.');
    assert.equal(codigo.type, 'code'); assert.equal(codigo.lang, 'python');
    assert.equal(chem2.type, 'chem'); assert.match(chem2.tex, /^Zn\(NO3\)2/);

    const col = d.slides[5];
    assert.equal(col.split, 40);
    assert.equal(col.blocks[0].type, 'bullets');
    assert.equal(col.blocks2[0].type, 'image');
    assert.match(col.blocks2[0].src, /^data:image\/png;base64,/, 'la imagen se incrusta desde la carpeta del .md');
    assert.equal(col.blocks2[0].caption, 'Difractograma ilustrativo');
    assert.equal(col.blocks2[0].alt, 'Difractograma de ZA-10');
    assert.equal(col.blocks2[0].w, 80);

    const [grande, cita] = bloques(d.slides[6]);
    assert.deepEqual([grande.type, grande.size, grande.text], ['text', 'l', 'El pH 10 da la fase más ordenada']);
    assert.deepEqual([cita.type, cita.text, cita.by], ['quote', 'La cristalinidad manda.', 'Nota de laboratorio (ilustrativa)']);

    assert.equal(r.datos.diapositivas, 7);
    assert.equal(r.datos.minutos, 2.5);
    assert.equal((await c.llama('historial_presentacion', {archivo: 'hdl'})).datos.deshacer.length, 0, 'un proyecto nuevo no deja versión previa');
  });
});

test('MCP markdown: ida y vuelta', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    mkdirSync(join(dir, 'figs'), {recursive: true});
    writeFileSync(join(dir, 'figs/drx.png'), PNG);
    /* Un proyecto hecho con las herramientas de siempre, con casos difíciles:
       notas con «#» y «---», texto con saltos de línea y líneas que parecen
       Markdown, barras en celdas, código con ``` dentro y encabezados. */
    const cr = await c.llama('crear_presentacion', {archivo: 'a', titulo: 'Caracterización de HDL', subtitulo: 'Avance mensual', autores: 'A. Pérez', fecha: 'Septiembre', tema: 'metropolis', diapositivas: [
      {diseno: 'section', titulo: 'Métodos', minutos: 0.5},
      {titulo: 'Rutas de síntesis', minutos: 2, notas: 'Primero la coprecipitación.\n# esto no es un título\n---\n\\ce{H2O} al final',
        zonas: [[{tipo: 'text', text: 'Línea uno\n- no es viñeta\n\nTabla: tampoco es pie'}, {tipo: 'bullets', items: [{t: 'A', lvl: 0}, {t: 'B', lvl: 1}]},
          {tipo: 'bullets', items: [{t: 'Otra lista', lvl: 0}]}, {tipo: 'text', text: 'Grande', size: 'l'},
          {tipo: 'math', tex: 'k = A e^{-E_a/RT}'}, {tipo: 'chem', tex: 'CO3^2- + 2 H+ -> CO2 ^ + H2O'}]]},
      {diseno: 'comparacion', titulo: 'Antes y después', encabezados: ['Sin lavar', 'Lavada'], zonas: [[{tipo: 'table', rows: [['a|b', 'c'], ['1', '2']], caption: 'Ilustrativa', align: 'l'}], [{tipo: 'image', archivo: 'figs/drx.png', caption: 'DRX [ilustrativa]', w: 55}]]},
      {diseno: 'twocol', titulo: 'Código', division: 35, zonas: [[{tipo: 'code', text: 'x = """\n```\n"""', lang: 'python'}], [{tipo: 'quote', text: 'Uno\nDos', by: 'Alguien'}]]},
      {diseno: 'enunciado', zonas: [[{tipo: 'text', text: 'Sin título'}]]},
      /* Texto con forma de Markdown que debe volver literal. */
      {titulo: 'Casos *límite* con $x_1$', zonas: [[{tipo: 'text', text: 'usa *args* y [a](b) con \\* y $a*b*c$'}, {tipo: 'text', text: 'a | b\n--- | ---'},
        {tipo: 'quote', text: 'Nota: no es una nota\n— ni un autor', by: ''}, {tipo: 'text', text: '\\ce{H2O} en HDL_Zn_Al'},
        {tipo: 'bullets', items: [{t: '**no** es negrita', lvl: 0}]}, {tipo: 'table', rows: [['`x`', 'y'], ['~~z~~', '1']]}]]},
      {titulo: 'Vacía'}
    ]});
    assert.equal(cr.error, false, cr.texto);
    const e1 = await c.llama('exportar_presentacion', {archivo: 'a', formato: 'markdown'});
    assert.equal(e1.error, false, e1.texto);
    assert.equal(e1.datos.archivo, 'a.md');
    assert.deepEqual(e1.datos.figuras, ['a-figuras/diapositiva-04-1.png']);
    assert.deepEqual(readFileSync(join(dir, 'a-figuras/diapositiva-04-1.png')), PNG);
    const md1 = readFileSync(join(dir, 'a.md'), 'utf8');

    const i2 = await c.llama('importar_markdown', {archivo_md: 'a.md', archivo: 'b'});
    assert.equal(i2.error, false, i2.texto);
    assert.deepEqual(i2.datos.avisos, [], 'lo que exporta se importa sin avisos');
    assert.deepEqual(sinIds(proyecto(dir, 'b')), sinIds(proyecto(dir, 'a')), 'proyecto → Markdown → proyecto da el mismo proyecto');
    await c.llama('exportar_presentacion', {archivo: 'b', formato: 'markdown'});
    assert.equal(readFileSync(join(dir, 'b.md'), 'utf8'), md1.replace(/a-figuras\//g, 'b-figuras/'), 'y el mismo Markdown');

    /* Un título vacío en la cabecera no convierte la primera sección en título. */
    await c.llama('crear_presentacion', {archivo: 'v', titulo: '', diapositivas: [{diseno: 'section', titulo: 'Introducción'}]});
    await c.llama('exportar_presentacion', {archivo: 'v', formato: 'markdown'});
    assert.equal((await c.llama('importar_markdown', {archivo_md: 'v.md', archivo: 'v2'})).error, false);
    assert.deepEqual(sinIds(proyecto(dir, 'v2')), sinIds(proyecto(dir, 'v')));
  });
});

test('MCP markdown: avisos de lo que no tiene equivalente', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    const r = await c.llama('importar_markdown', {archivo: 'x', markdown: '# Charla\n\n## Uno\n1. Primero **importante**\n2. Ver [datos](https://example.org)\n\nTexto con <sup>2</sup> y nota[^1].\n\n#### Detalle\n\n<!-- color: rojo -->\n\n::: aviso\nhola\n:::\n'});
    assert.equal(r.error, false, r.texto);
    const av = r.datos.avisos.join('\n');
    for (const x of ['numeradas', 'negrita', 'enlaces', 'HTML', 'notas al pie', '«####»', 'directiva «color»', '«::: aviso»']) assert.ok(av.includes(x), 'avisa: ' + x + '\n' + av);
    const d = proyecto(dir, 'x');
    assert.deepEqual(bloques(d.slides[1])[0].items.map(i => i.t), ['Primero importante', 'Ver datos (https://example.org)']);

    /* Lo que no cabe en Markdown se dice al exportar y queda como comentario. */
    await c.llama('agregar_bloque', {archivo: 'x', diapositiva: 2, bloque: {tipo: 'chart', caption: 'Curva ilustrativa'}});
    const e = await c.llama('exportar_presentacion', {archivo: 'x', formato: 'markdown', destino: 'salida/x'});
    assert.equal(e.error, false, e.texto);
    assert.equal(e.datos.archivo, 'salida/x.md');
    assert.ok(e.datos.avisos.some(a => /«chart» \(pie: Curva ilustrativa\)/.test(a)), e.texto);
    assert.match(readFileSync(join(dir, 'salida/x.md'), 'utf8'), /<!-- bloque «chart» \(pie: Curva ilustrativa\) sin equivalente/);

    const tras = await c.llama('importar_markdown', {archivo: 'col', markdown: '## C\n::: columnas\n- a\n|||\n- b\n:::\n\nDespués\n'});
    assert.ok(tras.datos.avisos.some(a => /^Línea 8: .*tras el «:::»/.test(a)), tras.texto);
    assert.deepEqual(proyecto(dir, 'col').slides[1].blocks2.map(b => b.type), ['bullets', 'text']);

    /* probar: analiza sin escribir. */
    const p = await c.llama('importar_markdown', {archivo: 'nuevo', markdown: '## Sola', probar: true});
    assert.equal(p.error, false, p.texto);
    assert.equal(p.datos.escrito, false);
    assert.equal(p.datos.diapositivas, 2);
    assert.equal(existsSync(join(dir, 'nuevo.json')), false);
  });
});

test('MCP markdown: errores', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    const falta = await c.llama('importar_markdown', {archivo: 'e', markdown: '# T\n\n## Figura\n\n![DRX](figs/no-existe.png)\n'});
    assert.equal(falta.error, true);
    assert.match(falta.texto, /Línea 5 del Markdown: No existe la imagen «figs\/no-existe.png»/);
    const fuera = await c.llama('importar_markdown', {archivo: 'e', markdown: '## Figura\n![DRX](../../etc/imagen.png)\n'});
    assert.equal(fuera.error, true);
    assert.match(fuera.texto, /Línea 2 del Markdown: .*fuera de la carpeta de trabajo/);
    assert.equal(existsSync(join(dir, 'e.json')), false, 'un error no deja proyecto a medias');

    assert.match((await c.llama('importar_markdown', {archivo: 'e'})).texto, /archivo_md.*markdown/);
    assert.match((await c.llama('importar_markdown', {archivo: 'e', markdown: 'x', archivo_md: 'a.md'})).texto, /uno de los dos/);
    assert.match((await c.llama('importar_markdown', {archivo: 'e', archivo_md: '../fuera.md'})).texto, /fuera de la carpeta de trabajo/);
    writeFileSync(join(dir, 'datos.csv'), 'a,b\n1,2\n');
    assert.match((await c.llama('importar_markdown', {archivo: 'e', archivo_md: 'datos.csv'})).texto, /\.md, \.markdown o \.txt/);
    assert.match((await c.llama('importar_markdown', {archivo: 'e', markdown: '## A\n<!-- diseno: inventado -->\n'})).texto, /Línea 1 del Markdown: .*Diseño desconocido: «inventado»/);
    assert.match((await c.llama('importar_markdown', {archivo: 'e', markdown: '---\ntema: inexistente\n---\n## A'})).texto, /Tema desconocido/);

    assert.equal((await c.llama('importar_markdown', {archivo: 'e', markdown: '# Uno'})).error, false);
    const otra = await c.llama('importar_markdown', {archivo: 'e', markdown: '# Dos'});
    assert.match(otra.texto, /ya existe/);
    assert.equal((await c.llama('importar_markdown', {archivo: 'e', markdown: '# Dos', sobrescribir: true})).error, false);
    assert.equal(proyecto(dir, 'e').meta.title, 'Dos');
    assert.equal((await c.llama('historial_presentacion', {archivo: 'e'})).datos.deshacer[0].antes_de, 'importar_markdown');
  });
});

test('MCP markdown: el ejemplo de la documentación se importa sin avisos', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    mkdirSync(join(dir, 'figs'), {recursive: true});
    writeFileSync(join(dir, 'figs/drx-zn-al.png'), PNG);
    writeFileSync(join(dir, 'ejemplo.md'), readFileSync(new URL('../docs/mcp-extensiones/ejemplo-charla-hdl.md', import.meta.url)));
    const r = await c.llama('importar_markdown', {archivo_md: 'ejemplo.md', archivo: 'ejemplo'});
    assert.equal(r.error, false, r.texto);
    assert.deepEqual(r.datos.avisos, []);
    assert.equal(r.datos.diapositivas, 9);
    assert.equal(r.datos.minutos, 11.5);
    /* El guion escrito a mano no se pisa con la exportación. */
    const pisa = await c.llama('exportar_presentacion', {archivo: 'ejemplo', formato: 'markdown'});
    assert.equal(pisa.error, true);
    assert.match(pisa.texto, /«ejemplo\.md» ya existe y no es una exportación/);
    assert.equal(readFileSync(join(dir, 'ejemplo.md'), 'utf8'), readFileSync(new URL('../docs/mcp-extensiones/ejemplo-charla-hdl.md', import.meta.url), 'utf8'));
    await c.llama('exportar_presentacion', {archivo: 'ejemplo', formato: 'markdown', destino: 'vuelta'});
    assert.equal((await c.llama('exportar_presentacion', {archivo: 'ejemplo', formato: 'markdown', destino: 'vuelta'})).error, false, 'una exportación anterior sí se reemplaza');
    assert.equal((await c.llama('importar_markdown', {archivo_md: 'vuelta.md', archivo: 'vuelta'})).error, false);
    assert.deepEqual(sinIds(proyecto(dir, 'vuelta')), sinIds(proyecto(dir, 'ejemplo')));
  });
});

/* Una «\» al final del último encabezado de zona formaba «\|» con la barra que
   lo cierra y el encabezado volvía como «Después|» (CodeQL lo señaló como escape
   incompleto). Las celdas de tabla, unidas con « | », ya lo aguantaban; el LaTeX
   de una celda sigue como se escribe. */
test('MCP markdown: una barra invertida al final de una celda sobrevive la ida y vuelta', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    const filas = [['Serie\\', 'b'], ['$\\alpha$', 'c\\|d']];
    const cr = await c.llama('crear_presentacion', {archivo: 'k', titulo: 'Barras', diapositivas: [
      {diseno: 'comparacion', titulo: 'Celdas', encabezados: ['Antes\\', 'Después\\'], zonas: [[{tipo: 'table', rows: filas}], [{tipo: 'text', text: 'x'}]]}]});
    assert.equal(cr.error, false, cr.texto);
    assert.equal((await c.llama('exportar_presentacion', {archivo: 'k', formato: 'markdown'})).error, false);
    const i = await c.llama('importar_markdown', {archivo_md: 'k.md', archivo: 'k2'});
    assert.equal(i.error, false, i.texto);
    const sl = proyecto(dir, 'k2').slides[1];
    assert.deepEqual(sl.zt, ['Antes\\', 'Después\\'], 'el último encabezado es el que se fundía con la barra de cierre');
    assert.deepEqual(bloques(sl).find(b => b.type === 'table').rows, filas);
  });
});
