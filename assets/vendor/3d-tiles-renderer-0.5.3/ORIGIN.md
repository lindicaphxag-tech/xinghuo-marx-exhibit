# 3D Tiles renderer vendored files

- Upstream: [NASA-AMMOS/3DTilesRendererJS](https://github.com/NASA-AMMOS/3DTilesRendererJS)
- Package: `3d-tiles-renderer` 0.5.3, Three.js build entry `index.three.js`
- License: Apache License 2.0 (see `LICENSE`)
- Runtime: Three.js r180, already vendored by this project
- Files retained: Three.js entry point and its two bundled renderer chunks

The page uses the upstream renderer to stream public PLATEAU 3D Tiles over HTTPS. Dataset access, coverage, attribution, and terms are governed by the metadata of each selected dataset.

The renderer chunk's bare Three.js imports are rewritten to project-local relative URLs so it works without an import map in embedded browsers. OrbitControls.js is copied from the same vendored Three.js r180 distribution with its import made relative.

The renderer's Three.js addons are sourced from the official Three.js r180 repository and included locally: GLTFLoader and BufferGeometryUtils.

The Draco decoder assets come from Three.js r180's xamples/jsm/libs/draco bundle; the upstream Google Draco license is included in draco/LICENSE.
