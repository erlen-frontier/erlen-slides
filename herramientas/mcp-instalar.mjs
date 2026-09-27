/* SPDX-License-Identifier: AGPL-3.0-only */
/* Conecta el servidor MCP de Erlen Slides a Claude sin editar JSON a mano.

     npm run mcp:instalar
     npm run mcp:instalar -- --cliente claude-desktop|claude-code|imprimir
                             [--carpeta <dir>] [--dry-run] [--ejecutar]
                             [--compilar | --no-compilar] [--config <archivo>] [--sin-prueba]

   Comprueba Node, las dependencias y el build; después escribe la entrada
   «erlen-slides» en la configuración de Claude Desktop (con copia de
   seguridad antes de tocarla), o da el comando de Claude Code, o solo lo
   imprime. Ejecutarlo dos veces no cambia nada la segunda.

   El comando que se escribe es la ruta absoluta de este mismo Node: Claude
   Desktop se abre desde el escritorio, sin el PATH de la terminal, y un
   «node» a secas falla ahí aunque en la terminal funcione.

   Para las pruebas todo se puede desviar: ERLEN_INSTALAR_HOME (la carpeta
   personal), ERLEN_INSTALAR_APPDATA (%APPDATA% de Windows) y
   ERLEN_INSTALAR_PLATAFORMA (darwin, win32, linux). */
