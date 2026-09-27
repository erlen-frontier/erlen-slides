/* SPDX-License-Identifier: AGPL-3.0-only */
/* El instalador (herramientas/mcp-instalar.mjs) y la herramienta
   «diagnostico». El instalador se ejecuta de verdad, pero con la carpeta
   personal desviada a una temporal (ERLEN_INSTALAR_HOME): nunca toca la
   configuración real de quien corre las pruebas. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync, utimesSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {rutaConfigDesktop, entorno, combina, cita, comandoClaudeCode, leeArgs} from '../herramientas/mcp-instalar.mjs';
import {conServidor} from './_mcp-cliente.mjs';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const SCRIPT = join(RAIZ, 'herramientas', 'mcp-instalar.mjs');
const SERVIDOR = resolve(RAIZ, 'mcp', 'servidor.mjs');

/* Una carpeta personal falsa con Linux simulado, para que la ruta de la
   configuración sea la misma en cualquier sistema donde corran las pruebas. */
function casa() {
  const home = mkdtempSync(join(tmpdir(), 'erlen-instalar-'));
  const config = join(home, '.config', 'Claude', 'claude_desktop_config.json');
  /* Sin las variables del navegador de quien corre las pruebas: cambiarían
     la entrada escrita. */
  const {ERLEN_CHROMIUM, PLAYWRIGHT_BROWSERS_PATH, ...env} = process.env;
  const instala = (...args) => spawnSync(process.execPath, [SCRIPT, '--sin-prueba', '--no-compilar', ...args], {
    encoding: 'utf8', env: {...env, ERLEN_INSTALAR_HOME: home, ERLEN_INSTALAR_PLATAFORMA: 'linux', ...instala.env}});
  instala.env = {};
  const respaldos = () => existsSync(join(home, '.config', 'Claude')) ? readdirSync(join(home, '.config', 'Claude')).filter(n => n.includes('.respaldo-')) : [];
  return {home, config, instala, respaldos, limpia: () => rmSync(home, {recursive: true, force: true})};
}

test('instalador: rutas de Claude Desktop en cada sistema', () => {
  const h = '/home/ana';
  assert.equal(rutaConfigDesktop({plataforma: 'linux', home: h}), '/home/ana/.config/Claude/claude_desktop_config.json');
  assert.equal(rutaConfigDesktop({plataforma: 'darwin', home: '/Users/ana'}), '/Users/ana/Library/Application Support/Claude/claude_desktop_config.json');
  assert.equal(rutaConfigDesktop({plataforma: 'win32', home: 'C:\\Users\\ana', appdata: 'C:\\Users\\ana\\AppData\\Roaming', localappdata: 'C:\\Users\\ana\\AppData\\Local'}),
    'C:\\Users\\ana\\AppData\\Roaming\\Claude\\claude_desktop_config.json');
  /* Con la carpeta personal desviada, %APPDATA% cuelga de ella aunque el
     sistema tenga otro. */
  const e = entorno({ERLEN_INSTALAR_HOME: 'C:\\Users\\prueba', ERLEN_INSTALAR_PLATAFORMA: 'win32', APPDATA: 'C:\\Users\\real\\AppData\\Roaming'});
  assert.equal(rutaConfigDesktop(e), 'C:\\Users\\prueba\\AppData\\Roaming\\Claude\\claude_desktop_config.json');
  assert.equal(entorno({ERLEN_INSTALAR_PLATAFORMA: 'darwin', ERLEN_INSTALAR_HOME: '/tmp/x'}).plataforma, 'darwin');
});

test('instalador: comillas del comando de Claude Code', () => {
  assert.equal(cita('/usr/bin/node', 'linux'), '/usr/bin/node');
  assert.equal(cita("/Users/ana/Mis cosas/l'x", 'darwin'), "'/Users/ana/Mis cosas/l'\\''x'");
  assert.equal(cita('C:\\Program Files\\nodejs\\node.exe', 'win32'), '"C:\\Program Files\\nodejs\\node.exe"');
  assert.equal(cita('C:\\erlen\\mcp\\servidor.mjs', 'win32'), 'C:\\erlen\\mcp\\servidor.mjs');
  assert.equal(comandoClaudeCode({node: '/n', servidor: '/s.mjs', carpeta: '/a b'}, 'linux'),
    "claude mcp add erlen-slides --scope user -e 'ERLEN_SLIDES_DIR=/a b' -- /n /s.mjs");
  assert.throws(() => leeArgs(['--cliente', 'vscode']), /Cliente desconocido/);
  assert.throws(() => leeArgs(['--carpeta']), /Falta el valor/);
});

