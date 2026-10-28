# Tauri and Rust Desktop Implementation Plan

**Goal:** Deliver a Linux-first Tauri application that preserves the current Slides editor and begins moving project file operations into a tested Rust core.

**Architecture:** Bundle the existing static frontend in Tauri and keep the web build intact. A portable Rust library validates project JSON and writes selected files atomically; a narrowly scoped Tauri command opens a native dialog and calls the library. A second command closes the presenter window. The browser fallback retains its existing download behavior.

**Tech Stack:** Rust, Tauri 2, Node.js 22+, existing vanilla JavaScript editor.

**Spec:** `docs/superpowers/specs/2026-10-28-tauri-rust-design.md`

## Tasks

1. Write failing Rust tests for exact JSON preservation, invalid input, failed writes, replacement and symlink safety. Implement the smallest portable core and run the tests.
2. Add the Tauri shell, scoped native commands and frontend bridge. Test success, cancellation, failure, concurrent saves, presenter behavior and the unchanged browser fallback.
3. Document Linux setup, storage isolation, project transfer and current limitations. Build the web and desktop targets, run the affected tests and inspect the desktop app. Record actual package sizes and report any unavailable validation.
