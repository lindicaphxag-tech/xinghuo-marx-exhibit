"""Build a present-day EA LiDAR DSM mesh around Mytholme Mill."""
from __future__ import annotations

import os
import sys
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image
import trimesh

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "assets/scenes/mytholme_mill_current_dsm.glb"
URL = "https://data.source.coop/rebalance-earth/ea-dem/FZ_DSM/DEFLATE/SD99ne_FZ_DSM_1m.tif"
CACHE = Path(os.environ.get("TEMP", "/tmp")) / "SD99ne_FZ_DSM_1m.tif"
EXPECTED_BYTES = 93_910_109

if not CACHE.exists() or CACHE.stat().st_size != EXPECTED_BYTES:
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(URL, headers={"User-Agent": "HistoricalSpacesExhibit/1.0 (open-data attribution preserved)"})
    with urllib.request.urlopen(request, timeout=180) as response, CACHE.open("wb") as output:
        while chunk := response.read(1024 * 1024):
            output.write(chunk)
if CACHE.stat().st_size != EXPECTED_BYTES:
    raise SystemExit(f"Incomplete DSM source: {CACHE.stat().st_size} bytes")

# Mytholme Mill, Saddleworth: British National Grid reference SD 99483 06291.
# Source COG tile SD99ne spans E=395000..400000, N=405000..410000.
center_e, center_n = 399_483.0, 406_291.0
half, step = 300, 2
col0 = round(center_e - half - 395_000)
row0 = round(410_000 - (center_n + half))
with Image.open(CACHE) as image:
    dsm = np.asarray(image.crop((col0, row0, col0 + 2 * half, row0 + 2 * half)), dtype=np.float32)[::step, ::step]
valid = np.isfinite(dsm) & (dsm > -1e30)
if dsm.shape != (300, 300) or valid.mean() < 0.98:
    raise SystemExit(f"Unexpected DSM crop: shape={dsm.shape}, valid={valid.mean():.3f}")

# Horizontal and vertical dimensions use the same scale; the DSM remains a
# measured roof/canopy surface, not an invented facade or historical mesh.
base = float(np.percentile(dsm, 5))
scale = 0.01
rows, cols = np.indices(dsm.shape)
vertices = np.column_stack(((cols.ravel() * step - half) * scale,
                            (dsm.ravel() - base) * scale,
                            (rows.ravel() * step - half) * scale))
width = dsm.shape[1]
faces = []
for row in range(dsm.shape[0] - 1):
    start = row * width
    for col in range(width - 1):
        i = start + col
        faces.extend(((i, i + width, i + 1), (i + 1, i + width, i + width + 1)))
mesh = trimesh.Trimesh(vertices=vertices, faces=np.asarray(faces, dtype=np.int32), process=False)
lo, hi = np.percentile(dsm, [5, 95])
shade = np.clip((dsm.ravel() - lo) / (hi - lo + 1e-6), 0, 1)
low = np.array([112, 139, 123], dtype=np.float32)
high = np.array([190, 177, 148], dtype=np.float32)
rgb = (low[None, :] * (1 - shade[:, None]) + high[None, :] * shade[:, None]).astype(np.uint8)
mesh.visual.vertex_colors = np.column_stack((rgb, np.full(len(rgb), 255, dtype=np.uint8)))

scene = trimesh.Scene(mesh)
scene.metadata.update({
    "source": URL,
    "license": "Open Government Licence v3.0",
    "producer": "Environment Agency",
    "native_resolution_m": 1,
    "mesh_sampling_m": step,
    "extent_m": 600,
    "vertical_exaggeration": 1,
    "crs": "EPSG:27700",
    "vertical_datum": "Ordnance Datum Newlyn",
    "representation": "present-day DSM top surface; no facade geometry",
})
OUT.parent.mkdir(parents=True, exist_ok=True)
scene.export(OUT)
print(f"Wrote {OUT} ({OUT.stat().st_size:,} bytes); {len(vertices):,} vertices, {len(faces):,} triangles; elevation {dsm.min():.1f}–{dsm.max():.1f} m ODN")
