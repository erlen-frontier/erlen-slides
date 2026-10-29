/* SPDX-License-Identifier: AGPL-3.0-only */
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {editor} from '../herramientas/test-browser.mjs';

const archivoAgente = new URL('../src/js/52b-agente.js', import.meta.url);
const archivoInterfaz = new URL('../src/js/52c-agente-ui.js', import.meta.url);
const llamada = (id, name, args) => ({id, type: 'function', function: {name, arguments: JSON.stringify(args)}});
const respuesta = (content = '', tool_calls) => ({choices: [{message: {role: 'assistant', content, ...(tool_calls ? {tool_calls} : {})}}]});

async function entorno() {
  const e = await editor();
  e.dom.window.eval(readFileSync(new URL('../mcp/operaciones.js', import.meta.url), 'utf8'));
  if (existsSync(archivoAgente)) e.dom.window.eval(readFileSync(archivoAgente, 'utf8'));
  if (existsSync(archivoInterfaz)) e.dom.window.eval(readFileSync(archivoInterfaz, 'utf8'));
  e.run("extensionSlides = async nombre => { if (nombre !== 'operaciones') throw Error('extensión inesperada'); return window.ERLEN_MCP; }");
  e.run("wsNueva(); addSlide('content');");
  if (!e.dom.window.ERLEN_AGENTE) {
    e.dom.window.close();
    assert.fail('el agente integrado debe estar disponible');
  }
  return e;
}
const parametros = mensaje => ({mensaje, url: 'https://proveedor.example/v1/chat/completions', modelo: 'modelo-prueba', clave: 'clave-de-sesion'});

test('real tool-calling changes the open deck once and undo restores it', async () => {
  const e = await entorno();
  try {
    const {dom, run} = e, id = run('curSlide().id');
    const previo = run('JSON.stringify(S.deck)'), antes = run('S.undo.length');
    let n = 0;
    dom.window.transporteAgente = async () => ++n === 1
      ? respuesta('', [llamada('a', 'editar_diapositiva', {diapositiva: id, cambios: {titulo: 'Resultado'}}), llamada('b', 'agregar_bloque', {diapositiva: id, zona: 1, bloque: {tipo: 'text', text: 'Texto nuevo'}})])
      : respuesta('He actualizado la diapositiva.');
    const resultado = await dom.window.ERLEN_AGENTE.conversa(parametros('Actualiza esta diapositiva'));
    assert.equal(run('curSlide().title'), 'Resultado');
    assert.equal(run('curSlide().blocks[0].text'), 'Texto nuevo');
    assert.equal(run('S.undo.length'), antes + 1);
    assert.ok(resultado.cambios.length >= 2);
    run('doUndo()');
    assert.equal(run('JSON.stringify(S.deck)'), previo);
    assert.equal(n, 2);
  } finally { e.dom.window.close(); }
});

test('agent keeps partial text formatting coherent, atomic and citation-safe', async () => {
  const e = await entorno();
  try {
    e.run(`(()=>{S.deck.meta.bibAuto=false;const b=newBlock('text');
      b.text='a😀 bc [@A]';b.negrita=true;b.formatoTexto=[{inicio:1,fin:3,negrita:false}];
      b.cientifico={texto:'fuente inmutable'};curSlide().blocks.push(b);window.__formato=b.id;commit()})()`);
    const id = e.run('__formato'), slide = e.run('curSlide().id');
    const antes = e.run('JSON.stringify(S.deck)'), undo = e.run('S.undo.length'), enviados = [];
    for (const cambio of [
      {text: 'Otro [@A]'},
      {text: 'a😀 bc [@A]', formatoTexto: [{inicio: 1, fin: 2, negrita: true}]},
      {text: 'Sin cita', formatoTexto: null},
      {text: 'Otro [@A]', formatoTexto: [{inicio: 0, fin: 2, negrita: 'sí'}]}
    ]) {
      e.dom.window.transporteAgente = async x => { enviados.push(x.cuerpo); return respuesta('', [
        llamada('a', 'editar_diapositiva', {diapositiva: slide, cambios: {titulo: 'No guardar'}}),
        llamada('b', 'editar_bloque', {bloque: id, cambios: cambio})
      ]); };
      await assert.rejects(e.dom.window.ERLEN_AGENTE.conversa(parametros('Reescribe')), /formatoTexto|cita/i);
      assert.equal(e.run('JSON.stringify(S.deck)'), antes);
      assert.equal(e.run('S.undo.length'), undo);
    }
    const contexto = enviados[0].messages.find(m => m.content?.startsWith('Contenido de la presentación')).content;
    assert.match(contexto, /formato_parcial/);
    assert.doesNotMatch(contexto, /"formatoTexto"/);
    const esquema = enviados[0].tools.find(t => t.function.name === 'editar_bloque');
    assert.ok(esquema.function.parameters.properties.cambios.properties.formatoTexto);

    let n = 0; e.dom.window.transporteAgente = async () => ++n === 1 ? respuesta('', [
      llamada('a', 'editar_bloque', {bloque: id, cambios: {formatoTexto: [{inicio: 0, fin: 2, cursiva: true}], text: 'Sí [@A]'}})
    ]) : respuesta('Revisado.');
    await e.dom.window.ERLEN_AGENTE.conversa(parametros('Reescribe conservando la cita'));
    let b = JSON.parse(e.run('JSON.stringify(findBlock(__formato).block)'));
    assert.equal(b.text, 'Sí [@A]');
    assert.deepEqual(b.formatoTexto, [{inicio: 0, fin: 2, cursiva: true}]);
    assert.equal(b.negrita, true);
    assert.deepEqual(b.cientifico, {texto: 'fuente inmutable'});
    assert.equal(e.run('S.undo.length'), undo + 1);
    e.run('doUndo()'); assert.equal(e.run('JSON.stringify(S.deck)'), antes);
    e.run('doRedo()');

    n = 0; e.dom.window.transporteAgente = async () => ++n === 1 ? respuesta('', [
      llamada('a', 'editar_bloque', {bloque: id, cambios: {text: 'Final [@A]', formatoTexto: null}})
    ]) : respuesta('Actualizado.');
    await e.dom.window.ERLEN_AGENTE.conversa(parametros('Quita el formato y reescribe'));
    b = JSON.parse(e.run('JSON.stringify(findBlock(__formato).block)'));
    assert.equal(b.text, 'Final [@A]');
    assert.equal(b.formatoTexto, undefined);
    assert.deepEqual(b.cientifico, {texto: 'fuente inmutable'});
    e.run('doUndo()');
    assert.deepEqual(JSON.parse(e.run('JSON.stringify(findBlock(__formato).block.formatoTexto)')), [{inicio: 0, fin: 2, cursiva: true}]);
  } finally { e.dom.window.close(); }
});

