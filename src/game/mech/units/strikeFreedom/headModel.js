import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { boxUV } from '../../kit';
import headUrl from './models/head.glb?url';

// ============================================================
// THE HEAD MODEL — authored in Blender (models/strike_freedom.blend, the
// `head` collection), exported by scripts/blender/export_region.py to
// ./models/head.glb, and shipped inside the build (nothing is fetched from
// anywhere else).
//
// The site never uses the file's materials. Every part's material is NAMED
// after one of this unit's material slots (white, gold, red, eye, …); the
// parts are merged into ONE geometry per slot — one draw call each, exactly
// as the procedural build did — and MechModel3D's shared material set is
// applied by name. So colours, the eye glow and red alert stay in code.
// ============================================================

// Box UVs are in world units and the armour maps repeat once per unit, so a
// 0.18-unit head would sample a fifth of one tile and its panel lines would
// render as cracks a metre wide. Same scale the procedural head used.
const UV_SCALE = 6;

const _slots = new WeakMap();

/** A loaded glTF scene → { [slot]: BufferGeometry }, built once per file. */
function slotsFrom(scene) {
  scene.updateMatrixWorld(true);
  const bySlot = new Map();
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const slot = (o.material?.name || 'white').replace(/\.\d+$/, '');
    // flat shading is structural (hard rule 1): every triangle its own verts
    let g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    if (g.index) g = g.toNonIndexed();
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    }
    boxUV(g, UV_SCALE);
    if (!bySlot.has(slot)) bySlot.set(slot, []);
    bySlot.get(slot).push(g);
  });
  const out = {};
  for (const [slot, list] of bySlot) {
    const g = mergeGeometries(list);
    g.computeBoundingBox();
    g.computeBoundingSphere();
    out[slot] = g;
  }
  return out;
}

/**
 * The head's per-slot geometry. Suspends while the .glb loads (put it under
 * a <Suspense>); afterwards it is a module-level singleton, shared by every
 * instance and never disposed (hard rule 5).
 */
export function useHeadSlots() {
  const gltf = useLoader(GLTFLoader, headUrl);
  if (!_slots.has(gltf.scene)) _slots.set(gltf.scene, slotsFrom(gltf.scene));
  return _slots.get(gltf.scene);
}
