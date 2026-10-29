# Desarrollo

Node.js >= 22. Dependencias fijadas en `package-lock.json`. Ejecuta `npm ci`, `npm run build`, `npm test` y `npm start`.

## Estructura

- `src/js/_orden.txt`: orden explícito de los módulos del editor; comparten un ámbito léxico.
- `src/css/_orden.txt`: estilos en orden, incluidos los del espacio inicial.
- `src/markdown-core.mjs`: analizador y serializador compartidos por navegador y MCP; no depende de Node.
- `src/pptx-core.mjs` inspecciona el ZIP antes de descomprimir. `web/pptx-worker.mjs` ejecuta pptxtojson fuera del hilo de edición; cancelar o agotar el plazo termina el worker. `web/importar-presentacion.js` adapta contenido, conserva parejas x/y y notas, informa pérdidas de formato y guarda solo al confirmar.
- `src/figuras-core.mjs` valida un modelo propio de objetos permitidos, genera SVG escapado y detecta objetos fuera del marco. `web/figuras-editor.js` usa Fabric.js solo para el lienzo; no carga JSON arbitrario de Fabric. La lista de objetos y los controles ofrecen una alternativa al arrastre. `image.figura` es una propiedad opcional compatible con JSON v1; `src` conserva la representación para motores anteriores. Adaptar una figura científica crea un bloque nuevo.
- `web/compartir-presentacion.js` reúne revisión de contenido y formato, controles de notas optativos y descarga. La firma del documento impide exportar una revisión anterior a un cambio. `openModal` deja inerte el marco del editor y conserva el foco al cerrar.
- `src/js/85-edicion-lote.js`: selección y operaciones atómicas sobre bloques; `locked`, `group` y `blockAlign` son propiedades opcionales compatibles con JSON v1.
- `lienzoLibre` en la diapositiva y `posLibre` y `capaLibre` en cada bloque son propiedades opcionales de JSON v1. El renderizado las comparte entre edición, presentación y HTML; las guías y el recuadro de selección son temporales. El escalado, la alineación y la distribución escriben únicamente las posiciones de la selección validada y se deshacen en una operación. Las exportaciones con límites de geometría deben avisarlo.
- El panel de capas es una vista no modal de `bloquesEnCapas`, ordenada de delante hacia atrás; comparte selección y bloqueo con el lienzo. El arrastre valida la presentación, la diapositiva, la selección y el orden capturados antes de confirmar una operación única de historial. La apertura y las miniaturas del panel no se serializan en el proyecto.
- `05b-barra-contextual.js` muestra acciones por tipo y selección fuera de la diapositiva. Valida el documento, la selección, los objetos y sus bloqueos antes de operar; al cambiar colores comprueba también el modelo de la forma tras cargar el motor. La negrita y la cursiva pueden afectar a todo un bloque de texto o a fragmentos. `formatoTexto` es una lista opcional de rangos ordenados, no solapados, con `inicio` inclusivo y `fin` exclusivo en unidades UTF-16 de `text`; sus booleanos `negrita` y `cursiva` sobreescriben los del bloque. El texto sigue siendo plano y JSON v1; una versión anterior puede ignorar el formato parcial y no conservarlo correctamente si edita el texto. HTML, Beamer y PowerPoint representan los estilos compatibles; Markdown avisa de su pérdida. El exportador editable de PowerPoint rasteriza el texto con matemáticas y el clásico las aproxima con Unicode.
- `bloqueaProporcion` y `transformacionLibre` son propiedades opcionales compatibles con JSON v1. El giro y las reflexiones se aplican a la envoltura visual de las imágenes y sus anotaciones sin modificar `src`; el pie permanece derecho. Las operaciones comprueban la selección y se guardan en el historial. HTML e impresión conservan la orientación; PowerPoint aplica el giro y las reflexiones al objeto exportado y rasteriza las figuras anotadas. Beamer aplica las transformaciones, aunque no conserva la posición libre.
- Las formas del lienzo reutilizan bloques `image` con `figura` y SVG incrustado. `formaLibre` es un indicador opcional compatible con JSON v1; las formas sin pie no cuentan como figuras científicas. La edición por capas conserva el modelo y el PowerPoint recibe una imagen.
- Las imágenes importadas mantienen su fuente en `src`; al recortar, `orig` conserva el original y `src` pasa a ser el recorte PNG. Las vistas reducidas de edición y miniatura son URL temporales con caché acotada; no forman parte del JSON ni de las exportaciones. Los conversores de figuras y PowerPoint solo rasterizan formatos no compatibles en la copia exportada y notifican fallos o imágenes demasiado grandes.
- `src/figures-catalog/` contiene el catálogo y los dibujos de Erlen Figures con procedencia y licencias; `85b-catalogo-figuras.js` los carga por lotes locales e inserta bloques `image` con SVG y `catalogo` opcional. Los proyectos quedan autónomos; los créditos y cambios se conservan en las copias anotadas y en el kit. La procedencia y los avisos están documentados en `src/figures-catalog/README.md`.
- `src/js/52b-agente.js`, `52c-agente-ui.js` y `52c-transporte-agente.js`: chat optativo con herramientas acotadas y conexión HTTPS configurada por la persona. Las operaciones se preparan en una copia y se aplican juntas con deshacer; no se guardan claves ni medios en el contexto. El transporte nativo vive en `crates/slides-core/src/agent.rs`.
- `src/js/85-flujos.js`: cargador local y entradas de las herramientas opcionales. `web/flujos-editor.js` contiene sus interfaces y `web/exportaciones-avanzadas.js`, los adaptadores PptxGenJS/Reveal.js. El build copia bibliotecas, chunks Mermaid y licencias a `public/`, con versiones y SHA-256 en `libre/manifest.json`. El runtime de funciones del HTML se ensambla desde el mismo motor del editor. Terser compacta módulos propios del lienzo, editor, barra contextual, diálogos, revisión, cinta, accesibilidad y flujos sin renombrar los símbolos que usa MCP.
- `src/js/45-estructura.js`, `src/js/45b-estructura-dibujo.js` y `src/js/46-estructura-edit.js`: las estructuras químicas, partidas en modelo, motor y lienzo (ver «Editores de figura»).
- `src/js/47-lab-catalogo.js`, `src/js/47b-lab.js` y `src/js/48-lab-edit.js`: el montaje de laboratorio, partido en catálogo, motor y editor (ver «Editores de figura»).
- `src/js/87-ejemplos.js`: doce ejemplos científicos construidos con los bloques reales.
- `src/diseno/inicio.mjs`, `src/diseno/marco.mjs` y `src/diseno/cinta.js`: componentes locales de inicio, marco y cinta. `src/js/56-cinta.js` configura las acciones del editor.
- `src/js/88-workspace.js`: monta el inicio con la biblioteca, los ejemplos, las plantillas personales y los recursos locales. Sus rutas visibles son `#inicio`, `#inicio/biblioteca`, `#inicio/plantillas`, `#inicio/herramientas` y `#inicio/servicio`; `#presentaciones` abre el editor y `?plantilla=<id>` permite abrir un ejemplo.
- `src/js/88b-recuperacion.js`: historial en IndexedDB, separado del autoguardado.
- `src/js/33-archivo.js` y `crates/slides-core/src/documents.rs`: ciclo de archivos de escritorio. Rust conserva las rutas elegidas en el diálogo y compara la huella antes de guardar; el editor mantiene el estado pendiente y separa la biblioteca de la copia en disco. Las referencias caducan al cambiar de documento o cerrar la app.
- `src/js/88c-ciencia-libre.js`: carga local de bibliotecas científicas.
- `web/quimica-worker.js`: trabajo RDKit fuera del hilo de la interfaz.
- `herramientas/build.mjs`: HTML, recursos locales y manifiestos; no lee credenciales ni configuración de nube.
- `herramientas/examples.mjs`: regenera los JSON y TEX documentados después de construir.
- `mcp/`: servidor MCP para asistentes de IA; carga el build en JSDOM y usa sus funciones. Ver [mcp.md](mcp.md).
- `tests/`: interacción científica, recuperación y pruebas de la aplicación construida.

