/* SPDX-License-Identifier: AGPL-3.0-only */
/* Extensión «bibliografia» del MCP: importar .bib y .ris, citar por clave y
   completar por DOI. Las referencias de tests/fixtures/bibliografia son
   ficticias (prefijo de pruebas 10.5555 de Crossref) y ninguna prueba sale a
   internet: Crossref se imita con un servidor local. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {copyFileSync, readFileSync, statSync} from 'node:fs';
import {createServer} from 'node:http';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {conServidor, proyecto, bloques} from './_mcp-cliente.mjs';

const FX = fileURLToPath(new URL('./fixtures/bibliografia/', import.meta.url));
const copia = (dir, n) => copyFileSync(join(FX, n), join(dir, n));
const nueva = (c, extra = {}) => c.llama('crear_presentacion', {archivo: 'p', titulo: 'Prueba', diapositivas: [{titulo: 'Síntesis', zonas: [[{tipo: 'text', text: 'Texto de prueba.'}]]}, {titulo: 'Resultados'}], ...extra});
const porClave = (dir, k) => proyecto(dir, 'p').meta.refs.find(r => r.clave === k);

/* Pone y quita variables de entorno solo durante fn: el servidor las hereda al arrancar. */
async function conEntorno(vars, fn) {
  const antes = {};
  for (const k of Object.keys(vars)) { antes[k] = process.env[k]; if (vars[k] == null) delete process.env[k]; else process.env[k] = vars[k]; }
  try { return await fn(); } finally { for (const k of Object.keys(antes)) { if (antes[k] == null) delete process.env[k]; else process.env[k] = antes[k]; } }
}

/* Los lectores son los del editor: lo mismo que se pega en el panel de Referencias. */
test('Editor: el lector de BibTeX y la traducción de Crossref', {timeout: 60000}, async () => {
  const {editor} = await import('../herramientas/test-browser.mjs');
  const {dom, run} = await editor();
  try {
    const pega = s => JSON.parse(run('JSON.stringify(refsDesdeTexto(' + JSON.stringify(s) + ').map(r => ({autores: r.autores, titulo: r.titulo, revista: r.revista, anio: r.anio, pag: r.pag, doi: r.doi})))'));
    /* booktitle antes que title ya no le roba el título; la arroba del correo no se come la entrada. */
    assert.deepEqual(pega('Escríbeme a nadie@example.org\n@inproceedings{k, booktitle = {Actas ficticias}, title = {T{\\\'i}tulo {con {llaves}} de prueba}, author = {D{\\\'\\i}az, Ana and {Grupo X}}, year = 2020, pages = {1--4}}'),
      [{autores: 'Díaz, Ana; {Grupo X}', titulo: 'Título con llaves de prueba', revista: 'Actas ficticias', anio: '2020', pag: '1–4', doi: ''}]);
    assert.equal(run('texALlano(' + JSON.stringify('{\\"U}ber \\c{c}a \\o{} \\ss{} $\\alpha_{2}$ 5\\% \\$3 \\textsubscript{2}') + ')'), 'Über ça ø ß $\\alpha_{2}$ 5% \\$3 2');
    assert.equal(run('citaCorta({autores: "Nadie, N.; {et al.}", anio: "2020"})'), 'Nadie et al., 2020');
    assert.equal(run('citaCorta({autores: "Uno, A.; Dos, B.", anio: "2020"})'), 'Uno y Dos, 2020');
    assert.equal(run('citaCorta({autores: "{Food and Agriculture Organization}; Tester, A.", anio: "2020"})'), 'Food and Agriculture Organization y Tester, 2020', 'no se parte dentro de llaves');
    /* La forma con paréntesis, las macros de @string y los escapes en el DOI. */
    assert.deepEqual(pega('@string(rev = "Revista Ficticia")\n@article(p1, author = {Tester, Ana}, title = {Entre paréntesis (sí)}, journal = rev, doi = {10.5555/a\\_b})'),
      [{autores: 'Tester, Ana', titulo: 'Entre paréntesis (sí)', revista: 'Revista Ficticia', anio: '', pag: '', doi: '10.5555/a_b'}]);
    assert.match(run('citaLargaHtml({autores: "Tester, A.", titulo: "T", revista: "R", vol: "12", pag: "1–2", anio: "2020"})'), /R <b>12<\/b> 1–2/, 'el volumen en negrita, sin asteriscos');
    const cr = JSON.parse(run('JSON.stringify(refDesdeCrossref({DOI: "10.5555/X", title: ["TiO<sub>2</sub> &amp; <i>ZnO</i>"], author: [{family: "Tester", given: "Ana"}], page: "5-9", issued: {"date-parts": [[2019]]}}, "10.5555/x"))'));
    assert.deepEqual([cr.titulo, cr.autores, cr.pag, cr.anio, cr.revista, cr.vol], ['TiO₂ & ZnO', 'Tester, Ana', '5–9', '2019', '', '']);
  } finally { dom.window.close(); }
});

