/* Prepare deterministic, local-only scenes; excluded from release archives. */
import {readFileSync,writeFileSync} from 'node:fs';
const dir=new URL('../public/',import.meta.url),base=readFileSync(new URL('index.html',dir),'utf8');
const scenes={editor:"wsNueva(EJEMPLOS[0].build());S.cur=3;renderAll();",quimica:"wsNueva(EJEMPLOS[5].build());S.cur=3;renderAll();",presentar:"wsNueva(EJEMPLOS[1].build());S.cur=3;renderAll();startPresent(true);",ejemplos:"wsInicio('plantillas');",movil:"wsNueva(EJEMPLOS[0].build());S.cur=3;renderAll();"};
for(const[name,js]of Object.entries(scenes)){const i=base.lastIndexOf('</body>');writeFileSync(new URL('_capture-'+name+'.html',dir),base.slice(0,i)+'<script>document.addEventListener("DOMContentLoaded",()=>{'+js+'});</script>'+base.slice(i));}
