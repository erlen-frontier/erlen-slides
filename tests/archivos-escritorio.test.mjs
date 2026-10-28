import test from 'node:test';
import assert from 'node:assert/strict';
import {editor} from '../herramientas/test-browser.mjs';
import {readFileSync} from 'node:fs';

async function setup(t, invoke) {
  const app = await editor();
  t.after(() => app.dom.window.close());
  app.dom.window.__TAURI__ = {core: {invoke}};
  app.dom.window.confirm = () => true;
  app.run("window.__notices=[]; toast=(...args)=>window.__notices.push(args); loadDeck(blankDeck(),null); saveInd.now();");
  return app;
}

test('a selected JSON opens as the current desktop file and can be saved in place', async t => {
  const calls = [];
  let original;
  const app = await setup(t, async (cmd, args) => {
    calls.push([cmd, args]);
    if (cmd === 'abrir_archivo_proyecto') return {id: 31, nombre: 'charla.json', contenido: original};
    if (cmd === 'guardar_archivo_proyecto') return null;
    throw new Error('Unexpected command: ' + cmd);
  });
  original = app.run("(()=>{const d=blankDeck();d.meta.title='Desde disco';d.future={fuente:'original'};return JSON.stringify(d)})()");
  await app.run('abrirProyectoEscritorio()');
  assert.equal(app.run('S.deck.meta.title'), 'Desde disco');
  assert.equal(app.run('S.deck.future.fuente'), 'original');
  assert.equal(app.run('archivoEscritorioPendiente()'), false);
  app.run("S.deck.meta.title='Editada';saveInd.now();");
  assert.equal(app.run('archivoEscritorioPendiente()'), true);
  await app.run('guardarProyectoEscritorio(false)');
  const saved = calls.find(([cmd]) => cmd === 'guardar_archivo_proyecto');
  assert.equal(saved[1].id, 31);
  assert.equal(JSON.parse(saved[1].contenido).meta.title, 'Editada');
  assert.equal(app.run('archivoEscritorioPendiente()'), false);
});

test('cancelled and invalid opens leave the current document and file binding intact', async t => {
  let reply = null;
  const app = await setup(t, async cmd => cmd === 'abrir_archivo_proyecto' ? reply : null);
  await app.run('abrirProyectoEscritorio()');
  const before = app.run('JSON.stringify(S.deck)');
  reply = {id: 10, nombre: 'invalid.json', contenido: '{broken'};
  await app.run('abrirProyectoEscritorio()');
  assert.equal(app.run('JSON.stringify(S.deck)'), before);
  assert.equal(app.run('archivoEscritorioActual'), null);
  assert.match(app.dom.window.__notices.at(-1)[0], /no se pudo abrir|no es.*json/i);
});

test('save as retains edits made while the dialog is open as pending', async t => {
  let resolveSave;
  const app = await setup(t, cmd => {
    if (cmd === 'guardar_archivo_proyecto_como') return new Promise(resolve => {resolveSave = resolve;});
    return Promise.resolve(null);
  });
  app.run("S.deck.meta.title='Antes';");
  const operation = app.run('guardarProyectoEscritorio(true)');
  app.run("S.deck.meta.title='Después';");
  resolveSave({id: 44, nombre: 'charla.json'});
  await operation;
  assert.equal(app.run('archivoEscritorioPendiente()'), true);
  assert.match(app.dom.window.__notices.at(-1)[0], /cambios posteriores/i);
});

test('failed save keeps the document dirty and reports the conflict', async t => {
  const app = await setup(t, async cmd => {
    if (cmd === 'guardar_archivo_proyecto_como') return {id: 7, nombre: 'charla.json'};
    if (cmd === 'guardar_archivo_proyecto') throw new Error('El archivo cambió fuera de Tabula');
    return null;
  });
  await app.run('guardarProyectoEscritorio(true)');
  app.run("S.deck.meta.title='Cambio';");
  await app.run('guardarProyectoEscritorio(false)');
  assert.equal(app.run('archivoEscritorioPendiente()'), true);
  assert.match(app.dom.window.__notices.at(-1)[0], /no se pudo guardar/i);
});

test('declining a switch or close leaves an edited document intact', async t => {
  const app = await setup(t, async cmd => cmd === 'guardar_archivo_proyecto_como' ? {id: 7, nombre: 'charla.json'} : null);
  await app.run('guardarProyectoEscritorio(true)');
  app.run("S.deck.meta.title='Cambios pendientes';");
  app.dom.window.confirm = () => false;
  assert.equal(app.run('loadDeck(blankDeck(),null)'), false);
  assert.equal(app.run('S.deck.meta.title'), 'Cambios pendientes');
  assert.equal(app.run('confirmaSalidaArchivo()'), false);
});

