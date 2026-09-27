# Extensión: gráficas dinámicas

Herramientas para crear y ajustar gráficas dinámicas (bloques `func`: fórmulas con deslizadores) sin dejar al asistente adivinar si la curva se podrá dibujar. Todo se comprueba con las piezas de la propia app: el catálogo es `FUNC_MODELS` (`src/js/02-data.js`), las fórmulas se leen con `exprTry` (`src/js/11-expr.js`) y las curvas se muestrean con `chartSeries` (`src/js/12-chart.js`), el mismo muestreo que la pantalla y el `.tex`.

| Herramienta | Qué hace |
|---|---|
| `listar_modelos_dinamicos` | Los modelos listos, con su fórmula, el significado y la unidad de x, y y de cada parámetro, el recorrido de los deslizadores y los supuestos (`nota`). `buscar` filtra por palabra («adsorción», «XRD», «cinética»). Solo lectura. |
| `validar_grafica_dinamica` | El diagnóstico de una gráfica, sin escribir nada: errores de sintaxis con la posición y el carácter marcado con ▸, variables sin definir, parámetros fuera de su deslizador, repetidos o con el nombre de una constante, intervalo de x, y la evaluación en [xmin, xmax] (puntos válidos, porcentaje fuera del dominio, discontinuidades, y mínima y máxima y cinco puntos de control). Acepta `bloque` (una gráfica nueva) o `archivo` + `bloque_id` (una existente). Si es válida devuelve el bloque completo, listo para `agregar_bloque`. |
| `ajustar_grafica_dinamica` | Mueve los deslizadores de un bloque existente (`valores: {"Ea": 75}` o `{"A": {"value": 1e13, "max": 1e14}}`) y, si se pide, `xmin`/`xmax`. Es el estado con que se abre la diapositiva y el que sale fijo en el PDF y en Beamer. Si la curva deja de poder dibujarse no cambia nada. Entra en el historial. |

Además, en cualquier herramienta que cree bloques (`crear_presentacion`, `agregar_diapositiva(s)`, `agregar_bloque`):

```json
{"tipo": "func", "modelo": "arrhenius", "params": {"Ea": 75}, "caption": "Valores ilustrativos."}
```

toma del modelo las fórmulas, los ejes y los deslizadores (con unidades y escala) y cambia solo lo que se pase. También se puede escribir la fórmula:

```json
{"tipo": "func", "curves": [{"expr": "C0/(1 + k*C0*x)", "name": "[A]"}],
 "params": {"C0": 1, "k": {"value": 0.3, "min": 0.01, "max": 1, "unit": "L mol$^{-1}$ min$^{-1}$"}},
 "xmin": 0, "xmax": 20, "xlabel": "Tiempo (min)", "ylabel": "$[A]$ (mol L$^{-1}$)"}
```

`params` puede ser la lista de siempre o un objeto; un parámetro sin `min`/`max` recibe un recorrido que contiene su valor (de 0 al doble). Si la gráfica tiene errores, la herramienta falla con el motivo y no se guarda nada. Las ediciones parciales con `editar_bloque` (sin `tipo` ni `modelo`) pasan tal cual, porque no se conoce el resto del bloque; para cambiar valores está `ajustar_grafica_dinamica`.

`revisar_presentacion` aplica las mismas comprobaciones a las gráficas dinámicas de la presentación (regla `grafica-dinamica` en `adicional`), también a las editadas a mano o creadas antes de esta extensión.

El prompt `explicar_con_grafica_dinamica` guía al asistente para añadir una diapositiva que enseñe cómo un parámetro cambia una curva.

## Campos nuevos del bloque

Todos opcionales y compatibles con el formato JSON v1: un proyecto antiguo se abre igual.

| Campo | Dónde | Qué hace |
|---|---|---|
| `unit` | parámetro | Unidad, en el TeX ligero de los rótulos (`kJ mol$^{-1}$`); se ve junto al deslizador y en el comentario del `.tex`. |
| `d` | parámetro | Qué es; es la etiqueta accesible del deslizador. |
| `log` | parámetro | Deslizador por décadas (necesita `min > 0`). |
| `tex` | parámetro | Cómo se escribe el símbolo (`\Delta H^\circ`); sin él, `Ea` sale `Ea`, `x0` sale x₀ y `theta` o `lam`, en griego. |
| `logX`, `logY` | bloque | Ejes logarítmicos, como en la gráfica de datos. |

## Límites

- Los modelos y sus valores iniciales son ilustrativos y no sustituyen a un ajuste de datos; cada `nota` dice los supuestos (p. ej. ΔH° constante en Van 't Hoff, el ensanchamiento instrumental ya restado en Scherrer).
- La comprobación es numérica: detecta dónde la curva no da un número y dónde salta, no si el modelo es el adecuado para los datos.
- El `.tex` generado usa pgfplots con `unbounded coords=jump` para los cortes; en este repositorio se inspecciona el código, no se compila.
