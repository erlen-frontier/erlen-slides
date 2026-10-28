# Erlen Slides: first Rust and Tauri desktop stage

## Intent

Create a Linux-first desktop application from the current Slides editor. Preserve its scientific tools, local-first operation, JSON v1 projects and web distribution while establishing a real Rust core that can take over more work incrementally.

## Approach

Use Tauri 2 with the operating system WebView and bundle the existing built frontend. Keep the editor and scientific libraries local, without a Node runtime in the installed application. Isolate portable project operations in a Rust library and expose only narrowly scoped desktop commands to the main window. The first native operation validates and atomically writes project backups chosen through a native save dialog; the existing browser download remains the web fallback.

Alternatives considered: rewriting the editor in Rust would risk its many existing tools and formats; embedding a full browser and Node runtime would increase distribution size and duplicate platform components. A Tauri shell with a tested native core permits gradual migration while keeping the existing editor usable.

## Boundaries

- Linux is the first target; other platforms are not claimed as verified.
- Existing projects must remain usable. Project output preserves unknown fields, notes, scientific data and the exact JSON supplied by the editor.
- The browser and desktop have different storage origins. Do not silently migrate or overwrite either library; users can transfer project JSON explicitly.
- A canceled dialog makes no change. A validation or write failure must be visible and preserve any previous file. The frontend may not supply an arbitrary output path to the native command.
- Limit saves to one at a time per process, warn if edits occurred after the snapshot and write Linux backups with owner-only permissions.
- Keep the presenter in a separate related WebView, close its native window explicitly and never fall back to showing private notes on the projected slide in the desktop app. Open external web links in the system browser.
- Allow dynamic styles used by the editor and printing while retaining the configured script and connection restrictions.
- Keep application and third-party license notices. Do not add production credentials, telemetry, network services or unrelated suite applications.
- Existing presentation, import, export and MCP features remain in place. Known source issues, including multi-series PowerPoint import and accessibility warnings, are not represented as fixed by this migration.

## Verification

Test the Rust core with real temporary files, invalid JSON, replacement, unknown fields, permissions, concurrency and symbolic links; verify frontend fallback and native command handling. Build the desktop app on Linux and exercise it with a real WebView when system prerequisites are available, including opening and reopening the presenter and saving a project through the native dialog. Report measured package sizes and any untested platform or feature; do not infer memory or speed improvements without measurement.
