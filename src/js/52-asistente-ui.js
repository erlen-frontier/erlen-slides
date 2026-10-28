/* ==== 52-asistente-ui.js ==== */
'use strict';
/* ================= el asistente: panel, foco y guías =================
   El panel es una conversación, pero cada respuesta termina en algo que se
   puede hacer o mirar: un botón que ejecuta, un control resaltado en pantalla,
   o una lista de lo que falta con su atajo para arreglarlo. */

/* ---------- guías paso a paso ---------- */
const GUIAS_ASIS = [
  { id: 'defensa', ic: '◈', n: 'Preparar una defensa de tesis',
    d: 'De la portada al kit del día, sin saltarte nada.',
    pasos: [
      { t: 'Arranca de una plantilla', d: 'La plantilla de defensa trae la estructura completa: portada, índice, antecedentes, metodología, resultados y conclusiones.', acc: 'cmd:Nueva presentación…' },
      { t: 'Pon los datos de la portada', d: 'Título, autor, institución y fecha. Alimentan la portada y el pie.', ir: 'design' },
      { t: 'Elige tema y tipografía', d: 'Para una defensa suelen funcionar Sobrio o CambridgeUS con una serifa. La tipografía que elijas es la que verás en el PDF.', ir: 'design' },
      { t: 'Escribe el contenido', d: 'Un mensaje por diapositiva. Si el texto no cabe, no encojas la letra: cambia el acomodo a texto fluido o a dos columnas.' },
      { t: 'Mete las figuras y los datos', d: 'Gráficas desde los archivos del instrumento, micrografías con barra de escala, estructuras y montajes.' },
      { t: 'Escribe las notas y los minutos', d: 'Las notas salen en la vista de presentador; los minutos previstos alimentan la comparación del ensayo.', acc: 'notas-todas' },
      { t: 'Revisa antes de presentar', d: 'Desbordes, contraste, figuras sin pie y secciones vacías.', acc: 'revisar' },
      { t: 'Ensaya con cronómetro', d: 'Mide tu tiempo real y compáralo con el previsto.', acc: 'ensayo' },
      { t: 'Descarga el kit del día', d: 'PDF, guion, folleto, respaldo y figuras en un solo .zip.', acc: 'kit' }
    ] },
  { id: 'seminario', ic: '◐', n: 'Armar un seminario de avance',
    d: 'Corto, con resultados al frente y las preguntas previstas.',
    pasos: [
      { t: 'Empieza por el mensaje', d: 'Una diapositiva de enunciado con la conclusión que quieres que se lleven. Todo lo demás la sostiene.', acc: 'nueva', val: 'enunciado' },
      { t: 'Metodología en pasos', d: 'El diseño de pasos numerados convierte la metodología en algo que se entiende de un vistazo.', acc: 'nueva', val: 'pasos' },
      { t: 'Resultados a todo lo ancho', d: 'Las gráficas respiran cuando los márgenes se estrechan.', acc: 'nueva', val: 'ancho' },
      { t: 'Anota los pendientes', d: 'Lo que aún no tienes, anclado a su diapositiva, para no perderlo de vista.', acc: 'pendientes' },
      { t: 'Comprueba cómo se verá', d: 'Proyector desgastado, fondo del aula y visión daltónica.', acc: 'sala' }
    ] },
  { id: 'montaje', ic: '⚗', n: 'Dibujar un montaje experimental',
    d: 'De la galería de piezas al TikZ del PDF.',
    pasos: [
      { t: 'Inserta el bloque', d: 'Nace con un montaje de ejemplo: reflujo y filtración al vacío.', acc: 'montaje-nuevo' },
      { t: 'Elige tus piezas', d: 'Seis grupos con pestañas: vidrio, montaje y calor, equipo, biología, circuitos y óptica. Haz clic para añadirlas y arrástralas para colocarlas.' },
      { t: 'Únelas', d: 'Flechas para un proceso, cables rectos o en escuadra para un circuito. Los extremos se estiran arrastrándolos.' },
      { t: 'Dale color y estilo', d: 'Cuatro estilos de dibujo para todo el montaje, y por pieza su color, su nivel de líquido y su giro.', acc: 'estilo-lab', val: 'solido' },
      { t: 'Compruébalo en el PDF', d: 'Sale como TikZ real, no como imagen: se puede ampliar sin pixelarse.', acc: 'tex' }
    ] },
  { id: 'datos', ic: '⏦', n: 'Graficar datos de un instrumento',
    d: 'DRX, FTIR, UV-Vis, TGA, Raman o voltamperometría.',
    pasos: [
      { t: 'Trae el archivo', d: 'Pega las columnas o suelta el archivo: reconozco la técnica y pongo los ejes correctos.', acc: 'datos-instrumento' },
      { t: 'Ajusta lo que haga falta', d: 'Título de los ejes, series, leyenda y anchura de la gráfica.', ir: 'bloque' },
      { t: 'Añade el ajuste si lo necesitas', d: 'Regresión con incertidumbre, tamaño de cristal por Scherrer o brecha óptica por Tauc.' },
      { t: 'Ponle su pie', d: 'Una figura sin pie es una figura que el público no puede citar.' }
    ] }
];

