"""Build evidence-constrained, interactive historical-space reconstructions for the exhibit.

These models are interpretive geometry constrained by documented sources; they are not site scans or measured digital twins.
Run with: python build_history_scenes.py [output_dir]
"""
from __future__ import annotations

import os
import sys
import numpy as np
import trimesh

OUT = sys.argv[1] if len(sys.argv) > 1 else "assets/scenes"
os.makedirs(OUT, exist_ok=True)

PALETTE = {
    "floor": [73, 65, 56, 255], "stone": [133, 119, 99, 255],
    "brick": [115, 65, 48, 255], "brick_light": [151, 87, 61, 255],
    "wood": [91, 58, 37, 255], "wood_light": [141, 100, 62, 255],
    "iron": [48, 54, 53, 255], "iron_light": [104, 111, 104, 255],
    "glass": [38, 51, 53, 255], "paper": [211, 194, 151, 255],
    "red": [154, 42, 38, 255], "linen": [188, 174, 145, 255],
    "chalk": [218, 211, 184, 255], "gold": [192, 151, 75, 255],
    "roof": [82, 83, 77, 255],
}

def box(scene, name, center, size, color):
    mesh = trimesh.creation.box(extents=size)
    mesh.apply_translation(center)
    rgba = PALETTE.get(color, color) if isinstance(color, str) else color
    mesh.visual.face_colors = np.tile(np.asarray(rgba, dtype=np.uint8), (len(mesh.faces), 1))
    add_geometry(scene, mesh, name)

def add_geometry(scene, mesh, name):
    """Give repeated architectural modules unique geometry names.

    Trimesh reuses an existing geometry when geom_name repeats. The old
    exporter silently replaced repeated windows, columns, looms and trees
    with the last copy, leaving scenes nearly empty. Unique names preserve
    every authored component before the final mesh merge.
    """
    key = f"{name}-{len(scene.geometry):05d}"
    scene.add_geometry(mesh, node_name=key, geom_name=key)

def oriented_box(scene, name, center, size, angle, color):
    mesh = trimesh.creation.box(extents=size)
    mesh.apply_transform(trimesh.transformations.rotation_matrix(angle, [0, 1, 0]))
    mesh.apply_translation(center)
    rgba = PALETTE.get(color, color) if isinstance(color, str) else color
    mesh.visual.face_colors = np.tile(np.asarray(rgba, dtype=np.uint8), (len(mesh.faces), 1))
    add_geometry(scene, mesh, name)

def cylinder(scene, name, center, radius, height, color, sections=12):
    mesh = trimesh.creation.cylinder(radius=radius, height=height, sections=sections)
    mesh.apply_transform(trimesh.transformations.rotation_matrix(np.pi / 2, [1, 0, 0]))
    mesh.apply_translation(center)
    rgba = PALETTE.get(color, color)
    mesh.visual.face_colors = np.tile(np.asarray(rgba, dtype=np.uint8), (len(mesh.faces), 1))
    add_geometry(scene, mesh, name)

def beam(scene, name, a, b, width, color):
    a, b = np.asarray(a, dtype=float), np.asarray(b, dtype=float)
    delta = b - a
    length = np.linalg.norm(delta)
    mesh = trimesh.creation.box(extents=[width, length, width])
    mesh.apply_transform(trimesh.geometry.align_vectors([0, 1, 0], delta))
    mesh.apply_translation((a + b) / 2)
    mesh.visual.face_colors = np.tile(np.asarray(PALETTE[color], dtype=np.uint8), (len(mesh.faces), 1))
    add_geometry(scene, mesh, name)

def triangle_prism(scene, name, center, width, height, depth, color):
    """Simple gable/pediment prism in the XY plane, with its front at -Z."""
    x, y, z = center
    verts = np.array([
        [x-width/2, y-height/2, z-depth/2], [x+width/2, y-height/2, z-depth/2], [x, y+height/2, z-depth/2],
        [x-width/2, y-height/2, z+depth/2], [x+width/2, y-height/2, z+depth/2], [x, y+height/2, z+depth/2],
    ])
    faces = np.array([[0,1,2],[5,4,3],[0,3,4],[0,4,1],[1,4,5],[1,5,2],[2,5,3],[2,3,0]])
    mesh = trimesh.Trimesh(vertices=verts, faces=faces, process=False)
    rgba = PALETTE.get(color, color) if isinstance(color, str) else color
    mesh.visual.face_colors = np.tile(np.asarray(rgba, dtype=np.uint8), (len(mesh.faces), 1))
    add_geometry(scene, mesh, name)

def window(scene, prefix, x, y, z, w, h, color="glass"):
    box(scene, prefix+"-recess", (x, y, z), (0.08, h, w), color)
    box(scene, prefix+"-sill", (x+0.07, y-h/2, z), (0.22, 0.09, w+0.22), "stone")
    box(scene, prefix+"-lintel", (x+0.07, y+h/2, z), (0.22, 0.09, w+0.22), "stone")
    box(scene, prefix+"-mullion-v", (x+0.12, y, z), (0.12, h, 0.07), "wood_light")
    box(scene, prefix+"-mullion-h", (x+0.12, y, z), (0.12, 0.07, w), "wood_light")

