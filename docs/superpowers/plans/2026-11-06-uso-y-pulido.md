# Uso y pulido de Tabula — plan y registro histórico

> Este documento conserva el plan de uso y pulido elaborado el 6 de noviembre de 2026. Su base, resultados de pruebas y fases registradas como realizadas son antecedentes históricos, no validación del código actual. Las decisiones de producto enumeradas como pendientes no se consideran aprobadas por este documento. Antes de retomar una tarea, contrástala con el código y las reglas actuales de [AGENTS.md](../../../AGENTS.md). Las comprobaciones se realizan localmente cuando el entorno lo permite y se declara lo que quede sin verificar. Esta edición documental no ejecuta tareas ni pruebas ni confirma de nuevo los commits citados.

**Objetivo original:** que una persona que prepara una charla científica encuentre las herramientas que ya existen, que los ejemplos den buen ejemplo y que lo que se muestra en pantalla no se tape ni confunda. No se añaden funciones grandes: se corrige, se reordena y se completa.

**Base histórica del plan:** commit `b3eb895` de la rama de trabajo de entonces. El plan registró la suite de pruebas completa en verde (563/563 con Chromium) y `npm run accesibilidad` sin violaciones serias. Los hallazgos originales se registraron en Chromium el 2026-11-06 con `?plantilla=calibracion`, a 1440×900 y 390×844. Estos resultados no describen el estado actual de main.

## Decisiones de producto pendientes en el registro

- 2.1: reorganización de la cinta, incluida la propuesta de pestaña «Preparar».
- 2.3: ubicación y presentación del enlace AGPLv3, manteniéndolo visible.
- 4.1: miniaturas reales de los ejemplos frente al estilo existente.
- Texto de autoría de los ejemplos.

No se aprueba ni implementa ninguna de estas decisiones al corregir este documento. Su vigencia debe contrastarse con las decisiones y el código posteriores antes de retomarlas.

## Trabajos registrados como realizados

Los siguientes estados y commits se conservan del plan anterior; no se han verificado de nuevo ni constituyen una lista de comprobaciones ejecutadas en esta edición.

- **Fase 0 — registrada como hecha** (`fde317f`). Se registraron 2 avisos altos de `image-size` dentro de pptxgenjs, con el riesgo documentado como aceptado y pendiente de confirmación. Consulta el antecedente histórico en [desarrollo](../../desarrollo.md); no se afirma el estado actual de las dependencias.
- **Fase 1 — registrada como hecha** (`fd38397`, `abf9d59`, `f0810df`). Se informó que los 12 ejemplos de aquella fase pasaban la revisión sin avisos, que los avisos no tapaban los controles inferiores y que la revisión seleccionaba el bloque señalado. El recuento de 12 pertenece a esa comprobación, anterior al ejemplo adicional de la fase 3.1.
- **Fase 2.2 — registrada como hecha** (`bc962ca`). Análisis de la serie desde el botón σ de la barra contextual de una gráfica, y como acción del asistente.
- **Otros trabajos registrados como hechos, bajo el rótulo original «Hecho sin decisión»:**
  - 3.1, ejemplo de caracterización con datos sintéticos (`f19e508`): el registro pasa a 13 ejemplos en total. Esto no revalida retrospectivamente los 13 ejemplos con el resultado de la fase 1.
  - 3.2 a 3.4, sensibilidad del tramo de Tauc, anchura instrumental en Scherrer y sugerencias de calidad sobre análisis (`3e16bcd`).
  - 4.2, guía de primer uso al abrir un ejemplo (`6b1dfe7`).
- El plan anterior no enumeraba otras tareas pendientes sin decisión. Esto describe su registro, no una garantía de que el producto actual carezca de trabajo pendiente.

## Reglas vigentes si se retoma una tarea

