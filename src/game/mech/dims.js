import { getUnit } from './units';
import { stations, BASE_DIMS } from './frame/frame';

// ============================================================
// Cross-cutting measurements the scene needs about a unit.
//
// A hand-built unit carries a `dims` record and `stations()` turns it into
// world-space heights: a suit's size IS its blueprint, never a proportion
// multiplier. A unit nobody has started renders nothing at all, but the
// hangar still has to place its bay's docking clamps and callout clamp — so
// an unbuilt id falls back to BASE_DIMS here. That is a measurement of the
// EMPTY BAY, not of a suit, and no geometry is ever built from it.
// ============================================================

/**
 * Height of a unit's shoulder in its own model units. The hangar places the
 * docking clamps from it, and combat aims from it, since suits are not all
 * the same height.
 */
export function shoulderHeight(gundamId) {
  const st = stations(getUnit(gundamId)?.dims ?? BASE_DIMS);
  return st.chest + st.shoulderY;
}