/* ---------- estado ---------- */
function asisEstado() {
  if (!S.asis) S.asis = { hilo: [], guia: null, paso: 0, abierto: false };
  return S.asis;
}

/* ---------- el reflector ---------- */
let _focoNodo = null;
function asisEnfoca(sel, texto) {
  asisQuitaFoco();
  const el = typeof sel === 'string' ? $(sel) : sel;
  if (!el) return false;
  const r = el.getBoundingClientRect();
  if (!r.width && !r.height) return false;
  const cap = h('div', { class: 'asis-foco-cap' });
  const hueco = h('div', { class: 'asis-foco-hueco', style:
    `left:${r.left - 6}px;top:${r.top - 6}px;width:${r.width + 12}px;height:${r.height + 12}px` });
  const abajo = r.top < 140;
  const et = h('div', { class: 'asis-foco-et', style:
    `left:${clamp(r.left + r.width / 2 - 130, 10, innerWidth - 270)}px;` +
    (abajo ? `top:${r.bottom + 16}px` : `top:${Math.max(10, r.top - 62)}px`) },
    h('span', null, texto || 'Aquí está'),
    h('button', { class: 'btn btn-sm', onclick: asisQuitaFoco }, 'Ya lo vi'));
  _focoNodo = h('div', { class: 'asis-foco', onclick: asisQuitaFoco }, cap, hueco, et);
  document.body.append(_focoNodo);
  setTimeout(() => { if (_focoNodo) _focoNodo.classList.add('on'); }, 10);
  return true;
}
function asisQuitaFoco() { if (_focoNodo) { _focoNodo.remove(); _focoNodo = null; } }

/* ---------- el panel ---------- */
let _asisPanel = null, _asisHilo = null, _asisEnt = null, _asisChips = null;

function asisPanel() {
  if (_asisPanel) return _asisPanel;
  _asisHilo = h('div', { class: 'asis-hilo', role: 'log', 'aria-live': 'polite' });
  _asisChips = h('div', { class: 'asis-chips' });
  _asisEnt = h('textarea', { class: 'asis-ent', rows: 1, placeholder: 'Escribe lo que quieres hacer…',
    'aria-label': 'Pregunta o instrucción para el asistente' });
  _asisEnt.addEventListener('input', () => {
    _asisEnt.style.height = 'auto';
    _asisEnt.style.height = Math.min(120, _asisEnt.scrollHeight) + 'px';
  });
  _asisEnt.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); asisManda(_asisEnt.value); }
    if (e.key === 'Escape') { e.stopPropagation(); cierraAsistente(); }
  });
  const enviar = h('button', { class: 'btn btn-pri asis-enviar', title: 'Enviar (Intro)', onclick: () => asisManda(_asisEnt.value) }, '↑');
  _asisPanel = h('aside', { class: 'asis', id: 'asisPanel', role: 'complementary', 'aria-label': 'Asistente' },
    h('div', { class: 'asis-head' },
      h('span', { class: 'asis-tit' }, '✦ Asistente'),
      h('button', { class: 'icon-btn', title: 'Empezar de nuevo', onclick: asisLimpia }, '⟲'),
      h('button', { class: 'icon-btn', title: 'Cerrar (Ctrl+J)', onclick: cierraAsistente }, '✕')),
    _asisHilo,
    h('div', { class: 'asis-pie' }, _asisChips, h('div', { class: 'asis-caja' }, _asisEnt, enviar)));
  $('#asisRoot').append(_asisPanel);
  if (window.ERLEN_AGENTE_UI) window.ERLEN_AGENTE_UI.monta(_asisPanel);
  return _asisPanel;
}

