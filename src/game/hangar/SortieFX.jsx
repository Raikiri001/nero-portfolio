import { useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { puffSprite, sparkSprite, glowSprite, plumeSprite } from '../textures';

// ============================================================
// SORTIE FX — steam, sparks and the thruster glow of the launch shot.
//
// Mounted at the scene root (world space) by HangarCorridor while a sortie
// runs. It owns no timing of its own: SortieDirector writes
// `signalsRef.current` every frame and queues one-shot `bursts` at WORLD
// positions; this component only reads the signals and DRAINS the burst
// queue. Retime the shot in sortie.js, never here.
//
// Cost: 4 draw calls — steam Points, spark Points, the plume (two crossed
// planes in one geometry) and the hex flare sprite. Every buffer is a fixed
// pool allocated once at module level; nothing is allocated per frame, and
// nothing is disposed per instance (hard rule 5 — the group is
// dispose={null}).
// ============================================================

// Reduced motion keeps the beats but halves the particle density.
const REDUCED = typeof window !== 'undefined'
  && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
const DENSITY = REDUCED ? 0.5 : 1;

const STEAM_POOL = Math.round(150 * DENSITY);
const SPARK_POOL = Math.round(200 * DENSITY);

// Burst recipes: how many of each a one-shot event spawns.
const BURSTS = {
  clamp: { sparks: 40, steam: 15 },
  umbilical: { sparks: 6, steam: 25 },
  launch: { sparks: 50, steam: 60 },
};

// World units: a suit is ~3.5 tall, so 1 unit ≈ 5 m. Sparks fall at a
// stylised gravity (real g would read as slow motion at this scale).
const SPARK_GRAVITY = -7;
const STEAM_BUOYANCY = 0.35;
const STEAM_DRAG = 1.4;
// Rail sparks per second while the shuttle runs the tunnel.
const RAIL_SPARK_RATE = 140 * DENSITY;
// Half the shuttle's rail gauge — sparks come off the rails, not its centre.
const RAIL_HALF_GAUGE = 0.55;

// Thruster: behind the suit's back, in the suit group's (unscaled) frame.
// The suit group carries only position + rotation (MECH_SCALE is on the
// model inside it), so this offset is already in world units.
const THRUST_OFFSET = new THREE.Vector3(0, 2.4, -0.6);

// ------------------------------------------------------------
// Point-sprite shader with per-particle size and alpha. PointsMaterial has
// no per-point size or alpha, and a per-particle fade is the whole effect.
// Size is in WORLD units, attenuated like a real object.
const POINT_VERT = /* glsl */`
  attribute float aSize;
  attribute float aAlpha;
  uniform float uViewH;
  varying float vAlpha;
  void main() {
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aAlpha > 0.0 ? aSize * projectionMatrix[1][1] * uViewH * 0.5 / max(-mv.z, 0.05) : 0.0;
  }
`;
// Colour runs from uCold (fading) to uHot (fresh): a spark cools from
// white-yellow to orange as it dies; steam goes from white to grey.
const POINT_FRAG = /* glsl */`
  uniform sampler2D uMap;
  uniform vec3 uHot;
  uniform vec3 uCold;
  varying float vAlpha;
  void main() {
    vec4 t = texture2D(uMap, gl_PointCoord);
    float a = t.a * vAlpha;
    if (a < 0.004) discard;
    gl_FragColor = vec4(mix(uCold, uHot, vAlpha), a);
  }
`;

function makePool(count, { map, hot, cold, blending }) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const alpha = new Float32Array(count);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
  const mat = new THREE.ShaderMaterial({
    vertexShader: POINT_VERT,
    fragmentShader: POINT_FRAG,
    uniforms: {
      uMap: { value: map },
      uHot: { value: new THREE.Color(hot) },
      uCold: { value: new THREE.Color(cold) },
      uViewH: { value: 800 },
    },
    transparent: true,
    depthWrite: false,
    blending,
  });
  const points = new THREE.Points(geo, mat);
  // The pool moves every frame; a stale bounding sphere would cull it.
  points.frustumCulled = false;
  return {
    count, points, geo, mat, pos, size, alpha,
    vel: new Float32Array(count * 3),
    age: new Float32Array(count),
    life: new Float32Array(count), // 0 = dead slot
    size0: new Float32Array(count),
    size1: new Float32Array(count),
    alpha0: new Float32Array(count),
    next: 0,
  };
}

