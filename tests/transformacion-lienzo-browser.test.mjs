/* SPDX-License-Identifier: AGPL-3.0-only */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';

async function prepara(t, port) {
  const bin=process.env.ERLEN_CHROMIUM || '/usr/bin/chromium';
  if (!existsSync(bin)) { t.skip('Chromium is required.'); return null; }
  const server=spawn(process.execPath,[fileURLToPath(new URL('../herramientas/serve.mjs',import.meta.url))],
    {env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
  t.after(()=>server.kill());
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',c=>reject(new Error('Server exited: '+c)));});
  const browser=await chromium.launch({executablePath:bin,args:['--no-sandbox']}); t.after(()=>browser.close());
  const page=await browser.newPage({viewport:{width:1440,height:1000}}), errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(7000);
  await page.goto('http://127.0.0.1:'+port+'/');
  await page.evaluate(()=>{
    const d=blankDeck(), sl={id:'slide',layout:'blanco',title:'',lienzoLibre:true,blocks:[]};
    const b=newBlock('image');Object.assign(b,{id:'figura',alt:'Figura ilustrativa',caption:'Pie legible',w:100,
      src:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="200" height="200" fill="red"/><rect x="200" width="200" height="200" fill="blue"/></svg>'),
      posLibre:{x:10,y:20,w:40,h:30}});
    sl.blocks.push(b);d.slides.push(sl);wsNueva(d);S.cur=1;S.prefs.imanLienzo=false;snapNow();renderAll();
  });
  return {page,errors,browser};
}

test('canvas controls rotate and flip a figure, lock its proportions and undo changes', {timeout:120000}, async t=>{
  const app=await prepara(t,Number(process.env.ERLEN_TRANSFORMACION_UI_PORT || 4281));if(!app)return;
  const {page,errors}=app;
  await page.locator('#stageInner .blk[data-bid="figura"]').click();
  await page.getByRole('button',{name:'Transformar objeto'}).click();
  const panel=page.locator('#inspBody');
  await panel.getByRole('checkbox',{name:'Bloquear proporciones'}).check();
  const width=panel.getByRole('spinbutton',{name:'Anchura (%)'});
  await width.fill('50');await width.press('Tab');
  assert.deepEqual(await page.evaluate(()=>({...findBlock('figura').block.posLibre})),{x:10,y:20,w:50,h:37.5});
  await panel.getByRole('spinbutton',{name:'Giro (°)'}).fill('90');
  await panel.getByRole('spinbutton',{name:'Giro (°)'}).press('Tab');
  await panel.getByRole('button',{name:'Voltear horizontalmente'}).click();
  assert.deepEqual(await page.evaluate(()=>({...findBlock('figura').block.transformacionLibre})),{giro:90,voltearH:true,voltearV:false});
  assert.equal(await panel.getByRole('button',{name:'Voltear horizontalmente'}).getAttribute('aria-pressed'),'true');
  const captionMatrix=await page.locator('#stageInner .blk[data-bid="figura"] figcaption').evaluate(el=>{
    const m=new DOMMatrix(getComputedStyle(el).transform);return [m.a,m.b,m.c,m.d];
  });
  assert.deepEqual(captionMatrix,[1,0,0,1]);
  await page.evaluate(()=>doUndo());
  assert.equal(await page.evaluate(()=>findBlock('figura').block.transformacionLibre.voltearH),false);
  await page.evaluate(()=>doRedo());
  assert.equal(await page.evaluate(()=>findBlock('figura').block.transformacionLibre.voltearH),true);
  await page.locator('#detallesCerrar').click();
  await page.locator('#stageInner .blk[data-bid="figura"]').click();
  const previous=await page.evaluate(()=>({...findBlock('figura').block.posLibre}));
  const handle=await page.locator('#stageInner .blk[data-bid="figura"] .libre-se').boundingBox();
  await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();
  await page.mouse.move(handle.x+handle.width/2+45,handle.y+handle.height/2+12,{steps:5});await page.mouse.up();
  const resized=await page.evaluate(()=>({...findBlock('figura').block.posLibre}));
  assert.ok(resized.w>previous.w && Math.abs(resized.w/resized.h-previous.w/previous.h)<.002,JSON.stringify({previous,resized}));
  await page.evaluate(()=>doUndo());
  assert.deepEqual(await page.evaluate(()=>({...findBlock('figura').block.posLibre})),previous);
  assert.deepEqual(errors,[]);
});

test('rotated and flipped figures retain their orientation in HTML and both PowerPoint formats', {timeout:120000}, async t=>{
  const app=await prepara(t,Number(process.env.ERLEN_TRANSFORMACION_EXPORT_PORT || 4282));if(!app)return;
  const {page,browser,errors}=app;
  const result=await page.evaluate(async()=>{
    const b=curSlide().blocks[0];b.transformacionLibre={giro:90,voltearH:true,voltearV:false};
    const old=b.src, ext=await extensionSlides('exportador');
    const html=await (await ext.creaHTML(S.deck)).text(), ppt=await ext.creaPPTX(S.deck);
    const zip=await window.JSZip.loadAsync(ppt.blob), xml=await zip.file('ppt/slides/slide2.xml').async('string');
    const guardar=window.downloadFile; let classicBlob;
    window.downloadFile=async(_name,blob)=>{classicBlob=blob;return true;};
    try {await exportPPTX();} finally {window.downloadFile=guardar;closeModal();}
    const cz=await window.JSZip.loadAsync(classicBlob), classic=await cz.file('ppt/slides/slide2.xml').async('string');
    return {html,xml,classic,sourceSame:b.src===old};
  });
  assert.equal(result.sourceSame,true);
  for(const xml of [result.xml,result.classic]) {
    assert.match(xml,/rot="5400000"/);
    assert.match(xml,/flipH="1"/);
  }
  const offline=await browser.newPage({viewport:{width:1440,height:1000}});t.after(()=>offline.close());
  await offline.setContent(result.html,{waitUntil:'load'});await offline.waitForFunction(()=>typeof presenter!=='undefined'&&presenter.isReady());
  await offline.evaluate(()=>presenter.slide(1));
  const matrix=await offline.locator('.present .blk[data-bid="figura"] .imgwrap').evaluate(el=>getComputedStyle(el).transform);
  assert.notEqual(matrix,'none');
  assert.deepEqual(errors,[]);
});

test('rotation handle previews a drag, commits once and cancels safely', {timeout:120000}, async t=>{
  const app=await prepara(t,Number(process.env.ERLEN_TRANSFORMACION_GESTURE_PORT || 4284));if(!app)return;
  const {page,errors}=app;
  await page.locator('#stageInner .blk[data-bid="figura"]').click();
  const handle=page.getByRole('button',{name:'Girar figura'});
  const h=await handle.boundingBox(), env=await page.locator('#stageInner .blk[data-bid="figura"] .imgwrap').boundingBox();
  const cx=env.x+env.width/2, cy=env.y+env.height/2, x=h.x+h.width/2, y=h.y+h.height/2;
  await page.mouse.move(x,y);await page.mouse.down();
  await page.mouse.move(cx-(y-cy),cy+(x-cx),{steps:8});
  assert.notEqual(await page.locator('#stageInner .imgwrap').evaluate(el=>getComputedStyle(el).transform),'none');
  await page.mouse.up();
  assert.ok(Math.abs((await page.evaluate(()=>findBlock('figura').block.transformacionLibre.giro))-90)<1);
  await page.evaluate(()=>doUndo());
  assert.equal(await page.evaluate(()=>findBlock('figura').block.transformacionLibre),undefined);
  await page.locator('#stageInner .blk[data-bid="figura"]').click();
  const h2=await page.getByRole('button',{name:'Girar figura'}).boundingBox();
  await page.mouse.move(h2.x+h2.width/2,h2.y+h2.height/2);await page.mouse.down();
  await page.mouse.move(h2.x+h2.width/2+50,h2.y+h2.height/2+20,{steps:4});
  await page.keyboard.press('Escape');await page.mouse.up();
  assert.equal(await page.evaluate(()=>findBlock('figura').block.transformacionLibre),undefined);
  const h3=await page.getByRole('button',{name:'Girar figura'}).boundingBox();
  await page.mouse.move(h3.x+h3.width/2,h3.y+h3.height/2);await page.mouse.down();
  await page.mouse.move(h3.x+h3.width/2+50,h3.y+h3.height/2+20,{steps:4});
  await page.evaluate(()=>{findBlock('figura').block.posLibre.x=15;});
  await page.mouse.up();
  assert.equal(await page.evaluate(()=>findBlock('figura').block.transformacionLibre),undefined);
  assert.equal(await page.evaluate(()=>findBlock('figura').block.posLibre.x),15);
  assert.deepEqual(errors,[]);
});

test('rotated image annotations stay aligned and clipping is reported', {timeout:120000}, async t=>{
  const app=await prepara(t,Number(process.env.ERLEN_TRANSFORMACION_ANNOTATIONS_PORT || 4283));if(!app)return;
  const {page,errors}=app;
  const result=await page.evaluate(async()=>{
    const b=curSlide().blocks[0];b.caption='';b.posLibre={x:0,y:0,w:50,h:10};
    b.marcas=[{t:'rect',x:.1,y:.2,w:.3,h:.2}];
    b.transformacionLibre={giro:90,voltearH:true,voltearV:false};
    const root=renderSlide(S.deck,S.cur,'present',0);document.body.append(root);
    const img=root.querySelector('.imgwrap img');await img.decode();await new Promise(requestAnimationFrame);
    const medida=el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};};
    const out={img:medida(img),mark:medida(root.querySelector('.fig-capas')),warnings:recortesSlide(root)};
    root.remove();return out;
  });
  for(const k of ['x','y','w','h']) assert.ok(Math.abs(result.img[k]-result.mark[k])<1.5,JSON.stringify(result));
  assert.ok(result.warnings.some(w=>w.bloque==='figura'),JSON.stringify(result));
  assert.deepEqual(errors,[]);
});