test('agent creates text with explicit ranges and rejects invalid batches', async () => {
  const e = await entorno();
  try {
    const id = e.run('curSlide().id'), antes = e.run('JSON.stringify(S.deck)'), undo = e.run('S.undo.length');
    e.dom.window.transporteAgente = async () => respuesta('', [llamada('a', 'agregar_diapositivas', {diapositivas: [
      {titulo: 'Primera'}, {zonas: [[{tipo: 'text', text: '😀', formatoTexto: [{inicio: 0, fin: 1, negrita: true}]}]]}
    ]})]);
    await assert.rejects(e.dom.window.ERLEN_AGENTE.conversa(parametros('Añade')), /formatoTexto/i);
    assert.equal(e.run('JSON.stringify(S.deck)'), antes);
    assert.equal(e.run('S.undo.length'), undo);
    let n = 0; e.dom.window.transporteAgente = async () => ++n === 1 ? respuesta('', [
      llamada('a', 'agregar_bloque', {diapositiva: id, bloque: {tipo: 'text', formatoTexto: [{inicio: 0, fin: 2, negrita: true}], text: '😀'}})
    ]) : respuesta('Añadido.');
    await e.dom.window.ERLEN_AGENTE.conversa(parametros('Añade el texto'));
    assert.deepEqual(JSON.parse(e.run('JSON.stringify(curSlide().blocks[0].formatoTexto)')), [{inicio: 0, fin: 2, negrita: true}]);
    e.run('doUndo()'); assert.equal(e.run('JSON.stringify(S.deck)'), antes);
  } finally { e.dom.window.close(); }
});

test('one request can set presentation metadata and add a complete slide batch atomically', async () => {
  const e = await entorno();
  try {
    const antes = e.run('JSON.stringify(S.deck)'), pasos = e.run('S.undo.length');
    let n = 0; e.dom.window.transporteAgente = async () => ++n === 1 ? respuesta('', [
      llamada('a', 'editar_metadatos', {cambios: {titulo: 'Informe ilustrativo', subtitulo: 'Reunión', autores: 'Equipo'}}),
      llamada('b', 'agregar_diapositivas', {diapositivas: [
        {diseno: 'content', titulo: 'Pregunta', zonas: [[{tipo: 'text', text: 'Una cuestión.'}]]},
        {diseno: 'twocol', titulo: 'Conclusión', zonas: [[{tipo: 'bullets', items: [{t: 'Dato ilustrativo', lvl: 0}]}], [{tipo: 'math', tex: 'a=b'}]]}
      ]})
    ]) : respuesta('He preparado la presentación.');
    const r = await e.dom.window.ERLEN_AGENTE.conversa(parametros('Crea la presentación'));
    assert.equal(e.run('S.deck.meta.title'), 'Informe ilustrativo');
    assert.equal(e.run('S.deck.meta.authors'), 'Equipo');
    assert.equal(e.run('S.deck.slides.length'), 4);
    assert.equal(e.run('S.deck.slides[2].blocks[0].text'), 'Una cuestión.');
    assert.equal(e.run('S.deck.slides[3].blocks2[0].tex'), 'a=b');
    assert.ok(r.cambios.length >= 2);
    assert.equal(e.run('S.undo.length'), pasos + 1);
    const despues = e.run('JSON.stringify(S.deck)');
    e.run('doUndo()'); assert.equal(e.run('JSON.stringify(S.deck)'), antes);
    e.run('doRedo()'); assert.equal(e.run('JSON.stringify(S.deck)'), despues);
  } finally { e.dom.window.close(); }
});

