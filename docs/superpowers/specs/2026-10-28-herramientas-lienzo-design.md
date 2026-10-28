# Herramientas del lienzo libre

## Objetivo

Permitir componer diapositivas con más precisión: ajustar bloques a guías, controlar qué bloque queda delante y mover varios bloques juntos. Las mejoras reutilizan la selección y los bloqueos existentes, y mantienen editables los proyectos JSON v1 y los datos científicos.

## Diseño

- Al arrastrar en lienzo libre se ofrecen guías en bordes y centros de la diapositiva y de otros bloques. El ajuste usa una tolerancia medida en píxeles de pantalla, se puede desactivar y no cambia el documento hasta soltar. Escape cancela.
- El orden de capas pertenece a los bloques mediante una propiedad numérica opcional compatible con JSON v1. Sin ella se conserva el orden anterior. Los controles de la lista de bloques adelantan o retrasan uno; la presentación y las exportaciones visuales respetan el orden.
- Ctrl/Cmd/Mayús permite seleccionar varios bloques. El arrastre y las flechas mueven la selección como una unidad sin cambiar distancias, con límites de diapositiva y un único paso de deshacer. Una selección que contiene bloques bloqueados no se mueve.
- La lista de bloques ofrece selección múltiple mediante controles accesibles, también para bloques cubiertos. El tamaño sigue editándose en un bloque a la vez.
- Se mantienen los acomodos y modos anteriores; las guías solo existen durante la edición y la clave de API o el agente no se modifican.

## Riesgos y comprobación

Se comprobarán cancelación y documentos cambiados durante el gesto, bloqueos, duplicación, importación y deshacer; orden entre zonas y en la presentación y HTML; y geometría, guías y teclado en Chromium real. Las exportaciones con pérdida de geometría mantienen sus avisos.
