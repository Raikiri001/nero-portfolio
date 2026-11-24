import * as THREE from 'three';
import {
  rectXZ, chamferXZ, ngonXZ, loft, prism, iBeam, grating, mergeGeometries,
} from '../geometry';
import { hangarWallMaps, steelMaps, floorMaps, hazardMap, screenMap } from '../textures';

// ============================================================
// Hangar-bay set dressing.
//
// Built from the same lofted/chamfered hard-surface toolkit as the mech so
// the two read as one world. Where the mech is fine detail, this is heavy
// structure: I-beam frames, multi-level catwalks with real railings, pipe
// runs, cable trays, truss ceilings, blast doors and service machinery.
//
// Everything is a module-level singleton shared by every bay instance;
// repeated detail clusters (railings, pipe banks, truss bays) are merged
// into single geometries so one dressed bay stays a modest draw-call cost
// even with a project's worth of them lined up down the corridor.
// ============================================================

export const BAY_WIDTH = 5.0;
export const BAY_DEPTH = 4.4;
export const BAY_HEIGHT = 4.6;

// ---- structural stock -----------------------------------------
export const BEAM_GEO = iBeam(0.22, 0.17, 0.04, 0.038);       // scale X = length
export const BEAM_SLIM_GEO = iBeam(0.13, 0.10, 0.028, 0.026);
export const PIPE_GEO = new THREE.CylinderGeometry(0.07, 0.07, 1, 12);
export const BOLT_PLATE_GEO = new THREE.BoxGeometry(0.17, 0.17, 0.03);

// ---- wall -----------------------------------------------------
export const WALL_PANEL_GEO = prism(rectXZ(BAY_DEPTH, 0.16), -BAY_HEIGHT / 2, BAY_HEIGHT / 2, { uv: 0.9 });

/** Hex vent: outer ring with an inset hex hole so it reads as a grate. */
export const HEX_VENT_GEO = (() => {
  const shape = new THREE.Shape();
  ngonXZ(0.44, 6, Math.PI / 6).forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
  shape.closePath();
  const hole = new THREE.Path();
  ngonXZ(0.29, 6, Math.PI / 6).forEach(([x, y], i) => (i ? hole.lineTo(x, y) : hole.moveTo(x, y)));
  hole.closePath();
  shape.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: 0.10, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.018, bevelSegments: 1,
  });
  g.translate(0, 0, -0.05);
  return g;
})();

/** Louvred intake grille — a recessed box with slats across it. */
export const GRILLE_GEO = (() => {
  const parts = [new THREE.BoxGeometry(0.62, 0.46, 0.05)];
  for (let i = 0; i < 6; i++) {
    const s = new THREE.BoxGeometry(0.58, 0.035, 0.07);
    s.translate(0, -0.19 + i * 0.076, 0.03);
    parts.push(s);
  }
  const frame = new THREE.BoxGeometry(0.68, 0.52, 0.035);
  frame.translate(0, 0, -0.02);
  parts.push(frame);
  return mergeGeometries(parts);
})();

/** Wall-mounted equipment cabinet with a raised door and handles. */
export const CABINET_GEO = (() => {
  const parts = [new THREE.BoxGeometry(0.5, 0.66, 0.20)];
  const door = new THREE.BoxGeometry(0.42, 0.56, 0.04);
  door.translate(0, 0, 0.11);
  parts.push(door);
  [-0.13, 0.13].forEach((y) => {
    const h = new THREE.BoxGeometry(0.05, 0.14, 0.05);
    h.translate(0.15, y, 0.15);
    parts.push(h);
  });
  return mergeGeometries(parts);
})();

/** Cable bundle: several sagging catenary tubes side by side. */
export const CABLE_BUNDLE_GEO = (() => {
  const parts = [];
  for (let c = 0; c < 5; c++) {
    const pts = [];
    const sag = 0.22 + c * 0.045;
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      pts.push(new THREE.Vector3(
        -0.5 + t,
        -Math.sin(t * Math.PI) * sag,
        (c - 2) * 0.035
      ));
    }
    parts.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, 0.019, 6, false));
  }
  return mergeGeometries(parts);
})();

/** Vertical pipe bank with periodic flange collars. */
export const PIPE_BANK_GEO = (() => {
  const parts = [];
  [-0.16, 0, 0.16].forEach((x, i) => {
    const r = 0.05 + i * 0.012;
    const p = new THREE.CylinderGeometry(r, r, 1, 10);
    p.translate(x, 0, 0);
    parts.push(p);
    for (let k = -1; k <= 1; k++) {
      const f = new THREE.TorusGeometry(r + 0.022, 0.02, 6, 12);
      f.rotateX(Math.PI / 2);
      f.translate(x, k * 0.33, 0);
      parts.push(f);
    }
  });
  return mergeGeometries(parts);
})();

// ---- catwalk --------------------------------------------------
export const CATWALK_DECK_GEO = grating(1.0, BAY_DEPTH * 0.92, 16);

/** Two-rail guard rail with posts and a kick plate, running along Z. */
export const RAILING_GEO = (() => {
  const len = BAY_DEPTH * 0.92;
  const parts = [];
  const rail = (y) => {
    const r = new THREE.CylinderGeometry(0.022, 0.022, len, 8);
    r.rotateX(Math.PI / 2);
    r.translate(0, y, 0);
    return r;
  };
  parts.push(rail(0.52), rail(0.28));
  const posts = 6;
  for (let i = 0; i <= posts; i++) {
    const p = new THREE.CylinderGeometry(0.026, 0.03, 0.55, 8);
    p.translate(0, 0.275, -len / 2 + (len / posts) * i);
    parts.push(p);
  }
  const kick = new THREE.BoxGeometry(0.03, 0.10, len);
  kick.translate(0, 0.05, 0);
  parts.push(kick);
  return mergeGeometries(parts);
})();

/** Diagonal under-brackets that carry the catwalk off the wall. */
export const CATWALK_BRACKET_GEO = (() => {
  const parts = [];
  const b = new THREE.BoxGeometry(0.62, 0.05, 0.07);
  b.rotateZ(-0.62);
  parts.push(b);
  const v = new THREE.BoxGeometry(0.05, 0.42, 0.07);
  v.translate(-0.26, -0.16, 0);
  parts.push(v);
  return mergeGeometries(parts);
})();

/** Access ladder — rails plus rungs. */
export const LADDER_GEO = (() => {
  const parts = [];
  [-0.13, 0.13].forEach((x) => {
    const r = new THREE.BoxGeometry(0.035, 1, 0.035);
    r.translate(x, 0, 0);
    parts.push(r);
  });
  for (let i = 0; i < 8; i++) {
    const g = new THREE.CylinderGeometry(0.016, 0.016, 0.26, 6);
    g.rotateZ(Math.PI / 2);
    g.translate(0, -0.44 + i * 0.125, 0);
    parts.push(g);
  }
  return mergeGeometries(parts);
})();

// ---- ceiling --------------------------------------------------
/** One truss bay: parallel chords with a zig-zag web between them. */
export const TRUSS_GEO = (() => {
  const span = BAY_WIDTH;
  const parts = [];
  [-0.22, 0.22].forEach((y) => {
    const c = new THREE.BoxGeometry(span, 0.06, 0.06);
    c.translate(0, y, 0);
    parts.push(c);
  });
  const segs = 8;
  for (let i = 0; i < segs; i++) {
    const d = new THREE.BoxGeometry(0.045, 0.50, 0.045);
    d.rotateZ(i % 2 === 0 ? 0.62 : -0.62);
    d.translate(-span / 2 + (span / segs) * (i + 0.5), 0, 0);
    parts.push(d);
  }
  return mergeGeometries(parts);
})();