def commune():
    s = trimesh.Scene()
    box(s,"old-hotel-de-ville-square",(0,-.2,0),(17,.4,12),[128,119,104,255])
    # Pre-1871 plan-relief constrained by Carnavalet PM55: eight pavilions,
    # three courts (one glazed), plus a garden by the river.
    box(s,"old-city-hall-north-wing",(0,1.85,-4.15),(12.8,3.7,.9),[187,166,133,255])
    box(s,"old-city-hall-south-wing",(0,1.85,4.15),(12.8,3.7,.9),[187,166,133,255])
    box(s,"old-city-hall-west-wing",(-6.0,1.85,0),(.9,3.7,7.4),[187,166,133,255])
    box(s,"old-city-hall-east-wing",(6.0,1.85,0),(.9,3.7,7.4),[187,166,133,255])
    box(s,"glazed-courtyard-roof",(0,3.85,0),(4.4,.12,3.4),[130,157,154,255])
    for x in (-2.2,2.2):
        box(s,"courtyard-divider",(x,1.35,0),(.2,2.7,6.8),[174,152,122,255])
    for x in (-2.15,2.15):
        for z in (-1.65,1.65): cylinder(s,"courtyard-iron-post",(x,2.6,z),.07,2.5,"iron",10)
    for x,z in [(-3.6,-2.4),(3.6,-2.4),(-3.6,2.4),(3.6,2.4),(0,-4.15),(0,4.15),(-6,0),(6,0)]:
        box(s,"old-hotel-pavilion",(x,2.65,z),(2.4,5.3,2.2),[196,176,142,255])
        box(s,"pavilion-roof",(x,5.45,z),(2.65,.36,2.45),"stone")
        triangle_prism(s,"pavilion-pediment",(x,5.88,z-1.0),2.3,.9,.35,"linen")
        for y in (1.7,3.6): window(s,"pavilion-window",x,y,z-1.12,.72,1.05,"glass")
    for x in np.linspace(-5.0,5.0,9):
        for y in (1.25,2.65): window(s,"renaissance-window",x,y,-4.64,.72,.88,"glass")
    box(s,"riverside-garden",(0,.03,6.7),(13,.12,1.6),[96,123,78,255])
    for x in np.linspace(-6.2,6.2,19):
        cylinder(s,"garden-tree-trunk",(x,.7,6.85),.08,1.2,"wood",8)
        crown=trimesh.creation.icosphere(subdivisions=1,radius=.42); crown.apply_translation((x,1.45,6.85))
        crown.visual.face_colors=np.tile(np.array([91,117,73,255],dtype=np.uint8),(len(crown.faces),1)); add_geometry(s,crown,"garden-tree-crown")
    for x in np.linspace(-7.4,7.4,20): box(s,"garden-railing",(x,.45,5.8),(.08,.9,.08),"iron")
    return s

