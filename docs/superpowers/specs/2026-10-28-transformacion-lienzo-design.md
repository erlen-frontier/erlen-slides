# Transformación precisa en el lienzo de Tabula

## Objetivo

Permitir que quienes componen diapositivas ajusten la posición y el tamaño con precisión, mantengan proporciones y giren o volteen figuras sin alterar sus archivos ni sus fuentes científicas. Los proyectos siguen siendo compatibles con JSON v1 y la aplicación funciona localmente en Linux.

## Decisiones

- Reutilizar los campos de posición del panel y hacerlos accesibles desde la barra del bloque. Añadir un bloqueo opcional de proporciones para cada objeto; se respeta al cambiar dimensiones con controles numéricos, teclado o asas, se guarda en el proyecto y se deshace.
- Agregar giro en grados y volteo horizontal y vertical a imágenes y figuras del catálogo, incluidos los objetos de forma libre. Transformar la imagen y sus anotaciones juntas, sin girar el pie de figura ni los controles de selección. Conservar el SVG o la imagen original y su procedencia.
- Guardar la transformación como datos opcionales del bloque. Los proyectos anteriores mantienen sus valores y su aspecto. Las acciones se validan, no afectan bloques bloqueados ni una selección o documento que haya cambiado, y cada cambio tiene un paso de deshacer.
- Aplicar la misma orientación en edición, miniaturas, presentación, PDF imprimible y HTML. Exportar el giro y volteo a PowerPoint y Beamer; conservar sus advertencias existentes sobre el acomodo del lienzo libre. Si una figura compleja requiere rasterizar, no modificar su fuente en el JSON.
- Las posiciones describen la caja sin girar. La imagen girada puede extenderse más allá de esa caja o de la diapositiva; la revisión debe señalar recortes visibles en vez de cambiar silenciosamente el tamaño o la posición.

## Alternativas

Girar todo el bloque haría que los pies y controles quedaran inclinados y dificultaría seleccionarlo. Aplanar todas las figuras al guardar perdería su SVG y su procedencia. Se transforma solo la zona visual de la figura, conservando la caja y los datos originales.

## Verificación

Probar con figuras asimétricas, imágenes normales y anotadas, bloqueos, cambios de selección, límites de tamaño, deshacer y reapertura JSON. Usar Chromium con interacción real, contrastar las salidas PowerPoint con LibreOffice, comprobar HTML y Beamer y ejecutar la batería completa y MCP. La aplicación de escritorio debe compilar para Linux.
