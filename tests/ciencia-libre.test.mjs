import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import initRDKit from '@rdkit/rdkit';
import {Kekule} from 'kekule';
const source=readFileSync(new URL('../src/js/88c-ciencia-libre.js',import.meta.url),'utf8');
const worker=readFileSync(new URL('../web/quimica-worker.js',import.meta.url),'utf8');
const kit=await initRDKit();
const ctx=vm.createContext({});vm.runInContext(source,ctx);
const normal=x=>JSON.parse(JSON.stringify(x));

test('CSV admite encabezado, separadores y conserva orden y precisión',()=>{
 assert.deepEqual(normal(ctx.cienciaPuntos('x,y\n2;1.23e-4\n-1\t3.5\n')),[[2,.000123],[-1,3.5]]);
 for(const s of ['0,1\n2,','x,y\n0,1','0,NaN\n1,2','0,1,2\n2,3,4','0,Infinity\n1,2','x,valor\n0,1'])assert.throws(()=>ctx.cienciaPuntos(s));
});
test('Límite real de 2000 puntos con y sin encabezado',()=>{
 const datos=Array.from({length:2000},(_,i)=>`${i},${i}`).join('\n');
 assert.equal(ctx.cienciaPuntos(datos).length,2000);assert.equal(ctx.cienciaPuntos('x,y\n'+datos).length,2000);
 assert.throws(()=>ctx.cienciaPuntos(datos+'\n2000,2000'));assert.throws(()=>ctx.cienciaPuntos('x,y\n'+datos+'\n2000,2000'));
 assert.throws(()=>ctx.cienciaPuntos(' '.repeat(200001)));
});
test('RDKit y Kekule conservan identidad, estereoquímica, carga e isótopos',()=>{
 for(const s of ['CC(=O)Oc1ccccc1C(=O)O','C[C@H](O)C(=O)O','[13CH3][NH3+]']){
  const mol=kit.get_mol(s);let obj,back;
  try{mol.set_new_coords();obj=Kekule.IO.loadFormatData(mol.get_molblock(),'mol');back=kit.get_mol(Kekule.IO.saveFormatData(obj,'mol'));assert.ok(back.is_valid());assert.equal(back.get_smiles(),mol.get_smiles());}
  finally{mol.delete();obj?.finalize();back?.delete();}
 }
});
async function analiza(data){
 let resultado;const w=vm.createContext({URL,Error,importScripts:()=>{},initRDKitModule:async()=>kit,self:{location:{href:'https://erlen.test/libre/quimica-worker.js'},postMessage:x=>resultado=x}});
 vm.runInContext(worker,w);await w.self.onmessage({data});return resultado;
}
test('Motor devuelve descriptores reales de aspirina y rechaza estructuras inválidas',async()=>{
 const r=await analiza('CC(=O)Oc1ccccc1C(=O)O');assert.equal(r.ok,true);assert.ok(Math.abs(r.descriptores.amw-180.159)<.001);assert.equal(r.descriptores.NumHBD,1);assert.equal(r.descriptores.NumHBA,3);assert.match(r.svg,/<svg/);
 assert.equal((await analiza('')).ok,false);assert.equal((await analiza('C(C)(C)(C)(C)C')).ok,false);assert.equal((await analiza('C'.repeat(250001))).ok,false);
});
test('Analizar un MOL conserva las coordenadas elegidas por el usuario',async()=>{
 const mol=kit.get_mol('CCO');let input;
 try{mol.set_new_coords();input=mol.get_molblock();}finally{mol.delete();}
 const r=await analiza(input);assert.equal(r.ok,true);assert.equal(r.mol,input);
});
test('Reapertura rechaza fuentes incompatibles sin destruir la imagen',()=>{
 const good={v:1,tipo:'datos',texto:'0,1\n1,2',x:'Tiempo',y:'Señal',modo:'markers'};
 assert.equal(ctx.cienciaFuenteValida(normal(good)),true);
 for(const d of [{...good,v:2},{...good,texto:'no'},{...good,modo:'execute'},null,{v:1,tipo:'3d',texto:'x',formato:'url',estilo:'stick'},{v:1,tipo:'3d',texto:'x',formato:'xyz',estilo:'stick',vista:[Infinity]}])assert.equal(ctx.cienciaFuenteValida(d),false);
 let aviso;ctx.toast=x=>aviso=x;const b={src:'data:image/png;base64,imagen',cientifico:{v:99,tipo:'otro'}};
 ctx.cienciaReabrir(b);assert.equal(b.src,'data:image/png;base64,imagen');assert.ok(aviso);
});
test('Actualizar conserva el bloque y sus datos serializables, elimina el recorte anterior',()=>{
 const b={id:'b',type:'image',src:'anterior',orig:'recorte anterior',recProp:{x:1},caption:'Pie del usuario',w:55};const deck={slides:[{blocks:[b]}]};
 Object.assign(ctx,{S:{deck},findBlock:()=>({block:b}),deepCopy:normal,closeModal:()=>{},commit:()=>{},renderAll:()=>{},toast:()=>{}});
 const d={v:1,tipo:'datos',texto:'0,1\n1,2',x:'x',y:'y',modo:'markers'};
 ctx.cienciaInserta('data:image/png;base64,nueva',d,'Título',b,deck);d.texto='cambio externo';
 const restaurado=normal(deck).slides[0].blocks[0];assert.equal(restaurado.cientifico.texto,'0,1\n1,2');assert.equal(restaurado.caption,'Pie del usuario');assert.equal(restaurado.w,55);assert.equal(restaurado.orig,undefined);assert.equal(restaurado.recProp,undefined);
 const previo=JSON.stringify(b);assert.throws(()=>ctx.cienciaInserta('data:image/png;base64,nueva',d,'Título',b,{}));assert.equal(JSON.stringify(b),previo);
});
test('Cambiar la imagen elimina la fuente científica y descarta cargas de otra presentación',()=>{
 let input,reader;const b={id:'b',src:'vieja',cientifico:{tipo:'molecula'},orig:'recorte',recProp:{x:1}};
 const slide={};const c=vm.createContext({S:{deck:{}},curSlide:()=>slide,$:()=>input,h:()=>input={files:[{size:10,type:'image/png'}],addEventListener:(_,fn)=>input.change=fn,click:()=>{}},document:{body:{append:()=>{}}},FileReader:class{constructor(){reader=this;}readAsDataURL(){this.result='data:image/png;base64,nueva';}},findBlock:()=>({block:b}),commit:()=>{},disenadorAlPonerImagen:()=>{}});
 const editor=readFileSync(new URL('../src/js/05-editor.js',import.meta.url),'utf8');vm.runInContext('let _imgTargetId=null;\n'+editor.match(/function pickImage\([\s\S]*?\n\}/)[0],c);
 c.pickImage(b);input.change();reader.onload();assert.equal(b.cientifico,undefined);assert.equal(b.orig,undefined);assert.equal(b.src,'data:image/png;base64,nueva');
 c.pickImage(b);input.change();c.S.deck={};reader.result='otra imagen';reader.onload();assert.equal(b.src,'data:image/png;base64,nueva');
});
test('El historial comparte fuentes científicas y distingue colisiones de huella',()=>{
 const state=readFileSync(new URL('../src/js/03-state.js',import.meta.url),'utf8');
 const c=vm.createContext({S:{undo:[],redo:[]}});vm.runInContext(state.slice(state.indexOf('const MEDIOS ='),state.indexOf('/* ---------- historial ---------- */')),c);
 const texto='C'.repeat(400000),otro=texto.slice(0,10000)+'N'+texto.slice(10001);
 const deck={cientifico:{v:1,tipo:'3d',texto}};const a=c.snapDeck(deck),b=c.snapDeck({...deck,cientifico:{...deck.cientifico,texto:otro}});
 assert.ok(a.length<200);assert.notEqual(a,b);assert.equal(c.abreSnap(a).cientifico.texto,texto);assert.equal(c.abreSnap(b).cientifico.texto,otro);
 for(let i=0;i<150;i++)c.S.undo.push(c.snapDeck({...deck,title:String(i)}));
 assert.ok(c.memoriaHistorial()<1);c.S.undo=[a];c.S._snap=a;c.recortaHistorial();assert.equal(c.pesoMedios(),texto.length);
});