// Module-level lazy singletons: one FX rig, built on first sortie.
let _fx = null;
function fxRig() {
  if (_fx) return _fx;
  const steam = makePool(STEAM_POOL, {
    map: puffSprite(), hot: '#f2f4f6', cold: '#8a9096', blending: THREE.NormalBlending,
  });
  const sparks = makePool(SPARK_POOL, {
    map: sparkSprite(), hot: '#fff6c8', cold: '#ff7a1a', blending: THREE.AdditiveBlending,
  });

  // The plume: two planes crossed along the thrust axis (−Z), nozzle at
  // z = 0, tip at z = −1, unit width. Scaled per frame by `thrust`. UV v=1
  // is the nozzle because CanvasTexture flips Y (canvas top = v 1).
  const plumeGeo = new THREE.BufferGeometry();
  plumeGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    // horizontal plane (XZ)
    -0.5, 0, 0, 0.5, 0, 0, 0.5, 0, -1, -0.5, 0, -1,
    // vertical plane (YZ)
    0, -0.5, 0, 0, 0.5, 0, 0, 0.5, -1, 0, -0.5, -1,
  ], 3));
  plumeGeo.setAttribute('uv', new THREE.Float32BufferAttribute([
    0, 1, 1, 1, 1, 0, 0, 0,
    0, 1, 1, 1, 1, 0, 0, 0,
  ], 2));
  plumeGeo.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);
  const plume = new THREE.Mesh(plumeGeo, new THREE.MeshBasicMaterial({
    map: plumeSprite(), color: '#7fd4ff', transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
  }));
  plume.frustumCulled = false;

  const flare = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowSprite(), color: '#cdeeff', transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false,
  }));
  flare.frustumCulled = false;

  // Placed each frame from the suit's world matrix — copied, never
  // re-parented, so the FX rig stays at the scene root.
  const thruster = new THREE.Group();
  thruster.add(plume, flare);
  thruster.visible = false;

  _fx = { steam, sparks, plume, flare, thruster, railCarry: 0 };
  return _fx;
}

// Kills every particle (a new sortie must not inherit the last one's steam).
function clearPool(p) {
  p.life.fill(0);
  p.alpha.fill(0);
  p.geo.attributes.aAlpha.needsUpdate = true;
}

function spawn(p, x, y, z, vx, vy, vz, life, s0, s1, a0) {
  const i = p.next;
  p.next = (i + 1) % p.count; // ring buffer: the oldest slot is recycled
  const k = i * 3;
  p.pos[k] = x; p.pos[k + 1] = y; p.pos[k + 2] = z;
  p.vel[k] = vx; p.vel[k + 1] = vy; p.vel[k + 2] = vz;
  p.age[i] = 0;
  p.life[i] = life;
  p.size0[i] = s0;
  p.size1[i] = s1;
  p.alpha0[i] = a0;
}

const rnd = (a, b) => a + Math.random() * (b - a);

function sparkSpray(fx, at, n, speed, upBias) {
  for (let j = 0; j < n; j++) {
    // a random direction biased upward and outward
    const th = Math.random() * Math.PI * 2;
    const h = rnd(-0.2, 1) * upBias;
    const r = Math.sqrt(Math.max(0, 1 - h * h));
    const v = speed * rnd(0.4, 1);
    spawn(fx.sparks, at[0], at[1], at[2],
      Math.cos(th) * r * v, h * v + rnd(0, 1.5), Math.sin(th) * r * v,
      rnd(0.3, 0.8), rnd(0.07, 0.14), 0.03, 1);
  }
}