export const LIGHT_HOUSING_GEO = (() => {
  const parts = [new THREE.BoxGeometry(1.5, 0.09, 0.24)];
  [-0.55, 0.55].forEach((x) => {
    const s = new THREE.BoxGeometry(0.05, 0.16, 0.05);
    s.translate(x, 0.11, 0);
    parts.push(s);
  });
  return mergeGeometries(parts);
})();
export const LIGHT_LENS_GEO = new THREE.BoxGeometry(1.38, 0.03, 0.17);
export const CRANE_RAIL_GEO = new THREE.BoxGeometry(BAY_WIDTH, 0.12, 0.16);

// ---- floor ----------------------------------------------------
export const FLOOR_GEO = new THREE.BoxGeometry(BAY_WIDTH, 0.14, BAY_DEPTH);

/** Raised circular docking pad the unit stands on. */
export const DOCK_PAD_GEO = loft(ngonXZ(1.12, 24), ngonXZ(1.02, 24), 0, 0.075, { uv: 1.4 });
export const DOCK_RING_GEO = new THREE.TorusGeometry(1.06, 0.032, 8, 40);
export const DOCK_INLAY_GEO = loft(ngonXZ(0.86, 24), ngonXZ(0.86, 24), 0, 0.012, { uv: 2 });

/** Recessed floor channel carrying cabling to the pad. */
export const FLOOR_CHANNEL_GEO = new THREE.BoxGeometry(0.34, 0.05, 1.5);
export const HAZARD_STRIP_GEO = new THREE.BoxGeometry(BAY_WIDTH, 0.035, 0.42);
export const ANCHOR_GEO = (() => {
  const parts = [new THREE.CylinderGeometry(0.09, 0.11, 0.07, 10)];
  const b = new THREE.CylinderGeometry(0.035, 0.035, 0.11, 6);
  b.translate(0, 0.05, 0);
  parts.push(b);
  return mergeGeometries(parts);
})();

// ---- back wall ------------------------------------------------
export const BLAST_DOOR_GEO = prism(chamferXZ(3.0, 0.18, 0.22), 0, 2.9, { uv: 1 });
export const DOOR_SEAM_GEO = new THREE.BoxGeometry(0.07, 2.8, 0.07);
export const DOOR_CHEVRON_GEO = new THREE.BoxGeometry(0.42, 0.11, 0.05);
/** Painted hazard band down each edge of the blast door. Reads as door
 *  marking, where a stack of separate chevrons floated unattached. */
export const DOOR_EDGE_BAND_GEO = new THREE.BoxGeometry(0.26, 2.62, 0.045);
export const BAY_SIGN_GEO = new THREE.BoxGeometry(1.05, 0.34, 0.06);

// ---- docking rig ----------------------------------------------
export const CRANE_TROLLEY_GEO = (() => {
  const parts = [new THREE.BoxGeometry(0.52, 0.24, 0.44)];
  [-0.2, 0.2].forEach((x) => {
    const w = new THREE.CylinderGeometry(0.07, 0.07, 0.06, 10);
    w.rotateZ(Math.PI / 2);
    w.translate(x, 0.14, 0);
    parts.push(w);
  });
  return mergeGeometries(parts);
})();
export const CRANE_ARM_GEO = new THREE.CylinderGeometry(0.075, 0.085, 1, 10);
export const CRANE_HOOK_GEO = (() => {
  const parts = [new THREE.BoxGeometry(0.34, 0.16, 0.34)];
  [-0.13, 0.13].forEach((x) => {
    const c = new THREE.BoxGeometry(0.07, 0.24, 0.16);
    c.translate(x, -0.18, 0);
    parts.push(c);
  });
  return mergeGeometries(parts);
})();

/**
 * Side support arm that clamps the unit's shoulder. Authored running from
 * a wall pivot at x=0 out to a clamp head at x=+1.22, so the caller mirrors
 * it inward per side rather than the arm reaching back into the wall.
 */
export const SUPPORT_ARM_GEO = (() => {
  const parts = [];
  const j = new THREE.CylinderGeometry(0.11, 0.11, 0.22, 12);
  j.rotateX(Math.PI / 2);
  parts.push(j);
  const a = new THREE.BoxGeometry(1.05, 0.10, 0.13);
  a.translate(0.58, 0, 0);
  parts.push(a);
  // Slim truss webbing under the arm so it reads as structure, not a slab.
  for (let i = 0; i < 4; i++) {
    const d = new THREE.BoxGeometry(0.035, 0.16, 0.035);
    d.rotateZ(i % 2 === 0 ? 0.7 : -0.7);
    d.translate(0.22 + i * 0.24, -0.10, 0);
    parts.push(d);
  }
  const head = new THREE.BoxGeometry(0.14, 0.26, 0.26);
  head.translate(1.20, 0, 0);
  parts.push(head);
  [-1, 1].forEach((s) => {
    const pad = new THREE.BoxGeometry(0.10, 0.09, 0.20);
    pad.translate(1.27, s * 0.10, 0);
    parts.push(pad);
  });
  return mergeGeometries(parts);
})();

/** Umbilical hose sagging from the wall down onto the unit's back. */
export const UMBILICAL_GEO = (() => {
  const pts = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    pts.push(new THREE.Vector3(t, -Math.sin(t * Math.PI) * 0.30 - t * 0.42, -t * 0.25));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.032, 7, false);
})();

// ---- props ----------------------------------------------------
export const CRATE_GEO = (() => {
  const parts = [new THREE.BoxGeometry(0.6, 0.44, 0.5)];
  [[0, 0.23, 0], [0, -0.23, 0]].forEach(([x, y, z]) => {
    const r = new THREE.BoxGeometry(0.64, 0.05, 0.54);
    r.translate(x, y, z);
    parts.push(r);
  });
  [-0.27, 0.27].forEach((x) => {
    const e = new THREE.BoxGeometry(0.06, 0.44, 0.54);
    e.translate(x, 0, 0);
    parts.push(e);
  });
  return mergeGeometries(parts);
})();