def shanghai_machine_weaving():
    s = trimesh.Scene()
    # Main mill dimensions are reported as 550 x 80 ft (about 167.6 x 24.4 m),
    # three storeys. The available sources do not provide a measured plan or
    # machine layout. The near long facade is deliberately sectioned for
    # visibility; repeated loom symbols are interpretive, not an inventory.
    length, width, storey = 167.64, 24.38, 4.0
    half_l, half_w = length / 2, width / 2
    total_h = storey * 3
    box(s,"mill-footprint-plinth",(0,-.25,0),(length+.8,.5,width+.8),"stone")
    for floor in range(3):
        y=floor*storey
        box(s,"mill-floor-deck",(0,y+.08,0),(length,.16,width),[130,104,74,255])
        # Rear windows are openings through a segmented masonry wall, not dark
        # panes laid over solid brick. Bay count remains a visualization choice.
        window_centers=np.linspace(-half_l+2.0,half_l-2.0,43)
        rear_z=-half_w
        box(s,"mill-rear-wall-spandrel-lower",(0,y+.6625,rear_z),(length,1.325,.42),"brick")
        box(s,"mill-rear-wall-spandrel-upper",(0,y+3.4875,rear_z),(length,1.025,.42),"brick")
        wall_edge=-half_l
        for wx in window_centers:
            left=wx-1.025
            if left>wall_edge:
                box(s,"mill-rear-window-pier",((wall_edge+left)/2,y+storey/2,rear_z),(left-wall_edge,storey,.42),"brick")
            wall_edge=wx+1.025
        if wall_edge<half_l:
            box(s,"mill-rear-window-pier",((wall_edge+half_l)/2,y+storey/2,rear_z),(half_l-wall_edge,storey,.42),"brick")
        for end_x in (-half_l,half_l):
            box(s,"mill-end-wall",(end_x,y+storey/2,0),(.42,storey,width),"brick")
        # The south/river-facing facade is shown as an open cutaway.
        for x in np.linspace(-half_l+1.5,half_l-1.5,57):
            box(s,"cutaway-facade-pier",(x,y+storey/2,half_w),(.42,storey,.42),"brick_light")
        # Reported large factory openings are represented as repeated bays;
        # exact bay count and profiles remain unknown pending original plans.
        for x in window_centers:
            box(s,"rear-window-glazing",(x,y+2.15,-half_w+.21),(1.91,1.49,.05),"glass")
            for dx in (-1.025,1.025):
                box(s,"rear-window-jamb",(x+dx,y+2.15,-half_w+.21),(.11,1.72,.52),"stone")
            box(s,"rear-window-sill",(x,y+1.325,-half_w+.21),(2.18,.14,.52),"stone")
            box(s,"rear-window-lintel",(x,y+2.975,-half_w+.21),(2.18,.14,.52),"stone")
        for x in np.linspace(-half_l+2.0,half_l-2.0,43):
            cylinder(s,"cast-iron-column",(x,y+storey/2,0),.16,storey-.35,"iron",10)
        # Two machine rows show the production principle, not documented
        # individual machine positions or a complete plant inventory.
        for x in np.linspace(-half_l+7,half_l-7,20):
            for z in (-4.0,4.0):
                box(s,"illustrative-loom-frame",(x,y+1.12,z),(.85,1.65,1.8),"iron_light")
                for dx in (-.34,.34):
                    cylinder(s,"illustrative-loom-spindle",(x+dx,y+1.15,z),.12,1.55,"iron",10)
                box(s,"illustrative-loom-beam",(x,y+2.05,z),(.9,.12,1.9),"wood_light")
        if floor < 2:
            for x in np.linspace(-half_l+1.5,half_l-1.5,57):
                box(s,"storey-belt-course",(x,y+storey,half_w),(.5,.16,.45),"stone")
    # Light roof volume marks the three-storey block; roof construction is
    # intentionally restrained because a measured roof drawing was not found.
    box(s,"mill-roof",(0,total_h+.3,0),(length+.8,.6,width+.8),"wood")
    # Interpretive entrance gate based on the Shanghai Textile Museum scale
    # model photograph (Coolmanjackey, CC BY-SA 3.0). This is a visual
    # reconstruction of one photographed model view, not a measured original
    # gate; dimensions and the unseen sides are not claimed as historical fact.
    gate_z = -half_w - 4.2
    gate_width, gate_height = 22.0, 8.2
    gate_color = [164, 147, 119, 255]
    roof_color = "roof"
    # Low side walls and piers leave three arched portals open.
    box(s,"gate-west-wing",(-9.4,2.0,gate_z),(3.2,4.0,.85),gate_color)
    box(s,"gate-east-wing",(9.4,2.0,gate_z),(3.2,4.0,.85),gate_color)
    for x in (-7.8,-4.0,0.0,4.0,7.8):
        box(s,"gate-pier",(x,3.0,gate_z),(0.55,6.0,1.05),"stone")
    # Segmented semicircular archivolts make the three openings legible in 3D.
    for center_x, radius, spring_y in ((-5.9,1.7,3.35),(0.0,2.0,3.4),(5.9,1.7,3.35)):
        for angle in np.linspace(0, np.pi, 11):
            x0=center_x+radius*np.cos(angle); y0=spring_y+radius*np.sin(angle)
            x1=center_x+radius*np.cos(angle+np.pi/10); y1=spring_y+radius*np.sin(angle+np.pi/10)
            beam(s,"gate-arch-stone",(x0,y0,gate_z),(x1,y1,gate_z),.42,"stone")
    box(s,"gate-entablature",(0,6.65,gate_z),(gate_width,1.0,1.25),"wood")
    # Pitched, upturned-eave roof silhouette, informed by the photographed
    # museum model. Simplified roof geometry is explicitly interpretive.
    ridge_y, eave_y = 8.0, 6.85
    beam(s,"gate-roof-north-slope",(0,ridge_y,gate_z-3.8),(0,eave_y,gate_z-6.1),.34,roof_color)
    beam(s,"gate-roof-south-slope",(0,ridge_y,gate_z+3.8),(0,eave_y,gate_z+6.1),.34,roof_color)
    box(s,"gate-roof-ridge",(0,ridge_y,gate_z),(gate_width+.8,.28,.4),roof_color)
    for z in (gate_z-6.1,gate_z+6.1):
        box(s,"gate-eave",(0,eave_y,z),(gate_width+2.2,.35,.42),roof_color)
    for x in np.linspace(-gate_width/2,gate_width/2,13):
        beam(s,"gate-roof-rafter",(x,ridge_y,gate_z),(x,eave_y,gate_z-6.0),.12,roof_color)
        beam(s,"gate-roof-rafter",(x,ridge_y,gate_z),(x,eave_y,gate_z+6.0),.12,roof_color)
    for x in (-gate_width/2-1.1, gate_width/2+1.1):
        beam(s,"gate-upturned-eave",(x,eave_y,gate_z-6.0),(x,eave_y+1.0,gate_z-6.5),.28,roof_color)
        beam(s,"gate-upturned-eave",(x,eave_y,gate_z+6.0),(x,eave_y+1.0,gate_z+6.5),.28,roof_color)
    # A neutral plaque marks the documented name without synthesizing signage.
    box(s,"gate-name-plaque",(0,5.3,gate_z+.57),(5.8,.62,.18),"paper")
    # Directional geography only: the complex is documented by the Huangpu;
    # no false-precision shoreline offset is implied.
    box(s,"huangpu-river-reference",(0,-.55,half_w+9),(length,.08,8),[75,111,125,255])
    box(s,"river-label-plinth",(0,-.4,half_w+4),(length,.06,.18),"gold")
    return s