function steamPuff(fx, at, n, spread, jet, size) {
  for (let j = 0; j < n; j++) {
    const th = Math.random() * Math.PI * 2;
    const v = spread * rnd(0.3, 1);
    spawn(fx.steam,
      at[0] + rnd(-0.1, 0.1), at[1] + rnd(-0.1, 0.1), at[2] + rnd(-0.1, 0.1),
      Math.cos(th) * v + jet[0], rnd(0, 0.4) + jet[1], Math.sin(th) * v + jet[2],
      rnd(1.5, 2.5), size * rnd(0.6, 1), size * rnd(2.5, 3.5), rnd(0.35, 0.55));
  }
}

function emitBurst(fx, b) {
  const recipe = BURSTS[b.kind];
  if (!recipe || !b.at) return;
  const ns = Math.round(recipe.sparks * DENSITY);
  const nm = Math.round(recipe.steam * DENSITY);
  if (b.kind === 'clamp') {
    sparkSpray(fx, b.at, ns, 4.5, 0.9);
    steamPuff(fx, b.at, nm, 0.6, [0, 0.3, 0], 0.35);
  } else if (b.kind === 'umbilical') {
    // a pressurised line letting go: a downward-outward jet
    steamPuff(fx, b.at, nm, 0.5, [0, -0.6, 0.6], 0.3);
    sparkSpray(fx, b.at, ns, 2.5, 0.5);
  } else {
    // launch: the catapult's blast, rolling out flat across the deck
    steamPuff(fx, b.at, nm, 3.2, [0, 0.5, -1.2], 0.9);
    sparkSpray(fx, b.at, ns, 6, 0.6);
  }
}

function stepSteam(p, dt) {
  const drag = Math.exp(-STEAM_DRAG * dt);
  for (let i = 0; i < p.count; i++) {
    if (p.life[i] <= 0) continue;
    const age = (p.age[i] += dt);
    const t = age / p.life[i];
    if (t >= 1) { p.life[i] = 0; p.alpha[i] = 0; continue; }
    const k = i * 3;
    p.vel[k] *= drag;
    p.vel[k + 1] = p.vel[k + 1] * drag + STEAM_BUOYANCY * dt;
    p.vel[k + 2] *= drag;
    p.pos[k] += p.vel[k] * dt;
    p.pos[k + 1] += p.vel[k + 1] * dt;
    p.pos[k + 2] += p.vel[k + 2] * dt;
    // rises, expands, fades — a quick fade-in so a puff never pops on
    p.size[i] = p.size0[i] + (p.size1[i] - p.size0[i]) * Math.sqrt(t);
    p.alpha[i] = p.alpha0[i] * Math.min(1, age / 0.12) * (1 - t) ** 1.2;
  }
}

function stepSparks(p, dt) {
  for (let i = 0; i < p.count; i++) {
    if (p.life[i] <= 0) continue;
    const age = (p.age[i] += dt);
    const t = age / p.life[i];
    if (t >= 1) { p.life[i] = 0; p.alpha[i] = 0; continue; }
    const k = i * 3;
    p.vel[k + 1] += SPARK_GRAVITY * dt;
    p.pos[k] += p.vel[k] * dt;
    p.pos[k + 1] += p.vel[k + 1] * dt;
    p.pos[k + 2] += p.vel[k + 2] * dt;
    p.size[i] = p.size0[i] + (p.size1[i] - p.size0[i]) * t;
    p.alpha[i] = p.alpha0[i] * (1 - t);
  }
}

function flush(p, viewH) {
  p.geo.attributes.position.needsUpdate = true;
  p.geo.attributes.aSize.needsUpdate = true;
  p.geo.attributes.aAlpha.needsUpdate = true;
  p.mat.uniforms.uViewH.value = viewH;
}

const _suitPos = new THREE.Vector3();
const _suitQuat = new THREE.Quaternion();
const _suitScale = new THREE.Vector3();
const _offset = new THREE.Vector3();

