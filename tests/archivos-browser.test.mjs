import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';

test('desktop saving and closing commit the focused inspector field', {timeout:120000}, async t => {
  const bin = process.env.ERLEN_CHROMIUM || '/usr/bin/chromium';
  if (!existsSync(bin)) { t.skip('Set ERLEN_CHROMIUM to run browser validation.'); return; }
  const port = Number(process.env.ERLEN_ARCHIVOS_TEST_PORT || 4267);
  const server = spawn(process.execPath, [fileURLToPath(new URL('../herramientas/serve.mjs', import.meta.url))],
    {env:{...process.env, PORT:String(port)}, stdio:['ignore','pipe','pipe']});
  t.after(() => server.kill());
  await new Promise((ok, fail) => { server.stdout.once('data', ok); server.once('error', fail); server.once('exit', c => fail(new Error('Server exited: ' + c))); });
  const browser = await chromium.launch({executablePath:bin,args:['--no-sandbox']});
  t.after(() => browser.close());
  const page = await browser.newPage({viewport:{width:1440,height:900}});
  await page.addInitScript(() => {
    window.__fileCalls = [];
    window.__TAURI__ = {core:{invoke:async (cmd, args) => {
      window.__fileCalls.push({cmd,args});
      if (cmd === 'guardar_archivo_proyecto_como') return {id:1,nombre:'charla.json'};
      return null;
    }},window:{getCurrentWindow:()=>({onCloseRequested:async()=>{}})}};
  });
  await page.goto('http://127.0.0.1:' + port + '/');
  await page.evaluate(() => { wsNueva(); addSlide('content'); S.tab='slide'; ponDisposicion('lado'); renderAll(); });
  await page.evaluate(() => guardarProyectoEscritorio(true));
  const title = page.locator('#inspBody input[placeholder="Título del marco"]');
  await title.fill('Título escrito sin salir del campo');
  await page.keyboard.press('Control+s');
  await page.waitForFunction(() => window.__fileCalls.some(x=>x.cmd === 'guardar_archivo_proyecto'));
  const savedTitle = await page.evaluate(() => JSON.parse(window.__fileCalls.find(x=>x.cmd === 'guardar_archivo_proyecto').args.contenido).slides[1].title);
  assert.equal(savedTitle, 'Título escrito sin salir del campo');

  const notes = page.locator('#inspBody textarea[placeholder^="Notas visibles"]');
  await notes.fill('Notas privadas sin salir del campo');
  await page.evaluate(() => { window.confirm = () => false; });
  assert.equal(await page.evaluate(() => confirmaSalidaArchivo()), false);
  assert.equal(await page.evaluate(() => curSlide().notes), 'Notas privadas sin salir del campo');
});
