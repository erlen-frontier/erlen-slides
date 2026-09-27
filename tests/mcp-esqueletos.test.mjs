/* SPDX-License-Identifier: AGPL-3.0-only */
/* Extensión «esqueletos» (mcp/extensiones/esqueletos.*): cada tipo de charla
   crea un proyecto válido, los minutos suman la duración pedida, nada lleva
   datos inventados y la regla esqueleto-pendiente señala los huecos hasta que
   se llenan. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {conServidor, proyecto, bloques} from './_mcp-cliente.mjs';
import {reparte, planDe, ESQUELETOS} from '../mcp/extensiones/esqueletos.mjs';

const TIPOS = ['reunion-grupo', 'congreso-10', 'congreso-15', 'defensa-tesis', 'journal-club', 'seminario', 'divulgacion', 'poster-flash'];
const suma = xs => Math.round(xs.reduce((a, b) => a + b, 0) * 100) / 100;

test('esqueletos: el reparto de minutos', () => {
  assert.deepEqual(reparte([1, 1, 2], [0.5, 0.5, 0.5], 4, 0.5), [1, 1, 2]);
  /* Ninguna baja de su mínimo y la suma es exacta. */
  const r = reparte([0.1, 5, 5], [1, 0.5, 0.5], 6, 0.5);
  assert.equal(r[0], 1);
  assert.equal(suma(r), 6);
  assert.deepEqual(TIPOS.filter(t => !ESQUELETOS.some(e => e.id === t)), []);
  for (const t of TIPOS) for (const min of [undefined, 7, 12, 25, 50]) {
    let p;
    try { p = planDe(t, {minutos: min}); } catch (e) { assert.match(e.message, /necesita al menos/); continue; }
    const charla = p.lista.filter(d => !d.respaldo);
    assert.equal(suma(charla.map(d => d.min)), Math.round(p.minutos / p.paso) * p.paso, t + ' ' + min);
    assert.ok(charla.every(d => d.min >= p.paso), t);
  }
  assert.throws(() => planDe('defensa-tesis', {minutos: 5}), /necesita al menos/);
  assert.throws(() => planDe('congreso-10', {partes: 9}), /partes/);
  assert.throws(() => planDe('charla-magica', {}), /Esqueleto desconocido/);
  /* Si no cabe, se van primero las opcionales. */
  assert.ok(planDe('defensa-tesis', {minutos: 17}).omitidas.length > 0);
});

