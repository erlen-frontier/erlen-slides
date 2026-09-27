# Extensión: gráficas científicas

Tres cosas que un bloque `chart` con `archivo_datos` no daba: comparar varios archivos del equipo en una figura, rotular picos y recortar un archivo en x. Viven en `mcp/extensiones/graficas.mjs` (Node: lee los archivos y su SHA-256) y `graficas.pagina.js` (la cuenta, con `parseTable`, `detectaTecnica` y `chartSeries` de la app).

Dos reglas valen para todo:

- **Lo que se dibuja y lo que se informa son puntos medidos.** No se interpola una serie sobre la rejilla de otra ni se coloca un pico en un máximo suavizado.
- **Lo que cambia la lectura de la figura se dice.** Normalizar, desplazar y recortar aparecen en la respuesta, en el pie propuesto y en la procedencia; si el pie que escribe la IA lo calla, la respuesta lo avisa.

## `comparar_espectros`

```json
{"archivo": "avance", "titulo": "El pH 10 da la fase más cristalina",
 "archivos": [{"ruta": "drx/ph8.xy", "nombre": "pH 8"}, {"ruta": "drx/ph9.xy", "nombre": "pH 9"}, {"ruta": "drx/ph10.xy", "nombre": "pH 10"}],
 "normalizar": "max", "intervalo_x": [5, 70]}
```

- Una serie por archivo (2 a 8), en el orden dado; al apilarse, la primera queda arriba. `columna` elige la columna de y de cada archivo (desde 1; por omisión la 2) y `nombre`, el de la serie.
- **Rejillas distintas.** Si los archivos no se midieron en los mismos x, la tabla de la gráfica une las rejillas y cada serie guarda solo sus puntos: las celdas donde un archivo no midió quedan vacías y su curva une sus propios puntos. No hay interpolación. La respuesta dice `rejilla_x: común` o `distinta`.
- **`normalizar`**: `ninguno` (por omisión), `max` (cada serie entre su máximo en el intervalo; queda en 1 exacto) o `area` (entre su área por la regla del trapecio sobre los puntos medidos del intervalo; las unidades de y pasan a ser 1/unidad de x). Se normaliza antes de submuestrear, con todos los puntos. El eje y lo dice («Intensidad normalizada (u. a.)»).
- **`desplazar`**: `auto` (por omisión) busca la separación, en pasos de 5 % del intervalo de y, con la que cada curva queda por encima de la siguiente donde comparten x, más un 6 % de margen y al menos un 35 % para que las líneas base no se peguen (para calcularla, y solo para eso, se compara cada serie con la vecina por interpolación lineal). Un número fija el porcentaje (0–150, como el deslizador «Separación» del editor) y `0` superpone las curvas con leyenda. Apiladas, el eje y pierde sus números: el desplazamiento es de presentación.
- **`intervalo_x`**: [mín, máx], extremos incluidos. **`max_puntos`** (por omisión 1500 por serie) submuestrea con el mínimo y el máximo de cada tramo, como `archivo_datos`: cada pico conserva su posición y su intensidad.
- **Técnica**: la del primer archivo (se avisa si los archivos parecen de técnicas distintas) o `tecnica`. El FTIR sale con el eje invertido.
- **Dónde**: con `diapositiva` (y `zona`) en una existente; si no, en una diapositiva nueva en `posicion` o al final, con `titulo`. `propiedades` pasa otras propiedades del bloque (`w`, `xlabel`…), pero no los datos ni la procedencia.
- **Procedencia**: el bloque guarda `fuente.nombre` = «ph8.xy + ph9.xy + ph10.xy», las filas de la tabla y su huella, que (como en el editor) es la de la tabla guardada. La respuesta trae, por archivo, la ruta, el **SHA-256 del archivo original**, filas leídas, filas en el intervalo y guardadas, el intervalo de x, el máximo original (x, y) y el divisor de la normalización.
- **Pie**: sin `caption` se usa uno propuesto que dice la técnica, las series, la normalización y el desplazamiento. Con `caption` propio se conserva tal cual y la respuesta avisa si no menciona la normalización o el desplazamiento.

