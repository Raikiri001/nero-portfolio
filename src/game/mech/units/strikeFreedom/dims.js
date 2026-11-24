import { BASE_DIMS, stations } from '../../frame/frame';
import { H, HEAD } from './blueprint';

// ============================================================
// ZGMF-X20A STRIKE FREEDOM — FRAME DIMENSIONS
//
// Every field is a DIFFERENCE OF TWO LANDMARKS, so re-measuring a landmark
// moves every plate hung off it. Change this suit's proportions here, never
// by nudging armour.
//
// BUILT ONE REGION AT A TIME. Only the head has been traced, so only the head
// field below is measured. The rest are BASE_DIMS defaults, scaled so the
// stack still totals H — an honest placeholder, not a measurement, and each
// one is replaced by a landmark difference when its region is built. They
// exist because the head has to stand at its real height: the hangar places a
// bay from `shoulderHeight()`, and a head floating at the wrong altitude
// would have to be re-placed later for no reason.
// ============================================================

/** MEASURED, off the bust: chin (row 450) → crown of the sensor tower (113). */
const headH = HEAD;

/** NOT YET TRACED. Arrives with the collar region. */
const neckH = BASE_DIMS.neckH;

// Distribute the untraced remainder over the untraced segments, so the stack
// lands exactly on H whatever the placeholders are.
const REST = ['ankleH', 'shinL', 'thighL', 'pelvisH', 'waistH', 'chestH'];
const restSum = REST.reduce((a, f) => a + BASE_DIMS[f], 0);
const k = (H - headH - neckH) / restSum;

export const dims = {
  ...BASE_DIMS,
  ...Object.fromEntries(REST.map((f) => [f, BASE_DIMS[f] * k])),
  neckH,
  headH,
};

export const ST = stations(dims);

/** The stack must add up to the standing height it was traced for. */
if (Math.abs(ST.total - H) > 1e-6) {
  throw new Error(`strikeFreedom dims: stack totals ${ST.total}, expected H = ${H}`);
}

/** Which regions of this suit are hand-built. Everything else is ABSENT. */
export const BUILT = ['head'];
