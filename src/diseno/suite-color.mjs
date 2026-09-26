// Acento personal de Erlen. El CSS del portal y el paquete comparten estos cuatro nombres;
// cada uno fija colores legibles en claro y oscuro sin recolorear a Mey ni los documentos.
export const coloresErlen=['verde','violeta','azul','cobre'];
const clave='erlen-color';
const respaldo=new WeakMap();

export const erlenColor={
 leer(ventana){
  try{
   const almacen=ventana?.localStorage;
   if(almacen){const valor=almacen.getItem(clave);return coloresErlen.includes(valor)?valor:'verde';}
  }catch{}
  return respaldo.get(ventana)||'verde';
 },
 aplicar(ventana){
  const color=this.leer(ventana);
  if(color==='verde')delete ventana.document.documentElement.dataset.erlenColor;
  else ventana.document.documentElement.dataset.erlenColor=color;
  return color;
 },
 guardar(ventana,color){
  if(!coloresErlen.includes(color))throw new Error('erlen: color desconocido: '+color);
  try{ventana.localStorage.setItem(clave,color);respaldo.delete(ventana);}
  catch{respaldo.set(ventana,color);}
  this.aplicar(ventana);
  ventana.dispatchEvent(new ventana.Event('erlen-color'));
 }
};

if(typeof window!=='undefined'){
 erlenColor.aplicar(window);
 window.addEventListener('storage',evento=>{
  if(evento.key===clave||evento.key===null){erlenColor.aplicar(window);window.dispatchEvent(new Event('erlen-color'));}
 });
}
