---
name: add-bookshelf
description: "Build Bookshelf from its verified authored source using Three.js r165, including the complete renderer, interactions, and required assets. Use when Codex needs to implement, port, or adapt this effect without requiring the ThreeUI package or reconstructing the visual from an approximation."
---

# Build Bookshelf

## Description

The exact seven-volume Bookshelf collection with its authored room, carousel shelf, individual cover artwork, foil, pages, inspection, opening, and page-turn system.

Recreate the authored behavior from the verified source, not from screenshots or the abbreviated orchestration sample in this skill. The implementation may live directly in the target project and does not require `@designcodeio/threeui`.

## Technologies

- React and TypeScript lifecycle host
- Three.js r165 with OrbitControls, RoomEnvironment, RoundedBoxGeometry, and RectAreaLightUniformsLib
- Seven exact book records and seven authored cover-atlas crops
- Procedural cloth, foil, page stacks, flexible page geometry, PMREM room lighting, and carousel shelf motion
- Pointer selection, cover/page dragging, shelf/detail state transitions, orbit, pan, keyboard, and reduced motion

## Verified source material

- `complete-shelf/index.html — exact seven volumes, seven cover crops, and complete renderer`
- `src/shaders/bookshelf/bookshelfRenderer.js`
- `src/shaders/bookshelf/BookshelfScene.tsx`

Source revision: `6ef16625e670b0285bb689bdebffc1d728c6deb1`

## Implementation steps

1. Open every verified source file listed above and identify the renderer, host lifecycle, styles, and assets before editing.
2. Pin Three.js r165 and carry over all seven book records and cover crops together; do not reduce the collection to one volume.
3. Transfer the complete room, shelf, lighting, embedded cover/wood atlases, book rig, cloth, foil, and page geometry.
4. Keep shelf selection, continuous navigation, inspection transitions, cover dragging, page turns, orbit, pan, and keyboard focus as one state machine.
5. Expose selection and shelf/detail state to the host through callbacks without moving scene ownership into React state.
6. Retain responsive camera targets, context handling, reduced-motion behavior, render scheduling, and complete disposal.
7. Give the local component a sized, overflow-controlled parent and verify desktop, mobile, reduced-motion, and context-loss behavior.

Asset handling: Keep both owned atlases embedded exactly as authored; no network asset lookup is required.

## Local component example

Import the copied local component rather than a package entrypoint:

```tsx
import { BookshelfScene } from "./effects/bookshelf/BookshelfScene";
import "./effects/bookshelf/styles.css";

export function Scene() {
  return <div className="effect-frame"><BookshelfScene /></div>;
}
```

## Core renderer pattern

This excerpt documents orchestration only. Copy the exact shader, geometry, pass, and interaction code from the verified source files.

```tsx
const renderer = createBookshelfRenderer(host, canvas, {
  onReady: () => setReady(true),
  onSelectionChange: ({ index, total, title }) => setSelection({ index, total, title }),
  onModeChange: (mode) => setMode(mode),
});
await renderer.ready;
    return () => renderer.dispose();
```

## Behavior contract

- Runtime: Three.js r165
- Passes: 1 live scene render + PMREM environment bake
- Interaction: Shelf navigation, volume selection, click-to-inspect, cover drag, paginated leaf drag, orbit, pan, and reset
- Assets: 2 exact embedded owned atlases — cover artwork and walnut texture
- **renderer** (host): Three.js r165
- **collection** (fixed): 7 authored volumes
- **environment** (precompute): PMREM room
- **interaction** (pointer): Inspect + cover + pages
- **pixelRatio** (adaptive): ≤ 2
- **assets** (embedded): 2 exact owned atlases

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
