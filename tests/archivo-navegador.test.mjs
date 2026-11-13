import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const fuente = await readFile(new URL('../src/js/33-archivo.js', import.meta.url), 'utf8');
const caso = (nombre, fn) => test(nombre, {timeout: 3000}, fn);
function diferida(t) {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  if (t) t.after(() => resolve());
  return {promise, resolve, reject};
}
function archivoSimulado(nombre = 'charla.json', opciones = {}) {
  const registro = {aperturas: 0, escrituras: [], cierres: 0};
  const escrituraIniciada = diferida(), cierreIniciado = diferida();
  const archivo = {name: nombre, async createWritable() {
    registro.aperturas++;
    if (opciones.errorApertura) throw opciones.errorApertura;
    return {
      async write(datos) {
        registro.escrituras.push(datos);
        escrituraIniciada.resolve();
        if (opciones.esperaEscritura) await opciones.esperaEscritura;
        if (opciones.errorEscritura) throw opciones.errorEscritura;
      },
      async close() {
        registro.cierres++;
        cierreIniciado.resolve();
        if (opciones.esperaCierre) await opciones.esperaCierre;
        if (opciones.errorCierre) throw opciones.errorCierre;
      }
    };
  }};
  return {archivo, registro, escrituraIniciada, cierreIniciado};
}
function entorno() {
  const selectores = [], avisos = [], cambiosIndicador = [];
  const documento = nombre => ({meta: {title: nombre}, slides: []});
  const S = {deck: documento('A'), archivo: null, archivoNombre: null};
  const document = {activeElement: null};
  let alConsolidar = null, consolidaciones = 0;
  const indicador = {title: '', classList: {toggle(...args) { cambiosIndicador.push(args); }}};
  const contexto = vm.createContext({
    S, document,
    window: {showSaveFilePicker(opciones) {
      const seleccion = diferida();
      selectores.push({...seleccion, opciones});
      return seleccion.promise;
    }},
    $: selector => selector === '#saveInd' ? indicador : null,
    toast: (texto, tipo) => avisos.push({texto, tipo}),
    deckSlug: () => S.deck.meta.title,
    deb: fn => fn,
    flushEdicion() { consolidaciones++; alConsolidar?.(); }
  });
  vm.runInContext(fuente + `
    globalThis.apiArchivo = {
      elegir: eligeArchivo,
      escribir: escribeArchivo,
      soltar: sueltaArchivo,
      invalidarDocumento: olvidaArchivoEscritorio
    };
  `, contexto, {filename: 'src/js/33-archivo.js'});
  return {
    S, document, api: contexto.apiArchivo, selectores, avisos, cambiosIndicador, indicador,
    get consolidaciones() { return consolidaciones; },
    alConsolidar(fn) { alConsolidar = fn; },
    // Simula la transición; no sustituye una prueba de integración de loadDeck.
    cargar(nombre) {
      S.archivo = null; S.archivoNombre = null; S.deck = documento(nombre);
      contexto.apiArchivo.invalidarDocumento();
    }
  };
}
const tieneExito = e => e.avisos.some(a => a.texto.startsWith('Se guardará también'));
function estadoVisible(e) {
  return {avisos: e.avisos.slice(), cambios: e.cambiosIndicador.slice(), titulo: e.indicador.title};
}
async function asociar(e, archivo) {
  const indice = e.selectores.length;
  const pendiente = e.api.elegir();
  e.selectores[indice].resolve(archivo);
  await pendiente;
}

