// Enemy mobile suits for the combat mini-game — mass-production ZAFT-style
// grunt units (canon-flavored names, consistent with how the rest of the
// site already leans on real Gundam SEED terminology). Deliberately NOT
// paired 1:1 with a project/Gundam: pickRandomBoss() rolls one of these
// independent of which hero unit you deployed, so the same project can
// face a different opponent on every attempt.
//
// `archetype` drives the boss AI's finite-state behaviour in
// combat/combatEngine.js (updateBossAI) — each plays differently:
//   aggressive-melee - closes distance fast, relies on its blade
//   kiting-sniper     - keeps range, peppers beam fire, retreats if rushed
//   shield-turtle     - holds ground, blocks frontal shots, punishes openings
//   boost-evader      - hit-and-run, boosts away after every attack
//   dual-rusher       - twin claws, alternates fast flanking passes
export const BOSS_ROSTER = [
  {
    id: 'ginn',
    name: 'GINN',
    archetype: 'aggressive-melee',
    hp: 320,
    speed: 7.5,
    damage: 14,
    colors: {
      chest: '#5a5a52', shoulder: '#5a5a52', arm: '#46463f', leg: '#46463f',
      shoulderAccent: '#8a7a10', joint: '#8a7a10', knee: '#8a7a10',
      visor: '#ffcc33', centerChest: '#8a7a10', thruster: '#ff8822',
    },
  },
  {
    id: 'cgue',
    name: 'CGUE',
    archetype: 'shield-turtle',
    hp: 420,
    speed: 5.5,
    damage: 16,
    colors: {
      chest: '#3d2f2f', shoulder: '#3d2f2f', arm: '#552222', leg: '#552222',
      shoulderAccent: '#b03030', joint: '#b03030', knee: '#b03030',
      visor: '#ff4433', centerChest: '#b03030', thruster: '#ff4433',
    },
  },
  {
    id: 'dinn',
    name: 'DINN',
    archetype: 'boost-evader',
    hp: 280,
    speed: 10,
    damage: 12,
    colors: {
      chest: '#1f3a4a', shoulder: '#1f3a4a', arm: '#2a4d5f', leg: '#2a4d5f',
      shoulderAccent: '#33aadd', joint: '#33aadd', knee: '#33aadd',
      visor: '#66eeff', centerChest: '#33aadd', thruster: '#33d4ff',
    },
  },
  {
    id: 'guaiz',
    name: 'GuAIZ',
    archetype: 'kiting-sniper',
    hp: 300,
    speed: 6.5,
    damage: 18,
    colors: {
      chest: '#3a3a44', shoulder: '#3a3a44', arm: '#4a4a56', leg: '#4a4a56',
      shoulderAccent: '#7744cc', joint: '#7744cc', knee: '#7744cc',
      visor: '#bb88ff', centerChest: '#7744cc', thruster: '#9955ff',
    },
  },
  {
    id: 'goohn',
    name: 'GOOhN',
    archetype: 'dual-rusher',
    hp: 360,
    speed: 8,
    damage: 13,
    colors: {
      chest: '#2f402f', shoulder: '#2f402f', arm: '#3d523d', leg: '#3d523d',
      shoulderAccent: '#55aa33', joint: '#55aa33', knee: '#55aa33',
      visor: '#88ff55', centerChest: '#55aa33', thruster: '#77ff33',
    },
  },
  {
    id: 'zno',
    name: 'ZnO',
    archetype: 'shield-turtle',
    hp: 400,
    speed: 6,
    damage: 17,
    colors: {
      chest: '#454034', shoulder: '#454034', arm: '#5a5344', leg: '#5a5344',
      shoulderAccent: '#ccaa22', joint: '#ccaa22', knee: '#ccaa22',
      visor: '#ffee55', centerChest: '#ccaa22', thruster: '#ffcc22',
    },
  },
];

export function pickRandomBoss(excludeId) {
  const pool = excludeId ? BOSS_ROSTER.filter((b) => b.id !== excludeId) : BOSS_ROSTER;
  return pool[Math.floor(Math.random() * pool.length)];
}
