import { extrude } from './poly';
import { requireTraced } from './trace';
import { mergeGeometries } from './merge';

// ============================================================
// LAMINATE — armour as stacked plates, not as one solid
//
// Brief §1 for every suit in this project: "no two adjacent plates share the
// same spatial plane". That is not a finish note, it is the construction.
//
// A one-piece extrusion with a chamfered lip reads as a SLAB no matter how
// accurately its outline was traced, because a real mobile suit panel is
// several separate plates bolted over each other with air between them, and
// the shadow in each of those gaps is most of what the eye uses to read the
// surface as machined rather than moulded.
//
//   laminate(layers)   discrete traced plates at their own depths, with a
//                      REAL gap between them — no shared face, ever
//   seam(outline, …)   a cut groove: two walls and a floor, no CSG
//
// Every layer needs its own traced outline. If two consecutive layers want
// the same outline, they are one plate and should be extruded as one.
// ============================================================

/**
 * layers: [{ outline, depth, z, taper?, shift?, steps? }]
 *   outline  a TRACED polygon in XY — its own, not a scaled sibling
 *   depth    this plate's thickness (ONE depth, arity rule)
 *   z        the plate's own centre depth
 *
 * `gap` is asserted, not applied: laminating is a statement that the plates
 * really are separate, so two layers that overlap in z are a measurement
 * error and say so rather than silently fusing into a slab.
 */
export function laminate(layers, opts = {}) {
  const { gap = 0 } = opts;
  const sorted = [...layers].sort((a, b) => a.z - b.z);
  for (let i = 1; i < sorted.length; i++) {
    const back = sorted[i - 1], front = sorted[i];
    const clear = (front.z - front.depth / 2) - (back.z + back.depth / 2);
    if (clear < gap - 1e-9) {
      throw new Error(
        `laminate(): layers ${i - 1} and ${i} are ${clear.toFixed(5)} apart, ` +
        `less than the required gap ${gap}. Two plates sharing a plane is a slab.`,
      );
    }
  }
  return mergeGeometries(layers.map((l, i) => {
    requireTraced(l.outline, `laminate() layer ${i}`);
    const g = extrude(l.outline, l.depth, {
      taper: l.taper, back: l.back, shift: l.shift, backShift: l.backShift, steps: l.steps,
    });
    g.translate(0, 0, l.z);
    return g;
  }));
}

/**
 * A cut groove — the panel line between two plates, as geometry.
 *
 * Walls straight down to a floor and back up, so it catches a real shadow.
 * A groove painted into the albedo map does not, and at hangar distance the
 * difference between a machined panel and a decal is exactly this.
 */
export function seam(outline, width, depth) {
  requireTraced(outline, 'seam()');
  return extrude(outline, depth, { taper: [1 - width, 1] });
}
