import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

// Pending production fixes: these regressions are not a claim of passing tests.
const [modales, archivos] = await Promise.all([
  readFile(new URL('../src/js/07-modals.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/js/33-archivo.js', import.meta.url), 'utf8')
]);
const caso = (nombre, fn) => test(nombre, {timeout: 3000}, fn);
const deck = title => ({meta: {title}, slides: [{id: title, blocks: []}]});

function entornoCarga() {
  const S = {deck: deck('A'), deckName: 'Anterior', respaldoId: 'respaldo-A',
    archivo: {name: 'A.json'}, archivoNombre: 'A.json', cur: 2, selBlock: 'b1',
    undo: ['a'], redo: ['b'], zoom: 1.5};
  const controles = {confirma: true, errorCopia: false, errorPreparacion: false, fallo: null};
  const eventos = [], avisos = [], selectores = [];
  let api;
  const registrar = nombre => {
    eventos.push({nombre, titulo: S.deck.meta.title, generacion: api.generacion(), revision: api.revision()});
    if (controles.fallo === nombre) throw new Error('Fallo en ' + nombre);
  };
  const contexto = vm.createContext({
    S, controles, window: {showSaveFilePicker: () => new Promise(resolve => selectores.push(resolve))},
    document: {activeElement: null}, $: () => null, deb: fn => fn,
    toast: texto => avisos.push(texto), deckSlug: () => S.deck.meta.title,
    quitaGuiaEjemplo() {}, flushEdicion() {}, recActual() {},
    deepCopy(valor) {
      if (controles.errorCopia) throw new Error('Fallo al copiar');
      return JSON.parse(JSON.stringify(valor));
    },
    materializaPosicionesLibres(sl) {
      registrar('preparar');
      if (controles.errorPreparacion) throw new Error('Fallo al preparar');
      sl.preparada = true;
    },
    snapNow: () => registrar('snapNow'), saveInd: () => registrar('saveInd'),
    renderAll: () => registrar('renderAll')
  });
  vm.runInContext(modales + '\n' + archivos + `
    confirmaCambioArchivo = () => controles.confirma;
    globalThis.api = {cargar: loadDeck, elegir: eligeArchivo,
      generacion: () => generacionArchivoEscritorio, revision: () => revisionAsociacionArchivo};
  `, contexto);
  api = contexto.api;
  return {S, controles, eventos, avisos, selectores, api};
}
function captura(e) {
  return {deck: e.S.deck, contenido: JSON.stringify(e.S), archivo: e.S.archivo,
    undo: e.S.undo, redo: e.S.redo, generacion: e.api.generacion(), revision: e.api.revision()};
}
function conserva(e, antes) {
  assert.equal(e.S.deck, antes.deck);
  assert.equal(JSON.stringify(e.S), antes.contenido);
  assert.equal(e.S.archivo, antes.archivo);
  assert.equal(e.S.undo, antes.undo);
  assert.equal(e.S.redo, antes.redo);
  assert.equal(e.api.generacion(), antes.generacion);
  assert.equal(e.api.revision(), antes.revision);
}
caso('cancelar loadDeck conserva el documento y la asociación', () => {
  const e = entornoCarga(), antes = captura(e);
  e.controles.confirma = false;
  assert.equal(e.api.cargar(deck('B'), 'Nueva'), false);
  conserva(e, antes);
  assert.equal(e.eventos.length, 0);
});
for (const fase of ['Copia', 'Preparacion']) {
  caso('fallar ' + fase + ' conserva el estado previo', () => {
    const e = entornoCarga(), antes = captura(e);
    e.controles['error' + fase] = true;
    assert.throws(() => e.api.cargar(deck('B'), 'Nueva'), /Fallo al/);
    conserva(e, antes);
  });
}
caso('prepara antes de invalidar e invalida una sola vez antes del render', () => {
  const e = entornoCarga(), entrada = deck('B');
  assert.equal(e.api.cargar(entrada, 'Nueva'), true);
  assert.notEqual(e.S.deck, entrada);
  assert.equal(entrada.slides[0].preparada, undefined);
  assert.equal(e.S.deck.slides[0].preparada, true);
  assert.deepEqual(e.eventos.map(x => x.nombre), ['preparar', 'snapNow', 'saveInd', 'renderAll']);
  assert.deepEqual(e.eventos[0], {nombre: 'preparar', titulo: 'A', generacion: 0, revision: 0});
  for (const x of e.eventos.slice(1)) {
    assert.equal(x.titulo, 'B'); assert.equal(x.generacion, 1); assert.equal(x.revision, 1);
  }
  assert.equal(e.api.generacion(), 1); assert.equal(e.api.revision(), 1);
  assert.equal(e.S.archivo, null); assert.equal(e.S.archivoNombre, null);
  assert.equal(e.S.respaldoId, null); assert.equal(e.S.deckName, 'Nueva');
  assert.equal(e.S.cur, 0); assert.equal(e.S.selBlock, null);
  assert.equal(e.S.undo.length, 0); assert.equal(e.S.redo.length, 0); assert.equal(e.S.zoom, null);
});
for (const fase of ['snapNow', 'saveInd', 'renderAll']) {
  caso('restaurar tras fallo en ' + fase + ' no reactiva el selector antiguo', async () => {
    const e = entornoCarga(), anterior = e.S.deck;
    const pendiente = e.api.elegir();
    e.controles.fallo = fase;
    assert.throws(() => e.api.cargar(deck('B'), 'Nueva'), new RegExp('Fallo en ' + fase));
    // Simula la restauración del modelo, no ejecuta cargaSegura.
    e.S.deck = anterior; e.controles.fallo = null;
    let aperturas = 0;
    e.selectores[0]({name: 'A.json', async createWritable() {
      aperturas++; return {async write() {}, async close() {}};
    }});
    await pendiente;
    assert.equal(e.api.generacion(), 1); assert.equal(e.api.revision(), 1);
    assert.equal(aperturas, 0); assert.equal(e.S.deck, anterior);
    assert.equal(e.S.archivo, null); assert.equal(e.S.archivoNombre, null);
  });
}
function entornoPropiedades() {
  const root = {innerHTML: ''}, commits = [];
  const contexto = vm.createContext({
    document: {contains: () => false}, $: () => root,
    BLOCK_DEFS: [{id: 'text', name: 'Texto'}],
    h: (tag, attrs, ...kids) => ({tag, attrs, kids}),
    commit: opts => commits.push(opts)
  });
  vm.runInContext(modales + `
    cuerpoProps = () => ({});
    openModal = opts => { _modalCleanup = opts.onclose; globalThis.modal = opts; };
    globalThis.api = {abrir: openBlockProps, cerrar: closeModal};
  `, contexto);
  contexto.api.abrir({id: 'b1', type: 'text'});
  return {contexto, commits};
}
caso('Listo en propiedades confirma una sola vez', () => {
  const {contexto, commits} = entornoPropiedades();
  contexto.modal.foot[0].attrs.onclick();
  assert.equal(commits.length, 1);
  assert.equal(commits[0].skipInsp, true);
});
caso('cerrar propiedades dos veces no repite la confirmación', () => {
  const {contexto, commits} = entornoPropiedades();
  contexto.api.cerrar(); contexto.api.cerrar();
  assert.equal(commits.length, 1);
});