test('a transformed figure with annotations exports in both PowerPoint writers', {timeout:120000}, async t=>{
  const app=await prepara(t,Number(process.env.ERLEN_TRANSFORMACION_COMPLEX_PORT || 4290));if(!app)return;
  const {page,errors}=app;
  const result=await page.evaluate(async()=>{
    const b=curSlide().blocks[0];b.marcas=[{t:'rect',x:.15,y:.15,w:.3,h:.5}];
    b.transformacionLibre={giro:-35,voltearH:false,voltearV:true};
    const ext=await extensionSlides('exportador'),ppt=await ext.creaPPTX(S.deck),zip=await window.JSZip.loadAsync(ppt.blob);
    const old=window.downloadFile;let classic;window.downloadFile=async(_name,blob)=>{classic=blob;return true;};
    try{await exportPPTX();}finally{window.downloadFile=old;closeModal();}
    const cz=await window.JSZip.loadAsync(classic);
    return {advanced:await zip.file('ppt/slides/slide2.xml').async('string'),classic:await cz.file('ppt/slides/slide2.xml').async('string'),
      png:Object.keys(zip.files).filter(n=>/^ppt\/media\/.*\.png$/.test(n)).length};
  });
  assert.match(result.advanced,/flipV="1"/);assert.match(result.classic,/flipV="1"/);
  assert.ok(result.png>0);
  assert.deepEqual(errors,[]);
});