// A fresh sortie starts with clean pools (the rig is a shared singleton).
function resetFX() {
  const fx = fxRig();
  clearPool(fx.steam);
  clearPool(fx.sparks);
  fx.railCarry = 0;
  fx.thruster.visible = false;
}

// One frame of the whole rig. Module-level rather than inline in useFrame:
// the rig is a mutable singleton, and React's hook rules (rightly) refuse
// mutation of a value a component captured during render.
function tickFX(state, rawDt, s, suit) {
  const fx = fxRig();
  // a tab switch hands back one huge dt; don't fire every spark at once
  const dt = Math.min(rawDt, 1 / 20);

  if (s) {
    // DRAIN the one-shot queue: the director pushes, we empty it in place
    // (the array object is shared, so it is truncated, not replaced).
    const q = s.bursts;
    if (q && q.length) {
      for (let i = 0; i < q.length; i++) emitBurst(fx, q[i]);
      q.length = 0;
    }

    // rails scraping: a stream off both rails while the shuttle runs
    const run = s.tunnelRun ?? 0;
    if (run > 0 && run < 1 && s.shuttle) {
      fx.railCarry += RAIL_SPARK_RATE * dt;
      const [x, y, z] = s.shuttle;
      while (fx.railCarry >= 1) {
        fx.railCarry -= 1;
        const side = Math.random() < 0.5 ? -1 : 1;
        spawn(fx.sparks, x + side * RAIL_HALF_GAUGE, y + 0.05, z + rnd(-0.2, 0.2),
          side * rnd(0.5, 2.5), rnd(0.4, 2.2), -rnd(3, 8),
          rnd(0.25, 0.6), rnd(0.06, 0.12), 0.03, 1);
      }
    } else {
      fx.railCarry = 0;
    }
  }

  stepSteam(fx.steam, dt);
  stepSparks(fx.sparks, dt);
  const viewH = state.size.height * state.viewport.dpr;
  flush(fx.steam, viewH);
  flush(fx.sparks, viewH);

  // THRUSTER GLOW — follows the suit's back, sized by `thrust`.
  const thrust = s?.thrust ?? 0;
  if (thrust > 0.001 && suit) {
    suit.matrixWorld.decompose(_suitPos, _suitQuat, _suitScale);
    _offset.copy(THRUST_OFFSET).applyQuaternion(_suitQuat);
    fx.thruster.position.copy(_suitPos).add(_offset);
    fx.thruster.quaternion.copy(_suitQuat);
    // a fast, deterministic flicker: two incommensurate sines
    const tt = state.clock.elapsedTime;
    const flicker = 0.88 + 0.07 * Math.sin(tt * 53) + 0.05 * Math.sin(tt * 31.7);
    const len = (0.6 + 2.6 * thrust) * flicker;
    const wid = 0.35 + 0.4 * thrust;
    fx.plume.scale.set(wid, wid, len);
    fx.plume.material.opacity = Math.min(1, thrust * 1.2);
    const f = (0.5 + 1.3 * thrust) * flicker;
    fx.flare.scale.set(f, f, 1);
    fx.flare.material.opacity = Math.min(1, thrust * 1.4);
    fx.thruster.visible = true;
  } else {
    fx.thruster.visible = false;
  }
}

/**
 * Steam, sparks and thruster glow for the launch shot, in world space.
 * Reads `signalsRef.current` (written by SortieDirector) and drains its
 * `bursts` queue; follows `suitRef.current` for the thruster.
 */
export function SortieFX({ signalsRef, suitRef }) {
  const fx = fxRig();

  useEffect(resetFX, []);

  useFrame((state, dt) => {
    tickFX(state, dt, signalsRef.current, suitRef?.current ?? null);
  });

  return (
    <group dispose={null}>
      <primitive object={fx.steam.points} dispose={null} />
      <primitive object={fx.sparks.points} dispose={null} />
      <primitive object={fx.thruster} dispose={null} />
    </group>
  );
}