test('MCP bibliografía: importar un .bib', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    copia(dir, 'prueba.bib');
    assert.equal((await nueva(c)).error, false);
    const r = await c.llama('importar_bibliografia', {archivo: 'p', archivo_bib: 'prueba.bib'});
    assert.equal(r.error, false, r.texto);
    const d = r.datos;
    assert.equal(d.formato, 'bib');
    assert.equal(d.entradas, 6, '@string y @comment no cuentan; la arroba del comentario no abre entrada');
    assert.deepEqual(d.agregadas.map(x => x.clave), ['PerezNunez2021', 'garcia2019b', 'SinAutores2020', 'SoloAutor', 'PerezNunez2021b']);
    assert.deepEqual(d.duplicadas.map(x => [x.clave_original, x.por, x.ya_estaba.clave]), [['Duplicada2021', 'doi', 'PerezNunez2021']], 'el DOI se compara sin mayúsculas');
    assert.deepEqual(d.claves_cambiadas.map(x => [x.clave_original, x.clave]), [['garcia:2019-b', 'garcia2019b'], ['PerezNunez2021', 'PerezNunez2021b']]);
    assert.deepEqual(d.problemas.map(x => [x.clave, x.falta]), [['SinAutores2020', ['autores']], ['SoloAutor', ['titulo', 'anio']]]);

    const a = porClave(dir, 'PerezNunez2021');
    assert.equal(a.autores, 'Pérez-Núñez, José; Müller, Jürgen; Øster, Åsa', 'acentos de LaTeX');
    assert.equal(a.titulo, 'Zn–Al layered double hydroxides: a fictional test entry with TiO$_2$', 'llaves fuera, «--» a raya corta, $…$ intacto');
    assert.equal(a.revista, 'Journal of Test Materials', 'macro @string');
    assert.deepEqual([a.anio, a.vol, a.pag, a.doi], ['2021', '12', '101–115', '10.5555/prueba.0001']);
    const g = porClave(dir, 'garcia2019b');
    assert.equal(g.autores, 'García, Lucía; {Consorcio Ficticio de Materiales}', 'la institución conserva sus llaves');
    assert.equal(g.titulo, 'Caça de fases: ensayo & prueba', 'comillas, \\c{c} y \\&');
    assert.equal(g.revista, 'Proceedings of the Imaginary Symposium on Solid State', 'booktitle no se confunde con title');
    assert.equal(g.pag, '7–9');
    assert.equal(porClave(dir, 'SoloAutor').autores, 'Nadie, N.; {et al.}');
    assert.match(d.agregadas.find(x => x.clave === 'SoloAutor').cita, /^Nadie et al\./, '«and others» es «et al.»');

    /* Otra vez el mismo archivo: nada nuevo. La de García no tiene DOI y se reconoce por título y año. */
    const r2 = await c.llama('importar_bibliografia', {archivo: 'p', archivo_bib: 'prueba.bib'});
    assert.equal(r2.datos.agregadas.length, 0);
    assert.equal(r2.datos.duplicadas.length, 6);
    assert.equal(r2.datos.duplicadas.find(x => x.clave_original === 'garcia:2019-b').por, 'titulo+anio');
    assert.equal(r2.datos.duplicadas.find(x => x.clave_original === 'SoloAutor').por, 'autores+anio', 'sin título ni DOI, por autores');
    assert.equal(proyecto(dir, 'p').meta.refs.length, 5);
    assert.equal((await c.llama('historial_presentacion', {archivo: 'p'})).datos.deshacer[0].antes_de, 'importar_bibliografia');
  });
});

