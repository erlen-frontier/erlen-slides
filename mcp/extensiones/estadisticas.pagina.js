/* SPDX-License-Identifier: AGPL-3.0-only */
/* Página de la extensión «estadisticas»: se evalúa tras operaciones.js. */
ERLEN_MCP.registra('estadisticas', a => {
  const deck = ERLEN_MCP.util.valida(a.deck).deck;
  const palabras = t => String(t || '').replace(/\$[^$]*\$/g, ' x ').split(/\s+/).filter(Boolean).length;
  const filas = deck.slides.map((sl, i) => {
    const bs = zonas(sl).flat();
    return {
      n: i + 1, diseno: sl.layout, titulo: sl.title || '',
      palabras: palabras(sl.title) + bs.reduce((s, b) => s + palabras(b.text) + palabras(b.body) + palabras(b.caption) + (b.items || []).reduce((x, it) => x + palabras(it.t), 0), 0),
      bloques: bs.length,
      figuras: bs.filter(b => TIPOS_FIGURA.includes(b.type)).length,
      tablas: bs.filter(b => b.type === 'table').length,
      ecuaciones: bs.filter(b => b.type === 'math' || b.type === 'chem').length,
      minutos: +sl.min || 0,
      notas: !!String(sl.notes || '').trim()
    };
  });
  const suma = k => filas.reduce((s, f) => s + f[k], 0);
  return {
    total: { diapositivas: filas.length, palabras: suma('palabras'), figuras: suma('figuras'), tablas: suma('tablas'), ecuaciones: suma('ecuaciones'),
      minutos: Math.round(suma('minutos') * 100) / 100, con_notas: filas.filter(f => f.notas).length },
    diapositivas: filas
  };
});
