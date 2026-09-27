/* SPDX-License-Identifier: AGPL-3.0-only */
/* Página de la extensión «guion»: el tiempo de la charla y el guion del
   orador, con las funciones de la app (planTiempo, intocable, minutosDe,
   partesNota, guionHTML, rotuloDiapositiva) para que el asistente y el editor
   cuenten los minutos igual. */
(function () {
  'use strict';
  const { valida, falla } = ERLEN_MCP.util;
  /* El mismo paso que la línea de tiempo (78-tiempo.js): cuartos de minuto,
     que es lo que se puede arrastrar a mano. */
  const PASO = 0.25;
  const redondea = x => Math.round(x * 100) / 100;
  const tituloDe = sl => (sl.title || '').trim() || (LAY[sl.layout] || {}).name || 'Sin título';
  const motivoIntocable = sl => sl.clave ? 'marcada como imprescindible (★)'
    : sl.layout === 'title' ? 'portada' : sl.layout === 'toc' ? 'índice' : sl.layout === 'section' ? 'separador de sección' : null;

  /* Reparte «unidades» cuartos de minuto entre las diapositivas en proporción
     a su peso, con al menos un cuarto cada una y sumando exactamente el total:
     primero la parte entera y luego, de uno en uno, a las de mayor resto. */
  function reparte(pesos, unidades) {
    const W = pesos.reduce((a, w) => a + w, 0);
    const ideal = pesos.map(w => w / W * unidades);
    const u = ideal.map(x => Math.max(1, Math.floor(x)));
    let dif = unidades - u.reduce((a, x) => a + x, 0);
    const porResto = ideal.map((x, i) => i).sort((a, b) => (ideal[b] - u[b]) - (ideal[a] - u[a]));
    for (let k = 0; dif > 0; k++) { u[porResto[k % u.length]]++; dif--; }
    /* Solo pasa si el mínimo de un cuarto subió a alguna: se quita a las que
       más tienen por encima de lo ideal. */
    for (let k = 0; dif < 0 && k < 1e5; k++) {
      const cand = u.map((x, i) => i).filter(i => u[i] > 1).sort((a, b) => (u[b] - ideal[b]) - (u[a] - ideal[a]));
      if (!cand.length) break;
      u[cand[0]]--; dif++;
    }
    return u;
  }

  ERLEN_MCP.registra('ajustaTiempos', a => {
    const d = a.deck;
    const objetivo = +a.minutos_objetivo;
    if (!(objetivo > 0)) falla('«minutos_objetivo» debe ser un número de minutos mayor que cero.');
    const antes = new Map(d.slides.map(sl => [sl.id, minutosDe(sl) || null]));
    const posAntes = new Map(d.slides.map((sl, i) => [sl.id, i + 1]));
    /* La misma estrella del editor («★ No la quites»): queda guardada. */
    const marcadas = (a.imprescindibles || []).map(x => ERLEN_MCP.util.indiceDiapositiva(d, x));
    marcadas.forEach(i => { d.slides[i].clave = true; });
    /* Una portada o una sección sin minutos se cuentan como lo que tardan
       en pasarse, un cuarto de minuto, y no como el minuto por omisión de
       planTiempo: con tres secciones, ese minuto se comería un cuarto de una
       charla de 12 y el plan quitaría contenido de más. */
    slidesCharla(d).forEach(sl => { if (intocable(sl) && !minutosDe(sl)) sl.min = PASO; });
    const plan = planTiempo(d, objetivo);
    /* Lo que planTiempo manda al respaldo se mueve como en aplicaPlanTiempo,
       sin su commit(): aquí no hay editor, el historial lo lleva el motor. */
    let quitar = plan.quitar;
    /* planTiempo cuenta los minutos de ahora y no sabe que luego se aprieta
       lo que queda: si se llevaría todo el contenido, se deja la de más peso,
       que con cuartos de minuto aún puede caber. */
    if (quitar.length && quitar.length === slidesCharla(d).filter(sl => !intocable(sl)).length) {
      const mejor = quitar.reduce((m, x) => x.val > m.val ? x : m);
      quitar = quitar.filter(x => x !== mejor);
    }
    const alRespaldo = a.al_respaldo ? quitar.map(x => x.sl.id) : [];
    if (alRespaldo.length) {
      const ids = new Set(alRespaldo);
      const mover = d.slides.filter(sl => ids.has(sl.id));
      d.slides = d.slides.filter(sl => !ids.has(sl.id));
      mover.forEach(sl => { sl.respaldo = true; d.slides.push(sl); });
    }
    const charla = slidesCharla(d);
    const fijas = charla.filter(intocable), libres = charla.filter(sl => !intocable(sl));
    const minFijas = fijas.reduce((s, sl) => s + minutosDe(sl), 0);
    const unidades = Math.round((objetivo - minFijas) / PASO);
    let imposible = null;
    if (!libres.length) imposible = 'No hay diapositivas a las que repartir tiempo: todas son portada, índice, secciones o imprescindibles.';
    else if (unidades < libres.length) imposible = 'Portada, índice, secciones e imprescindibles ya suman ' + mmss(minFijas) +
      ' y quedan ' + libres.length + ' diapositivas con al menos 0:15 cada una: no caben en ' + mmss(objetivo) + '.' +
      (a.al_respaldo ? '' : ' Prueba con al_respaldo: true para mandar al respaldo las de menor peso.');
    const nuevo = new Map();
    if (!imposible) {
      fijas.forEach(sl => nuevo.set(sl.id, minutosDe(sl)));
      reparte(libres.map(minEstimado), unidades).forEach((u, i) => nuevo.set(libres[i].id, u * PASO));
      d.slides.forEach(sl => { if (nuevo.has(sl.id)) sl.min = nuevo.get(sl.id); });
    }
    const diapositivas = d.slides.map((sl, i) => {
      const o = { n: i + 1, rotulo: rotuloDiapositiva(d, i), id: sl.id, titulo: tituloDe(sl), antes: antes.get(sl.id) };
      if (esRespaldo(sl)) {
        o.respaldo = true;
        if (alRespaldo.includes(sl.id)) { o.pasa_al_respaldo = true; o.era_la = posAntes.get(sl.id); }
        return o;
      }
      o.despues = nuevo.has(sl.id) ? nuevo.get(sl.id) : o.antes;
      const m = intocable(sl) && motivoIntocable(sl);
      if (m) o.intocable = m;
      if (!o.antes) o.sin_minutos_previos = true;
      return o;
    });
    if (imposible && a.aplicar) falla(imposible);
    const r = valida(d);
    const despues = charla.reduce((s, sl) => s + (nuevo.has(sl.id) ? nuevo.get(sl.id) : minEstimado(sl)), 0);
    const cortas = diapositivas.filter(x => x.despues != null && !x.intocable && x.despues < 0.5);
    r.resultado = {
      antes_min: redondea(d.slides.reduce((s, sl) => s + (esRespaldo(sl) && !alRespaldo.includes(sl.id) ? 0 : antes.get(sl.id) || 0), 0)), objetivo_min: objetivo, despues_min: imposible ? null : redondea(despues),
      reloj: imposible ? null : mmss(despues) + ' de ' + mmss(objetivo),
      heuristica: 'Portada, índice, secciones y las marcadas ★ conservan sus minutos (0:15 si no tenían); el resto se escala en proporción a los que ya tenía (1 min si no tenía) y se redondea a cuartos de minuto' +
        (a.al_respaldo ? ', después de mandar al respaldo las de menor peso según el plan del editor (contenido, notas y posición en la sección).' : '.'),
      ...(imposible ? { imposible } : {}),
      ...(!imposible && cortas.length ? { apretado: cortas.length + (cortas.length === 1 ? ' diapositiva queda' : ' diapositivas quedan') +
        ' con menos de 30 s (' + cortas.map(x => x.n).join(', ') + '): no da tiempo a explicarlas.' +
        (a.al_respaldo ? ' Marca las que importan con imprescindibles y quita otras a mano.' : ' Prueba con al_respaldo: true.') } : {}),
      intocables: diapositivas.filter(x => x.intocable).map(x => ({ n: x.n, titulo: x.titulo, motivo: x.intocable })),
      diapositivas
    };
    /* Sin al_respaldo, lo que el editor quitaría queda como sugerencia. */
    if (!a.al_respaldo && quitar.length) r.resultado.sugerencia_respaldo = {
      nota: 'Para caber sin apretar tanto el resto, «Ajustar la charla a un tiempo» del editor mandaría estas al respaldo (repite con al_respaldo: true).',
      diapositivas: quitar.map(x => ({ n: x.i + 1, titulo: tituloDe(x.sl), min: x.min }))
    };
    return r;
  });

  /* ---------- guion del orador ---------- */
  const NOMBRE = {}; BLOCK_DEFS.forEach(b => { NOMBRE[b.id] = b.name; });
  const una = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  /* Lo que se ve en la diapositiva, en una línea por elemento: figuras por su
     pie y ecuaciones por su TeX, que es lo que uno repasa antes de hablar. */
  function enPantalla(sl) {
    const out = [];
    zonas(sl).flat().forEach(b => {
      if (!b) return;
      const n = NOMBRE[b.type] || b.type, pie = una(b.caption);
      if (b.type === 'math' && una(b.tex)) out.push(n + ': $' + una(b.tex) + '$');
      else if (b.type === 'chem' && una(b.tex)) out.push(n + ': $\\ce{' + una(b.tex) + '}$');
      else if (b.type === 'table') out.push(n + ' ' + (b.rows || []).length + '×' + ((b.rows || [])[0] || []).length + (pie ? ': «' + pie + '»' : ''));
      else if (TIPOS_FIGURA.includes(b.type) || b.type === 'galeria') out.push(n + (pie ? ': «' + pie + '»' : b.type === 'estruct' && b.smiles ? ': ' + b.smiles : ' (sin pie)'));
      else if ((b.type === 'bblock' || b.type === 'teorema') && una(b.btitle || b.titulo)) out.push(n + ': «' + una(b.btitle || b.titulo) + '»');
    });
    return out;
  }
  function notasMd(txt) {
    return partesNota(txt).map(p => p.tipo === 'lista' ? p.items.map(t => '- ' + t).join('\n') : p.texto).join('\n\n');
  }
  ERLEN_MCP.registra('guion', a => {
    const d = valida(a.deck).deck;
    if (a.html) { loadDeck(d, null); return { html: guionHTML() }; }
    const charla = slidesCharla(d), resp = slidesRespaldo(d);
    const total = charla.reduce((s, sl) => s + minutosDe(sl), 0);
    const sinMin = charla.filter(sl => !minutosDe(sl)).length;
    const lineas = ['# Guion · ' + (una(d.meta.title) || 'Presentación'), '',
      'Guion del orador · ' + charla.length + ' diapositivas' + (total ? ' · ' + mmss(total) + ' min previstos' : '') +
      (resp.length ? ' · ' + resp.length + ' de respaldo' : '') +
      (sinMin ? ' · ' + sinMin + ' sin minutos previstos (no avanzan el reloj)' : '') + '.', ''];
    const filas = [];
    let t = 0;
    const bloque = (sl, i, conReloj) => {
      const min = minutosDe(sl), rot = rotuloDiapositiva(d, i);
      let cab = '## ' + rot + '. ' + tituloDe(sl);
      const fila = { n: i + 1, rotulo: rot, titulo: tituloDe(sl), min: min || null };
      if (conReloj) {
        fila.inicio = mmss(t); t += min; fila.fin = mmss(t);
        cab += min ? ' · ' + fila.inicio + ' → ' + fila.fin + ' (' + mmss(min) + ' min)' : ' · ' + fila.inicio + ' (sin minutos previstos)';
      } else if (min) cab += ' (' + mmss(min) + ' min)';
      lineas.push(cab, '');
      const ve = enPantalla(sl);
      if (ve.length) { lineas.push('En pantalla: ' + ve.join(' · '), ''); fila.en_pantalla = ve; }
      const nt = notasMd(sl.notes);
      lineas.push(nt || '_Sin notas._', '');
      filas.push(fila);
    };
    d.slides.forEach((sl, i) => { if (!esRespaldo(sl)) bloque(sl, i, true); });
    if (resp.length) {
      lineas.push('# Respaldo para preguntas', '', 'No suman al tiempo de la charla.', '');
      d.slides.forEach((sl, i) => { if (esRespaldo(sl)) bloque(sl, i, false); });
    }
    return { md: lineas.join('\n').replace(/\n{3,}/g, '\n\n'), total_min: redondea(total), sin_minutos: sinMin, diapositivas: filas };
  });

  /* ---------- el último ensayo frente a lo previsto ---------- */
  /* Mismo umbral que la tabla del ensayo del editor (reporteEnsayo): más de
     15 s de diferencia ya se nota. */
  const HOLGURA_S = 15;
  ERLEN_MCP.registra('resumenEnsayo', a => {
    const d = valida(a.deck).deck, E = d.meta.ensayo;
    if (!E || !E.tiempos || !Object.keys(E.tiempos).length) return { hay_ensayo: false,
      nota: 'Esta presentación no tiene ningún ensayo cronometrado guardado. En el editor: Presentar → Ensayar con cronómetro; al salir con Esc los tiempos quedan en el proyecto.' };
    const filas = [];
    let prevTot = 0, realTot = 0;
    d.slides.forEach((sl, i) => {
      if (esRespaldo(sl)) return;
      const prev = Math.round(minutosDe(sl) * 60), real = +E.tiempos[sl.id] || 0;
      prevTot += prev; realTot += real;
      const f = { n: i + 1, titulo: tituloDe(sl), previsto: prev ? reloj(prev * 1000) : null, ensayo: real ? reloj(real * 1000) : null };
      if (!real) f.estado = 'no se vio';
      else if (!prev) f.estado = 'sin previsto';
      else {
        const dif = real - prev;
        f.diferencia = (dif >= 0 ? '+' : '−') + reloj(Math.abs(dif) * 1000);
        f.estado = dif > HOLGURA_S ? 'larga' : dif < -HOLGURA_S ? 'corta' : 'bien';
        f._exceso = dif;
      }
      filas.push(f);
    });
    const largas = filas.filter(f => f.estado === 'larga').sort((x, y) => y._exceso - x._exceso)
      .map(f => ({ n: f.n, titulo: f.titulo, previsto: f.previsto, ensayo: f.ensayo, diferencia: f.diferencia }));
    filas.forEach(f => delete f._exceso);
    const dif = realTot - prevTot;
    return {
      hay_ensayo: true, cuando: E.cuando || null,
      total: { previsto: prevTot ? reloj(prevTot * 1000) : null, ensayo: reloj(realTot * 1000),
        diferencia: prevTot ? (dif >= 0 ? '+' : '−') + reloj(Math.abs(dif) * 1000) : null },
      largas, criterio: 'Larga si el ensayo pasó más de ' + HOLGURA_S + ' s de lo previsto; corta si quedó más de ' + HOLGURA_S + ' s por debajo.',
      no_vistas: filas.filter(f => f.estado === 'no se vio').map(f => f.n),
      diapositivas: filas
    };
  });
})();
