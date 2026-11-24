// ============================================================
// ZGMF-X20A STRIKE FREEDOM — COLOUR SPLIT
//
// Merged OVER the roster-derived baseline set in MechModel3D, so a slot this
// file omits keeps the shared behaviour (glow materials, the shield field).
// That is how a suit gets its real colour split without changing the 2D
// background sprites, which are keyed to the same gundamId.
//
// GOLD IS METALLIC PAINT, NOT A MIRROR. Authored at metalness 0.96 it has no
// diffuse term at all, and in this scene's modest IBL every gold plate
// rendered BLACK — the V-fin, both elbows and both knees simply vanished.
// Keep gold near 0.5 with a strongly lifted envMapIntensity. The first pass
// of this rebuild authored it at 0.66/1.6 and the V-fin still came out olive
// on the shadowed side — metallic paint over a coloured primer has a real
// diffuse term, and this scene's IBL is not bright enough to fake one. That
// gold is the suit's signature trait; a gold that renders black makes the
// model read as any white Gundam.
// ============================================================

export const colors = {
  white: '#f2f4f7',       // primary armour, matte-to-semi-gloss  §1
  offWhite: '#dfe3ea',    // the shadowed second plate of a laminate
  navy: '#1d2a52',        // the deep navy structural layer  §1
  gold: '#c9a13c',        // the exposed inner frame
  goldBright: '#e8c25a',  // V-fin blades and trim, catching more light
  red: '#d92c3e',         // crest, mask band, neck block
  eye: '#ffd24a',         // the twin eyes read GOLD-YELLOW on the bust
  sensor: '#2f8fe0',      // forehead tower lenses
  recess: '#14161b',      // the dark inside of a real inset
  dark: '#101318',
};

export const materialSpec = {
  white: { color: colors.white, roughness: 0.52, metalness: 0.16 },
  offWhite: { color: colors.offWhite, roughness: 0.58, metalness: 0.16 },
  navy: { color: colors.navy, roughness: 0.55, metalness: 0.22 },
  gold: { color: colors.gold, roughness: 0.38, metalness: 0.48, envMapIntensity: 2.2 },
  goldBright: { color: colors.goldBright, roughness: 0.30, metalness: 0.52, envMapIntensity: 2.6 },
  red: { color: colors.red, roughness: 0.46, metalness: 0.18 },
  eye: { emissive: colors.eye, emissiveIntensity: 1.5 },
  sensor: { emissive: colors.sensor, emissiveIntensity: 1.1 },
  recess: { color: colors.recess, roughness: 0.86, metalness: 0.42 },
  dark: { color: colors.dark, roughness: 0.8, metalness: 0.45 },
};