export const TANK_GEO = (() => {
  const parts = [new THREE.CylinderGeometry(0.24, 0.24, 0.78, 16)];
  [-0.39, 0.39].forEach((y) => {
    const c = new THREE.SphereGeometry(0.24, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    if (y < 0) c.rotateX(Math.PI);
    c.translate(0, y, 0);
    parts.push(c);
  });
  [-0.2, 0.2].forEach((y) => {
    const b = new THREE.TorusGeometry(0.25, 0.022, 6, 18);
    b.rotateX(Math.PI / 2);
    b.translate(0, y, 0);
    parts.push(b);
  });
  return mergeGeometries(parts);
})();

export const CONSOLE_GEO = (() => {
  const parts = [];
  const body = loft(chamferXZ(0.9, 0.42, 0.06), chamferXZ(0.82, 0.3, 0.05), 0, 0.6, { uv: 2 });
  parts.push(body);
  const desk = new THREE.BoxGeometry(0.94, 0.06, 0.5);
  desk.translate(0, 0.62, 0.04);
  parts.push(desk);
  return mergeGeometries(parts);
})();
export const CONSOLE_SCREEN_GEO = (() => {
  const g = new THREE.PlaneGeometry(0.66, 0.34);
  g.rotateX(-0.62);
  g.translate(0, 0.78, -0.02);
  return g;
})();

export const MONITOR_GEO = (() => {
  const parts = [new THREE.BoxGeometry(0.94, 0.6, 0.09)];
  const bezel = new THREE.BoxGeometry(1.02, 0.68, 0.05);
  bezel.translate(0, 0, -0.03);
  parts.push(bezel);
  return mergeGeometries(parts);
})();
export const MONITOR_SCREEN_GEO = new THREE.PlaneGeometry(0.84, 0.5);

export const WARN_LAMP_GEO = (() => {
  const parts = [new THREE.CylinderGeometry(0.055, 0.075, 0.05, 10)];
  const cage = new THREE.CylinderGeometry(0.062, 0.062, 0.10, 8, 1, true);
  cage.translate(0, 0.07, 0);
  parts.push(cage);
  return mergeGeometries(parts);
})();
export const WARN_LENS_GEO = new THREE.SphereGeometry(0.052, 12, 8);

// ---- docking rig stations --------------------------------------
// Shared by GantryBay (which builds the rig) and the sortie (which spawns
// steam and sparks where the rig lets go), so the bursts can never drift
// off the hardware they belong to.
export const CLAMP_X = BAY_WIDTH / 2 - 0.32;   // clamp pivot, either wall
export const CLAMP_Z = -0.35;
/** Docked, the crane hangs BEHIND the head (over the upper back), never
 *  through it: the head spans roughly z -0.6..0.4 bay-local. */
export const CRANE_Z = -0.85;
/** On undock the trolley rolls back by this much… */
export const CRANE_ROLL = -1.0;
/** …and the hoist reels the hook up by this much, telescoping the arm, so
 *  nothing rises through the bay roof. */
export const CRANE_LIFT = 1.3;

/**
 * Where the rig is when docked, for the sortie's release bursts (bay-local).
 * `clamps` are the wall pivots, `clampHeads` the jaws on the suit's
 * shoulders, `umbilicals` the hose ends on its back. Index 0 is the LEFT
 * wall (side -1), index 1 the right.
 */
export function undockAnchors(clampY) {
  const side = (s) => ({
    clamp: [s * CLAMP_X, clampY, CLAMP_Z],
    head: [s * (CLAMP_X - 1.22), clampY, CLAMP_Z],
    // UMBILICAL_GEO's free end is (1, -0.42, -0.25); DockRig mirrors it
    // inward with x-scale -0.95 and hangs it at (0, -0.12, 0.26).
    umbilical: [s * (CLAMP_X - 0.95), clampY - 0.12 - 0.42, CLAMP_Z + 0.26 - 0.25],
  });
  const l = side(-1);
  const r = side(1);
  return {
    clamps: [l.clamp, r.clamp],
    clampHeads: [l.head, r.head],
    umbilicals: [l.umbilical, r.umbilical],
  };
}

// ============================================================
// LAUNCH DECK, LAUNCH HALL AND CATAPULT TUNNEL — the deploy shot's stage.
//
// Bay-local layout (origin at the dock pad, +Z out of the bay mouth):
//
//   z -2.2 … 2.2    the bay (walls, roof plate at ROOF_Y)
//   z  2.2 … 6.4    the APRON: grating deck, the TRANSFER channel at
//                   TRANSFER_Z the pad slides right along
//   z  2.5 … 2.75   the LINTEL closing the hall above the bay mouth
//   z  6.4 … 12     the HALL floor, under a ceiling at HALL_HEIGHT
//   z 12 … 12.3     the FAR WALL, with one LAUNCH PORTAL per bay
//   z 12.3 … 42     the CATAPULT TUNNEL (deploying bay only) → HATCH_Z
//
// The catapult of bay i runs along x = CATAPULT_X, which is INSIDE bay
// i+1's x-slot (at its local LANE_X = -0.8). So every bay but the first
// carries a permanent LANE in its apron and hall floor at LANE_X: a flush
// plate strip either side of a recessed rail SLOT. The catapult only adds
// hardware to that lane when it mounts, and nothing it adds stands above
// the deck under the pad's path: the rails sit down in the slot, the side
// walls stand outside the pad's 1.12 radius.
//
// Everything on the pad's path is flush (top ≤ DECK_TOP). The pad is a
// 1.12-radius disc, 0.075 tall, sliding at deck level: a rail or kerb
// standing proud of the deck shows straight through its chamfered rim.
// ============================================================
export const APRON_DEPTH = 4.2;
export const APRON_Z = BAY_DEPTH / 2 + APRON_DEPTH / 2;  // centre line of the apron
/** Where the pull stops: the pad's centre on the transfer channel. */
export const TRANSFER_Z = 5.0;
/** Catapult centre line: far enough right to be out of frame at pull framing. */
export const CATAPULT_X = 4.2;

/** The hall's far wall (its hall-side face). */
export const HALL_FRONT_Z = 12;
/** Underside of the hall ceiling plate. Ribs and strip lights hang below
 *  it, down to HALL_CLEAR_Y. */
export const HALL_HEIGHT = 6.4;
export const HALL_CLEAR_Y = 6.05;
export const TUNNEL_START_Z = HALL_FRONT_Z;
export const HATCH_Z = TUNNEL_START_Z + 30;
/** Tunnel interior: half-width at the walls, height at the crown. */
export const TUNNEL_HALF_W = 1.9;
export const TUNNEL_HEIGHT = 4.4;
/** The crown corners are cut 0.9, the wall feet 0.3 — a chamfered tube. */
export const TUNNEL_CROWN_CHAMFER = 0.9;
export const TUNNEL_FOOT_CHAMFER = 0.3;
/** Catapult rail length past TRANSFER_Z: the bed runs to the hatch. */
export const CATAPULT_LEN = HATCH_Z - TRANSFER_Z;

/** The lane of the catapult belonging to the bay on the LEFT, bay-local. */
export const LANE_X = CATAPULT_X - BAY_WIDTH;
export const LANE_HALF_W = 1.45;
export const FAR_WALL_T = 0.3;
/** Bay roof plate underside — clear of the trusses and light stand-offs. */
export const ROOF_Y = 4.7;
/** Lintel over the bay mouth: back and front faces. The hall proper starts
 *  at its front face. */
export const LINTEL_Z0 = 2.5;
export const HALL_MOUTH_Z = 2.75;
/** The portal stub behind every far-wall portal: a short dead-end of tube
 *  closed by a shutter, so a portal never shows the void. */
export const STUB_LEN = 1.6;

const DECK_TOP = 0.004;
const SLOT_HALF = 0.55;     // rail slot, lane-relative
const SLOT_FLOOR = -0.22;
const SLOT_Z0 = TRANSFER_Z - 1.6;
const SIDE_WALL = [1.25, 1.39]; // catapult side walls, outside the pad's 1.12
const HD = BAY_DEPTH / 2;
const HWB = BAY_WIDTH / 2;
const END_CAP = [2.58, 2.78];   // end walls stand outside the bay wall plates

// ---- materials -------------------------------------------------
/**
 * The hangar's ONE material set, shared by every bay, hall segment, the
 * catapult and the tunnel (hard rule 5: never disposed per instance).
 * The emissive ones are animated once per scene by GantryLighting.
 */
function buildHangarMaterials() {
  const wallTex = hangarWallMaps();
  const steelTex = steelMaps();
  const floorTex = floorMaps();
  return {
    wall: new THREE.MeshStandardMaterial({
      color: '#5c6874', ...wallTex, roughness: 0.85, metalness: 0.35,
      normalScale: new THREE.Vector2(1.3, 1.3),
    }),
    wallDark: new THREE.MeshStandardMaterial({
      color: '#39434e', ...wallTex, roughness: 0.9, metalness: 0.3,
    }),
    steel: new THREE.MeshStandardMaterial({
      color: '#7d8894', ...steelTex, roughness: 0.55, metalness: 0.8,
      normalScale: new THREE.Vector2(1.1, 1.1),
    }),
    steelBlue: new THREE.MeshStandardMaterial({
      color: '#2f5f80', ...steelTex, roughness: 0.5, metalness: 0.75,
    }),
    steelDark: new THREE.MeshStandardMaterial({
      color: '#39424c', ...steelTex, roughness: 0.65, metalness: 0.7,
    }),
    floor: new THREE.MeshStandardMaterial({
      color: '#68727d', ...floorTex, roughness: 0.88, metalness: 0.25,
      normalScale: new THREE.Vector2(1.4, 1.4),
    }),
    hazard: new THREE.MeshStandardMaterial({ map: hazardMap(), roughness: 0.8, metalness: 0.2 }),
    rubber: new THREE.MeshStandardMaterial({ color: '#15181d', roughness: 0.95, metalness: 0.05 }),
    vent: new THREE.MeshStandardMaterial({ color: '#0e1116', roughness: 0.9, metalness: 0.4 }),
    copper: new THREE.MeshStandardMaterial({ color: '#8a5a32', ...steelTex, roughness: 0.45, metalness: 0.85 }),
    screen: new THREE.MeshBasicMaterial({ map: screenMap(), toneMapped: false }),
    // bay strip lamps: cool white, → dim red at alert
    lamp: new THREE.MeshStandardMaterial({
      color: '#0a0a0c', emissive: '#cfe8ff', emissiveIntensity: 2.2, roughness: 0.2,
    }),
    // hall ceiling strips: their own material so the hall can go red on a
    // different curve from the bays
    hallLamp: new THREE.MeshStandardMaterial({
      color: '#0a0a0c', emissive: '#d8ecff', emissiveIntensity: 2.0, roughness: 0.2,
    }),
    warnRed: new THREE.MeshStandardMaterial({
      color: '#180205', emissive: '#ff2438', emissiveIntensity: 2, roughness: 0.3,
    }),
    warnAmber: new THREE.MeshStandardMaterial({
      color: '#1a1200', emissive: '#ffb020', emissiveIntensity: 1.6, roughness: 0.3,
    }),
    guide: new THREE.MeshStandardMaterial({
      color: '#062434', emissive: '#0090d9', emissiveIntensity: 1.5, roughness: 0.4,
    }),
    // hall alert beacon: the lens, and the sweeping additive light bar that
    // spins inside it. The bar is invisible (not drawn at all) at alert 0.
    beaconLens: new THREE.MeshStandardMaterial({
      color: '#1c0306', emissive: '#ff2a1a', emissiveIntensity: 0.15, roughness: 0.25,
    }),
    beaconBar: new THREE.MeshBasicMaterial({
      color: '#ff3020', transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
      visible: false,
    }),
    // per-instance coloured lamps (catapult rail lamps, tunnel strips):
    // one draw call each, colour written per instance every frame
    instLamp: new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
  };
}
let _hangarMats = null;
export const hangarMats = () => (_hangarMats ||= buildHangarMaterials());

// ---- straight-edge construction helpers ---------------------------
/** Box from min/max corners. */
function bx(x0, x1, y0, y1, z0, z1) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}