test('rotated figures do not cover their captions in the editor, HTML or print output', {timeout:120000}, async t=>{
  const app=await prepara(t,Number(process.env.ERLEN_TRANSFORMACION_CAPTION_PORT || 4285));if(!app)return;
  const {page,browser,errors}=app;
  const result=await page.evaluate(async()=>{
    const b=curSlide().blocks[0];b.posLibre={x:25,y:25,w:45,h:35};
    b.marcas=[{t:'rect',x:.15,y:.15,w:.3,h:.5}];
    b.transformacionLibre={giro:35,voltearH:false,voltearV:false};
    const root=renderSlide(S.deck,S.cur,'present',0);document.body.append(root);
    const img=root.querySelector('.imgwrap img');await img.decode();await new Promise(requestAnimationFrame);
    const env=root.querySelector('.imgwrap img').getBoundingClientRect(),caption=root.querySelector('figcaption').getBoundingClientRect();
    const out={bottom:env.bottom,top:caption.top};root.remove();return out;
  });
  assert.ok(result.bottom<=result.top+1,JSON.stringify(result));
  const outputs=await page.evaluate(async()=>{
    const ext=await extensionSlides('exportador');
    return {html:await (await ext.creaHTML(S.deck)).text(),print:buildPrintableHTML(false)};
  });
  const offline=await browser.newPage({viewport:{width:1440,height:1000}});t.after(()=>offline.close());
  const noOverlap=async selector=>{
    const boxes=await offline.locator(selector).evaluate(el=>({image:el.querySelector('.imgwrap img').getBoundingClientRect().bottom,
      caption:el.querySelector('figcaption').getBoundingClientRect().top,
      markWidth:el.querySelector('.imagen-libre-recorte').getBoundingClientRect().width,
      markHeight:el.querySelector('.imagen-libre-recorte').getBoundingClientRect().height}));
    assert.ok(boxes.image<=boxes.caption+1,JSON.stringify(boxes));
    assert.ok(boxes.markWidth>1 && boxes.markHeight>1,JSON.stringify(boxes));
  };
  await offline.setContent(outputs.html,{waitUntil:'load'});
  await offline.waitForFunction(()=>typeof presenter!=='undefined'&&presenter.isReady());
  await offline.evaluate(()=>presenter.slide(1));
  await noOverlap('.present .blk[data-bid="figura"]');
  await offline.setContent(outputs.print,{waitUntil:'load'});
  await noOverlap('#printArea .pr-page:nth-child(2) .blk[data-bid="figura"]');
  assert.deepEqual(errors,[]);
});

