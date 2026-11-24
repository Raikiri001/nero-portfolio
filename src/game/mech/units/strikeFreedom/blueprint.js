import { elevation } from '../../kit';

// ============================================================
// ZGMF-X20A STRIKE FREEDOM — BLUEPRINT
//
// Every number below is a coordinate MEASURED OFF A REFERENCE PHOTOGRAPH with
// the gridded-crop probe, never a fraction someone liked the look of. The
// pixel coordinates are recorded beside each value so any of them can be
// pasted straight back into the tool that produced it:
//
//   sips -s format png "references/strike freedom/CT233012….webp" --out /tmp/b.png
//   node scripts/probe/crop.mjs /tmp/b.png 200 250 500 540 3 10 helmet.png
//   node scripts/probe/probe.mjs row /tmp/b.png 382 100 620
//
// THE UNIT OF MEASUREMENT IS THE CORNER POLYGON, not the bounding box. A part
// is an ordered list of the corner pixels of its outline, walked
// counter-clockwise as seen. Straight lines between those corners are free,
// because straight lines are what the photographs show — which is what makes
// "strictly angular" and "fully accurate" the same requirement rather than
// competing ones.
//
// BUILT ONE REGION AT A TIME. Landmarks appear here when the region that
// needs them is built, so nothing in this file is a number nobody has looked
// at. Currently measured: THE HEAD.
//
// ------------------------------------------------------------
// THE ELEVATIONS
// ------------------------------------------------------------
//
// BUST  references/strike freedom/CT233012….webp  (700×700)
//       A display bust, dead straight on, near life size — the head is 337 px
//       tall here against 78 px in the full front elevation, so EVERY head
//       landmark comes from this shot and nothing about the head is measured
//       anywhere else.
//         midline  x = 350   (tower 315/389 → 352; chin block 333/368 → 350.5;
//                             red band 319/382 → 350.5; ear pods 246/455 → 350.5)
//         crown    y = 113   (first white pixel of the sensor tower: row 114)
//         chin     y = 450   (bottom of the white jaw plate, where the red
//                             neck block starts: row 445 has no red, 455 does)
//
// FRONT references/strike freedom/382ccddd….jpeg  (1920×1080)
//       The only straight-on, symmetric full-body elevation in the folder.
//       Calibrated here for H alone; its own landmarks arrive with the torso.
//         midline x = 961, chin y = 287, sole y = 988
//
//       CAVEAT, stated so nobody re-derives it: it is a game model and it is
//       drawn HEROIC — 78 px head against a 779 px height, very nearly ten
//       heads tall, where Strike Freedom is eight. Cross-checked by the one
//       ratio a pose cannot distort, head height over shoulder span:
//         MG box art   60 px head / 176 px span = 0.341
//         this render  78 px head / 320 px span = 0.244
//       so the render's head is 40 % small and everything else about it is
//       internally consistent. The correction is applied in exactly ONE place
//       — HEAD below — and NOWHERE else. Do not compensate by nudging armour.
//
// SIDE  references/strike freedom/b40e6b36c95847e12d482e4df3ca0ee6.jpg (735×602)
//       Official head design sheet (settei): front, three-quarter, SIDE and
//       back line art. The side view (top right, head facing LEFT) is drawn
//       orthographic — no perspective — so its depths are measurable. Every
//       head DEPTH comes from here, calibrated with the SAME definitions as
//       BUST so the two describe one head:
//         crown   y = 130   (top of the forehead tower, under the fins)
//         chin    y = 279   (bottom of the jaw plate; the neck mount starts
//                            at row 280)
//         axis    x = 632   (centre of the neck mount, rows 282–294 span
//                            584–680) — model z = 0
//       Head height 149 px here against 337 on the bust; each elevation is
//       scaled to HEAD on its own, so they agree by construction.
//       Silhouette rows from `probe.mjs sil … 540 715 120 300 3`; corners off
//       `crop.mjs … 540 120 650 290 5 5`. The face is to the LEFT, so +Z
//       (forward) is DECREASING column.

/** Total standing height in model units, crown of the sensor tower to sole. */
export const H = 1.33;

/**
 * Head height. THE ONE CORRECTED NUMBER IN THIS FILE.
 *
 * 0.135 H, from the MG kit's head-to-shoulder-span ratio (see above), not
 * from the front elevation's own 0.100 H. That lands the suit at 7.4 heads
 * against the MG box art's measured 7.6 — and a head at the render's own
 * fraction reads tiny under the V-fin.
 */
export const HEAD = 0.135 * H;

