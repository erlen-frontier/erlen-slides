/* SPDX-License-Identifier: AGPL-3.0-only */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';

test('free canvas uses real slide geometry in Chromium', {timeout:120000}, async t => {
  const bin = process.env.ERLEN_CHROMIUM || '/usr/bin/chromium';
  if (!existsSync(bin)) { t.skip('Set ERLEN_CHROMIUM to run browser validation.'); return; }
  const port = Number(process.env.ERLEN_LIENZO_TEST_PORT || 4219);
  const server = spawn(process.execPath, [fileURLToPath(new URL('../herramientas/serve.mjs', import.meta.url))],
    {env:{...process.env, PORT:String(port)}, stdio:['ignore','pipe','pipe']});
  t.after(() => server.kill());
  await new Promise((ok, fail) => { server.stdout.once('data', ok); server.once('error', fail); server.once('exit', c => fail(new Error('Server exited: ' + c))); });
  const browser = await chromium.launch({executablePath:bin,args:['--no-sandbox']});
  t.after(() => browser.close());
  const page = await browser.newPage({viewport:{width:1440,height:1000}}), errores = [];
  page.on('pageerror', e => errores.push(e.message));
  await page.goto('http://127.0.0.1:' + port + '/');
  await page.evaluate(() => {
    const d=blankDeck(), sl={id:'lienzo-prueba',layout:'blanco',title:'Título oculto',notes:'Notas conservadas',blocks:[]};
    const texto=newBlock('text'); Object.assign(texto,{id:'texto-prueba',text:'Texto ilustrativo'});
    const imagen=newBlock('image'); Object.assign(imagen,{id:'imagen-prueba',src:'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="200"%3E%3Crect width="400" height="200" fill="%23000"/%3E%3C/svg%3E',alt:'Imagen ilustrativa'});
    sl.blocks.push(texto,imagen); d.slides.push(sl); wsNueva(d); S.cur=1; renderAll();
  });
  const texto=page.locator('#stageInner .blk[data-bid="texto-prueba"]');
  const antes=await texto.boundingBox();
  await page.locator('#lienzoLibreBtn').click();
  const despues=await texto.boundingBox();
  assert.ok(Math.abs(antes.x-despues.x)<2 && Math.abs(antes.y-despues.y)<2, JSON.stringify({antes,despues}));
  assert.ok(Math.abs(antes.width-despues.width)<2 && Math.abs(antes.height-despues.height)<2, JSON.stringify({antes,despues}));

  await texto.click();
  const asa=page.locator('#stageInner .blk[data-bid="texto-prueba"] .tb-asa');
  const punto=await asa.boundingBox(), slide=await page.locator('#stageInner .slide').boundingBox();
  const p0=await page.evaluate(() => ({...curSlide().blocks[0].posLibre}));
  await page.mouse.move(punto.x+punto.width/2,punto.y+punto.height/2);
  await page.mouse.down(); await page.mouse.move(punto.x+punto.width/2-slide.width*0.02,punto.y+punto.height/2+slide.height*0.04,{steps:5}); await page.mouse.up();
  const p1=await page.evaluate(() => ({...curSlide().blocks[0].posLibre}));
  assert.ok(Math.abs(p1.x-p0.x+2)<0.1 && Math.abs(p1.y-p0.y-4)<0.1, JSON.stringify({p0,p1}));
  await page.evaluate(() => doUndo());
  assert.deepEqual(await page.evaluate(() => ({...curSlide().blocks[0].posLibre})),p0);

  await texto.click();
  const handle=await page.locator('#stageInner .blk[data-bid="texto-prueba"] .libre-se').boundingBox();
  await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);
  await page.mouse.down(); await page.mouse.move(handle.x+handle.width/2+20,handle.y+handle.height/2+20,{steps:3});
  await page.keyboard.press('Escape'); await page.mouse.up();
  assert.deepEqual(await page.evaluate(() => ({...curSlide().blocks[0].posLibre})),p0);

  const esquina=await page.locator('#stageInner .blk[data-bid="texto-prueba"] .libre-se').boundingBox();
  await page.mouse.move(esquina.x+esquina.width/2,esquina.y+esquina.height/2);
  await page.mouse.down(); await page.mouse.move(esquina.x+esquina.width/2-slide.width*0.03,esquina.y+esquina.height/2+slide.height*0.03,{steps:5}); await page.mouse.up();
  const grande=await page.evaluate(() => ({...curSlide().blocks[0].posLibre}));
  assert.ok(Math.abs(grande.w-p0.w+3)<0.1 && Math.abs(grande.h-p0.h-3)<0.1,JSON.stringify({p0,grande}));
  await page.evaluate(() => doUndo());
  assert.deepEqual(await page.evaluate(() => ({...curSlide().blocks[0].posLibre})),p0);

  const medidas=await page.evaluate(async () => {
    const b=curSlide().blocks[1]; b.posLibre={x:10,y:60,w:30,h:10}; renderAll();
    await document.querySelector('#stageInner .blk[data-bid="imagen-prueba"] img').decode();
    const el=document.querySelector('#stageInner .blk[data-bid="imagen-prueba"]'), im=el.querySelector('img');
    const caja=el.getBoundingClientRect(), imagen=im.getBoundingClientRect();
    return {caja:{w:caja.width,h:caja.height},imagen:{w:imagen.width,h:imagen.height},src:b.src};
  });
  assert.ok(medidas.imagen.h<=medidas.caja.h+1,JSON.stringify(medidas));
  assert.ok(Math.abs(medidas.imagen.w/medidas.imagen.h-2)<0.02,JSON.stringify(medidas));
  assert.match(medidas.src,/data:image\/svg\+xml/);
  const modos=await page.evaluate(async () => {
    S.deck.meta.aspect='43';
    const s=curSlide(); s.blocks[0].posLibre={x:10,y:20,w:35,h:15};
    const chart=newBlock('chart'); Object.assign(chart,{id:'chart-prueba',data:'x,y\n1,2\n3,4',fuente:{nombre:'datos.csv',n:2},posLibre:{x:50,y:50,w:40,h:35}}); s.blocks.push(chart);
    const originales=JSON.stringify({data:chart.data,fuente:chart.fuente});
    const valores=[];
    for(const modo of ['edit','thumb','present','export']) {
      const r=renderSlide(S.deck,S.cur,modo,99); document.body.append(r);
      const a=r.getBoundingClientRect(), b=r.querySelector('[data-bid="texto-prueba"]').getBoundingClientRect();
      valores.push({x:100*(b.left-a.left)/a.width,y:100*(b.top-a.top)/a.height,w:100*b.width/a.width,h:100*b.height/a.height}); r.remove();
    }
    const ext=await extensionSlides('exportador'), pptx=await ext.creaPPTX(S.deck), html=await ext.creaHTML(S.deck);
    return {valores,originales,actuales:JSON.stringify({data:chart.data,fuente:chart.fuente}),avisos:pptx.avisos,html:await html.text()};
  });
  for(const p of modos.valores) for(const [k,v] of Object.entries({x:10,y:20,w:35,h:15})) assert.ok(Math.abs(p[k]-v)<0.1,JSON.stringify(p));
  assert.equal(modos.originales,modos.actuales);
  assert.ok(modos.avisos.some(a=>/posici[oó]n libre/i.test(a.motivo)),JSON.stringify(modos.avisos));
  const offline=await browser.newPage({viewport:{width:1440,height:1000}});
  await offline.setContent(modos.html,{waitUntil:'load'});
  await offline.waitForFunction(() => typeof presenter!=='undefined' && presenter.isReady());
  await offline.evaluate(() => presenter.slide(1));
  const exportado=await offline.evaluate(() => {
    const r=document.querySelector('.present .slide'), b=r.querySelector('[data-bid="texto-prueba"]'), a=r.getBoundingClientRect(), q=b.getBoundingClientRect();
    return {x:100*(q.left-a.left)/a.width,y:100*(q.top-a.top)/a.height,w:100*q.width/a.width,h:100*q.height/a.height};
  });
  for(const [k,v] of Object.entries({x:10,y:20,w:35,h:15})) assert.ok(Math.abs(exportado[k]-v)<0.1,JSON.stringify(exportado));
  await offline.close();
  await page.screenshot({path:'/tmp/tabula-lienzo-browser.png'});
  assert.deepEqual(errores,[]);
});
