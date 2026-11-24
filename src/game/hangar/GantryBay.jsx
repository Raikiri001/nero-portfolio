import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as G from './gantryShapes';

const { BAY_WIDTH: W, BAY_DEPTH: D, BAY_HEIGHT: H } = G;
const HW = W / 2;
const HD = D / 2;

// The hangar's one shared material set lives in gantryShapes.js so the
// launch hall (LaunchHall.jsx) dresses with the same singletons that
// GantryLighting animates — one set, animated once, for every bay.
const mats = G.hangarMats;

/** Renders a merged part list: one mesh per material slot. */
function Slots({ parts, m }) {
  return parts.map(({ slot, geometry }) => (
    <mesh key={slot} geometry={geometry} material={m[slot]} />
  ));
}

// ---------------------------------------------------------------
// Wall dressing: vents, cabinets, pipe runs, cable drops, authored in the
// wall's own frame with local +z standing OUT of the plate. `facing` +1
// turns it to face +x, -1 to face -x (rotateY(θ) sends local +z to
// (sin θ, 0, cos θ)). It used to be rotated by side·π/2, which sent every
// fitting out through the back of the wall into the neighbouring bay.
// ---------------------------------------------------------------
function WallDressing({ m, facing }) {
  const levels = [-H * 0.28, 0, H * 0.28];
  return (
    <group rotation={[0, facing * Math.PI / 2, 0]}>
      {/* Horizontal bands + vertical stanchions. BEAM_GEO already runs
          along its local X, and this whole group is rotated so local X is
          the bay's depth axis — so the bands take no extra rotation, and
          the stanchions only need a roll to stand upright. Rotating the
          bands again sends them across the bay instead of along the wall. */}
      {levels.map((y) => (
        <mesh key={y} geometry={G.BEAM_GEO} material={m.steel}
          position={[0, y, 0.14]} scale={[D, 1, 1]} />
      ))}
      {[-D * 0.32, 0, D * 0.32].map((z) => (
        <mesh key={z} geometry={G.BEAM_SLIM_GEO} material={m.steelDark}
          position={[z, 0, 0.12]} rotation={[0, 0, Math.PI / 2]} scale={[H, 1, 1]} />
      ))}

      {/* Vent + grille cluster */}
      <mesh geometry={G.HEX_VENT_GEO} material={m.vent} position={[-D * 0.30, H * 0.14, 0.16]} />
      <mesh geometry={G.HEX_VENT_GEO} material={m.vent} position={[-D * 0.30, -H * 0.13, 0.16]} />
      <mesh geometry={G.GRILLE_GEO} material={m.steelDark} position={[D * 0.16, H * 0.14, 0.15]} />
      <mesh geometry={G.GRILLE_GEO} material={m.steelDark} position={[D * 0.16, -H * 0.13, 0.15]} />

      {/* Service cabinet + junction plates */}
      <mesh geometry={G.CABINET_GEO} material={m.steelBlue} position={[D * 0.33, -H * 0.05, 0.18]} />
      <mesh geometry={G.BOLT_PLATE_GEO} material={m.steelDark} position={[-D * 0.10, H * 0.30, 0.17]} />
      <mesh geometry={G.BOLT_PLATE_GEO} material={m.steelDark} position={[D * 0.02, -H * 0.31, 0.17]} />

      {/* Pipe bank running the wall's height, plus a horizontal main */}
      <mesh geometry={G.PIPE_BANK_GEO} material={m.copper}
        position={[-D * 0.42, 0, 0.20]} scale={[1, H * 0.92, 1]} />
      <mesh geometry={G.PIPE_GEO} material={m.steelDark}
        position={[0, H * 0.40, 0.22]} rotation={[Math.PI / 2, 0, 0]} scale={[1, D * 0.95, 1]} />

      {/* Cable drops */}
      <mesh geometry={G.CABLE_BUNDLE_GEO} material={m.rubber}
        position={[-D * 0.05, H * 0.36, 0.26]} scale={[1.5, 1, 1]} />
      <mesh geometry={G.CABLE_BUNDLE_GEO} material={m.rubber}
        position={[D * 0.28, H * 0.36, 0.26]} scale={[1.1, 0.8, 1]} />

      <mesh geometry={G.LADDER_GEO} material={m.steel}
        position={[D * 0.44, -H * 0.10, 0.20]} scale={[1, H * 0.55, 1]} />
    </group>
  );
}