test('the assistant exposes model chat without replacing local help or storing its key', async () => {
  const e = await entorno();
  try {
    const {dom, run} = e;
    let llamadas = 0;
    dom.window.transporteAgente = async () => { llamadas++; return respuesta('Respuesta simulada.'); };
    const panel = run('asisPanel()');
    assert.ok(dom.window.ERLEN_AGENTE_UI, 'la interfaz del agente debe estar disponible');
    dom.window.ERLEN_AGENTE_UI.monta(panel);
    assert.equal(llamadas, 0);
    const boton = [...panel.querySelectorAll('button')].find(b => b.textContent === 'Conversar con IA');
    assert.ok(boton); boton.click();
    panel.querySelector('[aria-label="Endpoint de Chat Completions"]').value = 'https://proveedor.example/v1/chat/completions';
    panel.querySelector('[aria-label="Modelo de IA"]').value = 'modelo-prueba';
    panel.querySelector('[aria-label="Clave de sesión"]').value = 'clave-ui-secreta';
    panel.querySelector('[aria-label="Mensaje para la IA"]').value = 'Hola';
    [...panel.querySelectorAll('button')].find(b => b.textContent === 'Enviar a la IA').click();
    for (let i = 0; i < 50 && !panel.textContent.includes('Respuesta simulada.'); i++) await new Promise(ok => setTimeout(ok, 10));
    assert.equal(llamadas, 1);
    assert.match(panel.textContent, /Respuesta simulada/);
    assert.doesNotMatch(JSON.stringify({...dom.window.localStorage}), /clave-ui-secreta/);
    [...panel.querySelectorAll('button')].find(b => b.textContent === 'Ayuda').click();
    assert.equal(panel.querySelector('.asis-hilo').hidden, false);
  } finally { e.dom.window.close(); }
});

test('visual chat starts a new thread for document or provider changes but keeps agent edits', async () => {
  const e = await entorno();
  try {
    const {dom, run} = e, panel = run('asisPanel()');
    dom.window.ERLEN_AGENTE_UI.monta(panel);
    [...panel.querySelectorAll('button')].find(b => b.textContent === 'Conversar con IA').click();
    const url = panel.querySelector('[aria-label="Endpoint de Chat Completions"]');
    const modelo = panel.querySelector('[aria-label="Modelo de IA"]');
    const input = panel.querySelector('[aria-label="Mensaje para la IA"]');
    const boton = [...panel.querySelectorAll('button')].find(b => b.textContent === 'Enviar a la IA');
    const hilo = panel.querySelector('.agente-hilo');
    url.value = 'https://primero.example/chat'; modelo.value = 'modelo-prueba';
    const id = run('curSlide().id');
    let n = 0; dom.window.transporteAgente = async () => {
      n++;
      if (n === 1) return respuesta('Primera respuesta');
      if (n === 2) return respuesta('', [llamada('a', 'editar_diapositiva', {diapositiva: id, cambios: {titulo: 'Editada'}})]);
      if (n === 3) return respuesta('Cambio realizado');
      return respuesta('Nueva respuesta');
    };
    const manda = async texto => {
      input.value = texto; boton.click();
      for (let i = 0; i < 200 && boton.disabled; i++) await new Promise(ok => setTimeout(ok, 10));
      assert.equal(boton.disabled, false, 'la solicitud debe terminar');
    };
    await manda('Primera pregunta');
    await manda('Cambia el título');
    assert.match(hilo.textContent, /Primera pregunta/);
    assert.match(hilo.textContent, /Cambio realizado/);
    url.value = 'https://segundo.example/chat'; url.dispatchEvent(new dom.window.Event('input', {bubbles: true}));
    assert.doesNotMatch(hilo.textContent, /Primera pregunta|Cambio realizado/);
    await manda('Otro proveedor'); assert.match(hilo.textContent, /Otro proveedor/);
    run("wsNueva(); addSlide('content')");
    await new Promise(ok => setTimeout(ok, 0));
    assert.doesNotMatch(hilo.textContent, /Otro proveedor|Nueva respuesta/);
  } finally { e.dom.window.close(); }
});

test('undo and redo keep the chat for the same document while another document starts fresh', async () => {
  const e = await entorno();
  try {
    const {dom, run} = e, panel = run('asisPanel()');
    dom.window.ERLEN_AGENTE_UI.monta(panel);
    [...panel.querySelectorAll('button')].find(b => b.textContent === 'Conversar con IA').click();
    const url = panel.querySelector('[aria-label="Endpoint de Chat Completions"]'), modelo = panel.querySelector('[aria-label="Modelo de IA"]');
    const input = panel.querySelector('[aria-label="Mensaje para la IA"]'), boton = [...panel.querySelectorAll('button')].find(b => b.textContent === 'Enviar a la IA');
    const hilo = panel.querySelector('.agente-hilo'), enviados = [];
    url.value = 'https://proveedor.example/chat'; modelo.value = 'modelo-prueba';
    dom.window.transporteAgente = async x => { enviados.push(JSON.stringify(x.cuerpo)); return respuesta('Respuesta conservada'); };
    const manda = async texto => {
      input.value = texto; boton.click();
      for (let i = 0; i < 200 && boton.disabled; i++) await new Promise(ok => setTimeout(ok, 10));
      assert.equal(boton.disabled, false);
    };
    await manda('Primer turno');
    run("curSlide().title='Cambio humano';commit();doUndo();doRedo()");
    await new Promise(ok => setTimeout(ok, 0));
    assert.match(hilo.textContent, /Primer turno/);
    await manda('Segundo turno');
    assert.match(enviados[1], /Primer turno/);
    run("wsNueva();addSlide('content')"); await new Promise(ok => setTimeout(ok, 0));
    assert.doesNotMatch(hilo.textContent, /Primer turno|Segundo turno/);
    await manda('Otra presentación');
    assert.doesNotMatch(enviados[2], /Primer turno|Segundo turno/);
  } finally { e.dom.window.close(); }
});

