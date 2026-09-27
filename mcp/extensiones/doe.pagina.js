/* SPDX-License-Identifier: AGPL-3.0-only */
/* Página de la extensión «doe»: un informe de Erlen DoE (informe-v1) pasa
   por leeInforme e informeADeck, las mismas funciones que usa el editor al
   recibir la copia (88e-informe.js). Así el asistente obtiene exactamente la
   presentación que vería la persona en «Abrir el informe de DoE», con sus
   recortes dichos en pies y notas y la diapositiva de procedencia al final;
   aquí no se reparte ni se redondea nada por cuenta propia. */
ERLEN_MCP.registra('informeDoe', a => {
  const { falla, valida } = ERLEN_MCP.util;
  /* leeInforme lanza un Error normal con el motivo en español llano: se
     devuelve tal cual, sin el «Error interno» que llevaría si no. */
  let inf;
  try { inf = leeInforme(a.payload); } catch (e) { falla(e && e.message || 'El informe no se pudo leer.'); }
  const res = informeADeck(inf, a.copia);
  const r = valida(res.deck);
  const bloques = inf.secciones.flatMap(s => s.bloques);
  const cuenta = t => bloques.filter(b => b.tipo === t).length;
  return {
    deck: r.deck, avisos: r.avisos, conversion: res.avisos, simulado: res.simulado, nombre: res.nombre,
    informe: {
      titulo: inf.titulo, subtitulo: inf.subtitulo, fecha: inf.fecha,
      secciones: inf.secciones.map(s => ({ titulo: s.titulo, bloques: s.bloques.length })),
      bloques: { total: bloques.length, parrafos: cuenta('parrafo'), listas: cuenta('lista'), tablas: cuenta('tabla'), figuras: cuenta('figura') },
      tablas: bloques.filter(b => b.tipo === 'tabla').map(b => ({ titulo: b.titulo, filas: b.data.length, columnas: b.columns.length })),
      figuras: bloques.filter(b => b.tipo === 'figura').map(b => ({ titulo: b.titulo || b.figura.titulo, series: b.figura.series.length,
        puntos: b.figura.series.reduce((n, s) => n + s.x.length, 0), marcas: b.figura.marcas.length, regiones: b.figura.regiones.length })),
      procedencia: inf.procedencia, fuente: inf.fuente
    },
    limites: Object.assign({}, INFORME_LIMITES)
  };
});
