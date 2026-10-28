# Scientific Figures on Slides Implementation Plan

> For agentic workers: use superpowers:executing-plans and verify each task with failing tests before implementation.

**Goal:** Make the full Erlen Figures 0.21.0 catalog usable as individual objects on Tabula's free slide canvas.

**Architecture:** Preserve the upstream catalog data and vector chunks with their notices, and add a small local adapter that loads drawings on demand. The editor inserts self-contained SVG image blocks with provenance, while existing free-canvas manipulation and JSON v1 serialization remain authoritative. A credits view and export warning expose third-party attribution.

**Tech Stack:** JavaScript ES modules, existing Tabula DOM editor, Chromium, Tauri 2 and Rust file workflow.

**Spec:** `docs/superpowers/specs/2026-10-28-figuras-lienzo-design.md`.

## Global Constraints

- Keep the application offline, do not import another suite editor, preserve JSON v1 and scientific sources.
- Preserve original and third-party notices and per-asset attribution; do not put suite configuration or research documents in the public repository.
- Do not alter shared design files or `.github/`; do not merge or approve PRs.
- Load the catalog and vector chunks on demand and never insert an unresolved placeholder.

## Review Focus

- A catalog chunk fails to load or is missing: no partial object is inserted, and the reason is visible.
- A user changes the slide or document during loading: the old operation cannot mutate the new document.
- SVG assets have gradients, internal references and differing aspect ratios: each stays vectorial and renders correctly when duplicated and exported.
- A CC BY or MIT image is moved, duplicated, saved, reopened or exported: attribution and original license details remain recoverable.
- An existing presentation has unknown fields or an edited scientific source: insertion and undo do not delete or replace them.

### Task 1: Catalog and provenance

**Files:** `src/figures-catalog/`, `tests/catalogo-figuras.test.mjs`, `herramientas/build.mjs`, `THIRD_PARTY_NOTICES.md`.

- [x] Write failing tests for 1000 unique searchable entries, representative native and third-party SVGs, metadata and on-demand chunk loading.
- [x] Bring the Figures catalog and normalized assets with original license data, and implement an adapter for lookup, drawing and attribution.
- [x] Make the build copy the local modules and chunks; verify all shipped asset references and notices.
- [x] Run the catalog tests and build.

### Task 2: Slide insertion and attribution

**Files:** `src/js/85b-catalogo-figuras.js`, `src/js/05-editor.js`, `src/js/56-cinta.js`, `src/js/85-flujos.js`, `src/js/84-calidad.js`, `tests/catalogo-figuras-browser.test.mjs`.

- [x] Write failing tests for search, preview, adding independent objects, free-canvas manipulation, undo, JSON reopening and retained credits.
- [x] Implement the catalog dialog, insertion with a self-contained SVG and source record, asynchronous safety, credit access and export warning.
- [x] Exercise failure paths and prevent stale insertion or incomplete drawings.
- [x] Run browser and model tests.

### Task 3: Verification and review

**Files:** `README.md`, `docs/uso.md`, `docs/desarrollo.md`, `docs/validacion.md`.

- [x] Document usage, provenance and actual limits; inspect desktop and narrow browser views.
- [ ] Run `npm run build`, full `npm test`, MCP and appropriate Linux desktop checks; record real results.
- [ ] Request independent review, fix important findings and open a PR without merging it.
