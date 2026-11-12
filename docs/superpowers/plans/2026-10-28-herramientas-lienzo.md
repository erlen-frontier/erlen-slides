# Herramientas del lienzo libre — plan

> Plan histórico del 28 de octubre de 2026. Se conserva como antecedente de diseño e implementación, no como lista vigente de tareas pendientes ni como prueba de implementación o validación del código actual. Antes de retomar una tarea, contrástala con el código, las decisiones posteriores y [AGENTS.md](../../../AGENTS.md), cuyas reglas actuales prevalecen sobre las instrucciones originales de este plan. Las comprobaciones se realizan localmente cuando el entorno lo permite, declarando resultados y omisiones; no se presupone CI ni revisión de código garantizada. Esta edición documental no ejecuta tareas, no aprueba decisiones de producto ni certifica resultados nuevos.

**Objetivo:** añadir guías, capas y movimiento de selección múltiple al lienzo libre existente.

**Base:** JSON v1 y el estado de selección por bloques existentes; sin cambios en las funciones de IA. Véase [diseño](../specs/2026-10-28-herramientas-lienzo-design.md).

1. Escribir pruebas que fallen para orden de capas, duplicación/validación, selección múltiple, movimientos atómicos, bloqueos y ajuste a guías.
2. Incorporar el orden de capas al modelo y al renderizado; añadir controles accesibles en la lista y preservar el orden en exportaciones visuales.
3. Ampliar el gesto y los atajos para mover varios bloques, con límites, cancelación, estado obsoleto y un solo deshacer.
4. Añadir guías de bordes/centros y ajuste opcional medido en píxeles; verificar el gesto y su cancelación en Chromium.
5. Documentar el uso; ejecutar build, pruebas específicas, MCP y la suite completa; inspeccionar escritorio y móvil.
