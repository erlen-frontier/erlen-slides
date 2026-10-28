import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {editor} from '../herramientas/test-browser.mjs';

async function appFor(t) {
  const app = await editor();
  t.after(() => app.dom.window.close());
  return app;
}

function search(app, query) {
  const input = app.dom.window.document.querySelector('.cp-inp');
  input.value = query;
  input.dispatchEvent(new app.dom.window.Event('input', {bubbles: true}));
  return [...app.dom.window.document.querySelectorAll('.cp-fila')];
}

test('Tabula has its own mark and no Mey in home or editor', async t => {
  const app = await appFor(t);
  const d = app.dom.window.document;
  const mascots = () => d.querySelectorAll('erlen-mey, .mey-libre, .mey-libre-pausa, .erlen-marco-mey, .erlen-inicio-mey');
  assert.equal(mascots().length, 0);
  assert.equal(d.title, 'Inicio · Tabula');
  assert.match(d.querySelector('#inicioRoot .erlen-inicio-marca').textContent, /Tabula/);
  assert.ok(d.querySelector('#inicioRoot .erlen-inicio-marca svg[data-identidad="tabula"]'));
  assert.match(decodeURIComponent(d.querySelector('link[rel="icon"]').href), /data-identidad="tabula"/);
  app.run('wsNueva()');
  assert.equal(mascots().length, 0);
  assert.ok(d.querySelector('.erlen-marco-marca svg[data-identidad="tabula"]'));
  assert.equal(d.querySelector('#cinta').hidden, false);
  assert.equal(app.run('S.deck.slides.length'), 1);
});

test('desktop name changes while its storage identity remains compatible', () => {
  const config = JSON.parse(readFileSync(new URL('../src-tauri/tauri.conf.json', import.meta.url), 'utf8'));
  assert.equal(config.productName, 'Tabula');
  assert.equal(config.app.windows[0].title, 'Tabula');
  assert.equal(config.identifier, 'com.erlen.slides');
});

