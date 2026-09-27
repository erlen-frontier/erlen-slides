# Extensión: guion y tiempos

Tres cosas para preparar la charla en voz alta: cuadrar los minutos con la duración que te dan, sacar el guion del orador y ver cómo fue el último ensayo. Los cálculos los hace la propia app (`planTiempo`, `intocable`, `minutosDe`, `guionHTML`, `partesNota`), así que el asistente propone lo mismo que harían «Ajustar la charla a un tiempo» y «Guion del orador» en el editor.

Archivos: `mcp/extensiones/guion.mjs` (herramientas y formato) y `mcp/extensiones/guion.pagina.js` (operaciones dentro de la app). Pruebas: `tests/mcp-guion.test.mjs`.

## `ajustar_tiempos`

`{archivo, minutos_objetivo, aplicar?, al_respaldo?, imprescindibles?}`

Reparte los minutos previstos para que la charla sume `minutos_objetivo`:

- Portada, índice, separadores de sección y las diapositivas marcadas con ★ («intocables», como en el editor) conservan sus minutos. Si no tenían, se les da 0:15, lo que tarda en pasarse una sección.
- El resto se escala en proporción a los minutos que ya tenía (1 min si no tenía, la regla del minuto por diapositiva) y se redondea a cuartos de minuto, el mismo paso que la línea de tiempo del editor. El reparto suma exactamente el objetivo cuando este y los minutos de las intocables son múltiplos de 0:15.
- `al_respaldo: true` manda antes al respaldo las diapositivas de menor peso según `planTiempo` (contenido, notas y posición en la sección). No se borra nada: pasan al final como R1, R2… Sin esta opción, la respuesta incluye `sugerencia_respaldo` con lo que el editor quitaría.
- `imprescindibles` (números o id) las marca con la ★ del editor: ni van al respaldo ni cambian sus minutos.
- Sin `aplicar` solo devuelve el plan. Con `aplicar: true` lo escribe y queda en el historial (`deshacer` lo revierte). Si el objetivo no cabe ni con 0:15 por diapositiva, responde `imposible` y no escribe nada.

La respuesta trae, por diapositiva, `antes` y `despues`, `intocable` con el motivo, y `pasa_al_respaldo` con la posición que tenía (`era_la`). `heuristica` explica la regla en una línea y `apretado` avisa de las diapositivas que se quedan con menos de 30 s.

## Formato de exportación `guion`

`exportar_presentacion {archivo, formato: "guion", destino?}`

- Por omisión, `<proyecto>-guion.md`: una sección por diapositiva con número, título, minutos, reloj acumulado (`inicio → fin`, en mm:ss), lo que hay en pantalla (figuras por su pie, tablas por su tamaño, ecuaciones y reacciones en TeX) y las notas, con sus viñetas. Las de respaldo van al final, sin reloj.
- Con un `destino` que acaba en `.html`, la hoja imprimible del editor («Guion del orador»): miniatura, notas, minutos y acumulado. Es el mismo HTML que descarga la app; las de respaldo llevan su R1, R2… y no suman al acumulado (antes el editor las contaba).

## `ensayo_resumen`

`{archivo}`

Lee `meta.ensayo`, que el editor guarda al terminar un ensayo cronometrado (Presentar → Ensayar con cronómetro): la fecha y los segundos por id de diapositiva. Compara con los minutos previstos y devuelve el total previsto y medido, las diapositivas `largas` ordenadas de la que más se pasa a la que menos, y las que no se vieron. Usa el mismo margen que la tabla del ensayo del editor: más de 15 s de diferencia.
