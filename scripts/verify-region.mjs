// ============================================================
// THE REGION GATE
//
//   node --import ./scripts/resolve.mjs scripts/verify-region.mjs <unit> <region> [--report]
//   node --import ./scripts/resolve.mjs scripts/verify-region.mjs --all
//
// `--report` also prints the region's audit (kit/assemble.js `report()`):
// every part, its material slot, and the photograph it was traced from.
// `--all` gates every region every registered unit lists in its `BUILT`
// (dims.js) — that is what `npm run check` runs.
//
// A body region is not finished until this passes AND its overlay screenshot
// has been looked at. It runs entirely in node — `regions/*.js` is plain ESM,
// so every bounding box is checked against the landmark it is supposed to sit
// on BEFORE any browser is started. That catches NaN slots, inverted
// rotations and fins spanning half the body in seconds, where the same bugs
// cost a screenshot round each.
//
// What it asserts, and what each assertion is protecting against:
//
//   no NaN vertex        one NaN poisons a whole MERGED slot — three.js can't
//                        compute a bounding sphere and the group flickers or
//                        vanishes, which reads as "the armour is in the wrong
//                        place" and sends you tuning positions that were fine
//   outward winding      an outline traced clockwise renders back-faces to
//                        camera and disappears under backface culling, which
//                        looks exactly like a part buried in its parent.
//                        Checked PER PART and skipped on open shells: you
//                        look INTO a recess, so a vent's faces point inward
//                        by construction
//   every part traced    the whole point of the kit: `hardware()` parts are
//                        listed by name so an armour plate hiding behind the
//                        escape hatch is visible in the audit
//   facet count          HARD RULE 1. A part that has quietly become round
//                        shows up as dozens of near-parallel normals where a
//                        faceted one has a handful
//   bbox on landmarks    the region must occupy the box its traced landmarks
//                        describe, within tolerance
//   triangle budget      so a browser can still draw the corridor
// ============================================================
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const [unit, region] = args.filter((a) => !a.startsWith('--'));

if (flags.has('--all')) {
  // Every unit in the registry, every region in its BUILT list — each gated
  // in its own process so one failure doesn't hide the next.
  const registry = readFileSync(resolve('src/game/mech/units/index.js'), 'utf8');
  const units = [...registry.matchAll(/from '\.\/(\w+)\/Assembly'/g)].map((m) => m[1]);
  let failed = 0;
  for (const u of units) {
    const { BUILT } = await import(pathToFileURL(resolve('src/game/mech/units', u, 'dims.js')).href);
    for (const r of BUILT) {
      // a region authored in Blender ships as models/<r>.glb and is gated by
      // scripts/check-models.mjs, not here
      if (existsSync(resolve('src/game/mech/units', u, 'models', `${r}.glb`))) continue;
      console.log(`\n── ${u}/${r} ──`);
      const run = spawnSync(process.execPath, ['--import', './scripts/resolve.mjs', 'scripts/verify-region.mjs', u, r],
        { stdio: 'inherit' });
      if (run.status !== 0) failed++;
    }
  }
  if (failed) {
    console.error(`\n${failed} region(s) failed the gate`);
    process.exit(1);
  }
  process.exit(0);
}

if (!unit || !region) {
  console.error('usage: verify-region.mjs <unit> <region> [--report]   |   verify-region.mjs --all');
  process.exit(2);
}

const base = resolve('src/game/mech/units', unit);
const mod = await import(pathToFileURL(resolve(base, 'regions', `${region}.js`)).href);
const kit = await import(pathToFileURL(resolve('src/game/mech/kit/index.js')).href);
const spec = await import(pathToFileURL(resolve(base, 'regions', `${region}.spec.js`)).href)
  .catch(() => ({ default: null }));

const buildFn = mod[region];
const piecesFn = mod[`${region}Pieces`];
if (!buildFn) throw new Error(`${unit}/regions/${region}.js must export ${region}()`);

const fail = [];
const warn = [];
const check = (ok, msg) => { if (!ok) fail.push(msg); };

for (const detail of ['hero', 'far']) {
  const slots = buildFn(detail);
  const pieces = piecesFn ? piecesFn(detail) : [];
  let tris = 0;

  for (const [slot, g] of Object.entries(slots)) {
    tris += kit.triCount(g);
    const p = g.attributes.position.array;
    let nan = 0;
    for (let i = 0; i < p.length; i++) if (!Number.isFinite(p[i])) nan++;
    check(nan === 0, `${detail}/${slot}: ${nan} NaN position components`);
    check(Boolean(g.boundingSphere) && Number.isFinite(g.boundingSphere.radius),
      `${detail}/${slot}: no finite bounding sphere`);

  }

  // Hard rule 1: PER PART, not per slot. A merged slot legitimately holds
  // hundreds of normals; one part with dozens of near-parallel ones is a
  // lathe that got in.
  if (detail === 'hero') {
    for (const piece of pieces) {
      if (!piece.geo) continue;
      const n = kit.normalCount(piece.geo);
      if (n > 40) fail.push(`${piece.name}: ${n} distinct normals — this part has become ROUND`);
      else if (n > 26) warn.push(`${piece.name}: ${n} distinct normals — check it is still faceted`);
      if (!piece.geo.userData.openShell) {
        check(signedVolume(piece.geo) > 0, `${piece.name}: winding is inside-out`);
      }
      const src = kit.provenance(piece.outline);
      if (!src) fail.push(`${piece.name}: no provenance — every piece carries its traced outline`);
      else if (src.kind === 'hardware') warn.push(`${piece.name}: UNTRACED — ${src.note}`);
    }
  }

  const budget = detail === 'hero' ? (spec.default?.tris ?? 9000) : 3000;
  check(tris <= budget, `${detail}: ${tris} triangles over the ${budget} budget`);
  console.log(`${detail.padEnd(5)} ${tris} tris across ${Object.keys(slots).length} slots`);
}

// Landmark box: `<region>.spec.js` may export { box: {min,max}, tol, tris }.
if (spec.default?.box) {
  const slots = buildFn('hero');
  const b = combinedBox(slots);
  const tol = spec.default.tol ?? 0.004;
  ['min', 'max'].forEach((k) => {
    ['x', 'y', 'z'].forEach((ax, i) => {
      const want = spec.default.box[k][i];
      const got = b[k][i];
      check(Math.abs(got - want) <= tol,
        `bbox ${k}.${ax}: ${got.toFixed(4)} but the landmarks say ${want.toFixed(4)}`);
    });
  });
  console.log(`bbox   [${b.min.map((v) => v.toFixed(3))}] → [${b.max.map((v) => v.toFixed(3))}]`);
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

function combinedBox(slots) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const g of Object.values(slots)) {
    const bb = g.boundingBox;
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], bb.min.getComponent(i));
      max[i] = Math.max(max[i], bb.max.getComponent(i));
    }
  }
  return { min, max };
}

if (flags.has('--report')) {
  console.log('\n' + kit.report(piecesFn ? piecesFn('hero') : [], buildFn('hero')));
}

if (warn.length) {
  console.log(`\n${warn.length} note(s):`);
  warn.forEach((w) => console.log('  · ' + w));
}
if (fail.length) {
  console.error(`\nFAIL — ${unit}/${region}`);
  fail.forEach((f) => console.error('  ✗ ' + f));
  process.exit(1);
}
console.log(`\nPASS — ${unit}/${region}`);