test('MCP bibliografía: importar RIS y texto pegado', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    copia(dir, 'prueba.ris');
    await nueva(c);
    const r = await c.llama('importar_bibliografia', {archivo: 'p', archivo_bib: 'prueba.ris'});
    assert.equal(r.error, false, r.texto);
    assert.equal(r.datos.formato, 'ris');
    assert.deepEqual(r.datos.agregadas.map(x => x.clave), ['Ficticio2018', 'libro2015']);
    assert.deepEqual(r.datos.descartadas.map(x => x.entrada), [3]);
    const f = porClave(dir, 'Ficticio2018');
    assert.equal(f.titulo, 'Fictional RIS entry about hydrotalcite-like test compounds', 'línea de continuación');
    assert.deepEqual([f.autores, f.anio, f.vol, f.pag, f.doi, f.url], ['Tester, Ana; Probeta, Bruno', '2018', '4', '33–41', '10.5555/prueba.0003', 'https://example.org/prueba-0003']);
    assert.equal(porClave(dir, 'libro2015').revista, 'Editorial Inexistente');

    /* Pegado, sin archivo: el formato se deduce del contenido. La clave repetida se renombra. */
    const p = await c.llama('importar_bibliografia', {archivo: 'p', texto: '@book{Ficticio2018, author = {Tester, Ana}, title = {Otro libro de prueba}, year = 2019}'});
    assert.equal(p.error, false, p.texto);
    assert.deepEqual(p.datos.agregadas.map(x => x.clave), ['Ficticio2018b']);

    assert.match((await c.llama('importar_bibliografia', {archivo: 'p'})).texto, /archivo_bib.*texto/);
    assert.match((await c.llama('importar_bibliografia', {archivo: 'p', texto: 'nada que ver'})).texto, /No reconocí el formato/);
    assert.match((await c.llama('importar_bibliografia', {archivo: 'p', archivo_bib: 'no-esta.bib'})).texto, /No existe/);
    assert.match((await c.llama('importar_bibliografia', {archivo: 'p', texto: 'sin entradas', formato: 'bib'})).texto, /ninguna entrada BibTeX/);
    assert.deepEqual((await c.llama('importar_bibliografia', {archivo: 'p', texto: '@article{a, note = {sin cerrar}'})).datos.descartadas.map(x => x.clave_original), ['a']);
  });
});

test('MCP bibliografía: citar por clave y la diapositiva de referencias', {timeout: 180000}, async () => {
  await conServidor(async (c, dir) => {
    copia(dir, 'prueba.bib');
    await nueva(c);
    await c.llama('importar_bibliografia', {archivo: 'p', archivo_bib: 'prueba.bib'});

    const mal = await c.llama('citar', {archivo: 'p', diapositiva: 2, claves: ['perezNunez2021', 'Inexistente']});
    assert.equal(mal.error, true);
    assert.match(mal.texto, /«perezNunez2021» → ¿«PerezNunez2021»\?/);
    assert.match(mal.texto, /Inexistente/);
    assert.equal(proyecto(dir, 'p').slides[1].citas, undefined, 'un error no cambia nada');

    const r = await c.llama('citar', {archivo: 'p', diapositiva: 2, claves: ['@PerezNunez2021', 'garcia2019b'], bloque_referencias: true});
    assert.equal(r.error, false, r.texto);
    assert.deepEqual(r.datos.citadas, ['PerezNunez2021', 'garcia2019b']);
    assert.deepEqual(r.datos.al_pie.map(x => [x.clave, x.numero]), [['PerezNunez2021', 1], ['garcia2019b', 2]]);
    assert.equal(r.datos.bloque_referencias.estado, 'automatica');
    const d = proyecto(dir, 'p');
    const ids = ['PerezNunez2021', 'garcia2019b'].map(k => d.meta.refs.find(x => x.clave === k).id);
    assert.deepEqual(d.slides[1].citas, ids);
    const bib = d.slides[r.datos.bloque_referencias.diapositiva - 1];
    assert.equal(bib.bibAuto, true);
    assert.ok(bloques(bib).some(b => b.type === 'refs'));

    const rep = await c.llama('citar', {archivo: 'p', diapositiva: 2, claves: ['PerezNunez2021', 'SinAutores2020'], bloque_referencias: true});
    assert.deepEqual([rep.datos.citadas, rep.datos.ya_estaban], [['SinAutores2020'], ['PerezNunez2021']]);
    assert.equal(rep.datos.bloque_referencias.diapositiva, r.datos.bloque_referencias.diapositiva, 'no se duplica');

    /* Beamer: la cita al pie y la bibliografía, con los nombres ya sin LaTeX de BibTeX. */
    const ex = await c.llama('exportar_presentacion', {archivo: 'p', formato: 'beamer'});
    assert.equal(ex.error, false, ex.texto);
    const tex = readFileSync(join(dir, ex.datos.tex), 'utf8');
    assert.match(tex, /\\begin\{thebibliography\}/);
    assert.match(tex, /\\bibitem\{\} Pérez-Núñez, José; Müller, Jürgen; Øster, Åsa/);
    assert.match(tex, /\[1\] Pérez-Núñez et al\., Journal of Test Materials, 2021/);

    /* La revisión avisa de una [@clave] rota y de lo que le falta a una citada. */
    const ed = await c.llama('editar_diapositiva', {archivo: 'p', diapositiva: 3, zonas: [[{tipo: 'text', text: 'Como en [@garcia2019b] y [@NoExiste2020].'}]]});
    assert.equal(ed.error, false, ed.texto);
    const rev = (await c.llama('revisar_presentacion', {archivo: 'p'})).datos.adicional || [];
    assert.ok(rev.some(h => h.regla === 'bibliografia' && h.diapositiva === 3 && /NoExiste2020/.test(h.problema)), JSON.stringify(rev));
    assert.ok(rev.some(h => h.regla === 'bibliografia' && /SinAutores2020/.test(h.problema) && /autores/.test(h.problema)), JSON.stringify(rev));
  });
});

