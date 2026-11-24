// ============================================================
// OUTLINE — straight-edge 2D arithmetic
//
// Every function here takes a polygon of [x, y] corners and returns another
// polygon of corners. There is no curve, no fillet, no arc and no resample
// anywhere in this file, and there must never be one: a rounded corner is
// the single thing that makes every hard edge beside it read as a modelling
// accident (CLAUDE.md hard rule 1).
//
// A corner is softened in exactly ONE way — `chamfer`, a flat cut that adds
// a real extra face with two vertices and a straight edge between them.
// ============================================================

/** Signed area ×2. Positive when the polygon is wound counter-clockwise. */
export const area2 = (p) => {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const q = p[(i + 1) % p.length];
    a += p[i][0] * q[1] - q[0] * p[i][1];
  }
  return a;
};

/**
 * Counter-clockwise winding, preserved as the canonical direction.
 *
 * An outline traced clockwise by accident renders with its back faces to the
 * camera and simply disappears under backface culling — which looks exactly
 * like a part buried inside its parent, and sends you tuning a position that
 * was never wrong.
 */
export const ccw = (p) => (area2(p) < 0 ? [...p].reverse() : p.slice());

export function boundsXY(p) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of p) {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

// ---- transforms -----------------------------------------------

export const moveXY = (p, dx, dy) => p.map(([x, y]) => [x + dx, y + dy]);
export const scaleXY = (p, sx, sy = sx) => p.map(([x, y]) => [x * sx, y * sy]);
export const mirrorX = (p) => [...p].reverse().map(([x, y]) => [-x, y]);
export const mirrorY = (p) => [...p].reverse().map(([x, y]) => [x, -y]);
export const rotXY = (p, a) => {
  const c = Math.cos(a), s = Math.sin(a);
  return p.map(([x, y]) => [x * c - y * s, x * s + y * c]);
};

// ---- constructors ---------------------------------------------

export const rect = (w, h) => [
  [-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2],
];

/** A trapezoid: `wBot` at -h/2, `wTop` at +h/2. */
export const trapezoid = (wBot, wTop, h) => [
  [-wBot / 2, -h / 2], [wBot / 2, -h / 2], [wTop / 2, h / 2], [-wTop / 2, h / 2],
];

/**
 * A regular n-gon. THE ONLY WAY A ROUND THING IS EVER APPROXIMATED, and the
 * facet count is a design decision, not a quality slider — six or eight
 * facets read as a machined prism, sixteen read as tubing.
 */
export const ngon = (n, r, phase = 0) => {
  if (n > 12) throw new Error(`ngon(${n}): over 12 facets reads as a cylinder — hard rule 1`);
  const p = [];
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * Math.PI * 2;
    p.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return p;
};

// ---- the one softening operation ------------------------------

/**
 * chamfer(outline, cut) — a FLAT corner cut.
 *
 * Replaces each corner with two vertices `cut` back along its two edges, so
 * the result has a real extra face. The cut is CLAMPED to half the shorter
 * adjacent edge: unclamped it walks past the far end of a short edge and
 * inverts the polygon, and the plate then reads as the wrong shape while the
 * outline gets blamed.
 *
 * `cut` may be a number, or a function (i, corner) => number to cut selected
 * corners only — a chin knife-edge wants its two lower corners cut and
 * nothing else.
 */
export function chamfer(p, cut) {
  const n = p.length;
  const at = typeof cut === 'function' ? cut : () => cut;
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = p[(i - 1 + n) % n], b = p[i], c = p[(i + 1) % n];
    const k = at(i, b);
    if (!k) { out.push(b); continue; }
    const la = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const lc = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const t = Math.min(k, la / 2, lc / 2);
    if (t <= 1e-9) { out.push(b); continue; }
    out.push(
      [b[0] + (a[0] - b[0]) * (t / la), b[1] + (a[1] - b[1]) * (t / la)],
      [b[0] + (c[0] - b[0]) * (t / lc), b[1] + (c[1] - b[1]) * (t / lc)],
    );
  }
  return out;
}

/**
 * A real inset: every edge moved inward by `d` along its own normal, and the
 * new corners solved as the intersection of the moved edges.
 *
 * NOT a scaled copy. A scale pulls a long thin plate in far more at its ends
 * than along its edge, so a chamfered lip authored by scaling changes the
 * plate's SHAPE rather than its size.
 */
export function insetXY(p, d) {
  const q = ccw(p);
  const n = q.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = q[(i - 1 + n) % n], b = q[i], c = q[(i + 1) % n];
    const e1 = norm([b[0] - a[0], b[1] - a[1]]);
    const e2 = norm([c[0] - b[0], c[1] - b[1]]);
    // inward normal of a CCW polygon is the edge rotated +90°
    const n1 = [-e1[1], e1[0]], n2 = [-e2[1], e2[0]];
    const bis = norm([n1[0] + n2[0], n1[1] + n2[1]]);
    const cosHalf = bis[0] * n1[0] + bis[1] * n1[1];
    const k = d / Math.max(cosHalf, 0.25);   // clamp: a near-spike corner
    out.push([b[0] + bis[0] * k, b[1] + bis[1] * k]);
  }
  return out;
}

const norm = (v) => {
  const l = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / l, v[1] / l];
};

/**
 * Raises a polygon to `n` corners by SPLITTING ITS LONGEST EDGES.
 *
 * Never by resampling along arc length: a traced corner must keep the exact
 * coordinate it was measured at, and an inserted point lands mid-run where it
 * changes nothing. This is what lets two sections with different corner
 * counts be skinned together.
 */
export function matchCount(p, n) {
  const out = p.map((q) => [q[0], q[1]]);
  while (out.length < n) {
    let best = 0, bestLen = -1;
    for (let i = 0; i < out.length; i++) {
      const j = (i + 1) % out.length;
      const l = Math.hypot(out[j][0] - out[i][0], out[j][1] - out[i][1]);
      if (l > bestLen) { bestLen = l; best = i; }
    }
    const j = (best + 1) % out.length;
    out.splice(best + 1, 0, [
      (out[best][0] + out[j][0]) / 2,
      (out[best][1] + out[j][1]) / 2,
    ]);
  }
  return out;
}
