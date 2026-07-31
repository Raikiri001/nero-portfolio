import { GUNDAM_ROSTER } from '../../data/gundamVisuals.jsx';

// Same defaults MSBody (the 2D SVG renderer) falls back to for any color a
// roster entry doesn't override — keeping the 3D model's palette in exact
// sync with the 2D hangar-background art for the same gundamId.
const DEFAULTS = {
  chest: '#0055ff', waist: '#f0f0f0', shoulder: '#f0f0f0', shoulderAccent: '#0055ff',
  arm: '#f0f0f0', joint: '#a0a0a0', leg: '#f0f0f0', knee: '#ff0000', foot: '#ff0000',
  vfin: '#fff', visor: '#00ffcc', chin: '#ff0000', headBase: '#f0f0f0', centerChest: '#ff0000',
};

// Adapts a GUNDAM_ROSTER entry's flat 2D color props into the palette shape
// MechModel3D consumes. `variant` stays 'hero' (twin-eye, v-fin) for every
// roster unit — the roster is exclusively player-side Gundams.
export function getHeroPalette(gundamId) {
  const unit = GUNDAM_ROSTER[gundamId % GUNDAM_ROSTER.length];
  return {
    name: unit.name,
    variant: 'hero',
    thruster: unit.thruster || '#00e5ff',
    ...DEFAULTS,
    ...unit.props,
  };
}

// Enemy mobile suit palette — same field shape, defaults skew darker/greyer
// (mass-production grunt, not a hero unit), overridden per-boss by
// bossRoster.js. `variant: 'grunt'` swaps the mono-eye head / horn / smaller
// shoulder geometry in MechModel3D.
export function makeGruntPalette(overrides = {}) {
  return {
    name: 'UNKNOWN MS',
    variant: 'grunt',
    thruster: '#ff2222',
    chest: '#4a4a52', waist: '#33333a', shoulder: '#4a4a52', shoulderAccent: '#8a1010',
    arm: '#3d3d44', joint: '#8a1010', leg: '#3d3d44', knee: '#8a1010', foot: '#222226',
    vfin: '#8a1010', visor: '#ff3b3b', chin: '#222226', headBase: '#4a4a52', centerChest: '#8a1010',
    ...overrides,
  };
}
