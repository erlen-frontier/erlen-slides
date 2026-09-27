# Extensión: diseñador

Las **Ideas de diseño** del editor (`src/js/55-disenador.js`) como herramientas. Las propuestas se calculan con la misma función que usa el panel, `propuestasDiapositiva`, así que el modelo ve lo mismo que vería quien abre Diseño → Ideas.

## `sugerir_disenos {archivo, diapositiva, imagen?}`

Lee lo que contiene la diapositiva y propone acomodos completos:

| Si la diapositiva tiene… | Propuestas (`id`) |
|---|---|
| Mucho texto y nada más | `flujo` (texto fluido en 2 o 3 columnas), `dos-columnas`, `dos-diapositivas` (la segunda mitad a una diapositiva nueva con el mismo título) |
| Una figura, tabla o gráfica con su texto | `figura-texto` (dos columnas), `pie-ancho` (diseño «piefigura») |
| Dos a cuatro figuras | `lado-a-lado`, `zigzag`, `tres`, `cuadricula` |
| Una lista corta (3–6 puntos, o un punto con 2–6 subpuntos) | `smart-proceso`, `smart-lista`, `smart-cronologia`, `smart-ciclo`, `smart-jerarquia`, `smart-radial`, `smart-contraste` |
| Una sola cifra con su rótulo | `dato` |
| Una cita (bloque de cita, o texto entre comillas con «— autor») | `cita` |
| Una ecuación, una reacción o una estructura, con poco texto | `enfasis` (al centro, la ecuación más grande) |
| Una imagen | además, las del análisis de figura: `protagonista`, `lado-izq`/`lado-der`, `papel`, `galeria` (si hay varias) |

La respuesta trae `lectura` (qué ve en la diapositiva) y, por propuesta: `id`, `nombre`, `razon` (una frase en español), `origen` (`contenido` o `figura`), `diseno` resultante, `zonas` (id y tipo de cada bloque por zona; en un SmartArt, su clase y cuántos elementos), `encabezados` si los hay y `nueva_diapositiva` si la propuesta crea una.

Con Chromium, además una imagen PNG: un mosaico con la diapositiva **Actual** (marco oscuro) y cada propuesta rotulada con su número e id, pintado con la misma versión imprimible que `vista_previa`. Sin Chromium, o con `imagen: false`, solo el texto; el campo `imagen` dice por qué falta.

Reglas que siguen todas las propuestas:

- **Nunca inventan contenido.** Solo reordenan o convierten lo que ya está. De una lista a SmartArt solo se quita la numeración que el diagrama ya dibuja; en una cronología el año pasa a ser el rótulo y el resto el detalle. Los encabezados que no salen del contenido (el autor de una cita sin autor, los rótulos de una cuadrícula) quedan vacíos, nunca con los de muestra del diseño.
- **Son deterministas:** la misma diapositiva da las mismas propuestas en el mismo orden.
- No proponen nada que deje la diapositiva igual, ni dos propuestas con el mismo resultado.
- El análisis de color y forma de una imagen necesita un lienzo, que JSDOM no tiene: desde el MCP salen las propuestas de figura que no dependen de él. En el editor salen todas.

## `aplicar_diseno {archivo, diapositiva, propuesta}`

Aplica una propuesta por su `id`. Se recalculan sobre el archivo tal como está: si la diapositiva cambió y la propuesta ya no existe, el error dice cuáles hay. Pasa por `modifica` (valida, guarda la versión anterior y escribe), así que entra en el historial y `deshacer` la revierte.

## Ejemplo

```text
sugerir_disenos {archivo: "tesis", diapositiva: 4}
→ 1 · smart-proceso  «Son 4 pasos en orden: como proceso con flechas, la secuencia se lee sin numerarla.»
  2 · smart-lista    «4 puntos cortos: en cajas numeradas pesan igual y se leen de un vistazo.»
aplicar_diseno {archivo: "tesis", diapositiva: 4, propuesta: "smart-proceso"}
```

Archivos: `mcp/extensiones/disenador.mjs` (herramientas y mosaico) y `mcp/extensiones/disenador.pagina.js` (operaciones `sugiereDisenos` y `aplicaDiseno`). Pruebas: `tests/mcp-disenador.test.mjs` y, para la lógica del editor, `tests/disenador.test.mjs`.
