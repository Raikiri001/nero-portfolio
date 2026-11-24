import * as THREE from 'three';
import { mergeGeometries } from './merge';
import { provenance } from './trace';

// ============================================================
// ASSEMBLE — a hundred traced plates → a handful of draw calls
//
// This is what makes "author as much detail as the reference needs" a budget
// the browser can pay: the merge is why a 200-piece head costs one draw call
// per material slot rather than 200.
//
// A SINGLE NaN VERTEX POISONS A WHOLE MERGED SLOT. Every plate of one
// material becomes one geometry, so one bad piece takes down all of them:
// three.js cannot compute a bounding sphere and the group flickers or
// vanishes. That reads as "the armour is in the wrong place", which sends you
// tuning positions that were never wrong — so the offending piece is reported
// by index, slot AND the photograph it was traced from.
// ============================================================

const M = new THREE.Matrix4();
const Q = new THREE.Quaternion();
const E = new THREE.Euler();
const Vp = new THREE.Vector3();
const Vs = new THREE.Vector3();

function placed(piece, index) {
  const { geo, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1] } = piece;
  if (!geo) return null;
  const g = geo.clone();
  const sc = Array.isArray(scale) ? scale : [scale, scale, scale];
  M.compose(
    Vp.set(pos[0], pos[1], pos[2]),
    Q.setFromEuler(E.set(rot[0], rot[1], rot[2])),
    Vs.set(sc[0], sc[1], sc[2]),
  );
  g.applyMatrix4(M);
  // A negative scale component flips winding; flip it back so a mirrored part
  // is written once and still renders front-faces outward.
  if (sc[0] * sc[1] * sc[2] < 0) flipWinding(g);
  const p = g.attributes.position.array;
  for (let i = 0; i < p.length; i++) {
    if (!Number.isFinite(p[i])) {
      const src = provenance(piece.outline) || {};
      console.error(
        `assemble(): piece ${index} "${piece.name || '?'}" slot "${piece.slot}" ` +
        `has a NaN vertex — it will poison the whole merged slot.` +
        (src.image ? `  traced from ${src.image} ${src.kind}` : ''),
      );
      return null;
    }
  }
  return g;
}

function flipWinding(g) {
  for (const name of ['position', 'normal', 'uv']) {
    const a = g.attributes[name];
    if (!a) continue;
    const s = a.itemSize, arr = a.array;
    for (let i = 0; i < a.count; i += 3) {
      for (let c = 0; c < s; c++) {
        const t = arr[(i + 1) * s + c];
        arr[(i + 1) * s + c] = arr[(i + 2) * s + c];
        arr[(i + 2) * s + c] = t;
      }
    }
    a.needsUpdate = true;
  }
  const n = g.attributes.normal;
  if (n) for (let i = 0; i < n.array.length; i++) n.array[i] *= -1;
  return g;
}

/**
 * pieces: [{ name, geo, slot, pos, rot, scale, outline }]
 * → { [slot]: BufferGeometry } — ONE geometry per material slot.
 *
 * opts.uvScale multiplies the box UVs, because they are in WORLD UNITS.
 */
export function assemble(pieces, opts = {}) {
  const { uvScale = 1 } = opts;
  const bySlot = new Map();
  pieces.forEach((piece, i) => {
    const g = placed(piece, i);
    if (!g) return;
    const slot = piece.slot || 'white';
    if (!bySlot.has(slot)) bySlot.set(slot, []);
    bySlot.get(slot).push(g);
  });
  const out = {};
  for (const [slot, list] of bySlot) {
    const g = mergeGeometries(list);
    // Box UVs are in WORLD UNITS and the armour maps repeat once per unit, so
    // a part much smaller than the whole suit samples a fraction of one tile
    // and its panel lines render as cracks a metre wide. A region scales its
    // own UVs to the size of the parts in it.
    if (uvScale !== 1) {
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.array.length; i++) uv.array[i] *= uvScale;
      uv.needsUpdate = true;
    }
    g.computeBoundingSphere();
    g.computeBoundingBox();
    out[slot] = g;
  }
  return out;
}

export const triCount = (g) => (g ? g.attributes.position.count / 3 : 0);

export function bboxOf(g) {
  if (!g) return null;
  if (!g.boundingBox) g.computeBoundingBox();
  const b = g.boundingBox;
  return { min: b.min.toArray(), max: b.max.toArray() };
}

/**
 * How many DISTINCT face normals a geometry has.
 *
 * The measure-don't-tune check for hard rule 1: a part that has quietly
 * become round shows up here as dozens of near-parallel normals where a
 * faceted one has a handful. Cheap enough to assert in the region gate.
 */
export function normalCount(g, tol = 0.02) {
  if (!g) return 0;
  const n = g.attributes.normal;
  const seen = [];
  for (let i = 0; i < n.count; i += 3) {
    const v = [n.getX(i), n.getY(i), n.getZ(i)];
    if (!seen.some((s) => Math.abs(s[0] - v[0]) + Math.abs(s[1] - v[1]) + Math.abs(s[2] - v[2]) < tol)) {
      seen.push(v);
    }
    if (seen.length > 400) break;
  }
  return seen.length;
}

/** Audit one region: what was built, from which photograph, how big, how many. */
export function report(pieces, slots) {
  const lines = [];
  lines.push('slot                    tris    bbox (min → max)');
  for (const [slot, g] of Object.entries(slots)) {
    const b = bboxOf(g);
    lines.push(
      `${slot.padEnd(20)}${String(triCount(g)).padStart(8)}    ` +
      `[${b.min.map((v) => v.toFixed(3)).join(', ')}] → [${b.max.map((v) => v.toFixed(3)).join(', ')}]`,
    );
  }
  lines.push('');
  lines.push('part                          slot        traced from');
  for (const p of pieces) {
    const s = provenance(p.outline);
    lines.push(
      `${(p.name || '?').padEnd(30)}${(p.slot || 'white').padEnd(12)}` +
      (s ? `${s.kind}  ${s.image || s.note || ''}` : 'UNTRACED'),
    );
  }
  return lines.join('\n');
}