caso('guarda el documento vigente y conserva la asociación', async () => {
  const e = entorno(), f = archivoSimulado();
  const pendiente = e.api.elegir();
  assert.equal(e.selectores[0].opciones.suggestedName, 'A.json');
  assert.equal(e.S.archivo, null);
  e.selectores[0].resolve(f.archivo);
  await pendiente;
  assert.equal(f.registro.aperturas, 1);
  assert.equal(f.registro.cierres, 1);
  assert.equal(f.registro.escrituras.length, 1);
  assert.equal(JSON.parse(f.registro.escrituras[0]).meta.title, 'A');
  assert.equal(e.S.archivo, f.archivo);
  assert.equal(e.S.archivoNombre, 'charla.json');
  assert.equal(e.consolidaciones, 1);
  assert.equal(tieneExito(e), true);
});
for (const nombres of [['B'], ['B', 'A']]) {
  caso('descarta el selector tras cargar ' + nombres.join(' → '), async () => {
    const e = entorno(), f = archivoSimulado();
    const pendiente = e.api.elegir();
    nombres.forEach(n => e.cargar(n));
    e.selectores[0].resolve(f.archivo);
    await pendiente;
    assert.equal(f.registro.aperturas, 0);
    assert.equal(e.S.archivo, null);
    assert.equal(e.S.archivoNombre, null);
    assert.equal(tieneExito(e), false);
    assert.ok(e.avisos.some(a => a.texto.includes('La presentación cambió')));
  });
}
caso('reemplazar el modelo sin cambiar generación conserva la solicitud', async () => {
  const e = entorno(), f = archivoSimulado();
  const pendiente = e.api.elegir();
  e.S.deck = {meta: {title: 'A editada'}, slides: [{id: 's1'}]};
  e.selectores[0].resolve(f.archivo);
  await pendiente;
  assert.equal(JSON.parse(f.registro.escrituras[0]).meta.title, 'A editada');
  assert.equal(e.S.archivo, f.archivo);
});
caso('consolida la edición pendiente antes de serializar', async () => {
  const e = entorno(), f = archivoSimulado();
  e.alConsolidar(() => { e.S.deck.meta.title = 'Consolidado'; });
  await asociar(e, f.archivo);
  assert.equal(JSON.parse(f.registro.escrituras[0]).meta.title, 'Consolidado');
});
caso('descarta la solicitud si flushEdicion cambia de documento', async () => {
  const e = entorno(), f = archivoSimulado();
  e.alConsolidar(() => e.cargar('B'));
  await asociar(e, f.archivo);
  assert.equal(f.registro.aperturas, 0);
  assert.equal(e.S.archivo, null);
  assert.equal(tieneExito(e), false);
});
caso('blur consolida un campo activo antes de escribir', async () => {
  const e = entorno(), f = archivoSimulado();
  let desenfoques = 0;
  e.document.activeElement = {matches: () => true, blur() {
    desenfoques++; e.S.deck.meta.title = 'Desde el campo';
  }};
  await asociar(e, f.archivo);
  assert.equal(desenfoques, 1);
  assert.equal(JSON.parse(f.registro.escrituras[0]).meta.title, 'Desde el campo');
});
caso('blur que cambia de documento invalida la selección', async () => {
  const e = entorno(), f = archivoSimulado();
  e.document.activeElement = {matches: () => true, blur: () => e.cargar('B')};
  await asociar(e, f.archivo);
  assert.equal(f.registro.aperturas, 0);
  assert.equal(e.S.archivo, null);
});
for (const orden of [[0, 1], [1, 0]]) {
  caso('solo prevalece el selector nuevo, orden ' + orden.join('-'), async () => {
    const e = entorno(), antigua = archivoSimulado('antigua.json'), nueva = archivoSimulado('nueva.json');
    const operaciones = [e.api.elegir(), e.api.elegir()];
    const archivos = [antigua, nueva];
    for (const i of orden) {
      e.selectores[i].resolve(archivos[i].archivo);
      await operaciones[i];
    }
    assert.equal(antigua.registro.aperturas, 0);
    assert.equal(nueva.registro.aperturas, 1);
    assert.equal(e.S.archivo, nueva.archivo);
    assert.equal(e.S.archivoNombre, 'nueva.json');
  });
}
caso('cancelar el selector nuevo no reactiva el antiguo', async () => {
  const e = entorno(), f = archivoSimulado();
  const primera = e.api.elegir(), segunda = e.api.elegir();
  e.selectores[1].reject(Object.assign(new Error('Cancelado'), {name: 'AbortError'}));
  await segunda;
  e.selectores[0].resolve(f.archivo);
  await primera;
  assert.equal(f.registro.aperturas, 0);
  assert.equal(e.S.archivo, null);
  assert.equal(e.avisos.length, 0);
});
caso('desvincular invalida un selector pendiente', async () => {
  const e = entorno(), f = archivoSimulado();
  const pendiente = e.api.elegir();
  e.api.soltar();
  const antes = estadoVisible(e);
  e.selectores[0].resolve(f.archivo);
  await pendiente;
  assert.equal(f.registro.aperturas, 0);
  assert.equal(e.S.archivo, null);
  assert.deepEqual(estadoVisible(e), antes);
});
caso('cancelar conserva la asociación previa', async () => {
  const e = entorno(), f = archivoSimulado();
  await asociar(e, f.archivo);
  const antes = estadoVisible(e);
  const pendiente = e.api.elegir();
  e.selectores[1].reject(Object.assign(new Error('Cancelado'), {name: 'AbortError'}));
  await pendiente;
  assert.equal(e.S.archivo, f.archivo);
  assert.equal(e.S.archivoNombre, 'charla.json');
  assert.deepEqual(estadoVisible(e), antes);
});
caso('un error del selector obsoleto no añade avisos', async () => {
  const e = entorno();
  const pendiente = e.api.elegir();
  e.cargar('B');
  e.selectores[0].reject(new Error('Error tardío'));
  await pendiente;
  assert.equal(e.avisos.length, 0);
});
for (const fase of ['Apertura', 'Escritura', 'Cierre']) {
  caso('fallar ' + fase + ' limpia ambos campos y no anuncia éxito', async () => {
    const e = entorno(), f = archivoSimulado('fallo.json', {['error' + fase]: new Error('Fallo')});
    await asociar(e, f.archivo);
    assert.equal(e.S.archivo, null);
    assert.equal(e.S.archivoNombre, null);
    assert.equal(tieneExito(e), false);
    assert.ok(e.avisos.some(a => a.texto.startsWith('No se pudo guardar en el archivo.')));
    assert.equal(f.registro.escrituras.length, fase === 'Apertura' ? 0 : 1);
    assert.equal(f.registro.cierres, fase === 'Cierre' ? 1 : 0);
  });
}
caso('no anuncia éxito antes de completar close', async t => {
  const e = entorno(), liberar = diferida(t);
  const f = archivoSimulado('A.json', {esperaCierre: liberar.promise});
  const pendiente = asociar(e, f.archivo);
  await f.cierreIniciado.promise;
  assert.equal(tieneExito(e), false);
  liberar.resolve();
  await pendiente;
  assert.equal(tieneExito(e), true);
});
for (const fase of ['Escritura', 'Cierre']) {
  for (const accion of ['cargar', 'soltar']) {
    for (const falla of [false, true]) {
      caso(`${fase} tardía: ${accion}, fallo=${falla}`, async t => {
        const e = entorno(), liberar = diferida(t);
        const opciones = {['espera' + fase]: liberar.promise};
        if (falla) opciones['error' + fase] = new Error('Fallo tardío');
        const f = archivoSimulado('A.json', opciones);
        const pendiente = asociar(e, f.archivo);
        await (fase === 'Escritura' ? f.escrituraIniciada.promise : f.cierreIniciado.promise);
        if (accion === 'cargar') e.cargar('B'); else e.api.soltar();
        const antes = estadoVisible(e);
        liberar.resolve();
        await pendiente;
        assert.equal(e.S.archivo, null);
        assert.equal(e.S.archivoNombre, null);
        assert.deepEqual(estadoVisible(e), antes);
        assert.equal(JSON.parse(f.registro.escrituras[0]).meta.title, 'A');
        if (accion === 'cargar') assert.equal(e.S.deck.meta.title, 'B');
      });
    }
  }
}
for (const reutiliza of [false, true]) {
  caso('fallo antiguo conserva asociación nueva; mismo objeto=' + reutiliza, async t => {
    const e = entorno(), liberar = diferida(t), iniciada = diferida();
    const registro = {aperturas: 0, cierres: []};
    const archivo = {name: 'anterior.json', async createWritable() {
      const numero = ++registro.aperturas;
      return {
        async write() {
          if (numero === 1) {
            iniciada.resolve();
            await liberar.promise;
            throw new Error('Fallo de la asociación anterior');
          }
        },
        async close() { registro.cierres.push(numero); }
      };
    }};
    const primera = asociar(e, archivo);
    await iniciada.promise;
    const nuevo = reutiliza ? archivo : archivoSimulado('nuevo.json').archivo;
    await asociar(e, nuevo);
    assert.equal(tieneExito(e), true);
    const antes = estadoVisible(e);
    liberar.resolve();
    await primera;
    assert.equal(e.S.archivo, nuevo);
    assert.equal(e.S.archivoNombre, nuevo.name);
    assert.deepEqual(estadoVisible(e), antes);
    assert.deepEqual(registro.cierres, reutiliza ? [2] : []);
  });
}
caso('abrir otro selector no oculta el fallo de la asociación vigente', async t => {
  const e = entorno(), liberar = diferida(t);
  const f = archivoSimulado('A.json', {esperaEscritura: liberar.promise, errorEscritura: new Error('Fallo vigente')});
  const primera = asociar(e, f.archivo);
  await f.escrituraIniciada.promise;
  const segunda = e.api.elegir();
  liberar.resolve();
  await primera;
  assert.equal(e.S.archivo, null);
  assert.equal(e.S.archivoNombre, null);
  assert.ok(e.avisos.some(a => a.texto.startsWith('No se pudo guardar en el archivo.')));
  e.selectores[1].reject(Object.assign(new Error('Cancelado'), {name: 'AbortError'}));
  await segunda;
});