test('saving the current presentation under different names preserves its chat, while opening a copy separates it', async () => {
  const e = await entorno();
  try {
    const {dom, run} = e, panel = run('asisPanel()');
    dom.window.ERLEN_AGENTE_UI.monta(panel);
    [...panel.querySelectorAll('button')].find(b => b.textContent === 'Conversar con IA').click();
    panel.querySelector('[aria-label="Endpoint de Chat Completions"]').value = 'https://proveedor.example/chat';
    panel.querySelector('[aria-label="Modelo de IA"]').value = 'modelo-prueba';
    const input = panel.querySelector('[aria-label="Mensaje para la IA"]'), boton = [...panel.querySelectorAll('button')].find(b => b.textContent === 'Enviar a la IA');
    const hilo = panel.querySelector('.agente-hilo'), enviados = [];
    dom.window.transporteAgente = async x => { enviados.push(JSON.stringify(x.cuerpo)); return respuesta('Respuesta conservada'); };
    const manda = async texto => {
      input.value = texto; boton.click();
      for (let i = 0; i < 200 && boton.disabled; i++) await new Promise(ok => setTimeout(ok, 10));
      assert.equal(boton.disabled, false);
    };
    const guardaComo = nombre => {
      run('saveDeckAs()');
      const campo = dom.window.document.querySelector('[aria-label="Nombre de la presentación"]');
      assert.ok(campo, 'aparece el formulario de guardado');
      campo.value = nombre; campo.dispatchEvent(new dom.window.Event('input', {bubbles: true}));
      campo.closest('form').dispatchEvent(new dom.window.Event('submit', {bubbles: true, cancelable: true}));
      run('closeModal()');
      assert.equal(run('S.deckName'), nombre);
    };
    await manda('Primer turno del documento');
    guardaComo('Primera copia');
    await manda('Segundo turno del documento');
    assert.match(hilo.textContent, /Primer turno del documento/);
    assert.match(enviados[1], /Primer turno del documento/);
    guardaComo('Segunda copia');
    await manda('Tercer turno del documento');
    assert.match(enviados[2], /Primer turno del documento|Segundo turno del documento/);
    run("loadDeck(deepCopy(S.deck),'Otra presentación')"); await new Promise(ok => setTimeout(ok, 0));
    assert.doesNotMatch(hilo.textContent, /Primer turno del documento|Segundo turno del documento/);
    await manda('Otra presentación');
    assert.doesNotMatch(enviados[3], /Primer turno del documento|Segundo turno del documento/);
  } finally { e.dom.window.close(); }
});

test('deleting the saved copy keeps the open document chat and a new identical document gets a separate thread', async () => {
  const e = await entorno();
  try {
    const {dom, run} = e, panel = run('asisPanel()');
    dom.window.ERLEN_AGENTE_UI.monta(panel);
    [...panel.querySelectorAll('button')].find(b => b.textContent === 'Conversar con IA').click();
    panel.querySelector('[aria-label="Endpoint de Chat Completions"]').value = 'https://proveedor.example/chat';
    panel.querySelector('[aria-label="Modelo de IA"]').value = 'modelo-prueba';
    const input = panel.querySelector('[aria-label="Mensaje para la IA"]'), boton = [...panel.querySelectorAll('button')].find(b => b.textContent === 'Enviar a la IA');
    const hilo = panel.querySelector('.agente-hilo'), enviados = [];
    dom.window.transporteAgente = async x => { enviados.push(JSON.stringify(x.cuerpo)); return respuesta('Respuesta conservada'); };
    const manda = async texto => {
      input.value = texto; boton.click();
      for (let i = 0; i < 200 && boton.disabled; i++) await new Promise(ok => setTimeout(ok, 10));
      assert.equal(boton.disabled, false);
    };
    run('saveDeckAs()');
    const campo = dom.window.document.querySelector('[aria-label="Nombre de la presentación"]');
    campo.value = 'Copia temporal'; campo.dispatchEvent(new dom.window.Event('input', {bubbles: true}));
    campo.closest('form').dispatchEvent(new dom.window.Event('submit', {bubbles: true, cancelable: true}));
    run('closeModal()');
    await manda('Conversación del documento');
    run('openDecks()');
    const fila = [...dom.window.document.querySelectorAll('.deck-row')].find(x => x.textContent.includes('Copia temporal'));
    assert.ok(fila); fila.querySelector('[title="Eliminar"]').click(); run('closeModal()');
    assert.equal(run('S.deckName'), null);
    await manda('Después de eliminar la copia');
    assert.match(hilo.textContent, /Conversación del documento/);
    assert.match(enviados[1], /Conversación del documento/);
    run("curSlide().title='Cambio humano';commit();doUndo();doRedo()");
    await new Promise(ok => setTimeout(ok, 0));
    assert.match(hilo.textContent, /Conversación del documento/);
    run("loadDeck(deepCopy(S.deck),'Copia idéntica')"); await new Promise(ok => setTimeout(ok, 0));
    assert.doesNotMatch(hilo.textContent, /Conversación del documento|Después de eliminar la copia/);
    await manda('Documento distinto');
    assert.doesNotMatch(enviados[2], /Conversación del documento|Después de eliminar la copia/);
  } finally { e.dom.window.close(); }
});

test('an identical presentation opened during a request still invalidates the pending response', async () => {
  const e = await entorno();
  try {
    let termina; e.dom.window.transporteAgente = () => new Promise(ok => { termina = ok; });
    const id = e.run('curSlide().id');
    const p = e.dom.window.ERLEN_AGENTE.conversa(parametros('Cambia el título'));
    await Promise.resolve();
    e.run("loadDeck(deepCopy(S.deck),'Copia abierta')");
    const antes = e.run('JSON.stringify(S.deck)');
    termina(respuesta('', [llamada('a', 'editar_diapositiva', {diapositiva: id, cambios: {titulo: 'Tarde'}})]));
    await assert.rejects(p, /cambi[oó]/i);
    assert.equal(e.run('JSON.stringify(S.deck)'), antes);
  } finally { e.dom.window.close(); }
});

