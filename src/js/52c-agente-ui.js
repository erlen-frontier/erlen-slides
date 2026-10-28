/* SPDX-License-Identifier: AGPL-3.0-only */
/* Interfaz de sesión para un proveedor elegido por la persona. */
window.ERLEN_AGENTE_UI = (() => {
  'use strict';
  let activo = false, controlador = null, panelAgente = null, ayuda = null, pieAyuda = null;
  let alcance = null;
  let botonAyuda, botonAgente, hilo, entrada, enviar, cancelar, endpoint, modelo, clave, notas, estado;
  const elementos = [];

  function burbuja(quien, valor) {
    const el = h('div', {class: 'asis-msg ' + quien}, h('p', null, valor));
    hilo.append(el); hilo.scrollTop = hilo.scrollHeight;
    return el;
  }
  function seleccion(agente) {
    activo = agente;
    if (agente) actualizaAlcance();
    ayuda.hidden = agente; pieAyuda.hidden = agente; panelAgente.hidden = !agente;
    botonAyuda.setAttribute('aria-selected', String(!agente));
    botonAgente.setAttribute('aria-selected', String(agente));
    if (agente) entrada.focus({preventScroll: true});
  }
  function habilita(trabajando) {
    for (const el of elementos) el.disabled = trabajando;
    enviar.disabled = trabajando; cancelar.disabled = !trabajando;
  }
  function detiene() { if (controlador) controlador.abort(); }
  function alcanceActual() {
    return {documento: window.ERLEN_AGENTE.identidadDocumento(), endpoint: endpoint.value.trim(), modelo: modelo.value.trim(), clave: clave.value, notas: notas.checked};
  }
  function actualizaAlcance() {
    if (!panelAgente || controlador) return;
    const siguiente = alcanceActual();
    if (alcance && Object.keys(siguiente).some(k => siguiente[k] !== alcance[k])) {
      window.ERLEN_AGENTE.reinicia(); hilo.replaceChildren();
      burbuja('bot', 'Nueva conversación para esta presentación y conexión.');
      estado.textContent = '';
    }
    alcance = siguiente;
  }
  function reinicia() {
    detiene(); window.ERLEN_AGENTE.reinicia(); hilo.replaceChildren();
    burbuja('bot', 'Configura el servicio y el modelo; después escribe lo que quieres hacer.');
    estado.textContent = '';
    alcance = alcanceActual();
  }
  async function manda(texto) {
    if (controlador) return;
    const mensaje = String(texto || '').trim();
    if (!mensaje) return;
    if (!endpoint.value.trim() || !modelo.value.trim()) {
      estado.textContent = 'Escribe el endpoint y el nombre del modelo en Conexión.'; return;
    }
    actualizaAlcance();
    const ctrl = new AbortController(); controlador = ctrl;
    entrada.value = ''; burbuja('yo', mensaje); habilita(true); estado.textContent = 'Consultando el modelo…';
    try {
      const r = await window.ERLEN_AGENTE.conversa({mensaje, url: endpoint.value.trim(), modelo: modelo.value.trim(), clave: clave.value, incluirNotas: notas.checked, signal: ctrl.signal});
      if (ctrl.signal.aborted) return;
      if (alcance) alcance.documento = window.ERLEN_AGENTE.identidadDocumento();
      burbuja('bot', r.respuesta);
      if (r.cambios.length) {
        const lista = h('ul', {class: 'agente-cambios'}, r.cambios.map(x => h('li', null, x)));
        const detalle = burbuja('bot', 'Cambios aplicados en un solo paso. Puedes usar Deshacer en el editor.');
        detalle.append(lista);
      }
      if (r.avisos.length) burbuja('bot', 'Avisos: ' + r.avisos.join(' '));
      estado.textContent = 'Respuesta recibida.';
    } catch (e) {
      if (controlador === ctrl) { controlador = null; actualizaAlcance(); }
      if (ctrl.signal.aborted) estado.textContent = 'Consulta detenida en Tabula; no se aplicaron cambios.';
      else { estado.textContent = 'No se completó la solicitud.'; burbuja('bot', e.message || 'El servicio no respondió.'); }
    } finally {
      if (controlador === ctrl) controlador = null;
      habilita(false);
    }
  }
  function monta(panel) {
    if (panelAgente) return;
    ayuda = panel.querySelector('.asis-hilo'); pieAyuda = panel.querySelector('.asis-pie');
    if (!ayuda || !pieAyuda) return;
    botonAyuda = h('button', {type: 'button', role: 'tab', 'aria-selected': 'true', onclick: () => seleccion(false)}, 'Ayuda');
    botonAgente = h('button', {type: 'button', role: 'tab', 'aria-selected': 'false', onclick: () => seleccion(true)}, 'Conversar con IA');
    const pestanas = h('div', {class: 'agente-pestanas', role: 'tablist', 'aria-label': 'Tipo de asistente'}, botonAyuda, botonAgente);
    endpoint = h('input', {class: 'field', type: 'url', autocomplete: 'off', 'aria-label': 'Endpoint de Chat Completions', placeholder: 'https://servicio.example/v1/chat/completions'});
    modelo = h('input', {class: 'field', type: 'text', autocomplete: 'off', 'aria-label': 'Modelo de IA', placeholder: 'Nombre del modelo'});
    clave = h('input', {class: 'field', type: 'password', autocomplete: 'off', 'aria-label': 'Clave de sesión', placeholder: 'Opcional'});
    notas = h('input', {type: 'checkbox', 'aria-label': 'Incluir notas del orador'});
    elementos.push(endpoint, modelo, clave, notas);
    const conexion = h('details', {class: 'agente-conexion'}, h('summary', null, 'Conexión'),
      h('label', null, 'Endpoint completo', endpoint), h('label', null, 'Modelo', modelo),
      h('label', null, 'Clave para esta sesión', clave),
      h('label', {class: 'agente-notas'}, notas, ' Incluir notas del orador'),
      h('p', {class: 'hint'}, 'Al enviar, se comparte un resumen limitado de la presentación y la conversación con el servicio de IA en la nube elegido. Las notas solo se comparten si marcas la casilla; no se envían medios ni rutas. La dirección y la clave se conservan solo durante la sesión. El proveedor puede aplicar sus propias tarifas.'));
    hilo = h('div', {class: 'asis-hilo agente-hilo', role: 'log', 'aria-live': 'polite'});
    entrada = h('textarea', {class: 'asis-ent', rows: 2, maxlength: '4000', 'aria-label': 'Mensaje para la IA', placeholder: 'Pregunta o pide un cambio…'});
    entrada.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); manda(entrada.value); } });
    enviar = h('button', {class: 'btn btn-pri', type: 'button', onclick: () => manda(entrada.value)}, 'Enviar a la IA');
    cancelar = h('button', {class: 'btn', type: 'button', disabled: true, onclick: detiene}, 'Cancelar');
    estado = h('p', {class: 'hint agente-estado', role: 'status', 'aria-live': 'polite'});
    panelAgente = h('div', {class: 'agente-panel'}, conexion, hilo,
      h('div', {class: 'asis-pie'}, estado, h('div', {class: 'agente-entrada'}, entrada), h('div', {class: 'agente-botones'}, enviar, cancelar)));
    panel.insertBefore(pestanas, ayuda); panel.append(panelAgente);
    [endpoint, modelo, clave].forEach(el => el.addEventListener('input', actualizaAlcance));
    notas.addEventListener('change', actualizaAlcance);
    const lienzo = document.querySelector('#stageInner');
    if (lienzo && typeof MutationObserver === 'function') new MutationObserver(actualizaAlcance).observe(lienzo, {childList: true, subtree: true});
    seleccion(false); burbuja('bot', 'Configura el servicio y el modelo; después escribe lo que quieres hacer.');
  }
  return {monta, activa: () => activo, ayuda: () => { if (panelAgente) seleccion(false); }, reinicia, detiene};
})();
