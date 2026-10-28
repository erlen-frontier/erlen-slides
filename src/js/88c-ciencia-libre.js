/* ==== 88c-ciencia-libre.js ==== */
'use strict';
/* Herramientas locales: las estructuras y datos nunca se envían a un servicio. */
const CIENCIA_LIBRES={promesas:new Map(),base:'libre/'};
function cienciaIcono(nombre) {
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 for(const [k,v] of Object.entries({viewBox:'0 0 24 24',width:20,height:20,fill:'none',stroke:'currentColor','stroke-width':1.8,'stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true',focusable:'false'}))svg.setAttribute(k,v);
 for(const [tag,attrs] of window.ERLEN_ICONOS?.[nombre] || []) {const p=document.createElementNS(svg.namespaceURI,tag);for(const [k,v] of Object.entries(attrs))p.setAttribute(k,v);svg.append(p);}
 return svg;
}
function cienciaIconos() {
 if(!window.ERLEN_ICONOS)return;
 const botones={undoBtn:'Undo2',redoBtn:'Redo2',buscarBtn:'Search',zoomIn:'ZoomIn',zoomOut:'ZoomOut',zoomFit:'Expand',sorterBtn:'Settings2',concBtn:'Minimize2',helpBtn:'HelpCircle'};
 for(const [id,n] of Object.entries(botones)){const b=document.getElementById(id);if(b){if(!b.getAttribute('aria-label'))b.setAttribute('aria-label',b.title || b.textContent);b.replaceChildren(cienciaIcono(n));}}
}
function cienciaJS(nombre) {
 if(location.protocol==='file:'||window.ERLEN_LIBRE!==true)return Promise.reject(new Error('Abre el editor web para usar el laboratorio. Las figuras ya insertadas siguen disponibles en este archivo.'));
 if(!['kekule','3dmol','plotly'].includes(nombre))return Promise.reject(new Error('Biblioteca desconocida'));
 if(CIENCIA_LIBRES.promesas.has(nombre))return CIENCIA_LIBRES.promesas.get(nombre);
 const p=new Promise((resolve,reject)=>{
  const s=document.createElement('script');s.src=CIENCIA_LIBRES.base+nombre+'.js';s.async=true;
  const t=setTimeout(()=>{s.remove();reject(new Error('La herramienta tarda en cargar. Comprueba tu conexión e inténtalo de nuevo.'));},30000);
  s.onload=()=>{clearTimeout(t);resolve();};s.onerror=()=>{clearTimeout(t);s.remove();reject(new Error('No se pudo cargar la herramienta. Puedes volver a intentarlo.'));};document.head.append(s);
 }).catch(e=>{CIENCIA_LIBRES.promesas.delete(nombre);throw e;});
 CIENCIA_LIBRES.promesas.set(nombre,p);return p;
}
function cienciaAnaliza(entrada,signal) {
 return new Promise((resolve,reject)=>{
  if(location.protocol==='file:'||window.ERLEN_LIBRE!==true){reject(new Error('El análisis molecular se abre desde el editor web.'));return;}
  if(signal?.aborted){reject(new Error('Operación cancelada'));return;}
  let w;try{w=new Worker(CIENCIA_LIBRES.base+'quimica-worker.js');}catch{reject(new Error('Este navegador no pudo abrir el motor molecular.'));return;}
  const fin=(err,data)=>{clearTimeout(t);signal?.removeEventListener('abort',abortar);w.terminate();err?reject(err):resolve(data);};
  const abortar=()=>fin(new Error('Operación cancelada'));
  const t=setTimeout(()=>fin(new Error('La carga o el análisis superó 20 segundos. Comprueba tu conexión o prueba una estructura más pequeña.')),20000);
  signal?.addEventListener('abort',abortar,{once:true});
  w.onmessage=e=>e.data.ok?fin(null,e.data):fin(new Error(e.data.error));w.onerror=()=>fin(new Error('No se pudo cargar el motor molecular. Inténtalo de nuevo.'));w.postMessage(entrada);
 });
}
function cienciaNumero(texto){
 const s=String(texto).trim();if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(s))throw Error('Usa números decimales, sin unidades ni separadores de miles.');
 const n=Number(s);if(!Number.isFinite(n)||(n===0&&/[1-9]/.test(s.split(/e/i)[0])))throw Error('El número queda fuera de la precisión disponible. Cambia las unidades.');return n;
}
function cienciaPuntos(texto) {
 if(typeof texto!=='string'||texto.length>200000)throw new Error('Usa hasta 200 KB de datos.');
 const filas=texto.trim().split(/\r?\n/).filter(s=>s.trim());
 if(filas.length<2 || filas.length>2001)throw new Error('Introduce de 2 a 2000 puntos, una pareja x,y por fila.');
 const puntos=[];
 for(let i=0;i<filas.length;i++){
  const c=filas[i].trim().split(/[;,\t]/).map(s=>s.trim());
  if(i===0&&c.length===2&&/^x$/i.test(c[0])&&/^y$/i.test(c[1]))continue;
  if(c.length!==2)throw new Error('Fila '+(i+1)+': se necesitan dos números con punto decimal.');
  try{puntos.push(c.map(cienciaNumero));}catch(e){throw Error('Fila '+(i+1)+': '+e.message);}
 }
 if(puntos.length<2 || puntos.length>2000)throw new Error('Se necesitan de 2 a 2000 puntos.');
 return puntos;
}
function cienciaInserta(src,datos,titulo,original,deck) {
 if(S.deck!==deck)throw new Error('Cambió la presentación. Vuelve a abrir la herramienta.');
 if(!/^data:image\/(png|svg\+xml)[;,]/.test(src))throw new Error('No se generó una imagen válida.');
 let b;
 if(original){const f=findBlock(original.id);if(!f||f.block!==original)throw new Error('El bloque ya no está disponible.');b=f.block;}
 else {let sl=curSlide();if(!zonasDe(sl.layout)){addSlide('content');sl=curSlide();}b=newBlock('image');zona(sl,clamp((S.insCol||1)-1,0,zonasDe(sl.layout)-1)).push(b);}
 delete b.orig;delete b.recProp;
 Object.assign(b,{src,cientifico:deepCopy(datos),alt:titulo,caption:original?.caption || titulo,w:original?.w || 85});
 S.selBlock=b.id;S.tab='bloque';commit();try{closeModal();}finally{renderAll();}toast(original?'Figura científica actualizada':'Figura insertada con sus datos editables');
}
function cienciaPng(svg) {
 return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{try{const c=document.createElement('canvas');c.width=1600;c.height=1024;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(im,0,0,c.width,c.height);resolve(c.toDataURL('image/png'));}catch{reject(new Error('No se pudo preparar la figura.'));}};im.onerror=()=>reject(new Error('No se pudo dibujar la molécula.'));im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);});
}
function openCiencia() {
 flushEdicion();
 const opciones=[['Atom','Moléculas','Dibuja una estructura o pega SMILES. Consulta sus descriptores e insértala como figura editable.',()=>openMoleculaLibre()],['FlaskConical','Estructuras 3D','Abre un archivo molecular, gira la estructura y conserva la vista en tu diapositiva.',()=>openMolecular3D()],['ChartLine','Datos experimentales','Explora dos columnas de datos y conserva la gráfica junto con sus valores.',()=>openDatosLibres()]];
 openModal({title:'Laboratorio científico',size:'ciencia-modal',body:h('div',null,h('p',null,'Incluido gratis. Las herramientas se cargan cuando las abres. Tus moléculas y datos se procesan en este navegador.'),h('div',{class:'ciencia-cards'},opciones.map(([ic,n,d,f])=>h('button',{class:'ciencia-card',onclick:f},cienciaIcono(ic),h('strong',null,n),h('span',null,d))))) });
}
function cienciaCampo(label,el){return h('label',{class:'ciencia-campo'},h('span',null,label),el);}
function cienciaSelectorArchivo(input){
 const nombre=h('span',{class:'hint'},'Ningún archivo seleccionado');input.hidden=true;
 input.addEventListener('change',()=>{nombre.textContent=input.files[0]?.name || 'Ningún archivo seleccionado';});
 return h('div',{class:'ciencia-archivo'},h('button',{class:'btn',onclick:()=>input.click()},input.getAttribute('aria-label')),input,nombre);
}
function cienciaAviso(el,e){el.textContent=e?.message || 'No se pudo completar la operación.';}
async function openMoleculaLibre(original) {
 flushEdicion();const deck=S.deck,abort=new AbortController();let composer=null,res=null,busy=false,revision=0,lectura=0;
 const estado=h('p',{role:'status',class:'hint'},'Cargando editor molecular…');
 const nombre=h('input',{class:'field',value:original?.alt || 'Estructura molecular',maxlength:150});
 const entrada=h('textarea',{class:'field',rows:3,'aria-label':'SMILES o MOL',placeholder:'Pega SMILES o el contenido de un archivo MOL'});
 entrada.value=original?.cientifico?.mol||'';
 const lienzo=h('div',{class:'ciencia-molecula','aria-label':'Editor de estructuras moleculares'});
 const propiedades=h('dl',{class:'ciencia-propiedades'}),preview=h('img',{class:'ciencia-preview',alt:'Vista de la molécula',hidden:true});
 const insertar=h('button',{class:'btn btn-pri',disabled:true,onclick:async()=>{if(busy||!res)return;busy=true;insertar.disabled=true;try{const r=res,turno=revision,titulo=nombre.value;const src=await cienciaPng(r.svg);if(abort.signal.aborted||revision!==turno)return;cienciaInserta(src,{v:1,tipo:'molecula',mol:r.mol,smiles:r.smiles,descriptores:r.descriptores,motor:'RDKit '+r.version},titulo,original,deck);}catch(e){cienciaAviso(estado,e);}finally{busy=false;if(!abort.signal.aborted)insertar.disabled=!res;}}},original?'Actualizar figura':'Insertar en diapositiva');
 function invalida(){lectura++;revision++;res=null;insertar.disabled=true;preview.hidden=true;propiedades.replaceChildren();}
 entrada.addEventListener('input',invalida);
 nombre.addEventListener('input',()=>{revision++;});
 async function analizar(texto,cargar){
  if(busy)return;busy=true;invalida();const turno=revision;estado.textContent='Analizando estructura…';
  try{const r=await cienciaAnaliza(texto,abort.signal);if(abort.signal.aborted||revision!==turno)return;
   if(cargar){if(composer){try{composer.setChemObj(Kekule.IO.loadFormatData(r.mol,'mol'));}catch{estado.textContent='No se pudo abrir el dibujo; se conserva la estructura calculada.';}}entrada.value=r.mol;}
   res=r;preview.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(r.svg);preview.hidden=false;
   const campos=[['amw','Masa molecular','g/mol'],['CrippenClogP','logP calculado',''],['tpsa','Área polar topológica','Å²'],['NumHBD','Donantes de H',''],['NumHBA','Aceptores de H','']];
   propiedades.replaceChildren();for(const [key,label,unidad] of campos){const v=r.descriptores[key];if(typeof v==='number')propiedades.append(h('dt',null,label),h('dd',null,Number.isInteger(v)?String(v):v.toFixed(3),' '+unidad));}
   estado.textContent='Estructura analizada con RDKit '+r.version+'. Los valores son descriptores calculados.'+(composer?'':' El dibujo no está disponible; puedes editar SMILES o MOL.');insertar.disabled=false;
  }catch(e){if(!abort.signal.aborted)cienciaAviso(estado,e);}finally{busy=false;}
 }
 const importar=h('button',{class:'btn',onclick:()=>analizar(entrada.value,true)},'Cargar estructura');
 const analizarDibujo=h('button',{class:'btn',disabled:true,onclick:()=>{try{const obj=composer?.getSavingTargetObj();if(!obj)throw new Error('Dibuja o carga una molécula primero.');analizar(Kekule.IO.saveFormatData(obj,'mol'),false);}catch(e){cienciaAviso(estado,e);}}},'Analizar dibujo');
 const archivo=h('input',{type:'file',accept:'.mol,.smi,.smiles','aria-label':'Abrir archivo molecular'});
 archivo.addEventListener('change',async()=>{const f=archivo.files[0];if(!f)return;invalida();const actual=lectura;try{if(f.size>250000)throw new Error('El archivo supera 250 KB.');const txt=await f.text();if(!abort.signal.aborted&&lectura===actual){entrada.value=txt;invalida();}}catch(e){cienciaAviso(estado,e);}});
 const body=h('div',{class:'ciencia-layout'},h('div',null,cienciaCampo('Nombre de la figura',nombre),cienciaCampo('SMILES o MOL',entrada),h('div',{class:'ciencia-acciones'},importar,h('button',{class:'btn',onclick:()=>{if(busy)return;entrada.value='CC(=O)Oc1ccccc1C(=O)O';analizar(entrada.value,true);}},'Ejemplo: aspirina')),cienciaSelectorArchivo(archivo),lienzo,analizarDibujo),h('aside',null,h('h3',null,'Estructura y propiedades'),preview,propiedades,estado,h('p',{class:'hint'},'Se conserva una imagen para presentar y la estructura MOL para editarla después.')));
 openModal({title:'Moléculas · editor y propiedades',size:'ciencia-modal',body,foot:[insertar],onclose:()=>{abort.abort();composer?.finalize();}});
 try{
  if(!document.querySelector('[data-kekule-css]'))document.head.append(h('link',{rel:'stylesheet',href:CIENCIA_LIBRES.base+'themes/default/kekule.css','data-kekule-css':'true'}));
  await cienciaJS('kekule');if(abort.signal.aborted)return;
  cienciaIdiomaKekule();
  composer=new Kekule.Editor.Composer(lienzo);composer.setDimension('100%','400px');composer.setEnableOperHistory(true);analizarDibujo.disabled=false;
  const titulos={'Select tool':'Seleccionar','Erase tool':'Borrar','Bond tool':'Enlaces','Atom and formula tool':'Átomos y fórmulas','Ring structures tool':'Anillos','Charge tool':'Cargas','Arrows and symbols tool':'Flechas y símbolos','Text and image tool':'Texto e imagen','Marquee select':'Selección rectangular','Lasso select':'Selección con lazo','Brush select':'Selección con pincel','Select molecule':'Seleccionar molécula','Scroll':'Desplazar'};
  for(const el of lienzo.querySelectorAll('[title]'))if(titulos[el.title])el.title=titulos[el.title];
  composer.getEditor().addEventListener('editObjsChanged',()=>{invalida();estado.textContent='Dibujo modificado. Pulsa Analizar dibujo para actualizar sus propiedades.';});
  estado.textContent='Dibuja una molécula o carga una estructura para comenzar.';
  if(original?.cientifico?.mol){entrada.value=original.cientifico.mol;await analizar(entrada.value,true);}
 }catch(e){if(!abort.signal.aborted){cienciaAviso(estado,e);if(original?.cientifico?.mol)await analizar(entrada.value,true);}}
}
async function openMolecular3D(original) {
 flushEdicion();const deck=S.deck;let viewer=null,closed=false,modelo=null,lectura=0;
 const titulo=h('input',{class:'field',value:original?.alt || 'Estructura 3D',maxlength:150});
 const visor=CIENCIA_LIBRES.visor3d || h('div',{class:'ciencia-3d','aria-label':'Visor molecular 3D'}),estado=h('p',{class:'hint',role:'status'},'Cargando visor 3D…');
 const formato=h('select',{class:'field','aria-label':'Formato molecular'},['xyz','sdf','pdb','mol2'].map(v=>h('option',{value:v},v.toUpperCase())));
 const estilo=h('select',{class:'field','aria-label':'Representación'},h('option',{value:'stick'},'Bolas y varillas'),h('option',{value:'sphere'},'Esferas'),h('option',{value:'cartoon'},'Cintas de proteína'));
 const archivo=h('input',{type:'file',accept:'.xyz,.sdf,.pdb,.mol2','aria-label':'Archivo de estructura 3D'});
 const insertar=h('button',{class:'btn btn-pri',disabled:true,onclick:()=>{try{viewer.render();cienciaInserta(viewer.pngURI(),{v:1,tipo:'3d',...modelo,estilo:estilo.value,vista:viewer.getView()},titulo.value,original,deck);}catch(e){cienciaAviso(estado,e);}}},original?'Actualizar figura':'Insertar vista en diapositiva');
 function representa(){if(estilo.value==='cartoon'&&!viewer.selectedAtoms({atom:'CA'}).length){estilo.value='stick';estado.textContent='Esta estructura no contiene un esqueleto de proteína; se muestran bolas y varillas.';}viewer.setStyle({},estilo.value==='stick'?{stick:{},sphere:{scale:0.25}}:estilo.value==='sphere'?{sphere:{}}:{cartoon:{color:'spectrum'}});viewer.render();}
 function cargar(texto,fmt){insertar.disabled=true;modelo=null;if(!viewer)throw new Error('Espera a que termine de cargar el visor.');if(texto.length>500000)throw new Error('Usa un archivo de hasta 500 KB.');viewer.removeAllModels();const m=viewer.addModel(texto,fmt);const n=m.selectedAtoms({}).length;if(!n||n>20000){viewer.removeAllModels();throw new Error('Se admiten estructuras de 1 a 20 000 átomos.');}modelo={texto,formato:fmt};representa();viewer.zoomTo();viewer.render();estado.textContent=n+' átomos. Arrastra para girar y usa el zoom para ajustar la vista.';insertar.disabled=false;}
 archivo.addEventListener('change',async()=>{const actual=++lectura;const f=archivo.files[0];if(!f)return;insertar.disabled=true;try{if(f.size>500000)throw new Error('El archivo supera 500 KB.');const texto=await f.text();if(closed||lectura!==actual)return;const ext=f.name.split('.').pop().toLowerCase();if(['xyz','sdf','pdb','mol2'].includes(ext))formato.value=ext;cargar(texto,formato.value);}catch(e){cienciaAviso(estado,e);}});
 estilo.addEventListener('change',()=>{if(modelo)representa();});
 openModal({title:'Estructuras 3D',size:'ciencia-modal',body:h('div',null,cienciaCampo('Nombre de la figura',titulo),h('div',{class:'ciencia-acciones'},cienciaSelectorArchivo(archivo),formato,estilo,h('button',{class:'btn',onclick:()=>{try{lectura++;formato.value='xyz';cargar('3\nAgua: geometría ilustrativa\nO 0 0 0\nH 0.9572 0 0\nH -0.23999 0.92730 0','xyz');titulo.value='Agua · geometría ilustrativa';}catch(e){cienciaAviso(estado,e);}}},'Ejemplo: agua')),visor,estado,h('p',{class:'hint'},'La diapositiva conserva una imagen de esta vista y el archivo molecular. Puedes reabrir el visor desde las propiedades de la figura.')),foot:[insertar],onclose:()=>{closed=true;viewer?.stopAnimate();viewer?.clear();}});
 try{await cienciaJS('3dmol');if(closed)return;viewer=CIENCIA_LIBRES.motor3d || $3Dmol.createViewer(visor,{backgroundColor:'white',antialias:true});CIENCIA_LIBRES.visor3d=visor;CIENCIA_LIBRES.motor3d=viewer;viewer.resize();estado.textContent='Abre una estructura con coordenadas 3D o prueba el ejemplo.';if(original?.cientifico){const d=original.cientifico;estilo.value=d.estilo||'stick';formato.value=d.formato;cargar(d.texto,d.formato);if(d.vista)viewer.setView(d.vista);viewer.render();}}catch(e){if(!closed)cienciaAviso(estado,e);}
}
async function openDatosLibres(original) {
 flushEdicion();const deck=S.deck;let closed=false,datos=null,busy=false,revision=0,lectura=0;
 const titulo=h('input',{class:'field',value:original?.alt || 'Datos experimentales',maxlength:150});
 const entrada=h('textarea',{class:'field',rows:10,'aria-label':'Datos x,y',placeholder:'x,y\n0,0.1\n1,0.3\n2,0.5',value:original?.cientifico?.texto||''});
 entrada.value=original?.cientifico?.texto||'';
 const tipo=h('select',{class:'field','aria-label':'Tipo de gráfica'},h('option',{value:'markers'},'Dispersión'),h('option',{value:'lines+markers'},'Línea y puntos'));
 const x=h('input',{class:'field',value:original?.cientifico?.x||'x','aria-label':'Etiqueta del eje x',maxlength:100}),y=h('input',{class:'field',value:original?.cientifico?.y||'y','aria-label':'Etiqueta del eje y',maxlength:100});
 const grafica=h('div',{class:'ciencia-grafica'}),estado=h('p',{class:'hint',role:'status'},'Cargando gráficas…');
 const insertar=h('button',{class:'btn btn-pri',disabled:true,onclick:async()=>{if(busy||!datos)return;busy=true;insertar.disabled=true;try{const d=datos,turno=revision,nombre=titulo.value;const src=await Plotly.toImage(grafica,{format:'png',width:1400,height:850});if(!closed&&revision===turno)cienciaInserta(src,d,nombre,original,deck);}catch(e){cienciaAviso(estado,e);}finally{busy=false;if(!closed)insertar.disabled=!datos;}}},original?'Actualizar gráfica':'Insertar gráfica');
 function invalida(){lectura++;revision++;datos=null;insertar.disabled=true;estado.textContent='Datos modificados. Pulsa Dibujar gráfica.';}
 for(const el of [entrada,tipo,x,y,titulo])el.addEventListener('input',invalida);
 async function dibujar(){if(busy)return;busy=true;invalida();const turno=revision;try{const pts=cienciaPuntos(entrada.value);if(!window.Plotly)throw new Error('Espera a que cargue la herramienta.');await Plotly.react(grafica,[{type:'scatter',mode:tipo.value,x:pts.map(p=>p[0]),y:pts.map(p=>p[1]),marker:{color:'#0e746a',size:9},line:{color:'#0e746a'}}],{title:{text:titulo.value},xaxis:{title:{text:x.value}},yaxis:{title:{text:y.value}},margin:{t:60,l:65,r:25,b:65},paper_bgcolor:'#fff',plot_bgcolor:'#fff'},{responsive:true,displaylogo:false,showLink:false,displayModeBar:false});if(closed){Plotly.purge(grafica);return;}if(revision!==turno)return;datos={v:1,tipo:'datos',texto:entrada.value,x:x.value,y:y.value,modo:tipo.value};estado.textContent=pts.length+' puntos. Puedes ampliar una región arrastrando sobre la gráfica.';insertar.disabled=false;}catch(e){if(!closed)cienciaAviso(estado,e);}finally{busy=false;}}
 const archivo=h('input',{type:'file',accept:'.csv,.tsv,.txt','aria-label':'Archivo con datos x,y'});
 archivo.addEventListener('change',async()=>{const f=archivo.files[0];if(!f)return;invalida();const actual=lectura;try{if(f.size>200000)throw new Error('El archivo supera 200 KB.');const txt=await f.text();if(!closed&&lectura===actual){entrada.value=txt;invalida();}}catch(e){cienciaAviso(estado,e);}});
 openModal({title:'Datos experimentales',size:'ciencia-modal',body:h('div',{class:'ciencia-layout ciencia-datos'},h('div',null,cienciaCampo('Título',titulo),h('p',{class:'hint'},'Dos columnas numéricas x,y. Coma, tabulador o punto y coma como separador; punto decimal. Hasta 2000 puntos.'),entrada,cienciaSelectorArchivo(archivo),cienciaCampo('Representación',tipo),cienciaCampo('Eje horizontal',x),cienciaCampo('Eje vertical',y),h('div',{class:'ciencia-acciones'},h('button',{class:'btn',onclick:()=>{if(busy)return;entrada.value='x,y\n0,0.02\n1,0.21\n2,0.43\n3,0.59\n4,0.82';titulo.value='Calibración · datos ilustrativos';dibujar();}},'Ejemplo: calibración'),h('button',{class:'btn',onclick:dibujar},'Dibujar gráfica'))),h('div',null,grafica,estado)),foot:[insertar],onclose:()=>{closed=true;if(window.Plotly)Plotly.purge(grafica);}});
 try{await cienciaJS('plotly');if(closed)return;estado.textContent='Pega tus datos o abre un archivo.';if(original?.cientifico){tipo.value=original.cientifico.modo;await dibujar();}}catch(e){if(!closed)cienciaAviso(estado,e);}
}
function cienciaFuenteValida(d){
 if(!d||d.v!==1)return false;
 const texto=(s,max)=>typeof s==='string'&&s.trim().length>0&&s.length<=max;
 if(d.tipo==='diagrama')return fuenteDiagramaValida(d.texto);
 if(d.tipo==='molecula')return texto(d.mol,250000);
 if(d.tipo==='3d')return texto(d.texto,500000)&&['xyz','sdf','pdb','mol2'].includes(d.formato)&&['stick','sphere','cartoon'].includes(d.estilo)&&(!d.vista||(Array.isArray(d.vista)&&d.vista.length===8&&d.vista.every(Number.isFinite)));
 if(d.tipo==='datos'){try{cienciaPuntos(d.texto);return ['markers','lines+markers'].includes(d.modo)&&typeof d.x==='string'&&d.x.length<=100&&typeof d.y==='string'&&d.y.length<=100;}catch{return false;}}
 return false;
}
function cienciaReabrir(b){if(b.locked){toast('Desbloquea la figura antes de editarla.');return;}if(!cienciaFuenteValida(b.cientifico)){toast('Los datos científicos no tienen un formato compatible. La imagen se conserva.');return;}const t=b.cientifico?.tipo;if(t==='molecula')openMoleculaLibre(b);else if(t==='3d')openMolecular3D(b);else if(t==='datos')openDatosLibres(b);else if(t==='diagrama')openDiagramaTexto(b);}