test('the agent rejects non-HTTPS endpoints before contacting a provider', async () => {
  const e = await entorno();
  try {
    let llamadas = 0; e.dom.window.transporteAgente = async () => { llamadas++; return respuesta('no esperado'); };
    for (const url of ['http://proveedor.example/v1/chat/completions', 'ftp://proveedor.example/v1/chat/completions']) {
      await assert.rejects(e.dom.window.ERLEN_AGENTE.conversa({...parametros('Hola'), url}), /HTTPS|nube|p[uú]blic/i);
    }
    assert.equal(llamadas, 0);
  } finally { e.dom.window.close(); }
});

test('a failure in a later tool leaves the deck and undo stack untouched', async () => {
  const e = await entorno();
  try {
    const id = e.run('curSlide().id'), previo = e.run('JSON.stringify(S.deck)'), undo = e.run('S.undo.length');
    e.dom.window.transporteAgente = async () => respuesta('', [llamada('a', 'editar_diapositiva', {diapositiva: id, cambios: {titulo: 'No guardar'}}), llamada('b', 'editar_bloque', {bloque: 'ausente', cambios: {text: 'fallo'}})]);
    await assert.rejects(e.dom.window.ERLEN_AGENTE.conversa(parametros('Edita')), /bloque/i);
    assert.equal(e.run('JSON.stringify(S.deck)'), previo);
    assert.equal(e.run('S.undo.length'), undo);
  } finally { e.dom.window.close(); }
});

test('cancellation ignores an eventual response even when the provider does not abort', async () => {
  const e = await entorno();
  try {
    let termina; e.dom.window.transporteAgente = () => new Promise(ok => { termina = ok; });
    const previo = e.run('JSON.stringify(S.deck)'), controller = new e.dom.window.AbortController();
    const p = e.dom.window.ERLEN_AGENTE.conversa({...parametros('Haz cambios'), signal: controller.signal});
    await Promise.resolve(); controller.abort();
    termina(respuesta('', [llamada('a', 'editar_diapositiva', {diapositiva: e.run('curSlide().id'), cambios: {titulo: 'Tarde'}})]));
    await assert.rejects(p, /cancel/i);
    assert.equal(e.run('JSON.stringify(S.deck)'), previo);
  } finally { e.dom.window.close(); }
});

test('cancellation keeps the agent busy until the transport finishes cancelling', async () => {
  const e = await entorno();
  try {
    const ctrl = new e.dom.window.AbortController(), previo = e.run('JSON.stringify(S.deck)');
    let libera, abortoRecibido = false, llamadas = 0;
    e.dom.window.transporteAgente = ({signal}) => {
      llamadas++;
      return new Promise((_, rechaza) => signal.addEventListener('abort', () => {
        abortoRecibido = true; libera = () => rechaza(new Error('Transporte cancelado'));
      }, {once: true}));
    };
    const p = e.dom.window.ERLEN_AGENTE.conversa({...parametros('Cambia algo'), signal: ctrl.signal});
    let completada = false; p.then(() => { completada = true; }, () => { completada = true; });
    await Promise.resolve(); ctrl.abort(); await new Promise(ok => setTimeout(ok, 10));
    assert.equal(abortoRecibido, true);
    assert.equal(completada, false, 'debe esperar a que termine la cancelación del transporte');
    await assert.rejects(e.dom.window.ERLEN_AGENTE.conversa(parametros('Otra petición')), /en curso/i);
    assert.equal(llamadas, 1);
    libera();
    await assert.rejects(p, /cancel/i);
    assert.equal(e.run('JSON.stringify(S.deck)'), previo);
  } finally { e.dom.window.close(); }
});

test('a response cannot overwrite an in-place edit made while the model is working', async () => {
  const e = await entorno();
  try {
    let termina; e.dom.window.transporteAgente = () => new Promise(ok => { termina = ok; });
    const id = e.run('curSlide().id');
    const p = e.dom.window.ERLEN_AGENTE.conversa(parametros('Cambia el título'));
    await Promise.resolve();
    e.run("curSlide().title = 'Edición humana'; commit()");
    termina(respuesta('', [llamada('a', 'editar_diapositiva', {diapositiva: id, cambios: {titulo: 'Respuesta tardía'}})]));
    await assert.rejects(p, /cambi[oó]/i);
    assert.equal(e.run('curSlide().title'), 'Edición humana');
  } finally { e.dom.window.close(); }
});

test('locked blocks and scientific source data cannot be changed or deleted', async () => {
  const e = await entorno();
  try {
    e.run(`(()=>{const b=newBlock('text');b.text='protegido';b.locked=true;curSlide().blocks.push(b);window.__locked=b.id;
      const im=newBlock('image');im.src='data:image/png;base64,ZmFrZQ==';im.cientifico={v:1,tipo:'datos',texto:'x,y\\n1,2',modo:'markers',x:'x',y:'y'};curSlide().blocks.push(im);window.__science=im.id;commit()})()`);
    const previo = e.run('JSON.stringify(S.deck)');
    for (const c of [
      llamada('a', 'editar_bloque', {bloque: e.run('__locked'), cambios: {text: 'otro'}}),
      llamada('b', 'eliminar_bloque', {bloque: e.run('__science')}),
      llamada('c', 'editar_bloque', {bloque: e.run('__science'), cambios: {cientifico: null}}),
      llamada('d', 'eliminar_diapositiva', {diapositiva: e.run('curSlide().id')})
    ]) {
      e.dom.window.transporteAgente = async () => respuesta('', [c]);
      await assert.rejects(e.dom.window.ERLEN_AGENTE.conversa(parametros('Edita')));
      assert.equal(e.run('JSON.stringify(S.deck)'), previo);
    }
  } finally { e.dom.window.close(); }
});