test('instalador: combina conservando lo demás y la sangría', () => {
  const previo = '{\r\n\t"mcpServers": {"otro": {"command": "x"}},\r\n\t"tema": "oscuro"\r\n}\r\n';
  const e = {command: '/n', args: ['/s'], env: {ERLEN_SLIDES_DIR: '/d'}};
  const r = combina(previo, e);
  assert.equal(r.estado, 'nuevo');
  assert.ok(r.texto.includes('\r\n\t"tema": "oscuro"'), 'misma sangría y fin de línea');
  assert.deepEqual(Object.keys(JSON.parse(r.texto).mcpServers), ['otro', 'erlen-slides']);
  /* Una variable añadida a mano a la entrada se conserva. */
  const conExtra = JSON.stringify({mcpServers: {'erlen-slides': {command: '/viejo', args: ['/s'], env: {ERLEN_CHROMIUM: '/c', ERLEN_SLIDES_DIR: '/x'}}}});
  const r2 = combina(conExtra, e);
  assert.equal(r2.estado, 'cambiado');
  assert.deepEqual(r2.config.mcpServers['erlen-slides'].env, {ERLEN_CHROMIUM: '/c', ERLEN_SLIDES_DIR: '/d'});
  assert.equal(combina(r2.texto, e).estado, 'igual');
  assert.equal(combina('', e).estado, 'nuevo', 'un archivo vacío es una configuración vacía');
  assert.equal(combina('\uFEFF{}', e).estado, 'nuevo', 'con BOM');
  assert.throws(() => combina('[]', e), /objeto JSON/);
  assert.throws(() => combina('{"mcpServers": []}', e), /mcpServers/);
});

test('instalador: Claude Desktop de punta a punta, idempotente y con copia', () => {
  const c = casa();
  try {
    mkdirSync(join(c.home, '.config', 'Claude'), {recursive: true});
    const original = '{\n    "mcpServers": {\n        "otro": {"command": "uvx", "args": ["otro-mcp"]}\n    },\n    "globalShortcut": "Ctrl+Space"\n}\n';
    writeFileSync(c.config, original);

    const r = c.instala('--cliente', 'claude-desktop');
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const config = JSON.parse(readFileSync(c.config, 'utf8'));
    assert.deepEqual(config.mcpServers.otro, {command: 'uvx', args: ['otro-mcp']});
    assert.equal(config.globalShortcut, 'Ctrl+Space');
    assert.deepEqual(config.mcpServers['erlen-slides'], {command: process.execPath, args: [SERVIDOR], env: {ERLEN_SLIDES_DIR: join(c.home, 'erlen-slides')}});
    assert.ok(readFileSync(c.config, 'utf8').includes('\n    "globalShortcut"'), 'conserva la sangría de 4');
    assert.ok(existsSync(join(c.home, 'erlen-slides')), 'crea la carpeta de trabajo');
    const [respaldo] = c.respaldos();
    assert.equal(c.respaldos().length, 1);
    assert.equal(readFileSync(join(c.home, '.config', 'Claude', respaldo), 'utf8'), original, 'la copia es el archivo de antes');

    const antes = readFileSync(c.config, 'utf8');
    const r2 = c.instala('--cliente', 'claude-desktop');
    assert.equal(r2.status, 0, r2.stderr);
    assert.match(r2.stdout, /Ya estaba configurado/);
    assert.equal(readFileSync(c.config, 'utf8'), antes);
    assert.equal(c.respaldos().length, 1, 'la segunda vez no hace otra copia');

    /* Otra carpeta: cambia la entrada y guarda otra copia. */
    const r3 = c.instala('--cliente', 'claude-desktop', '--carpeta', join(c.home, 'Charlas'));
    assert.equal(r3.status, 0, r3.stderr);
    assert.equal(JSON.parse(readFileSync(c.config, 'utf8')).mcpServers['erlen-slides'].env.ERLEN_SLIDES_DIR, join(c.home, 'Charlas'));
    assert.ok(c.respaldos().length >= 2);
  } finally { c.limpia(); }
});

