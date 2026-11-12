/* SPDX-License-Identifier: AGPL-3.0-only */
import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {conServidor} from './_mcp-cliente.mjs';

/* Espectros de reflectancia difusa sintéticos: un borde directo en la energía que
   se indique (eV), con la reflectancia invertida desde Kubelka–Munk. No son medidas. */
function reflectancia(borde) {
  const filas = ['Longitud de onda (nm),Reflectancia (%)'];
  for (let lam = 300; lam <= 700; lam += 2) {
    const hv = 1239.84 / lam;
    const f = hv > borde ? 3 * Math.sqrt(hv - borde) / hv + 0.02 : 0.02;
    filas.push(lam + ',' + (((1 + f) - Math.sqrt(f * f + 2 * f)) * 100).toFixed(4));
  }
  return filas.join('\n') + '\n';
}

test('MCP graficas: los espectros de reflectancia difusa se nombran como tales', {timeout: 180000}, async () => {
  await conServidor(async (c, dir) => {
    mkdirSync(join(dir, 'uv'), {recursive: true});
    writeFileSync(join(dir, 'uv/reflectancia-a.csv'), reflectancia(3.1));
    writeFileSync(join(dir, 'uv/reflectancia-b.csv'), reflectancia(3.3));
    assert.equal((await c.llama('crear_presentacion', {archivo: 'p', titulo: 'Reflectancia (datos sintéticos)'})).error, false);
    const r = await c.llama('comparar_espectros', {archivo: 'p', titulo: 'Dos muestras',
      archivos: ['uv/reflectancia-a.csv', 'uv/reflectancia-b.csv']});
    assert.equal(r.error, false, r.texto);
    assert.match(r.datos.tecnica, /reflectancia difusa/, 'la técnica sale del nombre del archivo');
    assert.match(r.datos.pie_sugerido, /^Espectros UV-Vis de reflectancia difusa de /, 'el pie propuesto no cae en «Curvas»: ' + r.datos.pie_sugerido);
  });
});
