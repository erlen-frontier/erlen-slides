# Trabajar en Lámina

Lámina es el editor independiente de presentaciones, derivado de Erlen Slides y publicado bajo AGPL-3.0-only. Lee README.md y docs/desarrollo.md antes de editar. Conserva un editor local completo, sin suscripciones obligatorias.

## Alcance y contratos

- No incorpores credenciales de producción, configuración de nube, investigación privada, otros editores de la suite ni documentos operativos ajenos a este repositorio público. Conserva las licencias y atribuciones originales y de terceros.
- Preserva la compatibilidad JSON v1, las claves de almacenamiento existentes, las diapositivas nuevas en blanco, los errores de guardado explícitos y los datos científicos fuente inmutables.
- Los ejemplos deben identificar los datos ilustrativos y no inventar resultados de investigación ni citas.
- Lee src/js/_orden.txt antes de cambiar dependencias entre módulos. Respeta la arquitectura y las convenciones existentes; evita reestructuraciones ajenas a la tarea.
- El servidor MCP vive en mcp/ y se documenta en docs/mcp.md. mcp/operaciones.js se evalúa dentro de la aplicación construida y llama a sus funciones: los cambios de bloques, diseños y exportaciones pueden afectarlo. Incluye tests/mcp.test.mjs entre las comprobaciones locales pertinentes cuando sea posible.

## Flujo de trabajo y comprobaciones

Este repositorio trabaja sin CI y sin revisión de código garantizada. No presupongas checks automáticos, aprobaciones técnicas ni validación de cada cambio. La ausencia de CI es una condición de trabajo, no un pendiente ni un requisito para avanzar.

La compilación y las pruebas se realizan localmente cuando el entorno lo permite. Ejecuta npm run build y las pruebas pertinentes cuando estén disponibles. Si cambias ejemplos, regenera con npm run examples cuando sea posible. Para cambios visuales, inspecciona el resultado renderizado; para exportadores, comprueba los archivos producidos.

Registra los comandos realmente ejecutados, sus resultados y su alcance. Si una comprobación no se ejecutó, indica el motivo y la incertidumbre pendiente. No presentes pruebas omitidas como aprobadas ni resultados históricos como validación del código actual. JSDOM simula la geometría: no lo describas como validación en un navegador real.

Lámina no depende de sincronización automática con Erlen Suite. No presupongas propagación de diseño, módulos compartidos ni fusiones coordinadas entre repositorios. Las atribuciones de los componentes derivados se conservan. No añadas CI, sincronización ni cambios en .github/ salvo petición explícita.

## Trabajo con varios agentes

Estas reglas son locales a Lámina; no constituyen un bloque sincronizado con otros repositorios.

- Trabaja por defecto en una rama <agente>/<tarea-corta>, en minúsculas y con guiones. No escribas directamente en main salvo autorización explícita del propietario para la operación concreta. No presupongas la configuración de protección de ramas.
- Usa tu propio clon o worktree por agente y tarea; no edites la carpeta de trabajo de otro agente ni la de Jorge.
- No apruebes ni fusiones pull requests salvo autorización explícita. Cuando abras un PR, documenta los cambios y las comprobaciones reales, sin afirmar que Jorge u otra persona revisará el código. Si otro PR toca los mismos archivos, comunica el posible conflicto.
- Limita cada cambio al alcance solicitado. No alteres otros repositorios ni restaures integraciones retiradas sin una petición específica.
- Escribe commits y títulos de PR en inglés con Conventional Commits, sin tildes ni eñes en el título. Esta convención es documental: no presupone un check automático. Identifica el agente y, si se conoce, el modelo mediante trailers Agent y Agent-Model; no inventes el identificador del modelo. Co-Authored-By es opcional.
- No incorpores secretos, tokens, datos personales, contratos ni expedientes. Si encuentras contenido sensible, detente y avisa sin reproducirlo.
- Los repositorios empresa-*, erlen-legal-mexico y erlen-burocracy quedan fuera del alcance de este trabajo.
