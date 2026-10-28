# Tabula identity and slide editing

## Intent

Give the Linux-first presentation app the name Tabula and an independent visual identity, remove Mey from its interface and improve creation and editing of slides. Preserve the existing project format and storage identities.

## Design

- Introduce one Tabula mark for the home screen, editor, favicon and Linux application icons. Its shape refers to a presentation and data.
- Disable Mey in the existing shared home and frame components without editing their synchronized copies. Remove Slides-owned Mey event dispatch and help integration. Preserve the separate local assistant, command palette, existing functions and presentation data.
- Extend the existing command palette with current, available actions from the ribbon and File menu, displaying their location. Keep the palette usable with either toolbar layout. Revalidate the document, slide and selected block before executing a contextual result.
- Add accessible controls for moving the current slide in the overview, including keyboard operation, undo and protection against accidental movement of a multi-selection.
- Preserve JSON v1, local storage keys, scientific data, browser support, Linux/Tauri support, licensing and accessibility. No automatic migration of saved content.

## Verification

Exercise the home screen, editor, keyboard command palette, both toolbar layouts and an available contextual action. Check stale and disabled actions do not modify another document. Inspect the new identity on desktop and narrow screens, run the relevant web and MCP tests, and build the Linux application when the local toolchain is available.
