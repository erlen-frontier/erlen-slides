# Extensión: cambios masivos

Tres herramientas para cambiar muchas diapositivas de una vez: `buscar_reemplazar`, `estilo_global` y `normalizar_titulos`. Las tres funcionan igual:

1. **Sin `aplicar`** (o con `aplicar: false`) devuelven la lista de lo que cambiaría y **no escriben nada**.
2. **Con `aplicar: true`** hacen exactamente esos cambios, validan el proyecto con `saneaDeck` y guardan la versión anterior en el historial. Un solo `deshacer` revierte el lote entero.
3. Si no hay nada que cambiar, el archivo no se toca y el historial no crece.

Las tres aceptan `diapositivas`: números desde 1, id o rangos (`["3-7", 10]`). La lista de cambios se corta en 100 filas; `total` dice cuántos hay.

## `buscar_reemplazar`

```json
{"archivo": "avance", "buscar": "DRX", "reemplazar": "XRD"}
{"archivo": "avance", "buscar": "DRX", "reemplazar": "XRD", "aplicar": true}
{"archivo": "avance", "buscar": "(\\d+)\\s*°C", "regex": true, "reemplazar": "$1 °C"}
```

Cada fila de la vista previa dice dónde está la coincidencia (`diapositiva`, `bloque`, `tipo`, `campo`) y la enseña en contexto, `antes` y `despues`.

- **Dónde busca** (`ambito`): `titulos` (títulos y subtítulos de diapositiva), `texto` (texto, viñetas, cajas, citas, teoremas, SmartArt, código), `notas`, `pies` (pies de figura y texto alterno), `tablas`, `ecuaciones`, `encabezados` (de zona), `graficas` (título y ejes) y `portada` (título, autores, institución, fecha…). Por omisión, todos menos `ecuaciones`.
- **Dónde nunca entra**: los datos de las gráficas, las imágenes, las estructuras químicas, los montajes, la procedencia de los datos y los id. No están en la lista de campos, así que ningún patrón llega a ellos.
- **Matemáticas**: sin el ámbito `ecuaciones` no se toca nada entre `$…$` o `$$…$$`, y la respuesta dice cuántas coincidencias se saltaron por eso. Con `ecuaciones` se busca también en la TeX de ecuaciones y reacciones.
- **Citas**: lo que va dentro de `[@clave]` no se cambia nunca.
- **Mayúsculas y tildes**: por omisión no se distinguen, como en el buscador del editor. «sintesis» encuentra «Síntesis», y la mayúscula inicial de cada coincidencia se conserva en el reemplazo. La ñ sí cuenta: «ano» no encuentra «año». `mayusculas: true` distingue las dos cosas.
- **`palabra_completa`**: «Al» no encuentra «Alúmina». Reconoce letras con tilde, cosa que `\b` no hace.
- **`regex`**: expresión regular de JavaScript con la bandera `u`. El reemplazo admite `$1`, `$<nombre>`, `$&`, y `$$` para un `$` literal. Las coincidencias vacías (`x*`) se ignoran.
- **Seguridad**: el patrón admite hasta 300 caracteres y la búsqueda se corta a los 1,5 s. Un patrón con retroceso catastrófico, como `(a+)+b`, devuelve un error en vez de colgar el servidor.
- Sin `reemplazar` solo busca.

## `estilo_global`

```json
{"archivo": "avance", "propiedades": {"anim": "fade", "animVel": "rapida"}}
{"archivo": "avance", "tipo_bloque": "text", "propiedades": {"size": "l", "align": "center"}, "diapositivas": ["2-6"], "aplicar": true}
```

| Propiedad | Valores | Se aplica a |
|---|---|---|
| `size` | `s`, `n`, `l` | texto; ecuaciones solo `n` y `l` |
| `align` | `left`, `center` | texto y tablas (en la tabla se guarda `l`/`c`) |
| `anim` | los efectos del editor (`none`, `fade`, `up`, `zoom`, `barrido`…) | cualquier bloque; `draw` solo gráficas y diagramas |
| `animVel` | `rapida`, `normal`, `lenta` | cualquier bloque |
| `animRet` | 0–2000 ms | cualquier bloque |
| `step` | `true`, `false` | cualquier bloque (viñetas: punto por punto) |
| `w` | 10–100 % | figuras, gráficas, estructuras, diagramas |
| `grid`, `legend` | `true`, `false` | gráficas |

También se aceptan en español: `tamano`, `alineacion`, `animacion`, `velocidad`, `retardo`, `por_pasos`, `ancho`, `cuadricula`, `leyenda`. Los valores válidos salen de la propia app (`ANIMS`, `ANIM_VEL`, `newBlock`).

Una propiedad o un valor desconocido es un error, igual que pedir una propiedad para un `tipo_bloque` que no la tiene. Sin `tipo_bloque`, los bloques a los que no se aplica se saltan. Si el motivo merece contarse (`size: "s"` en una ecuación, `draw` en un texto), sale en `omitidos`. Pedir el valor que el bloque ya tiene, aunque sea el de por omisión, no cuenta como cambio.

## `normalizar_titulos`

```json
{"archivo": "avance"}
{"archivo": "avance", "estilo": "oracion", "conservar": ["Rietveld"], "aplicar": true}
```

- `estilo: "oracion"` (por omisión): mayúscula solo en la primera letra, como se escribe en español. «Síntesis De ZnAl-LDH Por Coprecipitación.» pasa a «Síntesis de ZnAl-LDH por coprecipitación».
- `estilo: "titulo"`: cada palabra de contenido en mayúscula, sin tocar artículos, preposiciones ni conjunciones.
- `quitar_punto_final` (por omisión `true`) quita el punto final, pero no el de «etc.» o «et al.» ni los puntos suspensivos.
- `incluir_encabezados` y `incluir_portada` amplían el cambio a los encabezados de zona y al título de la portada.

**Lo que nunca se toca**: siglas (XRD, FTIR, TGA, HDL), fórmulas (Zn(OH)2, ZnAl-LDH, CO3²⁻, Zn/Al), unidades y magnitudes con mayúscula interior (pH, eV, °C), lo que va entre `$…$` y las palabras de `conservar`. Los símbolos de elemento (Zn, Mg, Cu) se respetan. Los que también son palabras en español («La», «Se», «Y») se tratan como palabras, salvo Al, Ni, Fe, Ti, In, As, Ir y Re cuando el título lleva otro símbolo o una fórmula: «Dopaje Con Al Y Mg» pasa a «Dopaje con Al y Mg».

**Nombres propios**: una palabra solo se pasa a minúscula si el título entero estaba en «Mayúscula De Título». Esto se detecta porque lleva en mayúscula una preposición o un artículo, o porque la mayoría de las palabras de contenido empiezan por mayúscula. En ese caso no hay forma de saber si «Scherrer» era un nombre, así que la respuesta lo apunta en `revisar.pasadas_a_minuscula`; los nombres que haya que conservar van en `conservar`. Si el título ya estaba en oración («Ecuación de Scherrer»), sus mayúsculas interiores se respetan y se listan en `revisar.mayusculas_respetadas`. Los títulos escritos enteros en mayúsculas no se tocan: no se puede distinguir una sigla de una palabra. Salen en `omitidas`.
