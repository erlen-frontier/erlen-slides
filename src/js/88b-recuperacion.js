/* ==== 88b-recuperacion.js ==== */
'use strict';
/* Historial local separado del autoguardado. Ningún documento sale a la red. */
const RECUP = {db:null, cola:Promise.resolve(), aviso:false, error:'', intervalo:5*60*1000, maxVersiones:20, maxBytes:32*1048576};
function recDB() {
  if (RECUP.db) return RECUP.db;
  RECUP.db = new Promise((resolve,reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('Sin almacenamiento de recuperación')); return; }
    const req = indexedDB.open('erlen-slides-recuperacion-v1',1);
    req.onupgradeneeded = () => req.result.createObjectStore('copias',{keyPath:'id',autoIncrement:true});
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('Cierra otras pestañas de Tabula para activar las copias'));
    req.onsuccess = () => {const db=req.result;db.onversionchange=()=>{db.close();RECUP.db=null;};resolve(db);};
  }).catch(e=>{RECUP.db=null;throw e;});
  return RECUP.db;
}
function recClave(nombre) {
  if (nombre) return 'nombre:'+nombre;
  if (!S.respaldoId) S.respaldoId = 'borrador:'+uid();
  return S.respaldoId;
}
function recError() {
  RECUP.error='No se pudo actualizar el historial de recuperación. Descarga un respaldo para conservar tu trabajo.';
  if (!RECUP.aviso) {RECUP.aviso=true;toast(RECUP.error,'warn');}
}
function recLista() {
  return recDB().then(db=>new Promise((resolve,reject)=>{
    const tx=db.transaction('copias','readonly'),r=tx.objectStore('copias').getAll();
    tx.oncomplete=()=>resolve(r.result.sort((a,b)=>b.fecha-a.fecha || b.id-a.id));
    tx.onabort=()=>reject(tx.error || new Error('No se pudo leer el historial'));
  }));
}
/* Decide la retención antes de escribir: la transacción elimina y añade juntas,
   por lo que un fallo de cuota conserva íntegro el historial anterior. */
