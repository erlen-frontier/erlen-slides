# Working on Lámina

This is the standalone presentation editor (Lámina), licensed AGPL-3.0-only. Read README.md and docs/desarrollo.md before editing. Preserve a complete local editor without subscriptions.

Do not bring production credentials, cloud configuration, private research, other editors or unrelated operational documents into this public repository. Keep original and third-party license notices.

Preserve the flat JSON v1 project format, blank new slides, explicit save failures, and immutable scientific source data. Examples must label illustrative data and must not invent research claims or citations. Read src/js/_orden.txt before changing module dependencies.

The MCP server for AI assistants lives in mcp/ (docs/mcp.md): mcp/operaciones.js is evaluated inside the built app and calls its functions, so block, layout and export changes can affect it; run tests/mcp.test.mjs after them.

Run npm run build and relevant tests. When examples change, regenerate with npm run examples. Inspect rendered results for visual changes. JSDOM geometry is simulated; do not report it as browser validation.

This repository keeps its own branch and runs builds and tests locally. GitHub Actions and automatic synchronization were retired: there are no workflows in `.github/`, and none must be restored without an explicit request in the task. Do not push tags or publish releases as part of a task.

## Collaboration rules

- **Never work in `main`.** Work on a `<agent>/<short-task>` branch, lowercase with hyphens (for example `codex/fix-export-csv`). `main` is protected: everything enters through a pull request and is merged with *squash*; the branch is deleted after merging.
- **One folder per agent and task.** Use your own clone or worktree; do not edit another agent's working folder or Jorge's.
- **Do not merge or approve.** Open the PR and stop; Jorge reviews and merges. If another open PR touches the same files, say so in your PR instead of stepping on it.
- **CI untouched without permission.** Do not modify `.github/` unless the task explicitly asks for it.
- **Commit and PR titles** in English with Conventional Commits (`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`; optional lowercase scope), no accents or ñ in the title. Identify agent and model with trailers (`Co-Authored-By` is optional):
  ```
  Agent: codex
  Agent-Model: <exact model>
  ```
- **Before the PR** run the repository tests and paste the real result into the description (the *Testing* section of the template). Do not claim tests you did not run.
- **Nothing sensitive:** no secrets, tokens, personal data, contracts or records. If you find one, stop and report.
