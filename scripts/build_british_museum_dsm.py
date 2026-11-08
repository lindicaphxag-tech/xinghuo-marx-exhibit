"""Build a measured present-day DSM mesh around the British Museum from EA 1 m LiDAR."""
from __future__ import annotations

import os
import sys
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image
import trimesh

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "assets/scenes/british_museum_current_dsm.glb"
CACHE_DIR = Path(os.environ.get("TEMP", "/tmp"))
TILES = {
    "TQ28se": ("https://data.source.coop/rebalance-earth/ea-dem/FZ_DSM/DEFLATE/TQ28se_FZ_DSM_1m.tif", 92391518),
    "TQ38sw": ("https://data.source.coop/rebalance-earth/ea-dem/FZ_DSM/DEFLATE/TQ38sw_FZ_DSM_1m.tif", 90463897),
}


def fetch_tile(name: str) -> Path:
    url, expected_bytes = TILES[name]
    cache = CACHE_DIR / f"{name}_FZ_DSM_1m.tif"
    if not cache.exists() or cache.stat().st_size != expected_bytes:
        request = urllib.request.Request(url, headers={"User-Agent": "HistoricalSpacesExhibit/1.0 (open-data attribution preserved)"})
        with urllib.request.urlopen(request, timeout=180) as response, cache.open("wb") as output:
            while chunk := response.read(1024 * 1024):
                output.write(chunk)
    if cache.stat().st_size != expected_bytes:
        raise SystemExit(f"Incomplete {name} DSM source: {cache.stat().st_size} bytes")
    return cache


# British Museum Reading Room, approximate public map location in EPSG:27700.
# The 500 m crop crosses the western edge of TQ38sw into adjacent TQ28se.
center_e, center_n = 530057.0, 181716.0
half, step = 250, 2
east_edge = center_e + half
north_edge = center_n + half
row0 = round(185000 - north_edge)
west_width = round(530000 - (center_e - half))
east_width = 2 * half - west_width
if not (0 < west_width < 2 * half and east_width > 0):
    raise SystemExit("The configured crop no longer crosses the expected LiDAR tile boundary")

west_path, east_path = fetch_tile("TQ28se"), fetch_tile("TQ38sw")
with Image.open(west_path) as west_image, Image.open(east_path) as east_image:
    west = np.asarray(west_image.crop((5000 - west_width, row0, 5000, row0 + 2 * half)), dtype=np.float32)
    east = np.asarray(east_image.crop((0, row0, east_width, row0 + 2 * half)), dtype=np.float32)
elevation = np.concatenate((west, east), axis=1)[::step, ::step]
valid = np.isfinite(elevation) & (elevation > -1e30)
if elevation.shape != (250, 250) or valid.mean() < 0.98:
    raise SystemExit(f"Unexpected DSM crop: shape={elevation.shape}, valid={valid.mean():.3f}")

# 2 m sample spacing; no vertical exaggeration. DSM is a top-surface model, not facades.
base = float(np.percentile(elevation[valid], 5))
scale = 0.01
rows, cols = np.indices(elevation.shape)
vertices = np.column_stack(((cols.ravel() * step - half) * scale,
                            (elevation.ravel() - base) * scale,
                            (rows.ravel() * step - half) * scale))
width = elevation.shape[1]
faces = []
for row in range(elevation.shape[0] - 1):
    start = row * width
    for col in range(width - 1):
        index = start + col
        faces.extend(((index, index + width, index + 1), (index + 1, index + width, index + width + 1)))
mesh = trimesh.Trimesh(vertices=vertices, faces=np.asarray(faces, dtype=np.int32), process=False)

# A restrained elevation palette is cartographic coloring, not photographic texture.
low, high = np.percentile(elevation[valid], [5, 95])
normalized = np.clip((elevation.ravel() - low) / (high - low + 1e-6), 0, 1)
low_color = np.array([115, 137, 119], dtype=np.float32)
high_color = np.array([179, 167, 145], dtype=np.float32)
color = (low_color[None, :] * (1 - normalized[:, None]) + high_color[None, :] * normalized[:, None]).astype(np.uint8)
mesh.visual.vertex_colors = np.column_stack((color, np.full(len(color), 255, dtype=np.uint8)))

scene = trimesh.Scene(mesh)
scene.metadata.update({
    "source": "Environment Agency National LiDAR Programme; 1 m First Return Digital Surface Model",
    "source_tiles": ["TQ28se_FZ_DSM_1m.tif", "TQ38sw_FZ_DSM_1m.tif"],
    "source_url": "https://environment.data.gov.uk/survey",
    "license": "Open Government Licence v3.0",
    "attribution": "Contains public sector information licensed under the Open Government Licence v3.0",
    "native_resolution_m": 1,
    "mesh_sample_spacing_m": step,
    "horizontal_extent_m": 2 * half,
    "vertical_exaggeration": 1,
    "vertical_datum": "Ordnance Datum Newlyn",
    "crs": "EPSG:27700",
    "representation": "present-day DSM top surface; roof, vegetation and ground returns; no facades or interior",
})
OUT.parent.mkdir(parents=True, exist_ok=True)
scene.export(OUT)
print(f"Wrote {OUT} ({OUT.stat().st_size:,} bytes); {len(vertices):,} vertices, {len(faces):,} triangles; valid={valid.mean():.3%}; elevation {elevation[valid].min():.1f}–{elevation[valid].max():.1f} m ODN")