test('MCP bibliografía: sin bibliografía automática, una diapositiva propia', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    await nueva(c);
    const d0 = proyecto(dir, 'p');
    d0.meta.bibAuto = false;
    (await import('node:fs')).writeFileSync(join(dir, 'p.json'), JSON.stringify(d0));
    await c.llama('importar_bibliografia', {archivo: 'p', texto: 'TY  - JOUR\nAU  - Tester, Ana\nTI  - Ficticia\nPY  - 2020\nER  - \n'});
    const r = await c.llama('citar', {archivo: 'p', diapositiva: 2, claves: ['tester2020'], bloque_referencias: true});
    assert.equal(r.error, false, r.texto);
    assert.equal(r.datos.bloque_referencias.estado, 'agregada');
    const sl = proyecto(dir, 'p').slides[r.datos.bloque_referencias.diapositiva - 1];
    assert.equal(sl.bibAuto, undefined);
    assert.ok(bloques(sl).some(b => b.type === 'refs'));
  });
});

test('MCP bibliografía: completar_por_doi sin permiso de red', {timeout: 120000}, async () => {
  await conEntorno({ERLEN_SLIDES_RED: null, ERLEN_SLIDES_CROSSREF: 'http://127.0.0.1:9/nunca'}, () => conServidor(async (c, dir) => {
    await nueva(c);
    const antes = statSync(join(dir, 'p.json')).mtimeMs;
    const r = await c.llama('completar_por_doi', {archivo: 'p', doi: '10.5555/prueba.0001'});
    assert.equal(r.error, true);
    assert.match(r.texto, /ERLEN_SLIDES_RED=1/);
    assert.match(r.texto, /api\.crossref\.org/);
    assert.equal(statSync(join(dir, 'p.json')).mtimeMs, antes);
    assert.match((await c.llama('completar_por_doi', {archivo: 'p', doi: 'no-es-un-doi'})).texto, /no parece un DOI/);
  }));
});

