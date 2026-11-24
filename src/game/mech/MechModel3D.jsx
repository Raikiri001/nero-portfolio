import { forwardRef, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { armorMaps, frameMaps } from '../textures';
import { getUnit } from './units';

// ============================================================
// MOBILE SUIT — the shell around a unit's own Assembly
//
// This file deliberately contains NO GEOMETRY. It used to carry a generic
// variant body that every un-converted suit fell back to, and that body is
// the reason the roster read as one machine in 22 colourways. All that is
// left here is the plumbing every suit needs identically:
//
//   · the shared material set, cached by palette + unit
//   · the idle pose and the idle animation
//   · dispatch to `units/<unit>/Assembly.jsx`
//
// Anything with a silhouette lives in the unit's own folder. There is no
// fallback body here and there must never be one again: the generic variant
// body this file used to carry is the reason the roster read as one machine
// in 22 colourways. A unit with no hand-built regions renders NOTHING, and
// its bay stands dressed and empty until someone builds it.
// ============================================================

// A palette colour of literally `#111` renders every panel line invisible
// under a multiply map. Lift to a luminance floor, preserving hue by
// scaling rather than by adding grey.
function liftDark(hex, minLum = 0.09) {
  const c = new THREE.Color(hex);
  const lum = c.r * 0.299 + c.g * 0.587 + c.b * 0.114;
  if (lum > 0 && lum < minLum) c.multiplyScalar(minLum / lum);
  else if (lum === 0) c.setScalar(minLum);
  return c;
}

// Material sets are shared singletons, cached by palette identity and then
// by unit.
//
// Nothing here is ever disposed — the mech root is `dispose={null}` so React
// Three Fiber cannot destroy shared geometry when one instance unmounts.
// That makes a per-instance material set a genuine leak: bays mount and
// unmount constantly as the corridor scrolls, and an uncached set rebuilt
// ~25 MeshStandardMaterials per visible mech on every scroll until the tab
// fell over. Caching here means the whole roster costs one set per unit,
// for the session.
const _materialCache = new WeakMap();

// A unit with nothing built needs NO materials. `getHeroPalette` caches per
// unit, so every roster id has its own palette object and therefore its own
// cache entry — which meant scrolling the corridor built a full ~25-material
// set for each of the 21 suits that render nothing at all. Constructing them
// is cheap; the cost is that each unique material is a shader compile the
// first time it reaches the renderer, and that lands as a hitch mid-scroll.
const NO_MATERIALS = Object.freeze({});

function useMechMaterials(palette, unit) {
  return useMemo(() => {
    if (!unit) return NO_MATERIALS;

    let byUnit = _materialCache.get(palette);
    if (!byUnit) {
      byUnit = new Map();
      _materialCache.set(palette, byUnit);
    }
    const key = unit.materialSpec;
    const hit = byUnit.get(key);
    if (hit) return hit;

    const armorTex = armorMaps();
    const frameTex = frameMaps();

    const armor = (color, extra = {}) => new THREE.MeshStandardMaterial({
      color: liftDark(color), ...armorTex, roughness: 0.6, metalness: 0.3,
      normalScale: new THREE.Vector2(0.85, 0.85), ...extra,
    });
    const frame = (color, extra = {}) => new THREE.MeshStandardMaterial({
      color: liftDark(color, 0.08), ...frameTex, roughness: 0.44, metalness: 0.85,
      normalScale: new THREE.Vector2(1.2, 1.2), ...extra,
    });
    const glow = (color, i) => new THREE.MeshStandardMaterial({
      color: '#0a0a0c', emissive: color, emissiveIntensity: i,
      roughness: 0.28, metalness: 0.4,
    });

    // Baseline slots, derived from the roster palette so the 3D model stays
    // in sync with the 2D background sprite for the same gundamId. Each is a
    // thunk: a slot the unit's own spec overrides is never built at all.
    const baseline = {
      white: () => armor(palette.headBase),
      offWhite: () => armor(palette.arm),
      navy: () => armor(palette.chest),
      blue: () => armor(palette.shoulderAccent),
      dragoon: () => armor(palette.shoulderAccent),
      red: () => armor(palette.chin),
      gold: () => frame(palette.joint),
      goldBright: () => armor(palette.vfin, { roughness: 0.34, metalness: 0.7 }),
      steel: () => frame('#8b9199'),
      recess: () => new THREE.MeshStandardMaterial({ color: '#111318', roughness: 0.85, metalness: 0.5 }),
      block: () => armor(palette.shoulder),
      dark: () => new THREE.MeshStandardMaterial({ color: '#15181d', roughness: 0.8, metalness: 0.5 }),
      frame: () => frame(palette.joint),
      eye: () => glow(palette.visor, 1.5),
      sensor: () => glow(palette.centerChest, 1.0),
      glow: () => glow(palette.thruster, 1.2),
      shieldField: () => new THREE.MeshBasicMaterial({
        color: palette.thruster, transparent: true, opacity: 0.22,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
      }),
    };

    // The unit's own colour spec wins over the baseline. This is how a suit
    // gets its real colour split — Strike Freedom needs ten distinct
    // colours placed per part, and the roster's fourteen shared slots
    // cannot express that without changing the 2D sprites too.
    const own = unit.materialSpec || {};
    const set = {};
    Object.entries(baseline).forEach(([slot, make]) => {
      if (!(slot in own)) set[slot] = make();
    });
    Object.entries(own).forEach(([slot, spec]) => {
      if (spec.emissive) {
        set[slot] = glow(spec.emissive, spec.emissiveIntensity ?? 1.2);
        return;
      }
      const { color, ...rest } = spec;
      set[slot] = (rest.metalness ?? 0) > 0.6 ? frame(color, rest) : armor(color, rest);
    });

    byUnit.set(key, set);
    return set;
  }, [palette, unit]);
}

// Idle stance.
//
// A mobile suit standing with its arms flat against its sides reads as a
// pin, not a machine — so the docked pose carries the arms out from the
// body, softens the elbows, and stands the feet apart and slightly toed
// out. `arm` is shoulder abduction, `elbow` the forward bend, `legOut` the
// stance width and `toe` the foot splay. The idle animation OFFSETS from
// these values rather than from zero; if the sign convention on `arm`
// changes, `useFrame` below has to change with it or the arms snap inward
// on the first frame.
const STANCE = {
  idle: { arm: 0.30, elbow: 0.22, fwd: 0.07, legOut: 0.045, toe: 0.11 },
  combat: { arm: 0.42, elbow: 0.36, fwd: 0.14, legOut: 0.060, toe: 0.13 },
};

// How far a unit with an articulated pack opens it, per pose. A DOCKED suit
// does not stand in full HiMAT: Strike Freedom's deployed array reaches
// ~1.2 H per side, which is wider than its own bay and reads as a starburst
// rather than as a machine at rest. It folds down in the hangar and opens
// for combat. An explicit `wingDeploy` prop overrides this.
const WING_DEPLOY = { idle: 0.32, combat: 1 };

// Extra eye emissive at full alert (sortie power-up, and through combat)
const EYE_ALERT_BOOST = 2.6;

// The RIG CONTRACT. Every unit's Assembly receives the same set of handles,
// as individual ref props (never a bag — see Assembly.jsx). A region attaches
// the handles it owns as it is built: today only Strike Freedom's head
// exists, so only `headRef` and `visorRef` are attached, and the idle
// animation below simply skips the rest. Do not delete an unattached handle;
// the next region needs it.
export const MechModel3D = forwardRef(function MechModel3D({
  gundamId = 0, palette, pose = 'idle', scale = 1, animate = true,
  phase = 0, detail = 'hero', wingDeploy = null, alertRef = null,
}, ref) {
  // `gundamId={null}` (an enemy suit) is never a roster unit, so never built.
  const unit = useMemo(() => (gundamId == null ? null : getUnit(gundamId)), [gundamId]);
  const m = useMechMaterials(palette, unit);

  const hipsRef = useRef(null);
  const waistRef = useRef(null);
  const chestRef = useRef(null);
  const headRef = useRef(null);
  const visorRef = useRef(null);
  const armLRef = useRef(null);
  const armRRef = useRef(null);
  const thrusterARef = useRef(null);
  const thrusterBRef = useRef(null);
  const stance = STANCE[pose] || STANCE.idle;
  const deploy = wingDeploy ?? WING_DEPLOY[pose] ?? WING_DEPLOY.idle;
  const armRest = stance.arm;

  // `alertRef.current` (0 → 1): the suit powering up for a sortie. The eyes
  // brighten and the idle sway settles, so it squares up and faces forward.
  useFrame(({ clock }) => {
    if (!unit) return;
    const a = alertRef?.current ?? 0;
    if (!animate) {
      if (visorRef.current) visorRef.current.material.emissiveIntensity = 1.35 + a * EYE_ALERT_BOOST;
      return;
    }
    const t = clock.getElapsedTime() + phase;
    const calm = 1 - a;
    const breath = Math.sin(t * 1.15) * calm;
    if (chestRef.current) {
      chestRef.current.scale.set(1 + breath * 0.006, 1 + breath * 0.004, 1 + breath * 0.006);
    }
    if (hipsRef.current) {
      hipsRef.current.position.y = breath * 0.008;
      hipsRef.current.position.x = Math.sin(t * 0.37) * 0.011;
      hipsRef.current.rotation.z = Math.sin(t * 0.37) * 0.02;
      hipsRef.current.rotation.y = Math.sin(t * 0.29) * 0.032;
    }
    if (waistRef.current) waistRef.current.rotation.y = Math.sin(t * 0.29 + 0.8) * -0.042;
    if (headRef.current) {
      const sv = Math.sin(t * 0.26);
      headRef.current.rotation.y = Math.sign(sv) * Math.abs(sv) ** 0.5 * 0.42 * calm;
      headRef.current.rotation.x = Math.sin(t * 0.55) * 0.05 * calm;
    }
    if (armRRef.current) {
      armRRef.current.rotation.z = armRest + Math.sin(t * 0.37 + 0.9) * 0.026;
      armRRef.current.rotation.x = -stance.fwd + Math.sin(t * 0.83) * 0.032;
    }
    if (armLRef.current) {
      armLRef.current.rotation.z = -armRest - Math.sin(t * 0.37 + 0.9) * 0.026;
      armLRef.current.rotation.x = -stance.fwd + Math.sin(t * 0.83 + 1.7) * 0.032;
    }
    if (visorRef.current) {
      visorRef.current.material.emissiveIntensity = 1.35 + Math.sin(t * 2.1) * 0.35 * calm + a * EYE_ALERT_BOOST;
    }
    const tp = 1.0 + Math.sin(t * 1.7) * 0.35;
    if (thrusterARef.current) thrusterARef.current.material.emissiveIntensity = tp;
    if (thrusterBRef.current) thrusterBRef.current.material.emissiveIntensity = tp;
  });

  return (
    <group ref={ref} name="mechRoot" dispose={null} scale={scale}>
      {unit && (
        <unit.Assembly
          m={m} stance={stance} detail={detail} wingDeploy={deploy}
          hipsRef={hipsRef} waistRef={waistRef} chestRef={chestRef} headRef={headRef}
          visorRef={visorRef} armRRef={armRRef} armLRef={armLRef}
          thrusterARef={thrusterARef} thrusterBRef={thrusterBRef}
        />
      )}
    </group>
  );
});
