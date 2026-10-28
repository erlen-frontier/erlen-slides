# Precise slide canvas transformations

**Goal:** Rotate and flip figures and preserve aspect ratios while retaining the existing precise free-canvas controls and JSON v1 data.

**Architecture:** Keep layout boxes in `posLibre`; add validated optional aspect-lock and image-orientation metadata. Transform the image wrapper and its annotations, leaving captions and editor controls upright. PowerPoint uses real image transforms where possible and a faithful rasterized wrapper for complex figures; Beamer carries the same orientation. Existing selection, undo and provenance remain authoritative.

**Constraints:** Offline-first, no shared design/CI edits, preserve unknown/scientific data, no source-image mutation, no automatic merge. Rotated content may protrude beyond the unrotated position box.

## Review focus

- Reopening old JSON or malformed optional metadata does not alter source media, annotations or other fields.
- A locked block or stale inspector/gesture cannot mutate the current slide or another document.
- Locked proportions work for all four handles, numeric fields and keyboard, including edges and fractional positions.
- Asymmetric rotated/flipped images and their annotations render consistently in edit, presentation, HTML, PDF and both PowerPoint exporters.
- Undo, redo, duplication and JSON reopen retain geometry, orientation, credits and aspect lock.

## Tasks

1. Add failing model and browser tests for aspect lock, rotation/flips, numeric inputs, undo, JSON and malformed input. Implement validated metadata and controls.
2. Add failing browser tests for image/annotation rendering, interactions and export, then implement the shared rendering and export transforms. Verify PowerPoint in an independent reader.
3. Document behavior and limits, inspect desktop and narrow views, run build, complete tests and MCP, and build Tauri for Linux. Review the final diff and open a PR without merging.
