/* ==== 88-workspace.js ==== */
'use strict';
/* Herramientas locales completas en todas las ediciones. Sin venta emergente. */
const LS_BIBLIOTECA = 'erlen-slides.biblioteca.v1';
const wsPlantillas = () => { const lista=lsGet(LS_BIBLIOTECA,[]); return Array.isArray(lista) ? lista.filter(p=>p && typeof p.nombre==='string' && p.deck && Array.isArray(p.deck.slides)) : []; };
function wsConservar() {
  flushEdicion();
  saveInd.now();
  if (!deckEnBlanco()) {
    const store = decksStore();
    const base = S.deckName || S.deck.meta.title || 'Sin título';
    let nombre = base;
    if (!S.deckName) { let i = 2; while (Object.hasOwn(store, nombre)) nombre = base + ' (' + i++ + ')'; }
    Object.defineProperty(store, nombre, {value:{deck:deepCopy(S.deck),when:Date.now()},enumerable:true,configurable:true,writable:true});
    if (!lsSet(LS_DECKS, store)) { toast('No hay espacio para conservar la presentación. Descarga el proyecto antes de continuar.', 'warn'); return false; }
    S.deckName = nombre;
  }
  return true;
}
/* Pantalla de inicio: el componente común de la suite (src/diseno/suite-inicio.js,
   cargado tal cual por _orden.txt; docs/COHERENCIA-APPS.md §3 del portal). Aquí solo se
   declara qué muestra —ejemplos, biblioteca, recursos— y se conservan las rutas por hash
   de siempre: #suite/<vista> para el inicio y #presentaciones para el editor. */
