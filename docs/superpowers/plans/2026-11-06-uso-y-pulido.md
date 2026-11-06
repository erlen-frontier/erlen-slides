# Uso y pulido de Tabula — plan

**Objetivo:** que una persona que prepara una charla científica encuentre las herramientas que ya existen, que los ejemplos den buen ejemplo y que lo que se muestra en pantalla no se tape ni confunda. No se añaden funciones grandes: se corrige, se reordena y se completa.

**Base:** rama de trabajo actual, commit `b3eb895`. Suite completa en verde (563/563 con Chromium) y `npm run accesibilidad` sin violaciones serias. Los hallazgos de abajo se comprobaron en Chromium el 2026-11-06 con `?plantilla=calibracion`, a 1440×900 y 390×844.

## Estado

- **Fase 0 — hecha** (`fde317f`). Quedan 2 altas de `image-size` dentro de pptxgenjs: riesgo aceptado y documentado en `docs/desarrollo.md`, pendiente de confirmación.
- **Fase 1 — hecha** (`fd38397`, `abf9d59`, `f0810df`). Los 12 ejemplos pasan la revisión sin avisos; los avisos no tapan los controles inferiores; la revisión selecciona el bloque que señala.
- **Fase 2.2 — hecha** (`bc962ca`). Análisis de la serie desde el botón σ de la barra contextual de una gráfica, y como acción del asistente.
- **Pendiente de decisión:** 2.1 (cinta), 2.3 (botón AGPLv3), 4.1 (miniaturas del inicio) y el texto de autor de los ejemplos.
- **Pendiente sin decisión:** fase 3 (caracterización) y 4.2 (guía de primer uso).

## Reglas para quien ejecute el plan

- Leer antes `AGENTS.md`, `docs/desarrollo.md` y `src/js/_orden.txt`. Todos los módulos de `src/js/` comparten un ámbito: antes de crear una función o constante global, buscar que el nombre no exista (`grep -rn "function nombre\|const nombre" src/js`).
- Conservar JSON v1: solo campos nuevos opcionales, saneados en `saneaBloque` (`src/js/21-robustez.js`).
- Ejemplos con datos marcados como ilustrativos; ninguna cita ni resultado inventado.
- Una tarea = un commit en inglés con Conventional Commits. Sin nombre de modelo en el mensaje. No abrir PR salvo petición.
- Tras cada tarea: `npm run build` y las pruebas afectadas. Al cerrar cada fase: suite completa con `ERLEN_CHROMIUM=/opt/pw-browsers/chromium npm test` (unos 13 min; lanzarla en segundo plano) y `ERLEN_CHROMIUM=/opt/pw-browsers/chromium npm run accesibilidad`.
- Cambios visuales: capturas en Chromium de escritorio (1440×900), teléfono (390×844) y modo oscuro, guardadas en `.local/` (ignorado por git) y revisadas a ojo. JSDOM no cuenta como validación visual.
- Si un paso exige una decisión de producto (marcada **Decide Jorge**), dejarlo propuesto y preguntar; no improvisar.

## Fase 0 — Seguridad de dependencias (primero)

**0.1 Vulnerabilidades de `npm audit`.** Hay 4: DOMPurify ≤ 3.4.16 dentro de `mermaid` (crítica; Mermaid dibuja texto escrito por la persona y el HTML se comparte, así que importa), `image-size` dentro de `pptxgenjs` (alta), `source-map-js` (alta) y una más.
- Probar `npm audit fix` **sin** `--force`. Si `package-lock.json` cambia, revisar el diff: solo subidas de parche/menor de dependencias transitivas.
- `image-size` pide `--force` (cambio mayor dentro de pptxgenjs): no forzar. Valorar un `overrides` en `package.json` solo si pptxgenjs sigue funcionando; si no, documentarlo como riesgo aceptado (solo afecta a imágenes que la propia persona inserta).
- Aceptación: `npm audit` sin críticas; build, `tests/exportaciones.test.mjs`, pruebas de Mermaid/PowerPoint y suite completa en verde. Comprobar en `libre/manifest.json` que las versiones y SHA-256 copiados se regeneran.

