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
