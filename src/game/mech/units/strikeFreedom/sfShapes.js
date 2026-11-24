import {
  extrude, plate, recess, laminate, spar, stepped, louvres, boss,
  insetXY, derive, mergeGeometries, stack, chamfer,
} from '../../kit';

// ============================================================
// STRIKE FREEDOM'S OWN SHAPE LIBRARY
//
// Constructors written FOR THIS SUIT and named after its actual hardware.
// Imported by nobody else, ever: two suits sharing a helmet constructor is
// what made the roster read as one body in 22 colourways, and reaching for a
// generic "plate" or "block" helper is the failure mode this file exists to
// prevent. A second suit needing a cheek grille writes its own.
//
// THE ARITY RULE holds throughout: every constructor takes ONE depth and
// returns geometry CENTRED ON z = 0. The caller positions it with `pos`.
// ============================================================

/**
 * §2 HELMET SHELL — "a rigid, multi-sided hexagonal-pyramidal wedge …
 * constructed from interlocking polygonal plates bolted together along
 * visible straight-edge seams".
 *
 * A LAMINATE, not a solid. The bust shows the skull as three separate plates
 * at three depths: a deep core, a crown plate stepped forward over it, and a
 * brow plate over that. Extruded as one volume it reads as a slab however
 * accurately the silhouette was traced, because the shadow in the gaps
 * between those plates is most of what makes the surface read as machined.
 */
export const sfHelmetShell = (layers) => laminate(layers, { gap: 0 });

// The dome's corner cut, as a fraction of each slice's narrower side. The
// line art draws these corners as soft curves; per hard rule 1 they become
// ONE flat chamfer each, sized so the octagon reads as the drawn outline.
const DOME_CHAMFER = 0.28;

/**
 * §2 HELMET DOME — the volume behind the forehead tower, rising almost to
 * the crown and sloping down to the back, which the front photograph can
 * never show. Built from horizontal slices (blueprint `DOME`): each slice's
 * front/back come off the side view and its width off the front view at the
 * same height, so the part is the intersection of two traced elevations.
 * Each slice is a chamfered rectangle (an octagon); between slices the
 * surface is straight facets.
 *
 * `trace` is the slices' side-view corners, branded, so the part audits as
 * traced; every section derives from it.
 */
export function sfHelmetDome(slices, trace) {
  const sections = [...slices].sort((a, b) => a.y - b.y).map((sl) => {
    const half = (sl.xRight - sl.xLeft) / 2;
    const cut = DOME_CHAMFER * Math.min(2 * half, sl.zFront - sl.zBack);
    return {
      y: sl.y,
      pts: derive(trace, () => chamfer([
        [-half, sl.zBack], [half, sl.zBack], [half, sl.zFront], [-half, sl.zFront],
      ], cut), `dome slice, side row ${sl.px.side[0]} × front row ${sl.px.front[0]}`),
    };
  });
  return stack(sections);
}

/**
 * §2 The big white SIDE PANEL that carries the cheek duct and runs down to a
 * point below the jaw. Traced in the front elevation, pressed back with a
 * stepped inboard face so the grille sits in a real well rather than on a
 * flat wall.
 */
export const sfSidePanel = (outline, depth, lean) =>
  extrude(outline, depth, {
    // The panel LEANS and NARROWS HARD toward the back — mg-…-03_1.jpg shows
    // the helmet in near-profile as a wedge whose side plate is widest at the
    // face and converges to almost nothing behind the ear. Without that the
    // plate is a prism carrying its traced front silhouette on both faces,
    // and from three-quarter it is a slab standing off the side of the head.
    backShift: [-lean, -lean * 0.5],
    // THE TRACED OUTLINE IS THE FRONT. The panel sweeps in and back behind
    // it, so the BACK is what tapers. Built the other way round the traced
    // silhouette lands on the back face and the panel renders as a slab as
    // wide as the whole head — which from three-quarter reads as a blob, and
    // is the single thing that stops this head looking machined.
    back: [0.34, 0.58],
    taper: [0.97, 1], steps: [{ at: 0.45, scale: [0.82, 0.90], shift: [-lean * 0.4, 0] }],
  });

/**
 * §2 CHEEK DUCT — "flush, square-profile CIWS vulcan ports". Two louvre
 * banks in one recessed housing.
 *
 * Vents are GEOMETRY, never painted: the armour texture generator scatters
 * louvre patches by RNG, so every part sharing the map gets the same patch in
 * the same off-centre place and it reads as misaligned detail.
 */