test('bibliography synchronization cannot remove protected content from an imported automatic slide', async () => {
  const e = await entorno();
  try {
    e.run(`(()=>{const protegido=newBlock('text');protegido.text='Conservar';protegido.locked=true;
      S.deck.slides.push({id:'bib-importada',layout:'content',title:'Referencias',bibAuto:true,blocks:[protegido]});snapNow()})()`);
    const before=e.run('JSON.stringify(S.deck)');
    let n=0;
    e.dom.window.transporteAgente=async()=>++n===1
      ? respuesta('',[llamada('a','editar_metadatos',{cambios:{titulo:'Título nuevo'}})])
      : respuesta('Actualizado.');
    await assert.rejects(e.dom.window.ERLEN_AGENTE.conversa(parametros('Cambia el título')), /protegid/i);
    assert.equal(e.run('JSON.stringify(S.deck)'), before);
  } finally { e.dom.window.close(); }
});

test('provider context excludes keys, embedded media and paths while retaining prior conversation', async () => {
  const e = await entorno();
  try {
    e.run(`(()=>{const b=newBlock('image');b.src='data:image/png;base64,ZmFrZQ==';b.caption='/home/persona/imagen.png';curSlide().blocks.push(b);commit()})()`);
    const enviados = [];
    e.dom.window.transporteAgente = async x => { enviados.push(JSON.stringify(x.cuerpo)); return respuesta('Respuesta del modelo'); };
    await e.dom.window.ERLEN_AGENTE.conversa(parametros('Primera pregunta'));
    await e.dom.window.ERLEN_AGENTE.conversa(parametros('Pregunta siguiente'));
    assert.match(enviados[1], /Primera pregunta/);
    assert.match(enviados[1], /Respuesta del modelo/);
    for (const s of enviados) {
      assert.doesNotMatch(s, /clave-de-sesion|ZmFrZQ|\/home\/persona/);
    }
  } finally { e.dom.window.close(); }
});

test('the context is bounded even for a slide with many blocks and unusual position metadata', async () => {
  const e = await entorno();
  try {
    e.run(`(()=>{for(let i=0;i<70;i++){const b=newBlock('text');b.text='x'.repeat(2000);b.posLibre={x:0,y:0,w:20,h:20,oculto:'data:image/png;base64,c2VjcmV0'};curSlide().blocks.push(b)}commit()})()`);
    let enviado;
    e.dom.window.transporteAgente = async x => { enviado = x.cuerpo; return respuesta('Respuesta.'); };
    await e.dom.window.ERLEN_AGENTE.conversa(parametros('Resume'));
    const contexto = enviado.messages.find(m => m.content?.startsWith('Contenido de la presentación'))?.content;
    assert.ok(contexto.length <= 18100, 'el contexto debe tener un límite efectivo');
    assert.doesNotMatch(contexto, /c2VjcmV0|oculto/);
  } finally { e.dom.window.close(); }
});

test('notes are opt-in, including when the model asks to inspect a slide', async () => {
  const e = await entorno();
  try {
    e.run("curSlide().notes = 'Nota privada para el orador'; commit()");
    const id = e.run('curSlide().id'), enviados = [];
    let n = 0; e.dom.window.transporteAgente = async x => {
      enviados.push(JSON.stringify(x.cuerpo));
      return ++n === 1 ? respuesta('', [llamada('a', 'ver_diapositiva', {diapositiva: id})]) : respuesta('Entendido.');
    };
    await e.dom.window.ERLEN_AGENTE.conversa(parametros('Revisa la diapositiva'));
    assert.ok(enviados.every(x => !x.includes('Nota privada para el orador')));
    enviados.length = 0;
    await e.dom.window.ERLEN_AGENTE.conversa({...parametros('Puedes leer las notas'), incluirNotas: true});
    assert.ok(enviados.some(x => x.includes('Nota privada para el orador')));
  } finally { e.dom.window.close(); }
});

test('unshared existing notes cannot be overwritten or deleted with their slide', async () => {
  const e = await entorno();
  try {
    e.run("curSlide().notes = 'Nota privada'; commit()");
    const id = e.run('curSlide().id'), antes = e.run('JSON.stringify(S.deck)'), undo = e.run('S.undo.length');
    for (const c of [
      llamada('a', 'editar_diapositiva', {diapositiva: id, cambios: {notas: 'Sobrescrita'}}),
      llamada('b', 'editar_diapositiva', {diapositiva: id, cambios: {notas: ''}}),
      llamada('c', 'eliminar_diapositiva', {diapositiva: id})
    ]) {
      e.dom.window.transporteAgente = async () => respuesta('', [c]);
      await assert.rejects(e.dom.window.ERLEN_AGENTE.conversa(parametros('Edita')), /notas/i);
      assert.equal(e.run('JSON.stringify(S.deck)'), antes);
      assert.equal(e.run('S.undo.length'), undo);
    }
    let n = 0; e.dom.window.transporteAgente = async () => ++n === 1
      ? respuesta('', [llamada('a', 'editar_diapositiva', {diapositiva: id, cambios: {notas: 'Nota revisada'}})]) : respuesta('Actualizada.');
    await e.dom.window.ERLEN_AGENTE.conversa({...parametros('Revisa las notas'), incluirNotas: true});
    assert.equal(e.run('curSlide().notes'), 'Nota revisada');
  } finally { e.dom.window.close(); }
});

