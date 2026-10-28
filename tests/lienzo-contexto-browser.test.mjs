/* SPDX-License-Identifier: AGPL-3.0-only */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';

test('free canvas preserves layout context and image annotations in Chromium', {timeout:120000}, async t => {
  const bin=process.env.ERLEN_CHROMIUM || '/usr/bin/chromium';
  if(!existsSync(bin)){t.skip('Set ERLEN_CHROMIUM to run browser validation.');return;}
  const port=Number(process.env.ERLEN_LIENZO_CONTEXTO_TEST_PORT || 4220);
  const server=spawn(process.execPath,[fileURLToPath(new URL('../herramientas/serve.mjs',import.meta.url))],
    {env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
  t.after(()=>server.kill());
  await new Promise((ok,fail)=>{server.stdout.once('data',ok);server.once('error',fail);server.once('exit',c=>fail(new Error('Server exited: '+c)));});
  const browser=await chromium.launch({executablePath:bin,args:['--no-sandbox']});
  t.after(()=>browser.close());
  const page=await browser.newPage({viewport:{width:1440,height:1000}}), errores=[];
  page.on('pageerror',e=>errores.push(e.message));
  await page.goto('http://127.0.0.1:'+port+'/');

  await t.test('activation preserves contextual typography, color and captured geometry',async()=>{
    const resultados=await page.evaluate(()=>{
      const casos=[['enunciado',0,'sobrio'],['barra',0],['comparacion',0],['tres',0],['pasos',0],
        ['cuadricula',0],['rejilla6',0],['filas',0],['piefigura',1],['dato',0],['cita',0],
        ['zigzag',1],['tresfig',0],['objetivos',0],['sangre',0]];
      const props=['fontSize','fontStyle','lineHeight','textAlign','color','paddingLeft'];
      const mide=()=>{
        const raiz=document.querySelector('#stageInner .slide'), texto=raiz.querySelector('[data-bid="texto-contexto"]');
        const li=raiz.querySelector('[data-bid="lista-contexto"] li');
        const estilos=e=>Object.fromEntries(props.map(p=>[p,getComputedStyle(e)[p]]));
        const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};};
        return {texto:estilos(texto),lista:estilos(li),rect:rect(texto)};
      };
      return casos.map(([layout,z,tema])=>{
        const d=blankDeck();if(tema)d.meta.theme=tema;
        const sl={id:'s-'+layout,layout,title:'Título',blocks:[]};prepararZonas(sl,layout);
        const tx=newBlock('text');Object.assign(tx,{id:'texto-contexto',text:'Mensaje ilustrativo'});
        const lista=newBlock('bullets');Object.assign(lista,{id:'lista-contexto',items:[{t:'Dato ilustrativo',lvl:0}]});
        if(layout==='sangre') {const im=newBlock('image');im.id='fondo-contexto';zona(sl,0).push(im);}
        zona(sl,z).push(tx,lista);d.slides.push(sl);wsNueva(d);S.cur=1;renderAll();
        const antes=mide();alternaLienzoLibre();const despues=mide();return {layout,antes,despues};
      });
    });
    for(const r of resultados){
      assert.deepEqual(r.despues.texto,r.antes.texto,r.layout+' texto');
      assert.deepEqual(r.despues.lista,r.antes.lista,r.layout+' lista');
      for(const k of ['x','y','w','h'])assert.ok(Math.abs(r.antes.rect[k]-r.despues.rect[k])<1.5,r.layout+' '+k+' '+JSON.stringify(r));
    }
  });

  await t.test('annotations and calibrated scale follow the visible image rectangle',async()=>{
    const r=await page.evaluate(async()=>{
      const d=blankDeck(),s={id:'lamina',layout:'blanco',title:'',lienzoLibre:true,blocks:[]};
      const im=newBlock('image');Object.assign(im,{id:'figura-cientifica',w:100,
        src:'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="4000" height="2000"%3E%3Crect width="4000" height="2000" fill="%23000"/%3E%3C/svg%3E',
        posLibre:{x:10,y:10,w:70,h:10},marcas:[{t:'rect',x:.1,y:.2,w:.3,h:.2}],
        escala:{porPx:.2,largo:200,anchoImg:4000,unidad:'µm',pos:'abajo-der'}});
      const rect=e=>{const a=e.getBoundingClientRect();return {x:a.x,y:a.y,w:a.width,h:a.height,right:a.right,bottom:a.bottom};};
      s.blocks.push(im);d.slides.push(s);const antes=JSON.stringify(im),medidas=[];
      for(const modo of ['edit','thumb','present','export']) {
        const root=renderSlide(d,1,modo,99);document.body.append(root);
        const img=root.querySelector('img');await img.decode();await new Promise(requestAnimationFrame);
        medidas.push({modo,img:rect(img),capa:rect(root.querySelector('.fig-capas')),escala:rect(root.querySelector('.esc-capa')),barra:rect(root.querySelector('.esc-barra'))});
        root.remove();
      }
      const html=await (await extensionSlides('exportador')).creaHTML(d);
      return {medidas,datos:JSON.stringify(im),antes,html:await html.text()};
    });
    const verifica=m=>{
      for(const k of ['x','y','w','h'])assert.ok(Math.abs(m.img[k]-m.capa[k])<1, k+' '+JSON.stringify(m));
      assert.ok(m.escala.right<=m.img.right+1 && m.escala.bottom<=m.img.bottom+1,JSON.stringify(m));
      assert.ok(Math.abs(m.barra.w-m.img.w*.25)<1,JSON.stringify(m));
      assert.ok(Math.abs(m.img.w/m.img.h-2)<.01,JSON.stringify(m));
    };
    r.medidas.forEach(verifica);
    assert.equal(r.datos,r.antes);
    const offline=await browser.newPage({viewport:{width:1440,height:1000}});
    await offline.setContent(r.html,{waitUntil:'load'});
    await offline.waitForFunction(()=>typeof presenter!=='undefined' && presenter.isReady());
    await offline.evaluate(()=>presenter.slide(1));
    const exportado=await offline.evaluate(()=>{
      const root=document.querySelector('.present .slide'),rect=e=>{const a=e.getBoundingClientRect();return{x:a.x,y:a.y,w:a.width,h:a.height,right:a.right,bottom:a.bottom};};
      return {modo:'html',img:rect(root.querySelector('img')),capa:rect(root.querySelector('.fig-capas')),
        escala:rect(root.querySelector('.esc-capa')),barra:rect(root.querySelector('.esc-barra'))};
    });
    verifica(exportado);await offline.close();
  });

  await t.test('a full-width calibrated bar stays completely inside the image',async()=>{
    const r=await page.evaluate(async()=>{
      const d=blankDeck(),s={id:'escala-total',layout:'blanco',title:'',lienzoLibre:true,blocks:[]};
      const im=newBlock('image');Object.assign(im,{id:'total',w:100,
        src:'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="4000" height="2000"%3E%3Crect width="4000" height="2000" fill="%23000"/%3E%3C/svg%3E',
        posLibre:{x:10,y:10,w:70,h:10},escala:{porPx:.2,largo:800,anchoImg:4000,unidad:'µm',pos:'abajo-der'}});
      s.blocks.push(im);d.slides.push(s);const root=renderSlide(d,1,'present',99);document.body.append(root);
      const img=root.querySelector('img');await img.decode();await new Promise(requestAnimationFrame);
      const rect=e=>{const q=e.getBoundingClientRect();return{x:q.x,w:q.width,right:q.right};};
      const out={img:rect(img),barra:rect(root.querySelector('.esc-barra')),clip:rect(root.querySelector('.imagen-libre-recorte'))};root.remove();return out;
    });
    assert.ok(Math.abs(r.barra.x-r.img.x)<1 && Math.abs(r.barra.right-r.img.right)<1,JSON.stringify(r));
    assert.ok(r.barra.x>=r.clip.x-1 && r.barra.right<=r.clip.right+1,JSON.stringify(r));
  });

  await t.test('PowerPoint rasterization fills the measured block without changing it',async()=>{
    const r=await page.evaluate(async()=>{
      const d=blankDeck(),s={id:'foto',layout:'blanco',title:'',lienzoLibre:true,blocks:[]};
      const im=newBlock('image');Object.assign(im,{id:'imagen-raster',w:100,alt:'Figura ilustrativa',
        src:'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="4000" height="2000"%3E%3Crect width="4000" height="2000" fill="%23000"/%3E%3C/svg%3E',
        posLibre:{x:50,y:30,w:40,h:30},marcas:[{t:'rect',x:.3,y:.2,w:.2,h:.2}]});
      s.blocks.push(im);d.slides.push(s);const original=JSON.stringify(d);
      const root=renderSlide(d,1,'export',99);document.body.append(root);
      const el=root.querySelector('[data-bid="imagen-raster"]'),img=el.querySelector('img');await img.decode();await new Promise(requestAnimationFrame);
      const estilo=el.getAttribute('style'), png=await rasteriza(el,collectCSS(),1);
      if(!png){root.remove();return {directo:null};}
      async function muestra(uri){const pic=new Image();pic.src=uri;await pic.decode();const cv=document.createElement('canvas');cv.width=pic.width;cv.height=pic.height;const c=cv.getContext('2d');c.drawImage(pic,0,0);
        return [.02,.10,.50,.90,.98].map(x=>[...c.getImageData(Math.floor(pic.width*x),Math.floor(pic.height*.7),1,1).data]);}
      const directo=await muestra(png),estiloDespues=el.getAttribute('style');root.remove();
      const ext=await extensionSlides('exportador'),pptx=await ext.creaPPTX(d),zip=await window.JSZip.loadAsync(pptx.blob);
      const media=Object.keys(zip.files).find(n=>/^ppt\/media\/.*\.png$/i.test(n));
      if(!media)throw new Error('El PowerPoint no contiene la figura rasterizada.');
      const ppt=await muestra('data:image/png;base64,'+await zip.file(media).async('base64'));
      return {directo,ppt,estilo,estiloDespues,original,despues:JSON.stringify(d)};
    });
    assert.ok(r.directo,'no se pudo decodificar la figura rasterizada');
    for(const puntos of [r.directo,r.ppt]){
      assert.ok(puntos[0][3]<20 && puntos[4][3]<20,JSON.stringify(puntos));
      for(const i of [1,2,3])assert.ok(puntos[i][0]<30 && puntos[i][1]<30 && puntos[i][2]<30 && puntos[i][3]>200,JSON.stringify(puntos));
    }
    assert.equal(r.estiloDespues,r.estilo);
    assert.equal(r.despues,r.original);
  });

  await t.test('full bleed preserves the figure and readable dark band on activation',async()=>{
    await page.evaluate(()=>{
      const d=blankDeck(),s={id:'sangre-fondo',layout:'sangre',title:'Título',blocks:[]};
      const im=newBlock('image');Object.assign(im,{id:'figura-sangre',w:100,
        src:'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="4000" height="2000"%3E%3Crect width="4000" height="2000" fill="%23d9aa48"/%3E%3C/svg%3E'});
      const texto=newBlock('text');Object.assign(texto,{id:'texto-sangre',text:'Texto sobre la figura'});
      s.blocks.push(im,texto);d.slides.push(s);wsNueva(d);S.cur=1;renderAll();
    });
    await page.locator('#stageInner img').first().evaluate(im=>im.decode());
    const antes=await page.locator('#stageInner .slide').screenshot();
    await page.evaluate(()=>alternaLienzoLibre());
    await page.locator('#stageInner img').first().evaluate(im=>im.decode());
    const despues=await page.locator('#stageInner .slide').screenshot();
    const pixeles=async buffer=>page.evaluate(async uri=>{
      const im=new Image();im.src=uri;await im.decode();const cv=document.createElement('canvas');cv.width=im.width;cv.height=im.height;
      const c=cv.getContext('2d');c.drawImage(im,0,0);return [[.01,.50],[.80,.92]].map(([x,y])=>[...c.getImageData(Math.floor(x*im.width),Math.floor(y*im.height),1,1).data].slice(0,3));
    },'data:image/png;base64,'+buffer.toString('base64'));
    const a=await pixeles(antes),d=await pixeles(despues);
    a.forEach((pixel,i)=>pixel.forEach((v,j)=>assert.ok(Math.abs(v-d[i][j])<12,JSON.stringify({a,d}))));
  });
  assert.deepEqual(errores,[]);
});