- Leer antes [AGENTS.md](../../../AGENTS.md), [desarrollo](../../desarrollo.md) y `src/js/_orden.txt`. Las reglas locales actuales prevalecen sobre las instrucciones históricas de las fases siguientes. No se exige una herramienta de agente concreta, CI ni revisión de código garantizada.
- Todos los módulos de `src/js/` comparten un ámbito: antes de crear una función o constante global, buscar que el nombre no exista (`grep -rn "function nombre\|const nombre" src/js`).
- Conservar JSON v1: solo campos nuevos opcionales, saneados en `saneaBloque` (`src/js/21-robustez.js`).
- Ejemplos con datos marcados como ilustrativos; ninguna cita ni resultado inventado.
- Mantener cambios acotados y commits en inglés con Conventional Commits. Seguir AGENTS.md para ramas, PR y atribución; no interpretar este plan como autorización para publicar, fusionar o escribir en main.
- Cuando el entorno lo permita, ejecutar `npm run build` y las pruebas afectadas; usar la suite completa y accesibilidad cuando sea posible. Si se necesita indicar Chromium, configurar `ERLEN_CHROMIUM` con la ruta real del entorno, por ejemplo `ERLEN_CHROMIUM=/ruta/al/ejecutable npm test` y `ERLEN_CHROMIUM=/ruta/al/ejecutable npm run accesibilidad`. No se presupone una ruta fija, duración de ejecución ni lanzamiento en segundo plano.
- Registrar comandos realmente ejecutados, entorno, resultados, omisiones y motivos. Una prueba omitida no cuenta como aprobada; los criterios originales de aceptación no prueban que se cumplieran ni autorizan afirmar resultados nuevos.
- Para cambios visuales, inspeccionar cuando sea posible Chromium de escritorio (1440×900), ventana estrecha (390×844) y modo oscuro, con capturas en `.local/` (ignorado por git). La ventana estrecha es emulación, no una prueba en un teléfono real. JSDOM no cuenta como validación visual. Si no se dispone del entorno, declarar el alcance pendiente.
- Si un paso exige una decisión de producto (marcada **Decide Jorge**), dejarlo propuesto y preguntar; no improvisar.

## Fases originales — antecedentes, no órdenes de ejecución

Las fases siguientes conservan las propuestas, hallazgos y criterios originales. Su redacción describe el momento del plan, no el producto actual. Antes de ejecutar cualquier paso, consulta los estados anteriores y el código actual para no repetir cambios ya incorporados.

### Fase 0 — Seguridad de dependencias (prioridad original)

**0.1 Hallazgos históricos de `npm audit`.** El planteamiento inicial registraba 4 avisos: DOMPurify ≤ 3.4.16 dentro de `mermaid` (crítica; Mermaid dibuja texto escrito por la persona y el HTML se comparte), `image-size` dentro de `pptxgenjs` (alta), `source-map-js` (alta) y una más sin identificar en el texto original. El resumen de trabajos realizados registró después 2 avisos altos restantes. No se ha repetido la auditoría en esta edición; ninguno de esos recuentos certifica las dependencias actuales.
- Propuesta original: probar `npm audit fix` **sin** `--force`. Si `package-lock.json` cambia, revisar el diff: solo subidas de parche/menor de dependencias transitivas.
- Se registró que `image-size` pedía `--force` (cambio mayor dentro de pptxgenjs): no forzar. La propuesta era valorar un `overrides` en `package.json` solo si pptxgenjs seguía funcionando; si no, documentar el riesgo aceptado. La nota original acotaba la exposición a imágenes insertadas por la persona; esa evaluación histórica debe contrastarse con las dependencias y rutas de ejecución actuales, no asumirse como garantía.
- Criterio original de aceptación: `npm audit` sin críticas; build, `tests/exportaciones.test.mjs`, pruebas de Mermaid/PowerPoint y suite completa en verde. Comprobar en `libre/manifest.json` que las versiones y SHA-256 copiados se regeneran.

### Fase 1 — Problemas observados en la base histórica

**1.1 Los ejemplos fallaban su propia revisión.** El ejemplo «Calibración UV–Vis» abría con «1 problema»: en la diapositiva 4 «El contenido no cabe (6 px de más)», y avisos de portada sin autores, figura sin pie y gráfica sin procedencia. Un ejemplo debe enseñar el resultado limpio.
- Propuesta original: escribir primero una prueba (p. ej. `tests/ejemplos-revision.test.mjs`) que abra cada uno de los 12 ejemplos de entonces y ejecute la misma revisión que el botón de la barra inferior (localizar la función en `src/js/31-revision.js`). Exigir 0 errores («que arreglar»). Los avisos («que mejorar») se pueden tolerar solo si son intencionales y están listados en la prueba con su motivo.
- Corregir en `src/js/87-ejemplos.js`: tamaños o acomodo en lo que no cabe, pies de figura, procedencia («Figura viva») indicando que los datos son ilustrativos, y en la portada un autor genérico tipo «Autoría del ejemplo». Esta propuesta no resuelve la decisión pendiente sobre el texto de autoría.
- La geometría «no cabe» solo es real en navegador: la prueba debe correr en Chromium (patrón de `tests/mejoras-browser.test.mjs`, saltando si no hay `ERLEN_CHROMIUM`). Si se omite, declararlo como tal, no como aprobación.
- Regenerar con `npm run examples` y revisar el diff de `examples/` cuando se retome un cambio de ejemplos y el entorno lo permita.

