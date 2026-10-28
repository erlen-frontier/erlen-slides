/* SPDX-License-Identifier: AGPL-3.0-only */
import {mkdirSync,writeFileSync} from 'node:fs';import {editor} from './test-browser.mjs';
const {dom,errors,run}=await editor();
try{
 if(errors.length)throw Error(errors.join('\n'));
 const examples=run('EJEMPLOS.map(e=>({id:e.id,title:e.n,description:e.d,question:e.question,check:e.check,deck:e.build()}))');
 for(const e of examples){
  const dir=new URL('../examples/'+e.id+'/',import.meta.url);mkdirSync(dir,{recursive:true});
  let count=0;function stable(v){if(Array.isArray(v))return v.map(stable);if(v&&typeof v==='object'){const out={};for(const[k,x]of Object.entries(v))out[k]=k==='id'?'example-'+e.id+'-'+(++count):stable(x);return out;}return v;}
  e.deck=stable(e.deck);writeFileSync(new URL('proyecto.json',dir),JSON.stringify(e.deck,null,2)+'\n');
  dom.window.__example=e.deck;const tex=run('toBeamer(__example)');writeFileSync(new URL('presentacion.tex',dir),tex);
  writeFileSync(new URL('README.md',dir),'# '+e.title+'\n\n'+e.description+'\n\n**Caso didáctico, datos ilustrativos.** No se ha realizado un experimento para este ejemplo. Los modelos analíticos, cuando existen, aparecen junto a la gráfica.\n\n## Uso real\n\n'+e.question+'\n\n1. Inicia Tabula y abre «Ejemplos editables → '+e.title+'», o importa [proyecto.json](proyecto.json).\n2. Recorre las seis diapositivas: pregunta, estrategia, evidencia, límites y comprobaciones.\n3. Sustituye mediciones y metadatos por los de tu investigación; revisa unidades, controles e incertidumbre.\n4. Edita los bloques desde el panel derecho. Las tablas, ecuaciones y datos de las gráficas siguen siendo editables.\n5. Guarda el proyecto JSON; ensaya con Presentar y descarga PDF o PowerPoint para compartir.\n\n## Antes de presentar\n\n'+e.check.map(t=>'- '+t).join('\n')+'\n\n## Archivos\n\n- [Proyecto editable](proyecto.json): formato Erlen v1.\n- [Fuente Beamer](presentacion.tex): generado por el exportador; requiere una instalación de LaTeX. Su compilación no forma parte de la validación de esta versión.\n\nLicencia de los ejemplos: AGPL-3.0-only. No hay referencias bibliográficas inventadas.\n');
 }
 writeFileSync(new URL('../examples/catalog.json',import.meta.url),JSON.stringify(examples.map(({id,title,description})=>({id,title,description,file:id+'/proyecto.json',slides:6,data:'illustrative'})),null,2)+'\n');
 console.log('Generated '+examples.length+' editable projects and Beamer sources.');
 if(errors.length)throw Error(errors.join('\n'));
}finally{dom.window.close();}
