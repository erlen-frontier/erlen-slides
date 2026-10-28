/* SPDX-License-Identifier: AGPL-3.0-only */
import test from 'node:test';
import assert from 'node:assert/strict';
import {cpSync, existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

test('A clean build generates its inputs before reading the module order', {timeout: 90000}, () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const clean = mkdtempSync(join(tmpdir(), 'erlen-slides-clean-'));
  const generated = ['_informe-limites-gen.js', '_glass-map-gen.js'];
  try {
    for (const name of ['src', 'vendor', 'web', 'mcp', 'licenses', 'herramientas', 'LICENSE', 'package.json']) {
      cpSync(join(root, name), join(clean, name), {
        recursive: true,
        filter: p => !generated.some(n => p.endsWith('/src/js/' + n))
      });
    }
    symlinkSync(join(root, 'node_modules'), join(clean, 'node_modules'), 'dir');
    generated.forEach(n => assert.equal(existsSync(join(clean, 'src/js', n)), false));
    const result = spawnSync(process.execPath, [join(clean, 'herramientas/build.mjs')], {
      cwd: clean, env: process.env, encoding: 'utf8', timeout: 80000
    });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    generated.forEach(n => assert.equal(existsSync(join(clean, 'src/js', n)), true));
    const html = readFileSync(join(clean, 'public/index.html'));
    const build = JSON.parse(readFileSync(join(clean, 'public/build.json')));
    assert.equal(build.sha256, createHash('sha256').update(html).digest('hex'));
    assert.match(html.toString(), /const INFORME_LIMITES=Object\.freeze/);
    assert.match(html.toString(), /const ERLEN_GLASS_MAP=/);
  } finally {
    rmSync(clean, {recursive: true, force: true});
  }
});