**1.2 Los avisos (toast) tapaban controles.** En la observación original de escritorio, el toast «Ejemplo didáctico…» tapaba la barra inferior («Lienzo libre» quedaba cortado). En la ventana estrecha tapaba los controles de zoom y el indicador de problemas.
- Propuesta original: localizar el contenedor `#toasts` en `src/css/` y colocarlo por encima de la barra inferior (en ventana estrecha, encima de la barra «Presentar» y del zoom), sin cubrir el lienzo.
- Criterio original de aceptación: capturas en escritorio y ventana estrecha con el toast visible donde ningún control interactivo quede debajo (comprobarlo también con `document.elementFromPoint` en el centro de cada botón de la barra inferior).

**1.3 La revisión: ir al problema con un clic.** En el diálogo «Revisión» cada aviso muestra el número de diapositiva. La propuesta original era verificar si el número llevaba a la diapositiva; si no, hacer que cada aviso fuera un botón que cerrara el diálogo, fuera a la diapositiva y seleccionara el bloque (`b.id` ya viajaba en los avisos de `84-calidad.js`). Prueba en JSDOM del salto y de la selección.

### Fase 2 — Encontrar lo que ya existe

El diagnóstico original describía muchas herramientas repartidas sin un criterio claro. Cinta observada entonces (escritorio):
- **Inicio** (15) mezclaba deshacer y gestión de diapositivas con herramientas de preparación de la charla: Argumento, Cuéntamelo, Línea de tiempo, Memoria, Tutor.
- **Diapositiva** (23) mezclaba lienzo libre y capas con preparación: Preguntas, De respaldo, Lo aprendido, Ramas, Carga, Mirada.
- **Presentar** (11) juntaba ensayo y revisión.

**2.1 Propuesta de reorganización (Decide Jorge antes de implementar).** Escribir en `docs/superpowers/specs/2026-11-06-cinta-design.md` una tabla «botón → pestaña actual → pestaña propuesta → motivo» con un criterio por pestaña:
- Inicio: editar (deshacer, portapapeles, diapositivas, buscar).
- Insertar: igual.
- Diseño: igual.
- Diapositiva: solo la diapositiva y su lienzo.
- **Preparar** (nueva o renombrando una existente): argumento, cuéntamelo, línea de tiempo, memoria, tutor, preguntas, respaldo, lo aprendido, ramas, carga, mirada, notas y tiempo.
- Presentar: presentar, ensayar y comprobar.

Incluir capturas antes/después cuando el entorno lo permita. Implementar solo tras aprobación, en `src/js/56-cinta.js`. Actualizar `tests/cinta.test.mjs`, `docs/interfaz.md` y `docs/uso.md`, y mantener cada acción en «Ir a / hacer» (`src/js/51-asistente.js`) para que la búsqueda siga encontrándola.

**2.2 Análisis de la serie visible desde la gráfica.** Antes del cambio registrado como hecho, el plan describía acceso solo por Propiedades → «σ Analizar la serie…». Los pasos originales eran:
- Añadirlo a la barra contextual de las gráficas (`src/js/05b-barra-contextual.js`), con el modo según la técnica (DRX → pico, UV-Vis → Tauc, como ya hacía `modoInicialAnalisis`).
- Añadirlo como acción en `51-asistente.js` («analizar serie», «tauc», «scherrer», «banda prohibida», «tamaño de cristalita»).
- Tras importar datos de instrumento (`avisaInstrumento` en `41-instrumento.js`), el toast ya ofrecía «No es eso». Valorar un segundo botón «Analizar» si `toast` admitía dos acciones; si no, no tocar `toast`.
- Pruebas en Chromium: el botón aparece al seleccionar una gráfica y abre el modo correcto.

