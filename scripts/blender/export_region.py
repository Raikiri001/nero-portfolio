# Export one region collection of a unit's .blend to the site as a .glb.
#   python3 -I scripts/blender/bridge.py scripts/blender/export_region.py
# Edit UNIT_DIR / COLLECTION below (or prepend overrides) before sending.
#
# Contract the site relies on (CLAUDE.md "Models"):
#   · one object per part, material named after a site material SLOT
#     (white, gold, goldBright, red, recess, eye, sensor, …) — the site
#     replaces materials by name and merges geometry per slot
#   · the collection's origin is the region's anchor (the head: chin height
#     on the neck axis), so it drops straight onto its frame station
#   · flat shading only (hard rule 1) — the exporter writes split normals
import bpy, os

UNIT_DIR = globals().get("UNIT_DIR", "src/game/mech/units/strikeFreedom")
COLLECTION = globals().get("COLLECTION", "head")
REPO = os.path.dirname(os.path.dirname(bpy.data.filepath))  # models/<unit>.blend → repo root

SCENE = globals().get("SCENE", "StrikeFreedom")
bpy.context.window.scene = bpy.data.scenes[SCENE]
coll = bpy.data.collections[COLLECTION]
for o in coll.all_objects:
    if o.type == 'MESH':
        for p in o.data.polygons:
            p.use_smooth = False
out = os.path.join(REPO, UNIT_DIR, "models", COLLECTION + ".glb")
os.makedirs(os.path.dirname(out), exist_ok=True)

view_layer = bpy.context.view_layer
def find_layer(lc, name):
    if lc.collection.name == name: return lc
    for c in lc.children:
        r = find_layer(c, name)
        if r: return r
view_layer.active_layer_collection = find_layer(view_layer.layer_collection, COLLECTION)

bpy.ops.export_scene.gltf(
    filepath=out, export_format='GLB',
    use_active_scene=True, use_active_collection=True, use_renderable=False, use_visible=False,
    export_apply=True, export_yup=True,
    export_normals=True, export_texcoords=False, export_materials='EXPORT',
    export_animations=False, export_cameras=False, export_lights=False,
)
print("exported", out, os.path.getsize(out), "bytes")