const signedArea = (pts) => THREE.ShapeUtils.area(pts.map(([x, y]) => new THREE.Vector2(x, y)));
const ccwOf = (pts) => (signedArea(pts) < 0 ? [...pts].reverse() : pts);
const cwOf = (pts) => (signedArea(pts) > 0 ? [...pts].reverse() : pts);

function geoFrom(pos) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals(); // non-indexed: one normal per face, flat
  return g;
}

/** Push the side quads of a path swept from z0 to z1. For a CCW outline
 *  the faces point away from its interior; `flip` turns them inward. */
function sweepSides(pos, path, z0, z1, closed, flip) {
  const n = path.length;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p = path[i];
    const q = path[(i + 1) % n];
    const A = [p[0], p[1], z0];
    const B = [q[0], q[1], z0];
    const C = [q[0], q[1], z1];
    const D = [p[0], p[1], z1];
    if (flip) pos.push(...A, ...C, ...B, ...A, ...D, ...C);
    else pos.push(...A, ...B, ...C, ...A, ...C, ...D);
  }
}

/**
 * A closed solid: an outline in XY (with optional holes) swept straight
 * along Z. Outward-facing, flat faces. Concave outlines are fine (the caps
 * are ear-clipped).
 */
export function prismZ(outline, z0, z1, holes = []) {
  const outer = ccwOf(outline);
  const hs = holes.map(cwOf);
  const pos = [];
  sweepSides(pos, outer, z0, z1, true, false);
  hs.forEach((h) => sweepSides(pos, h, z0, z1, true, false));
  const all = [...outer, ...hs.flat()];
  const tris = THREE.ShapeUtils.triangulateShape(
    outer.map(([x, y]) => new THREE.Vector2(x, y)),
    hs.map((h) => h.map(([x, y]) => new THREE.Vector2(x, y))),
  );
  tris.forEach(([a, b, c]) => {
    const p = all[a];
    let q = all[b];
    let r = all[c];
    if ((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]) < 0) [q, r] = [r, q];
    pos.push(p[0], p[1], z1, q[0], q[1], z1, r[0], r[1], z1);
    pos.push(p[0], p[1], z0, r[0], r[1], z0, q[0], q[1], z0);
  });
  return geoFrom(pos);
}

/** An open shell: a CCW path swept along Z, faces pointing INTO the path's
 *  interior (a tube seen from inside). */
function shellZ(path, z0, z1) {
  const pos = [];
  sweepSides(pos, ccwOf(path), z0, z1, false, true);
  return geoFrom(pos);
}

/**
 * Box-projected UVs in world units, from each face's dominant axis. A long
 * hall plate textured 0..1 per face stretches one tile over five metres;
 * this keeps one texel density over every merged hall surface.
 */
function worldUV(g, s) {
  const p = g.getAttribute('position');
  const n = g.getAttribute('normal');
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i));
    const ay = Math.abs(n.getY(i));
    const az = Math.abs(n.getZ(i));
    let u;
    let v;
    if (ax >= ay && ax >= az) { u = p.getZ(i); v = p.getY(i); }
    else if (ay >= az) { u = p.getX(i); v = p.getZ(i); }
    else { u = p.getX(i); v = p.getY(i); }
    uv[i * 2] = u * s;
    uv[i * 2 + 1] = v * s;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

// Texel density per material slot: ~one texture tile per 4.8 units, the
// same as a bay wall; hazard stripes at a painted-marking scale.
const UV_SCALE = { hazard: 0.9 };
const SLOT_ORDER = [
  'wallDark', 'wall', 'steel', 'steelDark', 'steelBlue', 'floor', 'hazard', 'vent',
  'hallLamp', 'beaconLens', 'guide',
];

/** Collects pieces per material slot, merges each slot into one geometry. */
function slots() {
  const by = {};
  return {
    add(slot, ...geos) { (by[slot] ||= []).push(...geos); },
    build() {
      return SLOT_ORDER.filter((k) => by[k]?.length).map((k) => ({
        slot: k,
        geometry: worldUV(mergeGeometries(by[k]), UV_SCALE[k] ?? 1 / 4.8),
      }));
    },
  };
}

// ---- the tunnel cross-section ------------------------------------
/**
 * The catapult tube's profile, lane-relative, offset by `t` (positive =
 * outward). A rectangle with its crown corners and wall feet cut flat: the
 * path runs CCW from the right foot to the left foot, open along the floor.
 */
export function tunnelProfile(t = 0) {
  const a = TUNNEL_HALF_W;
  const h = TUNNEL_HEIGHT;
  const k = t * Math.SQRT2;
  const crown = a + h - TUNNEL_CROWN_CHAMFER + k;   // x + y on the crown cut
  const foot = a - TUNNEL_FOOT_CHAMFER + k;          // x - y on the foot cut
  const R = [
    [foot, 0],
    [a + t, a + t - foot],
    [a + t, crown - (a + t)],
    [crown - (h + t), h + t],
  ];
  return [...R, ...R.slice().reverse().map(([x, y]) => [-x, y])];
}

