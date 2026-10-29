// SPDX-License-Identifier: MIT
/* Copyright (c) 2026 Erlen contributors
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
/* Pantalla de inicio de Tabula. La app declara textos, «Nuevo…», ejemplos, su biblioteca
   y recursos; este módulo pinta la navegación, la colección y las vistas, filtra, deja el
   editor inerte y lleva el foco y el título de la pestaña. No guarda datos: la biblioteca
   la da la app.
   Estilos en diseno/inicio.css, solo con tokens --erlen-*.

   mountInicio(host, {
     nombre: 'Tabula', corto: '', objetos: 'presentaciones', // «Mis presentaciones»
     marca?: '<svg…>', estado: 'Versión beta', subtitulo: 'Presentaciones',
     eyebrow: 'PRESENTACIONES · TABULA', titulo: ['Crea ', 'tus ideas'],
     lead: 'Frase de una o dos líneas.',
     nuevo: {etiqueta:'Nueva presentación', detalle:'Presentación en blanco', accion},
     importar?: {etiqueta:'Importar…', accion},
     continuar?: () => ({etiqueta:'Seguir con «X»', accion}) | null,
     objetivos?: [{id, titulo, descripcion?, etiqueta?, accion}], // tareas con datos propios; no ejemplos
     guardado?: 'sesion' | 'explicito', // sin él, la app guarda sola y el inicio lo afirma («Guardado local activo»).
                                   // 'sesion': no guarda nada; vive en la pestaña. 'explicito': guarda solo si la persona lo pide.
                                   // En ambos el inicio no afirma «Guardado local activo» ni «tu trabajo se queda en este navegador»
     ejemplos?: [{id, disciplina, arte?, imagen?, titulo, descripcion?, accion, etiqueta?}],
     // arte: SVG del contenido o texto; imagen: archivo local relativo a la raíz de la app
     // (p. ej. 'ejemplos/muestra.webp'). Nunca URLs externas, absolutas ni data:.
     biblioteca?: {listar: () => [{id, titulo, detalle?, fecha?, miniatura?, abrir, duplicar?, descargar?,
                                    renombrar?: (nuevoTitulo) => void | Promise<void>,
                                    eliminar?: () => void | Promise<void>}],
                   vacio?: {titulo, texto}},
     recursos?: [{titulo, texto, etiqueta, accion}],
     acerca?: {texto, enlaces:[{etiqueta, url}]},
     fuente?: {url, licencia:'AGPLv3'},
     editor?: Element,            // se vuelve inert mientras el inicio está abierto
     apariencia?: () => {},       // abre los ajustes de apariencia
     alAbrir?, alCerrar?
   })
   Devuelve {elemento, abrir(vista), cerrar(), actualizar(), avisar(texto,{error}), abierta, vista, destruir()}.
   avisar() muestra un aviso persistente (role=status, o alert si es error) arriba del contenido
   hasta que cambia la vista.
   Vistas: 'inicio', 'biblioteca', 'ejemplos', 'recursos', 'acerca'. */
const VISTAS=['inicio','biblioteca','ejemplos','recursos','acerca'];

