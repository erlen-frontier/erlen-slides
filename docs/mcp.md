# Servidor MCP: trabajar con una IA

Erlen Slides incluye un servidor [MCP](https://modelcontextprotocol.io) (Model Context Protocol). Con él, un asistente de IA —Claude Desktop, Claude Code u otro cliente MCP— puede crear, editar, revisar y exportar presentaciones con **el mismo motor que el editor**: los bloques se construyen con `newBlock`, los proyectos se validan con `saneaDeck`, la revisión es la del panel de calidad científica y el `.tex` sale de `toBeamer`. El resultado es un proyecto JSON v1 normal, que después se abre en el editor para seguir a mano.

El servidor corre en tu máquina, por stdio. No abre puertos a la red, no envía nada a Internet y solo lee y escribe dentro de su carpeta de trabajo.

## Instalar

Necesitas Node.js 22 o superior y una copia del código fuente:

```sh
git clone https://github.com/erlen-frontier-ops/erlen-slides.git
cd erlen-slides
npm ci
npm run build
```

Para la vista previa, el PDF y el PowerPoint hace falta además Chromium (opcional):

```sh
npx playwright-core install chromium
```

Si ya tienes un Chromium o Chrome, puedes indicarlo con `ERLEN_CHROMIUM=/ruta/al/ejecutable`.

## Conectarlo a un cliente

La carpeta de trabajo es `~/erlen-slides` salvo que indiques otra con `ERLEN_SLIDES_DIR`. Ahí viven los proyectos `.json`, las imágenes que quieras insertar y lo que se exporte.

**Claude Code**, desde cualquier carpeta:

```sh
claude mcp add erlen-slides -e ERLEN_SLIDES_DIR="$HOME/Presentaciones" -- node /ruta/a/erlen-slides/mcp/servidor.mjs
```

**Claude Desktop**, en `claude_desktop_config.json` (Ajustes → Desarrollador → Editar configuración):

```json
{
  "mcpServers": {
    "erlen-slides": {
      "command": "node",
      "args": ["/ruta/a/erlen-slides/mcp/servidor.mjs"],
      "env": { "ERLEN_SLIDES_DIR": "/Users/tu-usuario/Presentaciones" }
    }
  }
}
```

En Windows usa rutas como `C:\\Users\\tu-usuario\\erlen-slides\\mcp\\servidor.mjs`. Cualquier otro cliente MCP que lance servidores por stdio sirve igual: el comando es `node mcp/servidor.mjs`.

## Qué puede hacer la IA

| Herramienta | Para qué |
|---|---|
| `guia_formato` | Diseños de diapositiva, temas, tipos de bloque con sus propiedades y convenciones (TeX, mhchem, datos). |
| `listar_presentaciones`, `listar_ejemplos` | Los proyectos de la carpeta, del más reciente al más antiguo, y los doce ejemplos editables. |
| `crear_presentacion` | Proyecto nuevo con portada y, si se quiere, todas sus diapositivas en una sola llamada; o copia de un ejemplo. |
| `ver_presentacion` | Esquema con el id de cada bloque; una diapositiva completa; o el proyecto entero. Las imágenes incrustadas se resumen en su tipo y tamaño. |
| `editar_metadatos` | Título, autores, institución, fecha, tema, aspecto, acento, tipografía. |
| `agregar_diapositivas`, `agregar_diapositiva` | Varias diapositivas de una vez (entran todas o ninguna) o una sola, con notas del orador y minutos. |
| `editar_diapositiva`, `duplicar_diapositiva`, `mover_diapositiva`, `eliminar_diapositiva` | La estructura de la charla. |
| `agregar_bloque`, `editar_bloque`, `eliminar_bloque` | Texto, viñetas, ecuaciones, reacciones, estructuras químicas desde SMILES o MOL, tablas, gráficas (también desde archivos del equipo), gráficas dinámicas, SmartArt, cajas Beamer, teoremas, código, citas e imágenes. |
| `agregar_referencia` | Una referencia real, dónde se cita y su clave para citar en línea con `[@clave]`. |
| `historial_presentacion`, `deshacer`, `rehacer` | Cada cambio guarda antes la versión anterior (las 50 últimas). |
| `revisar_presentacion` | Calidad científica de las figuras, accesibilidad, estructura, tiempo frente a la duración disponible y avisos por formato. |
| `vista_previa` | En Chromium: un mosaico numerado de toda la charla en una sola imagen, o diapositivas a tamaño real; siempre dice qué bloque se desborda y cuántos píxeles. |
| `exportar_presentacion` | Beamer (carpeta con el `.tex` y las figuras, lista para Overleaf), HTML imprimible, PDF y PowerPoint. Con la extensión [exportaciones](mcp-extensiones/exportaciones.md): PNG por diapositiva, folleto en PDF, paquete reproducible (.zip), figuras en SVG con sus datos en CSV e informe de exportación. |

También ofrece tres *prompts* que el cliente puede mostrar como atajos: **presentación a partir de resultados**, **revisión antes de presentar** y **figura desde un archivo de datos**.

Un pedido típico: «Con `drx/zn-al-ph10.xy` y mis notas, hazme una presentación de 10 minutos para la reunión de grupo sobre la síntesis de HDL Zn-Al, tema Marino, y enséñame el mosaico». El asistente consulta la guía, propone el guion, crea el proyecto con todas las diapositivas, revisa, mira el mosaico, corrige lo que se desborda y exporta.

Después abre el `.json` en Erlen Slides («Abrir proyecto») para seguir editando a mano. Los montajes de laboratorio, las figuras geométricas, las galerías y los vídeos se editan mejor ahí: el servidor los conserva, pero no los construye.

## Estructuras químicas

Un bloque de estructura se construye desde un SMILES o un archivo MOL:

```json
{"tipo": "estruct", "smiles": "C[C@H](N)C(=O)O", "caption": "L-alanina"}
{"tipo": "estruct", "archivo_mol": "moleculas/ligando.mol", "caption": "Ligando", "estilo": "acs"}
```

- RDKit, la misma biblioteca que usa el editor, interpreta la entrada, dibuja en 2D, pone los aromáticos en forma de Kekulé y las cuñas de los estereocentros definidos. Un `.mol` o `.sdf` que ya trae su dibujo se respeta (del `.sdf`, la primera molécula).
- El resultado es **la estructura nativa del editor**: vectorial, se sigue editando átomo a átomo en el lienzo de estructuras y sale como TikZ en el `.tex`. No es una imagen.
- Las sales y los iones se colocan en fila, sin superponerse.
- Los hidrógenos los deduce la app por valencia; donde RDKit dice otra cosa (radicales, metales) se fija el número de RDKit.
- Si no se da `w`, el ancho se calcula para que el enlace mida lo mismo en todas las moléculas (unos 36 px en una diapositiva de 1280) según la zona donde cae; si una molécula no cabe legible, se avisa.
- `estilo` elige la norma de dibujo: `diapo` (por omisión, para proyectar), `acs`, `nature`, `rsc`, `cell` o `wiley`.
- La respuesta trae la fórmula (orden de Hill), la masa molar, el SMILES canónico y los estereocentros sin asignar. **Un modelo de lenguaje se puede equivocar al escribir un SMILES**: el servidor le pide que compare la fórmula y la masa con la molécula pedida, y conviene que tú también la mires en la vista previa.

## Datos de tus equipos

Un bloque de gráfica puede leer directamente el archivo que exporta el equipo:

```json
{"tipo": "chart", "archivo_datos": "drx/zn-al-ph10.xy", "caption": "DRX de la muestra a pH 10."}
```

- Se usa la misma lectura que al soltar un archivo en el editor: detecta separador (tabulador, `;`, `,` o espacios), coma decimal y encabezados.
- Reconoce la técnica por el nombre y el intervalo de los datos (XRD, FTIR, UV-Vis, TGA, Raman, voltamperometría, fotoluminiscencia) y rotula los ejes con sus unidades; el FTIR sale con el eje invertido. `tecnica` la fuerza si se equivoca.
- `columnas` elige cuáles usar (`[1, 3]`: x y la tercera columna, contando desde 1).
- Por encima de 1500 puntos (`max_puntos`) se submuestrea con el mínimo y el máximo de cada intervalo: **cada pico conserva su posición y su intensidad exactas**. La respuesta dice cuántas filas tenía el archivo y cuántas se guardaron.
- La gráfica registra su procedencia (archivo, fecha, filas y huella SHA-256), igual que en el editor. Si después alguien cambia los datos a mano, la procedencia se retira y se avisa: no se atribuye al archivo lo que ya no viene de él.
- Los archivos binarios de algunos equipos no se pueden leer: expórtalos como texto (CSV, TXT, XY, DAT).

## Reglas que el servidor le da a la IA

- No inventar datos, cifras ni referencias. Lo que no venga del usuario se marca como ilustrativo en el pie y en las notas.
- Las diapositivas nuevas nacen vacías. «Dato grande» y «Cita destacada» no heredan la cifra ni la atribución de muestra del editor.
- `diseno: "blanco"` es la página en blanco: sin título, pie ni número, una sola zona para una figura grande, un esquema o una frase. `guia_formato` la marca con `sin_titulo`, y `revisar_presentacion` no le pide título. `titular` (la conclusión en una frase sobre la evidencia), `tresfig` (paneles (a), (b), (c)) y `objetivos` (general y específicos) completan los diseños para charlas científicas.
- Cada cambio se valida con `saneaDeck` antes de guardarse; si falla, el archivo anterior queda intacto y la IA recibe el error. Un lote de diapositivas entra entero o no entra.
- Se aceptan nombres de propiedad en español (`texto`, `pie`, `datos`, `ecuacion`, `eje_x`…). Una propiedad que la aplicación no usa se avisa, con la corrección probable («¿quisiste decir `align`?»).
- Las rutas se interpretan dentro de la carpeta de trabajo: nada de `..` ni rutas absolutas fuera de ella. Las imágenes (PNG, JPEG, GIF, WebP, SVG; hasta 8 MB) se incrustan en el proyecto; los datos, hasta 20 MB.
- El historial vive en `.historial/` dentro de la carpeta de trabajo. Se puede borrar sin perder las presentaciones.

## Límites

- `revisar_presentacion` corre en JSDOM y no mide: el desbordamiento lo comprueba `vista_previa`, en Chromium, y el contraste, la revisión del propio editor.
- Chromium se busca solo: el de `playwright-core`, Chrome o Edge instalados, otros Chromium de Playwright y los del sistema. `ERLEN_CHROMIUM` fija uno.
- El PowerPoint es el del editor: texto y tablas editables, gráficas como imagen. Ábrelo antes de enviarlo.
- El `.tex` requiere una instalación de LaTeX u Overleaf; su compilación no forma parte de la validación. Las figuras con forma, marco, sombra o filtro salen sin ese estilo (se avisa); «Exportar figuras» del editor las da con él. Las imágenes GIF, WebP o SVG hay que convertirlas a PNG o PDF.
- La primera llamada tarda unos segundos: carga la aplicación. Las siguientes son inmediatas.

## Extensiones

Las herramientas nuevas se añaden como extensiones, cada una en sus propios archivos, sin tocar el catálogo común:

- `mcp/extensiones/<id>.mjs` (Node): `export default { herramientas, prompts, convenciones, formatos, transformaBloque }`. Las herramientas tienen la misma forma que las del catálogo (`name`, `title`, `description`, `inputSchema`, `annotations`, `run`); `formatos` añade opciones a `exportar_presentacion` (si la función trae `propiedades`, sus parámetros entran en el esquema); `transformaBloque(bloque, {esImagen})` prepara un bloque antes de mandarlo a la app, como hacen las imágenes, los datos y los SMILES; si deja en el bloque `_importado: {…}`, ese informe sale en `datos_importados` de la respuesta, con el id del bloque, y no se guarda.
- `mcp/extensiones/<id>.pagina.js` (dentro de la app): `ERLEN_MCP.registra(nombre, fn)` añade una operación y `ERLEN_MCP.registraRevision(nombre, fn)` una regla de `revisar_presentacion` (sus hallazgos salen en `adicional`). `ERLEN_MCP.util` da `valida`, `bloqueDesde`, `diapositivaNueva`, `lote`, `indiceDiapositiva`, `buscaBloque`, `cambiaDiseno`, `esquema`, `falla` y `avisa`.
- Desde Node, `mcp/motor.mjs` exporta `op`, `modifica` (lee, aplica, valida, guarda en el historial y escribe), `lee`, `escribe`, `preparaEntrada`, `archivoEnCarpeta` y `compacta`; `mcp/navegador.mjs`, `sesion` e `imprimible` para lo que necesite Chromium.
- Cada extensión documenta sus herramientas en `docs/mcp-extensiones/<id>.md` y se prueba en `tests/mcp-<id>.test.mjs` con el cliente de `tests/_mcp-cliente.mjs`.
- Un nombre de herramienta, prompt o formato repetido detiene el servidor al arrancar, con el archivo culpable.

La extensión de referencia es [estadísticas](mcp-extensiones/estadisticas.md); [tablas desde archivos](mcp-extensiones/tablas.md) usa `transformaBloque`. `ERLEN_MCP_EXTENSIONES` añade otra carpeta de extensiones (la usan las pruebas).

## Desarrollo

- `mcp/servidor.mjs`: protocolo MCP (JSON-RPC 2.0 sobre stdio, versiones `2025-06-18`, `2025-03-26` y `2024-11-05`; `structuredContent` desde la primera), catálogo de herramientas y *prompts*. Sin dependencias nuevas.
- `mcp/motor.mjs`: carpeta de trabajo, escritura atómica, historial, lectura de imágenes y datos, y la aplicación construida cargada en JSDOM.
- `mcp/operaciones.js`: las operaciones sobre el proyecto. Se evalúa dentro de la página, en el ámbito de los módulos, para usar sus funciones reales.
- `mcp/quimica.mjs`: de SMILES o MOL a la estructura nativa, con RDKit (`@rdkit/rdkit`).
- `mcp/navegador.mjs`: vista previa, PDF y PowerPoint en Chromium, con `public/` servido en `127.0.0.1`.
- `mcp/extensiones.mjs` y `mcp/extensiones/`: el sistema de extensiones (ver arriba).
- `tests/mcp.test.mjs`: arranca el servidor como un cliente; prueba el protocolo, construye una presentación con datos de difracción, la revisa, deshace, rehace y exporta. La prueba de vista previa, PDF y PowerPoint se salta si no hay Chromium.

Si cambia el formato de un bloque en `src/js/`, la guía lo refleja sola (`newBlock`); revisa además las convenciones de `mcp/servidor.mjs`.