test('instalador: sin configuración previa la crea, sin copia', () => {
  const c = casa();
  try {
    const r = c.instala('--cliente', 'claude-desktop', '--carpeta', '~/Presentaciones');
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /No encuentro Claude Desktop/);
    assert.equal(JSON.parse(readFileSync(c.config, 'utf8')).mcpServers['erlen-slides'].env.ERLEN_SLIDES_DIR, join(c.home, 'Presentaciones'), '«~» es la carpeta personal');
    assert.deepEqual(c.respaldos(), []);

    /* Un navegador que solo se encuentra por una variable de la terminal se
       fija en la entrada: Claude Desktop no hereda esa variable. */
    c.instala.env = {ERLEN_CHROMIUM: process.execPath};
    assert.equal(c.instala('--cliente', 'claude-desktop').status, 0);
    assert.equal(JSON.parse(readFileSync(c.config, 'utf8')).mcpServers['erlen-slides'].env.ERLEN_CHROMIUM, process.execPath);
  } finally { c.limpia(); }
});

test('instalador: no toca un JSON inválido', () => {
  const c = casa();
  try {
    mkdirSync(join(c.home, '.config', 'Claude'), {recursive: true});
    const roto = '{"mcpServers": {"otro": {"command": "x"},}}';
    writeFileSync(c.config, roto);
    const r = c.instala('--cliente', 'claude-desktop');
    assert.equal(r.status, 1);
    assert.match(r.stderr, /no es un JSON válido.*No lo toco/s);
    assert.equal(readFileSync(c.config, 'utf8'), roto);
    assert.deepEqual(c.respaldos(), []);
  } finally { c.limpia(); }
});

test('instalador: --dry-run no escribe nada', () => {
  const c = casa();
  try {
    mkdirSync(join(c.home, '.config', 'Claude'), {recursive: true});
    writeFileSync(c.config, '{}');
    const r = c.instala('--cliente', 'claude-desktop', '--dry-run');
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Escribiría en/);
    assert.match(r.stdout, /"erlen-slides"/);
    assert.equal(readFileSync(c.config, 'utf8'), '{}');
    assert.deepEqual(readdirSync(c.home).sort(), ['.config'], 'ni la carpeta de trabajo');
    assert.deepEqual(c.respaldos(), []);

    const k = c.instala('--cliente', 'claude-code', '--dry-run');
    assert.equal(k.status, 0, k.stderr);
    assert.ok(k.stdout.includes('claude mcp add erlen-slides --scope user -e'), k.stdout);
    /* Sin terminal y sin --cliente, solo se muestra. */
    const i = c.instala();
    assert.equal(i.status, 0, i.stderr);
    assert.match(i.stdout, /Claude Code:/);
    assert.equal(readFileSync(c.config, 'utf8'), '{}');
    assert.deepEqual(readdirSync(c.home).sort(), ['.config'], 'imprimir tampoco escribe');
  } finally { c.limpia(); }
});

/* Un «claude» falso en el PATH que apunta lo que recibe: la segunda vez la
   entrada ya existe, como en el de verdad. */
test('instalador: Claude Code con --ejecutar, repetible', {skip: process.platform === 'win32'}, () => {
  const c = casa();
  try {
    const bin = join(c.home, 'bin');
    mkdirSync(bin);
    writeFileSync(join(bin, 'claude'), `#!/bin/sh
echo "$*" >> "${join(c.home, 'llamadas.txt')}"
if [ "$2" = add ] && [ -f "${join(c.home, 'hay')}" ]; then echo "MCP server erlen-slides already exists in user config" >&2; exit 1; fi
if [ "$2" = add ]; then touch "${join(c.home, 'hay')}"; fi
if [ "$2" = remove ]; then rm -f "${join(c.home, 'hay')}"; fi
exit 0
`, {mode: 0o755});
    const corre = () => spawnSync(process.execPath, [SCRIPT, '--sin-prueba', '--no-compilar', '--cliente', 'claude-code', '--ejecutar'], {
      encoding: 'utf8', env: {...process.env, PATH: bin + ':' + process.env.PATH, ERLEN_INSTALAR_HOME: c.home}});
    const r1 = corre();
    assert.equal(r1.status, 0, r1.stdout + r1.stderr);
    const r2 = corre();
    assert.equal(r2.status, 0, r2.stdout + r2.stderr);
    assert.match(r2.stdout, /sustituye a la entrada anterior/);
    const llamadas = readFileSync(join(c.home, 'llamadas.txt'), 'utf8').trim().split('\n');
    assert.deepEqual(llamadas.map(l => l.split(' ').slice(0, 2).join(' ')), ['mcp add', 'mcp add', 'mcp remove', 'mcp add']);
    assert.equal(llamadas[0], `mcp add erlen-slides --scope user -e ERLEN_SLIDES_DIR=${join(c.home, 'erlen-slides')} -- ${process.execPath} ${SERVIDOR}`);
  } finally { c.limpia(); }
});