export function mountInicio(host,config){
 if(!host||!host.ownerDocument)throw Error('mountInicio necesita un elemento anfitrión.');
 if(!config||typeof config.nombre!=='string'||!config.nuevo||typeof config.nuevo.accion!=='function')throw Error('mountInicio necesita nombre y nuevo.accion.');
 const doc=host.ownerDocument;
 const objetos=config.objetos||'documentos';
 const nombres={inicio:'Inicio',biblioteca:'Mis '+objetos,ejemplos:'Ejemplos editables',recursos:'Recursos y respaldos',acerca:'Acerca de'};
 const disponibles=VISTAS.filter(v=>v==='inicio'||v==='acerca'||(v==='biblioteca'&&config.biblioteca)||(v==='ejemplos'&&config.ejemplos&&config.ejemplos.length)||(v==='recursos'&&config.recursos&&config.recursos.length));
 let vista='inicio',abierta=false,tituloPrevio=null,busqueda='',orden='recientes',aviso=null;

 const el=(tag,attrs,...hijos)=>{
  const n=doc.createElement(tag);
  for(const [k,v] of Object.entries(attrs||{}))if(v!==null&&v!==undefined&&v!==false)n.setAttribute(k,v===true?'':String(v));
  n.append(...hijos.flat().filter(h=>h!==null&&h!==undefined&&h!==false));
  return n;
 };
 const boton=(texto,accion,clase='',attrs={})=>{const b=el('button',{type:'button',class:('erlen-inicio-boton '+clase).trim(),...attrs},typeof texto==='string'?el('span',{class:'erlen-inicio-boton-texto'},texto):texto);if(typeof texto==='string'&&!attrs.title)b.title=texto;b.addEventListener('click',accion);return b;};
 const marca=()=>{const s=el('span',{class:'erlen-inicio-marca-icono','aria-hidden':'true'});if(config.marca)s.innerHTML=config.marca;return s;};
 const alEditor=fn=>()=>{cerrar();fn();};

 const raiz=el('main',{class:'erlen-inicio',hidden:true,'aria-label':config.nombre});
 host.append(raiz);

 // Clave estable del control enfocado, para devolverle el foco tras repintar.
 const claveFoco=n=>n&&n!==doc.body&&raiz.contains(n)?n.tagName+'|'+(n.getAttribute('aria-label')||n.textContent.trim()):null;
 function pintar(){
  const foco=claveFoco(doc.activeElement);
  raiz.replaceChildren();
  const nav=el('nav',{class:'erlen-inicio-nav','aria-label':'Navegación del inicio'},
   disponibles.filter(v=>v!=='acerca').map(v=>{const a=el('a',{href:'#',class:'erlen-inicio-enlace','aria-current':v===vista?'page':null},nombres[v]);a.addEventListener('click',e=>{e.preventDefault();abrir(v);});return a;}));
  const acerca=el('a',{href:'#',class:'erlen-inicio-enlace','aria-current':vista==='acerca'?'page':null},'Acerca de');
  acerca.addEventListener('click',e=>{e.preventDefault();abrir('acerca');});
  const lateral=el('aside',{class:'erlen-inicio-lateral'},
   el('div',{class:'erlen-inicio-marca'},marca(),el('span',null,config.nombre),config.corto?el('small',null,config.corto):null),
   nav,
   el('div',{class:'erlen-inicio-lateral-pie'},acerca,
    config.fuente?el('a',{class:'erlen-inicio-fuente',href:config.fuente.url,target:'_blank',rel:'noopener'},'Código fuente · '+(config.fuente.licencia||'')):null,
    config.estado?el('p',{class:'erlen-inicio-estado'},config.estado,el('span',null,{sesion:'Sin cuenta · lo que cargues vive solo en esta pestaña.',explicito:'Sin cuenta · se guarda en este navegador solo si pulsas Guardar.'}[config.guardado]||'Sin cuenta · tu trabajo se queda en este navegador.')):null));
  const acciones=el('div',{class:'erlen-inicio-cabecera-acciones'},el('span',{class:'erlen-inicio-local'},'En este navegador'));
  const cont=config.continuar&&config.continuar();
  if(cont)acciones.append(boton(cont.etiqueta,alEditor(cont.accion),'secundario'));
  if(typeof config.apariencia==='function')acciones.append(boton('Apariencia',()=>config.apariencia(),'secundario'));
  const cabecera=el('header',{class:'erlen-inicio-cabecera'},el('span',null,config.subtitulo||config.nombre),acciones);
  const contenido=el('div',{class:'erlen-inicio-contenido'});
  raiz.append(el('div',{class:'erlen-inicio-marco'},lateral,el('div',{class:'erlen-inicio-panel'},cabecera,contenido)));
  if(aviso)contenido.append(el('p',{class:'erlen-inicio-aviso'+(aviso.error?' error':''),role:aviso.error?'alert':'status'},aviso.texto));
  ({inicio:pintarInicio,biblioteca:pintarBiblioteca,ejemplos:pintarEjemplos,recursos:pintarRecursos,acerca:pintarAcerca})[vista](contenido);
  if(foco){const n=[...raiz.querySelectorAll('button,a,input,select,[tabindex]')].find(x=>claveFoco(x)===foco);if(n)n.focus({preventScroll:true});}
 }

 const titulo=(texto,em)=>el('h1',{class:'erlen-inicio-titulo',tabindex:'-1'},texto,em?el('em',null,em):null);
 const cabeceraVista=(c,nombre)=>c.append(el('header',{class:'erlen-inicio-vista-cabecera'},el('span',{class:'erlen-inicio-eyebrow'},config.nombre.toUpperCase()),titulo(nombre)));
 function tarjetaNueva(){
  const b=el('button',{type:'button',class:'erlen-inicio-nueva'},el('span',{class:'erlen-inicio-mas','aria-hidden':'true'},'+'),el('span',{class:'erlen-inicio-nueva-datos'},el('strong',null,config.nuevo.etiqueta),config.nuevo.detalle?el('small',null,config.nuevo.detalle):null));
  b.addEventListener('click',alEditor(config.nuevo.accion));
  return b;
 }
 function tarjetaEjemplo(e){
  const arte=el('div',{class:'erlen-inicio-arte','aria-hidden':'true'});
  // La ruta debe quedar dentro de la app incluso tras normalizar segmentos codificados. Solo se
  // resuelve si hay `imagen`: en about:blank, data: o blob: `new URL('.',baseURI)` lanza y, sin
  // este cuidado, una sola tarjeta tumbaba toda la pantalla de inicio; entonces queda `arte`.
  let imagen=null;
  if(typeof e.imagen==='string'&&e.imagen.trim()&&!/^[\\/]|[?#:]|\\/.test(e.imagen))try{
   const base=new URL('.',doc.baseURI),url=new URL(e.imagen,base);
   if(url.origin===base.origin&&url.pathname.startsWith(base.pathname))imagen=e.imagen;
  }catch{imagen=null;}
  if(imagen)arte.append(el('img',{src:imagen,alt:'',loading:'lazy',decoding:'async'}));
  else if(typeof e.arte==='string'&&e.arte.trim().startsWith('<svg'))arte.innerHTML=e.arte;
  else arte.textContent=e.arte||'';
  return el('article',{class:'erlen-inicio-ejemplo con-arte','data-busqueda':[e.disciplina,e.titulo,e.descripcion].join(' ').toLowerCase()},
   arte,el('div',{class:'erlen-inicio-ejemplo-datos'},e.disciplina?el('span',{class:'erlen-inicio-eyebrow'},e.disciplina):null,el('h2',null,e.titulo),e.descripcion?el('p',{class:'erlen-inicio-solo-lectura'},e.descripcion):null),
   boton(e.etiqueta||'Abrir ejemplo',alEditor(e.accion),'primario',{'aria-label':(e.etiqueta||'Abrir ejemplo')+' · '+e.titulo}));
 }
 function pintarInicio(c){
  const buscar=el('input',{type:'search',class:'erlen-inicio-campo',placeholder:'Buscar un ejemplo…','aria-label':'Buscar ejemplos'});
  const objetivos=(config.objetivos||[]).map(o=>el('article',{class:'erlen-inicio-objetivo','data-objetivo':o.id},
   el('span',{class:'erlen-inicio-eyebrow'},'Con tus datos'),el('h2',null,o.titulo),
   o.descripcion?el('p',null,o.descripcion):null,
   boton(o.etiqueta||'Empezar',alEditor(o.accion),'secundario',{'aria-label':(o.etiqueta||'Empezar')+' · '+o.titulo})));
  const rejilla=el('section',{class:'erlen-inicio-rejilla erlen-inicio-coleccion','aria-label':'Colección de inicio'},tarjetaNueva(),objetivos,(config.ejemplos||[]).map(tarjetaEjemplo));
  buscar.addEventListener('input',()=>{const q=buscar.value.trim().toLowerCase();for(const t of rejilla.querySelectorAll('.erlen-inicio-ejemplo'))t.hidden=!!q&&!t.dataset.busqueda.includes(q);});
  const [texto,em]=Array.isArray(config.titulo)?config.titulo:[config.titulo||config.nombre];
  c.append(el('div',{class:'erlen-inicio-bienvenida'},
   el('div',null,config.eyebrow?el('span',{class:'erlen-inicio-eyebrow'},config.eyebrow):null,titulo(texto,em),config.lead?el('p',{class:'erlen-inicio-lead'},config.lead):null),
   config.ejemplos&&config.ejemplos.length?el('label',{class:'erlen-inicio-buscar'},buscar):null));
  const accionesMeta=el('div',{class:'erlen-inicio-acciones'});
  if(config.ejemplos&&config.ejemplos.length>3)accionesMeta.append(boton('Explorar ejemplos',()=>abrir('ejemplos'),'secundario'));
  if(config.importar)accionesMeta.append(boton(config.importar.etiqueta||'Importar…',alEditor(config.importar.accion),'secundario'));
  c.append(el('div',{class:'erlen-inicio-meta'},el('h2',null,'Colección de inicio'),accionesMeta),rejilla);
  const recientes=config.biblioteca?config.biblioteca.listar().slice(0,4):[];
  if(recientes.length){
   const ver=el('a',{href:'#',class:'erlen-inicio-enlace-texto'},'Ver todo');ver.addEventListener('click',e=>{e.preventDefault();abrir('biblioteca');});
   c.append(el('div',{class:'erlen-inicio-meta'},el('h2',null,'Recientes'),ver),el('ul',{class:'erlen-inicio-recientes'},recientes.map(r=>{const b=boton([el('strong',null,r.titulo||'Sin título'),r.detalle||r.fecha?el('small',null,[r.detalle,r.fecha].filter(Boolean).join(' · ')):null],alEditor(r.abrir),'reciente');return el('li',null,b);})));
  }
  if(config.ejemplos&&config.ejemplos.length)c.append(el('footer',{class:'erlen-inicio-pie'},el('p',null,'Ejemplos didácticos · sustituye los datos por los de tu investigación.'),el('span',{class:'erlen-inicio-activo'+({sesion:' sesion',explicito:' sesion'}[config.guardado]||'')},{sesion:'Sin guardado en el navegador',explicito:'Guardado solo si lo pides'}[config.guardado]||'Guardado local activo')));
 }
 function pintarBiblioteca(c){
  cabeceraVista(c,nombres.biblioteca);
  const buscar=el('input',{type:'search',class:'erlen-inicio-campo',placeholder:'Buscar en tu biblioteca…','aria-label':'Buscar en tu biblioteca',value:busqueda});
  const ordenar=el('select',{class:'erlen-inicio-campo','aria-label':'Ordenar'},el('option',{value:'recientes'},'Más recientes'),el('option',{value:'nombre'},'Nombre A–Z'));
  ordenar.value=orden;
  const rejilla=el('section',{class:'erlen-inicio-rejilla erlen-inicio-biblioteca','aria-label':nombres.biblioteca});
  const conteo=el('p',{class:'erlen-inicio-nota',role:'status'});
  const fallo=(verbo,e)=>{aviso={texto:'No se pudo '+verbo+': '+(e&&e.message||e),error:true};pintar();};
  const repintar=()=>{
   const q=busqueda.trim().toLowerCase();
   let items=config.biblioteca.listar();
   const total=items.length;
   if(q)items=items.filter(i=>[i.titulo,i.detalle].join(' ').toLowerCase().includes(q));
   if(orden==='nombre')items=[...items].sort((a,b)=>String(a.titulo||'').localeCompare(String(b.titulo||''),'es'));
   rejilla.replaceChildren();
   if(!items.length){
    const v=config.biblioteca.vacio||{};
    rejilla.append(total?el('div',{class:'erlen-inicio-vacio'},el('h3',null,'No hay coincidencias'),el('p',null,'Prueba con otro nombre o limpia la búsqueda.'))
     :el('div',{class:'erlen-inicio-vacio'},el('h3',null,v.titulo||'Aquí empieza tu trabajo'),el('p',null,v.texto||'Crea uno nuevo o importa un archivo. Tu trabajo se guarda en este navegador; puedes descargarlo en cualquier momento.'),boton(config.nuevo.etiqueta,alEditor(config.nuevo.accion),'primario')));
   }
   for(const i of items){
    const nombre=i.titulo||'Sin título';
    rejilla.append(el('article',{class:'erlen-inicio-tarjeta'},
    el('div',{class:'erlen-inicio-miniatura','aria-hidden':'true'},el('small',null,'En este navegador'),el('span',null,i.miniatura||i.titulo||'Sin título')),
    el('div',{class:'erlen-inicio-tarjeta-cuerpo'},el('h3',null,i.titulo||'Sin título'),i.detalle||i.fecha?el('p',null,[i.detalle,i.fecha].filter(Boolean).join(' · ')):null,
     el('div',{class:'erlen-inicio-acciones'},boton('Abrir',alEditor(i.abrir),'primario',{'aria-label':'Abrir «'+(i.titulo||'Sin título')+'»'}),
      i.duplicar?boton('Duplicar',()=>{Promise.resolve().then(()=>i.duplicar()).then(repintar,e=>fallo('duplicar',e));},'secundario',{'aria-label':'Duplicar «'+nombre+'»'}):null,
      i.descargar?boton('Descargar',()=>i.descargar(),'secundario',{'aria-label':'Descargar «'+nombre+'»'}):null,
      typeof i.renombrar==='function'?boton('Renombrar',()=>{
       const respuesta=doc.defaultView.prompt('Nuevo nombre para «'+nombre+'»',nombre);
       if(respuesta===null)return;
       const nuevo=respuesta.trim();
       if(!nuevo){fallo('renombrar','el nombre no puede estar vacío');return;}
       if(nuevo!==nombre)Promise.resolve().then(()=>i.renombrar(nuevo)).then(repintar,e=>fallo('renombrar',e));
      },'secundario',{'aria-label':'Renombrar «'+nombre+'»'}):null,
      typeof i.eliminar==='function'?boton('Eliminar',()=>{
       if(doc.defaultView.confirm('¿Eliminar «'+nombre+'»? Esta acción no se puede deshacer.'))
        Promise.resolve().then(()=>i.eliminar()).then(repintar,e=>fallo('eliminar',e));
      },'peligro',{'aria-label':'Eliminar «'+nombre+'»'}):null))));
   }
   conteo.textContent=items.length+' de '+total+' '+objetos;
  };
  buscar.addEventListener('input',()=>{busqueda=buscar.value;repintar();});
  ordenar.addEventListener('change',()=>{orden=ordenar.value;repintar();});
  c.append(el('div',{class:'erlen-inicio-controles'},buscar,ordenar),conteo,rejilla,
   el('footer',{class:'erlen-inicio-pie'},el('p',null,'Los archivos locales son tuyos. Borrar los datos del navegador elimina estas copias: conserva un respaldo descargado.')));
  repintar();
 }
 function pintarEjemplos(c){
  cabeceraVista(c,nombres.ejemplos);
  c.append(el('p',{class:'erlen-inicio-lead'},'Puntos de partida editables. Los datos son ilustrativos: sustitúyelos por los de tu investigación.'),
   el('section',{class:'erlen-inicio-rejilla erlen-inicio-coleccion','aria-label':nombres.ejemplos},tarjetaNueva(),config.ejemplos.map(tarjetaEjemplo)));
 }
 function pintarRecursos(c){
  cabeceraVista(c,nombres.recursos);
  c.append(el('section',{class:'erlen-inicio-rejilla','aria-label':nombres.recursos},config.recursos.map(r=>el('article',{class:'erlen-inicio-ejemplo'},el('h2',null,r.titulo),r.texto?el('p',null,r.texto):null,boton(r.etiqueta||'Abrir',()=>r.accion(),'secundario')))));
 }
 function pintarAcerca(c){
  cabeceraVista(c,nombres.acerca);
  const a=config.acerca||{};
  c.append(el('div',{class:'erlen-inicio-acerca'},el('h2',null,config.nombre+(config.subtitulo?' · '+config.subtitulo:'')),a.texto?el('p',null,a.texto):null,
   a.enlaces&&a.enlaces.length?el('ul',null,a.enlaces.map(l=>el('li',null,el('a',{href:l.url,target:'_blank',rel:'noopener'},l.etiqueta)))):null));
 }

 function abrir(v='inicio'){
  const nueva=disponibles.includes(v)?v:'inicio';
  if(nueva!==vista)aviso=null;
  vista=nueva;
  if(!abierta){tituloPrevio=doc.title;abierta=true;raiz.hidden=false;if(config.editor)config.editor.setAttribute('inert','');doc.body.classList.add('erlen-inicio-abierto');if(config.alAbrir)config.alAbrir();}
  pintar();
  raiz.scrollTop=0;
  doc.title=nombres[vista]+' · '+config.nombre;
  raiz.querySelector('.erlen-inicio-titulo')?.focus({preventScroll:true});
 }
 function cerrar(){
  if(!abierta)return;
  abierta=false;raiz.hidden=true;aviso=null;
  if(config.editor)config.editor.removeAttribute('inert');
  doc.body.classList.remove('erlen-inicio-abierto');
  if(tituloPrevio!==null)doc.title=tituloPrevio;
  if(config.alCerrar)config.alCerrar();
 }
 return {
  elemento:raiz,abrir,cerrar,
  actualizar(){if(abierta)pintar();},
  avisar(texto,{error=false}={}){aviso=texto?{texto:String(texto),error:!!error}:null;if(abierta)pintar();},
  get abierta(){return abierta;},
  get vista(){return vista;},
  destruir(){cerrar();raiz.remove();}
 };
}
