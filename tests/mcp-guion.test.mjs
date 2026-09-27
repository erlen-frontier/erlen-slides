/* SPDX-License-Identifier: AGPL-3.0-only */
/* Extensión «guion» del MCP: ajustar_tiempos (con planTiempo e intocable de
   59-ajustar-tiempo.js), el formato de exportación «guion» (Markdown propio
   y el guionHTML del editor) y ensayo_resumen sobre meta.ensayo. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {join} from 'node:path';
import {conServidor, proyecto} from './_mcp-cliente.mjs';

const charla = [
  {diseno: 'section', titulo: 'Método'},
  {titulo: 'Síntesis por coprecipitación', minutos: 2, notas: 'Contar el pH y la temperatura.\n- pH 10\n- 65 °C', zonas: [[{tipo: 'chem', tex: 'Zn^2+ + 2 OH- -> Zn(OH)2 v'}]]},
  {titulo: 'Scherrer', minutos: 1, zonas: [[{tipo: 'math', tex: 'D = K\\lambda/(\\beta\\cos\\theta)'}]]},
  {titulo: 'Difractogramas', minutos: 3, notas: 'Datos ilustrativos.', zonas: [[{tipo: 'chart', caption: 'XRD ilustrativo', data: [['x', 'y'], [1, 2], [2, 3]]}]]},
  {titulo: 'Detalle', minutos: 2, zonas: [[{tipo: 'text', text: 'Solo texto.'}]]}
];
const minCharla = d => d.slides.filter(s => !s.respaldo).reduce((a, s) => a + (+s.min || 0), 0);

test('MCP guion: ajustar_tiempos propone, respeta intocables y solo escribe con aplicar', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    assert.equal((await c.llama('crear_presentacion', {archivo: 't', titulo: 'T', diapositivas: charla})).error, false);
    const antes = readFileSync(join(dir, 't.json'), 'utf8');

    const p = await c.llama('ajustar_tiempos', {archivo: 't', minutos_objetivo: 6});
    assert.equal(p.error, false, p.texto);
    const r = p.datos;
    assert.equal(r.aplicado, false);
    assert.equal(r.despues_min, 6);
    assert.equal(r.diapositivas.reduce((a, x) => a + (x.despues || 0), 0), 6, 'el plan suma el objetivo');
    assert.match(r.heuristica, /proporción/);
    assert.deepEqual(r.intocables.map(x => [x.n, x.motivo]), [[1, 'portada'], [2, 'separador de sección']]);
    /* Portada y sección sin minutos: un cuarto de minuto cada una. */
    assert.deepEqual(r.diapositivas.slice(0, 2).map(x => x.despues), [0.25, 0.25]);
    assert.ok(r.diapositivas.every(x => x.despues % 0.25 === 0), 'cuartos de minuto');
    assert.equal(readFileSync(join(dir, 't.json'), 'utf8'), antes, 'sin aplicar no escribe');

    /* Una imprescindible (★) conserva sus minutos; las demás se reparten. */
    const a = await c.llama('ajustar_tiempos', {archivo: 't', minutos_objetivo: 6, aplicar: true, imprescindibles: [5]});
    assert.equal(a.error, false, a.texto);
    assert.equal(a.datos.aplicado, true);
    const d = proyecto(dir, 't');
    assert.equal(minCharla(d), 6);
    assert.equal(d.slides[4].min, 3);
    assert.equal(d.slides[4].clave, true);
    assert.equal(a.datos.intocables.find(x => x.n === 5).motivo, 'marcada como imprescindible (★)');
    assert.equal((await c.llama('historial_presentacion', {archivo: 't'})).datos.deshacer[0].antes_de, 'ajustar_tiempos');
    await c.llama('deshacer', {archivo: 't'});
    assert.equal(readFileSync(join(dir, 't.json'), 'utf8'), antes, 'deshacer lo revierte');
  });
});

test('MCP guion: al_respaldo usa el plan del editor y lo imposible no se guarda', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    await c.llama('crear_presentacion', {archivo: 't', titulo: 'T', diapositivas: charla});
    const r = await c.llama('ajustar_tiempos', {archivo: 't', minutos_objetivo: 5, al_respaldo: true, aplicar: true});
    assert.equal(r.error, false, r.texto);
    const d = proyecto(dir, 't');
    const movidas = r.datos.diapositivas.filter(x => x.pasa_al_respaldo);
    assert.ok(movidas.length >= 1);
    assert.ok(movidas.every(x => x.era_la > 2), 'portada y sección no se mueven');
    assert.ok(d.slides.slice(-movidas.length).every(s => s.respaldo), 'el respaldo va al final');
    assert.equal(minCharla(d), 5);
    assert.equal(r.datos.despues_min, 5);

    /* Si el plan se llevara todo el contenido, se queda la de más peso. */
    await c.llama('crear_presentacion', {archivo: 'v', titulo: 'V', diapositivas: [{diseno: 'section', titulo: 'S'}, {titulo: 'Única', minutos: 3}]});
    const v = await c.llama('ajustar_tiempos', {archivo: 'v', minutos_objetivo: 2, al_respaldo: true});
    assert.equal(v.error, false, v.texto);
    assert.equal(v.datos.imposible, undefined);
    assert.deepEqual(v.datos.diapositivas.map(x => x.despues), [0.25, 0.25, 1.5]);

    /* 4 diapositivas libres a 0:15 no caben en 1 min con portada y sección. */
    await c.llama('crear_presentacion', {archivo: 'u', titulo: 'U', diapositivas: charla});
    const antes = readFileSync(join(dir, 'u.json'), 'utf8');
    const p = await c.llama('ajustar_tiempos', {archivo: 'u', minutos_objetivo: 1});
    assert.equal(p.error, false);
    assert.match(p.datos.imposible, /no caben/);
    assert.equal(p.datos.despues_min, null);
    const x = await c.llama('ajustar_tiempos', {archivo: 'u', minutos_objetivo: 1, aplicar: true});
    assert.equal(x.error, true);
    assert.equal(readFileSync(join(dir, 'u.json'), 'utf8'), antes);
  });
});

