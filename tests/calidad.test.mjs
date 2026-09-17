import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {editor} from '../herramientas/test-browser.mjs';

test('El build incluye el auditor, manifiestos reproducibles y pestañas accesibles', () => {
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.match(html, /function calidadCientifica\(/);
  assert.match(html, /provenance\.json/);
  assert.match(html, /role="tab"/);
  assert.match(html, /aria-selected="true"/);
});

test('La auditoría científica detecta ejes, escala logarítmica y procedencia incompletos', async () => {
  const {dom, run, errors} = await editor();
  try {
    const data = JSON.stringify('x,y\n-1,2\n0,3\n2,4');
    run(`window.__calidadDeck = deckDe({title:'Prueba', authors:'Equipo'}, [slidePlantilla('content','Resultados',[[Object.assign(newBlock('chart'), {data:${data}, xlabel:'', ylabel:'', logX:true})]])])`);
    const fallos = run('calidadCientifica(window.__calidadDeck)');
    assert.ok(fallos.some(x => /eje horizontal/.test(x.qué)));
    assert.ok(fallos.some(x => /eje vertical/.test(x.qué)));
    assert.ok(fallos.some(x => /logarítmica de x/.test(x.qué)));
    assert.ok(fallos.some(x => /procedencia/.test(x.qué)));
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('Una gráfica con contexto mínimo no produce errores científicos', async () => {
  const {dom, run, errors} = await editor();
  try {
    const data = JSON.stringify('x,y\n1,2\n2,3');
    run(`window.__calidadDeck = deckDe({title:'Prueba', authors:'Equipo'}, [slidePlantilla('content','La señal aumenta',[[Object.assign(newBlock('chart'), {data:${data}, xlabel:'Tiempo (s)', ylabel:'Señal (V)', caption:'La señal aumenta con el tiempo', fuente:{nombre:'datos.csv', cuando:'2026-09-17', n:2, huella:'abc123'}})]])])`);
    const fallos = run('calidadCientifica(window.__calidadDeck)');
    assert.equal(fallos.filter(x => x.grado === 'error').length, 0);
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('La plantilla afirmación-evidencia crea una diapositiva editable con procedencia', async () => {
  const {dom, run, errors} = await editor();
  try {
    run('window.__beforeSlides = S.deck.slides.length; nuevaAfirmacionEvidencia()');
    assert.equal(run('S.deck.slides.length'), run('window.__beforeSlides') + 1);
    assert.equal(run('S.deck.slides[S.cur].layout'), 'twocol');
    assert.equal(run('S.deck.slides[S.cur].blocks[0].text'), 'Escribe aquí una afirmación comprobable.');
    assert.equal(run('S.deck.slides[S.cur].blocks2[0].fuente.nombre'), 'ilustrativo');
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('La exportación SVG entrega una figura vectorial autónoma con metadatos', async () => {
  const {dom, run, errors} = await editor();
  try {
    run(`window.__svgDeck = deckDe({title:'Datos de laboratorio', authors:'Equipo'}, [slidePlantilla('content','Resultados',[[Object.assign(newBlock('chart'), {id:'grafica-svg', data:'x,y\\n1,2\\n2,4', xlabel:'Tiempo (s)', ylabel:'Señal (V)', caption:'Señal frente al tiempo', fuente:{nombre:'datos.csv'}})]])]); S.deck=window.__svgDeck; S.cur=0; S.selBlock='grafica-svg';`);
    run(`window.__svgDownload = null; window.downloadFile = (filename, text, mime) => { window.__svgDownload = {filename, text, mime}; }; exportFiguraSVG()`);
    assert.equal(run('window.__svgDownload.mime'), 'image/svg+xml;charset=utf-8');
    assert.match(run('window.__svgDownload.filename'), /datos-de-laboratorio-figura-grafica-/);
    assert.match(run('window.__svgDownload.text'), /^<\?xml/);
    assert.match(run('window.__svgDownload.text'), /<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.equal((run('window.__svgDownload.text').match(/\sxmlns="http:\/\/www\.w3\.org\/2000\/svg"/g) || []).length, 1);
    assert.match(run('window.__svgDownload.text'), /erlen-scientific-figure-v1/);
    assert.doesNotMatch(run('window.__svgDownload.text'), /foreignObject/);
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('El informe de exportación estructura advertencias científicas y por formato', async () => {
  const {dom, run, errors} = await editor();
  try {
    run(`window.__reportDeck = deckDe({title:'Informe'}, [slidePlantilla('content','Resultados',[[Object.assign(newBlock('chart'), {data:'x,y\\n1,2', xlabel:'', ylabel:'', logX:true}), Object.assign(newBlock('video'), {src:'https://example.test/video.mp4'})]])])`);
    const report = run('informeExportacion(window.__reportDeck)');
    assert.equal(report.schema, 'erlen-export-report-v1');
    assert.equal(report.formats.svg.includes('independiente'), true);
    assert.ok(report.warnings.some(x => x.code === 'scientific-audit-aviso'));
    assert.ok(report.warnings.some(x => x.code === 'video-static-export'));
    assert.equal(report.summary.errors, report.warnings.filter(x => x.severity === 'error').length);
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});
