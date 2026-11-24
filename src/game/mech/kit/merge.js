import * as THREE from 'three';

// ============================================================
// Typed-array geometry merge.
//
// `assemble()` collapses a hundred-piece part into a handful of draw calls,
// which is what makes "author as much detail as the reference needs" a
// budget the browser can actually pay. Non-indexed throughout, so the flat
// normals survive the merge.
// ============================================================

export function mergeGeometries(list) {
  const geos = list.filter(Boolean);
  if (!geos.length) return null;
  if (geos.length === 1) return geos[0];

  const attrs = ['position', 'normal', 'uv'];
  let total = 0;
  for (const g of geos) total += g.attributes.position.count;

  const out = new THREE.BufferGeometry();
  for (const name of attrs) {
    const size = name === 'uv' ? 2 : 3;
    const arr = new Float32Array(total * size);
    let o = 0;
    for (const g of geos) {
      const a = g.attributes[name];
      if (a) { arr.set(a.array.subarray(0, a.count * size), o); }
      o += g.attributes.position.count * size;
    }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  return out;
}