Tabula es independiente y no incluye un menú de otras aplicaciones ni intercambio de copias entre ellas. Conserva los avisos MIT y las atribuciones de los componentes derivados de Erlen, así como las licencias de terceros. Las notas históricas de publicación describen versiones anteriores, no las funciones de esta distribución.

## Contratos a preservar

Conserva el formato JSON v1 y las claves `erlen-slides.*`. No migres ni sobrescribas automáticamente archivos de Erlen. Vacía la edición pendiente antes de guardar o insertar; los diálogos asíncronos deben comprobar que sigue abierto el mismo documento. Un error de cuota debe ser visible y conservar el original.

La fuente del código es accesible desde la interfaz. Un despliegue derivado debe apuntar al código de esa versión: modifica `ERLEN_SOURCE_URL` cuando corresponda. Las licencias de terceros están en `licenses/`; las bibliotecas opcionales se cargan desde rutas relativas, compatibles con un subdirectorio.

## Estilos del editor

El cromo usa los alias de `src/css/01-editor.css`: `--glass-fondo` (menús, popovers, diálogos, toasts y la barra del lienzo, con `--glass-blur`), `--glass-flujo` (barra superior y pestañas, sin desenfoque), `--glass-edge` y `--glass-relieve`. Apuntan a `--erlen-vidrio*`; los respaldos opacos para menos transparencia, más contraste, colores forzados, `data-erlen-material="solido"`, impresión y navegadores sin `backdrop-filter` están en `src/diseno/tokens.css`. No escribas `backdrop-filter` literal ni lo pongas en la barra superior o sobre el lienzo; la diapositiva y la tira quedan opacas.

