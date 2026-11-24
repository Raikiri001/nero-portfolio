import * as THREE from 'three';
import { extrude, extrudeAlong, skin } from './poly';
import { ngon, rect, chamfer } from './outline';
import { hardware } from './trace';
import { mergeGeometries } from './merge';

// ============================================================
// DETAIL — machined hardware
//
// Every constructor here is an N-GON PRISM at 6 or 8 facets. Between them
// they replace `revolve`, `bell`, `CylinderGeometry`, `SphereGeometry` and
// round rivets — every one of which was a lathe, and a lathe is a curve.
//
// The facet count is a DESIGN DECISION, not a quality slider. Raise it and
// the frame reads as tubing again, which is the exact failure the whole
// straight-edge rule exists to prevent. `ngon()` throws above twelve.
// ============================================================

const HW = (pts, why) => hardware(pts, why);

/** A faceted drum — the straight-edge replacement for a joint cylinder. */
export const drum = (n, r, len, phase = 0) =>
  extrudeAlong('x', HW(ngon(n, r, phase), `${n}-facet joint drum (machined stock)`), len);

/** A faceted pivot block — the replacement for a ball joint. */
export function pivotBlock(n, r, len) {
  const body = extrudeAlong('x', HW(ngon(n, r, Math.PI / n), `${n}-facet pivot block`), len * 0.62);
  const collar = extrudeAlong('x', HW(ngon(n, r * 0.74, Math.PI / n), 'pivot collar'), len);
  return mergeGeometries([body, collar]);
}

/** A thruster nozzle: a faceted flared prism with a recessed throat. */
export function nozzle(n, rThroat, rMouth, len) {
  const bell = extrudeAlong('x', HW(ngon(n, rMouth, Math.PI / n), `${n}-facet nozzle mouth`), len, {
    taper: rThroat / rMouth,
  });
  const throat = extrudeAlong('x', HW(ngon(n, rThroat * 0.8, Math.PI / n), 'nozzle throat'), len * 0.4);
  throat.translate(0, -len * 0.28, 0);
  return mergeGeometries([bell, throat]);
}

/** A faceted aperture ring — a beam port, a sensor well. */
export const aperture = (n, r, depth) =>
  extrude(HW(ngon(n, r, Math.PI / n), `${n}-facet aperture ring`), depth, { taper: 0.72 });

/** Hex bolt heads on a straight run. Rivets are prisms here, never discs. */
export function bolts(count, r, from, to, depth) {
  const parts = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const g = extrude(HW(ngon(6, r), 'hex bolt head'), depth);
    g.translate(from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, 0);
    parts.push(g);
  }
  return mergeGeometries(parts);
}

/** A straight structural strut between two 3D points, square in section. */
export function strut(a, b, r) {
  const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = dir.length() || 1;
  const g = extrudeAlong('x', HW(rect(r * 2, r * 2), 'square structural strut'), len);
  g.translate(0, len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0), dir.clone().normalize(),
  );
  g.applyQuaternion(q);
  g.translate(a[0], a[1], a[2]);
  return g;
}

/** A hex beam with raised ribs — exposed inner-frame structure. */
export function ribbedBeam(w, len, ribs) {
  const core = extrudeAlong('x', HW(ngon(6, w * 0.5), 'hex frame beam'), len);
  const parts = [core];
  for (let i = 0; i < ribs; i++) {
    const t = (i + 0.5) / ribs;
    const r = extrudeAlong('x', HW(ngon(6, w * 0.62), 'beam rib'), len * 0.06);
    r.translate(0, (t - 0.5) * len * 0.86, 0);
    parts.push(r);
  }
  return mergeGeometries(parts);
}

/**
 * A LOUVRE BANK — a real stack of angled fins in a recessed housing.
 *
 * Vents are geometry, never painted. The armour texture generator's `vents`
 * option scatters louvre patches by RNG, so every part sharing the map gets
 * the same patch in the same off-centre place and it reads as misaligned
 * detail. `armorMaps` runs with `vents: 0`; build the fins and place them
 * centred.
 *
 * Fins run across `w`, stacked up `h`, each one a flat plate raked back by
 * `rake` radians so the bank reads dark from straight on.
 */
export function louvres(w, h, count, depth, rake = 0.5) {
  const parts = [];
  const pitch = h / count;
  const back = extrude(HW(rect(w, h), 'louvre housing back wall'), depth * 0.3);
  back.translate(0, 0, -depth * 0.5);
  parts.push(back);
  for (let i = 0; i < count; i++) {
    const fin = extrude(HW(rect(w * 0.94, pitch * 0.52), 'louvre fin'), depth * 0.7);
    fin.rotateX(rake);
    fin.translate(0, -h / 2 + pitch * (i + 0.5), depth * 0.05);
    parts.push(fin);
  }
  return mergeGeometries(parts);
}

/** A faceted boss — a bolt head, an ear-pod fitting, a camera housing. */
export function boss(n, r, h) {
  const base = extrude(HW(ngon(n, r, Math.PI / n), `${n}-facet boss`), h * 0.6);
  const cap = extrude(HW(ngon(n, r * 0.62, Math.PI / n), 'boss cap'), h);
  return mergeGeometries([base, cap]);
}

export { chamfer, skin };
