/* SPDX-License-Identifier: AGPL-3.0-only */
import test from 'node:test';
import assert from 'node:assert/strict';
import {leeQuarto, leeMarkdown, aQuarto, modeloQuarto, aMarkdown} from '../src/markdown-core.mjs';
import {readFileSync, existsSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const QMD_PLAN = `---
title: "Charla"
author: ["Autora A", "Autor B"]
format:
  revealjs:
    theme: simple
    slide-number: true
    incremental: true
---
## Evidencia
- Primera observación
- Segunda observación
::: {.notes}
No compartir esta nota.
:::
## Comparación
:::: {.columns}
::: {.column width="40%"}
Texto izquierdo.
:::
::: {.column width="60%"}
\`\`\`{python}
print("NO DEBE EJECUTARSE")
\`\`\`
:::
::::
`;

const IR_LITERAl = {"titulo":"Charla","subtitulo":"","autor":"Autora A","fecha":"","opciones":{"theme":"simple","transition":"none","slideNumber":true,"incremental":false},"diapositivas":[{"titulo":"Evidencia","seccion":false,"columnas":[{"ancho":100,"bloques":[{"tipo":"texto","text":"Resultado"},{"tipo":"codigo","lang":"python","text":"print(1)","step":true}]}],"notas":""}],"recursos":[]};

test('Quarto: caso 1 del plan (portada, notas, columnas, chunks sin ejecutar)', () => {
  const r = leeQuarto(QMD_PLAN);
  assert.equal(r.meta.titulo, 'Charla');
  assert.equal(r.meta.autores, 'Autora A, Autor B');
  assert.deepEqual(r.quarto, {theme: 'simple', transition: 'none', slideNumber: true, incremental: true});
  assert.equal(r.diapositivas.length, 2);
  const [ev, comp] = r.diapositivas;
  assert.equal(ev.titulo, 'Evidencia');
  assert.deepEqual(ev.zonas[0][0].items.map(x => x.t), ['Primera observación', 'Segunda observación']);
  assert.equal(ev.notas, 'No compartir esta nota.');
  assert.equal(comp.titulo, 'Comparación');
  assert.equal(comp.zonas.length, 2);
  assert.equal(comp.zonas[0][0].text, 'Texto izquierdo.');
  const code = comp.zonas[1][0];
  assert.equal(code.tipo, 'code');
  assert.equal(code.lang, 'python');
  assert.match(code.text, /NO DEBE EJECUTARSE/);
  assert.equal(comp.division, 40);
  assert.deepEqual(comp.anchoColumnasQ, [40, 60]);
  // Nunca se ejecuta: no hay marca de motor; el intermedio solo trae código mostrado.
  assert.equal(r.bloqueante, false);
});

test('Quarto: YAML seguro (duplicadas, mal formado, alias, tags, claves no escalares, merge)', () => {
  const dup = leeQuarto('---\ntitle: x\ntitle: y\n---\n## S\n');
  assert.equal(dup.bloqueante, true);
  assert.match(dup.avisos.join(' '), /Map keys must be unique|duplicad/i);
  const bad = leeQuarto('---\ntitle: [unclosed\n---\n## S\n');
  assert.equal(bad.bloqueante, true);
  assert.match(bad.avisos.join(' '), /line|YAML/);
  const alias = leeQuarto('---\ntitle: &a X\nb: *a\n---\n## S\n');
  assert.equal(alias.bloqueante, true);
  assert.match(alias.avisos.join(' '), /alias/i);
  const tag = leeQuarto('---\ntitle: !custom X\n---\n## S\n');
  assert.equal(tag.bloqueante, true);
  assert.match(tag.avisos.join(' '), /etiqueta|no básica/i);
  const nonscalar = leeQuarto('---\n? [1,2]\n: v\n---\n## S\n');
  assert.equal(nonscalar.bloqueante, true);
  assert.match(nonscalar.avisos.join(' '), /no escalar/i);
  const merge = leeQuarto('---\ntitle: X\n<<: {a: 1}\n---\n## S\n');
  assert.equal(merge.bloqueante, true);
  assert.match(merge.avisos.join(' '), /merge|«<<»/i);
});

test('Quarto: sin title no hay portada vacía; YAML desconocido/filtros/includes quedan en fuente con diagnóstico', () => {
  const noTitle = leeQuarto('---\nformat: revealjs\n---\n## A\nHola\n');
  assert.equal(noTitle.meta.titulo, undefined);
  assert.equal(noTitle.diapositivas.length, 1);
  assert.equal(noTitle.diapositivas[0].titulo, 'A');
  const fil = leeQuarto('---\ntitle: T\nfilters:\n  - foo\nbibliography: refs.bib\n---\n## A\n{{< include file="x" >}}\n');
  assert.equal(fil.meta.titulo, 'T'); // válido no soportado no bloquea
  assert.match(fil.avisos.join(' '), /no se ejecut|no se carga/i);
  assert.match(fil.avisos.join(' '), /bibliograf/i);
  assert.match(fil.avisos.join(' '), /filtros/i);
  // Nunca bloques ficticios: la include no creó diapositiva de texto
  assert.equal(fil.diapositivas.length, 1);
  assert.ok(!JSON.stringify(fil.diapositivas).includes('include'));
});

test('Quarto: IR literal → QMD → intermedio (ida y vuelta sin deck)', () => {
  const {qmd} = aQuarto(IR_LITERAl);
  assert.match(qmd, /title: "Charla"/);
  assert.match(qmd, /theme: simple/);
  assert.match(qmd, /## Evidencia/);
  assert.match(qmd, /Resultado/);
  assert.match(qmd, /```python/);
  assert.match(qmd, /print\(1\)/);
  assert.match(qmd, /embed-resources: true/);
  assert.match(qmd, /html-math-method: mathml/);
  assert.match(qmd, /enabled: false/);
  assert.match(qmd, /eval: false/);
  const back = leeQuarto(qmd);
  assert.equal(back.diapositivas[0].titulo, 'Evidencia');
  const txt = back.diapositivas[0].zonas[0].find(b => b.tipo === 'text');
  assert.equal(txt?.text, 'Resultado');
  const code = back.diapositivas[0].zonas[0].find(b => b.tipo === 'code');
  assert.equal(code?.lang, 'python');
  assert.equal(code?.text, 'print(1)');
  assert.equal(code?.step, true);
  // QMD -> deckCompatible mínimo para modeloQuarto
  // leeQuarto devuelve intermedio {diseno,titulo,zonas:[{tipo,…}]}; el deck real usa {layout,title,blocks:[{type,…}]}
  // (lo que haría operaciones.nueva vía prepararZonas; aquí la conversión es 1:1 para probar el contrato).
  const aDeck = (b) => ({...b, type: b.tipo, tipo: undefined, items: b.items ? b.items.map(it => ({t: it.t, lvl: it.lvl})) : undefined});
  const deck = {meta: {title: back.meta.titulo, quarto: back.quarto}, slides: back.diapositivas.map(d => {
    const sl = {layout: d.diseno === 'section' ? 'section' : 'content', title: d.titulo, notes: d.notas};
    (d.zonas || []).forEach((z, k) => { sl['blocks' + (k ? k + 1 : '')] = z.map(aDeck); });
    return sl;
  })};
  const ir2 = modeloQuarto(deck, {});
  assert.equal(ir2.titulo, 'Charla');
  assert.equal(ir2.diapositivas[0].titulo, 'Evidencia');
  assert.equal(ir2.diapositivas[0].columnas[0].bloques[0].tipo, 'texto');
  assert.equal(ir2.diapositivas[0].columnas[0].bloques[1].tipo, 'codigo');
});

test('Quarto: deckCompatible → IR → QMD (modeloQuarto/aQuarto)', () => {
  const deck = {
    meta: {title: 'Charla', subtitle: 'Sub', authors: 'Autora A', date: '2026-11-11', quarto: {theme: 'simple', transition: 'none', slideNumber: true, incremental: false}},
    slides: [{layout: 'content', title: 'Evidencia', blocks: [{type: 'text', text: 'Resultado'}, {type: 'code', lang: 'python', text: 'print(1)', step: true}]}]
  };
  const ir = modeloQuarto(deck, {});
  assert.equal(ir.titulo, 'Charla');
  assert.equal(ir.autor, 'Autora A');
  assert.deepEqual(ir.opciones, {theme: 'simple', transition: 'none', slideNumber: true, incremental: false});
  assert.equal(ir.diapositivas[0].columnas.length, 1);
  assert.equal(ir.diapositivas[0].columnas[0].ancho, 100);
  const {qmd} = aQuarto(ir);
  assert.match(qmd, /title: "Charla"/);
  assert.match(qmd, /subtitle: "Sub"/);
  assert.match(qmd, /author: "Autora A"/);
  assert.match(qmd, /date: "2026-11-11"/);
  // Sin notas por omisión
  assert.ok(!qmd.includes('::: {.notes}'));
  const back = leeQuarto(qmd);
  assert.equal(back.diapositivas[0].titulo, 'Evidencia');
});

test('Quarto: columnas y pasos (missing title slide not repeated; section)', () => {
  const deck = {
    meta: {title: 'T', quarto: {theme: 'default', transition: 'none', slideNumber: true, incremental: true}},
    slides: [
      {layout: 'title', title: '', blocks: []},
      {layout: 'section', title: 'Parte'},
      {layout: 'content', title: 'Cols', blocks: [{type: 'text', text: 'A'}], blocks2: [{type: 'text', text: 'B'}], split: 40}
    ]
  };
  const ir = modeloQuarto(deck, {});
  assert.equal(ir.diapositivas.length, 2); // title layout no se repite
  assert.equal(ir.diapositivas[0].seccion, true);
  assert.equal(ir.diapositivas[0].titulo, 'Parte');
  assert.equal(ir.diapositivas[1].columnas.length, 2);
  assert.equal(ir.diapositivas[1].columnas[0].ancho, 40);
  assert.equal(ir.diapositivas[1].columnas[1].ancho, 60);
  // Columna de portada única con título (cero diapositivas ok)
  const irPortada = modeloQuarto({meta: {title: 'Solo', quarto: {}}, slides: [{layout: 'title', title: '', blocks: []}]}, {});
  assert.equal(irPortada.diapositivas.length, 0);
  // Totalmente vacío es error
  assert.throws(() => modeloQuarto({meta: {}, slides: []}, {}), /totalmente vacío|sin título/i);
});

test('Quarto: notas solo si incluirNotas (privacidad)', () => {
  const deck = {
    meta: {title: 'T', quarto: {}},
    slides: [{layout: 'content', title: 'S', blocks: [{type: 'text', text: 'Hola'}], notes: 'No compartir esta nota.'}]
  };
  assert.equal(modeloQuarto(deck, {}).diapositivas[0].notas, '');
  assert.equal(modeloQuarto(deck, {incluirNotas: true}).diapositivas[0].notas, 'No compartir esta nota.');
  const sin = aQuarto(modeloQuarto(deck, {})).qmd;
  assert.ok(!sin.includes('No compartir esta nota.'));
  const con = aQuarto(modeloQuarto(deck, {incluirNotas: true})).qmd;
  // El punto se escapa (\.) pero el texto se conserva literal:
  assert.match(con, /No compartir esta nota/);
});

test('Quarto: límites (200 diapositivas, 6 columnas, anchos, recursos)', () => {
  assert.throws(() => {
    aQuarto({titulo: 'T', subtitulo: '', autor: '', fecha: '', opciones: {theme: 'default', transition: 'none', slideNumber: true, incremental: false}, diapositivas: Array.from({length: 201}, () => ({titulo: 'S', seccion: false, columnas: [{ancho: 100, bloques: []}], notas: ''})), recursos: []});
  }, /200/);
  assert.throws(() => {
    aQuarto({titulo: 'T', subtitulo: '', autor: '', fecha: '', opciones: {theme: 'default', transition: 'none', slideNumber: true, incremental: false}, diapositivas: [{titulo: 'S', seccion: false, columnas: Array.from({length: 7}, () => ({ancho: 15, bloques: []})), notas: ''}], recursos: []});
  }, /el máximo es 6/);
  assert.throws(() => {
    aQuarto({titulo: 'T', subtitulo: '', autor: '', fecha: '', opciones: {theme: 'default', transition: 'none', slideNumber: true, incremental: false}, diapositivas: [{titulo: 'S', seccion: false, columnas: [{ancho: 50, bloques: []}, {ancho: 40, bloques: []}], notas: ''}], recursos: []});
  }, /suman 90/);
  assert.throws(() => {
    aQuarto({titulo: 'T', subtitulo: '', autor: '', fecha: '', opciones: {theme: 'default', transition: 'none', slideNumber: true, incremental: false}, diapositivas: [{titulo: 'S', seccion: false, columnas: [{ancho: 100, bloques: [{tipo: 'imagen', recurso: 'assets/../evil.png', alt: ''}]}], notas: ''}], recursos: []});
  }, /no es un recurso permitido/);
  const r = leeQuarto(['---', 'title: T', '---', '## S', ':::: {.columns}', ...Array.from({length: 7}, (_, k) => `::: {.column width="20%"}\nCol ${k}\n:::`), '::::', ''].join('\n'));
  assert.match(r.avisos.join(' '), /más de seis columnas/);
});

test('Quarto: imágenes sin resolver bloquean con línea y recurso', () => {
  const r = leeQuarto('---\ntitle: T\n---\n## S\n![cap](../evil.png)\n![ok](figs/a.png)\n');
  assert.ok(r.recursosSinResolver.length >= 2);
  const lineal = r.recursosSinResolver.map(x => x.linea);
  assert.ok(lineal.includes(5));
  assert.match(r.avisos.join(' '), /no se resuelve|no está incrustada/);
  // Data URI de tipo permitido no bloquea
  const ok = leeQuarto('---\ntitle: T\n---\n## S\n![c](data:image/png;base64,iVBORw0KGgo=)\n');
  assert.equal(ok.recursosSinResolver.length, 0);
  // Remota no se descarga
  const rem = leeQuarto('---\ntitle: T\n---\n## S\n![c](https://example.com/a.png)\n');
  assert.match(rem.avisos.join(' '), /no se descarga/);
  assert.equal(rem.bloqueante, true);
  // Remota también queda sin resolver (no auto-fetch): el adaptador debe bloquear.
  assert.equal(rem.recursosSinResolver.length, 1);
});

test('Quarto: inyección (texto/código/math no abren sintaxis ni shortcodes)', () => {
  const cerrar = aQuarto({titulo: 'T', subtitulo: '', autor: '', fecha: '', opciones: {theme: 'default', transition: 'none', slideNumber: true, incremental: false}, diapositivas: [{titulo: 'S', seccion: false, columnas: [{ancho: 100, bloques: [{tipo: 'texto', text: '<script>alert(1)</script>\n- no lista\n# no título\n$$ no math $$'}]}], notas: ''}], recursos: []}).qmd;
  assert.ok(!cerrar.includes('<script>alert')); // < > convertidos a entidades
  assert.match(cerrar, /&lt;script&gt;/);
  assert.match(cerrar, /\- no lista/); // línea inicial escapada aparece como texto literal
  // Math con $ no escapado se rechaza con índice
  assert.throws(() => aQuarto({titulo: 'T', subtitulo: '', autor: '', fecha: '', opciones: {theme: 'default', transition: 'none', slideNumber: true, incremental: false}, diapositivas: [{titulo: 'S', seccion: false, columnas: [{ancho: 100, bloques: [{tipo: 'math', tex: 'x^2 $ y'}]}], notas: ''}], recursos: []}), /no escapado.*diapositiva\/bloque/);
  assert.throws(() => aQuarto({titulo: 'T', subtitulo: '', autor: '', fecha: '', opciones: {theme: 'default', transition: 'none', slideNumber: true, incremental: false}, diapositivas: [{titulo: 'S', seccion: false, columnas: [{ancho: 100, bloques: [{tipo: 'math', tex: 'x {{< include >}}'}]}], notas: ''}], recursos: []}), /shortcode/);
  // Código con backticks usa valla más larga
  const conValla = aQuarto({titulo: 'T', subtitulo: '', autor: '', fecha: '', opciones: {theme: 'default', transition: 'none', slideNumber: true, incremental: false}, diapositivas: [{titulo: 'S', seccion: false, columnas: [{ancho: 100, bloques: [{tipo: 'codigo', lang: 'python', text: 'x = ```y```'}]}], notas: ''}], recursos: []}).qmd;
  assert.match(conValla, /````python/);
  // Bloque no portable no se inventa como comentario vacío
  assert.throws(() => modeloQuarto({meta: {title: 'T'}, slides: [{layout: 'content', title: 'S', blocks: [{type: 'chart', data: 'a'}]}]}, {}), /chart.*no se/i);
  assert.throws(() => aQuarto({titulo: 'T', subtitulo: '', autor: '', fecha: '', opciones: {theme: 'default', transition: 'none', slideNumber: true, incremental: false}, diapositivas: [{titulo: 'S', seccion: false, columnas: [{ancho: 100, bloques: [{tipo: 'chart'}]}], notas: ''}], recursos: []}), /deny_unknown_fields/);
});

test('Quarto: recursos incrustados y externos (figuras)', () => {
  const b64 = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).toString('base64');
  const ir = {titulo: 'T', subtitulo: '', autor: '', fecha: '', opciones: {theme: 'default', transition: 'none', slideNumber: true, incremental: false}, diapositivas: [{titulo: 'S', seccion: false, columnas: [{ancho: 100, bloques: [{tipo: 'imagen', recurso: 'assets/figura-1.png', alt: 'fig'}]}], notas: ''}], recursos: [{nombre: 'assets/figura-1.png', base64: b64}]};
  const externo = aQuarto(ir);
  assert.match(externo.qmd, /assets\/figura-1\.png/);
  assert.equal(externo.figuras.length, 1);
  assert.equal(externo.figuras[0].nombre, 'assets/figura-1.png');
  const embebido = aQuarto(ir, {incrustarFiguras: true});
  assert.match(embebido.qmd, /data:image\/png;base64,/);
  assert.equal(embebido.figuras.length, 0);
});

test('Quarto: APIs Markdown separadas (no alias) — leeMarkdown no entiende divs Quarto', () => {
  const md = leeMarkdown('---\ntitle: T\n---\n## S\n::: {.columns}\nHola\n:::\n');
  assert.ok(Array.isArray(md.diapositivas));
  assert.match(md.avisos.join(' '), /no existe/i);
  assert.notEqual(leeMarkdown, leeQuarto);
  assert.notEqual(aMarkdown, aQuarto);
});


test('Quarto: fixtures compartidas JS/Rust — IR literal → QMD idéntico', () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const ir = JSON.parse(readFileSync(join(dir, 'fixtures/quarto-ir-literal.json'), 'utf8'));
  const esperado = readFileSync(join(dir, 'fixtures/quarto-ir-literal.qmd'), 'utf8');
  const {qmd} = aQuarto(ir);
  assert.equal(qmd, esperado, 'El QMD debe ser byte-idéntico para JS y Rust');
});

test('Quarto: inyección literal se verifica como texto seguro (data fidelity, no regex de fuente)', () => {
  const mal = {titulo:'T',subtitulo:'',autor:'',fecha:'',opciones:{theme:'default',transition:'none',slideNumber:true,incremental:false},diapositivas:[{titulo:'S',seccion:false,columnas:[{ancho:100,bloques:[{tipo:'texto',text:'::: {.notes}\nNo es nota\n<script>alert(1)</script>'}]}],notas:''}],recursos:[]};
  const {qmd} = aQuarto(mal);
  const back = leeQuarto(qmd);
  // Al releer, debe seguir siendo texto en la diapositiva, no notas ni bloques nuevos
  assert.equal(back.diapositivas.length, 1);
  assert.equal(back.diapositivas[0].notas || '', '');
  const texts = back.diapositivas[0].zonas.flat().filter(b => b.tipo === 'text').map(b => b.text).join('\n');
  assert.match(texts, /No es nota/);
  assert.ok(!texts.includes('<script>alert')); // < > escapados a entidades en el QMD
  assert.match(qmd, /&lt;script&gt;/);
});

test('Quarto: bytes de código con líneas en blanco se preservan', () => {
  const ir = {titulo:'T',subtitulo:'',autor:'',fecha:'',opciones:{theme:'default',transition:'none',slideNumber:true,incremental:false},diapositivas:[{titulo:'S',seccion:false,columnas:[{ancho:100,bloques:[{tipo:'codigo',lang:'python',text:'a=1\n\n\nb=2'}]}],notas:''}],recursos:[]};
  const back = leeQuarto(aQuarto(ir).qmd);
  assert.equal(back.diapositivas[0].zonas[0][0].text, 'a=1\n\n\nb=2');
});

test('Quarto boundary: etiquetas en colecciones (map/seq) con offset real, antes de toJS', () => {
  const r = leeQuarto('---\ntitle: "T"\na: !custom {x: 1}\nb: !custom [1,2]\n---\n## S\nHola\n');
  assert.equal(r.bloqueante, true);
  // Offset real, no genérico línea 1
  assert.ok(r.errores.some(e => e.linea === 3 && e.columna >= 10), 'debe traer línea/columna del tag en mapa, no genérico: ' + JSON.stringify(r.errores));
  assert.match(r.avisos.join(' '), /!custom.*YAML 1\.2/i);
  // Aunque el doc sería toJS-able, AST bloqueante impide publicar meta (no se ha ejecutado toJS como éxito)
  assert.equal(Object.keys(r.meta).length, 0);
});

test('Quarto boundary: título literal con include malicioso no incluye en Quarto real', () => {
  const ir = {titulo:'T {{< include file="secret.txt" >}}',subtitulo:'',autor:'',fecha:'',opciones:{theme:'default',transition:'none',slideNumber:true,incremental:false},diapositivas:[{titulo:'S',seccion:false,columnas:[{ancho:100,bloques:[{tipo:'texto',text:'Hola'}]}],notas:''}],recursos:[]};
  const {qmd} = aQuarto(ir);
  // El shortcode debe salir escapado ({} y <>), no como include ejecutable
  assert.ok(!qmd.includes('{{< include'));
  assert.match(qmd, /\\{/);
  assert.ok(!qmd.includes('{{<'));
  // El `{{` de la salida está escapado como `\{\{`
  assert.match(qmd, /\\\{\\\{/);
  const back = leeQuarto(qmd);
  assert.match(back.meta.titulo, /include|secret/);
});

test('Quarto boundary: tabla header=false no promueve row0 a header', () => {
  const ir = {titulo:'T',subtitulo:'',autor:'',fecha:'',opciones:{theme:'default',transition:'none',slideNumber:true,incremental:false},diapositivas:[{titulo:'S',seccion:false,columnas:[{ancho:100,bloques:[{tipo:'tabla',rows:[['a','b'],['1','2']],header:false}]}],notas:''}],recursos:[]};
  const {qmd} = aQuarto(ir);
  // Header sintético vacío presente
  assert.match(qmd, /\|\s+\|\s+\|/);
  const back = leeQuarto(qmd);
  const rows = back.diapositivas[0].zonas[0][0].rows;
  // rows debe contener TODAS las filas originales tras el header vacío
  assert.deepEqual(rows, [['',''],['a','b'],['1','2']]);
});

test('Quarto boundary: claves estrictas por discriminante + ítems de lista', () => {
  assert.throws(() => aQuarto({titulo:'T',subtitulo:'',autor:'',fecha:'',opciones:{theme:'default',transition:'none',slideNumber:true,incremental:false},diapositivas:[{titulo:'S',seccion:false,columnas:[{ancho:100,bloques:[{tipo:'texto',text:'x',lang:'python'}]}],notas:''}],recursos:[]}), /deny_unknown_fields/);
  assert.throws(() => aQuarto({titulo:'T',subtitulo:'',autor:'',fecha:'',opciones:{theme:'default',transition:'none',slideNumber:true,incremental:false},diapositivas:[{titulo:'S',seccion:false,columnas:[{ancho:100,bloques:[{tipo:'lista',items:[{text:'a',nivel:0,extra:1}],incremental:false}]}],notas:''}],recursos:[]}), /ítem de lista.*deny_unknown_fields/);
});

test('Quarto boundary: firmas completas (PNG 8B, JPEG SOI+marker, WEBP RIFF+WEBP) y figuras únicas', () => {
  const png8 = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]).toString('base64');
  const jpeg = Buffer.from([0xff,0xd8,0xff,0xe0,0,0,0,0,0,0]).toString('base64');
  const webpBad = Buffer.from([0x52,0x49,0x46,0x46,0,0,0,0,0x00,0x00,0x00,0x00]).toString('base64');
  const base = (b64, ext='png') => ({titulo:'T',subtitulo:'',autor:'',fecha:'',opciones:{theme:'default',transition:'none',slideNumber:true,incremental:false},diapositivas:[{titulo:'S',seccion:false,columnas:[{ancho:100,bloques:[{tipo:'imagen',recurso:'assets/figura-1.'+ext,alt:'x'}]}],notas:''}],recursos:[{nombre:'assets/figura-1.'+ext,base64:b64}]});
  assert.throws(() => aQuarto(base(webpBad, 'webp')), /firma binaria/);
  assert.doesNotThrow(() => aQuarto(base(jpeg, 'jpg')));
  assert.doesNotThrow(() => aQuarto(base(png8)));
  // Mismo recurso reutilizado no duplica figuras
  const ir = {titulo:'T',subtitulo:'',autor:'',fecha:'',opciones:{theme:'default',transition:'none',slideNumber:true,incremental:false},diapositivas:[
    {titulo:'A',seccion:false,columnas:[{ancho:100,bloques:[{tipo:'imagen',recurso:'assets/figura-1.png',alt:'a'}]}],notas:''},
    {titulo:'B',seccion:false,columnas:[{ancho:100,bloques:[{tipo:'imagen',recurso:'assets/figura-1.png',alt:'b'}]}],notas:''}
  ],recursos:[{nombre:'assets/figura-1.png',base64:png8}]};
  assert.equal(aQuarto(ir).figuras.length, 1);
});