## Comprobar un cambio

1. Ejecuta build y los tests afectados.
2. Si cambias ejemplos, ejecuta `npm run examples` y revisa los archivos generados.
3. Comprueba visualmente escritorio y móvil cuando cambie el diseño.
4. Accesibilidad: `npx playwright-core install chromium` una vez y `npm run accesibilidad` (axe en inicio, editor y ayuda, claro y oscuro; falla con violaciones serias o críticas). Ejecútala localmente cuando esté disponible Chromium.
4. Si modificas un exportador, inspecciona el archivo exportado, no solo su nombre o extensión.

Para el PowerPoint, «inspeccionar» significa abrirlo con algo que no sea la propia rutina que lo escribió: un paquete puede tener el ZIP intacto, el XML bien formado y las partes declaradas, y aun así llegar con una diapositiva en blanco. Un lector OOXML independiente (`python-pptx`) dice si las formas están; convertirlo a PDF con LibreOffice Impress (`soffice --headless --convert-to pdf`) dice si además se ven. Así se encontraron las dos averías que documenta `docs/validacion.md`: el SmartArt sin cajas y la diapositiva que se vaciaba en dos de cada cinco exportaciones.

Los tests JSDOM no verifican medidas reales ni rasterización. La estructura actual concatena módulos: es una base funcional heredada, no una promesa de arquitectura modular aislada.

## Editores de figura

Varios editores del programa —el montaje de laboratorio, las estructuras químicas, los diagramas— no son código de una charla: dibujan una figura. Los que ya están separados lo están en tres piezas con una frontera declarada, y sirven de patrón para los demás:

- **catálogo** (`47-lab-catalogo.js`): solo datos. Cada pieza es una lista de figuras `{t:'p'|'l'|'c'|'r'|'e'}` en una caja de 100 × 140. No ejecuta nada ni conoce el resto del programa.
- **motor** (`47b-lab.js`): recibe un montaje saneado y los colores de quien dibuja, y devuelve un dibujo. No consulta el DOM ni `S.deck` salvo por el tema. Aquí vive `PINTURA_LAB`, la tabla que dice cómo se pinta cada papel en cada estilo.
- **editor** (`48-lab-edit.js`): la interfaz de colocar, rotular y unir, más la traducción a TikZ para el PDF.

La regla que sostiene la frontera: **las dos salidas leen la misma tabla**. La de pantalla la resuelve con opacidad y la del PDF mezclando con el fondo, pero los números salen de una sola celda. Cuando cada una tenía su copia, la sombra, el líquido, el metal y las líneas finas ya habían divergido entre lo que se veía y lo que se imprimía. `tests/lab.test.mjs` comprueba esa correspondencia papel por papel y estilo por estilo.

Las estructuras químicas siguen el mismo reparto:

- **modelo** (`45-estructura.js`): qué átomos hay, cómo se unen, cuántos hidrógenos se sobreentienden y dónde cae cada vértice. Ninguna decisión de apariencia.
- **motor** (`45b-estructura-dibujo.js`): de la estructura y un tema, al dibujo —SVG en pantalla, TikZ en el PDF—. La geometría de cada enlace la calcula `trazosEnlace` una sola vez para las dos salidas, y el color lo decide `tintasEstructura`: qué paleta de elementos toca y contra qué papel se recorta el rótulo.
- **lienzo** (`46-estructura-edit.js`): las herramientas de dibujar. Es el único que mira cómo está puesta la aplicación (`editorOscuro`), porque el lienzo va con el tema de la app y no con el de la diapositiva; se lo pasa al motor como argumento.

Aquí la divergencia estaba en el color: la pantalla pintaba el N azul y el O rojo, y el PDF los sacaba negros sobre un parche `fill=white` que en un tema oscuro se veía. `tests/estructura.test.mjs` comprueba elemento por elemento, en tema claro y oscuro, que las dos salidas dicen el mismo color.

`registroColores` (en `09-export.js`) declara cada tono como `\definecolor` antes del dibujo: TikZ no admite expresiones de color con comas dentro de una opción. Lo usan las dos figuras que llevan paleta propia.

Las gráficas no están partidas en tres módulos, pero siguen la misma regla donde importa: `escalasChart` (en `12-chart.js`) decide qué eje va en logaritmo, qué punto cabe en él y en qué espacio se ajusta la recta, y la leen tanto `renderChart` como `chartToPgf`. Con el eje logarítmico eso deja de ser cosmético: el ajuste se hace sobre el logaritmo y la recta se emite como dos coordenadas —en el espacio del dibujo es recta, y pgfplots une coordenadas ya transformadas—, en vez de como la fórmula `{m*x+b}`, que sobre un eje log dibujaría otra curva.
