/* SPDX-License-Identifier: AGPL-3.0-only */
/* Página de la extensión «disenador»: las ideas de diseño del editor
   (src/js/55-disenador.js) para una diapositiva. Se calculan con la misma
   función que usa el panel, así que el modelo ve las mismas propuestas que
   vería quien abre «Ideas de diseño». Sin análisis de imagen: JSDOM no carga
   imágenes ni tiene lienzo, y las propuestas que dependen de él no salen. */
(function () {
  'use strict';
  const U = ERLEN_MCP.util;

  /* Lo que queda en cada zona, en corto: tipo e id, y la clase si es un
     diagrama, para que el modelo sepa qué cambiará sin leer el proyecto. */
  const zonasEn = sl => CLAVES_ZONA.slice(0, Math.max(1, zonasDe(sl.layout)))
    .map(k => (sl[k] || []).map(b => b.type === 'smart' ? { id: b.id, tipo: 'smart', clase: b.kind, elementos: (b.items || []).length } : { id: b.id, tipo: b.type }));
  function resumen(p, i, total) {
    const s2 = p.copia.slides[i];
    const r = { id: p.id, nombre: p.n, razon: p.d, origen: p.origen, diseno: s2.layout, zonas: zonasEn(s2) };
    if ((s2.zt || []).some(t => String(t || '').trim())) r.encabezados = s2.zt;
    if (p.copia.slides.length > total) r.nueva_diapositiva = { posicion: i + 2, zonas: zonasEn(p.copia.slides[i + 1]) };
    return r;
  }
  function calcula(deck, ref) {
    const i = U.indiceDiapositiva(deck, ref);
    const sl = deck.slides[i];
    if (!zonasDe(sl.layout)) U.falla('La diapositiva ' + (i + 1) + ' es de diseño «' + sl.layout + '» y no tiene zonas que acomodar.');
    return { i, sl, props: propuestasDiapositiva(deck, i) };
  }

  ERLEN_MCP.registra('sugiereDisenos', a => {
    const deck = U.valida(a.deck).deck;
    const { i, sl, props } = calcula(deck, a.diapositiva);
    const out = {
      diapositiva: i + 1, id: sl.id, diseno_actual: sl.layout,
      lectura: leeDiapositiva(leeContenido(sl)).replace(/ Toca una propuesta.*$/, ''),
      propuestas: props.map(p => resumen(p, i, deck.slides.length))
    };
    if (!props.length) out.nota = 'No hay nada mejor que proponer para lo que tiene esta diapositiva.';
    /* Para el mosaico: la diapositiva tal cual y cada propuesta detrás, con
       ids propios para que dos copias no compartan identificador. */
    if (a.mosaico && props.length) {
      const m = deepCopy(deck);
      const copia = (s, k) => {
        const c = deepCopy(s);
        c.id = s.id + '-m' + k;
        CLAVES_ZONA.forEach(z => (c[z] || []).forEach(b => { b.id = b.id + '-m' + k; }));
        return c;
      };
      m.slides = [copia(sl, 0)].concat(props.map((p, k) => copia(p.copia.slides[i], k + 1)));
      out.mosaico = { deck: m, etiquetas: ['Actual'].concat(props.map((p, k) => (k + 1) + ' · ' + p.id)) };
    }
    return out;
  });

  ERLEN_MCP.registra('aplicaDiseno', a => {
    const deck = U.valida(a.deck).deck;
    const total = deck.slides.length;
    const { i, props } = calcula(deck, a.diapositiva);
    const p = props.find(x => x.id === a.propuesta);
    if (!p) U.falla('No hay una propuesta «' + a.propuesta + '» para la diapositiva ' + (i + 1) + '. ' +
      (props.length ? 'Las de ahora son: ' + props.map(x => x.id).join(', ') + '. Vuelve a llamar a sugerir_disenos si la diapositiva cambió.' : 'Ahora no hay ninguna.'));
    p.aplica(deck, i);
    const r = U.valida(deck);
    r.resultado = resumen({ id: p.id, n: p.n, d: p.d, origen: p.origen, copia: r.deck }, i, total);
    r.resultado.diapositiva = i + 1;
    return r;
  });
})();