test('MCP: diagnostico', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    const {result: {tools}} = await c.pide('tools/list');
    assert.ok(tools.find(t => t.name === 'diagnostico').annotations.readOnlyHint);
    writeFileSync(join(dir, 'x.json'), '{}');
    await c.llama('crear_presentacion', {archivo: 'p'});
    await c.llama('editar_metadatos', {archivo: 'p', cambios: {titulo: 'T'}});
    const r = await c.llama('diagnostico', {});
    assert.equal(r.error, false, r.texto);
    const d = r.datos;
    for (const k of ['estado', 'problemas', 'node', 'aplicacion', 'carpeta_trabajo', 'navegador', 'rdkit', 'extensiones', 'variables']) assert.ok(k in d, 'falta ' + k);
    assert.equal(d.node.version, process.versions.node);
    assert.equal(d.node.ok, true);
    assert.equal(d.aplicacion.servidor, SERVIDOR);
    assert.equal(d.aplicacion.compilacion.existe, true);
    assert.equal(d.carpeta_trabajo.ruta, dir);
    assert.equal(d.carpeta_trabajo.escribible, true);
    assert.equal(d.carpeta_trabajo.presentaciones, 1);
    assert.ok(d.carpeta_trabajo.historial.archivos >= 1, 'editar_metadatos dejó una versión');
    assert.equal(d.rdkit.cargado, true, d.rdkit.error);
    assert.ok(d.extensiones.includes('mcp/extensiones/diagnostico.mjs'));
    assert.ok(d.extensiones.includes('mcp/extensiones/estadisticas.pagina.js'));
    assert.equal(d.variables.ERLEN_SLIDES_DIR, dir);
    assert.equal(typeof d.navegador.encontrado, 'boolean');
    assert.equal(d.estado, d.problemas.length ? 'con_problemas' : 'bien');
    d.problemas.forEach(p => assert.ok(p.problema && p.arreglo, JSON.stringify(p)));
    if (!d.navegador.encontrado) assert.ok(d.problemas.some(p => p.arreglo.includes('npx playwright-core install chromium')));
  });
});

test('diagnostico: variables sensibles, solo el nombre', async () => {
  const {variables} = await import('../mcp/extensiones/diagnostico.mjs');
  const v = variables({ERLEN_SLIDES_DIR: '/d', HTTPS_PROXY: 'http://usuario:clave@proxy:8080', ERLEN_TOKEN: 'abc', PATH: '/bin'});
  assert.deepEqual(v, {ERLEN_SLIDES_DIR: '/d', ERLEN_TOKEN: '(definida)', HTTPS_PROXY: '(definida)'});
});

test('diagnostico: build ausente, viejo o al día', async () => {
  const {estadoCompilacion} = await import('../mcp/extensiones/diagnostico.mjs');
  const r = mkdtempSync(join(tmpdir(), 'erlen-build-'));
  try {
    mkdirSync(join(r, 'src', 'js'), {recursive: true});
    writeFileSync(join(r, 'src', 'js', 'a.js'), '');
    assert.equal(estadoCompilacion(r).existe, false);
    mkdirSync(join(r, 'public'));
    writeFileSync(join(r, 'public', 'index.html'), '');
    utimesSync(join(r, 'src', 'js', 'a.js'), new Date(2020, 0, 1), new Date(2020, 0, 1));
    assert.equal(estadoCompilacion(r).al_dia, true);
    const luego = new Date(Date.now() + 60000);
    utimesSync(join(r, 'src', 'js', 'a.js'), luego, luego);
    const viejo = estadoCompilacion(r);
    assert.equal(viejo.al_dia, false);
    assert.equal(viejo.cambio_posterior, 'src/js/a.js');
  } finally { rmSync(r, {recursive: true, force: true}); }
});

test('MCP: diagnostico con ERLEN_CHROMIUM roto da el arreglo', {timeout: 120000}, async () => {
  const antes = process.env.ERLEN_CHROMIUM;
  process.env.ERLEN_CHROMIUM = join(tmpdir(), 'no-existe-chromium');
  try {
    await conServidor(async c => {
      const d = (await c.llama('diagnostico', {})).datos;
      assert.equal(d.navegador.encontrado, false);
      assert.equal(d.estado, 'con_problemas');
      assert.ok(d.problemas.some(p => /ERLEN_CHROMIUM/.test(p.problema) && p.arreglo.includes('npx playwright-core install chromium')), JSON.stringify(d.problemas));
      assert.equal(d.variables.ERLEN_CHROMIUM, process.env.ERLEN_CHROMIUM);
    });
  } finally { if (antes == null) delete process.env.ERLEN_CHROMIUM; else process.env.ERLEN_CHROMIUM = antes; }
});
