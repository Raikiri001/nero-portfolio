import { extrude, skin, fromTris } from './poly';
import { ccw, boundsXY, matchCount, chamfer } from './outline';
import { requireTraced, hardware, brand, provenance } from './trace';

// ============================================================
// FACET — the shapes that only exist in a straight-edge language
//
// Everything here is a replacement for something round that a modelling kit
// normally reaches for, and each one names what it replaces:
//
//   knifeEdge  ← a rounded tip. Collapses to an EDGE, not a point: a point
//               is a cone, and a cone is a curve in disguise.
//   spar       ← a swept antenna. A dart blade SOLVED FROM ITS TRACED TIP,
//               because a length and an angle authored independently both
//               look plausible and the tip lands nowhere near the picture.
//   splitShell ← a boolean cut. Slices the outline in 2D before extruding,
//               so a sliced pauldron is not hollow underneath.
//   pyramidCap ← a dome.
//   stepped    ← a bevel/round. A real staircase of traced planes.
// ============================================================

/**
 * A solid that collapses to a straight EDGE at `y = h` rather than to a point.
 * The chin of a helmet, the tip of a front skirt, the leading edge of a fin.
 *
 * `edge` is the half-length of the terminating edge, along x.
 */
export function knifeEdge(outline, h, edge, depth) {
  requireTraced(outline, 'knifeEdge()');
  const src = ccw(outline);
  const b = boundsXY(src);
  const tip = brand([
    [-edge, b.cy - depth * 0.02], [edge, b.cy - depth * 0.02],
    [edge, b.cy + depth * 0.02], [-edge, b.cy + depth * 0.02],
  ], provenance(outline));
  const n = Math.max(src.length, 4);
  const lo = matchCount(src, n), hi = matchCount(ccw(tip), n);
  const rings = [
    lo.map(([x, z]) => [x, 0, z]),
    hi.map(([x, z]) => [x, h, z]),
  ];
  return skin(rings, {
    capStart2d: lo, capEnd2d: hi,
    capTo: (i) => ([x, z]) => [x, i === 0 ? 0 : h, z],
  });
}

/**
 * A DART BLADE, solved from its traced tip.
 *
 * `root` and `tip` are model-space [x, y] read off the photograph. The blade
 * runs root → tip, is `rootHalf` wide across at the root, and terminates in a
 * straight edge `tipFrac × rootHalf` wide.
 *
 * tipFrac IS A FRACTION of the root half-width, never an absolute length.
 * Passed as an absolute it adds itself to the tip's reach and the fin spans
 * twice what you traced.
 */
export function spar(root, tip, rootHalf, thick, opts = {}) {
  const { tipFrac = 0.08, backFrac = 0.25 } = opts;
  const dx = tip[0] - root[0], dy = tip[1] - root[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;          // along the blade
  const px = -uy, py = ux;                     // across it
  const at = (t, half) => {
    const cx = root[0] + ux * len * t, cy = root[1] + uy * len * t;
    return [[cx - px * half, cy - py * half], [cx + px * half, cy + py * half]];
  };
  const [a0, a1] = at(-backFrac * 0.0, rootHalf);
  const [b0, b1] = at(1, rootHalf * tipFrac);
  const outline = hardware(
    [a0, a1, b1, b0],
    'blade cross-section solved from a traced root and a traced tip (spar)',
  );
  return extrude(outline, thick, { taper: [1, 1] });
}

/**
 * Cuts a traced outline with a straight line before extruding, so a sliced
 * shell keeps a real cut FACE instead of becoming hollow.
 *
 * The line is `a → b`; `keep` is +1 for the left half, −1 for the right.
 */
export function splitShell(outline, a, b, keep, depth) {
  requireTraced(outline, 'splitShell()');
  const src = ccw(outline);
  const side = (p) => Math.sign((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) * keep;
  const out = [];
  for (let i = 0; i < src.length; i++) {
    const p = src[i], q = src[(i + 1) % src.length];
    const sp = side(p), sq = side(q);
    if (sp >= 0) out.push(p);
    if (sp * sq < 0) {
      const d1 = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
      const d2 = (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]);
      const t = d1 / (d1 - d2);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return extrude(brand(out, provenance(outline)), depth);
}

/**
 * A traced base rising to a flat top face, through straight planes. The
 * straight-edge replacement for a dome — and note the top is a FACE, so this
 * is a frustum of a pyramid, never a point.
 */
export function pyramidCap(outline, h, topScale, depth) {
  requireTraced(outline, 'pyramidCap()');
  return extrude(outline, depth, { taper: topScale, steps: [{ at: 0.5, scale: (1 + topScale) / 2 }] });
}

/** A real staircase of planes — the straight-edge replacement for a bevel. */
export function stepped(outline, depth, steps, shrink) {
  requireTraced(outline, 'stepped()');
  const keys = [];
  for (let i = 1; i < steps; i++) {
    keys.push({ at: i / steps, scale: 1 - shrink * (i / steps) });
  }
  return extrude(outline, depth, { taper: 1 - shrink, steps: keys });
}

/** A rectangular notch cut out of a traced outline, straight-edged. */
export function cutRect(outline, x0, y0, x1, y1) {
  requireTraced(outline, 'cutRect()');
  const src = ccw(outline);
  const inside = ([x, y]) => x > x0 && x < x1 && y > y0 && y < y1;
  return brand(src.filter((p) => !inside(p)), provenance(outline));
}

export { chamfer, fromTris };
