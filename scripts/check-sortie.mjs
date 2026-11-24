// ============================================================
// THE SORTIE GATE — the launch shot, checked in node (part of `npm run check`).
//
//   node --import ./scripts/resolve.mjs scripts/check-sortie.mjs
//
// The vision (CLAUDE.md PART 2) is one continuous shot inside a real
// hangar. Both halves are geometry, so both are checked here, by sweeping
// hangar/sortie.js at 120 Hz:
//
//   enclosed     until the camera passes the hatch it must be inside the
//                hangar's interior volumes (bay, launch hall, catapult
//                tunnel) with a margin. Outside them it can see the
//                starfield — which is exactly "I see space instead of the
//                hangar".
//   continuous   no step between samples bigger than a fast camera move
//                (a jump is a cut).
//   hand-off     FOV back at the combat camera's 46, no roll, no shake.
//
// The volumes come from the same gantryShapes.js constants the set is
// built from, so moving a wall moves the check.
// ============================================================
import {
  BAY_WIDTH, BAY_DEPTH, BAY_HEIGHT, HALL_FRONT_Z, HALL_CLEAR_Y,
  TUNNEL_START_Z, TUNNEL_HALF_W, TUNNEL_HEIGHT, HATCH_Z, CATAPULT_X,
} from '../src/game/hangar/gantryShapes.js';
import { sampleSortie, SORTIE_DURATION, stageAt } from '../src/game/hangar/sortie.js';

const MARGIN = 0.3;          // camera clearance from any wall
const MAX_STEP = 0.5;        // world units per 1/120 s (= 60 u/s)
const DT = 1 / 120;
const HW = BAY_WIDTH / 2;
const MOUTH = BAY_DEPTH / 2;

// Interior volumes, bay-local, for the DEPLOYING bay. `firstBay` closes the
// hall's left end at the bay's left wall (bay 0); otherwise the hall runs on.
function volumes(firstBay) {
  const left = firstBay ? -HW : -Infinity;
  return [
    { name: 'bay', x: [-HW, HW], y: [0, BAY_HEIGHT], z: [-MOUTH, MOUTH] },
    // y up to the strip lights hanging under the ceiling
    { name: 'hall', x: [left, Infinity], y: [0, HALL_CLEAR_Y], z: [MOUTH, HALL_FRONT_Z] },
    // the tube runs on through the hatch doorway, which is open by the time
    // the camera reaches it
    { name: 'tunnel', x: [CATAPULT_X - TUNNEL_HALF_W, CATAPULT_X + TUNNEL_HALF_W], y: [0, TUNNEL_HEIGHT], z: [TUNNEL_START_Z - 1, HATCH_Z + 1] },
  ];
}

const inside = (p, v, m) => p[0] >= v.x[0] + m && p[0] <= v.x[1] - m
  && p[1] >= v.y[0] + m && p[1] <= v.y[1] - m
  && p[2] >= v.z[0] && p[2] <= v.z[1] - (v.name === 'hall' ? m : 0);
// (bay → hall → tunnel → hatch are open doorways along z; only the hall's
// far wall is a wall the camera must keep clear of — and it leaves the hall
// through the portal, into the tunnel volume)

const failures = [];
// The resting framing of a bay (HangarCorridor CAM_HOME)
const cam0 = { pos: [0, BAY_HEIGHT * 0.5, 6.4], look: [0, BAY_HEIGHT * 0.48, -0.4] };

for (const firstBay of [true, false]) {
  const vols = volumes(firstBay);
  let prev = null;
  let worst = null;
  for (let t = 0; t <= SORTIE_DURATION + 1e-9; t += DT) {
    const s = sampleSortie(t, cam0);
    const p = s.camPos;
    if (p[2] < HATCH_Z) {
      const ok = vols.some((v) => inside(p, v, MARGIN));
      if (!ok && !worst) worst = { t, stage: stageAt(t).id, p };
    }
    if (prev) {
      const step = Math.hypot(p[0] - prev[0], p[1] - prev[1], p[2] - prev[2]);
      if (step > MAX_STEP) failures.push(`${firstBay ? 'bay 0' : 'middle bay'}: camera jumps ${step.toFixed(2)} at t=${t.toFixed(2)} (${stageAt(t).id}) — a cut`);
    }
    prev = p;
  }
  if (worst) {
    failures.push(`${firstBay ? 'bay 0' : 'middle bay'}: camera leaves the hangar at t=${worst.t.toFixed(2)} (${worst.stage}) `
      + `at [${worst.p.map((v) => v.toFixed(2))}] — it would see space`);
  }
}

const end = sampleSortie(SORTIE_DURATION, cam0);
if (Math.abs(end.fov - 46) > 0.01) failures.push(`hand-off FOV is ${end.fov.toFixed(2)}, must be 46 (the combat camera's)`);
if (Math.abs(end.roll) > 1e-3) failures.push(`hand-off roll is ${end.roll.toFixed(3)}, must be 0`);
if (end.shake > 1e-3) failures.push(`hand-off shake is ${end.shake.toFixed(3)}, must be 0`);
if (end.camPos[2] <= HATCH_Z) failures.push(`hand-off camera z ${end.camPos[2].toFixed(2)} is still inside the tunnel (hatch at ${HATCH_Z})`);

if (failures.length) {
  console.error(`✖ sortie: ${failures.length} problem(s)`);
  failures.forEach((f) => console.error('  ' + f));
  process.exit(1);
}
console.log(`✓ sortie: ${SORTIE_DURATION.toFixed(1)} s shot stays inside the hangar until the hatch, continuous, hands off at FOV 46`);