test('a delayed open cannot replace changes made while its picker was open', async t => {
  let finish;
  let project;
  const app = await setup(t, cmd => {
    if (cmd === 'abrir_archivo_proyecto') return new Promise(resolve => {finish = resolve;});
    return Promise.resolve(null);
  });
  project = app.run("JSON.stringify(blankDeck())");
  const opening = app.run('abrirProyectoEscritorio()');
  app.run("S.deck.meta.title='Escritura durante el diálogo';");
  finish({id: 55, nombre: 'otro.json', contenido: project});
  await opening;
  assert.equal(app.run('S.deck.meta.title'), 'Escritura durante el diálogo');
  assert.equal(app.run('archivoEscritorioActual'), null);
  assert.match(app.dom.window.__notices.at(-1)[0], /cambi[oó]/i);
});

test('desktop exposes open, save and save-as while the web keeps its existing library action', async t => {
  const app = await setup(t, async () => null);
  const labels = app.run('elementosArchivo().map(x=>x.etiqueta).filter(Boolean)');
  assert.ok(labels.some(s => /Abrir proyecto/.test(s)));
  assert.ok(labels.some(s => s === 'Guardar'));
  assert.ok(labels.some(s => /Guardar como/.test(s)));
  delete app.dom.window.__TAURI__;
  const browserLabels = app.run('elementosArchivo().map(x=>x.etiqueta).filter(Boolean)');
  assert.ok(browserLabels.some(s => /Guardar como/.test(s)));
});

test('a local-storage failure remains visible when file status is refreshed', async t => {
  const app = await setup(t, async () => null);
  app.run('actualizaEstadoArchivoEscritorio(false); actualizaEstadoArchivoEscritorio();');
  assert.match(app.dom.window.document.querySelector('#saveInd').textContent, /Error de guardado local/);
});

test('the close listener prevents closing when the user keeps editing', async t => {
  const app = await setup(t, async cmd => cmd === 'guardar_archivo_proyecto_como' ? {id: 7, nombre: 'charla.json'} : null);
  let listener;
  app.dom.window.__TAURI__.window = {getCurrentWindow: () => ({onCloseRequested: async fn => {listener=fn;}})};
  app.run('instalaCierreNativo()');
  await app.run('guardarProyectoEscritorio(true)');
  app.run("S.deck.meta.title='Pendiente';");
  app.dom.window.confirm = () => false;
  let prevented = false;
  listener({preventDefault: () => {prevented = true;}});
  assert.equal(prevented, true);
  assert.equal(app.run('S.deck.meta.title'), 'Pendiente');
});

test('save as finishes without binding a different presentation opened during its dialog', async t => {
  let finish;
  const released = [];
  const app = await setup(t, (cmd, args) => {
    if (cmd === 'guardar_archivo_proyecto_como') return new Promise(resolve => {finish=resolve;});
    if (cmd === 'cerrar_archivo_proyecto') released.push(args.id);
    return Promise.resolve(null);
  });
  app.run("S.deck.meta.title='Primera';");
  const saving = app.run('guardarProyectoEscritorio(true)');
  app.run("loadDeck(blankDeck(),null);S.deck.meta.title='Segunda';");
  finish({id: 90, nombre: 'primera.json'});
  await saving;
  assert.equal(app.run('S.deck.meta.title'), 'Segunda');
  assert.equal(app.run('archivoEscritorioActual'), null);
  assert.deepEqual(released, [90]);
});

test('an import adjustment that drops unknown source data requires a new save destination', async t => {
  const calls = [];
  let original;
  const app = await setup(t, async (cmd, args) => {
    calls.push([cmd, args]);
    if (cmd === 'abrir_archivo_proyecto') return {id: 12, nombre: 'original.json', contenido: original};
    if (cmd === 'guardar_archivo_proyecto_como') return null;
    if (cmd === 'cerrar_archivo_proyecto') return null;
    throw new Error('Unexpected write to original: ' + cmd);
  });
  original = app.run("(()=>{const d=blankDeck();d.meta.refs=[{id:'r1',autores:'Autora',titulo:'Referencia',datoFuturo:'conservar'}];return JSON.stringify(d)})()");
  await app.run('abrirProyectoEscritorio()');
  assert.equal(app.run('archivoEscritorioPendiente()'), true);
  await app.run('guardarProyectoEscritorio(false)');
  assert.ok(calls.some(([cmd]) => cmd === 'guardar_archivo_proyecto_como'));
  assert.ok(!calls.some(([cmd]) => cmd === 'guardar_archivo_proyecto'));
});

