ERLEN_MCP.registra('pruebaTitulos', a => {
  a.deck.slides.forEach(sl => { if (sl.layout !== 'title') sl.title = a.titulo; });
  const r = ERLEN_MCP.util.valida(a.deck);
  r.resultado = { cambiadas: a.deck.slides.length - 1 };
  return r;
});
ERLEN_MCP.registraRevision('prueba-sin-signo', deck => deck.slides
  .map((sl, i) => ({ sl, i })).filter(x => /!/.test(x.sl.title || ''))
  .map(x => ({ categoria: 'estilo', diapositiva: x.i + 1, problema: 'Título con exclamación', arreglo: 'Quítala.' })));