/**
 * One side wall at bay-local `x`. Bays sit edge to edge, so the wall
 * between bay i and bay i+1 is ONE plate: bay i draws it as its right wall
 * and dresses it on both faces (`faces` [-1, +1]), and bay i+1 does not
 * draw its left wall at all. Two coincident plates z-fight.
 */
function Wall({ m, x, faces }) {
  return (
    <group position={[x, H / 2, 0]}>
      <mesh geometry={G.WALL_PANEL_GEO} material={m.wall} rotation={[0, Math.PI / 2, 0]} />
      {faces.map((f) => <WallDressing key={f} m={m} facing={f} />)}
    </group>
  );
}

// Catwalk running front-to-back along one wall, with rails and brackets.
function Catwalk({ m, side, y }) {
  const x = side * (HW - 0.55);
  return (
    <group position={[x, y, 0]}>
      <mesh geometry={G.CATWALK_DECK_GEO} material={m.steelDark} />
      <mesh geometry={G.RAILING_GEO} material={m.steel} position={[-side * 0.48, 0, 0]} scale={[1, 0.5, 1]} />
      {[-D * 0.3, 0, D * 0.3].map((z) => (
        <mesh key={z} geometry={G.CATWALK_BRACKET_GEO} material={m.steel}
          position={[side * 0.3, -0.06, z]} scale={[side, 1, 1]} />
      ))}
    </group>
  );
}

function Ceiling({ m }) {
  return (
    <group position={[0, H, 0]}>
      {[-D * 0.34, 0, D * 0.34].map((z) => (
        <mesh key={z} geometry={G.TRUSS_GEO} material={m.steel} position={[0, -0.28, z]} />
      ))}
      <mesh geometry={G.CRANE_RAIL_GEO} material={m.steelDark} position={[0, -0.36, -D * 0.34]} />
      <group position={[0, -0.10, D * 0.54]}>
        <mesh geometry={G.LIGHT_HOUSING_GEO} material={m.steelDark} />
        <mesh geometry={G.LIGHT_LENS_GEO} material={m.lamp} position={[0, -0.05, 0]} />
      </group>
      <group position={[0, -0.14, -D * 0.30]}>
        <mesh geometry={G.LIGHT_HOUSING_GEO} material={m.steelDark} />
        <mesh geometry={G.LIGHT_LENS_GEO} material={m.lamp} position={[0, -0.05, 0]} />
      </group>
    </group>
  );
}

function Floor({ m }) {
  return (
    <group>
      <mesh geometry={G.FLOOR_GEO} material={m.floor} position={[0, -0.07, 0]} />
      {/* Flush with the deck (top y ≈ 0.005): the pad slides out over it. */}
      <mesh geometry={G.HAZARD_STRIP_GEO} material={m.hazard} position={[0, -0.012, HD - 0.3]} />
      <mesh geometry={G.FLOOR_CHANNEL_GEO} material={m.vent} position={[0, 0.005, -HD + 0.85]} />

      {[[-1.5, -1.3], [1.5, -1.3], [-1.5, 1.2], [1.5, 1.2]].map(([x, z]) => (
        <mesh key={`${x}${z}`} geometry={G.ANCHOR_GEO} material={m.steel} position={[x, 0.02, z]} />
      ))}
    </group>
  );
}

/**
 * The docking pad the suit stands on. Rendered by HangarCorridor INSIDE the
 * suit's carriage group, not by the bay, because on DEPLOY the pad is what
 * carries the suit out (hangar/sortie.js).
 */