test('opening the bundled derivation preserves the explanations in its equation steps', async t => {
  let source;
  const app = await setup(t, async cmd => {
    if (cmd === 'abrir_archivo_proyecto') return {id: 22, nombre: 'derivacion.json', contenido: source};
    return null;
  });
  source = readFileSync(new URL('../examples/derivacion/proyecto.json', import.meta.url), 'utf8');
  const notes = JSON.parse(source).slides[3].blocks[0].pasos.map(step => step.nota);
  await app.run('abrirProyectoEscritorio()');
  assert.deepEqual(Array.from(app.run('S.deck.slides[3].blocks[0].pasos.map(p=>p.nota)')), notes);
});

test('a recovered untitled document with only a subtitle is pending and kept before switching', async t => {
  const app = await setup(t, async () => null);
  app.run("S.deck.meta.subtitle='Hallazgos de una investigación';S.undo=[];");
  assert.equal(app.run('archivoEscritorioPendiente()'), true);
  app.dom.window.confirm = () => false;
  assert.equal(app.run('loadDeck(blankDeck(),null)'), false);
  assert.equal(app.run('S.deck.meta.subtitle'), 'Hallazgos de una investigación');
  app.dom.window.confirm = () => true;
  assert.equal(app.run('loadDeck(blankDeck(),null)'), true);
  assert.equal(app.run("Object.values(decksStore()).some(x=>x.deck.meta.subtitle==='Hallazgos de una investigación')"), true);
});

test('Ctrl+O opens a project from the desktop home screen', async t => {
  const calls = [];
  const app = await setup(t, async cmd => { calls.push(cmd); return null; });
  app.run('wsInicio()');
  const event = new app.dom.window.KeyboardEvent('keydown', {key:'o', ctrlKey:true, bubbles:true, cancelable:true});
  app.dom.window.document.body.dispatchEvent(event);
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.ok(calls.includes('abrir_archivo_proyecto'));
  assert.equal(event.defaultPrevented, true);
});

test('a genuinely new untouched document stays clean after recovery, but changed metadata stays pending', async t => {
  const app = await setup(t, async () => null);
  app.run('loadDeck(blankDeck(),null);marcaArchivoNuevo();saveInd.now()');
  assert.equal(app.run('lsGet(LS_AUTO,null).archivoNuevoSinCambios'), true);
  app.run('archivoNuevoInicial=null;recuperaEstadoArchivoNuevo(lsGet(LS_AUTO,null))');
  assert.equal(app.run('archivoEscritorioPendiente()'), false);
  app.run("S.deck.meta.subtitle='Información recuperada';saveInd.now();archivoNuevoInicial=null;recuperaEstadoArchivoNuevo(lsGet(LS_AUTO,null));");
  assert.equal(app.run('archivoEscritorioPendiente()'), true);
});

test('opening another file is not blocked by a full library when the current file is saved', async t => {
  let next;
  const app = await setup(t, async cmd => {
    if (cmd === 'guardar_archivo_proyecto_como') return {id: 1, nombre:'primero.json'};
    if (cmd === 'abrir_archivo_proyecto') return {id: 2, nombre:'otro.json', contenido:next};
    return null;
  });
  app.run("S.deck.meta.title='Primero';");
  await app.run('guardarProyectoEscritorio(true)');
  next = app.run("(()=>{const d=blankDeck();d.meta.title='Otro';return JSON.stringify(d)})()");
  const proto = app.dom.window.Storage.prototype, set = proto.setItem;
  proto.setItem = function(key, value) { if (key === 'erlen-slides.decks') throw new Error('quota'); return set.call(this,key,value); };
  t.after(() => { proto.setItem = set; });
  await app.run('abrirProyectoEscritorio()');
  assert.equal(app.run('S.deck.meta.title'), 'Otro');
});

test('native close does not discard an unconfirmed equation editor draft', async t => {
  const app = await setup(t, async cmd => cmd === 'guardar_archivo_proyecto_como' ? {id: 1, nombre:'charla.json'} : null);
  app.run("addSlide('content');addBlockToSlide('math',1);closeModal();");
  await app.run('guardarProyectoEscritorio(true)');
  app.run("openEqEditor(findBlock(S.selBlock).block);document.querySelector('#modalRoot textarea').value='E=mc^2';");
  assert.equal(app.run('confirmaSalidaArchivo()'), false);
  assert.equal(app.dom.window.document.querySelector('#modalRoot textarea').value, 'E=mc^2');
  assert.match(app.dom.window.__notices.at(-1)[0], /diálogo|termina/i);
});
