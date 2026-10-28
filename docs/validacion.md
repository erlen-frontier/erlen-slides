# Validación de 0.2.1

Comprobaciones del 9 de septiembre de 2026, sobre esta distribución independiente:

| Comprobación | Resultado y alcance |
|---|---|
| Dependencias | Instalación aislada desde npm; lockfile portable, sin enlaces a rutas del equipo original |
| Build | 90 módulos; aplicación sin configuración de producción ni fuentes externas automáticas |
| Tests | 80 casos, incluidos los controles de auditoría científica, plantilla afirmación-evidencia, procedencia, exportación SVG, informe por formato y accesibilidad del build |
| Ejemplos | 12 proyectos, 72 diapositivas; validación JSON, render DOM de cada diapositiva, ausencia de errores KaTeX y generación Beamer |
| Guardado | Conservar una presentación con nombre al abrir otro ejemplo; navegación y enlace directo de ejemplo |
| PowerPoint | Generado un archivo con texto, tabla y notas; integridad ZIP, XML parseable y contenido conservado. Una prueba automática arma el paquete con una rama activa y comprueba CRC, partes declaradas y referencias. Los paquetes de cuatro ejemplos se abrieron además con un lector OOXML independiente (python-pptx 1.0.2) y se convirtieron a PDF con LibreOffice Impress 24.2: 6 páginas cada uno, ninguna en blanco, con el SmartArt, las estructuras, los montajes, la geometría y las gráficas presentes. **No se ha abierto en Microsoft PowerPoint** |
| RDKit real | RDKit 2025.03.4 analizó etanol, SMILES CCO; masa monoisotópica calculada 46.04186 |
| Inspección visual | Capturas Firefox: inicio, editor, química, presentación y móvil de 390 × 844. La composición vertical se comprobó además en Chromium a 390 × 844, 360 × 640, 768 × 1024 y en apaisado, y el lienzo de estructuras con la aplicación en claro y en oscuro. Las barras de error, el eje logarítmico y el rótulo del eje Y con unidades se revisaron en Chromium |
| Privacidad del build | Sin endpoints de producción, SDK de Supabase o fuentes Google automáticas |

Los tests de DOM usan JSDOM y almacenamiento aislado; no prueban medidas de pantalla reales, y JSDOM no implementa `innerText`, así que el guardado del texto tecleado se comprueba en navegador y no en la suite. Las capturas complementan esa limitación. No se ha verificado visualmente el PPTX en Microsoft PowerPoint, ni compilado los ejemplos TEX con una distribución LaTeX. La comprobación real de RDKit no equivale a validar todas sus operaciones ni las herramientas 3D.

`npm test` ejecuta los diez archivos de pruebas. Algunas versiones de Node muestran diez grupos en el resumen; ejecutando cada archivo directamente se muestran sus 80 casos. No se atribuye a esta distribución el resultado histórico de pruebas de la suite completa.

## Calidad científica y trazabilidad — 17 de septiembre de 2026

La auditoría integrada revisa datos de gráficas, ejes, unidades indicadas, dominios logarítmicos, incertidumbres, pies, encabezados de tablas y procedencia declarada. La plantilla afirmación-evidencia crea un diseño `twocol` compatible con JSON v1 y marca sus datos como ilustrativos. Los paquetes de figuras y kits incorporan `provenance.json` con hashes de datos y metadatos de fuente cuando existen. La exportación SVG produce una figura vectorial autónoma; el informe JSON clasifica riesgos para PDF, Beamer, PowerPoint y SVG. Las pestañas del inspector exponen roles y estados WAI-ARIA; los tests de DOM comprueban el contrato, mientras que la validación visual con lectores de pantalla queda pendiente.

## Informes de Erlen DoE — 23 de septiembre de 2026 (0.3.0)

`tests/intercambio.test.mjs` comprueba con JSDOM y fake-indexeddb que el transporte es la copia literal de `web/exchange-v2.mjs`; que un `informe-v1` se valida y se convierte (portada, secciones partidas, tablas largas o anchas repartidas en diapositivas que repiten el encabezado y las columnas que identifican cada fila, con cada celda del informe y su aviso, y recortadas solo si pasarían de doce diapositivas, gráficas nativas con los mismos puntos, procedencia); que `#copy=<id>` se retira de la URL sin entrada en el historial, se previsualiza y solo al confirmar crea una presentación nueva en la biblioteca sin borrar la copia; que cancelar no crea nada y que un segundo envío no sobrescribe el primero; y que una copia de otro tipo, de otro destino, alterada, ausente o con un identificador inválido se rechaza con su motivo sin tocar la biblioteca ni la presentación abierta.

## Herramientas de presentación — 30 de septiembre de 2026

`tests/mejoras-browser.test.mjs` usa Chromium real (151.0.7922.173 en esta sesión) a 1440 × 1000. Comprueba el flujo Markdown con vista previa y figuras incrustadas; fuente y etiquetas SVG de Mermaid, reapertura y rechazo de configuración externa; vistas de temas; selección por grupos, bloqueos, cambios atómicos y deshacer; y una tabla de 70 filas recortada dentro de sus contenedores. Los datos numéricos de prueba son ilustrativos. La fuente científica permanece intacta al exportar.

El PowerPoint de prueba tiene siete diapositivas, tabla nativa, gráfica XY con abscisas `[0, 0.7, 4.2]` y ordenadas `[1, 2, 3]`, formas SmartArt editables, función conservada como imagen con aviso y diagrama Mermaid como SVG con representación PNG compatible. Además del examen OOXML del test, se leyó con `python-pptx` 1.0.2 y se comprobaron tabla, series y formas. LibreOffice no está instalado en este entorno: no se afirma validación visual en Impress o Microsoft PowerPoint.