function alternaAsistente() { asisEstado().abierto ? cierraAsistente() : abreAsistente(); }
function abreAsistente(pregunta) {
  const E = asisEstado();
  asisPanel();
  E.abierto = true;
  document.body.classList.add('con-asis');
  _asisPanel.classList.add('on');
  if (!E.hilo.length) asisBienvenida();
  asisPintaChips();
  setTimeout(() => _asisEnt.focus({ preventScroll: true }), 60);
  if (pregunta) { window.ERLEN_AGENTE_UI?.ayuda(); asisManda(pregunta); }
}
function cierraAsistente() {
  const E = asisEstado();
  E.abierto = false;
  asisQuitaFoco();
  window.ERLEN_AGENTE_UI?.detiene();
  document.body.classList.remove('con-asis');
  if (_asisPanel) _asisPanel.classList.remove('on');
}
function asisLimpia() {
  if (window.ERLEN_AGENTE_UI?.activa()) { window.ERLEN_AGENTE_UI.reinicia(); return; }
  const E = asisEstado();
  E.hilo = []; E.guia = null; E.paso = 0;
  _asisHilo.innerHTML = '';
  asisBienvenida(); asisPintaChips();
}

/* ---------- burbujas ---------- */
function asisBurbuja(quien, ...hijos) {
  const b = h('div', { class: 'asis-msg ' + quien }, ...hijos.filter(Boolean));
  _asisHilo.append(b);
  _asisHilo.scrollTop = _asisHilo.scrollHeight;
  asisEstado().hilo.push({ quien, t: b.textContent.slice(0, 200) });
  return b;
}
const asisTexto = t => h('p', null, t);

function asisBienvenida() {
  asisBurbuja('bot',
    asisTexto('Puedo explicarte cómo funciona la app, hacer cosas por ti, revisar la presentación y acompañarte paso a paso.'),
    asisTexto('Dime qué quieres hacer con tus palabras. Si prefiero preguntarte antes de tocar algo, te lo pregunto.'));
}

/* ---------- tarjeta de una acción ---------- */
function asisTarjeta(cand, comoSugerencia) {
  const a = cand.a;
  const contexto = { deck: S.deck, slide: curSlide(), bloque: S.selBlock };
  const arg = a.arg;
  let valor = cand.val;
  const cuerpo = h('div', { class: 'asis-tar' });
  cuerpo.append(h('div', { class: 'asis-tar-n' }, a.n));
  if (a.d) cuerpo.append(h('p', { class: 'asis-tar-d' }, a.d));

  /* si la acción necesita un dato y no lo dijiste, se elige aquí mismo */
  let sel = null;
  if (arg && valor == null) {
    if (arg.tipo === 'opcion') {
      const ops = arg.ops();
      sel = h('select', { class: 'field', onchange: e => { valor = e.target.value; } });
      sel.append(h('option', { value: '' }, 'Elige ' + arg.n + '…'));
      ops.forEach(o => sel.append(h('option', { value: o.v, title: o.d || '' }, o.n)));
      if (arg.pred) { sel.value = arg.pred; valor = arg.pred; }
      cuerpo.append(sel);
    } else if (arg.tipo === 'numero') {
      sel = h('input', { class: 'field', type: 'number', min: arg.min || 1, placeholder: arg.n,
        oninput: e => { valor = +e.target.value; } });
      cuerpo.append(sel);
    } else if (arg.tipo === 'color') {
      sel = h('input', { class: 'field', type: 'color', value: temaDe(S.deck).acc, oninput: e => { valor = e.target.value; } });
      valor = temaDe(S.deck).acc;
      cuerpo.append(sel);
    } else {
      sel = h('input', { class: 'field', placeholder: arg.n, oninput: e => { valor = e.target.value; } });
      cuerpo.append(sel);
    }
  }
  const fila = h('div', { class: 'asis-tar-acc' });
  fila.append(h('button', { class: 'btn btn-pri btn-sm', onclick: () => asisEjecuta(a, valor, contexto) }, comoSugerencia ? 'Hacerlo' : 'Sí, hazlo'));
  if (a.donde) fila.append(h('button', { class: 'btn btn-sm', title: a.donde,
    onclick: () => { if (a.foco && asisEnfoca(a.foco, a.donde)) return; asisBurbuja('bot', asisTexto('Lo encuentras en: ' + a.donde)); } }, 'Enséñame dónde'));
  cuerpo.append(fila);
  return cuerpo;
}

