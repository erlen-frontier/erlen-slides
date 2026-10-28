import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function transport({invoke, fetch} = {}) {
  const context = vm.createContext({window: invoke ? {__TAURI__: {core: {invoke}}} : {}, fetch,
    URL, TextEncoder, TextDecoder, Uint8Array, AbortController, DOMException, setTimeout, clearTimeout, console});
  const code = readFileSync(new URL('../src/js/52c-transporte-agente.js', import.meta.url), 'utf8');
  vm.runInContext(code, context);
  return args => context.transporteAgente(args);
}

const input = {url:'https://api.example.org/v1/chat/completions', clave:'token-de-prueba', cuerpo:{model:'local', messages:[]}};

test('desktop sends the request through the native command and parses its JSON', async () => {
  let sent;
  const call = transport({invoke: async (name, args) => {sent = {name, args}; return '{"choices":[{"message":{"content":"Hola"}}]}';}});
  const reply = await call(input);
  assert.equal(reply.choices[0].message.content, 'Hola');
  assert.equal(sent.name, 'agente_consulta');
  assert.equal(sent.args.url, input.url);
  assert.equal(sent.args.clave, input.clave);
  assert.deepEqual(JSON.parse(sent.args.cuerpo), input.cuerpo);
});

test('refuses plain HTTP and credentials in URLs before calling a provider', async () => {
  let calls = 0;
  const call = transport({invoke: async () => {calls++; return '{}';}});
  for (const url of ['http://example.org/v1/chat/completions', 'http://127.0.0.1:11434/v1/chat/completions', 'https://user:pass@example.org/v1/chat/completions', 'file:///etc/passwd']) {
    await assert.rejects(call({...input, url}));
  }
  assert.equal(calls, 0);
});

test('cancellation discards a pending native response', async () => {
  let finish, requestId, canceledId;
  const call = transport({invoke: (name, args) => {
    if (name === 'agente_cancelar') { canceledId = args.solicitud; return Promise.resolve(); }
    requestId = args.solicitud;
    return new Promise(resolve => {finish = resolve;});
  }});
  const controller = new AbortController();
  const pending = call({...input, signal:controller.signal});
  controller.abort();
  await assert.rejects(pending, e => e.name === 'AbortError');
  assert.ok(requestId);
  assert.equal(canceledId, requestId);
  finish('{"choices":[]}');
});

test('desktop waits for native cancellation before allowing another request', async () => {
  let releaseCancel, active = false, settled = false;
  const call = transport({invoke: (name) => {
    if (name === 'agente_cancelar') return new Promise(resolve => {
      releaseCancel = () => { active = false; resolve(); };
    });
    if (active) return Promise.reject('Ya hay una consulta al modelo en curso.');
    active = true;
    return new Promise(() => {});
  }});
  const controller = new AbortController();
  const pending = call({...input, signal:controller.signal});
  const result = pending.then(() => { settled = true; }, error => { settled = true; return error; });
  controller.abort();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(settled, false, 'the UI must wait until the native request is canceled');
  releaseCancel();
  assert.equal((await result).name, 'AbortError');
  assert.equal(active, false);
});

test('browser transport reports provider HTTP errors without echoing a secret', async () => {
  const call = transport({fetch: async () => ({ok:false, status:401})});
  await assert.rejects(call(input), e => /401/.test(e.message) && !e.message.includes(input.clave));
});

test('native transport reports a readable error without leaking the session key', async () => {
  const call = transport({invoke: async () => { throw 'No se pudo conectar con el proveedor'; }});
  await assert.rejects(call(input), e => e.name === 'Error' && /conectar/.test(e.message) && !e.message.includes(input.clave));
});

test('browser sends a configured HTTPS request without cookies or referrer', async () => {
  let sent;
  const call = transport({fetch: async (url, opts) => {
    sent = {url, opts};
    return {ok:true, headers:{get:()=>null}, text:async()=>'{"choices":[{"message":{"content":"Hola"}}]}'};
  }});
  const response = await call({...input, url:'https://example.org/v1/chat/completions'});
  assert.equal(response.choices[0].message.content, 'Hola');
  assert.equal(sent.opts.headers.authorization, 'Bearer token-de-prueba');
  assert.equal(sent.opts.credentials, 'omit');
  assert.equal(sent.opts.referrerPolicy, 'no-referrer');
  assert.equal(sent.opts.redirect, 'error');
});

test('browser cancellation aborts the provider request', async () => {
  const call = transport({fetch: (_url, opts) => new Promise((_resolve, reject) => {
    opts.signal.addEventListener('abort', () => reject(new DOMException('Abortada', 'AbortError')));
  })});
  const controller = new AbortController();
  const pending = call({...input, signal:controller.signal});
  controller.abort();
  await assert.rejects(pending, e => e.name === 'AbortError');
});
