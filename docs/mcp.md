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
| `guia_formato` | Diseños de diapositiva, temas, tipos de bloque con sus propiedades y convenciones (TeX, mhchem, datos de gráficas). |
| `listar_presentaciones`, `listar_ejemplos` | Ver los proyectos de la carpeta y los doce ejemplos editables. |
| `crear_presentacion` | Proyecto nuevo con portada, o copia de un ejemplo. No sobrescribe sin permiso. |
| `ver_presentacion` | Esquema con cada diapositiva, sus zonas y el id de cada bloque; o el JSON completo. |
| `editar_metadatos` | Título, autores, institución, fecha, tema, aspecto, acento, tipografía. |
| `agregar_diapositiva`, `editar_diapositiva`, `eliminar_diapositiva`, `mover_diapositiva` | La estructura de la charla, con notas del orador y minutos por diapositiva. |
| `agregar_bloque`, `editar_bloque`, `eliminar_bloque` | Texto, viñetas, ecuaciones, reacciones, tablas, gráficas de datos, gráficas dinámicas, SmartArt, cajas Beamer, teoremas, código, citas e imágenes. |
| `agregar_referencia` | Una referencia real y dónde se cita. |
| `revisar_presentacion` | Calidad científica de las figuras, accesibilidad, estructura y avisos por formato. |
| `vista_previa` | La diapositiva renderizada en Chromium, como imagen, y si algo se desborda. |
| `exportar_presentacion` | Beamer (`.tex`), HTML imprimible, PDF y PowerPoint. |

Un pedido típico: «Con los datos de `xrd.csv` que te pego, hazme una presentación de 8 diapositivas para la reunión de grupo sobre la síntesis de HDL Zn-Al, tema Revista, y enséñame la vista previa». El asistente consulta la guía, crea el proyecto, añade diapositivas con sus bloques, revisa, mira la vista previa, corrige lo que se desborda y exporta.

Después abre el `.json` en Erlen Slides («Abrir proyecto») para seguir editando a mano. Las estructuras químicas dibujadas, los montajes de laboratorio, las figuras geométricas, las galerías y los vídeos se editan mejor ahí: el servidor los conserva, pero no los construye.

## Reglas que el servidor le da a la IA

- No inventar datos, cifras ni referencias. Lo que no venga del usuario se marca como ilustrativo en el pie y en las notas.
- Las diapositivas nuevas nacen vacías. «Dato grande» y «Cita destacada» no heredan la cifra ni la atribución de muestra del editor.
- Cada cambio se valida con `saneaDeck` antes de guardarse; si falla, el archivo anterior queda intacto y la IA recibe el error. Los avisos de reparación se devuelven siempre.
- Las rutas se interpretan dentro de la carpeta de trabajo: nada de `..` ni rutas absolutas fuera de ella. Las imágenes (PNG, JPEG, GIF, WebP, SVG; hasta 8 MB) se incrustan en el proyecto.

## Límites

- `revisar_presentacion` corre en JSDOM y no mide: el contraste y el desbordamiento solo los comprueba `vista_previa`, en Chromium.
- El PowerPoint es el del editor: texto y tablas editables, gráficas como imagen. Ábrelo antes de enviarlo.
- El `.tex` requiere una instalación de LaTeX u Overleaf; su compilación no forma parte de la validación.
- La primera llamada tarda unos segundos: carga la aplicación. Las siguientes son inmediatas.

## Desarrollo

- `mcp/servidor.mjs`: protocolo MCP (JSON-RPC 2.0 sobre stdio, versiones `2025-06-18`, `2025-03-26` y `2024-11-05`) y catálogo de herramientas. Sin dependencias nuevas.
- `mcp/motor.mjs`: carpeta de trabajo, lectura y escritura atómica, y la aplicación construida cargada en JSDOM.
- `mcp/operaciones.js`: las operaciones sobre el proyecto. Se evalúa dentro de la página, en el ámbito de los módulos, para usar sus funciones reales.
- `mcp/navegador.mjs`: vista previa, PDF y PowerPoint en Chromium, con `public/` servido en `127.0.0.1`.
- `tests/mcp.test.mjs`: arranca el servidor como un cliente y construye, revisa y exporta una presentación.

Si cambia el formato de un bloque en `src/js/`, la guía lo refleja sola (`newBlock`); revisa además las convenciones de `mcp/servidor.mjs`.
