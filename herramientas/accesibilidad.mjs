/* SPDX-License-Identifier: AGPL-3.0-only */
/* Auditoría axe del build (public/index.html) en un navegador real: pantalla de
   inicio, editor con un ejemplo abierto y el diálogo de ayuda, en claro y en
   oscuro. Falla con cualquier violación seria o crítica.

     npm run build && npx playwright-core install chromium && npm run accesibilidad

   Opciones: NAVEGADOR=firefox. Sirve public/ bajo /slides/, como el portal. */
import http from 'node:http';import {readFile,stat} from 'node:fs/promises';import {resolve,extname,join,sep} from 'node:path';import {fileURLToPath} from 'node:url';
import pw from 'playwright-core';import {AxeBuilder} from '@axe-core/playwright';
const root=fileURLToPath(new URL('../public/',import.meta.url));
const tipos={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.svg':'image/svg+xml','.woff2':'font/woff2'};
const servidor=http.createServer(async(q,r)=>{try{
 const ruta=decodeURIComponent(new URL(q.url,'http://x').pathname);
 if(!ruta.startsWith('/slides/')){r.writeHead(404).end();return;}
 let p=resolve(root,'.'+ruta.slice('/slides'.length));
 if(!p.startsWith(root.replace(/[\\/]$/,'')+sep)&&p!==root.replace(/[\\/]$/,'')){r.writeHead(403).end();return;}
 if((await stat(p)).isDirectory())p=join(p,'index.html');
 r.writeHead(200,{'content-type':tipos[extname(p)]||'application/octet-stream'}).end(await readFile(p));
}catch{r.writeHead(404).end();}});
await new Promise(ok=>servidor.listen(0,'127.0.0.1',ok));
const base=`http://127.0.0.1:${servidor.address().port}/slides/`;
const navegador=await pw[process.env.NAVEGADOR||'chromium'].launch();
const fallos=[];
async function audita(pagina,vista){
 const {violations}=await new AxeBuilder({page:pagina}).analyze();
 for(const v of violations.filter(v=>['serious','critical'].includes(v.impact)))
  fallos.push(`${vista}: ${v.id} (${v.impact}) en ${v.nodes.length} nodo(s): ${v.nodes.slice(0,3).map(n=>n.target.join(' ')).join(' | ')}`);
}
try{
 for(const esquema of ['light','dark']){
  const ctx=await navegador.newContext({viewport:{width:1440,height:900},colorScheme:esquema});
  ctx.setDefaultTimeout(90000);const pagina=await ctx.newPage();
  await pagina.goto(base);await pagina.waitForSelector('#inicioRoot main.erlen-inicio');
  await audita(pagina,`inicio (${esquema})`);
  await pagina.locator('.erlen-inicio-ejemplo button').first().click();await pagina.waitForSelector('#app:not([inert])');
  await audita(pagina,`editor (${esquema})`);
  await pagina.evaluate(()=>openHelp());await pagina.waitForSelector('.modal');
  await audita(pagina,`ayuda (${esquema})`);
  await ctx.close();
 }
}finally{await navegador.close();servidor.close();}
if(fallos.length){console.error('Violaciones axe serias o críticas:\n'+fallos.join('\n'));process.exit(1);}
console.log('axe: sin violaciones serias ni críticas en inicio, editor y ayuda (claro y oscuro).');
