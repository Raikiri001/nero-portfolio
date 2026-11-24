// ============================================================
// Per-unit mobile suit specifications.
//
// One record per `gundamId` (= index into GUNDAM_ROSTER, = project index).
//
// This file used to be the spine of per-unit VISUAL identity too, carrying
// proportion multipliers, variant part choices, a rig id and a held-weapon
// id that a shared part library resolved into a body. That machinery is
// gone: a suit's silhouette, its rig, its weapons and its colour split now
// live in `units/<unit>/`, authored against its own reference folder. Two
// suits share nothing but the inner frame.
//
// What is left is what every suit needs identically:
//   name / code  display strings for the hangar and the HUD
//   combat       stats plus the special ability driven by combatEngine
//
// There is deliberately NO size field: a suit's height is its blueprint
// (units/<unit>/blueprint.js `H`), never a multiplier on top of it.
//
// Verified against the units' real counterparts — keep the roster table in
// CLAUDE.md in sync with this file.
// ============================================================

/** Baseline used by every spec; individual units override what differs. */
const BASE = {
  combat: {
    hp: 100, speed: 1, boost: 1,
    primary: { rate: 0.22, damage: 9, range: 60, shots: 1, spread: 0 },
    melee: { damage: 27, range: 5.5, cooldown: 0.85 },
    special: { id: 'full-burst', cooldown: 12, duration: 1.2, damage: 60, label: 'FULL BURST' },
  },
};

function spec(name, code, over = {}) {
  return {
    name,
    code,
    combat: {
      ...BASE.combat,
      ...(over.combat || {}),
      primary: { ...BASE.combat.primary, ...(over.combat?.primary || {}) },
      melee: { ...BASE.combat.melee, ...(over.combat?.melee || {}) },
      special: { ...BASE.combat.special, ...(over.combat?.special || {}) },
    },
  };
}

