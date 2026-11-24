import { assemble, mirrorX, derive, extrude, hardware, ngon } from '../../../kit';
import { BUST, SIDE, HZ, FIN, HEAD, DOME } from '../blueprint';
import * as SF from '../sfShapes';

// ============================================================
// ZGMF-X20A STRIKE FREEDOM — §2 THE HEAD UNIT
//
// Every outline in this file is a TRACED CORNER POLYGON: the ordered corner
// pixels of the part on the head bust, walked counter-clockwise as seen,
// converted by `B()`. The pixels stay in the source so any of them can be
// pasted straight back into the probe:
//
//   node scripts/probe/crop.mjs /tmp/b.png 200 250 500 540 3 10 helmet.png
//
// Nothing here is a bare constant and nothing is generated from a bounding
// half-width. `extrude()` and friends REFUSE an untraced outline, so the
// parametric-cross-section failure that sank the previous build cannot be
// written at all.
//
// Section numbers refer to references/strike freedom/design_specifications.txt.
// Where the photographs disagree with the brief, the photographs win and the
// disagreement is noted at the place it is resolved.
//
// WHAT THIS HEAD HAS TO GET RIGHT, from the failures on record:
//
//  · The head is 0.135 H AND A FIFTH OF THAT IS THE SENSOR TOWER — the white
//    block with the blue lenses standing between the gold fins. Leave it off
//    and the head loses its top fifth and reads tiny under the fins.
//  · THE V-FIN IS TWO PAIRS AND THEY ARE DIFFERENT SHAPES AND DIFFERENT
//    COLOURS. Long shallow WHITE blades from the temples, short steep GOLD
//    blades from the crest, plus a third shorter gold under-plate pair. An
//    older build called all of them gold; the bust is unambiguous.
//  · THE FACE IS A STACK AND ITS Z ORDER IS LOAD-BEARING. Back to front:
//    mask body, mask face, eye surrounds, eye lenses, nose ridge. Put the
//    centre mask in front of the eyes and it swallows them — the face renders
//    blank and the lenses are simply gone.
//  · Each eye gets its OWN thin surround, placed BEHIND it. One dark slot
//    spanning both eyes reads as a visor bar across the face.
//  · Dark detail on the face must read as a SEAM, not a filled panel. A solid
//    dark block under the nose sits exactly where a moustache would.
//  · Vents are GEOMETRY, never painted.
// ============================================================

/** A traced corner polygon on the bust → a model-space outline in XY. */
const B = (px) => BUST.corners(px);
/** A measured pixel distance → model units. */
const d = (px) => BUST.d(px);

// ---------------------------------------------------------------
// THE TRACED OUTLINES
//
// Read off references/strike freedom/CT233012….webp with the gridded crop.
// Coordinates are RAW IMAGE PIXELS, midline 350, crown 113, chin 450.
// ---------------------------------------------------------------