test('rotation does not push a fitting caption off the slide or report visible overflow as clipping', {timeout:120000}, async t=>{
  const app=await prepara(t,Number(process.env.ERLEN_TRANSFORMACION_FIT_PORT || 4291));if(!app)return;
  const {page,errors}=app;
  const result=await page.evaluate(async()=>{
    const b=curSlide().blocks[0];b.posLibre={x:25,y:60,w:45,h:20};
    b.transformacionLibre={giro:35,voltearH:false,voltearV:false};
    const root=renderSlide(S.deck,S.cur,'present',0);document.body.append(root);
    await root.querySelector('img').decode();await new Promise(requestAnimationFrame);
    const slide=root.getBoundingClientRect(),img=root.querySelector('img').getBoundingClientRect(),cap=root.querySelector('figcaption').getBoundingClientRect();
    const caption={imageBottom:img.bottom,captionTop:cap.top,captionBottom:cap.bottom,slideBottom:slide.bottom};root.remove();
    b.caption='';b.posLibre={x:25,y:25,w:45,h:20};
    const noPie=renderSlide(S.deck,S.cur,'present',0);document.body.append(noPie);
    await noPie.querySelector('img').decode();await new Promise(requestAnimationFrame);
    const warnings=recortesSlide(noPie);noPie.remove();return {caption,warnings};
  });
  assert.ok(result.caption.captionTop>=result.caption.imageBottom-1,JSON.stringify(result));
  assert.ok(result.caption.captionBottom<=result.caption.slideBottom+1,JSON.stringify(result));
  assert.ok(!result.warnings.some(w=>w.bloque==='figura'),JSON.stringify(result));
  assert.deepEqual(errors,[]);
});