export const UNIT_SPECS = [
  // 0 — tall and slim with the signature exposed gold inner frame; the
  // wings carry eight Super DRAGOON pods.
  spec('Strike Freedom Gundam', 'ZGMF-X20A', {
    combat: {
      hp: 105, speed: 1.12, boost: 1.15,
      primary: { rate: 0.16, damage: 8, range: 66, shots: 2, spread: 0.02 },
      special: { id: 'dragoons', cooldown: 14, duration: 3.6, damage: 11, label: 'DRAGOON SWARM' },
    },
  }),

  // 1 — the largest, bulkiest suit in the roster; the Proud Defender is a
  // huge weapons platform and the Disruptor is the heaviest single hit.
  spec('Mighty Strike Freedom Gundam', 'ZGMF/A-262PD-P', {
    combat: {
      hp: 125, speed: 0.86, boost: 0.9,
      primary: { rate: 0.30, damage: 15, range: 70, shots: 1 },
      melee: { damage: 38, range: 6.4, cooldown: 1.1 },
      special: { id: 'disruptor', cooldown: 18, duration: 2.2, damage: 130, label: 'DISRUPTOR' },
    },
  }),

  // 2 — most compact suit; battery powered, so lower output but nimble.
  spec('Rising Freedom Gundam', 'STTS-909', {
    combat: {
      hp: 92, speed: 1.18, boost: 1.2,
      primary: { rate: 0.18, damage: 7, range: 54 },
      special: { id: 'agni-burst', cooldown: 11, duration: 1.4, damage: 78, label: 'AGNI BURST' },
    },
  }),

  // 3 — the classic baseline. Full Burst fires both Balaena cannons, both
  // Xiphias railguns and the rifle at once: five origins.
  spec('Freedom Gundam', 'ZGMF-X10A', {
    combat: {
      hp: 100, speed: 1.05, boost: 1.05,
      special: { id: 'full-burst', cooldown: 13, duration: 1.5, damage: 95, label: 'HiMAT FULL BURST' },
    },
  }),

  // 4 — broad and aggressive. Wings of Light spread Mirage Colloid, so the
  // special is an after-image dash rather than a static beam.
  spec('Destiny Gundam', 'ZGMF-X42S', {
    combat: {
      hp: 108, speed: 1.06, boost: 1.1,
      primary: { rate: 0.26, damage: 11, range: 52 },
      melee: { damage: 42, range: 7.0, cooldown: 1.0 },
      special: { id: 'arondight', cooldown: 12, duration: 1.1, damage: 105, label: 'ARONDIGHT' },
    },
  }),

  // 5 — tall and long-legged; Fatum-01 detaches for strafing runs.
  spec('Infinite Justice Gundam', 'ZGMF-X19A', {
    combat: {
      hp: 100, speed: 1.14, boost: 1.16,
      primary: { rate: 0.20, damage: 9, range: 58 },
      melee: { damage: 31, range: 6.0, cooldown: 0.8 },
      special: { id: 'fatum-strafe', cooldown: 12, duration: 2.4, damage: 74, label: 'FATUM STRAFE' },
    },
  }),

  // 6 — angular, with the 4-winged lifter and the long mohawk sensor that
  // conceals a beam blade.
  spec('Infinite Justice Gundam Type II', 'ZGMF-X191M2', {
    combat: {
      hp: 102, speed: 1.1, boost: 1.12,
      primary: { rate: 0.19, damage: 8, range: 50 },
      melee: { damage: 24, range: 6.2, cooldown: 0.6 },
      special: { id: 'blade-dance', cooldown: 11, duration: 2.0, damage: 90, label: 'BLADE DANCE' },
    },
  }),

  // 7 — sturdier predecessor; Fatum-00 is the large ridable lifter with
  // machine guns rather than the later blade-heavy loadout.
  spec('Justice Gundam', 'ZGMF-X09A', {
    combat: {
      hp: 106, speed: 1.0, boost: 1.02,
      primary: { rate: 0.17, damage: 8, range: 56, shots: 2, spread: 0.03 },
      special: { id: 'fatum-charge', cooldown: 13, duration: 2.2, damage: 82, label: 'FATUM-00 CHARGE' },
    },
  }),

  // 8 — shares Rising Freedom's frame; transformable, so binders instead of
  // a lifter, and no beam shield.
  spec('Immortal Justice Gundam', 'ZGMF/A-42S2', {
    combat: {
      hp: 94, speed: 1.2, boost: 1.24,
      primary: { rate: 0.17, damage: 7, range: 55 },
      special: { id: 'ma-strafe', cooldown: 11, duration: 2.2, damage: 70, label: 'MA STRAFE' },
    },
  }),

  // 9 — slim transformable with Mirage Colloid stealth; waist stabilizer
  // wings and twin arm beam shields that double as arm swords.
  spec('Eclipse Gundam', 'MVF-X08', {
    combat: {
      hp: 96, speed: 1.16, boost: 1.18,
      primary: { rate: 0.19, damage: 9, range: 58 },
      melee: { damage: 29, range: 5.4, cooldown: 0.7 },
      special: { id: 'mirage-ambush', cooldown: 13, duration: 2.6, damage: 85, label: 'MIRAGE AMBUSH' },
    },
  }),

  // 10 — Unicorn Mode: closed visor face, single horn, psycho-frame dormant.
  spec('Unicorn Gundam', 'RX-0', {
    combat: {
      hp: 100, speed: 1.04, boost: 1.06,
      primary: { rate: 0.42, damage: 26, range: 74 },
      special: { id: 'ntd-activate', cooldown: 15, duration: 3.0, damage: 88, label: 'NT-D ACTIVATE' },
    },
  }),

  // 11 — Destroy Mode: the frame expands (taller), the horn splits into a
  // V-fin, the face opens to twin eyes, and the psycho-frame glows.
  spec('Unicorn Gundam Final Battle Ver', 'RX-0 [D]', {
    combat: {
      hp: 112, speed: 1.16, boost: 1.22,
      primary: { rate: 0.38, damage: 28, range: 76 },
      melee: { damage: 34, range: 6.0, cooldown: 0.7 },
      special: { id: 'psycho-burst', cooldown: 15, duration: 2.4, damage: 115, label: 'PSYCHO FIELD' },
    },
  }),

  // 12 — the heaviest UC suit; every Armed Armor at once.
  spec('Unicorn Gundam Perfectibility', 'RX-0 [PF]', {
    combat: {
      hp: 132, speed: 0.84, boost: 0.88,
      primary: { rate: 0.34, damage: 24, range: 78, shots: 2, spread: 0.03 },
      melee: { damage: 40, range: 7.2, cooldown: 1.1 },
      special: { id: 'armor-barrage', cooldown: 17, duration: 3.0, damage: 125, label: 'ARMED ARMOR BARRAGE' },
    },
  }),

  // 13 — compact classic; Aile Striker pack, Armor Schneiders in the side
  // skirts (not the backpack).
  spec('Strike Gundam', 'GAT-X105', {
    combat: {
      hp: 96, speed: 1.06, boost: 1.1,
      primary: { rate: 0.21, damage: 9, range: 56 },
      special: { id: 'aile-assault', cooldown: 11, duration: 1.8, damage: 72, label: 'AILE ASSAULT' },
    },
  }),

  // 14 — slimmest and most agile; GN Drive sits in the chest, and the
  // "Seven Swords" loadout is worn all over the frame.
  spec('Gundam Exia', 'GN-001', {
    combat: {
      hp: 90, speed: 1.3, boost: 1.35,
      primary: { rate: 0.24, damage: 8, range: 44 },
      melee: { damage: 36, range: 6.6, cooldown: 0.55 },
      special: { id: 'seven-swords', cooldown: 11, duration: 2.6, damage: 108, label: 'SEVEN SWORDS' },
    },
  }),

  // 15 — mid build; the chest carries the Core Splendor seam and the Force
  // Silhouette supplies the wings.
  spec('Impulse Gundam', 'ZGMF-X56S', {
    combat: {
      hp: 98, speed: 1.1, boost: 1.12,
      primary: { rate: 0.20, damage: 9, range: 56 },
      special: { id: 'silhouette-burst', cooldown: 12, duration: 1.6, damage: 76, label: 'SILHOUETTE BURST' },
    },
  }),

  // 16 — tall and elegant; feathered wings, sabers in the shoulders and
  // machine cannons in the collarbones.
  spec('Wing Gundam Zero EW', 'XXXG-00W0', {
    combat: {
      hp: 104, speed: 1.08, boost: 1.14,
      primary: { rate: 0.46, damage: 30, range: 85 },
      special: { id: 'twin-buster', cooldown: 16, duration: 1.8, damage: 140, label: 'TWIN BUSTER RIFLE' },
    },
  }),

  // 17 — heavy industrial frame; no beam weapons at all, and the mace
  // carries a pile bunker plus a concealed chainsaw.
  spec('Gundam Barbatos', 'ASW-G-08', {
    combat: {
      hp: 128, speed: 0.94, boost: 0.96,
      primary: { rate: 0.34, damage: 12, range: 40 },
      melee: { damage: 48, range: 6.8, cooldown: 1.15 },
      special: { id: 'mace-crush', cooldown: 12, duration: 1.4, damage: 118, label: 'MACE CRUSH' },
    },
  }),

  // 18 — the original: boxy, stocky and the shortest suit in the roster.
  spec('RX-78-2 Gundam', 'RX-78-2', {
    combat: {
      hp: 98, speed: 0.96, boost: 0.94,
      primary: { rate: 0.24, damage: 10, range: 58 },
      special: { id: 'last-shooting', cooldown: 13, duration: 1.5, damage: 92, label: 'LAST SHOOTING' },
    },
  }),

  // 19 — slim and lithe; the chrome Gerbera Straight katana is its
  // signature, but it keeps the backpack beam sabers too.
  spec('Gundam Astray Red Frame', 'MBF-P02', {
    combat: {
      hp: 92, speed: 1.26, boost: 1.28,
      primary: { rate: 0.23, damage: 8, range: 46 },
      melee: { damage: 40, range: 6.4, cooldown: 0.5 },
      special: { id: 'iaido', cooldown: 10, duration: 1.0, damage: 112, label: 'IAIDO SLASH' },
    },
  }),

  // 20 — balanced; the Twin Drive is the identity, feeding Trans-Am.
  spec('Gundam 00', 'GN-0000', {
    combat: {
      hp: 104, speed: 1.18, boost: 1.2,
      primary: { rate: 0.18, damage: 9, range: 60, shots: 2, spread: 0.02 },
      melee: { damage: 33, range: 6.2, cooldown: 0.6 },
      special: { id: 'trans-am', cooldown: 16, duration: 4.0, damage: 0, label: 'TRANS-AM' },
    },
  }),

  // 21 — broad-backed; the GN shield carries six Sword Bits that deploy as
  // remote blades or close into a GN Field.
  spec('Gundam Qan[T]', 'GNT-0000', {
    combat: {
      hp: 110, speed: 1.1, boost: 1.12,
      primary: { rate: 0.20, damage: 11, range: 64 },
      melee: { damage: 38, range: 6.8, cooldown: 0.7 },
      special: { id: 'sword-bits', cooldown: 14, duration: 3.4, damage: 14, label: 'SWORD BIT SWARM' },
    },
  }),
];

/** Generic fallback so an id past the table still resolves. */
export const DEFAULT_SPEC = spec('Mobile Suit', 'MS-XX');

export function getUnitSpec(id) {
  return UNIT_SPECS[id] ?? DEFAULT_SPEC;
}
