"""Build a measured present-day Kennington Park terrain mesh from 1 m EA LiDAR DTM."""
from __future__ import annotations
import os, sys, urllib.request
from pathlib import Path
import numpy as np
from PIL import Image
import trimesh

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'assets/scenes/kennington_common_current_terrain.glb'
URL = 'https://data.source.coop/rebalance-earth/ea-dem/DTM/DEFLATE/TQ37nw_DTM_1m.tif'
CACHE = Path(os.environ.get('TEMP', '/tmp')) / 'TQ37nw_DTM_1m.tif'
EXPECTED_BYTES = 74832467
if not CACHE.exists() or CACHE.stat().st_size != EXPECTED_BYTES:
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(URL, headers={"User-Agent": "HistoricalSpacesExhibit/1.0 (open-data attribution preserved)"})
    with urllib.request.urlopen(request, timeout=180) as response, CACHE.open("wb") as output:
        while chunk := response.read(1024 * 1024):
            output.write(chunk)
if CACHE.stat().st_size != EXPECTED_BYTES:
    raise SystemExit(f'Incomplete source COG: {CACHE.stat().st_size} bytes')
# 1 m native DTM; make an 800 m square for a manageable and inspectable local model.
# BNG tile origin is (530000, 180000), row 0 at the north edge.
center_e, center_n = 531689.8334406407, 177373.85623648844
half, step = 400, 2
col0 = round(center_e - half - 530000)
row0 = round(180000 - (center_n + half))
width = 2 * half
with Image.open(CACHE) as image:
    elevation = np.asarray(image.crop((col0, row0, col0 + width, row0 + width)), dtype=np.float32)[::step, ::step]
if elevation.shape != (400, 400) or not np.isfinite(elevation).all() or np.min(elevation) < -100:
    raise SystemExit(f'Unexpected DTM crop: shape={elevation.shape}, min={np.nanmin(elevation)}')
# Normalize height for a clear but restrained relief; horizontal coordinates use 1 world unit = 0.01 m.
base = float(np.median(elevation))
scale_xy, vertical_exaggeration = 0.01, 5.0
rows, cols = np.indices(elevation.shape)
vertices = np.column_stack(((cols.ravel() * step - half) * scale_xy,
                            (elevation.ravel() - base) * scale_xy * vertical_exaggeration,
                            (rows.ravel() * step - half) * scale_xy))
w, h = elevation.shape[1], elevation.shape[0]
faces=[]
for r in range(h-1):
    a=r*w
    for c in range(w-1):
        i=a+c
        faces.extend(((i,i+w,i+1),(i+1,i+w,i+w+1)))
mesh=trimesh.Trimesh(vertices=vertices,faces=np.asarray(faces,dtype=np.int32),process=False)
# Elevation tint is a cartographic palette, not photographic texture.
normalized=np.clip((elevation.ravel()-np.percentile(elevation,5))/(np.percentile(elevation,95)-np.percentile(elevation,5)+1e-6),0,1)
low=np.array([119,145,110],dtype=np.float32); high=np.array([199,185,139],dtype=np.float32)
colors=low[None,:]*(1-normalized[:,None])+high[None,:]*normalized[:,None]
mesh.visual.vertex_colors=np.column_stack((colors.astype(np.uint8),np.full(len(colors),255,dtype=np.uint8)))
scene=trimesh.Scene(mesh)
scene.metadata.update({'source':URL,'license':'Open Government Licence v3.0','native_resolution_m':1,'mesh_sample_spacing_m':step,'horizontal_extent_m':800,'vertical_exaggeration':vertical_exaggeration,'vertical_datum':'Ordnance Datum Newlyn','crs':'EPSG:27700'})
OUT.parent.mkdir(parents=True,exist_ok=True)
scene.export(OUT)
print(f'Wrote {OUT} ({OUT.stat().st_size:,} bytes), {len(vertices):,} vertices, {len(faces):,} triangles; elevation {elevation.min():.2f}–{elevation.max():.2f} m ODN')


