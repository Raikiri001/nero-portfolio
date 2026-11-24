import { ngon, rect, chamfer, extrudeAlong, drum, pivotBlock, hardware, mergeGeometries } from '../kit';

// ============================================================
// THE INNER FRAME
//
// Modelled on how a Real Grade kit is engineered: every suit is built on the
// same KIND of skeleton — the same joints in the same places doing the same
// job — but each unit's frame is a different SIZE. Nothing about a unit's
// identity lives here; identity is armour, and armour is hand-authored per
// unit in `units/<unit>/`.
//
// Reference: `references/rg_frame/71I8QA4-vzL.jpg`, used for LAYOUT ONLY —
// where the joints sit, how much frame shows between plates, how the shin
// runs from a wide knee block down to a narrow ankle. NOT for cross-section:
// the photograph shows round drums and ball hips, and brief §1 overrides them
// ("rather than utilizing smooth tubular structures … jagged, diagonal
// structural struts, multifaceted pivot blocks, and sharply angled industrial
// beams"). Every joint here is an n-gon prism at 6 or 8 facets.
//
// BUILT ONE REGION AT A TIME, like the armour. This file currently carries
// `stations()` and the NECK, because the head is the only region built. The
// shoulder, elbow, hip, knee and ankle hardware gets traced off the frame
// photograph when the region that shows it is built — not speculatively, so
// nothing here is ever geometry nobody has looked at.
// ============================================================

/**
 * Default frame dimensions — a mid-build suit. Unit files spread over this
 * and override only what differs, so adding a field here is safe.
 */
export const BASE_DIMS = {
  ankleH: 0.085,      // ground → ankle pivot
  shinL: 0.300,       // ankle → knee
  thighL: 0.310,      // knee → hip
  pelvisH: 0.100,     // hip → waist joint
  waistH: 0.056,      // waist joint → chest base
  chestH: 0.300,      // chest base → collar top
  neckH: 0.030,       // collar top → head base (the CHIN)
  headH: 0.155,       // head base → crown

  hipX: 0.088,        // thigh centres from the midline
  shoulderX: 0.174,   // shoulder joint centres from the midline
  upperArmL: 0.225,
  forearmL: 0.215,
  shoulderDrop: 0.090,

  neckR: 0.024,
};

/**
 * Derives the joint stations for a dimension record. ARMOUR IS NEVER
 * POSITIONED WITH A HARDCODED HEIGHT — always against one of these or
 * against a traced landmark, so a unit that is taller or longer-legged moves
 * its own armour with it.
 */
export function stations(d) {
  const hip = d.ankleH + d.shinL + d.thighL;
  const waist = hip + d.pelvisH;
  const chest = waist + d.waistH;
  const collar = chest + d.chestH;
  return {
    ground: 0,
    ankle: d.ankleH,
    knee: d.ankleH + d.shinL,
    hip,
    waist,
    chest,
    collar,
    head: collar + d.neckH,          // the chin
    crown: collar + d.neckH + d.headH,
    shoulderY: d.chestH - (d.shoulderDrop ?? 0.090),
    shoulderX: d.shoulderX,
    hipX: d.hipX,
    total: collar + d.neckH + d.headH,
  };
}

// ---- frame hardware -------------------------------------------
//
// Built lazily and cached per size: two units with the same joint radius
// share one geometry rather than each allocating its own. Nothing here is
// ever disposed — the mech root is `dispose={null}`, and destroying a shared
// BufferGeometry when one instance unmounts breaks every other user of it.

const _cache = new Map();
const lz = (key, make) => {
  let g = _cache.get(key);
  if (!g) { g = make(); _cache.set(key, g); }
  return g;
};

/**
 * The neck: a hex column between two square collars, on the frame
 * photograph's layout — the post is short and most of it is swallowed by the
 * collar armour, so what shows is one band of frame under the jaw.
 */
export const neckPost = (r, h) => lz(`neck:${r}:${h}`, () => {
  const post = extrudeAlong('x', hardware(ngon(6, r), 'hex neck column (machined stock, brief §1)'), h);
  const collar = (y, s) => {
    const c = extrudeAlong('x', hardware(
      chamfer(rect(r * 2.3 * s, r * 2.3 * s), r * 0.5), 'chamfered neck collar plate',
    ), h * 0.16);
    c.translate(0, y, 0);
    return c;
  };
  return mergeGeometries([post, collar(h * 0.42, 1), collar(-h * 0.42, 1.14)]);
});

export { drum, pivotBlock };
