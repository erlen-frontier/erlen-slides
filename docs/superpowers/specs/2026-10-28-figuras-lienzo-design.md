# Catálogo científico de Figures en el lienzo de Tabula

## Objetivo

Poner las 1000 piezas del catálogo de Erlen Figures 0.21.0 a disposición de cada diapositiva de Tabula, para buscarlas e insertarlas como objetos independientes del lienzo libre. La presentación continúa siendo local, funciona sin conexión y conserva JSON v1.

## Decisiones y límites

- Trabajar directamente sobre la diapositiva, como pidió el usuario. Se reutilizan selección, arrastre, tamaño, capas, agrupación, alineación, distribución y deshacer del lienzo existente. La importación de composiciones JSON completas de Figures y sus herramientas especializadas no se presupone en este cambio.
- Portar únicamente el catálogo, su dibujador y sus activos, no el editor ni el marco de la suite. Cargar los SVG en lotes bajo demanda; no descargar recursos ni datos privados durante el uso.
- Cada pieza insertada conserva un SVG vectorial autónomo, descripción, identificador y procedencia (autor, fuente, licencia, enlace, modificaciones y huellas cuando existan). Los créditos deben poder consultarse y descargarse; la revisión al compartir advierte cuándo es necesaria la atribución. El SVG conserva metadatos y una descripción legible de los créditos.
- La copia anotada y el recorte conservan la atribución y declaran la modificación. El kit incluye un archivo de créditos; el usuario debe incorporarlos al compartir otros formatos. Markdown avisa de que no restaura la procedencia editable, y el PowerPoint clásico utiliza imágenes rasterizadas.
- Las piezas son editables como objetos de la diapositiva. Sus trazados internos no se prometen como editables individualmente; las imágenes anteriores y los datos científicos no se modifican.
- El código mantiene las licencias y avisos de terceros del catálogo. La carga y la inserción fallan de forma visible sin dejar piezas incompletas. Si la presentación o diapositiva cambia mientras se carga un activo, no se inserta en la nueva.

## Alternativas

Un editor de Figures incrustado preservaría más herramientas propias pero obligaría a trabajar fuera de la diapositiva y duplicaría el editor; el usuario eligió el lienzo directo. SVG aplanados sin metadatos no preservan créditos ni la manipulación de cada pieza. Se opta por un catálogo local y objetos de diapositiva con representación SVG autónoma y procedencia.

## Verificación

Comprobar integridad, búsqueda, licencias y carga diferida de todo el catálogo; inserción, movimiento, duplicación, capas y deshacer; guardado y reapertura con geometría y créditos; fallo de carga y cambio de documento; exportación y avisos de atribución. Ejecutar build, pruebas completas, MCP y navegador real; inspeccionar la interfaz y probar el ejecutable Linux cuando el entorno lo permita.
