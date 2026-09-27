# Extensión: exportaciones

Añade cinco formatos a `exportar_presentacion`. Todos escriben dentro de la carpeta de trabajo; `destino` cambia el nombre del archivo o de la carpeta de salida.

| Formato | Qué sale | Opciones | Chromium |
| --- | --- | --- | --- |
| `png` | Carpeta `<nombre>-png/` con una imagen por diapositiva (`01.png`, `02.png`…), con los pasos ya revelados. | `escala` de 1 a 3 (por omisión 2: 2560 × 1440 en 16:9). | Sí |
| `folleto` | `<nombre>-folleto.pdf`: el «Folleto para repartir» del editor, en carta vertical, con renglones para anotar junto a cada diapositiva. | `por_hoja`: 2, 3 (por omisión) o 6 (sin renglones). | Sí |
| `paquete` | `<nombre>-paquete.zip`: el «Kit de defensa» del editor (LEEME, `.tex` en 16:9 y 4:3, `proyecto.json`, guion, `provenance.json`, imágenes) más `datos/` (el CSV de cada gráfica y `procedencia.json`), las gráficas y estructuras en SVG en `figuras/` e `informe-exportacion.json`. La respuesta lista el contenido. | — | Sí |
| `figuras` | Carpeta `<nombre>-figuras/`: cada gráfica, función y estructura química en SVG autónomo, el CSV de cada gráfica al lado y las imágenes con su formato original. | — | No |
| `informe` | `<nombre>-informe-exportacion.json`: el informe de exportación del editor (qué se pierde o cambia en PDF, Beamer, PowerPoint y SVG, más la auditoría científica). La respuesta resume los avisos que no son informativos. | — | No |

Los nombres de las figuras son los de `figName` (`figura-<id>`), los mismos que espera el `.tex` de Beamer, para que se puedan cruzar.

## Datos y procedencia

El CSV de cada gráfica son sus datos tal como se dibujan: leídos con `parseTable`, con punto decimal y separados por comas. Si vinieron de un archivo de equipo (`archivo_datos`), ya están limpios y quizá submuestreados (`max_puntos`). `datos/procedencia.json` dice de qué archivo salió cada CSV, cuándo, cuántas filas y con qué huella (SHA-256 abreviado de la tabla guardada en `proyecto.json`, la misma que `provenance.json`).

Las imágenes salen como se subieron: sin el recorte, el marco ni el filtro del editor. Para eso está «Exportar figuras» en la app.

## Cómo está hecho

- `exportaciones.pagina.js` (JSDOM) registra `exportaFiguras` y `exportaInforme` con las funciones de la app: `figuraSVG` (la del botón «SVG científico», ahora con los rótulos de los ejes y el título dentro del SVG), `svgEstructura`, `allImageBlocks`, `parseTable` e `informeExportacion`.
- `exportaciones.mjs` escribe los archivos y, para lo que hay que rasterizar o imprimir, usa la sesión de Chromium de `navegador.mjs`: `imprimible` para los PNG (en un contexto propio con `deviceScaleFactor`), `folletoHTML` para el folleto y `archivosKit` + `armaZip` para el paquete, cuya descarga se intercepta como la del PowerPoint.
- Sin Chromium, `png`, `folleto` y `paquete` devuelven el mismo aviso que el PDF, con el comando para instalarlo; `figuras` e `informe` funcionan igual.
- Las opciones `escala` y `por_hoja` se declaran en `fn.propiedades` de cada formato y el servidor las añade al esquema de `exportar_presentacion`.

Se prueba en `tests/mcp-exportaciones.test.mjs`: cabecera IHDR de los PNG, páginas y tamaño del PDF, entradas y CRC del ZIP, y que los SVG sean XML bien formado.