function asisEjecuta(a, valor, contexto) {
  asisQuitaFoco();
  if (contexto && (S.deck !== contexto.deck || curSlide() !== contexto.slide || S.selBlock !== contexto.bloque)) {
    asisBurbuja('bot', asisTexto('La selección cambió. Vuelve a pedir la acción para aplicarla al lugar correcto.')); return;
  }
  const bloque = S.selBlock && findBlock(S.selBlock);
  if (S.selBlock && (!bloque || bloque.slide !== curSlide())) {
    asisBurbuja('bot', asisTexto('El bloque seleccionado pertenece a otra diapositiva. Selecciona un bloque de esta diapositiva y vuelve a pedir la acción.')); return;
  }
  if (a.req && !a.req()) { asisBurbuja('bot', asisTexto('Esta acción ya no está disponible o el bloque está protegido.')); return; }
  let r = null, fallo = null;
  try { r = a.corre(valor); } catch (e) { fallo = e; }
  if (fallo) { asisBurbuja('bot', asisTexto('Lo intenté y algo se atravesó: ' + (fallo.message || fallo) + '. Puedes hacerlo a mano desde ' + (a.donde || 'el panel de la derecha') + '.')); return; }
  if (r == null) {
    asisBurbuja('bot', asisTexto(a.siNo || (a.arg
      ? 'Me falta el dato de ' + a.arg.n + ' para poder hacerlo.'
      : 'Aquí no se puede hacer eso ahora mismo. ' + (a.donde ? 'El control está en ' + a.donde + '.' : ''))));
    return;
  }
  const b = asisBurbuja('bot', asisTexto(r));
  b.append(h('div', { class: 'asis-tar-acc' },
    h('button', { class: 'btn btn-sm', onclick: () => { doUndo(); asisBurbuja('bot', asisTexto('Deshecho.')); } }, '⟲ Deshacer')));
  asisPintaChips();
}

/* ---------- responder ---------- */
function asisManda(txt) {
  const t = String(txt || '').trim();
  if (!t) return;
  _asisEnt.value = ''; _asisEnt.style.height = 'auto';
  asisBurbuja('yo', asisTexto(t));
  const E = asisEstado();
  /* dentro de una guía, «siguiente» y «ya» avanzan */
  if (E.guia && /^(siguiente|ya|listo|hecho|continua|sigue)\b/i.test(sinAcentos(t.toLowerCase()))) { asisAvanzaGuia(); return; }
  setTimeout(() => asisResponde(t), 60);
}

function asisResponde(t) {
  /* preguntas frecuentes que merecen respuesta propia */
  const n = sinAcentos(t.toLowerCase());
  if (/\b(que|cuanto|cual).*(falta|pendiente|listo|lista)\b/.test(n) || /\bque le falta\b/.test(n)) return asisRevisa();
  if (/\bguia|acompana|paso a paso|desde cero|no se por donde\b/.test(n)) return asisOfreceGuias();
  if (/\b(que puedes|que sabes|que haces|ayuda|opciones)\b/.test(n) && n.length < 40) return asisQuePuedo();

  const r = asisEntiende(t);
  if (r.tipo === 'saber') {
    const k = r.saber;
    const b = asisBurbuja('bot', h('div', { class: 'asis-saber' },
      h('div', { class: 'asis-saber-t' }, k.t, h('span', { class: 'asis-saber-g' }, k.g)),
      h('p', null, k.d),
      k.ej ? h('p', { class: 'asis-saber-ej' }, k.ej) : null));
    if (r.accion) b.append(asisTarjeta(r.accion, true));
    return;
  }
  if (r.tipo === 'accion') {
    const b = asisBurbuja('bot', asisTarjeta(r.cand, false));
    if (r.alternativas && r.alternativas.length) {
      const otras = h('div', { class: 'asis-otras' }, h('span', null, '¿O quisiste decir?'));
      r.alternativas.forEach(c => otras.append(h('button', { class: 'asis-chip', onclick: () => asisBurbuja('bot', asisTarjeta(c, true)) }, c.a.n)));
      b.append(otras);
    }
    return;
  }
  if (r.tipo === 'opciones') {
    const b = asisBurbuja('bot', asisTexto('Puede ser una de estas. ¿Cuál?'));
    r.cands.forEach(c => b.append(asisTarjeta(c, true)));
    return;
  }
  /* nada claro */
  const b = asisBurbuja('bot', asisTexto('No encontré nada que encaje con eso. Puedo hacer cosas de estos grupos: ' +
    [...new Set(ACC.map(a => a.grp))].join(', ').toLowerCase() + '.'));
  if (r.cerca && r.cerca.length) {
    const otras = h('div', { class: 'asis-otras' }, h('span', null, 'Lo más cercano:'));
    r.cerca.forEach(c => otras.append(h('button', { class: 'asis-chip', onclick: () => asisBurbuja('bot', asisTarjeta(c, true)) }, c.a.n)));
    b.append(otras);
  }
  (r.saber || []).forEach(k => b.append(h('p', { class: 'asis-saber-ej' }, k.t + ': ' + k.d.slice(0, 140) + '…')));
}