test('existing citation marks and reference blocks survive edits and deletions', async () => {
  const e = await entorno();
  try {
    e.run(`(()=>{S.deck.meta.bibAuto=false;curSlide().title='Título [@A]';
      const t=newBlock('text');t.text='Hecho [@A; @B] y otro [@A]';curSlide().blocks.push(t);window.__citado=t.id;
      const v=newBlock('bullets');v.items=[{t:'Resultado [@B]',lvl:0}];curSlide().blocks.push(v);window.__vineta=v.id;
      const ref=newBlock('refs');curSlide().blocks.push(ref);window.__refs=ref.id;commit()})()`);
    const slide = e.run('curSlide().id'), bloque = e.run('__citado'), vineta = e.run('__vineta'), refs = e.run('__refs');
    const antes = e.run('JSON.stringify(S.deck)'), undo = e.run('S.undo.length');
    for (const c of [
      llamada('a', 'editar_bloque', {bloque, cambios: {text: 'Hecho y otro [@A]'}}),
      llamada('b', 'editar_bloque', {bloque: vineta, cambios: {items: [{t: 'Resultado', lvl: 0}]}}),
      llamada('c', 'editar_diapositiva', {diapositiva: slide, cambios: {titulo: 'Título'}}),
      llamada('d', 'eliminar_bloque', {bloque}),
      llamada('e', 'eliminar_bloque', {bloque: refs}),
      llamada('f', 'eliminar_diapositiva', {diapositiva: slide})
    ]) {
      e.dom.window.transporteAgente = async () => respuesta('', [c]);
      await assert.rejects(e.dom.window.ERLEN_AGENTE.conversa(parametros('Edita')), /cita|referencia/i);
      assert.equal(e.run('JSON.stringify(S.deck)'), antes);
      assert.equal(e.run('S.undo.length'), undo);
    }
    let n = 0; e.dom.window.transporteAgente = async () => ++n === 1
      ? respuesta('', [llamada('a', 'editar_bloque', {bloque, cambios: {text: 'Revisado [@A; @B] y otro [@A]'}})]) : respuesta('Revisado.');
    await e.dom.window.ERLEN_AGENTE.conversa(parametros('Reescribe conservando las citas'));
    assert.equal(e.run('findBlock(__citado).block.text'), 'Revisado [@A; @B] y otro [@A]');
  } finally { e.dom.window.close(); }
});

test('slide and block citation links cannot be removed by deleting their container', async () => {
  const e = await entorno();
  try {
    e.run(`(()=>{S.deck.meta.bibAuto=false;const t=newBlock('text');t.text='Texto';t.cita='referencia-1';curSlide().blocks.push(t);window.__conCita=t.id;curSlide().citas=['referencia-1'];commit()})()`);
    const antes = e.run('JSON.stringify(S.deck)'), slide = e.run('curSlide().id');
    for (const c of [
      llamada('a', 'eliminar_bloque', {bloque: e.run('__conCita')}),
      llamada('b', 'eliminar_diapositiva', {diapositiva: slide})
    ]) {
      e.dom.window.transporteAgente = async () => respuesta('', [c]);
      await assert.rejects(e.dom.window.ERLEN_AGENTE.conversa(parametros('Elimina')), /cita|referencia/i);
      assert.equal(e.run('JSON.stringify(S.deck)'), antes);
    }
  } finally { e.dom.window.close(); }
});

test('an unrelated edit cannot indirectly delete an automatic reference slide', async () => {
  const e = await entorno();
  try {
    e.run(`(()=>{const sl={id:uid(),layout:'content',title:'Referencias',bibAuto:true,notes:'No perder',blocks:[newBlock('refs')]};S.deck.slides.push(sl);snapNow()})()`);
    const antes = e.run('JSON.stringify(S.deck)'), slide = e.run('curSlide().id'), undo = e.run('S.undo.length');
    let n = 0; e.dom.window.transporteAgente = async () => ++n === 1
      ? respuesta('', [llamada('a', 'editar_diapositiva', {diapositiva: slide, cambios: {titulo: 'Otro título'}})]) : respuesta('Editado.');
    await assert.rejects(e.dom.window.ERLEN_AGENTE.conversa(parametros('Cambia el título')), /referencia|notas/i);
    assert.equal(e.run('JSON.stringify(S.deck)'), antes);
    assert.equal(e.run('S.undo.length'), undo);
  } finally { e.dom.window.close(); }
});

test('the session key in a model tool argument never reaches the deck or autosave', async () => {
  const e = await entorno();
  try {
    const id = e.run('curSlide().id'), antes = e.run('JSON.stringify(S.deck)');
    e.dom.window.transporteAgente = async () => respuesta('', [
      llamada('a', 'editar_diapositiva', {diapositiva: id, cambios: {titulo: 'No guardar'}}),
      llamada('b', 'agregar_bloque', {diapositiva: id, bloque: {tipo: 'text', text: 'La clave es clave-de-sesion'}})
    ]);
    await assert.rejects(e.dom.window.ERLEN_AGENTE.conversa(parametros('Agrega texto')), /clave/i);
    assert.equal(e.run('JSON.stringify(S.deck)'), antes);
    assert.doesNotMatch(JSON.stringify({...e.dom.window.localStorage}), /clave-de-sesion/);
  } finally { e.dom.window.close(); }
});