## Fase 1 — Lo que hoy se ve mal (errores comprobados)

**1.1 Los ejemplos fallan su propia revisión.** El ejemplo «Calibración UV–Vis» abre con «1 problema»: en la diapositiva 4 «El contenido no cabe (6 px de más)», y avisos de portada sin autores, figura sin pie y gráfica sin procedencia. Un ejemplo debe enseñar el resultado limpio.
- Escribir primero una prueba (p. ej. `tests/ejemplos-revision.test.mjs`) que abra cada uno de los 12 ejemplos y ejecute la misma revisión que el botón de la barra inferior (localizar la función en `src/js/31-revision.js`). Exigir 0 errores («que arreglar»). Los avisos («que mejorar») se pueden tolerar solo si son intencionales y están listados en la prueba con su motivo.
- Corregir en `src/js/87-ejemplos.js`: tamaños o acomodo en lo que no cabe, pies de figura, procedencia («Figura viva») indicando que los datos son ilustrativos, y en la portada un autor genérico tipo «Autoría del ejemplo».
- La geometría «no cabe» solo es real en navegador: la prueba debe correr en Chromium (patrón de `tests/mejoras-browser.test.mjs`, saltando si no hay `ERLEN_CHROMIUM`).
- Regenerar con `npm run examples` y revisar el diff de `examples/`.

**1.2 Los avisos (toast) tapan controles.** En escritorio, el toast «Ejemplo didáctico…» tapa la barra inferior («Lienzo libre» queda cortado). En teléfono tapa los controles de zoom y el indicador de problemas.
- Localizar el contenedor `#toasts` en `src/css/` y colocarlo por encima de la barra inferior (en teléfono, encima de la barra «Presentar» y del zoom), sin cubrir el lienzo.
- Aceptación: capturas en escritorio y teléfono con el toast visible donde ningún control interactivo quede debajo (comprobarlo también con `document.elementFromPoint` en el centro de cada botón de la barra inferior).

**1.3 La revisión: ir al problema con un clic.** En el diálogo «Revisión» cada aviso muestra el número de diapositiva. Verificar si el número lleva a la diapositiva; si no, hacer que cada aviso sea un botón que cierre el diálogo, vaya a la diapositiva y seleccione el bloque (`b.id` ya viaja en los avisos de `84-calidad.js`). Prueba en JSDOM del salto y de la selección.

## Fase 2 — Encontrar lo que ya existe

La app tiene muchas herramientas, pero repartidas sin un criterio claro. Cinta actual (escritorio):
- **Inicio** (15) mezcla deshacer y gestión de diapositivas con herramientas de preparación de la charla: Argumento, Cuéntamelo, Línea de tiempo, Memoria, Tutor.
- **Diapositiva** (23) mezcla lienzo libre y capas con preparación: Preguntas, De respaldo, Lo aprendido, Ramas, Carga, Mirada.
- **Presentar** (11) junta ensayo y revisión.

**2.1 Propuesta de reorganización (Decide Jorge antes de implementar).** Escribir en `docs/superpowers/specs/2026-11-06-cinta-design.md` una tabla «botón → pestaña actual → pestaña propuesta → motivo» con un criterio por pestaña:
- Inicio: editar (deshacer, portapapeles, diapositivas, buscar).
- Insertar: igual.
- Diseño: igual.
- Diapositiva: solo la diapositiva y su lienzo.
- **Preparar** (nueva o renombrando una existente): argumento, cuéntamelo, línea de tiempo, memoria, tutor, preguntas, respaldo, lo aprendido, ramas, carga, mirada, notas y tiempo.
- Presentar: presentar, ensayar y comprobar.

Incluir capturas antes/después. Implementar solo tras aprobación, en `src/js/56-cinta.js`. Actualizar `tests/cinta.test.mjs`, `docs/interfaz.md` y `docs/uso.md`, y mantener cada acción en «Ir a / hacer» (`src/js/51-asistente.js`) para que la búsqueda siga encontrándola.

