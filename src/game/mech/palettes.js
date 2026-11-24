import { GUNDAM_ROSTER } from '../../data/gundamVisuals.jsx';

// Same defaults MSBody (the 2D SVG renderer) falls back to for any color a
// roster entry doesn't override — keeping the 3D model's palette in exact
// sync with the 2D hangar-background art for the same gundamId.
const DEFAULTS = {
  chest: '#0055ff', waist: '#f0f0f0', shoulder: '#f0f0f0', shoulderAccent: '#0055ff',
  arm: '#f0f0f0', joint: '#a0a0a0', leg: '#f0f0f0', knee: '#ff0000', foot: '#ff0000',
  vfin: '#fff', visor: '#00ffcc', chin: '#ff0000', headBase: '#f0f0f0', centerChest: '#ff0000',
};

// One palette object per unit, cached.
//
// Identity matters as much as content here: HangarCorridor calls this
// inline while rendering, and that component re-renders every time the
// centred bay changes. Returning a fresh object made MechModel3D's
// material useMemo miss on every scroll, rebuilding ~25 MeshStandard-
// Materials per visible mech — none of which are ever disposed, because
// the mech root is `dispose={null}`. Scrolling the corridor for a couple
// of minutes leaked enough of them to take the tab down.
const _heroPalettes = new Map();

// Adapts a GUNDAM_ROSTER entry's flat 2D colour props into the palette shape
// MechModel3D consumes.
export function getHeroPalette(gundamId) {
  const key = gundamId % GUNDAM_ROSTER.length;
  const hit = _heroPalettes.get(key);
  if (hit) return hit;
  const unit = GUNDAM_ROSTER[key];
  const palette = {
    name: unit.name,
    thruster: unit.thruster || '#00e5ff',
    ...DEFAULTS,
    ...unit.props,
  };
  _heroPalettes.set(key, palette);
  return palette;
}

// Enemy mobile suit palette — same field shape, defaults skewed darker and
// greyer (mass-production grunt), overridden by the boss's `colors` in
// src/data/bossRoster.js. Cached per boss definition for the same identity
// reason as the hero palettes above.
const _bossPalettes = new WeakMap();

export function getBossPalette(bossDef) {
  const hit = _bossPalettes.get(bossDef);
  if (hit) return hit;
  const palette = {
    name: bossDef.name,
    thruster: '#ff2222',
    chest: '#4a4a52', waist: '#33333a', shoulder: '#4a4a52', shoulderAccent: '#8a1010',
    arm: '#3d3d44', joint: '#8a1010', leg: '#3d3d44', knee: '#8a1010', foot: '#222226',
    vfin: '#8a1010', visor: '#ff3b3b', chin: '#222226', headBase: '#4a4a52', centerChest: '#8a1010',
    ...bossDef.colors,
  };
  _bossPalettes.set(bossDef, palette);
  return palette;
}