def chartist_common():
    s = trimesh.Scene()
    # An open recreation of the pre-1854 common, not the later landscaped park.
    box(s,"common-earth",(0,-.28,0),(16,.5,12),[110,126,84,255])
    for x,z in [(-5,-4),(-2,-4),(2,-4),(5,-4),(-5,4),(-2,4),(2,4),(5,4)]:
        box(s,"common-grass-patch",(x,-.015,z),(2.1,.045,1.5),[124,139,91,255])
    # The 1848 photographs cover only a small portion of the common. View
    # markers make that evidentiary limit visible instead of inventing a stage.
    for x in (-6.7,6.7):
        box(s,"common-road-edge",(x,.015,0),(.65,.055,11.8),[105,98,85,255])
    for x,z in [(-6,-5.2),(6,-5.2),(-6,5.2),(6,5.2)]:
        cylinder(s,"photograph-viewpoint-marker",(x,.12,z),.18,.24,"gold",12)
    # Crowd is a low-detail analytical layer; layout is explicitly illustrative.
    for row,z in enumerate(np.linspace(-2.7,2.6,7)):
        for col,x in enumerate(np.linspace(-5.6,5.6,15)):
            if (row * 3 + col * 5) % 7 == 0: continue
            xx=x+(0.18 if row%2 else 0); shade="iron_light" if (row+col)%3 else "wood_light"
            cylinder(s,"crowd-body",(xx,.52,z),.13,.72,shade,8)
            head=trimesh.creation.icosphere(subdivisions=1, radius=.105); head.apply_translation((xx,.94,z))
            head.visual.face_colors=np.tile(np.array([190,166,133,255],dtype=np.uint8),(len(head.faces),1))
            add_geometry(s,head,"crowd-head")
    for x,z in [(-6.2,0),(6.2,0)]:
        box(s,"evidence-view-cone-base",(x,.12,0),(.42,.2,.42),"gold")
    return s

def paris_1848_street():
    s = trimesh.Scene()
    box(s,"rue-saint-martin-cobblestones",(0,-.2,0),(14,.4,11),[120,111,96,255])
    for side in (-1,1):
        x=side*5.8; face_x=x-side*1.05
        # Four-storey pre-Haussmann street wall, with differentiated ground floor.
        box(s,"street-building-masonry",(x,4.0,0),(2.1,8.0,11),[177,158,129,255])
        for floor_y in (1.65,3.45,5.25,7.05):
            for z in (-4.1,-1.65,.8,3.25):
                window(s,"tall-paris-window",face_x,floor_y,z,.82,1.25,"glass")
                box(s,"window-shutter-left",(face_x+side*.08,floor_y,z-.49),(.11,1.08,.15),"wood_light")
                box(s,"window-shutter-right",(face_x+side*.08,floor_y,z+.49),(.11,1.08,.15),"wood_light")
            box(s,"continuous-stone-stringcourse",(face_x,floor_y+.84,0),(.16,.12,10.9),"stone")
        box(s,"paris-shopfront",(face_x,.9,0),(.28,1.75,10.8),"wood")
        for z in (-3.5,-1.1,1.3,3.7):
            box(s,"shop-display-glass",(face_x-side*.17,.95,z),(.08,1.15,1.35),"glass")
            box(s,"shop-awning",(face_x-side*.36,1.72,z),(.75,.12,1.55),"linen")
        box(s,"mansard-roof",(x,8.35,0),(2.35,.65,11.2),"wood")
        for z in (-3.4,-.7,2.0):
            box(s,"roof-dormer",(face_x,8.55,z),(.35,.72,.75),"stone")
            box(s,"dormer-window",(face_x-side*.19,8.53,z),(.06,.4,.42),"glass")
    # The Carnavalet drawing shows a broad, irregular barricade across the
    # carriageway, built from paving stones, timber and overturned carts.
    # Dimensions and hidden faces remain interpretive; the image fixes the
    # composition, not a surveyable street width or exact junction.
    xs=np.linspace(-4.25,4.25,10)
    for row,z in enumerate((1.05,1.55,2.0)):
        for col,x in enumerate(xs):
            if (col+row)%4==0 and row>0: continue
            size=(.72+(.14*((col*3+row)%3)),.42,.62)
            y=.28+row*.42+(.16*((col+row)%2))
            box(s,"barricade-paving-course",(x,y,z),size,"stone" if (col+row)%3 else "brick_light")
    # A toppled handcart spans the barrier; wheels are separated across the
    # street axis as in the source drawing. These are graphic, not measured.
    box(s,"overturned-cart-bed",(0,1.12,1.16),(3.6,.2,.9),"wood")
    beam(s,"cart-side-rail-left",(-1.8,1.4,.86),(1.8,1.4,.86),.12,"wood_light")
    beam(s,"cart-side-rail-right",(-1.8,1.4,1.45),(1.8,1.4,1.45),.12,"wood_light")
    for x in (-1.42,1.42):
        cylinder(s,"cart-wheel",(x,.76,1.36),.68,.16,"wood_light",20)
        cylinder(s,"cart-wheel-hub",(x,.76,1.36),.14,.19,"iron",12)
    for i,(a,b,c) in enumerate([
        ((-4.3,.9,.7),(4.0,1.5,1.7),.16),
        ((-3.8,1.15,1.8),(3.9,.8,1.05),.13),
        ((-2.9,1.8,1.1),(2.7,.95,2.35),.12),
        ((-.2,1.65,.8),(2.1,1.2,2.3),.14),
        ((-4.0,.95,2.2),(-1.7,1.75,.85),.12),
    ]):
        beam(s,"crossed-barricade-timber-"+str(i),a,b,c,"wood")
    # Source image includes a horse at the right foreground. Low-poly body
    # is included as a visual cue only; it is not a reconstruction of a known
    # individual animal or exact pose.
    horse_body=trimesh.creation.icosphere(subdivisions=2,radius=1)
    horse_body.apply_scale([.82,.42,.32]); horse_body.apply_translation((4.55,.68,-2.15))
    horse_body.visual.face_colors=np.tile(np.array([116,105,87,255],dtype=np.uint8),(len(horse_body.faces),1)); add_geometry(s,horse_body,"horse-body-illustrative")
    horse_head=trimesh.creation.icosphere(subdivisions=1,radius=.26); horse_head.apply_scale([.72,1.45,.82]); horse_head.apply_translation((3.9,1.12,-2.15))
    horse_head.visual.face_colors=np.tile(np.array([116,105,87,255],dtype=np.uint8),(len(horse_head.faces),1)); add_geometry(s,horse_head,"horse-head-illustrative")
    beam(s,"horse-neck",(4.15,.88,-2.15),(3.92,1.11,-2.15),.22,"stone")
    for lx in (4.05,4.38,4.84,5.08):
        beam(s,"horse-leg",(lx,.53,-2.15),(lx+(.08 if lx<4.6 else -.08),.08,-2.15),.1,"stone")
    box(s,"street-lamp-base",(-3.6,.25,-1.8),(.5,.5,.5),"iron")
    beam(s,"street-lamp",(-3.6,.45,-1.8),(-3.6,4.5,-1.8),.12,"iron")
    box(s,"street-lantern",(-3.6,4.45,-1.8),(.55,.45,.55),"gold")
    return s