test('truncated and filtered model responses never commit a staged edit', async () => {
  const e = await entorno();
  try {
    const id = e.run('curSlide().id'), antes = e.run('JSON.stringify(S.deck)'), undo = e.run('S.undo.length');
    for (const finish_reason of ['length', 'content_filter']) {
      let n = 0; e.dom.window.transporteAgente = async () => ++n === 1
        ? respuesta('', [llamada('a', 'editar_diapositiva', {diapositiva: id, cambios: {titulo: 'No guardar'}})])
        : {choices: [{finish_reason, message: {role: 'assistant', content: 'Respuesta incompleta'}}]};
      await assert.rejects(e.dom.window.ERLEN_AGENTE.conversa(parametros('Edita')), /incompleta|truncad|filtrad/i);
      assert.equal(e.run('JSON.stringify(S.deck)'), antes);
      assert.equal(e.run('S.undo.length'), undo);
    }
  } finally { e.dom.window.close(); }
});

test('tool results sent to the model remove paths, embedded media and the session key', async () => {
  const e = await entorno();
  try {
    const id = e.run('curSlide().id');
    e.run(`(()=>{curSlide().title='/home/persona/privado.csv data:image/png;base64,c2VjcmV0 clave-de-sesion';
      const fig=newBlock('image');fig.src='https://privado.example.com/figura.png';S.deck.slides[0].blocks.push(fig);commit()})()`);
    const enviados = []; let n = 0;
    e.dom.window.transporteAgente = async x => {
      enviados.push(JSON.stringify(x.cuerpo));
      return ++n === 1 ? respuesta('', [llamada('a', 'eliminar_diapositiva', {diapositiva: id})]) : respuesta('Eliminada.');
    };
    await e.dom.window.ERLEN_AGENTE.conversa(parametros('Elimina la diapositiva'));
    assert.equal(enviados.length, 2);
    for (const cuerpo of enviados) assert.doesNotMatch(cuerpo, /\/home\/persona\/privado\.csv|privado\.example\.com|c2VjcmV0|clave-de-sesion/);
    const tool = JSON.parse(enviados[1]).messages.find(m => m.role === 'tool');
    assert.equal(JSON.parse(tool.content).resultado.id, id, 'el ID sigue disponible');
  } finally { e.dom.window.close(); }
});

test('cleaning tool messages keeps legitimate IDs that resemble hostnames', async () => {
  const e = await entorno();
  try {
    e.run("curSlide().id='slide.ejemplo';snapNow()");
    const enviados = []; let n = 0;
    e.dom.window.transporteAgente = async x => {
      enviados.push(JSON.stringify(x.cuerpo));
      return ++n === 1 ? respuesta('', [llamada('a', 'editar_diapositiva', {diapositiva: 'slide.ejemplo', cambios: {titulo: 'Actualizada'}})]) : respuesta('Hecho.');
    };
    await e.dom.window.ERLEN_AGENTE.conversa(parametros('Cambia el título'));
    const assistant = JSON.parse(enviados[1]).messages.find(m => m.role === 'assistant' && m.tool_calls);
    assert.equal(JSON.parse(assistant.tool_calls[0].function.arguments).diapositiva, 'slide.ejemplo');
  } finally { e.dom.window.close(); }
});

test('chat history is isolated by document and provider configuration', async () => {
  const e = await entorno();
  try {
    const enviados = [];
    e.dom.window.transporteAgente = async x => { enviados.push(JSON.stringify(x.cuerpo)); return respuesta('Respuesta anterior'); };
    await e.dom.window.ERLEN_AGENTE.conversa(parametros('Mensaje de la primera conversación'));
    await e.dom.window.ERLEN_AGENTE.conversa({...parametros('Nuevo proveedor'), url: 'https://ejemplo.test/chat/completions'});
    assert.doesNotMatch(enviados[1], /Mensaje de la primera conversación/);
    e.run("wsNueva(); addSlide('content')");
    await e.dom.window.ERLEN_AGENTE.conversa({...parametros('Otro documento'), url: 'https://ejemplo.test/chat/completions'});
    assert.doesNotMatch(enviados[2], /Nuevo proveedor|Respuesta anterior/);
  } finally { e.dom.window.close(); }
});

test('free canvas positioning accepts only valid numeric contained geometry and undoes', async () => {
  const e = await entorno();
  try {
    e.run("curSlide().lienzoLibre=true; addBlockToSlide('text',1)");
    const id = e.run('S.selBlock'), previo = e.run('JSON.stringify(S.deck)');
    e.dom.window.transporteAgente = async () => respuesta('', [llamada('a', 'posicionar_bloque', {bloque: id, posicion: {x: '2', y: 2, w: 20, h: 20}})]);
    await assert.rejects(e.dom.window.ERLEN_AGENTE.conversa(parametros('Mueve el bloque')), /posici[oó]n|n[uú]mero/i);
    assert.equal(e.run('JSON.stringify(S.deck)'), previo);
    let n = 0; e.dom.window.transporteAgente = async () => ++n === 1 ? respuesta('', [llamada('a', 'posicionar_bloque', {bloque: id, posicion: {x: 2.345, y: 3, w: 30, h: 20}})]) : respuesta('Movido.');
    await e.dom.window.ERLEN_AGENTE.conversa(parametros('Mueve el bloque'));
    assert.equal(e.run('findBlock(S.selBlock).block.posLibre.x'), 2.35);
    e.run('doUndo()');
    assert.equal(e.run('JSON.stringify(S.deck)'), previo);
  } finally { e.dom.window.close(); }
});
