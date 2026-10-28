/* erlen-diseno 2.11.10 · generado por @erlen/design/tools/generate; no editar a mano */
const erlenColor=(()=>{
// Acento personal de Erlen y tema claro/oscuro/sistema. El CSS del portal y el paquete comparten
// estos nombres; cada uno fija colores legibles en claro y oscuro sin recolorear a Mey ni los
// documentos. Importarlo una vez desde la app junto a tokens.css: aplica las preferencias al
// cargar y las sincroniza entre pestañas del mismo origen. Claves de almacenamiento y respaldo en
// memoria cuando el almacenamiento está bloqueado: nunca falla ni pide permisos. El tema escribe
// data-theme en <html> y lo resuelven los tokens existentes (tokens.css); no se crea ningún
// almacenamiento sincronizado entre orígenes. La clave del tema es opt-in: mientras la app no
// guarde una preferencia con guardarTema, este módulo no toca data-theme y el tema sigue siendo
// de la app (muchas ya escriben data-theme desde su propio almacén).
const coloresErlen=['verde','violeta','azul','cobre','platino'];
const temasErlen=['sistema','claro','oscuro'];
// Materiales opcionales del cromo. Original no añade ningún atributo ni cambia el tema,
// la paleta o el contenido. Los nombres son también el catálogo de los controles.
const estilosErlen=[
 {id:'original',nombre:'Original'},
 {id:'glassmorfismo',nombre:'Glassmorfismo'},
 {id:'neumorfismo',nombre:'Neumorfismo'},
 {id:'neobrutalismo',nombre:'Neobrutalismo'},
 {id:'minimalismo',nombre:'Minimalismo'},
 {id:'art-deco',nombre:'Art déco'},
 {id:'claymorfismo',nombre:'Claymorfismo'},
 {id:'bauhaus',nombre:'Bauhaus'},
 {id:'frutiger-aero',nombre:'Frutiger Aero'},
 {id:'esqueuomorfismo',nombre:'Esqueuomorfismo'},
 {id:'retro-digital',nombre:'Retro digital'},
 {id:'y2k',nombre:'Y2K'},
 {id:'cyberpunk',nombre:'Cyberpunk'},
 {id:'blueprint',nombre:'Blueprint'}
];
const clave='erlen-color';
const claveTema='erlen-tema';
const claveEstilo='erlen-estilo';
// Los IIFE de menú, marco y color pueden coexistir: comparten el respaldo y un solo
// listener por ventana, incluso con localStorage bloqueado.
const memoriaEstilo=Symbol.for('erlen.estilo.memoria');
const escuchaColor=Symbol.for('erlen.color.escucha');
const respaldo=Symbol.for('erlen.color.memoria');
const respaldoTema=Symbol.for('erlen.tema.memoria');

const erlenColor={
 estilos:estilosErlen,
 leer(ventana){
  if(ventana?.[respaldo])return ventana[respaldo];
  try{
   const almacen=ventana?.localStorage;
   if(almacen){const valor=almacen.getItem(clave);return coloresErlen.includes(valor)?valor:'verde';}
  }catch{}
  return 'verde';
 },
 aplicar(ventana){
  const color=this.leer(ventana);
  if(color==='verde')delete ventana.document.documentElement.dataset.erlenColor;
  else ventana.document.documentElement.dataset.erlenColor=color;
  return color;
 },
 guardar(ventana,color){
  if(!coloresErlen.includes(color))throw new Error('erlen: color desconocido: '+color);
  try{ventana.localStorage.setItem(clave,color);delete ventana[respaldo];}
  catch{ventana[respaldo]=color;}
  this.aplicar(ventana);
  ventana.dispatchEvent(new ventana.Event('erlen-color'));
 },
 leerTema(ventana){
  // Preferencia compartida guardada, o null si la app aún no usa esta clave: en ese caso el
  // tema lo sigue resolviendo la propia app y este módulo no toca data-theme.
  if(ventana?.[respaldoTema])return ventana[respaldoTema];
  try{
   const almacen=ventana?.localStorage;
   if(almacen){const valor=almacen.getItem(claveTema);return valor===null?null:(temasErlen.includes(valor)?valor:null);}
  }catch{}
  return null;
 },
 aplicarTema(ventana){
  const tema=this.leerTema(ventana);
  if(tema===null)return null;
  if(tema==='sistema')delete ventana.document.documentElement.dataset.theme;
  else ventana.document.documentElement.dataset.theme=tema==='claro'?'light':'dark';
  return tema;
 },
 guardarTema(ventana,tema){
  if(!temasErlen.includes(tema))throw new Error('erlen: tema desconocido: '+tema);
  try{ventana.localStorage.setItem(claveTema,tema);delete ventana[respaldoTema];}
  catch{ventana[respaldoTema]=tema;}
  this.aplicarTema(ventana);
  ventana.dispatchEvent(new ventana.Event('erlen-tema'));
 },
 leerEstilo(ventana){
  let valor;
  try{valor=ventana?.localStorage?.getItem(claveEstilo);}catch{}
  valor=ventana?.[memoriaEstilo]??valor;
  return estilosErlen.some(estilo=>estilo.id===valor)?valor:'original';
 },
 aplicarEstilo(ventana){
  const estilo=this.leerEstilo(ventana);
  const raiz=ventana?.document?.documentElement;
  if(raiz){
   if(estilo==='original')delete raiz.dataset.erlenEstilo;
   else raiz.dataset.erlenEstilo=estilo;
  }
  return estilo;
 },
 guardarEstilo(ventana,estilo){
  if(!estilosErlen.some(opcion=>opcion.id===estilo))throw new Error('erlen: estilo desconocido: '+estilo);
  try{ventana.localStorage.setItem(claveEstilo,estilo);delete ventana[memoriaEstilo];}
  catch{ventana[memoriaEstilo]=estilo;}
  this.aplicarEstilo(ventana);
  ventana.dispatchEvent(new ventana.Event('erlen-estilo'));
 }
};

if(typeof window!=='undefined'){
 erlenColor.aplicar(window);
 erlenColor.aplicarTema(window);
 erlenColor.aplicarEstilo(window);
 if(!window[escuchaColor]){
 window[escuchaColor]=true;
 window.addEventListener('storage',evento=>{
  if(evento.key===clave||evento.key===null){delete window[respaldo];erlenColor.aplicar(window);window.dispatchEvent(new Event('erlen-color'));}
  if(evento.key===claveTema||evento.key===null){delete window[respaldoTema];erlenColor.aplicarTema(window);window.dispatchEvent(new Event('erlen-tema'));}
  if(evento.key===claveEstilo||evento.key===null){
   delete window[memoriaEstilo];
   erlenColor.aplicarEstilo(window);window.dispatchEvent(new Event('erlen-estilo'));
  }
 });
 }
}

return erlenColor;})();
