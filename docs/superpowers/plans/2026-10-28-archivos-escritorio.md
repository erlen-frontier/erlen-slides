# Desktop Project Files Implementation Plan

> **For agentic workers:** Execute tasks with tests and an independent final review.

**Goal:** Open and safely save JSON project files in the Linux desktop application.

**Architecture:** Rust owns dialog-selected paths, opaque handles, file fingerprints and atomic writes. The editor owns document state, pending-change indication, document transitions and close confirmation; its library remains independent.

**Tech Stack:** Tauri 2, Rust, JavaScript, Node tests, real Linux WebKit/Tauri.

**Spec:** `docs/superpowers/specs/2026-10-28-archivos-escritorio-design.md`

## Global Constraints

- Preserve JSON v1, scientific sources, existing library and browser behavior.
- Never accept file paths from JavaScript. Never silently overwrite external changes.
- Verify invalid input, cancelled dialogs, failed writes, in-flight edits, switching and closing.

## Tasks

1. Write failing Rust tests for open, save, save-as, conflict, invalid input and private atomic writes; implement the session and Tauri commands; run the Rust suite.
2. Write failing editor tests for open/save/keyboard, pending edits, cancellation, errors and transitions; implement the desktop controller, accessible commands and close handling; run focused editor tests.
3. Update desktop/user documentation, build and run the complete suite; exercise a real Tauri/Linux flow and visually inspect the editor. Request independent review, correct substantive findings, and document verification in the PR.