const PX = {
  /**
   * §2 The big white SIDE PANEL, image-left. Carries the cheek duct and runs
   * down to a point at row 517 — BELOW the chin, which is why the head reads
   * as long-jawed from the front. Outer edge from the silhouette crop (rows
   * 283/336/420/483 at columns 250/216/217/258); inner edge is the dark
   * separator slot at columns 285–290.
   *
   * THREE FACETS ON THE OUTER EDGE, not seven. The first trace of this plate
   * used a corner every 20 rows down the outside, and seven corners spaced
   * that finely IS an arc — it renders as an almond and the whole head reads
   * as moulded. A traced corner belongs where the reference shows the outline
   * CHANGE DIRECTION and nowhere else.
   */
  sidePanel: [
    [290, 517], [288, 400], [286, 345], [283, 300], [250, 283],
    [216, 336], [217, 420], [258, 483],
  ],

  /** §2 The skull core the tower, crest and face all hang on. */
  skullCore: [
    [300, 455], [400, 455], [412, 400], [416, 345], [408, 292], [388, 258],
    [313, 258], [293, 292], [285, 345], [289, 400],
  ],

  /** §2 The mid-face module: the narrow centre mask carrying the eyes. */
  faceModule: [
    [294, 400], [406, 400], [413, 375], [410, 352], [386, 332], [350, 352],
    [314, 332], [290, 352], [287, 375],
  ],

  /**
   * §2 The white chin plate below the mouth vents, tapering to the jaw. The
   * brief's "knife-edge point along the lower chin" is built as an EDGE, not
   * a point: a point is a cone, and a cone is a curve in disguise.
   */
  chinPlate: [
    [331, 450], [369, 450], [397, 425], [403, 395], [297, 395], [303, 425],
  ],

  /**
   * §2 The red mask band under the eyes.
   *
   * ITS OUTER WINGS RISE, and that is the whole shape. Rows 354–362 are red
   * at columns 272–286 and 421–428 — OUTBOARD of the eyes, level with their
   * tops — while the centre of the band is 16 rows lower, under the nose. A
   * band traced with a flat top and a flat bottom renders as a slab of red
   * sitting exactly where a moustache would; this is the failure the first
   * pass of this rebuild produced, and the fix was the trace, not the depth.
   *
   * Its bottom edge also rises at the centre (row 392 is white from 316 to
   * 384), which is what keeps the lower lip of it off the chin.
   */
  redBand: [
    [284, 393], [313, 393], [350, 378], [387, 393], [416, 393],
    [428, 364], [421, 354], [404, 370], [350, 366], [296, 370],
    [279, 354], [272, 364],
  ],

  /**
   * §2 Eye lens, image-left. Rows 352–369, columns 287–326 — measured with
   * the hue probe, not off a crop, because the lens is the one part small
   * enough that a 20 % eyeball error moves it onto the cheek.
   */
  eye: [[287, 371], [322, 367], [326, 356], [290, 351]],

  /** §2 The gold ridge splitting the twin eyes, standing PROUD of the lenses. */
  nose: [[344, 385], [357, 385], [360, 352], [350, 340], [341, 352]],

  /** §2 Crest: a red chevron on a gold base plate. Rows 254 → 350. */
  crestFace: [[350, 350], [389, 270], [388, 254], [313, 254], [311, 270]],
  // The gold frame is MUCH wider than the red it carries, and it is what
  // gives the brow its angular overhang: measured gold at row 270 runs
  // 283–311 outboard of the red, at row 300 306–325, at row 330 331–342,
  // converging on the crest apex. Traced as a rim only, it disappears.
  crestFrame: [[350, 362], [430, 252], [428, 242], [272, 242], [270, 252]],

  /**
   * §2 FOREHEAD SENSOR TOWER. Rows 113 → 258, columns 309–391, with the top
   * corners cut flat. A FIFTH of head height on its own.
   */
  tower: [[309, 258], [391, 258], [391, 140], [381, 114], [319, 114], [309, 140]],

  /** The two blue lens wells set into the tower's front face. */
  lensHi: [[317, 155], [383, 155], [376, 121], [324, 121]],
  lensLo: [[329, 248], [371, 248], [371, 192], [329, 192]],

  /** §2 The cheek duct well, cut into the side panel. Rows 348–435. */
  cheekWell: [[222, 433], [258, 433], [254, 350], [218, 350]],

  /** §2 Gold trim tab on the temple — the CIWS port cover. */
  templeTab: [[262, 340], [272, 340], [272, 328], [262, 328]],

  /**
   * §2 Mouth vent: two recessed chevron slots, rows 397–421. Traced as the
   * V-shaped BAND itself, so the slot is a seam with a real floor rather than
   * a filled dark panel.
   */
  chevron1: [[333, 407], [350, 397], [367, 407], [364, 412], [350, 403], [336, 412]],
  chevron2: [[335, 421], [350, 412], [365, 421], [362, 426], [350, 417], [338, 426]],

  /** §2 The red block under the jaw, running down into the neck. */
  neckBlock: [[334, 530], [366, 530], [369, 500], [369, 452], [331, 452], [331, 500]],
};