test('presentation review reports a rotated caption that extends beyond the slide', {timeout:120000}, async t=>{
  const app=await prepara(t,Number(process.env.ERLEN_TRANSFORMACION_REVIEW_PORT || 4293));if(!app)return;
  const {page,errors}=app;
  const result=await page.evaluate(async()=>{
    const b=curSlide().blocks[0];b.posLibre={x:25,y:75,w:45,h:20};
    b.transformacionLibre={giro:35,voltearH:false,voltearV:false};
    renderAll();await document.querySelector('#stageInner img').decode();
    const root=renderSlide(S.deck,S.cur,'present',0);document.body.append(root);
    await root.querySelector('img').decode();await new Promise(requestAnimationFrame);
    const slide=root.getBoundingClientRect(),img=root.querySelector('img').getBoundingClientRect(),cap=root.querySelector('figcaption').getBoundingClientRect();
    const actual={imageBottom:img.bottom,captionBottom:cap.bottom,slideBottom:slide.bottom};root.remove();
    const review=revisaMazo().fallos.filter(f=>f.i===S.cur && f.bloque==='figura');
    return {actual,review};
  });
  assert.ok(result.actual.imageBottom<result.actual.slideBottom,JSON.stringify(result));
  assert.ok(result.actual.captionBottom>result.actual.slideBottom,JSON.stringify(result));
  assert.ok(result.review.length>0,JSON.stringify(result));
  assert.deepEqual(errors,[]);
});

test('presentation review reports an image that has not loaded, then checks its caption', {timeout:120000}, async t=>{
  const app=await prepara(t,Number(process.env.ERLEN_TRANSFORMACION_UNLOADED_PORT || 4297));if(!app)return;
  const {page,errors}=app;
  const result=await page.evaluate(async()=>{
    const b=curSlide().blocks[0];b.posLibre={x:25,y:75,w:45,h:20};
    b.transformacionLibre={giro:35,voltearH:false,voltearV:false};
    b.src='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="400" height="200" fill="green"/><desc>'+Math.random()+'</desc></svg>');
    const before=revisaMazo().fallos.filter(f=>f.i===S.cur && f.bloque==='figura');
    const im=new Image();im.src=b.src;await im.decode();
    const after=revisaMazo().fallos.filter(f=>f.i===S.cur && f.bloque==='figura');
    return {before,after};
  });
  assert.ok(result.before.some(f=>/no se pudo revisar/i.test(f.qué)),JSON.stringify(result));
  assert.ok(result.after.some(f=>/contenido no cabe/i.test(f.qué)),JSON.stringify(result));
  assert.deepEqual(errors,[]);
});

test('presentation review reports overflowing text when the slide clips it', {timeout:120000}, async t=>{
  const app=await prepara(t,Number(process.env.ERLEN_TRANSFORMACION_TEXT_PORT || 4294));if(!app)return;
  const {page,errors}=app;
  const result=await page.evaluate(()=>{
    const b=newBlock('text');Object.assign(b,{id:'texto-largo',text:'Contenido científico ilustrativo '.repeat(80),
      posLibre:{x:20,y:80,w:40,h:10}});curSlide().blocks=[b];
    const root=renderSlide(S.deck,S.cur,'present',0);document.body.append(root);
    const block=root.querySelector('.blk[data-bid="texto-largo"]'),range=document.createRange();range.selectNodeContents(block);
    const actual={textBottom:range.getBoundingClientRect().bottom,slideBottom:root.getBoundingClientRect().bottom};
    const warnings=recortesSlide(root);root.remove();return {actual,warnings};
  });
  assert.ok(result.actual.textBottom>result.actual.slideBottom,JSON.stringify(result));
  assert.ok(result.warnings.some(w=>w.bloque==='texto-largo'),JSON.stringify(result));
  assert.deepEqual(errors,[]);
});