/** A U-shaped frame between two offsets of the profile, standing on the
 *  floor — a rib, a portal surround, a hatch frame. */
function profileRing(tIn, tOut) {
  return [...tunnelProfile(tOut), ...tunnelProfile(tIn).reverse()];
}

const moveX = (pts, dx) => pts.map(([x, y]) => [x + dx, y]);

// ---- the deck ---------------------------------------------------------
/** The lane strip at lane-relative x = 0: flush plates either side of the
 *  rail slot, the slot lined in vent black. Before SLOT_Z0 the slot is
 *  plated over (the deflector folds down there). */
function laneStrip(S, cx, z0, z1, plateSlot) {
  const sz0 = Math.max(z0, SLOT_Z0);
  [-1, 1].forEach((s) => {
    const xa = cx + s * SLOT_HALF;
    const xb = cx + s * LANE_HALF_W;
    S.add(plateSlot, bx(Math.min(xa, xb), Math.max(xa, xb), DECK_TOP - 0.1, DECK_TOP, z0, z1));
  });
  if (z0 < SLOT_Z0) {
    S.add(plateSlot, bx(cx - SLOT_HALF, cx + SLOT_HALF, DECK_TOP - 0.1, DECK_TOP, z0, SLOT_Z0));
    S.add('vent', bx(cx - SLOT_HALF, cx + SLOT_HALF, SLOT_FLOOR, -0.1, SLOT_Z0 - 0.02, SLOT_Z0));
  }
  if (z1 > sz0) {
    S.add('vent', bx(cx - SLOT_HALF, cx + SLOT_HALF, SLOT_FLOOR - 0.03, SLOT_FLOOR, sz0, z1));
    [-1, 1].forEach((s) => {
      const x = cx + s * (SLOT_HALF - 0.01);
      S.add('vent', bx(x - 0.01, x + 0.01, SLOT_FLOOR, 0, sz0, z1));
    });
  }
}

/** The x-ranges of a segment's deck outside the lane. */
function deckRanges(kind) {
  const L0 = LANE_X - LANE_HALF_W;
  const L1 = LANE_X + LANE_HALF_W;
  if (kind === 'first') return [[-END_CAP[0], HWB]];
  if (kind === 'end') return [[-HWB, L0], [L1, END_CAP[0]]];
  return [[-HWB, L0], [L1, HWB]];
}

/**
 * The apron: grating deck with the TRANSFER channel let into it, its rails
 * below deck level, and a flush hazard band at the hall line. `kind` is
 * 'first' (no lane — nothing launches from the left of bay 0), 'mid', or
 * 'end' (the hall-only segment past the last bay, closed at HALL_MOUTH_Z).
 */
function apronInto(S, kind) {
  const z0 = kind === 'end' ? HALL_MOUTH_Z : HD;
  const z1 = HD + APRON_DEPTH;
  const c0 = TRANSFER_Z - 0.65;
  const c1 = TRANSFER_Z + 0.65;
  const band = z1 - 0.16;
  deckRanges(kind).forEach(([x0, x1]) => {
    const w = x1 - x0;
    const cx = (x0 + x1) / 2;
    [[z0, c0], [c1, band]].forEach(([za, zb]) => {
      const g = grating(w, zb - za, Math.max(2, Math.round((zb - za) / 0.42)));
      g.translate(cx, -0.02, (za + zb) / 2);
      S.add('steelDark', g);
    });
    S.add('hazard', bx(x0, x1, DECK_TOP - 0.05, DECK_TOP, band, z1));
    // the transfer channel: floor + walls below deck, rails just under it
    S.add('vent', bx(x0, x1, -0.1, -0.08, c0, c1));
    [c0, c1].forEach((z) => S.add('vent', bx(x0, x1, -0.1, DECK_TOP, z - 0.01, z + 0.01)));
    [-0.42, 0.42].forEach((dz) => {
      S.add('steel', bx(x0, x1, -0.08, -0.004, TRANSFER_Z + dz - 0.045, TRANSFER_Z + dz + 0.045));
    });
  });
  if (kind !== 'first') laneStrip(S, LANE_X, z0, z1, 'steel');
}

/** Bay-local apron geometry per slot (cached). `hasLane` false for bay 0. */
const _apron = {};
export function apronParts(hasLane) {
  const key = hasLane ? 'mid' : 'first';
  if (!_apron[key]) {
    const S = slots();
    apronInto(S, key);
    _apron[key] = S.build();
  }
  return _apron[key];
}

// ---- the hall ---------------------------------------------------------
/** Far-wall outline for one segment, x tiling from its own portal's left
 *  jamb to the next segment's (period BAY_WIDTH). */
function farWallOutline(kind) {
  const HH = HALL_HEIGHT + 0.15;
  const nextFoot = [[LANE_X + BAY_WIDTH - TUNNEL_HALF_W, 0],
    [LANE_X + BAY_WIDTH - TUNNEL_HALF_W + TUNNEL_FOOT_CHAMFER, 0]];
  const right = kind === 'end'
    ? [[END_CAP[1], 0], [END_CAP[1], HH]]
    : [nextFoot[1], [nextFoot[0][0], TUNNEL_FOOT_CHAMFER], [nextFoot[0][0], HH]];
  if (kind === 'first') {
    return [[-END_CAP[0], 0], ...right, [-END_CAP[0], HH]];
  }
  // Our own portal, cut as a notch in the left of the outline: from the
  // right foot, round the far side, across the top, down the left jamb to
  // the crown cut, then back along the portal's crown and right wall. The
  // left wall below the crown cut belongs to the left neighbour's outline.
  const P = moveX(tunnelProfile(0), LANE_X);
  return [P[0], ...right, [P[5][0], HH], P[5], P[4], P[3], P[2], P[1]];
}

/** Chamfered rectangle in XY (a raised panel's face). */
const panelXY = (x0, x1, y0, y1, c) => [
  [x0 + c, y0], [x1 - c, y0], [x1, y0 + c], [x1, y1 - c],
  [x1 - c, y1], [x0 + c, y1], [x0, y1 - c], [x0, y0 + c],
];

/** An octagonal pipe run along X — faceted stock, like the rest of the set. */
function pipeX(x0, x1, y, z, r) {
  const g = prism(ngonXZ(r, 8, Math.PI / 8), x0, x1, { uv: 1 });
  // prism runs along +Y with its section in XZ; lay it along +X
  g.rotateZ(-Math.PI / 2);
  g.translate(0, y, z);
  return g;
}

/** One beacon housing: an octagonal base on a wall bracket, lens on top.
 *  The spinning light bar is a separate mesh (BEACON_BAR_GEO). */
function beaconInto(S, x, y, z) {
  S.add('steelDark', bx(x - 0.1, x + 0.1, y - 0.28, y - 0.12, z, HALL_FRONT_Z));   // bracket
  const base = prism(ngonXZ(0.15, 8, Math.PI / 8), y - 0.12, y, { uv: 1 });
  base.translate(x, 0, z);
  const lens = loft(ngonXZ(0.12, 8, Math.PI / 8), ngonXZ(0.08, 8, Math.PI / 8), y, y + 0.2, { uv: 1 });
  lens.translate(x, 0, z);
  S.add('steelDark', base);
  S.add('beaconLens', lens);
}
/** Where each hall segment's alert beacon sits (segment-local). */
export const HALL_BEACON = [LANE_X + 1.35, 5.3, HALL_FRONT_Z - 0.32];

/** Two crossed pairs of wedge blades: a light bar that reads as a swept
 *  beam from any angle once it spins. Additive, so overlaps just brighten. */