test('MCP guion: exportar el guion en Markdown y en el HTML del editor', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    const {result: {tools}} = await c.pide('tools/list');
    assert.ok(tools.find(t => t.name === 'exportar_presentacion').inputSchema.properties.formato.enum.includes('guion'));
    await c.llama('crear_presentacion', {archivo: 'g', titulo: 'Zn-Al', diapositivas: charla});
    await c.llama('editar_diapositiva', {archivo: 'g', diapositiva: 1, minutos: 0.5});

    const md = await c.llama('exportar_presentacion', {archivo: 'g', formato: 'guion'});
    assert.equal(md.error, false, md.texto);
    assert.equal(md.datos.archivo, 'g-guion.md');
    assert.equal(md.datos.total_min, 8.5);
    assert.equal(md.datos.sin_minutos, 1, 'la sección no tiene minutos');
    assert.deepEqual(md.datos.diapositivas.map(f => [f.inicio, f.fin]),
      [['0:00', '0:30'], ['0:30', '0:30'], ['0:30', '2:30'], ['2:30', '3:30'], ['3:30', '6:30'], ['6:30', '8:30']]);
    const texto = readFileSync(join(dir, 'g-guion.md'), 'utf8');
    assert.match(texto, /^# Guion · Zn-Al/);
    assert.match(texto, /## 3\. Síntesis por coprecipitación · 0:30 → 2:30 \(2:00 min\)/);
    assert.match(texto, /En pantalla: Reacción: \$\\ce\{Zn\^2\+ \+ 2 OH- -> Zn\(OH\)2 v\}\$/);
    assert.match(texto, /En pantalla: Ecuación: \$D = K\\lambda/);
    assert.match(texto, /Gráfica de datos: «XRD ilustrativo»/);
    assert.match(texto, /Contar el pH y la temperatura\.\n\n- pH 10\n- 65 °C/);
    assert.match(texto, /## 2\. Método · 0:30 \(sin minutos previstos\)/);

    /* Con respaldo: sale aparte y no suma al reloj. */
    await c.llama('ajustar_tiempos', {archivo: 'g', minutos_objetivo: 5, al_respaldo: true, aplicar: true});
    await c.llama('exportar_presentacion', {archivo: 'g', formato: 'guion', destino: 'guiones/g2.md'});
    const t2 = readFileSync(join(dir, 'guiones/g2.md'), 'utf8');
    assert.match(t2, /# Respaldo para preguntas/);
    assert.match(t2, /## R1\. /);
    assert.match(t2, /→ 5:00 /);

    const h = await c.llama('exportar_presentacion', {archivo: 'g', formato: 'guion', destino: 'g.html'});
    assert.equal(h.error, false, h.texto);
    assert.equal(h.datos.formato, 'html');
    const html = readFileSync(join(dir, 'g.html'), 'utf8');
    assert.match(html, /Guion del orador/);
    assert.equal(html.match(/class="gu-fila"/g).length, proyecto(dir, 'g').slides.length);
    assert.match(html, /acumulado 5:00/);
    assert.match(html, /class="gu-num">R1</, 'el respaldo lleva su rótulo');
    assert.doesNotMatch(html, /acumulado ([6-9]|\d\d):/, 'el respaldo no suma al reloj');

    const mal = await c.llama('exportar_presentacion', {archivo: 'g', formato: 'guion', destino: 'g.pdf'});
    assert.equal(mal.error, true);
    assert.ok(!existsSync(join(dir, 'g.pdf')));
    assert.equal((await c.llama('exportar_presentacion', {archivo: 'g', formato: 'guion', destino: '../fuera.md'})).error, true);
  });
});

test('MCP guion: ensayo_resumen compara el último ensayo con lo previsto', {timeout: 120000}, async () => {
  await conServidor(async (c, dir) => {
    await c.llama('crear_presentacion', {archivo: 'e', titulo: 'E', diapositivas: charla});
    const sin = await c.llama('ensayo_resumen', {archivo: 'e'});
    assert.equal(sin.datos.hay_ensayo, false);
    assert.match(sin.datos.nota, /Ensayar con cronómetro/);

    /* Lo que guarda reporteEnsayo: segundos por id de diapositiva. */
    const d = proyecto(dir, 'e');
    const [, , s2, s3, s4] = d.slides;
    d.meta.ensayo = {cuando: '2026-09-20', tiempos: {[s2.id]: 150, [s3.id]: 55, [s4.id]: 200}};
    writeFileSync(join(dir, 'e.json'), JSON.stringify(d));
    const r = await c.llama('ensayo_resumen', {archivo: 'e'});
    assert.equal(r.error, false, r.texto);
    assert.equal(r.datos.cuando, '2026-09-20');
    assert.deepEqual(r.datos.largas.map(x => [x.n, x.diferencia]), [[3, '+0:30'], [5, '+0:20']], 'de la que más se pasa a la que menos');
    assert.equal(r.datos.diapositivas.find(x => x.n === 4).estado, 'bien');
    assert.deepEqual(r.datos.no_vistas, [1, 2, 6]);
    assert.deepEqual(r.datos.total, {previsto: '8:00', ensayo: '6:45', diferencia: '−1:15'});
  });
});
