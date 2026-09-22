/* ==== 88-workspace.js ==== */
'use strict';
/* Herramientas locales completas en todas las ediciones. Sin venta emergente. */
const LS_BIBLIOTECA = 'erlen-slides.biblioteca.v1';
let wsVista = 'inicio';
let wsBusqueda = '';
let wsOrden = 'reciente';
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
function wsCerrar() {
  suiteUrl('editor');
  document.title = 'Presentaciones · Erlen';
  $('#workspaceRoot').hidden = true;
  $('#app').inert = false;
  document.body.classList.remove('en-inicio');
  S.prefs.sinPrimera = true; guardaPrefs(); ocultaPrimera();
  renderAll();
  $('#deckTitleInput').focus();
  return true;
}
function wsNueva(deck) {
  if (!wsConservar()) return;
  loadDeck(deck || blankDeck(), null);
  wsCerrar();
}
function wsAccion(fn) { return () => { if(wsCerrar()!==false)fn(); }; }
function wsCard(titulo, descripcion, etiqueta, acciones) {
  return h('article', {class:'ws-card'},
    h('div', {class:'ws-thumb'}, h('small', null, etiqueta), titulo),
    h('div', {class:'ws-card-body'}, h('p', null, descripcion), h('div', {class:'ws-actions'}, acciones)));
}
function wsBoton(texto, fn, principal) { return h('button', {class:'btn btn-sm' + (principal ? ' btn-pri' : ''),onclick:fn}, texto); }
function wsInicio(vista) {
  if ($('#workspaceRoot').hidden && !wsConservar()) return;
  wsVista = suiteVistaValida(vista || 'inicio');
  openDrawer(false); closeMenus();
  $('#workspaceRoot').hidden = false;
  $('#app').inert = true;
  document.body.classList.add('en-inicio');
  suiteUrl(wsVista);
  suitePinta();
}
function wsCambiar(vista) {
  wsVista = suiteVistaValida(vista); wsBusqueda = '';
  suiteUrl(wsVista); suitePinta();
}
function wsPinta() {
  const body = $('#wsContent'); if (!body) return;
  body.replaceChildren();
  if (wsVista==='servicio') { wsServicio(body); return; }
  if (wsVista==='herramientas') { wsHerramientas(body); return; }
  const plantillas=wsVista==='plantillas';
  const busqueda=h('input',{class:'field',type:'search','aria-label':plantillas?'Buscar plantillas':'Buscar presentaciones',placeholder:plantillas?'Buscar una plantilla…':'Buscar en tu biblioteca…',value:wsBusqueda});
  const orden=h('select',{class:'field','aria-label':'Ordenar presentaciones'},h('option',{value:'reciente'},'Más recientes'),h('option',{value:'nombre'},'Nombre A–Z'));
  orden.value=wsOrden;
  const grid=h('div',{class:'ws-grid'}), cuenta=h('p',{class:'ws-note',role:'status'});
  const actualizar=()=>{
    wsBusqueda=busqueda.value;wsOrden=orden.value;grid.replaceChildren();
    const query=wsBusqueda.toLocaleLowerCase('es');
    let total=0;
    if(plantillas){
      const personales=wsPlantillas().map(p=>({n:p.nombre,d:'Tu plantilla reutilizable. Guardada en este navegador.',propia:true,build:()=>deepCopy(p.deck)}));
      [...personales,...PLANTILLAS].filter(p=>(p.n+' '+p.d).toLocaleLowerCase('es').includes(query)).forEach(p=>{
        total++;grid.append(wsCard(p.n,p.d,p.propia?'Personal':'Plantilla científica',[
          wsBoton('Usar plantilla',()=>wsNueva(p.build()),true),
          p.propia ? wsBoton('Quitar',()=>{const lista=wsPlantillas(), restante=lista.filter(t=>t.nombre!==p.n);if(lsSet(LS_BIBLIOTECA,restante)){actualizar();toast('Plantilla quitada.',null,{t:'Deshacer',fn:()=>{if(lsSet(LS_BIBLIOTECA,lista))actualizar();}});}}) : null
        ]));
      });
    }else{
      const store=decksStore();
      Object.keys(store).filter(n=>n.toLocaleLowerCase('es').includes(query)).sort((a,b)=>wsOrden==='nombre'?a.localeCompare(b,'es'):store[b].when-store[a].when).forEach(n=>{
        total++;const d=store[n];grid.append(wsCard(n,`${d.deck.slides.length} ${d.deck.slides.length===1?'diapositiva':'diapositivas'} · ${fmtWhen(d.when)}`,'En este navegador',[
          wsBoton('Abrir',()=>{if(!wsConservar())return;if(cargaSegura(d.deck,n))wsCerrar();},true),
          wsBoton('Duplicar',()=>{const copia=deepCopy(d.deck);copia.meta.title=(copia.meta.title||n)+' · copia';wsNueva(copia);}),
          wsBoton('Descargar',()=>downloadFile(wsNombre(n)+'.json',JSON.stringify(d.deck,null,2),'application/json'))
        ]));
      });
    }
    cuenta.textContent=total+' '+(plantillas?(total===1?'plantilla':'plantillas'):(total===1?'presentación':'presentaciones'));
    if(!total)grid.append(h('div',{class:'ws-empty'},h('h3',null,query?'No hay coincidencias':'Aquí empieza tu próxima charla'),h('p',null,query?'Prueba con otro nombre o limpia la búsqueda.':'Crea una presentación o importa un archivo. Tu trabajo se guarda en este navegador; puedes descargarlo en cualquier momento.'),wsBoton('Nueva presentación',()=>wsNueva(),true)));
  };
  busqueda.addEventListener('input',actualizar);orden.addEventListener('change',actualizar);
  body.append(h('div',{class:'ws-section-head'},h('h2',null,plantillas?'Un buen punto de partida':'Tu biblioteca'),h('div',{class:'ws-controls'},busqueda,plantillas?null:orden)),grid,cuenta);
  if(plantillas)body.append(h('p',{class:'ws-note'},'Las plantillas piloto contienen ejemplos y datos ilustrativos. Sustitúyelos por los de tu investigación.'));
  else body.append(h('p',{class:'ws-note'},'Los archivos locales son tuyos. Borrar los datos del navegador elimina estas copias: conserva un respaldo descargado.'));
  actualizar();
  if(!plantillas&&typeof figBiblioteca==='function')figBiblioteca(body,true);
  if(!plantillas&&typeof docBiblioteca==='function')docBiblioteca(body);
  if(!plantillas&&typeof cuBiblioteca==='function')cuBiblioteca(body);
  if(!plantillas&&typeof daBiblioteca==='function')daBiblioteca(body);
}
const wsNombre = n => String(n).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,70)||'presentacion';
function wsHerramientas(body) {
  const grid=h('div',{class:'ws-grid'});
  const opciones=[
    ['Laboratorio científico','Moléculas editables, estructuras 3D y gráficas a partir de tus datos. Procesamiento en este navegador.','Gratis','Abrir laboratorio',wsAccion(openCiencia)],
    ['Copias y recuperación','Versiones automáticas, puntos de recuperación y restauración de respaldos sin reemplazar tus originales.','Incluido gratis','Abrir recuperación',wsAccion(openRecuperacion)],
    ['Preparar mi charla','Revisa contenido, tiempos y pendientes antes de presentar.','Preparación','Abrir revisión',wsAccion(openRevision)],
    ['Mi plantilla','Convierte la presentación actual en un punto de partida reutilizable. Se guarda solo en este navegador.','Biblioteca personal','Guardar plantilla',wsGuardarPlantilla],
    ['Identidad institucional','Descarga o importa tema, colores, tipografías y logotipo para mantener una identidad común.','Docentes y laboratorios','Abrir identidad',wsIdentidad],
    ['Respaldo de presentaciones','Descarga todas tus presentaciones locales en un ZIP con archivos de proyecto editables.','Tus archivos','Descargar respaldo',wsRespaldo],
    ['Recuperar mis plantillas','Importa el archivo de plantillas de tu respaldo sin sobrescribir las que ya conservas.','Respaldo personal','Importar plantillas',wsImportarPlantillas],
    ['Reporte de biblioteca','Exporta nombres, número de diapositivas y fechas de tu biblioteca local.','Organización','Descargar CSV',wsReporte],
    ['De guion a diapositivas','Pega tu índice y crea la estructura de una charla sin empezar de cero.','Creación','Pegar esquema',wsAccion(openEsquema)]
  ];
  opciones.forEach(([t,d,e,b,f])=>grid.append(wsCard(t,d,e,[wsBoton(b,f,true)])));
  body.append(h('div',{class:'ws-section-head'},h('h2',null,'Más allá de una diapositiva')),grid,
    location.protocol !== 'file:' && window.ERLEN ? h('p',null,h('a',{class:'btn',href:'erlen-slides-offline.html',download:'erlen-sin-conexion.html'},'Descargar Erlen sin conexión')) : null,h('p',{class:'ws-note'},'Todas estas herramientas locales están incluidas gratis. Los paquetes se comparten como archivos; no sincronizan equipos automáticamente.'));
}
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
  $('#inicioBtn').addEventListener('click',()=>wsInicio());
  window.addEventListener('hashchange',suiteDesdeUrl);
  $('#edicionBadge').addEventListener('click',openEdicion);
  $('#drawerClose').addEventListener('click',()=>cierraDrawer());
  pintaEdicion();
  const solicitado=new URLSearchParams(location.search).get('plantilla');
  const plantilla=solicitado && PLANTILLAS.find(p=>p.id===solicitado);
  if(plantilla){
    if(wsConservar()){loadDeck(plantilla.build(),null);S.prefs.sinPrimera=true;guardaPrefs();ocultaPrimera();toast('Ejemplo didáctico: sustituye los datos por los de tu trabajo.');}
    const url=new URL(location.href);url.searchParams.delete('plantilla');history.replaceState(null,'',url.pathname+url.search+url.hash);
    wsCerrar();
  } else suiteDesdeUrl();
}
