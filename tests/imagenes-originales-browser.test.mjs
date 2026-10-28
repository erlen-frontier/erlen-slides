/* SPDX-License-Identifier: AGPL-3.0-only */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';

test('original images survive import, editing and export', {timeout:180000}, async t=>{
  const bin=process.env.ERLEN_CHROMIUM || '/usr/bin/chromium';
  if(!existsSync(bin)){t.skip('Chromium is required.');return;}
  const port=Number(process.env.ERLEN_IMAGENES_TEST_PORT || 4310);
  const server=spawn(process.execPath,[fileURLToPath(new URL('../herramientas/serve.mjs',import.meta.url))],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
  t.after(()=>server.kill());
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',c=>reject(Error('Server exited: '+c)));});
  const browser=await chromium.launch({executablePath:bin,args:['--no-sandbox']});t.after(()=>browser.close());
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errores=[];t.after(()=>page.close());
  page.on('pageerror',e=>errores.push(e.message));page.setDefaultTimeout(10000);
  await page.goto('http://127.0.0.1:'+port+'/');
  const formatos=await page.evaluate(async()=>{
    const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=256;
    const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(canvas.width,canvas.height);let v=0x417cafe;
    for(let i=0;i<pixels.data.length;i+=4){for(let j=0;j<3;j++){v^=v<<13;v^=v>>>17;v^=v<<5;pixels.data[i+j]=v&255;}const x=(i/4)%2048,y=Math.floor(i/4/2048);pixels.data[i+3]=(x<128&&y<128)||(i/4)%7===0?0:255;}
    ctx.putImageData(pixels,0,0);
    return {png:canvas.toDataURL('image/png'),jpeg:canvas.toDataURL('image/jpeg',1),webp:canvas.toDataURL('image/webp',1)};
  });
  const png=Buffer.from(formatos.png.split(',')[1],'base64'),webp=Buffer.from(formatos.webp.split(',')[1],'base64');
  const jpgBytes=Buffer.from(formatos.jpeg.split(',')[1],'base64'),comment=Buffer.from('TABULA metadata illustrative');
  const marker=Buffer.alloc(4);marker[0]=0xff;marker[1]=0xfe;marker.writeUInt16BE(comment.length+2,2);
  const jpg=Buffer.concat([jpgBytes.subarray(0,2),marker,comment,jpgBytes.subarray(2)]);
  const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40"><title>Micrografía</title><rect width="80" height="40" fill="none"/></svg>');
  const pngURI='data:image/png;base64,'+png.toString('base64'),jpgURI='data:image/jpeg;base64,'+jpg.toString('base64'),webpURI='data:image/webp;base64,'+webp.toString('base64');
  const svgURI='data:image/svg+xml;base64,'+svg.toString('base64');
  assert.ok(png.length>250000 && jpg.length>250000 && webp.length>250000,'Fixtures must exercise the large-image paths');
  const archivo=(name,mimeType,buffer)=>({name,mimeType,buffer});
  const reset=()=>page.evaluate(()=>{
    const d=blankDeck(),s={id:'imagen',layout:'blanco',title:'',lienzoLibre:true,blocks:[]};
    const b=newBlock('image');Object.assign(b,{id:'foto',src:'',posLibre:{x:10,y:20,w:50,h:40}});s.blocks.push(b);d.slides.push(s);loadDeck(d,null,true);wsCerrar();S.cur=1;snapNow();renderAll();
  });
  const seleccionar=async f=>{
    await page.evaluate(()=>pickImage(findBlock('foto').block));
    await page.locator('#imgFileInput').setInputFiles(f);
    await page.waitForFunction(()=>!!findBlock('foto').block.src);
  };

  await t.test('file picker retains exact PNG pixels and JPEG metadata bytes',async()=>{
    await reset();await seleccionar(archivo('figura.png','image/png',png));
    assert.ok((await page.evaluate(()=>findBlock('foto').block.src))===pngURI,'PNG bytes changed');
    await reset();await seleccionar(archivo('imagen.jpg','image/jpeg',jpg));
    assert.ok((await page.evaluate(()=>findBlock('foto').block.src))===jpgURI,'JPEG bytes or metadata changed');
    await reset();await seleccionar(archivo('figura.svg','image/svg+xml',svg));
    assert.ok((await page.evaluate(()=>findBlock('foto').block.src))===svgURI,'SVG source bytes changed');
  });

  await t.test('the file picker releases its presentation reference after selection or cancellation',async()=>{
    await reset();await seleccionar(archivo('original.png','image/png',png));
    assert.equal(await page.evaluate(()=>!!document.querySelector('#imgFileInput')._destino),false,'A completed selection kept the presentation in memory');
    await page.evaluate(()=>{pickImage(findBlock('foto').block);document.querySelector('#imgFileInput').dispatchEvent(new Event('cancel'));});
    assert.equal(await page.evaluate(()=>Object.values(document.querySelector('#imgFileInput')._destino).every(x=>typeof x==='number')),true,'A canceled picker kept the presentation in memory');
  });

  await t.test('dragged and pasted images keep their exact WebP and PNG source bytes',async()=>{
    await reset();
    await page.evaluate(async uri=>{
      const data=await (await fetch(uri)).blob(),files=new DataTransfer();files.items.add(new File([data],'figura.webp',{type:'image/webp'}));
      await metArchivos(files.files);
    },webpURI);
    assert.ok((await page.evaluate(()=>curSlide().blocks.find(b=>b.id!=='foto')?.src))===webpURI,'Dropped WebP changed');
    await reset();
    await page.evaluate(async uri=>{
      const data=await (await fetch(uri)).blob(),clipboard=new DataTransfer();clipboard.items.add(new File([data],'figura.png',{type:'image/png'}));
      document.dispatchEvent(new ClipboardEvent('paste',{clipboardData:clipboard,bubbles:true,cancelable:true}));
    },pngURI);
    await page.waitForFunction(()=>curSlide().blocks.some(b=>b.id!=='foto' && b.src));
    assert.ok((await page.evaluate(()=>curSlide().blocks.find(b=>b.id!=='foto').src))===pngURI,'Pasted PNG changed');
  });

  await t.test('gallery images preserve their source instead of shrinking or converting',async()=>{
    await reset();await page.evaluate(()=>{const b=newBlock('galeria');b.id='galeria';curSlide().blocks.push(b);openGaleria(b);});
    await page.locator('#modalRoot input[type=file]').setInputFiles([archivo('imagen.webp','image/webp',webp),archivo('imagen.png','image/png',png)]);
    await page.waitForFunction(()=>document.querySelectorAll('#modalRoot .gal-fila').length===2);
    await page.getByRole('button',{name:'Listo',exact:true}).click();
    const imgs=await page.evaluate(()=>findBlock('galeria').block.gal.imgs.map(im=>im.src));
    assert.ok(imgs.length===2 && imgs[0]===webpURI && imgs[1]===pngURI,'Gallery source bytes or order changed');
  });

  await t.test('the gallery queues files added while an earlier batch is still loading',async()=>{
    await reset();await page.evaluate(()=>{
      const Native=window.FileReader;window.__readerAnterior=Native;
      window.FileReader=class{readAsDataURL(file){const r=new Native();r.onload=()=>{this.result=r.result;setTimeout(()=>this.onload?.(),200);};r.onerror=()=>this.onerror?.();r.readAsDataURL(file);}};
      const b=newBlock('galeria');b.id='galeria';curSlide().blocks.push(b);openGaleria(b);
    });
    try {
      const input=page.locator('#modalRoot input[type=file]');
      await input.setInputFiles(archivo('primera.png','image/png',png));
      assert.equal(await page.getByRole('button',{name:'Listo',exact:true}).isDisabled(),true);
      await input.setInputFiles(archivo('segunda.webp','image/webp',webp));
      await page.waitForFunction(()=>document.querySelectorAll('#modalRoot .gal-fila').length===2);
      await page.getByRole('button',{name:'Listo',exact:true}).click();
      const imgs=await page.evaluate(()=>findBlock('galeria').block.gal.imgs.map(im=>im.src));
      assert.ok(imgs.length===2 && imgs[0]===pngURI && imgs[1]===webpURI,'A gallery batch was silently discarded or reordered');
    } finally {await page.evaluate(()=>{window.FileReader=window.__readerAnterior;delete window.__readerAnterior;closeModal();});}
  });

  await t.test('late file reads cannot replace a newer selection or insert into another slide',async()=>{
    await reset();
    await page.evaluate(()=>{
      const Native=window.FileReader;window.__readerAnterior=Native;
      window.FileReader=class {
        readAsDataURL(file){const r=new Native();r.onload=()=>{this.result=r.result;setTimeout(()=>this.onload?.(),file.name==='antigua.png'?250:5);};r.onerror=()=>this.onerror?.();r.readAsDataURL(file);}
      };
    });
    try {
      await page.evaluate(()=>pickImage(findBlock('foto').block));
      await page.locator('#imgFileInput').setInputFiles(archivo('antigua.png','image/png',png));
      await page.evaluate(()=>pickImage(findBlock('foto').block));
      await page.locator('#imgFileInput').setInputFiles(archivo('nueva.webp','image/webp',webp));
      await page.waitForFunction(()=>findBlock('foto').block.src?.startsWith('data:image/webp'));
      await page.waitForTimeout(350);
      assert.ok((await page.evaluate(()=>findBlock('foto').block.src))===webpURI,'A late read replaced the newer image');
      await reset();
      await page.evaluate(async uri=>{
        const bytes=await (await fetch(uri)).blob(),files=new DataTransfer();files.items.add(new File([bytes],'antigua.png',{type:'image/png'}));
        void metArchivos(files.files);S.cur=0;renderAll();
      },pngURI);
      await page.waitForTimeout(350);
      const conteos=await page.evaluate(()=>S.deck.slides.map(s=>(s.blocks||[]).length));
      assert.deepEqual(conteos,[0,1],'A delayed batch inserted images after switching slides');
      await reset();await page.evaluate(()=>{pickImage(findBlock('foto').block);S.cur=0;renderAll();});
      await page.locator('#imgFileInput').setInputFiles(archivo('antigua.png','image/png',png));
      await page.waitForTimeout(350);
      assert.equal(await page.evaluate(()=>S.deck.slides[1].blocks[0].src),'','File picker changed a slide after leaving it');
    } finally {await page.evaluate(()=>{window.FileReader=window.__readerAnterior;delete window.__readerAnterior;});}
  });

  await t.test('a file read failure is visible and preserves the existing image',async()=>{
    await reset();await seleccionar(archivo('figura.png','image/png',png));
    await page.evaluate(()=>{window.__readerAnterior=window.FileReader;window.FileReader=class{readAsDataURL(){throw Error('Lectura denegada');}};});
    try {
      await page.evaluate(()=>pickImage(findBlock('foto').block));
      await page.locator('#imgFileInput').setInputFiles(archivo('error.png','image/png',png));
      await page.waitForFunction(()=>document.body.textContent.includes('No se pudo leer la imagen'));
      assert.ok((await page.evaluate(()=>findBlock('foto').block.src))===pngURI,'A failed read damaged the previous image');
    } finally {await page.evaluate(()=>{window.FileReader=window.__readerAnterior;delete window.__readerAnterior;});}
  });

  await t.test('editor uses a temporary bounded preview while the project and presentation keep the original',async()=>{
    await reset();await seleccionar(archivo('figura.png','image/png',png));
    await page.waitForFunction(()=>document.querySelector('#stageInner .blk[data-bid="foto"] img')?.getAttribute('src')?.startsWith('blob:'));
    const datos=await page.evaluate(async()=>{
      const im=document.querySelector('#stageInner .blk[data-bid="foto"] img');await im.decode();
      const visual=renderSlide(S.deck,S.cur,'present',99).querySelector('.blk[data-bid="foto"] img').getAttribute('src');
      const guardado=saneaDeck(JSON.parse(JSON.stringify(S.deck))).deck.slides[1].blocks[0].src;
      const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(im,0,0);
      return {ancho:im.naturalWidth,alto:im.naturalHeight,alpha:ctx.getImageData(40,40,1,1).data[3],original:findBlock('foto').block.src,guardado,visual};
    });
    assert.ok(datos.ancho<=1600 && datos.alto<=1600);
    assert.equal(datos.alpha,0,'Temporary PNG preview lost transparency');
    assert.ok(datos.original===pngURI && datos.guardado===pngURI && datos.visual===pngURI,'Preview leaked into the document or presentation');
  });

  await t.test('printed handouts, speaker notes and kit embed originals instead of temporary preview URLs',async()=>{
    await reset();await seleccionar(archivo('original.png','image/png',png));
    await page.waitForFunction(()=>VISTAS_IMAGEN.get(findBlock('foto').block.src)?.url);
    const result=await page.evaluate(async()=>{
      const gal=newBlock('galeria');gal.id='gal';gal.gal={imgs:[{src:findBlock('foto').block.src,cap:'',alt:''}],modo:'rejilla',cols:2,letras:true,hueco:8};curSlide().blocks.push(gal);
      const kit=await archivosKit(),documents=[guionHTML(),folletoHTML(3),kit.find(f=>f.nombre==='guion.html').datos];
      return documents.map(html=>Array.from(new DOMParser().parseFromString(html,'text/html').querySelectorAll('.blk[data-bid="foto"] img,.blk[data-bid="gal"] img'),im=>im.getAttribute('src')));
    });
    for(const imagenes of result) assert.ok(imagenes.length===2 && imagenes.every(src=>src===pngURI),'A printed document or kit contains a temporary image URL');
  });

  await t.test('evicting preview URLs leaves every displayed image usable',async()=>{
    const r=await page.evaluate(async src=>{
      for(const entry of VISTAS_IMAGEN.values()){entry.vigente=false;if(entry.url)URL.revokeObjectURL(entry.url);}
      VISTAS_IMAGEN.clear();const caja=document.createElement('div');document.body.append(caja);const imagenes=[];
      try {
        for(let i=0;i<9;i++){
          const fuente=src+'#vista'+i,im=document.createElement('img');im.src=fuente;caja.append(im);imagenes.push({im,fuente});
          aplicaVistaImagen(im,fuente,'thumb');await VISTAS_IMAGEN.get(fuente).promesa;
          await new Promise(resolve=>setTimeout(resolve,10));
        }
        await Promise.all(imagenes.map(x=>x.im.decode()));
        return {size:VISTAS_IMAGEN.size,primera:imagenes[0].im.getAttribute('src'),fuente:imagenes[0].fuente,ancho:imagenes[0].im.naturalWidth};
      } finally {caja.remove();}
    },pngURI);
    assert.ok(r.size<=8,'Preview cache grew without a bound');
    assert.ok(r.primera===r.fuente && r.ancho===2048,'Eviction left a live image pointing at a revoked URL');
  });

  await t.test('cropping preserves the full original and the raster crop resolution and transparency',async()=>{
    await reset();
    const uri=await page.evaluate(()=>{
      const cv=document.createElement('canvas');cv.width=2048;cv.height=1024;
      const ctx=cv.getContext('2d');ctx.fillStyle='#278568';ctx.fillRect(0,0,2048,1024);
      const noise=ctx.createImageData(2048,64);let v=324768;
      for(let i=0;i<noise.data.length;i+=4){for(let j=0;j<3;j++){v^=v<<13;v^=v>>>17;v^=v<<5;noise.data[i+j]=v&255;}noise.data[i+3]=255;}
      ctx.putImageData(noise,0,0);ctx.clearRect(500,300,800,400);
      return cv.toDataURL('image/png');
    });
    const bytes=Buffer.from(uri.split(',')[1],'base64');assert.ok(bytes.length>250000);
    await seleccionar(archivo('micrografia.png','image/png',bytes));
    await page.evaluate(()=>openRecorte(findBlock('foto').block));
    const modal=page.locator('#modalRoot .modal');await modal.getByRole('button',{name:'16:9',exact:true}).click();
    await page.waitForTimeout(100);await modal.getByRole('button',{name:'Aplicar',exact:true}).click();
    const r=await page.evaluate(async()=>{
      const b=findBlock('foto').block,im=new Image();im.src=b.src;await im.decode();
      const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;
      const ctx=c.getContext('2d');ctx.drawImage(im,0,0);return {orig:b.orig,src:b.src,width:im.naturalWidth,alpha:ctx.getImageData(Math.floor(c.width/2),Math.floor(c.height/2),1,1).data[3],reabierto:saneaDeck(JSON.parse(JSON.stringify(S.deck))).deck.slides[1].blocks[0].orig};
    });
    assert.ok(r.orig===uri && r.reabierto===uri,'Original bytes lost while cropping or saving');
    assert.ok(r.width>1600,'Crop was silently downscaled');assert.equal(r.alpha,0);
    await page.evaluate(()=>openRecorte(findBlock('foto').block));
    await page.getByRole('button',{name:'Quitar el recorte'}).click();
    assert.ok((await page.evaluate(()=>findBlock('foto').block.src))===uri,'Restoring the original changed bytes');
  });

  await t.test('a late crop image load does not replace a newer dialog',async()=>{
    await reset();await seleccionar(archivo('original.png','image/png',png));
    await page.evaluate(()=>{
      const Native=window.Image;window.__imagenAnterior=Native;
      window.Image=function(){const im=new Native();let handler;
        Object.defineProperty(im,'onload',{get:()=>handler,set:fn=>{handler=fn;im.addEventListener('load',()=>setTimeout(()=>fn.call(im),250),{once:true});}});
        return im;
      };
      openRecorte(findBlock('foto').block);openModal({title:'Diálogo posterior',body:h('p',null,'Este diálogo debe permanecer abierto')});
    });
    try {await page.waitForTimeout(400);assert.equal(await page.getByRole('dialog',{name:'Diálogo posterior'}).count(),1);}
    finally {await page.evaluate(()=>{window.Image=window.__imagenAnterior;delete window.__imagenAnterior;closeModal();});}
  });

  await t.test('a failed crop leaves the source and original unchanged',async()=>{
    await reset();await seleccionar(archivo('original.png','image/png',png));
    await page.evaluate(()=>openRecorte(findBlock('foto').block));
    const modal=page.getByRole('dialog',{name:'Encuadrar la imagen'});await modal.waitFor();await page.waitForTimeout(80);
    await page.evaluate(()=>{window.__toDataURL=HTMLCanvasElement.prototype.toDataURL;HTMLCanvasElement.prototype.toDataURL=function(){throw Error('Sin memoria');};});
    try {
      await modal.getByRole('button',{name:'Aplicar',exact:true}).click();
      assert.match(await page.locator('body').textContent(),/No se pudo generar el recorte/);
      const r=await page.evaluate(()=>({src:findBlock('foto').block.src,orig:findBlock('foto').block.orig}));
      assert.ok(r.src===pngURI && !r.orig,'A failed crop changed the source');
    } finally {await page.evaluate(()=>{HTMLCanvasElement.prototype.toDataURL=window.__toDataURL;delete window.__toDataURL;closeModal();});}
  });

  const presentaciones = async formato => page.evaluate(async ({formato, guardar})=>{
    const ext=await extensionSlides('exportador'), avanzada=await ext.creaPPTX(S.deck);
    let clasica;const descargar=window.downloadFile;
    window.downloadFile=async (nombre,blob)=>{if(nombre.endsWith('.pptx')) clasica=blob;};
    try {await exportPPTX();} finally {window.downloadFile=descargar;closeModal();}
    if(!clasica) throw Error('El PowerPoint clásico no se generó');
    const inspecciona=async blob=>{
      const zip=await window.JSZip.loadAsync(blob),tipos=await zip.file('[Content_Types].xml').async('string');
      const medios=[];
      for(const nombre of Object.keys(zip.files).filter(n=>/^ppt\/media\/.+\.(png|jpe?g|webp)$/i.test(n))){
        const bytes=await zip.file(nombre).async('uint8array');
        const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
        let ancho=0,alpha=null;
        if(formato==='webp' || formato==='crop'){
          const url=URL.createObjectURL(new Blob([bytes]));
          try {const im=new Image();im.src=url;await im.decode();ancho=im.naturalWidth;
            const c=document.createElement('canvas');c.width=1;c.height=1;const cx=c.getContext('2d');cx.drawImage(im,0,0);alpha=cx.getImageData(0,0,1,1).data[3];
          } finally {URL.revokeObjectURL(url);}
        }
        medios.push({nombre,hash,magic:Array.from(bytes.slice(0,8)),ancho,alpha});
      }
      let base64=null;
      if(guardar) base64=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=reject;r.readAsDataURL(blob);});
      return {medios,tipos,base64};
    };
    const html=await (await ext.creaHTML(S.deck)).text();
    return {avanzada:await inspecciona(avanzada.blob),clasica:await inspecciona(clasica),htmlConOriginal:html.includes(findBlock('foto').block.src),original:findBlock('foto').block.src};
  },{formato,guardar:!!process.env.TABULA_PPTX_FIXTURE_DIR});

  await t.test('both PowerPoint writers keep original JPEG bytes and declare the correct type',async()=>{
    await reset();await seleccionar(archivo('con-metadatos.jpg','image/jpeg',jpg));
    const p=await presentaciones('jpeg'),sha=createHash('sha256').update(jpg).digest('hex');
    assert.ok(p.original===jpgURI && p.htmlConOriginal,'HTML or source lost the original JPEG');
    for(const [nombre,archivoPpt] of Object.entries({avanzada:p.avanzada,clasica:p.clasica})){
      const medio=archivoPpt.medios.find(m=>m.hash===sha);
      assert.ok(medio,nombre+' did not retain the JPEG and its metadata');
      assert.match(medio.nombre,/\.jpe?g$/i,nombre+' mislabeled JPEG bytes');
      const extension=medio.nombre.split('.').pop();
      assert.match(archivoPpt.tipos,new RegExp('Extension="'+extension+'"[^>]*ContentType="image/jpeg"','i'));
      if(archivoPpt.base64) await writeFile(join(process.env.TABULA_PPTX_FIXTURE_DIR,nombre+'-jpeg.pptx'),Buffer.from(archivoPpt.base64,'base64'));
    }
  });

  await t.test('both PowerPoint writers keep the original PNG and full crop resolution',async()=>{
    await reset();await seleccionar(archivo('original.png','image/png',png));
    const original=await presentaciones('png'),sha=createHash('sha256').update(png).digest('hex');
    for(const archivoPpt of [original.avanzada,original.clasica]) assert.ok(archivoPpt.medios.some(m=>m.hash===sha && /\.png$/i.test(m.nombre)),'PNG bytes changed in PowerPoint');
    await reset();
    const uri=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=2048;c.height=1024;const x=c.getContext('2d');x.fillStyle='#268c65';x.fillRect(0,0,c.width,c.height);x.clearRect(500,300,800,400);return c.toDataURL('image/png');});
    await seleccionar(archivo('alta-resolucion.png','image/png',Buffer.from(uri.split(',')[1],'base64')));
    await page.evaluate(()=>openRecorte(findBlock('foto').block));
    const modal=page.getByRole('dialog',{name:'Encuadrar la imagen'});await modal.getByRole('button',{name:'16:9',exact:true}).click();await page.waitForTimeout(100);await modal.getByRole('button',{name:'Aplicar',exact:true}).click();
    const p=await presentaciones('crop');
    for(const archivoPpt of [p.avanzada,p.clasica]) assert.ok(archivoPpt.medios.some(m=>m.ancho>1600),'PowerPoint downscaled the cropped image');
    assert.ok((await page.evaluate(()=>findBlock('foto').block.orig))===uri,'PowerPoint export changed the original');
  });

  await t.test('WebP exports are compatible PNGs without changing the original image',async()=>{
    await reset();await seleccionar(archivo('transparente.webp','image/webp',webp));
    const p=await presentaciones('webp');
    assert.ok(p.original===webpURI && p.htmlConOriginal,'HTML or project changed the WebP');
    for(const [nombre,archivoPpt] of Object.entries({avanzada:p.avanzada,clasica:p.clasica})){
      const medio=archivoPpt.medios.find(m=>m.ancho===2048);
      assert.ok(medio,nombre+' lost the full resolution');
      assert.match(medio.nombre,/\.png$/i);
      assert.deepEqual(medio.magic,[137,80,78,71,13,10,26,10]);
      assert.equal(medio.alpha,0,nombre+' lost the transparent pixel');
      if(archivoPpt.base64) await writeFile(join(process.env.TABULA_PPTX_FIXTURE_DIR,nombre+'-webp.pptx'),Buffer.from(archivoPpt.base64,'base64'));
    }
    const resultados=await page.evaluate(async()=>{
      const descargados=[],descargar=window.downloadFile;
      window.downloadFile=async (nombre,blob,mime)=>descargados.push({nombre,mime,bytes:Array.from(new Uint8Array(await blob.arrayBuffer()).slice(0,8))});
      let kit;try {await exportFigures();kit=await archivosKit();} finally {window.downloadFile=descargar;}
      const figura=kit.find(x=>x.nombre.startsWith('figuras/')&&x.nombre.includes('figura-foto'));
      return {descargados,figura:figura&&{nombre:figura.nombre,bytes:Array.from(figura.datos.slice(0,8))},src:findBlock('foto').block.src};
    });
    const firma=[137,80,78,71,13,10,26,10];
    assert.match(resultados.descargados[0].nombre,/\.png$/);assert.equal(resultados.descargados[0].mime,'image/png');
    assert.deepEqual(resultados.descargados[0].bytes,firma);
    assert.match(resultados.figura.nombre,/\.png$/);assert.deepEqual(resultados.figura.bytes,firma);
    assert.ok(resultados.src===webpURI,'Export changed the project source');
  });

  await t.test('desktop save and reopen retain original image bytes',async()=>{
    await reset();await seleccionar(archivo('original.jpg','image/jpeg',jpg));
    const res=await page.evaluate(async()=>{
      let contenido='';const anterior=window.__TAURI__;
      window.__TAURI__={core:{invoke:async (cmd,args)=>{
        if(cmd==='guardar_archivo_proyecto_como'){contenido=args.contenido;return {id:1,nombre:'imagen.json'};}
        if(cmd==='abrir_archivo_proyecto')return {id:2,nombre:'imagen.json',contenido};
        if(cmd==='cerrar_archivo_proyecto')return null;
        throw Error('Comando inesperado: '+cmd);
      }}};
      try {
        await guardarProyectoEscritorio(true);
        const guardada=JSON.parse(contenido).slides[1].blocks[0].src;
        await abrirProyectoEscritorio();
        return {guardada,reabierta:S.deck.slides[1].blocks[0].src};
      } finally {window.__TAURI__=anterior;}
    });
    assert.ok(res.guardada===jpgURI && res.reabierta===jpgURI,'Desktop round trip changed original bytes');
  });

  await t.test('a full local storage quota warns and retains the image in the current project',async()=>{
    await reset();await seleccionar(archivo('original.png','image/png',png));
    const r=await page.evaluate(()=>{
      const old=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('Cuota agotada','QuotaExceededError');};S._avisoLS=false;
      try {saveInd.now();return {src:findBlock('foto').block.src,indicador:document.querySelector('#saveInd').textContent,aviso:document.querySelector('#toasts').textContent};}
      finally {Storage.prototype.setItem=old;}
    });
    assert.ok(r.src===pngURI);assert.match(r.indicador,/Sin guardar/);assert.match(r.aviso,/guardado automático.*\.json/i);
  });
  assert.deepEqual(errores,[]);
});