export const BEACON_BAR_GEO = (() => {
  const pos = [];
  const L = 1.1;
  [1, -1].forEach((s) => {
    // vertical blade
    pos.push(0, -0.04, 0, s * L, -0.2, 0, s * L, 0.2, 0);
    pos.push(0, -0.04, 0, s * L, 0.2, 0, 0, 0.04, 0);
    // horizontal blade
    pos.push(0, 0, -0.04, s * L, 0, -0.2, s * L, 0, 0.2);
    pos.push(0, 0, -0.04, s * L, 0, 0.2, 0, 0, 0.04);
  });
  return geoFrom(pos);
})();

/**
 * One launch-hall segment, segment-local (= bay-local), as merged geometry
 * per material slot. `kind`:
 *   'first'  bay 0: left end wall, no portal (no bay launches from its left)
 *   'mid'    any other bay: portal at LANE_X
 *   'end'    the hall-only segment past the last bay: portal, a back wall at
 *            the bay-mouth line instead of a bay, and the right end wall
 * The portal STUB is separate (stubParts) because it hides while that
 * lane's catapult tunnel is mounted.
 */
const _hall = {};
export function hallParts(kind) {
  if (_hall[kind]) return _hall[kind];
  const S = slots();
  const HH = HALL_HEIGHT;
  const ZF = HALL_FRONT_Z;
  const xl = kind === 'first' ? -END_CAP[0] : -HWB;
  const xr = kind === 'end' ? END_CAP[0] : HWB;
  const hasBay = kind !== 'end';
  const hasPortal = kind !== 'first';
  const zFloor0 = HD + APRON_DEPTH;

  // ---- floor: the apron's continuation to (and under) the far wall
  deckRanges(kind).forEach(([x0, x1]) => {
    S.add('floor', bx(x0, x1, DECK_TOP - 0.1, DECK_TOP, zFloor0, ZF + FAR_WALL_T));
    // seam strips every 2.4 so the plates read as plates, flush
    for (let z = zFloor0 + 2.4; z < ZF; z += 2.4) {
      S.add('vent', bx(x0, x1, DECK_TOP - 0.02, DECK_TOP + 0.003, z - 0.02, z + 0.02));
    }
  });
  if (hasPortal) laneStrip(S, LANE_X, zFloor0, ZF + FAR_WALL_T, 'steel');
  if (!hasBay) apronInto(S, 'end');

  // ---- ceiling plate, ribs and strip-light fixtures
  const zc0 = hasBay ? LINTEL_Z0 : HD;
  S.add('wallDark', bx(xl, xr, HH, HH + 0.16, zc0, ZF + FAR_WALL_T));
  for (let z = 4.0; z < ZF; z += 2.4) {
    // I-section rib across the hall: web + bottom flange
    S.add('steel', bx(xl, xr, HH - 0.22, HH, z - 0.03, z + 0.03));
    S.add('steel', bx(xl, xr, HH - 0.26, HH - 0.22, z - 0.11, z + 0.11));
  }
  [-1.25, 1.25].forEach((x) => {
    S.add('steelDark', bx(x - 0.16, x + 0.16, HH - 0.32, HH - 0.26, 3.2, ZF - 0.6));
    S.add('steelDark', bx(x - 0.05, x + 0.05, HH - 0.26, HH, 3.2, 3.3));
    S.add('steelDark', bx(x - 0.05, x + 0.05, HH - 0.26, HH, ZF - 0.7, ZF - 0.6));
    S.add('hallLamp', bx(x - 0.11, x + 0.11, HH - 0.35, HH - 0.32, 3.3, ZF - 0.7));
  });

  // ---- over the bay: roof plate, edge skirts, and the lintel
  if (hasBay) {
    S.add('wallDark', bx(-HWB, HWB, ROOF_Y, ROOF_Y + 0.12, -HD - 0.15, LINTEL_Z0));
    S.add('steelDark', bx(-HWB, -HWB + 0.15, ROOF_Y - 0.15, ROOF_Y, -HD - 0.15, LINTEL_Z0));
    S.add('steelDark', bx(HWB - 0.15, HWB, ROOF_Y - 0.15, ROOF_Y, -HD - 0.15, LINTEL_Z0));
    S.add('steelDark', bx(-HWB, HWB, ROOF_Y - 0.15, ROOF_Y, -HD - 0.15, -HD));
    // the lintel: wall from the roof to the hall ceiling, a hazard band
    // along its lower edge, an I-beam and two panels on its face
    S.add('wallDark', prismZ([[-HWB, ROOF_Y + 0.12], [HWB, ROOF_Y + 0.12], [HWB, HH], [-HWB, HH]],
      LINTEL_Z0, HALL_MOUTH_Z));
    S.add('wallDark', bx(-HWB, HWB, ROOF_Y, ROOF_Y + 0.12, LINTEL_Z0, HALL_MOUTH_Z - 0.06));
    S.add('hazard', bx(-HWB, HWB, ROOF_Y, ROOF_Y + 0.18, HALL_MOUTH_Z - 0.06, HALL_MOUTH_Z + 0.02));
    S.add('steel', bx(-HWB, HWB, ROOF_Y + 0.9, ROOF_Y + 1.06, HALL_MOUTH_Z, HALL_MOUTH_Z + 0.1));
    S.add('steelDark', prismZ(panelXY(-1.9, -0.25, ROOF_Y + 0.3, ROOF_Y + 0.8, 0.06), HALL_MOUTH_Z, HALL_MOUTH_Z + 0.05));
    S.add('steelDark', prismZ(panelXY(0.25, 1.9, ROOF_Y + 0.3, ROOF_Y + 0.8, 0.06), HALL_MOUTH_Z, HALL_MOUTH_Z + 0.05));
  } else {
    // hall-only segment: a plain bulkhead where a bay mouth would be
    S.add('wallDark', bx(-HWB, END_CAP[1], -0.15, HH + 0.16, HD, HALL_MOUTH_Z));
    [-1.6, 0, 1.6].forEach((x) => {
      S.add('steel', bx(x - 0.08, x + 0.08, 0, HH, HALL_MOUTH_Z, HALL_MOUTH_Z + 0.12));
    });
    S.add('steelDark', prismZ(panelXY(-1.45, -0.15, 0.8, 4.0, 0.12), HALL_MOUTH_Z, HALL_MOUTH_Z + 0.06));
    S.add('steelDark', prismZ(panelXY(0.15, 1.45, 0.8, 4.0, 0.12), HALL_MOUTH_Z, HALL_MOUTH_Z + 0.06));
    S.add('hazard', bx(-HWB, END_CAP[0], 0, 0.3, HALL_MOUTH_Z, HALL_MOUTH_Z + 0.04));
  }

  // ---- end walls (outside the bay wall plates, so they never z-fight)
  const endWall = (s) => {
    const xo = s * END_CAP[1];
    const xi = s * END_CAP[0];
    const zs = hasBay ? -HD - 0.2 : HD;
    S.add('wallDark', bx(Math.min(xo, xi), Math.max(xo, xi), -0.15, HH + 0.16, zs, ZF + FAR_WALL_T));
    const xf = xi - s * 0.14;   // dressing face, standing into the hall
    const lo = Math.min(xi, xf);
    const hi = Math.max(xi, xf);
    S.add('steelDark', bx(lo, hi, 0, 0.28, HALL_MOUTH_Z, ZF));            // kick plate
    S.add('steelDark', bx(lo, hi, HH - 0.18, HH, HALL_MOUTH_Z, ZF));      // cornice
    for (let z = 4.0; z < ZF; z += 2.4) S.add('steel', bx(lo, hi, 0, HH, z - 0.1, z + 0.1));
    S.add('hazard', bx(s < 0 ? xi : xi - 0.04, s < 0 ? xi + 0.04 : xi, 1.0, 1.25, HALL_MOUTH_Z, ZF));
    // raised panels between the stanchions. Drawn in XY with x standing in
    // for z, then turned to face into the hall: rotateY(+90) maps x → -z,
    // so the left wall's outline is authored negated.
    for (let z = 4.0 + 1.2; z < ZF; z += 2.4) {
      const [za, zb] = s < 0 ? [-(z + 0.95), -(z - 0.95)] : [z - 0.95, z + 0.95];
      const p = prismZ(panelXY(za, zb, 1.6, 4.2, 0.14), 0, 0.05);
      p.rotateY(-s * Math.PI / 2);
      p.translate(xi, 0, 0);
      S.add('steelDark', p);
    }
  };
  if (kind === 'first') endWall(-1);
  if (kind === 'end') endWall(1);

  // ---- the far wall
  S.add('wallDark', prismZ(farWallOutline(kind), ZF, ZF + FAR_WALL_T));
  const face = ZF - 0.06;
  if (hasPortal) {
    // hazard surround on the portal, following the cut corners
    S.add('hazard', prismZ(moveX(profileRing(0, 0.18), LANE_X), face, ZF));
  } else {
    [[-2.3, -1.25], [-1.05, 0.0], [0.2, 1.2]].forEach(([x0, x1]) => {
      S.add('steelDark', prismZ(panelXY(x0, x1, 0.6, 2.5, 0.1), face, ZF));
      S.add('steelDark', prismZ(panelXY(x0, x1, 2.7, 4.4, 0.1), face, ZF));
    });
  }
  // personnel door, right of the portal
  S.add('steel', bx(1.36, 1.42, 0, 2.18, face - 0.04, ZF));
  S.add('steel', bx(2.03, 2.09, 0, 2.18, face - 0.04, ZF));
  S.add('steel', bx(1.36, 2.09, 2.1, 2.18, face - 0.04, ZF));
  S.add('steelDark', bx(1.42, 2.03, 0, 2.1, face + 0.02, ZF));   // (one slot fewer: a draw call)
  S.add('guide', bx(1.62, 1.83, 1.5, 1.8, face, ZF));
  S.add('guide', bx(1.5, 1.95, 2.3, 2.42, face - 0.02, ZF));
  S.add('steelDark', prismZ(panelXY(1.4, 2.05, 2.7, 4.3, 0.08), face, ZF));
  S.add('steelDark', prismZ(panelXY(1.4, 2.05, 4.5, 5.75, 0.08), face, ZF));
  S.add('steelDark', prismZ(panelXY(-2.55, -1.75, 4.75, 5.75, 0.08), face, ZF));
  // lane sign over the portal: a framed block of lit tally bars
  const sx = LANE_X - 0.75;
  S.add('steelDark', prismZ(panelXY(sx, LANE_X + 0.75, 4.7, 5.15, 0.06), face - 0.04, ZF));
  for (let i = 0; i < 5; i++) {
    const x = sx + 0.2 + i * 0.27;
    S.add('guide', bx(x, x + 0.16, 4.82, 5.03, face - 0.07, face - 0.04));
  }
  // service pipe runs along the wall's top, tiling segment to segment
  const px0 = kind === 'first' ? -END_CAP[0] : LANE_X - TUNNEL_HALF_W;
  const px1 = kind === 'end' ? END_CAP[0] : LANE_X + BAY_WIDTH - TUNNEL_HALF_W;
  [5.95, 6.15].forEach((y, i) => {
    S.add('steel', pipeX(px0, px1, y, ZF - 0.14 - i * 0.04, 0.06));
    for (let x = px0 + 0.6; x < px1; x += 1.25) S.add('steel', pipeX(x - 0.04, x + 0.04, y, ZF - 0.14 - i * 0.04, 0.085));
  });
  // the alert beacon's housing (the spinning bar is its own mesh)
  beaconInto(S, HALL_BEACON[0], HALL_BEACON[1], HALL_BEACON[2]);

  _hall[kind] = S.build();
  return _hall[kind];
}

