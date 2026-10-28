/* SPDX-License-Identifier: AGPL-3.0-only */
'use strict';
/* El proveedor lo configura la persona. La clave solo viaja en la petición y
   nunca se escribe en el proyecto ni en las preferencias de la aplicación. */
const AGENTE_MAX_RED = 2 * 1024 * 1024;
let agenteSecuencia = 0;

function destinoAgente(valor) {
  const texto = String(valor || '').trim();
  if (texto.length > 2048) throw new Error('La dirección del proveedor es demasiado larga.');
  let url;
  try { url = new URL(texto); } catch (_) { throw new Error('La dirección del proveedor no es válida.'); }
  if (url.username || url.password || url.hash) throw new Error('La dirección no puede contener credenciales ni fragmentos.');
  if (!url.host || url.protocol !== 'https:')
    throw new Error('Usa una dirección HTTPS de tu proveedor de IA.');
  return url.href;
}
function cancelacionAgente() { return new DOMException('Solicitud cancelada.', 'AbortError'); }
function esperaAgente(promesa, signal) {
  if (!signal) return Promise.resolve(promesa);
  if (signal.aborted) return Promise.reject(cancelacionAgente());
  return new Promise((resolve, reject) => {
    const aborta = () => { signal.removeEventListener('abort', aborta); reject(cancelacionAgente()); };
    signal.addEventListener('abort', aborta, {once:true});
    Promise.resolve(promesa).then(v => { signal.removeEventListener('abort', aborta); resolve(v); },
      e => { signal.removeEventListener('abort', aborta); reject(e); });
  });
}
async function textoRespuestaAgente(respuesta) {
  const anunciado = +(respuesta.headers?.get('content-length') || 0);
  if (anunciado > AGENTE_MAX_RED) throw new Error('La respuesta del proveedor supera el tamaño permitido.');
  if (!respuesta.body?.getReader) {
    const texto = await respuesta.text();
    if (new TextEncoder().encode(texto).length > AGENTE_MAX_RED) throw new Error('La respuesta del proveedor supera el tamaño permitido.');
    return texto;
  }
  const lector = respuesta.body.getReader(), partes = [];
  let total = 0;
  try {
    for (;;) {
      const {done, value} = await lector.read();
      if (done) break;
      total += value.byteLength;
      if (total > AGENTE_MAX_RED) { await lector.cancel(); throw new Error('La respuesta del proveedor supera el tamaño permitido.'); }
      partes.push(value);
    }
  } finally { lector.releaseLock(); }
  const todo = new Uint8Array(total);
  let inicio = 0;
  for (const parte of partes) { todo.set(parte, inicio); inicio += parte.byteLength; }
  return new TextDecoder('utf-8', {fatal:true}).decode(todo);
}
async function transporteAgente({url, clave, cuerpo, signal}) {
  const destino = destinoAgente(url);
  if (signal?.aborted) throw cancelacionAgente();
  const secreto = String(clave || '');
  if (secreto.length > 4096 || /[\r\n]/.test(secreto)) throw new Error('La clave del proveedor no es válida.');
  let json;
  try { json = JSON.stringify(cuerpo); } catch (_) { throw new Error('La solicitud al modelo no es válida.'); }
  if (typeof json !== 'string' || new TextEncoder().encode(json).length > AGENTE_MAX_RED)
    throw new Error('La solicitud al modelo supera el tamaño permitido.');
  let texto;
  const invocar = window.__TAURI__?.core?.invoke;
  if (typeof invocar === 'function') {
    const solicitud = 'ag-' + Date.now().toString(36) + '-' + (++agenteSecuencia).toString(36);
    let cancelando;
    const cancelaNativo = () => {
      try { cancelando = Promise.resolve(invocar('agente_cancelar', {solicitud})).catch(() => {}); }
      catch (_) { cancelando = Promise.resolve(); }
    };
    signal?.addEventListener('abort', cancelaNativo, {once:true});
    try { texto = await esperaAgente(invocar('agente_consulta', {solicitud, url:destino, clave:secreto, cuerpo:json}), signal); }
    catch (error) {
      if (signal?.aborted || error?.name === 'AbortError') {
        // Do not reopen the chat while the native request is still registered.
        // Bound the wait in case the desktop bridge itself stops responding.
        if (cancelando) {
          let reloj;
          await Promise.race([cancelando, new Promise(resolve => { reloj = setTimeout(resolve, 3000); })]);
          clearTimeout(reloj);
        }
        throw cancelacionAgente();
      }
      const detalle = typeof error === 'string' ? error : (error?.message || 'No se pudo consultar al proveedor.');
      throw new Error((secreto ? detalle.split(secreto).join('[clave omitida]') : detalle).slice(0, 500));
    } finally { signal?.removeEventListener('abort', cancelaNativo); }
  } else {
    const control = new AbortController();
    let tardio = false;
    const aborta = () => control.abort();
    signal?.addEventListener('abort', aborta, {once:true});
    const reloj = setTimeout(() => { tardio = true; control.abort(); }, 120000);
    try {
      const cabeceras = {'content-type':'application/json', accept:'application/json'};
      if (secreto) cabeceras.authorization = 'Bearer ' + secreto;
      const respuesta = await fetch(destino, {method:'POST', headers:cabeceras, body:json,
        signal:control.signal, credentials:'omit', redirect:'error', cache:'no-store', referrerPolicy:'no-referrer'});
      if (!respuesta.ok) throw new Error('El proveedor respondió con HTTP ' + respuesta.status + '.');
      texto = await textoRespuestaAgente(respuesta);
    } catch (error) {
      if (signal?.aborted) throw cancelacionAgente();
      if (tardio) throw new Error('El proveedor tardó demasiado en responder.');
      if (error instanceof TypeError) throw new Error('No se pudo conectar con el proveedor. Comprueba la dirección, CORS y que esté disponible.');
      throw error;
    } finally {
      clearTimeout(reloj);
      signal?.removeEventListener('abort', aborta);
    }
  }
  try { return JSON.parse(texto); }
  catch (_) { throw new Error('El proveedor no devolvió JSON válido.'); }
}
