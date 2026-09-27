/* SPDX-License-Identifier: AGPL-3.0-only */
/* Cliente MCP mínimo para las pruebas: arranca mcp/servidor.mjs por stdio con
   una carpeta de trabajo temporal, negocia el protocolo y llama herramientas.
   No es una prueba (no acaba en .test.mjs): lo importan tests/mcp*.test.mjs.

     await conServidor(async (c, dir) => {
       const r = await c.llama('crear_presentacion', {archivo: 'p'});
       assert.equal(r.error, false, r.texto);
     }, {extensiones: '/ruta/a/otra/carpeta'});
*/
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createInterface} from 'node:readline';

export function cliente(dir, opciones = {}) {
  const env = {...process.env, ERLEN_SLIDES_DIR: dir};
  if (opciones.extensiones) env.ERLEN_MCP_EXTENSIONES = opciones.extensiones;
  const proc = spawn(process.execPath, [new URL('../mcp/servidor.mjs', import.meta.url).pathname], {env, stdio: ['pipe', 'pipe', 'pipe']});
  const pendientes = new Map(), ruido = [], stderr = [];
  let n = 0;
  proc.stderr.on('data', d => stderr.push(String(d)));
  createInterface({input: proc.stdout}).on('line', l => {
    let m;
    try { m = JSON.parse(l); } catch { ruido.push(l); return; }
    pendientes.get(m.id)?.(m); pendientes.delete(m.id);
  });
  const pide = (method, params) => new Promise((ok, mal) => {
    if (proc.exitCode != null) return mal(new Error('El servidor terminó: ' + stderr.join('')));
    const id = ++n; pendientes.set(id, ok);
    proc.stdin.write(JSON.stringify({jsonrpc: '2.0', id, method, params}) + '\n');
  });
  /* datos: el JSON de la respuesta (null si es un error); crudo: el result tal cual. */
  const llama = async (name, args) => {
    const r = await pide('tools/call', {name, arguments: args});
    const texto = r.result.content[0].text;
    return {error: !!r.result.isError, texto, datos: r.result.isError ? null : JSON.parse(texto), crudo: r.result};
  };
  const inicia = async (version = '2025-06-18') => {
    const r = await pide('initialize', {protocolVersion: version, capabilities: {}, clientInfo: {name: 'prueba', version: '0'}});
    proc.stdin.write(JSON.stringify({jsonrpc: '2.0', method: 'notifications/initialized'}) + '\n');
    return r;
  };
  proc.on('exit', () => { for (const [, ok] of pendientes) ok({error: {code: -1, message: 'El servidor terminó: ' + stderr.join('')}}); });
  return {proc, pide, llama, inicia, ruido, stderr, cierra: () => new Promise(ok => { if (proc.exitCode != null) return ok(); proc.on('exit', ok); proc.stdin.end(); })};
}

/* Arranca, ejecuta fn(cliente, carpeta) y limpia. Comprueba que stdout solo
   lleva mensajes del protocolo. opciones: {version, extensiones}. */
export async function conServidor(fn, opciones = {}) {
  if (typeof opciones === 'string') opciones = {version: opciones};
  const dir = mkdtempSync(join(tmpdir(), 'erlen-mcp-'));
  const c = cliente(dir, opciones);
  try { await c.inicia(opciones.version); await fn(c, dir); assert.deepEqual(c.ruido, [], 'stdout solo lleva mensajes del protocolo'); }
  finally { await c.cierra(); rmSync(dir, {recursive: true, force: true}); }
}

export const proyecto = (dir, n) => JSON.parse(readFileSync(join(dir, n + '.json'), 'utf8'));
export const bloques = sl => ['blocks', 'blocks2', 'blocks3', 'blocks4', 'blocks5', 'blocks6'].flatMap(k => sl[k] || []);
