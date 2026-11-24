# Render a collection from six angles for review. Run through the bridge:
#   python3 -I scripts/blender/bridge.py scripts/blender/views.py
# Settings come from env-like globals at the top; output goes to OUT_DIR as
# v_front/side/back/top/q_front/q_low .png (tile them with tile.mjs).
import bpy, math, mathutils, os

SCENE = "StrikeFreedom"
COLLECTION = "head"
OUT_DIR = os.environ.get("VIEWS_OUT", "/tmp")
SIZE = 420

sc = bpy.data.scenes[SCENE]
bpy.context.window.scene = sc
sc.render.engine = 'BLENDER_EEVEE'
sc.render.resolution_x = sc.render.resolution_y = SIZE
rig = bpy.data.collections.get("rig") or bpy.data.collections.new("rig")
if rig.name not in sc.collection.children: sc.collection.children.link(rig)

world = bpy.data.worlds.get("review") or bpy.data.worlds.new("review")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0.36, 0.38, 0.43, 1)
sc.world = world
sun = bpy.data.objects.get("rig_sun")
if not sun:
    sun = bpy.data.objects.new("rig_sun", bpy.data.lights.new("rig_sun", 'SUN')); rig.objects.link(sun)
sun.data.energy = 3.2
sun.rotation_euler = (math.radians(50), 0, math.radians(-35))
# fill (opposite side, softer) and rim (from behind) so no face reads flat
for nm, energy, rot in (("rig_fill", 1.4, (60, 0, 145)), ("rig_rim", 2.0, (-35, 0, 180))):
    l = bpy.data.objects.get(nm)
    if not l:
        l = bpy.data.objects.new(nm, bpy.data.lights.new(nm, 'SUN')); rig.objects.link(l)
    l.data.energy = energy
    l.rotation_euler = [math.radians(a) for a in rot]

objs = [o for o in bpy.data.collections[COLLECTION].all_objects if o.type == 'MESH']
lo = mathutils.Vector((1e9,) * 3); hi = mathutils.Vector((-1e9,) * 3)
for o in objs:
    for c in o.bound_box:
        w = o.matrix_world @ mathutils.Vector(c)
        lo = mathutils.Vector(map(min, lo, w)); hi = mathutils.Vector(map(max, hi, w))
ctr = (lo + hi) / 2
span = max(hi - lo) * 1.25

def shot(name, offset, ortho):
    cam = bpy.data.objects.get("rig_" + name)
    if not cam:
        cam = bpy.data.objects.new("rig_" + name, bpy.data.cameras.new("rig_" + name)); rig.objects.link(cam)
    # ortho cameras just need to be outside the model; perspective ones sit
    # close enough that the model fills ~70 % of the frame at 50 mm
    loc = ctr + mathutils.Vector(offset).normalized() * span * (2 if ortho else 1.9)
    cam.location = loc
    cam.rotation_euler = (ctr - loc).to_track_quat('-Z', 'Y').to_euler()
    cam.data.type = 'ORTHO' if ortho else 'PERSP'
    cam.data.ortho_scale = span
    cam.data.lens = 50
    sc.camera = cam
    sc.render.filepath = os.path.join(OUT_DIR, "v_" + name + ".png")
    bpy.ops.render.render(write_still=True)

shot("front", (0, -1, 0), True)
shot("side", (1, 0, 0), True)
shot("back", (0, 1, 0), True)
shot("top", (0, -0.001, 1), True)
shot("q_front", (-0.75, -0.95, 0.45), False)
shot("q_low", (0.8, -0.9, -0.35), False)
shot("q_back", (0.85, 0.85, 0.4), False)
print("views →", OUT_DIR)