test('MCP bibliografía: completar_por_doi con un Crossref local', {timeout: 120000}, async () => {
  /* Respuestas con la forma de api.crossref.org/works/{doi}, datos ficticios. */
  const vistos = [];
  const MENSAJES = {
    '10.5555/prueba.0001': {DOI: '10.5555/PRUEBA.0001', title: ['Zn–Al layered double hydroxides: a fictional test entry with TiO<sub>2</sub>'],
      author: [{given: 'José', family: 'Pérez-Núñez'}], 'container-title': ['Journal of Test Materials'], volume: '12', page: '101-115',
      issued: {'date-parts': [[2021, 3]]}, URL: 'https://doi.org/10.5555/prueba.0001'},
    '10.5555/prueba.0009': {DOI: '10.5555/prueba.0009', title: ['A <i>fictional</i> Crossref record'], author: [{given: 'Ana', family: 'Tester'}, {name: 'Consorcio Ficticio'}],
      'container-title': [], issued: {'date-parts': [[2024]]}},
    '10.5555/prueba.0010': {DOI: '10.5555/prueba.0010', title: ['Another fictional record'], author: [{given: 'Bruno', family: 'Probeta'}], issued: {'date-parts': [[2020]]}},
    '10.5555/prueba.0011': {DOI: '10.5555/prueba.0011', title: ['The same fictional record, without DOI'], author: [{given: 'Ana', family: 'Tester'}], issued: {'date-parts': [[2020]]}, volume: '3'}
  };
  const srv = createServer((req, res) => {
    vistos.push({url: req.url, ua: req.headers['user-agent']});
    const doi = decodeURIComponent(req.url.replace(/^\/works\//, '')).toLowerCase();
    if (!MENSAJES[doi]) { res.writeHead(404); res.end('Resource not found.'); return; }
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({status: 'ok', 'message-type': 'work', message: MENSAJES[doi]}));
  });
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok));
  const url = 'http://127.0.0.1:' + srv.address().port;
  try {
    await conEntorno({ERLEN_SLIDES_RED: '1', ERLEN_SLIDES_CROSSREF: url, ERLEN_SLIDES_CORREO: 'prueba@example.org'}, () => conServidor(async (c, dir) => {
      await nueva(c);
      await c.llama('importar_bibliografia', {archivo: 'p', texto: '@article{Perez2021, author = {P{\\\'e}rez-N{\\\'u}{\\~n}ez, Jos{\\\'e}}, title = {Un título distinto a propósito}, doi = {https://doi.org/10.5555/prueba.0001}}'});
      const r = await c.llama('completar_por_doi', {archivo: 'p', doi: 'doi:10.5555/prueba.0001'});
      assert.equal(r.error, false, r.texto);
      assert.equal(r.datos.accion, 'completada');
      assert.deepEqual(r.datos.rellenados, ['revista', 'anio', 'vol', 'pag', 'url']);
      assert.deepEqual(r.datos.discrepancias.map(x => x.campo), ['titulo'], 'lo que ya había no se toca');
      const p = porClave(dir, 'Perez2021');
      assert.equal(p.titulo, 'Un título distinto a propósito');
      assert.deepEqual([p.revista, p.anio, p.pag], ['Journal of Test Materials', '2021', '101–115']);
      assert.match(vistos[0].ua, /^ErlenSlides\/[\d.]+ \(https:\/\/github\.com\/erlen-frontier\/erlen-slides; mailto:prueba@example\.org\)$/);

      const n = await c.llama('completar_por_doi', {archivo: 'p', doi: '10.5555/prueba.0009'});
      assert.equal(n.error, false, n.texto);
      assert.equal(n.datos.accion, 'agregada');
      const t = porClave(dir, n.datos.clave);
      assert.deepEqual([t.titulo, t.autores, t.anio, t.revista, t.vol], ['A fictional Crossref record', 'Tester, Ana; {Consorcio Ficticio}', '2024', '', ''], 'lo que Crossref no trae queda vacío');
      assert.deepEqual(n.datos.siguen_vacios, ['revista', 'vol', 'pag', 'url']);

      /* Una clave que no existe es la de la referencia nueva. */
      const k = await c.llama('completar_por_doi', {archivo: 'p', doi: '10.5555/prueba.0010', clave: 'Nueva2020'});
      assert.equal(k.error, false, k.texto);
      assert.deepEqual([k.datos.accion, k.datos.clave], ['agregada', 'Nueva2020']);
      /* La que ya estaba sin DOI se completa (por título y año) en vez de duplicarse. */
      await c.llama('importar_bibliografia', {archivo: 'p', texto: '@article{SinDoi, author = {Tester, Ana}, title = {The same fictional record, without DOI}, year = 2020}'});
      const s = await c.llama('completar_por_doi', {archivo: 'p', doi: '10.5555/prueba.0011'});
      assert.deepEqual([s.datos.accion, s.datos.clave, s.datos.por], ['completada', 'SinDoi', 'titulo+anio']);
      assert.equal(porClave(dir, 'SinDoi').doi, '10.5555/prueba.0011');

      const no = await c.llama('completar_por_doi', {archivo: 'p', doi: '10.5555/no-existe'});
      assert.equal(no.error, true);
      assert.match(no.texto, /Crossref no conoce/);
      assert.equal(proyecto(dir, 'p').meta.refs.length, 4);
    }));
  } finally { srv.close(); }
});