import {readFileSync, writeFileSync, renameSync, existsSync, mkdirSync, copyFileSync, readdirSync} from 'node:fs';
import {spawnSync, spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {createInterface as preguntas} from 'node:readline/promises';
import path from 'node:path';
import {homedir} from 'node:os';
import {fileURLToPath, pathToFileURL} from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const SERVIDOR = path.resolve(RAIZ, 'mcp', 'servidor.mjs');
const NOMBRE = 'erlen-slides';

/* ---------- rutas ---------- */
export function entorno(env = process.env) {
  const plataforma = env.ERLEN_INSTALAR_PLATAFORMA || process.platform;
  const home = env.ERLEN_INSTALAR_HOME || homedir();
  /* Con la carpeta personal desviada, %APPDATA% cuelga de ella: así una
     prueba nunca llega a la configuración real. */
  const appdata = env.ERLEN_INSTALAR_APPDATA || (env.ERLEN_INSTALAR_HOME ? path.win32.join(home, 'AppData', 'Roaming') : env.APPDATA || path.win32.join(home, 'AppData', 'Roaming'));
  const localappdata = env.ERLEN_INSTALAR_HOME ? path.win32.join(home, 'AppData', 'Local') : env.LOCALAPPDATA || path.win32.join(home, 'AppData', 'Local');
  return {plataforma, home, appdata, localappdata};
}

/* Dónde guarda Claude Desktop su configuración en cada sistema. La versión
   de la Microsoft Store la guarda dentro de su paquete: si existe esa
   carpeta, es la que lee. */
export function rutaConfigDesktop({plataforma, home, appdata, localappdata}) {
  if (plataforma === 'darwin') return path.posix.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  if (plataforma === 'win32') {
    try {
      const pkgs = path.win32.join(localappdata, 'Packages');
      const tienda = readdirSync(pkgs).find(n => /^Claude_/.test(n));
      if (tienda) {
        const dir = path.win32.join(pkgs, tienda, 'LocalCache', 'Roaming', 'Claude');
        if (existsSync(dir)) return path.win32.join(dir, 'claude_desktop_config.json');
      }
    } catch {}
    return path.win32.join(appdata, 'Claude', 'claude_desktop_config.json');
  }
  return path.posix.join(home, '.config', 'Claude', 'claude_desktop_config.json');
}

/* ---------- configuración de Claude Desktop ---------- */
export function entrada({node = process.execPath, servidor = SERVIDOR, carpeta, chromium}) {
  return {command: node, args: [servidor], env: {ERLEN_SLIDES_DIR: carpeta, ...(chromium ? {ERLEN_CHROMIUM: chromium} : {})}};
}

/* Sangría y fin de línea del archivo, para que el que ya lo editó a mano lo
   reconozca después. */
function formato(texto) {
  const m = texto.match(/\n([ \t]+)"/);
  return {sangria: m ? m[1] : '  ', eol: texto.includes('\r\n') ? '\r\n' : '\n'};
}

/* Une la entrada con lo que ya hay. Devuelve {estado, texto, config} sin
   escribir nada: estado es «nuevo», «igual» o «cambiado». Un JSON que no se
   entiende no se toca: se explica dónde está el error. */
export function combina(textoPrevio, nueva) {
  let config = {};
  if (textoPrevio != null && textoPrevio.trim()) {
    try { config = JSON.parse(textoPrevio.replace(/^﻿/, '')); }
    catch (e) { throw new ErrorInstalar('El archivo no es un JSON válido (' + e.message + '). No lo toco para no perder lo que tengas. Corrígelo (suele ser una coma de más o de menos) o muévelo a otro sitio y vuelve a ejecutar el instalador.'); }
    if (!config || typeof config !== 'object' || Array.isArray(config)) throw new ErrorInstalar('El archivo no contiene un objeto JSON ({...}). No lo toco.');
    if (config.mcpServers != null && (typeof config.mcpServers !== 'object' || Array.isArray(config.mcpServers))) throw new ErrorInstalar('«mcpServers» no es un objeto. No lo toco.');
  }
  const previa = config.mcpServers && config.mcpServers[NOMBRE];
  /* Lo que alguien haya añadido a la entrada (otra variable, como
     ERLEN_CHROMIUM) se conserva; solo se fija lo nuestro. */
  const combinada = {...(previa || {}), ...nueva, env: {...(previa && previa.env || {}), ...nueva.env}};
  if (previa && JSON.stringify(previa) === JSON.stringify(combinada)) return {estado: 'igual', config};
  const out = {...config, mcpServers: {...(config.mcpServers || {}), [NOMBRE]: combinada}};
  const {sangria, eol} = formato(textoPrevio || '');
  return {estado: previa ? 'cambiado' : 'nuevo', config: out, texto: JSON.stringify(out, null, sangria).replace(/\n/g, eol) + eol};
}

export class ErrorInstalar extends Error {}

const sello = () => new Date().toISOString().replace(/\.\d+Z$/, '').replace(/[-:]/g, '').replace('T', '-');

/* Escribe la configuración con copia previa y de forma atómica: si algo
   falla a medias, el archivo anterior sigue entero. */
export function instalaDesktop({ruta, entrada: e, dryRun = false}) {
  const existia = existsSync(ruta);
  const previo = existia ? readFileSync(ruta, 'utf8') : null;
  const r = combina(previo, e);
  if (r.estado === 'igual' || dryRun) return {...r, ruta, existia, respaldo: null};
  mkdirSync(path.dirname(ruta), {recursive: true});
  let respaldo = null;
  if (existia) {
    respaldo = ruta + '.respaldo-' + sello();
    for (let i = 2; existsSync(respaldo); i++) respaldo = ruta + '.respaldo-' + sello() + '-' + i;
    copyFileSync(ruta, respaldo);
  }
  const tmp = ruta + '.tmp-' + process.pid;
  writeFileSync(tmp, r.texto);
  renameSync(tmp, ruta);
  return {...r, ruta, existia, respaldo};
}

/* ---------- Claude Code ---------- */
/* Comillas según el intérprete: en Windows (cmd y PowerShell) dobles; en
   macOS y Linux simples, que no expanden nada. */
export function cita(s, plataforma = process.platform) {
  s = String(s);
  if (plataforma === 'win32') return /[\s"&|<>^()%!;,]/.test(s) || !s ? '"' + s.replace(/"/g, '""') + '"' : s;
  return /^[\w@%+=:,./-]+$/.test(s) ? s : "'" + s.replace(/'/g, "'\\''") + "'";
}
export function argsClaudeCode({node = process.execPath, servidor = SERVIDOR, carpeta}) {
  return ['mcp', 'add', NOMBRE, '--scope', 'user', '-e', 'ERLEN_SLIDES_DIR=' + carpeta, '--', node, servidor];
}
export const comandoClaudeCode = (o, plataforma = process.platform) => ['claude', ...argsClaudeCode(o)].map(x => cita(x, plataforma)).join(' ');

/* ---------- comprobaciones ---------- */
async function comprobaciones() {
  /* diagnostico.mjs solo importa módulos de Node al cargar: se puede usar
     antes de «npm ci». */
  return import('../mcp/extensiones/diagnostico.mjs');
}

/* El servidor arranca, responde y lista sus herramientas: si esto pasa aquí,
   con el mismo comando y las mismas variables, pasa en Claude. */
function pruebaServidor(e, segundos = 60) {
  return new Promise(ok => {
    const p = spawn(e.command, e.args, {env: {...process.env, ...e.env}, stdio: ['pipe', 'pipe', 'pipe']});
    const err = [];
    const fin = r => { clearTimeout(t); p.kill(); ok(r); };
    const t = setTimeout(() => fin({ok: false, error: 'no respondió en ' + segundos + ' s'}), segundos * 1000);
    p.on('error', x => fin({ok: false, error: x.message}));
    p.stderr.on('data', d => err.push(String(d)));
    p.on('exit', c => fin({ok: false, error: 'terminó con código ' + c + (err.length ? ': ' + err.join('').trim().split('\n').slice(-3).join(' ') : '')}));
    createInterface({input: p.stdout}).on('line', l => {
      let m; try { m = JSON.parse(l); } catch { return; }
      if (m.id === 1) p.stdin.write(JSON.stringify({jsonrpc: '2.0', id: 2, method: 'tools/list'}) + '\n');
      if (m.id === 2) fin(m.result && Array.isArray(m.result.tools) ? {ok: true, herramientas: m.result.tools.length} : {ok: false, error: m.error && m.error.message || 'respuesta inesperada a tools/list'});
    });
    p.stdin.write(JSON.stringify({jsonrpc: '2.0', id: 1, method: 'initialize', params: {protocolVersion: '2025-06-18', capabilities: {}, clientInfo: {name: 'mcp-instalar', version: '0'}}}) + '\n');
  });
}

/* ---------- línea de órdenes ---------- */
const AYUDA = `Conecta Erlen Slides a Claude (servidor MCP).

  npm run mcp:instalar -- [opciones]

  --cliente <c>     claude-desktop, claude-code o imprimir (solo muestra la configuración)
  --carpeta <dir>   carpeta de trabajo de las presentaciones (por omisión ~/erlen-slides)
  --dry-run         dice lo que haría sin escribir ni ejecutar nada
  --ejecutar        con claude-code: ejecuta «claude mcp add» en vez de solo mostrarlo
  --compilar        construye la aplicación si falta o está vieja, sin preguntar
  --no-compilar     no la construye (solo avisa)
  --config <arch>   otro claude_desktop_config.json
  --sin-prueba      no arranca el servidor para comprobarlo
  --ayuda           esta ayuda`;

export function leeArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const valor = () => { const v = argv[++i]; if (v == null || v.startsWith('--')) throw new ErrorInstalar('Falta el valor de ' + a + '.'); return v; };
    if (a === '--cliente') o.cliente = valor();
    else if (a.startsWith('--cliente=')) o.cliente = a.slice(10);
    else if (a === '--carpeta') o.carpeta = valor();
    else if (a.startsWith('--carpeta=')) o.carpeta = a.slice(10);
    else if (a === '--config') o.config = valor();
    else if (a === '--dry-run' || a === '--simular') o.dryRun = true;
    else if (a === '--ejecutar') o.ejecutar = true;
    else if (a === '--compilar') o.compilar = true;
    else if (a === '--no-compilar') o.compilar = false;
    else if (a === '--sin-prueba') o.sinPrueba = true;
    else if (a === '--ayuda' || a === '--help' || a === '-h') o.ayuda = true;
    else throw new ErrorInstalar('Opción desconocida: ' + a + '. Usa --ayuda.');
  }
  if (o.cliente && !['claude-desktop', 'claude-code', 'imprimir'].includes(o.cliente)) throw new ErrorInstalar('Cliente desconocido: «' + o.cliente + '». Usa claude-desktop, claude-code o imprimir.');
  return o;
}

const bien = s => console.log('  ✓ ' + s), aviso = s => console.log('  ! ' + s), paso = s => console.log('\n' + s);

async function principal(argv) {
  let o;
  try { o = leeArgs(argv); } catch (e) { console.error('  ✗ ' + e.message); return 1; }
  if (o.ayuda) { console.log(AYUDA); return 0; }
  const interactivo = !!(process.stdin.isTTY && process.stdout.isTTY);
  /* Una interfaz por pregunta, cerrada al contestar: abierta dejaría la
     terminal en modo crudo mientras corre «npm ci» y Ctrl+C no lo pararía. */
  const lee = async q => {
    const rl = preguntas({input: process.stdin, output: process.stdout});
    try { return (await rl.question(q)).trim(); } finally { rl.close(); }
  };
  const pregunta = async (q, porOmision = true) => {
    if (!interactivo) return null;
    const r = (await lee('  ? ' + q + (porOmision ? ' [S/n] ' : ' [s/N] '))).toLowerCase();
    return r ? /^s|^y/.test(r) : porOmision;
  };
  try {
    const ent = entorno();
    const D = await comprobaciones();
    console.log('Erlen Slides · instalación del servidor MCP' + (o.dryRun ? ' (simulación: no se escribe nada)' : ''));

    paso('1. Comprobaciones');
    if (!D.nodeValido()) throw new ErrorInstalar('Node ' + process.versions.node + ' es demasiado antiguo: hace falta ' + D.NODE_MINIMO + ' o posterior. Instala la versión LTS de https://nodejs.org y vuelve a ejecutar «npm run mcp:instalar».');
    bien('Node ' + process.versions.node + ' (' + process.execPath + ')');

    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const ejecuta = (cmd, args) => spawnSync(cmd, args, {cwd: RAIZ, stdio: 'inherit', shell: process.platform === 'win32'}).status === 0;
    let deps = D.dependenciasInstaladas();
    if (!deps.ok) {
      aviso('Faltan dependencias (' + deps.faltan.join(', ') + '): hace falta «npm ci» en ' + RAIZ + '.');
      if (!o.dryRun && (o.compilar || await pregunta('¿Ejecuto «npm ci» ahora?'))) {
        if (!ejecuta(npm, ['ci'])) throw new ErrorInstalar('«npm ci» falló. Revisa el mensaje de arriba (¿conexión a Internet?) y vuelve a intentarlo.');
        deps = D.dependenciasInstaladas();
      }
    }
    if (deps.ok) bien('Dependencias instaladas');

    let comp = D.estadoCompilacion();
    if (!comp.existe || !comp.al_dia) {
      aviso(!comp.existe ? 'La aplicación no está construida (falta public/index.html).' : 'La aplicación construida es anterior a la fuente (' + comp.cambio_posterior + ' cambió después).');
      const construir = o.dryRun ? false : o.compilar ?? await pregunta('¿La construyo ahora con «npm run build»?');
      if (construir && deps.ok) {
        if (!ejecuta(process.execPath, [path.join(RAIZ, 'herramientas', 'build.mjs')])) throw new ErrorInstalar('«npm run build» falló. Revisa el mensaje de arriba.');
        comp = D.estadoCompilacion();
      } else if (construir) aviso('Antes hay que instalar las dependencias con «npm ci».');
      else aviso('Constrúyela después con: cd "' + RAIZ + '" && npm run build');
    }
    if (comp.existe && comp.al_dia) bien('Aplicación construida y al día');

    const nav = await D.buscaNavegador();
    if (nav.encontrado) bien('Navegador para la vista previa: ' + nav.ruta);
    else aviso('No hay Chromium ni Chrome: la vista previa, el PDF y el PowerPoint no funcionarán (lo demás sí). Para instalarlo: cd "' + RAIZ + '" && npx playwright-core install chromium');

    paso('2. Carpeta de trabajo');
    const carpeta = path.resolve(o.carpeta ? o.carpeta.replace(/^~(?=$|[\\/])/, ent.home) : path.join(ent.home, 'erlen-slides'));
    bien(carpeta + (existsSync(carpeta) ? '' : ' (nueva)') + ': ahí van tus proyectos .json, imágenes y datos');

    let cliente = o.cliente;
    if (!cliente && interactivo) {
      const r = await lee('\n  ? ¿Qué cliente conecto? 1) Claude Desktop  2) Claude Code  3) solo mostrar la configuración [1] ');
      cliente = r === '2' ? 'claude-code' : r === '3' ? 'imprimir' : 'claude-desktop';
    }
    /* Sin terminal y sin --cliente no se toca nada: se muestra. */
    cliente ||= 'imprimir';
    /* Si el navegador solo se encontró gracias a una variable de esta
       terminal (ERLEN_CHROMIUM, PLAYWRIGHT_BROWSERS_PATH), Claude Desktop no
       la tendrá: se fija su ruta en la entrada. */
    const chromium = nav.encontrado && (process.env.ERLEN_CHROMIUM || process.env.PLAYWRIGHT_BROWSERS_PATH) ? nav.ruta : null;
    const e = entrada({carpeta, chromium});
    /* Se crea solo si se conecta algo: «imprimir» y --dry-run no escriben. */
    if (cliente !== 'imprimir' && !o.dryRun) mkdirSync(carpeta, {recursive: true});

    paso('3. ' + {'claude-desktop': 'Claude Desktop', 'claude-code': 'Claude Code', imprimir: 'Configuración'}[cliente]);
    if (cliente === 'claude-desktop') {
      const ruta = o.config ? path.resolve(o.config) : rutaConfigDesktop(ent);
      if (!existsSync(path.dirname(ruta))) aviso('No encuentro Claude Desktop en este equipo (falta ' + path.dirname(ruta) + '). Dejo la configuración lista para cuando lo instales.');
      const r = instalaDesktop({ruta, entrada: e, dryRun: o.dryRun});
      if (r.estado === 'igual') bien('Ya estaba configurado en ' + ruta + ' (no se cambió nada).');
      else if (o.dryRun) { console.log('  Escribiría en ' + ruta + (r.existia ? ' (con copia de seguridad antes)' : ' (archivo nuevo)') + ':'); console.log(r.texto.replace(/^/gm, '    ')); }
      else {
        bien((r.estado === 'nuevo' ? 'Añadido' : 'Actualizado') + ' «' + NOMBRE + '» en ' + ruta);
        if (r.respaldo) bien('Copia de seguridad: ' + r.respaldo);
        const otros = Object.keys(r.config.mcpServers).filter(k => k !== NOMBRE);
        if (otros.length) bien('Se conservan los demás servidores: ' + otros.join(', '));
      }
    } else if (cliente === 'claude-code') {
      const texto = comandoClaudeCode({carpeta});
      if (o.ejecutar && !o.dryRun) {
        const w = process.platform === 'win32';
        const anade = () => w ? spawnSync(texto, {encoding: 'utf8', shell: true}) : spawnSync('claude', argsClaudeCode({carpeta}), {encoding: 'utf8'});
        let r = anade();
        if (r.error && r.error.code === 'ENOENT') throw new ErrorInstalar('No encuentro el programa «claude». Instala Claude Code o ejecuta tú mismo:\n    ' + texto);
        /* «claude mcp add» no sobrescribe: solo si la entrada ya existe se
           quita y se repite, para que ejecutarlo dos veces dé lo mismo. Si
           falla por otra cosa, la entrada anterior sigue como estaba. */
        let quitada = false;
        if (r.status !== 0 && /already exists|ya existe/i.test(r.stdout + r.stderr)) {
          quitada = spawnSync('claude', ['mcp', 'remove', NOMBRE, '--scope', 'user'], {encoding: 'utf8', shell: w}).status === 0;
          r = anade();
        }
        if (r.status !== 0) throw new ErrorInstalar('«claude mcp add» falló' + (quitada ? ' tras quitar la entrada anterior' : '') + ': ' + String(r.stderr || r.stdout || '').trim().split('\n').slice(-2).join(' ') + '\n  Puedes ejecutarlo a mano:\n    ' + texto);
        bien('Añadido a Claude Code para todas tus carpetas' + (quitada ? ' (sustituye a la entrada anterior).' : '.'));
      } else {
        console.log('  Ejecuta en una terminal (sirve desde cualquier carpeta):\n');
        console.log('    ' + texto + '\n');
        console.log('  O repite esto con --ejecutar y lo hago yo.');
      }
    } else {
      console.log('  Claude Desktop, en ' + rutaConfigDesktop(ent) + ':\n');
      console.log(JSON.stringify({mcpServers: {[NOMBRE]: e}}, null, 2).replace(/^/gm, '    '));
      console.log('\n  Claude Code:\n\n    ' + comandoClaudeCode({carpeta}));
      console.log('\n  Otro cliente MCP por stdio: comando «' + e.command + '», argumento «' + e.args[0] + '», variable ERLEN_SLIDES_DIR=' + carpeta);
    }

    if (!o.dryRun && !o.sinPrueba && cliente !== 'imprimir' && deps.ok && comp.existe) {
      paso('4. Prueba del servidor');
      const p = await pruebaServidor(e);
      if (p.ok) bien('Arranca y responde: ' + p.herramientas + ' herramientas.');
      else aviso('El servidor no respondió (' + p.error + '). Ejecuta «npm run mcp:instalar» otra vez tras corregirlo, o pide a Claude la herramienta «diagnostico».');
    }

    paso('Siguientes pasos');
    if (cliente === 'claude-desktop') console.log('  • Cierra Claude Desktop del todo (también desde la bandeja o el Dock) y vuelve a abrirlo.\n  • En una conversación nueva debería aparecer «erlen-slides» en el menú de herramientas.');
    else if (cliente === 'claude-code') console.log('  • Abre Claude Code y escribe /mcp: debería aparecer «erlen-slides» conectado.');
    else console.log('  • Copia la configuración de arriba en tu cliente, o vuelve a ejecutar con --cliente claude-desktop para que la escriba yo.');
    console.log('  • Prueba a pedir: «Crea una presentación de 5 diapositivas sobre la síntesis de nanopartículas de plata y enséñame el mosaico».');
    console.log('  • Si algo falla, pide: «Ejecuta el diagnóstico de Erlen Slides».');
    return 0;
  } catch (e) {
    if (!(e instanceof ErrorInstalar)) throw e;
    console.error('\n  ✗ ' + e.message);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  principal(process.argv.slice(2)).then(c => { process.exitCode = c; }, e => { console.error(e && e.stack || e); process.exitCode = 1; });
}