function recPlan(lista,copia,fijar=false) {
  const propias=lista.filter(x=>x.clave===copia.clave).sort((a,b)=>b.fecha-a.fecha || b.id-a.id);
  const igual=propias[0]?.datos===copia.datos;
  if (igual && (!fijar || propias[0].fijada)) return null;
  const borrar=new Set();
  if (igual) borrar.add(propias[0].id);
  if (!fijar && propias.length>=2 && !propias[0].fijada && copia.fecha-propias[0].inicio<RECUP.intervalo) {
    copia.inicio=propias[0].inicio;borrar.add(propias[0].id);
  }
  for (const x of propias.filter(x=>!borrar.has(x.id)).slice(RECUP.maxVersiones-1)) borrar.add(x.id);
  let bytes=lista.filter(x=>!borrar.has(x.id)).reduce((n,x)=>n+x.bytes,0)+copia.bytes;
  // Bajo presión se retiran versiones antiguas, pero se conserva una por presentación.
  const restantes=new Map();
  for (const x of lista.filter(x=>!borrar.has(x.id))) restantes.set(x.clave,(restantes.get(x.clave)||0)+1);
  restantes.set(copia.clave,(restantes.get(copia.clave)||0)+1);
  for (const x of [...lista].sort((a,b)=>a.fecha-b.fecha || a.id-b.id)) {
    if (bytes<=RECUP.maxBytes) break;
    if (borrar.has(x.id) || restantes.get(x.clave)<=1) continue;
    borrar.add(x.id);bytes-=x.bytes;restantes.set(x.clave,restantes.get(x.clave)-1);
  }
  if (bytes>RECUP.maxBytes) throw new Error('No hay espacio suficiente en el historial');
  return {copia,borrar:[...borrar]};
}
function recGuardar(deck,nombre,opciones={}) {
  let copia;
  try {
    if (!deck?.slides?.length) return Promise.resolve(false);
    const datos=JSON.stringify(deck),fecha=Date.now();
    copia={clave:opciones.clave || recClave(nombre),nombre:nombre || deck.meta?.title || 'Sin nombre',titulo:String(deck.meta?.title || 'Sin título').slice(0,150),datos,
      fecha,inicio:fecha,bytes:new TextEncoder().encode(datos).byteLength,fijada:!!opciones.fijar};
    if(copia.bytes>RECUP.maxBytes)throw new Error('Presentación demasiado grande');
  } catch {recError();return Promise.resolve(false);}
  const trabajo=RECUP.cola.then(()=>recDB()).then(db=>new Promise((resolve,reject)=>{
    const tx=db.transaction('copias','readwrite'),store=tx.objectStore('copias'),req=store.getAll();let fallo;
    req.onsuccess=()=>{try {if(opciones.soloInicial && req.result.some(x=>x.clave===copia.clave))return;const plan=recPlan(req.result,copia,opciones.fijar);if(plan){for(const id of plan.borrar)store.delete(id);store.add(plan.copia);}}catch(e){fallo=e;tx.abort();}};
    tx.oncomplete=()=>{RECUP.error='';resolve(true);};
    tx.onabort=()=>reject(fallo || tx.error || new Error('No se guardó la copia'));
  })).catch(()=>{recError();return false;});
  RECUP.cola=trabajo;
  return trabajo;
}
/* La eliminación se encola detrás de las copias pendientes de esta pestaña. */
function recEliminar(clave) {
  const trabajo=RECUP.cola.then(()=>recDB()).then(db=>new Promise((resolve,reject)=>{
    const tx=db.transaction('copias','readwrite'),store=tx.objectStore('copias'),req=store.openCursor();
    req.onsuccess=()=>{const cursor=req.result;if(cursor){if(cursor.value.clave===clave)cursor.delete();cursor.continue();}};
    tx.oncomplete=()=>resolve();
    tx.onabort=()=>reject(tx.error || new Error('No se pudo eliminar el historial'));
  }));
  RECUP.cola=trabajo.catch(()=>{});
  return trabajo;
}
function recActual(fijar=false) {
  try {
    let deck=S.deck;
    if (typeof rawEl!=='undefined' && rawEl?.isConnected) {
      deck=deepCopy(S.deck);
      const texto=rawEl.innerText.replace(/\n$/,'');
      if (typeof rawFormato!=='undefined' && rawFormato && findBlock(rawFormato.id,deck)?.block) {
        const copia={...rawFormato,formatoTexto:deepCopy(rawFormato.formatoTexto || [])};
        cambiaTextoFormateado(copia,texto);
        const bloque=findBlock(rawFormato.id,deck).block;
        bloque.text=copia.text;
        if(copia.formatoTexto?.length)bloque.formatoTexto=copia.formatoTexto;else delete bloque.formatoTexto;
      } else setRaw(rawEl.dataset.ek,texto,deck,S.cur);
    }
    return recGuardar(deck,S.deckName,{fijar});
  } catch {recError();return Promise.resolve(false);}
}
function recNombreLibre(store,nombre) {
  const base=String(nombre || 'Presentación').slice(0,90)+' (recuperada)';
  let n=base,i=2;while(Object.hasOwn(store,n))n=base+' '+i++;
  return n;
}
function recValidaDeck(deck) {
  if (!deck || typeof deck!=='object' || !Array.isArray(deck.slides) || !deck.slides.length) throw new Error('Hay una presentación inválida en el respaldo.');
  const r=saneaDeck(deck);
  if(r.error || r.avisos.length) throw new Error('Una presentación requiere ajustes. Descárgala e impórtala individualmente para revisar los cambios.');
  return r.deck;
}
/* Validación completa antes de la única escritura: nunca una importación parcial. */
function recMezcla(store,proyectos) {
  if (!Array.isArray(proyectos) || !proyectos.length || proyectos.length>200) throw new Error('El respaldo debe tener de 1 a 200 presentaciones.');
  const copia=JSON.parse(JSON.stringify(store)),nombres=[];
  for(const p of proyectos) {
    if(typeof p?.nombre!=='string' || p.nombre.length>200) throw new Error('Nombre de presentación inválido.');
    const deck=recValidaDeck(p.deck),nombre=recNombreLibre(copia,p.nombre);
    Object.defineProperty(copia,nombre,{value:{deck,when:Date.now()},enumerable:true,writable:true,configurable:true});nombres.push(nombre);
  }
  return {store:copia,nombres};
}
function recImporta(proyectos) {
  const mezcla=recMezcla(decksStore(),proyectos);
  if(!lsSet(LS_DECKS,mezcla.store))throw new Error('No hay espacio en la biblioteca. El respaldo sigue intacto; descarga las presentaciones individualmente desde el historial.');
  for(const n of mezcla.nombres) recGuardar(mezcla.store[n].deck,n);
  return mezcla.nombres;
}
async function recExportaBiblioteca() {
  flushEdicion();saveInd.now();
  const proyectos=Object.entries(decksStore()).map(([nombre,v])=>({nombre,deck:v.deck}));
  if (!S.deckName || !proyectos.some(p=>p.nombre===S.deckName && JSON.stringify(p.deck)===JSON.stringify(S.deck))) proyectos.push({nombre:S.deckName || S.deck.meta.title || 'Sin nombre',deck:deepCopy(S.deck)});
  const paquete={formato:'erlen-respaldo-v1',creado:new Date().toISOString(),proyectos};
  const datos=JSON.stringify(paquete);
  if(proyectos.length>200 || new TextEncoder().encode(datos).byteLength>RECUP.maxBytes) {toast('La biblioteca supera el límite de este respaldo (200 presentaciones o 32 MB). Descarga el ZIP desde Inicio → Herramientas o los proyectos individuales.','warn');return;}
  await downloadFile('erlen-respaldo-'+new Date().toISOString().slice(0,10)+'.json',datos,'application/json');
}
function openRecuperacion() {
  flushEdicion();
  const lista=h('div',{'aria-live':'polite'},'Leyendo copias…');
  const estado=h('p',{class:'hint',role:'status'});
  const archivo=h('input',{type:'file',accept:'.json,application/json','aria-label':'Importar respaldo de biblioteca',class:'field'});
  const aviso=h('p',{class:'hint',role:'status'});let preparado=null;
  const importar=h('button',{class:'btn',disabled:true,onclick:()=>{
    try {const nombres=recImporta(preparado);aviso.textContent=`Restauradas ${nombres.length} presentaciones como copias. Las anteriores no cambiaron.`;preparado=null;importar.disabled=true;actualizar();}
    catch(e){aviso.textContent=e.message;}
  }},'Restaurar respaldo como copias');
  archivo.addEventListener('change',async()=>{
    preparado=null;importar.disabled=true;const f=archivo.files[0];if(!f)return;
    try {
      if(f.size>RECUP.maxBytes)throw new Error('Este respaldo supera 32 MB. Importa sus proyectos individualmente.');
      const p=JSON.parse(await f.text());if(p.formato!=='erlen-respaldo-v1')throw new Error('Elige un respaldo de biblioteca compatible. Los proyectos individuales se importan desde Archivo.');
      recMezcla(decksStore(),p.proyectos);preparado=p.proyectos;importar.disabled=false;
      aviso.textContent=`${p.proyectos.length} presentaciones listas. Se crearán copias sin reemplazar tu biblioteca.`;
    }catch(e){aviso.textContent=e instanceof SyntaxError?'El archivo está incompleto o no es JSON válido.':e.message;}
  });
  async function actualizar() {
    try {
      await RECUP.cola;const copias=await recLista();lista.replaceChildren();
      estado.textContent=RECUP.error || `${copias.length} versiones conservadas · ${(copias.reduce((n,c)=>n+c.bytes,0)/1048576).toFixed(1)} MB de 32 MB.`;
      if(!copias.length)lista.append(h('p',null,'Aún no hay versiones. Se crean automáticamente mientras trabajas.'));
      const historiales=new Set();
      for(const c of copias)lista.append(h('div',{class:'deck-row',style:'flex-wrap:wrap;gap:8px'},
        h('div',{class:'dname'},h('b',null,c.nombre),h('span',{class:'dmeta'},new Date(c.fecha).toLocaleString()+(c.fijada?' · Punto guardado':'')),h('span',{class:'dmeta'},c.titulo || c.nombre)),
        h('button',{class:'btn btn-sm',onclick:()=>{
          try {const nombres=recImporta([{nombre:c.nombre,deck:JSON.parse(c.datos)}]);aviso.textContent='Copia creada: '+nombres[0]+'. Ábrela desde Archivo. Tu presentación actual sigue intacta.';actualizar();}
          catch(e){aviso.textContent=e.message;}
        }},'Restaurar como copia'),
        h('button',{class:'btn btn-sm',onclick:()=>downloadFile('erlen-version-'+c.id+'.json',c.datos,'application/json')},'Descargar versión'),
        !historiales.has(c.clave) && (historiales.add(c.clave),h('button',{class:'btn btn-sm btn-danger',onclick:async()=>{
          if(!confirm('¿Eliminar todas las versiones de «'+c.nombre+'»? No se puede deshacer. La biblioteca y el documento abierto seguirán intactos. Si sigues editándolo o vuelve a abrirse desde la biblioteca, se crearán nuevas copias.'))return;
          try {await recEliminar(c.clave);aviso.textContent='Historial eliminado. La biblioteca y el documento abierto no cambiaron.';actualizar();}
          catch {aviso.textContent='No se pudo eliminar el historial. Inténtalo de nuevo.';}
        }},'Eliminar historial'))));
    }catch{estado.textContent='El historial no está disponible en este navegador. Puedes descargar e importar respaldos de biblioteca.';lista.replaceChildren();}
  }
  openModal({title:'Copias y recuperación',body:h('div',null,
    h('p',null,'Incluido gratis. Conservamos hasta 20 versiones por presentación: un punto inicial, cambios agrupados cada cinco minutos y el estado más reciente. El historial tiene un límite compartido de 32 MB; al llenarse retira versiones antiguas y conserva al menos una por presentación.'),
    h('p',null,'Eliminar una presentación de la biblioteca conserva estas versiones hasta que uses «Eliminar historial». Estas copias están en este navegador. Borrar sus datos o perder el dispositivo también elimina el historial. Descarga un respaldo y guárdalo en otro dispositivo para protegerlo.'),
    h('div',{style:'display:flex;flex-wrap:wrap;gap:8px'},
      h('button',{class:'btn btn-pri',onclick:async()=>{flushEdicion();const ok=await recActual(true);aviso.textContent=ok?'Punto de recuperación guardado.':'No se pudo crear el punto. Descarga el respaldo.';actualizar();}},'Crear punto de recuperación'),
      h('button',{class:'btn',onclick:()=>recExportaBiblioteca()},'Descargar respaldo de biblioteca')),
    h('h3',null,'Recuperar desde un archivo'),archivo,importar,aviso,
    h('h3',null,'Versiones de este navegador'),estado,lista),foot:[h('button',{class:'btn',onclick:()=>openDecks()},'Abrir biblioteca'),h('button',{class:'btn btn-pri',onclick:closeModal},'Cerrar')]});
  actualizar();
}
function recInicia() {
  // La biblioteca puede ser anterior al autoguardado: solo incorpora historias ausentes.
  for(const [nombre,v] of Object.entries(decksStore()))if(v?.deck?.slides?.length)recGuardar(v.deck,nombre,{soloInicial:true});
  // Un autoguardado antiguo no debe sustituir la última copia buena.
  recActual(true);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){flushEdicion();saveInd.now();}});
  const borrador=deb(()=>recActual(),1200);
  document.addEventListener('input',e=>{if(e.target.closest?.('[data-edit]'))borrador();});
}