/** Chin → sole: the part of the suit the front elevation actually scales. */
const BODY = H - HEAD;

export const FRONT = elevation({
  image: '382ccddd575048a8ba31c4c8626cb0ae.jpeg',
  w: 1920, h: 1080,
  crown: 287,          // the chin: this calibration deliberately excludes the head
  sole: 988,
  midline: 961,
  height: BODY,
  note: 'heroic game render — trustworthy heights, correct in one place only',
});

export const BUST = elevation({
  image: 'CT233012.jpg.25779b37ef34c95bdf5a30702eda1606.webp',
  w: 700, h: 700,
  crown: 113,
  sole: 450,
  midline: 350,
  height: HEAD,
  note: 'straight-on display bust — every head landmark comes from here',
});

export const SIDE = elevation({
  image: 'b40e6b36c95847e12d482e4df3ca0ee6.jpg',
  w: 735, h: 602,
  crown: 130,
  sole: 279,          // the chin — this elevation frames the head alone
  origin: 632,        // the neck axis column: model z = 0
  height: HEAD,
  note: 'official head settei, side view — orthographic, every head depth comes from here',
});
/** Side-view column → model z (+Z forward; the face is to the LEFT). */
const sz = (px) => -SIDE.z(px);

/**
 * The same settei sheet's FRONT head view (top left). It carries the one
 * thing the bust cannot: the helmet DOME's width above the forehead, which
 * on the bust is hidden behind the sensor tower.
 *   midline x = 162.5 (tower 141/184 at rows 90–106)
 *   crown   y = 88    (top of the tower)   chin y = 284 (neck mount below)
 */
export const SETTEI_FRONT = elevation({
  image: 'b40e6b36c95847e12d482e4df3ca0ee6.jpg',
  w: 735, h: 602,
  crown: 88,
  sole: 284,
  midline: 162.5,
  height: HEAD,
  note: 'official head settei, front view — dome widths',
});

/**
 * THE HELMET DOME, as horizontal slices — the volume behind the forehead
 * tower that the front photograph can never show. Two views per slice, at
 * the SAME calibrated height:
 *   side   [row, front col, back col]  on SIDE (face to the left)
 *   front  [row, left col, right col]  on SETTEI_FRONT
 * Rows correspond by head-height fraction (side (279−r)/149 = front
 * (284−r)/196). Above eye level the dome is no wider than the tower in front,
 * because there it is hidden behind it; the slices say so rather than invent
 * a width.
 */
export const DOME = [
  { side: [133, 607, 617], front: [92, 144, 181] },   // the ridge, just under the crown
  { side: [144, 605, 655], front: [106, 141, 184] },  // top plane's back edge
  { side: [165, 598, 675], front: [134, 124, 202] },  // vented rear panel
  { side: [185, 597, 679], front: [160, 100, 226] },  // ear sensors' height
  { side: [200, 599, 698], front: [180, 87, 236] },   // meets the side blocks
].map(({ side, front }) => ({
  px: { side, front },
  y: SIDE.y(side[0]),
  zFront: sz(side[1]),
  zBack: sz(side[2]),
  xLeft: SETTEI_FRONT.x(front[1]),
  xRight: SETTEI_FRONT.x(front[2]),
}));

// ------------------------------------------------------------
// HY — head heights above the CHIN, traced rows of the bust.
// ------------------------------------------------------------
export const HY = BUST.heights({
  chin: 450,            // bottom of the white jaw plate
  flareTip: 517,        // bottom point of the helmet side panel — BELOW the chin
  ventBot: 435,
  chev2Bot: 421,        // lower mouth chevron
  chev2Top: 412,
  chev1Bot: 407,        // upper mouth chevron
  chev1Top: 397,
  redBot: 393,
  faceWidest: 393,
  noseBot: 385,
  redWidest: 382,
  eyeBot: 369,
  redTop: 365,
  eyeTop: 352,
  crestApex: 350,       // the red crest's bottom point, between the eyes
  ventTop: 348,
  browTop: 345,
  tempTabBot: 340,      // small gold trim tab on the temple
  tempTabTop: 328,
  earPod: 291,          // ear-pod centre (the fitting spans 283–300)
  crestShoulder: 270,   // the crest's widest row
  crestTop: 254,
  lensLoBot: 248,
  lensLoTop: 190,
  gold2Tip: 164,        // tip of the SECOND, inner gold fin
  lensHiBot: 155,
  lensHiTop: 121,
  whiteFinTip: 121,
  crown: 113,           // top of the white forehead sensor tower
  goldFinTip: 87,       // the gold fins reach ABOVE the crown
});