export function DockPad() {
  const m = mats();
  return (
    <group dispose={null}>
      <mesh geometry={G.DOCK_PAD_GEO} material={m.steelDark} />
      <mesh geometry={G.DOCK_RING_GEO} material={m.guide}
        position={[0, 0.072, 0]} rotation={[Math.PI / 2, 0, 0]} />
      <mesh geometry={G.DOCK_INLAY_GEO} material={m.hazard} position={[0, 0.074, 0]} />
    </group>
  );
}

// The front apron across the bay mouth: grating, the transfer channel the
// pad slides along, and — on every bay but the first — the permanent LANE
// of the catapult belonging to the bay on the left (gantryShapes.js).
function Apron({ m, hasLane }) {
  return <Slots parts={G.apronParts(hasLane)} m={m} />;
}

// Catapult rail lamps, per-instance colour (one draw call for all of them):
// unlit → red down the rail as the sequence arms → all green.
const LAMP_OFF = new THREE.Color('#1c0c0f');
const LAMP_ARM = new THREE.Color('#ff2438');
const LAMP_GO = new THREE.Color('#28ff6a');
const _lampMatrix = new THREE.Matrix4();

/**
 * The launch catapult, just off-screen to the RIGHT of a bay, firing along
 * +Z through the launch hall's far wall and down the tunnel to the hatch.
 * HangarCorridor mounts it only beside the bay that is deploying, at
 * catapult-local origin [CATAPULT_X, 0, TRANSFER_Z] (bay-local).
 *
 * It sits in the lane the apron and hall floor already carry, and nothing
 * it adds stands above the deck where the pad (r 1.12, top 0.075) rides:
 * the rails are down in the slot, the side walls stand at |x| 1.25–1.39,
 * and the LEFT wall only starts once the pad, sliding in from the left,
 * is past it.
 *
 * `signalsRef.current.lamps` (0 → 1) runs the lamps; `deflectorRef` is the
 * blast deflector SortieDirector raises.
 */
