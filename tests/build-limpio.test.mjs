/* SPDX-License-Identifier: AGPL-3.0-only */
import test from 'node:test';
import assert from 'node:assert/strict';
import {cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

/* Copia aislada del repositorio sin los módulos generados, con node_modules enlazado. */
function arbolLimpio() {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const clean = mkdtempSync(join(tmpdir(), 'erlen-slides-clean-'));
  for (const name of ['src', 'vendor', 'web', 'mcp', 'licenses', 'herramientas', 'LICENSE', 'package.json']) {
    cpSync(join(root, name), join(clean, name), {
      recursive: true,
    });
  }
  symlinkSync(join(root, 'node_modules'), join(clean, 'node_modules'), 'dir');
  return clean;
}

function construye(clean) {
  return spawnSync(process.execPath, [join(clean, 'herramientas/build.mjs')], {
    cwd: clean, env: process.env, encoding: 'utf8', timeout: 80000
  });
}

test('A clean build succeeds from a clean tree', {timeout: 90000}, () => {
  const clean = arbolLimpio();
  try {
    const result = construye(clean);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const html = readFileSync(join(clean, 'public/index.html'));
    const build = JSON.parse(readFileSync(join(clean, 'public/build.json')));
    assert.equal(build.sha256, createHash('sha256').update(html).digest('hex'));
    assert.ok(Buffer.byteLength(html) < 3.4 * 1024 * 1024, 'El HTML único supera el presupuesto de 3,4 MiB: ' + Buffer.byteLength(html) + ' bytes');
  } finally {
    rmSync(clean, {recursive: true, force: true});
  }
});

test('A build replaces its own stale outputs and keeps unrelated files', {timeout: 90000}, () => {
  const clean = arbolLimpio();
  const publico = join(clean, 'public');
  try {
    /* Restos de una build anterior en los destinos que el generador vuelve a crear. */
    mkdirSync(join(publico, 'libre/mermaid/chunks/mermaid.esm.min'), {recursive: true});
    writeFileSync(join(publico, 'libre/mermaid/chunks/mermaid.esm.min/obsoleto.mjs'), '// chunk de una build anterior\n');
    mkdirSync(join(publico, 'licenses'), {recursive: true});
    writeFileSync(join(publico, 'licenses/paquete-antiguo@9.9.9.txt'), 'licencia retirada del árbol actual\n');
    writeFileSync(join(publico, 'lamina-offline.html'), '<!doctype html><title>ANTIGUO</title>');
    writeFileSync(join(publico, 'tabula-offline.html'), '<!doctype html><title>ANTIGUO</title>');
    /* Un archivo ajeno al generador (p. ej. una exportación del usuario) debe sobrevivir. */
    writeFileSync(join(publico, 'presentacion-usuario.json'), '{"v":1}\n');
    const result = construye(clean);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    /* El árbol generado no conserva restos. */
    assert.equal(existsSync(join(publico, 'libre/mermaid/chunks/mermaid.esm.min/obsoleto.mjs')), false);
    assert.equal(existsSync(join(publico, 'licenses/paquete-antiguo@9.9.9.txt')), false);
    assert.equal(existsSync(join(publico, 'tabula-offline.html')), false);
    assert.equal(existsSync(join(publico, 'erlen-slides-offline.html')), false);
    assert.equal(existsSync(join(publico, 'lamina-offline.html')), true, 'no se generó lamina-offline.html');
    assert.equal(existsSync(join(publico, 'tabula-offline.html')), false, 'no se retiró tabula-offline.html');
    assert.doesNotMatch(readFileSync(join(publico, 'lamina-offline.html'), 'utf8'), /ANTIGUO/);
    assert.equal(existsSync(join(publico, 'presentacion-usuario.json')), true);
    /* El manifiesto solo registra el árbol actual. */
    const manifest = JSON.parse(readFileSync(join(publico, 'libre/manifest.json'), 'utf8'));
    assert.ok(manifest.some(e => e.package === 'mermaid'), 'el manifiesto registra los recursos actuales');
    assert.ok(manifest.every(e => !String(e.file).includes('obsoleto')), 'el manifiesto no conserva archivos obsoletos');
  } finally {
    rmSync(clean, {recursive: true, force: true});
  }
});