function asisQuePuedo() {
  const grupos = {};
  ACC.forEach(a => { (grupos[a.grp] = grupos[a.grp] || []).push(a); });
  const b = asisBurbuja('bot', asisTexto('Esto es lo que sé hacer. Toca cualquiera, o dímelo con tus palabras.'));
  Object.keys(grupos).forEach(g => {
    const fila = h('div', { class: 'asis-otras' }, h('span', null, g));
    grupos[g].slice(0, 6).forEach(a => fila.append(h('button', { class: 'asis-chip', onclick: () => asisBurbuja('bot', asisTarjeta({ a, val: null }, true)) }, a.n)));
    b.append(fila);
  });
}

/* ---------- revisión conversacional ---------- */
function asisRevisa() {
  const b = asisBurbuja('bot', asisTexto('Reviso el mazo entero…'));
  setTimeout(() => {
    let fallos = [];
    try { fallos = (revisaMazo() || {}).fallos || []; } catch (e) { fallos = []; }
    b.innerHTML = '';
    if (!fallos.length) {
      b.append(asisTexto('Está limpia: no encontré desbordes, ni contraste bajo, ni figuras sin pie, ni secciones vacías. Lo siguiente sería ensayarla con el cronómetro.'));
      b.append(h('div', { class: 'asis-tar-acc' }, h('button', { class: 'btn btn-sm btn-pri', onclick: () => asisEjecuta(ACC.find(a => a.id === 'ensayo')) }, 'Ensayar')));
      return;
    }
    const err = fallos.filter(f => f.grado === 'error').length;
    const avi = fallos.filter(f => f.grado === 'aviso').length;
    const sug = fallos.length - err - avi;
    b.append(asisTexto('Encontré ' + fallos.length + ': ' +
      [err ? err + ' que hay que arreglar' : null, avi ? avi + ' que conviene revisar' : null, sug ? sug + ' que se pueden mejorar' : null]
        .filter(Boolean).join(', ') + '.'));
    const lista = h('div', { class: 'asis-lista' });
    fallos.slice(0, 12).forEach(f => {
      lista.append(h('button', { class: 'asis-fallo ' + f.grado, title: f.cómo || '',
        onclick: () => { S.cur = clamp(f.i, 0, S.deck.slides.length - 1); S.selBlock = null; renderAll(); } },
        h('span', { class: 'asis-fallo-i' }, (f.i + 1) + ''),
        h('span', null, f.qué, f.cómo ? h('em', null, f.cómo) : null)));
    });
    b.append(lista);
    if (fallos.length > 12) b.append(h('p', { class: 'asis-saber-ej' }, 'Y ' + (fallos.length - 12) + ' más; la revisión completa los lista todos.'));
    b.append(h('div', { class: 'asis-tar-acc' },
      h('button', { class: 'btn btn-sm', onclick: () => openRevision() }, 'Ver la revisión completa')));
    _asisHilo.scrollTop = _asisHilo.scrollHeight;
  }, 40);
}