export function Catapult({ signalsRef = null, deflectorRef }) {
  const m = mats();
  const lampMeshRef = useRef(null);

  useLayoutEffect(() => {
    const mesh = lampMeshRef.current;
    if (!mesh) return;
    G.LAUNCH_LAMPS.forEach(({ pos }, j) => {
      mesh.setMatrixAt(j, _lampMatrix.makeTranslation(pos[0], pos[1], pos[2]));
      mesh.setColorAt(j, LAMP_OFF);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
  }, []);

  useFrame(() => {
    const mesh = lampMeshRef.current;
    if (!mesh) return;
    const v = signalsRef?.current?.lamps ?? 0;
    G.LAUNCH_LAMPS.forEach(({ i }, j) => {
      mesh.setColorAt(j, v >= 1 ? LAMP_GO : v * G.LAUNCH_LAMP_COUNT > i ? LAMP_ARM : LAMP_OFF);
    });
    mesh.instanceColor.needsUpdate = true;
  });

  return (
    <group position={[G.CATAPULT_X, 0, G.TRANSFER_Z]} dispose={null}>
      <Slots parts={G.catapultParts()} m={m} />
      <instancedMesh
        ref={lampMeshRef}
        args={[G.LAUNCH_LAMP_GEO, m.instLamp, G.LAUNCH_LAMPS.length]}
        frustumCulled={false}
      />
      <group ref={deflectorRef} position={[0, 0, -1.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh geometry={G.BLAST_DEFLECTOR_GEO} material={m.steel} />
      </group>
    </group>
  );
}

function BackWall({ m, index }) {
  return (
    <group position={[0, 0, -HD + 0.12]}>
      <mesh geometry={G.WALL_PANEL_GEO} material={m.wallDark}
        position={[0, H / 2, -0.1]} rotation={[0, 0, 0]} scale={[W / D, 1, 1]} />
      <mesh geometry={G.BLAST_DOOR_GEO} material={m.wall} position={[0, 0.05, 0.06]} />
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={G.DOOR_SEAM_GEO} material={m.steelDark}
          position={[s * 0.62, 1.5, 0.16]} />
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={G.DOOR_EDGE_BAND_GEO} material={m.hazard}
          position={[s * 1.30, 1.4, 0.15]} />
      ))}
      <mesh geometry={G.BAY_SIGN_GEO} material={m.steelBlue} position={[0, 2.6, 0.16]} />
      <mesh geometry={G.MONITOR_GEO} material={m.steelDark} position={[-1.85, 1.9, 0.1]} />
      <mesh geometry={G.MONITOR_SCREEN_GEO} material={m.screen} position={[-1.85, 1.9, 0.16]} />
      <mesh geometry={G.MONITOR_GEO} material={m.steelDark} position={[1.85, 1.9, 0.1]} scale={[0.8, 0.8, 1]} />
      <mesh geometry={G.MONITOR_SCREEN_GEO} material={m.screen} position={[1.85, 1.9, 0.16]} scale={[0.8, 0.8, 1]} />
      {/* Bay index as a row of lit tally blocks, avoiding any text rendering */}
      {Array.from({ length: (index % 8) + 1 }, (_, i) => (
        <mesh key={i} geometry={G.DOOR_CHEVRON_GEO} material={m.guide}
          position={[-0.42 + i * 0.13, 2.6, 0.20]} scale={[0.22, 0.9, 1]} />
      ))}
    </group>
  );
}

// Docking rig: overhead crane plus two shoulder clamps and umbilicals.
// Crane hoist, crane-local: the arm hangs from just under the trolley
// (y -0.3) to the hook (top at -1.6), so reeling the hook up by L shortens
// the arm by L. The trolley itself never rises: lifting the whole crane
// put it through the bay roof.
const ARM_TOP = -0.3;
const ARM_LEN = 1.3;
const HOOK_Y = -1.68;
const CRANE_Y = H - 0.62;

// Docking rig: overhead crane plus two shoulder clamps and umbilicals.
// Docked, the crane hangs BEHIND the head (gantryShapes CRANE_Z); it used
// to hang straight through it.
function DockRig({ m, craneRef, armRef, hookRef, clampRefs, umbilicalRefs, clampY }) {
  return (
    <group>
      <group ref={craneRef} position={[0, CRANE_Y, G.CRANE_Z]}>
        <mesh geometry={G.CRANE_TROLLEY_GEO} material={m.steelBlue} position={[0, -0.2, 0]} />
        <mesh ref={armRef} geometry={G.CRANE_ARM_GEO} material={m.steel}
          position={[0, ARM_TOP - ARM_LEN / 2, 0]} scale={[1, ARM_LEN, 1]} />
        <mesh ref={hookRef} geometry={G.CRANE_HOOK_GEO} material={m.steelDark} position={[0, HOOK_Y, 0]} />
      </group>

      {/* Shoulder clamps. The arm geometry runs outward from its pivot, so
          each side is mirrored with -s to reach INWARD from the wall to the
          unit's shoulder. `clampY` comes from the docked suit's own
          shoulder station — suits differ in height, so a fixed value would
          leave tall and short units floating free of their clamps. */}
      {[-1, 1].map((s, i) => (
        <group key={s} ref={clampRefs[i]} position={[s * G.CLAMP_X, clampY, G.CLAMP_Z]}>
          <mesh geometry={G.SUPPORT_ARM_GEO} material={m.steel} scale={[-s, 1, 1]} />
          <mesh ref={umbilicalRefs[i]} geometry={G.UMBILICAL_GEO} material={m.rubber}
            position={[0, -0.12, 0.26]} scale={[-s * 0.95, 1, 1]} />
        </group>
      ))}
    </group>
  );
}

function Props({ m, index }) {
  // Deterministic per-bay scatter so each bay is dressed differently but
  // stays identical across reloads.
  const r = (n) => ((Math.sin(index * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  // Everything is kept outboard of the 1.12-radius docking pad and clear of
  // the unit's footprint, so props dress the bay instead of crowding it.
  return (
    <group>
      <group position={[-HW + 0.5, 0.08, HD - 0.95]} rotation={[0, r(1) * 0.8 - 0.4, 0]} scale={0.34}>
        <mesh geometry={G.CRATE_GEO} material={m.steelBlue} />
        <mesh geometry={G.CRATE_GEO} material={m.steelDark}
          position={[0.1, 0.47, -0.05]} scale={0.72} rotation={[0, r(2) * 0.9, 0]} />
      </group>

      <mesh geometry={G.TANK_GEO} material={m.steel} position={[HW - 0.45, 0.13, -HD + 0.9]} scale={0.30} />
      <mesh geometry={G.TANK_GEO} material={m.copper}
        position={[HW - 0.45, 0.12, -HD + 1.28]} scale={0.26} />

      <group position={[HW - 0.55, 0, HD - 1.0]} rotation={[0, -0.85, 0]} scale={0.34}>
        <mesh geometry={G.CONSOLE_GEO} material={m.steelDark} />
        <mesh geometry={G.CONSOLE_SCREEN_GEO} material={m.screen} />
      </group>

      <mesh geometry={G.CRATE_GEO} material={m.steelDark}
        position={[-HW + 0.45, 0.07, -HD + 1.15]} scale={0.28} rotation={[0, r(3) * 1.2, 0]} />
    </group>
  );
}

// Alert tints, hoisted: useFrame may not allocate.
const LAMP_BASE = new THREE.Color('#cfe8ff');
const HALL_BASE = new THREE.Color('#d8ecff');
const ALERT_RED = new THREE.Color('#ff2a1a');
const { lerp } = THREE.MathUtils;

/**
 * Drives the shared emissive materials (strip lamps, beacons, guide ring,
 * and the launch hall's strips and alert beacons). They are module-level
 * singletons used by EVERY bay and hall segment, so animating them from
 * each one made the last to render win each frame. Render this ONCE per
 * scene (HangarCorridor does).
 *
 * RED ALERT, from `signalsRef.current.alert` (0..1): the bay strips dim to
 * ~0.3 and go red, the hall strips go red and breathe with the beacons,
 * the bay beacons pulse faster and harder, and the hall's spinning beacon
 * bars switch on. The beacon phase is INTEGRATED rather than read off the
 * clock, so speeding the pulse up never jumps it.
 */
export function GantryLighting({ signalsRef = null }) {
  const phaseRef = useRef(0);
  useFrame(({ clock }, dt) => {
    const m = mats();
    const t = clock.getElapsedTime();
    const alert = signalsRef?.current?.alert ?? 0;

    phaseRef.current += Math.min(dt, 0.1) * (1.9 + alert * 5.5);
    const ph = phaseRef.current;
    const red = Math.max(0, Math.sin(ph));
    const amber = Math.max(0, Math.sin(ph + Math.PI));

    // Strip lights idle with a faint industrial flicker.
    const flick = Math.sin(t * 31) * Math.sin(t * 7.3);
    m.lamp.emissive.copy(LAMP_BASE).lerp(ALERT_RED, alert);
    m.lamp.emissiveIntensity = lerp(2.2 + flick * 0.12, 0.3, alert);
    m.hallLamp.emissive.copy(HALL_BASE).lerp(ALERT_RED, alert);
    m.hallLamp.emissiveIntensity = lerp(2.0 + flick * 0.1, 0.5 + 0.7 * red, alert);

    // Bay beacons: the two colours pulse in antiphase.
    const amp = 2.6 + alert * 2.4;
    m.warnRed.emissiveIntensity = 0.25 + red * red * amp;
    m.warnAmber.emissiveIntensity = 0.25 + amber * amber * amp;

    // Hall alert beacons: lens glows, the bar is only drawn at all in alert.
    m.beaconLens.emissiveIntensity = 0.15 + alert * (1.4 + 1.6 * red);
    m.beaconBar.visible = alert > 0.001;
    m.beaconBar.opacity = alert * 0.5;

    // The guide ring breathes.
    m.guide.emissiveIntensity = 1.1 + Math.sin(t * 1.3) * 0.5;
  });
  return null;
}

/**
 * One fully dressed hangar bay. Purely set dressing — the docked mech is
 * rendered by the caller so the same bay can host any unit. Geometry and
 * materials are shared singletons, hence `dispose={null}` (hard rule 5).
 *
 *   index         roster index; bay 0 has no catapult lane in its apron
 *   animate       idle sway on/off (off for distant bays)
 *   clampY        the docked suit's shoulder station, bay-local
 *   signalsRef    the sortie signals; reads `.undock` (deploying bay only)
 *   drawLeftWall  true for the leftmost MOUNTED bay only — every other
 *                 bay's left wall is its left neighbour's right wall
 */
export function GantryBay({ index = 0, animate = true, clampY = 2.33, signalsRef = null, drawLeftWall = true }) {
  const m = useMemo(() => mats(), []);
  const craneRef = useRef(null);
  const armRef = useRef(null);
  const hookRef = useRef(null);
  const clampARef = useRef(null);
  const clampBRef = useRef(null);
  const umbilicalARef = useRef(null);
  const umbilicalBRef = useRef(null);
  const clampRefs = useMemo(() => [clampARef, clampBRef], []);
  const umbilicalRefs = useMemo(() => [umbilicalARef, umbilicalBRef], []);

  useFrame(({ clock }) => {
    // `undock` (0 → 1) is driven by the sortie on the deploying bay only:
    // clamps swing up and back to the walls, umbilicals drop, the crane
    // rolls back clear of the head and reels its hook up.
    const u = signalsRef?.current?.undock ?? 0;
    if (!animate && u === 0) return;
    const t = clock.getElapsedTime() + index * 1.7;
    const sway = u > 0 ? 0 : 1;
    if (craneRef.current) {
      craneRef.current.position.x = Math.sin(t * 0.29) * 0.06 * sway;
      craneRef.current.position.z = G.CRANE_Z + u * G.CRANE_ROLL;
      craneRef.current.rotation.z = Math.sin(t * 0.29) * 0.012 * sway;
    }
    const lift = u * G.CRANE_LIFT;
    if (armRef.current) {
      const len = Math.max(0.02, ARM_LEN - lift);
      armRef.current.scale.y = len;
      armRef.current.position.y = ARM_TOP - len / 2;
    }
    if (hookRef.current) hookRef.current.position.y = HOOK_Y + lift;
    clampRefs.forEach((r, i) => {
      if (!r.current) return;
      const s = i === 0 ? -1 : 1;
      // Bob around the docked unit's own clamp height, not a fixed one.
      r.current.position.y = clampY + Math.sin(t * 0.6 + i * 1.4) * 0.014 * sway + u * 0.55;
      r.current.position.x = s * (G.CLAMP_X + u * 0.18);
      r.current.rotation.z = -s * u * 0.75;
    });
    umbilicalRefs.forEach((r) => {
      if (!r.current) return;
      r.current.position.y = -0.12 - u * 0.7;
      r.current.rotation.x = u * 0.9;
    });
  });

  return (
    <group dispose={null}>
      {drawLeftWall && <Wall m={m} x={-HW} faces={[1]} />}
      <Wall m={m} x={HW} faces={[-1, 1]} />
      <Catwalk m={m} side={-1} y={H * 0.46} />
      <Catwalk m={m} side={1} y={H * 0.46} />
      <Catwalk m={m} side={-1} y={H * 0.78} />
      <Catwalk m={m} side={1} y={H * 0.78} />
      <Ceiling m={m} />
      <Floor m={m} />
      <BackWall m={m} index={index} />
      <DockRig m={m} craneRef={craneRef} armRef={armRef} hookRef={hookRef}
        clampRefs={clampRefs} umbilicalRefs={umbilicalRefs} clampY={clampY} />
      <Apron m={m} hasLane={index > 0} />
      <Props m={m} index={index} />

      {/* Warning beacons flanking the bay mouth */}
      {[-1, 1].map((s, i) => (
        <group key={s} position={[s * (HW - 0.24), H * 0.62, HD - 0.5]} scale={0.6}>
          <mesh geometry={G.WARN_LAMP_GEO} material={m.steelDark} />
          <mesh geometry={G.WARN_LENS_GEO}
            material={i === 0 ? m.warnRed : m.warnAmber} position={[0, 0.07, 0]} />
        </group>
      ))}
    </group>
  );
}
