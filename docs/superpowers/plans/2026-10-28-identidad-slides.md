# Tabula Identity and Slide Editing Implementation Plan

**Goal:** Name the app Tabula, remove Mey from the UI, give it a consistent mark and improve creation and editing of slides.

**Architecture:** Configure the unmodified shared frame and home without Mey; provide an app-owned SVG to the frame, home and build; derive additional palette results from the existing toolbar and File declarations with contextual revalidation.

**Tech Stack:** Existing vanilla JavaScript editor, SVG, Tauri 2, Node.js 22+.

**Spec:** `docs/superpowers/specs/2026-10-28-identidad-slides-design.md`

## Tasks

1. Test that the home and editor have no Mey elements while preserving navigation and data. Configure both components without the mascot and remove its app-owned event integration.
2. Create the app-owned mark, use it in the home, editor and favicon, and generate matching Linux icons. Inspect desktop and narrow screens.
3. Test that the command palette finds and executes existing toolbar and File actions in both layouts, excludes unavailable actions and rejects stale context. Derive results from their existing declarations and provide accessible keyboard selection and result feedback.
4. Add and test slide reordering controls in the overview, including keyboard use, undo and multiple-selection safety.
5. Run the affected tests and MCP coverage, inspect browser and Linux UI, rebuild the desktop package and document the actual results.
