# Desarrollo

Node.js >= 22. Dependencias fijadas en `package-lock.json`. Ejecuta `npm ci`, `npm run build`, `npm test` y `npm start`.

## Estructura

- `src/js/_orden.txt`: orden explícito de los módulos del editor; comparten un ámbito léxico.
- `src/css/_orden.txt`: estilos en orden, incluidos los del espacio inicial.
- `src/js/45-estructura.js`, `src/js/45b-estructura-dibujo.js` y `src/js/46-estructura-edit.js`: las estructuras químicas, partidas en modelo, motor y lienzo (ver «Editores de figura»).
- `src/js/47-lab-catalogo.js`, `src/js/47b-lab.js` y `src/js/48-lab-edit.js`: el montaje de laboratorio, partido en catálogo, motor y editor (ver «Editores de figura»).
- `src/js/87-ejemplos.js`: doce ejemplos científicos construidos con los bloques reales.
- `src/diseno/suite-inicio.js`: la pantalla de inicio común de Erlen (`erlenInicio`), que genera `diseno-sync --modo iife` del portal; `src/js/_orden.txt` la carga directamente, sin copia local. Sus estilos, `src/diseno/inicio.css`, se incrustan en el build tras los de la cinta.
- `src/js/88-workspace.js`: monta el inicio con la biblioteca, los ejemplos, las plantillas personales y los recursos locales, y mantiene las rutas `#suite/<vista>` y `#presentaciones` y el enlace `?plantilla=<id>`.
- `src/diseno/suite-navigation.js`: el menú común de Erlen (auxiliar MIT del repositorio maestro, envuelto para el ámbito compartido porque aquí los módulos se concatenan); `src/js/_orden.txt` lo carga directamente. Lo mismo vale para la cinta, `src/diseno/suite-cinta.js`.
- `src/js/88b-recuperacion.js`: historial en IndexedDB, separado del autoguardado.
- `src/js/88c-ciencia-libre.js`: carga local de bibliotecas científicas.
- `src/js/88d-intercambio.js`: el transporte de copias de la suite. Copia literal de `web/exchange-v2.mjs` (a su vez copia literal del archivo MIT del portal), envuelta para el ámbito compartido y sin sus `export`; `tests/intercambio.test.mjs` exige que no se aparten.
- `src/js/88e-informe.js`: recibe de Erlen DoE un informe `informe-v1`: lo valida (`leeInforme`), lo convierte (`informeADeck`), lo enseña y solo tras confirmarlo lo guarda como presentación nueva. El reparto por diapositiva usa medidas tomadas en Chromium, anotadas en el propio módulo. Sus límites (`INFORME_LIMITES`) no se escriben en el módulo: ver «Límites de informe-v1».
- `web/quimica-worker.js`: trabajo RDKit fuera del hilo de la interfaz.
- `herramientas/build.mjs`: HTML, recursos locales y manifiestos; no lee credenciales ni configuración de nube.
- `herramientas/examples.mjs`: regenera los JSON y TEX documentados después de construir.
- `tests/`: interacción científica, recuperación y pruebas de la aplicación construida.

Los nombres históricos internos no implican que la suite completa esté incluida. Esta distribución contiene Presentaciones. Evita introducir dependencias a sus otros editores.

El menú común y el intercambio de copias son las excepciones, y ninguno es una dependencia. El intercambio (`88d-intercambio.js`) solo lee de IndexedDB del navegador la copia cuyo identificador trae la URL; no ejecuta código de otras apps ni hace peticiones de red.

El menú común no es una dependencia: `src/diseno/suite-navigation.js` no importa ni ejecuta código de los otros editores, sólo pinta una lista de enlaces, y comprueba `location.pathname` para no aparecer siquiera cuando la aplicación se sirve suelta. La 0.1.2 ya lo llevaba, inyectado fuera del repositorio; desde la 0.2.1 vive aquí, con su aviso MIT íntegro, para que el paquete que despliega la suite se pueda reconstruir desde esta fuente.

## Contratos a preservar

Conserva el formato JSON v1 y las claves `erlen-slides.*`. No migres ni sobrescribas automáticamente archivos de Erlen. Vacía la edición pendiente antes de guardar o insertar; los diálogos asíncronos deben comprobar que sigue abierto el mismo documento. Un error de cuota debe ser visible y conservar el original.

La fuente del código es accesible desde la interfaz. Un despliegue derivado debe apuntar al código de esa versión: modifica `ERLEN_SOURCE_URL` cuando corresponda. Las licencias de terceros están en `licenses/`; las bibliotecas opcionales se cargan desde rutas relativas, compatibles con un subdirectorio.

### Límites de informe-v1

La única fuente de los límites del tipo `informe-v1` en Slides es `src/contratos/informe-v1-limites.json`, copia literal de `contratos/informe-v1/limites.json` del repositorio `erlen-contratos`. `herramientas/build.mjs` la convierte en `src/js/_informe-limites-gen.js` (generado, ignorado por git), que define `INFORME_LIMITES` antes de `88e-informe.js`. `tests/informe-limites.test.mjs` comprueba que la constante del build es la del archivo y que el módulo no copia números a mano; con `ERLEN_CONTRATOS_DIR=<checkout de erlen-contratos>` (o un `../erlen-contratos` al lado) la compara además con el contrato. Ese repositorio es privado y la CI no lo ve; la puerta de contratos de erlen-suite compara la constante del build en cada publicación. Si el contrato cambia sus límites, se vuelve a copiar el archivo.

## Cristal (paquete de diseño 2.0.0)

El cromo usa el material de cristal del paquete (`docs/COHERENCIA-APPS.md` §0.1 del portal) con los alias de `src/css/01-editor.css`: `--glass-fondo` (menús, popovers, diálogos, toasts y la barra del lienzo, con `--glass-blur`), `--glass-flujo` (barra superior y pestañas, sin desenfoque), `--glass-edge` y `--glass-relieve`. Todos apuntan a `--erlen-vidrio*`: los respaldos opacos (menos transparencia, más contraste, colores forzados, `data-erlen-material="solido"`, impresión y navegadores sin `backdrop-filter`) llegan de `src/diseno/tokens.css` y no se repiten aquí. No escribas `backdrop-filter` literal, no lo pongas en la barra superior (contiene el menú de la suite) ni sobre el lienzo; la diapositiva y la tira quedan opacas.

## Comprobar un cambio

1. Ejecuta build y los tests afectados.
2. Si cambias ejemplos, ejecuta `npm run examples` y revisa los archivos generados.
3. Comprueba visualmente escritorio y móvil cuando cambie el diseño.
4. Accesibilidad: `npx playwright-core install chromium` una vez y `npm run accesibilidad` (axe en inicio, editor y ayuda, claro y oscuro; falla con violaciones serias o críticas). La CI lo ejecuta en el job `accesibilidad`.
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