let INICIO = null;
/* Vistas de la URL (históricas, enlazadas desde fuera) ↔ vistas del componente. */
const SUITE_VISTAS = {inicio:'inicio', biblioteca:'biblioteca', plantillas:'ejemplos', herramientas:'recursos', servicio:'acerca'};
const SUITE_RUTAS = Object.fromEntries(Object.entries(SUITE_VISTAS).map(([ruta, vista]) => [vista, ruta]));
function suiteVistaValida(v) { return Object.hasOwn(SUITE_VISTAS, v) ? v : 'inicio'; }
function suiteRuta(hash) { return hash === '#presentaciones' ? 'editor' : suiteVistaValida(String(hash || '').replace(/^#suite\/?/, '')); }
function suiteUrl(v) { const hash = v === 'editor' ? '#presentaciones' : '#suite/' + suiteVistaValida(v); if (location.hash !== hash) history.pushState(null, '', location.pathname + location.search + hash); }
/* #copy=<id> no es una vista: es una copia de la suite que llega (88e-informe.js). Se retira
   de la URL antes de decidir la vista, que queda en el inicio, y se enseña encima su vista previa. */
function suiteDesdeUrl() { const copia = copiaEnUrl(); if (!location.hash) history.replaceState(null, '', location.pathname + location.search + '#suite/inicio'); const v = suiteRuta(location.hash); v === 'editor' ? wsCerrar() : wsInicio(v); if (copia !== null) recibeCopiaSuite(copia); }
const wsAbierto = () => !!(INICIO && INICIO.abierta);
/* Lo que hace falta al volver al editor, se venga del inicio o de un enlace directo. */
function wsAlEditor() {
  suiteUrl('editor');
  S.prefs.sinPrimera = true; guardaPrefs(); ocultaPrimera();
  renderAll();
  $('#deckTitleInput').focus();
}
function wsCerrar() {
  if (wsAbierto()) INICIO.cerrar(); else wsAlEditor();
  return true;
}
function wsNueva(deck) {
  if (!wsConservar()) return;
  loadDeck(deck || blankDeck(), null);
  wsCerrar();
}
/* Recursos que trabajan sobre el editor: primero se cierra el inicio. */
function wsAccion(fn) { return () => { if (wsCerrar() !== false) fn(); }; }
function wsBoton(texto, fn, principal) { return h('button', {class:'btn btn-sm' + (principal ? ' btn-pri' : ''),onclick:fn}, texto); }
function wsInicio(vista) {
  const v = suiteVistaValida(vista || 'inicio');
  if (!wsAbierto() && !wsConservar()) return;
  INICIO.abrir(SUITE_VISTAS[v]);
  suiteUrl(v);
}
const wsCambiar = wsInicio;
/* Biblioteca: las presentaciones guardadas con nombre en este navegador, de la más reciente a la más antigua. */
function wsBiblioteca() {
  const store = decksStore();
  return Object.keys(store).sort((a, b) => store[b].when - store[a].when).map(n => {
    const d = store[n], meta = d.deck.meta || {}, total = d.deck.slides.length;
    return {
      id: n, titulo: n,
      detalle: total + ' ' + (total === 1 ? 'diapositiva' : 'diapositivas'),
      fecha: fmtWhen(d.when),
      miniatura: [meta.title, meta.subtitle].filter(Boolean).join(' · ') || n,
      abrir: () => { if (!wsConservar()) return; if (!cargaSegura(d.deck, n)) wsInicio('biblioteca'); },
      duplicar: async () => wsDuplicar(n),
      descargar: () => downloadFile(wsNombre(n) + '.json', JSON.stringify(d.deck, null, 2), 'application/json')
    };
  });
}
/* Duplicar deja la copia en la biblioteca, junto al original, sin abrirla. */
function wsDuplicar(n) {
  const store = decksStore(), d = store[n];
  if (!d) throw new Error('la presentación ya no está en este navegador.');
  const copia = deepCopy(d.deck);
  copia.meta.title = (copia.meta.title || n) + ' · copia';
  const base = n + ' · copia';
  let nombre = base, i = 2;
  while (Object.hasOwn(store, nombre)) nombre = base + ' (' + i++ + ')';
  Object.defineProperty(store, nombre, {value:{deck:copia,when:Date.now()},enumerable:true,configurable:true,writable:true});
  if (!lsSet(LS_DECKS, store)) throw new Error('no hay espacio en este navegador. Descarga un respaldo antes de continuar.');
  toast('Copia creada: «' + nombre + '».');
}
/* Los doce ejemplos (87-ejemplos.js), con su disciplina y una fórmula o idea como arte. */
const WS_ARTE = {
  calibracion: ['Química analítica', 'A = εlc'],
  cinetica: ['Cinética', 'c(t) = c₀e⁻ᵏᵗ'],
  defensa: ['Investigación', 'Pregunta → Evidencia'],
  'reunion-laboratorio': ['Laboratorio', 'Avance → Decisión'],
  'journal-club': ['Lectura crítica', 'Afirmación ↔ Evidencia'],
  'equilibrio-quimico': ['Química', 'HA ⇌ H⁺ + A⁻'],
  espectroscopia: ['Espectroscopia', 'Señal − línea base'],
  reproducibilidad: ['Análisis de datos', 'Datos → Código → Figura'],
  'diseno-experimental': ['Métodos', 'Unidad · Control · Réplica'],
  congreso: ['Comunicación', 'Un mensaje · una figura'],
  derivacion: ['Modelización', 'dc/dt = −kc'],
  'datos-abiertos': ['Ciencia abierta', 'Datos + README + LICENSE']
};
function wsEjemplos() {
  const ejemplos = EJEMPLOS.map(e => ({
    id: e.id, disciplina: (WS_ARTE[e.id] || ['Ejemplo'])[0], arte: (WS_ARTE[e.id] || [])[1] || e.n,
    titulo: e.n, descripcion: e.d + ' Datos ilustrativos.', etiqueta: 'Abrir ejemplo',
    accion: () => wsNueva(e.build())
  }));
  const personales = wsPlantillas().map((p, i) => ({
    id: 'personal-' + i, disciplina: 'Personal', arte: 'Plantilla personal', titulo: p.nombre,
    descripcion: 'Tu plantilla reutilizable. Guardada en este navegador.', etiqueta: 'Usar plantilla',
    accion: () => wsNueva(deepCopy(p.deck))
  }));
  return [...ejemplos, ...personales];
}
/* Las plantillas personales se usan o se quitan aquí (el componente no tiene «Quitar»). */
function wsMisPlantillas() {
  const lista = h('div');
  const pinta = () => {
    lista.replaceChildren();
    const todas = wsPlantillas();
    if (!todas.length) { lista.append(h('p', {class:'hint'}, 'Todavía no tienes plantillas personales. Guarda la presentación actual con «Mi plantilla» o recupéralas de un respaldo.')); return; }
    todas.forEach(p => lista.append(h('div', {class:'deck-row'},
      h('div', {class:'dname'}, h('b', null, p.nombre), h('span', {class:'dmeta'}, p.deck.slides.length + ' ' + (p.deck.slides.length === 1 ? 'diapositiva' : 'diapositivas'))),
      wsBoton('Usar plantilla', () => { closeModal(); wsNueva(deepCopy(p.deck)); }, true),
      h('button', {class:'btn btn-sm', 'aria-label':'Quitar «' + p.nombre + '»', onclick:() => {
        const antes = wsPlantillas(), restante = antes.filter(t => t.nombre !== p.nombre);
        if (!lsSet(LS_BIBLIOTECA, restante)) { toast('No se pudo quitar la plantilla.', 'warn'); return; }
        pinta(); INICIO?.actualizar();
        toast('Plantilla quitada.', null, {t:'Deshacer', fn:() => { if (lsSet(LS_BIBLIOTECA, antes)) { pinta(); INICIO?.actualizar(); } }});
      }}, 'Quitar'))));
  };
  pinta();
  openModal({title:'Mis plantillas personales', size:'modal-sm', body:h('div', null, lista, h('p', {class:'hint'}, 'Se guardan solo en este navegador. «Respaldo de presentaciones» las incluye en el ZIP.'))});
}
function wsRecursos() {
  const recursos = [
    ['Laboratorio científico', 'Moléculas editables, estructuras 3D y gráficas a partir de tus datos. Procesamiento en este navegador.', 'Abrir laboratorio', wsAccion(openCiencia)],
    ['Copias y recuperación', 'Versiones automáticas, puntos de recuperación y restauración de respaldos sin reemplazar tus originales.', 'Abrir recuperación', wsAccion(openRecuperacion)],
    ['Preparar mi charla', 'Revisa contenido, tiempos y pendientes antes de presentar.', 'Abrir revisión', wsAccion(openRevision)],
    ['Mi plantilla', 'Convierte la presentación actual en un punto de partida reutilizable. Se guarda solo en este navegador.', 'Guardar plantilla', wsGuardarPlantilla],
    ['Mis plantillas personales', 'Usa o quita las plantillas que guardaste en este navegador.', 'Gestionar plantillas', wsMisPlantillas],
    ['Identidad institucional', 'Descarga o importa tema, colores, tipografías y logotipo para mantener una identidad común.', 'Abrir identidad', wsIdentidad],
    ['Respaldo de presentaciones', 'Descarga todas tus presentaciones locales en un ZIP con archivos de proyecto editables.', 'Descargar respaldo', wsRespaldo],
    ['Recuperar mis plantillas', 'Importa el archivo de plantillas de tu respaldo sin sobrescribir las que ya conservas.', 'Importar plantillas', wsImportarPlantillas],
    ['Reporte de biblioteca', 'Exporta nombres, número de diapositivas y fechas de tu biblioteca local.', 'Descargar CSV', wsReporte],
    ['De guion a diapositivas', 'Pega tu índice y crea la estructura de una charla sin empezar de cero.', 'Pegar esquema', wsAccion(openEsquema)]
  ];
  /* La versión sin conexión solo existe junto a la web: el archivo suelto ya lo es. */
  if (location.protocol !== 'file:' && window.ERLEN) recursos.push(['Erlen Slides sin conexión', 'Un solo archivo HTML con el editor completo para trabajar sin red. Los paquetes se comparten como archivos; no sincronizan equipos.', 'Descargar sin conexión', () => {
    const a = h('a', {href:'erlen-slides-offline.html', download:'erlen-sin-conexion.html', hidden:true});
    document.body.append(a); a.click(); a.remove();
  }]);
  return recursos.map(([titulo, texto, etiqueta, accion]) => ({titulo, texto, etiqueta, accion}));
}
const wsNombre = n => String(n).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,70)||'presentacion';
function wsImportarPlantillas() {
  const aviso=h('p',{class:'hint',role:'status'});
  const archivo=h('input',{class:'field',type:'file',accept:'.json,application/json','aria-label':'Archivo de plantillas personales'});
  archivo.addEventListener('change',async()=>{
    const f=archivo.files[0];if(!f)return;
    try {
      if(f.size>50*1048576)throw new Error('El respaldo supera 50 MB. Importa las presentaciones de forma individual.');
      const p=JSON.parse(await f.text());
      if(p.formato!=='erlen-plantillas-v1'||!Array.isArray(p.plantillas))throw new Error('Selecciona plantillas-personales.json de un respaldo de Erlen.');
      const lista=wsPlantillas(),nombres=new Set(lista.map(x=>x.nombre));
      for(const t of p.plantillas){
        if(!t||typeof t.nombre!=='string'||!t.nombre.trim())throw new Error('Una plantilla no tiene un nombre válido.');
        const r=saneaDeck(t.deck);if(!r.deck)throw new Error('Una plantilla no contiene una presentación válida.');
        const base=t.nombre.trim().slice(0,120);let nombre=base,i=2;
        while(nombres.has(nombre))nombre=base+' ('+(i++)+')';
        nombres.add(nombre);lista.push({nombre,deck:r.deck,when:Date.now()});
      }
      if(!lsSet(LS_BIBLIOTECA,lista))throw new Error('No hay espacio suficiente en este navegador.');
      aviso.textContent=p.plantillas.length+' plantillas recuperadas.';
    }catch(e){aviso.textContent=e.message||'No se pudo abrir el respaldo.';}
  });
  openModal({title:'Recuperar plantillas personales',size:'modal-sm',body:h('div',null,h('label',null,'Archivo del respaldo',archivo),aviso)});
}
function wsGuardarPlantilla() {
  const nombre=h('input',{class:'field','aria-label':'Nombre de la plantilla',value:S.deck.meta.title||'',maxlength:120});
  const aviso=h('p',{class:'hint',role:'status'});
  openModal({title:'Guardar como plantilla personal',size:'modal-sm',body:h('div',null,h('label',null,'Nombre de la plantilla',nombre),h('p',{class:'hint'},'Incluye el contenido de la presentación actual. Elimina datos privados antes de compartirla.'),aviso),foot:[wsBoton('Guardar plantilla',()=>{
    const n=nombre.value.trim();if(!n){aviso.textContent='Escribe un nombre.';return;}
    const lista=wsPlantillas();if(lista.some(p=>p.nombre===n)){aviso.textContent='Ese nombre ya existe. Elige otro para conservar ambas.';return;}
    lista.push({nombre:n,deck:deepCopy(S.deck),when:Date.now()});
    if(!lsSet(LS_BIBLIOTECA,lista)){aviso.textContent='No hay espacio. Descarga un respaldo antes de continuar.';return;}
    closeModal();wsCambiar('plantillas');toast('Plantilla guardada.');
  },true)]});
}
function wsEstiloSeguro(paquete) {
  if(!paquete || paquete.formato!=='erlen-identidad-v1' || !paquete.estilo || typeof paquete.estilo!=='object' || Array.isArray(paquete.estilo)) throw new Error('El archivo no es un paquete de identidad de Erlen.');
  const estilo={};
  CAMPOS_ESTILO.filter(k=>!['authors','short','notas'].includes(k)).forEach(k=>{
    if(Object.hasOwn(paquete.estilo,k)) estilo[k]=deepCopy(paquete.estilo[k]);
  });
  if(estilo.logo && (typeof estilo.logo!=='string' || !/^data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/=\s]+$/.test(estilo.logo))) throw new Error('El logotipo del paquete debe ser una imagen PNG, JPEG o WebP incrustada.');
  return estilo;
}
function wsIdentidad() {
  const aviso=h('p',{class:'hint',role:'status'});
  const archivo=h('input',{type:'file',accept:'.json,application/json','aria-label':'Importar identidad institucional',class:'field'});
  archivo.addEventListener('change',async()=>{
    const f=archivo.files[0];if(!f)return;
    try{
      if(f.size>2*1048576)throw new Error('El paquete debe pesar menos de 2 MB.');
      const p=JSON.parse(await f.text());
      const recibido=wsEstiloSeguro(p);
      const deck=blankDeck();Object.assign(deck.meta,recibido);
      const r=saneaDeck(deck);if(!r.deck)throw new Error('La identidad no es válida.');
      const estilo={};Object.keys(recibido).forEach(k=>{if(r.deck.meta[k]!=null)estilo[k]=r.deck.meta[k];});
      aplicaEstilo(estilo);aviso.textContent='Identidad aplicada a la presentación actual.';
    }catch(e){aviso.textContent=e.message||'No se pudo abrir el paquete.';}
  });
  openModal({title:'Identidad institucional',size:'modal-sm',body:h('div',null,
    h('p',null,'Un mismo acabado para clases, seminarios y defensas. El paquete contiene la identidad de la presentación actual, sin sus diapositivas ni autores.'),
    h('label',null,'Importar un paquete de identidad',archivo),aviso),foot:[wsBoton('Descargar identidad',async()=>{
      const estilo=estiloActual();delete estilo.authors;delete estilo.short;delete estilo.notas;
      try { wsEstiloSeguro({formato:'erlen-identidad-v1',estilo}); } catch(e) { aviso.textContent='Usa un logotipo PNG, JPEG o WebP incrustado para distribuir la identidad.'; return; }
      downloadFile('erlen-identidad.json',JSON.stringify({formato:'erlen-identidad-v1',estilo},null,2),'application/json');
    },true)]});
}
async function wsRespaldo() {
  if(!wsConservar())return;
  const store=decksStore(),nombres=Object.keys(store);
  if(!nombres.length){toast('Crea o importa una presentación antes de respaldar.');return;}
  try{
    const archivos=nombres.map((n,i)=>({nombre:`${i+1}-${wsNombre(n)}.json`,datos:JSON.stringify(store[n].deck,null,2)}));
    archivos.push({nombre:'plantillas-personales.json',datos:JSON.stringify({formato:'erlen-plantillas-v1',plantillas:wsPlantillas()},null,2)});
    archivos.push({nombre:'LEEME.txt',datos:'Erlen: importa cada archivo de presentación desde Inicio → Importar proyecto. El archivo plantillas-personales.json es un respaldo de tus plantillas, no una presentación.'});
    downloadFile('erlen-biblioteca.zip',await armaZip(archivos),'application/zip');
  }catch(_){toast('No se pudo crear el respaldo. Descarga los proyectos individualmente.','warn');}
}
function wsReporte() {
  const store=decksStore();
  const csv=v=>'"'+String(v).replace(/^[=+@\-\t\r]/,"'$&").replace(/"/g,'""')+'"';
  const filas=[['Nombre','Diapositivas','Actualizado'],...Object.entries(store).map(([n,v])=>[n,v.deck.slides.length,new Date(v.when).toISOString()])];
  downloadFile('erlen-biblioteca.csv','\ufeff'+filas.map(f=>f.map(csv).join(',')).join('\r\n'),'text/csv;charset=utf-8');
}
function wsServicio(body) {
 body.append(h('h2',null,'Erlen Slides · Presentaciones científicas'),h('p',{class:'ws-lead'},'Editor científico libre, versión '+edVersion()+'. Tus presentaciones se guardan en este navegador.'),h('p',null,'Descarga copias JSON para conservar tu trabajo o compartirlo. Esta edición no incluye cuentas ni sincronización entre dispositivos.'),h('p',null,h('a',{href:ERLEN_SOURCE_URL,target:'_blank',rel:'noopener'},'Código fuente · AGPLv3')),h('p',null,h('a',{href:ERLEN_SOURCE_URL+'/blob/main/docs/uso.md',target:'_blank',rel:'noopener'},'Manual, ejemplos y límites conocidos')));
}
function wsInit() {
  INICIO = erlenInicio($('#inicioRoot'), {
    nombre: 'Erlen Slides', corto: 'SLIDES', objetos: 'presentaciones',
    marca: $('#inicioBtn .marca-svg').outerHTML,
    estado: 'Disponible · beta', subtitulo: 'Presentaciones científicas',
    eyebrow: 'ARCHIVO CIENTÍFICO · ERLEN SLIDES', titulo: ['Presentaciones ', 'científicas'],
    lead: 'Crea, explora y conserva historias visuales para comunicar datos, métodos y resultados con precisión.',
    nuevo: {etiqueta:'Nueva presentación', detalle:'Lienzo científico en blanco', accion:() => wsNueva()},
    importar: {etiqueta:'Importar proyecto', accion:importJSON},
    continuar: () => deckEnBlanco() ? null : {etiqueta:'Continuar presentación', accion:() => {}},
    get ejemplos() { return wsEjemplos(); },
    biblioteca: {listar:wsBiblioteca, vacio:{titulo:'Aquí empieza tu próxima charla', texto:'Crea una presentación o importa un archivo. Tu trabajo se guarda en este navegador; puedes descargarlo en cualquier momento.'}},
    recursos: wsRecursos(),
    acerca: {texto:'Editor científico libre, versión ' + edVersion() + '. Tus presentaciones se guardan en este navegador: descarga copias JSON para conservar tu trabajo o compartirlo. Esta edición no incluye cuentas ni sincronización entre dispositivos. Software libre con licencia AGPLv3.',
      enlaces:[{etiqueta:'Código fuente · AGPLv3', url:ERLEN_SOURCE_URL}, {etiqueta:'Manual, ejemplos y límites conocidos', url:ERLEN_SOURCE_URL + '/blob/main/docs/uso.md'}]},
    fuente: {url:ERLEN_SOURCE_URL, licencia:'AGPLv3'},
    editor: $('#app'),
    menuSuite: host => erlenSuiteNavigation(host, 'slides'),
    alAbrir: () => { openDrawer(false); closeMenus(); },
    alCerrar: wsAlEditor
  });
  /* La navegación interna del componente no toca la URL: se refleja aquí, tras cada clic. */
  INICIO.elemento.addEventListener('click', () => { if (INICIO.abierta) suiteUrl(SUITE_RUTAS[INICIO.vista]); });
  $('#inicioBtn').addEventListener('click',()=>wsInicio());
  window.addEventListener('hashchange',suiteDesdeUrl);
  $('#edicionBadge').addEventListener('click',openEdicion);
  $('#drawerClose').addEventListener('click',()=>cierraDrawer());
  pintaEdicion();
  /* ?plantilla=<id>: el portal enlaza así los ejemplos. Se consume una vez y se retira de la URL. */
  const params=new URLSearchParams(location.search);
  const solicitado=params.get('plantilla');
  const plantilla=solicitado && PLANTILLAS.find(p=>p.id===solicitado);
  /* ?abrir=<token>: lo pone el servidor MCP al abrir un proyecto en el editor. También se retira
     antes de nada, para que recargar la página no vuelva a pedir un enlace que ya se gastó. */
  const abrir=params.get('abrir');
  if(params.has('plantilla')||params.has('abrir')){const url=new URL(location.href);url.searchParams.delete('plantilla');url.searchParams.delete('abrir');history.replaceState(null,'',url.pathname+url.search+url.hash);}
  if(plantilla){
    if(wsConservar()){loadDeck(plantilla.build(),null);toast('Ejemplo didáctico: sustituye los datos por los de tu trabajo.');}
    wsCerrar();
  } else {
    suiteDesdeUrl();
    if(solicitado&&wsAbierto())INICIO.avisar('No existe el ejemplo «'+solicitado.slice(0,60)+'». Elige un punto de partida en la colección de inicio.',{error:true});
  }
  if(abrir!==null)wsAbrirDelAsistente(abrir);
}

/* ---------- un proyecto que manda el asistente ----------
   La herramienta abrir_en_editor del servidor MCP (mcp/extensiones/editor.mjs) sirve esta
   misma app en 127.0.0.1 y deja preparado un proyecto detrás de una clave de un solo uso.
   Se pide al mismo origen, con ruta relativa; se enseña qué llega y solo se abre si la
   persona lo confirma. Fuera de ese servidor (la suite en /slides/, npm start) la clave no
   existe y se dice, sin tocar nada. */
const MCP_ABRIR = 'mcp/abrir/';
function wsRechazoAsistente(texto) {
  openModal({ title: 'No se abrió la presentación del asistente', size: 'modal-sm', body: h('div', null,
    h('p', null, texto),
    h('p', { class: 'hint' }, 'No se creó ni se cambió nada. El archivo sigue en la carpeta del asistente; también puedes abrirlo con «Importar proyecto».')),
    foot: [h('button', { class: 'btn btn-pri', onclick: closeModal }, 'Entendido')] });
}
async function wsAbrirDelAsistente(clave) {
  /* La clave solo se usa como un segmento de la ruta: nada de barras, puntos ni escapes. */
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(clave)) { wsRechazoAsistente('El enlace está incompleto o mal copiado. Pide al asistente que vuelva a abrir la presentación en el editor.'); return null; }
  let res, datos;
  try { res = await fetch(MCP_ABRIR + clave, { cache: 'no-store', credentials: 'same-origin' }); }
  catch (e) { wsRechazoAsistente('No se pudo contactar con el asistente: el servidor que abrió esta página ya no está en marcha. Pide que vuelva a abrir la presentación en el editor.'); return null; }
  if (!res.ok) {
    wsRechazoAsistente(res.status === 404 || res.status === 410
      ? 'El enlace caducó o ya se usó: sirve una sola vez y durante unos minutos. Pide al asistente que vuelva a abrir la presentación en el editor.'
      : 'El servidor del asistente respondió con un error (' + res.status + ').');
    return null;
  }
  try { datos = await res.json(); } catch (e) { wsRechazoAsistente('Lo que llegó no es un JSON válido.'); return null; }
  if (!datos || datos.formato !== 'erlen-mcp-abrir-v1' || !datos.deck || typeof datos.deck !== 'object') { wsRechazoAsistente('Lo que llegó no es un proyecto de Erlen Slides.'); return null; }
  const r = saneaDeck(datos.deck);
  if (r.error) { wsRechazoAsistente('El proyecto no se pudo leer: ' + r.error); return null; }
  wsVistaAsistente(r.deck, String(datos.archivo || 'proyecto.json').slice(0, 200), r.avisos);
  return r.deck;
}
function wsVistaAsistente(deck, archivo, avisos) {
  const titulo = String(deck.meta.title || '').trim(), base = titulo || archivo.replace(/\.json$/i, ''), nombre = infNombreLibre(base);
  const lista = h('div', { class: 'es-prev' });
  deck.slides.forEach((sl, i) => lista.append(h('div', { class: 'es-fila' }, h('span', { class: 'es-n' }, String(i + 1)),
    h('span', { class: 'es-t' }, (sl.layout === 'title' ? titulo || 'Portada' : sl.title || 'Sin título').replace(/\\\$/g, '$')))));
  const total = deck.slides.length;
  openModal({ title: 'Abrir la presentación del asistente', size: 'modal-lg', body: h('div', { class: 'inf-preview' },
    h('p', null, 'El asistente envió «' + archivo + '», con ' + total + (total === 1 ? ' diapositiva' : ' diapositivas') + '. Se abrirá en el editor y quedará en tu biblioteca como «' + nombre + '». La presentación que tienes abierta se conserva.'),
    lista,
    avisos.length ? h('div', null, h('span', { class: 'sublabel', style: 'margin:10px 0 5px' }, 'Ajustes al leerlo'),
      h('ul', { class: 'av-lista' }, Array.from(new Set(avisos)).slice(0, 14).map(a => h('li', null, a)))) : null,
    h('p', { class: 'hint' }, 'Esta es una copia independiente del archivo: lo que cambies aquí se guarda en este navegador, no en «' + archivo + '». Para devolver los cambios a la carpeta del asistente, usa Exportar → Proyecto (.json) y guárdalo en esa carpeta.')),
    foot: [h('button', { class: 'btn', onclick: closeModal }, 'Cancelar'),
      h('button', { class: 'btn btn-pri', onclick: () => wsAbreAsistente(deck, base) }, 'Abrir en el editor')] });
}
/* Como una copia de DoE: primero la biblioteca (si no cabe, no se abre nada) y después el editor.
   El nombre se elige después de conservar la abierta, que puede haber ocupado el propuesto. */
function wsAbreAsistente(deck, base) {
  if (!wsConservar()) return false;
  const store = decksStore(), nombre = infNombreLibre(base);
  Object.defineProperty(store, nombre, { value: { deck: deepCopy(deck), when: Date.now() }, enumerable: true, configurable: true, writable: true });
  if (!lsSet(LS_DECKS, store)) { toast('No hay espacio en este navegador para la presentación. Descarga un respaldo y libera espacio; no se abrió nada.', 'warn'); return false; }
  closeModal();
  if (!cargaSegura(deck, nombre)) return false;
  wsCerrar();
  INICIO?.actualizar?.();
  return true;
}