**2.3 Cabecera.** El diagnóstico original describía el botón «AGPLV3» con el mismo peso visual que «Presentar». La interfaz debe conservar un enlace visible al código fuente (`README.md`, licencia). **Decide Jorge** entre dejarlo como enlace de texto pequeño o moverlo junto a «?» manteniéndolo visible. No quitarlo.

### Fase 3 — Caracterización de sólidos

**3.1 Ejemplo nuevo «Caracterización de un sólido» (propuesta original, registrada después como hecha).** DRX con Scherrer y UV-Vis de reflectancia con Tauc, seis diapositivas como los demás, con datos sintéticos generados por fórmula y declarados ilustrativos (reutilizar el modelo de `tests/caracterizacion.test.mjs`: borde directo y reflectancia por Kubelka–Munk inversa; pico gaussiano). Sin bibliografía inventada: si se cita el método, que sea una referencia que exista y se haya comprobado, o ninguna. La incorporación llevaba el total a 13 ejemplos: actualizar `README.md`, `examples/README.md`, `docs/README.en.md` y las pruebas que cuenten ejemplos. El criterio original era pasar la prueba de 1.1; no se afirma aquí que se haya ejecutado de nuevo.

**3.2 Tauc: sensibilidad al tramo (propuesta original, registrada después como hecha).** El ± ya avisaba de que no incluía la elección del tramo. Añadir una fila «Eg con tramos vecinos: min–max» que recalcule desplazando la ventana ±1 paso de puntos (o ±10 % de su anchura) y muestre el intervalo. El objetivo era hacer visible la sensibilidad al intervalo elegido. Pruebas con datos sintéticos de curvatura conocida.

**3.3 Scherrer: anchura instrumental opcional (propuesta original, registrada después como hecha).** Campo «β instrumental (°)» opcional. Si se da, usar β² = β_obs² − β_inst² (perfil gaussiano) e indicarlo en pantalla; si β_inst ≥ β_obs, avisar en lugar de calcular. Guardarlo en `analisisOpc` (saneado). Mantener el aviso de límite inferior cuando no se da.

**3.4 Revisión científica de gráficas analizadas (propuesta original, registrada después como hecha).** Si una gráfica tiene `analisisOpc` con Tauc y el título contiene una Eg, que «Calidad científica» recuerde indicar transición directa/indirecta y tramo. Solo como sugerencia, nunca como error.

### Fase 4 — Inicio y primera experiencia

**4.1 Miniaturas reales de los ejemplos.** El diagnóstico original describía tarjetas del inicio con una fórmula decorativa, no la diapositiva. Valorar usar la miniatura real de la portada o de la diapositiva más representativa (ya existía el render de miniaturas de la tira). Medir el coste de carga; si es alto, generarlas en el build. **Decide Jorge** si se mantiene el estilo existente.

**4.2 Primer uso guiado mínimo (propuesta original, registrada después como hecha).** Al abrir un ejemplo aparecía un toast que se iba solo. La propuesta era sustituirlo por una franja descartable con tres enlaces: «Cambiar datos», «Ver revisión» y «Presentar». Recordar la decisión de cerrarla en `localStorage`, con try/catch.

## Secuencia y tamaños estimados del plan original

Esta tabla conserva el orden y las estimaciones originales, no una instrucción para repetir fases ni un compromiso de duración. Consulta los trabajos registrados y las decisiones pendientes antes de retomar tareas.

| Fase | Tareas | Tamaño | Depende de |
|---|---|---|---|
| 0 | 0.1 | pequeño | — |
| 1 | 1.1, 1.2, 1.3 | medio | — |
| 2 | 2.2; 2.1 y 2.3 tras decisión | medio–grande | aprobación |
| 3 | 3.2, 3.3, 3.4; 3.1 al final | medio | 1.1 |
| 4 | 4.1, 4.2 | medio | decisión 4.1 |

## Fuera de este plan

Coedición, cuentas, nube, cambios de formato JSON incompatibles, la app de escritorio Tauri y cambios en `.github/`. No se presupone que existan workflows ni se propone incorporar CI.
