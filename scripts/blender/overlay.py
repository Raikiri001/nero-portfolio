# Render a region over its calibrated reference planes (front + side), with
# the model tinted translucent cyan so its silhouette separates from line
# art. Materials are restored afterwards and the file is NOT saved.
#   python3 -I scripts/blender/bridge.py scripts/blender/overlay.py
# Also prints the mesh's open (non-manifold) edge count — a hole detector.
import bpy, bmesh, math, os

SCENE = globals().get("SCENE", "StrikeFreedom")
COLLECTION = globals().get("COLLECTION", "head")
OUT_DIR = globals().get("OUT_DIR", "/tmp")
VIEWS = globals().get("VIEWS", {"front": ("ref_front_settei", (0, -1, 0)), "side": ("ref_side_settei", (1, 0, 0))})
SPAN = globals().get("SPAN", 0.36)
CENTER = globals().get("CENTER", (0, 0, 0.085))

sc = bpy.data.scenes[SCENE]
bpy.context.window.scene = sc
sc.render.engine = 'BLENDER_EEVEE'
sc.render.resolution_x = sc.render.resolution_y = 560
objs = [o for o in bpy.data.collections[COLLECTION].all_objects if o.type == 'MESH']

# hole detector
for o in objs:
    bm = bmesh.new(); bm.from_mesh(o.data)
    bad = [e for e in bm.edges if not e.is_manifold]
    print(f"{o.name}: {len(bad)} non-manifold edges")
    bm.free()

saved = []
mats = {m for o in objs for m in o.data.materials if m}  # each material ONCE
for m in mats:
    if True:
        b = m.node_tree.nodes["Principled BSDF"]
        saved.append((m, tuple(b.inputs["Base Color"].default_value), b.inputs["Alpha"].default_value,
                      tuple(b.inputs["Emission Color"].default_value), b.inputs["Emission Strength"].default_value,
                      m.surface_render_method))
        b.inputs["Base Color"].default_value = (0.0, 0.75, 1.0, 1)
        b.inputs["Emission Color"].default_value = (0.0, 0.5, 0.8, 1)
        b.inputs["Emission Strength"].default_value = 0.6
        b.inputs["Alpha"].default_value = 0.4
        m.surface_render_method = 'BLENDED'
refs = bpy.data.collections.get("refs")
refs_hidden = refs.hide_render if refs else None
if refs: refs.hide_render = False
try:
    for name, (ref, direction) in VIEWS.items():
        for r in (refs.objects if refs else []):
            r.hide_render = r.name != ref
        cam = bpy.data.objects.get("ov_" + name) or bpy.data.objects.new("ov_" + name, bpy.data.cameras.new("ov_" + name))
        if cam.name not in sc.collection.objects: sc.collection.objects.link(cam)
        cam.data.type = 'ORTHO'; cam.data.ortho_scale = SPAN
        import mathutils
        c = mathutils.Vector(CENTER); d = mathutils.Vector(direction)
        cam.location = c + d * 2
        cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
        sc.camera = cam
        sc.render.filepath = os.path.join(OUT_DIR, "ov_" + name + ".png")
        bpy.ops.render.render(write_still=True)
finally:
    for m, col, a, ec, es, mode in saved:
        b = m.node_tree.nodes["Principled BSDF"]
        b.inputs["Base Color"].default_value = col; b.inputs["Alpha"].default_value = a
        b.inputs["Emission Color"].default_value = ec; b.inputs["Emission Strength"].default_value = es
        m.surface_render_method = mode
    if refs:
        refs.hide_render = refs_hidden
        for r in refs.objects: r.hide_render = True
print("overlays →", OUT_DIR)
