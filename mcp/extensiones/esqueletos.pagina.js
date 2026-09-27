/* SPDX-License-Identifier: AGPL-3.0-only */
/* Página de la extensión «esqueletos»: se evalúa tras operaciones.js.
   Aquí va lo que necesita el formato real del proyecto: marcar portada,
   respaldo e imprescindibles, y la regla que señala los huecos pendientes. */

/* Lo que la lista de diapositivas no puede decir: la portada ya la crea
   blankDeck, y respaldo y «clave» son marcas de la diapositiva que
   diapositivaNueva no conoce. Se usan las mismas que el editor (58-respaldo,
   59-ajustar-tiempo) para que ajustar el tiempo y el apéndice funcionen igual. */
ERLEN_MCP.registra('esqueletoAcaba', a => {
  const d = ERLEN_MCP.util.valida(a.deck).deck;
  const p = a.portada || {};
  if (p.notas) d.slides[0].notes = String(p.notas);
  if (p.minutos > 0) d.slides[0].min = +p.minutos;
  (a.clave || []).forEach(i => { if (d.slides[i]) d.slides[i].clave = true; });
  /* El respaldo va al final, en su orden, como lo deja alternaRespaldo. */
  const resp = new Set((a.respaldo || []).map(i => d.slides[i]).filter(Boolean));
  resp.forEach(sl => { sl.respaldo = true; });
  d.slides = d.slides.filter(sl => !resp.has(sl)).concat([...resp]);
  if (NK[a.nivel]) d.meta.nivel = a.nivel;
  if (a.sinCorto) d.meta.short = '';
  return ERLEN_MCP.util.valida(d);
});

/* ---------- regla de revisión ----------
   Un hueco es un texto entre corchetes que empieza por mayúscula, tiene
   palabras de verdad y ni cifras ni paréntesis: «[Una frase con el resultado]».
   Así no se confunde con lo que lleva corchetes en química o en matemáticas
   —[Co(NH3)6]Cl3, [Rh(cod)Cl]2, [A]0, una cita [@clave]— y se reconoce también un hueco que
   alguien escribió a mano siguiendo la misma convención. */
(function () {
  const GUIA = 'Guía del esqueleto:';
  const esHueco = s => /^[¿¡A-ZÁÉÍÓÚÑ]/.test(s) && !/[\d()]/.test(s) && (s.match(/[a-záéíóúñü]/g) || []).length >= 4;
  const huecos = t => {
    const s = String(t == null ? '' : t).replace(/\$[^$]*\$/g, ' ');
    return (s.match(/\[[^\[\]]+\]/g) || []).map(x => x.slice(1, -1).trim()).filter(esHueco);
  };
  /* Los textos que ve el público; no el TeX de math/chem ni el código. */
  function textosBloque(b) {
    if (!b || b.type === 'code' || b.type === 'math' || b.type === 'chem') return [];
    const out = [b.text, b.body, b.btitle, b.titulo, b.caption, b.by, b.title, b.xlabel, b.ylabel];
    (b.items || []).forEach(it => { if (it) out.push(it.t, it.d); });
    (b.rows || []).forEach(f => Array.isArray(f) && out.push(...f));
    return out.filter(x => typeof x === 'string' && x);
  }
  const corto = s => s.length > 60 ? s.slice(0, 59) + '…' : s;

  ERLEN_MCP.registraRevision('esqueleto-pendiente', deck => {
    const out = [];
    deck.slides.forEach((sl, i) => {
      const faltan = [];
      let primero = null;
      const anota = (donde, lista) => { if (lista.length) { faltan.push(donde + (lista.length > 1 ? ' (' + lista.length + ')' : '')); primero = primero || lista[0]; } };
      if (i === 0) {
        const m = deck.meta || {};
        anota('título de la charla', huecos(m.title));
        anota('subtítulo', huecos(m.subtitle));
        anota('autores', huecos(m.authors));
        anota('institución', huecos(m.institute));
      }
      if (sl.layout !== 'title') anota('título', huecos(sl.title));
      anota('encabezados', (sl.zt || []).flatMap(huecos));
      const bs = zonas(sl).flat();
      anota('bloques', bs.flatMap(b => textosBloque(b).flatMap(huecos)));
      const vacias = bs.filter(b => b && b.type === 'image' && !b.src).length;
      if (vacias) faltan.push(vacias > 1 ? vacias + ' figuras sin imagen' : 'figura sin imagen');
      if (String(sl.notes || '').trimStart().startsWith(GUIA)) faltan.push('notas de guía');
      if (!faltan.length) return;
      out.push({
        categoria: 'esqueleto', diapositiva: i + 1,
        problema: 'Huecos del esqueleto sin llenar: ' + faltan.join(', ') + (primero ? ' — p. ej. «[' + corto(primero) + ']»' : '') + '.',
        arreglo: 'Sustituye cada texto entre corchetes por el contenido real (editar_diapositiva, editar_bloque, editar_metadatos), pon la figura con editar_bloque y reescribe las notas con lo que vas a decir. Si la diapositiva no aplica, elimínala: no inventes su contenido.'
      });
    });
    return out;
  });
})();