// ---------------------------------------------------------------
// DEPTHS
//
// Each plate's own thickness and its own centre depth, so `laminate()` can
// assert that no two of them share a plane (brief §1). The PLANES they sit
// on (HZ) are measured off the side elevation (blueprint.js SIDE); the plate
// thicknesses below are fractions of head height.
// ---------------------------------------------------------------

const T = {
  skull: HZ.shellFront - HZ.shellBack,
  panel: HZ.panelFront - HZ.panelBack,
  face: HEAD * 0.13,
  chin: HEAD * 0.15,
  red: HEAD * 0.030,
  eye: HEAD * 0.022,
  surround: HEAD * 0.016,
  nose: HEAD * 0.055,
  crestFace: HEAD * 0.045,
  crestFrame: HEAD * 0.030,
  tower: HEAD * 0.26,
  lens: HEAD * 0.030,
  well: HEAD * 0.045,
  vent: HEAD * 0.075,
  tab: HEAD * 0.022,
  chevron: HEAD * 0.022,
  neck: HEAD * 0.20,
};

const mid = (back, front) => (back + front) / 2;

// ---------------------------------------------------------------
// THE PART MANIFEST
//
// One entry per plate: what it is, which material slot it lands in, and the
// TRACED OUTLINE it was built from. The outline travels with the piece so
// `report()` can print part → photograph → pixels, and so `assemble()` can
// name the reference when a piece produces a NaN vertex — a single NaN
// poisons the whole merged slot, which reads as "the armour is in the wrong
// place" and sends you tuning positions that were never wrong.
// ---------------------------------------------------------------

