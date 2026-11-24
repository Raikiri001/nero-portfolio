// ============================================================
// THE MODEL GATE — every Blender-built region, checked in node
// (part of `npm run check`).
//
//   node --import ./scripts/resolve.mjs scripts/check-models.mjs
//
// For each unit in units/index.js and each region in its BUILT list there
// must be units/<unit>/models/<region>.glb (exported from models/<unit>.blend
// by scripts/blender/export_region.py) and regions/<region>.spec.js. Asserts:
//
//   slots      every material is NAMED after a site material slot — the site
//              replaces materials by name, so an unknown name renders as
//              plain white armour and nobody notices
//   flat       hard rule 1: each triangle's three vertex normals are equal.
//              A smoothed or auto-smoothed part shows up here as a curve
//   finite     no NaN / Infinity anywhere (one NaN poisons a merged slot)
//   budget     triangle count ≤ the spec's `tris`
//   landmarks  the model's bounding box sits on the box the traced
//              landmarks say the region occupies (spec `box`, `tol`)
// ============================================================
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const UNITS = join(ROOT, 'src/game/mech/units');

// The slots MechModel3D's material set provides (baseline + any a unit adds).
const BASE_SLOTS = [
  'white', 'offWhite', 'navy', 'blue', 'dragoon', 'red', 'gold', 'goldBright', 'steel',
  'recess', 'block', 'dark', 'frame', 'eye', 'sensor', 'glow', 'shieldField',
];
const FLAT_TOL = 1e-3;

// ---- a minimal GLB reader: positions, normals, indices, materials, node TRS ----
const COMP = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array };
const NCOMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

function readGLB(path) {
  const b = readFileSync(path);
  if (b.readUInt32LE(0) !== 0x46546c67) throw new Error('not a GLB');
  const jsonLen = b.readUInt32LE(12);
  const json = JSON.parse(b.subarray(20, 20 + jsonLen).toString());
  const binStart = 20 + jsonLen + 8;
  const bin = b.subarray(binStart);
  const accessor = (i) => {
    const a = json.accessors[i];
    const v = json.bufferViews[a.bufferView];
    const T = COMP[a.componentType];
    const n = NCOMP[a.type];
    const off = (v.byteOffset || 0) + (a.byteOffset || 0);
    const stride = v.byteStride ? v.byteStride / T.BYTES_PER_ELEMENT : n;
    const raw = new T(bin.buffer, bin.byteOffset + off, (a.count - 1) * stride + n);
    const out = new Float64Array(a.count * n);
    for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) out[k * n + c] = raw[k * stride + c];
    return out;
  };
  return { json, accessor };
}

// node transform (TRS only; Blender's exporter writes no matrices for these)
function applyTRS(node, p) {
  const [sx, sy, sz] = node.scale || [1, 1, 1];
  const [qx, qy, qz, qw] = node.rotation || [0, 0, 0, 1];
  const [tx, ty, tz] = node.translation || [0, 0, 0];
  let [x, y, z] = [p[0] * sx, p[1] * sy, p[2] * sz];
  // rotate by quaternion
  const ix = qw * x + qy * z - qz * y, iy = qw * y + qz * x - qx * z;
  const iz = qw * z + qx * y - qy * x, iw = -qx * x - qy * y - qz * z;
  x = ix * qw + iw * -qx + iy * -qz - iz * -qy;
  y = iy * qw + iw * -qy + iz * -qx - ix * -qz;
  z = iz * qw + iw * -qz + ix * -qy - iy * -qx;
  return [x + tx, y + ty, z + tz];
}

const failures = [];
const fail = (m) => failures.push(m);
let checked = 0;

