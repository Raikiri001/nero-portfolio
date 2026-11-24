import { Assembly as StrikeFreedom } from './strikeFreedom/Assembly';
import { dims as strikeFreedomDims } from './strikeFreedom/dims';
import { materialSpec as strikeFreedomMaterials } from './strikeFreedom/colors';

// ============================================================
// UNIT REGISTRY
//
// One entry per HAND-BUILT mobile suit. A unit listed here owns everything
// with a silhouette: its own blueprint measured off its own reference folder,
// its own shape library, its own regions, its own rig and its own colour
// split. Two units share NOTHING except the inner frame — the same skeleton
// at a different size, the way a Real Grade kit is engineered.
//
// THERE IS NO FALLBACK BODY, not even a placeholder. A unit not listed here
// renders NOTHING: its bay is dressed, lit and empty. The old shared variant
// library resolved 22 suits out of five torsos and six shoulders, and that is
// precisely what made the roster read as one body in 22 colourways. An empty
// bay is honest; a plausible wrong suit is not.
//
// To build a unit, see CLAUDE.md "The one-region loop" — a unit is MANY
// prompts, one body region each, never a full pass.
// ============================================================

const UNITS = {
  0: {
    dims: strikeFreedomDims,
    Assembly: StrikeFreedom,
    materialSpec: strikeFreedomMaterials,
  },
};

/** The build for this id, or `null` if nothing of it has been built yet. */
export function getUnit(gundamId) {
  return UNITS[gundamId] ?? null;
}
