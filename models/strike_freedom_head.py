# ============================================================
# ZGMF-X20A STRIKE FREEDOM — HEAD, built in Blender from the official head
# settei (references/strike freedom/b40e6b36c95847e12d482e4df3ca0ee6.jpg).
#
#   python3 -I scripts/blender/bridge.py models/strike_freedom_head.py
#
# Rebuilds the `head` collection of models/strike_freedom.blend from scratch.
#
# THE APPROACH: every major part is the INTERSECTION OF TWO TRACED VIEWS —
# its outline on the settei FRONT view extruded front-to-back, intersected
# with its outline on the settei SIDE view extruded side-to-side (and a
# chamfered plan, so no corner is left square). That makes each part right
# from the front AND the side by construction, and CLOSED. The parts are then
# welded into ONE watertight mesh with a boolean union, so there is nowhere
# for a hole to be: the old head was ~40 separate plates placed one by one,
# and every seam between two of them was a hole waiting to happen.
#
# Both views are on ONE sheet, drawn to one scale, so the parts agree with
# each other. Pixel coordinates are raw sheet pixels (735×602):
#   FRONT view: midline col 162.5, crown row 88, chin row 284
#   SIDE  view: face to the LEFT, neck axis col 632, crown row 130, chin row 279
# Blender: x right, −Y FORWARD, z up; the origin is the chin on the neck axis
# (the head's anchor on the site). Flat shading only (hard rule 1).
# ============================================================
import bpy, bmesh, math

HEAD = 0.17955                       # head height, model units (blueprint HEAD)
F = HEAD / (284 - 88)                # front view: metres per pixel
S = HEAD / (279 - 130)               # side view
MID, F_CHIN = 162.5, 284
AXIS, S_CHIN = 632, 279

def fx(col): return (col - MID) * F          # front col → x
def fz(row): return (F_CHIN - row) * F       # front row → z
def sy(col): return (col - AXIS) * S         # side col → y (face is −y)
def sz(row): return (S_CHIN - row) * S       # side row → z

def mirror(left):
    """A left-half front outline (top→bottom along the left edge) → the full,
    symmetric outline, walked around the part."""
    right = [(2 * MID - c, r) for c, r in reversed(left)]
    return left + right

# ------------------------------------------------------------
# THE PARTS — (front outline, side outline, material, plan chamfer)
# Front outlines are FULL polygons (most mirrored from a traced left half);
# side outlines are traced with the face to the left.
# ------------------------------------------------------------
PARTS = {
    # Helmet: the dome and skull shell behind everything. Front: the outer
    # silhouette over the side blocks, round the dome to the tower's
    # shoulders — and ON UP BEHIND THE TOWER to just under the crown, at the
    # tower's width (the dome is hidden there in the front view, but the side
    # view shows it rising to row 131). Side: the dome profile and the back.
    "helmet": (
        mirror([(144, 92), (137, 105), (135, 128), (112, 143), (97, 156), (86, 170), (80, 188), (88, 266)]),
        [(600, 262), (682, 262), (695, 248), (699, 215), (692, 195), (680, 185),
         (676, 165), (655, 144), (610, 131), (600, 140)],
        "white", 0.22),
    # Side blocks: the big outer cheek/ear blocks carrying the vents. Front:
    # cols 76–118. Side: the slotted block, stepping forward at cheek height
    # (vent fins' front col 604) and dropping to the jaw flap at row 276.
    "sideBlockL": (
        [(90, 168), (80, 185), (76, 205), (76, 250), (84, 280), (118, 280), (118, 175), (105, 165)],
        [(604, 276), (690, 276), (693, 250), (698, 240), (699, 215), (695, 200), (685, 193),
         (625, 202), (622, 212), (604, 215)],
        "white", 0.18),
    # Face mask: the centre of the face below the eyes, down to the mouth.
    # Its lower plates run on down to the chin (front rows to 282, side to
    # row 272), so face and chin overlap and leave no slot between them.
    "face": (
        mirror([(124, 194), (122, 215), (122, 250), (126, 276), (140, 282)]),
        [(568, 272), (603, 272), (603, 210), (575, 210), (566, 222)],
        "white", 0.12),
    # Chin: the block at the bottom centre, the front-most point of the jaw.
    "chin": (
        mirror([(147, 262), (150, 284)]),   # row 284 = the chin; below it is the neck mount
        [(565, 268), (578, 281), (600, 281), (600, 262), (567, 262)],
        "red", 0.1),
    # Brow / visor: the V-shaped band over the eyes; its beak is the most
    # forward thing on the head (side col 550).
    "brow": (
        [(114, 193), (162, 202), (211, 193), (208, 176), (182, 160), (143, 160), (117, 176)],
        [(598, 213), (553, 212), (550, 207), (598, 193)],
        "white", 0.08),
    # Forehead sensor tower: the block rising to the crown.
    "tower": (
        [(135, 165), (190, 165), (190, 93), (185, 88), (140, 88), (135, 93)],
        [(558, 195), (605, 195), (605, 135), (598, 130), (570, 130), (558, 140)],
        "white", 0.15),
}
# the right side block is the mirror of the left
PARTS["sideBlockR"] = (
    [(2 * MID - c, r) for c, r in reversed(PARTS["sideBlockL"][0])],
    PARTS["sideBlockL"][1], "white", 0.18,
)

