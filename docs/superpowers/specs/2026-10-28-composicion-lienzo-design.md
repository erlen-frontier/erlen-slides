# Composición directa en el lienzo

Tabula debe permitir seleccionar visualmente bloques de una diapositiva libre, transformar una selección de forma proporcional y ordenar sus posiciones sin alterar sus contenidos. Esta mejora continúa el PR #60; no modifica la IA.

- Un arrastre desde un área vacía dibuja un recuadro y selecciona los bloques visibles que intersecta. Mayús añade a la selección; Escape cancela. Los clics y la edición de texto conservan su comportamiento.
- Una selección múltiple muestra un marco con manijas para cambiar proporcionalmente el tamaño de todo el conjunto. Los límites de la diapositiva y el mínimo de cada bloque se respetan; un bloqueo o cambio concurrente invalida el gesto completo. El teclado ofrece una alternativa.
- Un menú accesible alinea bordes o centros y distribuye los espacios entre tres o más bloques respecto al conjunto, conservando tamaños. Cada operación se deshace de una vez.
- El lienzo ofrece inserción directa de rectángulos, elipses, líneas y flechas. Se reutiliza el modelo de figura editable y la imagen SVG autónoma existentes, con un indicador opcional compatible con JSON v1; el menú también funciona con teclado.
- Las formas decorativas sin pie no alteran la numeración de figuras científicas. Posiciones, orden, fuentes científicas, presentaciones previas y datos desconocidos se conservan; no hay cambios en el contrato de intercambio de la suite.
- Se verifican gestos reales en Chromium y, si es posible, Tauri/Linux; además, cancelación, bloqueos, selección obsoleta, límites, guardar y deshacer, importación y exportación.