function build(detail) {
  const hero = detail !== 'far';
  const p = [];
  const add = (name, slot, geo, outline, extra = {}) =>
    p.push({ name, slot, geo, outline, ...extra });

  // ---- §2 helmet shell -----------------------------------------
  // A LAMINATE, not a solid: the skull core deep, the side panels outboard
  // and set back, each its own plate with real air between them. Extruded as
  // one volume this reads as a slab however accurately it was traced.
  const skull = B(PX.skullCore);
  add('skullCore', 'white',
    SF.sfHelmetShell([{
      outline: skull, depth: T.skull, z: mid(HZ.shellBack, HZ.shellFront),
      // The traced outline is the FRONT of the skull; the back of a helmet is
      // narrower and shorter than its face, so the back face tapers to it.
      back: [0.74, 0.86], backShift: [0, -d(6)],
      taper: [0.98, 1],
    }]),
    skull);

  // ---- §2 helmet dome ------------------------------------------
  // The rounded helmet behind the forehead tower, from the settei's side and
  // front views (blueprint DOME). Without it the head is a box with a tower
  // on top: the front photograph hides the dome behind the tower.
  const domeTrace = SIDE.cornersZ(DOME.flatMap((d) => [
    [d.px.side[1], d.px.side[0]], [d.px.side[2], d.px.side[0]],
  ]));
  add('helmetDome', 'white', SF.sfHelmetDome(DOME, domeTrace), domeTrace);

  const panel = B(PX.sidePanel);
  const panelZ = mid(HZ.panelBack, HZ.panelFront);
  [1, -1].forEach((s) => {
    add(`sidePanel${s > 0 ? 'L' : 'R'}`, 'white',
      SF.sfSidePanel(panel, T.panel, d(16)), panel,
      { scale: [s, 1, 1], pos: [0, 0, panelZ] });
  });

  // ---- §2 cheek duct: two louvre banks in one recessed housing --
  // The brief calls these "flush, square-profile CIWS vulcan ports"; the bust
  // shows a louvred grille split into two banks by a white bar. Built as the
  // photograph shows it.
  const well = B(PX.cheekWell);
  const bankH = d(38), bankW = d(30);
  const grille = SF.sfCheekGrille(well, [
    { w: bankW, h: bankH, x: BUST.x(238), y: BUST.y(369), fins: hero ? 7 : 3 },
    { w: bankW, h: bankH, x: BUST.x(238), y: BUST.y(412), fins: hero ? 7 : 3 },
  ], T.vent);
  [1, -1].forEach((s) => {
    const side = s > 0 ? 'L' : 'R';
    const at = { scale: [s, 1, 1], pos: [0, 0, HZ.ventFront] };
    add(`cheekWell${side}`, 'recess', grille.housing, well, at);
    add(`cheekGrille${side}`, 'gold', grille.fins, well, at);
  });

  // ---- §2 ear pods and temple tabs ------------------------------
  // Round on the photograph; an OCTAGONAL BOSS here. Eight facets is a design
  // decision, not a quality slider — raise it and it reads as a turned knob.
  const podRing = hardware(ngon(8, d(7), Math.PI / 8), 'ear-pod fitting: round in the photograph, faceted per hard rule 1');
  [1, -1].forEach((s) => {
    add(`earPod${s > 0 ? 'L' : 'R'}`, 'gold', SF.sfEarPod(d(7), d(9)), podRing,
      { pos: [BUST.x(246) * s, BUST.y(291), HZ.panelFront] });
  });

  const tab = B(PX.templeTab);
  [1, -1].forEach((s) => {
    add(`templeTab${s > 0 ? 'L' : 'R'}`, 'goldBright',
      SF.sfTempleTab(tab, T.tab), tab,
      { scale: [s, 1, 1], pos: [0, 0, HZ.shellFront + T.tab * 0.5] });
  });

  // ---- §2 the face, back to front. THE Z ORDER IS LOAD-BEARING --
  const face = B(PX.faceModule);
  add('faceModule', 'white', SF.sfFaceModule(face, T.face), face,
    { pos: [0, 0, HZ.faceFront - T.face / 2] });

  const chin = B(PX.chinPlate);
  // §2 "terminates at an extreme, knife-edge point along the lower chin".
  // Built as an EDGE, not a point — a point is a cone, and a cone is a curve
  // in disguise — by pressing the traced outline forward onto a much smaller,
  // lower front face.
  add('chinPlate', 'white', SF.sfChinWedge(chin, T.chin), chin,
    { pos: [0, 0, HZ.chinFront - T.chin / 2] });

  // §2 the red mask band. Its bottom edge rises at the centre; give it a flat
  // bottom and it becomes a moustache.
  const red = B(PX.redBand);
  add('redBand', 'red', extrude(red, T.red), red,
    { pos: [0, 0, HZ.faceFront + T.red * 0.4] });

  // §2 each eye its OWN surround, sized just past the lens and BEHIND it
  const eyeL = B(PX.eye);
  const eyeR = derive(eyeL, mirrorX, 'mirrored to the right eye');
  [eyeL, eyeR].forEach((o, i) => {
    add(`eyeSurround${i ? 'R' : 'L'}`, 'recess',
      SF.sfEyeSurround(o, T.surround, d(2.5)), o,
      { pos: [0, 0, HZ.faceFront + T.red * 0.2] });
  });
  [eyeL, eyeR].forEach((o, i) => {
    add(`eyeLens${i ? 'R' : 'L'}`, 'eye', SF.sfEyeLens(o, T.eye), o,
      { pos: [0, 0, HZ.faceFront + T.red * 0.9] });
  });

  const nose = B(PX.nose);
  add('noseRidge', 'goldBright', SF.sfNoseRidge(nose, T.nose), nose,
    { pos: [0, 0, HZ.faceFront + T.nose * 0.35] });

  // §2 mouth vent: recessed chevron seams, opening toward +Z
  [PX.chevron1, PX.chevron2].forEach((px, i) => {
    const o = B(px);
    add(`mouthChevron${i + 1}`, 'recess', SF.sfChevronSlot(o, T.chevron), o,
      { pos: [0, 0, HZ.chinFront] });
  });

  // ---- §2 crest ------------------------------------------------
  const crestFrame = B(PX.crestFrame);
  const crestFace = B(PX.crestFace);
  // HZ.crestFront is the traced tip of the brow — the head's front-most
  // point — so the crest's FRONT FACE sits on it, not its centre.
  const crestZ = HZ.crestFront - T.crestFace / 2;
  add('crestFrame', 'gold', SF.sfCrest(
    [{ outline: crestFrame, depth: T.crestFrame, z: 0 }],
  ), crestFrame, { pos: [0, 0, crestZ - T.crestFrame * 1.6] });
  add('crestFace', 'red', extrude(crestFace, T.crestFace), crestFace,
    { pos: [0, 0, crestZ] });

  // ---- §2 forehead sensor tower --------------------------------
  const tower = B(PX.tower);
  add('sensorTower', 'white', SF.sfSensorTower(tower, T.tower), tower,
    { pos: [0, 0, HZ.towerFront - T.tower / 2] });

  [['lensHi', PX.lensHi], ['lensLo', PX.lensLo]].forEach(([name, px]) => {
    const o = B(px);
    const { well: w, lens } = SF.sfLensWell(o, T.well, T.lens);
    add(`${name}Well`, 'recess', w, o, { pos: [0, 0, HZ.towerFront] });
    add(name, 'sensor', lens, o, { pos: [0, 0, HZ.towerFront] });
  });

  // ---- §2 V-fin crown array ------------------------------------
  // THREE pairs, two colours, every one solved from its traced tip. The white
  // pair is the longest thing on the head and the reason the silhouette reads
  // as this suit; building them gold (or as backpack plates) loses it.
  const fins = [
    ['whiteFin', 'white', FIN.white, 0.06],
    ['goldFin', 'goldBright', FIN.gold, 0.10],
    ['goldFinInner', 'gold', FIN.goldInner, 0.12],
  ];
  for (const [name, slot, f, tipFrac] of fins) {
    // The blade's provenance is its TRACED ROOT AND TIP — two corner pixels
    // off the bust — so it audits as measured, which it is.
    const trace = B(f.px);
    [1, -1].forEach((s) => {
      add(`${name}${s > 0 ? 'L' : 'R'}`, slot, SF.sfDartFin(f, tipFrac), trace,
        { scale: [s, 1, 1], pos: [0, 0, HZ.finRoot] });
    });
  }

  // ---- §2 neck block -------------------------------------------
  const neck = B(PX.neckBlock);
  add('neckBlock', 'red', SF.sfNeckBlock(neck, T.neck), neck,
    { pos: [0, 0, HZ.faceFront - T.neck / 2] });

  return p;
}

// Built lazily on first call and cached per LOD, so a unit nobody scrolls to
// costs nothing, and the geometry stays a shared singleton — never disposed,
// because the mech root is `dispose={null}` and destroying a shared
// BufferGeometry when one instance unmounts breaks every other user of it.
const _cache = new Map();
const _pieces = new Map();

export function head(detail = 'hero') {
  if (!_cache.has(detail)) {
    const pieces = build(detail);
    _pieces.set(detail, pieces);
    // uvScale: box UVs are in world units and the armour maps repeat once per
    // unit, so a 0.18-unit head samples a fifth of one tile and its panel
    // lines render as cracks a metre wide.
    _cache.set(detail, assemble(pieces, { uvScale: 6 }));
  }
  return _cache.get(detail);
}

/** The manifest behind a built LOD — for `report()` and the region gate. */
export const headPieces = (detail = 'hero') => (head(detail), _pieces.get(detail));
