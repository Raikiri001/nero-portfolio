import * as THREE from 'three';
import { ccw, boundsXY, matchCount, insetXY } from './outline';
import { requireTraced, provenance, brand } from './trace';

// ============================================================
// poly.js — THE CORE PRIMITIVES
//
// EVERY SURFACE ON A MOBILE SUIT IS A PLANE. A part is a set of traced
// polygons joined by planar quads, and nothing between two traced corners is
// ever interpolated by a curve — the edge from one corner to the next is a
// straight line, because a straight line is what the reference shows.
//
//   stack(sections)         traced polygons in XZ at traced heights → a solid
//   extrude(profile, d)     a traced polygon in XY carried through ONE depth
//   extrudeAlong(axis, …)   the same part, drawn in a different elevation
//   plate(outline, t, bev)  a traced plate with a flat chamfered lip
//   recess(outline, d, w)   a real inset: rim wall → floor, no CSG
//
// Every one of them calls `requireTraced`. There is no way to build a shape
// here out of a scalar.
//
// FLAT SHADING IS STRUCTURAL, NOT A SETTING. Everything below emits
// non-indexed triangles with no shared vertices, so `computeVertexNormals()`
// gives one normal per face and every plane reads as a plane. Never weld or
// smooth a part afterwards, and never add a smoothing pass to "clean it up".
//
// THE ARITY RULE: every constructor takes ONE depth and returns geometry
// CENTRED ON z = 0; the caller positions it. A `(zBack, zFront)` pair invites
// being called with a single depth in the second slot, and `zFront - zBack`
// is then NaN — silently, for every part sharing the mistake, taking down the
// whole merged material slot with it.
// ============================================================

const V = (x, y, z) => [x, y, z];

/**
 * Ear-clipping cap, so a CONCAVE outline — a chevron skirt, a notched knee
 * guard, a forked V-fin base — closes correctly instead of folding over
 * itself. Straight-edge design produces concave outlines constantly, which is
 * why this is the default rather than a fan.
 */
function capTris(pts2d, toVec) {
  const shape = pts2d.map(([u, v]) => new THREE.Vector2(u, v));
  const faces = THREE.ShapeUtils.triangulateShape(shape, []);
  return faces.map((f) => f.map((i) => toVec(pts2d[i])));
}