/**
 * The dead-end behind a far-wall portal: a short run of tube, its floor,
 * and a closed inner shutter, lane-relative z from the far wall's back
 * face. Hidden (HallSegment `portalOpen`) while the catapult tunnel
 * belonging to that lane is mounted, since the tunnel occupies the same
 * space.
 */
let _stub = null;
export function stubParts() {
  if (_stub) return _stub;
  const S = slots();
  const z0 = HALL_FRONT_Z + FAR_WALL_T;
  const z1 = z0 + STUB_LEN;
  const P = moveX(tunnelProfile(0), LANE_X);
  S.add('steelDark', shellZ(P, z0, z1));
  S.add('steelDark', bx(LANE_X - TUNNEL_HALF_W, LANE_X + TUNNEL_HALF_W, DECK_TOP - 0.1, DECK_TOP, z0, z1));
  S.add('steelDark', prismZ(P, z1 - 0.2, z1 + 0.05));                     // the shutter
  S.add('hazard', prismZ(moveX(profileRing(-0.22, 0), LANE_X), z1 - 0.26, z1 - 0.2));
  S.add('hazard', bx(LANE_X - 0.05, LANE_X + 0.05, 0, TUNNEL_HEIGHT, z1 - 0.24, z1 - 0.2));
  _stub = S.build();
  return _stub;
}

// ---- the catapult -------------------------------------------------------
/** Catapult-local (origin at [CATAPULT_X, 0, TRANSFER_Z]) extents of the
 *  bed: from just behind the pad's rest point to the hatch. */
export const CATAPULT_Z0 = SLOT_Z0 - TRANSFER_Z;
export const CATAPULT_Z1 = HATCH_Z - TRANSFER_Z;
/** The left wall opens where the pad slides in from the left. */
const LEFT_WALL_Z0 = 1.35;
export const LAUNCH_LAMP_COUNT = 8;
/** Lamp positions down both side walls inside the hall (catapult-local),
 *  in pairs [left, right] per step. */
export const LAUNCH_LAMPS = Array.from({ length: LAUNCH_LAMP_COUNT * 2 }, (_, j) => {
  const i = j >> 1;
  const s = j & 1 ? 1 : -1;
  return { i, pos: [s * (SIDE_WALL[0] - 0.02), 0.22, 1.7 + i * ((HALL_FRONT_Z - TRANSFER_Z - 2.2) / LAUNCH_LAMP_COUNT)] };
});

let _catapult = null;
export function catapultParts() {
  if (_catapult) return _catapult;
  const S = slots();
  const z0 = CATAPULT_Z0;
  const z1 = CATAPULT_Z1;
  // twin rails down in the slot, on sleepers — all below deck level
  [-0.3, 0.3].forEach((x) => S.add('steel', bx(x - 0.045, x + 0.045, SLOT_FLOOR + 0.04, -0.03, z0, z1)));
  for (let z = z0 + 0.3; z < z1; z += 0.9) {
    S.add('steelDark', bx(-SLOT_HALF + 0.03, SLOT_HALF - 0.03, SLOT_FLOOR, SLOT_FLOOR + 0.04, z - 0.07, z + 0.07));
  }
  // side walls outside the pad, a chamfered top and a hazard cap
  const wall = (s) => {
    const [a, b] = SIDE_WALL;
    const prof = [[a, 0], [b, 0], [b, 0.24], [b - 0.06, 0.3], [a, 0.3]].map(([x, y]) => [s * x, y]);
    const start = s < 0 ? LEFT_WALL_Z0 : z0;
    S.add('steelDark', prismZ(prof, start, z1));
    S.add('hazard', bx(s > 0 ? a : -b + 0.06, s > 0 ? b - 0.06 : -a, 0.3, 0.32, start, Math.min(z1, HALL_FRONT_Z - TRANSFER_Z)));
    S.add('steelDark', bx(Math.min(s * a, s * b), Math.max(s * a, s * b), 0, 0.3, start - 0.02, start));
  };
  wall(-1);
  wall(1);
  _catapult = S.build();
  return _catapult;
}