/* ---------- guías ---------- */
function asisOfreceGuias() {
  const b = asisBurbuja('bot', asisTexto('Te acompaño paso a paso. ¿Con cuál empezamos?'));
  GUIAS_ASIS.forEach(g => b.append(h('button', { class: 'asis-guia', onclick: () => asisArrancaGuia(g.id) },
    h('span', { class: 'asis-guia-ic' }, g.ic),
    h('span', null, h('b', null, g.n), h('em', null, g.d)))));
}
function asisArrancaGuia(id) {
  const E = asisEstado();
  E.guia = id; E.paso = 0;
  const g = GUIAS_ASIS.find(x => x.id === id);
  asisBurbuja('bot', asisTexto(g.n + ' · ' + g.pasos.length + ' pasos. Puedes salirte cuando quieras.'));
  asisPintaPaso();
}
function asisPintaPaso() {
  const E = asisEstado();
  const g = GUIAS_ASIS.find(x => x.id === E.guia);
  if (!g) return;
  if (E.paso >= g.pasos.length) {
    E.guia = null;
    asisBurbuja('bot', asisTexto('Terminamos. Eso era todo lo de «' + g.n + '».'));
    asisPintaChips();
    return;
  }
  const p = g.pasos[E.paso];
  const caja = h('div', { class: 'asis-paso' },
    h('div', { class: 'asis-paso-n' }, 'Paso ' + (E.paso + 1) + ' de ' + g.pasos.length),
    h('div', { class: 'asis-tar-n' }, p.t),
    h('p', { class: 'asis-tar-d' }, p.d));
  const fila = h('div', { class: 'asis-tar-acc' });
  let acc = p.acc && ACC.find(a => a.id === p.acc);
  if (!acc && p.acc && p.acc.indexOf('cmd:') === 0) {
    const nom = p.acc.slice(4);
    const c = comandos().find(x => x.n === nom);
    if (c) acc = { id: p.acc, n: c.n, d: c.sub || '', corre: () => c.fn() === false ? null : 'Hecho: ' + c.n.replace(/…$/, '') + '.' };
  }
  if (acc) fila.append(h('button', { class: 'btn btn-sm btn-pri', onclick: () => { asisEjecuta(acc, p.val != null ? p.val : (acc.arg && acc.arg.pred)); asisAvanzaGuia(); } }, 'Hazlo por mí'));
  else if (p.ir) fila.append(h('button', { class: 'btn btn-sm btn-pri', onclick: () => { S.tab = p.ir; renderInspector(); openDrawer(true); asisAvanzaGuia(); } }, 'Llévame ahí'));
  fila.append(h('button', { class: 'btn btn-sm', onclick: asisAvanzaGuia }, 'Ya está →'));
  fila.append(h('button', { class: 'btn btn-sm', onclick: () => { asisEstado().guia = null; asisBurbuja('bot', asisTexto('Salimos de la guía. Aquí sigo.')); asisPintaChips(); } }, 'Salir'));
  caja.append(fila);
  asisBurbuja('bot', caja);
  asisPintaChips();
}
function asisAvanzaGuia() {
  const E = asisEstado();
  if (!E.guia) return;
  E.paso++;
  asisPintaPaso();
}

/* ---------- sugerencias que cambian con lo que estás haciendo ---------- */
function asisSugerencias() {
  const E = asisEstado();
  if (E.guia) return ['Siguiente paso', 'Salir de la guía'];
  const out = [];
  const sl = curSlide();
  const f = S.selBlock && findBlock(S.selBlock);
  if (f && f.block.type === 'montaje') out.push('Ponlo en estilo sólido', 'Líquidos en azul', 'Añade un refrigerante');
  else if (f && (f.block.type === 'chart' || f.block.type === 'func')) out.push('Ponle pie a la figura', 'Ajustar el texto al espacio');
  else if (f) out.push('Ajustar el texto al espacio');
  if (S.deck.slides.length <= 2) out.push('Acompáñame paso a paso', 'Nueva diapositiva de comparación');
  out.push('¿Qué le falta a mi presentación?');
  if (!(sl.notes || '').trim()) out.push('Escribir las notas');
  out.push('Ensayar con cronómetro', '¿Qué puedes hacer?');
  return [...new Set(out)].slice(0, 5);
}
function asisPintaChips() {
  if (!_asisChips) return;
  _asisChips.innerHTML = '';
  asisSugerencias().forEach(s => _asisChips.append(h('button', { class: 'asis-chip', onclick: () => {
    if (s === 'Siguiente paso') { asisBurbuja('yo', asisTexto(s)); asisAvanzaGuia(); return; }
    if (s === 'Salir de la guía') { asisEstado().guia = null; asisBurbuja('bot', asisTexto('Salimos de la guía.')); asisPintaChips(); return; }
    asisManda(s);
  } }, s)));
}


