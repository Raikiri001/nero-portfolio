import * as THREE from 'three';

// Procedural gantry-bay set-dressing — same extrude-panel technique as
// game/mech/partShapes.js (2D THREE.Shape outlines -> beveled
// ExtrudeGeometry), applied to hangar architecture instead of a mech:
// cross-braced wall frames, hexagonal vent panels, and a hazard-stripe
// floor accent, echoing the Gunpla display-case dioramas this hangar is
// modeled on. All geometry here is module-level (shared/reused across
// every bay instance) — see MechModel3D.jsx's `dispose={null}` note for
// why that matters with React Three Fiber.

function panel(points, depth, bevel = { bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1 }) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth, steps: 1, ...bevel });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

function hexPoints(r) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    return [Math.cos(a) * r, Math.sin(a) * r];
  });
}

// Bay footprint — one "cell" of the corridor.
export const BAY_WIDTH = 4.4;
export const BAY_DEPTH = 3.8;
export const BAY_HEIGHT = 3.6;

// Thin structural beam (cross-braces, frame borders) — a unit-length box,
// scaled per-instance to the length/orientation needed.
export const BEAM_GEO = new THREE.BoxGeometry(1, 0.1, 0.1);

// Wall backing plate, authored full-size (not unit) so it doesn't need
// non-uniform scale tricks that would also stretch its bevel.
export const WALL_PANEL_GEO = panel([
  [-BAY_DEPTH / 2, -BAY_HEIGHT / 2], [BAY_DEPTH / 2, -BAY_HEIGHT / 2],
  [BAY_DEPTH / 2, BAY_HEIGHT / 2], [-BAY_DEPTH / 2, BAY_HEIGHT / 2],
], 0.12, { bevelEnabled: false });

// Hexagonal vent panel: outer hex ring with an inset hex hole, so it reads
// as a grate rather than a solid plate.
export const HEX_VENT_GEO = (() => {
  const shape = new THREE.Shape();
  const outer = hexPoints(0.42);
  shape.moveTo(outer[0][0], outer[0][1]);
  outer.slice(1).forEach(([x, y]) => shape.lineTo(x, y));
  shape.closePath();

  const hole = new THREE.Path();
  const inner = hexPoints(0.27);
  hole.moveTo(inner[0][0], inner[0][1]);
  inner.slice(1).forEach(([x, y]) => hole.lineTo(x, y));
  hole.closePath();
  shape.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.09, steps: 1, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1,
  });
  geo.translate(0, 0, -0.045);
  return geo;
})();

// Floor plate for one bay.
export const FLOOR_GEO = new THREE.BoxGeometry(BAY_WIDTH, 0.1, BAY_DEPTH);

// Hazard-stripe accent bar — thin angled block, alternated yellow/black and
// repeated along the bay's front (corridor-facing) edge.
export const STRIPE_GEO = new THREE.BoxGeometry(0.26, 0.03, 0.7);

// Overhead crane/docking arm reaching down toward the mech.
export const ARM_SEG_GEO = new THREE.CylinderGeometry(0.07, 0.07, 1, 8);
export const CLAMP_GEO = new THREE.BoxGeometry(0.34, 0.2, 0.34);
