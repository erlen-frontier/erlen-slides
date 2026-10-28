# Free Canvas and Integrated Agent Implementation Plan

**Goal:** Make slide blocks freely positionable and provide an integrated, model-backed chat that can edit the open presentation safely.

**Architecture:** Optional per-slide `lienzoLibre` and per-block `posLibre` metadata preserve the existing JSON layout and data. The chat uses a bounded provider adapter and validated operations on a copy, applying a successful batch with one undo step. The canvas and chat implementations touch separate product files; their shared build integration and end-to-end review are owned by the coordinator.

**Tech Stack:** Existing JavaScript editor, Tauri 2/Rust, Node test runner and Chromium.

**Spec:** `docs/superpowers/specs/2026-10-28-lienzo-agente-design.md`

## Global Constraints

- Preserve JSON v1, saved projects, existing layouts, blank new slides, scientific source data and explicit save errors.
- Linux desktop first; leave synced `src/diseno` modules and `.github` unchanged.
- Use only user-configured HTTPS cloud providers; never include credentials or production cloud configuration.
- No silent fallback when an export cannot preserve placement; document real limitations.
- Do not run a shared build concurrently with the other implementer; coordinator integrates and verifies.

## Review Focus

- Moving a locked block or cancelling a gesture leaves both content and geometry unchanged.
- Opening, toggling, duplicating, undoing and saving older slides does not lose blocks or notes.
- A failed or stale agent response never applies a partial batch to any document.
- Credentials and embedded media do not appear in stored projects, logs or model context.
- Screen, presentation and exports either preserve placement or provide an explicit warning.

### Task 1: Free slide canvas

**Files:** Existing slide rendering, editor interaction, styles, export reporting and dedicated canvas tests; no edits to assistant or transport files.

- [ ] Add behavioral tests for opt-in, geometry round trips, pointer/keyboard movement, locks, undo, old layouts, scientific blocks and export handling.
- [ ] Implement bounded `lienzoLibre` / `posLibre` behavior, preserving existing layout and zones and keeping newly inserted blocks visible.
- [ ] Verify and document format limitations and keep data unchanged.
- [ ] Report integration files and test commands to coordinator.

### Task 2: Real model-backed chat and safe operations

**Files:** Assistant UI, new agent JS/CSS and tests; Tauri commands/capabilities/dependencies if needed. Do not edit slide rendering or geometry files; coordinate build ordering with the coordinator.

- [ ] Test the provider adapter and editing loop using a fake provider, including invalid arguments, cancellation, stale state, locked blocks, source preservation and atomic undo.
- [ ] Implement a chat with configurable model/endpoint and session-only key, a bounded operation allowlist, and a provider transport usable from Linux/Tauri.
- [ ] Show actual model errors and applicable output; preserve the local rule-based helper. Agent changes use the current document, never arbitrary filesystem or shell access.
- [ ] Report integration files and test commands to coordinator.

### Task 3: Integrate and verify

**Files:** Module/style ordering, documentation, full tests and native package.

- [ ] Integrate nonconflicting modules and review the canvas/agent interface.
- [ ] Run build, focused tests, MCP tests and repository suite; inspect real Chromium/Tauri workflows and relevant exported artifacts.
- [ ] Review changes independently, record unresolved limitations, and open a draft PR on the existing Tabula branch.
