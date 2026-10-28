# Free Canvas Composition Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement and verify each task. Steps use checkbox syntax.

**Goal:** Select, resize and arrange multiple free-canvas blocks and insert editable basic shapes directly on a slide.

**Architecture:** Build on the selection and layer model in PR #60. Keep geometry operations atomic and independent of pointer UI; reuse image blocks with the existing validated figure model and autonomous SVG. Preserve JSON v1 and scientific sources.

**Tech Stack:** Existing JavaScript editor, CSS, Node test runner, Chromium/Playwright and Tauri/Linux.

**Spec:** `docs/superpowers/specs/2026-10-28-composicion-lienzo-design.md`

## Global Constraints

- No AI changes, CI changes or modifications to the shared design package.
- Blank slides stay blank until a user inserts content. Locked or stale selections never partially change.
- Preserve JSON v1, accessibility, undo and scientific data; verify with real browser geometry.

## Review Focus

- A marquee on empty canvas must not swallow a normal click or text edit; test both and cancellation.
- Hidden or locked blocks and groups must not cause partial transforms; test with changed selection and slide.
- Scaling must keep all boxes within bounds and at least 1%, including fractional coordinates; test every corner and undo.
- Equal distribution must preserve endpoints and use spaces, even for different widths or overlap; test horizontal and vertical.
- Shape insertion must round-trip as an editable figure and must not renumber scientific figures; test SVG, JSON and undo.

### Task 1: Selection and transforms

**Files:** `src/js/03b-herramientas-lienzo.js`, `src/js/05-editor.js`, `src/js/90-main.js`, `src/css/01-editor.css`, new canvas composition tests.

- [x] Add failing tests for box selection, proportional group scaling and atomicity; run them and confirm failure.
- [x] Implement geometry, pointer/keyboard controls and accessible group handles; run targeted unit and Chromium tests.

### Task 2: Position alignment and distribution

**Files:** `src/js/03b-herramientas-lienzo.js`, `src/js/05-editor.js`, canvas composition tests.

- [x] Add failing tests for alignment, equal gaps, locked blocks and undo.
- [x] Implement atomic position operations and an accessible menu; run targeted tests.

### Task 3: Basic shapes on the slide

**Files:** `src/js/03-state.js`, `src/js/04-render.js`, `src/js/05-editor.js`, `src/js/21-robustez.js`, `src/css/02-slides.css`, canvas composition tests.

- [x] Add failing tests for shape insertion, independent SVG/figure data, numbering and save/reopen.
- [x] Add the shape menu, insertion and rendering through existing figure blocks; verify generated slides and exports.

### Task 4: Documentation and review

**Files:** `README.md`, `docs/uso.md`, `docs/desarrollo.md` and any test adjustments required by new controls.

- [x] Document behavior and keyboard access; inspect desktop and narrow layouts.
- [x] Run the complete repository tests, build, MCP tests and accessibility checks; report inherited failures accurately.
- [x] Request review, resolve findings, commit and prepare a PR based on PR #60 without merging it.