def international_printshop():
    s = trimesh.Scene()
    # St Martin's Hall main room, scaled at 0.1 model units per foot from
    # The Builder's 1853 description (121 ft 6 in x 55 ft 5 in x 40 ft).
    # X is the long axis: galleries run along both long walls and the west end;
    # the orchestra/platform occupies the east end. Seating is interpretive.
    box(s,"st-martins-hall-floor",(0,-.15,0),(12.15,.3,5.55),[126,111,89,255])
    for side in (-1,1):
        # The Builder describes tall side windows in otherwise plain walls.
        # Leave actual openings rather than painting dark rectangles over a solid wall.
        z=side*2.665
        box(s,"hall-window-wall-lower",(0,.675,z),(12.15,1.35,.22),"linen")
        box(s,"hall-window-wall-upper",(0,3.775,z),(12.15,.45,.22),"linen")
        window_centers=np.linspace(-4.8,4.8,7)
        wall_edge=-6.075
        for wx in window_centers:
            left=wx-.46
            if left>wall_edge:
                box(s,"hall-window-pier",((wall_edge+left)/2,2.0,z),(left-wall_edge,4.0,.22),"linen")
            wall_edge=wx+.46
        if wall_edge<6.075:
            box(s,"hall-window-pier",((wall_edge+6.075)/2,2.0,z),(6.075-wall_edge,4.0,.22),"linen")
    for end in (-1,1):
        box(s,"hall-end-wall",(end*6.0,2.0,0),(.24,4.0,5.55),"linen")
    for x in np.linspace(-4.8,4.8,7):
        for side in (-1,1):
            z=side*2.54
            box(s,"hall-tall-window",(x,2.45,z),(.88,2.2,.035),"glass")
            for dx in (-.44,.44):
                box(s,"hall-window-jamb",(x+dx,2.45,side*2.52),(.07,2.28,.08),"wood_light")
            box(s,"hall-window-mullion-v",(x,2.45,side*2.52),(.07,2.2,.08),"wood_light")
            box(s,"hall-window-mullion-h",(x,2.45,side*2.52),(.88,.07,.08),"wood_light")
            box(s,"hall-window-sill",(x,1.32,side*2.52),(1.04,.09,.25),"wood_light")
            box(s,"hall-window-lintel",(x,3.58,side*2.52),(1.04,.09,.25),"wood_light")
    # Galleries run along both long sides and across the west end; each side
    # gallery is represented at the documented 7 ft depth (0.7 units).
    for side in (-1,1):
        z=side*2.25
        for x in np.linspace(-4.35,4.35,6):
            cylinder(s,"hall-gallery-column",(x,2.0,side*2.55),.11,4.0,"iron",12)
            box(s,"gallery-balcony",(x,2.55,z),(1.65,.16,.7),"wood_light")
            # The historic gallery fronts are documented; the exact baluster pattern is not.
            box(s,"gallery-knee-wall",(x,2.72,side*1.92),(1.65,.28,.12),"wood")
            for bx in np.linspace(x-.72,x+.72,7):
                box(s,"gallery-baluster",(bx,3.02,side*1.92),(.055,.42,.055),"wood_light")
            box(s,"gallery-handrail",(x,3.25,side*1.92),(1.72,.09,.16),"wood_light")
    box(s,"west-end-gallery",(-5.45,2.55,0),(1.0,.16,4.4),"wood_light")
    box(s,"west-gallery-front",(-4.9,2.95,0),(.12,.65,4.4),"wood")
    # The 1853 report describes a flat central ceiling with sloped sides,
    # framed into panels by timber ribs (40 ft overall height) and iron arches.
    for x in np.linspace(-5.65,5.65,9):
        beam(s,"iron-roof-arch-left",(x,3.62,-2.65),(x,4.0,-1.25),.095,"iron_light")
        beam(s,"iron-roof-arch-crown",(x,4.0,-1.25),(x,4.0,1.25),.095,"iron_light")
        beam(s,"iron-roof-arch-right",(x,4.0,1.25),(x,3.62,2.65),.095,"iron_light")
        beam(s,"timber-roof-panel-rib-left",(x,3.48,-2.45),(x,3.86,-1.25),.055,"wood")
        beam(s,"timber-roof-panel-rib-crown",(x,3.86,-1.25),(x,3.86,1.25),.055,"wood")
        beam(s,"timber-roof-panel-rib-right",(x,3.86,1.25),(x,3.48,2.45),.055,"wood")
        beam(s,"ceiling-tie",(x,3.62,-2.65),(x,3.62,2.65),.055,"wood_light")
    for x in np.linspace(-5.2,5.2,8):
        for side in (-1,1):
            beam(s,"ceiling-panel-rib",(x,3.82,side*1.2),(x,3.82,side*2.25),.035,"wood_light")
    box(s,"orchestra-platform",(5.05,.28,0),(1.4,.55,4.35),"wood")
    box(s,"speaker-lectern",(4.45,1.0,0),(.48,1.0,.7),"wood_light")
    # Representative benches establish meeting orientation toward the east
    # platform; they do not claim the documented total capacity was populated.
    for row,x in enumerate(np.linspace(-3.8,3.4,5)):
        for z in np.linspace(-1.7,1.7,4):
            box(s,"assembly-bench",(x,.48+row*.035,z),(.38,.14,.84),"wood_light")
            for dz in (-.32,.32): box(s,"bench-leg",(x,.24+row*.035,z+dz),(.3,.42,.07),"wood")
    for x in (-3.8,3.8):
        beam(s,"hall-gaslight-stem",(x,3.25,0),(x,3.7,0),.06,"iron")
        cylinder(s,"hall-gaslight-globe",(x,3.75,0),.19,.24,"gold",12)

    # The Great Hall occupied the first floor of a larger, documented venue.
    # Raise the hall to the reported 26 ft ground-floor height, then add the
    # documented lower hall, library, class rooms, corridor and entrance hall.
    # The room dimensions are transcribed from the 1853 Builder description;
    # their exact adjacency is schematic because a verified 1853 floor plan
    # has not yet been located. Keep the lower plan visually distinct so it
    # cannot be mistaken for a measured plan or a 1864 meeting arrangement.
    s.apply_translation([0, 2.6, 0])
    box(s,"venue-site-base",(0,-.17,0),(14.9,.26,6.1),[97,88,75,255])
    # Low, cutaway perimeter walls establish the 149 x 61 ft site envelope.
    wall_h=2.55; wall_t=.14
    for z in (-2.98,2.98): box(s,"ground-floor-perimeter-wall",(0,wall_h/2,z),(14.75,wall_h,wall_t),"stone")
    for x in (-7.38,7.38): box(s,"ground-floor-perimeter-wall",(x,wall_h/2,0),(wall_t,wall_h,6.0),"stone")
    # The 51 x 40 ft lecture/lower hall, 32 x 29 ft library and two classrooms
    # use their reported dimensions at 0.1 model units per foot. Their
    # positions are a legible teaching arrangement, not claimed coordinates.
    rooms=[
        ("lower-lecture-hall",-4.50,0,5.10,4.00,[142,105,77,255]),
        ("library",-.35,0,3.20,2.90,[119,123,94,255]),
        ("classroom-31x19",2.70,0,3.10,1.90,[104,120,129,255]),
        ("classroom-26x19",5.55,0,2.60,1.90,[125,107,126,255]),
    ]
    for name,cx,cz,w,d,color in rooms:
        box(s,name+"-floor",(cx,.015,cz),(w-.08,.035,d-.08),color)
        for side in (-1,1):
            box(s,name+"-side-partition",(cx,.88,cz+side*d/2),(w-.08,1.76,.10),"linen")
        for side in (-1,1):
            box(s,name+"-end-partition",(cx+side*w/2,.88,cz),(.10,1.76,d-.08),"linen")
    # The source records a corridor extending the length of the building.
    # It is rendered as a clear open passage alongside the rooms.
    box(s,"long-ground-floor-corridor",(0,.025,2.35),(13.6,.045,.70),[177,157,124,255])
    for x in np.linspace(-6.65,6.65,14):
        box(s,"corridor-paving-joint",(x,.055,2.35),(.025,.02,.66),[101,91,77,255])
    # 44 x 22 ft entrance hall connected at the southwest corner; its
    # placement and the stair orientation are diagrammatic, as the text gives
    # dimensions and entrances but not a georeferenced, fully legible plan.
    box(s,"entrance-hall-floor",(-9.65,.0,-1.95),(4.40,.06,2.20),[152,128,97,255])
    for z in (-2.98,-.92): box(s,"entrance-hall-side-wall",(-9.65,.92,z),(4.32,1.84,.10),"linen")
    box(s,"entrance-hall-end-wall",(-11.78,.92,-1.95),(.10,1.84,2.06),"linen")
    # A compact stair represents the documented pair of stairs to the Great
    # Hall. It is intentionally not a claim about the exact stair geometry.
    for i in range(9):
        box(s,"entrance-stair-step",(-8.55+i*.22,.18+i*.25,-1.95),(.25,.18,1.05),"wood_light")
    for side in (-1,1):
        beam(s,"entrance-stair-handrail",(-8.85,.55,-1.95+side*.62),(-6.65,2.75,-1.95+side*.62),.06,"wood")
    return s