const registry = readFileSync(join(UNITS, 'index.js'), 'utf8');
for (const [, unit] of registry.matchAll(/from '\.\/(\w+)\/Assembly'/g)) {
  const { BUILT } = await import(pathToFileURL(join(UNITS, unit, 'dims.js')).href);
  let unitSlots = [];
  try {
    const { materialSpec } = await import(pathToFileURL(join(UNITS, unit, 'colors.js')).href);
    unitSlots = Object.keys(materialSpec || {});
  } catch { /* a unit with no colours of its own uses the baseline */ }
  const SLOTS = new Set([...BASE_SLOTS, ...unitSlots]);

  for (const region of BUILT) {
    const glb = join(UNITS, unit, 'models', `${region}.glb`);
    const specPath = join(UNITS, unit, 'regions', `${region}.spec.js`);
    if (!existsSync(glb)) {
      // a region may still be procedural (regions/<r>.js, verify-region.mjs)
      if (!existsSync(join(UNITS, unit, 'regions', `${region}.js`))) fail(`${unit}/${region}: no models/${region}.glb`);
      continue;
    }
    if (!existsSync(specPath)) { fail(`${unit}/${region}: no regions/${region}.spec.js`); continue; }
    const spec = (await import(pathToFileURL(specPath).href)).default;
    const { json, accessor } = readGLB(glb);

    let tris = 0;
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    const meshNodes = (json.nodes || []).filter((n) => n.mesh !== undefined);
    for (const node of meshNodes) {
      for (const prim of json.meshes[node.mesh].primitives) {
        const mat = prim.material !== undefined ? json.materials[prim.material].name : '(none)';
        const slot = mat.replace(/\.\d+$/, '');
        if (!SLOTS.has(slot)) fail(`${unit}/${region}: part "${node.name}" uses material "${mat}" — not a site slot (${[...SLOTS].join(', ')})`);
        const P = accessor(prim.attributes.POSITION);
        const N = prim.attributes.NORMAL !== undefined ? accessor(prim.attributes.NORMAL) : null;
        const I = prim.indices !== undefined ? accessor(prim.indices) : Float64Array.from({ length: P.length / 3 }, (_, i) => i);
        if (!N) fail(`${unit}/${region}: part "${node.name}" has no normals`);
        let curved = 0;
        for (let t = 0; t < I.length; t += 3) {
          tris++;
          if (N) {
            const [a, b, c] = [I[t], I[t + 1], I[t + 2]];
            for (let k = 0; k < 3; k++) {
              if (Math.abs(N[a * 3 + k] - N[b * 3 + k]) > FLAT_TOL || Math.abs(N[a * 3 + k] - N[c * 3 + k]) > FLAT_TOL) { curved++; break; }
            }
          }
        }
        if (curved) fail(`${unit}/${region}: part "${node.name}" has ${curved} smooth-shaded triangles — hard rule 1 (flat only)`);
        for (let v = 0; v < P.length; v += 3) {
          const w = applyTRS(node, [P[v], P[v + 1], P[v + 2]]);
          for (let k = 0; k < 3; k++) {
            if (!Number.isFinite(w[k])) { fail(`${unit}/${region}: part "${node.name}" has a non-finite vertex`); break; }
            lo[k] = Math.min(lo[k], w[k]); hi[k] = Math.max(hi[k], w[k]);
          }
        }
      }
    }

    const budget = spec.tris ?? 9000;
    if (tris > budget) fail(`${unit}/${region}: ${tris} triangles over the ${budget} budget`);
    if (spec.box) {
      const tol = spec.tol ?? 0.004;
      ['min', 'max'].forEach((k) => ['x', 'y', 'z'].forEach((ax, i) => {
        const got = (k === 'min' ? lo : hi)[i];
        const want = spec.box[k][i];
        if (Math.abs(got - want) > tol) fail(`${unit}/${region}: bbox ${k}.${ax} ${got.toFixed(4)} but the landmarks say ${want.toFixed(4)} (tol ${tol})`);
      }));
    }
    checked++;
    console.log(`  ${unit}/${region}: ${meshNodes.length} parts, ${tris} tris, bbox [${lo.map((v) => v.toFixed(3))}] → [${hi.map((v) => v.toFixed(3))}]`);
  }
}

if (failures.length) {
  console.error(`✖ models: ${failures.length} problem(s)`);
  failures.forEach((f) => console.error('  ' + f));
  process.exit(1);
}
console.log(`✓ models: ${checked} region model(s) — flat, slotted, in budget, on their landmarks`);
