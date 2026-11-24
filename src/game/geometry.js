import * as THREE from 'three';

// ============================================================
// Low-level geometry arithmetic for the HANGAR SET DRESSING
// (hangar/gantryShapes.js). Mobile suits do NOT use this file — they are
// built from mech/kit/, which refuses an untraced outline and has no smooth
// operation in it. Keep the two apart.
//
// `loft()` skins between two profiles at two heights; `prism()` is the
// untapered case.
// ============================================================

/** Axis-aligned rectangle in XZ, wound CCW. */
export function rectXZ(w, d) {
  const x = w / 2;
  const z = d / 2;
  return [[-x, -z], [x, -z], [x, z], [-x, z]];
}

/** Rectangle with its four corners cut — the workhorse hard-surface profile. */
export function chamferXZ(w, d, c) {
  const x = w / 2;
  const z = d / 2;
  return [
    [-x + c, -z], [x - c, -z], [x, -z + c], [x, z - c],
    [x - c, z], [-x + c, z], [-x, z - c], [-x, -z + c],
  ];
}

/** Regular n-gon profile. */
export function ngonXZ(r, n, rot = 0) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + rot;
    return [Math.cos(a) * r, Math.sin(a) * r];
  });
}

/**
 * Skins between two equal-length profiles at two heights. Winding is
 * chosen so faces point outward; UVs run around the perimeter (u) and up
 * the height (v) so panel-line textures wrap without stretching.
 */
export function loft(bottom, top, y0, y1, opts = {}) {
  const { capBottom = true, capTop = true, uv = 3 } = opts;
  const n = bottom.length;
  const pos = [];
  const uvs = [];

  const push = (p, u, v) => {
    pos.push(p[0], p[1], p[2]);
    uvs.push(u, v);
  };

  const uAt = [0];
  let per = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    per += Math.hypot(bottom[j][0] - bottom[i][0], bottom[j][1] - bottom[i][1]);
    uAt.push(per);
  }
  const h = Math.abs(y1 - y0);

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const b0 = [bottom[i][0], y0, bottom[i][1]];
    const b1 = [bottom[j][0], y0, bottom[j][1]];
    const t0 = [top[i][0], y1, top[i][1]];
    const t1 = [top[j][0], y1, top[j][1]];
    const u0 = uAt[i] * uv;
    const u1 = uAt[i + 1] * uv;
    push(b0, u0, 0); push(t1, u1, h * uv); push(b1, u1, 0);
    push(b0, u0, 0); push(t0, u0, h * uv); push(t1, u1, h * uv);
  }

  if (capTop) {
    for (let i = 1; i < n - 1; i++) {
      push([top[0][0], y1, top[0][1]], top[0][0] * uv, top[0][1] * uv);
      push([top[i + 1][0], y1, top[i + 1][1]], top[i + 1][0] * uv, top[i + 1][1] * uv);
      push([top[i][0], y1, top[i][1]], top[i][0] * uv, top[i][1] * uv);
    }
  }
  if (capBottom) {
    for (let i = 1; i < n - 1; i++) {
      push([bottom[0][0], y0, bottom[0][1]], bottom[0][0] * uv, bottom[0][1] * uv);
      push([bottom[i][0], y0, bottom[i][1]], bottom[i][0] * uv, bottom[i][1] * uv);
      push([bottom[i + 1][0], y0, bottom[i + 1][1]], bottom[i + 1][0] * uv, bottom[i + 1][1] * uv);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  return g;
}

/** Straight prism (no taper). */
export function prism(profile, y0, y1, opts) {
  return loft(profile, profile, y0, y1, opts);
}

/**
 * Structural I-beam running along X, centred on the origin, length 1 so it
 * can be scaled per instance. Built as an extruded cross-section so it
 * silhouettes like real steel rather than a plain box.
 */
export function iBeam(height = 0.22, flange = 0.16, web = 0.035, plate = 0.035) {
  const h = height / 2;
  const f = flange / 2;
  const w = web / 2;
  const p = plate;
  const s = new THREE.Shape();
  s.moveTo(-f, -h);
  s.lineTo(f, -h);
  s.lineTo(f, -h + p);
  s.lineTo(w, -h + p);
  s.lineTo(w, h - p);
  s.lineTo(f, h - p);
  s.lineTo(f, h);
  s.lineTo(-f, h);
  s.lineTo(-f, h - p);
  s.lineTo(-w, h - p);
  s.lineTo(-w, -h + p);
  s.lineTo(-f, -h + p);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
  g.translate(0, 0, -0.5);
  g.rotateY(Math.PI / 2); // extrude along X
  return g;
}

/** Perforated grating deck — a slab plus a lattice of raised bars. */
export function grating(w, d, bars = 10) {
  const geos = [new THREE.BoxGeometry(w, 0.018, d)];
  const step = d / bars;
  for (let i = 0; i < bars; i++) {
    const b = new THREE.BoxGeometry(w, 0.022, step * 0.42);
    b.translate(0, 0.012, -d / 2 + step * (i + 0.5));
    geos.push(b);
  }
  const cross = 4;
  const cstep = w / cross;
  for (let i = 0; i < cross; i++) {
    const b = new THREE.BoxGeometry(cstep * 0.16, 0.026, d);
    b.translate(-w / 2 + cstep * (i + 0.5), 0.014, 0);
    geos.push(b);
  }
  return mergeGeometries(geos);
}

/**
 * Minimal geometry merge (position/normal/uv only). Bundling a repeated
 * detail cluster into one BufferGeometry keeps draw calls down — important
 * here because the corridor holds one dressed bay per project.
 */
export function mergeGeometries(geos) {
  const pos = [];
  const norm = [];
  const uv = [];
  geos.forEach((g) => {
    const gg = g.index ? g.toNonIndexed() : g;
    const p = gg.getAttribute('position');
    const n = gg.getAttribute('normal');
    const t = gg.getAttribute('uv');
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      if (n) norm.push(n.getX(i), n.getY(i), n.getZ(i));
      uv.push(t ? t.getX(i) : 0, t ? t.getY(i) : 0);
    }
    if (gg !== g) gg.dispose();
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (norm.length === pos.length) {
    out.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
  } else {
    out.computeVertexNormals();
  }
  return out;
}