// ------------------------------------------------------------
// HX — head half-widths from the midline (350), in bust columns.
// ------------------------------------------------------------
export const HX = BUST.widths({
  towerTop: 315,        // sensor tower, row 118: 316–385
  tower: 309,           // sensor tower, row 160: 309–391
  lensHi: 317,          // upper blue lens, row 130: 317–383
  lensLo: 328,          // lower blue lens, row 194: 330–370
  crestTop: 313,        // crest top edge, row 255: 313–388
  crestWide: 310,       // crest widest, row 270: 312–391
  helmetWide: 212,      // helmet outer edge at its widest, row 380
  helmetTemple: 250,    // helmet edge at row 283
  faceModule: 297,      // white face module, row 393: 297–413
  faceSlot: 288,        // the dark separator slot outboard of the face module
  faceSlotIn: 297,
  eyeOuter: 287,        // eye lens, rows 352–369: 287–326
  eyeInner: 326,
  nose: 341,            // the gold ridge splitting the twin eyes: 341–360
  redOuter: 277,        // red mask band, row 382: 284–423 at its widest
  redWide: 284,
  chinPlate: 303,       // white chin plate, row 420: 303–403
  neckBlock: 331,       // red neck block, rows 450–530: 331–369
  chevron: 333,         // mouth chevron arm ends: 333 / 367
  vent: 218,            // cheek duct grille: 218–256
  ventIn: 256,
  earPod: 246,          // ear-pod fitting centre (spans 240–253)
  tempTab: 262,         // gold temple tab: 262–272
  tempTabIn: 272,
});

/**
 * V-FIN GEOMETRY, solved from traced tips.
 *
 * THE PHOTOGRAPHS CORRECT AN OLDER READING HERE. A previous build asserted
 * both fin pairs were gold and dismissed the white blades as backpack plates.
 * They are not: on the bust they root at the TEMPLES and sweep out past the
 * frame, and they are the longest thing on the head by a factor of three.
 *
 *   OUTER pair  WHITE, long and shallow — root (302, 268), tip (60, 121),
 *               a 242 px reach rising at 31°
 *   INNER pair  GOLD, short and steep — root (289, 260), tip (256, 88),
 *               11° from VERTICAL, reaching 26 px above the crown
 *   THIRD pair  GOLD under-plate, shorter still — root (306, 275),
 *               tip (282, 164)
 *
 * Never author a length and an angle independently: both numbers look
 * plausible and the tip lands nowhere near the picture.
 */
const P = (px, py) => [BUST.x(px), BUST.y(py)];

const fin = (rootPx, tipPx, halfPx, thickPx) => ({
  px: [rootPx, tipPx],                 // kept so the blade stays re-checkable
  root: P(...rootPx), tip: P(...tipPx),
  rootHalf: BUST.d(halfPx), thick: BUST.d(thickPx),
});

export const FIN = {
  white: fin([302, 268], [60, 121], 11, 7),
  gold: fin([289, 262], [256, 88], 16, 9),
  goldInner: fin([306, 275], [282, 164], 10, 7),
};

// ------------------------------------------------------------
// HZ — head depths, +Z forward, z = 0 on the neck axis.
//
// MEASURED off the SIDE elevation (settei side view). Each value is the
// column of that plane, with its row, so it can be pasted back into the
// crop. These replaced a stated depth scheme (fractions of head height)
// that had the face 0.1 H too far back and the side panels as thin plates;
// the side view shows a projecting brow and DEEP side blocks.
// ------------------------------------------------------------
export const HZ = {
  // the back-most point of the head is the side block, not the dome
  shellBack: sz(690),     // dome back, rows 150–200
  shellFront: sz(599),    // helmet shell's front edge behind the eye, row 195
  // The side panels are deep blocks, front edge just ahead of the axis to
  // the very back of the head (the slotted block in the side view).
  panelBack: sz(700),     // rows 213–225, the head's back-most column
  panelFront: sz(623),    // front edge of the slotted side block, row 205
  ventFront: sz(604),     // cheek grille fins' front ends, rows 230–250
  faceFront: sz(568),     // the face module's front plates, rows 225–250
                          // — every face detail is placed from this plane
  chinFront: sz(565),     // the chin's knife edge, row 270
  towerFront: sz(558),    // front of the forehead tower, row 160
  crestFront: sz(550),    // tip of the brow crest, row 207 — the FRONT-MOST
                          // point of the head
  finRoot: sz(565),       // where the fin blades meet the brow, rows 200–210
};

/** Fraction of H → model units, for a one-off measurement. */
export const h = (frac) => frac * H;