## `marcar_picos`

```json
{"archivo": "avance", "bloque": "b3k9x", "longitud_onda": 1.5406,
 "etiquetas": [{"x": 11.6, "texto": "(003)"}, {"x": 23.4, "texto": "(006)"}]}
```

- Busca máximos locales en la curva suavizada con una media móvil (semiancho `suavizado` en puntos; automático por omisión) y calcula su **prominencia**: lo que el pico sobresale de la base más alta de sus dos lados, como fracción del intervalo de y de la serie. Se quedan los que superan `prominencia_min` (0.05) y, de ellos, los `max_picos` (10) más prominentes por serie.
- La posición y la intensidad que se informan y se rotulan son las del **punto guardado más alto** del entorno del máximo, sin interpolar ni suavizar. Con datos de `archivo_datos` o `comparar_espectros` el submuestreo conserva ese punto.
- `sentido`: `auto` busca mínimos si el eje y es de transmitancia (las bandas de un FTIR en %T) y máximos en lo demás; sus rótulos van debajo de la banda.
- **Rótulos**: el automático es la posición, con los decimales que permite el paso de muestreo («11.66», «1360»). `etiquetas` [{x, texto, serie?}] pone los tuyos: mandan sobre el automático del pico detectado más cercano dentro de `tolerancia_x` (por omisión, la mayor de 5 pasos o el 0.5 % del intervalo). Si ahí no se detectó pico, se rotula el punto medido más alto (o más bajo) de esa ventana, y la respuesta dice `detectado: false`. Sin `serie`, una etiqueta va a la primera serie marcada (la de arriba si están apiladas). `solo_etiquetas` deja solo esas.
- **No asigna nada.** Ni índices de Miller ni bandas: si el usuario los da, van en `etiquetas`.
- `longitud_onda` (Å; solo en difractogramas con 2θ en x) añade a cada pico `d_angstrom` = λ / (2 sen θ). No se supone ninguna λ.
- `serie` limita la búsqueda a una serie (número desde 1 o nombre). `reemplazar: false` conserva los rótulos anteriores de esas series.
- La revisión (`revisar_presentacion`, regla `picos-sin-dato`) avisa si un rótulo ya no cae en un punto de su serie, por ejemplo tras cambiar los datos a mano.

### Los rótulos en el editor y en las exportaciones

El bloque guarda `picos: [{x, y, serie, txt, abajo?}]` (serie desde 0), una propiedad opcional del JSON v1 que las versiones anteriores ignoran. La app los dibuja sobre su punto con una raya del color de la serie, en una franja encima del marco (o debajo del mínimo, para las bandas), y sube un renglón el que chocaría con el anterior. Por capas, cada rótulo entra con su serie. En Beamer cada uno es un `\draw … node` en `axis cs`, con `clip mode=individual` y el eje agrandado por ese lado; en PowerPoint van en la imagen de la gráfica. En el panel «Figura viva» se ven y se quitan de una vez.

## `intervalo_x` con `archivo_datos`

```json
{"tipo": "chart", "archivo_datos": "drx/zn-al-ph10.xy", "intervalo_x": [5, 15], "caption": "Reflexión basal."}
```

Recorta el archivo al leerlo (en `crear_presentacion`, `agregar_bloque`, `editar_bloque`…). La técnica se detecta con el archivo completo, antes de recortar, y la procedencia lo declara: `fuente.nombre` = «zn-al-ph10.xy (x 5–15)». Por eso, si después se arrastra al editor el archivo completo con su nombre, esta gráfica no se reemplaza por los datos sin recortar.

## Pruebas

`tests/mcp-graficas.test.mjs`, con difractogramas y un espectro FTIR **sintéticos** (lorentzianas con el centro en un punto de la rejilla, para conocer la respuesta exacta): posiciones de pico exactas, intensidades del archivo, normalización por máximo y por área, desplazamiento sin cruces, rejillas distintas sin interpolar, procedencia y huellas, errores, Beamer y la regla de revisión. Los rótulos en pantalla, en pgfplots y en `saneaDeck`, en `tests/graficas.test.mjs`.
