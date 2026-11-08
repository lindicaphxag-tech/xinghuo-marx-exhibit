"""Build a present-day LiDAR DSM surface mesh around the former St Martin's Hall site."""
from __future__ import annotations
import os, sys, urllib.request
from pathlib import Path
import numpy as np
from PIL import Image
import trimesh
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'assets/scenes/st_martins_hall_current_dsm.glb'
URL='https://data.source.coop/rebalance-earth/ea-dem/FZ_DSM/DEFLATE/TQ38sw_FZ_DSM_1m.tif'
CACHE=Path(os.environ.get('TEMP','/tmp'))/'TQ38sw_FZ_DSM_1m.tif'
EXPECTED_BYTES=90463897
if not CACHE.exists() or CACHE.stat().st_size!=EXPECTED_BYTES:
 CACHE.parent.mkdir(parents=True,exist_ok=True)
 request=urllib.request.Request(URL,headers={'User-Agent':'HistoricalSpacesExhibit/1.0 (open-data attribution preserved)'})
 with urllib.request.urlopen(request,timeout=180) as response, CACHE.open('wb') as output:
  while chunk:=response.read(1024*1024): output.write(chunk)
if CACHE.stat().st_size!=EXPECTED_BYTES: raise SystemExit(f'Incomplete DSM source: {CACHE.stat().st_size}')
# Former St Martin’s Hall location between Long Acre and Wilson Street; current 90 Long Acre block.
# Address point for 90 Long Acre from GLA National Grid data: EPSG:27700 (530313,181149).
center_e,center_n=530313.0,181149.0
half,step=300,2
col0=round(center_e-half-530000)
row0=round(185000-(center_n+half))
with Image.open(CACHE) as im:
 raw=np.asarray(im.crop((col0,row0,col0+2*half,row0+2*half)),dtype=np.float32)[::step,::step]
valid=np.isfinite(raw)&(raw>-1e30)
if raw.shape!=(300,300) or valid.mean()<0.98: raise SystemExit(f'Unexpected crop {raw.shape}, valid={valid.mean():.3f}')
# 2 m sampled DSM; no vertical exaggeration. DSM captures top surfaces, not vertical facades.
base=float(np.percentile(raw,5)); scale=.01
rows,cols=np.indices(raw.shape)
vertices=np.column_stack(((cols.ravel()*step-half)*scale,(raw.ravel()-base)*scale,(rows.ravel()*step-half)*scale))
w=raw.shape[1]; faces=[]
for r in range(raw.shape[0]-1):
 i=r*w
 for c in range(w-1):
  q=i+c; faces.extend(((q,q+w,q+1),(q+1,q+w,q+w+1)))
mesh=trimesh.Trimesh(vertices=vertices,faces=np.asarray(faces,dtype=np.int32),process=False)
# Cartographic height palette; not photographic texture.
lo,hi=np.percentile(raw,[5,95]); n=np.clip((raw.ravel()-lo)/(hi-lo+1e-6),0,1)
a=np.array([115,137,119],dtype=np.float32); b=np.array([179,167,145],dtype=np.float32)
color=(a[None,:]*(1-n[:,None])+b[None,:]*n[:,None]).astype(np.uint8)
mesh.visual.vertex_colors=np.column_stack((color,np.full(len(color),255,dtype=np.uint8)))
sc=trimesh.Scene(mesh); sc.metadata.update({'source':URL,'license':'Open Government Licence v3.0','native_resolution_m':1,'mesh_sampling_m':step,'extent_m':600,'vertical_exaggeration':1,'crs':'EPSG:27700','vertical_datum':'Ordnance Datum Newlyn','representation':'present-day DSM top surface; no facade geometry'})
OUT.parent.mkdir(parents=True,exist_ok=True);sc.export(OUT)
print(f'Wrote {OUT} ({OUT.stat().st_size:,} bytes); {len(vertices):,} vertices, {len(faces):,} triangles; elevation {raw.min():.1f}–{raw.max():.1f} m ODN')