export function sfCheekGrille(well, banks, depth) {
  // The HOUSING and the FINS are different materials and are returned
  // separately. Merged into one gold geometry the raked fins self-shadow
  // against a gold back wall and the whole grille renders as a black patch —
  // which reads as a hole in the cheek rather than as a vent.
  const fins = banks.map((b) => {
    const g = louvres(b.w, b.h, b.fins, depth * 0.62, 0.30);
    g.translate(b.x, b.y, -depth * 0.28);
    return g;
  });
  return { housing: recess(well, depth, 0), fins: mergeGeometries(fins) };
}

/**
 * §2 FACE MODULE — the narrow centre mask the eyes are set into.
 *
 * THE Z ORDER OF THE FACE IS LOAD-BEARING. Back to front: mask body, mask
 * face, eye surrounds, eye lenses, nose ridge. Put the centre mask in front
 * of the eyes and it swallows them completely — the face renders blank and
 * the lenses are simply gone. This constructor is only the body; the stack
 * above it is assembled in `regions/head.js` where the order is visible.
 */
export const sfFaceModule = (outline, depth) =>
  extrude(outline, depth, { taper: [0.94, 0.97], steps: [{ at: 0.7, scale: [0.98, 0.99] }] });

/**
 * §2 CHIN — "terminates at an extreme, knife-edge point along the lower
 * chin". An EDGE, not a point: a point is a cone, and a cone is a curve in
 * disguise.
 */
export const sfChinWedge = (outline, depth) =>
  extrude(outline, depth, {
    taper: [0.86, 0.78],
    shift: [0, -depth * 0.16],
    steps: [{ at: 0.6, scale: [0.95, 0.90], shift: [0, -depth * 0.06] }],
  });

/**
 * §2 EYE — each lens gets its OWN thin surround, sized just past it and
 * placed BEHIND it. A single dark slot spanning both eyes reads as a visor
 * bar across the face, which is the one thing that stops a Gundam head
 * reading as a Gundam head.
 */
export const sfEyeSurround = (outline, depth, wall) =>
  extrude(derive(outline, (o) => insetXY(o, -wall), 'eye surround, outset'), depth);

export const sfEyeLens = (outline, depth) => extrude(outline, depth, { taper: 0.9 });

/**
 * §2 FOREHEAD SENSOR TOWER — the white block with the blue lenses standing
 * between the gold fins. It is a FIFTH OF HEAD HEIGHT; leave it off and the
 * head loses its top fifth and reads tiny under the fins.
 */
export const sfSensorTower = (outline, depth) =>
  stepped(outline, depth, 3, 0.10);

/** A blue lens in a real well: rim wall down to a floor, then the lens. */
export function sfLensWell(outline, wellDepth, lensDepth) {
  const well = recess(outline, wellDepth, 0);
  // The lens nearly FILLS its well and sits just inside the rim. Set deeper
  // and inset harder, the rim's own side walls swallow it and the tower reads
  // as two black slots instead of two lit sensors.
  const lens = extrude(derive(outline, (o) => insetXY(o, wellDepth * 0.22), 'lens face'), lensDepth);
  lens.translate(0, 0, -wellDepth * 0.30);
  return { well, lens };
}

/**
 * §2 V-FIN DART BLADE — "straight, razor-sharp dart blades … each blade
 * tapers linearly to a microscopic micro-point".
 *
 * Solved from its TRACED TIP. `tipFrac` is a FRACTION of the root half-width;
 * passed as an absolute it adds itself to the tip's reach and the fin spans
 * twice what you traced.
 */
export const sfDartFin = (f, tipFrac = 0.10) =>
  spar(f.root, f.tip, f.rootHalf, f.thick, { tipFrac });

/**
 * §2 CREST — "a central triangular golden base plate" carrying the red
 * chevron. Two plates: the gold frame and the red face proud of it.
 */
export const sfCrest = (layers) => laminate(layers, { gap: 0 });

/**
 * §2 MOUTH VENT — "multiple recessed horizontal slots etched into a flat
 * rectangular plate". Here they are chevrons, which is what the bust shows.
 *
 * Dark detail on the face must read as a SEAM, not a filled panel: a solid
 * dark block under the nose sits exactly where a moustache would.
 */
export const sfChevronSlot = (outline, depth) => recess(outline, depth, 0);

/** §2 Ear-pod fitting. Round in the photograph; an octagonal boss here. */
export const sfEarPod = (r, h) => boss(8, r, h);

/** §2 The red block under the jaw, running down into the neck. */
export const sfNeckBlock = (outline, depth) => plate(outline, depth, depth * 0.16);

/** §2 The gold ridge splitting the twin eyes, standing PROUD of the lenses. */
export const sfNoseRidge = (outline, depth) =>
  extrude(outline, depth, { taper: [0.45, 0.96] });

/** §2 Small gold trim tab on the temple — the CIWS port cover. */
export const sfTempleTab = (outline, depth) => plate(outline, depth, depth * 0.25);