**2.2 Análisis de la serie visible desde la gráfica.** Hoy solo se llega por Propiedades → «σ Analizar la serie…».
- Añadirlo a la barra contextual de las gráficas (`src/js/05b-barra-contextual.js`), con el modo según la técnica (DRX → pico, UV-Vis → Tauc, como ya hace `modoInicialAnalisis`).
- Añadirlo como acción en `51-asistente.js` («analizar serie», «tauc», «scherrer», «banda prohibida», «tamaño de cristalita»).
- Tras importar datos de instrumento (`avisaInstrumento` en `41-instrumento.js`), el toast ya ofrece «No es eso». Valorar un segundo botón «Analizar» si `toast` admite dos acciones; si no, no tocar `toast`.
- Pruebas en Chromium: el botón aparece al seleccionar una gráfica y abre el modo correcto.

**2.3 Cabecera.** El botón «AGPLV3» ocupa en la cabecera el mismo peso visual que «Presentar». La interfaz debe conservar un enlace visible al código fuente (`README.md`, licencia). **Decide Jorge** entre dejarlo como enlace de texto pequeño o moverlo junto a «?» manteniéndolo visible. No quitarlo.

## Fase 3 — Caracterización de sólidos

**3.1 Ejemplo nuevo «Caracterización de un sólido».** DRX con Scherrer y UV-Vis de reflectancia con Tauc, seis diapositivas como los demás, con datos sintéticos generados por fórmula y declarados ilustrativos (reutilizar el modelo de `tests/caracterizacion.test.mjs`: borde directo y reflectancia por Kubelka–Munk inversa; pico gaussiano). Sin bibliografía inventada: si se cita el método, que sea una referencia que exista y se haya comprobado, o ninguna. Pasa a haber 13 ejemplos: actualizar `README.md`, `examples/README.md`, `docs/README.en.md` y las pruebas que cuenten ejemplos. Debe pasar la prueba de 1.1.

**3.2 Tauc: sensibilidad al tramo.** El ± ya avisa de que no incluye la elección del tramo. Añadir una fila «Eg con tramos vecinos: min–max» que recalcule desplazando la ventana ±1 paso de puntos (o ±10 % de su anchura) y muestre el intervalo. Es la forma honesta de enseñar la incertidumbre dominante. Pruebas con datos sintéticos de curvatura conocida.

**3.3 Scherrer: anchura instrumental opcional.** Campo «β instrumental (°)» opcional. Si se da, usar β² = β_obs² − β_inst² (perfil gaussiano) e indicarlo en pantalla; si β_inst ≥ β_obs, avisar en lugar de calcular. Guardarlo en `analisisOpc` (saneado). Mantener el aviso de límite inferior cuando no se da.

**3.4 Revisión científica de gráficas analizadas.** Si una gráfica tiene `analisisOpc` con Tauc y el título contiene una Eg, que «Calidad científica» recuerde indicar transición directa/indirecta y tramo. Solo como sugerencia, nunca como error.

## Fase 4 — Inicio y primera experiencia

**4.1 Miniaturas reales de los ejemplos.** Las tarjetas del inicio muestran una fórmula decorativa, no la diapositiva. Valorar usar la miniatura real de la portada o de la diapositiva más representativa (ya existe el render de miniaturas de la tira). Medir el coste de carga; si es alto, generarlas en el build. **Decide Jorge** si se mantiene el estilo actual.

**4.2 Primer uso guiado mínimo.** Al abrir un ejemplo aparece un toast que se va solo. Sustituir por una franja descartable con tres enlaces: «Cambiar datos», «Ver revisión» y «Presentar». Recordar la decisión de cerrarla en `localStorage`, con try/catch.

## Orden y tamaño

| Fase | Tareas | Tamaño | Depende de |
|---|---|---|---|
| 0 | 0.1 | pequeño | — |
| 1 | 1.1, 1.2, 1.3 | medio | — |
| 2 | 2.2; 2.1 y 2.3 tras decisión | medio–grande | aprobación |
| 3 | 3.2, 3.3, 3.4; 3.1 al final | medio | 1.1 |
| 4 | 4.1, 4.2 | medio | decisión 4.1 |

## Fuera de este plan

Coedición, cuentas, nube, cambios de formato JSON incompatibles, la app de escritorio Tauri y los workflows de `.github/`.
