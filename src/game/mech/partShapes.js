import * as THREE from 'three';

// ============================================================
// Procedural "Gunpla kit" mech armor panels.
//
// Every armor panel is authored as a flat 2D outline (in the part's own
// local X/Y space) and extruded into a thin beveled 3D plate — the bevel
// is what sells the plastic-model-kit look. Joints (elbow/knee/shoulder
// ball) are plain primitives (cylinder/sphere) that peek out between
// armor plates, mirroring how a real Gunpla's inner frame shows at the
// articulation points.
//
// Vertical segments (limbs) are authored with their origin at the TOP —
// the joint they hang from — extending down to negative Y, so a parent
// group can be positioned exactly at that joint. Torso/waist/head/neck
// stack the opposite way: origin at the BOTTOM, extending up, so they
// can be positioned at the joint they rise from.
//
// All geometry here is shared (built once, reused across every mech
// instance) — only materials/colors differ per instance, built in
// MechModel3D.jsx from a palette.
// ============================================================

const PANEL_DEPTH = 0.09;
const BEVEL = { bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2 };

function panel(points, depth = PANEL_DEPTH, bevel = BEVEL) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth, steps: 1, ...bevel });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

// Thin, no-bevel plate — used for slim blade shapes (v-fin, horn) where a
// bevel would just muddy the edge.
function blade(points, depth = 0.02) {
  return panel(points, depth, { bevelEnabled: false });
}

// ---- Head (twin-eye "hero" variant) ----
export const HEAD_GEO = panel([
  [-0.09, 0], [0.09, 0], [0.11, 0.06], [0.10, 0.16],
  [0.05, 0.20], [-0.05, 0.20], [-0.10, 0.16], [-0.11, 0.06],
]);

// ---- Head (mono-eye "grunt" variant) — squatter, angular, no brow ridge ----
export const GRUNT_HEAD_GEO = panel([
  [-0.10, 0], [0.10, 0], [0.12, 0.08], [0.09, 0.17], [-0.09, 0.17], [-0.12, 0.08],
]);

export const VFIN_BLADE_GEO = blade([
  [0, 0], [-0.045, 0.02], [-0.24, 0.30], [-0.15, 0.19],
]);

export const GRUNT_HORN_GEO = blade([
  [0, 0], [-0.02, 0.01], [-0.05, 0.14], [0.02, 0.02],
], 0.03);

export const CHIN_GEO = panel([
  [-0.035, 0], [0.035, 0], [0.05, -0.045], [-0.05, -0.045],
], 0.05, { bevelEnabled: false });

export const NECK_GEO = panel([
  [-0.05, 0], [0.05, 0], [0.07, 0.06], [-0.07, 0.06],
], 0.06, { bevelEnabled: false });

// ---- Torso ----
export const CHEST_GEO = panel([
  [-0.20, 0], [0.20, 0], [0.26, 0.40], [0.16, 0.46], [-0.16, 0.46], [-0.26, 0.40],
]);

export const VENT_GEO = panel([
  [-0.04, 0], [0.04, 0], [0.045, 0.10], [-0.045, 0.10],
], 0.03, { bevelEnabled: false });

export const CORE_GEO = panel([
  [0, 0.07], [0.05, 0], [0, -0.07], [-0.05, 0],
], 0.05, { bevelEnabled: false });

export const BACKPACK_GEO = new THREE.BoxGeometry(0.30, 0.28, 0.10);
export const THRUSTER_GEO = new THREE.CylinderGeometry(0.045, 0.05, 0.08, 10);

// ---- Waist ----
export const WAIST_GEO = panel([
  [-0.20, 0], [0.20, 0], [0.15, 0.16], [-0.15, 0.16],
]);

export const SKIRT_GEO = panel([
  [0, 0], [0.10, -0.02], [0.11, -0.20], [-0.02, -0.16],
], 0.05, { bevelEnabled: false });

// ---- Shoulder (compact cap sitting over the ball joint — must stay well
// clear of head height, not read as a raised arm) ----
export const SHOULDER_GEO = panel([
  [0, -0.08], [0.19, -0.09], [0.22, 0.02], [0.14, 0.09], [0.02, 0.07],
]);

export const GRUNT_SHOULDER_GEO = panel([
  [0, -0.07], [0.15, -0.09], [0.20, 0.01], [0.13, 0.07], [0.02, 0.05],
]);

// ---- Arms (origin: joint at top, hangs down) ----
export const UPPER_ARM_GEO = panel([
  [-0.065, 0], [0.065, 0], [0.06, -0.20], [-0.06, -0.20],
], 0.11);

export const FOREARM_GEO = panel([
  [-0.06, 0], [0.06, 0], [0.065, -0.19], [-0.065, -0.19],
], 0.115);

export const FIST_GEO = new THREE.BoxGeometry(0.11, 0.09, 0.11);

// ---- Legs (origin: joint at top, hangs down) ----
export const THIGH_GEO = panel([
  [-0.10, 0], [0.10, 0], [0.085, -0.26], [-0.085, -0.26],
], 0.15);

export const SHIN_GEO = panel([
  [-0.085, 0], [0.085, 0], [0.07, -0.30], [-0.07, -0.30],
], 0.14);

export const KNEE_GEO = panel([
  [0, 0.05], [0.06, 0], [0, -0.05], [-0.06, 0],
], 0.14, { bevelEnabled: false });

// Foot: authored in (width, forward-length) space then rotated so the
// extrude thickness becomes vertical boot height and "length" points
// along +Z (forward).
export const FOOT_GEO = (() => {
  const geo = panel([
    [-0.09, -0.08], [0.09, -0.08], [0.10, 0.05],
    [0.06, 0.16], [0, 0.22], [-0.06, 0.16], [-0.10, 0.05],
  ], 0.10, { bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 1 });
  geo.rotateX(-Math.PI / 2);
  return geo;
})();

// ---- Joints (inner-frame primitives peeking between armor plates) ----
export const BALL_JOINT_GEO = new THREE.SphereGeometry(0.075, 10, 8);
export const HINGE_JOINT_GEO = new THREE.CylinderGeometry(0.06, 0.06, 0.10, 10);

export const MECH_PROPORTIONS = {
  ankleY: 0.10,
  shinLen: 0.30,
  thighLen: 0.26,
  waistHeight: 0.16,
  chestHeight: 0.46,
  neckHeight: 0.06,
  headHeight: 0.20,
  shoulderXHero: 0.27,
  shoulderXGrunt: 0.24,
  hipX: 0.115,
  upperArmLen: 0.20,
  forearmLen: 0.19,
};
