/* SPDX-License-Identifier: AGPL-3.0-only */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn, spawnSync} from 'node:child_process';
import {existsSync, mkdtempSync, readFileSync, rmSync} from 'node:fs';
import https from 'node:https';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';

test('the cloud chat creates a presentation and can undo it in Chromium', {timeout:120000}, async t => {
  const bin = process.env.ERLEN_CHROMIUM || '/usr/bin/chromium';
  if (!existsSync(bin) || spawnSync('openssl',['version']).status !== 0) {t.skip('Chromium and openssl are needed for this test.'); return;}
  const dir = mkdtempSync(join(tmpdir(), 'tabula-agente-'));
  t.after(() => rmSync(dir,{recursive:true,force:true}));
  const key=join(dir,'key.pem'), cert=join(dir,'cert.pem');
  const generated=spawnSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-keyout',key,'-out',cert,
    '-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{encoding:'utf8'});
  assert.equal(generated.status,0,generated.stderr);
  const requests=[];
  const provider=https.createServer({key:readFileSync(key),cert:readFileSync(cert)},(req,res)=>{
    const headers={'access-control-allow-origin':'*','access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'content-type, authorization','content-type':'application/json'};
    if(req.method==='OPTIONS'){res.writeHead(204,headers);res.end();return;}
    let data='';req.on('data',chunk=>data+=chunk);req.on('end',()=>{
      const body=JSON.parse(data); requests.push(body);
      const tool=(id,name,args)=>({id,type:'function',function:{name,arguments:JSON.stringify(args)}});
      const done=body.messages.some(m=>m.role==='tool');
      const message=done?{role:'assistant',content:'Preparé la presentación ilustrativa.'}:{role:'assistant',content:null,tool_calls:[
        tool('metadatos','editar_metadatos',{cambios:{titulo:'Presentación ilustrativa'}}),
        tool('diapositivas','agregar_diapositivas',{diapositivas:[
          {diseno:'content',titulo:'Primera idea',zonas:[[{tipo:'text',text:'Texto ilustrativo'}]]},
          {diseno:'content',titulo:'Segunda idea',zonas:[[{tipo:'text',text:'Evidencia ilustrativa'}]]}
        ]})]};
      res.writeHead(200,headers);res.end(JSON.stringify({choices:[{message}]}));
    });
  });
  await new Promise((resolve,reject)=>{provider.once('error',reject);provider.listen(0,'127.0.0.1',resolve);});
  t.after(()=>new Promise(resolve=>provider.close(resolve)));
  const port=Number(process.env.ERLEN_AGENT_TEST_PORT||4220);
  const server=spawn(process.execPath,[fileURLToPath(new URL('../herramientas/serve.mjs',import.meta.url))],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
  t.after(()=>server.kill());
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',c=>reject(new Error('Server exited: '+c)));});
  const browser=await chromium.launch({executablePath:bin,args:['--no-sandbox']}); t.after(()=>browser.close());
  const context=await browser.newContext({viewport:{width:1440,height:1000},ignoreHTTPSErrors:true});
  const page=await context.newPage(), errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+port+'/');
  await page.evaluate(()=>{wsNueva();window.__before=JSON.stringify(S.deck);abreAsistente();});
  await page.getByRole('tab',{name:'Conversar con IA'}).click();
  await page.locator('.agente-conexion summary').click();
  await page.getByLabel('Endpoint de Chat Completions').fill('https://127.0.0.1:'+provider.address().port+'/v1/chat/completions');
  await page.getByLabel('Modelo de IA').fill('modelo-ilustrativo');
  await page.getByLabel('Clave de sesión').fill('clave-de-prueba');
  await page.getByLabel('Mensaje para la IA').fill('Crea dos diapositivas ilustrativas');
  await page.getByRole('button',{name:'Enviar a la IA'}).click();
  await page.getByText('Cambios aplicados en un solo paso.',{exact:false}).waitFor({timeout:30000});
  const result=await page.evaluate(()=>({title:S.deck.meta.title,slides:S.deck.slides.map(s=>s.title),content:S.deck.slides.flatMap(s=>zonas(s).flat()).map(b=>b.text||'')}));
  assert.equal(result.title,'Presentación ilustrativa');
  assert.ok(result.slides.includes('Primera idea') && result.slides.includes('Segunda idea'));
  assert.ok(result.content.includes('Texto ilustrativo'));
  assert.equal(requests.length,2);
  assert.equal(await page.evaluate(()=>{doUndo();return JSON.stringify(S.deck)===__before;}),true);
  assert.deepEqual(errors,[]);
});