SLOT_COLOURS = {'white': (0.85, 0.86, 0.9), 'red': (0.8, 0.05, 0.08), 'gold': (0.85, 0.62, 0.15),
                'goldBright': (0.95, 0.75, 0.2), 'recess': (0.1, 0.1, 0.12), 'eye': (0.2, 0.9, 0.3),
                'sensor': (0.1, 0.4, 1.0)}

def material(slot):
    m = bpy.data.materials.get(slot) or bpy.data.materials.new(slot)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    # reset fully — a review render may have tinted it
    b.inputs["Base Color"].default_value = (*SLOT_COLOURS[slot], 1)
    b.inputs["Alpha"].default_value = 1.0
    b.inputs["Emission Strength"].default_value = 0.0
    m.surface_render_method = 'DITHERED'
    return m

def prism(name, pts3, axis_vec, depth):
    """A closed prism: a planar polygon (3D points) swept along axis_vec by depth, centred."""
    bm = bmesh.new()
    a = [bm.verts.new([p[i] - axis_vec[i] * depth / 2 for i in range(3)]) for p in pts3]
    b = [bm.verts.new([p[i] + axis_vec[i] * depth / 2 for i in range(3)]) for p in pts3]
    bm.faces.new(a); bm.faces.new(b[::-1])
    n = len(a)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((a[i], b[i], b[j], a[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    return bpy.data.objects.new(name, me)

def boolean(target, operand, op):
    mod = target.modifiers.new("b", 'BOOLEAN')
    mod.operation = op; mod.solver = 'EXACT'; mod.object = operand
    mod.material_mode = 'TRANSFER'
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.modifier_apply(modifier=mod.name)

def two_view_part(name, front, side, slot, chamfer, coll):
    D = 2.0  # sweep depth: far longer than the head
    fp = [(fx(c), 0.0, fz(r)) for c, r in front]
    sp = [(0.0, sy(c), sz(r)) for c, r in side]
    part = prism(name, fp, (0, 1, 0), D)           # front outline, swept front→back
    coll.objects.link(part)
    cut = prism(name + "_side", sp, (1, 0, 0), D)  # side outline, swept across
    coll.objects.link(cut)
    boolean(part, cut, 'INTERSECT')
    bpy.data.objects.remove(cut, do_unlink=True)
    if chamfer:
        # a chamfered PLAN (top view) so the vertical corners are cut flat
        xs = [p[0] for p in fp]; ys = [p[1] for p in sp]
        x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
        k = chamfer * min(x1 - x0, y1 - y0)
        plan = [(x0 + k, y0, 0), (x1 - k, y0, 0), (x1, y0 + k, 0), (x1, y1 - k, 0),
                (x1 - k, y1, 0), (x0 + k, y1, 0), (x0, y1 - k, 0), (x0, y0 + k, 0)]
        pc = prism(name + "_plan", plan, (0, 0, 1), D)
        coll.objects.link(pc)
        boolean(part, pc, 'INTERSECT')
        bpy.data.objects.remove(pc, do_unlink=True)
    part.data.materials.clear()
    part.data.materials.append(material(slot))
    return part

# ------------------------------------------------------------
sc = bpy.data.scenes["StrikeFreedom"]
bpy.context.window.scene = sc
coll = bpy.data.collections["head"]
for o in list(coll.objects):
    bpy.data.objects.remove(o, do_unlink=True)

built = {n: two_view_part(n, *PARTS[n], coll) for n in
         ("helmet", "sideBlockL", "sideBlockR", "face", "chin", "brow", "tower")}

# Weld into ONE watertight head: union everything into the helmet.
head = built["helmet"]
head.name = "head_shell"
for slot in ("red",):
    if slot not in [m.name for m in head.data.materials]:
        head.data.materials.append(material(slot))
for n in ("sideBlockL", "sideBlockR", "face", "chin", "brow", "tower"):
    boolean(head, built[n], 'UNION')
    bpy.data.objects.remove(built[n], do_unlink=True)

# ------------------------------------------------------------
# DETAILS — cut INTO the watertight shell (boolean DIFFERENCE keeps it
# closed) or set into those cuts, so nothing floats and nothing gapes.
# ------------------------------------------------------------
def cut(front, side, slot=None):
    """Carve the two-view volume out of the shell; optionally return a filler
    object of the same volume pushed to the BACK of the cut (an eye lens, a
    sensor lens), in its own material."""
    tmp = two_view_part("tmp_cut", front, side, "white", 0, coll)
    boolean(head, tmp, 'DIFFERENCE')
    bpy.data.objects.remove(tmp, do_unlink=True)

def insert(name, front, side, slot):
    return two_view_part(name, front, side, slot, 0, coll)

def blade(name, root_l, root_r, tip, fwd_px, thick, slot):
    """A flat fin blade in the FRONT view (front px), rooted INTO the brow at
    side column fwd_px, `thick` side-view px thick."""
    fp = [(fx(c), 0.0, fz(r)) for c, r in (root_l, root_r, tip)]
    ob = prism(name, fp, (0, 1, 0), thick * S)
    ob.location.y = sy(fwd_px)
    coll.objects.link(ob)
    ob.data.materials.append(material(slot))
    return ob

# eye slots: carved between brow and face, lens set at the back of the slot
EYE_L = [(121, 196), (140, 198), (153, 203), (150, 211), (126, 207)]
EYE_R = [(2 * MID - c, r) for c, r in reversed(EYE_L)]
for eye in (EYE_L, EYE_R):
    cut(eye, [(560, 219), (605, 219), (605, 203), (560, 203)])
insert("eyeL", EYE_L, [(588, 219), (600, 219), (600, 203), (588, 203)], "eye")
insert("eyeR", EYE_R, [(588, 219), (600, 219), (600, 203), (588, 203)], "eye")

# mouth: two recessed chevron slots across the face (front rows 222–234)
cut(mirror([(150, 223), (152, 227)]), [(560, 228), (580, 228), (580, 222), (560, 222)])
cut(mirror([(152, 230), (154, 234)]), [(560, 235), (580, 235), (580, 229), (560, 229)])

# forehead sensor tower: two blue lenses in shallow wells on its face
for top, bot in ((110, 121), (140, 153)):
    lens = mirror([(146, top), (146, bot)])
    cut(lens, [(553, 200), (566, 200), (566, 120), (553, 120)])
    insert(f"lens{top}", lens, [(562, 200), (570, 200), (570, 120), (562, 120)], "sensor")

# cheek vents: a recess in each side block's cheek face, three gold fins
VENT_L = [(86, 208), (110, 212), (112, 262), (90, 258)]
for vent in (VENT_L, [(2 * MID - c, r) for c, r in reversed(VENT_L)]):
    cut(vent, [(595, 262), (622, 262), (622, 210), (595, 210)])
for k, row in enumerate((218, 234, 250)):
    for s_, sign in ((1, 1), (-1, -1)):
        c0, c1 = (88, 110) if sign > 0 else (2 * MID - 110, 2 * MID - 88)
        insert(f"ventFin{k}{'L' if sign > 0 else 'R'}", [(c0, row + 8), (c1, row + 2), (c1, row - 1), (c0, row + 5)],
               [(600, row + 9), (618, row + 9), (618, row - 2), (600, row - 2)], "gold")

# crest: the red V on the brow's beak, framed in gold
insert("crest", [(149, 152), (162, 178), (176, 152), (183, 158), (162, 194), (142, 158)],
       [(549, 214), (556, 214), (566, 150), (559, 150)], "red")
insert("crestFrame", [(143, 150), (162, 180), (182, 150), (190, 158), (162, 198), (135, 158)],
       [(553, 216), (560, 216), (570, 148), (563, 148)], "gold")

# V-fin, rooted INTO the brow (side col ~563). Tips read off the settei
# front view (fins_grid crop), averaged left/right because the drawing's
# tips sit a few px off-centre: TALL pair tips at col 99 row 9 (mirror 226);
# WIDE pair tips at col 8.5 row 105 (mirror 316.5). Roots where each blade
# meets the brow.
for sign in (1, -1):
    m = (lambda c: c) if sign > 0 else (lambda c: 2 * MID - c)
    side = "L" if sign > 0 else "R"
    blade("whiteFin" + side, (m(146), 186), (m(154), 172), (m(8.5), 105), 565, 4, "white")
    blade("goldFin" + side, (m(140), 172), (m(152), 176), (m(99), 9), 563, 5, "goldBright")
    blade("goldFinInner" + side, (m(150), 188), (m(158), 180), (m(128), 128), 561, 4, "gold")

for o in coll.objects:
    for p in o.data.polygons:
        p.use_smooth = False

bpy.ops.wm.save_mainfile()
me = head.data
print("head_shell:", len(me.vertices), "verts", len(me.polygons), "faces",
      "materials", [m.name for m in me.materials])
