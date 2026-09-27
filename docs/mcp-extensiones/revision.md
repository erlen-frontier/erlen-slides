# Extensión: revisión de rigor

Reglas que miran lo que un comité señala y la revisión de la app no mira: unidades, cifras, notación, siglas, notas del orador y referencias a figuras. Salen en `adicional` de `revisar_presentacion`; `revisar_convenciones` las pasa solas, sin dibujar las diapositivas (unos 200 ms para 40 diapositivas, frente a varios segundos de la revisión completa), para iterar mientras se escribe.

Cada hallazgo lleva `regla` (nombre estable), `categoria`, `grado` (`aviso` o `sugerencia`), `diapositiva` (desde 1), `problema`, `arreglo` y, cuando se sabe, `bloque`.

```json
{"regla": "unidades-simbolos", "categoria": "unidades", "grado": "aviso", "diapositiva": 2, "bloque": "b3k9",
 "problema": "«hrs» no es un símbolo: «24 hrs»", "arreglo": "La hora es «h», sin punto ni plural: «24 h»."}
```

## `revisar_convenciones`

| Argumento | |
|---|---|
| `archivo` | Proyecto de la carpeta de trabajo. |
| `categorias` | Opcional: solo `unidades`, `cifras`, `notacion`, `acronimos`, `orador` o `figuras`. |

Devuelve `hallazgos`, `por_categoria`, `reglas` (los nombres) y `ms`.

## Reglas

Criterio común: callar ante la duda. Cada regla avisa solo de lo que es un error casi seguro y deja pasar lo que tiene una lectura legítima; lo que ya revisa la app (ejes, pies, procedencia, escalas logarítmicas, títulos, texto de más, accesibilidad) no se repite. El texto que se mira es el que ve el público: título, subtítulo, texto, viñetas, pies, celdas y ejes; nunca las matemáticas entre `$…$`, los bloques `math`, `chem`, `code` ni `refs`, las citas `[@clave]` ni los enlaces y DOI.

| Regla | Avisa | No avisa |
|---|---|---|
| `unidades-simbolos` | Formas que no son el símbolo del SI tras un número: «24 hrs», «30 seg», «15 mins», «2 gr», «5 Kg», «50 ml» (se recomienda «mL»), «2 lts», «5 um», «10 cc», «7.6 angstrom», «65 grados C», «300 °K», «25 ºC» (ordinal en vez de grado), «25 ° C». | Las mismas palabras sin número delante («las hrs de laboratorio», «el segundo lavado»). |
| `unidades-espacio` | Número pegado a la unidad («500°C», «10mL»), solo si el proyecto apagó la notación automática (`meta.notacion: false`); con ella activa la app pone el espacio fino al dibujar. | %, el grado de ángulo («45°»), orbitales («1s») y politipos («2M1»). |
| `unidades-mezcla` | La misma magnitud con dos unidades: temperaturas de proceso en °C y en K (K desde 373), espaciados de red en nm y en Å, la misma variable (`d =`, `Ea =`) con dos unidades de su dimensión, o dos ejes de temperatura en °C y en K. | K criogénico o ambiente (por debajo de 373 K, también en «T = 77 K»), rampas en K/min, tamaños de partícula en nm junto a espaciados en Å. |
| `cifras-excesivas` | Seis cifras significativas o más con tres decimales o más: «d = 7.60412 Å». | Con incertidumbre («7.60412(3) Å», «± 0.00002»), longitudes de onda de rayos X (λ, Kα), enteros, DOI. |
| `cifras-columna` | Una columna numérica de tabla con decimales que difieren en dos o más: «7.6 · 7.612 · 8». | «0.1 · 1 · 10» (razones exactas), diferencias de un decimal. |
| `cifras-separador` | Punto y coma decimal en la misma charla («0.5 M» y «2,5»), una vez, en la primera diapositiva de la forma minoritaria. | Localizadores IUPAC («1,2-etanodiol»), pares «(1,2)», listas, millares ambiguos («1,000», «12.500»), números de apartado «2.1 Síntesis». |
| `notacion-formulas` | Fórmulas sin subíndices («Zn(OH)2») cuando la notación automática está apagada; sugiere `$\mathrm{Zn(OH)_2}$` o un bloque `chem`. Usa el detector de la app (`esFormula`, 39-notacion.js). | «DRX», «R2», «ZnO»; nada si la notación automática está activa, porque la app ya dibuja Zn(OH)₂. |
| `notacion-sinonimos` | Dos nombres para la misma técnica o material: DRX/XRD, MEB/SEM, MET/TEM, ATG/TGA, CDB/DSC, ATD/DTA, HDL/LDH, RMN/NMR, EDS/EDX, FTIR/FT-IR/IRTF, AFM/MFA y las variantes de UV-Vis. | Siglas dentro de otra («PXRD» no es «XRD»). |
| `acronimos-sin-definir` | Siglas que se usan antes de desarrollarse («nombre (SIGLA)», «SIGLA (nombre)» o «SIGLA: nombre») o que no se desarrollan nunca; una vez por sigla, en su primera aparición. | Las de `meta.glosas` (término o alias), una lista corta de universales (SI, UV, IR, ADN, PDF, CSV, DOI…), números romanos («Fe(III)»), fórmulas y combinaciones de elementos («CO2», «NO», «COF»), las especies de las ecuaciones y reacciones («HA»), palabras en mayúsculas («MUY», «HOLA»), los ejes y los usos en la portada (sus siglas suelen ser de afiliaciones; una sigla desarrollada en el título de la charla sí cuenta como definida). |
| `orador-sin-notas` | Diapositivas de contenido sin notas cuando otras sí las tienen (un solo hallazgo con la lista); si ninguna tiene, un aviso para toda la charla desde cinco diapositivas de contenido. | Portada, secciones y diapositivas sin bloques. |
| `orador-sin-minutos` | Diapositivas sin minutos cuando al menos el 60 % los tiene, con la media de las demás; complementa `tiempo.sin_tiempo`. | Si casi ninguna tiene minutos (la revisión común ya lo dice). |
| `orador-notas-largas` | Notas que, leídas a unas 130 palabras por minuto, no caben en los minutos de la diapositiva (25 % de margen, desde 50 palabras). | Diapositivas sin minutos. |
| `figuras-referencias` | «Figura N» o «Tabla N» que no existe: si los pies van numerados («Figura 2. …»), la comparación es con esa numeración, y avisa también de números repetidos o fuera de orden; si no, con el número de figuras o tablas de la charla. | «Figura 3 de Pérez», «Figura 2 en [@clave]» (figuras de otros trabajos) y el rótulo del propio pie. |

Una regla que falla no tumba la revisión: se anota como hallazgo con «La regla falló» y las demás siguen.

## Archivos

- `mcp/extensiones/revision.pagina.js`: las reglas, registradas con `ERLEN_MCP.registraRevision`, y la operación `revisionConvenciones`. Reutiliza `zonasDe`, `textosCitables`, `esFormula`, `SIMBOLOS` y `TIPOS_FIGURA` de la app.
- `mcp/extensiones/revision.mjs`: la herramienta `revisar_convenciones` y la convención `revision` de `guia_formato`, para que el asistente escriba bien desde el principio.
- `tests/mcp-revision.test.mjs`: un caso que avisa y otro que no para cada regla, la integración con `revisar_presentacion`, los doce ejemplos (su único hallazgo, real, es `orador-sin-notas`) y una charla de 40 diapositivas.
