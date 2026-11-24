// ============================================================
// REFERENCE VIEWS — the photographs the ?debug=overlay route draws behind a
// model, at exactly the scale the blueprint traced them at.
//
// DEV ONLY, and NO BUNDLER IMPORT. An `import.meta.glob` here — even guarded
// by `import.meta.env.DEV` — still emits every matched file as a build
// asset: the first version of this file shipped 15 reference photographs
// into `dist/assets`, breaking hard rule 4 (the site is self-contained).
// A plain root-relative URL costs the bundler nothing: the dev server serves
// `references/` off the project root, and main.jsx only loads the overlay
// route in dev.
//
// After changing this file, the check is that `npm run build` emits no image:
//   find dist -type f ! -name '*.js' ! -name '*.css' ! -name '*.html'
// must list only CNAME and favicon.png. (Grepping the bundle for
// "references/" is NOT the check — this URL template is in it as dead code.)
//
// CALIBRATION: every shot that a blueprint traced from is DERIVED from that
// blueprint's elevation, never retyped — a crown row that differs by five
// between the two makes every plate look misplaced by five rows.
// ============================================================
import { FRONT, BUST, H as SF_H, HEAD as SF_HEAD } from './units/strikeFreedom/blueprint';

const shot = (folder, name, cal) => ({
  url: `/references/${encodeURIComponent(folder)}/${encodeURIComponent(name)}`,
  ...cal,
});

/**
 * Camera framings, in fractions of the unit's standing height.
 *   y0      bottom of the visible band (negative shows deck below the sole)
 *   span    visible height
 *   pos     camera direction
 */
export const VIEWS = {
  front: { y0: -0.06, span: 1.14, pos: [0, 0, 10] },
  quarter: { y0: -0.06, span: 1.14, pos: [7.4, 0, 7.4] },
  // The head view frames the head alone. `headTop`/`headBot` are where the
  // head's crown and chin sit as fractions of standing height, so the bust
  // photograph is scaled against them the same way — and they must match the
  // unit's own stations: ST.crown / H and ST.head / H. Strike Freedom's chin
  // is at 1.1504 / 1.33 = 0.865.
  head: { y0: 0.835, span: 0.245, pos: [0, 0, 10], headTop: 1.0, headBot: 0.865 },
};

/**
 * Full-height framing from an elevation whose crown row is NOT the suit's
 * crown. Strike Freedom's FRONT is calibrated chin → sole (the head is the
 * one corrected proportion, traced off the bust instead), so the suit's
 * crown sits HEAD model units above the traced chin row.
 */
function fullHeight(el, H, aboveCrown = 0) {
  const { crown, sole, midline } = el.cal; // raw image pixels, as traced
  const pxPerUnit = (sole - crown) / (H - aboveCrown);
  return {
    w: el.w, h: el.h,
    crownV: (crown - aboveCrown * pxPerUnit) / el.h,
    soleV: sole / el.h,
    midU: midline / el.w,
  };
}

export const REFERENCES = {
  strikeFreedom: {
    gundamId: 0,
    /** Standing height in model units — the unit's blueprint H. */
    H: SF_H,
    front: shot('strike freedom', FRONT.image, fullHeight(FRONT, SF_H, SF_HEAD)),
    // The head bust: THE calibration for every head landmark (blueprint BUST).
    head: shot('strike freedom', BUST.image, {
      ...fullHeight(BUST, SF_HEAD),
      /** This shot frames the HEAD, so its crown/sole are the head's. */
      band: 'head',
    }),
    // Not traced from — a framing aid only, eyeballed, for the 3/4 view.
    quarter: shot('strike freedom', 's-l1200.jpg', {
      w: 1120, h: 1200, crownV: 40 / 1200, soleV: 1160 / 1200, midU: 500 / 1120,
    }),
  },
};
