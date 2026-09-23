/* MIT License
 * Copyright (c) 2026 Erlen contributors
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

// Transport only. Each recipient owns schema validation, conversion and durable
// acceptance in its own library. SHA256 detects changes; it is not authentication.
export const TRANSFER_LIMIT=16*1024*1024;
export const TOTAL_LIMIT=64*1024*1024;
export const COUNT_LIMIT=50;
const DB='erlen-suite-exchange-v2';
const APPS=['slides','notes','documents','pentagrama','spreadsheets','figures','ftir','doe','xrd','lens'];
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const utf8=new TextEncoder();
const bytes=s=>utf8.encode(s).length;
const app=id=>{if(!APPS.includes(id))throw Error('Aplicación de intercambio no compatible.');};
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function jsonValue(value,parents=new Set(),depth=0){
 if(depth>80)throw Error('La copia tiene demasiados niveles de datos.');
 if(value===null||typeof value==='string'||typeof value==='boolean')return;
 if(typeof value==='number'&&Number.isFinite(value))return;
 if(typeof value!=='object'||parents.has(value))throw Error('La copia contiene datos que JSON no puede conservar.');
 if(!Array.isArray(value)&&![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw Error('La copia contiene un tipo de objeto no compatible.');
 parents.add(value);
 if(Array.isArray(value))for(let i=0;i<value.length;i++){if(!(i in value))throw Error('La copia contiene posiciones vacías no serializables.');jsonValue(value[i],parents,depth+1);}
 else for(const key of Object.keys(value))jsonValue(value[key],parents,depth+1);
 parents.delete(value);
}
function payloadValue(payload,source){
 jsonValue(payload);
 if(!object(payload)||payload.format!=='erlen-context-copy-v1'||!object(payload.source)||payload.source.tool!==source)throw Error('El contenido no corresponde al origen declarado.');
}
function bodyOf(t){
 app(t.source);app(t.target);
 if(t.version!==2||!UUID.test(t.id)||t.source===t.target||!Number.isSafeInteger(t.createdAt)||t.createdAt<0||typeof t.payloadJSON!=='string')throw Error('Copia de intercambio inválida.');
 return {version:2,id:t.id,source:t.source,target:t.target,createdAt:t.createdAt,payloadJSON:t.payloadJSON};
}
async function hash(body){
 if(!globalThis.crypto?.subtle)throw Error('Este navegador necesita una conexión segura para verificar copias.');
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',utf8.encode(JSON.stringify(body))))].map(b=>b.toString(16).padStart(2,'0')).join('');
}
export async function prepareTransfer({source,target,payload}){
 // Serialize before the first await: the editor can continue changing safely.
 app(source);app(target);payloadValue(payload,source);
 const body=bodyOf({version:2,id:crypto.randomUUID(),source,target,createdAt:Date.now(),payloadJSON:JSON.stringify(payload)});
 if(bytes(JSON.stringify({...body,sha256:'0'.repeat(64)}))>TRANSFER_LIMIT)throw Error('La copia supera 16 MiB. Reduce la selección o descarga un archivo.');
 return {...body,sha256:await hash(body)};
}
export async function verifyTransfer(record,target){
 if(!object(record))throw Error('Copia de intercambio inválida.');
 const t=structuredClone(record);
 if(Object.keys(t).sort().join(',')!=='createdAt,id,payloadJSON,sha256,source,target,version'||typeof t.sha256!=='string'||!/^[a-f0-9]{64}$/.test(t.sha256)||bytes(JSON.stringify(t))>TRANSFER_LIMIT)throw Error('Copia dañada o demasiado grande.');
 const body=bodyOf(t);app(target);
 if(t.target!==target||t.sha256!==await hash(body))throw Error('La copia cambió o está dirigida a otra aplicación.');
 const payload=JSON.parse(t.payloadJSON);payloadValue(payload,t.source);
 return {...t,payload};
}
function open(indexedDB){
 if(!indexedDB)throw Error('Este navegador no permite guardar el intercambio. Descarga una copia.');
 return new Promise((resolve,reject)=>{
  const r=indexedDB.open(DB,1);let blocked=false;
  r.onupgradeneeded=()=>{r.result.createObjectStore('transfers',{keyPath:'id'});r.result.createObjectStore('index',{keyPath:'id'});};
  r.onblocked=()=>{blocked=true;reject(Error('Otra pestaña bloquea el intercambio. Ciérrala y reintenta.'));};
  r.onerror=()=>reject(r.error||Error('No se pudo abrir el intercambio.'));
  r.onsuccess=()=>{if(blocked){r.result.close();return;}r.result.onversionchange=()=>r.result.close();resolve(r.result);};
 });
}
export function createExchange(indexedDB=globalThis.indexedDB){
 async function transaction(mode,run){
  const db=await open(indexedDB);
  try{return await new Promise((resolve,reject)=>{
   const tx=db.transaction(['transfers','index'],mode);let result,failure;
   tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(failure||tx.error||Error('El intercambio se canceló; no se guardó la copia.'));tx.onerror=()=>{};
   const fail=error=>{failure=error;try{tx.abort();}catch{reject(error);}};
   try{run(tx,value=>{result=value;},fail);}catch(e){fail(e);}
  });}finally{db.close();}
 }
 async function storeTransfer(record){
  const checked=await verifyTransfer(record,record?.target);
  const {payload,...t}=checked,size=bytes(JSON.stringify(t));
  await transaction('readwrite',(tx,done,fail)=>{
   const transfers=tx.objectStore('transfers'),index=tx.objectStore('index');
   const existing=transfers.get(t.id);
   existing.onsuccess=()=>{
    if(existing.result){if(existing.result.sha256!==t.sha256){fail(Error('El identificador ya corresponde a otra copia.'));return;}done();return;}
    const query=index.getAll();query.onsuccess=()=>{
     const rows=query.result;
     if(rows.some(row=>!Number.isSafeInteger(row.bytes)||row.bytes<0)){fail(Error('El índice de copias no es válido; conserva un respaldo antes de repararlo.'));return;}
     if(rows.length>=COUNT_LIMIT||rows.reduce((n,row)=>n+row.bytes,0)+size>TOTAL_LIMIT){fail(Error('El intercambio admite 50 copias y 64 MiB. Respalda y elimina copias anteriores explícitamente antes de crear otra.'));return;}
     transfers.add(t);index.add({id:t.id,source:t.source,target:t.target,title:typeof payload.source.title==='string'?payload.source.title.slice(0,300):'Sin título',createdAt:t.createdAt,sha256:t.sha256,bytes:size});
    };
   };
  });
  return {id:t.id,source:t.source,target:t.target,createdAt:t.createdAt,sha256:t.sha256};
 }
 return {
  storeTransfer,
  async putTransfer(input){return storeTransfer(await prepareTransfer(input));},
  async getTransfer(id,target){
   app(target);if(!UUID.test(id))throw Error('Identificador de copia inválido.');
   const t=await transaction('readonly',(tx,done)=>{const r=tx.objectStore('transfers').get(id);r.onsuccess=()=>done(r.result);});
   if(!t)throw Error('Esta copia no está disponible en este navegador. Pide o descarga otra copia.');
   return verifyTransfer(t,target);
  },
  async listTransfers(){return transaction('readonly',(tx,done,fail)=>{const r=tx.objectStore('index').getAll();r.onsuccess=()=>{try{for(const row of r.result){app(row.source);app(row.target);if(!UUID.test(row.id)||!Number.isSafeInteger(row.createdAt)||row.createdAt<0||!Number.isSafeInteger(row.bytes)||row.bytes<0)throw Error('El índice de copias no es válido. No se modificaron los datos.');}done(r.result.sort((a,b)=>b.createdAt-a.createdAt));}catch(e){fail(e);}};});},
  async removeTransfer(id){
   if(!UUID.test(id))throw Error('Identificador de copia inválido.');
   return transaction('readwrite',(tx,done)=>{const store=tx.objectStore('transfers'),r=store.getKey(id);r.onsuccess=()=>{store.delete(id);tx.objectStore('index').delete(id);done(r.result!==undefined);};});
  }
 };
}
export const putTransfer=input=>createExchange().putTransfer(input);
export const getTransfer=(id,target)=>createExchange().getTransfer(id,target);
export const listTransfers=()=>createExchange().listTransfers();
// This removes only the transport copy. Never call it automatically on acceptance.
export const removeTransfer=id=>createExchange().removeTransfer(id);