def marx_reading_room():
    s = trimesh.Scene()
    box(s,"reading-room-floor",(0,-.18,0),(13,.36,13),"wood")
    # Circular reading room: concentric book galleries, radial supports, dome.
    # Segmented wall leaves the viewer a clear cutaway while preserving the
    # circular plan. Window openings and curved gallery rails remain legible.
    for angle in np.linspace(0,2*np.pi,32,endpoint=False):
        radius=5.95; x=radius*np.cos(angle); z=radius*np.sin(angle); width=1.16
        for y,h in ((.85,1.4),(4.65,1.2)):
            oriented_box(s,"rotunda-wall-panel",(x,y,z),(width,h,.16),angle,"linen")
        oriented_box(s,"rotunda-window",(x,2.85,z),(width,.95,.07),angle,"glass")
        oriented_box(s,"window-mullion",(x,2.85,z),(width,.08,.1),angle,"wood_light")
    for y,radius in ((1.7,5.25),(3.0,4.35)):
        points=[(radius*np.cos(a),y,radius*np.sin(a)) for a in np.linspace(0,2*np.pi,65)]
        for a,b in zip(points,points[1:]): beam(s,"curved-gallery-rail",a,b,.055,"wood_light")
    for y,radius in ((.85,5.85),(1.95,5.85),(3.05,5.85),(4.05,5.85)):
        for angle in np.linspace(0,2*np.pi,24,endpoint=False):
            x=radius*np.cos(angle); z=radius*np.sin(angle)
            # Curved rhythm represented by narrow radial bookcase bays.
            bay=trimesh.creation.box(extents=[.82,.78,.24]); bay.apply_transform(trimesh.transformations.rotation_matrix(angle+np.pi/2,[0,1,0])); bay.apply_translation((x,y,z))
            bay.visual.face_colors=np.tile(np.array([105,69,47,255],dtype=np.uint8),(len(bay.faces),1)); add_geometry(s,bay,"rotunda-bookcase-bay")
            for by in (y-.28,y+.12):
                for k in range(4):
                    book=trimesh.creation.box(extents=[.12,.36,.18]); book.apply_translation((x-.27+k*.18,by,z))
                    book.visual.face_colors=np.tile(np.array([124+(k%2)*22,74,51,255],dtype=np.uint8),(len(book.faces),1)); add_geometry(s,book,"rotunda-book")
    for angle in np.linspace(0,2*np.pi,16,endpoint=False):
        x=5.7*np.cos(angle); z=5.7*np.sin(angle)
        cylinder(s,"rotunda-pier",(x,3.7,z),.16,7.2,"stone",12)
    # Open ribbed dome keeps the interior visible in a turntable viewer.
    for radius,y in ((5.0,5.15),(3.7,6.55),(2.0,7.55),(.5,8.05)):
        cylinder(s,"dome-ring",(0,y,0),radius,.09,"stone",48)
    for angle in np.linspace(0,2*np.pi,24,endpoint=False):
        points=[(r*np.cos(angle),y,r*np.sin(angle)) for r,y in ((5,5.15),(3.7,6.55),(2,7.55),(.5,8.05))]
        for a,b in zip(points,points[1:]): beam(s,"dome-rib",a,b,.09,"stone")
    cylinder(s,"dome-oculus",(0,8.08,0),.38,.14,"gold",32)
    cylinder(s,"central-reading-desk",(0,.72,0),1.55,.2,"wood_light",48)
    for angle in np.linspace(0,2*np.pi,10,endpoint=False):
        x=3.0*np.cos(angle); z=3.0*np.sin(angle)
        box(s,"reading-table",(x,.82,z),(1.55,.16,.9),"wood_light")
        for dx in (-.55,.55):
            for dz in (-.27,.27): box(s,"reading-table-leg",(x+dx,.39,z+dz),(.09,.78,.09),"wood")
        for n in range(3): box(s,"open-book",(x-.2+n*.2,.93,z),(.16,.035,.24),"paper")
    # Scale the whole room to the documented 140 ft diameter and 106 ft dome
    # height (1868 reader's handbook). Fine furnishing placement remains
    # illustrative; scaling does not turn the model into a survey.
    scale = np.eye(4)
    scale[0,0] = scale[2,2] = 42.672 / 11.9
    scale[1,1] = 32.3088 / (8.15 + .36)
    s.apply_transform(scale)
    return s

