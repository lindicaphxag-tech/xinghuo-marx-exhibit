---
name: add-gallery
description: "Build Gallery from its verified authored source using Three.js r149, including the complete renderer, interactions, and required assets. Use when Codex needs to implement, port, or adapt this effect without requiring the ThreeUI package or reconstructing the visual from an approximation."
---

# Build Gallery

## Description

The isolated Vantrix hero image ribbon: sixteen curved editorial panels orbiting a vertical cylindrical rail on a quiet paper grid.

Recreate the authored behavior from the verified source, not from screenshots or the abbreviated orchestration sample in this skill. The implementation may live directly in the target project and does not require `@designcodeio/threeui`.

## Technologies

- React
- Three.js r149
- Scoped CSS
- CylinderGeometry image ribbon
- Five local WebP textures
- Responsive and visibility-aware renderer lifecycle

## Verified source material

- `Vantrix Studio Landing Page Template.html — hero carousel only`
- `src/shaders/gallery/Gallery.tsx`
- `src/shaders/gallery/gallery.css`
- `src/shaders/gallery/assets/gallery-1.webp`
- `src/shaders/gallery/assets/gallery-2.webp`
- `src/shaders/gallery/assets/gallery-3.webp`
- `src/shaders/gallery/assets/gallery-4.webp`
- `src/shaders/gallery/assets/gallery-5.webp`

Source revision: `SHA-256 f7a576d4db08`

## Implementation steps

1. Open every verified source file listed above and identify the renderer, host lifecycle, styles, and assets before editing.
2. Use Gallery as a standalone UI element and keep the extraction limited to the Vantrix hero image ribbon.
3. Do not include the source navigation, loader, cursor, marketing cards, headings, calls to action, or lower landing-page sections.
4. Preserve the 35-degree camera, 16 curved cylindrical panels, four-turn placement, slow rotation, and vertical drift from the authored hero.
5. Keep all five gallery textures local and use speed, scale, opacity, and final-frame palette controls at the component boundary.
6. Retain DPR-capped resizing, hidden-host suspension, reduced-motion rendering, and complete Three.js disposal.
7. Give the local component a sized, overflow-controlled parent and verify desktop, mobile, reduced-motion, and context-loss behavior.

Asset handling: Copy all five local gallery WebP textures beside Gallery.tsx and keep the new URL asset references aligned if their location changes.

## Local component example

Import the copied local component rather than a package entrypoint:

```tsx
import { Gallery } from "./effects/gallery/Gallery";
import "./effects/gallery/styles.css";

export function Scene() {
  return <div className="effect-frame"><Gallery speed={1} scale={1} /></div>;
}
```

## Core renderer pattern

This excerpt documents orchestration only. Copy the exact shader, geometry, pass, and interaction code from the verified source files.

```tsx
<Gallery speed={1} scale={1} />
```

## Behavior contract

- Runtime: Three.js r149
- Passes: 1 live Three.js scene with 16 textured cylindrical panels
- Interaction: Automatic rotation and vertical drift, responsive DPR-capped resize, reduced-motion still frame, and visibility-aware lifecycle
- Assets: 5 locally optimized authored gallery images
- **renderer** (host): Extracted hero carousel only
- **geometry** (fixed): 16 curved cylindrical image panels
- **motion** (prop): speed + scale
- **lifecycle** (host): responsive + visibility-aware + reduced motion
- **assets** (local): 5 authored WebP textures

## Verification

1. Compare the rendered composition, animation timing, pointer behavior, and state transitions with the source implementation.
2. Exercise resize, high-DPI, mobile/coarse-pointer, reduced-motion, tab visibility, and WebGL context-loss paths where applicable.
3. Confirm every animation frame, observer, listener, geometry, buffer, texture, framebuffer, material, and renderer is released on teardown.
4. Check the browser console and confirm the effect renders at native-or-better backing resolution.

## Guardrails

- Do not substitute a visually similar package, demo, shader, or runtime.
- Do not approximate, reconstruct, or simplify the authored GLSL, render passes, geometry, interaction state, or assets.
- Keep exact source and asset hashes under regression tests when the source project provides them.
- Adapt only the surrounding host boundary needed by the target project; keep renderer behavior intact.
