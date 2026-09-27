# Extensión: Markdown

Mucha gente escribe la charla primero como texto: un esquema en sus notas, un README, lo que le devuelve un asistente. Esta extensión lo convierte en una presentación de una vez y hace también el camino inverso.

- `importar_markdown` crea un proyecto desde un guion en Markdown con los bloques reales del editor: viñetas, texto, ecuaciones, reacciones, código, tablas, imágenes, citas, notas del orador y minutos. Todo entra en una sola operación (si algo falla, no se escribe nada) y lo que no tiene equivalente en la app se avisa, con su número de línea, en vez de desaparecer.
- `exportar_presentacion` con `formato: "markdown"` escribe el proyecto como Markdown. Sirve de borrador del guion del orador y se puede editar como texto y volver a importar: los bloques que admite el formato vuelven iguales.

El código está en `mcp/extensiones/markdown.mjs` y las pruebas en `tests/mcp-markdown.test.mjs`. El analizador es propio y pequeño: no añade dependencias.

## importar_markdown

| Argumento | Para qué |
|---|---|
| `archivo_md` | Un `.md` (o `.markdown`, `.txt`) de la carpeta de trabajo. Las imágenes se buscan junto a él. |
| `markdown` | El texto directamente, en lugar de `archivo_md`. Las imágenes se buscan en la carpeta de trabajo. |
| `archivo` | El proyecto que se crea. No sobrescribe salvo `sobrescribir: true`, y entonces la versión anterior queda en el historial. |
| `probar` | Solo analiza y valida: devuelve el esquema y los avisos sin escribir nada. |
| `titulo`, `subtitulo`, `autores`, `institucion`, `fecha`, `tema`, `aspecto`, `acento` | Mandan sobre la cabecera del Markdown. |

La respuesta trae el esquema resultante (diseño, título, número de bloques, minutos y si tiene notas por diapositiva), el total de minutos y los avisos. Las figuras de datos (`chart` con `archivo_datos`) y las estructuras químicas (`estruct` con `smiles`) no tienen sintaxis Markdown: se añaden después con `agregar_bloque`.

## Sintaxis

| Markdown | En la presentación |
|---|---|
| Cabecera YAML entre `---` al principio | Metadatos: `titulo`, `titulo_corto`, `subtitulo`, `autores` (texto o lista), `institucion`, `fecha`, `tema`, `aspecto` (`169`, `16:9`, `43`), `acento`, `tipografia`. También en inglés (`title`, `author`…). |
| `# Título` | Sin cabecera con título, el primer `#` es el título de la portada; un párrafo justo debajo, el subtítulo. Los demás `#` son diapositivas de sección. |
| `## Título` | Diapositiva de contenido con ese título. |
| `### Texto` | Texto grande (tamaño «l»). `####` y más profundos también, con aviso. |
| `---` (o `***`, `___`) | Corte: lo que sigue va en una diapositiva sin título. Un `## Título` después del corte abre la suya como siempre. |
| `- `, `* `, `+ ` | Viñetas. La sangría anida hasta tres niveles; más adentro pasa al tercero, con aviso. Las listas numeradas se convierten en viñetas, con aviso. |
| Párrafo | Bloque de texto. Las líneas seguidas se unen; `\` o dos espacios al final de una línea la cortan ahí. `$…$` en línea se conserva tal cual (la app compone matemáticas en línea), igual que `[@clave]` para citar. |
| `$$ … $$` | Ecuación (en una línea o en varias). `$$\ce{…}$$` es una reacción. |
| `\ce{…}` solo en su párrafo, o ```` ```chem ```` | Reacción con sintaxis mhchem. |
| ```` ```math ```` | Ecuación. |
| ```` ```python ```` (o cualquier lenguaje) | Bloque de código con ese lenguaje. También con `~~~`. |
| Tabla con fila separadora `\|---\|` | Tabla con encabezado. Si todas las columnas del separador son `:---`, se alinea a la izquierda; si no, centrada, como en el editor. `\|` escribe una barra dentro de una celda. |
| `Tabla: …` debajo de la tabla | Pie de la tabla (también `Table:` o `: …`). |
| `![pie](ruta.png "texto alternativo"){w=60}` sola en su línea | Imagen de la carpeta, incrustada en el proyecto. El texto alternativo y `{w=…}` (% del ancho) son opcionales. Rutas con espacios, entre `<…>`. También `https:` y `data:`. |
| `> texto` y `> — Autor` en la última línea | Cita. |
| `Notas:` en su línea | Notas del orador: todo lo que sigue hasta el siguiente `#`, `##` o `---`, con líneas en blanco incluidas. En la portada (antes de la primera diapositiva), son las notas de la portada. |
| `> nota: …` | Notas del orador en una cita, para una nota corta en medio de la diapositiva. |
| `<!-- minutos: 2 -->` | Tiempo previsto de la diapositiva (o de la portada o la sección en la que va). |
| `<!-- diseno: enunciado -->` | Diseño de la diapositiva (ids en `guia_formato`). |
| `<!-- encabezados: A \| B -->` | Encabezados de zona (comparación, pasos, cuadrícula…). |
| `::: columnas 40` … `\|\|\|` … `:::` | Columnas. Cada `\|\|\|` abre la siguiente zona: dos zonas dan «twocol», tres «tres», cuatro «cuadricula», seis «rejilla6», salvo que se indique otro diseño. El número opcional es el % de anchura de la primera columna en «twocol» y «barra». Un `\|\|\|` suelto en una diapositiva también funciona. La app no tiene «debajo de las columnas»: lo que va tras el `:::` de cierre queda en la última columna, con aviso. |