/** Non-indexed triangle soup → geometry with flat normals and box UVs. */
export function fromTris(tris, opts = {}) {
  const { orient = true } = opts;
  const pos = new Float32Array(tris.length * 9);
  let o = 0;
  for (const t of tris) {
    for (const p of t) { pos[o++] = p[0]; pos[o++] = p[1]; pos[o++] = p[2]; }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  if (orient) ensureOutward(g);
  g.computeVertexNormals();          // non-indexed ⇒ one normal per face
  boxUV(g);
  return g;
}

/**
 * skin(rings) — the one place quads are emitted. Every ring the same length,
 * corners in corresponding order.
 */
export function skin(rings, opts = {}) {
  const { capStart2d = null, capEnd2d = null, capTo = null, orient = true } = opts;
  const n = rings[0].length;
  const tris = [];
  for (let i = 0; i < rings.length - 1; i++) {
    const lo = rings[i], hi = rings[i + 1];
    for (let j = 0; j < n; j++) {
      const k = (j + 1) % n;
      tris.push([lo[j], lo[k], hi[k]], [lo[j], hi[k], hi[j]]);
    }
  }
  if (capStart2d) {
    capTris(capStart2d, capTo(0)).forEach((t) => tris.push([t[0], t[2], t[1]]));
  }
  if (capEnd2d) {
    capTris(capEnd2d, capTo(rings.length - 1)).forEach((t) => tris.push(t));
  }
  return fromTris(tris, { orient });
}

/**
 * Box-projected UVs: each face is unwrapped on whichever world plane it most
 * faces. The armour maps are panel lines and rivets, so what matters is that
 * the scale stays uniform across a part — a single planar unwrap smears the
 * sides of anything deep into streaks.
 */
export function boxUV(g, scale = 1) {
  const p = g.attributes.position;
  const nrm = g.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i += 3) {
    const nx = Math.abs(nrm.getX(i)), ny = Math.abs(nrm.getY(i)), nz = Math.abs(nrm.getZ(i));
    for (let k = 0; k < 3; k++) {
      const x = p.getX(i + k), y = p.getY(i + k), z = p.getZ(i + k);
      let u, v;
      if (nx >= ny && nx >= nz) { u = z; v = y; }
      else if (ny >= nz) { u = x; v = z; }
      else { u = x; v = y; }
      uv[(i + k) * 2] = u * scale;
      uv[(i + k) * 2 + 1] = v * scale;
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

/**
 * Flips winding if a closed mesh came out inside-out — which looks exactly
 * like a part buried inside its parent, and sends you tuning a position that
 * was never wrong.
 */
export function ensureOutward(g) {
  const p = g.attributes.position;
  let vol = 0;
  for (let i = 0; i < p.count; i += 3) {
    const ax = p.getX(i), ay = p.getY(i), az = p.getZ(i);
    const bx = p.getX(i + 1), by = p.getY(i + 1), bz = p.getZ(i + 1);
    const cx = p.getX(i + 2), cy = p.getY(i + 2), cz = p.getZ(i + 2);
    vol += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
  }
  if (vol >= 0) return g;
  const a = p.array;
  for (let i = 0; i < p.count; i += 3) {
    for (let c = 0; c < 3; c++) {
      const t = a[(i + 1) * 3 + c];
      a[(i + 1) * 3 + c] = a[(i + 2) * 3 + c];
      a[(i + 2) * 3 + c] = t;
    }
  }
  p.needsUpdate = true;
  return g;
}

/**
 * stack(sections) — a part built from TRACED cross-sections up its height.
 *
 * sections: [{ y, pts, dx, dz }] where `pts` is a traced CLOSED POLYGON IN XZ
 * (x outboard, z forward), normally from `elevation().plan()`, and `dx`/`dz`
 * shift the whole section for a part that leans.
 *
 * Sections need not share a corner count: `matchCount` splits straight runs of
 * the smaller one, so a traced corner never moves off the coordinate it was
 * measured at.
 *
 * Everything between two sections is a STRAIGHT taper. Author a section
 * wherever the reference shows the outline change direction and NOWHERE else:
 * an extra section mid-run costs triangles and buys nothing, while a missing
 * one collapses two distinct facets into one long slope.
 */
export function stack(sections) {
  sections.forEach((s, i) => requireTraced(s.pts, `stack() section ${i} (y=${s.y})`));
  const n = Math.max(...sections.map((s) => s.pts.length));
  const prepared = sections.map((s) => ({
    y: s.y,
    pts: matchCount(ccw(s.pts), n),
    dz: s.dz || 0,
    dx: s.dx || 0,
  }));
  const rings = prepared.map((s) => s.pts.map(([x, z]) => V(x + s.dx, s.y, z + s.dz)));
  return skin(rings, {
    capStart2d: prepared[0].pts,
    capEnd2d: prepared[prepared.length - 1].pts,
    capTo: (i) => {
      const s = prepared[i];
      return ([x, z]) => V(x + s.dx, s.y, z + s.dz);
    },
  });
}

/**
 * extrude(profile, depth) — a traced polygon in XY carried through Z,
 * centred on z = 0.
 *
 * opts.taper  scales the FRONT face — a plate that narrows as it stands proud
 *             of the body (`[sx, sy]`, or one number for both)
 * opts.back    scales the BACK face, for a plate whose TRACED outline is its
 *              FRONT and which sweeps in behind it — a helmet side panel, a
 *              pauldron, a boot. Without it the traced silhouette ends up on
 *              the back face and the part reads as a cube with the right
 *              front view, which is exactly how a laminate turns back into a
 *              slab.
 * opts.shift  offsets the front face, for a face not parallel to its back
 * opts.steps  extra sections `[{ at, scale, shift }]`, `at` 0…1 back→front,
 *             for a stepped or flat-bevelled edge
 */
export function extrude(profile, depth, opts = {}) {
  requireTraced(profile, 'extrude()');
  if (!Number.isFinite(depth)) throw new Error(`extrude(): depth is ${depth} — ONE depth, centred on z=0`);
  const src = ccw(profile);
  const { taper = 1, back = 1, shift = [0, 0], backShift = [0, 0], steps = [] } = opts;
  const tp = Array.isArray(taper) ? taper : [taper, taper];
  const bk = Array.isArray(back) ? back : [back, back];
  const b = boundsXY(src);

  const keys = [
    { at: 0, scale: bk, shift: backShift },
    ...steps.map((s) => ({
      at: s.at,
      scale: Array.isArray(s.scale) ? s.scale : [s.scale ?? 1, s.scale ?? 1],
      shift: s.shift || [0, 0],
    })),
    { at: 1, scale: tp, shift },
  ].sort((p, q) => p.at - q.at);

  const flat = (k) => src.map(([x, y]) => [
    b.cx + (x - b.cx) * k.scale[0] + k.shift[0],
    b.cy + (y - b.cy) * k.scale[1] + k.shift[1],
  ]);
  const zAt = (k) => -depth / 2 + depth * k.at;
  const rings = keys.map((k) => flat(k).map(([x, y]) => V(x, y, zAt(k))));

  return skin(rings, {
    capStart2d: flat(keys[0]),
    capEnd2d: flat(keys[keys.length - 1]),
    capTo: (i) => {
      const z = zAt(keys[i]);
      return ([x, y]) => V(x, y, z);
    },
  });
}

/**
 * The same part, drawn in a different elevation.
 *
 *   'z'  the profile is the SIDE view (z right, y up) and the depth runs
 *        outboard along x — boots, side skirts, ankle flares, the knee crest,
 *        shoulder sockets: anything whose shape reads from the side.
 *   'x'  the profile is the PLAN view and the depth runs vertically.
 *
 * A sideways part must then be offset ALONG ITS OWN DEPTH AXIS. A `pos` of
 * `[toe, 0, 0]` on a 'z' part puts it out beside the boot instead of in front
 * of it. THE ROTATION SIGNS ARE LOAD-BEARING and are written once, here:
 * `rotateY(+90)` maps profile-x to −z, which sends every side-drawn part
 * backwards through the body — a toe becomes a heel — and reads as a position
 * error rather than a rotation one.
 */
export function extrudeAlong(axis, profile, depth, opts = {}) {
  const g = extrude(profile, depth, opts);
  if (axis === 'z') g.rotateY(-Math.PI / 2);       // profile x → +z, depth → x
  else if (axis === 'x') g.rotateX(Math.PI / 2);   // profile y → +z, depth → y
  else throw new Error(`extrudeAlong(): axis must be 'z' or 'x', got ${axis}`);
  return g;
}

/**
 * A traced plate: face and back both real planes, with a straight bevel
 * around the rim.
 *
 * `bevel` is a FLAT CUT in model units taken off the face, and the face is a
 * real INSET of the outline rather than a scaled copy — a scale pulls a long
 * thin plate in far more at its ends than along its edge, and the plate then
 * reads as the wrong shape while the outline gets blamed.
 */
export function plate(outline, thickness, bevel = 0) {
  requireTraced(outline, 'plate()');
  const src = ccw(outline);
  if (!bevel) return extrude(outline, thickness);
  const face = matchCount(insetXY(src, bevel), src.length);
  const rings = [
    src.map(([x, y]) => V(x, y, -thickness / 2)),
    src.map(([x, y]) => V(x, y, thickness / 2 - bevel)),
    face.map(([x, y]) => V(x, y, thickness / 2)),
  ];
  return skin(rings, {
    capStart2d: src,
    capEnd2d: face,
    capTo: (i) => {
      const z = [-thickness / 2, thickness / 2 - bevel, thickness / 2][i];
      return ([x, y]) => V(x, y, z);
    },
  });
}

/**
 * A real inset — rim wall down to a floor, no CSG. Vents, hatches, eye
 * sockets and the chest cannon aperture are all this, and all of them are
 * GEOMETRY rather than paint: the armour texture generator's `vents` option
 * scatters louvre patches by RNG, so every part sharing the map gets the same
 * patch in the same off-centre place and it reads as misaligned detail.
 *
 * Opens toward +Z, floor at z = −depth.
 */
export function recess(outline, depth, wall = 0) {
  requireTraced(outline, 'recess()');
  const src = ccw(outline);
  const floor = wall ? matchCount(insetXY(src, wall), src.length) : src;
  const rings = [
    src.map(([x, y]) => V(x, y, 0)),
    floor.map(([x, y]) => V(x, y, -depth)),
  ];
  // `orient: false` IS LOAD-BEARING. A recess is an open shell with a
  // negative signed volume by construction, so `ensureOutward` — which exists
  // to rescue a closed solid traced clockwise — flips it, and the floor then
  // faces AWAY from the viewer. The vent renders as nothing at all: not
  // black, not dark, simply absent, which reads as "the trace is wrong" and
  // sends you re-measuring a slot that was correct.
  const g = skin(rings, {
    capEnd2d: floor,
    capTo: () => ([x, y]) => V(x, y, -depth),
    orient: false,
  });
  // An OPEN SHELL: you look INTO a recess, so its faces point inward and its
  // signed volume is negative by construction. Flagged so the region gate's
  // inside-out check — which exists to catch a clockwise trace on a closed
  // solid — does not fire on every vent, eye socket and beam port.
  g.userData.openShell = true;
  return g;
}

/** Re-brands a transformed outline so a derived shape keeps its provenance. */
export const keepTrace = (from, pts) => brand(pts, provenance(from));
