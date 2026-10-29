/* Basado en erlen-diseno 2.11.10, generado por @erlen/design/tools/generate;
   adaptación local para Tabula. */
// SPDX-License-Identifier: MIT
/* MIT License

Copyright (c) 2026 Erlen contributors
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
const colorTabula=(()=>{
// Los atributos conservan los nombres que resuelve la hoja de diseño. Solo cambian
// el cromo de la aplicación, no el contenido ni los colores de las diapositivas.
const colores=[
 {id:'verde',nombre:'Jade'},
 {id:'violeta',nombre:'Iris'},
 {id:'azul',nombre:'Hielo'},
 {id:'cobre',nombre:'Champagne'},
 {id:'platino',nombre:'Platino'}
];
const estilos=[
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
const claveColor='tabula.apariencia.color',claveEstilo='tabula.apariencia.estilo';
const memoriaColor=new WeakMap(),memoriaEstilo=new WeakMap(),inicializadas=new WeakSet();
const colorValido=v=>colores.some(x=>x.id===v);
const estiloValido=v=>estilos.some(x=>x.id===v);

// Copia puntual, solo si falta la clave propia. Guardar también los valores de
// fábrica evita volver a consultar las claves antiguas en arranques posteriores.
// Nunca se modifican ni eliminan las preferencias compartidas.
function inicia(ventana){
 if(inicializadas.has(ventana))return;
 inicializadas.add(ventana);
 for(const [clave,anterior,valido,defecto,memoria] of [
  [claveColor,'erlen-color',colorValido,'verde',memoriaColor],
  [claveEstilo,'erlen-estilo',estiloValido,'original',memoriaEstilo]
 ]){
  try{
   const almacen=ventana.localStorage;
   if(almacen.getItem(clave)!==null)continue;
   const legado=almacen.getItem(anterior);
   const valor=valido(legado)?legado:defecto;
   memoria.set(ventana,valor);
   try{almacen.setItem(clave,valor);if(almacen.getItem(clave)===valor)memoria.delete(ventana);}catch{}
  }catch{}
 }
}
function leer(ventana,clave,valido,defecto,memoria){
 inicia(ventana);
 if(memoria.has(ventana))return memoria.get(ventana);
 try{const valor=ventana.localStorage.getItem(clave);if(valido(valor))return valor;}catch{}
 return defecto;
}
function guardar(ventana,clave,valor,memoria){
 // Iniciar antes de guardar para no migrar encima de la elección del usuario.
 inicia(ventana);
 memoria.set(ventana,valor);
 try{const almacen=ventana.localStorage;almacen.setItem(clave,valor);if(almacen.getItem(clave)===valor)memoria.delete(ventana);}catch{}
}
const api={
 colores,estilos,
 leer(ventana){return leer(ventana,claveColor,colorValido,'verde',memoriaColor);},
 aplicar(ventana){
  const color=this.leer(ventana),raiz=ventana.document.documentElement;
  if(color==='verde')delete raiz.dataset.erlenColor;
  else raiz.dataset.erlenColor=color;
  return color;
 },
 guardar(ventana,color){
  if(!colorValido(color))throw new Error('Tabula: color desconocido: '+color);
  guardar(ventana,claveColor,color,memoriaColor);
  this.aplicar(ventana);
  ventana.dispatchEvent(new ventana.Event('tabula-color'));
 },
 leerEstilo(ventana){return leer(ventana,claveEstilo,estiloValido,'original',memoriaEstilo);},
 aplicarEstilo(ventana){
  const estilo=this.leerEstilo(ventana),raiz=ventana.document.documentElement;
  if(estilo==='original')delete raiz.dataset.erlenEstilo;
  else raiz.dataset.erlenEstilo=estilo;
  return estilo;
 },
 guardarEstilo(ventana,estilo){
  if(!estiloValido(estilo))throw new Error('Tabula: estilo desconocido: '+estilo);
  guardar(ventana,claveEstilo,estilo,memoriaEstilo);
  this.aplicarEstilo(ventana);
  ventana.dispatchEvent(new ventana.Event('tabula-estilo'));
 }
};
if(typeof window!=='undefined'){
 api.aplicar(window);
 api.aplicarEstilo(window);
 window.addEventListener('storage',evento=>{
  // Ignorar sessionStorage y todas las claves que no pertenecen a Tabula.
  if(evento.storageArea){try{if(evento.storageArea!==window.localStorage)return;}catch{return;}}
  if(evento.key===claveColor||evento.key===null){
   if(evento.key===claveColor){try{window.localStorage.getItem(claveColor);memoriaColor.delete(window);}catch{}}
   api.aplicar(window);window.dispatchEvent(new window.Event('tabula-color'));
  }
  if(evento.key===claveEstilo||evento.key===null){
   if(evento.key===claveEstilo){try{window.localStorage.getItem(claveEstilo);memoriaEstilo.delete(window);}catch{}}
   api.aplicarEstilo(window);window.dispatchEvent(new window.Event('tabula-estilo'));
  }
 });
}
return api;})();
