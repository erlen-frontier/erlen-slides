# Herramientas del lienzo libre — plan

**Objetivo:** añadir guías, capas y movimiento de selección múltiple al lienzo libre existente.

**Base:** JSON v1 y el estado de selección por bloques existentes; sin cambios en las funciones de IA. Véase [diseño](../specs/2026-10-28-herramientas-lienzo-design.md).

1. Escribir pruebas que fallen para orden de capas, duplicación/validación, selección múltiple, movimientos atómicos, bloqueos y ajuste a guías.
2. Incorporar el orden de capas al modelo y al renderizado; añadir controles accesibles en la lista y preservar el orden en exportaciones visuales.
3. Ampliar el gesto y los atajos para mover varios bloques, con límites, cancelación, estado obsoleto y un solo deshacer.
4. Añadir guías de bordes/centros y ajuste opcional medido en píxeles; verificar el gesto y su cancelación en Chromium.
5. Documentar el uso; ejecutar build, pruebas específicas, MCP y la suite completa; inspeccionar escritorio y móvil.
