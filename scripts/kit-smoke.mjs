// ============================================================
// THE KIT'S OWN REGRESSION CHECK
//
//   node --import ./scripts/resolve.mjs scripts/kit-smoke.mjs
//
// Builds every primitive and asserts the three properties the whole
// straight-edge design language rests on:
//
//   1. NO NaN VERTICES. One NaN poisons a whole merged material slot.
//   2. NO INSIDE-OUT SOLIDS (open shells excepted — you look INTO a recess).
//   3. FEW DISTINCT NORMALS. Printed for every primitive, because a shape
//      that has quietly become round shows up as dozens of near-parallel
//      normals where a faceted one has a handful. This is the mechanical
//      version of hard rule 1, and the reason it is a number rather than a
//      screenshot is that "does this look round?" never converged.
//
// It also asserts that the kit REFUSES an untraced outline, which is the
// property that makes "trace, don't invent" enforceable rather than advisory.
// ============================================================
import * as K from '../src/game/mech/kit/index.js';

const E = K.elevation({
  crown: 0, sole: 100, midline: 50, height: 1, w: 100, h: 100, image: 'smoke.png',
});
const box = E.corners([[20, 90], [80, 90], [80, 20], [20, 20]]);
const notch = E.corners([[20, 90], [80, 90], [80, 30], [50, 55], [20, 30]]);
const planA = E.plan([[20, 60], [80, 60], [80, 30], [20, 30]], 45);
const planB = E.plan([[28, 58], [72, 58], [72, 34], [28, 34]], 45);

const cases = {
  extrude: () => K.extrude(box, 0.2),
  'extrude taper/back': () => K.extrude(box, 0.2, { taper: 0.6, back: 0.4 }),
  extrudeAlongZ: () => K.extrudeAlong('z', box, 0.2),
  extrudeAlongX: () => K.extrudeAlong('x', box, 0.2),
  plate: () => K.plate(box, 0.12, 0.02),
  'plate concave': () => K.plate(notch, 0.12, 0.015),
  recess: () => K.recess(box, 0.06, 0.01),
  stack: () => K.stack([{ y: 0, pts: planA }, { y: 0.4, pts: planB }]),
  laminate: () => K.laminate([
    { outline: box, depth: 0.05, z: -0.05 },
    { outline: notch, depth: 0.04, z: 0.02 },
  ], { gap: 0.005 }),
  spar: () => K.spar([0, 0], [0.4, 0.8], 0.06, 0.02),
  knifeEdge: () => K.knifeEdge(planA, 0.3, 0.04, 0.2),
  splitShell: () => K.splitShell(box, [0, -1], [0, 1], 1, 0.1),
  pyramidCap: () => K.pyramidCap(box, 0.2, 0.5, 0.12),
  stepped: () => K.stepped(box, 0.2, 4, 0.3),
  drum: () => K.drum(8, 0.08, 0.16),
  pivotBlock: () => K.pivotBlock(8, 0.07, 0.16),
  nozzle: () => K.nozzle(6, 0.03, 0.07, 0.12),
  aperture: () => K.aperture(8, 0.06, 0.04),
  bolts: () => K.bolts(4, 0.01, [-0.1, 0], [0.1, 0], 0.01),
  strut: () => K.strut([0, 0, 0], [0.1, 0.3, 0.05], 0.015),
  ribbedBeam: () => K.ribbedBeam(0.05, 0.3, 3),
  louvres: () => K.louvres(0.2, 0.1, 6, 0.04),
  boss: () => K.boss(8, 0.03, 0.03),
};

let bad = 0;
console.log('primitive                tris   normals   volume');
for (const [name, make] of Object.entries(cases)) {
  const g = make();
  const p = g.attributes.position.array;
  let nan = 0;
  for (let i = 0; i < p.length; i++) if (!Number.isFinite(p[i])) nan++;
  const n = K.normalCount(g);
  const vol = signedVolume(g);
  const open = Boolean(g.userData.openShell);
  const flags = [];
  if (nan) flags.push(`${nan} NaN`);
  if (!open && vol <= 0) flags.push('INSIDE-OUT');
  if (n > 40) flags.push(`${n} normals — HAS BECOME ROUND`);
  if (flags.length) bad++;
  console.log(
    `${name.padEnd(22)}${String(K.triCount(g)).padStart(5)}${String(n).padStart(10)}` +
    `${vol.toFixed(5).padStart(11)}${open ? '  (open shell)' : ''}` +
    (flags.length ? `   ✗ ${flags.join(', ')}` : ''),
  );
}

// The property that makes the kit enforce its own rule.
try {
  K.extrude([[0, 0], [1, 0], [1, 1]], 0.1);
  console.log('\n✗ extrude() ACCEPTED an untraced outline');
  bad++;
} catch {
  console.log('\n✓ extrude() refuses an untraced outline');
}
try {
  K.ngon(24, 1);
  console.log('✗ ngon() accepted 24 facets');
  bad++;
} catch {
  console.log('✓ ngon() refuses more than 12 facets');
}
try {
  K.laminate([
    { outline: box, depth: 0.05, z: 0 },
    { outline: notch, depth: 0.05, z: 0.02 },
  ], { gap: 0.005 });
  console.log('✗ laminate() accepted two plates sharing a plane');
  bad++;
} catch {
  console.log('✓ laminate() refuses two plates sharing a plane');
}

function signedVolume(g) {
  const p = g.attributes.position;
  let v = 0;
  for (let i = 0; i < p.count; i += 3) {
    const a = [p.getX(i), p.getY(i), p.getZ(i)];
    const b = [p.getX(i + 1), p.getY(i + 1), p.getZ(i + 1)];
    const c = [p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2)];
    v += a[0] * (b[1] * c[2] - b[2] * c[1])
       - a[1] * (b[0] * c[2] - b[2] * c[0])
       + a[2] * (b[0] * c[1] - b[1] * c[0]);
  }
  return v;
}

if (bad) { console.error(`\nFAIL — ${bad} problem(s)`); process.exit(1); }
console.log('\nPASS — kit');