function cienciaIdiomaKekule(){
 const K=Kekule.Localization;
 K.addResource('en','WidgetTexts',{CAPTION_OK:'Aceptar',CAPTION_CANCEL:'Cancelar',CAPTION_YES:'Sí',CAPTION_NO:'No',HINT_CONFIG:'Configuración'});
 K.addResource('en','ChemWidgetTexts',{
 HINT_NEWDOC:'Nuevo documento',HINT_LOADDATA:'Cargar datos',HINT_SAVEFILE:'Guardar archivo',HINT_ZOOMIN:'Acercar',HINT_ZOOMOUT:'Alejar',HINT_UNDO:'Deshacer',HINT_REDO:'Rehacer',
 HINT_COPY:'Copiar selección',HINT_CUT:'Cortar selección',HINT_PASTE:'Pegar',HINT_TOGGLE_OBJ_INSPECTOR:'Mostrar propiedades',HINT_CONFIG:'Configuración',
 HINT_MANIPULATE:'Seleccionar',HINT_MANIPULATE_MARQUEE:'Selección rectangular',HINT_MANIPULATE_LASSO:'Selección con lazo',HINT_MANIPULATE_BRUSH:'Selección con pincel',HINT_MANIPULATE_ANCESTOR:'Seleccionar molécula',HINT_CLIENT_DRAGSCROLL:'Desplazar',HINT_TOGGLE_SELECT:'Alternar selección',
 HINT_ERASE:'Borrar',HINT_MOL_BOND:'Enlaces',HINT_MOL_BOND_SINGLE:'Enlace simple',HINT_MOL_BOND_DOUBLE:'Enlace doble',HINT_MOL_BOND_TRIPLE:'Enlace triple',HINT_MOL_BOND_WEDGEUP:'Cuña hacia delante',HINT_MOL_BOND_WEDGEDOWN:'Cuña hacia atrás',HINT_MOL_ATOM_AND_FORMULA:'Átomos y fórmulas',HINT_MOL_CHARGE:'Cargas',HINT_REPOSITORY_RING:'Anillos',HINT_REPOSITORY_ARROWLINE:'Flechas y símbolos',HINT_TEXT_IMAGE:'Texto e imagen',HINT_ZOOM_IN:'Acercar',HINT_ZOOM_OUT:'Alejar'
 });
}