El HTML generado se carga íntegro en un documento nuevo sin origen del editor: Chromium gestionado bloquea navegar a `file:`, por lo que la prueba usa `setContent` con el archivo generado. No hace peticiones HTTP; sus deslizadores redibujan funciones, las flechas sobre un deslizador no cambian de diapositiva, los pasos se revelan y las notas privadas solo aparecen cuando se pide incluirlas. Se inspeccionaron capturas de temas y HTML. Grabación: se prueban cancelación tardía, fallo del micrófono, descarga y fallo al iniciar con dispositivos simulados; la calidad audiovisual y el cuadro de permisos dependen del navegador y no se han probado con una captura real.

JSDOM no mide, así que el reparto por diapositiva se calibró y se comprobó en Chromium 141 (1400 × 900, tema Metropolis 16:9): cuerpo de 1280 × 601 px de lienzo; nueve bloques de texto de una línea, diez viñetas o una tabla de ocho filas cortas caben, y uno más no. Con esas medidas, dos informes de prueba —uno como el que arma DoE y otro hecho para desbordar— dieron 44 diapositivas de contenido sin nada fuera del cuerpo. El reparto de tablas en varias diapositivas se comprobó igual el 27 de septiembre de 2026 con `vista_previa` del servidor MCP: un informe de prueba con un Taguchi L9 (9 × 9) y un L18 (18 × 9) y otro hecho para forzarlo (300 filas, 20 columnas y 37 × 9 con notas largas) dieron 44 diapositivas sin desbordes, con cada fila y cada columna en alguna de ellas salvo las de la tabla de 300 filas, recortada y avisada. Con otro tema o en 4:3 el reparto no se ha medido. En esa validación, la revisión «El contenido no cabe» todavía no detectaba las tablas recortadas dentro de un bloque encogido. La revisión del 30 de septiembre de 2026 añade la comprobación interna descrita abajo.

## Importación y uso accesible — 30 de septiembre de 2026

`tests/importacion-figuras.test.mjs` verifica límites de ZIP antes de descomprimir, rechazo de paquetes dañados o ZIP64, modelo de figura permitido, texto SVG escapado, recursos incrustados y detección de objetos fuera del marco. `tests/uso-accesible-browser.test.mjs` ejecuta Chromium real: lee un PowerPoint generado con PptxGenJS y conserva una imagen PNG byte por byte, celdas, notas y parejas x/y `[0, 0.7, 4.2]` / `[1, 2, 3]`; comprueba la misma entrada para JSON, Markdown y copias DoE verificadas; cancela el worker y simula falta de espacio sin cambiar el documento abierto.

Las pruebas del editor de figuras usan botones y controles de teclado, deshacer/rehacer, descripción obligatoria, navegación circular por Tab y restauración del marco al cerrar. Comprueban reapertura JSON/SVG, anotaciones en una copia sin cambiar la fuente científica y rechazo de cambios sobre un bloque protegido. El centro de compartir excluye notas privadas por omisión en PPTX/HTML y conserva las del documento original. No hay solicitudes a dominios externos durante estos flujos.

Axe no encontró violaciones serias o críticas en los nuevos diálogos, en escritorio claro y en móvil oscuro de 390 × 844. La auditoría habitual también pasó en inicio, editor y ayuda, claro y oscuro. Se inspeccionaron capturas de importación, figuras y compartir. Un lector independiente, python-pptx 1.0.2, abrió el PowerPoint exportado y verificó formas, imágenes y exclusión de notas privadas. Esto no certifica lectores de pantalla concretos, compatibilidad idéntica con Office, PDF etiquetado o renderizado visual en Impress; esas comprobaciones siguen pendientes. El parser adapta contenido y la revisión informa pérdidas de formato.

## Lienzo libre y proyectos de escritorio — 28 de octubre de 2026

En la revisión `c334365cd4abb38ba2ccbdf8af9d611afa15a68e`, el ejecutable Tauri de release se comprobó en Linux x86-64 con un escritorio virtual Xvfb y WebKitGTK 4.1. Se creó una diapositiva en blanco, se activó el lienzo libre y se insertaron y movieron un rectángulo y una elipse. Al guardar y reabrir el proyecto, las figuras conservaron su geometría y sus datos editables. También se seleccionaron por recuadro, se escalaron juntas y se guardaron y reabrieron de nuevo.

Al modificar el archivo fuera de Tabula, Guardar avisó del conflicto y mantuvo intacto el original; Guardar como conservó los cambios en una copia. El aviso de cierre permitió seguir editando y guardar, y un JSON inválido no alteró el proyecto abierto. Los archivos creados tuvieron permisos `0600`. El ejecutable se probó con bibliotecas de un sysroot; para localizar los procesos de WebKit se ajustó una copia temporal de su biblioteca, sin modificar el ejecutable de Tabula. Esta comprobación no incluye la instalación de un paquete Debian en una distribución limpia.

`tests/lienzo-archivos-browser.test.mjs` incorpora una regresión con interacción real en Chromium para componer, guardar y reabrir figuras, así como conservar los cambios al fallar el guardado. El selector y las operaciones nativas de archivos se simulan en esa prueba; las operaciones de Rust se comprueban por separado. Las 21 pruebas del núcleo Rust pasaron con acceso a los puertos locales que usan sus servidores de prueba.

La auditoría global `npm run accesibilidad` detectó las mismas dos violaciones graves `label-content-name-mismatch` que en la base anterior: `erlen-suite-nav,summary` y `#edicionBadge`, tanto en claro como en oscuro. Siguen pendientes de corrección.
