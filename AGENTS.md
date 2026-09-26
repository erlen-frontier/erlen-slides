# Working on Erlen Slides

This is the standalone scientific presentation editor, licensed AGPL-3.0-only. Read README.md and docs/desarrollo.md before editing. Preserve a complete local editor without subscriptions.

Do not bring production credentials, cloud configuration, private research, other suite editors or unrelated operational documents into this public repository. Keep original and third-party license notices.

Preserve JSON v1 compatibility, blank new slides, explicit save failures, and immutable scientific source data. Examples must label illustrative data and must not invent research claims or citations. Read src/js/_orden.txt before changing module dependencies.

Run npm run build and relevant tests. When examples change, regenerate with npm run examples. Inspect rendered results for visual changes. JSDOM geometry is simulated; do not report it as browser validation.

Publicación: un tag `v<versión>` lanza `.github/workflows/release.yml` (workflow «Publish release»), que crea la release y avisa a erlen-suite (docs/actualizacion-automatica.md del portal). Requiere el secreto `ERLEN_SYNC_APP_KEY`.

Continuous Suite integration: every push to main dispatches slides-changed through suite-sync.yml using the erlen-suite-sync GitHub App (org secret ERLEN_SYNC_APP_KEY). Suite builds the exact current main SHA, validates the unchanged ZIP and both applications, then verifies production. No automatic release or tag is created.

<!-- erlen-convencion-agentes:inicio v2 (bloque común; fuente: erlen-suite/docs/convencion.md; se actualiza en todos los repos a la vez) -->
## Trabajo con varios agentes

Este repositorio lo trabajan varios agentes (Claude, Codex, Amp, Mimo, Antigravity, Oh my Pi, Vibe) y modelos. Estas reglas son comunes a todos los repos de Erlen y prevalecen sobre costumbres de cada herramienta o instrucciones locales anteriores.

- **Nunca en `main`.** Trabaja en una rama `<agente>/<tarea-corta>` en minúsculas y con guiones (por ejemplo `codex/fix-export-csv`). Solo los bots usan otros prefijos: `diseno/` (paquete de diseño) y `sync/` (sincronización de la suite). `main` está protegida: todo entra por pull request y se fusiona con *squash*; la rama se borra al fusionar.
- **Una carpeta por agente y tarea.** Usa tu propio clon o worktree; no edites la carpeta de trabajo de otro agente ni la de Jorge.
- **No fusiones ni apruebes.** Abre el PR y detente; Jorge revisa y fusiona. Si otro PR abierto toca los mismos archivos, dilo en tu PR en lugar de pisarlo.
- **Cambios que cruzan repos.** Si tu cambio afecta a otra app o a la suite (paquete de diseño, módulos compartidos `suite-*.mjs`/`mey.mjs`, formatos de intercambio, avisos a la suite), usa **el mismo nombre de rama en cada repo afectado** y enlaza todos los PRs en la sección *Cross-repo*. Se fusionan juntos: primero `erlen-suite`, después las apps. No copies módulos compartidos a mano: vienen de `erlen-suite` por `diseno-propagar`.
- **CI intocable sin permiso.** No modifiques `.github/` salvo petición explícita en la tarea.
- **Commits y títulos de PR** en inglés con Conventional Commits (`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`; ámbito opcional en minúsculas), sin tildes ni eñes en el título. El título del PR se convierte en el commit de `main` y lo valida el check `convencion`. Identifica agente y modelo con trailers (`Co-Authored-By` es opcional):
  ```
  Agent: codex
  Agent-Model: <modelo exacto>
  ```
- **Antes del PR** ejecuta las pruebas del repo y copia el resultado real en la descripción (sección *Testing* de la plantilla). No afirmes pruebas que no ejecutaste.
- **Nada sensible:** ni secretos, tokens, datos personales, contratos ni expedientes. Si encuentras uno, detente y avisa.
- Los repos `empresa-*`, `erlen-legal-mexico` y `erlen-burocracy` están fuera del alcance de los agentes.
<!-- erlen-convencion-agentes:fin -->