test('the standalone build does not ship the Mey implementation', () => {
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /function mey\(pose='hola'/);
  assert.doesNotMatch(html, /\.mey-libre\{position:fixed/);
  assert.ok(Buffer.byteLength(html) < 3.4 * 1024 * 1024, 'the single-file editor remains under 3.4 MiB');
});

test('a stale block from a different slide is not offered by search', async t => {
  const app = await appFor(t);
  app.run("wsNueva();addBlockToSlide('chart',1);closeModal();window.__old=S.selBlock;addSlide('content');S.selBlock=__old;renderAll();openPaleta();");
  assert.equal(search(app, 'por pasos').some(b => b.textContent.includes('Bloque')), false);
  assert.equal(search(app, 'revelar la gráfica por capas').length, 0);
});

test('the assistant cannot animate a stale block from another slide', async t => {
  const app = await appFor(t);
  app.run("wsNueva();addSlide('content');addBlockToSlide('text',1);window.__old=S.selBlock;addSlide('content');S.selBlock=__old;abreAsistente();window.__before=findBlock(__old).block.anim;asisEjecuta(ACC.find(a=>a.id==='animacion'),'fade');");
  assert.equal(app.run('findBlock(__old).block.anim'), app.run('__before'));
});

for (const layout of ['arriba', 'lado']) {
  test(`the palette finds and runs existing tools in the ${layout} layout`, async t => {
    const app = await appFor(t);
    app.run(`wsNueva();ponDisposicion('${layout}');window.__tools=[];openFiguraCapas=()=>window.__tools.push('figura');openPaleta();`);
    const input = app.dom.window.document.querySelector('.cp-inp');
    assert.match(input.getAttribute('aria-label') || '', /buscar/i);
    const result = search(app, 'insertar figura por capas').find(b => b.textContent.includes('Figura por capas'));
    assert.ok(result, 'the tool is searchable using its ribbon location');
    result.click();
    assert.equal(app.run('__tools.join()'), 'figura');
  });
}

test('the palette finds File actions and ignores unavailable controls', async t => {
  const app = await appFor(t);
  app.run("wsNueva();window.__tools=[];exportJSON=()=>window.__tools.push('json');S.undo=[];actualizaCinta();openPaleta();");
  assert.equal(search(app, 'deshacer').some(b => b.textContent.includes('Deshacer')), false);
  const result = search(app, 'exportar proyecto').find(b => b.textContent.includes('Proyecto (.json)'));
  assert.ok(result);
  result.click();
  assert.equal(app.run('__tools.join()'), 'json');
});

test('a tool result does not run after the selected slide changes', async t => {
  const app = await appFor(t);
  app.run("wsNueva();window.__tools=[];openFiguraCapas=()=>window.__tools.push('figura');openPaleta();");
  const result = search(app, 'figura por capas').find(b => b.textContent.includes('Figura por capas'));
  assert.ok(result);
  app.run("addSlide('content')");
  result.click();
  assert.equal(app.run('__tools.length'), 0);
  assert.match(app.dom.window.document.querySelector('#toasts').textContent, /cambi[oó].*busca/i);
});

test('similarly named slide and block tools are independently discoverable', async t => {
  const app = await appFor(t);
  app.run("wsNueva();addSlide('content');addBlockToSlide('text',1);closeModal();openPaleta();");
  const result = search(app, 'eliminar bloque').find(b => b.textContent.includes('Bloque'));
  assert.ok(result, 'the contextual block action is not hidden by the slide action');
  const beforeSlides = app.run('S.deck.slides.length');
  const beforeBlocks = app.run('zonas(curSlide()).flat().length');
  result.click();
  assert.equal(app.run('S.deck.slides.length'), beforeSlides);
  assert.equal(app.run('zonas(curSlide()).flat().length'), beforeBlocks - 1);
});

test('protected chart and equation blocks expose no mutating legacy command', async t => {
  const app = await appFor(t);
  app.run("wsNueva();addSlide('content');addBlockToSlide('chart',1);closeModal();findBlock(S.selBlock).block.locked=true;actualizaCinta();openPaleta();");
  assert.equal(search(app, 'revelar grafica').length, 0);
  assert.equal(app.run("comandos().some(c => c.n === 'Antes y después')"), false);
  assert.equal(app.run('findBlock(S.selBlock).block.capas === true'), false);
  app.run("closeModal();addBlockToSlide('math',1);closeModal();findBlock(S.selBlock).block.locked=true;actualizaCinta();openPaleta();");
  assert.equal(search(app, 'ecuacion paso a paso').length, 0);
});

test('an earlier assistant command cannot edit a block after it is locked or selection changes', async t => {
  const app = await appFor(t);
  app.run("wsNueva();addSlide('content');addBlockToSlide('chart',1);closeModal();window.__first=S.selBlock;window.__action=comandos().find(c=>c.n==='Revelar la gráfica por capas');findBlock(__first).block.locked=true;");
  assert.equal(app.run('__action.fn()'), false);
  assert.notEqual(app.run('findBlock(__first).block.capas'), true);
  app.run("findBlock(__first).block.locked=false;addBlockToSlide('chart',1);closeModal();");
  assert.equal(app.run('__action.fn()'), false);
  assert.notEqual(app.run('findBlock(__first).block.capas'), true);
  assert.notEqual(app.run('findBlock(S.selBlock).block.capas'), true);
});

test('the side inspector reflects an insertion zone selected from search', async t => {
  const app = await appFor(t);
  app.run("wsNueva();addSlide('twocol');ponDisposicion('lado');S.tab='insert';renderInspector();openPaleta();");
  const result = search(app, 'zona columna 2').find(b => b.textContent.includes('Columna 2'));
  assert.ok(result);
  result.click();
  assert.equal(app.run('S.insCol'), 2);
  assert.equal(app.dom.window.document.querySelector('#inspBody [title="Insertar en Columna 2"]').classList.contains('on'), true);
});

test('the active keyboard search result is exposed to assistive technology', async t => {
  const app = await appFor(t);
  app.run('wsNueva();openPaleta();');
  const rows = search(app, 'tema');
  assert.ok(rows.length > 1);
  const input = app.dom.window.document.querySelector('.cp-inp');
  assert.equal(input.getAttribute('role'), 'combobox');
  assert.equal(input.getAttribute('aria-activedescendant'), rows[0].id);
  input.dispatchEvent(new app.dom.window.KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));
  assert.equal(input.getAttribute('aria-activedescendant'), rows[1].id);
  assert.equal(rows[1].getAttribute('aria-selected'), 'true');
});

test('assistant cards recheck selection and protected blocks before editing', async t => {
  const app = await appFor(t);
  app.run("wsNueva();addSlide('content');addBlockToSlide('chart',1);closeModal();abreAsistente();window.__card=asisTarjeta({a:ACC.find(a=>a.id==='capas')},false);document.body.append(__card);findBlock(S.selBlock).block.locked=true;");
  app.dom.window.__card.querySelector('button').click();
  assert.notEqual(app.run('findBlock(S.selBlock).block.capas'), true);
  assert.match(app.dom.window.document.querySelector('.asis-hilo').textContent, /disponible|protegido/i);
});