test('MCP: extensión esqueletos', {timeout: 600000}, async () => {
  await conServidor(async (c, dir) => {
    const {result: {prompts}} = await c.pide('prompts/list');
    assert.ok(prompts.some(p => p.name === 'rellenar_esqueleto'));
    assert.match((await c.pide('prompts/get', {name: 'rellenar_esqueleto', arguments: {archivo: 'tesis'}})).result.messages[0].content.text, /No inventes datos/);

    const l = await c.llama('listar_esqueletos', {});
    assert.equal(l.error, false, l.texto);
    assert.deepEqual(l.datos.esqueletos.map(e => e.id), TIPOS);
    const det = await c.llama('listar_esqueletos', {tipo: 'journal-club'});
    assert.ok(det.datos.diapositivas.some(d => d.rol === 'critica' && d.diseno === 'comparacion'));

    /* Cada tipo con su duración por omisión y tres con otra; el reparto a
       cualquier duración ya lo cubre la prueba de arriba sin servidor. */
    for (const [tipo, minutos] of [...TIPOS.map(t => [t]), ['defensa-tesis', 25], ['poster-flash', 2], ['reunion-grupo', 7]]) {
      const archivo = tipo + '-' + (minutos || 'n');
      const r = await c.llama('crear_desde_esqueleto', {archivo, tipo, minutos, tema: 'metropolis'});
      assert.equal(r.error, false, archivo + ': ' + r.texto);
      assert.equal(r.datos.minutos_asignados, r.datos.minutos_objetivo, archivo);

      const deck = proyecto(dir, archivo);
      assert.equal(deck.v, 1);
      assert.equal(deck.slides.length, r.datos.diapositivas.length);
      assert.equal(deck.slides[0].layout, 'title');
      const charla = deck.slides.filter(s => !s.respaldo);
      assert.equal(suma(charla.map(s => s.min)), r.datos.minutos_objetivo, archivo + ': los minutos suman la duración');
      assert.ok(charla.every(s => s.min > 0), archivo + ': todas con minutos');
      /* El respaldo queda junto al final, como lo arma el editor. */
      const primeraResp = deck.slides.findIndex(s => s.respaldo);
      if (primeraResp >= 0) assert.ok(deck.slides.slice(primeraResp).every(s => s.respaldo), archivo);
      assert.ok(deck.slides.every(s => /^Guía del esqueleto: /.test(s.notes || '')), archivo + ': notas de guía');
      assert.ok(deck.slides.some(s => s.clave), archivo + ': alguna imprescindible');

      /* Nada inventado: ni cifras en títulos, encabezados o bloques, ni
         bloques que traigan datos de muestra (gráficas, tablas, citas). */
      for (const [i, s] of deck.slides.entries()) {
        const textos = [s.title, ...(s.zt || [])];
        for (const b of bloques(s)) {
          assert.ok(['text', 'bullets', 'image'].includes(b.type), archivo + ' ' + (i + 1) + ': bloque ' + b.type);
          if (b.type === 'image') assert.ok(!b.src, 'figura vacía');
          textos.push(b.text, b.caption, ...(b.items || []).map(it => it.t));
        }
        for (const t of textos.filter(Boolean)) assert.doesNotMatch(t, /\d/, archivo + ' ' + (i + 1) + ': «' + t + '»');
      }
      assert.doesNotMatch(JSON.stringify(deck.meta), /"(title|authors|institute|subtitle)":"[^"]*\d/);

      const rev = (await c.llama('revisar_presentacion', {archivo, minutos_objetivo: r.datos.minutos_objetivo})).datos;
      assert.equal(rev.tiempo.valoracion, 'Dentro del objetivo.');
      const marcadas = rev.adicional.filter(h => h.regla === 'esqueleto-pendiente').map(h => h.diapositiva);
      assert.deepEqual(marcadas, deck.slides.map((_, i) => i + 1), archivo + ': todas tienen huecos');
    }

    /* Metadatos del usuario: se respetan; los que faltan son huecos. */
    const n = await c.llama('crear_desde_esqueleto', {archivo: 'ldh', tipo: 'congreso-10', titulo: 'Hidróxidos dobles laminares Zn–Al para adsorber colorantes', autores: 'Ana Pérez', fecha: 'Octubre'});
    assert.equal(n.error, false, n.texto);
    let deck = proyecto(dir, 'ldh');
    assert.equal(deck.meta.title, 'Hidróxidos dobles laminares Zn–Al para adsorber colorantes');
    assert.equal(deck.meta.nivel, 'congreso');
    assert.equal(deck.meta.institute, '[Institución]');
    let rev = (await c.llama('revisar_presentacion', {archivo: 'ldh'})).datos.adicional;
    assert.match(rev[0].problema, /institución/);
    assert.doesNotMatch(rev[0].problema, /título de la charla|autores/);

    /* Llenar una diapositiva la quita de la lista; los corchetes de la
       química, las citas y las matemáticas no cuentan como huecos. */
    const i = deck.slides.findIndex(s => /Método/.test(s.title)) + 1;
    const e = await c.llama('editar_diapositiva', {archivo: 'ldh', diapositiva: i,
      titulo: 'Coprecipitación a pH constante y caracterización por DRX [@Cavani1991]',
      encabezados: ['Síntesis', 'DRX', 'Adsorción'],
      notas: 'Contar que el pH se fijó con NaOH y que el complejo [Co(NH3)6]Cl3 se usó como referencia.',
      zonas: [[{tipo: 'text', text: 'Zn(NO3)2 y Al(NO3)3 con NaOH'}], [{tipo: 'text', text: 'Reflexión basal (003); $[A]_0$ inicial'}], [{tipo: 'text', text: 'Isotermas con el catalizador [Rh(cod)Cl]2 y [Fe(CN)6]'}]]});
    assert.equal(e.error, false, e.texto);
    rev = (await c.llama('revisar_presentacion', {archivo: 'ldh'})).datos.adicional;
    assert.ok(!rev.some(h => h.diapositiva === i), JSON.stringify(rev.find(h => h.diapositiva === i)));
    assert.ok(rev.some(h => h.diapositiva === i + 1), 'las demás siguen pendientes');

    /* Figuras vacías: se cuentan aunque el texto ya esté. */
    const j = deck.slides.findIndex(s => s.layout === 'piefigura') + 1;
    await c.llama('editar_diapositiva', {archivo: 'ldh', diapositiva: j, titulo: 'La fase HDL es la única cristalina', notas: 'Señalar la reflexión basal.',
      zonas: [[{tipo: 'image'}], [{tipo: 'text', text: 'Pie escrito por el usuario'}]]});
    rev = (await c.llama('revisar_presentacion', {archivo: 'ldh'})).datos.adicional;
    assert.match(rev.find(h => h.diapositiva === j).problema, /figura sin imagen/);

    /* No sobrescribe salvo que se pida, y entonces deja la versión en el historial. */
    assert.match((await c.llama('crear_desde_esqueleto', {archivo: 'ldh', tipo: 'divulgacion'})).texto, /ya existe/);
    const s = await c.llama('crear_desde_esqueleto', {archivo: 'ldh', tipo: 'divulgacion', sobrescribir: true});
    assert.equal(s.error, false, s.texto);
    assert.equal(proyecto(dir, 'ldh').meta.nivel, 'divulgacion');
    assert.equal((await c.llama('historial_presentacion', {archivo: 'ldh'})).datos.deshacer[0].antes_de, 'crear_desde_esqueleto');

    /* La sugerencia de un plan que no cabe es una que sí cabe. */
    const corta = await c.llama('crear_desde_esqueleto', {archivo: 'corta', tipo: 'defensa-tesis', minutos: 12});
    assert.equal(corta.error, true);
    assert.match(corta.texto, /partes: 1\)/);
    const muy = await c.llama('crear_desde_esqueleto', {archivo: 'corta', tipo: 'defensa-tesis', minutos: 3});
    assert.match(muy.texto, /usa un esqueleto que quepa \(poster-flash\)/);
  });
});
