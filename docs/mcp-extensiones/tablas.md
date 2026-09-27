# Extensión: tablas desde archivos

Pone en una diapositiva la tabla de un CSV, TSV o TXT de la carpeta de trabajo sin copiar cifras a mano. Hay dos entradas con la misma lectura:

- La propiedad `archivo_tabla` en un bloque `table`, en cualquier herramienta que reciba bloques (`crear_presentacion`, `agregar_diapositivas`, `agregar_bloque`, `editar_bloque`):

  ```json
  {"tipo": "table", "archivo_tabla": "sintesis/serie-zn-al.csv", "combinar_error": true, "cifras": {"6": 3}}
  ```

- La herramienta `tabla_desde_archivo`, que crea la diapositiva (o varias) con la tabla, su título y su pie, y con `partir: true` reparte una tabla larga.

## Lectura

- Separador y coma decimal con las mismas reglas que las gráficas (`parseTable`): tabulador, `;`, `,` o espacios; la coma decimal se reconoce por la forma de las celdas, como la exporta Excel en español. Las comillas de CSV se respetan (`"ZA, pH 8"` es una celda) y la celda vacía de la esquina se conserva.
- El encabezado se detecta (la primera fila es texto y hay cifras debajo); `encabezado: true/false` lo fuerza.
- Las celdas de texto (`n.d.`, `<0,01`, `lavada`) quedan como texto. Un número del archivo se muestra tal cual salvo lo que se pida:
  - la marca decimal, con `separador_decimal` (`"."` o `","`; por omisión, la del archivo);
  - el exponente de un equipo (`1,2e-5`) se escribe $1{,}2\times10^{-5}$, con los mismos dígitos.
- Con coma decimal, `1.500` se lee como mil quinientos (igual que en las gráficas) y se avisa; una celda con punto que no es de miles (`1.5`) se deja como texto y se avisa.

## Redondeo

- `cifras`: cifras significativas; `decimales`: decimales. Un número vale para todas las columnas numéricas; un objeto, por columna (`{"3": 2, "pH": 1}`, con el número de columna del archivo desde 1 o el encabezado exacto), y manda sobre el número general. Una misma columna no puede llevar las dos cosas.
- Se redondea sobre los dígitos escritos, no sobre el número binario: `1.005` a dos decimales es `1.01`. La mitad sube en valor absoluto (`-0.125` → `-0.13`), como en Excel y Origin, para que la tabla coincida con la hoja de cálculo.
- **Nunca se añaden ceros** que el archivo no trae: `2.5` a tres cifras sigue siendo `2.5`, y se avisa.
- Si el redondeo deja ceros que no son cifras, se pasa a notación científica: `12345` a dos cifras es $1.2\times10^{4}$, no `12000`.
- Un valor que queda en cero (`0.004` a dos decimales → `0.00`) se avisa.

## Valor ± incertidumbre

`combinar_error: true` une cada columna con la columna de error que tiene a su derecha en el archivo. Una columna de error lleva en el encabezado `±`, `sd`, `sem`, `error`, `desv`, `incertidumbre`… (la misma lista, `esColumnaError`, que usan las gráficas para las barras de error). También puede ser una lista con las columnas de valor que se quieren combinar.

Convención (la GUM, §7.2.6, pide dar la incertidumbre con dos cifras significativas como mucho; esta es la práctica habitual dentro de ese margen):

1. La incertidumbre se redondea a **una cifra significativa, o dos si la primera es un 1** (0,14 a una cifra sería 0,1, casi un 30 % menos). `cifras_error: 1` o `2` lo fuerza.
2. El valor se redondea **en la misma posición decimal** que la última cifra de la incertidumbre.

| Archivo | Tabla |
|---|---|
| 7.5612 y 0.0213 | 7.56 ± 0.02 |
| 7.6049 y 0.0151 | 7.605 ± 0.015 |
| 1234 y 56 | 1230 ± 60 |
| 1.23e-5 y 4.4e-7 | $(1.23 \pm 0.04)\times10^{-5}$ |

Si el valor tiene menos decimales que su incertidumbre redondeada, se deja como está y se avisa. Una incertidumbre vacía, negativa o de texto no se combina: la celda muestra el valor solo y se avisa. Si el encabezado del valor no dice la unidad y el del error sí, el combinado la toma.

## Columnas, filas y unidades

- `columnas`: cuáles y en qué orden (`[1, 4, "pH"]`).
- `filas`: `[primera, última]` de los datos, desde 1 y sin contar el encabezado.
- `unidades`: `{"4": "Å"}` añade «(Å)» al encabezado. La unidad que ya trae un encabezado (`d (Å)`, `T [°C]`, `E / V`) se reconoce y sale en la respuesta; pedir otra distinta es un error, porque cambiar la etiqueta no convierte los datos. Se avisa de las columnas numéricas sin unidad (las adimensionales, como una relación molar o el pH, están bien así).

## Tamaño y reparto

La respuesta estima si la tabla cabe: en `content` a 16:9 caben unas 9 filas de datos bajo el encabezado (8 con pie) y unos 78 caracteres por fila (57 a 4:3), medido en Chromium con el tema por omisión. Si no cabe, se avisa.

Con `tabla_desde_archivo` y `partir: true`, las filas se reparten en diapositivas de tamaño parecido (20 filas: 7, 7 y 6), cada una con el encabezado repetido y «(cont.)» en el título. `filas_por_diapositiva` fija el reparto. Las diapositivas entran todas de una vez y un solo `deshacer` las quita. Partir no estrecha una tabla ancha: para eso, `columnas`, `combinar_error` o menos `cifras`.

Es una estimación: mira el resultado con `vista_previa`.

## Procedencia

Un bloque `table` no tiene campo de procedencia en la app. El archivo y la lectura salen en la respuesta (`datos_importados` para el bloque, `tabla` en la herramienta): separador, marca decimal, filas y columnas del archivo y mostradas, cuántos valores numéricos quedaron igual, cuántos se redondearon, cuántos solo cambiaron de formato, y ejemplos de lo que cambió. `pie_con_fuente: true` añade «Datos: archivo.csv.» al pie; úsalo solo si el usuario lo pide.

## Límites

- Hasta 5 MB por archivo, en texto (UTF-8). Una hoja de Excel se guarda antes como CSV.
- Un campo entre comillas no puede ocupar varias líneas.
- Como en las gráficas, en un archivo separado por tabuladores o `;` una celda `1,500` se lee con coma decimal (1,5), no como los miles en inglés. Revisa `lectura.decimal` en la respuesta.
- En `agregar_bloque` la estimación de tamaño supone una zona de ancho completo a 16:9; en una columna o a 4:3 cabe menos.
- Los porcentajes (`45 %`) y los intervalos escritos en una celda (`3,4 ± 0,2`) se tratan como texto: no se redondean.
- `columnas` de un bloque `chart` con `archivo_datos` es otra cosa (x y series); aquí solo cuenta junto a `archivo_tabla`.

## Archivos

`mcp/extensiones/tablas.mjs` lee el archivo (en la carpeta de trabajo, como las imágenes y los datos) y decide dónde va la tabla; `tablas.pagina.js` la interpreta y redondea dentro de la app. Pruebas: `tests/mcp-tablas.test.mjs`.