def memory_archive_hall():
    s = trimesh.Scene()
    # Approximate metric massing follows the documented >220 m frontage,
    # three-storey elevation and eight-column portico. Quarenghi's original
    # 1806-08 drawing controls the central composition; bay count, rear depth,
    # room plan and hidden elevations remain schematic, not survey data.
    facade, depth, height = 220.0, 28.0, 15.0
    front = -depth/2
    # Warm ochre masonry and pale classical stone follow the surviving
    # exterior photographs. The photos document the extant facade, while the
    # Quarenghi drawing controls the central composition; they do not prove
    # the 1917 paint condition or hidden elevations.
    wall = [207,177,112,255]; projection = [218,187,125,255]
    trim = [239,226,193,255]
    shadow = [113,87,57,255]
    roof_tone = [104,92,70,255]
    box(s,"smolny-forecourt",(0,-.22,-38),(270,.44,105),[156,158,148,255])
    box(s,"smolny-main-block",(0,height/2,0),(facade,height,depth),wall)
    box(s,"smolny-base-course",(0,.38,front-.12),(facade,.76,.5),[171,139,84,255])
    for y in (5.0,10.0): box(s,"smolny-stringcourse",(0,y,front-.16),(facade,.22,.48),trim)
    box(s,"smolny-cornice",(0,14.8,front-.1),(facade+1.4,.45,.65),trim)
    box(s,"smolny-roof",(0,15.35,0),(facade+2.0,1.0,depth+1.8),roof_tone)
    # The long wing reads as a real classical facade at normal viewing
    # distance only if its horizontal rhythm is continuous. Add a restrained
    # dentil course and end quoins instead of leaving the massing as one box.
    for x in np.linspace(-109.5,109.5,111):
        box(s,"smolny-cornice-dentil",(x,14.45,front-.39),(.72,.22,.22),trim)
    for end_x in (-108.5,108.5):
        for y in (1.55,2.25,2.95,3.65):
            for z in (front-.28, depth/2+.03):
                box(s,"smolny-end-quoin",(end_x,y,z),(2.8,.42,.24),trim)

    def front_window(prefix,x,y,z,w=1.55,h=2.05):
        box(s,prefix+"-glazing",(x,y,z),(w,h,.10),[116,153,163,255])
        for side in (-1,1): box(s,prefix+"-jamb",(x+side*(w/2+.12),y,z+.07),(.20,h+.25,.16),trim)
        box(s,prefix+"-lintel",(x,y+h/2+.1,z+.07),(w+.45,.22,.16),trim)
        box(s,prefix+"-sill",(x,y-h/2-.1,z+.11),(w+.55,.25,.28),trim)
        box(s,prefix+"-mullion-v",(x,y,z+.08),(.08,h,.05),[227,220,201,255])
        box(s,prefix+"-mullion-h",(x,y,z+.08),(w,.08,.05),[227,220,201,255])

    # Fourteen bays per wing show the long, repetitive school façade.
    bay_centres = list(np.linspace(-101,-34,14)) + list(np.linspace(34,101,14))
    for i,x in enumerate(bay_centres):
        for floor_y in (7.45,12.35):
            front_window("smolny-wing-window-"+str(i),x,floor_y,front-.12,3.15,2.35)
        box(s,"smolny-ground-arcade-recess",(x,2.2,front-.14),(2.8,3.65,.08),shadow)
        for side in (-1,1):
            box(s,"smolny-ground-arcade-pier",(x+side*1.72,2.4,front-.22),(.38,4.5,.4),trim)
            # Rusticated blocks give the lower storey the heavy stone rhythm
            # visible in the documented exterior views.
            for y in (.72,1.35,2.0,2.65,3.3,3.95):
                box(s,"smolny-rustication",(x+side*1.72,y,front-.43),(.34,.045,.08),[155,119,66,255])
        # Semicircular archivolt assembled from voussoirs. The opening remains
        # a dark recess; the arch is an exterior surface cue, not a scan mesh.
        spring_y, radius = 3.96, 1.38
        for segment in range(9):
            a0 = np.pi * segment / 9
            a1 = np.pi * (segment + 1) / 9
            beam(s,"smolny-arcade-voussoir",
                 (x + radius*np.cos(a0), spring_y + radius*np.sin(a0), front-.43),
                 (x + radius*np.cos(a1), spring_y + radius*np.sin(a1), front-.43), .24, "stone")
        box(s,"smolny-arcade-keystone",(x,5.34,front-.43),(.48,.55,.28),trim)

    # Projecting central portico: eight columns are specified by the source.
    box(s,"smolny-central-risalit",(0,8.0,front-.55),(42.0,16.0,1.2),projection)
    for x in np.linspace(-18,18,8):
        cylinder(s,"smolny-portico-column",(x,7.55,front-1.8),.62,13.6,"chalk",24)
        cylinder(s,"smolny-column-cap",(x,14.5,front-1.8),.95,.7,"chalk",24)
        cylinder(s,"smolny-column-base",(x,.55,front-1.8),1.0,.75,"chalk",24)
        cylinder(s,"smolny-cap-abacus",(x,14.91,front-1.8),1.08,.16,"chalk",24)
        cylinder(s,"smolny-base-torus",(x,.91,front-1.8),.82,.16,"chalk",24)
        # Simple paired volutes reference the Ionic capitals visible in the
        # modern exterior photos; no sculpted ornament is invented.
        for side in (-1,1):
            cylinder(s,"smolny-cap-volute",(x+side*.72,14.45,front-1.8),.24,.2,"chalk",16)
    for x in (-24,24): front_window("smolny-portico-upper-window",x,12.0,front-1.3,3.6,2.6)
    triangle_prism(s,"smolny-pediment",(0,17.1,front-2.0),45.0,5.0,1.2,trim)
    box(s,"smolny-entry-dark",(0,2.0,front-1.35),(5.4,3.8,.12),[74,81,77,255])
    box(s,"smolny-entry-door",(0,1.9,front-1.45),(4.4,3.3,.12),[97,76,57,255])
    box(s,"smolny-approach-steps",(0,.16,front-5.0),(48,.32,7.0),"stone")
    for i in range(5): box(s,"smolny-step",(0,.22+i*.18,front-2.6-i*.65),(50-i*1.4,.18,.82),"linen")
    for x in (-104.0,104.0):
        box(s,"smolny-end-pavilion",(x,7.5,front-.15),(10.0,15.0,3.0),projection)
        for y in (3.7,7.5,12.0): front_window("smolny-end-window",x,y,front-1.72,2.3,2.2)
    return s

SCENES = [
    ("hotel_de_ville_pre1871", commune),
    ("shanghai_machine_weaving_bureau", shanghai_machine_weaving),
    ("chartist_kennington_common", chartist_common),
    ("paris_1848_street", paris_1848_street),
    ("first_international_printshop", international_printshop),
    ("marx_reading_room", marx_reading_room),
    ("memory_archive_hall", memory_archive_hall),
]

SCENE_FILTER = {x.strip() for x in os.environ.get("HISTORY_SCENE_IDS", "").split(",") if x.strip()}
for ident, build in SCENES:
    if SCENE_FILTER and ident not in SCENE_FILTER:
        continue
    scene = build()
    path = os.path.join(OUT, ident + ".glb")
    merged = scene.to_geometry()
    merged.export(path, file_type="glb")
    print(f"{ident}: {len(scene.geometry)} source modules -> merged interactive mesh, {os.path.getsize(path)} bytes -> {path}")