// ---- the catapult tunnel -------------------------------------------------
/** Lamp blocks along the tube (lane-relative x, absolute bay-local z),
 *  each with its run fraction `f` 0 (portal) → 1 (hatch) so they can run
 *  in sequence. Four rows: both walls, both crown cuts. */
export const TUNNEL_LAMPS = (() => {
  const out = [];
  const zA = HALL_FRONT_Z + FAR_WALL_T;
  const zB = HATCH_Z - 0.6;
  const a = TUNNEL_HALF_W;
  const cm = [a - TUNNEL_CROWN_CHAMFER / 2, TUNNEL_HEIGHT - TUNNEL_CROWN_CHAMFER / 2];
  // a lamp a unit either side of every rib frame (tunnelParts places the
  // ribs at zA + 1.5 + 3k), so no lamp is buried in a rib
  for (let rib = zA + 1.5; rib - 1 < zB - 0.5; rib += 3) {
    [rib - 1, rib + 1].filter((z) => z < zB - 0.5).forEach((z) => {
      const f = (z - zA) / (zB - zA);
      [-1, 1].forEach((s) => {
        out.push({ pos: [s * (a - 0.03), 1.5, z], rotZ: 0, f });
        out.push({ pos: [s * (cm[0] - 0.025), cm[1] - 0.025, z], rotZ: s * Math.PI / 4, f });
      });
    });
  }
  return out;
})();
export const TUNNEL_LAMP_GEO = new THREE.BoxGeometry(0.06, 0.14, 0.55);

/** Blast-door outlines, lane-relative: the two leaves meet on a stepped
 *  seam (a tooth on the left leaf, a notch in the right), so the closed
 *  hatch reads as interlocked armour, not two slabs. */
const DOOR_L = [[-2.0, -0.25], [0, -0.25], [0, 1.6], [0.25, 1.9], [0.25, 2.5], [0, 2.8],
  [0, 4.5], [-0.95, 4.5], [-2.0, 3.45]];
const DOOR_R = [[0, -0.25], [2.0, -0.25], [2.0, 3.45], [0.95, 4.5], [0, 4.5], [0, 2.8],
  [0.25, 2.5], [0.25, 1.9], [0, 1.6]];
/** How far each leaf slides at hatch = 1 — fully clear of the opening. */
export const HATCH_TRAVEL = 2.35;
const DOOR_Z = [HATCH_Z - 0.35, HATCH_Z - 0.1];

const _doors = {};
/** One hatch leaf (side -1 left / +1 right) as slot geometry, lane-relative. */
export function hatchDoorParts(side) {
  if (_doors[side]) return _doors[side];
  const S = slots();
  S.add('steelBlue', prismZ(side < 0 ? DOOR_L : DOOR_R, DOOR_Z[0], DOOR_Z[1]));
  // hazard chevrons on the tunnel face
  const xs = side < 0 ? [-1.8, -1.4, -1.0, -0.6] : [0.2, 0.6, 1.0, 1.4];
  xs.forEach((x) => {
    S.add('hazard', prismZ([[x, 0.9], [x + 0.2, 0.9], [x + 0.4, 1.5], [x + 0.2, 1.5]], DOOR_Z[0] - 0.03, DOOR_Z[0]));
  });
  S.add('steel', bx(side < 0 ? -1.85 : 0.3, side < 0 ? -0.3 : 1.85, 3.0, 3.2, DOOR_Z[0] - 0.04, DOOR_Z[0]));
  _doors[side] = S.build();
  return _doors[side];
}

/**
 * The tube, lane-relative (x = 0 on the lane; the caller places it at
 * CATAPULT_X), z absolute bay-local: interior shell from the far wall's
 * back face to the hatch bulkhead, rib frames every 3, the floor with its
 * rail slot, the bulkhead the hatch leaves slide into, and a hazard frame
 * round the hatch. Every interior surface is closed: the camera rides
 * inside it.
 */
let _tunnel = null;
export function tunnelParts() {
  if (_tunnel) return _tunnel;
  const S = slots();
  const z0 = HALL_FRONT_Z + FAR_WALL_T;
  const zB = HATCH_Z - 0.6;         // bulkhead's tunnel face
  const zE = HATCH_Z + 0.2;         // bulkhead's space face
  const P = tunnelProfile(0);
  S.add('wallDark', shellZ(P, z0, zB));
  for (let z = z0 + 1.5; z < zB - 1.0; z += 3.0) {
    S.add('steel', prismZ(profileRing(-0.2, 0), z - 0.15, z + 0.15));
  }
  // floor: plates either side of the slot, out to the wall feet
  const footX = TUNNEL_HALF_W - TUNNEL_FOOT_CHAMFER;
  [-1, 1].forEach((s) => {
    S.add('steelDark', bx(Math.min(s * SLOT_HALF, s * footX), Math.max(s * SLOT_HALF, s * footX),
      DECK_TOP - 0.1, DECK_TOP, z0, zE));
  });
  S.add('vent', bx(-SLOT_HALF, SLOT_HALF, SLOT_FLOOR - 0.03, SLOT_FLOOR, z0, zE));
  [-1, 1].forEach((s) => {
    const x = s * (SLOT_HALF - 0.01);
    S.add('vent', bx(x - 0.01, x + 0.01, SLOT_FLOOR, 0, z0, zE));
  });
  // the hatch bulkhead: a thick plate with the profile cut through it,
  // extended below the deck so its reveal never meets the floor plates
  const hole = [[footX, -0.25], ...P, [-footX, -0.25]];
  S.add('steelDark', prismZ([[-4.6, -0.5], [4.6, -0.5], [4.6, 6.2], [-4.6, 6.2]], zB, zE, [hole]));
  S.add('hazard', prismZ(profileRing(-0.22, 0), zB - 0.3, zB));
  _tunnel = S.build();
  return _tunnel;
}

/** One launch-indicator lamp in the catapult wall (instanced). */
export const LAUNCH_LAMP_GEO = new THREE.BoxGeometry(0.1, 0.05, 0.22);

/** Jet-blast deflector, hinged up behind the shuttle at launch. Folded
 *  down it lies on the lane's plated-over slot head. */
export const BLAST_DEFLECTOR_GEO = (() => {
  const g = new THREE.BoxGeometry(1.5, 0.9, 0.08);
  g.translate(0, 0.45, 0);
  return g;
})();

// ---- section bulkhead -----------------------------------------------
// Bays (and their hall segments) only mount within a window of the focused
// one, so the hall has an open edge wherever the window stops short of the
// real end of the row. A bulkhead closes that edge: from the bay mouth to
// the far wall, deck to above the ceiling, with a hazard band at door
// height. HangarCorridor places it just outside the edge segment.
export const BULKHEAD_GEO = (() => {
  const depth = HALL_FRONT_Z + 0.3 - BAY_DEPTH / 2;
  const g = new THREE.BoxGeometry(0.2, HALL_HEIGHT + 0.4, depth);
  g.translate(0, (HALL_HEIGHT + 0.4) / 2 - 0.2, BAY_DEPTH / 2 + depth / 2);
  return g;
})();
export const BULKHEAD_BAND_GEO = (() => {
  const depth = HALL_FRONT_Z - BAY_DEPTH / 2 - 0.4;
  const g = new THREE.BoxGeometry(0.24, 0.35, depth);
  g.translate(0, 2.6, BAY_DEPTH / 2 + 0.2 + depth / 2);
  return g;
})();