Cualquier otro comentario HTML se ignora: es del autor, no contenido. Una directiva `<!-- clave: … -->` con una clave desconocida sí se avisa.

La app no tiene negrita, cursiva, tachado, código en línea ni enlaces en el texto: se quitan las marcas y se avisa (un enlace queda como «texto (url)»). Para escribir esos caracteres tal cual, fuera de `$…$`, se escapan: `\*`, `\_`, `` \` ``, `\[`, `\~` y `\\`. El HTML, las notas al pie `[^1]`, las imágenes dentro de un párrafo y los bloques `::: otro` también se avisan. `Notas:` y `Nota:` al principio de una línea siempre abren notas del orador; si un párrafo tiene que empezar así, escríbelo con `\` delante.

Los errores dicen la línea del Markdown: una imagen que no existe, una ruta fuera de la carpeta de trabajo (`../`), un diseño o un tema desconocidos. En ese caso no se escribe nada.

## Exportar a Markdown

```json
{"archivo": "charla-hdl", "formato": "markdown"}
```

Escribe `charla-hdl.md` junto al proyecto (o donde diga `destino`) con la cabecera YAML, las secciones, las diapositivas, las notas y los minutos en la sintaxis de arriba. El texto que parecería Markdown (asteriscos, una línea que empieza por `-` o por `Notas:`, una cita que empieza por `Nota:`) se escapa para que vuelva literal.

La segunda línea tras la cabecera es un comentario que marca el archivo como exportación. Solo un archivo con esa marca se sobrescribe: si el destino ya existe y no la lleva (por ejemplo, el guion escrito a mano del que se importó el proyecto, que puede tener comentarios, negritas o enlaces que la importación quitó), la exportación se detiene y pide otro `destino`. Las imágenes siguen incrustadas en el proyecto; para que el Markdown se pueda volver a importar, se extraen además a `charla-hdl-figuras/` y se enlazan desde ahí.

Lo que no tiene equivalente se dice en `avisos` y no se pierde del proyecto: las gráficas, estructuras, SmartArt, montajes y demás bloques quedan como un comentario `<!-- bloque «chart» (pie: …) sin equivalente en Markdown -->`; las referencias, las citas por diapositiva, la alineación centrada y el tamaño pequeño del texto, los espaciadores y la aparición paso a paso de las viñetas no se exportan. Una tabla sin fila de encabezado sale con la primera fila como encabezado. En Markdown el nivel de una viñeta depende de la anterior: una lista que empieza sangrada o salta un nivel se avisa, porque al volver a importarla cada viñeta queda como mucho un nivel por debajo de la anterior.

La ida y vuelta está probada: un proyecto con texto, viñetas, ecuaciones, reacciones, código, tablas, imágenes, citas, notas, minutos, secciones, columnas y diseños con encabezados, exportado a Markdown e importado de nuevo, da el mismo proyecto (salvo los id internos) y vuelve a exportarse al mismo Markdown.

## Ejemplo completo

[`ejemplo-charla-hdl.md`](ejemplo-charla-hdl.md) es el guion de una charla de reunión de grupo sobre la síntesis de hidróxidos dobles laminares Zn-Al por coprecipitación, con portada, secciones, viñetas anidadas, la fórmula general, la reacción balanceada, una figura de DRX en columnas, una tabla con pie, la ecuación de Scherrer, código, notas del orador y minutos. **Todas sus cifras son ilustrativas**, no resultados de un experimento, y así lo dicen el subtítulo, los pies y las notas.

Para probarlo, copia el archivo a tu carpeta de trabajo, pon tu difractograma en `figs/drx-zn-al.png` junto a él y pide: «Importa `ejemplo-charla-hdl.md` como `charla-hdl` y enséñame el mosaico». Sin la imagen, la importación se detiene y dice en qué línea falta.

Un fragmento:

```markdown
---
titulo: "Síntesis de HDL Zn-Al por coprecipitación a pH constante"
autores: [Nombre Apellido]
tema: marino
---

# Resultados

## DRX: reflexiones basales de la fase HDL
<!-- minutos: 3 -->
::: columnas 60
![Difractograma ilustrativo de la muestra a pH 9.](figs/drx-zn-al.png){w=100}
|||
- (003) y (006): reflexiones basales
- Ley de Bragg: $n\lambda = 2d\sin\theta$
:::

Notas:
Señalar (003) y (006).
```