test('direct PDF printing keeps transformed annotations and captions', {timeout:120000}, async t=>{
  const app=await prepara(t,Number(process.env.ERLEN_TRANSFORMACION_PRINT_PORT || 4295));if(!app)return;
  const {page,errors}=app;
  await page.evaluate(()=>{
    const b=curSlide().blocks[0];b.posLibre={x:25,y:25,w:45,h:35};
    b.marcas=[{t:'rect',x:.15,y:.15,w:.3,h:.5}];
    b.transformacionLibre={giro:35,voltearH:false,voltearV:false};
    window.print=()=>{window.__printCalled=true;};exportPDF();
  });
  await page.waitForFunction(()=>window.__printCalled);
  await page.emulateMedia({media:'print'});
  const boxes=await page.locator('#printArea .pr-page:nth-of-type(2) .blk[data-bid="figura"]').evaluate(el=>({
    image:el.querySelector('.imgwrap img').getBoundingClientRect().bottom,
    caption:el.querySelector('figcaption').getBoundingClientRect().top,
    markWidth:el.querySelector('.imagen-libre-recorte').getBoundingClientRect().width,
    markHeight:el.querySelector('.imagen-libre-recorte').getBoundingClientRect().height}));
  assert.ok(boxes.image<=boxes.caption+1,JSON.stringify(boxes));
  assert.ok(boxes.markWidth>1 && boxes.markHeight>1,JSON.stringify(boxes));
  const pdf=await page.pdf({printBackground:true,preferCSSPageSize:true});
  assert.equal(pdf.subarray(0,4).toString(),'%PDF');
  assert.deepEqual(errors,[]);
});

test('handouts and speaker notes keep transformed annotations and captions', {timeout:120000}, async t=>{
  const app=await prepara(t,Number(process.env.ERLEN_TRANSFORMACION_HANDOUT_PORT || 4296));if(!app)return;
  const {page,browser,errors}=app;
  const html=await page.evaluate(()=>{
    const b=curSlide().blocks[0];b.posLibre={x:25,y:25,w:45,h:35};
    b.marcas=[{t:'rect',x:.15,y:.15,w:.3,h:.5}];
    b.transformacionLibre={giro:35,voltearH:false,voltearV:false};
    return [folletoHTML(3),guionHTML()];
  });
  const offline=await browser.newPage({viewport:{width:1440,height:1000}});t.after(()=>offline.close());
  offline.on('pageerror',e=>errors.push(e.message));
  for(const document of html){
    await offline.setContent(document,{waitUntil:'load'});
    const boxes=await offline.locator('.blk[data-bid="figura"]').evaluate(el=>({
      image:el.querySelector('.imgwrap img').getBoundingClientRect().bottom,
      caption:el.querySelector('figcaption').getBoundingClientRect().top,
      markWidth:el.querySelector('.imagen-libre-recorte').getBoundingClientRect().width,
      markHeight:el.querySelector('.imagen-libre-recorte').getBoundingClientRect().height}));
    assert.ok(boxes.image<=boxes.caption+1,JSON.stringify(boxes));
    assert.ok(boxes.markWidth>1 && boxes.markHeight>1,JSON.stringify(boxes));
  }
  assert.deepEqual(errors,[]);
});

test('transformation controls remain usable in the narrow drawer', {timeout:120000}, async t=>{
  const app=await prepara(t,Number(process.env.ERLEN_TRANSFORMACION_MOBILE_PORT || 4286));if(!app)return;
  const {page,errors}=app;
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{renderAll();selectBlock('figura');});
  await page.getByRole('button',{name:'Transformar objeto'}).click();
  const drawer=page.getByRole('dialog',{name:'Detalles'});
  await drawer.getByRole('checkbox',{name:'Bloquear proporciones'}).check();
  await drawer.getByRole('spinbutton',{name:'Giro (°)'}).fill('30');
  await drawer.getByRole('spinbutton',{name:'Giro (°)'}).press('Tab');
  assert.equal(await page.evaluate(()=>findBlock('figura').block.transformacionLibre.giro),30);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.deepEqual(errors,[]);
});
